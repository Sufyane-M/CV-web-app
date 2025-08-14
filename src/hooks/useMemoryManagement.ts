import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook personalizzato per la gestione della memoria e prevenzione memory leak
 * Fornisce utilities per gestire timeout, interval, AbortController e cleanup
 */
export const useMemoryManagement = () => {
  const mountedRef = useRef(true);
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const abortControllersRef = useRef<Set<AbortController>>(new Set());
  const cleanupFunctionsRef = useRef<Set<() => void>>(new Set());

  // Cleanup automatico al dismount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      
      // Clear all timeouts
      timeoutsRef.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      timeoutsRef.current.clear();
      
      // Clear all intervals
      intervalsRef.current.forEach(interval => {
        clearInterval(interval);
      });
      intervalsRef.current.clear();
      
      // Abort all controllers
      abortControllersRef.current.forEach(controller => {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      });
      abortControllersRef.current.clear();
      
      // Execute cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Error during cleanup:', error);
        }
      });
      cleanupFunctionsRef.current.clear();
    };
  }, []);

  // Safe setTimeout che viene automaticamente pulito
  const safeSetTimeout = useCallback((callback: () => void, delay: number) => {
    if (!mountedRef.current) return;
    
    const timeout = setTimeout(() => {
      if (mountedRef.current) {
        callback();
      }
      timeoutsRef.current.delete(timeout);
    }, delay);
    
    timeoutsRef.current.add(timeout);
    return timeout;
  }, []);

  // Safe setInterval che viene automaticamente pulito
  const safeSetInterval = useCallback((callback: () => void, delay: number) => {
    if (!mountedRef.current) return;
    
    const interval = setInterval(() => {
      if (mountedRef.current) {
        callback();
      } else {
        clearInterval(interval);
        intervalsRef.current.delete(interval);
      }
    }, delay);
    
    intervalsRef.current.add(interval);
    return interval;
  }, []);

  // Crea un AbortController gestito automaticamente
  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    abortControllersRef.current.add(controller);
    
    return controller;
  }, []);

  // Registra una funzione di cleanup personalizzata
  const addCleanupFunction = useCallback((cleanup: () => void) => {
    cleanupFunctionsRef.current.add(cleanup);
    
    // Ritorna una funzione per rimuovere il cleanup se necessario
    return () => {
      cleanupFunctionsRef.current.delete(cleanup);
    };
  }, []);

  // Verifica se il componente è ancora montato
  const isMounted = useCallback(() => mountedRef.current, []);

  // Promise con timeout automatico
  const createTimeoutPromise = useCallback(<T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timeout = safeSetTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => {
          if (timeout) {
            clearTimeout(timeout);
            timeoutsRef.current.delete(timeout);
          }
        });
    });
  }, [safeSetTimeout]);

  // Fetch con AbortController automatico
  const safeFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const controller = createAbortController();
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      return response;
    } finally {
      abortControllersRef.current.delete(controller);
    }
  }, [createAbortController]);

  return {
    isMounted,
    safeSetTimeout,
    safeSetInterval,
    createAbortController,
    addCleanupFunction,
    createTimeoutPromise,
    safeFetch
  };
};

export default useMemoryManagement;