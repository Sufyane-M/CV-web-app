#!/usr/bin/env node

/**
 * Script per configurare automaticamente il webhook di Stripe per la produzione
 * 
 * Questo script aiuta a:
 * 1. Verificare la configurazione delle chiavi Stripe
 * 2. Creare il webhook endpoint per la produzione
 * 3. Configurare gli eventi necessari
 * 4. Ottenere il webhook secret
 * 
 * Uso:
 * node scripts/setup-stripe-webhook.js --domain your-domain.vercel.app
 */

import Stripe from 'stripe';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

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
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    options[key] = value;
  }
  
  return options;
}

// Verifica la configurazione Stripe
function verifyStripeConfig() {
  logInfo('Verificando configurazione Stripe...');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    logError('STRIPE_SECRET_KEY non trovata nelle variabili d\'ambiente');
    return false;
  }
  
  const isTestKey = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
  const isLiveKey = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
  
  if (isTestKey) {
    logWarning('Stai usando una chiave di TEST. Per la produzione usa una chiave LIVE.');
    return 'test';
  } else if (isLiveKey) {
    logSuccess('Chiave LIVE di Stripe configurata correttamente.');
    return 'live';
  } else {
    logError('Formato chiave Stripe non valido.');
    return false;
  }
}

// Crea il webhook endpoint
async function createWebhookEndpoint(stripe, domain, mode) {
  const webhookUrl = `https://${domain}/api/stripe/webhook`;
  
  logInfo(`Creando webhook endpoint: ${webhookUrl}`);
  
  try {
    // Eventi da monitorare
    const events = [
      'checkout.session.completed',
      'payment_intent.succeeded',
      'payment_intent.payment_failed'
    ];
    
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: events,
      description: `CV Analyzer Webhook - ${mode.toUpperCase()} Mode`
    });
    
    logSuccess(`Webhook creato con successo!`);
    logInfo(`Webhook ID: ${webhook.id}`);
    logInfo(`Webhook Secret: ${webhook.secret}`);
    
    return webhook;
  } catch (error) {
    logError(`Errore nella creazione del webhook: ${error.message}`);
    return null;
  }
}

// Lista i webhook esistenti
async function listExistingWebhooks(stripe) {
  try {
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
    
    if (webhooks.data.length > 0) {
      logInfo('Webhook esistenti:');
      webhooks.data.forEach((webhook, index) => {
        log(`  ${index + 1}. ${webhook.url} (${webhook.status})`, 'cyan');
        log(`     ID: ${webhook.id}`, 'cyan');
        log(`     Eventi: ${webhook.enabled_events.join(', ')}`, 'cyan');
      });
    } else {
      logInfo('Nessun webhook esistente trovato.');
    }
    
    return webhooks.data;
  } catch (error) {
    logError(`Errore nel recupero dei webhook: ${error.message}`);
    return [];
  }
}

// Aggiorna il file .env con il webhook secret
function updateEnvFile(webhookSecret, mode) {
  const envFile = mode === 'live' ? '.env.production' : '.env';
  const envPath = join(__dirname, '..', envFile);
  
  try {
    let envContent = readFileSync(envPath, 'utf8');
    
    // Aggiorna o aggiungi STRIPE_WEBHOOK_SECRET
    const webhookSecretRegex = /STRIPE_WEBHOOK_SECRET=.*/;
    const newWebhookLine = `STRIPE_WEBHOOK_SECRET=${webhookSecret}`;
    
    if (webhookSecretRegex.test(envContent)) {
      envContent = envContent.replace(webhookSecretRegex, newWebhookLine);
      logSuccess(`Webhook secret aggiornato in ${envFile}`);
    } else {
      envContent += `\n# Webhook Secret\n${newWebhookLine}\n`;
      logSuccess(`Webhook secret aggiunto a ${envFile}`);
    }
    
    writeFileSync(envPath, envContent);
  } catch (error) {
    logError(`Errore nell'aggiornamento del file ${envFile}: ${error.message}`);
  }
}

// Funzione principale
async function main() {
  log('🚀 Setup Webhook Stripe per CV Analyzer', 'bright');
  log('==========================================', 'bright');
  
  const options = parseArgs();
  
  if (!options.domain) {
    logError('Dominio richiesto. Uso: node setup-stripe-webhook.js --domain your-domain.vercel.app');
    process.exit(1);
  }
  
  // Verifica configurazione
  const mode = verifyStripeConfig();
  if (!mode) {
    process.exit(1);
  }
  
  // Inizializza Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  // Lista webhook esistenti
  logInfo('Controllando webhook esistenti...');
  await listExistingWebhooks(stripe);
  
  // Chiedi conferma per creare nuovo webhook
  logWarning(`Stai per creare un nuovo webhook per: https://${options.domain}/api/stripe/webhook`);
  logWarning('Assicurati che questo sia il dominio corretto della tua applicazione in produzione.');
  
  // In un ambiente reale, potresti voler aggiungere una conferma interattiva
  // Per ora procediamo automaticamente
  
  // Crea webhook
  const webhook = await createWebhookEndpoint(stripe, options.domain, mode);
  
  if (webhook) {
    // Aggiorna file .env
    updateEnvFile(webhook.secret, mode);
    
    log('\n📋 Riepilogo Configurazione:', 'bright');
    log('============================', 'bright');
    logSuccess(`Webhook URL: https://${options.domain}/api/stripe/webhook`);
    logSuccess(`Webhook ID: ${webhook.id}`);
    logSuccess(`Webhook Secret: ${webhook.secret}`);
    logSuccess(`Modalità: ${mode.toUpperCase()}`);
    
    log('\n📝 Prossimi Passi:', 'bright');
    log('==================', 'bright');
    log('1. Copia il Webhook Secret e aggiungilo alle variabili d\'ambiente di Vercel', 'yellow');
    log('2. Rideploya l\'applicazione su Vercel', 'yellow');
    log('3. Testa il webhook con un pagamento di prova', 'yellow');
    
    if (mode === 'test') {
      logWarning('\nATTENZIONE: Stai usando la modalità TEST.');
      logWarning('Per la produzione, sostituisci le chiavi con quelle LIVE e riesegui questo script.');
    }
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

export { createWebhookEndpoint, verifyStripeConfig, updateEnvFile };