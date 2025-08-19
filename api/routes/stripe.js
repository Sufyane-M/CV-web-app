import express from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
const router = express.Router();

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
// Supporta sia modalità test che produzione tramite variabili d'ambiente
const BUNDLES = {
  starter: {
    id: 'starter',
    name: 'Pacchetto Base',
    price: 4.99,
    credits: 4,
    currency: 'EUR',
    description: 'Ideale per chi vuole testare il nostro servizio', // Fallback description
    // Price ID dinamico basato sull'ambiente (test/live)
    stripePriceId: process.env.STRIPE_PRICE_ID_STARTER || null
  },
  value: {
    id: 'value',
    name: 'Pacchetto Premium',
    price: 9.99,
    credits: 10,
    currency: 'EUR',
    description: 'La scelta migliore per chi cerca il massimo valore', // Fallback description
    // Price ID dinamico basato sull'ambiente (test/live)
    stripePriceId: process.env.STRIPE_PRICE_ID_VALUE || null
  }
};

// Function to get product description from Stripe
async function getProductDescriptionFromStripe(priceId) {
  try {
    if (!priceId) {
      return null;
    }
    
    // Get price details from Stripe
    const price = await stripe.prices.retrieve(priceId);
    
    if (!price || !price.product) {
      return null;
    }
    
    // Get product details from Stripe
    const product = await stripe.products.retrieve(price.product);
    
    return product.description || null;
  } catch (error) {
    console.error('Error fetching product description from Stripe:', error);
    return null;
  }
}

// Function to get enhanced bundle with Stripe description
async function getEnhancedBundle(bundleId) {
  const bundle = BUNDLES[bundleId];
  if (!bundle) {
    return null;
  }
  
  // Try to get description from Stripe
  const stripeDescription = await getProductDescriptionFromStripe(bundle.stripePriceId);
  
  // Return bundle with Stripe description if available, otherwise use fallback
  return {
    ...bundle,
    description: stripeDescription || bundle.description
  };
}

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
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

    const bundle = await getEnhancedBundle(bundleId);
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

    // Determina se usare Price ID predefinito o creare prezzo dinamicamente
    let lineItems;
    
    if (bundle.stripePriceId) {
      // Modalità produzione: usa Price ID predefinito di Stripe
      console.log(`Using Stripe Price ID: ${bundle.stripePriceId} for bundle: ${bundleId}`);
      lineItems = [
        {
          price: bundle.stripePriceId,
          quantity: 1,
        },
      ];
    } else {
      // Modalità sviluppo: crea prezzo dinamicamente
      console.log(`Creating dynamic price for bundle: ${bundleId}`);
      lineItems = [
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
      ];
    }

    // Validate coupon if provided
    let validatedCoupon = null;
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        
        // Check if coupon is valid
        if (!coupon.valid) {
          return res.status(400).json({ 
            error: 'Coupon is not valid' 
          });
        }

        // Check if coupon has expired
        if (coupon.redeem_by && coupon.redeem_by < Math.floor(Date.now() / 1000)) {
          return res.status(400).json({ 
            error: 'Coupon has expired' 
          });
        }

        // Check if coupon has reached max redemptions
        if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
          return res.status(400).json({ 
            error: 'Coupon has reached maximum redemptions' 
          });
        }

        validatedCoupon = coupon;
      } catch (error) {
        console.error('Coupon validation error:', error);
        if (error.type === 'StripeInvalidRequestError') {
          return res.status(400).json({ 
            error: 'Invalid coupon code' 
          });
        }
        return res.status(500).json({ 
          error: 'Failed to validate coupon' 
        });
      }
    }

    // Prepare session configuration
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
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
    };

    // Add coupon to session if validated
    if (validatedCoupon) {
      sessionConfig.discounts = [{
        coupon: validatedCoupon.id
      }];
      sessionConfig.metadata.coupon_code = validatedCoupon.id;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

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
});

