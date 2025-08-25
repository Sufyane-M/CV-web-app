import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, ArrowRightIcon, SparklesIcon, BookOpenIcon, PlayIcon, ChartBarIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import {
  SparklesIcon as SparklesIconSolid,
} from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotificationMigration';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import { CreditBadge } from '../components/ui/Badge';
import Loading from '../components/ui/Loading';
const CreditsCard = lazy(() => import('../components/dashboard/CreditsCard'));
const RecentAnalysesList = lazy(() => import('../components/dashboard/RecentAnalysesList'));
const TotalAnalysesCard = lazy(() => import('../components/dashboard/TotalAnalysesCard'));
const QuickStartGuide = lazy(() => import('../components/dashboard/QuickStartGuide'));
import { formatRelativeTime } from '../utils/formatters';
import { dashboardService, type DashboardStats } from '../services/dashboardService';
import type { CVAnalysis } from '../services/supabase';


// Animated Counter Component
const HeroIcon: React.FC<{ Icon: any; className?: string }> = ({ Icon, className }) => (
  <Icon className={className} />
);

const AnimatedCounter: React.FC<{ 
  value: number; 
  duration?: number; 
  className?: string;
}> = ({ value, duration = 1000, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setDisplayValue(Math.floor(progress * value));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return <span className={className}>{displayValue}</span>;
};

const DashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { showError } = useNotification();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalAnalyses: 0,
    userCredits: 0,
    userProfile: null
  });
  const [recentAnalyses, setRecentAnalyses] = useState<CVAnalysis[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        
        // Timeout per il caricamento dei dati del dashboard
        const dataPromise = Promise.all([
          dashboardService.getStats(user.id),
          dashboardService.getRecentAnalyses(user.id, 5)
        ]);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Dashboard loading timeout')), 10000);
        });
        
        const [statsData, analysesData] = await Promise.race([dataPromise, timeoutPromise]) as any;
        
        setStats(statsData);
        setRecentAnalyses(analysesData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        if (error.message === 'Dashboard loading timeout') {
          showError('Timeout nel caricamento dei dati. Riprova più tardi.');
        } else {
          showError('Errore nel caricamento dei dati. Controlla la connessione.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id, showError]);

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                Ciao, {(() => {
                  try {
                    if (stats.userProfile?.full_name) {
                      const nameData = JSON.parse(stats.userProfile.full_name);
                      return nameData.firstName || 'Utente';
                    }
                    return 'Utente';
                  } catch {
                    return 'Utente';
                  }
                })()}! 👋
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Benvenuto nella tua dashboard personalizzata
              </p>
            </div>
            
            <Button
              onClick={() => navigate('/analisi')}
              variant="primary"
              size="lg"
              className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary-600 via-blue-600 to-indigo-600 hover:from-primary-700 hover:via-blue-700 hover:to-indigo-700 transform hover:scale-105 active:scale-95 border-0 ring-2 ring-primary-500/20 hover:ring-primary-500/40"
              leftIcon={<HeroIcon Icon={PlusIcon} className="h-5 w-5" />}
            >
              <span className="hidden sm:inline">Nuova Analisi</span>
              <span className="sm:hidden">Analisi</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Total Analyses Card (redesigned UI, same data) */}
            <Suspense fallback={<div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>}>
              <TotalAnalysesCard
                total={stats.totalAnalyses}
                onViewHistory={() => navigate('/history')}
              />
            </Suspense>

            <Suspense fallback={<div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>}>
              <RecentAnalysesList analyses={recentAnalyses} />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Credits Card */}
            <Suspense fallback={<div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>}>
              <CreditsCard 
                credits={stats.userCredits} 
                hasFreeAnalysisAvailable={stats.hasFreeAnalysisAvailable}
              />
            </Suspense>

            {/* Quick Start Guide */}
            <Suspense fallback={<div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>}>
              <QuickStartGuide />
            </Suspense>
            

          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;