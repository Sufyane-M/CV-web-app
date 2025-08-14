const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // For Vercel, req.body should already be the raw buffer
    const body = typeof req.body === 'string' ? Buffer.from(req.body) : req.body;
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
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

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

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