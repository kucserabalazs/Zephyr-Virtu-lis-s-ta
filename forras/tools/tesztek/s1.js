const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 760 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000); await p.screenshot({ path: 'h0.png' });
  await p.click('[data-g="race"]'); await p.waitForTimeout(25000);
  await p.screenshot({ path: 'h1.png' });
  const info = await p.evaluate(() => { const Z = window.ZephyrWorld; return Z ? Object.keys(Z).slice(0, 80).join(',') : 'none'; });
  console.log(info); console.log(errs);
  await b.close();
})();
