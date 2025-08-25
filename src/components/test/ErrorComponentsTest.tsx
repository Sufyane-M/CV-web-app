import React, { useState } from 'react';
import ErrorMessage from '../ui/ErrorMessage';
import ApiErrorDisplay from '../ui/ApiErrorDisplay';
import AuthErrorDisplay from '../ui/AuthErrorDisplay';
import StripeErrorDisplay from '../ui/StripeErrorDisplay';
import InsufficientCreditsErrorTest from './InsufficientCreditsErrorTest';
import { ErrorMessageConfig, ERROR_MESSAGES } from '../../utils/errorMessages';

const ErrorComponentsTest: React.FC = () => {
  const [currentTest, setCurrentTest] = useState<string>('validation');
  const [isRetrying, setIsRetrying] = useState(false);

  // Test data for different error types
  const validationErrors: ErrorMessageConfig[] = [
    ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD,
    ERROR_MESSAGES.VALIDATION.INVALID_EMAIL,
    ERROR_MESSAGES.VALIDATION.WEAK_PASSWORD,
    ERROR_MESSAGES.VALIDATION.FILE_TOO_LARGE,
    ERROR_MESSAGES.VALIDATION.INVALID_FILE_TYPE,
  ];

  const apiErrors: ErrorMessageConfig[] = [
    ERROR_MESSAGES.NETWORK.CONNECTION_ERROR,
    ERROR_MESSAGES.NETWORK.TIMEOUT_ERROR,
    ERROR_MESSAGES.NETWORK.SERVER_ERROR,
    ERROR_MESSAGES.NETWORK.BAD_REQUEST,
    ERROR_MESSAGES.NETWORK.NOT_FOUND,
  ];

  const authErrors: ErrorMessageConfig[] = [
    ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS,
    ERROR_MESSAGES.AUTH.ACCOUNT_LOCKED,
    ERROR_MESSAGES.AUTH.EMAIL_NOT_VERIFIED,
    ERROR_MESSAGES.AUTHORIZATION.ACCESS_DENIED,
    ERROR_MESSAGES.AUTH.SESSION_EXPIRED,
  ];

  const stripeErrors: ErrorMessageConfig[] = [
    {
      type: 'error',
      title: 'Carta di credito rifiutata',
      message: 'La tua carta di credito è stata rifiutata dalla banca.',
      description: 'Verifica i dati della carta o prova con un altro metodo di pagamento.',
      content: 'card_declined',
      action: { label: 'Riprova', action: () => {} }
    },
    {
      type: 'error',
      title: 'Fondi insufficienti',
      message: 'Non ci sono fondi sufficienti sulla carta per completare il pagamento.',
      description: 'Verifica il saldo disponibile o usa un altro metodo di pagamento.',
      content: 'insufficient_funds',
      action: { label: 'Cambia carta', action: () => {} }
    },
    {
      type: 'error',
      title: 'Errore di connessione',
      message: 'Impossibile connettersi al servizio di pagamento.',
      description: 'Verifica la tua connessione internet e riprova.',
      content: 'network_error',
      action: { label: 'Riprova', action: () => {} }
    },
  ];

  const handleRetry = async () => {
    setIsRetrying(true);
    // Simulate retry delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRetrying(false);
  };

  const handleDismiss = () => {
    console.log('Error dismissed');
  };

  const renderTestSection = (title: string, errors: ErrorMessageConfig[], Component: React.ComponentType<any>) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{title}</h3>
      <div className="space-y-4">
        {errors.map((error, index) => (
          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
              Test: {error.title}
            </h4>
            <Component
              error={error}
              onRetry={handleRetry}
              onDismiss={handleDismiss}
              onChangeCard={() => console.log('Change card')}
              onContactSupport={() => console.log('Contact support')}
              onContactBank={() => console.log('Contact bank')}
              isRetrying={isRetrying}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            Test Componenti di Errore
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Questa pagina testa tutti i componenti di errore su diversi dispositivi e scenari.
              Verifica la responsività ridimensionando la finestra e testa l'accessibilità usando la tastiera.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { key: 'validation', label: 'Validazione' },
                { key: 'api', label: 'API' },
                { key: 'auth', label: 'Autenticazione' },
                { key: 'stripe', label: 'Pagamenti' },
                { key: 'credits', label: 'Crediti Insufficienti' },
                { key: 'all', label: 'Tutti' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCurrentTest(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTest === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {(currentTest === 'validation' || currentTest === 'all') && 
              renderTestSection('Errori di Validazione', validationErrors, ErrorMessage)
            }
            
            {(currentTest === 'api' || currentTest === 'all') && 
              renderTestSection('Errori API', apiErrors, ApiErrorDisplay)
            }
            
            {(currentTest === 'auth' || currentTest === 'all') && 
              renderTestSection('Errori di Autenticazione', authErrors, AuthErrorDisplay)
            }
            
            {(currentTest === 'stripe' || currentTest === 'all') && 
              renderTestSection('Errori di Pagamento', stripeErrors, StripeErrorDisplay)
            }
            
            {(currentTest === 'credits' || currentTest === 'all') && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                  Test Crediti Insufficienti
                </h2>
                <InsufficientCreditsErrorTest />
              </div>
            )}
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-200">
              Istruzioni per il Test
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>Responsività:</strong> Ridimensiona la finestra per testare su diversi schermi</li>
              <li>• <strong>Accessibilità:</strong> Usa Tab per navigare e Enter/Spazio per interagire</li>
              <li>• <strong>Temi:</strong> Cambia tema per verificare i colori in modalità scura</li>
              <li>• <strong>Interazioni:</strong> Clicca sui pulsanti per testare le azioni</li>
              <li>• <strong>Dismissione:</strong> Usa Escape per chiudere i messaggi dismissibili</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorComponentsTest;