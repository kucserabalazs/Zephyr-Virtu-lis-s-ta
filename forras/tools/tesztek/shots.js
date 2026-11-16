// node shots.js <előtag> '<json>'  — O.vjs: JS (W,S,root) -> [[px,py,pz, lx,ly,lz, fov], ...] VILÁG-koordinátában; O.pre: JS a futam elején; O.step: W.tick lépések nézetenként
const { chromium } = require('playwright');
(async () => {
  const pre = process.argv[2] || '/tmp/s', O = JSON.parse(process.argv[3] || '{}');
  const VW = O.w || 900, VH = O.h || 600;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300))); p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load/.test(t) || /TESZT/.test(t)) errs.push(m.type()[0] + ':' + t.slice(0, 300)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/' + (O.q || ''), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(2000);
  await p.evaluate((O) => { const W = ZephyrWorld, S = W._race; S.mixFleet = !!O.mix; S.todMix = false; S.nightForce = !!O.night; S.lvl = O.lvl == null ? 1 : O.lvl; if (O.cls) W._hb.HB.sel = O.cls; if (O.pre0) (new Function('W', 'S', O.pre0))(W, S); W._raceGo = true; W.open('race'); }, O);
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C && S.water; }, null, { timeout: 90000 });
  await p.waitForTimeout(O.wait || 5000);
  if (O.pre) { const r = await p.evaluate((src) => { try { return (new Function('W', 'S', src))(ZephyrWorld, ZephyrWorld._race); } catch (e) { return 'hiba ' + e.message + ' ' + e.stack.slice(0, 300); } }, O.pre); console.log('pre', JSON.stringify(r)); if (O.wait2) await p.waitForTimeout(O.wait2); }
  const data = await p.evaluate(async ([O, VW, VH]) => {
    const sc = document.querySelector('a-scene'), r = sc.renderer, s = sc.object3D, Z = ZephyrWorld, S = Z._race, out = [];
    if (O.step0) for (let k = 0; k < O.step0; k++) { try { Z.tick(1 / 30); } catch (e) {} }
    Z.root.updateMatrixWorld(true);
    const views = (new Function('W', 'S', 'root', O.vjs))(Z, S, Z.root);
    for (const v of views) {
      if (O.step) for (let k = 0; k < O.step; k++) { try { Z.tick(1 / 30); } catch (e) {} }
      const cam = new THREE.PerspectiveCamera(v[6] || 60, VW / VH, .1, 8000);
      const P = new THREE.Vector3(v[0], v[1], v[2]), L = new THREE.Vector3(v[3], v[4], v[5]);
      cam.position.copy(P); cam.lookAt(L); cam.updateMatrixWorld();
      try { S.water.userData.mat.uniforms.uCam.value.copy(S.env.worldToLocal(P.clone())); } catch (e) {}
      const rt = new THREE.WebGLRenderTarget(VW, VH, { samples: 0 }); rt.texture.colorSpace = THREE.SRGBColorSpace; r.setRenderTarget(rt); r.render(s, cam); const px = new Uint8Array(VW * VH * 4); r.readRenderTargetPixels(rt, 0, 0, VW, VH, px); r.setRenderTarget(null); rt.dispose();
      const c = document.createElement('canvas'); c.width = VW; c.height = VH; const g = c.getContext('2d'); const id = g.createImageData(VW, VH); for (let y = 0; y < VH; y++) id.data.set(px.subarray((VH - 1 - y) * VW * 4, (VH - y) * VW * 4), y * VW * 4); g.putImageData(id, 0, 0); out.push(c.toDataURL('image/jpeg', .9)); }
    return out; }, [O, VW, VH]);
  const fs = require('fs'); data.forEach((d, i) => fs.writeFileSync(`${pre}${i}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
  console.log('képek', data.length); console.log(errs.slice(0, 10).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 400)); process.exit(1); });
