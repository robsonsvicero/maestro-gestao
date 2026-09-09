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
  
  const { data: profile, error: profileSelectError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
    
  if (profileSelectError) return reply(500, { error: 'Could not fetch profile' });
  
  if (profile?.role !== 'admin') {
    return reply(403, { error: 'Forbidden: Admins only' });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return reply(400, { error: 'Invalid JSON body' });
  }

  const emailToGrant = body.email?.trim()?.toLowerCase();
  if (!emailToGrant) return reply(400, { error: 'E-mail é obrigatório.' });

  // Tenta localizar pelo perfil primeiro
  const { data: targetProfile, error: profileLookupError } = await admin
    .from('profiles')
    .select('id')
    .eq('email', emailToGrant)
    .maybeSingle();

  if (profileLookupError) return reply(500, { error: 'Erro ao buscar perfil do usuário.' });

  let targetUserId: string | null = targetProfile?.id ?? null;

  // Se não encontrou no profiles, tenta em auth.users (usuário criou conta mas ainda não fez 1º login)
  if (!targetUserId) {
    const { data: authUsers, error: authLookupError } = await admin.auth.admin.listUsers();
    if (authLookupError) return reply(500, { error: 'Erro ao consultar usuários.' });
    const found = authUsers?.users?.find((u) => u.email?.toLowerCase() === emailToGrant);
    if (found) targetUserId = found.id;
  }

  if (!targetUserId) {
    return reply(404, { error: `Nenhuma conta encontrada para o e-mail "${emailToGrant}". O usuário precisa criar uma conta antes de receber uma licença.` });
  }

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

  return reply(200, { status: 'success', message: 'Lifetime license created successfully' });
});
