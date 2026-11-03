import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Launching headless Chrome via Puppeteer to verify live site...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleMessages.push({ type, text });
    if (type === 'error') {
      console.error(`[Browser Console Error]: ${text}`);
    } else {
      console.log(`[Browser Console ${type}]: ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.toString());
    console.error(`[Browser Uncaught Page Error]:`, err);
  });

  try {
    const targetUrl = 'https://2006phu.github.io/rideeat-soa/';
    console.log(`Navigating to: ${targetUrl}`);
    const response = await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log(`HTTP Status: ${response.status()}`);

    // Wait 2 seconds for React to mount and hydrate
    await new Promise((r) => setTimeout(r, 2000));

    // Check #root innerHTML
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        exists: !!root,
        innerHTML: root ? root.innerHTML.slice(0, 500) : '',
        childCount: root ? root.children.length : 0,
        bodyBg: window.getComputedStyle(document.body).backgroundColor
      };
    });

    console.log('\n=== ROOT CONTAINER INSPECTION ===');
    console.log('Root exists:', rootContent.exists);
    console.log('Root child count:', rootContent.childCount);
    console.log('Root HTML preview:', rootContent.innerHTML.slice(0, 200));

    // Take screenshot
    await page.screenshot({ path: 'live-screenshot.png' });
    console.log('Screenshot saved to live-screenshot.png');

    if (pageErrors.length > 0) {
      console.error(`\n❌ FOUND ${pageErrors.length} UNCAUGHT PAGE ERRORS:`);
      pageErrors.forEach((e, idx) => console.error(`${idx + 1}. ${e}`));
    } else {
      console.log('\n✅ NO UNCAUGHT PAGE ERRORS!');
    }
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
