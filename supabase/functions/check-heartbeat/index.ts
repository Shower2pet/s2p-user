import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Mqtt, WebSocketMqttClient } from "jsr:@ymjacky/mqtt5";

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

    client.on('publish', (event: any) => {
      try {
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

        // Topic format: shower2pet/{stationId}/status
        const parts = topic.split('/');
        if (parts.length === 3 && parts[0] === 'shower2pet' && parts[2] === 'status') {
          const stationId = parts[1];
          if (stationId === '_selftest') return;

          if (payload.toLowerCase() === 'offline') {
            offlineStations.add(stationId);
            aliveStations.delete(stationId); // LWT overrides any prior alive
            logStep("LWT offline", { stationId });
          } else {
            aliveStations.add(stationId);
            offlineStations.delete(stationId); // alive overrides prior LWT
            logStep("ALIVE", { stationId, payload });
          }
        }
      } catch (e) {
        logStep("Parse error", { error: String(e) });
      }
    });

    await client.connect();
    logStep("Connected");

    await client.subscribe('shower2pet/+/status', Mqtt.QoS.AT_MOST_ONCE);
    logStep("Subscribed");

    // Wait 50 seconds to reliably capture at least one heartbeat cycle
    // Device heartbeat interval is ~35s; 50s guarantees catching at least one
    await new Promise(resolve => setTimeout(resolve, 50000));

    logStep("Wait done", {
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

    // Auto-offline expired heartbeats (2 min threshold)
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
    logStep("ERROR", { error: String(err) });
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
