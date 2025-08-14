const express = require('express');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

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

      // Add credits to user account
      const { userId, credits, planName } = session.metadata;
      if (userId && credits) {
        // Get current user data first
        const { data: currentUser, error: getUserError } = await supabase
          .from('user_profiles')
          .select('credits, total_credits_purchased')
          .eq('id', userId)
          .single();

        if (getUserError) {
          console.error('Error getting user data:', getUserError);
        } else {
          // Update user credits directly
          const newCredits = (currentUser.credits || 0) + parseInt(credits);
          const newTotalPurchased = (currentUser.total_credits_purchased || 0) + parseInt(credits);
          
          const { error: creditError } = await supabase
            .from('user_profiles')
            .update({
              credits: newCredits,
              total_credits_purchased: newTotalPurchased,
              last_payment_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (creditError) {
            console.error('Error adding credits:', creditError);
          } else {
            console.log(`Added ${credits} credits to user ${userId}. New total: ${newCredits}`);
          }
        }

        // Insert credit transaction record
        const { error: transactionLogError } = await supabase
          .from('credit_transactions')
          .insert({
            user_id: userId,
            amount: parseInt(credits),
            type: 'purchase',
            description: `Purchase: ${planName}`,
            created_at: new Date().toISOString(),
          });

        if (transactionLogError) {
          console.error('Error logging credit transaction:', transactionLogError);
        }
      }
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

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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
      user_id: userId,
      credit_amount: parseInt(credits),
      transaction_type: 'purchase',
      description: `Purchase: ${planName}`,
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

module.exports = router;