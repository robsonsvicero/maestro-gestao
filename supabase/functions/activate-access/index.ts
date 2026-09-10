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

  const authorization = request.headers.get('authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!token || !supabaseUrl || !serviceRoleKey) return reply(401, { error: 'Unauthorized' });

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) return reply(401, { error: 'Invalid session' });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: profile, error: profileSelectError } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profileSelectError) return reply(500, { error: 'Could not fetch profile' });
  
  const isAdmin = profile?.role === 'admin';
  if (isAdmin) return reply(200, { status: 'active', is_admin: true });

  if (!user.email) return reply(403, { status: 'email_required' });

  const email = user.email.trim().toLowerCase();
  const now = new Date().toISOString();

  const { data: entitlement, error: entitlementError } = await admin
    .from('entitlements')
    .select('access_type, provider, access_ends_at, status')
    .eq('auth_user_id', user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (entitlementError) return reply(500, { error: 'Could not verify entitlement' });

  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    email,
    full_name: user.user_metadata?.full_name ?? user.email.split('@')[0],
    role: profile?.role ?? 'user',
  }, { onConflict: 'id' });
  
  if (profileError) return reply(500, { error: 'Could not initialize user profile' });

  const activeEntitlements = (entitlement ?? []).filter((item) =>
    ['active', 'grace_period', 'canceled'].includes(item.status)
    && (!item.access_ends_at || new Date(item.access_ends_at).getTime() > Date.now())
  );

  if (activeEntitlements.length > 0) {
    // Prioridade de acesso: lifetime > subscription > trial
    let bestEntitlement = activeEntitlements.find(e => e.access_type === 'lifetime');
    if (!bestEntitlement) bestEntitlement = activeEntitlements.find(e => e.access_type === 'subscription');
    if (!bestEntitlement) bestEntitlement = activeEntitlements.find(e => e.access_type === 'trial');
    
    if (bestEntitlement) {
      if (bestEntitlement.access_type === 'trial') {
        return reply(200, { status: 'active', access_type: 'trial', provider: bestEntitlement.provider, trial_ends_at: bestEntitlement.access_ends_at });
      }
      return reply(200, {
        status: 'active',
        access_type: bestEntitlement.access_type, // 'subscription' ou 'lifetime'
        provider: bestEntitlement.provider,
        access_ends_at: bestEntitlement.access_ends_at,
      });
    }
  }

  // O fluxo de primeiro acesso usa um link de recuperação de senha. Esse link
  // autentica o titular do e-mail, porém pode não preencher email_confirmed_at
  // em contas criadas por convite. Não bloquear uma licença já vinculada a uma
  // sessão autenticada apenas por esse marcador.
  if (!user.email_confirmed_at) return reply(403, { status: 'email_confirmation_required' });

  return reply(200, {
    status: 'no_access',
    access_reason: entitlement?.[0]?.status ?? 'no_license',
  });
});
