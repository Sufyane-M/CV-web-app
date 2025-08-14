#!/usr/bin/env node

/**
 * Script per la pulizia delle analisi scadute
 * Può essere eseguito manualmente o tramite cron job
 * 
 * Utilizzo:
 * node scripts/cleanup-timeout-analyses.js [--force] [--dry-run]
 * 
 * --force: Forza la pulizia anche se non sono passati 5 minuti
 * --dry-run: Mostra solo cosa verrebbe fatto senza eseguire le operazioni
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carica manualmente le variabili d'ambiente dal file .env
try {
  const envPath = path.join(__dirname, '..', '.env');
  const envFile = readFileSync(envPath, 'utf8');
  const envLines = envFile.split('\n');
  
  for (const line of envLines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        process.env[key] = value;
      }
    }
  }
} catch (error) {
  console.warn('⚠️ Impossibile caricare il file .env:', error.message);
}

// Configurazione
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TIMEOUT_MINUTES = 5;
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;

// Parsing argomenti
const args = process.argv.slice(2);
const isForce = args.includes('--force');
const isDryRun = args.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variabili d\'ambiente mancanti: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findTimedOutAnalyses() {
  const timeoutThreshold = new Date(Date.now() - TIMEOUT_MS).toISOString();
  
  console.log(`🔍 Ricerca analisi scadute prima di: ${timeoutThreshold}`);
  
  const { data: analyses, error } = await supabase
    .from('cv_analyses')
    .select(`
      id,
      user_id,
      file_name,
      analysis_type,
      status,
      created_at,
      user_profiles!inner(email, full_name)
    `)
    .eq('status', 'processing')
    .lt('created_at', isForce ? new Date().toISOString() : timeoutThreshold);

  if (error) {
    throw new Error(`Errore nel recupero delle analisi: ${error.message}`);
  }

  return analyses || [];
}

async function handleTimeoutAnalysis(analysis) {
  console.log(`\n📋 Gestione analisi scaduta:`);
  console.log(`   ID: ${analysis.id}`);
  console.log(`   Utente: ${analysis.user_profiles.email} (${analysis.user_profiles.full_name})`);
  console.log(`   File: ${analysis.file_name}`);
  console.log(`   Tipo: ${analysis.analysis_type}`);
  console.log(`   Creata: ${analysis.created_at}`);
  
  if (isDryRun) {
    console.log(`   🔍 DRY RUN: Analisi verrebbe eliminata e credito ripristinato`);
    return { success: true, action: 'dry-run' };
  }

  try {
    // Usa la funzione PostgreSQL per gestione atomica
    const { error } = await supabase.rpc('handle_analysis_timeout', {
      p_analysis_id: analysis.id,
      p_user_id: analysis.user_id,
      p_analysis_type: analysis.analysis_type
    });

    if (error) {
      throw new Error(`Errore nella funzione RPC: ${error.message}`);
    }

    console.log(`   ✅ Analisi gestita con successo`);
    return { success: true, action: 'processed' };

  } catch (error) {
    console.error(`   ❌ Errore: ${error.message}`);
    return { success: false, error: error.message, action: 'error' };
  }
}

async function generateReport(results) {
  const processed = results.filter(r => r.success && r.action === 'processed').length;
  const dryRun = results.filter(r => r.success && r.action === 'dry-run').length;
  const errors = results.filter(r => !r.success).length;
  
  console.log(`\n📊 REPORT FINALE:`);
  console.log(`   📈 Analisi trovate: ${results.length}`);
  
  if (isDryRun) {
    console.log(`   🔍 Analisi che verrebbero processate: ${dryRun}`);
  } else {
    console.log(`   ✅ Analisi processate con successo: ${processed}`);
  }
  
  if (errors > 0) {
    console.log(`   ❌ Errori: ${errors}`);
    console.log(`\n🔍 DETTAGLI ERRORI:`);
    results
      .filter(r => !r.success)
      .forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.error}`);
      });
  }
  
  // Salva report su file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = `cleanup-report-${timestamp}.json`;
  
  const report = {
    timestamp: new Date().toISOString(),
    isDryRun,
    isForce,
    summary: {
      total: results.length,
      processed,
      dryRun,
      errors
    },
    details: results
  };
  

  
  try {
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(reportsDir, reportFile),
      JSON.stringify(report, null, 2)
    );
    
    console.log(`\n💾 Report salvato in: reports/${reportFile}`);
  } catch (error) {
    console.error(`⚠️ Impossibile salvare il report: ${error.message}`);
  }
}

async function main() {
  console.log(`🚀 AVVIO CLEANUP ANALISI SCADUTE`);
  console.log(`   Timeout: ${TIMEOUT_MINUTES} minuti`);
  console.log(`   Modalità: ${isDryRun ? 'DRY RUN' : 'ESECUZIONE'}`);
  console.log(`   Forza: ${isForce ? 'SÌ' : 'NO'}`);
  
  try {
    // Trova analisi scadute
    const timedOutAnalyses = await findTimedOutAnalyses();
    
    if (timedOutAnalyses.length === 0) {
      console.log(`\n✅ Nessuna analisi scaduta trovata`);
      return;
    }
    
    console.log(`\n⚠️ Trovate ${timedOutAnalyses.length} analisi scadute`);
    
    // Processa ogni analisi
    const results = [];
    for (const analysis of timedOutAnalyses) {
      const result = await handleTimeoutAnalysis(analysis);
      results.push({
        analysisId: analysis.id,
        userId: analysis.user_id,
        fileName: analysis.file_name,
        userEmail: analysis.user_profiles.email,
        ...result
      });
      
      // Pausa tra le operazioni per evitare sovraccarico
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Genera report
    await generateReport(results);
    
  } catch (error) {
    console.error(`\n❌ ERRORE FATALE: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Gestione segnali per cleanup graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Interruzione ricevuta, uscita...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Terminazione ricevuta, uscita...');
  process.exit(0);
});

// Avvia lo script
if (import.meta.url === `file:///${__filename.replace(/\\/g, '/')}`) {
  main().catch(error => {
    console.error('❌ Errore non gestito:', error);
    process.exit(1);
  });
}

export {
  findTimedOutAnalyses,
  handleTimeoutAnalysis,
  generateReport
};