#!/usr/bin/env node

/**
 * Mobile Performance Testing Script
 * Tests application performance under various mobile network conditions
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const reportsDir = join(projectRoot, 'performance-reports');

// Ensure reports directory exists
if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir, { recursive: true });
}

// Network throttling configurations
const networkConfigs = {
  '3g-slow': {
    name: '3G Slow',
    rttMs: 300,
    throughputKbps: 400,
    cpuSlowdownMultiplier: 4,
    description: 'Slow 3G connection simulation'
  },
  '3g-fast': {
    name: '3G Fast',
    rttMs: 150,
    throughputKbps: 1638.4,
    cpuSlowdownMultiplier: 4,
    description: 'Fast 3G connection simulation'
  },
  '4g': {
    name: '4G',
    rttMs: 40,
    throughputKbps: 10240,
    cpuSlowdownMultiplier: 1,
    description: '4G connection simulation'
  },
  'wifi': {
    name: 'WiFi',
    rttMs: 10,
    throughputKbps: 50000,
    cpuSlowdownMultiplier: 1,
    description: 'WiFi connection simulation'
  }
};

// Mobile device configurations
const deviceConfigs = {
  'mobile-small': {
    name: 'Mobile Small',
    width: 320,
    height: 568,
    deviceScaleFactor: 2,
    description: 'Small mobile device (iPhone SE)'
  },
  'mobile-medium': {
    name: 'Mobile Medium',
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    description: 'Medium mobile device (iPhone 8)'
  },
  'mobile-large': {
    name: 'Mobile Large',
    width: 414,
    height: 896,
    deviceScaleFactor: 3,
    description: 'Large mobile device (iPhone 11 Pro Max)'
  }
};

// Utility functions
function log(message, color = 'white') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bright: '\x1b[1m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Generate Lighthouse configuration for specific test
function generateLighthouseConfig(networkConfig, deviceConfig) {
  return {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
      formFactor: 'mobile',
      throttling: {
        rttMs: networkConfig.rttMs,
        throughputKbps: networkConfig.throughputKbps,
        cpuSlowdownMultiplier: networkConfig.cpuSlowdownMultiplier,
        requestLatencyMs: networkConfig.rttMs,
        downloadThroughputKbps: networkConfig.throughputKbps,
        uploadThroughputKbps: networkConfig.throughputKbps * 0.4
      },
      screenEmulation: {
        mobile: true,
        width: deviceConfig.width,
        height: deviceConfig.height,
        deviceScaleFactor: deviceConfig.deviceScaleFactor,
        disabled: false
      },
      emulatedUserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    }
  };
}

// Run Lighthouse test with specific configuration
async function runLighthouseTest(url, networkKey, deviceKey, outputPath) {
  const networkConfig = networkConfigs[networkKey];
  const deviceConfig = deviceConfigs[deviceKey];
  
  logInfo(`Running test: ${networkConfig.name} on ${deviceConfig.name}`);
  
  const configPath = join(reportsDir, `lighthouse-config-${networkKey}-${deviceKey}.json`);
  const config = generateLighthouseConfig(networkConfig, deviceConfig);
  
  // Write temporary config file
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  try {
    const command = [
      'lighthouse',
      url,
      '--config-path', configPath,
      '--output', 'json',
      '--output', 'html',
      '--output-path', outputPath,
      '--chrome-flags', '--no-sandbox --disable-dev-shm-usage --headless'
    ].join(' ');
    
    execSync(command, { stdio: 'inherit', cwd: projectRoot });
    logSuccess(`Test completed: ${networkConfig.name} on ${deviceConfig.name}`);
    
    return true;
  } catch (error) {
    logError(`Test failed: ${networkConfig.name} on ${deviceConfig.name}`);
    logError(error.message);
    return false;
  }
}

// Generate performance report
function generatePerformanceReport(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(reportsDir, `mobile-performance-report-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.length,
      passedTests: results.filter(r => r.success).length,
      failedTests: results.filter(r => !r.success).length
    },
    results: results,
    recommendations: generateRecommendations(results)
  };
  
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logSuccess(`Performance report generated: ${reportPath}`);
  
  return report;
}

// Generate performance recommendations
function generateRecommendations(results) {
  const recommendations = [];
  
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'Network Performance',
      issue: `${failedTests.length} tests failed under mobile network conditions`,
      solution: 'Consider implementing lazy loading, image optimization, and code splitting'
    });
  }
  
  // Add more specific recommendations based on common mobile performance issues
  recommendations.push(
    {
      priority: 'medium',
      category: 'Resource Loading',
      issue: 'Mobile devices have limited bandwidth',
      solution: 'Implement resource hints (preload, prefetch) and optimize critical rendering path'
    },
    {
      priority: 'medium',
      category: 'JavaScript Performance',
      issue: 'Mobile CPUs are slower than desktop',
      solution: 'Minimize JavaScript execution time and implement code splitting'
    },
    {
      priority: 'low',
      category: 'User Experience',
      issue: 'Touch interactions require different optimization',
      solution: 'Optimize for touch targets and implement proper loading states'
    }
  );
  
  return recommendations;
}

// Main test runner
async function runMobilePerformanceTests() {
  log('🚀 Starting Mobile Performance Tests', 'bright');
  log('=====================================', 'bright');
  
  const url = process.env.TEST_URL || 'http://localhost:4173';
  const results = [];
  
  // Check if server is running
  try {
    execSync(`curl -f ${url}`, { stdio: 'ignore' });
  } catch (error) {
    logWarning('Server not running, starting preview server...');
    try {
      execSync('npm run build', { stdio: 'inherit', cwd: projectRoot });
      
      // Start server in background
      const server = spawn('npm', ['run', 'preview'], {
        cwd: projectRoot,
        detached: true,
        stdio: 'ignore'
      });
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      logSuccess('Preview server started');
    } catch (buildError) {
      logError('Failed to start server');
      process.exit(1);
    }
  }
  
  // Run tests for each network and device combination
  for (const [networkKey, networkConfig] of Object.entries(networkConfigs)) {
    for (const [deviceKey, deviceConfig] of Object.entries(deviceConfigs)) {
      const testName = `${networkKey}-${deviceKey}`;
      const outputPath = join(reportsDir, `lighthouse-${testName}`);
      
      const success = await runLighthouseTest(url, networkKey, deviceKey, outputPath);
      
      results.push({
        testName,
        networkConfig: networkConfig.name,
        deviceConfig: deviceConfig.name,
        success,
        timestamp: new Date().toISOString(),
        reportPath: success ? `${outputPath}.html` : null
      });
    }
  }
  
  // Generate final report
  const report = generatePerformanceReport(results);
  
  // Display summary
  log('\n📊 Test Summary', 'bright');
  log('===============', 'bright');
  logInfo(`Total tests: ${report.summary.totalTests}`);
  logSuccess(`Passed: ${report.summary.passedTests}`);
  if (report.summary.failedTests > 0) {
    logError(`Failed: ${report.summary.failedTests}`);
  }
  
  log('\n💡 Recommendations', 'bright');
  log('==================', 'bright');
  report.recommendations.forEach(rec => {
    const priorityColor = rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'yellow' : 'blue';
    log(`[${rec.priority.toUpperCase()}] ${rec.category}: ${rec.issue}`, priorityColor);
    log(`   Solution: ${rec.solution}`, 'white');
  });
  
  log(`\n📁 Reports saved to: ${reportsDir}`, 'cyan');
  
  return report.summary.failedTests === 0;
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
  runMobilePerformanceTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logError(`Test runner failed: ${error.message}`);
      process.exit(1);
    });
}

export { runMobilePerformanceTests, networkConfigs, deviceConfigs };