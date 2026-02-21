import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_VERSION = "2025-08-12";

const log = (msg: string, details?: unknown) =>
  console.log(`[GET-RECEIPT-PDF] ${msg}${details ? " - " + JSON.stringify(details) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabase.auth.getUser(token);
    const user = authData.user;
    if (!user) throw new Error("User not authenticated");

    const { transaction_id } = await req.json();
    if (!transaction_id) throw new Error("transaction_id is required");

    log("Request", { transaction_id, userId: user.id });

    // Verify user owns this transaction
    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .select("id, fiscal_doc_url, structure_id, user_id")
      .eq("id", transaction_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (txErr || !tx) {
      log("Transaction not found or not owned by user", { txErr });
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tx.fiscal_doc_url || !tx.fiscal_doc_url.startsWith("fiskaly:")) {
      return new Response(JSON.stringify({ error: "Receipt not available" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fiskalyRecordId = tx.fiscal_doc_url.replace("fiskaly:", "");
    log("Fetching Fiskaly record", { fiskalyRecordId });

    // Find partner for this structure to get Fiskaly credentials
    let partnerId: string | null = null;
    if (tx.structure_id) {
      const { data: structure } = await supabase
        .from("structures")
        .select("owner_id")
        .eq("id", tx.structure_id)
        .maybeSingle();
      partnerId = structure?.owner_id ?? null;
    }

    // Fallback: find partner from transaction_receipts
    if (!partnerId) {
      const { data: receipt } = await supabase
        .from("transaction_receipts")
        .select("partner_id")
        .eq("fiskaly_record_id", fiskalyRecordId)
        .maybeSingle();
      partnerId = receipt?.partner_id ?? null;
    }

    if (!partnerId) {
      return new Response(JSON.stringify({ error: "Partner not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Fiskaly credentials
    const { data: profile } = await supabase
      .from("profiles")
      .select("fiskaly_system_id")
      .eq("id", partnerId)
      .maybeSingle();

    const systemId = profile?.fiskaly_system_id;

    const { data: fiscalData } = await supabase
      .from("partners_fiscal_data")
      .select("fiscal_api_credentials")
      .eq("profile_id", partnerId)
      .maybeSingle();

    const partnerCreds = fiscalData?.fiscal_api_credentials as {
      api_key?: string;
      api_secret?: string;
      env?: string;
    } | null;

    const apiKey = partnerCreds?.api_key || Deno.env.get("FISKALY_API_KEY");
    const apiSecret = partnerCreds?.api_secret || Deno.env.get("FISKALY_API_SECRET");
    const fiskalyEnv = (partnerCreds?.env || Deno.env.get("FISKALY_ENV") || "test").toLowerCase();
    const baseUrl = fiskalyEnv === "live" ? "https://live.api.fiskaly.com" : "https://test.api.fiskaly.com";

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: "Fiskaly credentials missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate with Fiskaly
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
      log("Fiskaly auth failed", { status: tokenRes.status });
      return new Response(JSON.stringify({ error: "Fiskaly auth failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenRes.json();
    const bearer = tokenData?.content?.authentication?.bearer;
    if (!bearer) {
      return new Response(JSON.stringify({ error: "Fiskaly bearer missing" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the record to get compliance artifact (PDF)
    const recordRes = await fetch(`${baseUrl}/records/${fiskalyRecordId}?compliance-artifact`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${bearer}`,
        "X-Api-Version": API_VERSION,
      },
    });

    if (!recordRes.ok) {
      const errText = await recordRes.text();
      log("Fiskaly record fetch failed", { status: recordRes.status, err: errText.slice(0, 300) });
      return new Response(JSON.stringify({ error: "Could not fetch receipt from Fiskaly" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recordData = await recordRes.json();
    log("Record fetched successfully", {
      hasCompliance: !!recordData?.content?.compliance,
      complianceKeys: recordData?.content?.compliance ? Object.keys(recordData.content.compliance) : [],
      hasArtifact: !!recordData?.content?.compliance?.artifact,
      artifactType: typeof recordData?.content?.compliance?.artifact,
      contentKeys: recordData?.content ? Object.keys(recordData.content) : [],
    });

    // Check for compliance artifact (PDF) - available at compliance.artifact.data
    const artifactData = recordData?.content?.compliance?.artifact?.data;

    if (artifactData) {
      log("Compliance artifact found, returning PDF");
      return new Response(JSON.stringify({
        success: true,
        pdf_base64: artifactData,
        record_id: fiskalyRecordId,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: return the full record data for the client to render
    log("No compliance artifact, returning record data", {
      complianceKeys: recordData?.content?.compliance ? Object.keys(recordData.content.compliance) : [],
    });
    return new Response(JSON.stringify({
      success: true,
      record: recordData,
      record_id: fiskalyRecordId,
      message: "PDF not yet available from Fiskaly. Record data returned.",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
