  /* =================================================================== 2/F. A KIKÖTŐ – a vitorlásverseny kezdőhelye (2026. nov. 14., a tulajdonos 8., 10., 15. kérése)
     A verseny nem a futammal indul, hanem a zamárdi kikötőben: fapallós móló, a kikötőhelyeken ringanak a választható hajók (Zephyr, Finn dingi, 420-as,
     rönktutaj, flamingó). Egy hajóra bökve a hajó a móló előtti forgókorongra kerül, és előtted forog – ott döntöd el, ezt választod-e.
     A kikötői menü: játékos (név a grószra, fénykép), hajó, beállítások (nehézség, kormány, ülő mód, táblák), oktató futam, eredmények és trófeák,
     többjátékos mód (meghívás, saját futam), indulás. Ide minden futam után vissza lehet térni. */
  const HB = {};
  function buildHarbor() {
    const root = W.root; Object.keys(HB).forEach((k) => delete HB[k]);
    const far = new THREE.Group(), env = new THREE.Group(); root.add(far); root.add(env); HB.env = env;
    const oldSky = makeSky(far); HB.water = makeWater(env); makePhotoSky(far, oldSky, HB.water);
    /* part: Zamárdi, szemben Tihany */
    VRR.shoreG = new THREE.Group(); far.add(VRR.shoreG); try { vrShoresSet({ u: [0, -1] }, Object.assign({}, VENUES.find((q) => q.id === "zamardi"), { harbor: true })); } catch (e) { console.warn(e); }
    HB.lights = addLights(SUN.clone());
    const wood = std({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#8a6a4a"; g.fillRect(0, 0, w, h); for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#7f5f40" : "#93724f"; g.fillRect(0, k * h / 8, w, h / 8 - 3); g.fillStyle = "rgba(30,18,8,.6)"; g.fillRect(0, (k + 1) * h / 8 - 3, w, 3); }
      for (let k = 0; k < 160; k++) { g.fillStyle = `rgba(40,25,10,${Math.random() * .2})`; g.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 1); } }, { repeat: [1, 12] }), roughness: .9 });
    const post = std({ color: "#5d4630", roughness: .95 }), white = std({ color: "#f4f4f0", roughness: .5 }), red = std({ color: "#c8102e", roughness: .5 }), steel = std({ color: "#c9ccd0", metalness: .7, roughness: .3 });
    /* főmóló: 3 m széles, 46 m hosszú, a néző a móló elején áll, a móló a −z irányba fut */
    const pierL = 46, pier = mesh(new THREE.BoxGeometry(3, .22, pierL), wood, env); pier.position.set(0, .55, -pierL / 2 + 2);
    for (let z = 2; z > -pierL + 2; z -= 3.2) [-1.45, 1.45].forEach((x) => { const p = mesh(new THREE.CylinderGeometry(.13, .15, 2.4, 8), post, env); p.position.set(x, -.3, z); });
    /* ujjmólók és kikötőhelyek mindkét oldalon */
    HB.berths = []; const order = BOAT_ORDER.slice(); const slots = [[-1, -8], [1, -8], [-1, -18], [1, -18], [-1, -31]];
    order.forEach((id, i) => { const [sd, z] = slots[i], big = id === "zephyr", fl = big ? 13 : 6; const f = mesh(new THREE.BoxGeometry(fl, .18, 1.1), wood, env); f.position.set(sd * (1.5 + fl / 2), .52, z + (big ? 4.2 : 2.6));
      for (let k = 0; k < 3; k++) { const p = mesh(new THREE.CylinderGeometry(.11, .12, 2.2, 8), post, env); p.position.set(sd * (1.6 + (k + .5) * fl / 3), -.3, z + (big ? 4.2 : 2.6)); }
      const bol = mesh(new THREE.CylinderGeometry(.09, .12, .35, 10), steel, env); bol.position.set(sd * 1.3, .8, z);
      HB.berths.push({ id, sd, z, x: sd * (1.5 + (big ? 8.8 : 3.1)), big }); });
    /* lámpák, mentőöv, zászlók, kikötői iroda „ZEPHYR KIKÖTŐ” felirattal */
    for (let z = -4; z > -pierL; z -= 12) [-1.35, 1.35].forEach((x) => { const lp = mesh(new THREE.CylinderGeometry(.04, .05, 2.6, 8), std({ color: "#1d232b" }), env); lp.position.set(x, 1.95, z); const lh = mesh(new THREE.SphereGeometry(.13, 12, 8), std({ color: "#fff6d6", emissive: "#ffe9a8", emissiveIntensity: .6 }), env); lh.position.set(x, 3.3, z); });
    { const ring = mesh(new THREE.TorusGeometry(.32, .08, 10, 24), std({ color: "#ff7a1a", roughness: .5 }), env); ring.position.set(1.42, 1.3, -2.5); ring.rotation.y = Math.PI / 2; }
    { const hut = new THREE.Group(); hut.position.set(-3.2, .65, 1.2); env.add(hut); mesh(new THREE.BoxGeometry(3, 2.6, 2.4).translate(0, 1.3, 0), white, hut); const rf = new THREE.ConeGeometry(2.4, 1.2, 4); rf.rotateY(Math.PI / 4); rf.translate(0, 3.2, 0); mesh(rf, std({ color: "#1f3a6a", roughness: .7 }), hut);
      const sg = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = "#0b2f5e"; g.fillRect(0, 0, w, h); g.strokeStyle = "#d4a13a"; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = "#ffd166"; g.font = `900 110px ${UIF}`; g.textAlign = "center"; g.fillText("ZEPHYR KIKÖTŐ", w / 2, 150); g.fillStyle = "#fff"; g.font = `700 44px ${UIF}`; g.fillText("Zamárdi · vitorlásverseny", w / 2, 215); });
      const s = mesh(new THREE.PlaneGeometry(2.8, .7), basic({ map: sg }), hut); s.position.set(1.52, 2.1, 0); s.rotation.y = Math.PI / 2; }
    [[-1.4, -44], [1.4, -44]].forEach(([x, z], i) => { const fp = mesh(new THREE.CylinderGeometry(.035, .04, 6, 8), white, env); fp.position.set(x, 3.5, z);
      const ft = canvasTex(192, 128, (g) => { if (i) { g.fillStyle = "#ce2939"; g.fillRect(0, 0, 192, 43); g.fillStyle = "#fff"; g.fillRect(0, 43, 192, 42); g.fillStyle = "#477050"; g.fillRect(0, 85, 192, 43); } else { g.fillStyle = "#0b2f5e"; g.fillRect(0, 0, 192, 128); g.fillStyle = "#ffd166"; g.font = `900 40px ${UIF}`; g.textAlign = "center"; g.fillText("ZEPHYR", 96, 78); } });
      const fl = mesh(new THREE.PlaneGeometry(1.4, .9, 8, 1), basic({ map: ft, side: THREE.DoubleSide }), env); fl.position.set(x + .72, 6.0, z); HB["flag" + i] = fl; fl.userData.base = fl.geometry.attributes.position.array.slice(); });
    /* a kikötött hajók – mindegyik rámutatható / rábökhető */
    HB.boats = HB.berths.map((b) => { let g;
      if (b.id === "zephyr") { g = makeBoat({ detail: 0, vis: false, crew: 0, hull: "#f5f2e8", boot: "#141d4d", stripe: "#141d4d", jib: "#f6f4ec", main: "#d61f26", num: " ", cls: " ", logoImg: "img/zephyr-hajo-logo.png", reg: "H-30381", lazyBag: "#6e1423", nsCol: "#3f6fa6", teakDeck: true, spin: ["#ffffff", "#ffffff", "#f3f3ee"], spinArt: true, sailName: vrProfile().name || "" }); g.scale.setScalar(VR_SC); }
      else g = makeClassBoat(b.id, { crew: 0, name: vrProfile().name || "", num: "HUN " + (b.id === "j420" ? "420" : "7"), seed: 3 });
      g.position.set(b.x, 0, b.z); g.rotation.y = b.sd > 0 ? Math.PI / 2 : -Math.PI / 2; env.add(g);
      const S = g.userData.S; S.awa = 160; S.aws = 3; S.side = 1; if (S.spin != null) S.spin = 0;
      const sz = b.big ? [6, 12, 16] : [3.2, 5, 5.5]; const hit = mesh(new THREE.BoxGeometry(sz[2], sz[1], sz[0]), basic({ visible: false }), env); hit.position.set(b.x, sz[1] / 2, b.z); hit.material.visible = false;
      const lbl = labelSprite([BOATCLS[b.id].n, "bökj rá – megnézem"], { size: b.big ? 3.6 : 2.4, fs: 60, w: 760 }); env.add(lbl); lbl.position.set(b.x, b.big ? 15 : 7.5, b.z);
      const o = { b, g, hit, lbl, hov: false, ph: rand() * 9 };
      hit.userData.xr = { hover: (on) => { o.hov = on; }, click: () => hbPreview(b.id) }; T.xr.extra.add(hit); W.objs.push(hit); return o; });
    HB.sel = vrClsId(); HB.prev = null; HB.mode = "menu";
    HB.gulls = makeGulls(env);
    try { netStart(); } catch (e) {}
    faceYaw(0);
    audioStart({ water: .05, wind: .02 });
    hbMenu(); W._hb = { preview: hbPreview, board: hbBoard, go: hbGo, HB };
    return { tick: hbTick, panel: hbPanel, hud: hbHud, wrist: () => [["⚓", "Kikötői menü", hbMenu], ["⛵", "Indulás a versenyre", () => hbGo(false)], ["‹", "A sétához", () => W.close()]] };
  }
  function hbTick(dt) {
    W.root.position.set(0, T.inVR ? -.66 : -.66 - 1.62, 0);   /* a móló felszíne a padló (VR) / a szemmagasság alatt 1,62 m (2D) */
    HB.water.userData.mat.uniforms.uT.value = W.t; HB.water.userData.mat.uniforms.uOff.value.set(0, 0);
    HB.boats.forEach((o) => { const S = o.g.userData.S; S.heel = Math.sin(W.t * .9 + o.ph) * .03; S.pitch = Math.sin(W.t * 1.1 + o.ph) * .015; o.g.position.y = Math.sin(W.t * 1.2 + o.ph) * .05; S.awa = 150 + 20 * Math.sin(W.t * .2 + o.ph); S.aws = 2.5;
      o.g.visible = !(HB.prev && HB.prev.id === o.b.id); if (o.g.visible) o.g.userData.update(dt); o.lbl.visible = !HB.prev; o.lbl.material.opacity = o.hov ? 1 : .85; const k = o.hov ? 1.12 : 1; o.lbl.scale.set((o.b.big ? 3.6 : 2.4) * k, o.lbl.scale.y / o.lbl.scale.x * (o.b.big ? 3.6 : 2.4) * k, 1); });
    ["flag0", "flag1"].forEach((k) => { const f = HB[k]; if (!f) return; const pa = f.geometry.attributes.position, b0 = f.userData.base; for (let i = 0; i < pa.count; i++) { const x = b0[i * 3]; pa.array[i * 3 + 2] = Math.sin(x * 5 - W.t * 6) * .08 * (x + .7); } pa.needsUpdate = true; });
    if (HB.gulls) HB.gulls.tick(dt, 0, -20);
    /* előnézet: a hajó a móló előtti forgókorongon forog */
    if (HB.prev) { const P = HB.prev; P.rot += dt * .45; P.g.rotation.y = P.rot; P.g.position.y = P.y0 + Math.sin(W.t * 1.2) * .04; const S = P.g.userData.S; S.awa = 70 + 50 * Math.sin(W.t * .3); S.aws = 5; S.side = Math.sin(W.t * .15) > 0 ? 1 : -1; if (S.spin != null && P.id !== "zephyr") S.spin = clamp(Math.sin(W.t * .25) * 2, 0, 1); P.g.userData.update(dt); P.disc.rotation.y = P.rot; }
    uiTickAll(dt); if (NET.on) { vrNetTick(dt); if (HB.page === "net" && HB.B) HB.B.dirty = 1; }
  }
  function hbPanel(P) { P.title("Zephyr kikötő · vitorlásverseny", `Hajó: ${boatCls(HB.sel).n} · játékos: ${vrProfile().name || "névtelen"}`);
    P.row(0, "Bökj rá egy kikötött hajóra: előtted megforog, és kiválaszthatod. A kikötői menüben minden beállítás megvan.", "#ffd166");
    P.buttons([["⛵ Indulás", () => hbGo(false)], ["⚓ Kikötői menü", hbMenu], ["‹ Vissza a sétához", () => W.close()]]); }
  function hbHud(H) { H.title("Zephyr kikötő · vitorlásverseny", `Hajó: ${boatCls(HB.sel).n} · bökj rá egy kikötött hajóra`); H.steer([["⚓ Kikötői menü", hbMenu], ["⛵ Indulás", () => hbGo(false)]], () => {}); H.hint("Bökj rá egy hajóra: előtted forog, és kiválaszthatod · a kikötői menüben: játékos, beállítások, eredmények, többjátékos"); }
  /* indulás a versenyre (W.open("race") a kikötő helyett közvetlenül a futamot nyitja) */
  function hbGo(tut, lvl, force, night) { VRR.nightForce = night ? true : null; if (!tut && !force && NET.on && netActive().length && !NET.queue) { NET.queue = { t: Date.now(), ann: 0 }; netPost({ k: "q", on: 1, cls: HB.sel }); hbBoard("net"); return; } try { localStorage.setItem("zephyr-hajo", HB.sel || vrClsId()); } catch (e) {} uiCloseAll(); VRR.forceCls = null; if (tut) VRR.lvl = 0; else if (lvl) VRR.lvl = lvl; else if (!VRR.lvl) VRR.lvl = (VRR.series && VRR.series.races ? VRR.series.races.length % 5 : 0) + 1;
    setTimeout(() => { W._raceGo = true; W.open("race"); }, 30); }
  /* ---------------------------------------------------------------- hajó-előnézet a forgókorongon */
  function hbPreview(id) {
    if (HB.prev) { const o = HB.prev; HB.env.remove(o.g); HB.env.remove(o.disc); }
    const big = id === "zephyr"; let g;
    if (big) { g = makeBoat({ detail: 0, vis: false, crew: 0, hull: "#f5f2e8", boot: "#141d4d", stripe: "#141d4d", jib: "#f6f4ec", main: "#d61f26", num: " ", cls: " ", logoImg: "img/zephyr-hajo-logo.png", reg: "H-30381", lazyBag: "#6e1423", nsCol: "#3f6fa6", teakDeck: true, spin: ["#ffffff", "#ffffff", "#f3f3ee"], spinArt: true, sailName: vrProfile().name || "" }); g.scale.setScalar(.62); }
    else g = makeClassBoat(id, { crew: id === "j420" ? 2 : 1, name: vrProfile().name || "", num: "HUN " + (id === "j420" ? "420" : "7"), seed: 5 });
    /* a forgókorong a móló jobb oldalán, a víz fölött; a nézet odafordul */
    const P0 = big ? [9.5, -1] : id === "flamingo" ? [4.4, -1.6] : [5.8, -1.8], y0 = big ? .42 : .36; g.position.set(P0[0], y0, P0[1]); HB.env.add(g);
    const disc = new THREE.Group(); disc.position.set(P0[0], .26, P0[1]); HB.env.add(disc); faceYaw(-Math.atan2(P0[0], -P0[1]) + .25); { const dg = new THREE.CylinderGeometry(big ? 4.5 : 3.2, big ? 4.6 : 3.3, .5, 48); dg.translate(0, -.2, 0); mesh(dg, std({ color: "#8a6a4a", roughness: .8 }), disc); const rg = new THREE.TorusGeometry(big ? 4.55 : 3.25, .06, 8, 64); rg.rotateX(Math.PI / 2); rg.translate(0, .07, 0); mesh(rg, std({ color: "#d4a13a", metalness: .8, roughness: .3 }), disc); }
    HB.prev = { id, g, disc, rot: 0, y0 }; HB.sel = id; hbBoard("boat");
  }
  /* ---------------------------------------------------------------- a kikötő táblái (menü, hajó, játékos, beállítások, eredmények, többjátékos) */
  function hbMenu() { if (HB.prev) { HB.env.remove(HB.prev.g); HB.env.remove(HB.prev.disc); HB.prev = null; } hbBoard("menu"); }
  function hbBoard(page) {
    HB.page = page; if (!HB.B) HB.B = uiBoard({ w: 1500, h: 1000, mw: 1.45, dist: 1.25, side: page === "boat" ? .62 : 0, y: -.08, fps: 2, bar: 140, draw: hbDraw }); HB.B.o.side = page === "boat" ? .62 : 0; HB.B.show(true); if (T.inVR) HB.B.place(); HB.B.dirty = 1; }
  function hbDraw(B, g) {
    const p = HB.page, pr = vrProfile();
    if (p === "menu") {
      uiFrame(B, g, "⚓ ZEPHYR KIKÖTŐ", "Vitorlásverseny – válassz hajót, állítsd be, és indulhatsz");
      /* játékoskártya */
      uiCard(g, 40, 160, 640, 300); uiH(g, "JÁTÉKOS", 70, 205);
      { const im = pr.photo ? uiImg(pr.photo) : null; g.save(); g.beginPath(); g.arc(150, 320, 80, 0, TAU); g.fillStyle = "#123b6b"; g.fill(); g.clip(); if (im && im.complete && im.naturalWidth) g.drawImage(im, 70, 240, 160, 160); else { g.fillStyle = "#ffd166"; g.font = `900 90px ${UIF}`; g.textAlign = "center"; g.fillText((pr.name || "?").slice(0, 1).toUpperCase(), 150, 352); g.textAlign = "left"; } g.restore();
        g.fillStyle = "#fff"; uiFit(g, pr.name || "Nincs még neved", 380, 40, 900); g.fillText(pr.name || "Nincs még neved", 260, 305); g.fillStyle = "rgba(255,255,255,.8)"; g.font = `600 22px ${UIF}`; g.fillText("a neved a nagyvitorlára kerül", 260, 342); }
      B.btn(260, 370, 400, 70, "✎ Név és fénykép", () => hbBoard("profile"));
      /* hajó */
      uiCard(g, 700, 160, 760, 300); uiH(g, "HAJÓ", 730, 205); const c = boatCls(HB.sel); g.fillStyle = "#fff"; g.font = `900 40px ${UIF}`; g.fillText(c.n, 730, 262); g.font = `600 22px ${UIF}`; g.fillStyle = "rgba(255,255,255,.85)"; g.fillText(`${c.len} · ${c.crew}`, 730, 300); uiWrap(g, c.d, 730, 336, 700, 28, 2);
      B.btn(730, 380, 700, 64, "Bökj rá egy kikötött hajóra – vagy: ◀ ▶ itt", () => { const i = BOAT_ORDER.indexOf(HB.sel); hbPreview(BOAT_ORDER[(i + 1) % BOAT_ORDER.length]); }, { fs: 26 });
      /* fő gombok */
      B.btn(40, 490, 1420, 120, `⛵  INDULÁS A VERSENYRE  ·  ${VRR.series && VRR.series.races && !VRR.series.done ? (VRR.series.races.length + 1) + ". futam a sorozatban" : "új sorozat, 1. futam"}`, () => hbGo(false), { gold: true, fs: 44 });
      B.btn(40, 636, 455, 100, "🌙 Éjszakai futam", () => hbGo(false, 0, false, true), { bg: "rgba(20,24,70,.92)" });
      B.btn(522, 636, 455, 100, "🏆 Eredmények és trófeák", () => hbBoard("trophy"));
      B.btn(1005, 636, 455, 100, "👥 Többjátékos", () => hbBoard("net"));
      B.btn(40, 762, 455, 100, "⚙ Beállítások", () => hbBoard("set")); B.btn(522, 762, 455, 100, "🎓 Oktató futam", () => hbGo(true));
      B.btn(1005, 762, 455, 100, "‹ Vissza a sétához", () => { uiCloseAll(); W.close(); });
      g.fillStyle = "rgba(255,255,255,.8)"; g.font = `600 22px ${UIF}`; g.fillText("VR-ben a tábla felső sávját megfogva (csippentés) bárhová teheted; előre-hátra tolva nő vagy kisebbedik.", 40, 920);
    } else if (p === "boat") {
      const c = boatCls(HB.sel); uiFrame(B, g, c.n.toUpperCase(), "előtted forog a forgókorongon");
      uiCard(g, 40, 160, 1420, 560); g.fillStyle = "#fff"; g.font = `800 30px ${UIF}`; g.fillText(c.len, 70, 220); g.fillText(c.crew, 70, 262); g.font = `600 27px ${UIF}`; uiWrap(g, c.d, 70, 320, 1360, 38, 4);
      const spec = { zephyr: ["Kormánykerék vagy botkormány", "Grósz, génua, spinakker – a Zephyr logójával", "A legénység trimmel, te kormányzol"],
        finn: ["Osztályszabály (World Sailing, 2025): 4495 mm, ≥ 116 kg, árboc 6,56 m", "Egyetlen grósz: 5 léc, ablak, a neved rajta", "Kötélzet nélküli, forgó árboc; bronz uszony"],
        j420: ["Osztályszabály (2014): 4,20 × 1,63 m, 80 kg, árboc 6,26 m", "Grósz 7,45 m² · fock 2,8 m² · spinakker 9 m²", "Trapéz – a legénység kilóg a víz fölé"],
        tutaj: ["Kötéllel összefogott rönkök, rongyponyva", "Kormányevező, banánfürt, vizeskanna", "Rák Rezső, a kis piros rák integet a ládán"],
        flamingo: ["Felfújható óriás flamingó: S-nyak, fekete hegyű csőr", "Horgászbot az árboc, strandtörölköző a grósz – a neveddel", "Hátszélben egy nagy pöttyös melltartó dagad ki spinakkerként"] }[c.id] || [];
      g.font = `700 26px ${UIF}`; spec.forEach((s, i) => { g.fillStyle = "#ffd166"; g.fillText("•", 70, 520 + i * 52); g.fillStyle = "#fff"; g.fillText(s, 100, 520 + i * 52); });
      B.btn(40, 750, 820, 120, "✓ Ezt választom – tovább a versenyre", () => { HB.sel = c.id; hbGo(false); }, { gold: true, fs: 38 });
      B.btn(880, 750, 280, 120, "◀ Másik", () => { const i = BOAT_ORDER.indexOf(HB.sel); hbPreview(BOAT_ORDER[(i + BOAT_ORDER.length - 1) % BOAT_ORDER.length]); });
      B.btn(1180, 750, 280, 120, "Másik ▶", () => { const i = BOAT_ORDER.indexOf(HB.sel); hbPreview(BOAT_ORDER[(i + 1) % BOAT_ORDER.length]); });
      B.btn(40, 890, 1420, 80, "‹ Vissza a kikötői menübe (a hajó választva marad)", () => { try { localStorage.setItem("zephyr-hajo", HB.sel); } catch (e) {} hbMenu(); }, { fs: 30 });
    } else if (p === "profile") hbDrawProfile(B, g);
    else if (p === "set") {
      uiFrame(B, g, "⚙ BEÁLLÍTÁSOK", "a versenyre vonatkoznak; mindent megjegyez");
      const diff = (() => { try { return localStorage.getItem("zephyr-vr-nehezseg") || "halado"; } catch (e) { return "halado"; } })(), tl = (() => { try { return localStorage.getItem("zephyr-kormany") !== "kerek"; } catch (e) { return true; } })(), seat = (() => { try { return localStorage.getItem("zephyr-vr-ules") === "1"; } catch (e) { return false; } })(), signs = (() => { try { return localStorage.getItem("zephyr-verseny-tablak") !== "0"; } catch (e) { return true; } })();
      const row = (y, label, opts, cur, set) => { g.fillStyle = "#fff"; g.font = `800 32px ${UIF}`; g.fillText(label, 60, y + 52); const w = (1400 - 480) / opts.length; opts.forEach(([v, t], i) => B.btn(500 + i * w, y, w - 16, 76, t, () => { set(v); B.dirty = 1; }, cur === v ? { gold: true } : {})); };
      row(170, "Ellenfelek szintje", [["kezdo", "Kezdő"], ["halado", "Haladó"], ["versenyzo", "Versenyző"]], diff, (v) => { try { localStorage.setItem("zephyr-vr-nehezseg", v); } catch (e) {} VRR.diff = v; });
      row(280, "Kormány (Zephyr)", [[true, "Botkormány"], [false, "Kormánykerék"]], tl, (v) => { try { localStorage.setItem("zephyr-kormany", v ? "bot" : "kerek"); } catch (e) {} });
      row(390, "Testhelyzet VR-ben", [[false, "Állva"], [true, "Ülve"]], seat, (v) => { try { localStorage.setItem("zephyr-vr-ules", v ? "1" : "0"); } catch (e) {} });
      row(610, "Napszak", [["nap", "Nappal"], ["valt", "Minden 3. éjjel"], ["ej", "Mindig éjjel"]], vrNightPref(), (v) => { try { localStorage.setItem("zephyr-napszak", v); } catch (e) {} });
      row(500, "Táblák a vízen", [[true, "Mutasd"], [false, "Rejtsd"]], signs, (v) => { try { localStorage.setItem("zephyr-verseny-tablak", v ? "1" : "0"); } catch (e) {} });
      g.fillStyle = "rgba(255,255,255,.8)"; g.font = `600 24px ${UIF}`; g.fillText("Kis hajókon (Finn, 420, tutaj, flamingó) mindig botkormánnyal kormányzol – zárd ökölbe a kezed, és mozdítsd balra-jobbra.", 60, 735);
      B.btn(60, 760, 640, 80, "↺ Sorozat újrakezdése", () => { VRR.series = { races: [], done: false, id: Date.now() }; vrSeriesSave(); VRR.lvl = 1; B.dirty = 1; });
      B.btn(60, 860, 1380, 100, "‹ Vissza a kikötői menübe", hbMenu, { gold: true });
    } else if (p === "trophy") hbDrawTrophy(B, g);
    else if (p === "net" || p === "inv" || p === "wait") { if (typeof hbDrawNet === "function") hbDrawNet(B, g); }
  }
  /* ---------------------------------------------------------------- JÁTÉKOS: név (VR-billentyűzet is), fénykép */
  const KB_ROWS = ["1234567890ÖÜÓ", "QWERTZUIOPŐÚ", "ASDFGHJKLÉÁŰ", "YXCVBNMÍ.-"];
  function hbDrawProfile(B, g) {
    const pr = vrProfile(); if (HB.edit == null) HB.edit = pr.name || "";
    uiFrame(B, g, "✎ JÁTÉKOS", "a neved a nagyvitorlára kerül, és ezzel kerülsz az eredménylistára");
    uiCard(g, 40, 150, 1420, 140); g.fillStyle = "#fff"; g.font = `900 64px ${UIF}`; const txt = HB.edit + (Math.floor(B.t * 2) % 2 ? "|" : " "); g.fillText(txt, 70, 245); g.fillStyle = "rgba(255,255,255,.6)"; g.font = `600 22px ${UIF}`; g.fillText("Név (legfeljebb 16 betű) – írhatsz a billentyűzeteden is", 70, 280);
    const kw = 98, kh = 84; KB_ROWS.forEach((row, r) => { const x0 = 40 + r * 30; row.split("").forEach((ch, i) => B.btn(x0 + i * (kw + 8), 310 + r * (kh + 8), kw, kh, ch, () => { if (HB.edit.length < 16) HB.edit += HB.edit.length ? ch.toLowerCase() : ch; }, { fs: 40 })); });
    B.btn(40 + 4 * 30 + 10 * (kw + 8), 310 + 3 * (kh + 8), 2 * kw + 8, kh, "⌫", () => { HB.edit = HB.edit.slice(0, -1); }, { fs: 40 });
    B.btn(340, 310 + 4 * (kh + 8), 640, kh, "szóköz", () => { if (HB.edit.length < 16 && HB.edit && !/ $/.test(HB.edit)) HB.edit += " "; });
    /* fénykép */
    { const im = pr.photo ? uiImg(pr.photo) : null; g.save(); g.beginPath(); g.arc(1060, 818, 44, 0, TAU); g.fillStyle = "#123b6b"; g.fill(); g.clip(); if (im && im.complete && im.naturalWidth) g.drawImage(im, 1016, 774, 88, 88); g.restore(); g.fillStyle = "rgba(255,255,255,.75)"; g.font = `600 20px ${UIF}`; g.fillText(pr.photo ? "a fényképed" : "nincs fénykép", 1120, 826); }
    B.btn(40, 776, 520, 84, "📷 Fénykép választása", hbPhoto); B.btn(580, 776, 380, 84, "Fotó törlése", () => { const p = vrProfile(); p.photo = ""; vrProfileSave(p); }, pr.photo ? {} : { off: true });
    if (T.inVR) { g.fillStyle = "#ffd166"; g.font = `600 18px ${UIF}`; g.fillText("Tipp: a fényképet szemüveg nélkül (telefonon, gépen) a legkönnyebb megadni.", 1120, 856); }
    B.btn(40, 884, 900, 96, "✓ Mentés", () => { const p = vrProfile(); p.name = HB.edit.trim().slice(0, 16); vrProfileSave(p); HB.edit = null; hbRebuildBoats(); hbMenu(); }, { gold: true });
    B.btn(960, 884, 500, 96, "Mégse", () => { HB.edit = null; hbMenu(); });
    if (!HB.kbd) { HB.kbd = (e) => { if (HB.page !== "profile" || HB.edit == null) return; if (e.key === "Backspace") { HB.edit = HB.edit.slice(0, -1); e.preventDefault(); } else if (e.key === "Enter") { const p = vrProfile(); p.name = HB.edit.trim().slice(0, 16); vrProfileSave(p); HB.edit = null; hbRebuildBoats(); hbMenu(); } else if (e.key.length === 1 && HB.edit.length < 16) HB.edit += e.key; if (HB.B) HB.B.dirty = 1; }; addEventListener("keydown", HB.kbd); W.upd.push(() => {}); const prevClose = W.onClose; W.onClose = () => { removeEventListener("keydown", HB.kbd); HB.kbd = null; if (prevClose) prevClose(); }; }
  }
  function hbPhoto() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.style.display = "none"; document.body.appendChild(inp);
    inp.onchange = () => { const f = inp.files && inp.files[0]; inp.remove(); if (!f) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = c.height = 192; const g = c.getContext("2d"), s = Math.min(im.width, im.height); g.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 192, 192); const p = vrProfile(); p.photo = c.toDataURL("image/jpeg", .82); vrProfileSave(p); if (HB.B) HB.B.dirty = 1; }; im.src = rd.result; }; rd.readAsDataURL(f); };
    inp.click();
  }
  /* a név megváltozott: a kikötött hajók vitorláján is frissüljön */
  function hbRebuildBoats() { try { HB.boats.forEach((o) => { const nm = vrProfile().name || ""; let g; if (o.b.id === "zephyr") { g = makeBoat({ detail: 0, vis: false, crew: 0, hull: "#f5f2e8", boot: "#141d4d", stripe: "#141d4d", jib: "#f6f4ec", main: "#d61f26", num: " ", cls: " ", logoImg: "img/zephyr-hajo-logo.png", reg: "H-30381", lazyBag: "#6e1423", nsCol: "#3f6fa6", teakDeck: true, spin: ["#ffffff", "#ffffff", "#f3f3ee"], spinArt: true, sailName: nm }); g.scale.setScalar(VR_SC); } else g = makeClassBoat(o.b.id, { crew: 0, name: nm, num: "HUN " + (o.b.id === "j420" ? "420" : "7"), seed: 3 });
      g.position.copy(o.g.position); g.rotation.copy(o.g.rotation); HB.env.remove(o.g); HB.env.add(g); g.userData.S.awa = 160; g.userData.S.aws = 3; o.g = g; }); } catch (e) { console.warn(e); } }
  /* ---------------------------------------------------------------- EREDMÉNYEK ÉS TRÓFEÁK */
  function hbDrawTrophy(B, g) {
    uiFrame(B, g, "🏆 EREDMÉNYEK ÉS TRÓFEÁK", "a sorozatok első három helyezettjének serlege a nevük alatt");
    const list = vrTrophies(), by = {}; list.forEach((t) => { (by[t.name] || (by[t.name] = [])).push(t); });
    const names = Object.keys(by).sort((a, b) => by[b].filter((q) => q.place === 1).length - by[a].filter((q) => q.place === 1).length || by[b].length - by[a].length);
    uiCard(g, 40, 150, 1420, 470);
    if (!names.length) { g.fillStyle = "#fff"; g.font = `800 32px ${UIF}`; g.fillText("Még nincs serleg. Nyerj egy 5 futamos sorozatot!", 70, 230); g.font = `600 24px ${UIF}`; g.fillText("A pontozás a Vitorlázás Versenyszabályai A függeléke szerint: helyezési pontok, a legkevesebb nyer.", 70, 280); }
    names.slice(0, 5).forEach((n, i) => { const y = 200 + i * 86, t = by[n]; g.fillStyle = "#fff"; uiFit(g, n, 330, 32, 900); g.fillText(n, 70, y + 32);
      const tt = t.slice(-10); tt.forEach((q, k) => uiCup(g, 440 + k * 62, y + 36, 50, q.place)); g.fillStyle = "rgba(255,255,255,.8)"; g.font = `600 19px ${UIF}`; const l = t[t.length - 1]; g.fillText(`${t.length} serleg · utoljára: ${l.date} · ${l.cls} · ${l.place}. hely`, 440 + tt.length * 62 + 20, y + 40); });
    /* a futó sorozat */
    const ser = VRR.series || vrSeriesLoad(); uiCard(g, 40, 640, 1420, 210); uiH(g, `A JELENLEGI SOROZAT · ${ser.races.length}/5 futam`, 70, 686);
    if (ser.races.length) { const tab = vrSeriesTable(ser); g.font = `700 26px ${UIF}`; tab.slice(0, 4).forEach((e, i) => { g.fillStyle = e.me ? "#ffd166" : "#fff"; g.fillText(`${i + 1}. ${e.n} – ${e.sum} pont (${e.pts.join(", ")})`, 70 + (i % 2) * 700, 740 + Math.floor(i / 2) * 44); }); }
    else { g.fillStyle = "#fff"; g.font = `600 24px ${UIF}`; g.fillText("Még nem futottál ebben a sorozatban.", 70, 740); }
    B.btn(40, 880, 1420, 96, "‹ Vissza a kikötői menübe", hbMenu, { gold: true });
  }
