import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Loading from '../components/ui/Loading';
import ErrorFallback from '../components/ErrorFallback';
import EnhancedAnalysisResults from '../components/cv-analysis/EnhancedAnalysisResults';
import { analysisService } from '../services/analysisService';
import type { CVAnalysis } from '../types';

const AnalysisDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await analysisService.getAnalysisById(id);
      if (!data) {
        setError('Analisi non trovata');
      } else {
        setAnalysis(data);
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
        <EnhancedAnalysisResults
          analysis={analysis}
          onNewAnalysis={() => navigate('/analisi')}
          onUpgrade={() => navigate('/pricing')}
        />
      </div>
    </div>
  );
};

export default AnalysisDetailPage;


