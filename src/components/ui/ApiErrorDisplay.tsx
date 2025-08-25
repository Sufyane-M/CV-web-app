import React from 'react';
import { 
  ExclamationTriangleIcon, 
  WifiIcon, 
  ServerIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { ErrorMessage } from './ErrorMessage';
import { ErrorMessageConfig } from '../../utils/errorMessages';
import Button from './Button';

export interface ApiErrorDisplayProps {
  error: ErrorMessageConfig;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetryButton?: boolean;
  showDismissButton?: boolean;
  className?: string;
}

/**
 * Componente per visualizzare errori API con opzioni di retry
 */
export const ApiErrorDisplay: React.FC<ApiErrorDisplayProps> = ({
  error,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  onRetry,
  onDismiss,
  showRetryButton = true,
  showDismissButton = true,
  className = '',
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (onRetry && !isRetrying && retryCount < maxRetries) {
        onRetry();
      }
    } else if (event.key === 'Escape' && onDismiss) {
      onDismiss();
    }
  };

  const getErrorIcon = () => {
    if (error.type === 'network') {
      return <WifiIcon className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
    if (error.type === 'api' && error.message?.includes('server')) {
      return <ServerIcon className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
    if (error.message?.includes('timeout')) {
      return <ClockIcon className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
    return <ExclamationTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6" />;
  };

  const getRetryMessage = () => {
    if (retryCount > 0) {
      return `Tentativo ${retryCount}/${maxRetries} fallito`;
    }
    return null;
  };

  const canRetry = showRetryButton && onRetry && retryCount < maxRetries;

  return (
    <div 
      className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 ${className}`}
      role="alert"
      aria-live="polite"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5">
          {getErrorIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm sm:text-base font-medium text-red-800 dark:text-red-200">
                {error.title}
              </h3>
              
              <p className="mt-1 text-xs sm:text-sm text-red-700 dark:text-red-300">
                {error.message}
              </p>
              
              {error.description && (
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600 dark:text-red-400">
                  {error.description}
                </p>
              )}
              
              {getRetryMessage() && (
                <p className="mt-1 sm:mt-2 text-xs text-red-500 dark:text-red-500">
                  {getRetryMessage()}
                </p>
              )}
            </div>
            
            {showDismissButton && onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-2 sm:ml-3 flex-shrink-0 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300 transition-colors p-1 touch-manipulation"
                aria-label="Chiudi errore"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {(canRetry || isRetrying) && (
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              {canRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-800/30 w-full sm:w-auto min-h-[40px] sm:min-h-[auto] touch-manipulation"
                >
                  {isRetrying ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Riprovando...
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2" />
                      Riprova
                    </>
                  )}
                </Button>
              )}
              
              {retryCount >= maxRetries && (
                <span className="text-xs text-red-500 dark:text-red-400">
                  Numero massimo di tentativi raggiunto
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Componente semplificato per errori di connessione
 */
export const ConnectionErrorDisplay: React.FC<{
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}> = ({ onRetry, isRetrying = false, className = '' }) => {
  const connectionError: ErrorMessageConfig = {
    type: 'network',
    severity: 'error',
    title: 'Problema di connessione',
    message: 'Impossibile connettersi al server',
    description: 'Verifica la tua connessione internet e riprova. Se il problema persiste, potrebbe essere un problema temporaneo del servizio.',
  };

  return (
    <ApiErrorDisplay
      error={connectionError}
      onRetry={onRetry}
      isRetrying={isRetrying}
      showDismissButton={false}
      className={className}
    />
  );
};

/**
 * Componente per errori di timeout
 */
export const TimeoutErrorDisplay: React.FC<{
  onRetry?: () => void;
  isRetrying?: boolean;
  operation?: string;
  className?: string;
}> = ({ onRetry, isRetrying = false, operation = 'operazione', className = '' }) => {
  const timeoutError: ErrorMessageConfig = {
    type: 'api',
    severity: 'warning',
    title: 'Timeout della richiesta',
    message: `L'${operation} sta impiegando più tempo del previsto`,
    description: 'Il server potrebbe essere sovraccarico. Riprova tra qualche momento.',
  };

  return (
    <ApiErrorDisplay
      error={timeoutError}
      onRetry={onRetry}
      isRetrying={isRetrying}
      className={className}
    />
  );
};

/**
 * Componente per errori del server
 */
export const ServerErrorDisplay: React.FC<{
  statusCode?: number;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}> = ({ statusCode = 500, onRetry, isRetrying = false, className = '' }) => {
  const getErrorMessage = () => {
    switch (statusCode) {
      case 500:
        return {
          title: 'Errore interno del server',
          message: 'Si è verificato un problema sul server',
          description: 'I nostri tecnici sono stati notificati. Riprova tra qualche minuto.',
        };
      case 502:
      case 503:
        return {
          title: 'Servizio temporaneamente non disponibile',
          message: 'Il server è in manutenzione o sovraccarico',
          description: 'Riprova tra qualche minuto. Se il problema persiste, contatta il supporto.',
        };
      case 504:
        return {
          title: 'Timeout del gateway',
          message: 'Il server ha impiegato troppo tempo a rispondere',
          description: 'Riprova tra qualche momento. Il problema dovrebbe risolversi automaticamente.',
        };
      default:
        return {
          title: `Errore del server (${statusCode})`,
          message: 'Si è verificato un errore sul server',
          description: 'Riprova o contatta il supporto se il problema persiste.',
        };
    }
  };

  const errorInfo = getErrorMessage();
  const serverError: ErrorMessageConfig = {
    type: 'api',
    severity: 'error',
    ...errorInfo,
  };

  return (
    <ApiErrorDisplay
      error={serverError}
      onRetry={onRetry}
      isRetrying={isRetrying}
      className={className}
    />
  );
};

export default ApiErrorDisplay;