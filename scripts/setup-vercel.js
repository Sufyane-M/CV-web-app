#!/usr/bin/env node

/**
 * Script di Configurazione Automatica per Vercel
 * 
 * Questo script automatizza la configurazione del progetto per il deploy su Vercel,
 * includendo la creazione di file di configurazione, validazione delle dipendenze
 * e setup delle variabili d'ambiente.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}`),
  step: (step, total, msg) => console.log(`${colors.magenta}[${step}/${total}]${colors.reset} ${msg}`)
};

class VercelSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
    this.vercelJsonPath = path.join(this.projectRoot, 'vercel.json');
    this.envProductionPath = path.join(this.projectRoot, '.env.production');
  }

  async run() {
    try {
      log.title('🚀 Setup Automatico Vercel per Analizzatore CV');
      console.log('Questo script configurerà il progetto per il deploy su Vercel\n');

      await this.checkPrerequisites();
      await this.createVercelConfig();
      await this.updatePackageJson();
      await this.createEnvTemplate();
      await this.installVercelCLI();
      await this.createDeployScripts();
      await this.validateConfiguration();
      
      this.showCompletionGuide();
    } catch (error) {
      log.error(`Errore durante il setup: ${error.message}`);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    log.step(1, 7, 'Verifica prerequisiti...');
    
    // Verifica Node.js
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 16) {
        throw new Error(`Node.js ${nodeVersion} non supportato. Richiesto >= 16.x`);
      }
      log.success(`Node.js ${nodeVersion} ✓`);
    } catch (error) {
      throw new Error('Node.js non trovato. Installa Node.js >= 16.x');
    }

    // Verifica npm
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      log.success(`npm ${npmVersion} ✓`);
    } catch (error) {
      throw new Error('npm non trovato');
    }

    // Verifica Git
    try {
      execSync('git --version', { encoding: 'utf8' });
      log.success('Git ✓');
    } catch (error) {
      log.warning('Git non trovato - necessario per il deploy automatico');
    }

    // Verifica package.json
    if (!fs.existsSync(this.packageJsonPath)) {
      throw new Error('package.json non trovato nella directory corrente');
    }
    log.success('package.json trovato ✓');
  }

  async createVercelConfig() {
    log.step(2, 7, 'Creazione configurazione Vercel...');
    
    const vercelConfig = {
      "version": 2,
      "name": "analizzatore-cv",
      "builds": [
        {
          "src": "package.json",
          "use": "@vercel/static-build",
          "config": {
            "distDir": "dist"
          }
        }
      ],
      "functions": {
        "api/**/*.js": {
          "runtime": "nodejs18.x",
          "maxDuration": 30
        }
      },
      "rewrites": [
        {
          "source": "/api/(.*)",
          "destination": "/api/$1"
        },
        {
          "source": "/(.*)",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "/api/(.*)",
          "headers": [
            {
              "key": "Access-Control-Allow-Origin",
              "value": "*"
            },
            {
              "key": "Access-Control-Allow-Methods",
              "value": "GET, POST, PUT, DELETE, OPTIONS"
            },
            {
              "key": "Access-Control-Allow-Headers",
              "value": "Content-Type, Authorization"
            }
          ]
        },
        {
          "source": "/(.*)",
          "headers": [
            {
              "key": "X-Frame-Options",
              "value": "DENY"
            },
            {
              "key": "X-Content-Type-Options",
              "value": "nosniff"
            },
            {
              "key": "Referrer-Policy",
              "value": "strict-origin-when-cross-origin"
            },
            {
              "key": "X-XSS-Protection",
              "value": "1; mode=block"
            }
          ]
        },
        {
          "source": "/assets/(.*)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "public, max-age=31536000, immutable"
            }
          ]
        }
      ],
      "env": {
        "NODE_ENV": "production"
      }
    };

    if (fs.existsSync(this.vercelJsonPath)) {
      log.warning('vercel.json già esistente - creazione backup...');
      fs.copyFileSync(this.vercelJsonPath, `${this.vercelJsonPath}.backup`);
    }

    fs.writeFileSync(
      this.vercelJsonPath, 
      JSON.stringify(vercelConfig, null, 2)
    );
    
    log.success('vercel.json creato/aggiornato');
  }

  async updatePackageJson() {
    log.step(3, 7, 'Aggiornamento package.json...');
    
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    
    // Aggiungi script Vercel se non esistono
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    const vercelScripts = {
      'vercel-build': 'npm run build',
      'vercel:deploy': 'vercel --prod',
      'vercel:preview': 'vercel',
      'vercel:dev': 'vercel dev',
      'vercel:logs': 'vercel logs',
      'setup:vercel': 'node scripts/setup-vercel.js'
    };

    let scriptsAdded = 0;
    Object.entries(vercelScripts).forEach(([key, value]) => {
      if (!packageJson.scripts[key]) {
        packageJson.scripts[key] = value;
        scriptsAdded++;
      }
    });

    // Aggiungi dipendenze per analytics se non esistono
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }

    const vercelDeps = {
      '@vercel/analytics': '^1.1.1'
    };

    let depsAdded = 0;
    Object.entries(vercelDeps).forEach(([pkg, version]) => {
      if (!packageJson.dependencies[pkg] && !packageJson.devDependencies?.[pkg]) {
        packageJson.dependencies[pkg] = version;
        depsAdded++;
      }
    });

    fs.writeFileSync(
      this.packageJsonPath, 
      JSON.stringify(packageJson, null, 2)
    );
    
    if (scriptsAdded > 0) {
      log.success(`${scriptsAdded} script Vercel aggiunti`);
    }
    if (depsAdded > 0) {
      log.success(`${depsAdded} dipendenze Vercel aggiunte`);
    }
  }

  async createEnvTemplate() {
    log.step(4, 7, 'Creazione template variabili d\'ambiente...');
    
    const envTemplate = `# ===================================
# CONFIGURAZIONE VERCEL - PRODUZIONE
# ===================================
# 
# ⚠️  IMPORTANTE: Configura queste variabili nel Dashboard Vercel
# Settings > Environment Variables
# 
# 🔗 Dashboard: https://vercel.com/dashboard

# Ambiente
NODE_ENV=production

# ===================================
# SUPABASE (Produzione)
# ===================================
# 📍 Ottieni da: https://app.supabase.com/project/[project-id]/settings/api
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# ===================================
# STRIPE (LIVE - Produzione)
# ===================================
# ⚠️  ATTENZIONE: Usa SOLO chiavi LIVE per produzione
# 📍 Ottieni da: https://dashboard.stripe.com/apikeys

# Chiave Pubblica (pk_live_...)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_[your_live_publishable_key_here]

# Chiave Segreta (sk_live_...) - SOLO SERVER
STRIPE_SECRET_KEY=sk_live_[your_live_secret_key_here]

# Webhook Secret (whsec_...) - SOLO SERVER
# 📍 Configura webhook: https://dashboard.stripe.com/webhooks
# URL: https://your-domain.vercel.app/api/stripe/webhook
STRIPE_WEBHOOK_SECRET=whsec_[your_live_webhook_secret_here]

# ===================================
# STRIPE PRODUCT PRICES (LIVE)
# ===================================
# 📍 Ottieni da: https://dashboard.stripe.com/products
# ⚠️  Usa SOLO price_live_... per produzione

VITE_STRIPE_PRICE_BASIC=price_live_basic_plan_id_here
VITE_STRIPE_PRICE_PREMIUM=price_live_premium_plan_id_here
VITE_STRIPE_PRICE_ENTERPRISE=price_live_enterprise_plan_id_here

# ===================================
# URLs APPLICAZIONE
# ===================================
# 🌐 Sostituisci con il tuo dominio Vercel
VITE_APP_URL=https://your-project.vercel.app
VITE_API_URL=https://your-project.vercel.app/api

# ===================================
# CONFIGURAZIONI AGGIUNTIVE
# ===================================

# Analytics (opzionale)
VITE_VERCEL_ANALYTICS_ID=your_analytics_id_here

# Sentry (opzionale - per error tracking)
VITE_SENTRY_DSN=your_sentry_dsn_here

# ===================================
# ISTRUZIONI SETUP
# ===================================
# 
# 1. Copia questo file come riferimento
# 2. Nel Dashboard Vercel:
#    - Vai su Settings > Environment Variables
#    - Aggiungi ogni variabile individualmente
#    - Seleziona "Production" come ambiente
# 3. Per Preview/Development, usa valori di test
# 4. Non committare mai chiavi reali nel repository!
# 
# 📚 Guida completa: ./VERCEL_DEPLOY_GUIDE.md
`;

    const envVercelPath = path.join(this.projectRoot, '.env.vercel.template');
    fs.writeFileSync(envVercelPath, envTemplate);
    
    log.success('.env.vercel.template creato');
    log.info('Usa questo file come riferimento per configurare le variabili in Vercel');
  }

  async installVercelCLI() {
    log.step(5, 7, 'Installazione Vercel CLI...');
    
    try {
      // Verifica se Vercel CLI è già installato
      execSync('vercel --version', { encoding: 'utf8', stdio: 'pipe' });
      log.success('Vercel CLI già installato');
    } catch (error) {
      log.info('Installazione Vercel CLI...');
      try {
        execSync('npm install -g vercel', { stdio: 'inherit' });
        log.success('Vercel CLI installato globalmente');
      } catch (installError) {
        log.warning('Impossibile installare Vercel CLI globalmente');
        log.info('Installa manualmente: npm install -g vercel');
      }
    }
  }

  async createDeployScripts() {
    log.step(6, 7, 'Creazione script di deploy...');
    
    const scriptsDir = path.join(this.projectRoot, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    // Script di pre-deploy
    const preDeployScript = `#!/usr/bin/env node

/**
 * Script Pre-Deploy Vercel
 * Esegue controlli e validazioni prima del deploy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Esecuzione controlli pre-deploy...');

try {
  // Test build
  console.log('📦 Test build...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completata con successo');

  // Verifica file essenziali
  const requiredFiles = ['vercel.json', 'package.json', '.env.production'];
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(\`File mancante: \${file}\`);
    }
  });
  console.log('✅ File di configurazione presenti');

  // Verifica dimensione build
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    const stats = execSync('du -sh dist 2>/dev/null || dir dist', { encoding: 'utf8' });
    console.log(\`📊 Dimensione build: \${stats.trim()}\`);
  }

  console.log('🚀 Pronto per il deploy!');
} catch (error) {
  console.error('❌ Errore pre-deploy:', error.message);
  process.exit(1);
}
`;

    const preDeployPath = path.join(scriptsDir, 'pre-deploy.js');
    fs.writeFileSync(preDeployPath, preDeployScript);

    // Script di post-deploy
    const postDeployScript = `#!/usr/bin/env node

/**
 * Script Post-Deploy Vercel
 * Esegue verifiche dopo il deploy
 */

const https = require('https');
const { execSync } = require('child_process');

const DEPLOY_URL = process.argv[2] || process.env.VERCEL_URL;

if (!DEPLOY_URL) {
  console.error('❌ URL deploy non fornito');
  console.log('Uso: node post-deploy.js <url>');
  process.exit(1);
}

console.log(\`🔍 Verifica deploy: \${DEPLOY_URL}\`);

// Test endpoint principale
function testEndpoint(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode === 200) {
        resolve(response.statusCode);
      } else {
        reject(new Error(\`Status: \${response.statusCode}\`));
      }
    });
    
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function runTests() {
  try {
    // Test homepage
    await testEndpoint(DEPLOY_URL);
    console.log('✅ Homepage accessibile');

    // Test API health
    try {
      await testEndpoint(\`\${DEPLOY_URL}/api/health\`);
      console.log('✅ API funzionante');
    } catch (error) {
      console.log('⚠️  API health check fallito (normale se non implementato)');
    }

    console.log('🎉 Deploy verificato con successo!');
    console.log(\`🌐 Sito live: \${DEPLOY_URL}\`);
    
  } catch (error) {
    console.error('❌ Errore verifica deploy:', error.message);
    process.exit(1);
  }
}

runTests();
`;

    const postDeployPath = path.join(scriptsDir, 'post-deploy.js');
    fs.writeFileSync(postDeployPath, postDeployScript);

    log.success('Script di deploy creati');
  }

  async validateConfiguration() {
    log.step(7, 7, 'Validazione configurazione finale...');
    
    const checks = [
      {
        name: 'vercel.json',
        check: () => fs.existsSync(this.vercelJsonPath),
        fix: 'File vercel.json mancante'
      },
      {
        name: 'package.json scripts',
        check: () => {
          const pkg = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
          return pkg.scripts && pkg.scripts['vercel-build'];
        },
        fix: 'Script vercel-build mancante in package.json'
      },
      {
        name: 'Template env',
        check: () => fs.existsSync(path.join(this.projectRoot, '.env.vercel.template')),
        fix: 'Template variabili d\'ambiente mancante'
      }
    ];

    let allPassed = true;
    checks.forEach(({ name, check, fix }) => {
      if (check()) {
        log.success(name);
      } else {
        log.error(`${name}: ${fix}`);
        allPassed = false;
      }
    });

    if (!allPassed) {
      throw new Error('Validazione configurazione fallita');
    }

    log.success('Configurazione validata');
  }

  showCompletionGuide() {
    log.title('🎉 Setup Vercel Completato!');
    
    console.log(`
${colors.green}✅ Configurazione completata con successo!${colors.reset}
`);
    
    console.log(`${colors.bright}📁 File creati/aggiornati:${colors.reset}`);
    console.log('   • vercel.json - Configurazione Vercel');
    console.log('   • .env.vercel.template - Template variabili d\'ambiente');
    console.log('   • package.json - Script Vercel aggiunti');
    console.log('   • scripts/pre-deploy.js - Controlli pre-deploy');
    console.log('   • scripts/post-deploy.js - Verifiche post-deploy');
    
    console.log(`\n${colors.bright}🚀 Prossimi passi:${colors.reset}`);
    console.log('   1. Crea account su https://vercel.com');
    console.log('   2. Installa Vercel CLI: npm install -g vercel');
    console.log('   3. Login: vercel login');
    console.log('   4. Configura variabili d\'ambiente nel Dashboard Vercel');
    console.log('   5. Deploy: npm run vercel:deploy');
    
    console.log(`\n${colors.bright}📚 Documentazione:${colors.reset}`);
    console.log('   • Guida completa: ./VERCEL_DEPLOY_GUIDE.md');
    console.log('   • Template env: ./.env.vercel.template');
    
    console.log(`\n${colors.bright}🛠️  Comandi utili:${colors.reset}`);
    console.log('   • npm run vercel:preview  - Deploy preview');
    console.log('   • npm run vercel:dev      - Sviluppo locale con Vercel');
    console.log('   • npm run vercel:logs     - Visualizza log');
    
    console.log(`\n${colors.yellow}⚠️  Ricorda:${colors.reset}`);
    console.log('   • Configura le variabili d\'ambiente nel Dashboard Vercel');
    console.log('   • Usa chiavi Stripe LIVE per produzione');
    console.log('   • Testa il deploy in preview prima della produzione');
    
    console.log(`\n${colors.cyan}🎯 Buon deploy!${colors.reset}\n`);
  }
}

// Esecuzione script
if (require.main === module) {
  const setup = new VercelSetup();
  setup.run().catch(error => {
    log.error(`Setup fallito: ${error.message}`);
    process.exit(1);
  });
}

module.exports = VercelSetup;