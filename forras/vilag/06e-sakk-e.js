  /* ------------------------------------------------------------------ NÉZŐPONTOK
     A világ (root) forog és tolódik úgy, hogy a választott pont a lábad alá, a tábla közepe pedig ELÉD kerüljön –
     VR-ben sem kell megfordulnod. Váltáskor rövid elsötétülés (kíméletes a gyomornak). */
  const VIEWS = { bridge: ["🔭", "Parancsnoki híd"], deck: ["⚓", "A stégen – életnagyságban"], left: ["◧", "Bal oldali torony"], right: ["◨", "Jobb oldali torony"], enemy: ["⇅", "Az ellenfél hídja"], balloon: ["🎈", "Hőlégballon – madártávlat"], orbit: ["⟲", "Körrepülés a ballonnal"], walk: ["🚶", "A stégen"] };
  const VIEW_CYCLE = ["bridge", "deck", "left", "enemy", "right", "balloon", "orbit"];
  const BALLOON_PARK = V3(-BH - 46, 26, -18);
  function viewPoint(id, o) {
    const sd = (GS.two ? "w" : GS.human) === "w" ? 1 : -1, d = TOWER_D - 2.55;   /* a torony fedélzetének legelső pereme: előtted semmi */
    switch (id) {
      case "enemy": return { p: V3(0, TOWER_Y, -sd * d), pitch: -.3 };
      case "left": return { p: V3(-sd * d, TOWER_Y, 0), pitch: -.3 };
      case "right": return { p: V3(sd * d, TOWER_Y, 0), pitch: -.3 };
      case "deck": return { p: V3(0, PONT_Y, sd * (BI + .12)), pitch: -.12 };   /* a stég belső élén, a kötél ELŐTT */
      case "walk": return { p: V3(o.x, PONT_Y, o.z), pitch: -.08 };
      case "balloon": return { p: V3(0, 44, sd * 46), pitch: -.92, balloon: true };
      case "orbit": { const th = o && o.th != null ? o.th : Math.atan2(0, sd); return { p: V3(Math.sin(th) * 66, 30, Math.cos(th) * 66), pitch: -.42, balloon: true, th }; }
      default: return { p: V3(0, TOWER_Y, sd * d), pitch: -.32 };
    }
  }
  function inVRSeat() { if (CS.seat == null) { try { CS.seat = localStorage.getItem("zephyr-vr-ules") === "1"; } catch (e) { CS.seat = false; } } return !!(T.inVR && CS.seat); }
  function toggleSeat() { CS.seat = !inVRSeatRaw(); try { localStorage.setItem("zephyr-vr-ules", CS.seat ? "1" : "0"); } catch (e) {} goView(CS.viewId || "bridge", null, true); W.panelDirty = 1; }
  function inVRSeatRaw() { inVRSeat(); return !!CS.seat; }
  function toggleSign() { CS.noSign = !CS.noSign; if (CS.sign) CS.sign.visible = !CS.noSign; try { localStorage.setItem("zephyr-sakk-tabla", CS.noSign ? "0" : "1"); } catch (e) {} W.panelDirty = 1; }
  function chessPlace(v, keepPsi) {
    const root = W.root; if (!root) return;
    const psi = keepPsi != null ? keepPsi : (T.camYaw ? T.camYaw() : 0), envYaw = Math.atan2(v.p.x, v.p.z), r = psi - envYaw;
    /* 2D-ben a ballonban a kosár pereme fölé, kicsit előre hajolva nézünk (VR-ben magad hajolsz ki) */
    const pv = v.balloon ? v.p.clone().add(T.inVR ? V3(-Math.sin(envYaw) * .62, 0, -Math.cos(envYaw) * .62) : V3(-Math.sin(envYaw) * 1.3, .45, -Math.cos(envYaw) * 1.3)) : v.p;
    /* ülő mód: VR-ben 45 cm-rel (ballonban 60) feljebb emel, hogy ülve se takarjon semmi */
    const lift = inVRSeat() ? (v.balloon ? .6 : .45) : 0;
    const q = pv.clone().applyAxisAngle(V3(0, 1, 0), r);
    const hw = headWorld(new THREE.Vector3()), inVR = T.inVR;
    root.rotation.set(0, r, 0);
    root.position.set(-q.x + (inVR ? hw.x : 0), inVR ? -pv.y - lift : -(pv.y + 1.62), -q.z + (inVR ? hw.z : 0));
    root.updateMatrixWorld(true);
    if (v.balloon) CS.balloon.position.copy(v.p); else if (!CS.orbit) CS.balloon.position.copy(BALLOON_PARK);
    if (v.balloon) CS.balloon.rotation.y = envYaw;
    /* az üzenettábla a tábla túlsó oldalára, feléd */
    const dir = V3(v.p.x, 0, v.p.z).normalize(); CS.sign.position.set(-dir.x * (BH + 6), v.p.y > 20 ? 3 : 19, -dir.z * (BH + 6));
    return psi;
  }
  function goView(id, o, instant) {
    if (!CS.env) return;
    const run = () => {
      CS.orbit = null; CS.viewId = id; const v = viewPoint(id, o);
      const psi = chessPlace(v);
      if (id === "orbit") CS.orbit = { th: v.th, psi };
      if (!T.inVR) { const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject) lc.pitchObject.rotation.x = v.pitch; }
      W.panelDirty = 1;
    };
    if (instant) { run(); return; }
    CS.fade = { t: 0, run, done: false };
  }
  function nextView() { const i = VIEW_CYCLE.indexOf(CS.viewId); goView(VIEW_CYCLE[(i + 1) % VIEW_CYCLE.length]); }
  function sqFrom(pt) { const p = CS.env.worldToLocal(pt.clone()), c = Math.floor(p.x / SQ + 4), r = Math.floor(p.z / SQ + 4); return c >= 0 && c < 8 && r >= 0 && r < 8 ? r * 8 + c : -1; }

  /* ------------------------------------------------------------------ KEZELŐFELÜLETEK: VR-panel, 2D-menü, csuklómenü */
  const capStr = (a) => a.length ? a.map((p) => GLYPH[p.toLowerCase()]).join(" ") : "–";
  function material() { let s = 0; const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }; GS.s.b.forEach((p) => { if (p !== ".") s += (CE.isW(p) ? 1 : -1) * V[p.toLowerCase()]; }); return s; }
  function pickPromo(t) { const m = GS.promo && GS.promo.find((q) => q.promo.toLowerCase() === t); if (m) doMove(m); }
  function headline() { return CS.flash && CS.flash.k > 0 ? CS.flash.t : GS.msg; }
  function signText() { const t = GS.st !== "play" ? GS.msg : GS.thinking ? "A gép gondolkodik…" : CE.inCheck(GS.s, GS.s.turn) ? "SAKK!" : GS.two ? (GS.s.turn === "w" ? "Világos jön" : "Sötét jön") : GS.s.turn === GS.human ? "Te jössz" : "A gép jön"; return t.length > 34 ? t.slice(0, 33) + "…" : t; }
  function chessPanel(P) {
    P.title(`Vitorlás sakk · ${GS.lvl}. szint – ${rankVR(GS.lvl)}`, headline());
    if (GS.promo) { P.row(0, "A csónakod átért a túlsó partra – mivé váljon?", "#ffd166"); P.row(1, "Válassz egy hajót:", "#7fd3ff");
      P.buttons([["⛵ Vezér", () => pickPromo("q")], ["🗼 Bástya", () => pickPromo("r")], ["⛵ Futó", () => pickPromo("b")], ["🐴 Huszár", () => pickPromo("n")]]); return; }
    const sp = GS.sel >= 0 ? GS.s.b[GS.sel] : null;
    P.row(0, sp ? `${PAL[CE.isW(sp) ? "w" : "b"].name} ${NAMES[sp.toLowerCase()][0].toLowerCase()} (${NAMES[sp.toLowerCase()][1]}) · zöld = szabad, piros = ütés` : "Mutass egy hajódra a sugárral és csippents, aztán a célmezőre.", "#ffd166");
    P.row(1, `Leütve – világos: ${capStr(GS.capW)}   sötét: ${capStr(GS.capB)}`, "#c9a24a");
    P.row(2, `${VIEWS[CS.viewId || "bridge"][1]} · a stégre csippentve odalépsz`, "#7fd3ff");
    const mt = material();
    P.row(3, `Te: ${GS.two ? "két játékos" : GS.human === "w" ? "világos (gép ellen)" : "sötét (gép ellen)"} · anyag: ${mt === 0 ? "egyenlő" : (mt > 0 ? "világos +" : "sötét +") + Math.abs(mt)}`, "#ffffff");
    P.buttons([["💡 Ötlet", hint], ["↶ Vissza", undo], ["♟ Új játszma", newGame], ["🔭 Nézőpont", nextView], [CS.noSign ? "🪧 Tábla be" : "🪧 Tábla ki", toggleSign]], 1);
    P.buttons([["− Szint", () => setLvl(-1)], ["Szint +", () => setLvl(1)], [GS.two ? "🤖 Gép ellen" : "👥 Két játékos", toggleTwo]].concat(T.inVR ? [[inVRSeatRaw() ? "🧍 Álló" : "🪑 Ülő mód", toggleSeat]] : []).concat([["‹ Kilépés", () => W.close()]]), 0);
  }
  function chessHud(H) {
    H.title(`Vitorlás sakk · ${GS.lvl}. szint – ${rankVR(GS.lvl)}`, headline());
    H.list([`Leütve – világos: ${capStr(GS.capW)} · sötét: ${capStr(GS.capB)}`, `Nézőpont: ${VIEWS[CS.viewId || "bridge"][1]}`]);
    if (GS.promo) { H.buttons([["Vezér (fregatt)", () => pickPromo("q")], ["Bástya (torony)", () => pickPromo("r")], ["Futó (jacht)", () => pickPromo("b")], ["Huszár (viking)", () => pickPromo("n")]]); }
    else H.buttons([["💡 Ötlet", hint], ["↶ Vissza", undo], ["♟ Új játszma", newGame], ["− Szint", () => setLvl(-1)], ["Szint +", () => setLvl(1)], [GS.two ? "🤖 Gép ellen" : "👥 2 játékos", toggleTwo], ["⇄ Színcsere", swapSide], [CS.noSign ? "🪧 Tábla be" : "🪧 Tábla ki", toggleSign]]
      .concat(VIEW_CYCLE.map((k) => [VIEWS[k][0] + " " + VIEWS[k][1].split(" – ")[0], () => goView(k), CS.viewId === k])));
    H.hint("Húzással körbenézel · kattints egy hajódra, aztán a célmezőre · a stégre kattintva odalépsz");
  }
  function chessWrist() {
    return [["🔭", "Nézőpont", VIEW_CYCLE.map((k) => [VIEWS[k][0], VIEWS[k][1].split(" – ")[0], () => goView(k), CS.viewId === k])],
      ["💡", "Ötlet", hint], ["↶", "Visszalépés", undo], ["♟", "Új játszma", newGame],
      ["📶", "Szint", [["−", "Könnyebb", () => setLvl(-1)], ["+", "Nehezebb", () => setLvl(1)]]],
      ["👥", GS.two ? "Gép ellen" : "Két játékos", toggleTwo], ["⇄", "Színcsere", swapSide], ["🪧", CS.noSign ? "Tábla mutatása" : "Tábla elrejtése", toggleSign], ["🪑", inVRSeatRaw() ? "Álló mód" : "Ülő mód", toggleSeat], ["☰", "Nagy panel", () => W.togglePanel()], ["‹", "A sétához", () => W.close()]];
  }

  /* ------------------------------------------------------------------ FELÉPÍTÉS */
  function buildChess() {
    const root = W.root;
    Object.keys(CS).forEach((k) => delete CS[k]); VS.mats = {}; Object.keys(SAILTX).forEach((k) => delete SAILTX[k]);
    CS.tpl = {}; CS.vis = new Array(64).fill(null); CS.hov = -1; W.rayFar = 160;
    const far = new THREE.Group(), env = new THREE.Group(); root.add(far); root.add(env); CS.env = env;
    makeSunsetSky(far); { const sh = makeShores(far); sh.material.color.set("#8a6c86"); }
    CS.water = makeWater(env, { sun: CSUN }); { const hl = patchWater(CS.water); CS.hlTex = hl.tex; CS.hlData = hl.data; }
    /* fények: alacsony, narancsos nap nyugatról, lila égbolt-derengés, hideg ellenfény */
    { const hemi = new THREE.HemisphereLight(0x9a8cc0, 0x3a2a30, .75), sun = new THREE.DirectionalLight(0xffb46a, 2.6), amb = new THREE.AmbientLight(0xffd8c0, .14), rim = new THREE.DirectionalLight(0x8090d0, .45);
      const tg = new THREE.Object3D(); env.add(tg); sun.target = tg; rim.target = tg; sun.position.copy(CSUN).multiplyScalar(120); rim.position.set(60, 40, 80); env.add(hemi, sun, amb, rim); }
    /* környezeti tükröződés (a fém – arany, sárgaréz – csillogásához): naplementés színátmenet */
    try { const sc = T.sceneEl.object3D; CS.envWas = sc.environment || null; CS.envIntWas = sc.environmentIntensity;
      const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const g = cv.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, "#232a58"); gr.addColorStop(.32, "#7a5a92"); gr.addColorStop(.47, "#f39a6a"); gr.addColorStop(.5, "#ffc070"); gr.addColorStop(.53, "#3a3048"); gr.addColorStop(1, "#141018"); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
      const sx = (Math.atan2(CSUN.x, -CSUN.z) / TAU + .5) * 256; const sg = g.createRadialGradient(sx, 60, 1, sx, 60, 40); sg.addColorStop(0, "rgba(255,240,200,1)"); sg.addColorStop(1, "rgba(255,160,80,0)"); g.fillStyle = sg; g.fillRect(0, 0, 256, 128);
      const t = new THREE.CanvasTexture(cv); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
      CS.pmrem = new THREE.PMREMGenerator(T.sceneEl.renderer); CS.envRT = CS.pmrem.fromEquirectangular(t); t.dispose(); sc.environment = CS.envRT.texture; sc.environmentIntensity = 1; } catch (e) { console.warn("sakk env", e); }
    buildLanes(env); buildPontoon(env);
    buildTower(env, 0, TOWER_D, "w"); buildTower(env, 0, -TOWER_D, "b"); buildTower(env, -TOWER_D, 0, "w"); buildTower(env, TOWER_D, 0, "b");
    CS.balloon = buildBalloon(env); CS.balloon.position.copy(BALLOON_PARK);
    buildSpectators(env); buildFx(env);
    CS.wakes = [makeWake(env, 1.0), makeWake(env, 1.0)];
    CS.pieceG = new THREE.Group(); env.add(CS.pieceG);
    /* jelzőgyűrűk */
    const add = (c) => basic({ color: c, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending });
    CS.ringGreen = add("#6dff9a"); CS.ringRed = add("#ff5a4a");
    const rg = new THREE.TorusGeometry(2.1, .12, 8, 48).rotateX(Math.PI / 2); W.disposables.push(rg);
    CS.rings = []; for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(rg, CS.ringGreen); m.visible = false; m.renderOrder = 4; env.add(m); CS.rings.push(m); }
    CS.selRing = new THREE.Group(); env.add(CS.selRing); CS.selRing.visible = false;
    { const m = new THREE.Mesh(new THREE.TorusGeometry(3.3, .16, 8, 56).rotateX(Math.PI / 2), add("#ffd166")); W.disposables.push(m.geometry); CS.selRing.add(m);
      const bt = canvasTex(32, 256, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(255,209,102,.8)"); gr.addColorStop(1, "rgba(255,209,102,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
      const b = mesh(new THREE.CylinderGeometry(3.2, 3.2, 14, 32, 1, true), basic({ map: bt, transparent: true, opacity: .2, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), CS.selRing); b.position.y = 7; b.renderOrder = 5; }
    /* láthatatlan „tábla-felület” a mezők célzásához */
    CS.pick = mesh(new THREE.PlaneGeometry(2 * BH, 2 * BH).rotateX(-Math.PI / 2), basic({ visible: false }), env); CS.pick.position.y = .15;
    CS.pick.userData.xr = { hover: (on, h) => setHover(on && h ? sqFrom(h.point) : -1), move: (h) => { if (h) setHover(sqFrom(h.point)); }, click: (h) => { if (h) onSquare(sqFrom(h.point)); } };
    T.xr.extra.add(CS.pick); W.objs.push(CS.pick);
    CS.hovL = labelSprite(["", ""], { size: 1, fs: 54, w: 900 }); env.add(CS.hovL); CS.hovL.visible = false;
    CS.sign = labelSprite(["", ""], { size: 30, fs: 64, w: 1400, bg: "rgba(14,33,66,.82)", edge: "#c9a227" }); env.add(CS.sign); try { CS.noSign = localStorage.getItem("zephyr-sakk-tabla") === "0"; } catch (e) {} CS.sign.visible = !CS.noSign;
    /* elsötétítő gömb a nézőpontváltáshoz (a kamerán) */
    CS.fadeM = new THREE.Mesh(new THREE.SphereGeometry(.4, 16, 10), new THREE.MeshBasicMaterial({ color: 0x05070c, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false })); CS.fadeM.renderOrder = 9999; CS.fadeM.visible = false;
    W.disposables.push(CS.fadeM.geometry, CS.fadeM.material); try { T.camObj().add(CS.fadeM); } catch (e) {}
    /* játszma */
    if (!gsLoad()) gsReset(); gsStatus(); syncPieces(); hlPaint();
    goView("bridge", null, true);
    audioStart({ water: .035, wind: .025 });
    CS.pm = (e) => { if (T.inVR || !W.active) return; const h = pick2D(e); if (!h) return setHover(-1); const o = h.object; if (o === CS.pick) setHover(sqFrom(h.point)); };
    T.sceneEl.canvas.addEventListener("pointermove", CS.pm);
    W.onClose = () => {
      try { T.sceneEl.canvas.removeEventListener("pointermove", CS.pm); } catch (e) {}
      try { const sc = T.sceneEl.object3D; sc.environment = CS.envWas || null; if (CS.envIntWas != null) sc.environmentIntensity = CS.envIntWas; if (CS.envRT) CS.envRT.dispose(); if (CS.pmrem) CS.pmrem.dispose(); } catch (e) {}
      try { if (CS.fadeM && CS.fadeM.parent) CS.fadeM.parent.remove(CS.fadeM); } catch (e) {}
      W.rayFar = null; GS.thinking = false; CS.anim = null;
    };
    flashMsg(T.inVR ? "Üdv a fedélzeten! Mutass egy hajódra, csippents, majd a célmezőre." : "Üdv a fedélzeten! Kattints egy hajódra, majd a célmezőre.");
    setTimeout(maybeAI, 900);
    W.chess = { GS, CS, CE, goView, onSquare, doMove, newGame, undo, finishAnim, place: (x, y, z, pitch) => { CS.orbit = null; chessPlace({ p: V3(x, y, z) }); const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject && pitch != null) lc.pitchObject.rotation.x = pitch; } };   /* (tesztekhez) */
    return { tick: chessTick, panel: chessPanel, hud: chessHud, wrist: chessWrist };
  }

  /* ------------------------------------------------------------------ KÉPKOCKÁNKÉNT */
  const _hw = new THREE.Vector3();
  function chessTick(dt) {
    FLAGU.value = W.t; WU.uWT.value = W.t;
    const wm = CS.water.userData.mat; wm.uniforms.uT.value = W.t; wm.uniforms.uWind.value = WIND_DIR; wm.uniforms.uPulse.value = .5 + .5 * Math.sin(W.t * 5.5);
    headWorld(_hw); wm.uniforms.uCam.value.copy(CS.env.worldToLocal(_hw.clone()));
    /* nézőpontváltás elsötétítéssel */
    if (CS.fade) { const F = CS.fade; F.t += dt; const d = .22; let o;
      if (F.t < d) o = F.t / d; else { if (!F.done) { F.done = true; F.run(); } o = Math.max(0, 1 - (F.t - d) / d); if (F.t > 2 * d) CS.fade = null; }
      CS.fadeM.visible = !!CS.fade; CS.fadeM.material.opacity = o; }
    /* körrepülés */
    if (CS.orbit && !CS.fade) { CS.orbit.th += dt * .05; const v = viewPoint("orbit", { th: CS.orbit.th }); chessPlace(v, CS.orbit.psi); }
    animTick(dt); fxTick(dt);
    /* részletesség: messziről (45 m fölött) a kötélzet, a zászlók és a lobogók nem rajzolódnak – Questen sok rajzolási hívást spórol */
    CS.lodT = (CS.lodT || 0) - dt; if (CS.lodT <= 0) { CS.lodT = .4; const cl = CS.env.worldToLocal(_hw.clone());
      CS.vis.concat(CS.anim ? CS.anim.movers.map((q) => q.P) : []).forEach((P) => { if (!P) return; const far = Math.hypot(P.g.position.x - cl.x, P.g.position.z - cl.z, cl.y) > 46; if (P.far !== far) { P.far = far; P.model.traverse((o) => { if (o.userData.lod) o.visible = !far; }); } }); }
    /* hajók ringása */
    const list = CS.vis.filter(Boolean); if (CS.anim) { CS.anim.movers.forEach((q) => { if (!q.done) list.push(q.P); }); }
    list.forEach((P) => {
      const x = P.g.position.x, z = P.g.position.z, y = P.yaw; P.g.rotation.y = y;
      if (P.t === "r") { /* szikla: nem ring */ }
      else { const h = waveB(x, z), gx = (waveB(x + 1.2, z) - waveB(x - 1.2, z)) / 2.4, gz = (waveB(x, z + 1.6) - waveB(x, z - 1.6)) / 3.2;
        const sx = gx * Math.cos(y) - gz * Math.sin(y), sz = gx * Math.sin(y) + gz * Math.cos(y);
        P.body.position.y = h * .85; P.body.rotation.set(sz * .7, 0, -sx * .9 + (P.heel || 0), "YXZ"); }
      if (P.rise != null) { P.rise += dt / 1.3; const s = smooth(Math.min(1, P.rise)); P.g.scale.setScalar(.2 + .8 * s); P.body.position.y -= (1 - s) * 7; if (P.rise >= 1) { P.rise = null; P.g.scale.setScalar(1); } }
      if (P.beam) P.beam.rotation.y += dt * .8;
      if (P.oars[0]) { P.ph += dt * (P.row > .3 ? 3.2 : .6); const sw = P.row > .3 ? Math.sin(P.ph) * .55 : Math.sin(P.ph) * .06, lf = P.row > .3 ? Math.cos(P.ph) * .14 : 0;
        P.oars.forEach((o, k) => { const sd = k ? 1 : -1; o.rotation.set(0, sd * sw, sd * (.28 + lf)); }); }
      if (P.boat && P.boat.userData.update) P.boat.userData.update(dt);
    });
    if (CS.anim && CS.anim.victim && CS.anim.victim.g.parent && CS.anim.t < CS.anim.tSink) { const V = CS.anim.victim, h = waveB(V.g.position.x, V.g.position.z); V.body.position.y = h * .85; }
    /* jelzőgyűrűk, kiválasztás */
    CS.rings.forEach((r, i) => { if (!r.visible) return; r.position.y = .22 + waveB(r.position.x, r.position.z); r.rotation.y = W.t * .4 + i; r.scale.setScalar(1 + .06 * Math.sin(W.t * 4 + i)); });
    if (CS.selRing.visible) { CS.selRing.position.y = .2 + waveB(CS.selRing.position.x, CS.selRing.position.z); CS.selRing.children[0].scale.setScalar(1 + .05 * Math.sin(W.t * 5)); }
    /* rámutatás-felirat: a hajó fölött, a távolsággal arányos méretben */
    if (CS.hovL.visible) { const P = CS.hovP && CS.vis[CS.hovP.sq] === CS.hovP ? CS.hovP : null; const sq = P ? P.sq : CS.hov;
      if (sq >= 0) { CS.hovL.position.set(sqX(sq), (P ? P.dim[1] : 1) + 2.2, sqZ(sq)); const wp = CS.hovL.getWorldPosition(new THREE.Vector3()), d = wp.distanceTo(_hw), k = clamp(d * .055, .9, 6); CS.hovL.scale.set(k, k * CS.hovL.scale.y / Math.max(.001, CS.hovL.scale.x), 1); } }
    /* üzenettábla */
    if (CS.flash) { CS.flash.k -= dt; if (CS.flash.k <= 0) { CS.flash = null; W.panelDirty = 1; } }
    CS.sign.userData.set([signText(), `${GS.lvl}. szint – ${rankVR(GS.lvl)} · ${GS.two ? "két játékos" : GS.s.turn === GS.human ? "te jössz" : "a gép jön"}`]);
    /* nézőhajók, sirályok, lámpák, ballon */
    CS.spect.forEach((q) => { q.g.position.y = waveAt(q.g.position.x, q.g.position.z, W.t) * .8; q.g.rotation.z = Math.sin(W.t * .9 + q.ph) * .03; q.g.rotation.x = Math.sin(W.t * .7 + q.ph) * .02; });
    CS.gulls.tick(dt, 0, 40);
    if (CS.lamps) CS.lamps.emissiveIntensity = 1.5 + .12 * Math.sin(W.t * 7) * Math.sin(W.t * 4.3);
    { const B = CS.balloon, U = B.userData; U.next -= dt; if (U.next <= 0) { U.burn = 1.6; U.next = rr(9, 16); if (CS.viewId === "balloon" || CS.orbit) snd("whoosh"); }
      if (U.burn > 0) { U.burn -= dt; U.flame.visible = true; U.flame.scale.set(.8 + rand() * .2, 2 + rand() * .6, 1); } else U.flame.visible = false;
      if (CS.viewId !== "balloon" && !CS.orbit) B.position.y = BALLOON_PARK.y + Math.sin(W.t * .3) * .8; }
    /* győzelem: tűzijáték */
    if (CS.endFx) { const E = CS.endFx; E.t += dt; if (E.win && E.t < 14) { E.nx = (E.nx || 0) - dt; if (E.nx <= 0) { E.nx = rr(.35, .8); fwBurst(); } } }
  }

  /* ------------------------------------------------------------------ SAKKMOTOR – a stégjáték (gameChess) szabályai és gépi ellenfele, változatlanul */
  const CE = (function () {
    const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    const NAME = { p: "gyalog (evezős csónak)", n: "huszár (lófejes viking hajó)", b: "futó (versenyjacht)", r: "bástya (világítótorony)", q: "vezér (fregatt)", k: "király (háromárbócos)" };
    /* mezőtáblák (világos szemszögéből, a8 = 0 … h1 = 63) */
    const PST = {
      p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
      n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
      b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
      r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
      q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
      k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
      ke: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
    };
    const FILES = "abcdefgh";
    const isW = (p) => p !== "." && p === p.toUpperCase(), colorOf = (p) => (p === "." ? null : isW(p) ? "w" : "b");
    const rc = (i) => [i >> 3, i & 7], idx = (r, c) => r * 8 + c, on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
    const sqName = (i) => FILES[i & 7] + (8 - (i >> 3));
    /* --------------- állás és lépésgenerálás --------------- */
    function initial() { return { b: ("rnbqkbnrpppppppp" + ".".repeat(32) + "PPPPPPPPRNBQKBNR").split(""), turn: "w", cs: "KQkq", ep: -1, half: 0, full: 1 }; }
    const clone = (s) => ({ b: s.b.slice(), turn: s.turn, cs: s.cs, ep: s.ep, half: s.half, full: s.full });
    const KD = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]], ND = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    const BD = [[-1, -1], [-1, 1], [1, -1], [1, 1]], RD = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    function attacked(s, sq, by) {   /* támadja-e a „by” szín a mezőt */
      const [r, c] = rc(sq), B = s.b;
      const pd = by === "w" ? 1 : -1;   /* világos gyalog alulról (nagyobb sorindexről) támad */
      for (const dc of [-1, 1]) { const rr2 = r + pd, cc = c + dc; if (on(rr2, cc)) { const p = B[idx(rr2, cc)]; if (p === (by === "w" ? "P" : "p")) return true; } }
      for (const [dr, dc] of ND) { const rr2 = r + dr, cc = c + dc; if (on(rr2, cc) && B[idx(rr2, cc)] === (by === "w" ? "N" : "n")) return true; }
      for (const [dr, dc] of KD) { const rr2 = r + dr, cc = c + dc; if (on(rr2, cc) && B[idx(rr2, cc)] === (by === "w" ? "K" : "k")) return true; }
      const slide = (dirs, set) => { for (const [dr, dc] of dirs) { let rr2 = r + dr, cc = c + dc; while (on(rr2, cc)) { const p = B[idx(rr2, cc)]; if (p !== ".") { if (colorOf(p) === by && set.includes(p.toLowerCase())) return true; break; } rr2 += dr; cc += dc; } } return false; };
      return slide(BD, "bq") || slide(RD, "rq");
    }
    const kingSq = (s, col) => s.b.indexOf(col === "w" ? "K" : "k");
    const inCheck = (s, col) => attacked(s, kingSq(s, col), col === "w" ? "b" : "w");
    function pseudo(s) {
      const mv = [], B = s.b, me = s.turn, op = me === "w" ? "b" : "w";
      for (let i = 0; i < 64; i++) { const p = B[i]; if (p === "." || colorOf(p) !== me) continue; const t = p.toLowerCase(), [r, c] = rc(i);
        if (t === "p") { const d = me === "w" ? -1 : 1, start = me === "w" ? 6 : 1, last = me === "w" ? 0 : 7;
          const add = (to, cap, ep) => { if ((to >> 3) === last) "qrbn".split("").forEach((pr) => mv.push({ f: i, t: to, p, c: cap, promo: me === "w" ? pr.toUpperCase() : pr })); else mv.push({ f: i, t: to, p, c: cap, ep }); };
          if (on(r + d, c) && B[idx(r + d, c)] === ".") { add(idx(r + d, c), "."); if (r === start && B[idx(r + 2 * d, c)] === ".") mv.push({ f: i, t: idx(r + 2 * d, c), p, c: ".", dbl: true }); }
          for (const dc of [-1, 1]) { if (!on(r + d, c + dc)) continue; const to = idx(r + d, c + dc), q = B[to]; if (q !== "." && colorOf(q) === op) add(to, q); else if (to === s.ep) add(to, me === "w" ? "p" : "P", true); } }
        else if (t === "n" || t === "k") { for (const [dr, dc] of t === "n" ? ND : KD) { if (!on(r + dr, c + dc)) continue; const to = idx(r + dr, c + dc), q = B[to]; if (q === "." || colorOf(q) === op) mv.push({ f: i, t: to, p, c: q }); }
          if (t === "k") { const row = me === "w" ? 7 : 0, ks = me === "w" ? "K" : "k", qs = me === "w" ? "Q" : "q";
            if (i === idx(row, 4) && !inCheck(s, me)) {
              if (s.cs.includes(ks) && B[idx(row, 5)] === "." && B[idx(row, 6)] === "." && B[idx(row, 7)] === (me === "w" ? "R" : "r") && !attacked(s, idx(row, 5), op) && !attacked(s, idx(row, 6), op)) mv.push({ f: i, t: idx(row, 6), p, c: ".", castle: "K" });
              if (s.cs.includes(qs) && B[idx(row, 3)] === "." && B[idx(row, 2)] === "." && B[idx(row, 1)] === "." && B[idx(row, 0)] === (me === "w" ? "R" : "r") && !attacked(s, idx(row, 3), op) && !attacked(s, idx(row, 2), op)) mv.push({ f: i, t: idx(row, 2), p, c: ".", castle: "Q" });
            } } }
        else { for (const [dr, dc] of t === "b" ? BD : t === "r" ? RD : KD) { let rr2 = r + dr, cc = c + dc; while (on(rr2, cc)) { const to = idx(rr2, cc), q = B[to]; if (q === ".") mv.push({ f: i, t: to, p, c: q }); else { if (colorOf(q) === op) mv.push({ f: i, t: to, p, c: q }); break; } rr2 += dr; cc += dc; } } }
      }
      return mv;
    }
    function apply(s, m) {
      const n = clone(s), B = n.b, me = s.turn;
      B[m.t] = m.promo || m.p; B[m.f] = ".";
      if (m.ep) B[m.t + (me === "w" ? 8 : -8)] = ".";
      if (m.castle) { const row = me === "w" ? 7 : 0; if (m.castle === "K") { B[idx(row, 5)] = B[idx(row, 7)]; B[idx(row, 7)] = "."; } else { B[idx(row, 3)] = B[idx(row, 0)]; B[idx(row, 0)] = "."; } }
      let cs = n.cs; const strip = (ch) => { cs = cs.replace(ch, ""); };
      if (m.p === "K") { strip("K"); strip("Q"); } if (m.p === "k") { strip("k"); strip("q"); }
      [[63, "K"], [56, "Q"], [7, "k"], [0, "q"]].forEach(([sq, ch]) => { if (m.f === sq || m.t === sq) strip(ch); });
      n.cs = cs; n.ep = m.dbl ? (m.f + m.t) / 2 : -1;
      n.half = m.p.toLowerCase() === "p" || m.c !== "." ? 0 : s.half + 1; if (me === "b") n.full++;
      n.turn = me === "w" ? "b" : "w"; return n;
    }
    function legal(s) { return pseudo(s).filter((m) => !inCheck(apply(s, m), s.turn)); }
    const posKey = (s) => s.b.join("") + s.turn + s.cs + s.ep;
    function insufficient(s) { const pcs = s.b.filter((p) => p !== "." && p.toLowerCase() !== "k"); if (!pcs.length) return true; if (pcs.length === 1 && "nNbB".includes(pcs[0])) return true;
      if (pcs.every((p) => "bB".includes(p))) { const col = s.b.map((p, i) => ("bB".includes(p) ? ((i >> 3) + (i & 7)) % 2 : -1)).filter((x) => x >= 0); return col.every((x) => x === col[0]); } return false; }
    /* --------------- értékelés és keresés --------------- */
    function evaluate(s) {
      let sc = 0, mat = 0; for (const p of s.b) if (p !== "." && p.toLowerCase() !== "p" && p.toLowerCase() !== "k") mat += VAL[p.toLowerCase()];
      const end = mat <= 1300;
      for (let i = 0; i < 64; i++) { const p = s.b[i]; if (p === ".") continue; const t = p.toLowerCase(), w = isW(p), tbl = t === "k" && end ? PST.ke : PST[t]; const v = VAL[t] + tbl[w ? i : (7 - (i >> 3)) * 8 + (i & 7)]; sc += w ? v : -v; }
      return s.turn === "w" ? sc : -sc;
    }
    const mvv = (m) => (m.c !== "." ? VAL[m.c.toLowerCase()] * 10 - VAL[m.p.toLowerCase()] / 10 : 0) + (m.promo ? 800 : 0);
    let nodes = 0, deadline = 0, stop = false;
    function quiesce(s, a, b, d) {
      if ((++nodes & 1023) === 0 && performance.now() > deadline) stop = true;
      const stand = evaluate(s); if (stand >= b) return b; if (stand > a) a = stand; if (d <= 0 || stop) return a;
      const ms = pseudo(s).filter((m) => m.c !== "." || m.promo).sort((x, y) => mvv(y) - mvv(x));
      for (const m of ms) { const n = apply(s, m); if (inCheck(n, s.turn)) continue; const v = -quiesce(n, -b, -a, d - 1); if (v >= b) return b; if (v > a) a = v; }
      return a;
    }
    function negamax(s, d, a, b, ply) {
      if ((++nodes & 1023) === 0 && performance.now() > deadline) stop = true;
      if (d <= 0) return quiesce(s, a, b, 4);
      const ms = pseudo(s).sort((x, y) => mvv(y) - mvv(x)); let any = false, best = -1e9;
      for (const m of ms) { const n = apply(s, m); if (inCheck(n, s.turn)) continue; any = true; const v = -negamax(n, d - 1, -b, -a, ply + 1); if (stop) return 0; if (v > best) best = v; if (v > a) a = v; if (a >= b) break; }
      if (!any) return inCheck(s, s.turn) ? -100000 + ply : 0;
      return best;
    }
    /* 24 nehézségi szint: a keresési mélység, az idő és a „hibázási kedv” szintenként fokozatosan változik */
    function lvlCfg(l) { l = Math.max(1, Math.min(24, l | 0)); return { d: Math.min(7, 1 + Math.floor((l + 1) / 4)), ms: Math.round(90 + l * l * 4.5), noise: Math.max(0, 300 - l * 14), bl: Math.max(0, .42 - l * .02) }; }
    function think(s, level) {
      const cf = lvlCfg(level), ms = legal(s); if (!ms.length) return null;
      deadline = performance.now() + cf.ms; nodes = 0; stop = false;
      let order = ms.slice().sort((x, y) => mvv(y) - mvv(x)), best = order[0], scores = [];
      for (let d = 1; d <= cf.d; d++) {
        let a = -1e9, cur = null; const sc = [];
        for (const m of order) { const v = -negamax(apply(s, m), d - 1, -1e9, -a, 1); if (stop) break; sc.push([m, v]); if (v > a) { a = v; cur = m; } }
        if (stop && d > 1) break; if (cur) { best = cur; scores = sc; order = [cur].concat(order.filter((m) => m !== cur)); }
        if (performance.now() > deadline) break;
      }
      /* alacsonyabb szinteken néha nem a legjobbat lépi (de csak a „nem sokkal rosszabb” lépések közül választ) */
      if (cf.noise > 0 && scores.length > 2 && Math.random() < Math.min(1, cf.bl * 2)) {
        scores.sort((x, y) => y[1] - x[1]); const top = scores.filter((q) => q[1] > scores[0][1] - cf.noise && q[1] > -50000); if (top.length) best = top[Math.floor(Math.random() * top.length)][0];
      }
      return best;
    }
    /* a gép a háttérben (Web Worker) gondolkodik – így a magas szinteken sem akad meg a kép és az animáció */
    let AIW = null, aiSeq = 0; const aiCb = {};
    function aiWorker() {
      if (AIW !== null) return AIW;
      try {
        const src = [
          "const VAL=" + JSON.stringify(VAL) + ",PST=" + JSON.stringify(PST) + ";",
          "const isW=" + isW + ",colorOf=" + colorOf + ",rc=" + rc + ",idx=" + idx + ",on=" + on + ";",
          "const KD=" + JSON.stringify(KD) + ",ND=" + JSON.stringify(ND) + ",BD=" + JSON.stringify(BD) + ",RD=" + JSON.stringify(RD) + ";",
          "const clone=" + clone + ",kingSq=" + kingSq + ",inCheck=" + inCheck + ",mvv=" + mvv + ";",
          String(lvlCfg), String(attacked), String(pseudo), String(apply), String(legal), String(evaluate), String(quiesce), String(negamax), String(think),
          "let nodes=0,deadline=0,stop=false;",
          "onmessage=(e)=>{const d=e.data;let m=null;try{m=think(d.s,d.l);}catch(x){}postMessage({id:d.id,m:m});};"
        ].join("\n");
        AIW = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
        AIW.onmessage = (e) => { const f = aiCb[e.data.id]; delete aiCb[e.data.id]; if (f) f(e.data.m); };
        AIW.onerror = () => { AIW = false; Object.keys(aiCb).forEach((k) => { const f = aiCb[k]; delete aiCb[k]; try { f(null, true); } catch (x) {} }); };
      } catch (e) { AIW = false; }
      return AIW;
    }
    function thinkAsync(st, l, cb) {
      const sync = () => setTimeout(() => cb(think(st, l)), 0);
      const w = aiWorker(); if (!w) return sync();
      const id = ++aiSeq; aiCb[id] = (m, failed) => { if (failed) sync(); else cb(m); }; w.postMessage({ id, s: st, l });
      setTimeout(() => { if (aiCb[id]) { delete aiCb[id]; sync(); } }, lvlCfg(l).ms + 5000);
    }
    return { initial, clone, legal, apply, inCheck, kingSq, insufficient, posKey, think, thinkAsync, lvlCfg, sqName, isW, colorOf };
  })();
