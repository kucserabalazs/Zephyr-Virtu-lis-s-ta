
  /* =================================================================== 3/A. A ZEPHYR HÁZ – részletes modell a hivatalos tervrajz szerint (méterben; a makett ezt kicsinyíti)
     • Külső falak valódi nyílásokkal (ablak, teraszajtó, bejárati ajtó) – életnagyságban belülről is kilátsz a kertre.
     • Belső válaszfalak az alaprajz szobáiból, az ajtóknál nyitva; makettnézetben derékmagasságban metszve („babaház”), életnagyságban teljes magasságban.
     • Padló a helyiség szerint (parketta, csempe, kő), bútorok részletesen (ágy fejtámlával, párnákkal; kanapé díszpárnákkal; konyhapult főzőlappal, mosogatóval…).
     • Kert: utca járdával, kerítés kapuval, előkert, parkoló autókkal, sövény, hátsó kert pergolával és fényfüzérrel, napozóágyak, SUP-tartó, kerékpárok, fák. */
  const HX = {};
  function hmat(key) {
    if (HX[key]) return HX[key];
    const tile = (t, n) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); t.userData = { tile: n }; return t; };
    let m;
    switch (key) {
      case "plaster": m = std({ color: "#f4f1ea", map: tile(txNoise("plaster", "#f2efe8", .07, 6000, 3), 1.6), roughness: .92 }); break;
      case "plasterIn": m = std({ color: "#e6dfd2", map: tile(txNoise("plasterIn", "#f7f5f0", .04, 3000, 3), 1.6), roughness: .95 }); break;
      case "terrace": m = std({ map: tile(txPlanks("terrace", "#8e6644", "#b0825a", 8), 1.6), roughness: .78 }); break;
      case "parquet": m = std({ map: tile(txPlanks("parquet", "#c79b6a", "#e0b886", 10, { gap: .25, gapW: 1 }), 1.4), roughness: .55 }); break;
      case "tiles": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#d9dcdc"; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = `hsl(190,6%,${rr(84, 90)}%)`; g.fillRect(i * 64 + 1, j * 64 + 1, 62, 62); } }), .9), roughness: .25 }); break;
      case "stone": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, "#cfc8bb", .12, 3000, 4); g.strokeStyle = "rgba(90,80,70,.4)"; g.lineWidth = 2; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); g.beginPath(); g.moveTo(i * 128 + (i % 2) * 64, 0); g.lineTo(i * 128 + (i % 2) * 64, h); g.stroke(); } }), 1.2), roughness: .7 }); break;
      case "grass": m = std({ map: tile(txGrass(), 3), roughness: .95 }); break;
      case "asph": m = std({ map: tile(txNoise("asph", "#3c4046", .25, 5000, 3), 4), roughness: .95 }); break;
      case "pave": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, "#b9b2a4", .14, 2000, 4); g.strokeStyle = "rgba(70,64,56,.45)"; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } for (let j = 0; j < 4; j++) for (let i = 0; i <= 2; i++) { const x = i * 128 + (j % 2) * 64; g.beginPath(); g.moveTo(x, j * 64); g.lineTo(x, j * 64 + 64); g.stroke(); } }), 1.2), roughness: .85 }); break;
      case "painting": m = std({ map: canvasTex(256, 168, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#9ec5e0"); gr.addColorStop(.6, "#e8dcc0"); gr.addColorStop(.62, "#3d7fa8"); gr.addColorStop(1, "#1f4f73"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
          [[70, "#f4f1e8", "#c62828"], [170, "#f6f2e6", "#1f5fa8"]].forEach(([x, c1, c2]) => { g.fillStyle = c2; g.beginPath(); g.moveTo(x - 30, 108); g.lineTo(x + 34, 108); g.lineTo(x + 24, 120); g.lineTo(x - 22, 120); g.fill(); g.fillStyle = c1; g.beginPath(); g.moveTo(x, 20); g.lineTo(x + 30, 104); g.lineTo(x, 104); g.fill(); g.beginPath(); g.moveTo(x - 3, 30); g.lineTo(x - 28, 104); g.lineTo(x - 3, 104); g.fill(); }); }), roughness: .6 }); break;
      case "floral": m = std({ map: tile(canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#8a7462"; g.fillRect(0, 0, w, h); for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(245,240,230,${rr(.5, .9)})`; g.beginPath(); g.arc(rand() * w, rand() * h, rr(2, 6), 0, TAU); g.fill(); } g.strokeStyle = "rgba(245,240,230,.6)"; g.lineWidth = 1.5; for (let k = 0; k < 10; k++) { g.beginPath(); g.arc(rand() * w, rand() * h, rr(8, 16), rr(0, 3), rr(3, 6)); g.stroke(); } }), .6), roughness: .9 }); break;
      case "greyTile": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#6f6d69"; g.fillRect(0, 0, w, h); [[0, 0], [0, 128]].forEach(([x, y], i) => { g.fillStyle = `hsl(35,3%,${rr(58, 64)}%)`; g.fillRect(x + 1, y + 1, 254, 126); }); for (let k = 0; k < 1500; k++) { g.fillStyle = `rgba(255,255,255,${rr(0, .05)})`; g.fillRect(rand() * w, rand() * h, 3, 3); } }), 1.2), roughness: .45 }); break;
      case "woodTile": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { for (let j = 0; j < 8; j++) for (let i = 0; i < 2; i++) { g.fillStyle = `hsl(25,${rr(28, 40)}%,${rr(22, 34)}%)`; g.fillRect(i * 128 + (j % 2) * 64, j * 32, 127, 31); } }), .9), roughness: .55 }); break;
      case "hallTile": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#77797a"; g.fillRect(0, 0, w, h); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { g.fillStyle = `hsl(200,3%,${rr(55, 62)}%)`; g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124); } }), 1.2), roughness: .6 }); break;
      case "road": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, "#b7afa1", .16, 5000, 3); g.strokeStyle = "rgba(70,62,52,.35)"; g.lineWidth = 1.2; for (let k = 0; k < 14; k++) { g.beginPath(); let x = rand() * w, y = rand() * h; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += rr(-18, 18); y += rr(-18, 18); g.lineTo(x, y); } g.stroke(); } }), 3), roughness: .95 }); break;
      case "brick": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#8f877c"; g.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) for (let i = -1; i < 4; i++) { const x = i * 64 + (j % 2) * 32, y = j * 32; g.fillStyle = `hsl(30,${rr(6, 14)}%,${rr(58, 70)}%)`; g.fillRect(x + 2, y + 2, 60, 28); } }), .8), roughness: .85 }); break;
      case "grid": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#cfcac0"; g.fillRect(0, 0, w, h); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = `hsl(${rr(80, 105)},${rr(30, 45)}%,${rr(28, 40)}%)`; g.beginPath(); g.arc(i * 64 + 32, j * 64 + 32, 19, 0, TAU); g.fill(); } g.strokeStyle = "rgba(90,85,78,.4)"; g.lineWidth = 2; g.strokeRect(1, 1, 254, 254); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke(); }), 1.2), roughness: .9 }); break;
      case "rattan": m = std({ map: tile(canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#6e5236"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 3) { g.fillStyle = `hsl(30,${rr(30, 45)}%,${rr(28, 44)}%)`; g.fillRect(x, 0, 2, h); } }), .3), roughness: .9 }); break;
      case "gravel": m = std({ map: tile(txNoise("gravel", "#a8a196", .35, 9000, 3), 1.5), roughness: 1 }); break;
      case "roof": m = std({ map: tile(txNoise("roof", "#b9bab6", .2, 6000, 3), 2), roughness: .95 }); break;
      case "hedge": m = windify(std({ map: tile(canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#2f5a2a"; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = `hsl(${rr(95, 120)},${rr(35, 55)}%,${rr(16, 38)}%)`; g.beginPath(); g.ellipse(rand() * w, rand() * h, rr(2, 5), rr(1, 3), rand() * 3, 0, TAU); g.fill(); } }), 1), roughness: .95 }), .0012, 1.3, "hedge"); break;
      case "glass": m = std({ color: "#9fc0d0", roughness: .04, metalness: .3, transparent: true, opacity: .32, depthWrite: false, envMapIntensity: 1.6, emissive: new THREE.Color("#ffc878"), emissiveIntensity: 0 }); break;
      case "rail": m = std({ color: "#cfe3ea", roughness: .05, metalness: .2, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }); break;
      case "frame": m = std({ color: "#33373d", roughness: .45, metalness: .5 }); break;
      case "steel": m = std({ color: "#c9cdd2", roughness: .25, metalness: .9 }); break;
      case "chrome": m = std({ color: "#e8ecef", roughness: .1, metalness: 1 }); break;
      case "foliage": m = windify(std({ color: "#ffffff", vertexColors: true, roughness: .92 }), .004, 1.1, "fol"); break;
      case "foliage2": m = windify(std({ color: "#ffffff", vertexColors: true, roughness: .92 }), .005, 1.2, "fol2"); break;
      case "bulb": m = std({ color: "#fff2c8", emissive: new THREE.Color("#ffcf7a"), emissiveIntensity: 0, roughness: .4 }); break;
      case "lampIn": m = std({ color: "#fff8e8", emissive: new THREE.Color("#ffd9a0"), emissiveIntensity: 0, roughness: .5 }); break;
      case "vc": m = std({ vertexColors: true, roughness: .75 }); break;
      case "vcm": m = std({ vertexColors: true, roughness: .3, metalness: .6 }); break;
      default: m = std({ color: key.split("|")[0], roughness: key.includes("|m") ? .3 : .75, metalness: key.includes("|m") ? .6 : 0, flatShading: key.includes("|f") });
    }
    /* belső felületek: kevesebb környezeti fény (különben életnagyságban kifehérednek a szobák) */
    if (/plasterIn|parquet|tiles|stone|vc$/.test(key)) m.envMapIntensity = .35;
    return HX[key] = m;
  }
  /* UV a világkoordinátából (méterben, a domináns normál szerint) – így a textúrák minden dobozon egyforma léptékűek */
  function worldUV(g, tile) {
    const p = g.attributes.position, n = g.attributes.normal; if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile); else if (ax >= az) uv.setXY(i, p.getZ(i) / tile, p.getY(i) / tile); else uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile); }
  }

  function buildHouse(model) {
    const H = { lv: [new THREE.Group(), new THREE.Group()], meshes: [], apts: {}, spots: [], floors: [] };
    H.lv.forEach((g, i) => { g.position.y = i * FLOOR_H; model.add(g); });
    H.roof = new THREE.Group(); model.add(H.roof);
    const reg = {};
    /* add(anyag, geometria, mátrix, szint (-1 = telek), láthatóság) – a láthatóság: all | tall | low | pT | pL | life | roof */
    /* a sima színű elemek (#rrggbb) egyetlen csúcsszínes anyagba kerülnek (fém: „|m”) – így a ház ~60 rajzolási hívás, nem 200 */
    const add = (mk, g, m, lv, vis) => {
      if (mk[0] === "#") { const metal = mk.includes("|m"), c = new THREE.Color(mk.split("|")[0]), n = g.attributes.position.count, a = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute("color", new THREE.BufferAttribute(a, 3)); mk = metal ? "vcm" : "vc"; }
      const k = mk + "~" + (lv == null ? -1 : lv) + "~" + (vis || "all"); (reg[k] = reg[k] || { mk, lv: lv == null ? -1 : lv, vis: vis || "all", list: [] }).list.push([g, m || new THREE.Matrix4()]); };
    const box = (mk, x0, y0, z0, x1, y1, z1, lv, vis) => add(mk, new THREE.BoxGeometry(Math.max(.005, x1 - x0), Math.max(.005, y1 - y0), Math.max(.005, z1 - z0)), M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), lv, vis);
    const cyl = (mk, x, y0, z, r, h, lv, vis, seg, r2) => add(mk, new THREE.CylinderGeometry(r, r2 == null ? r : r2, h, seg || 12), M4(x, y0 + h / 2, z), lv, vis);
    const ball = (mk, x, y, z, r, lv, vis, sx, sy, sz) => add(mk, new THREE.IcosahedronGeometry(r, 1), M4(x, y, z, 0, 0, 0, sx || 1, sy || 1, sz || 1), lv, vis);
    H.add = add; H.box = box;

    /* ------------------------------------------------ a telek: utca, járda, kerítés, előkert, parkoló, kert */
    const SX0 = -3, SX1 = 13.5, SZ0 = -10, SZ1 = 40; H.site = { SX0, SX1, SZ0, SZ1 };
    /* utca (a valódi fotók szerint): világos, kopott aszfalt felfestés nélkül, előtte fehér zúzottkő sáv */
    box("road", SX0, 0, -9.2, SX1, .05, -4.4);
    box("gravel", SX0, 0, -4.4, SX1, .07, -2.7);
    box("#8d9583", SX0, -.06, -2.7, SX1, -.005, SZ1);   /* telek alap (a ház padlója alatt) */
    box("brick", 6.3, 0, -4.4, 12.6, .08, -2.7);          /* térkő a kapu előtt */
    box("grass", -.4, .04, -2.5, 6.3, .07, -.05);
    /* utcai kerítés: alacsony lábazat, sötét fém pálcák; a parkoló előtt toló kapu, mellette kiskapu; postaláda, házszám */
    const bars = (x0, x1, z, h, gap) => { box("#8d8a84", x0, 0, z - .1, x1, .32, z + .1); for (let x = x0 + .05; x < x1 - .02; x += gap) box("frame", x, .32, z - .015, x + .025, .32 + h, z + .015); box("frame", x0, .32 + h, z - .025, x1, .36 + h, z + .025); box("frame", x0, .5, z - .02, x1, .53, z + .02); };
    bars(-.4, 6.1, -2.6, 1.2, .12);
    box("frame", 6.1, 0, -2.7, 6.3, 1.7, -2.5); box("frame", 12.6, 0, -2.7, 12.8, 1.7, -2.5);
    for (let x = 6.4; x < 12.5; x += .13) box("frame", x, .08, -2.63, x + .03, 1.5, -2.57);   /* toló kapu */
    box("frame", 6.35, 1.48, -2.65, 12.55, 1.55, -2.55); box("frame", 6.35, .08, -2.65, 12.55, .15, -2.55);
    box("#3a3f45|m", 5.5, .9, -2.72, 5.85, 1.2, -2.62);                                            /* postaláda */
    /* előkert: cserjék, virágok */
    [[.3, -1.8], [5.4, -1.9], [-.1, -.7]].forEach(([x, z]) => add("foliage", leafGeom([[x, .45, z, .5, 7, .9]], "#5f9a3a", .1)));
    flowers(add, -.3, -2.3, 1.2, -1.2, 40); flowers(add, 3, -2.3, 5.2, -1.5, 50);
    /* BEHAJTÓ ÉS HÁTSÓ PARKOLÓ (2026. nov. 6., a hátsó parkoló és a kert 360°-os fotói szerint átrendezve):
       • a ház keleti oldala mellett és a keleti sövény mentén végig térkövezett behajtó (téglalap alakú térkő) – a kertig fut;
       • a ház mögött (a zárt terasz és a hátsó L-lépcső mögött) gyephézagos, lyukas betonelemes parkoló 4 autónak:
         az autók keresztben állnak, orral nyugatra (a kertből oldalról látszanak), az első a lépcső mellett – mint a fotón a fehér terepjáró;
       • a parkoló nyugati szélén zöld belátásgátló kerítés, mögötte a Schooner kis kertje;
       • a kert nyugati felén a nádfonatos kerti konyha pavilonnal, előtte betonozott pihenőn a kő tűzrakóasztal (grillező) kőpadokkal,
         mellette két napozószék és a kerti zuhany; középen és keleten egy-egy pavilon asztallal, székekkel; a keleti sövénynél kerti csap és kuka. */
    const PZ0 = Z_END + 3.3, PZ1 = PZ0 + 6.4, PX0 = 1.1, PX1 = 10.4;
    box("brick", 6.3, .04, -2.7, 12.6, .065, PZ0);          /* behajtó a ház mellett */
    box("brick", PX1, .04, PZ0, 12.6, .065, PZ1 + 4.2);     /* behajtó a keleti sövény mentén, a kertig */
    box("grid", PX0, .04, PZ0, PX1, .062, PZ1);             /* gyephézagos parkoló */
    box("#9aa0a6", PX0 - .05, .04, PZ1 - .05, PX1, .075, PZ1 + .05); box("#9aa0a6", PX1 - .05, .04, PZ0, PX1 + .05, .075, PZ1 + 4.2);   /* szegélykő */
    /* 2026. nov. 9. (tulajdonos): a parkolóban NEM két autó áll egymás mögött, hanem NÉGY autó EGYMÁS MELLETT – orral a ház felé */
    { const slot = (PX1 - PX0) / 4; ["#eef0f2", "#4a5058", "#8a1f24", "#1f3a6a"].forEach((c, k) => car(add, c, PX0 + slot * (k + .5), (PZ0 + PZ1) / 2 + .2, 0));
      for (let k = 0; k <= 4; k++) box("#e9ecef", PX0 + slot * k - .03, .062, PZ0 + .9, PX0 + slot * k + .03, .066, PZ1 - .3); }   /* parkolóhely-jelölés */
    box("hedge", 12.6, .04, -2.7, 13.0, 1.75, SZ1);
    /* zöld belátásgátló kerítés a parkoló nyugati szélén és a Schooner-kert déli szélén */
    box("#4f6f5c", PX0 - .06, .04, PZ0, PX0, 1.75, PZ1); box("#4f6f5c", -.4, .04, PZ1 - .06, PX0, 1.75, PZ1);
    for (let z = PZ0 + .5; z < PZ1; z += 1.25) box("frame", PX0 - .09, .04, z, PX0 - .03, 1.8, z + .05);
    /* gyep: a Schooner kis kertje és a hátsó kert (műfű) */
    box("grass", -.4, .04, PZ0, PX0 - .06, .07, PZ1 - .06); box("grass", -.4, .04, PZ1, PX1, .07, SZ1);
    for (let z = 23; z < SZ1 - .5; z += 1.15) add("foliage", leafGeom([[-.9, 1.6, z, .55, 6, 3.2]], "#2f5a2c", .1));
    box("hedge", -.6, .04, SZ1 - .25, 12.9, 1.6, SZ1);
    /* betonozott pihenő a kerti konyha és a tűzrakó körül */
    box("#bdb7ad", -.3, .04, PZ1 + .4, 5.2, .1, PZ1 + 5.0);
    /* fehér kerti pavilonok (gazebo): a kerti konyha fölött és két ülőhely */
    const gazebo = (cx, cz, w) => { const h = w / 2; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { box("#c9cdd2|m", cx + a * h - .03, .1, cz + b * h - .03, cx + a * h + .03, 2.2, cz + b * h + .03); for (let y = .5; y < 2.1; y += .4) box("#c9cdd2|m", cx + a * h - .04, y, cz + b * h - .04, cx + a * h + .04, y + .03, cz + b * h + .04); });
      add("#f4f3ee", new THREE.ConeGeometry(w * .74, .75, 4, 1, true), M4(cx, 2.55, cz, Math.PI / 4)); add("#e9e7df", new THREE.ConeGeometry(w * .73, .74, 4, 1, true), M4(cx, 2.54, cz, Math.PI / 4));
      [[0, -h], [0, h]].forEach(([dx, dz]) => box("#f4f3ee", cx - h, 2.0, cz + dz - .01, cx + h, 2.2, cz + dz + .01)); [[-h, 0], [h, 0]].forEach(([dx]) => box("#f4f3ee", cx + dx - .01, 2.0, cz - h, cx + dx + .01, 2.2, cz + h)); };
    const tableSet = (cx, cz) => { box("#9aa0a6", cx - .45, .74, cz - .45, cx + .45, .78, cz + .45); box("#2b2f36|m", cx - .03, .1, cz - .03, cx + .03, .74, cz + .03);
      [[0, -.75, 0], [0, .75, Math.PI], [-.75, 0, Math.PI / 2], [.75, 0, -Math.PI / 2]].forEach(([dx, dz, r]) => chair(add, cx + dx, cz + dz, r, -1, "#2b2f36", .07)); };
    const KX = 2.2, KZ = PZ1 + 3.6;   /* a kerti konyha pavilonja */
    gazebo(KX, KZ, 3); gazebo(6.6, PZ1 + 2.6, 2.8); gazebo(9.0, PZ1 + 6.2, 2.8);
    tableSet(6.6, PZ1 + 2.6); tableSet(9.0, PZ1 + 6.2);
    /* kerti konyha: nádfonatos pult, világos munkalap, mosogató, mellette a kerti hűtő */
    box("rattan", KX - 1.3, .1, KZ + .3, KX + 1.3, 1.0, KZ + .9); box("#d9d4c8", KX - 1.35, 1.0, KZ + .25, KX + 1.35, 1.05, KZ + .95); box("steel", KX + .3, 1.05, KZ + .4, KX + .8, 1.06, KZ + .8);
    box("#2b2f36|m", KX - 1.75, .1, KZ + .35, KX - 1.4, 1.5, KZ + .85);
    /* a grillező: kő tűzrakóasztal (középen fémtálca), három oldalán kőpad – a konyha előtt, a pihenő közepén */
    const GX = 3.4, GZ = PZ1 + 1.7;
    box("#d2cdc1", GX - .55, .1, GZ - .4, GX + .55, .5, GZ + .4); box("#cfcabe", GX - .7, .5, GZ - .5, GX + .7, .58, GZ + .5); box("#3a3a3a", GX - .3, .58, GZ - .22, GX + .3, .6, GZ + .22);
    box("#555", GX - .26, .6, GZ - .18, GX + .26, .66, GZ + .18);   /* tálca, rács */
    for (let k = -2; k <= 2; k++) box("#222", GX + k * .1 - .01, .66, GZ - .18, GX + k * .1 + .01, .67, GZ + .18);
    [[GX, GZ - 1.05, 1.5, .34], [GX, GZ + 1.05, 1.5, .34], [GX + 1.15, GZ, .34, 1.2]].forEach(([x, z, w, d]) => { box("#cfcabe", x - w / 2, .1, z - d / 2, x + w / 2, .4, z + d / 2); box("#bdb8ac", x - w / 2 + .1, .1, z - d / 2 + .06, x - w / 2 + .22, .38, z + d / 2 - .06); box("#bdb8ac", x + w / 2 - .22, .1, z - d / 2 + .06, x + w / 2 - .1, .38, z + d / 2 - .06); });
    /* napozószékek (sötét, kartámás) a pihenő nyugati szélén, kerti zuhany a kerítésnél */
    [[.6, GZ - .6], [.6, GZ + .5]].forEach(([x, z]) => { add("#2b2f36", new THREE.BoxGeometry(1.1, .04, .6), M4(x, .5, z, Math.PI / 2, 0, -.3)); add("#2b2f36", new THREE.BoxGeometry(.6, .04, .62), M4(x - .72, .78, z, Math.PI / 2, 0, -1.0));
      [[-.28], [.28]].forEach(([dz]) => add("#1c1f24|m", new THREE.BoxGeometry(1.4, .6, .03), M4(x - .1, .42, z + dz, 0, 0, .4))); });
    cyl("frame", -.15, .04, PZ1 + 1.0, .04, 2.1, -1); box("frame", -.2, 2.1, PZ1 + .95, .25, 2.14, PZ1 + 1.05); cyl("steel", .22, 1.95, PZ1 + 1.0, .1, .04, -1); box("#7a5a3a", -.4, .04, PZ1 + .6, .4, .1, PZ1 + 1.4);
    /* kerékpárok a konyha mögött, SUP-tartó és tároló (hűtő, kompresszor) a kert hátsó részén */
    for (let k = 0; k < 4; k++) bike(add, 4.2 + k * .55, KZ + 1.9, ["#2b2f36", "#c62828", "#1f5fa8", "#e9ecef"][k]);
    box("#7a5a3a", 6.6, .04, SZ1 - 2.6, 6.7, 1.3, SZ1 - 2.4); box("#7a5a3a", 6.6, .04, SZ1 - 1.2, 6.7, 1.3, SZ1 - 1.0);
    for (let k = 0; k < 4; k++) add(["#ffd166", "#1f5fa8", "#e5262f", "#3fb37f"][k], new THREE.BoxGeometry(.7, .1, 1.5), M4(6.95 + k * .02, .45 + k * .26, SZ1 - 1.8));
    box("#8c939b", 1.0, .04, SZ1 - 2.5, 3.2, 2.1, SZ1 - .5); box("#6d737a", .9, 2.1, SZ1 - 2.6, 3.3, 2.18, SZ1 - .4); box("#5a3d24", 1.7, .04, SZ1 - 2.52, 2.3, 1.9, SZ1 - 2.5);
    /* kerti csap a keleti sövénynél, kuka a behajtó végén */
    box("#c9c2b2", 10.2, .04, PZ1 + 7.6, 10.4, 1.0, PZ1 + 8.0); cyl("steel", 10.15, .75, PZ1 + 7.8, .03, .12, -1);
    box("#2b2f36", 12.0, .065, PZ1 + 1.0, 12.5, 1.05, PZ1 + 1.5); box("#f2c94c", 12.0, 1.05, PZ1 + 1.0, 12.5, 1.1, PZ1 + 1.5);
    /* fák a kertben */
    [[6.0, 38.6, 2.0], [10.6, 38.8, 1.4], [11.8, 24.0, 1.3], [-1.6, -6.1, 1.4], [11.2, -3.4, 1.3]].forEach(([x, z, r]) => tree(add, x, z, r));
    flowers(add, -.2, PZ0 + .3, .9, PZ1 - .4, 50); flowers(add, 4.8, 39.0, 8.6, 39.6, 60);
    /* kerti lámpák (bollardok) a parkoló és a gyep határán */
    for (let x = 1.6; x < PX1; x += 3) { cyl("frame", x, .04, PZ1 + .25, .06, .7, -1); cyl("bulb", x, .7, PZ1 + .25, .07, .1, -1); }
    garland(add, [[KX - 1.5, 2.15, KZ - 1.5], [6.6 + 1.4, 2.15, PZ1 + 1.2], [9.0 + 1.4, 2.2, PZ1 + 4.8], [9.0 - 1.4, 2.2, PZ1 + 7.6]], .25, -1, "all");   /* fényfüzér a pavilonok között */

    /* ------------------------------------------------ az épület */
    const Y1 = FLOOR_H;
    /* födémek (alul vakolt mennyezet) */
    /* a középső lépcsőház két szint magas (a fotók szerint): az emeleti födémben a lépcső fölött és mellette nagy nyílás van */
    const VOID = [WALL, Z_HALL + 1.2, 3.4, Z_B - PART];   /* x0, z0, x1, z1 – a légtér az emeleten */
    box("plasterIn", 0, -.2, 0, OUT_W, 0, Z_END, 0);
    box("plasterIn", 0, -.2, 0, OUT_W, 0, VOID[1], 1); box("plasterIn", 0, -.2, VOID[3], OUT_W, 0, Z_END, 1); box("plasterIn", VOID[2], -.2, VOID[1], OUT_W, 0, VOID[3], 1); box("plasterIn", 0, -.2, VOID[1], WALL, 0, VOID[3], 1);
    /* nyílások a külső falakon: az alaprajzok ablakaiból és ajtóiból */
    const open = { W: [[], []], E: [[], []], N: [[], []], S: [[], []] };   /* N = utcai homlokzat (z = 0), S = hátsó (z = Z_END) */
    Object.keys(UNITS).forEach((id) => {
      const U = UNITS[id], Pl = planOf(id);
      (Pl.furn || []).forEach((f) => {
        if (f[0] !== "window" && f[0] !== "door") return;
        const q = mapRect(U, f[1], f[2], f[3], f[4]), cx = (q[0] + q[2]) / 2, cz = (q[1] + q[3]) / 2, lab = String(f[5] || "");
        const door = f[0] === "door", y0 = door ? 0 : .9, y1 = door ? 2.15 : 2.15, kind = door ? (/bejárati/.test(lab) ? "entry" : "glass") : "win";
        if (cx < WALL + .35) open.W[U.lvl].push({ a: q[1], b: q[3], y0, y1, kind });
        else if (cx > OUT_W - WALL - .35) open.E[U.lvl].push({ a: q[1], b: q[3], y0, y1, kind });
        else if (cz < WALL + .4) open.N[U.lvl].push({ a: q[0], b: q[2], y0, y1, kind });
        else if (cz > Z_END - WALL - .4) open.S[U.lvl].push({ a: q[0], b: q[2], y0, y1, kind });
      });
    });
    /* a fedett bejáró felőli ajtók (a Dingi/Kalóz és a lépcsőház) – a középső szakasz nyitott oldalain nincs külső fal */
    const wallRun = (lv, side, from, to, Hh, vis, list) => {
      /* a falat a nyílások köré rakjuk össze: alatta (parapet), fölötte (szemöldök), köztük teljes magasság */
      const ops = list.filter((o) => o.b > from && o.a < to).map((o) => Object.assign({}, o, { a: Math.max(from, o.a), b: Math.min(to, o.b) })).sort((p, q) => p.a - q.a);
      const seg = (a, b, y0, y1) => { if (b - a < .01 || y1 - y0 < .01) return;
        if (side === "W") box("plaster", 0, y0, a, WALL, y1, b, lv, vis); else if (side === "E") box("plaster", OUT_W - WALL, y0, a, OUT_W, y1, b, lv, vis);
        else if (side === "N") box("plaster", a, y0, 0, b, y1, WALL, lv, vis); else box("plaster", a, y0, Z_END - WALL, b, y1, Z_END, lv, vis); };
      let cur = from;
      ops.forEach((o) => { seg(cur, o.a, 0, Hh); seg(o.a, o.b, 0, Math.min(o.y0, Hh)); if (o.y1 < Hh) seg(o.a, o.b, o.y1, Hh); cur = Math.max(cur, o.b);
        /* üveg, keret, könyöklő */
        const top = Math.min(o.y1, Hh); if (o.y0 >= top) return;
        const pane = (a, b, y0, y1, mk) => { const t = mk === "glass" ? .02 : .05;
          if (side === "W") box(mk, WALL / 2 - t / 2, y0, a, WALL / 2 + t / 2, y1, b, lv, vis); else if (side === "E") box(mk, OUT_W - WALL / 2 - t / 2, y0, a, OUT_W - WALL / 2 + t / 2, y1, b, lv, vis);
          else if (side === "N") box(mk, a, y0, WALL / 2 - t / 2, b, y1, WALL / 2 + t / 2, lv, vis); else box(mk, a, y0, Z_END - WALL / 2 - t / 2, b, y1, Z_END - WALL / 2 + t / 2, lv, vis); };
        if (o.kind === "entry") { pane(o.a + .04, o.b - .04, o.y0, top - .02, "#5b4a3c"); pane(o.a, o.a + .05, o.y0, top, "frame"); pane(o.b - .05, o.b, o.y0, top, "frame"); return; }
        pane(o.a + .05, o.b - .05, o.y0 + .05, top - .05, "glass");
        pane(o.a, o.a + .06, o.y0, top, "frame"); pane(o.b - .06, o.b, o.y0, top, "frame"); pane(o.a, o.b, top - .06, top, "frame"); pane(o.a, o.b, o.y0, o.y0 + .06, "frame");
        if (o.b - o.a > 1.0) pane((o.a + o.b) / 2 - .03, (o.a + o.b) / 2 + .03, o.y0, top, "frame");
        /* függöny két oldalt és karnis (csak a teljes magasságú falnál) */
        if (vis === "tall") {
          const inn = (a, b, y0, y1, d, mk) => { if (side === "W") box(mk, WALL + .02, y0, a, WALL + .02 + d, y1, b, lv, vis); else if (side === "E") box(mk, OUT_W - WALL - .02 - d, y0, a, OUT_W - WALL - .02, y1, b, lv, vis);
            else if (side === "N") box(mk, a, y0, WALL + .02, b, y1, WALL + .02 + d, lv, vis); else box(mk, a, y0, Z_END - WALL - .02 - d, b, y1, Z_END - WALL - .02, lv, vis); };
          inn(o.a - .3, o.b + .3, 2.38, 2.41, .03, "#8a8f96|m");
          for (let k = 0; k < 3; k++) { const f = k * .1; inn(o.a - .28 + f, o.a - .2 + f, .05, 2.36, .05 + (k % 2) * .03, "#ebe2cf"); inn(o.b + .2 - f - .08 + .08 - .08, o.b + .28 - f, .05, 2.36, .05 + (k % 2) * .03, "#ebe2cf"); }
        }
        if (o.kind === "win") { const sx = .06; if (side === "W") box("#d9d4c8", -sx, o.y0 - .05, o.a - .03, WALL, o.y0, o.b + .03, lv, vis); else if (side === "E") box("#d9d4c8", OUT_W - WALL, o.y0 - .05, o.a - .03, OUT_W + sx, o.y0, o.b + .03, lv, vis);
          else if (side === "N") box("#d9d4c8", o.a - .03, o.y0 - .05, -sx, o.b + .03, o.y0, WALL, lv, vis); else box("#d9d4c8", o.a - .03, o.y0 - .05, Z_END - WALL, o.b + .03, o.y0, Z_END + sx, lv, vis); }
      });
      seg(cur, to, 0, Hh);
    };
    [0, 1].forEach((lv) => [["tall", FLOOR_H - .2], ["low", 1.05]].forEach(([vis, Hh]) => {
      wallRun(lv, "N", 0, OUT_W, Hh, vis, open.N[lv]); wallRun(lv, "S", 0, OUT_W, Hh, vis, open.S[lv]);
      /* oldalfalak: a fedett bejáró szakaszán (Z_HALL…Z_B) a földszinten nyitott (kapualj), az emeleten a folyosó */
      [["W", open.W[lv]], ["E", open.E[lv]]].forEach(([s, L]) => {
        if (lv === 0) { wallRun(lv, s, 0, Z_HALL, Hh, vis, L); wallRun(lv, s, Z_B - PART, Z_END, Hh, vis, L); if (s === "W") box("#e2dccf", -.05, 0, Z_HALL, WALL, Hh, Z_B - PART, lv, vis); }   /* a lépcsőháznál a szomszéd fala látszik (ott nincs külön Zephyr-fal) */
        else if (s === "E") { wallRun(lv, s, 0, Z_HALL, Hh, vis, L); wallRun(lv, s, Z_B - PART, Z_END, Hh, vis, L); }   /* emeleten a Kalóz terasza keletre nyitott (üvegkorlát) */
        else wallRun(lv, s, 0, Z_END, Hh, vis, L);
      });
    }));
    /* lakáselválasztó falak (teljes szélesség) – a bejárati ajtóknál nyitva */
    const doorsAll = [[], []];
    Object.keys(UNITS).forEach((id) => { const U = UNITS[id]; (planOf(id).furn || []).forEach((f) => { if (f[0] === "door") doorsAll[U.lvl].push(mapRect(U, f[1], f[2], f[3], f[4])); }); });
    const partRun = (lv, mk, axis, c, from, to, th, Hh, vis, doors) => {
      /* axis "x": a fal x mentén fut (z = c); "z": z mentén (x = c) */
      const gaps = doors.filter((d) => axis === "x" ? (d[1] < c + .3 && d[3] > c - .3 && d[2] > from && d[0] < to && (d[2] - d[0]) > .3) : (d[0] < c + .3 && d[2] > c - .3 && d[3] > from && d[1] < to && (d[3] - d[1]) > .3))
        .map((d) => axis === "x" ? [Math.max(from, d[0]), Math.min(to, d[2])] : [Math.max(from, d[1]), Math.min(to, d[3])]).sort((p, q) => p[0] - q[0]);
      const seg = (a, b, y0, y1) => { if (b - a < .02 || y1 <= y0) return; if (axis === "x") box(mk, a, y0, c - th / 2, b, y1, c + th / 2, lv, vis); else box(mk, c - th / 2, y0, a, c + th / 2, y1, b, lv, vis); };
      let cur = from; gaps.forEach(([a, b]) => { seg(cur, a, 0, Hh); if (Hh > 2.15) seg(a, b, 2.15, Hh); cur = Math.max(cur, b); }); seg(cur, to, 0, Hh);
    };
    [0, 1].forEach((lv) => [["pT", FLOOR_H - .2], ["pL", .95]].forEach(([vis, Hh]) => {
      [Z_HALL - PART, Z_B - PART, Z_C - PART].forEach((z) => partRun(lv, "plasterIn", "x", z + PART / 2, WALL, OUT_W - WALL, PART, Hh, vis, doorsAll[lv]));
    }));
    /* BEJÁRATI AJTÓK (2026. nov. 9., tulajdonos: „hiányzik a Fregatt apartman bejárata”): minden lakás bejárati ajtaja valódi, zárt
       ajtólap tok-kerettel, sárgaréz kilinccsel és a lakás számával/nevével – az emeleti galériáról így látszik a Fregatt ajtaja is */
    Object.keys(UNITS).forEach((id) => { const U = UNITS[id], g2 = T.GROUPS.find((q) => q.id === id) || {};
      (planOf(id).furn || []).forEach((f) => { if (f[0] !== "door" || !/bejárat/.test(String(f[5] || ""))) return;
        const q = mapRect(U, f[1], f[2], f[3], f[4]), alongX = (q[2] - q[0]) >= (q[3] - q[1]);
        /* a legközelebbi falsík (lakáselválasztó / külső fal) */
        const walls = alongX ? [Z_HALL - PART / 2, Z_B - PART / 2, Z_C - PART / 2, WALL / 2, Z_END - WALL / 2] : [WALL / 2, OUT_W - WALL / 2];
        const c0 = alongX ? (q[1] + q[3]) / 2 : (q[0] + q[2]) / 2, c = walls.reduce((b, w) => Math.abs(w - c0) < Math.abs(b - c0) ? w : b, walls[0]);
        if (Math.abs(c - c0) > .45) return;
        const a0 = alongX ? q[0] : q[1], a1 = alongX ? q[2] : q[3], t = .05, lv = U.lvl;
        const B = (mk, u0, y0, u1, y1, d0, d1) => alongX ? box(mk, u0, y0, c + d0, u1, y1, c + d1, lv) : box(mk, c + d0, y0, u0, c + d1, y1, u1, lv);
        B("#4a3a2e", a0 + .02, 0, a1 - .02, 2.12, -t, t);   /* ajtólap */
        B("frame", a0 - .06, 0, a0 + .02, 2.2, -.09, .09); B("frame", a1 - .02, 0, a1 + .06, 2.2, -.09, .09); B("frame", a0 - .06, 2.12, a1 + .06, 2.2, -.09, .09);
        [-1, 1].forEach((sd) => { B("#c9a24a|m", a1 - .14, 1.0, a1 - .1, 1.04, sd * t, sd * (t + .07)); B("#2a2116", a0 + .12, .2, a1 - .12, .22, sd * t, sd * (t + .005)); B("#2a2116", a0 + .12, 1.9, a1 - .12, 1.92, sd * t, sd * (t + .005)); });
        if (g2.no) { const sx = (a0 + a1) / 2; [-1, 1].forEach((sd) => B(id === "fregatt" ? "#c9a24a|m" : "#c9a24a|m", sx - .13, 1.55, sx + .13, 1.75, sd * t, sd * (t + .012))); }
      }); });
    /* lakások: padló, belső válaszfalak, bútorok, mennyezeti lámpák, sétapontok (valódi 360°-os fotók) */
    Object.keys(UNITS).forEach((id) => {
      const U = UNITS[id], Pl = planOf(id), lv = U.lvl; let bb = [1e9, 1e9, -1e9, -1e9];
      const doors = (Pl.furn || []).filter((f) => f[0] === "door").map((f) => mapRect(U, f[1], f[2], f[3], f[4]));
      (Pl.rooms || []).forEach((r) => {
        const q = mapRect(U, r[1], r[2], r[3], r[4]); q[0] = Math.max(WALL, q[0]); q[2] = Math.min(OUT_W - WALL, q[2]);
        bb = [Math.min(bb[0], q[0]), Math.min(bb[1], q[1]), Math.max(bb[2], q[2]), Math.max(bb[3], q[3])];
        /* padló a fotók szerint: nappali, háló, előtér nagy szürke lapok; fürdő fahatású burkolat */
        const fm = /fürd|wc/i.test(r[0]) ? "woodTile" : "greyTile";
        box(fm, q[0], 0, q[1], q[2], .025, q[3], lv);
        H.floors.push({ lv, q, id });
        const inside = (v, a, b) => v > a + .05 && v < b - .05;
        [["pT", FLOOR_H - .2], ["pL", .95]].forEach(([vis, Hh]) => {
          if (inside(q[0], WALL, OUT_W - WALL)) partRun(lv, "plasterIn", "z", q[0], q[1], q[3], .1, Hh, vis, doors);
          if (inside(q[2], WALL, OUT_W - WALL)) partRun(lv, "plasterIn", "z", q[2], q[1], q[3], .1, Hh, vis, doors);
          /* a külső falak és a lakáselválasztó falak mentén nem kell külön válaszfal (különben eltakarná az ablakokat) */
          const onWall = (z) => z <= WALL + .08 || z >= Z_END - WALL - .08 || [Z_HALL - PART, Z_HALL, Z_B - PART, Z_B, Z_C - PART, Z_C].some((w) => Math.abs(z - w) < .1);
          if (!onWall(q[1])) partRun(lv, "plasterIn", "x", q[1], q[0], q[2], .1, Hh, vis, doors);
          if (!onWall(q[3])) partRun(lv, "plasterIn", "x", q[3], q[0], q[2], .1, Hh, vis, doors);
        });
        /* mennyezeti lámpa (életnagyságban), szőnyeg a nappaliban/hálóban */
        const cx = (q[0] + q[2]) / 2, cz = (q[1] + q[3]) / 2;
        cyl("lampIn", cx, FLOOR_H - .26, cz, .2, .05, lv, "life", 20); cyl("#d8d2c6", cx, FLOOR_H - .23, cz, .03, .03, lv, "life");
        if (/nappali|háló|szoba/i.test(r[0]) && (q[2] - q[0]) > 1.8 && (q[3] - q[1]) > 1.8) box(["#b9a58a", "#9aa7b4", "#c7b08e", "#a3998d"][(r[1] * 7 + r[2] * 3 | 0) % 4], cx - .9, .025, cz - .65, cx + .9, .035, cz + .65, lv);
      });
      furnishDetailed(add, lv, U, Pl, id);
      const g = T.GROUPS.find((q) => q.id === id) || {};
      H.apts[id] = { id, lv, bb, name: g.name || id, no: g.no, lock: !!g.lock, area: (Pl.rooms || []).reduce((s, r) => s + r[3] * r[4], 0) };
      /* 360°-os fotópontok: a séta jelenetei, amelyek ebben a lakásban vannak */
      Object.keys(T.SCENES || {}).forEach((sid) => { const S = T.SCENES[sid]; if (!S || S.g !== id || !S.m) return; const p = U.map(S.m[0], S.m[1]); if (p[0] < WALL || p[0] > OUT_W - WALL) return; H.spots.push({ id: sid, apt: id, lv, x: p[0], z: p[1], n: S.n }); });
    });
    /* fedett bejáró a lépcsővel (földszint), emeleti folyosó/terasz */
    box("hallTile", WALL, 0, Z_HALL, OUT_W - WALL, .03, Z_B - PART, 0);   /* nagy szürke lapok (a fotó szerint) */
    /* a lépcső a fotók szerint: a nyugati (szomszéd felőli) falra szerelt, szürke fém lépcső nyitott fokokkal. Lent a Dingi teraszánál (déli vég) indul,
       északra emelkedik, és a mentőmellény-tartó FÖLÖTT ér fel az emeleti acél galériára – onnan nyílik a Kalóz terasza (és a Fregatt bejárata). */
    { const n = 14, zt = Z_B - PART - .05, dz = .2, rise = FLOOR_H / n, x0 = WALL + .03, x1 = WALL + 1.0;
      for (let k = 0; k < n; k++) { const y = rise * (k + 1), z1 = zt - k * dz; box("#3b3f45|m", x0, y - .045, z1 - dz - .04, x1, y, z1, 0); box("#8f969c|m", x0, y - .06, z1 - dz - .04, x1, y - .045, z1 - dz + .0, 0); }
      const zb = zt - n * dz;
      /* tartó: a falra szerelt kengyelek + a belső oldalon egy acél pofa */
      { const [g, m] = rodGeom(new THREE.Vector3(x1 + .02, 0, zt), new THREE.Vector3(x1 + .02, FLOOR_H - .06, zb), .05, 4); add("#8f969c|m", g, m, 0); }
      for (let k = 1; k < n; k += 3) box("#8f969c|m", WALL, rise * k - .12, zt - k * dz - .1, x0, rise * k - .02, zt - k * dz, 0);
      /* korlát a belső oldalon (függőleges pálcák, felül kapaszkodó) */
      { const a0 = new THREE.Vector3(x1 + .02, .95, zt), a1 = new THREE.Vector3(x1 + .02, FLOOR_H + .95, zb); const [g, m] = rodGeom(a0, a1, .022, 6); add("steel", g, m, 0);
        for (let k = 0; k <= n; k++) { const z = zt - k * dz, y = rise * k; box("#9aa1a8|m", x1 + .01, y, z - .008, x1 + .03, y + .95, z + .008, 0); } }
      /* mentőmellény-tartó a lépcső felső vége alatt (ÉNY-sarok), mellette úszógumik, horgonyos dísz a falon */
      { const cx = WALL + .55, cz = Z_HALL + .55; box("#2b2f36|m", cx - .5, 1.32, cz - .03, cx + .5, 1.35, cz + .03, 0); [-.5, .5].forEach((d) => box("#2b2f36|m", cx + d - .02, 0, cz - .25, cx + d + .02, 1.35, cz - .21, 0));
        for (let k = 0; k < 9; k++) { const c = ["#ff6a1a", "#ff7f2a", "#1f5fa8", "#ff6a1a", "#e5262f", "#ff8a3a", "#1f3a6a", "#ff6a1a", "#ffb11a"][k];
          box(c, cx - .46 + k * .1, .72, cz - .1, cx - .38 + k * .1, 1.28, cz + .1, 0); box("#1c1f24", cx - .44 + k * .1, .5, cz - .06, cx - .4 + k * .1, .72, cz + .06, 0); }
        ball("#ffd21f", cx - .25, .14, cz + .15, .14, 0, "all", 1, .7, 1); ball("#ffd21f", cx + .2, .12, cz + .2, .12, 0, "all", 1, .7, 1); }
      /* a Dingi teraszának bútorai: kő asztallap, négy fekete szék párnával; faliszekrény; sárga porszívó a lépcső alján */
      tsetHall(add, box, 4.0, (Z_HALL + Z_B - PART) / 2 + .6);
      box("#a26a3a", 2.2, 0, Z_HALL + .02, 3.0, 1.0, Z_HALL + .45, 0); box("#8a5a30", 2.18, 1.0, Z_HALL, 3.02, 1.03, Z_HALL + .47, 0);
      box("#ffd21f", WALL + .4, 0, zt + .05, WALL + .75, .45, zt + .4, 0); cyl("#2b2f36", WALL + .57, .45, zt + .22, .05, .3, 0);
      /* a Korvett/Dingi ajtaja előtt lábtörlők */
      box("#3a3a3a", 1.0, .03, Z_HALL + .05, 1.8, .045, Z_HALL + .55, 0); }
    /* emelet: sötét acél galéria a lépcső tetején (északi sáv), a légtér fölött korlát; keleten a Kalóz terasza nagy szürke lapokkal, üvegkorláttal */
    box("#3b3f45|m", WALL, -.215, Z_HALL, OUT_W - WALL, .03, VOID[1], 1);   /* (alja kicsit a födém alatt – ne villódzzon) */
    box("hallTile", VOID[2], 0, VOID[1], OUT_W - WALL, .03, Z_B - PART, 1);
    { const post = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(L / .12));
        for (let k = 0; k <= n; k++) { const u = k / n; box("#9aa1a8|m", x0 + (x1 - x0) * u - .008, .03, z0 + (z1 - z0) * u - .008, x0 + (x1 - x0) * u + .008, 1.0, z0 + (z1 - z0) * u + .008, 1); }
        const [g, m] = rodGeom(new THREE.Vector3(x0, 1.0, z0), new THREE.Vector3(x1, 1.0, z1), .022, 6); add("steel", g, m, 1); };
      post(WALL + 1.05, VOID[1], VOID[2], VOID[1]); post(VOID[2], VOID[1], VOID[2], Z_B - PART); }
    railing(box, OUT_W - .05, Z_HALL, OUT_W, Z_B - PART, 1);
    box("#3b3f45|m", OUT_W - WALL, -.2, Z_HALL, OUT_W, .03, Z_B - PART, 1);
    tsetHall(add, box, 4.7, Z_B - PART - 1.2, 1);
    /* a Kalóz teraszán a közös nagy hűtő és két ágyneműs szekrény a fal mellett (a tulajdonos alaprajza szerint) */
    box("#f4f4f4", OUT_W - WALL - .75, .03, Z_B - PART - .75, OUT_W - WALL - .05, 1.85, Z_B - PART - .05, 1); box("#c9c9c9", OUT_W - WALL - .76, 1.2, Z_B - PART - .76, OUT_W - WALL - .04, 1.21, Z_B - PART - .04, 1); box("steel", OUT_W - WALL - .78, 1.3, Z_B - PART - .55, OUT_W - WALL - .76, 1.6, Z_B - PART - .52, 1);
    box("#a8998a", VOID[2] + .1, .03, Z_B - PART - .65, VOID[2] + .9, 1.9, Z_B - PART - .05, 1);
    /* fali lámpák a bejárónál, házjel */
    [[OUT_W + .04, 1.9, Z_HALL + .4], [OUT_W + .04, 1.9, Z_B - .6]].forEach(([x, y, z]) => { box("frame", x - .04, y - .12, z - .06, x + .04, y + .12, z + .06, 0); box("bulb", x + .02, y - .08, z - .04, x + .06, y + .08, z + .04, 0); });
    /* elöl: Korvett terasza és a Fregatt erkélye üvegkorláttal */
    box("terrace", 0, -.06, -1.45, OUT_W, 0, 0, 0);
    box("terrace", 0, -.18, -1.45, OUT_W, 0, 0, 1); box("plaster", 0, -.24, -1.45, OUT_W, -.18, 0, 1);
    railing(box, 0, -1.45, OUT_W, -1.4, 1); railing(box, 0, -1.45, .05, 0, 1); railing(box, OUT_W - .05, -1.45, OUT_W, 0, 1);
    /* a Korvett hálószobájában nagy, keretezett Balaton-térkép lóg (a fotó szerint) – a nappali felőli falon */
    { const kp = planOf("korvett"), hr = (kp.rooms || []).find((r) => /háló/i.test(r[0]));
      if (hr) { const q = mapRect(UNITS.korvett, hr[1], hr[2], hr[3], hr[4]); const x = q[2] - .06, z = q[1] + 1.25;   /* az ajtó (a fal közepén túl) mellett, előtte */
        const map = canvasTex(1024, 300, (g, w, h) => { g.fillStyle = "#e8e2c8"; g.fillRect(0, 0, w, h); for (let k = 0; k < 900; k++) { g.fillStyle = `hsla(${rr(70, 110)},${rr(25, 45)}%,${rr(45, 65)}%,.5)`; g.fillRect(rand() * w, rand() * h, rr(4, 14), rr(4, 10)); }
          g.fillStyle = "#6fb7d0"; g.beginPath(); g.moveTo(40, 210); g.bezierCurveTo(160, 230, 300, 205, 420, 170); g.lineTo(470, 150); g.lineTo(500, 165); g.bezierCurveTo(620, 130, 760, 90, 980, 40); g.lineTo(990, 70); g.bezierCurveTo(800, 140, 640, 190, 505, 205); g.lineTo(470, 190); g.bezierCurveTo(330, 245, 180, 265, 50, 245); g.closePath(); g.fill();
          g.fillStyle = "#1f3a6a"; g.font = "800 46px Georgia, serif"; g.fillText("BALATON", 60, 60); g.fillStyle = "#c62828"; g.beginPath(); g.arc(560, 190, 8, 0, TAU); g.fill(); g.fillStyle = "#222"; g.font = "600 22px Georgia, serif"; g.fillText("Zamárdi", 575, 215); });
        const mm = mesh(new THREE.PlaneGeometry(1.9, .56), std({ map, roughness: .6 }), H.lv[0]); mm.position.set(x, 1.65, z); mm.rotation.y = -Math.PI / 2;
        box("#3a2a1e", x + .005, 1.35, z - 1.0, x + .025, 1.95, z + 1.0, 0); } }
    /* teraszbútor a fotók szerint: a Korvett teraszán kis asztal fekete székekkel, a Fregatt erkélyén asztal két székkel */
    const tset = (cx, cz, lv, n) => { box("#9aa0a6", cx - .35, .72, cz - .35, cx + .35, .75, cz + .35, lv); box("#2b2f36|m", cx - .02, 0, cz - .02, cx + .02, .72, cz + .02, lv);
      [[-.65, 0, Math.PI / 2], [.65, 0, -Math.PI / 2], [0, -.65, 0]].slice(0, n).forEach(([dx, dz, r]) => chair(add, cx + dx, cz + dz, r, lv, "#2b2f36")); };
    tset(4.4, -.75, 0, 3); tset(1.6, -.75, 1, 2);
    /* hátul (a tulajdonos leírása szerint):
       • földszint: a Schooner TELJESEN ZÁRT terasza (üvegfalas télikert), ugyanakkora, mint fölötte a Kadett terasza – ott kezdődik, ahol a parkoló autók állnak;
       • emelet: a Kadett fa terasza a Schooner terasza fölött;
       • a parkoló felőli hátsó sarkon L-alakú fémlépcső: a kertből észak felé indul a ház keleti oldala mentén, a pihenőn BALRA fordul, és a Kadett teraszára fut be;
       • a Kadett teraszának bal hátsó sarkában (a ház felé nézve), a falhoz építve csigalépcső visz fel a tetőteraszra. */
    const TD = 3.3;   /* a hátsó teraszok mélysége */
    box("greyTile", 0, -.04, Z_END, OUT_W, .025, Z_END + TD, 0);
    box("terrace", 0, -.2, Z_END, OUT_W, 0, Z_END + TD, 1); box("plasterIn", 0, -.24, Z_END, OUT_W, -.2, Z_END + TD, 1);
    /* a Schooner zárt teraszának üvegfalai (keret + üveg), a nyugati oldalon tömör fal, középen tolóajtó a kertre */
    { const h = Y1 - .24, glassRun = (axis, c, a0, a1) => { const n = Math.max(1, Math.round((a1 - a0) / 1.1));
        for (let k = 0; k <= n; k++) { const v = a0 + (a1 - a0) * k / n; if (axis === "x") box("frame", v - .03, 0, c - .04, v + .03, h, c + .04, 0); else box("frame", c - .04, 0, v - .03, c + .04, h, v + .03, 0); }
        if (axis === "x") { box("glass", a0, .03, c - .01, a1, h, c + .01, 0); box("frame", a0, h - .06, c - .05, a1, h, c + .05, 0); box("frame", a0, 0, c - .05, a1, .08, c + .05, 0); }
        else { box("glass", c - .01, .03, a0, c + .01, h, a1, 0); box("frame", c - .05, h - .06, a0, c + .05, h, a1, 0); box("frame", c - .05, 0, a0, c + .05, .08, a1, 0); } };
      glassRun("x", Z_END + TD - .05, .05, OUT_W - .05); glassRun("z", OUT_W - .05, Z_END, Z_END + TD);
      box("plaster", 0, 0, Z_END, WALL, h, Z_END + TD, 0); }
    /* a zárt terasz bútorai: kanapé, dohányzóasztal, étkezőasztal székekkel */
    box("#5b6470", 3.4, .05, Z_END + 2.4, 5.4, .45, Z_END + 3.1, 0); box("#5b6470", 3.4, .45, Z_END + 2.9, 5.4, .85, Z_END + 3.1, 0); box("#c9cdc8", 3.9, .05, Z_END + 1.4, 4.9, .4, Z_END + 2.0, 0);
    tsetHall(add, box, 1.6, Z_END + 1.7);
    /* a Kadett terasza: korlát körben; a keleti oldalon a lépcső befutója, a nyugati sarokban a csigalépcső nyílása */
    const LST = [Z_END + 1.45, Z_END + 2.55];   /* a lépcső befutójának z-tartománya a keleti peremen */
    railing(box, 0, Z_END + TD - .05, OUT_W, Z_END + TD, 1);
    railing(box, OUT_W - .05, Z_END, OUT_W, LST[0], 1); railing(box, OUT_W - .05, LST[1], OUT_W, Z_END + TD, 1);
    railing(box, 0, Z_END + 1.75, .05, Z_END + TD, 1);
    tset(3.6, Z_END + 1.9, 1, 3);
    box("#5a3d24", 4.9, 0, Z_END + 2.8, 5.6, .42, Z_END + 3.2, 1);   /* virágláda */
    add("foliage", leafGeom([[5.25, .7, Z_END + 3.0, .32, 5, .7]], "#4f8a3c", .1), M4(0, Y1, 0));
    /* L-lépcső: 1. kar a kertből észak felé (x OUT_W+.15…+1.05), pihenő, 2. kar balra (nyugatra) a teraszra */
    { const sx0 = OUT_W + .15, sx1 = OUT_W + 1.05, n1 = 12, n2 = 3, rise = Y1 / (n1 + n2), dz = .27, zTop1 = LST[1], zBot = zTop1 + n1 * dz;
      const stepMk = "#3b3f45|m", frameMk = "#8f969c|m";
      for (let k = 0; k < n1; k++) { const y = rise * (k + 1), z1 = zBot - k * dz; box(stepMk, sx0, y - .045, z1 - dz - .03, sx1, y, z1, -1); }
      /* pihenő a 12. fok magasságában, a teraszperem mellett */
      const yL = rise * n1; box(stepMk, sx0, yL - .05, LST[0], sx1 + .05, yL, LST[1], -1);
      /* 2. kar: nyugat felé (a ház felé) – három fok a pihenőtől a terasz szintjéig (a pihenő és a terasz között) */
      for (let k = 0; k < n2; k++) { const y = yL + rise * (k + 1), xa = sx1 - (k + 1) * .3; box(stepMk, xa, y - .045, LST[0], xa + .3, y, LST[1], -1); }
      /* oszlopok, pofák, korlát */
      [[sx1, LST[0]], [sx1, LST[1]], [sx0, LST[0]]].forEach(([x, z]) => box(frameMk, x - .04, 0, z - .04, x + .04, yL, z + .04, -1));
      [sx0 - .02, sx1 + .02].forEach((x) => { const [g1, m1] = rodGeom(new THREE.Vector3(x, 0, zBot), new THREE.Vector3(x, yL - .02, zTop1), .045, 4); add(frameMk, g1, m1);
        const [g2, m2] = rodGeom(new THREE.Vector3(x, .95, zBot), new THREE.Vector3(x, yL + .95, zTop1), .02, 6); add("steel", g2, m2);
        for (let k = 0; k <= n1; k += 2) { const z = zBot - k * dz, y = rise * k; box("#9aa1a8|m", x - .008, y, z - .008, x + .008, y + .95, z + .008); } });
      { const [g, m] = rodGeom(new THREE.Vector3(sx1 + .03, yL + .95, LST[1]), new THREE.Vector3(sx1 + .03, yL + .95, LST[0]), .02, 6); add("steel", g, m);
        const [g2, m2] = rodGeom(new THREE.Vector3(sx1 + .03, yL + .95, LST[0] - .02), new THREE.Vector3(OUT_W, Y1 + .95, LST[0] - .02), .02, 6); add("steel", g2, m2); } }
    /* csigalépcső a Kadett teraszáról a tetőteraszra: a bal hátsó sarokban (nyugati sarok a ház falánál), középoszlop, ék alakú fokok */
    const SP = { x: .95, z: Z_END + .9, r: .82 };
    { const y0 = Y1, y1 = 2 * FLOOR_H + .25, n = 18, rise = (y1 - y0) / n, step = (TAU * 1.0) / n, A0 = Math.PI - (n - .5) * step;   /* a legfelső fok a ház (észak) felé néz, onnan lépsz a tetőre */
      cyl("#8f969c|m", SP.x, y0, SP.z, .06, y1 - y0 + 1.0, 1 - 1, "all", 10);
      for (let k = 0; k < n; k++) { const a = A0 + k * step, y = y0 + rise * (k + 1) - Y1;
        const g = new THREE.CylinderGeometry(SP.r, SP.r, .045, 6, 1, false, a, step * 1.08); add("#3b3f45|m", g, M4(SP.x, y + Y1 - .022, SP.z), -1);
        const ex = SP.x + Math.sin(a + step / 2) * SP.r, ez = SP.z + Math.cos(a + step / 2) * SP.r; box("#9aa1a8|m", ex - .01, y + Y1, ez - .01, ex + .01, y + Y1 + .95, ez + .01, -1); }
      /* csavarvonalas kapaszkodó */
      { const pts = []; for (let k = 0; k <= n * 2; k++) { const a = A0 + (k / 2 + .5) * step; pts.push(new THREE.Vector3(SP.x + Math.sin(a) * SP.r, y0 + rise * (k / 2 + 1) + .95, SP.z + Math.cos(a) * SP.r)); }
        add("steel", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 4, .02, 6, false), new THREE.Matrix4()); } }
    /* esőcsatorna-lefolyók a sarkokon */
    [[-.06, -.06], [OUT_W + .06, -.06], [-.06, Z_END + .06], [OUT_W + .06, Z_END + .06]].forEach(([x, z]) => cyl("#8a9096|m", x, 0, z, .05, 2 * FLOOR_H + .4));
    /* lapos tető attikával, fedkővel, szellőzőkkel – mennyezetként is (életnagyságban) */
    const roofY = 2 * FLOOR_H;
    box("roof", 0, roofY, -1.45, OUT_W, roofY + .25, Z_END, 2, "roof");
    box("plasterIn", 0, roofY - .02, 0, OUT_W, roofY, Z_END, 2, "roof");
    [[0, -1.45, OUT_W, -1.3], [1.85, Z_END - .15, OUT_W, Z_END], [0, -1.45, .15, Z_END], [OUT_W - .15, -1.45, OUT_W, Z_END]].forEach(([x0, z0, x1, z1]) => { box("plaster", x0, roofY + .25, z0, x1, roofY + .7, z1, 2, "roof"); box("#8a8d90|m", x0 - .02, roofY + .7, z0 - .02, x1 + .02, roofY + .74, z1 + .02, 2, "roof"); });
    [[2, 5], [4, 12], [2.5, 19]].forEach(([x, z]) => cyl("#a9adb0|m", x, roofY + .25, z, .12, .45, 2, "roof"));
    /* tetőkorlát (vékony fém, a fotók szerint a lapos tető peremén) */
    { const yb = roofY + .74, ys = yb + .95; [[0, -1.3, OUT_W, -1.3], [1.85, Z_END - .08, OUT_W, Z_END - .08], [.08, -1.3, .08, Z_END - .08], [OUT_W - .08, -1.3, OUT_W - .08, Z_END - .08]].forEach(([x0, z0, x1, z1]) => {
        const [g1, m1] = rodGeom(new THREE.Vector3(x0, ys, z0), new THREE.Vector3(x1, ys, z1), .022, 6); add("steel", g1, m1, 2, "roof");
        const [g2, m2] = rodGeom(new THREE.Vector3(x0, yb + .45, z0), new THREE.Vector3(x1, yb + .45, z1), .012, 4); add("steel", g2, m2, 2, "roof");
        const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.5)); for (let k = 0; k <= n; k++) { const u = k / n; cyl("steel", x0 + (x1 - x0) * u, yb, z0 + (z1 - z0) * u, .02, .95, 2, "roof", 6); } }); }
    /* ívelt előtető a Fregatt erkélye fölött (a fotón jellegzetes, kifelé lehajló ív) */
    { const R = 2.0, top = roofY + .25, n = 12; for (let k = 0; k < n; k++) { const a0 = k / n * 1.05, a1 = (k + 1) / n * 1.05;
        const z0 = -Math.sin(a0) * R, y0 = top - (1 - Math.cos(a0)) * R, z1 = -Math.sin(a1) * R, y1 = top - (1 - Math.cos(a1)) * R;
        const L = Math.hypot(z1 - z0, y1 - y0); add("#eceae4", new THREE.BoxGeometry(OUT_W + .1, .06, L), M4(OUT_W / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, Math.atan2(y0 - y1, z0 - z1) * -1 + 0), 2, "roof"); } }
    /* ZEPHYR felirat függőlegesen a homlokzat keleti sarkán (sötét tábla), alatta a házszám */
    const sign = canvasTex(160, 1024, (g, w, h) => { g.fillStyle = "#3d4248"; g.fillRect(0, 0, w, h); g.fillStyle = "#eef0f2"; g.font = "700 118px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; "ZEPHYR".split("").forEach((c, i) => g.fillText(c, w / 2, 110 + i * 150)); });
    const sg = mesh(new THREE.PlaneGeometry(.34, 2.2), std({ map: sign, roughness: .5, emissive: new THREE.Color("#ffffff"), emissiveMap: sign, emissiveIntensity: 0 }), H.lv[1]);
    sg.position.set(OUT_W - .32, 1.3, -.035); sg.rotation.y = Math.PI; H.sign = sg;
    const no = canvasTex(128, 96, (g, w, h) => { g.fillStyle = "#e9ecef"; g.fillRect(0, 0, w, h); g.strokeStyle = "#3d4248"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = "#1f3a6a"; g.font = "800 62px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("58", w / 2, h / 2 + 3); });
    const nm = mesh(new THREE.PlaneGeometry(.22, .165), std({ map: no, roughness: .5 }), H.lv[1]); nm.position.set(OUT_W - .32, .02, -.035); nm.rotation.y = Math.PI;

    /* ------------------------------------------------ kirajzolás: összevonás anyagonként, láthatósági csoportonként */
    Object.values(reg).forEach((r) => {
      const mat = hmat(r.mk), geo = mergeGeoms(r.list);
      const tile = mat.map && mat.map.userData && mat.map.userData.tile; if (tile) worldUV(geo, tile);
      const parent = r.lv === -1 ? model : r.lv === 2 ? H.roof : H.lv[r.lv];
      const m = mesh(geo, mat, parent); const tr = mat.transparent;
      m.castShadow = !tr && r.mk !== "grass" && r.mk !== "pave" && r.mk !== "asph"; m.receiveShadow = true;
      m.userData.vis = r.vis; m.userData.lv = r.lv; if (tr) m.renderOrder = 2;
      H.meshes.push(m);
    });
    H.glass = hmat("glass"); H.bulb = hmat("bulb"); H.lampIn = hmat("lampIn");
    return H;
  }
  /* --- segédek a házhoz --- */
  function tsetHall(add, box, cx, cz, lv) { lv = lv || 0;
    box("#d8d6d0", cx - .42, .72, cz - .42, cx + .42, .76, cz + .42, lv); box("#2b2f36|m", cx - .03, 0, cz - .03, cx + .03, .72, cz + .03, lv);
    [[-.72, 0, Math.PI / 2], [.72, 0, -Math.PI / 2], [0, -.72, 0], [0, .72, Math.PI]].forEach(([dx, dz, r]) => { chair(add, cx + dx, cz + dz, r, lv, "#2b2f36"); box("#c9cdc8", cx + dx - .2, .46, cz + dz - .2, cx + dx + .2, .5, cz + dz + .2, lv); });
  }
  function railing(box, x0, z0, x1, z1, lv) {
    box("rail", x0, .02, z0, x1, 1.02, z1, lv);
    const long = (x1 - x0) > (z1 - z0);
    if (long) { box("steel", x0, 1.02, z0 - .01, x1, 1.06, z1 + .01, lv); for (let x = x0; x <= x1 + .01; x += 1.2) box("steel", x - .02, 0, z0 - .01, x + .02, 1.02, z1 + .01, lv); }
    else { box("steel", x0 - .01, 1.02, z0, x1 + .01, 1.06, z1, lv); for (let z = z0; z <= z1 + .01; z += 1.2) box("steel", x0 - .01, 0, z - .02, x1 + .01, 1.02, z + .02, lv); }
  }
  function flowers(add, x0, z0, x1, z1, n) {
    add("#5e4632", new THREE.BoxGeometry(x1 - x0, .06, z1 - z0), M4((x0 + x1) / 2, .07, (z0 + z1) / 2));
    const cols = ["#e5262f", "#ffd166", "#ffffff", "#c86ad8", "#ff8a3a", "#f06aa0"];
    for (let k = 0; k < n; k++) { const x = rr(x0 + .05, x1 - .05), z = rr(z0 + .05, z1 - .05), h = rr(.12, .35);
      add("#4f7a3a", new THREE.CylinderGeometry(.006, .008, h, 3), M4(x, .1 + h / 2, z));
      add(cols[k % cols.length], new THREE.IcosahedronGeometry(rr(.025, .045), 0), M4(x, .1 + h, z)); }
  }
  function tree(add, x, z, r) {
    add("#5a3d24", new THREE.CylinderGeometry(.12, .2, 2.8, 8), M4(x, 1.4, z));
    add("#5a3d24", new THREE.CylinderGeometry(.05, .08, 1.2, 6), M4(x + .3, 2.6, z, 0, 0, -.6));
    add("#5a3d24", new THREE.CylinderGeometry(.04, .07, 1.0, 6), M4(x - .25, 2.7, z + .1, 0, .5, .5));
    add("foliage", leafGeom([[x, 2.6 + r * .8, z, r, 9, .9], [x + r * .5, 2.4 + r * .5, z + r * .2, r * .7, 5], [x - r * .45, 2.5 + r * .55, z - r * .25, r * .72, 5], [x + r * .1, 2.6 + r * 1.25, z - r * .1, r * .6, 4]], ["#4f8a3c", "#5f9a42", "#6a8f3a"][Math.abs(Math.round(x * 3 + z)) % 3]));
  }
  function car(add, col, x, z, rot) {
    const P = (lx, ly, lz) => { const c = Math.cos(rot), s = Math.sin(rot); return [x + lx * c + lz * s, ly, z - lx * s + lz * c]; };
    const B = (mk, w, h, d, lx, ly, lz) => { const p = P(lx, ly, lz); add(mk, new THREE.BoxGeometry(w, h, d), M4(p[0], p[1], p[2], rot)); };
    B(col + "|m", 1.78, .55, 4.25, 0, .55, 0); B(col + "|m", 1.7, .12, 4.1, 0, .87, 0);
    B("#1c2630|m", 1.56, .5, 2.2, 0, 1.15, .15); B(col + "|m", 1.5, .06, 2.0, 0, 1.43, .2);
    B("#fff6d8", .32, .1, .04, -.6, .7, -2.13); B("#fff6d8", .32, .1, .04, .6, .7, -2.13); B("#c62828", .3, .1, .04, -.62, .74, 2.13); B("#c62828", .3, .1, .04, .62, .74, 2.13);
    B("#2a2d32", 1.8, .16, .1, 0, .38, -2.14); B("#2a2d32", 1.8, .16, .1, 0, .38, 2.14);
    [[-.82, -1.35], [.82, -1.35], [-.82, 1.35], [.82, 1.35]].forEach(([lx, lz]) => { const p = P(lx, .33, lz);
      add("#15171a", new THREE.CylinderGeometry(.33, .33, .22, 16), M4(p[0], p[1], p[2], rot, 0, Math.PI / 2)); add("#c9cdd2|m", new THREE.CylinderGeometry(.2, .2, .23, 10), M4(p[0], p[1], p[2], rot, 0, Math.PI / 2)); });
  }
  function bike(add, x, z, col) {
    [[0, -.52], [0, .52]].forEach(([dx, dz]) => add("#15171a", new THREE.TorusGeometry(.33, .025, 6, 18), M4(x + dx, .37, z + dz, Math.PI / 2)));
    add(col + "|m", new THREE.BoxGeometry(.04, .04, .9), M4(x, .62, z, 0, -.15)); add(col + "|m", new THREE.BoxGeometry(.04, .5, .04), M4(x, .55, z - .15, 0, .3));
    add("#15171a", new THREE.BoxGeometry(.1, .04, .22), M4(x, .86, z - .2)); add("#c9cdd2|m", new THREE.BoxGeometry(.5, .03, .03), M4(x, .92, z + .45));
  }
  function chair(add, x, z, rot, lv, col, y0) {
    y0 = y0 || 0; const c = Math.cos(rot), s = Math.sin(rot), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    add(col, new THREE.BoxGeometry(.42, .04, .42), M4(x, y0 + .45, z, rot), lv);
    const b = P(0, .19); add(col, new THREE.BoxGeometry(.42, .42, .03), M4(b[0], y0 + .68, b[1], rot, .08), lv);
    [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]].forEach(([a, d]) => { const p = P(a, d); add(col, new THREE.BoxGeometry(.035, .45, .035), M4(p[0], y0 + .225, p[1], rot), lv); });
  }
  function garland(add, pts, sag, lv, vis) {
    for (let i = 0; i < pts.length - 1; i++) { const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]); let prev = a;
      for (let k = 1; k <= 10; k++) { const u = k / 10, p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * sag; const [g, m] = rodGeom(prev, p, .006, 4); add("#202020", g, m, lv, vis); prev = p;
        if (k < 10) add("bulb", new THREE.SphereGeometry(.03, 8, 6), M4(p.x, p.y - .04, p.z), lv, vis); } }
  }
  /* --- részletes bútorok az alaprajz tereptárgyaiból --- */
  function furnishDetailed(add, lv, U, Pl, id) {
    const accent = { korvett: "#c0504a", dingi: "#3f9b72", fregatt: "#3d7fc2", kaloz: "#8a64c8", schooner: "#2a9aa6", kadett: "#c99a3a" }[id] || "#888";
    const B = (mk, x0, y0, z0, x1, y1, z1) => add(mk, new THREE.BoxGeometry(Math.max(.005, x1 - x0), Math.max(.005, y1 - y0), Math.max(.005, z1 - z0)), M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), lv);
    /* a lakás szobáinak befoglaló téglalapja (alaprajz-koordinátában): a rajta kívül eső „bútorok” (a Dingi/Kalóz alaprajzán a lépcsőház tárgyai)
       itt nem kellenek – a lépcsőházat (asztal, mentőmellény-tartó, porszívó, közös hűtő) a ház modellje külön, a fotók szerint rajzolja */
    const RB = (Pl.rooms || []).reduce((b, r) => [Math.min(b[0], r[1]), Math.min(b[1], r[2]), Math.max(b[2], r[1] + r[3]), Math.max(b[3], r[2] + r[4])], [1e9, 1e9, -1e9, -1e9]);
    (Pl.furn || []).forEach((f) => {
      const [type, x, y, w0, d0, , rot] = f; if (["door", "window", "area", "lane", "stairs"].includes(type) || !(w0 > .05 && d0 > .05)) return;
      if (RB[0] < 1e8 && (x + w0 / 2 < RB[0] - .1 || x + w0 / 2 > RB[2] + .1 || y + d0 / 2 < RB[1] - .1 || y + d0 / 2 > RB[3] + .1)) return;
      const sw = Math.abs(rot || 0) % 180 === 90, w = sw ? d0 : w0, d = sw ? w0 : d0, cx = x + w0 / 2, cy = y + d0 / 2;
      const [x0, z0, x1, z1] = mapRect(U, cx - w / 2, cy - d / 2, w, d), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, W2 = x1 - x0, D2 = z1 - z0, long = W2 > D2;
      const lab = String(f[5] || "");
      switch (type) {
        case "bed": {
          B("#4a3a30", x0, .03, z0, x1, .32, z1); B("#f2efe8", x0 + .03, .32, z0 + .03, x1 - .03, .52, z1 - .03);
          /* fejtámla a rövidebb oldalon (x0 vagy z0 felől), takaró, párnák, pléd */
          if (long) { B("#2e2622", x0 - .02, .03, z0, x0 + .08, 1.0, z1); B("floral", x0 + .45, .52, z0 + .04, x1 - .04, .6, z1 - .04); B("#f4f1ea", x1 - .55, .6, z0 + .04, x1 - .1, .62, z1 - .04);
            const n = D2 > 1.2 ? 2 : 1; for (let k = 0; k < n; k++) { const a = z0 + .08 + k * (D2 - .16) / n; B("#ffffff", x0 + .08, .52, a + .03, x0 + .42, .66, a + (D2 - .16) / n - .03); } }
          else { B("#2e2622", x0, .03, z0 - .02, x1, 1.0, z0 + .08); B("floral", x0 + .04, .52, z0 + .45, x1 - .04, .6, z1 - .04); B("#f4f1ea", x0 + .04, .6, z1 - .55, x1 - .04, .62, z1 - .1);
            const n = W2 > 1.2 ? 2 : 1; for (let k = 0; k < n; k++) { const a = x0 + .08 + k * (W2 - .16) / n; B("#ffffff", a + .03, .52, z0 + .08, a + (W2 - .16) / n - .03, .66, z0 + .42); } }
          break; }
        case "sofa": {
          const ax = long; B("#5e554c", x0, .1, z0, x1, .42, z1);
          [[x0 + .03, z0 + .03], [x1 - .03, z1 - .03]].forEach(() => {});
          if (ax) { B("#6f665c", x0, .42, z1 - .22, x1, .82, z1); B("#5a524a", x0, .1, z0, x0 + .14, .62, z1); B("#5a524a", x1 - .14, .1, z0, x1, .62, z1);
            const n = Math.max(2, Math.round(W2 / .8)); for (let k = 0; k < n; k++) { const a = x0 + .15 + k * (W2 - .3) / n; B("floral", a + .01, .42, z0 + .04, a + (W2 - .3) / n - .01, .52, z1 - .22); }
            B(accent, x0 + .2, .5, z1 - .34, x0 + .6, .82, z1 - .2); B("#e8d9b0", x1 - .6, .5, z1 - .34, x1 - .2, .82, z1 - .2); }
          else { B("#6f665c", x1 - .22, .42, z0, x1, .82, z1); B("#5a524a", x0, .1, z0, x1, .62, z0 + .14); B("#5a524a", x0, .1, z1 - .14, x1, .62, z1);
            const n = Math.max(2, Math.round(D2 / .8)); for (let k = 0; k < n; k++) { const a = z0 + .15 + k * (D2 - .3) / n; B("floral", x0 + .04, .42, a + .01, x1 - .22, .52, a + (D2 - .3) / n - .01); }
            B(accent, x1 - .34, .5, z0 + .2, x1 - .2, .82, z0 + .6); B("#e8d9b0", x1 - .34, .5, z1 - .6, x1 - .2, .82, z1 - .2); }
          [[x0 + .05, z0 + .05], [x1 - .08, z0 + .05], [x0 + .05, z1 - .08], [x1 - .08, z1 - .08]].forEach(([a, b]) => B("#2b2b2b", a, .03, b, a + .03, .1, b + .03));
          /* vitorlás kép a kanapé fölött (a fotókon tengerészeti képek lógnak) */
          { const px = ax ? mx : x1 + .05, pz = ax ? z1 + .05 : mz; const outer = px < WALL + .4 || px > OUT_W - WALL - .4 || pz < WALL + .4 || pz > Z_END - WALL - .4; if (!outer) add("#3a2a1e", new THREE.BoxGeometry(ax ? .82 : .03, .56, ax ? .03 : .82), M4(px, 1.6, pz), lv); if (!outer) add("painting", new THREE.BoxGeometry(ax ? .74 : .035, .48, ax ? .035 : .74), M4(px, 1.6, pz), lv); }
          /* állólámpa a kanapé végénél */
          const lx = ax ? x1 + .25 : mx + .0, lz = ax ? z1 - .2 : z1 + .25;
          add("#2b2f36|m", new THREE.CylinderGeometry(.012, .012, 1.45, 6), M4(lx, .75, lz), lv); add("#2b2f36|m", new THREE.CylinderGeometry(.14, .14, .02, 16), M4(lx, .04, lz), lv);
          add("lampIn", new THREE.CylinderGeometry(.12, .18, .24, 16, 1, true), M4(lx, 1.5, lz), lv);
          break; }
        case "table4": case "table6": case "table2": case "table5": case "table": case "round4": {
          const round = type === "round4";
          if (round) { add("#9c6b3f", new THREE.CylinderGeometry(Math.min(W2, D2) / 2, Math.min(W2, D2) / 2, .04, 28), M4(mx, .74, mz), lv); add("#6b4426", new THREE.CylinderGeometry(.05, .2, .72, 12), M4(mx, .38, mz), lv); }
          else { B("#a8774a", x0, .72, z0, x1, .76, z1); [[x0 + .03, z0 + .03], [x1 - .09, z0 + .03], [x0 + .03, z1 - .09], [x1 - .09, z1 - .09]].forEach(([a, b]) => B("#6b4426", a, .03, b, a + .06, .72, b + .06)); }
          /* váza virággal, alátétek */
          add("#d8e6ea", new THREE.CylinderGeometry(.045, .035, .16, 12), M4(mx, .84, mz), lv);
          for (let k = 0; k < 6; k++) add(["#e5262f", "#ffd166", "#ffffff", "#c86ad8"][k % 4], new THREE.IcosahedronGeometry(.03, 0), M4(mx + Math.cos(k) * .05, .95 + (k % 2) * .03, mz + Math.sin(k) * .05), lv);
          break; }
        case "chair": chair(add, mx, mz, (rot || 0) * D2R, lv, "#7a5a3a"); break;
        case "shower": B("#eef3f5", x0, .03, z0, x1, .09, z1); B("rail", x0, .09, z0, x1, 2.0, z0 + .02); B("rail", x0, .09, z0, x0 + .02, 2.0, z1);
          add("chrome", new THREE.CylinderGeometry(.012, .012, 1.1, 6), M4(x1 - .1, 1.45, z1 - .06), lv); add("chrome", new THREE.CylinderGeometry(.09, .09, .02, 16), M4(x1 - .2, 2.0, z1 - .2), lv); break;
        case "wc": add("#ffffff", new THREE.CylinderGeometry(.18, .15, .4, 16), M4(mx, .23, mz), lv); B("#ffffff", mx - .2, .03, long ? z0 : mz + .1, mx + .2, .8, long ? z0 + .16 : mz + .26); break;
        case "sink": B("#e9e6df", x0, .03, z0, x1, .78, z1); B("#ffffff", x0 + .02, .78, z0 + .02, x1 - .02, .86, z1 - .02); add("chrome", new THREE.CylinderGeometry(.012, .012, .18, 6), M4(mx, .95, mz), lv); break;
        case "counter": case "counter2": {
          B("#ecebe6", x0, .1, z0, x1, .86, z1); B("#2b2b2b", x0, .03, z0, x1, .1, z1); B("#3a3a3a", x0 - .01, .86, z0 - .01, x1 + .01, .9, z1 + .01);
          const n = Math.max(1, Math.round((long ? W2 : D2) / .6)); for (let k = 1; k < n; k++) { const t = k / n; if (long) B("#c9c7c0", x0 + W2 * t - .005, .12, z0 - .002, x0 + W2 * t + .005, .84, z1 + .002); else B("#c9c7c0", x0 - .002, .12, z0 + D2 * t - .005, x1 + .002, .84, z0 + D2 * t + .005); }
          if (type === "counter") { const a = long ? [x0 + W2 * .25, mz] : [mx, z0 + D2 * .25], b = long ? [x0 + W2 * .7, mz] : [mx, z0 + D2 * .7];
            add("#15171a|m", new THREE.BoxGeometry(.55, .01, .5), M4(a[0], .905, a[1]), lv); [[-.13, -.12], [.13, -.12], [-.13, .12], [.13, .12]].forEach(([dx, dz]) => add("#555", new THREE.TorusGeometry(.07, .006, 4, 16), M4(a[0] + dx, .912, a[1] + dz, 0, Math.PI / 2), lv));
            add("steel", new THREE.BoxGeometry(.45, .02, .38), M4(b[0], .905, b[1]), lv); add("chrome", new THREE.CylinderGeometry(.012, .012, .3, 6), M4(b[0], 1.05, b[1] + (long ? .17 : 0)), lv); }
          break; }
        case "washer": B("#f2f2f2", x0, .03, z0, x1, .85, z1); add("#1c2630|m", new THREE.CylinderGeometry(.16, .16, .02, 20), M4(mx, .45, mz, 0, Math.PI / 2), lv); break;
        case "tv": B("#2b2f36", x0, .03, z0, x1, .45, z1); B("#0d0f12|m", long ? x0 + .05 : mx - .02, .9, long ? mz - .02 : z0 + .05, long ? x1 - .05 : mx + .02, 1.45, long ? mz + .02 : z1 - .05); break;
        case "shelf": B("#c9a77b", x0, .03, z0, x1, 1.6, z1); for (let k = 0; k < 4; k++) for (let j = 0; j < 6; j++) { const t = (j + .5) / 6; const c = ["#8a3a2a", "#2a5a8a", "#d9b44a", "#3a7a4a", "#5a3a6a"][(j + k) % 5];
            if (long) B(c, x0 + W2 * t - .04, .1 + k * .38, z0 + .03, x0 + W2 * t + .03, .32 + k * .38, z1 - .03); else B(c, x0 + .03, .1 + k * .38, z0 + D2 * t - .04, x1 - .03, .32 + k * .38, z0 + D2 * t + .03); } break;
        case "shed": break;
        default: {
          const h = /szekrény/.test(lab) ? 2.0 : /hűtő/.test(lab) ? 1.8 : /klíma|bojler/.test(lab) ? 0 : /fotel|pouf/.test(lab) ? .45 : /asztal/.test(lab) ? .74 : /éjjeli|komód/.test(lab) ? .55 : .55;
          if (h <= 0) break;
          if (/szekrény/.test(lab)) { B("#a8998a", x0, .03, z0, x1, h, z1); if (long) { B("#b9a786", mx - .005, .1, z0 - .003, mx + .005, h - .05, z1 + .003); } else B("#b9a786", x0 - .003, .1, mz - .005, x1 + .003, h - .05, mz + .005);
            add("steel", new THREE.BoxGeometry(.02, .3, .02), M4(long ? mx - .05 : x0 - .01, 1.1, long ? z0 - .01 : mz - .05), lv); }
          else if (/hűtő/.test(lab)) { B("#f4f4f4", x0, .03, z0, x1, h, z1); B("#c9c9c9", x0 - .003, 1.15, z0 - .003, x1 + .003, 1.16, z1 + .003); }
          else if (/fotel/.test(lab)) { B("#8a7a6a", x0, .1, z0, x1, .45, z1); B("#7a6a5a", x0, .45, z1 - .15, x1, .85, z1); }
          else if (/éjjeli/.test(lab)) { B("#a8875e", x0, .03, z0, x1, .5, z1); add("lampIn", new THREE.CylinderGeometry(.07, .1, .16, 12, 1, true), M4(mx, .66, mz), lv); add("#c9a24a|m", new THREE.CylinderGeometry(.01, .05, .1, 8), M4(mx, .55, mz), lv); }
          else B("#cbb894", x0, .03, z0, x1, h, z1);
        }
      }
    });
  }
