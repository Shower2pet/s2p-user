import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Fiskaly SIGN IT – generate-receipt
 *
 * Flow:
 *  1. Insert PENDING row in transaction_receipts
 *  2. Authenticate with Fiskaly (POST /tokens)
 *  3. Create INTENTION::TRANSACTION record
 *  4. Create TRANSACTION::RECEIPT record
 *  5. Update row to SENT or ERROR
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

    const { session_id, partner_id, amount } = body as {
      session_id: string; partner_id: string; amount: number;
    };
    console.log("generate-receipt (Fiskaly) called:", { session_id, partner_id, amount });

    if (!session_id || !partner_id || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const amountFloat = Number(parseFloat(String(amount)).toFixed(2));

    // --- INSERT PENDING row ---
    const { data: insertedData, error: insertError } = await supabase
      .from("transaction_receipts")
      .insert({ session_id, partner_id, amount: amountFloat, status: "PENDING" })
      .select()
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
      return new Response(JSON.stringify({ error: "DB insert failed", details: insertError }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const receiptRowId = insertedData.id;
    console.log("PENDING row created:", receiptRowId);

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
      console.error("FISKALY_API_KEY or FISKALY_API_SECRET not configured");
      await updateReceipt({ status: "ERROR", error_details: "Fiskaly credentials missing" });
      return new Response(JSON.stringify({ error: "Fiskaly credentials missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- STEP 1: Create Token (authenticate) ---
    console.log("Step 1: Authenticating with Fiskaly...");
    const tokenRes = await fetch(`${baseUrl}/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Version": API_VERSION,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        content: {
          type: "API_KEY",
          key: apiKey,
          secret: apiSecret,
        },
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Fiskaly auth failed:", tokenRes.status, errText);
      await updateReceipt({ status: "ERROR", error_details: `Fiskaly auth failed: ${tokenRes.status}` });
      return new Response(JSON.stringify({ error: "Fiskaly auth failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenRes.json();
    const bearer = tokenData?.content?.authentication?.bearer;
    if (!bearer) {
      console.error("Fiskaly token response missing bearer:", tokenData);
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

    // --- STEP 2: Create INTENTION::TRANSACTION record ---
    console.log("Step 2: Creating INTENTION record...");
    const intentionRes = await fetch(`${baseUrl}/records`, {
      method: "POST",
      headers: { ...authHeaders, "X-Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        content: {
          type: "INTENTION",
          system: { id: systemId },
          operation: { type: "TRANSACTION" },
        },
        metadata: {
          session_id: session_id,
          source: "shower2pet",
        },
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

    // --- STEP 3: Create TRANSACTION::RECEIPT record ---
    // Calculate VAT breakdown (22% standard Italian rate)
    const vatRate = 22;
    const grossAmount = amountFloat;
    const netAmount = Number((grossAmount / (1 + vatRate / 100)).toFixed(2));
    const vatAmount = Number((grossAmount - netAmount).toFixed(2));
    const transactionDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    console.log("Step 3: Creating TRANSACTION::RECEIPT record...", { grossAmount, netAmount, vatAmount });

    const transactionPayload = {
      content: {
        type: "TRANSACTION",
        record: { id: intentionId },
        operation: {
          type: "RECEIPT",
          document: {
            date: transactionDate,
            number: 0, // Fiskaly auto-assigns progressive number
            amounts: {
              total: {
                including_vat: String(grossAmount.toFixed(2)),
                excluding_vat: String(netAmount.toFixed(2)),
              },
            },
          },
          entries: [
            {
              number: 1,
              type: "SALE",
              description: "Servizio di lavaggio pet",
              commodity: "SERVICE",
              quantity: "1.000",
              amounts: {
                unit: {
                  including_vat: String(grossAmount.toFixed(2)),
                },
                total: {
                  including_vat: String(grossAmount.toFixed(2)),
                },
              },
              vat_rate: {
                code: "STANDARD",
                percentage: String(vatRate),
              },
            },
          ],
          payments: [
            {
              type: "ELECTRONIC",
              amount: String(grossAmount.toFixed(2)),
            },
          ],
        },
      },
      metadata: {
        session_id: session_id,
        source: "shower2pet",
      },
    };

    const receiptRes = await fetch(`${baseUrl}/records`, {
      method: "POST",
      headers: { ...authHeaders, "X-Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(transactionPayload),
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

    // Success
    const receiptData = await receiptRes.json();
    const fiskalyRecordId = receiptData?.content?.id || "SUCCESS_NO_ID";
    console.log("Fiskaly receipt success:", fiskalyRecordId);

    await updateReceipt({
      status: "SENT",
      fiskaly_record_id: fiskalyRecordId,
    });

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
