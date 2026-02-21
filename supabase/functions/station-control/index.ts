import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STATION-CONTROL] ${step}${detailsStr}`);
};

/* ── Minimal MQTT v3.1.1 over native WebSocket ───────────── */

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
  const protocolLevel = 4; // MQTT 3.1.1
  const connectFlags = 0xc2; // username + password + clean session
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

  packet[offset++] = 0x10; // CONNECT
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
  // QoS 1 → need packet identifier (2 bytes)
  const packetId = Math.floor(Math.random() * 65535) + 1;
  const remainingLength = topicBytes.length + 2 + payloadBytes.length;
  const rl = encodeRemainingLength(remainingLength);

  const firstByte = 0x30 | (retain ? 0x01 : 0x00) | 0x02; // PUBLISH + QoS 1 + retain
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

function getMqttConfig() {
  let mqttHost = Deno.env.get("MQTT_HOST") || "";
  const mqttUser = Deno.env.get("MQTT_USER") || "";
  const mqttPassword = Deno.env.get("MQTT_PASSWORD") || "";

  if (!mqttHost || !mqttUser || !mqttPassword) {
    throw new Error("MQTT configuration missing");
  }

  mqttHost = mqttHost.replace(/^wss?:\/\//, "").replace(/\/.*$/, "").replace(/:.*$/, "");
  const brokerUrl = Deno.env.get("MQTT_WS_URL") || `wss://${mqttHost}:8884/mqtt`;
  logStep("MQTT config resolved", { brokerUrl, host: mqttHost });
  return { brokerUrl, mqttUser, mqttPassword };
}

/**
 * Publishes an MQTT command with retain flag using native Deno WebSocket.
 * Creates a fresh connection each invocation for serverless safety.
 */
function publishMqttRetain(stationId: string, payload: string): Promise<boolean> {
  const { brokerUrl, mqttUser, mqttPassword } = getMqttConfig();
  const topic = `shower2pet/${stationId}/relay1/command`;
  const clientId = `s2p-edge-${Date.now()}`;

  logStep("MQTT publish", { brokerUrl, topic, payload, retain: true });

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      logStep("MQTT timeout (8s)");
      try { ws.close(); } catch (_) { /* ignore */ }
      resolve(false);
    }, 8000);

    let ws: WebSocket;
    try {
      ws = new WebSocket(brokerUrl, ["mqtt"]);
      ws.binaryType = "arraybuffer";
    } catch (e) {
      logStep("WebSocket creation error", { error: String(e) });
      clearTimeout(timeout);
      resolve(false);
      return;
    }

    ws.onopen = () => {
      logStep("WebSocket connected, sending CONNECT");
      const connectPacket = buildConnectPacket(clientId, mqttUser, mqttPassword);
      ws.send(connectPacket);
    };

    ws.onmessage = (event) => {
      const data = new Uint8Array(event.data as ArrayBuffer);
      const packetType = (data[0] >> 4) & 0x0f;

      // CONNACK = 2
      if (packetType === 2) {
        const returnCode = data[3];
        if (returnCode !== 0) {
          logStep("CONNACK error", { returnCode });
          clearTimeout(timeout);
          ws.close();
          resolve(false);
          return;
        }
        logStep("CONNACK OK, publishing");
        const publishPacket = buildPublishPacket(topic, payload, true);
        ws.send(publishPacket);
      }

      // PUBACK = 4 (QoS 1 acknowledgment)
      if (packetType === 4) {
        logStep("PUBACK received, published OK", { topic, payload });
        clearTimeout(timeout);
        try {
          ws.send(buildDisconnectPacket());
          ws.close();
        } catch (_) { /* ignore */ }
        resolve(true);
      }
    };

    ws.onerror = (event) => {
      logStep("WebSocket error", { error: String(event) });
      clearTimeout(timeout);
      try { ws.close(); } catch (_) { /* ignore */ }
      resolve(false);
    };

    ws.onclose = () => {
      // If we haven't resolved yet, it means connection was lost
    };
  });
}

/* ── Supabase admin helper ────────────────────────────────── */

async function getSupabaseAdmin() {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.2");
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

/* ── Main handler ─────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { station_id, command, duration_minutes, session_id } = await req.json();

    if (!station_id || !command) {
      throw new Error("station_id and command are required");
    }

    logStep("Request", { station_id, command, duration_minutes, session_id });

    // ── START_TIMED_WASH ──
    if (command === 'START_TIMED_WASH') {
      if (!duration_minutes || duration_minutes <= 0) {
        throw new Error("duration_minutes is required for START_TIMED_WASH");
      }

      const onOk = await publishMqttRetain(station_id, "1");
      if (!onOk) {
        return new Response(JSON.stringify({
          success: false,
          error: "Station did not respond — MQTT broker unreachable",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 503,
        });
      }

      const startedAt = new Date().toISOString();
      const endsAt = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();

      let sessionUpdated = false;
      if (session_id) {
        try {
          const supabaseAdmin = await getSupabaseAdmin();

          const { data: stationRow } = await supabaseAdmin
            .from('stations')
            .select('type')
            .eq('id', station_id)
            .maybeSingle();

          const isShower = stationRow?.type?.toUpperCase() === 'BRACCO';
          const sessionStep = isShower ? 'timer' : 'rules';

          const { error: updateError } = await supabaseAdmin
            .from('wash_sessions')
            .update({ started_at: startedAt, ends_at: endsAt, step: sessionStep })
            .eq('id', session_id);

          if (updateError) {
            logStep("Session timing update failed", { error: String(updateError) });
          } else {
            sessionUpdated = true;
            logStep("Session timing updated", { session_id, startedAt, endsAt, step: sessionStep });
          }
        } catch (e) {
          logStep("Session timing update exception", { error: String(e) });
        }
      }

      logStep("START_TIMED_WASH success", { duration_minutes, sessionUpdated });
      return new Response(JSON.stringify({
        success: true,
        message: "Lavaggio avviato",
        started_at: startedAt,
        ends_at: endsAt,
        session_updated: sessionUpdated,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── MANUAL ON ──
    if (command === 'ON') {
      const ok = await publishMqttRetain(station_id, "1");
      return new Response(JSON.stringify({ success: ok }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: ok ? 200 : 503,
      });
    }

    // ── MANUAL OFF ──
    if (command === 'OFF') {
      const ok = await publishMqttRetain(station_id, "0");
      return new Response(JSON.stringify({ success: ok }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: ok ? 200 : 503,
      });
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
