const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('c:' + m.text().slice(0, 200)); if (m.type() === 'warning' && /felhő|csomó|háttér|ház|vih|cso/.test(m.text())) errs.push('w:' + m.text().slice(0, 200)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb, null, { timeout: 60000 }); await p.waitForTimeout(4000);
  await p.evaluate(() => { const H = ZephyrWorld._hb; if (!H.HB.walk) H.walk(true); }); await p.waitForTimeout(3000);
  const views = JSON.parse(process.argv[3]);
  const data = await p.evaluate(async (views) => { const sc = document.querySelector('a-scene'), r = sc.renderer, s = sc.object3D, Z = ZephyrWorld, T3 = THREE; const out = [];
    for (const v of views) { if (v[7]) { Z._hb.HB.pos = { x: v[7], z: v[8] }; } for (let k = 0; k < 6; k++) { try { Z.tick(.05); } catch (e) {} await new Promise((r) => setTimeout(r, 60)); }
      const rp = Z.root.position.clone(), rq = Z.root.quaternion.clone(); Z.root.position.set(0, 0, 0); Z.root.quaternion.identity(); Z.root.updateMatrixWorld(true);
      const cam = new T3.PerspectiveCamera(v[6] || 60, 1.5, .05, 4000); cam.position.set(v[0], v[1], v[2]); cam.lookAt(v[3], v[4], v[5]); cam.updateMatrixWorld();
      const rt = new T3.WebGLRenderTarget(900, 600); r.setRenderTarget(rt); r.render(s, cam); const px = new Uint8Array(900 * 600 * 4); r.readRenderTargetPixels(rt, 0, 0, 900, 600, px); r.setRenderTarget(null); rt.dispose();
      const c = document.createElement('canvas'); c.width = 900; c.height = 600; const g = c.getContext('2d'); const id = g.createImageData(900, 600); for (let y = 0; y < 600; y++) id.data.set(px.subarray((599 - y) * 3600, (600 - y) * 3600), y * 3600); g.putImageData(id, 0, 0); out.push(c.toDataURL('image/jpeg', .85));
      Z.root.position.copy(rp); Z.root.quaternion.copy(rq); Z.root.updateMatrixWorld(true); }
    return out; }, views);
  const fs = require('fs'); data.forEach((d, i) => fs.writeFileSync(`${process.argv[2]}${i}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
  console.log('képek', data.length); console.log(errs.slice(0, 10).join('\n')); await b.close();
})();
