  /* =================================================================== 2/N. BALATON SAILING VR – A VERSENY INDÍTÁSA (2026. nov. 14. 22:48, a tulajdonos kérése)
     „A verseny indítása a következőképp alakuljon:
        1. Egyedüli vagy online játék, aztán tovább nyíl
        2. Hajó választása – kormány vagy botkormány – nappali, éjszakai vagy vegyes pálya – egyforma hajók versenye (one design) vagy vegyes,
           ahol mindenféle hajó indulhat (a vegyesnél nincs hivatalos pontszámlálás, független a ranglistától és mindentől)
        3. Pálya kiválasztása vagy 3–5 szakaszos verseny véletlenszerű pályákkal
        4. Kapitányi tájékoztató, ahol bemutatják az adott pálya pontos útvonalát. Itt pedig START, és jöhet a játék.
      Minden játék után a következő megkezdése előtt legyen kapitányi tájékoztatás. A menü végigvitele fekete háttérben történik,
      3 dimenziós illusztrációval, térbeli forgó hajóval.”
     Megvalósítás: a kikötő világán belül egy fekete „bemutatóterem” (a kikötő, az ég és a víz ilyenkor rejtve): fénylő talapzaton forog a választott
     hajó 3D modellje, mellette a lépésenkénti tábla. A kikötő továbbra is bejárható („Séta a kikötőben”): a mólóra bökve / az ívvel odaugorva sétálhatsz
     a hajók között, valódi méretarányban. A játék neve: BALATON SAILING VR. */
  const WZ_STEPS = ["Játékmód", "Hajó", "Pálya", "Tájékoztató"];
  function wzLoad() { let o = {}; try { o = JSON.parse(localStorage.getItem("zephyr-bsvr") || "{}"); } catch (e) {} let st = "bot"; try { st = localStorage.getItem("zephyr-kormany") === "kerek" ? "kerek" : "bot"; } catch (e) {}
    return Object.assign({ mode: "solo", cls: vrClsId(), steer: st, tod: "nap", fleet: "od", kind: "series", lvl: 1, n: 5 }, o); }
  function wzSave() { const Z = HB.wz, kw = { zephyr: "both", tutaj: "both", flamingo: "kerek" }[Z.cls] || "bot"; try { localStorage.setItem("zephyr-bsvr", JSON.stringify(Z)); localStorage.setItem("zephyr-hajo", Z.cls); localStorage.setItem("zephyr-kormany", kw === "both" ? Z.steer : kw); } catch (e) {} try { acctSync(); } catch (e) {} }
  /* ---------------------------------------------------------------- a fekete bemutatóterem */
  function wzBuild(root) {
    const G = new THREE.Group(); G.visible = false; root.add(G); HB.wzG = G;
    const sph = new THREE.Mesh(new THREE.SphereGeometry(70, 32, 16), new THREE.MeshBasicMaterial({ color: "#000000", side: THREE.BackSide, fog: false, depthWrite: false })); sph.renderOrder = -50; G.add(sph); W.disposables.push(sph.geometry, sph.material);
    /* halvány „csillagpor” a sötétben – mélységérzet */
    { const N = 900, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const th = Math.random() * TAU, ph = Math.acos(Math.random() * 1.6 - .6), r = 30 + Math.random() * 30; pos[i * 3] = Math.sin(ph) * Math.cos(th) * r; pos[i * 3 + 1] = Math.cos(ph) * r * .8 + 4; pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r; }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); const m = new THREE.PointsMaterial({ color: "#8fb6d6", size: .07, transparent: true, opacity: .55, fog: false, depthWrite: false }); W.disposables.push(g, m); G.add(new THREE.Points(g, m)); }
    /* fényes padló-folt és arany gyűrűk */
    { const t = canvasTex(512, 512, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(40,70,110,.55)"); r.addColorStop(.5, "rgba(14,26,44,.35)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); fl.rotation.x = -Math.PI / 2; fl.position.y = .01; G.add(fl); W.disposables.push(fl.geometry, fl.material); }
    /* a talapzat a nézőtől balra elöl */
    const yaw = .52, dist = 2.9, px = -Math.sin(yaw) * dist, pz = -Math.cos(yaw) * dist; HB.wzP = new THREE.Vector3(px, 0, pz);
    { const gold = std({ color: "#d4a13a", metalness: .85, roughness: .25 }), dark = std({ color: "#0d1520", metalness: .5, roughness: .35 });
      const ped = new THREE.Group(); ped.position.set(px, 0, pz); G.add(ped);
      mesh(new THREE.CylinderGeometry(.95, 1.05, .62, 48).translate(0, .31, 0), dark, ped); mesh(new THREE.TorusGeometry(.97, .025, 10, 64).rotateX(Math.PI / 2).translate(0, .62, 0), gold, ped); mesh(new THREE.TorusGeometry(1.05, .02, 10, 64).rotateX(Math.PI / 2).translate(0, .04, 0), gold, ped);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(.92, 48), new THREE.MeshBasicMaterial({ color: "#3a78b8", transparent: true, opacity: .35, fog: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = .625; ped.add(glow); W.disposables.push(glow.geometry, glow.material);
      /* fénycsóva felülről */
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(.35, 1.1, 4.2, 40, 1, true), new THREE.MeshBasicMaterial({ color: "#cfe6ff", transparent: true, opacity: .045, side: THREE.DoubleSide, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); cone.position.y = 2.75; ped.add(cone); W.disposables.push(cone.geometry, cone.material);
      HB.wzPed = ped; }
    const sp = new THREE.PointLight("#ffe2b0", 2.2, 9, 1.4); sp.position.set(px + .8, 3.2, pz + 1.2); G.add(sp); const rim = new THREE.PointLight("#7fb8ff", 1.6, 9, 1.4); rim.position.set(px - 1.4, 1.6, pz - 1.4); G.add(rim);
  }
  function wzModel(id) {
    if (HB.wzM && HB.wzM.id === id) return; if (HB.wzM) { HB.wzPed.remove(HB.wzM.g); HB.wzM = null; }
    const nm = vrProfile().name || ""; let g;
    /* 00:46: a Zephyr modellje ugyanaz a kidolgozott hajó, mint a futamon (díszes vitorlák, vitorlaablakok, finom részletek) */
    if (id === "zephyr") g = makeBoat({ sailName: nm, detail: 0, vis: false, crew: 0, hull: "#f5f2e8", boot: "#141d4d", stripe: "#141d4d", jib: "#f6f4ec", main: "#d61f26", num: " ", cls: " ", logoImg: "img/zephyr-hajo-logo.png", reg: "H-30381", lazyBag: "#6e1423", nsCol: "#3f6fa6", teakDeck: true, spin: ["#ffffff", "#ffffff", "#f3f3ee"], spinArt: true, win: true, fine: true, sheetPt: [0, hullShape(.2).sheer + .07 + .19 / VR_SC, hullShape(.14).z + 2.25 / VR_SC], travHalf: hullShape(.2).hb - .55 / VR_SC });
    else g = makeClassBoat(id, { full: true, zephyr: id === "j420" || id === "finn", crew: id === "j420" ? 2 : 1, name: nm, num: "HUN " + (id === "j420" ? "420" : "7"), seed: 5 });
    const holder = new THREE.Group(); holder.add(g); const S = g.userData.S; if (S) { S.awa = 95; S.aws = 6; S.side = 1; if (S.spin != null) S.spin = 0; } try { g.userData.update(.016); } catch (e) {}
    const bb = new THREE.Box3().setFromObject(g), sz = bb.getSize(new THREE.Vector3()), k = 2.5 / Math.max(sz.x, sz.z, sz.y * .82); holder.scale.setScalar(k); holder.position.y = .64 - bb.min.y * k + (id === "zephyr" ? .25 * k : .05);
    HB.wzPed.add(holder); HB.wzM = { id, g: holder, boat: g };
  }
  function wzShow(on) { HB.wizOn = !!on; if (HB.wzG) HB.wzG.visible = !!on; if (HB.env) HB.env.visible = !on; if (HB.far) HB.far.visible = !on; if (on) { if (HB.prev) { HB.env.remove(HB.prev.g); HB.env.remove(HB.prev.disc); HB.prev = null; } wzModel(HB.wz.cls); } }
  function wzGo(step) { HB.wz = HB.wz || wzLoad(); wzShow(true); HB.walk = false; HB.B && (HB.B.o.side = -.36); hbBoard("w" + step); if (HB.B) HB.B.o.side = -.36; if (T.inVR && HB.B) HB.B.place(); }
  /* 00:39 (tulajdonos): forgás közben egy látványos pillanatban kinyílik a spinakker – amikor a hajó oldalról-elölről fordul felénk, hátszélre fordul,
     a spinakker felhúzódik, kidagad és pár másodpercig repül, majd a következő kör előtt bevonják. */
  function wzTick(dt) { if (HB._frz) { uiTickAll(dt); return; } const M = HB.wzM; if (M) { M.g.rotation.y += dt * .38; const S = M.boat.userData.S;
      if (S) { const q = (((M.g.rotation.y - 1.1) % TAU) + TAU) % TAU, open = q < TAU * .42, M2 = HB.wzM; M2.sp = M2.sp || 0;
        M2.sp += ((open ? 1 : 0) - M2.sp) * Math.min(1, dt * (open ? 1.6 : 1.1)); const k = M2.sp * M2.sp * (3 - 2 * M2.sp);
        S.awa = 75 + 20 * Math.sin(W.t * .3) + (150 - 75) * k; S.aws = 6 + 2 * k; S.side = 1; if (S.spin != null || M.id !== "finn") S.spin = k; S.heel = Math.sin(W.t * .7) * .05 * (1 - k * .5); }
      try { M.boat.userData.update(dt); } catch (e) {} }
    if (T.inVR) W.root.position.set(0, 0, 0); else W.root.position.set(-2.5, -2.1, -3.6); W.root.quaternion.identity();   /* 2D: a terem hátrébb, hogy a forgó hajó egészében látsszon a tábla mellett */ uiTickAll(dt); if (NET.on) { try { vrNetTick(dt); } catch (e) {} if (HB.B && (HB.page === "w5" || HB.page === "w1")) HB.B.dirty = 1; } }
  /* ---------------------------------------------------------------- a fekete keret */
  function wzFrame(B, g, step, title, sub) { const w = B.o.w, h = B.o.h;
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "rgba(8,11,18,.97)"); bg.addColorStop(1, "rgba(2,3,6,.97)"); uiRR(g, 4, 4, w - 8, h - 8, 34); g.fillStyle = bg; g.fill();
    g.lineWidth = 3; g.strokeStyle = "rgba(212,161,58,.85)"; g.stroke(); uiRR(g, 14, 14, w - 28, h - 28, 28); g.lineWidth = 1; g.strokeStyle = "rgba(212,161,58,.3)"; g.stroke();
    /* fogantyú (megfogható felső sáv) */ g.fillStyle = "rgba(255,255,255,.25)"; uiRR(g, w / 2 - 70, 22, 140, 8, 4); g.fill();
    /* logó: vitorla + felirat */
    g.save(); g.translate(64, 84); g.fillStyle = "#d4a13a"; g.beginPath(); g.moveTo(0, -38); g.lineTo(0, 22); g.lineTo(34, 22); g.closePath(); g.fill(); g.fillStyle = "#c8102e"; g.beginPath(); g.moveTo(-5, -30); g.lineTo(-5, 22); g.lineTo(-26, 22); g.closePath(); g.fill(); g.fillStyle = "#e9eef6"; g.beginPath(); g.moveTo(-34, 28); g.lineTo(40, 28); g.lineTo(28, 40); g.lineTo(-24, 40); g.closePath(); g.fill(); g.restore();
    g.textAlign = "left"; g.fillStyle = "#ffffff"; g.font = `900 40px ${UIF}`; g.fillText("BALATON SAILING VR", 116, 78); g.fillStyle = "rgba(212,161,58,.95)"; g.font = `700 19px ${UIF}`; g.fillText("ZEPHYR · ZAMÁRDI · VIRTUÁLIS VITORLÁSVERSENY", 118, 108);
    /* lépésjelző */
    if (step) WZ_STEPS.forEach((t, i) => { const x = w - 590 + i * 146, on = i + 1 === step, done = i + 1 < step; g.fillStyle = on ? "#d4a13a" : done ? "rgba(47,191,113,.85)" : "rgba(255,255,255,.12)"; g.beginPath(); g.arc(x, 66, 22, 0, TAU); g.fill();
      g.fillStyle = on ? "#0b0b0b" : "#fff"; g.font = `900 24px ${UIF}`; g.textAlign = "center"; g.fillText(done ? "✓" : String(i + 1), x, 75); g.fillStyle = on ? "#ffd166" : "rgba(255,255,255,.7)"; g.font = `700 17px ${UIF}`; g.fillText(t, x, 112); if (i < 3) { g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(x + 28, 64, 90, 3); } });
    g.textAlign = "left"; g.strokeStyle = "rgba(212,161,58,.35)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(40, 132); g.lineTo(w - 40, 132); g.stroke();
    g.fillStyle = "#ffd166"; g.font = `900 38px ${UIF}`; g.fillText(title, 44, 186); if (sub) { g.fillStyle = "rgba(225,235,248,.8)"; g.font = `600 21px ${UIF}`; uiFit(g, sub, w - 90, 21, 600); g.fillText(sub, 44, 220); } }
  function wzPanel(g, x, y, w, h, on) { uiRR(g, x, y, w, h, 20); g.fillStyle = on ? "rgba(212,161,58,.14)" : "rgba(255,255,255,.045)"; g.fill(); g.lineWidth = on ? 3 : 1.5; g.strokeStyle = on ? "#d4a13a" : "rgba(255,255,255,.14)"; g.stroke(); }
  /* választó sor: címke + gombok (a kiválasztott zöld) */
  function wzRow(B, g, y, label, opts, cur, set, note) { g.fillStyle = "#fff"; g.font = `800 27px ${UIF}`; g.fillText(label, 60, y + 44); const x0 = 380, ww = (1440 - x0) / opts.length;
    opts.forEach(([v, t, sb, off], i) => B.btn(x0 + i * ww + 6, y, ww - 12, 74, t, () => { set(v); B.dirty = 1; }, { green: cur === v, sub: sb, off: !!off, fs: 26 }));
    if (note) { g.fillStyle = "rgba(255,214,102,.85)"; g.font = `600 17px ${UIF}`; uiFit(g, note, 1060, 17, 600); g.fillText(note, x0 + 8, y + 96); } }
  /* ---------------------------------------------------------------- a lépések */
  function wzDraw(B, g) {
    const Z = HB.wz || (HB.wz = wzLoad()), p = HB.page, W2 = B.o.w;
    if (p === "w1") {
      wzFrame(B, g, 1, "1 · HOGYAN JÁTSZOL?", "Egyedül a gép ellenfelei ellen, vagy online, más játékosokkal együtt");
      const act = NET.on ? netActive().length : 0;
      [["solo", "user", "EGYEDÜLI JÁTÉK", "Három gépi ellenféllel versenyzel – bármikor, internet nélkül is.", "szünet, visszajátszás, minden szint"], ["online", "people", "ONLINE JÁTÉK", act ? `Most ${act} játékos érhető el – automatikus négyes csoport, a hiányzó helyekre gépi ellenfél.` : "Más játékosokkal együtt (négyes csoportok). Ha épp senki nincs online, gépi ellenfelekkel indul.", act ? `${act} aktív játékos` : "nincs most aktív játékos"]].forEach(([v, ic, t, d, ch], i) => {
        const x = 44 + i * 712, y = 250, on = Z.mode === v; wzPanel(g, x, y, 690, 330, on); g.fillStyle = on ? "rgba(212,161,58,.25)" : "rgba(255,255,255,.08)"; g.beginPath(); g.arc(x + 110, y + 120, 70, 0, TAU); g.fill(); uiIcon(g, ic, x + 110, y + 120, 70, on ? "#ffd166" : "#cfe0f2");
        g.fillStyle = "#fff"; g.font = `900 40px ${UIF}`; g.fillText(t, x + 210, y + 110); g.fillStyle = "rgba(225,235,248,.85)"; g.font = `600 22px ${UIF}`; uiWrap(g, d, x + 210, y + 150, 450, 30, 4);
        g.fillStyle = v === "online" && act ? "#7CFC9A" : "rgba(255,214,102,.85)"; g.font = `700 19px ${UIF}`; g.fillText(ch, x + 210, y + 262);
        if (on) { g.fillStyle = "#d4a13a"; g.font = `900 28px ${UIF}`; g.fillText("✓ KIVÁLASZTVA", x + 210, y + 306); } else { g.fillStyle = "rgba(255,255,255,.5)"; g.font = `700 22px ${UIF}`; g.fillText("bökj rá a kiválasztáshoz", x + 210, y + 306); }
        B.btns.push({ x, y, w: 690, h: 330, fn: () => { Z.mode = v; if (v === "online") try { netStart(); } catch (e) {} wzSave(); B.dirty = 1; } }); });
      /* a gombot átlátszóra rajzoltuk – a panel látszik; fiók és egyebek */
      { const a = acctStatus(); wzPanel(g, 44, 600, 1402, 92, false); uiIcon(g, a.on ? "check" : "mail", 92, 646, 34, a.on ? "#7CFC9A" : "#ffd166"); g.fillStyle = "#fff"; g.font = `800 24px ${UIF}`; g.fillText(a.on ? "FIÓK" : "MÉG NINCS FIÓKOD", 130, 638); g.fillStyle = "rgba(225,235,248,.85)"; g.font = `600 19px ${UIF}`; uiFit(g, a.t, 900, 19, 600); g.fillText(a.t, 130, 668);
        B.btn(1080, 612, 350, 68, a.on ? "✎ Fiók" : "✉ Regisztráció", () => { HB.acctBack = "w1"; hbBoard("acct"); }, { fs: 26 }); }
      B.btn(44, 716, 340, 96, "⚓ Séta a kikötőben", () => hbWalk(true), { sub: "a hajók között, valódi méretben" });
      B.btn(398, 716, 340, 96, "🏆 Eredmények", () => hbBoard("trophy"), { sub: "sorozatok és serlegek" });
      B.btn(752, 716, 340, 96, "🎓 Oktatás", () => { hbSchool(); }, { sub: "szabályok a nagypapával, aztán a pálya" });
      B.btn(1106, 716, 340, 96, "‹ Vissza a sétához", () => { uiCloseAll(); W.close(); }, { sub: "Zephyr Apartmanház" });
      B.btn(44, 840, 1402, 116, "TOVÁBB ▶  a hajó kiválasztása", () => wzGo(2), { gold: true, fs: 44 });
    } else if (p === "w2") {
      const c = boatCls(Z.cls); wzFrame(B, g, 2, "2 · HAJÓ ÉS BEÁLLÍTÁSOK", `${c.n} · ${c.len} · ${c.crew}`);
      wzPanel(g, 44, 244, 1402, 150, true); g.fillStyle = "#fff"; g.font = `900 44px ${UIF}`; uiFit(g, c.n, 760, 44, 900); g.fillText(c.n, 200, 306); g.fillStyle = "rgba(225,235,248,.85)"; g.font = `600 19px ${UIF}`; uiWrap(g, c.d, 200, 340, 900, 25, 2);
      B.btn(60, 262, 120, 114, "◀", () => { const i = BOAT_ORDER.indexOf(Z.cls); Z.cls = BOAT_ORDER[(i + BOAT_ORDER.length - 1) % BOAT_ORDER.length]; wzSave(); wzModel(Z.cls); B.dirty = 1; }, { fs: 50 });
      B.btn(1310, 262, 120, 114, "▶", () => { const i = BOAT_ORDER.indexOf(Z.cls); Z.cls = BOAT_ORDER[(i + 1) % BOAT_ORDER.length]; wzSave(); wzModel(Z.cls); B.dirty = 1; }, { fs: 50 });
      BOAT_ORDER.forEach((id, i) => uiChip(g, 1110 + (i % 3) * 64, 300 + Math.floor(i / 3) * 40, 56, 30, BOATCLS[id].sh.slice(0, 3), id === Z.cls ? "#d4a13a" : "rgba(255,255,255,.4)", 1));
      /* 00:39: kormány – Zephyr és rönktutaj: választható; flamingó: csak kormánykerék (felfújható); Finn és 420: botkormány */
      const kw = { zephyr: "both", tutaj: "both", flamingo: "kerek" }[Z.cls] || "bot", curS = kw === "both" ? Z.steer : kw;
      wzRow(B, g, 420, "Kormány", [["kerek", "☸ Kormánykerék", kw === "bot" ? "ezen a hajón nincs" : Z.cls === "tutaj" ? "botokból kötözött kerék" : Z.cls === "flamingo" ? "felfújható kerék" : "a nagy hajón", kw === "bot"], ["bot", "⎯ Botkormány", kw === "kerek" ? "ezen a hajón nincs" : Z.cls === "tutaj" ? "a kormányevező nyele" : "kormányrúd toldóval", kw === "kerek"]], curS, (v) => { Z.steer = v; wzSave(); }, kw === "bot" ? "A Finn dingit és a 420-ast botkormánnyal kormányzod." : kw === "kerek" ? "A flamingót csak a felfújható kormánykerékkel lehet irányítani." : "");
      wzRow(B, g, 540, "Napszak", [["nap", "☀ Nappali", "napsütés, balatoni táj"], ["ej", "🌙 Éjszakai", "hold, csillagok, fények"], ["vegyes", "◐ Vegyes", "futamonként változik"]], Z.tod, (v) => { Z.tod = v; wzSave(); });
      wzRow(B, g, 660, "Mezőny", [["od", "⛵ Egyforma hajók", "one design – hivatalos pontozás"], ["mix", "⚓ Vegyes flotta", "mindenféle hajó indulhat"]], Z.fleet, (v) => { Z.fleet = v; wzSave(); }, Z.fleet === "mix" ? "Vegyes flottánál nincs hivatalos pontszámítás – a futam független a ranglistától, a sorozattól és a serlegektől." : "");
      B.btn(44, 840, 380, 116, "‹ Vissza", () => wzGo(1), { fs: 36 }); B.btn(444, 840, 1002, 116, "TOVÁBB ▶  a pálya kiválasztása", () => wzGo(3), { gold: true, fs: 40 });
    } else if (p === "w3") {
      wzFrame(B, g, 3, "3 · PÁLYA", "Válassz egy pályát egyetlen futamra – vagy indíts 3–5 futamos sorozatot véletlenszerű pályákkal");
      for (let i = 0; i < 10; i++) { const lvl = i + 1, C = HB.wzC && HB.wzC[lvl] || ((HB.wzC = HB.wzC || {})[lvl] = vrCourse(lvl)), v = vrVenue(lvl), x = 44 + (i % 2) * 436, y = 244 + Math.floor(i / 2) * 104, on = Z.kind === "one" && Z.lvl === lvl;
        B.btn(x, y, 424, 94, `${lvl}. ${C.name}`, () => { Z.kind = "one"; Z.lvl = lvl; wzSave(); B.dirty = 1; }, { green: on, sub: `${v.n.split(" – ")[0]} · ${C.marks.length + (C.fin ? 0 : 0)} bója`, fs: 26 }); }
      wzPanel(g, 940, 244, 506, 400, Z.kind === "one");
      if (Z.kind === "one") { const C = HB.wzC[Z.lvl]; drawCoursePlan(g, C, 952, 256, 482, 330, B.t); g.fillStyle = "#fff"; g.font = `700 19px ${UIF}`; uiFit(g, `${vrVenue(Z.lvl).n} · ${(C.tws / KN).toFixed(0)} csomó`, 470, 19, 700); g.fillText(`${vrVenue(Z.lvl).n} · ${(C.tws / KN).toFixed(0)} csomó`, 960, 620); }
      else { g.fillStyle = "#ffd166"; g.font = `900 34px ${UIF}`; g.fillText(`${Z.n} FUTAMOS SOROZAT`, 970, 310); g.fillStyle = "rgba(225,235,248,.88)"; g.font = `600 21px ${UIF}`; uiWrap(g, "Minden futam más pályán és más helyszínen – véletlenszerűen sorsolva. Futamonként kapitányi tájékoztató, a végén eredménylista" + (Z.fleet === "mix" ? " (vegyes flotta: pontozás nélkül)." : " és serleg az első háromnak (RRS A4 pontozás)."), 970, 352, 450, 30, 8); }
      g.fillStyle = "#fff"; g.font = `800 26px ${UIF}`; g.fillText("Sorozat véletlen pályákkal:", 44, 806 - 0);
      [3, 4, 5].forEach((n, j) => B.btn(400 + j * 190, 760, 176, 70, `${n} futam`, () => { Z.kind = "series"; Z.n = n; wzSave(); B.dirty = 1; }, { green: Z.kind === "series" && Z.n === n, fs: 28 }));
      B.btn(44, 856, 380, 100, "‹ Vissza", () => wzGo(2), { fs: 36 }); B.btn(444, 856, 1002, 100, "TOVÁBB ▶  kapitányi tájékoztató", () => { wzPlan(); wzGo(4); }, { gold: true, fs: 40 });
    } else if (p === "w4") {
      const plan = HB.wzPlan || wzPlan(), lvl = plan[0], C = vrCourse(lvl), ven = vrVenue(lvl), night = wzNight(lvl);
      wzFrame(B, g, 4, "4 · KAPITÁNYI TÁJÉKOZTATÓ", `${Z.kind === "one" ? "Egyetlen futam" : `1. futam a ${plan.length} futamos sorozatból`} · ${C.name} · ${ven.n} · ${boatCls(Z.cls).n}${Z.fleet === "mix" ? " · vegyes flotta" : ""}`);
      drawPreBrief(B, g, C, ven, night, 44, 244, plan);
      B.btn(44, 856, 380, 100, "‹ Vissza", () => wzGo(3), { fs: 36 }); B.btn(444, 856, 1002, 100, "▶  START", () => wzStart(), { gold: true, fs: 54 });
    } else if (p === "w5") {
      wzFrame(B, g, 4, "ONLINE – CSOPORT ALAKUL", "a többiek a kikötőben gyülekeznek; legfeljebb 8 mp, utána indul a futam");
      const q = NET.on ? netActive().filter((p2) => p2.q) : []; g.fillStyle = "#fff"; g.font = `800 34px ${UIF}`; g.fillText(`Veled együtt ${q.length + 1} játékos vár az indulásra`, 60, 320);
      q.slice(0, 6).forEach((p2, i) => { g.fillStyle = "#7CFC9A"; g.font = `700 26px ${UIF}`; g.fillText("● " + (p2.name || "Névtelen"), 80, 380 + i * 40); });
      B.btn(44, 856, 1402, 100, "✕ Mégse – vissza a menübe", () => { NET.queue = null; try { netPost({ k: "q", on: 0 }); } catch (e) {} wzGo(1); }, { red: true, fs: 34 });
    } else if (p === "acct") wzDrawAcct(B, g);
  }
  /* a tájékoztató tartalma (a 4. lépés és a futam közbeni „Kapitányi tájékoztató” közös rajza) */
  function drawPreBrief(B, g, C, ven, night, x, y, plan) {
    wzPanel(g, x, y, 900, 590, false); drawCoursePlan(g, C, x + 10, y + 10, 560, 420, B.t); drawCourse3D(g, C, x + 584, y + 10, 306, 210, B.t); drawBalMap(g, x + 584, y + 228, 306, 202, { venue: ven, wf: C.wf, t: B.t, labels: "kevés" });
    const legs = vrCourseLegs(C); g.font = `700 19px ${UIF}`; legs.forEach((l, i) => { const yy = y + 462 + i * 27; if (yy > y + 580) return; g.fillStyle = "#ffd166"; g.fillText(`${i + 1}.`, x + 20, yy); g.fillStyle = "#fff"; const tx = `${i ? i + ". bója" : "rajt"} → ${i + 1 < legs.length ? (i + 1) + ". bója" : "cél (a két bója KÖZÖTT)"} · ${Math.round(l.d)} m · ${l.kind}`; uiFit(g, tx, 850, 19, 700); g.fillText(tx, x + 52, yy); g.font = `700 19px ${UIF}`; });
    const rx = x + 920, rw = 1402 - 920; wzPanel(g, rx, y, rw, 590, true);
    const dirs = ["É", "ÉK", "K", "DK", "D", "DNy", "Ny", "ÉNy"], wd = dirs[Math.round(((C.wf * R2D) % 360 + 360) % 360 / 45) % 8];
    const rows = [["map", "Helyszín", ven.n], ["wind", "Szél", `${wd} felől, ${(C.tws / KN).toFixed(0)} csomó · ${C.wxn || ""}`], [night ? "moon" : "dot", "Napszak", night ? "éjszaka – világító bóják, navigációs fények" : "nappal"], ["clock", "Időlimit", mmss(C.limit || vrLimitOf(C))], ["boat", "Kerülés", "minden bóját BAL kéz felől (↺)"], ["check", "Cél", C.fin ? "a két sárga célbója KÖZÖTT" : "a rajtvonalon át, a két bója között"]];
    rows.forEach(([ic, a, b], i) => { const yy = y + 50 + i * 66; uiIcon(g, ic, rx + 40, yy - 8, 30, "#ffd166"); g.fillStyle = "#ffd166"; g.font = `800 20px ${UIF}`; g.fillText(a.toUpperCase(), rx + 74, yy - 14); g.fillStyle = "#fff"; g.font = `700 21px ${UIF}`; uiFit(g, b, rw - 96, 21, 700); g.fillText(b, rx + 74, yy + 14); });
    if (plan && plan.length > 1) { g.fillStyle = "rgba(255,214,102,.9)"; g.font = `800 18px ${UIF}`; g.fillText("A SOROZAT PÁLYÁI", rx + 24, y + 452); g.fillStyle = "rgba(225,235,248,.85)"; g.font = `600 16px ${UIF}`; const t = plan.map((l, i) => `${i + 1}. ${VR_TPL[(l - 1) % VR_TPL.length].n}`).join(" · "); uiWrap(g, t, rx + 24, y + 478, rw - 48, 22, 3); }
    { const tx = `⚠ Balatoni viharjelzés – ${stmText()}`; g.fillStyle = "#ffd166"; g.font = `700 17px ${UIF}`; uiFit(g, tx, rw - 48, 17, 700); g.fillText(tx, rx + 24, y + 578); } }
  function vrLimitOf(C) { try { vrLimitSetC(C); } catch (e) {} return C.limit || 0; }
  function wzNight(lvl) { const Z = HB.wz || wzLoad(); return Z.tod === "ej" ? true : Z.tod === "nap" ? false : ((lvl * 2654435761) >>> 0) % 3 === 1; }
  /* a sorozat pályái: egyetlen futam = a választott; sorozat = n különböző, véletlen pálya (sablon × helyszín, 1–40) */
  function wzPlan() { const Z = HB.wz; let plan; if (Z.kind === "one") plan = [Z.lvl]; else { const pool = []; for (let i = 1; i <= 40; i++) pool.push(i); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const used = {}; plan = []; for (const l of pool) { const t = (l - 1) % VR_TPL.length; if (used[t]) continue; used[t] = 1; plan.push(l); if (plan.length >= Z.n) break; } }
    HB.wzPlan = plan; return plan; }
  function wzApply() { const Z = HB.wz, plan = HB.wzPlan || wzPlan(); wzSave();
    VRR.mixFleet = Z.fleet === "mix"; VRR.todMix = Z.tod === "vegyes"; VRR.nightForce = Z.tod === "ej" ? true : Z.tod === "nap" ? false : null; HB.wzKeep = true;
    VRR.series = { races: [], done: false, id: Date.now(), n: plan.length, plan: plan.slice(), mix: VRR.mixFleet }; try { vrSeriesSave(); } catch (e) {} VRR.lvl = plan[0]; HB.sel = Z.cls; return plan; }
  function wzStart() { const Z = HB.wz; wzApply();
    if (Z.mode === "online") { try { netStart(); } catch (e) {} if (NET.on && netActive().length) { NET.queue = { t: Date.now(), ann: 0 }; try { netPost({ k: "q", on: 1, cls: Z.cls }); } catch (e) {} hbBoard("w5"); return; } }
    uiCloseAll(); setTimeout(() => { W._raceGo = true; W.open("race"); }, 30); }
  function wzStartTut() { HB.wz = HB.wz || wzLoad(); wzSave(); VRR.mixFleet = false; VRR.nightForce = false; VRR.todMix = false; HB.sel = HB.wz.cls; uiCloseAll(); VRR.lvl = 0; setTimeout(() => { W._raceGo = true; W.open("race"); }, 30); }
  /* ---------------------------------------------------------------- futam közben: „Kapitányi tájékoztató” (a pálya útvonala) */
  function vrPreBrief(lvl) { const S = VRR; if (S.preB) { S.preB.destroy(); S.preB = null; }
    S.preB = uiBoard({ w: 1500, h: 1000, mw: 1.55, dist: 1.4, y: -.05, fps: 6, bar: 130, draw: (B, g) => { const C = S.C, ven = S.venue || vrVenue(lvl);
      wzFrame(B, g, 0, "KAPITÁNYI TÁJÉKOZTATÓ", `${C.name} · ${ven.n} · a pálya pontos útvonala`); drawPreBrief(B, g, C, ven, !!(typeof NGT !== "undefined" && NGT.on), 44, 244, S.series && S.series.plan);
      B.btn(44, 856, 700, 100, "▶ Vissza a futamba", () => { S.preB.destroy(); S.preB = null; if (S.menuPaused || S.paused) { S.menuPaused = false; vrPause(false); } }, { gold: true, fs: 38 });
      B.btn(764, 856, 682, 100, "↻ Futam újrakezdése", () => { S.preB.destroy(); S.preB = null; vrSetup(S.lvl); }, { fs: 34 }); } });
    S.preB.show(true); if (!S.net && !S.paused && S.st !== "done") vrPause(true), vrPauseBoard(false), (S.menuPaused = true); }
  /* ---------------------------------------------------------------- SÉTA A KIKÖTŐBEN: a mólóra bökve / az ívvel odaugorva sétálhatsz */
  function hbWalk(on) { const was = HB.walk; wzShow(!on); HB.walk = !!on; if (on && !was) { try { msStart(W.root, 2.5); } catch (e) {} }   /* kikötő-jelentés: a kisütés a séta indulásakor (nem a rejtett kikötőn) */
    if (on) { HB.pos = HB.pos || { x: 0, z: 0 }; hbBoard("walk"); if (HB.B) { HB.B.o.side = 0; if (T.inVR) HB.B.place(); } } }
  function hbTpSurf(env, x, z, w, d) { const t = new THREE.Mesh(new THREE.BoxGeometry(w, .08, d), new THREE.MeshBasicMaterial({ visible: false })); t.position.set(x, .67, z); env.add(t); W.disposables.push(t.geometry, t.material);
    t.userData.tp = () => !!HB.walk; t.userData.xr = { click: (h) => { if (!HB.walk || !h || !h.point) return; const p = W.root.worldToLocal(h.point.clone()); HB.pos = { x: clamp(p.x, x - w / 2 + .3, x + w / 2 - .3), z: clamp(p.z, z - d / 2 + .3, z + d / 2 - .3) }; try { beep(); } catch (e) {} } };
    try { T.xr.extra.add(t); W.objs.push(t); } catch (e) {} return t; }
  function hbDrawWalk(B, g) { uiFrame(B, g, "⚓ SÉTA A KIKÖTŐBEN", "a hajók valódi méretben ringanak a mólónál");
    uiCard(g, 40, 160, 1420, 420); g.fillStyle = "#fff"; g.font = `700 30px ${UIF}`; uiWrap(g, "Sétálj a mólón: bökj rá a pallóra (VR-ben: ökölbe zárt kéz + hüvelykujj, az ív végén koppints), és odalépsz. Egy kikötött hajóra bökve előtted megforog – ott ki is választhatod.", 70, 230, 1360, 44, 6);
    B.btn(40, 620, 700, 140, "⛵ Vissza a főmenübe", () => wzGo(1), { gold: true, fs: 40 }); B.btn(760, 620, 700, 140, "↺ Vissza a móló elejére", () => { HB.pos = { x: 0, z: 0 }; }, { fs: 34 });
    B.btn(40, 790, 1420, 110, "‹ Vissza a virtuális sétához", () => { uiCloseAll(); W.close(); }, { fs: 32 }); }
  /* ---------------------------------------------------------------- FIÓK: regisztráció / belépés e-maillel (a táblán billentyűzettel is) */
  const AK = { mode: "reg", f: 0, v: ["", "", "", ""], shift: false };
  const AK_ROWS = ["1234567890", "QWERTZUIOP", "ASDFGHJKLÉ", "YXCVBNMÁŐŰ", "@._-ÖÜÓÚÍ+"];
  function wzDrawAcct(B, g) { acctInit(); const f = ACCT.fiok;
    wzFrame(B, g, 0, f ? "FIÓK" : "REGISZTRÁCIÓ E-MAILLEL", f ? acctStatus().t : "A játék így mindig elmenti a neved, a beállításaidat és az eredményeidet – bármelyik eszközön folytathatod");
    if (f) { wzPanel(g, 44, 250, 1402, 260, true); g.fillStyle = "#fff"; g.font = `900 40px ${UIF}`; g.fillText(f.nev || "", 80, 320); g.fillStyle = "rgba(225,235,248,.88)"; g.font = `600 24px ${UIF}`; g.fillText(f.email, 80, 362);
      g.fillStyle = f.helyi ? "#ffd166" : f.ellenorzott ? "#7CFC9A" : "#ffd166"; g.font = `700 22px ${UIF}`; uiWrap(g, f.helyi ? "Csak ezen az eszközön (nincs elérhető szerver) – a saját tárhelyen futó oldalon a szerverre is ment." : f.ellenorzott ? "✓ E-mail megerősítve · az eredményeid a fiókodba mentődnek" : "Írd be az e-mailben kapott 6 jegyű kódot a megerősítéshez:", 80, 410, 1300, 30, 3);
      if (!f.ellenorzott && !f.helyi) { AK.mode = "code"; wzField(B, g, 80, 460, 400, "Kód", AK.v[3], AK.f === 3, () => { AK.f = 3; B.dirty = 1; }); B.btn(500, 452, 300, 66, "✓ Megerősítés", () => acctVerify(AK.v[3]), { green: true }); wzKbd(B, g, 540); }
      if (ACCT.msg || ACCT.err) { g.fillStyle = ACCT.err ? "#ff8a7a" : "#7CFC9A"; g.font = `700 20px ${UIF}`; uiFit(g, ACCT.err || ACCT.msg, 1380, 20, 700); g.fillText(ACCT.err || ACCT.msg, 60, 840); }
      B.btn(44, 866, 680, 96, "‹ Vissza a menübe", () => wzGo(1), { gold: true, fs: 34 }); B.btn(744, 866, 702, 96, "⎋ Kilépés a fiókból", () => acctLogout(), { fs: 30 }); return; }
    const reg = AK.mode !== "login";
    B.btn(44, 244, 340, 64, "Új fiók", () => { AK.mode = "reg"; AK.f = 0; B.dirty = 1; }, { green: reg }); B.btn(396, 244, 340, 64, "Már van fiókom", () => { AK.mode = "login"; AK.f = 0; B.dirty = 1; }, { green: !reg });
    wzField(B, g, 44, 330, 700, "E-mail cím", AK.v[0], AK.f === 0, () => { AK.f = 0; B.dirty = 1; });
    if (reg) wzField(B, g, 764, 330, 330, "Név (a vitorlán)", AK.v[1], AK.f === 1, () => { AK.f = 1; B.dirty = 1; });
    wzField(B, g, reg ? 1114 : 764, 330, reg ? 332 : 682, "Jelszó (min. 6)", "•".repeat(AK.v[2].length), AK.f === 2, () => { AK.f = 2; B.dirty = 1; });
    wzKbd(B, g, 430);
    if (ACCT.msg || ACCT.err || ACCT.busy) { g.fillStyle = ACCT.err ? "#ff8a7a" : "#7CFC9A"; g.font = `700 20px ${UIF}`; const t = ACCT.busy ? "Küldés…" : ACCT.err || ACCT.msg; uiFit(g, t, 1380, 20, 700); g.fillText(t, 60, 850); }
    B.btn(44, 866, 520, 96, "‹ Vissza", () => wzGo(1), { fs: 34 });
    B.btn(584, 866, 862, 96, reg ? "✉ Regisztrálok" : "→ Belépés", () => { const em = AK.v[0].trim().toLowerCase(), pw = AK.v[2]; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { ACCT.err = "Adj meg egy érvényes e-mail címet."; B.dirty = 1; return; } if (pw.length < 6) { ACCT.err = "A jelszó legalább 6 karakter legyen."; B.dirty = 1; return; }
      if (reg) acctRegister(em, AK.v[1].trim() || vrProfile().name || em.split("@")[0], pw); else acctLogin(em, pw); }, { gold: true, fs: 38 }); }
  function wzField(B, g, x, y, w, label, val, on, fn) { g.fillStyle = "rgba(225,235,248,.8)"; g.font = `700 18px ${UIF}`; g.fillText(label, x + 4, y - 8 + 0); B.btn(x, y, w, 76, "", fn, { green: on, r: 14 });
    g.fillStyle = "#fff"; g.font = `700 28px ${UIF}`; g.textAlign = "left"; const t = val + (on && (Math.floor(B.t * 2) % 2 === 0) ? "|" : ""); uiFit(g, t || " ", w - 30, 28, 700); g.fillText(t, x + 18, y + 48); }
  function wzKbd(B, g, y0) { const kw = 122, kh = 66; AK_ROWS.forEach((row, ri) => { [...row].forEach((ch, ci) => { const x = 44 + ci * (kw + 8), c = AK.shift ? ch : ch.toLowerCase();
      B.btn(x, y0 + ri * (kh + 8), kw, kh, c, () => { AK.v[AK.f] = (AK.v[AK.f] + c).slice(0, 80); B.dirty = 1; }, { fs: 30, r: 12 }); }); });
    const x2 = 44 + 10 * (kw + 8); B.btn(x2, y0, 1446 - x2, kh, "⌫", () => { AK.v[AK.f] = AK.v[AK.f].slice(0, -1); B.dirty = 1; }, { fs: 32, r: 12 }); B.btn(x2, y0 + (kh + 8), 1446 - x2, kh, AK.shift ? "abc" : "ABC", () => { AK.shift = !AK.shift; B.dirty = 1; }, { fs: 26, r: 12 });
    B.btn(x2, y0 + 2 * (kh + 8), 1446 - x2, kh, "szóköz", () => { AK.v[AK.f] += " "; B.dirty = 1; }, { fs: 22, r: 12 }); B.btn(x2, y0 + 3 * (kh + 8), 1446 - x2, kh, "tovább", () => { AK.f = (AK.f + 1) % (AK.mode === "login" ? 3 : 3); if (AK.mode === "login" && AK.f === 1) AK.f = 2; B.dirty = 1; }, { fs: 22, r: 12 }); }
  /* 2D: a fizikai billentyűzet is ír a mezőkbe, amíg a fiók-oldal nyitva van */
  try { document.addEventListener("keydown", (e) => { if (W.kind !== "harbor" || !HB.B || HB.page !== "acct" || T.inVR) return; if (e.key === "Backspace") { AK.v[AK.f] = AK.v[AK.f].slice(0, -1); } else if (e.key === "Tab" || e.key === "Enter") { AK.f = (AK.f + 1) % 3; if (AK.mode === "login" && AK.f === 1) AK.f = 2; } else if (e.key.length === 1) { AK.v[AK.f] = (AK.v[AK.f] + e.key).slice(0, 80); } else return; e.preventDefault(); HB.B.dirty = 1; }); } catch (e) {}
