const { chromium } = require('playwright');
(async () => {
  const lvl = +(process.argv[2] || 105);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 640, height: 400 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(1500);
  await p.evaluate((lvl) => { const W = ZephyrWorld, S = W._race; S.mixFleet = false; S.todMix = false; S.lvl = lvl; W._raceGo = true; W.open('race'); }, lvl);
  await p.waitForFunction((lvl) => { const S = ZephyrWorld._race; return S && S.boat && S.C && S.C.lvl === lvl && S.water; }, lvl, { timeout: 90000 });
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const W = ZephyrWorld, S = W._race, out = [];
    out.push('marks ' + JSON.stringify(S.marks.map((m) => [Math.round(m.x), Math.round(m.z), m.sd || 0, m.gate ? 'G' : '']))); out.push('wf ' + Math.round(S.C.wf * 57.3));
    for (let k = 0; k < 4000; k++) { W.tick(.1); if (k % 300 === 0) out.push(Math.round(S.t) + ' ' + S.riv.map((r) => `[${Math.round(r.x)},${Math.round(r.z)} b${Math.round(r.b * 57.3) % 360} v${r.v.toFixed(1)} n${r.next} st${r.started ? 1 : 0}]`).join(' ')); }
    return out; });
  console.log(r.join('\n')); console.log('hibák:', errs.slice(0, 5).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 500)); process.exit(1); });
