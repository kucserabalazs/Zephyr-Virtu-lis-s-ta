const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 220)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.rooms && Object.keys(ZephyrWorld._hb.rooms).length, null, { timeout: 90000 });
  const r = await p.evaluate(() => { const H = ZephyrWorld._hb, out = {}; for (const id in H.rooms) { const R = H.rooms[id]; out[id] = { n: R.lessons.length, bad: [] }; R.lessons.forEach((q, i) => { if (!q.d) return; [0.5, 3, 7, 10, 11.5].forEach((t) => { try { const c = document.createElement('canvas'); c.width = 300; c.height = 190; q.d(c.getContext('2d'), t); } catch (e) { out[id].bad.push(i + ':' + q.t + ':' + e.message); } }); }); } return out; });
  Object.keys(r).forEach((k) => console.log(k, r[k].n, r[k].bad.length ? 'HIBA ' + r[k].bad.join(' | ') : 'ok'));
  const cso = await p.evaluate(() => ZephyrWorld._hb.rooms.cso ? ZephyrWorld._hb.rooms.cso.lessons.map((q, i) => i + ': ' + q.t) : 'nincs cso szoba'); console.log(Array.isArray(cso) ? cso.join('\n') : cso);
  console.log('oldalhibák:', errs.join(' ; ') || 'nincs'); await b.close();
})();
