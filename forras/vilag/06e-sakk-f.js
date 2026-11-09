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
  /* ------------------------------------------------------------ CSATÁK (v2, nov. 9.): a támadó figurájához illő, hosszabb jelenetek
     gyalog (Zephyr vitorlás): a leütendő felé fordul, teljes vitorlával nekifut és orral belédöf – az áldozat félrebillen,
                               orra az égnek mered, és tattal előre a mélybe csúszik (roncsdarabok, buborékok)
     huszár (hattyú):          szárnyra kap, a magasban köröz, majd zuhanórepülésben lecsap – vízoszlop, szilánkok
     futó (háromárbócos):      oldalt fordul, három sortűz: az első a víz körül csapódik be (vízoszlopok), a második talál,
                               a harmadik a lőporraktárt – robbanás, égve, oldalára dőlve süllyed
     bástya (világítótorony):  a fénysugár végigpásztázza a vizet, rátalál, izzásig hevíti – robbanás, olvadva süllyed
     vezér (királynő):         varázsörvény, víztölcsér emeli a magasba, megpörgeti, és a mélybe dobja
     király (kapitány):        vihart hív – sötét felhő, zuhogó eső, öt villám, végül a kraken csápjai a mélybe húzzák
     Közben a kép a csata közelébe repül (2D-ben simán, VR-ben kíméletes elsötétüléssel), a végén vissza. */
  const BST = { p: "ram", n: "dive", b: "broadside", r: "beam", q: "spout", k: "storm" };
  function battleSetup(A, P, V) {
    const st = BST[P.t] || "ram", M = A.movers[0], dir = A.vp.clone().sub(A.ap).setY(0).normalize();
    Object.assign(A, { style: st, V, P, dir, tGone: 1e9, tSink: 1e9, tTurn: .8 });
    if (st === "ram") { M.y1 = yawOf(dir); A.tSail = .95; M.dur = Math.max(M.dur, 2.1); snd("creak", .7); }
    else if (st === "dive") { M.y1 = yawOf(dir); A.tTurn = .3; A.leap = true; A.leapH = 19; A.tSail = .4; M.dur = 3.6; snd("whoosh"); }
    else if (st === "broadside") {
      const y = yawOf(dir) + Math.PI / 2; M.y1 = y; A.tTurn = 1.15;
      A.side = Math.sign(dir.x * Math.cos(y) - dir.z * Math.sin(y)) || 1;
      A.shots = []; [1.5, 2.55, 3.45].forEach((t0, vol) => { for (let i = 0; i < 4; i++) A.shots.push({ t: t0 + i * .12, i, vol }); }); A.shi = 0;
      A.tSink = 4.2; A.tGone = 6.6; A.tSail = 6.3; snd("creak", .8);
    }
    else if (st === "beam") { A.tFire = .6; A.tLock = 2.2; A.tSink = 3.8; A.tGone = 5.9; A.tSail = 5.6; snd("whoosh", .5); }
    else if (st === "spout") { A.tFire = .5; A.tLift = 2.0; A.tFall = 4.1; A.tSink = 4.7; A.tGone = 5.7; A.tSail = 5.4; snd("whoosh", .6); }
    else { A.tFire = .4; A.strikes = [1.15, 1.6, 2.05, 2.6, 2.95]; A.si = 0; A.tSink = 3.3; A.tGone = 6.3; A.tSail = 6.0; snd("boom", .4); }
    cineStart(A);
  }
  /* ideiglenes hálók a csatához (örvény, fénysugár, víztölcsér, villám, felhő, eső, csápok, roncsdarabok) */
  function bfx() {
    if (CS.bfx) return CS.bfx;
    const env = CS.env, B = {};
    const wt = canvasTex(512, 512, (g) => { g.translate(256, 256); for (let k = 0; k < 7; k++) { g.rotate(TAU / 7); g.beginPath(); for (let i = 0; i <= 80; i++) { const a = i / 80 * 4.2, r = 20 + i * 2.95; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 10; g.stroke(); g.strokeStyle = "rgba(160,215,255,.5)"; g.lineWidth = 26; g.stroke(); }
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 250); gr.addColorStop(0, "rgba(0,8,20,.95)"); gr.addColorStop(.25, "rgba(2,20,40,.6)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.globalCompositeOperation = "destination-over"; g.fillStyle = gr; g.fillRect(-256, -256, 512, 512); });
    B.whirl = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), basic({ map: wt, transparent: true, depthWrite: false, opacity: 0 })); B.whirl.renderOrder = 2; B.whirl.visible = false; env.add(B.whirl);
    const lt = canvasTex(64, 64, (g) => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, "rgba(255,250,220,0)"); gr.addColorStop(.5, "rgba(255,255,240,1)"); gr.addColorStop(1, "rgba(255,250,220,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    B.ray = new THREE.Mesh(new THREE.CylinderGeometry(.45, 1.1, 1, 16, 1, true).translate(0, .5, 0).rotateX(Math.PI / 2), basic({ map: lt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: "#fff2c0", side: THREE.DoubleSide, opacity: 0 })); B.ray.visible = false; env.add(B.ray);
    B.core = new THREE.Mesh(new THREE.CylinderGeometry(.14, .3, 1, 10, 1, true).translate(0, .5, 0).rotateX(Math.PI / 2), basic({ color: "#ffffff", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); B.core.visible = false; env.add(B.core);
    const st = canvasTex(128, 512, (g, w, h) => { for (let i = 0; i < 60; i++) { const x = rand() * w; g.strokeStyle = `rgba(255,255,255,${rr(.15, .6)})`; g.lineWidth = rr(2, 7); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + rr(-30, 30), h); g.stroke(); } });
    st.wrapS = st.wrapT = THREE.RepeatWrapping;
    B.spout = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 1.1, 26, 32, 12, true).translate(0, 13, 0), basic({ map: st, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: "#cfe9ff", opacity: 0, blending: THREE.AdditiveBlending })); B.spout.visible = false; env.add(B.spout);
    { const p = B.spout.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = v.y / 26, a = k * 2.2; const x = v.x * Math.cos(a) - v.z * Math.sin(a), z = v.x * Math.sin(a) + v.z * Math.cos(a); p.setXYZ(i, x + Math.sin(k * 5) * .8, v.y, z); } p.needsUpdate = true; }
    B.bolt = new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: "#e9f4ff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); B.bolt.visible = false; env.add(B.bolt);
    B.boltG = new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: "#7fb8ff", transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false })); B.boltG.visible = false; env.add(B.boltG);
    B.tent = []; const tm = std({ color: "#5c1f3c", roughness: .45, metalness: .1 }); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.BufferGeometry(), tm); m.visible = false; env.add(m); B.tent.push(m); }
    const ct = canvasTex(256, 256, (g) => { for (let i = 0; i < 40; i++) { const x = rr(40, 216), y = rr(40, 216), r = rr(20, 60), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(30,32,48,.55)"); gr.addColorStop(1, "rgba(30,32,48,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } });
    B.cloud = new THREE.Mesh(new THREE.CircleGeometry(22, 40).rotateX(Math.PI / 2), basic({ map: ct, color: "#5a5e78", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); B.cloud.visible = false; env.add(B.cloud);
    B.cloud2 = B.cloud.clone(); B.cloud2.material = B.cloud.material.clone(); B.cloud2.scale.setScalar(.7); env.add(B.cloud2);
    /* eső: 360 ferde csík egy hengerben, a felhő alatt */
    const RN = 360, rp = new Float32Array(RN * 6), rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
    B.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: "#d4e6ff", transparent: true, opacity: 0, depthWrite: false })); B.rain.frustumCulled = false; B.rain.visible = false; env.add(B.rain); W.disposables.push(rg, B.rain.material);
    B.rainD = Array.from({ length: RN }, () => [rr(-14, 14), rr(0, 30), rr(-14, 14)]);
    /* roncsdarabok: deszkák (mahagóni) és aranyozott szilánkok */
    const pg = new THREE.BoxGeometry(1, 1, 1), wood = std({ color: "#6b3a1e", roughness: .7 }), gild = std({ color: "#d4a13a", metalness: .8, roughness: .3 }), sailM = std({ color: "#f1ece0", roughness: .9, side: THREE.DoubleSide });
    B.deb = []; for (let i = 0; i < 48; i++) { const m = new THREE.Mesh(pg, i % 6 === 0 ? gild : i % 5 === 0 ? sailM : wood); m.visible = false; env.add(m); B.deb.push({ m, v: new THREE.Vector3(), w: new THREE.Vector3(), t: 99, life: 3 }); }
    B.di = 0;
    return (CS.bfx = B);
  }
  function setGeo(m, g) { if (m.geometry) m.geometry.dispose(); m.geometry = g; }
  function boltGeo(a, b, seg, jit, r) {
    const pts = [a.clone()]; for (let i = 1; i < seg; i++) { const k = i / seg; pts.push(a.clone().lerp(b, k).add(V3(rr(-jit, jit), rr(-jit * .3, jit * .3), rr(-jit, jit)))); } pts.push(b.clone());
    const parts = []; for (let i = 0; i < pts.length - 1; i++) { const [g, m] = rodGeom(pts[i], pts[i + 1], r, 4); parts.push([g, m]); }
    for (let k = 0; k < 3; k++) { const i = 2 + Math.floor(rand() * (seg - 4)), q = pts[i], e = q.clone().add(V3(rr(-6, 6), rr(-6, -2), rr(-6, 6))); const [g, m] = rodGeom(q, e, r * .6, 4); parts.push([g, m]); }
    const g = mergeGeoms(parts); const i = W.disposables.indexOf(g); if (i >= 0) W.disposables.splice(i, 1); return g;
  }
  function tentGeo(base, top, curl, k, phase) {
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10, s = t * k; const a = phase + t * curl * k; pts.push(V3(base.x + (top.x - base.x) * s + Math.cos(a) * 1.4 * t, -1.5 + (top.y + 1.5) * Math.sin(s * Math.PI * .5), base.z + (top.z - base.z) * s + Math.sin(a) * 1.4 * t)); }
    return varTube(new THREE.CatmullRomCurve3(pts), 40, 8, (t) => Math.max(.06, .75 * (1 - t) * (1 - t * .3)));
  }
  /* roncsok szétrepülése, vízoszlop, ágyúgolyó */
  function debris(p, n, spd, up) {
    const B = bfx(); for (let k = 0; k < n; k++) { const d = B.deb[B.di++ % B.deb.length]; d.m.position.copy(p).add(V3(rr(-.6, .6), rr(0, .8), rr(-.6, .6)));
      const a = rand() * TAU, s = rr(.4, 1) * spd; d.v.set(Math.cos(a) * s, rr(.5, 1) * (up || spd * 1.2), Math.sin(a) * s); d.w.set(rr(-9, 9), rr(-9, 9), rr(-9, 9));
      d.m.scale.set(rr(.15, .5), rr(.08, .16), rr(.6, 1.8)); d.m.rotation.set(rand() * 6, rand() * 6, rand() * 6); d.t = 0; d.life = rr(2.5, 4); d.m.visible = true; }
  }
  function geyser(p, h) { for (let k = 0; k < 22; k++) CS.fx.spray.emit(V3(p.x + rr(-.7, .7), .2, p.z + rr(-.7, .7)), V3(rr(-1.2, 1.2), rr(.7, 1) * h, rr(-1.2, 1.2)), rr(.7, 1.3), 2); CS.fx.rings.emit(p.x, p.z, 3.5, 2.6); CS.fx.rings.emit(p.x, p.z, 2, 1.8); snd("splash", 1); }
  function ballTo(from, to, on) {
    const b = CS.balls.find((q) => q.t > q.d) || CS.balls[0], dist = from.distanceTo(to);
    b.a = from.clone(); b.b = to.clone(); b.t = 0; b.d = .45 + dist / 55; b.h = 1 + dist * .07; b.on = on; b.m.visible = true;
  }
  function bfxTick(dt) {
    const B = CS.bfx; if (!B) return;
    B.deb.forEach((d) => { if (d.t > d.life) { if (d.m.visible) d.m.visible = false; return; } d.t += dt;
      if (d.m.position.y > -.05) { d.v.y -= 9.8 * dt; d.m.position.addScaledVector(d.v, dt); d.m.rotation.x += d.w.x * dt; d.m.rotation.y += d.w.y * dt; d.m.rotation.z += d.w.z * dt;
        if (d.m.position.y < 0 && d.v.y < 0) { d.v.multiplyScalar(.12); d.v.y = 0; d.w.multiplyScalar(.15); d.m.position.y = 0; if (rand() < .4) CS.fx.rings.emit(d.m.position.x, d.m.position.z, .8, 1.2); } }
      else { d.m.position.addScaledVector(d.v, dt); d.m.rotation.y += d.w.y * dt; }
      if (d.t > d.life - 1) d.m.position.y -= dt * .6;   /* a végén elmerül */
    });
  }
  /* a csata egy képkockája (a mozgatás előtt) */
  function battleTick(A, dt) {
    const B = bfx(), V = A.V, vp = A.vp, P = A.P, t = A.t, st = A.style, vt = V.body, dir = A.dir, nrm = V3(-dir.z, 0, dir.x);
    const burn = (rate, h) => { if (rand() < dt * rate) CS.fx.fire.emit(V3(V.g.position.x + rr(-1.4, 1.4), rr(.4, h || V.dim[1] * .8) + vt.position.y, V.g.position.z + rr(-1.4, 1.4)), V3(rr(-.3, .3), rr(1.5, 3.5), rr(-.3, .3)), rr(1, 2.4), rr(.4, .8));
      if (rand() < dt * rate * .3) CS.fx.dsmoke.emit(V3(V.g.position.x + rr(-1, 1), V.dim[1] * .7 + vt.position.y, V.g.position.z + rr(-1, 1)), V3(rr(-.3, .3), rr(1.5, 3), rr(-.3, .3)), rr(1.4, 2.4)); };
    const bubbles = (rate) => { if (rand() < dt * rate) CS.fx.rings.emit(V.g.position.x + rr(-2.5, 2.5), V.g.position.z + rr(-2.5, 2.5), rr(1, 2.6), 1.8); if (rand() < dt * rate * 1.5) CS.fx.spray.emit(V3(V.g.position.x + rr(-1.5, 1.5), .2, V.g.position.z + rr(-1.5, 1.5)), V3(rr(-.5, .5), rr(1.5, 3.5), rr(-.5, .5)), rr(.3, .6), .8); };
    const sinkOnce = () => { if (!A.ssnd) { A.ssnd = 1; snd("sink"); } };
    /* a megtámadott a csata elején riadtan billeg */
    const alarm = (k) => { vt.rotation.z = Math.sin(t * 11) * .07 * k; };

    if (st === "ram") {
      if (!A.hit) {
        alarm(clamp(t / 1.5, 0, 1));
        if (t > A.tSail && rand() < dt * 35) { const fwd = P.g.position.clone().addScaledVector(dir, P.dim[2] * .5); CS.fx.spray.emit(V3(fwd.x + rr(-.5, .5), .3, fwd.z + rr(-.5, .5)), V3(nrm.x * rr(-3, 3) + dir.x * 2, rr(2, 4.5), nrm.z * rr(-3, 3) + dir.z * 2), rr(.4, .8), .9); }
        const d = Math.hypot(P.g.position.x - vp.x, P.g.position.z - vp.z);
        if (t > A.tSail + .2 && d < (P.dim[2] + V.dim[2]) * .3 + .8) {
          A.hit = t; A.tSink = t + .9; A.tGone = t + 4.4; A.side = V.sinkRoll;
          const c = vp.clone().addScaledVector(dir, -V.dim[2] * .3).setY(V.dim[1] * .3);
          debris(c, 16, 6, 7); CS.fx.flash.emit(c, V3(0, 0, 0), 5, .3); splashAt(c, true); geyser(c, 7); snd("hit", 1.2); snd("boom", .5);
        }
      } else {
        const k1 = clamp((t - A.hit) / 1.2, 0, 1), k2 = clamp((t - A.tSink) / (A.tGone - A.tSink - .2), 0, 1), s = A.side;
        V.g.position.copy(vp).addScaledVector(nrm, s * smooth(k1) * SQ * .7).addScaledVector(dir, smooth(k1) * 2.4);
        vt.rotation.set(-Math.pow(k2, .8) * 1.15, 0, s * (Math.sin(k1 * Math.PI) * .55 + k2 * .35), "YXZ");
        vt.position.y = -Math.pow(k2, 1.7) * (V.dim[1] + 4) + (1 - k2) * Math.sin(k1 * Math.PI) * .4;
        if (k1 < 1 && rand() < dt * 30) CS.fx.spray.emit(V3(V.g.position.x + rr(-1.5, 1.5), .3, V.g.position.z + rr(-1.5, 1.5)), V3(nrm.x * s * rr(2, 5), rr(2, 5), nrm.z * s * rr(2, 5)), rr(.4, .8), 1);
        if (k2 > 0) { bubbles(10); sinkOnce(); if (rand() < dt * 3) debris(V.g.position.clone().setY(.5), 1, 1.5, 2); }
      }
    } else if (st === "dive") {
      if (!A.landed) alarm(clamp((t - 1.5) / 2, 0, 1));
      if (t > A.tSail && !A.took) { A.took = 1; CS.fx.rings.emit(A.ap.x, A.ap.z, 5, 2.4); CS.fx.rings.emit(A.ap.x, A.ap.z, 3, 1.6); for (let j = 0; j < 18; j++) { const a = rand() * TAU; CS.fx.spray.emit(V3(A.ap.x + Math.cos(a) * 2, .3, A.ap.z + Math.sin(a) * 2), V3(Math.cos(a) * 5, rr(2, 5), Math.sin(a) * 5), rr(.4, .8), 1.2); } }
      if (A.landed) {
        if (!A.crushed) { A.crushed = 1; A.tGone = A.landed + 2.4; geyser(vp, 13); debris(vp.clone().setY(1), 20, 7, 9); snd("hit", 1.2); }
        const k = clamp((t - A.landed) / 2.2, 0, 1); vt.scale.set(1 + k * .25, Math.max(.05, 1 - k * 1.05), 1 + k * .25); vt.position.y = -k * 4.5; vt.rotation.z = V.sinkRoll * k * .7; bubbles(12); sinkOnce();
      }
    } else if (st === "broadside") {
      while (A.shi < A.shots.length && t > A.shots[A.shi].t) {
        const S = A.shots[A.shi++], y = P.yaw, cy = Math.cos(y), sy = Math.sin(y);
        const lx = A.side * P.dim[0] * .5, lz = (-.3 + S.i * .2) * P.dim[2], ly = P.dim[1] * .16;
        const from = P.g.position.clone().add(V3(lx * cy + lz * sy, ly, -lx * sy + lz * cy)), out = V3(A.side * cy, 0, -A.side * sy);
        CS.fx.flash.emit(from, V3(0, 0, 0), 3.5, .22); for (let k = 0; k < 6; k++) CS.fx.smoke.emit(from.clone().add(V3(rr(-.3, .3), rr(0, .4), rr(-.3, .3))), out.clone().multiplyScalar(rr(1.5, 4)).add(V3(0, rr(.3, 1), 0)), rr(1.8, 3));
        snd("boom", .7); P.heel = -A.side * .1;
        const last = S.vol === 2 && S.i === 3;
        if (S.vol === 0) { const to = vp.clone().addScaledVector(nrm, rr(-4.5, 4.5)).addScaledVector(dir, rr(-6, 3)).setY(0); ballTo(from, to, () => geyser(to, rr(7, 11))); }
        else { const to = vp.clone().add(V3(rr(-1.2, 1.2), rr(.6, V.dim[1] * .55), rr(-1.2, 1.2)));
          ballTo(from, to, () => { A.burn = 1; V.kick = 1; CS.fx.flash.emit(to, V3(0, 0, 0), last ? 14 : 5, last ? .5 : .3); debris(to, last ? 26 : 7, last ? 9 : 5, last ? 12 : 6); snd(last ? "boom" : "hit", last ? 1.3 : .9);
            for (let j = 0; j < (last ? 40 : 10); j++) CS.fx.fire.emit(to.clone(), V3(rr(-4, 4), rr(1, last ? 12 : 5), rr(-4, 4)), rr(.8, last ? 3 : 1.6), rr(.4, .9));
            if (last) { for (let j = 0; j < 12; j++) CS.fx.dsmoke.emit(to.clone().add(V3(rr(-1, 1), rr(0, 3), rr(-1, 1))), V3(rr(-.6, .6), rr(2, 5), rr(-.6, .6)), rr(2, 3.5)); splashAt(vp, true); } }); }
      }
      if (P.heel) P.heel *= 1 - Math.min(1, dt * 2.5);
      V.kick = (V.kick || 0) * (1 - Math.min(1, dt * 3));
      if (A.burn) burn(26);
      if (t < A.tSink) vt.rotation.z = V.sinkRoll * V.kick * .3 + Math.sin(t * 2) * .03;
      else { const k = clamp((t - A.tSink) / (A.tGone - A.tSink - .2), 0, 1); vt.rotation.set(Math.sin(t * 1.3) * .1 * k, 0, V.sinkRoll * (.25 + k * 1.1), "YXZ"); vt.position.y = -Math.pow(k, 1.6) * (V.dim[1] + 4); bubbles(10); sinkOnce(); }
    } else if (st === "beam") {
      const lamp = P.g.position.clone().add(V3(0, (P.model.userData.lamp || P.dim[1] * .8) * PSC, 0)), ctr = V3(V.g.position.x, V.dim[1] * .5 + vt.position.y, V.g.position.z);
      const dist = Math.hypot(vp.x - lamp.x, vp.z - lamp.z), u = clamp((t - A.tFire) / (A.tLock - A.tFire), 0, 1);
      let tgt; if (t < A.tLock) { const off = (1 - smooth(u)) * 1.5 * V.sinkRoll, dd = dir.clone().applyAxisAngle(V3(0, 1, 0), off); tgt = A.ap.clone().addScaledVector(dd, dist * (.75 + .25 * u)).setY(.3); } else tgt = ctr;
      const on = clamp((t - A.tFire) / .3, 0, 1), out = clamp((t - A.tSink - .4) / .5, 0, 1), lock = clamp((t - A.tLock) / .6, 0, 1);
      if (P.beam) { const want = Math.atan2(-(tgt.z - lamp.z), tgt.x - lamp.x) - P.g.rotation.y; P.beam.rotation.y += wrapA(want - P.beam.rotation.y) * Math.min(1, dt * 10); }
      B.ray.visible = B.core.visible = on > 0 && out < 1;
      if (B.ray.visible) { const L = lamp.distanceTo(tgt), q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), tgt.clone().sub(lamp).normalize()), fl = 1 + .25 * Math.sin(t * 43) * lock, wd = (1 + lock * 1.3) * fl;
        [B.ray, B.core].forEach((m) => { m.position.copy(lamp); m.quaternion.copy(q); m.scale.set(wd, wd, L); }); B.ray.material.opacity = on * (1 - out) * (.55 + .45 * lock); B.core.material.opacity = lock * (1 - out) * .9;
        if (rand() < dt * 12) CS.fx.flash.emit(lamp, V3(0, 0, 0), 3 + lock * 3, .15);
        if (t < A.tLock && rand() < dt * 25) CS.fx.smoke.emit(tgt.clone().add(V3(rr(-.6, .6), 0, rr(-.6, .6))), V3(0, rr(.8, 1.6), 0), rr(.8, 1.4)); }
      if (lock > 0 && t < A.tSink) { alarm(1); if (!A.bsnd) { A.bsnd = 1; snd("hit", .8); } burn(10 + lock * 30); if (rand() < dt * 30) CS.fx.flash.emit(ctr.clone().add(V3(rr(-1, 1), rr(-1, 1), rr(-1, 1))), V3(0, rr(.5, 2), 0), rr(1.5, 3), .3); if (rand() < dt * 14) CS.fx.smoke.emit(V3(vp.x + rr(-2, 2), .4, vp.z + rr(-2, 2)), V3(0, rr(1.5, 3), 0), rr(1.5, 3)); }
      if (t > A.tSink && !A.boom) { A.boom = 1; CS.fx.flash.emit(ctr, V3(0, 0, 0), 12, .45); debris(ctr, 22, 8, 10); for (let j = 0; j < 36; j++) CS.fx.fire.emit(ctr.clone(), V3(rr(-5, 5), rr(1, 9), rr(-5, 5)), rr(1, 2.6), rr(.4, .9)); snd("boom", 1.2); splashAt(vp, true); }
      if (t > A.tSink) { const kk = clamp((t - A.tSink) / (A.tGone - A.tSink - .2), 0, 1); vt.scale.set(1 + kk * .18, Math.max(.04, 1 - kk * .95), 1 + kk * .18); vt.position.y = -kk * 2; vt.rotation.z = V.sinkRoll * kk * .4; burn(20 * (1 - kk)); if (rand() < dt * 16) CS.fx.smoke.emit(V3(vp.x + rr(-1.5, 1.5), .5, vp.z + rr(-1.5, 1.5)), V3(rr(-.4, .4), rr(2, 4), rr(-.4, .4)), rr(2, 4)); bubbles(6); sinkOnce(); }
    } else if (st === "spout") {
      /* a királynő körül csillámló spirál – varázsol */
      if (t > A.tFire && t < A.tFall && rand() < dt * 30) { const a = t * 6 + rand() * .5, r = 2.2, h = ((t * 4) % 1) * P.dim[1]; CS.fx.flash.emit(V3(A.ap.x + Math.cos(a) * r, h, A.ap.z + Math.sin(a) * r), V3(0, 1.5, 0), rr(.6, 1.2), .6); }
      const w = clamp((t - A.tFire) / 1.2, 0, 1), wout = clamp((t - A.tFall - .3) / .6, 0, 1);
      B.whirl.visible = w > 0 && wout < 1; B.whirl.position.set(vp.x, .32, vp.z); B.whirl.scale.setScalar(.5 + 7 * smooth(w) * (1 - wout)); B.whirl.rotation.y -= dt * (3 + 6 * w); B.whirl.material.opacity = .95 * w * (1 - wout);
      if (w > .3 && t < A.tFall && rand() < dt * 30) { const a = rand() * TAU, r = rr(2, 7); CS.fx.spray.emit(V3(vp.x + Math.cos(a) * r, .3, vp.z + Math.sin(a) * r), V3(-Math.sin(a) * 6, rr(1, 3), Math.cos(a) * 6), rr(.3, .7), .9); }
      const k = clamp((t - A.tFire - .8) / .9, 0, 1), out = clamp((t - A.tFall) / .6, 0, 1);
      B.spout.visible = k > 0 && out < 1; B.spout.position.set(vp.x, 0, vp.z); B.spout.scale.set(.3 + .8 * k, smooth(k) * (1 - out * .95) + .01, .3 + .8 * k); B.spout.rotation.y += dt * 6; B.spout.material.map.offset.y -= dt * 1.6; B.spout.material.opacity = .85 * k * (1 - out);
      if (k > 0 && t < A.tFall && rand() < dt * 45) { const a = rand() * TAU; CS.fx.spray.emit(V3(vp.x + Math.cos(a) * 3, .3, vp.z + Math.sin(a) * 3), V3(-Math.sin(a) * 5, rr(5, 11), Math.cos(a) * 5), rr(.4, .9), 1.2); }
      if (k > 0 && !A.wsnd) { A.wsnd = 1; snd("whoosh"); }
      if (t < A.tLift) alarm(w);
      const lift = clamp((t - A.tLift) / 1.5, 0, 1), fall = clamp((t - A.tFall) / .55, 0, 1);
      if (t > A.tLift && t < A.tFall + .55) { V.yaw += dt * (3 + lift * 11); vt.position.y = smooth(lift) * 17 * (1 - fall * fall); vt.rotation.set(Math.sin(t * 3) * .55 * lift, 0, Math.cos(t * 2.4) * .65 * lift, "YXZ"); }
      if (fall >= 1 && !A.splashed) { A.splashed = 1; geyser(vp, 14); splashAt(vp, true); debris(vp.clone().setY(.5), 22, 7, 8); snd("hit", 1.2); }
      if (t > A.tSink) { const kk = clamp((t - A.tSink) / (A.tGone - A.tSink - .1), 0, 1); vt.position.y = -2 - kk * (V.dim[1] + 3); vt.rotation.z = V.sinkRoll * (.6 + kk * .6); bubbles(14); sinkOnce(); }
    } else if (st === "storm") {
      const cf = clamp((t - A.tFire) / .9, 0, 1) * (1 - clamp((t - A.tGone + .6) / .6, 0, 1));
      [B.cloud, B.cloud2].forEach((c, i) => { c.visible = cf > 0; c.position.set(vp.x + (i ? 6 : 0), 32 + i * 2.5, vp.z + (i ? -4 : 0)); c.rotation.y += dt * (i ? -.25 : .18); c.material.opacity = (i ? .7 : .85) * cf; });
      /* eső */
      const rain = clamp((t - A.tFire - .5) / .6, 0, 1) * (1 - clamp((t - A.tGone + .8) / .6, 0, 1)); B.rain.visible = rain > 0; B.rain.material.opacity = .55 * rain;
      if (B.rain.visible) { const a = B.rain.geometry.attributes.position.array; B.rainD.forEach((d, i) => { d[1] -= dt * 28; if (d[1] < 0) { d[1] += 30; d[0] = rr(-14, 14); d[2] = rr(-14, 14); if (rand() < .25) CS.fx.rings.emit(vp.x + d[0], vp.z + d[2], .5, .6); }
        a.set([vp.x + d[0], d[1], vp.z + d[2], vp.x + d[0] + .25, d[1] + 1.3, vp.z + d[2] + .1], i * 6); }); B.rain.geometry.attributes.position.needsUpdate = true; }
      if (t > A.tFire && t < A.tSink) alarm(1);
      if (A.si < A.strikes.length && t > A.strikes[A.si]) { A.si++; A.boltT = .18; A.burn = 1; const top = V3(vp.x + rr(-5, 5), 32, vp.z + rr(-5, 5)), end = vp.clone().add(V3(rr(-.6, .6), V.dim[1] * rr(.5, .85), rr(-.6, .6)));
        setGeo(B.bolt, boltGeo(top, end, 14, 2.4, .12)); setGeo(B.boltG, boltGeo(top, end, 10, 3.2, .5)); CS.fx.flash.emit(end, V3(0, 0, 0), 9, .3); CS.fx.flash.emit(top, V3(0, 0, 0), 16, .25); snd("boom", 1); V.kick = 1;
        for (let j = 0; j < 14; j++) CS.fx.fire.emit(end.clone(), V3(rr(-5, 5), rr(0, 6), rr(-5, 5)), rr(.4, 1), rr(.3, .6)); if (A.si >= 3) debris(end, 5, 5, 6); }
      if (A.boltT > 0) { A.boltT -= dt; B.bolt.visible = B.boltG.visible = (A.boltT * 30 | 0) % 2 === 0; } else B.bolt.visible = B.boltG.visible = false;
      V.kick = (V.kick || 0) * (1 - Math.min(1, dt * 4)); if (A.burn) burn(14);
      /* a kraken: hat csáp kinyúlik, körbefonja, és a mélybe húzza; alatta örvény */
      const kt = clamp((t - A.tSink + .4) / 1.1, 0, 1), down = clamp((t - A.tSink - 1.0) / (A.tGone - A.tSink - 1.2), 0, 1);
      B.tent.forEach((m, i) => { const a = i / B.tent.length * TAU + .4, base = V3(vp.x + Math.cos(a) * 5, 0, vp.z + Math.sin(a) * 5), top = V3(vp.x + Math.cos(a + 1.2) * 1.0, V.dim[1] * (.8 - down * .95) + 1.5 + Math.sin(t * 3 + i) * .4, vp.z + Math.sin(a + 1.2) * 1.0);
        m.visible = kt > 0 && t < A.tGone + .2; if (m.visible) setGeo(m, tentGeo(base, top, 3.2 + i * .35, .12 + .88 * smooth(clamp(kt * 1.3 - i * .06, 0, 1)), a + t * 1.5)); });
      B.whirl.visible = down > 0; if (down > 0) { B.whirl.position.set(vp.x, .32, vp.z); B.whirl.scale.setScalar(2 + 5 * down); B.whirl.rotation.y -= dt * 7; B.whirl.material.opacity = .9 * Math.min(1, down * 3) * (1 - clamp((t - A.tGone + .3) / .3, 0, 1)); }
      if (kt > 0 && !A.ksnd) { A.ksnd = 1; geyser(vp, 9); snd("hit", .9); }
      if (t < A.tSink) vt.rotation.z = V.sinkRoll * V.kick * .25 + Math.sin(t * 11) * .07;
      if (down > 0) { V.yaw += dt * 2.5; vt.position.y = -Math.pow(down, 1.4) * (V.dim[1] + 4); vt.rotation.z = Math.sin(t * 7) * .22; bubbles(16); sinkOnce(); }
    }
    if (V.g.parent) V.g.rotation.y = V.yaw;
    if (t > A.tGone && V.g.parent) dropPiece(V);
  }
  /* a mozgatás után: a hattyú repülési pályája (felszállás – körözés – zuhanórepülés) */
  function battlePost(A, dt) {
    if (A.style !== "dive") return;
    const M = A.movers[0], P = A.P, k = (A.t - A.tSail) / M.dur; if (k <= 0 || k >= 1 || M.done) return;
    const H = A.leapH, nrm = V3(-A.dir.z, 0, A.dir.x);
    let hz, y, lean;
    if (k < .6) { const u = k / .6; hz = .5 * smooth(u); y = H * Math.sin(u * Math.PI / 2); lean = -.35 * (1 - u); }
    else if (k < .78) { const u = (k - .6) / .18; hz = .5 + .06 * u; y = H + Math.sin(u * Math.PI) * 1.2; lean = .1 * u; }
    else { const u = (k - .78) / .22; hz = .56 + .44 * Math.pow(u, 1.25); y = H * (1 - u * u); lean = .25 + .6 * u; }
    const circ = k > .5 && k < .82 ? Math.sin((k - .5) / .32 * Math.PI) * 3.5 : 0;
    const p = A.ap.clone().lerp(A.vp, hz).addScaledVector(nrm, circ);
    P.g.position.set(p.x, y, p.z);
    const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), lx = A.dir.x * cy - A.dir.z * sy, lz = A.dir.x * sy + A.dir.z * cy;
    P.pitch = lz * lean; P.heel = -lx * lean + circ * .06;   /* körözés közben bedől */
    if (rand() < dt * 8) CS.fx.spray.emit(p.clone().add(V3(rr(-1, 1), y + rr(0, 2), rr(-1, 1))), V3(rr(-.4, .4), -rr(.5, 1.5), rr(-.4, .4)), rr(.25, .45), 1.4);
    if (k > .78 && !A.dsnd) { A.dsnd = 1; snd("whoosh", 1.2); }
  }
  function battleEnd() {
    const B = CS.bfx; if (!B) return;
    B.whirl.visible = B.ray.visible = B.core.visible = B.spout.visible = B.bolt.visible = B.boltG.visible = B.cloud.visible = B.cloud2.visible = B.rain.visible = false; B.tent.forEach((m) => { m.visible = false; });
  }

  /* ------------------------------------------------------------ CSATAKAMERA: a kép a csata közelébe repül, majd vissza.
     2D-ben sima (1,3 s) repülés; VR-ben elsötétülés közben ugrik (nem szédít). Kikapcsolható („🎬 Csatakamera”). */
  function cineOn() { if (CS.cineOff == null) { try { CS.cineOff = localStorage.getItem("zephyr-sakk-kamera") === "0"; } catch (e) { CS.cineOff = false; } } return !CS.cineOff; }
  function toggleCine() { cineOn(); CS.cineOff = !CS.cineOff; try { localStorage.setItem("zephyr-sakk-kamera", CS.cineOff ? "0" : "1"); } catch (e) {} W.panelDirty = 1; }
  /* stílusonként: [távolság, magasság, a nézett pont magassága] */
  const CINE = { ram: [12, 4.5, 2], dive: [22, 5, 9], broadside: [16, 5, 2.5], beam: [17, 6, 3.5], spout: [20, 4, 8], storm: [21, 5, 6] };
  function cineStart(A) {
    if (!cineOn() || CS.orbit || CS.fade || !W.root || !CS.env) return;
    if (CS.cine) { CS.cine.A = A; CS.cine.ph = "hold"; return; }   /* gyors egymásutánban: marad közel */
    const root = W.root, hw = headWorld(new THREE.Vector3()), eye = CS.env.worldToLocal(hw.clone()), [D, H, fy] = CINE[A.style];
    /* oldalnézet: a kamera a támadás vonalára merőlegesen, a néző felőli oldalon, kicsit a támadó mögött áll –
       így mindkét figura látszik, és semmi (golyó, fénysugár, füst) nem repül a kamerába */
    const span = Math.hypot(A.vp.x - A.ap.x, A.vp.z - A.ap.z), F = A.vp.clone().multiplyScalar(.62).add(A.ap.clone().multiplyScalar(.38)); F.y = fy;
    const Dd = Math.max(D, span * .62);
    if (Math.hypot(eye.x - F.x, eye.z - F.z) < Dd * 1.1) return;   /* már közel vagy: nem kell */
    const nrm = V3(-A.dir.z, 0, A.dir.x); if (nrm.x * (eye.x - F.x) + nrm.z * (eye.z - F.z) < 0) nrm.negate();
    const away = nrm.clone().addScaledVector(A.dir, -.38).normalize();
    const p = F.clone().addScaledVector(away, Dd); p.y = H;
    const psi = T.camYaw ? T.camYaw() : 0, envYaw = Math.atan2(p.x - F.x, p.z - F.z), r = psi - envYaw, q = p.clone().applyAxisAngle(V3(0, 1, 0), r), vr = !!T.inVR, lift = inVRSeat() ? .45 : 0;
    const C = { A, t: 0, ph: "in", vr, r0: root.rotation.y, p0: root.position.clone() };
    C.r1 = C.r0 + wrapA(r - C.r0); C.p1 = V3(-q.x + (vr ? hw.x : 0), vr ? -p.y - lift : -(p.y + 1.62), -q.z + (vr ? hw.z : 0));
    const lc = !vr && T.cam.components["look-controls"]; if (lc && lc.pitchObject) { C.lc = lc; C.pitch0 = lc.pitchObject.rotation.x; C.pitch1 = -Math.atan2(H + 1.62 - fy, Dd); }
    CS.cine = C;
    if (vr) CS.fade = { t: 0, run: () => cineSet(C, 1), done: false };
  }
  function cineSet(C, s) {
    const root = W.root; if (!root) return;
    root.rotation.set(0, C.r0 + (C.r1 - C.r0) * s, 0); root.position.lerpVectors(C.p0, C.p1, s); root.updateMatrixWorld(true);
    if (C.lc && C.pitch0 != null) C.lc.pitchObject.rotation.x = C.pitch0 + (C.pitch1 - C.pitch0) * s;
  }
  function cineTick(dt) {
    const C = CS.cine; if (!C) return; C.t += dt;
    if (C.ph === "in") { if (!C.vr) cineSet(C, smooth(clamp(C.t / 1.3, 0, 1))); if (C.t >= 1.3) C.ph = "hold"; }
    const A = C.A, over = CS.anim !== A || A.t > A.tGone + .4;
    if (C.ph === "hold" && over) { C.ph = "out"; C.t0 = C.t; if (C.vr) CS.fade = { t: 0, run: () => cineSet(C, 0), done: false }; }
    if (C.ph === "out") { const k = (C.t - C.t0) / 1.5; if (!C.vr) cineSet(C, 1 - smooth(clamp(k, 0, 1))); if (k >= 1) CS.cine = null; }
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
