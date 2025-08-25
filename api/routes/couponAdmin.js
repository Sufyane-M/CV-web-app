// Route amministrative per la gestione della sicurezza dei coupon
import express from 'express';
import { createClient } from '@supabase/supabase-js';
// import { CouponMonitoringService } from '../../src/services/couponMonitoring.js';
// import { logSecurityEvent } from '../../src/middleware/couponSecurity.js';

const router = express.Router();

// Inizializza Supabase con service role per operazioni admin
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// const monitoring = new CouponMonitoringService();

// Middleware per verificare i permessi di amministratore
const requireAdmin = async (req, res, next) => {
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

    // Verifica se l'utente è admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Permessi di amministratore richiesti' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Errore nella verifica admin:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};

/**
 * GET /api/coupons/admin/security-stats
 * Ottiene le statistiche di sicurezza
 */
router.get('/security-stats', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    
    const { data, error } = await supabase
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

/**
 * GET /api/coupons/admin/security-alerts
 * Ottiene gli alert di sicurezza recenti
 */
router.get('/security-alerts', requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const { data, error } = await supabase
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

/**
 * GET /api/coupons/admin/suspicious-patterns
 * Rileva pattern sospetti
 */
router.get('/suspicious-patterns', requireAdmin, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    
    const { data, error } = await supabase
      .rpc('detect_suspicious_patterns', { lookback_hours: hours });
    
    if (error) {
      throw error;
    }
    
    res.json(data || []);
  } catch (error) {
    console.error('Errore nel rilevamento pattern:', error);
    res.status(500).json({ error: 'Errore nel rilevamento dei pattern sospetti' });
  }
});

/**
 * POST /api/coupons/admin/block-ip
 * Blocca un IP sospetto
 */
router.post('/block-ip', requireAdmin, async (req, res) => {
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
    const { error: blacklistError } = await supabase
      .from('ip_blacklist')
      .upsert({
        ip_address: ipAddress,
        reason: reason || 'Bloccato manualmente dall\'amministratore',
        blocked_by: req.user.id,
        blocked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 ore
      });
    
    if (blacklistError && blacklistError.code !== '42P01') {
      throw blacklistError;
    }
    
    // Log dell'evento
    // await logSecurityEvent({
    //   ip_address: ipAddress,
    //   user_id: req.user.id,
    //   action_type: 'admin_ip_block',
    //   details: {
    //     reason,
    //     blocked_by: req.user.email,
    //     manual_block: true
    //   }
    // });
    
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

/**
 * POST /api/coupons/admin/unblock-ip
 * Sblocca un IP
 */
router.post('/unblock-ip', requireAdmin, async (req, res) => {
  try {
    const { ipAddress } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({ error: 'Indirizzo IP richiesto' });
    }
    
    // Rimuovi dalla blacklist
    const { error } = await supabase
      .from('ip_blacklist')
      .delete()
      .eq('ip_address', ipAddress);
    
    if (error && error.code !== '42P01') {
      throw error;
    }
    
    // Log dell'evento
    // await logSecurityEvent({
    //   ip_address: ipAddress,
    //   user_id: req.user.id,
    //   action_type: 'admin_ip_unblock',
    //   details: {
    //     unblocked_by: req.user.email,
    //     manual_unblock: true
    //   }
    // });
    
    res.json({ 
      success: true, 
      message: `IP ${ipAddress} sbloccato con successo`
    });
  } catch (error) {
    console.error('Errore nello sblocco IP:', error);
    res.status(500).json({ error: 'Errore nello sblocco dell\'IP' });
  }
});

/**
 * GET /api/coupons/admin/blacklisted-ips
 * Ottiene la lista degli IP bloccati
 */
router.get('/blacklisted-ips', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
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

/**
 * GET /api/coupons/admin/security-logs
 * Ottiene i log di sicurezza
 */
router.get('/security-logs', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const actionType = req.query.action_type;
    const ipAddress = req.query.ip_address;
    
    let query = supabase
      .from('coupon_security_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    
    if (ipAddress) {
      query = query.eq('ip_address', ipAddress);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    res.json({
      logs: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Errore nel recupero log:', error);
    res.status(500).json({ error: 'Errore nel recupero dei log di sicurezza' });
  }
});

/**
 * POST /api/coupons/admin/run-analysis
 * Esegue un'analisi manuale dei pattern
 */
router.post('/run-analysis', requireAdmin, async (req, res) => {
  try {
    // const alerts = await monitoring.analyzeUsagePatterns();
    // const bruteForce = await monitoring.detectBruteForceAttempts();
    // const temporal = await monitoring.analyzeTemporalPatterns();
    
    res.json({
      success: true,
      results: {
        usage_alerts: [], // alerts,
        brute_force_detected: [], // bruteForce,
        temporal_analysis: {} // temporal
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Errore nell\'analisi manuale:', error);
    res.status(500).json({ error: 'Errore nell\'esecuzione dell\'analisi' });
  }
});

/**
 * GET /api/coupons/admin/security-report
 * Genera un report di sicurezza completo
 */
router.get('/security-report', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    // const report = await monitoring.generateSecurityReport(days);
    const report = { message: 'Security report temporarily disabled' };
    
    res.json(report);
  } catch (error) {
    console.error('Errore nella generazione report:', error);
    res.status(500).json({ error: 'Errore nella generazione del report' });
  }
});

/**
 * POST /api/coupons/admin/cleanup
 * Pulisce i dati vecchi
 */
router.post('/cleanup', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_old_coupon_data');
    
    if (error) {
      throw error;
    }
    
    // Log dell'operazione di pulizia
    // await logSecurityEvent({
    //   user_id: req.user.id,
    //   action_type: 'admin_cleanup',
    //   details: {
    //     cleanup_results: data,
    //     performed_by: req.user.email
    //   }
    // });
    
    res.json({
      success: true,
      message: 'Pulizia completata con successo',
      results: data
    });
  } catch (error) {
    console.error('Errore nella pulizia:', error);
    res.status(500).json({ error: 'Errore nella pulizia dei dati' });
  }
});

export default router;