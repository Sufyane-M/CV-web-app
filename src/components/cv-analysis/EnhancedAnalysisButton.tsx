import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  CreditCard, 
  Sparkles, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Gift
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Card, { CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { creditService } from '../../services/creditService';
import { cn } from '../../utils/cn';

interface EnhancedAnalysisButtonProps {
  onStartAnalysis: () => void;
  canAnalyze: boolean;
  isAnalyzing: boolean;
  hasFile: boolean;
  className?: string;
}

const EnhancedAnalysisButton: React.FC<EnhancedAnalysisButtonProps> = ({
  onStartAnalysis,
  canAnalyze,
  isAnalyzing,
  hasFile,
  className
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [eligibility, setEligibility] = useState<any>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Controlla l'eligibilità quando cambia l'utente
  useEffect(() => {
    const checkEligibility = async () => {
      if (!user || !profile) {
        setEligibility(null);
        return;
      }
      
      setCheckingEligibility(true);
      try {
        const result = await creditService.checkAnalysisEligibility(user.id);
        setEligibility(result);
      } catch (error) {
        console.error('Errore nel controllo eligibilità:', error);
        setEligibility(null);
      } finally {
        setCheckingEligibility(false);
      }
    };
    
    checkEligibility();
  }, [user?.id, profile?.credits, profile?.has_used_free_analysis]);

  // Animazione pulse per attirare l'attenzione
  useEffect(() => {
    if (canAnalyze && hasFile && !isAnalyzing) {
      const interval = setInterval(() => {
        setPulseAnimation(true);
        setTimeout(() => setPulseAnimation(false), 1000);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [canAnalyze, hasFile, isAnalyzing]);

  const getButtonContent = () => {
    if (isAnalyzing) {
      return {
        text: 'Analisi in corso...',
        icon: <Zap className="h-5 w-5 animate-pulse" />,
        variant: 'primary' as const,
        className: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
      };
    }
    
    if (checkingEligibility) {
      return {
        text: 'Controllo eligibilità...',
        icon: <Sparkles className="h-5 w-5 animate-spin" />,
        variant: 'primary' as const,
        className: 'bg-gradient-to-r from-gray-500 to-gray-600'
      };
    }
    
    if (eligibility?.analysisType === 'free') {
      return {
        text: 'Analisi Gratuita',
        icon: <Play className="h-5 w-5" />,
        variant: 'primary' as const,
        className: 'bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl'
      };
    }
    
    return {
      text: 'Inizia Analisi',
      icon: <Play className="h-5 w-5" />,
      variant: 'primary' as const,
      className: 'bg-gradient-to-r from-primary-600 via-blue-600 to-indigo-600 hover:from-primary-700 hover:via-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
    };
  };

  const buttonContent = getButtonContent();
  const isButtonDisabled = !canAnalyze || checkingEligibility;

  return (
    <Card className={cn(
      "mb-6 relative overflow-hidden transition-all duration-300",
      canAnalyze && hasFile && !isAnalyzing && "ring-2 ring-primary-500/20 shadow-lg",
      className
    )}>
      {/* Background gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-50 via-blue-50 to-indigo-50 dark:from-primary-900/10 dark:via-blue-900/10 dark:to-indigo-900/10 opacity-50" />
      
      {/* Animated background particles */}
      {canAnalyze && hasFile && !isAnalyzing && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary-400/20 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }} />
          <div className="absolute top-1/2 -right-4 w-6 h-6 bg-blue-400/20 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }} />
          <div className="absolute -bottom-4 left-1/3 w-4 h-4 bg-indigo-400/20 rounded-full animate-bounce" style={{ animationDelay: '2s', animationDuration: '3s' }} />
        </div>
      )}
      
      <CardContent className="p-8 relative z-10">
        <div className="text-center space-y-6">
          {/* Main Button */}
          <div className="relative">
            <Button
              size="lg"
              onClick={onStartAnalysis}
              disabled={isButtonDisabled}
              loading={isAnalyzing || checkingEligibility}
              leftIcon={buttonContent.icon}
              className={cn(
                "w-full sm:w-auto px-8 py-4 text-lg font-semibold relative overflow-hidden transition-all duration-300 transform border-0",
                buttonContent.className,
                canAnalyze && hasFile && !isAnalyzing && "hover:scale-105 active:scale-95",
                pulseAnimation && "animate-pulse",
                isHovered && "shadow-2xl"
              )}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Button shine effect */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700",
                isHovered ? "translate-x-full" : "-translate-x-full"
              )} />
              
              <span className="relative z-10 flex items-center gap-3">
                {buttonContent.text}
                {canAnalyze && hasFile && !isAnalyzing && (
                  <ArrowRight className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    isHovered && "translate-x-1"
                  )} />
                )}
              </span>
            </Button>
            
            {/* Glow effect */}
            {canAnalyze && hasFile && !isAnalyzing && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 via-blue-600/20 to-indigo-600/20 rounded-lg blur-xl opacity-75 animate-pulse" />
            )}
          </div>
          
          {/* Status Information */}
          {profile && eligibility && (
            <div className="space-y-4">
              {/* Credits and Status */}

              
              {/* Analysis Type Info */}
              
              {eligibility.analysisType === 'paid' && eligibility.canAnalyze && (
                <div className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    ✨ Analisi completa - Tutte le funzionalità premium (1 credito)
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Error States */}
          {!canAnalyze && !isAnalyzing && !checkingEligibility && (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  {!hasFile ? 'Carica un file PDF per continuare' : 
                   eligibility?.reason || 'Impossibile avviare l\'analisi'}
                </p>
              </div>
              
              {eligibility && !eligibility.canAnalyze && !eligibility.hasFreeAnalysisAvailable && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => navigate('/pricing')}
                  leftIcon={<CreditCard className="h-4 w-4" />}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 border-2 border-primary-200 dark:border-primary-800 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300"
                >
                  Acquista Crediti
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedAnalysisButton;