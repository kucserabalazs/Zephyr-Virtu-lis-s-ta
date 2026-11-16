const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { if (/mozgás|versenyiroda|Error|error/.test(m.text()) && !/GL Driver|404|deprecated/.test(m.text())) errs.push('c:' + m.text().slice(0, 200)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb, null, { timeout: 60000 }); await p.waitForTimeout(6000);
  console.log(JSON.stringify(await p.evaluate(() => { const H = ZephyrWorld._hb.HB; return { walk: H.walk, wiz: H.wizOn, pos: H.pos, tps: (H.tps||[]).length }; })));
  await p.screenshot({ path: 't1a.png' });
  // séta W-vel 2 mp
  await p.keyboard.down('KeyW'); await p.waitForTimeout(2500); await p.keyboard.up('KeyW');
  console.log('W után', JSON.stringify(await p.evaluate(() => ZephyrWorld._hb.HB.pos)));
  await p.keyboard.down('KeyW'); await p.waitForTimeout(25000); await p.keyboard.up('KeyW');
  console.log('25 mp W után', JSON.stringify(await p.evaluate(() => ZephyrWorld._hb.HB.pos)));
  await p.screenshot({ path: 't1b.png' });
  // gomb
  await p.evaluate(() => { const Z = ZephyrWorld; Z._hb.HB; }); 
  console.log(errs.join('\n'));
  await b.close();
})();
