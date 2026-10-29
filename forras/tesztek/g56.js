const { chromium } = require('playwright'); const fs = require('fs');
const AF = fs.readFileSync('afr/dist/aframe-master.min.js');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const errs = [];
  for (const [name, vp] of [['pc', { width: 1366, height: 860 }], ['tel', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: name === 'tel', hasTouch: name === 'tel' });
    await ctx.route(/aframe.*\.js$/, (r) => r.fulfill({ body: AF, contentType: 'application/javascript' }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto('http://127.0.0.1:8096/virtualis-seta/#utca'); await p.waitForTimeout(10000);
    await p.evaluate(() => { try { localStorage.setItem('zephyr-kocka', '1'); } catch (e) {} });
    const clip = name === 'pc' ? { x: 0, y: 0, width: 330, height: 280 } : { x: 0, y: 0, width: 230, height: 200 };
    const bb = await (await p.$('#cubeStage')).boundingBox(); const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
    // drag down -> top (settings)
    if (name === 'pc') { await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 1; i <= 10; i++) await p.mouse.move(cx, cy + i * 9); await p.mouse.up(); }
    else { const cdp = await ctx.newCDPSession(p); const tp = (t, x, y) => cdp.send('Input.dispatchTouchEvent', { type: t, touchPoints: t === 'touchEnd' ? [] : [{ x, y }] }); await tp('touchStart', cx, cy); for (let i = 1; i <= 10; i++) await tp('touchMove', cx, cy + i * 7); await tp('touchEnd'); }
    await p.waitForTimeout(1800); console.log(name, 'front', await p.evaluate(() => document.querySelector('.cf-front').dataset.f)); await p.screenshot({ path: `t-${name}-0.png`, clip });
    if (name === 'pc') await p.mouse.click(cx, cy); else await p.touchscreen.tap(cx, cy);
    await p.waitForTimeout(700); console.log(name, 'tools open', await p.evaluate(() => document.getElementById('tools').className), 'devmenu', await p.evaluate(() => document.getElementById('devMenu').hidden));
    await p.keyboard.press('Escape'); await p.mouse.click(700, 500).catch(() => {}); await p.waitForTimeout(300);
    await p.focus('#cubeStage'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(1500); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(1800);
    console.log(name, 'front', await p.evaluate(() => document.querySelector('.cf-front').dataset.f)); await p.screenshot({ path: `t-${name}-1.png`, clip });
    await p.keyboard.press('Enter'); await p.waitForTimeout(700); console.log(name, 'picker', !!(await p.$('#invPick')));
    await p.screenshot({ path: `t-${name}-2.png` });
    const btn = await p.$('[data-inv="dingi"]'); if (btn) { await btn.click(); await p.waitForTimeout(1200); console.log(name, 'binder', !!(await p.$('.bk-wrap'))); }
    await ctx.close();
  }
  console.log(errs.slice(0, 6)); await b.close();
})();
