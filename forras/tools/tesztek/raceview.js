// Versenyfutam saját kameranézetekből: node raceview.js <előtag> '<json>'  (views: [[x,y,z, lx,ly,lz, fov]], a hajóhoz (root) képest)
const { chromium } = require('playwright');
(async () => {
  const pre = process.argv[2] || '/tmp/v', O = JSON.parse(process.argv[3] || '{}');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300))); p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load/.test(t) || /TESZT/.test(t)) errs.push(m.type()[0] + ':' + t.slice(0, 300)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(2000);
  await p.evaluate((O) => { const W = ZephyrWorld, S = W._race; S.mixFleet = false; S.todMix = false; S.nightForce = !!O.night; S.lvl = O.lvl == null ? 1 : O.lvl; if (O.cls) W._hb.HB.sel = O.cls; W._raceGo = true; W.open('race'); }, O);
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C && S.water; }, null, { timeout: 90000 });
  await p.waitForTimeout(O.wait || 6000);
  if (O.pre) { const r = await p.evaluate((src) => { try { return (new Function('W', 'S', src))(ZephyrWorld, ZephyrWorld._race); } catch (e) { return 'hiba ' + e.message; } }, O.pre); console.log('pre', JSON.stringify(r)); if (O.wait2) await p.waitForTimeout(O.wait2); }
  const data = await p.evaluate(async (O) => {
    const sc = document.querySelector('a-scene'), r = sc.renderer, s = sc.object3D, Z = ZephyrWorld, S = Z._race, out = [];
    for (const v of O.views) {
      if (O.step) for (let k = 0; k < O.step; k++) { try { Z.tick(1 / 30); } catch (e) {} }
      const cam = new THREE.PerspectiveCamera(v[6] || 60, 1.5, .1, 6000);
      const root = Z.root; root.updateMatrixWorld(true);
      const P = new THREE.Vector3(v[0], v[1], v[2]), L = new THREE.Vector3(v[3], v[4], v[5]); root.localToWorld(P); root.localToWorld(L);
      cam.position.copy(P); cam.lookAt(L); cam.updateMatrixWorld();
      /* a víz shadere a kamerához igazodik */ try { S.water.userData.mat.uniforms.uCam.value.copy(S.env.worldToLocal(P.clone())); } catch (e) {}
      const rt = new THREE.WebGLRenderTarget(900, 600, { samples: 0 }); rt.texture.colorSpace = THREE.SRGBColorSpace; r.setRenderTarget(rt); r.render(s, cam); const px = new Uint8Array(900 * 600 * 4); r.readRenderTargetPixels(rt, 0, 0, 900, 600, px); r.setRenderTarget(null); rt.dispose();
      const c = document.createElement('canvas'); c.width = 900; c.height = 600; const g = c.getContext('2d'); const id = g.createImageData(900, 600); for (let y = 0; y < 600; y++) id.data.set(px.subarray((599 - y) * 3600, (600 - y) * 3600), y * 3600); g.putImageData(id, 0, 0); out.push(c.toDataURL('image/jpeg', .9)); }
    return out; }, O);
  const fs = require('fs'); data.forEach((d, i) => fs.writeFileSync(`${pre}${i}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
  console.log('képek', data.length); console.log(errs.slice(0, 10).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 400)); process.exit(1); });
