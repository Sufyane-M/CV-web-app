/**
 * Configurazione centralizzata per l'ottimizzazione della memoria
 * Tutti i parametri di memoria sono configurabili da questo file
 */

export const MEMORY_CONFIG = {
  // Performance Monitor
  PERFORMANCE_MONITOR: {
    MAX_METRICS: 30,
    CLEANUP_THRESHOLD: 20,
    CLEANUP_INTERVAL: 3 * 60 * 1000, // 3 minuti
    MEMORY_CHECK_INTERVAL: 120 * 1000, // 2 minuti
    MEMORY_ALERT_THRESHOLD: 0.75, // 75% della memoria totale
    MEMORY_CRITICAL_THRESHOLD: 0.85, // 85% della memoria totale
  },

  // Performance Alerts
  PERFORMANCE_ALERTS: {
    MAX_ALERTS: 20,
    CLEANUP_THRESHOLD: 15,
    CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minuti
    COOLDOWN_DURATION: 30 * 1000, // 30 secondi
  },

  // Prefetch Cache
  PREFETCH_CACHE: {
    MAX_CACHE_SIZE: 15, // Ridotto da 20 a 15
    CACHE_CLEANUP_INTERVAL: 8 * 60 * 1000, // Ridotto a 8 minuti
    CACHE_EXPIRY_TIME: 20 * 60 * 1000, // Ridotto a 20 minuti
  },

  // Memory Optimizer
  MEMORY_OPTIMIZER: {
    DEFAULT_THRESHOLD: 80, // MB - Ridotto da 100 a 80
    DEFAULT_CLEANUP_INTERVAL: 25 * 1000, // Ridotto a 25 secondi
    MIN_CLEANUP_INTERVAL: 20 * 1000, // 20 secondi minimo tra cleanup
    STATS_LOG_INTERVAL: 4 * 60 * 1000, // Log stats ogni 4 minuti
    ENABLE_GARBAGE_COLLECTION: true,
  },

  // Auth Context
  AUTH_CONTEXT: {
    PROFILE_TIMEOUT: 7 * 1000, // Ridotto a 7 secondi
    INIT_TIMEOUT: 7 * 1000, // Ridotto a 7 secondi
    MAX_RETRY_ATTEMPTS: 2,
    RETRY_DELAY: 1000, // 1 secondo
  },

  // General Memory Limits
  GENERAL: {
    MAX_CONSOLE_ENTRIES: 100,
    MAX_PERFORMANCE_ENTRIES: 50,
    MAX_RESOURCE_TIMING_ENTRIES: 100,
    FORCE_CLEANUP_THRESHOLD: 150, // MB - Forza cleanup aggressivo
  },

  // Development Mode
  DEV_MODE: {
    ENABLE_MEMORY_LOGGING: true,
    ENABLE_PERFORMANCE_LOGGING: true,
    LOG_CLEANUP_OPERATIONS: true,
    EXPOSE_MEMORY_STATS: true,
  },
} as const;

/**
 * Utility per ottenere la configurazione in base all'ambiente
 */
export const getMemoryConfig = () => {
  const isDev = import.meta.env.DEV;
  
  return {
    ...MEMORY_CONFIG,
    // In produzione, riduci ulteriormente alcuni valori
    ...(!isDev && {
      PERFORMANCE_MONITOR: {
        ...MEMORY_CONFIG.PERFORMANCE_MONITOR,
        MAX_METRICS: 20,
        CLEANUP_THRESHOLD: 15,
      },
      MEMORY_OPTIMIZER: {
        ...MEMORY_CONFIG.MEMORY_OPTIMIZER,
        DEFAULT_THRESHOLD: 70, // Più aggressivo in produzione
        DEFAULT_CLEANUP_INTERVAL: 20 * 1000,
      },
      PREFETCH_CACHE: {
        ...MEMORY_CONFIG.PREFETCH_CACHE,
        MAX_CACHE_SIZE: 10,
        CACHE_EXPIRY_TIME: 15 * 60 * 1000, // 15 minuti
      },
    }),
  };
};

/**
 * Utility per validare l'utilizzo della memoria
 */
export const validateMemoryUsage = (currentUsage: number): {
  status: 'normal' | 'warning' | 'critical';
  message: string;
  shouldCleanup: boolean;
} => {
  const config = getMemoryConfig();
  const threshold = config.MEMORY_OPTIMIZER.DEFAULT_THRESHOLD;
  const criticalThreshold = config.GENERAL.FORCE_CLEANUP_THRESHOLD;

  if (currentUsage >= criticalThreshold) {
    return {
      status: 'critical',
      message: `Critical memory usage: ${currentUsage}MB (>= ${criticalThreshold}MB)`,
      shouldCleanup: true,
    };
  }

  if (currentUsage >= threshold) {
    return {
      status: 'warning',
      message: `High memory usage: ${currentUsage}MB (>= ${threshold}MB)`,
      shouldCleanup: true,
    };
  }

  return {
    status: 'normal',
    message: `Normal memory usage: ${currentUsage}MB`,
    shouldCleanup: false,
  };
};

export default MEMORY_CONFIG;