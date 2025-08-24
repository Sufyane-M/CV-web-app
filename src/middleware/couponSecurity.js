// Middleware per la sicurezza del sistema coupon
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rate limiting per le richieste di validazione coupon
const couponValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 10, // Massimo 10 tentativi di validazione per IP ogni 15 minuti
  message: {
    error: 'Troppi tentativi di validazione coupon. Riprova tra 15 minuti.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usa IP + user ID se disponibile per un rate limiting più preciso
    const userId = req.user?.id || 'anonymous';
    return `${req.ip}-${userId}`;
  }
});

// Rate limiting per l'applicazione di coupon
const couponApplicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ora
  max: 5, // Massimo 5 applicazioni di coupon per IP ogni ora
  message: {
    error: 'Troppi tentativi di applicazione coupon. Riprova tra 1 ora.',
    code: 'COUPON_APPLICATION_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    return `coupon-apply-${req.ip}-${userId}`;
  }
});

// Middleware per validare l'input dei coupon
const validateCouponInput = (req, res, next) => {
  const { couponCode } = req.body;
  
  if (!couponCode) {
    return res.status(400).json({
      error: 'Codice coupon richiesto',
      code: 'MISSING_COUPON_CODE'
    });
  }
  
  // Validazione formato codice coupon
  const couponRegex = /^[A-Z0-9]{3,20}$/;
  if (!couponRegex.test(couponCode)) {
    return res.status(400).json({
      error: 'Formato codice coupon non valido. Usa solo lettere maiuscole e numeri (3-20 caratteri).',
      code: 'INVALID_COUPON_FORMAT'
    });
  }
  
  // Sanitizza il codice coupon
  req.body.couponCode = couponCode.trim().toUpperCase();
  
  next();
};

// Middleware per prevenire attacchi di brute force sui coupon
const preventCouponBruteForce = async (req, res, next) => {
  const { couponCode } = req.body;
  const clientIP = req.ip;
  const userId = req.user?.id;
  
  try {
    // Controlla i tentativi falliti recenti per questo IP
    const { data: recentAttempts, error } = await supabase
      .from('coupon_security_log')
      .select('*')
      .eq('ip_address', clientIP)
      .eq('action_type', 'validation_failed')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Ultima ora
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Errore nel controllo sicurezza coupon:', error);
      // Continua comunque per non bloccare il servizio
      return next();
    }
    
    // Se ci sono più di 20 tentativi falliti nell'ultima ora, blocca
    if (recentAttempts && recentAttempts.length >= 20) {
      // Log del tentativo bloccato
      await logSecurityEvent({
        ip_address: clientIP,
        user_id: userId,
        coupon_code: couponCode,
        action_type: 'blocked_brute_force',
        details: { attempts_count: recentAttempts.length }
      });
      
      return res.status(429).json({
        error: 'Troppi tentativi falliti. Account temporaneamente bloccato per sicurezza.',
        code: 'BRUTE_FORCE_PROTECTION'
      });
    }
    
    next();
  } catch (err) {
    console.error('Errore nel middleware di sicurezza:', err);
    next(); // Continua per non bloccare il servizio
  }
};

// Middleware per verificare l'utilizzo multiplo di coupon
const preventMultipleCouponUsage = async (req, res, next) => {
  const { couponCode } = req.body;
  const userId = req.user?.id;
  const sessionId = req.sessionID || req.headers['x-session-id'];
  
  if (!userId && !sessionId) {
    return res.status(401).json({
      error: 'Autenticazione richiesta per utilizzare i coupon',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  try {
    // Controlla se l'utente ha già utilizzato questo coupon
    const { data: existingUsage, error } = await supabase
      .from('coupon_usage')
      .select('*')
      .eq('coupon_code', couponCode)
      .or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
    
    if (error) {
      console.error('Errore nel controllo utilizzo coupon:', error);
      return next();
    }
    
    if (existingUsage && existingUsage.length > 0) {
      // Log del tentativo di riutilizzo
      await logSecurityEvent({
        ip_address: req.ip,
        user_id: userId,
        coupon_code: couponCode,
        action_type: 'duplicate_usage_attempt',
        details: { existing_usage: existingUsage }
      });
      
      return res.status(400).json({
        error: 'Hai già utilizzato questo coupon',
        code: 'COUPON_ALREADY_USED'
      });
    }
    
    next();
  } catch (err) {
    console.error('Errore nel controllo utilizzo multiplo:', err);
    next();
  }
};

// Middleware per validare l'importo del carrello
const validateCartAmount = (req, res, next) => {
  const { amount } = req.body;
  
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      error: 'Importo carrello non valido',
      code: 'INVALID_CART_AMOUNT'
    });
  }
  
  // Controlla che l'importo non sia sospettosamente alto
  if (amount > 10000) { // Più di 10.000€
    return res.status(400).json({
      error: 'Importo carrello troppo elevato',
      code: 'CART_AMOUNT_TOO_HIGH'
    });
  }
  
  next();
};

// Funzione per loggare eventi di sicurezza
const logSecurityEvent = async (eventData) => {
  try {
    const { error } = await supabase
      .from('coupon_security_log')
      .insert({
        ...eventData,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Errore nel logging evento sicurezza:', error);
    }
  } catch (err) {
    console.error('Errore nel logging evento sicurezza:', err);
  }
};

// Middleware per loggare tentativi di validazione falliti
const logFailedValidation = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Se la risposta indica un errore di validazione, logga l'evento
    if (res.statusCode >= 400) {
      const { couponCode } = req.body;
      const userId = req.user?.id;
      
      logSecurityEvent({
        ip_address: req.ip,
        user_id: userId,
        coupon_code: couponCode,
        action_type: 'validation_failed',
        details: {
          status_code: res.statusCode,
          user_agent: req.headers['user-agent']
        }
      }).catch(console.error);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Middleware per verificare la sessione utente
const verifyUserSession = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Per ora permettiamo richieste senza autenticazione ma le tracciamo
    req.user = null;
    return next();
  }
  
  try {
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        error: 'Token di autenticazione non valido',
        code: 'INVALID_AUTH_TOKEN'
      });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error('Errore nella verifica sessione:', err);
    req.user = null;
    next();
  }
};

// Middleware combinato per la sicurezza dei coupon
const couponSecurityMiddleware = [
  verifyUserSession,
  validateCouponInput,
  preventCouponBruteForce,
  logFailedValidation
];

// Middleware per l'applicazione sicura dei coupon
const secureCouponApplication = [
  verifyUserSession,
  validateCouponInput,
  validateCartAmount,
  preventMultipleCouponUsage,
  preventCouponBruteForce,
  logFailedValidation
];

module.exports = {
  couponValidationLimiter,
  couponApplicationLimiter,
  validateCouponInput,
  preventCouponBruteForce,
  preventMultipleCouponUsage,
  validateCartAmount,
  logSecurityEvent,
  logFailedValidation,
  verifyUserSession,
  couponSecurityMiddleware,
  secureCouponApplication
};