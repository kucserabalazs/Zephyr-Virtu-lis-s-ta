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
  /* 2026-11-16 04:2x (tulajdonos): „egyetlen gomb legyen a kormányon, a másik kettőt vegyük le – az egy STOP / SZÜNET gomb legyen”: a műszer alatt csak a ⏸ SZÜNET
     marad (nagyobb, könnyebb eltalálni); a MENÜ és a KALIBRÁL gomb lekerült – a versenymenü és a bemérés a szünet tábláján (és a tenyérmenüben) érhető el.
     w = a sor szélessége, (x, y, z) a gomb közepe a szülő terében */
  function vrPodBtns(parent, w, y, z, hk) {
    const defs = [["⏸ SZÜNET", "megállít", ["#c98a00", "#7a5200"], () => vrPauseToggle()]];
    const bw = Math.min(w * .66, .34), bh = bw * (hk || .45), out = [];
    defs.forEach(([l, sb, col, fn], i) => { const tex = vrBtnTex(l, sb, col), mtx = new THREE.MeshBasicMaterial({ map: tex }), side = new THREE.MeshStandardMaterial({ color: col[1], roughness: .5 });
      W.disposables.push(tex, mtx, side); const geo = new THREE.BoxGeometry(bw, bh, bw * .12); W.disposables.push(geo);
      const b = new THREE.Mesh(geo, [side, side, side, side, mtx, side]); b.position.set((i - (defs.length - 1) / 2) * w / 3, y, z); b.userData.noBake = 1; b.userData.noMerge = 1; parent.add(b);
      const st = { b, z0: z, t: 0, hov: false, fn, l };
      b.userData.xr = { hover: (on) => { st.hov = on; }, click: () => { st.t = .18; try { uiSnd("press"); } catch (e) {} try { fn(); } catch (e) { console.warn("gomb", e); } } };
      try { T.xr.extra.add(b); W.objs.push(b); } catch (e) {} out.push(st); VBTN.list.push(st); });
    return out;
  }
  function vrBtnTick(dt) { VBTN.list = VBTN.list.filter((st) => st.b.parent); VBTN.list.forEach((st) => { st.t = Math.max(0, st.t - dt); const d = st.b.geometry.parameters.depth; st.b.position.z = st.z0 - (st.t > 0 ? d * .6 : 0); st.b.scale.setScalar(st.hov ? 1.06 : 1);
    if (st.l.indexOf("SZÜNET") >= 0 || st.l.indexOf("FOLYTAT") >= 0) { const want = VRR.paused ? "▶ FOLYTAT" : "⏸ SZÜNET"; if (st.l !== want) { st.l = want; const m = st.b.material[4]; if (m.map) m.map.dispose(); m.map = vrBtnTex(want, VRR.paused ? "bemérés vagy tovább" : "megállít", VRR.paused ? ["#2aa866", "#16703f"] : ["#c98a00", "#7a5200"]); m.needsUpdate = true; } } }); }

  /* ---------------------------------------------------------------- SZÜNET */
  function vrPause(on) { const S = VRR; if (!S.C) return; if (S.net && on) { S.msg = "Online futamban a szünet nem állítja meg a többieket – a versenymenü elérhető."; S.msgT = 5; return; }
    S.paused = !!on; if (on) { S.msg = "SZÜNET – a játék áll. Folytatás: ▶ FOLYTAT gomb (vagy a P billentyű)."; S.msgT = 999; try { T.busMute(["amb", "fx", "race", "vox"], true); try { speechSynthesis.pause(); } catch (e) {} } catch (e) {} vrPauseBoard(true); }   /* szakértői jelentés B.15: szünetben a gombok hangja szól */
    else { S.msgT = 0; try { T.busMute(["amb", "fx", "race", "vox"], false); try { speechSynthesis.resume(); } catch (e) {} } catch (e) {} vrPauseBoard(false); }
    W.panelDirty = 1; }
  function vrPauseBoard(on) { const S = VRR;
    if (!on) { if (S.pauseB) { S.pauseB.destroy(); S.pauseB = null; } return; }
    /* 2026-11-16 04:2x (tulajdonos): „a szünet gombnak, hogyha az ember kimegy és elmozdul a helyéről, az újraindításkor legyen egy kalibrálási lehetőség: az elindulás előtt akar-e
       kalibrálni, vagy rögtön folytatni szeretné” – VR-ben a folytatásnál két nagy gomb: rögtön tovább, vagy előbb bemérés (a játék a bemérés végéig áll, utána magától megy tovább) */
    if (S.pauseB) return; S.pauseB = uiBoard({ w: 1200, h: 600, mw: 1.1, dist: 1.25, y: .05, fps: 2, bar: 110, draw: (B, g) => { const cal = calActive();
      uiFrame(B, g, "⏸ SZÜNET", cal ? "a játék áll – folytatás előtt választhatsz: rögtön tovább, vagy előbb bemérlek" : "a játék áll – semmi nem mozdul, amíg nem folytatod");
      if (cal) { B.btn(40, 160, 560, 220, "▶ FOLYTATÁS", () => vrPause(false), { gold: true, fs: 56, sub: "rögtön, ahol abbahagytad" });
        B.btn(640, 160, 520, 220, "◎ BEMÉRÉS, MAJD FOLYTATÁS", () => vrResumeCal(), { fs: 36, sub: "ha elmozdultál a helyedről" }); }
      else B.btn(40, 160, 1120, 160, "▶ FOLYTATÁS", () => vrPause(false), { gold: true, fs: 52 });
      B.btn(40, cal ? 410 : 350, 560, 150, "☰ Versenymenü", () => { vrPauseBoard(false); vrRaceMenu(true); }); B.btn(640, cal ? 410 : 350, 520, 150, "↻ Újrakezdés", () => { vrPause(false); vrSetup(VRR.lvl); }); } });
    S.pauseB.show(true); }
  /* a műszer SZÜNET gombja és a tenyérmenü szünet / folytatás gombja: futás közben megállít; szünetben a táblát újra a nézésed elé hozza (ott választasz: tovább / bemérés) */
  function vrPauseToggle() { const S = VRR; if (!S.C) return; if (!S.paused) { vrPause(true); return; }
    if (S.calR) return; if (!calActive()) { vrPause(false); return; } vrPauseBoard(false); vrPauseBoard(true); }
  /* szünet után: előbb bemérés, aztán folytatás – a játék a bemérés végéig áll, a végén a bemérés (vrCalEnd) folytatja */
  function vrResumeCal() { const S = VRR; if (!S.C) return; if (!calActive() || !S.paused) { vrPause(false); return; }
    vrPauseBoard(false); S.msgT = 0; S.calResume = true; vrCalStart("resume"); }
  /* a versenyvilág tick-je ezt hívja minden képkockán a legelején: igazat ad, ha szünet van (ilyenkor semmi nem mozdul) */
  function vrPausedTick(dt) { const S = VRR; vrBtnTick(dt); uiTickAll(dt); if (S.raceMenu && !S.paused) return false; return !!S.paused; }

  /* ---------------------------------------------------------------- KALIBRÁLÁS: a kormányos helye a fejed alá, a hajó orra a nézési irányodba */
  function vrCalibrate() { const S = VRR; if (!S.C) return;
    if (calActive()) { vrCalStart("button"); return; }   /* 2026-11-16: VR-ben bemérés + ellenőrzés, a játék addig áll (05zd) */
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
      B.btn(x1, 730, 1320, 110, "‹ " + BACK_T(), () => { vrRaceMenu(false); uiCloseAll(); W.close(); }, { sub: BACK_S("a Zephyr Apartmanház sétája") }); } });
    S.raceMenu.show(true); }

  /* ---------------------------------------------------------------- RÖGZÍTÉS ÉS DRÓN-VISSZAJÁTSZÁS */
  /* 2026-11-15 19:56 (tulajdonos: „a visszajátszásban a vitorla állása az aktuális állapotot mutatja, nem a felvételkorit”): a felvétel most a vitorlák
     állapotát is rögzíti (látszólagos szélszög és -erő, melyik oldalon áll a vitorla, spinakker, dőlés, bólintás) – minden hajónál, 4 kép/mp-cel. */
  const REC_OWN = 11, REC_RIV = 9;
  function vrRecSail(OS) { return OS ? [OS.awa != null ? OS.awa : 60, OS.aws != null ? OS.aws : 5, OS.side || 1, OS.spin != null ? +OS.spin || 0 : 0] : [60, 5, 1, 0]; }
  function vrRecTick(dt) { const S = VRR; if (S.replay || !S.C || S.st === "pre" && S.t < -20) return; const R = S.rec || (S.rec = { f: [], acc: 0, lvl: S.lvl, v: 2 });
    if (R.lvl !== S.lvl || R.v !== 2) { S.rec = { f: [], acc: 0, lvl: S.lvl, v: 2 }; return; } if (S.st === "done" && R.end) return; R.acc += dt; if (R.acc < .25) return; R.acc = 0;
    const own = S.pb || S.boat, OS = own && own.userData.S;
    const fr = [S.t, S.x, S.z, S.b, OS ? OS.heel || 0 : 0, S.v || 0].concat(vrRecSail(OS), [OS ? OS.pitch || 0 : 0]);
    S.riv.forEach((r) => { const rs = r.g && r.g.userData.S; fr.push(r.x, r.z, r.b, rs ? rs.heel || 0 : 0); fr.push.apply(fr, vrRecSail(rs)); fr.push(r.v || 0); }); R.f.push(fr);
    if (R.f.length > 9000) R.f.splice(0, 1); if (S.st === "done") R.end = true; }
  function vrReplay(on) { const S = VRR;
    if (!on) { if (!S.replay) return; const P = S.replay; S.replay = null; if (S.repB) { S.repB.destroy(); S.repB = null; }
      /* az állapot visszaállítása, ahol a futam tartott */ Object.assign(S, P.save); S.riv.forEach((r, i) => Object.assign(r, P.rsave[i])); S.cal = P.cal; W.panelDirty = 1; return; }
    if (!S.rec || S.rec.f.length < 3) return; if (S.rec.f[S.rec.f.length - 1][0] <= 0) { S.msg = "🎥 A visszajátszás a rajt után indítható."; S.msgT = 4; return; }   /* szakértői jelentés B.14 */
    if (S.paused) { S.paused = false; vrPauseBoard(false); }
    S.replay = { i: 0, t: S.rec.f[0][0], spd: 1, play: true, a: 0, cam: "auto", camT: 0, save: { x: S.x, z: S.z, b: S.b, v: S.v }, rsave: S.riv.map((r) => ({ x: r.x, z: r.z, b: r.b, v: r.v })), cal: S.cal };
    S.repB = uiBoard({ w: 1300, h: 410, mw: .82, dist: 1.2, y: -.42, dock: "bottom", fps: 4, bar: 80, draw: (B, g) => { const P = S.replay; if (!P) return; const F = S.rec.f, t0 = F[0][0], t1 = F[F.length - 1][0];
      const cn = (REP_CAMS.find((q) => q[0] === P.cam) || REP_CAMS[0])[1]; uiFrame(B, g, "🎥 VISSZAJÁTSZÁS", `${mmss(Math.max(0, P.t))} / ${mmss(Math.max(0, t1))} · ${P.spd}× · ${cn}${P.cam === "auto" ? " (" + ((REP_CAMS.find((q) => q[0] === P.mode) || [0, ""])[1]) + ")" : ""}`);
      g.fillStyle = "rgba(255,255,255,.15)"; g.fillRect(40, 150, 1220, 14); g.fillStyle = "#ffd166"; g.fillRect(40, 150, 1220 * clamp((P.t - t0) / Math.max(1, t1 - t0), 0, 1), 14);
      B.btn(40, 186, 230, 90, P.play ? "⏸ Szünet" : "▶ Lejátszás", () => { P.play = !P.play; B.dirty = 1; }, { gold: true });
      B.btn(290, 186, 200, 90, "⏮ Elejére", () => { P.t = t0; P.i = 0; B.dirty = 1; });
      [1, 4, 8].forEach((k, j) => B.btn(510 + j * 150, 186, 136, 90, k + "×", () => { P.spd = k; B.dirty = 1; }, { green: P.spd === k }));
      B.btn(980, 186, 280, 90, "✕ Kilépés", () => vrReplay(false), { red: true });
      REP_CAMS.forEach(([id, lb], j) => B.btn(40 + j * 205, 296, 195, 90, lb, () => { P.cam = id; P.camT = 0; P.cut = true; B.dirty = 1; }, { green: P.cam === id, fs: 26 })); } });
    S.repB.show(true); }
  /* lejátszás: a hajók a rögzített helyükre kerülnek, a nézőpont egy lassan körbeszálló drón (a hajók fölött ~30 m, 60 m-re) */
  /* 2026-11-15 19:56 (tulajdonos: „a visszajátszás minősége és látványossága legyen magasabb szintű”): mozi-kamerák. Az „Automatikus” mód 9 másodpercenként
     vált: körbeszálló drón · követő kamera a hajó mögött · oldalról kísérő kamera a vitorlákkal · a következő bója mellől a víz színéről · felülnézet.
     2D-ben a kamera simán úszik át egyik nézetből a másikba; VR-ben (hogy ne szédülj) a váltás egy rövid elsötétüléssel történik, és a kamera csak lassan mozog.
     A hajók a valódi (látott) hullámokon ringanak, a vitorlák a felvétel szerint állnak, a nyomvonal és a permet is a felvételből épül újra. */
  const REP_CAMS = [["auto", "🎬 Automatikus"], ["dron", "🚁 Drón"], ["kov", "⛵ Követő"], ["old", "↔ Oldalról"], ["boja", "🟠 Bójánál"], ["fent", "🗺 Felülről"]];
  function vrRepCam(P, S, dt) {
    const mode = P.cam === "auto" ? REP_CAMS[1 + Math.floor(P.camT / 9) % 5][0] : P.cam; if (mode !== P.mode) { P.mode = mode; P.cut = true; } P.camT += dt;
    const f = vfwd(S.b), side = [-f[1], f[0]]; let eye, look;   /* tó-koordinátában */
    if (mode === "dron") { P.a += dt * .09; let cx = S.x, cz = S.z, n = 1; S.riv.forEach((r) => { if (Math.hypot(r.x - S.x, r.z - S.z) < 220) { cx += r.x; cz += r.z; n++; } }); cx /= n; cz /= n; eye = [cx + Math.sin(P.a) * 70, 32, cz + Math.cos(P.a) * 70]; look = [cx, 0, cz]; }
    else if (mode === "kov") { eye = [S.x - f[0] * 26 + side[0] * 4, 7.5, S.z - f[1] * 26 + side[1] * 4]; look = [S.x + f[0] * 12, 3, S.z + f[1] * 12]; }
    else if (mode === "old") { const sd = (Math.floor(P.camT / 18) % 2) ? 1 : -1; eye = [S.x + side[0] * 17 * sd + f[0] * 6, 2.6, S.z + side[1] * 17 * sd + f[1] * 6]; look = [S.x, 4.5, S.z]; }
    else if (mode === "boja") { const m = S.marks[Math.min(S.marks.length - 1, P.mi || 0)] || { x: S.x, z: S.z }; const d = Math.hypot(m.x - S.x, m.z - S.z), ux = (S.x - m.x) / (d || 1), uz = (S.z - m.z) / (d || 1);
      eye = [m.x - uz * 14 - ux * 6, 1.6, m.z + ux * 14 - uz * 6]; look = [S.x, 3, S.z]; }
    else { eye = [S.x - f[0] * 30, 140, S.z - f[1] * 30]; look = [S.x + f[0] * 40, 0, S.z + f[1] * 40]; }
    /* a következő bója kiválasztása a „Bójánál” nézethez: amelyikhez a saját hajó a legközelebb van */
    if (S.marks && S.marks.length) { let bi = 0, bd = 1e9; S.marks.forEach((m, i) => { const d = Math.hypot(m.x - S.x, m.z - S.z); if (d < bd) { bd = d; bi = i; } }); P.mi = bi; }
    const k = P.cut || !P.eye ? 1 : Math.min(1, dt * (T.inVR ? .7 : 1.6)); if (P.cut && T.inVR) { try { locBlink(260); } catch (e) {} }
    if (P.cut) { P.eye = eye.slice(); P.look = look.slice(); P.cut = false; } else for (let q = 0; q < 3; q++) { P.eye[q] += (eye[q] - P.eye[q]) * k; P.look[q] += (look[q] - P.look[q]) * k; }
    return { eye: P.eye, look: P.look };
  }
  function vrReplayTick(dt) { const S = VRR, P = S.replay, F = S.rec.f; if (!P) return false;
    if (P.play) P.t += dt * P.spd; const tEnd = F[F.length - 1][0]; if (P.t >= tEnd) { P.t = tEnd; P.play = false; if (S.repB) S.repB.dirty = 1; }
    while (P.i < F.length - 2 && F[P.i + 1][0] <= P.t) P.i++; while (P.i > 0 && F[P.i][0] > P.t) P.i--;
    const A = F[P.i], Bf = F[Math.min(F.length - 1, P.i + 1)], k = Bf[0] > A[0] ? clamp((P.t - A[0]) / (Bf[0] - A[0]), 0, 1) : 0, L = (j) => A[j] + (Bf[j] - A[j]) * k, LA = (j) => A[j] + wrapA(Bf[j] - A[j]) * k, Q = (j) => (k < .5 ? A[j] : Bf[j]);
    const sail = (OS, j) => { if (!OS) return; OS.awa = L(j); OS.aws = L(j + 1); OS.side = Q(j + 2); if (OS.spin != null) OS.spin = L(j + 3); };
    S.x = L(1); S.z = L(2); S.b = LA(3); S.v = L(5); const own = S.pb || S.boat;
    if (own) { const OS = own.userData.S; if (OS) { OS.heel = L(4); OS.pitch = A.length > 10 ? L(10) : 0; sail(OS, 6); } try { own.userData.update(dt); } catch (e) {} own.position.y = rwHullMotion(P.hmO || (P.hmO = {}), S.x, S.z, S.b, own === S.pb ? Math.max(1.6, S.cls.half * 2) : 10.8, own === S.pb ? 1.55 : 3.6, dt, own === S.pb ? rwHullP(S.cls.id) : HM_HEAVY)[0]; }
    S.riv.forEach((r, i) => { const j = REC_OWN + i * REC_RIV; if (j + REC_RIV - 1 >= A.length) return; r.x = L(j); r.z = L(j + 1); r.b = LA(j + 2); r.v = L(j + 8); const f = vfwd(r.b);
      const hmR = rwHullMotion((P.hmR || (P.hmR = []))[i] || (P.hmR[i] = {}), r.x, r.z, r.b, (S.cls ? S.cls.half : 6) * 1.8, S.cls && S.cls.half < 4 ? 1.6 : 3.6, dt, rwHullP(S.cls && S.cls.id));   /* 2026-11-16: mint a futamban (05z) */
      r.g.position.set(r.x, hmR[0], r.z); r.g.rotation.y = Math.atan2(f[0], f[1]);
      const rs = r.g.userData.S; if (rs) { rs.heel = L(j + 3); sail(rs, j + 4); rs.pitch = -hmR[1]; } try { r.g.userData.update(dt); } catch (e) {}
      try { if (r.wk) r.wk.push(r.x, r.z, r.g.rotation.y, r.v || 0, dt * P.spd, .05); } catch (e) {} });
    try { const f = vfwd(S.b); S.wake.push(S.x, S.z, Math.atan2(f[0], f[1]), S.v, dt * P.spd, .05); } catch (e) {}
    /* környezet a saját hajó körül (mint a futamban) */
    S.env.rotation.y = S.b; S.far.rotation.y = S.b; S.env.position.set(-S.x, 0, -S.z).applyAxisAngle(_YAX, S.b);
    try { rwUpdate(dt); } catch (e) {}   /* VÍZ 2.0 (05x) */ try { rwFloatTick(dt); } catch (e) {}
    try { if (P.play && S.v > 4.5 && Math.random() < dt * .6) S.sprayBurst = 1; rwSprayTick(dt); } catch (e) {}
    /* mozi-kamera: a világot úgy forgatjuk és toljuk, hogy a kamera pontja az origóba, a nézése a választott cél felé essen */
    const cam = vrRepCam(P, S, dt), c = Math.cos(S.b), s2 = Math.sin(S.b), toRoot = (x, y, z) => { const dx = x - S.x, dz = z - S.z; return new THREE.Vector3(dx * c + dz * s2, y, -dx * s2 + dz * c); };
    const E = toRoot(cam.eye[0], cam.eye[1], cam.eye[2]), Lk = toRoot(cam.look[0], cam.look[1], cam.look[2]), yaw = Math.atan2(-(Lk.x - E.x), -(Lk.z - E.z));
    W.root.quaternion.setFromAxisAngle(_YAX, -yaw); W.root.position.copy(E).applyAxisAngle(_YAX, -yaw).negate();
    if (!T.inVR) { const pitch = Math.atan2(Lk.y - E.y, Math.hypot(Lk.x - E.x, Lk.z - E.z)); try { const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject && !P.userLook) { lc.pitchObject.rotation.x += (pitch - lc.pitchObject.rotation.x) * Math.min(1, dt * 2); lc.yawObject.rotation.y += (0 - lc.yawObject.rotation.y) * Math.min(1, dt * 2); } } catch (e) {} }
    vrBtnTick(dt); uiTickAll(dt); return true; }
  /* 2D: P = szünet / folytatás, Esc = versenymenü */
  try { document.addEventListener("keydown", (e) => { if (W.kind !== "race" || !W.active || T.inVR || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
    if (e.key === "p" || e.key === "P") { vrPause(!VRR.paused); e.preventDefault(); } else if (e.key === "Escape") { vrRaceMenu(!VRR.raceMenu); } }); } catch (e) {}
  W.vrReplay = vrReplay; W.vrPause = vrPause; W.vrPauseToggle = vrPauseToggle; W.vrResumeCal = vrResumeCal; W.vrCalibrate = vrCalibrate; W.vrRaceMenu = vrRaceMenu;
