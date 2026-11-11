  /* =====================================================================================================
     BALATONI HULLÁMVASÚT (2026-11-11, a tulajdonos kérésére)
     „Ülj be a Zephyrbe, és menj végig a Balaton nevezetességei között (Tihanyi apátság, Badacsony, füredi móló, Szigligeti vár,
     keszthelyi Festetics-kastély). Két mód: NYUGODT (alap) és VAD – nagyon kemény: lassú felhúzás, szabadesés, hurok,
     dugóhúzó, alagút. A hajó/kokpit végig látszik; a vad menet előtt figyelmeztetés; bármikor ki lehet szállni.”
     Megoldás: a hajó áll (a néző körül), a VILÁG mozog és fordul – így VR-ben is a pálya dőlését, hurkát látod.
     Minden díszlet kisütött fényű (csúcsszín + MeshBasicMaterial), nincs futásidejű árnyék.
     ===================================================================================================== */
  const HV = { mode: "calm", st: "station", s: 0, v: 0, lap: 0, warn: false };
  W._coaster = HV;
  const HV_SUN = new THREE.Vector3(-.42, .62, -.5).normalize();
  function hvBake(parts, parent, opt) {
    const list = parts.map(([geo, col, m4]) => {
      const g = geo.index ? geo.toNonIndexed() : geo; if (m4) g.applyMatrix4(m4); g.computeVertexNormals();
      const c = new THREE.Color(col), n = g.attributes.position.count, a = new Float32Array(n * 3), N = g.attributes.normal;
      for (let i = 0; i < n; i++) { const d = N.getX(i) * HV_SUN.x + N.getY(i) * HV_SUN.y + N.getZ(i) * HV_SUN.z, k = .5 + .5 * Math.max(0, d) + .1 * N.getY(i); a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k * (1 + .06 * (1 - Math.max(0, d))); }
      g.setAttribute("color", new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute("uv"); return [g, new THREE.Matrix4()]; });
    const m = mesh(mergeGeoms(list), basic(Object.assign({ vertexColors: true }, opt || {})), parent); m.matrixAutoUpdate = false; m.updateMatrix(); return m;
  }
  const hvBX = (w, h, d) => new THREE.BoxGeometry(w, h, d), hvCY = (r1, r2, h, s) => new THREE.CylinderGeometry(r1, r2, h, s || 12), hvCO = (r, h, s) => new THREE.ConeGeometry(r, h, s || 10), hvSP = (r) => new THREE.SphereGeometry(r, 12, 9);
  function hvLabel(txt, sub, x, y, z, parent, sc) {
    const t = canvasTex(1024, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "rgba(9,28,58,.86)"; g.beginPath(); g.roundRect ? g.roundRect(8, 30, w - 16, h - 60, 60) : g.rect(8, 30, w - 16, h - 60); g.fill(); g.lineWidth = 6; g.strokeStyle = "#e4bb63"; g.stroke();
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.font = "800 84px Inter, system-ui, sans-serif"; g.fillText(txt, w / 2, sub ? 108 : 128); if (sub) { g.fillStyle = "#e4bb63"; g.font = "600 46px Inter, system-ui, sans-serif"; g.fillText(sub, w / 2, 180); } });
    const s = new THREE.Sprite(sprM({ map: t, transparent: true, depthWrite: false, fog: false })); s.scale.set((sc || 60), (sc || 60) / 4, 1); s.position.set(x, y, z); parent.add(s); return s;
  }
  /* ---------- a pálya: zárt Catmull–Rom görbe, „fel” iránytűkkel (hurok, dugóhúzó) és automatikus bedőléssel ---------- */
  function hvTrack(pts, opt) {
    const n = pts.length, cur = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])), true, "centripetal");
    const M = n * 26, P = [], F = [], U = [], S = [0], fix = [];
    for (let k = 0; k < M; k++) { const t = k / M; P.push(cur.getPoint(t)); const f = t * n, i = Math.floor(f) % n, j = (i + 1) % n, fr = f - Math.floor(f), a = pts[i][3], b = pts[j][3];
      const h = new THREE.Vector3(0, 1, 0); if (a || b) { const ha = a ? new THREE.Vector3(a[0], a[1], a[2]).normalize() : new THREE.Vector3(0, 1, 0), hb = b ? new THREE.Vector3(b[0], b[1], b[2]).normalize() : new THREE.Vector3(0, 1, 0); h.copy(ha).lerp(hb, fr * fr * (3 - 2 * fr)); if (h.lengthSq() < 1e-4) h.copy(ha); h.normalize(); }
      U.push(h); fix.push(!!(a || b)); }
    for (let k = 0; k < M; k++) { F.push(P[(k + 1) % M].clone().sub(P[(k - 1 + M) % M]).normalize()); if (k) S.push(S[k - 1] + P[k].distanceTo(P[k - 1])); }
    const L = S[M - 1] + P[0].distanceTo(P[M - 1]);
    /* bedőlés a kanyarba (ahol nincs kézi iránytű): a vízszintes görbülettel arányosan */
    const bank = opt.bank || 0;
    for (let k = 0; k < M; k++) { if (fix[k]) continue; const a = F[(k - 3 + M) % M], b = F[(k + 3) % M], ds = Math.max(.5, (S[(k + 3) % M] - S[(k - 3 + M) % M] + L) % L); const c = b.clone().sub(a).multiplyScalar(1 / ds); c.y = 0; U[k].set(0, 1, 0).addScaledVector(c, bank); const l = Math.hypot(U[k].x, U[k].z), mx = 1.1; if (l > mx) { U[k].x *= mx / l; U[k].z *= mx / l; } }
    for (let pass = 0; pass < 10; pass++) { const V = U.map((u, k) => u.clone().add(U[(k + 1) % M]).add(U[(k - 1 + M) % M])); V.forEach((v, k) => U[k].copy(v).normalize()); }
    for (let k = 0; k < M; k++) { U[k].addScaledVector(F[k], -U[k].dot(F[k])); if (U[k].lengthSq() < 1e-6) U[k].copy(U[(k - 1 + M) % M]); U[k].normalize(); }
    const TR = { P, F, U, S, L, M, pts, cur,
      at(s, out) { s = ((s % L) + L) % L; let lo = 0, hi = M - 1; while (lo < hi) { const md = (lo + hi + 1) >> 1; if (S[md] <= s) lo = md; else hi = md - 1; }
        const k = lo, k2 = (k + 1) % M, s2 = k2 ? S[k2] : L, fr = clamp((s - S[k]) / Math.max(1e-4, s2 - S[k]), 0, 1);
        out.p.copy(P[k]).lerp(P[k2], fr); out.f.copy(F[k]).lerp(F[k2], fr).normalize(); out.u.copy(U[k]).lerp(U[k2], fr); out.u.addScaledVector(out.f, -out.u.dot(out.f)).normalize(); out.k = k; return out; },
      sOf(i) { return S[(i * 26) % M]; } };
    return TR;
  }
  /* sínek, talpfák, gerinc, oszlopok – egyetlen kisütött háló */
  function hvRails(TR, parent, col, col2) {
    const pos = [], colr = [], cA = new THREE.Color(col), cB = new THREE.Color(col2 || "#d8dde2"), cS = new THREE.Color("#8d949c");
    const quad = (a, b, c, d, cc, sh) => { [a, b, c, a, c, d].forEach((v) => { pos.push(v.x, v.y, v.z); colr.push(cc.r * sh, cc.g * sh, cc.b * sh); }); };
    const fr = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3() }, R = new THREE.Vector3();
    const step = 1.25, N = Math.round(TR.L / step), ring = (s) => { TR.at(s, fr); R.crossVectors(fr.f, fr.u).normalize(); return { p: fr.p.clone(), u: fr.u.clone(), r: R.clone(), f: fr.f.clone() }; };
    let prev = ring(0);
    const sect = (q, off, w, h) => { const c = q.p.clone().addScaledVector(q.r, off[0]).addScaledVector(q.u, off[1]); return [c.clone().addScaledVector(q.r, -w).addScaledVector(q.u, h), c.clone().addScaledVector(q.r, w).addScaledVector(q.u, h), c.clone().addScaledVector(q.r, w).addScaledVector(q.u, -h), c.clone().addScaledVector(q.r, -w).addScaledVector(q.u, -h)]; };
    const posts = [];
    for (let i = 1; i <= N; i++) { const q = ring(i * step);
      [[[-.62, 0], .07, .07, cA], [[.62, 0], .07, .07, cA], [[0, -.42], .16, .16, cS]].forEach(([off, w, h, cc]) => { const A = sect(prev, off, w, h), B = sect(q, off, w, h), lit = .55 + .45 * Math.max(0, q.u.dot(HV_SUN));
        quad(A[0], B[0], B[1], A[1], cc, lit + .1); quad(A[1], B[1], B[2], A[2], cc, .8); quad(A[3], A[2], B[2], B[3], cc, .5); quad(A[0], A[3], B[3], B[0], cc, .7); });
      if (i % 2 === 0) { const a = q.p.clone().addScaledVector(q.r, -.62), b = q.p.clone().addScaledVector(q.r, .62), c = q.p.clone().addScaledVector(q.u, -.42), d = c.clone().addScaledVector(q.f, .12), a2 = a.clone().addScaledVector(q.f, .12), b2 = b.clone().addScaledVector(q.f, .12);
        quad(a, c, d, a2, cB, .75); quad(c, b, b2, d, cB, .75); quad(a2, d, c, a, cB, .55); quad(d, b2, b, c, cB, .55); }
      if (i % 11 === 0 && q.u.y > .25) { const base = q.p.clone().addScaledVector(q.u, -.6); if (base.y > 1.2) posts.push(base); }
      prev = q; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(colr, 3)); W.disposables.push(g);
    const m = mesh(g, basic({ vertexColors: true, side: THREE.DoubleSide }), parent); m.frustumCulled = false;
    if (posts.length) hvBake(posts.map((b) => [hvCY(.2, .3, b.y + 2, 7), "#aab2ba", new THREE.Matrix4().makeTranslation(b.x, (b.y - 2) / 2, b.z)]), parent);
    return m;
  }
  /* alagút a pálya egy szakasza köré (belülről látszik): sötét cső, színes fénygyűrűkkel */
  function hvTunnel(TR, s0, s1, parent) {
    const pos = [], colr = [], fr = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3() }, R = new THREE.Vector3(), SEG = 14, rad = 4.6, step = 2.2;
    const ring = (s) => { TR.at(s, fr); R.crossVectors(fr.f, fr.u).normalize(); const c = fr.p.clone().addScaledVector(fr.u, 1.7), a = []; for (let k = 0; k <= SEG; k++) { const t = k / SEG * TAU; a.push(c.clone().addScaledVector(R, Math.cos(t) * rad).addScaledVector(fr.u, Math.sin(t) * rad)); } return a; };
    let A = ring(s0), i = 0; const neon = ["#ff3d6e", "#ffd166", "#35e0ff", "#7dff6a", "#c77dff"];
    for (let s = s0 + step; s <= s1; s += step, i++) { const B = ring(s), lit = i % 3 === 0, c = new THREE.Color(lit ? neon[(i / 3) % neon.length | 0] : "#0b0f1a");
      for (let k = 0; k < SEG; k++) { [A[k], A[k + 1], B[k + 1], A[k], B[k + 1], B[k]].forEach((v) => { pos.push(v.x, v.y, v.z); const sh = lit ? 1 : .6 + .4 * (k % 2); colr.push(c.r * sh, c.g * sh, c.b * sh); }); } A = B; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(colr, 3)); W.disposables.push(g);
    const m = mesh(g, basic({ vertexColors: true, side: THREE.DoubleSide, fog: false }), parent); m.frustumCulled = false; return m;
  }
  /* ---------- díszletek: a Balaton nevezetességei (alacsony poligonszám, kisütve) ---------- */
  function hvHill(L, x, z, r, h, col, top) { const g = hvCY(r * (top || .25), r, h, 18); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const k = 1 + .09 * Math.sin(P.getX(i) * .31 + P.getZ(i) * .17) + .06 * Math.sin(P.getZ(i) * .43); P.setX(i, P.getX(i) * k); P.setZ(i, P.getZ(i) * k); } L.push([g, col, new THREE.Matrix4().makeTranslation(x, h / 2 - .5, z)]); }
  function hvTrees(L, x, z, r, n, y, seed) { for (let i = 0; i < n; i++) { const a = (i * 2.399 + seed) % TAU, d = r * Math.sqrt(((i * 7 + 3) % n + .5) / n), tx = x + Math.cos(a) * d, tz = z + Math.sin(a) * d, hh = 3 + (i % 4); L.push([hvCO(1.6 + (i % 3) * .5, hh * 1.6, 7), i % 3 ? "#2f7a3e" : "#3f8f4a", new THREE.Matrix4().makeTranslation(tx, y + hh, tz)]); L.push([hvCY(.25, .3, 1.6, 5), "#5a4030", new THREE.Matrix4().makeTranslation(tx, y + .6, tz)]); } }
  function hvScenery(env) {
    const L = [], T4 = (x, y, z, ry) => { const m = new THREE.Matrix4().makeRotationY(ry || 0); m.setPosition(x, y, z); return m; };
    /* TIHANYI APÁTSÁG: félsziget dombja, kéttornyú barokk templom, kolostorszárny */
    { const X = -196, Z = -228, H = 34; hvHill(L, X, Z, 78, H, "#5f9a4e", .5); hvHill(L, X + 60, Z + 50, 46, 14, "#6aa457", .5); hvTrees(L, X, Z, 60, 26, H * .55, 1);
      L.push([hvBX(15, 14, 34), "#f2e6c4", T4(X, H + 6.5, Z)], [hvCY(.01, 9.6, 6, 4), "#b5492f", (() => { const m = new THREE.Matrix4().makeRotationY(Math.PI / 4); m.premultiply(new THREE.Matrix4().makeScale(1, 1, 2.6)); m.setPosition(X, H + 16.5, Z); return m; })()]);
      [-5.2, 5.2].forEach((dx) => { L.push([hvBX(6, 26, 6), "#f6ecd0", T4(X + dx, H + 12.5, Z + 15)], [hvBX(6.6, 1, 6.6), "#d9c9a0", T4(X + dx, H + 20, Z + 15)], [hvSP(3.3), "#3f6e5a", T4(X + dx, H + 27, Z + 15)], [hvCO(1.5, 6, 8), "#3f6e5a", T4(X + dx, H + 32, Z + 15)], [hvBX(.25, 3, .25), "#e4bb63", T4(X + dx, H + 36, Z + 15)], [hvBX(1.4, .25, .25), "#e4bb63", T4(X + dx, H + 36.4, Z + 15)]);
        [0, 6].forEach((dy) => L.push([hvBX(1.6, 3.4, .3), "#3a4658", T4(X + dx, H + 9 + dy, Z + 18.1)])); });
      L.push([hvBX(3, 6, .4), "#5a3a22", T4(X, H + 3, Z + 17.2)], [hvBX(40, 9, 12), "#efe2bd", T4(X - 26, H + 4, Z - 6)], [hvBX(41, 3, 13), "#b5492f", T4(X - 26, H + 10, Z - 6)]);
      for (let k = 0; k < 9; k++) L.push([hvBX(1.5, 2.6, .3), "#3a4658", T4(X - 42 + k * 4, H + 5, Z + .2)]); }
    /* BADACSONY: lapos tetejű bazalthegy, bazaltorgonák, szőlősorok, présházak */
    { const X = 238, Z = -402, H = 70; hvHill(L, X, Z, 64, 22, "#6aa457", .84); hvHill(L, X, Z, 52, H * .72, "#4f8a46", .84); hvHill(L, X, Z, 42, H, "#3f7a3c", .88);
      for (let k = 0; k < 26; k++) { const a = k / 26 * TAU; L.push([hvBX(3.2, 16 + (k % 3) * 4, 3.2), k % 2 ? "#5b5f66" : "#6c7078", T4(X + Math.cos(a) * 40, H * .72 + 4, Z + Math.sin(a) * 40, -a)]); }
      for (let r = 0; r < 4; r++) for (let k = 0; k < 30; k++) { const a = k / 30 * TAU; if (Math.sin(a) < -.2) continue; L.push([hvBX(5.5, .9, .7), r % 2 ? "#8fbf4f" : "#7aad42", T4(X + Math.cos(a) * (53 + r * 3.2), 20 - r * 4.6, Z + Math.sin(a) * (53 + r * 3.2), -a + Math.PI / 2)]); }
      [[56, 20], [-50, 34], [10, 60]].forEach(([dx, dz]) => { L.push([hvBX(6, 4, 5), "#f4efe2", T4(X + dx, 12, Z + dz)], [hvCY(.01, 4.6, 3, 4), "#a8452c", T4(X + dx, 15.5, Z + dz, Math.PI / 4)]); }); }
    /* SZIGLIGETI VÁR: várhegy, romos falak, öregtorony, zászló */
    { const X = 58, Z = -415, H = 46; hvHill(L, X, Z, 62, H, "#5a9550", .42); hvTrees(L, X, Z, 52, 22, H * .4, 4);
      const wl = (dx, dz, w, h, d, ry) => L.push([hvBX(w, h, d), (dx + dz) % 2 ? "#b9ab93" : "#a89a82", T4(X + dx, H + h / 2 - 1, Z + dz, ry)]);
      wl(-14, 0, 2, 9, 30); wl(14, 2, 2, 6, 26); wl(0, -14, 30, 7, 2); wl(-4, 14, 20, 4.5, 2); wl(-13, -13, 6, 15, 6); wl(12, 12, 5, 10, 5); wl(3, -2, 9, 5, 1.6, .5); wl(-6, 6, 1.6, 7, 9, .2);
      for (let k = 0; k < 7; k++) L.push([hvBX(1.6, 1.6, 2.1), "#b9ab93", T4(X - 14, H + 9, Z - 12 + k * 4)]);
      L.push([hvCY(.15, .15, 9, 5), "#5a4030", T4(X - 13, H + 18, Z - 13)], [hvBX(4, 2.4, .12), "#d61f26", T4(X - 11, H + 21, Z - 13)]); }
    /* FÜREDI MÓLÓ: hosszú móló kandeláberekkel, a végén világítótorony, mellette sétahajó */
    { const X = 150, Z = -55; L.push([hvBX(8, 1.2, 90), "#c9c4b6", T4(X, 1.4, Z)], [hvBX(8.6, .3, 90.6), "#e3ded0", T4(X, 2.1, Z)], [hvBX(60, 3, 14), "#c9c4b6", T4(X + 10, .6, Z + 52)], [hvBX(64, .6, 18), "#7fb069", T4(X + 10, 2.3, Z + 54)]);
      for (let k = 0; k < 9; k++) { const z = Z - 40 + k * 10; [-3.6, 3.6].forEach((dx) => { L.push([hvCY(.12, .16, 4.2, 6), "#22262c", T4(X + dx, 4.2, z)], [hvSP(.42), "#ffe7a8", T4(X + dx, 6.5, z)]); }); L.push([hvCY(.5, .5, 5, 7), "#8c8676", T4(X - 3, -1.2, z)], [hvCY(.5, .5, 5, 7), "#8c8676", T4(X + 3, -1.2, z)]); }
      L.push([hvCY(1.3, 1.9, 11, 12), "#f5f5f0", T4(X, 7.6, Z - 43)], [hvCY(1.6, 1.6, 1.2, 12), "#d61f26", T4(X, 9, Z - 43)], [hvCY(1.1, 1.1, 2, 10), "#ffe7a8", T4(X, 14, Z - 43)], [hvCO(1.7, 2.2, 10), "#d61f26", T4(X, 16.1, Z - 43)]);
      const SX = X - 20, SZ = Z - 8; L.push([hvBX(8, 3, 34), "#f7f7f2", T4(SX, 1.2, SZ)], [hvBX(8.2, .6, 34.4), "#141d4d", T4(SX, .2, SZ)], [hvBX(6.4, 2.6, 20), "#ffffff", T4(SX, 4, SZ + 2)], [hvBX(5, 2.2, 8), "#f1f1ea", T4(SX, 6.4, SZ + 4)], [hvCY(.8, 1, 3, 10), "#d61f26", T4(SX, 8.6, SZ + 2)]);
      for (let k = 0; k < 8; k++) L.push([hvBX(.1, 1.2, 1.5), "#27425f", T4(SX + 3.25, 4.2, SZ - 6 + k * 2.3)], [hvBX(.1, 1.2, 1.5), "#27425f", T4(SX - 3.25, 4.2, SZ - 6 + k * 2.3)]);
      hvTrees(L, X + 14, Z + 58, 22, 9, 2.4, 2); }
    /* KESZTHELY – FESTETICS-KASTÉLY: hosszú barokk palota manzárdtetővel, középtorony kupolával, park */
    { const X = -185, Z = 78, Y = 4; L.push([hvCY(84, 92, Y + 1, 22), "#79b062", T4(X, Y / 2 - .5, Z)]);
      const ry = .5, R = (dx, dz) => [X + dx * Math.cos(ry) + dz * Math.sin(ry), Z - dx * Math.sin(ry) + dz * Math.cos(ry)];
      const bx = (w, h, d, dx, y, dz, col) => { const [x, z] = R(dx, dz); L.push([hvBX(w, h, d), col, T4(x, Y + y, z, ry)]); };
      bx(84, 13, 13, 0, 6.5, 0, "#f3e2a6"); bx(85, 4.5, 14, 0, 15, 0, "#5b5e66"); bx(80, 1.5, 9, 0, 18, 0, "#4b4e56");
      [-36, 36].forEach((dx) => { bx(14, 13, 34, dx, 6.5, 14, "#f3e2a6"); bx(15, 4.5, 35, dx, 15, 14, "#5b5e66"); });
      bx(12, 30, 12, 0, 15, 2, "#f6e8b4"); bx(13, 1.2, 13, 0, 30, 2, "#e0cf93"); { const [x, z] = R(0, 2); L.push([hvSP(6.4), "#5b5e66", T4(x, Y + 33, z)], [hvCY(1.6, 2.2, 5, 8), "#f6e8b4", T4(x, Y + 40.5, z)], [hvCO(2.2, 5, 8), "#5b5e66", T4(x, Y + 45.5, z)], [hvBX(.3, 4, .3), "#e4bb63", T4(x, Y + 50, z)]); }
      for (let k = 0; k < 19; k++) { if (Math.abs(k - 9) < 2) continue; [3.4, 9.4].forEach((y) => bx(2, 3.2, .3, -38 + k * 4.2, y, 6.6, "#3a4658")); }
      bx(4, 6, .4, 0, 3, 8.2, "#5a3a22"); bx(30, .4, 30, 0, .3, 34, "#e9dcb0"); { const [x, z] = R(0, 34); L.push([hvCY(5, 5.6, 1, 14), "#c9c4b6", T4(x, Y + .6, z)], [hvCY(.5, .8, 3.4, 8), "#c9c4b6", T4(x, Y + 2.6, z)], [hvSP(1.2), "#9fd8ef", T4(x, Y + 4.6, z)]); }
      hvTrees(L, X - 30, Z + 44, 34, 16, Y, 7); hvTrees(L, X + 52, Z + 30, 20, 9, Y, 3); }
    /* a két állomás: fa stég tetővel */
    [[-14, "#2b5ea8"], [200, "#d61f26"]].forEach(([x, c]) => { L.push([hvBX(5, .4, 26), "#b98a55", T4(x - 4.4, 2.3, 0)], [hvBX(5, .4, 26), "#b98a55", T4(x + 4.4, 2.3, 0)], [hvBX(15, .5, 22), c, T4(x, 8.4, 0)], [hvBX(16, .3, 23), "#f5f2e8", T4(x, 8.8, 0)]);
      [[-6.6, -10], [6.6, -10], [-6.6, 10], [6.6, 10]].forEach(([dx, dz]) => L.push([hvCY(.28, .28, 6.2, 7), "#f5f2e8", T4(x + dx, 5.3, dz)], [hvCY(.4, .5, 5, 7), "#8a6239", T4(x + dx, 0, dz)])); L.push([hvBX(26, .4, 4), "#b98a55", T4(x - 19.5, 2.3, 11)]); });
    hvBake(L, env);
    hvLabel("Tihanyi apátság", "alapítva 1055-ben", -196, 84, -228, env, 70); hvLabel("Badacsony", "bazalthegy · 438 m", 238, 94, -402, env, 80); hvLabel("Szigligeti vár", "a Balaton vára", 58, 80, -415, env, 64);
    hvLabel("Balatonfüredi móló", "", 150, 26, -70, env, 54); hvLabel("Festetics-kastély", "Keszthely", -185, 66, 78, env, 70);
    hvLabel("NYUGODT MENET", "Zephyr-állomás", -14, 14, 0, env, 26); hvLabel("VAD MENET ⚠", "csak bátraknak", 200, 14, 0, env, 26);
  }
  /* ---------- a két pálya ---------- */
  function hvCalmPts() { return [[-14, 3, 14], [-14, 3, -14], [-16, 3.4, -48], [-30, 6, -92], [-62, 9, -140], [-92, 12, -176], [-104, 9, -232], [-84, 6, -286], [-44, 5, -322], [8, 8, -338], [62, 11, -330], [112, 13, -296], [142, 10, -232], [136, 6, -160], [118, 5, -104], [112, 4.2, -52], [96, 6, -6], [58, 9, 34], [8, 8, 58], [-52, 7, 70], [-104, 5.5, 58], [-128, 4.4, 26], [-112, 4, -2], [-74, 4.4, 14], [-40, 4, 34], [-18, 3.4, 34]]; }
  function hvWildPts() {
    const X = 200, a = [[X, 3, 14], [X, 3, -12], [X, 3.4, -34], [X, 20, -72], [X, 42, -116], [X, 60, -152], [X, 63.5, -166], [X, 57, -178], [X, 35, -193], [X, 11, -207], [X, 3.2, -224]];
    const lc = [X, 17, -246], R = 14; for (let k = 0; k <= 8; k++) { const t = k / 8 * TAU, p = [X + 7 * k / 8, lc[1] - R * Math.cos(t), lc[2] - R * Math.sin(t)]; a.push([p[0], p[1], p[2], [0, lc[1] - p[1], lc[2] - p[2]]]); }
    a.push([X + 7, 3.4, -268], [X + 7, 14, -290], [X + 7, 23, -306], [X + 7, 12, -323], [X + 7, 5, -340], [X + 8, 5, -360], [X + 14, 6, -384], [X + 30, 7, -401], [X + 50, 8, -407], [X + 72, 10, -398], [X + 86, 12, -374], [X + 88, 10.5, -348], [X + 86, 9, -326]);
    const ax = [X + 86, 14], r = 5; for (let k = 0; k <= 8; k++) { const t = k / 8 * TAU, p = [ax[0] - r * Math.sin(t), ax[1] - r * Math.cos(t), -312 + 66 * k / 8]; a.push([p[0], p[1], p[2], [ax[0] - p[0], ax[1] - p[1], 0]]); }
    a.push([X + 86, 9.5, -232], [X + 86, 17, -204], [X + 84, 6, -170], [X + 80, 4, -132], [X + 70, 3, -94], [X + 62, 1.5, -62], [X + 50, 3, -30], [X + 36, 6.5, 0], [X + 22, 7, 28], [X + 8, 5, 40], [X, 3.6, 32]);
    return a;
  }
  function buildCoaster() {
    const root = W.root, env = new THREE.Group(), far = new THREE.Group(); root.add(env); env.add(far); HV.env = env; HV.far = far; env.matrixAutoUpdate = false;
    makeSky(far); makeShores(far);
    HV.water = makeWater(env);
    hvScenery(env);
    HV.calm = hvTrack(hvCalmPts(), { bank: 5 }); HV.wild = hvTrack(hvWildPts(), { bank: 9 });
    hvRails(HV.calm, env, "#2b5ea8"); hvRails(HV.wild, env, "#d61f26", "#22262c");
    /* a vad pálya jellemző pontjai (ívhossz): a felhúzás vége, az alagút, a fékezés */
    HV.wild.sLift = HV.wild.sOf(6) - 4; HV.wild.sTun0 = HV.wild.sOf(25) - 22; HV.wild.sTun1 = HV.wild.sOf(30) + 14; hvTunnel(HV.wild, HV.wild.sTun0, HV.wild.sTun1, env);
    /* a Zephyr a sínen: a hajó áll, a világ mozog; a néző a kokpitban ül (a kormányos helyén) */
    const ride = new THREE.Group(); root.add(ride); HV.ride = ride;
    const boat = makeBoat({ detail: 0, crew: 0, hull: "#f5f2e8", boot: "#141d4d", stripe: "#141d4d", jib: "#f6f4ec", main: "#d61f26", num: " ", cls: " ", logoImg: "img/zephyr-hajo-logo.png", reg: "H-30381", lazyBag: "#6e1423", nsCol: "#3f6fa6", teakDeck: true, flag: true });
    boat.rotation.y = Math.PI; ride.add(boat); HV.boat = boat; const BS = boat.userData.S; if (BS) { BS.awa = 38; BS.aws = 7; BS.gust = 1; BS.side = 1; BS.boom = .22; BS.jib = .2; BS.heel = 0; BS.pitch = 0; }
    { const L = []; [-1, 1].forEach((sd) => { L.push([hvBX(.5, .3, 6.4), "#22262c", new THREE.Matrix4().makeTranslation(sd * .62, -.72, 0)]); [-2.2, 0, 2.2].forEach((z) => L.push([hvCY(.24, .24, .16, 12).rotateZ(Math.PI / 2), "#e4bb63", new THREE.Matrix4().makeTranslation(sd * .62, -.86, z)])); });
      L.push([hvBX(1.6, .22, 5.6), "#3b4a66", new THREE.Matrix4().makeTranslation(0, -.56, 0)]); hvBake(L, ride); }
    try { vrBake(boat); } catch (e) {}
    /* élet a vízen: két horgonyzó vitorlás a nyugodt pálya mellett (kisütve), lassan ringanak */
    HV.deco = [[BOATS[1], 40, -150, 2.2], [BOATS[6], -60, -40, -.9]].map(([o, x, z, ry]) => { const g = makeBoat(Object.assign({ detail: 0, crew: 2 }, o)); g.position.set(x, 0, z); g.rotation.y = ry; env.add(g); const S2 = g.userData.S; if (S2) { S2.awa = 60; S2.aws = 5; S2.side = 1; S2.boom = .5; S2.jib = .4; } try { vrBake(g); } catch (e) {} return g; });
    HV.lights = addLights(SUN.clone());
    HV.st = "station"; HV.s = 0; HV.v = 0; HV.warn = false; HV.t = 0; HV.fr = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3() }; HV.q = new THREE.Quaternion(); HV.shake = 0;
    hvPlace(); hvApply(0);
    faceYaw(0); audioStart({ water: .02, wind: .015 });
    return { tick: hvTick, panel: hvPanel, hud: hvHud };
  }
  function hvPlace() { const hy = T.inVR ? Math.max(1.0, T.headY()) : T.headY(); HV.ride.position.set(-.42, hy - 1.52, -2.55); }   /* szem: a kokpit jobb oldalán ülve, 1,5 m-rel a vízvonal fölött */
  function hvTrackNow() { return HV.mode === "wild" ? HV.wild : HV.calm; }
  function hvApply(dt) {
    const TR = hvTrackNow(), fr = TR.at(HV.s, HV.fr), R = new THREE.Vector3().crossVectors(fr.f, fr.u).normalize(), nz = fr.f.clone().negate();
    const m = new THREE.Matrix4().makeBasis(R, fr.u, nz); m.setPosition(fr.p); m.invert();
    const a = HV.ride.position, sh = HV.shake, t = W.t;
    const pre = new THREE.Matrix4().makeTranslation(a.x + Math.sin(t * 47) * .012 * sh, a.y - .62 + Math.sin(t * 61) * .014 * sh, a.z);
    HV.env.matrix.copy(pre.multiply(m)); HV.env.matrixWorldNeedsUpdate = true;
    HV.far.position.set(fr.p.x, 0, fr.p.z);
    const wm = HV.water; wm.position.set(Math.round(fr.p.x / 40) * 40, 0, Math.round(fr.p.z / 40) * 40); const mat = wm.userData.mat; if (mat) { mat.uniforms.uT.value = W.t; mat.uniforms.uOff.value.set(wm.position.x, wm.position.z); if (mat.uniforms.uCam) { try { const cw = new THREE.Vector3(); T.camObj().getWorldPosition(cw); HV.env.updateMatrixWorld(true); mat.uniforms.uCam.value.copy(HV.env.worldToLocal(cw)); } catch (e) { mat.uniforms.uCam.value.copy(fr.p); } } }
    HV.slope = fr.f.y; HV.alt = fr.p.y;
  }
  function hvStart(mode) { HV.mode = mode; HV.st = "ride"; HV.s = 0; HV.v = .5; HV.warn = false; HV.lap = 0; HV.t = 0; W.panelDirty = 1; try { T.sfx && T.sfx("click"); } catch (e) {} }
  function hvStop() { HV.st = "station"; HV.s = 0; HV.v = 0; HV.warn = false; HV.shake = 0; hvApply(0); AU.set("rush", 0, .3); AU.set("wind", .015, .5); W.panelDirty = 1; }
  function hvTick(dt) {
    dt = Math.min(dt, .05); if (T.inVR !== HV.wasVR) { HV.wasVR = T.inVR; hvPlace(); }
    const b = HV.boat; if (b && b.userData.update) { const BS = b.userData.S; if (BS) { BS.aws = 5 + HV.v * .5; BS.awa = 34; BS.t = W.t; } b.userData.update(dt); }
    (HV.deco || []).forEach((g, i) => { const S2 = g.userData.S; if (S2) { S2.heel = .05 + Math.sin(W.t * .7 + i) * .03; S2.pitch = Math.sin(W.t * .9 + i * 2) * .02; } g.position.y = Math.sin(W.t * .8 + i) * .06; if (g.userData.update) g.userData.update(dt); });
    if (HV.st !== "ride") { hvApply(dt); return; }
    const TR = hvTrackNow(), g = 9.81; HV.t += dt; let tgt;
    if (HV.mode === "wild") {
      const y = HV.alt || 3;
      if (HV.s < TR.sLift) { tgt = HV.s < 30 ? 4 : 5.2;                                 /* lassú, kattogó felhúzás */
        if (HV.s > 30 && Math.floor(HV.s / .55) !== HV.clk) { HV.clk = Math.floor(HV.s / .55); try { const a = T.ac(); if (a) { const o = a.createOscillator(), gn = a.createGain(); o.type = "square"; o.frequency.value = 150 + (HV.clk % 2) * 40; gn.gain.setValueAtTime(.035, a.currentTime); gn.gain.exponentialRampToValueAtTime(.0001, a.currentTime + .045); o.connect(gn).connect(T.outBus()); o.start(); o.stop(a.currentTime + .06); } } catch (e) {} } }
      else tgt = Math.sqrt(Math.max(36, 2 * g * (63.5 - y) * .9 + 30));                 /* szabadesés: az energia a magasságból */
      if (HV.s > TR.L - 120) tgt = Math.min(tgt, 5 + (TR.L - HV.s) * .16);              /* fékezés az állomás előtt */
      HV.v += clamp(tgt - HV.v, -14 * dt, (HV.s < TR.sLift ? 3 : 40) * dt);
    } else { tgt = 7.5 - (HV.slope || 0) * 9; if (HV.s > TR.L - 40) tgt = Math.min(tgt, 2 + (TR.L - HV.s) * .14); HV.v += clamp(tgt - HV.v, -3 * dt, 1.6 * dt); }
    HV.s += Math.max(.4, HV.v) * dt;
    if (HV.s >= TR.L - .5) { hvStop(); return; }
    HV.shake = HV.mode === "wild" ? clamp((HV.v - 8) / 22, 0, 1) : 0;
    hvApply(dt);
    AU.set("rush", clamp(HV.v / 32, 0, 1) * .16, .2); AU.set("wind", .02 + clamp(HV.v / 30, 0, 1) * .12, .2);
    HV.hudT = (HV.hudT || 0) + dt; if (HV.hudT > .5) { HV.hudT = 0; W.panelDirty = 1; }
  }
  function hvInfo() {
    if (HV.st !== "ride") return HV.warn ? "⚠ VAD MENET: 60 m-es zuhanás, hurok, dugóhúzó, alagút – erős gyomor kell! Rosszullétre hajlamosaknak, kisgyerekeknek NEM ajánlott. VR-ben ülj le!" : "Ülj be a Zephyrbe! Válassz: nyugodt városnéző kör, vagy a vad menet.";
    const TR = hvTrackNow(), kmh = Math.round(HV.v * 3.6), pct = Math.round(HV.s / TR.L * 100);
    return `${HV.mode === "wild" ? "VAD MENET" : "Nyugodt menet"} · ${kmh} km/h · magasság ${Math.round(HV.alt || 0)} m · ${pct}%`;
  }
  function hvButtons() {
    if (HV.st === "ride") return [["■ Kiszállok (megállás)", hvStop], ["‹ Vissza a sétához", () => W.close()]];
    if (HV.warn) return [["✔ Vállalom – INDULJON a vad menet!", () => hvStart("wild")], ["Mégsem", () => { HV.warn = false; W.panelDirty = 1; }]];
    return [["⛵ Nyugodt menet", () => hvStart("calm")], ["⚡ VAD menet ⚠", () => { HV.warn = true; W.panelDirty = 1; }], ["‹ Vissza a sétához", () => W.close()]];
  }
  function hvPanel(P) {
    P.title("Balatoni hullámvasút", hvInfo());
    P.row(0, "Nyugodt menet: Tihany · Szigliget · Badacsony · füredi móló · Festetics-kastély", "#7fd3ff");
    P.row(1, "Vad menet: lassú felhúzás 63 m-re · szabadesés · hurok · alagút · dugóhúzó", "#ff8a8a");
    P.row(2, "Bármikor kiszállhatsz: „Kiszállok” – a hajó azonnal megáll az állomáson.", "#ffd166");
    P.buttons(hvButtons());
  }
  function hvHud(H) {
    H.title("Balatoni hullámvasút", hvInfo());
    H.buttons(hvButtons().map(([l, f]) => [l, f, false]));
    H.hint("Húzással körbenézel · a hajó a sínen megy, te a kokpitban ülsz · bármikor kiszállhatsz");
  }
