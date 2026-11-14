  /* =================================================================== 2/H. ÉJSZAKAI VERSENY (2026. nov. 14. 15:12, a tulajdonos kérése: „korszakalkotó, nagyon részletes, romantikus hatású”)
     KIVILÁGÍTÁS – a Hajózási Szabályzat (57/2011. NFM rendelet, 3.13 cikk 5.) és a COLREG 21., 25. szabálya szerint:
       • VITORLÁS KISHAJÓ (Zephyr, 15 m): oldalfények (jobb oldalon ZÖLD, bal oldalon VÖRÖS, egyenként 112,5°: egyenesen előrétől 22,5°-kal a harántvonal mögéig)
         az orron, egy közös lámpatestben; FARFÉNY fehér, 135° (hátrafelé 67,5°–67,5°). A vitorlás hajó ezen felül viselhet az árboccsúcson két, körben látható
         fényt egymás fölött: felül vörös, alul zöld (COLREG 25(c)) – ezt is mutatjuk (messziről is látszik).
       • 7 M-NÉL RÖVIDEBB VITORLÁS KISHAJÓ (Finn, 420, tutaj, flamingó): egy minden oldalról látható fehér fény, és más hajó közeledtekor egy MÁSODIK fehér fény
         (itt: a legénység zseblámpája villan fel és a közeledő hajó felé világít).
       • VESZTEGLŐ (horgonyzó) nézőhajók és a rendezőhajó: minden oldalról látható fehér fény (horgonyfény) + a kabinok meleg fénye; a rendezőhajó fedélzete megvilágítva.
       • A fények csak a saját látószögükben látszanak: elölről mindkét oldalfény, oldalról az egyik, hátulról csak a fehér farfény – mint a valóságban.
     PÁLYA: a fordulóbóják sárgán villognak (Fl Y 4 s), a rajt-/célkapu bójái fehéren (Fl W 2,5 s), a fényoszlopok megmaradnak.
     BALATONI VIHARJELZÉS: sárga villogó fény a parton és a tóközepi jelzőállomáson; ELSŐFOK percenként 45, MÁSODFOK percenként 90 felvillanás – a szélhez igazítva
       (a várható legerősebb lökés: 40–60 km/h → elsőfok, 60 km/h fölött → másodfok; ilyenkor a távolban villámlik is). Forrás: HungaroMet / katasztrófavédelem.
     ÉG: holdfény (telihold a part fölött, ezüst holdút a vízen), csillagos ég Tejúttal, ritkán hullócsillag; a parton települések, sétány, kikötők, díszkivilágítás,
       tükörcsíkok a vízen; tücsökciripelés a part felől. */
  const NGT = { on: false };
  function vrNightPref() { try { return localStorage.getItem("zephyr-napszak") || "valt"; } catch (e) { return "valt"; } }
  function vrIsNight(lvl) { if (VRR.nightForce != null) return !!VRR.nightForce; if (VRR.net && VRR.net.night != null) return !!VRR.net.night; const p = vrNightPref(); return p === "ej" ? true : p === "nap" ? false : !!lvl && lvl % 3 === 0; }
  /* ragyogó pont-textúra */
  function glowTex() { if (NGT.gtex && NGT.gtex.image) return NGT.gtex; NGT.gtex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.12, "rgba(255,255,255,.95)"); r.addColorStop(.3, "rgba(255,255,255,.35)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }); return NGT.gtex; }
  function glowSprite(col, sz) { const m = new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }); W.disposables.push(m); const s = new THREE.Sprite(m); s.scale.setScalar(sz || .5); s.renderOrder = 8; s.userData.night = 1; return s; }
  /* ---------------------------------------------------------------- felépítés (a buildVRace végén) */
  function vrNightBuild() {
    const S = VRR; Object.keys(NGT).forEach((k) => { if (k !== "gtex") delete NGT[k]; }); NGT.on = false;
    const far = S.far, G = new THREE.Group(); G.visible = false; G.userData.night = 1; far.add(G); NGT.G = G; { const GE = new THREE.Group(); GE.visible = false; GE.userData.night = 1; S.env.add(GE); NGT.GE = GE; }   /* 2026-11-14: a parti fények a valódi tájhoz (env) kötve */
    /* ÉJSZAKAI ÉG: mélykék → a horizonton halvány meleg fényszennyezés a part felől; Tejút-sáv */
    const skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uMoon: { value: new THREE.Vector3(0, .25, -1).normalize() }, uAx: { value: 0 } },
      vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }",
      fragmentShader: `uniform vec3 uMoon; uniform float uAx; varying vec3 vD;
        float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
        void main(){ vec3 d = normalize(vD); float el = d.y;
          vec3 zen = vec3(.008, .016, .045), hor = vec3(.035, .055, .11), col = mix(hor, zen, pow(clamp(el, 0., 1.), .45));
          float az = atan(d.x, -d.z), toShore = .5 + .5 * cos(az - uAx); col += vec3(.16, .09, .035) * exp(-max(el, 0.) * 22.) * (.35 + .65 * toShore);   /* a parti települések fénye a horizonton */
          float m = max(dot(d, uMoon), 0.); col += vec3(.55, .62, .78) * (pow(m, 60.) * .35 + pow(m, 8.) * .07);   /* a hold udvara */
          vec3 gal = normalize(vec3(.42, .55, -.72)); float band = exp(-pow(dot(d, gal) * 5.2, 2.)); float cl = n3(d * 7.) * .6 + n3(d * 19.) * .4;
          col += vec3(.20, .21, .27) * band * smoothstep(.25, .9, cl) * smoothstep(0., .25, el) * .55;   /* Tejút */
          if (el < 0.) col = mix(hor * .8, vec3(.01, .02, .035), clamp(-el * 5., 0., 1.));
          gl_FragColor = vec4(col, 1.);
          #include <colorspace_fragment>
        }` });
    W.disposables.push(skyM); NGT.sky = mesh(new THREE.SphereGeometry(8800, 48, 24), skyM, G); NGT.sky.renderOrder = -19; NGT.sky.frustumCulled = false;
    /* CSILLAGOK: 3600 pont, valósághű fényesség-eloszlással, színnel (kékes–fehér–sárgás–vöröses), pislogással; a Tejút mentén sűrűbb */
    { const N = 3600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N), ph = new Float32Array(N), gal = new THREE.Vector3(.42, .55, -.72).normalize(), v = new THREE.Vector3();
      for (let i = 0; i < N; i++) { do { v.set(Math.random() * 2 - 1, Math.random(), Math.random() * 2 - 1); if (i % 3 === 0) v.addScaledVector(gal, -v.dot(gal) * .85); } while (v.lengthSq() > 1 || v.lengthSq() < .04 || v.normalize().y < .03);
        pos.set([v.x * 8400, v.y * 8400, v.z * 8400], i * 3); const mag = Math.pow(Math.random(), 7), t = Math.random(), c = t < .15 ? [.75, .85, 1] : t < .8 ? [1, 1, 1] : t < .95 ? [1, .92, .75] : [1, .75, .6];
        col.set(c.map((q) => q * (.35 + .65 * mag)), i * 3); sz[i] = 1.2 + mag * 3.6; ph[i] = Math.random() * 60; }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("sz", new THREE.BufferAttribute(sz, 1)); g.setAttribute("ph", new THREE.BufferAttribute(ph, 1)); W.disposables.push(g);
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uPx: { value: 1 } },
        vertexShader: "attribute vec3 color; attribute float sz, ph; uniform float uT, uPx; varying vec3 vC; varying float vA; void main(){ vC = color; float tw = .72 + .28 * sin(uT * (2. + mod(ph, 3.)) + ph) * sin(uT * 1.3 + ph * 1.7); vec3 dn = normalize(position); vA = tw * smoothstep(.0, .12, dn.y); vec4 p = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * .9999; gl_PointSize = sz * uPx; }",
        fragmentShader: "varying vec3 vC; varying float vA; void main(){ vec2 q = gl_PointCoord - .5; float r = length(q); float a = smoothstep(.5, 0., r); gl_FragColor = vec4(vC * a * vA * 1.4, 1.); }" });
      W.disposables.push(m); const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = -18; G.add(pts); NGT.stars = m; }
    /* A HOLD: telihold (mare-foltokkal, kráterekkel), ragyogó udvar; a part fölött alacsonyan – ezüst holdút a vízen */
    { const mt = canvasTex(512, 512, (g) => { const c = 256, r = 250; g.clearRect(0, 0, 512, 512); const base = g.createRadialGradient(c - 40, c - 40, 20, c, c, r); base.addColorStop(0, "#fffdf2"); base.addColorStop(.8, "#ece6d2"); base.addColorStop(1, "#cfc8b0"); g.fillStyle = base; g.beginPath(); g.arc(c, c, r, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.arc(c, c, r, 0, TAU); g.clip(); [[-70, -60, 90], [40, -90, 70], [70, 20, 85], [-30, 60, 60], [-110, 30, 50], [10, 120, 40]].forEach(([x, y, rr2]) => { const gg = g.createRadialGradient(c + x, c + y, 4, c + x, c + y, rr2); gg.addColorStop(0, "rgba(120,118,110,.55)"); gg.addColorStop(1, "rgba(120,118,110,0)"); g.fillStyle = gg; g.beginPath(); g.arc(c + x, c + y, rr2, 0, TAU); g.fill(); });
        for (let k = 0; k < 70; k++) { const a = Math.random() * TAU, rd = Math.random() * r * .95, x = c + Math.cos(a) * rd, y = c + Math.sin(a) * rd, s2 = 3 + Math.random() * 14; g.strokeStyle = "rgba(90,88,80,.35)"; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, s2, 0, TAU); g.stroke(); g.fillStyle = "rgba(255,255,250,.25)"; g.beginPath(); g.arc(x - s2 * .25, y - s2 * .25, s2 * .6, 0, TAU); g.fill(); } g.restore(); });
      const mm = new THREE.MeshBasicMaterial({ map: mt, transparent: true, depthWrite: false, fog: false }); W.disposables.push(mm); const moon = mesh(new THREE.PlaneGeometry(1, 1), mm, G); moon.renderOrder = -17; NGT.moon = moon;
      const halo = glowSprite("#9fb6e6", 1); halo.material.opacity = .55; G.add(halo); halo.renderOrder = -17; NGT.halo = halo; }
    /* HULLÓCSILLAGOK: elnyúló, halványuló csóva */
    { const tt = canvasTex(256, 16, (g) => { const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.85, "rgba(220,235,255,.65)"); gr.addColorStop(1, "rgba(255,255,255,1)"); g.fillStyle = gr; g.fillRect(0, 7, 256, 3); g.fillStyle = "rgba(200,220,255,.25)"; g.fillRect(0, 5, 256, 7); });
      NGT.met = [0, 1].map(() => { const m = new THREE.MeshBasicMaterial({ map: tt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }); W.disposables.push(m); const q = mesh(new THREE.PlaneGeometry(1, 1), m, G); q.visible = false; q.renderOrder = -16; return { q, t: 0, life: 0 }; }); NGT.metNext = 4 + Math.random() * 8; }
    /* PARTI FÉNYEK (a helyszín építésekor gyűjtve – 05d) és a tükörcsíkok */
    vrNightShore();
    /* TÓKÖZÉPI VIHARJELZŐ ÁLLOMÁS: sárga úszó oszloppal, tetején a villogó lámpa */
    { const st = new THREE.Group(); S.env.add(st); NGT.station = st; const y = std({ color: "#f2c21a", roughness: .5 }), dk = std({ color: "#2a2e33", roughness: .6 });
      mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.2, 16).translate(0, .2, 0), y, st); mesh(new THREE.CylinderGeometry(.12, .14, 7, 8).translate(0, 4.2, 0), dk, st); mesh(new THREE.CylinderGeometry(.6, .6, .1, 12).translate(0, 7.7, 0), dk, st);
      const lamp = mesh(new THREE.CylinderGeometry(.35, .35, .7, 12).translate(0, 8.1, 0), new THREE.MeshBasicMaterial({ color: "#5a4a10" }), st); W.disposables.push(lamp.material); lamp.userData.night = 1; NGT.stLamp = lamp;
      const gs = glowSprite("#ffc41a", 6); gs.position.y = 8.1; st.add(gs); NGT.stGlow = gs; st.visible = false; }
    /* HAJÓK FÉNYEI */
    NGT.nav = [];
    const hb = (o) => { const bb = new THREE.Box3(); o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(o.matrixWorld).invert(); o.traverse((q) => { if (q.isMesh && q.geometry && !q.userData.night) { q.geometry.computeBoundingBox(); const b = q.geometry.boundingBox.clone().applyMatrix4(q.matrixWorld).applyMatrix4(inv); bb.union(b); } }); return bb; };
    const addNav = (g, kind, owner) => { const body = g.userData.body || g, L = [], bb = hb(body), sc = 1;
      const put = (col, x, y, z, sec, size) => { const s = glowSprite(col, size || .5); s.position.set(x, y, z); body.add(s); s.visible = false; L.push({ s, sec, base: size || .5, col }); return s; };
      if (kind === "big") { const zb = bb.max.z - .25, zs = bb.min.z + .1, yd = HULL ? hullShape(.97).sheer + .55 : 1.6, ys = hullShape(.03).sheer + .45;
        put("#2aff5a", -.12, yd, zb, [0, 112.5], .55); put("#ff2a1a", .12, yd, zb, [-112.5, 0], .55); put("#fff6e0", 0, ys, zs, "stern", .5);
        put("#ff2a1a", 0, bb.max.y - .25, (bb.max.z + bb.min.z) * .5 * 0 + .9, "all", .5); put("#2aff5a", 0, bb.max.y - .65, .9, "all", .5); }
      else if (kind === "small") { put("#fff6e0", 0, (g.userData.deckY || .4) + 1.05, bb.min.z + .25, "all", .45); const t = put("#fffbe8", .3, (g.userData.deckY || .4) + .9, bb.min.z + 1.2, "torch", .7); t.userData.torch = 1; }
      else if (kind === "anchor") { put("#fff6e0", 0, bb.max.y + .2, bb.min.z + (bb.max.z - bb.min.z) * .55, "all", .6);
        const wm = new THREE.MeshBasicMaterial({ color: "#ffbf6a", transparent: true, opacity: .85, side: THREE.DoubleSide }); W.disposables.push(wm); [-1, 1].forEach((sd) => { const w = mesh(new THREE.PlaneGeometry(2.6, .32), wm, body); w.position.set(sd * (bb.max.x - .05), bb.min.y + (bb.max.y - bb.min.y) * .55, (bb.max.z + bb.min.z) * .5); w.rotation.y = Math.PI / 2; w.userData.night = 1; w.visible = false; L.push({ s: w, sec: "win" }); }); }
      else if (kind === "mark") put("#ffcc22", 0, bb.max.y + .35, 0, "fly", 1.1);
      else if (kind === "gate") put("#ffffff", 0, bb.max.y + .35, 0, "flw", 1.1);
      NGT.nav.push({ g, body, L, kind, owner }); };
    if (S.pb) addNav(S.pb, "small", S); else addNav(S.boat, "big", S);
    S.riv.forEach((r) => addNav(r.g, S.cls.id === "zephyr" ? "big" : "small", r));
    (S.spect || []).forEach((q) => addNav(q.g, "anchor", q)); if (S.cb) addNav(S.cb, "anchor", S.cb);
    NGT.marksDone = false;
    /* a Zephyr kokpitjában vörös éjszakai fedélzeti világítás (nem vakítja el a kormányost) */
    if (!S.pb && S.ck && S.ck.G) { const rl = new THREE.PointLight("#ff2a1a", 0, 6, 2); rl.position.set(0, S.ck.deckY + .4, S.helmL ? -S.helmL.z * 0 : 0); S.ck.G.add(rl); NGT.redLight = rl; }
    if (S.pb) { const tl = new THREE.PointLight("#ffe8c0", 0, 5, 2); tl.position.copy(S.pb.userData.seat).add(new THREE.Vector3(0, .9, .6)); S.pb.add(tl); NGT.redLight = tl; }
    NGT.moonL = new THREE.DirectionalLight("#9fb2d8", 0); W.root.add(NGT.moonL); NGT.moonL.userData.night = 1;
  }
  /* a parti fények egyetlen pontfelhőben (villogással), a tükörcsíkok egy rajzolásban */
  function vrNightShore() {
    const S = VRR, NS0 = S.nightShore; if (!NGT.G) return; if (NGT.shore) { NGT.shore.parent && NGT.shore.parent.remove(NGT.shore); NGT.shore.geometry.dispose(); } if (NGT.refl) { NGT.refl.parent && NGT.refl.parent.remove(NGT.refl); NGT.refl.geometry.dispose(); } if (!NS0) return;
    const N = NS0.NL.length, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N), fl = new Float32Array(N * 3);
    NS0.NL.forEach((q, i) => { pos.set([q[0], q[1], q[2]], i * 3); col.set([q[3], q[4], q[5]], i * 3); sz[i] = q[6]; fl.set([q[7], q[8], q[9]], i * 3); });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("sz", new THREE.BufferAttribute(sz, 1)); g.setAttribute("fl", new THREE.BufferAttribute(fl, 3)); W.disposables.push(g);
    if (!NGT.shoreM) { NGT.shoreM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uPx: { value: 1 }, uStorm: { value: 1.333 } },
        vertexShader: "attribute vec3 color, fl; attribute float sz; uniform float uT, uPx, uStorm; varying vec3 vC; varying float vA; void main(){ vC = color; float per = fl.x; if (per > 1.2 && per < 1.4) per = uStorm; float on = 1.; if (per > 0.) { float ph = fract((uT + fl.y) / per); on = step(ph, fl.z) * (.75 + .25 * smoothstep(0., .05, ph)); if (per < 0.) on = 0.; } if (fl.x > 1.2 && fl.x < 1.4 && uStorm <= 0.) on = 0.; vA = on * (.85 + .15 * sin(uT * 9. + position.x)); vec4 p = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * p; gl_PointSize = sz * uPx * 2.4 * (per > 0. ? 1.5 : 1.); }",
        fragmentShader: "varying vec3 vC; varying float vA; void main(){ float r = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, r); a = a * a; gl_FragColor = vec4(vC * (a * 1.3 + smoothstep(.12, .0, r) * 1.5) * vA, 1.); }" }); W.disposables.push(NGT.shoreM); }
    NGT.shore = new THREE.Points(g, NGT.shoreM); NGT.shore.frustumCulled = false; NGT.shore.renderOrder = 6; (NGT.GE || NGT.G).add(NGT.shore);
    /* tükörcsíkok: függőleges, lefelé halványuló, hullámzástól remegő csíkok a fény alatt (a víz után, a hajók előtt rajzolva) */
    const M = NS0.NS.length, P = new Float32Array(M * 12), C = new Float32Array(M * 12), U = new Float32Array(M * 8), I = [];
    NS0.NS.forEach((q, i) => { const [x, z, r, gg, b, wd, ln, brg] = q, d = Math.hypot(x, z), w = Math.max(wd, d * .0016) * .5, h = Math.min(ln, d * .03), tx = Math.cos(brg), tz = Math.sin(brg);
      P.set([x - tx * w, 0, z - tz * w, x + tx * w, 0, z + tz * w, x + tx * w * 2.2, -h, z + tz * w * 2.2, x - tx * w * 2.2, -h, z - tz * w * 2.2], i * 12); for (let k = 0; k < 4; k++) C.set([r, gg, b], i * 12 + k * 3); U.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8); I.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3); });
    const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", new THREE.BufferAttribute(P, 3)); g2.setAttribute("color", new THREE.BufferAttribute(C, 3)); g2.setAttribute("uv", new THREE.BufferAttribute(U, 2)); g2.setIndex(I); W.disposables.push(g2);
    if (!NGT.reflM) { NGT.reflM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uT: { value: 0 } },
        vertexShader: "attribute vec3 color; varying vec3 vC; varying vec2 vU; varying float vX; void main(){ vC = color; vU = uv; vX = position.x * .01 + position.z * .013; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
        fragmentShader: "uniform float uT; varying vec3 vC; varying vec2 vU; varying float vX; void main(){ float y = vU.y; float x = abs(vU.x - .5) * 2.; float br = sin(y * 60. - uT * 3. + vX) * .5 + .5; br = mix(br, sin(y * 23. + uT * 1.7 + vX * 3.) * .5 + .5, .5); float a = (1. - y) * (1. - x * x) * (.35 + .65 * step(.45, br)); gl_FragColor = vec4(vC * a * .55, 1.); }" }); W.disposables.push(NGT.reflM); }
    NGT.refl = new THREE.Mesh(g2, NGT.reflM); NGT.refl.frustumCulled = false; NGT.refl.renderOrder = -4; (NGT.GE || NGT.G).add(NGT.refl);
  }
  /* ---------------------------------------------------------------- éj ↔ nappal váltás (vrSetup hívja) */
  const NIGHT_TINT = [.04, .05, .085];   /* lineáris színtérben (érzékelve kb. 20–30%) */
  function vrNightTint(on) {
    const S = VRR, keepMaps = [S.ck && S.ck.instT, S.ck && S.ck.chartT, S.mastT].filter(Boolean);
    W.root.traverse((o) => { if (!o.material || o.isSprite || o.userData.night) return; for (let p = o.parent; p; p = p.parent) if (p.userData && p.userData.night) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (!m || m.isShaderMaterial || m.isSpriteMaterial || m.blending === THREE.AdditiveBlending || !m.color) return; if (m.map && keepMaps.indexOf(m.map) >= 0) return;
        if (!(m.isMeshBasicMaterial || m.isMeshMatcapMaterial || m.isPointsMaterial)) return;
        if (!m.userData._dc) m.userData._dc = m.color.clone(); const k = m.userData.nightK || NIGHT_TINT; if (on) m.color.setRGB(m.userData._dc.r * k[0], m.userData._dc.g * k[1], m.userData._dc.b * k[2]); else m.color.copy(m.userData._dc); }); });
  }
  function vrNightSet(on, C) {
    const S = VRR; if (!NGT.G) return; NGT.on = on; NGT.G.visible = on; if (NGT.GE) NGT.GE.visible = on; if (NGT.station) NGT.station.visible = false;
    const U = S.water.userData.mat.uniforms;
    if (on && !NGT.saveW) NGT.saveW = { skyOn: U.uSkyOn.value, skyH: U.uSkyH.value.clone(), skyZ: U.uSkyZ.value.clone(), deep: U.uDeep.value.clone(), sh: U.uShallow.value.clone(), haze: U.uHaze.value.clone(), sun: U.uSun.value, sunC: U.uSunC.value.clone(), light: U.uLight.value, spec: U.uSpec.value };
    /* a hold iránya: a part (a pálya szél felőli vége) fölött, kicsit oldalt, 13° magasan → a holdút a pályán át a hajók felé fut */
    const ax = Math.atan2(C.u[0], -C.u[1]) + .32, el = 13 * D2R; NGT.moonDir = new THREE.Vector3(Math.sin(ax) * Math.cos(el), Math.sin(el), -Math.cos(ax) * Math.cos(el));
    if (on) { U.uSkyOn.value = 0; U.uSkyH.value.setRGB(.03, .042, .085); U.uSkyZ.value.setRGB(.006, .01, .03); U.uDeep.value.setRGB(.003, .009, .016); U.uShallow.value.setRGB(.007, .02, .032); U.uHaze.value.setRGB(.03, .042, .08);
      U.uSun.value = NGT.moonDir.clone(); U.uSunC.value.setRGB(.95, .93, .82); U.uLight.value = .2; U.uSpec.value = 2.4; U.uFoam.value = .18; }
    else if (NGT.saveW) { const W0 = NGT.saveW; U.uSkyOn.value = W0.skyOn; U.uSkyH.value.copy(W0.skyH); U.uSkyZ.value.copy(W0.skyZ); U.uDeep.value.copy(W0.deep); U.uShallow.value.copy(W0.sh); U.uHaze.value.copy(W0.haze); U.uSun.value = W0.sun; U.uSunC.value.copy(W0.sunC); U.uLight.value = W0.light; U.uSpec.value = W0.spec; U.uFoam.value = 1; }
    if (S.foto && S.foto.mesh) S.foto.mesh.visible = !on; S.far.children.forEach((o) => { if (o.material && o.material.isShaderMaterial && o !== NGT.sky && !(S.foto && o === S.foto.mesh) && o.geometry && o.geometry.type === "SphereGeometry" && o.parent === S.far) o.visible = !on && !(S.foto && S.foto.mesh); });
    if (S.gulls && S.gulls.group) S.gulls.group.visible = !on;
    const L = S.lights; if (L) { if (!NGT.saveL) NGT.saveL = { h: L.hemi.intensity, hc: L.hemi.color.clone(), hg: L.hemi.groundColor.clone(), s: L.sun.intensity, sc: L.sun.color.clone(), sp: L.sun.position.clone(), a: L.amb.intensity };
      if (on) { L.hemi.intensity = .085; L.hemi.color.set("#7d90b8"); L.hemi.groundColor.set("#0a0d14"); L.sun.intensity = .3; L.sun.color.set("#a8bbe0"); L.sun.position.copy(NGT.moonDir).multiplyScalar(100); L.amb.intensity = .015; }
      else { const s0 = NGT.saveL; L.hemi.intensity = s0.h; L.hemi.color.copy(s0.hc); L.hemi.groundColor.copy(s0.hg); L.sun.intensity = s0.s; L.sun.color.copy(s0.sc); L.sun.position.copy(s0.sp); L.amb.intensity = s0.a; } }
    if (NGT.redLight) NGT.redLight.intensity = on ? .8 : 0;
    vrNightTint(on);
    NGT.sky.material.uniforms.uMoon.value.copy(NGT.moonDir); NGT.sky.material.uniforms.uAx.value = Math.atan2(C.u[0], -C.u[1]);
    NGT.moon.position.copy(NGT.moonDir).multiplyScalar(3500); NGT.moon.lookAt(0, 0, 0); NGT.moon.scale.setScalar(3500 * Math.tan(2.5 * D2R));   /* „romantikus” telihold: a horizont közelében nagyobbnak látszik */ NGT.halo.position.copy(NGT.moonDir).multiplyScalar(3450); NGT.halo.scale.setScalar(3450 * Math.tan(9 * D2R));   /* a kamera látótávolságán (4 km) belül */
    /* viharjelzés a szélhez: a várható legerősebb lökés (~1,35 × átlag) km/h-ban */
    const vb = (S.venue && S.venue.basin) || "keleti"; if (C.lvl && C.lvl % 6 === 0 && on && !STM.live) STM.lv[vb] = 2; NGT.storm = STM.lv[vb] || 0;   /* 2026-11-14: a hivatalos medencénkénti viharjelzés (05j STM) */   /* minden 6. futam éjszakája: zivatar a távolban */
    if (NGT.shoreM) NGT.shoreM.uniforms.uStorm.value = NGT.storm === 2 ? 60 / 90 : NGT.storm === 1 ? 60 / 45 : 0;
    if (NGT.station && false) { NGT.station.position.set(-C.c[0] * 420 + C.u[0] * 300, 0, -C.c[1] * 420 + C.u[1] * 300); NGT.station.visible = on; }
    NGT.nav.forEach((n) => n.L.forEach((l) => { l.s.visible = on && l.sec !== "torch"; }));
    S.nightInfo = on ? `🌙 éjszakai futam · ${STM_BN[vb]}: ${NGT.storm === 2 ? "MÁSODFOKÚ viharjelzés (90 villanás/perc)" : NGT.storm === 1 ? "elsőfokú viharjelzés (45 villanás/perc)" : "viharjelzés alapfokon"}` : "";
    if (on) { S.msg = `🌙 ÉJSZAKAI FUTAM – holdfény, világító bóják. A hajókat a fényeik mutatják: zöld = jobb oldal, vörös = bal oldal, fehér = far. ${STM_BN[vb]}: ${NGT.storm === 2 ? "másodfokú viharjelzés" : NGT.storm === 1 ? "elsőfokú viharjelzés" : "viharjelzés alapfokon"}.`; S.msgT = 9; }
    NGT.flash = 0; NGT.lightning = 0;
  }
  /* ---------------------------------------------------------------- képkockánként */
  const _cw = new THREE.Vector3(), _lw = new THREE.Vector3(), _lc = new THREE.Vector3();
  function vrNightTick(dt) {
    const S = VRR; if (!NGT.on || !NGT.G) return; const t = W.t;
    let px = 1; try { const r = T.sceneEl.renderer, sz = r.getSize(new THREE.Vector2()); px = clamp(sz.y / 900, .7, 2.2) * (T.inVR ? 1.4 : 1); } catch (e) {}
    NGT.stars.uniforms.uT.value = t; NGT.stars.uniforms.uPx.value = px; if (NGT.shoreM) { NGT.shoreM.uniforms.uT.value = t; NGT.shoreM.uniforms.uPx.value = px; } if (NGT.reflM) NGT.reflM.uniforms.uT.value = t;
    const U = S.water.userData.mat.uniforms; U.uFlk.value = .12; U.uSun.value = NGT.moonDir;
    /* a nappali égfotó később töltődik be, és visszaállítaná a víz nappali színeit – éjjel minden képkockán az éjszakai értékek érvényesek */
    U.uSkyOn.value = 0; U.uSkyH.value.setRGB(.03, .042, .085); U.uSkyZ.value.setRGB(.006, .01, .03); U.uDeep.value.setRGB(.003, .009, .016); U.uShallow.value.setRGB(.007, .02, .032); U.uHaze.value.setRGB(.03, .042, .08); U.uSunC.value.setRGB(.95, .93, .82); U.uFoam.value = .18; if (NGT.storm !== 2) { U.uLight.value = .2; } U.uSpec.value = 2.4;
    if (S.foto && S.foto.mesh && S.foto.mesh.visible) S.foto.mesh.visible = false;
    /* a bóják fényei (a futamonként újraépülő bójákra) */
    if (!NGT.marksDone || NGT.marksN !== S.marks.length || NGT.marksG !== S.marks[0]) { NGT.marksDone = true; NGT.marksN = S.marks.length; NGT.marksG = S.marks[0];
      NGT.nav = NGT.nav.filter((n) => n.kind !== "mark" && n.kind !== "gate");
      const add = (g, kind, per, on2, col) => { const s = glowSprite(col, 1.2); g.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g); s.position.set(0, (bb.max.y - g.position.y) / (g.scale.y || 1) + .3, 0); g.add(s); const r2 = glowSprite(col, 1); r2.position.set(0, .05, 0); r2.scale.set(1.2, 5, 1); r2.material.opacity = .35; g.add(r2); NGT.nav.push({ g, body: g, L: [{ s, sec: "flash", base: 1.2, per, on: on2 }, { s: r2, sec: "flashR", per, on: on2 }], kind }); };
      S.marks.forEach((m) => add(m.g, "mark", 4, .9, "#ffcc22")); [S.pin, S.pin2].filter(Boolean).forEach((p) => add(p, "gate", 2.5, .6, "#ffffff")); }
    T.camObj().getWorldPosition(_cw);
    NGT.nav.forEach((n) => { if (n.g.visible === false || (n.owner && n.owner.out)) { n.L.forEach((l) => { l.s.visible = false; }); return; }
      _lc.copy(_cw); n.body.worldToLocal(_lc); const th = Math.atan2(-_lc.x, _lc.z) * R2D;   /* + = a hajó jobb (styrbord) oldala felől nézünk */
      /* közeledő hajó: a kishajó legénysége felvillantja a második fehér fényt (zseblámpa) */
      let near = 0; if (n.kind === "small") { const o = n.owner, ox = o === S ? S.x : o.x, oz = o === S ? S.z : o.z; [S].concat(S.riv).forEach((q) => { if (q === o || q.out) return; const d = Math.hypot(q.x - ox, q.z - oz); if (d < 30) near = Math.max(near, 1 - d / 30); }); }
      n.L.forEach((l) => { let vis = true, k = 1;
        if (Array.isArray(l.sec)) { vis = th >= l.sec[0] - 2 && th <= l.sec[1] + 2; }
        else if (l.sec === "stern") vis = Math.abs(th) >= 110;
        else if (l.sec === "torch") { vis = near > .05; k = .6 + .4 * Math.sin(t * 13) * Math.sin(t * 7.3); }
        else if (l.sec === "flash" || l.sec === "flashR") { const ph = ((t + (n.g.id % 7) * .37) % l.per) / l.per; vis = ph < l.on / l.per; }
        else if (l.sec === "win") { l.s.visible = true; return; }
        l.s.visible = vis; if (!vis || l.sec === "flashR") return;
        l.s.getWorldPosition(_lw); const d = _lw.distanceTo(_cw), sc = Math.max(l.base, d * .011) * k; l.s.scale.setScalar(sc); l.s.material.opacity = clamp(1.1 - d / 2600, .25, 1); }); });
    /* tóközépi viharjelző */
    if (NGT.stGlow) { const per = NGT.storm === 2 ? 60 / 90 : NGT.storm === 1 ? 60 / 45 : 0, onF = per && ((t % per) / per) < .32; NGT.stGlow.visible = !!onF; NGT.stLamp.material.color.set(onF ? "#ffd84a" : "#3a300a"); }
    /* hullócsillag */
    NGT.metNext -= dt; if (NGT.metNext <= 0) { NGT.metNext = 7 + Math.random() * 16; const m = NGT.met.find((q) => q.life <= 0); if (m) { const az = Math.random() * TAU, el = (25 + Math.random() * 45) * D2R; m.p0 = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(3600);
        const tg = new THREE.Vector3(Math.cos(az), -.35 - Math.random() * .4, Math.sin(az)).normalize(); if (Math.random() < .5) tg.x *= -1, tg.z *= -1; m.dir = tg; m.len = 3600 * (.06 + Math.random() * .08); m.life = m.max = .55 + Math.random() * .7; } }
    NGT.met.forEach((m) => { if (m.life <= 0) { m.q.visible = false; return; } m.life -= dt; const u = 1 - m.life / m.max, head = m.p0.clone().addScaledVector(m.dir, m.len * u * 1.6), tail = head.clone().addScaledVector(m.dir, -m.len * Math.min(1, u * 3));
      m.q.visible = true; m.q.position.copy(head).add(tail).multiplyScalar(.5); m.q.scale.set(head.distanceTo(tail), 3600 * .0035, 1); m.q.lookAt(0, 0, 0); const dl = new THREE.Vector3().subVectors(head, tail).normalize(), right = new THREE.Vector3().crossVectors(m.q.position.clone().normalize(), dl);
      m.q.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dl, right.normalize().cross(dl).negate(), m.q.position.clone().normalize().negate())); m.q.material.opacity = Math.sin(Math.PI * u); });
    /* zivatar a távolban (másodfokon): villámlás a part fölött – a felhők alját és a vizet egy pillanatra kivilágítja */
    if (NGT.storm === 2) { NGT.lightning -= dt; if (NGT.lightning <= 0) { NGT.lightning = 6 + Math.random() * 14; NGT.flash = 1; try { setTimeout(() => { const a = T.ac(); if (!a) return; const n2 = a.createBufferSource(); n2.buffer = T.noiseBuf(3); const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 90; const g2 = a.createGain(); g2.gain.setValueAtTime(.0001, a.currentTime); g2.gain.linearRampToValueAtTime(.18, a.currentTime + .4); g2.gain.exponentialRampToValueAtTime(.0005, a.currentTime + 3); n2.connect(f).connect(g2).connect(T.outBus()); n2.start(); }, 2500 + Math.random() * 3000); } catch (e) {} }
      NGT.flash = Math.max(0, NGT.flash - dt * 3.2); const fl = NGT.flash * (.6 + .4 * Math.sin(t * 60)); NGT.sky.material.uniforms.uMoon.value.copy(NGT.moonDir); U.uLight.value = .2 + fl * 1.2; if (S.lights) S.lights.hemi.intensity = .085 + fl * .9; }
    /* tücskök a part felől (szintetizált, halk) */
    NGT.crT = (NGT.crT || 0) - dt; if (NGT.crT <= 0) { NGT.crT = .9 + Math.random() * 1.6; try { const a = T.ac(); if (a) { const t0 = a.currentTime, g2 = a.createGain(); g2.connect(T.outBus()); g2.gain.value = .006 + Math.random() * .006; for (let k = 0; k < 3 + (Math.random() * 3 | 0); k++) { const o = a.createOscillator(), gg = a.createGain(); o.frequency.value = 4300 + Math.random() * 500; gg.gain.setValueAtTime(0, t0 + k * .06); gg.gain.linearRampToValueAtTime(1, t0 + k * .06 + .01); gg.gain.linearRampToValueAtTime(0, t0 + k * .06 + .04); o.connect(gg).connect(g2); o.start(t0 + k * .06); o.stop(t0 + k * .06 + .05); } } } catch (e) {} }
  }
