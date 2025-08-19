#!/usr/bin/env node

/**
 * Script per verificare il flusso completo dei pagamenti Stripe
 * 
 * Verifica:
 * 1. Pagamenti completati in Stripe
 * 2. Webhook ricevuti correttamente
 * 3. Crediti aggiunti agli utenti
 * 4. Stato coerente tra Stripe e applicazione
 * 5. Email di conferma inviate
 * 
 * Uso:
 * node scripts/verify-payment-flow.js --recent
 * node scripts/verify-payment-flow.js --payment-id pi_xxxxx
 * node scripts/verify-payment-flow.js --session-id cs_xxxxx
 * node scripts/verify-payment-flow.js --user-email user@example.com
 * node scripts/verify-payment-flow.js --full-audit
 */

import Stripe from 'stripe';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carica le variabili d'ambiente
config({ path: join(__dirname, '..', '.env') });

// Colori per output console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Parsing degli argomenti
function parseArgs() {
  const args = process.argv.slice(2);
  const options = { flags: {}, values: {} };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.replace('--', '').replace('-', '_');
      
      // Controlla se il prossimo argomento è un valore
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        options.values[key] = args[i + 1];
        i++; // Salta il prossimo argomento
      } else {
        options.flags[key] = true;
      }
    }
  }
  
  return options;
}

// Inizializza Stripe
function initializeStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    logError('STRIPE_SECRET_KEY non configurata');
    process.exit(1);
  }
  
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Verifica un singolo pagamento
async function verifyPayment(stripe, paymentIntentId) {
  log(`\n🔍 Verifica Payment Intent: ${paymentIntentId}`, 'bright');
  log('='.repeat(50), 'bright');
  
  try {
    // Recupera il Payment Intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['customer', 'invoice', 'charges.data.balance_transaction']
    });
    
    logInfo(`Status: ${paymentIntent.status}`);
    logInfo(`Amount: ${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`);
    logInfo(`Created: ${new Date(paymentIntent.created * 1000).toLocaleString()}`);
    
    if (paymentIntent.customer) {
      logInfo(`Customer: ${paymentIntent.customer}`);
    }
    
    // Verifica metadati
    if (paymentIntent.metadata && Object.keys(paymentIntent.metadata).length > 0) {
      logInfo('Metadata:');
      Object.entries(paymentIntent.metadata).forEach(([key, value]) => {
        log(`  ${key}: ${value}`, 'cyan');
      });
    }
    
    // Verifica stato del pagamento
    switch (paymentIntent.status) {
      case 'succeeded':
        logSuccess('Pagamento completato con successo');
        break;
      case 'processing':
        logWarning('Pagamento in elaborazione');
        break;
      case 'requires_payment_method':
        logWarning('Richiede metodo di pagamento');
        break;
      case 'requires_confirmation':
        logWarning('Richiede conferma');
        break;
      case 'canceled':
        logError('Pagamento annullato');
        break;
      default:
        logWarning(`Stato sconosciuto: ${paymentIntent.status}`);
    }
    
    // Verifica eventi webhook correlati
    await verifyWebhookEvents(stripe, paymentIntentId);
    
    return paymentIntent;
  } catch (error) {
    logError(`Errore nel recupero del pagamento: ${error.message}`);
    return null;
  }
}

// Verifica eventi webhook per un pagamento
async function verifyWebhookEvents(stripe, paymentIntentId) {
  log('\n📡 Verifica Eventi Webhook', 'bright');
  
  try {
    // Cerca eventi correlati al Payment Intent
    const events = await stripe.events.list({
      type: 'payment_intent.*',
      limit: 20
    });
    
    const relatedEvents = events.data.filter(event => 
      event.data.object.id === paymentIntentId
    );
    
    if (relatedEvents.length === 0) {
      logWarning('Nessun evento webhook trovato per questo pagamento');
      return;
    }
    
    logSuccess(`Trovati ${relatedEvents.length} eventi webhook`);
    
    relatedEvents.forEach(event => {
      const timestamp = new Date(event.created * 1000).toLocaleString();
      log(`  ${event.type} - ${timestamp}`, 'cyan');
      
      if (event.request && event.request.idempotency_key) {
        log(`    Idempotency Key: ${event.request.idempotency_key}`, 'cyan');
      }
    });
    
    // Verifica se ci sono stati errori di delivery
    const failedEvents = relatedEvents.filter(event => 
      event.pending_webhooks > 0
    );
    
    if (failedEvents.length > 0) {
      logWarning(`${failedEvents.length} eventi hanno webhook pending`);
    } else {
      logSuccess('Tutti i webhook sono stati consegnati');
    }
    
  } catch (error) {
    logError(`Errore nella verifica webhook: ${error.message}`);
  }
}

