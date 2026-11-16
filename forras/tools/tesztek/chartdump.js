const { chromium } = require('playwright');
(async () => {
  const O = JSON.parse(process.argv[2] || '{}');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 700, height: 450 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(2000);
  await p.evaluate((O) => { const W = ZephyrWorld, S = W._race; S.mixFleet = false; S.todMix = false; S.nightForce = false; S.lvl = O.lvl || 3; W._raceGo = true; W.open('race'); }, O);
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C && S.ck; }, null, { timeout: 90000 }); await p.waitForTimeout(O.wait || 5000);
  const urls = [];
  for (const st of (O.states || ['pre'])) {
    const u = await p.evaluate((st) => { const W = ZephyrWorld, S = W._race; if (st === 'race') { S.st = 'race'; S.started = true; S.t = 75; S.next = 1; } if (st === 'up') { S.st = 'race'; S.started = true; S.t = 40; S.next = 0; } if (st === 'g2') { S.st = 'race'; S.started = true; S.t = 90; S.next = 2; } if (st === 'n3') { S.st = 'race'; S.started = true; S.t = 120; S.next = 3; } for (let i = 0; i < 40; i++) { W.tick(.05); if (st === 'g2') { S.next = 2; } if (st === 'n3') S.next = 3; if (st === 'up') S.next = 0; } return S.ck.chartT._canvas.toDataURL('image/png'); }, st);
    urls.push(u); }
  const fs = require('fs'); urls.forEach((u, i) => fs.writeFileSync(`/tmp/chart${i}.png`, Buffer.from(u.split(',')[1], 'base64')));
  console.log('ok', urls.length, errs.slice(0, 5).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 400)); process.exit(1); });
