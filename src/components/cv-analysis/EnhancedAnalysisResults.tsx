import React, { memo, useMemo, useState, useCallback } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Award, 
  Target, 
  Eye, 
  EyeOff, 
  CreditCard, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  BarChart3,
  Brain,
  Zap,
  BookOpen,
  Hash,
  Search,
  X,
  Crown,
  Download,
  TrendingUp as MatchIcon,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Card, { CardHeader, CardContent } from '../ui/Card';
import Badge, { ScoreBadge } from '../ui/Badge';
import Input from '../ui/Input';
import { formatDate } from '../../utils/formatters';
import type { CVAnalysis } from '../../types/index';

interface EnhancedAnalysisResultsProps {
  analysis: CVAnalysis;
  onNewAnalysis: () => void;
  onUpgrade: () => void;
}

const EnhancedAnalysisResults: React.FC<EnhancedAnalysisResultsProps> = ({ 
  analysis, 
  onNewAnalysis, 
  onUpgrade 
}) => {
  const [showBlurred, setShowBlurred] = useState(true);

  const { profile } = useAuth();
  
  // Determina se l'analisi dovrebbe essere limitata
  const isUserPremium = profile?.subscription_status === 'active';
  const isLimitedAnalysis = analysis.analysis_type === 'limited' && !isUserPremium;
  const canUpgrade = analysis.analysis_type === 'limited' && !isUserPremium && analysis.can_upgrade;

  // Memoizza i dati processati
  const processedData = useMemo(() => {
    const toArray = (value: any): any[] => {
      if (Array.isArray(value)) return value;
      if (value === undefined || value === null) return [];
      return [value];
    };

    const scores = {
      overall: analysis.overall_score || 0,
      ats: analysis.ats_score || 0,
      content: analysis.content_score || 0,
      design: analysis.design_score || 0
    };
    
    const hasScores = Object.values(scores).some(score => score > 0);
    const averageScore = hasScores ? Math.round(Object.values(scores).filter(s => s > 0).reduce((a, b) => a + b, 0) / Object.values(scores).filter(s => s > 0).length) : 0;
    
    const rawSuggestions: any = analysis.suggestions ?? {};
    const normalizedSuggestions = {
      critical: toArray((rawSuggestions && typeof rawSuggestions === 'object' && 'critical' in rawSuggestions) ? (rawSuggestions as any).critical : (Array.isArray(rawSuggestions) ? rawSuggestions : undefined)),
      warnings: toArray((rawSuggestions && typeof rawSuggestions === 'object' && 'warnings' in rawSuggestions) ? (rawSuggestions as any).warnings : undefined),
      successes: toArray((rawSuggestions && typeof rawSuggestions === 'object' && 'successes' in rawSuggestions) ? (rawSuggestions as any).successes : undefined)
    };
    const totalSuggestions = (normalizedSuggestions.critical.length) + (normalizedSuggestions.warnings.length) + (normalizedSuggestions.successes.length);
    
    return {
      scores,
      hasScores,
      averageScore,
      suggestions: normalizedSuggestions,
      totalSuggestions,
      hasMatchAnalysis: !!analysis.match_analysis && analysis.match_analysis !== 0
    };
  }, [analysis]);

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Brain className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">Analisi Completata</h1>
                <p className="text-blue-100 text-lg">
                  Analisi completata il {formatDate(analysis.created_at)}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onNewAnalysis}
              leftIcon={<FileText className="h-4 w-4" />}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              Nuova Analisi
            </Button>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Punteggio Medio</p>
                  <p className="text-2xl font-bold">{processedData.averageScore}%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Target className="h-5 w-5 text-yellow-300" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Suggerimenti</p>
                  <p className="text-2xl font-bold">{processedData.totalSuggestions}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Award className="h-5 w-5 text-purple-300" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Tipo Analisi</p>
                  <p className="text-lg font-semibold capitalize">
                    {analysis.analysis_type === 'limited' ? 'Gratuita' : 'Completa'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Content in Single View */}
       <div className="enhanced-analysis-content space-y-8">
        <OverviewTab 
          analysis={analysis} 
          processedData={processedData}
          isLimitedAnalysis={isLimitedAnalysis}
          onUpgrade={onUpgrade}
        />
        
        <DetailedTab 
          analysis={analysis} 
          processedData={processedData}
          isLimitedAnalysis={isLimitedAnalysis}
          onUpgrade={onUpgrade}
        />
        
        <SuggestionsTab 
          analysis={analysis} 
          processedData={processedData}
          isLimitedAnalysis={isLimitedAnalysis}
          onUpgrade={onUpgrade}
        />
      </div>

      {/* Upgrade Banner - Migliorato */}
      {canUpgrade && (
        <Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/80 via-white to-purple-50/80 dark:from-blue-950/30 dark:via-gray-900 dark:to-purple-950/30 shadow-xl">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/10 to-blue-400/10 rounded-full blur-2xl" />
          
          <CardContent className="relative p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              {/* Left section - Content */}
              <div className="flex-1 space-y-6">
                {/* Header with icon */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Crown className="h-7 w-7 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Sparkles className="h-3 w-3 text-yellow-800" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                      Sblocca il Potenziale Completo
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-base mt-1">
                      Accedi a tutti i suggerimenti dettagliati, analisi di compatibilità e funzionalità premium
                    </p>
                  </div>
                </div>

                {/* Features grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <Brain className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Analisi completa</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Report esportabile</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <MatchIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Match analysis</span>
                  </div>
                </div>
              </div>

              {/* Right section - CTA */}
              <div className="flex flex-col items-center lg:items-end text-center lg:text-right space-y-4">
                {/* Price */}
                <div className="space-y-1">
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    €4,99
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pagamento unico</p>
                </div>
                
                {/* CTA Button */}
                <Button
                  onClick={onUpgrade}
                  rightIcon={<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />}
                  className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 border-0 min-w-[200px]"
                >
                  <span className="relative z-10">Upgrade Ora</span>
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Button>
                
                {/* Trust indicator */}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Sicuro e protetto</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{
  analysis: CVAnalysis;
  processedData: any;
  isLimitedAnalysis: boolean;
  onUpgrade: () => void;
}> = ({ analysis, processedData, isLimitedAnalysis, onUpgrade }) => {
  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      {analysis.executive_summary && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Riepilogo Esecutivo
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: analysis.executive_summary }}
            />
          </CardContent>
        </Card>
      )}




    </div>
  );
};

