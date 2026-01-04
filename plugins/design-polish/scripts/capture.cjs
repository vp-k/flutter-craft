#!/usr/bin/env node
// design-polish plugin - capture script with WCAG accessibility checks

const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================
// 설정
// ============================================

const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  outputDir: process.env.OUTPUT_DIR || path.join(process.cwd(), '.design-polish', 'screenshots'),
  accessibilityDir: process.env.A11Y_DIR || path.join(process.cwd(), '.design-polish', 'accessibility'),
  viewport: { width: 1280, height: 720 },
  waitTime: parseInt(process.env.WAIT_TIME) || 2000,
  timeout: parseInt(process.env.TIMEOUT) || 30000,
  retries: parseInt(process.env.RETRIES) || 2,
  fullPage: process.env.FULL_PAGE === 'true' || false,
};

// ============================================
// 의존성 로드
// ============================================

let puppeteer;
let AxePuppeteer;

try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.error('Puppeteer not found. Run: npm install');
  process.exit(1);
}

try {
  AxePuppeteer = require('@axe-core/puppeteer').AxePuppeteer;
} catch (e) {
  console.warn('axe-core/puppeteer not found. WCAG checks will be skipped.');
  AxePuppeteer = null;
}

// ============================================
// 유틸리티 함수
// ============================================

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created: ${dir}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, retries = CONFIG.retries) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries) throw error;
      console.log(`Retry ${i + 1}/${retries}...`);
      await sleep(1000);
    }
  }
}

async function checkServer(url) {
  const http = url.startsWith('https') ? require('https') : require('http');
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 5000 }, (res) => {
      resolve({ ok: true, status: res.statusCode });
    });
    req.on('error', () => resolve({ ok: false, status: 0 }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 0 });
    });
  });
}

// ============================================
// WCAG 접근성 체크
// ============================================

async function runAccessibilityCheck(page, url) {
  if (!AxePuppeteer) {
    return null;
  }

  try {
    const results = await new AxePuppeteer(page)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    return {
      timestamp: new Date().toISOString(),
      url,
      summary: {
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length
      },
      violations: results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map(n => ({
          target: n.target,
          html: n.html.substring(0, 200),
          failureSummary: n.failureSummary
        }))
      })),
      incomplete: results.incomplete.map(i => ({
        id: i.id,
        impact: i.impact,
        description: i.description
      }))
    };
  } catch (error) {
    console.error(`WCAG check failed: ${error.message}`);
    return null;
  }
}

function saveAccessibilityReport(report, filename = 'wcag-report.json') {
  if (!report) return;

  ensureDir(CONFIG.accessibilityDir);
  const filepath = path.join(CONFIG.accessibilityDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`WCAG report saved: ${filename}`);
}

// ============================================
// 캡처 함수
// ============================================

async function createBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

// 현재 프로젝트 캡처
async function captureLocal(routes, options = { wcag: true }) {
  // 서버 상태 확인
  const serverStatus = await checkServer(CONFIG.baseUrl);
  if (!serverStatus.ok) {
    console.error(`Server not running: ${CONFIG.baseUrl}`);
    console.log('\n개발 서버를 먼저 실행해주세요. (예: npm run dev)');
    process.exit(1);
  }

  ensureDir(CONFIG.outputDir);
  console.log(`\nCapturing local project: ${CONFIG.baseUrl}`);

  const browser = await createBrowser();
  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport);

  const results = [];
  let wcagReport = null;

  for (const route of routes) {
    const url = CONFIG.baseUrl + route;
    const filename = route === '/' ? 'current-main.png' : `current-${route.slice(1).replace(/\//g, '-')}.png`;
    const filepath = path.join(CONFIG.outputDir, filename);

    try {
      console.log(`Capturing: ${url}`);

      await withRetry(async () => {
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: CONFIG.timeout,
        });
      });

      await sleep(CONFIG.waitTime);
      await page.screenshot({ path: filepath, fullPage: CONFIG.fullPage });
      console.log(`Saved: ${filename}`);

      // WCAG 체크 (첫 번째 라우트에서만 또는 모든 라우트)
      if (options.wcag && route === routes[0]) {
        console.log('Running WCAG accessibility check...');
        wcagReport = await runAccessibilityCheck(page, url);
        if (wcagReport) {
          saveAccessibilityReport(wcagReport);
          console.log(`  Violations: ${wcagReport.summary.violations}`);
          console.log(`  Passes: ${wcagReport.summary.passes}`);
        }
      }

      results.push({ route, filename, success: true });

    } catch (error) {
      console.error(`Failed: ${url} - ${error.message}`);
      results.push({ route, filename, success: false, error: error.message });
    }
  }

  await browser.close();
  return { results, wcagReport };
}

// 레퍼런스 URL 캡처 (여러 개 지원, 브라우저 재사용)
async function captureReferences(refs) {
  ensureDir(CONFIG.outputDir);
  console.log(`\nCapturing ${refs.length} reference(s)`);

  const browser = await createBrowser();
  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport);

  const results = [];

  for (const { url, name } of refs) {
    const filename = `reference-${name}.png`;
    const filepath = path.join(CONFIG.outputDir, filename);

    try {
      console.log(`Capturing reference: ${url}`);

      await withRetry(async () => {
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: CONFIG.timeout,
        });
      });

      await sleep(CONFIG.waitTime);
      await page.screenshot({ path: filepath, fullPage: CONFIG.fullPage });
      console.log(`Saved: ${filename}`);
      results.push({ url, name, filename, success: true });

    } catch (error) {
      console.error(`Failed: ${url} - ${error.message}`);
      results.push({ url, name, filename, success: false, error: error.message });
    }
  }

  await browser.close();
  return { results };
}

