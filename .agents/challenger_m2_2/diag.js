const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5000');
  await page.waitForSelector('#login-username');
  await page.type('#login-username', 'admin');
  await page.type('#login-password', 'admin123');
  await page.click('#login-form button[type="submit"]');
  await page.waitForSelector('#app:not(.hidden)');
  await page.click('a.nav-item[data-page="staff"]');
  await page.waitForSelector('#page-staff.active');
  await new Promise(r => setTimeout(r, 500));

  const diag = await page.evaluate(() => {
    const currentUser = (typeof Auth !== 'undefined' && Auth.user) ? Auth.user : ((typeof App !== 'undefined' && App.user) ? App.user : null);
    
    // Intercept data passed to render or staff table rows
    const rows = Array.from(document.querySelectorAll('#staff-table tr')).map(tr => {
      const editBtn = tr.querySelector('button[title="Edit"]');
      const deleteBtn = tr.querySelector('button[title="Delete"]');
      return {
        html: tr.innerHTML,
        text: tr.innerText,
        hasEdit: !!editBtn,
        hasDelete: !!deleteBtn
      };
    });

    return {
      currentUser,
      rows
    };
  });

  console.log('CurrentUser:', JSON.stringify(diag.currentUser, null, 2));
  console.log('Rows:', JSON.stringify(diag.rows, null, 2));
  await browser.close();
})();
