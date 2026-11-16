const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: '/home/claude/scratch/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  await p.addInitScript(() => { Object.defineProperty(navigator, 'xr', { value: { isSessionSupported: (m) => Promise.resolve(m === 'immersive-vr'), requestSession: () => Promise.reject(new Error('x')), offerSession: () => new Promise(() => {}), addEventListener() {}, removeEventListener() {} }, configurable: true }); });
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 200)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld.active && ZephyrWorld._hb, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  const r = await p.evaluate(async () => { const sc = document.querySelector('a-scene'); window.__exit = 0; sc.exitVR = () => { window.__exit++; return Promise.resolve(); };
    sc.addState('vr-mode'); sc.emit('enter-vr'); await new Promise((r) => setTimeout(r, 4000));
    return { exitCalls: window.__exit, active: ZephyrWorld.active, kind: ZephyrWorld.kind, hubHidden: document.getElementById('gameHub').classList.contains('gh-hide') }; });
  console.log('VR-be lépés után:', JSON.stringify(r));
  const r2 = await p.evaluate(async () => { ZephyrWorld.close(); await new Promise((r) => setTimeout(r, 500)); return { exitCalls: window.__exit, hubShown: !document.getElementById('gameHub').classList.contains('gh-hide') }; });
  console.log('Játékok főmenü után:', JSON.stringify(r2)); console.log(errs.slice(0, 5).join('\n')); await b.close();
})();
