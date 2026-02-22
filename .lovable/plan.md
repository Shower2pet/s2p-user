

# Migrazione libreria MQTT: da @ymjacky/mqtt5 a mqtt.js

## Problema attuale

La libreria `jsr:@ymjacky/mqtt5` ha causato crash silenziosi nelle Edge Functions di Supabase, richiedendo workaround come import dinamici. E' una libreria di nicchia (JSR score 82%, pochi utenti) con supporto limitato per ambienti serverless.

## Libreria proposta: mqtt.js (via esm.sh)

**mqtt.js** (npm: `mqtt`, v5.14+) e' il client MQTT standard de-facto per JavaScript:
- 8000+ stelle su GitHub, mantenuto attivamente
- Supporto nativo WebSocket (browser e Deno via esm.sh)
- API basata su eventi ben documentata e testata in produzione
- Funziona in Deno tramite `import mqtt from "https://esm.sh/mqtt@5"`

## File coinvolti

Tre Edge Functions usano MQTT:

1. **`supabase/functions/station-control/index.ts`** -- publish comandi relay (ON/OFF)
2. **`supabase/functions/check-heartbeat/index.ts`** -- subscribe heartbeat + publish self-test
3. **`supabase/functions/check-expired-sessions/index.ts`** -- publish OFF quando sessione scade

## Dettagli tecnici

### Nuova API di connessione (mqtt.js)

```typescript
import mqtt from "https://esm.sh/mqtt@5";

function connectMqtt(): Promise<mqtt.MqttClient> {
  const host = getMqttConfig(); // stesso helper gia' esistente
  const client = mqtt.connect(`wss://${host}:8884/mqtt`, {
    clientId: `s2p-edge-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    username: Deno.env.get("MQTT_USER"),
    password: Deno.env.get("MQTT_PASSWORD"),
    clean: true,
    connectTimeout: 6000,
    protocolVersion: 4, // MQTT 3.1.1
  });
  return new Promise((resolve, reject) => {
    client.on('connect', () => resolve(client));
    client.on('error', (err) => reject(err));
    setTimeout(() => reject(new Error('MQTT connect timeout')), 8000);
  });
}
```

### Publish (station-control, check-expired-sessions)

```typescript
async function publishMqtt(stationId: string, payload: string): Promise<boolean> {
  try {
    const client = await connectMqtt();
    await client.publishAsync(topic, payload, { qos: 1, retain: true });
    client.end();
    return true;
  } catch (e) {
    logStep("MQTT error", { error: String(e) });
    return false;
  }
}
```

### Subscribe (check-heartbeat)

```typescript
const client = await connectMqtt();
client.subscribe('shower2pet/+/status');
client.on('message', (topic: string, message: Buffer) => {
  const payload = message.toString();
  // stessa logica di parsing gia' esistente
});
// attesa 40 secondi, poi client.end()
```

### Modifiche per ogni file

**station-control/index.ts:**
- Sostituire import `jsr:@ymjacky/mqtt5` con `esm.sh/mqtt@5`
- Riscrivere `publishMqtt()` con la nuova API (connect/publishAsync/end)
- Rimuovere riferimenti a `Mqtt.QoS`, `Mqtt.ProtocolVersion`, `WebSocketMqttClient`

**check-heartbeat/index.ts:**
- Rimuovere il dynamic import workaround (non piu' necessario con mqtt.js)
- Usare import statico di `mqtt` da esm.sh
- Sostituire `client.on('publish', ...)` con `client.on('message', ...)`
- Il self-test resta invariato nella logica

**check-expired-sessions/index.ts:**
- Stesso refactor di station-control: nuovo import e nuova `publishMqttOff()`

### Vantaggi

- Nessun crash silenzioso al boot: mqtt.js e' battle-tested
- Import statico in tutte le funzioni (niente piu' dynamic import workaround)
- API piu' pulita: `publishAsync()` nativa, eventi standard Node.js
- Compatibilita' retrocompatibile: nessuna modifica a database, topic, o payload

### Rischi e mitigazioni

- **Compatibilita' esm.sh/Deno**: mqtt.js v5 supporta ESM nativo e funziona via esm.sh. Se ci fossero problemi di bundling, si puo' fissare la versione esatta (es. `esm.sh/mqtt@5.14.1`)
- **App Console**: nessun impatto -- le funzioni mantengono gli stessi input/output/topic MQTT

