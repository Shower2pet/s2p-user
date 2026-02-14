import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id, partner_id, amount } = await req.json();
    console.log("generate-receipt called:", { session_id, partner_id, amount });

    if (!session_id || !partner_id || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const amountFloat = Number(parseFloat(amount).toFixed(2));

    // --- INSERT PENDING row upfront ---
    console.log("Tentativo di inserimento PENDING per sessione:", session_id);
    const { data: insertedData, error: insertError } = await supabase
      .from("transaction_receipts")
      .insert({
        session_id,
        partner_id,
        amount: amountFloat,
        status: "PENDING",
      })
      .select()
      .single();

    if (insertError) {
      console.error("ERRORE FATALE INSERIMENTO DB:", insertError);
      return new Response(JSON.stringify({ error: "Errore inserimento ricevuta", details: insertError }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const receiptRowId = insertedData.id;
    console.log("Riga PENDING creata con id:", receiptRowId);

    // Helper to update the receipt row
    const updateReceipt = async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from("transaction_receipts")
        .update(updates)
        .eq("id", receiptRowId);
      if (error) console.error("Errore update transaction_receipts:", error);
    };

    // --- Fetch partner fiscal data ---
    const { data: partner, error: partnerErr } = await supabase
      .from("partners_fiscal_data")
      .select("vat_number, business_name, sdi_code")
      .eq("profile_id", partner_id)
      .maybeSingle();

    if (partnerErr) console.error("Error fetching partner fiscal data:", partnerErr);

    const { data: profile } = await supabase
      .from("profiles")
      .select("vat_number, fiscal_code")
      .eq("id", partner_id)
      .maybeSingle();

    const fiscalId = partner?.vat_number || profile?.vat_number || profile?.fiscal_code;
    if (!fiscalId) {
      console.error("No fiscal_id found for partner:", partner_id);
      await updateReceipt({ status: "error", error_details: "fiscal_id mancante per il partner" });
      return new Response(JSON.stringify({ error: "fiscal_id mancante" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- STEP 1: A-Cube Login ---
    const acubeEmail = Deno.env.get("ACUBE_EMAIL");
    const acubePassword = Deno.env.get("ACUBE_PASSWORD");

    if (!acubeEmail || !acubePassword) {
      console.error("ACUBE_EMAIL or ACUBE_PASSWORD not configured");
      await updateReceipt({ status: "error", error_details: "A-Cube credentials missing" });
      return new Response(JSON.stringify({ error: "A-Cube credentials missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Step 1: Logging in to A-Cube...");
    const loginRes = await fetch("https://common-sandbox.api.acubeapi.com/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: acubeEmail, password: acubePassword }),
    });

    if (!loginRes.ok) {
      const loginErr = await loginRes.text();
      console.error("A-Cube login failed:", loginRes.status, loginErr);
      await updateReceipt({ status: "error", error_details: `A-Cube login failed: ${loginRes.status}` });
      return new Response(JSON.stringify({ error: "A-Cube login failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    if (!token) {
      console.error("A-Cube login response missing token:", loginData);
      await updateReceipt({ status: "error", error_details: "A-Cube token missing from login response" });
      return new Response(JSON.stringify({ error: "A-Cube token missing" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("A-Cube login successful, token obtained.");

    // --- STEP 2: Send Receipt ---
    const acubePayload = {
      fiscal_id: fiscalId,
      type: "sale",
      items: [
        {
          description: "Servizio di lavaggio pet",
          quantity: 1,
          unit_price: amountFloat,
          vat_rate: 22.0,
          gross_price: true,
        },
      ],
      payments: [
        {
          amount: amountFloat,
          payment_type: "electronic",
        },
      ],
    };

    console.log("Step 2: Sending receipt to A-Cube:", JSON.stringify(acubePayload));
    const receiptRes = await fetch("https://api-sandbox.acubeapi.com/receipts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(acubePayload),
    });

    if (!receiptRes.ok) {
      let errorDetails: string;
      try {
        const errorJson = await receiptRes.json();
        errorDetails = JSON.stringify(errorJson);
        console.error("A-Cube Error Data:", errorJson);
      } catch {
        errorDetails = await receiptRes.text();
        console.error("A-Cube Error Text:", errorDetails);
      }

      await updateReceipt({ status: "error", error_details: `A-Cube ${receiptRes.status}: ${errorDetails.slice(0, 500)}` });

      return new Response(JSON.stringify({ success: false, error: "A-Cube Error", details: errorDetails }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Success
    const receiptData = await receiptRes.json();
    console.log("A-Cube receipt success:", receiptData);

    await updateReceipt({
      status: "sent",
      acube_transaction_id: receiptData?.id || receiptData?.uuid || null,
    });

    return new Response(JSON.stringify({ success: true, data: receiptData }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("generate-receipt unhandled error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
