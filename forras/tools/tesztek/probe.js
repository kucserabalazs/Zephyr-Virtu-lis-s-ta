const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => ZephyrWorld._hb.walk(true)); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const Z = ZephyrWorld, out = []; Z.root.updateMatrixWorld(true); const v = new THREE.Vector3(), bb = new THREE.Box3();
    Z.root.traverse((o) => { if (!o.isMesh || !o.visible) return; let vis = true; for (let q = o; q; q = q.parent) if (q.visible === false) vis = false; if (!vis) return; bb.setFromObject(o); const s = bb.getSize(new THREE.Vector3()); const c = bb.getCenter(new THREE.Vector3()).sub(Z.root.position);
      const col = o.material && o.material.color ? o.material.color.getHexString() : '';
      if (c.x > -4 && c.x < 5 && c.z > -4 && c.z < 3 && s.y > 1 && s.x > 1) out.push([o.geometry.type, col, c.toArray().map(n => n.toFixed(1)).join(','), s.toArray().map(n => n.toFixed(1)).join(','), o.parent && o.parent.name, o.name]); });
    return out; });
  console.log(r.slice(0, 30).map(x => x.join(' | ')).join('\n'));
  await b.close();
})();
