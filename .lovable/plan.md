

## Piano: Gestire tutte le email con Resend

### Approccio: SMTP di Resend per le email di autenticazione

Il modo più semplice e affidabile è configurare Resend come provider SMTP custom nelle impostazioni Auth di Supabase. Questo permette di inviare tutte le email (auth + transazionali) dal dominio `shower2pet.it` tramite Resend, senza creare hook aggiuntivi.

### Cosa serve

#### 1. Configurazione su Resend Dashboard
Dalla dashboard di Resend (resend.com/domains), il dominio `shower2pet.it` è già verificato. Serve solo recuperare le credenziali SMTP:

- Vai su **resend.com/settings/smtp**
- Le credenziali SMTP sono:
  - **Host:** `smtp.resend.com`
  - **Port:** `465` (SSL) oppure `587` (STARTTLS)
  - **Username:** `resend`
  - **Password:** la tua API Key (la stessa `RESEND_API_KEY` già configurata)

#### 2. Configurazione su Supabase Dashboard
Vai su **Supabase Dashboard → Authentication → SMTP Settings** (`https://supabase.com/dashboard/project/rbdzinajiyswzdeoenil/auth/smtp`):

- Abilita **Custom SMTP**
- **Sender email:** `noreply@shower2pet.it`
- **Sender name:** `Shower2Pet`
- **Host:** `smtp.resend.com`
- **Port:** `465`
- **Username:** `resend`
- **Password:** incolla la tua Resend API Key
- **Minimum interval:** 30 secondi (o come preferisci)

#### 3. Personalizzazione template Auth in Supabase
Nella stessa sezione Auth → **Email Templates** (`https://supabase.com/dashboard/project/rbdzinajiyswzdeoenil/auth/templates`), personalizza i template HTML per:

- **Confirm signup** — conferma registrazione
- **Reset password** — recupero password
- **Magic link** — accesso con link
- **Change email** — cambio email

#### 4. Modifiche al codice (Edge Function `send-email`)
Aggiungere template brandizzati per le email auth (opzionale, se vuoi gestire anche le auth email via Edge Function in futuro), ma con l'approccio SMTP non serve nessuna modifica al codice. Le email auth passano direttamente da Supabase → Resend SMTP.

### Risultato finale

```text
Supabase Auth (SMTP → Resend)        Edge Function (API → Resend)
┌──────────────────────────┐         ┌──────────────────────────┐
│ Conferma registrazione   │         │ Conferma acquisto        │
│ Reset password           │         │ Crediti acquistati       │
│ Magic link               │         │ Abbonamento attivato     │
│ Cambio email             │         │ Credenziali partner      │
│                          │         │ Ticket manutenzione      │
└──────────────────────────┘         └──────────────────────────┘
  smtp.resend.com                      send-email → Resend API
  Template: Supabase Dashboard         Template: Edge Function
  Dominio: shower2pet.it               Dominio: shower2pet.it
```

### Riepilogo passi

| # | Dove | Azione |
|---|------|--------|
| 1 | Resend Dashboard | Verificare credenziali SMTP (già disponibili) |
| 2 | Supabase Dashboard → Auth → SMTP | Configurare SMTP custom con le credenziali Resend |
| 3 | Supabase Dashboard → Auth → Templates | Personalizzare i 4 template HTML con branding Shower2Pet |
| 4 | Nessuna modifica al codice | Le email transazionali funzionano già via `send-email` |

**Nessuna modifica al codice è necessaria.** Serve solo configurazione nelle due dashboard. Se vuoi posso fornirti i template HTML brandizzati da incollare nella sezione Email Templates di Supabase.

