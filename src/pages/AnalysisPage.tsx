import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Eye, EyeOff, CreditCard, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotificationMigration';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardContent, CardFooter } from '../components/ui/Card';
import HowItWorks from '../components/cv-analysis/HowItWorks';
import JobDescription from '../components/cv-analysis/JobDescription';
import AttachmentManager from '../components/attachments/AttachmentManager';
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
import InsufficientCreditsError from '../components/error/InsufficientCreditsError';
const EnhancedAnalysisResults = lazy(() => import('../components/cv-analysis/EnhancedAnalysisResults'));
import '../styles/enhanced-analysis.css';

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
    
  // State
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    step: 'upload',
    analysisId: null,
    error: null,
  });
  
  const [fileUpload, setFileUpload] = useState<FileUploadState>({
    file: null,
    isDragging: false,
    error: null,
  });
  const [uploadedInfo, setUploadedInfo] = useState<{ filePath: string; publicUrl?: string | null; signedUrl?: string | null } | null>(null);
  
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
    // Se i risultati sono nulli/incompleti, mostra errore e NON detrarre crediti
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
    // Detrazione credito al completamento (solo per analisi a pagamento), idempotente lato DB
    try {
      if (user && completedAnalysis.analysis_type !== 'limited') {
        const { data, error } = await db.profiles.deductOnCompletion(user.id, completedAnalysis.id);
        if (!error && data && data.length > 0) {
          const newCredits = (data[0] as any).new_credits;
          if (typeof newCredits === 'number') {
            showSuccess(`2 crediti detratti. Nuovo saldo: ${newCredits}`, { duration: 6000, dismissible: true });
          }
        }
      }
    } catch (err) {
      // Non bloccare l'esperienza utente; la funzione è idempotente e può essere ritentata
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

  // File upload handlers replaced by AttachmentManager

  const removeFile = () => {
    setFileUpload({
      file: null,
      isDragging: false,
      error: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Non aprire automaticamente il selettore dei file per evitare il doppio allegato
    // In caso serva, l’utente potrà cliccare manualmente su "Seleziona file".
  };

  // Analysis handlers
  const startAnalysis = async () => {
    if (!fileUpload.file || isUploading) {
      showError('Attendi il completamento del caricamento del file prima di iniziare l\'analisi.');
      return;
    }
    if (!user || !profile) {
      showError('Utente non valido o non autenticato');
      return;
    }

    // Validazione ulteriore lato client
    const validation = analysisService.validatePdfFile(fileUpload.file);
    if (!validation.isValid) {
      setFileUpload(prev => ({ ...prev, error: validation.error || 'File non valido' }));
      showError(validation.error || 'File non valido');
      return;
    }
    if (fileUpload.file.size === 0) {
      setFileUpload(prev => ({ ...prev, error: 'Il file è vuoto o non accessibile.' }));
      showError('Il file è vuoto o non accessibile.');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Utilizza il nuovo servizio di analisi con logica dei crediti
      const result: AnalysisResult = await analysisService.processAnalysis({
        cvFile: fileUpload.file,
        jobDescription: jobDescription,
        userId: user.id,
        uploadedFile: uploadedInfo,
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
    setJobDescription('');
  };



  const handleUpgrade = () => {
    navigate('/pricing');
  };

  // How it works (redesigned)
  const TutorialCard = () => (showTutorial ? <HowItWorks onClose={() => setShowTutorial(false)} /> : null);

  // New Attachment Manager
  const renderAttachmentManager = () => (
    <AttachmentManager
      userId={user?.id || ''}
      value={fileUpload.file}
      onChange={(file) => setFileUpload(prev => ({ ...prev, file, error: null }))}
      onUploaded={(info) => setUploadedInfo(info)}
      onError={(msg) => setFileUpload(prev => ({ ...prev, error: msg }))}
    />
  );

  // Job Description is rendered inline to preserve component identity and focus

  // Determina se l'analisi può essere avviata
  const canAnalyze = !!fileUpload.file && !isAnalyzing && !!user && !!profile;

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
      }, 10000);

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
              }`} title={isConnected ? 'Aggiornamenti in tempo reale attivi' : 'Connessione realtime non disponibile: attivo polling di backup'}>
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
                <div className="mb-6" aria-live="polite" aria-atomic="true">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2" aria-hidden="true">
                    <div
                      className="progress-bar bg-gradient-to-r from-primary-600 to-violet-600 h-2 rounded-full"
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

                {/* Informazione sulla durata */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Nota:</strong> L'analisi può richiedere diversi minuti. Rimani su questa pagina per vedere i risultati.
                  </p>
                </div>
              </div>

              {/* Right: Preview & context */}
              <div className="lg:col-span-2">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Dettagli file</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="truncate"><span className="font-medium">Nome:</span> {fileUpload.file?.name || '—'}</p>
                    {fileUpload.file && (
                      <p><span className="font-medium">Dimensione:</span> {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    )}
                  </div>
                </div>

                {jobDescription && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Descrizione lavoro</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">{jobDescription}</p>
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

        {analysisState.step === 'upload' && (
          <div className="space-y-8">
            <TutorialCard />
            
            {/* File Upload Section with Enhanced Spacing */}
            <div className="mb-10">
              {renderAttachmentManager()}
            </div>
            
            {/* Job Description Section with Proper Spacing */}
            <div className="mb-8">
              <JobDescription value={jobDescription} onChange={setJobDescription} />
            </div>
            
            {/* Analysis Button Section with Clear Separation */}
            <div className="mt-10 mb-6">
              <EnhancedAnalysisButton
                onStartAnalysis={startAnalysis}
                canAnalyze={canAnalyze}
                isAnalyzing={isAnalyzing}
                hasFile={!!fileUpload.file}
              />
            </div>
          </div>
        )}

        {analysisState.step === 'processing' && <ProcessingCard />}

        {analysisState.step === 'error' && (
          <div className="max-w-4xl mx-auto p-6">
            {analysisState.error?.toLowerCase().includes('crediti insufficienti') ? (
              <InsufficientCreditsError
                onRetry={resetAnalysis}
                creditsAvailable={profile?.credits || 0}
                creditsRequired={2}
              />
            ) : (
              <ErrorFallback
                error={analysisState.error || 'Errore sconosciuto nell\'analisi'}
                onRetry={resetAnalysis}
                showHomeButton={false}
                title="Errore nell'Analisi"
                description="Si è verificato un problema durante l'analisi del tuo CV."
              />
            )}
          </div>
        )}

        {analysisState.step === 'results' && analysis && (
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Caricamento risultati...</p>
              </div>
            </div>
          }>
            <EnhancedAnalysisResults 
              analysis={analysis} 
              onNewAnalysis={resetAnalysis}
              onUpgrade={handleUpgrade}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};



export default AnalysisPage;