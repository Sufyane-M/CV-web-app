#!/usr/bin/env node

/**
 * Script per testare l'integrazione Stripe in modalità LIVE
 * 
 * ATTENZIONE: Questo script testa con denaro reale!
 * 
 * Funzionalità:
 * 1. Verifica la configurazione Stripe LIVE
 * 2. Testa la connessione API
 * 3. Verifica i prodotti e prezzi
 * 4. Testa la creazione di checkout session
 * 5. Verifica il webhook endpoint
 * 6. Monitora i pagamenti
 * 
 * Uso:
 * node scripts/test-stripe-integration.js --check-config
 * node scripts/test-stripe-integration.js --test-api
 * node scripts/test-stripe-integration.js --test-webhook
 * node scripts/test-stripe-integration.js --monitor-payments
 * node scripts/test-stripe-integration.js --full-test
 */

import Stripe from 'stripe';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import fetch from 'node-fetch';

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

// Parsing degli argomenti della command line
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const key = arg.replace('--', '').replace('-', '_');
      options[key] = true;
    }
  });
  
  return options;
}

// Verifica la configurazione Stripe
function checkStripeConfig() {
  log('🔍 Verifica Configurazione Stripe', 'bright');
  log('==================================', 'bright');
  
  const requiredVars = [
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];
  
  const optionalVars = [
    'STRIPE_PRICE_ID_STARTER',
    'STRIPE_PRICE_ID_VALUE'
  ];
  
  let allRequired = true;
  
  // Verifica variabili richieste
  logInfo('Variabili richieste:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      const isLive = value.startsWith('pk_live_') || value.startsWith('sk_live_') || value.startsWith('whsec_');
      const displayValue = `${value.substring(0, 15)}...`;
      
      if (isLive) {
        logSuccess(`  ${varName}: ${displayValue} (LIVE)`);
      } else {
        logWarning(`  ${varName}: ${displayValue} (TEST - Non per produzione!)`);
      }
    } else {
      logError(`  ${varName}: NON IMPOSTATA`);
      allRequired = false;
    }
  });
  
  // Verifica variabili opzionali
  logInfo('\nVariabili opzionali (Price ID):');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value && !value.includes('SOSTITUISCI')) {
      logSuccess(`  ${varName}: ${value}`);
    } else {
      logWarning(`  ${varName}: Non configurata (userà prezzi dinamici)`);
    }
  });
  
  // Verifica modalità
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (secretKey) {
    if (secretKey.startsWith('sk_live_')) {
      logSuccess('\n🔴 MODALITÀ: LIVE/PRODUCTION');
      logWarning('   ATTENZIONE: I pagamenti saranno reali!');
    } else if (secretKey.startsWith('sk_test_')) {
      logWarning('\n🟡 MODALITÀ: TEST/DEVELOPMENT');
      logInfo('   I pagamenti sono simulati');
    }
  }
  
  return allRequired;
}

