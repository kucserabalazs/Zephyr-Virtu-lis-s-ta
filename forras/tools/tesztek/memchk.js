const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 800, height: 500 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 200)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const W = ZephyrWorld, S = W._race; S.mixFleet = false; S.todMix = false; S.nightForce = null; S.lvl = 1; W._raceGo = true; W.open('race'); });
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C && S.water && S.setup; }, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  const seq = [1, 7, 101, 106, 3, 108, 'k0', 'k4', 'k6', 'k8', 2, 104, 1, 7, 101, 106, 3, 108, 'k0', 'k4', 'k6', 'k8', 2, 104];
  for (const L of seq) {
    const r = await p.evaluate(async (L) => { const W = ZephyrWorld, S = W._race, sc = document.querySelector('a-scene'), R = sc.renderer;
      if (typeof L === 'string') { const si = +L.slice(1); if (!W._kek.on) W._kekApi.begin(201); W._kek.si = si; W._kek.stageEnd = -1; S.setup(201); } else S.setup(L);
      for (let n = 0; n < 120; n++) W.tick(1 / 20);
      await new Promise((res) => setTimeout(res, 3500));
      R.info.reset && R.info.reset(); R.render(sc.object3D, sc.camera); const I = R.info;
      return { L, geo: I.memory.geometries, tex: I.memory.textures, prog: I.programs ? I.programs.length : -1, calls: I.render.calls, tris: I.render.triangles, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1 };
    }, L);
    console.log(JSON.stringify(r));
  }
  console.log('hibák:', errs.slice(0, 5).join(' | ')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 400)); process.exit(1); });
