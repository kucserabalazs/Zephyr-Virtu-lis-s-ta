const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 860 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8096/uj/#rendezvenyek'); await p.waitForTimeout(2500);
  await p.evaluate(() => document.getElementById('rendezvenyek').scrollIntoView()); await p.waitForTimeout(400);
  await p.screenshot({ path: 'h3-ev.png' });
  await p.evaluate(() => document.querySelector('[data-svc="steg"]').click()); await p.waitForTimeout(900);
  await p.screenshot({ path: 'h3-lb.png' });
  console.log(errs); await b.close();
})();
