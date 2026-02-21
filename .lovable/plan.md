

# Uniformare Stati, Visibilita e Accesso Protetto delle Stazioni

## Riepilogo del modello

Il sistema delle stazioni si basa su tre concetti indipendenti:

```text
+--------------------+   +------------------------+   +------------------+
|    VISIBILITA      |   |   STATO FUNZIONAMENTO  |   |  ACCESSO FISICO  |
+--------------------+   +------------------------+   +------------------+
| PUBLIC (default)   |   | AVAILABLE (default)    |   | has_access_gate  |
| RESTRICTED         |   | BUSY (calcolato)       |   | (true/false)     |
| HIDDEN             |   | OFFLINE                |   |                  |
+--------------------+   | MAINTENANCE            |   |                  |
                          +------------------------+                      
```

- **Visibilita**: gia presente nel DB (`visibility_type` enum). Nessuna modifica necessaria.
- **Stato di funzionamento**: gia presente (`station_status` enum). Serve aggiungere un flag `manual_offline` per impedire il ripristino automatico.
- **Accesso protetto**: gia presente (`has_access_gate` boolean). Nessuna modifica necessaria.

## Problema chiave: Offline manuale vs automatico

Attualmente non c'e modo di distinguere tra:
- Stazione messa offline **manualmente** da admin/partner/gestore (non deve tornare online da sola)
- Stazione andata offline **per heartbeat scaduto** (deve tornare online quando riceve un nuovo heartbeat)

### Soluzione: colonna `manual_offline`

Aggiungere una colonna `manual_offline BOOLEAN DEFAULT false` alla tabella `stations`. Quando un admin/partner imposta manualmente lo stato a OFFLINE, questo flag viene settato a `true`. Il meccanismo di heartbeat ripristinera la stazione solo se `manual_offline = false`.

## Dettaglio tecnico delle modifiche

### 1. Migrazione Database

```sql
ALTER TABLE stations ADD COLUMN manual_offline boolean NOT NULL DEFAULT false;
```

### 2. Logica heartbeat (da implementare lato server o trigger)

Creare una funzione DB `handle_heartbeat(station_id)` che:
- Aggiorna `last_heartbeat_at = now()`
- Se `status = 'OFFLINE'` e `manual_offline = false`, imposta `status = 'AVAILABLE'`
- Se `manual_offline = true`, non cambia lo stato

Creare un cron job (pg_cron) che ogni minuto:
- Cerca stazioni con `status = 'AVAILABLE'` e `last_heartbeat_at < now() - interval '2 minutes'`
- Le imposta su `status = 'OFFLINE'` (ma `manual_offline` resta `false`, cosi torneranno online al prossimo heartbeat)

### 3. Aggiornare `get_public_stations()` RPC

Aggiungere la logica heartbeat nella funzione:
- Se `status = 'AVAILABLE'` ma `last_heartbeat_at < now() - 2 min`, restituire `'OFFLINE'` come stato
- Lo stato BUSY resta calcolato dinamicamente dalle sessioni attive (gia presente)
- MAINTENANCE viene restituito cosi com'e (gia gestito come offline lato UI)

### 4. Frontend - Hook `useStations.tsx`

Aggiornare `isStationOnline()` per considerare anche il nuovo campo:
- `AVAILABLE` = online e pronta
- `BUSY` = occupata (mostrata con colore diverso)
- `OFFLINE` e `MAINTENANCE` = non disponibile

### 5. Frontend - Badge di stato (`StationStatusBadge.tsx`)

Aggiungere lo stato `maintenance` come variante separata del badge, con icona e colore dedicati (attualmente viene mostrato come "offline").

### 6. Frontend - Pagina Index (mappa)

Il colore dei marker sulla mappa gia distingue tra online e offline. Aggiungere:
- Colore arancione/giallo per stazioni RESTRICTED (attualmente usano il colore standard)
- Le stazioni HIDDEN sono gia escluse (`visibility !== 'HIDDEN'`)

### 7. Frontend - StationDetail.tsx

La logica attuale e gia corretta:
- Stazioni RESTRICTED richiedono verifica QR/codice (gia implementato)
- Stazioni con `has_access_gate` mostrano il pulsante "Apri Porta" (gia implementato)
- Stazioni offline/maintenance mostrano il banner di indisponibilita (gia implementato)

### 8. Aggiornare `src/types/database.ts`

Nessuna modifica agli enum esistenti. Aggiungere solo la documentazione del campo `manual_offline` se necessario.

### 9. Impatto su App Console

La Console dovra:
- Mostrare il toggle `manual_offline` quando un admin/partner mette una stazione offline manualmente
- Quando si imposta `status = 'OFFLINE'` dalla Console, settare anche `manual_offline = true`
- Quando si imposta `status = 'AVAILABLE'`, resettare `manual_offline = false`

Forniro le istruzioni esatte per aggiornare la Console dopo l'implementazione.

## Riepilogo modifiche

| Componente | Modifica |
|---|---|
| DB: `stations` | Aggiungere colonna `manual_offline` |
| DB: funzione RPC | Aggiornare `get_public_stations()` con logica heartbeat |
| DB: cron job | Nuovo job per auto-offline su heartbeat scaduto |
| DB: funzione | Nuova `handle_station_heartbeat()` |
| Frontend: `useStations.tsx` | Aggiornare mapping stati |
| Frontend: `StationStatusBadge.tsx` | Aggiungere variante `maintenance` |
| Frontend: `Index.tsx` | Colore marker per RESTRICTED |
| Frontend: `StationDetail.tsx` | Minori aggiustamenti messaggi |
| App Console | Istruzioni per gestire `manual_offline` |

