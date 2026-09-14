import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function notifyRegistration(type: 'trial' | 'subscription', email: string, provider: string, extra?: string) {
  const destination = (Deno.env.get('ADMIN_NOTIFICATION_EMAIL') ?? Deno.env.get('NOTIFY_EMAIL') ?? Deno.env.get('ADMIN_EMAIL') ?? '').trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '');
  if (!destination || !supabaseUrl) return;

  const subject = type === 'trial'
    ? 'Novo cadastro de teste gratuito'
    : 'Novo cadastro de plano comercializado';

  const body = [
    'Novo cadastro identificado no Maestro Gestão.',
    '',
    `Tipo: ${type === 'trial' ? 'Teste gratuito' : 'Plano comercializado'}`,
    `E-mail: ${email}`,
    `Provider: ${provider}`,
    extra ? `Detalhes: ${extra}` : '',
    '',
    'Atenciosamente,',
    'Maestro Gestão',
  ].filter(Boolean).join('\n');

  try {
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        from_name: 'Maestro Gestão',
        to: destination,
        subject,
        body,
      }),
    });
  } catch (err) {
    console.warn('Não foi possível enviar o e-mail de notificação de cadastro:', err);
  }
}

const headers = { 'content-type': 'application/json; charset=utf-8' };
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers });

type KiwifyPayload = {
  order_id?: string;
  order_status?: string;
  webhook_event_type?: string;
  Product?: { product_id?: string; product_name?: string };
  Customer?: { email?: string; full_name?: string };
  Subscription?: {
    id?: string; subscription_id?: string; start_date?: string; next_payment?: string;
    customer_access?: { access_until?: string; has_access?: boolean; active_period?: boolean };
  };
};

const normalizeEmail = (email?: string) => email?.trim().toLowerCase() ?? '';
const toIsoDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
};
const eventKind = (event?: string, orderStatus?: string) => ({
  order_approved: 'approved', compra_aprovada: 'approved', subscription_renewed: 'renewed',
  subscription_late: 'late', subscription_canceled: 'canceled', order_refunded: 'refunded',
  compra_reembolsada: 'refunded', chargeback: 'chargeback',
}[event?.toLowerCase() ?? ''] ?? ({
  paid: 'approved', approved: 'approved', renewed: 'renewed', late: 'late',
  canceled: 'canceled', cancelled: 'canceled', refunded: 'refunded', chargeback: 'chargeback',
}[orderStatus?.toLowerCase() ?? ''] ?? 'unknown'));
const webhookToken = (request: Request) => {
  const authorization = request.headers.get('authorization');
  return new URL(request.url).searchParams.get('token') ?? request.headers.get('x-kiwify-token')
    ?? (authorization?.startsWith('Bearer ') ? authorization.slice(7) : null);
};

async function findAuthUserId(admin: ReturnType<typeof createClient>, email: string) {
  const { data: profile } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
  if (profile?.id) return profile.id;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.trim().toLowerCase() === email);
    if (user) return user.id;
    if (data.users.length < 1000) break;
  }
  return null;
}

