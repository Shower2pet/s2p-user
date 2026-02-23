
# Migrazione MQTT: da HiveMQ a EMQX con Webhook

## Stato: ✅ Completata e verificata

### Cosa è stato fatto

1. **Creata `emqx-webhook` Edge Function** — riceve POST da EMQX per:
   - `client.connected` → chiama `handle_station_heartbeat` (stazione online)
   - `client.disconnected` → chiama `mark_station_offline` (stazione offline)
   - `message.publish` su `shower2pet/{id}/status` → gestisce heartbeat e LWT

2. **Eliminata `check-heartbeat`** — non più necessaria, EMQX notifica in push

3. **Rimossa `auto_offline_expired_heartbeats`** — il webhook gestisce tutto in tempo reale

4. **Autenticazione webhook** — Bearer token via secret `EMQX_WEBHOOK_SECRET`

5. **Rimosso cron job `check-heartbeat-cron`** — non più necessario, eliminato dal DB

### Configurazione EMQX attiva

- **HTTP Server Connector** con TLS abilitato (TLS Verify OFF)
- **3 regole** nel Rule Engine:
  - `SELECT * FROM "$events/client_connected"` → webhook
  - `SELECT * FROM "$events/client_disconnected"` → webhook
  - `SELECT * FROM "shower2pet/+/status"` → webhook

### Test superati
- ✅ Heartbeat via `message.publish` (BR_001)
- ✅ Disconnessione (`client.disconnected`, reason: keepalive_timeout)
- ✅ Riconnessione (`client.connected` → status torna AVAILABLE)
- ✅ Cron job legacy rimosso

### File ancora attivi con MQTT
- `station-control/index.ts` — publish comandi relay (invariato, usa MQTT_HOST/USER/PASSWORD)
- `check-expired-sessions/index.ts` — publish OFF a fine sessione (invariato)
