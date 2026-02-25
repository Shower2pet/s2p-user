import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STATION-CONTROL] ${step}${d}`);
};

/* ── Supabase admin client ─────────────────────────────────── */

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/* ── Native WebSocket MQTT 3.1.1 — minimal publish-only ───── */

function encodeUtf8String(str: string): Uint8Array {
  const encoded = new TextEncoder().encode(str);
  const buf = new Uint8Array(2 + encoded.length);
  buf[0] = (encoded.length >> 8) & 0xff;
  buf[1] = encoded.length & 0xff;
  buf.set(encoded, 2);
  return buf;
}

function encodeRemainingLength(length: number): Uint8Array {
  const bytes: number[] = [];
  do {
    let encodedByte = length % 128;
    length = Math.floor(length / 128);
    if (length > 0) encodedByte |= 0x80;
    bytes.push(encodedByte);
  } while (length > 0);
  return new Uint8Array(bytes);
}

function buildConnectPacket(clientId: string, username: string, password: string): Uint8Array {
  const protocolName = encodeUtf8String("MQTT");
  const protocolLevel = new Uint8Array([0x04]);
  const connectFlags = new Uint8Array([0xc2]);
  const keepAlive = new Uint8Array([0x00, 0x3c]);
  const clientIdBytes = encodeUtf8String(clientId);
  const usernameBytes = encodeUtf8String(username);
  const passwordBytes = encodeUtf8String(password);

  const variableHeaderAndPayload = new Uint8Array([
    ...protocolName, ...protocolLevel, ...connectFlags, ...keepAlive,
    ...clientIdBytes, ...usernameBytes, ...passwordBytes,
  ]);

  const remainingLength = encodeRemainingLength(variableHeaderAndPayload.length);
  const packet = new Uint8Array(1 + remainingLength.length + variableHeaderAndPayload.length);
  packet[0] = 0x10;
  packet.set(remainingLength, 1);
  packet.set(variableHeaderAndPayload, 1 + remainingLength.length);
  return packet;
}

function buildPublishPacket(topic: string, payload: string): Uint8Array {
  const topicBytes = encodeUtf8String(topic);
  const payloadBytes = new TextEncoder().encode(payload);

  const variableHeaderAndPayload = new Uint8Array(topicBytes.length + payloadBytes.length);
  variableHeaderAndPayload.set(topicBytes, 0);
  variableHeaderAndPayload.set(payloadBytes, topicBytes.length);

  const remainingLength = encodeRemainingLength(variableHeaderAndPayload.length);
  const packet = new Uint8Array(1 + remainingLength.length + variableHeaderAndPayload.length);
  packet[0] = 0x30;
  packet.set(remainingLength, 1);
  packet.set(variableHeaderAndPayload, 1 + remainingLength.length);
  return packet;
}

function buildDisconnectPacket(): Uint8Array {
  return new Uint8Array([0xe0, 0x00]);
}

function mqttPublishNative(
  wsUrl: string, username: string, password: string,
  topic: string, payload: string, timeoutMs = 15000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const clientId = `s2p-edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    logStep("MQTT connecting", { wsUrl, clientId });

    let resolved = false;
    const done = (result: boolean) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* ignore */ }
      resolve(result);
    };

    const timer = setTimeout(() => {
      logStep("MQTT timeout");
      done(false);
    }, timeoutMs);

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl, ["mqtt"]);
      ws.binaryType = "arraybuffer";
    } catch (err) {
      logStep("WebSocket creation failed", { error: String(err) });
      clearTimeout(timer);
      resolve(false);
      return;
    }

    ws.onopen = () => {
      logStep("WebSocket open, sending CONNECT");
      ws.send(buildConnectPacket(clientId, username, password));
    };

    ws.onmessage = (event) => {
      const data = new Uint8Array(event.data as ArrayBuffer);
      const packetType = data[0] >> 4;
      if (packetType === 2) {
        const returnCode = data[3];
        if (returnCode === 0) {
          logStep("CONNACK OK, publishing");
          ws.send(buildPublishPacket(topic, payload));
          ws.send(buildDisconnectPacket());
          logStep("Published OK (QoS 0)", { topic, payload });
          done(true);
        } else {
          logStep("CONNACK refused", { returnCode });
          done(false);
        }
      }
    };

    ws.onerror = () => done(false);
    ws.onclose = () => { if (!resolved) done(false); };
  });
}

/* ── MQTT publish helper ──────────────────────────────────── */

