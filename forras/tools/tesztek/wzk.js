const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300))); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) errs.push('c:' + m.text().slice(0, 200)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.evaluate(() => { try { localStorage.setItem('zephyr-hajo', 'flamingo'); } catch (e) {} });
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.board, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  await p.evaluate((LV) => { const H = ZephyrWorld._hb; H.wz(3); const Z = H.HB.wz; Z.tab = 'kek'; Z.kind = 'one'; Z.lvl = LV; Z.cls = 'flamingo'; Z.mode = 'solo'; H.board('w4'); H.HB.B.dirty = 1; }, +(process.env.LVL || 201));
  await p.waitForTimeout(3500); await p.screenshot({ path: '/tmp/wzk_w4.png' });
  await p.evaluate(() => ZephyrWorld._hb.start());
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C && S.C.kek && S.water && ZephyrWorld.kind === 'race'; }, null, { timeout: 120000 });
  await p.waitForTimeout(5000);
  const r = await p.evaluate(() => { const W = ZephyrWorld, S = W._race, K = W._kek; return { cls: S.cls.id, on: K.on, lvl: K.lvl, si: K.si, name: S.C.name, st: S.st, fleet: K.fl && K.fl.n, winds: K.W && K.W.map((w) => w.kn.toFixed(1) + '/' + w.side), ideal: K.W && Math.round(K.W.reduce((a, w) => a + w.ideal, 0)) }; });
  console.log(JSON.stringify(r));
  await p.screenshot({ path: '/tmp/wzk_race.png' });
  console.log('hibák:', errs.slice(0, 6).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 500)); process.exit(1); });
