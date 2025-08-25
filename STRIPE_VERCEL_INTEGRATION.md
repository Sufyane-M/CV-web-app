# Integrazione Stripe Checkout con Vercel - Guida Completa

## 📁 Struttura del Progetto

```
my-vite-app/
├── api/                              # Serverless Functions per Vercel
│   └── stripe/
│       ├── create-checkout-session.js # ✅ API per creare sessione Stripe
│       └── webhook.js                 # Webhook per eventi Stripe (opzionale)
├── src/                              # Frontend React + Vite
│   ├── components/
│   │   └── stripe/
│   │       └── StripeCheckout.tsx    # ✅ Componente React per checkout
│   ├── pages/
│   │   ├── payment/
│   │   │   ├── success.tsx           # Pagina successo pagamento
│   │   │   └── cancel.tsx            # Pagina cancellazione pagamento
│   │   └── pricing.tsx               # Pagina prezzi con bottoni checkout
│   └── main.tsx
├── .env.local                        # Variabili ambiente locali
├── .env.vercel.example              # ✅ Template variabili per Vercel
├── package.json
├── vite.config.ts
└── vercel.json                      # Configurazione Vercel (opzionale)
```

## 🚀 Implementazione Completa

### 1. API Serverless Function (`/api/stripe/create-checkout-session.js`)

