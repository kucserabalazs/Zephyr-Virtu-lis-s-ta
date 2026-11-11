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
    const KIT = hvKitOn(), LITE = hvKitLite(); HVK.trees = []; HVK.houses = []; HVK.boats = []; HVK.mboats = []; HVK.meshes = [];
    const tp = []; for (let k = 0; k < TR.M; k += 5) tp.push(TR.P[k]);
    const clear = (x, z, h, r) => { const r2 = r * r; for (let i = 0; i < tp.length; i++) { const p = tp[i], dx = p.x - x, dz = p.z - z; if (dx * dx + dz * dz < r2 && p.y < h + 6) return false; } return true; };
    const sightD = (x, z) => { let m = 1e9; HV.sights.forEach((s) => { const d = Math.hypot(s.x - x, s.z - z); if (d < m) m = d; }); return m; };
    const onLand = (x, z, r) => { if (hvInLake(x, z)) return false; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; if (hvInLake(x + Math.cos(a) * r, z + Math.sin(a) * r)) return false; } return true; };
    /* 1) dombok – a Balaton-felvidék és Somogy lankái */
    { const L = []; let n = 0; for (let i = 0; i < 520 && n < 64; i++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0), north = z < -40, r = 26 + rnd() * (north ? 54 : 34), h = (north ? 9 : 5) + rnd() * (north ? 22 : 9);
        if (!onLand(x, z, r + 8) || sightD(x, z) < r + 80 || !clear(x, z, h, r + 10)) continue; hvHill(L, x, z, r, h, ["#6aa457", "#5f9a4e", "#74ad5c", "#57924a"][n % 4], .3 + rnd() * .25); n++;
        if (north && n % 3 === 0) for (let q = 0; q < 3; q++) for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI + .3; L.push([hvBX(4.4, .5, .6), q % 2 ? "#8fbf4f" : "#7aad42", T4(x + Math.cos(a) * (r * .8 - q * 3), 1.4 + q * 1.2, z + Math.sin(a) * (r * .8 - q * 3), -a + Math.PI / 2)]); } }
      if (L.length) { const hm = hvBake(L, env); try { hvDetail(hm, "fu", [.125, .159, .033], .09); } catch (e) {} } }
    /* 2) erdők, fasorok */
    { const L = [], NT = HVK.max ? HVK.maxN : KIT ? (LITE ? 520 : 1300) : 620; let n = 0; for (let i = 0; i < (HVK.max ? 40000 : 7000) && n < NT; i++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (hvInLake(x, z) || sightD(x, z) < 46 || !clear(x, z, 8, 7)) continue; const hh = 2.6 + rnd() * 3.4, dark = rnd() < .5;
        if (KIT) { HVK.trees.push([x, z, hh]); n++; continue; }
        L.push([hvCO(1.3 + rnd() * .9, hh * 1.5, 6), dark ? "#2f7a3e" : (n % 5 ? "#3f8f4a" : "#4f9f52"), T4(x, .9 + hh * .95, z)], [hvCY(.2, .26, 1.3, 5), "#5a4030", T4(x, 1.4, z)]); n++; }
      if (L.length) hvBake(L, env); }
    /* 3) települések: házak piros tetővel, templom toronnyal */
    { const L = [], walls = ["#f4efe2", "#efe2bd", "#f6ecd0", "#e9e2d2", "#f1d9b0"], roofs = ["#b5492f", "#a8452c", "#c05a3a", "#8f3f2a"];
      HV_TOWNS.forEach(([nm, la, lo], ti) => { const [cx, cz] = hvMP(la, lo); let made = 0;
        for (let i = 0; i < (HVK.max ? 160 : 60) && made < (HVK.max ? 22 : KIT ? (LITE ? 4 : 9) : 15); i++) { const a = rnd() * TAU, d = 5 + rnd() * (HVK.max ? 46 : 30), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (!onLand(x, z, 3) || sightD(x, z) < 36 || !clear(x, z, 9, 7)) continue;
          const w = 2.6 + rnd() * 1.6, dp = 3 + rnd() * 2.4, h = 1.9 + rnd() * 1.3, ry = rnd() * Math.PI; if (KIT) { HVK.houses.push([x, z, Math.round(rnd() * 4) * Math.PI / 2 + (rnd() - .5) * .3, w]); made++; continue; } L.push([hvBX(w, h, dp), walls[(ti + made) % 5], T4(x, .9 + h / 2, z, ry)]);
          const rf = new THREE.Matrix4().makeRotationY(ry + Math.PI / 4); rf.premultiply(new THREE.Matrix4().makeScale(1, 1, 1)); rf.setPosition(x, .9 + h + .8, z); L.push([hvCO(Math.max(w, dp) * .78, 1.7, 4), roofs[(ti + made) % 4], rf]); made++; }
        if (made > 5) { let x = cx + 6, z = cz - 5; if (onLand(x, z, 4) && sightD(x, z) > 36 && clear(x, z, 16, 6)) L.push([hvBX(3.4, 4, 7), "#f6f1e4", T4(x, 2.9, z)], [hvBX(2.4, 8.5, 2.4), "#f6f1e4", T4(x, 5.1, z + 4.2)], [hvCO(2, 4.4, 4), "#7a3b22", T4(x, 11.5, z + 4.2, Math.PI / 4)], [hvBX(.14, 1.3, .14), "#e4bb63", T4(x, 14.2, z + 4.2)]); } });
      if (L.length) hvBake(L, env); }
    /* 4) élet a tavon: vitorlások, bóják */
    { const L = [], sails = ["#ffffff", "#fffaf0", "#d61f26", "#f5c542", "#ffffff", "#3d7fc2"]; let n = 0;
      for (let i = 0; i < (HVK.max ? 5000 : 1600) && n < (HVK.max ? 220 : KIT ? (LITE ? 50 : 90) : 44); i++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (!hvInLake(x, z) || !clear(x, z, 16, 12) || sightD(x, z) < 40) continue; let ok = true; for (let k = 0; k < 4; k++) if (!hvInLake(x + Math.cos(k * 1.57) * 22, z + Math.sin(k * 1.57) * 22)) ok = false; if (!ok) continue;
        if (KIT) { HVK.boats.push([x, z, rnd() * TAU, 1.1 + rnd() * .8]); n++; continue; }
        const ry = rnd() * TAU, s = 1.1 + rnd() * .8, R = (dx, dy, dz) => { const m = new THREE.Matrix4().makeRotationY(ry); m.setPosition(x + (dx * Math.cos(ry) + dz * Math.sin(ry)) * s, dy * s, z + (-dx * Math.sin(ry) + dz * Math.cos(ry)) * s); m.scale(new THREE.Vector3(s, s, s)); return m; };
        L.push([hvBX(2.1, 1.1, 7.4), n % 3 ? "#f7f7f2" : "#13305e", R(0, .5, 0)], [hvCY(.1, .12, 10, 5), "#c9ced4", R(0, 5.8, -.6)]);
        { const g = hvCO(2.7, 8.2, 3); g.scale(.08, 1, 1); L.push([g, sails[n % 6], R(0, 5.6, 1)]); const g2 = hvCO(1.9, 6.4, 3); g2.scale(.08, 1, 1); L.push([g2, "#fffaf0", R(0, 4.6, -2.3)]); } n++; }
      for (let i = 0, nb = 0; i < 400 && nb < 26; i++, nb++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (!hvInLake(x, z)) continue; L.push([hvCY(.5, .7, 1.4, 8), n % 2 ? "#f5c542" : "#d61f26", T4(x, .6, z)], [hvCO(.5, .9, 8), "#f5f5f0", T4(x, 1.7, z)]); n++; }
      if (L.length) hvBake(L, env); }
    /* 4b) vitorláskikötők + a kész modellek kirakása */
    try { hvHarbours(env, rnd); } catch (e) { console.warn("hvHarbours", e); }
    if (KIT) { try { hvKitBuild(env, rnd); } catch (e) { console.warn("hvKitBuild", e); } }
    /* 5) felhők a pálya csúcsai körül – ezek között suhansz át */
    /* 2026-11-11 23:31: a szögletes, kódból rakott felhők KIVÉVE – a valódi égfotó felhői mellett csúnyák voltak */
    if (false) { const L = []; let last = -1e9, n = 0; for (let k = 0; k < TR.M && n < 46; k++) { const p = TR.P[k]; if (p.y < 62 || TR.S[k] - last < 55) continue; last = TR.S[k]; const f = TR.F[k], sd = n % 2 ? 1 : -1, off = 20 + rnd() * 30, cx = p.x - f.z * sd * off, cz = p.z + f.x * sd * off, cy = p.y + (rnd() * 22 - 9);
        for (let q = 0; q < 5; q++) { const g = hvSP(7 + rnd() * 7); g.scale(1.25, .55, 1); L.push([g, "#ffffff", T4(cx + (q - 2) * 8 + rnd() * 4, cy + (q % 2) * 2.4, cz + rnd() * 10 - 5)]); } n++; }
      if (L.length) { HVP.clouds = hvBake(L, env, { fog: false, transparent: true, opacity: .93 }); } }
    /* 6) DIMENZIÓKAPUK a csúcsokon (2026-11-11 23:22, tulajdonos: „kidolgoztunk szép dimenziókapukat” – az arany karikák helyett):
          a séta kilenc mesebeli kapuja (img/kapu/kNN-keret.webp + kNN-belso.jpg). A keret a pályára merőlegesen áll, a közepén a kapu világa
          lassan örvénylik; áthaladáskor a kapu világa egy pillanatra körülvesz, aztán szétfoszlik. A képek csak közeledéskor töltődnek be. */
    { HVP.rings = []; const NO = [7, 2, 20, 1, 6, 13, 14, 15, 3], RP = { 1: .625, 2: .7375, 3: .727, 6: .7105, 7: .7375, 13: .691, 14: .715, 15: .712, 20: .658 }, SZ = 34;
      const pg = new THREE.PlaneGeometry(SZ, SZ); W.disposables.push(pg);
      for (let k = 2; k < TR.M - 2; k++) { const y = TR.P[k].y; if (y < 40 || y < TR.P[k - 1].y || y <= TR.P[k + 1].y) continue; if (HVP.rings.length && TR.S[k] - HVP.rings[HVP.rings.length - 1].s < 160) continue;
        if ((HV.loopS || []).some(([a2, b2]) => TR.S[k] > a2 - 60 && TR.S[k] < b2 + 60) || (HV.orbS || []).some(([a2, b2]) => TR.S[k] > a2 - 20 && TR.S[k] < b2 + 20)) continue;   /* hurokba és a látnivalók körébe nem kerül kapu */
        const no = NO[HVP.rings.length % NO.length], fr = TR.at(TR.S[k], { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3() }), g = new THREE.Group();
        g.position.copy(fr.p).addScaledVector(fr.u, 1.4); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(fr.u, fr.f).normalize(), fr.u, fr.f));
        const fm = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .04, side: THREE.DoubleSide, fog: false, depthWrite: false, opacity: 0 }), im = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false, opacity: 0 });
        const cg = new THREE.CircleGeometry(SZ / 2 * RP[no] * 1.03, 56); W.disposables.push(fm, im, cg);
        const inner = new THREE.Mesh(cg, im), frame = new THREE.Mesh(pg, fm); inner.renderOrder = 3; frame.renderOrder = 4; frame.position.z = .05; g.add(inner); g.add(frame); g.visible = false; env.add(g);
        HVP.rings.push({ m: g, inner, frame, s: TR.S[k], no, st: 0 }); }
      const sg = new THREE.SphereGeometry(5, 24, 16), sm = new THREE.MeshBasicMaterial({ side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false }); W.disposables.push(sg, sm);
      HVP.warp = new THREE.Mesh(sg, sm); HVP.warp.renderOrder = 50; HVP.warp.visible = false; HVP.warp.frustumCulled = false; root.add(HVP.warp); }
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
    { const sm = ((HV.s % TR.L) + TR.L) % TR.L, calm = HV.st !== "table";
      HVP.rings.forEach((r, i) => { const da = ((r.s - sm) % TR.L + TR.L) % TR.L;   /* ennyi van még hátra a kapuig */
        if (!r.st && calm && (da < 900 || TR.L - da < 60)) { r.st = 1; const Ld = new THREE.TextureLoader(), nn = String(r.no).padStart(2, "0");
          Ld.load("img/kapu/k" + nn + "-keret.webp", (t) => { t.colorSpace = THREE.SRGBColorSpace; W.disposables.push(t); r.frame.material.map = t; r.frame.material.needsUpdate = true; r.st++; });
          Ld.load("img/kapu/k" + nn + "-belso.jpg", (t) => { t.colorSpace = THREE.SRGBColorSpace; W.disposables.push(t); r.inner.material.map = t; r.inner.material.needsUpdate = true; r.st++; }); }
        const rdy = r.st >= 3 && calm; r.m.visible = rdy; if (!rdy) return;
        const o = r.frame.material; o.opacity += (1 - o.opacity) * Math.min(1, dt * 1.5); r.inner.material.opacity = o.opacity * (.9 + .08 * Math.sin(HVP.t * 2.3 + i));
        r.inner.rotation.z += dt * .22; r.frame.rotation.z = Math.sin(HVP.t * .5 + i) * .03; const pu = 1 + .025 * Math.sin(HVP.t * 2 + i); r.inner.scale.setScalar(pu);
        if (ride && r.last != null && r.last < 30 && da > TR.L - 30) { HVP.warpT = 0; HVP.warp.material.map = r.inner.material.map; HVP.warp.material.needsUpdate = true; try { T.sfx && T.sfx("whoosh"); } catch (e) {} }   /* most haladtunk át rajta */
        r.last = da; });
      const wp = HVP.warp; if (wp) { if (HVP.warpT != null) { HVP.warpT += dt; const u = HVP.warpT / 1.3; if (u >= 1) { HVP.warpT = null; wp.visible = false; } else { wp.visible = true; wp.material.opacity = .9 * (1 - u) * (1 - u); wp.rotation.z += dt * 2.4; wp.rotation.y += dt * .8; try { const hp = T.headPos(); if (hp) wp.position.copy(hp); } catch (e) {} } } else wp.visible = false; } }
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
    HVT.title = hvLabel("BALATON-TEREPASZTAL", "a Zephyr Expressz körútja", 0, .95, -1.25, g, 1.5);
    g.visible = false;
  }
  function hvTableShow(on) {
    if (!HV.tbl) hvTableBuild(W.root); HVT.on = on; if (on) { HVT.pos = null; hvTableFit(); HVT.zoom = HVT.zoomT = 1; HVT.cx = HVT.cx0; HVT.cz = HVT.cz0; HVT.follow = false; HVT.spin = !!T.inVR; } if (HVT.rim) HVT.rim.visible = on; hvTableClip(on); hvTable2D(on && !T.inVR); HV.tbl.visible = on; HV.far.visible = !on; HV.water.visible = !on; HV.ride.visible = !on; if (HV.wildG) HV.wildG.visible = !on; if (HVP.clouds) HVP.clouds.visible = !on; if (HVP.line) HVP.line.visible = on; if (HVP.mini) HVP.mini.visible = on; if (HVP.streak) HVP.streak.ln.visible = false;
    (HV.sightG || []).forEach((q) => q.g.scale.setScalar(q.sc * (on ? 2.3 : 1))); (HV.labels || []).forEach((s) => { const b = s.userData.sc0 || (s.userData.sc0 = s.scale.x); s.scale.set(b * (on ? 2.1 : 1), b * (on ? 2.1 : 1) / 4, 1); });
    HVP.rings.forEach((r) => { r.m.visible = !on; });
    try { if (on) { AU.set("rush", 0, .3); AU.set("wind", .01, .5); } } catch (e) {}
  }
  /* 2026-11-11 23:17 (tulajdonos, telefonról: „a terepasztal nem mozdítható, nem tudok ráközelíteni, nem látszik semmi … használhatatlan, kidolgozatlannak látszik”):
     • a TÓ tölti ki az asztalt: a partvonal főtengelye az asztal hosszába fordul, a lépték a tó hosszához igazodik (eddig a tó vékony csík volt a távolban);
     • MOZGATHATÓ és NAGYÍTHATÓ: egy ujjal húzva a térkép csúszik, két ujjal nagyít/kicsinyít és forgat (gépen: egér + görgő); gombok: nagyítás, kicsinyítés,
       alaphelyzet, „kövesd a vonatot”; ami a nagyításnál kilógna, azt az asztal széle levágja (vágósíkok), így olyan, mint egy térkép-ablak;
     • telefonon felülről, döntve nézünk rá (a nézet rögzített, az ujj a térképet mozgatja – nem a kamerát). */
  function hvTableFit() {
    if (HVT.fit) return; HVT.fit = true; let mx = 0, mz = 0; const P = HV_SHORE.map(([lon, lat]) => hvMP(lat, lon)); P.forEach(([x, z]) => { mx += x; mz += z; }); mx /= P.length; mz /= P.length;
    let sxx = 0, szz = 0, sxz = 0; P.forEach(([x, z]) => { sxx += (x - mx) * (x - mx); szz += (z - mz) * (z - mz); sxz += (x - mx) * (z - mz); });
    const th = .5 * Math.atan2(2 * sxz, sxx - szz), c = Math.cos(th), sn = Math.sin(th); let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    P.forEach(([x, z]) => { const a = x * c + z * sn, b = -x * sn + z * c; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); });
    const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2; HVT.align = th; HVT.sc = 2.9 / (a1 - a0); HVT.cx0 = ca * c - cb * sn; HVT.cz0 = ca * sn + cb * c;
    HVT.planes = [0, 1, 2, 3].map(() => new THREE.Plane());
    /* a térkép lapja körül sima „szárazföld” – nagyításnál/forgatásnál se látsszon ki mellette az asztal kék lapja (az tónak tűnt) */
    { const sh = new THREE.Shape(); sh.moveTo(-9000, -9000); sh.lineTo(9000, -9000); sh.lineTo(9000, 9000); sh.lineTo(-9000, 9000); sh.closePath(); const ho = new THREE.Path(); ho.moveTo(-1900, -640); ho.lineTo(-1900, 880); ho.lineTo(760, 880); ho.lineTo(760, -640); ho.closePath(); sh.holes.push(ho);
      const gg = new THREE.ShapeGeometry(sh, 1); gg.rotateX(-Math.PI / 2); gg.translate(0, .9, 0); W.disposables.push(gg); HVT.rim = mesh(gg, basic({ color: "#d3dfb4", fog: false }), HV.env); HVT.rim.visible = false; }
  }
  function hvTableClip(on) {
    try { T.sceneEl.renderer.localClippingEnabled = true; } catch (e) {}
    HV.env.traverse((o) => { if (o === HV.far || !o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.isShaderMaterial) return; m.clippingPlanes = on ? HVT.planes : null; m.needsUpdate = true; }); });
  }
  const TBV = { pts: new Map(), cv: null, on: false };
  function hvTable2D(on) {
    if (on === TBV.on) return; TBV.on = on; try { T.cam.setAttribute("look-controls", "enabled", !on); } catch (e) {}
    if (!on) { if (TBV.cv) { const cv = TBV.cv, h = TBV.h; cv.removeEventListener("pointerdown", h.down); removeEventListener("pointermove", h.move); removeEventListener("pointerup", h.up); removeEventListener("pointercancel", h.up); cv.removeEventListener("wheel", h.wheel); TBV.cv = null; TBV.pts.clear(); } return; }
    const cv = T.sceneEl.canvas; if (!cv) return; TBV.cv = cv; const P = TBV.pts;
    const two = () => { const a = [...P.values()]; return { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), a: Math.atan2(a[1].y - a[0].y, a[1].x - a[0].x) }; };
    TBV.h = {
      down: (e) => { if (!HVT.on) return; P.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (P.size === 2) TBV.p2 = two(); },
      move: (e) => { if (!HVT.on || !P.has(e.pointerId)) return; const q = P.get(e.pointerId), dx = e.clientX - q.x, dy = e.clientY - q.y; q.x = e.clientX; q.y = e.clientY;
        if (P.size === 1) { let fov = 80; try { fov = T.sceneEl.camera.fov; } catch (x) {} const mpp = 2 * HVT.D * Math.tan(fov * D2R / 2) / Math.max(1, innerHeight), wx = dx * mpp, wz = dy * mpp / Math.sin(HVT.pitch);
          const a = -(HVT.rot + HVT.align), k = 1 / (HVT.sc * HVT.zoom); HVT.cx -= (wx * Math.cos(a) + wz * Math.sin(a)) * k; HVT.cz -= (-wx * Math.sin(a) + wz * Math.cos(a)) * k; HVT.follow = false; HVT.spin = false; }
        else if (P.size === 2 && TBV.p2) { const n = two(); if (TBV.p2.d > 10) HVT.zoomT = clamp(HVT.zoomT * n.d / Math.max(10, TBV.p2.d), 1, 12); let da = n.a - TBV.p2.a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; HVT.rot -= da; HVT.spin = false; TBV.p2 = n; } },
      up: (e) => { P.delete(e.pointerId); TBV.p2 = null; },
      wheel: (e) => { if (!HVT.on) return; e.preventDefault(); HVT.zoomT = clamp(HVT.zoomT * Math.exp(-e.deltaY * .0015), 1, 12); }
    };
    cv.addEventListener("pointerdown", TBV.h.down); addEventListener("pointermove", TBV.h.move); addEventListener("pointerup", TBV.h.up); addEventListener("pointercancel", TBV.h.up); cv.addEventListener("wheel", TBV.h.wheel, { passive: false }); cv.style.touchAction = "none";
    if (!TBV.disp) { TBV.disp = true; }
    W.disposables.push({ dispose() { hvTable2D(false); HVT.on = false; HVT.fit = false; TBV.on = false; } });
  }
  function hvTableApply(dt) {
    hvTableFit();
    const portrait = innerHeight > innerWidth * 1.1;
    if (!HVT.pos || HVT.vr !== T.inVR || HVT.por !== portrait) { HVT.vr = T.inVR; HVT.por = portrait; let ey = 0; try { ey = T.headY(); } catch (e) {} if (T.inVR) ey = Math.max(1.0, ey);
      if (T.inVR) HVT.pos = new THREE.Vector3(0, ey - .62, -1.85);
      else { HVT.pitch = portrait ? 1.12 : .98; HVT.D = portrait ? 3.0 : 2.15; HVT.pos = new THREE.Vector3(0, ey - HVT.D * Math.sin(HVT.pitch), -HVT.D * Math.cos(HVT.pitch)); HVT.rot = portrait ? Math.PI / 2 : 0; } }   /* telefonon (álló kép) az asztal hossza a képernyő hosszába fordul */
    if (!T.inVR) { hvTable2D(true); try { T.cam.object3D.rotation.set(-HVT.pitch, 0, 0); } catch (e) {} } else hvTable2D(false);
    if (HVT.title) HVT.title.visible = !!T.inVR;
    const tp = HVT.pos, ty = tp.y;
    HV.tbl.position.copy(tp); if (HVT.spin) HVT.rot += dt * .07;
    HVT.zoom = Math.exp(lerp(Math.log(HVT.zoom), Math.log(HVT.zoomT), Math.min(1, dt * 7)));
    const g = HVP.mini; let trn = null; if (g) { HVP.ms = (HVP.ms + dt * 62) % HV.calm.L; const fr = HV.calm.at(HVP.ms, HV.fr); trn = fr.p; g.position.copy(fr.p); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(fr.u, fr.f).normalize(), fr.u, fr.f)); let near = 1e9, ci = 0; HV.sights.forEach((s, i) => { const d = Math.hypot(s.x - fr.p.x, s.z - fr.p.z); if (d < near) { near = d; ci = i; } }); if (ci !== HVT.cur) { HVT.cur = ci; W.panelDirty = 1; } }
    if (HVT.follow && trn) { const k = Math.min(1, dt * 3); HVT.cx += (trn.x - HVT.cx) * k; HVT.cz += (trn.z - HVT.cz) * k; }
    HVT.cx = clamp(HVT.cx, -1900, 760); HVT.cz = clamp(HVT.cz, -880, 640);
    const sc = HVT.sc * HVT.zoom, m = new THREE.Matrix4().makeTranslation(tp.x, ty + .012, tp.z); m.multiply(new THREE.Matrix4().makeRotationY(HVT.rot + HVT.align)); m.multiply(new THREE.Matrix4().makeScale(sc, sc, sc)); m.multiply(new THREE.Matrix4().makeTranslation(-HVT.cx, -.9, -HVT.cz));
    HV.env.matrix.copy(m); HV.env.matrixWorldNeedsUpdate = true; HV.tbl.rotation.y = HVT.rot;
    /* vágósíkok: az asztal kék lapjának széle (3,12 × 1,86 m), az asztallal együtt forogva */
    { const c = Math.cos(HVT.rot), sn = Math.sin(HVT.rot), ax = new THREE.Vector3(c, 0, -sn), az = new THREE.Vector3(sn, 0, c), PL = HVT.planes;
      [[ax, 1.56], [ax, -1.56], [az, .93], [az, -.93]].forEach(([v, d], i) => { const n = v.clone().multiplyScalar(d > 0 ? -1 : 1), pt = tp.clone().addScaledVector(v, d); PL[i].setFromNormalAndCoplanarPoint(n, pt); }); }
  }
