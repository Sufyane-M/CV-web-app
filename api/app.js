import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
let stripe;
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('your_stripe_secret_key_here')) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Initialize Supabase
let supabase;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Bundle configurations
const BUNDLES = {
  starter: {
    id: 'starter',
    name: 'Pacchetto Base',
    price: 4.99,
    credits: 4,
    currency: 'EUR',
    description: 'Ideale per chi vuole testare il nostro servizio',
    stripePriceId: process.env.STRIPE_PRICE_ID_STARTER || null
  },
  value: {
    id: 'value',
    name: 'Pacchetto Premium',
    price: 9.99,
    credits: 10,
    currency: 'EUR',
    description: 'La scelta migliore per chi cerca il massimo valore',
    stripePriceId: process.env.STRIPE_PRICE_ID_VALUE || null
  }
};

// Helper functions for Stripe webhooks
async function handleCheckoutSessionCompleted(session) {
  console.log('Checkout session completed:', session.id);
  
  if (!supabase) {
    console.error('Supabase non configurato per gestire il checkout completato');
    return;
  }

  try {
    const { bundleId, userId, credits, couponCode } = session.metadata;
    
    // Update coupon usage if applied
    if (couponCode) {
      await supabase
        .from('coupons')
        .update({ usage_count: supabase.raw('usage_count + 1') })
        .eq('code', couponCode.toUpperCase());
    }
    
    // Record transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        session_id: session.id,
        bundle_id: bundleId,
        amount: session.amount_total / 100,
        currency: session.currency,
        status: 'completed',
        credits_purchased: parseInt(credits),
        coupon_code: couponCode || null
      });
    
    if (transactionError) {
      console.error('Errore nel salvare la transazione:', transactionError);
    }
    
    // Add credits to user if userId is provided and not anonymous
    if (userId && userId !== 'anonymous') {
      const { error: creditsError } = await supabase
        .from('user_credits')
        .upsert({
          user_id: userId,
          credits: supabase.raw(`COALESCE(credits, 0) + ${parseInt(credits)}`)
        }, {
          onConflict: 'user_id'
        });
      
      if (creditsError) {
        console.error('Errore nell\'aggiungere crediti:', creditsError);
      }
    }
  } catch (error) {
    console.error('Errore nella gestione del checkout completato:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);
  // Additional logic for successful payments if needed
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log('Payment intent failed:', paymentIntent.id);
  
  if (!supabase) {
    console.error('Supabase non configurato per gestire il pagamento fallito');
    return;
  }

  try {
    // Update transaction status to failed
    await supabase
      .from('transactions')
      .update({ status: 'failed' })
      .eq('payment_intent_id', paymentIntent.id);
  } catch (error) {
    console.error('Errore nella gestione del pagamento fallito:', error);
  }
}

// Function to initialize routes (now empty but kept for compatibility)
export async function initializeRoutes() {
  // Routes are now defined directly in the app
}

const app = express();

// Middleware
app.use(cors());

// For Stripe webhooks, we need raw body
app.use(['/api/stripe/webhook', '/stripe/webhook'], express.raw({ type: 'application/json' }));

// For other routes, use JSON parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Function to setup routes after initialization
export function setupRoutes() {
  // Stripe routes
  app.post('/api/stripe/create-checkout-session', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: 'Stripe non configurato' });
      }

      const { bundleId, couponCode, userId } = req.body;
      
      if (!bundleId || !BUNDLES[bundleId]) {
        return res.status(400).json({ error: 'Bundle non valido' });
      }

      const bundle = BUNDLES[bundleId];
      let finalPrice = bundle.price;
      let discountAmount = 0;
      let appliedCoupon = null;

      // Apply coupon if provided
      if (couponCode && supabase) {
        const { data: coupon, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', couponCode.toUpperCase())
          .eq('active', true)
          .single();

        if (!error && coupon) {
          const now = new Date();
          const validFrom = new Date(coupon.valid_from);
          const validUntil = new Date(coupon.valid_until);

          if (now >= validFrom && now <= validUntil && coupon.usage_count < coupon.usage_limit) {
            if (coupon.discount_type === 'percentage') {
              discountAmount = (finalPrice * coupon.discount_value) / 100;
            } else {
              discountAmount = Math.min(coupon.discount_value, finalPrice);
            }
            finalPrice = Math.max(0, finalPrice - discountAmount);
            appliedCoupon = coupon;
          }
        }
      }

      const sessionConfig = {
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pricing`,
        metadata: {
          bundleId,
          userId: userId || 'anonymous',
          credits: bundle.credits.toString(),
          couponCode: appliedCoupon?.code || '',
          originalPrice: bundle.price.toString(),
          discountAmount: discountAmount.toString()
        }
      };

      if (bundle.stripePriceId && !appliedCoupon) {
        sessionConfig.line_items = [{
          price: bundle.stripePriceId,
          quantity: 1
        }];
      } else {
        sessionConfig.line_items = [{
          price_data: {
            currency: bundle.currency.toLowerCase(),
            product_data: {
              name: bundle.name,
              description: `${bundle.description} - ${bundle.credits} crediti${appliedCoupon ? ` (Sconto applicato: ${couponCode})` : ''}`
            },
            unit_amount: Math.round(finalPrice * 100)
          },
          quantity: 1
        }];
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      res.json({ 
        sessionId: session.id,
        url: session.url,
        appliedDiscount: appliedCoupon ? {
          code: appliedCoupon.code,
          amount: discountAmount,
          type: appliedCoupon.discount_type
        } : null
      });
    } catch (error) {
      console.error('Errore nella creazione della sessione:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  app.get('/api/stripe/verify-session/:sessionId', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: 'Stripe non configurato' });
      }

      const { sessionId } = req.params;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      res.json({
        status: session.payment_status,
        metadata: session.metadata
      });
    } catch (error) {
      console.error('Errore nella verifica della sessione:', error);
      res.status(500).json({ error: 'Errore nella verifica del pagamento' });
    }
  });

  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(500).send('Webhook non configurato');
      }

      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Errore nella verifica del webhook:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

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
          console.log(`Evento non gestito: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Errore nella gestione del webhook:', error);
      res.status(500).json({ error: 'Errore nella gestione del webhook' })
   });

   // Analytics routes
   app.post('/api/analytics/performance', async (req, res) => {
     try {
       const { metric, value, id, timestamp, userAgent, url, userId, sessionId } = req.body;
       
       console.log('Performance Metric:', {
         metric,
         value,
         id,
         timestamp,
         userAgent,
         url,
         userId,
         sessionId
       });
       
       res.json({ 
         success: true, 
         message: 'Performance metric recorded',
         timestamp: new Date().toISOString()
       });
     } catch (error) {
       console.error('Error recording performance metric:', error);
       res.status(500).json({ 
         success: false, 
         error: 'Failed to record performance metric' 
       });
     }
   });

   app.get('/api/analytics/performance', async (req, res) => {
     try {
       const { userId, sessionId, metric, startDate, endDate } = req.query;
       
       const mockData = {
         metrics: [],
         summary: {
           totalMetrics: 0,
           averageValues: {},
           trends: {}
         }
       };
       
       res.json({
         success: true,
         data: mockData,
         timestamp: new Date().toISOString()
       });
     } catch (error) {
       console.error('Error fetching performance analytics:', error);
       res.status(500).json({ 
         success: false, 
         error: 'Failed to fetch performance analytics' 
       });
     }
   });

   app.get('/api/analytics/export', async (req, res) => {
     try {
       const { format = 'json', userId, startDate, endDate } = req.query;
       
       const exportData = {
         exportDate: new Date().toISOString(),
         userId,
         dateRange: { startDate, endDate },
         metrics: []
       };
       
       if (format === 'csv') {
         res.setHeader('Content-Type', 'text/csv');
         res.setHeader('Content-Disposition', 'attachment; filename=performance-metrics.csv');
         res.send('metric,value,timestamp\n');
       } else {
         res.json({
           success: true,
           data: exportData,
           timestamp: new Date().toISOString()
         });
       }
     } catch (error) {
       console.error('Error exporting performance data:', error);
       res.status(500).json({ 
         success: false, 
         error: 'Failed to export performance data' 
       });
     }
   });

   // Alerts routes
   app.post('/api/alerts/performance', async (req, res) => {
     try {
       const { 
         id, 
         timestamp, 
         level, 
         metric, 
         value, 
         threshold, 
         message, 
         url, 
         userAgent, 
         sessionId,
         context 
       } = req.body;
       
       console.log('Performance Alert:', {
         id,
         timestamp,
         level,
         metric,
         value,
         threshold,
         message,
         url,
         userAgent,
         sessionId,
         context
       });
       
       res.json({ 
         success: true, 
         message: 'Performance alert recorded',
         alertId: id,
         timestamp: new Date().toISOString()
       });
     } catch (error) {
       console.error('Error recording performance alert:', error);
       res.status(500).json({ 
         success: false, 
         error: 'Failed to record performance alert' 
       });
     }
   });

   app.get('/api/alerts/performance', async (req, res) => {
     try {
       const { 
         userId, 
         sessionId, 
         level, 
         metric, 
         startDate, 
         endDate, 
         limit = 50 
       } = req.query;
       
       const mockAlerts = [];
       
       res.json({
         success: true,
         data: {
           alerts: mockAlerts,
           total: mockAlerts.length,
           summary: {
             critical: 0,
             warning: 0,
             resolved: 0
           }
         },
         timestamp: new Date().toISOString()
       });
     } catch (error) {
       console.error('Error fetching performance alerts:', error);
       res.status(500).json({ 
         success: false, 
         error: 'Failed to fetch performance alerts' 
       });
     }
   });

   app.patch('/api/alerts/performance/:alertId', async (req, res) => {
     try {
       const { alertId } = req.params;
       const { status, notes } = req.body;
       
       console.log(`Updating alert ${alertId}:`, { status, notes });
       
       res.json({
         success: true,
         message: 'Alert updated successfully',
         alertId,
         timestamp: new Date().toISOString()
       });
     } catch (error) {
       console.error('Error updating performance alert:', error);
       res.status(500).json({ 
         success: false, 
         error: 'Failed to update performance alert' 
       });
     }
   });

   app.delete('/api/alerts/performance/:alertId', async (req, res) => {
     try {
       const { alertId } = req.params;
       
       console.log(`Deleting alert ${alertId}`);
       
       res.json({
         success: true,
         message: 'Alert deleted successfully',
         alertId,
         timestamp: new Date().toISOString()
       });
     } catch (error) {
       console.error('Error deleting performance alert:', error);
       res.status(500).json({ 
         success: false, 
         error: 'Failed to delete performance alert' 
       });
     }
   });

   // Health check endpoint
   app.get(['/health', '/api/health'], (req, res) => {
     res.json({ status: 'OK', timestamp: new Date().toISOString() });
   });
   
   // Add 404 handler after all routes are configured
  app.use('*', (req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route not found', path: req.url, method: req.method });
  });
}

// Health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
export { app };


