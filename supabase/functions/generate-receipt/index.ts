import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Fiskaly SIGN IT – generate-receipt
 *
 * Accetta solo { session_id } — ricava partner_id e amount autonomamente dal DB.
 *
 * Flow:
 *  1. Fetch session → join station → join structure → owner = partner_id
 *  2. Fetch transaction amount for this session
 *  3. Insert PENDING row in transaction_receipts
 *  4. Authenticate with Fiskaly (POST /tokens)
 *  5. Create INTENTION::TRANSACTION record
 *  6. Create TRANSACTION::RECEIPT record
 *  7. Update row to SENT or ERROR
 */

const API_VERSION = "2025-08-12";

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

    const { session_id } = body as { session_id: string };
    console.log("generate-receipt called:", { session_id });

    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- STEP 1: Fetch session + station + structure → owner = partner_id ---
    const { data: session, error: sessionErr } = await supabase
      .from("wash_sessions")
      .select("id, station_id, total_seconds, option_name")
      .eq("id", session_id)
      .maybeSingle();

    if (sessionErr || !session) {
      console.error("Session not found:", sessionErr);
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get station → structure_id
    const { data: station, error: stationErr } = await supabase
      .from("stations")
      .select("structure_id")
      .eq("id", session.station_id)
      .maybeSingle();

    if (stationErr || !station?.structure_id) {
      console.error("Station/structure not found:", stationErr);
      return new Response(JSON.stringify({ error: "Station structure not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get structure → owner_id = partner_id
    const { data: structure, error: structErr } = await supabase
      .from("structures")
      .select("owner_id")
      .eq("id", station.structure_id)
      .maybeSingle();

    if (structErr || !structure?.owner_id) {
      console.error("Structure owner not found:", structErr);
      return new Response(JSON.stringify({ error: "Structure owner not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const partner_id = structure.owner_id;
    console.log("Resolved partner_id:", partner_id, "for station:", session.station_id);

    // --- STEP 2: Fetch transaction amount ---
    const { data: transaction } = await supabase
      .from("transactions")
      .select("total_value")
      .eq("station_id", session.station_id)
      .in("status", ["COMPLETED", "completed", "PAID", "paid"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fallback: derive amount from washing option duration (minutes * price not available here, use total_seconds / 60 as proxy)
    // Better: use total_value from transaction if available
    const amountFloat = transaction?.total_value
      ? Number(parseFloat(String(transaction.total_value)).toFixed(2))
      : Number((session.total_seconds / 60).toFixed(2)); // fallback

    console.log("Amount resolved:", amountFloat, "from transaction:", !!transaction);

    // Check if receipt already exists for this session
    const { data: existingReceipt } = await supabase
      .from("transaction_receipts")
      .select("id, status")
      .eq("session_id", session_id)
      .maybeSingle();

    if (existingReceipt && existingReceipt.status === "SENT") {
      console.log("Receipt already sent for session:", session_id);
      return new Response(JSON.stringify({ success: true, message: "Receipt already sent" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- STEP 3: Insert or reuse PENDING row ---
    let receiptRowId: string;
    if (existingReceipt) {
      receiptRowId = existingReceipt.id;
    } else {
      const { data: insertedData, error: insertError } = await supabase
        .from("transaction_receipts")
        .insert({ session_id, partner_id, amount: amountFloat, status: "PENDING" })
        .select()
        .single();

      if (insertError || !insertedData) {
        console.error("DB insert error:", insertError);
        return new Response(JSON.stringify({ error: "DB insert failed", details: insertError }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      receiptRowId = insertedData.id;
    }

    console.log("Receipt row ID:", receiptRowId);

    const updateReceipt = async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from("transaction_receipts")
        .update(updates)
        .eq("id", receiptRowId);
      if (error) console.error("Error updating receipt row:", error);
    };

    // --- Fetch partner fiskaly_system_id ---
    const { data: profile } = await supabase
      .from("profiles")
      .select("fiskaly_system_id")
      .eq("id", partner_id)
      .maybeSingle();

    const systemId = profile?.fiskaly_system_id;
    if (!systemId) {
      console.error("No fiskaly_system_id for partner:", partner_id);
      await updateReceipt({ status: "ERROR", error_details: "fiskaly_system_id mancante per il partner" });
      return new Response(JSON.stringify({ error: "fiskaly_system_id mancante" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Determine environment ---
    const fiskalyEnv = (Deno.env.get("FISKALY_ENV") || "test").toLowerCase();
    const baseUrl = fiskalyEnv === "live"
      ? "https://live.api.fiskaly.com"
      : "https://test.api.fiskaly.com";

    const apiKey = Deno.env.get("FISKALY_API_KEY");
    const apiSecret = Deno.env.get("FISKALY_API_SECRET");

    if (!apiKey || !apiSecret) {
      await updateReceipt({ status: "ERROR", error_details: "Fiskaly credentials missing" });
      return new Response(JSON.stringify({ error: "Fiskaly credentials missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- STEP 4: Authenticate with Fiskaly ---
    console.log("Authenticating with Fiskaly...", baseUrl);
    const tokenRes = await fetch(`${baseUrl}/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Version": API_VERSION,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        content: { type: "API_KEY", key: apiKey, secret: apiSecret },
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Fiskaly auth failed:", tokenRes.status, errText);
      await updateReceipt({ status: "ERROR", error_details: `Fiskaly auth failed: ${tokenRes.status} ${errText.slice(0, 300)}` });
      return new Response(JSON.stringify({ error: "Fiskaly auth failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenRes.json();
    const bearer = tokenData?.content?.authentication?.bearer;
    if (!bearer) {
      console.error("Fiskaly token response missing bearer:", JSON.stringify(tokenData).slice(0, 300));
      await updateReceipt({ status: "ERROR", error_details: "Fiskaly bearer token missing" });
      return new Response(JSON.stringify({ error: "Fiskaly bearer missing" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Fiskaly auth OK.");

    const authHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${bearer}`,
      "X-Api-Version": API_VERSION,
    };

    // --- STEP 5: Create INTENTION::TRANSACTION ---
    console.log("Creating INTENTION record...");
    const intentionRes = await fetch(`${baseUrl}/records`, {
      method: "POST",
      headers: { ...authHeaders, "X-Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        content: {
          type: "INTENTION",
          system: { id: systemId },
          operation: { type: "TRANSACTION" },
        },
        metadata: { session_id, source: "shower2pet" },
      }),
    });

    if (!intentionRes.ok) {
      const errText = await intentionRes.text();
      console.error("Fiskaly INTENTION failed:", intentionRes.status, errText);
      await updateReceipt({ status: "ERROR", error_details: `Fiskaly INTENTION ${intentionRes.status}: ${errText.slice(0, 500)}` });
      return new Response(JSON.stringify({ error: "Fiskaly INTENTION failed", details: errText }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const intentionData = await intentionRes.json();
    const intentionId = intentionData?.content?.id;
    console.log("INTENTION created:", intentionId);

    // --- STEP 6: Create TRANSACTION::RECEIPT ---
    const vatRate = 22;
    const grossAmount = amountFloat;
    const netAmount = Number((grossAmount / (1 + vatRate / 100)).toFixed(2));
    const transactionDate = new Date().toISOString().split("T")[0];

    console.log("Creating TRANSACTION::RECEIPT...", { grossAmount, netAmount });

    const receiptRes = await fetch(`${baseUrl}/records`, {
      method: "POST",
      headers: { ...authHeaders, "X-Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        content: {
          type: "TRANSACTION",
          record: { id: intentionId },
          operation: {
            type: "RECEIPT",
            document: {
              date: transactionDate,
              number: 0,
              amounts: {
                total: {
                  including_vat: grossAmount.toFixed(2),
                  excluding_vat: netAmount.toFixed(2),
                },
              },
            },
            entries: [
              {
                number: 1,
                type: "SALE",
                description: `Lavaggio pet: ${session.option_name || "Servizio"}`,
                commodity: "SERVICE",
                quantity: "1.000",
                amounts: {
                  unit: { including_vat: grossAmount.toFixed(2) },
                  total: { including_vat: grossAmount.toFixed(2) },
                },
                vat_rate: { code: "STANDARD", percentage: String(vatRate) },
              },
            ],
            payments: [{ type: "ELECTRONIC", amount: grossAmount.toFixed(2) }],
          },
        },
        metadata: { session_id, source: "shower2pet" },
      }),
    });

    if (!receiptRes.ok) {
      let errorDetails: string;
      try {
        const errorJson = await receiptRes.json();
        errorDetails = JSON.stringify(errorJson);
        console.error("Fiskaly RECEIPT Error:", errorJson);
      } catch {
        errorDetails = await receiptRes.text();
        console.error("Fiskaly RECEIPT Error Text:", errorDetails);
      }
      await updateReceipt({ status: "ERROR", error_details: `Fiskaly RECEIPT ${receiptRes.status}: ${errorDetails.slice(0, 500)}` });
      return new Response(JSON.stringify({ success: false, error: "Fiskaly RECEIPT Error", details: errorDetails }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const receiptData = await receiptRes.json();
    const fiskalyRecordId = receiptData?.content?.id || "SUCCESS_NO_ID";
    console.log("Fiskaly receipt success:", fiskalyRecordId);

    await updateReceipt({ status: "SENT", fiskaly_record_id: fiskalyRecordId });

    return new Response(JSON.stringify({ success: true, data: receiptData }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("generate-receipt unhandled error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