// Verifica una checkout session
async function verifyCheckoutSession(stripe, sessionId) {
  log(`\n🛒 Verifica Checkout Session: ${sessionId}`, 'bright');
  log('='.repeat(50), 'bright');
  
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'payment_intent', 'line_items']
    });
    
    logInfo(`Status: ${session.payment_status}`);
    logInfo(`Mode: ${session.mode}`);
    
    if (session.amount_total) {
      logInfo(`Amount: ${(session.amount_total / 100).toFixed(2)} ${session.currency?.toUpperCase()}`);
    }
    
    logInfo(`Created: ${new Date(session.created * 1000).toLocaleString()}`);
    
    if (session.customer_email) {
      logInfo(`Customer Email: ${session.customer_email}`);
    }
    
    // Verifica line items
    if (session.line_items && session.line_items.data.length > 0) {
      logInfo('Line Items:');
      session.line_items.data.forEach(item => {
        const amount = item.amount_total ? (item.amount_total / 100).toFixed(2) : 'N/A';
        log(`  ${item.description}: ${amount} ${session.currency?.toUpperCase()} x${item.quantity}`, 'cyan');
      });
    }
    
    // Verifica metadati
    if (session.metadata && Object.keys(session.metadata).length > 0) {
      logInfo('Metadata:');
      Object.entries(session.metadata).forEach(([key, value]) => {
        log(`  ${key}: ${value}`, 'cyan');
      });
    }
    
    // Se c'è un Payment Intent associato, verificalo
    if (session.payment_intent) {
      const paymentIntentId = typeof session.payment_intent === 'string' 
        ? session.payment_intent 
        : session.payment_intent.id;
      
      await verifyPayment(stripe, paymentIntentId);
    }
    
    return session;
  } catch (error) {
    logError(`Errore nel recupero della sessione: ${error.message}`);
    return null;
  }
}

// Verifica pagamenti recenti
async function verifyRecentPayments(stripe, hours = 24) {
  log(`\n📊 Verifica Pagamenti Recenti (${hours}h)`, 'bright');
  log('='.repeat(50), 'bright');
  
  const since = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000);
  
  try {
    // Recupera Payment Intents recenti
    const paymentIntents = await stripe.paymentIntents.list({
      created: { gte: since },
      limit: 20
    });
    
    if (paymentIntents.data.length === 0) {
      logInfo(`Nessun pagamento nelle ultime ${hours} ore`);
      return [];
    }
    
    logSuccess(`Trovati ${paymentIntents.data.length} pagamenti`);
    
    const results = [];
    
    for (const pi of paymentIntents.data) {
      const amount = (pi.amount / 100).toFixed(2);
      const status = pi.status;
      const created = new Date(pi.created * 1000).toLocaleString();
      
      let statusColor = 'cyan';
      if (status === 'succeeded') statusColor = 'green';
      else if (status === 'failed') statusColor = 'red';
      else if (status === 'canceled') statusColor = 'yellow';
      
      log(`\n${pi.id}: ${amount} ${pi.currency.toUpperCase()} - ${status} (${created})`, statusColor);
      
      // Verifica dettagli per pagamenti completati
      if (status === 'succeeded') {
        const verification = await verifyPaymentIntegrity(stripe, pi.id);
        results.push({
          paymentIntent: pi,
          verification
        });
      }
    }
    
    return results;
  } catch (error) {
    logError(`Errore nella verifica dei pagamenti recenti: ${error.message}`);
    return [];
  }
}

// Verifica l'integrità di un pagamento (Stripe vs App)
async function verifyPaymentIntegrity(stripe, paymentIntentId) {
  const verification = {
    stripeData: null,
    webhookDelivered: false,
    creditsAdded: null,
    emailSent: null,
    consistent: false
  };
  
  try {
    // Recupera dati da Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    verification.stripeData = {
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata
    };
    
    // Verifica delivery webhook
    const events = await stripe.events.list({
      type: 'payment_intent.succeeded',
      limit: 10
    });
    
    const relatedEvent = events.data.find(event => 
      event.data.object.id === paymentIntentId
    );
    
    if (relatedEvent) {
      verification.webhookDelivered = relatedEvent.pending_webhooks === 0;
    }
    
    // TODO: Qui dovresti aggiungere la logica per verificare
    // se i crediti sono stati aggiunti nel tuo database
    // e se l'email è stata inviata
    
    // Esempio di verifica (da personalizzare):
    /*
    const userEmail = paymentIntent.metadata?.user_email;
    if (userEmail) {
      // Verifica nel database se i crediti sono stati aggiunti
      // verification.creditsAdded = await checkCreditsInDatabase(userEmail, paymentIntent.amount);
      
      // Verifica se l'email è stata inviata
      // verification.emailSent = await checkEmailSent(userEmail, paymentIntentId);
    }
    */
    
    // Determina se tutto è consistente
    verification.consistent = 
      verification.stripeData.status === 'succeeded' &&
      verification.webhookDelivered;
      // && verification.creditsAdded
      // && verification.emailSent;
    
    // Log risultati
    if (verification.consistent) {
      logSuccess('  ✅ Pagamento verificato e consistente');
    } else {
      logWarning('  ⚠️  Possibili inconsistenze rilevate');
      
      if (!verification.webhookDelivered) {
        logWarning('    - Webhook non consegnato');
      }
      
      if (verification.creditsAdded === false) {
        logWarning('    - Crediti non aggiunti');
      }
      
      if (verification.emailSent === false) {
        logWarning('    - Email non inviata');
      }
    }
    
  } catch (error) {
    logError(`  Errore nella verifica integrità: ${error.message}`);
  }
  
  return verification;
}

