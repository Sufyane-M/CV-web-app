const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

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

module.exports = async function handler(req, res) {
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

    const { bundleId, userId, successUrl, cancelUrl, couponCode } = req.body;

    // Validate input
    if (!bundleId || !userId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required parameters' });
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

    // Create Stripe checkout session
    const sessionMetadata = {
      userId: userId,
      bundleId: bundleId,
      credits: bundle.credits.toString(),
    };

    // Add coupon data to metadata if coupon was applied
    if (couponData) {
      sessionMetadata.couponCode = couponCode;
      sessionMetadata.couponId = couponData.id.toString();
      sessionMetadata.discountAmount = Math.round(discountAmount * 100).toString(); // Store in cents
      sessionMetadata.originalAmount = Math.round(bundle.price * 100).toString(); // Store in cents
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
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
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      metadata: sessionMetadata,
    });

    // Insert transaction record
    const paymentMetadata = {
      bundle_id: bundleId,
      bundle_name: bundle.name
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

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};