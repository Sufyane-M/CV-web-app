import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileText, 
  Sparkles, 
  Target, 
  Info,
  ChevronDown,
  ChevronUp,
  Lightbulb
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../ui/Card';
import { cn } from '../../utils/cn';

interface JobDescriptionProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const JobDescription: React.FC<JobDescriptionProps> = ({ 
  value, 
  onChange, 
  className 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Memoize expensive calculations to prevent unnecessary re-renders
  const charCount = useMemo(() => value.length, [value]);
  const hasContent = useMemo(() => value.trim().length > 0, [value]);
  const isLongContent = useMemo(() => value.length > 500, [value]);
  const textareaRows = useMemo(() => {
    return hasContent ? Math.max(6, Math.ceil(value.length / 80)) : 4;
  }, [hasContent, value.length]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (!isExpanded) {
      setIsExpanded(true);
    }
  }, [isExpanded]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  return (
    <div className={cn("group", className)}>
      <Card 
        className={cn(
          "transition-all duration-300 ease-in-out",
          "border-2",
          isFocused 
            ? "border-primary-400 shadow-lg shadow-primary-100 dark:shadow-primary-900/20 ring-4 ring-primary-100 dark:ring-primary-900/20" 
            : hasContent 
              ? "border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-900/10" 
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
          "hover:shadow-md"
        )}
        hover
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                hasContent 
                  ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg" 
                  : isFocused 
                    ? "bg-gradient-to-br from-primary-500 to-blue-600 text-white shadow-lg" 
                    : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-600 dark:text-gray-300"
              )}>
                {hasContent ? (
                  <Target className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Job Description
                  </h2>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-200",
                    hasContent 
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  )}>
                    {hasContent ? "Attiva" : "Opzionale"}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {hasContent 
                    ? "Analisi mirata attivata per questa posizione" 
                    : "Inserisci la descrizione del lavoro per un'analisi più precisa"}
                </p>
              </div>
            </div>
            
            {/* Info Button */}
            <button
              onClick={toggleExpanded}
              className={cn(
                "flex-shrink-0 p-2 rounded-lg transition-all duration-200",
                "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                "hover:bg-gray-100 dark:hover:bg-gray-700",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              )}
              aria-label={isExpanded ? "Nascondi suggerimenti" : "Mostra suggerimenti"}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Expanded Tips Section */}
          {isExpanded && (
            <div className={cn(
              "p-4 rounded-xl border transition-all duration-300",
              "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
              "border-blue-200 dark:border-blue-800"
            )}>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    💡 Suggerimenti per ottenere risultati migliori
                  </h4>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1.5 leading-relaxed">
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Includi <strong>requisiti specifici</strong> e competenze richieste</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Aggiungi <strong>responsabilità principali</strong> del ruolo</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Specifica <strong>tecnologie e strumenti</strong> utilizzati</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Menziona <strong>livello di esperienza</strong> richiesto</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Textarea Container */}
          <div className="relative">
            <div className={cn(
              "relative rounded-xl border-2 transition-all duration-300",
              isFocused 
                ? "border-primary-300 dark:border-primary-600 shadow-lg shadow-primary-100 dark:shadow-primary-900/20" 
                : hasContent 
                  ? "border-green-200 dark:border-green-700" 
                  : "border-gray-200 dark:border-gray-600",
              "bg-white dark:bg-gray-800",
              "overflow-hidden"
            )}>
              {/* Gradient Border Effect */}
              {isFocused && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-blue-500/20 to-purple-500/20 rounded-xl" />
              )}
              
              <textarea
                value={value}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="Incolla qui la job description del lavoro che ti interessa...\n\nEsempio:\n• Sviluppatore Frontend con 3+ anni di esperienza\n• Competenze richieste: React, TypeScript, Tailwind CSS\n• Responsabilità: sviluppo interfacce utente responsive\n• Collaborazione con team UX/UI e backend"
                className={cn(
                  "relative w-full p-4 bg-transparent resize-none",
                  "text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
                  "focus:outline-none focus:ring-0 border-0",
                  "text-sm leading-relaxed",
                  hasContent ? "min-h-[120px]" : "min-h-[100px]",
                  isLongContent && "min-h-[160px]"
                )}
                rows={textareaRows}
              />
              
              {/* Character Counter & Status */}
              <div className={cn(
                "flex items-center justify-between px-4 py-2",
                "bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-600"
              )}>
                <div className="flex items-center space-x-3">
                  {hasContent && (
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">
                        Analisi mirata attiva
                      </span>
                    </div>
                  )}
                  
                  {!hasContent && (
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Analisi generale se vuoto
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "text-xs font-medium",
                    charCount > 2000 
                      ? "text-amber-600 dark:text-amber-400" 
                      : "text-gray-500 dark:text-gray-400"
                  )}>
                    {charCount.toLocaleString()}
                  </span>
                  {charCount > 2000 && (
                    <div className="flex items-center space-x-1">
                      <Info className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        Testo lungo
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Help Text */}
          <div className={cn(
            "flex items-start space-x-2 p-3 rounded-lg transition-all duration-200",
            hasContent 
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
              : "bg-gray-50 dark:bg-gray-800/50"
          )}>
            <Info className={cn(
              "h-4 w-4 mt-0.5 flex-shrink-0",
              hasContent 
                ? "text-green-600 dark:text-green-400" 
                : "text-gray-400 dark:text-gray-500"
            )} />
            <p className={cn(
              "text-xs leading-relaxed",
              hasContent 
                ? "text-green-700 dark:text-green-300" 
                : "text-gray-600 dark:text-gray-400"
            )}>
              {hasContent 
                ? "L'analisi sarà personalizzata in base ai requisiti e alle responsabilità specificate nella job description." 
                : "Se lasciato vuoto, verrà effettuata un'analisi generale del CV con suggerimenti di miglioramento standard."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobDescription;