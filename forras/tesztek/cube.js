const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }); const errs = [];
  for (const [name, vp] of [['pc', { width: 1366, height: 860 }], ['tel', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: name === 'tel', hasTouch: name === 'tel' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto('http://127.0.0.1:8096/virtualis-seta/#korvett-nappali', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(7000);
    await p.screenshot({ path: `c-0-${name}.png` });
    const st = await p.$('#cubeStage'); const bb = await st.boundingBox(); const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
    const rig0 = await p.evaluate(() => { const r = document.querySelector('#rig'); return r ? r.object3D.rotation.y : null; });
    // drag left (mouse)
    if (name === 'pc') { await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 1; i <= 10; i++) await p.mouse.move(cx - i * 8, cy + i * .5); await p.mouse.up(); }
    else { const cdp = await ctx.newCDPSession(p); const tp = (t, x, y) => cdp.send('Input.dispatchTouchEvent', { type: t, touchPoints: t === 'touchEnd' ? [] : [{ x, y }] }); await tp('touchStart', cx, cy); for (let i = 1; i <= 10; i++) await tp('touchMove', cx - i * 7, cy); await tp('touchEnd'); }
    await p.waitForTimeout(900);
    const f1 = await p.evaluate(() => document.querySelector('.cf-front').dataset.f);
    const rig1 = await p.evaluate(() => { const r = document.querySelector('#rig'); return r ? r.object3D.rotation.y : null; });
    await p.screenshot({ path: `c-1-${name}.png` });
    const mapBefore = await p.evaluate(() => document.getElementById('map').hidden);
    if (name === 'pc') await p.mouse.click(cx, cy); else await p.touchscreen.tap(cx, cy);
    await p.waitForTimeout(600);
    const mapAfter = await p.evaluate(() => document.getElementById('map').hidden);
    await p.screenshot({ path: `c-2-${name}.png` });
    if (name === 'tel' && !mapAfter) { await p.click('#mapX'); await p.waitForTimeout(300); }
    // mid-rotation screenshot
    await p.evaluate(() => { const c = document.getElementById('cube'); c.classList.add('instant'); c.style.transform = 'translateZ(calc(var(--S) / -2)) rotateX(-18deg) rotateY(-35deg)'; });
    await p.waitForTimeout(200); await p.screenshot({ path: `c-3-${name}.png`, clip: { x: 0, y: 0, width: 320, height: 260 } });
    console.log(name, 'front after drag', f1, 'rig', rig0, rig1, 'map', mapBefore, '->', mapAfter);
    await ctx.close();
  }
  console.log('errors', errs); await b.close();
})();
