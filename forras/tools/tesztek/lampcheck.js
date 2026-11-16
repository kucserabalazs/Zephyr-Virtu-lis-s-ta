const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.houses, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const H = ZephyrWorld._hb, S = H.HB.solids || []; const bad = []; S.forEach((q) => { const cx = (q.x0 + q.x1) / 2, cz = (q.z0 + q.z1) / 2; H.houses.forEach((h) => { const B = h.box; if (cx > B.x0 && cx < B.x1 && cz > B.z0 && cz < B.z1) bad.push([h.id, cx.toFixed(1), cz.toFixed(1)]); }); }); return { n: S.length, bad }; });
  console.log(JSON.stringify(r)); await b.close();
})();
