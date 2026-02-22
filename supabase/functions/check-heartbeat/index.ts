import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import mqtt from "npm:mqtt@5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-HEARTBEAT] ${step}${detailsStr}`);
};

function getMqttHost(): string {
  let mqttHost = Deno.env.get("MQTT_HOST") || "";
  if (!mqttHost) throw new Error("MQTT_HOST missing");
  mqttHost = mqttHost.replace(/^wss?:\/\//, "").replace(/^mqtts?:\/\//, "").replace(/\/.*$/, "").replace(/:.*$/, "");
  return mqttHost;
}

function connectMqtt(): Promise<mqtt.MqttClient> {
  const host = getMqttHost();
  const brokerUrl = `wss://${host}:8884/mqtt`;
  const clientId = `s2p-hb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  logStep("Connecting", { brokerUrl, clientId });

  const client = mqtt.connect(brokerUrl, {
    clientId,
    username: Deno.env.get("MQTT_USER") || "",
    password: Deno.env.get("MQTT_PASSWORD") || "",
    clean: true,
    connectTimeout: 8000,
    protocolVersion: 4,
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.end(true);
      reject(new Error("MQTT connect timeout"));
    }, 10000);
    client.on('connect', () => { clearTimeout(timeout); logStep("Connected"); resolve(client); });
    client.on('error', (err: Error) => { clearTimeout(timeout); reject(err); });
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("START");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const aliveStations = new Set<string>();
    const offlineStations = new Set<string>();
    let totalEventsReceived = 0;
    let selfTestReceived = false;

    let client: mqtt.MqttClient;
    try {
      client = await connectMqtt();
    } catch (connectErr) {
      logStep("MQTT connect FAILED", { error: String(connectErr) });
      return new Response(JSON.stringify({
        success: false,
        error: "MQTT connect failed: " + String(connectErr),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    client.on('message', (topic: string, message: Buffer) => {
      try {
        totalEventsReceived++;
        const payload = message.toString();

        logStep("MSG", { topic, payload: payload.substring(0, 80) });

        const parts = topic.split('/');
        if (parts.length < 2 || parts[0] !== 'shower2pet') return;
        
        const stationId = parts[1];
        if (stationId === '_selftest') {
          selfTestReceived = true;
          return;
        }

        // Match shower2pet/{stationId}/status (heartbeat topic)
        if (parts.length === 3 && parts[2] === 'status') {
          if (payload.toLowerCase() === 'offline') {
            offlineStations.add(stationId);
            aliveStations.delete(stationId);
            logStep("LWT offline", { stationId });
          } else {
            aliveStations.add(stationId);
            offlineStations.delete(stationId);
            logStep("ALIVE via status", { stationId, payload });
          }
        }
      } catch (e) {
        logStep("Parse error", { error: String(e) });
      }
    });

    // Subscribe to all station topics to maximize heartbeat detection
    await client.subscribeAsync('shower2pet/#', { qos: 0 });
    logStep("Subscribed to shower2pet/#");

    // Self-test
    try {
      await client.publishAsync('shower2pet/_selftest/status', 'ping', { qos: 0 });
      logStep("Self-test published");
    } catch (e) {
      logStep("Self-test publish error", { error: String(e) });
    }

    // Wait 50 seconds to maximize heartbeat capture window
    // (station publishes ~every 60s, so 50s window catches most heartbeats)
    await new Promise(resolve => setTimeout(resolve, 50000));

    logStep("Wait done", {
      totalEventsReceived,
      selfTestReceived,
      aliveCount: aliveStations.size,
      offlineCount: offlineStations.size,
      alive: [...aliveStations],
      offline: [...offlineStations],
    });

    try { client.end(); } catch (_) { /* ignore */ }

    // Update DB for alive stations
    let updatedCount = 0;
    for (const stationId of aliveStations) {
      const { error } = await supabaseAdmin.rpc('handle_station_heartbeat', { p_station_id: stationId });
      if (!error) updatedCount++;
      else logStep("DB error", { stationId, error: error.message });
    }

    // Mark offline stations via LWT
    let offlineCount = 0;
    for (const stationId of offlineStations) {
      const { error } = await supabaseAdmin.rpc('mark_station_offline', { p_station_id: stationId });
      if (!error) offlineCount++;
      else logStep("DB offline error", { stationId, error: error.message });
    }

    // Auto-offline expired heartbeats
    const { error: offlineError } = await supabaseAdmin.rpc('auto_offline_expired_heartbeats');
    if (offlineError) logStep("Auto-offline error", { error: offlineError.message });

    logStep("Done", { aliveCount: aliveStations.size, updated: updatedCount, markedOffline: offlineCount });

    return new Response(JSON.stringify({
      success: true,
      alive_stations: [...aliveStations],
      offline_stations: [...offlineStations],
      updated: updatedCount,
      marked_offline: offlineCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    logStep("ERROR", { error: String(err), stack: (err as Error)?.stack });
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
