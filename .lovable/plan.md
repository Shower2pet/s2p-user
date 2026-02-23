
# Migrazione MQTT: da HiveMQ a EMQX con Webhook

## Stato: ✅ Completata

### Cosa è stato fatto

1. **Creata `emqx-webhook` Edge Function** — riceve POST da EMQX per:
   - `client.connected` → chiama `handle_station_heartbeat` (stazione online)
   - `client.disconnected` → chiama `mark_station_offline` (stazione offline)
   - `message.publish` su `shower2pet/{id}/status` → gestisce heartbeat e LWT

2. **Eliminata `check-heartbeat`** — non più necessaria, EMQX notifica in push

3. **Rimossa `auto_offline_expired_heartbeats`** — il webhook gestisce tutto in tempo reale

4. **Autenticazione webhook** — Bearer token via secret `EMQX_WEBHOOK_SECRET`

### Configurazione EMQX richiesta

Nel pannello EMQX, creare webhook con:
- **URL**: `https://rbdzinajiyswzdeoenil.supabase.co/functions/v1/emqx-webhook`
- **Headers**: `Authorization: Bearer <stesso-valore-del-secret>`
- **Events**: `client.connected`, `client.disconnected`, `message.publish`
- **Topic filter** (per message.publish): `shower2pet/+/status`

### File ancora attivi con MQTT
- `station-control/index.ts` — publish comandi relay (invariato)
- `check-expired-sessions/index.ts` — publish OFF a fine sessione (invariato)
