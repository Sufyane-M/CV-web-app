import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Inizializza Stripe con la chiave segreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Bundle configurations (must match frontend)
const BUNDLES = {
  starter: {
    id: 'starter',
    name: 'Pacchetto Base',
    price: 4.99,
    credits: 4,
    currency: 'EUR',
    description: 'Ideale per chi vuole testare il nostro servizio'
  },
  value: {
    id: 'value',
    name: 'Pacchetto Premium',
    price: 9.99,
    credits: 10,
    currency: 'EUR',
    description: 'La scelta migliore per chi cerca il massimo valore'
  }
};

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

    const { bundleId, userId, couponCode } = req.body;

    // Validate input
    if (!bundleId || !userId) {
      return res.status(400).json({ error: 'Missing required parameters: bundleId and userId' });
    }

    // Validate bundle
    const bundle = BUNDLES[bundleId];
    if (!bundle) {
      return res.status(400).json({ error: 'Invalid bundle ID' });
    }

    // Validate and apply coupon if provided
    let couponData = null;
    let discountAmount = 0;
    let finalAmount = bundle.price;

    if (couponCode) {
      try {
        // Validate coupon using the database function
        const { data: validationResult, error: validationError } = await supabase
          .rpc('validate_coupon', {
            p_code: couponCode,
            p_user_id: userId,
            p_amount: Math.round(bundle.price * 100) // Convert to cents
          });

        if (validationError) {
          return res.status(400).json({ error: 'Errore nella validazione del coupon' });
        }

        const validation = validationResult[0];
        if (!validation.is_valid) {
          return res.status(400).json({ error: validation.error_message });
        }

        // Get coupon details
        const { data: coupon, error: couponError } = await supabase
          .from('coupons')
          .select('*')
          .eq('id', validation.coupon_id)
          .single();

        if (couponError || !coupon) {
          return res.status(400).json({ error: 'Coupon non trovato' });
        }

        couponData = coupon;
        discountAmount = validation.discount_amount / 100; // Convert from cents to euros
        finalAmount = bundle.price - discountAmount;

        // Ensure final amount is not negative
        if (finalAmount < 0) {
          finalAmount = 0;
        }
      } catch (error) {
        console.error('Coupon validation error:', error);
        return res.status(400).json({ error: 'Errore nella validazione del coupon' });
      }
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ottieni l'origin dalla richiesta per costruire gli URL dinamici
    const origin = req.headers.origin || `https://${req.headers.host}`;
    
    // Create Stripe checkout session metadata
    const sessionMetadata = {
      userId: userId,
      bundleId: bundleId,
      credits: bundle.credits.toString(),
      source: 'vercel-api',
      timestamp: new Date().toISOString(),
    };

    // Add coupon data to metadata if coupon was applied
    if (couponData) {
      sessionMetadata.couponCode = couponCode;
      sessionMetadata.couponId = couponData.id.toString();
      sessionMetadata.discountAmount = Math.round(discountAmount * 100).toString(); // Store in cents
      sessionMetadata.originalAmount = Math.round(bundle.price * 100).toString(); // Store in cents
    }

    // Crea la sessione Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'paypal'],
      line_items: [
        {
          price_data: {
            currency: bundle.currency.toLowerCase(),
            product_data: {
              name: bundle.name,
              description: couponData ? 
                `${bundle.description} (Sconto applicato: ${couponData.code})` : 
                bundle.description,
            },
            unit_amount: Math.round(finalAmount * 100), // Convert to cents with discount applied
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
      customer_email: user.email,
      metadata: sessionMetadata,
    });

    // Insert transaction record
    const paymentMetadata = {
      bundle_id: bundleId,
      bundle_name: bundle.name,
      source: 'vercel-api'
    };

    // Add coupon information to payment metadata if coupon was applied
    if (couponData) {
      paymentMetadata.coupon_code = couponCode;
      paymentMetadata.coupon_id = couponData.id;
      paymentMetadata.discount_amount = Math.round(discountAmount * 100); // Store in cents
      paymentMetadata.original_amount = Math.round(bundle.price * 100); // Store in cents
    }

    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: `pending_${session.id}`,
        amount: Math.round(finalAmount * 100), // Convert to cents with discount applied
        currency: bundle.currency.toLowerCase(),
        credits_purchased: bundle.credits,
        credits_added: bundle.credits,
        status: 'pending',
        metadata: paymentMetadata
      });

    if (insertError) {
      console.error('Error inserting transaction:', insertError);
      // Don't fail the request, just log the error
    }

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