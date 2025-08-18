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
      .eq('stripe_session_id', sessionId)
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
        .eq('stripe_session_id', sessionId);

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
}


