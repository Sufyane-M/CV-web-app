# 🚀 Guida al Deploy in Produzione - Stripe Integration

Questa guida ti aiuterà a configurare e deployare l'applicazione dalla modalità test di Stripe alla modalità di produzione con pagamenti reali.

## 📋 Prerequisiti

### 1. Account Stripe Verificato
- Account Stripe completamente verificato e attivato per i pagamenti live
- Accesso alle chiavi API di produzione nel [Dashboard Stripe](https://dashboard.stripe.com/apikeys)
- Configurazione dei webhook per l'ambiente di produzione

### 2. Chiavi API Stripe di Produzione
Dal tuo Dashboard Stripe, ottieni:
- **Publishable Key**: `pk_live_...` (chiave pubblica)
- **Secret Key**: `sk_live_...` (chiave segreta)
- **Webhook Secret**: `whsec_...` (per i webhook)

## 🔧 Configurazione Iniziale

### Step 1: Configurare le Chiavi di Produzione

1. **Apri il file `.env.production`** (già creato dal sistema)
2. **Sostituisci i placeholder** con le tue chiavi reali:

```env
# MODALITÀ PRODUZIONE - STRIPE LIVE
NODE_ENV=production

# Stripe Live Keys (SOSTITUISCI CON LE TUE CHIAVI REALI)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_TUA_CHIAVE_PUBBLICA_QUI
STRIPE_SECRET_KEY=sk_live_TUA_CHIAVE_SEGRETA_QUI
STRIPE_WEBHOOK_SECRET=whsec_TUA_WEBHOOK_SECRET_QUI

# Product Price IDs (AGGIORNA CON GLI ID DI PRODUZIONE)
VITE_STRIPE_PRICE_BASIC=price_XXXXX
VITE_STRIPE_PRICE_PREMIUM=price_XXXXX
VITE_STRIPE_PRICE_ENTERPRISE=price_XXXXX

# URLs di Produzione
VITE_APP_URL=https://tuodominio.com
VITE_API_URL=https://api.tuodominio.com
```

### Step 2: Configurare i Prodotti Stripe

1. **Accedi al Dashboard Stripe** in modalità Live
2. **Crea i prodotti** corrispondenti ai tuoi piani:
   - Basic Plan
   - Premium Plan 
   - Enterprise Plan
3. **Copia gli ID dei prezzi** e aggiornali nel file `.env.production`

### Step 3: Configurare i Webhook

1. **Nel Dashboard Stripe**, vai su "Developers" > "Webhooks"
2. **Crea un nuovo endpoint** per la produzione:
   - URL: `https://api.tuodominio.com/api/stripe/webhook`
   - Eventi da ascoltare:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. **Copia il Webhook Secret** e aggiornalo in `.env.production`

## 🚀 Deploy Automatico

### Opzione 1: Script Automatico (Raccomandato)

```bash
# Deploy in modalità produzione
npm run stripe:production

# Oppure
npm run deploy:production
```

Lo script automatico:
- ✅ Valida la configurazione
- ✅ Crea backup della configurazione attuale
- ✅ Applica la configurazione di produzione
- ✅ Verifica il build
- ✅ Fornisce istruzioni post-deploy

### Opzione 2: Deploy Manuale

```bash
# 1. Backup della configurazione attuale
cp .env .env.backup.$(date +%s)

# 2. Applica configurazione produzione
cp .env.production .env

# 3. Verifica build
npm run build

# 4. Deploy su server
# (comandi specifici per il tuo provider)
```

## 🔄 Ripristino Modalità Test

Per tornare alla modalità test:

```bash
# Ripristina automaticamente l'ultimo backup
npm run stripe:test

# Oppure
npm run deploy:test
```

## ✅ Checklist Pre-Deploy

### Configurazione Stripe
- [ ] Account Stripe verificato e attivo
- [ ] Chiavi API di produzione ottenute
- [ ] Prodotti creati nel Dashboard Stripe Live
- [ ] Webhook configurato per l'ambiente di produzione
- [ ] URL di produzione configurati

### Configurazione Applicazione
- [ ] File `.env.production` configurato con chiavi reali
- [ ] Price ID aggiornati per i prodotti live
- [ ] URL di produzione impostati
- [ ] Build dell'applicazione testato

### Test Pre-Produzione
- [ ] Test del flusso di pagamento in ambiente di staging
- [ ] Verifica webhook funzionanti
- [ ] Test con carte di credito reali (piccoli importi)
- [ ] Monitoraggio errori configurato

## 🧪 Testing in Produzione

### Test Iniziali (Importi Minimi)

1. **Test con carta reale** (importo minimo €0.50)
2. **Verifica webhook** nel Dashboard Stripe
3. **Controlla log applicazione** per errori
4. **Test flusso completo** dalla selezione al pagamento

### Carte di Test per Produzione

⚠️ **ATTENZIONE**: In produzione usa solo carte reali!

Per test sicuri:
- Usa importi minimi (€0.50 - €1.00)
- Testa con la tua carta personale
- Effettua rimborsi immediati se necessario

## 🔍 Monitoraggio Post-Deploy

### Dashboard Stripe
- Monitora i pagamenti in tempo reale
- Verifica che i webhook funzionino
- Controlla eventuali dispute o chargeback

### Log Applicazione
```bash
# Monitora log in tempo reale
tail -f logs/application.log

# Cerca errori Stripe
grep -i "stripe\|error" logs/application.log
```

### Metriche da Monitorare
- Tasso di successo pagamenti
- Tempo di risposta API Stripe
- Errori di validazione
- Webhook delivery rate

## 🚨 Troubleshooting

### Errori Comuni

#### "Invalid API Key"
```
❌ Errore: Invalid API key provided
✅ Soluzione: Verifica che le chiavi in .env.production siano corrette
```

#### "Webhook signature verification failed"
```
❌ Errore: Webhook signature verification failed
✅ Soluzione: Aggiorna STRIPE_WEBHOOK_SECRET con il valore corretto
```

#### "Price not found"
```
❌ Errore: No such price: price_xxxxx
✅ Soluzione: Aggiorna gli ID prezzi in .env.production con quelli live
```

### Rollback Rapido

In caso di problemi critici:

```bash
# Rollback immediato alla modalità test
npm run stripe:test

# Oppure ripristino manuale
cp .env.backup.[timestamp] .env
npm run build
```

## 📞 Supporto

### Risorse Utili
- [Documentazione Stripe](https://stripe.com/docs)
- [Dashboard Stripe](https://dashboard.stripe.com)
- [Stripe Status Page](https://status.stripe.com)

### Contatti di Emergenza
- Supporto Stripe: [support@stripe.com](mailto:support@stripe.com)
- Team di sviluppo: [inserire contatti]

## 🔐 Sicurezza

### Best Practices
- ✅ Non committare mai chiavi API nel repository
- ✅ Usa variabili d'ambiente per tutte le configurazioni sensibili
- ✅ Monitora regolarmente i log per attività sospette
- ✅ Implementa rate limiting sugli endpoint di pagamento
- ✅ Usa HTTPS per tutte le comunicazioni

### Gestione Chiavi API
- Ruota le chiavi API regolarmente
- Usa chiavi separate per ogni ambiente
- Limita i permessi delle chiavi API quando possibile
- Monitora l'uso delle chiavi nel Dashboard Stripe

---

**🎉 Congratulazioni!** Hai configurato con successo l'integrazione Stripe per la produzione. Ricorda di monitorare attentamente i primi pagamenti e di avere un piano di rollback pronto in caso di problemi.