  /* =====================================================================================================
     VR-SAKK – „ZEPHYR TENGERÉSZETI” FIGURAKÉSZLET (2026. nov. 9.)
     A tulajdonos képe („Zephyr Apartman · Zamárdi · Balaton” sakk-készlet) alapján, a ChatGPT-vel közösen:
     a ChatGPT négynézetes tervlapot (szemből, oldalról, hátulról, felülről) és szöveges műszaki leírást készített
     (arányok: király = 100 egység; színek hexa kóddal; anyagok, díszítések helye) – ebből épül a 3D-modell.
       gyalog = kis vitorlás „Zephyr” felirattal és vitorlás-emblémával (48)
       bástya = piros–fehér (sötétben tengerkék–elefántcsont) világítótorony arany talapzaton (60)
       huszár = hattyú díszcsónakban, tollanként rétegzett szárnyakkal (68)
       futó   = háromárbócos vitorlás, ágyúnyílásokkal, horgonyos vitorlákkal (78)
       vezér  = koronás királynő hosszú szőke hajjal, arany csónakban (90)
       király = szakállas kapitány háromszögletű kalapban, távcsővel, aranyhajóban oroszlánfejekkel (100)
     VILÁGOS készlet: elefántcsont, fehér és arany · SÖTÉT készlet: tengerkék és arany – a forma mindkettőben azonos.
     Az orr / az arc −z felé néz. A király és a vezér is hajón ül, ezért (a régi figurákkal szemben) nyomhullámot húz.
     ===================================================================================================== */
  const ZU = .14;   /* 1 tervegység méterben – a király így 14 m magas (a makePiece még PSC-vel szoroz) */
  const ZC = {
    gold: "#D4A13A", gold2: "#B98226", skin: "#E8C4A5", hair: "#D9A23B", beak: "#C85A27", glow: "#F6C75E",
    w: { hull: "#F3E8CF", deck: "#FFF9ED", sail: "#FFF9ED", accent: "#1d4775", seam: "#d9cdb0", swan: "#FFF9ED", wing: "#F3E8CF", dress: "#FFF9ED", bodice: "#F3E8CF", coat: "#173F68", legs: "#F3E8CF", lhA: "#B83228", lhB: "#FFF9ED", roof: "#B83228", txt: "#14315a" },
    b: { hull: "#102D50", deck: "#163E65", sail: "#123B65", accent: "#efe6d2", seam: "#0b2746", swan: "#153E65", wing: "#1A4C77", dress: "#173F68", bodice: "#123B65", coat: "#102D50", legs: "#123B65", lhA: "#123B65", lhB: "#E9E2D3", roof: "#123B65", txt: "#f1e3bf" }
  };
  /* anyagok: csiszolt arany (fém), fényes zománc (lakkréteggel), matt festék, selyemfényű, izzó lámpa */
  function zMats() {
    if (CS.zMat) return CS.zMat;
    const g = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 1, roughness: .24, envMapIntensity: 1.3 });
    const e = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, metalness: 0, roughness: .26, clearcoat: .9, clearcoatRoughness: .08, side: THREE.DoubleSide });
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .72 });
    const s = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .45 });
    const l = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, emissive: 0xffc860, emissiveIntensity: 2.2, roughness: .3 });
    W.disposables.push(g, e, m, s, l);
    return (CS.zMat = { g, e, m, s, l });
  }
  /* részek: [geometria, anyagkulcs, mátrix, szín] → anyagonként egyetlen háló (kevés rajzhívás a Questen) */
  function zMesh(parts, parent) {
    const by = {}, M = zMats();
    parts.forEach(([geo, key, m4, tint]) => { geo = geo.index ? geo : geo; const col = new THREE.Color(tint || (key === "g" ? ZC.gold : "#ffffff")), n = geo.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } geo.setAttribute("color", new THREE.BufferAttribute(a, 3)); (by[key] = by[key] || []).push([geo, m4 || new THREE.Matrix4()]); });
    Object.keys(by).forEach((k) => { const ms = new THREE.Mesh(mergeGeoms(by[k]), M[k]); ms.castShadow = k !== "l"; ms.receiveShadow = true; parent.add(ms); });
  }
  const ZS = (r, w, h) => new THREE.SphereGeometry(r, w || 18, h || 14);
  const ZE = (x, y, z, rx, ry, rz, ax, ay, az) => M4(x, y, z, ay || 0, ax || 0, az || 0, rx, ry, rz);   /* ellipszoid: méret (rx, ry, rz) + forgatás */
  const ZT = (pts, r, seg) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg || 32, r, 6, false);
  const ZL = (pts, seg, ps, pl) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg || 36, ps || 0, pl || TAU);

  /* ------------------------------------------------------------ DÍSZHAJÓTEST (minden figura hajója)
     u = 0 a tat (+z), u = 1 az orr (−z); a szelvény U alakú, a vége felhajlik, a tatnál széles tükör. */
  function zBoat(o) {
    const L = o.L, B = o.B, D = o.D, rise = o.rise == null ? .35 * D : o.rise, tr = o.tr == null ? .42 : o.tr, NU = 56, NV = 22;
    const z = (u) => (.5 - u) * L;
    const w = (u) => B / 2 * Math.max(.015, Math.pow(Math.sin(Math.PI * Math.min(1, u * (1 - tr * .5) + tr * .5)), .62));
    const ys = (u) => D + rise * Math.pow(Math.abs(2 * u - 1), 2.4) * (u > .5 ? 1.25 : 1);
    const yb = (u) => D * .03 + D * .3 * Math.pow(Math.abs(2 * u - 1), 3);
    const pt = (u, v) => { const a = (v - .5) * Math.PI; return [w(u) * Math.sin(a), ys(u) - (ys(u) - yb(u)) * Math.pow(Math.cos(a), .55), z(u)]; };
    const pos = [], idx = [];
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) pos.push(...pt(i / NU, j / NV));
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    /* tattükör (fan) */
    const c0 = pos.length / 3; pos.push(0, (ys(0) + yb(0)) / 2, z(0)); for (let j = 0; j < NV; j++) idx.push(c0, j + 1, j);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    /* görbék a díszítéshez: perem (mindkét oldal), sáv a perem alatt f arányban, gerinc */
    const at = (u, f) => { const c = Math.pow(Math.max(0, f), 1 / .55), a = Math.acos(Math.min(1, c)); return [w(u) * Math.sin(a), ys(u) - (ys(u) - yb(u)) * f, z(u)]; };
    const rim = (dy, sc) => { const P = []; for (let k = 0; k <= 40; k++) { const u = .005 + k / 40 * .99; P.push(V3(-w(u) * (sc || 1), ys(u) + (dy || 0), z(u))); } for (let k = 40; k >= 0; k--) { const u = .005 + k / 40 * .99; P.push(V3(w(u) * (sc || 1), ys(u) + (dy || 0), z(u))); } return P; };
    const band = (sd, f, u0, u1, wav) => { const P = []; for (let k = 0; k <= 48; k++) { const u = (u0 == null ? .04 : u0) + k / 48 * ((u1 == null ? .93 : u1) - (u0 == null ? .04 : u0)); const p = at(u, f + (wav ? wav[0] * Math.sin(u * wav[1]) : 0)); P.push(V3(sd * p[0] * 1.012, p[1], p[2])); } return P; };
    const keel = () => { const P = []; for (let k = 0; k <= 30; k++) { const u = .02 + k / 30 * .96; P.push(V3(0, yb(u) - .15, z(u))); } return P; };
    const deck = (h, sc) => { const sh = new THREE.Shape(); for (let k = 0; k <= 30; k++) { const u = .01 + k / 30 * .98; const x = -w(u) * (sc || .97); k ? sh.lineTo(x, -z(u)) : sh.moveTo(x, -z(u)); } for (let k = 30; k >= 0; k--) { const u = .01 + k / 30 * .98; sh.lineTo(w(u) * (sc || .97), -z(u)); }
      const g = new THREE.ShapeGeometry(sh, 4); g.rotateX(-Math.PI / 2); g.translate(0, h, 0); return g; };
    return { geo, z, w, ys, yb, at, rim, band, keel, deck, L, B, D };
  }
  /* aranyozott oroszlánfej (orrdísz): sörény-korona, pofa, orr, szemek, fülek – az arc a dir irányba néz */
  function zLion(L, x, y, z, s, dir) {
    const ry = dir > 0 ? Math.PI : 0, R = (dx, dy, dz) => { const v = V3(dx, dy, dz).applyAxisAngle(V3(0, 1, 0), ry); return [x + v.x * s, y + v.y * s, z + v.z * s]; };
    L.push([ZS(1, 16, 12), "g", ZE(...R(0, 0, 0), 1.25 * s, 1.25 * s, .8 * s)]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; L.push([new THREE.ConeGeometry(.42 * s, 1.2 * s, 6), "g", M4(...R(Math.cos(a) * 1.15, Math.sin(a) * 1.15, .05), ry, Math.PI / 2 * 0, 0).multiply(new THREE.Matrix4().makeRotationZ(a - Math.PI / 2))]); }
    L.push([ZS(1, 14, 10), "g", ZE(...R(0, -.05, -.55), .78 * s, .82 * s, .62 * s)], [ZS(1, 12, 8), "g", ZE(...R(0, -.35, -1.05), .42 * s, .32 * s, .35 * s)], [ZS(1, 10, 8), "g", ZE(...R(0, -.72, -.85), .34 * s, .2 * s, .3 * s)]);
    [-1, 1].forEach((sd) => { L.push([ZS(.14 * s, 8, 6), "e", M4(...R(sd * .3, .2, -1.08)), "#3a2a10"], [ZS(1, 8, 6), "g", ZE(...R(sd * .62, .72, -.35), .26 * s, .3 * s, .14 * s)]); });
  }
  /* aranyozott csigavonal-díszsor a hajó oldalán: hullámzó cső + spirálvégek */
  function zScrolls(L, B, sd, f, u0, u1, n, amp, r) {
    L.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(B.band(sd, f, u0, u1, [amp, n * TAU])), 160, r, 5, false), "g"]);
    for (let k = 0; k < n; k++) { const u = u0 + (k + .5) / n * (u1 - u0), p = B.at(u, f), cx = sd * p[0] * 1.02, pts = [];
      for (let t = 0; t <= 20; t++) { const a = t / 20 * TAU * 1.4, rr2 = (1 - t / 22) * amp * B.D * 1.1; pts.push(V3(cx + sd * .02, p[1] + Math.sin(a) * rr2, p[2] + Math.cos(a) * rr2)); }
      L.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r * .8, 4, false), "g"]); }
  }
  /* a hajótest teljes „öltöztetése”: zománctest, aranyperem, gerinc, díszsávok, horgonyok, orrdísz */
  function zDressBoat(L, B, c, o) {
    const P = ZC[c]; o = o || {};
    L.push([B.geo, o.goldHull ? "g" : "e", null, o.goldHull ? ZC.gold : P.hull]);
    L.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(B.rim(.12), true), 220, B.D * .07, 6, true), "g"]);
    L.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(B.keel()), 60, B.D * .05, 6, false), "g"]);
    if (o.deck != null) L.push([B.deck(o.deck, .95), "s", null, o.deckCol || P.deck]);
    [-1, 1].forEach((sd) => {
      if (o.goldHull) { L.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(B.band(sd, .42, .06, .9)), 120, B.D * .11, 6, false), "e", null, P.hull === ZC.w.hull ? "#173F68" : "#102D50"]); zScrolls(L, B, sd, .42, .1, .86, 6, .05, B.D * .025); }
      else { L.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(B.band(sd, .22, .03, .95)), 120, B.D * .03, 5, false), "g"], [new THREE.TubeGeometry(new THREE.CatmullRomCurve3(B.band(sd, .5, .05, .92)), 120, B.D * .045, 5, false), "e", null, P.accent]);
        if (o.scrolls) zScrolls(L, B, sd, .5, .1, .88, o.scrolls, .045, B.D * .022);
        else L.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(B.band(sd, .36, .05, .93)), 120, B.D * .022, 5, false), "g"]); }
      if (o.anchors !== false) { const p = B.at(.45, .62), an = anchorGeo(B.D * .32); L.push([an, "g", M4(sd * p[0] * 1.03, p[1], p[2], sd * Math.PI / 2)]); }
    });
    if (o.lion !== false) zLion(L, 0, B.ys(1) - B.D * .25, B.z(1) + B.D * .05, B.D * .17, -1);
    if (o.sternLion) zLion(L, 0, B.ys(0) - B.D * .3, B.z(0) + B.D * .02, B.D * .2, 1);
  }
  /* vitorla-textúra: varrások, szegély; opcionálisan „Zephyr” felirat embléma-vitorlással vagy arany horgony */
  function zSailTex(c, kind, flip) {
    const k = "zst" + c + kind + (flip ? "f" : ""); if (CS[k]) return CS[k];
    const P = ZC[c];
    const t = canvasTex(512, 512, (g, w, h) => {
      if (flip) { g.translate(w, 0); g.scale(-1, 1); }
      g.fillStyle = P.sail; g.fillRect(0, 0, w, h);
      g.strokeStyle = P.seam; g.lineWidth = 3; for (let y = 40; y < h; y += 56) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      if (kind === "zephyr") {
        /* embléma: kis vitorlás a hullámon, alatta a felirat (a tulajdonos képe szerint) */
        const cx = w * .4, cy = h * .58; g.fillStyle = c === "w" ? "#1d4775" : "#D4A13A";
        g.beginPath(); g.moveTo(cx - 70, cy - 8); g.quadraticCurveTo(cx, cy + 22, cx + 70, cy - 8); g.lineTo(cx + 54, cy + 8); g.quadraticCurveTo(cx, cy + 34, cx - 54, cy + 8); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(cx - 6, cy - 14); g.lineTo(cx - 6, cy - 120); g.lineTo(cx - 62, cy - 16); g.closePath(); g.fill(); g.beginPath(); g.moveTo(cx + 4, cy - 14); g.lineTo(cx + 4, cy - 104); g.lineTo(cx + 46, cy - 16); g.closePath(); g.fill();
        g.font = "italic bold 96px Georgia, 'Times New Roman', serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = P.txt;
        g.lineWidth = 8; g.strokeStyle = c === "w" ? "rgba(255,255,255,.7)" : "rgba(0,0,0,.35)"; g.strokeText("Zephyr", cx + 6, cy + 96); g.fillText("Zephyr", cx + 6, cy + 96);
        g.fillStyle = "#D4A13A"; g.fillRect(cx - 120, cy + 150, 250, 8);
      }
      if (kind === "anchor") { g.save(); g.translate(w / 2, h * .5); g.fillStyle = "#D4A13A"; g.strokeStyle = "#8a6420"; g.lineWidth = 4;
        g.beginPath(); g.arc(0, -120, 28, 0, TAU); g.lineWidth = 16; g.strokeStyle = "#D4A13A"; g.stroke(); g.fillRect(-12, -96, 24, 230); g.fillRect(-80, -70, 160, 22);
        g.beginPath(); g.moveTo(-130, 40); g.quadraticCurveTo(-110, 150, 0, 150); g.quadraticCurveTo(110, 150, 130, 40); g.lineWidth = 22; g.stroke();
        [[-130, 40, -1], [130, 40, 1]].forEach(([x, y, s]) => { g.beginPath(); g.moveTo(x - 26 * s, y + 10); g.lineTo(x + 6 * s, y - 34); g.lineTo(x + 26 * s, y + 18); g.closePath(); g.fill(); }); g.restore(); }
      g.strokeStyle = c === "w" ? "#D4A13A" : "#D4A13A"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    });
    t.colorSpace = THREE.SRGBColorSpace; return (CS[k] = t);
  }
  function zSailMat(c, kind, flip) {
    const k = "zsm" + c + kind + (flip ? "f" : ""); if (CS[k]) return CS[k];
    const m = new THREE.MeshStandardMaterial({ map: zSailTex(c, kind, flip), roughness: .85, side: flip ? THREE.BackSide : THREE.FrontSide }); W.disposables.push(m); return (CS[k] = m);
  }
  /* kétoldalas vitorla: elöl és hátul is olvasható felirat (külön tükrözött textúra a hátoldalon) */
  function zSail(G, geo, c, kind) { const a = new THREE.Mesh(geo, zSailMat(c, kind)), b = new THREE.Mesh(geo, zSailMat(c, kind, true)); a.castShadow = true; G.add(a, b); W.disposables.push(geo); return a; }
  /* háromszög-vitorla: A = alsó első sarok, B = alsó hátsó (vagy első) sarok, C = csúcs; oldalra dagad */
  function zTri(A, B, C, bulge) {
    const nu = 12, pos = [], uv = [], idx = [], row = []; let n = 0;
    for (let j = 0; j <= nu; j++) { row[j] = n; for (let i = 0; i <= nu - j; i++) { const u = i / nu, v = j / nu, k = 27 * u * v * Math.max(0, 1 - u - v) * .55 + Math.sin(Math.PI * Math.min(1, u + v)) * .45 * (1 - v);
        pos.push(A.x + (B.x - A.x) * u + (C.x - A.x) * v + bulge * k, A.y + (B.y - A.y) * u + (C.y - A.y) * v, A.z + (B.z - A.z) * u + (C.z - A.z) * v); uv.push(u + v * .02, v); n++; } }
    for (let j = 0; j < nu; j++) for (let i = 0; i < nu - j; i++) { const a = row[j] + i, b = a + 1, cc = row[j + 1] + i; idx.push(a, b, cc); if (i < nu - j - 1) idx.push(b, row[j + 1] + i + 1, cc); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  /* keresztvitorla (a vitorlarúdról lóg, előre dagad) */
  function zSq(wTop, wBot, h, bulge) {
    const g = new THREE.PlaneGeometry(1, h, 12, 10), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const yy = p.getY(i) / (h / 2), sc = lerp(wBot, wTop, (yy + 1) / 2), x = p.getX(i) * sc, xx = x / (sc / 2); p.setX(i, x); p.setZ(i, -bulge * (1 - xx * xx) * (1 - .3 * yy * yy)); }
    g.computeVertexNormals(); return g;
  }
  const zWrap = (G, inner, dimU) => { inner.scale.setScalar(ZU); G.add(inner); G.userData.dim = dimU.map((v) => v * ZU); return G; };

  /* ------------------------------------------------------------ GYALOG: kis vitorlás „Zephyr” vitorlával (48 egység) */
  function zPawn(c) {
    const G = new THREE.Group(), I = new THREE.Group(), L = [], P = ZC[c];
    const B = zBoat({ L: 34, B: 17, D: 8, rise: 2.6 });
    zDressBoat(L, B, c, { deck: 7.2, scrolls: 0 });
    /* árboc, bumm, kötélzet (arany), orrdísz-csiga, kis kormányrúd */
    const mz = -2.5; L.push([new THREE.CylinderGeometry(.42, .62, 40, 12), "g", M4(0, 27, mz)], [ZS(.9, 10, 8), "g", M4(0, 47.2, mz)]);
    L.push([new THREE.CylinderGeometry(.35, .35, 15.5, 10).rotateX(Math.PI / 2), "g", M4(0, 11, mz + 7.6)], [ZS(.55, 8, 6), "g", M4(0, 11, mz)]);
    L.push([ZT([V3(0, 9, B.z(.02) + .5), V3(0, 13.5, B.z(.02) - .6), V3(0, 13, B.z(.02) - 2.2)], .35), "g"]);
    L.push([ZT([V3(0, 7.6, -14.5), V3(0, 9.4, -17.6), V3(0, 11.2, -17.9)], .45), "g"]);
    zMesh(L, I);
    rigLines([[V3(0, 46, mz), V3(0, 9.6, -17.2)], [V3(0, 46, mz), V3(0, 9.2, B.z(.02))], [V3(0, 40, mz), V3(-7.8, 8.3, mz + 1)], [V3(0, 40, mz), V3(7.8, 8.3, mz + 1)]], I, ZC.gold2);
    /* fővitorla „Zephyr” felirattal és emblémával – két oldalról olvasható; orrvitorla */
    zSail(I, zTri(V3(.15, 11.6, mz + .7), V3(.15, 11.4, mz + 15.2), V3(.15, 45.6, mz + .6), 1.6), c, "zephyr");
    zSail(I, zTri(V3(.1, 10, mz - 1.4), V3(.1, 9.8, -15.8), V3(.1, 41, mz - .9), 1.2), c, "plain");
    makePennant(c, 4.2, 1.6, I, 0, 48.4, mz);
    return zWrap(G, I, [17, 48.5, 36]);
  }
  /* ------------------------------------------------------------ BÁSTYA: világítótorony arany talapzaton (60 egység) */
  function zRook(c) {
    const G = new THREE.Group(), I = new THREE.Group(), L = [], P = ZC[c];
    /* talapzat: profilozott aranykorong, palástján horgonyok, tetején korlát */
    L.push([ZL([[0, 0], [12, 0], [12.3, .8], [11.8, 1.4], [11.6, 5.8], [12.2, 6.6], [12, 7.4], [10.6, 8], [0, 8]], 48), "g"]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; L.push([anchorGeo(2.4), "g", M4(Math.sin(a) * 11.85, 3.6, Math.cos(a) * 11.85, a)]); }
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; L.push([new THREE.CylinderGeometry(.18, .18, 2.6, 6), "g", M4(Math.sin(a) * 10.3, 9.3, Math.cos(a) * 10.3)]); }
    L.push([new THREE.TorusGeometry(10.3, .28, 6, 64).rotateX(Math.PI / 2), "g", M4(0, 10.6, 0)], [new THREE.TorusGeometry(10.3, .16, 5, 64).rotateX(Math.PI / 2), "g", M4(0, 9.4, 0)]);
    /* torony: hat sáv (fehér–színes váltakozva), köztük aranygyűrűk */
    const rT = (y) => 6.4 - (y - 8) / 38 * 1.7, Y = [8, 14, 20, 26, 32, 38, 46];
    for (let k = 0; k < 6; k++) { const a = Y[k], b = Y[k + 1]; L.push([ZL([[rT(a), a], [rT(b), b]], 40), "e", null, k % 2 ? P.lhA : P.lhB]); L.push([new THREE.TorusGeometry(rT(a) + .08, .3, 6, 48).rotateX(Math.PI / 2), "g", M4(0, a, 0)]); }
    /* ajtó elöl (−z) arany ívvel és két lámpadísszel, ablakok elöl-hátul */
    L.push([new THREE.BoxGeometry(3.2, 5.6, .6), "e", M4(0, 11.2, -rT(11) - .05), c === "w" ? "#1d4775" : "#0a1d36"], [new THREE.TorusGeometry(1.75, .32, 6, 18, Math.PI), "g", M4(0, 13.9, -rT(14) - .2)]);
    [-1, 1].forEach((sd) => L.push([ZS(.55, 8, 6), "l", M4(sd * 2.6, 12.6, -rT(12.6) - .3), ZC.glow], [new THREE.CylinderGeometry(.2, .2, 1.6, 6), "g", M4(sd * 2.6, 11.4, -rT(11.4) - .25)]));
    [[23, -1], [35, -1], [29, 1], [41, 1]].forEach(([y, s]) => L.push([new THREE.BoxGeometry(1.5, 2.6, .5), "l", M4(0, y, s * (rT(y) + .02)), "#ffe4a0"], [new THREE.BoxGeometry(2.1, .35, .7), "g", M4(0, y - 1.5, s * (rT(y) + .1))]));
    /* galéria (aranyperem, korlát), lámpaház üvegezéssel és bordákkal, kúptető, csúcsdísz */
    L.push([ZL([[0, 45.6], [6.9, 45.6], [7.2, 46.3], [6.9, 47], [0, 47]], 40), "g"]);
    for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; L.push([new THREE.CylinderGeometry(.14, .14, 2.4, 6), "g", M4(Math.sin(a) * 6.6, 48.2, Math.cos(a) * 6.6)]); }
    L.push([new THREE.TorusGeometry(6.6, .22, 5, 56).rotateX(Math.PI / 2), "g", M4(0, 49.4, 0)]);
    L.push([new THREE.CylinderGeometry(3.7, 3.7, 6.6, 24), "l", M4(0, 50.3, 0), ZC.glow]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; L.push([new THREE.BoxGeometry(.32, 6.8, .32), "g", M4(Math.sin(a) * 3.75, 50.3, Math.cos(a) * 3.75)]); }
    L.push([new THREE.TorusGeometry(3.8, .3, 6, 32).rotateX(Math.PI / 2), "g", M4(0, 47.1, 0)], [new THREE.TorusGeometry(3.8, .3, 6, 32).rotateX(Math.PI / 2), "g", M4(0, 53.6, 0)]);
    L.push([ZL([[4.7, 53.6], [4.4, 54.3], [2.2, 56.8], [.7, 58.2], [0, 58.4]], 32), "e", null, P.roof], [new THREE.TorusGeometry(4.55, .28, 5, 32).rotateX(Math.PI / 2), "g", M4(0, 53.8, 0)]);
    L.push([ZS(.9, 10, 8), "g", M4(0, 58.7, 0)], [new THREE.ConeGeometry(.35, 1.6, 6), "g", M4(0, 60, 0)]);
    zMesh(L, I);
    const g2 = zWrap(G, I, [24.6, 60.8, 24.6]); g2.userData.lamp = 50.3 * ZU; return g2;
  }
  /* ------------------------------------------------------------ HUSZÁR: hattyú díszcsónakban (68 egység) */
  function zKnight(c) {
    const G = new THREE.Group(), I = new THREE.Group(), L = [], P = ZC[c];
    const B = zBoat({ L: 34, B: 18, D: 9, rise: 3.2 });
    zDressBoat(L, B, c, { scrolls: 5 });
    /* test: előredőlő tojásforma a csónakban, mellkas elöl, felálló faroktollak hátul */
    L.push([ZS(1, 28, 20), "s", ZE(0, 14.2, 1, 6.6, 6.2, 11.8), P.swan], [ZS(1, 20, 16), "s", ZE(0, 16.5, -7.8, 5.2, 5.6, 5), P.swan]);
    for (let i = -2; i <= 2; i++) L.push([ZS(1, 12, 8), "s", ZE(i * 1.3, 19.5, 12.2, 1.1, 1, 3.6, -.9, 0, i * .18), P.wing]);
    /* S alakú nyak (változó vastagságú cső), fej, narancs csőr fekete tövével, szemek */
    const neck = new THREE.CatmullRomCurve3([V3(0, 17, -9.5), V3(0, 25, -12.8), V3(0, 36, -10.6), V3(0, 46, -4.6), V3(0, 55.5, -3.4), V3(0, 61.5, -7.6)]);
    L.push([varTube(neck, 60, 12, (t) => 3.7 - 2.1 * Math.pow(t, .7)), "s", null, P.swan]);
    L.push([ZS(1, 18, 14), "s", ZE(0, 62.4, -9.2, 2.1, 2.2, 3.1, .25), P.swan]);
    L.push([new THREE.ConeGeometry(1.15, 4.6, 12).rotateX(-Math.PI / 2), "e", M4(0, 61.6, -13.3, 0, -.32), ZC.beak], [ZS(.95, 10, 8), "e", M4(0, 62.6, -11.2), "#151515"]);
    [-1, 1].forEach((sd) => L.push([ZS(.42, 8, 6), "e", M4(sd * 1.75, 63.1, -9.9), "#111"]));
    /* szárnyak: mindkét oldalon három sor egyenként modellezett toll, a tollak szélén vékony aranyszegély */
    [-1, 1].forEach((sd) => {
      for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) {
        const t = k / 7, len = 7.5 + r * 1.8 - t * 1.2, a = -.35 + t * 1.55 + r * .08, bx = sd * (5.2 + r * .9), by = 17.5 + r * 3.2 + t * 4, bz = 4.5 - t * 6 - r * 1.2;
        const dir = V3(sd * (.35 + .1 * r), Math.sin(a), Math.cos(a)).normalize(), q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), dir), mid = V3(bx, by, bz).addScaledVector(dir, len * .5);
        L.push([ZS(1, 12, 8), "s", new THREE.Matrix4().compose(mid, q, V3(2.1, .6, len * .52)), r === 2 ? P.swan : P.wing]);
        L.push([ZS(1, 10, 6), "g", new THREE.Matrix4().compose(mid.clone().addScaledVector(dir, .3).add(V3(0, -.2, 0)), q, V3(2.2, .22, len * .54))]);
      }
    });
    zMesh(L, I);
    return zWrap(G, I, [25, 66, 36]);
  }
  /* ------------------------------------------------------------ FUTÓ: háromárbócos vitorlás (78 egység) */
  function zBishop(c) {
    const G = new THREE.Group(), I = new THREE.Group(), L = [], P = ZC[c];
    const B = zBoat({ L: 42, B: 20, D: 13, rise: 3.6, tr: .5 });
    zDressBoat(L, B, c, { deck: 12.2, scrolls: 6 });
    /* magas tatfelépítmény korláttal, tatablakokkal; orrfelépítmény; ágyúnyílások */
    L.push([new THREE.BoxGeometry(15, 6, 9), "e", M4(0, 16, 15.5), P.hull], [new THREE.BoxGeometry(15.6, .6, 9.6), "g", M4(0, 19.2, 15.5)]);
    for (let i = 0; i < 9; i++) L.push([new THREE.CylinderGeometry(.18, .18, 2.2, 6), "g", M4(-7.4 + i * 1.85, 20.3, 11.3)], [new THREE.CylinderGeometry(.18, .18, 2.2, 6), "g", M4(-7.4 + i * 1.85, 20.3, 19.9)]);
    L.push([new THREE.BoxGeometry(15, .35, .35), "g", M4(0, 21.4, 11.3)], [new THREE.BoxGeometry(15, .35, .35), "g", M4(0, 21.4, 19.9)]);
    [-4, 0, 4].forEach((x) => L.push([new THREE.BoxGeometry(2.2, 2.2, .4), "l", M4(x, 16.5, 20.1), "#ffdf9a"], [new THREE.BoxGeometry(2.8, .4, .6), "g", M4(x, 15.1, 20.2)]));
    L.push([new THREE.BoxGeometry(10, 3, 6), "e", M4(0, 14.2, -14.5), P.hull], [new THREE.BoxGeometry(10.4, .5, 6.4), "g", M4(0, 15.8, -14.5)]);
    [-1, 1].forEach((sd) => { for (let k = 0; k < 6; k++) { const u = .2 + k * .11, p = B.at(u, .3); L.push([new THREE.BoxGeometry(.5, 1.5, 1.7), "e", M4(sd * p[0] * 1.02, p[1], p[2]), "#0a0f18"], [new THREE.BoxGeometry(.4, 2.1, 2.3), "g", M4(sd * p[0] * 1.005, p[1], p[2])]); } });
    /* orrárboc */
    L.push([new THREE.CylinderGeometry(.35, .55, 13, 10), "g", M4(0, 19, -25.5, 0, -1.05)]);
    /* árbocok (elöl alacsonyabb, középen a legmagasabb, hátul a legkisebb), vitorlarudak, árbockosarak */
    const MS = [[-9, 64, .86], [0, 76, 1], [10, 60, .76]];
    MS.forEach(([mz, top, s]) => { L.push([new THREE.CylinderGeometry(.42 * s, .8 * s, top - 12, 10), "g", M4(0, (top + 12) / 2, mz)], [ZS(.75, 8, 6), "g", M4(0, top + .4, mz)], [new THREE.CylinderGeometry(1.6 * s, 1.2 * s, 1.2, 12), "g", M4(0, 12 + (top - 12) * .52, mz)]);
      [.26, .56, .82].forEach((f, k) => { if (s < .8 && k === 2) return; const y = 12 + (top - 12) * f + 7 * s * (1 - k * .18), wd = 26 * s * (1 - k * .2); L.push([new THREE.CylinderGeometry(.28, .28, wd + 1.4, 8).rotateZ(Math.PI / 2), "g", M4(0, y + .3, mz - .4)]); }); });
    zMesh(L, I);
    /* keresztvitorlák (a fő és az első árboc alsó két vitorláján arany horgony), orrvitorlák, zászlók, kötélzet */
    MS.forEach(([mz, top, s], mi) => { [.26, .56, .82].forEach((f, k) => { if (s < .8 && k === 2) return; const yTop = 12 + (top - 12) * f + 7 * s * (1 - k * .18), h = 12 * s * (1 - k * .18), wd = 26 * s * (1 - k * .2);
      const sg = zSq(wd * .92, wd, h, 2.2 * s).translate(0, yTop - h / 2 - .2, mz - .9); zSail(I, sg, c, mi < 2 && k < 2 ? "anchor" : "plain"); }); });
    zSail(I, zTri(V3(0, 15, -14), V3(0, 22, -31.5), V3(0, 52, -9.6), 1.3), c, "plain");
    zSail(I, zTri(V3(0, 15.5, -11), V3(0, 19, -27), V3(0, 40, -9.4), 1.0), c, "plain");
    MS.forEach(([mz, top]) => makeFlag(c, 4.6, 2.6, "team", I, 0, top + 1.6, mz));
    rigLines([[V3(0, 75, 0), V3(0, 63, -9)], [V3(0, 75, 0), V3(0, 59, 10)], [V3(0, 63, -9), V3(0, 24, -31)], [V3(0, 59, 10), V3(0, 21, 20)], [V3(0, 70, 0), V3(-10, 13, 1)], [V3(0, 70, 0), V3(10, 13, 1)], [V3(0, 58, -9), V3(-9.6, 13, -8)], [V3(0, 58, -9), V3(9.6, 13, -8)], [V3(0, 54, 10), V3(-8.4, 13, 10)], [V3(0, 54, 10), V3(8.4, 13, 10)]], I, ZC.gold2);
    return zWrap(G, I, [31, 79, 52]);
  }
  /* ------------------------------------------------------------ közös emberalak-részek: fej, haj, kezek */
  function zHead(L, x, y, z, r) { L.push([ZS(1, 22, 18), "m", ZE(x, y, z, r * .92, r * 1.05, r * .98), ZC.skin], [ZS(1, 10, 8), "m", ZE(x, y - r * .12, z - r * .95, r * .16, r * .2, r * .2), ZC.skin]); [-1, 1].forEach((sd) => L.push([ZS(r * .1, 8, 6), "e", M4(x + sd * r * .34, y + r * .1, z - r * .86), "#2d3a52"], [ZS(1, 8, 6), "m", ZE(x + sd * r * .9, y, z, r * .14, r * .26, r * .2), ZC.skin])); }
  function zArm(L, pts, r0, r1, col, key) { L.push([varTube(new THREE.CatmullRomCurve3(pts), 18, 10, (t) => r0 + (r1 - r0) * t), key || "s", null, col]); }
  /* ------------------------------------------------------------ VEZÉR: koronás királynő arany csónakban (90 egység) */
  function zQueen(c) {
    const G = new THREE.Group(), I = new THREE.Group(), L = [], P = ZC[c];
    const B = zBoat({ L: 42, B: 22, D: 16, rise: 6, tr: .55 });
    zDressBoat(L, B, c, { scrolls: 7 });
    /* hátul emelt arany csigadísz (a tatnál felcsavarodó volúta) */
    [-1, 1].forEach((sd) => { const pts = []; for (let t = 0; t <= 30; t++) { const a = t / 30 * TAU * 1.3, r = 4.6 * (1 - t / 34); pts.push(V3(sd * 7, 23 + Math.sin(a) * r, 21 + Math.cos(a) * r * .8)); } L.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .7, 6, false), "g"]); });
    /* ruha: a derékból szélesen szétterülő szoknya a csónak belsejében, aranyszegélyekkel */
    const yW = 42; L.push([ZL([[13, 12], [13.4, 13.4], [12, 18], [9.4, 26], [6.4, 35], [4.7, yW], [0, yW]], 48), "s", null, P.dress]);
    L.push([new THREE.TorusGeometry(13.2, .55, 6, 64).rotateX(Math.PI / 2), "g", M4(0, 13.6, 0)], [new THREE.TorusGeometry(9.5, .35, 6, 56).rotateX(Math.PI / 2), "g", M4(0, 26, 0)]);
    const hem = new THREE.CatmullRomCurve3(Array.from({ length: 72 }, (_, i) => { const a = i / 72 * TAU; return V3(Math.cos(a) * 12.4, 16 + Math.sin(a * 9) * .9, Math.sin(a) * 12.4); }), true);
    L.push([new THREE.TubeGeometry(hem, 220, .32, 5, true), "g"]);
    /* fűző és felsőtest, mellén szimmetrikus arany ornamentika; vállak, nyak */
    L.push([ZL([[4.7, yW], [4.3, yW + 3], [4.6, yW + 8], [5.7, yW + 12.5], [5.2, yW + 14.5], [2.2, yW + 16], [0, yW + 16.2]], 32), "s", null, P.bodice]);
    L.push([new THREE.TorusGeometry(4.6, .4, 6, 36).rotateX(Math.PI / 2), "g", M4(0, yW + .5, 0)]);
    for (let i = 0; i < 4; i++) L.push([new THREE.OctahedronGeometry(.75 - i * .1, 0), "g", ZE(0, yW + 2.5 + i * 2.6, -4.6 - i * .25, 1, 1.4, .5)]);
    [-1, 1].forEach((sd) => { L.push([ZT([V3(sd * .6, yW + 12.8, -5.1), V3(sd * 2.6, yW + 9.5, -4.9), V3(sd * 4.2, yW + 5, -4.4)], .3), "g"], [ZS(2.1, 14, 10), "s", M4(sd * 5.4, yW + 13.2, 0), P.bodice]); });
    L.push([new THREE.CylinderGeometry(1.5, 1.8, 3.2, 14), "m", M4(0, yW + 17.2, 0), ZC.skin], [new THREE.SphereGeometry(1, 16, 10, 0, TAU, 0, Math.PI / 2), "m", ZE(0, yW + 14.6, -.6, 4.2, 1.6, 3.4), ZC.skin]);
    /* karok: a jobb az ölében, a bal a ruhán; kezek */
    zArm(L, [V3(5.6, yW + 12.5, -.3), V3(7.3, yW + 6, -1.8), V3(4.5, yW + 1.5, -6.2)], 1.45, 1.0, ZC.skin, "m"); L.push([ZS(1.15, 10, 8), "m", M4(4.1, yW + 1.3, -6.7), ZC.skin]);
    zArm(L, [V3(-5.6, yW + 12.5, -.3), V3(-7.6, yW + 5.6, -.5), V3(-6.8, yW - .5, -4.5)], 1.45, 1.0, ZC.skin, "m"); L.push([ZS(1.15, 10, 8), "m", M4(-6.6, yW - .9, -5.1), ZC.skin]);
    /* fej, haj: dús hátsó tömeg és hullámos tincsek a vállon túl */
    const hy = yW + 23.8; zHead(L, 0, hy, 0, 4.4);
    L.push([new THREE.SphereGeometry(1, 20, 16, 0, TAU, 0, Math.PI * .62), "s", ZE(0, hy + .3, .6, 4.8, 5, 5), ZC.hair]);
    for (let i = 0; i < 14; i++) { const a = -2.3 + i / 13 * 4.6, sx = Math.sin(a), cz = Math.cos(a), r0 = 4.7, ph = i * 1.7;
      const pts = [V3(sx * r0 * .8, hy + 3.2, cz * r0 * .8 + .6), V3(sx * (r0 + .8), hy - 2, cz * (r0 + .6) + 1), V3(sx * (r0 + 1.6) + Math.sin(ph) * .9, hy - 8, cz * (r0 + 1.4) + 1.6), V3(sx * (r0 + 2.4) + Math.sin(ph + 1) * 1.4, hy - 14, cz * (r0 + 2) + 2.4), V3(sx * (r0 + 2.8) + Math.sin(ph + 2) * 1.6, hy - 19.5 + (Math.abs(a) > 1.6 ? 4 : 0), cz * (r0 + 2.2) + 3)];
      if (cz < -.35) continue;   /* az arc elől szabadon marad */
      L.push([varTube(new THREE.CatmullRomCurve3(pts), 30, 7, (t) => 1.25 * (1 - t * .55)), "s", null, i % 3 ? ZC.hair : "#c98f2c"]); }
    /* ötágú korona drágakövekkel, középső magasabb csúccsal */
    const cy = hy + 4.6; L.push([new THREE.CylinderGeometry(3.5, 3.2, 1.8, 28, 1, true), "g", M4(0, cy, 0)], [new THREE.TorusGeometry(3.45, .32, 6, 32).rotateX(Math.PI / 2), "g", M4(0, cy - .9, 0)], [new THREE.TorusGeometry(3.6, .3, 6, 32).rotateX(Math.PI / 2), "g", M4(0, cy + .9, 0)]);
    for (let i = 0; i < 5; i++) { const a = Math.PI + (i - 2) * .62, x = Math.sin(a) * 3.45, z = Math.cos(a) * 3.45, h2 = i === 2 ? 4.6 : 3.2;
      L.push([new THREE.ConeGeometry(.75, h2, 6), "g", M4(x, cy + .9 + h2 / 2, z)], [ZS(.5, 8, 6), "g", M4(x, cy + 1.2 + h2, z)], [ZS(.42, 8, 6), "e", M4(x * 1.05, cy, z * 1.05), i % 2 ? "#1f6fd1" : "#c21f3a"]); }
    zMesh(L, I);
    return zWrap(G, I, [32, 90, 46]);
  }
  /* ------------------------------------------------------------ KIRÁLY: szakállas kapitány távcsővel, aranyhajóban (100 egység) */
  function zKing(c) {
    const G = new THREE.Group(), I = new THREE.Group(), L = [], P = ZC[c];
    const B = zBoat({ L: 48, B: 24, D: 17, rise: 6.5, tr: .5 });
    zDressBoat(L, B, c, { goldHull: true, deck: 15.4, deckCol: c === "w" ? "#e9d4a5" : "#5a3d1c", sternLion: true, anchors: false });
    /* csizma, nadrág (térdnadrág), hosszú kabát arany gombsorral, öv csattal */
    const y0 = 15.6; [-1, 1].forEach((sd) => { L.push([new THREE.CylinderGeometry(1.9, 2.1, 7, 12), "e", M4(sd * 2.6, y0 + 3.5, 0), "#1a1410"], [new THREE.CylinderGeometry(2.1, 1.9, 9, 12), "m", M4(sd * 2.4, y0 + 11.5, 0), P.legs]); });
    L.push([ZL([[8.6, y0 + 9], [8.2, y0 + 12], [7.2, y0 + 20], [6.6, y0 + 26], [7.4, y0 + 32], [7.9, y0 + 38], [7.4, y0 + 42], [4.6, y0 + 44.5], [1.8, y0 + 45.5]], 40), "s", null, P.coat]);
    L.push([new THREE.TorusGeometry(6.75, .7, 6, 40).rotateX(Math.PI / 2), "e", M4(0, y0 + 26, 0), "#2a1a0e"], [new THREE.BoxGeometry(2.8, 2.2, .8), "g", M4(0, y0 + 26, -6.9)]);
    for (let i = 0; i < 6; i++) [-1.6, 1.6].forEach((x) => { const y = y0 + 28 + i * 2.2, r = 6.7 + (y - y0 - 26) * .09; L.push([ZS(.42, 8, 6), "g", M4(x, y, -Math.sqrt(Math.max(1, r * r - x * x)))]); });
    L.push([new THREE.TorusGeometry(8.4, .45, 6, 48).rotateX(Math.PI / 2), "g", M4(0, y0 + 9.5, 0)], [ZT([V3(-3, y0 + 43.5, -5.2), V3(0, y0 + 40, -6.9), V3(3, y0 + 43.5, -5.2)], .35), "g"]);
    /* aranyrojtos vállapok, gallér */
    [-1, 1].forEach((sd) => { L.push([new THREE.CylinderGeometry(2.6, 2.6, .7, 16), "g", M4(sd * 6.8, y0 + 43.4, 0, 0, 0, sd * .28)]); for (let k = 0; k < 10; k++) { const a = k / 9 * Math.PI - Math.PI / 2; L.push([new THREE.CylinderGeometry(.22, .22, 2.1, 5), "g", M4(sd * (6.8 + Math.cos(a) * 2.3), y0 + 42.1, Math.sin(a) * 2.3)]); } });
    L.push([ZL([[3.6, y0 + 44], [4.4, y0 + 45.6], [2.9, y0 + 47.2]], 28), "s", null, P.coat]);
    /* karok: a jobb előre-fel emeli a távcsövet, a bal a csípőn; arany mandzsetták */
    zArm(L, [V3(7.4, y0 + 42.5, 0), V3(10, y0 + 38, -3), V3(9.6, y0 + 41, -8.5)], 2.3, 1.6, P.coat); L.push([new THREE.TorusGeometry(1.6, .45, 6, 14), "g", M4(9.6, y0 + 41, -8.5, 0, -.5)], [ZS(1.35, 10, 8), "m", M4(9.6, y0 + 41.4, -9.6), ZC.skin]);
    zArm(L, [V3(-7.4, y0 + 42.5, 0), V3(-10.6, y0 + 35, 0), V3(-7.4, y0 + 28.5, -2)], 2.3, 1.6, P.coat); L.push([new THREE.TorusGeometry(1.6, .45, 6, 14).rotateX(Math.PI / 2), "g", M4(-7.6, y0 + 29, -1.8)], [ZS(1.35, 10, 8), "m", M4(-7.2, y0 + 28.2, -2.3), ZC.skin]);
    /* távcső: arany cső három egyre vékonyabb taggal, gyűrűkkel – előre és kissé jobbra néz */
    const tA = V3(8.6, y0 + 42.6, -8.4), tB = V3(13.6, y0 + 45.8, -21.5), seg = [[0, .38, 1.15], [.38, .7, .95], [.7, 1, .78]];
    seg.forEach(([a, b, r]) => { const p0 = tA.clone().lerp(tB, a), p1 = tA.clone().lerp(tB, b); const [g, m] = rodGeom(p0, p1, r, 14); L.push([g, "g", m]); L.push([ZS(r * 1.15, 10, 8), "g", M4(p1.x, p1.y, p1.z)]); });
    /* fej, nagy fehér szakáll külön bajusszal, fehér haj a tarkón */
    const hy = y0 + 52; zHead(L, 0, hy, 0, 5.2);
    L.push([ZS(1, 18, 14), "m", ZE(0, hy - 5.2, -2.6, 4.6, 6.2, 3.6), ZC.w.deck], [ZS(1, 14, 10), "m", ZE(0, hy - 9.8, -3.2, 2.8, 3.4, 2.4), ZC.w.deck]);
    [-1, 1].forEach((sd) => L.push([ZS(1, 12, 8), "m", ZE(sd * 1.9, hy - 1.6, -4.7, 2.2, .9, 1, 0, 0, sd * .35), ZC.w.deck]));
    L.push([new THREE.SphereGeometry(1, 16, 12, 0, TAU, Math.PI * .45, Math.PI * .55), "m", ZE(0, hy - .6, .8, 5.5, 5.4, 5.2), ZC.w.deck]);
    /* háromszögletű kapitánykalap aranyszegéllyel, elöl arany horgonnyal */
    const ty = hy + 5.2;
    const tri = new THREE.CylinderGeometry(8.2, 8.6, 3.6, 3, 1); tri.rotateY(Math.PI); L.push([tri, "e", M4(0, ty, 0), "#102D50"]);
    const triE = new THREE.CylinderGeometry(8.75, 8.75, .8, 3, 1, true); triE.rotateY(Math.PI); L.push([triE, "g", M4(0, ty + 1.7, 0)]);
    L.push([new THREE.SphereGeometry(1, 18, 12, 0, TAU, 0, Math.PI / 2), "e", ZE(0, ty + .4, .6, 4.8, 4.6, 4.8), "#102D50"]);
    L.push([anchorGeo(2.6), "g", M4(0, ty + .4, -5.6, Math.PI)]);
    zMesh(L, I);
    return zWrap(G, I, [35, 100, 54]);
  }
  /* ------------------------------------------------------------ bekötés: a figurás készlet (FIGB) helyére */
  Object.assign(FIGB, { p: zPawn, n: zKnight, b: zBishop, r: zRook, q: zQueen, k: zKing });
  Object.assign(FIGS, { p: 1, n: 1, b: 1, r: 1, q: 1, k: 1 });
  Object.assign(FIGN, { p: ["Gyalog", "Zephyr vitorlás"], n: ["Huszár", "hattyú csónakban"], b: ["Futó", "háromárbócos"], r: ["Bástya", "világítótorony"], q: ["Vezér", "királynő csónakban"], k: ["Király", "kapitány aranyhajóban"] });
  Object.assign(NAMES, FIGN);
  delete ROYAL.k; delete ROYAL.q;   /* a király és a vezér is hajón ül – úszik, nyomhullámot húz */
  W.vchess = { CS, FIGB, figTpl, BUILD_Z: { zPawn, zKnight, zBishop, zRook, zQueen, zKing } };   /* tesztekhez */
