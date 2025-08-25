import { useCallback } from 'react';
import { ErrorMessageConfig, ERROR_MESSAGES } from '../utils/errorMessages';
import { useUnifiedNotification } from '../contexts/UnifiedNotificationContext';
import { useNavigate } from 'react-router-dom';

export interface AuthErrorOptions {
  showNotification?: boolean;
  redirectOnUnauthorized?: boolean;
  redirectPath?: string;
  onError?: (error: ErrorMessageConfig) => void;
}

export interface UseAuthErrorReturn {
  handleAuthError: (error: any, context?: string) => ErrorMessageConfig;
  handleLoginError: (error: any) => ErrorMessageConfig;
  handleRegistrationError: (error: any) => ErrorMessageConfig;
  handlePasswordResetError: (error: any) => ErrorMessageConfig;
  handleUnauthorizedError: (requiredPermission?: string) => ErrorMessageConfig;
  handleSessionExpiredError: () => ErrorMessageConfig;
}

/**
 * Hook per gestire errori di autenticazione e autorizzazione
 */
export const useAuthError = (options: AuthErrorOptions = {}): UseAuthErrorReturn => {
  const {
    showNotification = true,
    redirectOnUnauthorized = true,
    redirectPath = '/login',
    onError,
  } = options;

  const { showError, showWarning } = useUnifiedNotification();
  const navigate = useNavigate();

  const handleAuthError = useCallback((error: any, context?: string): ErrorMessageConfig => {
    let errorConfig: ErrorMessageConfig;

    if (error?.response?.status) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          errorConfig = {
            ...ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS,
            description: data?.message || 'Verifica che email e password siano corretti e riprova.',
          };
          break;

        case 401:
          errorConfig = {
            ...ERROR_MESSAGES.AUTH.UNAUTHORIZED,
            description: context 
              ? `Non hai i permessi necessari per ${context}. Effettua il login o contatta l'amministratore.`
              : ERROR_MESSAGES.AUTH.UNAUTHORIZED.description,
          };
          
          if (redirectOnUnauthorized) {
            setTimeout(() => navigate(redirectPath), 2000);
          }
          break;

        case 403:
          errorConfig = {
            ...ERROR_MESSAGES.AUTH.FORBIDDEN,
            description: context 
              ? `Non hai i permessi per accedere a "${context}". Contatta l'amministratore se ritieni sia un errore.`
              : ERROR_MESSAGES.AUTH.FORBIDDEN.description,
          };
          break;

        case 409:
          errorConfig = {
            type: 'auth',
            severity: 'error',
            title: 'Account già esistente',
            message: 'Un account con questa email esiste già',
            description: 'Prova ad effettuare il login o usa un\'altra email per registrarti.',
          };
          break;

        case 422:
          errorConfig = {
            type: 'validation',
            severity: 'error',
            title: 'Dati non validi',
            message: data?.message || 'I dati inseriti non sono validi',
            description: 'Controlla che tutti i campi siano compilati correttamente.',
          };
          break;

        case 429:
          errorConfig = {
            type: 'auth',
            severity: 'warning',
            title: 'Troppi tentativi',
            message: 'Hai effettuato troppi tentativi di login',
            description: 'Attendi qualche minuto prima di riprovare per motivi di sicurezza.',
          };
          break;

        default:
          errorConfig = {
            ...ERROR_MESSAGES.AUTH.LOGIN_FAILED,
            description: context 
              ? `Errore durante ${context}. Riprova o contatta il supporto se il problema persiste.`
              : ERROR_MESSAGES.AUTH.LOGIN_FAILED.description,
          };
      }
    } else if (error?.message) {
      errorConfig = {
        ...ERROR_MESSAGES.AUTH.LOGIN_FAILED,
        message: error.message,
        description: 'Si è verificato un errore durante l\'autenticazione. Riprova.',
      };
    } else {
      errorConfig = {
        ...ERROR_MESSAGES.AUTH.LOGIN_FAILED,
        description: 'Errore imprevisto durante l\'autenticazione. Riprova o contatta il supporto.',
      };
    }

    if (showNotification) {
      if (errorConfig.severity === 'warning') {
        showWarning({
          title: errorConfig.title,
          message: errorConfig.message,
          description: errorConfig.description,
          duration: 6000,
        });
      } else {
        showError({
          title: errorConfig.title,
          message: errorConfig.message,
          description: errorConfig.description,
          duration: 8000,
        });
      }
    }

    if (onError) {
      onError(errorConfig);
    }

    return errorConfig;
  }, [showNotification, redirectOnUnauthorized, redirectPath, onError, showError, showWarning, navigate]);

  const handleLoginError = useCallback((error: any): ErrorMessageConfig => {
    return handleAuthError(error, 'il login');
  }, [handleAuthError]);

  const handleRegistrationError = useCallback((error: any): ErrorMessageConfig => {
    return handleAuthError(error, 'la registrazione');
  }, [handleAuthError]);

  const handlePasswordResetError = useCallback((error: any): ErrorMessageConfig => {
    let errorConfig: ErrorMessageConfig;

    if (error?.response?.status === 404) {
      errorConfig = {
        type: 'auth',
        severity: 'error',
        title: 'Email non trovata',
        message: 'Nessun account associato a questa email',
        description: 'Verifica di aver inserito l\'email corretta o registrati se non hai ancora un account.',
      };
    } else if (error?.response?.status === 429) {
      errorConfig = {
        type: 'auth',
        severity: 'warning',
        title: 'Troppi tentativi',
        message: 'Hai richiesto troppi reset della password',
        description: 'Attendi 15 minuti prima di richiedere un nuovo reset per motivi di sicurezza.',
      };
    } else {
      errorConfig = {
        type: 'auth',
        severity: 'error',
        title: 'Errore reset password',
        message: 'Impossibile inviare l\'email di reset',
        description: 'Si è verificato un errore durante l\'invio dell\'email. Riprova tra qualche minuto.',
      };
    }

    if (showNotification) {
      if (errorConfig.severity === 'warning') {
        showWarning({
          title: errorConfig.title,
          message: errorConfig.message,
          description: errorConfig.description,
          duration: 8000,
        });
      } else {
        showError({
          title: errorConfig.title,
          message: errorConfig.message,
          description: errorConfig.description,
          duration: 8000,
        });
      }
    }

    if (onError) {
      onError(errorConfig);
    }

    return errorConfig;
  }, [showNotification, onError, showError, showWarning]);

  const handleUnauthorizedError = useCallback((requiredPermission?: string): ErrorMessageConfig => {
    const errorConfig: ErrorMessageConfig = {
      ...ERROR_MESSAGES.AUTH.UNAUTHORIZED,
      description: requiredPermission 
        ? `Per accedere a questa funzione è necessario il permesso "${requiredPermission}". Contatta l'amministratore se ritieni sia un errore.`
        : 'Non hai i permessi necessari per accedere a questa risorsa. Effettua il login o contatta l\'amministratore.',
    };

    if (showNotification) {
      showError({
        title: errorConfig.title,
        message: errorConfig.message,
        description: errorConfig.description,
        duration: 8000,
        action: {
          label: 'Vai al Login',
          onClick: () => navigate(redirectPath),
        },
      });
    }

    if (redirectOnUnauthorized) {
      setTimeout(() => navigate(redirectPath), 3000);
    }

    if (onError) {
      onError(errorConfig);
    }

    return errorConfig;
  }, [showNotification, redirectOnUnauthorized, redirectPath, onError, showError, navigate]);

  const handleSessionExpiredError = useCallback((): ErrorMessageConfig => {
    const errorConfig: ErrorMessageConfig = {
      type: 'auth',
      severity: 'warning',
      title: 'Sessione scaduta',
      message: 'La tua sessione è scaduta',
      description: 'Per motivi di sicurezza, la tua sessione è scaduta. Effettua nuovamente il login per continuare.',
    };

    if (showNotification) {
      showWarning({
        title: errorConfig.title,
        message: errorConfig.message,
        description: errorConfig.description,
        duration: 6000,
        action: {
          label: 'Effettua Login',
          onClick: () => navigate(redirectPath),
        },
      });
    }

    // Redirect automatico dopo 3 secondi
    setTimeout(() => navigate(redirectPath), 3000);

    if (onError) {
      onError(errorConfig);
    }

    return errorConfig;
  }, [showNotification, redirectPath, onError, showWarning, navigate]);

  return {
    handleAuthError,
    handleLoginError,
    handleRegistrationError,
    handlePasswordResetError,
    handleUnauthorizedError,
    handleSessionExpiredError,
  };
};

export default useAuthError;