import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PERFORMANCE_BUDGET = {
  // Bundle sizes (in KB)
  totalJavaScript: 1200,
  totalCSS: 100,
  singleChunkMax: 500,
  totalBundle: 2000,
  
  // Core Web Vitals targets
  lcp: 2500, // ms
  fid: 100,  // ms
  cls: 0.1,  // score
  fcp: 1800, // ms
  ttfb: 600, // ms
  
  // Network metrics
  totalRequests: 50,
  totalTransferSize: 2000, // KB
  
  // Lighthouse scores (0-100)
  performance: 90,
  accessibility: 95,
  bestPractices: 90,
  seo: 90
};

class PerformanceBudgetChecker {
  constructor() {
    this.violations = [];
    this.warnings = [];
    this.distPath = path.join(__dirname, '../dist');
  }

  checkBundleSizes() {
    console.log('📦 Checking bundle sizes...');
    
    if (!fs.existsSync(this.distPath)) {
      console.error('❌ Dist directory not found. Run build first.');
      process.exit(1);
    }

    // Check JavaScript bundles
    const jsPath = path.join(this.distPath, 'assets/js');
    if (fs.existsSync(jsPath)) {
      const jsFiles = fs.readdirSync(jsPath)
        .filter(file => file.endsWith('.js') && !file.endsWith('.gz') && !file.endsWith('.br'))
        .map(file => {
          const filePath = path.join(jsPath, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: Math.round(stats.size / 1024) // KB
          };
        });

      const totalJS = jsFiles.reduce((sum, file) => sum + file.size, 0);
      
      console.log(`📊 Total JavaScript: ${totalJS}KB`);
      
      if (totalJS > PERFORMANCE_BUDGET.totalJavaScript) {
        this.violations.push({
          type: 'Bundle Size',
          metric: 'Total JavaScript',
          actual: `${totalJS}KB`,
          budget: `${PERFORMANCE_BUDGET.totalJavaScript}KB`,
          impact: 'High',
          recommendation: 'Implement code splitting, remove unused dependencies'
        });
      }

      // Check individual chunks
      jsFiles.forEach(file => {
        if (file.size > PERFORMANCE_BUDGET.singleChunkMax) {
          this.violations.push({
            type: 'Bundle Size',
            metric: `Chunk: ${file.name}`,
            actual: `${file.size}KB`,
            budget: `${PERFORMANCE_BUDGET.singleChunkMax}KB`,
            impact: 'Medium',
            recommendation: 'Split large chunks, use dynamic imports'
          });
        }
      });
    }

    // Check CSS bundles
    const cssPath = path.join(this.distPath, 'assets/css');
    if (fs.existsSync(cssPath)) {
      const cssFiles = fs.readdirSync(cssPath)
        .filter(file => file.endsWith('.css') && !file.endsWith('.gz') && !file.endsWith('.br'))
        .map(file => {
          const filePath = path.join(cssPath, file);
          const stats = fs.statSync(filePath);
          return Math.round(stats.size / 1024);
        });

      const totalCSS = cssFiles.reduce((sum, size) => sum + size, 0);
      
      console.log(`📊 Total CSS: ${totalCSS}KB`);
      
      if (totalCSS > PERFORMANCE_BUDGET.totalCSS) {
        this.violations.push({
          type: 'Bundle Size',
          metric: 'Total CSS',
          actual: `${totalCSS}KB`,
          budget: `${PERFORMANCE_BUDGET.totalCSS}KB`,
          impact: 'Medium',
          recommendation: 'Remove unused CSS, optimize Tailwind purging'
        });
      }
    }

    // Check total bundle size
    const totalSize = this.calculateTotalBundleSize();
    console.log(`📊 Total Bundle: ${totalSize}KB`);
    
    if (totalSize > PERFORMANCE_BUDGET.totalBundle) {
      this.violations.push({
        type: 'Bundle Size',
        metric: 'Total Bundle',
        actual: `${totalSize}KB`,
        budget: `${PERFORMANCE_BUDGET.totalBundle}KB`,
        impact: 'High',
        recommendation: 'Optimize images, implement lazy loading, reduce bundle size'
      });
    }
  }

