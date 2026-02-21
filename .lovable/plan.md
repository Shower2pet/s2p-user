

# Protezione Pagamenti Senza Retain: Strategia Basata su DB

## Vincolo Chiave

Senza il retain flag, una verifica MQTT in tempo reale richiederebbe fino a 35 secondi (un ciclo di heartbeat) prima di ricevere risposta. Questo e' inaccettabile per l'esperienza utente durante il pagamento.

## Strategia: 3 Livelli di Protezione Basati sul DB

Invece di verificare MQTT in tempo reale prima del pagamento, sfruttiamo il campo `last_heartbeat_at` gia' aggiornato dal cron ogni 2 minuti come gate di sicurezza.

```text
Livello 1: UI (Frontend)
  Station status = OFFLINE --> opzioni lavaggio disabilitate (gia' implementato)
  Polling ogni 30s per aggiornamenti (gia' implementato)

Livello 2: Edge Functions Pre-Pagamento (NUOVO)
  pay-with-credits: controlla last_heartbeat_at < 3 min --> blocca pagamento
  create-checkout: controlla last_heartbeat_at < 3 min --> blocca pagamento

Livello 3: station-control (GIA' ESISTENTE)
  MQTT publish con timeout 5s --> se broker non risponde, ritorna 503
  Il frontend gestisce il rollback (rimborso crediti + ticket manutenzione)
```

## Dettaglio Modifiche

### 1. Ridurre soglia offline da 5 a 3 minuti

Con il cron ogni 2 minuti e 50s di ascolto, una stazione attiva viene rilevata ad ogni ciclo. Se manca un ciclo intero, a 3 minuti viene marcata offline. Questo bilancia reattivita' e stabilita'.

Funzioni DB da aggiornare:
- `auto_offline_expired_heartbeats()`: soglia da 5 a 3 minuti
- `get_public_stations()`: soglia da 5 a 3 minuti

### 2. Check freshness in `pay-with-credits`

Prima di detrarre crediti o contare un lavaggio abbonamento, la funzione verifica:

```text
1. Leggi station.status e last_heartbeat_at dal DB
2. Se status != 'AVAILABLE' --> errore "Stazione non disponibile"
3. Se last_heartbeat_at < now() - 3 minuti --> errore "Stazione non raggiungibile"
4. Altrimenti --> procedi con il pagamento
```

Questo aggiunge ~50ms al flusso (una singola query DB), nessun impatto UX.

### 3. Check freshness in `create-checkout`

Prima di creare la sessione Stripe:

```text
1. Leggi station.status e last_heartbeat_at dal DB (gia' legge la stazione per washing_options)
2. Se status non e' AVAILABLE --> errore 503 "Stazione non disponibile"
3. Se last_heartbeat_at < now() - 3 minuti --> errore 503 "Stazione non raggiungibile"
4. Altrimenti --> crea sessione Stripe normalmente
```

L'utente NON viene reindirizzato a Stripe se la stazione e' offline.

### 4. Frontend: gestione errore pre-pagamento

In `StationDetail.tsx`, i catch di `handlePay` gestiscono gia' gli errori. Aggiungiamo un messaggio specifico quando l'errore indica stazione non raggiungibile, con refresh automatico dello status.

### 5. Frontend: `isStationOnline` con check heartbeat lato client

Aggiungere un controllo aggiuntivo in `isStationOnline()`: se `last_heartbeat_at` e' piu' vecchio di 3 minuti, la stazione viene mostrata come offline anche se il DB dice AVAILABLE (per coprire il gap tra un ciclo cron e l'altro).

## File da Modificare

| File | Modifica |
|---|---|
| `supabase/functions/pay-with-credits/index.ts` | Aggiunta check `last_heartbeat_at` prima del pagamento |
| `supabase/functions/create-checkout/index.ts` | Aggiunta check `last_heartbeat_at` prima di creare sessione Stripe |
| `src/hooks/useStations.tsx` | `isStationOnline` verifica anche freshness heartbeat |
| `src/pages/StationDetail.tsx` | Toast specifico + invalidazione query su errore "stazione non raggiungibile" |
| Migrazione SQL | Soglie ridotte da 5 a 3 minuti |

## Flusso Completo di Protezione

```text
Utente vede stazione AVAILABLE (heartbeat < 3 min)
         |
  Seleziona opzione lavaggio
         |
  [Frontend] isStationOnline() = true (status + heartbeat fresh)
         |
  Click "Paga"
         |
  [Edge Function] SELECT status, last_heartbeat_at FROM stations
         |
  heartbeat > 3 min? --SI--> Errore "Stazione non raggiungibile"
         |                     (nessun addebito, toast + refresh UI)
        NO
         |
  Pagamento processato (crediti/Stripe)
         |
  StationTimer --> "Avvia Servizio"
         |
  [station-control] publishMqtt con timeout 5s
         |
  Broker non risponde? --SI--> 503, rollback crediti + ticket
         |
        NO
         |
  Acqua erogata
```

## Tempi di Rilevamento

| Scenario | Tempo rilevamento | Protezione |
|---|---|---|
| Stazione si spegne | ~3 minuti (1 ciclo mancato) | Cron marca OFFLINE |
| Utente paga durante gap | Istantaneo | Edge function check DB |
| Broker MQTT down | 5 secondi | station-control timeout |
| LWT ricevuto | Istantaneo | check-heartbeat marca OFFLINE |

## Impatto su App Console

Nessun impatto. Le modifiche sono nei check pre-pagamento (solo App User) e nelle soglie DB (la Console legge `status` che viene aggiornato con la stessa logica).

