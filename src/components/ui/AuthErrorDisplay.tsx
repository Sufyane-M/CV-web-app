import React from 'react';
import { 
  ExclamationTriangleIcon,
  LockClosedIcon,
  UserIcon,
  ClockIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import { ErrorMessageConfig } from '../../utils/errorMessages';
import Button from './Button';
import { Link } from 'react-router-dom';

export interface AuthErrorDisplayProps {
  error: ErrorMessageConfig;
  onRetry?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
  onForgotPassword?: () => void;
  showActions?: boolean;
  className?: string;
}

/**
 * Componente per visualizzare errori di autenticazione con azioni specifiche
 */
export const AuthErrorDisplay: React.FC<AuthErrorDisplayProps> = ({
  error,
  onRetry,
  onLogin,
  onRegister,
  onForgotPassword,
  showActions = true,
  className = '',
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (onRetry) {
        onRetry();
      }
    }
  };

  const getErrorIcon = () => {
    if (error.message?.toLowerCase().includes('credenziali') || error.message?.toLowerCase().includes('password')) {
      return <LockClosedIcon className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
    if (error.message?.toLowerCase().includes('permessi') || error.message?.toLowerCase().includes('autorizzato')) {
      return <ShieldExclamationIcon className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
    if (error.message?.toLowerCase().includes('sessione') || error.message?.toLowerCase().includes('scadut')) {
      return <ClockIcon className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
    if (error.message?.toLowerCase().includes('account') || error.message?.toLowerCase().includes('utente')) {
      return <UserIcon className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
    return <ExclamationTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6" />;
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
    if (!showActions) return null;

    const actions = [];

    // Azioni basate sul tipo di errore
    if (error.message?.toLowerCase().includes('credenziali') && onForgotPassword) {
      actions.push(
        <Button
          key="forgot-password"
          variant="outline"
          size="sm"
          onClick={onForgotPassword}
          className="text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/30"
        >
          Password dimenticata?
        </Button>
      );
    }

    if (error.message?.toLowerCase().includes('account') && error.message?.toLowerCase().includes('esiste') && onLogin) {
      actions.push(
        <Button
          key="login"
          variant="outline"
          size="sm"
          onClick={onLogin}
          className="text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/30"
        >
          Effettua Login
        </Button>
      );
    }

    if ((error.message?.toLowerCase().includes('autorizzato') || error.message?.toLowerCase().includes('sessione')) && onLogin) {
      actions.push(
        <Button
          key="login"
          variant="primary"
          size="sm"
          onClick={onLogin}
        >
          Accedi
        </Button>
      );
    }

    if (error.message?.toLowerCase().includes('email') && error.message?.toLowerCase().includes('trovata') && onRegister) {
      actions.push(
        <Button
          key="register"
          variant="outline"
          size="sm"
          onClick={onRegister}
          className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-900/30"
        >
          Registrati
        </Button>
      );
    }

    if (onRetry && !error.message?.toLowerCase().includes('troppi')) {
      actions.push(
        <Button
          key="retry"
          variant="outline"
          size="sm"
          onClick={onRetry}
        >
          Riprova
        </Button>
      );
    }

    return actions.length > 0 ? (
      <div className="mt-4 flex flex-wrap gap-2">
        {actions}
      </div>
    ) : null;
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
            <p className={`mt-2 text-xs ${colors.description}`}>
              {error.description}
            </p>
          )}
          
          {renderActions()}
        </div>
      </div>
    </div>
  );
};

/**
 * Componente per errori di login
 */
export const LoginErrorDisplay: React.FC<{
  error: ErrorMessageConfig;
  onRetry?: () => void;
  onForgotPassword?: () => void;
  className?: string;
}> = ({ error, onRetry, onForgotPassword, className = '' }) => {
  return (
    <AuthErrorDisplay
      error={error}
      onRetry={onRetry}
      onForgotPassword={onForgotPassword}
      className={className}
    />
  );
};

/**
 * Componente per errori di registrazione
 */
export const RegistrationErrorDisplay: React.FC<{
  error: ErrorMessageConfig;
  onRetry?: () => void;
  onLogin?: () => void;
  className?: string;
}> = ({ error, onRetry, onLogin, className = '' }) => {
  return (
    <AuthErrorDisplay
      error={error}
      onRetry={onRetry}
      onLogin={onLogin}
      className={className}
    />
  );
};

/**
 * Componente per errori di autorizzazione
 */
export const UnauthorizedErrorDisplay: React.FC<{
  error: ErrorMessageConfig;
  onLogin?: () => void;
  loginPath?: string;
  className?: string;
}> = ({ error, onLogin, loginPath = '/login', className = '' }) => {
  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center ${className}`}>
      <div className="flex justify-center mb-4">
        <ShieldExclamationIcon className="h-12 w-12 text-red-600 dark:text-red-400" />
      </div>
      
      <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
        {error.title}
      </h3>
      
      <p className="text-sm text-red-700 dark:text-red-300 mb-2">
        {error.message}
      </p>
      
      {error.description && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-6">
          {error.description}
        </p>
      )}
      
      <div className="flex justify-center space-x-3">
        {onLogin ? (
          <Button variant="primary" onClick={onLogin}>
            Effettua Login
          </Button>
        ) : (
          <Link to={loginPath}>
            <Button variant="primary">
              Effettua Login
            </Button>
          </Link>
        )}
        
        <Link to="/">
          <Button variant="outline">
            Torna alla Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

/**
 * Componente per errori di sessione scaduta
 */
export const SessionExpiredDisplay: React.FC<{
  onLogin?: () => void;
  loginPath?: string;
  className?: string;
}> = ({ onLogin, loginPath = '/login', className = '' }) => {
  const sessionError: ErrorMessageConfig = {
    type: 'auth',
    severity: 'warning',
    title: 'Sessione scaduta',
    message: 'La tua sessione è scaduta',
    description: 'Per motivi di sicurezza, devi effettuare nuovamente il login per continuare.',
  };

  return (
    <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center ${className}`}>
      <div className="flex justify-center mb-4">
        <ClockIcon className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
      </div>
      
      <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
        {sessionError.title}
      </h3>
      
      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
        {sessionError.message}
      </p>
      
      <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-6">
        {sessionError.description}
      </p>
      
      <div className="flex justify-center">
        {onLogin ? (
          <Button variant="primary" onClick={onLogin}>
            Effettua Login
          </Button>
        ) : (
          <Link to={loginPath}>
            <Button variant="primary">
              Effettua Login
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default AuthErrorDisplay;