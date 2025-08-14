const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Initialize Stripe
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
    name: 'Starter Pack',
    price: 4.99,
    credits: 2,
    currency: 'EUR',
    description: 'Perfect for trying out our CV analysis service'
  },
  value: {
    id: 'value',
    name: 'Value Pack',
    price: 9.99,
    credits: 5,
    currency: 'EUR',
    description: 'Best value for regular users'
  }
};

module.exports = async (req, res) => {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', 'https://cv-plum-ten.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, stripe-signature');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
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

    const bundle = BUNDLES[bundleId];
    if (!bundle) {
      return res.status(400).json({ error: 'Invalid bundle ID' });
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
        userId,
        bundleId,
        credits: bundle.credits.toString(),
        planName: bundle.name,
      },
    });

    // Store pending transaction in database
    const { error: transactionError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount: Math.round(bundle.price * 100), // Convert to cents
        currency: bundle.currency,
        status: 'pending',
        stripe_payment_intent_id: `pending_${session.id}`, // Temporary placeholder, will be updated by webhook
        stripe_checkout_session_id: session.id,
        credits_purchased: bundle.credits,
        credits_added: bundle.credits,
        metadata: {
          bundle_name: bundle.name,
          stripe_session_id: session.id,
        },
      });

    if (transactionError) {
      console.error('Error storing transaction:', transactionError);
      // Continue anyway - webhook will handle the transaction
    }

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};