import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import mqtt from "npm:mqtt@5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (msg: string, details?: unknown) => {
  console.log(`[CHECK-EXPIRED] ${msg}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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
  const clientId = `s2p-cron-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  log("MQTT connecting", { brokerUrl, clientId });

  const client = mqtt.connect(brokerUrl, {
    clientId,
    username: Deno.env.get("MQTT_USER") || "",
    password: Deno.env.get("MQTT_PASSWORD") || "",
    clean: true,
    connectTimeout: 5000,
    protocolVersion: 4,
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.end(true);
      reject(new Error("MQTT connect timeout"));
    }, 8000);
    client.on('connect', () => { clearTimeout(timeout); log("MQTT connected"); resolve(client); });
    client.on('error', (err: Error) => { clearTimeout(timeout); reject(err); });
  });
}

async function publishMqttOff(stationId: string): Promise<boolean> {
  const topic = `shower2pet/${stationId}/relay1/command`;
  log("MQTT OFF publish", { topic, stationId });

  try {
    const client = await connectMqtt();
    await client.publishAsync(topic, "0", { qos: 1, retain: true });
    log("MQTT published OFF OK", { stationId });
    client.end();
    return true;
  } catch (e) {
    log("MQTT error", { error: String(e) });
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
