
  /* =================================================================== 3/B. A MAKETT VARÁZSLATOS HELYSZÍNE – a Balaton partján, Zamárdiban
     • Egy nyolcszögletű fa napozóstégen állsz a vízen; mögötted palló vezet a füves partra (mint a ház saját napozóstégje a strandon).
     • Előtted a tó: északnyugatra a Tihanyi-félsziget az apátság két tornyával, északra Balatonfüred és a Balaton-felvidék dombjai,
       messze nyugaton a Badacsony „koporsója”, a Gulács, a Szent György-hegy; délre a Kőhegy fehér kilátója. Valós irányokban (Zamárdi strandjáról mérve).
     • Napszak: a választott nap és óra valódi napállása szerint – hajnal, dél, aranyóra, naplemente, kék óra, csillagos éjszaka holddal.
     • Élet: hattyúk és récék a nádas mellett, sirályok, vitorlások lobogó vitorlával, a Szántód–Tihany komp, kiugró halak, szitakötők, lepkék a levendulán,
       este szentjánosbogarak, lámpások, fényfüzér; hangok: víz csobogása, nádirigó, sirály, este tücskök.
     Koordináták: ENV.env = észak felé igazított csoport (É = −z, K = +x); ENV.site = a ház tengelyéhez igazítva (−z = 345°, a tó felé; +x = 75°).
     A site-ban: a stég közepe (0,0,0), a padló y = 0, a víz y = −0,55, a part vonala z = +26, a ház utcája (életnagyságban) z ≈ 53. */
  const ENV = { wt: { value: 0 } };
  const WATER_Y = -.55, SHORE_Z = 26, DECK_R = 5.6;
  const LIFE_POS = new THREE.Vector3(-3, 0, 60);   /* életnagyságban a ház (0,0) pontja a site-ban: az utca középvonala z = 53,2 */

  /* --- napszak: színek a nap magassága szerint (fok) --- */
  const SKYK = [
    /*  el     zenit      horizont   napfény-glória  napfény    fényerő  ég-fény */
    [-16, "#02040b", "#050912", "#000000", "#000000", 0, .07],
    [-8, "#060d24", "#141a38", "#140c1c", "#000000", 0, .12],
    [-3, "#14285a", "#5a4a78", "#a8506a", "#000000", 0, .22],
    [0, "#24407c", "#e07a52", "#ff6a2a", "#ff7232", .35, .34],
    [4, "#3354a0", "#f6a05c", "#ff8a36", "#ff9448", .9, .46],
    [10, "#3866b2", "#f5c88f", "#ffc070", "#ffc27a", 1.25, .58],
    [22, "#2f66c0", "#c8dcee", "#fff0d4", "#fff0d8", 1.5, .7],
    [55, "#2a64c8", "#b9d5ee", "#fff6e6", "#fff6ea", 1.62, .76]];
  const _ca = new THREE.Color(), _cb = new THREE.Color();
  function skyAt(el) {
    let i = 0; while (i < SKYK.length - 2 && el > SKYK[i + 1][0]) i++;
    const a = SKYK[i], b = SKYK[i + 1], k = clamp((el - a[0]) / (b[0] - a[0]), 0, 1);
    const c = (j) => new THREE.Color(a[j]).lerp(_cb.set(b[j]), k);
    return { zen: c(1), hor: c(2), glow: c(3), sunC: c(4), sunI: lerp(a[5], b[5], k), hemiI: lerp(a[6], b[6], k) };
  }
  const dirFromAzEl = (az, el, v) => { const a = az * D2R, e = el * D2R; return (v || new THREE.Vector3()).set(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)); };

  /* --- szél: lombok, nád, levendula ringatása (vertex-shader) --- */
  function windify(mat, amp, freq, key) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uWT = ENV.wt;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWT;").replace("#include <begin_vertex>", `#include <begin_vertex>
        { vec3 w0 = vec3(0.);
          #ifdef USE_INSTANCING
            w0 = instanceMatrix[3].xyz;
          #endif
          float hh = max(position.y, 0.), ph = w0.x * .37 + w0.z * .29 + position.x * .45 + position.z * .3;
          float gust = .65 + .35 * sin(uWT * .31 + w0.x * .02);
          transformed.x += sin(uWT * ${freq.toFixed(2)} + ph) * ${amp.toFixed(4)} * hh * hh * gust;
          transformed.z += cos(uWT * ${(freq * .83).toFixed(2)} + ph * 1.3) * ${(amp * .6).toFixed(4)} * hh * hh * gust; }`);
    };
    mat.customProgramCacheKey = () => "wind-" + (key || "") + amp + "-" + freq;
    return mat;
  }
  /* fénygömbök (additív „glória”) a lámpák, izzók körül – este kigyúlnak */
  function glowPoints(parent, pts, size, color, k) {
    const g = new THREE.BufferGeometry(), a = new Float32Array(pts.length * 3), ph = new Float32Array(pts.length);
    pts.forEach((p, i) => { a[i * 3] = p.x; a[i * 3 + 1] = p.y; a[i * 3 + 2] = p.z; ph[i] = rand() * 100; });
    g.setAttribute("position", new THREE.BufferAttribute(a, 3)); g.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uA: { value: 0 }, uC: { value: new THREE.Color(color) }, uS: { value: size } },
      vertexShader: `attribute float ph; uniform float uT, uS; varying float vF; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; vF = .85 + .15 * sin(uT * 3. + ph); gl_PointSize = uS * 300. / -mv.z; }`,
      fragmentShader: `uniform vec3 uC; uniform float uA; varying float vF; void main(){ float d = length(gl_PointCoord - .5) * 2.; float a = exp(-d * d * 4.) * (1. - smoothstep(.85, 1., d)); gl_FragColor = vec4(uC * a * uA * vF, 1.); }` });
    W.disposables.push(g, m); const P = new THREE.Points(g, m); P.frustumCulled = false; P.renderOrder = 5; parent.add(P);
    (ENV.halos = ENV.halos || []).push({ m, k: k || 1 }); return P;
  }
  /* lombkorona: sok kis „levélcsomó” egy tömbben; a normálisok a korona közepétől kifelé mutatnak (lágy, térbeli fény),
     a csúcsszín alul és belül sötétebb, fölül világosabb, kicsit változó árnyalattal */
  function leafGeom(clumps, base, jitter, detail) {
    const out = []; const cB = new THREE.Color(base);
    clumps.forEach(([cx, cy, cz, R, n, sy]) => {
      for (let k = 0; k < (n || 9); k++) {
        const a = rand() * TAU, e = rr(-.5, 1), d = Math.sqrt(rand()) * R * .62, r = R * rr(.36, .55);
        const px = cx + Math.cos(a) * Math.cos(e) * d, py = cy + Math.sin(e) * d * (sy || 1), pz = cz + Math.sin(a) * Math.cos(e) * d;
        const q = new THREE.IcosahedronGeometry(r, detail == null ? 1 : detail); const p = q.attributes.position, nr = q.attributes.normal, col = [];
        const tint = cB.clone().offsetHSL(rr(-.025, .025), rr(-.06, .06), rr(-.05, .05));
        for (let i = 0; i < p.count; i++) {
          let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const f = 1 + (Math.sin(x * 13.1 + y * 7.7) * .5 + Math.sin(z * 11.3 + x * 5.1) * .5) * (jitter || .18);
          x = x * f + px; y = y * f * (sy || 1) + py; z = z * f + pz; p.setXYZ(i, x, y, z);
          const o = new THREE.Vector3(x - cx, (y - cy) / (sy || 1), z - cz).normalize();
          const nn = new THREE.Vector3(nr.getX(i), nr.getY(i), nr.getZ(i)).lerp(o, .7).normalize(); nr.setXYZ(i, nn.x, nn.y, nn.z);
          const k2 = clamp(.55 + o.y * .45, 0, 1) * clamp(.6 + Math.hypot(x - cx, z - cz) / (R * 1.2) * .5, 0, 1);
          const c = tint.clone().multiplyScalar(.55 + .65 * k2); col.push(c.r, c.g, c.b);
        }
        q.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); out.push([q, new THREE.Matrix4()]);
      }
    });
    return mergeGeoms(out);
  }
  function inst(geo, mat, mats, parent, shadow) {
    const m = new THREE.InstancedMesh(geo, mat, mats.length); W.disposables.push(geo);
    mats.forEach((q, i) => m.setMatrixAt(i, q)); m.instanceMatrix.needsUpdate = true; m.frustumCulled = false;
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    parent.add(m); return m;
  }

  /* --- procedurális textúrák (a ház is használja) --- */
  const TX = {};
  function noiseFill(g, w, h, base, spread, n, sz) {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { const v = (rand() - .5) * spread; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; const s = rr(sz * .4, sz); g.fillRect(rand() * w, rand() * h, s, s); }
  }
  function txPlanks(key, c0, c1, n, opt) {
    opt = opt || {};
    if (TX[key]) return TX[key];
    return TX[key] = canvasTex(512, 512, (g, w, h) => {
      const bh = h / n;
      for (let i = 0; i < n; i++) {
        const c = new THREE.Color(c0).lerp(new THREE.Color(c1), rand());
        g.fillStyle = "#" + c.getHexString(); g.fillRect(0, i * bh, w, bh);
        /* erezet */
        for (let k = 0; k < 26; k++) { g.strokeStyle = `rgba(${rand() < .5 ? "40,24,10" : "255,240,220"},${rr(.04, .12)})`; g.lineWidth = rr(.6, 2); g.beginPath(); const y0 = i * bh + rand() * bh; g.moveTo(0, y0);
          for (let x = 0; x <= w; x += 32) g.lineTo(x, y0 + Math.sin(x * .02 + k) * rr(.5, 2.2)); g.stroke(); }
        /* görcsök, illesztések */
        if (rand() < .5) { g.fillStyle = "rgba(60,36,16,.35)"; g.beginPath(); g.ellipse(rand() * w, i * bh + bh / 2, rr(4, 9), rr(2, 4), 0, 0, TAU); g.fill(); }
        const j = rand() * w; g.fillStyle = "rgba(20,12,6,.55)"; g.fillRect(j, i * bh, 2, bh);
        g.fillStyle = `rgba(15,9,4,${opt.gap || .7})`; g.fillRect(0, i * bh, w, opt.gapW || 3);
      }
    }, { repeat: [1, 1] });
  }
  function txNoise(key, base, spread, n, sz, rep) { if (TX[key]) return TX[key]; return TX[key] = canvasTex(256, 256, (g, w, h) => noiseFill(g, w, h, base, spread, n, sz), { repeat: rep || [1, 1] }); }
  function txGrass() {
    if (TX.grass) return TX.grass;
    return TX.grass = canvasTex(512, 512, (g, w, h) => {
      noiseFill(g, w, h, "#5d8f3e", .22, 2500, 26);
      for (let i = 0; i < 9000; i++) { const x = rand() * w, y = rand() * h, l = rr(3, 9); const c = new THREE.Color().setHSL(rr(.22, .3), rr(.35, .6), rr(.22, .5));
        g.strokeStyle = "#" + c.getHexString(); g.lineWidth = rr(.6, 1.6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(-2, 2), y - l); g.stroke(); }
      for (let i = 0; i < 70; i++) { g.fillStyle = ["#fff6c8", "#ffffff", "#f7d84a", "#c8a6e8"][i % 4]; g.beginPath(); g.arc(rand() * w, rand() * h, rr(1, 2.2), 0, TAU); g.fill(); }
    }, { repeat: [1, 1] });
  }
  function txSand() { return txNoise("sand", "#bfae8a", .22, 2500, 4); }

  /* ===================================================================================== ÉGBOLT */
  function makeMagicSky(parent) {
    const tex = cloudTexture(); tex.wrapS = THREE.RepeatWrapping;
    const U = { uSun: { value: new THREE.Vector3(0, .3, -1).normalize() }, uMoon: { value: new THREE.Vector3(.3, .5, .8).normalize() }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() }, uSunC: { value: new THREE.Color() }, uDay: { value: 1 }, uNight: { value: 0 }, uT: { value: 0 }, uClouds: { value: tex } };
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: U,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
      fragmentShader: `uniform vec3 uSun, uMoon, uZen, uHor, uGlow, uSunC; uniform float uDay, uNight, uT; uniform sampler2D uClouds; varying vec3 vDir;
        float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
        void main(){
          vec3 d = normalize(vDir); float el = d.y;
          vec3 col = mix(uHor, uZen, pow(clamp(el, 0., 1.), .42));
          float s = max(dot(d, uSun), 0.), low = 1. - smoothstep(0., .5, el);
          col += uGlow * (pow(s, 4.) * .32 * low + pow(s, 40.) * .5 + pow(s, 400.) * 1.2);
          float sd = smoothstep(.99955, .99972, dot(d, uSun)) * step(-.02, uSun.y);
          col = mix(col, uSunC * 4. + vec3(.4), sd);
          float ca = 0.;
          if (el > 0.) {
            float u = atan(d.x, -d.z) / 6.2831853 + .5 + uT * .0005, v = 1. - clamp(el / .62, 0., 1.);
            vec4 c = texture2D(uClouds, vec2(u, clamp(v, .02, .98))); ca = c.a * smoothstep(0., .05, el) * smoothstep(.97, .55, el) * .9 * (1. - uNight * .78);
            vec3 lit = mix(uHor * .9 + .05, vec3(1.), .25 + .6 * uDay) * (.25 + .75 * max(uDay, .12));
            vec3 cc = mix(lit * .62, lit, c.r) + uGlow * (pow(s, 3.) * .9 + .25) * (1. - uDay * .55) * c.r;
            cc = mix(cc, vec3(.05,.07,.12), uNight * .75);
            col = mix(col, cc, ca);
          }
          if (uNight > .01 && el > 0.) {
            vec3 q = d * 240.; vec3 i = floor(q); float r = h3(i); vec3 f = fract(q) - .5;
            float st = step(.9962, r) * smoothstep(.42, .0, length(f)) * (.55 + .45 * sin(uT * (2. + r * 3.) + r * 90.));
            /* a Tejút halvány sávja */
            float mw = exp(-pow(dot(d, normalize(vec3(.55, .25, -.8))) * 3.2, 2.)) * .05 * (.6 + .4 * h3(floor(d * 90.)));
            col += (vec3(st * 1.5) + vec3(.7, .75, .95) * mw) * uNight * (1. - ca);
          }
          float md = dot(d, uMoon);
          col += (vec3(.98, .95, .86) * smoothstep(.99965, .9998, md) + vec3(.35, .4, .6) * pow(max(md, 0.), 160.) * .5) * uNight * (1. - ca * .7);
          if (el < 0.) col = mix(uHor * .92, uZen * .25, clamp(-el * 5., 0., 1.));
          gl_FragColor = vec4(col, 1.);
          #include <colorspace_fragment>
        }`
    });
    W.disposables.push(mat);
    const m = mesh(new THREE.SphereGeometry(8000, 48, 24), mat, parent); m.renderOrder = -20; m.frustumCulled = false;
    m.userData.U = U; return m;
  }

  /* ===================================================================================== PANORÁMA (a túlpart, valós irányokban) */
  /* adatcsatornák a textúrában: R = távolság (0 közel … 1 messze), G = világosság-részlet, B = épület (> .5 fehér fal; este ablakfény), A = fedés */
  function panoTexture() {
    const w = 4096, h = 512, top = 4;
    const yOf = (e) => h - e / top * h;
    const X = (b) => ((b % 360) + 360) % 360 / 360 * w;
    const ns = (b, f) => Math.sin(b * f) * .5 + Math.sin(b * f * 2.7 + 1) * .25 + Math.sin(b * f * 6.1 + 2) * .12;
    const C = (r, gg, b) => `rgb(${Math.round(r * 255)},${Math.round(gg * 255)},${Math.round(b * 255)})`;
    const t = canvasTex(w, h, (g) => {
      const layer = (b0, b1, step, fe, R) => {   /* fe(b) → magasság fokban; b1 lehet > 360 */
        g.beginPath(); g.moveTo(X(b0), h);
        for (let b = b0; b <= b1 + 1e-6; b += step) { let x = X(b); if (b >= 360 && X(b0) > x) x += w; g.lineTo(x, yOf(Math.max(0, fe(b)))); }
        let xe = X(b1); if (b1 >= 360 && X(b0) > xe) xe += w; g.lineTo(xe, h); g.closePath();
        const gr = g.createLinearGradient(0, yOf(2.4), 0, h); gr.addColorStop(0, C(R, .55, 0)); gr.addColorStop(1, C(R, .4, 0)); g.fillStyle = gr; g.fill();
        if (b1 >= 360) { g.save(); g.translate(-w, 0); g.fill(); g.restore(); }
      };
      const bld = (b, e0, e1, wd, R, white) => { g.fillStyle = C(R, .5, white ? 1 : .3); const x = X(b); g.fillRect(x - wd / 2, yOf(e1), wd, yOf(e0) - yOf(e1)); };
      const bump = (b, c, wd, hh) => { const d = Math.abs(b - c); return d < wd ? hh * Math.cos(d / wd * Math.PI / 2) ** 1.5 : 0; };
      /* 1) messze nyugaton (37–40 km): Szent György-hegy, Badacsony, Gulács, Tóti-hegy, Szigliget */
      layer(243, 268, .1, (b) => { let e = .06 + .02 * ns(b, 1.3);
        e = Math.max(e, bump(b, 258.4, 1.6, .36), bump(b, 251.6, .7, .3), bump(b, 249.8, .8, .27), bump(b, 247.2, 1.2, .19), bump(b, 245.5, .9, .14));
        const d = Math.abs(b - 254.6); if (d < 2.1) e = Math.max(e, .44 * Math.min(1, (2.1 - d) / .55));   /* Badacsony: lapos tetejű „koporsó” */
        return e; }, .97);
      /* 2) Balaton-felvidék (10–16 km) */
      layer(298, 412, .2, (b) => { let e = 1.1 + .28 * ns(b, .08) + .14 * ns(b, .41); if (b > 380) e *= clamp(1 - (b - 380) / 34, .12, 1); if (b < 306) e *= (b - 298) / 8 + .2; return e; }, .74);
      /* 3) a Kenesei magaspart és a keleti partok (20–30 km) */
      layer(400, 432, .2, (b) => .14 + .07 * ns(b, .7) - (b > 425 ? (b - 425) * .02 : 0), .88);
      /* 4) Balatonfüred (8–9 km): városszél, házak, a Tagore sétány fái */
      layer(318, 336, .1, (b) => .32 + .12 * Math.abs(ns(b, 2.2)), .52);
      for (let k = 0; k < 260; k++) { const b = rr(318.5, 335.5); bld(b, rr(.06, .2), rr(.2, .42), rr(2, 5), .5, rand() < .78); }
      /* 5) a Tihanyi-félsziget (5–7 km): Csúcs-hegy, Óvár, az apátság dombja, a falu */
      layer(281, 323, .1, (b) => { let e = .12 + bump(b, 303.5, 9.5, .92) + bump(b, 296.4, 3.2, .62) + bump(b, 309, 6, .55) + bump(b, 287, 4, .3) + .05 * ns(b, 3.1);
        if (b > 316) e *= clamp((323 - b) / 7, 0, 1) * .8 + .2; if (b < 284) e *= (b - 281) / 3; return e; }, .31);
      for (let k = 0; k < 160; k++) { const b = rr(292.2, 299.5); const e0 = rr(.3, .62); bld(b, e0, e0 + rr(.04, .1), rr(3, 6), .3, rand() < .7); }   /* Tihany falu */
      /* 6) déli part nyugat felé: Szántód, Balatonföldvár (4–8 km), a révvel */
      layer(204, 258, .2, (b) => .2 + .12 * Math.abs(ns(b, 1.9)) + .08 * Math.abs(ns(b, 6.3)) - (b > 248 ? (b - 248) * .015 : 0), .42);
      for (let k = 0; k < 120; k++) { const b = rr(214, 246); bld(b, rr(.04, .14), rr(.14, .3), rr(2, 4), .42, rand() < .6); }
      /* 7) keleti part: Siófok (7 km) – a magas szállodákkal */
      layer(52, 104, .2, (b) => .2 + .1 * Math.abs(ns(b, 2.1)) + .06 * Math.abs(ns(b, 7)) - (b < 60 ? (60 - b) * .02 : 0), .45);
      for (let k = 0; k < 14; k++) { const b = rr(80, 89); bld(b, .1, rr(.4, .78), rr(5, 9), .45, true); }
      for (let k = 0; k < 120; k++) { const b = rr(66, 100); bld(b, rr(.05, .14), rr(.14, .32), rr(2, 4), .45, rand() < .65); }
      /* 8) Kőhegy (3 km, dél) a fehér kilátóval */
      layer(160, 205, .2, (b) => .9 + bump(b, 181, 15, 1.35) + .12 * ns(b, 2.3), .2);
      /* finom részletek: fasorok, erdőfoltok – egyetlen képpont-menetben (a G csatorna világossága) */
      const id = g.getImageData(0, 0, w, h), d = id.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (!d[i + 3] || d[i + 2] > 100) continue;
        const q = Math.sin((x >> 1) * 12.9898 + (y >> 1) * 78.233) * 43758.5453, n = q - Math.floor(q);
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] * (.62 + .8 * n * n))); }
      g.putImageData(id, 0, 0);
    });
    t.colorSpace = THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; t.needsUpdate = true;
    return t;
  }
  function makePanorama(parent) {
    const R = 4000, top = 4 * D2R, h = R * Math.tan(top);
    const g = new THREE.CylinderGeometry(R, R, h, 256, 1, true); g.translate(0, h / 2 + WATER_Y - .4, 0);
    const U = { uMap: { value: panoTexture() }, uNear: { value: new THREE.Color() }, uFar: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uLight: { value: 1 }, uNight: { value: 0 }, uT: { value: 0 } };
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, fog: false, uniforms: U,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform sampler2D uMap; uniform vec3 uNear, uFar, uHaze; uniform float uLight, uNight, uT; varying vec2 vUv;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec4 t = texture2D(uMap, vUv); if (t.a < .03) discard;
          vec3 base = mix(uNear, uFar, t.r) * (.62 + .9 * t.g);
          base = mix(base, uHaze, pow(t.r, 1.6) * .72);
          float wall = smoothstep(.45, .6, t.b);
          vec3 col = mix(base, mix(vec3(.95, .93, .88) * uLight, uHaze, t.r * .55), wall);
          vec2 cell = floor(vUv * vec2(4096., 512.));
          float lit = wall * step(.45, h2(cell)) * (.75 + .25 * sin(uT * 2. + h2(cell + 3.) * 40.));
          col += vec3(1., .78, .45) * lit * uNight * 1.4;
          gl_FragColor = vec4(col, t.a);
          #include <colorspace_fragment>
        }` });
    W.disposables.push(mat);
    const m = mesh(g, mat, parent); m.renderOrder = -10; m.frustumCulled = false;
    m.rotation.y = Math.PI; m.scale.x = -1;   /* É (0°) → −z, ugyanúgy, mint a vitorlázásnál (mérve) */
    m.userData.U = U; return m;
  }

  /* nevezetességek külön, részletes táblán (a panoráma felbontása ennyi távolságra kevés lenne): a tihanyi apátság és a kőhegyi kilátó */
  function makeLandmarks(parent) {
    const list = [];
    const add = (bearing, elev0, wDeg, hDeg, R, draw, cw, ch) => {
      const tex = canvasTex(cw, ch, draw); const w = 2 * R * Math.tan(wDeg / 2 * D2R), hh = R * Math.tan(hDeg * D2R);
      const mat = basic({ map: tex, transparent: true, depthWrite: false, fog: false, alphaTest: .05 });
      const m = mesh(new THREE.PlaneGeometry(w, hh), mat, parent); const a = bearing * D2R;
      m.position.set(Math.sin(a) * R, WATER_Y - .4 + R * Math.tan(elev0 * D2R) + hh / 2, -Math.cos(a) * R); m.lookAt(0, m.position.y, 0); m.renderOrder = -8;
      list.push(mat); return m;
    };
    /* Tihanyi Bencés Apátság (296°, 5,5 km): barokk templom két tornyával, mellette a rendház – a valódi méretnél 1,6× nagyobb, hogy felismerhető legyen */
    add(296.1, .62, .9, .9, 3950, (g, w, h) => {
      const base = h * .97;
      g.fillStyle = "#e9e2cf"; g.fillRect(w * .08, base - h * .2, w * .5, h * .2);            /* rendház */
      g.fillStyle = "#7d5a4a"; g.beginPath(); g.moveTo(w * .06, base - h * .2); g.lineTo(w * .33, base - h * .29); g.lineTo(w * .6, base - h * .2); g.fill();
      for (let k = 0; k < 7; k++) { g.fillStyle = "#6a7480"; g.fillRect(w * (.11 + k * .065), base - h * .14, w * .025, h * .06); }
      g.fillStyle = "#f1ead6"; g.fillRect(w * .58, base - h * .36, w * .3, h * .36);           /* templom */
      g.fillStyle = "#6e4f42"; g.beginPath(); g.moveTo(w * .57, base - h * .36); g.lineTo(w * .73, base - h * .44); g.lineTo(w * .89, base - h * .36); g.fill();
      [.6, .8].forEach((x) => { g.fillStyle = "#f4eedc"; g.fillRect(w * x, base - h * .66, w * .085, h * .66);   /* tornyok */
        g.fillStyle = "#4d5560"; g.beginPath(); g.moveTo(w * (x - .01), base - h * .66); g.quadraticCurveTo(w * (x + .0425), base - h * .74, w * (x + .0425), base - h * .9); g.quadraticCurveTo(w * (x + .0425), base - h * .74, w * (x + .095), base - h * .66); g.fill();
        g.fillStyle = "#c9a24a"; g.fillRect(w * (x + .039), base - h * .97, w * .007, h * .08);
        g.fillStyle = "#3a3a40"; g.beginPath(); g.arc(w * (x + .0425), base - h * .55, w * .02, 0, TAU); g.fill(); });
      g.fillStyle = "#5a6b4a"; for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(rand() * w, base - rand() * h * .08, rr(4, 12), 0, TAU); g.fill(); }
    }, 256, 256);
    /* Kőhegyi kilátó (182°, ~3 km, a domb tetején) */
    add(181.5, 2.0, .35, .5, 2950, (g, w, h) => {
      g.fillStyle = "#f3f0e8"; g.fillRect(w * .4, h * .2, w * .2, h * .8); g.fillStyle = "#8a6a4a"; g.fillRect(w * .32, h * .14, w * .36, h * .08);
      g.strokeStyle = "#f3f0e8"; g.lineWidth = 4; g.strokeRect(w * .32, h * .03, w * .36, h * .11);
    }, 64, 128);
    return list;
  }

  /* ===================================================================================== A STÉG */
  function buildMagicDeck(site) {
    const g = new THREE.Group(); site.add(g); ENV.deck = g;
    const planks = txPlanks("deck", "#6e4e36", "#94694a", 8);   /* sötétebb, napszítta barna (a valódi stég színe) */ planks.repeat.set(1, 1);
    const deckMat = std({ map: planks, roughness: .82 });
    ENV.deckMat = deckMat;
    /* nyolcszög: a deszkák (UV méterben, 0,25 m széles deszkák) */
    const N = 8, pts = []; for (let i = 0; i < N; i++) { const a = (i + .5) / N * TAU; pts.push(new THREE.Vector2(Math.cos(a) * DECK_R, Math.sin(a) * DECK_R)); }
    const shp = new THREE.Shape(pts);
    const top = new THREE.ExtrudeGeometry(shp, { depth: .14, bevelEnabled: true, bevelThickness: .02, bevelSize: .03, bevelSegments: 1 });
    top.rotateX(Math.PI / 2); top.translate(0, -.0, 0);
    { const p = top.attributes.position, uv = top.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2, p.getZ(i) / 2); }
    const deck = mesh(top, deckMat, g); deck.receiveShadow = true; ENV.deckTop = deck;
    /* cölöpök a vízben */
    const postMat = std({ color: "#4a3626", roughness: .9 });
    /* a cölöpök a tó fenekéig érnek (a merülésnél látszanak) */
    const PH = -.05 - UW_BOT, PY = (-.05 + UW_BOT) / 2;
    const posts = []; for (let i = 0; i < N; i++) { const a = (i + .5) / N * TAU; posts.push(M4(Math.cos(a) * (DECK_R - .25), PY, Math.sin(a) * (DECK_R - .25))); }
    [[0, 0], [2.4, 0], [-2.4, 0], [0, 2.4], [0, -2.4]].forEach(([x, z]) => posts.push(M4(x, PY, z)));
    inst(new THREE.CylinderGeometry(.13, .16, PH, 10), postMat, posts, g);
    ENV.postPos = posts.map((m) => new THREE.Vector3().setFromMatrixPosition(m));
    /* korlát: alacsony fa korlát a pallónál nyitva (dél felé) */
    const rail = [], railMat = std({ color: "#7a5538", roughness: .7 });
    for (let i = 0; i < N; i++) {
      const a0 = (i + .5) / N * TAU, a1 = (i + 1.5) / N * TAU, mid = (a0 + a1) / 2;
      if (Math.abs(wrapA(mid - Math.PI / 2)) < .3) continue;   /* +z (dél) felé: a palló bejárata */
      const p0 = new THREE.Vector3(Math.cos(a0) * (DECK_R - .08), 0, Math.sin(a0) * (DECK_R - .08)), p1 = new THREE.Vector3(Math.cos(a1) * (DECK_R - .08), 0, Math.sin(a1) * (DECK_R - .08));
      rail.push(rodGeom(p0.clone().setY(.95), p1.clone().setY(.95), .045, 8)); rail.push(rodGeom(p0.clone().setY(.5), p1.clone().setY(.5), .025, 6));
      for (let k = 1; k < 6; k++) { const q = p0.clone().lerp(p1, k / 6); rail.push(rodGeom(q.clone().setY(0), q.clone().setY(.95), .022, 6)); }
    }
    for (let i = 0; i < N; i++) { const a = (i + .5) / N * TAU, x = Math.cos(a) * (DECK_R - .08), z = Math.sin(a) * (DECK_R - .08); rail.push([new THREE.BoxGeometry(.12, 1.12, .12), M4(x, .56, z)]); }
    mesh(mergeGeoms(rail), railMat, g).castShadow = false;
    /* lámpásoszlopok a sarkokon (a fényfüzér tartói) */
    ENV.lanterns = [];
    const glassM = std({ color: "#ffd9a0", emissive: new THREE.Color("#ffb25a"), emissiveIntensity: 0, roughness: .3, transparent: true, opacity: .92 });
    const ironM = std({ color: "#20242a", roughness: .5, metalness: .6 });
    const lp = [], lg = [], tops = [];
    for (let i = 0; i < N; i++) {
      const a = (i + .5) / N * TAU; if (Math.abs(wrapA(a - Math.PI / 2)) < .5) continue;
      const x = Math.cos(a) * (DECK_R - .08), z = Math.sin(a) * (DECK_R - .08);
      lp.push([new THREE.CylinderGeometry(.035, .045, 2.3, 8), M4(x, 1.15, z)]);
      lp.push([new THREE.BoxGeometry(.24, .03, .24), M4(x, 2.3, z)]); lp.push([new THREE.ConeGeometry(.2, .16, 4), M4(x, 2.62, z, Math.PI / 4)]);
      [[-.1, -.1], [.1, -.1], [-.1, .1], [.1, .1]].forEach(([dx, dz]) => lp.push([new THREE.BoxGeometry(.02, .26, .02), M4(x + dx, 2.43, z + dz)]));
      lg.push([new THREE.BoxGeometry(.17, .24, .17), M4(x, 2.43, z)]);
      tops.push(new THREE.Vector3(x, 2.25, z)); ENV.lanterns.push(new THREE.Vector3(x, 2.43, z));
    }
    mesh(mergeGeoms(lp), ironM, g); const lgM = mesh(mergeGeoms(lg), glassM, g);
    ENV.glows = [{ mat: glassM, k: 3.2, flick: 1 }];
    /* fényfüzér a lámpások között (lógó ívben) – alkonyatkor kigyúl */
    const bulbs = [], bulbM = std({ color: "#fff2c8", emissive: new THREE.Color("#ffcf7a"), emissiveIntensity: 0, roughness: .4 });
    const wire = [];
    for (let i = 0; i < tops.length; i++) {
      const a = tops[i], b = tops[(i + 1) % tops.length]; if (a.distanceTo(b) > 6) continue;
      let prev = a; for (let k = 1; k <= 12; k++) { const u = k / 12; const p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * .38; wire.push(rodGeom(prev, p, .006, 4)); prev = p; if (k < 12 && k % 2 === 0) bulbs.push(M4(p.x, p.y - .05, p.z)); }
    }
    /* a közép fölött keresztben is (a makett fölött) – két ív a szemközti oszlopok között */
    [[0, 3], [1, 4], [2, 5]].forEach(([i, j]) => { const a = tops[i], b = tops[j]; if (!a || !b) return; let prev = a; for (let k = 1; k <= 20; k++) { const u = k / 20; const p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * .3; wire.push(rodGeom(prev, p, .005, 4)); prev = p; if (k % 2 === 1) bulbs.push(M4(p.x, p.y - .05, p.z)); } });
    mesh(mergeGeoms(wire), std({ color: "#202020" }), g);
    inst(new THREE.SphereGeometry(.035, 8, 6), bulbM, bulbs, g);
    glowPoints(g, bulbs.map((m) => new THREE.Vector3().setFromMatrixPosition(m)), .28, "#ffb860", .9);
    glowPoints(g, ENV.lanterns, .9, "#ffa040", 1);
    ENV.glows.push({ mat: bulbM, k: 2.6, tw: 1 });
    /* levendulás ládák (tihanyi levendula) a korlát mentén */
    const boxM = std({ map: txPlanks("box", "#7f5a3a", "#9c7048", 4), roughness: .8 });
    const lav = [], lavHead = [], boxes = [], lavBush = [];
    [[-3.6, -2.6, .62], [3.6, -2.6, -.62], [-4.3, 1.6, 1.3], [4.3, 1.6, -1.3]].forEach(([x, z, r]) => {
      boxes.push([new THREE.BoxGeometry(1.5, .38, .42), M4(x, .19, z, r)]);
      for (let k = 0; k < 150; k++) { const lx = rr(-.68, .68), lz = rr(-.16, .16), hgt = rr(.3, .55); const c = Math.cos(r), s = Math.sin(r);
        const px = x + lx * c + lz * s, pz = z - lx * s + lz * c;
        lav.push(M4(px, .38, pz, rr(0, TAU), rr(-.35, .35), rr(-.35, .35), 1, hgt / .5, 1));
        lavHead.push(M4(px + rr(-.06, .06), .38 + hgt * .92, pz + rr(-.06, .06), rr(0, TAU), rr(-.3, .3), 0)); }
      /* a levendulabokor zöld-szürke „párnája” */
      for (let k = 0; k < 5; k++) { const lx = -.56 + k * .28, c = Math.cos(r), s = Math.sin(r); lavBush.push([new THREE.IcosahedronGeometry(.2, 1), M4(x + lx * c, .42, z - lx * s, 0, 0, 0, 1.1, .7, .9)]); }
    });
    mesh(mergeGeoms(boxes), boxM, g).receiveShadow = true;
    mesh(mergeGeoms(lavBush), windify(std({ color: "#7d9470", roughness: .95, flatShading: true }), .02, 1.4, "lavb"), g);
    const stem = new THREE.CylinderGeometry(.004, .006, .5, 3); stem.translate(0, .25, 0);
    inst(stem, windify(std({ color: "#6f8f5a", roughness: .9 }), .35, 1.6, "lav"), lav, g);
    const head = new THREE.CapsuleGeometry(.018, .11, 1, 4); head.translate(0, .02, 0);
    inst(head, windify(std({ color: "#8a6cc8", roughness: .8, emissive: new THREE.Color("#2a1650"), emissiveIntensity: .25 }), .02, 1.6, "lavh"), lavHead, g);
    ENV.lavender = lavHead.map((m) => new THREE.Vector3().setFromMatrixPosition(m));
    /* padok */
    const benchM = std({ map: txPlanks("bench", "#a4774c", "#c39466", 5), roughness: .7 });
    const bench = [];
    [[-4.4, -.3, Math.PI / 2], [4.4, -.3, -Math.PI / 2]].forEach(([x, z, r]) => {
      const c = Math.cos(r), s = Math.sin(r), P = (lx, ly, lz) => [x + lx * c + lz * s, ly, z - lx * s + lz * c];
      for (let k = 0; k < 3; k++) { const q = P(0, .45, -.2 + k * .14); bench.push([new THREE.BoxGeometry(1.7, .04, .12), M4(q[0], q[1], q[2], r)]); }
      for (let k = 0; k < 2; k++) { const q = P(0, .62 + k * .16, .12); bench.push([new THREE.BoxGeometry(1.7, .1, .03), M4(q[0], q[1], q[2], r, -.18)]); }
      [-.7, .7].forEach((lx) => { const q = P(lx, .22, -.06); bench.push([new THREE.BoxGeometry(.06, .44, .4), M4(q[0], q[1], q[2], r)]); });
    });
    mesh(mergeGeoms(bench), benchM, g).castShadow = true;
    /* távcső (rámutatva: a látnivalók feliratai a láthatáron) */
    const tel = new THREE.Group(); g.add(tel); tel.position.set(-3.0, 0, -3.9);
    const brass = std({ color: "#c9a24a", roughness: .3, metalness: .85 }), blk = std({ color: "#1b1d22", roughness: .4, metalness: .4 });
    [0, 1, 2].forEach((k) => { const a = k / 3 * TAU; rodBetween(new THREE.Vector3(Math.cos(a) * .32, 0, Math.sin(a) * .32), new THREE.Vector3(0, 1.15, 0), .018, blk, tel); });
    const tube = mesh(new THREE.CylinderGeometry(.05, .07, .75, 16), brass, tel); tube.position.set(0, 1.25, 0); tube.rotation.set(Math.PI / 2 - .08, 0, 0);
    const piv = new THREE.Group(); tel.add(piv); piv.position.y = 1.2; piv.add(tube); tube.position.set(0, .05, -.1);
    piv.rotation.y = -((296 - 345) * D2R);   /* a cső Tihany (296°) felé néz */
    ENV.telescope = tel;
    const hitT = mesh(new THREE.BoxGeometry(.7, 1.6, .7), basic({ visible: false }), tel); hitT.position.y = .8;
    ENV.telHit = hitT;
    /* zászlórúd a stég bejáratánál: lobogó magyar zászló és a Zephyr fecskefarkú zászlaja – a szél (ÉNy) felől délkelet felé leng */
    { const pole = new THREE.Group(); g.add(pole); pole.position.set(3.75, 0, 3.75);
      mesh(new THREE.CylinderGeometry(.035, .05, 6.2, 10), std({ color: "#e9ecef", roughness: .3, metalness: .6 }), pole).position.y = 3.1;
      mesh(new THREE.SphereGeometry(.07, 12, 8), std({ color: "#c9a24a", roughness: .3, metalness: .9 }), pole).position.y = 6.25;
      const flag = (draw, w, h, y, swallow) => {
        const tex = canvasTex(256, 170, draw);
        const geo = new THREE.PlaneGeometry(w, h, 24, 10); geo.translate(w / 2, 0, 0);
        if (swallow) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / w, yy = Math.abs(p.getY(i)) / (h / 2); if (x > .7 && yy < (x - .7) / .3) p.setX(i, (.7 + (x - .7) * yy) * w); } }
        const m = std({ map: tex, side: THREE.DoubleSide, roughness: .8 });
        m.onBeforeCompile = (sh) => { sh.uniforms.uWT = ENV.wt; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWT;").replace("#include <begin_vertex>", `#include <begin_vertex>
          float u = position.x / ${w.toFixed(2)};
          transformed.z += sin(uWT * 6.5 - position.x * 4.2 + position.y * 1.3) * .11 * u + sin(uWT * 11. - position.x * 9.) * .025 * u;
          transformed.y -= u * u * .06 * (1. + .5 * sin(uWT * 1.3));`); };
        m.customProgramCacheKey = () => "flag" + w + y;
        const f = mesh(geo, m, pole); f.position.y = y; f.rotation.y = -60 * D2R; return f; };
      flag((gg, w, h) => { ["#ce2939", "#ffffff", "#477050"].forEach((c, i) => { gg.fillStyle = c; gg.fillRect(0, i * h / 3, w, h / 3 + 1); }); }, 1.5, 1.0, 5.6);
      flag((gg, w, h) => { gg.fillStyle = "#0b2f5e"; gg.fillRect(0, 0, w, h); gg.fillStyle = "#ffd166"; gg.font = "800 54px Georgia, serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("ZEPHYR", w * .4, h / 2 + 3); }, 1.3, .5, 4.75, true);
    }
    /* palló a partra */
    const walk = [], wM = std({ map: txPlanks("walk", "#94693f", "#b88a5a", 6), roughness: .85 });
    const wTop = new THREE.BoxGeometry(2.2, .12, SHORE_Z + 2 - DECK_R + .3);
    { const p = wTop.attributes.position, uv = wTop.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2, p.getZ(i) / 2); }
    const wk = mesh(wTop, wM, g); wk.position.set(0, -.06, (DECK_R + SHORE_Z + 2) / 2 - .15); wk.receiveShadow = true;
    for (let z = DECK_R + 1; z < SHORE_Z; z += 2.4) [-1.05, 1.05].forEach((x) => { walk.push([new THREE.CylinderGeometry(.1, .12, .0 - UW_BOT, 8), M4(x, UW_BOT / 2, z)]); ENV.postPos.push(new THREE.Vector3(x, 0, z)); });
    /* kötélkorlát + kis oszlopok a palló mentén, napelemes lámpácskák */
    const ropePts = [], plamps = [];
    for (let z = DECK_R + .3; z < SHORE_Z; z += 3) [-1.05, 1.05].forEach((x) => { walk.push([new THREE.CylinderGeometry(.05, .06, .9, 8), M4(x, .45, z)]); plamps.push(M4(x, .93, z)); ropePts.push([x, z]); });
    mesh(mergeGeoms(walk), postMat, g);
    const rope = []; [-1.05, 1.05].forEach((x) => { const zs = ropePts.filter((q) => q[0] === x).map((q) => q[1]); for (let i = 0; i < zs.length - 1; i++) { rope.push(rodGeom(new THREE.Vector3(x, .9, zs[i]), new THREE.Vector3(x, .9, zs[i + 1]), .022, 6)); rope.push(rodGeom(new THREE.Vector3(x, .5, zs[i]), new THREE.Vector3(x, .5, zs[i + 1]), .016, 6)); } });
    mesh(mergeGeoms(rope), std({ color: "#e9ecef", roughness: .35, metalness: .6 }), g);   /* fehér fémcső korlát (mint a valódi pallón) */
    const capM = std({ color: "#fff3d0", emissive: new THREE.Color("#ffc46a"), emissiveIntensity: 0 });
    inst(new THREE.SphereGeometry(.05, 8, 6), capM, plamps, g); ENV.glows.push({ mat: capM, k: 2 });
    return g;
  }

  /* ===================================================================================== A PART: füves part, fák, sétány, utca */
  function buildShore(site) {
    const g = new THREE.Group(); site.add(g); ENV.shore = g;
    const grass = txGrass(); grass.repeat.set(1, 1);
    const L = 1400, D = 900;
    const land = new THREE.PlaneGeometry(L, D, 70, 45); land.rotateX(-Math.PI / 2); land.translate(0, 0, SHORE_Z + D / 2);
    { const p = land.attributes.position, uv = land.attributes.uv; const col = [];
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), dz = z - SHORE_Z;
        /* a part rézsűje a víz felé, távolabb enyhe hullámzás (dombok a Kőhegy felé) */
        let y = dz < 3 ? -1.1 + dz / 3 * 1.1 : 0; if (dz > 140) y += (dz - 140) * .03 + Math.sin(x * .01) * 2; p.setY(i, y);
        uv.setXY(i, x / 3, z / 3);
        const c = new THREE.Color().setHSL(.25 + .03 * Math.sin(x * .05 + z * .03), .35, .55 + .1 * Math.sin(x * .021) * Math.cos(z * .017)); col.push(c.r, c.g, c.b); }
      land.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); land.computeVertexNormals(); }
    const lm = mesh(land, std({ map: grass, vertexColors: true, roughness: .95 }), g); lm.receiveShadow = true; ENV.land = lm;
    /* homokos-iszapos sáv a vízparton */
    const beach = new THREE.PlaneGeometry(L, 7, 70, 4); beach.rotateX(-Math.PI / 2);
    { const p = beach.attributes.position, uv = beach.attributes.uv; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setZ(i, SHORE_Z - 1.5 + z); p.setY(i, -1.1 + (z + 3.5) / 7 * 1.15 - .06); uv.setXY(i, p.getX(i) / 2, z / 2); } beach.computeVertexNormals(); }
    mesh(beach, std({ map: txSand(), roughness: 1 }), g).receiveShadow = true;
    /* a ház utcája (Gáspár András utca) – hosszan, járdával; a makett életnagyságban ide kerül */
    const SZ = LIFE_POS.z - 6.8;
    const asph = txNoise("roadEnv", "#b5ad9f", .16, 5000, 3); asph.repeat.set(1, 1);   /* világos, kopott aszfalt (mint a valóságban) */
    const road = new THREE.PlaneGeometry(L, 4.8); road.rotateX(-Math.PI / 2); { const p = road.attributes.position, uv = road.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 4, p.getZ(i) / 4); }
    const rd = mesh(road, std({ map: asph, roughness: .95 }), g); rd.position.set(0, .03, SZ); rd.receiveShadow = true;
    const swalk = txNoise("gravelEnv", "#d6d0c3", .25, 6000, 3);
    [-1, 1].forEach((s) => { const sw = new THREE.PlaneGeometry(L, 1.7); sw.rotateX(-Math.PI / 2); { const p = sw.attributes.position, uv = sw.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2, p.getZ(i) / 2); }
      const m = mesh(sw, std({ map: swalk, roughness: .9 }), g); m.position.set(0, .08, SZ + s * 3.25); m.receiveShadow = true; });
    /* sétány a pallótól az utcáig */
    const path = new THREE.PlaneGeometry(2.2, SZ - SHORE_Z - 3); path.rotateX(-Math.PI / 2); { const p = path.attributes.position, uv = path.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2, p.getZ(i) / 2); }
    const pm = mesh(path, std({ map: swalk, roughness: .9 }), g); pm.position.set(0, .04, (SHORE_Z + SZ - 3) / 2 + 1.5); pm.receiveShadow = true;
    /* fák: fűzek a parton, nyárfák, gömbkoronás hársak; a telek környékét és a kilátást (észak) szabadon hagyjuk */
    const free = (x, z) => !(x > -10 && x < 15 && z > SZ - 5 && z < LIFE_POS.z + 44) && Math.abs(x) > 3.2 && !(z > SZ - 4.2 && z < SZ + 4.2);
    const trees = { willow: [], poplar: [], linden: [] }, trunks = [];
    for (let k = 0; k < 520 && (trees.willow.length + trees.poplar.length + trees.linden.length) < 150; k++) {
      const x = rr(-240, 240), z = SHORE_Z + 2 + Math.pow(rand(), 1.6) * 330; if (!free(x, z)) continue;
      const near = z < SHORE_Z + 14, kind = near ? (rand() < .7 ? "willow" : "poplar") : rand() < .35 ? "poplar" : rand() < .6 ? "linden" : "willow";
      const s = rr(.8, 1.3), y = z - SHORE_Z > 140 ? (z - SHORE_Z - 140) * .03 : 0, r = rr(0, TAU);
      trees[kind].push(M4(x, y, z, r, 0, 0, s, s * rr(.9, 1.15), s));
      trunks.push(M4(x, y, z, r, 0, 0, s, s * (kind === "poplar" ? 1.6 : 1), s));
    }
    const trunkG = new THREE.CylinderGeometry(.16, .28, 4, 7); trunkG.translate(0, 2, 0);
    inst(trunkG, std({ color: "#5a4636", roughness: .95 }), trunks, g);
    const fol = (k) => windify(std({ vertexColors: true, roughness: .92 }), .0025, 1.1, k);
    /* a parti fák (sok példány) egyszerűbb csomókból és árnyék nélkül – Quest 2-n ez számít */
    inst(leafGeom([[0, 5.0, 0, 2.6, 6, .7], [1.5, 4.0, .4, 1.9, 4, 1.2], [-1.4, 4.1, -.5, 1.9, 4, 1.25], [0, 3.4, 1.4, 1.7, 4, 1.3], [0, 6.0, 0, 1.6, 3, .8]], "#86a856", .18, 0), fol("willow"), trees.willow, g);
    inst(leafGeom([[0, 6.5, 0, 1.3, 6, 2.6], [0, 9.8, 0, .95, 4, 2.2], [0, 4.2, 0, 1.2, 3, 1.4]], "#4f7d3a", .18, 0), fol("poplar"), trees.poplar, g);
    inst(leafGeom([[0, 5.6, 0, 2.7, 7, .95], [1.3, 6.6, .3, 1.9, 4], [-1.2, 6.4, -.6, 1.9, 4], [.2, 7.6, -.2, 1.6, 3], [0, 4.6, .8, 1.7, 3]], "#5e8f3e", .18, 0), fol("linden"), trees.linden, g);
    /* nád a part mentén és a stég körül (a tó felé eső kilátást szabadon hagyva) */
    /* nádas – a zamárdi strand fotói szerint: sűrű, magas (2–3 m) nádöv a part mentén, a palló ezen vezet át; a nád bugája világos, tollas */
    const reeds = [], heads = [];
    const reed = (x, z, hmin, hmax) => { const h = rr(hmin, hmax); reeds.push(M4(x, WATER_Y - .1, z, rr(0, TAU), rr(-.14, .14), rr(-.14, .14), rr(.8, 1.3), h / 2, 1)); if (rand() < .14) heads.push(M4(x + rr(-.05, .05), WATER_Y - .1 + h * .97, z + rr(-.05, .05), rr(0, TAU), rr(-.4, .4), rr(-.4, .4))); };
    const clump = (cx, cz, n, rad) => { for (let k = 0; k < n; k++) { const a = rand() * TAU, r = Math.sqrt(rand()) * rad; reed(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 1.6, 2.7); } };
    for (let k = 0; k < 1600; k++) { const x = rr(-130, 130), d = Math.pow(rand(), .7) * 15, z = SHORE_Z - .5 - d; if (Math.abs(x) < 1.7) continue; if (Math.hypot(x, z) < DECK_R + 2.5) continue; reed(x, z, 1.9 + (1 - d / 15) * .6, 3.2); }
    [[6.8, 2.5, 60], [-6.9, 2.2, 60], [7.3, -1.8, 40], [-7.4, -1.4, 40], [4.2, 7.5, 40], [-4, 8, 40], [9, 10, 50], [-9.5, 12, 50]].forEach(([x, z, n]) => clump(x, z, n, 1.9));
    const blade = new THREE.PlaneGeometry(.05, 2, 1, 4); blade.translate(0, 1, 0);
    { const p = blade.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y / 2.3)); } }
    inst(blade, windify(std({ color: "#7f9a4a", roughness: .9, side: THREE.DoubleSide }), .045, 1.35, "reed"), reeds, g);
    const plume = new THREE.CapsuleGeometry(.022, .18, 1, 5); plume.rotateZ(.35);
    inst(plume, windify(std({ color: "#d8cbb0", roughness: 1 }), .0, 1.35, "plume"), heads, g);
    /* a nádfal: áttetsző, sűrű nádat ábrázoló sávok több sorban (a valódi nádas sűrűsége így olcsón kijön) */
    const rt = canvasTex(512, 256, (gg, w, h) => {
      for (let k = 0; k < 900; k++) { const x = rand() * w, top = h * rr(.05, .35), c = new THREE.Color().setHSL(rr(.17, .26), rr(.35, .55), rr(.25, .5));
        gg.strokeStyle = "#" + c.getHexString(); gg.lineWidth = rr(1, 2.4); gg.beginPath(); gg.moveTo(x, h); gg.quadraticCurveTo(x + rr(-6, 6), (h + top) / 2, x + rr(-10, 10), top); gg.stroke();
        if (rand() < .5) { const y = rr(top + 20, h - 20); gg.beginPath(); gg.moveTo(x, y); gg.quadraticCurveTo(x + rr(-30, 30), y - rr(10, 30), x + rr(-45, 45), y - rr(0, 40)); gg.lineWidth = rr(2, 4); gg.stroke(); }
        if (rand() < .3) { gg.fillStyle = `hsla(38,${rr(25, 40)}%,${rr(68, 82)}%,.9)`; gg.beginPath(); gg.ellipse(x + rr(-8, 8), top - 6, rr(3, 6), rr(10, 18), rr(-.4, .4), 0, TAU); gg.fill(); }
      }
    });
    const wall = [];
    for (let r = 0; r < 5; r++) for (let x = -130; x <= 130; x += 3.6) {
      const px = x + rr(-1.2, 1.2), pz = SHORE_Z - .6 - r * 2.8 - rr(0, 1.4); if (Math.abs(px) < 3.6) continue; if (Math.hypot(px, pz) < DECK_R + 3) continue;
      const hh = rr(2.6, 3.4) - r * .12, ww = rr(4.5, 6);
      wall.push([new THREE.PlaneGeometry(ww, hh, 3, 2).translate(0, hh / 2, 0), M4(px, WATER_Y - .15, pz, rr(-.35, .35))]);
    }
    { const wg = mergeGeoms(wall); mesh(wg, windify(std({ map: rt, alphaTest: .45, side: THREE.DoubleSide, roughness: .95 }), .012, 1.2, "reedwall"), g); }
    ENV.reedSpots = [[6.8, 2.5], [-6.9, 2.2], [7.3, -1.8], [-7.4, -1.4], [4.2, 7.5], [-4, 8]];
    /* tavirózsák (tündérrózsa) a nádas előtt */
    const pads = [], flowers = [];
    ENV.reedSpots.forEach(([x, z]) => { for (let k = 0; k < 7; k++) { const a = rand() * TAU, r = rr(1.8, 3.6), px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (Math.hypot(px, pz) < DECK_R + .6) continue;
      pads.push(M4(px, WATER_Y + .03, pz, rr(0, TAU), 0, 0, rr(.7, 1.3), 1, rr(.7, 1.3))); if (rand() < .35) flowers.push(M4(px + .05, WATER_Y + .05, pz, rr(0, TAU))); } });
    const padG = new THREE.CircleGeometry(.22, 14, .25, TAU - .5); padG.rotateX(-Math.PI / 2);
    inst(padG, std({ color: "#3f7a3a", roughness: .5, side: THREE.DoubleSide }), pads, g);
    const flG = new THREE.ConeGeometry(.07, .07, 8, 1, true); flG.rotateX(Math.PI); flG.translate(0, .04, 0);
    inst(flG, std({ color: "#fbe8f0", emissive: new THREE.Color("#f6c3d6"), emissiveIntensity: .15, side: THREE.DoubleSide }), flowers, g);
    ENV.pads = pads.map((m) => new THREE.Vector3().setFromMatrixPosition(m));
    /* parkvilágítás a sétány mentén */
    const lampP = [], lampH = [];
    for (let z = SHORE_Z + 4; z < SZ - 4; z += 8) [-1.8, 1.8].forEach((x) => { lampP.push([new THREE.CylinderGeometry(.05, .07, 3.2, 8), M4(x, 1.6, z)]); lampH.push(M4(x, 3.25, z)); });
    for (let x = -60; x <= 60; x += 15) { lampP.push([new THREE.CylinderGeometry(.06, .08, 5, 8), M4(x, 2.5, SZ - 3.6)]); lampH.push(M4(x, 5.05, SZ - 3.6)); }
    mesh(mergeGeoms(lampP), std({ color: "#2a2e33", metalness: .5, roughness: .5 }), g);
    const lhM = std({ color: "#fff4d6", emissive: new THREE.Color("#ffc878"), emissiveIntensity: 0 });
    inst(new THREE.SphereGeometry(.18, 12, 8), lhM, lampH, g); ENV.glows.push({ mat: lhM, k: 2.4 });
    glowPoints(g, lampH.map((m) => new THREE.Vector3().setFromMatrixPosition(m)), 2.2, "#ffb860", .8);
    /* a déli láthatár közeli fasora: a parti fák mögötti település (gyűrű) */
    return g;
  }
  function makeTreeline(parent) {
    const R = 430, top = 5 * D2R, h = R * Math.tan(top);
    const tex = canvasTex(2048, 256, (g, w, hh) => {
      const X = (b) => b / 360 * w, yOf = (e) => hh - e / 5 * hh;
      for (let pass = 0; pass < 3; pass++) for (let k = 0; k < 900; k++) {
        const b = rr(70, 262), e = (b < 82 || b > 250 ? .4 : 1) * rr(1.2, 2.8) * (pass === 2 ? .7 : 1), r = rr(5, 16) * (pass + 1) * .5;
        const c = new THREE.Color().setHSL(rr(.22, .3), rr(.3, .5), rr(.14, .26) + pass * .03); g.fillStyle = "#" + c.getHexString();
        g.beginPath(); g.ellipse(X(b), yOf(e), r, r * rr(.8, 1.3), 0, 0, TAU); g.fill(); g.fillRect(X(b) - r, yOf(e), 2 * r, hh);
        if (pass === 1 && rand() < .07) { g.fillStyle = rand() < .7 ? "#9a4b35" : "#e8e2d6"; const x = X(rr(95, 240)), y = yOf(rr(.6, 1.2)); g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x, y - 9); g.lineTo(x + 14, y); g.fill(); g.fillStyle = "#e9e3d6"; g.fillRect(x - 11, y, 22, 10); }
      }
      g.fillStyle = "#e9e3d6"; const cx = X(208), cy = yOf(2.2); g.fillRect(cx - 4, cy, 8, 30); g.beginPath(); g.moveTo(cx - 5, cy); g.lineTo(cx, cy - 18); g.lineTo(cx + 5, cy); g.fill();   /* templomtorony */
    });
    const g = new THREE.CylinderGeometry(R, R, h + 8, 160, 1, true); g.translate(0, h / 2 - 8, 0);
    const mat = basic({ map: tex, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false, alphaTest: .1 });
    const m = mesh(g, mat, parent); m.renderOrder = -9; m.rotation.y = Math.PI; m.scale.x = -1; m.frustumCulled = false;
    m.userData.mat = mat; return m;
  }

  /* ===================================================================================== ÉLET A VÍZEN ÉS A LEVEGŐBEN */
  /* több alkatrész egyetlen csúcsszínes hálóban: [geometria, mátrix, szín] */
  function colorMesh(list, opt) {
    const parts = list.map(([g, m, c]) => { const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute("color", new THREE.BufferAttribute(a, 3)); return [g, m]; });
    const mm = new THREE.Mesh(mergeGeoms(parts), std(Object.assign({ vertexColors: true, roughness: .7 }, opt || {}))); return mm;
  }
  function makeSwan(male) {
    const W2 = "#f7f6f0", L = [];
    L.push([new THREE.SphereGeometry(.3, 16, 12), M4(0, .12, 0, 0, 0, 0, .85, .55, 1.35), W2]);
    [-1, 1].forEach((s) => L.push([new THREE.SphereGeometry(.26, 12, 8, 0, TAU, 0, Math.PI / 2), M4(s * .12, .2, .06, 0, -.35, s * .45, .45, .55, 1.2), W2]));
    L.push([new THREE.ConeGeometry(.1, .25, 8), M4(0, .2, .42, 0, -Math.PI / 2 - .5, 0), W2]);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .2, -.3), new THREE.Vector3(0, .42, -.38), new THREE.Vector3(0, .62, -.33), new THREE.Vector3(0, .78, -.38), new THREE.Vector3(0, .8, -.46)]);
    L.push([new THREE.TubeGeometry(curve, 16, .05, 8), new THREE.Matrix4(), W2]);
    L.push([new THREE.SphereGeometry(.07, 12, 8), M4(0, .8, -.47, 0, 0, 0, .85, .85, 1.25), W2]);
    L.push([new THREE.ConeGeometry(.032, .13, 8), M4(0, .775, -.58, 0, -Math.PI / 2 - .35, 0), "#e0662a"]);
    L.push([new THREE.SphereGeometry(male ? .03 : .022, 8, 6), M4(0, .81, -.53), "#15171a"]);
    [-1, 1].forEach((s) => L.push([new THREE.SphereGeometry(.012, 6, 4), M4(s * .05, .815, -.5), "#15171a"]));
    const g = new THREE.Group(), m = colorMesh(L, { roughness: .75 }); m.castShadow = true; g.add(m); return g;
  }
  function makeSwanOld(male) {
    const g = new THREE.Group(), wht = std({ color: "#f7f6f0", roughness: .75 }), blk = std({ color: "#15171a", roughness: .5 }), ora = std({ color: "#e0662a", roughness: .5 });
    const body = mesh(new THREE.SphereGeometry(.3, 16, 12), wht, g); body.scale.set(.85, .55, 1.35); body.position.y = .12;
    /* felemelt szárnyak (a bütykös hattyú jellegzetes tartása) */
    [-1, 1].forEach((s) => { const wg = mesh(new THREE.SphereGeometry(.26, 12, 8, 0, TAU, 0, Math.PI / 2), wht, g); wg.scale.set(.45, .55, 1.2); wg.position.set(s * .12, .2, .06); wg.rotation.set(-.35, 0, s * .45); });
    const tail = mesh(new THREE.ConeGeometry(.1, .25, 8), wht, g); tail.rotation.x = -Math.PI / 2 - .5; tail.position.set(0, .2, .42);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .2, -.3), new THREE.Vector3(0, .42, -.38), new THREE.Vector3(0, .62, -.33), new THREE.Vector3(0, .78, -.38), new THREE.Vector3(0, .8, -.46)]);
    mesh(new THREE.TubeGeometry(curve, 16, .05, 8), wht, g);
    const head = mesh(new THREE.SphereGeometry(.07, 12, 8), wht, g); head.scale.set(.85, .85, 1.25); head.position.set(0, .8, -.47);
    const beak = mesh(new THREE.ConeGeometry(.032, .13, 8), ora, g); beak.rotation.x = -Math.PI / 2 - .35; beak.position.set(0, .775, -.58);
    const knob = mesh(new THREE.SphereGeometry(male ? .03 : .022, 8, 6), blk, g); knob.position.set(0, .81, -.53);
    [-1, 1].forEach((s) => { const e = mesh(new THREE.SphereGeometry(.012, 6, 4), blk, g); e.position.set(s * .05, .815, -.5); });
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  function makeDuck(male) {
    const L = [], body = male ? "#a69a8c" : "#8a6a48";
    L.push([new THREE.SphereGeometry(.13, 12, 8), M4(0, .04, 0, 0, 0, 0, .8, .55, 1.3), body]);
    if (male) L.push([new THREE.SphereGeometry(.09, 10, 8), M4(0, .07, -.1, 0, 0, 0, 1, .9, .8), "#6a3a2a"]);
    L.push([new THREE.SphereGeometry(.06, 10, 8), M4(0, .17, -.15), male ? "#1f5a3a" : "#7a5a3a"]);
    L.push([new THREE.BoxGeometry(.035, .015, .07), M4(0, .16, -.22), male ? "#e8c13a" : "#c88a3a"]);
    if (male) L.push([new THREE.TorusGeometry(.045, .008, 4, 12), M4(0, .12, -.14, 0, Math.PI / 2, 0), "#ffffff"]);
    L.push([new THREE.ConeGeometry(.05, .12, 6), M4(0, .08, .17, 0, -Math.PI / 2 - .6, 0), body]);
    const g = new THREE.Group(); g.add(colorMesh(L, { roughness: .8 })); return g;
  }
  function makeDuckOld(male) {
    const g = new THREE.Group();
    const bodyM = std({ color: male ? "#a69a8c" : "#8a6a48", roughness: .85 }), headM = std({ color: male ? "#1f5a3a" : "#7a5a3a", roughness: .4, metalness: male ? .3 : 0 });
    const b = mesh(new THREE.SphereGeometry(.13, 12, 8), bodyM, g); b.scale.set(.8, .55, 1.3); b.position.y = .04;
    if (male) { const br = mesh(new THREE.SphereGeometry(.09, 10, 8), std({ color: "#6a3a2a" }), g); br.position.set(0, .07, -.1); br.scale.set(1, .9, .8); }
    const h = mesh(new THREE.SphereGeometry(.06, 10, 8), headM, g); h.position.set(0, .17, -.15);
    const bk = mesh(new THREE.BoxGeometry(.035, .015, .07), std({ color: male ? "#e8c13a" : "#c88a3a" }), g); bk.position.set(0, .16, -.22);
    if (male) { const ring = mesh(new THREE.TorusGeometry(.045, .008, 4, 12), std({ color: "#ffffff" }), g); ring.rotation.x = Math.PI / 2; ring.position.set(0, .12, -.14); }
    const tl = mesh(new THREE.ConeGeometry(.05, .12, 6), bodyM, g); tl.rotation.x = -Math.PI / 2 - .6; tl.position.set(0, .08, .17);
    return g;
  }
  function makeFish() {
    const g = new THREE.Group(), m = std({ color: "#c8d0d6", roughness: .25, metalness: .7 });
    const b = mesh(new THREE.SphereGeometry(.12, 10, 6), m, g); b.scale.set(.35, .6, 1.4);
    const t = mesh(new THREE.ConeGeometry(.08, .12, 4), m, g); t.rotation.x = Math.PI / 2; t.position.z = .2; t.scale.set(.2, 1, 1);
    return g;
  }
  function makeDragonfly() {
    const g = new THREE.Group(), bm = std({ color: "#2a6ad6", roughness: .3, metalness: .5, emissive: new THREE.Color("#0a2a6a"), emissiveIntensity: .4 });
    const wm = basic({ color: "#dfefff", transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false });
    const b = mesh(new THREE.CylinderGeometry(.006, .004, .09, 5), bm, g); b.rotation.x = Math.PI / 2;
    const wl = [], wg = new THREE.PlaneGeometry(.07, .015); wg.translate(.035, 0, 0); wg.rotateX(-Math.PI / 2);
    [[-1, -.012], [1, -.012], [-1, .004], [1, .004]].forEach(([s, z]) => { const w = mesh(wg, wm, g); w.scale.x = s; w.position.z = z; wl.push(w); });
    g.userData.w = wl; return g;
  }
  function makeButterfly(col) {
    const g = new THREE.Group(), wm = std({ color: col, side: THREE.DoubleSide, roughness: .6 });
    const wg = new THREE.CircleGeometry(.035, 8); wg.translate(.03, 0, 0); wg.rotateX(-Math.PI / 2);
    const l = mesh(wg, wm, g), r = mesh(wg, wm, g); r.scale.x = -1;
    mesh(new THREE.CylinderGeometry(.004, .004, .045, 4), std({ color: "#222" }), g).rotation.x = Math.PI / 2;
    g.userData.w = [l, r]; return g;
  }
  /* távoli vitorlás egyszerűsítve (2 rajzolási hívás): test + árboc egyben, a vitorlák lobognak (vertex-shader) */
  function makeFarBoat(sailCol, hullCol) {
    const g = new THREE.Group();
    const hs = new THREE.Shape(); hs.moveTo(0, -4.2); hs.quadraticCurveTo(1.25, -2, 1.2, 2.6); hs.lineTo(.95, 3.6); hs.lineTo(-.95, 3.6); hs.lineTo(-1.2, 2.6); hs.quadraticCurveTo(-1.25, -2, 0, -4.2);
    const hull = new THREE.ExtrudeGeometry(hs, { depth: .9, bevelEnabled: false }); hull.rotateX(Math.PI / 2); hull.translate(0, .55, 0);
    const L = [[hull, new THREE.Matrix4(), hullCol], [new THREE.BoxGeometry(1.6, .5, 2.6), M4(0, .7, .6), "#e8e8e2"], [new THREE.CylinderGeometry(.06, .07, 11, 6), M4(0, 6, -.6), "#c9ced4"], [new THREE.CylinderGeometry(.05, .05, 4.2, 6), M4(0, 1.6, 1.4, 0, Math.PI / 2, 0), "#c9ced4"]];
    g.add(colorMesh(L, { roughness: .4 }));
    const sp = []; const main = new THREE.BufferGeometry(); const jib = new THREE.BufferGeometry();
    const tri = (A, B, C, nu) => { const pos = []; for (let j = 0; j <= nu; j++) for (let i = 0; i <= nu - j; i++) { const u = i / nu, v = j / nu; pos.push(A[0] + (B[0] - A[0]) * u + (C[0] - A[0]) * v, A[1] + (B[1] - A[1]) * u + (C[1] - A[1]) * v, A[2] + (B[2] - A[2]) * u + (C[2] - A[2]) * v); } const idx = []; let o = 0; for (let j = 0; j < nu; j++) { const row = nu - j + 1; for (let i = 0; i < nu - j; i++) { idx.push(o + i, o + i + 1, o + i + row); if (i < nu - j - 1) idx.push(o + i + 1, o + i + row + 1, o + i + row); } o += row; } const ge = new THREE.BufferGeometry(); ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setIndex(idx); ge.computeVertexNormals(); return ge; };
    const sails = mergeGeoms([[tri([0, 1.7, -.55], [0, 1.7, 3.4], [0, 11, -.55], 8), new THREE.Matrix4()], [tri([0, 1.2, -4], [0, 1.6, -.9], [0, 10, -.7], 6), new THREE.Matrix4()]]);
    const sm = std({ color: sailCol, roughness: .7, side: THREE.DoubleSide });
    sm.onBeforeCompile = (sh) => { sh.uniforms.uWT = ENV.wt; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWT;").replace("#include <begin_vertex>", `#include <begin_vertex>
      float lf = clamp((position.z + .6) / 4., 0., 1.) * clamp(position.y / 11., 0., 1.);
      transformed.x += .45 * sin(position.y * .35 + position.z * .4) + lf * .12 * sin(uWT * 9. + position.y * 1.7 + position.z * 2.);`); };
    sm.customProgramCacheKey = () => "farsail" + sailCol;
    const s = new THREE.Mesh(sails, sm); W.disposables.push(sails); g.add(s); g.userData.sail = s;
    return g;
  }
  function buildLife(site) {
    const L = ENV.life = { swans: [], ducks: [], boats: [], fish: [], splash: [], drag: [], bfly: [] };
    /* hattyúcsalád: két felnőtt lassan körözik a nádas mellett */
    [[1, 10, .05, 0], [0, 11.5, .05, .5], [1, 15, -.035, 2.2]].forEach(([male, r, sp, ph], i) => { const s = makeSwan(male); site.add(s); L.swans.push({ g: s, r, sp, a: ph + rr(0, 1), ph: rr(0, 9), cx: i === 2 ? -4 : 2, cz: i === 2 ? -6 : 1 }); });
    [[1], [0], [1], [0]].forEach(([m], i) => { const d = makeDuck(m); site.add(d); L.ducks.push({ g: d, i, a: rr(0, TAU), ph: rr(0, 9) }); });
    /* vitorlások a tavon (a regatta hajói) */
    /* egy részletes vitorlás (lobogó vitorla, legénység) közelebb, a többi egyszerűsített a távolban */
    { const b = BOATS[2 % BOATS.length]; const g = makeBoat(Object.assign({ detail: 0, crew: 2 }, b)); ENV.env.add(g);
      L.boats.push({ g, x: -60, z: -110, b: 1.2, v: 2.5, wp: null, ph: rand() * 9, wk: makeWake(ENV.env, .55), near: 1 });
      /* rámutatva: „Vitorlázz vele!” – csippentésre átvisz a vitorlázás világába */
      const hit = mesh(new THREE.BoxGeometry(5, 14, 11), basic({ visible: false }), g); hit.position.y = 6;
      hit.userData.xr = { hover: (on) => { try { if (on) showTip(g, "⛵ Vitorlázz a Balatonon!", "Csippents rá: a kormányrúdhoz ülsz"); else showTip(null); } catch (e) {} }, click: () => { setTimeout(() => W.open("sail"), 30); } };
      T.xr.extra.add(hit); W.objs.push(hit); }
    [["#f4f2ea", "#ffffff"], ["#e9e4d4", "#1d3a8a"], ["#f6f4ec", "#c62828"], ["#ffffff", "#2b2f36"], ["#f2efe4", "#e9ecef"]].forEach(([sc, hc]) => {
      const g = makeFarBoat(sc, hc); ENV.env.add(g); const a = rr(-1.3, 1.1), d = rr(260, 1100);
      L.boats.push({ g, x: Math.sin(a) * d, z: -Math.cos(a) * d - 60, b: rr(0, TAU), v: 2.5, wp: null, ph: rand() * 9, far: 1 });
    });
    L.ferry = makeFerry(); ENV.env.add(L.ferry.g);
    L.gulls = makeGulls(site);
    /* kiugró halak */
    for (let k = 0; k < 3; k++) { const f = makeFish(); f.visible = false; site.add(f); L.fish.push({ g: f, t: rr(2, 9), on: false }); }
    const ringM = basic({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false });
    for (let k = 0; k < 6; k++) { const r = mesh(new THREE.RingGeometry(.9, 1, 32), ringM.clone(), site); W.disposables.push(r.material); r.rotation.x = -Math.PI / 2; r.visible = false; L.splash.push({ m: r, t: 9 }); }
    /* szitakötők a nádasnál, lepkék a levendulán */
    for (let k = 0; k < 4; k++) { const d = makeDragonfly(); site.add(d); const s = ENV.reedSpots[k % ENV.reedSpots.length]; L.drag.push({ g: d, home: new THREE.Vector3(s[0] * .8, .9, s[1] * .8), p: new THREE.Vector3(s[0] * .8, .9, s[1] * .8), tgt: new THREE.Vector3(), t: 0 }); }
    ["#f2c94c", "#ffffff", "#e8833a", "#7ec8e3"].forEach((c, k) => { const b = makeButterfly(c); site.add(b); L.bfly.push({ g: b, i: k, t: rr(0, 9), p: ENV.lavender[(k * 37) % ENV.lavender.length].clone() }); });
    /* szentjánosbogarak (este) és aranyló „varázspor” a makett körül */
    const ff = new THREE.BufferGeometry(), N = 90, pp = new Float32Array(N * 3), ph = new Float32Array(N);
    for (let i = 0; i < N; i++) { const s = ENV.reedSpots[i % ENV.reedSpots.length]; const a = rand() * TAU, r = rr(.5, 4); pp[i * 3] = s[0] + Math.cos(a) * r; pp[i * 3 + 1] = rr(.2, 2.2); pp[i * 3 + 2] = s[1] + Math.sin(a) * r; ph[i] = rand() * 100; }
    ff.setAttribute("position", new THREE.BufferAttribute(pp, 3)); ff.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
    const ffM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uA: { value: 0 }, uC: { value: new THREE.Color("#c8ff6a") }, uS: { value: 70 } },
      vertexShader: `attribute float ph; uniform float uT, uS; varying float vA; void main(){ vec3 p = position + vec3(sin(uT * .4 + ph) * .6, sin(uT * .7 + ph * 1.3) * .25, cos(uT * .33 + ph * .7) * .6);
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; vA = pow(max(0., sin(uT * 1.3 + ph * 2.1)), 6.); gl_PointSize = uS * (1. / -mv.z); }`,
      fragmentShader: `uniform vec3 uC; uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(uC * a * a, a * vA * uA); }` });
    W.disposables.push(ff, ffM); const ffp = new THREE.Points(ff, ffM); ffp.frustumCulled = false; site.add(ffp); L.ff = ffM;
    const dust = new THREE.BufferGeometry(), M = 140, dp = new Float32Array(M * 3), dph = new Float32Array(M);
    for (let i = 0; i < M; i++) { const a = rand() * TAU, r = Math.sqrt(rand()) * 3.2; dp[i * 3] = Math.cos(a) * r; dp[i * 3 + 1] = rr(.3, 2.6); dp[i * 3 + 2] = Math.sin(a) * r; dph[i] = rand() * 100; }
    dust.setAttribute("position", new THREE.BufferAttribute(dp, 3)); dust.setAttribute("ph", new THREE.BufferAttribute(dph, 1));
    const dM = ffM.clone(); dM.uniforms = { uT: ffM.uniforms.uT, uA: { value: .5 }, uC: { value: new THREE.Color("#ffd98a") }, uS: { value: 26 } }; W.disposables.push(dust, dM);
    /* hullócsillag: hosszú, elvékonyodó fénycsík */
    const st = canvasTex(256, 16, (gg, w, h) => { const gr = gg.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.85, "rgba(220,235,255,.8)"); gr.addColorStop(1, "rgba(255,255,255,1)"); gg.fillStyle = gr; gg.fillRect(0, 6, w, 4); });
    L.star = mesh(new THREE.PlaneGeometry(70, 2.2), basic({ map: st, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }), ENV.env); L.star.visible = false; L.star.renderOrder = -15;
    /* reggeli pára: lágy, áttetsző sávok a víz fölött */
    const mt = canvasTex(512, 128, (gg, w, h) => { for (let k = 0; k < 60; k++) { const x = rand() * w, y = h * rr(.3, .7), r = rr(30, 90); const gr = gg.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); gg.fillStyle = gr; gg.fillRect(x - r, y - r, 2 * r, 2 * r); } });
    L.mist = [];
    for (let k = 0; k < 10; k++) { const a = rr(-1.6, 1.6), d = rr(25, 140); const m = mesh(new THREE.PlaneGeometry(rr(60, 120), rr(4, 8)), basic({ map: mt, transparent: true, depthWrite: false, opacity: 0, fog: false }), site);
      m.position.set(Math.sin(a) * d, WATER_Y + rr(.6, 2.2), -Math.cos(a) * d); m.lookAt(0, m.position.y, 0); m.renderOrder = 3; m.visible = false; L.mist.push(m); }
    const dpp = new THREE.Points(dust, dM); dpp.frustumCulled = false; site.add(dpp); L.dust = dM;
  }
  const _v3a = new THREE.Vector3(), _v3b = new THREE.Vector3();
  function lifeTick(dt) {
    const L = ENV.life; if (!L) return; const t = W.t;
    L.swans.forEach((s) => { s.a += s.sp * dt; const x = s.cx + Math.cos(s.a) * s.r, z = s.cz + Math.sin(s.a) * s.r * .8;
      s.g.position.set(x, WATER_Y - .02 + Math.sin(t * 1.3 + s.ph) * .02, z); s.g.rotation.y = Math.atan2(-Math.sin(s.a) * s.sp, -(Math.cos(s.a) * s.sp * .8)) + Math.PI;
      s.g.rotation.z = Math.sin(t * 1.1 + s.ph) * .03; });
    L.ducks.forEach((d) => { d.a += dt * .09 * (d.i % 2 ? 1 : -1); const c = ENV.reedSpots[d.i % ENV.reedSpots.length]; const x = c[0] + Math.cos(d.a) * 3.2 + Math.sin(t * .3 + d.ph) * .6, z = c[1] + Math.sin(d.a) * 3.2;
      d.g.position.set(x, WATER_Y + .01 + Math.sin(t * 2 + d.ph) * .015, z); d.g.rotation.y = -d.a + (d.i % 2 ? 0 : Math.PI); });
    /* vitorlások: útpontról útpontra, széllel */
    const WF = 315 * D2R;
    L.boats.forEach((o) => {
      if (!o.wp || Math.hypot(o.wp[0] - o.x, o.wp[1] - o.z) < 30) o.wp = o.near ? [rr(-160, 160), rr(-220, -70)] : [rr(-900, 700), rr(-1300, -200)];
      let want = Math.atan2(o.wp[0] - o.x, -(o.wp[1] - o.z)); const tw = wrapA(WF - want); if (Math.abs(tw) < 46 * D2R) want = WF - Math.sign(tw || 1) * 46 * D2R;
      o.b += clamp(wrapA(want - o.b), -.15 * dt, .15 * dt); const t2 = Math.abs(wrapA(WF - o.b)) * R2D; o.v += ((t2 < 40 ? 1 : 3.2) - o.v) * dt / 8;
      const fx = Math.sin(o.b), fz = -Math.cos(o.b); o.x += fx * o.v * dt; o.z += fz * o.v * dt;
      o.g.position.set(o.x, WATER_Y + Math.sin(t * 1.4 + o.ph) * .05, o.z); o.g.rotation.y = Math.atan2(fx, fz);
      if (o.far) { o.g.rotation.y += Math.PI; o.g.rotation.z = Math.sin(t * .8 + o.ph) * .05 + .12 * (wrapA(WF - o.b) > 0 ? 1 : -1); o.g.userData.sail.rotation.y = clamp((t2 - 30) * .012, .1, 1.2) * (wrapA(WF - o.b) > 0 ? -1 : 1); return; }
      const OS = o.g.userData.S, yaw = o.g.rotation.y, X = [Math.cos(yaw), -Math.sin(yaw)], wf = [Math.sin(WF), -Math.cos(WF)];
      OS.side = (wf[0] * X[0] + wf[1] * X[1]) > 0 ? -1 : 1; OS.boom = clamp((t2 - 28) * .78, 7, 82) * D2R * OS.side; OS.jib = clamp((t2 - 28) * .55, 8, 52) * D2R; OS.luff = clamp(1 - (t2 - 18) / 18, 0, 1);
      OS.heel = -OS.side * clamp(Math.sin(t2 * D2R) ** 1.4 * 16, 0, 20) * D2R; OS.pitch = Math.sin(t * 1.2 + o.ph) * .025;
      o.g.userData.update(dt); o.wk.push(o.x, o.z, o.g.rotation.y, o.v, dt, WATER_Y + .05);
    });
    L.ferry.tick(dt); L.ferry.g.position.y += WATER_Y;
    L.hornT = (L.hornT == null ? rr(30, 70) : L.hornT) - dt; if (L.hornT < 0) { L.hornT = rr(70, 140); try { const a = T.ac(); if (a) horn(1.6, .035); } catch (e) {} }
    /* hullócsillag éjjel */
    if ((ENV.night || 0) > .6) { L.starT = (L.starT == null ? 6 : L.starT) - dt;
      if (L.starT < 0 && !L.star.visible) { L.starT = rr(9, 22); const a = rr(-2.4, 2.4), e = rr(25, 55) * D2R, R = 900; L.star.position.set(Math.sin(a) * Math.cos(e) * R, Math.sin(e) * R, -Math.cos(a) * Math.cos(e) * R); L.star.lookAt(0, 0, 0); L.star.rotateZ(rr(-1, 1)); L.star.visible = true; L.star.userData.t = 0; } }
    if (L.star.visible) { const u = (L.star.userData.t += dt); L.star.translateX(dt * 260); L.star.material.opacity = Math.sin(Math.min(1, u / .9) * Math.PI); if (u > .9) L.star.visible = false; }
    /* reggeli pára a víz fölött (hajnalban, kora reggel) */
    const hr = ENV.sunInfo ? ENV.sunInfo.el : 30, morning = (ENV.morning || 0);
    L.mist.forEach((m, i) => { m.material.opacity = morning * .35 * (.7 + .3 * Math.sin(t * .1 + i)); m.visible = morning > .01; m.position.x += Math.sin(t * .05 + i) * dt * .3; });
    L.gulls.tick(dt, 0, -10);
    /* hal kiugrik, gyűrűk a vízen */
    L.fish.forEach((f) => {
      f.t -= dt;
      if (!f.on && f.t < 0) { f.on = true; f.u = 0; const a = rr(-2.2, 2.2), r = rr(8, 26); f.x = Math.sin(a) * r; f.z = -Math.cos(a) * r; f.d = rr(0, TAU); f.g.visible = true; ringAt(f.x, f.z); }
      if (f.on) { f.u += dt * 1.6; const u = f.u; f.g.position.set(f.x + Math.cos(f.d) * u * .9, WATER_Y + Math.sin(Math.min(u, 1) * Math.PI) * .55, f.z + Math.sin(f.d) * u * .9);
        f.g.rotation.set(-(Math.cos(Math.min(u, 1) * Math.PI)) * 1.1, -f.d + Math.PI / 2, 0);
        if (u >= 1) { f.on = false; f.g.visible = false; f.t = rr(4, 14); ringAt(f.g.position.x, f.g.position.z); try { plop(); } catch (e) {} } }
    });
    L.splash.forEach((s) => { s.t += dt; if (s.t > 3) { s.m.visible = false; return; } s.m.visible = true; const k = .15 + s.t * .7; s.m.scale.set(k, k, k); s.m.material.opacity = (1 - s.t / 3) * .45; });
    /* szitakötők: cikázás a nádas fölött (nappal) */
    const day = ENV.dayK || 0;
    L.drag.forEach((d) => { d.g.visible = day > .3; if (!d.g.visible) return; d.t -= dt;
      if (d.t < 0) { d.t = rr(.5, 2.2); d.tgt.set(d.home.x + rr(-2.5, 2.5), rr(.4, 1.4), d.home.z + rr(-2.5, 2.5)); }
      _v3a.subVectors(d.tgt, d.p); const L2 = _v3a.length(); if (L2 > .02) { d.p.addScaledVector(_v3a.normalize(), Math.min(L2, dt * 2.6)); d.g.rotation.y = Math.atan2(-_v3a.x, -_v3a.z); }
      d.g.position.copy(d.p).y += Math.sin(t * 9 + d.home.x) * .01;
      d.g.userData.w.forEach((w, i) => { w.rotation.z = Math.sin(t * 60 + i) * .5 * (i % 2 ? 1 : -1); }); });
    L.bfly.forEach((b) => { b.g.visible = day > .4; if (!b.g.visible) return; b.t += dt; const lv = ENV.lavender; if (Math.floor(b.t / 3.2) !== b.k) { b.k = Math.floor(b.t / 3.2); b.to = lv[(b.k * 53 + b.i * 97) % lv.length]; }
      if (b.to) { _v3a.copy(b.to).y += .12 + Math.abs(Math.sin(b.t * 2)) * .3; b.p.lerp(_v3a, Math.min(1, dt * .9)); }
      b.g.position.copy(b.p).y += Math.sin(b.t * 7) * .03; b.g.rotation.y = Math.sin(b.t * .7) * 2;
      const f = Math.sin(b.t * 18) * 1.1; b.g.userData.w[0].rotation.z = f; b.g.userData.w[1].rotation.z = -f; });
    L.ff.uniforms.uT.value = t; L.ff.uniforms.uA.value = clamp(1 - day * 1.6, 0, 1);
    L.dust.uniforms.uA.value = .25 + (1 - day) * .45 + (ENV.gold || 0) * .4;
  }
  function ringAt(x, z) { const L = ENV.life; const s = L.splash.reduce((a, b) => (b.t > a.t ? b : a)); s.t = 0; s.m.position.set(x, WATER_Y + .04, z); }

  /* ===================================================================================== HANGOK: madarak, tücskök, csobbanás */
  function chirp() {
    const a = T.ac(); if (!a) return; const t0 = a.currentTime, n = 2 + (rand() * 4 | 0), base = rr(2600, 4200), pan = a.createStereoPanner ? a.createStereoPanner() : null;
    const out = a.createGain(); out.gain.value = .022; if (pan) { pan.pan.value = rr(-.9, .9); out.connect(pan).connect(T.outBus()); } else out.connect(T.outBus());
    for (let k = 0; k < n; k++) { const o = a.createOscillator(), g = a.createGain(), t = t0 + k * rr(.08, .16); o.type = "sine";
      o.frequency.setValueAtTime(base * rr(.9, 1.1), t); o.frequency.exponentialRampToValueAtTime(base * rr(1.2, 1.6), t + .05); o.frequency.exponentialRampToValueAtTime(base * rr(.7, .9), t + .09);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(g).connect(out); o.start(t); o.stop(t + .12); }
  }
  function gullCall() {
    const a = T.ac(); if (!a) return; const t0 = a.currentTime, out = a.createGain(); out.gain.value = .02; const lp = a.createBiquadFilter(); lp.type = "bandpass"; lp.frequency.value = 1400; lp.Q.value = 1.4;
    out.connect(T.outBus());
    for (let k = 0; k < 3; k++) { const o = a.createOscillator(), g = a.createGain(), t = t0 + k * .28; o.type = "sawtooth";
      o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(820, t + .24);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.connect(g).connect(lp); o.start(t); o.stop(t + .27); }
    lp.connect(out);
  }
  function cricket() {
    const a = T.ac(); if (!a) return; const t0 = a.currentTime, out = a.createGain(); out.gain.value = .008; out.connect(T.outBus());
    const f = rr(4300, 4900);
    for (let k = 0; k < 4; k++) { const o = a.createOscillator(), g = a.createGain(), t = t0 + k * .09; o.type = "square"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .005); g.gain.setValueAtTime(1, t + .04); g.gain.linearRampToValueAtTime(0, t + .05); o.connect(g).connect(out); o.start(t); o.stop(t + .06); }
  }
  function plop() {
    const a = T.ac(); if (!a) return; const t0 = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.type = "sine";
    o.frequency.setValueAtTime(900, t0); o.frequency.exponentialRampToValueAtTime(260, t0 + .12); g.gain.setValueAtTime(.06, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + .18); o.connect(g).connect(T.outBus()); o.start(t0); o.stop(t0 + .2);
  }
  function soundTick(dt) {
    ENV.snd = ENV.snd || { b: 2, g: 6, c: 1 };
    const S = ENV.snd, day = ENV.dayK || 0;
    S.b -= dt; S.g -= dt; S.c -= dt;
    if (S.b < 0) { S.b = rr(1.5, 6); if (day > .35) chirp(); }
    if (S.g < 0) { S.g = rr(8, 22); if (day > .4) gullCall(); }
    if (S.c < 0) { S.c = rr(.25, .9); if (day < .3) cricket(); }
  }

  /* ===================================================================================== ÖSSZERAKÁS + NAPSZAK */
  function buildMagicWorld(root, floorY) {
    const env = new THREE.Group(); root.add(env); ENV.env = env;
    const site = new THREE.Group(); env.add(site); ENV.site = site; site.rotation.y = 15 * D2R;   /* −z = 345° (a ház tengelye, a tó felé) */
    ENV.glows = [];
    ENV.sky = makeMagicSky(env);
    ENV.pano = makePanorama(env);
    ENV.trees = makeTreeline(env);
    ENV.lmk = makeLandmarks(env);
    ENV.water = makeWater(env, { sun: new THREE.Vector3(0, .3, -1).normalize(), rmax: 2400, rings: 84, seg: 128 }); ENV.water.position.y = WATER_Y;
    buildMagicDeck(site);
    const keep = ENV.glows; buildShore(site); ENV.glows = keep.concat(ENV.glows.filter((q) => !keep.includes(q)));
    buildLife(site);
    /* fények */
    const sun = new THREE.DirectionalLight(0xffffff, 1.2), hemi = new THREE.HemisphereLight(0xcfe0f0, 0x46503a, .6), amb = new THREE.AmbientLight(0xffffff, .05);
    root.add(sun, hemi, amb); sun.target = new THREE.Object3D(); root.add(sun.target);
    const lamp = new THREE.PointLight(0xffb866, 0, 9, 1.6); site.add(lamp); lamp.position.set(0, 2.3, 0);
    ENV.lights = { sun, hemi, amb, lamp };
    ENV.floorY = floorY;
    return ENV;
  }
  /* napszak beállítása: dátum + óra → minden szín, fény, éjszakai fények */
  function envSetTime(ymd, hour, force) {
    let p = { az: 230, el: 30 }; try { if (T.sunPos) p = T.sunPos(ymd, hour); } catch (e) {}
    ENV.sunInfo = p;
    const s = skyAt(p.el), day = smooth(clamp((p.el + 4) / 12, 0, 1)), night = 1 - smooth(clamp((p.el + 9) / 8, 0, 1)), gold = smooth(clamp((p.el + 2) / 5, 0, 1)) * (1 - smooth(clamp((p.el - 8) / 14, 0, 1)));
    ENV.dayK = day; ENV.night = night; ENV.gold = gold;
    ENV.morning = hour < 11 ? smooth(clamp((p.el + 4) / 4, 0, 1)) * (1 - smooth(clamp((p.el - 6) / 14, 0, 1))) : 0;
    const sd = dirFromAzEl(p.az, p.el), sdC = dirFromAzEl(p.az, Math.max(p.el, -3));
    /* a hold: a nappal ellentétes égrészen, kb. 25° magasan (egyszerűsítve) */
    const md = dirFromAzEl((p.az + 160) % 360, 28);
    const U = ENV.sky.userData.U; U.uSun.value.copy(sdC); U.uMoon.value.copy(md); U.uZen.value.copy(s.zen); U.uHor.value.copy(s.hor); U.uGlow.value.copy(s.glow); U.uSunC.value.copy(s.sunC.clone().lerp(new THREE.Color(1, .98, .9), day * .6)); U.uDay.value = day; U.uNight.value = night;
    /* víz */
    const wu = ENV.water.userData.mat.uniforms; wu.uSun.value.copy(p.el > -2 ? sdC : md); wu.uSkyH.value.copy(s.hor); wu.uSkyZ.value.copy(s.zen.clone().lerp(s.hor, .25));
    wu.uHaze.value.copy(s.hor).lerp(s.zen, .08); wu.uSunC.value.copy(p.el > -2 ? s.glow.clone().multiplyScalar(1.1) : new THREE.Color(.55, .6, .75)); wu.uSpec.value = p.el > -2 ? 1 : .35;
    const lt = .06 + .94 * day; wu.uLight.value = lt;
    /* a Balaton tejes-türkiz vize; aranyórában a lemenő nap színét veszi fel */
    wu.uDeep.value.set("#1f6763").lerp(s.hor, gold * .3); wu.uShallow.value.set("#5aa597").lerp(s.hor, gold * .35);
    wu.uSkyZ.value.copy(s.zen).lerp(s.hor, .35 + gold * .3);
    /* panoráma és fasor */
    const pu = ENV.pano.userData.U; pu.uHaze.value.copy(s.hor).lerp(s.zen, .15);
    pu.uNear.value.set("#365638").lerp(new THREE.Color("#3a2e3e"), gold * .65).lerp(new THREE.Color("#070b14"), night * .9);
    pu.uFar.value.set("#7d95aa").lerp(new THREE.Color("#8a6e86"), gold * .6).lerp(new THREE.Color("#0b1222"), night * .9);
    pu.uLight.value = .25 + .75 * day; pu.uNight.value = night;
    ENV.trees.userData.mat.color.setRGB(.25 + .75 * day, .25 + .72 * day, .3 + .7 * day).lerp(new THREE.Color("#c98a6a"), gold * .25);
    ENV.lmk.forEach((m) => m.color.setRGB(.22 + .7 * day, .22 + .68 * day, .26 + .66 * day).lerp(s.hor, .25).lerp(new THREE.Color("#ffb080"), gold * .25));
    /* fények */
    const L = ENV.lights;
    const sw = dirFromAzEl(p.az, Math.max(p.el, 2)).applyQuaternion(ENV.env.quaternion);
    L.sunDirW = p.el > -1 ? sw : dirFromAzEl((p.az + 160) % 360, 28).applyQuaternion(ENV.env.quaternion);
    L.sun.color.copy(p.el > -1 ? s.sunC : new THREE.Color(.55, .62, .85)); L.sun.intensity = p.el > -1 ? s.sunI : .28 * night;
    L.hemi.color.copy(s.zen).lerp(s.hor, .5).lerp(new THREE.Color(1, 1, 1), .35 * day); L.hemi.groundColor.set("#3d4a32").multiplyScalar(.3 + .7 * day); L.hemi.intensity = s.hemiI + .05;
    L.amb.intensity = .04 + .05 * night;
    const evening = clamp(1 - day * 1.25, 0, 1); ENV.evening = evening;
    L.lamp.intensity = evening * 2.2;
    /* a környezeti tükröződés (üveg, fém, víz nélkül) a napszak színeivel – este és éjjel gyengébben */
    envPMREM(s, day, force);
    try { T.sceneEl.object3D.environmentIntensity = .18 + .82 * day; } catch (e) {}
  }
  let _pmT = 0;
  function envPMREM(s, day, force) {
    const now = performance.now(); if (!force && now - _pmT < 600 && ENV.envMap) return; _pmT = now;
    try {
      const r = T.sceneEl.renderer; const cv = document.createElement("canvas"); cv.width = 128; cv.height = 64; const g = cv.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, 64); const hx = (c) => "#" + c.clone().convertLinearToSRGB().getHexString();
      gr.addColorStop(0, hx(s.zen)); gr.addColorStop(.48, hx(s.hor)); gr.addColorStop(.52, hx(new THREE.Color("#4a5a40").multiplyScalar(.3 + .7 * day))); gr.addColorStop(1, hx(new THREE.Color("#2b2a22").multiplyScalar(.3 + .7 * day)));
      g.fillStyle = gr; g.fillRect(0, 0, 128, 64);
      const t = new THREE.CanvasTexture(cv); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
      if (!ENV.pmrem) ENV.pmrem = new THREE.PMREMGenerator(r);
      const rt = ENV.pmrem.fromEquirectangular(t); t.dispose();
      if (ENV.envRT) ENV.envRT.dispose(); ENV.envRT = rt; ENV.envMap = rt.texture;
      T.sceneEl.object3D.environment = rt.texture;
    } catch (e) {}
  }
  function envTick(dt, camW) {
    ENV.wt.value += dt;
    const U = ENV.sky.userData.U; U.uT.value = W.t; ENV.pano.userData.U.uT.value = W.t;
    const wm = ENV.water.userData.mat; wm.uniforms.uT.value = W.t; wm.uniforms.uWind.value = WIND_DIR;
    if (camW) { const cl = ENV.env.worldToLocal(_v3b.copy(camW)); cl.y -= WATER_Y; wm.uniforms.uCam.value.copy(cl); }
    /* lámpák pislákolása, fényfüzér */
    const ev = ENV.evening || 0;
    (ENV.glows || []).forEach((q, i) => { let k = q.k * ev; if (q.flick) k *= .85 + .15 * Math.sin(W.t * 11 + i) * Math.sin(W.t * 7.3); if (q.tw) k *= .9 + .1 * Math.sin(W.t * 2 + i); q.mat.emissiveIntensity = k; });
    (ENV.halos || []).forEach((q) => { q.m.uniforms.uA.value = ev * q.k; q.m.uniforms.uT.value = W.t; });
    if (ENV.lights.lamp) ENV.lights.lamp.intensity = ev * 2.2 * (.92 + .08 * Math.sin(W.t * 9) * Math.sin(W.t * 5.1));
    lifeTick(dt); soundTick(dt);
  }
  function envDispose() { try { if (ENV.envRT) ENV.envRT.dispose(); if (ENV.pmrem) ENV.pmrem.dispose(); } catch (e) {} ENV.envRT = null; ENV.pmrem = null; ENV.envMap = null; ENV.life = null; ENV.snd = null; ENV.halos = null; Object.keys(TX).forEach((k) => delete TX[k]); Object.keys(HX).forEach((k) => delete HX[k]); }
