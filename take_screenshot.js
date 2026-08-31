import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:5000/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    const screenshotPath = 'C:\\Users\\Prathik\\.gemini\\antigravity-cli\\brain\\25194239-9811-4ce8-b265-828862bea71d\\landing_page.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('SCREENSHOT SAVED SUCCESSFULLY TO:', screenshotPath);
    
    await browser.close();
  } catch (err) {
    console.error('ERROR CAPTURING SCREENSHOT:', err);
  }
})();
