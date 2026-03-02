

## Email nell'ecosistema Shower2Pet — Analisi e Piano

### Due categorie di email

Le email che ti servono si dividono in due categorie fondamentalmente diverse:

**1. Email di autenticazione** (gestite da Supabase Auth):
- Conferma registrazione account
- Recupero password
- Magic link (se lo usi)

**2. Email transazionali/operative** (NON gestite da Supabase Auth):
- Conferma acquisto + scontrino PDF dopo un lavaggio
- Invio credenziali temporanee al partner durante l'onboarding
- Notifica apertura/chiusura ticket di manutenzione
- Conferma acquisto pacchetto crediti
- Conferma attivazione/rinnovo abbonamento

### Cosa puoi fare con l'infrastruttura attuale

Supabase da solo **non basta** per la seconda categoria. Supabase Auth gestisce solo le email di autenticazione (categoria 1), ma non ha un servizio di invio email generico.

### Cosa ti serve in più

Hai bisogno di un **servizio di invio email** (SMTP relay o API). Le opzioni principali:

| Servizio | Come funziona | Costo |
|----------|--------------|-------|
| **Resend** | API moderna, si integra bene con Edge Functions | Gratuito fino a 100 email/giorno |
| **SMTP di Aruba** | Usi il tuo dominio shower2pet.it direttamente | Già incluso nel tuo hosting |
| **SendGrid / Mailgun** | API + SMTP | Piano gratuito disponibile |

### Usare il dominio shower2pet.it con Aruba

Si, e possibile. Hai due strade:

**Opzione A — SMTP Aruba direttamente dalle Edge Functions:**
- Usi le credenziali SMTP di Aruba (host, porta, user, password) come secrets in Supabase
- Le Edge Functions inviano email via SMTP usando il tuo dominio
- Vantaggio: zero costi aggiuntivi, email da `noreply@shower2pet.it`
- Svantaggio: Deno (Edge Functions) ha supporto SMTP limitato, richiede librerie specifiche

**Opzione B — Resend con dominio custom (consigliata):**
- Configuri il dominio shower2pet.it su Resend (aggiungendo record DNS su Aruba)
- Le Edge Functions chiamano l'API Resend (molto semplice, HTTP POST)
- Le email arrivano da `noreply@shower2pet.it`
- Vantaggio: affidabilita, deliverability, semplicissimo da integrare
- Svantaggio: limite 100 email/giorno nel piano gratuito (poi $20/mese per 50k email)

### Piano di implementazione proposto

**Fase 1 — Scegliere il provider e configurare il dominio**

**Fase 2 — Creare una Edge Function `send-email`** che accetta tipo di email, destinatario e dati, e invia tramite il provider scelto.

**Fase 3 — Creare i template HTML** per ogni tipo di email:
- Conferma acquisto (con link/allegato scontrino)
- Credenziali partner
- Notifica ticket manutenzione
- Conferma crediti/abbonamento

**Fase 4 — Integrare le chiamate** nei flussi esistenti:
- `stripe-webhook` → dopo pagamento confermato, chiama `send-email`
- `create-checkout` → per guest, dopo conferma
- Onboarding partner (dalla Console) → invio credenziali
- `maintenance_logs` → notifica apertura ticket

**Fase 5 — Email di autenticazione custom** (opzionale):
- Personalizzare le email di Supabase Auth con il branding Shower2Pet usando il sistema Lovable Auth Email Templates

### Decisione necessaria

Prima di procedere serve sapere quale provider email vuoi usare.

