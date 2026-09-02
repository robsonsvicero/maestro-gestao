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
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin';
  if (isAdmin) return reply(200, { status: 'active', is_admin: true });

  if (!user.email) return reply(403, { status: 'email_required' });
  if (!user.email_confirmed_at) return reply(403, { status: 'email_confirmation_required' });

  const email = user.email.trim().toLowerCase();
  const now = new Date().toISOString();

  const { data: customer, error: customerError } = await admin
    .from('billing_customers')
    .select('id, auth_user_id')
    .eq('email', email)
    .maybeSingle();
  if (customerError) return reply(500, { error: 'Could not verify the customer record' });

  if (customer?.auth_user_id && customer.auth_user_id !== user.id) {
    return reply(409, { status: 'license_already_linked' });
  }

  let hasActiveLicense = false;
  let activeEntitlement: { access_ends_at: string | null } | null = null;
  if (customer) {
    const { data: entitlement, error: entitlementError } = await admin
      .from('billing_entitlements')
      .select('id, access_ends_at')
      .eq('customer_id', customer.id)
      .eq('status', 'active')
      .is('revoked_at', null)
      .or(`access_ends_at.is.null,access_ends_at.gt.${now}`)
      .limit(1)
      .maybeSingle();
    if (entitlementError) return reply(500, { error: 'Could not verify entitlement' });
    if (entitlement) {
      const { error: linkError } = await admin
        .from('billing_customers')
        .update({ auth_user_id: user.id, updated_at: now })
        .eq('id', customer.id);
      if (linkError) return reply(500, { error: 'Could not link license to user' });
      hasActiveLicense = true;
      activeEntitlement = entitlement;
    }
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    email,
    full_name: user.user_metadata?.full_name ?? user.email.split('@')[0],
    role: profile?.role ?? 'user',
  }, { onConflict: 'id' });
  if (profileError) return reply(500, { error: 'Could not initialize user profile' });

  if (hasActiveLicense) return reply(200, {
    status: 'active',
    access_type: 'paid',
    access_ends_at: activeEntitlement?.access_ends_at ?? null,
  });

  const { data: trial, error: trialError } = await admin
    .from('billing_trials')
    .select('auth_user_id, email, ends_at')
    .or(`auth_user_id.eq.${user.id},email.eq.${email}`)
    .maybeSingle();
  if (trialError) return reply(500, { error: 'Could not verify trial access' });

  if (trial) {
    if (trial.auth_user_id !== user.id) return reply(409, { status: 'trial_already_claimed' });
    if (new Date(trial.ends_at).getTime() <= Date.now()) {
      return reply(403, { status: 'trial_expired', trial_ends_at: trial.ends_at });
    }
    return reply(200, { status: 'active', access_type: 'trial', trial_ends_at: trial.ends_at });
  }

  return reply(403, { status: 'no_active_license' });
});
