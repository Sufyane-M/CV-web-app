import Stripe from 'stripe';

// Inizializza Stripe con la chiave segreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Gestione CORS per richieste cross-origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Gestione preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verifica che il metodo sia POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verifica che Stripe sia configurato
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    // Ottieni l'origin dalla richiesta per costruire gli URL dinamici
    const origin = req.headers.origin || `https://${req.headers.host}`;
    
    // Crea la sessione Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_xxx', // Sostituisci con il tuo Price ID reale
          quantity: 1,
        },
      ],
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
      // Metadati opzionali per tracciare la transazione
      metadata: {
        source: 'vercel-api',
        timestamp: new Date().toISOString(),
      },
    });

    // Restituisci l'URL della sessione per il redirect
    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Errore nella creazione della sessione Stripe:', error);
    
    // Gestione errori specifici di Stripe
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ error: 'Errore nella carta di credito' });
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Richiesta non valida a Stripe' });
    }
    
    // Errore generico del server
    return res.status(500).json({ 
      error: 'Errore interno del server',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}