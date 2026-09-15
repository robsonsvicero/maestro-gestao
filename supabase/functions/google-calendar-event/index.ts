import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return reply(405, { error: "Método não permitido." });

  try {
    const { calendarId, professionalName, lesson } = await request.json();
    if (!calendarId || !lesson?.studentName || !lesson?.date || !lesson?.startTime || !lesson?.endTime) {
      return reply(400, { error: "Dados obrigatórios do evento ausentes." });
    }

    const accessToken = await getGoogleAccessToken();
    const event = {
      summary: `Aula de ${lesson.instrument || "música"} - ${lesson.studentName}`,
      description: [
        professionalName && `Professor: ${professionalName}`,
        lesson.notes,
      ].filter(Boolean).join("\n"),
      location: lesson.location || undefined,
      start: { dateTime: `${lesson.date}T${lesson.startTime}:00`, timeZone: "America/Sao_Paulo" },
      end: { dateTime: `${lesson.date}T${lesson.endTime}:00`, timeZone: "America/Sao_Paulo" },
    };
    const eventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      },
    );

    const responseBody = await eventResponse.json();
    if (!eventResponse.ok) {
      console.error("Google Calendar API error", responseBody);
      return reply(eventResponse.status, { error: responseBody });
    }

    return reply(200, { success: true, eventId: responseBody.id, htmlLink: responseBody.htmlLink });
  } catch (error) {
    console.error("Google Calendar sync error", error);
    return reply(500, { error: error instanceof Error ? error.message : String(error) });
  }
});