async function publishMqtt(topic: string, payload: string): Promise<boolean> {
  const rawHost = (Deno.env.get("MQTT_HOST") || "").trim();
  if (!rawHost) throw new Error("MQTT_HOST missing");
  const mqttUser = Deno.env.get("MQTT_USER") || "";
  const mqttPass = Deno.env.get("MQTT_PASSWORD") || "";
  const cleanHost = rawHost.replace(/^(wss?|mqtts?):\/\//, "").replace(/:\d+.*$/, "").replace(/\/.*$/, "");
  const wsUrl = `wss://${cleanHost}:8084/mqtt`;
  return mqttPublishNative(wsUrl, mqttUser, mqttPass, topic, payload);
}

/* ── Main handler ─────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { station_id, command, duration_minutes, session_id } = await req.json();

    if (!station_id || typeof station_id !== "string") {
      throw new Error("station_id is required");
    }

    logStep("Request", { station_id, command, duration_minutes, session_id });

    const validCommands = ["START_TIMED_WASH", "PULSE", "ON", "OFF"];
    if (!command || !validCommands.includes(command)) {
      throw new Error(`Invalid command. Must be one of: ${validCommands.join(", ")}`);
    }

    // ── Auth & RBAC (optional — if Authorization header is present) ──
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userRole: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
      if (!claimsErr && claimsData?.claims) {
        userId = claimsData.claims.sub as string;
        const adminClient = getAdminClient();
        const { data: profile } = await adminClient.from("profiles").select("role").eq("id", userId).single();
        userRole = profile?.role ?? null;
      }
    }

    // RBAC: ON/OFF are admin/partner/manager only
    if ((command === "ON" || command === "OFF") && userRole === "user") {
      return new Response(JSON.stringify({ error: "Forbidden", success: false }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = getAdminClient();

    // ── START_TIMED_WASH ──
    if (command === "START_TIMED_WASH") {
      if (!duration_minutes || duration_minutes <= 0) {
        throw new Error("duration_minutes is required for START_TIMED_WASH");
      }

      // Heartbeat freshness check (90s threshold)
      const { data: stationCheck, error: stationCheckErr } = await adminClient
        .from("stations")
        .select("last_heartbeat_at, status, type")
        .eq("id", station_id)
        .maybeSingle();

      if (stationCheckErr || !stationCheck) {
        return new Response(JSON.stringify({
          success: false, error: "STATION_NOT_FOUND",
          message: "Stazione non trovata",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      const lastHb = stationCheck.last_heartbeat_at ? new Date(stationCheck.last_heartbeat_at).getTime() : 0;
      const ageSeconds = (Date.now() - lastHb) / 1000;

      if (ageSeconds > 90) {
        logStep("Heartbeat too old, refusing START", { station_id, ageSeconds });
        return new Response(JSON.stringify({
          success: false, error: "STATION_OFFLINE",
          message: "La stazione risulta offline. Impossibile avviare il servizio.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 503,
        });
      }

      // Publish ON
      const onOk = await publishMqtt(`shower2pet/${station_id}/relay1/command`, "1");
      if (!onOk) {
        return new Response(JSON.stringify({
          success: false,
          error: "MQTT broker unreachable",
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
          const isShower = stationCheck.type?.toUpperCase() === "BRACCO";
          const sessionStep = isShower ? "timer" : "rules";

          const { error: updateError } = await adminClient
            .from("wash_sessions")
            .update({ started_at: startedAt, ends_at: endsAt, step: sessionStep })
            .eq("id", session_id);

          if (!updateError) {
            sessionUpdated = true;
            logStep("Session timing updated", { session_id, startedAt, endsAt, step: sessionStep });
          } else {
            logStep("Session timing update failed", { error: String(updateError) });
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
      });
    }

    // ── PULSE (timed relay activation) ──
    if (command === "PULSE") {
      if (!duration_minutes || typeof duration_minutes !== "number" || duration_minutes <= 0 || duration_minutes > 120) {
        throw new Error("duration_minutes is required for PULSE (1-120)");
      }
      const durationMs = Math.round(duration_minutes * 60 * 1000);
      const topic = `shower2pet/${station_id}/relay1/pulse`;
      const ok = await publishMqtt(topic, durationMs.toString());

      if (ok && userId) {
        await adminClient.from("gate_commands").insert({
          station_id, command, user_id: userId, status: "sent",
        }).catch(() => {});
      }

      return new Response(JSON.stringify({ success: ok, topic, payload: durationMs.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: ok ? 200 : 503,
      });
    }

    // ── ON / OFF ──
    const topic = `shower2pet/${station_id}/relay1/command`;
    const payload = command === "ON" ? "1" : "0";
    const ok = await publishMqtt(topic, payload);

    if (ok && userId) {
      await adminClient.from("gate_commands").insert({
        station_id, command, user_id: userId, status: "sent",
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: ok ? 200 : 503,
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
