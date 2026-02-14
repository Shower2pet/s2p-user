import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STATION-CONTROL] ${step}${detailsStr}`);
};

/**
 * Publishes an MQTT message via WebSocket to control a physical station.
 * Returns true if the command was sent successfully, false otherwise.
 */
async function publishMqttCommand(
  stationId: string,
  command: string,
  durationMinutes: number,
): Promise<boolean> {
  const mqttHost = Deno.env.get("MQTT_HOST");
  const mqttUser = Deno.env.get("MQTT_USER");
  const mqttPassword = Deno.env.get("MQTT_PASSWORD");

  if (!mqttHost || !mqttUser || !mqttPassword) {
    logStep("MQTT credentials missing");
    throw new Error("MQTT configuration missing");
  }

  const topic = `stations/${stationId}/command`;
  const payload = JSON.stringify({
    command,
    duration_minutes: durationMinutes,
    timestamp: new Date().toISOString(),
  });

  logStep("Publishing MQTT command", { topic, payload });

  // Use WebSocket-based MQTT connection
  // Try common MQTT-over-WebSocket ports
  const wsUrl = Deno.env.get("MQTT_WS_URL") || `wss://${mqttHost}:8884/mqtt`;

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      logStep("MQTT connection timeout");
      try { ws.close(); } catch (_) { /* ignore */ }
      resolve(false);
    }, 15000); // 15s timeout

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl, ["mqtt"]);
    } catch (err) {
      logStep("WebSocket creation failed", { error: String(err) });
      clearTimeout(timeout);
      resolve(false);
      return;
    }

    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      logStep("WebSocket connected, sending MQTT CONNECT");
      try {
        // Build MQTT CONNECT packet
        const connectPacket = buildMqttConnectPacket(mqttUser, mqttPassword);
        ws.send(connectPacket);
      } catch (err) {
        logStep("Error sending CONNECT", { error: String(err) });
        clearTimeout(timeout);
        ws.close();
        resolve(false);
      }
    };

    ws.onmessage = (event) => {
      const data = new Uint8Array(event.data as ArrayBuffer);
      const packetType = (data[0] >> 4) & 0x0f;

      if (packetType === 2) {
        // CONNACK received
        const returnCode = data[3];
        if (returnCode === 0) {
          logStep("MQTT connected, publishing");
          try {
            const publishPacket = buildMqttPublishPacket(topic, payload);
            ws.send(publishPacket);
            // Send DISCONNECT
            ws.send(new Uint8Array([0xe0, 0x00]));
            clearTimeout(timeout);
            ws.close();
            logStep("Command published successfully");
            resolve(true);
          } catch (err) {
            logStep("Error publishing", { error: String(err) });
            clearTimeout(timeout);
            ws.close();
            resolve(false);
          }
        } else {
          logStep("MQTT CONNACK error", { returnCode });
          clearTimeout(timeout);
          ws.close();
          resolve(false);
        }
      }
    };

    ws.onerror = (event) => {
      logStep("WebSocket error", { error: String(event) });
      clearTimeout(timeout);
      resolve(false);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });
}

/** Build a minimal MQTT v3.1.1 CONNECT packet */
function buildMqttConnectPacket(username: string, password: string): ArrayBuffer {
  const protocolName = encodeUtf8String("MQTT");
  const protocolLevel = 4; // MQTT 3.1.1
  const connectFlags = 0xc2; // username + password + clean session
  const keepAlive = 60;
  const clientId = encodeUtf8String(`s2p-edge-${Date.now()}`);
  const userBytes = encodeUtf8String(username);
  const passBytes = encodeUtf8String(password);

  const variableHeader = new Uint8Array([
    ...protocolName, protocolLevel, connectFlags,
    (keepAlive >> 8) & 0xff, keepAlive & 0xff,
  ]);

  const payloadBytes = new Uint8Array([...clientId, ...userBytes, ...passBytes]);
  const remainingLength = variableHeader.length + payloadBytes.length;
  const rl = encodeRemainingLength(remainingLength);

  const packet = new Uint8Array(1 + rl.length + remainingLength);
  packet[0] = 0x10; // CONNECT
  packet.set(rl, 1);
  packet.set(variableHeader, 1 + rl.length);
  packet.set(payloadBytes, 1 + rl.length + variableHeader.length);

  return packet.buffer;
}

/** Build a minimal MQTT PUBLISH packet (QoS 0) */
function buildMqttPublishPacket(topic: string, payload: string): ArrayBuffer {
  const topicBytes = encodeUtf8String(topic);
  const payloadBytes = new TextEncoder().encode(payload);
  const remainingLength = topicBytes.length + payloadBytes.length;
  const rl = encodeRemainingLength(remainingLength);

  const packet = new Uint8Array(1 + rl.length + remainingLength);
  packet[0] = 0x30; // PUBLISH, QoS 0
  packet.set(rl, 1);
  packet.set(topicBytes, 1 + rl.length);
  packet.set(payloadBytes, 1 + rl.length + topicBytes.length);

  return packet.buffer;
}

function encodeUtf8String(str: string): Uint8Array {
  const encoded = new TextEncoder().encode(str);
  const result = new Uint8Array(2 + encoded.length);
  result[0] = (encoded.length >> 8) & 0xff;
  result[1] = encoded.length & 0xff;
  result.set(encoded, 2);
  return result;
}

function encodeRemainingLength(length: number): Uint8Array {
  const bytes: number[] = [];
  let x = length;
  do {
    let encodedByte = x % 128;
    x = Math.floor(x / 128);
    if (x > 0) encodedByte |= 0x80;
    bytes.push(encodedByte);
  } while (x > 0);
  return new Uint8Array(bytes);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check - accept service role key or user token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const { station_id, command, duration_minutes } = await req.json();

    if (!station_id || !command) {
      throw new Error("station_id and command are required");
    }

    logStep("Request", { station_id, command, duration_minutes });

    const durationMin = duration_minutes || 5;
    const success = await publishMqttCommand(station_id, command, durationMin);

    if (!success) {
      logStep("Hardware command failed");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Station did not respond" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 503,
      });
    }

    logStep("Hardware command succeeded");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