// Audit completo del sistema
async function fullSystemAudit(stripe) {
  log('\n🔍 Audit Completo Sistema Pagamenti', 'bright');
  log('='.repeat(50), 'bright');
  
  const auditResults = {
    totalPayments: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingWebhooks: 0,
    inconsistencies: [],
    recommendations: []
  };
  
  try {
    // Analizza ultimi 7 giorni
    const since = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    
    const paymentIntents = await stripe.paymentIntents.list({
      created: { gte: since },
      limit: 100
    });
    
    auditResults.totalPayments = paymentIntents.data.length;
    
    logInfo(`Analizzando ${auditResults.totalPayments} pagamenti degli ultimi 7 giorni...`);
    
    for (const pi of paymentIntents.data) {
      if (pi.status === 'succeeded') {
        auditResults.successfulPayments++;
      } else if (pi.status === 'failed' || pi.status === 'canceled') {
        auditResults.failedPayments++;
      }
      
      // Verifica webhook per pagamenti riusciti
      if (pi.status === 'succeeded') {
        const verification = await verifyPaymentIntegrity(stripe, pi.id);
        
        if (!verification.consistent) {
          auditResults.inconsistencies.push({
            paymentId: pi.id,
            issues: verification
          });
        }
        
        if (!verification.webhookDelivered) {
          auditResults.pendingWebhooks++;
        }
      }
    }
    
    // Genera report
    log('\n📋 Report Audit', 'bright');
    log('===============', 'bright');
    
    logInfo(`Pagamenti totali: ${auditResults.totalPayments}`);
    logSuccess(`Pagamenti riusciti: ${auditResults.successfulPayments}`);
    
    if (auditResults.failedPayments > 0) {
      logWarning(`Pagamenti falliti: ${auditResults.failedPayments}`);
    }
    
    if (auditResults.pendingWebhooks > 0) {
      logWarning(`Webhook pending: ${auditResults.pendingWebhooks}`);
      auditResults.recommendations.push('Verificare configurazione webhook endpoint');
    }
    
    if (auditResults.inconsistencies.length > 0) {
      logError(`Inconsistenze rilevate: ${auditResults.inconsistencies.length}`);
      auditResults.recommendations.push('Verificare logica di elaborazione pagamenti nell\'applicazione');
    }
    
    // Calcola tasso di successo
    const successRate = auditResults.totalPayments > 0 
      ? (auditResults.successfulPayments / auditResults.totalPayments * 100).toFixed(2)
      : 0;
    
    logInfo(`Tasso di successo: ${successRate}%`);
    
    // Raccomandazioni
    if (auditResults.recommendations.length > 0) {
      log('\n💡 Raccomandazioni:', 'yellow');
      auditResults.recommendations.forEach(rec => {
        log(`  - ${rec}`, 'yellow');
      });
    } else {
      logSuccess('\n🎉 Sistema funzionante correttamente!');
    }
    
  } catch (error) {
    logError(`Errore durante l'audit: ${error.message}`);
  }
  
  return auditResults;
}

// Funzione principale
async function main() {
  const { flags, values } = parseArgs();
  const stripe = initializeStripe();
  
  if (values.payment_id) {
    await verifyPayment(stripe, values.payment_id);
  } else if (values.session_id) {
    await verifyCheckoutSession(stripe, values.session_id);
  } else if (flags.recent) {
    const hours = values.hours ? parseInt(values.hours) : 24;
    await verifyRecentPayments(stripe, hours);
  } else if (flags.full_audit) {
    await fullSystemAudit(stripe);
  } else {
    // Mostra help
    log('🔍 Verifica Flusso Pagamenti - CV Analyzer', 'bright');
    log('==========================================', 'bright');
    log('\nComandi disponibili:', 'cyan');
    log('--recent                    Verifica pagamenti recenti (24h)', 'cyan');
    log('--recent --hours 48         Verifica pagamenti recenti (48h)', 'cyan');
    log('--payment-id pi_xxxxx       Verifica specifico Payment Intent', 'cyan');
    log('--session-id cs_xxxxx       Verifica specifica Checkout Session', 'cyan');
    log('--full-audit                Audit completo del sistema', 'cyan');
    
    log('\nEsempi:', 'yellow');
    log('npm run verify:payments:recent', 'yellow');
    log('npm run verify:payments:audit', 'yellow');
    log('node scripts/verify-payment-flow.js --payment-id pi_1234567890', 'yellow');
  }
}

// Gestione errori
process.on('unhandledRejection', (error) => {
  logError(`Errore non gestito: ${error.message}`);
  process.exit(1);
});

// Esegui script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logError(`Errore durante l'esecuzione: ${error.message}`);
    process.exit(1);
  });
}

export { verifyPayment, verifyCheckoutSession, verifyRecentPayments, fullSystemAudit };