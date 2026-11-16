const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => ZephyrWorld._hb.walk(true)); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const Z = ZephyrWorld, s = document.querySelector('a-scene').object3D, out = []; s.updateMatrixWorld(true); const bb = new THREE.Box3();
    s.traverse((o) => { if (!o.isMesh) return; let vis = true, inRoot = false; for (let q = o; q; q = q.parent) { if (q.visible === false) vis = false; if (q === Z.root) inRoot = true; } if (!vis) return; bb.setFromObject(o); const sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
      if (c.length() < 6 && sz.x < 200 && sz.x > .5) out.push([inRoot ? 'R' : 'S', o.geometry.type, o.material.type, o.material.color && o.material.color.getHexString(), c.toArray().map(n => n.toFixed(2)).join(','), sz.toArray().map(n => n.toFixed(2)).join(','), (o.parent && (o.parent.name || o.parent.type)), o.el ? o.el.id || o.el.tagName : '']); });
    return out; });
  console.log(r.map(x => x.join(' | ')).join('\n'));
  await b.close();
})();
