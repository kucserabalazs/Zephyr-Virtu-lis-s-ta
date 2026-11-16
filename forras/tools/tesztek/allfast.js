// Minden pálya gyors, robotpilótás végigfuttatása: node allfast.js '{"lvls":[1,2,...],"maxT":1500}'
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const O = JSON.parse(process.argv[2] || '{}'), LOG = O.log || '/tmp/allfast.log';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 640, height: 400 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  let errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 200))); p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load/.test(t)) errs.push('c:' + t.slice(0, 200)); if (m.type() === 'warning' && /hiba|error|vihar|éjszaka|kékszalag|napszak/i.test(t)) errs.push('w:' + t.slice(0, 200)); });
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.evaluate(() => { try { localStorage.setItem('zephyr-hajo', 'zephyr'); } catch (e) {} });
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._race, null, { timeout: 90000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const W = ZephyrWorld, S = W._race; S.mixFleet = false; S.todMix = false; S.nightForce = null; S.lvl = 1; W._raceGo = true; W.open('race'); });
  await p.waitForFunction(() => { const S = ZephyrWorld._race; return S && S.boat && S.C && S.water && S.setup; }, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  for (const lvl of O.lvls) {
    errs = [];
    const r0 = await p.evaluate((lvl) => { const W = ZephyrWorld, S = W._race; try { S._ap = null; S.setup(lvl); } catch (e) { return 'setup hiba ' + e.message; } return { name: S.C.name, venue: S.venue && S.venue.id, night: !!(W._ngt && W._ngt.on), marks: S.marks.length, limit: Math.round(S.C.limit || 0), fin: !!S.C.fin }; }, lvl);
    let res = null, guard = 0, phase = 'race';
    while (guard++ < 400) {
      const r = await p.evaluate(([lvl, maxT]) => { const W = ZephyrWorld, S = W._race, D = Math.PI / 180, C = S.C;
        const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
        const st = S._ap || (S._ap = { pen: 0, gnd: 0, foul: 0, ocs: 0, wrong: 0, stage: 0, mi: -1, kgT: 0 });
        for (let n = 0; n < 300; n++) {
          if (S.st === 'pre' && S.t < -7) { const u = C.u; S.x = (C.line.a.x + C.line.b.x) / 2 - u[0] * 75; S.z = (C.line.a.z + C.line.b.z) / 2 - u[1] * 75; S.b = Math.atan2(u[0], -u[1]); S.v = 5.5; S.yr = 0; S.del = 0; }
          if (S.st === 'race' && !S.fin) { const ms = S.marks, u = C.u; let tx, tz;
            const lm = { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 };
            if (S.ocs === 1) { tx = lm.x - u[0] * 40; tz = lm.z - u[1] * 40; } else if (S.ocs === 2 || !S.started) { tx = lm.x + u[0] * 40; tz = lm.z + u[1] * 40; }
            else if (S.next < ms.length) { const m = ms[S.next]; if (st.mi !== S.next) { st.mi = S.next; st.stage = 0; }
              if (m.gate) { const G = m.gate; tx = m.x + G.dir[0] * 35; tz = m.z + G.dir[1] * 35; }
              else { const pv = S.next ? ms[S.next - 1] : lm, nx = S.next + 1 < ms.length ? ms[S.next + 1] : (() => { const F = C.fin ? { x: (C.finL ? 0 : 0), z: 0 } : lm; return lm; })();
                let ix = m.x - pv.x, iz = m.z - pv.z, il = Math.hypot(ix, iz) || 1, ox = nx.x - m.x, oz = nx.z - m.z, ol = Math.hypot(ox, oz) || 1; ix /= il; iz /= il; ox /= ol; oz /= ol;
                let Ox = ix - ox, Oz = iz - oz, Ol = Math.hypot(Ox, Oz); const k = m.sd === -1 ? -1 : 1; if (Ol < .35) { Ox = -iz * k; Oz = ix * k; Ol = 1; } Ox /= Ol; Oz /= Ol;
                const px = -Oz * k, pz = Ox * k, R = 26, wp = [[m.x + px * R + Ox * 6, m.z + pz * R + Oz * 6], [m.x + Ox * R, m.z + Oz * R], [m.x - px * R + Ox * 4, m.z - pz * R + Oz * 4]];
                const w = wp[Math.min(st.stage, 2)]; tx = w[0]; tz = w[1]; if (Math.hypot(tx - S.x, tz - S.z) < 11 && st.stage < 2) st.stage++; else if (st.stage === 2 && Math.hypot(tx - S.x, tz - S.z) < 11) st.stage = 0; } }
            else { const F = { x: 0, z: 0 }; const fm = (() => { try { return S.C.fin ? null : null; } catch (e) { return null; } })(); void fm; const fl = S.fb && S.C.fin ? { x: (S.fb[0].position.x + S.fb[1].position.x) / 2, z: (S.fb[0].position.z + S.fb[1].position.z) / 2 } : lm; tx = fl.x - u[0] * 40; tz = fl.z - u[1] * 40; void F; }
            const brg = Math.atan2(tx - S.x, -(tz - S.z)); let best = S.b, bv = -1e9;
            for (let h = 0; h < 360; h += 2) { const hb = h * D, twa = Math.abs(wrap(S.wf - hb)) / D, sp = W._kekApi.pol(twa, twa > 105), vmg = sp * Math.cos(hb - brg) * (Math.abs(wrap(hb - S.b)) < .5 ? 1.04 : 1); if (vmg > bv) { bv = vmg; best = hb; } }
            S.b = best; S.yr = 0; S.del = 0; }
          if (S.pen > 0) { st.pen += S.pen; S.pen = 0; }
          if (S.gndT && S.gndT !== st.gl) { st.gl = S.gndT; st.gnd++; (st.gp = st.gp || []).push([Math.round(S.x), Math.round(S.z), Math.round(S.t), S.st]); }
          S.riv.forEach((r, ri) => { if (r.gndT && r.gndT !== (st['rg' + ri])) { st['rg' + ri] = r.gndT; (st.rgp = st.rgp || []).push([ri, Math.round(r.x), Math.round(r.z), Math.round(S.t), r.next]); } });
          if (S.wrongT && S.wrongT !== st.wl) { st.wl = S.wrongT; st.wrong++; }
          W.tick(1 / 20);
          if (S.st === 'done' || S.doneT) break;
        }
        const rv = S.riv.map((r) => r.fin ? Math.round(r.fin) : (r.out ? 'ki' : ('n' + r.next + '@' + Math.round(Math.hypot(r.x - (S.marks[Math.min(r.next, S.marks.length - 1)] || {}).x || 0, r.z - ((S.marks[Math.min(r.next, S.marks.length - 1)] || {}).z || 0))))));
        return { st: S.st, t: Math.round(S.t), fin: S.fin ? Math.round(S.fin) : null, next: S.next, nm: S.marks.length, done: !!S.doneT, riv: rv, ap: { pen: st.pen, gnd: st.gnd, wrong: st.wrong, gp: (st.gp || []).slice(0, 4), rgp: (st.rgp || []).slice(0, 8), lim: S.C.limit, rfin: S.riv.map((r) => r.fin != null ? Math.round(r.fin) + (r.dnf ? 'D' : '') : '-') }, dnf: !!S.dnf, ocs: S.ocs, started: S.started };
      }, [lvl, O.maxT || 1500]);
      res = r;
      if (r.done || r.st === 'done' || r.t > (O.maxT || 1500)) break;
    }
    fs.appendFileSync(LOG, JSON.stringify({ lvl, ...r0, res, errs: errs.slice(0, 4) }) + '\n');
  }
  await b.close();
})().catch((e) => { require('fs').appendFileSync('/tmp/allfast.log', 'FAIL ' + String(e).slice(0, 400) + '\n'); process.exit(1); });
