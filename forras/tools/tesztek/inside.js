// belső nézetek a házakról: node inside.js prefix 'id1,id2' 
const { chromium } = require('playwright');
(async () => {
  const pre = process.argv[2], ids = (process.argv[3] || 'vih,cso,mel,ter,izek,isk,els,vil').split(',');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error') errs.push('c:' + m.text().slice(0, 200)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/' + (process.env.Q || ''), { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  await p.click('[data-g="race"]');
  await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb, null, { timeout: 60000 });
  await p.waitForTimeout(4000);
  await p.evaluate(() => { const H = ZephyrWorld._hb; if (!H.HB.walk) H.walk(true); });
  await p.waitForTimeout(4000);
  const views = process.env.VIEWS ? JSON.parse(process.env.VIEWS) : null;
  if (process.env.REL) await p.evaluate(() => { window.__REL = 1; });
  const data = await p.evaluate(async ([ids, views]) => { const sc = document.querySelector('a-scene'), r = sc.renderer, s = sc.object3D, Z = ZephyrWorld, T3 = THREE, H = Z._hb;
    const out = [];
    const shot = (cam, w, h) => { const rt = new T3.WebGLRenderTarget(w, h); r.setRenderTarget(rt); r.render(s, cam); const px = new Uint8Array(w * h * 4); r.readRenderTargetPixels(rt, 0, 0, w, h, px); r.setRenderTarget(null); rt.dispose();
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const id = g.createImageData(w, h); for (let y = 0; y < h; y++) id.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); g.putImageData(id, 0, 0); return c.toDataURL('image/jpeg', .85); };
    for (const id of ids) { const R = H.rooms[id]; if (!R) { out.push(null); continue; } const h = R.h, B = h.box, F = h.F;
      // szereplők a házban
      try { H.HB.pos = { x: h.seat.x, z: h.seat.z }; Z.tick(.016); } catch (e) {}
      await new Promise((res) => setTimeout(res, 1200)); try { Z.tick(.016); } catch (e) {}
      try { const f = [...document.querySelectorAll('a-scene [geometry]')].find(e => (e.getAttribute('geometry') || {}).radius === 1.2); if (f) f.object3D.visible = false; } catch (e) {}
      const rp = Z.root.position.clone(), rq = Z.root.quaternion.clone(); Z.root.position.set(0, 0, 0); Z.root.quaternion.identity(); Z.root.updateMatrixWorld(true);
      const xc = (B.x0 + B.x1) / 2, zc = (B.z0 + B.z1) / 2, E = F + 1.55;
      const V = views || [
        [h.seat.x, F + 1.25, h.seat.z, h.board.x, h.board.y, h.board.z, 62],          // a székből a táblára
        [xc, E, B.z1 - .6, xc, E - .1, B.z0 - 3, 75],                                    // hátulról az ajtó/vízfelőli fal felé
        [B.x1 - .5, E, zc, B.x0 - 3, E - .1, zc, 75],                                     // keletről nyugatra
        [B.x0 + .5, E, zc, B.x1 + 3, E - .1, zc, 75] ];                                   // nyugatról keletre
      const VV = (views && window.__REL) ? views.map((v) => [B.x0 + v[0], F + v[1], B.z0 + v[2], B.x0 + v[3], F + v[4], B.z0 + v[5], v[6]]) : V;
      for (const v of VV) { const cam = new T3.PerspectiveCamera(v[6] || 60, 1.5, .03, 3000); cam.position.set(v[0], v[1], v[2]); cam.lookAt(v[3], v[4], v[5]); cam.updateMatrixWorld(); out.push(shot(cam, 900, 600)); }
      Z.root.position.copy(rp); Z.root.quaternion.copy(rq); Z.root.updateMatrixWorld(true); }
    return out; }, [ids, views]);
  const fs = require('fs'); data.forEach((d, i) => d && fs.writeFileSync(`${pre}${i}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
  console.log('képek:', data.filter(Boolean).length); console.log(errs.slice(0, 8).join('\n'));
  await b.close();
})();
