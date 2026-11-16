const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [nm, vp] of [['pc', { width: 1280, height: 800 }], ['tel', { width: 390, height: 820 }]]) {
    const p = await b.newPage({ viewport: vp, locale: 'hu-HU' });
    await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
    await p.addInitScript(() => { Object.defineProperty(navigator, 'xr', { value: { isSessionSupported: (m) => Promise.resolve(m === 'immersive-vr'), requestSession: () => Promise.reject(new Error('x')), offerSession: () => new Promise(() => {}), addEventListener() {}, removeEventListener() {} }, configurable: true }); });
    await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000);
    await p.screenshot({ path: `/tmp/hub_${nm}.png` }); await p.close();
  }
  await b.close();
})();