// Detailed Tab Component
const DetailedTab: React.FC<{
  analysis: CVAnalysis;
  processedData: any;
  isLimitedAnalysis: boolean;
  onUpgrade: () => void;
}> = ({ analysis, processedData, isLimitedAnalysis, onUpgrade }) => {
  // State & Memos for enhanced Keywords UI
  const [keywordQuery, setKeywordQuery] = useState('');
  const [view, setView] = useState<'all' | 'found' | 'missing'>('all');
  const [sortMode, setSortMode] = useState<'relevance' | 'alphabetical'>('relevance');
  const [showAllFound, setShowAllFound] = useState(false);
  const [showAllMissing, setShowAllMissing] = useState(false);
  const [copied, setCopied] = useState<'none' | 'found' | 'missing' | 'error'>('none');

  const originalFound = analysis.keywords_found || [];
  const originalMissing = analysis.keywords_missing || [];
  const totalKeywords = (originalFound?.length || 0) + (originalMissing?.length || 0);
  const matchPercentage = totalKeywords > 0
    ? Math.round(((originalFound?.length || 0) / totalKeywords) * 100)
    : 0;

  const normalizedQuery = keywordQuery.trim().toLowerCase();

  const found = useMemo(() => {
    let arr = originalFound as string[];
    if (normalizedQuery) {
      arr = arr.filter(k => k.toLowerCase().includes(normalizedQuery));
    }
    if (sortMode === 'alphabetical') {
      arr = [...arr].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }
    return arr;
  }, [originalFound, normalizedQuery, sortMode]);

  const missing = useMemo(() => {
    let arr = originalMissing as string[];
    if (normalizedQuery) {
      arr = arr.filter(k => k.toLowerCase().includes(normalizedQuery));
    }
    if (sortMode === 'alphabetical') {
      arr = [...arr].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }
    // keep default relevance order when sortMode === 'relevance'
    return arr;
  }, [originalMissing, normalizedQuery, sortMode]);

  const handleCopy = useCallback(async (type: 'found' | 'missing') => {
    const list = type === 'found' ? found : missing;
    if (!list?.length) return;

    // Check if clipboard API is available
    if (!navigator.clipboard) {
      console.error('Clipboard API not available');
      setCopied('error');
      setTimeout(() => setCopied('none'), 3000);
      return;
    }

    try {
      await navigator.clipboard.writeText(list.join(', '));
      setCopied(type);
      setTimeout(() => setCopied('none'), 1500);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setCopied('error');
      setTimeout(() => setCopied('none'), 3000);
    }
  }, [found, missing]);

  return (
    <div className="space-y-6">
      {/* Match Analysis */}
      {processedData.hasMatchAnalysis && (
        <BlurOverlay isBlurred={isLimitedAnalysis} onUpgrade={onUpgrade}>
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Analisi di Compatibilità
                </h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                {typeof analysis.match_analysis === 'string' ? (
                  <p className="text-gray-700 dark:text-gray-300">{analysis.match_analysis}</p>
                ) : (
                  <div className="text-gray-700 dark:text-gray-300">
                    {JSON.stringify(analysis.match_analysis, null, 2)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </BlurOverlay>
      )}

      {/* Keywords Analysis - Show only if match_analysis is not "0" (meaning job_description was provided) */}
      {(analysis.keywords_found || analysis.keywords_missing) && analysis.match_analysis !== "0" && analysis.match_analysis !== 0 && (
        <Card>
          {/* Header sempre visibile */}
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Hash className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Analisi Keywords
                </h3>
              </div>
              {totalKeywords > 0 && !isLimitedAnalysis && (
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Match:</span>
                    <ScoreBadge score={matchPercentage} />
                  </div>
                  <div className="w-36 md:w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" aria-hidden>
                    <div
                      className="h-2 bg-green-500 dark:bg-green-400 rounded-full"
                      style={{ width: `${matchPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          
          {/* Contenuto con BlurOverlay */}
          <BlurOverlay isBlurred={isLimitedAnalysis} onUpgrade={onUpgrade}>
            <CardContent>
              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
                <div className="md:col-span-5">
                  <Input
                    placeholder="Cerca keyword..."
                    aria-label="Cerca keyword"
                    leftIcon={<Search className="h-5 w-5" />}
                    value={keywordQuery}
                    onChange={(e) => setKeywordQuery(e.target.value)}
                    variant="filled"
                    inputSize="md"
                  />
                </div>

                <div className="md:col-span-4 flex items-center gap-2" role="group" aria-label="Filtro visualizzazione">
                  <Button
                    variant={view === 'all' ? 'primary' : 'outline'}
                    size="sm"
                    aria-pressed={view === 'all'}
                    onClick={() => setView('all')}
                  >
                    Tutte
                  </Button>
                  <Button
                    variant={view === 'found' ? 'primary' : 'outline'}
                    size="sm"
                    aria-pressed={view === 'found'}
                    onClick={() => setView('found')}
                  >
                    Trovate
                  </Button>
                  <Button
                    variant={view === 'missing' ? 'primary' : 'outline'}
                    size="sm"
                    aria-pressed={view === 'missing'}
                    onClick={() => setView('missing')}
                  >
                    Mancanti
                  </Button>
                </div>

                <div className="md:col-span-3 flex items-center gap-2 justify-start md:justify-end" role="group" aria-label="Ordinamento">
                  <Button
                    variant={sortMode === 'relevance' ? 'secondary' : 'outline'}
                    size="sm"
                    aria-pressed={sortMode === 'relevance'}
                    onClick={() => setSortMode('relevance')}
                    title="Ordina per rilevanza"
                  >
                    Rilevanza
                  </Button>
                  <Button
                    variant={sortMode === 'alphabetical' ? 'secondary' : 'outline'}
                    size="sm"
                    aria-pressed={sortMode === 'alphabetical'}
                    onClick={() => setSortMode('alphabetical')}
                    title="Ordina alfabeticamente"
                  >
                    A–Z
                  </Button>
                </div>
              </div>

              {/* Quick stats for mobile */}
              {totalKeywords > 0 && (
                <div className="md:hidden mb-4 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{originalFound.length}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Trovate</div>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{originalMissing.length}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Mancanti</div>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{matchPercentage}%</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Match</div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy('found')}
                  disabled={found.length === 0}
                  aria-live="polite"
                >
                  {copied === 'found' ? 'Copiato ✓' : copied === 'error' ? 'Errore ✗' : 'Copia trovate'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy('missing')}
                  disabled={missing.length === 0}
                  aria-live="polite"
                >
                  {copied === 'missing' ? 'Copiato ✓' : copied === 'error' ? 'Errore ✗' : 'Copia mancanti'}
                </Button>
              </div>

              {/* Lists */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Keywords Found */}
                {((view === 'all' || view === 'found') && found.length > 0) && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Keywords Trovate ({found.length})
                        </h4>
                      </div>
                      {found.length > 30 && (
                        <Button size="sm" variant="ghost" onClick={() => setShowAllFound(!showAllFound)}>
                          {showAllFound ? 'Mostra meno' : `Mostra tutte (${found.length})`}
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2" role="list" aria-label="Elenco keywords trovate">
                      {(showAllFound ? found : found.slice(0, 30)).map((keyword, index) => (
                        <Badge 
                          key={`found-${index}`} 
                          variant="success" 
                          size="md"
                          rounded
                          className="text-sm px-3 py-1"
                          role="listitem"
                        >
                          {keyword}
                        </Badge>
                      ))}
                      {found.length === 0 && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">Nessuna keyword trovata</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Keywords Missing */}
                {((view === 'all' || view === 'missing') && missing.length > 0) && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Keywords Mancanti ({missing.length})
                        </h4>
                      </div>
                      {missing.length > 30 && (
                        <Button size="sm" variant="ghost" onClick={() => setShowAllMissing(!showAllMissing)}>
                          {showAllMissing ? 'Mostra meno' : `Mostra tutte (${missing.length})`}
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2" role="list" aria-label="Elenco keywords mancanti">
                      {(showAllMissing ? missing : missing.slice(0, 30)).map((keyword, index) => (
                        <Badge 
                          key={`missing-${index}`} 
                          variant="danger" 
                          size="md"
                          rounded
                          className="text-sm px-3 py-1"
                          role="listitem"
                          title="Suggerimento: includi questa keyword nel tuo CV"
                        >
                          {keyword}
                        </Badge>
                      ))}
                      {missing.length === 0 && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">Nessuna keyword mancante</span>
                      )}
                    </div>

                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-400">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <span className="font-medium">💡 Suggerimento:</span> Inserisci queste keyword nel tuo CV per aumentare la compatibilità con la job description.
                      </p>
                    </div>
                  </div>
                )}
              </div>



              {/* ARIA live region for copy feedback (screen readers) */}
              <div className="sr-only" aria-live="polite">
                {copied === 'found' && 'Lista keywords trovate copiata negli appunti.'}
                {copied === 'missing' && 'Lista keywords mancanti copiata negli appunti.'}
                {copied === 'error' && 'Errore durante la copia negli appunti. Riprova o copia manualmente.'}
              </div>
            </CardContent>
          </BlurOverlay>
        </Card>
      )}


    </div>
  );
};

// Suggestions Tab Component
const SuggestionsTab: React.FC<{
  analysis: CVAnalysis;
  processedData: any;
  isLimitedAnalysis: boolean;
  onUpgrade: () => void;
}> = ({ analysis, processedData, isLimitedAnalysis, onUpgrade }) => {
  return (
    <div className="space-y-6">
      {/* Critical Suggestions */}
      {processedData.suggestions.critical?.length > 0 && (
        <SuggestionSection 
          title="Criticità da Risolvere"
          items={processedData.suggestions.critical}
          type="critical"
          isLimited={isLimitedAnalysis}
          onUpgrade={onUpgrade}
        />
      )}

      {/* Warning Suggestions */}
      {processedData.suggestions.warnings?.length > 0 && (
        <SuggestionSection 
          title="Aree di Miglioramento"
          items={processedData.suggestions.warnings}
          type="warning"
          isLimited={isLimitedAnalysis}
          onUpgrade={onUpgrade}
        />
      )}

      {/* Success Suggestions */}
      {processedData.suggestions.successes?.length > 0 && (
        <SuggestionSection 
          title="Punti di Forza Rilevati"
          items={processedData.suggestions.successes}
          type="success"
          isLimited={false}
          onUpgrade={onUpgrade}
        />
      )}
    </div>
  );
};

// Score Card Component
const ScoreCard: React.FC<{
  title: string;
  score: number;
  type: string;
}> = ({ title, score, type }) => {
  const getColorClasses = (score: number, type: string) => {
    if (score >= 80) return 'from-green-500 to-emerald-600 border-green-200 dark:border-green-800';
    if (score >= 60) return 'from-yellow-500 to-orange-500 border-yellow-200 dark:border-yellow-800';
    return 'from-red-500 to-pink-600 border-red-200 dark:border-red-800';
  };

  const colorClasses = getColorClasses(score, type);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className={`border-2 ${colorClasses.split(' ')[2]} hover:shadow-lg transition-all duration-300 transform hover:scale-105`}>
      <CardContent className="p-6 text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="url(#gradient-${type})"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id={`gradient-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={`text-${colorClasses.split('-')[1]}-500`} stopColor="currentColor" />
                <stop offset="100%" className={`text-${colorClasses.split('-')[3]}-600`} stopColor="currentColor" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{score}%</span>
          </div>
        </div>
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {score >= 80 ? 'Eccellente' : score >= 60 ? 'Buono' : 'Da migliorare'}
        </p>
      </CardContent>
    </Card>
  );
};

// Suggestion Preview Card Component
const SuggestionPreviewCard: React.FC<{
  title: string;
  count: number;
  items: any[];
  type: 'critical' | 'warning' | 'success';
  isLimited: boolean;
}> = ({ title, count, items, type, isLimited }) => {
  const getTypeConfig = (type: string) => {
    const configs = {
      critical: {
        icon: AlertTriangle,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800'
      },
      warning: {
        icon: Info,
        color: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800'
      },
      success: {
        icon: CheckCircle,
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800'
      }
    };
    return configs[type] || configs.warning;
  };

  const config = getTypeConfig(type);
  const Icon = config.icon;

  const itemsArray = Array.isArray(items) ? items : (items != null ? [items] : []);

  return (
    <Card className={`${config.border} ${config.bg} hover:shadow-md transition-all duration-200`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
          </div>
          <Badge variant={type === 'critical' ? 'danger' : type === 'warning' ? 'warning' : 'success'}>
            {count}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {itemsArray.slice(0, 2).map((item, index) => (
            <div key={index} className={`p-3 bg-white dark:bg-gray-800 rounded-lg ${isLimited && index > 0 ? 'blur-sm opacity-50' : ''}`}>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {typeof item === 'string' ? item : item.title || 'Suggerimento'}
              </p>
              {typeof item === 'object' && item.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {item.description.substring(0, 80)}...
                </p>
              )}
            </div>
          ))}
          
          {count > 2 && (
            <div className="text-center pt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{count - 2} altri suggerimenti
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Detailed Score Row Component
const DetailedScoreRow: React.FC<{
  title: string;
  score: number;
  type: string;
}> = ({ title, score, type }) => {
  const getColorClass = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
        <span className="text-lg font-bold text-gray-900 dark:text-white">{score}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div 
          className={`h-3 rounded-full transition-all duration-1000 ease-out ${getColorClass(score)}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {score >= 80 ? 'Eccellente performance in questa area' : 
         score >= 60 ? 'Buona performance, con margini di miglioramento' : 
         'Area che richiede attenzione e miglioramenti'}
      </p>
    </div>
  );
};

// Suggestion Section Component
const SuggestionSection: React.FC<{
  title: string;
  items: any[];
  type: 'critical' | 'warning' | 'success';
  isLimited: boolean;
  onUpgrade: () => void;
}> = ({ title, items, type, isLimited, onUpgrade }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const itemsArray = Array.isArray(items) ? items : (items != null ? [items] : []);
  const visibleItems = isLimited ? itemsArray.slice(0, 1) : (isExpanded ? itemsArray : itemsArray.slice(0, 3));
  const hasMore = itemsArray.length > (isLimited ? 1 : 3);

  const getTypeConfig = (type: string) => {
    const configs = {
      critical: {
        icon: AlertTriangle,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800'
      },
      warning: {
        icon: Info,
        color: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800'
      },
      success: {
        icon: CheckCircle,
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800'
      }
    };
    return configs[type] || configs.warning;
  };

  const config = getTypeConfig(type);
  const Icon = config.icon;

  return (
    <Card className={`${config.border}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 ${config.bg} rounded-lg`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
            <Badge variant={type === 'critical' ? 'danger' : type === 'warning' ? 'warning' : 'success'}>
              {itemsArray.length}
            </Badge>
          </div>
          {hasMore && !isLimited && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              rightIcon={isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            >
              {isExpanded ? 'Mostra meno' : `Mostra tutti (${items.length})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {visibleItems.map((item, index) => (
            <SuggestionItem key={index} item={item} type={type} />
          ))}
          
          {/* Blurred items for limited analysis */}
          {isLimited && itemsArray.length > 1 && (
            <BlurOverlay isBlurred={true} onUpgrade={onUpgrade}>
              <div className="space-y-4">
                {itemsArray.slice(1).map((item, index) => (
                  <SuggestionItem key={index + 1} item={item} type={type} />
                ))}
              </div>
            </BlurOverlay>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Suggestion Item Component
const SuggestionItem: React.FC<{
  item: any;
  type: 'critical' | 'warning' | 'success';
}> = ({ item, type }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (typeof item === 'string') {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-700 dark:text-gray-300">{item}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
          {item.title || 'Suggerimento'}
        </h4>
        {item.category && (
          <Badge variant="outline" size="sm">
            {item.category}
          </Badge>
        )}
      </div>
      
      {item.description && (
        <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
          {item.description}
        </p>
      )}
      
      {item.suggestion && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-l-blue-500 mb-4">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Suggerimento:</p>
              <p className="text-blue-800 dark:text-blue-200">{item.suggestion}</p>
            </div>
          </div>
        </div>
      )}
      
      {item.example && (
        <div className="mt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 mb-3"
          >
            <BookOpen className="h-4 w-4" />
            <span>{isExpanded ? 'Nascondi esempio' : 'Mostra esempio'}</span>
            <ChevronDown className={`h-4 w-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          {isExpanded && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="mb-2">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Esempio Pratico:
                </span>
              </div>
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                {item.example}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Blur Overlay Component - Compatto e Trasparente
const BlurOverlay: React.FC<{
  children: React.ReactNode;
  isBlurred: boolean;
  onUpgrade?: () => void;
}> = ({ children, isBlurred, onUpgrade }) => {
  if (!isBlurred) return <>{children}</>;
  
  return (
    <div className="relative">
      <div className="filter blur-[8px] pointer-events-none select-none opacity-30">
        {children}
      </div>
      {onUpgrade && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded-lg backdrop-blur-[1px]">
          <Card className="max-w-xs mx-4 shadow-xl border border-blue-200 dark:border-blue-800/50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <CardContent className="p-5 text-center">
              {/* Icon compatto */}
              <div className="relative mb-4">
                <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="h-2.5 w-2.5 text-yellow-800" />
                </div>
              </div>
              
              {/* Content compatto */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Contenuto Premium
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                Sblocca tutti i suggerimenti dettagliati.
              </p>
              
              {/* Features preview compatte */}
              <div className="flex justify-center gap-1 mb-4">
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Brain className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                  <span className="text-[10px] text-green-700 dark:text-green-300">Analisi</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Download className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[10px] text-blue-700 dark:text-blue-300">Export</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <MatchIcon className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                  <span className="text-[10px] text-purple-700 dark:text-purple-300">Match</span>
                </div>
              </div>
              
              {/* CTA Button compatto */}
              <Button
                onClick={onUpgrade}
                rightIcon={<ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />}
                className="group w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-0 text-sm"
              >
                <span className="relative z-10">Upgrade - €4,99</span>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-lg" />
              </Button>
              
              {/* Trust indicator compatto */}
              <div className="flex items-center justify-center gap-1 mt-3 text-[10px] text-gray-500 dark:text-gray-400">
                <CheckCircle className="h-2.5 w-2.5 text-green-500" />
                <span>Sicuro</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Helper function to get score titles
const getScoreTitle = (key: string): string => {
  const titles = {
    overall: 'Punteggio Generale',
    ats: 'Compatibilità ATS',
    content: 'Qualità Contenuto',
    design: 'Design e Layout'
  };
  return titles[key as keyof typeof titles] || key;
};

export default memo(EnhancedAnalysisResults);