const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.rooms && Object.keys(ZephyrWorld._hb.rooms).length, null, { timeout: 60000 });
  const r = await p.evaluate(() => { const o = {}; const R = ZephyrWorld._hb.rooms; for (const id in R) o[id] = R[id].lessons.map((q) => ({ s: q.s, t: q.t, say: q.say })); return o; });
  require('fs').writeFileSync(process.argv[2] || 'lessons.json', JSON.stringify(r, null, 1)); await b.close();
})();