// Validate promotional code
router.post('/validate-coupon', async (req, res) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    // Retrieve coupon from Stripe
    const coupon = await stripe.coupons.retrieve(couponCode);

    // Check if coupon is valid
    if (!coupon.valid) {
      return res.status(400).json({ 
        error: 'Coupon is not valid',
        valid: false 
      });
    }

    // Check if coupon has expired
    if (coupon.redeem_by && coupon.redeem_by < Math.floor(Date.now() / 1000)) {
      return res.status(400).json({ 
        error: 'Coupon has expired',
        valid: false 
      });
    }

    // Check if coupon has reached max redemptions
    if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
      return res.status(400).json({ 
        error: 'Coupon has reached maximum redemptions',
        valid: false 
      });
    }

    // Return coupon details
    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        name: coupon.name,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
        currency: coupon.currency,
        duration: coupon.duration,
        duration_in_months: coupon.duration_in_months,
        max_redemptions: coupon.max_redemptions,
        times_redeemed: coupon.times_redeemed,
        redeem_by: coupon.redeem_by
      }
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid coupon code',
        valid: false 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to validate coupon',
      valid: false 
    });
  }
});

// Verify payment session
router.post('/verify-session', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Get transaction from database
    const { data: transaction, error: transactionError } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .single();

    if (transactionError) {
      console.error('Error fetching transaction:', transactionError);
      return res.status(500).json({ error: 'Failed to verify transaction' });
    }

    // If transaction is still pending, process it now (for test sessions)
    if (transaction.status === 'pending') {
      console.log('Processing pending transaction:', sessionId);
      
      // Update transaction status
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'succeeded',
          updated_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent || `completed_${session.id}`,
        })
        .eq('stripe_checkout_session_id', sessionId);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
      }

      // Credits are handled by the webhook, not here to avoid duplication
      console.log('Transaction processed, credits will be added by webhook');
    }

    // Return verification result
    res.json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
      },
      transaction,
      planName: session.metadata.planName || 'Unknown Plan',
      credits: parseInt(session.metadata.credits || '0'),
    });
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

// Stripe webhook handler (raw body is applied at app level)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session) {
  try {
    const { userId, bundleId, credits, planName } = session.metadata;

    if (!userId || !bundleId || !credits) {
      console.error('Missing metadata in checkout session:', session.id);
      return;
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        updated_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent,
      })
      .eq('stripe_checkout_session_id', session.id);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
    }

    // Add credits to user account
    const { error: creditError } = await supabase.rpc('add_user_credits', {
      user_uuid: userId,
      credits_to_add: parseInt(credits)
    });

    if (creditError) {
      console.error('Error adding credits:', creditError);
    }

    // Log webhook event
    const { error: webhookError } = await supabase
      .from('stripe_webhook_events')
      .insert({
        event_id: session.id,
        event_type: 'checkout.session.completed',
        processed: true,
        data: session,
      });

    if (webhookError) {
      console.error('Error logging webhook event:', webhookError);
    }

    console.log(`Successfully processed checkout session: ${session.id}`);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

});

// Get bundles with dynamic descriptions from Stripe
router.get('/bundles', async (req, res) => {
  try {
    const bundleIds = Object.keys(BUNDLES);
    const enhancedBundles = {};
    
    // Get enhanced bundles with Stripe descriptions
    for (const bundleId of bundleIds) {
      const enhancedBundle = await getEnhancedBundle(bundleId);
      if (enhancedBundle) {
        enhancedBundles[bundleId] = enhancedBundle;
      }
    }
    
    res.json(enhancedBundles);
  } catch (error) {
    console.error('Error fetching bundles:', error);
    res.status(500).json({ error: 'Failed to fetch bundles' });
  }
});

// Handle successful payment intent
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    console.log(`Payment intent succeeded: ${paymentIntent.id}`);
    
    // Update transaction if exists
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (error) {
      console.error('Error updating payment intent:', error);
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

// Handle failed payment intent
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    console.log(`Payment intent failed: ${paymentIntent.id}`);
    
    // Update transaction status
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (error) {
      console.error('Error updating failed payment:', error);
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}

export default router;