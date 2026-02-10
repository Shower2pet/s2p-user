

## Problema

Il pagamento dalla pagina stazione fallisce con **"Valid amount or price_id is required"** per due motivi concatenati:

1. La colonna `stripe_price_id` non esiste nella tabella `stations` -- la funzione edge tenta di leggerla e il query fallisce silenziosamente.
2. Il frontend (`StationDetail.tsx`) invia solo `station_id` e `option_id`, ma **non invia `amount` ne `productName`** come fallback.
3. Siccome il lookup fallisce, la funzione non ha ne un `price_id` ne un `amount`, e lancia l'errore.

## Soluzione

La correzione deve avvenire nella funzione edge `create-checkout`, che deve ricavare il prezzo dalle `washing_options` della stazione quando riceve `station_id` + `option_id`.

### Passaggi

1. **Aggiornare `create-checkout/index.ts`**:
   - Rimuovere il riferimento a `stations.stripe_price_id` (colonna inesistente).
   - Quando `station_id` e `option_id` sono forniti, leggere `washing_options` dalla stazione.
   - Trovare l'opzione corrispondente a `option_id` nel JSON array.
   - Usare `price` e `name` dell'opzione come `amount` (convertito in centesimi) e `productName`.
   - Mantenere il supporto esistente per i casi in cui `amount`/`productName` vengono passati direttamente (pagina Credits, sottoscrizioni).

2. **Aggiornare `StationDetail.tsx`**:
   - Inviare anche `amount` (in centesimi) e `productName` come fallback nel body della richiesta, prendendoli dall'opzione selezionata.
   - Aggiungere `success_url` che punta a `/s/{id}/timer?option={optionId}` per il redirect post-pagamento.

### Dettagli tecnici

**Edge function -- query corretto:**
```sql
SELECT type, category, washing_options FROM stations WHERE id = $station_id
```
Invece dell'attuale:
```sql
SELECT stripe_price_id, type, category FROM stations WHERE id = $station_id
```

Poi, se `option_id` e presente, estrarre prezzo e nome dal JSON:
```typescript
if (stationData?.washing_options && option_id) {
  const option = stationData.washing_options.find(o => o.id === option_id);
  if (option) {
    amount = option.price * 100; // centesimi
    productName = option.name;
  }
}
```

**Frontend -- body arricchito:**
```typescript
const body = {
  station_id: station.id,
  option_id: chosen.id,
  amount: chosen.price * 100,
  productName: chosen.name,
  currency: 'eur',
  mode: 'payment',
  productType: 'session',
  user_id: user?.id || null,
  guest_email: !user ? guestEmail : null,
  success_url: `${window.location.origin}/s/${station.id}/timer?option=${chosen.id}`,
};
```

Questo approccio risolve il problema in modo robusto: la funzione edge prova prima a ricavare il prezzo dalla stazione, e il frontend fornisce i dati anche come fallback.

