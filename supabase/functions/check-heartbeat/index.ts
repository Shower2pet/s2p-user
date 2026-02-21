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

    logStep("Connecting to MQTT", { brokerUrl, clientId });

    const client = new WebSocketMqttClient({
      url: new URL(brokerUrl),
      clientId,
      username: mqttUser,
      password: mqttPassword,
      clean: true,
      keepAlive: 15,
      connectTimeoutMs: 8000,
      protocolVersion: Mqtt.ProtocolVersion.MQTT_V3_1_1,
    });

    // Track which stations sent a heartbeat
    const aliveStations = new Set<string>();

    // Set up message handler BEFORE connecting
    client.on('publish', (event: any) => {
      try {
        const topic = event?.topic?.toString() || '';
        // Topic format: shower2pet/{stationId}/status
        const parts = topic.split('/');
        if (parts.length === 3 && parts[0] === 'shower2pet' && parts[2] === 'status') {
          const stationId = parts[1];
          const payload = new TextDecoder().decode(event.payload || new Uint8Array());
          logStep("Heartbeat received", { stationId, payload });
          
          // Any message on the status topic = device is alive
          // LWT message "offline" means the device disconnected unexpectedly
          if (payload.toLowerCase() !== 'offline') {
            aliveStations.add(stationId);
          }
        }
      } catch (e) {
        logStep("Message parse error", { error: String(e) });
      }
    });

    await client.connect();
    logStep("MQTT connected");

    // Subscribe to all station status topics (wildcard)
    await client.subscribe('shower2pet/+/status', Mqtt.QoS.AT_MOST_ONCE);
    logStep("Subscribed to shower2pet/+/status");

    // Wait to collect retained and live heartbeat messages
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Disconnect from MQTT
    try { await client.disconnect(); } catch (_) { /* ignore */ }
    logStep("MQTT disconnected", { aliveStations: [...aliveStations] });

    // Update last_heartbeat_at for alive stations
    let updatedCount = 0;
    for (const stationId of aliveStations) {
      const { error } = await supabaseAdmin.rpc('handle_station_heartbeat', { p_station_id: stationId });
      if (error) {
        logStep("Heartbeat update error", { stationId, error: error.message });
      } else {
        updatedCount++;
      }
    }

    // Auto-offline stations with expired heartbeat
    const { error: offlineError } = await supabaseAdmin.rpc('auto_offline_expired_heartbeats');
    if (offlineError) {
      logStep("Auto-offline error", { error: offlineError.message });
    }

    logStep("Done", { aliveStations: aliveStations.size, updated: updatedCount });

    return new Response(JSON.stringify({
      success: true,
      alive_stations: [...aliveStations],
      updated: updatedCount,
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
