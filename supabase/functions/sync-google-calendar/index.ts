import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Secrets OAuth do Google não configuradas.");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = await tokenResponse.json();
  if (!tokenResponse.ok || !body.access_token) throw new Error(`Google OAuth falhou: ${JSON.stringify(body)}`);
  return body.access_token as string;
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
      .select("professional_name, sync_with_google_calendar")
      .eq("user_id", userId)
      .maybeSingle();
    if (settingsError) throw settingsError;
    const { data: connection, error: connectionError } = await admin
      .from("google_calendar_connections")
      .select("google_email, calendar_id, refresh_token, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (settingsError || connectionError) throw settingsError || connectionError;
    if (!settings?.sync_with_google_calendar || !connection || connection.status !== "connected") {
      return reply(200, { ok: true, skipped: true, reason: "Google Calendar não conectado." });
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

    const accessToken = await refreshGoogleAccessToken(connection.refresh_token);
    let synced = 0;
    let failed = 0;
    const errors: Array<{ lessonId: string; error: string }> = [];

    for (const lesson of lessons) {
      try {
        const eventResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendar_id)}/events`,
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
