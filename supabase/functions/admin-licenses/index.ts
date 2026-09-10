import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) => {
  if (status >= 400) console.error(JSON.stringify({ status, ...body }));
  return new Response(JSON.stringify(body), { status, headers });
};

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
    status?: 'pending' | 'active' | 'grace_period' | 'on_hold' | 'canceled' | 'expired' | 'revoked';
    accessEndsAt?: string | null;
  } = {};
  try { body = await request.json(); } catch { /* empty body lists licenses */ }
  const now = new Date().toISOString();

  if (body.action === 'create_license') {
    const email = body.email?.trim().toLowerCase();
    if (!email) return reply(400, { error: 'E-mail é obrigatório.' });
    return reply(400, { error: 'Use admin-create-lifetime-license para criar licenças vitalícias.' });
  }

  if (body.action === 'update_license' || body.action === 'revoke' || body.action === 'activate') {
    if (!body.entitlementId) return reply(400, { error: 'License id is required' });
    const status = body.action === 'revoke' ? 'revoked' : body.action === 'activate' ? 'active' : body.status;
    if (!status || !['pending', 'active', 'grace_period', 'on_hold', 'canceled', 'expired', 'revoked'].includes(status)) {
      return reply(400, { error: 'Status de licença inválido.' });
    }
    const update = {
      status,
      revoked_at: status === 'revoked' ? now : null,
      access_ends_at: body.accessEndsAt || null,
      updated_at: now,
    };
    const { error } = await admin.from('entitlements').update(update).eq('id', body.entitlementId);
    if (error) return reply(500, { error: error.message });
    return reply(200, { ok: true });
  }

  const [{ data: entitlements, error: entitlementError }, { data: profiles, error: profileError }, { data: events, error: eventError }] = await Promise.all([
    admin.from('entitlements').select('id, auth_user_id, email, access_type, provider, product_id, base_plan_id, status, access_starts_at, access_ends_at, auto_renewing, canceled_at, revoked_at, created_at, updated_at').order('created_at', { ascending: false }),
    admin.from('profiles').select('id, email, full_name, role').order('email'),
    admin.from('subscription_events')
      .select('id, event_type, processing_status, processing_error, product_id, base_plan_id, created_at, processed_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  if (entitlementError || profileError || eventError) return reply(500, { error: entitlementError?.message ?? profileError?.message ?? eventError?.message });

  // A existência da conta não significa que o professor já criou a senha ou
  // entrou no sistema. last_sign_in_at é atualizado pelo Supabase Auth quando
  // ele conclui seu primeiro acesso (incluindo o fluxo de convite/recuperação).
  const authUsersById = new Map<string, { last_sign_in_at?: string | null }>();
  for (let page = 1; page <= 100; page += 1) {
    const { data, error: authUsersError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (authUsersError) return reply(500, { error: 'Não foi possível consultar o status de primeiro acesso.' });
    for (const authUser of data.users) authUsersById.set(authUser.id, { last_sign_in_at: authUser.last_sign_in_at });
    if (data.users.length < 1000) break;
  }

  const entitlementsByUser = new Map();
  const entitlementsByEmail = new Map();
  for (const entitlement of entitlements ?? []) {
    const entries = entitlementsByUser.get(entitlement.auth_user_id) ?? [];
    entries.push(entitlement);
    entitlementsByUser.set(entitlement.auth_user_id, entries);
    if (entitlement.email) {
      const email = entitlement.email.trim().toLowerCase();
      const emailEntries = entitlementsByEmail.get(email) ?? [];
      emailEntries.push(entitlement);
      entitlementsByEmail.set(email, emailEntries);
    }
  }
  const customers = (profiles ?? []).map((profile) => {
    const byId = entitlementsByUser.get(profile.id) ?? [];
    const byEmail = profile.email ? entitlementsByEmail.get(profile.email.trim().toLowerCase()) ?? [] : [];
    const merged = [...byId, ...byEmail.filter((entitlement) => !byId.some((item) => item.id === entitlement.id))];
    return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name,
    auth_user_id: profile.id,
    first_access_completed: Boolean(authUsersById.get(profile.id)?.last_sign_in_at),
    first_access_at: authUsersById.get(profile.id)?.last_sign_in_at ?? null,
    entitlements: merged,
    };
  });

  const knownEntitlementIds = new Set(customers.flatMap((customer) => customer.entitlements.map((entitlement) => entitlement.id)));
  for (const entitlement of entitlements ?? []) {
    if (!knownEntitlementIds.has(entitlement.id)) {
      customers.push({
        id: entitlement.id,
        email: entitlement.email,
        name: null,
        auth_user_id: entitlement.auth_user_id,
        first_access_completed: Boolean(authUsersById.get(entitlement.auth_user_id)?.last_sign_in_at),
        first_access_at: authUsersById.get(entitlement.auth_user_id)?.last_sign_in_at ?? null,
        entitlements: [entitlement],
      });
    }
  }

  return reply(200, { customers, events: events ?? [], products: [] });
});
