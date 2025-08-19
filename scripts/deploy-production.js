#!/usr/bin/env node

/**
 * Script di Deploy per Modalità Produzione
 * 
 * Questo script automatizza il passaggio dalla modalità test a quella di produzione
 * per l'integrazione Stripe, gestendo la configurazione delle variabili d'ambiente
 * e verificando che tutto sia configurato correttamente.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Colori per output console
const colors = {
  reset: '\x1b[0m',
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

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

/**
 * Verifica se un file esiste
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Legge il contenuto di un file
 */
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Scrive contenuto in un file
 */
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Crea backup di un file
 */
function createBackup(filePath) {
  const backupPath = `${filePath}.backup.${Date.now()}`;
  if (fileExists(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    logSuccess(`Backup creato: ${path.basename(backupPath)}`);
    return backupPath;
  }
  return null;
}

/**
 * Verifica la configurazione Stripe
 */
function validateStripeConfig(envContent) {
  const errors = [];
  const warnings = [];

  // Verifica chiavi Stripe
  const publishableKeyMatch = envContent.match(/VITE_STRIPE_PUBLISHABLE_KEY=(.+)/);
  const secretKeyMatch = envContent.match(/STRIPE_SECRET_KEY=(.+)/);
  const webhookSecretMatch = envContent.match(/STRIPE_WEBHOOK_SECRET=(.+)/);

  if (!publishableKeyMatch || publishableKeyMatch[1].includes('SOSTITUISCI')) {
    errors.push('VITE_STRIPE_PUBLISHABLE_KEY non configurata o contiene placeholder');
  } else if (!publishableKeyMatch[1].startsWith('pk_live_')) {
    warnings.push('VITE_STRIPE_PUBLISHABLE_KEY non è una chiave live (pk_live_)');
  }

  if (!secretKeyMatch || secretKeyMatch[1].includes('SOSTITUISCI')) {
    errors.push('STRIPE_SECRET_KEY non configurata o contiene placeholder');
  } else if (!secretKeyMatch[1].startsWith('sk_live_')) {
    warnings.push('STRIPE_SECRET_KEY non è una chiave live (sk_live_)');
  }

  if (!webhookSecretMatch || webhookSecretMatch[1].includes('SOSTITUISCI')) {
    warnings.push('STRIPE_WEBHOOK_SECRET non configurato');
  }

  // Verifica NODE_ENV
  if (!envContent.includes('NODE_ENV=production')) {
    errors.push('NODE_ENV non impostato su production');
  }

  return { errors, warnings };
}

/**
 * Funzione principale di deploy
 */
async function deployProduction() {
  log('🚀 Avvio Deploy in Modalità Produzione', 'magenta');
  log('==========================================\n', 'magenta');

  try {
    // Step 1: Verifica file di configurazione
    logStep('1', 'Verifica file di configurazione');
    
    const envPath = path.join(rootDir, '.env');
    const envProductionPath = path.join(rootDir, '.env.production');
    
    if (!fileExists(envProductionPath)) {
      logError('File .env.production non trovato!');
      log('Esegui prima la configurazione iniziale.', 'yellow');
      process.exit(1);
    }
    
    logSuccess('File .env.production trovato');

    // Step 2: Leggi e valida configurazione produzione
    logStep('2', 'Validazione configurazione produzione');
    
    const productionConfig = readFile(envProductionPath);
    const validation = validateStripeConfig(productionConfig);
    
    if (validation.errors.length > 0) {
      logError('Errori di configurazione trovati:');
      validation.errors.forEach(error => log(`  - ${error}`, 'red'));
      log('\nCorreggi gli errori nel file .env.production prima di continuare.', 'yellow');
      process.exit(1);
    }
    
    if (validation.warnings.length > 0) {
      logWarning('Avvisi di configurazione:');
      validation.warnings.forEach(warning => log(`  - ${warning}`, 'yellow'));
    }
    
    logSuccess('Configurazione produzione validata');

    // Step 3: Backup configurazione attuale
    logStep('3', 'Backup configurazione attuale');
    
    const backupPath = createBackup(envPath);
    
    // Step 4: Applica configurazione produzione
    logStep('4', 'Applicazione configurazione produzione');
    
    fs.copyFileSync(envProductionPath, envPath);
    logSuccess('Configurazione produzione applicata');

    // Step 5: Verifica build
    logStep('5', 'Verifica build applicazione');
    
    try {
      execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
      logSuccess('Build completata con successo');
    } catch (error) {
      logError('Errore durante il build');
      log(error.message, 'red');
      
      // Ripristina backup in caso di errore
      if (backupPath) {
        fs.copyFileSync(backupPath, envPath);
        logWarning('Configurazione precedente ripristinata');
      }
      process.exit(1);
    }

    // Step 6: Istruzioni finali
    logStep('6', 'Deploy completato!');
    
    log('\n🎉 Applicazione configurata per la PRODUZIONE!', 'green');
    log('\n📋 Prossimi passi:', 'cyan');
    log('1. Verifica che i webhook Stripe siano configurati in modalità live', 'yellow');
    log('2. Testa il flusso di pagamento con carte reali in ambiente di staging', 'yellow');
    log('3. Monitora i log per eventuali errori dopo il deploy', 'yellow');
    log('4. Configura le variabili d\'ambiente sul server di produzione', 'yellow');
    
    if (backupPath) {
      log(`\n💾 Backup salvato in: ${path.basename(backupPath)}`, 'blue');
      log('Per ripristinare la configurazione precedente:', 'blue');
      log(`   cp ${path.basename(backupPath)} .env`, 'blue');
    }

  } catch (error) {
    logError(`Errore durante il deploy: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Funzione per ripristinare la modalità test
 */
async function restoreTestMode() {
  log('🔄 Ripristino Modalità Test', 'magenta');
  log('============================\n', 'magenta');

  const envPath = path.join(rootDir, '.env');
  const backupFiles = fs.readdirSync(rootDir)
    .filter(file => file.startsWith('.env.backup.'))
    .sort()
    .reverse(); // Più recente per primo

  if (backupFiles.length === 0) {
    logError('Nessun backup trovato!');
    log('Ripristina manualmente la configurazione test.', 'yellow');
    process.exit(1);
  }

  const latestBackup = backupFiles[0];
  const backupPath = path.join(rootDir, latestBackup);
  
  fs.copyFileSync(backupPath, envPath);
  logSuccess(`Configurazione ripristinata da: ${latestBackup}`);
  
  log('\n✅ Modalità test ripristinata!', 'green');
}

// Gestione argomenti command line
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'production':
  case 'prod':
    deployProduction();
    break;
  case 'test':
  case 'restore':
    restoreTestMode();
    break;
  case 'help':
  case '--help':
  case '-h':
    log('🚀 Script di Deploy Stripe', 'cyan');
    log('\nComandi disponibili:', 'yellow');
    log('  production, prod    - Deploy in modalità produzione', 'green');
    log('  test, restore       - Ripristina modalità test', 'green');
    log('  help               - Mostra questo aiuto', 'green');
    log('\nEsempi:', 'yellow');
    log('  node scripts/deploy-production.js production', 'blue');
    log('  node scripts/deploy-production.js test', 'blue');
    break;
  default:
    logError('Comando non riconosciuto!');
    log('Usa "help" per vedere i comandi disponibili.', 'yellow');
    process.exit(1);
}