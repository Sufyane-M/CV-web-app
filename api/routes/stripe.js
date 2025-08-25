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
    description: 'Ideale per chi vuole testare il nostro servizio',
    // Price ID dinamico basato sull'ambiente (test/live)
    stripePriceId: process.env.STRIPE_PRICE_ID_STARTER || null
  },
  value: {
    id: 'value',
    name: 'Pacchetto Premium',
    price: 9.99,
    credits: 10,
    currency: 'EUR',
    description: 'La scelta migliore per chi cerca il massimo valore',
    // Price ID dinamico basato sull'ambiente (test/live)
    stripePriceId: process.env.STRIPE_PRICE_ID_VALUE || null
  }
};

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

    // Validate coupon if provided
    let couponData = null;
    let discountAmount = 0;
    let finalAmount = bundle.price;
    
    if (couponCode) {
      const { data: validationResult, error: couponError } = await supabase.rpc('validate_coupon', {
        p_code: couponCode.toUpperCase(),
        p_user_id: userId,
        p_amount: Math.round(bundle.price * 100) // Amount in cents
      });

      if (couponError || !validationResult || validationResult.length === 0) {
        return res.status(400).json({ error: 'Coupon non valido o scaduto' });
      }

      const validation = validationResult[0];
      if (!validation.is_valid) {
        return res.status(400).json({ 
          error: validation.error_message || 'Coupon non valido'
        });
      }

      // Get coupon details
      const { data: coupon, error: couponDetailsError } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', validation.coupon_id)
        .single();

      if (couponDetailsError || !coupon) {
        return res.status(400).json({ error: 'Errore nel recupero del coupon' });
      }

      couponData = coupon;
      discountAmount = validation.discount_amount / 100; // Convert from cents to euros
      finalAmount = bundle.price - discountAmount;
      
      // Ensure final amount is not negative
      if (finalAmount < 0) {
        finalAmount = 0;
      }
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
            unit_amount: Math.round(finalAmount * 100), // Use final amount after discount
          },
          quantity: 1,
        },
      ];
    }

    // Prepare session configuration
    const sessionConfig = {
      payment_method_types: ['card', 'paypal'],
      line_items: lineItems,
      mode: 'payment',
      allow_promotion_codes: true, // Abilita il campo "Inserisci codice promozionale" nel form di Stripe
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      metadata: {
        userId,
        bundleId,
        credits: bundle.credits.toString(),
        planName: bundle.name,
        originalAmount: bundle.price.toString(),
        finalAmount: finalAmount.toString(),
        ...(couponData && {
          couponId: couponData.id.toString(),
          couponCode: couponData.code,
          discountAmount: discountAmount.toString()
        })
      },
    };

    // Add Stripe coupon if available and using predefined prices
    if (couponData && bundle.stripePriceId) {
      try {
        // Try to use Stripe coupon if it exists
        const stripeCoupons = await stripe.coupons.list({ limit: 100 });
        const stripeCoupon = stripeCoupons.data.find(c => c.id === couponData.code);
        
        if (stripeCoupon) {
          sessionConfig.discounts = [{
            coupon: couponData.code
          }];
        }
      } catch (stripeError) {
        console.log('Stripe coupon not found, using custom discount calculation');
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Store pending transaction in database
    const { data: paymentData, error: transactionError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount: Math.round(finalAmount * 100), // Final amount after discount in cents
        currency: bundle.currency,
        status: 'pending',
        stripe_payment_intent_id: `pending_${session.id}`, // Temporary placeholder, will be updated by webhook
        stripe_checkout_session_id: session.id,
        credits_purchased: bundle.credits,
        credits_added: bundle.credits,
        metadata: {
          bundle_name: bundle.name,
          stripe_session_id: session.id,
          original_amount: Math.round(bundle.price * 100),
          discount_amount: Math.round(discountAmount * 100),
          ...(couponData && {
            coupon_id: couponData.id,
            coupon_code: couponData.code
          })
        },
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error storing transaction:', transactionError);
      // Continue anyway - webhook will handle the transaction
    }

    // Apply coupon usage if coupon was used and payment was created successfully
    if (couponData && paymentData && !transactionError) {
      try {
        await supabase.rpc('apply_coupon', {
          p_coupon_id: couponData.id,
          p_user_id: userId,
          p_payment_id: paymentData.id,
          p_original_amount: Math.round(bundle.price * 100),
          p_discount_amount: Math.round(discountAmount * 100),
          p_stripe_coupon_id: couponData.code
        });
      } catch (couponApplyError) {
        console.error('Error applying coupon:', couponApplyError);
        // Don't fail the checkout, just log the error
      }
    }

    res.json({ 
      sessionId: session.id,
      ...(couponData && {
        couponApplied: {
          code: couponData.code,
          discountAmount,
          originalAmount: bundle.price,
          finalAmount
        }
      })
    });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
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