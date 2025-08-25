module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:4173'],
      startServerCommand: 'pnpm preview',
      startServerReadyPattern: 'Local:',
      numberOfRuns: 3,
      settings: [
        // Desktop configuration
        {
          chromeFlags: '--no-sandbox --disable-dev-shm-usage',
          preset: 'desktop',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        },
        // Mobile configuration with 3G throttling
        {
          chromeFlags: '--no-sandbox --disable-dev-shm-usage',
          preset: 'perf',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
          throttling: {
            rttMs: 150,
            throughputKbps: 1638.4,
            cpuSlowdownMultiplier: 4,
            requestLatencyMs: 150,
            downloadThroughputKbps: 1638.4,
            uploadThroughputKbps: 675,
          },
          screenEmulation: {
            mobile: true,
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            disabled: false,
          },
          formFactor: 'mobile',
        },
        // Mobile configuration with 4G throttling
        {
          chromeFlags: '--no-sandbox --disable-dev-shm-usage',
          preset: 'perf',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
          throttling: {
            rttMs: 40,
            throughputKbps: 10240,
            cpuSlowdownMultiplier: 1,
            requestLatencyMs: 40,
            downloadThroughputKbps: 10240,
            uploadThroughputKbps: 10240,
          },
          screenEmulation: {
            mobile: true,
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            disabled: false,
          },
          formFactor: 'mobile',
        },
      ],
    },
    assert: {
      assertions: {
        // Performance thresholds - Desktop
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        
        // Core Web Vitals - Desktop
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }], // 2s
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // 2.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }], // 300ms
        'speed-index': ['error', { maxNumericValue: 3000 }], // 3s
        
        // Mobile-specific thresholds (more permissive)
        'first-contentful-paint|mobile': ['error', { maxNumericValue: 3000 }], // 3s for mobile
        'largest-contentful-paint|mobile': ['error', { maxNumericValue: 4000 }], // 4s for mobile
        'total-blocking-time|mobile': ['error', { maxNumericValue: 600 }], // 600ms for mobile
        'speed-index|mobile': ['error', { maxNumericValue: 4500 }], // 4.5s for mobile
        'interactive|mobile': ['warn', { maxNumericValue: 5000 }], // 5s for mobile
        
        // Resource loading
        'first-meaningful-paint': ['warn', { maxNumericValue: 2000 }],
        'interactive': ['warn', { maxNumericValue: 3500 }],
        
        // Bundle size checks
        'resource-summary:script:size': ['error', { maxNumericValue: 1200000 }], // 1.2MB
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }], // 100KB
        'resource-summary:image:size': ['warn', { maxNumericValue: 1000000 }], // 1MB
        
        // Network requests
        'resource-summary:total:count': ['warn', { maxNumericValue: 50 }],
        'unused-javascript': ['warn', { maxNumericValue: 200000 }], // 200KB
        'unused-css-rules': ['warn', { maxNumericValue: 50000 }], // 50KB
        
        // Image optimization
        'modern-image-formats': 'warn',
        'uses-optimized-images': 'warn',
        'uses-responsive-images': 'warn',
        'efficient-animated-content': 'warn',
        
        // Caching
        'uses-long-cache-ttl': 'warn',
        'uses-rel-preconnect': 'warn',
        'uses-rel-preload': 'warn',
        
        // JavaScript optimization
        'unminified-javascript': 'error',
        'unminified-css': 'error',
        'uses-text-compression': 'error',
        
        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        
        // SEO
        'document-title': 'error',
        'meta-description': 'error',
        'http-status-code': 'error',
        'crawlable-anchors': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    server: {
      port: 9001,
      storage: {
        storageMethod: 'filesystem',
        sqlDatabasePath: './lhci-data.db',
      },
    },
  },
};