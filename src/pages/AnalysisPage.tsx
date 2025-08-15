import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Eye, EyeOff, CreditCard, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotificationMigration';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardContent, CardFooter } from '../components/ui/Card';
import HowItWorks from '../components/cv-analysis/HowItWorks';
import JobDescription from '../components/cv-analysis/JobDescription';
import PDFUploader from '../components/cv-analysis/PDFUploader';
import EnhancedAnalysisButton from '../components/cv-analysis/EnhancedAnalysisButton';
import Badge from '../components/ui/Badge';
import Loading from '../components/ui/Loading';
import { db, utils } from '../services/supabase';
import { analysisService } from '../services/analysisService';
import type { AnalysisResult } from '../services/analysisService';
import { creditService } from '../services/creditService';
import { useRealtimeAnalysis } from '../hooks/useRealtimeAnalysis';
import type { CVAnalysis, UserProfile } from '../types/index';
import { formatDate } from '../utils/formatters';
import ErrorFallback from '../components/ErrorFallback';
import EnhancedAnalysisResults from '../components/cv-analysis/EnhancedAnalysisResults';
import '../styles/enhanced-analysis.css';
import { useAnalysisDraft } from '../contexts/AnalysisDraftContext';

// Types
interface AnalysisState {
  step: 'upload' | 'processing' | 'results' | 'error';
  analysisId: string | null;
  error: string | null;
}

interface FileUploadState {
  file: File | null;
  isDragging: boolean;
  error: string | null;
}

