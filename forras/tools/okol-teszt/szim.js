/* Ökölvezérlés-szimulátor v2: node sim2.js <port> <kerek|rud> <fps> */
const boot = require('./boot.js');
(async () => {
  const mode = process.argv[3] || 'kerek', fps = +(process.argv[4] || 72);
  const { b, p } = await boot(process.argv[2] || 8765, mode);
  const res = await p.evaluate(async (fps) => {
    const T = window.ZephyrTour, W = ZephyrWorld, S = W.vrr, T3 = AFRAME.THREE, out = {}, errs = [];
    const realTick = W.tick; W.tick = () => {};
    Object.defineProperty(T, 'inVR', { get: () => true, configurable: true });
    out.mode = S.tiller ? 'rud' : 'kerek'; out.fps = fps;
    const X = T.xr; X.src = X.src || {};
    const DT = 1 / fps, WM = .9 * Math.PI;
    let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) / Math.sqrt(.5); };
    const V = (x, y, z) => new T3.Vector3(x, y, z);
    const mkHand = (pos, closed) => { const c = pos.clone(), d = typeof closed === 'number' ? closed : closed ? .035 : .16; const o = (x, y, z) => c.clone().add(V(x, y, z));
      return { hand: true, src: null, o: c.clone(), d: V(0, 0, -1), palmC: c, wristJ: o(0, -.02, .07), tip: o(0, d, -.01), jp: { it: o(0, d, -.01), mt: o(.01, d, -.01), rt: o(.02, d, -.01), pt: o(.03, d, -.01), tt: o(-.09, .02, 0), ip: o(-.02, .03, -.03), ii: o(-.02, .05, -.03), mp: o(0, .03, -.03) } }; };
    const step = (hands, dtx) => { ['right', 'left'].forEach((h) => { const q = hands[h]; if (q === undefined) return; if (q === null) delete X.src[h]; else if (q === 'stale') { /* a régi adat marad */ } else { X.src[h] = mkHand(q.p, q.d != null ? q.d : q.closed !== false); X.pinch = X.pinch || {}; X.pinch[h] = !!q.pinch; X.hov = X.hov || {}; X.hov[h] = q.ui ? { kind: 'el' } : null; } });
      try { realTick(dtx || DT); } catch (e) { if (errs.length < 3) errs.push(String(e && e.stack || e).slice(0, 400)); } W.root.updateMatrixWorld(true); };
    const reset = (off, v) => { S.st = 'race'; S.b = (S.wf + off + 6.2832) % 6.2832; S.v = v == null ? 6 : v; S.wa = 0; S.del = 0; S.yr = 0; S.grabs = {}; S.grab = null; S.hold = {}; S.fm = null; S.pRef = {}; S.pLast = {}; delete X.src.right; delete X.src.left; if (X.pinch) { X.pinch.right = X.pinch.left = false; } if (X.hov) { X.hov.right = X.hov.left = null; } S.pen = 0; for (let i = 0; i < 20; i++) step({}); };
    W.root.updateMatrixWorld(true);
    const hub = S.ck.wheels[0].wheel.getWorldPosition(V(0, 0, 0));
    const R0 = hub.clone().add(V(.18, .15, .30)), L0 = hub.clone().add(V(-.18, .15, .30));
    const pc = (wa) => +(wa / WM * 100).toFixed(1), N = (sec) => Math.round(sec * fps), R = (dx) => R0.clone().add(V(dx, 0, 0)), L = (dx) => L0.clone().add(V(dx, 0, 0));
    const run = (sec, fn) => { let mx = 0; const n = N(sec); for (let i = 0; i < n; i++) { step(fn(i / fps, i)); mx = Math.max(mx, Math.abs(S.wa)); } return mx; };
    const hdgD = (b0) => { let d = S.b - b0; if (d > 3.1416) d -= 6.2832; if (d < -3.1416) d += 6.2832; return +(d * 57.3).toFixed(1); };
    /* --- ÁLLÓ KÉZ: a kormány nem mozdulhat --- */
    { reset(.75); let mh = 0; const mx = run(40, (t) => { if (Math.abs(t - 20) < DT / 2) S.b = (S.wf - .75 + 6.2832) % 6.2832; mh = Math.max(mh, Math.abs(S.heel || 0)); return { right: { p: R0 } }; }); out.A_allo_okol_doles_csapasvaltas = { kerekMaxPct: pc(mx), dolesMaxFok: +(mh * 57.3).toFixed(1), fogva: !!S.grab }; }
    { reset(.75); out.B_zaj_2mm = { kerekMaxPct: pc(run(40, () => ({ right: { p: R(0).add(V(gauss() * .002, gauss() * .002, gauss() * .002)) } }))) }; }
    { reset(.75); out.B2_zaj_5mm = { kerekMaxPct: pc(run(40, () => ({ right: { p: R(0).add(V(gauss() * .005, gauss() * .005, gauss() * .005)) } }))) }; }
    { reset(.75); const mx = run(10, (t) => ({ right: { p: (Math.abs(t - 3) < DT * .6) ? R(.08) : (t >= 6 && t < 6.2) ? R(.10) : R(0) } })); out.C_ugras_8cm_1kepkocka_es_10cm_02mp = { kerekMaxPct: pc(mx), vegPct: pc(S.wa) }; }
    { reset(.75); const mx = run(10, (t) => ({ right: { p: (t >= 3 && t < 3.045) ? R(.025) : (t >= 6 && t < 6.045) ? R(-.03) : R(0) } })); out.C2_kis_tuske_2_5cm_45ms = { kerekMaxPct: pc(mx), vegPct: pc(S.wa) }; }
    { reset(.75); const mx = run(10, (t) => ({ right: (t >= 3 && t < 5) ? 'stale' : { p: t >= 5 ? R(.04) : R(0) } })); out.D_kimarad_2mp_majd_4cmrel_arrebb = { kerekMaxPct: pc(mx), vegPct: pc(S.wa) }; }
    { reset(.75); const mx = run(10, (t) => ({ right: (t >= 3 && t < 5) ? null : { p: t >= 5 ? R(.04) : R(0) } })); out.D2_eltunik_2mp_majd_4cmrel_arrebb = { kerekMaxPct: pc(mx), vegPct: pc(S.wa) }; }
    { reset(.75); const mx = run(10, (t) => ({ right: { p: t >= 3 ? R(.06) : R(0) } })); out.D3_tartos_6cm_ugras = { kerekMaxPct: pc(mx), vegPct: pc(S.wa) }; }
    /* --- KÉT ÖKÖL --- */
    { reset(.75); const mx = run(60, () => ({ right: { p: R(gauss() * .002) }, left: { p: L(gauss() * .002) } })); out.E_ket_okol_zaj_2mm = { kerekMaxPct: pc(mx), vegPct: pc(S.wa) }; }
    { reset(.75); const mx = run(60, (t, i) => ({ right: { p: R(gauss() * .002) }, left: { p: L(gauss() * .015 + ((i % Math.round(4.2 * fps)) < 6 ? .06 : 0)) } })); out.E2_ket_okol_rossz_bal_kez = { kerekMaxPct: pc(mx), vegPct: pc(S.wa), vezeto: S.fm }; }
    { reset(.75); for (let i = 0; i < N(.5); i++) step({ left: { p: L(0) } });   /* a BAL (pihenő) kéz zárul előbb, aztán eltűnik a kamerák elől; a jobb kormányoz */
      run(1, () => ({ left: { p: L(0) }, right: { p: R(0) } })); const mx0 = run(3, () => ({ left: 'stale', right: { p: R(0) } }));
      run(.5, (t) => ({ left: 'stale', right: { p: R(.10 * Math.min(1, t / .5)) } })); run(1, () => ({ left: 'stale', right: { p: R(.10) } }));
      out.E3_pihenő_kéz_zárult_előbb_majd_eltűnt = { alloKerekMaxPct: pc(mx0), jobbKez10cmUtanPct: pc(S.wa), vezeto: S.fm }; }
    { reset(.75); for (let i = 0; i < N(.5); i++) step({ left: { p: L(0) } });   /* a BAL (pihenő, rosszul követett, de látszó) kéz zárul előbb; a jobb kormányoz */
      const noisyL = (i) => L(gauss() * .006 + ((i % Math.round(3.1 * fps)) < 4 ? .07 : 0));
      const mx0 = run(20, (t, i) => ({ left: { p: noisyL(i) }, right: { p: R(0) } }));
      run(.6, (t, i) => ({ left: { p: noisyL(i + 7) }, right: { p: R(.10 * Math.min(1, t / .5)) } })); run(1.5, (t, i) => ({ left: { p: noisyL(i + 50) }, right: { p: R(.10) } }));
      out.E4_pihenő_rossz_kéz_a_vezető = { alloKerekMaxPct: pc(mx0), jobbKez10cmUtanPct: pc(S.wa), vezeto: S.fm }; }
    { reset(.75); run(1, () => ({ right: { p: R(0) }, left: { p: L(0) } })); run(.5, (t) => ({ right: { p: R(.10 * Math.min(1, t / .5)) }, left: { p: L(.10 * Math.min(1, t / .5)) } })); run(1, () => ({ right: { p: R(.10) }, left: { p: L(.10) } }));
      const w1 = S.wa; run(2.2, () => ({ right: { p: R(.10), closed: false }, left: { p: L(.10) } })); const w2 = S.wa; run(.5, (t) => ({ right: { p: R(.10), closed: false }, left: { p: L(.10 - .05 * Math.min(1, t / .5)) } })); run(.5, () => ({ right: { p: R(.10), closed: false }, left: { p: L(.05) } }));
      out.I_ket_kez_egyutt_10cm_majd_jobb_elenged_bal_vissza_5cm = { egyuttPct: pc(w1), jobbElengedUtanPct: pc(w2), balVissza5cmPct: pc(S.wa), vezeto: S.fm }; }
    /* --- VALÓDI KORMÁNYZÁS: a kormány kövesse a kezet --- */
    { reset(1.2); const b0 = S.b; run(2, () => ({ right: { p: R(0) } })); run(.25, (t) => ({ right: { p: R(.10 * t / .5) } })); const half = S.wa; run(.25, (t) => ({ right: { p: R(.05 + .10 * t / .5) } })); run(3, () => ({ right: { p: R(.10) } })); const held = S.wa, d1 = hdgD(b0);
      run(.5, (t) => ({ right: { p: R(.10 * (1 - t / .5)) } })); run(1.5, () => ({ right: { p: R(0) } }));
      out.F_jobbra_10cm_05mp = { felutonPct: pc(half), elvartFeluton: 33.3, tartvaPct: pc(held), elvart: 66.7, iranyValtozasFok: d1, visszaKozepenPct: pc(S.wa) }; }
    { reset(1.2); run(1, () => ({ right: { p: R(0) } })); run(5, (t) => ({ right: { p: R(.10 * t / 5) } })); run(1, () => ({ right: { p: R(.10) } })); out.F2_lassan_10cm_5mp = { pct: pc(S.wa), elvart: 66.7 }; }
    { reset(1.2); run(1, () => ({ right: { p: R(0) } })); run(.1, (t) => ({ right: { p: R(.12 * Math.min(1, t / .1)) } })); const w0 = S.wa; run(.15, () => ({ right: { p: R(.12) } })); const w1 = S.wa; run(.6, () => ({ right: { p: R(.12) } })); out.F3_gyors_rantas_12cm_01mp = { rogtonPct: pc(w0), utana015mpPct: pc(w1), vegPct: pc(S.wa), elvart: 80 }; }
    { const sh = (x, i) => R(x(Math.floor(i / (fps / 30)) * (1 / 30)));   /* 30 Hz-es kézkövetés: a hely csak ~33 ms-onként frissül */
      reset(1.2); run(1, () => ({ right: { p: R(0) } })); run(.2, (t, i) => ({ right: { p: sh((tt) => .10 * Math.min(1, tt / .2), i) } })); run(.8, () => ({ right: { p: R(.10) } })); const a = S.wa;
      reset(1.2); run(1, () => ({ right: { p: R(0) } })); run(.1, (t, i) => ({ right: { p: sh((tt) => .10 * Math.min(1, tt / .1), i) } })); run(.8, () => ({ right: { p: R(.10) } }));
      out.F4_30Hz_kovetes_10cm = { sebesseg_05ms_pct: pc(a), sebesseg_1ms_pct: pc(S.wa), elvart: 66.7 }; }
    { reset(1.2); run(1, () => ({ right: { p: R(0) } })); run(1, (t) => ({ right: { p: R(.20 * t) } })); const top = S.wa; run(.25, (t) => ({ right: { p: R(.20 - .05 * t / .25) } })); run(.5, () => ({ right: { p: R(.15) } })); out.H_vegallas_tulhuzas_20cm_majd_vissza_5cm = { vegallasPct: pc(top), vissza5cmPct: pc(S.wa), elvart: 66.7 }; }
    { reset(1.2); run(1, () => ({ right: { p: R(0) } })); run(.5, (t) => ({ right: { p: R(.06 * t / .5) } })); run(.5, () => ({ right: { p: R(.06) } })); const w1 = S.wa; run(2.5, () => ({ right: { p: R(.06), closed: false } })); const w2 = S.wa, g2 = !!S.grab; run(1, () => ({ right: { p: R(.06) } })); run(.5, (t) => ({ right: { p: R(.06 + .03 * t / .5) } })); run(.5, () => ({ right: { p: R(.09) } }));
      out.G_kinyit_25mp_ujrazar_majd_3cm = { tartvaPct: pc(w1), nyitvaPct: pc(w2), elengedve: !g2, ujra3cmUtanPct: pc(S.wa), elvartVeg: 60 }; }
    { reset(1.2); run(1, () => ({ right: { p: R(0) } })); run(.5, (t) => ({ right: { p: R(.075 * t / .5) } })); run(.5, () => ({ right: { p: R(.075) } })); const w1 = S.wa; S.wa = 0; run(1, () => ({ right: { p: R(.075) } })); out.N_egyenesbe_gomb_fogas_kozben = { elottePct: pc(w1), utanaPct: pc(S.wa) }; }
    /* --- ELERNYEDŐ KÉZ, MENÜ-CSIPPENTÉS, SZOROSABB ÖKÖL --- */
    { reset(1.2); run(1, () => ({ right: { p: R(0) } })); run(.5, (t) => ({ right: { p: R(.06 * t / .5) } })); run(.5, () => ({ right: { p: R(.06) } })); const w1 = S.wa;
      run(.3, () => ({ right: { p: R(.06), d: .10 } })); run(1, (t) => ({ right: { p: R(.06 - .15 * t), d: .10 } })); run(1, () => ({ right: { p: R(-.09), d: .10 } })); const w2 = S.wa, g2 = !!S.grab;
      run(.3, () => ({ right: { p: R(-.09) } })); run(.5, (t) => ({ right: { p: R(-.09 + .03 * t / .5) } })); run(.4, () => ({ right: { p: R(-.06) } }));
      out.S1_elernyedt_kez_15cm_mozog = { okollelPct: pc(w1), elernyedveMozgasUtanPct: pc(w2), elengedve: !g2, ujraOkol3cmJobbraPct: pc(S.wa), elvartVeg: 60 }; }
    { reset(1.2); const mx = run(.25, (t) => ({ left: { p: L(.08 * t / .25), d: .16, pinch: true, ui: true } })); run(1.5, () => ({ left: { p: L(.08), d: .16 } })); out.S2_menure_csippentes_kozben_8cm = { kerekMaxPct: pc(Math.max(mx, Math.abs(S.wa))), fogva: !!S.grab }; }
    { reset(1.2); const mx = run(.25, (t) => ({ left: { p: L(.08 * t / .25), d: .16, pinch: true } })); const mx2 = run(1.5, (t) => ({ left: { p: L(.08 + .05 * Math.min(1, t)), d: .16 } })); out.S3_rovid_csippentes_a_levegoben_8cm = { kerekMaxPct: pc(Math.max(mx, mx2)), fogva: !!S.grab }; }
    { reset(1.2); run(1, () => ({ left: { p: L(0), d: .16, pinch: true } })); run(.5, (t) => ({ left: { p: L(.06 * t / .5), d: .16, pinch: true } })); run(.5, () => ({ left: { p: L(.06), d: .16, pinch: true } })); out.S3b_tartott_csippentessel_kormanyzas_6cm = { pct: pc(S.wa), elvart: 40 }; }
    { reset(1.2); run(.5, () => ({ left: { p: L(0), d: .085 } })); run(1, (t) => ({ left: { p: L(.05 * t), d: .085 } })); const w0 = S.wa; run(.2, () => ({ left: { p: L(.05), d: .085 }, right: { p: R(0) } }));
      const mx = (() => { let m2 = 0; const n = N(3); for (let i = 0; i < n; i++) { const t = i / fps; step({ left: { p: L(.05 + .10 * Math.sin(t * 2)), d: .085 }, right: { p: R(0) } }); if (t > .6) m2 = Math.max(m2, Math.abs(S.wa - w0)); } return m2; })();
      run(.5, (t) => ({ left: { p: L(.05), d: .085 }, right: { p: R(.06 * t / .5) } })); run(.5, () => ({ left: { p: L(.05), d: .085 }, right: { p: R(.06) } }));
      out.S4_laza_kez_fogott_elobb_majd_szoros_okol = { lazaKezAllitottaPct: pc(w0), szorosOkolMellettTovabbiElmozdulasPct: pc(mx), vezeto: S.fm, szorosOkol6cmUtanPct: pc(S.wa), elvartValtozas: 40 }; }
    { reset(1.2); run(.5, () => ({ right: { p: R(0) } })); run(.5, (t) => ({ right: { p: R(.05 * t / .5) } })); run(.5, () => ({ right: { p: R(.05) } })); const w1 = S.wa;
      run(.5, () => ({ right: { p: R(.05) }, left: { p: L(0) } })); run(.4, (t) => ({ right: { p: R(.05) }, left: { p: L(.04 * t / .4) } })); run(.8, () => ({ right: { p: R(.05) }, left: { p: L(.04) } })); const w2 = S.wa, v2 = S.fm;
      out.S5_aktiv_vezeto_mellett_masik_okol_4cm = { elottePct: pc(w1), utanaPct: pc(w2), vezeto: v2 }; }
    /* --- KÉSÉS: mennyivel jár a kormány a kéz mögött? --- */
    { const o = {}; for (const v of [.05, .1, .2, .5]) { reset(1.2); run(1.5, () => ({ right: { p: R(0) } })); const dist = Math.min(.14, v * 1.2), dur = dist / v; let onset = null, lagMs = null; const n = N(dur);
        for (let i = 0; i < n; i++) { const t = (i + 1) / fps, x = Math.min(dist, v * t); step({ right: { p: R(x) } }); const wx = Math.abs(S.wa) / WM * .15; if (onset == null && wx > .0005) onset = t; if (lagMs == null && t >= dur * .7) lagMs = (x - wx) / v * 1000; }
        run(.6, () => ({ right: { p: R(dist) } })); o['v' + Math.round(v * 100) + 'cm_s'] = { indulasKesesMs: onset == null ? null : Math.round(onset * 1000), menetKozbenKesesMs: Math.round(lagMs), vegPct: pc(S.wa), elvart: +(dist / .15 * 100).toFixed(1) }; }
      out.L_keses = o; }
    { reset(1.2); run(1, () => ({ right: { p: R(0) } })); run(.5, (t) => ({ right: { p: R(.06 * t / .5) } })); run(.5, () => ({ right: { p: R(.06) } })); const w1 = S.wa;
      run(.12, (t) => ({ right: { p: R(.06 - .30 * t), d: .035 + (.16 - .035) * (t / .12) } })); run(.8, (t) => ({ right: { p: R(.024 - .30 * t), d: .16 } })); run(1.2, () => ({ right: { p: R(-.216), d: .16 } }));
      out.S6_elengedes_kozben_elhuzott_kez_30cm_s = { okollelPct: pc(w1), utanaPct: pc(S.wa), elengedve: !S.grab }; }
    /* --- IRÁNYVÁLTÁS, APRÓ KORREKCIÓK (nincs holtjáték?) --- */
    { reset(1.2); run(1, () => ({ right: { p: R(0) } })); let mx = -9, mn = 9, zc = null; run(5, (t) => { const x = .01 * Math.sin(6.2832 * t); const r = { right: { p: R(x) } }; return r; }); 
      for (let i = 0; i < N(3); i++) { const t = i / fps, x = .01 * Math.sin(6.2832 * t); step({ right: { p: R(x) } }); const w = S.wa / WM * 100; mx = Math.max(mx, w); mn = Math.min(mn, w); }
      out.P_apro_korrekciok_1cm_1Hz = { kerekMaxPct: +mx.toFixed(1), kerekMinPct: +mn.toFixed(1), elvart: 6.7 }; }
    { reset(1.2); run(1, () => ({ right: { p: R(0) } })); run(.5, (t) => ({ right: { p: R(.05 * t / .5) } })); run(.2, (t) => ({ right: { p: R(.05 - .02 * t / .2) } })); run(.6, () => ({ right: { p: R(.03) } })); out.P2_jobbra_5cm_rogton_vissza_2cm = { pct: pc(S.wa), elvart: 20 }; }
    /* --- ROSSZUL KÖVETETT VEZETŐ KÉZ --- */
    { reset(.75); for (let i = 0; i < N(.5); i++) step({ left: { p: L(0) } });
      const mx0 = run(20, (t, i) => { const ph = t % 2; return { left: ph > 1.7 ? 'stale' : { p: L(gauss() * .015 + (Math.floor(t / 2) % 2 ? .03 : 0)) }, right: { p: R(0) } }; });
      const v0 = S.fm; run(.6, (t) => ({ left: 'stale', right: { p: R(.10 * Math.min(1, t / .5)) } })); run(1, () => ({ left: 'stale', right: { p: R(.10) } }));
      out.Q_akadozo_vezeto_kez_mellett_tiszta_masik = { alloKerekMaxPct: pc(mx0), vezeto20mpUtan: v0, jobb10cmUtanPct: pc(S.wa) }; }
    { reset(.75); for (let i = 0; i < N(.5); i++) step({ left: { p: L(0) } });
      const mx0 = run(20, () => ({ left: { p: L(gauss() * .015) }, right: { p: R(0) } })); const v0 = S.fm;
      run(.6, (t) => ({ left: { p: L(gauss() * .015) }, right: { p: R(.10 * Math.min(1, t / .5)) } })); run(1, () => ({ left: { p: L(gauss() * .015) }, right: { p: R(.10) } }));
      out.Q2_zajos_15mm_vezeto_kez = { alloKerekMaxPct: pc(mx0), vezeto20mpUtan: v0, jobb10cmUtanPct: pc(S.wa), vezetoVegul: S.fm }; }
    /* --- AKADÁS: egy 100 ms-os képkocka, közben a kéz 3 cm-t ment --- */
    { reset(1.2); run(1, () => ({ right: { p: R(0) } })); run(.2, (t) => ({ right: { p: R(.02 * t / .2) } })); step({ right: { p: R(.05) } }, .1); run(.3, (t) => ({ right: { p: R(.05 + .03 * Math.min(1, t / .2)) } })); run(.6, () => ({ right: { p: R(.08) } })); out.R_100ms_akadas_kozben_mozgas = { pct: pc(S.wa), elvart: 53.3 }; }
    { reset(.75); let dev = 0; const b0 = S.b; run(60, () => { return { right: { p: R(gauss() * .002) } }; }); out.O_egyenes_tartas_60mp = { iranyElteresFok: hdgD(b0), kerekPct: pc(S.wa) }; }
    out.errs = errs; return out;
  }, fps);
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 600)); process.exit(1); });
