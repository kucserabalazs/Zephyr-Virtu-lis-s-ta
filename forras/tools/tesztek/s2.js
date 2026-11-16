const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 760 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  await p.click('[data-g="race"]'); await p.waitForTimeout(20000);
  await p.evaluate(() => ZephyrWorld._hb.walk(true)); await p.waitForTimeout(6000);
  await p.screenshot({ path: 'w1.png' });
  // felülnézet
  const data = await p.evaluate(() => { const sc = document.querySelector('a-scene'), r = sc.renderer, s = sc.object3D, Z = ZephyrWorld;
    const rp = Z.root.position.clone(); Z.root.position.set(0, 0, 0);
    const out = {}; const T3 = THREE;
    const shot = (cam, w, h) => { const rt = new T3.WebGLRenderTarget(w, h); r.setRenderTarget(rt); r.render(s, cam); const px = new Uint8Array(w * h * 4); r.readRenderTargetPixels(rt, 0, 0, w, h, px); r.setRenderTarget(null);
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const id = g.createImageData(w, h); for (let y = 0; y < h; y++) id.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); g.putImageData(id, 0, 0); return c.toDataURL('image/png'); };
    const o = new T3.OrthographicCamera(-70, 70, 50, -50, .1, 500); o.position.set(0, 200, -10); o.lookAt(0, 0, -10); o.up.set(0, 0, -1); o.lookAt(0, 0, -10); o.updateMatrixWorld();
    out.top = shot(o, 1400, 1000);
    const pc = new T3.PerspectiveCamera(50, 1.6, .1, 3000); pc.position.set(0, 45, 40); pc.lookAt(0, 0, -15); pc.updateMatrixWorld(); out.persp = shot(pc, 1600, 1000);
    const pc2 = new T3.PerspectiveCamera(55, 1.6, .1, 3000); pc2.position.set(0, 3, -48); pc2.lookAt(0, 2, 20); pc2.updateMatrixWorld(); out.back = shot(pc2, 1600, 1000);
    Z.root.position.copy(rp); return out; });
  const fs = require('fs'); for (const k in data) fs.writeFileSync('w-' + k + '.png', Buffer.from(data[k].split(',')[1], 'base64'));
  console.log(errs);
  await b.close();
})();
