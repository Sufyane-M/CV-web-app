import dotenv from 'dotenv';
// Ensure environment variables are loaded before using process.env
dotenv.config();

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
// Configurazione dei bundle di crediti
const BUNDLES = {
  starter: {
    id: 'starter',
    name: 'Pacchetto Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    credits: 5,
    price: 4.99,
    currency: 'EUR',
    description: 'Ideale per provare il nostro servizio di analisi CV'
  },
  value: {
    id: 'value',
    name: 'Pacchetto Value',
    priceId: process.env.STRIPE_VALUE_PRICE_ID,
    credits: 10,
    price: 9.99,
    currency: 'EUR',
    description: 'Miglior valore per utilizzo regolare'
  }
};

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
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
            },
            unit_amount: Math.round(bundle.price * 100)
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      customer_email: user.email,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        bundleId,
        credits: bundle.credits
      }
    });

    // Return the session id
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
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
    try {
      const { data: transaction, error: transactionError } = await supabase
        .from('payments')
        .select('*')
        .eq('stripe_checkout_session_id', sessionId)
        .single();

      if (transactionError) {
        console.warn('Non-blocking: error fetching transaction during verify-session:', transactionError);
      } else if (transaction && transaction.status === 'pending') {
        console.log('Processing pending transaction (marking succeeded only):', sessionId);
        // Update transaction status; do NOT add credits here (handled by webhook)
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'succeeded',
            updated_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent || `completed_${session.id}`,
          })
          .eq('stripe_checkout_session_id', sessionId);

        if (updateError) {
          console.warn('Non-blocking: error updating transaction during verify-session:', updateError);
        }
      }
    } catch (e) {
      console.warn('Non-blocking: verify-session skipped DB ops due to error:', e);
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
      transaction: undefined,
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
  try {
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
  } finally {
    // Log webhook event centrally (idempotent logging based on stripe_event_id)
    try {
      const { error: webhookError } = await supabase
        .from('stripe_webhook_events')
        .insert({
          stripe_event_id: event.id,
          event_type: event.type,
          processed: true,
          data: event.data?.object || null,
        });
      if (webhookError) {
        console.error('Error logging webhook event:', webhookError);
      }
    } catch (e) {
      console.error('Unexpected error logging webhook event:', e);
    }
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

    // Fetch current transaction to compute delta credits (idempotent)
    const { data: transaction, error: txError } = await supabase
      .from('payments')
      .select('id, credits_purchased, credits_added')
      .eq('stripe_checkout_session_id', session.id)
      .single();

    if (txError) {
      console.error('Error fetching transaction for webhook:', txError);
    }

    const intended = (transaction?.credits_purchased ?? parseInt(credits)) || 0;
    const alreadyAdded = transaction?.credits_added ?? 0;
    const toAdd = Math.max(0, intended - alreadyAdded);

    if (toAdd <= 0) {
      // Nothing to add; ensure status is succeeded and payment_intent is saved
      const { error: updateNoopError } = await supabase
        .from('payments')
        .update({
          status: 'succeeded',
          updated_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent,
        })
        .eq('stripe_checkout_session_id', session.id);
      if (updateNoopError) {
        console.error('Error updating transaction (noop):', updateNoopError);
      }
      console.log(`No credits to add for session ${session.id} (alreadyAdded=${alreadyAdded}, intended=${intended})`);
      return;
    }

    // Add only the delta credits to user account (idempotent)
    let creditError = null;
    try {
      const { error: e1 } = await supabase.rpc('add_user_credits', {
        user_uuid: userId,
        credits_to_add: toAdd,
      });
      creditError = e1;
      if (creditError) {
        // Fallback to update_user_credits function with correct parameters
        const { error: e2 } = await supabase.rpc('update_user_credits', {
          p_user_id: userId,
          p_credits_to_add: toAdd,
          p_payment_id: session.payment_intent
        });
        creditError = e2;
      }
    } catch (e) {
      creditError = e;
    }
    if (creditError) {
      console.error('Error adding credits (both functions failed):', creditError);
    }

    // Update transaction: status, payment_intent and credits_added incremented
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        updated_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent,
        credits_added: alreadyAdded + toAdd,
      })
      .eq('stripe_checkout_session_id', session.id);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
    }

    console.log(`Successfully processed checkout session: ${session.id} (added ${toAdd} credits)`);
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