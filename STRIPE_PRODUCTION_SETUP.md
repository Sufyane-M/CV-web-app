# 🚀 Guida Completa: Passaggio Stripe da Test a Produzione

## 📋 Panoramica

Questa guida ti accompagnerà nel passaggio dalla modalità test alla modalità di produzione per l'integrazione Stripe del tuo CV Analyzer deployato su Vercel.

## ⚠️ IMPORTANTE - Prima di Iniziare

**ATTENZIONE**: La modalità di produzione di Stripe processa pagamenti reali. Assicurati di:
- Aver completato tutti i test in modalità sviluppo
- Aver verificato che l'applicazione funzioni correttamente
- Aver attivato il tuo account Stripe per i pagamenti live

## 🔑 Passo 1: Ottenere le Chiavi API Live di Stripe

### 1.1 Accedi al Dashboard Stripe
1. Vai su [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Effettua il login con il tuo account Stripe
3. **IMPORTANTE**: Assicurati di essere in modalità "Live" (non "Test") - controlla l'interruttore in alto a destra

### 1.2 Ottieni la Chiave Pubblica Live
1. Nel dashboard, vai su **"Developers" → "API keys"**
2. Nella sezione **"Standard keys"**, trova **"Publishable key"**
3. Copia la chiave che inizia con `pk_live_...`
4. **Salva questa chiave** - la userai per `VITE_STRIPE_PUBLISHABLE_KEY`

### 1.3 Ottieni la Chiave Segreta Live
1. Nella stessa pagina, trova **"Secret key"**
2. Clicca su **"Reveal live key"**
3. Copia la chiave che inizia con `sk_live_...`
4. **Salva questa chiave** - la userai per `STRIPE_SECRET_KEY`

⚠️ **SICUREZZA**: Non condividere mai la chiave segreta e non commitarla nel repository!

## 🛍️ Passo 2: Creare Prodotti e Prezzi in Modalità Live

### 2.1 Creare i Prodotti
1. Nel dashboard Stripe, vai su **"Products"**
2. Clicca **"+ Add product"**

#### Prodotto 1: Pacchetto Base
- **Name**: `Pacchetto Base`
- **Description**: `Ideale per chi vuole testare il nostro servizio`
- **Pricing**: 
  - **Price**: `4.99`
  - **Currency**: `EUR`
  - **Billing**: `One time`
- Clicca **"Save product"**
- **Copia il Price ID** (inizia con `price_...`) - lo userai per `STRIPE_PRICE_ID_STARTER`

#### Prodotto 2: Pacchetto Premium
- **Name**: `Pacchetto Premium`
- **Description**: `La scelta migliore per chi cerca il massimo valore`
- **Pricing**: 
  - **Price**: `9.99`
  - **Currency**: `EUR`
  - **Billing**: `One time`
- Clicca **"Save product"**
- **Copia il Price ID** (inizia con `price_...`) - lo userai per `STRIPE_PRICE_ID_VALUE`

### 2.2 Aggiornare la Configurazione dei Bundle
Dopo aver creato i prodotti, aggiorna il file `api/routes/stripe.js` con i nuovi Price ID:

```javascript
// Sostituisci nella configurazione BUNDLES
const BUNDLES = {
  starter: {
    id: 'starter',
    name: 'Pacchetto Base',
    price: 4.99,
    credits: 4,
    currency: 'EUR',
    description: 'Ideale per chi vuole testare il nostro servizio',
    stripePriceId: 'price_TUO_PRICE_ID_STARTER_LIVE' // Sostituisci con il tuo Price ID
  },
  value: {
    id: 'value',
    name: 'Pacchetto Premium',
    price: 9.99,
    credits: 10,
    currency: 'EUR',
    description: 'La scelta migliore per chi cerca il massimo valore',
    stripePriceId: 'price_TUO_PRICE_ID_VALUE_LIVE' // Sostituisci con il tuo Price ID
  }
};
```

## 🔗 Passo 3: Configurare il Webhook Live

### 3.1 Creare il Webhook Endpoint
1. Nel dashboard Stripe, vai su **"Developers" → "Webhooks"**
2. Clicca **"+ Add endpoint"**
3. **Endpoint URL**: `https://TUO-DOMINIO-VERCEL.vercel.app/api/stripe/webhook`
   - Sostituisci `TUO-DOMINIO-VERCEL` con il tuo dominio Vercel effettivo
4. **Events to send**: Seleziona questi eventi:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Clicca **"Add endpoint"**

### 3.2 Ottenere il Webhook Secret
1. Dopo aver creato il webhook, clicca su di esso
2. Nella sezione **"Signing secret"**, clicca **"Reveal"**
3. Copia il secret che inizia con `whsec_...`
4. **Salva questo secret** - lo userai per `STRIPE_WEBHOOK_SECRET`

## 🌐 Passo 4: Configurare le Variabili d'Ambiente su Vercel

### 4.1 Accedere alle Impostazioni Vercel
1. Vai su [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Seleziona il tuo progetto CV Analyzer
3. Vai su **"Settings" → "Environment Variables"**

### 4.2 Aggiornare le Variabili d'Ambiente
Aggiungi/aggiorna queste variabili per **Production**:

```env
# Stripe Live Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_[TUA_CHIAVE_PUBBLICA_LIVE]
STRIPE_SECRET_KEY=sk_live_[TUA_CHIAVE_SEGRETA_LIVE]
STRIPE_WEBHOOK_SECRET=whsec_[TUO_WEBHOOK_SECRET_LIVE]

# Price IDs Live
STRIPE_PRICE_ID_STARTER=price_TUO_PRICE_ID_STARTER_LIVE
STRIPE_PRICE_ID_VALUE=price_TUO_PRICE_ID_VALUE_LIVE

# Environment
NODE_ENV=production
```

### 4.3 Rideploy dell'Applicazione
Dopo aver aggiornato le variabili d'ambiente:
1. Vai su **"Deployments"**
2. Clicca sui tre puntini dell'ultimo deployment
3. Seleziona **"Redeploy"**
4. Attendi il completamento del deployment

## 📝 Passo 5: Aggiornare il File .env Locale

Per i test locali in modalità produzione, aggiorna il file `.env`:

```env
# Environment
NODE_ENV=production

# Stripe Live Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_[TUA_CHIAVE_PUBBLICA_LIVE]
STRIPE_SECRET_KEY=sk_live_[TUA_CHIAVE_SEGRETA_LIVE]
STRIPE_WEBHOOK_SECRET=whsec_[TUO_WEBHOOK_SECRET_LIVE]

# Price IDs Live
STRIPE_PRICE_ID_STARTER=price_TUO_PRICE_ID_STARTER_LIVE
STRIPE_PRICE_ID_VALUE=price_TUO_PRICE_ID_VALUE_LIVE
```

## 🧪 Passo 6: Test della Modalità Live

### 6.1 Test Preliminari
1. Accedi alla tua applicazione su Vercel
2. Vai alla pagina dei prezzi
3. **NON cliccare ancora sui pulsanti di pagamento** - prima verifica la configurazione

### 6.2 Verificare la Configurazione
1. Apri gli strumenti per sviluppatori del browser (F12)
2. Vai alla tab **"Network"**
3. Clicca su un pulsante di pagamento
4. Verifica che la richiesta a `/api/stripe/create-checkout-session` restituisca un URL Stripe valido

### 6.3 Test con Pagamento Reale
⚠️ **ATTENZIONE**: Questo processerà un pagamento reale!

1. Usa una carta di credito reale (non le carte di test)
2. Completa il pagamento
3. Verifica che:
   - Il pagamento sia visibile nel dashboard Stripe
   - I crediti siano stati aggiunti al tuo account
   - Il webhook abbia funzionato correttamente

## 🔍 Passo 7: Monitoraggio e Verifica

### 7.1 Dashboard Stripe
- Monitora i pagamenti in **"Payments"**
- Controlla i webhook in **"Developers" → "Webhooks"**
- Verifica gli eventi in **"Developers" → "Events"**

### 7.2 Log Vercel
```bash
# Visualizza i log in tempo reale
vercel logs --follow
```

### 7.3 Database Supabase
Verifica che le transazioni siano registrate correttamente nella tabella `payments`.

## ✅ Checklist Finale

- [ ] Chiavi API live configurate su Vercel
- [ ] Prodotti creati in modalità live su Stripe
- [ ] Webhook configurato e funzionante
- [ ] Variabili d'ambiente aggiornate
- [ ] Applicazione ridisployata
- [ ] Test di pagamento completato con successo
- [ ] Crediti aggiunti correttamente
- [ ] Monitoraggio attivo

## 🆘 Risoluzione Problemi

### Errore: "Stripe not configured"
- Verifica che le variabili d'ambiente siano impostate correttamente su Vercel
- Assicurati di aver ridisployato dopo aver aggiornato le variabili

### Webhook non funziona
- Verifica che l'URL del webhook sia corretto
- Controlla che il webhook secret sia impostato correttamente
- Verifica i log del webhook nel dashboard Stripe

### Pagamenti non processati
- Controlla i log di Vercel per errori
- Verifica che i Price ID siano corretti
- Assicurati che l'account Stripe sia attivato per i pagamenti live

## 📞 Supporto

Se incontri problemi:
1. Controlla i log di Vercel: `vercel logs`
2. Verifica gli eventi nel dashboard Stripe
3. Consulta la documentazione Stripe: [https://stripe.com/docs](https://stripe.com/docs)

---

**🎉 Congratulazioni!** Hai configurato con successo Stripe in modalità di produzione per il tuo CV Analyzer!