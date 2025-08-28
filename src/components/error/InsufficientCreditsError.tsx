import React, { useState, useEffect } from 'react';
import { AlertTriangle, CreditCard, RefreshCw, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Card, { CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { cn } from '../../utils/cn';

interface InsufficientCreditsErrorProps {
  onRetry?: () => void;
  creditsRequired?: number;
  creditsAvailable?: number;
  errorCode?: string;
  className?: string;
}

const InsufficientCreditsError: React.FC<InsufficientCreditsErrorProps> = ({
  onRetry,
  creditsRequired = 2,
  creditsAvailable = 0,
  errorCode = 'INSUFFICIENT_CREDITS_001',
  className
}) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Scroll automatico all'inizio della pagina quando il componente viene montato
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBuyCredits = () => {
    navigate('/pricing');
  };

  const handleContactSupport = () => {
    // Apri il supporto in una nuova finestra/tab
    window.open('mailto:support@analizzatore-cv.com?subject=Problema con i crediti&body=Codice errore: ' + errorCode, '_blank');
  };

  const currentCredits = profile?.credits || creditsAvailable;

  return (
    <div className={cn("min-h-[500px] flex items-center justify-center p-6", className)}>
      <Card className="max-w-2xl w-full shadow-xl border-0 bg-white dark:bg-gray-900">
        <CardContent className="p-8">
          {/* Icona di avviso principale */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            </div>
          </div>

          {/* Messaggio principale */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Crediti Insufficienti
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              Servono <Badge variant="warning" className="mx-1 font-semibold">{creditsRequired} crediti</Badge> per completare l'analisi
            </p>
          </div>

          {/* Saldo crediti corrente */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Il tuo saldo attuale
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Crediti disponibili nel tuo account
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentCredits}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {currentCredits === 1 ? 'credito' : 'crediti'}
                </div>
              </div>
            </div>
          </div>

          {/* Spiegazione chiara */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Perché non posso procedere?
                </h3>
                <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                  Non hai abbastanza crediti per eseguire questa analisi. Ogni analisi completa del CV richiede 
                  <strong className="font-semibold"> {creditsRequired} crediti</strong> per garantire un'analisi 
                  approfondita e di qualità. Per continuare, acquista un nuovo pacchetto di crediti.
                </p>
              </div>
            </div>
          </div>

          {/* Azioni disponibili */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-6">
              Cosa puoi fare ora:
            </h3>
            
            <div className="grid gap-4">
              {/* Bottone primario - Acquista crediti */}
              <Button
                onClick={handleBuyCredits}
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transform hover:scale-[1.02] transition-all duration-200"
                leftIcon={<CreditCard className="w-5 h-5" />}
              >
                Acquista Crediti
              </Button>
              
              {/* Bottone secondario - Riprova */}
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  size="lg"
                  className="w-full border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 py-4 px-6 rounded-xl font-medium transition-all duration-200"
                  leftIcon={<RefreshCw className="w-5 h-5" />}
                >
                  Riprova
                </Button>
              )}
            </div>
            
            {/* Link supporto */}
            <div className="text-center pt-4">
              <button
                onClick={handleContactSupport}
                className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Il problema persiste? Contatta il supporto
              </button>
            </div>
          </div>

          {/* Sezione tecnica collassabile */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center justify-between w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Dettagli tecnici
              </span>
              {showTechnicalDetails ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            {showTechnicalDetails && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Codice errore:</span>
                    <code className="font-mono text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                      {errorCode}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Crediti richiesti:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {creditsRequired}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Crediti disponibili:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {currentCredits}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Timestamp:</span>
                    <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                      {new Date().toISOString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsufficientCreditsError;