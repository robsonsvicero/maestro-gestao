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

  const authorization = request.headers.get('authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '') ?? '';

  if (!token || !supabaseUrl || !serviceRoleKey) return reply(401, { error: 'Unauthorized' });

  // Valida que quem está chamando é um admin
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) return reply(401, { error: 'Invalid session' });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: callerProfile, error: callerProfileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (callerProfileError) return reply(500, { error: 'Não foi possível verificar as permissões.' });
  if (callerProfile?.role !== 'admin') return reply(403, { error: 'Acesso restrito: apenas administradores.' });

  let body: { email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'Corpo da requisição inválido.' });
  }

  const emailToGrant = body.email?.trim()?.toLowerCase();
  if (!emailToGrant) return reply(400, { error: 'E-mail é obrigatório.' });

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
    const found = authList?.users?.find((u) => u.email?.toLowerCase() === emailToGrant);

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
        return reply(500, { error: `Não foi possível criar a conta para "${emailToGrant}". Verifique se o e-mail é válido.` });
      }

      targetUserId = invited.user?.id ?? null;
      accountCreated = true;
    }
  }

  if (!targetUserId) {
    return reply(500, { error: 'Não foi possível identificar o usuário. Tente novamente.' });
  }

  // ── Passo 2: verificar se já existe licença vitalícia ativa ──────────────

  const { data: existing } = await admin
    .from('entitlements')
    .select('id, status')
    .eq('auth_user_id', targetUserId)
    .eq('access_type', 'lifetime')
    .is('revoked_at', null)
    .maybeSingle();

  if (existing && existing.status === 'active') {
    return reply(409, { error: `Este e-mail já possui uma licença vitalícia ativa.` });
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
    return reply(500, { error: 'Não foi possível criar a licença. Tente novamente.' });
  }

  const message = accountCreated
    ? `Licença criada e e-mail de convite enviado para "${emailToGrant}". O usuário receberá um link para definir a senha.`
    : `Licença vitalícia criada com sucesso para "${emailToGrant}".`;

  return reply(200, { status: 'success', message, account_created: accountCreated });
});
