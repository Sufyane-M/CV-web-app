import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Loading from '../components/ui/Loading';
import ErrorFallback from '../components/ErrorFallback';
import EnhancedAnalysisResults from '../components/cv-analysis/EnhancedAnalysisResults';
import { analysisService } from '../services/analysisService';
import type { CVAnalysis } from '../types/index';
import { creditService } from '../services/creditService';
import { useAuth } from '../contexts/AuthContext';

const AnalysisDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isInvalidAnalysisResult = (a: CVAnalysis | null | undefined): boolean => {
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
  };

  const loadAnalysis = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await analysisService.getAnalysisById(id);
      if (!data) {
        setError('Analisi non trovata');
      } else {
        if (isInvalidAnalysisResult(data)) {
          setError('Analisi non riuscita: il risultato non contiene dati validi.');
          setAnalysis(data);
        } else {
          setAnalysis(data);
          // Fallback: se è un'analisi gratuita completata e non ancora consumata, consuma ora
          try {
            if (user && data.status === 'completed' && data.analysis_type === 'limited') {
              const res = await creditService.consumeFreeAnalysis(user.id);
              if (!res.success && import.meta.env.DEV) {
                console.warn('Consumo free analysis (detail page) non riuscito:', res.error);
              }
              await refreshProfile();
            }
          } catch (err) {
            if (import.meta.env.DEV) {
              console.warn('Errore consumo free analysis (detail page):', err);
            }
          }
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Errore durante il caricamento dell’analisi');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  if (isLoading) return <Loading fullScreen text="Caricamento analisi..." />;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ErrorFallback
          error={error}
          onRetry={loadAnalysis}
          showHomeButton={true}
          title="Analisi non disponibile"
          description="Non è stato possibile caricare i dettagli dell’analisi selezionata."
        />
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {isInvalidAnalysisResult(analysis) ? (
          <ErrorFallback
            error={'Analisi non riuscita: il risultato non contiene dati validi.'}
            onRetry={loadAnalysis}
            showHomeButton={true}
            title="Analisi non disponibile"
            description="Non è stato possibile mostrare i dettagli perché i risultati non contengono dati utili."
          />
        ) : (
          <EnhancedAnalysisResults
            analysis={analysis}
            onNewAnalysis={() => navigate('/analisi')}
            onUpgrade={() => navigate('/pricing')}
          />
        )}
      </div>
    </div>
  );
};

export default AnalysisDetailPage;


