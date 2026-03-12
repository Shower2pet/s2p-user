

# Checklist di Testing - Shower2Pet User App

Ecco la checklist completa in formato Markdown con checkbox, pronta per Notion:

```markdown
# 🧪 Testing Checklist - Shower2Pet User App

## 1. UI/UX

- [ ] Ottimizzare layout mobile-first (375px, 390px, 414px)
- [ ] Rendere decente per desktop (1280px+)
- [ ] Controllare tutte le traduzioni IT/EN (chiavi mancanti, testi coerenti)
- [ ] Rendere uniforme stile (spaziature, font, colori, bordi)
- [ ] Decidere sfondo (gradient, colore solido, pattern)
- [ ] Verificare banner installazione PWA su mobile
- [ ] Verificare touch target minimi (44x44px) su mobile

## 2. Gestione Profilo Utente

### 2.1 Registrazione
- [ ] Registrazione con email e password
- [ ] Verificare che non si possa registrare più di un utente con la stessa email
- [ ] Verificare invio email di conferma
- [ ] Registrazione con account Google

### 2.2 Login
- [ ] Login con email e password
- [ ] Login con credenziali errate (messaggio errore corretto)
- [ ] Flusso "Password dimenticata" (invio email, reset, nuovo login)
- [ ] Login con account Google
- [ ] Verificare URL visualizzato durante OAuth Google

### 2.3 Logout
- [ ] Logout funzionante
- [ ] Dopo logout, redirect a login e nessun accesso a pagine protette

### 2.4 Cancellazione Profilo
- [ ] ⚠️ **DA IMPLEMENTARE** — Dialog di conferma, eliminazione da Supabase Auth, pulizia dati correlati

## 3. Gestione Stazioni

### 3.1 Visualizzazione Home
- [ ] Visualizzazione corretta dati stazione nella lista
- [ ] Visualizzazione corretta su mappa (marker, popup)
- [ ] Informazioni stazione (nome, indirizzo, tipo)
- [ ] Stato stazione corretto

### 3.2 Stazioni Vetrina (Showcase)
- [ ] Marker viola con icona ✨ nella lista e sulla mappa
- [ ] Nessuna opzione di pagamento/attivazione
- [ ] Banner informativo nella pagina dettaglio
- [ ] Visibili anche senza struttura/owner associato

### 3.3 Visibilità e Stato
- [ ] Corretta visibilità in base alla configurazione del partner (PUBLIC, RESTRICTED)
- [ ] Stato "Disponibile" visualizzato correttamente
- [ ] Stato "Offline" visualizzato correttamente
- [ ] Stato "Occupato" visualizzato correttamente
- [ ] Stato "Manutenzione" visualizzato correttamente

### 3.4 Accesso Limitato
- [ ] Funzionamento porta automatica (gate command)
- [ ] Funzionamento codice di sblocco

### 3.5 Segnalazioni
- [ ] Invio ticket/segnalazione problema
- [ ] Verifica ricezione ticket lato partner

## 4. Pagamento

### 4.1 Opzioni di Lavaggio
- [ ] Visualizzazione corretta delle opzioni di lavaggio per stazione
- [ ] Prezzi e durate corretti

### 4.2 Acquisto Crediti
- [ ] Visualizzazione pacchetti crediti disponibili
- [ ] Flusso pagamento Stripe per crediti
- [ ] Scontrino ricevuto via email
- [ ] Scontrino visibile nella pagina storico
- [ ] Crediti aggiunti correttamente al wallet

### 4.3 Selezione Metodo di Pagamento
- [ ] Crediti selezionati di default se sufficienti
- [ ] Possibilità di scegliere Stripe se si preferisce

### 4.4 Pagamento Lavaggio Singolo
- [ ] Pagamento con crediti — crediti scalati correttamente
- [ ] Pagamento con Stripe — flusso completo
- [ ] Redirect corretto dopo pagamento Stripe (successo/errore)

### 4.5 Abbonamenti B2C
- [ ] Acquisto piano abbonamento
- [ ] Utilizzo abbonamento per pagare lavaggi
- [ ] Verifica limiti mensili di utilizzo
- [ ] Gestione portale cliente Stripe (disdetta, modifica)

### 4.6 Flusso Guest (senza account)
- [ ] Acquisto lavaggio senza registrazione
- [ ] Inserimento email per ricevuta
- [ ] Ricezione scontrino via email
- [ ] Nessun accesso a crediti/abbonamenti

## 5. Lavaggio

### 5.1 Pre-lavaggio
- [ ] Visualizzazione regole/informazioni necessarie prima del lavaggio
- [ ] Conferma accettazione regole

### 5.2 Avvio Lavaggio
- [ ] Accensione relè corretta dopo conferma utente
- [ ] Prevenzione doppio click su "Avvia Servizio"

### 5.3 Timer Lavaggio
- [ ] Timer visualizzato correttamente durante il lavaggio
- [ ] Timer persiste correttamente dopo ricarica pagina
- [ ] Timer persiste dopo cambio pagina e ritorno
- [ ] Comportamento corretto se si chiude completamente la pagina (sessione scade lato server)

### 5.4 Flusso Pulizia — DOCCIA (Bracco)
- [ ] Prompt richiesta pulizia zona lavaggio
- [ ] Se sporco: +1 minuto di lavaggio per pulire, poi stop
- [ ] Se pulito: fine diretta

### 5.5 Flusso Pulizia — VASCA (Setter)
- [ ] Prompt richiesta pulizia manuale vasca
- [ ] Prompt avviso pulizia automatica
- [ ] Conferma rimozione cane dalla vasca
- [ ] Countdown 30 secondi pulizia automatica (corretto dopo refresh)
- [ ] Monitoraggio flusso pulizia automatica (relè corretto)
- [ ] Fine pulizia automatica

### 5.6 Fine Lavaggio
- [ ] Schermata di fine lavaggio corretta
- [ ] Sessione salvata nello storico

### 5.7 Rating
- [ ] ⚠️ **DA IMPLEMENTARE** — Salvataggio stelle nel database, calcolo media per stazione, visualizzazione in dettaglio stazione e console partner

## 6. Storico e Ricevute

- [ ] Pagina storico lavaggi con lista completa
- [ ] Download PDF ricevuta per ogni transazione
- [ ] Email di conferma ricevuta dopo ogni acquisto

## 7. Edge Cases Critici

- [ ] Stazione va offline dopo il pagamento ma prima dell'avvio
- [ ] Fallimento redirect Stripe (utente torna senza completare)
- [ ] Comportamento con connessione instabile durante il lavaggio
- [ ] Scadenza sessione lato server (check-expired-sessions)
- [ ] Tentativo di avvio lavaggio su stazione già occupata
- [ ] Doppio pagamento simultaneo sulla stessa stazione
```

