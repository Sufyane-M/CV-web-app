import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SparklesIcon,
  CreditCardIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  SparklesIcon as SparklesIconSolid,
} from '@heroicons/react/24/solid';
import Button from '../ui/Button';
import Card, { CardContent } from '../ui/Card';

interface CreditsCardProps {
  credits: number;
  hasFreeAnalysisAvailable?: boolean;
  className?: string;
}

const AnimatedCounter: React.FC<{ 
  value: number; 
  duration?: number; 
  className?: string;
}> = ({ value, duration = 800, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value === displayValue) return;
    
    setIsAnimating(true);
    const startValue = displayValue;
    const difference = value - startValue;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function per un'animazione più fluida
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (difference * easeOutCubic));
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [value, displayValue, duration]);

  return (
    <span className={`${className} ${isAnimating ? 'animate-pulse' : ''}`}>
      {displayValue}
    </span>
  );
};

const CreditsCard: React.FC<CreditsCardProps> = ({ credits, hasFreeAnalysisAvailable = false, className = '' }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  
  // Se ha l'analisi gratuita disponibile, mostra quello invece dei crediti
  if (hasFreeAnalysisAvailable) {
    return (
      <Card 
        variant="elevated" 
        className={`overflow-hidden transition-all duration-300 hover:shadow-lg border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-4">
          {/* Header per analisi gratuita */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center transition-all duration-200 ${isHovered ? 'scale-110' : ''}`}>
                <SparklesIconSolid className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Analisi Gratuita
                </h3>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Disponibile ora!
                </p>
              </div>
            </div>
            
            {/* Badge gratuito */}
            <div className="text-right">
              <div className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                <span className="text-sm font-bold text-green-700 dark:text-green-300">
                  GRATIS
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                limitata
              </p>
            </div>
          </div>

          {/* Barra di progresso per analisi gratuita */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="h-2 rounded-full bg-green-500 w-full transition-all duration-500" />
            </div>
          </div>
          
          {/* Pulsante per iniziare analisi gratuita */}
          <Button
            onClick={() => navigate('/analisi')}
            variant="primary"
            size="sm"
            fullWidth
            className="text-sm font-medium transition-all duration-200 hover:scale-[1.02] bg-green-600 hover:bg-green-700"
            leftIcon={<SparklesIcon className="h-4 w-4 flex-shrink-0" />}
          >
            Inizia Analisi Gratuita
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Determina lo stato dei crediti
  const getCreditsStatus = () => {
    if (credits === 0) return 'empty';
    if (credits < 2) return 'low';
    if (credits <= 5) return 'medium';
    return 'high';
  };

  const status = getCreditsStatus();

  // Configurazioni semplificate per ogni stato
  const statusConfig = {
    empty: {
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/10',
      borderColor: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      buttonText: 'Acquista Crediti',
      buttonVariant: 'primary' as const,
      icon: ExclamationTriangleIcon,
      statusText: 'Crediti esauriti'
    },
    low: {
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/10',
      borderColor: 'border-orange-200 dark:border-orange-800',
      iconBg: 'bg-orange-100 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      buttonText: 'Ricarica Crediti',
      buttonVariant: 'primary' as const,
      icon: ExclamationTriangleIcon,
      statusText: 'Crediti in esaurimento'
    },
    medium: {
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/10',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      buttonText: 'Aggiungi Crediti',
      buttonVariant: 'outline' as const,
      icon: SparklesIconSolid,
      statusText: 'Buona disponibilità'
    },
    high: {
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/10',
      borderColor: 'border-green-200 dark:border-green-800',
      iconBg: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      buttonText: 'Aggiungi Crediti',
      buttonVariant: 'outline' as const,
      icon: CheckCircleIcon,
      statusText: 'Ottima disponibilità'
    }
  };

  const config = statusConfig[status];
  const IconComponent = config.icon;

  return (
    <Card 
      variant="elevated" 
      className={`overflow-hidden transition-all duration-300 hover:shadow-lg ${config.borderColor} ${config.bgColor} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        {/* Header compatto */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${config.iconBg} rounded-lg flex items-center justify-center transition-all duration-200 ${isHovered ? 'scale-110' : ''}`}>
              <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Crediti
              </h3>
              <p className={`text-xs ${config.color} font-medium`}>
                {config.statusText}
              </p>
            </div>
          </div>
          
          {/* Contatore principale */}
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <AnimatedCounter 
                value={credits} 
                className={`text-2xl font-bold ${config.color}`}
                duration={600}
              />
              <CreditCardIcon className={`h-4 w-4 ${config.color} opacity-70`} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {credits === 1 ? 'disponibile' : 'disponibili'}
            </p>
          </div>
        </div>

        {/* Barra di progresso visiva */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                status === 'empty' ? 'bg-red-500 w-0' :
                status === 'low' ? 'bg-orange-500 w-1/4' :
                status === 'medium' ? 'bg-blue-500 w-2/3' :
                'bg-green-500 w-full'
              }`}
            />
          </div>
        </div>
        
        {/* Pulsante di azione compatto */}
         <Button
           onClick={() => navigate('/pricing')}
           variant={config.buttonVariant}
           size="sm"
           fullWidth
           className="text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
           leftIcon={<PlusIcon className="h-4 w-4 flex-shrink-0" />}
         >
           {config.buttonText}
         </Button>
        
        {/* Info aggiuntiva rimossa su richiesta */}
      </CardContent>
    </Card>
  );
};

export default CreditsCard;