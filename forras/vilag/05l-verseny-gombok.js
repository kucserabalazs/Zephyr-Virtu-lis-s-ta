  /* =================================================================== 2/L. BALATON SAILING VR – MŰSZERGOMBOK, SZÜNET, KALIBRÁLÁS, VERSENYMENÜ, VISSZAJÁTSZÁS
     (2026. nov. 14. 22:48, a tulajdonos kérése)
     • A műszer alatt három valódi, megnyomható gomb: MENÜ (a versenymenü táblája), SZÜNET (abban a pillanatban megállítja a játékot),
       KALIBRÁLÁS (a hajót a mostani álló- / ülőhelyedhez és nézési irányodhoz igazítja: a kormányos helye oda kerül, ahol a fejed van, a hajó orra
       arra néz, amerre te). VR-ben sugárral / csippentéssel, 2D-ben egérrel / ujjal nyomható; a kis hajókon a kijelző alatt ugyanez a gombsor.
     • VISSZAJÁTSZÁS: a futam alatt 4-szer másodpercenként rögzítjük minden hajó helyét, irányát, dőlését; a befutó után a futam egy lassan körbeszálló
       DRÓN nézőpontjából visszanézhető (lejátszás / szünet, 1× / 4× / 8×, ugrás az elejére). */
  const VBTN = { list: [] };
  function vrBtnTex(label, sub, col) {
    return canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
      let fs = 46; do { g.font = `900 ${fs}px system-ui, sans-serif`; fs -= 2; } while (g.measureText(label).width > w - 22 && fs > 20); g.fillText(label, w / 2, sub ? 50 : 64); if (sub) { g.font = "700 22px system-ui, sans-serif"; g.fillStyle = "rgba(255,255,255,.85)"; g.fillText(sub, w / 2, 96); } });
  }
  /* a három gomb egy szülőn (a műszerházon / a kijelzőn): w = a sor szélessége, (x, y, z) a sor közepe a szülő terében */
  function vrPodBtns(parent, w, y, z, hk) {
    const defs = [["☰ MENÜ", "versenymenü", ["#1d5a8e", "#0d3560"], () => vrRaceMenu(true)], ["⏸ SZÜNET", "megállít", ["#c98a00", "#7a5200"], () => vrPause(!VRR.paused)], ["◎ KALIBRÁL", "ide igazít", ["#2aa866", "#16703f"], () => vrCalibrate()]];
    const bw = w / 3 * .92, bh = bw * (hk || .45), out = [];
    defs.forEach(([l, sb, col, fn], i) => { const tex = vrBtnTex(l, sb, col), mtx = new THREE.MeshBasicMaterial({ map: tex }), side = new THREE.MeshStandardMaterial({ color: col[1], roughness: .5 });
      W.disposables.push(tex, mtx, side); const geo = new THREE.BoxGeometry(bw, bh, bw * .12); W.disposables.push(geo);
      const b = new THREE.Mesh(geo, [side, side, side, side, mtx, side]); b.position.set(-w / 3 + i * w / 3, y, z); b.userData.noBake = 1; b.userData.noMerge = 1; parent.add(b);
      const st = { b, z0: z, t: 0, hov: false, fn, l };
      b.userData.xr = { hover: (on) => { st.hov = on; }, click: () => { st.t = .18; try { uiSnd("press"); } catch (e) {} try { fn(); } catch (e) { console.warn("gomb", e); } } };
      try { T.xr.extra.add(b); W.objs.push(b); } catch (e) {} out.push(st); VBTN.list.push(st); });
    return out;
  }
  function vrBtnTick(dt) { VBTN.list = VBTN.list.filter((st) => st.b.parent); VBTN.list.forEach((st) => { st.t = Math.max(0, st.t - dt); const d = st.b.geometry.parameters.depth; st.b.position.z = st.z0 - (st.t > 0 ? d * .6 : 0); st.b.scale.setScalar(st.hov ? 1.06 : 1);
    if (st.l.indexOf("SZÜNET") >= 0 || st.l.indexOf("FOLYTAT") >= 0) { const want = VRR.paused ? "▶ FOLYTAT" : "⏸ SZÜNET"; if (st.l !== want) { st.l = want; const m = st.b.material[4]; if (m.map) m.map.dispose(); m.map = vrBtnTex(want, VRR.paused ? "tovább" : "megállít", VRR.paused ? ["#2aa866", "#16703f"] : ["#c98a00", "#7a5200"]); m.needsUpdate = true; } } }); }

  /* ---------------------------------------------------------------- SZÜNET */
  function vrPause(on) { const S = VRR; if (!S.C) return; if (S.net && on) { S.msg = "Online futamban a szünet nem állítja meg a többieket – a versenymenü elérhető."; S.msgT = 5; return; }
    S.paused = !!on; if (on) { S.msg = "SZÜNET – a játék áll. Folytatás: ▶ FOLYTAT gomb (vagy a P billentyű)."; S.msgT = 999; try { T.busMute(["amb", "fx", "race", "vox"], true); try { speechSynthesis.pause(); } catch (e) {} } catch (e) {} vrPauseBoard(true); }   /* szakértői jelentés B.15: szünetben a gombok hangja szól */
    else { S.msgT = 0; try { T.busMute(["amb", "fx", "race", "vox"], false); try { speechSynthesis.resume(); } catch (e) {} } catch (e) {} vrPauseBoard(false); }
    W.panelDirty = 1; }
  function vrPauseBoard(on) { const S = VRR;
    if (!on) { if (S.pauseB) { S.pauseB.destroy(); S.pauseB = null; } return; }
    if (S.pauseB) return; S.pauseB = uiBoard({ w: 1200, h: 520, mw: 1.1, dist: 1.25, y: .05, fps: 2, bar: 110, draw: (B, g) => { uiFrame(B, g, "⏸ SZÜNET", "a játék áll – semmi nem mozdul, amíg nem folytatod");
      B.btn(40, 170, 1120, 130, "▶ FOLYTATÁS", () => vrPause(false), { gold: true, fs: 52 });
      B.btn(40, 320, 360, 150, "☰ Versenymenü", () => { vrPauseBoard(false); vrRaceMenu(true); }); B.btn(420, 320, 360, 150, "◎ Kalibrálás", () => vrCalibrate()); B.btn(800, 320, 360, 150, "↻ Újrakezdés", () => { vrPause(false); vrSetup(VRR.lvl); }); } });
    S.pauseB.show(true); }
  /* a versenyvilág tick-je ezt hívja minden képkockán a legelején: igazat ad, ha szünet van (ilyenkor semmi nem mozdul) */
  function vrPausedTick(dt) { const S = VRR; vrBtnTick(dt); uiTickAll(dt); if (S.raceMenu && !S.paused) return false; return !!S.paused; }

  /* ---------------------------------------------------------------- KALIBRÁLÁS: a kormányos helye a fejed alá, a hajó orra a nézési irányodba */
  function vrCalibrate() { const S = VRR; if (!S.C) return;
    const h = new THREE.Vector3(); try { T.camObj().getWorldPosition(h); } catch (e) { return; } const yaw = T.camYaw ? T.camYaw() : 0;
    /* a fej a rig terében (a W.root a rig gyermeke – a rig maga az origóban áll) */
    S.cal = { yaw, x: T.inVR ? h.x : 0, z: T.inVR ? h.z : 0 };
    try { localStorage.setItem("zephyr-vr-kalibral", JSON.stringify({ t: Date.now() })); } catch (e) {}
    S.msg = "◎ Kalibrálva: a kormányos helye most ott van, ahol állsz, a hajó orra arra néz, amerre nézel."; S.msgT = 5; W.panelDirty = 1; try { beep(); } catch (e) {} }
  /* a vrTick végén: a világ gyökerét a kalibrálás szerint elforgatja és eltolja (a dőlés továbbra sem forgatja a nézőpontot) */
  function vrCalApply() { const S = VRR, c = S.cal; if (!c || !W.root) return; W.root.quaternion.setFromAxisAngle(_YAX, c.yaw); W.root.position.applyAxisAngle(_YAX, c.yaw); W.root.position.x += c.x; W.root.position.z += c.z; }
  const _YAX = new THREE.Vector3(0, 1, 0);

  /* ---------------------------------------------------------------- VERSENYMENÜ (a MENÜ gomb) */
  function vrRaceMenu(on) { const S = VRR;
    if (!on) { if (S.raceMenu) { S.raceMenu.destroy(); S.raceMenu = null; } if (S.menuPaused) { S.menuPaused = false; vrPause(false); } return; }
    if (S.raceMenu) { S.raceMenu.show(true); return; }
    if (!S.net && !S.paused && S.st !== "done") { vrPause(true); vrPauseBoard(false); S.menuPaused = true; }
    S.raceMenu = uiBoard({ w: 1400, h: 900, mw: 1.35, dist: 1.3, y: 0, fps: 2, bar: 120, draw: (B, g) => {
      uiFrame(B, g, "☰ BALATON SAILING VR · VERSENYMENÜ", `${S.lvl ? S.lvl + ". futam" : "oktató futam"} · ${S.C.name}${S.venue ? " · " + S.venue.n : ""}${S.paused ? " · a játék áll" : ""}`);
      const bw = 640, bh = 120, x1 = 40, x2 = 720;
      B.btn(x1, 170, bw, bh, "▶ Vissza a futamba", () => vrRaceMenu(false), { gold: true, fs: 40, sub: "a menü bezárul, a játék folytatódik" });
      B.btn(x2, 170, bw, bh, "↻ Futam újrakezdése", () => { vrRaceMenu(false); vrSetup(S.lvl); }, { sub: "ugyanez a pálya elölről" });
      B.btn(x1, 310, bw, bh, "🗺 Kapitányi tájékoztató", () => { vrRaceMenu(false); vrPreBrief(S.lvl, true); }, { sub: "a pálya útvonala, szél, bóják" });
      B.btn(x2, 310, bw, bh, "◎ Kalibrálás", () => vrCalibrate(), { sub: "a hajó a mostani helyedhez és irányodhoz" });
      B.btn(x1, 450, bw, bh, S.tiller ? "☸ Kormánykerékre váltok" : "⎯ Botkormányra váltok", () => { vrSteerMode(); B.dirty = 1; }, { sub: "csak a Zephyren", off: !!S.pb });
      B.btn(x2, 450, bw, bh, S.seated ? "🧍 Álló mód" : "🪑 Ülő mód", () => { vrSeat(); B.dirty = 1; }, { sub: "testhelyzet a VR-ben" });
      B.btn(x1, 590, bw, bh, "🎥 Visszajátszás (drón)", () => { vrRaceMenu(false); vrReplay(true); }, { sub: "az eddigi futam külső nézetből", off: !(S.rec && S.rec.f.length > 2) });
      B.btn(x2, 590, bw, bh, "⛵ Főmenü – Balaton Sailing VR", () => { vrRaceMenu(false); vrToHarbor(); }, { sub: "hajó, pálya, egyedül / online" });
      B.btn(x1, 730, 1320, 110, "‹ Kilépés a virtuális sétához", () => { vrRaceMenu(false); uiCloseAll(); W.close(); }, { sub: "a Zephyr Apartmanház sétája" }); } });
    S.raceMenu.show(true); }

  /* ---------------------------------------------------------------- RÖGZÍTÉS ÉS DRÓN-VISSZAJÁTSZÁS */
  function vrRecTick(dt) { const S = VRR; if (S.replay || !S.C || S.st === "pre" && S.t < -20) return; const R = S.rec || (S.rec = { f: [], acc: 0, lvl: S.lvl });
    if (R.lvl !== S.lvl) { S.rec = { f: [], acc: 0, lvl: S.lvl }; return; } if (S.st === "done" && R.end) return; R.acc += dt; if (R.acc < .25) return; R.acc = 0;
    const own = S.pb || S.boat, OS = own && own.userData.S;
    const fr = [S.t, S.x, S.z, S.b, OS ? OS.heel || 0 : 0, S.v || 0]; S.riv.forEach((r) => { const rs = r.g && r.g.userData.S; fr.push(r.x, r.z, r.b, rs ? rs.heel || 0 : 0); }); R.f.push(fr);
    if (R.f.length > 9000) R.f.splice(0, 1); if (S.st === "done") R.end = true; }
  function vrReplay(on) { const S = VRR;
    if (!on) { if (!S.replay) return; const P = S.replay; S.replay = null; if (S.repB) { S.repB.destroy(); S.repB = null; }
      /* az állapot visszaállítása, ahol a futam tartott */ Object.assign(S, P.save); S.riv.forEach((r, i) => Object.assign(r, P.rsave[i])); S.cal = P.cal; W.panelDirty = 1; return; }
    if (!S.rec || S.rec.f.length < 3) return; if (S.rec.f[S.rec.f.length - 1][0] <= 0) { S.msg = "🎥 A visszajátszás a rajt után indítható."; S.msgT = 4; return; }   /* szakértői jelentés B.14 */
    if (S.paused) { S.paused = false; vrPauseBoard(false); }
    S.replay = { i: 0, t: S.rec.f[0][0], spd: 1, play: true, a: 0, save: { x: S.x, z: S.z, b: S.b, v: S.v }, rsave: S.riv.map((r) => ({ x: r.x, z: r.z, b: r.b, v: r.v })), cal: S.cal };
    S.repB = uiBoard({ w: 1300, h: 300, mw: 1.0, dist: 1.1, y: -.35, fps: 4, bar: 80, draw: (B, g) => { const P = S.replay; if (!P) return; const F = S.rec.f, t0 = F[0][0], t1 = F[F.length - 1][0];
      uiFrame(B, g, "🎥 VISSZAJÁTSZÁS – DRÓNNÉZET", `${mmss(Math.max(0, P.t))} / ${mmss(Math.max(0, t1))} · ${P.spd}× sebesség`);
      g.fillStyle = "rgba(255,255,255,.15)"; g.fillRect(40, 150, 1220, 14); g.fillStyle = "#ffd166"; g.fillRect(40, 150, 1220 * clamp((P.t - t0) / Math.max(1, t1 - t0), 0, 1), 14);
      B.btn(40, 186, 230, 90, P.play ? "⏸ Szünet" : "▶ Lejátszás", () => { P.play = !P.play; B.dirty = 1; }, { gold: true });
      B.btn(290, 186, 200, 90, "⏮ Elejére", () => { P.t = t0; P.i = 0; B.dirty = 1; });
      [1, 4, 8].forEach((k, j) => B.btn(510 + j * 150, 186, 136, 90, k + "×", () => { P.spd = k; B.dirty = 1; }, { green: P.spd === k }));
      B.btn(980, 186, 280, 90, "✕ Kilépés", () => vrReplay(false), { red: true }); } });
    S.repB.show(true); }
  /* lejátszás: a hajók a rögzített helyükre kerülnek, a nézőpont egy lassan körbeszálló drón (a hajók fölött ~30 m, 60 m-re) */
  function vrReplayTick(dt) { const S = VRR, P = S.replay, F = S.rec.f; if (!P) return false;
    if (P.play) P.t += dt * P.spd; const tEnd = F[F.length - 1][0]; if (P.t >= tEnd) { P.t = tEnd; P.play = false; if (S.repB) S.repB.dirty = 1; }
    while (P.i < F.length - 2 && F[P.i + 1][0] <= P.t) P.i++; while (P.i > 0 && F[P.i][0] > P.t) P.i--;
    const A = F[P.i], Bf = F[Math.min(F.length - 1, P.i + 1)], k = Bf[0] > A[0] ? clamp((P.t - A[0]) / (Bf[0] - A[0]), 0, 1) : 0, L = (j) => A[j] + (Bf[j] - A[j]) * k, LA = (j) => A[j] + wrapA(Bf[j] - A[j]) * k;
    S.x = L(1); S.z = L(2); S.b = LA(3); S.v = L(5); const own = S.pb || S.boat;
    if (own) { const OS = own.userData.S; if (OS) { OS.heel = L(4); OS.pitch = 0; } if (own.userData.body) own.userData.body.rotation.set(0, 0, L(4), "YXZ"); try { own.userData.update(dt); } catch (e) {} }
    S.riv.forEach((r, i) => { const j = 6 + i * 4; if (j + 3 >= A.length) return; r.x = L(j); r.z = L(j + 1); r.b = LA(j + 2); const f = vfwd(r.b); r.g.position.set(r.x, Math.sin(W.t * 1.5 + r.ph) * .06, r.z); r.g.rotation.y = Math.atan2(f[0], f[1]);
      const rs = r.g.userData.S; if (rs) rs.heel = L(j + 3); try { r.g.userData.update(dt); } catch (e) {} });
    /* környezet a saját hajó körül (mint a futamban) */
    S.env.rotation.y = S.b; S.far.rotation.y = S.b; S.env.position.set(-S.x, 0, -S.z).applyAxisAngle(_YAX, S.b);
    const wm = S.water; wm.position.set(Math.round(S.x / 40) * 40, 0, Math.round(S.z / 40) * 40); const mat = wm.userData.mat; S.wt = (S.wt || 0) + dt * .25; try { mat.uniforms.uT.value = S.wt; } catch (e) {}
    /* a flotta közepe (a hajó terében) és a drón */
    let cx = 0, cz = 0, n = 1; S.riv.forEach((r) => { const dx = r.x - S.x, dz = r.z - S.z; if (Math.hypot(dx, dz) < 250) { const q = new THREE.Vector3(dx, 0, dz).applyAxisAngle(_YAX, S.b); cx += q.x; cz += q.z; n++; } }); cx /= n; cz /= n;
    P.a += dt * .07; P.cx = P.cx == null ? cx : P.cx + (cx - P.cx) * Math.min(1, dt * .8); P.cz = P.cz == null ? cz : P.cz + (cz - P.cz) * Math.min(1, dt * .8);
    const R = 62, H = 30, D = new THREE.Vector3(P.cx + Math.sin(P.a) * R, H, P.cz + Math.cos(P.a) * R), yaw = Math.atan2(D.x - P.cx, D.z - P.cz);
    /* a néző (a rig origója) a drónban ül: a világot úgy forgatjuk és toljuk, hogy a drón pontja az origóba, a nézése a flotta felé essen */
    W.root.quaternion.setFromAxisAngle(_YAX, -yaw); W.root.position.copy(D).applyAxisAngle(_YAX, -yaw).negate(); if (!T.inVR) W.root.position.y -= 0;
    vrBtnTick(dt); uiTickAll(dt); return true; }
  /* 2D: P = szünet / folytatás, Esc = versenymenü */
  try { document.addEventListener("keydown", (e) => { if (W.kind !== "race" || !W.active || T.inVR || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
    if (e.key === "p" || e.key === "P") { vrPause(!VRR.paused); e.preventDefault(); } else if (e.key === "Escape") { vrRaceMenu(!VRR.raceMenu); } }); } catch (e) {}
  W.vrReplay = vrReplay; W.vrPause = vrPause; W.vrCalibrate = vrCalibrate; W.vrRaceMenu = vrRaceMenu;
