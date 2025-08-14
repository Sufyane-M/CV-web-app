import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Core React chunk (highest priority)
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-core';
            }
            
            // Router chunk (loaded on navigation)
            if (id.includes('react-router')) {
              return 'router';
            }
            
            // Supabase chunk (loaded when needed)
            if (id.includes('@supabase') || id.includes('supabase')) {
              return 'supabase';
            }
            
            // UI components chunk
            if (id.includes('lucide-react') || id.includes('sonner') || id.includes('@heroicons')) {
              return 'ui-components';
            }
            
            // Utilities chunk
            if (id.includes('date-fns') || id.includes('clsx')) {
              return 'utilities';
            }
            
            // Pages chunk (lazy loaded)
            if (id.includes('/pages/') && !id.includes('LandingPage')) {
              return 'pages';
            }
            
            // Admin components chunk (none at the moment)
            
            // Large vendor libraries
            if (id.includes('node_modules') && id.length > 100) {
              return 'vendor-large';
            }
            
            // Default vendor chunk for remaining node_modules
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
          // Optimize chunk sizes
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `assets/[name]-[hash].js`;
          },
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    plugins: [
      react(),
      splitVendorChunkPlugin(),
      // Bundle analyzer
      visualizer({
        filename: 'dist/stats.html',
        open: false, // Non aprire automaticamente
        gzipSize: true,
        brotliSize: true,
      }),
      // Compression
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
      }),
      compression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
    ],
    // Ottimizzazioni delle dipendenze
    optimizeDeps: {
      // Pre-bundle in DEV per evitare problemi CJS/ESM dei sotto-pacchetti Supabase
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        'web-vitals'
      ],
      exclude: [
        // Manteniamo stripe fuori dal pre-bundle (non necessario in dev critico)
        '@stripe/stripe-js'
      ]
    },
    
    server: {
      port: 5173,
      host: true,
      hmr: {
        port: 5173,
        host: 'localhost'
      },
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    
    // CSS ottimizzazioni
    css: {
      devSourcemap: mode === 'development',
      preprocessorOptions: {
        // Ottimizzazioni per PostCSS/Tailwind
      }
    },
  };
});
