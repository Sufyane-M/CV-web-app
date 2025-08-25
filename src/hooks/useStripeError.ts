import { useState, useCallback } from 'react';
import { useUnifiedNotification } from '../contexts/UnifiedNotificationContext';
import { ErrorMessageConfig, ERROR_MESSAGES } from '../utils/errorMessages';

export interface StripeErrorState {
  error: ErrorMessageConfig | null;
  isLoading: boolean;
  canRetry: boolean;
  retryCount: number;
}

export interface StripeErrorOptions {
  showNotification?: boolean;
  maxRetries?: number;
  onError?: (error: ErrorMessageConfig) => void;
  onRetry?: () => void;
}

/**
 * Hook per gestire errori di pagamento Stripe
 */
export const useStripeError = (options: StripeErrorOptions = {}) => {
  const {
    showNotification = true,
    maxRetries = 3,
    onError,
    onRetry,
  } = options;

  const { showError } = useUnifiedNotification();
  const [errorState, setErrorState] = useState<StripeErrorState>({
    error: null,
    isLoading: false,
    canRetry: false,
    retryCount: 0,
  });

  /**
   * Pulisce lo stato di errore
   */
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isLoading: false,
      canRetry: false,
      retryCount: 0,
    });
  }, []);

  /**
   * Gestisce errori Stripe specifici
   */
  const handleStripeError = useCallback((error: any): ErrorMessageConfig => {
    let errorConfig: ErrorMessageConfig;

    // Errori Stripe specifici
    if (error?.type) {
      switch (error.type) {
        case 'card_error':
          errorConfig = handleCardError(error);
          break;
        case 'validation_error':
          errorConfig = {
            type: 'payment',
            severity: 'error',
            title: 'Dati non validi',
            message: error.message || 'I dati inseriti non sono validi',
            description: 'Controlla i dati inseriti e riprova.',
            action: {
              label: 'Correggi dati',
              variant: 'primary',
            },
          };
          break;
        case 'api_connection_error':
          errorConfig = {
            type: 'payment',
            severity: 'error',
            title: 'Problema di connessione',
            message: 'Impossibile connettersi al servizio di pagamento',
            description: 'Verifica la tua connessione internet e riprova.',
            action: {
              label: 'Riprova',
              variant: 'primary',
            },
          };
          break;
        case 'api_error':
          errorConfig = {
            type: 'payment',
            severity: 'error',
            title: 'Errore del servizio',
            message: 'Si è verificato un errore nel servizio di pagamento',
            description: 'Riprova tra qualche minuto o contatta il supporto.',
            action: {
              label: 'Riprova',
              variant: 'primary',
            },
          };
          break;
        case 'authentication_error':
          errorConfig = {
            type: 'payment',
            severity: 'error',
            title: 'Errore di autenticazione',
            message: 'Problema con l\'autenticazione del pagamento',
            description: 'Ricarica la pagina e riprova.',
            action: {
              label: 'Ricarica pagina',
              variant: 'primary',
            },
          };
          break;
        case 'rate_limit_error':
          errorConfig = {
            type: 'payment',
            severity: 'warning',
            title: 'Troppi tentativi',
            message: 'Hai effettuato troppi tentativi di pagamento',
            description: 'Attendi qualche minuto prima di riprovare.',
            action: {
              label: 'Riprova più tardi',
              variant: 'outline',
            },
          };
          break;
        default:
          errorConfig = ERROR_MESSAGES.payment.generic;
      }
    } else {
      // Errori generici
      errorConfig = ERROR_MESSAGES.payment.generic;
    }

    return errorConfig;
  }, []);

  /**
   * Gestisce errori specifici della carta
   */
  const handleCardError = (error: any): ErrorMessageConfig => {
    const { code, decline_code } = error;

    switch (code) {
      case 'card_declined':
        return handleDeclinedCard(decline_code);
      case 'expired_card':
        return {
          type: 'payment',
          severity: 'error',
          title: 'Carta scaduta',
          message: 'La carta di credito è scaduta',
          description: 'Utilizza una carta valida o aggiorna i dati di scadenza.',
          action: {
            label: 'Cambia carta',
            variant: 'primary',
          },
        };
      case 'insufficient_funds':
        return {
          type: 'payment',
          severity: 'error',
          title: 'Fondi insufficienti',
          message: 'La carta non ha fondi sufficienti',
          description: 'Verifica il saldo o utilizza un altro metodo di pagamento.',
          action: {
            label: 'Cambia carta',
            variant: 'primary',
          },
        };
      case 'incorrect_cvc':
        return {
          type: 'payment',
          severity: 'error',
          title: 'CVC non corretto',
          message: 'Il codice di sicurezza inserito non è corretto',
          description: 'Controlla il codice a 3 cifre sul retro della carta.',
          action: {
            label: 'Correggi CVC',
            variant: 'primary',
          },
        };
      case 'processing_error':
        return {
          type: 'payment',
          severity: 'error',
          title: 'Errore di elaborazione',
          message: 'Si è verificato un errore durante l\'elaborazione',
          description: 'Riprova tra qualche minuto.',
          action: {
            label: 'Riprova',
            variant: 'primary',
          },
        };
      case 'incorrect_number':
        return {
          type: 'payment',
          severity: 'error',
          title: 'Numero carta non valido',
          message: 'Il numero della carta inserito non è corretto',
          description: 'Controlla il numero della carta e riprova.',
          action: {
            label: 'Correggi numero',
            variant: 'primary',
          },
        };
      default:
        return {
          type: 'payment',
          severity: 'error',
          title: 'Problema con la carta',
          message: error.message || 'Si è verificato un problema con la carta',
          description: 'Controlla i dati della carta o prova con un altro metodo di pagamento.',
          action: {
            label: 'Riprova',
            variant: 'primary',
          },
        };
    }
  };

  /**
   * Gestisce carte rifiutate
   */
  const handleDeclinedCard = (declineCode?: string): ErrorMessageConfig => {
    switch (declineCode) {
      case 'insufficient_funds':
        return {
          type: 'payment',
          severity: 'error',
          title: 'Fondi insufficienti',
          message: 'La carta non ha fondi sufficienti per completare il pagamento',
          description: 'Verifica il saldo disponibile o utilizza un altro metodo di pagamento.',
          action: {
            label: 'Cambia metodo',
            variant: 'primary',
          },
        };
      case 'lost_card':
      case 'stolen_card':
        return {
          type: 'payment',
          severity: 'error',
          title: 'Carta bloccata',
          message: 'La carta risulta bloccata',
          description: 'Contatta la tua banca o utilizza un altro metodo di pagamento.',
          action: {
            label: 'Cambia carta',
            variant: 'primary',
          },
        };
      case 'pickup_card':
        return {
          type: 'payment',
          severity: 'error',
          title: 'Carta non autorizzata',
          message: 'La carta non è autorizzata per questo tipo di transazione',
          description: 'Contatta la tua banca per maggiori informazioni.',
          action: {
            label: 'Contatta banca',
            variant: 'outline',
          },
        };
      case 'expired_card':
        return {
          type: 'payment',
          severity: 'error',
          title: 'Carta scaduta',
          message: 'La carta di credito è scaduta',
          description: 'Utilizza una carta valida o aggiorna i dati di scadenza.',
          action: {
            label: 'Aggiorna carta',
            variant: 'primary',
          },
        };
      case 'try_again_later':
        return {
          type: 'payment',
          severity: 'warning',
          title: 'Riprova più tardi',
          message: 'Il pagamento non può essere elaborato al momento',
          description: 'Riprova tra qualche minuto.',
          action: {
            label: 'Riprova',
            variant: 'primary',
          },
        };
      default:
        return {
          type: 'payment',
          severity: 'error',
          title: 'Pagamento rifiutato',
          message: 'Il pagamento è stato rifiutato dalla banca',
          description: 'Controlla i dati della carta o contatta la tua banca.',
          action: {
            label: 'Riprova',
            variant: 'primary',
          },
        };
    }
  };

  /**
   * Gestisce un errore e aggiorna lo stato
   */
  const handleError = useCallback((error: any) => {
    const errorConfig = handleStripeError(error);
    const canRetry = errorState.retryCount < maxRetries && 
                    !['lost_card', 'stolen_card', 'pickup_card'].includes(error?.decline_code);

    setErrorState(prev => ({
      error: errorConfig,
      isLoading: false,
      canRetry,
      retryCount: prev.retryCount,
    }));

    if (showNotification) {
      showError({
        title: errorConfig.title,
        message: errorConfig.message,
        duration: 8000,
      });
    }

    onError?.(errorConfig);
  }, [errorState.retryCount, maxRetries, showNotification, showError, onError, handleStripeError]);

  /**
   * Riprova l'operazione
   */
  const retry = useCallback(() => {
    if (!errorState.canRetry) return;

    setErrorState(prev => ({
      ...prev,
      isLoading: true,
      retryCount: prev.retryCount + 1,
    }));

    onRetry?.();
  }, [errorState.canRetry, onRetry]);

  /**
   * Esegue un'operazione Stripe con gestione errori
   */
  const executeStripeOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T | null> => {
    try {
      setErrorState(prev => ({ ...prev, isLoading: true }));
      const result = await operation();
      clearError();
      return result;
    } catch (error) {
      console.error(`Stripe operation failed${operationName ? ` (${operationName})` : ''}:`, error);
      handleError(error);
      return null;
    }
  }, [handleError, clearError]);

  return {
    ...errorState,
    handleError,
    clearError,
    retry,
    executeStripeOperation,
  };
};

export default useStripeError;