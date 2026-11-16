const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb, null, { timeout: 60000 }); await p.waitForTimeout(5000);
  const r = await p.evaluate(() => { const Z = ZephyrWorld, L = Z._loc, H = Z._hb.HB, out = {}; const V = THREE.Vector3;
    H.pos = { x: 0, z: -20 }; Z.tick(.016);   // a világ a helyére
    const rp = Z.root.position.clone(); out.rp = rp.toArray().map(n => n.toFixed(2));
    const S0 = { o: new V(.25, rp.y + 1.2, 0), d: new V(0, -.25, -1).normalize() };
    L.aim(S0, 'right'); out.aim1 = { ok: L.LOC.aim.ok, x: L.LOC.aim.x && L.LOC.aim.x.toFixed(2), z: L.LOC.aim.z && L.LOC.aim.z.toFixed(2) };
    L.aimGo(); out.after1 = H.pos;
    const S1 = { o: new V(.25, rp.y + 1.2, 0), d: new V(1, .1, 0).normalize() }; L.aim(S1, 'right'); out.aim2 = { ok: L.LOC.aim.ok }; L.aimGo(); out.after2 = H.pos;
    // fordulás 2D-ben
    const y0 = ZephyrTour.camYaw(); L.turn(Math.PI / 6); out.turn = [(ZephyrTour.camYaw() - y0).toFixed(3)];
    return out; });
  console.log(JSON.stringify(r)); console.log(errs.join('\n'));
  await b.close();
})();
