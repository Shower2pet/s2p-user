import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (msg: string, details?: unknown) => {
  console.log(`[CHECK-EXPIRED] ${msg}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

/* ── Minimal MQTT v3.1.1 over native WebSocket (same as station-control) ── */

function encodeMqttString(str: string): Uint8Array {
  const encoded = new TextEncoder().encode(str);
  const buf = new Uint8Array(2 + encoded.length);
  buf[0] = (encoded.length >> 8) & 0xff;
  buf[1] = encoded.length & 0xff;
  buf.set(encoded, 2);
  return buf;
}

function encodeRemainingLength(len: number): Uint8Array {
  const bytes: number[] = [];
  do {
    let encodedByte = len % 128;
    len = Math.floor(len / 128);
    if (len > 0) encodedByte |= 0x80;
    bytes.push(encodedByte);
  } while (len > 0);
  return new Uint8Array(bytes);
}

function buildConnectPacket(clientId: string, username: string, password: string): Uint8Array {
  const protocolName = encodeMqttString("MQTT");
  const protocolLevel = 4;
  const connectFlags = 0xc2;
  const keepAlive = 60;
  const clientIdBytes = encodeMqttString(clientId);
  const usernameBytes = encodeMqttString(username);
  const passwordBytes = encodeMqttString(password);

  const remainingLength =
    protocolName.length + 1 + 1 + 2 +
    clientIdBytes.length + usernameBytes.length + passwordBytes.length;

  const rl = encodeRemainingLength(remainingLength);
  const packet = new Uint8Array(1 + rl.length + remainingLength);
  let offset = 0;

  packet[offset++] = 0x10;
  packet.set(rl, offset); offset += rl.length;
  packet.set(protocolName, offset); offset += protocolName.length;
  packet[offset++] = protocolLevel;
  packet[offset++] = connectFlags;
  packet[offset++] = (keepAlive >> 8) & 0xff;
  packet[offset++] = keepAlive & 0xff;
  packet.set(clientIdBytes, offset); offset += clientIdBytes.length;
  packet.set(usernameBytes, offset); offset += usernameBytes.length;
  packet.set(passwordBytes, offset);

  return packet;
}

function buildPublishPacket(topic: string, payload: string, retain: boolean): Uint8Array {
  const topicBytes = encodeMqttString(topic);
  const payloadBytes = new TextEncoder().encode(payload);
  const packetId = Math.floor(Math.random() * 65535) + 1;
  const remainingLength = topicBytes.length + 2 + payloadBytes.length;
  const rl = encodeRemainingLength(remainingLength);

  const firstByte = 0x30 | (retain ? 0x01 : 0x00) | 0x02;
  const packet = new Uint8Array(1 + rl.length + remainingLength);
  let offset = 0;

  packet[offset++] = firstByte;
  packet.set(rl, offset); offset += rl.length;
  packet.set(topicBytes, offset); offset += topicBytes.length;
  packet[offset++] = (packetId >> 8) & 0xff;
  packet[offset++] = packetId & 0xff;
  packet.set(payloadBytes, offset);

  return packet;
}

function buildDisconnectPacket(): Uint8Array {
  return new Uint8Array([0xe0, 0x00]);
}

function publishMqttOff(stationId: string): Promise<boolean> {
  let mqttHost = Deno.env.get("MQTT_HOST") || "";
  const mqttUser = Deno.env.get("MQTT_USER") || "";
  const mqttPassword = Deno.env.get("MQTT_PASSWORD") || "";

  if (!mqttHost || !mqttUser || !mqttPassword) {
    log("MQTT config missing");
    return Promise.resolve(false);
  }

  mqttHost = mqttHost.replace(/^wss?:\/\//, "").replace(/\/.*$/, "").replace(/:.*$/, "");
  const brokerUrl = Deno.env.get("MQTT_WS_URL") || `wss://${mqttHost}:8884/mqtt`;
  const topic = `shower2pet/${stationId}/relay1/command`;
  const clientId = `s2p-cron-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  log("MQTT OFF publish", { brokerUrl, topic, stationId });

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      log("MQTT timeout (6s)");
      try { ws.close(); } catch (_) { /* ignore */ }
      resolve(false);
    }, 6000);

    let ws: WebSocket;
    try {
      ws = new WebSocket(brokerUrl, ["mqtt"]);
      ws.binaryType = "arraybuffer";
    } catch (e) {
      log("WebSocket creation error", { error: String(e) });
      clearTimeout(timeout);
      resolve(false);
      return;
    }

    ws.onopen = () => {
      log("WS connected, sending CONNECT");
      ws.send(buildConnectPacket(clientId, mqttUser, mqttPassword));
    };

    ws.onmessage = (event) => {
      const data = new Uint8Array(event.data as ArrayBuffer);
      const packetType = (data[0] >> 4) & 0x0f;

      if (packetType === 2) {
        const returnCode = data[3];
        if (returnCode !== 0) {
          log("CONNACK error", { returnCode });
          clearTimeout(timeout);
          ws.close();
          resolve(false);
          return;
        }
        log("CONNACK OK, publishing OFF");
        ws.send(buildPublishPacket(topic, "0", true));
      }

      if (packetType === 4) {
        log("PUBACK received — OFF sent", { stationId });
        clearTimeout(timeout);
        try {
          ws.send(buildDisconnectPacket());
          ws.close();
        } catch (_) { /* ignore */ }
        resolve(true);
      }
    };

    ws.onerror = (event) => {
      log("WebSocket error", { error: String(event) });
      clearTimeout(timeout);
      try { ws.close(); } catch (_) { /* ignore */ }
      resolve(false);
    };

    ws.onclose = () => { /* noop */ };
  });
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
