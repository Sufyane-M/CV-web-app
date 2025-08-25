import express from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
// import {
//   couponValidationLimiter,
//   couponApplicationLimiter,
//   couponSecurityMiddleware,
//   secureCouponApplication,
//   logSecurityEvent
// } from '../../src/middleware/couponSecurity.js';

// Carica le variabili d'ambiente
dotenv.config();

const router = express.Router();

// Inizializza Supabase con service role key per operazioni admin
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Inizializza Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Middleware per verificare l'autenticazione
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token di autenticazione mancante' });
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
    res.status(500).json({ error: 'Errore del server' });
  }
};

/**
 * Middleware per verificare i permessi admin
 */
const requireAdmin = async (req, res, next) => {
  try {
    // Verifica se l'utente ha il ruolo admin
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('metadata')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const isAdmin = profile.metadata?.role === 'admin' || req.user.email?.endsWith('@admin.com');
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Permessi amministratore richiesti' });
    }

    next();
  } catch (error) {
    console.error('Errore nella verifica admin:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
};

/**
 * GET /api/coupons/validate/:code
 * Valida un coupon per un utente specifico
 */
router.get('/validate/:code', /* couponValidationLimiter, ...couponSecurityMiddleware, */ authenticateUser, async (req, res) => {
  try {
    const { code } = req.params;
    const { amount } = req.query;
    const userId = req.user.id;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Importo non valido' });
    }

    // Chiama la funzione di validazione nel database
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: code.toUpperCase(),
      p_user_id: userId,
      p_amount: parseInt(amount)
    });

    if (error) {
      console.error('Errore nella validazione del coupon:', error);
      return res.status(500).json({ error: 'Errore nella validazione del coupon' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Coupon non trovato' });
    }

    const result = data[0];
    
    if (!result.is_valid) {
      return res.status(400).json({ 
        error: result.error_message || 'Coupon non valido',
        isValid: false
      });
    }

    // Recupera i dettagli completi del coupon
    const { data: couponData, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', result.coupon_id)
      .single();

    if (couponError) {
      console.error('Errore nel recupero del coupon:', couponError);
      return res.status(500).json({ error: 'Errore nel recupero del coupon' });
    }

    res.json({
      isValid: true,
      coupon: couponData,
      discountAmount: result.discount_amount,
      finalAmount: parseInt(amount) - result.discount_amount
    });
  } catch (error) {
    console.error('Errore nella validazione del coupon:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

/**
 * POST /api/coupons/apply
 * Applica un coupon a un pagamento
 */
router.post('/apply', /* couponApplicationLimiter, ...secureCouponApplication, */ authenticateUser, async (req, res) => {
  try {
    const { couponId, paymentId, originalAmount, discountAmount, stripeCouponId } = req.body;
    const userId = req.user.id;

    if (!couponId || !paymentId || !originalAmount || !discountAmount) {
      return res.status(400).json({ error: 'Parametri mancanti' });
    }

    // Applica il coupon
    const { data, error } = await supabase.rpc('apply_coupon', {
      p_coupon_id: couponId,
      p_user_id: userId,
      p_payment_id: paymentId,
      p_original_amount: originalAmount,
      p_discount_amount: discountAmount,
      p_stripe_coupon_id: stripeCouponId
    });

    if (error) {
      console.error('Errore nell\'applicazione del coupon:', error);
      return res.status(500).json({ error: 'Errore nell\'applicazione del coupon' });
    }

    if (!data) {
      return res.status(400).json({ error: 'Impossibile applicare il coupon' });
    }

    res.json({
      success: true,
      discountAmount,
      finalAmount: originalAmount - discountAmount
    });
  } catch (error) {
    console.error('Errore nell\'applicazione del coupon:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

/**
 * GET /api/coupons/active
 * Recupera tutti i coupon attivi
 */
router.get('/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('code, name, description, discount_type, discount_value, minimum_amount, valid_until')
      .eq('is_active', true)
      .gte('valid_until', new Date().toISOString())
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

/**
 * GET /api/coupons/usage
 * Recupera l'utilizzo dei coupon per l'utente corrente
 */
router.get('/usage', authenticateUser, async (req, res) => {
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

// === ADMIN ENDPOINTS ===

/**
 * GET /api/coupons/admin/all
 * Recupera tutti i coupon (solo admin)
 */
router.get('/admin/all', authenticateUser, requireAdmin, async (req, res) => {
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

/**
 * POST /api/coupons/admin/create
 * Crea un nuovo coupon (solo admin)
 */
router.post('/admin/create', authenticateUser, requireAdmin, async (req, res) => {
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
          amount_off: Math.round(couponData.discount_value * 100), // Converti in centesimi
          currency: couponData.currency || 'eur',
          duration: 'once',
          name: couponData.name
        });
      }
    } catch (stripeError) {
      console.error('Errore nella creazione del coupon Stripe:', stripeError);
      // Continua comunque con la creazione nel database
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

/**
 * PUT /api/coupons/admin/:id
 * Aggiorna un coupon esistente (solo admin)
 */
router.put('/admin/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('coupons')
      .update(updates)
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

/**
 * DELETE /api/coupons/admin/:id
 * Disattiva un coupon (solo admin)
 */
router.delete('/admin/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

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

/**
 * GET /api/coupons/admin/:id/stats
 * Recupera le statistiche di utilizzo di un coupon (solo admin)
 */
router.get('/admin/:id/stats', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('coupon_usage')
      .select('discount_amount, used_at, user_id')
      .eq('coupon_id', id);

    if (error) {
      console.error('Errore nel recupero delle statistiche:', error);
      return res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
    }

    const totalUsage = data?.length || 0;
    const totalDiscount = data?.reduce((sum, usage) => sum + usage.discount_amount, 0) || 0;
    const avgDiscount = totalUsage > 0 ? totalDiscount / totalUsage : 0;
    const uniqueUsers = new Set(data?.map(usage => usage.user_id)).size;

    res.json({
      stats: {
        totalUsage,
        totalDiscount,
        avgDiscount,
        uniqueUsers,
        usageHistory: data
      }
    });
  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

export default router;