
import React, { memo, useMemo } from 'react';

import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { WarningIcon } from './icons/WarningIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { QuoteIcon } from './icons/QuoteIcon';

// Import dei componenti ottimizzati
import OptimizedScoreDisplay from '../optimized/ScoreDisplay';
// Rimosso: componenti ottimizzati deprecati

interface JsonResponseDisplayProps {
    data: any;
    onReset: () => void;
}

// Riepilogo Esecutivo ottimizzato con memoization
const ExecutiveSummary = memo<{ summary: string }>(({ summary }) => (
    <div className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
            <QuoteIcon className="w-6 h-6 text-blue-400 flex-shrink-0" />
            Riepilogo Esecutivo
        </h2>
        <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-blue-500">
            <p className="text-slate-300 italic leading-relaxed">{summary}</p>
        </div>
    </div>
));

ExecutiveSummary.displayName = 'ExecutiveSummary';

// Tag per le Parole Chiave ottimizzato con memoization
const KeywordTag = memo<{ keyword: string; type: 'found' | 'missing' }>(({ keyword, type }) => {
    const style = useMemo(() => {
        return type === 'found' 
            ? 'bg-green-500/20 text-green-300 border-green-500/30' 
            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    }, [type]);
    
    return <span className={`px-3 py-1 text-sm font-medium rounded-full border ${style}`}>{keyword}</span>;
});

KeywordTag.displayName = 'KeywordTag';

