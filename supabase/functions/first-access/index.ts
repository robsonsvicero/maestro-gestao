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

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '');
  if (!url || !serviceRoleKey || !appUrl) return reply(500, { error: 'Configuração de acesso incompleta.' });

  let email = '';
  try { email = String((await request.json()).email ?? '').trim().toLowerCase(); } catch { /* invalid handled below */ }
  if (!/^\S+@\S+\.\S+$/.test(email)) return reply(400, { error: 'Informe um e-mail válido.' });

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const now = new Date().toISOString();
  const { data: customer, error: customerError } = await admin
    .from('billing_customers')
    .select('id, name, auth_user_id')
    .eq('email', email)
    .maybeSingle();
  if (customerError) return reply(500, { error: 'Não foi possível verificar o acesso.' });
  if (!customer) return reply(403, { error: 'Não encontramos uma licença ativa para este e-mail.' });

  const { data: entitlement, error: entitlementError } = await admin
    .from('billing_entitlements')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('status', 'active')
    .is('revoked_at', null)
    .or(`access_ends_at.is.null,access_ends_at.gt.${now}`)
    .limit(1)
    .maybeSingle();
  if (entitlementError) return reply(500, { error: 'Não foi possível verificar a licença.' });
  if (!entitlement) return reply(403, { error: 'Não encontramos uma licença ativa para este e-mail.' });

  if (!customer.auth_user_id) {
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/definir-senha`,
      data: { full_name: customer.name ?? null },
    });
    if (inviteError && !/already (registered|exists)|already been registered/i.test(inviteError.message)) {
      return reply(500, { error: 'Não foi possível enviar o e-mail de primeiro acesso.' });
    }
  }

  return reply(200, { ok: true });
});
