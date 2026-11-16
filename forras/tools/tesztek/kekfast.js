const { chromium } = require('playwright');
(async () => {
  const O = JSON.parse(process.argv[2] || '{}');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 560 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300))); p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load/.test(t)) errs.push(m.type()[0] + ':' + t.slice(0, 300)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(1500);
  await p.evaluate((O) => { const W = ZephyrWorld, S = W._race; S.mixFleet = false; S.todMix = false; S.nightForce = null; W._kekApi.begin(O.lvl || 201); W._kek.seed = O.seed || 4242; W._kek.si = O.si || 0; W._hb.HB.sel = O.cls || 'zephyr'; S.lvl = O.lvl || 201; W._raceGo = true; W.open('race'); }, O);
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C && S.C.kek && S.water; }, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  /* gyors előretekerés: robotpilóta (VMG-optimális irány a következő jel / kapu felé), képkockák rajzolás nélkül */
  await p.evaluate(() => { const W = ZephyrWorld; W._raf0 = W.active; });
  const res = []; let guard = 0;
  while (guard++ < (O.maxIt || 3000)) {
    const r = await p.evaluate((O) => { const W = ZephyrWorld, S = W._race, K = W._kek, A = W._kekApi, D = Math.PI / 180;
      const out = { st: S.st, si: K.si, t: S.t };
      if (S.st === 'kek') { out.stage = { si: K.board.si, tp: K.board.tp, T: K.T, rank: A.rank().findIndex((q) => q.me) + 1, riv: S.riv.map((r) => Math.round(r.kekT || -1)), gnd: S._gndN || 0 }; if (K.board.last) { out.end = 1; return out; } A.next(); return out; }
      if (S.st === 'done') { out.end = 1; return out; }
      const tq = performance.now(); for (let n = 0; n < (O.chunk || 1200); n++) {
        if (S.st !== 'race' && S.st !== 'pre') break;
        if (S.st === 'pre' && S.t < -7) { const u = S.C.u; S.x = -u[0] * 75; S.z = -u[1] * 75; S.b = Math.atan2(u[0], -u[1]); S.v = 5.5; S.yr = 0; S.del = 0; }
        if (S.st === 'race') { const ms = S.marks, m = ms[Math.min(S.next || 0, ms.length - 1)]; let tx = m.x, tz = m.z; const u = S.C.u;
          if (S.ocs === 1) { tx = -u[0] * 40; tz = -u[1] * 40; } else if (S.ocs === 2) { tx = u[0] * 40; tz = u[1] * 40; } else
          if (m.gate) { const G = m.gate, L = (O.lane || 0) * G.w * .5; tx = m.x + (G.b.x - G.a.x) / G.w * L + G.dir[0] * 30; tz = m.z + (G.b.z - G.a.z) / G.w * L + G.dir[1] * 30; }
          else { const pv = (S.next || 0) > 0 ? ms[S.next - 1] : { x: 0, z: 0 }, nx2 = ms[(S.next || 0) + 1] || { x: 0, z: 0 }; let ix = m.x - pv.x, iz = m.z - pv.z, il = Math.hypot(ix, iz) || 1, ox = nx2.x - m.x, oz = nx2.z - m.z, ol = Math.hypot(ox, oz) || 1; ix /= il; iz /= il; ox /= ol; oz /= ol;
            let Ox = ix - ox, Oz = iz - oz, Ol = Math.hypot(Ox, Oz) || 1; Ox /= Ol; Oz /= Ol; tx = m.x + Ox * 25; tz = m.z + Oz * 25; if (Math.hypot(tx - S.x, tz - S.z) < 14) { S.next++; S._rn = (S._rn || 0) + 1; } }
          const brg = Math.atan2(tx - S.x, -(tz - S.z)); let best = S.b, bv = -1e9;
          for (let h = 0; h < 360; h += 2) { const hb = h * D, twa = Math.abs(((S.wf - hb + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) / D, sp = A.pol(twa, twa > 105), vmg = sp * Math.cos(hb - brg) * (Math.abs(((hb - S.b + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < .5 ? 1.04 : 1); if (vmg > bv) { bv = vmg; best = hb; } }
          S.b = best; S.yr = 0; S.del = 0; }
        W.tick(1 / 20);
        if (S.gndT && S.gndT !== S._gl) { S._gl = S.gndT; S._gndN = (S._gndN || 0) + 1; }
      }
      out.ms = Math.round(performance.now() - tq); out.started = S.started; out.mi = S._mi; out.msx = S._ms != null ? Math.round(S._ms) : null; out.paused = S.paused; out.ocs = S.ocs; out.fin = S.fin; out.t2 = S.t; out.pos = [Math.round(S.x), Math.round(S.z)]; out.next = S.next; out.v = +S.v.toFixed(2); return out; }, O);
    if (r.stage) { res.push(r.stage); require('fs').appendFileSync('/tmp/kekfast.log', 'SZAKASZ ' + JSON.stringify(r.stage) + '\n'); }
    if (r.end) break;
    if (guard % (O.every || 10) === 0) require('fs').appendFileSync('/tmp/kekfast.log', '… ' + JSON.stringify(r) + '\n');
  }
  console.log('ÖSSZ', JSON.stringify(res.map((q) => Math.round(q.tp))), 'T=', res.length ? Math.round(res[res.length - 1].T) : 0);
  console.log('hibák:\n' + errs.slice(0, 10).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 500)); process.exit(1); });