  calculateTotalBundleSize() {
    let totalSize = 0;
    
    const calculateDirSize = (dirPath) => {
      if (!fs.existsSync(dirPath)) return 0;
      
      const files = fs.readdirSync(dirPath);
      let size = 0;
      
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          size += calculateDirSize(filePath);
        } else if (!file.endsWith('.gz') && !file.endsWith('.br')) {
          size += stats.size;
        }
      });
      
      return size;
    };
    
    totalSize = calculateDirSize(this.distPath);
    return Math.round(totalSize / 1024); // Convert to KB
  }

  async checkLighthouseScores() {
    console.log('🔍 Checking Lighthouse scores...');
    
    try {
      // Check if lighthouserc.js exists
      const lighthouseConfig = path.join(__dirname, '../lighthouserc.js');
      if (!fs.existsSync(lighthouseConfig)) {
        console.warn('⚠️ lighthouserc.js not found, skipping Lighthouse checks');
        return;
      }

      // Run Lighthouse CI
      const result = execSync('npx lhci autorun --collect.numberOfRuns=1', 
        { encoding: 'utf8', cwd: path.join(__dirname, '..'), timeout: 60000 });
      
      console.log('✅ Lighthouse audit completed');
      
      // Parse results from .lighthouseci directory
      const lhciDir = path.join(__dirname, '../.lighthouseci');
      if (fs.existsSync(lhciDir)) {
        const reportFiles = fs.readdirSync(lhciDir)
          .filter(file => file.endsWith('.json'));
        
        if (reportFiles.length > 0) {
          const reportPath = path.join(lhciDir, reportFiles[0]);
          const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
          
          const scores = {
            performance: Math.round(report.categories.performance.score * 100),
            accessibility: Math.round(report.categories.accessibility.score * 100),
            bestPractices: Math.round(report.categories['best-practices'].score * 100),
            seo: Math.round(report.categories.seo.score * 100)
          };
          
          this.checkLighthouseThresholds(scores);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not run Lighthouse audit:', error.message);
      console.warn('   Make sure you have @lhci/cli installed: npm install -g @lhci/cli');
    }
  }

  checkLighthouseThresholds(scores) {
    Object.entries(scores).forEach(([category, score]) => {
      const budget = PERFORMANCE_BUDGET[category];
      if (budget && score < budget) {
        this.violations.push({
          type: 'Lighthouse Score',
          metric: category.charAt(0).toUpperCase() + category.slice(1),
          actual: score.toString(),
          budget: budget.toString(),
          impact: category === 'performance' ? 'High' : 'Medium',
          recommendation: this.getLighthouseRecommendation(category)
        });
      }
    });
  }

  getLighthouseRecommendation(category) {
    const recommendations = {
      performance: 'Optimize images, reduce JavaScript, implement caching',
      accessibility: 'Add alt text, improve color contrast, add ARIA labels',
      bestPractices: 'Use HTTPS, avoid deprecated APIs, fix console errors',
      seo: 'Add meta descriptions, improve heading structure, add structured data'
    };
    
    return recommendations[category] || 'Check Lighthouse report for specific recommendations';
  }

  generateReport() {
    console.log('\n📊 Performance Budget Report');
    console.log('=' .repeat(60));
    
    if (this.violations.length === 0) {
      console.log('✅ All performance budgets are within limits!');
      console.log('🎉 Great job maintaining optimal performance!');
      return true;
    }

    console.log(`❌ Found ${this.violations.length} budget violations:\n`);
    
    // Group violations by impact
    const highImpact = this.violations.filter(v => v.impact === 'High');
    const mediumImpact = this.violations.filter(v => v.impact === 'Medium');
    const lowImpact = this.violations.filter(v => v.impact === 'Low');
    
    if (highImpact.length > 0) {
      console.log('🔴 HIGH IMPACT VIOLATIONS:');
      highImpact.forEach((violation, index) => {
        console.log(`   ${index + 1}. ${violation.metric}`);
        console.log(`      Actual: ${violation.actual} | Budget: ${violation.budget}`);
        console.log(`      💡 ${violation.recommendation}\n`);
      });
    }
    
    if (mediumImpact.length > 0) {
      console.log('🟡 MEDIUM IMPACT VIOLATIONS:');
      mediumImpact.forEach((violation, index) => {
        console.log(`   ${index + 1}. ${violation.metric}`);
        console.log(`      Actual: ${violation.actual} | Budget: ${violation.budget}`);
        console.log(`      💡 ${violation.recommendation}\n`);
      });
    }
    
    if (lowImpact.length > 0) {
      console.log('🟢 LOW IMPACT VIOLATIONS:');
      lowImpact.forEach((violation, index) => {
        console.log(`   ${index + 1}. ${violation.metric}`);
        console.log(`      Actual: ${violation.actual} | Budget: ${violation.budget}`);
        console.log(`      💡 ${violation.recommendation}\n`);
      });
    }

    this.generateSummaryRecommendations();
    
    return false;
  }

  generateSummaryRecommendations() {
    console.log('🎯 PRIORITY ACTIONS:');
    
    const bundleViolations = this.violations.filter(v => v.type === 'Bundle Size');
    const lighthouseViolations = this.violations.filter(v => v.type === 'Lighthouse Score');
    
    if (bundleViolations.length > 0) {
      console.log('   📦 Bundle Optimization:');
      console.log('      1. Run bundle analyzer: npm run build:analyze');
      console.log('      2. Implement code splitting for large chunks');
      console.log('      3. Remove unused dependencies and code');
      console.log('      4. Enable tree shaking and minification');
      console.log('      5. Use dynamic imports for non-critical code\n');
    }
    
    if (lighthouseViolations.length > 0) {
      console.log('   🔍 Performance Optimization:');
      console.log('      1. Run full Lighthouse audit: npm run lighthouse');
      console.log('      2. Optimize images and implement lazy loading');
      console.log('      3. Minimize main thread blocking time');
      console.log('      4. Implement proper caching strategies');
      console.log('      5. Fix accessibility and SEO issues\n');
    }
    
    console.log('   📈 Monitoring:');
    console.log('      1. Set up continuous performance monitoring');
    console.log('      2. Add performance budgets to CI/CD pipeline');
    console.log('      3. Monitor Core Web Vitals in production');
    console.log('      4. Set up alerts for performance regressions');
  }

  async run() {
    console.log('🚀 Starting Performance Budget Check...');
    console.log(`📅 ${new Date().toLocaleString()}\n`);
    
    this.checkBundleSizes();
    await this.checkLighthouseScores();
    
    const passed = this.generateReport();
    
    console.log('\n' + '=' .repeat(60));
    console.log(passed ? '✅ BUDGET CHECK PASSED' : '❌ BUDGET CHECK FAILED');
    console.log('=' .repeat(60));
    
    if (!passed) {
      process.exit(1);
    }
  }
}

// Run if called directly
const checker = new PerformanceBudgetChecker();
checker.run().catch(console.error);

export default PerformanceBudgetChecker;