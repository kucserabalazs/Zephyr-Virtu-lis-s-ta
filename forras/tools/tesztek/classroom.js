const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 720 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = [], reqs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 220))); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('c:' + m.text().slice(0, 200)); if (m.type() === 'warning') errs.push('w:' + m.text().slice(0, 160)); });
  p.on('request', (q) => { const u = q.url(); if (/hang\/lecke/.test(u)) reqs.push(u.replace(/^.*hang\/lecke\//, '')); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);

  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.rooms && ZephyrWorld._hb.rooms.vih, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  const ids = (process.argv[2] || 'vih,cso,isk,ter').split(','), shots = [];
  for (const id of ids) {
    const info = await p.evaluate(async (id) => { const H = ZephyrWorld._hb, R = H.rooms[id]; H.sit(R); await new Promise((r) => setTimeout(r, 2500)); const L = R.lessons; const o = { id, n: L.length, titles: L.map((q) => q.t), playing: R.playing, i: R.i };
      return o; }, id);
    for (const k of (process.env.LES ? JSON.parse(process.env.LES)[id] || [] : [0])) {
      const img = await p.evaluate(async ([id, k]) => { const H = ZephyrWorld._hb, R = H.rooms[id]; R.mode = 'one'; R.playing = true; R.i = k; R.t = 2.5; ZephyrWorld.tick && ZephyrWorld.tick(.05); await new Promise((r) => setTimeout(r, 1800)); const cv = R.board.material.map.image; return cv && cv.toDataURL ? cv.toDataURL('image/jpeg', .8) : null; }, [id, k]);
      if (img) shots.push(img); }
    console.log(JSON.stringify(info));
    await p.evaluate(() => { try { ZephyrWorld._hb.stand(); } catch (e) {} });
  }
  const fs = require('fs'); shots.forEach((d, i) => fs.writeFileSync(`/home/claude/scratch/in/cls${i}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
  console.log('hang-kérések:', reqs.join(' | ')); console.log('HIBÁK:', errs.slice(0, 12).join('\n'));
  await b.close();
})();
