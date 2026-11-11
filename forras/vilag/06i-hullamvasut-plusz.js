  /* =====================================================================================================
     HULLÁMVASÚT 2.0 + BALATON-TEREPASZTAL (2026-11-11 este, a tulajdonos: „a hullámvasutat fejleszd ennél sokkal jobbra,
     és tedd a VR játékok közé a terepasztallal együtt”).
     - élő táj a térképen: települések házakkal és templommal, dombok, erdők, vitorlások a tavon, felhők a csúcsoknál
     - arany karikák a pálya csúcsain (átrepülsz rajtuk), állomás az indulásnál, sebességcsíkok, idegenvezetés hanggal
     - TEREPASZTAL: ugyanez a világ asztalnyi makettként, rajta körbejár a kis Zephyr; innen be lehet szállni
     Minden díszlet kisütött (hvBake), futás közben csak a karikák, a csíkok és a kis hajó mozog.
     ===================================================================================================== */
  const HVP = { rings: [], t: 0 };
  function hvRng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  let HV_POLY = null;
  function hvInLake(x, z) { if (!HV_POLY) HV_POLY = HV_SHORE.map(([lon, lat]) => hvMP(lat, lon)); let c = false; const P = HV_POLY; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function hvPlus(env, root) {
    const TR = HV.calm, rnd = hvRng(20261111), T4 = hvT4, X0 = -1880, X1 = 740, Z0 = -860, Z1 = 620;
    const tp = []; for (let k = 0; k < TR.M; k += 5) tp.push(TR.P[k]);
    const clear = (x, z, h, r) => { const r2 = r * r; for (let i = 0; i < tp.length; i++) { const p = tp[i], dx = p.x - x, dz = p.z - z; if (dx * dx + dz * dz < r2 && p.y < h + 6) return false; } return true; };
    const sightD = (x, z) => { let m = 1e9; HV.sights.forEach((s) => { const d = Math.hypot(s.x - x, s.z - z); if (d < m) m = d; }); return m; };
    const onLand = (x, z, r) => { if (hvInLake(x, z)) return false; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; if (hvInLake(x + Math.cos(a) * r, z + Math.sin(a) * r)) return false; } return true; };
    /* 1) dombok – a Balaton-felvidék és Somogy lankái */
    { const L = []; let n = 0; for (let i = 0; i < 520 && n < 64; i++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0), north = z < -40, r = 26 + rnd() * (north ? 54 : 34), h = (north ? 9 : 5) + rnd() * (north ? 22 : 9);
        if (!onLand(x, z, r + 8) || sightD(x, z) < r + 80 || !clear(x, z, h, r + 10)) continue; hvHill(L, x, z, r, h, ["#6aa457", "#5f9a4e", "#74ad5c", "#57924a"][n % 4], .3 + rnd() * .25); n++;
        if (north && n % 3 === 0) for (let q = 0; q < 3; q++) for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI + .3; L.push([hvBX(4.4, .5, .6), q % 2 ? "#8fbf4f" : "#7aad42", T4(x + Math.cos(a) * (r * .8 - q * 3), 1.4 + q * 1.2, z + Math.sin(a) * (r * .8 - q * 3), -a + Math.PI / 2)]); } }
      if (L.length) hvBake(L, env); }
    /* 2) erdők, fasorok */
    { const L = []; let n = 0; for (let i = 0; i < 2600 && n < 620; i++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (hvInLake(x, z) || sightD(x, z) < 46 || !clear(x, z, 8, 7)) continue; const hh = 2.6 + rnd() * 3.4, dark = rnd() < .5;
        L.push([hvCO(1.3 + rnd() * .9, hh * 1.5, 6), dark ? "#2f7a3e" : (n % 5 ? "#3f8f4a" : "#4f9f52"), T4(x, .9 + hh * .95, z)], [hvCY(.2, .26, 1.3, 5), "#5a4030", T4(x, 1.4, z)]); n++; }
      if (L.length) hvBake(L, env); }
    /* 3) települések: házak piros tetővel, templom toronnyal */
    { const L = [], walls = ["#f4efe2", "#efe2bd", "#f6ecd0", "#e9e2d2", "#f1d9b0"], roofs = ["#b5492f", "#a8452c", "#c05a3a", "#8f3f2a"];
      HV_TOWNS.forEach(([nm, la, lo], ti) => { const [cx, cz] = hvMP(la, lo); let made = 0;
        for (let i = 0; i < 60 && made < 15; i++) { const a = rnd() * TAU, d = 5 + rnd() * 30, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (!onLand(x, z, 3) || sightD(x, z) < 36 || !clear(x, z, 9, 7)) continue;
          const w = 2.6 + rnd() * 1.6, dp = 3 + rnd() * 2.4, h = 1.9 + rnd() * 1.3, ry = rnd() * Math.PI; L.push([hvBX(w, h, dp), walls[(ti + made) % 5], T4(x, .9 + h / 2, z, ry)]);
          const rf = new THREE.Matrix4().makeRotationY(ry + Math.PI / 4); rf.premultiply(new THREE.Matrix4().makeScale(1, 1, 1)); rf.setPosition(x, .9 + h + .8, z); L.push([hvCO(Math.max(w, dp) * .78, 1.7, 4), roofs[(ti + made) % 4], rf]); made++; }
        if (made > 5) { let x = cx + 6, z = cz - 5; if (onLand(x, z, 4) && sightD(x, z) > 36 && clear(x, z, 16, 6)) L.push([hvBX(3.4, 4, 7), "#f6f1e4", T4(x, 2.9, z)], [hvBX(2.4, 8.5, 2.4), "#f6f1e4", T4(x, 5.1, z + 4.2)], [hvCO(2, 4.4, 4), "#7a3b22", T4(x, 11.5, z + 4.2, Math.PI / 4)], [hvBX(.14, 1.3, .14), "#e4bb63", T4(x, 14.2, z + 4.2)]); } });
      if (L.length) hvBake(L, env); }
    /* 4) élet a tavon: vitorlások, bóják */
    { const L = [], sails = ["#ffffff", "#fffaf0", "#d61f26", "#f5c542", "#ffffff", "#3d7fc2"]; let n = 0;
      for (let i = 0; i < 900 && n < 44; i++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (!hvInLake(x, z) || !clear(x, z, 16, 12) || sightD(x, z) < 40) continue; let ok = true; for (let k = 0; k < 4; k++) if (!hvInLake(x + Math.cos(k * 1.57) * 22, z + Math.sin(k * 1.57) * 22)) ok = false; if (!ok) continue;
        const ry = rnd() * TAU, s = 1.1 + rnd() * .8, R = (dx, dy, dz) => { const m = new THREE.Matrix4().makeRotationY(ry); m.setPosition(x + (dx * Math.cos(ry) + dz * Math.sin(ry)) * s, dy * s, z + (-dx * Math.sin(ry) + dz * Math.cos(ry)) * s); m.scale(new THREE.Vector3(s, s, s)); return m; };
        L.push([hvBX(2.1, 1.1, 7.4), n % 3 ? "#f7f7f2" : "#13305e", R(0, .5, 0)], [hvCY(.1, .12, 10, 5), "#c9ced4", R(0, 5.8, -.6)]);
        { const g = hvCO(2.7, 8.2, 3); g.scale(.08, 1, 1); L.push([g, sails[n % 6], R(0, 5.6, 1)]); const g2 = hvCO(1.9, 6.4, 3); g2.scale(.08, 1, 1); L.push([g2, "#fffaf0", R(0, 4.6, -2.3)]); } n++; }
      for (let i = 0; i < 400 && n < 70; i++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (!hvInLake(x, z)) continue; L.push([hvCY(.5, .7, 1.4, 8), n % 2 ? "#f5c542" : "#d61f26", T4(x, .6, z)], [hvCO(.5, .9, 8), "#f5f5f0", T4(x, 1.7, z)]); n++; }
      if (L.length) hvBake(L, env); }
    /* 5) felhők a pálya csúcsai körül – ezek között suhansz át */
    { const L = []; let last = -1e9, n = 0; for (let k = 0; k < TR.M && n < 46; k++) { const p = TR.P[k]; if (p.y < 62 || TR.S[k] - last < 55) continue; last = TR.S[k]; const f = TR.F[k], sd = n % 2 ? 1 : -1, off = 20 + rnd() * 30, cx = p.x - f.z * sd * off, cz = p.z + f.x * sd * off, cy = p.y + (rnd() * 22 - 9);
        for (let q = 0; q < 5; q++) { const g = hvSP(7 + rnd() * 7); g.scale(1.25, .55, 1); L.push([g, "#ffffff", T4(cx + (q - 2) * 8 + rnd() * 4, cy + (q % 2) * 2.4, cz + rnd() * 10 - 5)]); } n++; }
      if (L.length) { HVP.clouds = hvBake(L, env, { fog: false, transparent: true, opacity: .93 }); } }
    /* 6) arany karikák a csúcsokon */
    { HVP.rings = []; const geo = new THREE.TorusGeometry(10.5, .42, 7, 40); W.disposables.push(geo); const mat = basic({ color: "#ffd166", fog: false }), mat2 = basic({ color: "#fff3c4", fog: false });
      for (let k = 2; k < TR.M - 2; k++) { const y = TR.P[k].y; if (y < 58 || y < TR.P[k - 1].y || y <= TR.P[k + 1].y) continue; if (HVP.rings.length && TR.S[k] - HVP.rings[HVP.rings.length - 1].s < 90) continue;
        [0, 26].forEach((ds, j) => { const fr = TR.at(TR.S[k] + ds, { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3() }); const m = new THREE.Mesh(geo, j ? mat2 : mat); m.position.copy(fr.p).addScaledVector(fr.u, 5.2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fr.f); if (j) m.scale.setScalar(.8); env.add(m); HVP.rings.push({ m, s: TR.S[k] + ds, sc: j ? .8 : 1 }); }); } }
    /* 7) állomás az indulásnál: cölöpökön álló peronok, előtetők, zászlók, névtábla */
    { const fr = TR.at(HV.s0, { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3() }), ry = Math.atan2(fr.f.x, fr.f.z), L = [], y = fr.p.y - .95;
      const M = (dx, dy, dz, r2) => { const m = new THREE.Matrix4().makeRotationY(ry + (r2 || 0)); m.setPosition(fr.p.x + dx * Math.cos(ry) + dz * Math.sin(ry), dy, fr.p.z - dx * Math.sin(ry) + dz * Math.cos(ry)); return m; };
      [-1, 1].forEach((sd) => { L.push([hvBX(3.4, .35, 26), "#b98a55", M(sd * 4.3, y, 0)], [hvBX(3.6, .12, 26.2), "#e4bb63", M(sd * 4.3, y - .24, 0)], [hvBX(3.8, .25, 16), "#141d4d", M(sd * 5.2, y + 4.4, 0)], [hvBX(4, .12, 16.2), "#e4bb63", M(sd * 5.2, y + 4.58, 0)]);
        for (let k = 0; k < 5; k++) { const z = -11 + k * 5.5; L.push([hvCY(.22, .3, y + 1, 7), "#8a6239", M(sd * 5.4, (y - 1) / 2 + .5, z)], [hvBX(.12, 1.05, .12), "#f5f2e8", M(sd * 5.9, y + .7, z)]); if (k > 0 && k < 4) L.push([hvCY(.11, .11, 4.3, 6), "#f5f2e8", M(sd * 6.6, y + 2.3, z)]); }
        L.push([hvBX(.1, .1, 22.2), "#f5f2e8", M(sd * 5.9, y + 1.2, 0)], [hvCY(.07, .07, 3.2, 5), "#f5f2e8", M(sd * 6.6, y + 6.1, 6)], [hvBX(.06, 1, 1.7), sd > 0 ? "#d61f26" : "#ffffff", M(sd * 6.6, y + 7.1, 6.9)], [hvBX(.06, .33, 1.7), "#3fb37f", M(sd * 6.6, y + 6.4, 6.9)]); });
      hvBake(L, env); hvLabel("ZEPHYR EXPRESSZ", "Balaton-körút · indulás", fr.p.x - Math.cos(ry) * 5.4, y + 7.4, fr.p.z + Math.sin(ry) * 5.4, env, 12); }
    /* 8) sebességcsíkok a hajó körül (a néző terében) */
    { const N = 64, pos = new Float32Array(N * 6), g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); W.disposables.push(g); const m = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false, fog: false }); W.disposables.push(m);
      const ln = new THREE.LineSegments(g, m); ln.frustumCulled = false; root.add(ln); const P = []; for (let i = 0; i < N; i++) { const a = rnd() * TAU, r = 3.4 + rnd() * 6; P.push([Math.cos(a) * r, 1.2 + Math.sin(a) * r * .7, -44 + rnd() * 52]); } HVP.streak = { ln, pos, P, N, m }; }
    /* a terepasztalhoz: jól látható arany pályavonal + a kis Zephyr */
    { const tg = new THREE.TubeGeometry(TR.cur, 1400, 2.1, 5, true); W.disposables.push(tg); HVP.line = mesh(tg, basic({ color: "#e4bb63", fog: false }), env); HVP.line.visible = false;
      const g = new THREE.Group(), L = []; L.push([hvBX(3, 1.3, 9), "#f5f2e8", T4(0, .65, 0)], [hvBX(3.1, .4, 9.1), "#141d4d", T4(0, .1, 0)], [hvCY(.13, .15, 12, 6), "#c9ced4", T4(0, 6.6, -.6)]); { const s = hvCO(3.3, 10, 3); s.scale(.08, 1, 1); L.push([s, "#d61f26", T4(0, 6.4, 1.6)]); const j = hvCO(2.4, 8, 3); j.scale(.08, 1, 1); L.push([j, "#f6f4ec", T4(0, 5.4, -2.8)]); }
      hvBake(L, g, { fog: false }); g.scale.setScalar(5.5); g.visible = false; env.add(g); HVP.mini = g; HVP.ms = HV.s0; }
    HVP.t = 0;
  }
  function hvSay(txt) { try { if (localStorage.getItem("zephyr-hv-hang") === "0" || !("speechSynthesis" in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt), hu = (speechSynthesis.getVoices() || []).find((v) => /^hu/i.test(v.lang)); if (hu) u.voice = hu; u.lang = "hu-HU"; u.rate = .96; u.volume = .9; speechSynthesis.speak(u); } catch (e) {} }
  function hvQuiet() { try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) {} }
  function hvPlusTick(dt) {
    HVP.t += dt; const ride = HV.st === "ride", v = ride ? HV.v : 0, TR = HV.calm;
    HVP.rings.forEach((r, i) => { r.m.rotateZ(dt * (i % 2 ? .9 : -.9)); const d = ride && HV.mode === "calm" ? Math.abs(r.s - (((HV.s % TR.L) + TR.L) % TR.L)) : 1e9; r.m.scale.setScalar(r.sc * (1 + .12 * Math.sin(HVP.t * 4 + i) + (d < 40 ? (40 - d) / 40 * .25 : 0))); });
    const st = HVP.streak; if (st) { const op = clamp((v - 11) / 20, 0, .5); st.m.opacity += (op - st.m.opacity) * Math.min(1, dt * 4); st.ln.visible = st.m.opacity > .01;
      if (st.ln.visible) { const len = .5 + v * .07; for (let i = 0; i < st.N; i++) { const p = st.P[i]; p[2] += v * dt * 1.25; if (p[2] > 8) p[2] -= 52; const o = i * 6; st.pos[o] = p[0]; st.pos[o + 1] = p[1]; st.pos[o + 2] = p[2]; st.pos[o + 3] = p[0]; st.pos[o + 4] = p[1]; st.pos[o + 5] = p[2] - len; } st.ln.geometry.attributes.position.needsUpdate = true; } }
    if (ride && HV.mode === "calm" && HV.near < 58 && HVP.said !== HV.cur) { HVP.said = HV.cur; const c = HV.sights[HV.cur]; if (c) hvSay(c.n + ". " + c.txt); }
    if (!ride) HVP.said = -1;
    /* a hajó a kanyarban megdől, zuhanáskor előrebillen */
    const b = HV.boat, BS = b && b.userData.S; if (BS && ride) { BS.heel = (BS.heel || 0) + ((clamp(v / 30, 0, 1) * .1 * Math.sin(HVP.t * .7)) - (BS.heel || 0)) * Math.min(1, dt * 2); }
  }
  /* ---------- TEREPASZTAL: az egész Balaton-körút asztalnyi makettként ---------- */
  const HVT = { sc: 1 / 900, rot: 0, spin: true, on: false, cx: -570, cz: -120 };
  function hvTableBuild(root) {
    const g = new THREE.Group(), L = [], T4 = hvT4; root.add(g); HV.tbl = g;
    L.push([hvBX(3.42, .09, 2.2), "#5a3a22", T4(0, -.045, 0)], [hvBX(3.5, .05, 2.28), "#e4bb63", T4(0, -.1, 0)], [hvBX(3.3, .22, 2.08), "#3d2616", T4(0, -.24, 0)], [hvBX(3.12, .012, 1.86), "#2a6f9e", T4(0, .004, 0)]);
    [[-1.5, -.9], [1.5, -.9], [-1.5, .9], [1.5, .9]].forEach(([x, z]) => L.push([hvCY(.07, .05, .95, 10), "#3d2616", T4(x, -.8, z)], [hvCY(.085, .085, .05, 10), "#e4bb63", T4(x, -1.26, z)]));
    [[0, -1.12, 3.5, .06], [0, 1.12, 3.5, .06]].forEach(([x, z, w, d]) => L.push([hvBX(w, .1, d), "#e4bb63", T4(x, .01, z)])); [[-1.73, 0], [1.73, 0]].forEach(([x, z]) => L.push([hvBX(.06, .1, 2.3), "#e4bb63", T4(x, .01, z)]));
    L.push([hvCY(7, 7, .04, 40), "#2b1c12", T4(0, -1.3, 0)], [hvCY(3.1, 3.1, .02, 40), "#16345f", T4(0, -1.27, 0)], [hvCY(3.2, 3.2, .015, 40), "#e4bb63", T4(0, -1.275, 0)]);
    hvBake(L, g, { fog: false });
    const tex = canvasTex(64, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0a1626"); gr.addColorStop(.45, "#12305a"); gr.addColorStop(.62, "#1d4a80"); gr.addColorStop(1, "#070d18"); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    const sg = new THREE.SphereGeometry(26, 24, 16); W.disposables.push(sg); const dome = mesh(sg, basic({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }), g); dome.renderOrder = -5;
    hvLabel("BALATON-TEREPASZTAL", "a Zephyr Expressz körútja", 0, .95, -1.25, g, 1.5);
    g.visible = false;
  }
  function hvTableShow(on) {
    if (!HV.tbl) hvTableBuild(W.root); HVT.on = on; if (on) HVT.pos = null; HV.tbl.visible = on; HV.far.visible = !on; HV.water.visible = !on; HV.ride.visible = !on; if (HV.wildG) HV.wildG.visible = !on; if (HVP.clouds) HVP.clouds.visible = !on; if (HVP.line) HVP.line.visible = on; if (HVP.mini) HVP.mini.visible = on; if (HVP.streak) HVP.streak.ln.visible = false;
    (HV.sightG || []).forEach((q) => q.g.scale.setScalar(q.sc * (on ? 2.3 : 1))); (HV.labels || []).forEach((s) => { const b = s.userData.sc0 || (s.userData.sc0 = s.scale.x); s.scale.set(b * (on ? 2.1 : 1), b * (on ? 2.1 : 1) / 4, 1); });
    HVP.rings.forEach((r) => { r.m.visible = !on; });
    try { if (on) { AU.set("rush", 0, .3); AU.set("wind", .01, .5); } } catch (e) {}
  }
  function hvTableApply(dt) {
    /* az asztal a néző szeme alá 62 cm-rel, 1,85 m-rel elé kerül – a kamera VALÓDI helyéből számolva (megnyitáskor és VR-váltáskor egyszer) */
    if (!HVT.pos || HVT.vr !== T.inVR) { HVT.vr = T.inVR; let ey = 0; try { ey = T.headY(); } catch (e) {} if (T.inVR) ey = Math.max(1.0, ey); HVT.pos = T.inVR ? new THREE.Vector3(0, ey - .62, -1.85) : new THREE.Vector3(0, ey - .5, -2.25); }   /* 2D-ben a kamera az origóban van (headY = 0), VR-ben a fej magasságában */
    const tp = HVT.pos, ty = tp.y;
    HV.tbl.position.copy(tp); if (HVT.spin) HVT.rot += dt * .07;
    const m = new THREE.Matrix4().makeTranslation(tp.x, ty + .012, tp.z); m.multiply(new THREE.Matrix4().makeRotationY(HVT.rot)); m.multiply(new THREE.Matrix4().makeScale(HVT.sc, HVT.sc, HVT.sc)); m.multiply(new THREE.Matrix4().makeTranslation(-HVT.cx, -.9, -HVT.cz));
    HV.env.matrix.copy(m); HV.env.matrixWorldNeedsUpdate = true; HV.tbl.rotation.y = HVT.rot;
    const g = HVP.mini; if (g) { HVP.ms = (HVP.ms + dt * 62) % HV.calm.L; const fr = HV.calm.at(HVP.ms, HV.fr); g.position.copy(fr.p); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(fr.u, fr.f).normalize(), fr.u, fr.f)); let near = 1e9, ci = 0; HV.sights.forEach((s, i) => { const d = Math.hypot(s.x - fr.p.x, s.z - fr.p.z); if (d < near) { near = d; ci = i; } }); if (ci !== HVT.cur) { HVT.cur = ci; W.panelDirty = 1; } }
  }
