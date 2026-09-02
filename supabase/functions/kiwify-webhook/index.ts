import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'content-type': 'application/json; charset=utf-8' };

type KiwifyPayload = {
  order_id?: string;
  order_status?: string;
  webhook_event_type?: string;
  approved_date?: string;
  refunded_at?: string;
  created_at?: string;
  updated_at?: string;
  Product?: { product_id?: string; product_name?: string };
  Customer?: { email?: string; full_name?: string; mobile?: string };
  Commissions?: { charge_amount?: string | number; currency?: string };
  Subscription?: {
    id?: string;
    subscription_id?: string;
    status?: string;
    start_date?: string;
    next_payment?: string;
    customer_access?: { access_until?: string; has_access?: boolean; active_period?: boolean };
  };
};

const response = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const normalizeEmail = (email?: string) => email?.trim().toLowerCase() ?? '';

const toIsoDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const sha256 = async (value: string) => {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
};

const normalizeEvent = (event?: string) => {
  const events: Record<string, string> = {
    order_approved: 'approved', compra_aprovada: 'approved',
    subscription_renewed: 'renewed',
    subscription_late: 'late',
    subscription_canceled: 'canceled',
    order_refunded: 'refunded', compra_reembolsada: 'refunded',
    chargeback: 'chargeback',
  };
  return events[event?.toLowerCase() ?? ''] ?? 'unknown';
};

