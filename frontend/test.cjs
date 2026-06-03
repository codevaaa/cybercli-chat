const puppeteer = require('puppeteer-core');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log('Setting auth state...');
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        session: { user: { email: 'test@example.com' }, access_token: 'fake-token' },
        user: { email: 'test@example.com' },
        initialized: true
      }
    }));
  });

  console.log('Navigating to http://localhost:4173/chat?vscode=true ...');
  await page.goto('http://localhost:4173/chat?vscode=true', { waitUntil: 'networkidle0' });
  
  console.log('Done!');
  await browser.close();
})();
