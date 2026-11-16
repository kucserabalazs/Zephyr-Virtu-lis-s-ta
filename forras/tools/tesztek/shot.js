// használat: node shot.js out-prefix 'JSON nézetlista [[x,y,z,tx,ty,tz,fov],...]' [walk]
const { chromium } = require('playwright');
(async () => {
  const pre = process.argv[2], views = JSON.parse(process.argv[3]);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') errs.push('c:' + m.text().slice(0, 200)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/' + (process.env.Q || ''), { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  if (!process.env.NOCLICK) { await p.click('[data-g="race"]'); }
  await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb, null, { timeout: 60000 });
  await p.waitForTimeout(4000);
  if (!process.env.NOWALK) await p.evaluate(() => { const H = ZephyrWorld._hb; if (!H.HB.walk) H.walk(true); });
  await p.waitForTimeout(5000);
  const data = await p.evaluate((views) => { const sc = document.querySelector('a-scene'), r = sc.renderer, s = sc.object3D, Z = ZephyrWorld, T3 = THREE;
    const rp = Z.root.position.clone(); try { const f=[...document.querySelectorAll('a-scene [geometry]')].find(e => (e.getAttribute('geometry')||{}).radius === 1.2); f.object3D.visible=false; } catch(e){} Z.root.position.set(0, 0, 0); Z.root.updateMatrixWorld(true);
    const shot = (cam, w, h) => { const rt = new T3.WebGLRenderTarget(w, h); r.setRenderTarget(rt); r.render(s, cam); const px = new Uint8Array(w * h * 4); r.readRenderTargetPixels(rt, 0, 0, w, h, px); r.setRenderTarget(null); rt.dispose();
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const id = g.createImageData(w, h); for (let y = 0; y < h; y++) id.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); g.putImageData(id, 0, 0); return c.toDataURL('image/jpeg', .85); };
    const out = views.map((v) => { let cam; if (v[6] === 'top') { const H = v[7] || 60; cam = new T3.OrthographicCamera(-H * 1.4, H * 1.4, H, -H, .1, 800); cam.position.set(v[0], 300, v[2]); cam.up.set(0, 0, -1); cam.lookAt(v[0], 0, v[2]); }
      else { cam = new T3.PerspectiveCamera(v[6] || 55, 1.5, .05, 4000); cam.position.set(v[0], v[1], v[2]); cam.lookAt(v[3], v[4], v[5]); } cam.updateMatrixWorld(); return shot(cam, 1200, 800); });
    Z.root.position.copy(rp); return out; }, views);
  const fs = require('fs'); data.forEach((d, i) => fs.writeFileSync(`${pre}${i}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
  console.log(errs.slice(0, 8).join('\n'));
  await b.close();
})();
