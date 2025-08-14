import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting optimized build process...');
const buildStartTime = performance.now();

// 1. Clean dist directory
console.log('🧹 Cleaning dist directory...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  console.log('✅ Dist directory cleaned');
} catch (error) {
  console.error('❌ Failed to clean dist directory:', error.message);
  process.exit(1);
}

// 2. Build with Vite
console.log('📦 Building with Vite...');
const viteStartTime = performance.now();
try {
  execSync('pnpm build', { stdio: 'inherit' });
  const viteBuildTime = Math.round(performance.now() - viteStartTime);
  console.log(`✅ Vite build completed in ${viteBuildTime}ms`);
} catch (error) {
  console.error('❌ Vite build failed:', error.message);
  process.exit(1);
}

// 3. Analyze bundle structure
console.log('📊 Analyzing bundle structure...');
const distPath = path.join(__dirname, '../dist');

if (!fs.existsSync(distPath)) {
  console.error('❌ Dist directory not found after build');
  process.exit(1);
}

// Helper function to get file size
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

// Helper function to format file size
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to recursively get all files
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// Get all files in dist
const allFiles = getAllFiles(distPath);

// Categorize files
const fileCategories = {
  js: allFiles.filter(file => file.endsWith('.js')),
  css: allFiles.filter(file => file.endsWith('.css')),
  html: allFiles.filter(file => file.endsWith('.html')),
  images: allFiles.filter(file => /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(file)),
  fonts: allFiles.filter(file => /\.(woff|woff2|ttf|eot)$/i.test(file)),
  other: allFiles.filter(file => !/\.(js|css|html|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i.test(file))
};

// Analyze each category
console.log('\n📋 Bundle Analysis:');
let totalSize = 0;
const analysis = {};

Object.entries(fileCategories).forEach(([category, files]) => {
  if (files.length === 0) return;

  const categoryFiles = files.map(file => {
    const size = getFileSize(file);
    totalSize += size;
    return {
      name: path.relative(distPath, file),
      size,
      sizeFormatted: formatSize(size)
    };
  }).sort((a, b) => b.size - a.size);

  const categorySize = categoryFiles.reduce((sum, file) => sum + file.size, 0);
  analysis[category] = {
    files: categoryFiles,
    totalSize: categorySize,
    count: categoryFiles.length
  };

  console.log(`\n${category.toUpperCase()} Files (${categoryFiles.length}):`);
  categoryFiles.forEach(file => {
    const status = getFileStatus(category, file.size);
    console.log(`${status} ${file.name}: ${file.sizeFormatted}`);
  });
  console.log(`📊 Total ${category}: ${formatSize(categorySize)}`);
});

console.log(`\n📊 Total Bundle Size: ${formatSize(totalSize)}`);

// Helper function to get file status based on category and size
function getFileStatus(category, size) {
  const limits = {
    js: { warning: 200 * 1024, error: 500 * 1024 }, // 200KB warning, 500KB error
    css: { warning: 30 * 1024, error: 50 * 1024 },   // 30KB warning, 50KB error
    images: { warning: 100 * 1024, error: 500 * 1024 }, // 100KB warning, 500KB error
    fonts: { warning: 50 * 1024, error: 100 * 1024 },   // 50KB warning, 100KB error
  };

  const limit = limits[category];
  if (!limit) return '📄';

  if (size > limit.error) return '❌';
  if (size > limit.warning) return '⚠️';
  return '✅';
}

// 4. Performance budget check
console.log('\n🎯 Performance Budget Check:');

const BUDGET_LIMITS = {
  totalBundle: 2 * 1024 * 1024,    // 2MB total
  totalJS: 1.2 * 1024 * 1024,      // 1.2MB JS
  totalCSS: 100 * 1024,            // 100KB CSS
  singleJSChunk: 500 * 1024,       // 500KB per JS file
  singleCSSFile: 50 * 1024,        // 50KB per CSS file
  totalImages: 1 * 1024 * 1024,    // 1MB images
};

let budgetPassed = true;
const budgetResults = [];

// Check total bundle size
if (totalSize > BUDGET_LIMITS.totalBundle) {
  budgetResults.push({
    check: 'Total Bundle Size',
    status: 'FAIL',
    actual: formatSize(totalSize),
    limit: formatSize(BUDGET_LIMITS.totalBundle)
  });
  budgetPassed = false;
} else {
  budgetResults.push({
    check: 'Total Bundle Size',
    status: 'PASS',
    actual: formatSize(totalSize),
    limit: formatSize(BUDGET_LIMITS.totalBundle)
  });
}

// Check JS budget
if (analysis.js) {
  if (analysis.js.totalSize > BUDGET_LIMITS.totalJS) {
    budgetResults.push({
      check: 'Total JavaScript',
      status: 'FAIL',
      actual: formatSize(analysis.js.totalSize),
      limit: formatSize(BUDGET_LIMITS.totalJS)
    });
    budgetPassed = false;
  } else {
    budgetResults.push({
      check: 'Total JavaScript',
      status: 'PASS',
      actual: formatSize(analysis.js.totalSize),
      limit: formatSize(BUDGET_LIMITS.totalJS)
    });
  }

  // Check individual JS chunks
  const oversizedJS = analysis.js.files.filter(file => file.size > BUDGET_LIMITS.singleJSChunk);
  if (oversizedJS.length > 0) {
    budgetResults.push({
      check: 'Individual JS Chunks',
      status: 'FAIL',
      actual: `${oversizedJS.length} oversized files`,
      limit: formatSize(BUDGET_LIMITS.singleJSChunk)
    });
    budgetPassed = false;
    console.log('❌ Oversized JS chunks:');
    oversizedJS.forEach(file => {
      console.log(`   ${file.name}: ${file.sizeFormatted}`);
    });
  } else {
    budgetResults.push({
      check: 'Individual JS Chunks',
      status: 'PASS',
      actual: 'All chunks within limit',
      limit: formatSize(BUDGET_LIMITS.singleJSChunk)
    });
  }
}

// Check CSS budget
if (analysis.css) {
  if (analysis.css.totalSize > BUDGET_LIMITS.totalCSS) {
    budgetResults.push({
      check: 'Total CSS',
      status: 'FAIL',
      actual: formatSize(analysis.css.totalSize),
      limit: formatSize(BUDGET_LIMITS.totalCSS)
    });
    budgetPassed = false;
  } else {
    budgetResults.push({
      check: 'Total CSS',
      status: 'PASS',
      actual: formatSize(analysis.css.totalSize),
      limit: formatSize(BUDGET_LIMITS.totalCSS)
    });
  }
}

// Check images budget
if (analysis.images) {
  if (analysis.images.totalSize > BUDGET_LIMITS.totalImages) {
    budgetResults.push({
      check: 'Total Images',
      status: 'FAIL',
      actual: formatSize(analysis.images.totalSize),
      limit: formatSize(BUDGET_LIMITS.totalImages)
    });
    budgetPassed = false;
  } else {
    budgetResults.push({
      check: 'Total Images',
      status: 'PASS',
      actual: formatSize(analysis.images.totalSize),
      limit: formatSize(BUDGET_LIMITS.totalImages)
    });
  }
}

// Display budget results
console.log('\n📊 Budget Results:');
budgetResults.forEach(result => {
  const icon = result.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${result.check}: ${result.actual} (limit: ${result.limit})`);
});

// 5. Generate build report
const buildTime = Math.round(performance.now() - buildStartTime);
const buildReport = {
  timestamp: new Date().toISOString(),
  buildTime: `${buildTime}ms`,
  totalSize: formatSize(totalSize),
  budgetPassed,
  analysis,
  budgetResults
};

// Save build report
const reportPath = path.join(distPath, 'build-report.json');
try {
  fs.writeFileSync(reportPath, JSON.stringify(buildReport, null, 2));
  console.log(`\n📄 Build report saved to: ${path.relative(process.cwd(), reportPath)}`);
} catch (error) {
  console.warn('⚠️ Failed to save build report:', error.message);
}

// 6. Final summary
console.log('\n' + '='.repeat(50));
console.log('📊 BUILD SUMMARY');
console.log('='.repeat(50));
console.log(`⏱️  Build Time: ${buildTime}ms`);
console.log(`📦 Total Size: ${formatSize(totalSize)}`);
console.log(`📁 Files: ${allFiles.length}`);
if (analysis.js) console.log(`🟨 JavaScript: ${formatSize(analysis.js.totalSize)} (${analysis.js.count} files)`);
if (analysis.css) console.log(`🟦 CSS: ${formatSize(analysis.css.totalSize)} (${analysis.css.count} files)`);
if (analysis.images) console.log(`🖼️  Images: ${formatSize(analysis.images.totalSize)} (${analysis.images.count} files)`);
console.log(`🎯 Budget: ${budgetPassed ? '✅ PASSED' : '❌ FAILED'}`);

if (budgetPassed) {
  console.log('\n🎉 Build completed successfully!');
  console.log('✅ All performance budgets passed!');
} else {
  console.log('\n❌ Build completed with budget violations!');
  console.log('💡 Consider:');
  console.log('   - Code splitting for large chunks');
  console.log('   - Tree shaking unused code');
  console.log('   - Image optimization');
  console.log('   - Dynamic imports for non-critical code');
  process.exit(1);
}

console.log('\n🚀 Ready for deployment!');