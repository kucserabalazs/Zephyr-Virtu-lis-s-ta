  /* ============================================================================================ 05x – VERSENY: VÍZ 2.0 · SZÉLFOLTOK · ORRHULLÁM · PERMET · NYOMVONAL
     2026-11-15 18:39 (tulajdonos): „A felcsapódó vízpermet nagyon csúnya … a víz felszíne is lehetne sokkal élethűbb, mert sokszor olyan hatást kelt a hullám mozgása,
     mintha hátrafelé úszna a hajó, és szeretnék a vízen foltokat, ahol gyenge a szél és nem hullámzik … nagyon kidolgozott, rendkívül részletes kidolgozással
     a lehető legkisebb processzorhasználat mellett.” 18:43: „Legyen valósághű, nekem ez fontos. Úgy ábrázold, hogy élethű legyen!”
       → a SZÉLLÖKÉS sötét, fodros folt (erősebb szél, kicsit jobbra fordul – gyorsít), a LAVÓR világos, tükörsima folt (gyenge szél – lassít); mindkettő sodródik a széllel.
     Miért tűnt úgy, hogy a hajó hátrafelé úszik (a kód vizsgálata alapján):
       1) a víz mintázatát a hajó sebességének 1,1-szeresével KÜLÖN is eltoltuk („sebességérzet”) – a bóják és az ellenfelek így „csúsztak” a vízen;
       2) a hullámok a valódi idő 20–34%-ával vonultak, a hajó ringása viszont valódi idővel és MÁS iránnyal (135°) számolt – a hajó nem a látott hullámokon ringott;
       3) a ritka rácson a rövid hullámok „aliasolódtak”: középtávon visszafelé kúszó álmintázat jelent meg.
     Most: EGY közös hullámmodell (rajz + ringás, ugyanaz az idő és irány), a víz a világhoz rögzítve, a hullámok csak ott mozgatják a rácsot, ahol a rács elég sűrű,
     a haladást a vízhez kötött fodrok, hab és a hajók saját orrhulláma, Kelvin-éke és nyomvonala mutatja. Egyetlen rajzolási hívás a víz, a permet is (GPU számolja). */
  const RW = { t: 0, waves: null, wdir: 0, Hs: .3, lp: 6, rip: null, ft: null, fd: null, ff: null, fN: 128, fL: 1536, fOff: [0, 0], fT: -99, fDir: [1, 0], fv: 3, patches: [], boats: [], tws: 6 };
  const RW_G = 9.81;

  /* ------------------------------------------------------------------ hullámspektrum: balatoni rövid, meredek hullámzás a szélerősség szerint */
  function rwWaves(tws, wdirTo, seed) {
    const U = Math.max(2, tws), lp = clamp(1.0 * U + .6, 3, 13), Hs = clamp(.016 * Math.pow(U, 1.75), .05, 1.0), rnd = vrRng((seed | 0) * 977 + 31);
    /* [irány a széltől (fok), hullámhossz-szorzó, amplitúdó-szorzó, meredekség] – az első négy a rácsot is mozgatja, az utolsó kettő csak a fényt */
    const spec = [[0, 1, .26, .6], [26, .74, .17, .55], [-33, .6, .14, .5], [-12, 1.33, .1, .32], [50, .41, .07, .45], [-61, .31, .05, .4]].map((q) => [q[0] + (rnd() - .5) * 10, q[1] * (.92 + rnd() * .16), q[2], q[3]]);
    RW.waves = spec.map(([a, lf, af, q]) => { const L = lp * lf, k = TAU / L, A = Hs * af; return { a: a * D2R, k, A, Q: clamp(q / Math.max(.001, k * A * 4.2), 0, .85), om: Math.sqrt(RW_G * k), ph: rnd() * TAU }; });
    RW.wdir = wdirTo; RW.Hs = Hs; RW.lp = lp; RW.tws = U;
  }
  /* a víz magassága egy pontban – PONTOSAN az, amit a víz shadere rajzol (a hajók ezen ringanak) */
  function rwHeight(x, z, t) {
    const W0 = RW.waves; if (!W0) return 0; let y = 0; const d0 = RW.wdir, tt = t == null ? RW.t : t;
    for (let i = 0; i < W0.length; i++) { const w = W0[i], d = d0 + w.a; y += w.A * Math.sin(w.k * (Math.cos(d) * x + Math.sin(d) * z) - w.om * tt + w.ph); }
    return y;
  }
  /* a víz lejtése a pontban (dh/dx, dh/dz) – a hajók bólintásához és dőléséhez */
  function rwSlope(x, z, t) {
    const W0 = RW.waves; if (!W0) return [0, 0]; let sx = 0, sz = 0; const d0 = RW.wdir, tt = t == null ? RW.t : t;
    for (let i = 0; i < 4; i++) { const w = W0[i], d = d0 + w.a, cx = Math.cos(d), cz = Math.sin(d), c = w.A * w.k * Math.cos(w.k * (cx * x + cz * z) - w.om * tt + w.ph); sx += cx * c; sz += cz * c; }
    return [sx, sz];
  }

  /* ------------------------------------------------------------------ fodor-normáltérkép (egyszer készül, csempézhető): RG = lejtés, B = habcsipke, A = foltosság */
  function rwRipTex() {
    if (RW.rip) return RW.rip;
    const N = 256, rnd = vrRng(424242), sx = new Float32Array(N * N), sy = new Float32Array(N * N), cx = new Float32Array(N), sxx = new Float32Array(N), cy = new Float32Array(N), syy = new Float32Array(N);
    for (let ci = 0; ci < 84; ci++) {   /* egész hullámszámok → tökéletesen csempézhető; a szél (+x) körül szóródó irányok, kapilláris–gravitációs spektrum */
      const km = 2 + Math.pow(rnd(), 1.5) * 52, th = (rnd() - .5) * Math.PI * (rnd() < .78 ? .85 : 1.9);
      let m = Math.round(km * Math.cos(th)), n = Math.round(km * Math.sin(th)); if (!m && !n) m = 2;
      const kk = Math.hypot(m, n), a = Math.pow(kk, -1.5) * (.7 + .6 * rnd()), ph = rnd() * TAU, gx = a * TAU * m, gy = a * TAU * n;
      for (let i = 0; i < N; i++) { const ax = TAU * m * i / N + ph, ay = TAU * n * i / N; cx[i] = Math.cos(ax); sxx[i] = Math.sin(ax); cy[i] = Math.cos(ay); syy[i] = Math.sin(ay); }
      for (let y = 0; y < N; y++) { const cyv = cy[y], syv = syy[y], o = y * N; for (let x = 0; x < N; x++) { const s = sxx[x] * cyv + cx[x] * syv; sx[o + x] -= gx * s; sy[o + x] -= gy * s; } } }
    let mx = 0; for (let i = 0; i < N * N; i++) mx = Math.max(mx, Math.abs(sx[i]), Math.abs(sy[i])); const sc = 1 / (mx * .82 || 1);
    /* habcsipke: csempézhető Worley-zaj (F2 − F1) – a habfoltok pókhálószerű, csipkés mintája */
    const G = 14, pts = new Float32Array(G * G * 2); for (let i = 0; i < G * G; i++) { pts[i * 2] = rnd(); pts[i * 2 + 1] = rnd(); }
    const vnT = (() => { const P = 16, v = new Float32Array(P * P); for (let i = 0; i < P * P; i++) v[i] = rnd(); return (x, y) => { const X = x * P, Y = y * P, i0 = Math.floor(X), j0 = Math.floor(Y), fx = X - i0, fy = Y - j0, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), I = (i) => ((i % P) + P) % P;
      const a = v[I(j0) * P + I(i0)], b = v[I(j0) * P + I(i0 + 1)], c = v[I(j0 + 1) * P + I(i0)], d = v[I(j0 + 1) * P + I(i0 + 1)]; return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uy; }; })();
    const data = new Uint8Array(N * N * 4);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = (x + .5) / N, v = (y + .5) / N, gi = Math.floor(u * G), gj = Math.floor(v * G); let f1 = 9, f2 = 9;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ci = ((gi + di) % G + G) % G, cj = ((gj + dj) % G + G) % G, px = (gi + di + pts[(cj * G + ci) * 2]) / G, py = (gj + dj + pts[(cj * G + ci) * 2 + 1]) / G, d = Math.hypot(px - u, py - v);
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
      /* B: a hab „sűrűségtérképe” (4 oktávos, csempézhető zaj, kis buborékos csipkével) – küszöbölve nő a hab: kevésnél csak a csúcsok, soknál összefüggő;
         A: apró buborékpettyek (Worley F1) a finom szerkezethez */
      const fb = vnT(u, v) * .48 + vnT(u * 2, v * 2) * .26 + vnT(u * 4, v * 4) * .16 + vnT(u * 8, v * 8) * .1, lace = clamp(1 - (f2 - f1) * G * 3.2, 0, 1), bub = clamp(1 - f1 * G * 2.1, 0, 1), o = (y * N + x) * 4;
      data[o] = clamp(128 + 127 * sx[y * N + x] * sc, 0, 255); data[o + 1] = clamp(128 + 127 * sy[y * N + x] * sc, 0, 255);
      data[o + 2] = clamp(255 * (fb * .86 + lace * .14), 0, 255); data[o + 3] = clamp(255 * (bub * .55 + fb * .45), 0, 255); }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    try { t.anisotropy = Math.min(8, T.sceneEl.renderer.capabilities.getMaxAnisotropy()); } catch (e) { t.anisotropy = 4; }
    t.needsUpdate = true; RW.rip = t; return t;
  }

  /* ------------------------------------------------------------------ SZÉLMEZŐ: széllökések (sötét, fodros) és lavórok (világos, tükörsima) – sodródnak a széllel.
     Determinisztikus (a futam magjából és a futamidőből), így a hálózati játékban minden gépen ugyanott vannak. 128×128 cella, 1536 m-es tórusz (12 m/cella),
     a textúrát 4×/mp frissítjük; a fizika ugyanebből a mezőből olvas. */
  function rwFieldInit(C, seed) {
    const N = RW.fN, L = RW.fL; if (!RW.ff) { RW.ff = new Float32Array(N * N * 2); RW.fd = new Uint8Array(N * N * 4); }
    if (!RW.ft) { const t = new THREE.DataTexture(RW.fd, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; RW.ft = t; }
    const rnd = vrRng((seed | 0) * 131 + 17), kn = C.tws / KN, light = kn < 8, fresh = kn > 14;
    const nG = light ? 13 : fresh ? 17 : 15, nL = light ? 9 : fresh ? 4 : 6; RW.patches = [];
    for (let i = 0; i < nG + nL; i++) { const lull = i >= nG; RW.patches.push({ lull, per: lull ? 150 + rnd() * 170 : 90 + rnd() * 110, ph: rnd() * 600, s: (rnd() * 1e9) | 0 }); }
    const u = vfwd(C.wf); RW.fDir = [-u[0], -u[1]]; RW.fv = clamp(C.tws * .5, 1.2, 5.5); RW.seedF = seed; RW.fT = -99; RW.light = light; RW.fresh = fresh;
    rwFieldDraw(0);
  }
  function rwFieldDraw(t) {
    const N = RW.fN, L = RW.fL, cell = L / N, f = RW.ff, d = RW.fd; if (!f) return; f.fill(0);
    const ax = RW.fDir[0], az = RW.fDir[1];
    for (const p of RW.patches) {
      const tt = t + p.ph, c = Math.floor(tt / p.per), u = tt / p.per - c, env = smooth(clamp(u / .22, 0, 1)) * (1 - smooth(clamp((u - .7) / .3, 0, 1))); if (env < .02) continue;
      const r = vrRng(p.s + c * 7919), x0 = p.fx != null ? p.fx - RW.fOff[0] : r() * L, z0 = p.fz != null ? p.fz - RW.fOff[1] : r() * L, R = (p.lull ? 34 + r() * 44 : 30 + r() * 60) * (.75 + .35 * env), k = (p.lull ? .7 + r() * .3 : .6 + r() * .4) * env, asp = p.lull ? 1.15 + r() * .5 : 1.4 + r() * .8, ch = p.lull ? 1 : 0;
      for (let lb = 0; lb < 3; lb++) {   /* három, egymásba olvadó lebeny: szabálytalan, „macskatappancs” alakú folt */
        const oa = lb ? (r() - .5) * R * 1.3 : 0, oc = lb ? (r() - .5) * R * .9 : 0, rl = lb ? R * (.5 + r() * .35) : R, kl = lb ? k * (.75 + r() * .25) : k;
        const cx = x0 + ax * oa - az * oc, cz = z0 + az * oa + ax * oc, ra = rl * asp, rc = rl, ext = ra * 1.6;
        const i0 = Math.floor((cx - ext) / cell), i1 = Math.ceil((cx + ext) / cell), j0 = Math.floor((cz - ext) / cell), j1 = Math.ceil((cz + ext) / cell);
        for (let j = j0; j <= j1; j++) { const wz = (j + .5) * cell - cz, jj = ((j % N) + N) % N; for (let i = i0; i <= i1; i++) { const wx = (i + .5) * cell - cx, al = wx * ax + wz * az, ac = -wx * az + wz * ax, q = (al * al) / (ra * ra) + (ac * ac) / (rc * rc);
            if (q > 2.6) continue; const v = kl * Math.exp(-q * 1.7), o = (jj * N + (((i % N) + N) % N)) * 2 + ch; if (v > f[o]) f[o] = v; } } } }
    for (let i = 0, n = N * N; i < n; i++) { d[i * 4] = Math.min(255, f[i * 2] * 255); d[i * 4 + 1] = Math.min(255, f[i * 2 + 1] * 255); d[i * 4 + 2] = 0; d[i * 4 + 3] = 255; }
    if (RW.ft) RW.ft.needsUpdate = true;
  }
  /* a mező egy világpontban: [lökés 0..1, lavór 0..1] (bilineáris, a sodródással együtt) */
  function rwFieldAt(x, z) {
    const f = RW.ff; if (!f) return [0, 0]; const N = RW.fN, L = RW.fL, cell = L / N;
    const qx = (x - RW.fOff[0]) / cell - .5, qz = (z - RW.fOff[1]) / cell - .5, i0 = Math.floor(qx), j0 = Math.floor(qz), fx = qx - i0, fz = qz - j0, W2 = (i, j) => ((((j % N) + N) % N) * N + (((i % N) + N) % N)) * 2;
    const a = W2(i0, j0), b = W2(i0 + 1, j0), c = W2(i0, j0 + 1), dd = W2(i0 + 1, j0 + 1), mix2 = (o) => (f[a + o] * (1 - fx) + f[b + o] * fx) * (1 - fz) + (f[c + o] * (1 - fx) + f[dd + o] * fx) * fz;
    return [mix2(0), mix2(1)];
  }
  /* a helyi szél: szélszorzó és irányeltérés (a lökésben a szél kicsit jobbra fordul, a lavórban balra – mint a valóságban) */
  function rwWindAt(x, z) {
    const [g0, l0] = rwFieldAt(x, z), sm = (v) => { const k = clamp((v - .18) / .4, 0, 1); return k * k * (3 - 2 * k); }, l = sm(l0), g = sm(g0) * (1 - l);
    return { k: 1 + .3 * g - .58 * l, dir: (6 * g - 4 * l) * D2R, g, l };
  }

  /* ------------------------------------------------------------------ A VÍZ: poláris háló a hajó körül, a világhoz rögzített mintázattal */
  function makeRaceWater(parent, opt) {
    opt = opt || {};
    const RINGS = opt.rings || 120, SEG = opt.seg || 200, R0 = .6, RMAX = opt.rmax || 1600, pos = [], spc = [], idx = [], rad = [0];
    for (let i = 1; i <= RINGS; i++) rad.push(R0 * Math.pow(RMAX / R0, (i - 1) / (RINGS - 1)));
    for (let i = 0; i <= RINGS; i++) { const r = rad[i], dr = Math.max(i < RINGS ? rad[i + 1] - r : r - rad[i - 1], i > 0 ? r - rad[i - 1] : 0), s = Math.max(dr, TAU * r / SEG, .05);
      for (let j = 0; j < SEG; j++) { const a = j / SEG * TAU; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); spc.push(s); } }
    for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) { const a = i * SEG + j, b = i * SEG + (j + 1) % SEG, c = (i + 1) * SEG + j, d = (i + 1) * SEG + (j + 1) % SEG; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aS", new THREE.Float32BufferAttribute(spc, 1)); g.setIndex(idx);
    const v4 = () => [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector4()), v2 = () => [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector2());
    const mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uOff: { value: new THREE.Vector2() }, uWind: { value: 0 }, uW: { value: v4() }, uWp: { value: v2() }, uSun: { value: opt.sun || SUN }, uCam: { value: new THREE.Vector3() },
        uSkyH: { value: new THREE.Color(.70, .80, .87) }, uSkyZ: { value: new THREE.Color(.25, .45, .75) }, uDeep: { value: new THREE.Color(.045, .2, .19) }, uShallow: { value: new THREE.Color(.14, .4, .35) },
        uSunC: { value: new THREE.Color(1, .95, .82) }, uSkyT: { value: null }, uSkyOn: { value: 0 }, uSkyRot: { value: new THREE.Vector2(1, 0) }, uHaze: { value: new THREE.Color(.84, .89, .91) }, uLight: { value: 1 }, uSpec: { value: 1 }, uFlk: { value: 1 }, uFoam: { value: 1 }, uFlD: { value: new THREE.Vector3(0, .05, -1) }, uFlC: { value: new THREE.Color(0, 0, 0) },
        uRip: { value: rwRipTex() }, uRipM: { value: new THREE.Vector4(5.3, 1.7, .26, 0) }, uWf: { value: RW.ft }, uWfM: { value: new THREE.Vector4(0, 0, 1 / RW.fL, 1) }, uWc: { value: new THREE.Vector4(.9, 1, 0, 0) },
        uBt: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, uBs: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
        uHull: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector4(0, 0, 0, 0)) }, uHullS: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3(0, 0, 0)) },
        /* régi nevek (más modulok írhatják) */ uGust: { value: new THREE.Vector2(1, 0) }, uLav: { value: [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Vector4()) } },
      vertexShader: `
        uniform float uT, uWind; uniform vec2 uOff; uniform vec4 uW[6]; uniform vec2 uWp[6];
        attribute float aS;
        varying vec3 vP; varying float vDist; varying vec2 vW; varying vec2 vWP;
        void main(){
          vec3 p = position; vec2 w = p.xz + uOff; vec3 disp = vec3(0.);
          for (int i = 0; i < 4; i++) {   /* csak az a hullám mozgatja a rácsot, amelyet a rács sűrűsége hűen visszaad (különben visszafelé kúszó álminta lenne) */
            float dir = uWind + uW[i].x, k = uW[i].y, A = uW[i].z * smoothstep(2.4 * aS, 4.8 * aS, 6.2832 / k), Q = uW[i].w;
            vec2 D = vec2(cos(dir), sin(dir)); float f = k * dot(D, w) - uWp[i].x * uT + uWp[i].y; float c = cos(f);
            disp.x += Q * A * D.x * c; disp.z += Q * A * D.y * c; disp.y += A * sin(f);
          }
          p += disp; vec4 wp = modelMatrix * vec4(p, 1.);
          vP = vec3(w.x + disp.x, p.y, w.y + disp.z); vW = w; vDist = length(position.xz); vWP = wp.xz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform sampler2D uSkyT, uRip, uWf; uniform float uSkyOn, uFlk, uT, uWind, uLight, uSpec, uFoam; uniform vec2 uSkyRot;
        uniform vec3 uSun, uCam, uSkyH, uSkyZ, uDeep, uShallow, uSunC, uHaze, uFlD, uFlC; uniform vec4 uW[6]; uniform vec2 uWp[6]; uniform vec4 uRipM, uWfM, uWc;
        uniform vec4 uBt[4], uBs[4]; uniform vec4 uHull[6]; uniform vec3 uHullS[6];
        varying vec3 vP; varying float vDist; varying vec2 vW; varying vec2 vWP;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
        void main(){
          /* a kishajók zárt héján BELÜL nincs víz (2026-11-14 18:15 óta) */
          for (int i = 0; i < 6; i++) { vec3 S = uHullS[i]; if (S.x > 0.) { vec2 d = vWP - uHull[i].xy, f = uHull[i].zw; float a = dot(d, f) / S.x, b = (d.x * f.y - d.y * f.x) / S.y; a = a > 0. ? a / (1. + S.z) : a; if (pow(abs(a), 2.4) + pow(abs(b), 2.4) < 1.) discard; } }
          vec2 wd = vec2(cos(uWind), sin(uWind)), wq = vec2(-wd.y, wd.x);
          float px = length(fwidth(vW)) + 1e-4;
          /* SZÉLFOLTOK: lökés (sötét, fodros) és lavór (világos, tükörsima) – szabálytalan, cakkos szélű foltok */
          vec2 F = texture2D(uWf, (vW - uWfM.xy) * uWfM.z).rg * uWfM.w;
          float n1 = vn(vW * .06), n2 = vn(vW * .23 + 7.3);
          float lu = smoothstep(.2, .55, F.g + (n1 - .5) * .3 + (n2 - .5) * .12);
          float gu = smoothstep(.2, .55, F.r + (n1 - .5) * .34 + (n2 - .5) * .14) * (1. - lu);
          /* nagy hullámok: pixelenként számolt Gerstner-normális (a pixelnél rövidebb hullám elhalványul – nincs vibrálás) */
          vec3 n = vec3(0., 1., 0.); float crest = 0.;
          for (int i = 0; i < 6; i++) {
            float dir = uWind + uW[i].x, k = uW[i].y, A = uW[i].z * clamp(1.5 - k * px * .6, 0., 1.), Q = uW[i].w;
            vec2 D = vec2(cos(dir), sin(dir)); float f = k * dot(D, vW) - uWp[i].x * uT + uWp[i].y; float c = cos(f), s = sin(f);
            n.x -= D.x * k * A * c; n.z -= D.y * k * A * c; n.y -= Q * k * A * s; crest += A * k * max(0., s);
          }
          /* FODROK: két, egymáshoz képest elforgatott, lassan a széllel sodródó csempe (a vízhez kötve – ezek mutatják a valódi haladást) */
          vec2 q = vec2(dot(vW, wd), dot(vW, wq));
          vec2 r1 = texture2D(uRip, q / uRipM.x - vec2(uT * .045, 0.)).rg * 2. - 1.;
          vec2 q2 = vec2(q.x * .8 - q.y * .6, q.x * .6 + q.y * .8);
          vec2 r2 = texture2D(uRip, q2 / uRipM.y - vec2(uT * .12, uT * .02)).rg * 2. - 1.;
          vec2 s2 = vec2(r2.x * .8 + r2.y * .6, -r2.x * .6 + r2.y * .8);
          float rip = uRipM.z * (.5 + 1.35 * gu) * (1. - .93 * lu);
          vec2 sw = (r1 * .6 + s2 * .4) * rip, gr = sw.x * wd + sw.y * wq;
          n = vec3(n.x - gr.x, n.y, n.z - gr.y);
          /* A HAJÓK SAJÁT HULLÁMAI: orrhullám, a test mentén lefutó víz, a tat mögötti örvény és a Kelvin-ék (19,5°) ferde „tollhullámai” */
          float bf = 0.;
          for (int i = 0; i < 4; i++) { vec4 B = uBs[i]; if (B.w > 0.) { vec2 d = vW - uBt[i].xy; if (dot(d, d) < 6400.) {
            vec2 Fw = uBt[i].zw, Pp = vec2(-Fw.y, Fw.x); float a = dot(d, Fw), l = dot(d, Pp), al = abs(l), Lh = B.x, Bh = B.y, v = B.z, kv = clamp(v / 4.5, 0., 1.4);
            float u = clamp(a / Lh, -1., 1.), hw = Bh * sqrt(max(0., 1. - pow(abs(u), 2.4))), e = al - hw;
            float bowR = smoothstep(.05, .8, a / Lh) * (1. - smoothstep(Lh * 1.02, Lh * 1.18, a));
            float bw = (.16 + .6 * kv) * (.45 + .55 * smoothstep(0., 1., a / Lh));
            bf += bowR * (1. - smoothstep(0., bw, e)) * step(-.25, e) * kv * 1.2;
            bf += (1. - smoothstep(0., .1 + .22 * kv, e)) * step(-.2, e) * step(-Lh, a) * step(a, Lh) * kv * .5;
            float sb = -a - Lh, sw2 = Bh * .75 + max(sb, 0.) * .07;
            bf += step(0., sb) * (1. - smoothstep(sw2, sw2 + .7, al)) * exp(-max(sb, 0.) / (8. + 7. * kv)) * kv * .9;
            float sk = Lh - a;
            if (sk > 1. && kv > .04) {
              float cusp = sk * .354, wdt = .7 + sk * .055, env = exp(-pow((al - cusp) / wdt, 2.)) * exp(-sk / (30. + 12. * kv)) * smoothstep(1., 6., sk) * kv;
              float lam = max(1.1, 6.2832 * v * v / 9.81 * .67), kk = 6.2832 / lam, ph = kk * (sk * .82 + al * .58), amp = .045 * env;
              vec2 dirW = -Fw * .82 + sign(l) * Pp * .58; n.xz -= dirW * kk * amp * cos(ph);
              bf += env * smoothstep(.72, 1., sin(ph)) * .35;
              float inV = (1. - smoothstep(cusp * .8, cusp, al)) * exp(-sk / (22. + 10. * kv)) * kv, kt = 6.2832 / max(1.6, lam / .67);
              n.xz -= -Fw * kt * .02 * inV * cos(kt * sk);
            } } } }
          n = normalize(n);
          /* FÉNY: Fresnel-tükrözés (a valódi égfotóból), mélységszín, a tarajon átsütő zöldes fény */
          vec3 V = normalize(uCam - vP); float ndv = max(dot(n, V), 0.), fres = .02 + .98 * pow(1. - ndv, 5.);
          vec3 R = reflect(-V, n); float el = clamp(R.y, 0., 1.);
          float farK = smoothstep(25., 220., vDist);
          /* a messzi fodros víz átlagosan magasabbról (sötétebb égrészből) tükröz, a tükörsima a világos láthatárt – ezért sötét a lökés, világos a lavór */
          float rough = (.5 + 1.35 * gu) * (1. - .93 * lu);   /* a fodrozottság: lavórban ~0, átlagos víz 0,5, lökésben ~1,85 */
          float el2 = clamp(el + farK * .1 * rough, 0., 1.);
          vec3 sky = mix(uSkyH, uSkyZ, pow(el2, .45));
          if (uSkyOn > .5) { float lx = R.x * uSkyRot.x - R.z * uSkyRot.y, lz = R.x * uSkyRot.y + R.z * uSkyRot.x; sky = texture2D(uSkyT, vec2(fract(atan(lz, -lx) / 6.2831853), clamp(asin(el2) / 1.5708, .02, .98))).rgb * uLight; }
          vec3 body = mix(uDeep, uShallow, clamp(.3 + crest * 1.4 + n.x * .4, 0., 1.)) * uLight;
          float sss = pow(max(dot(V, -uSun), 0.), 4.) * clamp(crest * 2.5, 0., 1.);
          body += vec3(.03, .12, .09) * sss * uLight;
          float fr = clamp(fres * (1. - farK * clamp(.34 * rough, 0., .66)) + .06 * lu * farK, 0., 1.);
          vec3 col = mix(body, sky, fr) * (1. - .1 * gu);
          float rs = max(dot(R, uSun), 0.), shp = mix(1., 2.3, lu) * mix(1., .55, gu);
          col += uSunC * (pow(rs, 600. * shp) * 7. + pow(rs, 80. * shp) * .45 + pow(rs, 12.) * .035) * uSpec;
          /* 2026-11-15: villám a láthatáron – fényes, remegő csík a vízen a villám felé, és a víz egészének halvány kivilágosodása (05za) */
          if (uFlC.r + uFlC.g + uFlC.b > .002) { float rf = max(dot(R, uFlD), 0.); col += uFlC * (pow(rf, 220. * shp) * 2.6 + pow(rf, 22.) * .32 + pow(rf, 3.) * .05 + fr * .04); }
          /* HAB: a megtörő tarajok fehér sapkája (a taraj elején születik, mögötte a vízen marad és szétesik), friss szélben szélcsíkok, a hajó körül habpelyhek –
             mind a vízhez rögzítve. A hab alakja egy zajtérkép küszöbölése: kevés habnál szórt buborékfoltok, soknál összefüggő, csipkés folt. */
          float k0 = uW[0].y, f0 = k0 * dot(vec2(cos(uWind + uW[0].x), sin(uWind + uW[0].x)), vW) - uWp[0].x * uT + uWp[0].y;
          float pc = mod(1.5708 - f0, 6.2832), cn = floor((1.5708 - f0) / 6.2832);
          vec2 rq = vec2(vW.x * .866 - vW.y * .5, vW.x * .5 + vW.y * .866);
          float brk = texture2D(uRip, rq / 41. + vec2(cn * .37, cn * .61)).b * .7 + texture2D(uRip, vW / 13.7 + vec2(cn * .13, -cn * .29)).b * .3;
          float th = uWc.x - .2 * gu + .14 * lu;
          float crestE = smoothstep(5.5, 6.28, pc) + (1. - smoothstep(0., 2.2, pc)) * .85;
          float wcI = smoothstep(th, th + .12, brk) * crestE * uWc.y * clamp(1.4 - px * .25, 0., 1.);
          float fdn = texture2D(uRip, vW / 2.9).b * .62 + texture2D(uRip, vW / 1.1 + .37).a * .38;
          float cover = (1. - smoothstep(0., 2.6, pc)) * .25 + .75;
          float foam = smoothstep(1. - wcI * cover, 1.18 - wcI * cover, fdn);
          float strk = smoothstep(.6, .9, vn(vec2(q.x * .022, q.y * .5) + 11.)) * uWc.z;
          strk = smoothstep(1. - strk * .55, 1.15 - strk * .55, fdn);
          float nearF = 1. - smoothstep(16., 110., vDist), flI = smoothstep(.45, .85, texture2D(uRip, vW / 23.).b) * nearF * uFlk * (1. - .8 * lu) * .32;
          float fl = smoothstep(1. - flI, 1.12 - flI, fdn);
          float bfo = smoothstep(1. - clamp(bf, 0., 1.), 1.16 - clamp(bf, 0., 1.), fdn);
          float fm = clamp(foam * .9 + strk * .35 + fl * .5 + bfo * .95, 0., 1.) * uFoam;
          col = mix(col, vec3(.93, .96, .97) * uLight, fm);
          col = mix(col, uHaze, smoothstep(250., 1550., vDist) * .85);
          gl_FragColor = vec4(col, 1.);
          #include <colorspace_fragment>
        }`
    });
    W.disposables.push(mat);
    const m = mesh(g, mat, parent); m.frustumCulled = false; m.renderOrder = -5; m.userData.mat = mat; m.userData.rw = true;
    RW.mat = mat; return m;
  }
  /* a hullámok, a szélmező és a kamera átadása a shadernek (minden képkockán) */
  function rwSync(mat) {
    const U = mat.uniforms, W0 = RW.waves; if (W0) for (let i = 0; i < 6; i++) { const w = W0[i]; U.uW.value[i].set(w.a, w.k, w.A, w.Q); U.uWp.value[i].set(w.om, w.ph); }
    U.uWind.value = RW.wdir; U.uT.value = RW.t; if (RW.ft) U.uWf.value = RW.ft; U.uWfM.value.set(RW.fOff[0], RW.fOff[1], 1 / RW.fL, RW.patches.length ? 1 : 0);
    const kn = RW.tws / KN; U.uWc.value.set(clamp(.97 - (kn - 7) * .034, .52, 1.05), clamp((kn - 6) / 6, 0, 1), clamp((kn - 12) / 8, 0, 1) * .9, 0);
    U.uRipM.value.z = clamp(.17 + kn * .009, .17, .34);
  }
  /* versenyfutam: a víz beállítása a futam szeléhez */
  function rwRaceInit(C) {
    const S = VRR, u = vfwd(C.wf); RW.t = 0; rwWaves(C.tws, Math.atan2(-u[1], -u[0]), (C.lvl || 0) * 7 + 3);
    rwFieldInit(C, (S.netSeed || 0) + (C.lvl || 0) * 101 + 7); RW.boats = [];
    if (S.water && S.water.userData.rw) rwSync(S.water.userData.mat);
  }
  /* minden képkockán a futamból: a víz a hajóhoz igazodik (folytonosan), az idő közös a ringással */
  function rwUpdate(dt) {
    const S = VRR, wm = S.water; if (!wm || !wm.userData.rw) return; RW.t += dt;
    if (!RW.waves && S.C) rwRaceInit(S.C);
    wm.position.set(S.x, 0, S.z); const U = wm.userData.mat.uniforms; U.uOff.value.set(S.x, S.z);
    const st = S.t || 0; RW.fOff[0] = RW.fDir[0] * RW.fv * (st + 300); RW.fOff[1] = RW.fDir[1] * RW.fv * (st + 300);
    if (Math.abs(st - RW.fT) > .25) { rwFieldDraw(st + 300); RW.fT = st; }
    rwSync(wm.userData.mat);
    try { const cw = new THREE.Vector3(); T.camObj().getWorldPosition(cw); U.uCam.value.copy(S.env.worldToLocal(cw)); } catch (e) {}
    /* a legközelebbi 4 hajó (a saját mindig) – orrhullám, Kelvin-ék */
    const L = [], me = S.cls || (typeof BOATCLS !== "undefined" ? BOATCLS.zephyr : null), zep = !me || me.id === "zephyr";
    if (!S.pb) L.push([S.x, S.z, S.b, S.v, zep ? HULL.L / 2 * VR_SC * .97 : me.half, zep ? HULL.B / 2 * VR_SC * .8 : me.rad * .8, 0]);
    (S.riv || []).forEach((r) => { if (!r || r.out || !r.g || !r.g.visible) return; const d = Math.hypot(r.x - S.x, r.z - S.z); if (d > 260) return; const rc = (r.mcls && BOATCLS[r.mcls]) || me, z2 = !rc || rc.id === "zephyr"; L.push([r.x, r.z, r.b, r.v || 0, z2 ? HULL.L / 2 * VR_SC * .97 : rc.half, z2 ? HULL.B / 2 * VR_SC * .8 : rc.rad * .8, d]); });
    L.sort((a, b) => a[6] - b[6]);
    for (let i = 0; i < 4; i++) { const q = L[i]; if (!q) { U.uBs.value[i].set(0, 0, 0, 0); continue; } const f = vfwd(q[2]); U.uBt.value[i].set(q[0], q[1], f[0], f[1]); U.uBs.value[i].set(q[4], q[5], Math.max(0, q[3]), 1); }
  }

  /* ------------------------------------------------------------------ NYOMVONAL: a vízhez rögzített, a hullámokon fekvő habcsík a hajó mögött (a régi makeWake helyett) */
  function rwWake(parent, width) {
    const N = 90, pos = new Float32Array(N * 2 * 3), aux = new Float32Array(N * 2 * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aux", new THREE.BufferAttribute(aux, 3));
    const idx = []; for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      uniforms: { uT: { value: 0 }, uW: { value: RW.mat ? RW.mat.uniforms.uW.value : [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector4()) }, uWp: { value: RW.mat ? RW.mat.uniforms.uWp.value : [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector2()) }, uWind: { value: 0 }, uRip: { value: rwRipTex() }, uLight: { value: 1 } },
      vertexShader: `uniform float uT, uWind; uniform vec4 uW[6]; uniform vec2 uWp[6]; attribute vec3 aux; varying vec3 vA; varying vec2 vXZ;
        void main(){ vec3 p = position; float y = 0.; for (int i = 0; i < 4; i++) { float dir = uWind + uW[i].x; vec2 D = vec2(cos(dir), sin(dir)); y += uW[i].z * sin(uW[i].y * dot(D, p.xz) - uWp[i].x * uT + uWp[i].y); }
          p.y = y * .92 + .03; vA = aux; vXZ = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
      fragmentShader: `uniform sampler2D uRip; uniform float uLight; varying vec3 vA; varying vec2 vXZ;
        void main(){ float u = abs(vA.x), age = vA.y, k = vA.z;
          /* örvénylő, buborékos hab: középen sűrűbb, a szélén szakadozott; idővel foltokra esik szét és elhal (a vízhez rögzített zajtérkép küszöbölése) */
          float fdn = texture2D(uRip, vXZ / 2.9).b * .62 + texture2D(uRip, vXZ / 1.1 + .37).a * .38;
          float I = (1. - smoothstep(.1, 1., u)) * k * exp(-age / 12.) * smoothstep(0., .5, age);
          float a = smoothstep(1. - I, 1.2 - I, fdn) * .8 + I * .12;
          gl_FragColor = vec4(vec3(.93, .96, .97) * uLight, clamp(a, 0., .8)); }` });
    W.disposables.push(g, mat);
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 2; parent.add(m);
    const pts = []; let acc = 0;
    return { mesh: m,
      push(x, z, hd, v, dt) {
        acc += v * dt; const Uw = mat.uniforms; Uw.uT.value = RW.t; Uw.uWind.value = RW.wdir; if (RW.mat) Uw.uLight.value = RW.mat.uniforms.uLight.value;
        if (!pts.length || acc > 1.4) { pts.unshift({ x: x - Math.sin(hd) * 3.2, z: z - Math.cos(hd) * 3.2, hd, age: 0, v }); acc = 0; if (pts.length > N) pts.pop(); }
        for (const p of pts) p.age += dt;
        for (let i = 0; i < N; i++) { const p = pts[Math.min(i, pts.length - 1)] || { x, z, hd, age: 99, v: 0 }, w = (width || .7) * (1 + p.age * .045) + p.age * .07, nx = Math.cos(p.hd), nz = -Math.sin(p.hd), k6 = i * 6;
          pos[k6] = p.x - nx * w; pos[k6 + 1] = 0; pos[k6 + 2] = p.z - nz * w; pos[k6 + 3] = p.x + nx * w; pos[k6 + 4] = 0; pos[k6 + 5] = p.z + nz * w;
          const kk = i >= pts.length ? 0 : clamp((p.v - .6) / 3.4, 0, 1); aux[k6] = -1; aux[k6 + 1] = p.age; aux[k6 + 2] = kk; aux[k6 + 3] = 1; aux[k6 + 4] = p.age; aux[k6 + 5] = kk; }
        g.attributes.position.needsUpdate = true; g.attributes.aux.needsUpdate = true; } };
  }

  /* ------------------------------------------------------------------ PERMET: GPU-részecskék (a CPU csak az indulást írja) – a cseppeket a levegő lassítja,
     a szél viszi, a nehézségi erő húzza; a sebességük irányába nyúlnak; a nap felőli oldaluk világosabb. Csepp-fürt (orr- és tatpermet) és finom pára. */
  function rwSprayTex() {
    return canvasTex(256, 128, (g) => { const rnd = vrRng(77);
      /* bal: cseppfürt (sok apró, éles csepp + néhány nagyobb, fényes szélű) */
      for (let i = 0; i < 70; i++) { const a = rnd() * TAU, r = Math.pow(rnd(), .7) * 50, x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r * .8, s = 1.2 + Math.pow(rnd(), 3) * 6.5, gr = g.createRadialGradient(x - s * .3, y - s * .3, 0, x, y, s);
        gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(.6, "rgba(225,240,248,.75)"); gr.addColorStop(1, "rgba(200,225,240,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
      { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 60); gr.addColorStop(0, "rgba(235,245,250,.35)"); gr.addColorStop(1, "rgba(235,245,250,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
      /* jobb: pára (lágy, gomolygó) */
      for (let i = 0; i < 26; i++) { const x = 192 + (rnd() - .5) * 60, y = 64 + (rnd() - .5) * 46, s = 18 + rnd() * 26, gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, "rgba(240,247,250,.22)"); gr.addColorStop(1, "rgba(240,247,250,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); } });
  }
  function rwSprayBuild(parent) {
    const N = 1600, base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute("position", base.attributes.position); g.setAttribute("uv", base.attributes.uv);
    const aP = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), aV = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), aS = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);
    [aP, aV, aS].forEach((a) => { a.setUsage(THREE.DynamicDrawUsage); }); for (let i = 0; i < N; i++) aV.array[i * 4 + 3] = 0;
    g.setAttribute("aP", aP); g.setAttribute("aV", aV); g.setAttribute("aS", aS); g.instanceCount = N;
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uT: { value: 0 }, uWv: { value: new THREE.Vector3() }, uSun: { value: SUN }, uLight: { value: 1 }, uTex: { value: rwSprayTex() }, uNight: { value: 0 } },
      vertexShader: `uniform float uT; uniform vec3 uWv, uSun; attribute vec4 aP, aV, aS; varying vec2 vUv; varying float vA; varying float vL; varying float vK;
        void main(){
          float age = uT - aP.w, life = aV.w, kind = aS.z; vK = kind;
          if (life <= 0. || age < 0. || age > life) { gl_Position = vec4(2., 2., 2., 1.); vA = 0.; return; }
          float tau = kind > .5 ? .22 : .7, tauY = kind > .5 ? .5 : 1.6, e = exp(-age / tau), ey = exp(-age / tauY);
          vec3 v0 = aV.xyz; vec2 rel = v0.xz - uWv.xz;
          vec3 p = aP.xyz; p.xz += uWv.xz * age + rel * tau * (1. - e);
          p.y += (v0.y + 9.81 * tauY) * tauY * (1. - ey) - 9.81 * tauY * age;
          vec3 vel = vec3(uWv.x + rel.x * e, (v0.y + 9.81 * tauY) * ey - 9.81 * tauY, uWv.z + rel.y * e);
          if (p.y < -.25) { gl_Position = vec4(2., 2., 2., 1.); vA = 0.; return; }
          vec4 mv = modelViewMatrix * vec4(p, 1.); vec3 vv = (modelViewMatrix * vec4(vel, 0.)).xyz;
          float sz = aS.x * (1. + aS.y * age), sp = length(vv.xy); vec2 ax = sp > .01 ? vv.xy / sp : vec2(0., 1.); vec2 ay = vec2(ax.y, -ax.x);   /* (−y, x) tükrözött volna: a háromszögek hátat fordítottak és eltűntek */
          float st = kind > .5 ? 1. : 1. + min(sp * .09, 1.6);
          mv.xy += ax * position.y * sz * st + ay * position.x * sz;
          gl_Position = projectionMatrix * mv;
          float u = age / life; vA = smoothstep(0., .08, u) * (1. - smoothstep(.55, 1., u)) * smoothstep(-.25, .15, p.y) * aS.w;
          vUv = vec2(uv.x * .5 + (kind > .5 ? .5 : 0.), uv.y); vL = .78 + .32 * clamp(dot(normalize(vec3(-mv.xyz)), uSun) * .5 + .5, 0., 1.);
        }`,
      fragmentShader: `uniform sampler2D uTex; uniform float uLight, uNight; varying vec2 vUv; varying float vA; varying float vL; varying float vK;
        void main(){ vec4 t = texture2D(uTex, vUv); float a = t.a * vA; if (a < .01) discard; vec3 c = mix(vec3(.86, .93, .97), vec3(1.), t.r) * vL * uLight; gl_FragColor = vec4(c, a);
          #include <colorspace_fragment>
        }` });
    W.disposables.push(g, mat, base);
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 3; parent.add(m);
    return { m, mat, aP, aV, aS, N, i: 0, acc: 0, accS: 0, dirty: false, lo: 1e9, hi: -1 };
  }
  /* egy csepp/párafelhő indítása a hajó helyi teréből (x: jobbra, y: fel, z: hátra – a saját hajónál a root tere) */
  function rwSprayEmit(P, x, y, z, vx, vy, vz, size, grow, kind, alpha, life, hx, hz, hb, hv) {
    const i = P.i; P.i = (P.i + 1) % P.N; const c = Math.cos(hb), s = Math.sin(hb), f = vfwd(hb);
    /* helyi → tó-koordináta (a hajó orra −z; a hajó iránya hb) + a hajó saját sebessége */
    const ex = x * c - z * s + hx, ez = x * s + z * c + hz, evx = vx * c - vz * s + f[0] * hv, evz = vx * s + vz * c + f[1] * hv, o = i * 4;
    P.aP.array[o] = ex; P.aP.array[o + 1] = y; P.aP.array[o + 2] = ez; P.aP.array[o + 3] = RW.t;
    P.aV.array[o] = evx; P.aV.array[o + 1] = vy; P.aV.array[o + 2] = evz; P.aV.array[o + 3] = life;
    P.aS.array[o] = size; P.aS.array[o + 1] = grow; P.aS.array[o + 2] = kind; P.aS.array[o + 3] = alpha;
    P.lo = Math.min(P.lo, i); P.hi = Math.max(P.hi, i); P.dirty = true;
  }
  function rwSprayFlush(P) {
    if (!P.dirty) return; const a = P.lo * 4, n = (P.hi - P.lo + 1) * 4;
    [P.aP, P.aV, P.aS].forEach((at) => { try { if (at.clearUpdateRanges) { at.clearUpdateRanges(); at.addUpdateRange(a, n); } } catch (e) {} at.needsUpdate = true; });
    P.dirty = false; P.lo = 1e9; P.hi = -1;
  }
  /* a futam minden képkockáján: orrpermet a sebesség és a hullámra csapódás szerint, tatpermet a bólintásnál, finom pára friss szélben */
  function rwSprayTick(dt) {
    const S = VRR, P = S.spray; if (!P || !P.m) return; const U = P.mat.uniforms; U.uT.value = RW.t;
    const wfv = vfwd(S.wf), tws = S.tws * (S.gk || 1); U.uWv.value.set(-wfv[0] * tws, 0, -wfv[1] * tws);
    U.uLight.value = (typeof NGT !== "undefined" && NGT.on) ? .3 : 1; if (RW.mat) U.uSun.value = RW.mat.uniforms.uSun.value;
    const zep = !S.cls || S.cls.id === "zephyr", Lh = zep ? HULL.L / 2 * VR_SC : (S.cls.half || 2), Bh = zep ? HULL.B / 2 * VR_SC * .8 : (S.cls.rad || .8) * .8, sc = zep ? 1 : .55;
    const k = S.pb ? 0 : clamp((S.v - 2.4) / 4.5, 0, 1.5), burst = S.sprayBurst; S.sprayBurst = 0;
    const side = S.heelSide || 1, hx = S.x, hz = S.z, hb = S.b, hv = S.v;
    /* a szél felőli oldal: ide csap fel a víz (a hajó dőlése a szél alatti oldal felé) */
    const wSide = Math.sign(wrapA(S.wf - S.b)) || 1;
    P.acc += dt * k * 46;
    while (P.acc > 1) { P.acc -= 1; const sd = Math.random() < .62 ? wSide : -wSide, zz = -Lh * (.86 + Math.random() * .08), xx = sd * (Bh * .32 + Math.random() * Bh * .35);
      rwSprayEmit(P, xx, .25 + Math.random() * .25, zz, sd * (1.2 + Math.random() * 1.8) * sc, (1.3 + Math.random() * 1.6 * (.5 + k)) * sc, -(.6 + Math.random() * 1.2), (.32 + Math.random() * .3) * sc, .9, 0, .55 + .3 * Math.random(), .9 + Math.random() * .7, hx, hz, hb, hv); }
    if (burst) {   /* hullámra csapódás: a szél felőli orrnál magasra csapó cseppfal, amit a látszólagos szél hátrafelé, a fedélzet fölé sodor */
      const nB = Math.round(70 * sc + 30);
      for (let j = 0; j < nB; j++) { const zz = -Lh * (.7 + Math.random() * .2), xx = wSide * (Bh * (.4 + Math.random() * .5));
        rwSprayEmit(P, xx, .3 + Math.random() * .3, zz, wSide * (1.5 + Math.random() * 2.5) * sc, (2.6 + Math.random() * 3.6) * sc * (.6 + .4 * k), -(1 + Math.random() * 2), (.38 + Math.random() * .4) * sc, 1.1, 0, .6 + .35 * Math.random(), 1.1 + Math.random() * .9, hx, hz, hb, hv); }
      for (let j = 0; j < 26; j++) rwSprayEmit(P, wSide * Bh * (.3 + Math.random() * .6), .6 + Math.random() * .6, -Lh * (.6 + Math.random() * .3), wSide * (1 + Math.random() * 2), 1.5 + Math.random() * 2, -(1 + Math.random() * 2), .9 * sc, 2.4, 1, .5, 1.6 + Math.random() * 1.2, hx, hz, hb, hv);
    }
    /* tatpermet: amikor a tat lecsap a hullámba (a tulajdonos 2026-11-12-i kérése szerint megmarad, élethűbben) */
    if (S.sternSlap) { const s0 = S.sternSlap; S.sternSlap = 0; for (let j = 0; j < Math.round(22 * s0); j++) { const sd = Math.random() < .5 ? -1 : 1;
        rwSprayEmit(P, sd * Bh * (.75 + Math.random() * .3), .15, Lh * (.92 + Math.random() * .06), sd * (.4 + Math.random() * 1), (1.6 + Math.random() * 2.2) * sc, .4 + Math.random() * 1.2, (.3 + Math.random() * .3) * sc, 1, 0, .55, .9 + Math.random() * .6, hx, hz, hb, hv); } }
    /* friss szélben a tarajokról leszakadó finom pára (porzás kezdete) a hajó körül */
    const kn = tws / KN; if (kn > 15) { P.accS += dt * (kn - 15) * 2.2; while (P.accS > 1) { P.accS -= 1; const a = Math.random() * TAU, r = 6 + Math.random() * 40;
        rwSprayEmit(P, Math.cos(a) * r, .1 + Math.random() * .3, Math.sin(a) * r, 0, .4 + Math.random() * .6, 0, 1.2 + Math.random() * 1.6, 1.6, 1, .28, 1.4 + Math.random(), hx, hz, hb, 0); } }
    /* a közeli ellenfelek orrpermete (olcsón) */
    (S.riv || []).forEach((r) => { if (!r || r.out || !r.g || !r.g.visible) return; const d = Math.hypot(r.x - S.x, r.z - S.z); if (d > 140) return; const kr = clamp(((r.v || 0) - 2.6) / 4.5, 0, 1.3); r.spAcc = (r.spAcc || 0) + dt * kr * 16;
      const rc = (r.mcls && BOATCLS[r.mcls]) || S.cls, z2 = !rc || rc.id === "zephyr", rL = z2 ? HULL.L / 2 * VR_SC : rc.half, rB = z2 ? HULL.B / 2 * VR_SC * .8 : rc.rad * .8, sc2 = z2 ? 1 : .55;
      while (r.spAcc > 1) { r.spAcc -= 1; const sd = Math.random() < .5 ? -1 : 1; rwSprayEmit(P, sd * rB * (.35 + Math.random() * .3), .25, -rL * .88, sd * (1.2 + Math.random() * 1.6) * sc2, (1.4 + Math.random() * 1.6) * sc2, -.8, .34 * sc2, .9, 0, .5, 1 + Math.random() * .5, r.x, r.z, r.b, r.v || 0); } });
    rwSprayFlush(P);
  }

  W._rw = { RW, rwFieldAt, rwWindAt, rwHeight, rwSlope, rwFieldDraw };   /* teszteléshez */
