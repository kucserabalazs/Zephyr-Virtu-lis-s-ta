const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [name, vp] of [['pc', { width: 1366, height: 860 }], ['tel', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: name === 'tel', hasTouch: name === 'tel' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto('http://127.0.0.1:8096/virtualis-seta/#utca'); await p.waitForTimeout(5000);
    const clip = name === 'pc' ? { x: 0, y: 0, width: 260, height: 230 } : { x: 0, y: 0, width: 190, height: 170 };
    await p.screenshot({ path: `q-${name}-0.png`, clip });
    await p.focus('#cubeStage');
    for (let i = 1; i <= 3; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1000); await p.screenshot({ path: `q-${name}-${i}.png`, clip }); }
    // tap on front (Home) should navigate; instead tap on left face (Back) -> rotate
    const bb = await (await p.$('#cubeStage')).boundingBox();
    const lx = bb.x + bb.width * .08, cy = bb.y + bb.height * .55;
    if (name === 'tel') await p.touchscreen.tap(lx, cy); else await p.mouse.click(lx, cy);
    await p.waitForTimeout(1000); console.log(name, 'after left tap front=', await p.evaluate(() => document.querySelector('.cf-front').dataset.f));
    await p.screenshot({ path: `q-${name}-4.png`, clip });
    const rx = bb.x + bb.width * .7; const mapB = await p.evaluate(() => document.getElementById('map').hidden);
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(900);
    if (name === 'tel') await p.touchscreen.tap(rx, cy); else await p.mouse.click(rx, cy);
    await p.waitForTimeout(700); console.log(name, 'front', await p.evaluate(() => document.querySelector('.cf-front').dataset.f), 'map', mapB, '->', await p.evaluate(() => document.getElementById('map').hidden));
    await ctx.close();
  }
  console.log(errs); await b.close();
})();
