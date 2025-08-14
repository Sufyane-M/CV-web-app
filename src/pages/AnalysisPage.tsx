import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, RotateCcw, Eye, EyeOff, CreditCard, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotificationMigration';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardContent, CardFooter } from '../components/ui/Card';
import HowItWorks from '../components/cv-analysis/HowItWorks';
import JobDescription from '../components/cv-analysis/JobDescription';
import FileUploadCard from '../components/cv-analysis/FileUploadCard';
import EnhancedAnalysisButton from '../components/cv-analysis/EnhancedAnalysisButton';
import Badge from '../components/ui/Badge';
import Loading from '../components/ui/Loading';
import { db, utils } from '../services/supabase';
import { analysisService } from '../services/analysisService';
import { creditService } from '../services/creditService';
import { useRealtimeAnalysis } from '../hooks/useRealtimeAnalysis';
import type { CVAnalysis, UserProfile } from '../types';
import { formatDate } from '../utils/formatters';
import ErrorFallback from '../components/ErrorFallback';
import EnhancedAnalysisResults from '../components/cv-analysis/EnhancedAnalysisResults';
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
  
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Hook realtime per l'analisi
  const handleRealtimeComplete = useCallback(async (completedAnalysis: CVAnalysis) => {
    setAnalysis(completedAnalysis);
    setAnalysisState(prev => ({
      step: 'results',
      analysisId: completedAnalysis.id,
      error: null,
    }));
    // Detrazione credito al completamento (solo per analisi a pagamento), idempotente lato DB
    try {
      if (user && completedAnalysis.analysis_type !== 'limited') {
        const { data, error } = await db.profiles.deductOnCompletion(user.id, completedAnalysis.id);
        if (!error && data && data.length > 0) {
          const newCredits = (data[0] as any).new_credits;
          if (typeof newCredits === 'number') {
            showSuccess(`1 credito detratto. Nuovo saldo: ${newCredits}`, { duration: 6000, dismissible: true });
          }
        }
      }
    } catch (err) {
      // Non bloccare l'esperienza utente; la funzione è idempotente e può essere ritentata
      console.warn('Detrazione credito al completamento non riuscita:', err);
    }
    await refreshProfile();
    showSuccess('Analisi completata con successo!', { duration: 5000, dismissible: true });
  }, [refreshProfile, showSuccess]);

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
  }, [realtimeAnalysis]);

  // File upload handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    } catch {}
    setFileUpload(prev => ({ ...prev, isDragging: true }));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileUpload(prev => ({ ...prev, isDragging: false }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileUpload(prev => ({ ...prev, isDragging: false }));
    
    const dt = e.dataTransfer;
    const fileList = Array.from(dt.files || []);
    let candidate: File | null = null;
    
    if (fileList.length > 0) {
      candidate = fileList[0];
    } else if (dt.items && dt.items.length > 0) {
      const itemFiles = Array.from(dt.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter((f): f is File => !!f);
      candidate = itemFiles[0] || null;
    }
    
    if (candidate) {
      handleFileSelection(candidate);
    } else {
      setFileUpload(prev => ({ ...prev, error: 'Nessun file rilevato. Trascina un file PDF o clicca per selezionarlo.' }));
      showError('Nessun file rilevato. Trascina un file PDF o clicca per selezionarlo.');
    }
    
    try {
      if (dt.items) dt.items.clear();
      dt.clearData();
    } catch {}
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    if (file) {
      handleFileSelection(file);
    } else {
      setFileUpload(prev => ({ ...prev, error: 'Selezione non valida. Scegli un file PDF.' }));
      showError('Selezione non valida. Scegli un file PDF.');
    }
    // Svuota il valore per permettere di riselezionare lo stesso file
    // e assicurare che il prossimo onChange scatti sempre
    e.currentTarget.value = '';
  };

  const handleFileSelection = async (file: File) => {
    setIsUploading(true);
    setFileUpload({
      file: null,
      isDragging: false,
      error: 'Caricamento in corso...',
    });

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 500;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Validate file
        const validation = analysisService.validatePdfFile(file);
        if (!validation.isValid) {
          throw new Error(validation.error || 'File non valido');
        }
        
        if (file.size === 0) {
          throw new Error('Il file è vuoto o non accessibile. Riprova selezionando un PDF valido.');
        }

        // Success
        setFileUpload({
          file,
          isDragging: false,
          error: null,
        });
        setIsUploading(false);
        showSuccess('File caricato con successo!');
        return;

      } catch (error: any) {
        if (attempt < MAX_RETRIES) {
          setFileUpload(prev => ({ ...prev, error: `Tentativo ${attempt} fallito. Riprovo...` }));
          await new Promise(res => setTimeout(res, RETRY_DELAY));
        } else {
          const errorMessage = error.message || 'Errore durante il caricamento del file.';
          setFileUpload({
            file: null,
            isDragging: false,
            error: errorMessage,
          });
          showError(errorMessage);
          setIsUploading(false);
        }
      }
    }
  };

  const removeFile = () => {
    setFileUpload({
      file: null,
      isDragging: false,
      error: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Reimposta il focus per permettere subito una nuova selezione
    fileInputRef.current?.click?.();
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
      const result = await analysisService.processAnalysis({
        cvFile: fileUpload.file,
        jobDescription: jobDescription,
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
    removeFile();
    setJobDescription('');
  };



  const handleUpgrade = () => {
    navigate('/pricing');
  };

  // How it works (redesigned)
  const TutorialCard = () => (showTutorial ? <HowItWorks onClose={() => setShowTutorial(false)} /> : null);

  // File Upload Component (ora esterno)
  const renderFileUploadCard = () => (
    <FileUploadCard
      file={fileUpload.file}
      isDragging={fileUpload.isDragging}
      error={fileUpload.error}
      onFileSelect={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onRemoveFile={removeFile}
      fileInputRef={fileInputRef}
      onFileInputChange={handleFileInputChange}
    />
  );

  // Job Description is rendered inline to preserve component identity and focus

  // Determina se l'analisi può essere avviata
  const canAnalyze = fileUpload.file && !isAnalyzing && user && profile;

  // Processing Component
  const ProcessingCard = () => {
    return (
      <div className="text-center py-12">
        <Loading size="lg" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-2">
          Analisi in corso...
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Stiamo analizzando il tuo CV con l'intelligenza artificiale.
          Questo processo può richiedere alcuni minuti.
        </p>
        
        {/* Indicatore connessione realtime */}
        <div className="mb-6">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
            }`}></div>
            {isConnected ? 'Connessione realtime attiva' : 'Fallback polling attivo'}
          </div>
        </div>
        
        <div className="max-w-md mx-auto">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
            <div className="bg-primary-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {realtimeAnalysis?.status === 'processing' 
              ? 'Elaborazione in corso...' 
              : 'Analizzando contenuto, struttura e compatibilità ATS...'}
          </p>
          
          {realtimeError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ {realtimeError}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Error Component
  const ErrorCard = () => {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <CardContent className="p-6 text-center">
          <X className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 dark:text-red-100 mb-2">
            Errore durante l'analisi
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-6">
            {analysisState.error || 'Si è verificato un errore imprevisto'}
          </p>
          <div className="space-x-4">
            <Button
              variant="outline"
              onClick={resetAnalysis}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Riprova
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
            >
              Torna alla Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

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
            <JobDescription value={jobDescription} onChange={setJobDescription} />
            <EnhancedAnalysisButton
              onStartAnalysis={startAnalysis}
              canAnalyze={canAnalyze}
              isAnalyzing={isAnalyzing}
              hasFile={!!fileUpload.file}
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