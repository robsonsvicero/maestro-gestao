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

  let body: { action?: string; entitlementId?: string } = {};
  try { body = await request.json(); } catch { /* empty body lists licenses */ }
  const now = new Date().toISOString();

  if (body.action === 'revoke' || body.action === 'activate') {
    if (!body.entitlementId) return reply(400, { error: 'License id is required' });
    const update = body.action === 'revoke'
      ? { status: 'revoked', revoked_at: now, updated_at: now }
      : { status: 'active', revoked_at: null, access_starts_at: now, updated_at: now };
    const { error } = await admin.from('billing_entitlements').update(update).eq('id', body.entitlementId);
    if (error) return reply(500, { error: error.message });
    return reply(200, { ok: true });
  }

  const [{ data: customers, error: customerError }, { data: events, error: eventError }] = await Promise.all([
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
  ]);
  if (customerError || eventError) return reply(500, { error: customerError?.message ?? eventError?.message });

  return reply(200, { customers: customers ?? [], events: events ?? [] });
});
