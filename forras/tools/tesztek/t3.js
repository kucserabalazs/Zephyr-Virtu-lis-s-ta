const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  for (const [nm, vp, mob] of [['pc', { width: 1280, height: 760 }, false], ['tel', { width: 390, height: 800 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mob, hasTouch: mob }); const p = await ctx.newPage();
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb, null, { timeout: 60000 }); await p.waitForTimeout(9000);
  await p.screenshot({ path: `m-${nm}-0.png` });
  await p.evaluate(() => { const H = ZephyrWorld._hb.HB; H.pos = { x: 0, z: -45.2 }; }); await p.waitForTimeout(4000);
  await p.screenshot({ path: `m-${nm}-1.png` });
  // a gomb: verseny menü
  await p.evaluate(() => { ZephyrWorld._hb.HB; }); 
  const st = await p.evaluate(() => { try { const H = ZephyrWorld._hb.HB; const hit = [...ZephyrWorld.objs].find(o => o.userData && o.userData.xr && o.parent && o.parent.parent && o.parent.parent.name === 'versenyiroda'); hit.userData.xr.click(); return { wiz: H.wizOn, page: H.page, pos: H.pos }; } catch (e) { return String(e); } });
  await p.waitForTimeout(4000); console.log(nm, JSON.stringify(st)); await p.screenshot({ path: `m-${nm}-2.png` });
  console.log(errs.join('\n')); await ctx.close(); }
  await b.close();
})();
