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
  if (!token || !url || !serviceRoleKey) return reply(401, { error: 'Unauthorized' });

  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user?.email) return reply(401, { error: 'Invalid session' });
  if (!user.email_confirmed_at) return reply(403, { error: 'Confirme seu e-mail antes de iniciar o teste.' });

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const email = user.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const { data: existingTrial, error: trialError } = await admin
    .from('billing_trials').select('auth_user_id, ends_at').or(`auth_user_id.eq.${user.id},email.eq.${email}`).maybeSingle();
  if (trialError) return reply(500, { error: 'Could not verify trial access' });
  if (existingTrial) {
    if (existingTrial.auth_user_id !== user.id) return reply(409, { error: 'Este e-mail já utilizou o teste gratuito.' });
    if (new Date(existingTrial.ends_at).getTime() <= Date.now()) return reply(403, { error: 'O período de teste já terminou.' });
    return reply(200, { status: 'active', trial_ends_at: existingTrial.ends_at });
  }

  const endsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { error: createError } = await admin.from('billing_trials').insert({
    auth_user_id: user.id, email, starts_at: now, ends_at: endsAt, updated_at: now,
  });
  if (createError) return reply(500, { error: 'Could not start trial access' });
  return reply(200, { status: 'active', trial_ends_at: endsAt });
});
