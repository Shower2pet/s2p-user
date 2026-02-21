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
    let selfTestReceived = false;
    let messageCount = 0;
    const decoder = new TextDecoder();

    // Register handler using .on() — this library uses CustomEvent internally
    client.on('publish', (event: any) => {
      messageCount++;
      try {
        // Try both event.detail (CustomEvent) and direct access
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

        logStep("MSG", { topic, payload, msgNum: messageCount, eventKeys: Object.keys(event || {}), detailKeys: event?.detail ? Object.keys(event.detail) : 'none' });

        if (topic === 'shower2pet/_selftest/status') {
          selfTestReceived = true;
          return;
        }

        const parts = topic.split('/');
        if (parts.length === 3 && parts[0] === 'shower2pet' && parts[2] === 'status') {
          const stationId = parts[1];
          if (payload.toLowerCase() !== 'offline') {
            aliveStations.add(stationId);
            logStep("ALIVE", { stationId, payload });
          }
        }
      } catch (e) {
        logStep("Parse error", { error: String(e), eventType: typeof event });
      }
    });

    logStep("Handler registered, available events: " + (typeof client.on));

    await client.connect();
    logStep("Connected");

    await client.subscribe('shower2pet/+/status', Mqtt.QoS.AT_MOST_ONCE);
    logStep("Subscribed");

    // Self-test
    const encoder = new TextEncoder();
    await client.publish('shower2pet/_selftest/status', encoder.encode('ping'), {
      qos: Mqtt.QoS.AT_MOST_ONCE,
    });
    logStep("Self-test published");

    // Wait for messages
    await new Promise(resolve => setTimeout(resolve, 10000));

    logStep("Wait done", { selfTestReceived, messageCount, aliveCount: aliveStations.size, alive: [...aliveStations] });

    try { await client.disconnect(); } catch (_) { /* ignore */ }

    // Update DB
    let updatedCount = 0;
    for (const stationId of aliveStations) {
      const { error } = await supabaseAdmin.rpc('handle_station_heartbeat', { p_station_id: stationId });
      if (!error) updatedCount++;
      else logStep("DB error", { stationId, error: error.message });
    }

    const { error: offlineError } = await supabaseAdmin.rpc('auto_offline_expired_heartbeats');
    if (offlineError) logStep("Auto-offline error", { error: offlineError.message });

    return new Response(JSON.stringify({
      success: true,
      self_test_ok: selfTestReceived,
      messages_received: messageCount,
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
