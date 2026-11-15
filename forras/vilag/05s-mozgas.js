  /* =================================================================== 2/S. MOZGÁS 2.0 – szabad séta és fordulás a kikötőben (2026. nov. 15. este)
     A tulajdonos kérése: „nem megoldott a VR térben történő megfordulás … a legfejlettebb mozgási megoldással, mint szabadkezes, mint kontrolleres módon”.
     A Meta (Quest) kényelmi irányelvei és a mai VR-játékok bevett gyakorlata szerint:
     KONTROLLERREL
       • bal kar: folyamatos séta arra, amerre nézel (a kar kitérésével arányos sebességgel), a látótér szélén finom „alagútlátással” (szédülés ellen);
       • jobb kar oldalra: ugrásszerű fordulás (alap 30°, beállítható 45°, 90° vagy folyamatos), egy pillanatnyi elsötétüléssel;
       • jobb kar előre, tartva: teleport-ív a kontrollerből, a végén célkör – elengedve odaugrasz (ha piros, oda nem lehet);
       • jobb kar hátra: megfordulás (180°).
     KÉZZEL (kontroller nélkül)
       • mutass a pallóra / a partra: célkör jelenik meg – csippents, és odaugrasz;
       • csippents bárhová (nem gombra), és RÁNTSD a kezed oldalra: fordulás arra (újabb rántás = újabb fordulás);
       • a tenyérmenüben (bal tenyér felfelé): ↺ ↻ ⤾, lépés előre/hátra, és a mozgás beállításai.
     Falakon nem lehet átmenni (a házakba az ajtón át), a vízre nem lehet lépni.
     2D-ben: W/A/S/D vagy a nyilak (Q/E: fordulás), telefonon a bal alsó sarokban kör alakú „kar”. */
  const LOC = { cfg: null, hand: {}, aim: null, vigM: null, vigK: 0, blinkM: null, blinkT: 0, snapArm: true, backArm: true, keys: {}, joy: null, mv: 0, sturn: 0, joyEl: null, help: null };
  function locCfg() { if (LOC.cfg) return LOC.cfg; let o = {}; try { o = JSON.parse(localStorage.getItem("zephyr-mozgas") || "{}"); } catch (e) {}
    return (LOC.cfg = Object.assign({ turn: "snap", deg: 30, vig: true, spd: 1.7 }, o)); }
  function locSet(k, v) { const c = locCfg(); c[k] = v; try { localStorage.setItem("zephyr-mozgas", JSON.stringify(c)); } catch (e) {} try { uiSnd("press"); } catch (e) {} }
  function locActive() { return W.active && W.kind === "harbor" && !!HB.walk && !HB.wizOn; }
  /* ---------------------------------------------------------------- hol lehet állni? (a teleport-felületek téglalapjai + a part) */
  function locFloor(x, z) {
    const L = HB.tps || []; for (let i = 0; i < L.length; i++) { const r = L[i]; if (x >= r.x0 - .3 && x <= r.x1 + .3 && z >= r.z0 - .3 && z <= r.z1 + .3) return landWalkY(x, z); }
    if (LAND.built && x > -98 && x < 98 && z > 1.4 && z < 46 && z - landShore(x) > .45) return landWalkY(x, z);
    return null;
  }
  /* ---------------------------------------------------------------- falak: a házak téglalapja, nyílás csak az ajtónál */
  const locIn = (p, B, m) => p.x > B.x0 - m && p.x < B.x1 + m && p.z > B.z0 - m && p.z < B.z1 + m;
  function locDoor(h) { if (h.dr) return h.dr; if (h.kind === "school") return { wall: "w", c: 2.2, w: 1.2 }; return null; }
  function locDoorOk(h, x, z) { const d = locDoor(h), B = h.box; if (!d) return false; const ns = d.wall === "n" || d.wall === "s";
    const along = ns ? x : z, wc = d.wall === "n" ? B.z0 : d.wall === "s" ? B.z1 : d.wall === "w" ? B.x0 : B.x1, perp = ns ? z : x;
    return Math.abs(along - d.c) < d.w / 2 - .1 && Math.abs(perp - wc) < .7; }
  function locWallD(p, B) { if (locIn(p, B, 0)) return Math.min(p.x - B.x0, B.x1 - p.x, p.z - B.z0, B.z1 - p.z); const dx = Math.max(B.x0 - p.x, 0, p.x - B.x1), dz = Math.max(B.z0 - p.z, 0, p.z - B.z1); return Math.hypot(dx, dz); }
  function locBlocked(p, q) {
    const S = HB.solids || []; for (let i = 0; i < S.length; i++) { const r = S[i]; if (q.x > r.x0 - .2 && q.x < r.x1 + .2 && q.z > r.z0 - .2 && q.z < r.z1 + .2) return true; }
    const HL = STN.house ? HOUSES.concat([STN.house]) : HOUSES;
    for (let i = 0; i < HL.length; i++) { const h = HL[i], B = h.box; if (!B || h.kind === "light" && !h.dr) continue;
      if (Math.abs(q.x - (B.x0 + B.x1) / 2) > 12 || Math.abs(q.z - (B.z0 + B.z1) / 2) > 12) continue;
      const a = locIn(p, B, 0), b = locIn(q, B, 0);
      if (a !== b && !locDoorOk(h, (p.x + q.x) / 2, (p.z + q.z) / 2)) return true;
      /* a fal 25 cm-es sávjába se lépj bele (a fejed ne lógjon át a falon) – kivéve az ajtónyílásban; kifelé mindig mehetsz */
      const dq = locWallD(q, B); if (dq < .25 && !locDoorOk(h, q.x, q.z) && dq < locWallD(p, B)) return true; }
    return false;
  }
  /* 2026-11-15 19:24 (tulajdonos a szemüvegből: „nem oda lép, ahova mutatok”): VR-ben a FEJED nincs feltétlenül a játéktér közepén (a szoba egy másik
     pontján állsz, vagy a fordulás után elmozdult) – eddig a játéktér KÖZEPE ugrott a célra, te pedig mellé érkeztél. Most a fejed kerül pontosan a célkörre,
     és a falak, a padló, a tantermek is a fejed helyét nézik. */
  function locHeadOff() { try { if (T.inVR && T.headPos) { const h = T.headPos(); if (h && isFinite(h.x) && isFinite(h.z)) return { x: h.x, z: h.z }; } } catch (e) {} return { x: 0, z: 0 }; }
  function locP() { const p = HB.pos || { x: 0, z: 0 }, o = locHeadOff(); return { x: p.x + o.x, z: p.z + o.z }; }
  function locJump(x, z) { const o = locHeadOff(); HB.pos = { x: x - o.x, z: z - o.z }; }
  function locMove(dx, dz) {
    const o = locHeadOff(), b = HB.pos || { x: 0, z: 0 }, p = { x: b.x + o.x, z: b.z + o.z }; const ok = (q) => locFloor(q.x, q.z) != null && !locBlocked(p, q);
    let q = { x: p.x + dx, z: p.z + dz };
    if (!ok(q)) { const qa = { x: p.x + dx, z: p.z }, qb = { x: p.x, z: p.z + dz }; if (Math.abs(dx) > 1e-4 && ok(qa)) q = qa; else if (Math.abs(dz) > 1e-4 && ok(qb)) q = qb; else return false; }
    HB.pos = { x: q.x - o.x, z: q.z - o.z }; return true;
  }
  /* ---------------------------------------------------------------- fordulás a FEJED körül (nem a játéktér közepe körül) */
  function locTurn(a, smooth) {
    if (!a) return; let v = null;
    try { if (T.inVR && T.rig && T.headPos) { const h = T.headPos(), rp = T.rig.object3D.position; if (h) v = { x: h.x - rp.x, z: h.z - rp.z }; } } catch (e) {}
    if (smooth) { try { T.rig.object3D.rotation.y += a; } catch (e) {} } else hbTurn(a);   /* folyamatos fordulásnál nincs kattanó hang minden képkockán */
    if (v && HB.pos) { const c = Math.cos(a), s = Math.sin(a), nx = v.x * c + v.z * s, nz = -v.x * s + v.z * c; HB.pos = { x: HB.pos.x + v.x - nx, z: HB.pos.z + v.z - nz }; }
    if (!smooth) { locBlink(130); try { hapt(.25, 18); } catch (e) {} }
  }
  /* ---------------------------------------------------------------- pillanatnyi elsötétülés (ugrásnál) és alagútlátás (folyamatos mozgásnál) – a kamerán */
  function locCamObj() { return T.cam && T.cam.object3D; }
  function locBlink(ms) {
    const c = locCamObj(); if (!c) return;
    if (!LOC.blinkM) { const m = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 10), new THREE.MeshBasicMaterial({ color: 0x02060c, side: THREE.BackSide, transparent: true, opacity: 0, depthTest: false, depthWrite: false })); m.renderOrder = 1003; m.frustumCulled = false; m.visible = false; LOC.blinkM = m; }
    if (LOC.blinkM.parent !== c) c.add(LOC.blinkM);
    LOC.blinkT = performance.now(); LOC.blinkD = ms || 130; LOC.blinkM.visible = true; LOC.blinkM.material.opacity = .9;
  }
  function locVig(target, dt) {
    const c = locCamObj(); if (!c) return;
    if (!LOC.vigM) { const cv = document.createElement("canvas"); cv.width = cv.height = 256; const g = cv.getContext("2d"), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(.52, "rgba(0,0,0,0)"); gr.addColorStop(.78, "rgba(2,8,16,.72)"); gr.addColorStop(1, "rgba(2,8,16,.96)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      const t = new THREE.CanvasTexture(cv); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
      m.position.set(0, 0, -.26); m.renderOrder = 1002; m.frustumCulled = false; m.visible = false; LOC.vigM = m; }
    if (LOC.vigM.parent !== c) c.add(LOC.vigM);
    LOC.vigK += (target - LOC.vigK) * Math.min(1, dt * (target > LOC.vigK ? 7 : 4));
    LOC.vigM.visible = T.inVR && LOC.vigK > .02; LOC.vigM.material.opacity = LOC.vigK;
  }
  function locFxTick(dt) {
    const m = LOC.blinkM; if (m && m.visible) { const k = (performance.now() - LOC.blinkT) / LOC.blinkD; if (k >= 1) { m.visible = false; m.material.opacity = 0; } else m.material.opacity = .9 * (1 - k * k); }
  }
  /* ---------------------------------------------------------------- teleport-ív (pöttyös ív + célkör), a jelenetben világkoordinátában */
  /* 2026-11-15 19:24 (tulajdonos: „ez a világító jelzés a lépéshez is ocsmány”): a sárga fényoszlop, a vastag gyűrű és a sárga pöttysor helyett finom,
     a Quest saját kezelőfelületére hasonlító jel: halvány fehér pöttyív, a padlón vékony fehér gyűrű lágy belső fénnyel és egy kis irány-nyíl. Ahova nem lehet lépni: halvány korallpiros. */
  function locAimObj() {
    if (LOC.aimG && LOC.aimG.parent) return LOC.aimG;
    const G = new THREE.Group(); G.renderOrder = 990; T.sceneEl.object3D.add(G);
    const dotM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false }), N = 48;
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(.011, 6, 4), dotM, N); dots.count = 0; dots.frustumCulled = false; G.add(dots);
    const ring = new THREE.Group(); G.add(ring);
    const rM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .92, depthWrite: false, side: THREE.DoubleSide });
    const r1 = new THREE.Mesh(new THREE.RingGeometry(.255, .272, 64), rM); r1.rotation.x = -Math.PI / 2; ring.add(r1);
    const gt = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,.0)"); gr.addColorStop(.62, "rgba(255,255,255,.10)"); gr.addColorStop(.86, "rgba(255,255,255,.30)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const dM = new THREE.MeshBasicMaterial({ map: gt, color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide });
    const r2 = new THREE.Mesh(new THREE.PlaneGeometry(.62, .62), dM); r2.rotation.x = -Math.PI / 2; r2.position.y = -.002; ring.add(r2);
    const fM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide });
    const sh = new THREE.Shape(); sh.moveTo(0, -.215); sh.lineTo(.05, -.15); sh.lineTo(-.05, -.15); sh.closePath();
    const ar = new THREE.Mesh(new THREE.ShapeGeometry(sh), fM); ar.rotation.x = -Math.PI / 2; ar.position.y = .003; ring.add(ar);
    const cM = new THREE.MeshBasicMaterial({ visible: false });
    G.visible = false; LOC.aimG = G; LOC.aimP = { dots, ring, rM, dM, dotM, cM, ar, N }; return G;
  }
  function locAimHide() { if (LOC.aimG) LOC.aimG.visible = false; if (LOC.aim) LOC.aim = null; }
  const _lm4 = new THREE.Matrix4(), _lv = new THREE.Vector3();
  function locAim(S0, key) {
    if (!S0 || !S0.o || !S0.d) return; const G = locAimObj(), P = LOC.aimP, A = LOC.aim || (LOC.aim = {}); A.key = key;
    const rp = W.root.position; let p = S0.o.clone(); const v = S0.d.clone().multiplyScalar(9); A.ok = false; let n = 0, landed = null, wet = false;
    for (let i = 0; i < 70; i++) {
      const st = .028, np = p.clone().addScaledVector(v, st); v.y -= 9.8 * st;
      const lx = np.x - rp.x, lz = np.z - rp.z, ly = np.y - rp.y, fl = locFloor(lx, lz), fy = fl != null ? fl : 0;
      if (ly <= fy) { if (fl != null && Math.hypot(lx - locP().x, lz - locP().z) < 40) { landed = { x: lx, z: lz, y: fl }; A.ok = true; } else wet = true; landed = landed || { x: lx, z: lz, y: Math.max(0, fy) }; break; }
      if (n < P.N && i % 1 === 0) { _lm4.makeTranslation(np.x, np.y, np.z); P.dots.setMatrixAt(n++, _lm4); }
      p = np;
    }
    P.dots.count = n; P.dots.instanceMatrix.needsUpdate = true;
    const col = A.ok ? 0xffffff : 0xff6b5a; P.dotM.color.setHex(col); P.rM.color.setHex(col); P.dM.color.setHex(col);
    if (landed) { P.ring.visible = true; P.ring.position.set(landed.x + rp.x, landed.y + rp.y + .02, landed.z + rp.z); let yaw = 0; try { yaw = T.camYaw(); } catch (e) {} P.ring.rotation.y = yaw; P.ar.visible = A.ok;
      const pu = 1 + .025 * Math.sin(performance.now() / 160); P.ring.scale.set(pu, 1, pu); A.x = landed.x; A.z = landed.z; } else P.ring.visible = false;
    void wet; G.visible = true;
  }
  function locAimGo() {
    const A = LOC.aim; LOC.aim = null; if (LOC.aimG) LOC.aimG.visible = false; if (!A) return;
    if (!A.ok) { try { uiSnd("warn"); } catch (e) {} return; }
    if (HB.seat) { try { roomStand(); } catch (e) {} }
    locBlink(160); locJump(A.x, A.z); try { hapt(.35, 25); } catch (e) {} try { uiSnd("press"); } catch (e) {}
  }
  /* a sugár célköre: ha a kéz/kontroller sugara járható felületen áll, ott látszik, hová lépsz (csippentésre / ravaszra) */
  function locHoverRing() {
    if (LOC.aim) return; const X = T.xr; let hit = null;
    ["right", "left"].some((k) => { const hv = X && X.hov && X.hov[k]; if (hv && hv.kind === "obj" && hv.o && hv.o.userData && hv.o.userData.tp && hv.hit && hv.hit.point) { hit = hv.hit.point; return true; } return false; });
    if (!hit) { if (LOC.aimG && !LOC.aim) LOC.aimG.visible = false; return; }
    const G = locAimObj(), P = LOC.aimP; P.dots.count = 0; const rp = W.root.position, lx = hit.x - rp.x, lz = hit.z - rp.z, fl = locFloor(lx, lz);
    const col = fl != null ? 0xffffff : 0xff6b5a; P.rM.color.setHex(col); P.dM.color.setHex(col); P.ar.visible = fl != null;
    P.ring.visible = true; P.ring.position.set(hit.x, (fl != null ? fl : 0) + rp.y + .02, hit.z); let yaw = 0; try { yaw = T.camYaw(); } catch (e) {} P.ring.rotation.y = yaw; P.ring.scale.set(.8, 1, .8); G.visible = true;
  }
  /* ---------------------------------------------------------------- a jobb kar: fordulás, teleport, megfordulás */
  function locRight(ax, ay, S0, dt) {
    const C = locCfg();
    if (C.turn === "smooth") { if (Math.abs(ax) > .25 && Math.abs(ax) >= Math.abs(ay)) { locTurn(-Math.sign(ax) * (Math.abs(ax) - .25) / .75 * 1.7 * dt, true); LOC.sturn = 1; } else LOC.sturn = 0; }
    else { if (Math.abs(ax) < .35) LOC.snapArm = true; else if (LOC.snapArm && Math.abs(ax) > .7 && Math.abs(ax) >= Math.abs(ay)) { LOC.snapArm = false; locTurn(-Math.sign(ax) * (C.deg || 30) * D2R); } }
    if (ay < -.55 && Math.abs(ay) > Math.abs(ax)) locAim(S0, "right");
    else if (LOC.aim && LOC.aim.key === "right" && ay > -.3) locAimGo();
    if (ay < .4) LOC.backArm = true; else if (LOC.backArm && ay > .8 && Math.abs(ay) > Math.abs(ax)) { LOC.backArm = false; locTurn(Math.PI); }
  }
  /* ---------------------------------------------------------------- kézzel: csippentés + oldalra rántás = fordulás */
  function locHands() {
    const X = T.xr; if (!X || !X.src) return;
    ["left", "right"].forEach((key) => {
      const S0 = X.src[key], st = LOC.hand[key] || (LOC.hand[key] = { on: false, H: [] });
      if (!S0 || !S0.hand || !(X.seen && X.seen[key])) { st.on = false; return; }
      const pin = !!(X.pinch && X.pinch[key]);
      if (pin && !st.on) { const pr = X.press && X.press[key]; st.on = true; st.H = []; st.ui = !!(pr && !(pr.kind === "obj" && pr.o && pr.o.userData && pr.o.userData.tp)); }
      if (!pin) { st.on = false; return; }
      if (st.ui || S0.fist || (X.drag && X.drag[key]) || S0.palmUp) return;
      let h = null; try { h = T.headPos(); } catch (e) {} if (!h || !S0.o) return;
      let yaw = 0; try { yaw = T.camYaw(); } catch (e) {} const lat = (S0.o.x - h.x) * Math.cos(yaw) + (S0.o.z - h.z) * -Math.sin(yaw), now = performance.now();
      st.H.push([now, lat]); while (st.H.length > 2 && now - st.H[1][0] > 400) st.H.shift();
      const dl = lat - st.H[0][1];
      if (Math.abs(dl) > .09 && now - st.H[0][0] < 450) { const C = locCfg(); locTurn(-Math.sign(dl) * ((C.turn === "smooth" ? 30 : C.deg) || 30) * D2R); st.H = []; if (X.press) X.press[key] = null; }
    });
  }
  /* ---------------------------------------------------------------- 2D: billentyűzet és telefonos kör-kar */
  let _locKeysOn = false;
  function locKeysInit() {
    if (_locKeysOn) return; _locKeysOn = true;
    const skip = (e) => { const t = e.target; return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable); };
    document.addEventListener("keydown", (e) => { if (!locActive() || T.inVR || skip(e) || HB.page === "acct") return; const k = e.code; if (/^(Key[WASDQE]|Arrow(Up|Down|Left|Right))$/.test(k)) { LOC.keys[k] = true; e.preventDefault(); } });
    document.addEventListener("keyup", (e) => { LOC.keys[e.code] = false; });
    window.addEventListener("blur", () => { LOC.keys = {}; });
  }
  function locJoy() {
    const want = locActive() && !T.inVR && matchMedia("(pointer: coarse)").matches;
    if (!want) { if (LOC.joyEl) LOC.joyEl.style.display = "none"; LOC.joy = null; return; }
    if (!LOC.joyEl || !LOC.joyEl.isConnected) {
      const host = document.getElementById("worldHud") || document.body, el = document.createElement("div"); el.className = "zloc-joy";
      el.innerHTML = '<div class="zloc-knob"></div><span>séta</span>';
      const css = document.getElementById("zloc-css") || document.createElement("style"); css.id = "zloc-css";
      css.textContent = ".zloc-joy{position:fixed;left:18px;bottom:calc(196px + env(safe-area-inset-bottom));width:132px;height:132px;border-radius:50%;background:radial-gradient(circle,rgba(11,47,94,.55),rgba(7,24,44,.78));border:2.5px solid rgba(228,187,99,.85);box-shadow:0 6px 22px rgba(0,0,0,.35);z-index:99995;touch-action:none;pointer-events:auto;visibility:visible!important}"
        + ".zloc-joy span{position:absolute;left:0;right:0;bottom:-26px;text-align:center;font:700 15px Inter,system-ui,sans-serif;color:#fff;text-shadow:0 1px 4px #000}"
        + ".zloc-knob{position:absolute;left:41px;top:41px;width:50px;height:50px;border-radius:50%;background:linear-gradient(#ffe29a,#d4a13a);box-shadow:0 3px 10px rgba(0,0,0,.4)}";
      document.head.appendChild(css); host.appendChild(el); LOC.joyEl = el; const kn = el.firstChild;
      const upd = (t) => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (t.clientX - cx) / 48, dy = (t.clientY - cy) / 48; const L = Math.hypot(dx, dy); if (L > 1) { dx /= L; dy /= L; } LOC.joy = { x: dx, y: dy }; kn.style.transform = `translate(${dx * 40}px,${dy * 40}px)`; };
      el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); upd(e); e.preventDefault(); e.stopPropagation(); });
      el.addEventListener("pointermove", (e) => { if (LOC.joy) upd(e); e.preventDefault(); });
      const end = () => { LOC.joy = null; kn.style.transform = ""; }; el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
    }
    LOC.joyEl.style.display = "";
  }
  /* ---------------------------------------------------------------- rövid súgó a szemüvegben (először, 12 mp-ig, csippentésre eltűnik) */
  function locHelp(force) {
    if (!T.inVR) return; let seen = false; try { seen = localStorage.getItem("zephyr-mozgas-sugo") === "2"; } catch (e) {} if (seen && !force) return;
    try { localStorage.setItem("zephyr-mozgas-sugo", "2"); } catch (e) {}
    if (LOC.help) { try { LOC.help.parent.remove(LOC.help); } catch (e) {} LOC.help = null; }
    const hasCtl = Object.keys(T.xr.src || {}).some((k) => T.xr.src[k] && T.xr.src[k].src && !T.xr.src[k].hand);
    const tx = canvasTex(1400, 820, (g, w, h) => { g.fillStyle = "rgba(7,24,44,.94)"; uiRR(g, 6, 6, w - 12, h - 12, 46); g.fill(); g.lineWidth = 6; g.strokeStyle = "#E4BB63"; g.stroke();
      g.fillStyle = "#ffd166"; g.font = `900 64px ${UIF}`; g.fillText("Így mozogsz a kikötőben", 60, 110);
      const L = hasCtl ? [["🕹", "Bal kar", "séta arra, amerre nézel"], ["↻", "Jobb kar oldalra", "fordulás (30°)"], ["⤴", "Jobb kar előre, tartva", "teleport-ív – elengedve odaugrasz"], ["⤾", "Jobb kar hátra", "megfordulás"], ["✋", "Bal tenyér felfelé", "menü: forgás, beállítások"]]
        : [["👉", "Mutass a pallóra, csippents", "odaugrasz (a célkör mutatja)"], ["🤏", "Csippents és rántsd oldalra", "fordulás arra"], ["✋", "Bal tenyér felfelé", "menü: ↺ ↻ ⤾, beállítások"], ["⛵", "A móló végén", "a verseny indítása"]];
      L.forEach(([ic, a, b], i) => { const y = 200 + i * 118; g.font = `64px ${UIF}`; g.fillStyle = "#fff"; g.fillText(ic, 70, y + 18); g.font = `800 46px ${UIF}`; g.fillText(a, 170, y); g.font = `600 38px ${UIF}`; g.fillStyle = "#bcd3ea"; g.fillText(b, 170, y + 48); });
      g.fillStyle = "#9fb6cc"; g.font = `600 30px ${UIF}`; g.fillText("csippents rá, és eltűnik · a tenyérmenüben bármikor újra megnézheted", 60, h - 34); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05 * 820 / 1400), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }));
    let h = null, yaw = 0; try { h = T.headPos(); yaw = T.camYaw(); } catch (e) {} if (!h) return;
    m.position.set(h.x - Math.sin(yaw) * 1.3, h.y - .12, h.z - Math.cos(yaw) * 1.3); m.rotation.y = yaw; m.renderOrder = 994; T.sceneEl.object3D.add(m);
    m.userData.xr = { click: () => locHelpClose() }; try { T.xr.extra.add(m); } catch (e) {} LOC.help = m; LOC.helpT = performance.now();
  }
  function locHelpClose() { const m = LOC.help; if (!m) return; LOC.help = null; try { T.xr.extra.delete(m); } catch (e) {} if (m.parent) m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); }
  /* ---------------------------------------------------------------- a mozgás menüje (tenyérmenü) */
  function locMenu() { const C = locCfg(), D = C.deg || 30;
    return [["↺", `Balra ${D}°`, () => locTurn(D * D2R)], ["↻", `Jobbra ${D}°`, () => locTurn(-D * D2R)], ["⤾", "Megfordulok", () => locTurn(Math.PI)], ["⬆", "Előre lépek", () => hbStep(1)], ["⬇", "Hátra lépek", () => hbStep(-1)],
      ["⚙", "Mozgás beállításai", [["↻", "Fordulás 30°", () => { locSet("turn", "snap"); locSet("deg", 30); }, C.turn === "snap" && D === 30], ["↻", "Fordulás 45°", () => { locSet("turn", "snap"); locSet("deg", 45); }, C.turn === "snap" && D === 45],
        ["↻", "Fordulás 90°", () => { locSet("turn", "snap"); locSet("deg", 90); }, C.turn === "snap" && D === 90], ["⟳", "Folyamatos fordulás", () => locSet("turn", "smooth"), C.turn === "smooth"],
        ["◎", C.vig ? "Alagútlátás ki" : "Alagútlátás be", () => locSet("vig", !C.vig), !!C.vig],
        ["🐢", "Lassú séta", () => locSet("spd", 1.1), C.spd < 1.4], ["🚶", "Normál séta", () => locSet("spd", 1.7), C.spd >= 1.4 && C.spd < 2.2], ["🏃", "Gyors séta", () => locSet("spd", 2.8), C.spd >= 2.2]]],
      ["❔", "Hogyan mozogjak?", () => locHelp(true)]]; }
  /* ---------------------------------------------------------------- minden képkockán (a hbTick-ből) */
  function locTick(dt) {
    locKeysInit(); locFxTick(dt); locJoy();
    if (LOC.help && (performance.now() - LOC.helpT > 14000 || !T.inVR)) locHelpClose();
    if (!locActive()) { locVig(0, dt); locAimHide(); return; }
    const C = locCfg(); let mx = 0, mz = 0; LOC.sturn = 0;
    if (T.inVR) {
      const X = T.xr || {}, S = X.src || {};
      ["left", "right"].forEach((key) => { const S0 = S[key]; if (!S0 || !S0.src || S0.hand || !(X.seen && X.seen[key])) return; const gp = S0.src.gamepad; if (!gp || !gp.axes) return;
        const ax = (gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0]) || 0, ay = (gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1]) || 0;
        if (key === "left") { mx = ax; mz = ay; } else locRight(ax, ay, S0, dt); });
      locHands(); locHoverRing();
      if (!LOC.helpTried) { LOC.helpTried = 1; setTimeout(() => { if (locActive()) locHelp(false); }, 2500); }
    } else {
      const K = LOC.keys; mz = (K.KeyS || K.ArrowDown ? 1 : 0) - (K.KeyW || K.ArrowUp ? 1 : 0); mx = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0);
      const tr = (K.KeyQ || K.ArrowLeft ? 1 : 0) - (K.KeyE || K.ArrowRight ? 1 : 0); if (tr) { locTurn(tr * 1.6 * dt, true); }
      if (LOC.joy) { mx = LOC.joy.x; mz = LOC.joy.y; }
    }
    const m = Math.hypot(mx, mz);
    if (m > .18) {
      if (HB.seat) { try { roomStand(); } catch (e) {} return; }
      const k = Math.min(1, (m - .18) / .72), sp = C.spd * (.35 + .65 * k) * (T.inVR ? 1 : 1.25); let yaw = 0; try { yaw = T.camYaw(); } catch (e) {}
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw), f = -mz / m, r = mx / m;
      locMove((fx * f + rx * r) * sp * dt, (fz * f + rz * r) * sp * dt); LOC.mv = 1;
    } else LOC.mv = 0;
    locVig(C.vig && (LOC.mv || LOC.sturn) ? .9 : 0, dt);
  }
  W._loc = { LOC, move: (dx, dz) => locMove(dx, dz), floor: locFloor, blocked: locBlocked, turn: locTurn, cfg: locCfg, help: locHelp, aim: locAim, aimGo: locAimGo, right: locRight };   /* tesztekhez */
