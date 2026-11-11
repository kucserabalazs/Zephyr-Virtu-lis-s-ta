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
    const m = mesh(mergeGeoms(list), basic(Object.assign({ vertexColors: true }, opt || {})), parent); m.matrixAutoUpdate = false; m.updateMatrix(); if (HVK.max && parent !== HV.ride) m.castShadow = true; return m;
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
  const hvT4 = (x, y, z, ry) => { const m = new THREE.Matrix4().makeRotationY(ry || 0); m.setPosition(x, y, z); return m; };
  function hvAbbey(L) { const T4 = hvT4;
    { const X = 0, Z = 0, H = 34; hvHill(L, X, Z, 78, H, "#5f9a4e", .5); hvHill(L, X + 60, Z + 50, 46, 14, "#6aa457", .5); hvTrees(L, X, Z, 60, 26, H * .55, 1);
      L.push([hvBX(15, 14, 34), "#f2e6c4", T4(X, H + 6.5, Z)], [hvCY(.01, 9.6, 6, 4), "#b5492f", (() => { const m = new THREE.Matrix4().makeRotationY(Math.PI / 4); m.premultiply(new THREE.Matrix4().makeScale(1, 1, 2.6)); m.setPosition(X, H + 16.5, Z); return m; })()]);
      [-5.2, 5.2].forEach((dx) => { L.push([hvBX(6, 26, 6), "#f6ecd0", T4(X + dx, H + 12.5, Z + 15)], [hvBX(6.6, 1, 6.6), "#d9c9a0", T4(X + dx, H + 20, Z + 15)], [hvSP(3.3), "#3f6e5a", T4(X + dx, H + 27, Z + 15)], [hvCO(1.5, 6, 8), "#3f6e5a", T4(X + dx, H + 32, Z + 15)], [hvBX(.25, 3, .25), "#e4bb63", T4(X + dx, H + 36, Z + 15)], [hvBX(1.4, .25, .25), "#e4bb63", T4(X + dx, H + 36.4, Z + 15)]);
        [0, 6].forEach((dy) => L.push([hvBX(1.6, 3.4, .3), "#3a4658", T4(X + dx, H + 9 + dy, Z + 18.1)])); });
      L.push([hvBX(3, 6, .4), "#5a3a22", T4(X, H + 3, Z + 17.2)], [hvBX(40, 9, 12), "#efe2bd", T4(X - 26, H + 4, Z - 6)], [hvBX(41, 3, 13), "#b5492f", T4(X - 26, H + 10, Z - 6)]);
      for (let k = 0; k < 9; k++) L.push([hvBX(1.5, 2.6, .3), "#3a4658", T4(X - 42 + k * 4, H + 5, Z + .2)]); }
  }
  function hvBadacsony(L) { const T4 = hvT4;
    { const X = 0, Z = 0, H = 70; hvHill(L, X, Z, 64, 22, "#6aa457", .84); hvHill(L, X, Z, 52, H * .72, "#4f8a46", .84); hvHill(L, X, Z, 42, H, "#3f7a3c", .88);
      for (let k = 0; k < 26; k++) { const a = k / 26 * TAU; L.push([hvBX(3.2, 16 + (k % 3) * 4, 3.2), k % 2 ? "#5b5f66" : "#6c7078", T4(X + Math.cos(a) * 40, H * .72 + 4, Z + Math.sin(a) * 40, -a)]); }
      for (let r = 0; r < 4; r++) for (let k = 0; k < 30; k++) { const a = k / 30 * TAU; if (Math.sin(a) < -.2) continue; L.push([hvBX(5.5, .9, .7), r % 2 ? "#8fbf4f" : "#7aad42", T4(X + Math.cos(a) * (53 + r * 3.2), 20 - r * 4.6, Z + Math.sin(a) * (53 + r * 3.2), -a + Math.PI / 2)]); }
      [[56, 20], [-50, 34], [10, 60]].forEach(([dx, dz]) => { L.push([hvBX(6, 4, 5), "#f4efe2", T4(X + dx, 12, Z + dz)], [hvCY(.01, 4.6, 3, 4), "#a8452c", T4(X + dx, 15.5, Z + dz, Math.PI / 4)]); }); }
  }
  function hvSzigliget(L) { const T4 = hvT4;
    { const X = 0, Z = 0, H = 46; hvHill(L, X, Z, 62, H, "#5a9550", .42); hvTrees(L, X, Z, 52, 22, H * .4, 4);
      const wl = (dx, dz, w, h, d, ry) => L.push([hvBX(w, h, d), (dx + dz) % 2 ? "#b9ab93" : "#a89a82", T4(X + dx, H + h / 2 - 1, Z + dz, ry)]);
      wl(-14, 0, 2, 9, 30); wl(14, 2, 2, 6, 26); wl(0, -14, 30, 7, 2); wl(-4, 14, 20, 4.5, 2); wl(-13, -13, 6, 15, 6); wl(12, 12, 5, 10, 5); wl(3, -2, 9, 5, 1.6, .5); wl(-6, 6, 1.6, 7, 9, .2);
      for (let k = 0; k < 7; k++) L.push([hvBX(1.6, 1.6, 2.1), "#b9ab93", T4(X - 14, H + 9, Z - 12 + k * 4)]);
      L.push([hvCY(.15, .15, 9, 5), "#5a4030", T4(X - 13, H + 18, Z - 13)], [hvBX(4, 2.4, .12), "#d61f26", T4(X - 11, H + 21, Z - 13)]); }
  }
  function hvPier(L) { const T4 = hvT4;
    { const X = 0, Z = 0; L.push([hvBX(8, 1.2, 90), "#c9c4b6", T4(X, 1.4, Z)], [hvBX(8.6, .3, 90.6), "#e3ded0", T4(X, 2.1, Z)], [hvBX(60, 3, 14), "#c9c4b6", T4(X + 10, .6, Z + 52)], [hvBX(64, .6, 18), "#7fb069", T4(X + 10, 2.3, Z + 54)]);
      for (let k = 0; k < 9; k++) { const z = Z - 40 + k * 10; [-3.6, 3.6].forEach((dx) => { L.push([hvCY(.12, .16, 4.2, 6), "#22262c", T4(X + dx, 4.2, z)], [hvSP(.42), "#ffe7a8", T4(X + dx, 6.5, z)]); }); L.push([hvCY(.5, .5, 5, 7), "#8c8676", T4(X - 3, -1.2, z)], [hvCY(.5, .5, 5, 7), "#8c8676", T4(X + 3, -1.2, z)]); }
      L.push([hvCY(1.3, 1.9, 11, 12), "#f5f5f0", T4(X, 7.6, Z - 43)], [hvCY(1.6, 1.6, 1.2, 12), "#d61f26", T4(X, 9, Z - 43)], [hvCY(1.1, 1.1, 2, 10), "#ffe7a8", T4(X, 14, Z - 43)], [hvCO(1.7, 2.2, 10), "#d61f26", T4(X, 16.1, Z - 43)]);
      const SX = X - 20, SZ = Z - 8; L.push([hvBX(8, 3, 34), "#f7f7f2", T4(SX, 1.2, SZ)], [hvBX(8.2, .6, 34.4), "#141d4d", T4(SX, .2, SZ)], [hvBX(6.4, 2.6, 20), "#ffffff", T4(SX, 4, SZ + 2)], [hvBX(5, 2.2, 8), "#f1f1ea", T4(SX, 6.4, SZ + 4)], [hvCY(.8, 1, 3, 10), "#d61f26", T4(SX, 8.6, SZ + 2)]);
      for (let k = 0; k < 8; k++) L.push([hvBX(.1, 1.2, 1.5), "#27425f", T4(SX + 3.25, 4.2, SZ - 6 + k * 2.3)], [hvBX(.1, 1.2, 1.5), "#27425f", T4(SX - 3.25, 4.2, SZ - 6 + k * 2.3)]);
      hvTrees(L, X + 14, Z + 58, 22, 9, 2.4, 2); }
  }
  function hvFestetics(L) { const T4 = hvT4;
    { const X = 0, Z = 0, Y = 4; L.push([hvCY(84, 92, Y + 1, 22), "#79b062", T4(X, Y / 2 - .5, Z)]);
      const ry = .5, R = (dx, dz) => [X + dx * Math.cos(ry) + dz * Math.sin(ry), Z - dx * Math.sin(ry) + dz * Math.cos(ry)];
      const bx = (w, h, d, dx, y, dz, col) => { const [x, z] = R(dx, dz); L.push([hvBX(w, h, d), col, T4(x, Y + y, z, ry)]); };
      bx(84, 13, 13, 0, 6.5, 0, "#f3e2a6"); bx(85, 4.5, 14, 0, 15, 0, "#5b5e66"); bx(80, 1.5, 9, 0, 18, 0, "#4b4e56");
      [-36, 36].forEach((dx) => { bx(14, 13, 34, dx, 6.5, 14, "#f3e2a6"); bx(15, 4.5, 35, dx, 15, 14, "#5b5e66"); });
      bx(12, 30, 12, 0, 15, 2, "#f6e8b4"); bx(13, 1.2, 13, 0, 30, 2, "#e0cf93"); { const [x, z] = R(0, 2); L.push([hvSP(6.4), "#5b5e66", T4(x, Y + 33, z)], [hvCY(1.6, 2.2, 5, 8), "#f6e8b4", T4(x, Y + 40.5, z)], [hvCO(2.2, 5, 8), "#5b5e66", T4(x, Y + 45.5, z)], [hvBX(.3, 4, .3), "#e4bb63", T4(x, Y + 50, z)]); }
      for (let k = 0; k < 19; k++) { if (Math.abs(k - 9) < 2) continue; [3.4, 9.4].forEach((y) => bx(2, 3.2, .3, -38 + k * 4.2, y, 6.6, "#3a4658")); }
      bx(4, 6, .4, 0, 3, 8.2, "#5a3a22"); bx(30, .4, 30, 0, .3, 34, "#e9dcb0"); { const [x, z] = R(0, 34); L.push([hvCY(5, 5.6, 1, 14), "#c9c4b6", T4(x, Y + .6, z)], [hvCY(.5, .8, 3.4, 8), "#c9c4b6", T4(x, Y + 2.6, z)], [hvSP(1.2), "#9fd8ef", T4(x, Y + 4.6, z)]); }
      hvTrees(L, X - 30, Z + 44, 34, 16, Y, 7); hvTrees(L, X + 52, Z + 30, 20, 9, Y, 3); }
  }
  /* ---- új látványosságok (2026-11-11 04:38–04:39, tulajdonos: „szerepeljen az apartman, a Gömbkilátó, Badacsony rajta a kereszttel, a tihanyi apátság … és minden más látványosság”) ---- */
  function hvCross(L, x, y, z, s) { L.push([hvBX(1.1 * s, 9 * s, 1.1 * s), "#d9d4c6", hvT4(x, y + 4.5 * s, z)], [hvBX(5 * s, 1.1 * s, 1.1 * s), "#d9d4c6", hvT4(x, y + 6.4 * s, z)], [hvBX(2.6 * s, 1.2 * s, 2.6 * s), "#b9b3a2", hvT4(x, y + .6 * s, z)]); }
  function hvHouse(L) {   /* Zephyr Apartmanház: fehér, kétszintes, lapostetős ház üvegkorlátos teraszokkal, tetőterasszal, kerttel */
    const T4 = hvT4; L.push([hvBX(46, 1, 60), "#7fb069", T4(0, .5, 4)], [hvBX(10, .3, 44), "#cfc8b8", T4(-9, 1.1, 2)], [hvBX(12, 7.2, 34), "#f6f4ee", T4(2, 4.6, 0)], [hvBX(12.6, .5, 34.6), "#dedbd2", T4(2, 8.4, 0)], [hvBX(12.2, .35, 34.2), "#e9e6dc", T4(2, 4.7, 0)]);
    for (let k = 0; k < 7; k++) { [2.6, 6.2].forEach((y) => L.push([hvBX(.2, 1.9, 2.2), "#33485e", T4(-4.05, y + 1, -13.5 + k * 4.4)], [hvBX(.2, 1.9, 2.2), "#33485e", T4(8.05, y + 1, -13.5 + k * 4.4)])); }
    [1.4, 5].forEach((y) => L.push([hvBX(12, .3, 4), "#c9c4b6", T4(2, y, -19)], [hvBX(12, 1.1, .15), "#9fd8ef", T4(2, y + .75, -21)], [hvBX(.15, 1.1, 4), "#9fd8ef", T4(-4, y + .75, -19)], [hvBX(.15, 1.1, 4), "#9fd8ef", T4(8, y + .75, -19)]));
    L.push([hvBX(.2, 5.4, 1.6), "#141d4d", T4(-4.08, 4.6, -16.6)], [hvBX(12, .3, 5), "#b98a55", T4(2, 5, 19.5)], [hvBX(12, 1.1, .15), "#9fd8ef", T4(2, 5.8, 22)]);
    for (let k = 0; k < 9; k++) L.push([hvBX(.12, 1.1, .12), "#8d949c", T4(-3.8 + k * 1.45, 9.2, -17)], [hvBX(.12, 1.1, .12), "#8d949c", T4(-3.8 + k * 1.45, 9.2, 17)]); L.push([hvBX(12, .12, .12), "#8d949c", T4(2, 9.75, -17)], [hvBX(12, .12, .12), "#8d949c", T4(2, 9.75, 17)]);
    L.push([hvCY(.12, .12, 7, 5), "#f5f2e8", T4(7, 12, -16)], [hvBX(3.4, 2, .1), "#d61f26", T4(8.8, 14.4, -16)]);
    [[-14, 22], [-16, 8], [14, 24], [16, -6]].forEach(([x, z], i) => { L.push([hvCO(2.6, 7, 7), "#2f7a3e", T4(x, 5.5, z)], [hvCY(.3, .35, 2, 5), "#5a4030", T4(x, 1.6, z)]); });
    [[-9, 12, "#c62828"], [-9, 5, "#f5f5f0"], [-9, -2, "#27425f"]].forEach(([x, z, c]) => L.push([hvBX(2.4, 1.2, 5), c, T4(x, 1.9, z)], [hvBX(2.2, .8, 2.6), "#22262c", T4(x, 2.8, z + .2)]));
    L.push([hvBX(5, .3, 5), "#f5f2e8", T4(12, 4.2, 26)], [hvCO(4.2, 2, 4), "#b5492f", T4(12, 5.4, 26, Math.PI / 4)]); [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([dx, dz]) => L.push([hvCY(.15, .15, 3, 5), "#8a6239", T4(12 + dx, 2.6, 26 + dz)]));
  }
  function hvGomb(L) {   /* Balatonboglár – Gömbkilátó (Xantus János-kilátó): rácsos alumíniumgömb a Várdombon */
    const T4 = hvT4, H = 26; hvHill(L, 0, 0, 44, H, "#5f9a4e", .4); hvTrees(L, 0, 0, 38, 20, H * .45, 5);
    const cy = H + 13, R = 9.5; for (let k = 0; k < 4; k++) L.push([hvCY(.35, .5, 6, 6), "#aab2ba", T4(Math.cos(k * Math.PI / 2 + .78) * 4, H + 2.5, Math.sin(k * Math.PI / 2 + .78) * 4)]);
    for (let k = 0; k < 8; k++) { const g = new THREE.TorusGeometry(R, .22, 5, 30); g.rotateY(k / 8 * Math.PI); L.push([g, "#dfe5ea", T4(0, cy, 0)]); }
    [-.62, -.3, 0, .3, .62].forEach((f) => { const g = new THREE.TorusGeometry(R * Math.sqrt(1 - f * f), .22, 5, 32); g.rotateX(Math.PI / 2); L.push([g, "#dfe5ea", T4(0, cy + f * R, 0)]); });
    L.push([hvCY(1.1, 1.1, R * 1.8, 10), "#c9d2da", T4(0, cy, 0)], [hvCY(5.6, 5.6, .3, 16), "#b98a55", T4(0, cy - 1.5, 0)], [hvCY(3.6, 3.6, .3, 14), "#b98a55", T4(0, cy + 4.2, 0)]);
    for (let k = 0; k < 20; k++) { const a = k / 20 * TAU * 2.5; L.push([hvBX(2.2, .18, .8), "#8d949c", T4(Math.cos(a) * 1.9, cy - 8 + k * .62, Math.sin(a) * 1.9, -a)]); }
  }
  function hvTower(L, H, hillR, col, kind) {   /* fa/kő kilátótorony dombon (Kőhegy, Fülöp-hegy, Fonyód) */
    const T4 = hvT4; hvHill(L, 0, 0, hillR, H, "#5f9a4e", .42); hvTrees(L, 0, 0, hillR * .85, 14, H * .45, kind || 2);
    const th = 20; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const g = hvCY(.3, .42, th, 6); L.push([g, col, (() => { const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(b * .1, 0, -a * .1)); m.setPosition(a * 2.6, H + th / 2, b * 2.6); return m; })()]); });
    [6.5, 13, 19.5].forEach((y, k) => { const w = 7.2 - k * 1; L.push([hvBX(w, .35, w), col, T4(0, H + y, 0)], [hvBX(w, 1.1, .14), col, T4(0, H + y + .7, w / 2)], [hvBX(w, 1.1, .14), col, T4(0, H + y + .7, -w / 2)], [hvBX(.14, 1.1, w), col, T4(w / 2, H + y + .7, 0)], [hvBX(.14, 1.1, w), col, T4(-w / 2, H + y + .7, 0)]); });
    L.push([hvCO(5.2, 3.6, 4), "#7a4a22", T4(0, H + 24.6, 0, Math.PI / 4)]); [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([a, b]) => L.push([hvCY(.16, .16, 3.4, 5), col, T4(a, H + 21.2, b)]));
    for (let k = 0; k < 16; k++) L.push([hvBX(2, .14, .6), col, T4(0, H + 1 + k * 1.15, (k % 6 < 3 ? 1 : -1) * 1.2, k * .5)]);
  }
  function hvFerry(L) {   /* Szántód–Tihany komp: lapos autókomp rámpákkal, híddal, autókkal + a rév mólója */
    const T4 = hvT4; L.push([hvBX(11, 2.2, 34), "#f4f4ee", T4(0, 1.3, 0)], [hvBX(11.4, .7, 34.4), "#27425f", T4(0, .5, 0)], [hvBX(9, .3, 7), "#8d949c", T4(0, 2.2, 20, 0)], [hvBX(9, .3, 7), "#8d949c", T4(0, 2.2, -20)]);
    L.push([hvBX(3, 5, 6), "#ffffff", T4(-4.2, 5, 0)], [hvBX(12, 2.4, 5), "#ffffff", T4(0, 8.6, 0)], [hvBX(12.2, .9, 4), "#27425f", T4(0, 8.9, -.7)], [hvCY(.7, .8, 2.6, 10), "#d61f26", T4(0, 11.2, 1)], [hvBX(3, 5, 6), "#ffffff", T4(4.2, 5, 0)]);
    [[-1.6, -9, "#c62828"], [1.8, -8, "#f5c542"], [-1.6, 9, "#3d7fc2"], [1.8, 10, "#f5f5f0"], [0, -14, "#3fb37f"]].forEach(([x, z, c]) => L.push([hvBX(2, 1, 4.2), c, T4(x, 2.9, z)], [hvBX(1.8, .7, 2.2), "#22262c", T4(x, 3.7, z + .2)]));
    for (let k = 0; k < 10; k++) [-5.5, 5.5].forEach((x) => L.push([hvBX(.14, 1.2, .14), "#d9dde2", T4(x, 3, -15 + k * 3.3)])); [-5.5, 5.5].forEach((x) => L.push([hvBX(.14, .14, 31), "#d9dde2", T4(x, 3.6, 0)]));
    L.push([hvBX(10, 1.4, 30), "#c9c4b6", T4(0, 1, 44)], [hvBX(6, 3, 5), "#f2e6c4", T4(8, 3.2, 54)], [hvCY(.01, 4.6, 2.4, 4), "#b5492f", T4(8, 5.9, 54, Math.PI / 4)]);
  }
  function hvFoldvar(L) {   /* Balatonföldvár: Hajózástörténeti Látogatóközpont és kilátó (hajóorr alakú terasz), kikötő vitorlásokkal */
    const T4 = hvT4; L.push([hvBX(16, 9, 22), "#f1efe8", T4(0, 5.5, 0)], [hvBX(17, .6, 23), "#27425f", T4(0, 10.2, 0)], [hvBX(.3, 5, 16), "#9fd8ef", T4(-8.1, 6, 0)], [hvBX(.3, 5, 16), "#9fd8ef", T4(8.1, 6, 0)]);
    L.push([hvCY(1.2, 1.5, 30, 10), "#e9e6dc", T4(0, 16, -4)], [hvCY(.01, 9, 1, 3), "#b98a55", (() => { const m = new THREE.Matrix4().makeRotationY(Math.PI); m.premultiply(new THREE.Matrix4().makeScale(1, 1, 1.9)); m.setPosition(0, 26, -8); return m; })()], [hvCY(.12, .12, 14, 5), "#f5f2e8", T4(0, 38, -4)], [hvBX(3, 1.8, .1), "#d61f26", T4(1.6, 43.6, -4)]);
    for (let k = 0; k < 7; k++) L.push([hvBX(.14, 1.2, .14), "#d9dde2", T4(-6 + k * 2, 27.2, -15 + Math.abs(k - 3) * 2.6)]);
    L.push([hvBX(60, 1.2, 4), "#c9c4b6", T4(0, .9, -30)], [hvBX(4, 1.2, 30), "#c9c4b6", T4(-28, .9, -44)], [hvBX(4, 1.2, 30), "#c9c4b6", T4(28, .9, -44)]);
    for (let k = 0; k < 7; k++) { const x = -21 + k * 7, z = -42 - (k % 2) * 6; L.push([hvBX(2, 1.1, 7), k % 2 ? "#f7f7f2" : "#13305e", T4(x, .9, z)], [hvCY(.1, .12, 11, 5), "#c9ced4", T4(x, 6.6, z - .5)], [hvCY(.01, 2.6, 8, 3), "#fffaf0", (() => { const m = new THREE.Matrix4().makeScale(.12, 1, 1); m.setPosition(x, 6.4, z + 1.2); return m; })()]); }
  }
  function hvSiofok(L) {   /* Siófok: Víztorony (a város jelképe) és az óriáskerék a parton */
    const T4 = hvT4; L.push([hvBX(46, 1, 30), "#cfc8b8", T4(6, .5, 0)], [hvBX(8, 20, 8), "#e8d9b8", T4(-8, 11, 0)], [hvBX(11, 9, 11), "#f1e6cc", T4(-8, 25.5, 0)], [hvBX(11.8, .8, 11.8), "#8a6a48", T4(-8, 21.2, 0)], [hvCO(8.6, 7, 4), "#7a3b22", T4(-8, 33.5, 0, Math.PI / 4)], [hvCY(.2, .2, 4, 5), "#e4bb63", T4(-8, 38.5, 0)]);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; L.push([hvBX(2.2, 3.2, .3), "#33485e", T4(-8 + Math.sin(a) * 5.55, 26, Math.cos(a) * 5.55, a)], [hvBX(1.6, 3, .3), "#33485e", T4(-8 + Math.sin(a) * 4.05, 9, Math.cos(a) * 4.05, a)], [hvBX(1.6, 3, .3), "#33485e", T4(-8 + Math.sin(a) * 4.05, 15, Math.cos(a) * 4.05, a)]); }
    const wx = 16, wy = 19, R = 15; { const g = new THREE.TorusGeometry(R, .35, 5, 40); L.push([g, "#f5f5f0", T4(wx, wy, 0)]); const g2 = new THREE.TorusGeometry(R * .55, .2, 5, 30); L.push([g2, "#f5f5f0", T4(wx, wy, 0)]); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; const m = new THREE.Matrix4().makeRotationZ(a); m.setPosition(wx, wy, 0); L.push([hvBX(.16, R * 2, .16), "#dfe5ea", m]); L.push([hvBX(2.2, 2.4, 2), ["#d61f26", "#f5c542", "#3d7fc2", "#3fb37f"][k % 4], T4(wx + Math.cos(a) * R, wy + Math.sin(a) * R - 1.4, 0)]); }
    [-1, 1].forEach((sd) => { const m = new THREE.Matrix4().makeRotationZ(sd * .32); m.setPosition(wx + sd * 3.2, wy / 2 + .5, 1.4); L.push([hvBX(.5, wy + 1, .5), "#aab2ba", m]); const m2 = m.clone(); m2.setPosition(wx + sd * 3.2, wy / 2 + .5, -1.4); L.push([hvBX(.5, wy + 1, .5), "#aab2ba", m2]); });
    hvTrees(L, 30, 8, 10, 6, 1, 3);
  }
  function hvHegyestu(L) {   /* Hegyestű (Zánka–Monoszló): félbevágott bazaltkúp, a bányafalon bazaltoszlopok */
    const T4 = hvT4, H = 40; const g = hvCY(3, 34, H, 18, 1, false, 0, Math.PI * 1.25); L.push([g, "#5a9550", T4(0, H / 2, 0)]);
    for (let k = 0; k < 16; k++) { const t = k / 15, x = -8 + t * 26, h2 = H * (1 - Math.abs(t - .3) * 1.05) * .9; if (h2 > 3) L.push([hvCY(1.3, 1.3, h2, 6), k % 2 ? "#5b5f66" : "#70757d", T4(x * .62, h2 / 2, -2 - x * .5)]); }
    hvTrees(L, -6, 14, 22, 10, 2, 6);
  }
  /* ---------- A BALATON TÉRKÉPE: a valódi partvonal (OSM), körülötte térképszerű szárazföld településnevekkel ---------- */
  const HV_K = 22, HV_O = [46.88936, 17.96297];                                   /* 1 km = 22 m; origó: a Zephyr Apartmanház */
  const hvMP = (lat, lon) => [(lon - HV_O[1]) * 76.1 * HV_K, -(lat - HV_O[0]) * 111.0 * HV_K];
  const HV_TOWNS = [["Zamárdi", 46.885, 17.953], ["Siófok", 46.905, 18.058], ["Balatonföldvár", 46.851, 17.881], ["Balatonlelle", 46.782, 17.69], ["Balatonboglár", 46.775, 17.655], ["Fonyód", 46.741, 17.555], ["Balatonmáriafürdő", 46.704, 17.385], ["Keszthely", 46.768, 17.243], ["Gyenesdiás", 46.771, 17.29], ["Szigliget", 46.795, 17.435], ["Badacsonytomaj", 46.806, 17.512], ["Révfülöp", 46.829, 17.627], ["Zánka", 46.871, 17.685], ["Balatonakali", 46.882, 17.752], ["Tihany", 46.914, 17.889], ["Balatonfüred", 46.958, 17.89], ["Csopak", 46.977, 17.918], ["Alsóörs", 46.985, 17.975], ["Balatonalmádi", 47.03, 18.02], ["Balatonkenese", 47.04, 18.107], ["Balatonvilágos", 46.975, 18.165], ["Szántód", 46.862, 17.905], ["Balatonszemes", 46.81, 17.77]];
  function hvMap(env) {
    const X0 = -1900, X1 = 760, N0 = -640, N1 = 880;   /* x és „észak” (= −z) tartomány méterben */
    const sh = new THREE.Shape(); sh.moveTo(X0, N0); sh.lineTo(X1, N0); sh.lineTo(X1, N1); sh.lineTo(X0, N1); sh.closePath();
    const hole = new THREE.Path(); HV_SHORE.forEach(([lon, lat], i) => { const [x, z] = hvMP(lat, lon); if (i) hole.lineTo(x, -z); else hole.moveTo(x, -z); }); hole.closePath(); sh.holes.push(hole);
    const g = new THREE.ShapeGeometry(sh, 1), P = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) - X0) / (X1 - X0), (P.getY(i) - N0) / (N1 - N0)); g.rotateX(-Math.PI / 2); g.translate(0, .9, 0);
    const tex = canvasTex(2048, 1170, (c, w, h) => { const PX = (x) => (x - X0) / (X1 - X0) * w, PY = (n) => (1 - (n - N0) / (N1 - N0)) * h;
      const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#bcd3a0"); bg.addColorStop(.5, "#d8e3b8"); bg.addColorStop(1, "#e3e6c0"); c.fillStyle = bg; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 520; i++) { const x = (i * 7919 % 2048), y = (i * 104729 % 1170), r = 14 + (i * 31 % 40), north = y < h * .45; c.fillStyle = north ? `rgba(70,130,70,${.10 + (i % 5) * .03})` : (i % 3 ? `rgba(226,206,120,${.12 + (i % 4) * .03})` : `rgba(110,160,80,.13)`); c.beginPath(); c.ellipse(x, y, r * 1.6, r, (i % 7) * .5, 0, TAU); c.fill(); }
      c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 3; c.beginPath(); HV_TOWNS.forEach(([n, la, lo], i) => { const [x, z] = hvMP(la, lo); const px = PX(x), py = PY(-z); c.fillStyle = "rgba(190,180,170,.85)"; c.beginPath(); c.arc(px, py, 6, 0, TAU); c.fill(); });
      c.strokeStyle = "rgba(60,90,120,.9)"; c.lineWidth = 5; c.beginPath(); HV_SHORE.forEach(([lon, lat], i) => { const [x, z] = hvMP(lat, lon); if (i) c.lineTo(PX(x), PY(-z)); else c.moveTo(PX(x), PY(-z)); }); c.closePath(); c.stroke(); c.strokeStyle = "rgba(240,226,170,.9)"; c.lineWidth = 2.5; c.stroke();
      c.textAlign = "center"; c.textBaseline = "middle"; HV_TOWNS.forEach(([n, la, lo]) => { const [x, z] = hvMP(la, lo), px = PX(x), south = la < 46.9 && !(lo < 17.66 && la > 46.76) && !/Tihany|Zánka|akali|Révfülöp|Badacsony|Szigliget/.test(n), py = PY(-z) + (south ? 17 : -17); c.font = "700 13px Inter, system-ui, sans-serif"; c.lineWidth = 3.5; c.strokeStyle = "rgba(255,255,255,.85)"; c.strokeText(n, px, py); c.fillStyle = "#2a3a4a"; c.fillText(n, px, py); });
      c.font = "italic 700 46px Georgia, serif"; c.fillStyle = "rgba(40,70,40,.35)"; c.fillText("B A K O N Y", PX(-520), PY(560)); c.fillText("S O M O G Y", PX(-700), PY(-520)); });
    tex.anisotropy = 8; const m = mesh(g, basic({ map: tex }), env); m.matrixAutoUpdate = false; m.updateMatrix(); return m;
  }
  /* a körút látnivalói a VALÓDI helyükön: [név, alcím, szélesség, hosszúság, építő, méretarány, címkemagasság, bemutató szöveg] */
  const HV_SIGHTS = [
    ["Zephyr Apartmanház", "Zamárdi", 46.88936, 17.96297, hvHouse, .62, 16, "Innen indulunk: a Zephyr Apartmanház Zamárdiban, pár percre a szabadstrandtól."],
    ["Kőhegyi kilátó", "Zamárdi", 46.87217, 17.93216, (L) => hvTower(L, 16, 24, "#a8794a", 2), .55, 30, "A zamárdi Kőhegy kilátójából a Tihanyi-félsziget és az egész keleti medence belátható."],
    ["Szántódi rév", "komp Tihanyba", 46.8815, 17.9008, hvFerry, .5, 12, "A tó legkeskenyebb pontja: itt jár a komp Szántód és Tihany között, alig 1,2 km."],
    ["Balatonföldvár", "Hajózástörténeti kilátó", 46.8548, 17.8795, hvFoldvar, .55, 30, "Földvár kikötője és a hajóorr alakú kilátóterasz – a balatoni hajózás múzeuma."],
    ["Gömbkilátó", "Balatonboglár", 46.779, 17.652, hvGomb, .85, 46, "A boglári Várdomb 15 méter átmérőjű alumíniumgömbje – az 1958-as brüsszeli világkiállításról került ide."],
    ["Fonyód", "Vár-hegyi kilátó", 46.741, 17.548, (L) => hvTower(L, 22, 34, "#8f8676", 4), .8, 44, "Fonyód ikerhegyéről a legszebb a kilátás a szemközti Badacsonyra és a tanúhegyekre."],
    ["Festetics-kastély", "Keszthely", 46.7707, 17.242, hvFestetics, .55, 40, "Keszthely: a Festetics család barokk kastélya 101 teremmel és a híres Helikon Könyvtárral."],
    ["Szigligeti vár", "a Balaton vára", 46.8042, 17.4343, hvSzigliget, .8, 62, "Szigliget 750 éves várát a török sosem tudta bevenni – ezért hívják a Balaton várának."],
    ["Badacsony", "a Ranolder-kereszttel", 46.8035, 17.4958, (L) => { hvBadacsony(L); hvCross(L, 30, 70, 24, 2.2); }, .8, 86, "A 438 méteres bazalthegy tetején áll a Ranolder-kereszt; lankáin terem a híres badacsonyi szürkebarát."],
    ["Révfülöp", "Fülöp-hegyi kilátó", 46.8326, 17.6277, (L) => hvTower(L, 18, 28, "#a8794a", 5), .7, 38, "Révfülöp: innen indul minden nyáron a Balaton-átúszás 5,2 kilométeres távja Balatonboglárra."],
    ["Hegyestű", "bazaltorgonák", 46.888, 17.647, hvHegyestu, .7, 38, "A Hegyestű félbevágott vulkánjában 20 méter magas bazaltoszlopok állnak – a Káli-medence kapuja."],
    ["Tihanyi apátság", "alapítva 1055-ben", 46.91389, 17.88944, hvAbbey, .52, 46, "I. András király 1055-ben alapította; alapítólevele a legrégebbi magyar nyelvemlék. A félszigeten virágzik a levendula."],
    ["Balatonfüred", "móló és Tagore sétány", 46.9537, 17.8955, hvPier, .6, 22, "Füred mólója és a Tagore sétány: a reformkor óta a Balaton legelegánsabb fürdővárosa, az Anna-bál otthona."],
    ["Siófok", "Víztorony és óriáskerék", 46.9085, 18.0486, hvSiofok, .7, 34, "Siófok jelképe az 1912-ben épült Víztorony; mellette a parti óriáskerék és az Aranypart."]
  ];
  function hvSights(env) {
    HV.sightG = []; HV.labels = [];
    HV.sights = HV_SIGHTS.map(([n, sub, la, lo, fn, sc, lh, txt]) => { const [x, z] = hvMP(la, lo), L = [], g = new THREE.Group(); fn(L); g.position.set(x, .9, z); g.scale.setScalar(sc); env.add(g); hvBake(L, g); (HV.sightG = HV.sightG || []).push({ g, sc }); (HV.labels = HV.labels || []).push(hvLabel(n, sub, x, lh * sc + 16, z, env, 46)); return { n, sub, x, z, txt }; });
  }
  /* a körút pályája: minden látnivaló mellett alacsonyan elhalad, közöttük az égbe emelkedik, és onnan csap le a következőre */
  function hvTourPts() {
    /* 2026-11-11 23:22 (tulajdonos: „ne a vízen menjen, hanem a PARTON, körbe a Balaton térképe körül; ha felemelkedik, lássam a magasból a tó körvonalát”):
       a pálya a tó VALÓDI partvonalát követi végig (OSM-partvonal, kb. 16 m-rel a szárazföld felé tolva), a Zephyrtől indul a déli parton nyugat felé,
       Keszthelynél megfordul, és az északi parton jön vissza. A látnivalóknál lejön a földre és megkerüli őket; két látnivaló között magasra emelkedik
       (a szakasz hosszától függően 30–150 m), ahonnan az egész tó körvonala látszik. */
    const S = HV.sights, n = S.length; let P = HV_SHORE.map(([lon, lat]) => hvMP(lat, lon));
    const resample = (Q, step) => { const out = [], m = Q.length; let acc = 0; out.push(Q[0].slice()); for (let i = 0; i < m; i++) { const a = Q[i], b = Q[(i + 1) % m]; let d = Math.hypot(b[0] - a[0], b[1] - a[1]), t = step - acc; while (t <= d) { out.push([a[0] + (b[0] - a[0]) * t / d, a[1] + (b[1] - a[1]) * t / d]); t += step; } acc = (acc + d) % step; } return out; };
    const smooth = (Q, w, passes) => { for (let q = 0; q < passes; q++) { const m = Q.length; Q = Q.map((_, i) => { let x = 0, z = 0; for (let k = -w; k <= w; k++) { const r = Q[(i + k + m * 4) % m]; x += r[0]; z += r[1]; } return [x / (2 * w + 1), z / (2 * w + 1)]; }); } return Q; };
    P = smooth(resample(P, 22), 3, 2);
    { const m = P.length; P = P.map((p, i) => { const a = P[(i - 1 + m) % m], b = P[(i + 1) % m]; let nx = b[1] - a[1], nz = -(b[0] - a[0]); const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; let q = [p[0] + nx * 16, p[1] + nz * 16]; if (hvInLake(q[0], q[1])) q = [p[0] - nx * 16, p[1] - nz * 16]; return q; }); }
    P = resample(smooth(P, 2, 2), 46);
    const nearest = (x, z) => { let bi = 0, bd = 1e9; P.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - z); if (d < bd) { bd = d; bi = i; } }); return bi; };
    { const m = P.length, i0 = nearest(S[0].x, S[0].z), i4 = nearest(S[4].x, S[4].z), i8 = nearest(S[8].x, S[8].z), f = (i) => (i - i0 + m) % m; if (f(i4) > f(i8)) P.reverse(); }
    { const m = P.length, i0 = nearest(S[0].x, S[0].z), st = (i0 - 2 + m) % m; P = P.slice(st).concat(P.slice(0, st)); }
    const R = [24, 22, 26, 30, 42, 32, 54, 54, 58, 27, 30, 46, 34, 34];
    let J = S.map((a) => nearest(a.x, a.z));
    /* a látnivaló mellett: a pálya odahúzódik hozzá (megkerülési sugárra), és sehol sem megy át rajta */
    S.forEach((a, i) => { const m = P.length, j = J[i], pj = P[j], d = Math.hypot(pj[0] - a.x, pj[1] - a.z) || 1, r = R[i] || 30, tx = a.x + (pj[0] - a.x) / d * r - pj[0], tz = a.z + (pj[1] - a.z) / d * r - pj[1], Wd = clamp(Math.round(d / 40) + 3, 3, 8);
      for (let k = -Wd; k <= Wd; k++) { const q = P[(j + k + m) % m], w = Math.pow(Math.cos(k / (Wd + 1) * Math.PI / 2), 2); q[0] += tx * w; q[1] += tz * w; } });
    P.forEach((q) => S.forEach((a, i) => { const r = (R[i] || 30) * .92, d = Math.hypot(q[0] - a.x, q[1] - a.z); if (d < r && d > .01) { q[0] = a.x + (q[0] - a.x) / d * r; q[1] = a.z + (q[1] - a.z) / d * r; } }));
    J = S.map((a) => nearest(a.x, a.z)); for (let i = 1; i < n; i++) if (J[i] <= J[i - 1]) J[i] = Math.min(P.length - 2, J[i - 1] + 2);
    /* 2026-11-12 00:19 (tulajdonos: „a látványosságokat meg kellene kerülni, ott egy kis időt eltölteni pályarésszel, hogy jól megfigyelhető legyen”):
       minden látnivalónál a pálya egy TELJES KÖRT ír le körülötte (a megkerülési sugáron), lassan emelkedő csigavonalban (9 → 19 m, így nem keresztezi önmagát),
       közben lassan megy (kb. 35 km/h) – egy-egy kör 20–35 mp; utána emelkedik tovább a következő felé. */
    { const NP = [], NJ = [], RG = []; let si = 0; const ord = J.map((j, i) => [j, i]).sort((a, b) => a[0] - b[0]);
      P.forEach((q, k) => { NP.push(q); while (si < ord.length && ord[si][0] === k) { const i = ord[si][1], a = S[i], r = Math.hypot(q[0] - a.x, q[1] - a.z) || (R[i] || 30), a0 = Math.atan2(q[1] - a.z, q[0] - a.x), pv = P[(k - 1 + P.length) % P.length], nx = P[(k + 1) % P.length], tx = nx[0] - pv[0], tz = nx[1] - pv[1], dir = ((q[0] - a.x) * tz - (q[1] - a.z) * tx) >= 0 ? 1 : -1, K = 10;
          NJ[i] = NP.length - 1; const st = NP.length; for (let c = 1; c <= K; c++) { const an = a0 + dir * c / K * TAU; NP.push([a.x + Math.cos(an) * r, a.z + Math.sin(an) * r]); } RG.push([st - 1, NP.length - 1, i]); si++; } });
      P = NP; J = NJ; HV.orbI = RG; }
    const m = P.length, cum = [0]; for (let i = 1; i <= m; i++) cum.push(cum[i - 1] + Math.hypot(P[i % m][0] - P[i - 1][0], P[i % m][1] - P[i - 1][1]));
    const H = new Array(m).fill(10), endOf = {}; HV.orbI.forEach(([a, b, i]) => { endOf[i] = b; });
    for (let i = 0; i < n; i++) { const a = endOf[i], b = i + 1 < n ? J[i + 1] : J[0] + m, gap = cum[Math.min(b, m)] - cum[a] + (b > m ? cum[b - m] : 0), peak = clamp(gap * .3, 16, 150);
      for (let k = a; k <= b; k++) { const u = (k - a) / Math.max(1, b - a), sn = Math.sin(Math.PI * u); H[k % m] = 19 * (1 - u) + 9 * u + peak * sn * sn + (gap > 320 ? peak * .13 * Math.sin(u * 6 * Math.PI) * sn : 0); } }
    HV.orbI.forEach(([a, b]) => { for (let k = a; k <= b; k++) H[k] = 9 + 10 * (k - a) / Math.max(1, b - a); });
    /* 2026-11-12 00:22 (tulajdonos: „legyen 360-as teljes fordulat és minden – aki nem bírja, nem nézi”): a hosszabb szakaszok végén, a lejtő alján
       FÜGGŐLEGES HUROK (átfordulás, 16 m sugarú, kicsit oldalra csavarva, hogy ne keresztezze önmagát). A hurokban a kocsi nem lassít. */
    const out = [], map = [], loops = [], lpAt = {}; 
    for (let i = 0; i < n; i++) { const a = endOf[i], b = i + 1 < n ? J[i + 1] : J[0] + m, gap = cum[Math.min(b, m)] - cum[a] + (b > m ? cum[b - m] : 0); if (gap > 430 && b - a > 8) lpAt[(a + Math.round((b - a) * .84)) % m] = 1; }
    P.forEach((q, k) => { map[k] = out.length; out.push([q[0], H[k], q[1]]);
      if (lpAt[k]) { const nx = P[(k + 1) % m]; let dx = nx[0] - q[0], dz = nx[1] - q[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const sx = -dz, sz = dx, Rl = 16, y0 = H[k], st = out.length - 1; out[st][3] = [0, 1, 0];
        for (let c = 1; c <= 8; c++) { const t = c / 8 * TAU, so = 7 * c / 8, x = q[0] + dx * Rl * Math.sin(t) + sx * so, y = y0 + Rl * (1 - Math.cos(t)), z = q[1] + dz * Rl * Math.sin(t) + sz * so; out.push([x, y, z, [q[0] + sx * so - x, y0 + Rl - y + (c === 8 ? Rl : 0), q[1] + sz * so - z]]); }
        loops.push([st, out.length - 1]); } });
    HV.pass = J.map((j) => map[j]); HV.orbI = HV.orbI.map(([a, b, i]) => [map[a], map[b], i]); HV.loopI = loops;
    return out;
  }
  /* ---------- a két pálya ---------- */
  const HV_OZ = 1500;   /* a VAD menet „élményparkja” a térképtől délre, külön vízen (a korábbi díszletekkel) */
  function hvPark(env) {
    const park = new THREE.Group(); park.position.set(0, 0, HV_OZ); env.add(park); HV.park = park;
    [[hvAbbey, -196, -228], [hvBadacsony, 238, -402], [hvSzigliget, 58, -415], [hvPier, 150, -55], [hvFestetics, -185, 78]].forEach(([fn, x, z]) => { const L = [], g = new THREE.Group(); fn(L); g.position.set(x, 0, z); park.add(g); hvBake(L, g); });
    { const L = [], x = 200, c = "#d61f26", T4 = hvT4; L.push([hvBX(5, .4, 26), "#b98a55", T4(x - 4.4, 2.3, 0)], [hvBX(5, .4, 26), "#b98a55", T4(x + 4.4, 2.3, 0)], [hvBX(15, .5, 22), c, T4(x, 8.4, 0)], [hvBX(16, .3, 23), "#f5f2e8", T4(x, 8.8, 0)]);
      [[-6.6, -10], [6.6, -10], [-6.6, 10], [6.6, 10]].forEach(([dx, dz]) => L.push([hvCY(.28, .28, 6.2, 7), "#f5f2e8", T4(x + dx, 5.3, dz)], [hvCY(.4, .5, 5, 7), "#8a6239", T4(x + dx, 0, dz)])); hvBake(L, park); }
    hvLabel("VAD MENET ⚠", "csak bátraknak", 200, 14, 0, park, 26);
  }
  function hvWildPts() {
    const X = 200, a = [[X, 3, 14], [X, 3, -12], [X, 3.4, -34], [X, 20, -72], [X, 42, -116], [X, 60, -152], [X, 63.5, -166], [X, 57, -178], [X, 35, -193], [X, 11, -207], [X, 3.2, -224]];
    const lc = [X, 17, -246], R = 14; for (let k = 0; k <= 8; k++) { const t = k / 8 * TAU, p = [X + 7 * k / 8, lc[1] - R * Math.cos(t), lc[2] - R * Math.sin(t)]; a.push([p[0], p[1], p[2], [0, lc[1] - p[1], lc[2] - p[2]]]); }
    a.push([X + 7, 3.4, -268], [X + 7, 14, -290], [X + 7, 23, -306], [X + 7, 12, -323], [X + 7, 5, -340], [X + 8, 5, -360], [X + 14, 6, -384], [X + 30, 7, -401], [X + 50, 8, -407], [X + 72, 10, -398], [X + 86, 12, -374], [X + 88, 10.5, -348], [X + 86, 9, -326]);
    const ax = [X + 86, 14], r = 5; for (let k = 0; k <= 8; k++) { const t = k / 8 * TAU, p = [ax[0] - r * Math.sin(t), ax[1] - r * Math.cos(t), -312 + 66 * k / 8]; a.push([p[0], p[1], p[2], [ax[0] - p[0], ax[1] - p[1], 0]]); }
    a.push([X + 86, 9.5, -232], [X + 86, 17, -204], [X + 84, 6, -170], [X + 80, 4, -132], [X + 70, 3, -94], [X + 62, 1.5, -62], [X + 50, 3, -30], [X + 36, 6.5, 0], [X + 22, 7, 28], [X + 8, 5, 40], [X, 3.6, 32]);
    return a.map((q) => [q[0], q[1], q[2] + HV_OZ].concat(q[3] ? [q[3]] : []));
  }
  function buildCoaster() {
    const root = W.root, env = new THREE.Group(), far = new THREE.Group(); root.add(env); env.add(far); HV.env = env; HV.far = far; env.matrixAutoUpdate = false;
    const oldSky = makeSky(far); makeShores(far);
    HV.water = makeWater(env);
    try { HV.foto = makePhotoSky(far, oldSky, HV.water); } catch (e) {}   /* 2026-11-11: valódi égfotó a hullámvasúton is */
    HVK.max = hvKitOn() && hvMaxOn(); HVK.sun = null; HVK.maxN = 6000; try { const q = +localStorage.getItem("zephyr-hv-max-fa"); if (q > 0) HVK.maxN = q; } catch (e) {}   /* a fák száma MAX-ban (gépi próbához csökkenthető) */ if (HVK.max) { try { hvMaxLights(env); } catch (e) { console.warn("hvMaxLights", e); HVK.max = false; } }
    { const mm = hvMap(env); try { hvGroundTex(mm); } catch (e) { console.warn("hvGroundTex", e); } } hvSights(env);
    /* 2026-11-11 23:55 (tulajdonos: „a vad menet ugyanazon a pályán menjen, ne külön pályán – egy legyen, de az jó”): EGY pálya van (a parti körút);
       a VAD menet ugyanezen megy, csak sokkal gyorsabban: nem lassít a látnivalóknál, a magasból szabadon zuhan (akár ~160 km/h), és ráz. A külön élménypark kivéve. */
    HV.calm = hvTrack(hvTourPts(), { bank: 6 }); HV.wild = HV.calm;
    HV.passS = HV.pass.map((i) => HV.calm.sOf(i)); HV.s0 = HV.passS[0] - 4; HV.orbS = (HV.orbI || []).map(([a2, b2]) => [HV.calm.sOf(a2), HV.calm.sOf(b2)]); HV.loopS = (HV.loopI || []).map(([a2, b2]) => [HV.calm.sOf(a2), HV.calm.sOf(b2)]);
    const wg = new THREE.Group(); env.add(wg); HV.wildG = wg;
    hvRails(HV.calm, env, "#2b5ea8");
    { let ym = 0; HV.calm.P.forEach((q) => { ym = Math.max(ym, q.y); }); HV.yMax = ym; }
    try { hvPlus(env, root); } catch (e) { console.warn("hvPlus", e); }
    /* a Zephyr a sínen: a hajó áll, a világ mozog; a néző a kokpitban ül (a kormányos helyén) */
    const ride = new THREE.Group(); root.add(ride); HV.ride = ride;
    /* 2026-11-11 23:22 (tulajdonos: „csónakba üljünk, ne vitorlásba; a nézőpont nem jó”): evezős FACSÓNAK a sínen, a néző a középső padon ül, előtte szabad a kilátás */
    HV.boat = null; hvRowBoat(ride);
    /* élet a vízen: két horgonyzó vitorlás a nyugodt pálya mellett (kisütve), lassan ringanak */
    HV.deco = [[BOATS[1], 40, -150, 2.2], [BOATS[6], -60, -40, -.9]].map(([o, x, z, ry]) => { const g = makeBoat(Object.assign({ detail: 0, crew: 2 }, o)); g.position.set(x, 0, z); g.rotation.y = ry; env.add(g); const S2 = g.userData.S; if (S2) { S2.awa = 60; S2.aws = 5; S2.side = 1; S2.boom = .5; S2.jib = .4; } try { vrBake(g); } catch (e) {} return g; });
    HV.lights = addLights(SUN.clone());
    HV.mode = "calm"; HV.st = W.kind === "table" ? "table" : "station"; HV.tbl = null; HV.s = HV.s0; HV.v = 0; HV.run = 0; HV.cur = 0; HV.warn = false; HV.t = 0; HV.fr = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3() }; HV.q = new THREE.Quaternion(); HV.shake = 0;
    hvPlace(); if (HV.st === "table") hvTableShow(true); hvApply(0);
    faceYaw(0); audioStart({ water: .02, wind: .015 });
    return { tick: hvTick, panel: hvPanel, hud: hvHud };
  }
  function hvPlace() { const hy = T.inVR ? Math.max(1.0, T.headY()) : T.headY(); HV.ride.position.set(0, hy - 1.18, -.3); }   /* szem: a csónak középső padján ülve, középen (a pad fölött kb. 78 cm-rel) */
  function hvRowBoat(ride) {
    const Z = [-2.6, -2.25, -1.6, -.8, 0, .8, 1.5, 2.0], B = [.03, .3, .56, .7, .75, .71, .62, .5], KY = [.44, .2, .06, 0, 0, .02, .08, .17], GY = [.74, .67, .61, .57, .56, .57, .59, .63];
    const sec = (i) => { const b = B[i], k = KY[i], g = GY[i], r = [[0, k], [b * .62, k + .09], [b * .95, k + (g - k) * .55], [b, g]]; return [[-r[3][0], r[3][1]], [-r[2][0], r[2][1]], [-r[1][0], r[1][1]], r[0], r[1], r[2], r[3]].map(([x, y]) => [x, y, Z[i]]); };
    const out = [], inn = [], strp = [], tri = (arr, a, b, c) => arr.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let i = 0; i < Z.length - 1; i++) { const s0 = sec(i), s1 = sec(i + 1); for (let j = 0; j < 6; j++) { const A = s0[j], Bq = s0[j + 1], C = s1[j + 1], D = s1[j], top = j === 0 || j === 5;
        tri(top ? strp : out, A, Bq, C); tri(top ? strp : out, A, C, D); tri(inn, A, C, Bq); tri(inn, A, D, C); } }
    { const sL = sec(Z.length - 1), c = [0, (KY[7] + GY[7]) / 2 + .05, Z[7]]; for (let j = 0; j < 6; j++) { tri(out, c, sL[j + 1], sL[j]); tri(inn, c, sL[j], sL[j + 1]); } }
    const geo = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(arr), 3)); return g; };
    const L = [], T4 = hvT4, I = new THREE.Matrix4();
    L.push([geo(out), "#f5f2e8", I.clone()], [geo(strp), "#141d4d", I.clone()], [geo(inn), "#b0773f", I.clone()]);
    const bAt = (z) => { for (let i = 0; i < Z.length - 1; i++) if (z >= Z[i] && z <= Z[i + 1]) { const u = (z - Z[i]) / (Z[i + 1] - Z[i]); return [B[i] + (B[i + 1] - B[i]) * u, GY[i] + (GY[i + 1] - GY[i]) * u, KY[i] + (KY[i + 1] - KY[i]) * u]; } return [.5, .6, .1]; };
    /* perem (dörzsléc) a két oldalon, bordák, padlórács */
    for (let i = 0; i < Z.length - 1; i++) [-1, 1].forEach((sd) => { const a = new THREE.Vector3(sd * B[i], GY[i] + .015, Z[i]), b = new THREE.Vector3(sd * B[i + 1], GY[i + 1] + .015, Z[i + 1]), mid = a.clone().add(b).multiplyScalar(.5), m = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0)); m.setPosition(mid); L.push([hvBX(.07, .045, a.distanceTo(b) + .02), "#8a5a2b", m]); });
    [-1.9, -1.45, -1.0, -.55, -.1, .35, .8, 1.25, 1.7].forEach((z) => { const [b, gy, ky] = bAt(z); [-1, 1].forEach((sd) => { const a = new THREE.Vector3(sd * b * .6, ky + .1, z), c = new THREE.Vector3(sd * b * .97, gy - .03, z), m = new THREE.Matrix4().lookAt(a, c, new THREE.Vector3(0, 0, 1)); m.setPosition(a.clone().add(c).multiplyScalar(.5)); L.push([hvBX(.035, .03, a.distanceTo(c)), "#8a5a2b", m]); }); });
    for (let k = -2; k <= 2; k++) L.push([hvBX(.14, .022, 3.3), k % 2 ? "#c79a5b" : "#b98a55", T4(k * .16, .115, -.05)]);
    /* padok: orrpad, középső (ezen ülsz), farpad; a farban kis háttámla */
    [[-1.35, .34], [.3, .36], [1.6, .38]].forEach(([z, y]) => { const [b] = bAt(z); L.push([hvBX(b * 1.92, .04, .3), "#9a6a34", T4(0, y, z)], [hvBX(.05, y - .1, .05), "#8a5a2b", T4(0, (y + .1) / 2, z)]); });
    L.push([hvBX(.9, .3, .04), "#9a6a34", T4(0, .55, 1.93)]);
    /* evezők a padokon keresztben fektetve + villák, orrkarika és kötél, kis lámpás az orrban */
    [-1, 1].forEach((sd) => { const m = new THREE.Matrix4().makeRotationX(Math.PI / 2); m.premultiply(new THREE.Matrix4().makeRotationY(sd * .07)); m.setPosition(sd * .47, .41, -.35); L.push([hvCY(.02, .024, 2.9, 8), "#d8b06a", m]);
      L.push([hvBX(.15, .02, .62), sd > 0 ? "#d61f26" : "#f5f2e8", T4(sd * .58, .41, -1.98, sd * .07)]);
      const [b, gy] = bAt(.55); L.push([hvCY(.018, .018, .12, 8), "#c9ced4", T4(sd * b, gy + .08, .55)], [new THREE.TorusGeometry(.045, .012, 6, 12, Math.PI), "#c9ced4", T4(sd * b, gy + .14, .55)]); });
    L.push([new THREE.TorusGeometry(.05, .014, 6, 14), "#c9ced4", T4(0, .7, -2.52)], [new THREE.TorusGeometry(.16, .03, 6, 16).rotateX(Math.PI / 2), "#e9dcc0", T4(0, .2, -1.75)], [new THREE.TorusGeometry(.12, .03, 6, 16).rotateX(Math.PI / 2), "#e9dcc0", T4(0, .25, -1.75)]);
    L.push([hvBX(.42, .03, .5), "#9a6a34", T4(0, .6, -2.15)], [hvCY(.05, .06, .14, 8), "#e4bb63", T4(0, .69, -2.15)], [hvCY(.035, .035, .02, 8), "#fff3c4", T4(0, .77, -2.15)]);
    /* futómű a sínen */
    [-1, 1].forEach((sd) => { L.push([hvBX(.34, .22, 3.6), "#22262c", T4(sd * .5, -.3, -.2)]); [-1.5, -.2, 1.1].forEach((z) => L.push([hvCY(.2, .2, .14, 12).rotateZ(Math.PI / 2), "#e4bb63", T4(sd * .5, -.45, z)])); });
    L.push([hvBX(1.2, .16, 3.2), "#3b4a66", T4(0, -.14, -.2)]);
    HV.rowboat = hvBake(L, ride, { fog: false });
  }   /* szem: a kokpit jobb oldalán ülve, 1,5 m-rel a vízvonal fölött */
  function hvTrackNow() { return HV.mode === "wild" ? HV.wild : HV.calm; }
  function hvApply(dt) {
    if (HV.st === "table") { hvTableApply(dt || 0); return; }
    const TR = hvTrackNow(), fr = TR.at(HV.s, HV.fr), R = new THREE.Vector3().crossVectors(fr.f, fr.u).normalize(), nz = fr.f.clone().negate();
    const m = new THREE.Matrix4().makeBasis(R, fr.u, nz); m.setPosition(fr.p); m.invert();
    const a = HV.ride.position, sh = HV.shake, t = W.t;
    const pre = new THREE.Matrix4().makeTranslation(a.x + Math.sin(t * 47) * .012 * sh, a.y - .62 + Math.sin(t * 61) * .014 * sh, a.z);
    HV.env.matrix.copy(pre.multiply(m)); HV.env.matrixWorldNeedsUpdate = true;
    HV.far.position.set(fr.p.x, 0, fr.p.z);
    const wm = HV.water; wm.position.set(Math.round(fr.p.x / 40) * 40, 0, Math.round(fr.p.z / 40) * 40); const mat = wm.userData.mat; if (mat) { mat.uniforms.uT.value = W.t; mat.uniforms.uOff.value.set(wm.position.x, wm.position.z); if (mat.uniforms.uCam) { try { const cw = new THREE.Vector3(); T.camObj().getWorldPosition(cw); HV.env.updateMatrixWorld(true); mat.uniforms.uCam.value.copy(HV.env.worldToLocal(cw)); } catch (e) { mat.uniforms.uCam.value.copy(fr.p); } } }
    HV.slope = fr.f.y; HV.alt = fr.p.y; try { hvMaxTick(fr.p); } catch (e) {}
  }
  function hvStart(mode) { if (HVT.on) hvTableShow(false); HV.mode = mode; HV.st = "ride"; HV.s = HV.s0; HV.run = 0; HV.v = .5; HV.warn = false; HV.lap = 0; HV.t = 0; W.panelDirty = 1; try { T.sfx && T.sfx("click"); } catch (e) {} }
  function hvStop() { hvQuiet(); HV.st = "station"; HV.mode = "calm"; HV.s = HV.s0; HV.run = 0; HV.cur = 0; HV.v = 0; HV.warn = false; HV.shake = 0; hvApply(0); AU.set("rush", 0, .3); AU.set("wind", .015, .5); W.panelDirty = 1; }
  function hvTick(dt) {
    dt = Math.min(dt, .05); if (T.inVR !== HV.wasVR) { HV.wasVR = T.inVR; hvPlace(); }
    try { hvPlusTick(dt); } catch (e) {}
    const b = HV.boat; if (b && b.userData.update) { const BS = b.userData.S; if (BS) { BS.aws = 5 + HV.v * .5; BS.awa = 34; BS.t = W.t; } b.userData.update(dt); }
    (HV.deco || []).forEach((g, i) => { const S2 = g.userData.S; if (S2) { S2.heel = .05 + Math.sin(W.t * .7 + i) * .03; S2.pitch = Math.sin(W.t * .9 + i * 2) * .02; } g.position.y = Math.sin(W.t * .8 + i) * .06; if (g.userData.update) g.userData.update(dt); });
    if (HV.st !== "ride") { hvApply(dt); return; }
    const TR = hvTrackNow(), g = 9.81; HV.t += dt; let tgt;
    if (HV.mode === "wild") {
      const y = HV.alt || 10, L2 = TR.L; tgt = clamp(Math.sqrt(2 * g * Math.max(0, (HV.yMax || 170) + 6 - y) * .55 + 110), 11, 46);   /* az energia a magasságból: lent száguld, a csúcson átbillen */
      if (HV.run < 40) tgt = Math.min(tgt, 6 + HV.run * .5); if (HV.run > L2 - 120) tgt = Math.min(tgt, 5 + (L2 - HV.run) * .16);
      HV.v += clamp(tgt - HV.v, -16 * dt, 22 * dt);
      { const sm = ((HV.s % L2) + L2) % L2; let near = 1e9, ci = -1; HV.passS.forEach((ps, i) => { const da = ((ps - sm) % L2 + L2) % L2, dn = Math.min(da, L2 - da); if (dn < near) { near = dn; ci = i; } }); if (near < 60 && ci !== HV.cur) { HV.cur = ci; W.panelDirty = 1; } HV.near = near; }
    } else {
      /* BALATON-KÖRÚT: a látnivalóknál lelassít (bemutatás), utána az égbe emelkedik, és onnan csap le a következőre */
      const L2 = TR.L, sm = ((HV.s % L2) + L2) % L2; let near = 1e9, ahead = 1e9, ci = -1; HV.passS.forEach((ps, i) => { const da = ((ps - sm) % L2 + L2) % L2, dn = Math.min(da, L2 - da); if (dn < near) { near = dn; ci = i; } if (da < ahead) ahead = da; });
      const sl = HV.slope || 0; tgt = sl < -.12 ? 15 + 26 * Math.min(1, -sl * 1.3) : sl > .12 ? 15 : 21;
      const inOrb = (HV.orbS || []).some(([a2, b2]) => sm >= a2 - 6 && sm <= b2 + 4);   /* a látnivaló körül: lassú, nézelődős kör */
      const inLoop = (HV.loopS || []).some(([a2, b2]) => sm >= a2 - 70 && sm <= b2 + 10);   /* a hurok előtt lendületet vesz, benne nem lassít */
      if (inLoop) tgt = Math.max(tgt, 26); else if (inOrb) tgt = Math.min(tgt, 9.5); else if (ahead < 46 || HV.v * HV.v > 90 + 2 * 13 * Math.max(0, ahead - 46)) tgt = 9;
      if (HV.run > L2 - 30) tgt = Math.min(tgt, 1.5 + (L2 - HV.run) * .2);
      HV.v += clamp(tgt - HV.v, -17 * dt, (inLoop ? 16 : 9) * dt); if (near < 60 && ci !== HV.cur) { HV.cur = ci; W.panelDirty = 1; } HV.near = near; }
    { const d = Math.max(.4, HV.v) * dt; HV.s += d; HV.run = (HV.run || 0) + d; }
    if (HV.run >= TR.L - .5) { hvStop(); return; }
    HV.shake = HV.mode === "wild" ? clamp((HV.v - 8) / 22, 0, 1) : 0;
    hvApply(dt);
    AU.set("rush", clamp(HV.v / 32, 0, 1) * .16, .2); AU.set("wind", .02 + clamp(HV.v / 30, 0, 1) * .12, .2);
    HV.hudT = (HV.hudT || 0) + dt; if (HV.hudT > .5) { HV.hudT = 0; W.panelDirty = 1; }
  }
  function hvToTable(on) { hvQuiet(); HV.st = on ? "table" : "station"; HV.mode = "calm"; HV.s = HV.s0; HV.v = 0; HV.run = 0; HV.warn = false; HV.shake = 0; hvTableShow(on); hvApply(0); W.panelDirty = 1; }
  function hvVoice() { let on = true; try { on = localStorage.getItem("zephyr-hv-hang") !== "0"; } catch (e) {} return on; }
  function hvInfo() {
    if (HV.st === "table") { const c = HV.sights[HVT.cur || 0] || HV.sights[0]; return `Balaton-terepasztal: a kis Zephyr körbejárja a tavat. Most itt jár: ${c.n} (${c.sub}). ${T.inVR ? "Sétáld körbe az asztalt, aztán szállj be!" : "Egy ujjal húzva mozgatod, két ujjal nagyítod és forgatod."}`; }
    if (HV.st !== "ride") return HV.warn ? "⚠ VAD MENET: ugyanaz a parti körút, de száguldva – 170 m-es zuhanások, akár 160 km/h – erős gyomor kell! Rosszullétre hajlamosaknak, kisgyerekeknek NEM ajánlott. VR-ben ülj le!" : "Ülj be a csónakba! Balaton-körút a parton: minden látnivalót körbejárunk, köztük az égbe emelkedünk, a lejtők alján hurok (átfordulás) – nyugodtan vagy vad menetben.";
    const TR = hvTrackNow(), kmh = Math.round(HV.v * 3.6), pct = Math.round((HV.run || 0) / TR.L * 100);
    if (HV.mode !== "wild") { const S = HV.sights, c = S[HV.cur] || S[0], nx = S[(HV.cur + 1) % S.length]; return (HV.near < 60 ? `${c.n} – ${c.txt}` : `Következő: ${nx.n} (${nx.sub})`) + ` · ${kmh} km/h · ${Math.round(HV.alt || 0)} m · ${pct}%`; }
    return `VAD MENET · ${kmh} km/h · magasság ${Math.round(HV.alt || 0)} m · ${pct}%`;
  }
  function hvButtons() {
    if (HV.st === "ride") return [["■ Kiszállok (megállás)", hvStop], ["‹ Vissza a sétához", () => W.close()]];
    if (HV.warn) return [["✔ Vállalom – INDULJON a vad menet!", () => hvStart("wild")], ["Mégsem", () => { HV.warn = false; W.panelDirty = 1; }]];
    const hang = [hvVoice() ? "🔊 Idegenvezetés: be" : "🔇 Idegenvezetés: ki", () => { try { localStorage.setItem("zephyr-hv-hang", hvVoice() ? "0" : "1"); } catch (e) {} hvQuiet(); W.panelDirty = 1; }];
    if (HV.st === "table") return [["🎢 Beszállok – Balaton-körút", () => hvStart("calm")], ["⚡ VAD menet ⚠", () => { hvToTable(false); HV.warn = true; W.panelDirty = 1; }], ["＋ Nagyítás", () => { HVT.zoomT = clamp(HVT.zoomT * 1.6, 1, 12); }], ["－ Kicsinyítés", () => { HVT.zoomT = clamp(HVT.zoomT / 1.6, 1, 12); }], [HVT.follow ? "✓ Követem a vonatot" : "🚆 Kövesd a vonatot", () => { HVT.follow = !HVT.follow; if (HVT.follow && HVT.zoomT < 3) HVT.zoomT = 4; W.panelDirty = 1; }], ["⌖ Alaphelyzet", () => { HVT.zoomT = 1; HVT.cx = HVT.cx0; HVT.cz = HVT.cz0; HVT.follow = false; HVT.pos = null; W.panelDirty = 1; }], [HVT.spin ? "⏸ Asztal megállítása" : "↻ Asztal forgatása", () => { HVT.spin = !HVT.spin; W.panelDirty = 1; }], ["‹ Vissza a sétához", () => W.close()]];
    const mx = [hvMaxOn() ? "✨ Maximális részletesség: BE" : "✨ Maximális részletesség: ki", () => { try { localStorage.setItem("zephyr-hv-max", hvMaxOn() ? "0" : "1"); } catch (e) {} const k = W.kind; W.close(); setTimeout(() => { try { T.openWorld ? T.openWorld(k) : W.open(k); } catch (e) {} }, 900); }];
    return [["🗺 Balaton-körút", () => hvStart("calm")], mx, ["⚡ VAD menet ⚠", () => { HV.warn = true; W.panelDirty = 1; }], hang, ["‹ Vissza a sétához", () => W.close()]];
  }
  function hvPanel(P) {
    P.title(HV.st === "table" ? "Balaton-terepasztal" : "Balatoni hullámvasút", hvInfo());
    P.row(0, HV.st === "ride" && HV.mode !== "wild" && HV.sights ? (HV.sights[HV.cur] || {}).txt || "" : "Balaton-körút: Zephyr · Kőhegy · komp · Földvár · Gömbkilátó · Fonyód · Keszthely · Szigliget · Badacsony · Révfülöp · Hegyestű · Tihany · Füred · Siófok", "#7fd3ff");
    P.row(1, "Vad menet: ugyanez a pálya száguldva · 170 m-es zuhanások · akár 160 km/h", "#ff8a8a");
    P.row(2, "Bármikor kiszállhatsz: „Kiszállok” – a hajó azonnal megáll az állomáson.", "#ffd166");
    P.buttons(hvButtons());
  }
  function hvHud(H) {
    H.title(HV.st === "table" ? "Balaton-terepasztal" : "Balatoni hullámvasút", hvInfo());
    H.buttons(hvButtons().map(([l, f]) => [l, f, false]));
    H.hint("Húzással körbenézel · a csónak a sínen megy a part mentén, a tó körül · bármikor kiszállhatsz");
  }
