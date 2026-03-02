## Email nell'ecosistema Shower2Pet — Stato implementazione

### Provider scelto: Resend con dominio custom shower2pet.it

### Stato fasi

| Fase | Stato |
|------|-------|
| 1. Provider + secret RESEND_API_KEY | ✅ Completato |
| 2. Edge Function `send-email` | ✅ Completato |
| 3. Template HTML brandizzati | ✅ Completato (6 tipi) |
| 4. Integrazione stripe-webhook | ✅ Completato |
| 5. Email auth custom (opzionale) | ⏳ Da fare |

### Tipi di email implementati

- `purchase_confirmation` — Conferma lavaggio con importo e opzione
- `credit_pack_confirmation` — Conferma acquisto crediti con saldo
- `subscription_confirmation` — Conferma attivazione abbonamento
- `partner_credentials` — Credenziali temporanee partner (usabile da Console)
- `maintenance_ticket_opened` — Notifica apertura ticket manutenzione
- `maintenance_ticket_closed` — Notifica chiusura ticket
- `generic` — Email generica con subject e message custom

### Come usare da altri flussi (Console o Edge Functions)

```typescript
// Da una Edge Function con service_role_key:
await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({
    to: "destinatario@email.com",
    type: "partner_credentials",
    data: {
      email: "partner@email.com",
      temp_password: "TempPass123!",
      partner_name: "Mario Rossi",
      console_url: "https://s2p-console.lovable.app",
    },
  }),
});
```

### Requisiti DNS su Aruba per Resend

Configurare su Aruba i record DNS forniti da Resend per il dominio shower2pet.it (MX, TXT per SPF/DKIM).
Finché i DNS non sono verificati, Resend invierà da un dominio temporaneo.
