// Bemérés-teszt (2D-ben, szimulált fejjel: W._calSim)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 700 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300)));
  p.on('console', m => { const t = m.text(); if ((m.type() === 'error' && !/404|Failed to load/.test(t)) || /TESZT|bemérés/.test(t)) errs.push(m.type()[0] + ':' + t.slice(0, 300)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.click('[data-g="race"]');
  await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._race, null, { timeout: 90000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const W = ZephyrWorld, S = W._race; S.mixFleet = false; S.todMix = false; S.lvl = 1; W._calSim = { x: .4, y: 1.7, z: -.3, yaw: .5 }; W._raceGo = true; W.open('race'); });
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C; }, null, { timeout: 90000 });
  const run = async (sec, src) => p.evaluate(([sec, src]) => { const W = ZephyrWorld, f = src ? new Function('W', 'k', src) : null; const n = Math.round(sec * 60); for (let k = 0; k < n; k++) { if (f) f(W, k); W.tick(1 / 60); } return n; }, [sec, src || '']);
  const st = async (lbl) => { const r = await p.evaluate(() => { const W = ZephyrWorld, S = W._race, R = S.calR; return { ph: R ? R.ph : null, why: R ? R.why : null, st: R ? +R.st.toFixed(2) : null, vt: R ? +R.vt.toFixed(2) : null, info: R ? R.info : null, t: +S.t.toFixed(2), cal: S.cal ? { yaw: +S.cal.yaw.toFixed(3), x: +S.cal.x.toFixed(3), z: +S.cal.z.toFixed(3) } : null, seated: S.seated, drop: S.calDrop, lift: S.calLift, board: !!S.calB, dom: !!document.querySelector('.zx-board') && getComputedStyle(document.querySelector('.zx-board')).display, msg: S.msgT > 0 ? S.msg : '' }; }); console.log(lbl, JSON.stringify(r)); return r; };
  await st('indulás');
  await run(.8); await st('0,8 mp');
  await p.screenshot({ path: '/tmp/cal-1.png' });
  await run(.5); const a = await st('1,3 mp (bemérve?)');
  await p.screenshot({ path: '/tmp/cal-2.png' });
  await run(1.6); await st('2,9 mp (rendben?)');
  await p.screenshot({ path: '/tmp/cal-3.png' });
  await run(1.2); await st('4,1 mp (vége?)');
  await run(1.0); await st('5,1 mp (az idő fut?)');
  // mozgó fej: nem mér be
  await p.evaluate(() => { ZephyrWorld._calApi.start('button'); });
  await run(2.2, 'W._calSim.x += .006;'); await st('mozgó fej 2,2 mp (36 cm/mp – still marad?)');
  await run(1.6); await st('megállt 1,6 mp (bemérve?)');
  // ellenőrzés közben ellép: újra bemér
  await run(.3, 'if (k < 9) W._calSim.x += .035;'); await st('ellépett 31 cm-t (vissza still?)');
  await p.screenshot({ path: '/tmp/cal-4.png' });
  await run(4.5); await st('újra bemérve + rendben?');
  await p.evaluate(() => { ZephyrWorld._calApi.start('button'); }); await run(1.4); await st('forgás-teszt: bemérve');
  await run(.3, 'if (k < 9) W._calSim.yaw += .06;'); await st('elfordult 31°-ot (vissza still, info?)');
  await run(4.2); await st('forgás után újra rendben?');
  // ülve
  await p.evaluate(() => { const W = ZephyrWorld; W._calSim = { x: -.2, y: 1.15, z: .5, yaw: -1.2 }; W._calApi.start('start'); });
  await run(1.5); const s2 = await st('ülve bemérve?');
  await p.screenshot({ path: '/tmp/cal-5.png' });
  await run(3); await st('ülve vége');
  // tenyérmenü: kézi ülő/álló -> újra bemér, a megadott helyzettel
  await p.evaluate(() => { const W = ZephyrWorld; W._calSim.y = 1.45; const it = W.spec.wrist().find((q) => q[0] === '🪑'); it[2](); });
  await run(1.5); await st('kézi ülő a tenyérmenüből (1,45 m szem)');
  console.log('hibák:\n' + errs.slice(0, 14).join('\n'));
  await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 500)); process.exit(1); });
