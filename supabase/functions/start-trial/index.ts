/// <reference path="../deno.d.ts" />
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

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (request: Request) => {
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

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const email = user.email.trim().toLowerCase();
  const now = new Date().toISOString();
  
  const { data: existingTrial, error: trialError } = await admin
    .from('entitlements')
    .select('auth_user_id, access_ends_at')
    .eq('access_type', 'trial')
    .or(`auth_user_id.eq.${user.id},email.eq.${email}`)
    .maybeSingle();

  if (trialError) return reply(500, { error: 'Could not verify trial access' });
  
  if (existingTrial) {
    if (existingTrial.auth_user_id !== user.id) return reply(409, { error: 'Este e-mail já utilizou o teste gratuito.' });
    if (existingTrial.access_ends_at && new Date(existingTrial.access_ends_at).getTime() <= Date.now()) {
      return reply(403, { error: 'O período de teste já terminou.' });
    }
    return reply(200, { status: 'active', trial_ends_at: existingTrial.access_ends_at });
  }

  const endsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { error: createError } = await admin.from('entitlements').insert({
    auth_user_id: user.id,
    email,
    access_type: 'trial',
    provider: 'internal',
    status: 'active',
    access_starts_at: now,
    access_ends_at: endsAt,
    updated_at: now,
  });

  if (createError) {
    const { data: retryTrial, error: retryError } = await admin
      .from('entitlements')
      .select('auth_user_id, access_ends_at')
      .eq('auth_user_id', user.id)
      .eq('access_type', 'trial')
      .eq('provider', 'internal')
      .maybeSingle();

    if (!retryError && retryTrial?.access_ends_at) {
      await notifyRegistration('trial', email, 'internal', `Acesso já existente em ${new Date(now).toISOString()}`);
      return reply(200, { status: 'active', trial_ends_at: retryTrial.access_ends_at });
    }

    return reply(500, { error: 'Could not start trial access' });
  }

  await notifyRegistration('trial', email, 'internal', `Acesso criado em ${new Date(now).toISOString()}`);
  return reply(200, { status: 'active', trial_ends_at: endsAt });
});
