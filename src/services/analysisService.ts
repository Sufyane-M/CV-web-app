import { getSupabase } from './supabase';
import { attachmentService, UploadedFileInfo } from './attachmentService';
import { creditService } from './creditService';
import { cacheService, CacheKeys } from './cacheService';
import { keywordAnalysisService, KeywordAnalysisResult } from './keywordAnalysisService';
import { Database } from '../types/database';

type CVAnalysis = Database['public']['Tables']['cv_analyses']['Row'];
type CVAnalysisInsert = Database['public']['Tables']['cv_analyses']['Insert'];
type CVAnalysisUpdate = Database['public']['Tables']['cv_analyses']['Update'];

export interface AnalysisRequest {
  file: File; // File object instead of base64
  job_description: string;
  analysis_id: string;
  user_id: string;
  file_name: string;
  scan_type: 'limitata' | 'completa';
  analysisType?: 'free' | 'premium';
}

  export interface AnalysisResult {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_url?: string;
  job_description: string;
  analysis_type: string;
    status: 'processing' | 'completed' | 'failed';
  executive_summary?: string;
  match_analysis?: any;
  overall_score?: number;
  ats_score?: number;
  content_score?: number;
  design_score?: number;
  suggestions?: any;
  raw_response?: any;
  created_at: string;
  updated_at: string;
  file_path?: string;
  can_upgrade: boolean;
  upgraded_from?: string;
  results?: any;
  analysisId?: string;
  success?: boolean;
  error?: string;
  analysisType?: 'free' | 'paid';
}

class AnalysisService {
  private timeoutMonitoringInterval: NodeJS.Timeout | null = null;
  
  // Usa env di Vite se presenti; fallback al link fornito
  private readonly webhookUrl =
    (import.meta as any).env?.VITE_AI_WEBHOOK_URL ||
    (import.meta as any).env?.VITE_N8N_WEBHOOK_URL ||
    'https://n8n.srv973674.hstgr.cloud/webhook/prova';

  /**
   * Invia i dati dell'analisi al servizio di elaborazione
   */
  async submitAnalysis(request: AnalysisRequest): Promise<boolean> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('job_description', request.job_description);
    formData.append('analysis_id', request.analysis_id);
    formData.append('user_id', request.user_id);
    formData.append('file_name', request.file_name);
    formData.append('scan_type', request.scan_type);

