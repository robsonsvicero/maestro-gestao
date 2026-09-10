import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) return reply(500, { error: 'Configuração de acesso incompleta.' });

  let email = '';
  try { email = String((await request.json()).email ?? '').trim().toLowerCase(); } catch { /* validated below */ }
  if (!/^\S+@\S+\.\S+$/.test(email)) return reply(400, { error: 'Informe um e-mail válido.' });

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const now = new Date().toISOString();
  const { data: entitlement, error } = await admin.from('entitlements')
    .select('id')
    .eq('email', email)
    .in('status', ['active', 'grace_period', 'canceled'])
    .is('revoked_at', null)
    .or(`access_ends_at.is.null,access_ends_at.gt.${now}`)
    .limit(1)
    .maybeSingle();
  if (error) return reply(500, { error: 'Não foi possível verificar a licença.' });
  if (!entitlement) return reply(403, { error: 'Não encontramos uma licença ativa para este e-mail.' });

  // O webhook da Kiwify cria e convida a conta na compra aprovada. O frontend
  // também solicita a recuperação de senha; esta função apenas confirma que o
  // e-mail informado tem direito de acesso, sem revelar dados da licença.
  return reply(200, { ok: true });
});
