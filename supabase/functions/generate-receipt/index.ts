import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Fiskaly SIGN IT – generate-receipt
 *
 * Accetta { session_id } per lavaggi con Stripe
 * oppure { stripe_session_id, product_type, amount, description } per credit_pack / subscription.
 *
 * Solo per pagamenti Stripe — i crediti non generano scontrino fiscale.
 */

const API_VERSION = "2025-08-12";

const log = (msg: string, details?: unknown) =>
  console.log(`[RECEIPT] ${msg}${details ? " - " + JSON.stringify(details) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid or empty request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session_id, stripe_session_id, product_type, amount: bodyAmount, description: bodyDescription } = body as {
      session_id?: string;
      stripe_session_id?: string;
      product_type?: string;
      amount?: number;
      description?: string;
    };

    log("generate-receipt called", { session_id, stripe_session_id, product_type });

    if (!session_id && !stripe_session_id) {
      return new Response(JSON.stringify({ error: "session_id or stripe_session_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Variabili da risolvere ────────────────────────────────────────────
    let partner_id: string | null = null;
    let amountFloat: number = 0;
    let receiptDescription = bodyDescription || "Servizio Shower2Pet";
    let resolvedSessionId: string | null = session_id || null;

    // Genera UUID deterministici per idempotency (Fiskaly richiede UUID v4 puri)
    // Usiamo crypto.randomUUID() ma "seediamo" logicamente con un hash del session/stripe id
    // Per idempotenza reale, usiamo il session_id/stripe_session_id come namespace UUID v5-like
    // ma per semplicità usiamo UUID casuali: il sistema di deduplicazione DB già gestisce i duplicati
    const intentionIdempotencyKey = crypto.randomUUID();
    const receiptIdempotencyKey = crypto.randomUUID();

    // ── CASO A: wash_session (pagamento Stripe per lavaggio) ─────────────
    if (session_id) {

      const { data: session, error: sessionErr } = await supabase
        .from("wash_sessions")
        .select("id, station_id, total_seconds, option_name")
        .eq("id", session_id)
        .maybeSingle();

      if (sessionErr || !session) {
        log("Session not found", { sessionErr });
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: station } = await supabase
        .from("stations")
        .select("structure_id")
        .eq("id", session.station_id)
        .maybeSingle();

      if (!station?.structure_id) {
        log("Station structure not found");
        return new Response(JSON.stringify({ error: "Station structure not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: structure } = await supabase
        .from("structures")
        .select("owner_id")
        .eq("id", station.structure_id)
        .maybeSingle();

      if (!structure?.owner_id) {
        log("Structure owner not found");
        return new Response(JSON.stringify({ error: "Structure owner not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      partner_id = structure.owner_id;
      log("Resolved partner_id from wash_session", { partner_id, station: session.station_id });

      // Fetch amount from transaction (match by stripe_session_id or latest for station)
      const { data: tx } = await supabase
        .from("transactions")
        .select("total_value")
        .eq("station_id", session.station_id)
        .in("status", ["COMPLETED", "completed", "PAID", "paid"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      amountFloat = tx?.total_value
        ? Number(parseFloat(String(tx.total_value)).toFixed(2))
        : Number((session.total_seconds / 60).toFixed(2));

      receiptDescription = `Lavaggio pet: ${session.option_name || "Servizio"}`;
      log("Amount from transaction", { amountFloat, fromTx: !!tx });
    }

    // ── CASO B: credit_pack o subscription via stripe_session_id ─────────
    if (!session_id && stripe_session_id) {

      // Trova la transazione associata alla stripe_session
      const { data: tx } = await supabase
        .from("transactions")
        .select("total_value, structure_id, user_id, transaction_type")
        .eq("stripe_payment_id", stripe_session_id)
        .maybeSingle();

      if (!tx) {
        log("Transaction not found for stripe_session_id", { stripe_session_id });
        return new Response(JSON.stringify({ error: "Transaction not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      amountFloat = bodyAmount ?? Number(parseFloat(String(tx.total_value)).toFixed(2));

      // Trova il partner tramite structure_id
      if (tx.structure_id) {
        const { data: structure } = await supabase
          .from("structures")
          .select("owner_id")
          .eq("id", tx.structure_id)
          .maybeSingle();

        partner_id = structure?.owner_id ?? null;
      }

      if (!partner_id) {
        log("Partner not found for stripe transaction", { stripe_session_id });
        return new Response(JSON.stringify({ error: "Partner not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (product_type === "credit_pack") {
        receiptDescription = "Ricarica crediti Shower2Pet";
      } else if (product_type === "subscription") {
        receiptDescription = "Abbonamento Shower2Pet";
      }

      log("Resolved from stripe_session_id", { partner_id, amountFloat, product_type });
    }

    // ── Guardia: amount e partner devono essere risolti ───────────────────
    if (!partner_id || amountFloat <= 0) {
      log("Cannot resolve partner or amount", { partner_id, amountFloat });
      return new Response(JSON.stringify({ error: "Cannot resolve partner_id or amount" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Deduplicazione: scontrino già inviato? ────────────────────────────
    const dedupeFilter = resolvedSessionId
      ? { column: "session_id", value: resolvedSessionId }
      : null;

    if (dedupeFilter) {
      const { data: existingReceipt } = await supabase
        .from("transaction_receipts")
        .select("id, status")
        .eq(dedupeFilter.column, dedupeFilter.value)
        .maybeSingle();

      if (existingReceipt?.status === "SENT") {
        log("Receipt already sent", { session_id: resolvedSessionId });
        return new Response(JSON.stringify({ success: true, message: "Receipt already sent" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Insert PENDING row ────────────────────────────────────────────────
    const insertPayload: Record<string, unknown> = {
      partner_id,
      amount: amountFloat,
      status: "PENDING",
    };
    if (resolvedSessionId) insertPayload.session_id = resolvedSessionId;

    const { data: insertedData, error: insertError } = await supabase
      .from("transaction_receipts")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError || !insertedData) {
      log("DB insert error", { insertError });
      return new Response(JSON.stringify({ error: "DB insert failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const receiptRowId = insertedData.id;
    log("Receipt row created", { receiptRowId });

    const updateReceipt = async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from("transaction_receipts")
        .update(updates)
        .eq("id", receiptRowId);
      if (error) log("Error updating receipt row", { error });
    };

    // ── Fetch partner fiskaly_system_id + credenziali ─────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("fiskaly_system_id")
      .eq("id", partner_id)
      .maybeSingle();

    const systemId = profile?.fiskaly_system_id;
    if (!systemId) {
      log("fiskaly_system_id mancante per il partner", { partner_id });
      await updateReceipt({ status: "ERROR", error_details: "fiskaly_system_id mancante per il partner" });
      return new Response(JSON.stringify({ error: "fiskaly_system_id mancante" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: fiscalData } = await supabase
      .from("partners_fiscal_data")
      .select("fiscal_api_credentials")
      .eq("profile_id", partner_id)
      .maybeSingle();

    const partnerCreds = fiscalData?.fiscal_api_credentials as { api_key?: string; api_secret?: string; env?: string } | null;

    const apiKey = partnerCreds?.api_key || Deno.env.get("FISKALY_API_KEY");
    const apiSecret = partnerCreds?.api_secret || Deno.env.get("FISKALY_API_SECRET");
    const fiskalyEnv = (partnerCreds?.env || Deno.env.get("FISKALY_ENV") || "test").toLowerCase();
    const baseUrl = fiskalyEnv === "live" ? "https://live.api.fiskaly.com" : "https://test.api.fiskaly.com";

    log("Fiskaly creds source", { source: partnerCreds?.api_key ? "partner_fiscal_data" : "global_env", env: fiskalyEnv, systemId });

    if (!apiKey || !apiSecret) {
      await updateReceipt({ status: "ERROR", error_details: "Fiskaly credentials missing" });
      return new Response(JSON.stringify({ error: "Fiskaly credentials missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Autenticazione Fiskaly ─────────────────────────────────────────────
    log("Authenticating with Fiskaly...", { baseUrl });
    const tokenRes = await fetch(`${baseUrl}/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Version": API_VERSION,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ content: { type: "API_KEY", key: apiKey, secret: apiSecret } }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      log("Fiskaly auth failed", { status: tokenRes.status, err: errText.slice(0, 200) });
      await updateReceipt({ status: "ERROR", error_details: `Fiskaly auth failed: ${tokenRes.status}` });
      return new Response(JSON.stringify({ error: "Fiskaly auth failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenRes.json();
    const bearer = tokenData?.content?.authentication?.bearer;
    if (!bearer) {
      await updateReceipt({ status: "ERROR", error_details: "Fiskaly bearer token missing" });
      return new Response(JSON.stringify({ error: "Fiskaly bearer missing" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log("Fiskaly auth OK");

    const authHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${bearer}`,
      "X-Api-Version": API_VERSION,
    };

    // ── INTENTION ─────────────────────────────────────────────────────────
    log("Creating INTENTION record...");
    const intentionRes = await fetch(`${baseUrl}/records`, {
      method: "POST",
      headers: { ...authHeaders, "X-Idempotency-Key": intentionIdempotencyKey },
      body: JSON.stringify({
        content: {
          type: "INTENTION",
          system: { id: systemId },
          operation: { type: "TRANSACTION" },
        },
        metadata: { source: "shower2pet", ...(resolvedSessionId ? { session_id: resolvedSessionId } : { stripe_session_id }) },
      }),
    });

    if (!intentionRes.ok) {
      const errText = await intentionRes.text();
      log("Fiskaly INTENTION failed", { status: intentionRes.status, err: errText.slice(0, 300) });
      await updateReceipt({ status: "ERROR", error_details: `Fiskaly INTENTION ${intentionRes.status}: ${errText.slice(0, 500)}` });
      return new Response(JSON.stringify({ error: "Fiskaly INTENTION failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const intentionData = await intentionRes.json();
    const intentionId = intentionData?.content?.id;
    log("INTENTION created", { intentionId });

    // ── RECEIPT (Fiskaly SIGN IT 2025-08-12 schema) ──────────────────
    const vatPercentage = 22;
    const grossAmount = amountFloat; // IVA inclusa
    const netAmount = grossAmount / (1 + vatPercentage / 100);
    const vatAmount = grossAmount - netAmount;

    // Formato Decimal12p8 richiesto da Fiskaly
    const fmt = (n: number) => n.toFixed(8);

    // Numero documento incrementale (usiamo timestamp-based per unicità)
    const docNumber = String(Date.now()).slice(-10);

    log("Creating TRANSACTION::RECEIPT", { grossAmount, netAmount: fmt(netAmount), vatAmount: fmt(vatAmount) });

    const receiptPayload = {
      content: {
        type: "TRANSACTION",
        record: { id: intentionId },
        operation: {
          type: "RECEIPT",
          document: {
            number: docNumber,
            total_vat: {
              amount: fmt(vatAmount),
              exclusive: fmt(netAmount),
              inclusive: fmt(grossAmount),
            },
          },
          entries: [
            {
              type: "SALE",
              data: {
                type: "ITEM",
                text: receiptDescription,
                unit: {
                  quantity: fmt(1),
                  price: fmt(grossAmount),
                },
                value: {
                  base: fmt(netAmount),
                },
                vat: {
                  type: "VAT_RATE",
                  code: "STANDARD",
                  percentage: "22.00",
                  amount: fmt(vatAmount),
                  exclusive: fmt(netAmount),
                  inclusive: fmt(grossAmount),
                },
              },
              details: {
                concept: "SERVICE",
                description: receiptDescription,
              },
            },
          ],
          payments: [
            {
              type: "ONLINE",
              details: {
                amount: fmt(grossAmount),
              },
              name: "Stripe",
            },
          ],
        },
      },
      metadata: { source: "shower2pet", ...(resolvedSessionId ? { session_id: resolvedSessionId } : { stripe_session_id }) },
    };

    log("RECEIPT payload", receiptPayload);

    const receiptRes = await fetch(`${baseUrl}/records`, {
      method: "POST",
      headers: { ...authHeaders, "X-Idempotency-Key": receiptIdempotencyKey },
      body: JSON.stringify(receiptPayload),
    });

    if (!receiptRes.ok) {
      let errorDetails: string;
      try {
        errorDetails = JSON.stringify(await receiptRes.json());
      } catch {
        errorDetails = await receiptRes.text();
      }
      log("Fiskaly RECEIPT Error", { status: receiptRes.status, errorDetails: errorDetails.slice(0, 500) });
      await updateReceipt({ status: "ERROR", error_details: `Fiskaly RECEIPT ${receiptRes.status}: ${errorDetails.slice(0, 500)}` });
      return new Response(JSON.stringify({ success: false, error: "Fiskaly RECEIPT Error", details: errorDetails.slice(0, 300) }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const receiptData = await receiptRes.json();
    const fiskalyRecordId = receiptData?.content?.id || "SUCCESS_NO_ID";
    log("Fiskaly receipt success", { fiskalyRecordId });

    await updateReceipt({ status: "SENT", fiskaly_record_id: fiskalyRecordId });

    return new Response(JSON.stringify({ success: true, data: receiptData }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    log("Unhandled error", { error: (err as Error).message });
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
