import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv to load from the api directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}
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
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if Stripe is properly configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_stripe_secret_key_here')) {
      return res.status(500).json({ error: 'Stripe not configured. Please set up your Stripe secret key.' });
    }

    const { bundleId, userId, successUrl, cancelUrl } = req.body;

    // Validate input
    if (!bundleId || !userId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Validate bundle
    const bundle = BUNDLES[bundleId];
    if (!bundle) {
      return res.status(400).json({ error: 'Invalid bundle ID' });
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: bundle.currency.toLowerCase(),
            product_data: {
              name: bundle.name,
              description: bundle.description,
            },
            unit_amount: Math.round(bundle.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      metadata: {
        userId: userId,
        bundleId: bundleId,
        credits: bundle.credits.toString(),
      },
    });

    // Insert transaction record
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        stripe_session_id: session.id,
        bundle_id: bundleId,
        amount: bundle.price,
        currency: bundle.currency,
        credits: bundle.credits,
        status: 'pending'
      });

    if (insertError) {
      console.error('Error inserting transaction:', insertError);
      // Don't fail the request, just log the error
    }

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


