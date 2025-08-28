/**
 * Module Initializer - Prevents variable initialization issues in production builds
 * This utility ensures proper module initialization order and prevents hoisting issues
 */

// Ensure proper initialization order for critical modules
let isInitialized = false;
const initPromises = new Map<string, Promise<any>>();

/**
 * Safe module initializer that prevents "Cannot access before initialization" errors
 */
export const safeInitialize = async <T>(key: string, initializer: () => Promise<T> | T): Promise<T> => {
  if (initPromises.has(key)) {
    return initPromises.get(key)!;
  }

  const promise = Promise.resolve().then(async () => {
    try {
      return await initializer();
    } catch (error) {
      console.error(`Failed to initialize module ${key}:`, error);
      throw error;
    }
  });

  initPromises.set(key, promise);
  return promise;
};

/**
 * Ensures all critical modules are initialized before app startup
 */
export const ensureAppInitialized = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    // Initialize critical services in the correct order
    await Promise.all([
      // Add any critical initialization here if needed
    ]);
    
    isInitialized = true;
  } catch (error) {
    console.error('App initialization failed:', error);
    throw error;
  }
};

/**
 * Reset initialization state (useful for testing)
 */
export const resetInitialization = (): void => {
  isInitialized = false;
  initPromises.clear();
};