
# Migrazione MQTT: da HiveMQ a EMQX con Webhook

## Stato: ✅ Completata e ottimizzata

### Cosa è stato fatto

1. **Creata `emqx-webhook` Edge Function** — riceve POST da EMQX per:
   - `client.connected` → chiama `handle_station_heartbeat` (stazione online, aggiorna `last_heartbeat_at`)
   - `client.disconnected` → chiama `mark_station_offline` (stazione offline)

2. **Eliminata `check-heartbeat`** — non più necessaria, EMQX notifica in push

3. **Rimossa `auto_offline_expired_heartbeats`** — il webhook gestisce tutto in tempo reale

4. **Autenticazione webhook** — Bearer token via secret `EMQX_WEBHOOK_SECRET`

5. **Rimosso cron job `check-heartbeat-cron`** — non più necessario, eliminato dal DB

6. **Semplificato heartbeat** — rimosso handler `message.publish` dal webhook e check client-side su `last_heartbeat_at`. Il campo `last_heartbeat_at` resta nel DB come safety net (usato da `get_public_stations()` per marcare OFFLINE stazioni con heartbeat stale).

### Configurazione EMQX attiva

- **HTTP Server Connector** con TLS abilitato (TLS Verify OFF)
- **2 regole** nel Rule Engine:
  - `SELECT * FROM "$events/client_connected"` → webhook
  - `SELECT * FROM "$events/client_disconnected"` → webhook
- ⚠️ La regola `shower2pet/+/status` può essere **rimossa** dal pannello EMQX (il firmware può smettere di inviare heartbeat periodici)

### Architettura status stazione

```
Firmware si connette a EMQX
  → EMQX invia client.connected → webhook → handle_station_heartbeat (AVAILABLE + last_heartbeat_at = now())

Firmware si disconnette (o keepalive timeout)
  → EMQX invia client.disconnected → webhook → mark_station_offline (OFFLINE)

Safety net DB:
  → get_public_stations() controlla last_heartbeat_at: se > 90s → sovrascrive status a OFFLINE
```

### File ancora attivi con MQTT
- `station-control/index.ts` — publish comandi relay (invariato, usa MQTT_HOST/USER/PASSWORD)
- `check-expired-sessions/index.ts` — publish OFF a fine sessione (invariato)
