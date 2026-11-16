// SZÜNET gomb + folytatás-választás + bemérés-átvitel (szimulált fejjel, kerékmódban)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 700 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300)));
  p.on('console', m => { const t = m.text(); if ((m.type() === 'error' && !/404|Failed to load/.test(t)) || /TESZT|bemérés|gomb/.test(t)) errs.push(m.type()[0] + ':' + t.slice(0, 300)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.evaluate(() => { try { localStorage.setItem('zephyr-kormany', 'kerek'); } catch (e) {} });
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const W = ZephyrWorld, S = W._race; S.mixFleet = false; S.todMix = false; S.lvl = 1; W._calSim = { x: .4, y: 1.7, z: -.3, yaw: .5 }; W._raceGo = true; W.open('race'); });
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C; }, null, { timeout: 90000 });
  const run = async (sec, src) => p.evaluate(([sec, src]) => { const W = ZephyrWorld, f = src ? new Function('W', 'k', src) : null; const n = Math.round(sec * 60); for (let k = 0; k < n; k++) { if (f) f(W, k); W.tick(1 / 60); } return n; }, [sec, src || '']);
  const st = async (lbl) => { const r = await p.evaluate(() => { const W = ZephyrWorld, S = W._race, R = S.calR, A = W._calApi; return { ph: R ? R.ph : null, why: R ? R.why : null, paused: !!S.paused, board: !!S.pauseB, calOnce: A.S.done, cal: S.cal ? [+S.cal.x.toFixed(2), +S.cal.z.toFixed(2)] : null, t: +S.t.toFixed(1), tiller: S.tiller, msg: (S.msg || '').slice(0, 50) }; }); console.log(lbl, JSON.stringify(r)); return r; };
  await run(4.2); await st('1. első bemérés kész'); await p.screenshot({ path: '/tmp/pause-0.png' });
  // gombok a műszeren
  const nb = await p.evaluate(() => { const W = ZephyrWorld; return (W.objs || []).filter(o => o.userData && o.userData.xr && o.geometry && o.geometry.type === 'BoxGeometry' && o.material && o.material.length === 6).length; });
  console.log('2. a műszer gombjainak száma:', nb);
  // a SZÜNET gomb megnyomása
  await p.evaluate(() => { const W = ZephyrWorld; const bt = (W.objs || []).filter(o => o.userData && o.userData.xr && o.geometry && o.geometry.type === 'BoxGeometry' && o.material && o.material.length === 6)[0]; bt.userData.xr.click(); });
  await run(.5); await st('3. SZÜNET gomb után (szünet + tábla)');
  await p.screenshot({ path: '/tmp/pause-1.png' });
  // a gomb szünetben: a táblát újra elhozza, nem folytat
  await p.evaluate(() => { ZephyrWorld.vrPauseToggle(); }); await run(.3); await st('4. gomb szünetben (tábla újra, még szünet)');
  // mozdulunk, majd bemérés + folytatás
  await p.evaluate(() => { ZephyrWorld._calSim.x = 1.1; ZephyrWorld._calSim.yaw = -.7; ZephyrWorld.vrResumeCal(); }); await run(.4); await st('5. Bemérés, majd folytatás (szünet marad, bemérés fut)');
  await p.screenshot({ path: '/tmp/pause-2.png' });
  await run(4.2); await st('6. a bemérés után folytatódik');
  // rögtön folytatás
  await p.evaluate(() => { ZephyrWorld.vrPause(true); }); await run(.3); await st('7. újra szünet');
  await p.evaluate(() => { ZephyrWorld.vrPause(false); }); await run(.5); await st('8. rögtön folytatás (bemérés nélkül)');
  // következő futam (tenyérmenü: Futam újra): nincs új bemérés, a régi érvényes
  await p.evaluate(() => { const W = ZephyrWorld; W._calSim.x = 2.2; W._calSim.z = 1.1; const it = W.spec.wrist().find((q) => q[1] === 'Futam újra'); it[2](); });
  await p.waitForTimeout(1500); await run(1.0); await st('9. új futam (nincs bemérés, az előző érvényes?)');
  await p.screenshot({ path: '/tmp/pause-3.png' });
  console.log('hibák:\n' + errs.slice(0, 14).join('\n'));
  await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 500)); process.exit(1); });
