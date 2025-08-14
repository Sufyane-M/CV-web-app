import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card, { CardContent, CardHeader } from '../ui/Card';
import { StatusBadge, ScoreBadge } from '../ui/Badge';
import Button from '../ui/Button';
import { formatRelativeTime } from '../../utils/formatters';
import type { CVAnalysis } from '../../services/supabase';
import {
  DocumentTextIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronRightIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid,
  ClockIcon as ClockIconSolid,
  XCircleIcon as XCircleIconSolid,
} from '@heroicons/react/24/solid';

interface RecentAnalysesListProps {
  analyses: CVAnalysis[];
}

const StatusIcon: React.FC<{ status: CVAnalysis['status'] }> = ({ status }) => {
  const baseClasses = 'w-4 h-4 transition-all duration-200';
  
  if (status === 'completed') {
    return <CheckCircleIconSolid className={`${baseClasses} text-emerald-500`} />;
  }
  if (status === 'failed') {
    return <XCircleIconSolid className={`${baseClasses} text-red-500`} />;
  }
  if (status === 'processing') {
    return <CpuChipIcon className={`${baseClasses} text-blue-500 animate-pulse`} />;
  }
  return <ClockIconSolid className={`${baseClasses} text-amber-500`} />;
};

const StatusDot: React.FC<{ status: CVAnalysis['status'] }> = ({ status }) => {
  const baseClasses = 'inline-block w-2.5 h-2.5 rounded-full transition-all duration-200';
  
  if (status === 'completed') {
    return <span className={`${baseClasses} bg-emerald-500 shadow-lg shadow-emerald-500/30`} />;
  }
  if (status === 'failed') {
    return <span className={`${baseClasses} bg-red-500 shadow-lg shadow-red-500/30`} />;
  }
  if (status === 'processing') {
    return (
      <span className={`${baseClasses} bg-blue-500 animate-pulse shadow-lg shadow-blue-500/30`} />
    );
  }
  return <span className={`${baseClasses} bg-amber-500 shadow-lg shadow-amber-500/30`} />;
};

const AnalysisCard: React.FC<{ analysis: CVAnalysis; onClick: () => void }> = ({ 
  analysis, 
  onClick 
}) => {
  return (
    <div
      className="group relative p-5 hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-blue-50/30 dark:hover:from-gray-800/30 dark:hover:to-blue-900/10 transition-all duration-300 cursor-pointer rounded-xl border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50 hover:shadow-sm"
      onClick={onClick}
    >
      {/* Hover indicator line */}
      <div className="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-primary-500 to-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-1 group-hover:translate-x-0" />
      
      <div className="flex items-start gap-4">
        {/* Enhanced Icon Container */}
        <div className="relative flex-shrink-0">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 via-blue-500 to-indigo-600 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 flex items-center justify-center">
            <DocumentTextIcon className="w-6 h-6 text-white" />
            
            {/* Floating status indicator */}
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-lg ring-2 ring-white dark:ring-gray-800">
              <StatusIcon status={analysis.status} />
            </div>
            
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            {/* Left content */}
            <div className="min-w-0 flex-1">
              {/* File name and status */}
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate max-w-[20rem] group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
                  {analysis.file_name}
                </h4>
                <StatusBadge status={analysis.status} size="sm" />
              </div>
              
              {/* Metadata row */}
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <StatusDot status={analysis.status} />
                  <span className="font-medium">
                    {formatRelativeTime(new Date(analysis.created_at))}
                  </span>
                </div>
                
                {/* Separator */}
                <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                
                {/* Analysis type indicator */}
                <div className="flex items-center gap-1.5">
                  <SparklesIcon className="w-4 h-4 text-primary-500" />
                  <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                    Analisi ATS
                  </span>
                </div>
              </div>
            </div>

            {/* Right content */}
            <div className="flex items-center gap-4">
              {/* Score display */}
              {analysis.ats_score != null && (
                <div className="flex items-center gap-2">
                  <ScoreBadge score={analysis.ats_score} size="lg" />
                </div>
              )}
              
              {/* Arrow indicator */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-all duration-200">
                <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all duration-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => {
  return (
    <div className="text-center py-20 px-6 group">
      {/* Enhanced animated illustration */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        {/* Orbiting conic gradient ring (outside main circle) */}
        <div
          className="absolute -inset-2 rounded-full opacity-60 animate-spin"
          style={{
            animationDuration: '14s',
            background:
              'conic-gradient(from 0deg, rgba(59,130,246,0.15), rgba(99,102,241,0.12), rgba(59,130,246,0.15))',
          }}
        />

        {/* Main container removed per request (no floating big circle) */}
        
        {/* Inner circle with document icon */}
        <div className="absolute inset-3 bg-white dark:bg-gray-800 rounded-full shadow-inner flex items-center justify-center border border-gray-100 dark:border-gray-700">
          <div className="relative">
            <DocumentTextIcon className="h-12 w-12 text-primary-500 dark:text-primary-400 transition-transform duration-300 ease-out group-hover:scale-105 group-hover:rotate-3" />
            {/* Subtle glow effect */}
            <div className="absolute inset-0 h-12 w-12 text-primary-500/20 dark:text-primary-400/20 animate-pulse">
              <DocumentTextIcon className="h-12 w-12" />
            </div>
          </div>
        </div>
        
        {/* Shimmer sweep over the whole illustration */}
        <div
          className="absolute inset-0 -skew-x-12 opacity-0 group-hover:opacity-60 transition-opacity duration-700 animate-spin rounded-full"
          style={{
            animationDuration: '10s',
            background:
              'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.35), rgba(255,255,255,0))',
          }}
        />

        {/* Enhanced floating elements */}
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full animate-twinkle opacity-80 shadow-lg" />
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full animate-twinkle animation-delay-700 opacity-60 shadow-lg" />
        <div className="absolute top-2 -left-3 w-3 h-3 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full animate-twinkle animation-delay-1000 opacity-50 shadow-md" />
        
        {/* Orbiting elements */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '20s' }}>
          <div className="absolute -top-1 left-1/2 w-2 h-2 bg-primary-300 rounded-full opacity-40" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}>
          <div className="absolute -bottom-1 left-1/4 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-30" />
        </div>
      </div>
      
      {/* Enhanced content */}
      <div className="space-y-4 mb-10">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Inizia la tua prima analisi
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-lg mx-auto leading-relaxed">
          Carica il tuo CV e scopri come migliorarlo con l'intelligenza artificiale.
          <br />
          <span className="text-primary-600 dark:text-primary-400 font-medium">Risultati in pochi secondi!</span>
        </p>
      </div>
      
      {/* Enhanced CTA button */}
      <div className="flex flex-col items-center space-y-4">
        <Button
          onClick={onNavigate}
          variant="primary"
          size="lg"
          className="group relative overflow-hidden bg-gradient-to-r from-primary-500 via-blue-500 to-indigo-600 hover:from-primary-600 hover:via-blue-600 hover:to-indigo-700 text-white font-semibold px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 border-0 ring-2 ring-primary-500/20 hover:ring-primary-500/40"
        >
          {/* Button background animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          
          {/* Button content with perfect alignment */}
          <div className="relative flex items-center justify-center gap-3">
            <SparklesIcon className="w-5 h-5 flex-shrink-0 group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-base font-semibold">Carica il tuo CV</span>
            <ArrowRightIcon className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </Button>
        
        {/* Subtle encouragement text */}
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-green-500" />
          <span>Gratuito • Sicuro • Istantaneo</span>
        </p>
      </div>
      
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary-100/30 dark:bg-primary-900/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-3xl animate-pulse animation-delay-1000" />
      </div>
    </div>
  );
};

const RecentAnalysesList: React.FC<RecentAnalysesListProps> = ({ analyses }) => {
  const navigate = useNavigate();

  return (
    <Card variant="elevated" className="overflow-hidden border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Analisi Recenti
              </h3>
              {analyses.length > 0 && (
                <div className="flex items-center justify-center w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-xs font-semibold">
                  {analyses.length}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {analyses.length > 0 
                ? `Le tue ultime ${analyses.length} analisi` 
                : 'Nessuna analisi disponibile'
              }
            </p>
          </div>
          
          {analyses.length > 0 && (
            <Link
              to="/history"
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/30 rounded-xl transition-all duration-200 hover:shadow-md group border border-primary-200/50 dark:border-primary-800/50"
            >
              <span className="hidden sm:inline">Vedi tutte</span>
              <span className="sm:hidden">Tutte</span>
              <ArrowRightIcon className="h-4 w-4 ml-1.5 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {analyses.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {analyses.map((analysis, index) => (
              <AnalysisCard
                key={analysis.id}
                analysis={analysis}
                onClick={() => navigate(`/analisi/${analysis.id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState onNavigate={() => navigate('/analisi')} />
        )}
      </CardContent>
    </Card>
  );
};

export default RecentAnalysesList;