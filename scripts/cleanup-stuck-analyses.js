/**
 * Script per pulire le analisi bloccate nel database
 * Questo script può essere eseguito manualmente per risolvere il problema delle analisi infinite
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Usa la service role key per operazioni admin
);

async function cleanupStuckAnalyses() {
  try {
    console.log('🔍 Cercando analisi bloccate...');
    
    // Trova analisi in stato processing da più di 30 minuti
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: stuckAnalyses, error: findError } = await supabase
      .from('cv_analyses')
      .select('id, file_name, status, created_at, updated_at')
      .in('status', ['processing'])
      .lt('updated_at', thirtyMinutesAgo);
    
    if (findError) {
      console.error('❌ Errore nella ricerca delle analisi bloccate:', findError);
      return;
    }
    
    if (!stuckAnalyses || stuckAnalyses.length === 0) {
      console.log('✅ Nessuna analisi bloccata trovata.');
      return;
    }
    
    console.log(`📊 Trovate ${stuckAnalyses.length} analisi bloccate:`);
    stuckAnalyses.forEach(analysis => {
      console.log(`  - ID: ${analysis.id}`);
      console.log(`    File: ${analysis.file_name}`);
      console.log(`    Status: ${analysis.status}`);
      console.log(`    Creata: ${analysis.created_at}`);
      console.log(`    Aggiornata: ${analysis.updated_at}`);
      console.log('    ---');
    });
    
    // Aggiorna le analisi bloccate a 'failed' (verranno cancellate immediatamente dal trigger)
    const { data: updatedAnalyses, error: updateError } = await supabase
      .from('cv_analyses')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .in('status', ['processing'])
      .lt('updated_at', thirtyMinutesAgo)
      .select('id, file_name');
    
    if (updateError) {
      console.error('❌ Errore nell\'aggiornamento delle analisi:', updateError);
      return;
    }
    
    console.log(`✅ Aggiornate ${updatedAnalyses?.length || 0} analisi bloccate a stato 'failed'.`);
    
    if (updatedAnalyses && updatedAnalyses.length > 0) {
      console.log('📝 Analisi aggiornate:');
      updatedAnalyses.forEach(analysis => {
        console.log(`  - ${analysis.file_name} (ID: ${analysis.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Errore generale:', error);
  }
}

// Funzione per verificare lo stato delle analisi
async function checkAnalysesStatus() {
  try {
    console.log('📊 Controllo stato delle analisi...');
    
    const { data: analyses, error } = await supabase
      .from('cv_analyses')
      .select('status')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('❌ Errore nel controllo dello stato:', error);
      return;
    }
    
    const statusCount = analyses.reduce((acc, analysis) => {
      acc[analysis.status] = (acc[analysis.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📈 Stato delle ultime 100 analisi:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Errore generale:', error);
  }
}

// Esegui lo script
async function main() {
  console.log('🚀 Avvio script di pulizia analisi bloccate...');
  console.log('='.repeat(50));
  
  await checkAnalysesStatus();
  console.log('\n' + '-'.repeat(50) + '\n');
  await cleanupStuckAnalyses();
  console.log('\n' + '-'.repeat(50) + '\n');
  await checkAnalysesStatus();
  
  console.log('\n✅ Script completato!');
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanupStuckAnalyses, checkAnalysesStatus };