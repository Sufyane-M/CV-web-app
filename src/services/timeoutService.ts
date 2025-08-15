import { getSupabase } from './supabase';
import { creditService } from './creditService';
import { Database } from '../types/database';

type CVAnalysis = Database['public']['Tables']['cv_analyses']['Row'];
type CreditTransaction = Database['public']['Tables']['credit_transactions']['Insert'];

export interface TimeoutResult {
  success: boolean;
  processedAnalyses: number;
  errors: string[];
  details: {
    analysisId: string;
    userId: string;
    fileName: string;
    action: 'deleted' | 'credit_restored' | 'error';
    error?: string;
  }[];
}

class TimeoutService {
  private readonly TIMEOUT_MINUTES = 5;
  private readonly TIMEOUT_MS = this.TIMEOUT_MINUTES * 60 * 1000;

  /**
   * Trova e gestisce tutte le analisi scadute
   */
  async handleTimeoutAnalyses(): Promise<TimeoutResult> {
    const result: TimeoutResult = {
      success: true,
      processedAnalyses: 0,
      errors: [],
      details: []
    };

    try {
      // Trova tutte le analisi in elaborazione scadute
      const timeoutThreshold = new Date(Date.now() - this.TIMEOUT_MS).toISOString();
      
      const { data: timedOutAnalyses, error: fetchError } = await getSupabase()
        .from('cv_analyses')
        .select('*')
        .eq('status', 'processing')
        .lt('created_at', timeoutThreshold);

      if (fetchError) {
        result.success = false;
        result.errors.push(`Errore nel recupero delle analisi scadute: ${fetchError.message}`);
        return result;
      }

      if (!timedOutAnalyses || timedOutAnalyses.length === 0) {
        if (import.meta.env.DEV) {
          console.log('Nessuna analisi scaduta trovata');
        }
        return result;
      }

      if (import.meta.env.DEV) {
        console.log(`Trovate ${timedOutAnalyses.length} analisi scadute da gestire`);
      }

      // Processa ogni analisi scaduta
      for (const analysis of timedOutAnalyses) {
        try {
          await this.handleSingleTimeoutAnalysis(analysis as CVAnalysis, result);
          result.processedAnalyses++;
        } catch (error) {
          const errorMessage = `Errore nella gestione dell'analisi ${analysis.id}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`;
          result.errors.push(errorMessage);
          result.success = false;
          
          result.details.push({
            analysisId: analysis.id,
            userId: analysis.user_id,
            fileName: analysis.file_name,
            action: 'error',
            error: errorMessage
          });
        }
      }

      // Log del risultato finale
      if (import.meta.env.DEV) {
        console.log(`Gestione timeout completata: ${result.processedAnalyses} analisi processate, ${result.errors.length} errori`);
      }
      
      return result;

    } catch (error) {
      result.success = false;
      result.errors.push(`Errore generale nella gestione dei timeout: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
      return result;
    }
  }

  /**
   * Gestisce una singola analisi scaduta in modo atomico
   */
  private async handleSingleTimeoutAnalysis(analysis: CVAnalysis, result: TimeoutResult): Promise<void> {
    const supabase = getSupabase();
    
    // Log dell'inizio operazione
    if (import.meta.env.DEV) {
      console.log(`Gestione timeout per analisi ${analysis.id} dell'utente ${analysis.user_id} (file: ${analysis.file_name})`);
    }

    try {
      // Inizia una transazione atomica
      const { error: transactionError } = await supabase.rpc('handle_analysis_timeout', {
        p_analysis_id: analysis.id,
        p_user_id: analysis.user_id,
        p_analysis_type: analysis.analysis_type
      });

      if (transactionError) {
        throw new Error(`Errore nella transazione atomica: ${transactionError.message}`);
      }

      // Log successo
      if (import.meta.env.DEV) {
        console.log(`✅ Analisi ${analysis.id} gestita con successo: eliminata e credito ripristinato`);
      }
      
      result.details.push({
        analysisId: analysis.id,
        userId: analysis.user_id,
        fileName: analysis.file_name,
        action: 'deleted'
      });

      result.details.push({
        analysisId: analysis.id,
        userId: analysis.user_id,
        fileName: analysis.file_name,
        action: 'credit_restored'
      });

    } catch (error) {
      // Se la funzione RPC non esiste, usa il fallback manuale
      if (error instanceof Error && error.message.includes('function handle_analysis_timeout')) {
        await this.handleTimeoutManually(analysis, result);
      } else {
        throw error;
      }
    }
  }

  /**
   * Gestione manuale del timeout (fallback se la funzione RPC non esiste)
   */
  private async handleTimeoutManually(analysis: CVAnalysis, result: TimeoutResult): Promise<void> {
    const supabase = getSupabase();
    
    if (import.meta.env.DEV) {
      console.log(`Usando gestione manuale per analisi ${analysis.id}`);
    }

    // 1. Elimina l'analisi
    const { error: deleteError } = await supabase
      .from('cv_analyses')
      .delete()
      .eq('id', analysis.id);

    if (deleteError) {
      throw new Error(`Errore nell'eliminazione dell'analisi: ${deleteError.message}`);
    }

    result.details.push({
      analysisId: analysis.id,
      userId: analysis.user_id,
      fileName: analysis.file_name,
      action: 'deleted'
    });

    // 2. Ripristina il credito solo se era un'analisi a pagamento
    if (analysis.analysis_type === 'complete') {
      try {
        // Trova la transazione di credito associata
        const { data: creditTransaction, error: findError } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('analysis_id', analysis.id)
          .eq('type', 'debit')
          .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows found
          if (import.meta.env.DEV) {
            console.warn(`Transazione di credito non trovata per analisi ${analysis.id}: ${findError.message}`);
          }
        }

        if (creditTransaction) {
          // Ripristina il credito
          const { error: creditError } = await supabase
            .from('user_profiles')
            .update({ 
              credits: supabase.raw('credits + 2'),
              updated_at: new Date().toISOString()
            })
            .eq('id', analysis.user_id);

          if (creditError) {
            throw new Error(`Errore nel ripristino del credito: ${creditError.message}`);
          }

          // Crea una transazione di rimborso
          const refundTransaction: CreditTransaction = {
            user_id: analysis.user_id,
            amount: 2,
            type: 'refund',
            analysis_id: analysis.id,
            description: `Rimborso per timeout analisi: ${analysis.file_name}`,
            created_at: new Date().toISOString()
          };

          const { error: refundError } = await supabase
            .from('credit_transactions')
            .insert(refundTransaction);

          if (refundError) {
          if (import.meta.env.DEV) {
            console.error(`Errore nella creazione della transazione di rimborso: ${refundError.message}`);
          }
            // Non bloccare l'operazione per questo errore
          }

          result.details.push({
            analysisId: analysis.id,
            userId: analysis.user_id,
            fileName: analysis.file_name,
            action: 'credit_restored'
          });
        }
      } catch (creditError) {
        if (import.meta.env.DEV) {
          console.error(`Errore nel ripristino credito per analisi ${analysis.id}:`, creditError);
        }
        // Non bloccare l'operazione principale
      }
    }

    if (import.meta.env.DEV) {
      console.log(`✅ Analisi ${analysis.id} gestita manualmente con successo`);
    }
  }

