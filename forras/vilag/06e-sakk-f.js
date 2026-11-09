  /* =====================================================================================================
     VR-SAKK – ÉLETNAGYSÁGÚ FIGURÁS KÉSZLET (2026. nov. 9., a tulajdonos képe alapján: ezüst és arany, tengerkék zománccal)
       gyalog = kikötőbak (kötéllel)   bástya = világítótorony (forgó fénynyaláb)   huszár = csikóhal
       futó = hajókormány (forgó kerék)   vezér = királynő (koronával, palásttal)   király = kapitány (kereszt a sapkáján)
     A király és a vezér varázslattal a vízen JÁR (rúnakorong, csillámló lábnyomok); a többiek úszó, zománcos
     hullámtalapzaton siklanak. Minden ütés más – a TÁMADÓ módján:
       kikötőbak: lasszó → a víz alá rántja · csikóhal: magas ugrás → hullámcsapás · kormány: örvény → lehúzza
       világítótorony: izzó fénysugár → megolvasztja · királynő: tölcsér (víztölcsér) → felkapja és ledobja
       kapitány: villámok, majd a kraken csápjai húzzák le
     ===================================================================================================== */
  const ROYAL = { k: 1, q: 1 };
  const FIGN = { p: ["Gyalog", "kikötőbak"], n: ["Huszár", "csikóhal"], b: ["Futó", "kormánykerék"], r: ["Bástya", "világítótorony"], q: ["Vezér", "királynő"], k: ["Király", "kapitány"] };
  Object.assign(NAMES, FIGN);
  const LP = (pts) => pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
  const lathe = (pts, seg, ps, pl) => new THREE.LatheGeometry(LP(pts), seg || 32, ps || 0, pl || TAU);
  const SPH = (r, w, h) => new THREE.SphereGeometry(r, w || 16, h || 12);
  const TOR = (R, r, rs, ts, arc) => new THREE.TorusGeometry(R, r, rs || 8, ts || 40, arc || TAU);
  const RODF = (a, b, r, seg) => { const [g, m] = rodGeom(a, b, r, seg || 6); return [g, "m", m]; };
  /* változó vastagságú cső egy görbe mentén (csikóhal teste, csápok) */
  function varTube(curve, n, rad, rFn) {
    const fr = curve.computeFrenetFrames(n, false), pos = [], nor = [], idx = [];
    for (let i = 0; i <= n; i++) { const t = i / n, p = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i], r = rFn(t);
      for (let j = 0; j <= rad; j++) { const a = j / rad * TAU, cx = Math.cos(a), sy = Math.sin(a); const nx = cx * N.x + sy * B.x, ny = cx * N.y + sy * B.y, nz = cx * N.z + sy * B.z;
        pos.push(p.x + nx * r, p.y + ny * r, p.z + nz * r); nor.push(nx, ny, nz); } }
    for (let i = 0; i < n; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
    return g;
  }
  /* anyagok: tükörfényes ezüst / arany, tengerkék tűzzománc (lakkfényű), meleg fény */
  function figMats(c) {
    const K = "figM" + c; if (CS[K]) return CS[K];
    const metal = new THREE.MeshStandardMaterial({ color: c === "w" ? 0xeef3fa : 0xf7b733, metalness: 1, roughness: c === "w" ? .14 : .2, vertexColors: true, envMapIntensity: 1.3 });   /* Quest: a fém sima PBR, csak a zománc lakkozott */
    const enamel = new THREE.MeshPhysicalMaterial({ color: 0x15357a, metalness: .15, roughness: .2, vertexColors: true, clearcoat: .8, clearcoatRoughness: .08, envMapIntensity: 1.1 });
    const glow = new THREE.MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xffcf70, emissiveIntensity: 2.4, vertexColors: true, roughness: .3 });
    W.disposables.push(metal, enamel, glow);
    return (CS[K] = { m: metal, n: enamel, e: glow });
  }
  /* részek: [geometria, anyagkulcs (m/n/e), mátrix, árnyalat] → anyagonként egyetlen háló */
  function figMesh(parts, parent, c, name) {
    const by = {}, M = figMats(c);
    parts.forEach(([geo, key, m4, tint]) => { const col = new THREE.Color(tint || "#ffffff"), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } geo.setAttribute("color", new THREE.BufferAttribute(a, 3)); (by[key] = by[key] || []).push([geo, m4 || new THREE.Matrix4()]); });
    const G = new THREE.Group(); if (name) G.name = name; parent.add(G);
    Object.keys(by).forEach((k) => { const m = new THREE.Mesh(mergeGeoms(by[k]), M[k]); m.castShadow = k !== "e"; G.add(m); });
    return G;
  }
  const PM = (x, y, z, ry, rx, rz, s) => M4(x, y, z, ry, rx, rz, s, s, s);
  /* horgony-embléma (lapos, kidomborodó) a zománcsávokra */
  function anchorGeo(s) {
    const sh = new THREE.Shape(); const w = .09 * s;
    sh.moveTo(-w, .55 * s); sh.lineTo(w, .55 * s); sh.lineTo(w, -.35 * s); sh.quadraticCurveTo(.32 * s, -.32 * s, .42 * s, -.08 * s); sh.lineTo(.52 * s, -.16 * s); sh.lineTo(.5 * s, .06 * s); sh.lineTo(.3 * s, .02 * s); sh.lineTo(.38 * s, -.04 * s);
    sh.quadraticCurveTo(.28 * s, -.48 * s, 0, -.52 * s); sh.quadraticCurveTo(-.28 * s, -.48 * s, -.38 * s, -.04 * s); sh.lineTo(-.3 * s, .02 * s); sh.lineTo(-.5 * s, .06 * s); sh.lineTo(-.52 * s, -.16 * s); sh.lineTo(-.42 * s, -.08 * s); sh.quadraticCurveTo(-.32 * s, -.32 * s, -w, -.35 * s); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: .06 * s, bevelEnabled: true, bevelThickness: .02 * s, bevelSize: .02 * s, bevelSegments: 1, curveSegments: 6 });
    const ring = TOR(.12 * s, .04 * s, 6, 14); ring.translate(0, .66 * s, .03 * s); const bar = new THREE.BoxGeometry(.5 * s, .08 * s, .08 * s); bar.translate(0, .38 * s, .03 * s);
    return mergeGeoms([[g, new THREE.Matrix4()], [ring, new THREE.Matrix4()], [bar, new THREE.Matrix4()]]);
  }
  /* ÚSZÓ HULLÁMTALAPZAT (gyalog, huszár, futó, bástya): fém szoknya, zománcsáv hullámzó arany díszcsíkkal, fém tető */
  function waveBase(L, R) {
    L.push([lathe([[R * .8, -.5], [R * .97, -.25], [R * 1.03, 0], [R * 1.0, .16], [R * .95, .2]], 40), "m"]);
    L.push([lathe([[R * .955, .18], [R * .965, .4], [R * .965, .64], [R * .93, .67]], 40), "n"]);
    const wave = new THREE.CatmullRomCurve3(Array.from({ length: 80 }, (_, i) => { const a = i / 80 * TAU; return V3(Math.cos(a) * R * .975, .43 + .13 * Math.sin(a * 12), Math.sin(a) * R * .975); }), true);
    L.push([new THREE.TubeGeometry(wave, 240, .045, 5, true), "m"]);
    L.push([TOR(R * .968, .035, 5, 48).rotateX(Math.PI / 2), "m", M4(0, .23, 0)], [TOR(R * .962, .035, 5, 48).rotateX(Math.PI / 2), "m", M4(0, .63, 0)]);
    L.push([lathe([[R * .95, .64], [R * .96, .72], [R * .84, .8], [R * .3, .83], [0, .83]], 40), "m"]);
    return .83;
  }
  /* VARÁZSKORONG a vízen járó királyi párnak: vékony zománclap aranyszegéllyel + külön forgó rúnagyűrű (additív) */
  function runeDisc(G, L, R) {
    L.push([lathe([[R * .9, .02], [R * .92, .1], [R * .86, .16], [0, .17]], 40), "n"], [TOR(R * .9, .05, 6, 48).rotateX(Math.PI / 2), "m", M4(0, .12, 0)]);
    const tx = CS.runeT || (CS.runeT = canvasTex(512, 512, (g) => { g.translate(256, 256); g.strokeStyle = "rgba(255,220,140,1)"; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 238, 0, TAU); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 196, 0, TAU); g.stroke();
      g.fillStyle = "rgba(255,226,160,1)"; g.font = "bold 34px serif"; g.textAlign = "center"; g.textBaseline = "middle"; const R2 = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ"; for (let i = 0; i < 24; i++) { g.save(); g.rotate(i / 24 * TAU); g.fillText(R2[i], 0, -217); g.restore(); }
      for (let i = 0; i < 8; i++) { g.save(); g.rotate(i / 8 * TAU); g.beginPath(); g.moveTo(0, -190); g.lineTo(18, -120); g.lineTo(0, -60); g.lineTo(-18, -120); g.closePath(); g.stroke(); g.restore(); } }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.5, R * 2.5).rotateX(-Math.PI / 2), basic({ map: tx, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending, color: "#ffd88a" }));
    W.disposables.push(m.geometry); m.position.y = .2; m.name = "rune"; m.renderOrder = 3; G.add(m);
    return .17;
  }

  /* ------------------------------------------------------------ GYALOG: kikötőbak, körbetekert kötéllel, horgony-emblémával */
  function figPawn(c) {
    const G = new THREE.Group(), L = [], y0 = waveBase(L, 2.45);
    L.push([lathe([[1.25, y0], [1.3, y0 + .14], [1.08, y0 + .3], [.96, y0 + .45], [.92, y0 + 1.4], [.94, y0 + 2.5], [1.08, y0 + 2.75], [1.38, y0 + 3.15], [1.46, y0 + 3.38], [1.36, y0 + 3.58], [.9, y0 + 3.74], [.4, y0 + 3.82], [0, y0 + 3.84]], 32), "m"]);
    L.push([lathe([[.95, y0 + 1.5], [.975, y0 + 1.55], [.975, y0 + 2.35], [.95, y0 + 2.4]], 32), "n"]);
    L.push([TOR(.97, .04, 5, 36).rotateX(Math.PI / 2), "m", M4(0, y0 + 1.5, 0)], [TOR(.97, .04, 5, 36).rotateX(Math.PI / 2), "m", M4(0, y0 + 2.4, 0)]);
    const an = anchorGeo(.75); L.push([an, "m", M4(0, y0 + 1.95, .96)], [an.clone(), "m", M4(0, y0 + 1.95, -.96, Math.PI)]);
    /* kötél: két menet csavarvonal + lelógó vég, kötélsodrat-mintával */
    const hel = new THREE.CatmullRomCurve3(Array.from({ length: 50 }, (_, i) => { const a = i / 49 * TAU * 2.2; return V3(Math.cos(a) * 1.04, y0 + .62 + i / 49 * .55, Math.sin(a) * 1.04); }).concat([V3(1.25, y0 + .9, .9), V3(1.75, y0 + .45, 1.15), V3(2.0, y0 + .12, 1.0)]));
    L.push([varTube(hel, 160, 6, (t) => .11 * (1 + .12 * Math.sin(t * 160))), "m", null, "#d8cdb6"]);
    figMesh(L, G, c);
    G.userData.dim = [5, y0 + 3.9, 5];
    return G;
  }
  /* ------------------------------------------------------------ BÁSTYA: világítótorony zománcsávokkal, galériával, izzó lámpaházzal és forgó nyalábbal */
  function figRook(c) {
    const G = new THREE.Group(), L = [], y0 = waveBase(L, 2.75);
    const rT = (y) => 1.62 - (y / 6.0) * .58;
    L.push([lathe([[1.95, y0], [1.9, y0 + .3], [1.7, y0 + .55], [1.62, y0 + .62]].concat([[rT(.62), y0 + .62], [rT(6.0), y0 + 6.0], [rT(6.0) + .05, y0 + 6.05]]), 40), "m"]);
    [[1.1, 1.9], [2.9, 3.7], [4.7, 5.5]].forEach(([a, b]) => { L.push([lathe([[rT(a) + .02, y0 + a], [rT(a) + .035, y0 + a + .04], [rT(b) + .035, y0 + b - .04], [rT(b) + .02, y0 + b]], 40), "n"]);
      L.push([TOR(rT(a) + .03, .035, 5, 40).rotateX(Math.PI / 2), "m", M4(0, y0 + a, 0)], [TOR(rT(b) + .03, .035, 5, 40).rotateX(Math.PI / 2), "m", M4(0, y0 + b, 0)]); });
    /* ajtó és ablakok elöl-hátul */
    [1, -1].forEach((s) => { L.push([new THREE.BoxGeometry(.6, 1.0, .12), "n", M4(0, y0 + 1.2, s * (rT(1.2) + .02))], [TOR(.3, .05, 5, 14, Math.PI), "m", M4(0, y0 + 1.7, s * (rT(1.7) + .05))]);
      [2.4, 4.2].forEach((h) => L.push([new THREE.BoxGeometry(.32, .5, .1), "e", M4(0, y0 + h, s * (rT(h) + .02))], [new THREE.BoxGeometry(.44, .06, .14), "m", M4(0, y0 + h - .28, s * (rT(h) + .04))])); });
    /* galéria */
    const gy = y0 + 6.05;
    L.push([lathe([[1.0, gy - .1], [1.55, gy], [1.6, gy + .12], [0, gy + .14]], 40), "m"], [TOR(1.52, .045, 5, 48).rotateX(Math.PI / 2), "m", M4(0, gy + .62, 0)], [TOR(1.52, .03, 5, 48).rotateX(Math.PI / 2), "m", M4(0, gy + .36, 0)]);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; L.push([CY(.03, .03, .55, 5), "m", M4(Math.cos(a) * 1.52, gy + .38, Math.sin(a) * 1.52)]); }
    /* lámpaház: üveg, fémosztók, kupola, gömbdísz */
    L.push([new THREE.CylinderGeometry(.82, .82, 1.25, 24, 1, true), "e", M4(0, gy + .8, 0)]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; L.push([CY(.05, .05, 1.3, 5), "m", M4(Math.cos(a) * .84, gy + .8, Math.sin(a) * .84)]); }
    L.push([TOR(.85, .06, 5, 28).rotateX(Math.PI / 2), "m", M4(0, gy + .15, 0)], [TOR(.85, .06, 5, 28).rotateX(Math.PI / 2), "m", M4(0, gy + 1.45, 0)]);
    L.push([lathe([[.98, gy + 1.45], [.95, gy + 1.62], [.7, gy + 1.98], [.3, gy + 2.2], [0, gy + 2.25]], 28), "n"], [SPH(.2, 12, 8), "m", M4(0, gy + 2.38, 0)], [new THREE.ConeGeometry(.06, .7, 6), "m", M4(0, gy + 2.85, 0)]);
    figMesh(L, G, c);
    /* forgó fénynyaláb (két kúp) */
    const bt = CS.beamT || (CS.beamT = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,240,190,0)"); gr.addColorStop(.85, "rgba(255,240,190,.55)"); gr.addColorStop(1, "rgba(255,250,230,1)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
    const bm = CS.beamM || (CS.beamM = basic({ map: bt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: .38 }));
    const beam = new THREE.Group(); beam.name = "beam"; beam.position.y = gy + .8; G.add(beam);
    const cg = CS.beamG || (CS.beamG = (() => { const g = new THREE.ConeGeometry(1.6, 11, 16, 1, true); g.translate(0, -5.5, 0); g.rotateZ(Math.PI / 2); W.disposables.push(g); return g; })());
    [0, Math.PI].forEach((a) => { const m = new THREE.Mesh(cg, bm); m.rotation.y = a; m.renderOrder = 6; beam.add(m); });
    G.userData.dim = [5.5, gy + 2.9, 5.5]; G.userData.lamp = gy + .8;
    return G;
  }
  /* ------------------------------------------------------------ HUSZÁR: csikóhal – csavart farok, bordázott test, zománc hátúszó és szem, korona */
  function figKnight(c) {
    const G = new THREE.Group(), L = [], y0 = waveBase(L, 2.6);
    const sp = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * .2 + i / 14 * Math.PI * 1.75, r = .25 + i / 14 * .6; sp.push(V3(-.45 + Math.cos(a) * r, y0 + 1.05 + Math.sin(a) * r * .95, 0)); }
    const body = sp.reverse().concat([V3(-.95, y0 + 1.8, 0), V3(-.75, y0 + 2.8, 0), V3(-.15, y0 + 3.7, 0), V3(.2, y0 + 4.6, 0), V3(.05, y0 + 5.5, 0), V3(-.35, y0 + 6.25, 0), V3(-.25, y0 + 6.95, 0), V3(.15, y0 + 7.25, 0)]);
    const cv = new THREE.CatmullRomCurve3(body, false, "centripetal");
    const rFn = (t) => { const b = t < .3 ? .08 + t / .3 * .45 : t < .62 ? .53 + Math.sin((t - .3) / .32 * Math.PI) * .42 : t < .85 ? .58 - (t - .62) * 1.1 : .36 + (t - .85) * 2.6; return b * (1 + .085 * Math.sin(t * 150)); };
    L.push([varTube(cv, 150, 14, rFn), "m"]);
    /* fej: pofa (orr-cső) előre-lefelé, kiszélesedő véggel */
    const hd = V3(.15, y0 + 7.15, 0), snout = new THREE.CatmullRomCurve3([hd.clone(), V3(.75, y0 + 6.95, 0), V3(1.45, y0 + 6.55, 0), V3(1.75, y0 + 6.38, 0)]);
    L.push([varTube(snout, 30, 10, (t) => .5 - t * .3 + (t > .9 ? (t - .9) * 1.4 : 0)), "m"], [SPH(.24, 10, 8), "m", M4(1.78, y0 + 6.37, 0)]);
    L.push([SPH(.62, 18, 14), "m", M4(.05, y0 + 7.2, 0, 0, 0, 0, 1.05, .9, .9)]);
    /* szemek: zománc + fém szemhéj */
    [1, -1].forEach((s) => L.push([SPH(.17, 12, 10), "n", M4(.35, y0 + 7.32, s * .48)], [TOR(.18, .035, 5, 14), "m", M4(.35, y0 + 7.32, s * .5)]));
    /* korona (koronka) a fejtetőn */
    for (let i = 0; i < 5; i++) { const a = -.6 + i * .3; L.push([new THREE.ConeGeometry(.1, .55, 6), "m", M4(-.1 + Math.sin(a) * .35, y0 + 7.85, Math.cos(a) * .0 + (i - 2) * .12, 0, 0, -a * .6)]); }
    L.push([SPH(.08, 8, 6), "n", M4(-.1, y0 + 8.15, 0)]);
    /* hátúszó: zománc legyező fém bordákkal (a hát mentén) */
    { const sh = new THREE.Shape(); sh.moveTo(0, 0); for (let i = 0; i <= 12; i++) { const a = Math.PI * .5 + i / 12 * Math.PI, r = 1.0 + .12 * Math.sin(i * Math.PI); sh.lineTo(Math.cos(a) * r * .75, Math.sin(a) * r); } sh.lineTo(0, 0);
      const fg = new THREE.ExtrudeGeometry(sh, { depth: .1, bevelEnabled: false, curveSegments: 4 }); fg.translate(0, 0, -.05);
      L.push([fg, "n", M4(-.62, y0 + 3.6, 0, 0, 0, -.35)]);
      for (let i = 0; i <= 6; i++) { const a = Math.PI * .5 + i / 6 * Math.PI; const [p0, p1] = [V3(-.62, y0 + 3.6, 0), V3(-.62 + Math.cos(a - .35) * .8, y0 + 3.6 + Math.sin(a - .35) * 1.05, 0)]; L.push(RODF(p0, p1, .04)); } }
    /* sörény-tüskék a nyak hátán, mellúszó */
    for (let i = 0; i < 6; i++) { const t = .7 + i * .035, p = cv.getPointAt(t); L.push([new THREE.ConeGeometry(.09, .4, 5), "m", M4(p.x - .45, p.y, 0, 0, 0, Math.PI / 2 + .4)]); }
    [1, -1].forEach((s) => { const fg = new THREE.ConeGeometry(.35, .8, 3); L.push([fg, "n", M4(.4, y0 + 5.0, s * .5, 0, s * .6, -2.2, 1, 1, .3)]); });
    /* zománc hasi lemezek (a hasvonal mentén) */
    for (let i = 0; i < 6; i++) { const t = .42 + i * .045, p = cv.getPointAt(t), r = rFn(t); L.push([SPH(.24, 10, 6), "n", M4(p.x + r * .92, p.y, 0, 0, 0, 0, .35, 1, 1.2)]); }
    figMesh(L, G, c);
    G.userData.dim = [5.2, y0 + 8.3, 5.2];
    return G;
  }
  /* ------------------------------------------------------------ FUTÓ: hajókormány esztergált oszlopon – a kerék külön forog */
  function figBishop(c) {
    const G = new THREE.Group(), L = [], y0 = waveBase(L, 2.55);
    L.push([lathe([[1.15, y0], [1.2, y0 + .18], [.85, y0 + .4], [.5, y0 + .7], [.42, y0 + 1.4], [.62, y0 + 1.85], [.66, y0 + 2.1], [.45, y0 + 2.4], [.4, y0 + 3.6], [.55, y0 + 3.8], [.5, y0 + 3.95], [0, y0 + 4.0]], 28), "m"]);
    L.push([lathe([[.44, y0 + 2.5], [.46, y0 + 2.55], [.46, y0 + 3.35], [.44, y0 + 3.4]], 28), "n"]);
    L.push([new THREE.BoxGeometry(.5, .7, 1.0), "m", M4(0, y0 + 4.3, 0)]);
    figMesh(L, G, c);
    /* kerék */
    const WH = new THREE.Group(); WH.name = "wheel"; WH.position.set(0, y0 + 5.15, .35); G.add(WH);
    const K = [];
    K.push([TOR(2.05, .17, 8, 56), "m"], [TOR(1.42, .1, 6, 48), "m"]);
    K.push([lathe([[1.48, -.06], [2.0, -.06], [2.0, .06], [1.48, .06], [1.48, -.06]], 48).rotateX(Math.PI / 2), "n"]);
    K.push([CY(.48, .48, .55, 20).rotateX(Math.PI / 2), "m"], [CY(.36, .36, .6, 20).rotateX(Math.PI / 2), "n"], [SPH(.2, 12, 8), "m", M4(0, 0, .32)], [SPH(.2, 12, 8), "m", M4(0, 0, -.32)]);
    const hand = lathe([[.1, 0], [.15, .1], [.13, .3], [.17, .45], [.12, .6], [.06, .66], [0, .67]], 10);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, dx = Math.cos(a), dy = Math.sin(a);
      K.push(RODF(V3(dx * .45, dy * .45, 0), V3(dx * 2.1, dy * 2.1, 0), .075, 8));
      const m4 = new THREE.Matrix4().compose(V3(dx * 2.18, dy * 2.18, 0), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), V3(dx, dy, 0)), V3(1, 1, 1)); K.push([hand.clone(), "m", m4]); }
    const an = anchorGeo(.9); K.push([an, "m", M4(0, -1.75, .05)]);
    figMesh(K, WH, c);
    G.userData.dim = [5.8, y0 + 5.15 + 2.9, 5.2];
    return G;
  }
  /* ------------------------------------------------------------ VEZÉR: királynő – zománc ruha arany hullámszegéllyel, palást, korona, jogar */
  function figQueen(c) {
    const G = new THREE.Group(), L = [], y0 = runeDisc(G, L, 2.6) + .05;
    L.push([lathe([[1.85, y0], [1.82, y0 + .35], [1.55, y0 + 1.5], [1.2, y0 + 2.9], [.8, y0 + 4.3], [.62, y0 + 4.85]], 40), "n"]);
    const hem = new THREE.CatmullRomCurve3(Array.from({ length: 60 }, (_, i) => { const a = i / 60 * TAU; return V3(Math.cos(a) * 1.82, y0 + .32 + .12 * Math.sin(a * 14), Math.sin(a) * 1.82); }), true);
    L.push([new THREE.TubeGeometry(hem, 180, .05, 5, true), "m"], [TOR(1.86, .06, 6, 56).rotateX(Math.PI / 2), "m", M4(0, y0 + .05, 0)], [TOR(1.42, .04, 5, 48).rotateX(Math.PI / 2), "m", M4(0, y0 + 1.95, 0)], [TOR(.98, .035, 5, 40).rotateX(Math.PI / 2), "m", M4(0, y0 + 3.6, 0)]);
    /* elöl: arany díszsor (csillagok) a ruhán */
    for (let i = 0; i < 4; i++) { const y = y0 + .9 + i * .95, r = 1.75 - i * .27; L.push([new THREE.OctahedronGeometry(.16, 0), "m", M4(0, y, -r, 0, 0, 0, 1, 1.4, .5)], [new THREE.OctahedronGeometry(.16, 0), "m", M4(0, y, r, 0, 0, 0, 1, 1.4, .5)]); }
    /* derék, fűző, váll, nyak, fej, haj */
    L.push([lathe([[.6, y0 + 4.7], [.66, y0 + 5.2], [.62, y0 + 5.8], [.75, y0 + 6.2], [.55, y0 + 6.45], [.2, y0 + 6.6]], 28), "m"], [TOR(.64, .07, 6, 28).rotateX(Math.PI / 2), "m", M4(0, y0 + 4.85, 0)]);
    [1, -1].forEach((s) => L.push([SPH(.32, 12, 10), "m", M4(s * .7, y0 + 6.2, 0)]));
    L.push([CY(.18, .2, .45, 12), "m", M4(0, y0 + 6.75, 0)], [SPH(.52, 20, 16), "m", M4(0, y0 + 7.35, 0, 0, 0, 0, .92, 1.05, .95)], [SPH(.4, 14, 10), "m", M4(0, y0 + 7.55, .38)], [TOR(.48, .12, 8, 24).rotateX(Math.PI / 2.4), "m", M4(0, y0 + 7.45, .12)]);
    /* korona: abroncs, nyolc csúcs zománcgyöngyökkel, középen kereszt-gömb */
    const cy = y0 + 7.85; L.push([new THREE.CylinderGeometry(.46, .4, .26, 20, 1, true), "m", M4(0, cy, 0)], [TOR(.46, .05, 5, 24).rotateX(Math.PI / 2), "m", M4(0, cy + .13, 0)]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; L.push([new THREE.ConeGeometry(.1, .42, 5), "m", M4(Math.cos(a) * .44, cy + .33, Math.sin(a) * .44)], [SPH(.07, 8, 6), "n", M4(Math.cos(a) * .44, cy + .56, Math.sin(a) * .44)]); }
    L.push([SPH(.16, 12, 10), "n", M4(0, cy + .48, 0)], [new THREE.BoxGeometry(.06, .3, .06), "m", M4(0, cy + .72, 0)]);
    /* karok: jobb kéz jogarral, bal a ruhán */
    L.push(...[[V3(.82, y0 + 6.1, 0), V3(1.05, y0 + 5.1, -.15), V3(1.0, y0 + 4.4, -.45)], [V3(-.82, y0 + 6.1, 0), V3(-.95, y0 + 5.1, -.1), V3(-.55, y0 + 4.6, -.5)]].map((pp) => [varTube(new THREE.CatmullRomCurve3(pp), 14, 8, (t) => .2 - t * .06), "m"]));
    L.push([SPH(.16, 10, 8), "m", M4(1.0, y0 + 4.35, -.47)], [SPH(.16, 10, 8), "m", M4(-.55, y0 + 4.55, -.52)]);
    L.push(RODF(V3(1.0, y0 + 3.2, -.5), V3(1.0, y0 + 7.0, -.5), .055, 8), [new THREE.OctahedronGeometry(.28, 0), "n", M4(1.0, y0 + 7.25, -.5)], [TOR(.22, .04, 5, 16), "m", M4(1.0, y0 + 7.25, -.5)]);
    /* palást hátul (fél esztergatest), szegéllyel */
    L.push([lathe([[.72, y0 + 6.3], [1.0, y0 + 5.0], [1.45, y0 + 2.6], [2.0, y0 + .15]], 24, Math.PI * .08, Math.PI * .84), "n", null, "#9fb4e6"], [TOR(.75, .06, 5, 20, Math.PI).rotateX(Math.PI / 2), "m", M4(0, y0 + 6.3, 0)]);
    figMesh(L, G, c);
    G.userData.dim = [4.4, y0 + 8.8, 4.4];
    return G;
  }
  /* ------------------------------------------------------------ KIRÁLY: a kapitány – zománc kabát arany gombokkal, vállap, szakáll, tiszti sapka kereszttel, távcső */
  function figKing(c) {
    const G = new THREE.Group(), L = [], y0 = runeDisc(G, L, 2.7) + .05;
    /* csizma, kabát (a földig érő szárnyakkal), öv, gombsor */
    [1, -1].forEach((s) => L.push([CY(.36, .4, .9, 12), "m", M4(s * .42, y0 + .45, 0)]));
    L.push([lathe([[1.25, y0 + .7], [1.2, y0 + 1.2], [1.05, y0 + 2.7], [.98, y0 + 3.6], [1.12, y0 + 4.6], [1.22, y0 + 5.5], [1.12, y0 + 6.0], [.7, y0 + 6.35], [.28, y0 + 6.5]], 36), "n"]);
    L.push([TOR(1.0, .1, 6, 36).rotateX(Math.PI / 2), "m", M4(0, y0 + 3.6, 0)], [new THREE.BoxGeometry(.5, .38, .14), "m", M4(0, y0 + 3.6, -1.06)]);
    for (let i = 0; i < 5; i++) [-.28, .28].forEach((x) => { const y = y0 + 3.95 + i * .42, r = .98 + (y - y0 - 3.6) * .12; L.push([SPH(.08, 8, 6), "m", M4(x, y, -Math.sqrt(Math.max(.1, r * r - x * x)))]); });
    L.push([TOR(1.22, .045, 5, 40).rotateX(Math.PI / 2), "m", M4(0, y0 + .75, 0)], [TOR(1.0, .04, 5, 40).rotateX(Math.PI / 2), "m", M4(0, y0 + 2.8, 0)]);
    /* fém mellény-betét és hajtókák elöl (a kabát nyitott eleje), arany zsinórok a mellen */
    { const vs = new THREE.Shape(); vs.moveTo(-.42, 0); vs.lineTo(.42, 0); vs.lineTo(.3, 1.9); vs.lineTo(0, 2.25); vs.lineTo(-.3, 1.9); vs.closePath(); const vg = new THREE.ExtrudeGeometry(vs, { depth: .08, bevelEnabled: false }); L.push([vg, "m", M4(0, y0 + 3.8, -1.12, Math.PI, .1)]);
      [1, -1].forEach((sd) => { const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.lineTo(.42 * sd, .2); ls.lineTo(.62 * sd, 1.6); ls.lineTo(.3 * sd, 2.3); ls.closePath(); L.push([new THREE.ExtrudeGeometry(ls, { depth: .06, bevelEnabled: false }), "n", M4(0, y0 + 3.85, -1.2, Math.PI, .1), "#c7d3f2"]); });
      for (let i = 0; i < 3; i++) L.push([TOR(.42 - i * .04, .025, 4, 16, Math.PI), "m", M4(0, y0 + 5.3 - i * .35, -1.2, 0, 0, Math.PI)]); }
    /* gallér, vállapok rojtokkal */
    L.push([lathe([[.55, y0 + 6.25], [.7, y0 + 6.45], [.45, y0 + 6.7]], 24), "m"]);
    [1, -1].forEach((s) => { L.push([CY(.42, .42, .1, 16), "m", M4(s * 1.02, y0 + 6.05, 0, 0, 0, s * .25)]); for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI - Math.PI / 2; L.push([CY(.03, .03, .32, 4), "m", M4(s * (1.02 + Math.cos(a) * .0) + s * .38, y0 + 5.85, Math.sin(a) * .38)]); } });
    /* karok: jobb kéz távcsővel (előre-fel), bal csípőre */
    const armR = new THREE.CatmullRomCurve3([V3(1.05, y0 + 6.0, 0), V3(1.35, y0 + 5.2, -.35), V3(1.2, y0 + 4.9, -1.05)]), armL = new THREE.CatmullRomCurve3([V3(-1.05, y0 + 6.0, 0), V3(-1.55, y0 + 5.0, 0), V3(-1.05, y0 + 4.2, -.2)]);
    L.push([varTube(armR, 14, 8, (t) => .3 - t * .08), "n"], [varTube(armL, 14, 8, (t) => .3 - t * .08), "n"], [TOR(.24, .06, 5, 14), "m", M4(1.2, y0 + 4.92, -1.0, 0, -.3)], [TOR(.24, .06, 5, 14).rotateX(Math.PI / 2), "m", M4(-1.07, y0 + 4.3, -.18)]);
    L.push([SPH(.2, 10, 8), "m", M4(1.2, y0 + 4.95, -1.15)], [SPH(.2, 10, 8), "m", M4(-1.02, y0 + 4.15, -.25)]);
    L.push([CY(.11, .16, 1.6, 12).rotateX(-(Math.PI / 2 - .35)), "m", M4(1.2, y0 + 5.2, -1.55)], [TOR(.14, .03, 5, 12), "m", M4(1.2, y0 + 5.42, -2.1, 0, -.35)]);
    /* fej, szakáll, fülek */
    L.push([CY(.22, .25, .4, 12), "m", M4(0, y0 + 6.75, 0)], [SPH(.56, 20, 16), "m", M4(0, y0 + 7.3, 0, 0, 0, 0, .95, 1.05, 1)], [SPH(.5, 14, 10, 0), "m", M4(0, y0 + 7.0, -.15, 0, 0, 0, 1, .85, .9)]);
    [1, -1].forEach((s) => L.push([SPH(.12, 8, 6), "m", M4(s * .54, y0 + 7.3, 0, 0, 0, 0, .5, 1, 1)]));
    /* tiszti sapka: zománc tető, arany szalag, fém ellenző, jelvény-kereszt elöl és a tetején */
    const hy = y0 + 7.75;
    L.push([CY(.66, .6, .42, 24), "n", M4(0, hy, 0)], [CY(.8, .8, .14, 28), "n", M4(0, hy + .25, 0, 0, 0, 0, 1, 1, 1)], [TOR(.62, .06, 6, 28).rotateX(Math.PI / 2), "m", M4(0, hy - .12, 0)]);
    L.push([lathe([[.2, -.02], [.72, -.06], [.74, 0], [.2, .02]], 24, Math.PI * .5, Math.PI), "m", M4(0, hy - .2, 0, 0, .15)]);
    const cross = (x, y, z, ry, s) => { L.push([new THREE.BoxGeometry(.12 * s, .62 * s, .12 * s), "m", M4(x, y, z, ry)], [new THREE.BoxGeometry(.42 * s, .12 * s, .12 * s), "m", M4(x, y + .1 * s, z, ry)]); };
    cross(0, hy + .02, -.66, 0, .75); cross(0, hy + .02, .64, 0, .6);
    L.push([SPH(.13, 10, 8), "m", M4(0, hy + .36, 0)]); cross(0, hy + .72, 0, 0, 1.0); L.push([SPH(.07, 8, 6), "n", M4(0, hy + .82, -.07)]);
    /* kabátszárny hátul */
    L.push([lathe([[1.1, y0 + 3.6], [1.25, y0 + 2.2], [1.42, y0 + .8]], 20, Math.PI * .2, Math.PI * .6), "n", null, "#9fb4e6"]);
    figMesh(L, G, c);
    G.userData.dim = [4.6, hy + 1.1, 4.6];
    return G;
  }
  const FIGB = { p: figPawn, n: figKnight, b: figBishop, r: figRook, q: figQueen, k: figKing };
  /* a figura nagyobb, mint a hajó volt: a mérethez igazítva (a makePiece még PSC-vel szoroz) */
  const FIGS = { p: 1.0, n: 1.08, b: 1.02, r: 1.06, q: 1.15, k: 1.18 };
  function figTpl(t, c) {
    const k = "f" + t + c; if (!CS.tpl[k]) { const g = FIGB[t](c); const s = FIGS[t]; g.scale.setScalar(s); g.userData.dim = g.userData.dim.map((v) => v * s); g.userData.lamp = (g.userData.lamp || 0) * s; CS.tpl[k] = g; }
    const src = CS.tpl[k], o = src.clone(); o.userData = Object.assign({}, src.userData); return o;
  }

  /* ------------------------------------------------------------ FIGURÁK MOZGATÁSA (állapot a P objektumon)
     – siklás: a talapzat kicsit előre dől, a víz habzik; a csikóhal ugrik; a királyi pár lépked, lábnyomuk csillámló gyűrű */
  function figIdle(P, dt) {
    const rune = P.model.getObjectByName ? (P.rune || (P.rune = P.model.getObjectByName("rune") || null)) : null;
    if (rune) { rune.rotation.y += dt * (P.moving ? 2.2 : .35); rune.material.opacity = P.moving ? .95 : .55 + .15 * Math.sin(W.t * 2 + P.ph); }
    const wh = P.wheel || (P.wheel = P.model.getObjectByName("wheel") || null);
    if (wh) { P.spin = P.spin || 0; wh.rotation.z += dt * (.15 + P.spin); P.spin *= 1 - Math.min(1, dt * .8); }
  }
  /* ------------------------------------------------------------ CSATÁK: a támadó típusa dönti el a látványt */
  function battleSetup(A, P, V) {
    const st = { p: "lasso", n: "leap", b: "whirl", r: "beam", q: "spout", k: "storm" }[P.t];
    A.style = st; A.V = V;
    const T0 = { lasso: [.35, 1.25, 3.0, 3.2], leap: [.05, 9, 9, .05], whirl: [.3, 1.3, 3.3, 3.5], beam: [.35, 1.1, 2.9, 3.1], spout: [.4, 1.2, 3.1, 3.5], storm: [.3, 1.6, 3.6, 3.9] }[st];
    /* tFire: a támadás kezdete, tSink: az áldozat süllyedése, tGone: eltűnik, tSail: a támadó elindul */
    A.tFire = T0[0]; A.tSink = T0[1]; A.tGone = T0[2]; A.tSail = T0[3];
    if (st === "leap") { A.leap = true; }
    snd(st === "storm" ? "boom" : st === "beam" ? "whoosh" : "creak", .5);
  }
  /* ideiglenes hálók a csatához (kötél, örvény, fénysugár, víztölcsér, villám, csápok) */
  function bfx() {
    if (CS.bfx) return CS.bfx;
    const env = CS.env, B = {};
    B.rope = new THREE.Mesh(new THREE.BufferGeometry(), std({ color: "#d8c89c", roughness: .8 })); B.rope.visible = false; env.add(B.rope);
    const wt = canvasTex(512, 512, (g) => { g.translate(256, 256); for (let k = 0; k < 7; k++) { g.rotate(TAU / 7); g.beginPath(); for (let i = 0; i <= 80; i++) { const a = i / 80 * 4.2, r = 20 + i * 2.95; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 10; g.stroke(); g.strokeStyle = "rgba(160,215,255,.5)"; g.lineWidth = 26; g.stroke(); }
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 250); gr.addColorStop(0, "rgba(0,8,20,.95)"); gr.addColorStop(.25, "rgba(2,20,40,.6)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.globalCompositeOperation = "destination-over"; g.fillStyle = gr; g.fillRect(-256, -256, 512, 512); });
    B.whirl = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), basic({ map: wt, transparent: true, depthWrite: false, opacity: 0 })); B.whirl.renderOrder = 2; B.whirl.visible = false; env.add(B.whirl);
    const lt = canvasTex(64, 64, (g) => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, "rgba(255,250,220,0)"); gr.addColorStop(.5, "rgba(255,255,240,1)"); gr.addColorStop(1, "rgba(255,250,220,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    B.ray = new THREE.Mesh(new THREE.CylinderGeometry(.45, .9, 1, 16, 1, true).translate(0, .5, 0).rotateX(Math.PI / 2), basic({ map: lt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: "#fff2c0", side: THREE.DoubleSide, opacity: 0 })); B.ray.visible = false; env.add(B.ray);
    const st = canvasTex(128, 512, (g, w, h) => { for (let i = 0; i < 60; i++) { const x = rand() * w; g.strokeStyle = `rgba(255,255,255,${rr(.15, .6)})`; g.lineWidth = rr(2, 7); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + rr(-30, 30), h); g.stroke(); } });
    st.wrapS = st.wrapT = THREE.RepeatWrapping;
    B.spout = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 1.1, 26, 32, 12, true).translate(0, 13, 0), basic({ map: st, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: "#cfe9ff", opacity: 0, blending: THREE.AdditiveBlending })); B.spout.visible = false; env.add(B.spout);
    { const p = B.spout.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = v.y / 26, a = k * 2.2; const x = v.x * Math.cos(a) - v.z * Math.sin(a), z = v.x * Math.sin(a) + v.z * Math.cos(a); p.setXYZ(i, x + Math.sin(k * 5) * .8, v.y, z); } p.needsUpdate = true; }
    B.bolt = new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: "#e9f4ff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); B.bolt.visible = false; env.add(B.bolt);
    B.boltG = new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: "#7fb8ff", transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false })); B.boltG.visible = false; env.add(B.boltG);
    B.tent = []; const tm = std({ color: "#5c1f3c", roughness: .45, metalness: .1 }); for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.BufferGeometry(), tm); m.visible = false; env.add(m); B.tent.push(m); }
    B.cups = std({ color: "#e9b9c4", roughness: .5 });
    B.cloud = new THREE.Mesh(new THREE.CircleGeometry(16, 40).rotateX(Math.PI / 2), basic({ color: "#1a1a2a", transparent: true, opacity: 0, depthWrite: false })); B.cloud.visible = false; env.add(B.cloud);
    return (CS.bfx = B);
  }
  function setGeo(m, g) { if (m.geometry) m.geometry.dispose(); m.geometry = g; }
  function boltGeo(a, b, seg, jit, r) {
    const pts = [a.clone()]; for (let i = 1; i < seg; i++) { const k = i / seg; pts.push(a.clone().lerp(b, k).add(V3(rr(-jit, jit), rr(-jit * .3, jit * .3), rr(-jit, jit)))); } pts.push(b.clone());
    const parts = []; for (let i = 0; i < pts.length - 1; i++) { const [g, m] = rodGeom(pts[i], pts[i + 1], r, 4); parts.push([g, m]); }
    /* egy-két mellékág */
    for (let k = 0; k < 2; k++) { const i = 2 + Math.floor(rand() * (seg - 4)), q = pts[i], e = q.clone().add(V3(rr(-6, 6), rr(-6, -2), rr(-6, 6))); const [g, m] = rodGeom(q, e, r * .6, 4); parts.push([g, m]); }
    const g = mergeGeoms(parts); const i = W.disposables.indexOf(g); if (i >= 0) W.disposables.splice(i, 1); return g;
  }
  function tentGeo(base, top, curl, k, phase) {
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10, s = t * k; const a = phase + t * curl * k; pts.push(V3(base.x + (top.x - base.x) * s + Math.cos(a) * 1.4 * t, -1.5 + (top.y + 1.5) * Math.sin(s * Math.PI * .5), base.z + (top.z - base.z) * s + Math.sin(a) * 1.4 * t)); }
    return varTube(new THREE.CatmullRomCurve3(pts), 40, 8, (t) => Math.max(.06, .75 * (1 - t) * (1 - t * .3)));
  }
  /* a csata egy képkockája – visszaadja, hogy az áldozatot mi mozgatja (a süllyedés módját) */
  function battleTick(A, dt) {
    const B = bfx(), V = A.V, vp = A.vp, P = A.movers[0].P, t = A.t, st = A.style;
    const vt = V.body;
    if (st === "lasso") {
      const top = A.ap.clone().add(V3(0, P.dim[1] * .62, 0)), tgt = vp.clone().add(V3(0, V.dim[1] * .55, 0));
      if (t > A.tFire && t < A.tGone + .2) { const k = clamp((t - A.tFire) / .7, 0, 1), pull = clamp((t - A.tSink) / (A.tGone - A.tSink), 0, 1);
        const end = top.clone().lerp(tgt, smooth(k)); const mid = top.clone().lerp(end, .5).add(V3(0, 4 * (1 - k) + 1.2 * (1 - pull), 0));
        const pts = [top, mid, end]; const loopR = 1.6 * k * (1 - pull * .6);
        const curve = new THREE.CatmullRomCurve3(pts.concat(Array.from({ length: 10 }, (_, i) => { const a = i / 9 * TAU; return V3(end.x + Math.cos(a) * loopR, end.y - .4 * pull + Math.sin(a * 2) * .2, end.z + Math.sin(a) * loopR); })));
        setGeo(B.rope, new THREE.TubeGeometry(curve, 60, .16, 6, false)); B.rope.visible = true;
        if (k >= 1 && !A.lassoed) { A.lassoed = 1; snd("creak"); splashAt(vp, false); } }
      else B.rope.visible = false;
      if (t > A.tSink) { const k = clamp((t - A.tSink) / (A.tGone - A.tSink), 0, 1), dir = A.ap.clone().sub(vp).normalize();
        V.g.position.copy(vp).addScaledVector(dir, smooth(k) * 3.2); vt.rotation.set(-dir.z * k * .9, 0, dir.x * k * .9); vt.position.y = -Math.pow(k, 1.5) * (V.dim[1] + 2);
        if (rand() < dt * 18) CS.fx.spray.emit(V3(V.g.position.x + rr(-1.5, 1.5), .3, V.g.position.z + rr(-1.5, 1.5)), V3(rr(-1, 1), rr(2, 5), rr(-1, 1)), rr(.4, .8), 1.2);
        if (rand() < dt * 8) CS.fx.rings.emit(V.g.position.x, V.g.position.z, rr(1.5, 3), 2); }
      if (t > A.tGone) B.rope.visible = false;
    } else if (st === "leap") {
      /* az ütés a landoláskor (a mozgató ágban): az áldozat összeroppan és a hullám alá kerül */
      if (A.landed) { const k = clamp((t - A.landed) / 1.4, 0, 1); vt.scale.set(1 + k * .25, Math.max(.05, 1 - k * 1.1), 1 + k * .25); vt.position.y = -k * 4; vt.rotation.z = V.sinkRoll * k * .6;
        if (k >= 1 && V.g.parent) dropPiece(V); }
    } else if (st === "whirl") {
      if (t > A.tFire) P.spin = Math.min(14, (P.spin || 0) + dt * 18);
      const k = clamp((t - A.tFire) / .8, 0, 1), out = clamp((t - A.tGone) / .6, 0, 1);
      B.whirl.visible = k > 0 && out < 1; B.whirl.position.set(vp.x, .32, vp.z); B.whirl.scale.setScalar(.5 + 6.2 * smooth(k) * (1 - out)); B.whirl.rotation.y -= dt * (3 + 6 * k); B.whirl.material.opacity = .95 * k * (1 - out);
      if (k > .3 && rand() < dt * 30) { const a = rand() * TAU, r = rr(2, 6); CS.fx.spray.emit(V3(vp.x + Math.cos(a) * r, .3, vp.z + Math.sin(a) * r), V3(-Math.sin(a) * 6, rr(1, 3), Math.cos(a) * 6), rr(.3, .7), .9); }
      if (t > A.tSink) { const kk = clamp((t - A.tSink) / (A.tGone - A.tSink), 0, 1); V.yaw += dt * (2 + kk * 14); vt.position.y = -Math.pow(kk, 1.7) * (V.dim[1] + 3); vt.rotation.z = Math.sin(t * 9) * .12 * kk; if (!A.wsnd) { A.wsnd = 1; snd("sink"); } }
    } else if (st === "beam") {
      const lamp = A.ap.clone().add(V3(0, (P.model.userData.lamp || P.dim[1] * .8) * PSC, 0)), tgt = vp.clone().add(V3(0, V.dim[1] * .5, 0));
      const k = clamp((t - A.tFire) / .35, 0, 1), out = clamp((t - A.tSink - .9) / .5, 0, 1);
      if (P.beam) { const want = Math.atan2(-(tgt.z - lamp.z), tgt.x - lamp.x) - P.g.rotation.y; P.beam.rotation.y += wrapA(want - P.beam.rotation.y) * Math.min(1, dt * 10); }
      B.ray.visible = k > 0 && out < 1; if (B.ray.visible) { B.ray.position.copy(lamp); B.ray.quaternion.setFromUnitVectors(V3(0, 0, 1), tgt.clone().sub(lamp).normalize()); B.ray.scale.set(1 + .3 * Math.sin(t * 40), 1 + .3 * Math.sin(t * 40), lamp.distanceTo(tgt)); B.ray.material.opacity = k * (1 - out); }
      if (k >= 1 && t < A.tSink + 1) { if (rand() < dt * 40) CS.fx.flash.emit(tgt.clone().add(V3(rr(-1, 1), rr(-1, 1), rr(-1, 1))), V3(0, rr(.5, 2), 0), rr(1.5, 3), .3); if (rand() < dt * 20) CS.fx.fire.emit(V3(vp.x + rr(-1.2, 1.2), rr(.5, V.dim[1]), vp.z + rr(-1.2, 1.2)), V3(0, rr(1, 3), 0), rr(1, 2.2), rr(.4, .7)); if (!A.bsnd) { A.bsnd = 1; snd("hit"); } }
      if (t > A.tSink) { const kk = clamp((t - A.tSink) / (A.tGone - A.tSink), 0, 1); vt.scale.set(1 + kk * .15, Math.max(.04, 1 - kk * .95), 1 + kk * .15); vt.position.y = -kk * 1.5;
        if (rand() < dt * 16) CS.fx.smoke.emit(V3(vp.x + rr(-1.5, 1.5), .5, vp.z + rr(-1.5, 1.5)), V3(rr(-.4, .4), rr(2, 4), rr(-.4, .4)), rr(2, 4)); if (!A.ssnd) { A.ssnd = 1; snd("sink"); } }
    } else if (st === "spout") {
      const k = clamp((t - A.tFire) / .8, 0, 1), out = clamp((t - 2.5) / .5, 0, 1);
      B.spout.visible = k > 0 && out < 1; B.spout.position.set(vp.x, 0, vp.z); B.spout.scale.set(.3 + .7 * k, smooth(k) * (1 - out * .9) + .01, .3 + .7 * k); B.spout.rotation.y += dt * 5; B.spout.material.map.offset.y -= dt * 1.4; B.spout.material.opacity = .85 * k * (1 - out);
      if (k > 0 && rand() < dt * 40) { const a = rand() * TAU; CS.fx.spray.emit(V3(vp.x + Math.cos(a) * 3, .3, vp.z + Math.sin(a) * 3), V3(-Math.sin(a) * 5, rr(4, 9), Math.cos(a) * 5), rr(.4, .9), 1.1); }
      if (k > 0 && !A.ssnd) { A.ssnd = 1; snd("whoosh"); }
      const lift = clamp((t - A.tSink) / 1.3, 0, 1), fall = clamp((t - 2.55) / .45, 0, 1);
      if (t > A.tSink) { V.yaw += dt * (4 + lift * 10); vt.position.y = smooth(lift) * 15 * (1 - fall * fall) - (t > 3.0 ? (t - 3.0) * 12 : 0); vt.rotation.set(Math.sin(t * 3) * .5 * lift, 0, Math.cos(t * 2.4) * .6 * lift); }
      if (fall >= 1 && !A.splashed) { A.splashed = 1; splashAt(vp, true); CS.fx.rings.emit(vp.x, vp.z, 5, 3); snd("hit"); }
    } else if (st === "storm") {
      const strikes = [A.tFire, A.tFire + .42, A.tFire + .72];
      B.cloud.visible = t > A.tFire - .3 && t < A.tGone; B.cloud.position.set(vp.x, 34, vp.z); B.cloud.material.opacity = .55 * clamp((t - A.tFire + .3) / .5, 0, 1) * (1 - clamp((t - A.tGone + .5) / .5, 0, 1));
      A.si = A.si || 0; if (A.si < strikes.length && t > strikes[A.si]) { A.si++; A.boltT = .16; const top = V3(vp.x + rr(-4, 4), 34, vp.z + rr(-4, 4)), end = vp.clone().add(V3(rr(-.5, .5), V.dim[1] * .7, rr(-.5, .5)));
        setGeo(B.bolt, boltGeo(top, end, 14, 2.4, .12)); setGeo(B.boltG, boltGeo(top, end, 10, 3.2, .5)); CS.fx.flash.emit(end, V3(0, 0, 0), 9, .3); CS.fx.flash.emit(top, V3(0, 0, 0), 14, .25); snd("boom", 1); for (let j = 0; j < 14; j++) CS.fx.fire.emit(end.clone(), V3(rr(-5, 5), rr(0, 6), rr(-5, 5)), rr(.4, 1), rr(.3, .6)); }
      if (A.boltT > 0) { A.boltT -= dt; B.bolt.visible = B.boltG.visible = (A.boltT * 30 | 0) % 2 === 0; } else B.bolt.visible = B.boltG.visible = false;
      if (A.si && t < A.tSink + .6 && rand() < dt * 5) CS.fx.dsmoke.emit(V3(vp.x + rr(-1, 1), V.dim[1] * .6, vp.z + rr(-1, 1)), V3(rr(-.3, .3), rr(1, 2), rr(-.3, .3)), rr(1.1, 1.8));
      /* a kraken csápjai kinyúlnak, körbefonják, és a mélybe húzzák */
      const kt = clamp((t - A.tSink + .3) / .9, 0, 1), down = clamp((t - A.tSink - .7) / (A.tGone - A.tSink - .7), 0, 1);
      B.tent.forEach((m, i) => { const a = i / 4 * TAU + .4, base = V3(vp.x + Math.cos(a) * 4.6, 0, vp.z + Math.sin(a) * 4.6), top = V3(vp.x + Math.cos(a + 1.2) * 1.0, V.dim[1] * (.75 - down * .9) + 1.5, vp.z + Math.sin(a + 1.2) * 1.0);
        m.visible = kt > 0 && t < A.tGone + .3; if (m.visible) setGeo(m, tentGeo(base, top, 3.2 + i * .4, .15 + .85 * smooth(kt), a + t * 1.5)); });
      if (kt > 0 && !A.ksnd) { A.ksnd = 1; splashAt(vp, true); }
      if (down > 0) { V.yaw += dt * 2; vt.position.y = -Math.pow(down, 1.4) * (V.dim[1] + 4); vt.rotation.z = Math.sin(t * 7) * .2; if (rand() < dt * 14) CS.fx.rings.emit(vp.x + rr(-3, 3), vp.z + rr(-3, 3), rr(1.5, 3), 2); if (!A.dsnd) { A.dsnd = 1; snd("sink"); } }
    }
    if (V.g.parent) V.g.rotation.y = V.yaw;
    if (st !== "leap" && t > A.tGone && V.g.parent) dropPiece(V);
  }
  function battleEnd() {
    const B = CS.bfx; if (!B) return;
    B.rope.visible = B.whirl.visible = B.ray.visible = B.spout.visible = B.bolt.visible = B.boltG.visible = B.cloud.visible = false; B.tent.forEach((m) => { m.visible = false; });
  }

  /* ------------------------------------------------------------ A TÁBLA DÍSZEI (a víz árnyalójába festve): arany rácsvonalak, szegecsek a
     metszéspontokon, középen arany szélrózsa, körben tengerkék zománcsáv hullámmintával és dupla arany szegéllyel, sarkokban horgony */
  const BF = BH + 1.5;
  function boardTex() {
    const N = 2048, k = N / (2 * BF), X = (x) => (x + BF) * k;
    const t = canvasTex(N, N, (g) => {
      g.clearRect(0, 0, N, N);
      const gold = "rgba(236,196,104,1)";
      /* zománcsáv a tábla körül */
      g.fillStyle = "rgba(16,38,92,.93)"; g.fillRect(0, 0, N, N); g.clearRect(X(-BH), X(-BH), 2 * BH * k, 2 * BH * k);
      g.strokeStyle = gold; g.lineWidth = .14 * k; g.strokeRect(X(-BF + .18), X(-BF + .18), (2 * BF - .36) * k, (2 * BF - .36) * k); g.lineWidth = .1 * k; g.strokeRect(X(-BH - .2), X(-BH - .2), (2 * BH + .4) * k, (2 * BH + .4) * k);
      /* hullámminta a sávban */
      g.lineWidth = .07 * k; const wv = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.round(L / 1.5), ux = (x1 - x0) / L, uy = (y1 - y0) / L; g.beginPath(); for (let i = 0; i <= n * 8; i++) { const s2 = i / 8 * 1.5, w = Math.sin(i / 8 * TAU) * .28; g.lineTo(X(x0 + ux * s2 - uy * w), X(y0 + uy * s2 + ux * w)); } g.stroke(); };
      const m = BH + .75; wv(-m, -m, m, -m); wv(m, -m, m, m); wv(m, m, -m, m); wv(-m, m, -m, -m);
      /* arany rácsvonalak */
      g.strokeStyle = gold; g.lineWidth = .16 * k; for (let i = 0; i <= 8; i++) { const c = -BH + i * SQ; g.beginPath(); g.moveTo(X(c), X(-BH)); g.lineTo(X(c), X(BH)); g.moveTo(X(-BH), X(c)); g.lineTo(X(BH), X(c)); g.stroke(); }
      g.lineWidth = .05 * k; g.strokeStyle = "rgba(236,196,104,.75)"; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const x = -BH + i * SQ, z = -BH + j * SQ; g.strokeRect(X(x + .45), X(z + .45), (SQ - .9) * k, (SQ - .9) * k); }
      /* szegecsek */
      g.fillStyle = gold; for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) { g.beginPath(); g.arc(X(-BH + i * SQ), X(-BH + j * SQ), .32 * k, 0, TAU); g.fill(); }
      /* szélrózsa középen */
      g.save(); g.translate(X(0), X(0)); const R = 15 * k;
      g.globalAlpha = .55; g.strokeStyle = gold; g.lineWidth = .12 * k; [R, R * .82, R * .3].forEach((r) => { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); });
      for (let i = 0; i < 32; i++) { g.save(); g.rotate(i / 32 * TAU); g.beginPath(); g.moveTo(0, -R); g.lineTo(0, -R * (i % 4 ? .9 : .84)); g.stroke(); g.restore(); }
      const star = (n, r1, r2, a0, fill) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = a0 + i / (n * 2) * TAU, r = i % 2 ? r2 : r1; g.lineTo(Math.sin(a) * r, -Math.cos(a) * r); } g.closePath(); g.fillStyle = fill; g.fill(); g.stroke(); };
      g.globalAlpha = .38; star(8, R * .72, R * .2, Math.PI / 8, "rgba(236,196,104,.5)"); g.globalAlpha = .55; star(4, R * .95, R * .16, 0, "rgba(236,196,104,.75)");
      g.globalAlpha = .7; g.fillStyle = gold; g.font = `bold ${2.2 * k}px Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle"; [["É", 0], ["K", 1], ["D", 2], ["Ny", 3]].forEach(([l, i]) => { g.save(); g.rotate(i * Math.PI / 2); g.fillText(l, 0, -R * 1.1); g.restore(); });
      g.restore(); g.globalAlpha = 1;
      /* horgonyok a sarkokban (a zománcsávon) */
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { g.save(); g.translate(X(sx * (BH + .75)), X(sz * (BH + .75))); g.fillStyle = gold; g.beginPath(); g.arc(0, 0, .62 * k, 0, TAU); g.fill(); g.fillStyle = "rgba(16,38,92,1)"; g.font = `bold ${.9 * k}px serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("⚓", 0, .05 * k); g.restore(); });
    });
    t.flipY = false; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
    return t;
  }
