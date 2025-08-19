# 🚀 Configurazione Produzione Vercel per CV Analyzer

Questa guida ti accompagna nella configurazione completa dell'ambiente di produzione su Vercel con Stripe in modalità LIVE.

## 📋 Prerequisiti

- [ ] Account Stripe con accesso alle chiavi LIVE
- [ ] Progetto deployato su Vercel
- [ ] Accesso al dashboard Vercel del progetto
- [ ] Prodotti e prezzi creati su Stripe Dashboard in modalità LIVE

## 🔧 Configurazione Variabili d'Ambiente su Vercel

### 1. Accedi al Dashboard Vercel

1. Vai su [vercel.com](https://vercel.com)
2. Accedi al tuo account
3. Seleziona il progetto CV Analyzer
4. Vai su **Settings** → **Environment Variables**

### 2. Configura le Variabili d'Ambiente

Aggiungi le seguenti variabili per l'ambiente **Production**:

#### Variabili Stripe LIVE
```bash
# Chiavi Stripe LIVE (ottieni da https://dashboard.stripe.com/apikeys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_[YOUR_PUBLISHABLE_KEY]
STRIPE_SECRET_KEY=sk_live_[YOUR_SECRET_KEY]
STRIPE_WEBHOOK_SECRET=whsec_[YOUR_WEBHOOK_SECRET]

# Price ID dei prodotti LIVE (ottieni da https://dashboard.stripe.com/products)
STRIPE_PRICE_ID_STARTER=price_[YOUR_STARTER_PRICE_ID]
STRIPE_PRICE_ID_VALUE=price_[YOUR_VALUE_PRICE_ID]
```

#### Variabili Applicazione
```bash
# Configurazione ambiente
NODE_ENV=production
VITE_APP_URL=https://your-domain.vercel.app

# Database (se applicabile)
DATABASE_URL=your_production_database_url

# Altre variabili specifiche dell'app
JWT_SECRET=your_jwt_secret_for_production
API_BASE_URL=https://your-domain.vercel.app/api
```

### 3. Configurazione Webhook Stripe

#### Opzione A: Configurazione Automatica (Consigliata)

1. **Installa le dipendenze** (se non già fatto):
   ```bash
   npm install stripe dotenv
   ```

2. **Esegui lo script di setup**:
   ```bash
   # Sostituisci 'your-domain.vercel.app' con il tuo dominio reale
   node scripts/setup-stripe-webhook.js --domain your-domain.vercel.app
   ```

3. **Copia il Webhook Secret** generato e aggiungilo alle variabili d'ambiente di Vercel

#### Opzione B: Configurazione Manuale

1. **Accedi al Stripe Dashboard**:
   - Vai su [dashboard.stripe.com](https://dashboard.stripe.com)
   - Assicurati di essere in modalità **LIVE** (non Test)

2. **Crea il Webhook**:
   - Vai su **Developers** → **Webhooks**
   - Clicca **Add endpoint**
   - URL endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
   - Eventi da selezionare:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`

3. **Ottieni il Webhook Secret**:
   - Dopo aver creato il webhook, clicca su di esso
   - Nella sezione **Signing secret**, clicca **Reveal**
   - Copia il valore che inizia con `whsec_`

4. **Aggiungi il Secret a Vercel**:
   - Torna alle Environment Variables di Vercel
   - Aggiungi `STRIPE_WEBHOOK_SECRET` con il valore copiato

## 🏗️ Deploy e Test

### 1. Rideploy dell'Applicazione

Dopo aver configurato tutte le variabili d'ambiente:

1. **Trigger nuovo deploy**:
   - Vai su **Deployments** nel dashboard Vercel
   - Clicca sui tre puntini dell'ultimo deploy
   - Seleziona **Redeploy**
   - Oppure fai un nuovo commit e push al repository

2. **Verifica il deploy**:
   - Attendi che il deploy sia completato
   - Controlla che non ci siano errori nei logs

### 2. Test dell'Integrazione

#### Test Webhook
1. **Verifica endpoint webhook**:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/stripe/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

2. **Controlla i logs Vercel**:
   - Vai su **Functions** → **View Function Logs**
   - Verifica che l'endpoint risponda correttamente

#### Test Pagamento Reale

⚠️ **ATTENZIONE**: Questi test utilizzano denaro reale!

1. **Test con carta di credito reale**:
   - Vai alla tua applicazione in produzione
   - Prova ad acquistare un pacchetto
   - Usa una carta di credito reale con importo minimo

2. **Verifica su Stripe Dashboard**:
   - Controlla che il pagamento appaia in **Payments**
   - Verifica che il webhook sia stato chiamato in **Webhooks** → **Logs**

3. **Verifica nell'applicazione**:
   - Controlla che i crediti siano stati aggiunti correttamente
   - Verifica che l'utente possa utilizzare i crediti

## 🔍 Troubleshooting

### Problemi Comuni

#### 1. Webhook non ricevuto
- **Verifica URL**: Assicurati che l'URL del webhook sia corretto
- **Controlla logs**: Verifica i logs di Vercel per errori
- **Test manuale**: Usa il "Send test webhook" di Stripe

#### 2. Errori di autenticazione
- **Chiavi corrette**: Verifica che le chiavi Stripe siano in modalità LIVE
- **Variabili ambiente**: Controlla che tutte le variabili siano configurate
- **Redeploy**: Assicurati di aver fatto redeploy dopo le modifiche

#### 3. Price ID non trovati
- **Modalità corretta**: Verifica che i Price ID siano di modalità LIVE
- **Esistenza prodotti**: Controlla che i prodotti esistano su Stripe
- **Copia corretta**: Verifica di aver copiato correttamente gli ID

### Comandi di Debug

```bash
# Verifica variabili d'ambiente locali
node -e "console.log(process.env.STRIPE_SECRET_KEY?.substring(0, 10))"

# Test connessione Stripe
node -e "const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); stripe.products.list().then(console.log)"

# Verifica webhook endpoint
curl -I https://your-domain.vercel.app/api/stripe/webhook
```

## 📊 Monitoraggio

### Dashboard da Monitorare

1. **Vercel Dashboard**:
   - **Functions**: Monitora le chiamate API
   - **Analytics**: Traffico e performance
   - **Logs**: Errori e debug

2. **Stripe Dashboard**:
   - **Payments**: Transazioni in tempo reale
   - **Webhooks**: Stato e logs dei webhook
   - **Disputes**: Eventuali contestazioni

3. **Applicazione**:
   - **Database**: Stato crediti utenti
   - **Logs applicazione**: Errori business logic

### Metriche Importanti

- **Tasso di successo pagamenti**: >95%
- **Tempo risposta webhook**: <2 secondi
- **Errori 5xx**: <1%
- **Uptime applicazione**: >99.9%

## 🔒 Sicurezza

### Best Practices

1. **Chiavi API**:
   - Non committare mai chiavi nel codice
   - Usa sempre variabili d'ambiente
   - Rota le chiavi periodicamente

2. **Webhook**:
   - Verifica sempre la firma del webhook
   - Usa HTTPS per tutti gli endpoint
   - Implementa idempotenza

3. **Monitoraggio**:
   - Configura alerting per errori
   - Monitora transazioni anomale
   - Log delle attività sensibili

## 📞 Supporto

In caso di problemi:

1. **Controlla questa documentazione**
2. **Verifica i logs di Vercel e Stripe**
3. **Consulta la documentazione ufficiale**:
   - [Stripe Webhooks](https://stripe.com/docs/webhooks)
   - [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

✅ **Checklist Finale**

- [ ] Tutte le variabili d'ambiente configurate su Vercel
- [ ] Webhook Stripe creato e configurato
- [ ] Applicazione ridisployata
- [ ] Test pagamento reale completato con successo
- [ ] Monitoraggio attivo
- [ ] Documentazione del team aggiornata

🎉 **La tua applicazione è ora pronta per la produzione!**