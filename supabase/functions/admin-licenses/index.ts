import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!token || !url || !serviceRoleKey) return reply(401, { error: 'Unauthorized' });

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await userClient.auth.getUser(token);
  if (!user) return reply(401, { error: 'Invalid session' });

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return reply(403, { error: 'Admin access required' });

  let body: {
    action?: string;
    entitlementId?: string;
    email?: string;
    name?: string;
    phone?: string;
    productId?: string;
    status?: 'pending' | 'active' | 'expired' | 'revoked';
    accessEndsAt?: string | null;
  } = {};
  try { body = await request.json(); } catch { /* empty body lists licenses */ }
  const now = new Date().toISOString();

  if (body.action === 'create_license') {
    const email = body.email?.trim().toLowerCase();
    if (!email || !body.productId) return reply(400, { error: 'E-mail e produto são obrigatórios.' });
    if (!['pending', 'active', 'expired', 'revoked'].includes(body.status ?? 'active')) {
      return reply(400, { error: 'Status de licença inválido.' });
    }

    const { data: product, error: productError } = await admin
      .from('billing_products')
      .select('id')
      .eq('id', body.productId)
      .eq('active', true)
      .maybeSingle();
    if (productError || !product) return reply(400, { error: 'Produto não encontrado ou inativo.' });

    const { data: customer, error: customerError } = await admin
      .from('billing_customers')
      .upsert({ email, name: body.name?.trim() || null, phone: body.phone?.trim() || null, updated_at: now }, { onConflict: 'email' })
      .select('id')
      .single();
    if (customerError || !customer) return reply(500, { error: customerError?.message ?? 'Não foi possível criar o cliente.' });

    const status = body.status ?? 'active';
    const { error: entitlementError } = await admin.from('billing_entitlements').upsert({
      customer_id: customer.id,
      product_id: product.id,
      status,
      access_starts_at: now,
      access_ends_at: body.accessEndsAt || null,
      revoked_at: status === 'revoked' ? now : null,
      updated_at: now,
    }, { onConflict: 'customer_id,product_id' });
    if (entitlementError) return reply(500, { error: entitlementError.message });
    return reply(200, { ok: true });
  }

  if (body.action === 'update_license' || body.action === 'revoke' || body.action === 'activate') {
    if (!body.entitlementId) return reply(400, { error: 'License id is required' });
    const status = body.action === 'revoke' ? 'revoked' : body.action === 'activate' ? 'active' : body.status;
    if (!status || !['pending', 'active', 'expired', 'revoked'].includes(status)) {
      return reply(400, { error: 'Status de licença inválido.' });
    }
    const update = {
      status,
      revoked_at: status === 'revoked' ? now : null,
      access_ends_at: body.accessEndsAt || null,
      updated_at: now,
    };
    const { error } = await admin.from('billing_entitlements').update(update).eq('id', body.entitlementId);
    if (error) return reply(500, { error: error.message });
    return reply(200, { ok: true });
  }

  const [{ data: customers, error: customerError }, { data: events, error: eventError }, { data: products, error: productError }] = await Promise.all([
    admin.from('billing_customers').select(`
      id, email, name, phone, auth_user_id, created_at,
      billing_entitlements (
        id, status, access_starts_at, access_ends_at, revoked_at, updated_at,
        billing_products ( name, kiwify_product_id ),
        billing_subscriptions ( status, current_period_end, canceled_at )
      )
    `).order('created_at', { ascending: false }),
    admin.from('billing_webhook_events')
      .select('id, event_type, processing_status, processing_error, kiwify_order_id, received_at')
      .order('received_at', { ascending: false })
      .limit(20),
    admin.from('billing_products').select('id, name, kiwify_product_id, active').order('name'),
  ]);
  if (customerError || eventError || productError) return reply(500, { error: customerError?.message ?? eventError?.message ?? productError?.message });

  return reply(200, { customers: customers ?? [], events: events ?? [], products: products ?? [] });
});