const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { showSuccess, showError, showInfo } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ref per debouncing del file selection
  // const fileSelectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // const isFileSelectionInProgressRef = useRef<boolean>(false);
  // Ref per garantire idempotenza della detrazione crediti lato client (evita doppie detrazioni in caso di eventi duplicati)
  const deductedAnalysisIdsRef = useRef<Set<string>>(new Set());
  
  // State
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    step: 'upload',
    analysisId: null,
    error: null,
  });
  
  const { draftData, setFile: setDraftFile, setJobDescription } = useAnalysisDraft();
  // const [isDragging, setIsDragging] = useState(false);
  // const [fileError, setFileError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // const [isUploading, setIsUploading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Valida risultati analisi: se quasi tutto è null/vuoto, consideriamo errore
  const isInvalidAnalysisResult = useCallback((a: CVAnalysis | null | undefined): boolean => {
    if (!a) return true;
    const execNull = a.executive_summary == null || a.executive_summary === '';
    const overallNull = a.overall_score == null;
    const contentNull = a.content_score == null;
    const designNull = a.design_score == null;
    const sugg: any = a.suggestions as any;
    const suggestionsEmpty = (
      sugg == null ||
      (Array.isArray(sugg) && sugg.length === 0) ||
      (
        typeof sugg === 'object' && !Array.isArray(sugg) &&
        (
          (!Array.isArray(sugg?.critical) || sugg.critical.length === 0) &&
          (!Array.isArray(sugg?.warnings) || sugg.warnings.length === 0) &&
          (!Array.isArray(sugg?.successes) || sugg.successes.length === 0)
        )
      )
    );
    return execNull && overallNull && contentNull && designNull && suggestionsEmpty;
  }, []);

  // Hook realtime per l'analisi
  const handleRealtimeComplete = useCallback(async (completedAnalysis: CVAnalysis) => {
    // Se i risultati sono nulli/incompleti, mostra errore e NON dettarre crediti
    if (isInvalidAnalysisResult(completedAnalysis)) {
      setAnalysis(completedAnalysis);
      setAnalysisState(prev => ({
        step: 'error',
        analysisId: completedAnalysis.id,
        error: 'Analisi non riuscita: il risultato non contiene dati validi. Nessun credito è stato detratto.',
      }));
      showError('Analisi non riuscita: risultati incompleti. Nessun credito detratto.');
      await refreshProfile();
      return;
    }

    setAnalysis(completedAnalysis);
    setAnalysisState(prev => ({
      step: 'results',
      analysisId: completedAnalysis.id,
      error: null,
    }));
    // Consumo analisi gratuita al completamento valido
    try {
      if (user && completedAnalysis.analysis_type === 'limited') {
        const res = await creditService.consumeFreeAnalysis(user.id);
        if (!res.success && import.meta.env.DEV) {
          console.warn('Consumo analisi gratuita non riuscito:', res.error);
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('Errore nel consumo dell\'analisi gratuita:', err);
      }
    }
    // Detrazione credito al completamento (solo per analisi a pagamento), ora atomica lato client (-2) con guardia idempotente
    try {
      if (user && completedAnalysis.analysis_type !== 'limited') {
        // Evita doppie detrazioni se il callback viene invocato più volte per la stessa analisi
        if (deductedAnalysisIdsRef.current.has(completedAnalysis.id)) {
          console.warn('Detrazione già effettuata per questa analisi, skip.');
        } else {
          const res = await utils.deductCreditWithTransaction(
            user.id,
            completedAnalysis.id,
            'Analisi CV a pagamento'
          );
          if (res.success) {
            deductedAnalysisIdsRef.current.add(completedAnalysis.id);
            showSuccess('2 crediti detratti.', { duration: 6000, dismissible: true });
          } else if (import.meta.env.DEV) {
            console.warn('Detrazione crediti fallita:', res.error);
          }
        }
      }
    } catch (err) {
      // Non bloccare l'esperienza utente; la funzione può essere ritentata
      console.warn('Detrazione credito al completamento non riuscita:', err);
    }
    await refreshProfile();
    showSuccess('Analisi completata con successo!', { duration: 5000, dismissible: true });
  }, [refreshProfile, showSuccess, showError, user, isInvalidAnalysisResult]);

  const handleRealtimeError = useCallback((errorMsg: string) => {
    setAnalysisState(prev => ({
      step: 'error',
      analysisId: prev.analysisId,
      error: errorMsg,
    }));
    showError(errorMsg);
  }, [showError]);

  const {
    analysis: realtimeAnalysis,
    isLoading: isRealtimeLoading,
    error: realtimeError,
    refetch: refetchAnalysis,
    isConnected
  } = useRealtimeAnalysis({
    analysisId: analysisState.analysisId || '',
    onComplete: handleRealtimeComplete,
    onError: handleRealtimeError,
    enablePollingFallback: true,
    pollingInterval: 3000
  });

  // Sincronizza l'analisi realtime con lo stato locale
  useEffect(() => {
    if (realtimeAnalysis && realtimeAnalysis.status === 'completed') {
      setAnalysis(realtimeAnalysis);
      if (isInvalidAnalysisResult(realtimeAnalysis)) {
        setAnalysisState(prev => {
          if (prev.step === 'error') return prev;
          return {
            ...prev,
            step: 'error',
            analysisId: realtimeAnalysis.id,
            error: 'Analisi non riuscita: il risultato non contiene dati validi.',
          };
        });
        if (analysisState.step !== 'error') {
          showError('Analisi non riuscita: risultati incompleti.');
        }
      } else {
        setAnalysisState(prev => (
          prev.step === 'results'
            ? prev
            : {
                ...prev,
                step: 'results',
                analysisId: realtimeAnalysis.id,
                error: null,
              }
        ));
      }
    }
  }, [realtimeAnalysis, isInvalidAnalysisResult, showError, analysisState.step]);

  // File upload handlers (rimossi: gestiti internamente da PDFUploader)
  // const handleDragOver = (e: React.DragEvent) => { /* removed */ };
  // const handleDragLeave = (e: React.DragEvent) => { /* removed */ };
  // const _deprecatedHandleDrop = (e: React.DragEvent) => { /* removed */ };
  // const _deprecatedHandleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* removed */ };
  // const handleFileSelection = useCallback(async (file: File) => { /* removed */ }, []);
  // const handleFileInputChangeDebounced = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { /* removed */ }, []);
  // const handleDropDebounced = useCallback((e: React.DragEvent) => { /* removed */ }, []);
  
  // Cleanup timeout al dismount (rimosso)
  // useEffect(() => { return () => { if (fileSelectionTimeoutRef.current) { clearTimeout(fileSelectionTimeoutRef.current); } }; }, []);

  const removeFile = () => {
    setDraftFile(null);
    // setIsDragging(false);
    // setFileError(null);
    // if (fileInputRef.current) {
    //   fileInputRef.current.value = '';
    // }
  };

  // Analysis handlers
  const startAnalysis = async () => {
    if (!draftData.file) {
      showError('Seleziona un file prima di iniziare l\'analisi.');
      return;
    }
    if (!user || !profile) {
      showError('Utente non valido o non autenticato');
      return;
    }

    // Validazione ulteriore lato client
    const validation = analysisService.validatePdfFile(draftData.file);
    if (!validation.isValid) {
      // setFileError(validation.error || 'File non valido');
      showError(validation.error || 'File non valido');
      return;
    }
    if (draftData.file.size === 0) {
      // setFileError('Il file è vuoto o non accessibile.');
      showError('Il file è vuoto o non accessibile.');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Utilizza il nuovo servizio di analisi con logica dei crediti
      const result: AnalysisResult = await analysisService.processAnalysis({
        cvFile: draftData.file,
        jobDescription: draftData.jobDescription,
        userId: user.id
      });
      
      if (result.success && result.analysisId) {
        // Messaggio informativo di avvio (nessuna detrazione all'avvio)
        if (result.analysisType === 'free') {
          showSuccess('Analisi gratuita avviata.');
        } else {
          showInfo('Analisi a pagamento avviata: il credito sarà detratto solo al completamento.');
        }
        
        // Aggiorna il profilo per riflettere i cambiamenti
        await refreshProfile();
        
        // Avvia il monitoraggio realtime
        setAnalysisState({
          step: 'processing',
          analysisId: result.analysisId,
          error: null,
        });
      } else {
        // Gestisci errori specifici
        const errorMessage = result.error || 'Errore durante l\'avvio dell\'analisi';
        
        setAnalysisState({
          step: 'error',
          analysisId: null,
          error: errorMessage,
        });
        
        showError(errorMessage);
      }
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Errore durante l\'analisi:', error);
      }
      setAnalysisState({
        step: 'error',
        analysisId: null,
        error: 'Errore interno durante l\'analisi',
      });
      showError('Errore interno durante l\'analisi del CV');
    } finally {
      setIsAnalyzing(false);
    }
  };





  const resetAnalysis = () => {
    setAnalysisState({
      step: 'upload',
      analysisId: null,
      error: null,
    });
    setAnalysis(null);
    // Non rimuovere il file automaticamente: manteniamo l’allegato per evitare un secondo caricamento
    // removeFile();
    // Non cancellare la job description per mantenere la bozza persistente
  };



  const handleUpgrade = () => {
    navigate('/pricing');
  };

  // How it works (redesigned)
  const TutorialCard = () => (showTutorial ? <HowItWorks onClose={() => setShowTutorial(false)} /> : null);

  // File Upload Component (ora esterno)
  const renderFileUploadCard = () => (
    <PDFUploader
      file={draftData.file}
      error={null}
      onFileSelect={(file) => {
        setDraftFile(file);
        showSuccess('File caricato con successo!');
      }}
      onRemoveFile={removeFile}
      className="mb-6"
    />
  );

  // Job Description is rendered inline to preserve component identity and focus

  // Determina se l'analisi può essere avviata
  const canAnalyze = !!draftData.file && !isAnalyzing && !!user && !!profile;

  // Processing Component
  const ProcessingCard = () => {
    const steps = [
      'Caricamento del file',
      'Estrazione testo e dati',
      'Analisi contenuti e keywords',
      'Valutazione design e leggibilità',
      'Generazione risultati e suggerimenti'
    ];

    const [stepIndex, setStepIndex] = useState(0);
    const startTimeRef = useRef<number>(Date.now());
    const [elapsedLabel, setElapsedLabel] = useState('0:00');

    useEffect(() => {
      setStepIndex(0);
      startTimeRef.current = Date.now();

      const stepIv = setInterval(() => {
        setStepIndex((prev) => (prev + 1) % steps.length);
      }, 5000);

      const timeIv = setInterval(() => {
        const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const m = Math.floor(sec / 60).toString();
        const s = (sec % 60).toString().padStart(2, '0');
        setElapsedLabel(`${m}:${s}`);
      }, 1000);

      return () => {
        clearInterval(stepIv);
        clearInterval(timeIv);
      };
    }, []);

    const progress = Math.min(95, Math.round(((stepIndex + 1) / (steps.length + 1)) * 100));
    const showTips = ((): boolean => {
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      return sec > 8;
    })();

    return (
      <div className="relative">
        {/* Top banner */}
        <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
          <div className="gradient-animated bg-[linear-gradient(90deg,#3b82f6,#8b5cf6,#3b82f6)] p-4 sm:p-5">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">Analisi in corso...</h2>
                  <p className="text-white/80 text-sm">Tempo trascorso: {elapsedLabel}</p>
                </div>
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm ${
                isConnected ? 'text-emerald-100' : 'text-yellow-100'
              }`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  isConnected ? 'bg-emerald-300 animate-pulse' : 'bg-yellow-300'
                }`} />
                {isConnected ? 'Realtime attiva' : 'Polling di backup'}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left: Animated progress and steps */}
              <div className="lg:col-span-3">
                <div className="mb-6">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progress}%` }}
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      role="progressbar"
                    />
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {realtimeAnalysis?.status === 'processing'
                      ? `Fase: ${steps[stepIndex]}`
                      : 'Analizzando contenuto, struttura e compatibilità ATS...'}
                  </div>
                </div>

                <ul className="space-y-3" aria-label="Fasi dell'analisi">
                  {steps.map((label, idx) => {
                    const active = idx === stepIndex;
                    return (
                      <li
                        key={label}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          active
                            ? 'border-primary-200 dark:border-primary-900/40 bg-primary-50/60 dark:bg-primary-900/10'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                        aria-current={active ? 'step' : undefined}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            active ? 'bg-primary-600 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        />
                        <span className={`text-sm ${active ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {realtimeError && (
                  <div className="mt-6 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">⚠️ {realtimeError}</p>
                  </div>
                )}
              </div>

              {/* Right: Preview & context */}
              <div className="lg:col-span-2">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Dettagli file</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="truncate"><span className="font-medium">Nome:</span> {draftData.file?.name || '—'}</p>
                    {draftData.file && (
                      <p><span className="font-medium">Dimensione:</span> {(draftData.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    )}
                  </div>
                </div>

                {draftData.jobDescription && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Descrizione lavoro</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">{draftData.jobDescription}</p>
                  </div>
                )}
                {showTips && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Suggerimento: per risultati migliori, assicurati che il tuo CV sia leggibile e ben strutturato. Evita immagini di testo e privilegia PDF esportati dal tuo editor.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Error UI gestita da ErrorFallback nel render principale

  // Main render
  if (!user || !profile) {
    return <Loading fullScreen text="Caricamento..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Analisi CV con AI
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Carica il tuo CV e ricevi un'analisi dettagliata con suggerimenti personalizzati
          </p>
        </div>

        {analysisState.step === 'upload' && (
          <>
            <TutorialCard />
            {renderFileUploadCard()}
            <JobDescription value={draftData.jobDescription} onChange={setJobDescription} />
            <EnhancedAnalysisButton
              onStartAnalysis={startAnalysis}
              canAnalyze={canAnalyze}
              isAnalyzing={isAnalyzing}
              hasFile={!!draftData.file}
            />
          </>
        )}

        {analysisState.step === 'processing' && <ProcessingCard />}

        {analysisState.step === 'error' && (
          <div className="max-w-4xl mx-auto p-6">
            <ErrorFallback
              error={analysisState.error || 'Errore sconosciuto nell\'analisi'}
              onRetry={resetAnalysis}
              showHomeButton={false}
              title="Errore nell'Analisi"
              description="Si è verificato un problema durante l'analisi del tuo CV."
            />
          </div>
        )}

        {analysisState.step === 'results' && analysis && (
          <EnhancedAnalysisResults 
            analysis={analysis} 
            onNewAnalysis={resetAnalysis}
            onUpgrade={handleUpgrade}
          />
        )}
      </div>
    </div>
  );
};



export default AnalysisPage;