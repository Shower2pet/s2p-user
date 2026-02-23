import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (msg: string, details?: unknown) => {
  console.log(`[EMQX-WEBHOOK] ${msg}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

/**
 * Extract station_id from EMQX clientid.
 * clientid === station_id (confirmed by user).
 */
function extractStationId(clientid: string): string | null {
  if (!clientid || clientid.startsWith('s2p-')) return null; // ignore our own edge function clients
  return clientid;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth: verify Bearer token ──
    const authHeader = req.headers.get("authorization") || "";
    const expectedSecret = Deno.env.get("EMQX_WEBHOOK_SECRET");
    if (!expectedSecret) {
      log("ERROR: EMQX_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token !== expectedSecret) {
      log("Unauthorized request");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const body = await req.json();
    log("Event received", { event: body.event, clientid: body.clientid, topic: body.topic });

    const supabase = getSupabaseAdmin();
    const event = body.event;

    // ── client.connected ──
    if (event === "client.connected") {
      const stationId = extractStationId(body.clientid);
      if (!stationId) {
        log("Ignoring non-station client", { clientid: body.clientid });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("Station connected", { stationId });
      const { error } = await supabase.rpc('handle_station_heartbeat', { p_station_id: stationId });
      if (error) log("DB heartbeat error", { stationId, error: error.message });

      return new Response(JSON.stringify({ ok: true, action: "heartbeat", station_id: stationId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── client.disconnected ──
    if (event === "client.disconnected") {
      const stationId = extractStationId(body.clientid);
      if (!stationId) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("Station disconnected", { stationId, reason: body.reason });
      const { error } = await supabase.rpc('mark_station_offline', { p_station_id: stationId });
      if (error) log("DB offline error", { stationId, error: error.message });

      return new Response(JSON.stringify({ ok: true, action: "offline", station_id: stationId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── message.publish (optional: heartbeat via status topic) ──
    if (event === "message.publish") {
      const topic = body.topic || "";
      const parts = topic.split('/');

      // Match shower2pet/{stationId}/status
      if (parts.length === 3 && parts[0] === 'shower2pet' && parts[2] === 'status') {
        const stationId = parts[1];
        const payload = body.payload || "";

        if (payload.toLowerCase() === 'offline') {
          log("LWT offline via publish", { stationId });
          const { error } = await supabase.rpc('mark_station_offline', { p_station_id: stationId });
          if (error) log("DB offline error", { stationId, error: error.message });
        } else {
          log("Heartbeat via publish", { stationId });
          const { error } = await supabase.rpc('handle_station_heartbeat', { p_station_id: stationId });
          if (error) log("DB heartbeat error", { stationId, error: error.message });
        }

        return new Response(JSON.stringify({ ok: true, action: "status_publish", station_id: stationId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ignore other message topics
      return new Response(JSON.stringify({ ok: true, action: "ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Unknown event", { event });
    return new Response(JSON.stringify({ ok: true, action: "unknown_event" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
