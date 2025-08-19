# Risoluzione Errore 404 API Stripe su Vercel

## Problema
L'API `/api/stripe/create-checkout-session` restituisce errore 404 su Vercel in produzione, mentre funziona correttamente in locale.

## Causa
Il problema è dovuto a una configurazione errata del routing su Vercel. L'applicazione utilizza un sistema ibrido con:
- Express routing tramite `api/[...path].js`
- Funzioni serverless in `api/stripe/`

Vercel non riusciva a trovare la route corretta per l'endpoint Stripe.

## Soluzioni Implementate

### 1. Correzione Schema Database
Aggiornato `api/stripe/create-checkout-session.js`:
- Cambiato query da `profiles` a `user_profiles`
- Cambiato inserimento da `transactions` a `payments`

### 2. Configurazione Route Vercel
Aggiornato `vercel.json` con routing esplicito:
```json
{
  "rewrites": [
    {
      "source": "/api/stripe/create-checkout-session",
      "destination": "/api/stripe/create-checkout-session.js"
    },
    {
      "source": "/api/(.*)",
      "destination": "/api/[...path].js"
    }
  ]
}
```

## Variabili d'Ambiente
Assicurarsi che le seguenti variabili siano configurate su Vercel:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_[your_webhook_secret]

# Altri
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-domain.vercel.app
PAYMENT_AMOUNT=999
AI_WEBHOOK_URL=https://your-ai-service.com/webhook
AI_WEBHOOK_SECRET=your_ai_webhook_secret
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

## Test API

### Test Locale
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3001/api/stripe/create-checkout-session" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"bundleId":"basic","userId":"test-user","successUrl":"http://localhost:5174/payment/success","cancelUrl":"http://localhost:5174/payment/cancel"}'
```

### Test Produzione
```bash
# PowerShell
Invoke-WebRequest -Uri "https://your-app.vercel.app/api/stripe/create-checkout-session" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"bundleId":"basic","userId":"test-user","successUrl":"https://your-app.vercel.app/payment/success","cancelUrl":"https://your-app.vercel.app/payment/cancel"}'
```

## Deploy su Vercel

1. **Commit e Push**:
```bash
git add .
git commit -m "fix: resolve 404 error for Stripe API on Vercel"
git push origin main
```

2. **Verifica Variabili d'Ambiente**:
   - Vai su Vercel Dashboard
   - Seleziona il progetto
   - Settings > Environment Variables
   - Verifica che tutte le variabili siano configurate

3. **Redeploy**:
   - Il deploy avviene automaticamente dopo il push
   - Oppure forza un redeploy dal dashboard Vercel

## Debug

### Verifica Route Vercel
```bash
# Controlla se la route è configurata correttamente
curl -I https://your-app.vercel.app/api/stripe/create-checkout-session
```

### Log Vercel
- Vai su Vercel Dashboard > Functions
- Controlla i log delle funzioni per errori

### Test Database
```sql
-- Verifica tabelle esistenti
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Verifica struttura user_profiles
\d user_profiles;

-- Verifica struttura payments
\d payments;
```

## Note Importanti

1. **Approccio Ibrido**: La soluzione utilizza sia Express routing che funzioni serverless per massima compatibilità
2. **Sicurezza**: Non committare mai chiavi API reali nel codice
3. **Testing**: Testare sempre sia in locale che in produzione
4. **Monitoring**: Monitorare i log Vercel per eventuali errori

## Struttura File
```
api/
├── [...path].js          # Express routing handler
├── app.js               # Express app configuration
├── routes/
│   └── stripe.js        # Express Stripe routes
└── stripe/
    ├── create-checkout-session.js  # Serverless function
    ├── verify-session.js
    └── webhook.js
```

La configurazione garantisce che:
- `/api/stripe/create-checkout-session` → funzione serverless
- Altri `/api/*` → Express routing
- Fallback e compatibilità completa