import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { CouponMonitoringService } from './src/services/couponMonitoring.js';
import { logSecurityEvent } from './src/middleware/couponSecurity.js';

// Carica le variabili d'ambiente dalla directory api
dotenv.config({ path: './api/.env' });

const app = express();

// Inizializza Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Inizializza Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Inizializza Supabase con service role per operazioni admin
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const monitoring = new CouponMonitoringService();

// Configurazione bundle prodotti
const PRODUCT_BUNDLES = {
  basic: {
    name: 'Analisi Base',
    credits: 10,
    price: 9.99,
    stripePriceId: process.env.STRIPE_PRICE_BASIC
  },
  premium: {
    name: 'Analisi Premium',
    credits: 50,
    price: 39.99,
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM
  },
  enterprise: {
    name: 'Analisi Enterprise',
    credits: 200,
    price: 149.99,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE
  }
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/webhook', express.raw({ type: 'application/json' }));

// Middleware per autenticazione utente
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token di autenticazione richiesto' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Errore nell\'autenticazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};

// Middleware per verificare i permessi di amministratore
const requireAdmin = async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', req.user.id)
      .single();

    if (error || !profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Permessi di amministratore richiesti' });
    }

    next();
  } catch (error) {
    console.error('Errore nella verifica admin:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};

// === STRIPE ROUTES ===
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { bundle, couponCode, userId } = req.body;

    if (!bundle || !PRODUCT_BUNDLES[bundle]) {
      return res.status(400).json({ error: 'Bundle non valido' });
    }

    const productBundle = PRODUCT_BUNDLES[bundle];
    let sessionConfig = {
      payment_method_types: ['card'],
      line_items: [{
        price: productBundle.stripePriceId,
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        bundle,
        credits: productBundle.credits.toString(),
        userId: userId || 'anonymous'
      }
    };

    // Gestione coupon
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode.toUpperCase());
        if (coupon && coupon.valid) {
          sessionConfig.discounts = [{
            coupon: couponCode.toUpperCase()
          }];
        }
      } catch (couponError) {
        console.log('Coupon non trovato o non valido:', couponCode);
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Errore nella creazione della sessione:', error);
    res.status(500).json({ error: 'Errore nella creazione della sessione di pagamento' });
  }
});

app.get('/api/stripe/verify-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    res.json({
      status: session.payment_status,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total,
      metadata: session.metadata
    });
  } catch (error) {
    console.error('Errore nella verifica della sessione:', error);
    res.status(500).json({ error: 'Errore nella verifica della sessione' });
  }
});

