# Guida al Testing dell'Integrazione Stripe in Produzione

## 🚨 ATTENZIONE - MODALITÀ LIVE

Quando si testa l'integrazione Stripe in modalità LIVE, si utilizzano **denaro reale** e **carte di credito reali**. Seguire sempre le procedure di sicurezza descritte in questa guida.

## 📋 Prerequisiti

### 1. Configurazione Completata
- ✅ Chiavi API Live configurate
- ✅ Prodotti e prezzi creati in Stripe Dashboard
- ✅ Webhook configurato e funzionante
- ✅ Variabili d'ambiente aggiornate su Vercel
- ✅ Applicazione deployata in produzione

### 2. Accesso agli Strumenti
- Dashboard Stripe (modalità Live)
- Console Vercel
- Terminale con accesso al progetto
- Carte di test Stripe (per test sicuri)

## 🧪 Script di Test Automatizzati

### Comandi Disponibili

```bash
# Verifica configurazione
npm run test:stripe:config

# Test connessione API
npm run test:stripe:api

# Test endpoint webhook
npm run test:stripe:webhook

# Monitora pagamenti recenti
npm run test:stripe:monitor

# Test completo (tutti i controlli)
npm run test:stripe:full
```

### 1. Verifica Configurazione

```bash
npm run test:stripe:config
```

**Cosa verifica:**
- Presenza di tutte le variabili d'ambiente
- Validità delle chiavi API (Live vs Test)
- Configurazione dei Price ID
- Modalità operativa corrente

**Output atteso:**
```
✅ VITE_STRIPE_PUBLISHABLE_KEY: pk_live_[xxxxx...] (LIVE)
✅ STRIPE_SECRET_KEY: sk_live_[xxxxx...] (LIVE)
✅ STRIPE_WEBHOOK_SECRET: whsec_[xxxxx...]
✅ STRIPE_PRICE_ID_STARTER: price_xxxxx
✅ STRIPE_PRICE_ID_VALUE: price_xxxxx

🔴 MODALITÀ: LIVE/PRODUCTION
⚠️  ATTENZIONE: I pagamenti saranno reali!
```

### 2. Test API Stripe

```bash
npm run test:stripe:api
```

**Cosa testa:**
- Connessione all'API Stripe
- Recupero informazioni account
- Lista prodotti e prezzi
- Validità dei Price ID configurati

**Possibili problemi:**
- Chiavi API non valide
- Price ID inesistenti
- Problemi di connessione

### 3. Test Webhook Endpoint

```bash
npm run test:stripe:webhook
```

**Cosa testa:**
- Raggiungibilità dell'endpoint webhook
- Risposta corretta del server
- Configurazione dell'endpoint

**URL testato:** `https://your-app.vercel.app/api/stripe/webhook`

### 4. Monitoraggio Pagamenti

```bash
npm run test:stripe:monitor
```

**Cosa mostra:**
- Ultimi Payment Intents (24h)
- Ultime Checkout Sessions (24h)
- Stato dei pagamenti
- Importi e valute

### 5. Test Completo

```bash
npm run test:stripe:full
```

**Esegue tutti i test in sequenza e fornisce un riepilogo completo.**

## 🔒 Procedure di Sicurezza per Test Live

### 1. Test con Importi Minimi

**SEMPRE utilizzare importi minimi per i test:**
- €0.50 - €1.00 per test di funzionalità
- Evitare importi elevati durante i test

### 2. Carte di Test in Modalità Live

**Stripe fornisce carte speciali per test in modalità Live:**

```
# Carta che viene sempre approvata (importi bassi)
4242 4242 4242 4242
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura

# Carta che viene sempre rifiutata
4000 0000 0000 0002
```

⚠️ **IMPORTANTE:** Anche in modalità Live, queste carte non addebitano denaro reale.

### 3. Monitoraggio in Tempo Reale

**Durante i test, monitorare:**

1. **Dashboard Stripe:**
   - Sezione "Payments" per nuovi pagamenti
   - Sezione "Events" per webhook
   - Sezione "Logs" per errori

2. **Console Vercel:**
   - Logs delle funzioni serverless
   - Errori di runtime
   - Performance delle API

3. **Database/Applicazione:**
   - Crediti aggiunti correttamente
   - Stato utente aggiornato
   - Email di conferma inviate

## 🧾 Procedura di Test Completa

### Fase 1: Pre-Test

```bash
# 1. Verifica configurazione
npm run test:stripe:config

# 2. Test connessione API
npm run test:stripe:api

# 3. Test webhook
npm run test:stripe:webhook
```

**Tutti i test devono passare prima di procedere.**

### Fase 2: Test Funzionale

1. **Apri l'applicazione in produzione**
   ```
   https://your-app.vercel.app
   ```

2. **Naviga alla sezione acquisto crediti**

3. **Seleziona un pacchetto (es. Starter)**

