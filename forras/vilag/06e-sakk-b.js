  /* ------------------------------------------------------------------ A BÁBUK – életnagyságú hajók (az orr −z felé, vízvonal y = 0) */
  const VS = { mats: {} };
  /* GYALOG: evezős csónak (klinker palánkozás), középen evezős, két evező a villákban */
  function buildPawn(c) {
    const P = PAL[c], G = new THREE.Group(); G.name = "pawn";
    const H = hullGeo({ NU: 26, NV: 9, L: 4.7, B: 1.6, F: .5, T: .24, sb: .26, ss: .14, tw: .36, n: 2.2, n2: 1.7, rocker: .62, rake: .3, srake: .1, bowP: .8, floor: .13 });
    const tex = hullPaint(H, { top: c === "w" ? "#d6a868" : P.hull, planks: { n: 7, c0: c === "w" ? "#d8ab6c" : "#14284c", c1: c === "w" ? "#b98a4e" : "#0c1d3a", clinker: true }, bands: [[.86, 1, c === "w" ? "#f6f1e4" : P.trim], [.8, .84, P.trim2]], anti: P.anti, boot: P.boot, deck0: "#c49a64", deck1: "#9c7342" });
    hullMeshes(G, H, tex, {});
    const L = [];
    L.push([new THREE.TubeGeometry(H.rail(1, .02), 24, .035, 4), P.wood2, new THREE.Matrix4()], [new THREE.TubeGeometry(H.rail(-1, .02), 24, .035, 4), P.wood2, new THREE.Matrix4()]);
    [-1.2, .1, 1.25].forEach((z, i) => { const p = H.prof(.5 - z / 4.7); L.push([BX(p.hb * 1.9, .05, .26), "#b88a54", M4(0, .38, z)]); });
    L.push([BX(.16, .06, .3), P.metal, M4(.74, .52, .08)], [BX(.16, .06, .3), P.metal, M4(-.74, .52, .08)]);   /* villák */
    L.push([CY(.03, .03, 1.1, 6), P.wood2, M4(0, 1.0, -2.15, 0, -.2)]);   /* orrbot, rajta kis csapatzászló */
    { const fg = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(.62, -.12), new THREE.Vector2(0, -.26)])); fg.rotateY(Math.PI / 2); L.push([fg, c === "w" ? "#c9a227" : "#7d1b2c", M4(0, 1.5, -2.2)]); const fg2 = fg.clone(); fg2.rotateY(Math.PI); fg2.translate(0, 0, 0); L.push([fg2, c === "w" ? "#c9a227" : "#7d1b2c", M4(0, 1.5, -2.2)]); }
    /* evezős: a középső padon, háttal a menetiránynak */
    figParts(L, M4(0, -.02, .1, Math.PI), { sit: true, shirt: P.shirt, pants: P.pants, stripe: c === "w" ? "#2a3a5a" : "#f4f1e6", hat: "cap", capCol: c === "w" ? "#f4f1e6" : "#0b1a33", armA: -1.1 });
    vcGroup(L, G);
    /* evezők (külön csoport – mozognak) */
    ["oarL", "oarR"].forEach((nm, k) => { const sd = k ? 1 : -1, o = new THREE.Group(); o.name = nm; o.position.set(sd * .74, .56, .08); G.add(o);
      vcGroup([[CY(.032, .032, 3.0, 6).rotateZ(Math.PI / 2), "#d9b98a", M4(sd * .9, 0, 0)], [BX(.7, .02, .2), c === "w" ? "#f6f1e4" : P.trim, M4(sd * 2.25, 0, 0)], [CY(.04, .04, .3, 6).rotateZ(Math.PI / 2), "#6b4a2a", M4(-sd * .45, 0, 0)]], o);
      o.rotation.z = sd * .28; });
    G.userData.dim = [1.7, 2.2, 5];
    return G;
  }
  /* HUSZÁR: viking hosszúhajó faragott lófejjel, csíkos négyszögvitorla, pajzsok, evezők */
  function buildKnight(c) {
    const P = PAL[c], G = new THREE.Group(); G.name = "knight";
    const H = hullGeo({ L: 7.0, B: 2.0, F: .62, T: .4, sb: 1.05, ss: .85, tw: 0, n: 2.0, n2: 1.6, rocker: .78, rake: .9, srake: .7, bowP: .95, sternP: .9, bw: .32 });
    const tex = hullPaint(H, { top: c === "w" ? "#a77a48" : "#3c2a1c", planks: { n: 8, c0: c === "w" ? "#b8884f" : "#4a3220", c1: c === "w" ? "#8e6234" : "#2c1c10", clinker: true }, bands: [[.84, 1, c === "w" ? "#f3ecdc" : P.hull], [.78, .83, P.trim]], anti: c === "w" ? "#4a3a28" : "#1c140c", boot: c === "w" ? "#6a5236" : "#2a1e12" });
    hullMeshes(G, H, tex, {});
    const L = [];
    L.push([new THREE.TubeGeometry(H.rail(1, .03), 40, .05, 5), P.wood2, new THREE.Matrix4()], [new THREE.TubeGeometry(H.rail(-1, .03), 40, .05, 5), P.wood2, new THREE.Matrix4()]);
    /* nyak az orrtőkén: ívelt cső, a végén faragott lófej (a 2D-s huszár: lófejes hajó) */
    const pb = H.vert(1, Math.PI / 2, 1);
    const neck = new THREE.CatmullRomCurve3([V3(0, pb[1] - .2, pb[2] + .25), V3(0, pb[1] + .45, pb[2] - .12), V3(0, pb[1] + 1.05, pb[2] - .28), V3(0, pb[1] + 1.55, pb[2] - .18)]);
    L.push([new THREE.TubeGeometry(neck, 20, .13, 8), P.metal, new THREE.Matrix4(), "m"]);
    const hb = M4(0, pb[1] + 1.62, pb[2] - .3, 0, .55);   /* fej: előre-lefelé néz */
    const HP = (geo, col, m, k) => L.push([geo, col, mul(hb, m), k || "m"]);
    HP(new THREE.SphereGeometry(.24, 12, 10).scale(.8, .95, 1.25), P.metal, M4(0, 0, 0));
    HP(CY(.13, .19, .52, 10).rotateX(Math.PI / 2), P.metal, M4(0, -.08, -.36));   /* orr (pofa) */
    HP(new THREE.SphereGeometry(.14, 10, 8).scale(1, .8, 1), P.metal, M4(0, -.1, -.62));
    HP(new THREE.ConeGeometry(.06, .2, 6), P.metal, M4(-.1, .27, .06, 0, -.2)); HP(new THREE.ConeGeometry(.06, .2, 6), P.metal, M4(.1, .27, .06, 0, -.2));
    for (let k = 0; k < 6; k++) HP(BX(.05, .16, .14), c === "w" ? "#b8902e" : "#6a4a28", M4(0, .2 - k * .09, .2 + k * .07, 0, -.4));   /* sörény */
    HP(new THREE.SphereGeometry(.04, 6, 4), "#120c08", M4(-.17, .03, -.16), "s"); HP(new THREE.SphereGeometry(.04, 6, 4), "#120c08", M4(.17, .03, -.16), "s");
    HP(new THREE.TorusGeometry(.17, .022, 5, 14), P.trim, M4(0, -.1, -.42), "s");   /* kantár */
    HP(new THREE.SphereGeometry(.035, 6, 4), "#120c08", M4(-.08, -.16, -.74), "s"); HP(new THREE.SphereGeometry(.035, 6, 4), "#120c08", M4(.08, -.16, -.74), "s");
    /* tatcsiga */
    const ps = H.vert(0, Math.PI / 2, 1), sp = []; for (let k = 0; k <= 24; k++) { const a = k / 24 * 4.2, r = .55 * (1 - k / 30); sp.push(V3(0, ps[1] + .2 + Math.sin(a) * r + k * .02, ps[2] - .15 + (1 - Math.cos(a)) * r * .9 - k * .01)); }
    L.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 28, .1, 6), P.wood2, new THREE.Matrix4()]);
    /* pajzsok a mellvéden, evezők */
    for (let k = 0; k < 7; k++) { const u = .22 + k * .085; [-1, 1].forEach((sd) => { const q = H.vert(u, Math.PI / 2, sd), col = P.shield[(k + (sd > 0 ? 0 : 1)) % 2];
      L.push([CY(.28, .28, .04, 12).rotateZ(Math.PI / 2), col, M4(q[0] + sd * .03, q[1] - .12, q[2])], [new THREE.SphereGeometry(.07, 6, 4), P.metal, M4(q[0] + sd * .06, q[1] - .12, q[2]), "m"],
        [new THREE.TorusGeometry(.27, .02, 3, 12).rotateY(Math.PI / 2), P.metal, M4(q[0] + sd * .045, q[1] - .12, q[2]), "m"]);
      if (k % 2 === 0 && k < 6) { const q2 = H.vert(u + .04, Math.PI / 2, sd); L.push(ROD(V3(q2[0] * .6, q2[1] - .3, q2[2]), V3(q2[0] + sd * 2.6, -.05, q2[2] + .4), .035, "#c9a46a")); } }); }
    /* árbóc, vitorlarúd */
    L.push([CY(.09, .12, 6.2, 8), "#7a5634", M4(0, 3.1 + .2, .2)], [CY(.07, .07, 4.6, 8).rotateZ(Math.PI / 2), "#7a5634", M4(0, 5.6, .05)]);
    L.push([new THREE.SphereGeometry(.1, 8, 6), P.metal, M4(0, 6.35, .2), "m"]);
    /* legénység (sisakos harcosok ülnek az evezőknél, a kormányos áll a tatnál) */
    [[-.45, -1.3], [.45, -.4], [-.45, .5], [.45, 1.4]].forEach(([x, z]) => figParts(L, M4(x, .5, z, 0), { sit: true, shirt: c === "w" ? "#8a2a22" : "#2a3a6a", pants: "#3a2a1a", hat: "helm", hair: "#c48a4a" }));
    figParts(L, M4(.3, .6, 2.6, Math.PI * .9), { shirt: c === "w" ? "#e6dcc4" : "#4a1a22", pants: "#3a2a1a", hat: "helm", hair: "#d0a060" });
    vcGroup(L, G);
    const sail = mesh(sqSailGeo(4.1, 4.3, 3.6, .45), std({ map: sailTexC(c === "w" ? "#f4ecd8" : "#5f2430", { stripe: c === "w" ? "#b8902e" : "#0e2142" }), side: THREE.DoubleSide, roughness: .85 }), G); sail.position.set(0, 3.75, .02);
    rigLines([[V3(0, 6.0, .2), V3(0, pb[1] + .3, pb[2] + .5)], [V3(0, 6.0, .2), V3(0, ps[1], ps[2] - .3)], [V3(0, 6.0, .2), V3(.95, .6, .6)], [V3(0, 6.0, .2), V3(-.95, .6, .6)], [V3(0, 6.0, .2), V3(.95, .6, -.3)], [V3(0, 6.0, .2), V3(-.95, .6, -.3)],
      [V3(2.3, 5.6, .05), V3(.8, .7, 1.6)], [V3(-2.3, 5.6, .05), V3(-.8, .7, 1.6)]], G);
    makePennant(c, 1.0, .3, G, 0, 6.5, .2);
    G.userData.dim = [2.4, 7, 7.8];
    return G;
  }
  /* FUTÓ: modern versenyjacht – fényes gélbevonatú test egyenes orral, széles tükörrel, alacsony kajüttető, magas árbóc,
     nagy (lekerekített felső élű) grószvitorla és génua, két hajós a peremen kiülve, korlát (sztancsik + korlátkötél) */
  function buildBishop(c) {
    const P = PAL[c], G = new THREE.Group(); G.name = "bishop";
    const H = hullGeo({ L: 7.6, B: 2.55, F: .78, T: .3, sb: .14, ss: .04, tw: .82, n: 3.4, n2: 2.6, rocker: .3, rake: .06, bowP: .58, sternP: .4, bw: .05, NU: 44 });
    const tex = hullPaint(H, { top: c === "w" ? "#f7f4ec" : "#0e2142", bands: [[.8, .87, P.trim], [.89, .92, c === "w" ? "#0e2142" : "#f0e6cc"]], anti: c === "w" ? "#0e2142" : "#14171c", boot: P.trim, deckCol: c === "w" ? "#dcdad2" : "#c9cbc9" });
    hullMeshes(G, H, tex, { gloss: 1 });
    const L = [], dY = H.prof(.5).sh - .05, pb = H.vert(1, Math.PI / 2, 1), ps = H.vert(0, Math.PI / 2, 1), wht = c === "w" ? "#f7f4ec" : "#16305a";
    /* kajüttető ablakokkal, kokpit tíkpadlóval, kormánykerék, csörlők */
    { const sh = new THREE.Shape(); sh.moveTo(-.85, 0); sh.lineTo(.85, 0); sh.lineTo(.7, .36); sh.lineTo(-.7, .36); sh.closePath();
      const cg = new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 2 }); cg.translate(0, 0, -1.2); L.push([cg, wht, M4(0, dY, -.5)]); }
    [-1, 1].forEach((sd) => L.push([BX(.02, .1, 1.6), "#1a2430", M4(sd * .79, dY + .2, -.5, 0, 0, sd * -.38)]));
    L.push([BX(1.5, .06, 2.0), "#b98a54", M4(0, dY - .25, 2.2)], [new THREE.TorusGeometry(.42, .03, 6, 22), "#2a2a2a", M4(0, dY + .45, 2.9)], [CY(.05, .06, .5, 6), "#c9ced4", M4(0, dY + .2, 2.95), "m"]);
    [-1, 1].forEach((sd) => L.push([CY(.12, .14, .22, 12), "#c9ced4", M4(sd * .95, dY + .12, 1.4), "m"], [CY(.13, .13, .04, 12), "#2a2a2a", M4(sd * .95, dY + .25, 1.4)]));
    /* árboc, bumm, orrsudár, tatkorlát */
    const mz = -.7, mH = 10.4; L.push([CY(.07, .1, mH, 8), c === "w" ? "#d9dde2" : "#22262c", M4(0, dY + mH / 2, mz), "m"], ROD(V3(0, dY + 1.0, mz + .1), V3(0, dY + 1.05, mz + 3.4), .06, c === "w" ? "#d9dde2" : "#22262c", "m"));
    L.push([new THREE.SphereGeometry(.08, 8, 6), P.metal, M4(0, dY + mH + .08, mz), "m"]);
    [-1, 1].forEach((sd) => { for (let k = 0; k < 5; k++) { const u = .12 + k * .19, q = H.vert(u, Math.PI / 2, sd); L.push([CY(.015, .015, .6, 5), "#e8ecef", M4(q[0] * .96, q[1] + .3, q[2]), "m"]); } });
    L.push([new THREE.TorusGeometry(.5, .02, 5, 16, Math.PI).rotateX(-Math.PI / 2), "#e8ecef", M4(0, ps[1] + .55, ps[2] - .1), "m"]);
    /* két hajós a szél felőli peremen kiülve, egy a kormánynál */
    figParts(L, M4(-1.05, dY - .15, .6, -Math.PI / 2), { sit: true, shirt: c === "w" ? "#0e2142" : "#f4f1e6", pants: "#2a2a30", hat: "cap", capCol: c === "w" ? "#0e2142" : "#7d1b2c", armA: -.4 });
    figParts(L, M4(-1.05, dY - .15, 1.3, -Math.PI / 2), { sit: true, shirt: c === "w" ? "#0e2142" : "#f4f1e6", pants: "#2a2a30", hat: "cap", capCol: c === "w" ? "#0e2142" : "#7d1b2c", armA: -.4 });
    figParts(L, M4(0, dY - .25, 3.3, Math.PI), { shirt: c === "w" ? "#c9a227" : "#7d1b2c", pants: "#2a2a30", hat: "cap", capCol: "#f4f1e6", armA: -1.0 });
    vcGroup(L, G);
    /* vitorlák: grószvitorla (felső éle lekerekítve: két háromszög) és génua – a futó „süvege” */
    const sc = c === "w" ? "#fbf8ef" : "#2c3038";
    const sm = std({ map: sailTexC(sc, { gold: c === "w" ? "#c9a227" : "#b08d57", emblem: c === "w" ? "#c9a227" : "#b08d57" }), side: THREE.DoubleSide, roughness: .7 });
    const sails = [[triSailGeo([.02, dY + 1.15, mz + .1], [.02, dY + 1.2, mz + 3.3], [.02, dY + mH - .2, mz + .1], .45, 10), new THREE.Matrix4()],
      [triSailGeo([.02, dY + 1.2, mz + 3.3], [.02, dY + 4.2, mz + 2.6], [.02, dY + mH - .2, mz + .1], .2, 6), new THREE.Matrix4()],
      [triSailGeo([.02, dY + .35, pb[2] + .25], [.02, dY + .45, mz + 1.1], [.02, dY + mH * .86, mz - .05], .5, 10), new THREE.Matrix4()]];
    mesh(mergeGeoms(sails), sm, G);
    rigLines([[V3(0, dY + mH * .88, mz), V3(0, dY + .1, pb[2] + .2)], [V3(0, dY + mH, mz), V3(0, ps[1] + .05, ps[2])], [V3(0, dY + mH * .8, mz), V3(1.1, dY, mz + .3)], [V3(0, dY + mH * .8, mz), V3(-1.1, dY, mz + .3)],
      [V3(0, dY + mH * .55, mz), V3(1.15, dY, mz - .4)], [V3(0, dY + mH * .55, mz), V3(-1.15, dY, mz - .4)], [V3(1.2, dY + .58, -2.6), V3(1.0, dY + .58, 3.4)], [V3(-1.2, dY + .58, -2.6), V3(-1.0, dY + .58, 3.4)]], G, "#c9ced4");
    makePennant(c, 1.0, .2, G, 0, dY + mH + .3, mz);
    G.userData.dim = [2.6, 11.2, 7.8];
    return G;
  }
  /* BÁSTYA: világítótorony sziklaszigeten – csíkos torony, körerkély korláttal, lámpaház forgó fénynyalábbal */
  function buildRook(c) {
    const P = PAL[c], G = new THREE.Group(); G.name = "rook";
    /* szikla: zajjal torzított gömb, a vízvonalnál sötét nedves sáv, a tetején moha */
    const rg = new THREE.IcosahedronGeometry(2.5, 4), rp = rg.attributes.position, cols = new Float32Array(rp.count * 3);
    const nz = (x, y, z) => Math.sin(x * 1.7 + 1.3) * Math.sin(y * 2.3 + .7) * Math.sin(z * 1.9 + 2.1) + .5 * Math.sin(x * 4.1 + z * 3.3) * Math.sin(y * 3.7);
    for (let i = 0; i < rp.count; i++) { const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i), k = 1 + .22 * nz(x, y, z); let yy = y * .42 * k - .35; rp.setXYZ(i, x * k, yy, z * k);
      const wet = yy < .15, moss = yy > .55 && nz(x * 2, y, z * 2) > .1; const col = new THREE.Color(wet ? "#34322e" : moss ? "#5c6b3e" : "#857f74").lerp(new THREE.Color("#a49c8e"), Math.max(0, nz(x * 3, y * 3, z * 3)) * .4);
      cols.set([col.r, col.g, col.b], i * 3); }
    rg.setAttribute("color", new THREE.BufferAttribute(cols, 3)); rg.computeVertexNormals();
    const rock = mesh(rg, std({ vertexColors: true, roughness: .92, flatShading: true }), G);
    const L = [];
    for (let k = 0; k < 6; k++) { const a = k * 1.1 + .3; L.push([new THREE.DodecahedronGeometry(.35 + (k % 3) * .15, 0), "#6e685e", M4(Math.cos(a) * 2.4, .05, Math.sin(a) * 2.2, a, a)]); }
    L.push([CY(1.35, 1.45, .45, 24), "#cfc8ba", M4(0, .95, 0)], [CY(1.2, 1.2, .08, 24), "#a29a8a", M4(0, 1.2, 0)]);
    /* torony: festett csíkok külön textúrával */
    const tw = canvasTex(256, 512, (g, w, h) => { const [c0, c1] = P.tower; for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? c1 : c0; g.fillRect(0, h - (k + 1) * h / 6, w, h / 6); }
      for (let y = 0; y < h; y += 6) { g.fillStyle = "rgba(0,0,0,.035)"; g.fillRect(0, y, w, 1); }
      g.fillStyle = "#1a2130"; [[.25, .2], [.75, .45], [.25, .7], [.75, .88]].forEach(([u, v]) => { g.fillRect(u * w - 9, (1 - v) * h - 16, 18, 28); g.fillStyle = "rgba(255,210,120,.0)"; g.fillStyle = "#1a2130"; });
      g.fillStyle = "#3a2a1a"; g.fillRect(w * .5 - 16, h - 54, 32, 54); g.fillStyle = P.trim2; g.fillRect(w * .5 - 18, h - 58, 36, 5); });
    const tower = mesh(new THREE.CylinderGeometry(.68, .95, 7.0, 28, 1, true), std({ map: tw, roughness: .5 }), G); tower.position.y = 1.25 + 3.5;
    const top = 1.25 + 7;
    L.push([CY(1.12, .95, .16, 28), c === "w" ? "#f2ede0" : "#1a2a48", M4(0, top + .02, 0)], [CY(.9, .9, .1, 24), "#2a2f36", M4(0, top + .14, 0)]);
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; L.push(ROD(V3(Math.cos(a) * 1.06, top + .1, Math.sin(a) * 1.06), V3(Math.cos(a) * 1.06, top + .82, Math.sin(a) * 1.06), .02, P.metal, "m")); }
    L.push([new THREE.TorusGeometry(1.06, .03, 5, 32).rotateX(Math.PI / 2), P.metal, M4(0, top + .82, 0), "m"], [new THREE.TorusGeometry(1.06, .02, 5, 32).rotateX(Math.PI / 2), P.metal, M4(0, top + .46, 0), "m"]);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; L.push(ROD(V3(Math.cos(a) * .6, top + .2, Math.sin(a) * .6), V3(Math.cos(a) * .6, top + 1.3, Math.sin(a) * .6), .035, "#2a2f36", "m")); }
    L.push([new THREE.SphereGeometry(.68, 18, 10, 0, TAU, 0, Math.PI / 2), P.dome, M4(0, top + 1.3, 0), "m"], [CY(.05, .05, .9, 6), P.dome, M4(0, top + 2.3, 0), "m"], [new THREE.SphereGeometry(.12, 10, 8), P.dome, M4(0, top + 2.0, 0), "m"]);
    L.push([BX(.5, .03, .06), P.dome, M4(0, top + 2.55, 0), "m"]);   /* szélkakas */
    vcGroup(L, G);
    /* lámpaház: üveg + izzó lámpa, forgó fénynyaláb */
    const glass = mesh(new THREE.CylinderGeometry(.58, .58, 1.05, 18, 1, true), std({ color: "#fff3cf", emissive: new THREE.Color("#ffd27a"), emissiveIntensity: 1.6, transparent: true, opacity: .55, roughness: .05 }), G); glass.position.y = top + .76;
    const beamT = canvasTex(256, 32, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,236,180,.9)"); gr.addColorStop(1, "rgba(255,236,180,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const bm = basic({ map: beamT, transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const beam = new THREE.Group(); beam.name = "beam"; beam.position.y = top + .76; G.add(beam);
    { const parts = [0, Math.PI].map((a) => { const cg = new THREE.ConeGeometry(1.6, 18, 16, 1, true); cg.rotateZ(Math.PI / 2); cg.translate(9, 0, 0); const p = cg.attributes.position, uv = cg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 18, .5); return [cg, new THREE.Matrix4().makeRotationY(a)]; });
      const m = mesh(mergeGeoms(parts), bm, beam); m.renderOrder = 6; }
    G.userData.dim = [5, 10.5, 5];
    return G;
  }
  /* közös: árbóc négyszögvitorlákkal (alsó, derék-, sudárvitorla), keresztrudak, árbóckosár */
  function mastSquare(L, sails, rig, x0, z, deckY, H, w0, c, opt) {
    opt = opt || {};
    L.push([CY(.07, .14, H, 8), "#8a6a44", M4(0, deckY + H / 2, z)]);
    const lv = opt.levels || [[.18, .46, 1], [.5, .76, .84], [.79, .95, .64]];
    lv.forEach(([a, b, k], i) => {
      const y0 = deckY + H * a, y1 = deckY + H * b, w = w0 * k;
      L.push([CY(.045, .045, w * 1.12, 6).rotateZ(Math.PI / 2), "#6e5232", M4(0, y1 + .04, z - .12)]);
      sails.push([sqSailGeo(w * .9, w, y1 - y0, (y1 - y0) * .2), M4(0, (y0 + y1) / 2, z - .2)]);
      rig.push([V3(-w * .56, y1 + .04, z - .12), V3(-w * .45, deckY + .2, z + 1.2)], [V3(w * .56, y1 + .04, z - .12), V3(w * .45, deckY + .2, z + 1.2)]);
      if (i === 0) L.push([CY(.38, .3, .1, 10), "#6e5232", M4(0, y1 + .2, z)]);   /* árbóckosár */
    });
    [-1, 1].forEach((sd) => { for (let k = 0; k < 3; k++) rig.push([V3(0, deckY + H * .76, z), V3(sd * (opt.bw || 1), deckY + .1, z + .35 * (k - 1))]); });
    L.push([new THREE.SphereGeometry(.09, 8, 6), PAL[c].metal, M4(0, deckY + H + .05, z), "m"]);
  }
  /* VEZÉR: kétárbócos fregatt – ágyúnyílás-sor, arany díszcsík, réz hajófenék, előárbóc négyszögvitorlákkal, főárbóc gaffvitorlával, korona */
  function buildQueen(c) {
    const P = PAL[c], G = new THREE.Group(); G.name = "queen";
    const H = hullGeo({ L: 7.4, B: 2.1, F: .95, T: .46, sb: .55, ss: .4, tw: .55, n: 2.8, n2: 2.2, rocker: .35, rake: .55, srake: .18, tumble: .12, bw: .28 });
    const tex = hullPaint(H, { top: P.hull, bands: [[.18, .3, P.trim2], [.62, .7, c === "w" ? "#c9a227" : "#b08d57"], [.9, 1, P.trim]], ports: [{ f: .45, h: .2, n: 8, u0: .16, u1: .8, col: c === "w" ? "#141414" : "#1a0f0a", frame: c === "w" ? "#c9a227" : "#b08d57" }], anti: "#a8643a", copper: true, boot: c === "w" ? "#f6f1e4" : "#0b1a33" });
    hullMeshes(G, H, tex, { gloss: 1 });
    const L = [], sails = [], tri = [], rig = [];
    L.push([new THREE.TubeGeometry(H.rail(1, .06), 40, .045, 5), P.metal, new THREE.Matrix4(), "m"], [new THREE.TubeGeometry(H.rail(-1, .06), 40, .045, 5), P.metal, new THREE.Matrix4(), "m"]);
    const dY = H.prof(.5).sh - .28, pb = H.vert(1, Math.PI / 2, 1), ps = H.vert(0, Math.PI / 2, 1);
    /* orrárboc + orrkép (aranyozott szirén helyett horgony-dísz) */
    const bsA = V3(0, pb[1] - .05, pb[2] + .3), bsB = V3(0, pb[1] + .9, pb[2] - 2.2); L.push(ROD(bsA, bsB, .07, "#7a5634"));
    L.push([new THREE.SphereGeometry(.18, 10, 8).scale(.7, 1, 1.2), P.metal, M4(0, pb[1] - .25, pb[2] + .05), "m"]);
    /* tatfelépítmény ablakokkal, lámpások */
    L.push([BX(1.9, .55, 1.4), c === "w" ? "#efe6cf" : "#16305a", M4(0, dY + .3, 2.75)], [BX(2.0, .06, 1.5), P.metal, M4(0, dY + .6, 2.75), "m"]);
    for (let k = 0; k < 4; k++) L.push([BX(.26, .2, .02), "#ffd27a", M4(-.6 + k * .4, ps[1] - .3, ps[2] + .02), "e"]);
    L.push([CY(.08, .1, .3, 8), "#ffd27a", M4(0, ps[1] + .5, ps[2] - .1), "e"], [new THREE.ConeGeometry(.12, .16, 8), P.metal, M4(0, ps[1] + .72, ps[2] - .1), "m"]);
    L.push([CY(.03, .03, .55, 6), P.metal, M4(0, ps[1] + .3, ps[2] - .1), "m"]);
    /* kormánykerék és kapitány */
    L.push([new THREE.TorusGeometry(.32, .03, 6, 18), "#7a5634", M4(0, dY + 1.05, 2.0)], [CY(.05, .05, .6, 6), "#7a5634", M4(0, dY + .72, 2.05)]);
    figParts(L, M4(0, dY + .1, 2.3, Math.PI), { shirt: c === "w" ? "#f6f4ee" : "#0e2142", pants: c === "w" ? "#f6f4ee" : "#1a1a22", hat: "tri", capCol: c === "w" ? "#1a2a48" : "#111", armA: -1.2 });
    figParts(L, M4(.6, dY, -1.6, .4), { shirt: "#f4f1e6", pants: "#2a3a5a", stripe: "#1d3a8a", hat: "cap", capCol: "#f4f1e6" });
    figParts(L, M4(-.55, dY, .4, -2.4), { shirt: "#f4f1e6", pants: "#2a3a5a", stripe: "#1d3a8a", hat: "cap", capCol: "#f4f1e6", armA: -2.4 });
    /* ágyúcsövek a nyílásokban */
    for (let k = 0; k < 8; k++) { const u = .16 + (.8 - .16) * (k + .5) / 8; [-1, 1].forEach((sd) => { const q = H.vert(u, Math.PI * .44, sd); L.push([CY(.05, .07, .5, 8).rotateZ(Math.PI / 2), "#1a1a1a", M4(q[0] + sd * .15, q[1] - .05, q[2]), "m"]); }); }
    mastSquare(L, sails, rig, 0, -1.55, dY, 6.6, 3.3, c, { bw: 1.0, levels: [[.2, .48, 1], [.52, .76, .82], [.8, .94, .62]] });
    /* főárbóc: gaffvitorla + gaff-csúcsvitorla */
    const mz = 1.05, mH = 7.2; L.push([CY(.07, .14, mH, 8), "#8a6a44", M4(0, dY + mH / 2, mz)]);
    L.push(ROD(V3(0, dY + 1.1, mz + .1), V3(0, dY + 1.25, mz + 3.0), .05, "#6e5232"), ROD(V3(0, dY + 4.6, mz + .1), V3(0, dY + 5.3, mz + 2.6), .045, "#6e5232"));
    tri.push(triSailGeo([0, dY + 1.3, mz + .15], [0, dY + 1.4, mz + 2.9], [0, dY + 4.5, mz + .15], .35, 9), triSailGeo([0, dY + 1.4, mz + 2.9], [0, dY + 5.2, mz + 2.5], [0, dY + 4.5, mz + .15], .3, 9), triSailGeo([0, dY + 5.3, mz + .2], [0, dY + 5.35, mz + 2.4], [0, dY + mH - .1, mz + .1], .2, 7));
    /* orrvitorlák */
    tri.push(triSailGeo([0, bsB.y - .05, bsB.z + .1], [0, dY + .5, pb[2] + .6], [0, dY + 5.0, -1.55], -.3, 8), triSailGeo([0, bsB.y - .35, bsB.z + .9], [0, dY + .4, pb[2] + 1.2], [0, dY + 3.6, -1.55], -.25, 7));
    rig.push([bsB, V3(0, dY + 6.4, -1.55)], [V3(0, dY + 6.4, -1.55), V3(0, dY + mH, mz)], [V3(0, dY + mH, mz), V3(0, ps[1], ps[2])], [bsB, V3(0, pb[1] - .4, pb[2] + .2)]);
    [-1, 1].forEach((sd) => { for (let k = 0; k < 3; k++) rig.push([V3(0, dY + mH * .8, mz), V3(sd * 1.0, dY + .1, mz + .35 * (k - 1))]); });
    /* korona a főárbóc csúcsán */
    crownParts(L, M4(0, dY + mH + .15, mz), .32, P.metal, P.gem, false);
    L.push(ROD(V3(0, ps[1], ps[2] + .05), V3(0, ps[1] + 1.4, ps[2] + .1), .03, P.metal, "m"));   /* zászlórúd a taton */
    const vgQ = vcGroup(L, G); if (vgQ.e) vgQ.e.material.emissiveIntensity = 1.3;
    const sm = std({ map: sailTexC(P.sail, { gold: c === "w" ? "#c9a227" : "#b08d57" }), side: THREE.DoubleSide, roughness: .85 });
    mesh(mergeGeoms(sails.map(([g, m]) => [g, m]).concat(tri.map((g) => [g, new THREE.Matrix4()]))), sm, G);
    rigLines(rig, G);
    makeFlag(c, 1.2, .78, "ens", G, 0, ps[1] + .9, ps[2] + .1); makePennant(c, 1.6, .26, G, 0, dY + 6.7, -1.55);
    G.userData.dim = [2.6, 9.5, 9.6];
    return G;
  }
  /* KIRÁLY: háromárbócos sorhajó – két ágyúnyílás-sor, magas tatvár aranyozott ablaksorral, korona kereszttel a főárbócon */
  function buildKing(c) {
    const P = PAL[c], G = new THREE.Group(); G.name = "king";
    const H = hullGeo({ L: 8.0, B: 2.35, F: 1.2, T: .52, sb: .5, ss: 1.0, tw: .62, n: 3.0, n2: 2.3, rocker: .3, rake: .55, srake: .3, tumble: .16, bw: .3 });
    const tex = hullPaint(H, { top: P.hull, bands: [[.14, .22, P.trim2], [.4, .45, c === "w" ? "#c9a227" : "#b08d57"], [.72, .77, c === "w" ? "#c9a227" : "#b08d57"], [.92, 1, P.trim]],
      ports: [{ f: .3, h: .13, n: 10, u0: .14, u1: .86, col: "#141414", frame: c === "w" ? "#c9a227" : "#b08d57" }, { f: .58, h: .12, n: 10, u0: .14, u1: .86, col: "#141414", frame: c === "w" ? "#c9a227" : "#b08d57" }], anti: "#a8643a", copper: true, boot: c === "w" ? "#f6f1e4" : "#0b1a33",
      /* tatlap: aranyozott díszítés, két kivilágított ablaksor, címer */
      transom: (g, x0, y0, w, h) => { const gd = c === "w" ? "#c9a227" : "#b08d57"; g.fillStyle = P.hull; g.fillRect(x0, y0, w, h);
        for (let r = 0; r < 2; r++) { g.fillStyle = gd; g.fillRect(x0 + 18, y0 + 14 + r * 40, w - 36, 4); for (let k = 0; k < 6; k++) { g.fillStyle = gd; g.fillRect(x0 + 30 + k * 34, y0 + 20 + r * 40, 24, 26); g.fillStyle = "#ffd27a"; g.fillRect(x0 + 33 + k * 34, y0 + 23 + r * 40, 18, 20); } }
        g.fillStyle = gd; g.beginPath(); g.arc(x0 + w / 2, y0 + h - 18, 14, 0, TAU); g.fill(); } });
    hullMeshes(G, H, tex, { gloss: 1 });
    const L = [], sails = [], tri = [], rig = [];
    L.push([new THREE.TubeGeometry(H.rail(1, .06), 40, .05, 5), P.metal, new THREE.Matrix4(), "m"], [new THREE.TubeGeometry(H.rail(-1, .06), 40, .05, 5), P.metal, new THREE.Matrix4(), "m"]);
    const dY = H.prof(.5).sh - .3, pb = H.vert(1, Math.PI / 2, 1), ps = H.vert(0, Math.PI / 2, 1);
    /* tatvár (két szint), orrfelépítmény */
    L.push([BX(2.0, .7, 1.8), P.hull, M4(0, dY + .35, 2.95)], [BX(2.08, .07, 1.88), P.metal, M4(0, dY + .72, 2.95), "m"], [BX(1.7, .55, 1.0), P.hull, M4(0, dY + 1.0, 3.25)], [BX(1.78, .06, 1.08), P.metal, M4(0, dY + 1.3, 3.25), "m"]);
    for (let k = 0; k < 5; k++) [-1, 1].forEach((sd) => L.push([BX(.02, .22, .2), "#ffd27a", M4(sd * 1.005, dY + .4, 2.3 + k * .3), "e"]));
    L.push([BX(1.7, .45, 1.1), P.hull, M4(0, dY + .22, -2.9)], [BX(1.76, .05, 1.16), P.metal, M4(0, dY + .46, -2.9), "m"]);
    /* tatlámpások */
    [-.65, 0, .65].forEach((x, k) => L.push([CY(.1, .12, .36, 8), "#ffd27a", M4(x, dY + 1.6 + (k === 1 ? .2 : 0), ps[2] - .05), "e"], [new THREE.ConeGeometry(.14, .2, 8), P.metal, M4(x, dY + 1.88 + (k === 1 ? .2 : 0), ps[2] - .05), "m"]));
    /* orrárboc, orrkép (aranyozott oroszlán helyett korona-pajzs) */
    const bsA = V3(0, pb[1] - .1, pb[2] + .3), bsB = V3(0, pb[1] + 1.1, pb[2] - 2.6); L.push(ROD(bsA, bsB, .085, "#7a5634"), ROD(bsB, V3(0, bsB.y + .45, bsB.z - 1.2), .05, "#7a5634"));
    L.push([new THREE.SphereGeometry(.24, 12, 8).scale(.6, 1, 1.2), P.metal, M4(0, pb[1] - .3, pb[2] + .05), "m"]);
    /* ágyúcsövek két sorban */
    for (let r = 0; r < 2; r++) for (let k = 0; k < 10; k++) { const u = .14 + (.86 - .14) * (k + .5) / 10; [-1, 1].forEach((sd) => { const q = H.vert(u, Math.PI * (r ? .4 : .3), sd); L.push([CY(.05, .075, .5, 8).rotateZ(Math.PI / 2), "#151515", M4(q[0] + sd * .14, q[1], q[2]), "m"]); }); }
    /* kapitány a tatvár tetején, matrózok */
    figParts(L, M4(0, dY + 1.33, 3.2, Math.PI), { shirt: c === "w" ? "#f6f4ee" : "#0e2142", pants: c === "w" ? "#f6f4ee" : "#1a1a22", hat: "tri", capCol: c === "w" ? "#1a2a48" : "#111", armA: -.3 });
    [[.6, -1.0, .5], [-.6, .3, -2.8], [.5, 1.4, 2.2]].forEach(([x, z, y]) => figParts(L, M4(x, dY, z, y), { shirt: "#f4f1e6", pants: "#2a3a5a", stripe: "#7d1b2c", hat: "cap", capCol: "#f4f1e6" }));
    L.push([new THREE.TorusGeometry(.36, .035, 6, 20), "#7a5634", M4(0, dY + 1.0, 2.0)]);
    mastSquare(L, sails, rig, 0, -2.25, dY, 7.4, 3.5, c, { bw: 1.15 });
    mastSquare(L, sails, rig, 0, -.1, dY, 8.6, 3.9, c, { bw: 1.2 });
    mastSquare(L, sails, rig, 0, 2.15, dY + .7, 6.2, 2.6, c, { bw: 1.0, levels: [[.42, .7, .9], [.73, .93, .7]] });
    /* tatvitorla (gaff) a farárbócon */
    tri.push(triSailGeo([0, dY + 1.8, 2.3], [0, dY + 1.9, 4.6], [0, dY + 4.6, 2.3], .3, 8));
    L.push(ROD(V3(0, dY + 1.75, 2.25), V3(0, dY + 1.85, 4.8), .045, "#6e5232"));
    /* orrvitorlák */
    tri.push(triSailGeo([0, bsB.y + .3, bsB.z - .9], [0, dY + .7, pb[2] + .7], [0, dY + 5.3, -2.25], -.35, 8), triSailGeo([0, bsB.y - .1, bsB.z + .1], [0, dY + .6, pb[2] + 1.3], [0, dY + 3.9, -2.25], -.3, 7));
    rig.push([V3(0, bsB.y + .45, bsB.z - 1.2), V3(0, dY + 7.2, -2.25)], [V3(0, dY + 7.2, -2.25), V3(0, dY + 8.4, -.1)], [V3(0, dY + 8.4, -.1), V3(0, dY + .7 + 6.0, 2.15)], [V3(0, dY + .7 + 6, 2.15), V3(0, ps[1] + .2, ps[2])]);
    /* korona kereszttel a főárbóc csúcsán, nagy lobogó a taton, zászlók az árbócokon */
    crownParts(L, M4(0, dY + 8.75, -.1), .38, P.metal, P.gem, true);
    L.push(ROD(V3(0, ps[1], ps[2] + .05), V3(0, ps[1] + 1.8, ps[2] + .15), .035, P.metal, "m"));
    const vgK = vcGroup(L, G); if (vgK.e) vgK.e.material.emissiveIntensity = 1.3;
    const sm = std({ map: sailTexC(P.sail, { gold: c === "w" ? "#c9a227" : "#b08d57" }), side: THREE.DoubleSide, roughness: .85 });
    const em = std({ map: sailTexC(P.sail, { emblem: c === "w" ? "#c9a227" : "#d9b25a", gold: c === "w" ? "#c9a227" : "#b08d57" }), side: THREE.DoubleSide, roughness: .85 });
    /* a főárbóc alsó vitorláján a korona-címer */
    const emb = sails.splice(3, 1);
    mesh(mergeGeoms(sails.map(([g, m]) => [g, m]).concat(tri.map((g) => [g, new THREE.Matrix4()]))), sm, G); mesh(mergeGeoms(emb.map(([g, m]) => [g, m])), em, G);
    rigLines(rig, G);
    L.length = 0;
    makeFlag(c, 1.6, 1.0, "royal", G, 0, ps[1] + 1.3, ps[2] + .15); makePennant(c, 2.2, .3, G, 0, dY + 7.6, -2.25); makePennant(c, 1.8, .26, G, 0, dY + .7 + 6.4, 2.15);
    G.userData.dim = [2.8, 10.5, 10.5];
    return G;
  }
  const BUILD = { p: buildPawn, n: buildKnight, b: buildBishop, r: buildRook, q: buildQueen, k: buildKing };
