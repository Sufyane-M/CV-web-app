#!/usr/bin/env node

/**
 * Script per configurare automaticamente le variabili d'ambiente su Vercel
 * 
 * Questo script aiuta a:
 * 1. Leggere le variabili dal file .env.production
 * 2. Configurarle automaticamente su Vercel per l'ambiente di produzione
 * 3. Verificare che siano state impostate correttamente
 * 
 * Prerequisiti:
 * - Vercel CLI installata: npm i -g vercel
 * - Autenticazione con Vercel: vercel login
 * - Progetto collegato: vercel link
 * 
 * Uso:
 * node scripts/setup-vercel-env.js
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Verifica se Vercel CLI è installata
function checkVercelCLI() {
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    logSuccess('Vercel CLI trovata');
    return true;
  } catch (error) {
    logError('Vercel CLI non trovata. Installa con: npm i -g vercel');
    return false;
  }
}

// Verifica se l'utente è autenticato
function checkVercelAuth() {
  try {
    const result = execSync('vercel whoami', { stdio: 'pipe', encoding: 'utf8' });
    logSuccess(`Autenticato come: ${result.trim()}`);
    return true;
  } catch (error) {
    logError('Non autenticato con Vercel. Esegui: vercel login');
    return false;
  }
}

// Verifica se il progetto è collegato
function checkProjectLink() {
  try {
    const result = execSync('vercel ls', { stdio: 'pipe', encoding: 'utf8' });
    logSuccess('Progetto collegato a Vercel');
    return true;
  } catch (error) {
    logError('Progetto non collegato. Esegui: vercel link');
    return false;
  }
}

// Legge le variabili dal file .env.production
function readProductionEnv() {
  const envPath = join(__dirname, '..', '.env.production');
  
  if (!existsSync(envPath)) {
    logError('File .env.production non trovato');
    return null;
  }
  
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = {};
    
    // Parse del file .env
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Ignora commenti e righe vuote
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Rimuovi virgolette se presenti
          envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
    
    logSuccess(`Lette ${Object.keys(envVars).length} variabili da .env.production`);
    return envVars;
  } catch (error) {
    logError(`Errore nella lettura di .env.production: ${error.message}`);
    return null;
  }
}

// Filtra le variabili che devono essere impostate su Vercel
function filterVercelVars(envVars) {
  // Variabili che devono essere impostate su Vercel
  const vercelVars = [
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_ID_STARTER',
    'STRIPE_PRICE_ID_VALUE',
    'NODE_ENV',
    'VITE_APP_URL',
    'DATABASE_URL',
    'JWT_SECRET',
    'API_BASE_URL'
  ];
  
  const filtered = {};
  const missing = [];
  
  for (const varName of vercelVars) {
    if (envVars[varName]) {
      // Controlla se è un placeholder
      if (envVars[varName].includes('SOSTITUISCI') || envVars[varName].includes('your_')) {
        logWarning(`${varName} contiene un valore placeholder: ${envVars[varName]}`);
        missing.push(varName);
      } else {
        filtered[varName] = envVars[varName];
      }
    }
  }
  
  if (missing.length > 0) {
    logWarning('Variabili con valori placeholder (da aggiornare manualmente):');
    missing.forEach(varName => log(`  - ${varName}`, 'yellow'));
  }
  
  return filtered;
}

// Imposta una variabile d'ambiente su Vercel
function setVercelEnvVar(key, value, environment = 'production') {
  try {
    // Escape del valore per la shell
    const escapedValue = value.replace(/"/g, '\\"');
    const command = `vercel env add ${key} ${environment} --force`;
    
    logInfo(`Impostando ${key}...`);
    
    // Esegui il comando e passa il valore tramite stdin
    execSync(command, { 
      input: escapedValue, 
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8'
    });
    
    logSuccess(`${key} impostata correttamente`);
    return true;
  } catch (error) {
    logError(`Errore nell'impostazione di ${key}: ${error.message}`);
    return false;
  }
}

// Lista le variabili d'ambiente attuali su Vercel
function listVercelEnvVars() {
  try {
    logInfo('Variabili d\'ambiente attuali su Vercel:');
    const result = execSync('vercel env ls', { stdio: 'pipe', encoding: 'utf8' });
    log(result, 'cyan');
    return true;
  } catch (error) {
    logError(`Errore nel recupero delle variabili: ${error.message}`);
    return false;
  }
}

// Verifica che le variabili siano state impostate
function verifyEnvVars(envVars) {
  logInfo('Verificando le variabili impostate...');
  
  try {
    const result = execSync('vercel env ls production', { stdio: 'pipe', encoding: 'utf8' });
    
    let allSet = true;
    for (const key of Object.keys(envVars)) {
      if (result.includes(key)) {
        logSuccess(`${key} ✓`);
      } else {
        logError(`${key} ✗`);
        allSet = false;
      }
    }
    
    return allSet;
  } catch (error) {
    logError(`Errore nella verifica: ${error.message}`);
    return false;
  }
}

// Funzione principale
async function main() {
  log('🚀 Setup Variabili d\'Ambiente Vercel per CV Analyzer', 'bright');
  log('====================================================', 'bright');
  
  // Verifiche preliminari
  logInfo('Verificando prerequisiti...');
  
  if (!checkVercelCLI()) return;
  if (!checkVercelAuth()) return;
  if (!checkProjectLink()) return;
  
  // Leggi variabili da .env.production
  logInfo('Leggendo configurazione da .env.production...');
  const envVars = readProductionEnv();
  if (!envVars) return;
  
  // Filtra variabili per Vercel
  const vercelVars = filterVercelVars(envVars);
  
  if (Object.keys(vercelVars).length === 0) {
    logWarning('Nessuna variabile valida trovata per Vercel');
    return;
  }
  
  // Mostra variabili attuali
  logInfo('\nVariabili d\'ambiente attuali:');
  listVercelEnvVars();
  
  // Conferma prima di procedere
  log('\n📋 Variabili da impostare:', 'bright');
  Object.keys(vercelVars).forEach(key => {
    const value = vercelVars[key];
    const displayValue = key.includes('SECRET') || key.includes('KEY') 
      ? `${value.substring(0, 10)}...` 
      : value;
    log(`  ${key}: ${displayValue}`, 'cyan');
  });
  
  logWarning('\nATTENZIONE: Questo sovrascriverà le variabili esistenti!');
  logWarning('Assicurati che i valori siano corretti prima di procedere.');
  
  // In un ambiente reale, potresti voler aggiungere una conferma interattiva
  // Per ora procediamo automaticamente
  
  // Imposta variabili
  log('\n🔧 Impostando variabili su Vercel...', 'bright');
  
  let successCount = 0;
  for (const [key, value] of Object.entries(vercelVars)) {
    if (setVercelEnvVar(key, value)) {
      successCount++;
    }
    // Piccola pausa per evitare rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Verifica risultati
  log('\n🔍 Verificando configurazione...', 'bright');
  const allSet = verifyEnvVars(vercelVars);
  
  // Riepilogo
  log('\n📊 Riepilogo:', 'bright');
  log('=============', 'bright');
  logSuccess(`Variabili impostate: ${successCount}/${Object.keys(vercelVars).length}`);
  
  if (allSet) {
    logSuccess('✅ Tutte le variabili sono state configurate correttamente!');
    
    log('\n📝 Prossimi Passi:', 'bright');
    log('==================', 'bright');
    log('1. Verifica che tutti i valori siano corretti nel dashboard Vercel', 'yellow');
    log('2. Fai un nuovo deploy dell\'applicazione', 'yellow');
    log('3. Testa l\'integrazione Stripe in produzione', 'yellow');
    
    logInfo('\nComandi utili:');
    log('vercel --prod                 # Deploy in produzione', 'cyan');
    log('vercel logs --follow          # Monitora i logs', 'cyan');
    log('vercel env ls production      # Lista variabili produzione', 'cyan');
  } else {
    logError('❌ Alcune variabili non sono state impostate correttamente.');
    logWarning('Controlla i messaggi di errore sopra e riprova.');
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

export { readProductionEnv, filterVercelVars, setVercelEnvVar };