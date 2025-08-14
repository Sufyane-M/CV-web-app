import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Route prefetch mapping based on user flow
const PREFETCH_ROUTES = {
  '/': ['/login', '/register', '/pricing'], // From landing page
  '/login': ['/dashboard'], // After login
  '/register': ['/dashboard'], // After registration
  '/dashboard': ['/analysis', '/settings'], // From dashboard
  '/analysis': ['/dashboard'], // From analysis
  '/pricing': ['/register', '/login'], // From pricing
} as const;

// Cache per evitare prefetch duplicati con gestione memoria
const prefetchCache = new Map<string, number>();
const MAX_CACHE_SIZE = 20;
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minuti
const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minuti

// Cleanup automatico della cache
let cacheCleanupInterval: NodeJS.Timeout | null = null;

const startCacheCleanup = () => {
  if (cacheCleanupInterval) return;
  
  cacheCleanupInterval = setInterval(() => {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    prefetchCache.forEach((timestamp, route) => {
      if (now - timestamp > CACHE_EXPIRY_TIME) {
        expiredKeys.push(route);
      }
    });
    
    expiredKeys.forEach(key => prefetchCache.delete(key));
    
    // Se la cache è ancora troppo grande, rimuovi le voci più vecchie
    if (prefetchCache.size > MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(prefetchCache.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(0, prefetchCache.size - MAX_CACHE_SIZE);
      
      sortedEntries.forEach(([route]) => prefetchCache.delete(route));
    }
    
    if (import.meta.env.DEV && expiredKeys.length > 0) {
      console.log(`🧹 Cleaned ${expiredKeys.length} expired prefetch entries`);
    }
  }, CACHE_CLEANUP_INTERVAL);
};

const stopCacheCleanup = () => {
  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
    cacheCleanupInterval = null;
  }
};

// Avvia il cleanup automatico
startCacheCleanup();

// Prefetch strategies
type PrefetchStrategy = 'immediate' | 'hover' | 'idle' | 'viewport';

interface PrefetchOptions {
  strategy?: PrefetchStrategy;
  delay?: number;
  priority?: 'high' | 'low';
}

/**
 * Hook per il prefetch intelligente delle route
 * Carica in anticipo le pagine che l'utente probabilmente visiterà
 */
export const usePrefetch = (options: PrefetchOptions = {}) => {
  const location = useLocation();
  const { strategy = 'idle', delay = 2000, priority = 'low' } = options;

  useEffect(() => {
    const currentPath = location.pathname;
    const routesToPrefetch = PREFETCH_ROUTES[currentPath as keyof typeof PREFETCH_ROUTES];

    if (!routesToPrefetch) return;

    const prefetchRoute = async (route: string) => {
      // Evita prefetch duplicati
      if (prefetchCache.has(route)) {
        return;
      }
      
      try {
        prefetchCache.set(route, Date.now());
        
        // Prefetch the route component
        switch (route) {
          case '/dashboard':
            await import('../pages/DashboardPage');
            break;
          case '/analysis':
            await import('../pages/AnalysisPage');
            break;
          case '/settings':
            await import('../pages/SettingsPage');
            break;
          case '/login':
            await import('../pages/LoginPage');
            break;
          case '/register':
            await import('../pages/RegisterPage');
            break;
          case '/pricing':
            await import('../pages/PricingPage');
            break;
          default:
            if (import.meta.env.DEV) {
              console.log(`Prefetch not configured for route: ${route}`);
            }
            return;
        }
        
        if (import.meta.env.DEV) {
          console.log(`✅ Prefetched route: ${route}`);
        }
      } catch (error) {
        // Rimuovi dalla cache se il prefetch fallisce
        prefetchCache.delete(route);
        if (import.meta.env.DEV) {
          console.warn(`❌ Failed to prefetch route ${route}:`, error);
        }
      }
    };

    const executePrefetch = () => {
      routesToPrefetch.forEach((route, index) => {
        // Stagger prefetch requests to avoid overwhelming the browser
        setTimeout(() => {
          prefetchRoute(route);
        }, index * 100);
      });
    };

    switch (strategy) {
      case 'immediate':
        executePrefetch();
        break;
        
      case 'idle':
        // Use requestIdleCallback if available, otherwise setTimeout
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => executePrefetch(), { timeout: delay });
        } else {
          setTimeout(executePrefetch, delay);
        }
        break;
        
      case 'hover':
        // Prefetch on first user interaction
        const handleFirstInteraction = () => {
          executePrefetch();
          document.removeEventListener('mouseover', handleFirstInteraction);
          document.removeEventListener('touchstart', handleFirstInteraction);
        };
        
        document.addEventListener('mouseover', handleFirstInteraction, { once: true });
        document.addEventListener('touchstart', handleFirstInteraction, { once: true });
        
        return () => {
          document.removeEventListener('mouseover', handleFirstInteraction);
          document.removeEventListener('touchstart', handleFirstInteraction);
        };
        
      case 'viewport':
        // Prefetch when page is in viewport (for mobile)
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                executePrefetch();
                observer.disconnect();
              }
            });
          },
          { threshold: 0.1 }
        );
        
        const rootElement = document.getElementById('root');
        if (rootElement) {
          observer.observe(rootElement);
        }
        
        return () => {
          observer.disconnect();
        };
    }
    
    // Cleanup generale
    return () => {
      // Cleanup viene gestito automaticamente dai singoli strategy
    };
  }, [location.pathname, strategy, delay, priority]);
  
  // Cleanup globale quando il componente viene smontato
  useEffect(() => {
    return () => {
      // Ferma il cleanup della cache quando non ci sono più componenti attivi
      // Nota: questo è gestito globalmente, non per singolo componente
    };
  }, []);
};

/**
 * Hook per il prefetch manuale di una route specifica
 */
export const usePrefetchRoute = () => {
  const prefetchRoute = async (route: string) => {
    try {
      switch (route) {
        case '/dashboard':
          await import('../pages/DashboardPage');
          break;
        case '/analysis':
          await import('../pages/AnalysisPage');
          break;
        case '/settings':
          await import('../pages/SettingsPage');
          break;
        case '/login':
          await import('../pages/LoginPage');
          break;
        case '/register':
          await import('../pages/RegisterPage');
          break;
        case '/pricing':
          await import('../pages/PricingPage');
          break;
        default:
          if (import.meta.env.DEV) {
            console.warn(`Prefetch not configured for route: ${route}`);
          }
      }
      if (import.meta.env.DEV) {
        console.log(`✅ Manually prefetched route: ${route}`);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(`❌ Failed to manually prefetch route ${route}:`, error);
      }
    }
  };

  return { prefetchRoute };
};

/**
 * Component wrapper per aggiungere prefetch automatico
 */
interface PrefetchProviderProps {
  children: React.ReactNode;
  strategy?: PrefetchStrategy;
}

export const PrefetchProvider: React.FC<PrefetchProviderProps> = ({ children, strategy = 'idle' }) => {
  usePrefetch({ strategy });
  return React.createElement(React.Fragment, null, children);
};