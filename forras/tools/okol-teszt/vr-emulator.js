/* Valódi VR-útvonal (WebXR-emulátor, Quest 2, kézkövetés): a séta saját xrTick-je adja a kéz adatait, mi csak a kéz helyét mozgatjuk. */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 700 } });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const warns = []; p.on('console', m => { const t = m.text(); if (/world|xr |TypeError|ReferenceError/i.test(t) && warns.length < 8) warns.push(t.slice(0, 200)); });
  p.on('pageerror', e => warns.push('PAGEERR ' + e.message.slice(0, 200)));
  await p.addInitScript({ path: __dirname + '/node_modules/iwer/build/iwer.min.js' });
  await p.addInitScript(() => { try { localStorage.setItem('zephyr-kormany', 'kerek'); const d = new IWER.XRDevice(IWER.metaQuest2); d.installRuntime({ forceInstall: true }); d.primaryInputMode = 'hand'; window.xrd = d; } catch (e) { window.xrdErr = String(e); } });
  await p.goto('http://localhost:8765/virtualis-seta/', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.AFRAME && document.querySelector('a-scene') && document.querySelector('a-scene').hasLoaded, null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  const st0 = await p.evaluate(async () => { const sc = document.querySelector('a-scene'); let err = null; try { await sc.enterVR(); } catch (e) { err = String(e); } return { xrdErr: window.xrdErr || null, err, vr: sc.is('vr-mode'), hasXR: !!navigator.xr }; });
  console.log('enterVR', JSON.stringify(st0));
  await p.waitForTimeout(2500);
  await p.addScriptTag({ url: 'vilag.js' });
  await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld.open, null, { timeout: 30000 });
  await p.evaluate(() => { document.body.classList.remove('world-on'); ZephyrWorld.open('race'); });
  await p.waitForFunction(() => ZephyrWorld.vrr && ZephyrWorld.vrr.ck && ZephyrWorld.vrr.boat, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  const info = await p.evaluate(() => { const T = ZephyrTour, S = ZephyrWorld.vrr; return { inVR: T.inVR, tiller: !!S.tiller, srcKeys: Object.keys(T.xr.src), hasPalm: !!(T.xr.src.right && T.xr.src.right.palmC), st: S.st, wt: ZephyrWorld.t }; });
  console.log('info', JSON.stringify(info));
  /* forgatókönyv a VILÁG idejében: a kéz helyét minden képkocka előtt mi állítjuk (sima mozgás), az adat a séta valódi xrTick-jén megy át */
  await p.evaluate(() => { const W = ZephyrWorld, T = ZephyrTour, S = W.vrr, V = T.THREE.Vector3, rt = W.tick; window.__res = {}; window.__done = false;
    const fistOn = () => { T.xr.fakeJ = { right: () => { const c = T.xr.src.right.palmC, o = (x, y, z) => c.clone().add(new V(x, y, z)); return { it: o(0, .035, -.01), mt: o(.01, .035, -.01), rt: o(.02, .035, -.01), pt: o(.03, .035, -.01), tt: o(-.09, .02, 0), ip: o(-.02, .03, -.03), ii: o(-.02, .05, -.03), mp: o(0, .03, -.03) }; } }; };
    xrd.hands.right.position.set(.2, 1.1, -.35); xrd.hands.left.position.set(-.25, 1.0, -.3); T.xr.fakeJ = {};
    S.st = 'race'; S.v = 6; S.b = (S.wf + .75) % 6.2832; S.wa = 0;
    const t0 = W.t, X0 = .2, pc = () => +(S.wa / (.9 * Math.PI) * 100).toFixed(1), R = window.__res; let mxStill = 0, mxOpen = 0, tacked = false, heelMx = 0;
    const ramp = (t, a, b, x0, x1) => x0 + (x1 - x0) * Math.max(0, Math.min(1, (t - a) / (b - a)));
    W.tick = function (dt) { const t = W.t - t0; let x = X0;
      if (t < 1) { R.a_nyitott_kez_fog = !!(S.grabs && S.grabs.right); R.bal_kez_fog = !!(S.grabs && S.grabs.left); }
      if (t >= 1 && !T.xr.fakeJ.right && t < 11) fistOn();
      if (t >= 1.2 && t < 5) { mxStill = Math.max(mxStill, Math.abs(S.wa)); heelMx = Math.max(heelMx, Math.abs(S.heel || 0)); if (t > 3 && !tacked) { tacked = true; S.b = (S.wf - .75 + 6.2832) % 6.2832; } R.b_allo_okol_kerekMaxPct = +(mxStill / (.9 * Math.PI) * 100).toFixed(2); R.b_dolesMaxFok = +(heelMx * 57.3).toFixed(1); R.b_fogva = !!S.grabs.right; }
      x = ramp(t, 5, 5.6, X0, X0 + .06); if (t >= 6.4 && t < 6.6) R.c_jobbra_6cm_pct = pc();
      if (t >= 6.6) x = ramp(t, 6.6, 7.2, X0 + .06, X0); if (t >= 8 && t < 8.2) R.d_vissza_pct = pc();
      if (t >= 8.2) x = ramp(t, 8.2, 8.8, X0, X0 - .06); if (t >= 9.6 && t < 9.8) { R.e_balra_6cm_pct = pc(); R.e_irany = S.fm; }
      if (t >= 11) { T.xr.fakeJ = {}; x = ramp(t, 11, 11.6, X0 - .06, X0 + .14); if (t > 13 && t < 13.2) { R.f_nyitott_kez_20cm_utan_pct = pc(); R.f_elengedve = !S.grabs.right; } }
      xrd.hands.right.position.x = x;
      rt.call(W, dt); R.t = +t.toFixed(1); R.werr = T.xr.werr || 0; R.xerr = T.xr.err || 0; if (t > 13.4) window.__done = true; }; });
  for (let i = 0; i < 80; i++) { await p.waitForTimeout(4000); const d = await p.evaluate(() => [window.__done, window.__res.t]); if (d[0]) break; if (i % 5 === 4) console.log('  …világidő', d[1]); }
  console.log('eredmény', JSON.stringify(await p.evaluate(() => window.__res)));
  console.log('warns', JSON.stringify(warns));
  await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 700)); process.exit(1); });
