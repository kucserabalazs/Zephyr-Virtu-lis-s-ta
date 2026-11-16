const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.board, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  const tabs = JSON.parse(process.argv[2] || '["nap"]');
  let k = 0;
  for (const t of tabs) {
    await p.evaluate((t) => { const H = ZephyrWorld._hb; H.board('w3'); const Z = H.HB.wz; Z.tab = t; Z.kind = 'one'; Z.lvl = t === 'nap' ? 101 : t === 'ej' ? 107 : t === 'kek' ? 201 : t === 'kek2' ? 202 : 1; if (t === 'kek2') Z.tab = 'kek'; H.HB.B.dirty = 1; }, t);
    await p.waitForTimeout(4000);
    await p.screenshot({ path: `/tmp/wiz_${k++}.png` });
  }
  console.log('hibák:', errs.slice(0, 5).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 500)); process.exit(1); });
