const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 800, height: 520 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300))); p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load/.test(t) || (m.type() === 'warning' && /ház|iskola|mozgás|házbelső|tantermek|tanár|tanuló/.test(t))) errs.push(m.type()[0] + ':' + t.slice(0, 300)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.rooms, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const H = ZephyrWorld._hb; if (!H.HB.walk) H.walk(true); }); await p.waitForTimeout(2000);
  const p0 = await p.evaluate(() => ZephyrWorld._hb.HB.pos);
  await p.keyboard.down('w'); await p.waitForTimeout(2500); await p.keyboard.up('w');
  const p1 = await p.evaluate(() => ZephyrWorld._hb.HB.pos);
  await p.evaluate(() => { ZephyrWorld._hb.HB.pos = { x: -26.2, z: 15.7 }; }); await p.waitForTimeout(6000);
  const st = await p.evaluate(() => { const H = ZephyrWorld._hb; return { room: Object.keys(H.rooms).filter((k) => H.rooms[k].tch).length, inVih: H.houses.find((h) => h.id === 'vih').innerG.visible, isk: H.houses.find((h) => h.id === 'isk').innerG.visible }; });
  console.log('séta', JSON.stringify(p0), '→', JSON.stringify(p1), 'állapot', JSON.stringify(st));
  console.log(errs.slice(0, 12).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 400)); process.exit(1); });
