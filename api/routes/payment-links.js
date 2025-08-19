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
const BUNDLES = {
  starter: {
    id: 'starter',
    name: 'Pacchetto Base',
    price: 4.99,
    credits: 4,
    currency: 'EUR',
    description: 'Ideale per chi vuole testare il nostro servizio',
    paymentLink: 'https://buy.stripe.com/aFabJ0cEc1un5E8aZY0Ba06'
  },
  value: {
    id: 'value',
    name: 'Pacchetto Premium',
    price: 9.99,
    credits: 10,
    currency: 'EUR',
    description: 'La scelta migliore per chi cerca il massimo valore',
    paymentLink: 'https://buy.stripe.com/00wbJ00Vu0qj4A45FE0Ba05'
  }
};

// Handle payment success from Stripe payment links
router.get('/success', async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.redirect('/payment/error?error=missing_session');
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (!session) {
      return res.redirect('/payment/error?error=session_not_found');
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.redirect('/payment/error?error=payment_not_completed');
    }

    // Redirect to frontend success page with session ID
    res.redirect(`/payment/success?session_id=${session_id}`);
  } catch (error) {
    console.error('Payment success handling error:', error);
    res.redirect('/payment/error?error=processing_failed');
  }
});

// Handle payment cancellation
router.get('/cancel', (req, res) => {
  res.redirect('/pricing?canceled=true');
});

// Verify payment session for payment links
router.post('/verify-session', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Get line items to determine bundle
    const lineItems = session.line_items?.data || [];
    let bundleInfo = null;
    
    // Match line item with our bundles based on amount
    for (const item of lineItems) {
      const amount = item.amount_total / 100; // Convert from cents
      
      for (const [bundleId, bundle] of Object.entries(BUNDLES)) {
        if (Math.abs(amount - bundle.price) < 0.01) { // Allow for small rounding differences
          bundleInfo = { ...bundle, bundleId };
          break;
        }
      }
      
      if (bundleInfo) break;
    }

    if (!bundleInfo) {
      return res.status(400).json({ error: 'Unable to determine bundle type' });
    }

    // Check if we already processed this session
    const { data: existingTransaction } = await supabase
      .from('payment_link_transactions')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existingTransaction) {
      // Already processed, return existing data
      return res.json({
        success: true,
        session: {
          id: session.id,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
        },
        transaction: existingTransaction,
        planName: bundleInfo.name,
        credits: bundleInfo.credits,
      });
    }

    // Get user info from session storage (passed from frontend)
    const pendingPayment = req.body.pendingPayment;
    
    if (!pendingPayment || !pendingPayment.userId) {
      return res.status(400).json({ error: 'User information missing. Please log in and try again.' });
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_link_transactions')
      .insert({
        user_id: pendingPayment.userId,
        bundle_id: bundleInfo.bundleId,
        bundle_name: bundleInfo.name,
        amount: bundleInfo.price,
        currency: bundleInfo.currency,
        credits: bundleInfo.credits,
        stripe_session_id: sessionId,
        stripe_payment_intent_id: session.payment_intent,
        status: 'succeeded',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return res.status(500).json({ error: 'Failed to record transaction' });
    }

    // Add credits to user account
    const { error: creditError } = await supabase.rpc('add_user_credits', {
      user_uuid: pendingPayment.userId,
      credits_to_add: bundleInfo.credits
    });

    if (creditError) {
      console.error('Error adding credits:', creditError);
      return res.status(500).json({ error: 'Failed to add credits' });
    }

    // Return verification result
    res.json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
      },
      transaction,
      planName: bundleInfo.name,
      credits: bundleInfo.credits,
    });
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

export default router;