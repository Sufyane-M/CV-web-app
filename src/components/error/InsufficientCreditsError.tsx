import React, { useEffect } from 'react';
import { CreditCard, Sparkles, ArrowRight, HelpCircle, Zap, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Card, { CardContent } from '../ui/Card';
import Badge from '../ui/Badge';

interface InsufficientCreditsErrorProps {
  onRetry?: () => void;
  creditsAvailable?: number;
  creditsRequired?: number;
  className?: string;
}

const InsufficientCreditsError: React.FC<InsufficientCreditsErrorProps> = ({
  onRetry,
  creditsAvailable = 0,
  creditsRequired = 2,
  className = ''
}) => {
  const navigate = useNavigate();

  // Scroll automatico verso l'alto quando il componente viene montato
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBuyCredits = () => {
    navigate('/pricing');
  };

  const handleContactSupport = () => {
    window.open('mailto:support@cvanalyzer.pro?subject=Problema con i crediti', '_blank');
  };

  return (
    <div className={`max-w-2xl mx-auto p-6 ${className}`}>
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
        <CardContent className="p-8">
          {/* Header con icona e titolo */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 rounded-full opacity-20 animate-pulse"></div>
              <div className="relative bg-white dark:bg-gray-800 rounded-full p-4 shadow-lg">
                <CreditCard className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Crediti Insufficienti
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Servono <span className="font-semibold text-red-600 dark:text-red-400">{creditsRequired} crediti</span> per ogni analisi completa
            </p>
          </div>

          {/* Status crediti */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">I tuoi crediti</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Saldo attuale</p>
                </div>
              </div>
              <Badge 
                variant={creditsAvailable > 0 ? 'warning' : 'danger'}
                className="text-lg font-bold px-4 py-2"
              >
                {creditsAvailable} / {creditsRequired}
              </Badge>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
              <div 
                className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((creditsAvailable / creditsRequired) * 100, 100)}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ti servono ancora <span className="font-semibold">{creditsRequired - creditsAvailable} crediti</span> per procedere
            </p>
          </div>

          {/* Azioni principali */}
          <div className="space-y-4 mb-8">
            <Button
              onClick={handleBuyCredits}
              variant="primary"
              size="lg"
              fullWidth
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              leftIcon={<Gift className="w-5 h-5" />}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Acquista Crediti
            </Button>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  size="md"
                  fullWidth
                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  Riprova
                </Button>
              )}
              
              <Button
                onClick={handleContactSupport}
                variant="ghost"
                size="md"
                fullWidth
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                leftIcon={<HelpCircle className="w-4 h-4" />}
              >
                Contatta Supporto
              </Button>
            </div>
          </div>

          {/* Informazioni aggiuntive */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Perché servono 2 crediti?
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  Le analisi complete utilizzano AI avanzata per fornire feedback dettagliato, 
                  suggerimenti personalizzati e confronti con descrizioni di lavoro. 
                  Questo processo richiede risorse computazionali significative.
                </p>
              </div>
            </div>
          </div>

          {/* Vantaggi dell'acquisto */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 text-center">
              Cosa ottieni con i crediti:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Analisi ATS completa</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Suggerimenti personalizzati</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Report esportabile PDF</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Confronto con job description</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsufficientCreditsError;