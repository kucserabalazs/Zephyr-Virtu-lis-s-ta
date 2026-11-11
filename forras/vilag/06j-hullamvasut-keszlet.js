  /* =====================================================================================================
     HULLÁMVASÚT – KÉSZ MODELLEK ÉS TEXTÚRÁK (2026-11-11 éjjel, a tulajdonos: „csináld meg a felhasználható anyagokkal, tedd bőven tele
     az ingyenes készletből”, „textúrát akarok az egész környezetre”, „tedd be az összes balatoni vitorláskikötőt”).
     - img/kit/: Kenney (kenney.nl) Nature Kit, Watercraft Pack, City Kit Suburban, Pirate Kit – mind CC0 (szabadon használható).
       A fák, házak, hajók KÉSZ MODELLEK (glb), példányosítva (InstancedMesh) – kevés rajzolási hívás, sok példány.
     - img/tex/: fű, homok, szikla fényképtextúrák (ambientCG / Poly Haven, CC0) – a térkép talaja és a dombok ezt kapják.
     - HV_HARBOURS: a Balaton vitorláskikötői a valódi helyükön (a partvonalra illesztve): móló, hullámtörő, úszóstégek, kikötött vitorlások.
     Kikapcsolás: localStorage „zephyr-hv-keszlet” = 0 (akkor a régi, kódból rakott fák/házak/hajók maradnak).
     ===================================================================================================== */
  const HVK = { trees: [], houses: [], boats: [], mboats: [] };
  function hvKitOn() { try { if (localStorage.getItem("zephyr-hv-keszlet") === "0") return false; } catch (e) {} return !!(window.THREE && THREE.GLTFLoader && THREE.InstancedMesh); }
  /* MAXIMÁLIS RÉSZLETESSÉG (2026-11-12 00:05, tulajdonos: „mutasd meg a maximális kidolgozottságot, ne számítson, mennyi számítással jár és mi bírja – a maximumot akarom látni”):
     valódi fények és vetett árnyékok (nap + égbolt-fény), megvilágított (nem kisütött) modellek, 6000 fa részletes változatokkal, bokrok, virágok, fűcsomók,
     gabonatáblák, sziklák, farakások, sátrak; városonként 22 ház mind a 21 típusból; 220 hajó a tavon; kikötőnként akár 24 kikötött hajó.
     Alapból BE gépen és telefonon, KI a szemüvegben (ott a képkockasebesség esése rosszullétet okozhat) – az állomás gombjával bárhol átkapcsolható.
     localStorage „zephyr-hv-max”: 1 = be, 0 = ki. */
  function hvMaxOn() { let v = null; try { v = localStorage.getItem("zephyr-hv-max"); } catch (e) {} if (v === "1") return true; if (v === "0") return false; return !/OculusBrowser|Quest|Pico/i.test(navigator.userAgent); }
  function hvKitLite() { if (hvMaxOn()) return false; return /iPhone|iPad|iPod|Android|OculusBrowser|Quest|Pico/i.test(navigator.userAgent); }
  function hvMaxLights(env) {
    const r = T.sceneEl.renderer, k = r.useLegacyLights === false || r.useLegacyLights === undefined ? Math.PI : 1, sun = (HV.foto && HV.foto.sun) ? HV.foto.sun.clone() : HV_SUN.clone();
    const hemi = new THREE.HemisphereLight(0xdfeaff, 0x7c8a55, .62 * k), dl = new THREE.DirectionalLight(0xfff1d6, .95 * k); env.add(hemi); env.add(dl); env.add(dl.target);
    dl.castShadow = true; { const ms = HVK.maxN < 2000 ? 1024 : 4096; dl.shadow.mapSize.set(ms, ms); } const c = dl.shadow.camera; c.left = -210; c.right = 210; c.top = 210; c.bottom = -210; c.near = 20; c.far = 1100; c.updateProjectionMatrix(); dl.shadow.bias = -.0006; dl.shadow.normalBias = .5;
    HVK.sun = { dl, dir: sun.normalize() }; HVK.shadow0 = { en: r.shadowMap.enabled, ty: r.shadowMap.type }; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.needsUpdate = true;
    W.disposables.push({ dispose() { try { r.shadowMap.enabled = HVK.shadow0.en; r.shadowMap.type = HVK.shadow0.ty; dl.shadow.map && dl.shadow.map.dispose(); } catch (e) {} HVK.sun = null; } });
  }
  function hvMaxTick(p) { const S = HVK.sun; if (!S || !p) return; S.dl.target.position.set(p.x, 0, p.z); S.dl.position.set(p.x, 0, p.z).addScaledVector(S.dir, 520); }
  function hvTex(name, rep) { const t = new THREE.TextureLoader().load("img/tex/" + name + ".jpg"); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (rep) t.repeat.set(rep, rep); W.disposables.push(t); return t; }
  /* egy glb → egyetlen, kisütött fényű háló (helyzet, normál, szín, uv) + a közös színtérkép */
  function hvKitGeo(url, cb) {
    new THREE.GLTFLoader().load(url, (gltf) => {
      try {
        const parts = [], MAXM = !!HVK.max; let map = null, n = 0; gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((o) => { if (!o.isMesh) return; const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); g.computeVertexNormals();
          const mt = Array.isArray(o.material) ? o.material[0] : o.material; if (mt && mt.map) map = mt.map; const c = (mt && mt.color) ? mt.color.clone() : new THREE.Color(1, 1, 1), nm = (mt && mt.name) || "";
          if (/leaf|grass/i.test(nm)) c.setRGB(/dark/i.test(nm) ? .075 : .12, /dark/i.test(nm) ? .27 : .36, /dark/i.test(nm) ? .085 : .09); else if (/bark|^wood$/i.test(nm)) c.setRGB(.24, .14, .08);
          parts.push([g, c]); n += g.attributes.position.count; });
        if (!n) return;
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0, y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
        parts.forEach(([g, c]) => { const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, m = P.count;
          for (let i = 0; i < m; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), d = N.getX(i) * HV_SUN.x + N.getY(i) * HV_SUN.y + N.getZ(i) * HV_SUN.z, k = MAXM ? 1 : .56 + .5 * Math.max(0, d) + .1 * N.getY(i), q = (o + i) * 3;
            pos[q] = x; pos[q + 1] = y; pos[q + 2] = z; nor[q] = N.getX(i); nor[q + 1] = N.getY(i); nor[q + 2] = N.getZ(i); col[q] = c.r * k; col[q + 1] = c.g * k; col[q + 2] = c.b * k; if (U) { uv[(o + i) * 2] = U.getX(i); uv[(o + i) * 2 + 1] = U.getY(i); }
            y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
          o += m; g.dispose(); });
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; for (let i = 0; i < n; i++) { pos[i * 3] -= cx; pos[i * 3 + 1] -= y0; pos[i * 3 + 2] -= cz; }
        const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        const mat = MAXM ? new THREE.MeshStandardMaterial({ vertexColors: true, map: map || null, fog: false, roughness: .82, metalness: 0 }) : new THREE.MeshBasicMaterial({ vertexColors: true, map: map || null, fog: false }); W.disposables.push(geo, mat); if (map) W.disposables.push(map);
        cb({ geo, mat, H: Math.max(.01, y1 - y0), Wd: Math.max(.01, x1 - x0, z1 - z0), Lz: Math.max(.01, z1 - z0) });
      } catch (e) { console.warn("hvKitGeo", url, e); }
    }, undefined, (e) => console.warn("hvKit: nem töltődött be", url));
  }
  /* items: [{x,y,z,ry,h}] (h = kívánt magasság) vagy {w} (kívánt szélesség) vagy {l} (kívánt hossz) */
  function hvKitInst(env, url, items, tint) {
    if (!items.length) return;
    hvKitGeo("img/kit/" + url, (G) => { if (!env.parent || !W.active) return;
      const im = new THREE.InstancedMesh(G.geo, G.mat, items.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
      items.forEach((it, i) => { const s = it.h ? it.h / G.H : it.l ? it.l / G.Lz : (it.w || 4) / G.Wd; q.setFromAxisAngle(Y, it.ry || 0); m.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m);
        if (tint) { const v = .82 + ((i * 37) % 19) / 19 * .36; c.setRGB(v, v * (.94 + ((i * 13) % 7) / 7 * .12), v * .95); im.setColorAt(i, c); } });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.frustumCulled = false; if (HVK.max) { im.castShadow = true; im.receiveShadow = true; } env.add(im); (HVK.meshes = HVK.meshes || []).push(im); });
  }
  /* a Balaton vitorláskikötői [név, szélesség, hosszúság] – a partvonal legközelebbi pontjára illesztve */
  const HV_HARBOURS = [["Siófok", 46.910, 18.047], ["Balatonvilágos", 46.975, 18.160], ["Balatonaliga", 46.990, 18.168], ["Balatonkenese", 47.031, 18.110], ["Balatonfűzfő", 47.056, 18.034], ["Balatonalmádi", 47.029, 18.019], ["Alsóörs", 46.983, 17.979], ["Csopak", 46.973, 17.930],
    ["Balatonfüred", 46.953, 17.893], ["Tihany", 46.914, 17.896], ["Balatonudvari", 46.898, 17.812], ["Balatonakali", 46.877, 17.748], ["Zánka", 46.870, 17.687], ["Balatonszepezd", 46.848, 17.660], ["Révfülöp", 46.826, 17.637], ["Ábrahámhegy", 46.813, 17.570],
    ["Badacsony", 46.787, 17.503], ["Szigliget", 46.787, 17.434], ["Balatongyörök", 46.756, 17.353], ["Vonyarcvashegy", 46.753, 17.313], ["Gyenesdiás", 46.760, 17.285], ["Keszthely", 46.757, 17.252], ["Balatonberény", 46.712, 17.317], ["Balatonmáriafürdő", 46.708, 17.390],
    ["Balatonfenyves", 46.719, 17.486], ["Fonyód", 46.752, 17.554], ["Balatonboglár", 46.779, 17.648], ["Balatonlelle", 46.789, 17.688], ["Balatonszemes", 46.812, 17.770], ["Balatonszárszó", 46.833, 17.825], ["Balatonföldvár", 46.856, 17.879], ["Szántód", 46.879, 17.900], ["Zamárdi", 46.887, 17.950]];
  function hvLabelS(txt, sub, x, y, z, parent, sc) {
    const t = canvasTex(512, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "rgba(9,28,58,.86)"; g.beginPath(); g.roundRect ? g.roundRect(4, 14, w - 8, h - 28, 30) : g.rect(4, 14, w - 8, h - 28); g.fill(); g.lineWidth = 3; g.strokeStyle = "#e4bb63"; g.stroke();
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.font = "800 40px Inter, system-ui, sans-serif"; g.fillText(txt, w / 2, 52, w - 30); g.fillStyle = "#e4bb63"; g.font = "600 24px Inter, system-ui, sans-serif"; g.fillText(sub, w / 2, 90); });
    const s = new THREE.Sprite(sprM({ map: t, transparent: true, depthWrite: false, fog: false })); s.scale.set(sc, sc / 4, 1); s.position.set(x, y, z); parent.add(s); return s;
  }
  function hvHarbours(env, rnd) {
    hvInLake(0, 0); const P = HV_POLY, n = P.length, L = [], lite = hvKitLite(); HV.harbours = [];
    const sightD = (x, z) => { let m = 1e9; HV.sights.forEach((s) => { const d = Math.hypot(s.x - x, s.z - z); if (d < m) m = d; }); return m; };
    HV_HARBOURS.forEach(([nm, la, lo], hi) => { const [tx, tz] = hvMP(la, lo); let bi = 0, bd = 1e9; P.forEach((p, i) => { const d = Math.hypot(p[0] - tx, p[1] - tz); if (d < bd) { bd = d; bi = i; } });
      for (let k = 0; k < 40 && sightD(P[bi][0], P[bi][1]) < 46; k++) bi = (bi + 1) % n;   /* a látnivaló saját mólójától arrébb */
      const p = P[bi], a = P[(bi - 2 + n) % n], b = P[(bi + 2) % n]; let nx = -(b[1] - a[1]), nz = b[0] - a[0]; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; if (!hvInLake(p[0] + nx * 9, p[1] + nz * 9)) { nx = -nx; nz = -nz; }
      const ry = Math.atan2(nx, nz), c = Math.cos(ry), s = Math.sin(ry), M = (dx, dy, dz, r2) => { const m = new THREE.Matrix4().makeRotationY(ry + (r2 || 0)); m.setPosition(p[0] + dx * c + dz * s, dy, p[1] - dx * s + dz * c); return m; }, W2 = (dx, dz) => [p[0] + dx * c + dz * s, p[1] - dx * s + dz * c];
      /* kőmóló a partról, a végén hullámtörő kar, két úszóstég, jelzőfények, kikötőmesteri házikó */
      L.push([hvBX(3.2, 1.5, 36), "#a9a294", M(-13, .55, 16)], [hvBX(3.4, .16, 36.2), "#c9c2b2", M(-13, 1.36, 16)], [hvBX(30, 1.5, 3.2), "#a9a294", M(.4, .55, 33.5)], [hvBX(30.2, .16, 3.4), "#c9c2b2", M(.4, 1.36, 33.5)], [hvBX(3.2, 1.5, 14), "#a9a294", M(15, .55, 27.5)]);
      [9, 21].forEach((dz) => { L.push([hvBX(24, .34, 1.7), "#b98a55", M(.5, .78, dz)]); for (let k = 0; k < 5; k++) L.push([hvCY(.16, .16, 2, 6), "#6b4a2e", M(-9 + k * 5, .6, dz + .95)]); });
      L.push([hvCY(.22, .26, 3.4, 8), "#2f9a5a", M(15, 2.9, 21)], [hvSP(.42), "#7dffb0", M(15, 4.8, 21)], [hvCY(.22, .26, 3.4, 8), "#d61f26", M(15, 2.9, 34.5)], [hvSP(.42), "#ff8a80", M(15, 4.8, 34.5)]);
      L.push([hvBX(4.4, 2.6, 3.6), "#f4efe2", M(-17.5, 2.2, 3)], [hvCO(3.6, 1.7, 4), "#b5492f", M(-17.5, 4.3, 3, Math.PI / 4)], [hvCY(.07, .07, 5, 5), "#f5f2e8", M(-14.5, 3.4, 1)], [hvBX(.05, .8, 1.3), "#d61f26", M(-14.5, 5.5, 1.7)], [hvBX(.05, .8, 1.3), "#3fb37f", M(-14.5, 4.7, 1.7)]);
      /* kikötött vitorlások az úszóstégek két oldalán */
      const per = HVK.max ? 6 : lite ? 2 : 4; [9, 21].forEach((dz) => [-1, 1].forEach((sd) => { for (let k = 0; k < per; k++) { if (rnd() < .18) continue; const [x, z] = W2(-8.5 + k * (20 / Math.max(1, per - 1)), dz + sd * 4.6); HVK.mboats.push({ x, y: .25, z, ry: ry + (sd > 0 ? 0 : Math.PI) + (rnd() - .5) * .08, l: 6.4 + rnd() * 2.2 }); } }));
      const [lx, lz] = W2(0, 12); hvLabelS("⚓ " + nm, "vitorláskikötő", lx, 17, lz, env, 30); HV.harbours.push({ n: nm, x: p[0], z: p[1] }); });
    if (L.length) hvBake(L, env, { fog: false });
  }
  /* a kész modellek kirakása (fák, házak, hajók, kikötők hajói) */
  function hvKitBuild(env, rnd) {
    const split = (arr, urls, fn) => { const B = urls.map(() => []); arr.forEach((it, i) => B[(i * 7 + (i >> 3)) % urls.length].push(fn(it, i))); urls.forEach((u, k) => hvKitInst(env, u, B[k], true)); };
    if (HVK.max) { split(HVK.trees, ["nature/tree_detailed.glb", "nature/tree_pineTallA_detailed.glb", "nature/tree_oak.glb", "nature/tree_pineTallC_detailed.glb", "nature/tree_detailed_dark.glb", "nature/tree_fat.glb", "nature/tree_pineTallB_detailed.glb", "nature/tree_default.glb", "nature/tree_pineTallD_detailed.glb", "nature/tree_oak_dark.glb", "nature/tree_plateau.glb", "nature/tree_tall.glb", "nature/tree_pineRoundC.glb", "nature/tree_small.glb"], ([x, z, hh]) => ({ x, y: .9, z, ry: rnd() * TAU, h: 4.5 + hh * 1.7 }));
      split(HVK.houses, "abcdefghijklmnopqrstu".split("").map((l) => "city/building-type-" + l + ".glb"), ([x, z, ry, w]) => ({ x, y: .9, z, ry, w: w * 1.9 }));
      /* aljnövényzet és élet a fák között: virágok, fűcsomók, gabona, kukorica, farakás, tuskó, sátor, gomba */
      const und = (url, every, off, h0, h1, dx) => { const A = []; HVK.trees.forEach(([x, z], i) => { if (i % every !== off) return; const a = rnd() * TAU, d = dx + rnd() * 5; A.push({ x: x + Math.cos(a) * d, y: .9, z: z + Math.sin(a) * d, ry: rnd() * TAU, h: h0 + rnd() * (h1 - h0) }); }); hvKitInst(env, url, A.filter((q) => !hvInLake(q.x, q.z)), true); };
      und("nature/grass_large.glb", 2, 0, .7, 1.3, 2); und("nature/grass_large.glb", 2, 1, .6, 1.1, 5); und("nature/grass_leafsLarge.glb", 3, 1, .7, 1.2, 3); und("nature/grass.glb", 3, 2, .5, .9, 4);
      und("nature/flower_redA.glb", 5, 0, .5, .8, 3); und("nature/flower_yellowA.glb", 5, 1, .5, .8, 3); und("nature/flower_purpleA.glb", 5, 2, .5, .8, 3); und("nature/flower_redB.glb", 7, 3, .5, .8, 4); und("nature/flower_yellowB.glb", 7, 4, .5, .8, 4); und("nature/flower_purpleB.glb", 7, 5, .5, .8, 4);
      und("nature/crops_wheatStageB.glb", 6, 2, 1, 1.5, 6); und("nature/crops_cornStageD.glb", 13, 4, 1.6, 2.2, 6); und("nature/log_stack.glb", 41, 7, 1, 1.4, 4); und("nature/stump_round.glb", 23, 5, .5, .8, 3); und("nature/tent_detailedOpen.glb", 97, 11, 2, 2.4, 5); und("nature/mushroom_redGroup.glb", 29, 9, .4, .6, 2); und("nature/rock_largeE.glb", 19, 6, 1.2, 2.6, 5); }
    else { split(HVK.trees, ["nature/tree_oak.glb", "nature/tree_pineTallA_detailed.glb", "nature/tree_default.glb", "nature/tree_pineRoundC.glb", "nature/tree_fat.glb", "nature/tree_tall.glb", "nature/tree_oak_dark.glb", "nature/tree_pineTallB_detailed.glb", "nature/tree_thin.glb", "nature/tree_simple.glb"], ([x, z, hh]) => ({ x, y: .9, z, ry: rnd() * TAU, h: 4.5 + hh * 1.5 }));
    split(HVK.houses, ["city/building-type-a.glb", "city/building-type-b.glb", "city/building-type-c.glb", "city/building-type-d.glb", "city/building-type-f.glb", "city/building-type-g.glb", "city/building-type-k.glb", "city/building-type-m.glb", "city/building-type-o.glb", "city/building-type-s.glb"], ([x, z, ry, w]) => ({ x, y: .9, z, ry, w: w * 1.9 })); }
    split(HVK.boats, ["water/boat-sail-a.glb", "water/boat-sail-b.glb", "water/boat-sail-a.glb", "water/boat-speed-a.glb", "water/boat-sail-b.glb", "water/boat-fishing-small.glb", "water/boat-sail-a.glb", "water/boat-row-small.glb", "water/boat-speed-d.glb", "water/boat-sail-b.glb"], ([x, z, ry, s]) => ({ x, y: .15, z, ry, l: 5.2 * s }));
    split(HVK.mboats, ["water/boat-sail-a.glb", "water/boat-sail-b.glb", "water/boat-sail-a.glb", "water/boat-speed-g.glb", "water/boat-sail-b.glb"], (it) => it);
    /* bokrok és sziklák a fák közé (a fák helyeiből sorsolva, kicsit arrébb) */
    if (!hvKitLite()) { const bs = [], rk = []; HVK.trees.forEach(([x, z], i) => { if (i % 3 === 0) bs.push({ x: x + 3 + rnd() * 3, y: .9, z: z + 2 - rnd() * 4, ry: rnd() * TAU, h: 1.4 + rnd() * 1.4 }); else if (i % 11 === 0) rk.push({ x: x - 3 - rnd() * 3, y: .85, z: z + rnd() * 4, ry: rnd() * TAU, h: 1.2 + rnd() * 1.8 }); });
      hvKitInst(env, "nature/plant_bushLarge.glb", bs.filter((_, i) => i % 2), true); hvKitInst(env, "nature/plant_bushDetailed.glb", bs.filter((_, i) => !(i % 2)), true); hvKitInst(env, "nature/rock_largeA.glb", rk.filter((_, i) => i % 2)); hvKitInst(env, "nature/rock_largeC.glb", rk.filter((_, i) => !(i % 2))); }
  }
  /* fényképtextúra a térkép talajára: fű (két léptékben, hogy ne látsszon az ismétlődés), a part mentén homok; a térkép rajza (feliratok, part) rajta marad */
  function hvGroundTex(mapMesh) {
    try { if (localStorage.getItem("zephyr-hv-keszlet") === "0") return; } catch (e) {}
    const X0 = -1900, X1 = 760, N0 = -640, N1 = 880, tG = hvTex("fu"), tS = hvTex("homok");
    const tM = canvasTex(1024, 585, (c, w, h) => { c.fillStyle = "#000"; c.fillRect(0, 0, w, h); const PX = (x) => (x - X0) / (X1 - X0) * w, PY = (nn) => (1 - (nn - N0) / (N1 - N0)) * h; c.strokeStyle = "#fff"; c.lineJoin = "round"; c.shadowColor = "#fff"; c.shadowBlur = 9; c.lineWidth = 11; c.beginPath(); HV_SHORE.forEach(([lon, lat], i) => { const [x, z] = hvMP(lat, lon); if (i) c.lineTo(PX(x), PY(-z)); else c.moveTo(PX(x), PY(-z)); }); c.closePath(); c.stroke(); });
    if (HVK.max) { const o = mapMesh.material; mapMesh.material = new THREE.MeshLambertMaterial({ map: o.map, fog: false }); W.disposables.push(mapMesh.material); mapMesh.receiveShadow = true; }
    const m = mapMesh.material; m.onBeforeCompile = (sh) => { sh.uniforms.tG = { value: tG }; sh.uniforms.tS = { value: tS }; sh.uniforms.tM = { value: tM };
      sh.fragmentShader = "uniform sampler2D tG; uniform sampler2D tS; uniform sampler2D tM;\n" + sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
        { vec2 duv = vMapUv * vec2(170., 97.); float big = texture2D(tG, duv * .11).g / .159;
          vec3 g = texture2D(tG, duv).rgb / vec3(.125, .159, .033) * vec3(.17, .31, .075) * (.5 + .5 * big);
          vec3 sd = texture2D(tS, duv * .6).rgb / vec3(.283, .238, .196) * vec3(.66, .56, .38);
          diffuseColor.rgb = mix(g, sd, texture2D(tM, vMapUv).r) * diffuseColor.rgb * ${HVK.max ? ".92" : "1.5"}; }`); };
    m.needsUpdate = true;
  }
  /* fényképtextúra a kisütött hálókra (dombok): a csúcsszínt a fű/szikla mintája modulálja, a háló helyi x–z síkjából vetítve */
  function hvDetail(meshObj, name, mean, sc) {
    try { if (localStorage.getItem("zephyr-hv-keszlet") === "0") return; } catch (e) {}
    if (!meshObj || !meshObj.material) return; const t = hvTex(name), m = meshObj.material;
    m.onBeforeCompile = (sh) => { sh.uniforms.tD = { value: t };
      sh.vertexShader = "varying vec3 vHvP;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vHvP = position;");
      sh.fragmentShader = "uniform sampler2D tD; varying vec3 vHvP;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
        { vec2 q = vHvP.xz * ${sc.toFixed(4)} + vHvP.y * ${(sc * .6).toFixed(4)}; vec3 d = texture2D(tD, q).rgb / vec3(${mean.join(",")}); float b = texture2D(tD, q * .13).g / ${mean[1]}; diffuseColor.rgb *= clamp(d * (.55 + .45 * b), 0., 2.2); }`); };
    m.needsUpdate = true;
  }
