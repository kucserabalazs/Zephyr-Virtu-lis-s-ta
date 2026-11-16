// node lessonshots.js <szobaId> <előtag>  – a szoba összes leckeábráját képbe rendezi (a fotók letöltődése után)
const { chromium } = require('playwright');
(async () => {
  const room = process.argv[2] || 'izek', pre = process.argv[3] || '/tmp/ls';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 220)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.rooms && Object.keys(ZephyrWorld._hb.rooms).length, null, { timeout: 90000 });
  const mk = (T) => p.evaluate(([room, T]) => { const R = ZephyrWorld._hb.rooms[room]; return R.lessons.map((q) => { const c = document.createElement('canvas'); c.width = 600; c.height = 380; const g = c.getContext('2d'); g.scale(2, 2); try { q.d(g, T); } catch (e) { return 'HIBA ' + e.message; } return c.toDataURL('image/jpeg', .85); }); }, [room, T]);
  await mk(3); await p.waitForTimeout(9000);           // az első rajzolás elindítja a letöltést
  const data = await mk(12);
  const fs = require('fs'); let n = 0; data.forEach((d, i) => { if (d.startsWith('HIBA')) console.log(i, d); else { fs.writeFileSync(`${pre}${i}.jpg`, Buffer.from(d.split(',')[1], 'base64')); n++; } });
  const t = await p.evaluate((room) => ZephyrWorld._hb.rooms[room].lessons.map((q, i) => i + ': ' + q.t + (q.ph ? ' [' + q.ph.join(',') + ']' : '')), room); console.log(t.join('\n'));
  console.log('képek:', n, 'oldalhibák:', errs.join(' ; ') || 'nincs'); await b.close();
})();
