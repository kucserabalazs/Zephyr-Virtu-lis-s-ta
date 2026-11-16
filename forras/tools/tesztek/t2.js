const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb, null, { timeout: 60000 }); await p.waitForTimeout(5000);
  const r = await p.evaluate(() => { const Z = ZephyrWorld, L = Z._loc, H = Z._hb.HB, out = {};
    // végigsétálunk a mólón a rajtig (−z irány)
    let n = 0; while (n < 2000 && L.move(0, -.05)) n++; out.pier = [H.pos.x.toFixed(2), H.pos.z.toFixed(2), n];
    // a pavilonba be
    H.pos = { x: 0, z: -45.5 }; n = 0; while (n < 400 && L.move(0, -.05)) n++; out.pult = [H.pos.x.toFixed(2), H.pos.z.toFixed(2)];
    H.pos = { x: 2, z: -45.5 }; n = 0; while (n < 400 && L.move(0, -.05)) n++; out.pav = [H.pos.x.toFixed(2), H.pos.z.toFixed(2)];
    // a szélén nem lehet a vízbe lépni
    H.pos = { x: 0, z: -20 }; n = 0; while (n < 400 && L.move(.05, 0)) n++; out.edge = [H.pos.x.toFixed(2), H.pos.z.toFixed(2)];
    // házba: falon át nem
    const h = Z._hb.houses.find(q => q.id === 'cso'), B = h.box; H.pos = { x: (B.x0 + B.x1) / 2 + 1.5, z: B.z0 - 2 }; n = 0; while (n < 400 && L.move(0, .05)) n++; out.wall = [H.pos.x.toFixed(2), H.pos.z.toFixed(2), B.z0, JSON.stringify(h.dr)];
    H.pos = { x: h.dr.c, z: B.z0 - 2 }; n = 0; while (n < 400 && L.move(0, .05)) n++; out.door = [H.pos.x.toFixed(2), H.pos.z.toFixed(2), B.z1];
    return out; });
  console.log(JSON.stringify(r, null, 1)); console.log(errs.join('\n'));
  await b.close();
})();