const getWebhookToken = (request: Request) => {
  const url = new URL(request.url);
  const authorization = request.headers.get('authorization');
  return url.searchParams.get('token')
    ?? request.headers.get('x-kiwify-token')
    ?? (authorization?.startsWith('Bearer ') ? authorization.slice(7) : null);
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return response(405, { error: 'Method not allowed' });

  const expectedToken = Deno.env.get('KIWIFY_WEBHOOK_TOKEN');
  if (!expectedToken || getWebhookToken(request) !== expectedToken) {
    return response(401, { error: 'Unauthorized webhook request' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return response(500, { error: 'Function secrets are not configured' });

  const rawBody = await request.text();
  let payload: KiwifyPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return response(400, { error: 'Invalid JSON payload' });
  }

  const eventHash = await sha256(rawBody);
  const eventType = payload.webhook_event_type ?? 'unknown';
  const productId = payload.Product?.product_id;
  const orderId = payload.order_id;
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: existingEvent, error: existingEventError } = await supabase
    .from('billing_webhook_events')
    .select('id, processing_status')
    .eq('event_hash', eventHash)
    .maybeSingle();
  if (existingEventError) return response(500, { error: 'Could not check webhook idempotency' });
  if (existingEvent?.processing_status === 'processed') return response(200, { received: true, duplicate: true });

  const eventRecord = {
    event_hash: eventHash,
    event_type: eventType,
    external_event_id: orderId ?? null,
    kiwify_order_id: orderId ?? null,
    kiwify_product_id: productId ?? null,
    payload,
    processing_status: 'received',
    processing_error: null,
  };
  const { data: createdEvent, error: createEventError } = existingEvent
    ? { data: existingEvent, error: null }
    : await supabase.from('billing_webhook_events').insert(eventRecord).select('id').single();
  if (createEventError || !createdEvent) return response(500, { error: 'Could not record webhook event' });

  const fail = async (message: string) => {
    await supabase.from('billing_webhook_events').update({ processing_status: 'failed', processing_error: message }).eq('id', createdEvent.id);
    return response(422, { error: message });
  };

  const email = normalizeEmail(payload.Customer?.email);
  if (!productId || !email || !orderId) return fail('Missing Kiwify product, customer email, or order id');

  const { data: product } = await supabase
    .from('billing_products')
    .select('id, active')
    .eq('kiwify_product_id', productId)
    .maybeSingle();
  if (!product?.active) return fail('Product is not registered or active');

  const { data: currentCustomer } = await supabase
    .from('billing_customers')
    .select('id, auth_user_id')
    .eq('email', email)
    .maybeSingle();
  const customerPayload = {
    email,
    name: payload.Customer?.full_name ?? null,
    phone: payload.Customer?.mobile ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data: customer, error: customerError } = currentCustomer
    ? await supabase.from('billing_customers').update(customerPayload).eq('id', currentCustomer.id).select('id').single()
    : await supabase.from('billing_customers').insert(customerPayload).select('id').single();
  if (customerError || !customer) return fail(`Could not upsert customer: ${customerError?.message ?? 'no customer returned'}`);

  const kind = normalizeEvent(eventType);
  const amountInCents = Number(payload.Commissions?.charge_amount ?? 0);
  const amount = Number.isFinite(amountInCents) ? amountInCents / 100 : null;
  const now = new Date().toISOString();
  const orderPayload = {
    kiwify_order_id: orderId,
    customer_id: customer.id,
    product_id: product.id,
    status: payload.order_status ?? kind,
    amount,
    currency: payload.Commissions?.currency ?? 'BRL',
    raw_data: payload,
    purchased_at: toIsoDate(payload.approved_date) ?? toIsoDate(payload.created_at),
    refunded_at: kind === 'refunded' ? (toIsoDate(payload.refunded_at) ?? now) : null,
    updated_at: now,
  };
  const { error: orderError } = await supabase.from('billing_orders').upsert(orderPayload, { onConflict: 'kiwify_order_id' });
  if (orderError) return fail(`Could not upsert order: ${orderError.message}`);

  const subscriptionExternalId = payload.Subscription?.subscription_id ?? payload.Subscription?.id;
  let subscriptionId: string | null = null;
  if (subscriptionExternalId) {
    const subscriptionPayload = {
      kiwify_subscription_id: subscriptionExternalId,
      customer_id: customer.id,
      product_id: product.id,
      status: payload.Subscription?.status ?? kind,
      current_period_start: toIsoDate(payload.Subscription?.start_date),
      current_period_end: toIsoDate(payload.Subscription?.customer_access?.access_until) ?? toIsoDate(payload.Subscription?.next_payment),
      canceled_at: kind === 'canceled' ? now : null,
      last_event_at: now,
      raw_data: payload.Subscription,
      updated_at: now,
    };
    const { data: subscription, error: subscriptionError } = await supabase
      .from('billing_subscriptions')
      .upsert(subscriptionPayload, { onConflict: 'kiwify_subscription_id' })
      .select('id')
      .single();
    if (subscriptionError || !subscription) return fail(`Could not upsert subscription: ${subscriptionError?.message ?? 'no subscription returned'}`);
    subscriptionId = subscription.id;
  }

  const revokesAccess = kind === 'refunded' || kind === 'chargeback';
  const keepsAccess = kind === 'approved' || kind === 'renewed' || kind === 'late' || kind === 'canceled';
  if (!revokesAccess && !keepsAccess) return fail(`Unsupported event type: ${eventType}`);

  const entitlementPayload = revokesAccess
    ? { status: 'revoked', revoked_at: now, updated_at: now }
    : {
      status: 'active',
      subscription_id: subscriptionId,
      access_starts_at: toIsoDate(payload.Subscription?.start_date) ?? now,
      access_ends_at: toIsoDate(payload.Subscription?.customer_access?.access_until) ?? toIsoDate(payload.Subscription?.next_payment),
      revoked_at: null,
      updated_at: now,
    };
  const { error: entitlementError } = await supabase.from('billing_entitlements').upsert({
    customer_id: customer.id,
    product_id: product.id,
    ...entitlementPayload,
  }, { onConflict: 'customer_id,product_id' });
  if (entitlementError) return fail(`Could not update entitlement: ${entitlementError.message}`);

  // Na primeira compra aprovada, o Supabase envia um convite para o comprador
  // definir a senha. Não é necessário exibir cadastro público para assinantes.
  if (kind === 'approved' && !currentCustomer?.auth_user_id) {
    const appUrl = Deno.env.get('APP_URL');
    if (!appUrl) return fail('APP_URL secret is not configured');
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl.replace(/\/$/, '')}/definir-senha`,
      data: { full_name: payload.Customer?.full_name ?? null },
    });
    // É normal que o comprador já tenha uma conta, por exemplo após usar o
    // teste gratuito. Nesse caso ele só precisa entrar com a senha existente.
    if (inviteError && !/already (registered|exists)|already been registered/i.test(inviteError.message)) {
      return fail(`Could not invite buyer: ${inviteError.message}`);
    }
  }

  await supabase.from('billing_webhook_events').update({
    processing_status: 'processed',
    processing_error: null,
    processed_at: now,
  }).eq('id', createdEvent.id);

  return response(200, { received: true });
});
