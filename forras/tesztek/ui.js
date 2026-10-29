const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [name, vp] of [['pc', { width: 1366, height: 900 }], ['tel', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport: vp, isMobile: name === 'tel', hasTouch: name === 'tel' });
    p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto('http://127.0.0.1:8096/virtualis-seta/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.ZephyrBooking.open());
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `s-book-${name}.png` });
    console.log(name, await p.evaluate(() => document.querySelector('.zfb-ntak').innerText + ' | ' + document.querySelector('.zfb-pay').innerText));
    await p.evaluate(() => { window.ZephyrBooking.close(); setTimeout(() => window.ZephyrAdmin.open(), 400); });
    await p.waitForTimeout(1200);
    if (await p.$('.zad-login input')) { await p.fill('.zad-login input', process.env.ZEPHYR_PW || ''); await p.click('.zad-login button'); await p.waitForTimeout(1500); }
    await p.screenshot({ path: `s-list-${name}.png`, fullPage: false });
    await p.click('[data-tab="settings"]'); await p.waitForTimeout(600);
    await p.screenshot({ path: `s-set-${name}.png` });
    await p.evaluate(() => { const h = [...document.querySelectorAll('.zad-sec h3')].find(x => /Bankszámla/.test(x.textContent)); h.scrollIntoView(); });
    await p.waitForTimeout(300); await p.screenshot({ path: `s-bank-${name}.png` });
    await p.click('[data-tab="list"]'); await p.waitForTimeout(500);
    const d = await p.$('[data-act="delext"]'); if (d) { await d.scrollIntoViewIfNeeded(); await p.screenshot({ path: `s-ext-${name}.png` }); await d.click(); await p.waitForTimeout(400); await p.screenshot({ path: `s-dlg-${name}.png` }); await p.click('[data-dlgclose]'); }
    await p.click('[data-tab="cal"]'); await p.waitForTimeout(400); await p.click('[data-month="1"]'); await p.waitForTimeout(400); await p.screenshot({ path: `s-cal-${name}.png` });
    await p.close();
  }
  console.log('errors', errs); await b.close();
})();
