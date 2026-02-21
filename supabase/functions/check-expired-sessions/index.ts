import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Mqtt, WebSocketMqttClient } from "jsr:@ymjacky/mqtt5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (msg: string, details?: unknown) => {
  console.log(`[CHECK-EXPIRED] ${msg}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

/* ── MQTT helper using @ymjacky/mqtt5 library ─────────────── */

async function publishMqttOff(stationId: string): Promise<boolean> {
  let mqttHost = Deno.env.get("MQTT_HOST") || "";
  const mqttUser = Deno.env.get("MQTT_USER") || "";
  const mqttPassword = Deno.env.get("MQTT_PASSWORD") || "";

  if (!mqttHost || !mqttUser || !mqttPassword) {
    log("MQTT config missing");
    return false;
  }

  mqttHost = mqttHost.replace(/^wss?:\/\//, "").replace(/^mqtts?:\/\//, "").replace(/\/.*$/, "").replace(/:.*$/, "");
  const brokerUrl = `wss://${mqttHost}:8884/mqtt`;
  const topic = `shower2pet/${stationId}/relay1/command`;
  const clientId = `s2p-cron-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  log("MQTT OFF publish", { brokerUrl, topic, stationId, clientId });

  const client = new WebSocketMqttClient({
    url: new URL(brokerUrl),
    clientId,
    username: mqttUser,
    password: mqttPassword,
    clean: true,
    keepAlive: 30,
    connectTimeoutMs: 5000,
    protocolVersion: Mqtt.ProtocolVersion.MQTT_V3_1_1,
  });

  try {
    await client.connect();
    log("MQTT connected");

    const encoder = new TextEncoder();
    await client.publish(topic, encoder.encode("0"), {
      qos: Mqtt.QoS.AT_LEAST_ONCE,
      retain: true,
    });
    log("MQTT published OFF OK", { stationId });

    await client.disconnect();
    return true;
  } catch (e) {
    log("MQTT error", { error: String(e) });
    try { await client.disconnect(); } catch (_) { /* ignore */ }
    return false;
  }
}

/* ── Main handler ─────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: expired, error } = await supabase
      .from('wash_sessions')
      .select('id, station_id, ends_at')
      .eq('status', 'ACTIVE')
      .lt('ends_at', new Date().toISOString());

    if (error) throw error;

    if (!expired || expired.length === 0) {
      log("No expired sessions");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Found expired sessions", { count: expired.length });

    let processed = 0;
    for (const session of expired) {
      log("Processing", { id: session.id, station: session.station_id });

      const { data: newerActive } = await supabase
        .from('wash_sessions')
        .select('id')
        .eq('station_id', session.station_id)
        .eq('status', 'ACTIVE')
        .gt('ends_at', new Date().toISOString())
        .neq('id', session.id)
        .limit(1);

      if (newerActive && newerActive.length > 0) {
        log("Skipping OFF — newer active session exists", { station: session.station_id });
      } else {
        const ok = await publishMqttOff(session.station_id);
        log("OFF result", { station: session.station_id, success: ok });
      }

      await supabase
        .from('wash_sessions')
        .update({ status: 'COMPLETED', step: 'rating' })
        .eq('id', session.id)
        .eq('status', 'ACTIVE');

      processed++;
    }

    log("Done", { processed });
    return new Response(JSON.stringify({ processed }), {
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
