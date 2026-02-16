import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import mqtt from "npm:mqtt@5.10.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (msg: string, details?: any) => {
  console.log(`[CHECK-EXPIRED] ${msg}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function publishMqttOff(stationId: string): Promise<boolean> {
  let mqttHost = Deno.env.get("MQTT_HOST") || "";
  const mqttUser = Deno.env.get("MQTT_USER");
  const mqttPassword = Deno.env.get("MQTT_PASSWORD");
  if (!mqttHost || !mqttUser || !mqttPassword) return Promise.resolve(false);

  // Normalize: strip any protocol prefix
  mqttHost = mqttHost.replace(/^wss?:\/\//, "").replace(/\/.*$/, "").replace(/:.*$/, "");

  const brokerUrl = Deno.env.get("MQTT_WS_URL") || `wss://${mqttHost}:8884/mqtt`;
  const topic = `shower2pet/${stationId}/relay1/command`;

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      try { client.end(true); } catch (_) {}
      resolve(false);
    }, 5000);

    const client = mqtt.connect(brokerUrl, {
      username: mqttUser,
      password: mqttPassword,
      clientId: `s2p-cron-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      connectTimeout: 4000,
      protocolVersion: 4,
      clean: true,
    });

    client.on('connect', () => {
      client.publish(topic, "0", { qos: 1, retain: true }, (err) => {
        clearTimeout(timeout);
        log(err ? "MQTT publish error" : "OFF sent", { stationId });
        client.end(true);
        resolve(!err);
      });
    });

    client.on('error', () => {
      clearTimeout(timeout);
      client.end(true);
      resolve(false);
    });
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Find active sessions whose ends_at has passed
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

      // Check if there's a NEWER active session on the same station
      // If so, don't send OFF — just mark this old session as completed
      const { data: newerActive } = await supabase
        .from('wash_sessions')
        .select('id')
        .eq('station_id', session.station_id)
        .eq('status', 'ACTIVE')
        .gt('ends_at', new Date().toISOString())
        .neq('id', session.id)
        .limit(1);

      if (newerActive && newerActive.length > 0) {
        log("Skipping OFF — newer active session exists", { station: session.station_id, newer: newerActive[0].id });
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
