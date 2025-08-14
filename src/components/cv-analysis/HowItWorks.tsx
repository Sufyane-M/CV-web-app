import React from 'react';
import Card, { CardContent, CardHeader } from '../ui/Card';
import { Info, Upload, Target, BarChart3, Sparkles, X } from 'lucide-react';

interface HowItWorksProps {
  onClose?: () => void;
}

const StepItem: React.FC<{
  icon: React.ReactNode;
  children: React.ReactNode;
  index: number;
}> = ({ icon, children, index }) => {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-blue-200/70 dark:border-blue-800/60 bg-white/70 dark:bg-blue-900/10 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-br from-blue-500/5 to-cyan-400/5" />
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800 transition-transform duration-200 group-hover:scale-105">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-blue-900 dark:text-blue-100 leading-6">{children}</p>
        </div>
        <div className="ml-2 text-xs font-semibold text-blue-500/70 dark:text-blue-300/60">{String(index).padStart(2, '0')}</div>
      </div>
    </div>
  );
};

const HowItWorks: React.FC<HowItWorksProps> = ({ onClose }) => {
  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/60 dark:bg-blue-900/20 dark:border-blue-800">
      <CardHeader className="pb-3 border-none">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 ring-1 ring-blue-200 dark:ring-blue-700">
              <Info className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Come funziona l'analisi CV</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Chiudi"
              className="rounded-md p-1 text-blue-700 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-300 dark:hover:text-white dark:hover:bg-blue-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StepItem index={1} icon={<Upload className="h-5 w-5" />}>
            • <strong>Carica il tuo CV</strong> in formato PDF (max 10MB)
          </StepItem>
          <StepItem index={2} icon={<Target className="h-5 w-5" />}>
            • <strong>Aggiungi una job description</strong> (opzionale) per un'analisi mirata
          </StepItem>
          <StepItem index={3} icon={<BarChart3 className="h-5 w-5" />}>
            • <strong>Ricevi un'analisi completa</strong> con punteggi e suggerimenti personalizzati
          </StepItem>
          <StepItem index={4} icon={<Sparkles className="h-5 w-5" />}>
            • <strong>Migliora il tuo CV</strong> seguendo i consigli dell'AI
          </StepItem>
        </div>
      </CardContent>
    </Card>
  );
};

export default HowItWorks;


