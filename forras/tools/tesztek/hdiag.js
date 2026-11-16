// Mi rajzolódik a kikötőben? Csoportonként hálók és háromszögek (csak a ténylegesen látható ágak, 31-es réteg nélkül)
const { chromium } = require('playwright');
(async () => {
  const O = JSON.parse(process.argv[2] || '{}');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 640, height: 400 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.rooms, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  await p.evaluate((O) => { const H = ZephyrWorld._hb; if (!H.HB.walk) H.walk(true); if (O.pos) H.HB.pos = O.pos; }, O); await p.waitForTimeout(O.settle || 9000);
  const r = await p.evaluate(() => {
    const W = ZephyrWorld, H = W._hb, out = {}, tri = (g) => g ? (g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3 : 0;
    const walk = (o, key, vis) => { const v = vis && o.visible; if (!v) return; if ((o.isMesh || o.isPoints || o.isSprite || o.isLine) && o.layers.mask === 1) { const k = key; out[k] = out[k] || [0, 0]; out[k][0]++; out[k][1] += tri(o.geometry) * (o.isInstancedMesh ? o.count : 1); }
      o.children.forEach((c) => walk(c, key, v)); };
    /* a kikötő csoportjai: env közvetlen gyermekei; a házaknál házanként */
    const env = H.HB.env || W.root; W.root.children.forEach((c) => { if (c === env) return; walk(c, 'root:' + (c.name || c.type), true); });
    env.children.forEach((c) => { if (c.name === 'hazak') { c.children.forEach((h) => { h.children.forEach((q) => walk(q, 'ház:' + h.name + (q.name && q.name.startsWith('belso') ? '/BELSŐ' : ''), true)); }); return; } walk(c, 'env:' + (c.name || c.type) + '#' + env.children.indexOf(c), true); });
    const arr = Object.entries(out).sort((a, b) => b[1][0] - a[1][0]);
    const inn = (H.houses || []).map((h) => [h.id, h.innerN, h.innerG && h.innerG.visible]);
    return { top: arr.slice(0, 26).map(([k, v]) => `${String(v[0]).padStart(5)} háló ${String(Math.round(v[1])).padStart(8)} hsz  ${k}`), sum: arr.reduce((a, q) => [a[0] + q[1][0], a[1] + q[1][1]], [0, 0]), inn, ms: W._ms && W._ms.stat };
  });
  console.log(r.top.join('\n')); console.log('össz', JSON.stringify(r.sum), 'belső', JSON.stringify(r.inn), 'kisütés', JSON.stringify(r.ms));
  await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 400)); process.exit(1); });
