const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const out = []; p.on('console', m => { if (/MAPUNDEF/.test(m.text())) out.push(m.text().slice(0, 900)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const M = THREE.Material.prototype, sv = M.setValues; M.setValues = function (v) { if (v && 'map' in v && v.map === undefined) console.log('MAPUNDEF ' + new Error().stack.split('\n').slice(2, 7).join(' <- ')); return sv.call(this, v); }; });
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.rooms, null, { timeout: 60000 }); await p.waitForTimeout(5000);
  await p.evaluate(async () => { const H = ZephyrWorld._hb; for (const id of ['vih', 'cso', 'mel', 'isk']) { H.sit(H.rooms[id]); await new Promise((r) => setTimeout(r, 1500)); } });
  console.log(out.join('\n\n')); await b.close();
})();
