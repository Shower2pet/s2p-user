import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import mqtt from "npm:mqtt@5.10.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STATION-CONTROL] ${step}${detailsStr}`);
};

function getMqttConfig() {
  const mqttHost = Deno.env.get("MQTT_HOST");
  const mqttUser = Deno.env.get("MQTT_USER");
  const mqttPassword = Deno.env.get("MQTT_PASSWORD");

  if (!mqttHost || !mqttUser || !mqttPassword) {
    throw new Error("MQTT configuration missing");
  }

  const brokerUrl = Deno.env.get("MQTT_WS_URL") || `wss://${mqttHost}:8884/mqtt`;
  return { brokerUrl, mqttUser, mqttPassword };
}

/**
 * Publishes an MQTT command with retain flag.
 * Creates a fresh connection each invocation for serverless safety.
 * Rejects if broker doesn't respond within 5 seconds.
 */
function publishMqttRetain(
  stationId: string,
  payload: string,
): Promise<boolean> {
  const { brokerUrl, mqttUser, mqttPassword } = getMqttConfig();
  const topic = `shower2pet/${stationId}/relay1/command`;

  logStep("MQTT publish", { brokerUrl, topic, payload, retain: true });

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      logStep("MQTT timeout (5s)");
      try { client.end(true); } catch (_) { /* ignore */ }
      resolve(false);
    }, 5000);

    const client = mqtt.connect(brokerUrl, {
      username: mqttUser,
      password: mqttPassword,
      clientId: `s2p-edge-${Date.now()}`,
      connectTimeout: 4000,
      protocolVersion: 4,
      clean: true,
    });

    client.on('connect', () => {
      logStep("MQTT connected, publishing");
      client.publish(topic, payload, { qos: 1, retain: true }, (err) => {
        clearTimeout(timeout);
        if (err) {
          logStep("Publish error", { error: String(err) });
          client.end(true);
          resolve(false);
        } else {
          logStep("Published OK", { topic, payload });
          client.end(true);
          resolve(true);
        }
      });
    });

    client.on('error', (err) => {
      logStep("MQTT error", { error: String(err) });
      clearTimeout(timeout);
      client.end(true);
      resolve(false);
    });
  });
}

/**
 * Background task: waits delayMs then sends OFF and marks session completed.
 */
async function scheduleOff(stationId: string, delayMs: number, sessionId?: string) {
  logStep("Background timer scheduled", { stationId, delayMs, sessionId });

  await new Promise((r) => setTimeout(r, delayMs));

  logStep("Timer expired, sending OFF", { stationId });
  const ok = await publishMqttRetain(stationId, "0");
  logStep("OFF command result", { success: ok });

  // Mark session as completed if we have a session ID
  if (sessionId) {
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.2");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      await supabase
        .from('wash_sessions')
        .update({ status: 'COMPLETED', step: 'rating' })
        .eq('id', sessionId)
        .eq('status', 'ACTIVE');
      logStep("Session marked completed", { sessionId });
    } catch (e) {
      logStep("Error updating session", { error: String(e) });
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const { station_id, command, duration_minutes, session_id } = await req.json();

    if (!station_id || !command) {
      throw new Error("station_id and command are required");
    }

    logStep("Request", { station_id, command, duration_minutes, session_id });

    // ── START_TIMED_WASH: ON + background OFF timer ──
    if (command === 'START_TIMED_WASH') {
      if (!duration_minutes || duration_minutes <= 0) {
        throw new Error("duration_minutes is required for START_TIMED_WASH");
      }

      // Send ON with retain
      const onOk = await publishMqttRetain(station_id, "1");
      if (!onOk) {
        return new Response(JSON.stringify({
          success: false,
          error: "Station did not respond — MQTT broker unreachable",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 503,
        });
      }

      // Schedule background OFF after duration
      const delayMs = duration_minutes * 60 * 1000;
      // Use EdgeRuntime.waitUntil if available, otherwise fire-and-forget
      const offPromise = scheduleOff(station_id, delayMs, session_id);
      try {
        // @ts-ignore — Deno Deploy / Supabase Edge Runtime
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(offPromise);
        }
      } catch (_) {
        // fire-and-forget fallback — the promise runs in background
      }

      logStep("START_TIMED_WASH success, OFF scheduled", { delayMs });
      return new Response(JSON.stringify({
        success: true,
        message: "Lavaggio avviato",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── MANUAL ON ──
    if (command === 'ON') {
      const ok = await publishMqttRetain(station_id, "1");
      return new Response(JSON.stringify({ success: ok }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: ok ? 200 : 503,
      });
    }

    // ── MANUAL OFF ──
    if (command === 'OFF') {
      const ok = await publishMqttRetain(station_id, "0");
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
