/// <reference path="../deno.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  Deno.env.get('APP_URL')?.replace(/\/$/, ''),
  'http://localhost:5173',
  'http://localhost:3000',
  'https://maeztro.app',
].filter(Boolean) as string[];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || '*');
  return {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
  };
}

const reply = (req: Request, status: number, body: Record<string, unknown>) => {
  if (status >= 400) console.error(JSON.stringify({ status, ...body }));
  return new Response(JSON.stringify(body), { status, headers: getCorsHeaders(req) });
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(request) });
  if (request.method !== 'POST') return reply(request, 405, { error: 'Method not allowed' });

  const authorization = request.headers.get('authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '') ?? '';

  if (!token || !supabaseUrl || !serviceRoleKey) return reply(request, 401, { error: 'Unauthorized' });

  // Valida que quem está chamando é um admin
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) return reply(request, 401, { error: 'Invalid session' });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: callerProfile, error: callerProfileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (callerProfileError) return reply(request, 500, { error: 'Não foi possível verificar as permissões.' });
  if (callerProfile?.role !== 'admin') return reply(request, 403, { error: 'Acesso restrito: apenas administradores.' });

  let body: { email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return reply(request, 400, { error: 'Corpo da requisição inválido.' });
  }

  const emailToGrant = body.email?.trim()?.toLowerCase();
  if (!emailToGrant) return reply(request, 400, { error: 'E-mail é obrigatório.' });

  // ── Passo 1: localizar ou criar a conta no Auth ──────────────────────────

  let targetUserId: string | null = null;
  let accountCreated = false;

  // Busca em profiles (usuário já fez login pelo menos uma vez)
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', emailToGrant)
    .maybeSingle();

  if (targetProfile?.id) {
    targetUserId = targetProfile.id;
  } else {
    // Busca direto em auth.users (criou conta mas ainda não fez 1º login)
    const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = authList?.users?.find((u: any) => u.email?.toLowerCase() === emailToGrant);

    if (found) {
      targetUserId = found.id;
    } else {
      // Não existe ainda: cria a conta e envia convite para definir senha
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(emailToGrant, {
        redirectTo: appUrl ? `${appUrl}/definir-senha` : undefined,
        data: { full_name: body.name?.trim() || emailToGrant.split('@')[0] },
      });

      if (inviteError) {
        console.error('Erro ao criar conta:', inviteError);
        return reply(request, 500, { error: `Não foi possível criar a conta para "${emailToGrant}". Verifique se o e-mail é válido.` });
      }

      targetUserId = invited.user?.id ?? null;
      accountCreated = true;
    }
  }

  if (!targetUserId) {
    return reply(request, 500, { error: 'Não foi possível identificar o usuário. Tente novamente.' });
  }

  // ── Passo 2: verificar se o e-mail já possui uma licença ────────────────

  const { data: existing } = await admin
    .from('entitlements')
    .select('id, status')
    .eq('auth_user_id', targetUserId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return reply(request, 409, { error: `Este e-mail já possui uma licença (${existing.status}).` });
  }

  // ── Passo 3: criar o entitlement ─────────────────────────────────────────

  const { error: insertError } = await admin.from('entitlements').insert({
    auth_user_id: targetUserId,
    email: emailToGrant,
    access_type: 'lifetime',
    provider: 'internal',
    status: 'active',
    access_starts_at: new Date().toISOString(),
    access_ends_at: null,
  });

  if (insertError) {
    console.error('Erro ao inserir entitlement:', insertError);
    return reply(request, 500, { error: 'Não foi possível criar a licença. Tente novamente.' });
  }

  const message = accountCreated
    ? `Licença criada e e-mail de convite enviado para "${emailToGrant}". O usuário receberá um link para definir a senha.`
    : `Licença vitalícia criada com sucesso para "${emailToGrant}".`;

  return reply(request, 200, { status: 'success', message, account_created: accountCreated });
});
