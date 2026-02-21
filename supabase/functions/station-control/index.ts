import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Mqtt, WebSocketMqttClient } from "jsr:@ymjacky/mqtt5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STATION-CONTROL] ${step}${detailsStr}`);
};

/* ── MQTT helper using @ymjacky/mqtt5 library ─────────────── */

function getMqttConfig() {
  let mqttHost = Deno.env.get("MQTT_HOST") || "";
  const mqttUser = Deno.env.get("MQTT_USER") || "";
  const mqttPassword = Deno.env.get("MQTT_PASSWORD") || "";

  if (!mqttHost || !mqttUser || !mqttPassword) {
    throw new Error("MQTT configuration missing");
  }

  // Normalize host: strip protocol/port/path
  mqttHost = mqttHost.replace(/^wss?:\/\//, "").replace(/^mqtts?:\/\//, "").replace(/\/.*$/, "").replace(/:.*$/, "");
  const brokerUrl = `wss://${mqttHost}:8884/mqtt`;
  logStep("MQTT config", { brokerUrl, host: mqttHost });
  return { brokerUrl, mqttUser, mqttPassword };
}

async function publishMqtt(stationId: string, payload: string): Promise<boolean> {
  const { brokerUrl, mqttUser, mqttPassword } = getMqttConfig();
  const topic = `shower2pet/${stationId}/relay1/command`;
  const clientId = `s2p-edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  logStep("MQTT publish start", { brokerUrl, topic, payload, retain: true, clientId });

  const client = new WebSocketMqttClient({
    url: new URL(brokerUrl),
    clientId,
    username: mqttUser,
    password: mqttPassword,
    clean: true,
    keepAlive: 30,
    connectTimeoutMs: 6000,
    protocolVersion: Mqtt.ProtocolVersion.MQTT_V3_1_1,
  });

  try {
    await client.connect();
    logStep("MQTT connected");

    const encoder = new TextEncoder();
    await client.publish(topic, encoder.encode(payload), {
      qos: Mqtt.QoS.AT_LEAST_ONCE,
      retain: true,
    });
    logStep("MQTT published OK", { topic, payload });

    await client.disconnect();
    logStep("MQTT disconnected");
    return true;
  } catch (e) {
    logStep("MQTT error", { error: String(e) });
    try { await client.disconnect(); } catch (_) { /* ignore */ }
    return false;
  }
}

/* ── Supabase admin helper ────────────────────────────────── */

async function getSupabaseAdmin() {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.2");
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

/* ── Main handler ─────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { station_id, command, duration_minutes, session_id } = await req.json();

    if (!station_id || !command) {
      throw new Error("station_id and command are required");
    }

    logStep("Request", { station_id, command, duration_minutes, session_id });

    // ── START_TIMED_WASH ──
    if (command === 'START_TIMED_WASH') {
      if (!duration_minutes || duration_minutes <= 0) {
        throw new Error("duration_minutes is required for START_TIMED_WASH");
      }

      const onOk = await publishMqtt(station_id, "1");
      if (!onOk) {
        return new Response(JSON.stringify({
          success: false,
          error: "Station did not respond — MQTT broker unreachable",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 503,
        });
      }

      const startedAt = new Date().toISOString();
      const endsAt = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();

      let sessionUpdated = false;
      if (session_id) {
        try {
          const supabaseAdmin = await getSupabaseAdmin();

          const { data: stationRow } = await supabaseAdmin
            .from('stations')
            .select('type')
            .eq('id', station_id)
            .maybeSingle();

          const isShower = stationRow?.type?.toUpperCase() === 'BRACCO';
          const sessionStep = isShower ? 'timer' : 'rules';

          const { error: updateError } = await supabaseAdmin
            .from('wash_sessions')
            .update({ started_at: startedAt, ends_at: endsAt, step: sessionStep })
            .eq('id', session_id);

          if (updateError) {
            logStep("Session timing update failed", { error: String(updateError) });
          } else {
            sessionUpdated = true;
            logStep("Session timing updated", { session_id, startedAt, endsAt, step: sessionStep });
          }
        } catch (e) {
          logStep("Session timing update exception", { error: String(e) });
        }
      }

      logStep("START_TIMED_WASH success", { duration_minutes, sessionUpdated });
      return new Response(JSON.stringify({
        success: true,
        message: "Lavaggio avviato",
        started_at: startedAt,
        ends_at: endsAt,
        session_updated: sessionUpdated,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── MANUAL ON ──
    if (command === 'ON') {
      const ok = await publishMqtt(station_id, "1");
      return new Response(JSON.stringify({ success: ok }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: ok ? 200 : 503,
      });
    }

    // ── MANUAL OFF ──
    if (command === 'OFF') {
      const ok = await publishMqtt(station_id, "0");
      return new Response(JSON.stringify({ success: ok }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: ok ? 200 : 503,
      });
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