// Analisi di Corrispondenza ottimizzata con memoization
const MatchAnalysisDisplay = memo<{ analysis: any }>(({ analysis }) => {
    const { matchScore, keywordsFound, keywordsMissing } = analysis || {};
    const foundArray = Array.isArray(keywordsFound)
        ? keywordsFound
        : (keywordsFound != null ? [keywordsFound] : []);
    const missingArray = Array.isArray(keywordsMissing)
        ? keywordsMissing
        : (keywordsMissing != null ? [keywordsMissing] : []);
    
    // Memoizza i calcoli pesanti
    const circleData = useMemo(() => {
        const radius = 45;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (matchScore / 100) * circumference;
        const scoreColorClass = matchScore >= 75 ? 'text-green-400' : matchScore >= 50 ? 'text-yellow-400' : 'text-red-400';
        const trackColorClass = matchScore >= 75 ? 'stroke-green-500/80' : matchScore >= 50 ? 'stroke-yellow-500/80' : 'stroke-red-500/80';
        
        return { radius, circumference, offset, scoreColorClass, trackColorClass };
    }, [matchScore]);
    
    const { radius, circumference, offset, scoreColorClass, trackColorClass } = circleData;

    return (
        <div className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-200">Analisi di Corrispondenza</h2>
            <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 flex flex-col md:flex-row items-center gap-6">
                <div className="relative w-36 h-36 md:w-40 md:h-40 flex-shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle className="stroke-slate-700" strokeWidth="8" cx="50" cy="50" r={radius} fill="transparent" />
                        <circle 
                            className={`${trackColorClass} transition-all duration-1000 ease-out`}
                            strokeWidth="8" 
                            strokeLinecap="round"
                            cx="50" 
                            cy="50" 
                            r={radius} 
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            transform="rotate(-90 50 50)"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl md:text-4xl font-bold ${scoreColorClass}`}>{matchScore}%</span>
                        <span className="text-xs md:text-sm font-medium text-slate-400 mt-1">Match</span>
                    </div>
                </div>
                
                <div className="flex-grow w-full space-y-4">
                    <div>
                        <h3 className="font-semibold text-slate-300 mb-2">Parole Chiave Trovate</h3>
                        <div className="flex flex-wrap gap-2">
                            {foundArray.length > 0 ? (
                                foundArray.map((k, i) => <KeywordTag key={`found-${i}`} keyword={k} type="found" />)
                            ) : (
                                <p className="text-sm text-slate-500 italic">Nessuna parola chiave corrispondente trovata.</p>
                            )}
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-slate-300 mb-2">Parole Chiave Mancanti</h3>
                        <div className="flex flex-wrap gap-2">
                           {missingArray.length > 0 ? (
                                missingArray.map((k, i) => <KeywordTag key={`missing-${i}`} keyword={k} type="missing" />)
                            ) : (
                                <p className="text-sm text-slate-500 italic">Ottimo! Nessuna parola chiave rilevante mancante.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

MatchAnalysisDisplay.displayName = 'MatchAnalysisDisplay';

// Card Punteggi
const ScoreCard: React.FC<{ title: string; score?: number }> = ({ title, score }) => {
  if (score === undefined || score === null || score === 0) return null;
  const scoreColorClass = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  const borderColorClass = score >= 80 ? 'border-green-500/40' : score >= 60 ? 'border-yellow-500/40' : 'border-red-500/40';
  const toArray = (value: any): any[] => {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];
    return [value];
  };

  const normalizedSuggestions = useMemo(() => {
    const raw = suggestions ?? {};
    return {
      critical: toArray((raw && typeof raw === 'object' && 'critical' in raw) ? (raw as any).critical : (Array.isArray(raw) ? raw : undefined)),
      warnings: toArray((raw && typeof raw === 'object' && 'warnings' in raw) ? (raw as any).warnings : undefined),
      successes: toArray((raw && typeof raw === 'object' && 'successes' in raw) ? (raw as any).successes : undefined)
    };
  }, [suggestions]);

  return (
    <div className={`bg-slate-800/60 p-4 rounded-lg border-t-4 ${borderColorClass} flex flex-col justify-center items-center text-center shadow-md`}>
      <span className="text-sm font-medium text-slate-400">{title}</span>
      <p className={`text-4xl font-bold mt-1 ${scoreColorClass}`}>{score}</p>
    </div>
  );
};

// Card Suggerimenti
const SuggestionCard: React.FC<{ item: any; type: 'critical' | 'warning' | 'success' }> = ({ item, type }) => {
  const config = {
    critical: { icon: <XCircleIcon className="w-6 h-6 text-red-400" />, titleColor: 'text-red-300', borderColor: 'border-red-500/30' },
    warning: { icon: <WarningIcon className="w-6 h-6 text-yellow-400" />, titleColor: 'text-yellow-300', borderColor: 'border-yellow-500/30' },
    success: { icon: <CheckCircleIcon className="w-6 h-6 text-green-400" />, titleColor: 'text-green-300', borderColor: 'border-green-500/30' },
  };
  const currentConfig = config[type];
  const categoryColors: { [key: string]: string } = {
      'ATS': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      'Content': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'Design': 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  };
  const categoryStyle = categoryColors[item.category] || 'bg-slate-600/50 text-slate-300 border-slate-500/30';

  return (
    <div className={`bg-slate-800/50 p-4 rounded-lg border ${currentConfig.borderColor}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">{currentConfig.icon}</div>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1 flex-wrap gap-2">
            <p className={`font-semibold ${currentConfig.titleColor}`}>{item.title}</p>
            {item.category && <span className={`px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap ${categoryStyle}`}>{item.category}</span>}
          </div>
          {item.description && <p className="text-sm text-slate-400 mt-1">{item.description}</p>}
          {item.suggestion && <p className="text-sm text-slate-300 mt-2 bg-slate-900/50 p-2 rounded"><strong>Suggerimento:</strong> {item.suggestion}</p>}
          {item.example && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <p className="text-sm font-semibold text-slate-300 mb-1">Esempio Pratico:</p>
              <code className="text-sm text-slate-400 bg-slate-900/60 p-2 rounded-md block whitespace-pre-wrap font-mono">{item.example}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente Principale ottimizzato con memoization
const JsonResponseDisplay = memo<JsonResponseDisplayProps>(({ data, onReset }) => {
  const { executiveSummary, matchAnalysis, overallScore, atsScore, contentScore, designScore, suggestions } = data;

  // Memoizza i controlli di presenza dati
  const dataChecks = useMemo(() => {
    const hasScores = [overallScore, atsScore, contentScore, designScore].some(s => s !== undefined && s !== null);
    const hasSuggestions = suggestions && (suggestions.critical?.length > 0 || suggestions.warnings?.length > 0 || suggestions.successes?.length > 0);
    const hasMatchAnalysis = matchAnalysis && matchAnalysis.matchScore !== undefined && matchAnalysis.matchScore > 0;
    const hasAnyContent = hasScores || hasSuggestions || executiveSummary || hasMatchAnalysis;
    
    return { hasScores, hasSuggestions, hasMatchAnalysis, hasAnyContent };
  }, [overallScore, atsScore, contentScore, designScore, suggestions, matchAnalysis, executiveSummary]);
  
  const { hasScores, hasSuggestions, hasMatchAnalysis, hasAnyContent } = dataChecks;

  return (
    <div className="flex flex-col space-y-8 animate-fade-in w-full">
      <div>
        <h2 className="text-3xl font-bold text-center text-slate-100">Analisi Completata!</h2>
        <p className="text-center text-slate-400 mt-1">Ecco i risultati dettagliati del tuo CV.</p>
      </div>
      
      {executiveSummary && <ExecutiveSummary summary={executiveSummary} />}
      {hasMatchAnalysis && <MatchAnalysisDisplay analysis={matchAnalysis} />}

      {hasScores && (
        <OptimizedScoreDisplay 
          scores={{
            overall: overallScore,
            ats: atsScore,
            content: contentScore,
            design: designScore
          }}
          showLabels={true}
          size="medium"
        />
      )}

       {hasSuggestions && (
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-200">Suggerimenti</h2>
            <div className="grid gap-3">
              {normalizedSuggestions.critical.slice(0, 5).map((item: any, idx: number) => (
                <SuggestionCard key={`critical-${idx}`} item={item} type="critical" />
              ))}
              {normalizedSuggestions.warnings.slice(0, 5).map((item: any, idx: number) => (
                <SuggestionCard key={`warning-${idx}`} item={item} type="warning" />
              ))}
              {normalizedSuggestions.successes.slice(0, 5).map((item: any, idx: number) => (
                <SuggestionCard key={`success-${idx}`} item={item} type="success" />
              ))}
            </div>
          </div>
       )}
      
      {!hasAnyContent && (
          <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700">
              <p className="text-center text-slate-400 py-4">L'analisi non ha prodotto punteggi o suggerimenti. Ecco i dati grezzi:</p>
              <pre className="text-sm text-slate-300 whitespace-pre-wrap break-words"><code>{JSON.stringify(data, null, 2)}</code></pre>
          </div>
      )}
      
      <div className="pt-4 border-t border-slate-700/50">
        <button
          onClick={onReset}
          className="w-full sm:w-auto mx-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transform hover:scale-105 flex items-center justify-center gap-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            Analizza un altro CV
        </button>
      </div>
    </div>
  );
});

JsonResponseDisplay.displayName = 'JsonResponseDisplay';

export default JsonResponseDisplay;
