import React from 'react';
import { AlertCircle, CreditCard, Wifi, Shield, Phone } from 'lucide-react';
import { ErrorMessageConfig } from '../../utils/errorMessages';
import Button from './Button';

export interface StripeErrorDisplayProps {
  error: ErrorMessageConfig;
  onRetry?: () => void;
  onChangeCard?: () => void;
  onContactSupport?: () => void;
  onContactBank?: () => void;
  canRetry?: boolean;
  retryCount?: number;
  maxRetries?: number;
  isLoading?: boolean;
  className?: string;
}

/**
 * Componente per visualizzare errori di pagamento Stripe
 */
export const StripeErrorDisplay: React.FC<StripeErrorDisplayProps> = ({
  error,
  onRetry,
  onChangeCard,
  onContactSupport,
  onContactBank,
  canRetry = true,
  retryCount = 0,
  maxRetries = 3,
  isLoading = false,
  className = '',
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onRetry) {
        onRetry();
      }
    }
  };

  const getErrorIcon = () => {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('carta') || message.includes('card')) {
      return <CreditCard className="h-4 w-4 sm:h-6 sm:w-6" />;
    }
    if (message.includes('fondi') || message.includes('saldo')) {
      return <AlertCircle className="h-4 w-4 sm:h-6 sm:w-6" />;
    }
    if (message.includes('connessione') || message.includes('rete')) {
      return <Wifi className="h-4 w-4 sm:h-6 sm:w-6" />;
    }
    if (message.includes('bloccata') || message.includes('autorizzat')) {
      return <Shield className="h-4 w-4 sm:h-6 sm:w-6" />;
    }
    if (message.includes('tempo') || message.includes('attendi')) {
      return <AlertCircle className="h-4 w-4 sm:h-6 sm:w-6" />;
    }
    return <AlertCircle className="h-4 w-4 sm:h-6 sm:w-6" />;
  };

  const getErrorColor = () => {
    switch (error.severity) {
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-600 dark:text-yellow-400',
          title: 'text-yellow-800 dark:text-yellow-200',
          message: 'text-yellow-700 dark:text-yellow-300',
          description: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'error':
      default:
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400',
          title: 'text-red-800 dark:text-red-200',
          message: 'text-red-700 dark:text-red-300',
          description: 'text-red-600 dark:text-red-400',
        };
    }
  };

  const colors = getErrorColor();

  const renderActions = () => {
    const actions = [];
    const message = error.message?.toLowerCase() || '';

    // Azione per cambiare carta
    if ((message.includes('carta') || message.includes('numero') || message.includes('scadut') || 
         message.includes('fondi') || message.includes('bloccata')) && onChangeCard) {
      actions.push(
        <Button
          key="change-card"
          variant="primary"
          size="sm"
          onClick={onChangeCard}
          disabled={isLoading}
        >
          {message.includes('fondi') ? 'Cambia metodo' : 'Cambia carta'}
        </Button>
      );
    }

    // Azione per contattare la banca
    if ((message.includes('banca') || message.includes('autorizzat') || message.includes('bloccata')) && onContactBank) {
      actions.push(
        <Button
          key="contact-bank"
          variant="outline"
          size="sm"
          onClick={onContactBank}
          disabled={isLoading}
          className="text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/30"
        >
          <Phone className="h-4 w-4 mr-1" />
          Contatta banca
        </Button>
      );
    }

    // Azione per riprovare
    if (canRetry && onRetry && retryCount < maxRetries && 
        !message.includes('bloccata') && !message.includes('stolen') && !message.includes('lost')) {
      actions.push(
        <Button
          key="retry"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isLoading}
          loading={isLoading}
        >
          Riprova {retryCount > 0 && `(${retryCount}/${maxRetries})`}
        </Button>
      );
    }

    // Azione per contattare il supporto
    if (onContactSupport && (message.includes('supporto') || message.includes('errore') || actions.length === 0)) {
      actions.push(
        <Button
          key="contact-support"
          variant="outline"
          size="sm"
          onClick={onContactSupport}
          disabled={isLoading}
          className="text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          Contatta supporto
        </Button>
      );
    }

    return actions.length > 0 ? (
      <div className="mt-4 flex flex-wrap gap-2">
        {actions}
      </div>
    ) : null;
  };

  const renderRetryInfo = () => {
    if (retryCount === 0 || !canRetry) return null;

    return (
      <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
        Tentativo {retryCount} di {maxRetries}
        {retryCount >= maxRetries && (
          <span className="ml-2 text-red-600 dark:text-red-400">
            • Limite tentativi raggiunto
          </span>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`${colors.bg} ${colors.border} border rounded-lg p-3 sm:p-4 focus-within:ring-2 focus-within:ring-red-500 focus-within:ring-opacity-50 ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className={`flex-shrink-0 ${colors.icon}`}>
          {getErrorIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-xs sm:text-sm font-medium ${colors.title}`}>
            {error.title}
          </h3>
          
          <p className={`mt-1 text-xs sm:text-sm ${colors.message}`}>
            {error.message}
          </p>
          
          {error.description && (
            <p className={`mt-2 text-xs sm:text-sm ${colors.description}`}>
              {error.description}
            </p>
          )}
          
          {renderRetryInfo()}
          {renderActions()}
        </div>
      </div>
    </div>
  );
};

/**
 * Componente per errori di carta di credito
 */
export const CardErrorDisplay: React.FC<{
  error: ErrorMessageConfig;
  onRetry?: () => void;
  onChangeCard?: () => void;
  canRetry?: boolean;
  className?: string;
}> = ({ error, onRetry, onChangeCard, canRetry = true, className = '' }) => {
  return (
    <StripeErrorDisplay
      error={error}
      onRetry={onRetry}
      onChangeCard={onChangeCard}
      canRetry={canRetry}
      className={className}
    />
  );
};

/**
 * Componente per errori di fondi insufficienti
 */
export const InsufficientFundsDisplay: React.FC<{
  onChangeCard?: () => void;
  onContactBank?: () => void;
  className?: string;
}> = ({ onChangeCard, onContactBank, className = '' }) => {
  const error: ErrorMessageConfig = {
    type: 'payment',
    severity: 'error',
    title: 'Fondi insufficienti',
    message: 'La carta non ha fondi sufficienti per completare il pagamento',
    description: 'Verifica il saldo disponibile o utilizza un altro metodo di pagamento.',
  };

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 ${className}`}>
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="flex-shrink-0 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-200">
            {error.title}
          </h3>
          
          <p className="mt-1 text-xs sm:text-sm text-red-700 dark:text-red-300">
            {error.message}
          </p>
          
          <p className="mt-2 text-xs sm:text-sm text-red-600 dark:text-red-400">
            {error.description}
          </p>
          
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
            {onChangeCard && (
              <Button variant="primary" size="sm" onClick={onChangeCard} className="text-xs sm:text-sm">
                Cambia metodo di pagamento
              </Button>
            )}
            {onContactBank && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onContactBank}
                className="text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/30 text-xs sm:text-sm"
              >
                <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Verifica saldo
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente per errori di connessione
 */
export const PaymentConnectionErrorDisplay: React.FC<{
  onRetry?: () => void;
  isLoading?: boolean;
  className?: string;
}> = ({ onRetry, isLoading = false, className = '' }) => {
  const error: ErrorMessageConfig = {
    type: 'payment',
    severity: 'error',
    title: 'Problema di connessione',
    message: 'Impossibile connettersi al servizio di pagamento',
    description: 'Verifica la tua connessione internet e riprova.',
  };

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 ${className}`}>
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="flex-shrink-0 text-red-600 dark:text-red-400">
          <Wifi className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-200">
            {error.title}
          </h3>
          
          <p className="mt-1 text-xs sm:text-sm text-red-700 dark:text-red-300">
            {error.message}
          </p>
          
          <p className="mt-2 text-xs sm:text-sm text-red-600 dark:text-red-400">
            {error.description}
          </p>
          
          {onRetry && (
            <div className="mt-3 sm:mt-4">
              <Button 
                variant="primary" 
                size="sm" 
                onClick={onRetry}
                loading={isLoading}
                disabled={isLoading}
                className="text-xs sm:text-sm"
              >
                Riprova connessione
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Componente per carta bloccata
 */
export const BlockedCardDisplay: React.FC<{
  onChangeCard?: () => void;
  onContactBank?: () => void;
  className?: string;
}> = ({ onChangeCard, onContactBank, className = '' }) => {
  const error: ErrorMessageConfig = {
    type: 'payment',
    severity: 'error',
    title: 'Carta bloccata',
    message: 'La carta risulta bloccata o non autorizzata',
    description: 'Contatta la tua banca per sbloccare la carta o utilizza un altro metodo di pagamento.',
  };

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 ${className}`}>
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="flex-shrink-0 text-red-600 dark:text-red-400">
          <Shield className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-200">
            {error.title}
          </h3>
          
          <p className="mt-1 text-xs sm:text-sm text-red-700 dark:text-red-300">
            {error.message}
          </p>
          
          <p className="mt-2 text-xs sm:text-sm text-red-600 dark:text-red-400">
            {error.description}
          </p>
          
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
            {onContactBank && (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={onContactBank}
                className="text-xs sm:text-sm"
              >
                <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Contatta banca
              </Button>
            )}
            {onChangeCard && (
              <Button variant="outline" size="sm" onClick={onChangeCard} className="text-xs sm:text-sm">
                Usa altra carta
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeErrorDisplay;