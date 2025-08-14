import React, { useEffect, useState } from 'react';
import Card, { CardContent } from '../ui/Card';
import { ArrowRightIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface TotalAnalysesCardProps {
  total: number;
  onViewHistory: () => void;
  className?: string;
}

const AnimatedCounter: React.FC<{
  value: number;
  duration?: number;
  className?: string;
}> = ({ value, duration = 700, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let rafId = 0;
    const start = performance.now();
    const startValue = displayValue;
    const delta = value - startValue;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplayValue(Math.round(startValue + delta * ease));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className={className}>{displayValue}</span>;
};

const TotalAnalysesCard: React.FC<TotalAnalysesCardProps> = ({ total, onViewHistory, className }) => {
  return (
    <Card
      variant="elevated"
      className={cn(
        'overflow-hidden border-0 shadow-xl bg-white dark:bg-gray-800',
        'relative transition-all duration-300 hover:shadow-2xl',
        className
      )}
    >
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-10">
        <svg viewBox="0 0 200 200" className="absolute -top-16 -right-20 h-56 w-56 text-primary-600 dark:text-primary-400">
          <defs>
            <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" />
              <stop offset="100%" stopColor="currentColor" />
            </linearGradient>
          </defs>
          <path d="M10 150 C 50 80, 100 120, 190 40" stroke="url(#grad)" strokeWidth="12" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Analisi Totali</p>
            <div className="mt-1 flex items-baseline gap-3">
              <AnimatedCounter
                value={total}
                className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent"
              />
              <span className="text-base sm:text-lg text-gray-600 dark:text-gray-300">{total === 1 ? 'analisi' : 'analisi'}</span>
            </div>
          </div>

          <div className="shrink-0">
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary-600/10 to-indigo-600/10 dark:from-primary-400/10 dark:to-indigo-400/10 border border-primary-600/20 dark:border-primary-400/20 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={onViewHistory}
            className="inline-flex items-center text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors group"
          >
            Vedi cronologia completa
            <ArrowRightIcon className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TotalAnalysesCard;


