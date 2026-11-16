// Szabad kamerás nézetek a kikötőről: node view.js <előtag> '<json: {views:[{pos:[x,y,z],look:[x,y,z],ortho:szél?,fov?}], eval?:"js", wait?:ms}>'
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const pre = process.argv[2] || '/tmp/v', O = JSON.parse(process.argv[3] || '{}');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 700 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/' + (O.q || ''), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(O.wait || 4000);
  if (O.eval) { const r = await p.evaluate((src) => { try { return (new Function('W', src))(ZephyrWorld); } catch (e) { return 'hiba: ' + e.message; } }, O.eval); console.log('eval', JSON.stringify(r).slice(0, 3000)); }
  let k = 0;
  for (const v of (O.views || [])) {
    const url = await p.evaluate((v) => { const THREE = AFRAME.THREE, sc = AFRAME.scenes[0], r = sc.renderer, s = sc.object3D, c = r.domElement; const w = c.width, h = c.height;
      const cam = v.ortho ? new THREE.OrthographicCamera(-v.ortho, v.ortho, v.ortho * h / w, -v.ortho * h / w, .1, 400) : new THREE.PerspectiveCamera(v.fov || 60, w / h, .05, 800);
      cam.position.set(...v.pos); cam.up.set(...(v.up || [0, 1, 0])); cam.lookAt(new THREE.Vector3(...v.look)); cam.updateMatrixWorld(true);
      const wasXR = r.xr.enabled; r.xr.enabled = false; r.render(s, cam); r.xr.enabled = wasXR; return c.toDataURL('image/jpeg', .82); }, v);
    fs.writeFileSync(`${pre}${k}.jpg`, Buffer.from(url.split(',')[1], 'base64')); k++;
  }
  console.log('hibák:\n' + errs.slice(0, 8).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 500)); process.exit(1); });
