const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  console.log('Starting serve...');
  const serveProcess = spawn('npx', ['serve', '-s', 'dist', '-l', '5174'], {
    cwd: path.resolve(__dirname),
    shell: true
  });

  await new Promise(resolve => {
    serveProcess.stdout.on('data', (data) => {
      console.log(`serve: ${data}`);
      if (data.toString().includes('Accepting connections')) {
        resolve();
      }
    });
    // fallback timeout just in case
    setTimeout(resolve, 8000);
  });

  console.log('Starting Playwright...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGE_ERROR:', err.message, err.stack));
  page.on('requestfailed', request => console.log('BROWSER REQUEST_FAILED:', request.url(), request.failure().errorText));

  try {
    console.log('Navigating to http://localhost:5174/chat ...');
    
    // Setup fake auth in localStorage before loading the page
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { id: '123', email: 'test@test.com' },
          token: 'fake-token'
        },
        version: 0
      }));
    });
    
    await page.goto('http://localhost:5174/chat', { waitUntil: 'networkidle' });
    const content = await page.content();
    console.log('DOM length:', content.length);
    console.log('Has #root?', content.includes('id="root"'));
    console.log('Content inside #root:', content.split('<div id="root">')[1].split('</div>')[0]);
  } catch (e) {
    console.error('Playwright Error:', e);
  }

  await browser.close();
  serveProcess.kill();
  process.exit(0);
})();
