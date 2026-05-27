const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE_ERROR:', err.message));
  page.on('requestfailed', request => console.log('REQUEST_FAILED:', request.url(), request.failure().errorText));
  page.on('response', response => {
    if (!response.ok()) console.log('RESPONSE_ERROR:', response.url(), response.status());
  });
  
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  const content = await page.content();
  console.log('DOM_CONTENT:', content);
  
  await browser.close();
})();
