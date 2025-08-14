import { useEffect, useRef, useCallback } from 'react';
import { useMemoryManagement } from '../hooks/useMemoryManagement';
import { getMemoryConfig, validateMemoryUsage } from '../config/memoryConfig';

interface MemoryOptimizerProps {
  children: React.ReactNode;
  memoryThreshold?: number; // MB
  cleanupInterval?: number; // ms
  enableGarbageCollection?: boolean;
}

/**
 * Componente per l'ottimizzazione automatica della memoria
 * Monitora l'utilizzo della memoria e attiva la garbage collection quando necessario
 */
export const MemoryOptimizer: React.FC<MemoryOptimizerProps> = ({
  children,
  memoryThreshold,
  cleanupInterval,
  enableGarbageCollection
}) => {
  const config = getMemoryConfig();
  const finalMemoryThreshold = memoryThreshold ?? config.MEMORY_OPTIMIZER.DEFAULT_THRESHOLD;
  const finalCleanupInterval = cleanupInterval ?? config.MEMORY_OPTIMIZER.DEFAULT_CLEANUP_INTERVAL;
  const finalEnableGC = enableGarbageCollection ?? config.MEMORY_OPTIMIZER.ENABLE_GARBAGE_COLLECTION;
  
  const { safeSetInterval, addCleanupFunction, isMounted } = useMemoryManagement();
  const lastCleanupRef = useRef<number>(0);
  const memoryStatsRef = useRef<{
    peak: number;
    average: number;
    samples: number[];
  }>({ peak: 0, average: 0, samples: [] });

  // Ottiene l'utilizzo corrente della memoria
  const getCurrentMemoryUsage = useCallback((): number => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return Math.round(memInfo.usedJSHeapSize / 1024 / 1024); // Convert to MB
    }
    return 0;
  }, []);

  // Forza la garbage collection se disponibile
  const forceGarbageCollection = useCallback(() => {
    if (finalEnableGC && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (error) {
        // noop in produzione
      }
    }
  }, [finalEnableGC]);

  // Pulisce le cache del browser
  const clearBrowserCaches = useCallback(() => {
    try {
      if (performance.clearMarks) performance.clearMarks();
      if (performance.clearMeasures) performance.clearMeasures();
      if (performance.clearResourceTimings) performance.clearResourceTimings();
    } catch (error) {
      // noop in produzione
    }
  }, []);

  // Aggiorna le statistiche della memoria
  const updateMemoryStats = useCallback((currentUsage: number) => {
    const stats = memoryStatsRef.current;
    
    // Aggiorna il picco
    if (currentUsage > stats.peak) {
      stats.peak = currentUsage;
    }
    
    // Mantieni solo gli ultimi 10 campioni per la media
    stats.samples.push(currentUsage);
    if (stats.samples.length > 10) {
      stats.samples.shift();
    }
    
    // Calcola la media
    stats.average = Math.round(
      stats.samples.reduce((sum, sample) => sum + sample, 0) / stats.samples.length
    );
  }, []);

  // Monitora e ottimizza la memoria
  const monitorAndOptimize = useCallback(() => {
    if (!isMounted()) return;

    const currentUsage = getCurrentMemoryUsage();
    if (currentUsage === 0) return; // Memory API non disponibile

    updateMemoryStats(currentUsage);
    const now = Date.now();
    const timeSinceLastCleanup = now - lastCleanupRef.current;
    const minCleanupInterval = config.MEMORY_OPTIMIZER.MIN_CLEANUP_INTERVAL;
    const statsLogInterval = config.MEMORY_OPTIMIZER.STATS_LOG_INTERVAL;

    // Log delle statistiche rimosso per ambiente produzione

    // Valida l'utilizzo della memoria
    const validation = validateMemoryUsage(currentUsage);
    
    if (validation.shouldCleanup) {
      // Silenzia logging console in produzione
      
      // Evita cleanup troppo frequenti
      if (timeSinceLastCleanup > minCleanupInterval) {
        // Silenzia logging console in produzione
        
        // Pulisci le cache del browser
        clearBrowserCaches();
        
        // Forza garbage collection dopo un breve delay
        setTimeout(() => {
          if (isMounted()) {
            forceGarbageCollection();
            lastCleanupRef.current = Date.now();
            
            // Verifica l'efficacia del cleanup
            setTimeout(() => {
              if (isMounted()) {
                const newUsage = getCurrentMemoryUsage();
                const reduction = currentUsage - newUsage;
                // Silenzia logging console in produzione
              }
            }, 1000);
          }
        }, 100);
      }
    }
  }, [isMounted, getCurrentMemoryUsage, updateMemoryStats, config, clearBrowserCaches, forceGarbageCollection]);

  // Avvia il monitoraggio
  useEffect(() => {
    // Silenzia logging console in produzione
    
    // Primo controllo immediato
    monitorAndOptimize();
    
    // Avvia il monitoraggio periodico
    const intervalId = safeSetInterval(monitorAndOptimize, finalCleanupInterval);
    
    // Cleanup function
    const cleanup = () => {};
    
    addCleanupFunction(cleanup);
    
    return cleanup;
  }, [monitorAndOptimize, finalCleanupInterval, finalMemoryThreshold, safeSetInterval, addCleanupFunction, config]);

  // Esponi le statistiche della memoria tramite window per debug
  useEffect(() => {
    if (import.meta.env.DEV && config.DEV_MODE.EXPOSE_MEMORY_STATS) {
      (window as any).__memoryStats = () => {
        const stats = memoryStatsRef.current;
        const current = getCurrentMemoryUsage();
        const validation = validateMemoryUsage(current);
        console.table({
          'Current Usage (MB)': current,
          'Peak Usage (MB)': stats.peak,
          'Average Usage (MB)': stats.average,
          'Threshold (MB)': finalMemoryThreshold,
          'Status': validation.status,
          'Should Cleanup': validation.shouldCleanup,
          'Samples Count': stats.samples.length
        });
      };
    }
  }, [getCurrentMemoryUsage, finalMemoryThreshold, config]);

  return <>{children}</>;
};

export default MemoryOptimizer;