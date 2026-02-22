import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import mqtt from "npm:mqtt@5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STATION-CONTROL] ${step}${detailsStr}`);
};

/* ── MQTT helper using mqtt.js ─────────────────────────────── */

function getMqttHost(): string {
  let mqttHost = Deno.env.get("MQTT_HOST") || "";
  if (!mqttHost) throw new Error("MQTT_HOST missing");
  mqttHost = mqttHost.replace(/^wss?:\/\//, "").replace(/^mqtts?:\/\//, "").replace(/\/.*$/, "").replace(/:.*$/, "");
  return mqttHost;
}

function connectMqtt(): Promise<mqtt.MqttClient> {
  const host = getMqttHost();
  const brokerUrl = `wss://${host}:8884/mqtt`;
  const clientId = `s2p-edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  logStep("MQTT connecting", { brokerUrl, clientId });

  const client = mqtt.connect(brokerUrl, {
    clientId,
    username: Deno.env.get("MQTT_USER") || "",
    password: Deno.env.get("MQTT_PASSWORD") || "",
    clean: true,
    connectTimeout: 6000,
    protocolVersion: 4,
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.end(true);
      reject(new Error("MQTT connect timeout"));
    }, 8000);
    client.on('connect', () => { clearTimeout(timeout); logStep("MQTT connected"); resolve(client); });
    client.on('error', (err: Error) => { clearTimeout(timeout); reject(err); });
  });
}

async function publishMqtt(stationId: string, payload: string): Promise<boolean> {
  const topic = `shower2pet/${stationId}/relay1/command`;
  logStep("MQTT publish start", { topic, payload, retain: true });

  try {
    const client = await connectMqtt();
    await client.publishAsync(topic, payload, { qos: 1, retain: true });
    logStep("MQTT published OK", { topic, payload });
    client.end();
    return true;
  } catch (e) {
    logStep("MQTT error", { error: String(e) });
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
