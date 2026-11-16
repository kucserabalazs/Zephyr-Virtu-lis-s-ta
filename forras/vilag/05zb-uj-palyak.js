  /* =================================================================== 5/ZB. ÚJ PÁLYÁK ÉS ÚJ BÓJAKERÜLÉSEK (2026. nov. 15., a tulajdonos 18:39-es kérésére:
     „Szeretnék 5 éjszakai és 5 új nappali pályát is elkészíteni, újabb bójakerülő ötletekkel … Siófoki pálya: Óriáskerék, plázson mellette Aranyangyal
     a kikötő bejáratánál és Víztorony a háttérben; Zamárdi pálya: fent a zamárdi kilátó a hegy tetején, alatta a hegy oldalában a zamárdi templom
     és a hegy lábánál a zamárdi kikötő. A többi pályát rád bízom.”)
     ÚJ BÓJAKERÜLÉSEK (a nemzetközi versenyszabályok szerint – a versenyutasítás határozza meg, melyik oldalon kell kerülni):
       • JOBB KÉZ FELŐLI kerülés (a bója a hajó JOBB oldalán marad, felülről nézve az óramutató járásával egyezően) – a műszeren ZÖLD jelzés,
         a bóján zöld zászló, éjjel zöld villogó fény. A bal kéz felőli marad PIROS (port), mint eddig.
       • KAPU a pálya közepén: két bója, a hajónak a kettő KÖZÖTT kell áthaladnia a pálya irányában (a szél alatti kapu a modern olimpiai pályák eleme).
       • ELTOLT (offset) bója: a szél felőli bója után kis, rövid szakasszal arrébb egy második bója – a mezőny szétválik, mielőtt hátszélbe fordul.
       • NEVEZETESSÉG MINT JEL: a siófoki mólófej az Aranyangyallal, a zamárdi kikötő bejárata – egy bója közvetlenül előttük, ezeket kell megkerülni.
       • SZLALOM ÉS NYOLCAS: váltakozó oldalú kerülések – a bóját mindig a fordulás oldaláról kell kerülni (balra fordulásnál bal, jobbra fordulásnál jobb kéz felől).
     PÁLYASZÁMOK: 101–105 nappali, 106–110 éjszakai (a klasszikus 1–10 és a sorozatok véletlen 1–40-es pályái változatlanok). */
  const VENUES2 = [
    { id: "siofok", n: "Siófok – az Aranyangyal előtt", lat: 46.9156, lon: 18.0445, basin: "keleti", d: "Délen a siófoki kikötő, a keleti mólófejen fehér oszlopon az arany angyalszobor; mellette a plázson az óriáskerék, mögöttük a város fölött a víztorony." },
    { id: "zamardi2", n: "Zamárdi – a kikötő előtt", lat: 46.8899, lon: 17.9372, basin: "keleti", d: "Délen a zamárdi kikötő a domb lábánál; fölötte a hegyoldalban a fehér, fekete sisakos tornyú Kisboldogasszony-templom órával, a Kőhegy tetején a kilátó." }];
  /* m: bóják – {u, c}: a pálya tengelye mentén (u, a szél felőli hossz arányában) és keresztben (c, jobbra +); {ll}: valódi hely; sd: −1 = jobb kéz felől,
     „auto” = a fordulás oldaláról; gate: kapu (w: szélesség m); nm: név a műszeren */
  const VR_NEW = {
    101: { n: "Siófok – Aranyangyal-kör", ven: "siofok", night: false, storm: 0, wf: 322, kn: [10, 14], m: [{ u: 1, c: -.15 }, { ll: [46.9127, 18.0470], off: 135, nm: "Aranyangyal", lm: 1 }, { gate: true, u: .32, c: .42, w: 55 }] },
    102: { n: "Zamárdi – kikötő és kilátó", ven: "zamardi2", night: false, storm: 0, wf: 318, kn: [9, 13], m: [{ u: 1, c: .1 }, { gate: true, u: .25, c: 0, w: 60 }, { ll: [46.88573, 17.93694], off: 235, nm: "Kikötőbejárat", sd: "auto", lm: 1 }, { u: .82, c: -.3 }] },
    103: { n: "Tihanyi szoros – szlalom", ven: "tihany", night: false, storm: 0, wf: 330, kn: [12, 16], m: [{ u: .42, c: -.55, sd: "auto" }, { u: .74, c: .55, sd: "auto" }, { u: 1.06, c: -.45, sd: "auto" }, { gate: true, u: .48, c: .12, w: 55 }] },
    104: { n: "Füredi kapus trapéz", ven: "fured", night: false, storm: 0, wf: 300, kn: [8, 12], m: [{ u: 1, c: 0 }, { u: .96, c: -.24, nm: "Eltolt bója" }, { gate: true, u: .1, c: -.08, w: 60 }, { u: .55, c: .9, sd: "auto" }] },
    105: { n: "Badacsonyi nyolcas", ven: "badacsony", night: false, storm: 0, wf: 320, kn: [10, 15], m: [{ u: .6, c: -.6, sd: "auto" }, { u: 1.1, c: .5, sd: "auto" }, { u: .6, c: .6, sd: "auto" }, { u: 1.1, c: -.5, sd: "auto" }, { gate: true, u: .34, c: 0, w: 55 }] },
    106: { n: "Holdfényes Siófok", ven: "siofok", night: true, storm: 0, wf: 330, kn: [8, 11], m: [{ u: 1, c: .2 }, { ll: [46.9127, 18.0470], off: 135, nm: "Aranyangyal", lm: 1 }, { gate: true, u: .3, c: -.4, w: 55 }] },
    107: { n: "Viharos éjszaka a tanúhegyek alatt", ven: "szigliget", night: true, storm: 2, wf: 295, kn: [13, 17], m: [{ u: 1, c: -.2 }, { u: .55, c: .9, sd: "auto" }, { u: .2, c: -.3, sd: "auto" }] },
    108: { n: "Zamárdi éjféli kapuk", ven: "zamardi2", night: true, storm: 1, wf: 320, kn: [7, 10], m: [{ u: 1, c: 0 }, { gate: true, u: .55, c: -.5, w: 55 }, { ll: [46.88573, 17.93694], off: 235, nm: "Kikötőbejárat", sd: "auto", lm: 1 }, { gate: true, u: .45, c: .5, w: 55 }] },
    109: { n: "Keszthelyi öböl – fényes szlalom", ven: "keszthely", night: true, storm: 0, wf: 340, kn: [9, 12], m: [{ u: .4, c: .5, sd: "auto" }, { u: .7, c: -.5, sd: "auto" }, { u: 1, c: .45, sd: "auto" }, { u: .55, c: 0, sd: "auto" }] },
    110: { n: "Boglári fényjáték", ven: "boglar", night: true, storm: 1, wf: 310, kn: [10, 13], m: [{ u: 1, c: .1 }, { u: .97, c: -.18, nm: "Eltolt bója" }, { gate: true, u: .2, c: 0, w: 60 }, { u: .75, c: .7, sd: "auto" }] } };
  const VR_NEW_IDS = Object.keys(VR_NEW).map(Number);
  function vrIsNew(lvl) { return !!VR_NEW[lvl]; }
  function vrVenueNew(lvl) { const D = VR_NEW[lvl]; if (!D) return null; return VENUES2.find((v) => v.id === D.ven) || VENUES.find((v) => v.id === D.ven) || VENUES[0]; }
  function vrCourseNew(lvl) {
    const D = VR_NEW[lvl], R = vrRng(lvl * 7919 + 13), ven = vrVenueNew(lvl);
    const wf = (D.wf + (R() - .5) * 10) * D2R, u = vfwd(wf), c = [-u[1], u[0]], cs = vrCs(), Dm = 330 * cs, A = 140 * cs, L = 70 * Math.max(.6, cs);
    const [vx, vz] = balXY(ven.lat, ven.lon);
    const pos = (q) => { if (q.ll) { const [x, z] = balXY(q.ll[0], q.ll[1]); let px = x - vx, pz = z - vz;
        /* a nevezetesség elé, a víz felé (a part normálisa mentén) – a bója a vízen álljon */
        if (q.off) { try { const s = balShorePt2(q.ll[0], q.ll[1]); px = s.x + s.nx * q.off - vx; pz = s.z + s.nz * q.off - vz; } catch (e) {} } return { x: px, z: pz }; }
      return { x: u[0] * Dm * q.u + c[0] * A * q.c, z: u[1] * Dm * q.u + c[1] * A * q.c }; };
    const marks = D.m.map((q) => { const p = pos(q), m = { x: p.x, z: p.z }; if (q.nm) m.nm = q.nm; if (q.lm) m.lm = 1; if (q.gate) { const w = (q.w || 55) * Math.max(.7, cs); m.gate = { w }; } else if (q.sd === -1) m.sd = -1; else if (q.sd === "auto") m.sd = "auto"; return m; });
    const wk = D.kn[0] + R() * (D.kn[1] - D.kn[0]);
    const C = { name: D.n, wxn: wk < 9 ? "gyenge szél" : wk < 14 ? "közepes szél" : "friss szél", lvl, wf, tws: wk * KN, marks, u, c, line: { a: { x: -c[0] * L / 2, z: -c[1] * L / 2 }, b: { x: c[0] * L / 2, z: c[1] * L / 2 } }, night: D.night, storm: D.storm, isNew: 1 };
    vrMarksPrep(C);
    return C;
  }
  /* a jelek előkészítése: az „auto” oldal a fordulás irányából; a kapuk két bójája és az előre-oldal (fs) a következő célpont felől */
  function vrMarksPrep(C) {
    const L = C.marks, lm = { x: 0, z: 0 }, fm = C.fin ? { x: (C.fin.a.x + C.fin.b.x) / 2, z: (C.fin.a.z + C.fin.b.z) / 2 } : lm;
    L.forEach((m, i) => { const p = i ? L[i - 1] : lm, n = i + 1 < L.length ? L[i + 1] : fm, ix = m.x - p.x, iz = m.z - p.z, ox = n.x - m.x, oz = n.z - m.z;
      if (m.sd === "auto") { const turn = ix * oz - iz * ox; m.sd = turn > 0 ? -1 : 1; }   /* jobbra fordul (x keletre, z délre: pozitív) → jobb kéz felől */
      if (m.gate) { /* a kapu a BEÉRKEZŐ irányra merőleges (az előző jeltől egyenesen át lehessen menni rajta), középen a jel helye */
        const il = Math.hypot(ix, iz) || 1; let dx = ix / il, dz = iz / il;
        const w = m.gate.w, gx = -dz, gz = dx; m.gate.a = { x: m.x - gx * w / 2, z: m.z - gz * w / 2 }; m.gate.b = { x: m.x + gx * w / 2, z: m.z + gz * w / 2 }; m.gate.dir = [dx, dz]; } });
    return C;
  }
  /* a jel kerülésének módja szövegben (a műszer, az üzenetek és a tájékoztató közös forrása) */
  function vrMkHow(m) { return !m ? "" : m.gate ? "a két bója KÖZÖTT haladj át" : m.sd === -1 ? "JOBB kéz felől kerüld" : "BAL kéz felől kerüld"; }
  function vrMkName(m, i) { return m && m.nm ? m.nm : m && m.gate ? `${i + 1}. kapu` : `${i + 1}. bója`; }
  /* kapu áthaladás: a két bója közötti szakasz átlépése a pálya irányában (1), visszafelé (−1) */
  function vrGateCheck(o, i, m) { const G = m.gate, sx = (o.x - m.x) * G.dir[0] + (o.z - m.z) * G.dir[1], along = ((o.x - G.a.x) * (G.b.x - G.a.x) + (o.z - G.a.z) * (G.b.z - G.a.z)) / (G.w * G.w);
    if (o._mi !== i) { o._mi = i; o._ms = sx; return 0; } const prev = o._ms; o._ms = sx;
    if (along > -.04 && along < 1.04) { if (prev < 0 && sx >= 0) return 1; if (prev > 0 && sx <= 0 && Math.abs(sx) < 30) return -1; } return 0; }

  /* =================================================================== NEVEZETESSÉGEK A KÉT ÚJ HELYSZÍNHEZ (valódi helyükön; a messziről is felismerhető alak a fontos)
     SIÓFOK: a víztorony (1912, 45 m: bordás vasbeton törzs, kiszélesedő tartály ablaksávval, körerkély, kúpos tető, üvegfalú földszint – éjjel díszkivilágítással);
     az óriáskerék a plázson (két abroncs küllőkkel, színes kabinok, A-lábak; lassan forog, éjjel színváltó LED-fényekkel); az ARANYANGYAL – A béke jóságos angyala
     (Pjotr Sztronszkij, 2012) a keleti mólófejen: fehér oszlopon kiterjesztett szárnyú, aranyszínű angyal, éjjel megvilágítva.
     ZAMÁRDI: a Kőhegyi kilátó a domb tetején (fehér, felfelé keskenyedő torony téglasávokkal, kívül körbefutó, íves alátámasztású lépcsővel); a hegyoldalban
     a Kisboldogasszony-templom (fehér hajó, fehér torony órával, fekete sisak, kereszt); a domb lábánál a vitorláskikötő (két móló, 50 m-es bejárat
     vörös-fehér és zöld-fehér jelzőoszloppal, árbocerdő, stégek). */
  function lmShade(geo, col) { const q = geo.index ? geo.toNonIndexed() : geo; q.computeVertexNormals(); const c = new THREE.Color(col), N = q.attributes.normal, n = N.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const d = N.getX(i) * SUN.x + N.getY(i) * SUN.y + N.getZ(i) * SUN.z, k = .55 + .5 * Math.max(0, d) + .06 * N.getY(i); a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k; }
    q.setAttribute("color", new THREE.BufferAttribute(a, 3)); return q; }
  let _lmGold = null, _lmGoldN = null;
  /* 2026-11-16: fényes aranyozás – a széle sem sötétedik barnává, így messziről, ellenfényben is aranyként látszik (a fotókon a szobor ragyog) */
  function lmGoldMat() { if (_lmGold && !_lmGold._gone) return _lmGold; const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#b8862a"; g.fillRect(0, 0, w, h); const r = g.createRadialGradient(w * .4, h * .34, 4, w * .5, h * .5, w * .5); r.addColorStop(0, "#fffdf0"); r.addColorStop(.12, "#fff1b0"); r.addColorStop(.36, "#ffd75a"); r.addColorStop(.62, "#e8b437"); r.addColorStop(.86, "#c9942b"); r.addColorStop(1, "#a87a24"); g.fillStyle = r; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, TAU); g.fill(); });
    _lmGold = new THREE.MeshMatcapMaterial({ matcap: t, color: "#ffffff" }); W.disposables.push(_lmGold); return _lmGold; }
  /* éjjel: a fejezet négy reflektora alulról világítja – a fény a szobor alsó, a néző felé eső felén izzik */
  function lmGoldNightMat() { if (_lmGoldN && !_lmGoldN._gone) return _lmGoldN; const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#5a3c10"; g.fillRect(0, 0, w, h); const r = g.createRadialGradient(w * .5, h * .78, 4, w * .5, h * .55, w * .62); r.addColorStop(0, "#fff6d0"); r.addColorStop(.2, "#ffd770"); r.addColorStop(.5, "#e0a33a"); r.addColorStop(.8, "#9a6a1e"); r.addColorStop(1, "#5a3c10"); g.fillStyle = r; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, TAU); g.fill(); });
    _lmGoldN = new THREE.MeshMatcapMaterial({ matcap: t, color: "#ffffff" }); W.disposables.push(_lmGoldN); return _lmGoldN; }
  (function () {
    const rep = (name, obj) => { const i = BAL_LM.findIndex((L) => L.n === name); if (i >= 0) BAL_LM[i] = obj; else BAL_LM.push(obj); };
    /* ---- Siófoki víztorony */
    rep("Siófoki víztorony", { n: "Siófoki víztorony", sc: 2.5, lat: 46.9030, lon: 18.0532,   /* 2026-11-16 (tulajdonos): az angyal és az óriáskerék között, hátrébb, magasabban */ b: (P, L) => { const Wc = "#f1efe6", Gc = "#4f6b78", Mc = "#7d878e", Rc = "#c8ccce";
        P(new THREE.CylinderGeometry(6.2, 6.4, 4, 24), Gc, 0, 2); P(new THREE.CylinderGeometry(6.7, 6.7, .5, 24), Rc, 0, 4.25);
        P(new THREE.CylinderGeometry(2.7, 3.3, 33, 16), Wc, 0, 21); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; P(new THREE.BoxGeometry(.7, 33, .9).rotateY(a), Wc, Math.sin(a) * 3.05, 21, Math.cos(a) * 3.05); }
        P(new THREE.CylinderGeometry(7.4, 2.9, 6.5, 24), Wc, 0, 40.75); P(new THREE.CylinderGeometry(7.5, 7.5, 6, 24), Wc, 0, 47); P(new THREE.CylinderGeometry(7.58, 7.58, 1.3, 24, 1, true), "#34444f", 0, 47.4);
        P(new THREE.CylinderGeometry(8.4, 8.4, .45, 24), Rc, 0, 50.2); P(new THREE.TorusGeometry(8.3, .1, 4, 32).rotateX(Math.PI / 2), "#9aa0a4", 0, 51.3);
        P(new THREE.ConeGeometry(7.9, 4.6, 24), Mc, 0, 52.75); P(new THREE.CylinderGeometry(.9, .9, 1.6, 10), Wc, 0, 55.8); P(new THREE.ConeGeometry(.75, 2.6, 10), Mc, 0, 57.9);
        L.lights = [[0, 47, 7.8, "#d8ecff", 1.6], [0, 47, -7.8, "#d8ecff", 1.6], [7.8, 47, 0, "#d8ecff", 1.6], [-7.8, 47, 0, "#d8ecff", 1.6], [0, 30, 3.6, "#cfe2ff", 1], [0, 2, 6.6, "#ffe6b0", 1.3]]; } });
    /* ---- Siófoki óriáskerék: a talapzat és az A-lábak állnak; a kerék (abroncsok, küllők, kabinok) forog; éjjel színváltó LED-sor */
    rep("Siófoki óriáskerék", { n: "Siófoki óriáskerék", sc: 2.7, lat: 46.9131, lon: 18.0590, lights: [],   /* 2026-11-16 (tulajdonos): távolabb a parton az Aranyangyaltól (~900 m keletre, a plázson) */ b: (P) => { const st = "#d9dde1";
        P(new THREE.BoxGeometry(30, 1.2, 12), "#b9b4a8", 0, .6); P(new THREE.BoxGeometry(10, 3.4, 6), "#f2f2ee", 0, 2.3); P(new THREE.BoxGeometry(10.6, .5, 6.6), "#c62828", 0, 4.2);
        [-1, 1].forEach((sz) => [-1, 1].forEach((sx) => { const g = new THREE.CylinderGeometry(.45, .6, 21.6, 8); g.rotateZ(sx * .42); g.rotateX(-sz * .16); P(g, st, sx * 4.3, 10.6, sz * 1.9); }));
        P(new THREE.CylinderGeometry(.9, .9, 5.4, 12).rotateX(Math.PI / 2), "#8f979e", 0, 20.6, 0); },
      live: (g) => { const R = 17, hub = 20.6, NG = 24, Wg = new THREE.Group(); Wg.position.y = hub; g.add(Wg);
        const parts = []; [-1.4, 1.4].forEach((zz) => { const t = new THREE.TorusGeometry(R, .32, 6, 72); t.translate(0, 0, zz); parts.push([t, new THREE.Matrix4()]); const t2 = new THREE.TorusGeometry(R * .86, .16, 4, 60); t2.translate(0, 0, zz); parts.push([t2, new THREE.Matrix4()]);
          for (let k = 0; k < NG; k++) { const a = k / NG * TAU, sp = new THREE.CylinderGeometry(.08, .08, R, 4); sp.translate(0, R / 2, 0); sp.rotateZ(a); sp.translate(0, 0, zz); parts.push([sp, new THREE.Matrix4()]); } });
        for (let k = 0; k < NG; k++) { const a = k / NG * TAU, cr = new THREE.CylinderGeometry(.06, .06, 2.8, 4).rotateX(Math.PI / 2); cr.translate(Math.cos(a) * R, Math.sin(a) * R, 0); parts.push([cr, new THREE.Matrix4()]); }
        const wgeo = mergeGeoms(parts); const rimM = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }); W.disposables.push(rimM); const wq = lmShade(wgeo, "#eef1f4"); W.disposables.push(wq); const rim = new THREE.Mesh(wq, rimM); Wg.add(rim);
        /* kabinok: példányosítva, mindig függőlegesen lógva */
        const cg = lmShade(new THREE.BoxGeometry(2.2, 2.4, 2.2).translate(0, -1.5, 0), "#ffffff"); W.disposables.push(cg); const cm = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }); W.disposables.push(cm);
        const cab = new THREE.InstancedMesh(cg, cm, NG); cab.frustumCulled = false; g.add(cab); const cols = ["#e53935", "#fdd835", "#1e88e5", "#43a047", "#fb8c00", "#8e24aa"], cc = new THREE.Color(), M = new THREE.Matrix4();
        for (let k = 0; k < NG; k++) cab.setColorAt(k, cc.set(cols[k % cols.length]));
        /* LED-sor az abroncson (éjjel) */
        const led = new THREE.Mesh(new THREE.TorusGeometry(R + .1, .5, 4, 96), new THREE.MeshBasicMaterial({ color: "#ff4fd8", fog: false, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false })); W.disposables.push(led.geometry, led.material); led.visible = false; Wg.add(led);
        const halo = glowSpriteW("#ff6ad5", 52); halo.position.y = hub; g.add(halo);
        return (on, t) => { const th = t * TAU / 240; Wg.rotation.z = th; for (let k = 0; k < NG; k++) { const a = k / NG * TAU + th; M.makeTranslation(Math.cos(a) * R, hub + Math.sin(a) * R, 0); cab.setMatrixAt(k, M); } cab.instanceMatrix.needsUpdate = true;
          led.visible = on; halo.visible = on; if (on) { const h = (t * .05) % 1; led.material.color.setHSL(h, 1, .55); halo.material.color.setHSL(h, 1, .6); halo.material.opacity = .4; } rimM.color.setScalar(on ? .25 : 1); cm.color.setScalar(on ? .55 : 1); }; } });
    /* ---- ARANYANGYAL („A béke jóságos angyala”, Pjotr Sztronszkij, 2012) a siófoki keleti mólófejen – 2026-11-16 02:39 (tulajdonos: „az angyal a kép pontos mása
       legyen és legalább 2× ilyen nagy; a megvilágítása nem jó, nem látszik belőle szinte semmi”). A fotók szerint (8297a295, 8a17c608, 041f77cb): a móló kerek
       végén kékkorlátos körplató, rajta szürke beton talapzat (benne a kikötői jelzőfény), karcsú FEHÉR oszlop KÉT PIROS SÁVVAL, felül szélesebb fehér fejezet
       négy reflektorral; azon aranyozott FÉLGÖMB (földgömb, hosszúsági körökkel), rajta a hosszú, redős ruhás nőalak: két karját egyenesen a feje fölé emeli,
       kezében kiterjesztett szárnyú GALAMB; a hátán két nagy, kifelé-fölfelé kitárt, tollazott szárny; a feje kissé oldalra fordul. Méretek méterben (sc 1),
       a korábbinál kétszer nagyobb szobor. Az arany fényes, a széle sem sötétedik be (messziről is aranyként látszik); éjjel a reflektorok alulról világítják. */
    BAL_LM.push({ n: "Aranyangyal (Siófok, mólófej)", sc: 1, lat: 46.9127, lon: 18.0470, harbour: true, seg: true, hoff: 60, align: true, b: (P, L) => {
        const Wc = "#f2f1ec", Rc = "#c8232c", Cc = "#cfcac0", Mc = "#a29e95", Tc = "#c3bfb6", Kc = "#2f5d8f";
        P(new THREE.BoxGeometry(8, 2.4, 70), Mc, 0, 1.2, -41); P(new THREE.BoxGeometry(5.4, .3, 70), Tc, 0, 2.55, -41);   /* a móló (hullámtörő gerenda + járószint) */
        [-1, 1].forEach((sd) => { for (let k = 0; k < 9; k++) P(new THREE.BoxGeometry(2.2, 1.4, 6.5).rotateY(.3 * Math.sin(k * 2.1)), "#7d7a73", sd * 4.9, .4, -8 - k * 7.6); });   /* kőszórás a két oldalon */
        P(new THREE.CylinderGeometry(7, 7.6, 2.6, 36), Mc, 0, 1.3); P(new THREE.CylinderGeometry(6.7, 6.7, .25, 36), Tc, 0, 2.72);   /* a kerek mólóvég (platform) */
        P(new THREE.TorusGeometry(6.5, .06, 4, 48).rotateX(Math.PI / 2), Kc, 0, 3.85); P(new THREE.TorusGeometry(6.5, .05, 4, 48).rotateX(Math.PI / 2), Kc, 0, 3.3);
        for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; P(new THREE.CylinderGeometry(.05, .05, 1.2, 4), Kc, Math.sin(a) * 6.5, 3.4, Math.cos(a) * 6.5); }   /* kék korlát */
        P(new THREE.BoxGeometry(4.2, 5, 4.2), Cc, 0, 5.35); P(new THREE.BoxGeometry(1.6, 1, .08), "#8d897f", 0, 5.4, 2.13);   /* talapzat (emléktábla) */
        /* az oszlop: fehér – piros – fehér – piros – fehér */
        [[7.85, 4, Wc], [11.85, 5, Rc], [16.85, 4, Wc], [20.85, 5, Rc], [25.85, 4, Wc]].forEach(([y0, h, c]) => P(new THREE.CylinderGeometry(.75, .75, h, 24), c, 0, y0 + h / 2));
        P(new THREE.CylinderGeometry(1.35, 1.25, .85, 28), Wc, 0, 30.28);   /* a fejezet */
        for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + Math.PI / 4; P(new THREE.BoxGeometry(.55, .32, .42).rotateY(a), "#2c2f33", Math.sin(a) * 1.05, 30.86, Math.cos(a) * 1.05); }   /* reflektorok */
        L.lights = [[0, 31.2, 1.25, "#ffd98a", 1.5], [0, 31.2, -1.25, "#ffd98a", 1.5], [1.25, 31.2, 0, "#ffd98a", 1.3], [-1.25, 31.2, 0, "#ffd98a", 1.3], [0, 5.2, 2.3, "#ff3b30", 1.2]]; },
      live: (g) => { const G = new THREE.Group(); G.position.y = 30.7; g.add(G); const m = lmGoldMat(), add = (geo, x, y, z, rx, ry, rz, mm) => { const o = new THREE.Mesh(geo, mm || m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); W.disposables.push(geo); G.add(o); return o; };
        /* földgömb (félgömb) hosszúsági és szélességi bordákkal */
        add(new THREE.CylinderGeometry(1.4, 1.45, .3, 32), 0, .15, 0); add(new THREE.SphereGeometry(1.55, 36, 18, 0, TAU, 0, Math.PI / 2), 0, .3, 0);
        for (let k = 0; k < 12; k++) add(new THREE.TorusGeometry(1.57, .03, 4, 24, Math.PI / 2), 0, .3, 0, 0, k / 12 * TAU, Math.PI / 2);
        [.45, .9, 1.3].forEach((h) => { const r = Math.sqrt(1.55 * 1.55 - h * h) + .02; add(new THREE.TorusGeometry(r, .03, 4, 40).rotateX(Math.PI / 2), 0, .3 + h, 0); });
        /* a ruha: lefelé bővülő, mélyen redőzött hosszú köntös (deformált henger), derékon átbukó redővel */
        const robe = (() => { const g2 = new THREE.CylinderGeometry(1, 1, 1, 48, 24, true), P2 = g2.attributes.position; for (let i = 0; i < P2.count; i++) { const x = P2.getX(i), z = P2.getZ(i), yy = P2.getY(i) + .5, a = Math.atan2(x, z);
            const rb = yy < .1 ? 1.12 - yy * .8 : yy < .55 ? 1.04 - (yy - .1) * .22 : .94 - (yy - .55) * .62, fold = (Math.sin(a * 9 + yy * 1.6) * .13 + Math.sin(a * 17 - yy * 2.4) * .045) * (1.2 - yy * .9), sway = Math.sin(yy * Math.PI) * .06;
            P2.setXYZ(i, Math.sin(a) * rb * (1 + fold) + sway * .4, yy * 4.9 + 1.82, Math.cos(a) * rb * (1 + fold) * .82 - sway * .25); } g2.computeVertexNormals(); return g2; })();
        add(robe, 0, 0, 0);
        add(new THREE.TorusGeometry(.66, .14, 8, 32).rotateX(Math.PI / 2), 0, 6.55, 0); add(new THREE.CylinderGeometry(.7, .62, .55, 28), 0, 6.7, 0);   /* átbukó redő az övnél */
        /* felsőtest, nyak, fej (kissé jobbra fordulva), konty */
        { const t = new THREE.SphereGeometry(.7, 24, 18); t.scale(1.22, 1.55, .78); add(t, 0, 7.75, .02); }
        add(new THREE.CylinderGeometry(.21, .26, .55, 14), 0, 9.05, 0);
        { const h = new THREE.SphereGeometry(.42, 22, 16); h.scale(1, 1.2, 1.05); add(h, .03, 9.75, .05, 0, .35, 0); const hr = new THREE.SphereGeometry(.46, 18, 12, 0, TAU, 0, Math.PI * .62); hr.scale(1.02, 1.12, 1.1); add(hr, .02, 9.82, -.02, -.25, .35, 0);   /* a hátrafésült haj */
          const hb = new THREE.SphereGeometry(.27, 14, 10); add(hb, -.06, 9.9, -.4); const nz = new THREE.ConeGeometry(.06, .2, 6).rotateX(Math.PI / 2); add(nz, .16, 9.72, .44, 0, .35, 0); }
        /* a magasba emelt karok (bő ujjú köntösben) – a kezek a fej fölött összeérnek a galambnál */
        [-1, 1].forEach((sd) => { const pts = [new THREE.Vector3(sd * .78, 8.55, 0), new THREE.Vector3(sd * 1.02, 9.6, .05), new THREE.Vector3(sd * .9, 10.75, .12), new THREE.Vector3(sd * .55, 11.85, .14), new THREE.Vector3(sd * .24, 12.7, .12)];
          const cu = new THREE.CatmullRomCurve3(pts), tb = new THREE.TubeGeometry(cu, 24, .19, 10, false), A = tb.attributes.position;
          for (let i = 0; i < A.count; i++) { const k = Math.floor(i / 11) / 24, sc = k < .35 ? 1.5 - k : k < .6 ? 1.1 : .82; const c = cu.getPoint(Math.min(1, k)); A.setXYZ(i, c.x + (A.getX(i) - c.x) * sc, c.y + (A.getY(i) - c.y) * sc, c.z + (A.getZ(i) - c.z) * sc); } tb.computeVertexNormals(); add(tb);
          add(new THREE.SphereGeometry(.17, 12, 10), sd * .2, 12.85, .14); add(new THREE.SphereGeometry(.42, 16, 12).scale(1, 1, .9), sd * .82, 8.6, 0); });
        /* a galamb: test, fej, farok, kitárt szárnyak */
        { const b = new THREE.SphereGeometry(.34, 16, 12); b.scale(.8, .75, 1.6); add(b, 0, 13.25, .15, -.5, 0, 0); add(new THREE.SphereGeometry(.17, 12, 10), 0, 13.6, .55); add(new THREE.ConeGeometry(.06, .18, 6).rotateX(Math.PI / 2), 0, 13.6, .74);
          const tl = new THREE.Shape(); tl.moveTo(-.18, 0); tl.lineTo(.18, 0); tl.lineTo(.3, -.6); tl.lineTo(-.3, -.6); tl.closePath(); const tg = new THREE.ExtrudeGeometry(tl, { depth: .04, bevelEnabled: false }); tg.rotateX(-Math.PI / 2 - .7); add(tg, 0, 13.05, -.25);
          const dw = new THREE.Shape(); dw.moveTo(0, 0); dw.bezierCurveTo(.4, .28, .85, .32, 1.2, .2); [[1.05, .05], [1.12, -.06], [.92, -.12], [.96, -.24], [.72, -.26], [.7, -.36], [.45, -.32]].forEach(([a, c]) => dw.lineTo(a, c)); dw.quadraticCurveTo(.2, -.25, 0, 0);
          const dg = new THREE.ExtrudeGeometry(dw, { depth: .05, bevelEnabled: false }); dg.rotateX(-Math.PI / 2); dg.translate(0, 0, .1); W.disposables.push(dg);
          [-1, 1].forEach((sd) => { const o = new THREE.Mesh(dg, m); o.scale.set(sd, 1, 1); o.position.set(sd * .15, 13.38, .2); o.rotation.set(0, 0, sd * .32); G.add(o); }); }
        /* a nagy szárnyak: a lapockától kifelé és kissé fölfelé, a hátsó élen lépcsőzetes evezőtollakkal; két réteg (fedőtollak + evezőtollak) a domborzatért */
        const wingShape = (s) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(1.2 * s, 1.15 * s, 3.4 * s, 1.75 * s, 5.6 * s, 1.55 * s);
          [[5.0, 1.05], [5.25, .8], [4.55, .5], [4.75, .22], [4.0, -.02], [4.15, -.32], [3.4, -.45], [3.45, -.78], [2.7, -.8], [2.6, -1.1], [1.95, -1.05], [1.75, -1.3], [1.2, -1.15]].forEach(([a, c]) => sh.lineTo(a * s, c * s));
          sh.quadraticCurveTo(.5 * s, -.9 * s, 0, 0); return sh; };
        const wgA = new THREE.ExtrudeGeometry(wingShape(1), { depth: .16, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 1 }); wgA.translate(0, 0, -.08);
        const wgB = new THREE.ExtrudeGeometry(wingShape(.66), { depth: .1, bevelEnabled: false }); wgB.translate(.25, .45, .12); W.disposables.push(wgA, wgB);
        [-1, 1].forEach((sd) => { const wg = new THREE.Group(); wg.position.set(sd * .35, 8.35, -.45); wg.rotation.set(-.12, sd * .28, sd * .16); wg.scale.set(sd, 1, 1); G.add(wg);
          [wgA, wgB].forEach((geo, j) => { const o = new THREE.Mesh(geo, m); if (j) o.position.z = .04; wg.add(o); });
          for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(1.5, .06, .05), m); f.position.set(1.4 + k * .62, 1.25 - k * .02 + (k > 3 ? -.2 : 0), .14); f.rotation.z = .1 - k * .05; W.disposables.push(f.geometry); wg.add(f); } });
        G.traverse((o) => { o.userData.night = 1; });
        /* fényudvar éjjel (a reflektorok fénye a szobor körül), nappal nincs */
        const halo = glowSpriteW("#ffd98a", 16); halo.position.set(0, 37, 0); halo.material.opacity = .13; g.add(halo);
        return (on) => { halo.visible = on; const want = on ? lmGoldNightMat() : null; G.traverse((o) => { if (o.isMesh) o.material = want || m; }); }; } });
    /* ---- Zamárdi: Kőhegyi kilátó (fehér, keskenyedő torony téglasávokkal, kívül körbefutó íves lépcső, korlátos kilátószint) */
    rep("Kőhegyi kilátó (Zamárdi)", { n: "Kőhegyi kilátó (Zamárdi)", sc: 7, lat: 46.87217, lon: 17.93216, b: (P, L) => { const Wc = "#f2efe6", Bc = "#a4532e";
        P(new THREE.CylinderGeometry(1.5, 2.35, 5.3, 18), Wc, 0, 2.65); [1.1, 2.55, 4.0].forEach((y) => { const r = 2.35 - (2.35 - 1.5) * y / 5.3; P(new THREE.CylinderGeometry(r + .04, r + .07, .34, 18), Bc, 0, y); });
        P(new THREE.CylinderGeometry(2.25, 2.0, .3, 18), "#d3cfc5", 0, 5.45); P(new THREE.TorusGeometry(2.15, .05, 4, 28).rotateX(Math.PI / 2), "#3c3f44", 0, 6.45); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; P(new THREE.BoxGeometry(.06, 1, .06), "#3c3f44", Math.sin(a) * 2.15, 5.95, Math.cos(a) * 2.15); }
        /* külső csigalépcső íves alátámasztással (a torony körül egy teljes fordulat) */
        for (let k = 0; k < 16; k++) { const a = k / 16 * TAU * .92, y = .35 + k * .31, r = 2.25 - (2.25 - 1.6) * y / 5.3 + .55; P(new THREE.BoxGeometry(1.0, .16, .62).rotateY(a + Math.PI / 2), "#e8e4da", Math.sin(a) * r, y, Math.cos(a) * r);
          if (k % 3 === 1) { const ar = new THREE.TorusGeometry(.45, .08, 4, 10, Math.PI); ar.rotateY(a + Math.PI / 2); P(ar, Bc, Math.sin(a) * r, y - .5, Math.cos(a) * r); } }
        L.lights = [[0, 6, 2.3, "#fff1d6", .9]]; } });
    /* ---- Zamárdi: Kisboldogasszony-templom a hegyoldalban (fehér, a torony a tó felé néz; óra négy oldalon, fekete sisak) */
    BAL_LM.push({ n: "Kisboldogasszony-templom (Zamárdi)", sc: 2.4, lat: 46.8781, lon: 17.9471, fp: [[0, -14], [0, 12], [-6, 0], [6, 0]], b: (P, L) => { const Wc = "#f4f2ec", Rf = "#44484e", Bk = "#17191c", Dk = "#2a2f36";
        P(new THREE.BoxGeometry(11, 7, 24), "#d4cfc3", 0, -3.4, 2); P(new THREE.BoxGeometry(5.8, 7, 5.8), "#d4cfc3", 0, -3.4, -11.4);   /* kőlábazat a lejtő felé */
        P(new THREE.BoxGeometry(10, 9, 22), Wc, 0, 4.5, 2); const rf = new THREE.Shape(); rf.moveTo(-5.6, 0); rf.lineTo(0, 4.6); rf.lineTo(5.6, 0); rf.closePath(); const rg = new THREE.ExtrudeGeometry(rf, { depth: 22.6, bevelEnabled: false }); rg.translate(0, 9, -9.3); P(rg, Rf, 0, 0, 0);
        for (let k = 0; k < 4; k++) [-1, 1].forEach((sd) => P(new THREE.BoxGeometry(.2, 3.4, 1.5), Dk, sd * 5.02, 4.6, -4 + k * 5.4));   /* hajóablakok */
        P(new THREE.BoxGeometry(5, 19, 5), Wc, 0, 9.5, -11.4); P(new THREE.BoxGeometry(5.5, .45, 5.5), "#dcd8ce", 0, 19.2, -11.4); P(new THREE.BoxGeometry(5.3, .4, 5.3), "#dcd8ce", 0, 9.4, -11.4);
        [[0, -2.53], [0, 2.53], [-2.53, 0], [2.53, 0]].forEach(([dx, dz]) => { const rot = dx ? Math.PI / 2 : 0, cl = new THREE.CylinderGeometry(1.15, 1.15, .14, 20).rotateX(Math.PI / 2).rotateY(rot); P(cl, "#fbfbf8", dx, 14.6, -11.4 + dz);
          const rim = new THREE.TorusGeometry(1.15, .1, 4, 20).rotateY(rot); P(rim, Bk, dx * 1.03, 14.6, -11.4 + dz * 1.03); P(new THREE.BoxGeometry(dx ? .1 : .14, .85, dx ? .14 : .1), Bk, dx * 1.06, 14.85, -11.4 + dz * 1.06); P(new THREE.BoxGeometry(dx ? .1 : .6, .12, dx ? .6 : .1), Bk, dx * 1.06, 14.6, -11.4 + dz * 1.06 + (dx ? .25 : 0));
          P(new THREE.BoxGeometry(dx ? .3 : 1.3, 2.4, dx ? 1.3 : .3), Dk, dx * .95, 17.2, -11.4 + dz * .95); });
        P(new THREE.ConeGeometry(3.3, 10.5, 8).rotateY(Math.PI / 8), Bk, 0, 24.65, -11.4); P(new THREE.SphereGeometry(.42, 10, 8), "#d8b04a", 0, 30.1, -11.4); P(new THREE.BoxGeometry(.18, 2.3, .18), "#d8b04a", 0, 31.5, -11.4); P(new THREE.BoxGeometry(1.2, .18, .18), "#d8b04a", 0, 31.9, -11.4);
        L.lights = [[0, 13, -14.2, "#fff0d0", 1.4], [0, 22, -11.4, "#ffe8c0", 1.2], [0, 6, 13.2, "#ffe3b0", 1]]; } });
    /* ---- Zamárdi vitorláskikötő a domb lábánál (a part normálisához igazítva: +z a tó felé) */
    BAL_LM.push({ n: "Zamárdi vitorláskikötő", lat: 46.88573, lon: 17.93694, harbour: true, seg: true, hoff: 0, align: true, b: (P, L) => { const St = "#a29e95", St2 = "#c3bfb6";
        [-1, 1].forEach((sd) => { P(new THREE.BoxGeometry(6, 1.7, 150), St, sd * 62, .85, 75); P(new THREE.BoxGeometry(4.6, .3, 150), St2, sd * 62, 1.85, 75); P(new THREE.BoxGeometry(37, 1.7, 6), St, sd * 43.5, .85, 150); P(new THREE.BoxGeometry(37, .3, 4.6), St2, sd * 43.5, 1.85, 150);
          /* bejárati jelzőoszlop: a bejövő hajó bal kezén vörös-fehér, jobb kezén zöld-fehér sávos */
          const cA = sd < 0 ? "#d32f2f" : "#2e7d32"; for (let k = 0; k < 6; k++) P(new THREE.CylinderGeometry(.5, .5, 1, 12), k % 2 ? "#f5f5f2" : cA, sd * 25, 2.5 + k, 150); P(new THREE.CylinderGeometry(.35, .35, .6, 10), "#2b2f33", sd * 25, 8.3, 150); });
        [-28, 0, 28].forEach((x) => P(new THREE.BoxGeometry(2.4, .5, 92), "#8a6a48", x, .55, 70));   /* stégek */
        const rnd = vrRng(4242); for (let k = 0; k < 42; k++) { const row = k % 6, x = -42 + row * 14 + (row % 2 ? 3 : -3) * 1, z = 26 + Math.floor(k / 6) * 14 + rnd() * 3, h = 10 + rnd() * 5;
          P(new THREE.BoxGeometry(2.7, 1.1, 8.4), rnd() < .8 ? "#f7f7f4" : "#28456b", x, .8, z); P(new THREE.CylinderGeometry(.07, .09, h, 5), "#d0d4d8", x, 1.3 + h / 2, z - .6); }
        P(new THREE.BoxGeometry(16, 5, 9), "#f3f0e8", -40, 2.5, -10); P(new THREE.ConeGeometry(11, 3.4, 4).rotateY(Math.PI / 4).scale(1, 1, .6), "#9b4a32", -40, 6.7, -10);
        L.lights = [[-25, 8.6, 150, "#ff3a2a", 1.2], [25, 8.6, 150, "#36ff6a", 1.2], [-40, 3, -5, "#ffd9a0", 1]]; } });
  })();
