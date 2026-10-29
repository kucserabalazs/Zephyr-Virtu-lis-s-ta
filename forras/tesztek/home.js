const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [name, vp] of [['pc', { width: 1366, height: 860 }], ['tel', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: name === 'tel', hasTouch: name === 'tel' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text().slice(0, 140)); });
    await p.goto('http://127.0.0.1:8096/uj/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4200);
    await p.screenshot({ path: `h-hero-${name}.png` });
    await p.screenshot({ path: `h-full-${name}.png`, fullPage: true });
    await ctx.close();
  }
  console.log(errs.join('\n')); await b.close();
})();