  /**
   * Avvia il monitoraggio automatico dei timeout
   */
  startTimeoutMonitoring(intervalMinutes: number = 2): NodeJS.Timeout {
    if (import.meta.env.DEV) {
      console.log(`🕐 Avvio monitoraggio timeout ogni ${intervalMinutes} minuti`);
    }
    
    return setInterval(async () => {
      try {
        const result = await this.handleTimeoutAnalyses();
        
        if (result.processedAnalyses > 0) {
          if (import.meta.env.DEV) {
            console.log(`⚠️ Gestite ${result.processedAnalyses} analisi scadute`);
          }
          
          if (result.errors.length > 0) {
            if (import.meta.env.DEV) {
              console.error('❌ Errori durante la gestione:', result.errors);
            }
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('❌ Errore nel monitoraggio timeout:', error);
        }
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Ferma il monitoraggio automatico
   */
  stopTimeoutMonitoring(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    if (import.meta.env.DEV) {
      console.log('🛑 Monitoraggio timeout fermato');
    }
  }

  /**
   * Controlla se un'analisi specifica è scaduta
   */
  async isAnalysisTimedOut(analysisId: string): Promise<boolean> {
    try {
      const { data: analysis, error } = await getSupabase()
        .from('cv_analyses')
        .select('created_at, status')
        .eq('id', analysisId)
        .single();

      if (error || !analysis) {
        return false;
      }

      if (analysis.status !== 'processing') {
        return false;
      }

      const createdAt = new Date(analysis.created_at).getTime();
      const now = Date.now();
      
      return (now - createdAt) > this.TIMEOUT_MS;
    } catch (error) {
      console.error('Errore nel controllo timeout analisi:', error);
      return false;
    }
  }

  /**
   * Forza la gestione del timeout per una specifica analisi
   */
  async forceTimeoutAnalysis(analysisId: string): Promise<TimeoutResult> {
    const result: TimeoutResult = {
      success: true,
      processedAnalyses: 0,
      errors: [],
      details: []
    };

    try {
      const { data: analysis, error } = await getSupabase()
        .from('cv_analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (error || !analysis) {
        result.success = false;
        result.errors.push(`Analisi ${analysisId} non trovata`);
        return result;
      }

      if (analysis.status !== 'processing') {
        result.success = false;
        result.errors.push(`Analisi ${analysisId} non è in elaborazione (stato: ${analysis.status})`);
        return result;
      }

      await this.handleSingleTimeoutAnalysis(analysis as CVAnalysis, result);
      result.processedAnalyses = 1;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Errore nella gestione forzata del timeout: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
      return result;
    }
  }
}

export const timeoutService = new TimeoutService();
export default timeoutService;