    const maxAttempts = 3;
    const baseDelayMs = 300;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) return true;

        // Retry on transient errors
        if (response.status >= 500 || response.status === 429) {
          const wait = baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise(res => setTimeout(res, wait));
          continue;
        }
        // For other status codes, no retry
        console.warn(`Submit failed with status ${response.status}`);
        return false;
      } catch (error) {
        console.warn(`Submit attempt ${attempt} failed:`, error);
        if (attempt === maxAttempts) {
          console.error('Error submitting analysis:', error);
          return false;
        }
        const wait = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(res => setTimeout(res, wait));
      }
    }
    return false;
  }

  /**
   * Recupera lo stato di un'analisi dal database con cache
   */
  async getAnalysisStatus(analysisId: string): Promise<CVAnalysis | null> {
    try {
      // Usa cache per analisi completate (TTL più lungo)
      // Per analisi in corso, usa TTL più breve
      const cacheKey = CacheKeys.ANALYSIS_STATUS(analysisId);
      
      return await cacheService.getOrFetch(
        cacheKey,
        async () => {
          const { data, error } = await getSupabase()
            .from('cv_analyses')
            .select('*')
            .eq('id', analysisId)
            .single();

          if (error) {
            console.error('Error fetching analysis status:', error);
            return null;
          }

          return data;
        },
        // TTL dinamico: 30 secondi per analisi in corso, 5 minuti per completate
        this.getDynamicTTL(analysisId)
      );
    } catch (error) {
      console.error('Error fetching analysis status:', error);
      return null;
    }
  }

  /**
   * Determina TTL dinamico basato sullo stato dell'analisi
   */
  private async getDynamicTTL(analysisId: string): Promise<number> {
    const cached = cacheService.get<CVAnalysis>(CacheKeys.ANALYSIS_STATUS(analysisId));
    if (cached) {
      // Se l'analisi è completata, usa TTL lungo
      if (cached.status === 'completed' || cached.status === 'failed') {
        return 10 * 60 * 1000; // 10 minuti
      }
    }
    // Per analisi in corso, usa TTL breve
    return 30 * 1000; // 30 secondi
  }

  /**
   * Gestisce l'intero processo di analisi con la nuova logica dei crediti
   */
  async processAnalysis(request: {
    cvFile: File;
    jobDescription: string;
    userId: string;
    uploadedFile?: UploadedFileInfo | null;
  }): Promise<AnalysisResult> {
    try {
      // 1. Se esiste già un'analisi in PROCESSING per stesso utente+file, riutilizzala
      const { data: existingPending } = await getSupabase()
        .from('cv_analyses')
        .select('*')
        .eq('user_id', request.userId)
        .eq('file_name', request.cvFile.name)
        .eq('status', 'processing')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPending) {
        return {
          ...existingPending,
          success: true,
          analysisId: existingPending.id,
          analysisType: existingPending.analysis_type === 'limited' ? 'free' : 'paid'
        } as unknown as AnalysisResult;
      }

      // 2. Verifica eligibilità per l'analisi
      const eligibility = await creditService.checkAnalysisEligibility(request.userId);
      
      if (!eligibility.canAnalyze) {
        return {
          success: false,
          error: eligibility.reason || 'Analisi non disponibile',
          analysisType: eligibility.analysisType
        };
      }

      // 3. Genera ID univoco per l'analisi
      const analysisId = crypto.randomUUID();
      
      // 4. Determina il tipo di scansione basato sul tipo di analisi
      const scanType = eligibility.analysisType === 'free' ? 'limitata' : 'completa';
      
      // 5. Crea il record dell'analisi nel database
      const analysisData: CVAnalysisInsert = {
        id: analysisId,
        user_id: request.userId,
        file_name: request.cvFile.name,
        file_size: request.cvFile.size,
        job_description: this.formatJobDescription(request.jobDescription),
        analysis_type: eligibility.analysisType === 'free' ? 'limited' : 'complete',
        status: 'processing',
        can_upgrade: eligibility.analysisType === 'free',
        file_path: request.uploadedFile?.filePath ?? null,
        file_url: request.uploadedFile?.publicUrl ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const createdAnalysis = await this.createAnalysis(analysisData);
      if (!createdAnalysis) {
        return {
          success: false,
          error: 'Errore nella creazione dell\'analisi',
          analysisType: eligibility.analysisType
        };
      }

      // 6. Invia l'analisi al servizio di elaborazione
      const submissionRequest: AnalysisRequest = {
        file: request.cvFile,
        job_description: request.jobDescription,
        analysis_id: analysisId,
        user_id: request.userId,
        file_name: request.cvFile.name,
        scan_type: scanType,
        analysisType: eligibility.analysisType === 'free' ? 'free' : 'premium'
      };

      const submitted = await this.submitAnalysis(submissionRequest);
      if (!submitted) {
        return {
          success: false,
          error: 'Errore nell\'invio dell\'analisi',
          analysisType: eligibility.analysisType
        };
      }

      // 7. Non detrarre crediti all'avvio. La detrazione avverrà solo al completamento.

      return {
        success: true,
        analysisId: analysisId,
        analysisType: eligibility.analysisType
      };

    } catch (error) {
      console.error('Errore nel processo di analisi:', error);
      return {
        success: false,
        error: 'Errore interno nel processo di analisi',
        analysisType: 'free'
      };
    }
  }

  /**
   * Crea una nuova analisi nel database
   */
  async createAnalysis(analysis: CVAnalysisInsert): Promise<CVAnalysis | null> {
    try {
      const { data, error } = await getSupabase()
        .from('cv_analyses')
        .insert(analysis)
        .select()
        .single();

      if (error) {
        console.error('Error creating analysis:', error);
        return null;
      }

      // Invalida cache delle liste utente
      if (data && analysis.user_id) {
        cacheService.invalidatePattern(`analyses:user:${analysis.user_id}`);
        cacheService.invalidatePattern(`dashboard:.*:${analysis.user_id}`);
      }

      return data;
    } catch (error) {
      console.error('Error creating analysis:', error);
      return null;
    }
  }

  /**
   * Aggiorna un'analisi esistente
   */
  async updateAnalysis(analysisId: string, updates: CVAnalysisUpdate): Promise<CVAnalysis | null> {
    try {
      const { data, error } = await getSupabase()
        .from('cv_analyses')
        .update(updates)
        .eq('id', analysisId)
        .select()
        .single();

      if (error) {
        console.error('Error updating analysis:', error);
        return null;
      }

      // Invalida cache correlate
      if (data) {
        cacheService.delete(CacheKeys.ANALYSIS(analysisId));
        cacheService.delete(CacheKeys.ANALYSIS_STATUS(analysisId));
        cacheService.invalidatePattern(`analyses:user:${data.user_id}`);
        cacheService.invalidatePattern(`dashboard:.*:${data.user_id}`);
      }

      return data;
    } catch (error) {
      console.error('Error updating analysis:', error);
      return null;
    }
  }

  /**
   * Aggiorna un'analisi con i risultati delle keyword
   */
  async updateAnalysisWithKeywords(
    analysisId: string,
    keywordAnalysis: KeywordAnalysisResult
  ): Promise<CVAnalysis | null> {
    try {
      const updates: CVAnalysisUpdate = {
        keywords_found: keywordAnalysis.keywordsFound,
        keywords_missing: keywordAnalysis.keywordsMissing,
        updated_at: new Date().toISOString()
      };

      return await this.updateAnalysis(analysisId, updates);
    } catch (error) {
      console.error('Error updating analysis with keywords:', error);
      return null;
    }
  }

  /**
   * Processa le keyword per un'analisi completata
   */
  async processKeywordsForAnalysis(
    analysisId: string,
    cvText?: string
  ): Promise<KeywordAnalysisResult | null> {
    try {
      // Recupera l'analisi esistente
      const analysis = await this.getAnalysisById(analysisId);
      if (!analysis) {
        console.error('Analysis not found for keyword processing:', analysisId);
        return null;
      }

      // Se non abbiamo il testo del CV, prova a recuperarlo dai risultati
      let extractedText = cvText;
      if (!extractedText && analysis.results) {
        // Cerca il testo estratto nei risultati dell'analisi
        extractedText = this.extractTextFromAnalysisResults(analysis.results);
      }

      if (!extractedText) {
        console.warn('No CV text available for keyword analysis:', analysisId);
        return null;
      }

      // Analizza le keyword
      const keywordAnalysis = keywordAnalysisService.analyzeKeywords(
        extractedText,
        analysis.job_description || '',
        {
          minLength: 2,
          excludeCommonWords: true,
          caseSensitive: false,
          includePartialMatches: true
        }
      );

      // Aggiorna l'analisi con i risultati delle keyword
      const updatedAnalysis = await this.updateAnalysisWithKeywords(
        analysisId,
        keywordAnalysis
      );

      if (updatedAnalysis) {
        console.log('Successfully processed keywords for analysis:', analysisId);
        return keywordAnalysis;
      }

      return null;
    } catch (error) {
      console.error('Error processing keywords for analysis:', error);
      return null;
    }
  }

  /**
   * Estrae il testo del CV dai risultati dell'analisi
   */
  private extractTextFromAnalysisResults(results: any): string | null {
    try {
      // Cerca il testo in vari formati possibili nei risultati
      if (typeof results === 'string') {
        return results;
      }

      if (typeof results === 'object' && results !== null) {
        // Cerca campi comuni che potrebbero contenere il testo del CV
        const textFields = ['cv_text', 'extracted_text', 'content', 'text', 'raw_text'];
        
        for (const field of textFields) {
          if (results[field] && typeof results[field] === 'string') {
            return results[field];
          }
        }

        // Se è un oggetto complesso, cerca ricorsivamente
        const visited = new WeakSet();
        const candidates: string[] = [];
        
        const searchInObject = (obj: any): void => {
          // Evita cicli infiniti
          if (obj === null || typeof obj !== 'object') return;
          if (visited.has(obj)) return;
          visited.add(obj);
          
          // Gestisce array iterando gli elementi
          if (Array.isArray(obj)) {
            for (const item of obj) {
              if (typeof item === 'string' && item.length > 100) {
                candidates.push(item);
              } else if (typeof item === 'object' && item !== null) {
                searchInObject(item);
              }
            }
          } else {
            // Gestisce oggetti normali
            for (const key in obj) {
              if (typeof obj[key] === 'string' && obj[key].length > 100) {
                candidates.push(obj[key]);
              } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                searchInObject(obj[key]);
              }
            }
          }
        };

        searchInObject(results);
        
        // Restituisce il candidato più lungo, o null se nessuno
        return candidates.length > 0 
          ? candidates.reduce((longest, current) => 
              current.length > longest.length ? current : longest
            )
          : null;
      }

      return null;
    } catch (error) {
      console.error('Error extracting text from analysis results:', error);
      return null;
    }
  }

  /**
   * Recupera un'analisi per ID
   */
  async getAnalysisById(analysisId: string): Promise<CVAnalysis | null> {
    try {
      const { data, error } = await getSupabase()
        .from('cv_analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (error) {
        console.error('Error fetching analysis by id:', error);
        return null;
      }

      return data as unknown as CVAnalysis;
    } catch (error) {
      console.error('Unhandled error in getAnalysisById:', error);
      return null;
    }
  }

  /**
   * Recupera tutte le analisi di un utente con cache
   */
  async getUserAnalyses(userId: string, limit = 10, offset = 0): Promise<CVAnalysis[]> {
    try {
      const cacheKey = `${CacheKeys.ANALYSIS_LIST(userId)}:${limit}:${offset}`;
      
      return await cacheService.getOrFetch(
        cacheKey,
        async () => {
          const { data, error } = await getSupabase()
            .from('cv_analyses')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (error) {
            console.error('Error fetching user analyses:', error);
            return [];
          }

          return data || [];
        },
        2 * 60 * 1000 // 2 minuti TTL per liste
      );
    } catch (error) {
      console.error('Error fetching user analyses:', error);
      return [];
    }
  }

  /**
   * Elimina un'analisi
   */
  async deleteAnalysis(analysisId: string): Promise<boolean> {
    try {
      // Prima recupera l'analisi per ottenere l'user_id
      const analysis = await this.getAnalysisStatus(analysisId);
      
      const { error } = await getSupabase()
        .from('cv_analyses')
        .delete()
        .eq('id', analysisId);

      if (error) {
        console.error('Error deleting analysis:', error);
        return false;
      }

      // Invalida tutte le cache correlate
      cacheService.delete(CacheKeys.ANALYSIS(analysisId));
      cacheService.delete(CacheKeys.ANALYSIS_STATUS(analysisId));
      
      if (analysis?.user_id) {
        cacheService.invalidatePattern(`analyses:user:${analysis.user_id}`);
        cacheService.invalidatePattern(`dashboard:.*:${analysis.user_id}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting analysis:', error);
      return false;
    }
  }

  /**
   * Converte un file in base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Rimuove il prefisso "data:application/pdf;base64,"
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Valida se un file è un PDF valido
   *
   * Nota: su alcuni browser/sistemi operativi (es. Windows, drag & drop) il MIME type può essere vuoto
   * o usare varianti non standard. Usiamo quindi un controllo più permissivo basato anche sull'estensione.
   */
  validatePdfFile(file: File): { isValid: boolean; error?: string } {
    return attachmentService.validatePdfFile(file);
  }

  /**
   * Determina il tipo di scansione basato sullo stato dell'utente
   */
  determineScanType(subscriptionStatus: string): 'limitata' | 'completa' {
    return subscriptionStatus === 'active' ? 'completa' : 'limitata';
  }

  /**
   * Formatta la job description per l'invio
   */
  formatJobDescription(jobDescription: string): string {
    if (!jobDescription || jobDescription.trim() === '') {
      return 'la job_description non è stata inserita, procedere all\'analisi generale senza la job_description';
    }
    return jobDescription.trim();
  }

  /**
   * Avvia il monitoraggio automatico dei timeout
   */
  async startTimeoutMonitoring(intervalMinutes?: number) {
    const interval = intervalMinutes ?? 2;
    if (this.timeoutMonitoringInterval) {
      if (import.meta.env.DEV) {
        console.log('⚠️ Monitoraggio timeout già attivo');
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.log(`🕐 Avvio monitoraggio timeout analisi ogni ${interval} minuti`);
    }
    const { timeoutService } = await import('./timeoutService');
    this.timeoutMonitoringInterval = timeoutService.startTimeoutMonitoring(interval);
  }

  /**
   * Ferma il monitoraggio automatico dei timeout
   */
  async stopTimeoutMonitoring() {
    if (this.timeoutMonitoringInterval) {
      const { timeoutService } = await import('./timeoutService');
      timeoutService.stopTimeoutMonitoring(this.timeoutMonitoringInterval);
      this.timeoutMonitoringInterval = null;
      if (import.meta.env.DEV) {
        console.log('🛑 Monitoraggio timeout fermato');
      }
    }
  }

  /**
   * Gestisce manualmente i timeout delle analisi
   */
  async handleTimeouts() {
    const { timeoutService } = await import('./timeoutService');
    return await timeoutService.handleTimeoutAnalyses();
  }

  /**
   * Controlla se un'analisi specifica è scaduta
   */
  async isAnalysisTimedOut(analysisId: string): Promise<boolean> {
    const { timeoutService } = await import('./timeoutService');
    return await timeoutService.isAnalysisTimedOut(analysisId);
  }

  /**
   * Forza il timeout di un'analisi specifica
   */
  async forceTimeoutAnalysis(analysisId: string) {
    const { timeoutService } = await import('./timeoutService');
    return await timeoutService.forceTimeoutAnalysis(analysisId);
  }
}

export const analysisService = new AnalysisService();

// Avvia automaticamente il monitoraggio timeout
if (typeof window !== 'undefined') {
  // Avvia dopo 30 secondi per permettere l'inizializzazione completa
  setTimeout(async () => {
    await analysisService.startTimeoutMonitoring(2); // Ogni 2 minuti
    if (import.meta.env.DEV) {
      console.log('🔄 Monitoraggio timeout avviato automaticamente');
    }
  }, 30000);
}

export default analysisService;