const { chromium } = require('playwright'); const fs = require('fs');
const AF = fs.readFileSync('afr/dist/aframe-master.min.js');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const errs = [];
  for (const [name, vp] of [['pc', { width: 1366, height: 860 }], ['tel', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: name === 'tel', hasTouch: name === 'tel' });
    await ctx.route(/aframe.*\.js$/, (r) => r.fulfill({ body: AF, contentType: 'application/javascript' }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(name + ' c: ' + m.text().slice(0, 160)); });
    await p.goto('http://127.0.0.1:8096/virtualis-seta/#utca'); await p.waitForTimeout(12000);
    console.log(name, '3d:', await p.evaluate(() => document.getElementById('cubeStage').classList.contains('is3d')));
    const clip = name === 'pc' ? { x: 0, y: 0, width: 330, height: 280 } : { x: 0, y: 0, width: 230, height: 200 };
    await p.screenshot({ path: `d-${name}-0.png`, clip });
    await p.focus('#cubeStage');
    for (let i = 1; i <= 3; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1800); await p.screenshot({ path: `d-${name}-${i}.png`, clip }); }
    const bb = await (await p.$('#cubeStage')).boundingBox(); const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
    await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 1; i <= 6; i++) await p.mouse.move(cx + i * 7, cy); await p.waitForTimeout(400); await p.screenshot({ path: `d-${name}-4.png`, clip }); await p.mouse.up();
    await ctx.close();
  }
  console.log(errs.slice(0, 8)); await b.close();
})();
