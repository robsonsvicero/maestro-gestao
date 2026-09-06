// Edge Function: send-email
// Envia e-mails via Resend API.
// Deploy: npx supabase functions deploy send-email
// Secrets: npx supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//          npx supabase secrets set FROM_EMAIL=noreply@seudominio.com.br

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { from_name, to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios ausentes: to, subject, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY não configurada nos secrets do Supabase." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderName = from_name || "Maestro Gestão";
    const fromAddress = `${senderName} <${FROM_EMAIL}>`;

    // Converte quebras de linha em parágrafos HTML
    const htmlBody = body
      .split("\n")
      .map((line: string) => `<p style="margin: 4px 0;">${line.trim()}</p>`)
      .filter((line: string) => line !== '<p style="margin: 4px 0;"></p>')
      .join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="background: linear-gradient(135deg, #094C7E, #0A5A94); padding: 24px 28px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">${senderName}</h1>
            </div>
            <div style="background: #f9fafb; padding: 28px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none; color: #374151; font-size: 15px; line-height: 1.6;">
              ${htmlBody}
            </div>
            <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px;">
              Enviado por Maestro Gestão
            </p>
          </div>
        `,
        text: body,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Erro Resend:", data);
      return new Response(
        JSON.stringify({ error: data }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
