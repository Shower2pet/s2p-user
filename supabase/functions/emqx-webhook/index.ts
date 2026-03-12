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
 * Extract board_id from EMQX clientid.
 * Boards connect with their board_id (e.g. ETH_1, WIFI_2).
 * Ignore our own edge function clients (prefix 's2p-').
 */
function extractBoardId(clientid: string): string | null {
  if (!clientid || clientid.startsWith('s2p-')) return null;
  return clientid;
}

/**
 * Resolve board_id → station_id via boards table.
 * Falls back to treating boardId as station_id for backward compat.
 */
async function resolveStationId(supabase: ReturnType<typeof getSupabaseAdmin>, boardId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("boards")
      .select("station_id")
      .eq("id", boardId)
      .maybeSingle();
    if (data?.station_id) {
      return data.station_id;
    }
  } catch { /* fallback */ }
  return boardId;
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
      const boardId = extractBoardId(body.clientid);
      if (!boardId) {
        log("Ignoring non-station client", { clientid: body.clientid });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("Board connected", { boardId });
      // Try handle_board_heartbeat first (resolves board→station internally)
      const { error } = await supabase.rpc('handle_board_heartbeat', { p_board_id: boardId });
      if (error) {
        // Fallback: treat as station_id directly
        log("Board heartbeat failed, trying station fallback", { boardId, error: error.message });
        await supabase.rpc('handle_station_heartbeat', { p_station_id: boardId });
      }

      return new Response(JSON.stringify({ ok: true, action: "heartbeat", board_id: boardId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── client.disconnected ──
    if (event === "client.disconnected") {
      const boardId = extractBoardId(body.clientid);
      if (!boardId) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("Board disconnected", { boardId, reason: body.reason });
      const stationId = await resolveStationId(supabase, boardId);
      const { error } = await supabase.rpc('mark_station_offline', { p_station_id: stationId });
      if (error) log("DB offline error", { boardId, stationId, error: error.message });

      return new Response(JSON.stringify({ ok: true, action: "offline", board_id: boardId, station_id: stationId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── message.publish (heartbeat via status topic — keeps last_heartbeat_at fresh) ──
    if (event === "message.publish") {
      const topic = body.topic || "";
      const parts = topic.split('/');

      // Match shower2pet/{boardId}/status
      if (parts.length === 3 && parts[0] === 'shower2pet' && parts[2] === 'status') {
        const boardId = parts[1];
        const payload = body.payload || "";

        if (payload.toLowerCase() === 'offline') {
          log("LWT offline via publish", { boardId });
          const stationId = await resolveStationId(supabase, boardId);
          const { error } = await supabase.rpc('mark_station_offline', { p_station_id: stationId });
          if (error) log("DB offline error", { boardId, stationId, error: error.message });
        } else {
          // Use handle_board_heartbeat which resolves board→station internally
          const { error } = await supabase.rpc('handle_board_heartbeat', { p_board_id: boardId });
          if (error) {
            log("Board heartbeat failed, trying station fallback", { boardId, error: error.message });
            await supabase.rpc('handle_station_heartbeat', { p_station_id: boardId });
          }
        }

        return new Response(JSON.stringify({ ok: true, action: "status_publish", board_id: boardId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