// Testa la connessione API Stripe
async function testStripeAPI() {
  log('\n🔌 Test Connessione API Stripe', 'bright');
  log('===============================', 'bright');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    logError('STRIPE_SECRET_KEY non configurata');
    return false;
  }
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  try {
    // Test 1: Recupera informazioni account
    logInfo('Test 1: Informazioni account...');
    const account = await stripe.accounts.retrieve();
    logSuccess(`Account ID: ${account.id}`);
    logSuccess(`Paese: ${account.country}`);
    logSuccess(`Valuta predefinita: ${account.default_currency}`);
    
    // Test 2: Lista prodotti
    logInfo('\nTest 2: Lista prodotti...');
    const products = await stripe.products.list({ limit: 10 });
    logSuccess(`Trovati ${products.data.length} prodotti`);
    
    products.data.forEach(product => {
      log(`  - ${product.name} (${product.id})`, 'cyan');
    });
    
    // Test 3: Lista prezzi
    logInfo('\nTest 3: Lista prezzi...');
    const prices = await stripe.prices.list({ limit: 10 });
    logSuccess(`Trovati ${prices.data.length} prezzi`);
    
    prices.data.forEach(price => {
      const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
      log(`  - ${price.id}: ${amount} ${price.currency?.toUpperCase()}`, 'cyan');
    });
    
    // Test 4: Verifica Price ID configurati
    if (process.env.STRIPE_PRICE_ID_STARTER || process.env.STRIPE_PRICE_ID_VALUE) {
      logInfo('\nTest 4: Verifica Price ID configurati...');
      
      const priceIds = [
        { name: 'STARTER', id: process.env.STRIPE_PRICE_ID_STARTER },
        { name: 'VALUE', id: process.env.STRIPE_PRICE_ID_VALUE }
      ];
      
      for (const priceConfig of priceIds) {
        if (priceConfig.id && !priceConfig.id.includes('SOSTITUISCI')) {
          try {
            const price = await stripe.prices.retrieve(priceConfig.id);
            const amount = (price.unit_amount / 100).toFixed(2);
            logSuccess(`  ${priceConfig.name}: ${amount} ${price.currency.toUpperCase()} (${price.id})`);
          } catch (error) {
            logError(`  ${priceConfig.name}: Price ID non valido (${priceConfig.id})`);
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    logError(`Errore API Stripe: ${error.message}`);
    return false;
  }
}

// Testa il webhook endpoint
async function testWebhookEndpoint() {
  log('\n🔗 Test Webhook Endpoint', 'bright');
  log('========================', 'bright');
  
  const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
  const webhookUrl = `${appUrl}/api/stripe/webhook`;
  
  logInfo(`Testing endpoint: ${webhookUrl}`);
  
  try {
    // Test semplice di connettività
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Stripe-Test-Script'
      },
      body: JSON.stringify({ test: true })
    });
    
    logInfo(`Status: ${response.status}`);
    logInfo(`Headers: ${JSON.stringify(Object.fromEntries(response.headers))}`);
    
    if (response.status === 200 || response.status === 400) {
      logSuccess('Endpoint raggiungibile');
      
      // Verifica se risponde come endpoint Stripe
      const text = await response.text();
      if (text.includes('stripe') || text.includes('webhook')) {
        logSuccess('Endpoint sembra essere configurato per Stripe');
      } else {
        logWarning('Endpoint raggiungibile ma potrebbe non essere configurato per Stripe');
      }
    } else {
      logWarning(`Endpoint risponde con status ${response.status}`);
    }
    
    return true;
  } catch (error) {
    logError(`Errore nel test webhook: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      logWarning('Server non raggiungibile. Assicurati che l\'applicazione sia in esecuzione.');
    }
    
    return false;
  }
}

// Crea una checkout session di test
async function createTestCheckoutSession() {
  log('\n🛒 Test Creazione Checkout Session', 'bright');
  log('==================================', 'bright');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    logError('STRIPE_SECRET_KEY non configurata');
    return false;
  }
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
  
  try {
    // Usa Price ID se disponibile, altrimenti crea prezzo dinamico
    let lineItems;
    
    if (process.env.STRIPE_PRICE_ID_STARTER && !process.env.STRIPE_PRICE_ID_STARTER.includes('SOSTITUISCI')) {
      logInfo('Usando Price ID configurato...');
      lineItems = [{
        price: process.env.STRIPE_PRICE_ID_STARTER,
        quantity: 1
      }];
    } else {
      logInfo('Usando prezzo dinamico di test...');
      lineItems = [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Test CV Analyzer - Pacchetto Base',
            description: 'Test di integrazione Stripe'
          },
          unit_amount: 100 // 1.00 EUR per test
        },
        quantity: 1
      }];
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paypal'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel`,
      metadata: {
        test: 'true',
        script: 'test-stripe-integration'
      }
    });
    
    logSuccess('Checkout session creata con successo!');
    logInfo(`Session ID: ${session.id}`);
    logInfo(`URL: ${session.url}`);
    
    if (process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
      logWarning('\n⚠️  ATTENZIONE: Questa è una sessione LIVE!');
      logWarning('   Non completare il pagamento a meno che non sia intenzionale.');
      logWarning('   Usa una carta di test o annulla la sessione.');
    } else {
      logInfo('\n✅ Questa è una sessione di test, sicura da completare.');
    }
    
    return session;
  } catch (error) {
    logError(`Errore nella creazione della checkout session: ${error.message}`);
    return false;
  }
}

