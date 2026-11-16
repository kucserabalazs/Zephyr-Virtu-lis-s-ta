// Elsősegély: járás-teszt – az ajtón át be lehet menni, a falon nem; a pallózat új széle
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 800, height: 520 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300))); p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load/.test(t)) errs.push('c:' + t.slice(0, 200)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.rooms, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const H = ZephyrWorld._hb; if (!H.HB.walk) H.walk(true); }); await p.waitForTimeout(2500);
  const res = await p.evaluate(() => {
    const W = ZephyrWorld, H = W._hb, L = W._loc, HB = H.HB, out = {};
    const go = (x, z, dx, dz, n) => { HB.pos = { x, z }; let moved = 0; for (let i = 0; i < n; i++) { if (L.move(dx, dz)) moved++; } return { to: [+HB.pos.x.toFixed(2), +HB.pos.z.toFixed(2)], moved }; };
    const els = H.houses.find((h) => h.id === 'els'), B = els.box;
    out.box = [B.x0, B.x1, B.z0, B.z1]; out.dr = els.dr; out.out = els.out; out.F = els.F;
    out.ajtoN = go(14.5, 4.6, 0, -.05, 70);      // az ajtón át északra: be kell jutnia a házba (z < 3.5)
    out.ablakN = go(16.5, 4.6, 0, -.05, 40);     // az ablak előtt: meg kell állnia a falnál
    out.nyugatE = go(11.0, 1.2, .05, 0, 50);     // a résből a nyugati falnak: nincs ajtó, meg kell állnia
    out.nyugatAjtoRegi = go(10.6, 2.3, .05, 0, 50);   // a régi ajtó helyén: ugyanúgy fal
    out.keletiSzel = { f193: L.floor(19.3, 1.2), f198: L.floor(19.8, 1.2), f176: L.floor(17.6, 1.2), f12: L.floor(11.2, 1.2) };
    out.suli = go(2.4, 1.2, .05, 0, 40);         // az iskola nyugati ajtaja továbbra is jár
    // a ház belseje: ül a székbe (seat), a tábla a keleti falon
    out.seat = els.seat; out.board = els.board; out.tpos = els.tpos; out.studs = els.studs;
    return out; });
  console.log(JSON.stringify({box:res.box,dr:res.dr,out:res.out,F:res.F,ajtoN:res.ajtoN})); console.log('hibák:', errs.slice(0, 6).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 400)); process.exit(1); });
