import React from 'react';
import Button from '../ui/Button';
import Card, { CardContent } from '../ui/Card';
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
  const disabled = !canAnalyze || isAnalyzing;

  return (
    <Card className={cn('mb-6', className)}>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <Button
            size="lg"
            onClick={onStartAnalysis}
            disabled={disabled}
            loading={isAnalyzing}
            className="w-full sm:w-auto"
          >
            {isAnalyzing ? 'Analisi in corso...' : 'Inizia Analisi'}
          </Button>
          {!isAnalyzing && !canAnalyze && (
            <p className="text-sm text-gray-500">
              {!hasFile ? 'Carica un file PDF per continuare' : 'Non puoi avviare l\'analisi al momento'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedAnalysisButton;