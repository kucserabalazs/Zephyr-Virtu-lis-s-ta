// Bemérés a Kékszalag szakaszváltásakor (szimulált fej)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 700 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300)));
  p.on('console', m => { const t = m.text(); if ((m.type() === 'error' && !/404|Failed to load/.test(t)) || /bemérés/.test(t)) errs.push(m.type()[0] + ':' + t.slice(0, 300)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const W = ZephyrWorld, S = W._race; S.mixFleet = false; S.todMix = false; S.nightForce = null; W._kekApi.begin(201); W._kek.seed = 4242; W._kek.si = 0; W._hb.HB.sel = 'zephyr'; S.lvl = 201; W._calSim = { x: .1, y: 1.72, z: .2, yaw: .2 }; W._raceGo = true; W.open('race'); });
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C && S.C.kek && S.water; }, null, { timeout: 120000 });
  const run = async (sec) => p.evaluate((sec) => { const W = ZephyrWorld; for (let k = 0; k < Math.round(sec * 60); k++) W.tick(1 / 60); }, sec);
  const st = async (lbl) => { const r = await p.evaluate(() => { const W = ZephyrWorld, S = W._race, R = S.calR, K = W._kek; return { si: K.si, name: S.C.name, ph: R ? R.ph : null, t: +S.t.toFixed(2), st: S.st, cal: !!S.cal }; }); console.log(lbl, JSON.stringify(r)); };
  await st('1. szakasz eleje'); await run(4.2); await st('1. szakasz, bemérés után');
  await p.evaluate(() => { const W = ZephyrWorld; W._kek.board = null; W._calSim.x = .6; W._calSim.yaw = -.4; W._kekApi.next(); });
  await st('2. szakasz eleje (új bemérés?)'); await run(4.2); await st('2. szakasz, bemérés után');
  await p.screenshot({ path: '/tmp/calkek.png' });
  console.log('hibák:\n' + errs.slice(0, 10).join('\n'));
  await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 500)); process.exit(1); });