// Monitora i pagamenti recenti
async function monitorRecentPayments() {
  log('\n📊 Monitoraggio Pagamenti Recenti', 'bright');
  log('==================================', 'bright');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    logError('STRIPE_SECRET_KEY non configurata');
    return false;
  }
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  try {
    // Ultimi payment intents
    logInfo('Ultimi Payment Intents (24h):');
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 10,
      created: {
        gte: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
      }
    });
    
    if (paymentIntents.data.length === 0) {
      logInfo('  Nessun pagamento nelle ultime 24 ore');
    } else {
      paymentIntents.data.forEach(pi => {
        const amount = (pi.amount / 100).toFixed(2);
        const status = pi.status;
        const created = new Date(pi.created * 1000).toLocaleString();
        
        let statusColor = 'cyan';
        if (status === 'succeeded') statusColor = 'green';
        else if (status === 'failed') statusColor = 'red';
        else if (status === 'canceled') statusColor = 'yellow';
        
        log(`  ${pi.id}: ${amount} ${pi.currency.toUpperCase()} - ${status} (${created})`, statusColor);
      });
    }
    
    // Ultime checkout sessions
    logInfo('\nUltime Checkout Sessions (24h):');
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
      created: {
        gte: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
      }
    });
    
    if (sessions.data.length === 0) {
      logInfo('  Nessuna sessione nelle ultime 24 ore');
    } else {
      sessions.data.forEach(session => {
        const amount = session.amount_total ? (session.amount_total / 100).toFixed(2) : 'N/A';
        const status = session.payment_status;
        const created = new Date(session.created * 1000).toLocaleString();
        
        let statusColor = 'cyan';
        if (status === 'paid') statusColor = 'green';
        else if (status === 'unpaid') statusColor = 'yellow';
        
        log(`  ${session.id}: ${amount} ${session.currency?.toUpperCase() || 'EUR'} - ${status} (${created})`, statusColor);
      });
    }
    
    return true;
  } catch (error) {
    logError(`Errore nel monitoraggio: ${error.message}`);
    return false;
  }
}

// Test completo
async function runFullTest() {
  log('🚀 Test Completo Integrazione Stripe', 'bright');
  log('====================================', 'bright');
  
  const results = {
    config: false,
    api: false,
    webhook: false,
    checkout: false,
    monitoring: false
  };
  
  // 1. Verifica configurazione
  results.config = checkStripeConfig();
  
  if (!results.config) {
    logError('\n❌ Test interrotto: configurazione non valida');
    return results;
  }
  
  // 2. Test API
  results.api = await testStripeAPI();
  
  // 3. Test webhook
  results.webhook = await testWebhookEndpoint();
  
  // 4. Test checkout session
  results.checkout = await createTestCheckoutSession();
  
  // 5. Monitoraggio
  results.monitoring = await monitorRecentPayments();
  
  // Riepilogo
  log('\n📋 Riepilogo Test', 'bright');
  log('=================', 'bright');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`${test.toUpperCase()}: ${status}`, color);
  });
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    logSuccess('\n🎉 Tutti i test sono passati!');
    logSuccess('L\'integrazione Stripe sembra funzionare correttamente.');
  } else {
    logWarning('\n⚠️  Alcuni test sono falliti.');
    logWarning('Controlla i messaggi di errore sopra e risolvi i problemi.');
  }
  
  return results;
}

// Funzione principale
async function main() {
  const options = parseArgs();
  
  if (options.check_config) {
    checkStripeConfig();
  } else if (options.test_api) {
    await testStripeAPI();
  } else if (options.test_webhook) {
    await testWebhookEndpoint();
  } else if (options.monitor_payments) {
    await monitorRecentPayments();
  } else if (options.full_test) {
    await runFullTest();
  } else {
    // Mostra help
    log('🧪 Test Integrazione Stripe - CV Analyzer', 'bright');
    log('=========================================', 'bright');
    log('\nComandi disponibili:', 'cyan');
    log('--check-config      Verifica configurazione Stripe', 'cyan');
    log('--test-api          Testa connessione API Stripe', 'cyan');
    log('--test-webhook      Testa endpoint webhook', 'cyan');
    log('--monitor-payments  Monitora pagamenti recenti', 'cyan');
    log('--full-test         Esegue tutti i test', 'cyan');
    
    log('\nEsempi:', 'yellow');
    log('npm run test:stripe:config', 'yellow');
    log('npm run test:stripe:full', 'yellow');
    log('node scripts/test-stripe-integration.js --full-test', 'yellow');
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

export { checkStripeConfig, testStripeAPI, testWebhookEndpoint, createTestCheckoutSession, monitorRecentPayments };