Deno.serve(async (request) => {
  console.info('Kiwify webhook received', { method: request.method });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (!Deno.env.get('KIWIFY_WEBHOOK_TOKEN') || webhookToken(request) !== Deno.env.get('KIWIFY_WEBHOOK_TOKEN')) {
    console.warn('Kiwify webhook rejected: invalid token');
    return reply(401, { error: 'Unauthorized' });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '');
  if (!url || !serviceRoleKey || !appUrl) {
    console.error('Kiwify webhook rejected: required function secret is missing');
    return reply(500, { error: 'Function secrets are not configured' });
  }

  const rawBody = await request.text();
  let payload: KiwifyPayload;
  try { payload = JSON.parse(rawBody); } catch {
    console.warn('Kiwify webhook rejected: invalid JSON');
    return reply(400, { error: 'Invalid JSON payload' });
  }

  const email = normalizeEmail(payload.Customer?.email);
  const productId = payload.Product?.product_id;
  const reference = payload.Subscription?.subscription_id ?? payload.Subscription?.id ?? payload.order_id;
  const kind = eventKind(payload.webhook_event_type, payload.order_status);
  if (!/^\S+@\S+\.\S+$/.test(email) || !productId || !reference) {
    console.warn('Kiwify webhook rejected: missing required purchase fields', { hasEmail: Boolean(email), hasProductId: Boolean(productId), hasReference: Boolean(reference) });
    return reply(400, { error: 'Missing customer email, product ID, or order/subscription ID' });
  }
  const permittedProducts = (Deno.env.get('KIWIFY_PRODUCT_IDS') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  if (permittedProducts.length > 0 && !permittedProducts.includes(productId)) {
    console.warn('Kiwify webhook rejected: product is not allowed', { productId });
    return reply(403, { error: 'Product is not allowed' });
  }
  if (!['approved', 'renewed', 'late', 'canceled', 'refunded', 'chargeback'].includes(kind)) {
    console.warn('Kiwify webhook rejected: unsupported event', { event: payload.webhook_event_type, orderStatus: payload.order_status });
    return reply(400, { error: `Unsupported event type: ${payload.webhook_event_type ?? payload.order_status ?? 'unknown'}` });
  }

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const eventId = `kiwify:${await sha256(rawBody)}`;
  const { data: existingEvent, error: eventError } = await admin
    .from('subscription_events').select('id, processing_status').eq('message_id', eventId).maybeSingle();
  if (eventError) {
    console.error('Kiwify webhook failed while checking idempotency', { message: eventError.message });
    return reply(500, { error: 'Could not check webhook idempotency' });
  }
  if (existingEvent?.processing_status === 'processed') return reply(200, { received: true, duplicate: true });

  const { data: event, error: createEventError } = existingEvent
    ? { data: existingEvent, error: null }
    : await admin.from('subscription_events').insert({
      provider: 'kiwify', event_type: payload.webhook_event_type ?? 'unknown', message_id: eventId,
      product_id: productId, payload, processing_status: 'received',
    }).select('id').single();
  if (createEventError || !event) {
    console.error('Kiwify webhook failed while recording event', { message: createEventError?.message });
    return reply(500, { error: 'Could not record webhook event' });
  }
  const fail = async (message: string) => {
    console.error('Kiwify webhook processing failed', { message });
    await admin.from('subscription_events').update({ processing_status: 'failed', processing_error: message, processed_at: new Date().toISOString() }).eq('id', event.id);
    return reply(500, { error: message });
  };

  let authUserId: string | null;
  try { authUserId = await findAuthUserId(admin, email); } catch (error) { return fail(`Could not find account: ${error.message}`); }
  if (!authUserId && !['refunded', 'chargeback'].includes(kind)) {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/definir-senha`, data: { full_name: payload.Customer?.full_name ?? email.split('@')[0] },
    });
    if (inviteError) return fail(`Could not invite buyer: ${inviteError.message}`);
    authUserId = invited.user?.id ?? null;
  }
  if (!authUserId) return fail('Could not identify the buyer account');

  const now = new Date().toISOString();
  const accessEndsAt = toIsoDate(payload.Subscription?.customer_access?.access_until) ?? toIsoDate(payload.Subscription?.next_payment);
  const revoked = kind === 'refunded' || kind === 'chargeback';
  const status = revoked ? 'revoked' : kind === 'canceled' ? (accessEndsAt ? 'canceled' : 'expired') : 'active';
  const entitlement = {
    auth_user_id: authUserId, email, access_type: 'subscription', provider: 'kiwify', provider_reference: reference,
    product_id: productId, base_plan_id: null, purchase_token: null, status,
    access_starts_at: toIsoDate(payload.Subscription?.start_date) ?? now,
    access_ends_at: accessEndsAt, auto_renewing: !['canceled', 'refunded', 'chargeback'].includes(kind),
    canceled_at: kind === 'canceled' ? now : null, revoked_at: revoked ? now : null, updated_at: now,
  };
  const { data: existingEntitlement, error: entitlementLookupError } = await admin
    .from('entitlements').select('id').eq('provider', 'kiwify').eq('provider_reference', reference).maybeSingle();
  if (entitlementLookupError) return fail(`Could not find entitlement: ${entitlementLookupError.message}`);
  const { error: entitlementError } = existingEntitlement
    ? await admin.from('entitlements').update(entitlement).eq('id', existingEntitlement.id)
    : await admin.from('entitlements').insert(entitlement);
  if (entitlementError) return fail(`Could not update entitlement: ${entitlementError.message}`);

  if (!existingEntitlement && kind === 'approved') {
    await notifyRegistration('subscription', email, 'kiwify', `Produto ${productId} | referência ${reference}`);
  }

  await admin.from('subscription_events').update({ auth_user_id: authUserId, processing_status: 'processed', processing_error: null, processed_at: now }).eq('id', event.id);
  return reply(200, { received: true });
});
