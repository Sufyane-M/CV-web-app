import { defineConfig } from 'vite';
import { splitVendorChunkPlugin } from 'vite';

/**
 * Configurazione Vite ottimizzata per le performance
 * Riduce i tempi di caricamento e migliora il caching
 */
export const performanceConfig = defineConfig({
  build: {
    // Ottimizzazioni per il bundle
    rollupOptions: {
      output: {
        // Chunking strategico per migliorare il caching
        manualChunks: {
          // Vendor chunks separati
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'stripe-vendor': ['@stripe/stripe-js'],
          'utils': [
            './src/utils/performanceMonitor.ts',
            './src/utils/performanceAlerts.ts',
            './src/utils/preloadOptimizer.ts'
          ]
        },
        // Nomi file ottimizzati per il caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name || '')) {
            return `css/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
            return `images/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    // Ottimizzazioni generali
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Rimuovi console.log in produzione
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        safari10: true
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Source maps solo in development
    sourcemap: process.env.NODE_ENV === 'development'
  },
  
  // Ottimizzazioni per il dev server
  server: {
    // Preload modules
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/pages/DashboardPage.tsx',
        './src/pages/AnalysisPage.tsx'
      ]
    }
  },
  
  // Ottimizzazioni delle dipendenze
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@stripe/stripe-js'
    ],
    exclude: [
      // Escludi dipendenze che causano problemi
    ]
  },
  
  // Plugin per ottimizzazioni
  plugins: [
    splitVendorChunkPlugin()
  ],
  
  // CSS ottimizzazioni
  css: {
    devSourcemap: process.env.NODE_ENV === 'development',
    preprocessorOptions: {
      // Ottimizzazioni per PostCSS/Tailwind
    }
  }
});

export default performanceConfig;