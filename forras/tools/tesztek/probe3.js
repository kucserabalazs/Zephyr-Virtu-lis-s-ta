const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 640 } });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => ZephyrWorld._hb.walk(true)); await p.waitForTimeout(4000);
  const r = await p.evaluate(() => { const sc = document.querySelector('a-scene'); const f = [...sc.querySelectorAll('[geometry]')].find(e => (e.getAttribute('geometry')||{}).radius === 1.2);
    const m = f && f.getObject3D('mesh'); return { op: m && m.material.opacity, vis: f && f.object3D.visible, camPos: sc.camera.getWorldPosition(new THREE.Vector3()).toArray(), canvas: [sc.canvas.width, sc.canvas.height] }; });
  console.log(JSON.stringify(r));
  await p.screenshot({ path: 'w2.png' });
  await b.close();
})();
