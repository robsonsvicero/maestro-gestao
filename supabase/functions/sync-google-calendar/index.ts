import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

const base64Url = (value: string) =>
  btoa(value).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

async function getGoogleAccessToken() {
  const raw = Deno.env.get("GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON não configurada.");

  const serviceAccount = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const unsignedToken = [
    base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64Url(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })),
  ].join(".");

  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (character) => character.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  );
  const jwt = `${unsignedToken}.${base64Url(String.fromCharCode(...new Uint8Array(signature)))}`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) throw new Error(`Google OAuth falhou: ${tokenResponse.status} ${await tokenResponse.text()}`);
  return (await tokenResponse.json()).access_token as string;
}

const toGoogleEvent = (lesson: Record<string, any>, professionalName: string | null) => ({
  summary: `Aula de ${lesson.instrument || "música"} - ${lesson.student_name}`,
  description: [
    professionalName && `Professor: ${professionalName}`,
    lesson.notes,
  ].filter(Boolean).join("\n"),
  location: lesson.location || undefined,
  start: {
    dateTime: `${lesson.date}T${String(lesson.start_time).slice(0, 5)}:00`,
    timeZone: "America/Sao_Paulo",
  },
  end: {
    dateTime: `${lesson.date}T${String(lesson.end_time).slice(0, 5)}:00`,
    timeZone: "America/Sao_Paulo",
  },
});

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return reply(405, { error: "Método não permitido." });

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return reply(401, { error: "Autenticação ou configuração do Supabase ausente." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return reply(401, { error: "Sessão inválida." });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const userId = userData.user.id;

  try {
    const { data: settings, error: settingsError } = await admin
      .from("app_settings")
      .select("google_calendar_email, professional_name, sync_with_google_calendar")
      .eq("user_id", userId)
      .maybeSingle();
    if (settingsError) throw settingsError;
    if (!settings?.sync_with_google_calendar || !settings.google_calendar_email) {
      return reply(200, { ok: true, skipped: true, reason: "Sincronização desativada ou calendário não informado." });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: lessons, error: lessonsError } = await admin
      .from("lesson")
      .select("id, student_name, instrument, date, start_time, end_time, location, notes, status")
      .eq("user_id", userId)
      .is("google_calendar_event_id", null)
      .gte("date", today)
      .neq("status", "cancelled")
      .order("date", { ascending: true });
    if (lessonsError) throw lessonsError;

    if (!lessons?.length) return reply(200, { ok: true, synced: 0, failed: 0 });

    const accessToken = await getGoogleAccessToken();
    let synced = 0;
    let failed = 0;
    const errors: Array<{ lessonId: string; error: string }> = [];

    for (const lesson of lessons) {
      try {
        const eventResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(settings.google_calendar_email)}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(toGoogleEvent(lesson, settings.professional_name)),
          },
        );
        const eventBody = await eventResponse.json();
        if (!eventResponse.ok) throw new Error(JSON.stringify(eventBody));

        const { error: updateError } = await admin
          .from("lesson")
          .update({
            google_calendar_event_id: eventBody.id,
            google_calendar_sync_status: "synced",
            google_calendar_sync_error: null,
          })
          .eq("id", lesson.id)
          .eq("user_id", userId);
        if (updateError) throw updateError;
        synced += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await admin
          .from("lesson")
          .update({ google_calendar_sync_status: "error", google_calendar_sync_error: message })
          .eq("id", lesson.id)
          .eq("user_id", userId);
        failed += 1;
        errors.push({ lessonId: lesson.id, error: message });
      }
    }

    return reply(200, { ok: failed === 0, synced, failed, errors });
  } catch (error) {
    console.error("Google Calendar batch sync error", error);
    return reply(500, { error: error instanceof Error ? error.message : String(error) });
  }
});
