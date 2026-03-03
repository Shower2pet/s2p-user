import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, stripe_session_id, step, status, started_at, ends_at } = await req.json();

    // Must provide either session_id or stripe_session_id for identification
    if (!session_id && !stripe_session_id) {
      return new Response(JSON.stringify({ error: "session_id or stripe_session_id required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const updates: Record<string, string> = {};
    if (step) updates.step = step;
    if (status) updates.status = status;
    if (started_at) updates.started_at = started_at;
    if (ends_at) updates.ends_at = ends_at;

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: "No fields to update" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let query = supabase.from("wash_sessions").update(updates);
    if (session_id) {
      query = query.eq("id", session_id);
    } else {
      query = query.eq("stripe_session_id", stripe_session_id);
    }

    // Only allow updates on sessions without a user_id (guest sessions)
    query = query.is("user_id", null);

    const { error } = await query;
    if (error) {
      console.error("[UPDATE-GUEST-SESSION] DB error:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
