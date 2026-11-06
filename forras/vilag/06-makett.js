
  /* =================================================================== 3. A HÁZ MAKETTJE – varázslatos helyszínen, asztaltól életnagyságig (2026. nov. 6., 2. változat)
     • Helyszín (2026. nov. 6-tól): regatta-bója a Balaton közepén, körülötte életnagyságú verseny és jelenetek (06d); a part ~260 m-re (06c) – valódi napállás szerinti égbolt, a túlpart nevezetességeivel, élővilággal.
     • A ház (06b): csak a Zephyr épülete (egy téglatest, 6,0 × 22,2 m), a hivatalos tervrajz szerint, valódi ablaknyílásokkal, berendezve.
     • Méretek: 1:100 · 1:60 · 1:40 az asztalon → 1:20 · 1:10 a stég padlóján → 1:1 ÉLETNAGYSÁG (a ház a parton áll, besétálhatsz).
       Kézzel: két kézzel csippents és húzd szét / össze (mint egy fotót a telefonon); egy kézzel a makett fölött csippentve körbeforgatod. A csuklómenüben (nézz a bal csuklódra) minden beállítás.
     • Életnagyságban: csippents a földre / padlóra → odalépsz; ⬆/⬇ az emeletre; a lakásokban fénylő 📷 gömbök → a valódi 360°-os fotó.
     • Kiválasztott lakás: „Belépés” (a valódi fotókba) vagy „Foglalás” (térbeli foglalópanel, a lakás előre kijelölve). */
  const MAQ = {};
  const FLOOR_H = 2.85, WALL = .3, PART = .25, IN_W = 5.4, OUT_W = IN_W + 2 * WALL;
  /* a ház koordinátái méterben: x = kelet felé (a parkoló oldala, 75°), z = az utcától hátrafelé (165° felé), y = fel */
  const Z_A = WALL, Z_HALL = Z_A + 6.2 + PART, Z_B = Z_HALL + 4.0 + PART, Z_C = Z_B + 4.35 + PART, Z_END = Z_C + 6.41 + WALL;
  const APTCOL = { korvett: "#e2483d", dingi: "#3fb37f", fregatt: "#3d8fe2", kaloz: "#9b6be2", schooner: "#2bb3c0", kadett: "#d9a441" };
  const UNITS = {
    korvett:  { lvl: 0, map: (x, y) => [WALL + x, Z_A + y] },
    fregatt:  { lvl: 1, map: (x, y) => [WALL + x, Z_A + y] },
    dingi:    { lvl: 0, map: (x, y) => [WALL + y, Z_B + (4.35 - x)] },
    kaloz:    { lvl: 1, map: (x, y) => [WALL + y, Z_B + (4.10 - x)] },
    schooner: { lvl: 0, map: (x, y) => [WALL + x, Z_C + y] },
    kadett:   { lvl: 1, map: (x, y) => [WALL + x, Z_C + y] }
  };
  function planOf(id) { const P = T.PLANS; const g = T.GROUPS.find((q) => q.id === id) || {}; return P[g.plan] || P.elso; }
  function mapRect(U, x, y, w, h) { const a = U.map(x, y), b = U.map(x + w, y + h); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }
  const SCALES = [1 / 100, 1 / 60, 1 / 40, 1 / 25, 1 / 15, 1 / 10, 1];
  const SCALE_TXT = (s) => s >= .99 ? "életnagyság" : "1:" + Math.round(1 / s);
  const TABLE_Y = .78, USER_Z = 1.3, TABLE_R = .82;
  const EYE2D = 1.6;
  const _q = new THREE.Vector3(), _q2 = new THREE.Vector3(), _q3 = new THREE.Vector3(), _q4 = new THREE.Vector3();

  /* a fej helye és iránya a világban: az A-Frame kamerája (VR-ben a three.js ide másolja a fej pózát a rig-en belül) – így a rig mozgatása/forgatása után is pontos */
  function headWorld(v) { v = v || new THREE.Vector3(); try { T.camObj().updateWorldMatrix(true, false); T.camObj().getWorldPosition(v); } catch (e) { v.set(0, 1.6, 0); } return v; }
  function headYaw() { const d = new THREE.Vector3(); try { T.camObj().updateWorldMatrix(true, false); T.camObj().getWorldDirection(d); } catch (e) { return 0; } return Math.atan2(-d.x, -d.z); }
  function faceTo(target) { const rig = T.rig.object3D; if (!T.inVR) { faceYaw(target); return; } rig.rotation.y += wrapA(target - headYaw()); rig.updateMatrixWorld(true); }

  function buildMaquette() {
    const root = W.root;
    const rig = T.rig.object3D;
    Object.keys(MAQ).forEach((k) => delete MAQ[k]);   /* tiszta lap minden megnyitáskor */
    MAQ.rig0 = { p: rig.position.clone(), ry: rig.rotation.y };
    { const r0 = T.sceneEl.renderer; MAQ.shadowWas = r0.shadowMap.enabled; MAQ.shadowType = r0.shadowMap.type; MAQ.shadowAuto = r0.shadowMap.autoUpdate; MAQ.envWas = T.sceneEl.object3D.environment || null; MAQ.envIntWas = T.sceneEl.object3D.environmentIntensity; }
    /* az A-Frame alapfényei (erős szórt fény) kikapcsolva – a makett-világban a napszak saját fényei világítanak */
    MAQ.sceneLights = []; T.sceneEl.object3D.children.forEach((o) => { if (o.isLight && o.visible) { o.visible = false; MAQ.sceneLights.push(o); } });
    T.sceneEl.object3D.traverse((o) => { if (o.isLight && o.visible && !MAQ.sceneLights.includes(o) && (!W.root || !W.root.getObjectById(o.id))) { o.visible = false; MAQ.sceneLights.push(o); } });
    /* a bezárás-kezelő legelöl: ha a felépítés közben hiba lenne, akkor is minden visszaáll */
    W.onClose = () => {
      try { const rr2 = T.sceneEl.renderer; rr2.shadowMap.enabled = MAQ.shadowWas; rr2.shadowMap.type = MAQ.shadowType; rr2.shadowMap.autoUpdate = MAQ.shadowAuto !== false; T.sceneEl.object3D.environment = MAQ.envWas; if (MAQ.envIntWas != null) T.sceneEl.object3D.environmentIntensity = MAQ.envIntWas; } catch (e) {}
      try { const rg = T.rig.object3D; rg.position.copy(MAQ.rig0.p); if (T.inVR) rg.rotation.y = MAQ.rig0.ry; } catch (e) {}
      (MAQ.sceneLights || []).forEach((o) => { o.visible = true; });
      try { showTip(null); } catch (e) {}
      try { if (ENV.lights && ENV.lights.sun) ENV.lights.sun.dispose(); } catch (e) {}   /* az árnyéktérkép GPU-memóriája */
      try { bjDispose(); } catch (e) {} try { envDispose(); } catch (e) {}
      Object.keys(MAQ).forEach((k) => delete MAQ[k]);
    };
    const floorY = T.inVR ? rig.position.y : rig.position.y - EYE2D;
    /* ---------- a helyszín ---------- */
    buildMagicWorld(root, floorY);
    const env = ENV.env, site = ENV.site;
    /* elhelyezés: a felhasználó a stég déli részén áll (site: 0, 0, 0,95), a tó (345°) felé néz */
    const yaw = T.inVR ? headYaw() : T.camYaw(); env.rotation.y = yaw - 15 * D2R; env.position.set(0, floorY, 0); env.updateMatrixWorld(true);
    const h = headWorld(new THREE.Vector3()), p = site.localToWorld(new THREE.Vector3(0, 0, USER_Z));
    env.position.x += h.x - p.x; env.position.z += h.z - p.z; env.updateMatrixWorld(true);
    MAQ.floorY = floorY;

    /* ---------- az asztal (tölgy, sárgaréz berakással) ---------- */
    const table = new THREE.Group(); site.add(table); MAQ.table = table;
    const oak = std({ map: txPlanks("oak", "#7a5534", "#94683f", 7), roughness: .45 }), brass = std({ color: "#c9a24a", roughness: .28, metalness: .9 });
    const tt = mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R - .02, .05, 72), oak, table); tt.position.y = TABLE_Y - .025; tt.receiveShadow = true; tt.castShadow = true;
    const ring = mesh(new THREE.TorusGeometry(TABLE_R - .04, .008, 6, 120), brass, table); ring.rotation.x = Math.PI / 2; ring.position.y = TABLE_Y + .001;
    const col = mesh(new THREE.CylinderGeometry(.07, .1, TABLE_Y - .1, 20), std({ color: "#4a3221", roughness: .5 }), table); col.position.y = (TABLE_Y - .1) / 2 + .06; col.castShadow = true;
    [0, 1, 2, 3].forEach((k) => { const a = k / 4 * TAU + Math.PI / 4; const f = mesh(new THREE.BoxGeometry(.06, .06, .42), std({ color: "#4a3221", roughness: .5 }), table); f.position.set(Math.cos(a) * .2, .04, Math.sin(a) * .2); f.rotation.y = -a + Math.PI / 2; });
    const plate = canvasTex(1024, 200, (g) => { const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, "#e2c46a"); gr.addColorStop(1, "#a8822e"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 200);
      g.fillStyle = "#2a1c0c"; g.font = "800 66px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ZEPHYR APARTMANHÁZ", 512, 72); g.font = "500 36px Georgia, serif"; g.fillText("Zamárdi · Gáspár András utca 58. · a hivatalos tervrajz szerint", 512, 148); });
    const pl = mesh(new THREE.PlaneGeometry(.42, .082), std({ map: plate, roughness: .35, metalness: .6 }), table); pl.position.set(0, TABLE_Y - .026, TABLE_R + .005); pl.rotation.x = -.0;

    /* ---------- a makett: tartó → forgató → modell ---------- */
    const holder = new THREE.Group(); site.add(holder); MAQ.holder = holder;
    const turn = new THREE.Group(); holder.add(turn); MAQ.turn = turn;
    const model = new THREE.Group(); turn.add(model); MAQ.model = model;
    const H = buildHouse(model); MAQ.H = H;
    const S = H.site; MAQ.C = new THREE.Vector3((S.SX0 + S.SX1) / 2, 0, (S.SZ0 + S.SZ1) / 2); MAQ.R = Math.hypot(S.SX1 - S.SX0, S.SZ1 - S.SZ0) / 2;
    /* diófa talapzat a telek alatt (makettméretekben) – megfogva forgatható */
    const base = new THREE.Group(); turn.add(base); MAQ.base = base;
    const wood = std({ color: "#5b3a22", roughness: .42 });
    const bw = S.SX1 - S.SX0, bd = S.SZ1 - S.SZ0;
    const bm = mesh(new THREE.BoxGeometry(bw + 1.6, 2.6, bd + 1.6), wood, base); bm.position.y = -1.3; bm.receiveShadow = true; bm.castShadow = true;
    const lip = mesh(new THREE.BoxGeometry(bw + 1.9, .5, bd + 1.9), brass, base); lip.position.y = -2.4;
    MAQ.baseHit = bm;
    bm.userData.xr = { down: (hh, src) => { if (MAQ.two) return; MAQ.drag = { a: turn.rotation.y, d: src.d.clone() }; MAQ.auto = false; },
      drag: (src) => { if (!MAQ.drag || MAQ.two) return; const d0 = MAQ.drag.d, d1 = src.d; turn.rotation.y = MAQ.drag.a + wrapA(Math.atan2(d1.x, d1.z) - Math.atan2(d0.x, d0.z)) * 4; },
      up: () => { MAQ.drag = null; } };
    T.xr.extra.add(bm); W.objs.push(bm);
    /* iránytű a talapzat sarkán (a modellel együtt fordul) */
    const rose = canvasTex(512, 512, (g) => {
      g.translate(256, 256); g.strokeStyle = "#c9a24a"; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, 200, 0, TAU); g.stroke();
      for (let k = 0; k < 16; k++) { g.save(); g.rotate(k / 16 * TAU); g.fillStyle = k % 4 ? "#c9a24a" : "#f3efe6"; g.fillRect(-3, -200, 6, k % 4 ? 18 : 30); g.restore(); }
      g.fillStyle = "#e5262f"; g.beginPath(); g.moveTo(0, -180); g.lineTo(40, 0); g.lineTo(-40, 0); g.closePath(); g.fill();
      g.fillStyle = "#f3efe6"; g.beginPath(); g.moveTo(0, 180); g.lineTo(40, 0); g.lineTo(-40, 0); g.closePath(); g.fill();
      g.fillStyle = "#f3efe6"; g.font = "900 84px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("É", 0, -232);
    });
    const ro = mesh(new THREE.PlaneGeometry(4.2, 4.2), basic({ map: rose, transparent: true, depthWrite: false }), base);
    ro.rotation.set(-Math.PI / 2, 0, -15 * D2R); ro.position.set(S.SX1 - 1.2 - MAQ.C.x, .03, S.SZ0 + 13 - MAQ.C.z); ro.renderOrder = 3;

    /* ---------- lakásonkénti kiemelés és választás ---------- */
    MAQ.apts = H.apts;
    Object.values(MAQ.apts).forEach((A) => {
      const c = new THREE.Color(APTCOL[A.id] || "#999");
      const gm = basic({ color: c, transparent: true, opacity: 0, depthWrite: false });
      const glow = mesh(new THREE.BoxGeometry(A.bb[2] - A.bb[0] + .2, FLOOR_H - .3, A.bb[3] - A.bb[1] + .2), gm, H.lv[A.lv]);
      glow.position.set((A.bb[0] + A.bb[2]) / 2, (FLOOR_H - .3) / 2, (A.bb[1] + A.bb[3]) / 2); glow.renderOrder = 4;
      A.glow = glow; A.gm = gm; A.col = c;
      glow.userData.xr = { hover: (on) => maqHover(A, on), click: () => maqSelect(A) };
      T.xr.extra.add(glow); W.objs.push(glow);
    });
    maqAvail();
    /* esti fénygömbök a mennyezeti lámpák körül (csak életnagyságban) */
    MAQ.lampHalo = [0, 1].map((lv) => { const pts = H.floors.filter((f) => f.lv === lv).map((f) => new THREE.Vector3((f.q[0] + f.q[2]) / 2, FLOOR_H - .32, (f.q[1] + f.q[3]) / 2)); const P = glowPoints(H.lv[lv], pts, .7, "#ffcf8a", .55); P.visible = false; return P; });
    /* életnagyságban a lakások neve lebeg a szobákban (rámutatva / csippentve: belépés vagy foglalás) */
    Object.values(MAQ.apts).forEach((A) => {
      const L = labelSprite([(A.no ? A.no + " · " : "") + A.name + " Apartman", A.lock ? "a tulajdonos lakása" : "csippents: fotók · foglalás"], { size: .9, fs: 50 });
      L.position.set((A.bb[0] + A.bb[2]) / 2, 2.25, (A.bb[1] + A.bb[3]) / 2); H.lv[A.lv].add(L); L.visible = false; L.material.depthTest = true; L.renderOrder = 8; A.lifeL = L;
      L.userData.xr = { hover: (on) => L.scale.multiplyScalar(on ? 1.1 : 1 / 1.1), click: () => maqSelect(A, true) };
      T.xr.extra.add(L); W.objs.push(L);
    });
    /* ---------- életnagyságban: 360°-os fotópontok és lépés (teleport) ---------- */
    MAQ.orbs = [];
    const orbTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 120); gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(.35, "rgba(255,209,102,.9)"); gr.addColorStop(1, "rgba(255,180,60,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      g.fillStyle = "#0b2f5e"; g.font = "800 92px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("360°", 128, 132); });
    H.spots.forEach((sp) => {
      const o = new THREE.Sprite(basic({ map: orbTex, transparent: true, depthWrite: false })); o.scale.set(.3, .3, 1); o.position.set(sp.x, 1.35, sp.z); H.lv[sp.lv].add(o); o.visible = false; o.renderOrder = 6;
      o.userData.xr = { hover: (on) => { o.scale.setScalar(on ? .42 : .3); if (on) showTip(o, "📷 " + sp.n + " – valódi 360°-os fotó", "Csippents rá: belépsz a fotóba"); else showTip(null); }, click: () => { W.close(() => T.go(sp.id)); } };
      T.xr.extra.add(o); W.objs.push(o); MAQ.orbs.push(o);
    });
    /* teleport-felületek: a telek, a két szint padlója (a ház alapterületén + teraszok) és a part */
    const tpM = basic({ visible: false });
    const tp0 = mesh(new THREE.PlaneGeometry(S.SX1 - S.SX0, S.SZ1 - S.SZ0), tpM, model); tp0.rotation.x = -Math.PI / 2; tp0.position.set(MAQ.C.x, .09, MAQ.C.z);
    const tp1 = mesh(new THREE.PlaneGeometry(OUT_W, Z_END + 4.75), tpM, model); tp1.rotation.x = -Math.PI / 2; tp1.position.set(OUT_W / 2, FLOOR_H + .02, (Z_END + 3.3 - 1.45) / 2);
    MAQ.tp = [tp0, tp1];
    const lifeOnly = () => MAQ.mode === "life";   /* a kézi mozgás íve csak életnagyságban landolhat rajtuk */
    [tp0, tp1].forEach((m, i) => { m.userData.tp = lifeOnly; m.userData.xr = { click: (hit) => { if (hit && hit.point) teleport(hit.point, i); } }; T.xr.extra.add(m); W.objs.push(m); });
    ENV.land.userData.xr = { click: (hit) => { if (MAQ.mode === "life" && hit && hit.point) teleport(hit.point, 0); } }; ENV.land.userData.tp = lifeOnly;
    /* távcső: a látnivalók feliratai */
    ENV.telHit.userData.xr = { hover: (on) => { if (on) showTip(ENV.telescope, "🔭 Távcső", "Csippents rá: a Balaton látnivalói a láthatáron"); else showTip(null); }, click: () => toggleSights() };
    T.xr.extra.add(ENV.telHit); W.objs.push(ENV.telHit);

    /* ---------- fény, árnyék ---------- */
    const r = T.sceneEl.renderer; r.shadowMap.enabled = true; r.shadowMap.type = T.inVR ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    /* az árnyéktérkép csak akkor számolódik újra, ha valami változott (nap, méret, forgatás, tető…) – Quest 2-n ez sokat számít */
    r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = true; MAQ.shSig = "";
    const sun = ENV.lights.sun; sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0005; sun.shadow.normalBias = .02;

    /* ---------- áttűnés (életnagyságba lépéskor) ---------- */
    const fm = basic({ color: "#fff1cf", transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false });
    MAQ.fade = mesh(new THREE.SphereGeometry(.5, 16, 12), fm, root); MAQ.fade.renderOrder = 1000; MAQ.fade.visible = false;

    /* ---------- kezdőállapot: aranyóra, 1:60 az asztalon, az utcafront felénk ---------- */
    MAQ.day = (T.sunDefaultDay && T.sunDefaultDay()) || "2027-07-15";
    MAQ.st = sunTimesOf(MAQ.day);
    MAQ.hour = MAQ.hourT = MAQ.st.set ? MAQ.st.set - .75 : 19.5;
    MAQ.preset = 4;
    envSetTime(MAQ.day, MAQ.hour);
    MAQ.mode = "table"; MAQ.s = MAQ.sT = 1 / 40; MAQ.upper = true; MAQ.roofOn = false; MAQ.sel = null; MAQ.auto = undefined; MAQ.level = 0; MAQ.sights = false;
    turn.rotation.y = Math.PI + .35;
    applyPlacement(true);
    if (!T.inVR) { const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject) lc.pitchObject.rotation.x = -.62; }
    audioStart({ water: .03, wind: .012 });
    /* VR-ben az első alkalommal: rövid kézmozdulat-súgó (csippentésre vagy 25 mp után eltűnik) */
    if (T.inVR) {
      const CW = 1200, CH = 560;
      const tx = canvasTex(CW, CH, (g) => {
        const bg = g.createLinearGradient(0, 0, 0, CH); bg.addColorStop(0, "rgba(16,56,104,.95)"); bg.addColorStop(1, "rgba(7,28,58,.95)");
        g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(6, 6, CW - 12, CH - 12, 46) : g.rect(6, 6, CW - 12, CH - 12); g.fill(); g.lineWidth = 7; g.strokeStyle = "#ffd166"; g.stroke();
        g.fillStyle = "#ffd166"; g.font = "800 58px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Így irányítod a kezeddel", CW / 2, 70);
        [["⌚", "Nézz az órádra", "a bal csuklón: csuklómenü"], ["🤏", "Csippents a makett fölött", "és húzd körbe: forog"], ["🤏🤏", "Két kéz csippent", "széthúzva nő a ház"]].forEach(([ic, a1, a2], i) => {
          const x = 200 + i * 400; g.fillStyle = "rgba(255,255,255,.1)"; g.beginPath(); g.roundRect ? g.roundRect(x - 180, 130, 360, 330, 30) : g.rect(x - 180, 130, 360, 330); g.fill();
          g.font = "100px system-ui, sans-serif"; g.fillStyle = "#fff"; g.fillText(ic, x, 240); g.font = "800 36px system-ui, sans-serif"; g.fillText(a1, x, 360); g.font = "600 30px system-ui, sans-serif"; g.fillStyle = "#cfe3f5"; g.fillText(a2, x, 410); });
        g.fillStyle = "#fff"; g.font = "600 30px system-ui, sans-serif"; g.fillText("Csippents erre a táblára, és eltűnik", CW / 2, 510);
      });
      const hc = mesh(new THREE.PlaneGeometry(.9, .9 * CH / CW), basic({ map: tx, transparent: true, depthTest: false, depthWrite: false }), root); hc.renderOrder = 997;
      placeFacing(hc, 1.0, .12, 0); MAQ.help = hc; MAQ.helpT = 25;
      hc.userData.xr = { click: () => { hc.visible = false; T.xr.extra.delete(hc); } }; T.xr.extra.add(hc); W.objs.push(hc);
    }
    W.maq = { MAQ, ENV, BJ, goLife, goTable, bjStart, bjNext, setPreset, stepScale, nudgeHour, toggleSights };   /* tesztekhez */
    return { tick: maqTick, panel: maqPanel, hud: maqHud, wrist: maqWrist };
  }
  function sunTimesOf(ymd) {
    let rise = null, set = null, prev = -90;
    for (let hh = 3; hh <= 23; hh += 1 / 30) { let e = -90; try { e = T.sunPos(ymd, hh).el; } catch (x) { return { rise: 5.5, set: 20.5 }; } if (prev < -.833 && e >= -.833 && rise == null) rise = hh; if (prev >= -.833 && e < -.833) set = hh; prev = e; }
    return { rise, set };
  }
  const PRESETS = [["Hajnal", (s) => (s.rise || 5.2) + .25], ["Reggel", (s) => (s.rise || 5.2) + 2.2], ["Dél", () => 13], ["Délután", () => 16.5], ["Aranyóra", (s) => (s.set || 20.5) - .75],
    ["Naplemente", (s) => (s.set || 20.5) - .05], ["Kék óra", (s) => (s.set || 20.5) + .45], ["Éjszaka", () => 23.3]];
  function setPreset(i) { MAQ.preset = (i + PRESETS.length) % PRESETS.length; MAQ.hourT = PRESETS[MAQ.preset][1](MAQ.st); W.panelDirty = 1; }
  function nudgeHour(d) { MAQ.hourT = clamp(MAQ.hourT + d, 4, 23.9); W.panelDirty = 1; }

  /* ---------- méret és elhelyezés ---------- */
  function applyPlacement(now) {
    const s = MAQ.s, life = MAQ.mode === "life";
    const H = MAQ.H, model = MAQ.model;
    model.scale.setScalar(s);
    if (life) { MAQ.holder.position.copy(LIFE_POS); MAQ.turn.rotation.y = 0; model.position.set(0, 0, 0); }
    else {
      model.position.set(-MAQ.C.x * s, 0, -MAQ.C.z * s);
      MAQ.base.scale.setScalar(s); MAQ.base.position.set(0, 0, 0);
      const onTable = s <= 1 / 30;
      const R = MAQ.R * s;
      if (onTable) MAQ.holder.position.set(0, TABLE_Y + 2.6 * s + .002, 0);
      else MAQ.holder.position.set(0, .002 + 2.6 * s, USER_Z - .75 - R);
    }
    MAQ.base.visible = !life;
    /* árnyékkamera a mérethez */
    const sc = ENV.lights.sun.shadow.camera, half = life ? 20 : MAQ.R * s * 1.05 + .25;
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = .05; sc.far = life ? 160 : 40; sc.updateProjectionMatrix();
    MAQ.shadowD = life ? 70 : Math.max(3, half * 4);
    /* címkék mérete */
    Object.values(MAQ.apts).forEach((A) => { if (A.label) { const k = 7.5 / Math.sqrt(60 * s); A.label.scale.set(k, k * A.label.userData.ar, 1); } });
  }
  function setScale(s, animate) {
    if (MAQ.mode === "life") return;
    MAQ.sT = clamp(s, 1 / 150, 1 / 8); if (!animate) { MAQ.s = MAQ.sT; applyPlacement(); }
    W.panelDirty = 1; wristRedraw();
  }
  function stepScale(dir) {
    if (MAQ.mode === "life") { if (dir < 0) goTable(); return; }
    const cur = MAQ.sT; let i = SCALES.findIndex((q) => q > cur * 1.02); if (i < 0) i = SCALES.length;
    if (dir > 0) { const nx = SCALES[i]; if (nx >= .99) goLife(); else if (nx) setScale(nx, true); }
    else { let j = SCALES.length - 1; while (j >= 0 && SCALES[j] >= cur * .98) j--; if (j >= 0) setScale(SCALES[j], true); }
  }
  /* életnagyság: áttűnés, a ház a parton, mi az utcán a kapu előtt, a ház felé fordulva */
  function goLife() {
    if (MAQ.mode === "life" || MAQ.fading) return;
    fadeThen(() => {
      MAQ.mode = "life"; MAQ.s = MAQ.sT = 1; MAQ.roofOn = true; MAQ.upper = true; MAQ.level = 0; maqDeselect(); applyPlacement(true); lifeTargets(true);
      const site = ENV.site; site.updateMatrixWorld(true);
      /* nézés a ház felé (site +z) */
      const fw = new THREE.Vector3(0, 0, 1).transformDirection(site.matrixWorld); faceTo(Math.atan2(-fw.x, -fw.z));
      const target = site.localToWorld(new THREE.Vector3(LIFE_POS.x + 3.0, 0, LIFE_POS.z - 6.2));   /* az utcán, a kerítés előtt: az egész homlokzat látszik */
      placeUser(target, 0);
      wristRedraw(); W.panelDirty = 1;
    });
  }
  function goTable() {
    if (MAQ.mode !== "life" || MAQ.fading) return;
    fadeThen(() => {
      MAQ.mode = "table"; MAQ.s = MAQ.sT = 1 / 40; MAQ.roofOn = false; MAQ.level = 0; applyPlacement(true); lifeTargets(false);
      const rg = T.rig.object3D; rg.position.copy(MAQ.rig0.p);
      const site = ENV.site; const fw = new THREE.Vector3(0, 0, -1).transformDirection(site.matrixWorld); faceTo(Math.atan2(-fw.x, -fw.z));
      placeUser(site.localToWorld(new THREE.Vector3(0, 0, USER_Z)), -1);
      MAQ.turn.rotation.y = Math.PI + .35; wristRedraw(); W.panelDirty = 1;
    });
  }
  /* a felhasználó (a feje) a megadott pontra kerül; lvl: 0/1 szint (életnagyságban), −1 = a stég */
  function placeUser(pt, lvl) {
    const rg = T.rig.object3D; rg.updateMatrixWorld(true);
    const hw = headWorld(new THREE.Vector3());
    rg.position.x += pt.x - hw.x; rg.position.z += pt.z - hw.z;
    rg.position.y = pt.y + (T.inVR ? 0 : EYE2D);
    if (lvl >= 0) MAQ.level = lvl;
    if (W.panel && !W.panelHidden) setTimeout(() => { try { if (W.active) W.togglePanel(), W.togglePanel(); } catch (e) {} }, 30);
  }
  function teleport(pt, lvl) { if (MAQ.mode !== "life") return; placeUser(pt, lvl); try { flap(.03); } catch (e) {} wristRedraw(); }
  function goLevel(lvl) {
    if (MAQ.mode !== "life") return; const hw = headWorld(new THREE.Vector3()); const y = MAQ.model.localToWorld(new THREE.Vector3(0, lvl ? FLOOR_H : 0, 0)).y;
    placeUser(new THREE.Vector3(hw.x, y, hw.z), lvl); wristRedraw(); W.panelDirty = 1;
  }
  /* életnagyságban a part, a palló és a stég is járható (csippentés = odalépés) */
  function lifeTargets(on) {
    [ENV.land, ENV.walk, ENV.deckTop].forEach((L) => { if (!L) return;
      if (!L.userData.xr) L.userData.xr = { click: (hit) => { if (MAQ.mode === "life" && hit && hit.point) teleport(hit.point, 0); } };
      L.userData.tp = () => MAQ.mode === "life";
      if (on) { T.xr.extra.add(L); if (!W.objs.includes(L)) W.objs.push(L); } else { T.xr.extra.delete(L); W.objs = W.objs.filter((o) => o !== L); } });
  }
  function fadeThen(fn) {
    MAQ.fading = { t: 0, fn, done: false }; MAQ.fade.visible = true;
  }

  /* ---------- foglaltság a választott napokon ---------- */
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

  /* ---------- rámutatás, kiválasztás, kártya ---------- */
  function maqHover(A, on) {
    if (MAQ.mode === "life") return;
    A.hov = on;
    if (!A.label) {
      const cap = (() => { try { const c = ZephyrBooking.vr.cfg(); const a = c && c.apartments.find((q) => q.id === A.id); return a ? a.cap + " fő · " : ""; } catch (e) { return ""; } })();
      A.label = labelSprite([(A.no ? A.no + " · " : "") + A.name, A.lock ? "saját lakás – nem foglalható" : `${cap}kb. ${Math.round(A.area)} m² · csippents rá`], { size: 1, fs: 50 });
      A.label.userData.ar = A.label.scale.y; A.label.position.set((A.bb[0] + A.bb[2]) / 2, FLOOR_H + 2.6, (A.bb[1] + A.bb[3]) / 2); MAQ.H.lv[A.lv].add(A.label);
      applyPlacement();
    }
    A.label.visible = !!on || MAQ.sel === A;
  }
  function placeFacing(obj, dist, dy, side) {
    const hw = headWorld(new THREE.Vector3()), yaw = (T.inVR ? headYaw() : T.camYaw()) + (side || 0);
    obj.position.set(hw.x - Math.sin(yaw) * dist, hw.y + dy, hw.z - Math.cos(yaw) * dist);
    obj.lookAt(hw.x, obj.position.y, hw.z);
  }
  function maqSelect(A, force) {
    if (MAQ.mode === "life" && !force) return;
    if (MAQ.sel && MAQ.sel !== A && MAQ.sel.label) MAQ.sel.label.visible = false;
    MAQ.sel = A; maqHover(A, true);
    if (MAQ.card) { T.xr.extra.delete(MAQ.card); W.objs = W.objs.filter((o) => o !== MAQ.card); if (MAQ.card.parent) MAQ.card.parent.remove(MAQ.card); MAQ.card = null; }
    const CW = 1000, CH = 470, btns = [];
    const tx = canvasTex(CW, CH, (g) => {
      const bg = g.createLinearGradient(0, 0, 0, CH); bg.addColorStop(0, "rgba(16,56,104,.96)"); bg.addColorStop(1, "rgba(7,28,58,.96)");
      g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(6, 6, CW - 12, CH - 12, 44) : g.rect(6, 6, CW - 12, CH - 12); g.fill(); g.lineWidth = 8; g.strokeStyle = "#" + A.col.getHexString(); g.stroke();
      g.fillStyle = "#ffd166"; g.font = "800 66px system-ui, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText((A.no ? A.no + " · " : "") + A.name + " Apartman", 50, 82);
      g.fillStyle = "#fff"; g.font = "600 38px system-ui, sans-serif";
      const st = A.free === true ? "✓ szabad a választott időpontban" : A.free === false ? "✕ foglalt a választott időpontban" : `kb. ${Math.round(A.area)} m² · ${A.lv ? "emelet" : "földszint"}`;
      g.fillText(A.lock ? "A tulajdonos saját lakása – nem foglalható" : st, 50, 152);
      g.fillStyle = "rgba(255,255,255,.75)"; g.font = "500 32px system-ui, sans-serif"; g.fillText("Belépés: a valódi 360°-os fotókba · Foglalás: itt, a térben", 50, 208);
      const bt = (x, w, label, on, fn) => { btns.push({ x, y: 260, w, h: 160, fn }); g.fillStyle = on ? "#ffd166" : "rgba(255,255,255,.14)"; g.beginPath(); g.roundRect ? g.roundRect(x, 260, w, 160, 32) : g.rect(x, 260, w, 160); g.fill(); g.lineWidth = 4; g.strokeStyle = "rgba(255,255,255,.4)"; g.stroke(); g.fillStyle = on ? "#0b2f5e" : "#fff"; g.font = "800 50px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(label, x + w / 2, 342); };
      if (A.lock) bt(50, CW - 100, "‹ Bezárás", false, () => maqDeselect());
      else { bt(50, 290, "👁 Belépés", false, () => maqEnter(A)); bt(360, 360, "📅 Foglalás", true, () => maqBook(A)); bt(740, 210, "✕", false, () => maqDeselect()); }
    });
    const card = mesh(new THREE.PlaneGeometry(.46, .46 * CH / CW), basic({ map: tx, transparent: true, depthTest: false, depthWrite: false }), W.root);
    card.renderOrder = 996; placeFacing(card, .62, -.12, -.32);
    card.userData.xr = { click: (h) => { if (!h || !h.uv) return; const x = h.uv.x * CW, y = (1 - h.uv.y) * CH; const b = btns.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); if (b) b.fn(); } };
    T.xr.extra.add(card); W.objs.push(card); MAQ.card = card;
    try { winch(); } catch (e) {}
  }
  function maqDeselect() { if (MAQ.sel && MAQ.sel.label) MAQ.sel.label.visible = false; MAQ.sel = null; if (MAQ.card) { T.xr.extra.delete(MAQ.card); MAQ.card.visible = false; } }
  function maqEnter(A) { if (A.lock) return; const best = (T.GROUPS.find((q) => q.id === A.id) || {}).entry; W.close(() => T.go(best)); }
  function maqBook(A) { if (A.lock) return; W.close(() => { try { T.book(A.id); } catch (e) { if (window.ZephyrBooking) ZephyrBooking.open({ apt: A.id }); } }); }
  /* lebegő tipp (rámutatáskor) */
  function showTip(obj, t1, t2) {
    if (!obj) { if (MAQ.tip) MAQ.tip.visible = false; return; }
    if (!MAQ.tip) { MAQ.tip = labelSprite(["", ""], { size: .34, fs: 46, w: 900 }); W.root.add(MAQ.tip); }
    MAQ.tip.userData.set([t1, t2 || ""]); MAQ.tip.visible = true;
    const p = obj.getWorldPosition(new THREE.Vector3()), hw = headWorld(new THREE.Vector3()); const d = p.clone().sub(hw); const L = Math.min(d.length(), 1.2); d.normalize();
    MAQ.tip.position.copy(hw).addScaledVector(d, L * .8); MAQ.tip.position.y += .12;
  }

  /* ---------- a Balaton látnivalói (a távcsőnél / a csuklómenüben) ---------- */
  const SIGHTS = [
    [296, .9, "Tihanyi Bencés Apátság", "5,5 km · 1055-ben alapította I. András", "Az alapítólevél őrzi a legrégebbi magyar mondattöredéket. Barokk templom két toronnyal, csodás kilátás a tóra."],
    [302, 1.6, "Tihany · levendulamezők", "6 km · júniusban–júliusban lilába borul", "Levendulaszüret, Levendula Ház Látogatóközpont; a félsziget közepén a Belső-tó (vulkáni kráter) és a Barátlakások."],
    [287, .45, "Szántód–Tihany komp", "4,4 km · a legrövidebb átkelés", "Kb. 10 perc alatt visz át a túlpartra – Tihany kapuja."],
    [325, .8, "Balatonfüred", "8,5 km · Tagore sétány, szívkórház", "Vitorláskikötő, Anna-bál, a reformkori fürdőváros – a Balaton „fővárosa”."],
    [254.6, .75, "Badacsony", "37 km · tanúhegy, bazaltorgonák", "Koporsó alakú vulkáni hegy, borvidék, Kisfaludy-ház; mellette a Gulács, a Szent György-hegy és Szigliget vára."],
    [181.5, 2.9, "Kőhegyi kilátó (Zamárdi)", "3 km · a ház mögötti dombon", "Fehér kilátótorony a Kőhegyen: az egész tó és a Tihanyi-félsziget a lábad előtt."],
    [84, .8, "Siófok", "7 km · Petőfi sétány, víztorony", "Pezsgő üdülőváros szabadstrandokkal, a „magyar tenger fővárosa”."]
  ];
  function toggleSights() {
    MAQ.sights = !MAQ.sights;
    if (!MAQ.sightL) {
      MAQ.sightL = SIGHTS.map(([b, e, n, l1, l2]) => {
        const sp = labelSprite([n, l1], { size: 46, fs: 52, w: 980 }); const R = 330, a = b * D2R; sp.position.set(Math.sin(a) * R, WATER_Y + Math.tan(e * D2R) * R + 16, -Math.cos(a) * R); ENV.env.add(sp);
        const pin = mesh(new THREE.CylinderGeometry(.5, .5, 12, 6), basic({ color: "#ffd166", transparent: true, opacity: .8 }), ENV.env); pin.position.copy(sp.position); pin.position.y -= 10;
        sp.userData.xr = { hover: (on) => sp.scale.multiplyScalar(on ? 1.12 : 1 / 1.12), click: () => { sp.userData.set([n, l2.length > 52 ? l2.slice(0, 52) + "…" : l2]); setTimeout(() => sp.userData.set([n, l1]), 6000); } };
        T.xr.extra.add(sp); W.objs.push(sp); return [sp, pin];
      });
    }
    MAQ.sightL.forEach(([sp, pin]) => { sp.visible = pin.visible = MAQ.sights; });
    W.panelDirty = 1; wristRedraw();
  }

  /* ---------- képkocka ---------- */
  function maqTick(dt) {
    const life = MAQ.mode === "life";
    /* méret simítása */
    if (!life && Math.abs(MAQ.s - MAQ.sT) > 1e-6) { MAQ.s = Math.exp(lerp(Math.log(MAQ.s), Math.log(MAQ.sT), Math.min(1, dt * 6))); if (Math.abs(MAQ.s / MAQ.sT - 1) < .002) MAQ.s = MAQ.sT; applyPlacement(); }
    /* asztal: kisebb méreteknél látszik, nagyobbaknál a stégbe süllyed */
    const tWant = !life && MAQ.s <= 1 / 30 ? 0 : -1.0; MAQ.table.position.y += (tWant - MAQ.table.position.y) * Math.min(1, dt * 5); MAQ.table.visible = MAQ.table.position.y > -.95;
    /* két kézzel nagyítás: csippents mindkét kezeddel, és húzd szét / össze */
    const X = T.xr, pl = X.pinch || {};
    if (T.inVR && pl.left && pl.right && X.src.left && X.src.right && X.src.left.o && X.src.right.o) {
      const d = X.src.left.o.distanceTo(X.src.right.o);
      if (!MAQ.two) { MAQ.two = { d0: Math.max(.05, d), s0: life ? 1 / 8 : MAQ.s }; MAQ.drag = null; }
      else { const want = MAQ.two.s0 * Math.pow(d / MAQ.two.d0, 1.6);
        if (life) { if (want < 1 / 8 * .55) { MAQ.two = null; goTable(); } }
        else if (want >= 1 / 8.2 && !MAQ.fading) { MAQ.two = null; goLife(); }
        else setScale(want, false); }
    } else MAQ.two = null;
    /* KÉZZEL FORGATÁS (2026. nov. 6.): nyúlj a makett fölé (vagy a talapzat széléhez), csippents, és húzd körbe a kezed – a makett vele fordul,
       mint egy forgótányér; elengedve kicsit tovább pörög és lelassul. Két kézzel továbbra is nagyítás. */
    if (T.inVR && !life && !MAQ.two) {
      const cw = MAQ.holder.getWorldPosition(_q4), Rw = Math.max(.25, MAQ.R * MAQ.s * 1.15);
      ["right", "left"].forEach((h) => {
        const S0 = X.src && X.src[h]; if (!S0) return; const p = S0.tip || S0.o; if (!p) return;
        const dx = p.x - cw.x, dz = p.z - cw.z, r = Math.hypot(dx, dz), ang = Math.atan2(dx, dz);
        const G = MAQ.grab;
        if (pl[h] && !G && !MAQ.drag && r < Rw && r > .03 && p.y > cw.y - .25 && p.y < cw.y + Math.max(.45, MAQ.R * MAQ.s * .6)) { MAQ.grab = { h, a0: ang, r0: MAQ.turn.rotation.y, last: ang, v: 0 }; MAQ.auto = false; MAQ.spinV = 0; try { flap(.02); } catch (e) {} }
        else if (G && G.h === h) {
          if (!pl[h]) { MAQ.spinV = clamp(G.v, -4, 4); MAQ.grab = null; return; }
          const d = wrapA(ang - G.last); G.last = ang; G.v = G.v * .7 + (d / Math.max(dt, 1e-3)) * .3;
          MAQ.turn.rotation.y = G.r0 + wrapA(ang - G.a0) * 1.0 + (G.acc || 0); if (Math.abs(MAQ.turn.rotation.y - G.r0) > .05 && X.press) X.press[h] = null;   /* forgatás után a csippentés elengedése ne kattintson egy lakásra */ if (Math.abs(wrapA(ang - G.a0)) > 2.6) { G.acc = (G.acc || 0) + wrapA(ang - G.a0); G.a0 = ang; }
        }
      });
    } else if (MAQ.grab) MAQ.grab = null;
    if (!MAQ.grab && Math.abs(MAQ.spinV || 0) > .01) { MAQ.turn.rotation.y += MAQ.spinV * dt; MAQ.spinV *= Math.pow(.15, dt); }
    if (MAQ.help && MAQ.help.visible) { MAQ.helpT -= dt; if (MAQ.helpT < 0) { MAQ.help.visible = false; T.xr.extra.delete(MAQ.help); } }
    /* láthatóságok */
    const H = MAQ.H;
    MAQ.H.roof.visible = MAQ.roofOn && MAQ.upper;
    H.lv[1].visible = MAQ.upper;
    H.meshes.forEach((m) => {
      const v = m.userData.vis, lv = m.userData.lv;
      if (v === "tall") m.visible = MAQ.roofOn || life || (lv === 0 && MAQ.upper);
      else if (v === "low") m.visible = !(MAQ.roofOn || life || (lv === 0 && MAQ.upper));
      else if (v === "pT") m.visible = life;
      else if (v === "pL") m.visible = !life;
      else if (v === "life") m.visible = life;
    });
    Object.values(MAQ.apts).forEach((A) => {
      const show = !life && (A.lv === 0 || MAQ.upper);
      const base = A.free === true ? .2 : A.free === false ? .16 : 0, tgt = A.hov || MAQ.sel === A ? .34 : base;
      if (A.free === true) A.gm.color.set("#3fb37f"); else if (A.free === false) A.gm.color.set("#e5262f"); else A.gm.color.copy(A.col);
      A.gm.opacity += (tgt - A.gm.opacity) * Math.min(1, dt * 8); A.glow.visible = show;
      if (A.label && life) A.label.visible = false;
      if (A.lifeL) A.lifeL.visible = life && (A.lv === 0 || MAQ.upper);
    });
    MAQ.tp.forEach((m) => { m.visible = life; });
    MAQ.lampHalo.forEach((P) => { P.visible = life; });
    MAQ.orbs.forEach((o) => { o.visible = life; if (life) o.material.rotation = Math.sin(W.t * 1.5) * .05; });
    if (life) MAQ.orbs.forEach((o, i) => { const k = (o.scale.x > .38 ? .42 : .3) * (1 + Math.sin(W.t * 2.2 + i) * .06); o.scale.set(k, k, 1); });
    if (!T.inVR && !life && !MAQ.drag && MAQ.auto !== false) MAQ.turn.rotation.y += dt * .04;
    /* napszak: az óra simán halad a cél felé */
    if (Math.abs(MAQ.hour - MAQ.hourT) > 1e-3) { MAQ.hour += (MAQ.hourT - MAQ.hour) * Math.min(1, dt * 2.2); if (Math.abs(MAQ.hour - MAQ.hourT) < .004) { MAQ.hour = MAQ.hourT; envSetTime(MAQ.day, MAQ.hour, true); } MAQ.envT = (MAQ.envT || 0) + dt; if (MAQ.envT > .06) { MAQ.envT = 0; envSetTime(MAQ.day, MAQ.hour); } }
    /* nap (árnyékvető fény) a modell fölött */
    const sun = ENV.lights.sun, tg = sun.target; MAQ.holder.getWorldPosition(tg.position);
    if (life) { const hw = headWorld(_q); tg.position.x = hw.x; tg.position.z = hw.z; }   /* életnagyságban az árnyék a környezetünkben a legélesebb */
    tg.updateMatrixWorld(); sun.position.copy(tg.position).addScaledVector(ENV.lights.sunDirW || _q2.set(0, 1, 0), MAQ.shadowD || 4);
    const sig = [MAQ.turn.rotation.y.toFixed(3), MAQ.s.toFixed(5), MAQ.hour.toFixed(3), MAQ.roofOn, MAQ.upper, MAQ.mode, MAQ.table.position.y.toFixed(2), MAQ.holder.position.z.toFixed(3), MAQ.mode === "life" ? Math.round(_q.x * 2) + "," + Math.round(_q.z * 2) : ""].join("|");
    if (sig !== MAQ.shSig) { MAQ.shSig = sig; T.sceneEl.renderer.shadowMap.needsUpdate = true; }
    /* esti fények a házban */
    const ev = ENV.evening || 0; MAQ.H.glass.emissiveIntensity = ev * (life ? .12 : .55); MAQ.H.bulb.emissiveIntensity = ev * 2.4 * (.9 + .1 * Math.sin(W.t * 2)); MAQ.H.lampIn.emissiveIntensity = ev * 1.6;
    if (MAQ.H.sign) MAQ.H.sign.material.emissiveIntensity = ev * .9;
    /* áttűnés */
    if (MAQ.fading) { const F = MAQ.fading; F.t += dt; const hw = headWorld(_q3); MAQ.fade.position.copy(hw);
      const a = F.t < .45 ? F.t / .45 : F.t < .6 ? 1 : Math.max(0, 1 - (F.t - .6) / .7); MAQ.fade.material.opacity = a;
      if (!F.done && F.t >= .5) { F.done = true; try { F.fn(); } catch (e) { console.warn(e); } }
      if (F.t > 1.3) { MAQ.fading = null; MAQ.fade.visible = false; } }
    /* környezet */
    envTick(dt, headWorld(_q3));
    try { bjTick(dt); } catch (e) { if (!MAQ.bjErr) { MAQ.bjErr = 1; console.warn("bója", e); } }
    if (MAQ.card && MAQ.card.visible === false && MAQ.sel == null) {}
  }
  const hhmm = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, "0")}`; };
  function sunLine() { const p = ENV.sunInfo || { az: 0, el: 0 }; return p.el < -.8 ? (p.el < -12 ? "csillagos éjszaka" : "a nap lement – szürkület") : `a nap ${["É", "ÉK", "K", "DK", "D", "DNy", "Ny", "ÉNy"][Math.round(p.az / 45) % 8]} felől, ${Math.round(p.el)}° magasan`; }
  const dayHu = (ymd) => { const [y, m, d] = ymd.split("-").map(Number); return `${["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."][m - 1]} ${d}.`; };
  function wristRedraw() { try { const P = T.xr && T.xr.wristP; if (P && P.m.visible) P.draw(); } catch (e) {} }

  /* ---------- csuklómenü (bal tenyér felfelé) – a makett minden beállítása ---------- */
  /* a csuklóóra menüje – szerteágazó: a tömb harmadik eleme függvény (gomb) vagy újabb lista (almenü) */
  function maqWrist() {
    const life = MAQ.mode === "life", turnA = Math.PI / 4;
    const turn = (a) => { try { T.vrPanel.turn(a); } catch (e) {} };
    const sunMenu = ["☀", "Napszak", [["◂☀", "Fél órával korábban", () => nudgeHour(-.5)], ["☀▸", "Fél órával később", () => nudgeHour(.5)]]
      .concat(PRESETS.map(([n], i) => [["🌅", "🌄", "🌞", "🌤", "🌇", "🌆", "🌃", "🌙"][i], n, () => setPreset(i), MAQ.preset === i]))];
    const turnMenu = ["🧭", "Forgás", [["↺", "Balra 45°", () => turn(turnA)], ["↻", "Jobbra 45°", () => turn(-turnA)], ["⤾", "Megfordulok", () => turn(Math.PI)]]];
    const back = ["‹", "A sétához", () => W.close()];
    const scene = ["🎬", "Jelenetek", [["▸", BJ.cur ? "Következő" : "Jelenet most", () => bjNext()]].concat(EV_LIST.map(([id, ic, n]) => [ic, n, () => bjStart(id), BJ.curId === id && !!BJ.cur]))];
    if (life) return [
      ["🏢", "Szintek", [["⬆", "Emelet", () => goLevel(1), MAQ.level === 1], ["⬇", "Földszint", () => goLevel(0), MAQ.level === 0], ["⌂", MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }]]],
      ["▣", "Vissza a maketthez", () => goTable()], sunMenu,
      ["📅", "Foglalás", () => W.close(() => { try { T.book(null); } catch (e) {} })], scene,
      ["🔭", MAQ.sights ? "Feliratok ki" : "Látnivalók", () => toggleSights()], turnMenu, back];
    return [
      ["🔍", "Méret", [["＋", "Nagyobb", () => stepScale(1)], ["－", "Kisebb", () => stepScale(-1)], ["🚶", "Életnagyság", () => goLife()], ["🧭", "Valódi irány", () => { MAQ.auto = false; MAQ.turn.rotation.y = 0; }]].concat(
        SCALES.slice(0, -1).map((v) => ["▫", SCALE_TXT(v), () => setScale(v, true), Math.abs(MAQ.sT - v) < 1e-4]))],
      ["🏠", "Nézet", [["⌂", MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], ["▤", MAQ.upper ? "Emelet ki" : "Emelet be", () => { MAQ.upper = !MAQ.upper; }], ["🔭", MAQ.sights ? "Feliratok ki" : "Látnivalók", () => toggleSights()]]],
      ["🚶", "Életnagyság", () => goLife()], sunMenu, scene, turnMenu, ["☰", "Nagy panel", () => W.togglePanel()], back];
  }
  /* ---------- nagy lebegő panel (VR) ---------- */
  function maqPanel(P) {
    const life = MAQ.mode === "life";
    P.title(life ? "A Zephyr ház – életnagyságban" : "A ház makettje · " + SCALE_TXT(MAQ.s), "Zamárdi, a Balaton partján · a hivatalos tervrajz szerint");
    if (life) { P.row(0, "Csippents a földre vagy a padlóra: odalépsz", "#ffffff"); P.row(1, "A fénylő 360° gömbök: a lakás valódi fotói", "#ffd166"); }
    else { P.row(0, "Csippents egy lakásra: belépés vagy foglalás", "#ffffff"); P.row(1, MAQ.dates ? "Zöld = szabad, piros = foglalt a napjaidon" : "Két kézzel csippentve húzd szét: nagyobb lesz", "#ffd166"); }
    P.row(2, `${dayHu(MAQ.day)} ${hhmm(MAQ.hour)} · ${PRESETS[MAQ.preset][0]} – ${sunLine()}`, "#7fd3ff");
    P.row(3, BJ.cur ? "🎬 Most: " + BJ.cur.name + " – nézz körül!" : "⛵ Körülötted verseny a bója körül · időnként jelenet", "#c9a24a");
    P.buttons([["◂☀ Korábban", () => nudgeHour(-.5)], ["◐ " + PRESETS[(MAQ.preset + 1) % PRESETS.length][0], () => setPreset(MAQ.preset + 1)], ["Később ☀▸", () => nudgeHour(.5)], [MAQ.sights ? "🔭 Feliratok ki" : "🔭 Látnivalók", () => toggleSights()], ["🎬 Jelenet", () => bjNext()]], 1);
    if (life) P.buttons([[MAQ.level ? "⬇ Földszint" : "⬆ Emelet", () => goLevel(MAQ.level ? 0 : 1)], [MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], ["▣ Makett", () => goTable()], ["‹ Vissza", () => W.close()]]);
    else P.buttons([["＋ Nagyobb", () => stepScale(1)], ["－ Kisebb", () => stepScale(-1)], ["🚶 Életnagyság", () => goLife()], [MAQ.roofOn ? "⌂ Tető le" : "⌂ Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], [MAQ.upper ? "▤ Emelet ki" : "▤ Emelet be", () => { MAQ.upper = !MAQ.upper; }], ["‹ Vissza", () => W.close()]]);
  }
  /* ---------- 2D kezelőfelület ---------- */
  function maqHud(H) {
    const life = MAQ.mode === "life";
    H.title(life ? "A Zephyr ház – életnagyságban" : "A ház makettje · " + SCALE_TXT(MAQ.s), life ? "Koppints a földre: odalépsz · a fénylő 360° gömbök a valódi fotók" : "A Balaton partján, Zamárdiban · koppints egy lakásra: belépés vagy foglalás");
    if (life) H.buttons([[MAQ.level ? "⬇ Földszint" : "⬆ Emelet", () => goLevel(MAQ.level ? 0 : 1)], [MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], ["▣ Vissza a maketthez", () => goTable()],
      ["◂☀", () => nudgeHour(-.5)], ["◐ " + PRESETS[(MAQ.preset + 1) % PRESETS.length][0], () => setPreset(MAQ.preset + 1)], ["☀▸", () => nudgeHour(.5)], [MAQ.sights ? "🔭 ki" : "🔭 Látnivalók", () => toggleSights()], ["🎬 Jelenet", () => bjNext()]]);
    else H.buttons([["＋ Nagyobb", () => stepScale(1)], ["－ Kisebb", () => stepScale(-1)], ["🚶 Életnagyság", () => goLife()], [MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], [MAQ.upper ? "Emelet ki" : "Emelet be", () => { MAQ.upper = !MAQ.upper; }],
      ["◂☀", () => nudgeHour(-.5)], ["◐ " + PRESETS[(MAQ.preset + 1) % PRESETS.length][0], () => setPreset(MAQ.preset + 1)], ["☀▸", () => nudgeHour(.5)], ["⟲", () => { MAQ.auto = false; MAQ.turn.rotation.y -= .4; }], ["⟳", () => { MAQ.auto = false; MAQ.turn.rotation.y += .4; }], [MAQ.sights ? "🔭 ki" : "🔭 Látnivalók", () => toggleSights()], ["🎬 Jelenet", () => bjNext()]]);
    H.hint(`${dayHu(MAQ.day)} ${hhmm(MAQ.hour)} · ${PRESETS[MAQ.preset][0]} – ${sunLine()}${MAQ.dates && !life ? " · zöld = szabad, piros = foglalt" : ""}${BJ.cur ? " · 🎬 " + BJ.cur.name : ""}`);
  }