// WCAG 체크만 수행
async function wcagOnly(routes) {
  const serverStatus = await checkServer(CONFIG.baseUrl);
  if (!serverStatus.ok) {
    console.error(`Server not running: ${CONFIG.baseUrl}`);
    console.log('\n개발 서버를 먼저 실행해주세요. (예: npm run dev)');
    process.exit(1);
  }

  if (!AxePuppeteer) {
    console.error('axe-core/puppeteer not installed. Run: npm install @axe-core/puppeteer');
    process.exit(1);
  }

  console.log(`\nRunning WCAG check on: ${CONFIG.baseUrl}`);

  const browser = await createBrowser();
  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport);

  const reports = [];

  for (const route of routes) {
    const url = CONFIG.baseUrl + route;

    try {
      console.log(`Checking: ${url}`);

      await withRetry(async () => {
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: CONFIG.timeout,
        });
      });

      await sleep(CONFIG.waitTime);

      const report = await runAccessibilityCheck(page, url);
      if (report) {
        const filename = route === '/' ? 'wcag-report.json' : `wcag-report-${route.slice(1).replace(/\//g, '-')}.json`;
        saveAccessibilityReport(report, filename);
        reports.push(report);

        console.log(`  Violations: ${report.summary.violations}`);
        console.log(`  Passes: ${report.summary.passes}`);
      }

    } catch (error) {
      console.error(`Failed: ${url} - ${error.message}`);
    }
  }

  await browser.close();
  return { reports };
}

// ============================================
// CLI
// ============================================

function printHelp() {
  console.log(`
Design Polish Capture Script

Usage:
  node capture.cjs [options] [routes...]
  node capture.cjs ref <url> <name> [<url> <name> ...]

Options:
  --wcag        Include WCAG accessibility check (default)
  --wcag-only   Run only WCAG check, no screenshots
  --no-wcag     Skip WCAG check
  --help, -h    Show this help

Commands:
  (default)     Capture local project pages
  ref           Capture external reference URLs

Examples:
  # Local project with WCAG
  node capture.cjs /                     # Main page + WCAG
  node capture.cjs / /about /pricing     # Multiple pages

  # WCAG only
  node capture.cjs --wcag-only /

  # No WCAG
  node capture.cjs --no-wcag /

  # References
  node capture.cjs ref "https://dribbble.com/..." hero

Environment Variables:
  BASE_URL     Local server URL (default: http://localhost:3000)
  OUTPUT_DIR   Screenshot directory (default: .design-polish/screenshots)
  A11Y_DIR     Accessibility report directory (default: .design-polish/accessibility)
  WAIT_TIME    Wait time after page load in ms (default: 2000)
  TIMEOUT      Page load timeout in ms (default: 30000)
  FULL_PAGE    Capture full page (default: false)

Output:
  .design-polish/
  ├── screenshots/
  │   ├── current-main.png
  │   └── reference-*.png
  └── accessibility/
      └── wcag-report.json
`);
}

function printJsonResult(type, data) {
  const output = {
    success: true,
    type,
    outputDir: CONFIG.outputDir,
    ...data
  };
  console.log('\n--- JSON_RESULT_START ---');
  console.log(JSON.stringify(output, null, 2));
  console.log('--- JSON_RESULT_END ---');
}

async function main() {
  const args = process.argv.slice(2);

  // 옵션 파싱
  let wcagMode = 'include'; // 'include', 'only', 'skip'
  const filteredArgs = [];

  for (const arg of args) {
    if (arg === '--wcag') {
      wcagMode = 'include';
    } else if (arg === '--wcag-only') {
      wcagMode = 'only';
    } else if (arg === '--no-wcag') {
      wcagMode = 'skip';
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      return;
    } else {
      filteredArgs.push(arg);
    }
  }

  if (filteredArgs.length === 0) {
    // 기본: 메인 페이지 캡처
    if (wcagMode === 'only') {
      const data = await wcagOnly(['/']);
      printJsonResult('wcag', data);
    } else {
      const data = await captureLocal(['/'], { wcag: wcagMode !== 'skip' });
      printJsonResult('local', data);
    }
    return;
  }

  if (filteredArgs[0] === 'ref') {
    // 레퍼런스 캡처
    const refs = [];
    for (let i = 1; i < filteredArgs.length; i += 2) {
      if (filteredArgs[i] && filteredArgs[i + 1]) {
        refs.push({ url: filteredArgs[i], name: filteredArgs[i + 1] });
      }
    }

    if (refs.length === 0) {
      console.error('Usage: ref <url> <name> [<url> <name> ...]');
      process.exit(1);
    }

    const data = await captureReferences(refs);
    printJsonResult('reference', data);
    return;
  }

  // 로컬 라우트 캡처
  if (wcagMode === 'only') {
    const data = await wcagOnly(filteredArgs);
    printJsonResult('wcag', data);
  } else {
    const data = await captureLocal(filteredArgs, { wcag: wcagMode !== 'skip' });
    printJsonResult('local', data);
  }
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
