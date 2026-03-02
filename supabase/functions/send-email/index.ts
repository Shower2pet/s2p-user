import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-EMAIL] ${step}${d}`);
};

/* ─── Brand tokens ─── */
const BRAND = {
  primary: "#005596",
  primaryFg: "#ffffff",
  sky: "#79BDE8",
  accent: "#F5866C",
  sand: "#FFD18B",
  mint: "#4CAF50",
  bg: "#f5f7fa",
  cardBg: "#ffffff",
  text: "#003052",
  muted: "#6b7f8f",
  fontFamily: "'Mitr', Arial, Helvetica, sans-serif",
  logo: "https://s2p-user.lovable.app/shower2pet-logo.png",
};

/* ─── Shared HTML wrapper ─── */
const wrapHtml = (title: string, bodyContent: string) => `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:${BRAND.fontFamily};color:${BRAND.text};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${BRAND.cardBg};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,53,82,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.sky});padding:32px 24px;text-align:center;">
            <img src="${BRAND.logo}" alt="Shower2Pet" height="48" style="height:48px;width:auto;" />
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 24px;">
            ${bodyContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 24px;text-align:center;font-size:12px;color:${BRAND.muted};border-top:1px solid #eef2f5;">
            <p style="margin:0;">© ${new Date().getFullYear()} Shower2Pet — Autolavaggi self-service per cani</p>
            <p style="margin:4px 0 0;"><a href="https://shower2pet.it" style="color:${BRAND.primary};text-decoration:none;">shower2pet.it</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const btn = (text: string, url?: string) =>
  url
    ? `<a href="${url}" style="display:inline-block;background-color:${BRAND.primary};color:${BRAND.primaryFg};text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:500;font-size:16px;margin:16px 0;">${text}</a>`
    : "";

/* ─── Email Templates ─── */
type EmailType =
  | "purchase_confirmation"
  | "credit_pack_confirmation"
  | "subscription_confirmation"
  | "partner_credentials"
  | "maintenance_ticket_opened"
  | "maintenance_ticket_closed"
  | "generic";

interface EmailData {
  to: string;
  type: EmailType;
  data: Record<string, unknown>;
}

const buildEmail = (
  type: EmailType,
  data: Record<string, unknown>,
): { subject: string; html: string } => {
  switch (type) {
    case "purchase_confirmation": {
      const amount = data.amount as number;
      const optionName = (data.option_name as string) || "Lavaggio";
      const stationId = (data.station_id as string) || "";
      const receiptUrl = data.receipt_url as string | undefined;
      return {
        subject: `Conferma acquisto — ${optionName}`,
        html: wrapHtml(
          "Conferma acquisto",
          `<h1 style="font-size:22px;margin:0 0 8px;color:${BRAND.text};">Grazie per il tuo acquisto! 🐾</h1>
          <p style="color:${BRAND.muted};margin:0 0 20px;">Il pagamento è stato completato con successo.</p>
          <table width="100%" cellpadding="12" cellspacing="0" style="background:${BRAND.bg};border-radius:12px;margin:0 0 20px;">
            <tr><td style="color:${BRAND.muted};font-size:14px;">Servizio</td><td style="text-align:right;font-weight:500;">${optionName}</td></tr>
            ${stationId ? `<tr><td style="color:${BRAND.muted};font-size:14px;">Stazione</td><td style="text-align:right;font-weight:500;">${stationId}</td></tr>` : ""}
            <tr><td style="color:${BRAND.muted};font-size:14px;">Importo</td><td style="text-align:right;font-weight:700;color:${BRAND.primary};font-size:18px;">€${(amount || 0).toFixed(2)}</td></tr>
          </table>
          ${receiptUrl ? `<p style="text-align:center;">${btn("Scarica scontrino", receiptUrl)}</p>` : ""}
          <p style="color:${BRAND.muted};font-size:13px;">Se hai domande, rispondi a questa email o contattaci tramite l'app.</p>`,
        ),
      };
    }

    case "credit_pack_confirmation": {
      const credits = data.credits as number;
      const amount = data.amount as number;
      const structureName = (data.structure_name as string) || "";
      return {
        subject: `Crediti acquistati — ${credits} crediti`,
        html: wrapHtml(
          "Crediti acquistati",
          `<h1 style="font-size:22px;margin:0 0 8px;color:${BRAND.text};">Crediti aggiunti! 💰</h1>
          <p style="color:${BRAND.muted};margin:0 0 20px;">Il tuo wallet è stato aggiornato.</p>
          <table width="100%" cellpadding="12" cellspacing="0" style="background:${BRAND.bg};border-radius:12px;margin:0 0 20px;">
            <tr><td style="color:${BRAND.muted};font-size:14px;">Crediti</td><td style="text-align:right;font-weight:700;color:${BRAND.mint};font-size:18px;">+${credits}</td></tr>
            <tr><td style="color:${BRAND.muted};font-size:14px;">Importo</td><td style="text-align:right;font-weight:500;">€${(amount || 0).toFixed(2)}</td></tr>
            ${structureName ? `<tr><td style="color:${BRAND.muted};font-size:14px;">Struttura</td><td style="text-align:right;font-weight:500;">${structureName}</td></tr>` : ""}
          </table>`,
        ),
      };
    }

    case "subscription_confirmation": {
      const planName = (data.plan_name as string) || "Abbonamento";
      const amount = data.amount as number;
      return {
        subject: `Abbonamento attivato — ${planName}`,
        html: wrapHtml(
          "Abbonamento attivato",
          `<h1 style="font-size:22px;margin:0 0 8px;color:${BRAND.text};">Abbonamento attivato! 🎉</h1>
          <p style="color:${BRAND.muted};margin:0 0 20px;">Il tuo abbonamento è ora attivo.</p>
          <table width="100%" cellpadding="12" cellspacing="0" style="background:${BRAND.bg};border-radius:12px;margin:0 0 20px;">
            <tr><td style="color:${BRAND.muted};font-size:14px;">Piano</td><td style="text-align:right;font-weight:500;">${planName}</td></tr>
            <tr><td style="color:${BRAND.muted};font-size:14px;">Importo</td><td style="text-align:right;font-weight:500;">€${(amount || 0).toFixed(2)}/mese</td></tr>
          </table>
          <p style="text-align:center;">${btn("Gestisci abbonamento", "https://s2p-user.lovable.app/subscriptions")}</p>`,
        ),
      };
    }

    case "partner_credentials": {
      const email = data.email as string;
      const tempPassword = data.temp_password as string;
      const partnerName = (data.partner_name as string) || "Partner";
      return {
        subject: "Benvenuto su Shower2Pet — Le tue credenziali",
        html: wrapHtml(
          "Credenziali partner",
          `<h1 style="font-size:22px;margin:0 0 8px;color:${BRAND.text};">Benvenuto, ${partnerName}! 🚿</h1>
          <p style="color:${BRAND.muted};margin:0 0 20px;">Il tuo account partner è stato creato. Usa le credenziali qui sotto per accedere alla Console.</p>
          <table width="100%" cellpadding="12" cellspacing="0" style="background:${BRAND.bg};border-radius:12px;margin:0 0 20px;">
            <tr><td style="color:${BRAND.muted};font-size:14px;">Email</td><td style="text-align:right;font-weight:500;">${email}</td></tr>
            <tr><td style="color:${BRAND.muted};font-size:14px;">Password temporanea</td><td style="text-align:right;font-weight:700;color:${BRAND.accent};font-size:16px;letter-spacing:1px;">${tempPassword}</td></tr>
          </table>
          <p style="color:${BRAND.accent};font-weight:500;font-size:14px;">⚠️ Dovrai cambiarla al primo accesso.</p>
          <p style="text-align:center;">${btn("Accedi alla Console", data.console_url as string || "https://s2p-console.lovable.app")}</p>`,
        ),
      };
    }

    case "maintenance_ticket_opened": {
      const stationId = (data.station_id as string) || "";
      const reason = (data.reason as string) || "";
      const severity = (data.severity as string) || "low";
      const severityColor = severity === "high" ? "#e53e3e" : severity === "medium" ? BRAND.sand : BRAND.mint;
      return {
        subject: `🔧 Nuovo ticket manutenzione — Stazione ${stationId}`,
        html: wrapHtml(
          "Ticket manutenzione",
          `<h1 style="font-size:22px;margin:0 0 8px;color:${BRAND.text};">Nuovo ticket di manutenzione</h1>
          <p style="color:${BRAND.muted};margin:0 0 20px;">È stato aperto un ticket per una tua stazione.</p>
          <table width="100%" cellpadding="12" cellspacing="0" style="background:${BRAND.bg};border-radius:12px;margin:0 0 20px;">
            <tr><td style="color:${BRAND.muted};font-size:14px;">Stazione</td><td style="text-align:right;font-weight:500;">${stationId}</td></tr>
            <tr><td style="color:${BRAND.muted};font-size:14px;">Gravità</td><td style="text-align:right;"><span style="background:${severityColor};color:white;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:500;text-transform:uppercase;">${severity}</span></td></tr>
            <tr><td style="color:${BRAND.muted};font-size:14px;">Motivo</td><td style="text-align:right;font-weight:500;">${reason}</td></tr>
          </table>`,
        ),
      };
    }

    case "maintenance_ticket_closed": {
      const stationId = (data.station_id as string) || "";
      return {
        subject: `✅ Ticket risolto — Stazione ${stationId}`,
        html: wrapHtml(
          "Ticket risolto",
          `<h1 style="font-size:22px;margin:0 0 8px;color:${BRAND.text};">Ticket risolto ✅</h1>
          <p style="color:${BRAND.muted};margin:0 0 20px;">Il ticket di manutenzione per la stazione <strong>${stationId}</strong> è stato chiuso.</p>`,
        ),
      };
    }

    case "generic":
    default: {
      const subject = (data.subject as string) || "Notifica Shower2Pet";
      const message = (data.message as string) || "";
      return {
        subject,
        html: wrapHtml(subject, `<p style="font-size:16px;line-height:1.6;">${message}</p>`),
      };
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    logStep("ERROR: RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const { to, type, data } = (await req.json()) as EmailData;

    if (!to || !type) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' or 'type'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    logStep("Building email", { to, type });

    const { subject, html } = buildEmail(type, data || {});
    const from = (data?.from as string) || "Shower2Pet <noreply@shower2pet.com>";

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      logStep("Resend API error", { status: resendRes.status, body: resendData });
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    logStep("Email sent successfully", { id: resendData.id, to, type });

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
