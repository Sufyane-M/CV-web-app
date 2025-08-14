import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/ui/Loading';
import RecentAnalysesList from '../components/dashboard/RecentAnalysesList';
import { analysisService } from '../services/analysisService';
import type { CVAnalysis } from '../types';

const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<CVAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAnalyses = async () => {
      if (!user) return;
      setIsLoading(true);
      setError(null);
      try {
        const list = await analysisService.getUserAnalyses(user.id, 50, 0);
        if (isMounted) {
          setAnalyses(list);
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message || 'Errore durante il caricamento della cronologia');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAnalyses();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  if (isLoading) {
    return <Loading fullScreen text="Caricamento cronologia..." />;
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cronologia Analisi</h1>
          <p className="text-gray-600 dark:text-gray-400">Consulta e riapri i risultati delle analisi passate.</p>
        </div>
        <RecentAnalysesList analyses={analyses} />
      </div>
    </div>
  );
};

export default HistoryPage;


