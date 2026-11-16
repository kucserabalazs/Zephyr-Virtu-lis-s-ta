const { chromium } = require('playwright');
(async () => {
  const lvls = JSON.parse(process.argv[2] || '[101]');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 640, height: 400 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(1500);
  for (const lvl of lvls) {
    await p.evaluate((lvl) => { const W = ZephyrWorld, S = W._race; S.mixFleet = false; S.todMix = false; S.nightForce = null; S.lvl = lvl; W._raceGo = true; W.open('race'); }, lvl);
    await p.waitForFunction((lvl) => { const S = ZephyrWorld._race; return S && S.boat && S.C && S.C.lvl === lvl && S.water; }, lvl, { timeout: 90000 });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => { const W = ZephyrWorld, S = W._race, B = W._bal, v = B.balXY(S.venue.lat, S.venue.lon);
      const land = S.marks.map((m, i) => { const pts = m.gate ? [m.gate.a, m.gate.b, m] : [m]; return pts.every((q) => B.balInLake(v[0] + q.x, v[1] + q.z)) ? '' : 'SZÁRAZFÖLD:' + i; }).filter(Boolean);
      const t0 = performance.now(); let st = 0; S.paused = false;
      const best = S.riv.map(() => ({ n: 0, fin: null })); for (let k = 0; k < 9000; k++) { W.tick(.1); st = k; S.riv.forEach((r, i) => { best[i].n = Math.max(best[i].n, r.next || 0); if (r.fin && best[i].fin == null) best[i].fin = Math.round(r.fin); }); if (best.every((q) => q.fin != null)) break; }
      return { n: S.C.name, night: !!(W._ngt && W._ngt.on), storm: W._ngt && W._ngt.storm, ven: S.venue.id, marks: S.marks.map((m) => (m.gate ? 'K' : m.sd === -1 ? 'J' : 'B') + (m.nm ? ':' + m.nm : '')).join(' '), land, ms: Math.round(performance.now() - t0), simT: Math.round(S.t), riv: best.map((q) => [q.n, q.fin]), lim: S.lim || S.limT || null };
    });
    console.log(lvl, JSON.stringify(r));
  }
  console.log('hibák:', errs.slice(0, 8).join('\n'));
  await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 500)); process.exit(1); });
