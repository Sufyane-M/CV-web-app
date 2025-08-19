#!/usr/bin/env node

/**
 * Script per passare tra modalità TEST e PRODUCTION nell'ambiente locale
 * 
 * Questo script aiuta a:
 * 1. Passare dalla modalità test alla produzione e viceversa
 * 2. Fare backup del file .env attuale
 * 3. Copiare la configurazione appropriata
 * 4. Verificare che le variabili siano corrette
 * 
 * Uso:
 * node scripts/switch-env-mode.js --mode production
 * node scripts/switch-env-mode.js --mode test
 * node scripts/switch-env-mode.js --status  # Mostra modalità attuale
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
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

// Parsing degli argomenti della command line
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1] || true;
    options[key] = value;
  }
  
  return options;
}

// Percorsi dei file
const paths = {
  env: join(__dirname, '..', '.env'),
  envProduction: join(__dirname, '..', '.env.production'),
  envTest: join(__dirname, '..', '.env.test'),
  envBackup: join(__dirname, '..', '.env.backup')
};

// Legge e analizza un file .env
function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  
  try {
    const content = readFileSync(filePath, 'utf8');
    const vars = {};
    
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          vars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
    
    return { content, vars };
  } catch (error) {
    logError(`Errore nella lettura di ${filePath}: ${error.message}`);
    return null;
  }
}

// Determina la modalità attuale
function getCurrentMode() {
  const envData = parseEnvFile(paths.env);
  if (!envData) {
    return 'unknown';
  }
  
  const { vars } = envData;
  
  // Controlla le chiavi Stripe
  if (vars.STRIPE_SECRET_KEY) {
    if (vars.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
      return 'test';
    } else if (vars.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
      return 'production';
    }
  }
  
  if (vars.VITE_STRIPE_PUBLISHABLE_KEY) {
    if (vars.VITE_STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_')) {
      return 'test';
    } else if (vars.VITE_STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_')) {
      return 'production';
    }
  }
  
  // Controlla NODE_ENV
  if (vars.NODE_ENV === 'production') {
    return 'production';
  } else if (vars.NODE_ENV === 'development') {
    return 'test';
  }
  
  return 'unknown';
}

// Mostra lo status attuale
function showStatus() {
  log('📊 Status Ambiente Attuale', 'bright');
  log('==========================', 'bright');
  
  const currentMode = getCurrentMode();
  
  switch (currentMode) {
    case 'test':
      logInfo('Modalità attuale: TEST/DEVELOPMENT');
      log('  - Stripe in modalità test', 'cyan');
      log('  - Pagamenti simulati', 'cyan');
      log('  - Sicuro per sviluppo', 'cyan');
      break;
      
    case 'production':
      logWarning('Modalità attuale: PRODUCTION/LIVE');
      log('  - Stripe in modalità live', 'yellow');
      log('  - Pagamenti reali', 'yellow');
      log('  - ATTENZIONE: Denaro reale!', 'red');
      break;
      
    default:
      logError('Modalità attuale: SCONOSCIUTA');
      log('  - File .env non trovato o configurazione non valida', 'red');
      break;
  }
  
  // Mostra variabili chiave
  const envData = parseEnvFile(paths.env);
  if (envData) {
    log('\n🔑 Variabili Chiave:', 'bright');
    const keyVars = [
      'NODE_ENV',
      'VITE_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ];
    
    keyVars.forEach(key => {
      const value = envData.vars[key];
      if (value) {
        const displayValue = key.includes('SECRET') || key.includes('KEY')
          ? `${value.substring(0, 15)}...`
          : value;
        log(`  ${key}: ${displayValue}`, 'cyan');
      } else {
        log(`  ${key}: NON IMPOSTATA`, 'red');
      }
    });
  }
  
  // Mostra file disponibili
  log('\n📁 File Disponibili:', 'bright');
  const files = [
    { path: paths.env, name: '.env (attuale)' },
    { path: paths.envProduction, name: '.env.production' },
    { path: paths.envTest, name: '.env.test' },
    { path: paths.envBackup, name: '.env.backup' }
  ];
  
  files.forEach(file => {
    if (existsSync(file.path)) {
      logSuccess(`  ${file.name} ✓`);
    } else {
      logWarning(`  ${file.name} ✗`);
    }
  });
}

// Crea backup del file .env attuale
function createBackup() {
  if (existsSync(paths.env)) {
    try {
      copyFileSync(paths.env, paths.envBackup);
      logSuccess('Backup creato: .env.backup');
      return true;
    } catch (error) {
      logError(`Errore nella creazione del backup: ${error.message}`);
      return false;
    }
  }
  return true;
}

// Passa alla modalità specificata
function switchToMode(targetMode) {
  const currentMode = getCurrentMode();
  
  if (currentMode === targetMode) {
    logInfo(`Già in modalità ${targetMode.toUpperCase()}`);
    return true;
  }
  
  logInfo(`Passaggio da ${currentMode.toUpperCase()} a ${targetMode.toUpperCase()}...`);
  
  // Crea backup
  if (!createBackup()) {
    return false;
  }
  
  // Determina il file sorgente
  let sourceFile;
  if (targetMode === 'production') {
    sourceFile = paths.envProduction;
  } else if (targetMode === 'test') {
    sourceFile = paths.envTest;
  } else {
    logError(`Modalità non supportata: ${targetMode}`);
    return false;
  }
  
  // Verifica che il file sorgente esista
  if (!existsSync(sourceFile)) {
    logError(`File sorgente non trovato: ${sourceFile}`);
    logWarning('Crea prima il file di configurazione appropriato.');
    return false;
  }
  
  // Copia il file
  try {
    copyFileSync(sourceFile, paths.env);
    logSuccess(`Configurazione copiata da ${sourceFile}`);
    
    // Verifica il risultato
    const newMode = getCurrentMode();
    if (newMode === targetMode) {
      logSuccess(`✅ Passaggio a modalità ${targetMode.toUpperCase()} completato!`);
      
      if (targetMode === 'production') {
        logWarning('\n⚠️  ATTENZIONE: Ora sei in modalità PRODUCTION!');
        logWarning('   - I pagamenti saranno reali');
        logWarning('   - Verifica che tutte le chiavi siano corrette');
        logWarning('   - Testa con importi minimi');
      } else {
        logInfo('\n✅ Ora sei in modalità TEST/DEVELOPMENT');
        logInfo('   - I pagamenti sono simulati');
        logInfo('   - Sicuro per sviluppo e test');
      }
      
      return true;
    } else {
      logError(`Errore: modalità risultante è ${newMode}, attesa ${targetMode}`);
      return false;
    }
  } catch (error) {
    logError(`Errore nella copia del file: ${error.message}`);
    return false;
  }
}

// Crea file .env.test se non esiste
function createTestEnvFile() {
  if (existsSync(paths.envTest)) {
    return true;
  }
  
  logInfo('Creando file .env.test...');
  
  const testEnvContent = `# =============================================================================
# CONFIGURAZIONE SVILUPPO/TEST - CV ANALYZER
# =============================================================================
# Questo file contiene le configurazioni per l'ambiente di sviluppo e test
# Le chiavi Stripe sono in modalità TEST (sicure per sviluppo)

# =============================================================================
# AMBIENTE
# =============================================================================
NODE_ENV=development
VITE_APP_URL=http://localhost:5173

# =============================================================================
# STRIPE TEST KEYS
# =============================================================================
# Chiavi di test Stripe (sicure, non processano pagamenti reali)
# Ottieni le tue chiavi da: https://dashboard.stripe.com/test/apikeys

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_SOSTITUISCI_CON_TUA_CHIAVE_TEST
STRIPE_SECRET_KEY=sk_test_SOSTITUISCI_CON_TUA_CHIAVE_TEST
STRIPE_WEBHOOK_SECRET=whsec_[SOSTITUISCI_CON_TUO_WEBHOOK_SECRET_TEST]

# =============================================================================
# CONFIGURAZIONE PRODOTTI STRIPE TEST
# =============================================================================
# In modalità test, puoi usare prezzi dinamici o Price ID di test
# Questi sono opzionali per lo sviluppo

# STRIPE_PRICE_ID_STARTER=price_test_XXXXXXXXXXXXXXXXXXXXXXXX
# STRIPE_PRICE_ID_VALUE=price_test_XXXXXXXXXXXXXXXXXXXXXXXX

# =============================================================================
# DATABASE E ALTRE CONFIGURAZIONI
# =============================================================================
# Configurazioni per database di sviluppo

# DATABASE_URL=your_development_database_url
# JWT_SECRET=your_jwt_secret_for_development
# API_BASE_URL=http://localhost:5173/api

# =============================================================================
# NOTE
# =============================================================================
# - Le chiavi TEST iniziano con pk_test_ e sk_test_
# - I pagamenti in modalità test sono simulati
# - Usa carte di test di Stripe per i test
# - Documentazione: https://stripe.com/docs/testing
`;
  
  try {
    writeFileSync(paths.envTest, testEnvContent);
    logSuccess('File .env.test creato');
    return true;
  } catch (error) {
    logError(`Errore nella creazione di .env.test: ${error.message}`);
    return false;
  }
}

// Funzione principale
function main() {
  log('🔄 Switch Modalità Ambiente - CV Analyzer', 'bright');
  log('==========================================', 'bright');
  
  const options = parseArgs();
  
  // Crea .env.test se non esiste
  createTestEnvFile();
  
  if (options.status) {
    showStatus();
    return;
  }
  
  if (options.mode) {
    const targetMode = options.mode.toLowerCase();
    
    if (!['test', 'production'].includes(targetMode)) {
      logError('Modalità non valida. Usa: test o production');
      logError('Esempi:');
      logError('  node switch-env-mode.js --mode test');
      logError('  node switch-env-mode.js --mode production');
      logError('  node switch-env-mode.js --status');
      return;
    }
    
    if (targetMode === 'production') {
      logWarning('⚠️  ATTENZIONE: Stai per passare alla modalità PRODUCTION!');
      logWarning('   Questo utilizzerà chiavi Stripe LIVE e pagamenti reali.');
      logWarning('   Assicurati che tutte le configurazioni siano corrette.');
    }
    
    const success = switchToMode(targetMode);
    
    if (success) {
      log('\n📝 Prossimi Passi:', 'bright');
      if (targetMode === 'production') {
        log('1. Verifica che tutte le chiavi siano corrette', 'yellow');
        log('2. Testa con un pagamento di importo minimo', 'yellow');
        log('3. Monitora i logs per errori', 'yellow');
        log('4. Configura le stesse variabili su Vercel', 'yellow');
      } else {
        log('1. Verifica che le chiavi di test siano configurate', 'yellow');
        log('2. Usa carte di test di Stripe per i test', 'yellow');
        log('3. Sviluppa e testa liberamente', 'yellow');
      }
    }
  } else {
    // Mostra help
    showStatus();
    log('\n📖 Uso:', 'bright');
    log('node switch-env-mode.js --mode test        # Passa a modalità test', 'cyan');
    log('node switch-env-mode.js --mode production  # Passa a modalità produzione', 'cyan');
    log('node switch-env-mode.js --status           # Mostra status attuale', 'cyan');
  }
}

// Gestione errori
process.on('unhandledRejection', (error) => {
  logError(`Errore non gestito: ${error.message}`);
  process.exit(1);
});

// Esegui script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { getCurrentMode, switchToMode, showStatus };