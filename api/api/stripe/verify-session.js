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
};