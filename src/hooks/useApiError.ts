import { useState, useCallback } from 'react';
import { ErrorMessageConfig, createApiError, ERROR_MESSAGES } from '../utils/errorMessages';
import { useUnifiedNotification } from '../contexts/UnifiedNotificationContext';

export interface ApiErrorState {
  error: ErrorMessageConfig | null;
  isLoading: boolean;
  retryCount: number;
}

export interface ApiErrorOptions {
  showNotification?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: ErrorMessageConfig) => void;
  onRetry?: (retryCount: number) => void;
  onSuccess?: () => void;
}

export interface UseApiErrorReturn {
  error: ErrorMessageConfig | null;
  isLoading: boolean;
  retryCount: number;
  clearError: () => void;
  handleError: (error: any, context?: string) => void;
  executeWithErrorHandling: <T>(
    apiCall: () => Promise<T>,
    options?: ApiErrorOptions
  ) => Promise<T | null>;
  retry: () => Promise<void>;
}

/**
 * Hook per gestire errori API con messaggi migliorati e retry automatico
 */
export const useApiError = (defaultOptions: ApiErrorOptions = {}): UseApiErrorReturn => {
  const [state, setState] = useState<ApiErrorState>({
    error: null,
    isLoading: false,
    retryCount: 0,
  });
  
  const [lastApiCall, setLastApiCall] = useState<(() => Promise<any>) | null>(null);
  const [lastOptions, setLastOptions] = useState<ApiErrorOptions | null>(null);
  
  const { showError, showSuccess } = useUnifiedNotification();

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const handleError = useCallback((error: any, context?: string) => {
    let errorConfig: ErrorMessageConfig;

    if (error?.response) {
      // Errore HTTP con risposta dal server
      const status = error.response.status;
      const data = error.response.data;
      
      errorConfig = createApiError(status, {
        context,
        details: data?.message || data?.error,
        endpoint: error.config?.url,
      });
    } else if (error?.request) {
      // Errore di rete (nessuna risposta)
      errorConfig = {
        ...ERROR_MESSAGES.NETWORK.CONNECTION_ERROR,
        description: context 
          ? `Impossibile completare l'operazione "${context}". Verifica la connessione internet e riprova.`
          : ERROR_MESSAGES.NETWORK.CONNECTION_ERROR.description,
      };
    } else if (error?.message) {
      // Errore generico
      errorConfig = {
        ...ERROR_MESSAGES.GENERIC.UNEXPECTED_ERROR,
        message: error.message,
        description: context 
          ? `Si è verificato un errore durante "${context}". Riprova o contatta il supporto se il problema persiste.`
          : ERROR_MESSAGES.GENERIC.UNEXPECTED_ERROR.description,
      };
    } else {
      // Errore sconosciuto
      errorConfig = {
        ...ERROR_MESSAGES.GENERIC.UNEXPECTED_ERROR,
        description: context 
          ? `Errore imprevisto durante "${context}". Riprova o contatta il supporto.`
          : ERROR_MESSAGES.GENERIC.UNEXPECTED_ERROR.description,
      };
    }

    setState(prev => ({ ...prev, error: errorConfig, isLoading: false }));
    return errorConfig;
  }, []);

  const executeWithErrorHandling = useCallback(async <T>(
    apiCall: () => Promise<T>,
    options: ApiErrorOptions = {}
  ): Promise<T | null> => {
    const mergedOptions = { ...defaultOptions, ...options };
    const { 
      showNotification = true, 
      maxRetries = 3, 
      retryDelay = 1000,
      onError,
      onRetry,
      onSuccess 
    } = mergedOptions;

    // Salva la chiamata API per eventuali retry
    setLastApiCall(() => apiCall);
    setLastOptions(mergedOptions);

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    let currentRetry = 0;
    
    while (currentRetry <= maxRetries) {
      try {
        const result = await apiCall();
        
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: null, 
          retryCount: 0 
        }));
        
        if (onSuccess) onSuccess();
        
        return result;
      } catch (error) {
        const errorConfig = handleError(error);
        
        if (currentRetry < maxRetries) {
          currentRetry++;
          setState(prev => ({ ...prev, retryCount: currentRetry }));
          
          if (onRetry) onRetry(currentRetry);
          
          // Attendi prima del retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * currentRetry));
        } else {
          // Tutti i tentativi falliti
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            retryCount: currentRetry 
          }));
          
          if (showNotification && errorConfig) {
            showError({
              title: errorConfig.title,
              message: errorConfig.message,
              description: errorConfig.description,
              duration: 8000,
              action: maxRetries > 0 ? {
                label: 'Riprova',
                onClick: () => executeWithErrorHandling(apiCall, options),
              } : undefined,
            });
          }
          
          if (onError && errorConfig) onError(errorConfig);
          
          return null;
        }
      }
    }
    
    return null;
  }, [defaultOptions, handleError, showError]);

  const retry = useCallback(async () => {
    if (lastApiCall && lastOptions) {
      await executeWithErrorHandling(lastApiCall, lastOptions);
    }
  }, [lastApiCall, lastOptions, executeWithErrorHandling]);

  return {
    error: state.error,
    isLoading: state.isLoading,
    retryCount: state.retryCount,
    clearError,
    handleError,
    executeWithErrorHandling,
    retry,
  };
};

/**
 * Hook semplificato per singole chiamate API
 */
export const useApiCall = <T>(
  apiCall: () => Promise<T>,
  options: ApiErrorOptions = {}
) => {
  const apiError = useApiError(options);
  
  const execute = useCallback(() => {
    return apiError.executeWithErrorHandling(apiCall, options);
  }, [apiCall, options, apiError]);
  
  return {
    ...apiError,
    execute,
  };
};

export default useApiError;