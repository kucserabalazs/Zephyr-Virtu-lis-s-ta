// A tantermek leckéinek kiírása a hanggeneráláshoz (forras/tools/hangok.py).
// Használat (a tároló gyökeréből):  python3 -m http.server 8097 &   majd   node forras/tools/leckek_dump.js
// Kimenet: forras/tools/leckek.json – házanként a hang (imre/anna/berta), a köszöntés és a leckék (cím + szöveg), pontosan úgy, ahogy a játék mondja.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'hu-HU' });
  /* ha a munkakörnyezet nem éri el a CDN-t: AFRAME_LOCAL=/út/aframe-master.min.js */
  if (process.env.AFRAME_LOCAL) await p.route(/aframe.*\.js/, (r) => r.fulfill({ path: process.env.AFRAME_LOCAL, contentType: 'application/javascript' }));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.rooms && Object.keys(ZephyrWorld._hb.rooms).length, null, { timeout: 90000 });
  const r = await p.evaluate(() => { const H = ZephyrWorld._hb, o = {}; for (const id in H.rooms) { const R = H.rooms[id]; o[id] = { voice: R.h.voice, greet: H.greet[id] || null, lessons: R.lessons.map((q) => ({ t: q.t, say: q.say, hash: H.vhash(q.t + '. ' + q.say) })), greetHash: H.greet[id] ? H.vhash(H.greet[id]) : null }; } return o; });
  require('fs').writeFileSync('/home/claude/zephyr-virtu-lis-s-ta/forras/tools/leckek.json', JSON.stringify(r, null, 1)); console.log('leckek.json:', Object.keys(r).map((k) => k + ':' + r[k].lessons.length).join(' '));
  await b.close();
})();
