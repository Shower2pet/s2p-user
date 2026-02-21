

# Rilevamento Offline Rapido tramite LWT

## Situazione Attuale

La Edge Function `check-heartbeat` si connette al broker MQTT ogni 3 minuti, ascolta per 50 secondi, e poi aggiorna il DB. Quando riceve un messaggio LWT "offline", lo logga ma **non lo usa** per marcare la stazione offline. Risultato: una stazione scollegata viene rilevata come offline solo dopo 3 minuti (soglia heartbeat).

## Soluzione: Sfruttare LWT + Messaggi Retained

Dalla configurazione della scheda ETH484-B:
- **Power Up message** su `shower2pet/BR_001/status` (pubblica un messaggio all'accensione)
- **LWT** su `shower2pet/BR_001/status` con payload `offline` (il broker lo pubblica automaticamente quando la scheda si disconnette)
- **Heartbeat** sullo stesso topic

### Strategia in 3 punti:

1. **Reagire attivamente al messaggio LWT**: quando la funzione riceve payload "offline", marcare immediatamente la stazione come OFFLINE nel DB (attualmente viene ignorato)

2. **Ridurre il tempo di attesa da 50s a 10s**: se i messaggi heartbeat e LWT sono configurati con **retain=true** sul broker, arrivano istantaneamente alla sottoscrizione. 10 secondi sono sufficienti per catturare anche messaggi non retained.

3. **Aumentare la frequenza del cron a ogni minuto**: con un runtime di ~15 secondi (connessione + 10s attesa + DB update), possiamo eseguire ogni minuto senza sovrapposizioni.

### Risultato: rilevamento offline in ~1 minuto invece di ~3 minuti.

## Configurazione Hardware Consigliata

Sulla scheda ETH484-B, se possibile, abilitare il **retain flag** sia per il Power Up message che per l'heartbeat. Questo fa si che il broker mantenga sempre l'ultimo stato noto, e la Edge Function lo riceve istantaneamente alla sottoscrizione senza dover aspettare il prossimo ciclo.

## Dettaglio Tecnico delle Modifiche

### 1. Edge Function `check-heartbeat/index.ts`

Modifiche principali:
- Aggiungere un set `offlineStations` per tracciare le stazioni con LWT "offline"
- Quando si riceve payload "offline", aggiungere la stazione a `offlineStations`
- Dopo la fase di ascolto, marcare le stazioni offline nel DB con un UPDATE diretto
- Ridurre il timeout di attesa da 50.000ms a 10.000ms

```text
Flusso aggiornato:

  Connetti MQTT
       |
  Sottoscrivi shower2pet/+/status
       |
  Attendi 10 secondi
       |
  +-- Messaggi ricevuti:
  |     payload != "offline" --> aliveStations.add(id)
  |     payload == "offline" --> offlineStations.add(id)
       |
  Disconnetti
       |
  Per ogni aliveStation --> handle_station_heartbeat(id)
  Per ogni offlineStation --> UPDATE stations SET status='OFFLINE' WHERE id=...
       |
  auto_offline_expired_heartbeats()  (soglia ridotta a 2 min)
```

### 2. Migrazione Database

- **Soglia offline ridotta a 2 minuti** in `auto_offline_expired_heartbeats()` (da 3 min). Con il cron ogni minuto, 2 minuti significano che una stazione deve mancare 2 cicli consecutivi.
- **Soglia in `get_public_stations()`** aggiornata a 2 minuti per coerenza.
- **Cron reschedulato a ogni minuto** (`* * * * *`).

### 3. Nuova funzione DB `mark_station_offline`

Creare una funzione RPC che:
- Imposta `status = 'OFFLINE'` solo se `manual_offline = false`
- Non tocca le stazioni in MAINTENANCE
- Usata dalla Edge Function quando riceve LWT

```sql
CREATE OR REPLACE FUNCTION mark_station_offline(p_station_id text)
RETURNS void AS $$
BEGIN
  UPDATE stations
  SET status = 'OFFLINE'::station_status
  WHERE id = p_station_id
    AND manual_offline = false
    AND status NOT IN ('MAINTENANCE');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Riepilogo Modifiche

| Componente | Prima | Dopo |
|---|---|---|
| Tempo attesa MQTT | 50 secondi | 10 secondi |
| Frequenza cron | ogni 3 minuti | ogni 1 minuto |
| Soglia auto-offline | 3 minuti | 2 minuti |
| Reazione a LWT "offline" | Solo log | Marca OFFLINE nel DB |
| Tempo rilevamento offline | ~3-6 minuti | ~1-2 minuti |
| Runtime Edge Function | ~55 secondi | ~15 secondi |

## Impatto su App Console

Nessun impatto. Le modifiche sono tutte lato backend (Edge Function + RPC). La Console continua a leggere `status` dalla tabella `stations` come prima.

