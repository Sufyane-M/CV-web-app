import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ErrorFallbackProps {
  error?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  title?: string;
  description?: string;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  showHomeButton = true,
  title = 'Qualcosa è andato storto',
  description = 'Si è verificato un errore imprevisto. Riprova più tardi.'
}) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const isTimeoutError = error?.toLowerCase().includes('timeout');
  const isConnectionError = error?.toLowerCase().includes('connessione') || error?.toLowerCase().includes('connection');

  const getErrorIcon = () => {
    if (isTimeoutError) {
      return <RefreshCw className="w-16 h-16 text-yellow-500 animate-spin" />;
    }
    return <AlertTriangle className="w-16 h-16 text-red-500" />;
  };

  const getErrorTitle = () => {
    if (isTimeoutError) {
      return 'Timeout di Connessione';
    }
    if (isConnectionError) {
      return 'Problema di Connessione';
    }
    return title;
  };

  const getErrorDescription = () => {
    if (isTimeoutError) {
      return 'L\'operazione sta impiegando troppo tempo. Controlla la tua connessione internet e riprova.';
    }
    if (isConnectionError) {
      return 'Impossibile connettersi al server. Controlla la tua connessione internet.';
    }
    return error || description;
  };

  const getSuggestions = () => {
    const suggestions = [];
    
    if (isTimeoutError || isConnectionError) {
      suggestions.push('Controlla la tua connessione internet');
      suggestions.push('Riprova tra qualche minuto');
    }
    
    suggestions.push('Se il problema persiste, contatta il supporto');
    
    return suggestions;
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-6 flex justify-center">
          {getErrorIcon()}
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {getErrorTitle()}
        </h2>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          {getErrorDescription()}
        </p>
        
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Cosa puoi fare:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            {getSuggestions().map((suggestion, index) => (
              <li key={index} className="flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Riprova
            </button>
          )}
          
          {showHomeButton && (
            <button
              onClick={handleGoHome}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Torna alla Home
            </button>
          )}
        </div>
        
        {error && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Dettagli tecnici
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-auto">
              {error}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorFallback;