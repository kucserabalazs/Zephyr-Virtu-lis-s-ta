const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const bad = []; p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().replace('http://localhost:8097','')); });
  const ok = []; p.on('response', r => { if (/kepek\//.test(r.url())) ok.push(r.status() + ' ' + r.url().split('/').pop()); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  await p.click('[data-g="race"]');
  await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb, null, { timeout: 60000 });
  await p.waitForTimeout(4000);
  await p.evaluate(() => { const H = ZephyrWorld._hb; if (!H.HB.walk) H.walk(true); });
  await p.waitForTimeout(3000);
  const info = await p.evaluate(async () => { const H = ZephyrWorld._hb, R = H.rooms.izek, h = R.h; H.HB.pos = { x: h.seat.x, z: h.seat.z }; for (let i = 0; i < 5; i++) { try { ZephyrWorld.tick(.016); } catch (e) {} await new Promise(r => setTimeout(r, 400)); }
    return { phIds: h.phIds, hasFoto: typeof FOTO, keys: Object.keys(h).slice(0, 40) }; });
  console.log(JSON.stringify(info));
  await p.waitForTimeout(4000);
  console.log('404 és hibák:', bad.join('\n') || '–');
  console.log('képek:', ok.length, ok.slice(0, 20).join(' | '));
  await b.close();
})();
