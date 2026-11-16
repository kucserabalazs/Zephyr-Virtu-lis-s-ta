const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 640 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300))); p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load/.test(t)) errs.push('c:' + t.slice(0, 200)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(2000);
  await p.evaluate(() => { const W = ZephyrWorld, S = W._race; S.mixFleet = false; S.todMix = false; S.nightForce = false; S.lvl = 4; W._raceGo = true; W.open('race'); });
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C && S.ck; }, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const W = ZephyrWorld, S = W._race; S.t = 0.5; S.st = 'race'; S.started = true; for (let i = 0; i < 160; i++) { try { W.tick(.1); } catch (e) { return 'tick hiba ' + e.message; } }
    const n = S.rec ? S.rec.f.length : 0; const L = S.rec && S.rec.f[0] ? S.rec.f[0].length : 0; W.vrReplay(true); for (let i = 0; i < 12; i++) W.tick(.1); return { n, L, rep: !!S.replay, mode: S.replay && S.replay.mode, awa: S.boat.userData.S.awa }; });
  console.log('rögzítés', JSON.stringify(r));
  const shots = []; for (const cam of ['kov', 'old', 'dron', 'boja']) { await p.evaluate((c) => { const S = ZephyrWorld._race; S.replay.cam = c; S.replay.cut = true; for (let i = 0; i < 6; i++) ZephyrWorld.tick(.1); }, cam); await p.waitForTimeout(2500); await p.screenshot({ path: `/tmp/rep_${cam}.png` }); }
  console.log(errs.slice(0, 8).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 400)); process.exit(1); });
