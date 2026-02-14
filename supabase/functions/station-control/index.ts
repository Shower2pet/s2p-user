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

/**
 * Publishes an MQTT message to control a physical station via HiveMQ Cloud.
 * Uses npm:mqtt with mqtts:// (TLS on port 8883).
 */
async function publishMqttCommand(
  stationId: string,
  command: string,
  durationMinutes: number,
): Promise<boolean> {
  const mqttHost = Deno.env.get("MQTT_HOST");
  const mqttUser = Deno.env.get("MQTT_USER");
  const mqttPassword = Deno.env.get("MQTT_PASSWORD");

  if (!mqttHost || !mqttUser || !mqttPassword) {
    logStep("MQTT credentials missing", { host: !!mqttHost, user: !!mqttUser, pass: !!mqttPassword });
    throw new Error("MQTT configuration missing");
  }

  const durationSeconds = durationMinutes * 60;
  const topic = `shower2pet/${stationId}/relay1/pulse`;
  // The device expects a plain number (seconds) on the pulse topic
  const payload = String(durationSeconds);

  // Use WSS (WebSocket Secure) - port 8884 for HiveMQ Cloud
  // Edge functions block raw TLS on 8883, but WSS over HTTPS (8884) works
  const brokerUrl = Deno.env.get("MQTT_WS_URL") || `wss://${mqttHost}:8884/mqtt`;
  logStep("Connecting to MQTT broker", { brokerUrl, topic });

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      logStep("MQTT connection timeout (15s)");
      try { client.end(true); } catch (_) { /* ignore */ }
      resolve(false);
    }, 15000);

    const client = mqtt.connect(brokerUrl, {
      username: mqttUser,
      password: mqttPassword,
      clientId: `s2p-edge-${Date.now()}`,
      connectTimeout: 10000,
      protocolVersion: 4,
    });

    client.on('connect', () => {
      logStep("Connected to MQTT broker, publishing command");
      client.publish(topic, payload, { qos: 1 }, (err) => {
        clearTimeout(timeout);
        if (err) {
          logStep("Publish error", { error: String(err) });
          client.end(true);
          resolve(false);
        } else {
          logStep("Command published successfully", { topic, command });
          client.end(true);
          resolve(true);
        }
      });
    });

    client.on('error', (err) => {
      logStep("MQTT client error", { error: String(err) });
      clearTimeout(timeout);
      client.end(true);
      resolve(false);
    });

    client.on('offline', () => {
      logStep("MQTT client went offline");
    });
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const { station_id, command, duration_minutes } = await req.json();

    if (!station_id || !command) {
      throw new Error("station_id and command are required");
    }

    logStep("Request", { station_id, command, duration_minutes });

    const durationMin = duration_minutes || 5;
    const success = await publishMqttCommand(station_id, command, durationMin);

    if (!success) {
      logStep("Hardware command failed");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Station did not respond" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 503,
      });
    }

    logStep("Hardware command succeeded");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
