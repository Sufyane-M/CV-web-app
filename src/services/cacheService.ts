interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  total: number;
  valid: number;
  expired: number;
  hitRate: number;
  memoryUsage: number;
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minuti
  private readonly MAX_SIZE = 1000; // Massimo numero di elementi
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minuto
  private cleanupTimer: NodeJS.Timeout | null = null;
  private hitCount = 0;
  private missCount = 0;

  constructor(options: CacheOptions = {}) {
    this.DEFAULT_TTL = options.defaultTTL || this.DEFAULT_TTL;
    this.MAX_SIZE = options.maxSize || this.MAX_SIZE;
    
    // Avvia cleanup automatico
    this.startCleanup(options.cleanupInterval || this.CLEANUP_INTERVAL);
  }

  /**
   * Imposta un valore nella cache
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Rimuovi elementi scaduti se la cache è piena
    if (this.cache.size >= this.MAX_SIZE) {
      this.evictExpired();
      
      // Se ancora piena, rimuovi l'elemento meno utilizzato
      if (this.cache.size >= this.MAX_SIZE) {
        this.evictLRU();
      }
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
    });
  }

  /**
   * Recupera un valore dalla cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      return null;
    }

    const now = Date.now();
    
    // Controlla se è scaduto
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Aggiorna statistiche di accesso
    item.accessCount++;
    item.lastAccessed = now;
    this.hitCount++;

    return item.data;
  }

  /**
   * Controlla se una chiave esiste nella cache
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Rimuove un elemento dalla cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Svuota completamente la cache
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Cache con fallback async - pattern principale per l'uso
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await fetchFn();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error(`Cache fetch failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidazione pattern-based
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Invalidazione per prefisso
   */
  invalidatePrefix(prefix: string): number {
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Aggiorna TTL di un elemento esistente
   */
  updateTTL(key: string, newTTL: number): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    item.ttl = newTTL;
    item.timestamp = Date.now(); // Reset timestamp
    return true;
  }

  /**
   * Statistiche della cache
   */
  getStats(): CacheStats {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    let memoryUsage = 0;

    for (const [key, item] of this.cache.entries()) {
      // Stima approssimativa dell'uso di memoria
      memoryUsage += key.length * 2; // UTF-16
      memoryUsage += JSON.stringify(item.data).length * 2;
      memoryUsage += 64; // Overhead dell'oggetto
      
      if (now - item.timestamp > item.ttl) {
        expired++;
      } else {
        valid++;
      }
    }

    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    return {
      total: this.cache.size,
      valid,
      expired,
      hitRate,
      memoryUsage, // in bytes
    };
  }

  /**
   * Rimuove elementi scaduti
   */
  private evictExpired(): number {
    const now = Date.now();
    let evictedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        evictedCount++;
      }
    }
    
    return evictedCount;
  }

  /**
   * Rimuove l'elemento meno recentemente utilizzato (LRU)
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Avvia il cleanup automatico
   */
  private startCleanup(interval: number): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      const evicted = this.evictExpired();
      if (evicted > 0 && import.meta.env.DEV) {
        console.debug(`Cache cleanup: removed ${evicted} expired items`);
      }
    }, interval);
  }

  /**
   * Ferma il cleanup automatico
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }

  /**
   * Esporta lo stato della cache per debug
   */
  debug(): any {
    const entries: any[] = [];
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      entries.push({
        key,
        isExpired: now - item.timestamp > item.ttl,
        age: now - item.timestamp,
        ttl: item.ttl,
        accessCount: item.accessCount,
        lastAccessed: new Date(item.lastAccessed).toISOString(),
      });
    }
    
    return {
      stats: this.getStats(),
      entries: entries.sort((a, b) => b.accessCount - a.accessCount),
    };
  }
}

// Istanza singleton
export const cacheService = new CacheService({
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minuti
  cleanupInterval: 60 * 1000, // 1 minuto
});

// Chiavi di cache predefinite per l'applicazione
export const CacheKeys = {
  // Analisi
  ANALYSIS: (id: string) => `analysis:${id}`,
  ANALYSIS_LIST: (userId: string) => `analyses:user:${userId}`,
  ANALYSIS_STATUS: (id: string) => `analysis:status:${id}`,
  
  // Profilo utente
  USER_PROFILE: (userId: string) => `profile:${userId}`,
  USER_CREDITS: (userId: string) => `credits:${userId}`,
  
  // Dashboard
  DASHBOARD_STATS: (userId: string) => `dashboard:stats:${userId}`,
  RECENT_ANALYSES: (userId: string) => `recent:${userId}`,
  
  // Sistema
  SYSTEM_CONFIG: 'system:config',
  PRICING_PLANS: 'pricing:plans',
} as const;

export default cacheService;
export type { CacheStats, CacheOptions };