app.post('/api/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
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
      case 'payment_intent.failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      default:
        console.log(`Evento non gestito: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Errore nella gestione del webhook:', error);
    res.status(500).json({ error: 'Errore nella gestione del webhook' });
  }
});

// === ANALYTICS ROUTES ===
app.post('/api/analytics/performance', async (req, res) => {
  try {
    const performanceData = req.body;
    
    // Validazione dei dati
    if (!performanceData.url || !performanceData.timestamp) {
      return res.status(400).json({ error: 'URL e timestamp sono obbligatori' });
    }

    // Simula l'archiviazione dei dati (in un'app reale, salveresti nel database)
    const processedData = {
      id: Date.now().toString(),
      ...performanceData,
      processedAt: new Date().toISOString()
    };

    console.log('Dati di performance ricevuti:', processedData);

    res.status(201).json({ 
      success: true, 
      id: processedData.id 
    });
  } catch (error) {
    console.error('Errore nell\'archiviazione dei dati:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.get('/api/analytics/performance', async (req, res) => {
  try {
    const { startDate, endDate, url } = req.query;
    
    // Simula il recupero dei dati (in un'app reale, recupereresti dal database)
    const performanceData = {
      summary: {
        totalRequests: 1250,
        avgResponseTime: 245,
        errorRate: 0.02,
        p95ResponseTime: 450
      },
      trends: [
        { date: '2024-01-15', requests: 150, avgTime: 230 },
        { date: '2024-01-16', requests: 180, avgTime: 260 },
        { date: '2024-01-17', requests: 200, avgTime: 240 }
      ]
    };

    res.json({ data: performanceData });
  } catch (error) {
    console.error('Errore nel recupero dei dati:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.get('/api/analytics/export', async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;
    
    // Simula i dati da esportare
    const exportData = [
      { timestamp: '2024-01-15T10:00:00Z', url: '/api/test', responseTime: 245, status: 200 },
      { timestamp: '2024-01-15T10:01:00Z', url: '/api/users', responseTime: 180, status: 200 },
      { timestamp: '2024-01-15T10:02:00Z', url: '/api/data', responseTime: 320, status: 500 }
    ];

    if (format === 'csv') {
      const csv = 'timestamp,url,responseTime,status\n' + 
        exportData.map(row => `${row.timestamp},${row.url},${row.responseTime},${row.status}`).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=performance-data.csv');
      res.send(csv);
    } else {
      res.json({ data: exportData });
    }
  } catch (error) {
    console.error('Errore nell\'esportazione:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// === RUM ROUTES ===
app.post('/api/rum/data', async (req, res) => {
  try {
    const rumData = req.body;

    // Validazione dei dati RUM
    if (!rumData.url || !rumData.timestamp) {
      return res.status(400).json({ error: 'URL e timestamp sono obbligatori' });
    }

    // Simula l'archiviazione dei dati RUM (in un'app reale, salveresti nel database)
    const processedData = {
      id: Date.now().toString(),
      ...rumData,
      processedAt: new Date().toISOString()
    };

    console.log('Dati RUM ricevuti:', processedData);

    res.status(201).json({ 
      success: true, 
      id: processedData.id 
    });
  } catch (error) {
    console.error('Errore nell\'archiviazione dei dati RUM:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.get('/api/rum/analytics', async (req, res) => {
  try {
    const { startDate, endDate, url } = req.query;

    // Simula il recupero dei dati analitici RUM (in un'app reale, recupereresti dal database)
    const analytics = {
      summary: {
        totalPageViews: 1250,
        avgLoadTime: 2.3,
        avgFCP: 1.8,
        avgLCP: 2.1,
        avgCLS: 0.05,
        avgFID: 45
      },
      trends: [
        { date: '2024-01-15', pageViews: 150, avgLoadTime: 2.1 },
        { date: '2024-01-16', pageViews: 180, avgLoadTime: 2.4 },
        { date: '2024-01-17', pageViews: 200, avgLoadTime: 2.2 }
      ],
      topPages: [
        { url: '/dashboard', views: 450, avgLoadTime: 1.9 },
        { url: '/profile', views: 320, avgLoadTime: 2.1 },
        { url: '/settings', views: 280, avgLoadTime: 2.5 }
      ]
    };

    res.json({ analytics });
  } catch (error) {
    console.error('Errore nel recupero dei dati analitici:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// === COUPONS ROUTES ===
app.get('/api/coupons/validate/:code', authenticateUser, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user.id;

    // Verifica se il coupon esiste ed è attivo
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return res.status(404).json({ error: 'Coupon non trovato o non valido' });
    }

    // Verifica se il coupon è scaduto
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Coupon scaduto' });
    }

    // Verifica il limite di utilizzo
    if (coupon.usage_limit) {
      const { count } = await supabase
        .from('coupon_usage')
        .select('*', { count: 'exact' })
        .eq('coupon_id', coupon.id);

      if (count >= coupon.usage_limit) {
        return res.status(400).json({ error: 'Limite di utilizzo del coupon raggiunto' });
      }
    }

    // Verifica se l'utente ha già utilizzato questo coupon
    if (coupon.single_use_per_user) {
      const { data: usage } = await supabase
        .from('coupon_usage')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId)
        .single();

      if (usage) {
        return res.status(400).json({ error: 'Hai già utilizzato questo coupon' });
      }
    }

    res.json({ 
      valid: true, 
      coupon: {
        code: coupon.code,
        name: coupon.name,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value
      }
    });
  } catch (error) {
    console.error('Errore nella validazione del coupon:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.post('/api/coupons/apply', authenticateUser, async (req, res) => {
  try {
    const { code, amount } = req.body;
    const userId = req.user.id;

    if (!code || !amount) {
      return res.status(400).json({ error: 'Codice coupon e importo sono obbligatori' });
    }

    // Validazione del coupon (riutilizza la logica di validazione)
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return res.status(404).json({ error: 'Coupon non trovato o non valido' });
    }

    // Calcola lo sconto
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (amount * coupon.discount_value) / 100;
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
      }
    } else if (coupon.discount_type === 'fixed_amount') {
      discountAmount = Math.min(coupon.discount_value, amount);
    }

    const finalAmount = Math.max(0, amount - discountAmount);

    res.json({
      originalAmount: amount,
      discountAmount,
      finalAmount,
      coupon: {
        code: coupon.code,
        name: coupon.name,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value
      }
    });
  } catch (error) {
    console.error('Errore nell\'applicazione del coupon:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.get('/api/coupons', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('code, name, discount_type, discount_value, expires_at')
      .eq('is_active', true)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore nel recupero dei coupon:', error);
      return res.status(500).json({ error: 'Errore nel recupero dei coupon' });
    }

    res.json({ coupons: data || [] });
  } catch (error) {
    console.error('Errore nel recupero dei coupon:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.get('/api/coupons/usage', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('coupon_usage')
      .select(`
        *,
        coupon:coupons(code, name, discount_type, discount_value),
        payment:payments(amount, status, created_at)
      `)
      .eq('user_id', userId)
      .order('used_at', { ascending: false });

    if (error) {
      console.error('Errore nel recupero dell\'utilizzo:', error);
      return res.status(500).json({ error: 'Errore nel recupero dell\'utilizzo' });
    }

    res.json({ usage: data || [] });
  } catch (error) {
    console.error('Errore nel recupero dell\'utilizzo:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// === ADMIN COUPONS ROUTES ===
app.get('/api/coupons/admin/all', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore nel recupero dei coupon:', error);
      return res.status(500).json({ error: 'Errore nel recupero dei coupon' });
    }

    res.json({ coupons: data || [] });
  } catch (error) {
    console.error('Errore nel recupero dei coupon:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.post('/api/coupons/admin/create', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const couponData = {
      ...req.body,
      code: req.body.code.toUpperCase(),
      created_by: req.user.id
    };

    // Validazione dei dati
    if (!couponData.code || !couponData.name || !couponData.discount_type || !couponData.discount_value) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    if (!['percentage', 'fixed_amount'].includes(couponData.discount_type)) {
      return res.status(400).json({ error: 'Tipo di sconto non valido' });
    }

    // Crea il coupon in Stripe se necessario
    let stripeCoupon = null;
    try {
      if (couponData.discount_type === 'percentage') {
        stripeCoupon = await stripe.coupons.create({
          id: couponData.code,
          percent_off: couponData.discount_value,
          duration: 'once',
          name: couponData.name
        });
      } else {
        stripeCoupon = await stripe.coupons.create({
          id: couponData.code,
          amount_off: Math.round(couponData.discount_value * 100),
          currency: couponData.currency || 'eur',
          duration: 'once',
          name: couponData.name
        });
      }
    } catch (stripeError) {
      console.error('Errore nella creazione del coupon Stripe:', stripeError);
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert(couponData)
      .select()
      .single();

    if (error) {
      console.error('Errore nella creazione del coupon:', error);
      return res.status(500).json({ error: 'Errore nella creazione del coupon' });
    }

    res.status(201).json({ coupon: data, stripeCoupon });
  } catch (error) {
    console.error('Errore nella creazione del coupon:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.put('/api/coupons/admin/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    const { data, error } = await supabase
      .from('coupons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Errore nell\'aggiornamento del coupon:', error);
      return res.status(500).json({ error: 'Errore nell\'aggiornamento del coupon' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Coupon non trovato' });
    }

    res.json({ coupon: data });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del coupon:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.delete('/api/coupons/admin/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Disattiva invece di eliminare per mantenere la cronologia
    const { data, error } = await supabase
      .from('coupons')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Errore nella disattivazione del coupon:', error);
      return res.status(500).json({ error: 'Errore nella disattivazione del coupon' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Coupon non trovato' });
    }

    res.json({ message: 'Coupon disattivato con successo', coupon: data });
  } catch (error) {
    console.error('Errore nella disattivazione del coupon:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.get('/api/coupons/admin/:id/stats', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Recupera statistiche di utilizzo del coupon
    const { data: usage, error: usageError } = await supabase
      .from('coupon_usage')
      .select('*')
      .eq('coupon_id', id);

    if (usageError) {
      console.error('Errore nel recupero statistiche:', usageError);
      return res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
    }

    const stats = {
      total_uses: usage?.length || 0,
      unique_users: new Set(usage?.map(u => u.user_id) || []).size,
      total_discount_applied: usage?.reduce((sum, u) => sum + (u.discount_amount || 0), 0) || 0,
      last_used: usage?.length > 0 ? Math.max(...usage.map(u => new Date(u.used_at).getTime())) : null,
      usage_by_day: {}
    };

    // Raggruppa utilizzi per giorno
    usage?.forEach(u => {
      const day = new Date(u.used_at).toISOString().split('T')[0];
      stats.usage_by_day[day] = (stats.usage_by_day[day] || 0) + 1;
    });

    res.json({ stats });
  } catch (error) {
    console.error('Errore nel recupero statistiche:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// === COUPON ADMIN SECURITY ROUTES ===
app.get('/api/coupons/admin/security-stats', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    
    const { data, error } = await supabaseAdmin
      .rpc('get_security_stats', { days_back: days });
    
    if (error) {
      throw error;
    }
    
    res.json(data);
  } catch (error) {
    console.error('Errore nel recupero statistiche:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
});

app.get('/api/coupons/admin/security-alerts', requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const { data, error } = await supabaseAdmin
      .from('security_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    res.json(data || []);
  } catch (error) {
    console.error('Errore nel recupero alert:', error);
    res.status(500).json({ error: 'Errore nel recupero degli alert' });
  }
});

app.post('/api/coupons/admin/block-ip', requireAdmin, async (req, res) => {
  try {
    const { ipAddress, reason } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({ error: 'Indirizzo IP richiesto' });
    }
    
    // Valida formato IP
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ipAddress)) {
      return res.status(400).json({ error: 'Formato IP non valido' });
    }
    
    // Inserisci nella blacklist
    const { error: blacklistError } = await supabaseAdmin
      .from('ip_blacklist')
      .upsert({
        ip_address: ipAddress,
        reason: reason || 'Bloccato manualmente dall\'amministratore',
        blocked_by: req.user.id,
        blocked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    
    if (blacklistError && blacklistError.code !== '42P01') {
      throw blacklistError;
    }
    
    // Log dell'evento
    await logSecurityEvent({
      ip_address: ipAddress,
      user_id: req.user.id,
      action_type: 'admin_ip_block',
      details: {
        reason,
        blocked_by: req.user.email,
        manual_block: true
      }
    });
    
    res.json({ 
      success: true, 
      message: `IP ${ipAddress} bloccato con successo`,
      blocked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Errore nel blocco IP:', error);
    res.status(500).json({ error: 'Errore nel blocco dell\'IP' });
  }
});

app.post('/api/coupons/admin/unblock-ip', requireAdmin, async (req, res) => {
  try {
    const { ipAddress } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({ error: 'Indirizzo IP richiesto' });
    }
    
    const { error } = await supabaseAdmin
      .from('ip_blacklist')
      .delete()
      .eq('ip_address', ipAddress);
    
    if (error && error.code !== '42P01') {
      throw error;
    }
    
    await logSecurityEvent({
      ip_address: ipAddress,
      user_id: req.user.id,
      action_type: 'admin_ip_unblock',
      details: {
        unblocked_by: req.user.email,
        manual_unblock: true
      }
    });
    
    res.json({ 
      success: true, 
      message: `IP ${ipAddress} sbloccato con successo`
    });
  } catch (error) {
    console.error('Errore nello sblocco IP:', error);
    res.status(500).json({ error: 'Errore nello sblocco dell\'IP' });
  }
});

app.get('/api/coupons/admin/blacklisted-ips', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ip_blacklist')
      .select('*')
      .order('blocked_at', { ascending: false });
    
    if (error && error.code !== '42P01') {
      throw error;
    }
    
    res.json(data || []);
  } catch (error) {
    console.error('Errore nel recupero IP bloccati:', error);
    res.status(500).json({ error: 'Errore nel recupero degli IP bloccati' });
  }
});

app.get('/api/coupons/admin/security-logs', requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const { data, error } = await supabaseAdmin
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error && error.code !== '42P01') {
      throw error;
    }
    
    res.json(data || []);
  } catch (error) {
    console.error('Errore nel recupero log:', error);
    res.status(500).json({ error: 'Errore nel recupero dei log' });
  }
});

app.post('/api/coupons/admin/run-analysis', requireAdmin, async (req, res) => {
  try {
    // Simula analisi pattern sospetti
    const mockAnalysis = {
      timestamp: new Date().toISOString(),
      patterns_detected: Math.floor(Math.random() * 5),
      high_risk_ips: Math.floor(Math.random() * 3),
      suspicious_activities: Math.floor(Math.random() * 10),
      recommendations: [
        'Monitorare IP 192.168.1.100 per attività sospette',
        'Verificare pattern di utilizzo coupon nelle ultime 24h',
        'Controllare tentativi di accesso multipli'
      ]
    };
    
    res.json({
      success: true,
      analysis: mockAnalysis
    });
  } catch (error) {
    console.error('Errore nell\'analisi:', error);
    res.status(500).json({ error: 'Errore nell\'esecuzione dell\'analisi' });
  }
});

app.get('/api/coupons/admin/security-report', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    // Simula report di sicurezza
    const mockReport = {
      period: `Ultimi ${days} giorni`,
      generated_at: new Date().toISOString(),
      summary: {
        total_attempts: Math.floor(Math.random() * 1000),
        blocked_attempts: Math.floor(Math.random() * 100),
        unique_ips: Math.floor(Math.random() * 500),
        security_incidents: Math.floor(Math.random() * 10)
      },
      top_threats: [
        { ip: '192.168.1.100', attempts: 45, risk_level: 'high' },
        { ip: '10.0.0.50', attempts: 23, risk_level: 'medium' }
      ],
      recommendations: [
        'Implementare rate limiting più aggressivo',
        'Monitorare pattern di utilizzo coupon',
        'Aggiornare regole di sicurezza'
      ]
    };
    
    res.json(mockReport);
  } catch (error) {
    console.error('Errore nel report:', error);
    res.status(500).json({ error: 'Errore nella generazione del report' });
  }
});

app.post('/api/coupons/admin/cleanup', requireAdmin, async (req, res) => {
  try {
    const daysOld = parseInt(req.body.days) || 90;
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    
    // Simula pulizia dati vecchi
    const mockCleanup = {
      deleted_logs: Math.floor(Math.random() * 1000),
      deleted_alerts: Math.floor(Math.random() * 100),
      freed_space: `${Math.floor(Math.random() * 500)}MB`,
      cutoff_date: cutoffDate
    };
    
    res.json({
      success: true,
      cleanup_result: mockCleanup
    });
  } catch (error) {
    console.error('Errore nella pulizia:', error);
    res.status(500).json({ error: 'Errore nella pulizia dei dati' });
  }
});

// Funzione helper per logging eventi di sicurezza
async function logSecurityEvent(eventData) {
  try {
    await supabaseAdmin
      .from('security_logs')
      .insert({
        ...eventData,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Errore nel logging evento sicurezza:', error);
  }
}

// === ALERTS ROUTES ===
app.post('/api/alerts/performance', async (req, res) => {
  try {
    const { metric, threshold, condition, message } = req.body;

    // Validazione dei dati
    if (!metric || !threshold || !condition || !message) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    // Simula la registrazione dell'avviso (in un'app reale, salveresti nel database)
    const alert = {
      id: Date.now().toString(),
      metric,
      threshold,
      condition,
      message,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    // Simula la notifica (in un'app reale, invieresti email/SMS/webhook)
    console.log('Nuovo avviso creato:', alert);

    res.status(201).json({ alert });
  } catch (error) {
    console.error('Errore nella creazione dell\'avviso:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.get('/api/alerts/performance', async (req, res) => {
  try {
    // Simula il recupero degli avvisi (in un'app reale, recupereresti dal database)
    const alerts = [
      {
        id: '1',
        metric: 'response_time',
        threshold: 1000,
        condition: 'greater_than',
        message: 'Tempo di risposta troppo alto',
        isActive: true,
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        metric: 'error_rate',
        threshold: 5,
        condition: 'greater_than',
        message: 'Tasso di errore elevato',
        isActive: false,
        createdAt: '2024-01-14T15:30:00Z'
      }
    ];

    res.json({ alerts });
  } catch (error) {
    console.error('Errore nel recupero degli avvisi:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.patch('/api/alerts/performance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Simula l'aggiornamento dell'avviso (in un'app reale, aggiorneresti nel database)
    const updatedAlert = {
      id,
      metric: 'response_time',
      threshold: 1000,
      condition: 'greater_than',
      message: 'Tempo di risposta troppo alto',
      isActive,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: new Date().toISOString()
    };

    console.log('Avviso aggiornato:', updatedAlert);

    res.json({ alert: updatedAlert });
  } catch (error) {
    console.error('Errore nell\'aggiornamento dell\'avviso:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

app.delete('/api/alerts/performance/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Simula l'eliminazione dell'avviso (in un'app reale, elimineresti dal database)
    console.log('Avviso eliminato:', id);

    res.json({ message: 'Avviso eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione dell\'avviso:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

// Helper functions for Stripe webhooks
async function handleCheckoutSessionCompleted(session) {
  console.log('Checkout session completata:', session.id);
  
  try {
    const { bundle, credits, userId } = session.metadata;
    
    // Aggiorna l'utilizzo del coupon se presente
    if (session.discount && session.discount.coupon) {
      const couponCode = session.discount.coupon.id;
      await updateCouponUsage(couponCode, userId, session.amount_total / 100);
    }
    
    // Registra la transazione
    await recordTransaction({
      sessionId: session.id,
      userId,
      bundle,
      credits: parseInt(credits),
      amount: session.amount_total / 100,
      status: 'completed'
    });
    
    // Aggiungi crediti all'utente
    if (userId && userId !== 'anonymous') {
      await addUserCredits(userId, parseInt(credits));
    }
  } catch (error) {
    console.error('Errore nella gestione del checkout completato:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('Payment intent riuscito:', paymentIntent.id);
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log('Payment intent fallito:', paymentIntent.id);
}

async function updateCouponUsage(couponCode, userId, discountAmount) {
  try {
    const { error } = await supabase
      .from('coupon_usage')
      .insert({
        coupon_code: couponCode,
        user_id: userId,
        discount_amount: discountAmount,
        used_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Errore nell\'aggiornamento utilizzo coupon:', error);
    }
  } catch (error) {
    console.error('Errore nell\'aggiornamento utilizzo coupon:', error);
  }
}

async function recordTransaction(transactionData) {
  try {
    const { error } = await supabase
      .from('transactions')
      .insert(transactionData);
    
    if (error) {
      console.error('Errore nella registrazione transazione:', error);
    }
  } catch (error) {
    console.error('Errore nella registrazione transazione:', error);
  }
}

async function addUserCredits(userId, credits) {
  try {
    const { error } = await supabase
      .rpc('add_user_credits', {
        user_id: userId,
        credits_to_add: credits
      });
    
    if (error) {
      console.error('Errore nell\'aggiunta crediti:', error);
    }
  } catch (error) {
    console.error('Errore nell\'aggiunta crediti:', error);
  }
}

// Funzioni per l'inizializzazione (mantenute per compatibilità con api/[...path].js)
export function initializeRoutes() {
  // Funzione vuota per compatibilità
}

export function setupRoutes() {
  // Funzione vuota per compatibilità
}

export default app;