import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/outline';
import { useNotification } from '../hooks/useNotificationMigration';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const PaymentErrorPage = () => {
  const { showError } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const error = searchParams.get('error');
    
    let errorMessage = 'Si è verificato un errore durante il pagamento.';
    
    switch (error) {
      case 'missing_session':
        errorMessage = 'Sessione di pagamento mancante.';
        break;
      case 'session_not_found':
        errorMessage = 'Sessione di pagamento non trovata.';
        break;
      case 'payment_not_completed':
        errorMessage = 'Il pagamento non è stato completato.';
        break;
      case 'processing_failed':
        errorMessage = 'Errore durante l\'elaborazione del pagamento.';
        break;
      default:
        errorMessage = 'Si è verificato un errore sconosciuto.';
    }
    
    showError(errorMessage);
  }, [location.search, showError]);

  const handleRetry = () => {
    navigate('/pricing');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <Card className="p-8 text-center">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Pagamento Fallito
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Si è verificato un problema durante il pagamento. Puoi riprovare o contattare il supporto se il problema persiste.
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={handleRetry}
              className="w-full"
            >
              Riprova Pagamento
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="w-full"
            >
              Torna alla Home
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PaymentErrorPage;