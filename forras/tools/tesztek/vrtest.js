// VR-belépés vizsgálata hamis WebXR-rel: node vrtest.js [url]
const { chromium } = require('playwright');
(async () => {
  const url = process.argv[2] || 'http://localhost:8097/weboldal/vr-zephyr-games/';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  await p.addInitScript(() => {
    window.__xr = { req: [], sup: [] };
    const fake = {
      isSessionSupported: (m) => { window.__xr.sup.push(m); return Promise.resolve(m === 'immersive-vr'); },
      offerSession: (m, o) => { window.__xr.offer = (window.__xr.offer || 0) + 1; return new Promise(() => {}); },
      requestSession: (m, o) => { window.__xr.req.push({ m, o: JSON.stringify(o), act: navigator.userActivation ? navigator.userActivation.isActive : null, t: performance.now() }); return Promise.reject(new Error('teszt: nincs szemüveg')); },
      addEventListener() {}, removeEventListener() {}
    };
    Object.defineProperty(navigator, 'xr', { value: fake, configurable: true });
  });
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 200)));
  p.on('console', m => { const t = m.text(); if (m.type() === 'error' || /xr|VR|enterVR/i.test(t)) errs.push(m.type()[0] + ':' + t.slice(0, 200)); });
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  for (const w of [800, 2500, 6000]) { await p.waitForTimeout(w); const st = await p.evaluate(() => ({ btn: !!document.getElementById('btnVR'), btnVis: (() => { const e = document.getElementById('btnVR'); if (!e) return null; const cs = getComputedStyle(e); return cs.visibility + '/' + cs.display; })(), scene: !!document.querySelector('a-scene'), loaded: !!(document.querySelector('a-scene') || {}).hasLoaded, sup: window.__xr.sup, req: window.__xr.req.length, offer: window.__xr.offer || 0, hubVR: (() => { const e = document.querySelector('#gameHub .gh-vr'); return e ? (e.hidden ? 'rejtett' : 'látható') : 'nincs'; })() })); console.log('állapot', w, JSON.stringify(st)); }
  await p.click('[data-g="race"]');
  await p.waitForTimeout(1500);
  console.log('kérés', JSON.stringify(await p.evaluate(() => window.__xr.req)));
  await p.waitForTimeout(6000); console.log('világ VR-gomb', await p.evaluate(() => { const e = document.querySelector('#worldHud .wh-vr'); return e ? (e.hidden ? 'rejtett' : 'látható ' + JSON.stringify(e.getBoundingClientRect())) : 'nincs'; }));
  console.log(errs.slice(0, 12).join('\n'));
  await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 400)); process.exit(1); });
