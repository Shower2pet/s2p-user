import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-HEARTBEAT] ${step}${detailsStr}`);
};

function getMqttConfig() {
  let mqttHost = Deno.env.get("MQTT_HOST") || "";
  const mqttUser = Deno.env.get("MQTT_USER") || "";
  const mqttPassword = Deno.env.get("MQTT_PASSWORD") || "";

  if (!mqttHost || !mqttUser || !mqttPassword) {
    throw new Error("MQTT configuration missing");
  }

  mqttHost = mqttHost.replace(/^wss?:\/\//, "").replace(/^mqtts?:\/\//, "").replace(/\/.*$/, "").replace(/:.*$/, "");
  const brokerUrl = `wss://${mqttHost}:8884/mqtt`;
  return { brokerUrl, mqttUser, mqttPassword };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("START");

    // Dynamic import to avoid silent crash on module load failure
    let Mqtt: any;
    let WebSocketMqttClient: any;
    try {
      const mqttModule = await import("jsr:@ymjacky/mqtt5");
      Mqtt = mqttModule.Mqtt;
      WebSocketMqttClient = mqttModule.WebSocketMqttClient;
      logStep("MQTT module loaded");
    } catch (importErr) {
      logStep("MQTT module import FAILED", { error: String(importErr) });
      return new Response(JSON.stringify({
        success: false,
        error: "MQTT module import failed: " + String(importErr),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { brokerUrl, mqttUser, mqttPassword } = getMqttConfig();
    const clientId = `s2p-hb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    logStep("Connecting", { brokerUrl, clientId });

    const client = new WebSocketMqttClient({
      url: new URL(brokerUrl),
      clientId,
      username: mqttUser,
      password: mqttPassword,
      clean: true,
      keepAlive: 30,
      connectTimeoutMs: 8000,
      protocolVersion: Mqtt.ProtocolVersion.MQTT_V3_1_1,
    });

    const aliveStations = new Set<string>();
    const offlineStations = new Set<string>();
    const decoder = new TextDecoder();
    let totalEventsReceived = 0;
    let selfTestReceived = false;

    const handleMessage = (event: any) => {
      try {
        totalEventsReceived++;
        const packet = event?.detail ?? event;
        const topic = packet?.topic?.toString?.() ?? packet?.topic ?? '';
        let payload = '';
        if (packet?.payload) {
          try {
            payload = typeof packet.payload === 'string'
              ? packet.payload
              : decoder.decode(packet.payload);
          } catch { payload = String(packet.payload); }
        }

        logStep("MSG", { topic, payload: payload.substring(0, 50) });

        const parts = topic.split('/');
        if (parts.length === 3 && parts[0] === 'shower2pet' && parts[2] === 'status') {
          const stationId = parts[1];
          if (stationId === '_selftest') {
            selfTestReceived = true;
            return;
          }

          if (payload.toLowerCase() === 'offline') {
            offlineStations.add(stationId);
            aliveStations.delete(stationId);
            logStep("LWT offline", { stationId });
          } else {
            aliveStations.add(stationId);
            offlineStations.delete(stationId);
            logStep("ALIVE", { stationId, payload });
          }
        }
      } catch (e) {
        logStep("Parse error", { error: String(e) });
      }
    };

    client.on('publish', handleMessage);

    try {
      await client.connect();
      logStep("Connected");
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

    await client.subscribe('shower2pet/+/status', Mqtt.QoS.AT_MOST_ONCE);
    logStep("Subscribed");

    // Self-test
    try {
      await client.publish(
        'shower2pet/_selftest/status',
        new TextEncoder().encode('ping'),
        { qos: Mqtt.QoS.AT_MOST_ONCE },
      );
      logStep("Self-test published");
    } catch (e) {
      logStep("Self-test publish error", { error: String(e) });
    }

    // Wait 40 seconds to capture heartbeats
    await new Promise(resolve => setTimeout(resolve, 40000));

    logStep("Wait done", {
      totalEventsReceived,
      selfTestReceived,
      aliveCount: aliveStations.size,
      offlineCount: offlineStations.size,
      alive: [...aliveStations],
      offline: [...offlineStations],
    });

    try { await client.disconnect(); } catch (_) { /* ignore */ }

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