4. **Procedi al checkout**
   - Verifica che l'URL sia `checkout.stripe.com`
   - Verifica che i dettagli del prodotto siano corretti
   - Verifica l'importo

5. **Completa il pagamento con carta di test**
   ```
   Carta: 4242 4242 4242 4242
   CVC: 123
   Data: 12/25
   ```

6. **Verifica il redirect di successo**
   - L'utente deve essere reindirizzato alla pagina di successo
   - I crediti devono essere aggiunti al profilo
   - Email di conferma deve essere inviata

### Fase 3: Verifica Post-Pagamento

```bash
# Monitora i pagamenti recenti
npm run test:stripe:monitor
```

**Verifica in Stripe Dashboard:**
1. Vai su "Payments" → "All payments"
2. Trova il pagamento appena effettuato
3. Verifica stato "Succeeded"
4. Controlla i metadati del pagamento

**Verifica nell'applicazione:**
1. Login con l'account di test
2. Controlla il saldo crediti
3. Verifica la cronologia acquisti
4. Testa l'utilizzo dei crediti

### Fase 4: Test Scenari di Errore

1. **Pagamento rifiutato:**
   ```
   Carta: 4000 0000 0000 0002
   ```
   - Verifica gestione errore
   - Verifica che i crediti NON vengano aggiunti

2. **Pagamento annullato:**
   - Clicca "Indietro" durante il checkout
   - Verifica redirect alla pagina di annullamento

3. **Webhook failure simulation:**
   - Temporaneamente disabilita il webhook
   - Effettua un pagamento
   - Verifica che Stripe riprovi l'invio
   - Riabilita il webhook

## 📊 Monitoraggio e Logging

### 1. Stripe Dashboard

**Sezioni da monitorare:**
- **Payments:** Tutti i pagamenti in tempo reale
- **Events:** Eventi webhook inviati
- **Logs:** Errori e problemi API
- **Disputes:** Eventuali contestazioni

### 2. Vercel Analytics

**Metriche da controllare:**
- Tempo di risposta API `/api/stripe/*`
- Errori 4xx/5xx
- Utilizzo memoria funzioni
- Invocazioni per minuto

### 3. Logs Applicazione

**Implementare logging per:**
```javascript
// Esempio di logging nel webhook
console.log('Stripe webhook received:', {
  type: event.type,
  id: event.id,
  amount: event.data.object.amount,
  customer: event.data.object.customer
});
```

## 🚨 Gestione Errori Comuni

### 1. Webhook Non Ricevuto

**Sintomi:**
- Pagamento completato in Stripe
- Crediti non aggiunti nell'app

**Soluzioni:**
```bash
# Verifica endpoint
npm run test:stripe:webhook

# Controlla logs Vercel
vercel logs --follow

# Verifica configurazione webhook in Stripe
```

### 2. Price ID Non Trovato

**Sintomi:**
- Errore durante creazione checkout session
- "No such price" in logs

**Soluzioni:**
```bash
# Verifica Price ID configurati
npm run test:stripe:api

# Aggiorna .env.production con Price ID corretti
```

### 3. Chiavi API Non Valide

**Sintomi:**
- Errori di autenticazione
- "Invalid API key" in logs

**Soluzioni:**
```bash
# Verifica configurazione
npm run test:stripe:config

# Rigenera chiavi in Stripe Dashboard se necessario
```

## ✅ Checklist Pre-Produzione

### Configurazione
- [ ] Chiavi API Live configurate
- [ ] Price ID Live configurati
- [ ] Webhook Live configurato
- [ ] Variabili d'ambiente aggiornate su Vercel
- [ ] SSL/HTTPS attivo

### Test Funzionali
- [ ] Test configurazione passato
- [ ] Test API passato
- [ ] Test webhook passato
- [ ] Pagamento di test completato con successo
- [ ] Crediti aggiunti correttamente
- [ ] Email di conferma ricevuta
- [ ] Test pagamento rifiutato
- [ ] Test annullamento pagamento

### Monitoraggio
- [ ] Dashboard Stripe configurato
- [ ] Alerts Vercel attivi
- [ ] Logging applicazione implementato
- [ ] Backup procedure definite

### Sicurezza
- [ ] Webhook secret configurato
- [ ] Rate limiting implementato
- [ ] Validazione input attiva
- [ ] Logs non contengono dati sensibili

## 📞 Supporto e Risorse

### Documentazione
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Vercel Functions](https://vercel.com/docs/functions)

### Contatti di Emergenza
- Stripe Support: [support.stripe.com](https://support.stripe.com)
- Vercel Support: [vercel.com/support](https://vercel.com/support)

### Comandi di Emergenza

```bash
# Rollback rapido a modalità test
npm run env:test
npm run deploy:test

# Disabilita webhook temporaneamente
# (da fare manualmente in Stripe Dashboard)

# Monitora errori in tempo reale
vercel logs --follow
```

---

**⚠️ RICORDA:** In modalità Live, ogni transazione è reale. Testa sempre con importi minimi e carte di test quando possibile.