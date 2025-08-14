import React, { memo, useMemo } from 'react';

interface ScoreDisplayProps {
  scores: {
    overall?: number;
    ats?: number;
    content?: number;
    design?: number;
  };
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ScoreDisplay = memo<ScoreDisplayProps>(({ 
  scores, 
  showLabels = true, 
  size = 'medium' 
}) => {
  // Memoizza i calcoli dei punteggi e delle configurazioni
  const processedScores = useMemo(() => {
    const scoreEntries = Object.entries(scores)
      .filter(([_, value]) => value && value > 0)
      .map(([key, value]) => ({
        key,
        value: value as number,
        title: getScoreTitle(key),
        colorClass: getScoreColorClass(value as number),
        borderColorClass: getBorderColorClass(value as number),
        progressWidth: Math.min(Math.max(value as number, 0), 100)
      }));
    
    return scoreEntries;
  }, [scores]);

  // Memoizza le configurazioni di dimensione
  const sizeConfig = useMemo(() => {
    const configs = {
      small: {
        containerClass: 'grid-cols-2 gap-2',
        cardClass: 'p-3',
        titleClass: 'text-xs',
        scoreClass: 'text-2xl',
        progressHeight: 'h-1'
      },
      medium: {
        containerClass: 'grid-cols-2 lg:grid-cols-4 gap-4',
        cardClass: 'p-4',
        titleClass: 'text-sm',
        scoreClass: 'text-4xl',
        progressHeight: 'h-2'
      },
      large: {
        containerClass: 'grid-cols-1 md:grid-cols-2 gap-6',
        cardClass: 'p-6',
        titleClass: 'text-base',
        scoreClass: 'text-5xl',
        progressHeight: 'h-3'
      }
    };
    return configs[size];
  }, [size]);

  if (processedScores.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {showLabels && (
        <h2 className="text-2xl font-bold text-slate-200">Riepilogo Punteggi</h2>
      )}
      <div className={`grid ${sizeConfig.containerClass}`}>
        {processedScores.map((score) => (
          <ScoreCard 
            key={score.key}
            score={score}
            sizeConfig={sizeConfig}
          />
        ))}
      </div>
    </div>
  );
});

// Componente ScoreCard memoizzato
const ScoreCard = memo<{
  score: {
    key: string;
    value: number;
    title: string;
    colorClass: string;
    borderColorClass: string;
    progressWidth: number;
  };
  sizeConfig: any;
}>(({ score, sizeConfig }) => {
  return (
    <div className={`bg-slate-800/60 ${sizeConfig.cardClass} rounded-lg border-t-4 ${score.borderColorClass} flex flex-col justify-center items-center text-center shadow-md hover:shadow-lg transition-shadow duration-200`}>
      <span className={`${sizeConfig.titleClass} font-medium text-slate-400 mb-1`}>
        {score.title}
      </span>
      <p className={`${sizeConfig.scoreClass} font-bold ${score.colorClass} mb-2`}>
        {score.value}%
      </p>
      
      {/* Barra di progresso */}
      <div className={`w-full bg-slate-700/50 rounded-full ${sizeConfig.progressHeight} overflow-hidden`}>
        <div 
          className={`${sizeConfig.progressHeight} rounded-full transition-all duration-1000 ease-out ${score.colorClass.replace('text-', 'bg-')}`}
          style={{ width: `${score.progressWidth}%` }}
        />
      </div>
      
      {/* Indicatore di performance */}
      <div className="mt-2 flex items-center gap-1">
        <PerformanceIndicator value={score.value} />
        <span className={`text-xs ${score.colorClass} font-medium`}>
          {getPerformanceLabel(score.value)}
        </span>
      </div>
    </div>
  );
});

// Componente indicatore di performance memoizzato
const PerformanceIndicator = memo<{ value: number }>(({ value }) => {
  const getIndicatorIcon = (score: number) => {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    return '🔴';
  };
  
  return <span className="text-sm">{getIndicatorIcon(value)}</span>;
});

// Funzioni helper memoizzate
const getScoreTitle = (key: string): string => {
  const titles: Record<string, string> = {
    overall: 'Punteggio Globale',
    ats: 'Compatibilità ATS',
    content: 'Qualità Contenuto',
    design: 'Design & Layout'
  };
  return titles[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const getScoreColorClass = (value: number): string => {
  if (value >= 80) return 'text-green-400';
  if (value >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

const getBorderColorClass = (value: number): string => {
  if (value >= 80) return 'border-green-500/40';
  if (value >= 60) return 'border-yellow-500/40';
  return 'border-red-500/40';
};

const getPerformanceLabel = (value: number): string => {
  if (value >= 80) return 'Eccellente';
  if (value >= 60) return 'Buono';
  if (value >= 40) return 'Sufficiente';
  return 'Da Migliorare';
};

// Componente per visualizzazione compatta
export const CompactScoreDisplay = memo<{ scores: ScoreDisplayProps['scores'] }>(({ scores }) => {
  const averageScore = useMemo(() => {
    const validScores = Object.values(scores).filter(score => score && score > 0) as number[];
    if (validScores.length === 0) return 0;
    return Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
  }, [scores]);

  const colorClass = getScoreColorClass(averageScore);
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-400">Score:</span>
      <span className={`font-bold ${colorClass}`}>{averageScore}%</span>
      <PerformanceIndicator value={averageScore} />
    </div>
  );
});

// Componente per visualizzazione dettagliata con grafici
export const DetailedScoreDisplay = memo<{ scores: ScoreDisplayProps['scores'] }>(({ scores }) => {
  const processedScores = useMemo(() => {
    return Object.entries(scores)
      .filter(([_, value]) => value && value > 0)
      .map(([key, value]) => ({
        key,
        value: value as number,
        title: getScoreTitle(key),
        colorClass: getScoreColorClass(value as number)
      }));
  }, [scores]);

  if (processedScores.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200">Analisi Dettagliata Punteggi</h3>
      {processedScores.map((score) => (
        <div key={score.key} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-300 font-medium">{score.title}</span>
            <span className={`font-bold ${score.colorClass}`}>{score.value}%</span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ease-out ${score.colorClass.replace('text-', 'bg-')}`}
              style={{ width: `${Math.min(Math.max(score.value, 0), 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

ScoreDisplay.displayName = 'ScoreDisplay';
ScoreCard.displayName = 'ScoreCard';
PerformanceIndicator.displayName = 'PerformanceIndicator';
CompactScoreDisplay.displayName = 'CompactScoreDisplay';
DetailedScoreDisplay.displayName = 'DetailedScoreDisplay';

export default ScoreDisplay;