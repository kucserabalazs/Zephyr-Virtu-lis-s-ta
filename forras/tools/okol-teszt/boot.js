const { chromium } = require('playwright');
module.exports = async function boot(port, mode) {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 700 } });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 300)));
  await p.goto('http://localhost:' + port + '/virtualis-seta/', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.AFRAME && document.querySelector('a-scene') && document.querySelector('a-scene').hasLoaded, null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.addScriptTag({ url: 'vilag.js' });
  await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld.open, null, { timeout: 30000 });
  await p.evaluate((m) => { try { localStorage.setItem('zephyr-kormany', m || 'kerek'); } catch (e) {} ZephyrWorld.open('race'); }, mode);
  await p.waitForFunction(() => ZephyrWorld.vrr && ZephyrWorld.vrr.ck && ZephyrWorld.vrr.boat, null, { timeout: 90000 });
  await p.waitForTimeout(1500);
  return { b, p };
};
