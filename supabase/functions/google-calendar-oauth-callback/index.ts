import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const html = (message: string) => new Response(`<!doctype html><meta charset="utf-8"><p>${message}</p>`, {
  status: 400,
  headers: { "Content-Type": "text/html; charset=utf-8" },
});

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  if (oauthError) return html(`Autorização cancelada: ${oauthError}`);
  if (!code || !state) return html("Resposta OAuth inválida.");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const redirectUri = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI");
  const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
  if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret || !redirectUri) {
    return html("Configuração OAuth incompleta no servidor.");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: stateRow, error: stateError } = await admin
    .from("google_calendar_oauth_states")
    .select("user_id, expires_at")
    .eq("state", state)
    .maybeSingle();
  if (stateError || !stateRow || new Date(stateRow.expires_at) < new Date()) {
    return html("Autorização expirada. Tente conectar novamente.");
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenBody = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenBody.refresh_token) {
      throw new Error(JSON.stringify(tokenBody));
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.email) throw new Error("Não foi possível identificar o e-mail Google.");

    const { error: connectionError } = await admin.from("google_calendar_connections").upsert({
      user_id: stateRow.user_id,
      google_email: profile.email,
      calendar_id: "primary",
      refresh_token: tokenBody.refresh_token,
      access_token: tokenBody.access_token,
      access_token_expires_at: new Date(Date.now() + Number(tokenBody.expires_in || 3600) * 1000).toISOString(),
      scopes: String(tokenBody.scope || "").split(" ").filter(Boolean),
      status: "connected",
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (connectionError) throw connectionError;

    const { error: settingsError } = await admin.from("app_settings").upsert({
      user_id: stateRow.user_id,
      google_calendar_email: profile.email,
      sync_with_google_calendar: true,
    }, { onConflict: "user_id" });
    if (settingsError) throw settingsError;
    await admin.from("google_calendar_oauth_states").delete().eq("state", state);

    return Response.redirect(`${appUrl.replace(/\/$/, "")}/Settings?google_calendar=connected`, 303);
  } catch (error) {
    console.error("Google OAuth callback error", error);
    await admin.from("google_calendar_oauth_states").delete().eq("state", state);
    return html("Não foi possível conectar o Google Calendar. Tente novamente.");
  }
});
