import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase } from '../services/supabase';
import type { CVAnalysis } from '../types/index';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeAnalysisOptions {
  analysisId: string;
  onStatusChange?: (status: CVAnalysis['status']) => void;
  onComplete?: (analysis: CVAnalysis) => void;
  onError?: (error: string) => void;
  enablePollingFallback?: boolean;
  pollingInterval?: number;
}

interface UseRealtimeAnalysisReturn {
  analysis: CVAnalysis | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isConnected: boolean;
}

export function useRealtimeAnalysis({
  analysisId,
  onStatusChange,
  onComplete,
  onError,
  enablePollingFallback = true,
  pollingInterval = 2000
}: UseRealtimeAnalysisOptions): UseRealtimeAnalysisReturn {
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const hasCompletedRef = useRef(false);

  // Callback memoizzati
  const handleStatusChange = useCallback((status: CVAnalysis['status']) => {
    onStatusChange?.(status);
  }, [onStatusChange]);

  const handleComplete = useCallback((completedAnalysis: CVAnalysis) => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete?.(completedAnalysis);
  }, [onComplete]);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  // Funzione per fetch dei dati
  const fetchAnalysis = useCallback(async (): Promise<CVAnalysis | null> => {
    try {
      const now = Date.now();
      // Throttling per evitare troppe richieste
      if (now - lastFetchTimeRef.current < 1000) {
        return null;
      }
      lastFetchTimeRef.current = now;

      const { data, error: fetchError } = await getSupabase()
        .from('cv_analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      return data as CVAnalysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nel caricamento dell\'analisi';
      handleError(errorMessage);
      return null;
    }
  }, [analysisId, handleError]);

  // Funzione refetch pubblica
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const data = await fetchAnalysis();
    if (data) {
      setAnalysis(data);
    }
    setIsLoading(false);
  }, [fetchAnalysis]);

  // Reset dei flag quando cambia l'analysisId
  useEffect(() => {
    hasCompletedRef.current = false;
  }, [analysisId]);

  // Funzione per avviare il polling (sempre attivo come fallback)
  const startPolling = useCallback(() => {
    if (isPollingRef.current || !enablePollingFallback) return;
    
    
    isPollingRef.current = true;
    
    pollingIntervalRef.current = setInterval(async () => {
      if (!analysis || (analysis.status !== 'completed')) {
        const data = await fetchAnalysis();
        if (data) {
          setAnalysis(prevAnalysis => {
            // Aggiorna solo se ci sono cambiamenti
            if (!prevAnalysis || prevAnalysis.status !== data.status || 
                prevAnalysis.updated_at !== data.updated_at) {
              handleStatusChange(data.status);
              
              if (data.status === 'completed') {
                handleComplete(data);
                // Ferma il polling quando completato
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                  isPollingRef.current = false;
                }
              }
              
              return data;
            }
            return prevAnalysis;
          });
        } else {
          // Nessun dato -> probabilmente riga eliminata (analisi fallita e cancellata)
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            isPollingRef.current = false;
          }
          setIsConnected(false);
          handleError('Analisi non trovata: potrebbe essere fallita ed eliminata');
        }
      } else {
        // Ferma il polling se l'analisi è completata
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          isPollingRef.current = false;
        }
      }
    }, pollingInterval);
  }, [analysisId, analysis, enablePollingFallback, pollingInterval, fetchAnalysis, handleStatusChange, handleComplete]);

  // Funzione per fermare il polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      isPollingRef.current = false;
      
    }
  }, [analysisId]);

  // Fetch iniziale dei dati
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchAnalysis();
        if (data) {
          setAnalysis(data);
          handleStatusChange(data.status);
          
          if (data.status === 'completed') {
            handleComplete(data);
          }
        }
      } catch (error) {
        console.error('Error fetching analysis:', error);
        handleError('Errore nel caricamento dell\'analisi');
      } finally {
        setIsLoading(false);
      }
    };

    if (analysisId) {
      fetchInitialData();
    }
  }, [analysisId, fetchAnalysis, handleComplete, handleStatusChange, handleError]);

  // Avvia sempre il polling quando abbiamo un analysisId (fallback continuo)
  useEffect(() => {
    if (!analysisId || !enablePollingFallback) return;
    startPolling();
    return () => {
      stopPolling();
    };
  }, [analysisId, enablePollingFallback, startPolling, stopPolling]);

  // Subscription realtime
  useEffect(() => {
    if (!analysisId) return;

    // Se abbiamo già un'analisi completata, evita sottoscrizione e assicurati risultati
    if (analysis && analysis.status === 'completed') {
      setIsConnected(false);
      handleComplete(analysis);
      return;
    }

    
    
    // Crea il canale realtime
    const channel = getSupabase()
      .channel(`cv_analysis_${analysisId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cv_analyses',
          filter: `id=eq.${analysisId}`
        },
        (payload) => {
          
          const updatedAnalysis = payload.new as CVAnalysis;
          
          setAnalysis(prevAnalysis => {
            if (!prevAnalysis || prevAnalysis.updated_at !== updatedAnalysis.updated_at) {
              handleStatusChange(updatedAnalysis.status);
              
              if (updatedAnalysis.status === 'completed') {
                handleComplete(updatedAnalysis);
                stopPolling(); // Ferma il polling se attivo
              }
              // Se la riga viene cancellata dal trigger quando passa a failed,
              // la subscription potrebbe ricevere un UPDATE che non arriva; prevediamo refetch on 404
              
              return updatedAnalysis;
            }
            return prevAnalysis;
          });
        }
      )
      .subscribe((status) => {
        
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Non fermare il polling: lo teniamo come fallback continuo
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          if (import.meta.env.DEV) {
            console.warn('⚠️ Errore subscription, avvio polling fallback');
          }
          startPolling(); // Avvia il polling come fallback
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    subscriptionRef.current = channel;

    // Timeout per fallback se la subscription non si connette (ridondante ma innocuo)
    const fallbackTimeout = setTimeout(() => {
      if (!isConnected) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Subscription timeout, avvio polling fallback');
        }
        startPolling();
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimeout);
      if (subscriptionRef.current) {
        
        getSupabase().removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [analysisId, analysis?.status, handleStatusChange, handleComplete, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      if (subscriptionRef.current) {
        getSupabase().removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [stopPolling]);

  return {
    analysis,
    isLoading,
    error,
    refetch,
    isConnected
  };
}

// Hook semplificato per casi d'uso comuni
export function useAnalysisStatus(analysisId: string) {
  const [status, setStatus] = useState<CVAnalysis['status'] | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  
  const { analysis, isLoading, error } = useRealtimeAnalysis({
    analysisId,
    onStatusChange: setStatus,
    onComplete: () => setIsComplete(true)
  });
  
  return {
    status,
    isComplete,
    isLoading,
    error,
    analysis
  };
}

// Hook per monitoraggio multiplo (dashboard)
export function useMultipleAnalyses(analysisIds: string[]) {
  const [analyses, setAnalyses] = useState<Record<string, CVAnalysis>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (analysisIds.length === 0) {
      setIsLoading(false);
      return;
    }
    
    const fetchMultipleAnalyses = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('cv_analyses')
          .select('*')
          .in('id', analysisIds);
          
        if (fetchError) throw fetchError;
        
        const analysesMap = (data as CVAnalysis[]).reduce((acc, analysis) => {
          acc[analysis.id] = analysis;
          return acc;
        }, {} as Record<string, CVAnalysis>);
        
        setAnalyses(analysesMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento delle analisi');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMultipleAnalyses();
    
    // Subscription per aggiornamenti multipli
    const channel = supabase
      .channel('multiple_analyses')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cv_analyses',
          filter: `id=in.(${analysisIds.join(',')})`
        },
        (payload) => {
          const updatedAnalysis = payload.new as CVAnalysis;
          setAnalyses(prev => ({
            ...prev,
            [updatedAnalysis.id]: updatedAnalysis
          }));
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [analysisIds]);
  
  return {
    analyses,
    isLoading,
    error
  };
}