// Versenyteszt: node race.js <kimenet-előtag> '<json beállítás>'
// beállítás: { lvl, night, cls, waits:[ms...], vp:[w,h], steer:[[t,dir]...], stat:1, eval:"js" }
const { chromium } = require('playwright');
(async () => {
  const pre = process.argv[2] || '/tmp/r', O = JSON.parse(process.argv[3] || '{}');
  const vp = O.vp || [1100, 700];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: vp[0], height: vp[1] }, locale: 'hu-HU', isMobile: !!O.mobile, hasTouch: !!O.mobile });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300)));
  p.on('console', m => { const t = m.text(); if ((m.type() === 'error' && !/404|Failed to load/.test(t)) || /TESZT/.test(t)) errs.push(m.type()[0] + ':' + t.slice(0, 300)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/' + (O.q || ''), { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.click('[data-g="race"]');
  await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._race, null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.evaluate((O) => {
    const W = ZephyrWorld, S = W._race, H = W._hb;
    try { if (O.cls) H.HB.sel = O.cls; } catch (e) {}
    S.mixFleet = false; S.todMix = false; S.nightForce = O.night ? true : false; S.lvl = O.lvl == null ? 1 : O.lvl;
    if (O.pre) { try { (new Function('W', 'S', O.pre))(W, S); } catch (e) { console.log('TESZT pre hiba ' + e.message); } }
    W._raceGo = true; W.open('race');
  }, O);
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C; }, null, { timeout: 90000 });
  const t0 = Date.now(); let k = 0;
  for (const w of (O.waits || [6000])) {
    await p.waitForTimeout(w);
    if (O.eval) { const r = await p.evaluate((src) => { try { return (new Function('W', 'S', src))(ZephyrWorld, ZephyrWorld._race); } catch (e) { return 'hiba: ' + e.message; } }, O.eval); console.log('eval', k, JSON.stringify(r)); }
    await p.screenshot({ path: `${pre}${k}.png` }); k++;
  }
  if (O.stat) {
    const st = await p.evaluate(() => { const sc = document.querySelector('a-scene'), r = sc.renderer, i = r.info; return { calls: i.render.calls, tri: i.render.triangles, geo: i.memory.geometries, tex: i.memory.textures, prog: (i.programs || []).length }; });
    console.log('stat', JSON.stringify(st));
  }
  console.log('hibák:\n' + errs.slice(0, 14).join('\n'));
  await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 500)); process.exit(1); });
