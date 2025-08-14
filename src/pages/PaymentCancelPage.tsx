import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const PaymentCancelPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const handleReturnToPricing = () => {
    navigate('/pricing');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };
  
  const handleGoHome = () => {
    navigate('/');
  };
  
  const handleContactSupport = () => {
    window.open('mailto:support@cvanalyzer.pro?subject=Problema con il pagamento', '_blank');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <XCircleIcon className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Pagamento Annullato
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Il pagamento è stato annullato. Nessun addebito è stato effettuato sul tuo metodo di pagamento.
          </p>
          
          {sessionId && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                ID Sessione: <span className="font-mono">{sessionId.slice(-8).toUpperCase()}</span>
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={handleReturnToPricing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Torna ai Prezzi</span>
            </button>
            
            <button
              onClick={handleGoToDashboard}
              className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Vai alla Dashboard
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Hai bisogno di aiuto?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Se hai riscontrato problemi durante il pagamento, contattaci.
            </p>
            <button
              onClick={() => window.open('mailto:support@cvanalyzer.pro', '_blank')}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
            >
              Contatta il Supporto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;