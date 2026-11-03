import puppeteer from 'puppeteer';
import { preview } from 'vite';

(async () => {
  console.log('🔍 [E2E Verify] Starting local Vite preview server...');
  const server = await preview({
    preview: { port: 4173, host: '127.0.0.1' },
    configFile: './vite.config.js'
  });

  const localUrl = `http://127.0.0.1:4173${server.config.base || '/'}`;
  console.log(`🌐 [E2E Verify] Preview server running at: ${localUrl}`);

  console.log('🚀 [E2E Verify] Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`  [Browser Error]: ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.error(`  [Browser Uncaught Exception]: ${err.toString()}`);
    pageErrors.push(err.toString());
  });

  let success = false;
  try {
    const res = await page.goto(localUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    console.log(`📡 [E2E Verify] HTTP Status: ${res.status()}`);

    // Wait 2.5s for React component tree to fully mount & hydrate
    await new Promise((r) => setTimeout(r, 2500));

    // Inspect the rendered DOM
    const inspection = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return { exists: false };
      return {
        exists: true,
        childrenCount: root.children.length,
        hasContent: root.innerText.trim().length > 0,
        textSnippet: root.innerText.trim().slice(0, 150),
        firstElementTag: root.firstElementChild ? root.firstElementChild.tagName : null
      };
    });

    console.log('\n📊 [E2E Verify] Rendered DOM Inspection:');
    console.log('  Root container exists:', inspection.exists);
    console.log('  Child elements count:', inspection.childrenCount);
    console.log('  Has rendered text content:', inspection.hasContent);
    console.log('  Snippet:', inspection.textSnippet);

    if (!inspection.exists || inspection.childrenCount === 0 || !inspection.hasContent) {
      throw new Error('BLANK WHITE SCREEN DETECTED: #root is empty or has no rendered content!');
    }

    if (pageErrors.length > 0) {
      throw new Error(`PAGE HAS ${pageErrors.length} UNCAUGHT EXCEPTIONS!`);
    }

    console.log('\n✅ [E2E Verify] SUCCESS: Website rendered properly with 0 runtime errors!');
    success = true;
  } catch (err) {
    console.error('\n❌ [E2E Verify] FAILED:', err.message);
    success = false;
  } finally {
    await browser.close();
    server.httpServer.close();
    console.log('🛑 [E2E Verify] Server and browser closed.\n');
    if (!success) {
      process.exit(1);
    }
  }
})();
