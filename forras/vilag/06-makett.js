
  /* =================================================================== 3. A HÁZ MAKETTJE – építészeti makett a hivatalos tervrajz szerint (2026. nov. 6.)
     • Csak a Zephyr épülete: egyetlen téglatest, kívül 6,0 × 22,2 m (belül 5,4 m széles), két szint, lapos tető. A mellette álló kisebb ház
       a szomszédé (külön helyrajzi szám, saját falak, más tetőmagasság) – nem része a makettnek.
     • Elöl (az utca és a Balaton felé, kb. 345°): Korvett (földszint) és Fregatt (emelet), erkéllyel/terasszal; középen a fedett bejáró a lépcsővel;
       utána Dingi (földszint) és Kalóz (emelet); hátul Schooner (földszint) és Kadett (emelet) – belül egyformák, a Kadett terasza a hátsó, emeleti fa terasz.
     • A ház keleti oldalán a parkoló, mögötte a kert. Tájolás a Google légifelvételből; a fény a választott nap és óra napállása szerint vet árnyékot.
     • Rámutatva kiemelés és adatok, csippentésre választás: „Belépés a lakásba” vagy „Foglalás”. Ha a foglalásban már van időpont: zöld = szabad, piros = foglalt. */
  const MAQ = {};
  const SCALE = 1 / 60;               /* M 1:60 */
  const FLOOR_H = 2.85, WALL = .3, PART = .25, IN_W = 5.4, OUT_W = IN_W + 2 * WALL;
  /* a ház koordinátái méterben: x = kelet felé (a parkoló oldala), z = az utcától hátrafelé (165° felé), y = fel */
  const Z_A = WALL, Z_HALL = Z_A + 6.2 + PART, Z_B = Z_HALL + 4.0 + PART, Z_C = Z_B + 4.35 + PART, Z_END = Z_C + 6.41 + WALL;
  const APTCOL = { korvett: "#e2483d", dingi: "#3fb37f", fregatt: "#3d8fe2", kaloz: "#9b6be2", schooner: "#2bb3c0", kadett: "#d9a441" };
  /* lakásonként: szint, és az alaprajz (méter) → ház (méter) leképezés */
  const UNITS = {
    korvett:  { lvl: 0, map: (x, y) => [WALL + x, Z_A + y] },
    fregatt:  { lvl: 1, map: (x, y) => [WALL + x, Z_A + y] },
    dingi:    { lvl: 0, map: (x, y) => [WALL + y, Z_B + (4.35 - x)] },
    kaloz:    { lvl: 1, map: (x, y) => [WALL + y, Z_B + (4.10 - x)] },
    schooner: { lvl: 0, map: (x, y) => [WALL + x, Z_C + y] },
    kadett:   { lvl: 1, map: (x, y) => [WALL + x, Z_C + y] }
  };
  function planOf(id) { const P = T.PLANS; const g = T.GROUPS.find((q) => q.id === id) || {}; return P[g.plan] || P.elso; }
  const ROOMCOL = (n) => /fürd/i.test(n) ? "#b9c6cc" : /háló/i.test(n) ? "#a77a4f" : /nappali|konyha|szoba|étkez/i.test(n) ? "#b9895a" : /előt|előszoba/i.test(n) ? "#9e9a92" : "#b08a63";
  /* téglalap az alaprajzból → a ház koordinátáiba (tengelyhez igazítva) */
  function mapRect(U, x, y, w, h) {
    const a = U.map(x, y), b = U.map(x + w, y + h);
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  }
  function sunDirFor(ymd, h) {
    /* napállás → irány a ház koordinátáiban (+z = 165°, +x = 75°) */
    let p = { az: 230, el: 45 };
    try { if (T.sunPos) p = T.sunPos(ymd, h); } catch (e) {}
    const d = (p.az - 165) * D2R, el = Math.max(6, p.el) * D2R;
    return { v: new THREE.Vector3(-Math.sin(d) * Math.cos(el), Math.sin(el), Math.cos(d) * Math.cos(el)), p };
  }

  function buildMaquette() {
    const root = W.root;
    const model = new THREE.Group(); model.scale.setScalar(SCALE); MAQ.model = model;
    const turn = new THREE.Group(); turn.add(model); MAQ.turn = turn;
    const stand = new THREE.Group(); stand.add(turn); root.add(stand); MAQ.stand = stand;
    /* a telek közepe a forgástengelyen (x: −4…16 m, z: −10…40 m) */
    const SX0 = -3, SX1 = 13.5, SZ0 = -10, SZ1 = 40, CX = (SX0 + SX1) / 2, CZ = (SZ0 + SZ1) / 2;
    model.position.set(-CX * SCALE, 0, -CZ * SCALE);
    const parts = {};   /* szín → geometria-lista (összevonva rajzoljuk – Questen ez számít) */
    const P = (col, g, m, opt) => { const k = col + (opt ? "|" + JSON.stringify(opt) : ""); (parts[k] = parts[k] || { col, opt, list: [] }).list.push([g, m]); };
    const box = (col, x0, z0, x1, z1, y0, h, opt) => P(col, new THREE.BoxGeometry(Math.max(.01, x1 - x0), h, Math.max(.01, z1 - z0)), M4((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2), opt);
    const cyl = (col, x, z, r, y0, h, seg, opt) => P(col, new THREE.CylinderGeometry(r, r, h, seg || 10), M4(x, y0 + h / 2, z), opt);

    /* ---------- talapzat (diófa keret, filc) ---------- */
    const baseW = (SX1 - SX0) * SCALE, baseD = (SZ1 - SZ0) * SCALE;
    const wood = std({ color: "#5b3a22", roughness: .45 }), felt = std({ color: "#2c3a2e", roughness: .95 });
    const base = mesh(new THREE.BoxGeometry(baseW + .03, .045, baseD + .03), wood, turn); base.position.y = -.0235; base.receiveShadow = true;
    const feltM = mesh(new THREE.BoxGeometry(baseW, .004, baseD), felt, turn); feltM.position.y = -.001; feltM.receiveShadow = true;
    base.userData.xr = { down: (h, src) => { MAQ.drag = { a: turn.rotation.y, d: src.d.clone() }; MAQ.auto = false; }, drag: (src) => { if (!MAQ.drag) return; const d0 = MAQ.drag.d, d1 = src.d; turn.rotation.y = MAQ.drag.a + wrapA(Math.atan2(d1.x, d1.z) - Math.atan2(d0.x, d0.z)) * 4; }, up: () => { MAQ.drag = null; } };
    T.xr.extra.add(base); W.objs.push(base);

    /* ---------- utca, járda, kerítés, előkert ---------- */
    box("#3e4248", SX0, -9.2, SX1, -4.4, 0, .05);                                   /* aszfalt */
    for (let x = SX0 + .6; x < SX1; x += 3.2) box("#e8e4d6", x, -6.88, x + 1.6, -6.72, .05, .006);   /* felezővonal */
    box("#b9b4a8", SX0, -4.4, SX1, -2.7, 0, .12);                                   /* járda */
    box("#9aa08f", SX0, -2.7, SX1, SZ1, 0, .04);                                    /* telek alap */
    box("#6fa25a", -.4, -2.5, 6.3, -.05, .04, .03);                                 /* előkert gyep */
    box("#cfc6b4", 1.4, -2.7, 2.6, -.05, .04, .04);                                  /* bejárati járda */
    [[-.4, 1.2], [2.8, 6.3]].forEach(([a, b]) => box("#3f4a46", a, -2.62, b, -2.5, .04, 1.3));   /* utcai kerítés (a kapuknál nyitva) */
    box("#5a6066", 1.25, -2.66, 1.32, -2.46, .04, 1.5); box("#5a6066", 2.7, -2.66, 2.77, -2.46, .04, 1.5);
    /* parkoló a ház keleti oldalán: zúzottkő, autók */
    box("#a39d91", 6.3, -2.7, 12.6, 22.3, .04, .025);
    for (let z = 1; z < 21; z += 2.6) box("#8e887d", 6.3, z, 12.6, z + .08, .065, .004);   /* parkolóhelyek jelölése */
    box("#3d6a3a", 12.6, -2.7, 12.9, SZ1, .04, 1.7);                                 /* keleti sövény */
    /* kert a ház mögött */
    box("#5f9a48", -.4, 22.3, 12.6, SZ1, .04, .03);
    box("#cfc6b4", 6.6, 22.3, 7.8, SZ1 - 2, .04, .035);                              /* kerti út */
    box("#3f4a46", -.55, 22.3, -.4, SZ1, .04, 1.4);                                  /* nyugati telekhatár (a szomszéd felé) */
    box("#3f4a46", -.55, SZ1 - .15, 12.9, SZ1, .04, 1.4);                            /* hátsó kerítés */
    /* grillterasz / kerti konyha pergolával, napozóágyak, SUP-tartó, kerékpárok */
    box("#8a6a48", 8.4, 27, 12.2, 31, .04, .08);
    [[8.5, 27.1], [12.0, 27.1], [8.5, 30.8], [12.0, 30.8]].forEach(([x, z]) => box("#e9e6dc", x, z, x + .12, z + .12, .12, 2.3));
    for (let k = 0; k < 9; k++) box("#e9e6dc", 8.4, 27 + k * .5, 12.2, 27.08 + k * .5, 2.42, .08);
    box("#d8d4cc", 8.6, 27.2, 10.8, 27.8, .12, .9); box("#2b2f36", 10.9, 27.2, 11.8, 27.8, .12, 1.0);
    box("#9c6b3f", 9.2, 28.6, 11.4, 29.6, .82, .06); [[9.3, 28.7], [11.2, 28.7], [9.3, 29.4], [11.2, 29.4]].forEach(([x, z]) => box("#7a5a3a", x, z, x + .08, z + .08, .12, .7));
    [[2.2, 30], [3.6, 30]].forEach(([x, z]) => { box("#f2efe6", x, z, x + .7, z + 1.9, .12, .25); box("#f2efe6", x, z, x + .7, z + .5, .37, .25); });
    for (let k = 0; k < 4; k++) box(["#ffd166", "#1f5fa8", "#e5262f", "#3fb37f"][k], 11.2, 33 + k * .5, 12.4, 33.1 + k * .5, .5 + k * .02, .1);
    for (let k = 0; k < 4; k++) box("#2b2f36", 11.6, 36 + k * .55, 11.68, 37.6 + k * .05, .04, 1.0);
    box("#8c939b", 9.4, 34.6, 11.2, 37.2, .04, 2.1);                                /* tároló */
    /* fák */
    [[1.5, 26, 2.2], [4.5, 35.5, 2.8], [10.0, 38.2, 1.6], [11.6, 24.5, 1.4], [0.8, 38, 2.0], [-1.6, -6.1, 1.4], [11.2, -3.4, 1.3]].forEach(([x, z, r]) => {
      cyl("#5a3d24", x, z, .18, .04, 2.6, 8);
      P("#3e7d3a", new THREE.IcosahedronGeometry(r, 1), M4(x, 2.6 + r * .75, z), { flat: 1 });
    });

    /* ---------- az épület ---------- */
    const Y1 = FLOOR_H, roofY = 2 * FLOOR_H;
    MAQ.lv = [new THREE.Group(), new THREE.Group()]; MAQ.lv.forEach((g, i) => { g.position.y = i * FLOOR_H; model.add(g); });
    const lvParts = [{}, {}];
    const LP = (lv, col, g, m, opt) => { const k = col + (opt ? "|" + JSON.stringify(opt) : ""); (lvParts[lv][k] = lvParts[lv][k] || { col, opt, list: [] }).list.push([g, m]); };
    const lbox = (lv, col, x0, z0, x1, z1, y0, h, opt) => LP(lv, col, new THREE.BoxGeometry(Math.max(.01, x1 - x0), h, Math.max(.01, z1 - z0)), M4((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2), opt);
    /* födémek (padló) szintenként */
    [0, 1].forEach((lv) => lbox(lv, "#ece7dc", 0, 0, OUT_W, Z_END, -.2, .2));
    /* külső falak: magas (homlokzat, tetővel) és metszett (alacsony, „babaház” nézet) változat */
    MAQ.shell = [[], []];
    const shellBox = (lv, x0, z0, x1, z1, tall) => { const h = tall ? FLOOR_H - .2 : 1.05; const g = new THREE.BoxGeometry(x1 - x0, h, z1 - z0); g.translate((x0 + x1) / 2, h / 2, (z0 + z1) / 2); return g; };
    [0, 1].forEach((lv) => [true, false].forEach((tall) => {
      const gs = [[0, 0, OUT_W, WALL], [0, Z_END - WALL, OUT_W, Z_END], [0, 0, WALL, Z_END], [OUT_W - WALL, 0, OUT_W, Z_END]].map((r) => [shellBox(lv, ...r, tall), new THREE.Matrix4()]);
      /* a lakások közti válaszfalak teljes szélességben */
      [Z_HALL - PART, Z_B - PART, Z_C - PART].forEach((z) => gs.push([shellBox(lv, WALL, z, OUT_W - WALL, z + PART, tall), new THREE.Matrix4()]));
      const m = mesh(mergeGeoms(gs), std({ color: tall ? "#f4f1ea" : "#f7f4ee", roughness: .9 }), MAQ.lv[lv]);
      m.castShadow = true; m.receiveShadow = true; m.userData.tall = tall; MAQ.shell[lv].push(m);
    }));
    /* lakások: padló, belső falak (metszett), bútorok */
    MAQ.apts = {};
    Object.keys(UNITS).forEach((id) => {
      const U = UNITS[id], Pl = planOf(id), lv = U.lvl;
      let bb = [1e9, 1e9, -1e9, -1e9];
      (Pl.rooms || []).forEach((r) => {
        const q = mapRect(U, r[1], r[2], r[3], r[4]);
        q[0] = Math.max(WALL, q[0]); q[2] = Math.min(OUT_W - WALL, q[2]);
        bb = [Math.min(bb[0], q[0]), Math.min(bb[1], q[1]), Math.max(bb[2], q[2]), Math.max(bb[3], q[3])];
        lbox(lv, ROOMCOL(r[0]), q[0], q[1], q[2], q[3], 0, .03);
        /* belső válaszfalak a szobák szélein (a külső falak mentén nem kell) */
        const t = .1, h = .95, inside = (v, a, b) => v > a + .05 && v < b - .05;
        if (inside(q[0], WALL, OUT_W - WALL)) lbox(lv, "#faf8f3", q[0] - t / 2, q[1], q[0] + t / 2, q[3], 0, h, { c: 1 });
        if (inside(q[2], WALL, OUT_W - WALL)) lbox(lv, "#faf8f3", q[2] - t / 2, q[1], q[2] + t / 2, q[3], 0, h, { c: 1 });
        lbox(lv, "#faf8f3", q[0], q[1] - t / 2, q[2], q[1] + t / 2, 0, h, { c: 1 });
        lbox(lv, "#faf8f3", q[0], q[3] - t / 2, q[2], q[3] + t / 2, 0, h, { c: 1 });
      });
      furnish(lv, U, Pl, lbox, LP);
      MAQ.apts[id] = { id, lv, bb, name: ((T.GROUPS.find((q) => q.id === id) || {}).name) || id, no: (T.GROUPS.find((q) => q.id === id) || {}).no, lock: !!(T.GROUPS.find((q) => q.id === id) || {}).lock,
        area: (Pl.rooms || []).reduce((s, r) => s + r[3] * r[4], 0) };
    });
    /* fedett bejáró a lépcsővel (földszint) és emeleti folyosó/terasz */
    lbox(0, "#cfc6b4", WALL, Z_HALL, OUT_W - WALL, Z_B - PART, 0, .03);
    for (let k = 0; k < 15; k++) lbox(0, "#d7d3cb", WALL, Z_B - PART - .3 - k * .26, WALL + 1.0, Z_B - PART - k * .26, 0, .19 * (k + 1), { c: 1 });
    lbox(1, "#a98a66", WALL + 1.1, Z_HALL, OUT_W - WALL, Z_B - PART, 0, .04);         /* emeleti terasz a bejáró fölött */
    lbox(1, "#cfd8dc", WALL + 1.1, Z_HALL + .02, OUT_W - WALL, Z_HALL + .06, .04, 1.0, { glass: 1 });
    /* elöl: Korvett terasza (földszint) és a Fregatt erkélye (emelet) */
    lbox(0, "#a98a66", 0, -1.45, OUT_W, 0, -.06, .06); lbox(1, "#a98a66", 0, -1.45, OUT_W, 0, -.18, .18);
    lbox(1, "#cfd8dc", 0, -1.45, OUT_W, -1.4, 0, 1.0, { glass: 1 }); lbox(1, "#cfd8dc", 0, -1.45, .05, 0, 0, 1.0, { glass: 1 }); lbox(1, "#cfd8dc", OUT_W - .05, -1.45, OUT_W, 0, 0, 1.0, { glass: 1 });
    /* hátul: a Schooner terasza (földszint) és a Kadett emeleti fa terasza oszlopokon, csigalépcsővel */
    lbox(0, "#a98a66", 0, Z_END, OUT_W, Z_END + 2.9, -.04, .06);
    lbox(1, "#9b7653", 0, Z_END, OUT_W, Z_END + 3.3, -.2, .2);
    [[.1, Z_END + 3.1], [OUT_W - .3, Z_END + 3.1]].forEach(([x, z]) => box("#e9e6dc", x, z, x + .2, z + .2, 0, Y1 - .2));
    lbox(1, "#cfd8dc", 0, Z_END + 3.25, OUT_W, Z_END + 3.3, 0, 1.0, { glass: 1 }); lbox(1, "#cfd8dc", OUT_W - .05, Z_END, OUT_W, Z_END + 3.3, 0, 1.0, { glass: 1 });
    for (let k = 0; k < 14; k++) { const a = k * .45; P("#8f969c", new THREE.BoxGeometry(.75, .05, .22), M4(-.6 + Math.cos(a) * .4, .2 * (k + 1), Z_END + 2.2 + Math.sin(a) * .4, -a)); }
    cyl("#7f868c", -.6, Z_END + 2.2, .05, 0, Y1 + 1.0, 8);
    /* lapos tető attikafallal (a légifelvétel szerint világos, lapos tető) */
    MAQ.roof = new THREE.Group(); model.add(MAQ.roof);
    const roofParts = [[new THREE.BoxGeometry(OUT_W, .25, Z_END + 1.45), M4(OUT_W / 2, roofY + .125, (Z_END - 1.45) / 2)]];
    [[0, -1.45, OUT_W, -1.3], [0, Z_END - .15, OUT_W, Z_END], [0, -1.45, .15, Z_END], [OUT_W - .15, -1.45, OUT_W, Z_END]].forEach(([x0, z0, x1, z1]) => roofParts.push([new THREE.BoxGeometry(x1 - x0, .5, z1 - z0), M4((x0 + x1) / 2, roofY + .5, (z0 + z1) / 2)]));
    const roofM = mesh(mergeGeoms(roofParts), std({ color: "#c9c9c4", roughness: .85 }), MAQ.roof); roofM.castShadow = true; roofM.receiveShadow = true;
    /* ablakok és üvegajtók a homlokzaton (az alaprajzok nyílászáróiból, a külső falakon) */
    Object.keys(UNITS).forEach((id) => {
      const U = UNITS[id], Pl = planOf(id);
      (Pl.furn || []).forEach((f) => {
        if (f[0] !== "window" && f[0] !== "door") return;
        const q = mapRect(U, f[1], f[2], f[3], f[4]), cx = (q[0] + q[2]) / 2, cz = (q[1] + q[3]) / 2;
        const onX = cx < WALL + .35 || cx > OUT_W - WALL - .35, onZ = cz < WALL + .4 || cz > Z_END - WALL - .4 || Math.abs(cz - (Z_A - WALL)) < .4;
        if (!onX && !onZ) return;
        const door = f[0] === "door", y0 = door ? 0 : .9, h = door ? 2.1 : 1.25;
        if (onX) { const x = cx < OUT_W / 2 ? -.02 : OUT_W + .02, len = q[3] - q[1]; MAQ.win = MAQ.win || []; MAQ.win.push([U.lvl, x, cz, .05, Math.max(.5, len), y0, h]); }
        else { const z = cz < Z_END / 2 ? -.02 : Z_END + .02, len = q[2] - q[0]; MAQ.win = MAQ.win || []; MAQ.win.push([U.lvl, cx, z, Math.max(.5, len), .05, y0, h]); }
      });
    });
    (MAQ.win || []).forEach(([lv, x, z, w, d, y0, h]) => { lbox(lv, "#2d4a63", x - w / 2, z - d / 2, x + w / 2, z + d / 2, y0, h, { glass: 1, tall: 1 }); lbox(lv, "#ffffff", x - w / 2 - .04, z - d / 2 - .01, x + w / 2 + .04, z + d / 2 + .01, y0 - .06, .06, { tall: 1 }); });

    /* ---------- az összevont részek kirajzolása ---------- */
    const mk = (pt, parent) => {
      const o = pt.opt || {};
      const mat = o.glass ? std({ color: pt.col, roughness: .1, metalness: .2, transparent: true, opacity: .45, depthWrite: false }) : std({ color: pt.col, roughness: o.flat ? .95 : .8, flatShading: !!o.flat });
      const m = mesh(mergeGeoms(pt.list), mat, parent); m.castShadow = !o.glass; m.receiveShadow = true; m.userData.tall = !!o.tall; return m;
    };
    Object.values(parts).forEach((pt) => mk(pt, model));
    MAQ.tallBits = [[], []];
    [0, 1].forEach((lv) => Object.values(lvParts[lv]).forEach((pt) => { const m = mk(pt, MAQ.lv[lv]); if (pt.opt && pt.opt.tall) MAQ.tallBits[lv].push(m); }));

    /* ---------- lakásonkénti kiemelés, felirat, választás ---------- */
    Object.values(MAQ.apts).forEach((A) => {
      const col = new THREE.Color(APTCOL[A.id] || "#999");
      const gm = basic({ color: col, transparent: true, opacity: 0, depthWrite: false });
      const glow = mesh(new THREE.BoxGeometry(A.bb[2] - A.bb[0] + .2, FLOOR_H - .3, A.bb[3] - A.bb[1] + .2), gm, MAQ.lv[A.lv]);
      glow.position.set((A.bb[0] + A.bb[2]) / 2, (FLOOR_H - .3) / 2, (A.bb[1] + A.bb[3]) / 2);
      A.glow = glow; A.gm = gm; A.col = col;
      glow.userData.xr = { hover: (on) => maqHover(A, on), click: () => maqSelect(A) };
      T.xr.extra.add(glow); W.objs.push(glow);
    });
    maqAvail();

    /* ---------- tájolás: iránytű és a Balaton iránya a talapzat elején ---------- */
    const rose = canvasTex(512, 512, (g) => {
      g.translate(256, 256); g.strokeStyle = "#c9a24a"; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 200, 0, TAU); g.stroke();
      g.fillStyle = "#e5262f"; g.beginPath(); g.moveTo(0, -190); g.lineTo(44, 0); g.lineTo(-44, 0); g.closePath(); g.fill();
      g.fillStyle = "#f3efe6"; g.beginPath(); g.moveTo(0, 190); g.lineTo(44, 0); g.lineTo(-44, 0); g.closePath(); g.fill();
      g.fillStyle = "#f3efe6"; g.font = "900 96px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("É", 0, -240 + 30);
    });
    const ro = mesh(new THREE.PlaneGeometry(3.6, 3.6), basic({ map: rose, transparent: true, depthWrite: false }), model);
    /* a −z (az utca felé) 345°; az észak ettől 15°-kal az óramutató járása szerint */
    ro.rotation.set(-Math.PI / 2, 0, -15 * D2R); ro.position.set(9.4, .08, 4.5);
    const lake = canvasTex(1024, 256, (g) => { g.fillStyle = "rgba(58,127,168,.92)"; g.fillRect(0, 0, 1024, 256); g.fillStyle = "#fff"; g.font = "800 70px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("▼ erre a Balaton · kb. 100 m", 512, 128); });
    const lk = mesh(new THREE.PlaneGeometry(10, 2.5), basic({ map: lake, transparent: true }), model); lk.rotation.set(-Math.PI / 2, 0, Math.PI); lk.position.set(CX, .07, -8.4);
    /* névtábla a talapzat elején */
    const plate = canvasTex(1024, 160, (g) => { g.fillStyle = "#c9a24a"; g.fillRect(0, 0, 1024, 160); g.fillStyle = "#2a1c0c"; g.font = "800 60px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ZEPHYR APARTMANHÁZ · ZAMÁRDI", 512, 66); g.font = "500 32px Georgia, serif"; g.fillText("Gáspár András utca 58. · M 1:60 · a hivatalos tervrajz szerint", 512, 124); });
    const pl = mesh(new THREE.PlaneGeometry(baseW * .9, baseW * .9 * 160 / 1024), basic({ map: plate }), turn); pl.position.set(0, -.024, -(baseD / 2) - .0155); pl.rotation.y = Math.PI;

    /* ---------- fény: a napállás szerint, árnyékkal ---------- */
    const r = T.sceneEl.renderer; MAQ.shadowWas = r.shadowMap.enabled; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    MAQ.lights = addLights(new THREE.Vector3(.4, .9, .3).normalize(), true);
    MAQ.lights.hemi.intensity = .62; MAQ.lights.amb.intensity = .12;
    const sun = MAQ.lights.sun; sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536); sun.shadow.bias = -.0004; sun.shadow.normalBias = .002;
    const sc = sun.shadow.camera; sc.left = -.7; sc.right = .7; sc.top = .7; sc.bottom = -.7; sc.near = .05; sc.far = 6; sc.updateProjectionMatrix();
    MAQ.sunTgt = new THREE.Object3D(); stand.add(MAQ.sunTgt); sun.target = MAQ.sunTgt;
    MAQ.day = (T.sunDefaultDay && T.sunDefaultDay()) || "2027-07-15"; MAQ.hour = 15;
    maqLight();

    /* ---------- elhelyezés: asztalmagasságban, előttünk; a ház utcafrontja felénk ---------- */
    const y = T.inVR ? .9 : -.42, dist = T.inVR ? .7 : .6, yaw = T.camYaw();
    stand.position.set(-Math.sin(yaw) * dist, y, -Math.cos(yaw) * dist); stand.rotation.y = yaw;
    if (!T.inVR) { const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject) lc.pitchObject.rotation.x = -.6; }
    turn.rotation.y = Math.PI + .35;   /* az utca felénk, kissé oldalról – így látszik a parkoló is */
    /* kerek asztal – a makett szabadon forgatható rajta */
    const tr = Math.hypot(baseW, baseD) / 2 + .06;
    const table = mesh(new THREE.CylinderGeometry(tr, tr, .04, 64), std({ color: "#3b2a1d", roughness: .45 }), stand); table.position.y = -.07; table.receiveShadow = true;
    MAQ.table = table;
    const leg = mesh(new THREE.CylinderGeometry(.05, .09, .85, 16), std({ color: "#2a1d13", roughness: .5 }), table); leg.position.y = -.44;
    const foot = mesh(new THREE.CylinderGeometry(.28, .3, .03, 32), std({ color: "#2a1d13", roughness: .5 }), table); foot.position.y = -.87;
    mesh(new THREE.SphereGeometry(40, 32, 16), basic({ color: "#1b2a3a", side: THREE.BackSide }), root);
    const floor = mesh(new THREE.CircleGeometry(12, 48), std({ color: "#2c3a48", roughness: .95 }), root); floor.rotation.x = -Math.PI / 2; floor.position.y = T.inVR ? 0 : -1.4;
    MAQ.upper = true; MAQ.roofOn = false; MAQ.sel = null; MAQ.auto = undefined;
    W.onClose = () => { try { T.sceneEl.renderer.shadowMap.enabled = MAQ.shadowWas; } catch (e) {} };
    return { tick: maqTick, panel: maqPanel, hud: maqHud };
  }

  /* bútorok az alaprajz tereptárgyaiból – egyszerű, de felismerhető formák */
  function furnish(lv, U, Pl, lbox) {
    (Pl.furn || []).forEach((f) => {
      const [type, x, y, w0, d0, , rot] = f; if (["door", "window", "area", "lane", "stairs"].includes(type) || !(w0 > .05 && d0 > .05)) return;
      const sw = Math.abs(rot || 0) % 180 === 90, w = sw ? d0 : w0, d = sw ? w0 : d0, cx = x + w0 / 2, cy = y + d0 / 2;
      const q = mapRect(U, cx - w / 2, cy - d / 2, w, d); const [x0, z0, x1, z1] = q, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const long = (x1 - x0) > (z1 - z0);
      switch (type) {
        case "bed": lbox(lv, "#8d6e52", x0, z0, x1, z1, .03, .3); lbox(lv, "#f7f4ee", x0 + .04, z0 + .04, x1 - .04, z1 - .04, .33, .18);
          lbox(lv, "#3d8fe2", x0 + .04, z0 + .04 + (z1 - z0) * .35, x1 - .04, z1 - .04, .5, .03);   /* takaró */
          if (long) { lbox(lv, "#ffffff", x0 + .1, z0 + .15, x0 + .55, z1 - .15, .51, .12); } else { lbox(lv, "#ffffff", x0 + .15, z0 + .1, x1 - .15, z0 + .5, .51, .12); } break;
        case "sofa": lbox(lv, "#7d8a96", x0, z0, x1, z1, .03, .42);
          if (long) lbox(lv, "#6b7884", x0, z1 - .22, x1, z1, .45, .38); else lbox(lv, "#6b7884", x1 - .22, z0, x1, z1, .45, .38); break;
        case "table4": case "table6": case "table2": case "table5": case "table":
          lbox(lv, "#9c6b3f", x0, z0, x1, z1, .72, .05); [[x0, z0], [x1 - .06, z0], [x0, z1 - .06], [x1 - .06, z1 - .06]].forEach(([a, b]) => lbox(lv, "#6b4426", a, b, a + .06, b + .06, .03, .7)); break;
        case "chair": lbox(lv, "#7a5a3a", x0 + .05, z0 + .05, x1 - .05, z1 - .05, .43, .05); lbox(lv, "#7a5a3a", x0 + .05, z0 + .05, x1 - .05, z0 + .1, .48, .45); break;
        case "shower": lbox(lv, "#e6eef2", x0, z0, x1, z1, .03, .06); lbox(lv, "#bfe3f0", x0, z0, x1, z0 + .03, .09, 1.9, { glass: 1 }); lbox(lv, "#bfe3f0", x0, z0, x0 + .03, z1, .09, 1.9, { glass: 1 }); break;
        case "wc": lbox(lv, "#ffffff", x0 + .05, z0 + .05, x1 - .05, z1 - .05, .03, .4); break;
        case "sink": lbox(lv, "#ffffff", x0, z0, x1, z1, .78, .12); break;
        case "counter": lbox(lv, "#e9e6df", x0, z0, x1, z1, .03, .85); lbox(lv, "#3b3b3b", x0, z0, x1, z1, .88, .04); break;
        case "washer": lbox(lv, "#f2f2f2", x0, z0, x1, z1, .03, .85); break;
        case "tv": lbox(lv, "#1a1a1a", x0, z0, x1, z1, .9, .45); break;
        case "shelf": lbox(lv, "#c9a77b", x0, z0, x1, z1, .03, 1.6); break;
        default: {
          const lab = String(f[5] || ""), h = /szekrény/.test(lab) ? 2.0 : /hűtő/.test(lab) ? 1.75 : /klíma|bojler/.test(lab) ? 0 : /fotel|pouf/.test(lab) ? .45 : /asztal/.test(lab) ? .74 : .55;
          if (h > 0) lbox(lv, /szekrény/.test(lab) ? "#c9b28f" : /hűtő/.test(lab) ? "#f4f4f4" : /fotel/.test(lab) ? "#8a7a6a" : "#cbb894", x0, z0, x1, z1, .03, h);
        }
      }
    });
  }
  /* ha a foglalásban már van időpont: szabad (zöld) / foglalt (piros) */
  function maqAvail() {
    let S = null; try { S = T.vrPanel && T.vrPanel.S && T.vrPanel.S.book; } catch (e) {}
    const B = window.ZephyrBooking && ZephyrBooking.vr;
    MAQ.dates = S && S.ci && S.co ? { ci: S.ci, co: S.co } : null;
    Object.values(MAQ.apts).forEach((A) => {
      A.free = null;
      if (!MAQ.dates || !B || A.lock) return;
      let ok = true; for (let d = MAQ.dates.ci; d < MAQ.dates.co; d = addDay(d, 1)) if (!B.free(A.id, d)) { ok = false; break; }
      A.free = ok;
    });
  }
  function addDay(s, n) { const [y, m, d] = s.split("-").map(Number); const t = new Date(y, m - 1, d + n); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); }
  function maqLight() {
    const L = MAQ.lights; if (!L) return;
    const s = sunDirFor(MAQ.day, MAQ.hour); MAQ.sunInfo = s.p;
    const v = s.v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), MAQ.turn.rotation.y + MAQ.stand.rotation.y);
    MAQ.stand.updateMatrixWorld(true);
    const c = new THREE.Vector3(); MAQ.stand.getWorldPosition(c);
    MAQ.sunTgt.position.set(0, 0, 0);
    L.sun.position.copy(c).addScaledVector(v, 3);
    const low = s.p.el < 0; L.sun.intensity = low ? .2 : 1.15; L.sun.color.set(s.p.el < 12 ? 0xffc48a : 0xfff0d8);
  }
  function maqHover(A, on) {
    A.hov = on;
    if (!A.label) {
      const cap = (() => { try { const c = ZephyrBooking.vr.cfg(); const a = c && c.apartments.find((q) => q.id === A.id); return a ? a.cap + " fő · " : ""; } catch (e) { return ""; } })();
      A.label = labelSprite([(A.no ? A.no + " · " : "") + A.name, A.lock ? "saját lakás – nem foglalható" : `${cap}kb. ${Math.round(A.area)} m² · csippents rá`], { size: 7.5, fs: 50 });
      A.label.position.set((A.bb[0] + A.bb[2]) / 2, FLOOR_H + 2.6, (A.bb[1] + A.bb[3]) / 2); MAQ.lv[A.lv].add(A.label);
    }
    A.label.visible = !!on || MAQ.sel === A;
  }
  /* választás: kártya két gombbal – belépés a lakásba / foglalás ezzel a lakással */
  function maqSelect(A) {
    if (MAQ.sel && MAQ.sel !== A && MAQ.sel.label) MAQ.sel.label.visible = false;
    MAQ.sel = A; maqHover(A, true);
    if (MAQ.card) { T.xr.extra.delete(MAQ.card); W.objs = W.objs.filter((o) => o !== MAQ.card); MAQ.card.parent && MAQ.card.parent.remove(MAQ.card); MAQ.card = null; }
    const CW = 1000, CH = 420, btns = [];
    const tx = canvasTex(CW, CH, (g) => {
      g.fillStyle = "rgba(9,34,70,.94)"; g.beginPath(); g.roundRect ? g.roundRect(6, 6, CW - 12, CH - 12, 40) : g.rect(6, 6, CW - 12, CH - 12); g.fill(); g.lineWidth = 8; g.strokeStyle = "#" + A.col.getHexString(); g.stroke();
      g.fillStyle = "#ffd166"; g.font = "800 64px system-ui, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText((A.no ? A.no + " · " : "") + A.name, 50, 80);
      g.fillStyle = "#fff"; g.font = "600 38px system-ui, sans-serif";
      const st = A.free === true ? "✓ szabad a választott időpontban" : A.free === false ? "✕ foglalt a választott időpontban" : `kb. ${Math.round(A.area)} m² · ${A.lv ? "emelet" : "földszint"}`;
      g.fillText(A.lock ? "A tulajdonos saját lakása – nem foglalható" : st, 50, 150);
      const bt = (x, w, label, on, fn) => { btns.push({ x, y: 220, w, h: 150, fn }); g.fillStyle = on ? "#ffd166" : "rgba(255,255,255,.14)"; g.beginPath(); g.roundRect ? g.roundRect(x, 220, w, 150, 30) : g.rect(x, 220, w, 150); g.fill(); g.lineWidth = 4; g.strokeStyle = "rgba(255,255,255,.4)"; g.stroke(); g.fillStyle = on ? "#0b2f5e" : "#fff"; g.font = "800 46px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(label, x + w / 2, 296); };
      if (A.lock) bt(50, CW - 100, "‹ Bezárás", false, () => maqDeselect());
      else { bt(50, 430, "👁 Belépés", false, () => maqEnter(A)); bt(500, 450, "📅 Foglalás", true, () => maqBook(A)); }
    });
    const card = mesh(new THREE.PlaneGeometry(.4, .4 * CH / CW), basic({ map: tx, transparent: true, depthTest: false, depthWrite: false }), MAQ.stand);
    card.renderOrder = 996; card.position.set(0, .36, 0);
    card.userData.xr = { click: (h) => { if (!h || !h.uv) return; const x = h.uv.x * CW, y = (1 - h.uv.y) * CH; const b = btns.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); if (b) b.fn(); } };
    T.xr.extra.add(card); W.objs.push(card); MAQ.card = card;
  }
  function maqDeselect() { if (MAQ.sel && MAQ.sel.label) MAQ.sel.label.visible = false; MAQ.sel = null; if (MAQ.card) { T.xr.extra.delete(MAQ.card); MAQ.card.visible = false; } }
  function maqEnter(A) {
    if (A.lock) return;
    const best = (T.GROUPS.find((q) => q.id === A.id) || {}).entry;
    W.close(() => T.go(best));
  }
  function maqBook(A) { if (A.lock) return; W.close(() => { try { T.book(A.id); } catch (e) { if (window.ZephyrBooking) ZephyrBooking.open({ apt: A.id }); } }); }
  function maqTick(dt) {
    Object.values(MAQ.apts).forEach((A) => {
      const show = A.lv === 0 || MAQ.upper;
      MAQ.lv[A.lv].visible = A.lv === 0 || MAQ.upper;
      const base = A.free === true ? .2 : A.free === false ? .16 : 0, tgt = A.hov || MAQ.sel === A ? .34 : base;
      if (A.free === true) A.gm.color.set("#3fb37f"); else if (A.free === false) A.gm.color.set("#e5262f"); else A.gm.color.copy(A.col);
      A.gm.opacity += (tgt - A.gm.opacity) * Math.min(1, dt * 8); A.glow.visible = show;
    });
    MAQ.roof.visible = MAQ.roofOn && MAQ.upper;
    /* tetővel: teljes magasságú homlokzat (ablakokkal); tető nélkül: metszett „babaház” nézet */
    [0, 1].forEach((lv) => { const tall = MAQ.roofOn || (lv === 0 && MAQ.upper); MAQ.shell[lv].forEach((m) => (m.visible = m.userData.tall === tall)); MAQ.tallBits[lv].forEach((m) => (m.visible = tall)); });
    if (!T.inVR && !MAQ.drag && MAQ.auto !== false) MAQ.turn.rotation.y += dt * .05;
    MAQ.lt = (MAQ.lt || 0) + dt; if (MAQ.lt > .25) { MAQ.lt = 0; maqLight(); }
  }
  const hhmm = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
  function sunLine() { const p = MAQ.sunInfo || { az: 0, el: 0 }; return p.el < 0 ? "a nap már lement" : `a nap ${["É", "ÉK", "K", "DK", "D", "DNy", "Ny", "ÉNy"][Math.round(p.az / 45) % 8]} felől, ${Math.round(p.el)}°`; }
  function maqPanel(P) {
    P.title("A ház makettje", "a hivatalos tervrajz szerint · M 1:60");
    P.row(0, "Csippents egy lakásra: belépés vagy foglalás", "#ffffff");
    P.row(1, MAQ.dates ? "Zöld = szabad, piros = foglalt a napjaidon" : "Forgatás: fogd meg a talapzatot és húzd", "#ffd166");
    P.row(2, `Fény: ${MAQ.day.slice(5).replace("-", ".")}. ${hhmm(MAQ.hour)} – ${sunLine()}`, "#ffd166");
    P.buttons([[MAQ.upper ? "Emelet ki" : "Emelet be", () => { MAQ.upper = !MAQ.upper; }], [MAQ.roofOn ? "Tető ki" : "Tető be", () => { MAQ.roofOn = !MAQ.roofOn; }],
      ["☀ −1 ó", () => { MAQ.hour = Math.max(5, MAQ.hour - 1); maqLight(); }], ["☀ +1 ó", () => { MAQ.hour = Math.min(21, MAQ.hour + 1); maqLight(); }], ["‹ Vissza", () => W.close()]]);
  }
  function maqHud(H) {
    H.title("A ház makettje", "A hivatalos tervrajz szerint · koppints egy lakásra: belépés vagy foglalás");
    H.buttons([[MAQ.upper ? "Emelet elrejtése" : "Emelet mutatása", () => { MAQ.upper = !MAQ.upper; }], [MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }],
      ["☀ korábban", () => { MAQ.hour = Math.max(5, MAQ.hour - 1); maqLight(); }], ["☀ később", () => { MAQ.hour = Math.min(21, MAQ.hour + 1); maqLight(); }],
      ["⟲", () => { MAQ.auto = false; MAQ.turn.rotation.y -= .4; }], ["⟳", () => { MAQ.auto = false; MAQ.turn.rotation.y += .4; }]]);
    H.hint(`Fény: ${MAQ.day.replace(/-/g, ".")}. ${hhmm(MAQ.hour)} – ${sunLine()}${MAQ.dates ? " · zöld = szabad, piros = foglalt" : ""}`);
  }