```javascript
import Stripe from 'stripe';

// Inizializza Stripe con la chiave segreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Gestione CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ✅ Risposta 405 per metodi diversi da POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verifica configurazione Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    // ✅ URL dinamici basati su req.headers.origin
    const origin = req.headers.origin || `https://${req.headers.host}`;
    
    // ✅ Crea sessione Stripe Checkout con parametri richiesti
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',                    // ✅ mode: "payment"
      payment_method_types: ['card', 'paypal'], // ✅ payment_method_types: ["card", "paypal"]
      line_items: [
        {
          price: 'price_xxx',             // ✅ price: "price_xxx"
          quantity: 1,                    // ✅ quantity: 1
        },
      ],
      // ✅ URL dinamici basati su origin
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
      metadata: {
        source: 'vercel-api',
        timestamp: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Errore Stripe:', error);
    
    // ✅ Gestione errori con status 500
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ error: 'Errore carta di credito' });
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Richiesta non valida' });
    }
    
    return res.status(500).json({ 
      error: 'Errore interno del server',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
```

### 2. Componente React Frontend (`/src/components/stripe/StripeCheckout.tsx`)

```typescript
import React, { useState } from 'react';

interface StripeCheckoutProps {
  priceId?: string;
  buttonText?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  priceId = 'price_xxx',
  buttonText = 'Acquista Ora',
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);

  // ✅ Funzione createCheckoutSession con fetch POST
  const createCheckoutSession = async () => {
    setLoading(true);
    
    try {
      // ✅ Chiamata POST a /api/stripe/create-checkout-session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',  // ✅ Content-Type: application/json
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore creazione sessione');
      }

      const { url } = await response.json();
      
      // ✅ Redirect usando window.location.href = session.url
      if (url) {
        window.location.href = url;
        onSuccess?.();
      } else {
        throw new Error('URL sessione non ricevuto');
      }
      
    } catch (error) {
      console.error('Errore checkout:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={createCheckoutSession}
      disabled={loading}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Caricamento...' : buttonText}
    </button>
  );
};

export default StripeCheckout;
```

### 3. Esempio di Utilizzo nel Frontend

```typescript
// src/pages/PricingPage.tsx
import React from 'react';
import StripeCheckout from '../components/stripe/StripeCheckout';

const PricingPage: React.FC = () => {
  const handleSuccess = () => {
    console.log('Redirect a Stripe avviato');
  };

  const handleError = (error: string) => {
    alert(`Errore: ${error}`);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Scegli il tuo piano</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Piano Base */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Piano Base</h2>
          <p className="text-3xl font-bold mb-4">€9.99</p>
          <StripeCheckout
            priceId="price_1234567890"  // Il tuo Price ID reale
            buttonText="Acquista Piano Base"
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
        
        {/* Piano Premium */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Piano Premium</h2>
          <p className="text-3xl font-bold mb-4">€19.99</p>
          <StripeCheckout
            priceId="price_0987654321"  // Il tuo Price ID reale
            buttonText="Acquista Piano Premium"
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
```

## ⚙️ Configurazione Variabili d'Ambiente su Vercel

### Variabili Obbligatorie

1. **Vai su Vercel Dashboard** → Il tuo progetto → Settings → Environment Variables

2. **Aggiungi queste variabili:**

```bash
# ✅ STRIPE_SECRET_KEY (per le API serverless)
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ✅ VITE_STRIPE_PUBLISHABLE_KEY (per il frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Come Ottenere le Chiavi Stripe

1. **Accedi a [Stripe Dashboard](https://dashboard.stripe.com)**
2. **Vai su "Developers" → "API keys"**
3. **Copia le chiavi:**
   - **Publishable key** (pk_test_...) → `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (sk_test_...) → `STRIPE_SECRET_KEY`

### Configurazione Produzione vs Test

```bash
# 🧪 MODALITÀ TEST (sviluppo)
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# 🚀 MODALITÀ LIVE (produzione)
STRIPE_SECRET_KEY=sk_live_[...]
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_[...]
```

## 🔧 Note Importanti

### ✅ Perché GET restituisce "Method not allowed"

- **È normale!** L'API accetta solo richieste POST
- Quando apri `/api/stripe/create-checkout-session` nel browser, fai una GET
- L'API risponde correttamente con 405 per sicurezza
- **Testa sempre dal frontend React o con Postman/curl**

### ✅ Sicurezza

- **Mai committare** chiavi segrete nel repository
- **Usa sempre** chiavi di test durante lo sviluppo
- **Configura CORS** appropriatamente per la produzione
- **Valida sempre** i dati in input nelle API

### ✅ Debugging

```bash
# Vedere i log di Vercel in tempo reale
vercel logs your-deployment-url

# Testare localmente con Vercel CLI
vercel dev

# Scaricare le variabili d'ambiente da Vercel
vercel env pull .env.local
```

### ✅ Webhook (Opzionale ma Raccomandato)

Per gestire eventi post-pagamento:

1. **Crea webhook su Stripe Dashboard**
2. **URL:** `https://your-domain.vercel.app/api/stripe/webhook`
3. **Eventi:** `checkout.session.completed`, `payment_intent.succeeded`
4. **Aggiungi variabile:** `STRIPE_WEBHOOK_SECRET=whsec_[...]`

## 🚀 Deploy su Vercel

1. **Connetti repository a Vercel**
2. **Build Command:** `npm run build` o `pnpm build`
3. **Output Directory:** `dist`
4. **Configura variabili d'ambiente** (vedi sopra)
5. **Deploy!**

```bash
# Deploy manuale
vercel --prod
```

## 🧪 Test dell'Integrazione

### Test Locale
```bash
# 1. Installa Vercel CLI
npm i -g vercel

# 2. Avvia in modalità dev
vercel dev

# 3. Testa l'API
curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_xxx"}'
```

### Test Produzione
1. **Apri la tua app deployata**
2. **Clicca su un bottone di checkout**
3. **Verifica il redirect a Stripe**
4. **Usa carte di test Stripe:**
   - `4242 4242 4242 4242` (successo)
   - `4000 0000 0000 0002` (carta declinata)

## 📚 Risorse Utili

- [Stripe Checkout Documentation](https://stripe.com/docs/checkout)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Stripe Test Cards](https://stripe.com/docs/testing#cards)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

**✅ Implementazione completata!** Ora hai un'integrazione Stripe Checkout funzionante con Vite + React deployata su Vercel.