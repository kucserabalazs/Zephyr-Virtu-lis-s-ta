const { chromium } = require('playwright');
(async () => {
  const O = JSON.parse(process.argv[2] || '{}');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 640 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300))); p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load/.test(t) || /kékszalag|TESZT/.test(t)) errs.push(m.type()[0] + ':' + t.slice(0, 300)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(1500);
  await p.evaluate((O) => { const W = ZephyrWorld, S = W._race; S.mixFleet = false; S.todMix = false; S.nightForce = null; try { localStorage.setItem('zephyr-hajo', O.cls || 'zephyr'); } catch (e) {} W._kekApi.begin(O.lvl || 201); W._kek.si = O.si || 0; if (O.cls) W._hb.HB.sel = O.cls; else W._hb.HB.sel = 'zephyr'; S.lvl = O.lvl || 201; W._raceGo = true; W.open('race'); }, O);
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C && S.C.kek && S.water; }, null, { timeout: 120000 });
  await p.waitForTimeout(O.wait || 4000);
  let k = 0;
  for (const st of (O.steps || [{}])) {
    if (st.eval) { const r = await p.evaluate((src) => { try { return (new Function('W', 'S', 'K', src))(ZephyrWorld, ZephyrWorld._race, ZephyrWorld._kek); } catch (e) { return 'hiba: ' + e.message + ' ' + (e.stack || '').slice(0, 400); } }, st.eval); console.log('eval', k, JSON.stringify(r).slice(0, 1500)); }
    if (st.wait) await p.waitForTimeout(st.wait);
    if (st.shot) await p.screenshot({ path: `${st.shot}` });
    k++;
  }
  console.log('hibák:\n' + errs.slice(0, 10).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 500)); process.exit(1); });
