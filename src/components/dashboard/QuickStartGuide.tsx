import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DocumentTextIcon,
  SparklesIcon,
  CheckCircleIcon,
  PlayIcon,
  ArrowRightIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import {
  DocumentTextIcon as DocumentTextIconSolid,
  SparklesIcon as SparklesIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
} from '@heroicons/react/24/solid';
import Card, { CardHeader, CardContent } from '../ui/Card';
import Button from '../ui/Button';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  solidIcon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  hoverColor: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Carica il tuo CV',
    description: 'Inizia caricando il tuo CV in formato PDF o Word per un\'analisi completa',
    icon: DocumentTextIcon,
    solidIcon: DocumentTextIconSolid,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
    hoverColor: 'hover:from-blue-600 hover:to-blue-700',
  },
  {
    id: 2,
    title: 'Analizza con AI',
    description: 'La nostra intelligenza artificiale analizzerà il tuo CV e la compatibilità ATS in pochi secondi',
    icon: SparklesIcon,
    solidIcon: SparklesIconSolid,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-gradient-to-br from-purple-500 to-indigo-600',
    hoverColor: 'hover:from-purple-600 hover:to-indigo-700',
  },
  {
    id: 3,
    title: 'Ricevi feedback',
    description: 'Ottieni suggerimenti dettagliati e personalizzati per migliorare il tuo profilo professionale',
    icon: CheckCircleIcon,
    solidIcon: CheckCircleIconSolid,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-gradient-to-br from-emerald-500 to-green-600',
    hoverColor: 'hover:from-emerald-600 hover:to-green-700',
  },
];

const QuickStartGuide: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  return (
    <Card variant="elevated" className="overflow-hidden border-0 shadow-xl bg-white dark:bg-gray-800 transition-all duration-300 hover:shadow-2xl">
      {/* Header con gradiente e icona animata */}
      <CardHeader className="relative bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30 dark:from-gray-800 dark:via-blue-900/10 dark:to-indigo-900/5 border-b border-slate-200/50 dark:border-gray-700/50 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/5 opacity-50"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-110">
                <LightBulbIcon className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                Guida Rapida
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                3 semplici passaggi per iniziare
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  hoveredStep === index + 1
                    ? 'bg-blue-500 scale-125'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Steps Container */}
        <div className="p-4 space-y-3">
          {steps.map((step, index) => {
            const Icon = hoveredStep === step.id ? step.solidIcon : step.icon;
            const isHovered = hoveredStep === step.id;
            
            return (
              <div
                key={step.id}
                className={`group relative p-3 rounded-xl transition-all duration-300 cursor-pointer transform ${
                  isHovered
                    ? 'bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/20 dark:from-blue-900/10 dark:via-indigo-900/5 dark:to-purple-900/5 scale-[1.02] shadow-lg'
                    : 'hover:bg-gray-50/50 dark:hover:bg-gray-700/30 hover:scale-[1.01]'
                }`}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-7 top-14 w-0.5 h-6 bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600 transition-all duration-300 group-hover:from-blue-400 dark:group-hover:from-blue-500"></div>
                )}
                
                <div className="flex items-start space-x-3">
                  {/* Step Icon */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 transform ${
                        step.bgColor
                      } ${
                        isHovered ? `${step.hoverColor} scale-110 shadow-xl` : 'group-hover:scale-105'
                      }`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    
                    {/* Step number badge */}
                    <div className={`absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md transition-all duration-300 ${
                      isHovered ? 'bg-gradient-to-br from-yellow-400 to-orange-500 scale-110' : 'bg-gradient-to-br from-gray-500 to-gray-600'
                    }`}>
                      {step.id}
                    </div>
                  </div>
                  
                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`font-semibold transition-colors duration-300 ${
                        isHovered ? step.color : 'text-gray-900 dark:text-white'
                      }`}>
                        {step.title}
                      </h4>
                      {isHovered && (
                        <ArrowRightIcon className={`h-4 w-4 transition-all duration-300 ${step.color} animate-pulse`} />
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                      isHovered ? 'text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
                
                {/* Hover effect overlay */}
                {isHovered && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 dark:from-blue-400/5 dark:via-indigo-400/5 dark:to-purple-400/5 pointer-events-none"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Button
              onClick={() => navigate('/analisi')}
              variant="primary"
              size="lg"
              className={`w-full relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 border-0 shadow-lg transition-all duration-300 transform ${
                isButtonHovered ? 'scale-105 shadow-xl' : 'hover:scale-[1.02]'
              }`}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
            >
              {/* Button background animation */}
              <div className={`absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-transparent transition-transform duration-500 ${
                isButtonHovered ? 'translate-x-full' : '-translate-x-full'
              }`}></div>
              
              <div className="relative flex items-center justify-center space-x-2">
                <PlayIcon className={`h-5 w-5 transition-transform duration-300 ${
                  isButtonHovered ? 'scale-110' : ''
                }`} />
                <span className="font-semibold">Inizia la tua Analisi</span>
                <ArrowRightIcon className={`h-4 w-4 transition-transform duration-300 ${
                  isButtonHovered ? 'translate-x-1' : ''
                }`} />
              </div>
            </Button>
            
            {/* Button glow effect */}
            {isButtonHovered && (
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-20 blur-xl transition-opacity duration-300"></div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickStartGuide;