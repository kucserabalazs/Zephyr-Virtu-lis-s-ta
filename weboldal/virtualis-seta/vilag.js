/* =====================================================================================================
   Zephyr Apartmanház – VIRTUÁLIS VILÁG (vilag.js)
   1. Regatta a napozóstégnél (a stég valódi panorámája előtt 3D vitorlásverseny)
   2. Vitorlázás a Zephyrrel (Raptor 27, piros génua – Tihany, Badacsony, Balaton-felvidék a láthatáron)
   3. A ház makettje (alaprajzok szerint; rámutatva belépés a lakás panorámájába)
   Kézkövetéssel (Meta Quest 2): mutatás + csippentés; kontrollerrel a ravasz; 2D-ben egér / ujj / billentyű.
   Joystick sehol sem kell. A séta (index.html) tölti be, amikor először megnyitják.
   ===================================================================================================== */
(function () {
  "use strict";
  const T = window.ZephyrTour; if (!T || window.ZephyrWorld) return;
  const THREE = T.THREE;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const smooth = (k) => k * k * (3 - 2 * k);
  const rand = (() => { let s = 20261102; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const rr = (a, b) => a + (b - a) * rand();

  const W = { active: false, kind: null, root: null, objs: [], disposables: [], upd: [], hud: null, panel: null, t: 0, scale: 1 };
  window.ZephyrWorld = W;

  /* ------------------------------------------------------------------ segédek: anyagok, geometriák */
  const std = (o) => { const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: .6, metalness: 0 }, o)); W.disposables.push(m); return m; };
  const basic = (o) => { const m = new THREE.MeshBasicMaterial(o); W.disposables.push(m); return m; };
  const sprM = (o) => { const m = new THREE.SpriteMaterial(o); W.disposables.push(m); return m; };   /* Sprite-hoz: így fordul a néző felé */
  const mesh = (g, m, parent) => { const x = new THREE.Mesh(g, m); W.disposables.push(g); if (parent) parent.add(x); return x; };
  function canvasTex(w, h, draw, opt) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (opt && opt.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opt.repeat[0], opt.repeat[1]); }
    W.disposables.push(t); t._canvas = c; return t;
  }
  /* geometriák összevonása anyagonként (kevesebb rajzolási hívás – Questen ez számít) */
  function mergeGeoms(list) {
    let n = 0; const parts = list.map(([g, m]) => { let q = g.index ? g.toNonIndexed() : g.clone(); q.applyMatrix4(m); if (!q.attributes.normal) q.computeVertexNormals(); n += q.attributes.position.count; return q; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), hasUV = parts.every((q) => q.attributes.uv), uv = hasUV ? new Float32Array(n * 2) : null;
    const hasC = parts.some((q) => q.attributes.color), col = hasC ? new Float32Array(n * 3) : null;
    let o = 0;
    parts.forEach((q) => {
      const c = q.attributes.position.count;
      pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3);
      if (uv) uv.set(q.attributes.uv.array, o * 2);
      if (col) { if (q.attributes.color) col.set(q.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + c) * 3); }
      o += c; q.dispose();
    });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    if (uv) g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); if (col) g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    W.disposables.push(g); return g;
  }
  const M4 = (x, y, z, ry, rx, rz, sx, sy, sz) => { const m = new THREE.Matrix4(); m.compose(new THREE.Vector3(x || 0, y || 0, z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, "YXZ")), new THREE.Vector3(sx || 1, sy || 1, sz || 1)); return m; };
  /* henger két pont között (kötélzet, korlát, árbóc) */
  function rodBetween(a, b, r, mat, parent, seg) {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length();
    const g = new THREE.CylinderGeometry(r, r, L, seg || 6, 1, true); g.translate(0, L / 2, 0);
    const m = mesh(g, mat, parent); m.position.copy(a); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
  }
  function rodGeom(a, b, r, seg) {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length();
    const g = new THREE.CylinderGeometry(r, r, L, seg || 6, 1, false); g.translate(0, L / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    return [g, new THREE.Matrix4().compose(a.clone(), q, new THREE.Vector3(1, 1, 1))];
  }
  /* felirat-tábla (sprite): mindig felénk néz */
  function labelSprite(lines, opt) {
    opt = opt || {};
    const fs = opt.fs || 54, pad = 26, w = opt.w || 760, n = Math.max(2, lines.length);
    const h = pad * 2 + n * fs * 1.25;
    const draw = (g, L) => {
      g.clearRect(0, 0, w, Math.ceil(h));
      g.fillStyle = opt.bg || "rgba(9,34,70,.9)"; g.beginPath(); g.roundRect ? g.roundRect(4, 4, w - 8, h - 8, 34) : g.rect(4, 4, w - 8, h - 8); g.fill();
      g.lineWidth = 6; g.strokeStyle = opt.edge || "#ffd166"; g.stroke();
      L.forEach((ln, i) => { g.fillStyle = i === 0 ? (opt.c0 || "#ffd166") : "#fff"; g.font = `${i === 0 ? 800 : 600} ${i === 0 ? fs : fs * .78}px system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ln, w / 2, pad + fs * .62 + i * fs * 1.25); });
    };
    const t = canvasTex(w, Math.ceil(h), (g) => draw(g, lines));
    const sm = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }); W.disposables.push(sm);
    const sp = new THREE.Sprite(sm);   /* SpriteMaterial: mindig a néző felé fordul (a MeshBasicMaterial-lal csak egy irányból látszott – a hajóra tett táblák egyáltalán nem) */
    sp.renderOrder = 990; const k = opt.size || 1; sp.scale.set(k, k * h / w, 1);
    let last = lines.join("|");
    sp.userData.set = (L) => { const key = L.join("|"); if (key === last) return; last = key; draw(t._canvas.getContext("2d"), L); t.needsUpdate = true; };
    return sp;
  }

  /* ------------------------------------------------------------------ hangok */
  const AU = { nodes: [] };
  function audioStart(spec) {
    const a = T.ac(); if (!a) return; const out = T.outBus();
    const noise = (sec) => { const s = a.createBufferSource(); s.buffer = T.noiseBuf(sec || 4); s.loop = true; return s; };
    const mk = (kind) => {
      const n = noise(5); const f = a.createBiquadFilter(); const g = a.createGain(); g.gain.value = 0;
      if (kind === "water") { f.type = "lowpass"; f.frequency.value = 700; }
      if (kind === "rush") { f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = .7; }
      if (kind === "wind") { f.type = "bandpass"; f.frequency.value = 600; f.Q.value = .5; }
      n.connect(f).connect(g).connect(out); n.start(); const o = { n, f, g }; AU.nodes.push(o); return o;
    };
    AU.water = mk("water"); AU.rush = mk("rush"); AU.wind = mk("wind");
    AU.set = (k, v, tc) => { const o = AU[k]; if (o) o.g.gain.setTargetAtTime(v, a.currentTime, tc || .3); };
    AU.set("water", spec.water || .03, 1); AU.set("wind", spec.wind || .02, 1);
  }
  function audioStop() {
    const a = T.ac(); AU.nodes.forEach((o) => { try { o.g.gain.setTargetAtTime(0, a.currentTime, .25); setTimeout(() => { try { o.n.stop(); } catch (e) {} }, 1200); } catch (e) {} });
    AU.nodes = []; AU.water = AU.rush = AU.wind = null; AU.set = () => {};
  }
  AU.set = () => {};
  /* hajókürt (rajtjelzés): két hangolt fűrészfog, enyhe torzítással, távolság szerint halkítva */
  function horn(dur, vol) {
    const a = T.ac(); if (!a) return; const t0 = a.currentTime, g = a.createGain(), lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime((vol || .25), t0 + .06); g.gain.setValueAtTime(vol || .25, t0 + dur - .15); g.gain.linearRampToValueAtTime(0, t0 + dur);
    [233, 235.5, 466].forEach((f, i) => { const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; const og = a.createGain(); og.gain.value = i === 2 ? .25 : .5; o.connect(og).connect(lp); o.start(t0); o.stop(t0 + dur + .05); });
    lp.connect(g).connect(T.outBus());
  }
  function flap(vol) {   /* vitorlacsapkodás fordulóban */
    const a = T.ac(); if (!a) return; const t0 = a.currentTime;
    for (let k = 0; k < 6; k++) { const s = a.createBufferSource(); s.buffer = T.noiseBuf(.12); const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 300 + rand() * 300; const g = a.createGain();
      const t = t0 + k * (.11 + rand() * .06); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .12, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + .1); s.connect(f).connect(g).connect(T.outBus()); s.start(t); s.stop(t + .13); }
  }
  function winch() {   /* csörlő kattogása */
    const a = T.ac(); if (!a) return; const t0 = a.currentTime;
    for (let k = 0; k < 9; k++) { const o = a.createOscillator(); o.type = "square"; o.frequency.value = 2400 + rand() * 600; const g = a.createGain(); const t = t0 + k * .07; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.025, t + .003); g.gain.exponentialRampToValueAtTime(.0008, t + .03); o.connect(g).connect(T.outBus()); o.start(t); o.stop(t + .04); }
  }

  /* ------------------------------------------------------------------ ÉGBOLT: színátmenet + nap + gomolyfelhők (előre számolt textúra) */
  const SUN = new THREE.Vector3(-.42, .52, -.74).normalize();   /* délután, nyugat-északnyugat felé – a Balaton fölött */
  function cloudTexture() {
    /* equirect felhőtérkép (fbm zaj), a horizont felé laposodó gomolyfelhőkkel */
    const w = 1024, h = 256;
    return canvasTex(w, h, (g) => {
      const id = g.createImageData(w, h), d = id.data;
      const P = new Uint8Array(512); for (let i = 0; i < 256; i++) P[i] = i; for (let i = 255; i > 0; i--) { const j = (rand() * (i + 1)) | 0; const t = P[i]; P[i] = P[j]; P[j] = t; } for (let i = 0; i < 256; i++) P[i + 256] = P[i];
      const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
      const grad = (hh, x, y) => ((hh & 1) ? -x : x) + ((hh & 2) ? -y : y);
      const noise = (x, y, per) => { const X = Math.floor(x), Y = Math.floor(y); x -= X; y -= Y; const xi = ((X % per) + per) % per, xj = (((X + 1) % per) + per) % per, yi = Y & 255, yj = (Y + 1) & 255;
        const u = fade(x), v = fade(y), a = P[P[xi] + yi], b = P[P[xj] + yi], c = P[P[xi] + yj], e = P[P[xj] + yj];
        return lerp(lerp(grad(a, x, y), grad(b, x - 1, y), u), lerp(grad(c, x, y - 1), grad(e, x - 1, y - 1), u), v); };
      for (let y = 0; y < h; y++) {
        const el = 1 - y / h;                    /* 1 = zenit, 0 = horizont */
        for (let x = 0; x < w; x++) {
          let f = 0, amp = .55, fr = 1;
          for (let o = 0; o < 5; o++) { f += amp * noise(x / w * 8 * fr, y / h * 2.4 * fr / Math.max(.25, el * 1.4 + .15), 8 * fr); amp *= .5; fr *= 2; }
          let c = clamp((f + .08) * 2.4, 0, 1); c = c * c * (3 - 2 * c);
          c *= clamp(el * 3.2, 0, 1) * clamp((1 - el) * 2.2, 0, 1);   /* a zenit közelében és a horizonton kevesebb */
          const i = (y * w + x) * 4, sh = clamp(.55 + f * .9, .55, 1);
          d[i] = 255 * sh; d[i + 1] = 255 * sh; d[i + 2] = 255 * (sh * .98 + .02); d[i + 3] = 255 * c;
        }
      }
      g.putImageData(id, 0, 0);
    });
  }
  function makeSky(parent) {
    const tex = cloudTexture(); tex.wrapS = THREE.RepeatWrapping;
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uSun: { value: SUN }, uClouds: { value: tex }, uTime: { value: 0 } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
      fragmentShader: `uniform vec3 uSun; uniform sampler2D uClouds; uniform float uTime; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir); float el = clamp(d.y, -1., 1.);
          vec3 zen = vec3(.20,.42,.78), hor = vec3(.78,.87,.93), haze = vec3(.86,.90,.92);
          vec3 col = mix(hor, zen, pow(clamp(el,0.,1.), .55));
          col = mix(col, haze, smoothstep(.08, 0., el));
          float s = max(dot(d, uSun), 0.);
          col += vec3(1.,.93,.78) * (pow(s, 900.) * 6. + pow(s, 40.) * .22 + pow(s, 6.) * .08);
          if (el > 0.) {
            float u = atan(d.x, -d.z) / 6.2831853 + .5 + uTime * .0006, v = 1. - clamp(el / .62, 0., 1.);
            vec4 c = texture2D(uClouds, vec2(u, clamp(v, 0.02, .98)));
            vec3 cc = mix(vec3(.72,.76,.82), vec3(1.), c.r) + vec3(1.,.9,.75) * pow(s, 8.) * .35;
            col = mix(col, cc, c.a * smoothstep(0., .05, el) * .92);
          } else col = mix(haze, vec3(.42,.55,.58), clamp(-el * 4., 0., 1.));
          gl_FragColor = vec4(col, 1.);
          #include <colorspace_fragment>
        }`
    });
    W.disposables.push(mat);
    const m = mesh(new THREE.SphereGeometry(9000, 48, 24), mat, parent); m.renderOrder = -20; m.frustumCulled = false;
    W.upd.push((dt) => { mat.uniforms.uTime.value += dt; });
    return m;
  }

  /* ------------------------------------------------------------------ FÉNYKÉP-ÉGBOLT (2026-11-11): valódi, 360°-os égfotó a kódból rajzolt ég helyett.
     Forrás: Poly Haven „Kloofendal 48d Partly Cloudy (Pure Sky)”, Greg Zaal – CC0 (szabadon használható). A felső félgömb van meg (img/eg/).
     A nap a képen 47,9° magasan áll; az eget úgy forgatjuk, hogy a nap iránya a régi SUN irányszögével essen egybe.
     Kikapcsolás: localStorage „zephyr-foto-eg” = 0 (akkor a régi, rajzolt ég marad). */
  const FOTO_EG = { u: .5951, el: 47.9 * D2R, hor: [.44, .46, .53], zen: [.20, .34, .62] };
  function makePhotoSky(parent, oldSky, water) {
    try { if (localStorage.getItem("zephyr-foto-eg") === "0") return null; } catch (e) {}
    const az = Math.atan2(SUN.z, SUN.x), ce = Math.cos(FOTO_EG.el);
    const sun = new THREE.Vector3(Math.cos(az) * ce, Math.sin(FOTO_EG.el), Math.sin(az) * ce);
    const phi = FOTO_EG.u * TAU, ry = Math.atan2(Math.sin(phi), -Math.cos(phi)) - az;
    const out = { sun, ry, mesh: null };
    let maxT = 4096; try { maxT = T.scene.renderer.capabilities.maxTextureSize; } catch (e) {}
    const phone = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && !/OculusBrowser|Quest|Pico/i.test(navigator.userAgent);
    const big = maxT >= 8192 && !phone, L = new THREE.TextureLoader();
    L.load("img/eg/" + (big ? "eg-8k.jpg" : "eg-4k.jpg"), (tex) => {
      if (!parent.parent) { tex.dispose(); return; }   /* közben bezárták a világot */
      tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = 4; W.disposables.push(tex);
      const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { map: { value: tex }, uHaze: { value: new THREE.Color(FOTO_EG.hor[0], FOTO_EG.hor[1], FOTO_EG.hor[2]) } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; vec4 p = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
        fragmentShader: `uniform sampler2D map; uniform vec3 uHaze; varying vec2 vUv;
          void main(){ float v = (vUv.y - .5) * 2.; vec3 c = texture2D(map, vec2(vUv.x, clamp(v, .003, .999))).rgb;
            c = mix(uHaze, c, smoothstep(-.002, .03, v)); if (v < 0.) c = mix(uHaze, uHaze * vec3(.62,.74,.78), clamp(-v * 5., 0., 1.));
            gl_FragColor = vec4(c, 1.);
            #include <colorspace_fragment>
          }` });
      W.disposables.push(mat);
      const m = mesh(new THREE.SphereGeometry(9000, 96, 48), mat, parent); m.renderOrder = -20; m.frustumCulled = false; m.rotation.y = ry; out.mesh = m;
      if (oldSky) oldSky.visible = false;
    });
    if (water && water.userData.mat) L.load("img/eg/eg-t.jpg", (tex) => {   /* a víz ugyanazt az eget tükrözi (elmosott, kis kép) */
      if (!parent.parent) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; W.disposables.push(tex);
      const U = water.userData.mat.uniforms; U.uSkyT.value = tex; U.uSkyRot.value.set(Math.cos(ry), Math.sin(ry)); U.uSkyOn.value = 1; U.uSun.value = sun;
      U.uHaze.value = new THREE.Color(FOTO_EG.hor[0], FOTO_EG.hor[1], FOTO_EG.hor[2]); U.uSunC.value = new THREE.Color(1, .97, .9);
      U.uDeep.value = new THREE.Color(.035, .16, .20); U.uShallow.value = new THREE.Color(.10, .33, .34);
    });
    return out;
  }

  /* ------------------------------------------------------------------ VÍZ: Gerstner-hullámok + apró fodrok, Fresnel-tükröződés, napcsillogás, széllökés-foltok */
  const WAVES = [  /* irány (fok, a szél felől), hullámhossz (m), amplitúdó (m), meredekség – Balatoni rövid, „kabbelős” hullámzás */
    [0, 7.5, .13, .55], [24, 4.6, .075, .5], [-31, 3.1, .045, .45], [62, 11, .07, .3], [-70, 2.2, .025, .4]
  ];
  let WIND_DIR = 135 * D2R;   /* a hullámok haladási iránya (radián, x-z síkban) – a szél felől */
  function waveAt(x, z, t) {   /* JS-tükör a hajó ringásához: felszínmagasság */
    let y = 0;
    for (const [a, L, A] of WAVES) { const dir = WIND_DIR + a * D2R, k = TAU / L, c = Math.sqrt(9.81 / k); y += A * Math.sin(k * (Math.cos(dir) * x + Math.sin(dir) * z) - k * c * t); }
    return y;
  }
  function makeWater(parent, opt) {
    opt = opt || {};
    /* poláris háló: középen sűrű (a hajó körül), kifelé ritkul – 1,6 km sugárig */
    const RINGS = Math.max(opt.rings || 0, 140), SEG = Math.max(opt.seg || 0, 240), R0 = .5, RMAX = opt.rmax || 1600;
    const pos = [], idx = [];
    for (let i = 0; i <= RINGS; i++) { const r = i === 0 ? 0 : R0 * Math.pow(RMAX / R0, (i - 1) / (RINGS - 1)); for (let j = 0; j < SEG; j++) { const a = j / SEG * TAU; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
    for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) { const a = i * SEG + j, b = i * SEG + (j + 1) % SEG, c = (i + 1) * SEG + j, d = (i + 1) * SEG + (j + 1) % SEG; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const wv = WAVES.map(([a, L, A, Q]) => new THREE.Vector4(a * D2R, TAU / L, A, Q));
    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,   /* a poláris háló háromszögei lefelé néznek – kétoldalas, hogy felülről is látsszon */
      uniforms: { uT: { value: 0 }, uOff: { value: new THREE.Vector2() }, uWind: { value: WIND_DIR }, uW: { value: wv }, uSun: { value: opt.sun || SUN }, uCam: { value: new THREE.Vector3() }, uGust: { value: new THREE.Vector2(1, 0) },
        /* színek (a makett-világ napszakhoz igazítja őket; az alapértékek a vitorlázás délutánja) */
        uSkyH: { value: new THREE.Color(.70, .80, .87) }, uSkyZ: { value: new THREE.Color(.25, .45, .75) }, uDeep: { value: new THREE.Color(.06, .25, .27) }, uShallow: { value: new THREE.Color(.18, .44, .41) },
        uSunC: { value: new THREE.Color(1, .95, .82) }, uSkyT: { value: null }, uSkyOn: { value: 0 }, uSkyRot: { value: new THREE.Vector2(1, 0) }, uHaze: { value: new THREE.Color(.84, .89, .91) }, uLight: { value: 1 }, uSpec: { value: 1 } },
      vertexShader: `
        uniform float uT, uWind; uniform vec2 uOff; uniform vec4 uW[5];
        varying vec3 vP; varying vec3 vN; varying float vDist; varying vec2 vW;
        void main(){
          vec3 p = position; vec2 w = p.xz + uOff; float fadeD = 1. - smoothstep(60., 420., length(p.xz));
          vec3 disp = vec3(0.); vec3 n = vec3(0.,1.,0.);
          for (int i = 0; i < 5; i++){
            float dir = uWind + uW[i].x, k = uW[i].y, A = uW[i].z * fadeD, Q = uW[i].w, c = sqrt(9.81 / k);
            vec2 D = vec2(cos(dir), sin(dir)); float f = k * dot(D, w) - k * c * uT;
            disp.x += Q * A * D.x * cos(f); disp.z += Q * A * D.y * cos(f); disp.y += A * sin(f);
            n.x -= D.x * k * A * cos(f); n.z -= D.y * k * A * cos(f); n.y -= Q * k * A * sin(f);
          }
          p += disp; vec4 wp = modelMatrix * vec4(p, 1.); vP = vec3(w.x + disp.x, p.y, w.y + disp.z); vN = normalize(n);
          vDist = length(p.xz); vW = w;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform sampler2D uSkyT; uniform float uSkyOn; uniform vec2 uSkyRot; uniform float uT, uWind, uLight, uSpec; uniform vec3 uSun, uCam, uSkyH, uSkyZ, uDeep, uShallow, uSunC, uHaze; uniform vec2 uGust; uniform vec4 uW[5];
        varying vec3 vP; varying vec3 vN; varying float vDist; varying vec2 vW;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*f*(f*(f*6.-15.)+10.); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
        void main(){
          vec2 wd = vec2(cos(uWind), sin(uWind));
          float fadeD = 1. - smoothstep(60., 420., vDist), fa = 1. - smoothstep(25., 240., vDist), fb = 1. - smoothstep(8., 70., vDist);
          /* élsimítás: egy pixel hány métert fed – a pixelnél rövidebb hullámok simán elhalványulnak (nincs moiré, nincs „kockásodás”) */
          float px = length(fwidth(vW)) + 1e-4;
          /* a nagy (Gerstner) hullámok normálisa PIXELENKÉNT számolva – így sima, nem lapos-sokszöges (nem „kockás”) */
          vec3 n = vec3(0., 1., 0.); float crest = 0.;
          for (int i = 0; i < 5; i++){
            float dir = uWind + uW[i].x, k = uW[i].y, A = uW[i].z * fadeD * clamp(1.6 - k * px, 0., 1.), Q = uW[i].w, c = sqrt(9.81 / k);
            vec2 D = vec2(cos(dir), sin(dir)); float f = k * dot(D, vW) - k * c * uT;
            n.x -= D.x * k * A * cos(f); n.z -= D.y * k * A * cos(f); n.y -= Q * k * A * sin(f); crest += A * k * max(0., sin(f));
          }
          /* fodrok: 10 apró, különböző irányú és hosszúságú hullám (analitikus – nincs rácsminta) + egy finomabb réteg közelre */
          vec2 g = vec2(0.);
          for (int i = 0; i < 7; i++){ float fi = float(i); float ang = uWind + (fi - 3.) * .45 + sin(fi * 12.9898) * .25; vec2 D = vec2(cos(ang), sin(ang));
            float k = 2.4 + fi * 1.55 + sin(fi * 7.3) * .4, w = sqrt(9.81 * k), a = .02 / (1. + fi * .32);
            float ph = k * dot(D, vW) - w * uT + fi * 1.913; g += D * (k * a * cos(ph)) * clamp(1.6 - k * px, 0., 1.); }
          vec2 g3 = vec2(0.);
          for (int i = 0; i < 4; i++){ float fi = float(i); float ang = uWind + 1.9 * sin(fi * 2.3 + 1.); vec2 D = vec2(cos(ang), sin(ang)); float k = 14. + fi * 6.5, w = sqrt(9.81 * k), a = .006 / (1. + fi * .4);
            float ph = k * dot(D, vW) - w * uT + fi * 2.7; g3 += D * (k * a * cos(ph)) * clamp(1.6 - k * px, 0., 1.); }
          float gust = smoothstep(.45, .8, vn(vW * .012 - wd * uT * .05 + uGust * 3.));
          n = normalize(n + vec3(-(g.x * fa + g3.x * fb) * (1. + gust * .8), 0., -(g.y * fa + g3.y * fb) * (1. + gust * .8)));
          vec3 P = vec3(vP.x, vP.y, vP.z);
          vec3 view = normalize(uCam - P);
          float ndv = max(dot(n, view), 0.);
          float fres = .02 + .98 * pow(1. - ndv, 5.);
          vec3 refl = reflect(-view, n); float el = clamp(refl.y, 0., 1.);
          vec3 sky = mix(uSkyH, uSkyZ, pow(el, .45));
          if (uSkyOn > .5) { float lx = refl.x * uSkyRot.x - refl.z * uSkyRot.y, lz = refl.x * uSkyRot.y + refl.z * uSkyRot.x; sky = texture2D(uSkyT, vec2(fract(atan(lz, -lx) / 6.2831853), clamp(asin(el) / 1.5708, .02, .98))).rgb * uLight; }
          /* mélységérzet: a hullám hátán világosabb, a völgyben sötétebb; a napfény átsüt a taraj vékony részén (zöldes) */
          vec3 base = mix(uDeep, uShallow, clamp(.35 + crest * 1.6 + n.x * .8, 0., 1.)) * (1. - gust * .16) * uLight;
          float sss = pow(max(dot(view, -uSun), 0.), 4.) * clamp(crest * 3., 0., 1.);
          base += vec3(.05, .16, .12) * sss * uLight;
          vec3 col = mix(base, sky, fres * .75);
          float rs = max(dot(refl, uSun), 0.);
          float sp = pow(rs, 520.) * 9. + pow(rs, 90.) * .55 + pow(rs, 18.) * .06;
          col += uSunC * sp * uSpec * (1. - gust * .3);
          /* hab: a meredek tarajokon és a szél irányában húzódó csíkokban (a közelben részletesebb) */
          float steep = smoothstep(.10, .26, crest);
          float streak = smoothstep(.62, .9, vn(vec2(dot(vW, wd) * .35, dot(vW, vec2(-wd.y, wd.x)) * 2.2) - vec2(uT * .25, 0.)));
          float foam = clamp(steep * (.35 + .65 * streak) * fa + gust * steep * .2, 0., 1.);
          col = mix(col, vec3(.93, .96, .97) * uLight, foam * .55);
          float hz = smoothstep(250., 1550., vDist);
          col = mix(col, uHaze, hz * .85);
          gl_FragColor = vec4(col, 1.);
          #include <colorspace_fragment>


        }`
    });
    W.disposables.push(mat);
    const m = mesh(g, mat, parent); m.frustumCulled = false; m.renderOrder = -5;
    m.userData.mat = mat;
    return m;
  }

  /* ------------------------------------------------------------------ PARTVONALAK: a Balaton körképe Zamárdiból (valós irányok és látószögek) */
  /* irányszög (fok, É=0, K=90), magasság fokban. Távolságok: Tihany ~6 km, Balatonfüred ~9 km, Badacsony ~36 km. */
  function shoreTexture() {
    const w = 4096, h = 256, top = 3.2;   /* a sáv felső széle 3,2° */
    const yOf = (deg) => h - 18 - deg / top * (h - 18);
    return canvasTex(w, h, (g) => {
      const X = (b) => ((b % 360) + 360) % 360 / 360 * w;
      const layer = (pts, fill, edge) => {   /* pts: [irány, magasság] – szakaszonként, áthajlással */
        g.beginPath(); g.moveTo(X(pts[0][0]), h);
        let prev = pts[0][0];
        pts.forEach(([b, e]) => { let x = X(b); if (b < prev) x += w; g.lineTo(x, yOf(e)); prev = b; });
        g.lineTo(X(pts[pts.length - 1][0]) + (pts[pts.length - 1][0] < pts[0][0] ? w : 0), h); g.closePath();
        g.fillStyle = fill; g.fill(); if (edge) { g.strokeStyle = edge; g.lineWidth = 1; g.stroke(); }
      };
      const ns = (b, f) => Math.sin(b * f) * .5 + Math.sin(b * f * 2.7 + 1) * .25 + Math.sin(b * f * 6.1 + 2) * .12;
      /* Badacsony és a tanúhegyek (Gulács, Szent György-hegy, Szigliget) – nagyon messze, kékes pára */
      const far = [[236, .05]];
      for (let b = 237; b <= 266; b += .25) {
        let e = .07 + .03 * ns(b, .9);
        const bump = (c, wd, hh, flat) => { const d = Math.abs(b - c); if (d < wd) e = Math.max(e, hh * (flat ? Math.min(1, (wd - d) / (wd * .28)) : Math.cos(d / wd * Math.PI / 2) ** 1.6)); };
        bump(255.2, 2.4, .40, true);   /* Badacsony – a jellegzetes „koporsó” forma */
        bump(251.4, .9, .27); bump(249.3, 1.0, .30); bump(258.8, .8, .22); bump(261.2, 1.2, .26); bump(246.5, 1.1, .24);
        far.push([b, e]);
      }
      far.push([267, .05]);
      layer(far, "rgba(126,150,176,.78)");
      /* Balaton-felvidék: Tihanytól a Kenesei magaspartig, 8-14 km */
      const north = [[268, .1]];
      for (let b = 268; b <= 425; b += .25) { const bb = b % 360; let e = 1.05 + .35 * ns(b, .07) + .18 * ns(b, .31);
        if (b > 382) e *= clamp(1 - (b - 382) / 45, .25, 1);     /* kelet felé alacsonyodik */
        north.push([bb, e]); }
      north.push([65, .05]);
      layer(north, "rgba(104,128,138,.88)");
      /* Tihanyi-félsziget (közelebb, zöldebb): dombok, az apátság két tornyával */
      const tih = [[289, .05]];
      for (let b = 289; b <= 318; b += .2) { let e = .55 + .38 * Math.exp(-(((b - 300) / 6) ** 2)) + .1 * ns(b, .8); if (b > 312) e *= (318 - b) / 6; tih.push([b, Math.max(.05, e)]); }
      layer(tih, "rgba(78,104,92,.95)");
      /* apátság: fehér templom két toronnyal (303,5°) */
      const ax = X(303.5), ay = yOf(.92);
      g.fillStyle = "rgba(236,232,220,.95)"; g.fillRect(ax - 9, ay - 6, 18, 8); g.fillRect(ax - 9, ay - 16, 4, 12); g.fillRect(ax + 5, ay - 16, 4, 12);
      g.beginPath(); g.moveTo(ax - 10, ay - 16); g.lineTo(ax - 7, ay - 24); g.lineTo(ax - 4, ay - 16); g.moveTo(ax + 4, ay - 16); g.lineTo(ax + 7, ay - 24); g.lineTo(ax + 10, ay - 16); g.fillStyle = "rgba(170,90,70,.9)"; g.fill();
      /* Balatonfüred és a parti települések: apró világos házfoltok */
      for (let k = 0; k < 260; k++) { const b = 318 + rand() * 75, bb = b % 360; const y0 = yOf(.18 + rand() * .3); g.fillStyle = `rgba(${220 + rand() * 30},${215 + rand() * 30},${200 + rand() * 30},.55)`; g.fillRect(X(bb), y0, 2 + rand() * 3, 2); }
      /* déli part: Zamárdi (közel, 1,5 km): fasor, házak, a strand nádasa */
      const south = [[75, .05]];
      for (let b = 75; b <= 287; b += .2) { let e = .42 + .25 * Math.abs(ns(b, 1.7)) + .12 * Math.abs(ns(b, 5.3)); if (b < 95 || b > 270) e *= .55; e *= clamp((b - 75) / 9, .1, 1) * clamp((288 - b) / 9, .1, 1);   /* a két vége lágyan fut ki, nem „levágott sáv” */ south.push([b, e]); }
      south.push([288, .05]);
      layer(south, "rgba(52,80,52,.97)");
      for (let k = 0; k < 340; k++) { const b = 90 + rand() * 180; const e = .12 + rand() * .22; g.fillStyle = rand() < .6 ? `rgba(240,236,226,.85)` : `rgba(180,70,52,.8)`; g.fillRect(X(b), yOf(e), 3 + rand() * 6, 3 + rand() * 4); }
      /* parti nádas sáv */
      { const x0 = X(75), x1 = X(287), gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, "rgba(150,140,82,0)"); gr.addColorStop(.05, "rgba(150,140,82,.9)"); gr.addColorStop(.95, "rgba(150,140,82,.9)"); gr.addColorStop(1, "rgba(150,140,82,0)"); g.fillStyle = gr; g.fillRect(x0, yOf(.07), x1 - x0, yOf(0) - yOf(.07) + 1); }
      /* Siófok felé alacsony part, Kenese magaspart */
      layer([[52, .04], [58, .22], [66, .26], [74, .12], [76, .04]], "rgba(140,150,140,.8)");
    });
  }
  function makeShores(parent) {
    const R = 5200, top = 3.2 * D2R, h = R * Math.tan(top);
    const g = new THREE.CylinderGeometry(R, R, h + 30, 256, 1, true); g.translate(0, h / 2 - 15, 0);
    /* a henger u=0 a +x irányban; az irányszög (É=-z, K=+x) igazítása */
    const tex = shoreTexture();
    const mat = basic({ map: tex, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false });
    const m = mesh(g, mat, parent); m.renderOrder = -10;
    /* CylinderGeometry: u=0 a -z tengelynél (θ=0 → x=sin, z=cos)… a beállítást mérés alapján: É (b=0) → -z */
    m.rotation.y = Math.PI;
    m.scale.x = -1;   /* belülről nézve ne legyen tükrös */
    return m;
  }

  /* ------------------------------------------------------------------ TEXTÚRÁK a hajóhoz */
  const TEXC = {};
  function teakTex() {
    return TEXC.teak || (TEXC.teak = canvasTex(512, 512, (g, w, h) => {
      for (let i = 0; i < 12; i++) {
        const y = i * h / 12, c = 120 + rand() * 30;
        g.fillStyle = `rgb(${c + 40},${c - 5},${c - 50})`; g.fillRect(0, y, w, h / 12);
        for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(70,40,15,${.08 + rand() * .12})`; g.lineWidth = .8 + rand(); g.beginPath(); const yy = y + rand() * h / 12; g.moveTo(0, yy); g.bezierCurveTo(w * .3, yy + rr(-3, 3), w * .6, yy + rr(-3, 3), w, yy + rr(-2, 2)); g.stroke(); }
        g.fillStyle = "#1c140c"; g.fillRect(0, y + h / 12 - 4, w, 4);   /* fekete tömítőcsík a deszkák között */
      }
    }, { repeat: [1, 1] }));
  }
  function nonslipTex() {
    return TEXC.ns || (TEXC.ns = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#e9eaea"; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(150,155,160,.35)";
      for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < w; x += 8) { g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + 4, y); g.lineTo(x + 8, y + 4); g.lineTo(x + 4, y + 8); g.fill(); }
    }, { repeat: [6, 6] }));
  }
  function sailTex(o) {
    const key = "s" + o.num + o.main;
    return TEXC[key] || (TEXC[key] = canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = o.main; g.fillRect(0, 0, w, h);
      /* vízszintes panelvarratok, finom szövet */
      for (let k = 1; k < 14; k++) { g.strokeStyle = "rgba(0,0,0,.09)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, k * h / 14); g.lineTo(w, k * h / 14 + 6); g.stroke(); }
      for (let k = 0; k < 2200; k++) { g.fillStyle = `rgba(0,0,0,${rand() * .025})`; g.fillRect(rand() * w, rand() * h, 2, 2); }
      /* lécek (battens) */
      g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 7; [.24, .46, .66, .84].forEach((v) => { g.beginPath(); g.moveTo(w * .55, h * (1 - v)); g.lineTo(w, h * (1 - v) + 4); g.stroke(); });
      /* vitorlaszám és osztályjel */
      g.fillStyle = o.numCol || "#1b2c5e"; g.font = "900 120px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(o.num, w * .48, h * .40);
      if (o.logo) { g.font = "900 72px Georgia, serif"; g.fillStyle = /^#(d|e|c)[0-9a-f]1|^#d61f26/i.test(o.main) ? "#ffffff" : "#c62828"; g.fillText(o.logo, w * .48, h * .58); }
      g.font = "800 64px system-ui"; g.fillStyle = o.numCol || "#1b2c5e"; g.fillText(o.cls || "R27", w * .5, h * .2);
    }));
  }
  function jibTex(o) {
    const key = "j" + o.jib;
    return TEXC[key] || (TEXC[key] = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = o.jib; g.fillRect(0, 0, w, h);
      for (let k = 1; k < 9; k++) { g.strokeStyle = "rgba(0,0,0,.1)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, k * h / 9); g.lineTo(w, k * h / 9 - 10); g.stroke(); }
      /* UV-védőcsík az achterliken és az alsó élen */
      g.fillStyle = o.uv || "rgba(40,48,60,.85)"; g.fillRect(w - 26, 0, 26, h); g.fillRect(0, h - 22, w, 22);
    }));
  }
  function spinTex(cols) {
    const key = "sp" + cols.join();
    return TEXC[key] || (TEXC[key] = canvasTex(512, 512, (g, w, h) => {
      cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * h / cols.length, w, h / cols.length + 1); });
      g.strokeStyle = "rgba(0,0,0,.12)"; for (let k = 0; k < 16; k++) { g.beginPath(); g.moveTo(k * w / 16, 0); g.lineTo(k * w / 16, h); g.stroke(); }
    }));
  }
  function nameTex(name, col) {
    return canvasTex(1024, 192, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.font = "italic 900 130px Georgia, 'Times New Roman', serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = 8; g.strokeStyle = "rgba(255,255,255,.9)"; g.strokeText(name, w / 2, h / 2 + 6); g.fillStyle = col || "#0b2f5e"; g.fillText(name, w / 2, h / 2 + 6);
    });
  }

  /* ------------------------------------------------------------------ VITORLÁS (Raptor 27-szerű túra-versenyhajó), eljárásosan modellezve
     helyi koordináták: +z orr, +x jobb (starboard), +y fel; vízvonal y=0 */
  const HULL = { L: 8.2, B: 2.7 };
  function hullShape(u) {   /* u: 0 = tükör (tat), 1 = orr */
    const hb = HULL.B / 2 * (u < .56 ? .84 + .16 * Math.sin(u / .56 * Math.PI / 2) : Math.pow(Math.cos((u - .56) / .44 * Math.PI / 2), .78));
    const sheer = .70 + .17 * Math.pow(u, 1.8);
    const depth = .08 + .44 * Math.pow(Math.sin(Math.PI * clamp(u * .98 + .02, 0, 1)), .65);
    return { hb, sheer, depth, z: -HULL.L / 2 + u * HULL.L };
  }
  function hullPoint(u, th, side) {   /* th: 0 = fenék közepe, 1 = fedélzetél */
    const s = hullShape(u);
    /* modern versenyhajó-szelvény: hátul széles, lapos fenék és kemény „áll” (chine), elöl éles V – a sziluett így karcsú és dinamikus */
    const e = .3 + .42 * Math.pow(u, 1.5), pw = 2.7 - 1.1 * u;
    const x = side * s.hb * Math.pow(Math.sin(th * Math.PI / 2), e) * (1 + .025 * Math.sin(th * Math.PI) * u);   /* elöl enyhe kihajlás a perem alatt */
    const y = -s.depth + (s.depth + s.sheer) * Math.pow(th, pw);
    return [x, y, s.z];
  }
  /* a hajótest festése textúrából (éles csíkok): vízszintesen a magasság (vízvonal-sávok), függőlegesen a peremtől mért távolság (peremcsíkok) */
  function hullTex(o) {
    const key = "h" + o.hull + o.boot + o.stripe;
    return TEXC[key] || (TEXC[key] = canvasTex(512, 512, (g, w, h) => {
      const Y = (y) => (y + .7) / 1.8 * w, D = (d) => d / 1.4 * h;   /* x: magasság −0.7…1.1 m; y: a peremtől lefelé 0…1.4 m */
      g.fillStyle = o.hull; g.fillRect(0, 0, w, h);
      g.fillStyle = o.stripe; g.fillRect(0, D(.06), w, D(.07) - D(.06) + D(.045));   /* széles peremcsík */
      g.fillStyle = o.stripe; g.fillRect(0, D(.155), w, Math.max(2, D(.012)));   /* vékony kísérőcsík */
      g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(0, D(.06) - 1, w, 2);
      g.fillStyle = "#1a2236"; g.fillRect(0, 0, Y(-.015), h);   /* algagátló festés a vízvonal alatt */
      g.fillStyle = o.boot; g.fillRect(Y(-.015), 0, Y(.075) - Y(-.015), h);   /* vízvonalcsík */
      g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(Y(.075), 0, 2, h);
    }, { repeat: [1, 1] }));
  }
  function buildHull(o) {
    const NU = 72, NT = 26, pos = [], col = [], idx = [], uvs = [];
    const cHull = new THREE.Color(o.hull), cBoot = new THREE.Color(o.boot), cAF = new THREE.Color("#1a2236"), cStripe = new THREE.Color(o.stripe);
    const colorAt = (y, sheer) => y < -.01 ? cAF : y < .09 ? cBoot : (y > sheer - .1 && y < sheer - .045 ? cStripe : cHull);
    for (const side of [-1, 1]) {
      const base = pos.length / 3;
      for (let i = 0; i <= NU; i++) { const u = i / NU; for (let j = 0; j <= NT; j++) { const p = hullPoint(u, j / NT, side); pos.push(...p); const c = colorAt(p[1], hullShape(u).sheer); col.push(c.r, c.g, c.b); uvs.push((p[1] + .7) / 1.8, 1 - (hullShape(u).sheer - p[1]) / 1.4); } }
      for (let i = 0; i < NU; i++) for (let j = 0; j < NT; j++) {
        const a = base + i * (NT + 1) + j, b = a + 1, c = a + NT + 1, d = c + 1;
        if (side > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
      }
    }
    /* tükör (tatfal): a két oldal u=0 szelvénye közötti lap */
    const tb = pos.length / 3; const s0 = hullShape(0);
    for (let j = 0; j <= NT; j++) { const p = hullPoint(0, j / NT, -1); pos.push(...p); const q = hullPoint(0, j / NT, 1); pos.push(...q); const c = colorAt(p[1], s0.sheer); col.push(c.r, c.g, c.b, c.r, c.g, c.b); const uu = (p[1] + .7) / 1.8, vv = 1 - (s0.sheer - p[1]) / 1.4; uvs.push(uu, vv, uu, vv); }
    for (let j = 0; j < NT; j++) { const a = tb + j * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
    W.disposables.push(g); return g;
  }
  /* fedélzet: elöl teljes szélességű, a kokpitnál csak az oldalfedélzetek; enyhe domborulat */
  const CK = { u0: .02, u1: .335, w: 1.52, sole: .30, seat: .66 };
  function buildDeck(detail, lng) {
    const NU = 34, NX = 10, pos = [], uv = [], idx = [];
    const push = (x, y, z) => { pos.push(x, y, z); if (lng) uv.push(z / 1.2, x / .7); else uv.push(x / 1.2, z / 1.2); };   /* lng: hosszanti tíkdeszkák */
    const strip = (u0, u1, xa, xb) => {   /* xa, xb: a fedélzet keresztirányú tartománya (−1..1 a félszélesség arányában vagy abszolút) */
      for (let i = 0; i <= NU; i++) {
        const u = u0 + (u1 - u0) * i / NU, s = hullShape(u);
        for (let j = 0; j <= NX; j++) { const f = j / NX; let x = xa(s) + (xb(s) - xa(s)) * f; x = clamp(x, -s.hb, s.hb); const camber = .07 * (1 - (x / Math.max(s.hb, .01)) ** 2); push(x, s.sheer + camber, s.z); }
      }
      const b0 = pos.length / 3 - (NU + 1) * (NX + 1);
      for (let i = 0; i < NU; i++) for (let j = 0; j < NX; j++) { const a = b0 + i * (NX + 1) + j, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }   /* 2026-11-11: a körüljárás megfordítva – a fedélzet eddig lefelé nézett (felülről nem látszott) */
    };
    const hw = CK.w / 2;
    if (detail) {
      strip(CK.u1, 1, (s) => -s.hb, (s) => s.hb);
      strip(0, CK.u1, (s) => -s.hb, () => -hw);
      strip(0, CK.u1, () => hw, (s) => s.hb);
    } else strip(0, 1, (s) => -s.hb, (s) => s.hb);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    W.disposables.push(g); return g;
  }
  /* vitorlafelület (rács) – minden képkockában újraszámolva */
  function sailGeom(nu, nv) {
    const g = new THREE.BufferGeometry(), n = (nu + 1) * (nv + 1);
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const uv = new Float32Array(n * 2); for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const k = j * (nu + 1) + i; uv[k * 2] = i / nu; uv[k * 2 + 1] = j / nv; }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const idx = []; for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    g.setIndex(idx); g.userData = { nu, nv }; W.disposables.push(g); return g;
  }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _p = new THREE.Vector3();
  /* részlet-LOD: a messziről már pixelnyinél is kisebb alkatrészek (csörlők, fejek, sapkák, kötélzet-szerelvények) nem rajzolódnak –
     egy hajó ~49 rajzhívásából távolról ~12 marad. Csak a láthatóságot kapcsolja; amit más rejtett el, azt nem hozza vissza. */
  const _lodV = new THREE.Vector3(), _lodC = new THREE.Vector3(), _lodS = new THREE.Vector3();
  function lodInit(g) {
    const L = []; g.traverse((o) => { if (!o.isMesh || !o.geometry) return; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const r = o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z); if (r < .45) L.push({ o, r, hid: false }); });
    g.userData.lod = L; return L;
  }
  function lodApply(g, camObj) {
    const L = g.userData.lod || lodInit(g); if (!camObj) return;
    g.getWorldPosition(_lodV); g.getWorldScale(_lodS); camObj.getWorldPosition(_lodC);
    const k = _lodS.x / Math.max(.05, _lodV.distanceTo(_lodC));
    for (let i = 0; i < L.length; i++) { const p = L[i], show = p.r * k > .0035; if (!show && p.o.visible) { p.o.visible = false; p.hid = true; } else if (show && p.hid) { p.o.visible = true; p.hid = false; } }
  }
  function sailShade(g) {   /* a vitorla domborulata szerinti lágy árnyalás (kétoldalas: a normális előjele nem számít) */
    const N = g.attributes.normal, C = g.attributes.color; if (!N || !C) return; const a = C.array;
    for (let i = 0, n = N.count; i < n; i++) { const d = Math.abs(N.getX(i) * .52 + N.getY(i) * .35 + N.getZ(i) * .78), L = .8 + .26 * d; a[i * 3] = L; a[i * 3 + 1] = L; a[i * 3 + 2] = L * 1.02; }
    C.needsUpdate = true;
  }
  function makeBoat(o) {
    o = Object.assign({ detail: 0, hull: "#eeeeea", boot: "#1d3a8a", stripe: "#1d3a8a", main: "#f4f2ea", jib: "#efeee6", num: "HUN 1", crew: 3, spin: ["#e5262f", "#ffffff", "#1f5fa8"], deckCol: "#e6e7e6" }, o);
    const G = new THREE.Group(), body = new THREE.Group(); G.add(body);   /* body: dőlés + bólintás */
    /* fényes gélbevonat: lakkréteg (clearcoat), éles festett csíkok */
    const hullMat = new THREE.MeshPhysicalMaterial({ map: hullTex(o), roughness: .3, metalness: 0, clearcoat: 1, clearcoatRoughness: .07, side: THREE.DoubleSide }); W.disposables.push(hullMat);
    hullMat.map.colorSpace = THREE.SRGBColorSpace;
    mesh(buildHull(o), hullMat, body);
    const vis = o.vis !== false;   /* a részletek (kajütablakok, korlát, kokpit, csörlők) minden hajón – a VR-versenyen a saját hajónak külön fedélzete van */
    /* körbefutó tíkfa peremléc és fekete ütközőléc a test peremén */
    { const railPts = (sd, dx, dy) => { const pts = []; for (let k = 0; k <= 40; k++) { const u = .004 + k / 40 * .99, sh = hullShape(u); pts.push(new THREE.Vector3(sd * (sh.hb + dx), sh.sheer + dy, sh.z)); } return pts; };
      const tm = std({ color: "#9a6a3c", roughness: .5 }), rb = std({ color: "#1a1d22", roughness: .45 });
      const tg = [], rg = [];
      [-1, 1].forEach((sd) => { const I4 = new THREE.Matrix4(); tg.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts(sd, -.035, .06)), 60, .022, 6, false), I4]); rg.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts(sd, .012, -.035)), 60, .03, 6, false), I4]); });
      mesh(mergeGeoms(tg), tm, body); mesh(mergeGeoms(rg), rb, body); }
    const deckMat = o.teakDeck ? std({ map: teakTex(), roughness: .75 }) : std({ color: "#d9dbdb", map: nonslipTex(), roughness: .9 });
    if (o.vis !== false) mesh(buildDeck(o.detail || 1, !!o.teakDeck), deckMat, body);   /* kokpitkivágással; a VR saját hajójának külön fedélzete van */
    const white = std({ color: "#ecece7", roughness: .38 }), dark = std({ color: "#1d232b", roughness: .4, metalness: .2 });
    const alu = std({ color: "#c9ced4", roughness: .3, metalness: .85 }), chrome = std({ color: "#e8ecef", roughness: .15, metalness: 1 });
    const wire = std({ color: "#9aa2aa", roughness: .35, metalness: .9 }), teak = std({ map: teakTex(), roughness: .7 });
    const glass = std({ color: "#20303c", roughness: .08, metalness: .6, transparent: true, opacity: .9 });
    const sM = hullShape(.6), deckY = sM.sheer + .07;
    /* felépítmény (kajüttető) ablakokkal, kapaszkodókkal */
    const cab = new THREE.Shape(); cab.moveTo(-.95, 0); cab.lineTo(.95, 0); cab.lineTo(.78, .44); cab.lineTo(-.78, .44); cab.closePath();
    const cg = new THREE.ExtrudeGeometry(cab, { depth: 2.75, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 });
    cg.translate(0, 0, -2.75 / 2);
    const cabin = mesh(cg, white, body); cabin.position.set(0, hullShape(.42).sheer + .02, .05);
    const cz0 = -1.33, cz1 = 1.42;
    if (vis) {
      [-1, 1].forEach((sd) => {   /* hosszú, sötétített oldalablakok a ferde kajütfalon */
        const wn = mesh(new THREE.PlaneGeometry(1.75, .16), glass, body);
        const by = hullShape(.42).sheer + .02, sl = Math.atan2(.17, .44);
        wn.position.set(sd * (.95 - .17 * .55) + sd * .012, by + .24, .1);
        wn.lookAt(wn.position.x + sd * Math.cos(sl), wn.position.y + Math.sin(sl), wn.position.z);
        const wn2 = mesh(new THREE.PlaneGeometry(.42, .14), glass, body); wn2.position.set(sd * .89, by + .25, -.95); wn2.lookAt(wn2.position.x + sd * Math.cos(sl), wn2.position.y + Math.sin(sl), wn2.position.z);
      });
      /* kapaszkodók a tetőn */
      [-1, 1].forEach((sd) => { const h = mesh(new THREE.BoxGeometry(.04, .05, 1.8), teak, body); h.position.set(sd * .55, hullShape(.42).sheer + .5, .1); });
      /* csúszótető és lejáró */
      const hatch = mesh(new THREE.BoxGeometry(.72, .06, .8), white, body); hatch.position.set(0, hullShape(.42).sheer + .49, -.85);
      if (o.detail) { const comp = mesh(new THREE.PlaneGeometry(.62, .38), dark, body); comp.position.set(0, CK.sole + .52, cz0 - .002); comp.rotation.y = Math.PI; }
      /* elülső tetőablak */
      const fh = mesh(new THREE.BoxGeometry(.5, .04, .5), glass, body); fh.position.set(0, hullShape(.42).sheer + .48, .9);
    }
    /* kokpit: padló, ülések teakkal, peremek, kormányrúd, csörlők */
    const ck = new THREE.Group(); body.add(ck);
    const ckz0 = hullShape(CK.u0).z, ckz1 = hullShape(CK.u1).z, ckL = ckz1 - ckz0;
    if (vis) {
      const sole = mesh(new THREE.BoxGeometry(CK.w - .02, .04, ckL), teak, ck); sole.position.set(0, CK.sole, (ckz0 + ckz1) / 2);
      [-1, 1].forEach((sd) => {
        const seat = mesh(new THREE.BoxGeometry(.44, .05, ckL - .55), teak, ck); seat.position.set(sd * (CK.w / 2 - .22), CK.seat, (ckz0 + ckz1) / 2 + .2);
        const front = mesh(new THREE.BoxGeometry(.04, CK.seat - CK.sole, ckL - .55), white, ck); front.position.set(sd * (CK.w / 2 - .44), (CK.seat + CK.sole) / 2, (ckz0 + ckz1) / 2 + .2);
        const wall = mesh(new THREE.BoxGeometry(.05, .74, ckL), white, ck); wall.position.set(sd * (CK.w / 2 + .01), CK.sole + .37 + .1, (ckz0 + ckz1) / 2);
        const coam = mesh(new THREE.BoxGeometry(.07, .05, ckL * .7), teak, ck); coam.position.set(sd * (CK.w / 2 + .02), hullShape(.2).sheer + .14, (ckz0 + ckz1) / 2 + .35);
        /* csörlők (két fő génuacsörlő) */
        const wz = ckz1 - .45; const drum = mesh(new THREE.CylinderGeometry(.075, .095, .14, 24), chrome, ck); drum.position.set(sd * (CK.w / 2 + .14), hullShape(.3).sheer + .16, wz);
        const top = mesh(new THREE.CylinderGeometry(.05, .07, .05, 20), dark, ck); top.position.set(sd * (CK.w / 2 + .14), hullShape(.3).sheer + .255, wz);
        const cl = mesh(new THREE.BoxGeometry(.04, .03, .16), dark, ck); cl.position.set(sd * (CK.w / 2 + .14), hullShape(.3).sheer + .11, wz - .3);
      });
      const bulk = mesh(new THREE.BoxGeometry(CK.w, .1, .06), teak, ck); bulk.position.set(0, CK.seat + .02, ckz1 - .03);
      /* műszerfal a lejáró mellett (élő adatokkal – a vitorlázásnál frissül) */
      if (o.detail) { const it = canvasTex(512, 256, (g) => { g.fillStyle = "#0b0f14"; g.fillRect(0, 0, 512, 256); });
      const inst = mesh(new THREE.PlaneGeometry(.36, .18), basic({ map: it }), ck); inst.position.set(-.48, CK.sole + .62, cz0 - .004); inst.rotation.y = Math.PI;
      G.userData.instTex = it; }
      /* iránytű */
      const cmp = mesh(new THREE.SphereGeometry(.06, 20, 12, 0, TAU, 0, Math.PI / 2), glass, ck); cmp.position.set(.48, CK.sole + .66, cz0 - .02);
      /* utazósín (traveller) a kokpit elején */
      const trav = mesh(new THREE.BoxGeometry(CK.w + .1, .03, .05), alu, ck); trav.position.set(0, CK.seat + .08, -2.0);
    }
    /* kormányrúd (a vitorlázásnál megfogható) + lapát tengelye */
    const tillerPivot = new THREE.Group(); tillerPivot.position.set(0, hullShape(0).sheer + .02, hullShape(0).z + .28); body.add(tillerPivot);
    if (o.detail) {
      const stock = mesh(new THREE.CylinderGeometry(.04, .04, .3, 12), dark, tillerPivot); stock.position.y = -.1;
      const tl = new THREE.Group(); tillerPivot.add(tl);
      /* lakkozott fa kormányrúd, végén fekete markolat, és a csuklós kormányhosszabbító */
      const tbar = mesh(new THREE.CylinderGeometry(.028, .04, 1.3, 14), teak, tl); tbar.rotation.x = Math.PI / 2 - .1; tbar.position.set(0, .14, .64);
      const tgrip = mesh(new THREE.CylinderGeometry(.03, .03, .26, 14), dark, tl); tgrip.rotation.x = Math.PI / 2 - .1; tgrip.position.set(0, .2, 1.2);
      const ext = rodBetween(new THREE.Vector3(0, .22, 1.27), new THREE.Vector3(0, .62, 1.78), .013, dark, tl);
      const grip = mesh(new THREE.SphereGeometry(.026, 12, 10), dark, tl); grip.position.set(0, .63, 1.79);
      /* a megfogható rész – láthatatlan, nagyobb fogási felület */
      const handle = mesh(new THREE.BoxGeometry(.36, .5, 1.3), basic({ visible: false }), tl); handle.position.set(0, .35, 1.15);
      G.userData.tiller = tl; G.userData.tillerHandle = handle; G.userData.tillerPivot = tillerPivot;
    }
    /* árbóc, salingok, kötélzet */
    const mastZ = .95, mastBase = hullShape(.42).sheer + .46, mastH = 11.2, foreH = mastBase + mastH * .88;
    const mg = new THREE.CylinderGeometry(.055, .07, mastH, 14); mg.translate(0, mastH / 2, 0); mg.scale(1, 1, 1.45);
    const mast = mesh(mg, alu, body); mast.position.set(0, mastBase, mastZ);
    const top = new THREE.Vector3(0, mastBase + mastH, mastZ), sprY = mastBase + mastH * .52;
    const parts = [];
    [-1, 1].forEach((sd) => {
      const tip = new THREE.Vector3(sd * .78, sprY, mastZ - .08);
      parts.push(rodGeom(new THREE.Vector3(0, sprY, mastZ), tip, .018, 6));
      const chain = new THREE.Vector3(sd * (HULL.B / 2 - .1), hullShape(.6).sheer + .05, mastZ - .2);
      parts.push(rodGeom(chain, tip, .006, 4)); parts.push(rodGeom(tip, new THREE.Vector3(sd * .04, foreH, mastZ), .006, 4)); parts.push(rodGeom(tip, new THREE.Vector3(sd * .03, mastBase + mastH * .5, mastZ), .005, 4));
    });
    const bow = new THREE.Vector3(0, hullShape(1).sheer + .05, HULL.L / 2 - .12), stern = new THREE.Vector3(0, hullShape(0).sheer + .08, -HULL.L / 2 + .05);
    parts.push(rodGeom(bow, new THREE.Vector3(0, foreH, mastZ + .05), .007, 4));
    parts.push(rodGeom(stern, top, .006, 4));
    /* korlátok és oszlopok, orrkorlát, tatlétra */
    if (vis) {
      const posts = [];
      for (let u = .06; u <= .88; u += .1) { const s = hullShape(u); [-1, 1].forEach((sd) => { const b = new THREE.Vector3(sd * (s.hb - .07), s.sheer + .05, s.z); const t = b.clone(); t.y += .62; posts.push([b, t, sd]); parts.push(rodGeom(b, t, .013, 6)); }); }
      [-1, 1].forEach((sd) => { const ps = posts.filter((p) => p[2] === sd); for (let i = 0; i < ps.length - 1; i++) { [.62, .32].forEach((h) => parts.push(rodGeom(ps[i][0].clone().setY(ps[i][0].y + h), ps[i + 1][0].clone().setY(ps[i + 1][0].y + h), .004, 4))); } });
      /* orrkorlát (pulpit) */
      const pu = []; for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + k / 8 * Math.PI; pu.push(new THREE.Vector3(Math.sin(a) * .42, hullShape(.95).sheer + .62, HULL.L / 2 - .55 + Math.cos(a) * .28)); }
      for (let k = 0; k < pu.length - 1; k++) parts.push(rodGeom(pu[k], pu[k + 1], .014, 6));
      [-1, 1].forEach((sd) => parts.push(rodGeom(new THREE.Vector3(sd * .42, hullShape(.93).sheer + .05, HULL.L / 2 - .55), new THREE.Vector3(sd * .42, hullShape(.93).sheer + .62, HULL.L / 2 - .55), .014, 6)));
      /* tatkorlát (pushpit) és fürdőlétra a tatfalon */
      const s0 = hullShape(0.02), pp = []; for (let k = 0; k <= 6; k++) { const a = k / 6; pp.push(new THREE.Vector3((a - .5) * 2 * (s0.hb - .12), s0.sheer + .62, s0.z + .12 + Math.sin(a * Math.PI) * .05)); }
      for (let k = 0; k < pp.length - 1; k++) parts.push(rodGeom(pp[k], pp[k + 1], .014, 6));
      [-1, 1].forEach((sd) => parts.push(rodGeom(new THREE.Vector3(sd * (s0.hb - .12), s0.sheer + .05, s0.z + .15), new THREE.Vector3(sd * (s0.hb - .12), s0.sheer + .62, s0.z + .12), .014, 6)));
      const lz = hullShape(0).z - .03; [-.16, .16].forEach((lx) => parts.push(rodGeom(new THREE.Vector3(lx, hullShape(0).sheer + .05, lz), new THREE.Vector3(lx, -.25, lz - .1), .011, 6)));
      for (let k = 0; k < 4; k++) { const yy = hullShape(0).sheer - .1 - k * .2; parts.push(rodGeom(new THREE.Vector3(-.16, yy, lz - k * .025), new THREE.Vector3(.16, yy, lz - k * .025), .012, 6)); }
      /* orrvasalat horgonygörgővel */
      parts.push(rodGeom(new THREE.Vector3(0, hullShape(1).sheer + .06, HULL.L / 2 - .3), new THREE.Vector3(0, hullShape(1).sheer + .1, HULL.L / 2 + .12), .03, 8));
    }
    mesh(mergeGeoms(parts), wire, body);
    /* bum (forog az árbóc körül) */
    const boomG = new THREE.Group(); boomG.position.set(0, mastBase + .92, mastZ); body.add(boomG);
    const bg = new THREE.CylinderGeometry(.045, .05, 3.45, 14); bg.rotateX(Math.PI / 2); bg.scale(1, 1.5, 1); bg.translate(0, 0, -3.45 / 2); mesh(bg, alu, boomG);   /* lekerekített, ovális keresztmetszetű bum */
    { const cap = new THREE.SphereGeometry(.05, 10, 8); cap.scale(1, 1.5, 1); cap.translate(0, 0, -3.45); mesh(cap, alu, boomG); }
    if (o.detail) { const vang = rodBetween(new THREE.Vector3(0, -.85, -.05), new THREE.Vector3(0, -.05, -.85), .01, dark, boomG); }
    /* vitorlák */
    const mainMat = std({ map: sailTex(o), side: THREE.DoubleSide, roughness: .85 });
    const jibMat = std({ map: jibTex(o), side: THREE.DoubleSide, roughness: .85 });
    const mainG = sailGeom(10, 14), jibG = sailGeom(9, 12);
    const mainM = mesh(mainG, mainMat, body), jibM = mesh(jibG, jibMat, body);
    mainM.frustumCulled = jibM.frustumCulled = false;
    let spinM = null, spinG = null;
    if (o.spin && !o.detail) { spinG = sailGeom(10, 12); spinM = mesh(spinG, std({ map: spinTex(o.spin), side: THREE.DoubleSide, roughness: .8 }), body); spinM.visible = false; spinM.frustumCulled = false; }
    /* hajónév a tat két oldalán */
    if (o.name) {
      const nt = nameTex(o.name, o.nameCol);
      [-1, 1].forEach((sd) => { const s = hullShape(.12); const p = mesh(new THREE.PlaneGeometry(1.25, .24), basic({ map: nt, transparent: true, depthWrite: false }), body);
        p.position.set(sd * (s.hb + .012), s.sheer - .28, s.z); p.rotation.y = sd * Math.PI / 2; });
    }
    /* 2026-11-11: a valódi Zephyr – az ORRON kétoldalt a hivatalos logó („Apartman” felirat nélkül), a FARNÁL a lajstromszám */
    if (o.logoImg) {
      const lt = new THREE.TextureLoader().load(o.logoImg); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 8; W.disposables.push(lt);
      [-1, 1].forEach((sd) => { const u = .8, s = hullShape(u), s2 = hullShape(u + .06), ang = Math.atan2(s2.hb - s.hb, s2.z - s.z);
        const p = mesh(new THREE.PlaneGeometry(1.25, 1.25 * 489 / 1625), basic({ map: lt, transparent: true, depthWrite: false, side: THREE.DoubleSide }), body); p.userData.noBake = true;
        p.position.set(sd * (s.hb + .02), s.sheer - .42, s.z); p.rotation.y = sd * (Math.PI / 2 + ang * (s2.z > s.z ? 1 : -1)); });
    }
    if (o.reg) { const rt = nameTex(o.reg, "#111111");
      [-1, 1].forEach((sd) => { const s = hullShape(.14); const p = mesh(new THREE.PlaneGeometry(1.0, .19), basic({ map: rt, transparent: true, depthWrite: false }), body); p.position.set(sd * (s.hb + .012), s.sheer - .3, s.z); p.rotation.y = sd * Math.PI / 2; }); }
    /* ================= 2026-11-11 MAKETT-RÉSZLETEK (a valódi Zephyr fotói alapján; minden hajón) ================= */
    if (o.extras !== false) {
      const I4 = new THREE.Matrix4(), dk = [], cr = [], bx = (w, h, d, x, y, z, ry) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return [g, I4]; };
      const cyl = (r0, r1, h, x, y, z, seg, rx) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg || 12); if (rx) g.rotateX(rx); g.translate(x, y, z); return [g, I4]; };
      /* árbóccsúcs: szélzászló (windex), horgonyfény, URH-antenna, szélmérő kanalak */
      { const ty = top.y, tz = top.z; dk.push(rodGeom(new THREE.Vector3(0, ty, tz - .05), new THREE.Vector3(0, ty + .32, tz - .05), .006, 5));
        dk.push(bx(.012, .05, .34, 0, ty + .33, tz - .12)); dk.push(bx(.012, .11, .08, 0, ty + .33, tz - .3));
        dk.push(rodGeom(new THREE.Vector3(.06, ty, tz + .04), new THREE.Vector3(.06, ty + .85, tz + .04), .004, 4));
        dk.push(rodGeom(new THREE.Vector3(0, ty + .02, tz), new THREE.Vector3(0, ty + .05, tz + .34), .006, 5)); dk.push(rodGeom(new THREE.Vector3(0, ty + .05, tz + .34), new THREE.Vector3(0, ty + .16, tz + .34), .005, 5));
        for (let k = 0; k < 3; k++) { const a = k * TAU / 3; const g = new THREE.SphereGeometry(.022, 8, 6); g.translate(Math.cos(a) * .06, ty + .17, tz + .34 + Math.sin(a) * .06); dk.push([g, I4]); }
        const lamp = mesh(new THREE.SphereGeometry(.03, 10, 8), basic({ color: "#fff6d8" }), body); lamp.position.set(-.05, ty + .04, tz); lamp.userData.noBake = true;
        /* radarreflektor és gőzölgőfény az árbócon */
        { const g = new THREE.OctahedronGeometry(.09, 0); g.translate(0, mastBase + mastH * .66, mastZ + .13); cr.push([g, I4]); }
        dk.push(bx(.05, .06, .05, 0, mastBase + mastH * .58, mastZ + .1)); }
      /* lazy bag a bumon (a nagyvitorla zsákja) + lazy jack kötelek */
      if (o.lazyBag) { const lb = std({ color: o.lazyBag, roughness: .95 }), parts2 = [];
        [-1, 1].forEach((sd) => { const g = new THREE.BoxGeometry(.018, .15, 3.05); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { if (P.getY(i) > 0) P.setX(i, P.getX(i) + sd * .05); } g.translate(sd * .055, .12, -1.72); g.computeVertexNormals(); parts2.push([g, I4]); });
        mesh(mergeGeoms(parts2), lb, boomG);
        const lj = []; [-1, 1].forEach((sd) => { [-.9, -1.9, -2.9].forEach((z) => lj.push(rodGeom(new THREE.Vector3(sd * .11, .25, z), new THREE.Vector3(0, mastH * .56 - .92, -.04), .004, 3))); });
        mesh(mergeGeoms(lj), wire, boomG); }
      if (vis) {
        const sB = hullShape(1), sS = hullShape(0);
        /* kikötőbakok (elöl, hátul), kötélvezetők */
        [[.9, 1], [.9, -1], [.06, 1], [.06, -1], [.5, 1], [.5, -1]].forEach(([u, sd]) => { const q = hullShape(u), x = sd * (q.hb - .16), y = q.sheer + .075; cr.push(bx(.035, .022, .19, x, y + .035, q.z)); cr.push(bx(.03, .035, .03, x, y + .012, q.z - .045)); cr.push(bx(.03, .035, .03, x, y + .012, q.z + .045)); });
        /* rolós orrvitorla dobja és az orrmerevítő profilja */
        dk.push(cyl(.075, .075, .05, 0, bow.y + .1, bow.z, 16)); dk.push(cyl(.05, .05, .1, 0, bow.y + .16, bow.z, 12));
        /* horgony az orrgörgőn (eke alakú) */
        { const g1 = new THREE.BoxGeometry(.03, .03, .55); g1.rotateX(.18); g1.translate(0, sB.sheer + .1, HULL.L / 2 - .05); cr.push([g1, I4]);
          const g2 = new THREE.ConeGeometry(.13, .3, 4); g2.rotateX(Math.PI / 2 + .5); g2.scale(1, .35, 1); g2.translate(0, sB.sheer - .0, HULL.L / 2 + .2); cr.push([g2, I4]); }
        /* helyzetfények: piros/zöld az orrkorláton, fehér a tatkorláton */
        [[-1, "#ff2a2a"], [1, "#22e055"]].forEach(([sd, c]) => { const l = mesh(new THREE.BoxGeometry(.05, .05, .07), basic({ color: c }), body); l.position.set(sd * .2, hullShape(.95).sheer + .62, HULL.L / 2 - .2); l.userData.noBake = true; });
        { const l = mesh(new THREE.BoxGeometry(.06, .05, .04), basic({ color: "#fffbe8" }), body); l.position.set(0, sS.sheer + .62, sS.z + .1); l.userData.noBake = true; }
        /* patkó alakú mentőpatkó a tatkorláton */
        { const hb = mesh(new THREE.TorusGeometry(.17, .05, 8, 16, Math.PI * 1.5), std({ color: "#ff7a1a", roughness: .8 }), body); hb.position.set(-(sS.hb - .1), sS.sheer + .38, sS.z + .5); hb.rotation.set(0, Math.PI / 2, Math.PI * .75); }
        /* csörlők és kötélfogók a kajüttetőn, kötélkupacok */
        { const ct = hullShape(.42).sheer + .02 + .44 + .03;
          [-1, 1].forEach((sd) => { cr.push(cyl(.055, .07, .11, sd * .52, ct + .055, cz0 + .22, 16)); dk.push(cyl(.04, .05, .035, sd * .52, ct + .125, cz0 + .22, 12));
            for (let k = 0; k < 3; k++) dk.push(bx(.035, .04, .12, sd * (.3 + k * .05), ct + .02, cz0 + .52));
            dk.push(bx(.3, .012, .012, sd * .38, ct + .012, cz0 + .9)); });
          /* csúszásgátló betétek a tetőn és az előfedélzeten (a Zephyren kék) */
          if (o.nsCol) { const nm = std({ color: o.nsCol, roughness: .95 }), ns = [];
            [-1, 1].forEach((sd) => { const g = new THREE.BoxGeometry(.5, .008, 1.5); g.translate(sd * .38, ct + .004, .55); ns.push([g, I4]); });
            { const q = hullShape(.78), g = new THREE.BoxGeometry(q.hb * 1.1, .008, .9); g.translate(0, q.sheer + .078, q.z); ns.push([g, I4]); }
            mesh(mergeGeoms(ns), nm, body); } }
        /* farmotor a tükrön (a valódi Zephyren külmotor van) */
        if (o.outboard) { const ob = [], x = .5, z = sS.z - .2, y = sS.sheer;
          ob.push(bx(.22, .3, .3, x, y + .12, z)); ob.push(bx(.1, .75, .12, x, y - .38, z - .02)); ob.push(bx(.03, .08, .26, x, y - .72, z - .1)); ob.push(bx(.16, .05, .2, x, y - .05, z + .16));
          mesh(mergeGeoms(ob), std({ color: "#23272d", roughness: .45 }), body);
          const cap = mesh(new THREE.BoxGeometry(.225, .05, .305), std({ color: "#c9ccd0", roughness: .4 }), body); cap.position.set(x, y + .25, z);
          const pr = mesh(new THREE.CylinderGeometry(.09, .09, .015, 10), dark, body); pr.rotation.x = Math.PI / 2; pr.position.set(x, y - .72, z - .16); }
        /* nemzeti lobogó a tatzászlórúdon */
        if (o.flag !== false) { const fx0 = sS.hb - .25, fz0 = sS.z + .1; dk.push(rodGeom(new THREE.Vector3(fx0, sS.sheer + .1, fz0), new THREE.Vector3(fx0, sS.sheer + 1.25, fz0 - .28), .009, 5));
          const ft = TEXC.flagHU || (TEXC.flagHU = canvasTex(96, 64, (g, w, h) => { g.fillStyle = "#ce2939"; g.fillRect(0, 0, w, h / 3); g.fillStyle = "#ffffff"; g.fillRect(0, h / 3, w, h / 3); g.fillStyle = "#477050"; g.fillRect(0, h * 2 / 3, w, h / 3); }));
          const fg = new THREE.PlaneGeometry(.42, .27, 6, 1); const P = fg.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, Math.sin(P.getX(i) * 9) * .03);
          const fl = mesh(fg, basic({ map: ft, side: THREE.DoubleSide }), body); fl.position.set(fx0, sS.sheer + 1.08, fz0 - .47); fl.rotation.y = Math.PI / 2; fl.userData.noBake = true; }
      }
      if (dk.length) mesh(mergeGeoms(dk), dark, body); if (cr.length) mesh(mergeGeoms(cr), chrome, body);
    }
    /* legénység (kikötve ülnek a szél felőli oldalon) */
    const crew = [];
    const skin = std({ color: "#d9a988", roughness: .7 });
    for (let k = 0; k < (o.crew || 0); k++) {
      const c = new THREE.Group(); const vest = std({ color: o.crewCol || ["#ff7a00", "#e5262f", "#ffd166"][k % 3], roughness: .7 });
      /* vitorlázó: sötét vízálló dzseki, rajta élénk mentőmellény, karok a kötélen, sapka napellenzővel, napszemüveg */
      const jacket = std({ color: "#20252c", roughness: .8 });
      const torso = mesh(new THREE.CapsuleGeometry(.14, .36, 4, 10), jacket, c); torso.position.y = .42;
      const vestM = mesh(new THREE.CapsuleGeometry(.155, .2, 4, 10), vest, c); vestM.position.y = .5; vestM.scale.set(1, 1, .9);
      [-1, 1].forEach((sd) => { const arm = mesh(new THREE.CapsuleGeometry(.045, .32, 3, 6), jacket, c); arm.position.set(sd * .17, .52, .1); arm.rotation.set(1.0, 0, -sd * .25); const hand = mesh(new THREE.SphereGeometry(.04, 8, 6), skin, c); hand.position.set(sd * .2, .4, .27); });
      const neck = mesh(new THREE.CylinderGeometry(.045, .05, .07, 8), skin, c); neck.position.y = .74;
      const head = mesh(new THREE.SphereGeometry(.1, 12, 10), skin, c); head.position.y = .84; head.scale.set(.95, 1.05, 1);
      const cap = mesh(new THREE.SphereGeometry(.105, 12, 8, 0, TAU, 0, Math.PI / 2), std({ color: "#ffffff" }), c); cap.position.y = .87;
      const visor = mesh(new THREE.BoxGeometry(.14, .012, .1), std({ color: "#0b2f5e" }), c); visor.position.set(0, .875, .11);
      const shades = mesh(new THREE.BoxGeometry(.15, .03, .02), std({ color: "#0d0f12", roughness: .1, metalness: .6 }), c); shades.position.set(0, .845, .095);
      const legs = mesh(new THREE.CapsuleGeometry(.08, .55, 3, 8), std({ color: "#2b3445" }), c); legs.position.set(0, .18, .0); legs.rotation.z = Math.PI / 2.4;
      body.add(c); crew.push({ g: c, z: -2.6 + k * .75, legs });
    }
    /* ================= VITORLÁK – életszerű trimm és lobogás (2026. nov. 9., szakirodalom alapján) =================
       • A vitorla a LÁTSZÓLAGOS szélhez (awa, aws – a valódi, gyorsítás nélküli hajósebességből) áll be: a legénység úgy trimmel,
         hogy a húr kb. 18–21°-os állásszögben álljon a széllel (Gentry; Forces on sails). Belobogás (luffing) CSAK akkor van,
         ha a szél a vitorla belépő éle elé fordul, mert a szkótát már nem lehet tovább behúzni – túl élesen (awa < ~20°),
         vagy fordulóban, a szél „szemében”. Egy jól trimmelt, gyorsan haladó hajó vitorlája teli és nyugodt.
       • Részleges belobogás: előbb a génua, aztán a grósz belépő élén „buborék” (a szövet befelé púposodik és remeg);
         teljes belobogás (flogging): az egész vitorla csapkod, a hullám az elülső éltől hátrafelé fut, a hátsó él csapkod a legjobban,
         a frekvencia a szélsebességgel nő.
       • Teli vitorlán erősebb szélben csak a hátsó él (leech) felső része rezeg kicsit, gyorsan – ez a jó trimm jele.
       • Hátszélben a grósz a csarnakig engedve, „átesve” (stall) áll – nyugodt; a génua a grósz szélárnyékában összeesik és újra
         kitelik, ezért spinakker nélkül a hajó PILLANGÓBA áll (wing-on-wing): a génuát a túloldalra, a szél felőli oldalra rúddal kitolják.
       • Spinakker (szimmetrikus): a rúd merőleges a látszólagos szélre (hátszélben hátrahúzva, bővszélben az előstag felé),
         a trimmer folyamatosan engedi a szkótát, amíg a belépő él közepe enyhén be nem hajlik (luff curl), majd visszahúzza;
         hátszélben a spinakker a szél felőli oldalra fordul, szemben a grósszal – ez a spinakkeres „pillangó”. Túl éles szögnél összeesik. */
    const S = { boom: .15, jib: .2, side: 1, luff: 0, heel: 0, pitch: 0, spin: 0, t: 0, crewSide: 1,
      awa: null, aws: 6, gust: 1, tackT: 0, wing: 0, boomS: null, jibA: null, lfM: 0, lfJ: 0, bl: 0, jc: 0, scurl: 0 };
    const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    /* rúd: hátszélben a génua kitolásához (pillangó), spinakkerrel a spinakker rúdja */
    const poleG = new THREE.CylinderGeometry(.03, .03, 1, 8); poleG.translate(0, .5, 0); const poleM = mesh(poleG, alu, body); poleM.visible = false;
    const _q = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
    function setPole(a, b) { _q.subVectors(b, a); const L = _q.length(); poleM.position.copy(a); poleM.scale.set(1, L, 1); poleM.quaternion.setFromUnitVectors(_up, _q.normalize()); }
    const poleBase = new THREE.Vector3(0, mastBase + 1.3, mastZ + .1);
    /* lobogás: az elülső éltől hátrafelé futó hullám; a hátsó élnél nagyobb kitérés; két frekvencia, hogy ne legyen gépies */
    function flogW(u, v, om) { const t = S.t; return Math.sin(om * t - u * 7.5 - v * 2.4) * (.3 + .7 * u) + .45 * u * Math.sin(om * 1.73 * t - u * 11 + v * 3.3 + 1.3); }
    /* automatikus trimm a látszólagos szélből (csak ha a hívó megadja az awa-t) */
    function autoTrim(dt) {
      const A = S.awa, U = S.aws, sd = S.side, k = Math.min(1, dt * 1.6);
      /* grósz: húr ~18° a szélhez; legbelül ~4° (a traveller/szkóta vége), legkint ~82° (a csarnak) */
      const bT = clamp(A - 18, 4, 82) * sd;
      if (S.boomS == null) S.boomS = bT;
      /* fordulóban/perdülésben a bum gyorsan átvág, egyébként a szkótás folyamatosan követi a szelet */
      S.boomS += (bT - S.boomS) * Math.min(1, dt * (Math.sign(bT) !== Math.sign(S.boomS) ? 3.2 : 1.6));
      S.boom = S.boomS * D2R;
      const jT = clamp(A - 21, 9, 46); if (S.jibA == null) S.jibA = jT; S.jibA += (jT - S.jibA) * k; S.jib = S.jibA * D2R;
      /* belobogás: az állásszög (látszólagos szél – vitorla húrja) ~8° alatt kezdődik, ~2° körül teljes */
      const aM = A - Math.abs(S.boomS), aJ = A - S.jibA;
      const tk = clamp((S.tackT - 1.1) / 1.8, 0, 1) * .85;   /* forduló után a génua addig csapkod, míg be nem csörlőzik */
      const lfMt = Math.max(clamp((10 - aM) / 8, 0, 1), tk * .8), lfJt = Math.max(clamp((11 - aJ) / 8, 0, 1), tk);
      S.lfM += (lfMt - S.lfM) * Math.min(1, dt * 5); S.lfJ += (lfJt - S.lfJ) * Math.min(1, dt * 5);
      S.luff = Math.max(S.lfM, S.lfJ);
      /* pillangó: spinakker nélkül mély hátszélben a génua a szél felőli oldalra kerül, rúddal kitolva (hiszterézissel) */
      const wT = S.spin < .3 && A > (S.wing > .5 ? 150 : 163) ? 1 : 0; S.wing += (wT - S.wing) * Math.min(1, dt * .5);
      /* a génua a grósz szélárnyékában (hátszél, nincs pillangó): összeesik és újra kitelik */
      S.bl = clamp((A - 132) / 30, 0, 1) * (1 - sstep(.15, .6, S.wing)) * (1 - S.spin);
      const cyc = .5 + .5 * Math.sin(S.t * TAU / 5.3 + .9 * Math.sin(S.t * .61));
      S.jc += (S.bl * sstep(.3, .85, cyc) - S.jc) * Math.min(1, dt * (S.jc > S.bl * .5 ? 1.2 : 4));   /* lassan esik össze, hirtelen pukkan vissza */
    }
    function luffDepth(depth, chord, u, v, lf, om, amp) {
      /* lf: 0 = teli, 0–0,6 = buborék az elülső élen, 0,6–1 = egész vitorla csapkod */
      if (lf <= .001) return depth;
      const fl = sstep(.55, 1, lf), bub = lf * (1 - fl), e = Math.exp(-u * 5.5);
      return depth * (1 - fl) - depth * bub * 1.7 * e
        + chord * (.02 * bub * Math.exp(-u * 3.5) * Math.sin(om * 1.6 * S.t - u * 14 + v * 5) + amp * fl * flogW(u, v, om)) * clamp((S.awa != null ? S.aws : 6) / 8, .2, 1.15);   /* gyenge szélben a vitorla csak lustán lebben, nem csapkod viharosan */
    }
    function leechFlutter(u, v, U, lf) {   /* teli vitorla, erősebb szél: a felső hátsó él gyors, apró rezgése */
      if (u < .8 || v < .4) return 0;
      const a = clamp((U - 4.5) / 6, 0, 1) * (1 - lf); if (a <= 0) return 0;
      return .022 * a * ((u - .8) / .2) ** 2 * sstep(.4, .75, v) * Math.sin(TAU * 7.3 * S.t + v * 9 + u * 3);
    }
    function updMain() {
      const pa = mainG.attributes.position.array, { nu, nv } = mainG.userData;
      const y0 = mastBase + .92, yh = mastBase + mastH - .25, foot = 3.3, a = S.boom, side = S.side;
      const auto = S.awa != null, U = auto ? S.aws : 6, lf = auto ? S.lfM : S.luff, om = TAU * (.9 + U * .16);
      const gk = .955 + .045 * clamp((S.gust - 1) / .15, -1, 1);   /* széllökésben a vitorla „megtelik” */
      const twist = auto ? .16 + .1 * clamp((S.awa - 30) / 120, 0, 1) : .22;   /* hátszélben nyitottabb felső rész */
      for (let j = 0; j <= nv; j++) {
        const v = j / nv, y = y0 + (yh - y0) * v;
        const chord = foot * ((1 - v) * (1 + .26 * Math.sin(Math.PI * v))) + .16 * v;
        const tw = a + side * twist * v;   /* a vitorla csavarodása felfelé */
        const dx = Math.sin(tw), dz = -Math.cos(tw);
        const camber = .11 * (1 - v * .35) * gk;
        for (let i = 0; i <= nu; i++) {
          const u = i / nu, k = (j * (nu + 1) + i) * 3;
          let depth = chord * camber * Math.sin(Math.PI * Math.pow(u, .8));
          depth = luffDepth(depth, chord, u, v, lf, om, .07);
          if (auto) depth += leechFlutter(u, v, U, lf);
          pa[k] = dx * u * chord + Math.cos(tw) * depth * side;
          pa[k + 1] = y - u * .12 * (1 - v);
          pa[k + 2] = mastZ - .07 + dz * u * chord + Math.sin(tw) * depth * side;
        }
      }
      mainG.attributes.position.needsUpdate = true; mainG.computeVertexNormals(); if (G.userData.sailBaked) sailShade(mainG);
      boomG.rotation.y = -a;
    }
    const _cw = new THREE.Vector3();
    function updJib() {
      const pa = jibG.attributes.position.array, { nu, nv } = jibG.userData;
      const tack = _a.set(0, hullShape(1).sheer + .1, HULL.L / 2 - .25);
      const head = _b.set(0, foreH - .25, mastZ + .1 + (HULL.L / 2 - .25 - mastZ - .1) * .03);
      const auto = S.awa != null, ja = S.jib, side = S.side, foot = 4.55, U = auto ? S.aws : 6, om = TAU * (1 + U * .17);
      const clew = _c.set(tack.x + Math.sin(ja) * foot * side, hullShape(.5).sheer + .42 + ja * .5, tack.z - Math.cos(ja) * foot);
      /* pillangó: a szkótapont a rúd végén, a szél felőli oldalon, kb. merőlegesen a hajóra */
      const wg = auto ? sstep(0, 1, S.wing) : 0;
      if (wg > 0) {
        const th = 78 * D2R, Lp = 3.35; _cw.set(-side * Lp * Math.sin(th), poleBase.y + .05, poleBase.z + Lp * Math.cos(th));
        /* átvitel közben a szkótapont a hajó előtt ível át */
        const mid = Math.sin(Math.PI * wg); clew.lerp(_cw, wg); clew.z += mid * .9; clew.y += mid * .4;
      }
      const jsd = wg > .5 ? -side : side;
      _n.subVectors(head, tack).cross(_p.subVectors(clew, tack)).normalize(); if (_n.x * jsd < 0) _n.negate();
      const lf = auto ? S.lfJ * (1 - wg) : S.luff, cross = auto ? Math.abs(1 - 2 * wg) : 1;   /* átvitel közben ernyedt */
      const jc = auto ? S.jc : 0;
      for (let j = 0; j <= nv; j++) {
        const v = j / nv;
        for (let i = 0; i <= nu; i++) {
          const u = i / nu, k = (j * (nu + 1) + i) * 3;
          const lx = tack.x + (head.x - tack.x) * v, ly = tack.y + (head.y - tack.y) * v, lz = tack.z + (head.z - tack.z) * v;
          const ex = clew.x + (head.x - clew.x) * v, ey = clew.y + (head.y - clew.y) * v, ez = clew.z + (head.z - clew.z) * v;
          const chord = Math.hypot(ex - lx, ey - ly, ez - lz);
          let depth = chord * .13 * Math.sin(Math.PI * Math.pow(u, .75)) * (1 - v * .4) * (wg > 0 ? .55 + .45 * cross : 1);
          if (auto && wg > 0) depth *= 1 + .25 * wg * (1 - cross);   /* kitolva, teli „vitorla-szárny” */
          depth = luffDepth(depth, chord, u, v, lf, om, .085);
          if (jc > 0) depth = depth * (1 - 1.35 * jc) + chord * jc * .05 * Math.sin(S.t * 1.4 + u * 3 + v * 2.2);   /* szélárnyékban ernyedten leng */
          if (auto) depth += leechFlutter(u, v, U, Math.max(lf, jc));
          pa[k] = lx + (ex - lx) * u + _n.x * depth; pa[k + 1] = ly + (ey - ly) * u + _n.y * depth; pa[k + 2] = lz + (ez - lz) * u + _n.z * depth;
        }
      }
      jibG.attributes.position.needsUpdate = true; jibG.computeVertexNormals(); if (G.userData.sailBaked) sailShade(jibG);
      if (wg > .55 && jibM.visible) { poleM.visible = true; setPole(poleBase, clew); } else if (!(spinM && spinM.visible)) poleM.visible = false;
    }
    const _sn = new THREE.Vector3(), _sc = new THREE.Vector3();
    function updSpin() {
      if (!spinM) return; spinM.visible = S.spin > .02; if (!spinM.visible) { jibM.visible = true; return; }
      jibM.visible = S.spin < .6;
      const pa = spinG.attributes.position.array, { nu, nv } = spinG.userData, side = S.side, k0 = S.spin;
      const auto = S.awa != null, A = auto ? S.awa : 150, U = auto ? S.aws : 6;
      const fill = sstep(.4, 1, k0) * (1 - clamp((96 - A) / 16, 0, 1) * .85);   /* túl élesen összeesik */
      /* rúd: merőleges a látszólagos szélre – hátszélben hátrahúzva (a szél felőli oldalon), bővszélben az előstag felé;
         a hajó ringásával a trimmer együtt mozgatja */
      const thp = clamp(A - 92 + S.heel * side * 25, 4, 82) * D2R, Lp = 3.1;
      const tack = _a.set(-side * Lp * Math.sin(thp), poleBase.y + .25, poleBase.z + Lp * Math.cos(thp));
      const topY = mastBase + mastH * .97, headY = deckY + (topY - deckY) * Math.min(1, k0 * 1.5);
      const head = _b.set(-side * .25 * Math.sin(thp), headY, mastZ + .55);
      /* a talp húrja: bővszélben a hajó mentén hátra-hátszél felé, hátszélben keresztben; a domborulat a szél áramlásával előre */
      const dl = clamp(A - 38, 45, 92) * D2R, F = 5.7 * (.45 + .55 * fill);
      _sc.set(side * Math.sin(dl), 0, -Math.cos(dl)); _sn.set(side * Math.cos(dl), 0, Math.sin(dl));
      const clew = _c.copy(tack).addScaledVector(_sc, F); clew.y = poleBase.y + .45 + (A < 125 ? .5 : .15);
      /* luff curl: a trimmer engedi a szkótát, amíg a belépő él közepe be nem hajlik, majd visszahúzza (~3,5 s ciklus) */
      const cyc = .5 + .5 * Math.sin(S.t * TAU / 3.4 + .6 * Math.sin(S.t * .9));
      const ct = auto ? sstep(.55, 1, cyc) * .75 + clamp((100 - A) / 12, 0, 1) * .5 : 0;
      S.scurl += (ct - S.scurl) * Math.min(1, (1 / 60) * 6);
      const om = TAU * (.8 + U * .14), lim = 1 - fill;
      for (let j = 0; j <= nv; j++) { const v = j / nv;
        for (let i = 0; i <= nu; i++) { const u = i / nu, k = (j * (nu + 1) + i) * 3;
          const lx = tack.x + (head.x - tack.x) * v, ly = tack.y + (head.y - tack.y) * v, lz = tack.z + (head.z - tack.z) * v;
          const ex = clew.x + (head.x - clew.x) * v, ey = clew.y + (head.y - clew.y) * v, ez = clew.z + (head.z - clew.z) * v;
          let bulge = F * .44 * fill * Math.pow(Math.sin(Math.PI * u), .85) * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.03 + .04)), .6) * (1 + .025 * Math.sin(S.t * 3.1 + v * 6));
          /* belépő él (a rúd felőli szél) behajlása – a vitorla közepe táján a legerősebb */
          const ce = u < .3 ? (1 - u / .3) ** 2 * Math.max(0, Math.sin(Math.PI * clamp((v - .18) / .72, 0, 1))) : 0;
          bulge -= ce * S.scurl * 1.1 * fill;
          /* ernyedt (felhúzás közben / túl éles szögnél): lengő, csapkodó szövet */
          if (lim > .01) bulge += lim * F * .06 * flogW(u, v, om) + lim * .35 * Math.sin(S.t * 1.3 + v * 2);
          pa[k] = lx + (ex - lx) * u + _sn.x * bulge; pa[k + 1] = ly + (ey - ly) * u + bulge * .12 - lim * v * .2 * (1 - k0); pa[k + 2] = lz + (ez - lz) * u + _sn.z * bulge;
        } }
      spinG.attributes.position.needsUpdate = true; spinG.computeVertexNormals(); if (G.userData.sailBaked) sailShade(spinG);
      if (k0 > .25) { poleM.visible = true; setPole(poleBase, tack); }
    }
    function updCrew(dt) {
      S.crewSide += (-S.side - S.crewSide) * Math.min(1, dt * 1.2);   /* a szél felőli oldalra ülnek át (lassan) */
      const ws = S.crewSide;
      crew.forEach((c, k) => {
        const u = (c.z + HULL.L / 2) / HULL.L, s = hullShape(clamp(u, 0, 1));
        c.g.position.set(ws * (s.hb - .05), s.sheer + .02, c.z);
        c.g.rotation.set(0, 0, -ws * clamp(.25 + Math.abs(S.heel) * 1.6, .2, .95));
        c.legs.rotation.z = Math.PI / 2.4; c.legs.position.x = ws * .02;
      });
    }
    G.userData.S = S;
    /* 2026-11-11 VITORLÁK KISÜTÉSE: a vitorlák anyaga fény nélküli (MeshBasicMaterial), az árnyalást a hullámzó felület normálisaiból
       csúcsszínként számoljuk (vitorlánként ~150 csúcs – elhanyagolható), így a hajón semmi sem kér futásidejű fényszámítást. */
    G.userData.bakeSails = () => { if (G.userData.sailBaked) return; G.userData.sailBaked = true;
      [mainM, jibM, spinM].forEach((m) => { if (!m) return; const o = m.material, n = new THREE.MeshBasicMaterial({ map: o.map || null, side: THREE.DoubleSide, vertexColors: true, transparent: o.transparent, opacity: o.opacity }); W.disposables.push(n);
        const g = m.geometry, c = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute("color", new THREE.BufferAttribute(c, 3)); m.material = n; m.castShadow = m.receiveShadow = false; sailShade(g); }); };
    G.userData.update = (dt) => {
      S.t += dt;
      body.rotation.set(S.pitch, 0, S.heel, "YXZ");
      if (S.awa != null) autoTrim(dt);
      if (!(spinM && spinM.visible) && !(S.awa != null && S.wing > .55)) poleM.visible = false;
      updMain(); updJib(); updSpin(); updCrew(dt);
    };
    G.userData.mats = [hullMat, deckMat, white, dark, alu, chrome, wire, teak, glass, mainMat, jibMat].concat(spinM ? [spinM.material] : []);
    G.userData.body = body; G.userData.deckY = deckY;
    G.userData.update(0);
    return G;
  }

  /* ------------------------------------------------------------------ NYOMHULLÁM: a hajó mögötti habos csík + orrhullám */
  function makeWake(parent, width) {
    const N = 46, pos = new Float32Array(N * 2 * 3), al = new Float32Array(N * 2);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("alpha", new THREE.BufferAttribute(al, 1));
    const idx = []; for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } g.setIndex(idx);
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 } },
      vertexShader: `attribute float alpha; varying float vA; varying vec2 vP; void main(){ vA = alpha; vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `varying float vA; varying vec2 vP; uniform float uT; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9,78.2)))*43758.5); }
        void main(){ float n = h(floor(vP * 6.)) * .5 + .5; gl_FragColor = vec4(vec3(.96,.98,.98), vA * n); }` });
    W.disposables.push(g, mat);
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 2; parent.add(m);
    const pts = []; let acc = 0;
    return {
      mesh: m,
      push(x, z, hd, v, dt, wy) {
        acc += v * dt;
        if (!pts.length || acc > .9) { pts.unshift({ x: x - Math.sin(hd) * 3.2, z: z - Math.cos(hd) * 3.2, hd, age: 0, v }); acc = 0; if (pts.length > N) pts.pop(); }
        pts.forEach((p) => p.age += dt);
        for (let i = 0; i < N; i++) {
          const p = pts[Math.min(i, pts.length - 1)] || { x, z, hd, age: 99, v: 0 };
          const w = (width || .7) + p.age * .55, nx = Math.cos(p.hd), nz = -Math.sin(p.hd);
          const k = i * 6; pos[k] = p.x - nx * w; pos[k + 1] = wy || .03; pos[k + 2] = p.z - nz * w; pos[k + 3] = p.x + nx * w; pos[k + 4] = wy || .03; pos[k + 5] = p.z + nz * w;
          const a = i >= pts.length ? 0 : clamp(p.v / 3.2, 0, 1) * Math.max(0, 1 - p.age / 22) * .55;
          al[i * 2] = al[i * 2 + 1] = a;
        }
        g.attributes.position.needsUpdate = true; g.attributes.alpha.needsUpdate = true;
      }
    };
  }

  /* ------------------------------------------------------------------ BÓJA, RENDEZŐHAJÓ */
  function makeBuoy(color, h) {
    const g = new THREE.Group(), m = std({ color, roughness: .55 });
    const c = mesh(new THREE.CylinderGeometry(.55, .75, h || 1.8, 20), m, g); c.position.y = (h || 1.8) / 2 - .2;
    const t = mesh(new THREE.SphereGeometry(.55, 16, 8, 0, TAU, 0, Math.PI / 2), m, g); t.position.y = (h || 1.8) - .2;
    const band = mesh(new THREE.CylinderGeometry(.62, .66, .16, 20), std({ color: "#ffffff" }), g); band.position.y = .55;
    return g;
  }
  function makeCommittee() {
    const g = new THREE.Group(), w = std({ color: "#f5f5f2", roughness: .35 }), b = std({ color: "#123b74", roughness: .4 });
    const hull = mesh(new THREE.BoxGeometry(3.6, 1.2, 11), w, g); hull.position.y = .4;
    const bow = mesh(new THREE.ConeGeometry(1.8, 3.2, 4, 1), w, g); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(0, .4, 6.9); bow.scale.set(1, 1, .45);
    const stripe = mesh(new THREE.BoxGeometry(3.62, .18, 11.02), b, g); stripe.position.y = .55;
    const house = mesh(new THREE.BoxGeometry(2.8, 1.6, 4.6), w, g); house.position.set(0, 1.8, -.2);
    const win = mesh(new THREE.BoxGeometry(2.84, .5, 3.8), std({ color: "#1d2a36", roughness: .1, metalness: .5 }), g); win.position.set(0, 2.05, -.1);
    const mastG = mesh(new THREE.CylinderGeometry(.05, .05, 4.5, 8), std({ color: "#ddd", metalness: .7, roughness: .3 }), g); mastG.position.set(0, 4.6, -.5);
    /* jelzőzászlók (P, osztályjel, narancs rajtvonal-zászló) */
    const flags = [];
    ["#ffffff", "#e5262f", "#ff7a00"].forEach((c, i) => {
      const ft = canvasTex(128, 96, (gg) => { gg.fillStyle = i === 0 ? "#1f4fbf" : c; gg.fillRect(0, 0, 128, 96); if (i === 0) { gg.fillStyle = "#fff"; gg.fillRect(36, 26, 56, 44); } if (i === 1) { gg.fillStyle = "#fff"; gg.font = "900 48px system-ui"; gg.textAlign = "center"; gg.fillText("R27", 64, 66); } });
      const f = mesh(new THREE.PlaneGeometry(.9, .62, 6, 1), basic({ map: ft, side: THREE.DoubleSide }), g);
      f.position.set(.45, 6.5 - i * .85, -.5); f.visible = i !== 0; flags.push(f);
    });
    /* X lobogó (egyéni visszahívás – korai rajt): fehér alapon kék kereszt; alapból lent */
    { const xt = canvasTex(128, 96, (gg) => { gg.fillStyle = "#ffffff"; gg.fillRect(0, 0, 128, 96); gg.fillStyle = "#1f4fbf"; gg.fillRect(52, 0, 24, 96); gg.fillRect(0, 36, 128, 24); });
      const f = mesh(new THREE.PlaneGeometry(.9, .62, 6, 1), basic({ map: xt, side: THREE.DoubleSide }), g); f.position.set(.45, 7.35, -.5); f.visible = false; flags.push(f); }
    g.userData.flags = flags;
    return g;
  }

  /* ------------------------------------------------------------------ POLÁRDIAGRAM (12 csomós szél) – csomó a valódi szélirányhoz mért szög szerint */
  function polar(twaDeg, spin) {
    const P = [[0, 0], [32, 0], [38, 4.4], [45, 5.6], [60, 6.3], [90, 6.9], [110, spin ? 7.3 : 6.9], [135, spin ? 7.4 : 6.4], [150, spin ? 6.9 : 5.9], [180, spin ? 5.8 : 5.2]];
    const a = Math.abs(twaDeg);
    for (let i = 1; i < P.length; i++) if (a <= P[i][0]) { const k = (a - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return lerp(P[i - 1][1], P[i][1], k); }
    return P[P.length - 1][1];
  }
  const KN = .5144;

  /* =================================================================== 1. REGATTA A NAPOZÓSTÉGNÉL */
  const REG = {};
  const BOATS = [
    { name: "Zephyr", num: " ", cls: " ", hull: "#f5f2e8", boot: "#141d4d", stripe: "#141d4d", jib: "#f6f4ec", main: "#d61f26", spin: ["#ffffff", "#ffffff", "#f3f3ee"], skill: 1.02, logoImg: "img/zephyr-hajo-logo.png", reg: "H-30381", lazyBag: "#6e1423", nsCol: "#3f6fa6", teakDeck: true, outboard: true }   /* 2026-11-11: a valódi hajó fotói szerint */,
    { name: "Szélvész", num: "HUN 113", hull: "#13305e", boot: "#ffffff", stripe: "#ffd166", jib: "#eeede6", main: "#f1efe6", spin: ["#13305e", "#ffd166", "#13305e"], skill: 1.03 },
    { name: "Kékszalag", num: "HUN 7", hull: "#f4f4f0", boot: "#1f5fa8", stripe: "#1f5fa8", jib: "#e9ecef", main: "#e8e4d8", spin: ["#1f5fa8", "#7fc8f8", "#ffffff"], skill: 1.0 },
    { name: "Balaton Nimfa", num: "HUN 88", hull: "#9aa5ae", boot: "#22272e", stripe: "#22272e", jib: "#d8d9d4", main: "#d9d7cf", spin: ["#3fb37f", "#ffffff", "#3fb37f"], skill: .98 },
    { name: "Tihanyi Visszhang", num: "HUN 451", hull: "#a8211f", boot: "#ffffff", stripe: "#ffffff", jib: "#f2f0e8", main: "#f2f0e8", spin: ["#ff7a00", "#ffd166", "#ff7a00"], skill: .99 },
    { name: "Siófoki Fecske", num: "HUN 312", hull: "#f6f6f2", boot: "#0b0f14", stripe: "#0b0f14", jib: "#2b2f36", main: "#e5e3dc", spin: ["#0b0f14", "#e5262f", "#ffffff"], skill: .97 },
    { name: "Fehér Holló", num: "HUN 29", hull: "#ffffff", boot: "#2bb3c0", stripe: "#2bb3c0", jib: "#f4f3ee", main: "#f4f3ee", spin: ["#2bb3c0", "#ffffff", "#9b6be2"], skill: 1.01 },
    { name: "Napraforgó", num: "HUN 64", hull: "#f0d68a", boot: "#5b3b12", stripe: "#5b3b12", jib: "#f6f1df", main: "#f6f1df", spin: ["#ffd166", "#e08a1e", "#ffd166"], skill: .96 }
  ];
  function buildRegatta() {
    const root = W.root;
    /* a stég panorámája marad a háttér: a 3D hajók elé kerülnek */
    const waterY = (T.inVR ? T.headY() : 0) - 2.3;
    REG.waterY = waterY;
    const course = new THREE.Group(); course.position.y = waterY; root.add(course); REG.g = course;
    /* irányok: a panoráma u = 0,72 iránya a nyílt víz (a stég „Balaton felé” nézete) */
    const ua = .72 * TAU, F = new THREE.Vector3(Math.cos(ua), 0, Math.sin(ua)), Rv = new THREE.Vector3(-F.z, 0, F.x);
    REG.F = F; REG.R = Rv;
    const P = (f, r) => new THREE.Vector3().addScaledVector(F, f).addScaledVector(Rv, r);
    REG.P = P;
    /* pálya: rajtvonal 230 m-re (rendezőhajó jobbra, bója balra), szél felőli bója 760 m-en, kapu 320 m-en */
    REG.marks = { W: [760, -12], G: [320, 0], Ga: [320, -20], Gb: [320, 20], C: [230, 62], Pn: [230, -62] };
    const add = (o, f, r) => { o.position.copy(P(f, r)); course.add(o); return o; };
    REG.buoyW = add(makeBuoy("#ff7a00", 2.2), ...REG.marks.W);
    add(makeBuoy("#ffd166", 1.9), ...REG.marks.Ga); add(makeBuoy("#ffd166", 1.9), ...REG.marks.Gb);
    REG.pin = add(makeBuoy("#ff7a00", 1.6), ...REG.marks.Pn);
    const cb = add(makeCommittee(), ...REG.marks.C); cb.rotation.y = Math.atan2(Rv.x, Rv.z); REG.cb = cb;
    /* hajók */
    REG.boats = BOATS.map((b, i) => {
      const g = makeBoat(Object.assign({ detail: 0, crew: 3 }, b)); course.add(g); try { vrBake(g); } catch (e) {}   /* 2026-11-11: kisütött fény a regatta hajóin is */
      const wk = makeWake(course, .6);
      /* láthatatlan, nagy „rámutatási” doboz a hajó körül */
      const hit = mesh(new THREE.BoxGeometry(4, 13, 10), basic({ visible: false }), g); hit.position.y = 6;
      const st = { i, b, g, wk, hit, f: 120 - (i % 4) * 18 - rand() * 20, r: -90 + i * 25 + rand() * 10, hd: (i % 2 ? 1 : -1) * 1.7, v: 2.4, leg: -1, tack: i % 2 ? 1 : -1, spin: 0, ph: rand() * 9, fin: 0, done: false, pts: 0, label: null };
      hit.userData.xr = { hover: (on) => regLabel(st, on), click: () => { st.pin = !st.pin; regLabel(st, true); } };
      T.xr.extra.add(hit); W.objs.push(hit);
      return st;
    });
    REG.t = -75; REG.speed = 2; REG.legs = ["W", "G", "W", "F"]; REG.horns = {}; REG.finishOrder = []; REG.restartAt = null;
    /* fények: a panoráma napjához (jobbra fent) */
    REG.lights = addLights(new THREE.Vector3(Math.cos(.9 * TAU), .75, Math.sin(.9 * TAU)).normalize());
    /* a vízvonal alatti részek ne látszanak a fotó vizén: vágósík */
    const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -waterY);
    W.disposables.forEach((m) => { if (m && m.isMeshStandardMaterial) { m.clippingPlanes = [clip]; m.needsUpdate = true; } });
    T.sceneEl.renderer.localClippingEnabled = true;
    faceYaw(Math.atan2(-F.x, -F.z));   /* a víz felé fordulunk */
    audioStart({ water: .025, wind: .015 });
    return { tick: regTick, panel: regPanel, hud: regHud };
  }
  function regLabel(st, on) {
    const rank = REG.rank ? REG.rank.indexOf(st) + 1 : 0, L = [st.b.name, st.b.num + (rank ? " · " + rank + ". hely" : "")];
    if (!st.label) { st.label = labelSprite(L, { size: 9 }); st.label.position.set(0, 16, 0); st.g.add(st.label); }
    st.label.userData.set(L); st.label.visible = !!(on || st.pin);
  }
  function legTarget(st) {
    const m = REG.marks, L = REG.legs[st.leg];
    if (st.leg < 0) return REG.t < -14 ? [150 + Math.sin(REG.t * .05 + st.ph) * 40, -40 + st.i * 12] : [232, -50 + st.i * 14];
    if (L === "W") return m.W; if (L === "G") return m.G; if (L === "F") return [232, 0];
    return m.W;
  }
  function regTick(dt) {
    const sdt = dt * REG.speed;
    REG.t += sdt;
    /* rajteljárás: kürt -60, -30, 0 mp-nél (gyorsított idő) */
    [-60, -30, 0].forEach((tt) => { if (REG.t >= tt && !REG.horns[tt]) { REG.horns[tt] = 1; horn(tt === 0 ? 1.4 : .8, .16); const fl = REG.cb.userData.flags; if (tt === -60) fl[0].visible = true; if (tt === 0) fl[0].visible = false; } });
    const ranks = [];
    REG.boats.forEach((st) => {
      if (st.leg < 0 && REG.t >= 0) st.leg = 0;
      const [tf, tr] = legTarget(st);
      const df = tf - st.f, dr = tr - st.r, dist = Math.hypot(df, dr);
      const brg = Math.atan2(dr, df);   /* 0 = szél felé (a szél a nyílt víz felől fúj) */
      let want = brg;
      const up = Math.abs(brg) < 44 * D2R, down = Math.abs(brg) > 150 * D2R;
      if (st.done) want = st.hd;
      else if (up) {   /* cirkálás: halzon a laylinig, majd forduló */
        want = st.tack * 44 * D2R;
        const other = -st.tack * 44 * D2R;
        if ((st.tack > 0 && brg <= other + 2 * D2R) || (st.tack < 0 && brg >= other - 2 * D2R) || Math.abs(st.r) > 230 && Math.sign(st.r) === st.tack) { st.tack = -st.tack; want = st.tack * 44 * D2R; if (st.i === 0) { flap(.05); } }
      } else if (down && st.leg >= 0) {   /* hátszél: mély szögekkel, jibbeléssel */
        want = st.tack * 150 * D2R;
        const other = -st.tack * 150 * D2R;
        if ((st.tack > 0 && brg < 0 && brg >= other - 3 * D2R) || (st.tack < 0 && brg > 0 && brg <= other + 3 * D2R) || Math.abs(st.r) > 200 && Math.sign(st.r) === st.tack) st.tack = -st.tack, want = st.tack * 150 * D2R;
      }
      /* egymás kerülése */
      REG.boats.forEach((o) => { if (o === st) return; const ddf = o.f - st.f, ddr = o.r - st.r, d = Math.hypot(ddf, ddr); if (d < 14) want += (Math.atan2(ddr, ddf) > st.hd ? -1 : 1) * .25 * (1 - d / 14); });
      st.hd += clamp(wrapA(want - st.hd), -.32 * sdt, .32 * sdt);
      const twa = Math.abs(wrapA(st.hd)) * R2D;
      st.spin += ((twa > 112 && st.leg >= 0 && !st.done ? 1 : 0) - st.spin) * Math.min(1, sdt * .35);
      const vt = polar(twa, st.spin > .5) * KN * st.b.skill * (st.done ? .35 : 1);
      st.v += (vt - st.v) * Math.min(1, sdt / 6);
      st.f += Math.cos(st.hd) * st.v * sdt; st.r += Math.sin(st.hd) * st.v * sdt;
      /* bójakerülés, befutó */
      if (st.leg >= 0 && !st.done && dist < (REG.legs[st.leg] === "F" ? 60 : 18)) {
        if (REG.legs[st.leg] === "F" && Math.abs(st.f - 232) < 10) { st.done = true; st.fin = REG.t; REG.finishOrder.push(st); horn(.35, .1); }
        else if (REG.legs[st.leg] !== "F") st.leg++;
      }
      st.prog = (st.done ? 1e6 - st.fin : 0) + st.leg * 2000 - dist;
      ranks.push(st);
      /* megjelenítés */
      const p = REG.P(st.f, st.r), dirW = REG.P(Math.cos(st.hd), Math.sin(st.hd));
      st.g.position.set(p.x, Math.sin(W.t * 1.7 + st.ph) * .05, p.z);
      st.g.rotation.y = Math.atan2(dirW.x, dirW.z);
      const S = st.g.userData.S, yaw = st.g.rotation.y, X = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const windFrom = REG.F;   /* a szél a nyílt víz felől fúj */
      S.side = windFrom.dot(X) > 0 ? -1 : 1;
      S.boom = clamp((twa - 28) * .78, 7, 82) * D2R * S.side;
      S.jib = clamp((twa - 28) * .55, 8, 52) * D2R;
      S.luff = clamp(1 - (twa - 18) / 18, 0, 1);
      S.spin = st.spin;
      const heel = clamp(Math.sin(clamp(twa, 0, 180) * D2R) ** 1.4 * (st.v / 3.4) * 20 * (1 - st.spin * .6), 0, 24) * D2R;
      S.heel = -S.side * heel; S.pitch = Math.sin(W.t * 1.3 + st.ph) * .025;
      st.g.userData.update(dt);
      st.wk.push(p.x, p.z, Math.atan2(dirW.x, dirW.z), st.v, sdt, .04);
    });
    ranks.sort((a, b) => b.prog - a.prog); REG.rank = ranks;
    /* újrakezdés, ha mindenki beért */
    if (REG.finishOrder.length === REG.boats.length && !REG.restartAt) REG.restartAt = REG.t + 40;
    if (REG.restartAt && REG.t > REG.restartAt) regRestart();
    W.panelDirty = (W.panelDirty || 0) + dt;
  }
  function regRestart() {
    REG.t = -75; REG.horns = {}; REG.finishOrder = []; REG.restartAt = null;
    REG.boats.forEach((st, i) => { st.leg = -1; st.done = false; st.f = 120 - (i % 4) * 18 - rand() * 20; st.r = -90 + i * 25; st.hd = (i % 2 ? 1 : -1) * 1.7; st.v = 2.2; st.spin = 0; });
  }
  function regStatus() {
    const t = REG.t;
    if (t < 0) return "Rajt " + Math.ceil(-t) + " mp múlva";
    if (REG.finishOrder.length === REG.boats.length) return "Vége – új futam hamarosan";
    const lead = REG.rank && REG.rank[0]; const L = lead ? REG.legs[Math.max(0, lead.leg)] : "W";
    return (lead && lead.leg >= 2 ? "2. kör" : "1. kör") + " · " + (L === "W" ? "felvonal (cirkálás)" : L === "G" ? "hátszél (spinakker)" : "befutó felé");
  }
  function regPanel(P) {
    P.title("Zephyr Kupa · Balaton", regStatus());
    const rk = REG.rank || REG.boats;
    rk.slice(0, 6).forEach((st, i) => P.row(i, `${i + 1}. ${st.b.num}  ${st.b.name}`, st.b.jib === "#d61f26" ? "#d61f26" : st.b.hull, st.done ? "célban" : ""));
    P.buttons([["×1", () => REG.speed = 1, REG.speed === 1], ["×2", () => REG.speed = 2, REG.speed === 2], ["×4", () => REG.speed = 4, REG.speed === 4], ["Új futam", regRestart], ["‹ Vissza a sétához", () => W.close()]]);
  }
  function regHud(H) {
    H.title("Regatta a napozóstégnél", regStatus());
    H.list((REG.rank || REG.boats).slice(0, 5).map((st, i) => `${i + 1}. ${st.b.num} ${st.b.name}`));
    H.buttons([["×1", () => REG.speed = 1], ["×2", () => REG.speed = 2], ["×4", () => REG.speed = 4], ["Új futam", regRestart]]);
    H.hint("Fogd és húzd a képet a körbenézéshez · koppints egy hajóra a nevéért");
  }

  /* =================================================================== 2. VITORLÁZÁS A ZEPHYRREL
     tó-koordináták: x = kelet, z = dél (észak = −z), méter; a hajó a Zamárdi strand előtt indul (~1,5 km-re) */
  const SAIL = {};
  const TWS = 12 * KN, WIND_FROM = 315 * D2R;   /* 12 csomós északnyugati szél – a Balaton jellegzetes szele */
  const fwd = (b) => [Math.sin(b), -Math.cos(b)];
  function buildSail() {
    const root = W.root;
    WIND_DIR = Math.atan2(-Math.cos(WIND_FROM + Math.PI), Math.sin(WIND_FROM + Math.PI));   /* a hullámok a szél irányába haladnak */
    {
      const to = WIND_FROM + Math.PI; const d = fwd(to); WIND_DIR = Math.atan2(d[1], d[0]);
    }
    /* távoli környezet (ég, partok) – csak forog; közeli környezet (víz, más hajók) – forog és eltolódik */
    const far = new THREE.Group(), env = new THREE.Group(); root.add(far); root.add(env);
    SAIL.far = far; SAIL.env = env;
    makeSky(far); makeShores(far);
    SAIL.water = makeWater(env);
    /* saját hajó: a felhasználó a kormánynál áll; a hajó orra −z felé */
    const boat = makeBoat({ detail: 1, crew: 0, hull: "#f5f2e8", boot: "#141d4d", stripe: "#141d4d", jib: "#f6f4ec", main: "#d61f26", num: " ", cls: " ", logoImg: "img/zephyr-hajo-logo.png", reg: "H-30381", lazyBag: "#6e1423", nsCol: "#3f6fa6", teakDeck: true, outboard: true, spin: ["#ffffff", "#ffffff", "#f3f3ee"] });
    boat.rotation.y = Math.PI; root.add(boat); SAIL.boat = boat; try { vrBake(boat); } catch (e) {}   /* 2026-11-11: kisütött fény */
    SAIL.wake = makeWake(env, .7);
    /* a felhasználó helye: a kokpitban, a kormányrúd előtt */
    const helm = new THREE.Vector3(0, CK.sole, -1.9);   /* hajó-helyi */
    const helmRoot = helm.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    const eye = T.inVR ? 0 : 1.28;   /* 2D-ben: ülő szemmagasság a kokpitpadló fölött */
    root.position.set(-helmRoot.x, -(helm.y + eye), -helmRoot.z);
    /* állapot */
    Object.assign(SAIL, { x: 0, z: -1500, b: 45 * D2R, v: 2.8, del: 0, heel: 0, side: -1, tack: 0, tackT: 0, luff: 0, grab: false, lastSide: -1, instT: 0, keys: {} });
    /* más vitorlások a környéken + a tihanyi komp + sirályok */
    SAIL.others = [0, 1, 2, 3, 4].map((k) => {
      const b = BOATS[(k + 1) % BOATS.length];
      const g = makeBoat(Object.assign({ detail: 0, crew: 2 }, b)); env.add(g); try { vrBake(g); } catch (e) {}
      const a = rr(0, TAU), d = rr(350, 1400);
      return { g, x: Math.cos(a) * d, z: -1500 + Math.sin(a) * d, b: rr(0, TAU), v: 3, wp: null, ph: rand() * 9, wk: makeWake(env, .55) };
    });
    SAIL.ferry = makeFerry(); env.add(SAIL.ferry.g);
    SAIL.gulls = makeGulls(env);
    SAIL.lights = addLights(SUN.clone());
    /* a kormányrúd megfogható: csippentés (kéz) / ravasz (kontroller) – húzd jobbra-balra */
    const handle = boat.userData.tillerHandle;
    handle.userData.xr = {
      hover: (on) => { SAIL.tHover = on; },
      down: () => { SAIL.grab = true; T.xr && 0; },
      drag: (src) => tillerFromRay(src),
      up: () => { SAIL.grab = false; }
    };
    T.xr.extra.add(handle); W.objs.push(handle);
    faceYaw(0);   /* előre, az orr felé */
    audioStart({ water: .04, wind: .03 });
    return { tick: sailTick, panel: sailPanel, hud: sailHud };
  }
  /* a kormányrúd szöge a sugár és a rúd magasságában fekvő vízszintes sík metszéspontjából */
  const _pl = new THREE.Plane(), _ray = new THREE.Ray(), _hit = new THREE.Vector3();
  function tillerFromRay(src) {
    const piv = SAIL.boat.userData.tillerPivot; const pw = new THREE.Vector3(); piv.getWorldPosition(pw);
    _pl.set(new THREE.Vector3(0, 1, 0), -(pw.y + .3)); _ray.set(src.o, src.d);
    let p = _ray.intersectPlane(_pl, _hit);
    if (!p && src.grip) p = _hit.setFromMatrixPosition(src.grip);
    if (!p) return;
    const lp = SAIL.boat.worldToLocal(p.clone()), lpiv = piv.position;   /* hajó-helyi: +z az orr felé */
    const dx = lp.x - lpiv.x, dz = lp.z - lpiv.z;
    if (dz < .15) return;
    SAIL.del = clamp(-Math.atan2(dx, dz), -.6, .6);   /* + = a rúd a felhasználó jobbja felé (a hajó balra fordul) */
  }
  function sailTick(dt) {
    const S = SAIL;
    /* 2D billentyűk / gombok */
    const k = S.keys; if (k.L || k.R) S.del = clamp(S.del + ((k.R ? 1 : 0) - (k.L ? 1 : 0)) * dt * .9, -.6, .6);
    else if (!S.grab && !T.inVR) S.del *= Math.pow(.25, dt);
    else if (!S.grab) S.del *= Math.pow(.85, dt);
    /* fizika */
    const twaS = wrapA(WIND_FROM - S.b), twa = Math.abs(twaS) * R2D;
    const vt = polar(twa, false) * KN * (1 + .12 * Math.sin(W.t * .23) * Math.sin(W.t * .07));   /* széllökések */
    S.v += (vt - S.v) * Math.min(1, dt / (vt > S.v ? 5 : 7));
    const turn = S.v * Math.sin(S.del) * .16 + Math.sin(S.del) * .05;
    S.b = (S.b - turn * dt + TAU) % TAU;
    const [fx, fz] = fwd(S.b); S.x += fx * S.v * dt; S.z += fz * S.v * dt;
    /* látszólagos szél (a vitorlák trimje és a dőlés ebből) */
    const wf = fwd(WIND_FROM), tw = [wf[0] * TWS, wf[1] * TWS];   /* a szél „honnan” vektora × sebesség */
    const aw = [tw[0] + fx * S.v, tw[1] + fz * S.v], aws = Math.hypot(aw[0], aw[1]);
    const awa = Math.acos(clamp((aw[0] * fx + aw[1] * fz) / (aws || 1), -1, 1)) * R2D;
    const port = [fz, -fx], side = (wf[0] * port[0] + wf[1] * port[1]) > 0 ? -1 : 1;
    if (side !== S.lastSide) { S.lastSide = side; S.tackT = 3.2; flap(.14); setTimeout(winch, 1600); }
    S.tackT = Math.max(0, S.tackT - dt);
    const BS = S.boat.userData.S;
    BS.side = side;
    BS.boom = clamp((awa - 22) * .72, 5, 80) * D2R * side;
    BS.jib = clamp((awa - 22) * .5, 7, 50) * D2R;
    BS.luff = Math.max(clamp(1 - (awa - 16) / 16, 0, 1), S.tackT > 1.2 ? .7 : 0);
    BS.awa = awa; BS.aws = aws; BS.tackT = S.tackT;
    const heelT = clamp(Math.sin(clamp(awa, 0, 180) * D2R) ** 1.5 * (aws / (14 * KN)) ** 2 * 19, 0, 23) * D2R * (1 - BS.luff * .7);
    S.heel += (heelT - S.heel) * Math.min(1, dt * .8);
    BS.heel = -side * S.heel * .8;
    /* ringás a hullámokon (orr és tat magasságkülönbsége) */
    const hb = waveAt(S.x + fx * 3.5, S.z + fz * 3.5, W.t), hs = waveAt(S.x - fx * 3.5, S.z - fz * 3.5, W.t);
    BS.pitch = clamp((hs - hb) / 7 * 1.2, -.06, .06);
    S.boat.position.y = (hb + hs) / 2 * .8;
    S.boat.userData.update(dt);
    /* kormányrúd látványa */
    const tl = S.boat.userData.tiller; if (tl) tl.rotation.y = -S.del;
    /* környezet elhelyezése */
    S.env.rotation.y = S.b; S.far.rotation.y = S.b;
    S.env.position.set(-S.x, 0, -S.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), S.b);
    const wm = S.water; wm.position.set(Math.round(S.x / 40) * 40, 0, Math.round(S.z / 40) * 40);
    const mat = wm.userData.mat; mat.uniforms.uT.value = W.t; mat.uniforms.uOff.value.set(wm.position.x, wm.position.z); mat.uniforms.uWind.value = WIND_DIR;
    const cw = new THREE.Vector3(); T.camObj().getWorldPosition(cw); if (T.inVR) { try { T.sceneEl.renderer.xr.getCamera().getWorldPosition(cw); } catch (e) {} }
    const cl = S.env.worldToLocal(cw.clone()); mat.uniforms.uCam.value.copy(cl);
    S.wake.push(S.x, S.z, Math.atan2(fx, fz), S.v, dt, .05);
    /* más hajók: útpontról útpontra, a szélhez igazodva */
    S.others.forEach((o) => {
      if (!o.wp || Math.hypot(o.wp[0] - o.x, o.wp[1] - o.z) < 40) o.wp = [S.x + rr(-1600, 1600), S.z + rr(-1600, 1600)];
      let want = Math.atan2(o.wp[0] - o.x, -(o.wp[1] - o.z));
      const tw2 = wrapA(WIND_FROM - want); if (Math.abs(tw2) < 46 * D2R) want = WIND_FROM - Math.sign(tw2 || 1) * 46 * D2R;
      o.b += clamp(wrapA(want - o.b), -.2 * dt, .2 * dt);
      const t2 = Math.abs(wrapA(WIND_FROM - o.b)) * R2D; o.v += (polar(t2) * KN - o.v) * dt / 6;
      const f2 = fwd(o.b); o.x += f2[0] * o.v * dt; o.z += f2[1] * o.v * dt;
      o.g.position.set(o.x, Math.sin(W.t * 1.6 + o.ph) * .05, o.z); o.g.rotation.y = Math.atan2(f2[0], f2[1]) + 0;
      /* a modell orra +z; a tóban az irány (sin b, −cos b) → forgatás */
      o.g.rotation.y = Math.atan2(f2[0], f2[1]);
      const OS = o.g.userData.S, yaw = o.g.rotation.y, X = [Math.cos(yaw), -Math.sin(yaw)];
      OS.side = (wf[0] * X[0] + wf[1] * X[1]) > 0 ? -1 : 1;
      OS.boom = clamp((t2 - 28) * .78, 7, 82) * D2R * OS.side; OS.jib = clamp((t2 - 28) * .55, 8, 52) * D2R; OS.luff = clamp(1 - (t2 - 18) / 18, 0, 1);
      OS.heel = -OS.side * clamp(Math.sin(t2 * D2R) ** 1.4 * 18, 0, 22) * D2R; OS.pitch = Math.sin(W.t * 1.2 + o.ph) * .025;
      o.g.userData.update(dt); o.wk.push(o.x, o.z, o.g.rotation.y, o.v, dt, .05);
    });
    S.ferry.tick(dt); S.gulls.tick(dt, S.x, S.z);
    /* hangok: víz zúgása a sebességgel, szél a látszólagos széllel */
    AU.set("rush", clamp((S.v - 1) / 4, 0, 1) * .05, .4); AU.set("wind", clamp(aws / (16 * KN), 0, 1) * .04, .6); AU.set("water", .035, 1);
    if (AU.rush) AU.rush.f.frequency.setTargetAtTime(900 + S.v * 220, T.ac().currentTime, .4);
    /* műszerek */
    S.instT -= dt; S.awa = awa; S.aws = aws; S.twa = twa;
    if (S.instT <= 0) { S.instT = .35; drawInstruments(); }
    W.panelDirty = (W.panelDirty || 0) + dt;
  }
  function drawInstruments() {
    const t = SAIL.boat.userData.instTex; if (!t) return; const g = t._canvas.getContext("2d"), w = 512, h = 256;
    g.fillStyle = "#06090d"; g.fillRect(0, 0, w, h);
    const cell = (x, lbl, val, unit) => { g.fillStyle = "#7fd3ff"; g.font = "600 26px system-ui"; g.textAlign = "left"; g.fillText(lbl, x + 14, 40); g.fillStyle = "#e9f6ff"; g.font = "800 92px system-ui"; g.fillText(val, x + 10, 150); g.fillStyle = "#7fd3ff"; g.font = "600 26px system-ui"; g.fillText(unit, x + 14, 200); };
    cell(0, "SEBESSÉG", (SAIL.v / KN).toFixed(1), "csomó");
    cell(256, "SZÉL", Math.round(SAIL.awa) + "°", (SAIL.aws / KN).toFixed(0) + " csomó");
    g.strokeStyle = "#1c2a36"; g.lineWidth = 3; g.beginPath(); g.moveTo(256, 18); g.lineTo(256, 238); g.stroke();
    t.needsUpdate = true;
  }
  const PTS = ["Szél ellen (cirkálás)", "Félszél", "Bővszél", "Hátszél"];
  function pointOfSail(twa) { return twa < 32 ? "Szél ellen – fordulj el!" : twa < 60 ? PTS[0] : twa < 110 ? PTS[1] : twa < 150 ? PTS[2] : PTS[3]; }
  const BRG = ["É", "ÉK", "K", "DK", "D", "DNy", "Ny", "ÉNy"];
  function sailPanel(P) {
    const S = SAIL;
    P.title("Zephyr · Raptor 27", `${(S.v / KN).toFixed(1)} csomó · ${BRG[Math.round(S.b * R2D / 45) % 8]} · ${pointOfSail(S.twa || 90)}`);
    P.row(0, "Fogd meg a kormányrudat (csippentés), és told jobbra-balra.", "#ffd166");
    P.row(1, "A rúd jobbra → a hajó balra fordul (mint a valóságban).", "#ffffff");
    P.row(2, "Fordulóhoz vezesd át az orrot a szél irányán.", "#ffffff");
    P.row(3, "Tihany az orrtól balra-előre, Badacsony messze nyugaton.", "#7fd3ff");
    P.buttons([["Egyenesbe", () => SAIL.del = 0], ["‹ Vissza a sétához", () => W.close()]]);
  }
  function sailHud(H) {
    const S = SAIL;
    H.title("Vitorlázás a Zephyrrel", `${(S.v / KN).toFixed(1)} csomó · ${pointOfSail(S.twa || 90)}`);
    H.steer();
    H.hint("Kormány: ◀ ▶ gomb vagy a ← → (A / D) billentyű · körbenézés: húzd a képet");
  }
  /* --- a Szántód–Tihany komp (két irányba jár) */
  function makeFerry() {
    const g = new THREE.Group(), w = std({ color: "#f4f4f0", roughness: .4 }), b = std({ color: "#1d4f91", roughness: .45 }), d = std({ color: "#3a3f45" });
    const h = mesh(new THREE.BoxGeometry(9, 1.6, 40), w, g); h.position.y = .5;
    const st = mesh(new THREE.BoxGeometry(9.05, .5, 40.05), b, g); st.position.y = .2;
    const cab = mesh(new THREE.BoxGeometry(4, 3.2, 7), w, g); cab.position.set(2.2, 2.8, 0);
    const win = mesh(new THREE.BoxGeometry(4.05, .8, 6), std({ color: "#1d2a36", metalness: .5, roughness: .1 }), g); win.position.set(2.2, 3.4, 0);
    const fun = mesh(new THREE.CylinderGeometry(.5, .6, 2.4, 12), std({ color: "#c62828" }), g); fun.position.set(2.2, 5.3, -1.2);
    for (let k = 0; k < 6; k++) { const car = mesh(new THREE.BoxGeometry(1.8, 1.4, 4.2), std({ color: ["#c62828", "#e9ecef", "#1f5fa8", "#2b2f36", "#ffd166", "#9aa5ae"][k], metalness: .4, roughness: .3 }), g); car.position.set(-2.4 + (k % 2) * 0, 1.95, -15 + k * 6); }
    /* útvonal tó-koordinátákban: Szántód rév → Tihany rév */
    const A = [-2900, -900], B = [-4200, -3600];
    let k = rand(), dir = 1;
    return { g, tick(dt) { k += dir * dt / 420; if (k > 1 || k < 0) { dir = -dir; k = clamp(k, 0, 1); } const x = lerp(A[0], B[0], k), z = lerp(A[1], B[1], k); g.position.set(x, Math.sin(W.t * .8) * .06, z); g.rotation.y = Math.atan2(B[0] - A[0], B[1] - A[1]) + (dir < 0 ? Math.PI : 0); } };
  }
  /* --- sirályok: körözve, néha szárnycsapással */
  function makeGulls(parent) {
    const g = new THREE.Group(); parent.add(g);
    const wm = std({ color: "#f2f2f2", roughness: .8, side: THREE.DoubleSide }), tip = std({ color: "#2b2f36", side: THREE.DoubleSide });
    const list = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Group(); g.add(b);
      const body = mesh(new THREE.CapsuleGeometry(.07, .28, 3, 8), wm, b); body.rotation.x = Math.PI / 2;
      const wl = new THREE.Group(), wr = new THREE.Group(); b.add(wl, wr);
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(.55, .05); shape.lineTo(.6, -.12); shape.lineTo(0, -.18); shape.closePath();
      const sg = new THREE.ShapeGeometry(shape); sg.rotateX(-Math.PI / 2);
      mesh(sg, wm, wl); const sg2 = sg.clone(); sg2.scale(-1, 1, 1); mesh(sg2, wm, wr);
      list.push({ b, wl, wr, r: rr(25, 70), h: rr(9, 22), sp: rr(.15, .3) * (rand() < .5 ? -1 : 1), a: rr(0, TAU), ph: rr(0, 9), cx: 0, cz: 0 });
    }
    return { tick(dt, x, z) { list.forEach((q) => { q.cx += (x - q.cx) * dt * .05; q.cz += (z - 40 - q.cz) * dt * .05; q.a += q.sp * dt;
      q.b.position.set(q.cx + Math.cos(q.a) * q.r, q.h + Math.sin(W.t * .5 + q.ph) * 1.5, q.cz + Math.sin(q.a) * q.r);
      q.b.rotation.y = -q.a + (q.sp > 0 ? 0 : Math.PI); q.b.rotation.z = q.sp > 0 ? -.3 : .3;
      const f = Math.sin(W.t * 7 + q.ph) * (Math.sin(W.t * .6 + q.ph) > .3 ? .6 : .08); q.wl.rotation.z = f; q.wr.rotation.z = -f; }); } };
  }

  /* =================================================================== 2/B. VITORLÁSVERSENY A HAJÓBAN ÁLLVA (VR) – 2026. nov. 6., a tulajdonos kérésére
     A stégjátékok „Vitorlás-regatta” játéka életnagyságban: TE vezeted a nagy, 15 méteres versenyjacht „Zephyr”-t, három ellenfél ellen.
     • Csak a kormánykereket kell kezelni (a vitorlákat a legénység trimmeli): fogd meg a kerék peremét (csippentés vagy ravasz), és forgasd,
       mint egy igazi hajókormányt – jobbra forgatva a hajó jobbra fordul. 2D-ben: ◀ ▶ gomb vagy ← → / A D billentyű.
     • A hajó: modern versenyjacht (TP52-szerű) – lapos tíkfedélzet, két nagy karbon kormánykerék talapzaton, tetejükön iránytű és
       műszerkijelző, csörlők a peremen, főszkóta-sín (traveller) a kerekek előtt, korlátok, achterstag, a legénység a szél felőli oldalon.
     • A verseny: rajt a rendezőhajó és a bója közötti vonalon (visszaszámlálás, kürtszó), a bójákat bal kéz felől kell kerülni,
       a befutó ugyanaz a vonal. Minden futam más pályát és szelet hoz (a stégjáték pályasablonjai szerint); a szintek egyre gyorsabb ellenfeleket adnak.
     Tó-koordináták mint a vitorlázásnál: x = kelet, z = dél (É = −z); irányszög b: 0 = É, + = óramutató szerint; fwd(b) = (sin b, −cos b). */
  const VRR = {}; W._race = VRR; W._makeBoat = (o) => makeBoat(o); W._raceTick = (dt) => vrTick(dt);   /* teszteléshez */
  const VR_SC = 1.85;   /* a saját hajó nagyítása: 8,2 m → 15,2 m */
  const VR_RIV = [
    { name: "Kék Fecske", num: "HUN 7", hull: "#ffffff", boot: "#1f5fa8", stripe: "#1f5fa8", jib: "#f2f4f6", main: "#f4f4f0", spin: ["#1f5fa8", "#ffffff", "#7fc4ff"] },
    { name: "Sárga Szél", num: "HUN 21", hull: "#f4f6f8", boot: "#f2b233", stripe: "#f2b233", jib: "#fff6d6", main: "#fff6d6", spin: ["#f2b233", "#ffffff", "#e2483d"] },
    { name: "Tihanyi Csillag", num: "HUN 3", hull: "#1f3d2a", boot: "#ffffff", stripe: "#f2b233", jib: "#ffffff", main: "#f2f2ee", spin: ["#2e7d32", "#ffffff", "#f2b233"] }
  ];
  /* pályasablonok (a stégjáték „gameRace” TPL-je nyomán): [keresztirányú (−1..1), széllel szembeni (0..1)] */
  const VR_TPL = [
    { n: "Felszél–hátszél", m: [[0, 1], [0, .12]] },
    { n: "Háromszög", m: [[-1, .95], [1, .7]] },
    { n: "Szlalom", m: [[-.6, .55], [.6, .75], [-.4, 1]] },
    { n: "Tihanyi kör", m: [[1, 1], [-1, 1], [0, .5]] },
    { n: "Nagy ív", m: [[1, .6], [.3, 1], [-1, .8]] }
  ];
  const vrRng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t2 = Math.imul(seed ^ seed >>> 15, 1 | seed); t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2; return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296; };
  const vfwd = (b) => [Math.sin(b), -Math.cos(b)];
  /* pálya + szél egy futamhoz: a rajtvonal közepe (0,0); a szél iránya és ereje futamonként más */
  function vrCourse(lvl) {
    const R = vrRng(lvl * 7919 + 13), tp = VR_TPL[(lvl - 1) % VR_TPL.length];
    const wf = (300 + R() * 60) * D2R, side = R() < .3 ? (R() < .5 ? -1 : 1) * (.35 + R() * .3) : (R() - .5) * .25;   /* néha oldalszél: a pálya tengelye elfordul */
    const axis = wf + side, u = vfwd(axis), c = [-u[1], u[0]];   /* u: a pálya „felfelé” iránya; c: jobbra */
    const D = 300 + R() * 60, A = 120 + R() * 40;
    const marks = tp.m.map(([x, z]) => ({ x: u[0] * D * z + c[0] * A * x * (.85 + R() * .3), z: u[1] * D * z + c[1] * A * x * (.85 + R() * .3) }));
    const L = 70;   /* a rajtvonal hossza */
    return { name: tp.n, lvl, wf, tws: (10 + R() * 6) * KN, marks, u, c, line: { a: { x: -c[0] * L / 2, z: -c[1] * L / 2 }, b: { x: c[0] * L / 2, z: c[1] * L / 2 } } };
  }
  /* --------------------------------------------------------------- a nagy versenyjacht kokpitja (méterben, a skálázott hajó helyi terében) */
  function vrCockpit(boat) {
    const body = boat.userData.body;
    const G = new THREE.Group(); G.scale.setScalar(1 / VR_SC); body.add(G);   /* G-ben méterben dolgozunk (a hajó helyi tere ×1,85) */
    const sh = (u) => { const s = hullShape(u); return { z: s.z * VR_SC, hb: s.hb * VR_SC, y: (s.sheer + .07) * VR_SC }; };
    const carbon = std({ color: "#1b1d21", roughness: .35, metalness: .4 }), chrome = std({ color: "#e6eaee", roughness: .12, metalness: 1 }), leather = std({ color: "#5a3a24", roughness: .7 });
    const white = std({ color: "#f6f6f2", roughness: .3 }), grey = std({ color: "#3a3f46", roughness: .5, metalness: .3 });
    const teakT = canvasTex(512, 512, (gg, w, h) => { for (let y = 0, j = 0; y < h; y += 16, j++) { const off = (j * 97) % 256; for (let x = -off; x < w; x += 256) { gg.fillStyle = `hsl(${rr(26, 31)},${rr(36, 48)}%,${rr(38, 47)}%)`; gg.fillRect(x, y, 254, 14); for (let k = 0; k < 6; k++) { gg.fillStyle = `rgba(60,32,14,${rr(.06, .15)})`; gg.fillRect(x + rand() * 240, y + rr(2, 12), rr(30, 120), 1); } gg.fillStyle = "#17140f"; gg.fillRect(x + 254, y, 2, 14); } gg.fillStyle = "#17140f"; gg.fillRect(0, y + 14, w, 2); } });
    teakT.wrapS = teakT.wrapT = THREE.RepeatWrapping; teakT.repeat.set(3, 9);
    const teak = std({ map: teakT, roughness: .75 });
    /* tíkborítás a fedélzet hátsó harmadán (a tükörtől a kerekek előtti utazósínig), a fedélzet ívét követve */
    { const N = 24, pos = [], uv = [], idx = []; const u0 = .005, u1 = .36;
      for (let i = 0; i <= N; i++) { const u = u0 + (u1 - u0) * i / N, s = sh(u); for (let j = 0; j <= 8; j++) { const f = j / 8 * 2 - 1, x = f * (s.hb - .12); const camb = .07 * VR_SC * (1 - f * f) * .9; pos.push(x, s.y - .07 * VR_SC + camb + .012, s.z); uv.push(x / 1.6, s.z / 1.6); } }
      for (let i = 0; i < N; i++) for (let j = 0; j < 8; j++) { const a = i * 9 + j, b = a + 1, c = a + 9, d = c + 1; idx.push(a, c, b, b, c, d); }
      const ge = new THREE.BufferGeometry(); ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); ge.setIndex(idx); ge.computeVertexNormals(); mesh(ge, teak, G).receiveShadow = true; }
    const helmU = .14, hs = sh(helmU), deckY = hs.y + .02;
    /* a kajüttető lapos, versenyhajós (TP52-szerű) – a makeBoat túraszerű kajütjét alacsonyabbra nyomjuk, sötét ablaksávot és lejárót kap */
    body.children.forEach((m) => { if (m.isMesh && m.geometry && m.geometry.type === "ExtrudeGeometry") { m.scale.y = .58; } });
    { const cy = (hullShape(.42).sheer + .02) * VR_SC, glassM = std({ color: "#121a22", roughness: .05, metalness: .6 });
      [-1, 1].forEach((sd) => { const wn = mesh(new THREE.PlaneGeometry(2.6, .14), glassM, G); wn.position.set(sd * 1.62, cy + .24, .25); wn.rotation.y = sd * Math.PI / 2; wn.rotation.x = 0; });
      const comp = mesh(new THREE.PlaneGeometry(.75, .42), glassM, G); comp.position.set(0, cy + .22, (-1.33) * VR_SC + .1 - .02); comp.rotation.y = Math.PI; }
    /* a kajüttető: csúszásgátló szürke felület, két tetőablak, kapaszkodók */
    { const cy2 = (hullShape(.42).sheer + .02) * VR_SC + .52, ns = std({ color: "#d9dad6", roughness: .95 }), gl2 = std({ color: "#121a22", roughness: .05, metalness: .6 });
      const pad = mesh(new THREE.BoxGeometry(2.6, .01, 3.6), ns, G); pad.position.set(0, cy2, .5);
      [-1, 1].forEach((sd) => { const hatch = mesh(new THREE.BoxGeometry(.55, .04, .55), gl2, G); hatch.position.set(sd * .55, cy2 + .02, 1.6); const hr = mesh(new THREE.BoxGeometry(.05, .06, 2.4), teak, G); hr.position.set(sd * 1.1, cy2 + .04, .3); }); }
    /* a két kerék: talapzat (karbon oszlop), tetején iránytű-búra és műszer; a kerék karbon, bőrrel bevont peremmel, 6 küllővel */
    const WR = .46, wheels = [];   /* kisebb, kézre eső kerék (a tulajdonos kérése) – átmérő ~92 cm */
    const instT = canvasTex(512, 512, (gg) => { gg.fillStyle = "#06090d"; gg.fillRect(0, 0, 512, 512); });
    const chartT = canvasTex(1024, 1024, (gg) => { gg.fillStyle = "#0a2236"; gg.fillRect(0, 0, 1024, 1024); }); chartT.anisotropy = 4;
    [-1, 1].forEach((sd) => {
      const x = sd * (hs.hb - .78), z = hs.z + .55;
      const ped = new THREE.Group(); G.add(ped); ped.position.set(x, deckY, z);
      const col = mesh(new THREE.CylinderGeometry(.075, .11, 1.0, 16), carbon, ped); col.position.y = .5;
      const foot = mesh(new THREE.CylinderGeometry(.2, .24, .04, 20), chrome, ped); foot.position.y = .02;
      const head = mesh(new THREE.BoxGeometry(.26, .18, .3), carbon, ped); head.position.set(0, 1.04, -.02);
      const dome = mesh(new THREE.SphereGeometry(.1, 20, 12, 0, TAU, 0, Math.PI / 2), std({ color: "#20303e", roughness: .05, metalness: .3, transparent: true, opacity: .75 }), ped); dome.position.set(0, 1.13, -.05);
      const card = mesh(new THREE.CylinderGeometry(.085, .085, .02, 24), std({ color: "#f2e6c8", roughness: .5 }), ped); card.position.set(0, 1.14, -.05);
      /* a műszerkijelző a talapzat tetején, a kormányos felé döntve (élő adatok) */
      const scr = mesh(new THREE.PlaneGeometry(.34, .34), basic({ map: instT }), ped); scr.position.set(0, 1.2, -.2); scr.rotation.set(-.5, Math.PI, 0);   /* nagyobb kijelző: bója-irány, távolság, sebesség, kis pályatérkép */
      /* TÉRKÉP-PLOTTER a kormányos előtt, kis karon a kerék fölött (csak a te kerekednél): pálya, ideális útvonal, számozott bóják,
         kerülési irány, a hajód és a nyomvonalad, ellenfelek, szél – folyamatosan, a hajó orra felé forgatva */
      if (sd < 0) { const arm = mesh(new THREE.CylinderGeometry(.018, .018, .5, 10), chrome, ped); arm.position.set(-.22 * sd, 1.2, -.2); arm.rotation.z = -.9 * sd;
        const frame = mesh(new THREE.BoxGeometry(.48, .43, .03), carbon, ped); frame.position.set(-.4 * sd, 1.42, -.24); frame.rotation.set(-.45, Math.PI - .35 * sd, 0);
        const ch = mesh(new THREE.PlaneGeometry(.45, .4), basic({ map: chartT }), ped); ch.position.copy(frame.position); ch.rotation.copy(frame.rotation); ch.translateZ(.017); }
      /* kapaszkodó a talapzat előtt (rozsdamentes cső) */
      const [gb, mb] = rodGeom(new THREE.Vector3(-.22, 0, .25), new THREE.Vector3(-.22, .95, .1), .016, 8); mesh(gb, chrome, ped).applyMatrix4(mb);
      const [gb2, mb2] = rodGeom(new THREE.Vector3(.22, 0, .25), new THREE.Vector3(.22, .95, .1), .016, 8); mesh(gb2, chrome, ped).applyMatrix4(mb2);
      const [gb3, mb3] = rodGeom(new THREE.Vector3(-.22, .95, .1), new THREE.Vector3(.22, .95, .1), .016, 8); mesh(gb3, chrome, ped).applyMatrix4(mb3);
      /* tengely + kerék (a kerék síkja keresztirányú; a kormányos a tat felől áll mögötte) */
      const axle = mesh(new THREE.CylinderGeometry(.035, .035, .34, 12), chrome, ped); axle.rotation.x = Math.PI / 2; axle.position.set(0, .8, -.24);
      const wheel = new THREE.Group(); ped.add(wheel); wheel.position.set(0, .8, -.42);
      const spin = new THREE.Group(); wheel.add(spin);
      mesh(new THREE.TorusGeometry(WR, .028, 12, 72), carbon, spin);
      const gripM = std({ color: "#5a3a24", roughness: .7, emissive: new THREE.Color("#ffd166"), emissiveIntensity: 0 });
      const grip = mesh(new THREE.TorusGeometry(WR, .034, 10, 72, TAU * .999), gripM, spin); grip.scale.set(1, 1, .85); grip.userData.noBake = true;   /* 2026-11-11: a markolat NEM süthető ki – a „fogom” jelzés (aranyló fény) az élő anyagán él; a kisütés eddig eltüntette */
      /* varrás-mintázat a bőrön: vékony világos gyűrű */
      mesh(new THREE.TorusGeometry(WR + .031, .004, 4, 96), std({ color: "#e8d9b8", roughness: .6 }), spin);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; const sp = mesh(new THREE.BoxGeometry(.03, WR - .07, .022), carbon, spin); sp.position.set(Math.sin(a) * (WR - .07) / 2, Math.cos(a) * (WR - .07) / 2, 0); sp.rotation.z = -a; }
      const hub = mesh(new THREE.CylinderGeometry(.09, .1, .08, 20), chrome, spin); hub.rotation.x = Math.PI / 2;
      const cap = mesh(new THREE.CylinderGeometry(.06, .06, .02, 20), std({ color: "#c62828", roughness: .4 }), spin); cap.rotation.x = Math.PI / 2; cap.position.z = -.05;
      /* a felső jelölés („király-küllő”): fehér szalag a peremen – egyenesben felül van */
      const king = mesh(new THREE.TorusGeometry(WR, .037, 8, 10, .16), white, spin); king.rotation.z = Math.PI / 2 - .08;
      /* láthatatlan, vastag fogófelület a sugaras kezeléshez */
      const hit = mesh(new THREE.TorusGeometry(WR, .14, 6, 32), basic({ visible: false }), wheel);
      /* lábtámasz: döntött tíkblokk a kerék mellett (a kormányos lába ide támaszkodik dőlésben) */
      const fb = mesh(new THREE.BoxGeometry(.5, .1, .16), teak, G); fb.position.set(x + sd * .55, deckY + .05, z - 1.0); fb.rotation.x = -.35;
      wheels.push({ sd, ped, wheel, spin, hit, gripM, WR, axle });
    });
    /* BOTKORMÁNY (2026-11-11, a tulajdonos: „a kormánykerékkel nem boldogulunk – térjünk át a botkormányra, kormánytoldóval, a testem előtt mozgatva; a kerék tűnjön el”):
       kormányrúd a tat közepén (a forgáspont a kormányos mögött), a végén csuklós toldó (hosszabbító), amelynek a markolatát a kéz fogja.
       A rúd a kéz helyéből számolódik (két kör metszése: rúdhossz a forgáspont körül, toldóhossz a kéz körül) – pont úgy mozog, mint az igazi.
       Ellentétes mozgás: a rudat balra húzod → a hajó jobbra fordul. Régi kerék vissza: localStorage „zephyr-kormany” = kerek. */
    /* 2026-11-11 18:54 (tulajdonos: „a kormányrúdnak legalább kétszer olyan hosszúnak kell lennie – nem tudom teljesen eltolni magamtól”): rúd 0,9 → 1,7 m,
       toldó 0,8 → 1,45 m (átlósan fut a kézhez, a markolat a test mellett van, így a teljes karhossz jut a tolásra), és a teljes kormánykitéréshez
       kisebb rúdszög kell (12°) – a markolatot kb. 35 cm-rel kell eltolni/meghúzni a végállásig. */
    /* 2026-11-12 00:42 (tulajdonos: „a vitorlásverseny használhatatlan, rosszabb, mint valaha – a rúd jó helyen volt, csináld vissza úgy, ahogy volt; a lényeg:
       a kezem egy normál mozdulatával végállásig tudjam tolni, ne essek ki a székből, ne kelljen lépnem”): a rúd és a toldó VISSZA az eredeti méretre (0,9 / 0,8 m),
       és a kormányzás már nem a rúd geometriájából jön, hanem a KÉZ ÚTJÁBÓL: a megfogástól számítva 28 cm oldalra = teljes kitérés (TIL.REACH). */
    /* 2026-11-12 00:50 (tulajdonos: „ha balra tolom a rudat, a toldó ráhajlik a kormányra és becsukódik ahelyett, hogy kormányozna – a toldó csak látszatra legyen toldó,
       a viselkedése a kormány MEREV egészének része legyen; a rúd legyen rövidebb, ott legyen a vége, ahol az én vonalam kezdődik, inkább picit hátrébb”):
       a toldó mereven áll a rúdhoz képest (nem csuklik), az egész együtt fordul; a forgáspont hátrébb került, a rúd 0,68 m, a vége a kormányos vonala mögött 5 cm-rel;
       a látszó elfordulás ±21° (TMAX), így a markolat nagyjából a kezeddel együtt megy a 28 cm-es úton. */
    const TIL = { TL: .68, EL: .8, TMAX: .37, REACH: .28, pz: hs.z - 1.35, py: deckY + .62, ty: deckY + .76 };
    { const wood = std({ color: "#8a5326", roughness: .38 }), til = new THREE.Group(); G.add(til); til.position.set(0, TIL.py, TIL.pz);
      const stock = mesh(new THREE.CylinderGeometry(.045, .055, .62, 16), chrome, til); stock.position.y = -.31;
      const headB = mesh(new THREE.BoxGeometry(.12, .1, .2), chrome, til); headB.position.set(0, .01, .04);
      const [gt, mt] = rodGeom(new THREE.Vector3(0, .02, .08), new THREE.Vector3(0, .14, TIL.TL), .03, 12); mesh(gt, wood, til).applyMatrix4(mt);
      const [gt2, mt2] = rodGeom(new THREE.Vector3(0, .02, .08), new THREE.Vector3(0, .07, .45), .04, 12); mesh(gt2, wood, til).applyMatrix4(mt2);   /* a tövénél vastagabb */
      const jt = mesh(new THREE.SphereGeometry(.034, 14, 10), chrome, til); jt.position.set(0, .14, TIL.TL);
      const ext = new THREE.Group(); G.add(ext);
      const tube = mesh(new THREE.CylinderGeometry(.013, .013, TIL.EL - .2, 10), carbon, ext); tube.rotation.x = Math.PI / 2; tube.position.z = (TIL.EL - .2) / 2;
      const gripM = std({ color: "#2a2d33", roughness: .8, emissive: new THREE.Color("#ffd166"), emissiveIntensity: 0 });
      const grip = mesh(new THREE.CylinderGeometry(.021, .021, .22, 14), gripM, ext); grip.rotation.x = Math.PI / 2; grip.position.z = TIL.EL - .1; grip.userData.noBake = true;
      const ball = mesh(new THREE.SphereGeometry(.03, 14, 10), gripM, ext); ball.position.z = TIL.EL + .01; ball.userData.noBake = true;
      Object.assign(TIL, { til, ext, gripM, rest: new THREE.Vector3(-.68, .3, .37).normalize(), end: new THREE.Vector3() }); til.visible = ext.visible = false; }
    /* utazósín (traveller) a kerekek előtt, keresztben; rajta a kocsi, a főszkóta felfut a bumra */
    const tz = hs.z + 2.25, trav = mesh(new THREE.BoxGeometry(2 * (sh(.2).hb - .5), .06, .12), grey, G); trav.position.set(0, sh(.2).y + .05, tz);
    const car = mesh(new THREE.BoxGeometry(.24, .1, .16), carbon, G); car.position.set(0, sh(.2).y + .12, tz);
    /* csörlők: fő génuacsörlők a perem mentén a kerekek előtt, szkótacsörlők, kurblis „daráló” talapzat középen */
    const winch = (x, y, z, r) => { const d = mesh(new THREE.CylinderGeometry(r * .78, r, r * 1.3, 28), chrome, G); d.position.set(x, y + r * .65, z); const t2 = mesh(new THREE.CylinderGeometry(r * .55, r * .72, r * .5, 24), carbon, G); t2.position.set(x, y + r * 1.55, z); d.castShadow = true; };
    [-1, 1].forEach((sd) => { const s1 = sh(.28), s2 = sh(.22); winch(sd * (s1.hb - .3), s1.y, s1.z, .16); winch(sd * (s2.hb - .35), s2.y, s2.z, .12); winch(sd * (sh(.17).hb - .32), sh(.17).y, sh(.17).z, .1);
      /* szkótakötél-tekercsek a csörlők mellett */
      const coil = mesh(new THREE.TorusGeometry(.14, .03, 6, 18), std({ color: sd > 0 ? "#d61f26" : "#1f5fa8", roughness: .9 }), G); coil.rotation.x = Math.PI / 2; coil.position.set(sd * (s1.hb - .7), s1.y + .03, s1.z - .4); });
    { const s3 = sh(.25); const gp = mesh(new THREE.CylinderGeometry(.1, .14, .8, 14), carbon, G); gp.position.set(0, s3.y + .4, s3.z); [-1, 1].forEach((sd) => { const hdl = mesh(new THREE.BoxGeometry(.04, .04, .26), chrome, G); hdl.position.set(sd * .14, s3.y + .82, s3.z); }); }
    /* korlát: oszlopok a fedélzet szélén és két sor drótkorlát, a tatnál nyitott (versenyhajó) */
    { const parts = [];
      const posts = []; for (let u = .05; u <= .9; u += .085) { const s = sh(u); [-1, 1].forEach((sd) => { const b = new THREE.Vector3(sd * (s.hb - .1), s.y - .05, s.z); const t2 = b.clone(); t2.y += .72; posts.push([b, t2, sd]); parts.push(rodGeom(b, t2, .018, 8)); }); }
      [-1, 1].forEach((sd) => { const ps = posts.filter((p) => p[2] === sd); for (let i = 0; i < ps.length - 1; i++) [.72, .38].forEach((h) => parts.push(rodGeom(ps[i][0].clone().setY(ps[i][0].y + h), ps[i + 1][0].clone().setY(ps[i + 1][0].y + h), .006, 4))); });
      mesh(mergeGeoms(parts), chrome, G); }
    /* hátsó navigációs fény, fedélzeti lámpák, a tükör „ZEPHYR · HUN 27” felirata */
    const lampM = std({ color: "#fff6dd", emissive: new THREE.Color("#ffe2a0"), emissiveIntensity: .3 }); [-1, 1].forEach((sd) => { const l = mesh(new THREE.SphereGeometry(.03, 8, 6), lampM, G); l.position.set(sd * (sh(.02).hb - .15), sh(.02).y + .02, sh(.02).z + .06); });
    /* A TAT (tükör) – modern versenyjacht: lehajtható fürdőplató tíkkal és létrával, a tükrön a hajó neve és honi kikötője,
       két rozsdamentes tatkorlát (pushpit) a negyedeken, rajtuk patkó-mentőöv és MOB-jelzőbója, zászlórúd a magyar lobogóval */
    { const s0 = sh(0), z0 = s0.z, hb0 = s0.hb, yT = s0.y - .07 * VR_SC, yW = -.05;
      const nameT = canvasTex(1024, 256, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.textAlign = "center"; gg.fillStyle = "#f3d27a"; gg.font = "italic 900 132px Georgia, serif"; gg.fillText("Zephyr", w / 2, 140);
        gg.fillStyle = "#ffffff"; gg.font = "700 46px system-ui, sans-serif"; gg.fillText("Z A M Á R D I   ·   H U N  27", w / 2, 222); });
      const nm = mesh(new THREE.PlaneGeometry(2.1, .52), basic({ map: nameT, transparent: true, depthWrite: false }), G); nm.position.set(0, yT - .48, z0 - .012); nm.rotation.y = Math.PI;
      /* fürdőplató: a tükör aljából kihajtott tíklap, alatta sötét perem, két hidraulika-kar */
      const pw = 2 * hb0 * .82, pd = .62, py = yW + .32;
      const plat = mesh(new THREE.BoxGeometry(pw, .07, pd), teak, G); plat.position.set(0, py, z0 - pd / 2 + .02); plat.receiveShadow = true;
      const lip = mesh(new THREE.BoxGeometry(pw + .02, .1, .04), carbon, G); lip.position.set(0, py - .02, z0 - pd + .01);
      mesh(mergeGeoms([-1, 1].map((sd) => rodGeom(new THREE.Vector3(sd * pw * .4, py - .03, z0 - pd + .1), new THREE.Vector3(sd * pw * .36, yT - .55, z0 - .02), .025, 8))), chrome, G);
      /* fürdőlétra a plató jobb szélén, a vízbe ér */
      { const lx = pw * .3, lp = [];
        [-1, 1].forEach((k) => lp.push(rodGeom(new THREE.Vector3(lx + k * .17, py + .02, z0 - pd + .04), new THREE.Vector3(lx + k * .17, yW - .55, z0 - pd - .12), .016, 8)));
        for (let i = 0; i < 4; i++) { const f = i / 3, yy = py - .12 - f * .62, zz = z0 - pd + .02 - f * .14; lp.push(rodGeom(new THREE.Vector3(lx - .17, yy, zz), new THREE.Vector3(lx + .17, yy, zz), .014, 6)); }
        mesh(mergeGeoms(lp), chrome, G); }
      /* tatkorlát (pushpit): a negyedeken 3-3 oszlop, felső és középső cső, középen nyitott (be lehet lépni a platóra) */
      const pp = []; const top = .74;
      [-1, 1].forEach((sd) => {
        const A = new THREE.Vector3(sd * (sh(.06).hb - .1), sh(.06).y - .05, sh(.06).z), B = new THREE.Vector3(sd * (hb0 - .12), yT, z0 + .1), C = new THREE.Vector3(sd * hb0 * .45, yT, z0 + .08);
        [A, B, C].forEach((v) => pp.push(rodGeom(v, v.clone().setY(v.y + top), .02, 8)));
        [top, top * .5].forEach((hh) => { const a = A.clone().setY(A.y + hh), b = B.clone().setY(B.y + hh), c = C.clone().setY(C.y + hh); const m = b.clone().lerp(c, .5); m.z -= .06; pp.push(rodGeom(a, b, .02, 8), rodGeom(b, m, .02, 8), rodGeom(m, c, .02, 8)); });
      });
      mesh(mergeGeoms(pp), chrome, G);
      /* patkó-mentőöv a jobb oldali tatkorláton, mellette a MOB-bója (narancs rúd, zászlócska) */
      { const ring = new THREE.Group(); G.add(ring); ring.position.set(hb0 - .32, yT + top * .72, z0 + .02);
        const hs2 = mesh(new THREE.TorusGeometry(.21, .065, 10, 24, Math.PI * 1.55), std({ color: "#ff6a1a", roughness: .8 }), ring); hs2.rotation.z = -Math.PI * .5 - Math.PI * .225;
        [-.12, .12].forEach((x) => { const st2 = mesh(new THREE.BoxGeometry(.035, .14, .14), std({ color: "#f3f3f3", roughness: .6 }), ring); st2.position.set(x, -.12, 0); });
        const mob = mesh(new THREE.CylinderGeometry(.03, .03, 1.7, 10), std({ color: "#ff7a1a", roughness: .6 }), G); mob.position.set(hb0 - .62, yT + .7, z0 + .05);
        const fl = mesh(new THREE.PlaneGeometry(.26, .18), basic({ color: "#ff3b1a", side: THREE.DoubleSide }), G); fl.position.set(hb0 - .62 + .13, yT + 1.45, z0 + .05); VRR.mobFlag = fl; }
      /* zászlórúd a bal negyeden, magyar lobogóval (a szélben lebeg – a vrTick mozgatja) */
      { const fx = -(hb0 - .42), fz = z0 + .06;
        const pole = mesh(new THREE.CylinderGeometry(.018, .022, 1.15, 10), teak, G); pole.position.set(fx, yT + top + .5, fz); pole.rotation.x = -.35;
        const fT = canvasTex(96, 64, (gg, w, h) => { gg.fillStyle = "#cd2a3e"; gg.fillRect(0, 0, w, h / 3); gg.fillStyle = "#ffffff"; gg.fillRect(0, h / 3, w, h / 3); gg.fillStyle = "#436f4d"; gg.fillRect(0, h * 2 / 3, w, h / 3); });
        const fg = new THREE.PlaneGeometry(.6, .4, 8, 1); fg.translate(.3, 0, 0);
        const flag = mesh(fg, std({ map: fT, side: THREE.DoubleSide, roughness: .9 }), G); flag.position.set(fx, yT + top + .95, fz - .18); flag.rotation.y = Math.PI / 2;
        VRR.ensign = flag; flag.userData.base = Float32Array.from(fg.attributes.position.array); }
    }
    /* a legénység: négy trimmelő a szél felőli oldalon (térdelve, kötéllel a kezükben) – átülnek forduláskor */
    const crew = [];
    const skin = std({ color: "#d9a988", roughness: .7 }); const ropeM = std({ color: "#e8e2cf", roughness: .9 });
    [[.3, "#e5262f"], [.38, "#0b2f5e"], [.47, "#e5262f"], [.56, "#0b2f5e"]].forEach(([u, c]) => { const g2 = new THREE.Group(); G.add(g2);
      const v = std({ color: c, roughness: .75 }), jk = std({ color: "#1d2229", roughness: .8 });
      const torso = mesh(new THREE.CapsuleGeometry(.16, .42, 4, 10), jk, g2); torso.position.y = .5;
      const vest = mesh(new THREE.CapsuleGeometry(.175, .22, 4, 10), v, g2); vest.position.y = .6; vest.scale.set(1, 1, .9);
      const neck = mesh(new THREE.CylinderGeometry(.05, .055, .08, 8), skin, g2); neck.position.y = .86;
      const shades = mesh(new THREE.BoxGeometry(.17, .035, .02), std({ color: "#0d0f12", roughness: .1, metalness: .6 }), g2); shades.position.set(0, .99, .11);
      const head = mesh(new THREE.SphereGeometry(.12, 14, 10), skin, g2); head.position.y = .98;
      const cap = mesh(new THREE.SphereGeometry(.125, 14, 8, 0, TAU, 0, Math.PI / 2), std({ color: "#ffffff" }), g2); cap.position.y = 1.01;
      const visor = mesh(new THREE.BoxGeometry(.16, .015, .12), std({ color: "#0b2f5e" }), g2); visor.position.set(0, 1.0, .14);
      const legs = mesh(new THREE.CapsuleGeometry(.09, .5, 3, 8), std({ color: "#20252c" }), g2); legs.position.set(0, .14, .2); legs.rotation.x = Math.PI / 2;
      [-1, 1].forEach((sd) => { const arm = mesh(new THREE.CapsuleGeometry(.05, .38, 3, 8), jk, g2); arm.position.set(sd * .16, .62, .22); arm.rotation.set(1.1, 0, -sd * .2); const hd = mesh(new THREE.SphereGeometry(.045, 8, 6), skin, g2); hd.position.set(sd * .19, .5, .42); });
      /* a kezében a szkótakötél: a két tenyér között, onnan le a fedélzeti csigához – így „trimmel”, nem a levegőt fogja */
      mesh(mergeGeoms([rodGeom(new THREE.Vector3(-.19, .5, .43), new THREE.Vector3(.19, .5, .43), .012, 5), rodGeom(new THREE.Vector3(.19, .5, .43), new THREE.Vector3(.05, -.02, .95), .012, 5), rodGeom(new THREE.Vector3(-.19, .5, .43), new THREE.Vector3(-.3, .3, .2), .012, 5)]), ropeM, g2);
      crew.push({ g: g2, u }); });
    return { G, wheels, tiller: TIL, instT, chartT, deckY, helm: new THREE.Vector3(hs.hb - .74, deckY, hs.z - .62), crew, sh };
  }
  /* --------------------------------------------------------------- felépítés */
  /* ================= KISÜTÖTT FÉNY A VERSENYHAJÓKON (2026-11-11) =================
     A hajók eddig képpontonként, élőben számolt világítással rajzolódtak (lakkréteges „fizikai” anyagok) – ez a Quest 2-nek és a telefonnak a legdrágább munka.
     Itt a kész hajó minden álló alkatrészére EGYSZER, építéskor kiszámoljuk a fényt (égbolt + talajfény + nap a felületi normális szerint), és csúcsszínként
     ráírjuk; futás közben már csak a kész felületet rakja ki a gép (MeshBasicMaterial). A fényes részek (lakkozott test, króm, karbon) „matcap” anyagot kapnak:
     egy kész fényképszerű gömbkép adja a csillogást, szintén élő fényszámítás nélkül. Áttetsző és világító (kijelző) anyagokhoz nem nyúlunk.
     Kikapcsolás összehasonlításhoz: localStorage "zephyr-bake" = "0". */
  const VRB = { mc: {}, mats: new Map() };
  function vrMatcap(kind) {
    if (VRB.mc[kind]) return VRB.mc[kind];
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256);
    if (kind === "chrome") { const v = g.createLinearGradient(0, 8, 0, 248); [[0, "#f4fbff"], [.3, "#bcd7ea"], [.47, "#f8fbfd"], [.5, "#4d5a66"], [.56, "#2a333c"], [.8, "#8d7f6b"], [1, "#d9cdb8"]].forEach(([p, col]) => v.addColorStop(p, col)); g.fillStyle = v; }
    else if (kind === "gloss") { const v = g.createLinearGradient(0, 8, 0, 248); [[0, "#ffffff"], [.22, "#e9eef2"], [.5, "#b9c0c7"], [.62, "#8c949c"], [1, "#6e767e"]].forEach(([p, col]) => v.addColorStop(p, col)); g.fillStyle = v; }
    else { const v = g.createLinearGradient(0, 8, 0, 248); [[0, "#f7f7f7"], [.5, "#b4b4b4"], [1, "#7c7c7c"]].forEach(([p, col]) => v.addColorStop(p, col)); g.fillStyle = v; }
    g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
    const hl = g.createRadialGradient(84, 70, 2, 84, 70, kind === "soft" ? 110 : 62); hl.addColorStop(0, kind === "chrome" ? "rgba(255,255,255,1)" : kind === "gloss" ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.35)"); hl.addColorStop(1, "rgba(255,255,255,0)"); g.globalCompositeOperation = "lighter"; g.fillStyle = hl; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
    if (kind !== "soft") { const h2 = g.createRadialGradient(176, 196, 2, 176, 196, 60); h2.addColorStop(0, "rgba(160,200,235,.35)"); h2.addColorStop(1, "rgba(160,200,235,0)"); g.fillStyle = h2; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; W.disposables.push(t); return (VRB.mc[kind] = t);
  }
  function vrBake(root) {
    try { if (localStorage.getItem("zephyr-bake") === "0") return 0; } catch (e) {}
    const sun = new THREE.Vector3(.38, .82, .42).normalize(), n = new THREE.Vector3(), nm = new THREE.Matrix3(), done = new Set(); let cnt = 0;
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || o.userData.noBake) return; const m = o.material;
      if (!m || Array.isArray(m) || !m.isMeshStandardMaterial || m.transparent || m.opacity < 1) return;
      if (m.side === THREE.DoubleSide && m.metalness < .6 && !(m.clearcoat > 0)) return;   /* vitorlák, zászlók: mozgó, kétoldalas felületek – ezek maradnak élő fényben, hogy ne szürküljenek be */
      if (m.emissive && m.emissiveIntensity > 0 && (m.emissive.r + m.emissive.g + m.emissive.b) > .02) return;   /* kijelzők, világító részek maradnak */
      const g = o.geometry; if (!g || !g.attributes.position || !g.attributes.normal) return;
      const shiny = m.metalness >= .6 ? "chrome" : (m.clearcoat > 0 || m.roughness <= .36) ? "gloss" : null;
      const key = m.uuid + "|" + (shiny || "b"); let nmat = VRB.mats.get(key);
      if (!nmat) {
        const base = { color: m.color.clone(), map: m.map || null, side: m.side, alphaTest: m.alphaTest || 0, vertexColors: shiny ? !!m.vertexColors : true };
        nmat = shiny ? new THREE.MeshMatcapMaterial(Object.assign(base, { matcap: vrMatcap(shiny) })) : new THREE.MeshBasicMaterial(base);
        if (shiny === "chrome") nmat.color.lerp(new THREE.Color("#ffffff"), .35);
        if (!shiny) { const lum = nmat.color.r * .3 + nmat.color.g * .55 + nmat.color.b * .15; if (lum < .035 && !nmat.map) nmat.color.lerp(new THREE.Color(.07, .08, .1), .75); }   /* a koromfekete alkatrész szemüvegben lapos „lyuk” volt – sötétszürke lesz, így látszik rajta az árnyalás */
        W.disposables.push(nmat); VRB.mats.set(key, nmat);
      }
      if (!shiny && !done.has(g.uuid)) { done.add(g.uuid);
        const N = g.attributes.normal, cnt2 = N.count, had = m.vertexColors && g.attributes.color ? g.attributes.color : null, col = new Float32Array(cnt2 * 3), P = g.attributes.position; nm.getNormalMatrix(o.matrixWorld);
        g.computeBoundingBox(); const bb = g.boundingBox, hy = Math.max(.001, bb.max.y - bb.min.y);
        for (let i = 0; i < cnt2; i++) { n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); if (m.side === THREE.DoubleSide && n.y < -.2) n.multiplyScalar(-1);
          const hemi = .62 + .30 * (n.y * .5 + .5), d = Math.max(0, n.dot(sun)) * .46, ao = .92 + .08 * Math.min(1, (P.getY(i) - bb.min.y) / hy), L = Math.min(1.3, (hemi + d) * ao);
          col[i * 3] = L * (had ? had.getX(i) : 1); col[i * 3 + 1] = L * 1.0 * (had ? had.getY(i) : 1); col[i * 3 + 2] = L * 1.02 * (had ? had.getZ(i) : 1); }
        g.setAttribute("color", new THREE.BufferAttribute(col, 3)); }
      o.material = nmat; o.castShadow = false; o.receiveShadow = false; cnt++;
    });
    root.traverse((o) => { if (o.userData && o.userData.bakeSails) { try { o.userData.bakeSails(); cnt++; } catch (e) {} } });   /* a vitorlák is kisütve */
    return cnt;
  }
  function buildVRace() {
    const root = W.root;
    Object.assign(VRR, { grab: null, wHover: false, crewSide: null, lastSide: 0, podium: null, helpL: null, msgL: null, lblAr: 0 });   /* (az előző megnyitás átmeneti állapota ne maradjon meg; a futam száma igen) */
    const far = new THREE.Group(), env = new THREE.Group(); root.add(far); root.add(env); VRR.far = far; VRR.env = env;
    const oldSky = makeSky(far); makeShores(far);
    VRR.water = makeWater(env);
    VRR.foto = makePhotoSky(far, oldSky, VRR.water);   /* valódi égfotó + a víz ezt tükrözi */
    const boat = makeBoat({ detail: 0, vis: false, crew: 0, hull: "#f5f2e8", boot: "#141d4d", stripe: "#141d4d", jib: "#f6f4ec", main: "#d61f26", num: " ", cls: " ", logoImg: "img/zephyr-hajo-logo.png", reg: "H-30381", lazyBag: "#6e1423", nsCol: "#3f6fa6", teakDeck: true, spin: ["#ffffff", "#ffffff", "#f3f3ee"] });   /* 2026-11-11, a tulajdonos: a grósz (nagyvitorla) piros, a spinakker fehér, rajta az eredeti logó */
    boat.scale.setScalar(VR_SC); boat.rotation.y = Math.PI; root.add(boat); VRR.boat = boat;
    const CK2 = vrCockpit(boat); VRR.ck = CK2; VRR.baked = vrBake(boat);
    /* a felhasználó helye: a jobb oldali (styrbord) kerék mögött; a hajó orra −z felé néz (a hajó π-vel elforgatva) */
    const hp = CK2.helm.clone().multiplyScalar(1 / VR_SC); hp.x = -hp.x;   /* styrbord = a hajó helyi −x oldala */
    /* 2026-11-10: telefonon (álló képernyő, 2D) a kormánytól nézve a hajó kitakarta a pályát – ott magasabbról és hátrébbról nézünk
       (kb. 12 m-rel feljebb, 19 m-rel a kormány mögül, lefelé döntve), így a hajó kicsi, és látszik a víz, a bóják, az ellenfelek */
    const ph2d = !T.inVR && (document.documentElement.dataset.device === "phone" || innerHeight > innerWidth * 1.15);
    const eye = T.inVR ? 0 : 1.62 + (ph2d ? 12 : 0), camBack = ph2d ? 19 : 0;
    if (ph2d) { try { const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject) lc.pitchObject.rotation.x = -.42; } catch (e) {} }
    const hw = boat.localToWorld(hp.clone());
    VRR.noSigns = (() => { try { return localStorage.getItem("zephyr-verseny-tablak") === "0"; } catch (e) { return false; } })();
    VRR.seated = (() => { try { return localStorage.getItem("zephyr-vr-ules") === "1"; } catch (e) { return false; } })();
    VRR.baseY = -(hw.y + eye); root.position.set(-hw.x + (ph2d ? -1.1 : 0), VRR.baseY - (VRR.seated && T.inVR ? .45 : 0), -hw.z - camBack); VRR.rootX = -hw.x + (ph2d ? -1.1 : 0); VRR.rootZ = -hw.z - camBack; VRR.helmL = hp.clone(); boat.updateMatrix(); VRR.helmRest = hp.clone().applyMatrix4(boat.matrix); root.updateMatrixWorld(true);   /* ülve a fedélzet 45 cm-rel lejjebb kerül – így ülve is a kerék fölött látsz */
    VRR.wake = makeWake(env, 1.2);
    /* felcsapó víz: az orrnál és a hajó vállánál – sebességgel nő; a hullámra ugráskor nagy permet */
    { const N = 900, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const dot = canvasTex(64, 64, (gg) => { const gr = gg.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.45, "rgba(235,248,255,.7)"); gr.addColorStop(1, "rgba(220,240,255,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64); });
      const m = new THREE.PointsMaterial({ size: .2, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }); W.disposables.push(m, g);
      const pts = new THREE.Points(g, m); pts.frustumCulled = false; root.add(pts);
      VRR.spray = { pts, pos, col, N, vel: new Float32Array(N * 3), life: new Float32Array(N), max: new Float32Array(N), i: 0, acc: 0 }; }
    /* ellenfelek (ugyanakkora hajók) */
    VRR.riv = VR_RIV.map((o, i) => { const g = makeBoat(Object.assign({ detail: 0, crew: 3 }, o)); g.scale.setScalar(VR_SC * .96); env.add(g); vrBake(g); const wk = makeWake(env, 1.1);
      const lbl = labelSprite([o.name, o.num], { size: 4.2, fs: 60, w: 620 }); env.add(lbl); return { o, g, wk, i, lbl }; });
    VRR.podium = labelSprite(["", "", "", "", ""], { size: 2.4, fs: 56, w: 900 }); root.add(VRR.podium); VRR.podium.visible = false;
    /* bóják, rendezőhajó, rajt-bója, a következő bója jelzőoszlopa */
    VRR.markG = new THREE.Group(); env.add(VRR.markG);
    VRR.cb = makeCommittee(); VRR.cb.scale.setScalar(1.2); env.add(VRR.cb);
    VRR.cdL = labelSprite(["RAJT", "0:45"], { size: 7, fs: 70, w: 640 }); env.add(VRR.cdL);
    VRR.pin = makeBuoy("#ff7a00", 2.0); VRR.pin.scale.setScalar(1.3); env.add(VRR.pin); try { vrBake(VRR.cb); vrBake(VRR.pin); } catch (e) {}   /* 2026-11-11: a rendezőhajó és a bóják is kisütve */
    const beamT = canvasTex(32, 256, (gg, w, h) => { const gr = gg.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(255,209,102,.9)"); gr.addColorStop(1, "rgba(255,209,102,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, w, h); });
    VRR.beam = mesh(new THREE.CylinderGeometry(2.4, 2.4, 60, 16, 1, true), basic({ map: beamT, transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), env); VRR.beam.renderOrder = 5;
    VRR.beamLbl = labelSprite(["1. bója", "kerüld bal kéz felől"], { size: 14, fs: 64, w: 760 }); env.add(VRR.beamLbl);
    /* kerülési nyíl a következő bója körül a vízen: az óramutatóval ellentétes ív (felülről nézve) = a bója bal kéz felől marad */
    { const R0 = 15, pts = []; for (let k = 0; k <= 36; k++) { const a = k / 36 * Math.PI * 1.5; pts.push(new THREE.Vector3(R0 * Math.cos(a), 0, -R0 * Math.sin(a))); }
      const arM = basic({ color: "#ffd166", transparent: true, opacity: .75, depthWrite: false }); const g3 = new THREE.Group(); env.add(g3); VRR.arrow = g3;
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .45, 6, false), arM, g3);
      const aEnd = Math.PI * 1.5, head = mesh(new THREE.ConeGeometry(1.4, 3.2, 10), arM, g3); head.position.set(R0 * Math.cos(aEnd), 0, -R0 * Math.sin(aEnd)); head.rotation.set(0, 0, 0);
      const tg2 = new THREE.Vector3(-Math.sin(aEnd), 0, -Math.cos(aEnd)); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg2); g3.renderOrder = 4; }
    buildCourseMarks(env);
    VRR.lineM = mesh(new THREE.PlaneGeometry(1, .5), basic({ color: "#ffd166", transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }), env); VRR.lineM.rotation.x = -Math.PI / 2; VRR.lineM.renderOrder = 4;
    /* nagy műszerkijelző az árbócon (mint a valódi versenyhajókon): idő, helyezés, bója */
    const mastT = canvasTex(1024, 256, (gg) => { gg.fillStyle = "#06090d"; gg.fillRect(0, 0, 1024, 256); });
    const mastS = mesh(new THREE.PlaneGeometry(1.6, .4), basic({ map: mastT }), boat.userData.body); mastS.scale.setScalar(1 / VR_SC); mastS.position.set(0, (hullShape(.42).sheer + .46) + 2.1 / VR_SC * 1.4, .95 - .12); mastS.rotation.y = Math.PI;
    VRR.mastT = mastT;
    VRR.gulls = makeGulls(env);
    /* nézőhajók a rajtvonal két végén (horgonyoznak, ringanak): motoros jachtok, emberekkel a fedélzeten */
    VRR.spect = [];
    [["#f4f4f0", "#1f3a6a"], ["#ffffff", "#c62828"], ["#e9e2cf", "#2e7d32"], ["#f4f4f0", "#3a3f46"], ["#ffffff", "#f2b233"]].forEach(([hc, sc], i) => {
      const g2 = new THREE.Group(); env.add(g2);
      const parts = [[BX(3.0, 1.0, 9), hc, M4(0, .25, 0)], [new THREE.ConeGeometry(1.5, 3, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).scale(1, .5, 1), hc, M4(0, .25, 6)], [BX(3.02, .25, 9.02), sc, M4(0, .45, 0)],
        [BX(2.3, 1.2, 3.2), hc, M4(0, 1.3, -.6)], [BX(2.34, .5, 2.6), "#1d2a36", M4(0, 1.5, -.4), "m"], [BX(2.6, .08, 2.2), hc, M4(0, 2.0, -2.6)], [CY(.04, .04, 1.1, 6), "#c9cdd2", M4(1.2, 1.4, -3.6), "m"], [CY(.04, .04, 1.1, 6), "#c9cdd2", M4(-1.2, 1.4, -3.6), "m"]];
      for (let k = 0; k < 4; k++) parts.push([CY(.17, .19, .6, 8), ["#e5262f", "#1f5fa8", "#ffd166", "#f4f4f0"][(k + i) % 4], M4(-.8 + k * .55, 1.15, -3.3)], [new THREE.SphereGeometry(.12, 8, 6), "#d9a988", M4(-.8 + k * .55, 1.55, -3.3)]);
      vcGroup(parts, g2); VRR.spect.push({ g: g2, i, ph: rand() * 9 });
    });
    VRR.lights = addLights(SUN.clone());
    /* a kerekek fogása sugárral (csippentés / ravasz) */
    VRR.tiller = (() => { try { return localStorage.getItem("zephyr-kormany") !== "kerek"; } catch (e) { return true; } })();
    if (VRR.tiller) { CK2.wheels.forEach((w) => { w.wheel.visible = false; w.axle.visible = false; }); CK2.tiller.til.visible = CK2.tiller.ext.visible = true; }
    else CK2.wheels.forEach((w) => { w.hit.userData.xr = { hover: (on) => { VRR.wHover = on; }, down: (h, src, key) => vrGrab(w, src, key, true), drag: (src) => vrDrag(w, src), up: () => { VRR.rgrab = null; } }; T.xr.extra.add(w.hit); W.objs.push(w.hit); });
    /* első alkalommal: felirat a jobb oldali kerék fölött – amíg meg nem fogod */
    /* üzenettábla a kerék előtt (VR-ben a panel nélkül is látszik): bójakerülés, rossz oldal, korai rajt, koccanás, befutó */
    { const w0 = CK2.wheels.find((w) => w.sd < 0) || CK2.wheels[0]; VRR.msgL = labelSprite(["", ""], { size: 2.0, fs: 50, w: 1150 }); CK2.G.add(VRR.msgL);
      VRR.msgL.position.set(w0.ped.position.x * .6, CK2.deckY + 1.75, w0.ped.position.z + 2.2); VRR.msgL.visible = false; }
    { const w0 = CK2.wheels.find((w) => w.sd < 0) || CK2.wheels[0]; VRR.helpL = labelSprite(["Markold meg a kormányt!", "zárd ökölbe a kezed a peremén – nyitott tenyérrel engeded el · kontrollerrel: a hüvelykujjkar kormányoz"], { size: .55, fs: 56, w: 820 }); w0.wheel.add(VRR.helpL); VRR.helpL.position.set(0, .95, 0); }
    if (VRR.tiller) { VRR.helpL.parent.remove(VRR.helpL); VRR.helpL = labelSprite(["Fogd meg a kormányrudat!", "zárd ökölbe a kezed a rúdon vagy a toldón, bárhol · eltolod magadtól: jobbra fordul, magad felé húzod: balra · nyitott tenyérrel engeded el · kontrollerrel: hüvelykujjkar"], { size: .55, fs: 56, w: 820 }); CK2.G.add(VRR.helpL); VRR.helpL.position.set(-.5, CK2.tiller.ty + .75, CK2.tiller.pz + CK2.tiller.TL); }
    SAIL.keys = {}; W.vrr = VRR; W.vrSetup = vrSetup;   /* (tesztekhez) */
    VRR.best = (() => { try { return JSON.parse(localStorage.getItem("zephyr-vr-verseny") || "{}"); } catch (e) { return {}; } })();
    vrSetup(VRR.lvl || 1);
    faceYaw(0);
    audioStart({ water: .04, wind: .035 });
    return { tick: vrTick, panel: vrPanel, hud: vrHud, wrist: vrWrist };
  }
  /* ===== PÁLYAJELZÉSEK (2026. nov. 9., a tulajdonos kérésére: „a bója fölött legyen az iránymutató nyíl, sokkal jobban látsszon,
     honnan és mit kell megkerülni; a két bója közötti áthaladás egyértelmű jelzést kapjon; az utak legyenek nyilvánvalóan jelezve”)
     • KERÜLŐBÓJA: a bója fölött 7–9 m magasan 8 fénylő nyílhegy kering körbe az óramutatóval ELLENTÉTESEN (felülről nézve) – ez a
       bal kéz felőli kerülés iránya; fölötte nagy jelzőtábla rajzzal: a hajó alulról érkezik, a bója a BAL oldalán marad, a nyíl
       körbeívelve a következő szakasz felé fordul („KERÜLD MEG – bal kéz felől”).
     • KAPU (rajt- és célvonal két vége): két magas fényoszlop, közöttük a vízen sakktábla-mintás fénycsík, nagy nyilak a két bója
       KÖZÖTT átfelé, fölötte tábla: „HALADJ ÁT A KÉT BÓJA KÖZÖTT” – kerülő-nyíl itt nincs, így nem keverhető össze.
     • ÚTVONAL: a vízen arany nyílsor (cikcakkban, ha szél ellen cirkálni kell) a következő célig, lassan előre „folyik”. */
  function buildCourseMarks(env) {
    const gold = basic({ color: "#ffd166", transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending }), M = {};
    /* keringő nyílhegyek a bója fölött */
    const head = new THREE.Shape(); head.moveTo(0, 1.6); head.lineTo(1.25, -1.0); head.lineTo(0, -.35); head.lineTo(-1.25, -1.0); head.closePath();
    const hg = new THREE.ExtrudeGeometry(head, { depth: .35, bevelEnabled: false }); hg.translate(0, 0, -.175); W.disposables.push(hg);
    M.orbit = new THREE.Group(); env.add(M.orbit); M.heads = [];
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(hg, gold); m.renderOrder = 7; M.orbit.add(m); M.heads.push(m); }
    { const pts = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * TAU; pts.push(new THREE.Vector3(Math.cos(a) * 9, 0, Math.sin(a) * 9)); }
      const ring = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, .16, 6, true), basic({ color: "#ffd166", transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending }), M.orbit); ring.renderOrder = 6; }
    /* kerülési jelzőtábla (rajz) */
    M.signT = canvasTex(512, 640, () => {}); const sm = sprM({ map: M.signT, transparent: true, depthWrite: false, depthTest: false });
    M.sign = new THREE.Sprite(sm); M.sign.renderOrder = 995; env.add(M.sign);
    /* kapu: két fényoszlop, sakktábla-csík, nyilak, tábla */
    const beamT = canvasTex(32, 256, (gg, w, h) => { const gr = gg.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(120,255,170,.95)"); gr.addColorStop(1, "rgba(120,255,170,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, w, h); });
    M.gate = new THREE.Group(); env.add(M.gate); M.posts = [0, 1].map(() => { const m = mesh(new THREE.CylinderGeometry(1.6, 1.6, 50, 16, 1, true), basic({ map: beamT, transparent: true, opacity: .75, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), M.gate); m.renderOrder = 5; return m; });
    const chk = canvasTex(256, 32, (gg, w, h) => { for (let i = 0; i < 16; i++) { gg.fillStyle = i % 2 ? "rgba(255,255,255,.95)" : "rgba(20,30,40,.85)"; gg.fillRect(i * 16, 0, 16, 16); gg.fillStyle = i % 2 ? "rgba(20,30,40,.85)" : "rgba(255,255,255,.95)"; gg.fillRect(i * 16, 16, 16, 16); } });
    M.strip = mesh(new THREE.PlaneGeometry(1, 3), basic({ map: chk, transparent: true, opacity: .8, depthWrite: false }), M.gate); M.strip.rotation.x = -Math.PI / 2; M.strip.renderOrder = 4;
    const ag = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 7), new THREE.Vector2(5, 1), new THREE.Vector2(2, 1), new THREE.Vector2(2, -6), new THREE.Vector2(-2, -6), new THREE.Vector2(-2, 1), new THREE.Vector2(-5, 1)])); W.disposables.push(ag);
    const gm = basic({ color: "#7dffb0", transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    M.garrows = [-1, 0, 1].map(() => { const m = new THREE.Mesh(ag, gm); m.rotation.x = -Math.PI / 2; m.renderOrder = 6; M.gate.add(m); return m; });
    M.gateL = labelSprite(["HALADJ ÁT", "a két bója KÖZÖTT"], { size: 16, fs: 70, w: 900, edge: "#7dffb0", c0: "#7dffb0" }); M.gate.add(M.gateL);
    /* útvonal: nyílsor a vízen (példányosítva) */
    const cg = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 1.4), new THREE.Vector2(1.8, -.6), new THREE.Vector2(1.1, -.9), new THREE.Vector2(0, .2), new THREE.Vector2(-1.1, -.9), new THREE.Vector2(-1.8, -.6)])); cg.rotateX(-Math.PI / 2 + .6); cg.translate(0, .5, 0); W.disposables.push(cg);   /* kissé felállítva, hogy alacsony szögből is jól látsszon */
    M.chev = new THREE.InstancedMesh(cg, basic({ color: "#ffd166", transparent: true, opacity: .85, depthWrite: false }), 90); M.chev.count = 0; M.chev.renderOrder = 4; M.chev.frustumCulled = false; env.add(M.chev);
    VRR.CM = M; M.signKey = "";
  }
  function drawRoundSign(M, exitRel, n, dist) {
    /* felülnézeti rajz a hajó szemszögéből: a hajó alulról jön, a bója a bal oldalán marad, a nyíl a bója körül a következő szakasz felé fordul */
    const key = n + "|" + Math.round(exitRel * 8) + "|" + Math.round(dist / 10); if (key === M.signKey) return; M.signKey = key;
    const g = M.signT._canvas.getContext("2d"), w = 512, h = 640; g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(9,34,70,.9)"; g.beginPath(); g.roundRect ? g.roundRect(6, 6, w - 12, h - 12, 40) : g.rect(6, 6, w - 12, h - 12); g.fill(); g.lineWidth = 8; g.strokeStyle = "#ffd166"; g.stroke();
    g.fillStyle = "#ffd166"; g.font = "900 64px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(`${n}. BÓJA`, w / 2, 62);
    g.fillStyle = "#fff"; g.font = "800 40px system-ui"; g.fillText("KERÜLD MEG", w / 2, 116);
    const bx = w / 2 - 40, by = 300, R0 = 90;
    g.strokeStyle = "rgba(127,211,255,.5)"; g.lineWidth = 3; g.setLineDash([10, 10]); g.beginPath(); g.arc(bx, by, R0, 0, TAU); g.stroke(); g.setLineDash([]);
    /* útvonal: alulról fel, a bója JOBB oldalán (a bója balra marad), majd körbe az óramutatóval ellentétesen a kilépés irányáig */
    const ex = -Math.PI / 2 + exitRel;   /* kilépés iránya a rajzon (0 = egyenesen fel) */
    /* a vásznon az óramutatóval ELLENTÉTES (felülről nézve) körüljárás: a szög csökken; egy θ pontban a haladási irány θ − 90° */
    let te = ((ex + Math.PI / 2) % TAU + TAU) % TAU - TAU; if (te > -.2) te -= TAU * 0 + .0; if (te > -.2) te = -.2;
    g.strokeStyle = "#ffd166"; g.lineWidth = 22; g.lineCap = "round"; g.beginPath(); g.moveTo(bx + R0, h - 70); g.lineTo(bx + R0, by); g.arc(bx, by, R0, 0, te, true); g.stroke();
    const px = bx + Math.cos(te) * R0, py = by + Math.sin(te) * R0, dx = Math.cos(te - Math.PI / 2), dy = Math.sin(te - Math.PI / 2), L2 = 70, tx = px + dx * L2, ty = py + dy * L2;
    g.beginPath(); g.moveTo(px, py); g.lineTo(tx, ty); g.stroke();
    g.fillStyle = "#ffd166"; g.beginPath(); g.moveTo(tx + dx * 34, ty + dy * 34); g.lineTo(tx - dy * 30, ty + dx * 30); g.lineTo(tx + dy * 30, ty - dx * 30); g.closePath(); g.fill();
    /* bója és hajó */
    g.fillStyle = "#ff7a00"; g.beginPath(); g.arc(bx, by, 34, 0, TAU); g.fill(); g.lineWidth = 5; g.strokeStyle = "#fff"; g.stroke(); g.fillStyle = "#14161b"; g.font = "900 40px system-ui"; g.fillText(String(n), bx, by + 2);
    g.fillStyle = "#ff4b3a"; g.beginPath(); g.moveTo(bx + R0, h - 120); g.lineTo(bx + R0 + 18, h - 76); g.lineTo(bx + R0 - 18, h - 76); g.closePath(); g.fill();
    g.fillStyle = "#fff"; g.font = "700 30px system-ui"; g.fillText("te", bx + R0 + 44, h - 92);
    g.fillStyle = "#ffd166"; g.font = "800 34px system-ui"; g.fillText("a bója BAL kéz felől", w / 2, h - 40 - 0); g.fillStyle = "#cfe9ff"; g.font = "700 30px system-ui"; g.fillText(`${Math.round(dist)} m`, w - 70, 170);
    M.signT.needsUpdate = true;
  }
  function courseTick(dt, tgt, from, isGate, rounding) {
    const S = VRR, C = S.C, M = S.CM; if (!M) return;
    /* keringő nyilak + tábla a bója fölött */
    M.orbit.visible = rounding && !S.fin; M.sign.visible = rounding && !S.fin && !S.noSigns;
    if (rounding) { M.orbit.position.set(tgt.x, 8 + Math.sin(W.t * 1.4) * .4, tgt.z); M.orbit.rotation.y += dt * .9;   /* +y körüli pozitív forgás = felülről nézve az óramutatóval ellentétes */
      M.heads.forEach((m, i) => { const a = i / 8 * TAU; m.position.set(Math.cos(a) * 9, 0, -Math.sin(a) * 9); const tg = new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg); m.scale.setScalar(1 + .15 * Math.sin(W.t * 4 + i)); });
      const d = Math.hypot(tgt.x - S.x, tgt.z - S.z), k = clamp(d * .13, 8, 55); M.sign.scale.set(k, k * 1.25, 1); M.sign.position.set(tgt.x, 18 + k * .75, tgt.z); M.orbit.scale.setScalar(clamp(d / 45, 1, 4.5)); M.orbit.position.y = 8 * clamp(d / 45, 1, 4.5);
      /* a következő szakasz iránya a hajóból nézve (a kilépő nyílhoz) */
      const nxt = S.next + 1 < S.marks.length ? S.marks[S.next + 1] : { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 };
      const app = Math.atan2(tgt.x - S.x, -(tgt.z - S.z)), ext = Math.atan2(nxt.x - tgt.x, -(nxt.z - tgt.z));
      drawRoundSign(M, wrapA(ext - app), S.next + 1, d); }
    /* kapu */
    M.gate.visible = isGate && !S.fin; if (M.gateL) M.gateL.visible = isGate && !S.fin && !S.noSigns;
    if (isGate) { const a = C.line.a, b = C.line.b, mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, L = Math.hypot(b.x - a.x, b.z - a.z);
      M.posts[0].position.set(a.x, 25, a.z); M.posts[1].position.set(b.x, 25, b.z); M.posts.forEach((m) => { m.material.opacity = .55 + .3 * Math.sin(W.t * 3); });
      M.strip.position.set(mx, .12, mz); M.strip.scale.set(L, 1, 1); M.strip.rotation.z = -Math.atan2(b.z - a.z, b.x - a.x);
      /* az áthaladás iránya: rajt előtt és befutáskor is a szél felől (u) … a befutó a szél felől szél alá (−u); rajtnál a vonal mögül előre (+u) */
      const dir = S.st === "pre" || S.ocs ? 1 : -1, yaw = Math.atan2(C.u[0] * dir, -C.u[1] * dir);
      M.garrows.forEach((m, i) => { const t = (i - 1) * L * .28; m.position.set(mx + C.c[0] * t - C.u[0] * dir * (6 - ((W.t * 6) % 12)), .2, mz + C.c[1] * t - C.u[1] * dir * (6 - ((W.t * 6) % 12))); m.rotation.set(-Math.PI / 2, 0, -yaw); });
      M.gateL.position.set(mx, 20 + Math.sin(W.t * 1.5) * .4, mz); M.gateL.userData.set(S.st === "pre" ? ["RAJTVONAL", "a két bója KÖZÖTT haladj át – a rajtjelre"] : S.ocs ? ["VISSZA", "a két bója között át, a vonal mögé"] : ["CÉL", "haladj át a két bója KÖZÖTT"]); }
    /* útvonal-nyilak a vízen: a szakasz ideális útja (cirkálásnál két csapás), a hajó előtti részen */
    const path = vrLegPath(from, tgt, S.wf); let n = 0;
    /* 2026-11-11: a vízre festett útvonal-nyilak NEM látszanak állandóan („ne sínen menjünk”): csak szakasz elején pár másodpercig, forduláskor,
       vagy ha a hajó 5 mp-nél tovább nagyon eltér a jó iránytól (bármelyik csapás ideális irányához mérve) */
    { const p1 = path[1]; if (p1) { const want = Math.atan2(p1.x - path[0].x, -(p1.z - path[0].z)), e1 = Math.abs(wrapA(want - S.b)), e2 = Math.abs(wrapA(2 * S.wf - want - S.b)), err = Math.min(e1, e2);
        S.offT = err > .6 ? (S.offT || 0) + dt : 0; if (S.offT > 5) S.guideT = Math.max(S.guideT || 0, W.t + 8); }
      if (Math.abs(S.yr || 0) > .2) S.guideT = Math.max(S.guideT || 0, W.t + 6); }
    const guide = W.t < (S.guideT || 0) && S.st === "race"; const Mx = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(1, 1, 1), off = (W.t * 5) % 14;
    for (let i = 0; guide && i < path.length - 1 && n < 90; i++) { const A = path[i], B = path[i + 1], L = Math.hypot(B.x - A.x, B.z - A.z), yaw = Math.atan2(-(B.x - A.x), -(B.z - A.z));
      q.setFromAxisAngle(Y, yaw);
      for (let d = off; d < L - 4 && n < 90; d += 28) { const x = A.x + (B.x - A.x) * d / L, z = A.z + (B.z - A.z) * d / L; const toMe = Math.hypot(x - S.x, z - S.z);
        if (toMe < 14 || toMe > 600) continue; sc.setScalar(1.6 + Math.min(1.4, toMe / 120)); Mx.compose(new THREE.Vector3(x, .15, z), q, sc); M.chev.setMatrixAt(n++, Mx); } }
    M.chev.count = n; M.chev.instanceMatrix.needsUpdate = true; M.chev.visible = !S.fin;
  }
  /* új futam: pálya, szél, kiinduló helyzet a rajtvonal mögött */
  function vrSetup(lvl) {
    const C = VRR.C = vrCourse(lvl); VRR.lvl = lvl;
    VRR.wf = C.wf; VRR.tws = C.tws;
    while (VRR.markG.children.length) VRR.markG.remove(VRR.markG.children[0]);
    VRR.marks = C.marks.map((m, i) => { const b = makeBuoy(i === C.marks.length - 1 && C.marks.length > 2 ? "#ffd166" : "#ff7a00", 2.4); b.scale.setScalar(1.5); b.position.set(m.x, 0, m.z); VRR.markG.add(b); try { vrBake(b); } catch (e) {}
      const nt = canvasTex(128, 128, (gg) => { gg.fillStyle = "#14161b"; gg.font = "900 110px system-ui"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText(String(i + 1), 64, 70); });
      [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((ry) => { const p = mesh(new THREE.PlaneGeometry(.7, .7), basic({ map: nt, transparent: true, depthWrite: false }), b); p.position.set(Math.sin(ry) * .66, 1.4, Math.cos(ry) * .66); p.rotation.y = ry; });
      return { x: m.x, z: m.z, g: b }; });
    /* rajtvonal: bal végén a rendezőhajó, jobb végén a narancs bója */
    VRR.cb.position.set(C.line.b.x, 0, C.line.b.z); VRR.cb.rotation.y = Math.atan2(C.u[0], C.u[1]);
    VRR.pin.position.set(C.line.a.x, 0, C.line.a.z);
    /* nézőhajók: a vonal két végén kívül és a pálya szélén, a hajók útjából kiesve */
    (VRR.spect || []).forEach((q, i) => { const side = i % 2 ? 1 : -1, along = 60 + i * 26, back = -10 + i * 40; q.x = C.c[0] * side * along + C.u[0] * back; q.z = C.c[1] * side * along + C.u[1] * back; q.g.position.set(q.x, 0, q.z); q.g.rotation.y = rand() * TAU; });
    const mx = (C.line.a.x + C.line.b.x) / 2, mz = (C.line.a.z + C.line.b.z) / 2;
    VRR.lineM.position.set(mx, .05, mz); VRR.lineM.scale.set(Math.hypot(C.line.b.x - C.line.a.x, C.line.b.z - C.line.a.z), 1, 1); VRR.lineM.rotation.z = -Math.atan2(C.line.b.z - C.line.a.z, C.line.b.x - C.line.a.x);
    /* a hajók a vonal alatt (szél alatt) 70–110 m-re, halzon; 45 mp a rajtig */
    const back = (d, s) => ({ x: -C.u[0] * d + C.c[0] * s, z: -C.u[1] * d + C.c[1] * s });
    const p0 = back(95, 6); Object.assign(VRR, { wx: null, fox: 0, foz: 0, x: p0.x, z: p0.z, b: C.wf + Math.PI * .5 - .3, v: 2.5, del: 0, wa: 0, heel: 0, lastSide: 0, tackT: 0, next: 0, t: -45, st: "pre", horns: {}, fin: null, msg: "Rajt 45 mp múlva – állj be a vonal mögé!", msgT: 6, ocs: 0, res: [], pen: 0, doneT: 0, prevSide: null, dnf: false, _mi: -1, nearMk: 0, hailT: 0, guideT: 0, offT: 0 });
    VRR.riv.forEach((r, i) => { const p = back([84, 102, 90][i], [-48, -22, 38][i]);   /* egymástól és tőled is legalább ~28 m-re (15 m-es hajók) */ Object.assign(r, { x: p.x, z: p.z, b: C.wf + (i % 2 ? 1 : -1) * Math.PI * .45, v: 2.4, next: 0, tack: i % 2 ? 1 : -1, lastTack: 0, fin: null, skill: 1, yr: 0, del: 0, spinOn: false, ph: rand() * 9, _mi: -1, errNext: 0, errGW: 0, penT: 0, wide: 0, _dS: null }); });
    if (VRR.podium) VRR.podium.visible = false;
    W.panelDirty = 1;
  }
  /* --------------------------------------------------------------- kormány */
  const _wv = new THREE.Vector3();
  const _tz = new THREE.Vector3(0, 0, 1);
  const _ty = new THREE.Vector3(0, 1, 0);
  function wheelAngleOf(w, p) {   /* a kéz/sugár pontja a kerék síkjában: óramutató szerinti szög a kormányos szemszögéből */
    const lp = w.wheel.worldToLocal(_wv.copy(p)); return Math.atan2(-lp.x, lp.y);   /* a kormányos felől nézve jobbra = a hajó helyi −x */
  }
  function vrGrab(w, src, key, ray) {
    let p = null; if (ray) { const pl = new THREE.Plane(); const n = new THREE.Vector3(0, 0, 1).transformDirection(w.wheel.matrixWorld); const c = w.wheel.getWorldPosition(new THREE.Vector3()); pl.setFromNormalAndCoplanarPoint(n, c); p = new THREE.Ray(src.o, src.d).intersectPlane(pl, new THREE.Vector3()); }
    else p = src.tip;
    if (!p) return; VRR.rgrab = { w, a: wheelAngleOf(w, p), key, ray }; try { flap(.02); } catch (e) {}
  }
  function vrDrag(w, src) {
    const G = VRR.rgrab; if (!G || !G.ray) return;
    const pl = new THREE.Plane(); const n = new THREE.Vector3(0, 0, 1).transformDirection(w.wheel.matrixWorld); const c = w.wheel.getWorldPosition(new THREE.Vector3()); pl.setFromNormalAndCoplanarPoint(n, c);
    const p = new THREE.Ray(src.o, src.d).intersectPlane(pl, new THREE.Vector3()); if (!p) return;
    const a = wheelAngleOf(w, p); VRR.wa = clamp(VRR.wa + wrapA(a - G.a), -WA_MAX, WA_MAX); G.a = a;
  }
  function wheelRelease(h) {
    const S = VRR, G = S.grabs && S.grabs[h]; if (!G) return; delete S.grabs[h];
    const other = Object.values(S.grabs).length > 0;
    /* lendületből elengedve (és ha a másik kéz sem fogja) a kerék tovább pörög */
    if (false && !other && G.hist && G.hist.length >= 2) { const a0 = G.hist[0], a1 = G.hist[G.hist.length - 1], dtt = Math.max(.02, a1[0] - a0[0]); S.wv = clamp((a1[1] - a0[1]) / dtt, -18, 18); if (Math.abs(S.wv) < 1.2) S.wv = 0; }
    S.lastRel = { n: G.hist ? G.hist.length : -1, wv: S.wv };
    S.grab = S.grabs.right || S.grabs.left || null; vrGripHand(null, h);
  }
  function vrRelease() { Object.keys(VRR.grabs || {}).forEach(wheelRelease); }
  /* a kerékre markoló kéz (bőrszín, mint a követett kéz): tenyér, négy ujj a peremet körülfogva, hüvelykujj, csukló */
  function vrGripHand(w, key, b) {
    const S = VRR; S.gh = S.gh || {};
    let H = S.gh[key];
    if (!H) {
      H = new THREE.Group(); const skin = std({ color: "#e9cdb4", roughness: .62 }), nail = std({ color: "#f3dfd2", roughness: .4 }), sleeve = std({ color: "#1b2a3c", roughness: .8 });
      const mir = key === "left" ? -1 : 1;
      const palm = mesh(new THREE.SphereGeometry(1, 16, 12), skin, H); palm.scale.set(.047, .054, .02); palm.position.set(0, -.014, -.048); palm.rotation.x = -.25;
      [-.033, -.011, .011, .033].forEach((x, i) => { const L = [.95, 1, .97, .85][i];
        const fin = mesh(new THREE.TorusGeometry(.043 * L, .0105, 6, 12, Math.PI * 1.15), skin, H); fin.rotation.set(0, Math.PI / 2, 0); fin.rotation.order = "YXZ"; fin.rotation.x = -Math.PI * .62; fin.position.set(x * mir, .004, -.006);
        const tip = mesh(new THREE.SphereGeometry(.0108, 8, 6), nail, fin); tip.position.set(Math.cos(Math.PI * 1.15) * .043 * L, Math.sin(Math.PI * 1.15) * .043 * L, 0); });
      const th = mesh(new THREE.CapsuleGeometry(.012, .045, 4, 8), skin, H); th.rotation.z = Math.PI / 2 * .8 * mir; th.position.set(-.045 * mir, -.03, -.035);
      const wr = mesh(new THREE.CylinderGeometry(.026, .03, .09, 12), skin, H); wr.rotation.x = Math.PI / 2 - .5; wr.position.set(0, -.045, -.105);
      const cuff = mesh(new THREE.CylinderGeometry(.034, .036, .05, 14), sleeve, H); cuff.rotation.x = Math.PI / 2 - .5; cuff.position.set(0, -.07, -.155);
      H.scale.setScalar(1.05); S.gh[key] = H;
    }
    /* a valódi (követett) kéz eltűnik, amíg a markoló kéz a keréken van */
    try { document.querySelectorAll("[hand-tracking-controls]").forEach((el) => { const d = el.components["hand-tracking-controls"]; if (d && d.data && d.data.hand === key) el.object3D.visible = !w; }); } catch (e) {}
    if (!w) { if (H.parent) H.parent.remove(H); return; }
    w.spin.add(H); H.position.set(-Math.sin(b) * w.WR, Math.cos(b) * w.WR, 0); H.rotation.set(0, 0, b);
  }
  const WA_MAX = .9 * Math.PI;   /* ±162° a végállásig – érzékenyebb áttétel (a lapát max. ~31°) */
  /* oldalerő-tényező a látszólagos szélszög szerint (0–1): kileng (≤18°) → 0, éles szél 30–55° → 1, félszél 90° → 0,8, bővszél 130° → 0,3, hátszél → ~0,08 */
  function heelCs(awa) { if (awa < 18) return 0; if (awa < 30) return (awa - 18) / 12; if (awa < 55) return 1; if (awa < 90) return 1 - (awa - 55) / 35 * .2; if (awa < 130) return .8 - (awa - 90) / 40 * .5; return Math.max(.06, .3 - (awa - 130) / 50 * .24); }
  const HEEL_KR = 205;   /* felállító nyomaték (normált) – kb. 18° dőlés cirkálásban ~22 csomós látszólagos szélben */
  function heelEq(awa, aws) { const F = aws * aws * heelCs(awa); let th = .2; for (let i = 0; i < 4; i++) th = Math.asin(clamp(F * Math.pow(Math.cos(th), 1.3) / HEEL_KR, 0, .9)); return th; }
  const vrWave = (x, z, t) => waveAt(x + (VRR.fox || 0), z + (VRR.foz || 0), t);   /* a látható (gyorsított) vízmintával egyező hullámmagasság */
  /* a hajó vízellenállása (N) a valódi sebesség (m/s) függvényében – a vitorlásjacht-tervezés szokásos módszere szerint:
     • súrlódási ellenállás: R_f = ½·ρ·S·C_f·(1+k)·v², ahol C_f az ITTC-1957 képlet: 0,075 / (log10(Re) − 2)², Re = v·(0,7·L_vízvonal)/ν
       (így számol a delfti jachttest-sorozat is);
     • maradék (hullámkeltő) ellenállás: a vízkiszorítás súlyának hányada a Froude-szám (Fn = v/√(g·L)) függvényében – a delfti sorozat (DSYHS)
       könnyű/közepes vízkiszorítású testeire jellemző, KÖZELÍTŐ görbe (nem ennek a hajónak a mért adata).
     Adatok: tömeg 2300 kg (a tulajdonos adata), hozzáadott (együtt mozgó víz) tömeg +8%, vízvonalhossz 7,4 m, nedvesített felület ~13,5 m² (test + tőkesúly + kormány,
     becslés: 2,7·√(V·L) + függelékek), édesvíz 15 °C (ρ = 1000 kg/m³, ν = 1,14·10⁻⁶ m²/s), alaktényező 1,10. */
  const VR_HYD = { m: 2300, add: 1.08, Lwl: 7.4, Sw: 13.5, rho: 1000, nu: 1.14e-6, k1: 1.1, rr: [[.1, 0], [.15, .0002], [.2, .0006], [.25, .0018], [.3, .0042], [.35, .0095], [.4, .021], [.45, .042], [.5, .066], [.55, .086], [.6, .1], [.8, .13]] };
  function vrHydR(v) { v = Math.abs(v); if (v < .02) return 0; const H = VR_HYD, Re = v * .7 * H.Lwl / H.nu, cf = .075 / Math.pow(Math.log10(Re) - 2, 2), Rf = .5 * H.rho * H.Sw * cf * H.k1 * v * v, Fn = v / Math.sqrt(9.81 * H.Lwl), T = H.rr;
    let r = T[T.length - 1][1]; if (Fn <= T[0][0]) r = 0; else for (let i = 1; i < T.length; i++) if (Fn <= T[i][0]) { r = lerp(T[i - 1][1], T[i][1], (Fn - T[i - 1][0]) / (T[i][0] - T[i - 1][0])); break; }
    return Rf + r * H.m * 9.81; }
  const VR_SPD = 1.95;   /* sebesség-szorzó: a 15 m-es versenyjacht 9–16 csomóval száguld (élmény), a pályák rövidebbek lesznek */   /* ütközéstől ütközésig ~2,5 fordulat (mint egy nagy jachton) */
  /* --------------------------------------------------------------- képkocka */
  /* ================= SZABÁLYOK (2026-11-11, a tulajdonos kritikája után) =================
     BÓJAKERÜLÉS: a bója akkor számít megkerültnek, ha a hajó – a bóját BAL kéz felől hagyva (felülről nézve az óramutatóval ellentétesen haladva) – átlépi a bójából
     a forduló KÜLSŐ oldala felé húzott félegyenest (legfeljebb 45 m-re a bójától). Nem elég a közelében elhaladni; a rossz irányú átlépés hibát jelez. Ugyanez a szabály
     érvényes a játékosra és a gépi hajókra.  ÚTJOG: ellentétes csapáson a szelet JOBBRÓL kapó hajónak van útjoga (bumja a bal oldalon), azonos csapáson a szél felőli tér ki.
     A kitérésre kötelezett gépi hajó kitér; ha a játékos a kötelezett, az útjogos hajó rákiált („Backbord!”); ütközésnél a vétkes kap büntetést. A gépi hajók is hibáznak. */
  function vrMarkO(i) { const S = VRR, C = S.C, lm = { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 }, m = S.marks[i], p = i ? S.marks[i - 1] : lm, n = i + 1 < S.marks.length ? S.marks[i + 1] : lm;
    let ix = m.x - p.x, iz = m.z - p.z, il = Math.hypot(ix, iz) || 1, ox = n.x - m.x, oz = n.z - m.z, ol = Math.hypot(ox, oz) || 1; ix /= il; iz /= il; ox /= ol; oz /= ol;
    let x = ix - ox, z = iz - oz, l = Math.hypot(x, z); if (l < .35) { x = -iz; z = ix; l = 1; } return [x / l, z / l]; }
  function vrRoundCheck(o, i) { const m = VRR.marks[i], O = vrMarkO(i), rx = o.x - m.x, rz = o.z - m.z, sd = O[0] * rz - O[1] * rx, d = O[0] * rx + O[1] * rz;
    if (o._mi !== i) { o._mi = i; o._ms = sd; return 0; } const prev = o._ms; o._ms = sd; if (d > 1.5 && d < 45) { if (prev > 0 && sd <= 0) return 1; if (prev < 0 && sd >= 0) return -1; } return 0; }
  const vrStb = (b) => wrapA(VRR.wf - b) > 0;   /* a szél jobbról jön (a szél felőli irány a hajó orrától jobbra esik) */
  function vrGiveWay(a, o) { const as = vrStb(a.b), os = vrStb(o.b); if (as !== os) return !as; const uw = vfwd(VRR.wf); return (a.x - o.x) * uw[0] + (a.z - o.z) * uw[1] > 0; }   /* igaz: „a”-nak kell kitérnie */
  /* a rákiáltás legyen nagyon intenzív és haragos (a tulajdonos kérése): háromszor, hangosan, gyorsan, mély dühös hangon + éles, ismétlődő kürt */
  function vrHail(txt) {
    try { speechSynthesis.cancel(); const hu = (speechSynthesis.getVoices() || []).find((v) => /^hu/i.test(v.lang));
      [txt.toUpperCase() + "!", txt.toUpperCase() + "!!", "Térj már ki! " + txt.toUpperCase() + "!!!"].forEach((q, i) => { const u = new SpeechSynthesisUtterance(q); u.lang = "hu-HU"; if (hu) u.voice = hu; u.rate = 1.45 + i * .1; u.pitch = .55 + i * .12; u.volume = 1; speechSynthesis.speak(u); }); } catch (e) {}
    try { const a = T.ac(); if (a) [0, .16, .32, .55, .71].forEach((d, i) => { const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + d; o.type = "sawtooth"; o.frequency.setValueAtTime(i < 3 ? 330 : 262, t0); o.frequency.linearRampToValueAtTime(i < 3 ? 300 : 230, t0 + .13); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.22, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + .14); o.connect(g).connect(T.outBus()); o.start(t0); o.stop(t0 + .16); }); } catch (e) {}
  }
  function vrTick(dt) {
    const S = VRR, C = S.C;
    if (S.ensign) { const pa = S.ensign.geometry.attributes.position, b0 = S.ensign.userData.base, t = W.t; for (let i = 0; i < pa.count; i++) { const x = b0[i * 3]; pa.array[i * 3 + 2] = Math.sin(x * 9 - t * 7) * .05 * x / .6; } pa.needsUpdate = true; }
    /* KÉZI FOGÁS – MARKOLÁS (nem csippentés): ha a tenyered a perem mellett van és ökölbe zárod, a kezed „ráfog” a kerékre
       (a peremen megjelenik a markoló kéz), amíg zárva tartod, a kerék a kezeddel együtt fordul. Ha lendületből elengeded,
       a kerék magától tovább pörög a végállásig (és ott kicsit visszapattan), mint egy igazi hajókormány. */
    const X = T.xr;
    /* KORMÁNYKERÉK v3 (2026. nov. 7., kutatás alapján):
       • a kerék a kéz középpont körüli SZÖGELFORDULÁSÁT követi a kerék síkjában (a VR-ben bevált módszer), zajszűrővel (one-euro) – azonnal reagál, de nem remeg;
       • markolás: ökölbe zárt kéz VAGY csippentés a perem mellett, bőséges fogási zónával; a kéz a peremen marad (markoló kéz), amíg nyitva nem engeded;
       • engedékeny: rövid kézkövetés-vesztésnél (0,45 mp) vagy egy pillanatnyi ujjnyílásnál (0,1 mp) nem enged el – a Meta útmutatója szerint az ökölbe zárt
         ujjakat rosszul követi a kamera, ezért a fogás csak akkor ér véget, ha tényleg kinyitod a kezed;
       • két kézzel is foghatod (a két kéz elfordulásának átlaga);
       • elengedve: a kormánylapátra ható víznyomás a hajósebesség NÉGYZETÉVEL nő – gyors menetben a víz visszahúzza a kereket középre,
         lassan a súrlódás miatt ott marad, ahol hagytad; gyors menetben a hullámok finoman megmozgatják; lendületből elengedve kipörög a végállásig. */
    const curl = (s0) => { const j = s0.jp, c = s0.palmC; if (!j || !c) return -1; let sum = 0, n = 0; [j.it, j.mt, j.rt, j.pt].forEach((t) => { if (!t) return; sum += clamp((.115 - t.distanceTo(c)) / .06, 0, 1); n++; }); return n ? sum / n : -1; };
    const pinchOf = (s0, h) => { if (X && X.pinch && X.pinch[h]) return true; const j = s0.jp; return !!(j && j.tt && j.it && j.tt.distanceTo(j.it) < .028); };
    const squeeze = (s0) => { try { const b = s0.src && s0.src.gamepad && s0.src.gamepad.buttons; return !!(b && b[1] && b[1].pressed); } catch (e) { return false; } };
    S.grabs = S.grabs || {}; S.hold = S.hold || {};
    let dSum = 0, dN = 0;
    S.near = false;
    if (T.inVR && X && X.src) {
      if (S.tiller) ["right", "left"].forEach((h) => {   /* BOTKORMÁNY: a kéz a toldó markolatát fogja; a rúd a kéz helyéből számolódik */
        const TI = S.ck.tiller, s0 = X.src[h], G = S.grabs[h], pt = s0 && (s0.palmC || s0.wristJ || s0.tip);
        if (!s0 || !pt) { if (G) { G.lost = (G.lost || 0) + dt; if (G.lost > 2.5) wheelRelease(h); } S.hold[h] = false; return; }
        const g = s0.hand ? curl(s0) : (squeeze(s0) ? 1 : 0), pin = !!s0.hand && pinchOf(s0, h);
        const holding = g > .45 || pin, open = (g >= 0 && g < .16) && !pin;
        const lp = S.ck.G.worldToLocal(_wv.copy(pt)).clone();
        /* 2026-11-11 23:07 (tulajdonos: „a rudat lehessen több helyen megfogni, ahogy az életben”): a kormányrúd ÉS a toldó teljes hosszában fogható.
           A kézhez legközelebbi pontot keressük a rúdon (forgáspont→csukló) és a toldón (csukló→markolat); ott fogod meg, és onnan mozgatod:
           a rúdon fogva a kéz iránya a forgásponttól adja a szöget, a toldón fogva a fogás helyéig érő toldóhosszal számolunk. */
        const c0t = S.wa / WA_MAX * TI.TMAX, tipX = Math.sin(c0t) * TI.TL, tipZ = TI.pz + Math.cos(c0t) * TI.TL;
        const near = () => { const segP = (ax, ay, az, bx, by, bz) => { const vx = bx - ax, vy = by - ay, vz = bz - az, L2 = vx * vx + vy * vy + vz * vz, u = clamp(((lp.x - ax) * vx + (lp.y - ay) * vy + (lp.z - az) * vz) / L2, 0, 1), qx = ax + vx * u, qy = ay + vy * u, qz = az + vz * u; return { u, x: qx, y: qy, z: qz, d: Math.hypot(lp.x - qx, lp.y - qy, lp.z - qz) }; };
          const a = segP(0, TI.py + .02, TI.pz, tipX, TI.ty, tipZ), dir = TI.dir || TI.rest, b = segP(tipX, TI.ty, tipZ, tipX + dir.x * TI.EL, TI.ty + dir.y * TI.EL, tipZ + dir.z * TI.EL);
          return b.d <= a.d + .04 ? { d: b.d, q: b, s: Math.max(.12, b.u * TI.EL) } : { d: a.d, q: a, r: Math.max(.25, a.u * TI.TL) }; };
        if (G) {
          if (G.lp && G.lp.distanceTo(pt) > .3) { G.lost = (G.lost || 0) + dt; if (G.lost > 2.5) wheelRelease(h); else G.lp.lerp(pt, .08); return; }
          (G.lp || (G.lp = new THREE.Vector3())).copy(pt);
          G.lost = 0; if (open) { G.off = (G.off || 0) + dt; if (G.off > .6) { wheelRelease(h); S.hold[h] = holding; return; } } else G.off = 0;
          const ex = lp.x + G.ox, ey = lp.y + G.oy, ez = lp.z + G.oz;   /* a markolat kívánt helye (a fogás pillanatának eltolásával – nem ugrik) */
          /* a kéz oldalirányú elmozdulása a megfogás óta: 28 cm = teljes kitérés. Eltolod magadtól (a hajó közepe felé) → a rúd balra megy → a hajó JOBBRA fordul. */
          if (G.x0 == null) { G.x0 = lp.x; G.wa0 = S.wa; }
          const tgW = clamp(G.wa0 + (lp.x - G.x0) / TI.REACH * WA_MAX, -WA_MAX, WA_MAX); S.wa += (tgW - S.wa) * Math.min(1, dt * 12); S.wv = 0;
          if (G.s) G.e = (G.e || new THREE.Vector3()).set(ex, ey, ez);
        } else if (holding && !S.hold[h]) { const n = near(); if (n.d < .3) {   /* fogás: a kéz a rúd vagy a toldó BÁRMELY pontja közelében zárul (vagy csippent) */
          S.grabs[h] = { tiller: true, key: h, ray: false, hist: [[W.t, S.wa]], s: n.s || 0, r: n.r || 0, ox: n.q.x - lp.x, oy: n.q.y - lp.y, oz: n.q.z - lp.z }; S.wv = 0; try { flap(.02); X.pulse && X.pulse(h, .5, 30); } catch (e) {} }
        } else S.near = S.near || near().d < .3;
        S.hold[h] = holding;
      });
      else ["right", "left"].forEach((h) => {
        const s0 = X.src[h], G = S.grabs[h], pt = s0 && (s0.palmC || s0.wristJ || s0.tip);
        if (!s0 || !pt) { if (G) { G.lost = (G.lost || 0) + dt; if (G.lost > 2.5) wheelRelease(h); } S.hold[h] = false; return; }   /* 2026-11-11: a kézkövetés elvesztése 2,5 mp-ig NEM engedi el a kormányt */
        const g = s0.hand ? curl(s0) : (squeeze(s0) ? 1 : 0), pin = !!s0.hand && pinchOf(s0, h);
        const holding = g > .45 || pin, open = (g >= 0 && g < .16) && !pin;   /* elengedés: csak TÉNYLEG nyitott tenyérrel (fél mp-ig) */
        if (G) {
          if (G.lp && G.lp.distanceTo(pt) > .3) { G.lost = (G.lost || 0) + dt; if (G.lost > 2.5) wheelRelease(h); else G.lp.lerp(pt, .08); return; }   /* valószerűtlen ugrás = követési hiba: kivárjuk */
          (G.lp || (G.lp = new THREE.Vector3())).copy(pt);
          G.lost = 0; if (open) { G.off = (G.off || 0) + dt; if (G.off > .5) { wheelRelease(h); S.hold[h] = holding; return; } } else G.off = 0;
          /* 2026-11-11 (a tulajdonos közvetített Quest-képén láttam: a kerék kis kézmozdulatra ~200°-ot pördült, a kéz az agyhoz csúszott, a hajó megállt):
             a kéz SZÖGE helyett az OLDALIRÁNYÚ elmozdulása kormányoz. Az agy közelében a szög kis mozdulatra is hatalmasat ugrott – ez „szabadította el” a kormányt.
             Most: megfogás után a kezed bárhol lehet; 25 cm oldalra = majdnem teljes kitérítés; a kerék simán követ. Elengedés: CSAK nyitott tenyérrel. */
          const lp = G.w.wheel.worldToLocal(_wv.copy(pt));
          if (Math.hypot(lp.x, lp.y, lp.z) > 1.4) { wheelRelease(h); S.hold[h] = holding; return; }
          if (G.x0 == null) { G.x0 = lp.x; G.wa0 = S.wa; }
          const tgW = clamp(G.wa0 - (lp.x - G.x0) * (WA_MAX * .8 / .25), -WA_MAX, WA_MAX); S.wa += (tgW - S.wa) * Math.min(1, dt * 8); S.wv = 0;
          G.hist.push([W.t, S.wa]); while (G.hist.length > 2 && W.t - G.hist[0][0] > .2) G.hist.shift();
        } else if (holding && !S.hold[h]) {   /* fogás kezdete: a kéz a perem mellett zárul (vagy csippent) */
          S.ck.wheels.forEach((w) => { if (S.grabs[h]) return; const lp = w.wheel.worldToLocal(_wv.copy(pt)), r = Math.hypot(lp.x, lp.y);
            if (Math.abs(lp.z) < .36 && r > w.WR - .34 && r < w.WR + .34) { const a0 = Math.atan2(-lp.x, lp.y); S.grabs[h] = { w, a: a0, f: a0, key: h, ray: false, hist: [[W.t, S.wa]] }; S.wv = 0; vrGripHand(w, h, a0 - S.wa); try { flap(.02); X.pulse && X.pulse(h, .5, 30); } catch (e) {} } });
        }
        S.hold[h] = holding;
      });
    }
    S.grab = S.grabs.right || S.grabs.left || null;
    if (dN) { S.wa = clamp(S.wa + dSum / dN * 1.5, -WA_MAX, WA_MAX);   /* érzékenyebb áttétel: kis kézmozdulat is kormányoz */ Object.values(S.grabs).forEach((G) => { G.hist.push([W.t, S.wa]); while (G.hist.length > 2 && W.t - G.hist[0][0] > .2) G.hist.shift(); }); }
    /* 2026-11-11 KONTROLLERES KORMÁNYZÁS (tulajdonos: „a Quest kontrollerét vegyük be, a belső joystick részével … mindkettő menjen, bal- és jobbkezes is tudjon;
       legyen választható opció, de a kézzel történő irányításról nem mondok le”): bármelyik kontroller hüvelykujjkarja oldalra billentve kormányoz – a kerék
       a kar állását követi (arányosan, simítva), elengedve középre áll. Nem kell átkapcsolni: amelyik a kezedben van, az él; a kézi (ökölfogásos) kormány változatlan. */
    let stk = 0, stkN = 0; try { Object.keys((X && X.src) || {}).forEach((key) => { const q = X.src[key], gp = q && q.src && !q.src.hand && q.src.gamepad; if (!gp || !gp.axes) return; const ax = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0]; if (typeof ax === "number" && Math.abs(ax) > .12) { stk += ax; stkN++; } }); } catch (e) {}
    S.stickOn = stkN > 0;
    const k = SAIL.keys; if (k.L || k.R) { S.wa = clamp(S.wa + ((k.R ? 1 : 0) - (k.L ? 1 : 0)) * dt * 2.4, -WA_MAX, WA_MAX); S.wv = 0; }
    else if (stkN && !S.grab && !S.rgrab) { const v = clamp(stk, -1, 1), tg = Math.sign(v) * Math.pow((Math.abs(v) - .12) / .88, 1.4) * WA_MAX * .8; S.wa += (tg - S.wa) * Math.min(1, dt * 4.5); S.wv = 0; S.padUsed = true; }
    else if (!S.grab && !S.rgrab) {
      S.wv = 0; S.wa += (0 - S.wa) * Math.min(1, dt * 1.6); if (Math.abs(S.wa) < .004) S.wa = 0;   /* 2026-11-11: elengedve a kormány simán középre áll – a hajó egyenesben marad, nem fordul tovább */
    }
    { const dT = S.wa / WA_MAX * .55; S.del = (S.del || 0) + (dT - (S.del || 0)) * Math.min(1, dt * 4.5); }   /* a lapát simán, kis késéssel követi a kereket (nagy hajó) */
    S.ck.wheels.forEach((w) => { w.spin.rotation.z = S.wa; const want = S.grab && S.grab.w === w ? 1.6 : (VRR.wHover ? .25 : 0) + (!S.everGrab && S.st === "pre" && w.sd < 0 ? .25 + .25 * Math.sin(W.t * 4) : 0); w.gripM.emissiveIntensity += (want - w.gripM.emissiveIntensity) * Math.min(1, dt * 8); });
    if (S.tiller) { const TI = S.ck.tiller, th = S.wa / WA_MAX * TI.TMAX; TI.til.rotation.y = th;   /* a rúd a kormányállást mutatja; a toldó a csuklótól a kézig (vagy nyugalmi helyére) ér */
      const tx = Math.sin(th) * TI.TL, tz = TI.pz + Math.cos(th) * TI.TL, G = S.grab && S.grab.tiller ? S.grab : null;
      _wv.copy(TI.rest).applyAxisAngle(_ty, th);   /* a toldó MEREV: a rúddal együtt fordul, nem csuklik */ (TI.dir || (TI.dir = new THREE.Vector3())).copy(_wv);
      TI.ext.position.set(tx, TI.ty, tz); TI.ext.quaternion.setFromUnitVectors(_tz, _wv); TI.end.set(tx, TI.ty, tz).addScaledVector(_wv, TI.EL - .1);
      const want = G ? 1.5 : (S.near ? .6 : 0) + (!S.everGrab && S.st === "pre" ? .3 + .3 * Math.sin(W.t * 4) : 0); TI.gripM.emissiveIntensity += (want - TI.gripM.emissiveIntensity) * Math.min(1, dt * 8); }
    if (S.grab) S.everGrab = true;
    if (S.helpL) { S.helpL.visible = T.inVR && !S.everGrab && S.st !== "done"; }   /* (2D-ben billentyű/gomb kormányoz – ott nem kell) */
    if (S.msgL) { const on = S.msgT > 0 && !!S.msg && S.st !== "done" && /⚠|BACKBORD|SZABÁLY|Korai rajt|szabálytalan|BEFUTÓ|✓/.test(S.msg); S.msgL.visible = on;   /* csak szabálysértés / visszaigazolás – nincs állandó szöveg */
      if (on) { const m = S.msg; let k = m.indexOf(" – "), L; if (k > 0) L = [m.slice(0, k), m.slice(k + 3)]; else if ((k = m.indexOf("! ")) > 0) L = [m.slice(0, k + 1), m.slice(k + 2)]; else L = [m, ""]; S.msgL.userData.set(L); } }   /* +z körüli forgás a kormányos felől nézve óramutató szerinti */
    /* fizika (a vitorlázás modellje, a nagyobb hajóhoz igazítva) */
    /* a szél lassan leng (±7°) – mint a Balatonon; a pálya ugyanaz marad */
    /* 2026-11-11 VÁLTOZÓ SZÉL (balatoni minta: lökéses ÉNy-i szél, kis forgások, néha tartós szélfordulás, erősödés/gyengülés) */
    if (!S.wx) { let sd = (C.lvl * 9301 + 49297 + ((Date.now() / 1000) | 0)) % 233280; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
      const big = rnd() < .18, n = 1 + (rnd() < .5 ? 1 : 0), sh = []; let t0 = 35 + rnd() * 50;
      for (let i = 0; i < n; i++) { sh.push({ t: t0, d: 25 + rnd() * 30, a: (rnd() < .5 ? -1 : 1) * (i === 0 && big ? 26 + rnd() * 12 : 6 + rnd() * 9) * D2R }); t0 += 70 + rnd() * 80; }
      const gu = []; let tg = -40 + rnd() * 20; while (tg < 1200) { const lull = rnd() < .3; gu.push({ t: tg, d: 7 + rnd() * 14, k: lull ? -(.14 + rnd() * .14) : .14 + rnd() * .2, a: (rnd() - .5) * 9 * D2R }); tg += 18 + rnd() * 40; }
      S.wx = { sh, gu, ph: rnd() * 6, tr: rnd() < .5 ? 1 : -1 }; }
    { const wx = S.wx; let wsh = 0, gdir = 0, gk = 1 + wx.tr * .12 * Math.sin(S.t / 140 + wx.ph) + .04 * Math.sin(S.t * 1.07);
      for (const q of wx.sh) { const u = clamp((S.t - q.t) / q.d, 0, 1); wsh += q.a * u * u * (3 - 2 * u); }
      for (const q of wx.gu) { const u = (S.t - q.t) / q.d; if (u > 0 && u < 1) { const e = Math.pow(Math.sin(u * Math.PI), .7); gk += q.k * e; gdir += q.a * e; } }
      S.wf = C.wf + wsh + gdir + Math.sin(S.t / 47 + C.lvl) * 6 * D2R + Math.sin(S.t / 13) * 2 * D2R; S.gkW = clamp(gk, .6, 1.5); }
    const twa = Math.abs(wrapA(S.wf - S.b)) * R2D;
    S.spinOn = S.spinOn ? twa > 98 : twa > 108; const spin = S.spinOn && S.st === "race";   /* hátszélben (és széles hátszélben) felhúzzák a spinakkert */
    S.gk = S.gkW;   /* lökések és szélcsendesebb foltok (7–20 mp), lassú erősödés/gyengülés */
    const vt = polar(twa, spin) * KN * VR_SPD * (S.heelPen || 1) * (S.st === "pre" ? .7 : 1) * (S.tws * S.gk / (12 * KN)) ** .5 * (1 + .08 * Math.sin(W.t * .23) * Math.sin(W.t * .07));
    /* gyorsabban gyorsul (a nagy vitorlafelület húz), a kormány fékez egy kicsit, ha nagyon el van tekerve */
    /* 2026-11-12 00:46 – A HAJÓ SIKLÁSA FIZIKAI MODELLEL (tulajdonos: „a hajó súlya 2300 kg … ha nem fújja a szél, azonnal megáll, miközben az életben még
       csúszik tovább, míg a közegellenállás meg nem állítja – pontos számítás, élethű mozgás”). Newton: (m + hozzáadott tömeg) · dv/dt = F_hajtó − R_víz(v) − F_szél.
       • R_víz = súrlódási + maradék (hullámkeltő) ellenállás – lásd vrHydR;  • F_hajtó: akkora erő, amely a polár szerinti sebességnél éppen egyensúlyt tart
         a vízellenállással (R(v_polár)); a cél alatt a vitorlák kicsit jobban húznak;  • F_szél: ha a vitorlák nem húznak (szélbe állva lobognak), a szembeszél
         a hajótestet, az árbocot és a lobogó vitorlákat fékezi (½·ρ_levegő·C_d·A·v²).
       Ha a hajtóerő megszűnik, a hajó a lendületéből SIKLIK tovább: gyorsan veszít a hullámkeltő tartományban (5–6 csomó fölött), aztán hosszan, lassan csúszik. */
    { const vR = S.v / VR_SPD, vtR = Math.max(0, vt / VR_SPD), mE = VR_HYD.m * VR_HYD.add;
      let F = vtR > .05 ? vrHydR(vtR) * (1 + .6 * clamp(1 - vR / vtR, 0, 1)) : 0;
      { const wv = vfwd(S.wf), fb = vfwd(S.b), hw = (wv[0] * fb[0] + wv[1] * fb[1]) * S.tws * S.gk + vR, fl = clamp((42 - twa) / 10, 0, 1); if (fl > 0 && hw > 0) F -= .5 * 1.2 * (2 + 3 * fl) * fl * hw * hw; }   /* C_d·A: test+árboc+kötélzet ~2 m², a lobogó vitorlák további ~3 m² (becslés) */
      const Rw = vR > .08 ? 22 * Math.pow(S.tws * S.gk / 6, 2) : 0;   /* a hullámok okozta többletellenállás (a széllel nő) – ettől áll meg végül a sikló hajó */
      const v2 = Math.max(0, vR + (F - vrHydR(vR) - Rw) / mE * dt); S.v = v2 * VR_SPD; S.dragN = vrHydR(v2) + Rw; }
    S.v *= 1 - Math.abs(S.del) * .16 * dt;
    /* fordulás: sebességfüggő, de lassan is kormányozható; kis tehetetlenséggel (nem ugrik, de jól reagál) */
    { const yrT = Math.sin(S.del) * (.085 * S.v + .24); S.yr = (S.yr || 0) + (yrT - (S.yr || 0)) * Math.min(1, dt * 3.2); }
    S.b = (S.b + S.yr * dt + TAU) % TAU;
    const [fx, fz] = vfwd(S.b); S.x += fx * S.v * dt; S.z += fz * S.v * dt;
    /* látszólagos szél, vitorlák, dőlés */
    const wfv = vfwd(S.wf), tw = [wfv[0] * S.tws * S.gk, wfv[1] * S.tws * S.gk], aw = [tw[0] + fx * S.v, tw[1] + fz * S.v], aws = Math.hypot(aw[0], aw[1]);
    const awa = Math.acos(clamp((aw[0] * fx + aw[1] * fz) / (aws || 1), -1, 1)) * R2D;
    const port = [fz, -fx], side = (wfv[0] * port[0] + wfv[1] * port[1]) > 0 ? -1 : 1;
    if (side !== S.lastSide) { if (S.lastSide) { S.tackT = 3.4; flap(.16); setTimeout(winch, 1500); setTimeout(winch, 2300); } S.lastSide = side; }
    S.tackT = Math.max(0, S.tackT - dt);
    const BS = S.boat.userData.S; BS.side = side; BS.boom = clamp((awa - 22) * .72, 5, 80) * D2R * side; BS.jib = clamp((awa - 22) * .5, 7, 50) * D2R;
    BS.luff = Math.max(clamp(1 - (awa - 16) / 16, 0, 1), S.tackT > 1.4 ? .7 : 0); BS.spin += ((spin ? 1 : 0) - BS.spin) * Math.min(1, dt * .4);
    /* DŐLÉS – fizikai modell (kutatás alapján): a dőlő nyomaték ∝ látszólagos szélsebesség² × oldalerő-tényező(látszólagos szélszög) × cos^1,3(dőlés),
       a felállító nyomaték ∝ sin(dőlés). Az oldalerő éles szélben (cirkálás, 25–55°) a legnagyobb, félszélben kisebb (több hajtás, kevesebb dőlés),
       hátszélben szinte nulla (ott a spinakker inkább ringat). Felfelé fordulva nő a látszólagos szél és a dőlés, leesve csökken.
       Mozgásegyenlet csillapított lengéssel (~4,5 s sajátperiódus) – a széllökésre túllendül, majd beáll. */
    { /* a dőléshez a „valódi” (gyorsítás nélküli) hajósebességből számolt látszólagos szél kell – különben a VR-gyorsítás miatt a szél túl előre fordulna */
      const vR = S.v / VR_SPD, awH = [tw[0] + fx * vR, tw[1] + fz * vR], awsH = Math.hypot(awH[0], awH[1]), awaH = Math.acos(clamp((awH[0] * fx + awH[1] * fz) / (awsH || 1), -1, 1)) * R2D;
      const luffH = Math.max(clamp(1 - (awaH - 14) / 12, 0, 1), S.tackT > 1.4 ? .7 : 0);
      /* a vitorlák a valódi látszólagos szélhez trimmelnek (a VR-gyorsítás nélkül) – különben gyors haladásnál is belobognának */
      BS.awa = awaH; BS.aws = awsH; BS.gust = S.gk; BS.tackT = S.tackT; S.awaR = awaH;
      const F = (awsH * awsH) * heelCs(awaH) * (1 - luffH * .85) * (1 - BS.spin * .75 * clamp((awaH - 75) / 55, 0, 1)) * (1 + BS.spin * .5 * clamp(1 - (awaH - 75) / 45, 0, 1)), th = S.heel || 0, w0 = 1.4, zeta = .38;
      let M = (F * Math.pow(Math.cos(th), 1.3) - HEEL_KR * Math.sin(th)) / HEEL_KR;
      if (BS.spin > .5) M += Math.sin(.065) * Math.sin(W.t * 1.25) * clamp(aws / 9, 0, 1.4) * BS.spin;   /* spinakker alatt hátszélben ringatózás (oldalra-oldalra) */
      S.heelV = (S.heelV || 0) + (M * w0 * w0 - 2 * zeta * w0 * (S.heelV || 0)) * dt; S.heel = clamp(th + S.heelV * dt, -.2, .62);
      S.heelPen = S.heel > 22 * D2R ? 1 - (S.heel - 22 * D2R) / (30 * D2R) * .3 : 1;   /* túl nagy dőlésnél a hajó nem gyorsul tovább (kevésbé hatékony) */
      /* luvgierigkeit: dőlésben a hajó a szél felé „húz” – a kormánnyal kell ellentartani */
      S.yr += Math.sign(wrapA(S.wf - S.b)) * Math.max(0, S.heel) * .1 * Math.min(1, S.v / 5) * dt * 3; }
    BS.heel = -side * S.heel * .78;   /* látványban kicsit visszafogva (a kormányos helye le van horgonyozva) */
    /* mozgás a hullámokon: a lassú hajót dobálja a víz (jobban ring), a száguldó hajó kisimul – csak néha ugrik meg egy-egy hullámon */
    const hb = vrWave(S.x + fx * 6, S.z + fz * 6, W.t), hs2 = vrWave(S.x - fx * 6, S.z - fz * 6, W.t);
    const rockK = clamp(1.25 - S.v / 8, .28, 1.25);
    S.slam = (S.slam || 0) * Math.pow(.015, dt);
    if (S.v > 5 && S.prevHb != null && (hb - S.prevHb) / Math.max(dt, .001) > .45 && W.t - (S.slamT || 0) > 1.6 && Math.random() < .35) { S.slam = .03 + Math.random() * .02; S.slamT = W.t; S.sprayBurst = 1; }
    S.prevHb = hb;
    BS.pitch = clamp((hs2 - hb) / 12 * 1.1 * rockK, -.05, .05) - S.slam * Math.sin(Math.min(1, (W.t - (S.slamT || 0)) * 3) * Math.PI);
    BS.heel += Math.sin(W.t * .83 + 1.3) * .03 * rockK + Math.sin(W.t * 1.37) * .012 * rockK;
    S.boat.position.y = (hb + hs2) / 2 * .5 * rockK + S.slam * 3 * Math.sin(Math.min(1, (W.t - (S.slamT || 0)) * 3) * Math.PI);
    S.boat.userData.update(dt);
    /* permet: a hajó a root-ban áll (a világ mozog), ezért a cseppek hátrafelé sodródnak a hajó sebességével */
    if (S.spray) { const P = S.spray, bowZ = -HULL.L / 2 * VR_SC, k = clamp((S.v - 2) / 4.5, 0, 1.6), back = S.v * 1.7, bp = S.boat.position.y;
      P.acc += dt * (k * 520 + (S.sprayBurst ? 900 : 0)); const burst = S.sprayBurst; S.sprayBurst = 0;
      while (P.acc > 1) { P.acc -= 1; const i = P.i; P.i = (P.i + 1) % P.N; const sd = Math.random() < .5 ? -1 : 1, bow = Math.random() < .62, b = i * 3;
        const z0 = bow ? bowZ + 1.2 + Math.random() * 1.6 : bowZ + 3 + Math.random() * 4.5, x0 = sd * (bow ? .35 + Math.random() * .5 : 1.7 + Math.random() * .4);
        P.pos[b] = x0; P.pos[b + 1] = bp + .15 + Math.random() * .2; P.pos[b + 2] = z0;
        const fl = !bow && !burst && Math.random() < .55;   /* habpelyhek a vízen: laposan, gyorsan suhannak hátra a hajó mellett */
        const up = fl ? .25 + Math.random() * .5 : (bow ? 2.2 : 1.2) + Math.random() * 2.4 * (.5 + k) + (burst ? 2.5 : 0), out = fl ? .5 + Math.random() * 1.6 : (bow ? 1.6 : 1.1) + Math.random() * 2.2 * (.4 + k);
        P.vel[b] = sd * out; P.vel[b + 1] = up; P.vel[b + 2] = back * (.6 + Math.random() * .4) - (bow ? 1.2 : 0);
        P.max[i] = P.life[i] = .7 + Math.random() * .8; }
      for (let i = 0; i < P.N; i++) { const b = i * 3; if (P.life[i] <= 0) { P.col[b] = P.col[b + 1] = P.col[b + 2] = 0; continue; }
        P.life[i] -= dt; P.vel[b + 1] -= 9.8 * dt; P.pos[b] += P.vel[b] * dt; P.pos[b + 1] += P.vel[b + 1] * dt; P.pos[b + 2] += P.vel[b + 2] * dt;
        if (P.pos[b + 1] < bp - .1) P.life[i] = 0;
        const f = Math.max(0, P.life[i] / P.max[i]), a = Math.min(1, f * 1.6) * .42; P.col[b] = a * .92; P.col[b + 1] = a * .97; P.col[b + 2] = a; }
      P.pts.geometry.attributes.position.needsUpdate = true; P.pts.geometry.attributes.color.needsUpdate = true; }
    /* a kormányos helye „lehorgonyozva”: a dőlés/bólintás/hullámzás a kormány körül forgatja a hajót, nem a láb alól húzza ki –
       így a kerék mindig a kéz ügyében marad, a fedélzet nem csúszik el (kényelmesebb, kevésbé émelyítő) */
    if (S.helmL) { const bd = S.boat.userData.body; bd.updateMatrix(); S.boat.updateMatrix(); const cur = S.helmL.clone().applyMatrix4(bd.matrix).applyMatrix4(S.boat.matrix);
      W.root.position.set(S.rootX - (cur.x - S.helmRest.x), S.baseY - (S.seated && T.inVR ? .45 : 0) - (cur.y - S.helmRest.y), S.rootZ - (cur.z - S.helmRest.z)); }
    /* legénység: a szél felőli oldalra ül (forduláskor átmászik) */
    S.crewSide = S.crewSide == null ? -side : S.crewSide + (-side - S.crewSide) * Math.min(1, dt * .9);
    S.ck.crew.forEach((c, i) => { const s = S.ck.sh(c.u); c.g.position.set(S.crewSide * (s.hb - .55), s.y - .02, s.z); c.g.rotation.y = S.crewSide > 0 ? Math.PI / 2 : -Math.PI / 2; c.g.rotation.z = Math.sin(W.t * 2 + i) * .03; });
    /* környezet a hajó körül */
    S.env.rotation.y = S.b; S.far.rotation.y = S.b;
    S.env.position.set(-S.x, 0, -S.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), S.b);
    const wm = S.water; wm.position.set(Math.round(S.x / 40) * 40, 0, Math.round(S.z / 40) * 40);
    const mat = wm.userData.mat; S.wt = (S.wt == null ? W.t : S.wt) + dt * (.4 + .6 * clamp(S.v / 3, 0, 1)); mat.uniforms.uT.value = S.wt;   /* 2026-11-11: álló/lassú hajónál a hullámkép lassabban vonul – a keresztben futó hullámok „oldalra csúszás” érzetét keltették */ S.fox = (S.fox || 0) + fx * S.v * dt * 1.1; S.foz = (S.foz || 0) + fz * S.v * dt * 1.1; mat.uniforms.uOff.value.set(wm.position.x + S.fox, wm.position.z + S.foz);   /* sebességérzet: a víz mintázata ~2× gyorsabban fut el a hajó mellett (a fizika változatlan) */ mat.uniforms.uWind.value = Math.atan2(-wfv[1], -wfv[0]);
    const cw = new THREE.Vector3(); T.camObj().getWorldPosition(cw); mat.uniforms.uCam.value.copy(S.env.worldToLocal(cw));
    S.wake.push(S.x, S.z, Math.atan2(fx, fz), S.v, dt, .05);
    S.gulls.tick(dt, S.x, S.z);
    (S.spect || []).forEach((q) => { q.g.position.y = Math.sin(W.t * 1.1 + q.ph) * .08; q.g.rotation.z = Math.sin(W.t * .9 + q.ph) * .03; q.g.rotation.x = Math.sin(W.t * .7 + q.ph * 2) * .02; });
    /* verseny-állapot */
    S.t += dt;
    if (S.st === "pre") { [-30, -10, -5, -4, -3, -2, -1].forEach((tt) => { if (S.t >= tt && !S.horns[tt]) { S.horns[tt] = 1; if (tt === -30 || tt === -10) horn(.7, .14); else beep(); } }); if (S.t >= 0) { S.st = "race"; horn(1.5, .2);
        /* korai rajt (OCS): a rajtjelkor a vonal pálya felőli oldalán vagy → egyéni visszahívás, vissza kell menni a vonal mögé */
        if (lineSide(S) > 0) { S.ocs = 1; S.msg = "Korai rajt! Fordulj vissza, és menj át újra a rajtvonalon."; S.msgT = 8; setTimeout(() => horn(.4, .14), 700); }
        else { S.msg = "RAJT! Irány az 1. bója"; S.msgT = 5; } S.guideT = W.t + 12; } }
    if (S.st === "race" && S.ocs) { const ls = lineSide(S); if (S.ocs === 1 && ls <= 0) S.ocs = 2; else if (S.ocs === 2 && ls > 0) { S.ocs = 0; S.msg = "✓ Szabályos rajt – irány az 1. bója"; S.msgT = 5; horn(.3, .1); } }
    /* bójakerülés: a bója 26 m-es körén belül; a bója bal kéz felől maradjon (a hajó a bója jobbján halad el) */
    if (S.st === "race" && !S.fin && !S.ocs) {
      if (S.next < S.marks.length) { const m = S.marks[S.next], d = Math.hypot(m.x - S.x, m.z - S.z), rc = vrRoundCheck(S, S.next);
        if (d < 45) S.nearMk = S.next + 1;
        if (rc === 1) { S.next++; S.nearMk = 0; S.guideT = W.t + 10; horn(.3, .1); S.msg = S.next < S.marks.length ? `✓ ${S.next}. bója megkerülve – jöhet a ${S.next + 1}.` : "✓ Utolsó bója megkerülve – irány a befutó: a két bója KÖZÖTT!"; S.msgT = 5; S.wrongT = 0; }
        else if (rc === -1 && (!S.wrongT || W.t - S.wrongT > 6)) { S.wrongT = W.t; S.msg = "⚠ Rossz irány! A bóját BAL kéz felől kell megkerülni – fordulj vissza, és kerüld meg az óramutatóval ellentétesen"; S.msgT = 6; S.guideT = W.t + 12; beep(); }
        else if (S.nearMk === S.next + 1 && d > 80) { S.nearMk = 0; S.msg = `⚠ Nem kerülted meg a(z) ${S.next + 1}. bóját! Vissza kell menned – enélkül nincs érvényes futam.`; S.msgT = 7; S.guideT = W.t + 15; beep(); setTimeout(beep, 250); } }
      else if (crossLine(S)) { S.fin = S.t; S.res.push({ n: "Zephyr (te)", t: S.t, me: true }); horn(1.2, .2); S.msg = "BEFUTÓ!"; S.msgT = 6; }
    }
    S.prevSide = lineSide(S);
    /* ellenfelek: a regatta mesterséges intelligenciája (cirkálás laylinig, hátszélben jibbelés), bóják bal kéz felől */
    S.riv.forEach((r) => vrRivalTick(r, dt));
    if (S.st === "race" && S.res.length === S.riv.length + 1 && !S.doneT) { S.doneT = S.t; vrFinish(); }
    /* ha az ellenfelek már rég beértek (5 perce – kezdőknek is legyen idejük), a futam véget ér – feladtad (DNF) */
    if (S.st === "race" && !S.fin && !S.doneT && S.riv.every((r) => r.fin) && S.t - Math.max(...S.riv.map((r) => r.fin)) > 300) { S.doneT = S.t; S.dnf = true; S.res.push({ n: "Zephyr (te)", t: S.t, me: true, dnf: true }); vrFinish(); }
    S.msgT = Math.max(0, (S.msgT || 0) - dt);
    /* a következő bója jelzése */
    const tgt = S.ocs === 1 ? { x: (C.line.a.x + C.line.b.x) / 2 - C.u[0] * 30, z: (C.line.a.z + C.line.b.z) / 2 - C.u[1] * 30 } : S.next < S.marks.length ? S.marks[S.next] : { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 };
    { const lineMid = { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 }, isGate = S.st === "pre" || !!S.ocs || S.next >= S.marks.length;
      courseTick(dt, isGate ? lineMid : tgt, { x: S.x, z: S.z }, isGate, !isGate); }   /* az útvonal mindig a hajódtól indul */
    S.arrow.visible = !S.fin && S.next < S.marks.length && S.st !== "pre" && !S.ocs; S.arrow.position.set(tgt.x, .25, tgt.z); S.arrow.children.forEach((m) => { m.material.opacity = .5 + .3 * Math.sin(W.t * 3); });
    S.beam.position.set(tgt.x, 30, tgt.z); S.beam.visible = !S.fin && Math.hypot(tgt.x - S.x, tgt.z - S.z) > 35;   /* közel már a vízen lévő nyíl mutat */ S.beamLbl.visible = false; S.beamLbl.position.set(tgt.x, 14 + Math.sin(W.t * 1.5) * .4, tgt.z);
    { const dl = Math.hypot(tgt.x - S.x, tgt.z - S.z), kk = clamp(dl * .06, 5, 18); S.lblAr = S.lblAr || S.beamLbl.scale.y / S.beamLbl.scale.x; S.beamLbl.scale.set(kk, kk * S.lblAr, 1); S.beamLbl.position.y = 6 + kk * .6; }
    S.beamLbl.userData.set(S.ocs === 1 ? ["KORAI RAJT", "vissza a rajtvonal mögé"] : S.ocs === 2 ? ["RENDBEN", "most lépd át újra a vonalat"] : S.next < S.marks.length ? [`${S.next + 1}. bója`, `${Math.round(Math.hypot(tgt.x - S.x, tgt.z - S.z))} m · bal kéz felől kerüld`] : ["BEFUTÓ", "a rajtvonalon át"]);
    { const fl = S.cb.userData.flags; if (fl) { fl[0].visible = S.st === "pre" && S.t > -30 && S.t < -5; fl[2].visible = S.st !== "done"; if (fl[3]) fl[3].visible = !!S.ocs; }
      S.cdL.visible = S.st === "pre" || (S.st === "race" && S.t < 4); S.cdL.position.set(S.cb.position.x, 13 + Math.sin(W.t * 2) * .2, S.cb.position.z); S.cdL.userData.set(S.st === "pre" ? ["RAJT", mmss(S.t)] : ["RAJT!", "jó versenyt!"]); }
    S.lineM.material.opacity = S.st === "pre" || S.next >= S.marks.length ? .5 + .2 * Math.sin(W.t * 3) : .15;
    /* hangok */
    AU.set("rush", clamp((S.v - .8) / 4.5, 0, 1.25) * .11, .4); AU.set("wind", clamp(aws / (14 * KN), 0, 1.2) ** 1.5 * .07, .6); AU.set("water", .035, 1);
    /* 2026-11-11: a vízen és a levegőben NINCS több tábla, felirat, keringő jel, festett nyíl – csak a fényoszlop a következő célnál és a rajt-/célvonal két oszlopa */
    { const M = S.CM; if (M) { M.orbit.visible = false; M.sign.visible = false; if (M.gateL) M.gateL.visible = false; M.chev.visible = false; (M.garrows || []).forEach((m) => { m.visible = false; }); }
      S.arrow.visible = false; S.beamLbl.visible = false; S.beam.visible = !S.fin; }
    S.instT = (S.instT || 0) - dt; S.awa = awa; S.aws = aws; S.twa = twa; S.tgt = tgt;
    if (S.instT <= 0) { S.instT = .3; vrInstruments(); }
    W.panelDirty = (W.panelDirty || 0) + dt;
  }
  function lineSide(o) { const C = VRR.C; return (o.x - C.line.a.x) * C.u[0] + (o.z - C.line.a.z) * C.u[1]; }
  function crossLine(o) {   /* a rajtvonal átlépése szél felőli irányból szél alá (befutó), a vonal két vége között */
    const C = VRR.C, s = lineSide(o), was = o === VRR ? VRR.prevSide : o.prevSide;
    const along = (o.x - C.line.a.x) * C.c[0] + (o.z - C.line.a.z) * C.c[1], L = Math.hypot(C.line.b.x - C.line.a.x, C.line.b.z - C.line.a.z);
    return was != null && was > 0 && s <= 0 && along > -8 && along < L + 8;
  }
  function beep() { const a = T.ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = "square"; o.frequency.value = 880; g.gain.setValueAtTime(.06, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .18); o.connect(g).connect(T.outBus()); o.start(); o.stop(a.currentTime + .2); }
  function vrRivalTick(r, dt) {
    const S = VRR, C = S.C;
    let tx, tz; const fin = r.next >= S.marks.length;
    if (S.st === "pre") { const back = 20 + r.i * 6 - Math.max(0, S.t + 12) * 1.6; tx = -C.u[0] * back + C.c[0] * (-15 + r.i * 15); tz = -C.u[1] * back + C.c[1] * (-15 + r.i * 15); }
    else if (!fin) { const m = S.marks[r.next], O = vrMarkO(r.next), off = 13 + (r.wide || 0); tx = m.x + O[0] * off + O[1] * 7; tz = m.z + O[1] * off - O[0] * 7; }   /* a kerülési félegyenesen, kicsit túl rajta – így biztosan átlépi, bal kéz felől hagyva a bóját */
    else { tx = (C.line.a.x + C.line.b.x) / 2; tz = (C.line.a.z + C.line.b.z) / 2; tx -= C.u[0] * 15; tz -= C.u[1] * 15; }
    if (r.fin) { tx = r.x + vfwd(r.b)[0] * 50; tz = r.z + vfwd(r.b)[1] * 50; }
    /* életszerű hibák: néha nem veszi észre a másik hajót, elrontja a fordulót, késve fordul vagy túl nagy ívben kerül */
    if (S.st === "race" && !r.fin) { if (!r.errNext) r.errNext = W.t + rr(18, 45); if (W.t > r.errNext) { r.errNext = W.t + rr(25, 60); const k = rand(); if (k < .3) r.errGW = W.t + 9; else if (k < .55) { r.v *= .5; r.tack = -r.tack; r.lastTack = W.t; } else if (k < .8) r.lastTack = W.t - 2; else r.wide = rr(20, 38); } }
    const brgW = Math.atan2(tx - r.x, -(tz - r.z));
    let want = brgW;
    const rel = wrapA(brgW - S.wf);
    const cross = (r.x * C.c[0] + r.z * C.c[1]);
    if (Math.abs(rel) < 44 * D2R) { want = S.wf + r.tack * 44 * D2R;
      if (W.t - r.lastTack > 10 && ((r.tack > 0 && rel <= -40 * D2R) || (r.tack < 0 && rel >= 40 * D2R) || (Math.abs(cross) > 170 && Math.sign(cross) === r.tack))) { r.tack = -r.tack; r.lastTack = W.t; want = S.wf + r.tack * 44 * D2R; } }
    else if (Math.abs(rel) > 155 * D2R && S.st === "race") { want = S.wf + Math.PI - r.tack * 25 * D2R; const relD = wrapA(brgW - S.wf - Math.PI);
      if (W.t - r.lastTack > 14 && ((r.tack > 0 && relD >= 22 * D2R) || (r.tack < 0 && relD <= -22 * D2R))) { r.tack = -r.tack; r.lastTack = W.t; } }
    /* ütközés elkerülése (a saját hajónkkal és egymással) */
    [S].concat(S.riv).forEach((o) => { if (o === r) return; const dx = o.x - r.x, dz = o.z - r.z, d = Math.hypot(dx, dz); if (d >= 40) return;
      const brg = wrapA(Math.atan2(dx, -dz) - r.b), ahead = Math.abs(brg) < 1.9, racing = S.st === "race" && !r.fin && !o.fin, gw = racing ? vrGiveWay(r, o) : true, careless = (r.errGW || 0) > W.t;
      if (gw && !careless) { if (d < 36 && ahead) want += (brg > 0 ? -1 : 1) * .7 * (1 - d / 36); }
      else if (d < 9) want += (brg > 0 ? -1 : 1) * .35 * (1 - d / 9);   /* az útjogos tartja az irányát, csak az utolsó pillanatban tér ki */
      if (o === S && racing && !gw) { const closing = r._dS != null && d < r._dS - .002; if (d < 26 && closing && Math.abs(wrapA(Math.atan2(-dx, dz) - S.b)) < 1.7 && (!S.hailT || W.t - S.hailT > 8)) { S.hailT = W.t; S.msg = `„BACKBORD!!! BACKBORD!!!” – a(z) ${r.o.name} hajónak útjoga van: TÉRJ KI AZONNAL!`; S.msgT = 6; vrHail("Bekbord!"); } }
      if (o === S) r._dS = d; });
    /* a kitérés se fordítsa a hajót a szélbe (holtszög): legalább 40°-kal a szél mellett maradjon */
    { const relW = wrapA(want - S.wf); if (Math.abs(relW) < 40 * D2R) want = S.wf + (relW === 0 ? r.tack : Math.sign(relW)) * 40 * D2R; }
    /* egymásba se csússzanak: fizikai szétválasztás */
    S.riv.forEach((o) => { if (o === r) return; const dx = r.x - o.x, dz = r.z - o.z, d = Math.hypot(dx, dz); if (d < 9 && d > .01) { const k = (9 - d) / 2; r.x += dx / d * k; r.z += dz / d * k; o.x -= dx / d * k; o.z -= dz / d * k; } });
    /* AZONOS FIZIKA (2026. nov. 9., a tulajdonos kérésére: „mindenkire ugyanaz a fizikai törvény vonatkozzon”):
       az ellenfél is kormánylapáttal fordul (ugyanaz a fordulási képlet, mint nálad), ugyanaz a poláris diagram, ugyanaz a széllökés,
       ugyanaz a gyorsulás/lassulás, a túldőlés büntetése és a luvgierigkeit; nincs „ügyességi” sebességbónusz. A gépi kormányos csak a
       kormányt kezeli – ugyanúgy nem tud a szél felé 38°-nál élesebben haladni, mint te. */
    r.del = clamp(wrapA(want - r.b) * 1.5, -.55, .55);
    { const yrT = Math.sin(r.del) * (.085 * r.v + .24); r.yr = (r.yr || 0) + (yrT - (r.yr || 0)) * Math.min(1, dt * 3.2); }
    r.b = (r.b + r.yr * dt + TAU) % TAU;
    const twa = Math.abs(wrapA(S.wf - r.b)) * R2D; r.spinOn = r.spinOn ? twa > 98 : twa > 108; const spin = r.spinOn && S.st === "race";
    const heelPen = (r.heel || 0) > 22 * D2R ? 1 - ((r.heel || 0) - 22 * D2R) / (30 * D2R) * .3 : 1;
    const vt = polar(twa, spin) * KN * VR_SPD * heelPen * (S.st === "pre" ? .7 : 1) * (S.tws * (S.gk || 1) / (12 * KN)) ** .5 * (1 + .08 * Math.sin(W.t * .23) * Math.sin(W.t * .07)) * (r.fin ? .4 : 1) * ((r.penT || 0) > W.t ? .4 : 1);
    r.v += (vt - r.v) * Math.min(1, dt / (vt > r.v ? 2.8 : 5)); r.v *= 1 - Math.abs(r.del) * .16 * dt;
    r.yr += Math.sign(wrapA(S.wf - r.b)) * Math.max(0, r.heel || 0) * .1 * Math.min(1, r.v / 5) * dt * 3;
    const f = vfwd(r.b); r.x += f[0] * r.v * dt; r.z += f[1] * r.v * dt;
    /* bójakerülés: ugyanaz a szabály, mint nálad (26 m-en belül, a bója a hajó BAL oldalán) */
    if (S.st === "race" && !r.fin) { if (!fin) { if (vrRoundCheck(r, r.next) === 1) { r.next++; r.wide = 0; } } else if (crossLine(r)) { r.fin = S.t; S.res.push({ n: r.o.name, t: S.t }); horn(.4, .06); } }
    r.prevSide = lineSide(r);
    /* ütközés a saját hajónkkal: szétlöki a két hajót, mindkettő lelassul, koppanás és kiabálás helyett kürt */
    { const dx = r.x - S.x, dz = r.z - S.z, d = Math.hypot(dx, dz); if (d < 7.5 && d > .01) { const k = (7.5 - d) / 2; r.x += dx / d * k; r.z += dz / d * k; S.x -= dx / d * k; S.z -= dz / d * k;
      if (!r.bumpT || W.t - r.bumpT > 3) { r.bumpT = W.t; r.v *= .6; S.v *= .6; try { const a2 = T.ac(); if (a2) { const s2 = a2.createBufferSource(); s2.buffer = T.noiseBuf(.6); const f2 = a2.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 220; const g2 = a2.createGain(); g2.gain.setValueAtTime(.35, a2.currentTime); g2.gain.exponentialRampToValueAtTime(.001, a2.currentTime + .6); s2.connect(f2).connect(g2).connect(T.outBus()); s2.start(); } } catch (e) {} const mine = S.st === "race" && !S.fin && !r.fin ? vrGiveWay(S, r) : false;
        if (S.st !== "race" || S.fin || r.fin) { S.msg = "Koccanás a(z) " + r.o.name + " hajóval!"; S.msgT = 3; }
        else if (mine) { S.v *= .5; S.msg = `⚠ SZABÁLYSÉRTÉS! A(z) ${r.o.name} hajónak útjoga volt – büntetésből lelassultál.`; S.msgT = 6; vrHail("Bekbord! Protest!"); }
        else { r.penT = W.t + 7; r.v *= .5; S.msg = `A(z) ${r.o.name} szabálytalan volt (neked volt útjogod) – büntetőt kap.`; S.msgT = 6; } } } }
    /* megjelenítés */
    r.g.position.set(r.x, Math.sin(W.t * 1.5 + r.ph) * .06, r.z); r.g.rotation.y = Math.atan2(f[0], f[1]);
    const OS = r.g.userData.S, wfv = vfwd(S.wf), yaw = r.g.rotation.y, Xv = [Math.cos(yaw), -Math.sin(yaw)];
    OS.side = (wfv[0] * Xv[0] + wfv[1] * Xv[1]) > 0 ? -1 : 1; OS.boom = clamp((twa - 28) * .78, 7, 82) * D2R * OS.side; OS.jib = clamp((twa - 28) * .55, 8, 52) * D2R; OS.luff = clamp(1 - (twa - 18) / 18, 0, 1);
    OS.spin += ((spin ? 1 : 0) - OS.spin) * Math.min(1, dt * .35);
    { const tw2 = [wfv[0] * S.tws * (S.gk || 1), wfv[1] * S.tws * (S.gk || 1)], aw2 = [tw2[0] + f[0] * r.v / VR_SPD, tw2[1] + f[1] * r.v / VR_SPD], aws2 = Math.hypot(aw2[0], aw2[1]), awa2 = Math.acos(clamp((aw2[0] * f[0] + aw2[1] * f[1]) / (aws2 || 1), -1, 1)) * R2D;
      OS.awa = awa2; OS.aws = aws2; OS.gust = S.gk || 1; r.heel = (r.heel || 0) + (heelEq(awa2, aws2) * (1 - OS.spin * .75 * clamp((awa2 - 75) / 55, 0, 1)) * (1 + OS.spin * .5 * clamp(1 - (awa2 - 75) / 45, 0, 1)) - (r.heel || 0)) * Math.min(1, dt * 1.2); OS.heel = -OS.side * r.heel + (OS.spin > .5 ? Math.sin(W.t * 1.2 + r.ph) * .05 : 0); } OS.pitch = Math.sin(W.t * 1.2 + r.ph) * .025;
    const d2 = Math.hypot(r.x - S.x, r.z - S.z); r.g.userData.update(dt);   /* minden képkockán, távol is (ne „ugráljon” a vitorla) */
    r.wk.push(r.x, r.z, r.g.rotation.y, r.v, dt, .05);
    /* névtábla a hajó fölött (helyezéssel), 25–220 m között látszik */
    r.lbl.visible = d2 > 25 && d2 < 220; if (r.lbl.visible) { r.lbl.position.set(r.x, 22 + Math.sin(W.t + r.i) * .3, r.z); const k = clamp(d2 * .03, 2.5, 7); r.lbl.scale.set(k, k * .32, 1); r.lbl.userData.set([r.o.name, r.fin ? `befutott: ${S.res.findIndex((q) => q.n === r.o.name) + 1}.` : `${Math.round(d2)} m · ${r.next < S.marks.length ? (r.next + 1) + '. bója felé' : 'a befutó felé'}`]); }
  }
  function vrFinish() {
    const S = VRR, me = S.res.findIndex((q) => q.me);
    const best = S.best[S.lvl]; if (me >= 0 && !S.dnf && (!best || S.res[me].t < best)) { S.best[S.lvl] = S.res[me].t; try { localStorage.setItem("zephyr-vr-verseny", JSON.stringify(S.best)); } catch (e) {} }
    S.st = "done"; S.msg = S.dnf ? "Nem értél be – próbáld újra!" : me === 0 ? "🏆 GYŐZELEM!" : `${me + 1}. hely`; S.msgT = 999; W.panelDirty = 1;
    /* eredménytábla a kormány fölött, előtted */
    S.podium.userData.set([S.dnf ? "Nem értél be" : me === 0 ? "🏆 GYŐZELEM!" : `${me + 1}. hely`].concat(S.res.map((q, i) => `${i + 1}. ${q.n} – ${q.dnf ? "nem ért be" : mmss(q.t)}`))); S.podium.visible = true;
    { const c = T.camObj(), hw = new THREE.Vector3(), q = new THREE.Quaternion(); c.getWorldPosition(hw); c.getWorldQuaternion(q); const fw = new THREE.Vector3(0, 0, -1).applyQuaternion(q); fw.y = 0; if (fw.lengthSq() < 1e-4) fw.set(0, 0, -1); fw.normalize();
      const p = hw.clone().addScaledVector(fw, 2.6); p.y = hw.y + .1; W.root.updateMatrixWorld(true); S.podium.position.copy(W.root.worldToLocal(p)); }
    if (me === 0) { [0, 400, 800].forEach((d) => setTimeout(() => horn(.35, .12), d)); }
  }
  const mmss = (t) => { const s = Math.max(0, Math.abs(t)); return `${t < 0 ? "−" : ""}${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };
  function vrPlace() { const S = VRR; const prog = (o) => (o.fin ? 1e6 - o.fin : 0) + (o.next || 0) * 1e4 - Math.hypot((o === S ? S.tgt : null) ? S.tgt.x - o.x : 0, (o === S && S.tgt) ? S.tgt.z - o.z : 0); const all = [S].concat(S.riv).map((o) => [o, prog(o)]).sort((a, b) => b[1] - a[1]); return all.findIndex((q) => q[0] === S) + 1; }
  /* műszerek: a talapzati kijelzők (sebesség, szél, bója iránya) és az árbóckijelző (idő, helyezés) */
  /* ideális útvonal egy szakaszon: szél ellen / hátszélben két csapásban (halzon a laylinig, majd fordulás / jibbelés), különben egyenesen */
  function vrLegPath(A, B, wf) {
    const brg = Math.atan2(B.x - A.x, -(B.z - A.z)), rel = Math.abs(wrapA(brg - (wf + Math.PI)));   /* a széllel szembeni irány: wf+π (a szél „felől” jön) */
    const up = Math.abs(wrapA(brg - wf - Math.PI)) > Math.PI - 40 * D2R ? false : false;
    const toWind = Math.abs(wrapA(brg - wf)) < 42 * D2R, downW = Math.abs(wrapA(brg - wf - Math.PI)) < 28 * D2R;
    if (!toWind && !downW) return [A, B];
    const off = toWind ? 45 * D2R : (180 - 150) * D2R, base = toWind ? wf : wf + Math.PI;
    const d1 = [Math.sin(base + off), -Math.cos(base + off)], d2 = [Math.sin(base - off), -Math.cos(base - off)];
    const solve = (u, v) => { const bx = B.x - A.x, bz = B.z - A.z, det = u[0] * v[1] - u[1] * v[0]; if (Math.abs(det) < 1e-6) return null; const t1 = (bx * v[1] - bz * v[0]) / det, t2 = (u[0] * bz - u[1] * bx) / det; return t1 > 0 && t2 > 0 ? { x: A.x + u[0] * t1, z: A.z + u[1] * t1 } : null; };
    const P = solve(d1, d2) || solve(d2, d1); return P ? [A, P, B] : [A, B];
  }
  /* 2026-11-11 (a tulajdonos kérése): verseny közben nem olvasni kell, hanem LÁTNI. A kokpitban két műszer van:
     RADAR (felülnézet: a hajó középen, orr felfelé; bóják számozva, a következő kiemelve és vonallal összekötve; célvonal; ellenfelek; sarokban sebesség és idő)
     és SZÉLMŰSZER (tárcsa: honnan fúj a szél a hajóhoz képest, a piros sáv a holtszög; középen a szélerősség csomóban). */
  function vrChart() {
    const S = VRR, t = S.ck.chartT; if (!t) return; const g = t._canvas.getContext("2d"), W2 = 1024, C = S.C;
    const cx = W2 / 2, cy = W2 * .55, RR = W2 * .43;
    g.fillStyle = "#04121f"; g.fillRect(0, 0, W2, W2);
    const lineMid = { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 }, gate = S.st === "pre" || !!S.ocs || S.next >= S.marks.length, tg = gate ? lineMid : S.marks[S.next];
    const dT = Math.hypot(tg.x - S.x, tg.z - S.z), span = clamp(dT * 1.15, 110, 1200), k = RR / span, c0 = Math.cos(-S.b), s0 = Math.sin(-S.b);
    const P = (x, z) => { const dx = x - S.x, dz = z - S.z; return [cx + (dx * c0 - dz * s0) * k, cy + (dx * s0 + dz * c0) * k]; };
    g.save(); g.beginPath(); g.arc(cx, cy, RR + 26, 0, TAU); g.fillStyle = "#082338"; g.fill(); g.clip();
    /* távolsággyűrűk */
    const step = span > 600 ? 200 : span > 250 ? 100 : 50; g.lineWidth = 2; g.font = "600 24px system-ui"; g.textAlign = "left";
    for (let r = step; r * k < RR + 20; r += step) { g.strokeStyle = "rgba(127,211,255,.22)"; g.beginPath(); g.arc(cx, cy, r * k, 0, TAU); g.stroke(); g.fillStyle = "rgba(127,211,255,.6)"; g.fillText(r + " m", cx + 8, cy - r * k - 6); }
    g.strokeStyle = "rgba(127,211,255,.14)"; g.beginPath(); g.moveTo(cx - RR - 26, cy); g.lineTo(cx + RR + 26, cy); g.moveTo(cx, cy - RR - 26); g.lineTo(cx, cy + RR + 26); g.stroke();
    /* a pálya vonala: rajt → bóják → cél (a megtett rész halvány) */
    const way = [lineMid].concat(S.marks.map((m) => ({ x: m.x, z: m.z })), [lineMid]);
    for (let i = 0; i < way.length - 1; i++) { const a = P(way[i].x, way[i].z), b = P(way[i + 1].x, way[i + 1].z); g.setLineDash([14, 14]); g.lineWidth = 4; g.strokeStyle = i < S.next ? "rgba(160,180,200,.18)" : "rgba(255,209,102,.4)"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } g.setLineDash([]);
    /* egyenes vonal a hajótól a következő célig */
    { const b = P(tg.x, tg.z); g.strokeStyle = "#ffd166"; g.lineWidth = 7; g.beginPath(); g.moveTo(cx, cy); g.lineTo(b[0], b[1]); g.stroke(); }
    /* rajt-/célvonal a két bója között */
    { const a = P(C.line.a.x, C.line.a.z), b = P(C.line.b.x, C.line.b.z); g.strokeStyle = gate ? "#7CFC9A" : "rgba(255,255,255,.7)"; g.lineWidth = gate ? 12 : 7; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); [a, b].forEach((q) => { g.fillStyle = gate ? "#7CFC9A" : "#ffffff"; g.beginPath(); g.arc(q[0], q[1], gate ? 16 : 11, 0, TAU); g.fill(); }); }
    /* bóják */
    S.marks.forEach((m, i) => { const [x, y] = P(m.x, m.z), cur = i === S.next && !gate, done = i < S.next, r = cur ? 38 : 24;
      if (cur) { g.strokeStyle = "rgba(255,209,102," + (.5 + .4 * Math.sin(W.t * 5)) + ")"; g.lineWidth = 6; g.beginPath(); g.arc(x, y, r + 16, 0, TAU); g.stroke(); }
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = done ? "#44525f" : cur ? "#ffb703" : "#ff7a00"; g.fill(); g.lineWidth = 4; g.strokeStyle = "#fff"; g.stroke();
      g.fillStyle = "#0b1b2a"; g.font = `900 ${cur ? 46 : 30}px system-ui`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(i + 1), x, y + 2); g.textBaseline = "alphabetic"; });
    /* ellenfelek, saját hajó */
    S.riv.forEach((r) => { const [x, y] = P(r.x, r.z); g.save(); g.translate(x, y); g.rotate(r.b - S.b); g.fillStyle = "#e9f6ff"; g.beginPath(); g.moveTo(0, -20); g.lineTo(11, 13); g.lineTo(-11, 13); g.closePath(); g.fill(); g.restore(); });
    g.save(); g.translate(cx, cy); g.fillStyle = "#ff4b3a"; g.strokeStyle = "#fff"; g.lineWidth = 5; g.beginPath(); g.moveTo(0, -36); g.lineTo(21, 26); g.lineTo(0, 14); g.lineTo(-21, 26); g.closePath(); g.fill(); g.stroke(); g.restore();
    g.restore();
    /* ha a cél a radaron kívül esne: nyíl a peremen */
    { const b = P(tg.x, tg.z), dx = b[0] - cx, dy = b[1] - cy, d = Math.hypot(dx, dy); if (d > RR + 10) { const a = Math.atan2(dy, dx); g.save(); g.translate(cx + Math.cos(a) * (RR + 6), cy + Math.sin(a) * (RR + 6)); g.rotate(a + Math.PI / 2); g.fillStyle = "#ffd166"; g.beginPath(); g.moveTo(0, -30); g.lineTo(24, 16); g.lineTo(-24, 16); g.closePath(); g.fill(); g.restore(); } }
    g.strokeStyle = "#2f5f80"; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, RR + 26, 0, TAU); g.stroke();
    /* sarkok: cél + távolság, sebesség, idő, helyezés – nagy számokkal, szöveg nélkül */
    const box = (x, al, top, big, sub) => { g.textAlign = al; g.fillStyle = "#7fd3ff"; g.font = "700 38px system-ui"; g.fillText(sub, x, top ? 46 : W2 - 104); g.fillStyle = "#ffffff"; g.font = "800 88px system-ui"; g.fillText(big, x, top ? 128 : W2 - 22); };
    box(20, "left", true, Math.round(dT) + " m", gate ? (S.st === "pre" ? "RAJTVONAL" : "CÉL") : (S.next + 1) + ". BÓJA");
    box(W2 - 20, "right", true, (S.v / KN).toFixed(1), "CSOMÓ");
    box(20, "left", false, mmss(S.t), S.st === "pre" ? "RAJTIG" : "IDŐ");
    box(W2 - 20, "right", false, S.st === "pre" ? "–" : `${S.fin ? S.res.findIndex((q) => q.me) + 1 : vrPlace()}/4`, "HELY");
    t.needsUpdate = true;
  }
  function vrInstruments() {
    const S = VRR, t = S.ck.instT, g = t._canvas.getContext("2d"), w = 512, cx = 256, cy = 256, R = 215;
    g.fillStyle = "#06090d"; g.fillRect(0, 0, w, w);
    g.beginPath(); g.arc(cx, cy, R + 22, 0, TAU); g.fillStyle = "#0c1a28"; g.fill(); g.lineWidth = 8; g.strokeStyle = "#c9d0d6"; g.stroke();
    /* skála: 0° = a hajó orra (fent); piros sáv = holtszög (38°-nál élesebben nem megy a hajó), zöld = jó cirkálószög */
    const arc = (a0, a1, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, R, a0 - Math.PI / 2, a1 - Math.PI / 2); g.stroke(); };
    arc(-38 * D2R, 38 * D2R, "#e5392f", 22); arc(38 * D2R, 60 * D2R, "#3fbf6a", 22); arc(-60 * D2R, -38 * D2R, "#3fbf6a", 22);
    for (let d = 0; d < 360; d += 10) { const a = d * D2R - Math.PI / 2, big = d % 30 === 0, r0 = R - (big ? 34 : 22); g.strokeStyle = "#e9f6ff"; g.lineWidth = big ? 5 : 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * (R - 12), cy + Math.sin(a) * (R - 12)); g.stroke();
      if (big && d % 60 === 0 && d) { g.fillStyle = "#cfe3f2"; g.font = "700 26px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(d > 180 ? 360 - d : d), cx + Math.cos(a) * (R - 56), cy + Math.sin(a) * (R - 56)); g.textBaseline = "alphabetic"; } }
    /* a hajó körvonala középen (orr felfelé) */
    g.fillStyle = "#16314a"; g.strokeStyle = "#7fd3ff"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy - 96); g.quadraticCurveTo(cx + 44, cy - 20, cx + 30, cy + 92); g.lineTo(cx - 30, cy + 92); g.quadraticCurveTo(cx - 44, cy - 20, cx, cy - 96); g.fill(); g.stroke();
    /* szélnyíl: a perem felől a hajó felé mutat – onnan fúj */
    const wa = wrapA(S.wf - S.b); g.save(); g.translate(cx, cy); g.rotate(wa); g.fillStyle = S.twa < 38 ? "#ff6a5a" : "#ffd166"; g.strokeStyle = "#06090d"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -R + 46); g.lineTo(30, -R - 8); g.lineTo(11, -R - 2); g.lineTo(11, -R - 30); g.lineTo(-11, -R - 30); g.lineTo(-11, -R - 2); g.lineTo(-30, -R - 8); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = S.twa < 38 ? "rgba(255,106,90,.75)" : "rgba(255,209,102,.75)"; g.lineWidth = 6; g.beginPath(); g.moveTo(0, -R + 50); g.lineTo(0, -104); g.stroke(); g.restore();
    /* szélerősség csomóban, középen */
    const kn = (S.tws * (S.gk || 1)) / KN; g.fillStyle = "#ffffff"; g.font = "800 78px system-ui"; g.textAlign = "center"; g.fillText(kn.toFixed(0), cx, cy + 30); g.fillStyle = "#7fd3ff"; g.font = "700 24px system-ui"; g.fillText("csomó szél", cx, cy + 64);
    t.needsUpdate = true;
    vrChart();
    const m = S.mastT, g2 = m._canvas.getContext("2d"); g2.fillStyle = "#06090d"; g2.fillRect(0, 0, 1024, 256);
    const cell = (x, lbl, val) => { g2.fillStyle = "#7fd3ff"; g2.font = "600 30px system-ui"; g2.textAlign = "center"; g2.fillText(lbl, x + 170, 52); g2.fillStyle = "#e9f6ff"; g2.font = "800 110px system-ui"; g2.fillText(val, x + 170, 180); };
    cell(0, S.st === "pre" ? "RAJTIG" : "IDŐ", mmss(S.t)); cell(341, "HELY", S.st === "pre" ? "–" : `${S.fin ? S.res.findIndex((q) => q.me) + 1 : vrPlace()}/4`); cell(682, "SEBESSÉG", (S.v / KN).toFixed(1));
    m.needsUpdate = true;
  }
  /* --------------------------------------------------------------- panel, csuklómenü, 2D */
  function vrPanel(P) {
    const S = VRR;
    P.title(`Vitorlásverseny · ${S.lvl}. futam · ${S.C.name}`, `${S.st === "pre" ? "Rajt: " + mmss(-S.t) : S.st === "done" ? "Vége" : "Idő: " + mmss(S.t)} · ${(S.v / KN).toFixed(1)} csomó · szél ${(S.tws / KN).toFixed(0)} csomó`);
    P.row(0, S.msgT > 0 ? S.msg : "Fogd meg a kormánykereket (csippentés), és forgasd: jobbra = jobbra fordul.", "#ffd166");
    P.row(1, S.ocs ? "KORAI RAJT – menj vissza a rajtvonal mögé, aztán lépd át újra" : S.st === "pre" ? "Rajt előtt maradj a vonal mögött – a rajtjelre (hosszú kürt) lépd át" : S.next < S.marks.length ? `Következő: ${S.next + 1}. bója (${S.marks.length} van) – bal kéz felől kerüld` : "Utolsó szakasz: át a rajtvonalon!", "#ffffff");
    P.row(2, S.st === "done" ? S.res.map((q, i) => `${i + 1}. ${q.n} ${mmss(q.t)}`).join(" · ") : "A sárga fényoszlop mutatja a következő bóját.", "#7fd3ff");
    P.row(3, S.best[S.lvl] ? `Legjobb időd ezen a pályán: ${mmss(S.best[S.lvl])}` : "Szél ellen nem lehet menni: cikcakkban (cirkálva) haladj!", "#c9a24a");
    if (S.st === "done") P.buttons([["↻ Újra", () => vrSetup(S.lvl)], ["Tovább ▸ " + (S.lvl + 1) + ". futam", () => vrSetup(S.lvl + 1)], ["‹ Vissza a sétához", () => W.close()]]);
    else P.buttons([["Egyenesbe", () => { S.wa = 0; }], ["↻ Újrakezdés", () => vrSetup(S.lvl)], [S.seated ? "🧍 Álló mód" : "🪑 Ülő mód", () => vrSeat()], ["‹ Vissza", () => W.close()]]);
    P.buttons([[S.noSigns ? "🪧 Táblák mutatása" : "🪧 Táblák elrejtése", vrSigns]], 1);
  }
  function vrSigns() { VRR.noSigns = !VRR.noSigns; try { localStorage.setItem("zephyr-verseny-tablak", VRR.noSigns ? "0" : "1"); } catch (e) {} W.panelDirty = 1; }
  function vrSeat() { VRR.seated = !VRR.seated; try { localStorage.setItem("zephyr-vr-ules", VRR.seated ? "1" : "0"); } catch (e) {} W.root.position.y = VRR.baseY - (VRR.seated && T.inVR ? .45 : 0); W.panelDirty = 1; }
  function vrWrist() {
    const S = VRR;
    return [["🪑", S.seated ? "Álló mód" : "Ülő mód", () => vrSeat()], ["🪧", S.noSigns ? "Táblák mutatása" : "Táblák elrejtése", vrSigns], ["↻", "Futam újra", () => vrSetup(S.lvl)], ["▸", "Következő futam", () => vrSetup(S.lvl + 1)], ["◂", "Előző futam", () => vrSetup(Math.max(1, S.lvl - 1))], ["⎈", "Kormány egyenesbe", () => { S.wa = 0; }],
      ["☰", "Nagy panel", () => W.togglePanel()], ["‹", "A sétához", () => W.close()]];
  }
  function vrHud(H) {
    const S = VRR;
    H.title(`Vitorlásverseny · ${S.lvl}. futam · ${S.C.name}`, `${S.msgT > 0 ? S.msg + " · " : ""}${S.st === "pre" ? "rajt " + mmss(-S.t) : "idő " + mmss(S.t)} · ${(S.v / KN).toFixed(1)} csomó · ${S.next < S.marks.length ? (S.next + 1) + ". bója" : "befutó"}`);
    if (S.st === "done") H.steer([["↻ Újra", () => vrSetup(S.lvl)], ["Tovább ▸", () => vrSetup(S.lvl + 1)]], () => { S.wa = 0; });
    else H.steer([["↻ Újrakezdés", () => vrSetup(S.lvl)], [S.noSigns ? "🪧 Táblák" : "🪧 Táblák ✕", vrSigns]], () => { S.wa = 0; });
    H.hint("Kormány: ◀ ▶ gomb vagy ← → (A / D) · a sárga fényoszlop a következő bója · bal kéz felől kerüld");
  }

  /* =================================================================== 3. A HÁZ MAKETTJE – varázslatos helyszínen, asztaltól életnagyságig (2026. nov. 6., 2. változat)
     • Helyszín (2026. nov. 6-tól): regatta-bója a Balaton közepén, körülötte életnagyságú verseny és jelenetek (06d); a part ~260 m-re (06c) – valódi napállás szerinti égbolt, a túlpart nevezetességeivel, élővilággal.
     • A ház (06b): csak a Zephyr épülete (egy téglatest, 6,0 × 22,2 m), a hivatalos tervrajz szerint, valódi ablaknyílásokkal, berendezve.
     • Méretek: 1:100 · 1:60 · 1:40 az asztalon → 1:20 · 1:10 a stég padlóján → 1:1 ÉLETNAGYSÁG (a ház a parton áll, besétálhatsz).
       Kézzel: két kézzel csippents és húzd szét / össze (mint egy fotót a telefonon); egy kézzel a makett fölött csippentve körbeforgatod. A menüben (bal tenyér felfelé, ránézve) minden beállítás.
     • Életnagyságban: csippents a földre / padlóra → odalépsz; ⬆/⬇ az emeletre; a lakásokban fénylő 📷 gömbök → a valódi 360°-os fotó.
     • Kiválasztott lakás: „Belépés” (a valódi fotókba) vagy „Foglalás” (térbeli foglalópanel, a lakás előre kijelölve). */
  const MAQ = {};
  const FLOOR_H = 2.85, WALL = .3, PART = .25, IN_W = 5.4, OUT_W = IN_W + 2 * WALL;
  /* a ház koordinátái méterben: x = kelet felé (a parkoló oldala, 75°), z = az utcától hátrafelé (165° felé), y = fel */
  const Z_A = WALL, Z_HALL = Z_A + 6.2 + PART, Z_B = Z_HALL + 4.0 + PART, Z_C = Z_B + 4.35 + PART, Z_END = Z_C + 6.41 + WALL;
  const APTCOL = { korvett: "#e2483d", dingi: "#3fb37f", fregatt: "#3d8fe2", kaloz: "#9b6be2", schooner: "#2bb3c0", kadett: "#d9a441" };
  const UNITS = {
    korvett:  { lvl: 0, map: (x, y) => [WALL + x, Z_A + y] },
    fregatt:  { lvl: 1, map: (x, y) => [WALL + x, Z_A + y] },
    dingi:    { lvl: 0, map: (x, y) => [WALL + y, Z_B + (4.35 - x)] },
    kaloz:    { lvl: 1, map: (x, y) => [WALL + y, Z_B + (4.10 - x)] },
    schooner: { lvl: 0, map: (x, y) => [WALL + x, Z_C + y] },
    kadett:   { lvl: 1, map: (x, y) => [WALL + x, Z_C + y] }
  };
  function planOf(id) { const P = T.PLANS; const g = T.GROUPS.find((q) => q.id === id) || {}; return P[g.plan] || P.elso; }
  function mapRect(U, x, y, w, h) { const a = U.map(x, y), b = U.map(x + w, y + h); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }
  const SCALES = [1 / 100, 1 / 60, 1 / 40, 1 / 25, 1 / 15, 1 / 10, 1];
  const SCALE_TXT = (s) => s >= .99 ? "életnagyság" : "1:" + Math.round(1 / s);
  const TABLE_Y = .78, USER_Z = 1.3, TABLE_R = .82;
  const EYE2D = 1.6;
  const _q = new THREE.Vector3(), _q2 = new THREE.Vector3(), _q3 = new THREE.Vector3(), _q4 = new THREE.Vector3();

  /* a fej helye és iránya a világban: az A-Frame kamerája (VR-ben a three.js ide másolja a fej pózát a rig-en belül) – így a rig mozgatása/forgatása után is pontos */
  function headWorld(v) { v = v || new THREE.Vector3(); try { T.camObj().updateWorldMatrix(true, false); T.camObj().getWorldPosition(v); } catch (e) { v.set(0, 1.6, 0); } return v; }
  function headYaw() { const d = new THREE.Vector3(); try { T.camObj().updateWorldMatrix(true, false); T.camObj().getWorldDirection(d); } catch (e) { return 0; } return Math.atan2(-d.x, -d.z); }
  function faceTo(target) { const rig = T.rig.object3D; if (!T.inVR) { faceYaw(target); return; } rig.rotation.y += wrapA(target - headYaw()); rig.updateMatrixWorld(true); }

  function buildMaquette() {
    const root = W.root;
    const rig = T.rig.object3D;
    Object.keys(MAQ).forEach((k) => delete MAQ[k]);   /* tiszta lap minden megnyitáskor */
    MAQ.rig0 = { p: rig.position.clone(), ry: rig.rotation.y };
    FLY.v.set(0, 0, 0); FLY.burst = null;
    Object.assign(ORB, { az: .35, el: .62, d: 1.7, azT: .35, elT: .62, dT: 1.7, on: false }); ORB.pts.clear();
    { const r0 = T.sceneEl.renderer; MAQ.shadowWas = r0.shadowMap.enabled; MAQ.shadowType = r0.shadowMap.type; MAQ.shadowAuto = r0.shadowMap.autoUpdate; MAQ.envWas = T.sceneEl.object3D.environment || null; MAQ.envIntWas = T.sceneEl.object3D.environmentIntensity; }
    /* az A-Frame alapfényei (erős szórt fény) kikapcsolva – a makett-világban a napszak saját fényei világítanak */
    MAQ.sceneLights = []; T.sceneEl.object3D.children.forEach((o) => { if (o.isLight && o.visible) { o.visible = false; MAQ.sceneLights.push(o); } });
    T.sceneEl.object3D.traverse((o) => { if (o.isLight && o.visible && !MAQ.sceneLights.includes(o) && (!W.root || !W.root.getObjectById(o.id))) { o.visible = false; MAQ.sceneLights.push(o); } });
    /* a bezárás-kezelő legelöl: ha a felépítés közben hiba lenne, akkor is minden visszaáll */
    addEventListener("keydown", flyKD); addEventListener("keyup", flyKU); FLY.keys = {};
    W.onClose = () => {
      try { removeEventListener("keydown", flyKD); removeEventListener("keyup", flyKU); } catch (e) {}
      try { orbDetach(); } catch (e) {}
      try { const rr2 = T.sceneEl.renderer; rr2.shadowMap.enabled = MAQ.shadowWas; rr2.shadowMap.type = MAQ.shadowType; rr2.shadowMap.autoUpdate = MAQ.shadowAuto !== false; T.sceneEl.object3D.environment = MAQ.envWas; if (MAQ.envIntWas != null) T.sceneEl.object3D.environmentIntensity = MAQ.envIntWas; } catch (e) {}
      try { const rg = T.rig.object3D; rg.position.copy(MAQ.rig0.p); if (T.inVR) rg.rotation.y = MAQ.rig0.ry; } catch (e) {}
      (MAQ.sceneLights || []).forEach((o) => { o.visible = true; });
      try { showTip(null); } catch (e) {}
      try { if (ENV.lights && ENV.lights.sun) ENV.lights.sun.dispose(); } catch (e) {}   /* az árnyéktérkép GPU-memóriája */
      try { bjDispose(); } catch (e) {} try { envDispose(); } catch (e) {}
      Object.keys(MAQ).forEach((k) => delete MAQ[k]);
    };
    const floorY = T.inVR ? rig.position.y : rig.position.y - EYE2D;
    /* ---------- a helyszín ---------- */
    buildMagicWorld(root, floorY);
    const env = ENV.env, site = ENV.site;
    /* elhelyezés: a felhasználó a stég déli részén áll (site: 0, 0, 0,95), a tó (345°) felé néz */
    const yaw = T.inVR ? headYaw() : T.camYaw(); env.rotation.y = yaw - 15 * D2R; env.position.set(0, floorY, 0); env.updateMatrixWorld(true);
    const h = headWorld(new THREE.Vector3()), p = site.localToWorld(new THREE.Vector3(0, 0, USER_Z));
    env.position.x += h.x - p.x; env.position.z += h.z - p.z; env.updateMatrixWorld(true);
    MAQ.floorY = floorY;

    /* ---------- az asztal (tölgy, sárgaréz berakással) ---------- */
    const table = new THREE.Group(); site.add(table); MAQ.table = table;
    const oak = std({ map: txPlanks("oak", "#7a5534", "#94683f", 7), roughness: .45 }), brass = std({ color: "#c9a24a", roughness: .28, metalness: .9 });
    const tt = mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R - .02, .05, 72), oak, table); tt.position.y = TABLE_Y - .025; tt.receiveShadow = true; tt.castShadow = true;
    const ring = mesh(new THREE.TorusGeometry(TABLE_R - .04, .008, 6, 120), brass, table); ring.rotation.x = Math.PI / 2; ring.position.y = TABLE_Y + .001;
    const col = mesh(new THREE.CylinderGeometry(.07, .1, TABLE_Y - .1, 20), std({ color: "#4a3221", roughness: .5 }), table); col.position.y = (TABLE_Y - .1) / 2 + .06; col.castShadow = true;
    [0, 1, 2, 3].forEach((k) => { const a = k / 4 * TAU + Math.PI / 4; const f = mesh(new THREE.BoxGeometry(.06, .06, .42), std({ color: "#4a3221", roughness: .5 }), table); f.position.set(Math.cos(a) * .2, .04, Math.sin(a) * .2); f.rotation.y = -a + Math.PI / 2; });
    const plate = canvasTex(1024, 200, (g) => { const gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, "#e2c46a"); gr.addColorStop(1, "#a8822e"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 200);
      g.fillStyle = "#2a1c0c"; g.font = "800 66px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ZEPHYR APARTMANHÁZ", 512, 72); g.font = "500 36px Georgia, serif"; g.fillText("Zamárdi · Gáspár András utca 58. · a hivatalos tervrajz szerint", 512, 148); });
    const pl = mesh(new THREE.PlaneGeometry(.42, .082), std({ map: plate, roughness: .35, metalness: .6 }), table); pl.position.set(0, TABLE_Y - .026, TABLE_R + .005); pl.rotation.x = -.0;

    /* ---------- a makett: tartó → forgató → modell ---------- */
    const holder = new THREE.Group(); site.add(holder); MAQ.holder = holder;
    const turn = new THREE.Group(); holder.add(turn); MAQ.turn = turn;
    const model = new THREE.Group(); turn.add(model); MAQ.model = model;
    const H = buildHouse(model); MAQ.H = H;
    const S = H.site; MAQ.C = new THREE.Vector3((S.SX0 + S.SX1) / 2, 0, (S.SZ0 + S.SZ1) / 2); MAQ.R = Math.hypot(S.SX1 - S.SX0, S.SZ1 - S.SZ0) / 2;
    /* diófa talapzat a telek alatt (makettméretekben) – megfogva forgatható */
    const base = new THREE.Group(); turn.add(base); MAQ.base = base;
    const wood = std({ color: "#5b3a22", roughness: .42 });
    const bw = S.SX1 - S.SX0, bd = S.SZ1 - S.SZ0;
    const bm = mesh(new THREE.BoxGeometry(bw + 1.6, 2.6, bd + 1.6), wood, base); bm.position.y = -1.3; bm.receiveShadow = true; bm.castShadow = true;
    const lip = mesh(new THREE.BoxGeometry(bw + 1.9, .5, bd + 1.9), brass, base); lip.position.y = -2.4;
    MAQ.baseHit = bm;
    bm.userData.xr = { down: (hh, src) => { if (MAQ.two) return; MAQ.drag = { a: turn.rotation.y, d: src.d.clone() }; MAQ.auto = false; },
      drag: (src) => { if (!MAQ.drag || MAQ.two) return; const d0 = MAQ.drag.d, d1 = src.d; turn.rotation.y = MAQ.drag.a + wrapA(Math.atan2(d1.x, d1.z) - Math.atan2(d0.x, d0.z)) * 4; },
      up: () => { MAQ.drag = null; } };
    T.xr.extra.add(bm); W.objs.push(bm);
    /* iránytű a talapzat sarkán (a modellel együtt fordul) */
    const rose = canvasTex(512, 512, (g) => {
      g.translate(256, 256); g.strokeStyle = "#c9a24a"; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, 200, 0, TAU); g.stroke();
      for (let k = 0; k < 16; k++) { g.save(); g.rotate(k / 16 * TAU); g.fillStyle = k % 4 ? "#c9a24a" : "#f3efe6"; g.fillRect(-3, -200, 6, k % 4 ? 18 : 30); g.restore(); }
      g.fillStyle = "#e5262f"; g.beginPath(); g.moveTo(0, -180); g.lineTo(40, 0); g.lineTo(-40, 0); g.closePath(); g.fill();
      g.fillStyle = "#f3efe6"; g.beginPath(); g.moveTo(0, 180); g.lineTo(40, 0); g.lineTo(-40, 0); g.closePath(); g.fill();
      g.fillStyle = "#f3efe6"; g.font = "900 84px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("É", 0, -232);
    });
    const ro = mesh(new THREE.PlaneGeometry(4.2, 4.2), basic({ map: rose, transparent: true, depthWrite: false }), base);
    ro.rotation.set(-Math.PI / 2, 0, -15 * D2R); ro.position.set(S.SX1 - 1.2 - MAQ.C.x, .03, S.SZ0 + 13 - MAQ.C.z); ro.renderOrder = 3;

    /* ---------- lakásonkénti kiemelés és választás ---------- */
    MAQ.apts = H.apts;
    Object.values(MAQ.apts).forEach((A) => {
      const c = new THREE.Color(APTCOL[A.id] || "#999");
      const gm = basic({ color: c, transparent: true, opacity: 0, depthWrite: false });
      const glow = mesh(new THREE.BoxGeometry(A.bb[2] - A.bb[0] + .2, FLOOR_H - .3, A.bb[3] - A.bb[1] + .2), gm, H.lv[A.lv]);
      glow.position.set((A.bb[0] + A.bb[2]) / 2, (FLOOR_H - .3) / 2, (A.bb[1] + A.bb[3]) / 2); glow.renderOrder = 4;
      A.glow = glow; A.gm = gm; A.col = c;
      glow.userData.xr = { hover: (on) => maqHover(A, on), click: () => maqSelect(A) };
      T.xr.extra.add(glow); W.objs.push(glow);
    });
    maqAvail();
    /* esti fénygömbök a mennyezeti lámpák körül (csak életnagyságban) */
    MAQ.lampHalo = [0, 1].map((lv) => { const pts = H.floors.filter((f) => f.lv === lv).map((f) => new THREE.Vector3((f.q[0] + f.q[2]) / 2, FLOOR_H - .32, (f.q[1] + f.q[3]) / 2)); const P = glowPoints(H.lv[lv], pts, .7, "#ffcf8a", .55); P.visible = false; return P; });
    /* életnagyságban a lakások neve lebeg a szobákban (rámutatva / csippentve: belépés vagy foglalás) */
    Object.values(MAQ.apts).forEach((A) => {
      const L = labelSprite([(A.no ? A.no + " · " : "") + A.name + " Apartman", A.lock ? "a tulajdonos lakása" : "csippents: fotók · foglalás"], { size: .9, fs: 50 });
      L.position.set((A.bb[0] + A.bb[2]) / 2, 2.25, (A.bb[1] + A.bb[3]) / 2); H.lv[A.lv].add(L); L.visible = false; L.material.depthTest = true; L.renderOrder = 8; A.lifeL = L;
      L.userData.xr = { hover: (on) => L.scale.multiplyScalar(on ? 1.1 : 1 / 1.1), click: () => maqSelect(A, true) };
      T.xr.extra.add(L); W.objs.push(L);
    });
    /* ---------- életnagyságban: 360°-os fotópontok és lépés (teleport) ---------- */
    MAQ.orbs = [];
    const orbTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 120); gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(.35, "rgba(255,209,102,.9)"); gr.addColorStop(1, "rgba(255,180,60,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      g.fillStyle = "#0b2f5e"; g.font = "800 92px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("360°", 128, 132); });
    H.spots.forEach((sp) => {
      const o = new THREE.Sprite(sprM({ map: orbTex, transparent: true, depthWrite: false })); o.scale.set(.3, .3, 1); o.position.set(sp.x, 1.35, sp.z); H.lv[sp.lv].add(o); o.visible = false; o.renderOrder = 6;
      o.userData.xr = { hover: (on) => { o.scale.setScalar(on ? .42 : .3); if (on) showTip(o, "📷 " + sp.n + " – valódi 360°-os fotó", "Csippents rá: belépsz a fotóba"); else showTip(null); }, click: () => { W.close(() => T.go(sp.id)); } };
      T.xr.extra.add(o); W.objs.push(o); MAQ.orbs.push(o);
    });
    /* teleport-felületek: a telek, a két szint padlója (a ház alapterületén + teraszok) és a part */
    const tpM = basic({ visible: false });
    const tp0 = mesh(new THREE.PlaneGeometry(S.SX1 - S.SX0, S.SZ1 - S.SZ0), tpM, model); tp0.rotation.x = -Math.PI / 2; tp0.position.set(MAQ.C.x, .09, MAQ.C.z);
    const tp1 = mesh(new THREE.PlaneGeometry(OUT_W, Z_END + 4.75), tpM, model); tp1.rotation.x = -Math.PI / 2; tp1.position.set(OUT_W / 2, FLOOR_H + .02, (Z_END + 3.3 - 1.45) / 2);
    MAQ.tp = [tp0, tp1];
    const lifeOnly = () => MAQ.mode === "life";   /* a kézi mozgás íve csak életnagyságban landolhat rajtuk */
    [tp0, tp1].forEach((m, i) => { m.userData.tp = lifeOnly; m.userData.xr = { click: (hit) => { if (hit && hit.point) teleport(hit.point, i); } }; T.xr.extra.add(m); W.objs.push(m); });
    ENV.land.userData.xr = { click: (hit) => { if (MAQ.mode === "life" && hit && hit.point) teleport(hit.point, 0); } }; ENV.land.userData.tp = lifeOnly;
    /* távcső: a látnivalók feliratai */
    ENV.telHit.userData.xr = { hover: (on) => { if (on) showTip(ENV.telescope, "🔭 Távcső", "Csippents rá: a Balaton látnivalói a láthatáron"); else showTip(null); }, click: () => toggleSights() };
    T.xr.extra.add(ENV.telHit); W.objs.push(ENV.telHit);

    /* ---------- fény, árnyék ---------- */
    const r = T.sceneEl.renderer; r.shadowMap.enabled = true; r.shadowMap.type = T.inVR ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    /* az árnyéktérkép csak akkor számolódik újra, ha valami változott (nap, méret, forgatás, tető…) – Quest 2-n ez sokat számít */
    r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = true; MAQ.shSig = "";
    const sun = ENV.lights.sun; sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0005; sun.shadow.normalBias = .02;

    /* ---------- áttűnés (életnagyságba lépéskor) ---------- */
    const fm = basic({ color: "#fff1cf", transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false });
    MAQ.fade = mesh(new THREE.SphereGeometry(.5, 16, 12), fm, root); MAQ.fade.renderOrder = 1000; MAQ.fade.visible = false;

    /* ---------- kezdőállapot: aranyóra, 1:60 az asztalon, az utcafront felénk ---------- */
    MAQ.day = (T.sunDefaultDay && T.sunDefaultDay()) || "2027-07-15";
    MAQ.st = sunTimesOf(MAQ.day);
    MAQ.hour = MAQ.hourT = MAQ.st.set ? MAQ.st.set - .75 : 19.5;
    MAQ.preset = 4;
    envSetTime(MAQ.day, MAQ.hour);
    MAQ.mode = "table"; MAQ.s = MAQ.sT = 1 / 40; MAQ.upper = true; MAQ.roofOn = false; MAQ.sel = null; MAQ.auto = undefined; MAQ.level = 0; MAQ.sights = false;
    turn.rotation.y = Math.PI + .35;
    applyPlacement(true);
    if (!T.inVR) { const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject) lc.pitchObject.rotation.x = -.62; }
    audioStart({ water: .03, wind: .012 });
    /* VR-ben az első alkalommal: rövid kézmozdulat-súgó (csippentésre vagy 25 mp után eltűnik) */
    if (T.inVR) {
      const CW = 1200, CH = 560;
      const tx = canvasTex(CW, CH, (g) => {
        const bg = g.createLinearGradient(0, 0, 0, CH); bg.addColorStop(0, "rgba(16,56,104,.95)"); bg.addColorStop(1, "rgba(7,28,58,.95)");
        g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(6, 6, CW - 12, CH - 12, 46) : g.rect(6, 6, CW - 12, CH - 12); g.fill(); g.lineWidth = 7; g.strokeStyle = "#ffd166"; g.stroke();
        g.fillStyle = "#ffd166"; g.font = "800 58px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Így irányítod a kezeddel", CW / 2, 70);
        [["✋", "Bal tenyér felfelé", "nézz rá: megnyílik a menü"], ["🤏", "Csippents a makett fölött", "és húzd körbe: forog"], ["🤏🤏", "Két kéz csippent", "széthúzva nő a ház"]].forEach(([ic, a1, a2], i) => {
          const x = 200 + i * 400; g.fillStyle = "rgba(255,255,255,.1)"; g.beginPath(); g.roundRect ? g.roundRect(x - 180, 130, 360, 330, 30) : g.rect(x - 180, 130, 360, 330); g.fill();
          g.font = "100px system-ui, sans-serif"; g.fillStyle = "#fff"; g.fillText(ic, x, 240); g.font = "800 36px system-ui, sans-serif"; g.fillText(a1, x, 360); g.font = "600 30px system-ui, sans-serif"; g.fillStyle = "#cfe3f5"; g.fillText(a2, x, 410); });
        g.fillStyle = "#fff"; g.font = "600 30px system-ui, sans-serif"; g.fillText("Csippents erre a táblára, és eltűnik", CW / 2, 510);
      });
      const hc = mesh(new THREE.PlaneGeometry(.9, .9 * CH / CW), basic({ map: tx, transparent: true, depthTest: false, depthWrite: false }), root); hc.renderOrder = 997;
      placeFacing(hc, 1.0, .12, 0); MAQ.help = hc; MAQ.helpT = 25;
      hc.userData.xr = { click: () => { hc.visible = false; T.xr.extra.delete(hc); } }; T.xr.extra.add(hc); W.objs.push(hc);
    }
    W.maq = { MAQ, ORB, orbView, ENV, BJ, goLife, goTable, bjStart, bjNext, setPreset, stepScale, nudgeHour, toggleSights };   /* tesztekhez */
    return { tick: maqTick, panel: maqPanel, hud: maqHud, wrist: maqWrist };
  }
  function sunTimesOf(ymd) {
    let rise = null, set = null, prev = -90;
    for (let hh = 3; hh <= 23; hh += 1 / 30) { let e = -90; try { e = T.sunPos(ymd, hh).el; } catch (x) { return { rise: 5.5, set: 20.5 }; } if (prev < -.833 && e >= -.833 && rise == null) rise = hh; if (prev >= -.833 && e < -.833) set = hh; prev = e; }
    return { rise, set };
  }
  const PRESETS = [["Hajnal", (s) => (s.rise || 5.2) + .25], ["Reggel", (s) => (s.rise || 5.2) + 2.2], ["Dél", () => 13], ["Délután", () => 16.5], ["Aranyóra", (s) => (s.set || 20.5) - .75],
    ["Naplemente", (s) => (s.set || 20.5) - .05], ["Kék óra", (s) => (s.set || 20.5) + .45], ["Éjszaka", () => 23.3]];
  function setPreset(i) { MAQ.preset = (i + PRESETS.length) % PRESETS.length; MAQ.hourT = PRESETS[MAQ.preset][1](MAQ.st); W.panelDirty = 1; }
  function nudgeHour(d) { MAQ.hourT = clamp(MAQ.hourT + d, 4, 23.9); W.panelDirty = 1; }

  /* ---------- méret és elhelyezés ---------- */
  function applyPlacement(now) {
    const s = MAQ.s, life = MAQ.mode === "life";
    const H = MAQ.H, model = MAQ.model;
    model.scale.setScalar(s);
    if (life) { MAQ.holder.position.set(-MAQ.C.x, 0, -MAQ.C.z); MAQ.turn.rotation.y = 0; model.position.set(0, 0, 0); }   /* életnagyságban a telek a kertsziget közepén */
    else {
      model.position.set(-MAQ.C.x * s, 0, -MAQ.C.z * s);
      MAQ.base.scale.setScalar(s); MAQ.base.position.set(0, 0, 0);
      const onTable = s <= 1 / 30;
      const R = MAQ.R * s;
      if (onTable) MAQ.holder.position.set(0, TABLE_Y + 2.6 * s + .002, 0);
      else MAQ.holder.position.set(0, .002 + 2.6 * s, USER_Z - .75 - R);
    }
    MAQ.base.visible = !life; if (ENV.islandDeco) ENV.islandDeco.visible = !life;
    /* árnyékkamera a mérethez */
    const sc = ENV.lights.sun.shadow.camera, half = life ? 30 : MAQ.R * s * 1.05 + .25;
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = .05; sc.far = life ? 160 : 40; sc.updateProjectionMatrix();
    MAQ.shadowD = life ? 70 : Math.max(3, half * 4);
    /* címkék mérete */
    Object.values(MAQ.apts).forEach((A) => { if (A.label) { const k = 7.5 / Math.sqrt(60 * s); A.label.scale.set(k, k * A.label.userData.ar, 1); } });
  }
  function setScale(s, animate) {
    if (MAQ.mode === "life") return;
    MAQ.sT = clamp(s, 1 / 150, 1 / 8); if (!animate) { MAQ.s = MAQ.sT; applyPlacement(); }
    W.panelDirty = 1; wristRedraw();
  }
  function stepScale(dir) {
    if (MAQ.mode === "life") { if (dir < 0) goTable(); return; }
    const cur = MAQ.sT; let i = SCALES.findIndex((q) => q > cur * 1.02); if (i < 0) i = SCALES.length;
    if (dir > 0) { const nx = SCALES[i]; if (nx >= .99) goLife(); else if (nx) setScale(nx, true); }
    else { let j = SCALES.length - 1; while (j >= 0 && SCALES[j] >= cur * .98) j--; if (j >= 0) setScale(SCALES[j], true); }
  }
  /* életnagyság: áttűnés, a ház a parton, mi az utcán a kapu előtt, a ház felé fordulva */
  function goLife() {
    if (MAQ.mode === "life" || MAQ.fading) return;
    fadeThen(() => {
      if (MAQ.fly) { MAQ.fly = false; MAQ.landing = 0; flyFx(false); }
      MAQ.mode = "life"; MAQ.s = MAQ.sT = 1; MAQ.roofOn = true; MAQ.upper = true; MAQ.level = 0; maqDeselect(); applyPlacement(true); lifeTargets(true);
      const site = ENV.site; site.updateMatrixWorld(true);
      /* nézés a ház felé (site +z) */
      const fw = new THREE.Vector3(0, 0, 1).transformDirection(site.matrixWorld); faceTo(Math.atan2(-fw.x, -fw.z));
      const target = site.localToWorld(new THREE.Vector3(-MAQ.C.x + 3.0, 0, -MAQ.C.z - 6.2));   /* az utcán, a kerítés előtt: az egész homlokzat látszik */
      placeUser(target, 0);
      wristRedraw(); W.panelDirty = 1;
    });
  }
  function goTable() {
    if (MAQ.mode !== "life" || MAQ.fading) return;
    fadeThen(() => {
      if (MAQ.fly) { MAQ.fly = false; MAQ.landing = 0; flyFx(false); }
      MAQ.mode = "table"; MAQ.s = MAQ.sT = 1 / 40; MAQ.roofOn = false; MAQ.level = 0; applyPlacement(true); lifeTargets(false);
      const rg = T.rig.object3D; rg.position.copy(MAQ.rig0.p);
      const site = ENV.site; const fw = new THREE.Vector3(0, 0, -1).transformDirection(site.matrixWorld); faceTo(Math.atan2(-fw.x, -fw.z));
      placeUser(site.localToWorld(new THREE.Vector3(0, 0, USER_Z)), -1);
      MAQ.turn.rotation.y = Math.PI + .35; wristRedraw(); W.panelDirty = 1;
    });
  }
  /* a felhasználó (a feje) a megadott pontra kerül; lvl: 0/1 szint (életnagyságban), −1 = a stég */
  function placeUser(pt, lvl) {
    const rg = T.rig.object3D; rg.updateMatrixWorld(true);
    const hw = headWorld(new THREE.Vector3());
    rg.position.x += pt.x - hw.x; rg.position.z += pt.z - hw.z;
    rg.position.y = pt.y + (T.inVR ? 0 : EYE2D);
    if (lvl >= 0) MAQ.level = lvl;
    if (W.panel && !W.panelHidden) setTimeout(() => { try { if (W.active) W.togglePanel(), W.togglePanel(); } catch (e) {} }, 30);
  }
  function teleport(pt, lvl) { if (MAQ.mode !== "life" || MAQ.fly) return; placeUser(pt, lvl); try { flap(.03); } catch (e) {} wristRedraw(); }
  function goLevel(lvl) {
    if (MAQ.mode !== "life") return; const hw = headWorld(new THREE.Vector3()); const y = MAQ.model.localToWorld(new THREE.Vector3(0, lvl ? FLOOR_H : 0, 0)).y;
    placeUser(new THREE.Vector3(hw.x, y, hw.z), lvl); wristRedraw(); W.panelDirty = 1;
  }
  /* életnagyságban a part, a palló és a stég is járható (csippentés = odalépés) */
  function lifeTargets(on) {
    [ENV.land, ENV.walk, ENV.deckTop].forEach((L) => { if (!L) return;
      if (!L.userData.xr) L.userData.xr = { click: (hit) => { if (MAQ.mode === "life" && hit && hit.point) teleport(hit.point, 0); } };
      L.userData.tp = () => MAQ.mode === "life";
      if (on) { T.xr.extra.add(L); if (!W.objs.includes(L)) W.objs.push(L); } else { T.xr.extra.delete(L); W.objs = W.objs.filter((o) => o !== L); } });
  }
  function fadeThen(fn) {
    MAQ.fading = { t: 0, fn, done: false }; MAQ.fade.visible = true;
  }

  /* ---------- foglaltság a választott napokon ---------- */
  function maqAvail() {
    let S = null; try { S = T.vrPanel && T.vrPanel.S && T.vrPanel.S.book; } catch (e) {}
    const B = window.ZephyrBooking && ZephyrBooking.vr;
    MAQ.dates = S && S.ci && S.co ? { ci: S.ci, co: S.co } : null;
    Object.values(MAQ.apts).forEach((A) => {
      A.free = null;
      if (!MAQ.dates || !B || A.lock) return;
      let ok = true; for (let d = MAQ.dates.ci; d < MAQ.dates.co; d = addDay(d, 1)) if (!B.free(A.id, d)) { ok = false; break; }
      A.free = ok;
    });
  }
  function addDay(s, n) { const [y, m, d] = s.split("-").map(Number); const t = new Date(y, m - 1, d + n); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); }

  /* ---------- rámutatás, kiválasztás, kártya ---------- */
  function maqHover(A, on) {
    if (MAQ.mode === "life") return;
    A.hov = on;
    if (!A.label) {
      const cap = (() => { try { const c = ZephyrBooking.vr.cfg(); const a = c && c.apartments.find((q) => q.id === A.id); return a ? a.cap + " fő · " : ""; } catch (e) { return ""; } })();
      A.label = labelSprite([(A.no ? A.no + " · " : "") + A.name, A.lock ? "saját lakás – nem foglalható" : `${cap}kb. ${Math.round(A.area)} m² · csippents rá`], { size: 1, fs: 50 });
      A.label.userData.ar = A.label.scale.y; A.label.position.set((A.bb[0] + A.bb[2]) / 2, FLOOR_H + 2.6, (A.bb[1] + A.bb[3]) / 2); MAQ.H.lv[A.lv].add(A.label);
      applyPlacement();
    }
    A.label.visible = !!on || MAQ.sel === A;
  }
  function placeFacing(obj, dist, dy, side) {
    const hw = headWorld(new THREE.Vector3()), yaw = (T.inVR ? headYaw() : T.camYaw()) + (side || 0);
    obj.position.set(hw.x - Math.sin(yaw) * dist, hw.y + dy, hw.z - Math.cos(yaw) * dist);
    obj.lookAt(hw.x, obj.position.y, hw.z);
  }
  function maqSelect(A, force) {
    if (MAQ.mode === "life" && !force) return;
    if (MAQ.sel && MAQ.sel !== A && MAQ.sel.label) MAQ.sel.label.visible = false;
    MAQ.sel = A; maqHover(A, true);
    if (MAQ.card) { T.xr.extra.delete(MAQ.card); W.objs = W.objs.filter((o) => o !== MAQ.card); if (MAQ.card.parent) MAQ.card.parent.remove(MAQ.card); MAQ.card = null; }
    const CW = 1000, CH = 470, btns = [];
    const tx = canvasTex(CW, CH, (g) => {
      const bg = g.createLinearGradient(0, 0, 0, CH); bg.addColorStop(0, "rgba(16,56,104,.96)"); bg.addColorStop(1, "rgba(7,28,58,.96)");
      g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(6, 6, CW - 12, CH - 12, 44) : g.rect(6, 6, CW - 12, CH - 12); g.fill(); g.lineWidth = 8; g.strokeStyle = "#" + A.col.getHexString(); g.stroke();
      g.fillStyle = "#ffd166"; g.font = "800 66px system-ui, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText((A.no ? A.no + " · " : "") + A.name + " Apartman", 50, 82);
      g.fillStyle = "#fff"; g.font = "600 38px system-ui, sans-serif";
      const st = A.free === true ? "✓ szabad a választott időpontban" : A.free === false ? "✕ foglalt a választott időpontban" : `kb. ${Math.round(A.area)} m² · ${A.lv ? "emelet" : "földszint"}`;
      g.fillText(A.lock ? "A tulajdonos saját lakása – nem foglalható" : st, 50, 152);
      g.fillStyle = "rgba(255,255,255,.75)"; g.font = "500 32px system-ui, sans-serif"; g.fillText("Belépés: a valódi 360°-os fotókba · Foglalás: itt, a térben", 50, 208);
      const bt = (x, w, label, on, fn) => { btns.push({ x, y: 260, w, h: 160, fn }); g.fillStyle = on ? "#ffd166" : "rgba(255,255,255,.14)"; g.beginPath(); g.roundRect ? g.roundRect(x, 260, w, 160, 32) : g.rect(x, 260, w, 160); g.fill(); g.lineWidth = 4; g.strokeStyle = "rgba(255,255,255,.4)"; g.stroke(); g.fillStyle = on ? "#0b2f5e" : "#fff"; g.font = "800 50px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(label, x + w / 2, 342); };
      if (A.lock) bt(50, CW - 100, "‹ Bezárás", false, () => maqDeselect());
      else { bt(50, 290, "👁 Belépés", false, () => maqEnter(A)); bt(360, 360, "📅 Foglalás", true, () => maqBook(A)); bt(740, 210, "✕", false, () => maqDeselect()); }
    });
    const card = mesh(new THREE.PlaneGeometry(.46, .46 * CH / CW), basic({ map: tx, transparent: true, depthTest: false, depthWrite: false }), W.root);
    card.renderOrder = 996; placeFacing(card, .62, -.12, -.32);
    card.userData.xr = { click: (h) => { if (!h || !h.uv) return; const x = h.uv.x * CW, y = (1 - h.uv.y) * CH; const b = btns.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); if (b) b.fn(); } };
    T.xr.extra.add(card); W.objs.push(card); MAQ.card = card;
    try { winch(); } catch (e) {}
  }
  function maqDeselect() { if (MAQ.sel && MAQ.sel.label) MAQ.sel.label.visible = false; MAQ.sel = null; if (MAQ.card) { T.xr.extra.delete(MAQ.card); MAQ.card.visible = false; } }
  function maqEnter(A) { if (A.lock) return; const best = (T.GROUPS.find((q) => q.id === A.id) || {}).entry; W.close(() => T.go(best)); }
  function maqBook(A) { if (A.lock) return; W.close(() => { try { T.book(A.id); } catch (e) { if (window.ZephyrBooking) ZephyrBooking.open({ apt: A.id }); } }); }
  /* lebegő tipp (rámutatáskor) */
  function showTip(obj, t1, t2) {
    if (!obj) { if (MAQ.tip) MAQ.tip.visible = false; return; }
    if (!MAQ.tip) { MAQ.tip = labelSprite(["", ""], { size: .34, fs: 46, w: 900 }); W.root.add(MAQ.tip); }
    MAQ.tip.userData.set([t1, t2 || ""]); MAQ.tip.visible = true;
    const p = obj.getWorldPosition(new THREE.Vector3()), hw = headWorld(new THREE.Vector3()); const d = p.clone().sub(hw); const L = Math.min(d.length(), 1.2); d.normalize();
    MAQ.tip.position.copy(hw).addScaledVector(d, L * .8); MAQ.tip.position.y += .12;
  }

  /* ---------- a Balaton látnivalói (a távcsőnél / a csuklómenüben) ---------- */
  const SIGHTS = [
    [296, .9, "Tihanyi Bencés Apátság", "5,5 km · 1055-ben alapította I. András", "Az alapítólevél őrzi a legrégebbi magyar mondattöredéket. Barokk templom két toronnyal, csodás kilátás a tóra."],
    [302, 1.6, "Tihany · levendulamezők", "6 km · júniusban–júliusban lilába borul", "Levendulaszüret, Levendula Ház Látogatóközpont; a félsziget közepén a Belső-tó (vulkáni kráter) és a Barátlakások."],
    [287, .45, "Szántód–Tihany komp", "4,4 km · a legrövidebb átkelés", "Kb. 10 perc alatt visz át a túlpartra – Tihany kapuja."],
    [325, .8, "Balatonfüred", "8,5 km · Tagore sétány, szívkórház", "Vitorláskikötő, Anna-bál, a reformkori fürdőváros – a Balaton „fővárosa”."],
    [254.6, .75, "Badacsony", "37 km · tanúhegy, bazaltorgonák", "Koporsó alakú vulkáni hegy, borvidék, Kisfaludy-ház; mellette a Gulács, a Szent György-hegy és Szigliget vára."],
    [181.5, 2.9, "Kőhegyi kilátó (Zamárdi)", "3 km · a ház mögötti dombon", "Fehér kilátótorony a Kőhegyen: az egész tó és a Tihanyi-félsziget a lábad előtt."],
    [84, .8, "Siófok", "7 km · Petőfi sétány, víztorony", "Pezsgő üdülőváros szabadstrandokkal, a „magyar tenger fővárosa”."]
  ];
  function toggleSights() {
    MAQ.sights = !MAQ.sights;
    if (!MAQ.sightL) {
      MAQ.sightL = SIGHTS.map(([b, e, n, l1, l2]) => {
        const sp = labelSprite([n, l1], { size: 46, fs: 52, w: 980 }); const R = 330, a = b * D2R; sp.position.set(Math.sin(a) * R, WATER_Y + Math.tan(e * D2R) * R + 16, -Math.cos(a) * R); ENV.env.add(sp);
        const pin = mesh(new THREE.CylinderGeometry(.5, .5, 12, 6), basic({ color: "#ffd166", transparent: true, opacity: .8 }), ENV.env); pin.position.copy(sp.position); pin.position.y -= 10;
        sp.userData.xr = { hover: (on) => sp.scale.multiplyScalar(on ? 1.12 : 1 / 1.12), click: () => { sp.userData.set([n, l2.length > 52 ? l2.slice(0, 52) + "…" : l2]); setTimeout(() => sp.userData.set([n, l1]), 6000); } };
        T.xr.extra.add(sp); W.objs.push(sp); return [sp, pin];
      });
    }
    MAQ.sightL.forEach(([sp, pin]) => { sp.visible = pin.visible = MAQ.sights; });
    W.panelDirty = 1; wristRedraw();
  }

  /* ---------- képkocka ---------- */

  /* ---------- KÖRBENÉZŐ KAMERA (2D: mobil / gép, 2026. nov. 6.) ----------
     Asztali (makett) módban a kamera a makett körül kering: egy ujjal húzva körbe-forog és fel-le billen,
     két ujjal csippentve (vagy görgővel) közelít/távolodik. Nézet-gombok: Felül · Elöl · Hátul · Bal · Jobb · Ferde.
     Az irányok a maketthez kötöttek (az „Elöl” mindig az utcafront), a váltás simán úszik át. */
  const ORB = { az: .35, el: .62, d: 1.7, azT: .35, elT: .62, dT: 1.7, on: false, pts: new Map(), moved: 0 };
  const ORB_VIEWS = { top: [0, 1.555, 1.75], front: [0, .3, 1.55], back: [Math.PI, .3, 1.55], left: [-Math.PI / 2, .3, 1.55], right: [Math.PI / 2, .3, 1.55], iso: [.7, .6, 1.7] };
  function orbView(k) { const v = ORB_VIEWS[k]; if (!v) return; MAQ.auto = false; MAQ.spinV = 0; let a = v[0]; while (a - ORB.az > Math.PI) a -= TAU; while (a - ORB.az < -Math.PI) a += TAU; ORB.azT = a; ORB.elT = v[1]; ORB.dT = v[2]; MAQ.view = k; W.panelDirty = 1; }
  function orbLC(en) { try { T.cam.setAttribute("look-controls", "enabled", en); } catch (e) {} }
  function orbAttach() {
    if (ORB.cv || T.inVR) return; const cv = T.sceneEl.canvas; if (!cv) return; ORB.cv = cv;
    const P = ORB.pts, act = () => ORB.on && !T.inVR && MAQ.mode !== "life";
    const dist2 = () => { const a = [...P.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    ORB.h = {
      down: (e) => { if (!act()) return; P.set(e.pointerId, { x: e.clientX, y: e.clientY }); ORB.moved = 0; if (P.size === 2) ORB.pd = dist2(); },
      move: (e) => { if (!act() || !P.has(e.pointerId)) return; const q = P.get(e.pointerId), dx = e.clientX - q.x, dy = e.clientY - q.y;
        if (P.size === 1) { ORB.moved += Math.abs(dx) + Math.abs(dy); if (ORB.moved > 6) { const k = 4.2 / Math.max(320, Math.min(innerWidth, innerHeight)); ORB.azT -= dx * k; ORB.elT = clamp(ORB.elT + dy * k, .06, 1.555); MAQ.auto = false; MAQ.view = null; } }
        q.x = e.clientX; q.y = e.clientY;
        if (P.size === 2) { const d = dist2(); if (ORB.pd > 10) ORB.dT = clamp(ORB.dT * ORB.pd / Math.max(10, d), .55, 7); ORB.pd = d; ORB.moved = 99; MAQ.view = null; } },
      up: (e) => { P.delete(e.pointerId); if (P.size < 2) ORB.pd = 0; },
      wheel: (e) => { if (!act()) return; e.preventDefault(); ORB.dT = clamp(ORB.dT * Math.exp(e.deltaY * .0012), .55, 7); MAQ.view = null; },
      /* húzás után ne válasszon ki lakást a felengedés */
      click: (e) => { if (act() && ORB.moved > 6) { e.stopImmediatePropagation(); e.preventDefault(); } }
    };
    cv.addEventListener("pointerdown", ORB.h.down); addEventListener("pointermove", ORB.h.move); addEventListener("pointerup", ORB.h.up); addEventListener("pointercancel", ORB.h.up);
    cv.addEventListener("wheel", ORB.h.wheel, { passive: false }); cv.addEventListener("click", ORB.h.click, true);
    cv.style.touchAction = "none";
  }
  function orbDetach() {
    if (!ORB.cv) return; const cv = ORB.cv, h = ORB.h;
    cv.removeEventListener("pointerdown", h.down); removeEventListener("pointermove", h.move); removeEventListener("pointerup", h.up); removeEventListener("pointercancel", h.up);
    cv.removeEventListener("wheel", h.wheel); cv.removeEventListener("click", h.click, true); ORB.cv = null; ORB.pts.clear(); orbLC(true);
  }
  const _oT = new THREE.Vector3(), _oH = new THREE.Vector3(), _oE = new THREE.Vector3(), _oW = new THREE.Vector3();
  function orbTick(dt) {
    const want = !T.inVR && MAQ.mode !== "life" && !MAQ.fading;
    if (want !== ORB.on) { ORB.on = want; orbLC(!want); if (want) { orbAttach(); ORB.az = ORB.azT; ORB.el = ORB.elT; ORB.d = ORB.dT; } }
    if (!ORB.on) return;
    const k = Math.min(1, dt * 5); ORB.az += (ORB.azT - ORB.az) * k; ORB.el += (ORB.elT - ORB.el) * k; ORB.d = Math.exp(lerp(Math.log(ORB.d), Math.log(ORB.dT), k));
    MAQ.holder.getWorldPosition(_oT); _oT.y -= 1.2 * MAQ.s;   /* a ház közepe felé (a talapzat fölött) */
    MAQ.turn.updateMatrixWorld(true);
    _oH.set(Math.sin(ORB.az), 0, -Math.cos(ORB.az)).transformDirection(MAQ.turn.matrixWorld); _oH.y = 0; _oH.normalize();
    const asp = innerWidth / Math.max(1, innerHeight), R = Math.max(.2, MAQ.R * MAQ.s), D = ORB.d * R * (asp < 1 ? lerp(Math.min(1.45, 1 / Math.sqrt(asp) * .85), .82, clamp((ORB.el - 1.1) / .4, 0, 1)) : 1), ce = Math.cos(ORB.el), se = Math.sin(ORB.el);
    _oE.copy(_oT).addScaledVector(_oH, ce * D); _oE.y += se * D;
    const rg = T.rig.object3D, cam = T.cam.object3D;
    rg.rotation.set(0, Math.atan2(_oH.x, _oH.z), 0); cam.rotation.set(-ORB.el, 0, 0);
    rg.updateMatrixWorld(true); headWorld(_oW); rg.position.add(_oE.sub(_oW));
    try { const cm = T.sceneEl.camera; const nr = clamp(D * .02, .01, .06); if (cm && Math.abs(cm.near - nr) > .002) { cm.near = nr; cm.updateProjectionMatrix(); } } catch (e) {}
  }

  /* (a korábbi „jetpack” repülés 2026. nov. 9-én kivéve – helyette a lenti Szuperman-repülés) */
  /* ===== SZUPERMAN-REPÜLÉS (2026. nov. 9., a tulajdonos kérésére a nehezen irányítható hátimotor helyett) =====
     Nagyon egyszerű: VR-ben CSIPPENTS ÉS TARTSD (kontrollerrel: ravasz) – arra repülsz, amerre a kezed mutat (fel, le, előre, oldalra, a makett alá is);
     két kézzel csippentve kétszer gyorsabban; elengeded – lágyan megállsz és lebegsz. Gépen/telefonon: W A S D / nyilak, Q le, E fel (vagy a gombok:
     egy koppintás = rövid, sima suhanás abba az irányba). Asztali méretnél lassan (a kis makett körül centiről centire), életnagyságban gyorsan. */
  const FLY = { v: new THREE.Vector3(), keys: {}, burst: null, thr: 0 };
  function toggleFly(on) {
    MAQ.fly = on == null ? !MAQ.fly : !!on; FLY.v.set(0, 0, 0); FLY.burst = null;
    if (MAQ.fly) { MAQ.flyGround = T.rig.object3D.position.y; MAQ.landing = 0; } else MAQ.landing = MAQ.mode === "life" ? 1 : 0;
    try { flap(.05); } catch (e) {} wristRedraw(); W.panelDirty = 1;
  }
  function flyFx() {}
  const _fd = new THREE.Vector3(), _fr = new THREE.Vector3(), _fp = new THREE.Vector3(), _fq = new THREE.Quaternion();
  function flySpeed() { return MAQ.mode === "life" ? 7 : clamp(MAQ.s * 22, .35, 2.4); }
  function flyTick(dt) {
    const rg = T.rig.object3D, life = MAQ.mode === "life", X = T.xr, pl = X.pinch || {};
    if (!MAQ.fly && !MAQ.landing) { FLY.v.multiplyScalar(Math.pow(.05, dt)); if (FLY.v.lengthSq() > 1e-6) rg.position.addScaledVector(FLY.v, dt); return; }
    const want = _fp.set(0, 0, 0); let n = 0;
    if (MAQ.fly && T.inVR) {
      ["right", "left"].forEach((h) => { const S0 = X.src && X.src[h]; if (!S0 || !S0.d || !pl[h] || S0.fist) return; want.add(S0.d); n++; if (X.press) X.press[h] = null; });   /* repülés közben a csippentés nem kattint */
    } else if (MAQ.fly) {
      const K = FLY.keys, c = T.camObj(); c.getWorldQuaternion(_fq); _fd.set(0, 0, -1).applyQuaternion(_fq); _fr.set(1, 0, 0).applyQuaternion(_fq);
      if (K.f) want.add(_fd); if (K.b) want.sub(_fd); if (K.r) want.add(_fr); if (K.l) want.sub(_fr); if (K.u) want.y += 1; if (K.d) want.y -= 1;
      if (FLY.burst) { FLY.burst.t -= dt; if (FLY.burst.t <= 0) FLY.burst = null; else want.add(FLY.burst.dir); }
      if (want.lengthSq() > 0) n = 1;
    }
    if (n) want.normalize().multiplyScalar(flySpeed() * (n > 1 ? 2 : 1));
    FLY.v.lerp(want, Math.min(1, dt * (n ? 2.6 : 3.2)));   /* lágy indulás és megállás */
    if (MAQ.landing) { FLY.v.set(0, 0, 0); const gy = MAQ.flyGround == null ? rg.position.y : MAQ.flyGround; rg.position.y += Math.max(-4 * dt, gy - rg.position.y); if (Math.abs(rg.position.y - gy) < .01) { rg.position.y = gy; MAQ.landing = 0; } }
    rg.position.addScaledVector(FLY.v, dt);
    const g0 = MAQ.floorY != null ? MAQ.floorY : 0; rg.position.y = clamp(rg.position.y, g0 - 25, g0 + 120);
    FLY.thr += ((MAQ.fly ? FLY.v.length() / flySpeed() : 0) - FLY.thr) * Math.min(1, dt * 4);
    try { AU.set("rush", FLY.thr * .06, .2); AU.set("wind", .012 + FLY.thr * .05, .3); } catch (e) {}
  }
  function flyStep(kind) {   /* gépen/mobilon: egy koppintás = ~1,6 mp sima suhanás az adott irányba */
    if (!MAQ.fly) toggleFly(true);
    const c = T.camObj(); c.getWorldQuaternion(_fq); const d = new THREE.Vector3();
    if (kind === "up") d.set(0, 1, 0); else if (kind === "down") d.set(0, -1, 0); else if (kind === "back") d.set(0, 0, 1).applyQuaternion(_fq); else if (kind === "left") d.set(-1, 0, 0).applyQuaternion(_fq); else if (kind === "right") d.set(1, 0, 0).applyQuaternion(_fq); else d.set(0, 0, -1).applyQuaternion(_fq);
    FLY.burst = { dir: d.normalize(), t: 1.6 };
  }
  function flyKey(e, v) {
    if (!W.active || W.kind !== "maquette" || T.inVR) return; const k = e.key.toLowerCase(), M = { w: "f", arrowup: "f", s: "b", arrowdown: "b", a: "l", arrowleft: "l", d: "r", arrowright: "r", e: "u", q: "d", " ": "u", shift: "d" }[k];
    if (!M) return; if (v && !MAQ.fly) toggleFly(true); FLY.keys[M] = v; e.preventDefault();
  }
  const flyKD = (e) => flyKey(e, true), flyKU = (e) => flyKey(e, false);
  function maqTick(dt) {
    const life = MAQ.mode === "life";
    /* méret simítása */
    if (!life && Math.abs(MAQ.s - MAQ.sT) > 1e-6) { MAQ.s = Math.exp(lerp(Math.log(MAQ.s), Math.log(MAQ.sT), Math.min(1, dt * 6))); if (Math.abs(MAQ.s / MAQ.sT - 1) < .002) MAQ.s = MAQ.sT; applyPlacement(); }
    /* asztal: kisebb méreteknél látszik, nagyobbaknál a stégbe süllyed */
    const tWant = !life && MAQ.s <= 1 / 30 ? 0 : -1.0; MAQ.table.position.y += (tWant - MAQ.table.position.y) * Math.min(1, dt * 5); MAQ.table.visible = MAQ.table.position.y > -.95;
    /* két kézzel nagyítás: csippents mindkét kezeddel, és húzd szét / össze */
    const X = T.xr, pl = X.pinch || {};
    if (T.inVR && !MAQ.fly && pl.left && pl.right && X.src.left && X.src.right && X.src.left.o && X.src.right.o) {
      const d = X.src.left.o.distanceTo(X.src.right.o);
      if (!MAQ.two) { MAQ.two = { d0: Math.max(.05, d), s0: life ? 1 / 8 : MAQ.s }; MAQ.drag = null; }
      else { const want = MAQ.two.s0 * Math.pow(d / MAQ.two.d0, 1.6);
        if (life) { if (want < 1 / 8 * .55) { MAQ.two = null; goTable(); } }
        else if (want >= 1 / 8.2 && !MAQ.fading) { MAQ.two = null; goLife(); }
        else setScale(want, false); }
    } else MAQ.two = null;
    /* KÉZZEL FORGATÁS (2026. nov. 6.): nyúlj a makett fölé (vagy a talapzat széléhez), csippents, és húzd körbe a kezed – a makett vele fordul,
       mint egy forgótányér; elengedve kicsit tovább pörög és lelassul. Két kézzel továbbra is nagyítás. */
    if (T.inVR && !life && !MAQ.two && !MAQ.fly) {
      const cw = MAQ.holder.getWorldPosition(_q4), Rw = Math.max(.25, MAQ.R * MAQ.s * 1.15);
      ["right", "left"].forEach((h) => {
        const S0 = X.src && X.src[h]; if (!S0) return; const p = S0.tip || S0.o; if (!p) return;
        const dx = p.x - cw.x, dz = p.z - cw.z, r = Math.hypot(dx, dz), ang = Math.atan2(dx, dz);
        const G = MAQ.grab;
        if (pl[h] && !G && !MAQ.drag && r < Rw && r > .03 && p.y > cw.y - .25 && p.y < cw.y + Math.max(.45, MAQ.R * MAQ.s * .6)) { MAQ.grab = { h, a0: ang, r0: MAQ.turn.rotation.y, last: ang, v: 0 }; MAQ.auto = false; MAQ.spinV = 0; try { flap(.02); } catch (e) {} }
        else if (G && G.h === h) {
          if (!pl[h]) { MAQ.spinV = clamp(G.v, -4, 4); MAQ.grab = null; return; }
          const d = wrapA(ang - G.last); G.last = ang; G.v = G.v * .7 + (d / Math.max(dt, 1e-3)) * .3;
          MAQ.turn.rotation.y = G.r0 + wrapA(ang - G.a0) * 1.0 + (G.acc || 0); if (Math.abs(MAQ.turn.rotation.y - G.r0) > .05 && X.press) X.press[h] = null;   /* forgatás után a csippentés elengedése ne kattintson egy lakásra */ if (Math.abs(wrapA(ang - G.a0)) > 2.6) { G.acc = (G.acc || 0) + wrapA(ang - G.a0); G.a0 = ang; }
        }
      });
    } else if (MAQ.grab) MAQ.grab = null;
    if (!MAQ.grab && Math.abs(MAQ.spinV || 0) > .01) { MAQ.turn.rotation.y += MAQ.spinV * dt; MAQ.spinV *= Math.pow(.15, dt); }
    if (MAQ.help && MAQ.help.visible) { MAQ.helpT -= dt; if (MAQ.helpT < 0) { MAQ.help.visible = false; T.xr.extra.delete(MAQ.help); } }
    /* láthatóságok */
    const H = MAQ.H;
    MAQ.H.roof.visible = MAQ.roofOn && MAQ.upper;
    H.lv[1].visible = MAQ.upper;
    H.meshes.forEach((m) => {
      const v = m.userData.vis, lv = m.userData.lv;
      if (v === "tall") m.visible = MAQ.roofOn || life || (lv === 0 && MAQ.upper);
      else if (v === "low") m.visible = !(MAQ.roofOn || life || (lv === 0 && MAQ.upper));
      else if (v === "pT") m.visible = life;
      else if (v === "pL") m.visible = !life;
      else if (v === "life") m.visible = life;
    });
    Object.values(MAQ.apts).forEach((A) => {
      const show = !life && (A.lv === 0 || MAQ.upper);
      const base = A.free === true ? .2 : A.free === false ? .16 : 0, tgt = A.hov || MAQ.sel === A ? .34 : base;
      if (A.free === true) A.gm.color.set("#3fb37f"); else if (A.free === false) A.gm.color.set("#e5262f"); else A.gm.color.copy(A.col);
      A.gm.opacity += (tgt - A.gm.opacity) * Math.min(1, dt * 8); A.glow.visible = show;
      if (A.label && life) A.label.visible = false;
      if (A.lifeL) A.lifeL.visible = life && (A.lv === 0 || MAQ.upper);
    });
    MAQ.tp.forEach((m) => { m.visible = life; });
    MAQ.lampHalo.forEach((P) => { P.visible = life; });
    MAQ.orbs.forEach((o) => { o.visible = life; if (life) o.material.rotation = Math.sin(W.t * 1.5) * .05; });
    if (life) MAQ.orbs.forEach((o, i) => { const k = (o.scale.x > .38 ? .42 : .3) * (1 + Math.sin(W.t * 2.2 + i) * .06); o.scale.set(k, k, 1); });
    if (!T.inVR && !life && !MAQ.drag && MAQ.auto !== false) MAQ.turn.rotation.y += dt * .04;
    orbTick(dt); flyTick(dt);
    /* napszak: az óra simán halad a cél felé */
    if (Math.abs(MAQ.hour - MAQ.hourT) > 1e-3) { MAQ.hour += (MAQ.hourT - MAQ.hour) * Math.min(1, dt * 2.2); if (Math.abs(MAQ.hour - MAQ.hourT) < .004) { MAQ.hour = MAQ.hourT; envSetTime(MAQ.day, MAQ.hour, true); } MAQ.envT = (MAQ.envT || 0) + dt; if (MAQ.envT > .06) { MAQ.envT = 0; envSetTime(MAQ.day, MAQ.hour); } }
    /* nap (árnyékvető fény) a modell fölött */
    const sun = ENV.lights.sun, tg = sun.target; MAQ.holder.getWorldPosition(tg.position);
    if (life) { const hw = headWorld(_q); tg.position.x = hw.x; tg.position.z = hw.z; }   /* életnagyságban az árnyék a környezetünkben a legélesebb */
    tg.updateMatrixWorld(); sun.position.copy(tg.position).addScaledVector(ENV.lights.sunDirW || _q2.set(0, 1, 0), MAQ.shadowD || 4);
    const sig = [MAQ.turn.rotation.y.toFixed(3), MAQ.s.toFixed(5), MAQ.hour.toFixed(3), MAQ.roofOn, MAQ.upper, MAQ.mode, MAQ.table.position.y.toFixed(2), MAQ.holder.position.z.toFixed(3), MAQ.mode === "life" ? Math.round(_q.x * 2) + "," + Math.round(_q.z * 2) : ""].join("|");
    if (sig !== MAQ.shSig) { MAQ.shSig = sig; T.sceneEl.renderer.shadowMap.needsUpdate = true; }
    /* esti fények a házban */
    const ev = ENV.evening || 0; MAQ.H.glass.emissiveIntensity = ev * (life ? .12 : .55); MAQ.H.bulb.emissiveIntensity = ev * 2.4 * (.9 + .1 * Math.sin(W.t * 2)); MAQ.H.lampIn.emissiveIntensity = ev * 1.6;
    if (MAQ.H.sign) MAQ.H.sign.material.emissiveIntensity = ev * .9;
    /* áttűnés */
    if (MAQ.fading) { const F = MAQ.fading; F.t += dt; const hw = headWorld(_q3); MAQ.fade.position.copy(hw);
      const a = F.t < .45 ? F.t / .45 : F.t < .6 ? 1 : Math.max(0, 1 - (F.t - .6) / .7); MAQ.fade.material.opacity = a;
      if (!F.done && F.t >= .5) { F.done = true; try { F.fn(); } catch (e) { console.warn(e); } }
      if (F.t > 1.3) { MAQ.fading = null; MAQ.fade.visible = false; } }
    /* környezet */
    envTick(dt, headWorld(_q3));
    try { bjTick(dt); } catch (e) { if (!MAQ.bjErr) { MAQ.bjErr = 1; console.warn("bója", e); } }
    if (MAQ.card && MAQ.card.visible === false && MAQ.sel == null) {}
  }
  const hhmm = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, "0")}`; };
  function sunLine() { const p = ENV.sunInfo || { az: 0, el: 0 }; return p.el < -.8 ? (p.el < -12 ? "csillagos éjszaka" : "a nap lement – szürkület") : `a nap ${["É", "ÉK", "K", "DK", "D", "DNy", "Ny", "ÉNy"][Math.round(p.az / 45) % 8]} felől, ${Math.round(p.el)}° magasan`; }
  const dayHu = (ymd) => { const [y, m, d] = ymd.split("-").map(Number); return `${["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."][m - 1]} ${d}.`; };
  function wristRedraw() { try { const P = T.xr && T.xr.wristP; if (P && P.m.visible) P.draw(); } catch (e) {} }

  /* ---------- csuklómenü (bal tenyér felfelé) – a makett minden beállítása ---------- */
  /* a csuklóóra menüje – szerteágazó: a tömb harmadik eleme függvény (gomb) vagy újabb lista (almenü) */
  function maqWrist() {
    const life = MAQ.mode === "life", turnA = Math.PI / 4;
    const turn = (a) => { try { T.vrPanel.turn(a); } catch (e) {} };
    const sunMenu = ["☀", "Napszak", [["◂☀", "Fél órával korábban", () => nudgeHour(-.5)], ["☀▸", "Fél órával később", () => nudgeHour(.5)]]
      .concat(PRESETS.map(([n], i) => [["🌅", "🌄", "🌞", "🌤", "🌇", "🌆", "🌃", "🌙"][i], n, () => setPreset(i), MAQ.preset === i]))];
    const turnMenu = ["🧭", "Forgás", [["↺", "Balra 45°", () => turn(turnA)], ["↻", "Jobbra 45°", () => turn(-turnA)], ["⤾", "Megfordulok", () => turn(Math.PI)]]];
    const back = ["‹", "A sétához", () => W.close()];
    const flyM = ["🦸", MAQ.fly ? "Leszállás" : "Repülés", () => toggleFly(), !!MAQ.fly];
    if (life) return [
      ["🏢", "Szintek", [["⬆", "Emelet", () => goLevel(1), MAQ.level === 1], ["⬇", "Földszint", () => goLevel(0), MAQ.level === 0], ["⌂", MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }]]],
      flyM, ["▣", "Vissza a maketthez", () => goTable()], sunMenu,
      ["📅", "Foglalás", () => W.close(() => { try { T.book(null); } catch (e) {} })],
      ["🔭", MAQ.sights ? "Feliratok ki" : "Látnivalók", () => toggleSights()], turnMenu, back];
    return [
      ["🔍", "Méret", [["＋", "Nagyobb", () => stepScale(1)], ["－", "Kisebb", () => stepScale(-1)], ["🚶", "Életnagyság", () => goLife()], ["🧭", "Valódi irány", () => { MAQ.auto = false; MAQ.turn.rotation.y = 0; }]].concat(
        SCALES.slice(0, -1).map((v) => ["▫", SCALE_TXT(v), () => setScale(v, true), Math.abs(MAQ.sT - v) < 1e-4]))],
      ["🏠", "Nézet", [["⌂", MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], ["▤", MAQ.upper ? "Emelet ki" : "Emelet be", () => { MAQ.upper = !MAQ.upper; }], ["🔭", MAQ.sights ? "Feliratok ki" : "Látnivalók", () => toggleSights()]]],
      flyM, ["🚶", "Életnagyság", () => goLife()], sunMenu, turnMenu, ["☰", "Nagy panel", () => W.togglePanel()], back];
  }
  /* ---------- nagy lebegő panel (VR) ---------- */
  function maqPanel(P) {
    const life = MAQ.mode === "life";
    P.title(life ? "A Zephyr ház – életnagyságban" : "A ház makettje · " + SCALE_TXT(MAQ.s), "Zamárdi, a Balaton partján · a hivatalos tervrajz szerint");
    if (life) { P.row(0, "Csippents a földre vagy a padlóra: odalépsz", "#ffffff"); P.row(1, "A fénylő 360° gömbök: a lakás valódi fotói", "#ffd166"); }
    else { P.row(0, "Csippents egy lakásra: belépés vagy foglalás", "#ffffff"); P.row(1, MAQ.dates ? "Zöld = szabad, piros = foglalt a napjaidon" : "Két kézzel csippentve húzd szét: nagyobb lesz", "#ffd166"); }
    P.row(2, `${dayHu(MAQ.day)} ${hhmm(MAQ.hour)} · ${PRESETS[MAQ.preset][0]} – ${sunLine()}`, "#7fd3ff");
    P.row(3, MAQ.fly ? "🦸 Csippents és tartsd: arra repülsz, amerre a kezed mutat · két kézzel gyorsabban" : "🦸 Repülés: körbe, fölé, alá – bárhová (Repülés gomb)", "#c9a24a");
    P.buttons([["◂☀ Korábban", () => nudgeHour(-.5)], ["◐ " + PRESETS[(MAQ.preset + 1) % PRESETS.length][0], () => setPreset(MAQ.preset + 1)], ["Később ☀▸", () => nudgeHour(.5)], [MAQ.sights ? "🔭 Feliratok ki" : "🔭 Látnivalók", () => toggleSights()], [MAQ.fly ? "🛬 Leszállás" : "🦸 Repülés", () => toggleFly(), !!MAQ.fly]], 1);
    if (life) P.buttons([[MAQ.level ? "⬇ Földszint" : "⬆ Emelet", () => goLevel(MAQ.level ? 0 : 1)], [MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], [MAQ.fly ? "🛬 Leszállás" : "🦸 Repülés", () => toggleFly()], ["▣ Makett", () => goTable()], ["‹ Vissza", () => W.close()]]);
    else P.buttons([["＋ Nagyobb", () => stepScale(1)], ["－ Kisebb", () => stepScale(-1)], ["🚶 Életnagyság", () => goLife()], [MAQ.roofOn ? "⌂ Tető le" : "⌂ Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], [MAQ.upper ? "▤ Emelet ki" : "▤ Emelet be", () => { MAQ.upper = !MAQ.upper; }], ["‹ Vissza", () => W.close()]]);
  }
  /* ---------- 2D kezelőfelület ---------- */
  function maqHud(H) {
    const life = MAQ.mode === "life";
    H.title(life ? "A Zephyr ház – életnagyságban" : "A ház makettje · " + SCALE_TXT(MAQ.s), life ? "Koppints a földre: odalépsz · a fénylő 360° gömbök a valódi fotók" : "Húzd az ujjad: körbenézel · két ujjal: közelítés · koppints egy lakásra");
    if (life) H.buttons([[MAQ.fly ? "🛬 Leszállás" : "🦸 Repülés", () => toggleFly(), !!MAQ.fly]].concat(MAQ.fly ? [["⬆ Fel", () => flyStep("up")], ["⇧ Előre", () => flyStep("fwd")], ["⇩ Hátra", () => flyStep("back")], ["◀ Balra", () => flyStep("left")], ["Jobbra ▶", () => flyStep("right")], ["⬇ Le", () => flyStep("down")]] : []).concat([[MAQ.level ? "⬇ Földszint" : "⬆ Emelet", () => goLevel(MAQ.level ? 0 : 1)], [MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], ["▣ Vissza a maketthez", () => goTable()],
      ["◂☀", () => nudgeHour(-.5)], ["◐ " + PRESETS[(MAQ.preset + 1) % PRESETS.length][0], () => setPreset(MAQ.preset + 1)], ["☀▸", () => nudgeHour(.5)], [MAQ.sights ? "🔭 ki" : "🔭 Látnivalók", () => toggleSights()]]));
    else H.buttons([["⬒ Felül", () => orbView("top"), MAQ.view === "top"], ["Elöl", () => orbView("front"), MAQ.view === "front"], ["Hátul", () => orbView("back"), MAQ.view === "back"], ["◧ Bal", () => orbView("left"), MAQ.view === "left"], ["Jobb ◨", () => orbView("right"), MAQ.view === "right"], ["◈ Ferde", () => orbView("iso"), MAQ.view === "iso"],
      ["＋ Közelebb", () => { ORB.dT = clamp(ORB.dT / 1.35, .55, 7); }], ["－ Távolabb", () => { ORB.dT = clamp(ORB.dT * 1.35, .55, 7); }], ["＋ Nagyobb", () => stepScale(1)], ["－ Kisebb", () => stepScale(-1)], ["🚶 Életnagyság", () => goLife()], [MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], [MAQ.upper ? "Emelet ki" : "Emelet be", () => { MAQ.upper = !MAQ.upper; }],
      ["◂☀", () => nudgeHour(-.5)], ["◐ " + PRESETS[(MAQ.preset + 1) % PRESETS.length][0], () => setPreset(MAQ.preset + 1)], ["☀▸", () => nudgeHour(.5)], [MAQ.sights ? "🔭 ki" : "🔭 Látnivalók", () => toggleSights()]]);
    H.hint(`${dayHu(MAQ.day)} ${hhmm(MAQ.hour)} · ${PRESETS[MAQ.preset][0]} · ${sunLine()}${MAQ.dates && !life ? " · zöld = szabad, piros = foglalt" : ""}${MAQ.fly ? " · repülés: W A S D, Q le, E fel" : ""}`);
  }

  /* =================================================================== 3/A. A ZEPHYR HÁZ – részletes modell a hivatalos tervrajz szerint (méterben; a makett ezt kicsinyíti)
     • Külső falak valódi nyílásokkal (ablak, teraszajtó, bejárati ajtó) – életnagyságban belülről is kilátsz a kertre.
     • Belső válaszfalak az alaprajz szobáiból, az ajtóknál nyitva; makettnézetben derékmagasságban metszve („babaház”), életnagyságban teljes magasságban.
     • Padló a helyiség szerint (parketta, csempe, kő), bútorok részletesen (ágy fejtámlával, párnákkal; kanapé díszpárnákkal; konyhapult főzőlappal, mosogatóval…).
     • Kert: utca járdával, kerítés kapuval, előkert, parkoló autókkal, sövény, hátsó kert pergolával és fényfüzérrel, napozóágyak, SUP-tartó, kerékpárok, fák. */
  const HX = {};
  function hmat(key) {
    if (HX[key]) return HX[key];
    const tile = (t, n) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); t.userData = { tile: n }; return t; };
    let m;
    switch (key) {
      case "plaster": m = std({ color: "#f4f1ea", map: tile(txNoise("plaster", "#f2efe8", .07, 6000, 3), 1.6), roughness: .92 }); break;
      case "plasterIn": m = std({ color: "#e6dfd2", map: tile(txNoise("plasterIn", "#f7f5f0", .04, 3000, 3), 1.6), roughness: .95 }); break;
      case "terrace": m = std({ map: tile(txPlanks("terrace", "#8e6644", "#b0825a", 8), 1.6), roughness: .78 }); break;
      case "parquet": m = std({ map: tile(txPlanks("parquet", "#c79b6a", "#e0b886", 10, { gap: .25, gapW: 1 }), 1.4), roughness: .55 }); break;
      case "tiles": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#d9dcdc"; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = `hsl(190,6%,${rr(84, 90)}%)`; g.fillRect(i * 64 + 1, j * 64 + 1, 62, 62); } }), .9), roughness: .25 }); break;
      case "stone": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, "#cfc8bb", .12, 3000, 4); g.strokeStyle = "rgba(90,80,70,.4)"; g.lineWidth = 2; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); g.beginPath(); g.moveTo(i * 128 + (i % 2) * 64, 0); g.lineTo(i * 128 + (i % 2) * 64, h); g.stroke(); } }), 1.2), roughness: .7 }); break;
      case "grass": m = std({ map: tile(txGrass(), 3), roughness: .95 }); break;
      case "asph": m = std({ map: tile(txNoise("asph", "#3c4046", .25, 5000, 3), 4), roughness: .95 }); break;
      case "pave": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, "#b9b2a4", .14, 2000, 4); g.strokeStyle = "rgba(70,64,56,.45)"; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } for (let j = 0; j < 4; j++) for (let i = 0; i <= 2; i++) { const x = i * 128 + (j % 2) * 64; g.beginPath(); g.moveTo(x, j * 64); g.lineTo(x, j * 64 + 64); g.stroke(); } }), 1.2), roughness: .85 }); break;
      case "painting": m = std({ map: canvasTex(256, 168, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#9ec5e0"); gr.addColorStop(.6, "#e8dcc0"); gr.addColorStop(.62, "#3d7fa8"); gr.addColorStop(1, "#1f4f73"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
          [[70, "#f4f1e8", "#c62828"], [170, "#f6f2e6", "#1f5fa8"]].forEach(([x, c1, c2]) => { g.fillStyle = c2; g.beginPath(); g.moveTo(x - 30, 108); g.lineTo(x + 34, 108); g.lineTo(x + 24, 120); g.lineTo(x - 22, 120); g.fill(); g.fillStyle = c1; g.beginPath(); g.moveTo(x, 20); g.lineTo(x + 30, 104); g.lineTo(x, 104); g.fill(); g.beginPath(); g.moveTo(x - 3, 30); g.lineTo(x - 28, 104); g.lineTo(x - 3, 104); g.fill(); }); }), roughness: .6 }); break;
      case "floral": m = std({ map: tile(canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#8a7462"; g.fillRect(0, 0, w, h); for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(245,240,230,${rr(.5, .9)})`; g.beginPath(); g.arc(rand() * w, rand() * h, rr(2, 6), 0, TAU); g.fill(); } g.strokeStyle = "rgba(245,240,230,.6)"; g.lineWidth = 1.5; for (let k = 0; k < 10; k++) { g.beginPath(); g.arc(rand() * w, rand() * h, rr(8, 16), rr(0, 3), rr(3, 6)); g.stroke(); } }), .6), roughness: .9 }); break;
      case "greyTile": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#6f6d69"; g.fillRect(0, 0, w, h); [[0, 0], [0, 128]].forEach(([x, y], i) => { g.fillStyle = `hsl(35,3%,${rr(58, 64)}%)`; g.fillRect(x + 1, y + 1, 254, 126); }); for (let k = 0; k < 1500; k++) { g.fillStyle = `rgba(255,255,255,${rr(0, .05)})`; g.fillRect(rand() * w, rand() * h, 3, 3); } }), 1.2), roughness: .45 }); break;
      case "woodTile": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { for (let j = 0; j < 8; j++) for (let i = 0; i < 2; i++) { g.fillStyle = `hsl(25,${rr(28, 40)}%,${rr(22, 34)}%)`; g.fillRect(i * 128 + (j % 2) * 64, j * 32, 127, 31); } }), .9), roughness: .55 }); break;
      case "hallTile": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#77797a"; g.fillRect(0, 0, w, h); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { g.fillStyle = `hsl(200,3%,${rr(55, 62)}%)`; g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124); } }), 1.2), roughness: .6 }); break;
      case "road": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, "#b7afa1", .16, 5000, 3); g.strokeStyle = "rgba(70,62,52,.35)"; g.lineWidth = 1.2; for (let k = 0; k < 14; k++) { g.beginPath(); let x = rand() * w, y = rand() * h; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += rr(-18, 18); y += rr(-18, 18); g.lineTo(x, y); } g.stroke(); } }), 3), roughness: .95 }); break;
      case "brick": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#8f877c"; g.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) for (let i = -1; i < 4; i++) { const x = i * 64 + (j % 2) * 32, y = j * 32; g.fillStyle = `hsl(30,${rr(6, 14)}%,${rr(58, 70)}%)`; g.fillRect(x + 2, y + 2, 60, 28); } }), .8), roughness: .85 }); break;
      case "grid": m = std({ map: tile(canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#cfcac0"; g.fillRect(0, 0, w, h); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = `hsl(${rr(80, 105)},${rr(30, 45)}%,${rr(28, 40)}%)`; g.beginPath(); g.arc(i * 64 + 32, j * 64 + 32, 19, 0, TAU); g.fill(); } g.strokeStyle = "rgba(90,85,78,.4)"; g.lineWidth = 2; g.strokeRect(1, 1, 254, 254); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke(); }), 1.2), roughness: .9 }); break;
      case "rattan": m = std({ map: tile(canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#6e5236"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 3) { g.fillStyle = `hsl(30,${rr(30, 45)}%,${rr(28, 44)}%)`; g.fillRect(x, 0, 2, h); } }), .3), roughness: .9 }); break;
      case "gravel": m = std({ map: tile(txNoise("gravel", "#a8a196", .35, 9000, 3), 1.5), roughness: 1 }); break;
      case "roof": m = std({ map: tile(txNoise("roof", "#b9bab6", .2, 6000, 3), 2), roughness: .95 }); break;
      case "hedge": m = windify(std({ map: tile(canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#2f5a2a"; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = `hsl(${rr(95, 120)},${rr(35, 55)}%,${rr(16, 38)}%)`; g.beginPath(); g.ellipse(rand() * w, rand() * h, rr(2, 5), rr(1, 3), rand() * 3, 0, TAU); g.fill(); } }), 1), roughness: .95 }), .0012, 1.3, "hedge"); break;
      case "glass": m = std({ color: "#9fc0d0", roughness: .04, metalness: .3, transparent: true, opacity: .32, depthWrite: false, envMapIntensity: 1.6, emissive: new THREE.Color("#ffc878"), emissiveIntensity: 0 }); break;
      case "rail": m = std({ color: "#cfe3ea", roughness: .05, metalness: .2, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }); break;
      case "frame": m = std({ color: "#33373d", roughness: .45, metalness: .5 }); break;
      case "steel": m = std({ color: "#c9cdd2", roughness: .25, metalness: .9 }); break;
      case "chrome": m = std({ color: "#e8ecef", roughness: .1, metalness: 1 }); break;
      case "foliage": m = windify(std({ color: "#ffffff", vertexColors: true, roughness: .92 }), .004, 1.1, "fol"); break;
      case "foliage2": m = windify(std({ color: "#ffffff", vertexColors: true, roughness: .92 }), .005, 1.2, "fol2"); break;
      case "bulb": m = std({ color: "#fff2c8", emissive: new THREE.Color("#ffcf7a"), emissiveIntensity: 0, roughness: .4 }); break;
      case "lampIn": m = std({ color: "#fff8e8", emissive: new THREE.Color("#ffd9a0"), emissiveIntensity: 0, roughness: .5 }); break;
      case "vc": m = std({ vertexColors: true, roughness: .75 }); break;
      case "vcm": m = std({ vertexColors: true, roughness: .3, metalness: .6 }); break;
      default: m = std({ color: key.split("|")[0], roughness: key.includes("|m") ? .3 : .75, metalness: key.includes("|m") ? .6 : 0, flatShading: key.includes("|f") });
    }
    /* belső felületek: kevesebb környezeti fény (különben életnagyságban kifehérednek a szobák) */
    if (/plasterIn|parquet|tiles|stone|vc$/.test(key)) m.envMapIntensity = .35;
    return HX[key] = m;
  }
  /* UV a világkoordinátából (méterben, a domináns normál szerint) – így a textúrák minden dobozon egyforma léptékűek */
  function worldUV(g, tile) {
    const p = g.attributes.position, n = g.attributes.normal; if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile); else if (ax >= az) uv.setXY(i, p.getZ(i) / tile, p.getY(i) / tile); else uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile); }
  }

  function buildHouse(model) {
    const H = { lv: [new THREE.Group(), new THREE.Group()], meshes: [], apts: {}, spots: [], floors: [] };
    H.lv.forEach((g, i) => { g.position.y = i * FLOOR_H; model.add(g); });
    H.roof = new THREE.Group(); model.add(H.roof);
    const reg = {};
    /* add(anyag, geometria, mátrix, szint (-1 = telek), láthatóság) – a láthatóság: all | tall | low | pT | pL | life | roof */
    /* a sima színű elemek (#rrggbb) egyetlen csúcsszínes anyagba kerülnek (fém: „|m”) – így a ház ~60 rajzolási hívás, nem 200 */
    const add = (mk, g, m, lv, vis) => {
      if (mk[0] === "#") { const metal = mk.includes("|m"), c = new THREE.Color(mk.split("|")[0]), n = g.attributes.position.count, a = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute("color", new THREE.BufferAttribute(a, 3)); mk = metal ? "vcm" : "vc"; }
      const k = mk + "~" + (lv == null ? -1 : lv) + "~" + (vis || "all"); (reg[k] = reg[k] || { mk, lv: lv == null ? -1 : lv, vis: vis || "all", list: [] }).list.push([g, m || new THREE.Matrix4()]); };
    const box = (mk, x0, y0, z0, x1, y1, z1, lv, vis) => add(mk, new THREE.BoxGeometry(Math.max(.005, x1 - x0), Math.max(.005, y1 - y0), Math.max(.005, z1 - z0)), M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), lv, vis);
    const cyl = (mk, x, y0, z, r, h, lv, vis, seg, r2) => add(mk, new THREE.CylinderGeometry(r, r2 == null ? r : r2, h, seg || 12), M4(x, y0 + h / 2, z), lv, vis);
    const ball = (mk, x, y, z, r, lv, vis, sx, sy, sz) => add(mk, new THREE.IcosahedronGeometry(r, 1), M4(x, y, z, 0, 0, 0, sx || 1, sy || 1, sz || 1), lv, vis);
    H.add = add; H.box = box;

    /* ------------------------------------------------ a telek: utca, járda, kerítés, előkert, parkoló, kert */
    const SX0 = -3, SX1 = 13.5, SZ0 = -10, SZ1 = 44;   /* nov. 9.: a hátsó parkoló 4 keresztben álló autónak mélyebb lett */ H.site = { SX0, SX1, SZ0, SZ1 };
    /* utca (a valódi fotók szerint): világos, kopott aszfalt felfestés nélkül, előtte fehér zúzottkő sáv */
    box("road", SX0, 0, -9.2, SX1, .05, -4.4);
    box("gravel", SX0, 0, -4.4, SX1, .07, -2.7);
    box("#8d9583", SX0, -.06, -2.7, SX1, -.005, SZ1);   /* telek alap (a ház padlója alatt) */
    box("brick", 6.3, 0, -4.4, 12.6, .08, -2.7);          /* térkő a kapu előtt */
    box("grass", -.4, .04, -2.5, 6.3, .07, -.05);
    /* utcai kerítés: alacsony lábazat, sötét fém pálcák; a parkoló előtt toló kapu, mellette kiskapu; postaláda, házszám */
    const bars = (x0, x1, z, h, gap) => { box("#8d8a84", x0, 0, z - .1, x1, .32, z + .1); for (let x = x0 + .05; x < x1 - .02; x += gap) box("frame", x, .32, z - .015, x + .025, .32 + h, z + .015); box("frame", x0, .32 + h, z - .025, x1, .36 + h, z + .025); box("frame", x0, .5, z - .02, x1, .53, z + .02); };
    bars(-.4, 6.1, -2.6, 1.2, .12);
    box("frame", 6.1, 0, -2.7, 6.3, 1.7, -2.5); box("frame", 12.6, 0, -2.7, 12.8, 1.7, -2.5);
    for (let x = 6.4; x < 12.5; x += .13) box("frame", x, .08, -2.63, x + .03, 1.5, -2.57);   /* toló kapu */
    box("frame", 6.35, 1.48, -2.65, 12.55, 1.55, -2.55); box("frame", 6.35, .08, -2.65, 12.55, .15, -2.55);
    box("#3a3f45|m", 5.5, .9, -2.72, 5.85, 1.2, -2.62);                                            /* postaláda */
    /* előkert: cserjék, virágok */
    [[.3, -1.8], [5.4, -1.9], [-.1, -.7]].forEach(([x, z]) => add("foliage", leafGeom([[x, .45, z, .5, 7, .9]], "#5f9a3a", .1)));
    flowers(add, -.3, -2.3, 1.2, -1.2, 40); flowers(add, 3, -2.3, 5.2, -1.5, 50);
    /* BEHAJTÓ ÉS HÁTSÓ PARKOLÓ (2026. nov. 6., a hátsó parkoló és a kert 360°-os fotói szerint átrendezve):
       • a ház keleti oldala mellett és a keleti sövény mentén végig térkövezett behajtó (téglalap alakú térkő) – a kertig fut;
       • a ház mögött (a zárt terasz és a hátsó L-lépcső mögött) gyephézagos, lyukas betonelemes parkoló 4 autónak:
         az autók keresztben állnak, orral nyugatra (a kertből oldalról látszanak), az első a lépcső mellett – mint a fotón a fehér terepjáró;
       • a parkoló nyugati szélén zöld belátásgátló kerítés, mögötte a Schooner kis kertje;
       • a kert nyugati felén a nádfonatos kerti konyha pavilonnal, előtte betonozott pihenőn a kő tűzrakóasztal (grillező) kőpadokkal,
         mellette két napozószék és a kerti zuhany; középen és keleten egy-egy pavilon asztallal, székekkel; a keleti sövénynél kerti csap és kuka. */
    const PZ0 = Z_END + 3.3, PZ1 = PZ0 + 10.4, PX0 = 1.1, PX1 = 10.4;
    box("brick", 6.3, .04, -2.7, 12.6, .065, PZ0);          /* behajtó a ház mellett */
    box("brick", PX1, .04, PZ0, 12.6, .065, PZ1 + 4.2);     /* behajtó a keleti sövény mentén, a kertig */
    box("grid", PX0, .04, PZ0, PX1, .062, PZ1);             /* gyephézagos parkoló */
    box("#9aa0a6", PX0 - .05, .04, PZ1 - .05, PX1, .075, PZ1 + .05); box("#9aa0a6", PX1 - .05, .04, PZ0, PX1 + .05, .075, PZ1 + 4.2);   /* szegélykő */
    /* 2026. nov. 9. (tulajdonos, a parkoló 360°-os fotója szerint): NÉGY autó EGYMÁS MELLETT, mindegyik úgy, mint a fotón a fehér terepjáró –
       keresztben, orral nyugatra (a zöld kerítés felé); az első, a fehér, a zárt terasz és a lépcső mellett, a többi mellette a kert felé. */
    { const slot = 2.6; ["#eef0f2", "#4a5058", "#8a1f24", "#1f3a6a"].forEach((c, k) => car(add, c, PX0 + .45 + 2.15, PZ0 + .2 + slot * (k + .5), Math.PI / 2));
      for (let k = 0; k <= 4; k++) box("#e9ecef", PX0 + .25, .062, PZ0 + .2 + slot * k - .03, PX0 + 5.3, .066, PZ0 + .2 + slot * k + .03); }   /* parkolóhely-jelölés */
    box("hedge", 12.6, .04, -2.7, 13.0, 1.75, SZ1);
    /* zöld belátásgátló kerítés a parkoló nyugati szélén és a Schooner-kert déli szélén */
    box("#4f6f5c", PX0 - .06, .04, PZ0, PX0, 1.75, PZ1); box("#4f6f5c", -.4, .04, PZ1 - .06, PX0, 1.75, PZ1);
    for (let z = PZ0 + .5; z < PZ1; z += 1.25) box("frame", PX0 - .09, .04, z, PX0 - .03, 1.8, z + .05);
    /* gyep: a Schooner kis kertje és a hátsó kert (műfű) */
    box("grass", -.4, .04, PZ0, PX0 - .06, .07, PZ1 - .06); box("grass", -.4, .04, PZ1, PX1, .07, SZ1);
    for (let z = 23; z < SZ1 - .5; z += 1.15) add("foliage", leafGeom([[-.9, 1.6, z, .55, 6, 3.2]], "#2f5a2c", .1));
    box("hedge", -.6, .04, SZ1 - .25, 12.9, 1.6, SZ1);
    /* betonozott pihenő a kerti konyha és a tűzrakó körül */
    box("#bdb7ad", -.3, .04, PZ1 + .4, 5.2, .1, PZ1 + 5.0);
    /* fehér kerti pavilonok (gazebo): a kerti konyha fölött és két ülőhely */
    const gazebo = (cx, cz, w) => { const h = w / 2; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { box("#c9cdd2|m", cx + a * h - .03, .1, cz + b * h - .03, cx + a * h + .03, 2.2, cz + b * h + .03); for (let y = .5; y < 2.1; y += .4) box("#c9cdd2|m", cx + a * h - .04, y, cz + b * h - .04, cx + a * h + .04, y + .03, cz + b * h + .04); });
      add("#f4f3ee", new THREE.ConeGeometry(w * .74, .75, 4, 1, true), M4(cx, 2.55, cz, Math.PI / 4)); add("#e9e7df", new THREE.ConeGeometry(w * .73, .74, 4, 1, true), M4(cx, 2.54, cz, Math.PI / 4));
      [[0, -h], [0, h]].forEach(([dx, dz]) => box("#f4f3ee", cx - h, 2.0, cz + dz - .01, cx + h, 2.2, cz + dz + .01)); [[-h, 0], [h, 0]].forEach(([dx]) => box("#f4f3ee", cx + dx - .01, 2.0, cz - h, cx + dx + .01, 2.2, cz + h)); };
    const tableSet = (cx, cz) => { box("#9aa0a6", cx - .45, .74, cz - .45, cx + .45, .78, cz + .45); box("#2b2f36|m", cx - .03, .1, cz - .03, cx + .03, .74, cz + .03);
      [[0, -.75, 0], [0, .75, Math.PI], [-.75, 0, Math.PI / 2], [.75, 0, -Math.PI / 2]].forEach(([dx, dz, r]) => chair(add, cx + dx, cz + dz, r, -1, "#2b2f36", .07)); };
    const KX = 2.2, KZ = PZ1 + 3.6;   /* a kerti konyha pavilonja */
    gazebo(KX, KZ, 3); gazebo(6.6, PZ1 + 2.6, 2.8); gazebo(9.0, PZ1 + 6.2, 2.8);
    tableSet(6.6, PZ1 + 2.6); tableSet(9.0, PZ1 + 6.2);
    /* kerti konyha: nádfonatos pult, világos munkalap, mosogató, mellette a kerti hűtő */
    box("rattan", KX - 1.3, .1, KZ + .3, KX + 1.3, 1.0, KZ + .9); box("#d9d4c8", KX - 1.35, 1.0, KZ + .25, KX + 1.35, 1.05, KZ + .95); box("steel", KX + .3, 1.05, KZ + .4, KX + .8, 1.06, KZ + .8);
    box("#2b2f36|m", KX - 1.75, .1, KZ + .35, KX - 1.4, 1.5, KZ + .85);
    /* a grillező: kő tűzrakóasztal (középen fémtálca), három oldalán kőpad – a konyha előtt, a pihenő közepén */
    const GX = 3.4, GZ = PZ1 + 1.7;
    box("#d2cdc1", GX - .55, .1, GZ - .4, GX + .55, .5, GZ + .4); box("#cfcabe", GX - .7, .5, GZ - .5, GX + .7, .58, GZ + .5); box("#3a3a3a", GX - .3, .58, GZ - .22, GX + .3, .6, GZ + .22);
    box("#555", GX - .26, .6, GZ - .18, GX + .26, .66, GZ + .18);   /* tálca, rács */
    for (let k = -2; k <= 2; k++) box("#222", GX + k * .1 - .01, .66, GZ - .18, GX + k * .1 + .01, .67, GZ + .18);
    [[GX, GZ - 1.05, 1.5, .34], [GX, GZ + 1.05, 1.5, .34], [GX + 1.15, GZ, .34, 1.2]].forEach(([x, z, w, d]) => { box("#cfcabe", x - w / 2, .1, z - d / 2, x + w / 2, .4, z + d / 2); box("#bdb8ac", x - w / 2 + .1, .1, z - d / 2 + .06, x - w / 2 + .22, .38, z + d / 2 - .06); box("#bdb8ac", x + w / 2 - .22, .1, z - d / 2 + .06, x + w / 2 - .1, .38, z + d / 2 - .06); });
    /* napozószékek (sötét, kartámás) a pihenő nyugati szélén, kerti zuhany a kerítésnél */
    [[.6, GZ - .6], [.6, GZ + .5]].forEach(([x, z]) => { add("#2b2f36", new THREE.BoxGeometry(1.1, .04, .6), M4(x, .5, z, Math.PI / 2, 0, -.3)); add("#2b2f36", new THREE.BoxGeometry(.6, .04, .62), M4(x - .72, .78, z, Math.PI / 2, 0, -1.0));
      [[-.28], [.28]].forEach(([dz]) => add("#1c1f24|m", new THREE.BoxGeometry(1.4, .6, .03), M4(x - .1, .42, z + dz, 0, 0, .4))); });
    cyl("frame", -.15, .04, PZ1 + 1.0, .04, 2.1, -1); box("frame", -.2, 2.1, PZ1 + .95, .25, 2.14, PZ1 + 1.05); cyl("steel", .22, 1.95, PZ1 + 1.0, .1, .04, -1); box("#7a5a3a", -.4, .04, PZ1 + .6, .4, .1, PZ1 + 1.4);
    /* kerékpárok a konyha mögött, SUP-tartó és tároló (hűtő, kompresszor) a kert hátsó részén */
    for (let k = 0; k < 4; k++) bike(add, 4.2 + k * .55, KZ + 1.9, ["#2b2f36", "#c62828", "#1f5fa8", "#e9ecef"][k]);
    box("#7a5a3a", 6.6, .04, SZ1 - 2.6, 6.7, 1.3, SZ1 - 2.4); box("#7a5a3a", 6.6, .04, SZ1 - 1.2, 6.7, 1.3, SZ1 - 1.0);
    for (let k = 0; k < 4; k++) add(["#ffd166", "#1f5fa8", "#e5262f", "#3fb37f"][k], new THREE.BoxGeometry(.7, .1, 1.5), M4(6.95 + k * .02, .45 + k * .26, SZ1 - 1.8));
    box("#8c939b", 1.0, .04, SZ1 - 2.5, 3.2, 2.1, SZ1 - .5); box("#6d737a", .9, 2.1, SZ1 - 2.6, 3.3, 2.18, SZ1 - .4); box("#5a3d24", 1.7, .04, SZ1 - 2.52, 2.3, 1.9, SZ1 - 2.5);
    /* kerti csap a keleti sövénynél, kuka a behajtó végén */
    box("#c9c2b2", 10.2, .04, PZ1 + 7.6, 10.4, 1.0, PZ1 + 8.0); cyl("steel", 10.15, .75, PZ1 + 7.8, .03, .12, -1);
    box("#2b2f36", 12.0, .065, PZ1 + 1.0, 12.5, 1.05, PZ1 + 1.5); box("#f2c94c", 12.0, 1.05, PZ1 + 1.0, 12.5, 1.1, PZ1 + 1.5);
    /* fák a kertben */
    [[6.0, 38.6, 2.0], [10.6, 38.8, 1.4], [11.8, 24.0, 1.3], [-1.6, -6.1, 1.4], [11.2, -3.4, 1.3]].forEach(([x, z, r]) => tree(add, x, z, r));
    flowers(add, -.2, PZ0 + .3, .9, PZ1 - .4, 50); flowers(add, 4.8, 39.0, 8.6, 39.6, 60);
    /* kerti lámpák (bollardok) a parkoló és a gyep határán */
    for (let x = 1.6; x < PX1; x += 3) { cyl("frame", x, .04, PZ1 + .25, .06, .7, -1); cyl("bulb", x, .7, PZ1 + .25, .07, .1, -1); }
    garland(add, [[KX - 1.5, 2.15, KZ - 1.5], [6.6 + 1.4, 2.15, PZ1 + 1.2], [9.0 + 1.4, 2.2, PZ1 + 4.8], [9.0 - 1.4, 2.2, PZ1 + 7.6]], .25, -1, "all");   /* fényfüzér a pavilonok között */

    /* ------------------------------------------------ az épület */
    const Y1 = FLOOR_H;
    /* födémek (alul vakolt mennyezet) */
    /* a középső lépcsőház két szint magas (a fotók szerint): az emeleti födémben a lépcső fölött és mellette nagy nyílás van */
    const VOID = [WALL, Z_HALL + 1.2, WALL + 1.14, Z_B - PART];   /* 2026-11-11 (tulajdonos: „az emeleti terasz egy része hiányzik a lépcsőháznál, a Kalóz bejárata sincs ott”): a nyílás csak a lépcső fölött van (1,1 m széles sáv a nyugati falnál), mellette végig járófelület a Kalóz ajtajáig; korlát a lépcső mellett. Eredeti x1: 3.4 */ //   /* x0, z0, x1, z1 – a légtér az emeleten */
    box("plasterIn", 0, -.2, 0, OUT_W, 0, Z_END, 0);
    box("plasterIn", 0, -.2, 0, OUT_W, 0, VOID[1], 1); box("plasterIn", 0, -.2, VOID[3], OUT_W, 0, Z_END, 1); box("plasterIn", VOID[2], -.2, VOID[1], OUT_W, 0, VOID[3], 1); box("plasterIn", 0, -.2, VOID[1], WALL, 0, VOID[3], 1);
    /* nyílások a külső falakon: az alaprajzok ablakaiból és ajtóiból */
    const open = { W: [[], []], E: [[], []], N: [[], []], S: [[], []] };   /* N = utcai homlokzat (z = 0), S = hátsó (z = Z_END) */
    Object.keys(UNITS).forEach((id) => {
      const U = UNITS[id], Pl = planOf(id);
      (Pl.furn || []).forEach((f) => {
        if (f[0] !== "window" && f[0] !== "door") return;
        const q = mapRect(U, f[1], f[2], f[3], f[4]), cx = (q[0] + q[2]) / 2, cz = (q[1] + q[3]) / 2, lab = String(f[5] || "");
        const door = f[0] === "door", y0 = door ? 0 : .9, y1 = door ? 2.15 : 2.15, kind = door ? (/bejárati/.test(lab) ? "entry" : "glass") : "win";
        if (cx < WALL + .35) open.W[U.lvl].push({ a: q[1], b: q[3], y0, y1, kind });
        else if (cx > OUT_W - WALL - .35) open.E[U.lvl].push({ a: q[1], b: q[3], y0, y1, kind });
        else if (cz < WALL + .4) open.N[U.lvl].push({ a: q[0], b: q[2], y0, y1, kind });
        else if (cz > Z_END - WALL - .4) open.S[U.lvl].push({ a: q[0], b: q[2], y0, y1, kind });
      });
    });
    /* a fedett bejáró felőli ajtók (a Dingi/Kalóz és a lépcsőház) – a középső szakasz nyitott oldalain nincs külső fal */
    const wallRun = (lv, side, from, to, Hh, vis, list) => {
      /* a falat a nyílások köré rakjuk össze: alatta (parapet), fölötte (szemöldök), köztük teljes magasság */
      const ops = list.filter((o) => o.b > from && o.a < to).map((o) => Object.assign({}, o, { a: Math.max(from, o.a), b: Math.min(to, o.b) })).sort((p, q) => p.a - q.a);
      const seg = (a, b, y0, y1) => { if (b - a < .01 || y1 - y0 < .01) return;
        if (side === "W") box("plaster", 0, y0, a, WALL, y1, b, lv, vis); else if (side === "E") box("plaster", OUT_W - WALL, y0, a, OUT_W, y1, b, lv, vis);
        else if (side === "N") box("plaster", a, y0, 0, b, y1, WALL, lv, vis); else box("plaster", a, y0, Z_END - WALL, b, y1, Z_END, lv, vis); };
      let cur = from;
      ops.forEach((o) => { seg(cur, o.a, 0, Hh); seg(o.a, o.b, 0, Math.min(o.y0, Hh)); if (o.y1 < Hh) seg(o.a, o.b, o.y1, Hh); cur = Math.max(cur, o.b);
        /* üveg, keret, könyöklő */
        const top = Math.min(o.y1, Hh); if (o.y0 >= top) return;
        const pane = (a, b, y0, y1, mk) => { const t = mk === "glass" ? .02 : .05;
          if (side === "W") box(mk, WALL / 2 - t / 2, y0, a, WALL / 2 + t / 2, y1, b, lv, vis); else if (side === "E") box(mk, OUT_W - WALL / 2 - t / 2, y0, a, OUT_W - WALL / 2 + t / 2, y1, b, lv, vis);
          else if (side === "N") box(mk, a, y0, WALL / 2 - t / 2, b, y1, WALL / 2 + t / 2, lv, vis); else box(mk, a, y0, Z_END - WALL / 2 - t / 2, b, y1, Z_END - WALL / 2 + t / 2, lv, vis); };
        if (o.kind === "entry") { pane(o.a + .04, o.b - .04, o.y0, top - .02, "#5b4a3c"); pane(o.a, o.a + .05, o.y0, top, "frame"); pane(o.b - .05, o.b, o.y0, top, "frame"); return; }
        pane(o.a + .05, o.b - .05, o.y0 + .05, top - .05, "glass");
        pane(o.a, o.a + .06, o.y0, top, "frame"); pane(o.b - .06, o.b, o.y0, top, "frame"); pane(o.a, o.b, top - .06, top, "frame"); pane(o.a, o.b, o.y0, o.y0 + .06, "frame");
        if (o.b - o.a > 1.0) pane((o.a + o.b) / 2 - .03, (o.a + o.b) / 2 + .03, o.y0, top, "frame");
        /* függöny két oldalt és karnis (csak a teljes magasságú falnál) */
        if (vis === "tall") {
          const inn = (a, b, y0, y1, d, mk) => { if (side === "W") box(mk, WALL + .02, y0, a, WALL + .02 + d, y1, b, lv, vis); else if (side === "E") box(mk, OUT_W - WALL - .02 - d, y0, a, OUT_W - WALL - .02, y1, b, lv, vis);
            else if (side === "N") box(mk, a, y0, WALL + .02, b, y1, WALL + .02 + d, lv, vis); else box(mk, a, y0, Z_END - WALL - .02 - d, b, y1, Z_END - WALL - .02, lv, vis); };
          inn(o.a - .3, o.b + .3, 2.38, 2.41, .03, "#8a8f96|m");
          for (let k = 0; k < 3; k++) { const f = k * .1; inn(o.a - .28 + f, o.a - .2 + f, .05, 2.36, .05 + (k % 2) * .03, "#ebe2cf"); inn(o.b + .2 - f - .08 + .08 - .08, o.b + .28 - f, .05, 2.36, .05 + (k % 2) * .03, "#ebe2cf"); }
        }
        if (o.kind === "win") { const sx = .06; if (side === "W") box("#d9d4c8", -sx, o.y0 - .05, o.a - .03, WALL, o.y0, o.b + .03, lv, vis); else if (side === "E") box("#d9d4c8", OUT_W - WALL, o.y0 - .05, o.a - .03, OUT_W + sx, o.y0, o.b + .03, lv, vis);
          else if (side === "N") box("#d9d4c8", o.a - .03, o.y0 - .05, -sx, o.b + .03, o.y0, WALL, lv, vis); else box("#d9d4c8", o.a - .03, o.y0 - .05, Z_END - WALL, o.b + .03, o.y0, Z_END + sx, lv, vis); }
      });
      seg(cur, to, 0, Hh);
    };
    [0, 1].forEach((lv) => [["tall", FLOOR_H - .2], ["low", 1.05]].forEach(([vis, Hh]) => {
      wallRun(lv, "N", 0, OUT_W, Hh, vis, open.N[lv]); wallRun(lv, "S", 0, OUT_W, Hh, vis, open.S[lv]);
      /* oldalfalak: a fedett bejáró szakaszán (Z_HALL…Z_B) a földszinten nyitott (kapualj), az emeleten a folyosó */
      [["W", open.W[lv]], ["E", open.E[lv]]].forEach(([s, L]) => {
        if (lv === 0) { wallRun(lv, s, 0, Z_HALL, Hh, vis, L); wallRun(lv, s, Z_B - PART, Z_END, Hh, vis, L); if (s === "W") box("#e2dccf", -.05, 0, Z_HALL, WALL, Hh, Z_B - PART, lv, vis); }   /* a lépcsőháznál a szomszéd fala látszik (ott nincs külön Zephyr-fal) */
        else if (s === "E") { wallRun(lv, s, 0, Z_HALL, Hh, vis, L); wallRun(lv, s, Z_B - PART, Z_END, Hh, vis, L); }   /* emeleten a Kalóz terasza keletre nyitott (üvegkorlát) */
        else wallRun(lv, s, 0, Z_END, Hh, vis, L);
      });
    }));
    /* lakáselválasztó falak (teljes szélesség) – a bejárati ajtóknál nyitva */
    const doorsAll = [[], []];
    Object.keys(UNITS).forEach((id) => { const U = UNITS[id]; (planOf(id).furn || []).forEach((f) => { if (f[0] === "door") doorsAll[U.lvl].push(mapRect(U, f[1], f[2], f[3], f[4])); }); });
    const partRun = (lv, mk, axis, c, from, to, th, Hh, vis, doors) => {
      /* axis "x": a fal x mentén fut (z = c); "z": z mentén (x = c) */
      const gaps = doors.filter((d) => axis === "x" ? (d[1] < c + .3 && d[3] > c - .3 && d[2] > from && d[0] < to && (d[2] - d[0]) > .3) : (d[0] < c + .3 && d[2] > c - .3 && d[3] > from && d[1] < to && (d[3] - d[1]) > .3))
        .map((d) => axis === "x" ? [Math.max(from, d[0]), Math.min(to, d[2])] : [Math.max(from, d[1]), Math.min(to, d[3])]).sort((p, q) => p[0] - q[0]);
      const seg = (a, b, y0, y1) => { if (b - a < .02 || y1 <= y0) return; if (axis === "x") box(mk, a, y0, c - th / 2, b, y1, c + th / 2, lv, vis); else box(mk, c - th / 2, y0, a, c + th / 2, y1, b, lv, vis); };
      let cur = from; gaps.forEach(([a, b]) => { seg(cur, a, 0, Hh); if (Hh > 2.15) seg(a, b, 2.15, Hh); cur = Math.max(cur, b); }); seg(cur, to, 0, Hh);
    };
    [0, 1].forEach((lv) => [["pT", FLOOR_H - .2], ["pL", .95]].forEach(([vis, Hh]) => {
      [Z_HALL - PART, Z_B - PART, Z_C - PART].forEach((z) => partRun(lv, "plasterIn", "x", z + PART / 2, WALL, OUT_W - WALL, PART, Hh, vis, doorsAll[lv]));
    }));
    /* BEJÁRATI AJTÓK (2026. nov. 9., tulajdonos: „hiányzik a Fregatt apartman bejárata”): minden lakás bejárati ajtaja valódi, zárt
       ajtólap tok-kerettel, sárgaréz kilinccsel és a lakás számával/nevével – az emeleti galériáról így látszik a Fregatt ajtaja is */
    Object.keys(UNITS).forEach((id) => { const U = UNITS[id], g2 = T.GROUPS.find((q) => q.id === id) || {};
      (planOf(id).furn || []).forEach((f) => { if (f[0] !== "door" || !/bejárat/.test(String(f[5] || ""))) return;
        const q = mapRect(U, f[1], f[2], f[3], f[4]), alongX = (q[2] - q[0]) >= (q[3] - q[1]);
        /* a legközelebbi falsík (lakáselválasztó / külső fal) */
        const walls = alongX ? [Z_HALL - PART / 2, Z_B - PART / 2, Z_C - PART / 2, WALL / 2, Z_END - WALL / 2] : [WALL / 2, OUT_W - WALL / 2];
        const c0 = alongX ? (q[1] + q[3]) / 2 : (q[0] + q[2]) / 2, c = walls.reduce((b, w) => Math.abs(w - c0) < Math.abs(b - c0) ? w : b, walls[0]);
        if (Math.abs(c - c0) > .45) return;
        const a0 = alongX ? q[0] : q[1], a1 = alongX ? q[2] : q[3], t = .05, lv = U.lvl;
        const B = (mk, u0, y0, u1, y1, d0, d1) => alongX ? box(mk, u0, y0, c + d0, u1, y1, c + d1, lv) : box(mk, c + d0, y0, u0, c + d1, y1, u1, lv);
        B("#4a3a2e", a0 + .02, 0, a1 - .02, 2.12, -t, t);   /* ajtólap */
        B("frame", a0 - .06, 0, a0 + .02, 2.2, -.09, .09); B("frame", a1 - .02, 0, a1 + .06, 2.2, -.09, .09); B("frame", a0 - .06, 2.12, a1 + .06, 2.2, -.09, .09);
        [-1, 1].forEach((sd) => { B("#c9a24a|m", a1 - .14, 1.0, a1 - .1, 1.04, sd * t, sd * (t + .07)); B("#2a2116", a0 + .12, .2, a1 - .12, .22, sd * t, sd * (t + .005)); B("#2a2116", a0 + .12, 1.9, a1 - .12, 1.92, sd * t, sd * (t + .005)); });
        if (g2.no) { const sx = (a0 + a1) / 2; [-1, 1].forEach((sd) => B(id === "fregatt" ? "#c9a24a|m" : "#c9a24a|m", sx - .13, 1.55, sx + .13, 1.75, sd * t, sd * (t + .012))); }
      }); });
    /* lakások: padló, belső válaszfalak, bútorok, mennyezeti lámpák, sétapontok (valódi 360°-os fotók) */
    Object.keys(UNITS).forEach((id) => {
      const U = UNITS[id], Pl = planOf(id), lv = U.lvl; let bb = [1e9, 1e9, -1e9, -1e9];
      const doors = (Pl.furn || []).filter((f) => f[0] === "door").map((f) => mapRect(U, f[1], f[2], f[3], f[4]));
      (Pl.rooms || []).forEach((r) => {
        const q = mapRect(U, r[1], r[2], r[3], r[4]); q[0] = Math.max(WALL, q[0]); q[2] = Math.min(OUT_W - WALL, q[2]);
        bb = [Math.min(bb[0], q[0]), Math.min(bb[1], q[1]), Math.max(bb[2], q[2]), Math.max(bb[3], q[3])];
        /* padló a fotók szerint: nappali, háló, előtér nagy szürke lapok; fürdő fahatású burkolat */
        const fm = /fürd|wc/i.test(r[0]) ? "woodTile" : "greyTile";
        box(fm, q[0], 0, q[1], q[2], .025, q[3], lv);
        H.floors.push({ lv, q, id });
        const inside = (v, a, b) => v > a + .05 && v < b - .05;
        [["pT", FLOOR_H - .2], ["pL", .95]].forEach(([vis, Hh]) => {
          if (inside(q[0], WALL, OUT_W - WALL)) partRun(lv, "plasterIn", "z", q[0], q[1], q[3], .1, Hh, vis, doors);
          if (inside(q[2], WALL, OUT_W - WALL)) partRun(lv, "plasterIn", "z", q[2], q[1], q[3], .1, Hh, vis, doors);
          /* a külső falak és a lakáselválasztó falak mentén nem kell külön válaszfal (különben eltakarná az ablakokat) */
          const onWall = (z) => z <= WALL + .08 || z >= Z_END - WALL - .08 || [Z_HALL - PART, Z_HALL, Z_B - PART, Z_B, Z_C - PART, Z_C].some((w) => Math.abs(z - w) < .1);
          if (!onWall(q[1])) partRun(lv, "plasterIn", "x", q[1], q[0], q[2], .1, Hh, vis, doors);
          if (!onWall(q[3])) partRun(lv, "plasterIn", "x", q[3], q[0], q[2], .1, Hh, vis, doors);
        });
        /* mennyezeti lámpa (életnagyságban), szőnyeg a nappaliban/hálóban */
        const cx = (q[0] + q[2]) / 2, cz = (q[1] + q[3]) / 2;
        cyl("lampIn", cx, FLOOR_H - .26, cz, .2, .05, lv, "life", 20); cyl("#d8d2c6", cx, FLOOR_H - .23, cz, .03, .03, lv, "life");
        if (/nappali|háló|szoba/i.test(r[0]) && (q[2] - q[0]) > 1.8 && (q[3] - q[1]) > 1.8) box(["#b9a58a", "#9aa7b4", "#c7b08e", "#a3998d"][(r[1] * 7 + r[2] * 3 | 0) % 4], cx - .9, .025, cz - .65, cx + .9, .035, cz + .65, lv);
      });
      furnishDetailed(add, lv, U, Pl, id);
      const g = T.GROUPS.find((q) => q.id === id) || {};
      H.apts[id] = { id, lv, bb, name: g.name || id, no: g.no, lock: !!g.lock, area: (Pl.rooms || []).reduce((s, r) => s + r[3] * r[4], 0) };
      /* 360°-os fotópontok: a séta jelenetei, amelyek ebben a lakásban vannak */
      Object.keys(T.SCENES || {}).forEach((sid) => { const S = T.SCENES[sid]; if (!S || S.g !== id || !S.m) return; const p = U.map(S.m[0], S.m[1]); if (p[0] < WALL || p[0] > OUT_W - WALL) return; H.spots.push({ id: sid, apt: id, lv, x: p[0], z: p[1], n: S.n }); });
    });
    /* fedett bejáró a lépcsővel (földszint), emeleti folyosó/terasz */
    box("hallTile", WALL, 0, Z_HALL, OUT_W - WALL, .03, Z_B - PART, 0);   /* nagy szürke lapok (a fotó szerint) */
    /* a lépcső a fotók szerint: a nyugati (szomszéd felőli) falra szerelt, szürke fém lépcső nyitott fokokkal. Lent a Dingi teraszánál (déli vég) indul,
       északra emelkedik, és a mentőmellény-tartó FÖLÖTT ér fel az emeleti acél galériára – onnan nyílik a Kalóz terasza (és a Fregatt bejárata). */
    { const n = 14, zt = Z_B - PART - .05, dz = .2, rise = FLOOR_H / n, x0 = WALL + .03, x1 = WALL + 1.0;
      for (let k = 0; k < n; k++) { const y = rise * (k + 1), z1 = zt - k * dz; box("#3b3f45|m", x0, y - .045, z1 - dz - .04, x1, y, z1, 0); box("#8f969c|m", x0, y - .06, z1 - dz - .04, x1, y - .045, z1 - dz + .0, 0); }
      const zb = zt - n * dz;
      /* tartó: a falra szerelt kengyelek + a belső oldalon egy acél pofa */
      { const [g, m] = rodGeom(new THREE.Vector3(x1 + .02, 0, zt), new THREE.Vector3(x1 + .02, FLOOR_H - .06, zb), .05, 4); add("#8f969c|m", g, m, 0); }
      for (let k = 1; k < n; k += 3) box("#8f969c|m", WALL, rise * k - .12, zt - k * dz - .1, x0, rise * k - .02, zt - k * dz, 0);
      /* korlát a belső oldalon (függőleges pálcák, felül kapaszkodó) */
      { const a0 = new THREE.Vector3(x1 + .02, .95, zt), a1 = new THREE.Vector3(x1 + .02, FLOOR_H + .95, zb); const [g, m] = rodGeom(a0, a1, .022, 6); add("steel", g, m, 0);
        for (let k = 0; k <= n; k++) { const z = zt - k * dz, y = rise * k; box("#9aa1a8|m", x1 + .01, y, z - .008, x1 + .03, y + .95, z + .008, 0); } }
      /* mentőmellény-tartó a lépcső felső vége alatt (ÉNY-sarok), mellette úszógumik, horgonyos dísz a falon */
      { const cx = WALL + .55, cz = Z_HALL + .55; box("#2b2f36|m", cx - .5, 1.32, cz - .03, cx + .5, 1.35, cz + .03, 0); [-.5, .5].forEach((d) => box("#2b2f36|m", cx + d - .02, 0, cz - .25, cx + d + .02, 1.35, cz - .21, 0));
        for (let k = 0; k < 9; k++) { const c = ["#ff6a1a", "#ff7f2a", "#1f5fa8", "#ff6a1a", "#e5262f", "#ff8a3a", "#1f3a6a", "#ff6a1a", "#ffb11a"][k];
          box(c, cx - .46 + k * .1, .72, cz - .1, cx - .38 + k * .1, 1.28, cz + .1, 0); box("#1c1f24", cx - .44 + k * .1, .5, cz - .06, cx - .4 + k * .1, .72, cz + .06, 0); }
        ball("#ffd21f", cx - .25, .14, cz + .15, .14, 0, "all", 1, .7, 1); ball("#ffd21f", cx + .2, .12, cz + .2, .12, 0, "all", 1, .7, 1); }
      /* a Dingi teraszának bútorai: kő asztallap, négy fekete szék párnával; faliszekrény; sárga porszívó a lépcső alján */
      tsetHall(add, box, 4.0, (Z_HALL + Z_B - PART) / 2 + .6);
      box("#a26a3a", 2.2, 0, Z_HALL + .02, 3.0, 1.0, Z_HALL + .45, 0); box("#8a5a30", 2.18, 1.0, Z_HALL, 3.02, 1.03, Z_HALL + .47, 0);
      box("#ffd21f", WALL + .4, 0, zt + .05, WALL + .75, .45, zt + .4, 0); cyl("#2b2f36", WALL + .57, .45, zt + .22, .05, .3, 0);
      /* a Korvett/Dingi ajtaja előtt lábtörlők */
      box("#3a3a3a", 1.0, .03, Z_HALL + .05, 1.8, .045, Z_HALL + .55, 0); }
    /* emelet: sötét acél galéria a lépcső tetején (északi sáv), a légtér fölött korlát; keleten a Kalóz terasza nagy szürke lapokkal, üvegkorláttal */
    box("#3b3f45|m", WALL, -.215, Z_HALL, OUT_W - WALL, .03, VOID[1], 1);   /* (alja kicsit a födém alatt – ne villódzzon) */
    box("hallTile", VOID[2], 0, VOID[1], OUT_W - WALL, .03, Z_B - PART, 1);
    { const post = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(L / .12));
        for (let k = 0; k <= n; k++) { const u = k / n; box("#9aa1a8|m", x0 + (x1 - x0) * u - .008, .03, z0 + (z1 - z0) * u - .008, x0 + (x1 - x0) * u + .008, 1.0, z0 + (z1 - z0) * u + .008, 1); }
        const [g, m] = rodGeom(new THREE.Vector3(x0, 1.0, z0), new THREE.Vector3(x1, 1.0, z1), .022, 6); add("steel", g, m, 1); };
      post(WALL + 1.05, VOID[1], VOID[2], VOID[1]); post(VOID[2], VOID[1], VOID[2], Z_B - PART); }
    railing(box, OUT_W - .05, Z_HALL, OUT_W, Z_B - PART, 1);
    box("#3b3f45|m", OUT_W - WALL, -.2, Z_HALL, OUT_W, .03, Z_B - PART, 1);
    tsetHall(add, box, 4.7, Z_B - PART - 1.2, 1);
    /* a Kalóz teraszán a közös nagy hűtő és két ágyneműs szekrény a fal mellett (a tulajdonos alaprajza szerint) */
    box("#f4f4f4", OUT_W - WALL - .75, .03, Z_B - PART - .75, OUT_W - WALL - .05, 1.85, Z_B - PART - .05, 1); box("#c9c9c9", OUT_W - WALL - .76, 1.2, Z_B - PART - .76, OUT_W - WALL - .04, 1.21, Z_B - PART - .04, 1); box("steel", OUT_W - WALL - .78, 1.3, Z_B - PART - .55, OUT_W - WALL - .76, 1.6, Z_B - PART - .52, 1);
    box("#a8998a", OUT_W - WALL - 1.75, .03, Z_B - PART - .65, OUT_W - WALL - .95, 1.9, Z_B - PART - .05, 1);   /* a szekrény a hűtő mellett – a Kalóz ajtaja szabad */
    /* fali lámpák a bejárónál, házjel */
    [[OUT_W + .04, 1.9, Z_HALL + .4], [OUT_W + .04, 1.9, Z_B - .6]].forEach(([x, y, z]) => { box("frame", x - .04, y - .12, z - .06, x + .04, y + .12, z + .06, 0); box("bulb", x + .02, y - .08, z - .04, x + .06, y + .08, z + .04, 0); });
    /* elöl: Korvett terasza és a Fregatt erkélye üvegkorláttal */
    box("terrace", 0, -.06, -1.45, OUT_W, 0, 0, 0);
    box("terrace", 0, -.18, -1.45, OUT_W, 0, 0, 1); box("plaster", 0, -.24, -1.45, OUT_W, -.18, 0, 1);
    railing(box, 0, -1.45, OUT_W, -1.4, 1); railing(box, 0, -1.45, .05, 0, 1); railing(box, OUT_W - .05, -1.45, OUT_W, 0, 1);
    /* a Korvett hálószobájában nagy, keretezett Balaton-térkép lóg (a fotó szerint) – a nappali felőli falon */
    { const kp = planOf("korvett"), hr = (kp.rooms || []).find((r) => /háló/i.test(r[0]));
      if (hr) { const q = mapRect(UNITS.korvett, hr[1], hr[2], hr[3], hr[4]); const x = q[2] - .06, z = q[1] + 1.25;   /* az ajtó (a fal közepén túl) mellett, előtte */
        const map = canvasTex(1024, 300, (g, w, h) => { g.fillStyle = "#e8e2c8"; g.fillRect(0, 0, w, h); for (let k = 0; k < 900; k++) { g.fillStyle = `hsla(${rr(70, 110)},${rr(25, 45)}%,${rr(45, 65)}%,.5)`; g.fillRect(rand() * w, rand() * h, rr(4, 14), rr(4, 10)); }
          g.fillStyle = "#6fb7d0"; g.beginPath(); g.moveTo(40, 210); g.bezierCurveTo(160, 230, 300, 205, 420, 170); g.lineTo(470, 150); g.lineTo(500, 165); g.bezierCurveTo(620, 130, 760, 90, 980, 40); g.lineTo(990, 70); g.bezierCurveTo(800, 140, 640, 190, 505, 205); g.lineTo(470, 190); g.bezierCurveTo(330, 245, 180, 265, 50, 245); g.closePath(); g.fill();
          g.fillStyle = "#1f3a6a"; g.font = "800 46px Georgia, serif"; g.fillText("BALATON", 60, 60); g.fillStyle = "#c62828"; g.beginPath(); g.arc(560, 190, 8, 0, TAU); g.fill(); g.fillStyle = "#222"; g.font = "600 22px Georgia, serif"; g.fillText("Zamárdi", 575, 215); });
        const mm = mesh(new THREE.PlaneGeometry(1.9, .56), std({ map, roughness: .6 }), H.lv[0]); mm.position.set(x, 1.65, z); mm.rotation.y = -Math.PI / 2;
        box("#3a2a1e", x + .005, 1.35, z - 1.0, x + .025, 1.95, z + 1.0, 0); } }
    /* teraszbútor a fotók szerint: a Korvett teraszán kis asztal fekete székekkel, a Fregatt erkélyén asztal két székkel */
    const tset = (cx, cz, lv, n) => { box("#9aa0a6", cx - .35, .72, cz - .35, cx + .35, .75, cz + .35, lv); box("#2b2f36|m", cx - .02, 0, cz - .02, cx + .02, .72, cz + .02, lv);
      [[-.65, 0, Math.PI / 2], [.65, 0, -Math.PI / 2], [0, -.65, 0]].slice(0, n).forEach(([dx, dz, r]) => chair(add, cx + dx, cz + dz, r, lv, "#2b2f36")); };
    tset(4.4, -.75, 0, 3); tset(1.6, -.75, 1, 2);
    /* hátul (a tulajdonos leírása szerint):
       • földszint: a Schooner TELJESEN ZÁRT terasza (üvegfalas télikert), ugyanakkora, mint fölötte a Kadett terasza – ott kezdődik, ahol a parkoló autók állnak;
       • emelet: a Kadett fa terasza a Schooner terasza fölött;
       • a parkoló felőli hátsó sarkon L-alakú fémlépcső: a kertből észak felé indul a ház keleti oldala mentén, a pihenőn BALRA fordul, és a Kadett teraszára fut be;
       • a Kadett teraszának bal hátsó sarkában (a ház felé nézve), a falhoz építve csigalépcső visz fel a tetőteraszra. */
    const TD = 3.3;   /* a hátsó teraszok mélysége */
    box("greyTile", 0, -.04, Z_END, OUT_W, .025, Z_END + TD, 0);
    box("terrace", 0, -.2, Z_END, OUT_W, 0, Z_END + TD, 1); box("plasterIn", 0, -.24, Z_END, OUT_W, -.2, Z_END + TD, 1);
    /* a Schooner zárt teraszának üvegfalai (keret + üveg), a nyugati oldalon tömör fal, középen tolóajtó a kertre */
    { const h = Y1 - .24, glassRun = (axis, c, a0, a1) => { const n = Math.max(1, Math.round((a1 - a0) / 1.1));
        for (let k = 0; k <= n; k++) { const v = a0 + (a1 - a0) * k / n; if (axis === "x") box("frame", v - .03, 0, c - .04, v + .03, h, c + .04, 0); else box("frame", c - .04, 0, v - .03, c + .04, h, v + .03, 0); }
        if (axis === "x") { box("glass", a0, .03, c - .01, a1, h, c + .01, 0); box("frame", a0, h - .06, c - .05, a1, h, c + .05, 0); box("frame", a0, 0, c - .05, a1, .08, c + .05, 0); }
        else { box("glass", c - .01, .03, a0, c + .01, h, a1, 0); box("frame", c - .05, h - .06, a0, c + .05, h, a1, 0); box("frame", c - .05, 0, a0, c + .05, .08, a1, 0); } };
      glassRun("x", Z_END + TD - .05, .05, OUT_W - .05); glassRun("z", OUT_W - .05, Z_END, Z_END + TD);
      box("plaster", 0, 0, Z_END, WALL, h, Z_END + TD, 0); }
    /* a zárt terasz bútorai: kanapé, dohányzóasztal, étkezőasztal székekkel */
    box("#5b6470", 3.4, .05, Z_END + 2.4, 5.4, .45, Z_END + 3.1, 0); box("#5b6470", 3.4, .45, Z_END + 2.9, 5.4, .85, Z_END + 3.1, 0); box("#c9cdc8", 3.9, .05, Z_END + 1.4, 4.9, .4, Z_END + 2.0, 0);
    tsetHall(add, box, 1.6, Z_END + 1.7);
    /* a Kadett terasza: korlát körben; a keleti oldalon a lépcső befutója, a nyugati sarokban a csigalépcső nyílása */
    const LST = [Z_END + 1.45, Z_END + 2.55];   /* a lépcső befutójának z-tartománya a keleti peremen */
    railing(box, 0, Z_END + TD - .05, OUT_W, Z_END + TD, 1);
    railing(box, OUT_W - .05, Z_END, OUT_W, LST[0], 1); railing(box, OUT_W - .05, LST[1], OUT_W, Z_END + TD, 1);
    railing(box, 0, Z_END + 1.75, .05, Z_END + TD, 1);
    tset(3.6, Z_END + 1.9, 1, 3);
    box("#5a3d24", 4.9, 0, Z_END + 2.8, 5.6, .42, Z_END + 3.2, 1);   /* virágláda */
    add("foliage", leafGeom([[5.25, .7, Z_END + 3.0, .32, 5, .7]], "#4f8a3c", .1), M4(0, Y1, 0));
    /* L-lépcső: 1. kar a kertből észak felé (x OUT_W+.15…+1.05), pihenő, 2. kar balra (nyugatra) a teraszra */
    { const sx0 = OUT_W + .15, sx1 = OUT_W + 1.05, n1 = 12, n2 = 3, rise = Y1 / (n1 + n2), dz = .27, zTop1 = LST[1], zBot = zTop1 + n1 * dz;
      const stepMk = "#3b3f45|m", frameMk = "#8f969c|m";
      for (let k = 0; k < n1; k++) { const y = rise * (k + 1), z1 = zBot - k * dz; box(stepMk, sx0, y - .045, z1 - dz - .03, sx1, y, z1, -1); }
      /* pihenő a 12. fok magasságában, a teraszperem mellett */
      const yL = rise * n1; box(stepMk, sx0, yL - .05, LST[0], sx1 + .05, yL, LST[1], -1);
      /* 2. kar: nyugat felé (a ház felé) – három fok a pihenőtől a terasz szintjéig (a pihenő és a terasz között) */
      for (let k = 0; k < n2; k++) { const y = yL + rise * (k + 1), xa = sx1 - (k + 1) * .3; box(stepMk, xa, y - .045, LST[0], xa + .3, y, LST[1], -1); }
      /* oszlopok, pofák, korlát */
      [[sx1, LST[0]], [sx1, LST[1]], [sx0, LST[0]]].forEach(([x, z]) => box(frameMk, x - .04, 0, z - .04, x + .04, yL, z + .04, -1));
      [sx0 - .02, sx1 + .02].forEach((x) => { const [g1, m1] = rodGeom(new THREE.Vector3(x, 0, zBot), new THREE.Vector3(x, yL - .02, zTop1), .045, 4); add(frameMk, g1, m1);
        const [g2, m2] = rodGeom(new THREE.Vector3(x, .95, zBot), new THREE.Vector3(x, yL + .95, zTop1), .02, 6); add("steel", g2, m2);
        for (let k = 0; k <= n1; k += 2) { const z = zBot - k * dz, y = rise * k; box("#9aa1a8|m", x - .008, y, z - .008, x + .008, y + .95, z + .008); } });
      { const [g, m] = rodGeom(new THREE.Vector3(sx1 + .03, yL + .95, LST[1]), new THREE.Vector3(sx1 + .03, yL + .95, LST[0]), .02, 6); add("steel", g, m);
        const [g2, m2] = rodGeom(new THREE.Vector3(sx1 + .03, yL + .95, LST[0] - .02), new THREE.Vector3(OUT_W, Y1 + .95, LST[0] - .02), .02, 6); add("steel", g2, m2); } }
    /* csigalépcső a Kadett teraszáról a tetőteraszra: a bal hátsó sarokban (nyugati sarok a ház falánál), középoszlop, ék alakú fokok */
    const SP = { x: .95, z: Z_END + .9, r: .82 };
    { const y0 = Y1, y1 = 2 * FLOOR_H + .25, n = 18, rise = (y1 - y0) / n, step = (TAU * 1.0) / n, A0 = Math.PI - (n - .5) * step;   /* a legfelső fok a ház (észak) felé néz, onnan lépsz a tetőre */
      cyl("#8f969c|m", SP.x, y0, SP.z, .06, y1 - y0 + 1.0, 1 - 1, "all", 10);
      for (let k = 0; k < n; k++) { const a = A0 + k * step, y = y0 + rise * (k + 1) - Y1;
        const g = new THREE.CylinderGeometry(SP.r, SP.r, .045, 6, 1, false, a, step * 1.08); add("#3b3f45|m", g, M4(SP.x, y + Y1 - .022, SP.z), -1);
        const ex = SP.x + Math.sin(a + step / 2) * SP.r, ez = SP.z + Math.cos(a + step / 2) * SP.r; box("#9aa1a8|m", ex - .01, y + Y1, ez - .01, ex + .01, y + Y1 + .95, ez + .01, -1); }
      /* csavarvonalas kapaszkodó */
      { const pts = []; for (let k = 0; k <= n * 2; k++) { const a = A0 + (k / 2 + .5) * step; pts.push(new THREE.Vector3(SP.x + Math.sin(a) * SP.r, y0 + rise * (k / 2 + 1) + .95, SP.z + Math.cos(a) * SP.r)); }
        add("steel", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 4, .02, 6, false), new THREE.Matrix4()); } }
    /* esőcsatorna-lefolyók a sarkokon */
    [[-.06, -.06], [OUT_W + .06, -.06], [-.06, Z_END + .06], [OUT_W + .06, Z_END + .06]].forEach(([x, z]) => cyl("#8a9096|m", x, 0, z, .05, 2 * FLOOR_H + .4));
    /* lapos tető attikával, fedkővel, szellőzőkkel – mennyezetként is (életnagyságban) */
    const roofY = 2 * FLOOR_H;
    box("roof", 0, roofY, -1.45, OUT_W, roofY + .25, Z_END, 2, "roof");
    box("plasterIn", 0, roofY - .02, 0, OUT_W, roofY, Z_END, 2, "roof");
    [[0, -1.45, OUT_W, -1.3], [1.85, Z_END - .15, OUT_W, Z_END], [0, -1.45, .15, Z_END], [OUT_W - .15, -1.45, OUT_W, Z_END]].forEach(([x0, z0, x1, z1]) => { box("plaster", x0, roofY + .25, z0, x1, roofY + .7, z1, 2, "roof"); box("#8a8d90|m", x0 - .02, roofY + .7, z0 - .02, x1 + .02, roofY + .74, z1 + .02, 2, "roof"); });
    [[2, 5], [4, 12], [2.5, 19]].forEach(([x, z]) => cyl("#a9adb0|m", x, roofY + .25, z, .12, .45, 2, "roof"));
    /* tetőkorlát (vékony fém, a fotók szerint a lapos tető peremén) */
    { const yb = roofY + .74, ys = yb + .95; [[0, -1.3, OUT_W, -1.3], [1.85, Z_END - .08, OUT_W, Z_END - .08], [.08, -1.3, .08, Z_END - .08], [OUT_W - .08, -1.3, OUT_W - .08, Z_END - .08]].forEach(([x0, z0, x1, z1]) => {
        const [g1, m1] = rodGeom(new THREE.Vector3(x0, ys, z0), new THREE.Vector3(x1, ys, z1), .022, 6); add("steel", g1, m1, 2, "roof");
        const [g2, m2] = rodGeom(new THREE.Vector3(x0, yb + .45, z0), new THREE.Vector3(x1, yb + .45, z1), .012, 4); add("steel", g2, m2, 2, "roof");
        const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.5)); for (let k = 0; k <= n; k++) { const u = k / n; cyl("steel", x0 + (x1 - x0) * u, yb, z0 + (z1 - z0) * u, .02, .95, 2, "roof", 6); } }); }
    /* ívelt előtető a Fregatt erkélye fölött (a fotón jellegzetes, kifelé lehajló ív) */
    { const R = 2.0, top = roofY + .25, n = 12; for (let k = 0; k < n; k++) { const a0 = k / n * 1.05, a1 = (k + 1) / n * 1.05;
        const z0 = -Math.sin(a0) * R, y0 = top - (1 - Math.cos(a0)) * R, z1 = -Math.sin(a1) * R, y1 = top - (1 - Math.cos(a1)) * R;
        const L = Math.hypot(z1 - z0, y1 - y0); add("#eceae4", new THREE.BoxGeometry(OUT_W + .1, .06, L), M4(OUT_W / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, Math.atan2(y0 - y1, z0 - z1) * -1 + 0), 2, "roof"); } }
    /* ZEPHYR felirat függőlegesen a homlokzat keleti sarkán (sötét tábla), alatta a házszám */
    const sign = canvasTex(160, 1024, (g, w, h) => { g.fillStyle = "#3d4248"; g.fillRect(0, 0, w, h); g.fillStyle = "#eef0f2"; g.font = "700 118px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; "ZEPHYR".split("").forEach((c, i) => g.fillText(c, w / 2, 110 + i * 150)); });
    const sg = mesh(new THREE.PlaneGeometry(.34, 2.2), std({ map: sign, roughness: .5, emissive: new THREE.Color("#ffffff"), emissiveMap: sign, emissiveIntensity: 0 }), H.lv[1]);
    sg.position.set(OUT_W - .32, 1.3, -.035); sg.rotation.y = Math.PI; H.sign = sg;
    const no = canvasTex(128, 96, (g, w, h) => { g.fillStyle = "#e9ecef"; g.fillRect(0, 0, w, h); g.strokeStyle = "#3d4248"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = "#1f3a6a"; g.font = "800 62px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("58", w / 2, h / 2 + 3); });
    const nm = mesh(new THREE.PlaneGeometry(.22, .165), std({ map: no, roughness: .5 }), H.lv[1]); nm.position.set(OUT_W - .32, .02, -.035); nm.rotation.y = Math.PI;

    /* ------------------------------------------------ kirajzolás: összevonás anyagonként, láthatósági csoportonként */
    Object.values(reg).forEach((r) => {
      const mat = hmat(r.mk), geo = mergeGeoms(r.list);
      const tile = mat.map && mat.map.userData && mat.map.userData.tile; if (tile) worldUV(geo, tile);
      const parent = r.lv === -1 ? model : r.lv === 2 ? H.roof : H.lv[r.lv];
      const m = mesh(geo, mat, parent); const tr = mat.transparent;
      m.castShadow = !tr && r.mk !== "grass" && r.mk !== "pave" && r.mk !== "asph"; m.receiveShadow = true;
      m.userData.vis = r.vis; m.userData.lv = r.lv; if (tr) m.renderOrder = 2;
      H.meshes.push(m);
    });
    H.glass = hmat("glass"); H.bulb = hmat("bulb"); H.lampIn = hmat("lampIn");
    return H;
  }
  /* --- segédek a házhoz --- */
  function tsetHall(add, box, cx, cz, lv) { lv = lv || 0;
    box("#d8d6d0", cx - .42, .72, cz - .42, cx + .42, .76, cz + .42, lv); box("#2b2f36|m", cx - .03, 0, cz - .03, cx + .03, .72, cz + .03, lv);
    [[-.72, 0, Math.PI / 2], [.72, 0, -Math.PI / 2], [0, -.72, 0], [0, .72, Math.PI]].forEach(([dx, dz, r]) => { chair(add, cx + dx, cz + dz, r, lv, "#2b2f36"); box("#c9cdc8", cx + dx - .2, .46, cz + dz - .2, cx + dx + .2, .5, cz + dz + .2, lv); });
  }
  function railing(box, x0, z0, x1, z1, lv) {
    box("rail", x0, .02, z0, x1, 1.02, z1, lv);
    const long = (x1 - x0) > (z1 - z0);
    if (long) { box("steel", x0, 1.02, z0 - .01, x1, 1.06, z1 + .01, lv); for (let x = x0; x <= x1 + .01; x += 1.2) box("steel", x - .02, 0, z0 - .01, x + .02, 1.02, z1 + .01, lv); }
    else { box("steel", x0 - .01, 1.02, z0, x1 + .01, 1.06, z1, lv); for (let z = z0; z <= z1 + .01; z += 1.2) box("steel", x0 - .01, 0, z - .02, x1 + .01, 1.02, z + .02, lv); }
  }
  function flowers(add, x0, z0, x1, z1, n) {
    add("#5e4632", new THREE.BoxGeometry(x1 - x0, .06, z1 - z0), M4((x0 + x1) / 2, .07, (z0 + z1) / 2));
    const cols = ["#e5262f", "#ffd166", "#ffffff", "#c86ad8", "#ff8a3a", "#f06aa0"];
    for (let k = 0; k < n; k++) { const x = rr(x0 + .05, x1 - .05), z = rr(z0 + .05, z1 - .05), h = rr(.12, .35);
      add("#4f7a3a", new THREE.CylinderGeometry(.006, .008, h, 3), M4(x, .1 + h / 2, z));
      add(cols[k % cols.length], new THREE.IcosahedronGeometry(rr(.025, .045), 0), M4(x, .1 + h, z)); }
  }
  function tree(add, x, z, r) {
    add("#5a3d24", new THREE.CylinderGeometry(.12, .2, 2.8, 8), M4(x, 1.4, z));
    add("#5a3d24", new THREE.CylinderGeometry(.05, .08, 1.2, 6), M4(x + .3, 2.6, z, 0, 0, -.6));
    add("#5a3d24", new THREE.CylinderGeometry(.04, .07, 1.0, 6), M4(x - .25, 2.7, z + .1, 0, .5, .5));
    add("foliage", leafGeom([[x, 2.6 + r * .8, z, r, 9, .9], [x + r * .5, 2.4 + r * .5, z + r * .2, r * .7, 5], [x - r * .45, 2.5 + r * .55, z - r * .25, r * .72, 5], [x + r * .1, 2.6 + r * 1.25, z - r * .1, r * .6, 4]], ["#4f8a3c", "#5f9a42", "#6a8f3a"][Math.abs(Math.round(x * 3 + z)) % 3]));
  }
  function car(add, col, x, z, rot) {
    const P = (lx, ly, lz) => { const c = Math.cos(rot), s = Math.sin(rot); return [x + lx * c + lz * s, ly, z - lx * s + lz * c]; };
    const B = (mk, w, h, d, lx, ly, lz) => { const p = P(lx, ly, lz); add(mk, new THREE.BoxGeometry(w, h, d), M4(p[0], p[1], p[2], rot)); };
    B(col + "|m", 1.78, .55, 4.25, 0, .55, 0); B(col + "|m", 1.7, .12, 4.1, 0, .87, 0);
    B("#1c2630|m", 1.56, .5, 2.2, 0, 1.15, .15); B(col + "|m", 1.5, .06, 2.0, 0, 1.43, .2);
    B("#fff6d8", .32, .1, .04, -.6, .7, -2.13); B("#fff6d8", .32, .1, .04, .6, .7, -2.13); B("#c62828", .3, .1, .04, -.62, .74, 2.13); B("#c62828", .3, .1, .04, .62, .74, 2.13);
    B("#2a2d32", 1.8, .16, .1, 0, .38, -2.14); B("#2a2d32", 1.8, .16, .1, 0, .38, 2.14);
    [[-.82, -1.35], [.82, -1.35], [-.82, 1.35], [.82, 1.35]].forEach(([lx, lz]) => { const p = P(lx, .33, lz);
      add("#15171a", new THREE.CylinderGeometry(.33, .33, .22, 16), M4(p[0], p[1], p[2], rot, 0, Math.PI / 2)); add("#c9cdd2|m", new THREE.CylinderGeometry(.2, .2, .23, 10), M4(p[0], p[1], p[2], rot, 0, Math.PI / 2)); });
  }
  function bike(add, x, z, col) {
    [[0, -.52], [0, .52]].forEach(([dx, dz]) => add("#15171a", new THREE.TorusGeometry(.33, .025, 6, 18), M4(x + dx, .37, z + dz, Math.PI / 2)));
    add(col + "|m", new THREE.BoxGeometry(.04, .04, .9), M4(x, .62, z, 0, -.15)); add(col + "|m", new THREE.BoxGeometry(.04, .5, .04), M4(x, .55, z - .15, 0, .3));
    add("#15171a", new THREE.BoxGeometry(.1, .04, .22), M4(x, .86, z - .2)); add("#c9cdd2|m", new THREE.BoxGeometry(.5, .03, .03), M4(x, .92, z + .45));
  }
  function chair(add, x, z, rot, lv, col, y0) {
    y0 = y0 || 0; const c = Math.cos(rot), s = Math.sin(rot), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    add(col, new THREE.BoxGeometry(.42, .04, .42), M4(x, y0 + .45, z, rot), lv);
    const b = P(0, .19); add(col, new THREE.BoxGeometry(.42, .42, .03), M4(b[0], y0 + .68, b[1], rot, .08), lv);
    [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]].forEach(([a, d]) => { const p = P(a, d); add(col, new THREE.BoxGeometry(.035, .45, .035), M4(p[0], y0 + .225, p[1], rot), lv); });
  }
  function garland(add, pts, sag, lv, vis) {
    for (let i = 0; i < pts.length - 1; i++) { const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]); let prev = a;
      for (let k = 1; k <= 10; k++) { const u = k / 10, p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * sag; const [g, m] = rodGeom(prev, p, .006, 4); add("#202020", g, m, lv, vis); prev = p;
        if (k < 10) add("bulb", new THREE.SphereGeometry(.03, 8, 6), M4(p.x, p.y - .04, p.z), lv, vis); } }
  }
  /* --- részletes bútorok az alaprajz tereptárgyaiból --- */
  function furnishDetailed(add, lv, U, Pl, id) {
    const accent = { korvett: "#c0504a", dingi: "#3f9b72", fregatt: "#3d7fc2", kaloz: "#8a64c8", schooner: "#2a9aa6", kadett: "#c99a3a" }[id] || "#888";
    const B = (mk, x0, y0, z0, x1, y1, z1) => add(mk, new THREE.BoxGeometry(Math.max(.005, x1 - x0), Math.max(.005, y1 - y0), Math.max(.005, z1 - z0)), M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), lv);
    /* a lakás szobáinak befoglaló téglalapja (alaprajz-koordinátában): a rajta kívül eső „bútorok” (a Dingi/Kalóz alaprajzán a lépcsőház tárgyai)
       itt nem kellenek – a lépcsőházat (asztal, mentőmellény-tartó, porszívó, közös hűtő) a ház modellje külön, a fotók szerint rajzolja */
    const RB = (Pl.rooms || []).reduce((b, r) => [Math.min(b[0], r[1]), Math.min(b[1], r[2]), Math.max(b[2], r[1] + r[3]), Math.max(b[3], r[2] + r[4])], [1e9, 1e9, -1e9, -1e9]);
    (Pl.furn || []).forEach((f) => {
      const [type, x, y, w0, d0, , rot] = f; if (["door", "window", "area", "lane", "stairs"].includes(type) || !(w0 > .05 && d0 > .05)) return;
      if (RB[0] < 1e8 && (x + w0 / 2 < RB[0] - .1 || x + w0 / 2 > RB[2] + .1 || y + d0 / 2 < RB[1] - .1 || y + d0 / 2 > RB[3] + .1)) return;
      const sw = Math.abs(rot || 0) % 180 === 90, w = sw ? d0 : w0, d = sw ? w0 : d0, cx = x + w0 / 2, cy = y + d0 / 2;
      const [x0, z0, x1, z1] = mapRect(U, cx - w / 2, cy - d / 2, w, d), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, W2 = x1 - x0, D2 = z1 - z0, long = W2 > D2;
      const lab = String(f[5] || "");
      switch (type) {
        case "bed": {
          B("#4a3a30", x0, .03, z0, x1, .32, z1); B("#f2efe8", x0 + .03, .32, z0 + .03, x1 - .03, .52, z1 - .03);
          /* fejtámla a rövidebb oldalon (x0 vagy z0 felől), takaró, párnák, pléd */
          if (long) { B("#2e2622", x0 - .02, .03, z0, x0 + .08, 1.0, z1); B("floral", x0 + .45, .52, z0 + .04, x1 - .04, .6, z1 - .04); B("#f4f1ea", x1 - .55, .6, z0 + .04, x1 - .1, .62, z1 - .04);
            const n = D2 > 1.2 ? 2 : 1; for (let k = 0; k < n; k++) { const a = z0 + .08 + k * (D2 - .16) / n; B("#ffffff", x0 + .08, .52, a + .03, x0 + .42, .66, a + (D2 - .16) / n - .03); } }
          else { B("#2e2622", x0, .03, z0 - .02, x1, 1.0, z0 + .08); B("floral", x0 + .04, .52, z0 + .45, x1 - .04, .6, z1 - .04); B("#f4f1ea", x0 + .04, .6, z1 - .55, x1 - .04, .62, z1 - .1);
            const n = W2 > 1.2 ? 2 : 1; for (let k = 0; k < n; k++) { const a = x0 + .08 + k * (W2 - .16) / n; B("#ffffff", a + .03, .52, z0 + .08, a + (W2 - .16) / n - .03, .66, z0 + .42); } }
          break; }
        case "sofa": {
          const ax = long; B("#5e554c", x0, .1, z0, x1, .42, z1);
          [[x0 + .03, z0 + .03], [x1 - .03, z1 - .03]].forEach(() => {});
          if (ax) { B("#6f665c", x0, .42, z1 - .22, x1, .82, z1); B("#5a524a", x0, .1, z0, x0 + .14, .62, z1); B("#5a524a", x1 - .14, .1, z0, x1, .62, z1);
            const n = Math.max(2, Math.round(W2 / .8)); for (let k = 0; k < n; k++) { const a = x0 + .15 + k * (W2 - .3) / n; B("floral", a + .01, .42, z0 + .04, a + (W2 - .3) / n - .01, .52, z1 - .22); }
            B(accent, x0 + .2, .5, z1 - .34, x0 + .6, .82, z1 - .2); B("#e8d9b0", x1 - .6, .5, z1 - .34, x1 - .2, .82, z1 - .2); }
          else { B("#6f665c", x1 - .22, .42, z0, x1, .82, z1); B("#5a524a", x0, .1, z0, x1, .62, z0 + .14); B("#5a524a", x0, .1, z1 - .14, x1, .62, z1);
            const n = Math.max(2, Math.round(D2 / .8)); for (let k = 0; k < n; k++) { const a = z0 + .15 + k * (D2 - .3) / n; B("floral", x0 + .04, .42, a + .01, x1 - .22, .52, a + (D2 - .3) / n - .01); }
            B(accent, x1 - .34, .5, z0 + .2, x1 - .2, .82, z0 + .6); B("#e8d9b0", x1 - .34, .5, z1 - .6, x1 - .2, .82, z1 - .2); }
          [[x0 + .05, z0 + .05], [x1 - .08, z0 + .05], [x0 + .05, z1 - .08], [x1 - .08, z1 - .08]].forEach(([a, b]) => B("#2b2b2b", a, .03, b, a + .03, .1, b + .03));
          /* vitorlás kép a kanapé fölött (a fotókon tengerészeti képek lógnak) */
          { const px = ax ? mx : x1 + .05, pz = ax ? z1 + .05 : mz; const outer = px < WALL + .4 || px > OUT_W - WALL - .4 || pz < WALL + .4 || pz > Z_END - WALL - .4; if (!outer) add("#3a2a1e", new THREE.BoxGeometry(ax ? .82 : .03, .56, ax ? .03 : .82), M4(px, 1.6, pz), lv); if (!outer) add("painting", new THREE.BoxGeometry(ax ? .74 : .035, .48, ax ? .035 : .74), M4(px, 1.6, pz), lv); }
          /* állólámpa a kanapé végénél */
          const lx = ax ? x1 + .25 : mx + .0, lz = ax ? z1 - .2 : z1 + .25;
          add("#2b2f36|m", new THREE.CylinderGeometry(.012, .012, 1.45, 6), M4(lx, .75, lz), lv); add("#2b2f36|m", new THREE.CylinderGeometry(.14, .14, .02, 16), M4(lx, .04, lz), lv);
          add("lampIn", new THREE.CylinderGeometry(.12, .18, .24, 16, 1, true), M4(lx, 1.5, lz), lv);
          break; }
        case "table4": case "table6": case "table2": case "table5": case "table": case "round4": {
          const round = type === "round4";
          if (round) { add("#9c6b3f", new THREE.CylinderGeometry(Math.min(W2, D2) / 2, Math.min(W2, D2) / 2, .04, 28), M4(mx, .74, mz), lv); add("#6b4426", new THREE.CylinderGeometry(.05, .2, .72, 12), M4(mx, .38, mz), lv); }
          else { B("#a8774a", x0, .72, z0, x1, .76, z1); [[x0 + .03, z0 + .03], [x1 - .09, z0 + .03], [x0 + .03, z1 - .09], [x1 - .09, z1 - .09]].forEach(([a, b]) => B("#6b4426", a, .03, b, a + .06, .72, b + .06)); }
          /* váza virággal, alátétek */
          add("#d8e6ea", new THREE.CylinderGeometry(.045, .035, .16, 12), M4(mx, .84, mz), lv);
          for (let k = 0; k < 6; k++) add(["#e5262f", "#ffd166", "#ffffff", "#c86ad8"][k % 4], new THREE.IcosahedronGeometry(.03, 0), M4(mx + Math.cos(k) * .05, .95 + (k % 2) * .03, mz + Math.sin(k) * .05), lv);
          break; }
        case "chair": chair(add, mx, mz, (rot || 0) * D2R, lv, "#7a5a3a"); break;
        case "shower": B("#eef3f5", x0, .03, z0, x1, .09, z1); B("rail", x0, .09, z0, x1, 2.0, z0 + .02); B("rail", x0, .09, z0, x0 + .02, 2.0, z1);
          add("chrome", new THREE.CylinderGeometry(.012, .012, 1.1, 6), M4(x1 - .1, 1.45, z1 - .06), lv); add("chrome", new THREE.CylinderGeometry(.09, .09, .02, 16), M4(x1 - .2, 2.0, z1 - .2), lv); break;
        case "wc": add("#ffffff", new THREE.CylinderGeometry(.18, .15, .4, 16), M4(mx, .23, mz), lv); B("#ffffff", mx - .2, .03, long ? z0 : mz + .1, mx + .2, .8, long ? z0 + .16 : mz + .26); break;
        case "sink": B("#e9e6df", x0, .03, z0, x1, .78, z1); B("#ffffff", x0 + .02, .78, z0 + .02, x1 - .02, .86, z1 - .02); add("chrome", new THREE.CylinderGeometry(.012, .012, .18, 6), M4(mx, .95, mz), lv); break;
        case "counter": case "counter2": {
          B("#ecebe6", x0, .1, z0, x1, .86, z1); B("#2b2b2b", x0, .03, z0, x1, .1, z1); B("#3a3a3a", x0 - .01, .86, z0 - .01, x1 + .01, .9, z1 + .01);
          const n = Math.max(1, Math.round((long ? W2 : D2) / .6)); for (let k = 1; k < n; k++) { const t = k / n; if (long) B("#c9c7c0", x0 + W2 * t - .005, .12, z0 - .002, x0 + W2 * t + .005, .84, z1 + .002); else B("#c9c7c0", x0 - .002, .12, z0 + D2 * t - .005, x1 + .002, .84, z0 + D2 * t + .005); }
          if (type === "counter") { const a = long ? [x0 + W2 * .25, mz] : [mx, z0 + D2 * .25], b = long ? [x0 + W2 * .7, mz] : [mx, z0 + D2 * .7];
            add("#15171a|m", new THREE.BoxGeometry(.55, .01, .5), M4(a[0], .905, a[1]), lv); [[-.13, -.12], [.13, -.12], [-.13, .12], [.13, .12]].forEach(([dx, dz]) => add("#555", new THREE.TorusGeometry(.07, .006, 4, 16), M4(a[0] + dx, .912, a[1] + dz, 0, Math.PI / 2), lv));
            add("steel", new THREE.BoxGeometry(.45, .02, .38), M4(b[0], .905, b[1]), lv); add("chrome", new THREE.CylinderGeometry(.012, .012, .3, 6), M4(b[0], 1.05, b[1] + (long ? .17 : 0)), lv); }
          break; }
        case "washer": B("#f2f2f2", x0, .03, z0, x1, .85, z1); add("#1c2630|m", new THREE.CylinderGeometry(.16, .16, .02, 20), M4(mx, .45, mz, 0, Math.PI / 2), lv); break;
        case "tv": B("#2b2f36", x0, .03, z0, x1, .45, z1); B("#0d0f12|m", long ? x0 + .05 : mx - .02, .9, long ? mz - .02 : z0 + .05, long ? x1 - .05 : mx + .02, 1.45, long ? mz + .02 : z1 - .05); break;
        case "shelf": B("#c9a77b", x0, .03, z0, x1, 1.6, z1); for (let k = 0; k < 4; k++) for (let j = 0; j < 6; j++) { const t = (j + .5) / 6; const c = ["#8a3a2a", "#2a5a8a", "#d9b44a", "#3a7a4a", "#5a3a6a"][(j + k) % 5];
            if (long) B(c, x0 + W2 * t - .04, .1 + k * .38, z0 + .03, x0 + W2 * t + .03, .32 + k * .38, z1 - .03); else B(c, x0 + .03, .1 + k * .38, z0 + D2 * t - .04, x1 - .03, .32 + k * .38, z0 + D2 * t + .03); } break;
        case "shed": break;
        default: {
          const h = /szekrény/.test(lab) ? 2.0 : /hűtő/.test(lab) ? 1.8 : /klíma|bojler/.test(lab) ? 0 : /fotel|pouf/.test(lab) ? .45 : /asztal/.test(lab) ? .74 : /éjjeli|komód/.test(lab) ? .55 : .55;
          if (h <= 0) break;
          if (/szekrény/.test(lab)) { B("#a8998a", x0, .03, z0, x1, h, z1); if (long) { B("#b9a786", mx - .005, .1, z0 - .003, mx + .005, h - .05, z1 + .003); } else B("#b9a786", x0 - .003, .1, mz - .005, x1 + .003, h - .05, mz + .005);
            add("steel", new THREE.BoxGeometry(.02, .3, .02), M4(long ? mx - .05 : x0 - .01, 1.1, long ? z0 - .01 : mz - .05), lv); }
          else if (/hűtő/.test(lab)) { B("#f4f4f4", x0, .03, z0, x1, h, z1); B("#c9c9c9", x0 - .003, 1.15, z0 - .003, x1 + .003, 1.16, z1 + .003); }
          else if (/fotel/.test(lab)) { B("#8a7a6a", x0, .1, z0, x1, .45, z1); B("#7a6a5a", x0, .45, z1 - .15, x1, .85, z1); }
          else if (/éjjeli/.test(lab)) { B("#a8875e", x0, .03, z0, x1, .5, z1); add("lampIn", new THREE.CylinderGeometry(.07, .1, .16, 12, 1, true), M4(mx, .66, mz), lv); add("#c9a24a|m", new THREE.CylinderGeometry(.01, .05, .1, 8), M4(mx, .55, mz), lv); }
          else B("#cbb894", x0, .03, z0, x1, h, z1);
        }
      }
    });
  }

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
  const WATER_Y = -.55, SHORE_Z = 260, DECK_R = 3.0, RO = SHORE_Z - 16;   /* 2026. nov. 6.: a stég helyett a regatta-bóján állunk, a part ~260 m-re van; RO = a régi stég melletti nádfoltok eltolása a part közelébe */
  const LIFE_POS = new THREE.Vector3(-3, 0, SHORE_Z + 34);   /* életnagyságban a ház (0,0) pontja a site-ban: az utca középvonala z = 53,2 */

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
    const wk = mesh(wTop, wM, g); ENV.walk = wk; wk.position.set(0, -.06, (DECK_R + SHORE_Z + 2) / 2 - .15); wk.receiveShadow = true;
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
    [[6.8, 2.5, 60], [-6.9, 2.2, 60], [7.3, -1.8, 40], [-7.4, -1.4, 40], [4.2, 7.5, 40], [-4, 8, 40], [9, 10, 50], [-9.5, 12, 50]].forEach(([x, z, n]) => clump(x * 2.2, z + RO, n, 1.9));
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
    ENV.reedSpots = [[6.8, 2.5], [-6.9, 2.2], [7.3, -1.8], [-7.4, -1.4], [4.2, 7.5], [-4, 8]].map(([x, z]) => [x * 2.2, z + RO]);
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
  /* BÜTYKÖS HATTYÚ (2026. nov. 6., a tulajdonos kérésére újramodellezve, fotók és leírások alapján):
     csónak alakú, magasan úszó test, felfelé álló farok, a hát fölé enyhén megemelt szárnyak, S alakú hajlékony nyak (14 elemből),
     narancs csőr fekete bütyökkel és fekete arcfolttal. Mozgás: lábtempónként kis lökés, nyakhullámzás, időnként táplálkozik
     (fejjel a víz alá bukik, farka az ég felé) vagy tollászkodik (fejét a hátára fordítja). A fiókák szürkésbarnák, a szüleik nyomában úsznak. */
  function swanBodyGeom(lift) {
    const NS = 30, NA = 28, pos = [], idx = [];
    for (let i = 0; i <= NS; i++) {
      const s = i / NS, z = -.46 + s * 1.08;
      const env = Math.pow(Math.sin(Math.PI * Math.min(1, s * .96 + .025)), .55);
      const w = .29 * env * (1 - .3 * Math.pow(s, 2.5)), h = .2 * env * (1 + .2 * (1 - s)), yc = .1 + .16 * Math.pow(Math.max(0, s - .6) / .4, 1.8);
      for (let j = 0; j <= NA; j++) {
        const a = j / NA * TAU, ca = Math.cos(a), sa = Math.sin(a);
        let x = w * Math.sign(ca) * Math.pow(Math.abs(ca), .8), y = yc + h * sa;
        if (sa < 0) y = yc + h * sa * .62;   /* laposabb has */
        if (sa > 0) { const wl = lift * Math.sin(Math.PI * Math.min(1, Math.max(0, (s - .2) / .75))) * Math.pow(sa, 1.5) * (.45 + .55 * Math.pow(Math.abs(ca), .5)); y += wl * .28; }   /* a hát fölé finoman megemelt, lekerekített szárnyak */
        pos.push(x, y, z);
      }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); W.disposables.push(g); return g;
  }
  /* tollazat: finom pikkelyes tollrajzolat a testen (domború textúra helyett világos-árnyék foltok) */
  function featherTex(base) {
    return canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 10) for (let x = (y / 10) % 2 ? 7 : 0; x < w; x += 14) { const gr = g.createRadialGradient(x, y + 6, 1, x, y + 3, 9); gr.addColorStop(0, "rgba(255,255,255,.25)"); gr.addColorStop(1, "rgba(120,120,110,.12)"); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y + 4, 7, 6, 0, 0, Math.PI); g.fill(); } }, { repeat: [3, 3] });
  }
  function makeSwan(male, cygnet) {
    const g = new THREE.Group(), base = cygnet ? "#b0a89c" : "#f8f7f1";
    const fm = std({ color: base, map: featherTex(base), roughness: .82 }), om = std({ color: cygnet ? "#4a4440" : "#e8642a", roughness: .45 }), km = std({ color: "#121416", roughness: .4 });
    const pivot = new THREE.Group(); g.add(pivot);   /* a test billen (táplálkozáskor előre) */
    const body = mesh(swanBodyGeom(cygnet ? .05 : (male ? .2 : .13)), fm, pivot); body.castShadow = true;
    /* farok-tollcsúcs */
    const tl = mesh(new THREE.ConeGeometry(.05, .16, 8), fm, pivot); tl.position.set(0, .3, .62); tl.rotation.x = Math.PI / 2 + .55; tl.scale.set(1.4, 1, .5);
    /* nyak: 14 nyújtott gömb egy példányosított hálóban (egy rajzhívás) */
    const NN = 24, neck = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), fm, NN); W.disposables.push(neck.geometry); neck.castShadow = true; pivot.add(neck); neck.frustumCulled = false;
    /* fej: koponya, csőr (narancs, fekete pereme és körme), bütyök, fekete arcfolt, szem */
    const head = new THREE.Group(); pivot.add(head);
    const sk = mesh(new THREE.SphereGeometry(.068, 16, 12), fm, head); sk.scale.set(.82, .85, 1.25);
    const bg = new THREE.CylinderGeometry(.018, .034, .13, 12); bg.rotateX(-Math.PI / 2); bg.scale(1, .62, 1); bg.translate(0, -.012, -.12); const bill = mesh(bg, om, head);
    const nail = mesh(new THREE.SphereGeometry(.014, 8, 6), km, head); nail.position.set(0, -.01, -.185); nail.scale.set(1, .6, 1);
    const mask = mesh(new THREE.SphereGeometry(.034, 10, 8), km, head); mask.position.set(0, -.004, -.072); mask.scale.set(1.15, .9, 1.1);
    if (!cygnet) { const kn = mesh(new THREE.SphereGeometry(male ? .026 : .018, 10, 8), km, head); kn.position.set(0, .018, -.085); kn.scale.set(.9, 1, 1.2); }
    [-1, 1].forEach((sd) => { const e = mesh(new THREE.SphereGeometry(.009, 8, 6), km, head); e.position.set(sd * .045, .012, -.05); });
    /* V alakú nyomhullám a víz színén */
    const wk = canvasTex(128, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 1.6; for (let k = 0; k < 3; k++) { c.globalAlpha = 1 - k * .3; c.beginPath(); c.moveTo(4 + k * 6, h); c.quadraticCurveTo(w / 2 - 6, 30 + k * 18, w / 2, 12 + k * 14); c.quadraticCurveTo(w / 2 + 6, 30 + k * 18, w - 4 - k * 6, h); c.stroke(); } });
    const wake = mesh(new THREE.PlaneGeometry(1.1, 2.2), basic({ map: wk, transparent: true, depthWrite: false, opacity: .5 }), g); wake.rotation.x = -Math.PI / 2; wake.position.set(0, .015, .55); wake.renderOrder = 2;
    g.userData.sw = { pivot, neck, head, wake, NN, cyg: !!cygnet, mode: 0, mt: 0, blend: [1, 0, 0, 0], tmp: { m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) } };
    if (cygnet) g.scale.setScalar(.55);
    return g;
  }
  /* a nyak kontrollpontjai a testtartások szerint: úszás (S), éber, táplálkozás (víz alá), tollászkodás (hátra) */
  const SW_POSE = [
    [[0, .2, -.32], [0, .4, -.43], [0, .6, -.35], [0, .77, -.39], [0, .83, -.5]],
    [[0, .2, -.32], [0, .46, -.44], [0, .72, -.44], [0, .92, -.45], [0, .99, -.54]],
    [[0, .2, -.32], [0, .2, -.55], [0, .02, -.72], [0, -.2, -.82], [0, -.36, -.86]],
    [[0, .2, -.32], [.06, .46, -.32], [.14, .56, -.08], [.18, .48, .12], [.17, .4, .24]]];
  const _swV = [0, 1, 2, 3, 4].map(() => new THREE.Vector3()), _swF = new THREE.Vector3(0, 0, -1);
  function swanPose(sw, t, ph) {
    const B = sw.blend, wave = Math.sin(t * 1.3 + ph);
    for (let k = 0; k < 5; k++) { const v = _swV[k].set(0, 0, 0); for (let p = 0; p < 4; p++) if (B[p] > 1e-3) { const q = SW_POSE[p][k]; v.x += q[0] * B[p]; v.y += q[1] * B[p]; v.z += q[2] * B[p]; } if (k > 1) { v.z += wave * .015 * k; v.x += Math.sin(t * .7 + ph + k) * .01 * k; } }
    const cur = new THREE.CatmullRomCurve3(_swV), T2 = sw.tmp, N = sw.NN;
    for (let i = 0; i < N; i++) { const u = i / (N - 1), p = cur.getPointAt(u * .96), tg = cur.getTangentAt(u * .96), r = .074 - .034 * Math.pow(u, .8) + (u < .12 ? (.12 - u) * .25 : 0);
      T2.q.setFromUnitVectors(T2.up, tg); T2.s.set(r, Math.max(r * .95, cur.getLength() / N * 1.1), r); T2.m.compose(p, T2.q, T2.s); sw.neck.setMatrixAt(i, T2.m); }
    sw.neck.instanceMatrix.needsUpdate = true;
    const hp = cur.getPointAt(1), ht = cur.getTangentAt(1);
    sw.head.position.copy(hp);
    /* a fej a nyak végéből előre-lefelé néz (úszáskor a csőr lefelé mutat), táplálkozáskor egyenesen le */
    const fwd = new THREE.Vector3(ht.x, ht.y * .3 - .55 * (B[0] + B[1] * .3), ht.z - (B[0] + B[1]) * .6).normalize();
    sw.head.quaternion.setFromUnitVectors(_swF, fwd);
  }
  function makeFish() {
    /* dévér/ponty-szerű hal: magas, oldalról lapított test, ezüst oldal, sötétebb hát, hát- és farokúszó (a farokúszó csapkod) */
    const g = new THREE.Group(), side = std({ color: "#c9d1d6", roughness: .22, metalness: .75 }), back = std({ color: "#3e4a48", roughness: .35, metalness: .4 }), fin = std({ color: "#7d7a6a", roughness: .6, side: THREE.DoubleSide, transparent: true, opacity: .85 });
    const b = mesh(new THREE.SphereGeometry(.1, 16, 12), side, g); b.scale.set(.42, .9, 1.7);
    const bk = mesh(new THREE.SphereGeometry(.1, 16, 8, 0, TAU, 0, Math.PI * .38), back, g); bk.scale.set(.44, .92, 1.72); bk.position.y = .004;
    const ds = new THREE.Shape(); ds.moveTo(0, 0); ds.lineTo(.03, .07); ds.lineTo(.12, .02); ds.lineTo(.12, 0); const dg = new THREE.ShapeGeometry(ds); dg.rotateY(Math.PI / 2); const df = mesh(dg, fin, g); df.position.set(0, .075, .02);
    const tail = new THREE.Group(); tail.position.z = .16; g.add(tail);
    const ts = new THREE.Shape(); ts.moveTo(0, 0); ts.lineTo(.09, .07); ts.quadraticCurveTo(.06, 0, .09, -.07); ts.closePath(); const tgm = new THREE.ShapeGeometry(ts); tgm.rotateY(-Math.PI / 2); mesh(tgm, fin, tail);
    const ey = std({ color: "#111", roughness: .2 }); [-1, 1].forEach((sd) => { const e = mesh(new THREE.SphereGeometry(.011, 8, 6), ey, g); e.position.set(sd * .036, .02, -.12); });
    g.userData.tail = tail; return g;
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
    { const a0 = rr(0, 1); [[1, 0, 0], [0, .9, .06], [0, 0, .12, 1], [0, 0, .16, 1]].forEach(([male, lag, lagA, cyg], i) => { const s = makeSwan(male, cyg); site.add(s); L.swans.push({ g: s, r: 10.5 + (cyg ? (i - 2.5) * .7 : lag), sp: .045, a: a0 - lagA - (cyg ? .02 * i : 0), ph: rr(0, 9), cx: 2, cz: 1, sw: s.userData.sw, next: rr(8, 20) }); });
      const s3 = makeSwan(1); site.add(s3); L.swans.push({ g: s3, r: 15, sp: -.035, a: 2.2 + rr(0, 1), ph: rr(0, 9), cx: -4, cz: -6, sw: s3.userData.sw, next: rr(5, 15) }); }
    [[1], [0], [1], [0]].forEach(([m], i) => { const d = makeDuck(m); site.add(d); L.ducks.push({ g: d, i, a: rr(0, TAU), ph: rr(0, 9) }); });
    /* vitorlások a tavon (a regatta hajói) */
    /* egy részletes vitorlás (lobogó vitorla, legénység) közelebb, a többi egyszerűsített a távolban */
    { const b = BOATS[2 % BOATS.length]; const g = makeBoat(Object.assign({ detail: 0, crew: 2 }, b)); ENV.env.add(g);
      L.boats.push({ g, x: -60, z: -110, b: 1.2, v: 2.5, wp: null, ph: rand() * 9, wk: makeWake(ENV.env, .55), near: 1 });
      /* rámutatva: „Vitorlázz vele!” – csippentésre átvisz a vitorlázás világába */
      const hit = mesh(new THREE.BoxGeometry(5, 14, 11), basic({ visible: false }), g); hit.position.y = 6;
      hit.userData.xr = { hover: (on) => { try { if (on) showTip(g, "⛵ Vitorlázz a Balatonon!", "Csippents rá: a kormányrúdhoz ülsz"); else showTip(null); } catch (e) {} }, click: () => { const g0 = W.gen; setTimeout(() => { if (W.active && W.gen === g0) W.open("sail"); }, 30); } };
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
    if ((ENV.lavender || []).length) ["#f2c94c", "#ffffff", "#e8833a", "#7ec8e3"].forEach((c, k) => { const b = makeButterfly(c); site.add(b); L.bfly.push({ g: b, i: k, t: rr(0, 9), p: ENV.lavender[(k * 37) % ENV.lavender.length].clone() }); });
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
    const mt = canvasTex(512, 128, (gg, w, h) => { for (let k = 0; k < 60; k++) { const x = rand() * w, y = h * rr(.3, .7), r = rr(30, 90); const gr = gg.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); gg.fillStyle = gr; gg.fillRect(x - r, y - r, 2 * r, 2 * r); }
      /* lágy szélek: a sáv széle felé elhalványul (különben téglalap rajzolódna ki) */
      gg.globalCompositeOperation = "destination-in"; const mx = gg.createLinearGradient(0, 0, w, 0); mx.addColorStop(0, "rgba(0,0,0,0)"); mx.addColorStop(.25, "rgba(0,0,0,1)"); mx.addColorStop(.75, "rgba(0,0,0,1)"); mx.addColorStop(1, "rgba(0,0,0,0)"); gg.fillStyle = mx; gg.fillRect(0, 0, w, h);
      const my = gg.createLinearGradient(0, 0, 0, h); my.addColorStop(0, "rgba(0,0,0,0)"); my.addColorStop(.4, "rgba(0,0,0,1)"); my.addColorStop(.6, "rgba(0,0,0,1)"); my.addColorStop(1, "rgba(0,0,0,0)"); gg.fillStyle = my; gg.fillRect(0, 0, w, h); gg.globalCompositeOperation = "source-over"; });
    L.mist = [];
    for (let k = 0; k < 10; k++) { const a = rr(-1.6, 1.6), d = rr(25, 140); const m = mesh(new THREE.PlaneGeometry(rr(60, 120), rr(4, 8)), basic({ map: mt, transparent: true, depthWrite: false, opacity: 0, fog: false }), site);
      m.position.set(Math.sin(a) * d, WATER_Y + rr(.6, 2.2), -Math.cos(a) * d); m.rotation.y = -a; m.renderOrder = 3; m.visible = false; L.mist.push(m); }
    const dpp = new THREE.Points(dust, dM); dpp.frustumCulled = false; site.add(dpp); L.dust = dM;
  }
  const _v3a = new THREE.Vector3(), _v3b = new THREE.Vector3();
  function lifeTick(dt) {
    const L = ENV.life; if (!L) return; const t = W.t;
    L.swans.forEach((s) => { const sw = s.sw;
      /* viselkedés: úszik (S-nyak), néha éber, táplálkozik vagy tollászkodik; a tempó lábtempónként lüktet */
      s.next -= dt; if (s.next < 0) { const r0 = rand(); sw.mode = sw.cyg ? (r0 < .5 ? 2 : 0) : r0 < .38 ? 2 : r0 < .6 ? 3 : r0 < .8 ? 1 : 0; s.next = sw.mode === 2 ? rr(4, 7) : sw.mode === 3 ? rr(3, 5) : rr(6, 14); if (sw.mode !== 0) s.back = 1; }
      if (s.back && s.next < .01) { sw.mode = 0; s.back = 0; }
      const tgtB = [0, 0, 0, 0]; tgtB[sw.mode] = 1; for (let k = 0; k < 4; k++) sw.blend[k] += (tgtB[k] - sw.blend[k]) * Math.min(1, dt * (sw.mode === 2 ? 1.6 : 1.1));
      const feed = sw.blend[2], stroke = .75 + .45 * Math.max(0, Math.sin(t * 2.4 + s.ph)), spd = (1 - feed * .85) * stroke;
      s.a += s.sp * dt * spd; const x = s.cx + Math.cos(s.a) * s.r, z = s.cz + Math.sin(s.a) * s.r * .8;
      s.g.position.set(x, WATER_Y - .02 + Math.sin(t * 1.3 + s.ph) * .012 - feed * .03, z); s.g.rotation.y = Math.atan2(-Math.sin(s.a) * s.sp, -(Math.cos(s.a) * s.sp * .8)) + Math.PI;
      sw.pivot.rotation.x = -feed * 1.05 + (stroke - .95) * .02;   /* táplálkozáskor előrebukik, a farka az ég felé áll */
      sw.pivot.position.y = feed * .1; sw.pivot.rotation.z = Math.sin(t * 1.1 + s.ph) * .025;
      s.g.updateMatrixWorld(true); swanPose(sw, t, s.ph);
      sw.wake.material.opacity = .22 * spd * (1 - feed); sw.wake.scale.set(1, .8 + spd * .4, 1);
      if (feed > .6 && !s.dip) { s.dip = 1; ringAt(x - Math.sin(s.g.rotation.y) * .7 * s.g.scale.x, z - Math.cos(s.g.rotation.y) * .7 * s.g.scale.x); } if (feed < .3) s.dip = 0; });
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
      if (!f.on && f.t < 0) { f.on = true; f.u = 0; f.h = rr(.4, .8); f.tw = rand() < .5 ? -1 : 1; const a = rr(-2.2, 2.2), r = rr(8, 26); f.x = Math.sin(a) * r; f.z = -Math.cos(a) * r; f.d = rr(0, TAU); f.g.visible = true; ringAt(f.x, f.z); }
      if (f.on) { f.u += dt * 1.25; const u = Math.min(f.u, 1), H = f.h || .6; f.g.position.set(f.x + Math.cos(f.d) * u * 1.1, WATER_Y - .08 + Math.sin(u * Math.PI) * H, f.z + Math.sin(f.d) * u * 1.1);
        /* a hal teste követi a röppályát (orral ki, ívben át, orral vissza), közben megcsavarodik és a farka csapkod */
        f.g.rotation.set(Math.atan2(Math.cos(u * Math.PI) * H * Math.PI, 1.1), Math.atan2(-Math.cos(f.d), -Math.sin(f.d)), Math.sin(u * Math.PI) * .5 * f.tw, "YXZ"); f.g.userData.tail.rotation.y = Math.sin(W.t * 28) * .5;
        if (!f.drop0) { f.drop0 = 1; dropsAt(f.g.position.x, f.g.position.z, 14); }
        if (f.u >= 1) { f.on = false; f.g.visible = false; f.drop0 = 0; f.t = rr(4, 14); ringAt(f.g.position.x, f.g.position.z); dropsAt(f.g.position.x, f.g.position.z, 22); try { plop(); } catch (e) {} } }
    });
    dropsTick(dt);
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
  /* vízcseppek a kiugró hal körül: apró, csillanó pontok röppályán */
  function dropsAt(x, z, n) { const L = ENV.life; if (!L.drops) { const N = 160, gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3)); const pm = new THREE.PointsMaterial({ color: "#eef8ff", size: .045, transparent: true, opacity: .9, depthWrite: false }); W.disposables.push(gg, pm); const pts = new THREE.Points(gg, pm); pts.frustumCulled = false; ENV.site.add(pts); L.drops = { gg, pts, v: [], k: 0, N }; }
    const D = L.drops; for (let i = 0; i < n; i++) { const a = rand() * TAU, sp = rr(.4, 1.4); D.v[D.k] = { x, y: WATER_Y + .02, z, vx: Math.cos(a) * sp, vy: rr(1.2, 2.6), vz: Math.sin(a) * sp, t: 0 }; D.k = (D.k + 1) % D.N; } }
  function dropsTick(dt) { const D = ENV.life && ENV.life.drops; if (!D) return; const a = D.gg.attributes.position.array;
    for (let i = 0; i < D.N; i++) { const q = D.v[i]; if (!q || q.y < WATER_Y - .05) { a[i * 3 + 1] = -999; continue; } q.t += dt; q.vy -= 9.8 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; a[i * 3] = q.x; a[i * 3 + 1] = q.y; a[i * 3 + 2] = q.z; }
    D.gg.attributes.position.needsUpdate = true; }
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
    buildGardenIsland(site);   /* 2026. nov. 9.: kertsziget (előtte: regatta-bója, még előbb nyolcszögletű stég) */
    const keep = ENV.glows; buildShore(site); ENV.glows = keep.concat(ENV.glows.filter((q) => !keep.includes(q)));
    buildLife(site);
    /* (a bója körüli verseny és a jelenetek a kertszigettel megszűntek) */
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

  /* =================================================================== 3/C. A REGATTA-BÓJA (2026. nov. 6., a tulajdonos kérésére – a régi nyolcszögletű stég és a merülés helyett)
     • Egy nagy, narancs versenybóján (felső része tíkfa fedélzet korláttal, paddal, zászlórúddal, távcsővel) ülsz a Balaton közepén, a stégjátékok kis
       vitorlásversenyének helyszínén – életnagyságban. A makett az asztalon előtted.
     • Körülötted hat versenyhajó kerüli a bóját (a szél a part felől fúj: cirkálva jönnek feléd a nyílt víz felől, a bójánál spinakkert húznak, és elfutnak).
     • Időnként „jelenetek”, mint a stégjáték kis regattájában: a Titanic jéghegynek ütközik és elsüllyed (mentőcsónakok), tengeri szörny bukkan fel,
       mentőhelikopter húz ki egy borult hajóst, lapátkerekes gőzös dudál, rendőrmotoros száguld szirénával, repülő húz transzparenst, tengeralattjáró emelkedik ki.
     Koordináták: a site-ban (a bója közepe (0,0,0,55), a fedélzet y = 0, a víz y = WATER_Y). A szél felé mutató irány: +z (a part); a nyílt víz −z. */
  const BJ = {};
  const BUOY_C = new THREE.Vector3(0, 0, .55), BUOY_R = 2.9;
  /* ------------------------------------------------------------------ a bója-színpad */
  function buildBuoyStage(site) {
    const g = new THREE.Group(); site.add(g); ENV.deck = g; ENV.postPos = []; ENV.lavender = []; ENV.lanterns = []; ENV.walk = null;
    g.position.set(BUOY_C.x, 0, BUOY_C.z);
    const orange = std({ color: "#ff6410", roughness: .48, metalness: .02 }), white = std({ color: "#f4f4f0", roughness: .35 }), rubber = std({ color: "#1d2026", roughness: .85 });
    const steel = std({ color: "#dfe4e8", roughness: .18, metalness: .95 });
    /* a test: enyhén domború, felfújt hatású henger (a vízvonal alatt is látszik valamennyi a tiszta vízben) */
    const prof = []; for (let i = 0; i <= 14; i++) { const v = i / 14, y = -1.75 + v * 1.65; prof.push(new THREE.Vector2(BUOY_R - .35 + Math.sin(v * Math.PI) * .38 + v * .12, y)); }
    const body = mesh(new THREE.LatheGeometry(prof, 64), orange, g); body.castShadow = true; body.receiveShadow = true;
    /* fényvisszaverő fehér sáv + a „1” jelölés kétszer, ZEPHYR felirat */
    const band = mesh(new THREE.CylinderGeometry(BUOY_R + .07, BUOY_R + .07, .26, 64, 1, true), std({ color: "#ffffff", roughness: .25, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0 }), g); band.position.y = -.42; ENV.glows.push({ mat: band.material, k: .25 });
    const markT = canvasTex(1024, 128, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = "#14161b"; gg.font = "900 104px system-ui, sans-serif"; gg.textAlign = "center"; gg.textBaseline = "middle";
      ["1", "ZEPHYR", "1", "ZEPHYR"].forEach((t2, i) => gg.fillText(t2, (i + .5) * w / 4, h / 2 + 6)); });
    const mk = mesh(new THREE.CylinderGeometry(BUOY_R + .02, BUOY_R + .03, .5, 64, 1, true), basic({ map: markT, transparent: true, depthWrite: false }), g); mk.position.y = -1.0;
    /* gumi ütköző a perem körül, alatta acél fogantyúk */
    const fend = mesh(new THREE.TorusGeometry(BUOY_R + .05, .09, 10, 72), rubber, g); fend.rotation.x = Math.PI / 2; fend.position.y = -.12;
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; const h = mesh(new THREE.TorusGeometry(.12, .018, 6, 12, Math.PI), steel, g); h.position.set(Math.cos(a) * (BUOY_R + .1), -.62, Math.sin(a) * (BUOY_R + .1)); h.rotation.set(0, -a + Math.PI / 2, Math.PI); }
    /* tíkfa fedélzet: koncentrikus „hajópalló” mintával, fehér fugákkal */
    const teak = canvasTex(1024, 1024, (gg, w, h) => { gg.fillStyle = "#8a6239"; gg.fillRect(0, 0, w, h);
      /* valódi tíkfedélzet: ~12 cm-es deszkák, vékony fekete gumi tömítéssel, a deszkavégeken eltolt illesztésekkel, a peremen hajlított „margó” deszka */
      for (let y = 0, j = 0; y < h; y += 22, j++) { const off = (j * 137) % 300;
        for (let x = -off; x < w; x += 300) { gg.fillStyle = `hsl(${rr(26, 31)},${rr(36, 48)}%,${rr(36, 46)}%)`; gg.fillRect(x, y, 298, 20); for (let k = 0; k < 9; k++) { gg.fillStyle = `rgba(60,32,14,${rr(.06, .16)})`; gg.fillRect(x + rand() * 280, y + rr(2, 18), rr(40, 160), 1.2); } gg.fillStyle = "#17140f"; gg.fillRect(x + 298, y, 2, 20); }
        gg.fillStyle = "#17140f"; gg.fillRect(0, y + 20, w, 2); }
      gg.strokeStyle = "#8a5a32"; gg.lineWidth = 36; gg.beginPath(); gg.arc(w / 2, h / 2, w / 2 - 18, 0, TAU); gg.stroke(); gg.strokeStyle = "#17140f"; gg.lineWidth = 2; gg.beginPath(); gg.arc(w / 2, h / 2, w / 2 - 37, 0, TAU); gg.stroke(); });
    const top = mesh(new THREE.CylinderGeometry(BUOY_R - .02, BUOY_R - .02, .1, 64), std({ map: teak, roughness: .7 }), g); top.position.y = -.05; top.receiveShadow = true; ENV.deckTop = top;
    /* korlát: 14 rozsdamentes oszlop, két sor fehér kötél (a pad mögött is) */
    const RR = BUOY_R - .22, posts = [], rope = [];
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + .11; posts.push(rodGeom(new THREE.Vector3(Math.cos(a) * RR, 0, Math.sin(a) * RR), new THREE.Vector3(Math.cos(a) * RR, .82, Math.sin(a) * RR), .022, 8)); posts.push([new THREE.SphereGeometry(.035, 10, 8), M4(Math.cos(a) * RR, .83, Math.sin(a) * RR)]); }
    mesh(mergeGeoms(posts), steel, g);
    [.8, .45].forEach((y) => { const r2 = mesh(new THREE.TorusGeometry(RR, .016, 6, 96), std({ color: "#f2efe4", roughness: .8 }), g); r2.rotation.x = Math.PI / 2; r2.position.y = y; });
    /* párnázott, íves pad hátul (rajta „ülünk”), sötétkék huzat fehér paszpollal */
    const cush = std({ color: "#1d3a64", roughness: .85 }), pip = std({ color: "#f4f1e6", roughness: .6 }), wood = std({ map: txPlanks("benchB", "#7a5534", "#94683f", 5), roughness: .6 });
    /* a pad: íves körcikk-alak (a bója peremét követi), lekerekített párnák, varrott paszpol; a háttámla enyhén hátradől */
    const arc = (r0, r1, a0, a1) => { const s2 = new THREE.Shape(); s2.absarc(0, 0, r1, a0, a1, false); s2.absarc(0, 0, r0, a1, a0, true); s2.closePath(); return s2; };
    const A0 = Math.PI / 2 - .42, A1 = Math.PI / 2 + .42, R1 = RR - .42;
    const sector = (r0, r1, h, y, bev, mat2) => { const ge = new THREE.ExtrudeGeometry(arc(r0, r1, A0, A1), { depth: h, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 40 }); ge.rotateX(Math.PI / 2); ge.translate(0, y + h, 0); const m2 = mesh(ge, mat2, g); m2.castShadow = true; m2.receiveShadow = true; return m2; };
    sector(R1 - .25, R1 + .25, .38, 0, 0, wood);
    sector(R1 - .23, R1 + .2, .07, .4, .025, cush);
    { const bk = sector(R1 + .17, R1 + .27, .4, .5, .03, cush); bk.rotation.x = 0; }
    sector(R1 - .255, R1 - .235, .012, .47, 0, pip);
    /* zászlórúd a bója jobb hátsó részén: versenyrendezői „1”-es tábla, magyar zászló, Zephyr-fecskefarkú; csúcsán jelzőlámpa */
    const pole = new THREE.Group(); g.add(pole); pole.position.set(Math.cos(.55) * (RR - .1), 0, Math.sin(.55) * (RR - .1));
    mesh(new THREE.CylinderGeometry(.03, .045, 5.2, 10), steel, pole).position.y = 2.6;
    const lampM = std({ color: "#fff6dd", emissive: new THREE.Color("#ffcf7a"), emissiveIntensity: 0, roughness: .3 }); const lamp = mesh(new THREE.SphereGeometry(.08, 14, 10), lampM, pole); lamp.position.y = 5.26; ENV.glows.push({ mat: lampM, k: 3 });
    BJ.flags = [];
    const flag = (draw, w, h, y) => { const geo = new THREE.PlaneGeometry(w, h, 12, 2); geo.translate(w / 2, 0, 0); const t2 = canvasTex(256, Math.round(256 * h / w), draw);
      const f = mesh(geo, std({ map: t2, side: THREE.FrontSide, roughness: .8, alphaTest: .5 }), pole); f.position.y = y; f.rotation.y = Math.PI / 2 + .3; f.castShadow = true;
      /* hátoldal külön, tükrözött textúrával – így a felirat hátulról sem fordított (ZEPHYR, nem „ЯYHPEZ”) */
      const t3 = t2.clone(); t3.wrapS = THREE.RepeatWrapping; t3.repeat.x = -1; t3.offset.x = 1; t3.needsUpdate = true;
      mesh(geo, std({ map: t3, side: THREE.BackSide, roughness: .8, alphaTest: .5 }), f);
      const base = Float32Array.from(geo.attributes.position.array); BJ.flags.push({ geo, base, w, ph: rand() * 9 }); return f; };
    flag((gg, w, h) => { ["#ce2939", "#ffffff", "#477050"].forEach((c, i) => { gg.fillStyle = c; gg.fillRect(0, i * h / 3, w, h / 3 + 1); }); }, 1.2, .8, 4.75);
    flag((gg, w, h) => { gg.fillStyle = "#0b2f5e"; gg.beginPath(); gg.moveTo(0, 0); gg.lineTo(w, 0); gg.lineTo(w * .78, h / 2); gg.lineTo(w, h); gg.lineTo(0, h); gg.fill(); gg.fillStyle = "#ffd166"; gg.font = "800 46px Georgia, serif"; gg.textBaseline = "middle"; gg.fillText("ZEPHYR", 14, h / 2 + 2); }, 1.3, .55, 3.95);
    { const bd = canvasTex(256, 256, (gg, w, h) => { gg.fillStyle = "#ff7a00"; gg.fillRect(0, 0, w, h); gg.strokeStyle = "#14161b"; gg.lineWidth = 14; gg.strokeRect(10, 10, w - 20, h - 20); gg.fillStyle = "#14161b"; gg.font = "900 200px system-ui, sans-serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("1", w / 2, h / 2 + 12); });
      [0, Math.PI].forEach((ry) => { const b = mesh(new THREE.PlaneGeometry(.55, .55), std({ map: bd, roughness: .6 }), pole); b.position.set(0, 3.0, 0); b.rotation.y = ry + .55; b.translateZ(.04); }); }
    /* távcső az első korlátnál (rámutatva: a Balaton látnivalói a láthatáron) */
    const tel = new THREE.Group(); g.add(tel); tel.position.set(-1.55, 0, -1.75);
    const brass = std({ color: "#c9a24a", roughness: .3, metalness: .85 }), blk = std({ color: "#1b1d22", roughness: .4, metalness: .4 });
    [0, 1, 2].forEach((k) => { const a = k / 3 * TAU; rodBetween(new THREE.Vector3(Math.cos(a) * .26, 0, Math.sin(a) * .26), new THREE.Vector3(0, 1.1, 0), .016, blk, tel); });
    const piv = new THREE.Group(); tel.add(piv); piv.position.y = 1.15; const tube = mesh(new THREE.CylinderGeometry(.045, .065, .7, 16), brass, piv); tube.rotation.set(Math.PI / 2 - .08, 0, 0); tube.position.set(0, .05, -.1);
    piv.rotation.y = -((296 - 345) * D2R);
    ENV.telescope = tel; const hitT = mesh(new THREE.BoxGeometry(.6, 1.5, .6), basic({ visible: false }), tel); hitT.position.y = .75; ENV.telHit = hitT;
    /* mentőöv a korláton, kötéltekercs, kis hűtőtáska – hogy „lakott” legyen */
    const ring = mesh(new THREE.TorusGeometry(.3, .07, 10, 28), std({ color: "#ff5a1f", roughness: .6 }), g); ring.position.set(1.95, .55, -1.55); ring.rotation.set(0, .85, 0);
    [0, 1, 2, 3].forEach((k) => { const s = mesh(new THREE.TorusGeometry(.305, .072, 6, 6, Math.PI / 6), white, g); s.position.copy(ring.position); s.rotation.set(0, .85, k * Math.PI / 2 + .2); });
    const coil = mesh(new THREE.TorusGeometry(.17, .045, 8, 20), std({ color: "#e9e1c8", roughness: .9 }), g); coil.rotation.x = Math.PI / 2; coil.position.set(-1.9, .05, .9);
    /* a víz találkozása: habgyűrű a bója körül (lélegzik a hullámmal) */
    const foamT = canvasTex(256, 32, (gg, w, h) => { const gr = gg.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(1, "rgba(255,255,255,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, w, h); for (let k = 0; k < 220; k++) { gg.fillStyle = "rgba(255,255,255,.7)"; gg.fillRect(rand() * w, rand() * h * .6, rr(2, 6), 2); } });
    foamT.wrapS = THREE.RepeatWrapping; foamT.repeat.set(10, 1);
    const fg = new THREE.RingGeometry(BUOY_R + .02, BUOY_R + .9, 64, 1); fg.rotateX(-Math.PI / 2); { const uv = fg.attributes.uv, p = fg.attributes.position; for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)); uv.setXY(i, (Math.atan2(p.getZ(i), p.getX(i)) / TAU + .5), (r - BUOY_R) / .9); } }
    const foam = mesh(fg, basic({ map: foamT, transparent: true, depthWrite: false, opacity: .7 }), g); foam.position.y = WATER_Y + .02; foam.renderOrder = 3; BJ.foam = foam;
    /* horgonylánc a mélybe (a tiszta vízben lefelé nézve látszik) */
    { const links = []; for (let k = 0; k < 18; k++) links.push([new THREE.TorusGeometry(.07, .018, 5, 10), M4(.4 + k * .12, -1.8 - k * .32, -.3 - k * .1, k % 2 ? Math.PI / 2 : 0, 0, .35)]); mesh(mergeGeoms(links), std({ color: "#5a5f66", roughness: .5, metalness: .7 }), g); }
    return g;
  }

  /* ------------------------------------------------------------------ ÉLETNAGYSÁGÚ VERSENY A BÓJA KÖRÜL */
  const RF = new THREE.Vector3(0, 0, 1), RRv = new THREE.Vector3(-1, 0, 0);   /* szél felé (a part) és jobbra */
  const RP = (f, r, v) => (v || new THREE.Vector3()).set(0, 0, 0).addScaledVector(RF, f).addScaledVector(RRv, r);
  /* a pálya: a mi bójánk a szél felőli jel (f = 0); 230 m-rel a nyílt víz felé a hátszeles kapu. Bójakerülés bal kézzel (a bója a hajó bal oldalán marad). */
  const RLEGS = [{ id: "W1", f: -3, r: 14, rad: 5, up: true }, { id: "W2", f: 14, r: -5, rad: 5 }, { id: "L1", f: -232, r: -14, rad: 12 }, { id: "L2", f: -240, r: 4, rad: 10 }];
  function buildBuoyRace(site) {
    const g = new THREE.Group(); site.add(g); g.position.y = WATER_Y; BJ.race = g;
    /* a hátszeles kapu két sárga bójája és egy messzi rendezőhajó (a pálya „háttere”) */
    [[-230, -20], [-230, 20]].forEach(([f, r]) => { const b = makeBuoy("#ffd166", 2.1); b.position.copy(RP(f, r)); g.add(b); });
    const cb = makeCommittee(); cb.position.copy(RP(-150, 70)); cb.rotation.y = Math.PI / 2 + .3; g.add(cb); cb.userData.flags.forEach((f, i) => { f.visible = i === 1 || i === 2; });
    const pick = [0, 1, 2, 4, 6, 7];   /* a regatta hajói közül hat (a Zephyr is köztük) */
    BJ.boats = pick.map((bi, i) => {
      const b = BOATS[bi], bg = makeBoat(Object.assign({ detail: 0, crew: 3 }, b)); g.add(bg);
      const wk = makeWake(g, .6);
      const hit = mesh(new THREE.BoxGeometry(4, 13, 10), basic({ visible: false }), bg); hit.position.y = 6;
      const lg = rand() < .5 ? 0 : 2;
      const st = { i, b, g: bg, wk, hit, f: lg === 0 ? rr(-215, -30) : rr(-200, -40), r: rr(-50, 50), hd: lg === 0 ? (i % 2 ? 1 : -1) * .77 : Math.PI + (i % 2 ? .4 : -.4), v: 2.6, leg: lg, tack: i % 2 ? 1 : -1, spin: lg === 2 ? 1 : 0, ph: rand() * 9, laps: 0, lastTack: 0 };
      hit.userData.xr = { hover: (on) => { if (on) showTip(bg, "⛵ " + b.name + " · " + b.num, raceLine(st)); else showTip(null); } };
      T.xr.extra.add(hit); W.objs.push(hit);
      return st;
    });
    BJ.gulls = makeGulls(g);   /* sirályok köröznek a bója fölött */
    BJ.t = 0; BJ.next = 22; BJ.cur = null; BJ.queue = []; BJ.events = {};
    return g;
  }
  function raceLine(st) { const L = RLEGS[st.leg]; return L.id[0] === "W" ? (st.spin > .5 ? "spinakkerrel fut" : "cirkál a bója felé – szél ellen, cikcakkban") : "hátszélben, spinakkerrel a kapu felé"; }
  const _rv = new THREE.Vector3(), _rv2 = new THREE.Vector3();
  function raceTick(dt) {
    if (!BJ.boats) return;
    const t = W.t;
    BJ.boats.forEach((st) => {
      const L = RLEGS[st.leg], df = L.f - st.f, dr = L.r - st.r, dist = Math.hypot(df, dr);
      const brg = Math.atan2(dr, df);
      let want = brg;
      const up = Math.abs(brg) < 44 * D2R, down = Math.abs(brg) > 150 * D2R;
      if (up) {   /* cirkálás: halzon a laylinig, majd forduló (legalább 9 mp két forduló között) */
        want = st.tack * 44 * D2R;
        const other = -st.tack * 44 * D2R;
        if (t - st.lastTack > 9 && ((st.tack > 0 && brg <= other + 2 * D2R) || (st.tack < 0 && brg >= other - 2 * D2R) || (Math.abs(st.r) > 120 && Math.sign(st.r) === st.tack))) { st.tack = -st.tack; want = st.tack * 44 * D2R; st.lastTack = t; if (dist < 70) try { flap(.05); } catch (e) {} }
      } else if (down) {
        want = st.tack * 150 * D2R;
        const other = -st.tack * 150 * D2R;
        if (t - st.lastTack > 9 && ((st.tack > 0 && brg < 0 && brg >= other - 3 * D2R) || (st.tack < 0 && brg > 0 && brg <= other + 3 * D2R) || (Math.abs(st.r) > 110 && Math.sign(st.r) === st.tack))) { st.tack = -st.tack; want = st.tack * 150 * D2R; st.lastTack = t; }
      }
      /* egymás és a mi bójánk kerülése */
      { const db = Math.hypot(st.f, st.r); if (db < 13) want += (Math.atan2(-st.r, -st.f) > st.hd ? -1 : 1) * .7 * (1 - db / 13); }   /* a bóját (rajta állsz!) 10 m-nél közelebb nem súrolják */
      BJ.boats.forEach((o) => { if (o === st) return; const ddf = o.f - st.f, ddr = o.r - st.r, d = Math.hypot(ddf, ddr); if (d < 16) want += (Math.atan2(ddr, ddf) > st.hd ? -1 : 1) * .3 * (1 - d / 16); });
      { const d0 = Math.hypot(st.f, st.r); if (d0 < 9) want += (Math.atan2(-st.r, -st.f) > st.hd ? -1 : 1) * .6 * (1 - d0 / 9); }
      st.hd += clamp(wrapA(want - st.hd), -.35 * dt, .35 * dt);
      const twa = Math.abs(wrapA(st.hd)) * R2D;
      st.spin += ((twa > 112 ? 1 : 0) - st.spin) * Math.min(1, dt * .3);
      const vt = polar(twa, st.spin > .5) * KN * st.b.skill;
      st.v += (vt - st.v) * Math.min(1, dt / 6);
      st.f += Math.cos(st.hd) * st.v * dt; st.r += Math.sin(st.hd) * st.v * dt;
      { const d0 = Math.hypot(st.f, st.r), RM = 9.5; if (d0 < RM) { const k = RM / Math.max(d0, .01); st.f *= k; st.r *= k; } }   /* kemény határ: a hajótest sosem ér a bójához (rajta állsz) */
      if (dist < L.rad) { st.leg = (st.leg + 1) % RLEGS.length; if (st.leg === 0) st.laps++; if (L.id === "W2" && Math.hypot(st.f, st.r) < 30) try { winch(); } catch (e) {} }
      /* megjelenítés (a regatta világ hajóival azonos módon) */
      const p = RP(st.f, st.r, _rv), dirW = RP(Math.cos(st.hd), Math.sin(st.hd), _rv2);
      st.g.position.set(p.x, Math.sin(t * 1.7 + st.ph) * .05, p.z);
      st.g.rotation.y = Math.atan2(dirW.x, dirW.z);
      const S = st.g.userData.S, yaw = st.g.rotation.y, X = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      S.side = RF.dot(X) > 0 ? -1 : 1;
      S.boom = clamp((twa - 28) * .78, 7, 82) * D2R * S.side; S.jib = clamp((twa - 28) * .55, 8, 52) * D2R; S.luff = clamp(1 - (twa - 18) / 18, 0, 1); S.spin = st.spin;
      const heel = clamp(Math.sin(clamp(twa, 0, 180) * D2R) ** 1.4 * (st.v / 3.4) * 20 * (1 - st.spin * .6), 0, 24) * D2R;
      S.heel = -S.side * heel; S.pitch = Math.sin(t * 1.3 + st.ph) * .025;
      /* távol (> 140 m) ritkábban frissítjük a vitorlákat – Quest 2-n sokat számít */
      st.g.userData.update(dt);
      st.wk.push(p.x, p.z, Math.atan2(dirW.x, dirW.z), st.v, dt, .04);
    });
    /* zászlók lobogása, habgyűrű */
    (BJ.flags || []).forEach((F) => { const a = F.geo.attributes.position.array, b = F.base; for (let i = 0; i < a.length; i += 3) { const u = b[i] / F.w; a[i + 2] = b[i + 2] + Math.sin(t * 6.5 - b[i] * 5 + F.ph) * .1 * u + Math.sin(t * 11 - b[i] * 9) * .025 * u; a[i + 1] = b[i + 1] - u * u * .05; } F.geo.attributes.position.needsUpdate = true; });
    if (BJ.gulls) BJ.gulls.tick(dt, 0, 40);
    if (BJ.foam) { BJ.foam.material.opacity = .45 + .25 * Math.sin(t * 1.3); BJ.foam.material.map.offset.x = t * .01; }
  }

  /* ------------------------------------------------------------------ JELENETEK – a stégjáték kis regattájának eseményei életnagyságban */
  /* közös segédek: hangok (távolság szerint halkítva), füst, habgyűrűk */
  function evAudio() { const a = T.ac && T.ac(); return a && a.state !== "closed" ? a : null; }
  function loopSnd(kind) {   /* folyamatos hang: rotor, motor, propeller, sziréna; set(hangerő, sebesség) */
    const a = evAudio(); if (!a) return { set() {}, stop() {} };
    const out = T.outBus(), g = a.createGain(); g.gain.value = 0; g.connect(out);
    let src, lfo, nodes = [];
    if (kind === "rotor") { src = a.createBufferSource(); src.buffer = T.noiseBuf(4); src.loop = true; const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 380; const am = a.createGain(); am.gain.value = .5;
      lfo = a.createOscillator(); lfo.frequency.value = 17; const lg = a.createGain(); lg.gain.value = .5; lfo.connect(lg).connect(am.gain); src.connect(f).connect(am).connect(g); src.start(); lfo.start(); nodes = [src, lfo]; }
    else if (kind === "engine" || kind === "prop") { const o1 = a.createOscillator(), o2 = a.createOscillator(); o1.type = "sawtooth"; o2.type = "square"; o1.frequency.value = kind === "prop" ? 92 : 58; o2.frequency.value = kind === "prop" ? 46 : 87;
      const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = kind === "prop" ? 900 : 520; const m2 = a.createGain(); m2.gain.value = .25; o1.connect(f); o2.connect(m2).connect(f); f.connect(g); o1.start(); o2.start(); nodes = [o1, o2]; src = { o1, o2 }; }
    else if (kind === "rain") { src = a.createBufferSource(); src.buffer = T.noiseBuf(4); src.loop = true; const f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1200; const f2 = a.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 7000; src.connect(f).connect(f2).connect(g); src.start(); nodes = [src]; src = null; }
    else if (kind === "siren") { const o = a.createOscillator(); o.type = "triangle"; o.frequency.value = 700; lfo = a.createOscillator(); lfo.type = "square"; lfo.frequency.value = .9; const lg = a.createGain(); lg.gain.value = 160; lfo.connect(lg).connect(o.frequency); o.connect(g); o.start(); lfo.start(); nodes = [o, lfo]; }
    return { set(v, rate) { try { g.gain.setTargetAtTime(Math.max(0, v), a.currentTime, .15); if (src && src.o1 && rate) { src.o1.frequency.setTargetAtTime((kind === "prop" ? 92 : 58) * rate, a.currentTime, .2); src.o2.frequency.setTargetAtTime((kind === "prop" ? 46 : 87) * rate, a.currentTime, .2); } } catch (e) {} },
      stop() { try { g.gain.setTargetAtTime(0, a.currentTime, .3); setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch (e) {} }); try { g.disconnect(); } catch (e) {} }, 1500); } catch (e) {} } };
  }
  function boom(vol, freq, dur) {   /* robaj / csobbanás / ütközés: szűrt zajlöket */
    const a = evAudio(); if (!a) return; const t0 = a.currentTime, s = a.createBufferSource(); s.buffer = T.noiseBuf(dur || 1.5); const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq || 400; const g = a.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol || .3, t0 + .02); g.gain.exponentialRampToValueAtTime(.001, t0 + (dur || 1.5)); s.connect(f).connect(g).connect(T.outBus()); s.start(); s.stop(t0 + (dur || 1.5) + .1);
  }
  function roar(vol) {   /* a szörny üvöltése: mély, recsegő fűrészfog + zaj, lefelé hajló hangmagasság */
    const a = evAudio(); if (!a) return; const t0 = a.currentTime, g = a.createGain(), f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700; f.Q.value = 4;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol || .3, t0 + .25); g.gain.setValueAtTime(vol || .3, t0 + 1.6); g.gain.exponentialRampToValueAtTime(.001, t0 + 2.6);
    [70, 73.5, 104].forEach((fq) => { const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(fq * 1.4, t0); o.frequency.exponentialRampToValueAtTime(fq * .7, t0 + 2.4); o.connect(f); o.start(t0); o.stop(t0 + 2.7); });
    f.frequency.setValueAtTime(1300, t0); f.frequency.exponentialRampToValueAtTime(350, t0 + 2.4); f.connect(g).connect(T.outBus()); boom((vol || .3) * .5, 900, 2.2);
  }
  function deepHorn(dur, vol, f0) {   /* óceánjáró / gőzös gőzkürtje */
    const a = evAudio(); if (!a) return; const t0 = a.currentTime, g = a.createGain(), lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 800;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .3); g.gain.setValueAtTime(vol, t0 + dur - .4); g.gain.linearRampToValueAtTime(0, t0 + dur);
    [f0, f0 * 1.26, f0 * 1.5].forEach((fq, i) => { const o = a.createOscillator(); o.type = i ? "sawtooth" : "square"; o.frequency.value = fq; const og = a.createGain(); og.gain.value = i === 2 ? .2 : .4; o.connect(og).connect(lp); o.start(t0); o.stop(t0 + dur + .1); });
    lp.connect(g).connect(T.outBus());
  }
  const distVol = (p, k) => { const hw = ENV.site.worldToLocal(headWorld(new THREE.Vector3())); return clamp(k / Math.max(8, hw.distanceTo(p)), 0, 1); };
  /* füst: puha, átlátszó gömbsprite-ok (közös készlet) */
  function smokePool(parent, n, col) {
    const tex = canvasTex(64, 64, (gg) => { const gr = gg.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,.85)"); gr.addColorStop(1, "rgba(255,255,255,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64); });
    const list = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(sprM({ map: tex, transparent: true, depthWrite: false, color: col || "#5a5a5a", opacity: 0, fog: true })); s.visible = false; parent.add(s); list.push({ s, t: 99, v: new THREE.Vector3() }); }
    let k = 0;
    return { emit(p, v, size) { const q = list[k++ % n]; q.s.position.copy(p); q.v.copy(v); q.t = 0; q.size = size || 2; q.s.visible = true; },
      tick(dt) { list.forEach((q) => { if (q.t > 8) { q.s.visible = false; return; } q.t += dt; q.s.position.addScaledVector(q.v, dt); q.v.multiplyScalar(1 - dt * .15); const k2 = q.t / 8; q.s.material.opacity = (1 - k2) * .55; q.s.scale.setScalar(q.size * (1 + q.t * .8)); }); },
      clear() { list.forEach((q) => { q.t = 99; q.s.visible = false; }); } };
  }
  /* habgyűrűk a vízen (csobbanás, buborék, rotorszél) */
  function ringPool(parent, n) {
    const tex = canvasTex(128, 128, (gg) => { gg.strokeStyle = "rgba(255,255,255,.9)"; gg.lineWidth = 9; gg.beginPath(); gg.arc(64, 64, 52, 0, TAU); gg.stroke(); gg.lineWidth = 3; gg.beginPath(); gg.arc(64, 64, 40, 0, TAU); gg.stroke(); });
    const list = []; for (let i = 0; i < n; i++) { const m = mesh(new THREE.PlaneGeometry(1, 1), basic({ map: tex, transparent: true, depthWrite: false, opacity: 0 }), parent); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; list.push({ m, t: 99 }); }
    let k = 0;
    return { emit(x, z, size, life) { const q = list[k++ % n]; q.m.position.set(x, .04, z); q.t = 0; q.size = size || 2; q.life = life || 3; q.m.visible = true; },
      tick(dt) { list.forEach((q) => { if (q.t > q.life) { q.m.visible = false; return; } q.t += dt; const k2 = q.t / q.life; q.m.scale.setScalar(q.size * (1 + k2 * 3)); q.m.material.opacity = (1 - k2) * .8; }); } };
  }
  /* egyszerű, színezett csúcsszínes összevonás egy csoportba (kevés rajzolási hívás) */
  function vcGroup(parts, parent, opt) {
    const by = {};
    parts.forEach(([geo, col, m4, key]) => { const c = new THREE.Color(col), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } geo.setAttribute("color", new THREE.BufferAttribute(a, 3)); (by[key || "s"] = by[key || "s"] || []).push([geo, m4 || new THREE.Matrix4()]); });
    const out = {};
    Object.keys(by).forEach((k) => { const mat = std(Object.assign({ vertexColors: true, roughness: k === "m" ? .3 : .6, metalness: k === "m" ? .6 : 0 }, k === "e" ? { emissive: new THREE.Color("#ffd27a"), emissiveIntensity: 0 } : {}, opt || {})); const m = mesh(mergeGeoms(by[k]), mat, parent); m.castShadow = k !== "e"; out[k] = m; });
    return out;
  }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), CY = (r1, r2, h, s) => new THREE.CylinderGeometry(r1, r2, h, s || 12);

  /* ---------- 1. A Titanic és a jéghegy ---------- */
  function evTitanic() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const ship = new THREE.Group(); root.add(ship);
    const L = 64, B = 7.2, parts = [];
    /* hajótest: hegyes orr, kerek tat – a vízvonal alatt vörös, fölötte fekete, fehér és arany díszcsík */
    const hullShape = (w) => { const s = new THREE.Shape(); s.moveTo(-L / 2 + 3, -w); s.lineTo(L / 2 - 9, -w); s.quadraticCurveTo(L / 2 - 1, -w * .7, L / 2 + 1.5, 0); s.quadraticCurveTo(L / 2 - 1, w * .7, L / 2 - 9, w); s.lineTo(-L / 2 + 3, w); s.quadraticCurveTo(-L / 2 - 1, w, -L / 2 - 1, 0); s.quadraticCurveTo(-L / 2 - 1, -w, -L / 2 + 3, -w); return s; };
    const ext = (w, h, y, col, key) => { const geo = new THREE.ExtrudeGeometry(hullShape(w), { depth: h, bevelEnabled: false, curveSegments: 10 }); geo.rotateX(-Math.PI / 2); geo.translate(0, y, 0); parts.push([geo, col, null, key]); };
    ext(B / 2 - .5, 2.4, -3.2, "#8e1b16"); ext(B / 2, 4.4, -.8, "#16181b"); ext(B / 2 + .02, .22, 3.3, "#f4f1e6"); ext(B / 2 + .025, .1, 2.8, "#c9a54a");
    /* felépítmény (két fedélzet ablakokkal), parancsnoki híd, mentőcsónakok a daru alatt */
    parts.push([BX(L * .66, 2.4, B - 1.4), "#f4f1e6", M4(-1, 4.8, 0)], [BX(L * .52, 2.0, B - 2.2), "#f1ece0", M4(-2, 7.0, 0)], [BX(5.5, 1.6, B - 1.6), "#f4f1e6", M4(L * .3, 7.0, 0)]);
    parts.push([BX(L * .67, .14, B - 1.2), "#8a5a32", M4(-1, 6.05, 0)], [BX(L * .53, .14, B - 2.0), "#8a5a32", M4(-2, 8.05, 0)]);
    const boatsP = []; [-18, -11, -4, 3, 10, 17].forEach((x, i) => [-1, 1].forEach((s) => { boatsP.push(new THREE.Vector3(x, 8.6, s * (B / 2 - .8))); parts.push([BX(4.2, .7, 1.3), "#f7f7f2", M4(x, 8.6, s * (B / 2 - .8))], [BX(.1, 1.4, .1), "#3a3d42", M4(x - 1.6, 8.9, s * (B / 2 - .4)), "m"], [BX(.1, 1.4, .1), "#3a3d42", M4(x + 1.6, 8.9, s * (B / 2 - .4)), "m"]); }));
    /* négy hátradöntött kémény (drapp, fekete perem) */
    const funnels = [-14, -4.5, 5, 14.5]; funnels.forEach((x) => { parts.push([CY(1.25, 1.35, 7.5, 18), "#d99a3a", M4(x, 11.5, 0, 0, 0, .1)], [CY(1.3, 1.3, 1.2, 18), "#121316", M4(x - .36, 15.3, 0, 0, 0, .1)]); });
    /* árbocok, kötélzet */
    parts.push([CY(.12, .16, 22, 6), "#5b3a22", M4(L * .36, 13, 0)], [CY(.12, .16, 20, 6), "#5b3a22", M4(-L * .38, 11, 0)]);
    [[L / 2 + 1.5, 3.4, L * .36, 23.5], [L * .36, 23.5, -L * .38, 20.5], [-L * .38, 20.5, -L / 2, 3.4]].forEach(([x0, y0, x1, y1]) => { const [gg, mm] = rodGeom(new THREE.Vector3(x0, y0, 0), new THREE.Vector3(x1, y1, 0), .03, 4); parts.push([gg.applyMatrix4(mm), "#c8c8c8"]); });
    /* horgonyok az orr két oldalán, tatzászló, fedélzeti korlátok */
    [-1, 1].forEach((sd) => parts.push([BX(.9, 1.2, .1), "#2a2c30", M4(L / 2 - 4, 2.0, sd * (B / 2 + .06)), "m"], [BX(1.4, .25, .1), "#2a2c30", M4(L / 2 - 4, 1.3, sd * (B / 2 + .06)), "m"]));
    parts.push([CY(.06, .06, 4, 6), "#5b3a22", M4(-L / 2 + .5, 5.4, 0)]);
    [[L * .67, 6.25, B - 1.2], [L * .53, 8.25, B - 2.0]].forEach(([len, y, w]) => [-1, 1].forEach((sd) => parts.push([BX(len, .05, .05), "#f4f1e6", M4(-1, y + .55, sd * w / 2)]))); 
    const M = vcGroup(parts, ship);
    const sflag = mesh(new THREE.PlaneGeometry(2.2, 1.4), std({ map: canvasTex(128, 80, (gg, w, h) => { gg.fillStyle = "#c8102e"; gg.fillRect(0, 0, w, h); gg.fillStyle = "#012169"; gg.fillRect(0, 0, w * .45, h * .5); gg.strokeStyle = "#fff"; gg.lineWidth = 4; gg.strokeRect(2, 2, w * .45 - 2, h * .5 - 2); }), side: THREE.DoubleSide }), ship); sflag.position.set(-L / 2 - .6, 6.6, 0); sflag.rotation.y = Math.PI / 2;
    /* ablaksorok (éjjel világítanak): egy csíkos textúra a fekete testen és a felépítményen */
    const winT = canvasTex(1024, 64, (gg, w, h) => { gg.clearRect(0, 0, w, h); for (let r = 0; r < 2; r++) for (let x = 6; x < w; x += 15) { gg.fillStyle = "#ffe08a"; gg.beginPath(); gg.arc(x, 18 + r * 26, 4.5, 0, TAU); gg.fill(); } });
    const winM = basic({ map: winT, transparent: true, depthWrite: false, color: "#6a5a3a" });
    [-1, 1].forEach((s) => { const w = mesh(new THREE.PlaneGeometry(L - 10, 1.8), winM, ship); w.position.set(-1, 1.5, s * (B / 2 + .03)); w.rotation.y = s > 0 ? 0 : Math.PI; const w2 = mesh(new THREE.PlaneGeometry(L * .64, 1.3), winM, ship); w2.position.set(-1, 4.9, s * (B / 2 - .68)); w2.rotation.y = s > 0 ? 0 : Math.PI; });
    const nameT = canvasTex(512, 96, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = "#e0c060"; gg.font = "800 64px Georgia, serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("TITANIC", w / 2, h / 2); });
    [-1, 1].forEach((s) => { const n = mesh(new THREE.PlaneGeometry(6, 1.1), basic({ map: nameT, transparent: true, depthWrite: false }), ship); n.position.set(L / 2 - 6, 2.4, s * (B / 2 - .3)); n.rotation.y = s > 0 ? -.12 : Math.PI + .12; });
    /* a jéghegy: zajjal torzított, kékesfehér, csillogó test (a víz alatti része sötétebb) */
    const ig = new THREE.IcosahedronGeometry(1, 3); { const p = ig.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const n = 1 + .28 * Math.sin(v.x * 5 + v.y * 3) + .18 * Math.sin(v.z * 7 - v.y * 4) + .12 * Math.sin(v.x * 13); v.multiplyScalar(n); v.y = v.y > 0 ? v.y * 1.6 : v.y * .9; p.setXYZ(i, v.x, v.y, v.z); } ig.computeVertexNormals(); }
    const berg = mesh(ig, std({ color: "#eaf6fb", roughness: .25, metalness: .05, flatShading: true, emissive: new THREE.Color("#9fd6ee"), emissiveIntensity: .12 }), root); berg.scale.set(9, 8, 7); berg.castShadow = true;
    const berg2 = mesh(ig, std({ color: "#d6eef8", roughness: .3, flatShading: true }), root); berg2.scale.set(4, 3.5, 4);
    const smoke = smokePool(root, 50, "#4a4a4a"), rings = ringPool(root, 10);
    const lifeboats = boatsP.slice(0, 8).map((p) => { const b = new THREE.Group(); root.add(b); vcGroup([[BX(4.2, .7, 1.4), "#f7f7f2"], [BX(4.25, .12, 1.45), "#c0392b", M4(0, .2, 0)], [BX(.5, .5, .5), "#ff8a3a", M4(-.8, .55, 0)], [BX(.5, .5, .5), "#3a5ca8", M4(.4, .55, 0)], [BX(.5, .5, .5), "#e8e2cf", M4(1.4, .55, 0)]], b); b.visible = false; return { g: b, p0: p, v: new THREE.Vector3() }; });
    /* útvonal: balról jobbra, 170 m-re előttünk; a jéghegy az út közepén */
    const F0 = -135, RB = 25;   /* 135 m-re előttünk – életnagyságban is lenyűgöző, de nem nyomasztó */
    const st = { t: 0, x: -300, phase: "sail", hit: 0, sink: 0, lit: 0 };
    root.userData.tip = ["🚢 Titanic", "Jéghegy előttünk!"];
    return { name: "A Titanic és a jéghegy", root,
      start() { st.t = 0; st.x = -320; st.phase = "sail"; st.sink = 0; st.hit = 0; root.visible = true; ship.rotation.set(0, 0, 0); ship.position.set(0, 0, 0); lifeboats.forEach((q) => { q.g.visible = false; }); berg.position.copy(RP(F0 - 6, RB + 2)); berg.position.y = -14; berg2.position.copy(RP(F0 - 9, RB + 10)); berg2.position.y = -8; smoke.clear(); deepHorn(3.2, .16, 78); },
      tick(dt) {
        st.t += dt; const bp = RP(F0, 0);
        /* a jéghegy előbukkan a ködből */
        berg.position.y += (-1.2 - berg.position.y) * Math.min(1, dt * .25); berg2.position.y += (-.8 - berg2.position.y) * Math.min(1, dt * .25); berg.rotation.y += dt * .01;
        if (st.phase === "sail") { st.x += 7.5 * dt; if (st.x > RB - L / 2 - 3) { st.phase = "hit"; st.hit = 0; boom(.5, 260, 3.5); setTimeout(() => boom(.35, 600, 2.4), 400); } }
        else if (st.phase === "hit") { st.hit += dt; st.x += Math.max(0, 7.5 - st.hit * 2.2) * dt; if (st.hit > 6) { st.phase = "sink"; deepHorn(2.4, .12, 74); } }
        else if (st.phase === "sink") {
          st.sink += dt;
          /* orr-előre süllyed: dőlés, majd a tat a magasba emelkedik, végül eltűnik */
          const k = clamp(st.sink / 70, 0, 1);
          /* a klasszikus kép: előbb az orr merül, a hajó megdől, majd a tat szinte függőlegesen az ég felé emelkedik, és a hajó lecsúszik a mélybe */
          const k1 = smooth(clamp(k / .5, 0, 1)), k2 = smooth(clamp((k - .5) / .3, 0, 1)), k3 = smooth(clamp((k - .78) / .22, 0, 1));
          ship.rotation.z = -(k1 * .22 + k2 * .78); ship.rotation.x = Math.sin(st.sink * .3) * .02 + k1 * .07;
          ship.position.y = -k1 * 3.2 - k2 * 9 - k3 * 48;
          lifeboats.forEach((q, i) => { const tl = st.sink - 4 - i * 2.2; if (tl < 0) return; if (!q.g.visible) { q.g.visible = true; q.g.position.copy(q.p0).applyMatrix4(ship.matrixWorld); root.worldToLocal(q.g.position); q.v.set(0, 0, Math.sign(q.p0.z) * 2.2); }
            q.g.position.y += (0 - q.g.position.y) * Math.min(1, dt * .9); q.g.position.addScaledVector(q.v, dt * clamp((tl - 2) / 3, 0, 1)); q.g.rotation.z = Math.sin(st.t * 1.4 + i) * .05; q.g.rotation.y = Math.PI / 2; });
          if (Math.random() < dt * 6 && ship.position.y > -20) { const p = RP(F0, st.x + rr(-L / 2, 0)); rings.emit(p.x, p.z, rr(2, 5), 4); }
          if (st.sink > 80) { root.visible = false; return false; }
        }
        ship.position.x = 0; const p = RP(F0, st.x); ship.position.set(p.x, ship.position.y, p.z); ship.rotation.y = Math.atan2(RRv.x, RRv.z) - Math.PI / 2;
        /* füst a kéményekből, amíg a gépek járnak */
        if (st.phase !== "sink" || st.sink < 18) { st.sm = (st.sm || 0) + dt; if (st.sm > .22) { st.sm = 0; ship.updateMatrixWorld(true); funnels.forEach((fx) => { const q = new THREE.Vector3(fx - .5, 16.2, 0).applyMatrix4(ship.matrixWorld); root.worldToLocal(q); smoke.emit(q, new THREE.Vector3(rr(-.4, .4), 1.6, 1.2), 2.6); }); } }
        smoke.tick(dt); rings.tick(dt);
        /* esti fények: az ablakok világítanak, süllyedéskor pislákolnak, majd kialszanak */
        const ev = ENV.evening || 0, out = st.phase === "sink" && st.sink > 40 ? 0 : st.phase === "sink" && st.sink > 30 ? (Math.random() < .5 ? 1 : .2) : 1;
        winM.color.setRGB(.42 + ev * .58 * out, .36 + ev * .52 * out, .24 + ev * .3 * out);
        return true;
      } };
  }

  /* ---------- 2. Tengeri szörny ---------- */
  function evMonster() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const N = 34, segs = [];
    const scaleT = canvasTex(256, 256, (gg, w, h) => { const gr = gg.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1f4a33"); gr.addColorStop(.6, "#3f8f5a"); gr.addColorStop(1, "#d9e8a0"); gg.fillStyle = gr; gg.fillRect(0, 0, w, h);
      gg.strokeStyle = "rgba(10,40,25,.45)"; gg.lineWidth = 2; for (let y = 0; y < h; y += 14) for (let x = 0; x < w; x += 16) { gg.beginPath(); gg.arc(x + ((y / 14) % 2) * 8, y, 8, 0, Math.PI); gg.stroke(); } });
    const skin = std({ map: scaleT, roughness: .4, metalness: .1 }), spineM = std({ color: "#c9e06a", roughness: .5 }), finM = std({ color: "#2f6a48", roughness: .5, side: THREE.DoubleSide, transparent: true, opacity: .9 });
    for (let i = 0; i < N; i++) { const k = i / (N - 1), r = .55 + Math.sin(Math.min(1, k * 1.15 + .12) * Math.PI) * 1.05 * (1 - k * .55);
      const s = new THREE.Group(); root.add(s); const b = mesh(new THREE.SphereGeometry(r, 16, 12), skin, s); b.scale.set(1, .92, 1.5); b.castShadow = true;
      if (i > 0 && i < N - 2 && i % 2 === 0) { const sp = mesh(new THREE.ConeGeometry(r * .28, r * 1.1, 6), spineM, s); sp.position.y = r * .95; sp.rotation.x = -.45; }
      if (i === 5 || i === 13) [-1, 1].forEach((sd) => { const f = mesh(new THREE.CircleGeometry(r * 1.2, 10, 0, Math.PI), finM, s); f.position.set(sd * r * .9, -.1, 0); f.rotation.set(0, sd * Math.PI / 2, -sd * .6); });
      segs.push({ g: s, r }); }
    /* fej: hosszúkás koponya, nyitható állkapocs, szarvak, világító szemek, fogak */
    const head = new THREE.Group(); root.add(head);
    const skull = mesh(new THREE.SphereGeometry(1.1, 18, 14), skin, head); skull.scale.set(1.15, .9, 1.9); skull.position.z = .9; head.scale.setScalar(1.35);
    /* gallér: tüskés fodor a fej mögött */ for (let k = 0; k < 9; k++) { const a = (k / 8 - .5) * 2.6; const fr = mesh(new THREE.ConeGeometry(.16, 1.1, 5), finM, head); fr.position.set(Math.sin(a) * 1.0, .2 + Math.cos(a) * .7, -.3); fr.rotation.set(-1.2, 0, -a * .9); }
    /* hosszú, sárkányszerű pofa orrlyukakkal és szemöldökívvel – így a fej oldalról és szemből is egyértelmű */
    const snout = mesh(new THREE.CylinderGeometry(.42, .75, 1.6, 14), skin, head); snout.rotation.x = Math.PI / 2; snout.position.set(0, .05, 2.1); snout.scale.set(1.15, 1, .8);
    const nose = mesh(new THREE.SphereGeometry(.45, 14, 10), skin, head); nose.position.set(0, .08, 2.85); nose.scale.set(1.1, .75, .8);
    [-1, 1].forEach((sd) => { const n2 = mesh(new THREE.SphereGeometry(.07, 8, 6), std({ color: "#0d1a12" }), head); n2.position.set(sd * .2, .3, 3.08);
      const brow = mesh(new THREE.ConeGeometry(.22, .7, 6), spineM, head); brow.position.set(sd * .55, .62, 1.45); brow.rotation.set(-1.3, 0, sd * .5); });
    const tongue = mesh(new THREE.BoxGeometry(.18, .04, 1.4), std({ color: "#b8323a", roughness: .5 }), head); tongue.position.set(0, -.42, 2.0);
    const jaw = new THREE.Group(); head.add(jaw); jaw.position.set(0, -.35, .2); const jm = mesh(new THREE.SphereGeometry(.95, 16, 10), skin, jaw); jm.scale.set(.85, .4, 2.6); jm.position.z = 1.5;
    const toothM = std({ color: "#f6f1df", roughness: .4 }); for (let k = 0; k < 12; k++) { const a = (k / 11 - .5) * 2.2; const tt = mesh(new THREE.ConeGeometry(.07, .3, 5), toothM, head); tt.position.set(Math.sin(a) * .62, -.3, 1.4 + Math.cos(a) * 1.5); tt.rotation.x = Math.PI; }
    const eyeM = std({ color: "#ffe14a", emissive: new THREE.Color("#ffb400"), emissiveIntensity: 1.6, roughness: .2 }); [-1, 1].forEach((sd) => { const e = mesh(new THREE.SphereGeometry(.2, 12, 10), eyeM, head); e.position.set(sd * .62, .38, 1.6); const pu = mesh(new THREE.SphereGeometry(.08, 8, 6), std({ color: "#111" }), head); pu.position.set(sd * .68, .4, 1.76); pu.scale.set(.5, 1.4, .5);
      const horn = mesh(new THREE.ConeGeometry(.16, 1.1, 8), toothM, head); horn.position.set(sd * .45, .9, .2); horn.rotation.set(-.9, 0, -sd * .3); });
    const rings = ringPool(root, 14);
    const st = { t: 0 }; let hist = [];
    root.userData.tip = ["🐉 Tengeri szörny", "Állítólag a Balaton mélyén él…"];
    return { name: "Tengeri szörny", root,
      start() { st.t = 0; root.visible = true; hist = []; st.roared = false; st.a0 = rand() < .5 ? -1 : 1; },
      tick(dt) {
        st.t += dt; const T0 = 46, k = st.t / T0;
        /* ív a bója körül 38 m-en, balról jobbra (vagy fordítva); középen felemelkedik és ránk néz */
        const ang = st.a0 * (-1.1 + k * 2.2), R = 38 - Math.sin(k * Math.PI) * 8, hx = Math.sin(ang) * R, hz = -Math.cos(ang) * R;
        const rise = smooth(clamp((st.t - 18) / 4, 0, 1)) * (1 - smooth(clamp((st.t - 30) / 4, 0, 1)));
        const dive = smooth(clamp((st.t - T0 + 7) / 6, 0, 1)), emerge = smooth(clamp(st.t / 4, 0, 1));
        const hy = -2.5 + emerge * 2.6 - dive * 6 + rise * 5.5 + Math.sin(st.t * 1.2) * .3;
        hist.unshift(new THREE.Vector3(hx, hy, hz)); if (hist.length > 600) hist.pop();
        head.position.set(hx, hy + .3, hz);
        const nxt = hist[6] || hist[hist.length - 1]; const dir = new THREE.Vector3(hx - nxt.x, 0, hz - nxt.z); if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
        const yawMove = Math.atan2(dir.x, dir.z), toUser = Math.atan2(-hx, -hz);
        head.rotation.y = yawMove + wrapA(toUser - yawMove) * rise; head.rotation.x = -rise * .25 + Math.sin(st.t * 2) * .05;
        jaw.rotation.x = rise * (.35 + .25 * Math.max(0, Math.sin(st.t * 3))) ;
        if (rise > .8 && !st.roared) { st.roared = true; roar(.35 * distVol(head.position, 30)); rings.emit(hx, hz, 4, 4); }
        /* a test a fej útját követi, púpokban ki-be bukva a vízből */
        segs.forEach((s, i) => { const idx = Math.min(hist.length - 1, 6 + i * 3); const p = hist[idx]; const p2 = hist[Math.min(hist.length - 1, idx + 4)];
          const hump = Math.sin(st.t * 1.6 - i * .32) * 1.35 - .3 - dive * 4 * clamp(1 - i / N + dive, 0, 1) + emerge * .2 - (1 - emerge) * 3;
          s.g.position.set(p.x, Math.min(p.y, 0) * (i < 6 ? .8 : 0) + hump + (i < 6 ? rise * (4.6 - i * .8) : 0), p.z);
          s.g.lookAt(p2.x, s.g.position.y, p2.z); s.g.rotateY(Math.PI);
          if (Math.abs(s.g.position.y) < s.r * .6 && Math.random() < dt * 1.5) rings.emit(p.x, p.z, s.r * 1.6, 2.5); });
        rings.tick(dt);
        if (st.t > T0) { root.visible = false; return false; }
        return true;
      } };
  }

  /* ---------- 3. Mentőhelikopter: egy borult hajós kimentése ---------- */
  function evHeli() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const heli = new THREE.Group(); root.add(heli);
    const red = "#d6261f", wht = "#f4f4f2", dk = "#22262c";
    const parts = [[new THREE.SphereGeometry(1.4, 18, 12).scale(1, .9, 2), red], [BX(2.1, .5, 3), wht, M4(0, -.6, .3)], [new THREE.CylinderGeometry(.42, .2, 6.5, 10).rotateX(Math.PI / 2), red, M4(0, .35, -4.4)],
      [BX(.12, 1.5, 1), red, M4(.15, 1.05, -7.6)], [BX(1.8, .12, .6), wht, M4(0, .5, -6.9)], [CY(.2, .2, .7, 10), dk, M4(0, 1.45, 0), "m"],
      [new THREE.CylinderGeometry(.06, .06, 3.4, 6).rotateX(Math.PI / 2), dk, M4(-1.0, -1.45, .2), "m"], [new THREE.CylinderGeometry(.06, .06, 3.4, 6).rotateX(Math.PI / 2), dk, M4(1.0, -1.45, .2), "m"],
      [BX(.06, .7, .06), dk, M4(-1, -1.1, 1), "m"], [BX(.06, .7, .06), dk, M4(1, -1.1, 1), "m"], [BX(.06, .7, .06), dk, M4(-1, -1.1, -.7), "m"], [BX(.06, .7, .06), dk, M4(1, -1.1, -.7), "m"], [BX(.5, .25, .5), "#ffd166", M4(1.35, .3, .6)]];
    vcGroup(parts, heli);
    const glass = mesh(new THREE.SphereGeometry(1.25, 16, 10, 0, TAU, 0, Math.PI / 2).scale(1, .9, 1.4), std({ color: "#1d2a36", roughness: .05, metalness: .6 }), heli); glass.position.set(0, .05, 1.1); glass.rotation.x = .5;
    const sideT = canvasTex(256, 64, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = "#fff"; gg.font = "900 40px system-ui, sans-serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("MENTŐ", w / 2, h / 2 + 2); });
    [-1, 1].forEach((sd) => { const p = mesh(new THREE.PlaneGeometry(2.2, .55), basic({ map: sideT, transparent: true, depthWrite: false }), heli); p.position.set(sd * 1.42, .1, -.6); p.rotation.y = sd * Math.PI / 2; });
    const rotor = new THREE.Group(); heli.add(rotor); rotor.position.y = 1.85; const bladeM = std({ color: "#2a2e33", roughness: .5, metalness: .4 });
    [0, 1, 2, 3].forEach((k) => { const b = mesh(BX(5.4, .05, .3), bladeM, rotor); b.position.x = 2.7; const pv = new THREE.Group(); rotor.add(pv); pv.add(b); pv.rotation.y = k * Math.PI / 2; });
    const blur = mesh(new THREE.CircleGeometry(5.4, 40), basic({ color: "#222", transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide }), rotor); blur.rotation.x = -Math.PI / 2;
    const trot = new THREE.Group(); heli.add(trot); trot.position.set(.25, 1.2, -7.8); [0, 1].forEach((k) => { const b = mesh(BX(.05, 1.4, .12), bladeM, trot); b.rotation.x = k * Math.PI / 2; });
    const cable = mesh(CY(.02, .02, 1, 5), std({ color: "#cfd3d6", metalness: .7, roughness: .3 }), heli); cable.position.set(1.35, -.2, .6); cable.geometry.translate(0, -.5, 0);
    const person = new THREE.Group(); root.add(person); vcGroup([[CY(.18, .2, .55, 10), "#ff6a1a", M4(0, .55, 0)], [new THREE.SphereGeometry(.13, 10, 8), "#e8c8a8", M4(0, .95, 0)], [CY(.07, .07, .5, 6), "#1f3a6a", M4(-.1, .05, 0)], [CY(.07, .07, .5, 6), "#1f3a6a", M4(.1, .05, 0)], [CY(.05, .05, .5, 6), "#ff6a1a", M4(-.3, .8, 0, 0, 0, .8)], [CY(.05, .05, .5, 6), "#ff6a1a", M4(.3, .8, 0, 0, 0, -.8)]], person);
    /* a borult kis dingi (fenékkel felfelé) */
    const dinghy = new THREE.Group(); root.add(dinghy); vcGroup([[new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2).scale(1.1, .45, 2.1), "#f4f4f0"], [BX(.1, .05, 3.6), "#1f5fa8", M4(0, .44, 0)]], dinghy);
    const snd = { r: null }, rings = ringPool(root, 14);
    const P0 = RP(-48, -22), st = { t: 0 };
    root.userData.tip = ["🚁 Mentőhelikopter", "Egy borult dingi vitorlázóját menti"];
    return { name: "Mentőhelikopter", root,
      start() { st.t = 0; root.visible = true; snd.r = loopSnd("rotor"); dinghy.position.set(P0.x, .1, P0.z); person.position.set(P0.x + 1.1, -.55, P0.z); person.rotation.set(0, 0, 0); },
      tick(dt) {
        st.t += dt; const t2 = st.t;
        rotor.rotation.y += dt * 28; trot.rotation.x += dt * 40; dinghy.rotation.z = Math.sin(t2 * 1.1) * .06;
        const far = new THREE.Vector3(P0.x - 260, 70, P0.z - 380), hov = new THREE.Vector3(P0.x - 1.35, 16, P0.z), away = new THREE.Vector3(P0.x + 420, 90, P0.z + 160);
        let pos, k;
        if (t2 < 24) { k = smooth(t2 / 24); pos = far.clone().lerp(hov, k); heli.rotation.set(-.12 * (1 - k), Math.atan2(hov.x - far.x, hov.z - far.z), 0); }
        else if (t2 < 58) { pos = hov.clone(); pos.y += Math.sin(t2 * .9) * .25; heli.rotation.x = Math.sin(t2 * .7) * .02; }
        else { k = smooth(clamp((t2 - 58) / 26, 0, 1)); pos = hov.clone().lerp(away, k); heli.rotation.set(-.2 * Math.min(1, k * 4), heli.rotation.y + wrapA(Math.atan2(away.x - hov.x, away.z - hov.z) - heli.rotation.y) * Math.min(1, dt * .8), 0); }
        heli.position.copy(pos);
        /* csörlő: leereszt (24–34), a hajós beköti magát (34–38), felhúzza (38–52) */
        let L = 0; if (t2 > 24 && t2 < 34) L = (t2 - 24) / 10 * 16.3; else if (t2 >= 34 && t2 < 38) L = 16.3; else if (t2 >= 38 && t2 < 52) L = 16.3 * (1 - (t2 - 38) / 14);
        cable.scale.y = Math.max(.01, L); cable.visible = L > .05;
        const hook = new THREE.Vector3(1.35, -.2 - L, .6).applyMatrix4(heli.matrixWorld); root.worldToLocal(hook);
        if (t2 < 34) { person.position.y = -.55 + Math.sin(t2 * 1.6) * .05; person.rotation.z = Math.sin(t2 * 4) * .25; }
        else if (t2 < 53) { person.position.set(hook.x, hook.y - 1.0, hook.z); person.rotation.z = Math.sin(t2 * 1.5) * .1; }
        else { person.position.set(hook.x, hook.y - .8, hook.z); person.visible = t2 < 56; }
        if (t2 > 20 && t2 < 60 && Math.random() < dt * 10) { const a = rand() * TAU; rings.emit(P0.x + Math.cos(a) * rr(2, 7), P0.z + Math.sin(a) * rr(2, 7), rr(1.5, 3), 1.6); }
        rings.tick(dt);
        if (snd.r) snd.r.set(.22 * distVol(heli.position, 40));
        if (t2 > 86) { root.visible = false; person.visible = true; if (snd.r) snd.r.stop(); return false; }
        return true;
      }, stop() { if (snd.r) snd.r.stop(); } };
  }

  /* ---------- 4. Lapátkerekes gőzös (a balatoni „Kisfaludy” nyomán) ---------- */
  function evSteamer() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const ship = new THREE.Group(); root.add(ship);
    const L = 38, B = 6;
    const parts = [[BX(L, 2.2, B), "#f4f4f0", M4(0, .6, 0)], [BX(L + .1, .5, B + .1), "#1a1c20", M4(0, -.5, 0)], [BX(L * .1, 2.2, B * .7), "#f4f4f0", M4(L / 2 + .8, .6, 0, 0, 0, 0, 1, 1, .7)],
      [BX(L * .7, 2.2, B - 1), "#ece6d6", M4(-1, 2.8, 0)], [BX(L * .72, .15, B - .8), "#7a4a22", M4(-1, 3.95, 0)], [BX(L * .4, 1.8, B - 2.4), "#f4f4f0", M4(-3, 4.9, 0)], [BX(4, 1.6, B - 1.6), "#f4f4f0", M4(L * .3, 4.8, 0)],
      [CY(.9, 1, 6, 16), "#1a1c20", M4(2, 8.6, 0)], [CY(.95, .95, .8, 16), "#c62828", M4(2, 9.6, 0)], [CY(.12, .14, 12, 6), "#5b3a22", M4(L * .4, 7, 0)], [CY(.1, .12, 9, 6), "#5b3a22", M4(-L * .42, 5.5, 0)]];
    [-1, 1].forEach((sd) => parts.push([CY(3.1, 3.1, 1.6, 24).rotateX(Math.PI / 2), "#f4f4f0", M4(4, 1.6, sd * (B / 2 + .8))], [BX(6.4, .2, 1.8), "#c62828", M4(4, 1.4, sd * (B / 2 + .8))]));
    vcGroup(parts, ship);
    const wheels = [-1, 1].map((sd) => { const w = new THREE.Group(); ship.add(w); w.position.set(4, .4, sd * (B / 2 + .8)); for (let k = 0; k < 10; k++) { const p = mesh(BX(.18, 2.4, 1.3), std({ color: "#5a3b22", roughness: .8 }), w); p.position.y = 1.4; const pv = new THREE.Group(); w.add(pv); pv.add(p); pv.rotation.z = k / 10 * TAU; } return w; });
    const winT = canvasTex(512, 64, (gg, w, h) => { gg.clearRect(0, 0, w, h); for (let x = 8; x < w; x += 24) { gg.fillStyle = "#ffe08a"; gg.fillRect(x, 16, 14, 30); } });
    const winM = basic({ map: winT, transparent: true, depthWrite: false, color: "#5a6a7a" });
    [-1, 1].forEach((sd) => { const w = mesh(new THREE.PlaneGeometry(L * .66, 1.2), winM, ship); w.position.set(-1, 2.9, sd * ((B - 1) / 2 + .02)); w.rotation.y = sd > 0 ? 0 : Math.PI; });
    const nameT = canvasTex(512, 96, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = "#1f3a6a"; gg.font = "800 60px Georgia, serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("KISFALUDY", w / 2, h / 2); });
    [-1, 1].forEach((sd) => { const n = mesh(new THREE.PlaneGeometry(6, 1.1), basic({ map: nameT, transparent: true, depthWrite: false }), ship); n.position.set(4, 3.3, sd * (B / 2 + 1.62)); n.rotation.y = sd > 0 ? 0 : Math.PI; });
    /* zászló a taton */
    const fl = mesh(new THREE.PlaneGeometry(1.6, 1, 6, 1).translate(.8, 0, 0), std({ map: canvasTex(96, 64, (gg, w, h) => { ["#ce2939", "#ffffff", "#477050"].forEach((c, i) => { gg.fillStyle = c; gg.fillRect(0, i * h / 3, w, h / 3 + 1); }); }), side: THREE.DoubleSide }), ship); fl.position.set(-L * .42, 9.4, 0); fl.rotation.y = Math.PI;
    const smoke = smokePool(root, 40, "#3a3a3a"), wake = makeWake(root, 1.4);
    const st = { t: 0 };
    root.userData.tip = ["🛳 Kisfaludy lapátkerekes gőzös", "1888 óta járja a Balatont – dudál, ha elhalad"];
    return { name: "Lapátkerekes gőzös", root,
      start() { st.t = 0; st.x = 260; st.honk = 0; root.visible = true; smoke.clear(); },
      tick(dt) {
        st.t += dt; st.x -= 4.6 * dt; const p = RP(-105, st.x);
        ship.position.set(p.x, Math.sin(st.t * .8) * .06, p.z); ship.rotation.y = Math.atan2(-RRv.x, -RRv.z) - Math.PI / 2; ship.rotation.z = Math.sin(st.t * .6) * .01;
        wheels.forEach((w) => { w.rotation.z -= dt * 1.8; });
        st.sm = (st.sm || 0) + dt; if (st.sm > .3) { st.sm = 0; const q = new THREE.Vector3(2, 10.3, 0).applyMatrix4(ship.matrixWorld); root.worldToLocal(q); smoke.emit(q, new THREE.Vector3(rr(-.3, .3), 2.2, 1.0), 2.2); }
        smoke.tick(dt); wake.push(p.x, p.z, ship.rotation.y + Math.PI / 2, 4.6, dt, .04);
        if (Math.abs(st.x) < 12 && !st.honk) { st.honk = 1; deepHorn(1.6, .12, 196); setTimeout(() => deepHorn(2.4, .12, 196), 2100); }
        const ev = ENV.evening || 0; winM.color.setRGB(.35 + ev * .65, .42 + ev * .5, .48 + ev * .1);
        if (st.x < -270) { root.visible = false; return false; }
        return true;
      } };
  }

  /* ---------- 5. Rendőrmotoros szirénával ---------- */
  function evPolice() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const boat = new THREE.Group(); root.add(boat);
    const parts = [[BX(2.6, .8, 8), "#f4f4f2", M4(0, .2, 0)], [new THREE.ConeGeometry(1.3, 2.6, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).scale(1, .45, 1), "#f4f4f2", M4(0, .2, 5.2)], [BX(2.62, .26, 8.02), "#1f4fbf", M4(0, .35, 0)], [BX(2.62, .1, 8.02), "#ffd21f", M4(0, .55, 0)],
      [BX(1.8, 1.1, 2.2), "#f4f4f2", M4(0, 1.15, -.4)], [BX(1.84, .45, 1.8), "#1d2a36", M4(0, 1.35, -.2), "m"], [BX(1.2, .1, .3), "#2a2e33", M4(0, 1.75, -.4)], [BX(.5, .7, .5), "#2a2e33", M4(0, .6, -3.9), "m"]];
    vcGroup(parts, boat);
    const blueM = std({ color: "#3a6cff", emissive: new THREE.Color("#2f5bff"), emissiveIntensity: 0 }), redM = std({ color: "#ff3a3a", emissive: new THREE.Color("#ff2a2a"), emissiveIntensity: 0 });
    const lb = mesh(BX(.4, .16, .2), blueM, boat); lb.position.set(-.35, 1.85, -.4); const lr = mesh(BX(.4, .16, .2), blueM, boat); lr.position.set(.35, 1.85, -.4);
    const txt = canvasTex(512, 96, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = "#1f4fbf"; gg.font = "900 64px system-ui, sans-serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("RENDŐRSÉG", w / 2, h / 2); });
    [-1, 1].forEach((sd) => { const n = mesh(new THREE.PlaneGeometry(3.4, .64), basic({ map: txt, transparent: true, depthWrite: false }), boat); n.position.set(sd * 1.32, .85, 1.0); n.rotation.y = sd * Math.PI / 2; });
    const wake = makeWake(root, .9), rings = ringPool(root, 10); let sir = null; const st = { t: 0 };
    root.userData.tip = ["🚤 Vízirendőrség", "Valaki túl gyorsan ment a kikötő előtt…"];
    redM.dispose && 0;
    return { name: "Vízirendőrség", root,
      start() { st.t = 0; root.visible = true; sir = loopSnd("siren"); st.eng = loopSnd("engine"); st.s = rand() < .5 ? 1 : -1; },
      tick(dt) {
        st.t += dt; const T0 = 24, k = st.t / T0;
        /* ív: 30 m-re előttünk húz el, megdől a kanyarban, orra kiemelkedik */
        const a = st.s * (-1.4 + k * 2.8), R = 34 + Math.cos(k * Math.PI * 2) * 6, x = Math.sin(a) * R * 1.8, z = -Math.cos(a) * R - 6;
        const nx = Math.sin(a + st.s * .02) * R * 1.8, nz = -Math.cos(a + st.s * .02) * R - 6;
        boat.position.set(x, 0, z); boat.rotation.set(-.08, Math.atan2(nx - x, nz - z), st.s * -.12);
        const fl = Math.floor(st.t * 6) % 2; lb.material.emissiveIntensity = fl ? 3 : 0; lr.material.emissiveIntensity = fl ? 0 : 3;
        wake.push(x, z, boat.rotation.y, 14, dt, .04); if (Math.random() < dt * 8) rings.emit(x, z, 1.5, 1.5); rings.tick(dt);
        const v = distVol(boat.position, 25); if (sir) sir.set(.07 * v); if (st.eng) st.eng.set(.08 * v, 1.4);
        if (st.t > T0) { root.visible = false; if (sir) sir.stop(); if (st.eng) st.eng.stop(); return false; }
        return true;
      }, stop() { if (sir) sir.stop(); if (st.eng) st.eng.stop(); } };
  }

  /* ---------- 6. Repülő transzparenssel ---------- */
  function evPlane() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const pl = new THREE.Group(); root.add(pl);
    const parts = [[new THREE.CylinderGeometry(.55, .3, 6.5, 12).rotateX(Math.PI / 2), "#f4f1e6", M4(0, 0, 0)], [BX(10, .12, 1.5), "#f2b233", M4(0, .65, .5)], [BX(3.2, .1, .9), "#f2b233", M4(0, .1, -3)], [BX(.1, 1.2, .9), "#c62828", M4(0, .65, -3)],
      [BX(1, .6, 1.5), "#1d2a36", M4(0, .45, 1.2), "m"], [CY(.05, .05, 1.3, 6), "#2a2e33", M4(-1.6, .2, .6, 0, 0, .4), "m"], [CY(.05, .05, 1.3, 6), "#2a2e33", M4(1.6, .2, .6, 0, 0, -.4), "m"], [new THREE.ConeGeometry(.3, .5, 10).rotateX(Math.PI / 2), "#c62828", M4(0, 0, 3.45)]];
    vcGroup(parts, pl);
    const prop = mesh(BX(2.2, .18, .05), std({ color: "#2a2e33" }), pl); prop.position.z = 3.6;
    const bt = canvasTex(2048, 256, (gg, w, h) => { gg.fillStyle = "#fffdf4"; gg.fillRect(0, 0, w, h); gg.fillStyle = "#0b2f5e"; gg.font = "900 150px Georgia, serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("★ ZEPHYR APARTMANHÁZ · ZAMÁRDI ★", w / 2, h / 2 + 8); gg.strokeStyle = "#c62828"; gg.lineWidth = 14; gg.strokeRect(7, 7, w - 14, h - 14); });
    const bg = new THREE.PlaneGeometry(26, 3.2, 24, 1); bg.translate(-13, 0, 0); const base = Float32Array.from(bg.attributes.position.array);
    const banner = mesh(bg, std({ map: bt, side: THREE.DoubleSide, roughness: .8 }), root);
    const rope = mesh(CY(.02, .02, 1, 4), std({ color: "#ddd" }), root); rope.geometry.rotateZ(Math.PI / 2); rope.geometry.translate(-.5, 0, 0);
    let eng = null; const st = { t: 0 };
    root.userData.tip = ["✈ Reklámrepülő", "Csak nekünk húzza a transzparenst"];
    return { name: "Repülő transzparenssel", root,
      start() { st.t = 0; root.visible = true; eng = loopSnd("prop"); st.s = rand() < .5 ? 1 : -1; },
      tick(dt) {
        st.t += dt; const T0 = 26, k = st.t / T0, x = st.s * (-420 + k * 840), z = -70 - Math.sin(k * Math.PI) * 10, y = 45 + Math.sin(st.t * .5) * 1.5;
        pl.position.set(x, y, z); pl.rotation.set(0, st.s * Math.PI / 2, Math.sin(st.t * .6) * .05); prop.rotation.z += dt * 60;
        const bx = x - st.s * 32; banner.position.set(bx, y - 4, z); banner.rotation.y = st.s > 0 ? 0 : Math.PI;
        rope.position.set(x - st.s * 3.5, y - .3, z); rope.scale.x = 28.5; rope.rotation.set(0, st.s > 0 ? 0 : Math.PI, Math.atan2(3.7, 28.5) * (st.s > 0 ? 1 : 1));
        const a = bg.attributes.position.array; for (let i = 0; i < a.length; i += 3) { const u = -base[i] / 26; a[i + 2] = base[i + 2] + Math.sin(st.t * 7 + base[i] * .5) * .45 * u; a[i + 1] = base[i + 1] - u * .4; } bg.attributes.position.needsUpdate = true;
        if (eng) { const d = distVol(pl.position, 60); eng.set(.06 * d, 1 + (st.s * -x > 0 ? -.06 : .06)); }
        if (st.t > T0) { root.visible = false; if (eng) eng.stop(); return false; }
        return true;
      }, stop() { if (eng) eng.stop(); } };
  }

  /* ---------- 7. Tengeralattjáró: periszkóp, majd kiemelkedik és újra lemerül ---------- */
  function evSub() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const sub = new THREE.Group(); root.add(sub);
    const parts = [[new THREE.CapsuleGeometry(1.6, 16, 6, 16).rotateX(Math.PI / 2), "#3a4048"], [BX(1.4, 3, 4), "#3a4048", M4(0, 2.2, 1.5)], [BX(4.2, .15, 1.2), "#3a4048", M4(0, 2.6, 2.2)], [BX(.15, 2.4, 1.8), "#2e333a", M4(0, 0, -9)], [BX(3.6, .15, 1.4), "#2e333a", M4(0, 0, -9)],
      [CY(.08, .08, 3, 8), "#20242a", M4(.2, 4.6, 1.8), "m"], [BX(.3, .2, .5), "#20242a", M4(.2, 6.1, 1.95), "m"], [BX(3.3, .5, 3.4), "#7a1d22", M4(0, -1.35, 0)]];
    vcGroup(parts, sub);
    const numT = canvasTex(256, 96, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = "#f4f4f0"; gg.font = "900 72px system-ui, sans-serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("Z-58", w / 2, h / 2); });
    [-1, 1].forEach((sd) => { const n = mesh(new THREE.PlaneGeometry(1.8, .7), basic({ map: numT, transparent: true, depthWrite: false }), sub); n.position.set(sd * .72, 2.6, 1.5); n.rotation.y = sd * Math.PI / 2; });
    const wake = makeWake(root, .3), rings = ringPool(root, 12); const st = { t: 0 };
    root.userData.tip = ["⚓ Tengeralattjáró", "A Balaton legmélyebb pontja 12 m… de azért befért"];
    return { name: "Tengeralattjáró", root,
      start() { st.t = 0; root.visible = true; st.s = rand() < .5 ? 1 : -1; },
      tick(dt) {
        st.t += dt; const T0 = 52, k = st.t / T0;
        const a = st.s * (-.9 + k * 1.8), R = 42, x = Math.sin(a) * R, z = -Math.cos(a) * R - 10;
        const yaw = Math.atan2(Math.cos(a) * st.s, Math.sin(a) * st.s);
        /* 0–16 mp periszkóp, 16–24 kiemelkedik, 24–40 a felszínen (kürt), 40–52 lemerül */
        const up = smooth(clamp((st.t - 16) / 8, 0, 1)) * (1 - smooth(clamp((st.t - 40) / 9, 0, 1)));
        sub.position.set(x, -6.4 + up * 6.0, z); sub.rotation.set(-(st.t > 16 && st.t < 24 ? .12 : st.t > 40 ? -.1 : 0), yaw, 0);
        wake.push(x, z, yaw, up > .5 ? 3 : 1.2, dt, .04);
        if ((st.t > 16 && st.t < 25) || (st.t > 40 && st.t < 48)) { if (Math.random() < dt * 14) rings.emit(x + rr(-2, 2), z + rr(-5, 5), rr(2, 4), 2.5); }
        else if (Math.random() < dt * 3) rings.emit(x, z, .8, 1.5);
        if (st.t > 26 && !st.honk) { st.honk = 1; deepHorn(1.8, .1 * distVol(sub.position, 40) + .03, 110); }
        rings.tick(dt);
        if (st.t > T0) { root.visible = false; st.honk = 0; return false; }
        return true;
      } };
  }

  /* ---------- 8. Nyári zivatar: elsötétül az ég, zuhog az eső, villámlik és dörög, majd kisüt a nap ---------- */
  function evStorm() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const domeM = basic({ color: "#151b24", transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, fog: false });
    const dome = mesh(new THREE.SphereGeometry(140, 32, 16), domeM, root); dome.renderOrder = -5;
    const flashM = basic({ color: "#dfe8ff", transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
    const flash = mesh(new THREE.SphereGeometry(135, 24, 12), flashM, root); flash.renderOrder = -4;
    /* eső: 2600 csepp vonalként, a GPU mozgatja (egy rajzolási hívás) */
    const N = 2600, pos = new Float32Array(N * 6), ph = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { const x = rr(-40, 40), z = rr(-40, 40), y = rand() * 30; pos.set([x, y, z, x - .05, y - .7, z + .02], i * 6); ph[i * 2] = ph[i * 2 + 1] = rand(); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); rg.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
    const rU = { uT: { value: 0 }, uA: { value: 0 } };
    const rainM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: rU,
      vertexShader: `attribute float ph; uniform float uT; varying float vF; void main(){ vec3 p = position; p.y = mod(p.y - uT * (17. + ph * 6.), 30.) - 1.; vF = ph; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
      fragmentShader: `uniform float uA; varying float vF; void main(){ gl_FragColor = vec4(.78, .84, .9, uA * (.25 + .25 * vF)); }` });
    W.disposables.push(rg, rainM); const rain = new THREE.LineSegments(rg, rainM); rain.frustumCulled = false; root.add(rain);
    /* villám: cikcakkos, elágazó fényes vonal */
    const boltM = basic({ color: "#f4f7ff", transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
    let bolt = null; const makeBolt = () => { if (bolt) { root.remove(bolt); bolt.geometry.dispose(); } const a = rand() * TAU, d = rr(90, 200), x = Math.sin(a) * d, z = -Math.abs(Math.cos(a)) * d; const pts = []; let px = x, py = 95, pz = z; pts.push(px, py, pz);
      while (py > 0) { const ny = py - rr(5, 11), nx = px + rr(-6, 6), nz = pz + rr(-6, 6); pts.push(nx, Math.max(0, ny), nz); if (rand() < .25 && ny > 20) { pts.push(nx + rr(-12, 12), ny - rr(8, 16), nz + rr(-12, 12)); pts.push(nx, Math.max(0, ny), nz); } px = nx; py = ny; pz = nz; }
      const segs = []; for (let i = 0; i < pts.length / 3 - 1; i++) segs.push(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], pts[i * 3 + 3], pts[i * 3 + 4], pts[i * 3 + 5]);
      const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute(segs, 3)); bolt = new THREE.LineSegments(bg, boltM); bolt.frustumCulled = false; root.add(bolt); return d; };
    const rings = ringPool(root, 24); let rs = null; const st = { t: 0 };
    root.userData.tip = ["⛈ Nyári zivatar", "Balatoni vihar: pár perc, aztán újra kisüt"];
    return { name: "Nyári zivatar", root,
      start() { st.t = 0; st.next = 6; root.visible = true; rs = loopSnd("rain"); const Lg = ENV.lights; st.base = Lg ? { s: Lg.sun.intensity, h: Lg.hemi.intensity, a: Lg.amb.intensity } : null; },
      tick(dt) {
        st.t += dt; const T0 = 56, k = smooth(clamp(st.t / 8, 0, 1)) * (1 - smooth(clamp((st.t - T0 + 9) / 9, 0, 1)));
        domeM.opacity = k * .5; rU.uT.value = st.t; rU.uA.value = k;
        /* a fények elhalványulnak (a felhők eltakarják a napot) – villámláskor egy pillanatra fehér fény */
        { const Lg = ENV.lights; if (Lg && st.base) { if (Math.abs(Lg.sun.intensity - st.lastS) > 1e-3 && st.lastS != null) st.base.s = Lg.sun.intensity / Math.max(.05, st.lastK); const fl2 = st.fl > 0 ? Math.max(0, st.fl / .35) : 0;
          st.lastK = 1 - .7 * k; Lg.sun.intensity = st.base.s * st.lastK;
          { const sc = T.sceneEl.object3D; if (st.envI == null) st.envI = sc.environmentIntensity != null ? sc.environmentIntensity : 1; sc.environmentIntensity = st.envI * (1 - .6 * k) + fl2 * .6;
            const wu = ENV.water && ENV.water.userData.mat.uniforms; if (wu && wu.uLight) { if (st.wl == null || Math.abs(wu.uLight.value - st.wlSet) > 1e-3) st.wl = wu.uLight.value; st.wlSet = wu.uLight.value = st.wl * (1 - .55 * k) + fl2 * .3; } } Lg.hemi.intensity = st.base.h * (1 - .45 * k) + fl2 * 1.2; Lg.amb.intensity = st.base.a + fl2 * .8; st.lastS = Lg.sun.intensity; } }
        const hw = ENV.site.worldToLocal(headWorld(new THREE.Vector3())); rain.position.set(hw.x, 0, hw.z); dome.position.set(hw.x, 0, hw.z); flash.position.copy(dome.position);
        if (rs) rs.set(.09 * k);
        for (let i = 0; i < 8 * k; i++) if (Math.random() < dt * 6) rings.emit(hw.x + rr(-14, 14), hw.z + rr(-14, 14), rr(.15, .35), .6);
        rings.tick(dt);
        st.next -= dt; if (st.next < 0 && k > .5) { st.next = rr(4, 9); const d = makeBolt(); st.fl = .35; setTimeout(() => boom(.5 * clamp(120 / d, .35, 1), 160, 3.2), d / 340 * 1000 * .35); }
        if (st.fl > 0) { st.fl -= dt; const f = Math.max(0, st.fl / .35); const flick = f * (Math.sin(st.t * 60) > -.3 ? 1 : .3); flashM.opacity = flick * .35; boltM.opacity = flick; } else { flashM.opacity = 0; boltM.opacity = 0; }
        if (st.t > T0) { root.visible = false; if (rs) rs.stop(); restore(); return false; }
        return true;
      }, stop() { if (rs) rs.stop(); restore(); } };
    function restore() { const Lg = ENV.lights; if (Lg && st.base) { Lg.sun.intensity = st.base.s; Lg.hemi.intensity = st.base.h; Lg.amb.intensity = st.base.a; st.base = null; }
      if (st.envI != null) { T.sceneEl.object3D.environmentIntensity = st.envI; st.envI = null; } const wu = ENV.water && ENV.water.userData.mat.uniforms; if (wu && wu.uLight && st.wl != null) { wu.uLight.value = st.wl; st.wl = null; } }
  }

  const EVS = { storm: evStorm, titanic: evTitanic, monster: evMonster, heli: evHeli, steamer: evSteamer, police: evPolice, plane: evPlane, sub: evSub };
  const EV_ORDER = ["monster", "steamer", "heli", "storm", "police", "plane", "sub", "monster", "heli", "steamer", "police", "storm", "plane", "sub"];   /* a Titanic a tulajdonos kérésére kikerült (2026. nov. 6.) */
  const EV_LIST = [["monster", "🐉", "Tengeri szörny"], ["heli", "🚁", "Mentőhelikopter"], ["steamer", "🛳", "Lapátkerekes gőzös"], ["storm", "⛈", "Nyári zivatar"], ["police", "🚤", "Vízirendőrség"], ["plane", "✈", "Reklámrepülő"], ["sub", "⚓", "Tengeralattjáró"]];
  function bjStart(id) {
    if (BJ.cur) { try { BJ.cur.root.visible = false; if (BJ.cur.stop) BJ.cur.stop(); } catch (e) {} BJ.cur = null; }
    if (!BJ.race) return;
    if (!BJ.events[id]) { try { BJ.events[id] = EVS[id](); const ev = BJ.events[id]; ev.root.traverse((o) => { if (o.isMesh) { o.userData.xr = { hover: (on) => { if (on) showTip(o, ev.root.userData.tip[0], ev.root.userData.tip[1]); else showTip(null); } }; } }); } catch (e) { console.warn("jelenet", id, e); return; } }
    BJ.cur = BJ.events[id]; BJ.curId = id; BJ.cur.start(); W.panelDirty = 1; try { wristRedraw(); } catch (e) {}
  }
  function bjNext() { BJ.k = ((BJ.k == null ? -1 : BJ.k) + 1) % EV_ORDER.length; bjStart(EV_ORDER[BJ.k]); }
  function bjTick(dt) {
    raceTick(dt);
    if (BJ.cur) { let go = true; try { go = BJ.cur.tick(Math.min(dt, .05)); } catch (e) { console.warn("jelenet", e); go = false; } if (!go) { BJ.cur = null; BJ.next = rr(28, 55); W.panelDirty = 1; } }
    else if (BJ.race) { BJ.next -= dt; if (BJ.next < 0) bjNext(); }
  }
  function bjDispose() { try { if (BJ.cur && BJ.cur.stop) BJ.cur.stop(); } catch (e) {} Object.keys(BJ).forEach((k) => delete BJ[k]); }
  /* =====================================================================================================
     VITORLÁS SAKK – VR (2026. nov. 9.)
     A sakktábla maga a Balaton: 9 × 9 méteres vízmezők (világos: türkiz sekély víz, sötét: mélykék), a mezőket
     úszó kötélsorok választják el, körben mahagóni–sárgaréz úszóstég. A bábuk (nov. 9. hajnaltól) a tulajdonos
     képének életnagyságú figurái – lásd 06e-sakk-f.js (kikötőbak, csikóhal, hajókormány, világítótorony, királynő,
     kapitány; ezüst és arany, tengerkék zománccal). Az alábbi hajós készlet kódja megmaradt, de nem használt.
     Naplemente (a tulajdonos ChatGPT-képe: „Luxus tengerészeti sakk naplementében”).
     Nézőpontok: parancsnoki híd (saját oldal), stég (életnagyság), két oldaltorony, az ellenfél hídja,
     hőlégballon (madártávlat) és körrepülés a ballonnal; a stégre csippentve oda lépsz.
     Kezelés: VR-ben a kéz sugara + csippentés (kontrollerrel ravasz), 2D-ben egér / ujj.
     A szabályok és a gép a stégjáték (gameChess) motorja – a mentés is közös („zephyr-sakk”), így a 2D-ben
     elkezdett játszma itt folytatható, és fordítva.
     ===================================================================================================== */
  const SQ = 9, BH = SQ * 4, GAP = 1.6, BI = BH + GAP, RS = BI / 8, PONT = 2.8, PONT_Y = .55, TOWER_Y = 24, TOWER_D = BI + PONT + 11, PSC = .86;
  const CSUN = new THREE.Vector3(-.86, .105, -.5).normalize();   /* lemenő nap: nyugat-északnyugat, 6° magasan */
  const sqX = (i) => ((i & 7) - 3.5) * SQ, sqZ = (i) => ((i >> 3) - 3.5) * SQ;
  const PAL = {
    w: { name: "Világos", hull: "#f3ecdc", hull2: "#e6dcc4", trim: "#c9a227", trim2: "#8f6d1e", metal: "#d9b25a", sail: "#fbf7ec", sail2: "#d9b25a", flag: "#fbf7ec", flagC: "#c9a227",
      wood: "#c99a5e", wood2: "#a8763c", anti: "#efe9db", boot: "#c9a227", shirt: "#f6f4ee", pants: "#2a3a5a", tower: ["#f7f3e8", "#c9a227"], shield: ["#f3ecdc", "#c9a227"], dome: "#d9b25a", gem: "#2a64c8" },
    b: { name: "Sötét", hull: "#0e2142", hull2: "#16305a", trim: "#7d1b2c", trim2: "#b08d57", metal: "#b08d57", sail: "#5f2430", sail2: "#13284a", flag: "#0e2142", flagC: "#b08d57",
      wood: "#6a4628", wood2: "#4a2e18", anti: "#14171c", boot: "#7d1b2c", shirt: "#1b2b4a", pants: "#2b1a14", tower: ["#0e2142", "#7d1b2c"], shield: ["#0e2142", "#7d1b2c"], dome: "#8c6a3c", gem: "#c62828" }
  };
  const NAMES = { p: ["Gyalog", "evezős csónak"], n: ["Huszár", "lófejes viking hajó"], b: ["Futó", "versenyjacht"], r: ["Bástya", "világítótorony"], q: ["Vezér", "kétárbócos fregatt"], k: ["Király", "háromárbócos sorhajó"] };
  const GLYPH = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" };

  /* ------------------------------------------------------------------ HAJÓTEST-GENERÁTOR
     u: 0 = tat, 1 = orr (az orr −z felé néz), a vízvonal y = 0. A szelvény szuperellipszis (teltebb közép, karcsú vég),
     a fedélzetvonal (sheer) az orrnál és a tatnál felível, az orr- és tattőke dől (rake). UV: u hosszában; v alul vízszintes
     sávokban (a vízvonal egyenes), a vízvonal fölött a fedélzetvonalat követi (a díszcsíkok és ágyúnyílások vele íveznek). */
  function hullGeo(o) {
    const NU = o.NU || 40, NV = o.NV || 12, L = o.L, e = 2 / (o.n || 2.6), e2 = 2 / (o.n2 || o.n || 2.6), yW = o.yW != null ? o.yW : .1, vW = .3, yMin = -o.T;
    const prof = (u) => {
      const sh = o.F + (o.sb || 0) * Math.pow(Math.max(0, (u - .5) / .5), 2.2) + (o.ss || 0) * Math.pow(Math.max(0, (.5 - u) / .5), 2.2);
      let f = 1;
      if (u > .56) f = Math.pow(Math.max(0, Math.cos((u - .56) / .44 * Math.PI / 2)), o.bowP || .7);
      else if (u < .38) { const k = u / .38; f = (o.tw || 0) + (1 - (o.tw || 0)) * Math.pow(Math.sin(k * Math.PI / 2), o.sternP || .55); }
      const kl = -o.T * (1 - (o.rocker == null ? .45 : o.rocker) * Math.pow(Math.abs(2 * u - 1), 2.6));
      return { sh, hb: Math.max(.004, o.B / 2 * f), kl, z: (.5 - u) * L };
    };
    const vert = (u, a, sd) => {
      const p = prof(u), s = Math.sin(a), c = Math.cos(a), h01 = 1 - Math.pow(c, e2), y = p.kl + (p.sh - p.kl) * h01;
      let x = p.hb * Math.pow(s, e);
      if (o.tumble) x *= 1 - o.tumble * Math.pow(Math.max(0, (h01 - .62) / .38), 2);
      let z = p.z;
      if (u > .78 && o.rake) z -= o.rake * Math.pow(h01, 1.4) * Math.pow((u - .78) / .22, 2);
      if (u < .2 && o.srake) z += o.srake * h01 * Math.pow((.2 - u) / .2, 2);
      const v = y <= yW ? (y - yMin) / (yW - yMin) * vW : vW + (y - yW) / Math.max(.05, p.sh - yW) * (1 - vW);
      return [sd * x, y, z, u, clamp(v, 0, 1)];
    };
    const pos = [], uv = [], idx = [];
    [1, -1].forEach((sd) => {
      const base = pos.length / 3;
      for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) { const q = vert(i / NU, j / NV * Math.PI / 2, sd); pos.push(q[0], q[1], q[2]); uv.push(q[3], .25 + q[4] * .75); }
      for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = base + i * (NV + 1) + j, b = a + NV + 1; if (sd > 0) idx.push(a, b, a + 1, a + 1, b, b + 1); else idx.push(a, a + 1, b, a + 1, b + 1, b); }
    });
    const hull = new THREE.BufferGeometry(); hull.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); hull.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); hull.setIndex(idx); hull.computeVertexNormals();
    /* fedélzet: a fedélzetvonal alatt (bw = mellvéd magassága); nyitott csónaknál fix magasságú padló */
    const dk = [], du = [], di = [], bw = o.bw == null ? .14 : o.bw;
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, p = prof(u), top = vert(u, Math.PI / 2, 1), y = o.floor != null ? o.floor : p.sh - bw;
      let x; if (o.floor != null) { let best = 0; for (let j = 0; j <= 24; j++) { const q = vert(u, j / 24 * Math.PI / 2, 1); if (q[1] <= y) best = Math.abs(q[0]); } x = best * .98; } else x = Math.abs(top[0]) * .965;
      dk.push(-x, y, top[2], x, y, top[2]); du.push(.5 - top[2] / (L * 1.25), .005, .5 - top[2] / (L * 1.25), .12);
      if (i < NU) { const a = i * 2; di.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const deck = new THREE.BufferGeometry(); deck.setAttribute("position", new THREE.Float32BufferAttribute(dk, 3)); deck.setAttribute("uv", new THREE.Float32BufferAttribute(du, 2)); deck.setIndex(di); deck.computeVertexNormals();
    /* tükör (tatlap) */
    let transom = null;
    if ((o.tw || 0) > .05) {
      const ring = []; for (let j = NV; j >= 0; j--) ring.push(vert(0, j / NV * Math.PI / 2, 1)); for (let j = 1; j <= NV; j++) ring.push(vert(0, j / NV * Math.PI / 2, -1));
      const p0 = prof(0), cy = (p0.kl + p0.sh) / 2, tp = [0, cy, p0.z + (o.srake || 0) * .5], tpos = [], tuv = [], ti = [];
      const hbm = p0.hb, uvOf = (q) => [(q[0] / (2 * hbm) + .5) * .25, .125 + clamp((q[1] - p0.kl) / (p0.sh - p0.kl), 0, 1) * .125];
      tpos.push(...tp); tuv.push(...uvOf(tp));
      ring.forEach((q) => { tpos.push(q[0], q[1], q[2] + .004); tuv.push(...uvOf(q)); });
      for (let k = 1; k < ring.length; k++) ti.push(0, k, k + 1);
      transom = new THREE.BufferGeometry(); transom.setAttribute("position", new THREE.Float32BufferAttribute(tpos, 3)); transom.setAttribute("uv", new THREE.Float32BufferAttribute(tuv, 2)); transom.setIndex(ti); transom.computeVertexNormals();
    }
    const rail = (sd, dy, dx) => { const pts = []; for (let k = 0; k <= 40; k++) { const q = vert(.003 + k / 40 * .994, Math.PI / 2, sd); pts.push(new THREE.Vector3(q[0] + sd * (dx || 0), q[1] + (dy || 0), q[2])); } return new THREE.CatmullRomCurve3(pts); };
    return { hull, deck, transom, prof, vert, rail, v0: (0 - yMin) / (yW - yMin) * vW, vW };
  }
  /* a hajótest festése: alul (vízvonal alatt) algagátló / rézlemez, csizmacsík, fölötte palánkok, díszcsíkok, ágyúnyílások */
  function hullPaint(H, s) {
    /* atlasz (1024 × 1024): felül a hajótest oldala (768 px), alatta a tatlap (bal 256 × 128 px), legalul a fedélzet palánkjai – így egy hajótest egyetlen rajzolási hívás */
    return canvasTex(1024, 1024, (g, w, H2) => {
      const h = H2 * .75, Y = (v) => (1 - v) * h, F = (f) => Y(H.vW + f * (1 - H.vW));
      g.fillStyle = s.top; g.fillRect(0, 0, w, H2);
      /* palánkok (fa) vagy finom festett lemezillesztés */
      if (s.planks) { const n = s.planks.n || 9; for (let i = 0; i < n; i++) { const y0 = F(i / n), y1 = F((i + 1) / n), c = new THREE.Color(s.planks.c0).lerp(new THREE.Color(s.planks.c1), (Math.sin(i * 12.9) * .5 + .5));
          g.fillStyle = "#" + c.getHexString(); g.fillRect(0, y1, w, y0 - y1);
          for (let k = 0; k < 18; k++) { g.strokeStyle = `rgba(${k % 2 ? "40,22,8" : "255,236,200"},${.05 + (k % 3) * .02})`; g.lineWidth = 1; g.beginPath(); const yy = y1 + (y0 - y1) * ((k * .37) % 1); g.moveTo(0, yy); for (let x = 0; x <= w; x += 64) g.lineTo(x, yy + Math.sin(x * .013 + k + i) * 1.5); g.stroke(); }
          g.fillStyle = `rgba(20,10,4,${s.planks.clinker ? .55 : .3})`; g.fillRect(0, y1, w, s.planks.clinker ? 3 : 1.5);
          if (s.planks.clinker) { g.fillStyle = "rgba(255,240,210,.18)"; g.fillRect(0, y1 + 3, w, 2); }
          for (let x = (i * 137) % 160; x < w; x += 160 + (i * 31) % 70) { g.fillStyle = "rgba(25,12,5,.35)"; g.fillRect(x, y1, 1.5, y0 - y1); } } }
      else { g.fillStyle = "rgba(255,255,255,.05)"; for (let i = 0; i < 12; i++) g.fillRect(0, F(i / 12), w, 1); }
      (s.bands || []).forEach(([f0, f1, c]) => { g.fillStyle = c; g.fillRect(0, F(f1), w, F(f0) - F(f1)); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(0, F(f1), w, 1.5); });
      (s.ports || []).forEach((P) => {
        const ph = (F(P.f - P.h / 2) - F(P.f + P.h / 2)), pw = ph * (P.wr || 1.05);
        for (let k = 0; k < P.n; k++) { const x = (P.u0 + (P.u1 - P.u0) * (k + .5) / P.n) * w, y = F(P.f + P.h / 2);
          g.fillStyle = P.frame; g.fillRect(x - pw / 2 - 3, y - 3, pw + 6, ph + 6); g.fillStyle = P.col; g.fillRect(x - pw / 2, y, pw, ph);
          g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(x - pw * .18, y + ph * .3, pw * .36, ph * .4); }
      });
      /* vízvonal alatt */
      g.fillStyle = s.anti; g.fillRect(0, Y(H.v0), w, h - Y(H.v0));
      if (s.copper) { for (let y = Y(H.v0); y < h; y += 9) for (let x = ((y / 9) % 2) * 8; x < w; x += 16) { g.fillStyle = `rgba(${120 + (x * y) % 60},${70 + (x + y) % 30},40,.35)`; g.fillRect(x, y, 15, 8); } g.fillStyle = "rgba(90,170,140,.12)"; g.fillRect(0, Y(H.v0), w, h); }
      g.fillStyle = s.boot; g.fillRect(0, Y(H.vW), w, Y(H.v0) - Y(H.vW));
      g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(0, Y(H.vW), w, 2);
      if (s.top2) { g.fillStyle = s.top2; g.fillRect(0, F(.94), w, F(.86) - F(.94)); }
      /* tatlap */
      { const x0 = 0, y0 = H2 * .75, tw = w * .25, th = H2 * .125; g.fillStyle = s.top; g.fillRect(x0, y0, tw, th);
        if (s.transom) s.transom(g, x0, y0, tw, th); else { g.fillStyle = s.boot; g.fillRect(x0, y0 + th * .78, tw, th * .22); (s.bands || []).slice(-1).forEach(([f0, f1, c]) => { g.fillStyle = c; g.fillRect(x0, y0 + th * (1 - f1) * .7, tw, th * (f1 - f0) * .7); }); } }
      /* fedélzet: hosszanti palánkok (u = hossz, v = szélesség) */
      { const y0 = H2 * .875, dh = H2 * .125, n = 14, c0 = new THREE.Color(s.deck0 || "#c08a52"), c1 = new THREE.Color(s.deck1 || "#946232");
        for (let i = 0; i < n; i++) { const c = c0.clone().lerp(c1, (Math.sin(i * 7.7) * .5 + .5)); g.fillStyle = "#" + c.getHexString(); g.fillRect(0, y0 + i * dh / n, w, dh / n);
          g.fillStyle = "rgba(30,16,6,.6)"; g.fillRect(0, y0 + i * dh / n, w, 1.5);
          for (let x = (i * 97) % 140; x < w; x += 140 + (i * 23) % 60) { g.fillStyle = "rgba(30,16,6,.45)"; g.fillRect(x, y0 + i * dh / n, 1.5, dh / n); } }
        if (s.deckCol) { g.fillStyle = s.deckCol; g.fillRect(0, y0, w, dh); for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(0,0,0,${.03 + (k % 5) * .01})`; g.fillRect((k * 131) % w, y0 + (k * 57) % dh, 2, 2); } } }
    });
  }
  /* ------------------------------------------------------------------ alkatrész-segédek (csúcsszínes összevonáshoz) */
  const ROD = (a, b, r, col, key, seg) => { const [g, m] = rodGeom(a, b, r, seg || 6); return [g, col, m, key]; };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const mul = (A, B) => A.clone().multiply(B);
  /* vitorlák: domborodó (szél a tat felől → az orr felé, −z irányban dagad) */
  function sqSailGeo(wTop, wBot, h, bulge) {
    const g = new THREE.PlaneGeometry(1, h, 10, 8), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const yy = p.getY(i) / (h / 2), sc = lerp(wBot, wTop, (yy + 1) / 2), x = p.getX(i) * sc; const xx = x / (sc / 2);
      p.setX(i, x); p.setY(i, p.getY(i) + (1 - xx * xx) * -.06 * h * (yy < -.6 ? (-.6 - yy) * 2.5 : 0)); p.setZ(i, -bulge * (1 - xx * xx) * (1 - .35 * yy * yy)); }
    g.computeVertexNormals(); return g;
  }
  function triSailGeo(A, B, C, bulge, nu) {   /* háromszög-vitorla (orrvitorla, gaffvitorla közelítése): oldalra (x) dagad */
    nu = nu || 8; const pos = [], uv = [], idx = [], row = [];
    let n = 0; for (let j = 0; j <= nu; j++) { row[j] = n; for (let i = 0; i <= nu - j; i++) { const u = i / nu, v = j / nu, w0 = 1 - u - v, k = 27 * u * v * Math.max(0, w0) + 1.5 * u * Math.max(0, w0) * .0;
      pos.push(A[0] + (B[0] - A[0]) * u + (C[0] - A[0]) * v + bulge * k, A[1] + (B[1] - A[1]) * u + (C[1] - A[1]) * v, A[2] + (B[2] - A[2]) * u + (C[2] - A[2]) * v); uv.push(u + v * .5, v); n++; } }
    for (let j = 0; j < nu; j++) for (let i = 0; i < nu - j; i++) { const a = row[j] + i, b = a + 1, c = row[j + 1] + i; idx.push(a, b, c); if (i < nu - j - 1) idx.push(b, row[j + 1] + i + 1, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const SAILTX = {};
  function sailTexC(col, opt) {
    opt = opt || {}; const key = col + (opt.stripe || "") + (opt.emblem || "") + (opt.gold || "");
    if (SAILTX[key]) return SAILTX[key];
    return SAILTX[key] = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = col; g.fillRect(0, 0, w, h);
      if (opt.stripe) for (let x = 0; x < w; x += 64) { g.fillStyle = opt.stripe; g.fillRect(x, 0, 32, h); }
      for (let x = 0; x < w; x += 21) { g.fillStyle = "rgba(0,0,0,.07)"; g.fillRect(x, 0, 1.4, h); }   /* vitorlavászon-varratok */
      for (let y = 0; y < h; y += 43) { g.fillStyle = "rgba(0,0,0,.04)"; g.fillRect(0, y, w, 1); }
      g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 5; g.strokeRect(2, 2, w - 4, h - 4);   /* lik (szegélykötél) */
      if (opt.emblem) { g.save(); g.translate(w / 2, h * .52); g.fillStyle = opt.emblem; g.strokeStyle = opt.emblem; g.lineWidth = 6;
        g.beginPath(); g.moveTo(-46, 22); g.lineTo(-52, -26); g.lineTo(-24, 0); g.lineTo(0, -38); g.lineTo(24, 0); g.lineTo(52, -26); g.lineTo(46, 22); g.closePath(); g.fill();
        g.fillRect(-48, 28, 96, 12); g.restore(); }
      if (opt.gold) { g.fillStyle = opt.gold; g.fillRect(0, h - 18, w, 6); }
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,.06)"); gr.addColorStop(1, "rgba(0,0,0,.1)"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
  }
  /* lobogó: fát a rúdnál (x = 0) – a csúcsárnyalóban hullámzik */
  const FLAGU = { value: 0 };
  function flagMat(tex) {
    const m = std({ map: tex, side: THREE.DoubleSide, roughness: .8 });
    m.onBeforeCompile = (sh) => { sh.uniforms.uFT = FLAGU; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uFT;").replace("#include <begin_vertex>",
      "#include <begin_vertex>\n float fx = max(position.x, 0.); transformed.z += sin(fx * 3.1 - uFT * 6.4 + position.y * 1.4) * .13 * fx; transformed.y -= .035 * fx * fx;"); };
    m.customProgramCacheKey = () => "zflag"; return m;
  }
  function flagTexC(c, kind) {
    const P = PAL[c];
    return canvasTex(256, 160, (g, w, h) => {
      g.fillStyle = P.flag; g.fillRect(0, 0, w, h);
      if (kind === "royal") { g.fillStyle = c === "w" ? "#c9a227" : "#7d1b2c"; g.fillRect(0, 0, w, 22); g.fillRect(0, h - 22, w, 22); }
      else { g.fillStyle = c === "w" ? "#c9a227" : "#7d1b2c"; g.fillRect(0, h / 2 - 10, w, 20); }
      g.save(); g.translate(w * .5, h * .5); g.fillStyle = P.flagC; g.strokeStyle = c === "w" ? "#8f6d1e" : "#f0d9a0"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-34, 18); g.lineTo(-40, -20); g.lineTo(-18, 2); g.lineTo(0, -30); g.lineTo(18, 2); g.lineTo(40, -20); g.lineTo(34, 18); g.closePath(); g.fill(); g.stroke(); g.fillRect(-36, 22, 72, 10);
      g.restore();
      g.fillStyle = "rgba(0,0,0,.08)"; for (let x = 0; x < w; x += 18) g.fillRect(x, 0, 1, h);
    });
  }
  function makeFlag(c, w, h, kind, parent, x, y, z) {
    const key = "flag" + c + kind; if (!VS.mats[key]) VS.mats[key] = flagMat(flagTexC(c, kind));
    /* a lobogó a rúdtól hátrafelé (+z) lobog: a geometria x mentén fut (a csúcsárnyaló ezt hullámoztatja), a háló −90°-kal elforgatva */
    const m = mesh(new THREE.PlaneGeometry(w, h, 10, 4).translate(w / 2, 0, 0), VS.mats[key], parent);
    m.position.set(x, y, z); m.rotation.y = -Math.PI / 2; m.userData.lod = 1;
    return m;
  }
  function pennantGeo(L, H) { const g = new THREE.BufferGeometry(), pos = [], idx = []; const N = 10; for (let i = 0; i <= N; i++) { const x = i / N * L, hh = H * (1 - i / N) + .01; pos.push(x, hh / 2, 0, x, -hh / 2, 0); if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
  function makePennant(c, L, H, parent, x, y, z) {
    const key = "pen" + c; if (!VS.mats[key]) { const m = flagMat(canvasTex(8, 8, (g) => { g.fillStyle = c === "w" ? "#c9a227" : "#7d1b2c"; g.fillRect(0, 0, 8, 8); })); VS.mats[key] = m; }
    const m = mesh(pennantGeo(L, H), VS.mats[key], parent); m.position.set(x, y, z); m.rotation.y = -Math.PI / 2; m.userData.lod = 1; return m;
  }
  /* emberalak (ülő vagy álló), csúcsszínes alkatrészként */
  function figParts(L, base, o) {
    const B = (geo, col, m) => L.push([geo, col, mul(base, m), o.key]);
    const sk = o.skin || "#d9a988";
    if (o.sit) {
      B(CY(.075, .07, .44, 6).rotateX(Math.PI / 2), o.pants, M4(-.1, .42, -.2)); B(CY(.075, .07, .44, 6).rotateX(Math.PI / 2), o.pants, M4(.1, .42, -.2));
      B(CY(.06, .055, .42, 6), o.pants, M4(-.1, .22, -.42)); B(CY(.06, .055, .42, 6), o.pants, M4(.1, .22, -.42));
      B(CY(.16, .19, .55, 8), o.shirt, M4(0, .7 + .0, 0, 0, o.lean || 0));
    } else {
      B(CY(.075, .065, .82, 6), o.pants, M4(-.1, .41, 0)); B(CY(.075, .065, .82, 6), o.pants, M4(.1, .41, 0));
      B(CY(.17, .2, .62, 8), o.shirt, M4(0, 1.13, 0));
    }
    const ty = o.sit ? .7 : 1.13, hy = ty + .5;
    if (o.stripe) for (let k = 0; k < 3; k++) B(CY(.185, .19, .05, 8), o.stripe, M4(0, ty - .15 + k * .14, 0));
    B(CY(.055, .05, .5, 6), o.shirt, M4(-.24, ty - .02, -.1, 0, o.armA != null ? o.armA : -.5, .2)); B(CY(.055, .05, .5, 6), o.shirt, M4(.24, ty - .02, -.1, 0, o.armA != null ? o.armA : -.5, -.2));
    B(new THREE.SphereGeometry(.05, 6, 4), sk, M4(-.27, ty - .2, -.3)); B(new THREE.SphereGeometry(.05, 6, 4), sk, M4(.27, ty - .2, -.3));
    B(CY(.05, .055, .1, 6), sk, M4(0, hy - .2, 0)); B(new THREE.SphereGeometry(.12, 8, 6), sk, M4(0, hy - .02, 0));
    if (o.hat === "cap") { B(CY(.125, .125, .08, 10), o.capCol || "#1b2b4a", M4(0, hy + .1, 0)); B(CY(.15, .15, .015, 12), o.capCol || "#1b2b4a", M4(0, hy + .06, -.04)); }
    if (o.hat === "tri") { B(new THREE.ConeGeometry(.24, .12, 3), o.capCol || "#111", M4(0, hy + .12, 0, Math.PI)); B(new THREE.SphereGeometry(.03, 6, 4), "#d9b25a", M4(0, hy + .14, -.14), "m"); }
    if (o.hat === "helm") { B(new THREE.SphereGeometry(.135, 10, 6, 0, TAU, 0, Math.PI / 2), "#8a8f96", M4(0, hy + .0, 0)); B(BX(.03, .16, .03), "#8a8f96", M4(0, hy - .06, -.13)); }
    if (o.hair) B(new THREE.SphereGeometry(.125, 8, 6, 0, TAU, 0, Math.PI / 2.2), o.hair, M4(0, hy + .01, .01));
  }
  /* korona (vezér: 5 ágú; király: kereszttel) */
  function crownParts(L, base, r, col, gem, cross) {
    const B = (geo, c, m, k) => L.push([geo, c, mul(base, m), k || "m"]);
    B(CY(r, r * .92, r * .55, 14), col, M4(0, r * .27, 0)); B(new THREE.TorusGeometry(r * 1.01, r * .09, 4, 16).rotateX(Math.PI / 2), col, M4(0, .02, 0));
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; B(new THREE.ConeGeometry(r * .2, r * .75, 6), col, M4(Math.sin(a) * r * .92, r * .85, Math.cos(a) * r * .92)); B(new THREE.SphereGeometry(r * .1, 5, 3), "#fff6d0", M4(Math.sin(a) * r * .92, r * 1.25, Math.cos(a) * r * .92));
      B(new THREE.SphereGeometry(r * .11, 5, 3), k % 2 ? gem : "#2e9e5a", M4(Math.sin(a + .39) * r * 1.0, r * .28, Math.cos(a + .39) * r * 1.0), "s"); }
    B(new THREE.SphereGeometry(r * .5, 12, 8, 0, TAU, 0, Math.PI / 2), "#7d1b2c", M4(0, r * .5, 0), "s");
    if (cross) { B(new THREE.SphereGeometry(r * .2, 10, 8), col, M4(0, r * 1.15, 0)); B(BX(r * .14, r * .7, r * .14), col, M4(0, r * 1.6, 0)); B(BX(r * .46, r * .14, r * .14), col, M4(0, r * 1.7, 0)); }
    else B(new THREE.SphereGeometry(r * .24, 10, 8), col, M4(0, r * 1.15, 0));
  }
  /* kötélzet: vonalak (egy rajzolási hívás hajónként) */
  function rigLines(segs, parent, col) {
    const a = new Float32Array(segs.length * 6); segs.forEach(([p, q], i) => { a.set([p.x, p.y, p.z, q.x, q.y, q.z], i * 6); });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    const key = "rig" + (col || ""); if (!VS.mats[key]) VS.mats[key] = new THREE.LineBasicMaterial({ color: col || "#2a1f16", transparent: true, opacity: .85 }), W.disposables.push(VS.mats[key]);
    const l = new THREE.LineSegments(g, VS.mats[key]); l.userData.lod = 1; W.disposables.push(g); parent.add(l); return l;
  }
  function hullMeshes(G, H, tex, o) {
    const hm = std({ map: tex, roughness: o.rough != null ? o.rough : .42, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 1 });
    if (o.gloss) { hm.roughness = .22; }
    const I = new THREE.Matrix4(), parts = [[H.hull, I], [H.deck, I]]; if (H.transom) parts.push([H.transom, I]);
    mesh(mergeGeoms(parts), hm, G);
    return hm;
  }
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
  /* ------------------------------------------------------------------ KÖRNYEZET: naplementés ég, Balaton-tábla (a víz árnyalójába festett mezők) */
  const CS = {};
  function makeSunsetSky(parent) {
    const tex = cloudTexture(); tex.wrapS = THREE.RepeatWrapping;
    const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uSun: { value: CSUN }, uClouds: { value: tex }, uTime: { value: 0 } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
      fragmentShader: `uniform vec3 uSun; uniform sampler2D uClouds; uniform float uTime; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir); float el = d.y; float s = max(dot(d, uSun), 0.);
          float sa = max(dot(normalize(vec3(d.x, 0., d.z) + 1e-5), normalize(vec3(uSun.x, 0., uSun.z))), 0.);
          vec3 hor = mix(vec3(.93, .52, .52), vec3(1., .63, .28), pow(sa, 2.5));
          vec3 mid = mix(vec3(.50, .36, .60), vec3(.86, .50, .46), pow(sa, 3.));
          vec3 zen = vec3(.12, .15, .36);
          vec3 col = mix(hor, mid, smoothstep(.0, .2, el)); col = mix(col, zen, smoothstep(.16, .78, el));
          col += vec3(1., .5, .18) * pow(s, 7.) * .55 + vec3(1., .78, .45) * pow(s, 90.) * .9 + vec3(1., .92, .7) * smoothstep(.99955, .99975, s) * 3.;
          if (el > 0.) {
            float u = atan(d.x, -d.z) / 6.2831853 + .5 + uTime * .0005, v = 1. - clamp(el / .55, 0., 1.);
            vec4 c = texture2D(uClouds, vec2(u, clamp(v, .02, .98)));
            vec3 cc = mix(vec3(.30, .22, .40), vec3(1., .62, .48), c.r * (.45 + .55 * pow(sa, 2.))) + vec3(1., .45, .15) * pow(s, 5.) * .9;
            col = mix(col, cc, c.a * smoothstep(0., .04, el) * .88);
          } else col = mix(hor * .8, vec3(.16, .12, .2), clamp(-el * 5., 0., 1.));
          gl_FragColor = vec4(col, 1.);
          #include <colorspace_fragment>
        }` });
    W.disposables.push(mat);
    const m = mesh(new THREE.SphereGeometry(9000, 48, 24), mat, parent); m.renderOrder = -20; m.frustumCulled = false;
    W.upd.push((dt) => { mat.uniforms.uTime.value += dt; });
    return m;
  }
  function patchWater(wm) {
    const mat = wm.userData.mat, U = mat.uniforms;
    const data = new Uint8Array(64 * 4), tex = new THREE.DataTexture(data, 8, 8, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.needsUpdate = true; W.disposables.push(tex);
    U.uHL = { value: tex }; U.uLSq = { value: new THREE.Color(.78, .64, .44) }; U.uDSq = { value: new THREE.Color(.02, .045, .13) }; U.uPulse = { value: 0 }; U.uBoard = { value: boardTex() };
    const damp = `float bDamp(vec2 q){ return 1. - 1.0 * (1. - smoothstep(${BH.toFixed(1)}, ${(BH + 14).toFixed(1)}, max(abs(q.x), abs(q.y)))); }\n`;
    mat.vertexShader = mat.vertexShader.replace("void main(){", damp + "void main(){").replace("vec3 disp = vec3(0.);", "fadeD *= bDamp(w); vec3 disp = vec3(0.);");
    const BASE = "vec3 base = mix(uDeep, uShallow, clamp(.35 + crest * 1.6 + n.x * .8, 0., 1.)) * (1. - gust * .16) * uLight;";
    if (mat.fragmentShader.indexOf(BASE) < 0) console.warn("sakk: a víz árnyalója megváltozott");
    mat.fragmentShader = mat.fragmentShader
      .replace("uniform vec4 uW[5];", "uniform vec4 uW[5]; uniform sampler2D uHL, uBoard; uniform vec3 uLSq, uDSq; uniform float uPulse;")
      .replace("void main(){", damp + "void main(){")
      .replace("float px = length(fwidth(vW)) + 1e-4;", "float bdm = bDamp(vW); fadeD *= bdm; fa *= bdm; fb *= bdm; float px = length(fwidth(vW)) + 1e-4;")
      /* 2026-11-11 (tulajdonos, szemüvegből: „a tábla felszínén folyamatosan látok mozgást, apró vonalkás imitációt”): a tábla fölött az apró fodrok (g, g3),
         a szélfoltok és a kausztika is nulla – mozdulatlan tükörsík; csak a hajók külön nyomhulláma mozog rajta */
      .replace("n = normalize(n + vec3(-(g.x * fa", "gust *= bdm; n = normalize(n + vec3(-(g.x * fa")
      .replace(BASE, BASE + `
          vec3 bHL = vec3(0.); vec2 bq = vW / ${SQ.toFixed(1)} + 4.;
          if (bq.x > 0. && bq.x < 8. && bq.y > 0. && bq.y < 8.) {
            vec2 cell = floor(bq), fr = fract(bq) - .5; float lt = 1. - mod(cell.x + cell.y, 2.);
            float shade = .72;
            vec3 sqc = mix(uDSq, uLSq, lt) * shade * uLight;
            float cau = 0.;
            base = mix(base, sqc + cau * vec3(1., .86, .62), .88);
            float edge = max(abs(fr.x), abs(fr.y));
            vec4 hl = texture2D(uHL, (cell + .5) / 8.);
            float hp = hl.a > .99 ? (.55 + .45 * uPulse) : 1.;
            bHL = hl.rgb * hl.a * hp * (.38 + 1.0 * smoothstep(.34, .5, edge));
          }
          { vec2 bu = (vW + ${BF.toFixed(2)}) / ${(2 * BF).toFixed(2)};
            if (bu.x > 0. && bu.x < 1. && bu.y > 0. && bu.y < 1.) { vec4 bd = texture2D(uBoard, bu); float gl = clamp(.8 + crest * 2.2 + n.x * .9, .45, 1.5);
              vec3 bc = bd.rgb * gl * uLight * 1.15 + vec3(1., .85, .5) * pow(max(0., n.x + crest * 3.), 2.) * .35 * bd.a; base = mix(base, bc, bd.a); } }`)
      .replace("vec3 col = mix(base, sky, fres * .75);", "vec3 col = mix(base, sky, fres * .75 * (bq.x > 0. && bq.x < 8. && bq.y > 0. && bq.y < 8. ? .55 : 1.)); col += bHL;");
    mat.needsUpdate = true;
    U.uSkyH.value.setRGB(1.0, .6, .45); U.uSkyZ.value.setRGB(.33, .3, .55); U.uDeep.value.setRGB(.03, .05, .11); U.uShallow.value.setRGB(.13, .17, .25);
    U.uSunC.value.setRGB(1.5, .9, .45); U.uHaze.value.setRGB(.82, .56, .55); U.uLight.value = .85;
    return { tex, data };
  }
  /* a víz magassága egy pontban (a hajók ringásához) – a tábla fölött csillapítva, mint az árnyalóban */
  const bDampJS = (x, z) => 1 - 1.0 * (1 - smoothstepJS(BH, BH + 14, Math.max(Math.abs(x), Math.abs(z))));
  function smoothstepJS(a, b, x) { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); }
  const waveB = (x, z) => waveAt(x, z, W.t) * bDampJS(x, z);

  /* úszó kötélsorok a mezők között (úszók: egy példányosított háló, a csúcsárnyalóban ringanak) */
  const WAVE_GLSL = () => `uniform float uWT; uniform vec4 uWW[5]; uniform float uWD;
    float wH(vec2 p){ float y = 0.; for (int i = 0; i < 5; i++){ float dir = uWD + uWW[i].x, k = uWW[i].y, A = uWW[i].z, c = sqrt(9.81 / k); y += A * sin(k * (cos(dir) * p.x + sin(dir) * p.y) - k * c * uWT); }
      return y * (1. - 1.0 * (1. - smoothstep(${BH.toFixed(1)}, ${(BH + 14).toFixed(1)}, max(abs(p.x), abs(p.y))))); }`;
  const WU = { uWT: { value: 0 }, uWW: { value: WAVES.map(([a, L, A, Q]) => new THREE.Vector4(a * D2R, TAU / L, A, Q)) }, uWD: { value: WIND_DIR } };
  function bobMat(o) {
    const m = std(o);
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, WU); sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + WAVE_GLSL())
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n vec4 ipw = instanceMatrix * vec4(0., 0., 0., 1.); transformed.y += wH(ipw.xz) / max(.001, length(instanceMatrix[1].xyz));"); };
    m.customProgramCacheKey = () => "zbob"; return m;
  }
  function buildLanes(env) {
    const pts = [];
    for (let k = 0; k <= 8; k++) { const c = -BH + k * SQ; for (let s = -BH + .45; s < BH; s += .9) { pts.push([c, s, 0, k], [s, c, 1, k]); } }
    const g = new THREE.SphereGeometry(.15, 5, 3); g.scale(1, .8, 1.9);
    const m = bobMat({ roughness: .35, metalness: .15 });
    const im = new THREE.InstancedMesh(g, m, pts.length); W.disposables.push(g);
    const M = new THREE.Matrix4(), col = new THREE.Color(), cw = new THREE.Color("#e8c46a"), cg = new THREE.Color("#c99a2e"), cn = new THREE.Color("#183a6a");
    /* ax = 0: z-irányú sor az x = a vonalon; ax = 1: x-irányú sor a z = b vonalon. Minden 3. úszó arany, minden 9. tengerkék */
    pts.forEach(([a, b, ax], i) => { M.makeRotationY(ax ? Math.PI / 2 : 0); M.setPosition(a, .05, b); im.setMatrixAt(i, M); const n = Math.round(((ax ? a : b) + BH) / .9); im.setColorAt(i, n % 9 === 0 ? cn : n % 3 === 0 ? cg : cw); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false; env.add(im); CS.lanes = im;
  }

  /* ------------------------------------------------------------------ ÚSZÓSTÉG a tábla körül: mahagóni palló, sárgaréz élek, kötélkorlát, lámpák, koordináták */
  function buildPontoon(env) {
    const G = new THREE.Group(); env.add(G);
    const mah = txPlanks("vsmah", "#7a3420", "#4e1e12", 10, { gap: .5, gapW: 2 });
    const outer = BI + PONT;
    const sides = [[0, BI + PONT / 2, 2 * outer, PONT], [0, -BI - PONT / 2, 2 * outer, PONT], [-BI - PONT / 2, 0, PONT, 2 * BI], [BI + PONT / 2, 0, PONT, 2 * BI]];
    { const parts = sides.map(([x, z, w, d]) => { const g = new THREE.BoxGeometry(w, .22, d), p = g.attributes.position, uv = g.attributes.uv;
        for (let i = 0; i < p.count; i++) { const X = p.getX(i) + x, Z = p.getZ(i) + z; uv.setXY(i, w > d ? X / 3 : Z / 3, w > d ? Z / PONT : X / PONT); }   /* a palló hosszában futnak a deszkák */
        return [g, M4(x, PONT_Y - .11, z)]; });
      mah.wrapS = mah.wrapT = THREE.RepeatWrapping; mah.repeat.set(1, 1); mah.rotation = Math.PI / 2; mah.center.set(.5, .5);
      mesh(mergeGeoms(parts), std({ map: mah, roughness: .32 }), G); }
    const L = [];
    /* úszótestek, sárgaréz élszegély, ütközők */
    sides.forEach(([x, z, w, d]) => {
      const n = Math.round(Math.max(w, d) / 2.2);
      for (let k = 0; k < n; k++) { const f = (k + .5) / n - .5; L.push([BX(w > d ? 1.8 : w * .85, .5, w > d ? d * .85 : 1.8), "#1d2026", M4(x + (w > d ? f * w : 0), PONT_Y - .48, z + (w > d ? 0 : f * d))]); }
      [-1, 1].forEach((sd) => L.push([BX(w > d ? w : .06, .07, w > d ? .06 : d), "#c9a227", M4(x + (w > d ? 0 : sd * w / 2), PONT_Y - .02, z + (w > d ? sd * d / 2 : 0)), "m"]));
    });
    /* sárgaréz oszlopok a belső élen, köztük vastag, csavart kötél (mint a kép mahagóni keretén) */
    const posts = [];
    for (let k = 0; k <= 2 * BI / RS; k++) { const s = -BI + k * RS; posts.push(V3(s, 0, BI + .25), V3(s, 0, -BI - .25), V3(-BI - .25, 0, s), V3(BI + .25, 0, s)); }
    posts.forEach((p) => L.push([CY(.07, .09, .85, 10), "#c9a227", M4(p.x, PONT_Y + .42, p.z), "m"], [new THREE.SphereGeometry(.1, 10, 8), "#e2c46a", M4(p.x, PONT_Y + .9, p.z), "m"]));
    const ropeT = canvasTex(64, 256, (g, w, h) => { g.fillStyle = "#d8c08a"; g.fillRect(0, 0, w, h); for (let y = -w; y < h; y += 14) { g.strokeStyle = "rgba(90,66,30,.55)"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + w * .9); g.stroke(); g.strokeStyle = "rgba(255,246,220,.5)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y + 5); g.lineTo(w, y + 5 + w * .9); g.stroke(); } }, { repeat: [1, 30] });
    const ropeM = std({ map: ropeT, roughness: .8 });
    const ropes = [];
    const sag = (a, b) => { const pts = []; for (let k = 0; k <= 8; k++) { const f = k / 8; pts.push(V3(lerp(a.x, b.x, f), PONT_Y + .78 - Math.sin(f * Math.PI) * .22, lerp(a.z, b.z, f))); } return pts; };
    [[V3(-BI, 0, BI + .25), V3(1, 0, 0)], [V3(-BI, 0, -BI - .25), V3(1, 0, 0)], [V3(-BI - .25, 0, -BI), V3(0, 0, 1)], [V3(BI + .25, 0, -BI), V3(0, 0, 1)]].forEach(([o, dir]) => {
      for (let k = 0; k < Math.round(2 * BI / RS); k++) { const a = o.clone().addScaledVector(dir, k * RS), b = o.clone().addScaledVector(dir, (k + 1) * RS); ropes.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sag(a, b)), 12, .055, 6), new THREE.Matrix4()]); } });
    mesh(mergeGeoms(ropes), ropeM, G);
    /* lámpaoszlopok a külső élen (sárgaréz, üveg lámpással – naplementében világítanak) */
    for (let s = -BI; s <= BI + .01; s += BI / 2) [[s, outer - .3], [s, -outer + .3], [-outer + .3, s], [outer - .3, s]].forEach(([x, z]) => {
      L.push([CY(.06, .1, 2.6, 8), "#2a2016", M4(x, PONT_Y + 1.3, z), "m"], [CY(.16, .12, .1, 8), "#c9a227", M4(x, PONT_Y + 2.62, z), "m"], [CY(.13, .15, .38, 8), "#ffd890", M4(x, PONT_Y + 2.87, z), "e"], [new THREE.ConeGeometry(.2, .22, 8), "#c9a227", M4(x, PONT_Y + 3.16, z), "m"]);
    });
    /* sarkokban zászlórúd (csapatzászló) */
    const vg = vcGroup(L, G); if (vg.e) { vg.e.material.emissiveIntensity = 1.6; CS.lamps = vg.e.material; }
    [[-outer + .6, outer - .6, "w"], [outer - .6, outer - .6, "w"], [-outer + .6, -outer + .6, "b"], [outer - .6, -outer + .6, "b"]].forEach(([x, z, c]) => {
      mesh(new THREE.CylinderGeometry(.05, .07, 6, 8), std({ color: "#f2efe6", roughness: .3 }), G).position.set(x, PONT_Y + 3, z);
      makeFlag(c, 1.5, .95, "royal", G, x, PONT_Y + 5.4, z); });
    /* koordináták: sárgaréz betűk a pallón (a–h a világos és a sötét oldalon, 1–8 a két szélén) */
    const GL = "abcdefgh12345678", atlas = canvasTex(1024, 128, (g) => { g.font = "800 92px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
      for (let k = 0; k < 16; k++) { const cx = k * 64 + 32; g.save(); g.beginPath(); g.rect(k * 64, 0, 64, 128); g.clip(); g.scale(.5, 1); g.fillStyle = "#3a1a0c"; g.fillText(GL[k], cx * 2 + 2, 70); const gr = g.createLinearGradient(0, 20, 0, 110); gr.addColorStop(0, "#fff0b0"); gr.addColorStop(.5, "#d9b25a"); gr.addColorStop(1, "#8f6d1e"); g.fillStyle = gr; g.fillText(GL[k], cx * 2, 66); g.restore(); } });
    const lparts = [];
    const put = (ch, x, z, rot) => { const k = GL.indexOf(ch), g = new THREE.PlaneGeometry(2.0, 2.0), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 16);
      g.rotateZ(rot); g.rotateX(-Math.PI / 2); lparts.push([g, M4(x, PONT_Y + .012, z)]); };
    for (let k = 0; k < 8; k++) { const f = "abcdefgh"[k], x = (k - 3.5) * SQ; put(f, x, BI + PONT / 2, 0); put(f, x, -BI - PONT / 2, Math.PI); const r = String(8 - k), z = (k - 3.5) * SQ; put(r, -BI - PONT / 2, z, 0); put(r, BI + PONT / 2, z, 0); }
    { const m = mesh(mergeGeoms(lparts), basic({ map: atlas, transparent: true, depthWrite: false }), G); m.renderOrder = 2; }
    /* sárgaréz névtábla vitorlással a két hosszanti oldal közepén (kívül), horgonyos érmékkel */
    const plaque = canvasTex(512, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#f3dd94"); gr.addColorStop(.5, "#c9a227"); gr.addColorStop(1, "#8f6d1e"); g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(4, 4, w - 8, h - 8, 50) : g.rect(4, 4, w - 8, h - 8); g.fill();
      g.strokeStyle = "#6e5214"; g.lineWidth = 5; g.stroke(); g.fillStyle = "#2a1c08"; g.beginPath(); g.moveTo(w / 2 - 6, 30); g.lineTo(w / 2 - 6, 112); g.lineTo(w / 2 - 70, 112); g.closePath(); g.fill(); g.beginPath(); g.moveTo(w / 2 + 4, 26); g.lineTo(w / 2 + 4, 112); g.lineTo(w / 2 + 64, 112); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(w / 2 - 90, 116); g.quadraticCurveTo(w / 2, 136, w / 2 + 90, 116); g.lineTo(w / 2 + 70, 128); g.lineTo(w / 2 - 74, 128); g.closePath(); g.fill();
      g.font = "700 30px Georgia"; g.textAlign = "center"; g.fillText("ZEPHYR", 110, 92); g.fillText("BALATON", w - 110, 92); });
    const anchor = canvasTex(128, 128, (g) => { g.fillStyle = "#c9a227"; g.beginPath(); g.arc(64, 64, 62, 0, TAU); g.fill(); g.fillStyle = "#0e2142"; g.beginPath(); g.arc(64, 64, 50, 0, TAU); g.fill(); g.strokeStyle = "#e2c46a"; g.lineWidth = 7; g.beginPath(); g.moveTo(64, 30); g.lineTo(64, 98); g.moveTo(46, 44); g.lineTo(82, 44); g.stroke(); g.beginPath(); g.arc(64, 74, 26, .3, Math.PI - .3); g.stroke(); g.beginPath(); g.arc(64, 26, 7, 0, TAU); g.stroke(); });
    { const pp = [], ap = [];
      [[0, outer + .01, 0], [0, -outer - .01, Math.PI]].forEach(([x, z, r]) => { pp.push([new THREE.PlaneGeometry(3.2, 1.0), M4(x, PONT_Y - .35, z, r)]);
        [-3, 3].forEach((dx) => ap.push([new THREE.CircleGeometry(.42, 24), M4(x + (r ? -dx : dx), PONT_Y - .35, z + (r ? -.005 : .005), r)])); });
      mesh(mergeGeoms(pp), std({ map: plaque, metalness: .85, roughness: .28 }), G); mesh(mergeGeoms(ap), std({ map: anchor, metalness: .7, roughness: .3 }), G); }
    /* láthatatlan teleport-felületek: a pallóra csippentve oda lépsz */
    sides.forEach(([x, z, w, d]) => { const t = mesh(new THREE.BoxGeometry(w, .1, d), basic({ visible: false }), G); t.position.set(x, PONT_Y, z);
      t.userData.xr = { click: (h) => { const p = CS.env.worldToLocal(h.point.clone()); goView("walk", { x: clamp(p.x, -outer + .5, outer - .5), z: clamp(p.z, -outer + .5, outer - .5) }); } };
      T.xr.extra.add(t); W.objs.push(t); });
  }

  /* ------------------------------------------------------------------ KILÁTÓTORNYOK (parancsnoki hidak) – tíkfa, sárgaréz, vitorlavászon árnyékoló */
  function buildTower(env, x, z, c) {
    const G = new THREE.Group(); env.add(G); G.position.set(x, 0, z); G.rotation.y = Math.atan2(x, z);   /* a helyi −z a tábla közepe felé néz */
    const L = [], teak = "#9a6a3c", dark = "#5a3a1e", br = "#c9a227";
    L.push([BX(8, .7, 8), "#1d2026", M4(0, .1, 0)], [BX(8.2, .12, 8.2), "#7a3420", M4(0, .5, 0)]);
    const legs = [[-2.4, -2.0], [2.4, -2.0], [-2.4, 2.0], [2.4, 2.0]];
    legs.forEach(([lx, lz]) => L.push([BX(.32, TOWER_Y, .32), dark, M4(lx, TOWER_Y / 2 + .5, lz)]));
    for (let y = 1.2; y < TOWER_Y - 2.6; y += 2.7) { [[-2.4, -2, 2.4, -2], [-2.4, 2, 2.4, 2], [-2.4, -2, -2.4, 2], [2.4, -2, 2.4, 2]].forEach(([a, b, cc, d]) => { L.push(ROD(V3(a, y, b), V3(cc, y + 2.4, d), .07, dark), ROD(V3(cc, y, d), V3(a, y + 2.4, b), .07, dark)); L.push([BX(Math.abs(cc - a) + .3, .16, Math.abs(d - b) + .3), dark, M4((a + cc) / 2, y, (b + d) / 2)]); }); }
    /* lépcső: cikcakk lépcsőkarok pihenőkkel a hátsó oldalon */
    const fl = 4, hh = (TOWER_Y - .5) / fl;
    for (let f = 0; f < fl; f++) { const y0 = .55 + f * hh, sd = f % 2 ? -1 : 1; const n = 10;
      for (let k = 0; k < n; k++) L.push([BX(1.0, .06, .3), teak, M4(sd * (-1.6 + k * 3.2 / n), y0 + (k + .5) * hh / n, 2.75)]);
      L.push(ROD(V3(-1.7 * sd, y0, 2.3), V3(1.7 * sd, y0 + hh, 2.3), .05, dark), ROD(V3(-1.7 * sd, y0, 3.2), V3(1.7 * sd, y0 + hh, 3.2), .05, dark));
      L.push(ROD(V3(-1.7 * sd, y0 + 1, 3.25), V3(1.7 * sd, y0 + hh + 1, 3.25), .03, br, "m")); }
    /* fedélzet */
    const deckT = txPlanks("vsteak", "#c08a52", "#9a6a3c", 14); const dm = mesh(new THREE.BoxGeometry(6.4, .25, 5.6), std({ map: deckT, roughness: .45 }), G); dm.position.set(0, TOWER_Y - .12, 0);
    L.push([BX(6.5, .08, 5.7), br, M4(0, TOWER_Y - .27, 0), "m"]);
    /* korlát: sárgaréz oszlopok, két rúd – a tábla felé NINCS korlát (csak egy 8 cm-es sárgaréz élléc), így ülve is szabad a kilátás */
    const rail = (a, b) => { L.push(ROD(V3(a[0], TOWER_Y + 1.05, a[1]), V3(b[0], TOWER_Y + 1.05, b[1]), .035, br, "m"), ROD(V3(a[0], TOWER_Y + .55, a[1]), V3(b[0], TOWER_Y + .55, b[1]), .02, br, "m")); };
    const cr = [[-3.1, -2.7], [3.1, -2.7], [3.1, 2.7], [-3.1, 2.7]];
    for (let k = 0; k < 4; k++) { const a = cr[k], b = cr[(k + 1) % 4]; if (k === 0) { L.push([BX(6.3, .08, .06), br, M4(0, TOWER_Y + .04, -2.78), "m"]); continue; } if (k === 2) { rail(a, [1.4, 2.7]); rail([-1.4, 2.7], b); } else rail(a, b);
      for (let f = 0; f <= 6; f++) { const px = lerp(a[0], b[0], f / 6), pz = lerp(a[1], b[1], f / 6); if (k === 2 && Math.abs(px) < 1.3) continue; L.push([CY(.03, .03, 1.05, 6), br, M4(px, TOWER_Y + .52, pz), "m"], [new THREE.SphereGeometry(.05, 8, 6), br, M4(px, TOWER_Y + 1.08, pz), "m"]); } }
    /* vitorlavászon árnyékoló, zászlórúd, távcső, hajóharang */
    [[-3, 2.6], [3, 2.6]].forEach(([px, pz]) => L.push([CY(.06, .06, 3.4, 8), "#f2efe6", M4(px, TOWER_Y + 1.7, pz)]));
    L.push([CY(.05, .07, 5.5, 8), "#f2efe6", M4(0, TOWER_Y + 2.75, 2.6)]);
    L.push(ROD(V3(2.8, TOWER_Y, 2.0), V3(2.6, TOWER_Y + 1.25, 1.9), .03, br, "m"), ROD(V3(2.9, TOWER_Y, 1.6), V3(2.6, TOWER_Y + 1.25, 1.9), .03, br, "m"), ROD(V3(2.3, TOWER_Y, 1.7), V3(2.6, TOWER_Y + 1.25, 1.9), .03, br, "m"));   /* távcső + harang hátul, nem takarnak */
    L.push([CY(.07, .1, 1.1, 12).rotateX(Math.PI / 2 - .12), br, M4(2.6, TOWER_Y + 1.35, 1.75), "m"]);
    L.push([CY(.18, .26, .34, 14), br, M4(-2.6, TOWER_Y + 1.5, 2.2), "m"], [BX(.06, .5, .06), dark, M4(-2.6, TOWER_Y + 1.2, 2.4)], [BX(.5, .06, .06), dark, M4(-2.6, TOWER_Y + 1.72, 2.25)]);
    /* lámpások a korlát sarkain */
    cr.forEach(([px, pz]) => L.push([CY(.1, .12, .3, 8), "#ffd890", M4(px, TOWER_Y + 1.25, pz), "e"], [new THREE.ConeGeometry(.15, .16, 8), br, M4(px, TOWER_Y + 1.48, pz), "m"]));
    /* bejáró a stégre */
    L.push([BX(1.6, .18, 9), "#7a3420", M4(0, PONT_Y + .05, -8.4)]); [-.8, .8].forEach((sx) => L.push(ROD(V3(sx, PONT_Y + 1, -12.9), V3(sx, PONT_Y + 1, -3.9), .03, br, "m")));
    const vg = vcGroup(L, G); if (vg.e) vg.e.material.emissiveIntensity = 1.5;
    /* árnyékoló vászon (két háromszög) */
    const sh = std({ color: "#f4efe2", side: THREE.DoubleSide, roughness: .9 });
    mesh(triSailGeo([-3, TOWER_Y + 3.4, 2.6], [3, TOWER_Y + 3.4, 2.6], [0, TOWER_Y + 2.7, -1.2], .0, 6), sh, G);
    makeFlag(c || "w", 1.8, 1.15, "royal", G, 0, TOWER_Y + 5.0, 2.6);
    return G;
  }
  /* HŐLÉGBALLON (madártávlat, körrepülés): fonott kosár, égő, színes gerezdes ballon „ZEPHYR” felirattal */
  function buildBalloon(env) {
    const G = new THREE.Group(); env.add(G);
    const wick = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#8a5a2c"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = (y / 8 % 2) * 8; x < w; x += 16) { g.fillStyle = "#b07a40"; g.fillRect(x, y, 13, 6); g.fillStyle = "rgba(255,230,180,.25)"; g.fillRect(x, y, 13, 2); } }, { repeat: [3, 2] });
    const bm = std({ map: wick, roughness: .9, side: THREE.DoubleSide });
    mesh(mergeGeoms([[0, .55, -.9, 1.8, 1.1, .08], [0, .55, .9, 1.8, 1.1, .08], [-.9, .55, 0, .08, 1.1, 1.8], [.9, .55, 0, .08, 1.1, 1.8], [0, .03, 0, 1.8, .06, 1.8]].map(([x, y, z, w, h, d]) => [new THREE.BoxGeometry(w, h, d), M4(x, y, z)])), bm, G);
    const L = [];
    [[-.9, -.9], [.9, -.9], [.9, .9], [-.9, .9]].forEach(([x, z]) => { L.push([new THREE.TorusGeometry(.06, .03, 6, 10).rotateX(Math.PI / 2), "#4a2e18", M4(x, 1.12, z)]); L.push(ROD(V3(x, 1.1, z), V3(x * .4, 3.3, z * .4), .02, "#c9ced4", "m")); L.push(ROD(V3(x * .4, 3.3, z * .4), V3(x * 2.4, 6.2, z * 2.4), .015, "#d9d0c0")); });
    [[-.9, 0], [.9, 0], [0, -.9], [0, .9]].forEach(([x, z]) => L.push([BX(Math.abs(x) ? .1 : 1.8, .12, Math.abs(z) ? .1 : 1.8), "#5a3418", M4(x, 1.12, z)]));
    L.push([BX(.9, .08, .9), "#9aa2aa", M4(0, 3.3, 0), "m"], [CY(.16, .2, .4, 10), "#c9ced4", M4(-.2, 3.1, 0), "m"], [CY(.16, .2, .4, 10), "#c9ced4", M4(.2, 3.1, 0), "m"]);
    vcGroup(L, G);
    /* ballon: forgástest, gerezdenként színezve */
    const prof = []; for (let k = 0; k <= 24; k++) { const t = k / 24, a = t * Math.PI; const r = t < .18 ? lerp(1.0, 3.2, t / .18) : Math.sin(Math.min(1, (t - .05) / .95) * Math.PI * .92 + .25) * 9.2; prof.push(new THREE.Vector2(Math.max(.05, r), 6.2 + t * 21)); }
    prof[prof.length - 1].x = .05;
    const env1 = new THREE.LatheGeometry(prof, 48);
    const gt = canvasTex(1024, 512, (g, w, h) => { const cols = ["#0e2142", "#f6f1e4", "#c9a227", "#7d1b2c"]; for (let k = 0; k < 16; k++) { g.fillStyle = cols[k % 4]; g.fillRect(k * w / 16, 0, w / 16 + 1, h); }
      g.fillStyle = "#0e2142"; g.fillRect(0, h * .42, w, h * .16); g.font = "900 64px Georgia"; g.fillStyle = "#e2c46a"; g.textAlign = "center"; g.textBaseline = "middle"; for (let k = 0; k < 4; k++) g.fillText("ZEPHYR", (k + .5) * w / 4, h * .5);
      for (let k = 0; k < 16; k++) { g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(k * w / 16, 0, 2, h); } });
    const em = mesh(env1, std({ map: gt, roughness: .55, side: THREE.DoubleSide }), G);
    /* égő lángja */
    const ft = canvasTex(64, 128, (g, w, h) => { const gr = g.createRadialGradient(32, 96, 2, 32, 80, 60); gr.addColorStop(0, "rgba(255,255,220,1)"); gr.addColorStop(.3, "rgba(255,170,60,.9)"); gr.addColorStop(1, "rgba(255,80,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const flame = new THREE.Sprite(sprM({ map: ft, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); flame.scale.set(.8, 2.2, 1); flame.position.y = 4.4; flame.visible = false; G.add(flame);
    G.userData = { flame, burn: 0, next: 6 };
    return G;
  }

  /* ------------------------------------------------------------------ NÉZŐHAJÓK naplementében, sirályok */
  function buildSpectators(env) {
    CS.spect = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + .2, r = 92 + (i % 3) * 18, g2 = new THREE.Group(); env.add(g2); g2.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); g2.rotation.y = a + Math.PI / 2 + (i % 2 ? .4 : -.3);
      const L = [], hc = ["#f4f4f0", "#ffffff", "#e9e2cf", "#0e2142"][i % 4], sc = ["#1f3a6a", "#7d1b2c", "#c9a227", "#f4f4f0"][i % 4];
      if (i % 3 === 2) {   /* vitorlás */
        L.push([BX(2.0, .8, 7.5), hc, M4(0, .2, 0)], [new THREE.ConeGeometry(1.0, 2.6, 4).rotateX(-Math.PI / 2).rotateZ(Math.PI / 4).scale(1, .4, 1), hc, M4(0, .2, -4.9)], [CY(.06, .08, 10, 6), "#c9ced4", M4(0, 5.5, -.6), "m"]);
        vcGroup(L, g2); mesh(triSailGeo([0, 1.2, -.5], [0, 1.3, 3.2], [0, 10.2, -.5], .5, 6), std({ color: "#f6ecd8", side: THREE.DoubleSide, roughness: .8 }), g2); mesh(triSailGeo([0, 1.0, -4.6], [0, 1.2, -.8], [0, 9.4, -.6], .4, 6), std({ color: "#f6ecd8", side: THREE.DoubleSide, roughness: .8 }), g2);
      } else {   /* motoros jacht, kivilágított ablakokkal, emberekkel */
        L.push([BX(3.0, 1.0, 9), hc, M4(0, .25, 0)], [new THREE.ConeGeometry(1.5, 3, 4).rotateX(-Math.PI / 2).rotateZ(Math.PI / 4).scale(1, .5, 1), hc, M4(0, .25, -6)], [BX(3.02, .22, 9.02), sc, M4(0, .5, 0)],
          [BX(2.3, 1.1, 3.6), hc, M4(0, 1.3, .4)], [BX(2.34, .4, 3.0), "#ffd890", M4(0, 1.45, .4), "e"], [BX(2.6, .08, 2.4), hc, M4(0, 1.95, 2.4)]);
        for (let k = 0; k < 4; k++) figParts(L, M4(-.9 + k * .6, .75, 3.2, Math.PI + (k - 1.5) * .3), { shirt: ["#e5262f", "#1f5fa8", "#ffd166", "#f4f4f0"][(k + i) % 4], pants: "#2a2a30", hair: ["#3a2a1a", "#d0a060", "#1a1a1a"][k % 3] });
        const vg = vcGroup(L, g2); if (vg.e) vg.e.material.emissiveIntensity = 1.2;
      }
      CS.spect.push({ g: g2, ph: rand() * 9 });
    }
    CS.gulls = makeGulls(env);
  }
  /* ------------------------------------------------------------------ JÁTÉKÁLLAPOT (közös mentés a 2D stégjátékkal) */
  const CKEY = "zephyr-sakk";
  const RANKS_VR = ["Hajósinas", "Matróz", "Kormányos", "Fedélzetmester", "Kapitány", "Admirális"];
  const rankVR = (l) => RANKS_VR[Math.min(5, Math.floor((l - 1) / 4))];
  const GS = {};
  function gsReset() { Object.assign(GS, { s: CE.initial(), hist: [], keys: [], sel: -1, moves: [], last: null, capW: [], capB: [], st: "play", msg: "", lvl: GS.lvl || 1, maxLvl: GS.maxLvl || 1, human: GS.human || "w", two: !!GS.two, thinking: false, promo: null, hint: null, won: false }); GS.keys.push(CE.posKey(GS.s)); }
  function gsSave() { try { localStorage.setItem(CKEY, JSON.stringify({ s: GS.s, hist: GS.hist, keys: GS.keys, capW: GS.capW, capB: GS.capB, lvl: GS.lvl, maxLvl: GS.maxLvl, ver: 2, won: GS.won, human: GS.human, two: GS.two, last: GS.last, st: GS.st, msg: GS.msg })); } catch (e) {} }
  function gsLoad() {
    try { const v = JSON.parse(localStorage.getItem(CKEY) || "null"); if (v && v.s && v.s.b && v.s.b.length === 64) { Object.assign(GS, { s: v.s, hist: v.hist || [], keys: v.keys || [], capW: v.capW || [], capB: v.capB || [], lvl: v.ver === 2 ? Math.max(1, Math.min(24, v.lvl | 0)) : 3, human: v.human || "w", two: !!v.two, last: v.last || null, won: !!v.won, sel: -1, moves: [], promo: null, hint: null, thinking: false });
      GS.maxLvl = Math.max(GS.lvl, Math.min(24, (v.maxLvl | 0) || GS.lvl)); if (!GS.keys.length) GS.keys.push(CE.posKey(GS.s)); return true; } } catch (e) {}
    return false;
  }
  function gsStatus() {
    const s = GS.s, ms = CE.legal(s), chk = CE.inCheck(s, s.turn), side = s.turn === "w" ? "Világos" : "Sötét";
    if (!ms.length) { GS.st = "over";
      if (chk) { const youWin = !GS.two && s.turn !== GS.human; GS.msg = GS.two ? `Sakk-matt! ${s.turn === "w" ? "Sötét" : "Világos"} nyert.` : youWin ? "Sakk-matt – GYŐZTÉL, admirális!" : "Sakk-matt – most a gép nyert."; GS.won = youWin;
        if (youWin && GS.lvl >= GS.maxLvl && GS.maxLvl < 24) GS.maxLvl = GS.lvl + 1; CS.endFx = { t: 0, win: GS.two || youWin, loser: s.turn }; }
      else GS.msg = "Patt – döntetlen."; return; }
    if (GS.keys.filter((k) => k === GS.keys[GS.keys.length - 1]).length >= 3) { GS.st = "over"; GS.msg = "Háromszori ismétlés – döntetlen."; return; }
    if (s.half >= 100) { GS.st = "over"; GS.msg = "50 lépés ütés és gyalogmozgás nélkül – döntetlen."; return; }
    if (CE.insufficient(s)) { GS.st = "over"; GS.msg = "Kevés az anyag a matthoz – döntetlen."; return; }
    GS.st = "play";
    GS.msg = chk ? "SAKK! " + (GS.two ? side + " jön." : s.turn === GS.human ? "Védd a királyod!" : "") : GS.two ? side + " jön." : s.turn === GS.human ? (T.inVR ? "Te jössz – mutass egy figurádra, és csippents." : "Te jössz – kattints egy figurádra.") : "A gép gondolkodik…";
  }

  /* ------------------------------------------------------------------ HAJÓK A TÁBLÁN */
  const homeYaw = (c) => (c === "w" ? 0 : Math.PI);
  function tplFor(t, c) { const k = t + c; if (t === "b") return BUILD.b(c); if (!CS.tpl[k]) CS.tpl[k] = BUILD[t](c); return CS.tpl[k].clone(true); }
  function makePiece(ch, sq) {
    const t = ch.toLowerCase(), c = CE.isW(ch) ? "w" : "b";
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body); CS.pieceG.add(g);
    const model = figTpl(t, c); body.add(model); model.scale.multiplyScalar(PSC);
    const dim = (model.userData.dim || [4, 6, 4]).map((v) => v * PSC);
    { const ru = model.getObjectByName("rune"); if (ru) { ru.material = ru.material.clone(); W.disposables.push(ru.material); } }
    g.position.set(sqX(sq), 0, sqZ(sq)); g.rotation.y = homeYaw(c);
    const hit = mesh(new THREE.BoxGeometry(dim[0] + .8, dim[1], Math.min(SQ - .4, dim[2])), basic({ visible: false }), g); hit.position.y = dim[1] / 2 - .3;
    const P = { ch, t, c, sq, g, body, model, hit, dim, yaw: homeYaw(c), heel: 0, ph: rand() * 9, beam: model.getObjectByName("beam"), oars: [model.getObjectByName("oarL"), model.getObjectByName("oarR")], row: 0, boat: model.userData.boat };
    hit.userData.xr = { hover: (on) => setHover(on ? P.sq : -1), click: () => onSquare(P.sq) };
    T.xr.extra.add(hit); W.objs.push(hit);
    return P;
  }
  function dropPiece(P) {
    if (!P) return; T.xr.extra.delete(P.hit); const i = W.objs.indexOf(P.hit); if (i >= 0) W.objs.splice(i, 1);
    if (T.xrForget) T.xrForget([P.hit]); if (P.g.parent) P.g.parent.remove(P.g);
  }
  /* a látvány összehangolása az állással (betöltés, visszalépés, új játszma után) */
  function syncPieces() {
    const B = GS.s.b;
    for (let i = 0; i < 64; i++) { const P = CS.vis[i], ch = B[i];
      if (P && P.ch === ch) { if (P.rise != null) { P.sq = i; continue; } P.g.position.set(sqX(i), 0, sqZ(i)); P.yaw = homeYaw(P.c); P.g.rotation.y = P.yaw; P.body.position.set(0, 0, 0); P.body.rotation.set(0, 0, 0); P.g.scale.setScalar(1); P.sq = i; continue; }
      if (P) { dropPiece(P); CS.vis[i] = null; }
      if (ch !== ".") CS.vis[i] = makePiece(ch, i);
    }
  }

  /* ------------------------------------------------------------------ MEZŐ-KIEMELÉS (a víz árnyalójában) és jelzőgyűrűk */
  function hlPaint() {
    const d = CS.hlData; d.fill(0);
    const set = (i, r, g, b, a) => { const k = i * 4; d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = a; };
    if (GS.last) { set(GS.last.f, 255, 170, 60, 120); set(GS.last.t, 255, 170, 60, 150); }
    if (GS.hint) { set(GS.hint.f, 120, 220, 255, 200); set(GS.hint.t, 120, 220, 255, 230); }
    if (GS.st === "play" && CE.inCheck(GS.s, GS.s.turn)) set(CE.kingSq(GS.s, GS.s.turn), 255, 40, 40, 255);
    if (GS.sel >= 0) { set(GS.sel, 255, 205, 80, 230); GS.moves.forEach((m) => set(m.t, m.c !== "." ? 255 : 80, m.c !== "." ? 70 : 230, m.c !== "." ? 60 : 140, 190)); }
    if (CS.hov >= 0 && CS.hov !== GS.sel) { const k = CS.hov * 4; if (!d[k + 3]) set(CS.hov, 255, 255, 255, 90); else d[k + 3] = Math.min(254, d[k + 3] + 50); }
    CS.hlTex.needsUpdate = true;
    /* gyűrűk a lehetséges célmezőkön */
    CS.rings.forEach((r, i) => { const m = GS.sel >= 0 ? GS.moves[i] : null; r.visible = !!m && !(i > 0 && GS.moves.slice(0, i).some((q) => q.t === m.t)); if (m) { r.position.set(sqX(m.t), .25, sqZ(m.t)); r.material = m.c !== "." ? CS.ringRed : CS.ringGreen; r.userData.cap = m.c !== "."; } });
    CS.selRing.visible = GS.sel >= 0; if (GS.sel >= 0) CS.selRing.position.set(sqX(GS.sel), .2, sqZ(GS.sel));
  }
  function setHover(sq) {
    if (sq === CS.hov) return; CS.hov = sq; hlPaint();
    const P = sq >= 0 ? CS.vis[sq] : null;
    if (P && !CS.anim) { const nm = NAMES[P.t]; CS.hovL.userData.set([`${PAL[P.c].name} ${nm[0].toLowerCase()} · ${CE.sqName(sq)}`, nm[1]]); CS.hovL.visible = true; CS.hovP = P; }
    else if (sq >= 0) { CS.hovL.userData.set([CE.sqName(sq), GS.sel >= 0 && GS.moves.some((m) => m.t === sq) ? "ide léphetsz" : ""]); CS.hovL.visible = true; CS.hovP = null; CS.hovSq = sq; }
    else CS.hovL.visible = false;
  }

  /* ------------------------------------------------------------------ KEZELÉS: hajó kiválasztása, célmező */
  function onSquare(sq) {
    if (sq < 0) return;
    if (CS.anim || GS.thinking) { flashMsg(GS.thinking ? "A gép még gondolkodik…" : "Várj, amíg a figura célba ér…"); return; }
    if (GS.st !== "play") { flashMsg(GS.msg + " – új játszma a panelen."); return; }
    if (GS.promo) return;
    if (!GS.two && GS.s.turn !== GS.human) return;
    const tg = GS.sel >= 0 ? GS.moves.filter((m) => m.t === sq) : [];
    if (tg.length) {
      if (tg.length > 1 && tg[0].promo) { GS.promo = tg; GS.msg = "Átváltozás: válassz figurát a panelen!"; if (T.inVR && W.panelHidden) W.togglePanel(); W.panelDirty = 1; snd("bell"); return; }
      doMove(tg[0]); return;
    }
    const p = GS.s.b[sq];
    if (p !== "." && CE.colorOf(p) === GS.s.turn) { GS.sel = sq; GS.moves = CE.legal(GS.s).filter((m) => m.f === sq); snd("tick");
      if (!GS.moves.length) flashMsg(`Ez a ${NAMES[p.toLowerCase()][0].toLowerCase()} most nem tud lépni.`); }
    else { GS.sel = -1; GS.moves = []; }
    hlPaint(); W.panelDirty = 1;
  }
  function flashMsg(t) { CS.flash = { t, k: 3.2 }; W.panelDirty = 1; }
  W._chessTest = { get CS() { return CS; }, get GS() { return GS; }, get CE() { return CE; }, move: (m) => doMove(m, true), forceStyle: (v) => { CS.forceBattle = v; } };   /* csak teszteléshez (késleltetett elérés) */
  function doMove(m, fromAI) {
    const before = GS.s;
    GS.hist.push({ s: before, capW: GS.capW.slice(), capB: GS.capB.slice(), last: GS.last });
    GS.s = CE.apply(before, m); GS.keys.push(CE.posKey(GS.s));
    const cap = m.c !== "." ? (m.ep ? m.t + (before.turn === "w" ? 8 : -8) : m.t) : -1;
    if (cap >= 0) (CE.isW(m.c) ? GS.capW : GS.capB).push(m.c);
    GS.last = { f: m.f, t: m.t }; GS.sel = -1; GS.moves = []; GS.hint = null; GS.promo = null;
    startAnim(m, cap, before);
    gsStatus(); gsSave(); hlPaint(); W.panelDirty = 1;
    if (!fromAI) maybeAI();
  }
  function maybeAI() {
    if (GS.two || GS.st !== "play" || GS.s.turn === GS.human || GS.thinking) return;
    GS.thinking = true; GS.msg = "A gép gondolkodik…"; const ply = GS.hist.length, gen = W.gen;
    setTimeout(() => {
      if (gen !== W.gen || GS.two || GS.s.turn === GS.human || GS.hist.length !== ply || GS.st !== "play") { GS.thinking = false; return; }
      CE.thinkAsync(GS.s, GS.lvl, (m) => { const wait = () => { if (gen !== W.gen) return; if (CS.anim) return setTimeout(wait, 80); GS.thinking = false; if (m && GS.st === "play" && GS.hist.length === ply && GS.s.turn !== GS.human && !GS.two) doMove(m, true); else gsStatus(); W.panelDirty = 1; }; wait(); });
    }, 450);
  }
  function undo() {
    if (GS.thinking || CS.anim || !GS.hist.length) return;
    const n = GS.two ? 1 : Math.min(GS.hist.length, GS.s.turn === GS.human ? 2 : 1);
    for (let k = 0; k < n; k++) { const h = GS.hist.pop(); GS.s = h.s; GS.capW = h.capW; GS.capB = h.capB; GS.last = h.last; GS.keys.pop(); }
    GS.sel = -1; GS.moves = []; GS.promo = null; GS.hint = null; CS.endFx = null; syncPieces(); gsStatus(); gsSave(); hlPaint(); W.panelDirty = 1; maybeAI();
  }
  function newGame() { if (CS.anim) finishAnim(true); GS.thinking = false; gsReset(); CS.endFx = null; syncPieces(); gsStatus(); gsSave(); hlPaint(); W.panelDirty = 1; goView("bridge"); maybeAI(); }
  function hint() {
    if (GS.st !== "play" || GS.thinking || CS.anim || (!GS.two && GS.s.turn !== GS.human)) return;
    GS.msg = "💡 Gondolkodom…"; const ply = GS.hist.length; W.panelDirty = 1;
    CE.thinkAsync(GS.s, 20, (m) => { if (m && GS.hist.length === ply) { GS.hint = { f: m.f, t: m.t }; GS.msg = `💡 ${NAMES[m.p.toLowerCase()][0]}: ${CE.sqName(m.f)} → ${CE.sqName(m.t)} (kék mezők)`; } else gsStatus(); hlPaint(); W.panelDirty = 1; });
  }
  function setLvl(d) { GS.lvl = clamp(GS.lvl + d, 1, 24); gsSave(); W.panelDirty = 1; }
  function toggleTwo() { GS.two = !GS.two; gsStatus(); gsSave(); W.panelDirty = 1; maybeAI(); }
  function swapSide() { if (GS.two) return; GS.human = GS.human === "w" ? "b" : "w"; gsStatus(); gsSave(); goView("bridge"); W.panelDirty = 1; maybeAI(); }

  /* ------------------------------------------------------------------ HANGOK */
  function snd(kind, vol) {
    const a = T.ac && T.ac(); if (!a) return; const t0 = a.currentTime, out = T.outBus(); vol = vol == null ? 1 : vol;
    const nz = (dur, f, q, type) => { const s = a.createBufferSource(); s.buffer = T.noiseBuf(dur + .1); const fl = a.createBiquadFilter(); fl.type = type || "lowpass"; fl.frequency.value = f; fl.Q.value = q || .7; const g = a.createGain(); s.connect(fl).connect(g).connect(out); s.start(t0); s.stop(t0 + dur + .1); return g.gain; };
    const osc = (f0, f1, dur, v, type) => { const o = a.createOscillator(), g = a.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + .01); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur); o.connect(g).connect(out); o.start(t0); o.stop(t0 + dur + .05); };
    if (kind === "boom") { const g = nz(1.6, 420, .5); g.setValueAtTime(0, t0); g.linearRampToValueAtTime(.55 * vol, t0 + .01); g.exponentialRampToValueAtTime(.001, t0 + 1.5); osc(90, 32, .9, .5 * vol); }
    if (kind === "hit") { const g = nz(.7, 900, .6); g.setValueAtTime(0, t0); g.linearRampToValueAtTime(.35 * vol, t0 + .01); g.exponentialRampToValueAtTime(.001, t0 + .6); osc(160, 60, .3, .2 * vol, "triangle"); }
    if (kind === "splash") { const g = nz(.9, 1600, .5, "bandpass"); g.setValueAtTime(0, t0); g.linearRampToValueAtTime(.18 * vol, t0 + .03); g.exponentialRampToValueAtTime(.001, t0 + .85); }
    if (kind === "sink") { const g = nz(3.0, 260, .8); g.setValueAtTime(0, t0); g.linearRampToValueAtTime(.2 * vol, t0 + .4); g.exponentialRampToValueAtTime(.001, t0 + 2.9); for (let k = 0; k < 6; k++) { const o = a.createOscillator(), gg = a.createGain(), t = t0 + .3 + k * .35; o.frequency.setValueAtTime(300 + k * 40, t); o.frequency.exponentialRampToValueAtTime(700 + k * 60, t + .08); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.04, t + .01); gg.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(gg).connect(out); o.start(t); o.stop(t + .12); } }
    if (kind === "bell") { [880, 1320, 1760].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = f * 1.002; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.1 / (i + 1), t0 + .005); g.gain.exponentialRampToValueAtTime(.0005, t0 + 2.2); o.connect(g).connect(out); o.start(t0); o.stop(t0 + 2.3); }); }
    if (kind === "tick") osc(1400, 900, .06, .05, "triangle");
    if (kind === "creak") { const g = nz(.5, 300, 6, "bandpass"); g.setValueAtTime(0, t0); g.linearRampToValueAtTime(.05, t0 + .1); g.exponentialRampToValueAtTime(.001, t0 + .5); }
    if (kind === "fanfare") { [[523, 0], [659, .18], [784, .36], [1047, .6]].forEach(([f, d]) => { const o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; o.type = "sawtooth"; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + d); g.gain.linearRampToValueAtTime(.06, t0 + d + .03); g.gain.setValueAtTime(.06, t0 + d + (d > .5 ? .8 : .14)); g.gain.linearRampToValueAtTime(0, t0 + d + (d > .5 ? 1.2 : .18)); o.connect(lp).connect(g).connect(out); o.start(t0 + d); o.stop(t0 + d + 1.3); }); }
    if (kind === "whoosh") { const g = nz(1.4, 500, .5, "bandpass"); g.setValueAtTime(0, t0); g.linearRampToValueAtTime(.12, t0 + .1); g.linearRampToValueAtTime(0, t0 + 1.3); }
  }

  /* ------------------------------------------------------------------ EFFEKTEK: ágyútűz, becsapódás, tűz, süllyedés, buborék, tűzijáték */
  function buildFx(env) {
    const glowT = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, "rgba(255,255,230,1)"); gr.addColorStop(.25, "rgba(255,190,90,.9)"); gr.addColorStop(1, "rgba(255,90,10,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const spr = (n, tex, col, add) => { const list = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(sprM({ map: tex, color: col || "#ffffff", transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: 0 })); s.visible = false; env.add(s); list.push({ s, t: 99, life: 1, v: new THREE.Vector3(), sz: 1 }); } let k = 0;
      return { emit(p, v, sz, life) { const q = list[k++ % n]; q.s.position.copy(p); q.v.copy(v || V3(0, 0, 0)); q.t = 0; q.life = life || .5; q.sz = sz || 1; q.s.visible = true; return q; },
        tick(dt, fn) { list.forEach((q) => { if (q.t > q.life) { q.s.visible = false; return; } q.t += dt; q.s.position.addScaledVector(q.v, dt); fn(q, q.t / q.life); }); }, clear() { list.forEach((q) => { q.t = 99; q.s.visible = false; }); } }; };
    const dropT = canvasTex(32, 64, (g) => { const gr = g.createRadialGradient(16, 40, 1, 16, 36, 22); gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(1, "rgba(220,240,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 64); });
    CS.fx = { flash: spr(14, glowT, "#ffe0a0", true), fire: spr(60, glowT, "#ff8a2a", true), spray: spr(60, dropT, "#ffffff", false), smoke: smokePool(env, 50, "#d8d0c8"), dsmoke: smokePool(env, 60, "#3a3430"), rings: ringPool(env, 24) };
    const ball = new THREE.SphereGeometry(.3, 10, 8); CS.balls = []; for (let i = 0; i < 14; i++) { const m = mesh(ball, std({ color: "#1a1a1a", metalness: .6, roughness: .4 }), env); m.visible = false; CS.balls.push({ m, t: 99, d: 1 }); }
    /* tűzijáték (győzelem): pontfelhő */
    const N = 1400, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pm = new THREE.PointsMaterial({ size: .55, map: glowT, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); W.disposables.push(pm, g);
    const pts = new THREE.Points(g, pm); pts.frustumCulled = false; env.add(pts);
    CS.fw = { pos, col, g, vel: new Float32Array(N * 3), life: new Float32Array(N), N, i: 0, next: 0 };
  }
  function fwBurst(c) {
    const F = CS.fw, p = V3(rr(-BH, BH), rr(26, 40), rr(-BH, BH)), base = new THREE.Color(c || ["#ffd166", "#ff5a5a", "#7fd3ff", "#ffffff", "#c9a227", "#9cff8a"][Math.floor(rand() * 6)]);
    for (let k = 0; k < 110; k++) { const i = F.i++ % F.N, th = rand() * TAU, ph = Math.acos(rr(-1, 1)), sp = rr(9, 14);
      F.pos.set([p.x, p.y, p.z], i * 3); F.vel.set([Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp, Math.sin(ph) * Math.sin(th) * sp], i * 3); F.life[i] = rr(1.6, 2.4); F.col.set([base.r, base.g, base.b], i * 3); }
    snd("boom", .35);
  }
  function fxTick(dt) {
    const F = CS.fx;
    F.flash.tick(dt, (q, k) => { q.s.material.opacity = 1 - k; q.s.scale.setScalar(q.sz * (1 + k * 1.5)); });
    F.fire.tick(dt, (q, k) => { q.s.material.opacity = (1 - k) * .9; q.s.scale.setScalar(q.sz * (1 - k * .5)); q.v.y += dt * 2; });
    F.spray.tick(dt, (q, k) => { q.v.y -= 9.8 * dt; q.s.material.opacity = (1 - k) * .9; q.s.scale.set(q.sz * .5, q.sz, 1); if (q.s.position.y < 0) q.t = 99; });
    F.smoke.tick(dt); F.dsmoke.tick(dt); F.rings.tick(dt);
    CS.balls.forEach((b) => { if (b.t > b.d) { b.m.visible = false; return; } b.t += dt; const k = Math.min(1, b.t / b.d); b.m.position.lerpVectors(b.a, b.b, k); b.m.position.y += Math.sin(k * Math.PI) * b.h; if (k >= 1) { b.m.visible = false; if (b.on) b.on(); } });
    const W2 = CS.fw; let any = false;
    for (let i = 0; i < W2.N; i++) { if (W2.life[i] <= 0) { if (W2.pos[i * 3 + 1] > -50) W2.pos[i * 3 + 1] = -99; continue; } any = true; W2.life[i] -= dt; W2.vel[i * 3 + 1] -= 4 * dt; for (let a = 0; a < 3; a++) { W2.vel[i * 3 + a] *= 1 - dt * .9; W2.pos[i * 3 + a] += W2.vel[i * 3 + a] * dt; } const f = Math.max(0, Math.min(1, W2.life[i])); W2.col[i * 3] *= f > .3 ? 1 : .96; W2.col[i * 3 + 1] *= f > .3 ? 1 : .94; W2.col[i * 3 + 2] *= f > .3 ? 1 : .94; }
    if (any || W2.was) { W2.g.attributes.position.needsUpdate = true; W2.g.attributes.color.needsUpdate = true; } W2.was = any;
  }
  function shoot(from, to, onHit) {
    const b = CS.balls.find((q) => q.t > q.d) || CS.balls[0]; b.a = from.clone(); b.b = to.clone(); b.t = 0; b.d = .55; b.h = 1.2; b.on = onHit; b.m.visible = true;
    CS.fx.flash.emit(from, V3(0, 0, 0), 3.2, .25); for (let k = 0; k < 5; k++) CS.fx.smoke.emit(from.clone().add(V3(rr(-.4, .4), rr(0, .4), rr(-.4, .4))), to.clone().sub(from).normalize().multiplyScalar(rr(.6, 2)).add(V3(0, .6, 0)), rr(1.6, 2.6));
    snd("boom", .9);
  }
  function splashAt(p, big) { for (let k = 0; k < (big ? 26 : 12); k++) CS.fx.spray.emit(V3(p.x + rr(-.6, .6), .2, p.z + rr(-.6, .6)), V3(rr(-1.5, 1.5), rr(big ? 6 : 4, big ? 11 : 7), rr(-1.5, 1.5)), rr(.5, 1.0), 1.6); CS.fx.rings.emit(p.x, p.z, big ? 3 : 2, 2.5); snd("splash", big ? 1 : .6); }

  /* ------------------------------------------------------------------ LÉPÉS-ANIMÁCIÓ: fordulás → (ütésnél: sortűz, a megtalált hajó kigyullad és elsüllyed) → hajózás nyomhullámmal → beállás */
  function pathFor(P, f, t) {
    const a = V3(sqX(f), 0, sqZ(f)), b = V3(sqX(t), 0, sqZ(t));
    if (P.t === "n") {   /* a huszár a mezők határán kanyarodik – nem a többi hajón át */
      const dr = (t >> 3) - (f >> 3), dc = (t & 7) - (f & 7), sx = Math.sign(dc), sz = Math.sign(dr);
      const pts = Math.abs(dr) === 2 ? [a, V3(a.x + sx * SQ / 2, 0, a.z + sz * SQ * .35), V3(a.x + sx * SQ / 2, 0, b.z - sz * SQ * .35), b] : [a, V3(a.x + sx * SQ * .35, 0, a.z + sz * SQ / 2), V3(b.x - sx * SQ * .35, 0, a.z + sz * SQ / 2), b];
      return new THREE.CatmullRomCurve3(pts, false, "centripetal");
    }
    return new THREE.LineCurve3(a, b);
  }
  const yawOf = (v) => Math.atan2(-v.x, -v.z);   /* a hajó orra −z felé: a haladási irány szöge */
  function startAnim(m, cap, before) {
    if (CS.anim) finishAnim(true);
    const P = CS.vis[m.f]; if (!P) { syncPieces(); return; }
    CS.vis[m.f] = null;
    const victim = cap >= 0 ? CS.vis[cap] : null; if (victim) CS.vis[cap] = null;
    const movers = [{ P, path: pathFor(P, m.f, m.t), to: m.t }];
    if (m.castle) { const row = before.turn === "w" ? 7 : 0, rf = m.castle === "K" ? row * 8 + 7 : row * 8, rt = m.castle === "K" ? row * 8 + 5 : row * 8 + 3; const R = CS.vis[rf]; if (R) { CS.vis[rf] = null; movers.push({ P: R, path: pathFor(R, rf, rt), to: rt }); } }
    const A = { m, movers, victim, t: 0, promo: m.promo || null, fired: 0, hits: 0 };
    /* a figurák nem fordulnak a menetirányba (arccal maradnak), csak dőlnek; a csikóhal ugrik */
    if (victim && P.t === "n") movers[0].path = new THREE.LineCurve3(V3(sqX(m.f), 0, sqZ(m.f)), V3(sqX(m.t), 0, sqZ(m.t)));
    movers.forEach((q) => { q.len = q.path.getLength(); q.dur = q.P.t === "n" ? (victim ? 1.5 : 1.25) : clamp(q.len / (ROYAL[q.P.t] ? 5.2 : 6.5), 1.3, 4.4); q.y0 = q.P.yaw; q.y1 = q.P.yaw; q.P.moving = true; });
    if (victim) {
      const vp = V3(sqX(cap), 0, sqZ(cap)), ap = V3(sqX(m.f), 0, sqZ(m.f));
      Object.assign(A, { vp, ap });
      victim.sinkRoll = rand() < .5 ? -1 : 1;
      battleSetup(A, P, victim);
    } else Object.assign(A, { tSail: .25 });
    A.tEnd = A.tSail + Math.max(...movers.map((q) => q.dur)) + .7;
    CS.anim = A; CS.hovL.visible = false;
    snd("creak");
  }
  function animTick(dt) {
    const A = CS.anim; if (!A) return; A.t += dt;
    const M0 = A.movers[0];
    if (A.victim) battleTick(A, dt);
    if (A.t < A.tSail) { const k = smooth(clamp(A.t / (A.tTurn || A.tSail), 0, 1)); A.movers.forEach((q) => { q.P.yaw = q.y0 + wrapA(q.y1 - q.y0) * k; }); }
    /* 4. hajózás */
    A.movers.forEach((q, qi) => {
      const ts = A.tSail + (qi ? .25 : 0), k = clamp((A.t - ts) / q.dur, 0, 1);
      if (A.t < ts) return;
      if (k <= 0 || q.done) return;
      const hop = q.P.t === "n", e = hop ? k : k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, p = q.path.getPointAt(e), tg = q.path.getTangentAt(Math.min(.999, e));
      q.P.g.position.set(p.x, hop ? Math.sin(k * Math.PI) * (A.leapH || (A.leap ? 11 : 4.5)) : 0, p.z);
      if (hop && !q.jumped) { q.jumped = 1; splashAt(q.path.getPointAt(0), false); snd("whoosh"); }
      if (hop && A.leap && k > (A.leapH ? .995 : .96) && !A.landed) { A.landed = A.t; splashAt(A.vp, true); CS.fx.rings.emit(A.vp.x, A.vp.z, 7, 3.2); CS.fx.rings.emit(A.vp.x, A.vp.z, 4, 2.2); CS.fx.flash.emit(A.vp.clone().add(V3(0, 2, 0)), V3(0, 0, 0), 6, .3); for (let j = 0; j < 40; j++) { const a = rand() * TAU; CS.fx.spray.emit(V3(A.vp.x + Math.cos(a) * 2, .4, A.vp.z + Math.sin(a) * 2), V3(Math.cos(a) * rr(4, 9), rr(6, 14), Math.sin(a) * rr(4, 9)), rr(.6, 1.3), 1.8); } snd("hit"); snd("boom", .6); }
      if (hop && k >= 1 && !q.landSpl) { q.landSpl = 1; if (!A.leap) splashAt(p, false); }
      const v = q.len / q.dur * (1 - Math.abs(2 * k - 1)) * 1.6;   /* pillanatnyi sebesség */
      /* dőlés a haladás irányába (a figura saját koordinátáiban) */
      const cy = Math.cos(q.P.yaw), sy = Math.sin(q.P.yaw), lx = tg.x * cy - tg.z * sy, lz = tg.x * sy + tg.z * cy, lean = Math.min(1, v / 6) * (hop ? .05 : .13);
      q.P.pitch = lz * lean; q.P.heel = -lx * lean; q.P.row = v; if (q.P.t === "b") q.P.spin = Math.max(q.P.spin || 0, 2.5);
      if (ROYAL[q.P.t]) { q.P.step = (q.P.step || 0) + dt * 3.2; if (Math.floor(q.P.step) !== q.P.stepN) { q.P.stepN = Math.floor(q.P.step); CS.fx.rings.emit(p.x + rr(-.6, .6), p.z + rr(-.6, .6), 1.6, 1.8); }
        if (rand() < dt * 40) CS.fx.flash.emit(V3(p.x + rr(-2, 2), rr(.2, 1.5), p.z + rr(-2, 2)), V3(0, rr(.6, 1.8), 0), rr(.3, .7), rr(.4, .8)); }
      const wk = CS.wakes[qi], my = yawOf(tg); if (wk && !hop && !ROYAL[q.P.t]) wk.push(p.x, p.z, my + Math.PI, v, dt, .06);
      if (!hop && !ROYAL[q.P.t] && v > 2 && rand() < dt * 18) CS.fx.spray.emit(V3(p.x + tg.x * q.P.dim[2] * .45, .3, p.z + tg.z * q.P.dim[2] * .45), V3(rr(-1, 1), rr(1.5, 3), rr(-1, 1)), rr(.3, .6), .8);
      if (k >= 1) { q.done = true; q.P.sq = q.to; CS.vis[q.to] = q.P; q.P.row = 0; q.P.g.position.y = 0; }
    });
    if (A.victim) battlePost(A, dt);
    /* 5. beállás alapirányba */
    const tSet = A.tSail + Math.max(...A.movers.map((q) => q.dur)) + .05;
    if (A.t > tSet) { A.movers.forEach((q) => { q.P.yaw += wrapA(homeYaw(q.P.c) - q.P.yaw) * Math.min(1, dt * 5); q.P.heel *= 1 - Math.min(1, dt * 4); q.P.pitch = (q.P.pitch || 0) * (1 - Math.min(1, dt * 4)); });
      if (A.promo && !A.promoDone) { A.promoDone = 1; promoteFx(M0.P, A.promo); } }
    if (A.t >= A.tEnd && (!A.victim || !A.victim.g.parent)) finishAnim(false);
  }
  function promoteFx(P, ch) {
    /* a csónak alámerül, a helyén aranyló fényben kiemelkedik az új hajó */
    const sq = P.sq; dropPiece(P); const N = makePiece(ch, sq); CS.vis[sq] = N; N.rise = 0;
    for (let k = 0; k < 30; k++) CS.fx.fire.emit(V3(sqX(sq) + rr(-2, 2), rr(0, 6), sqZ(sq) + rr(-2, 2)), V3(0, rr(1, 3), 0), rr(.8, 1.6), rr(.6, 1.4));
    splashAt(V3(sqX(sq), 0, sqZ(sq)), true); snd("fanfare");
  }
  function finishAnim(force) {
    const A = CS.anim; if (!A) return; CS.anim = null; battleEnd();
    if (A.victim && A.victim.g.parent) dropPiece(A.victim);
    A.movers.forEach((q) => { q.P.moving = false; q.P.row = 0; q.P.heel = 0; q.P.pitch = 0; q.P.g.position.y = 0; if (!q.done) { q.P.g.position.set(sqX(q.to), 0, sqZ(q.to)); q.P.sq = q.to; CS.vis[q.to] = q.P; } q.P.yaw = homeYaw(q.P.c); });
    if (A.promo && !A.promoDone) { A.promoDone = 1; const P = CS.vis[A.m.t]; if (P) promoteFx(P, A.promo); }
    syncPieces();
    if (GS.st === "play" && CE.inCheck(GS.s, GS.s.turn)) snd("bell");
    if (CS.endFx && !CS.endFx.snd) { CS.endFx.snd = 1; if (CS.endFx.win) snd("fanfare"); }
    hlPaint(); W.panelDirty = 1;
    if (!force) maybeAI();
  }
  /* ------------------------------------------------------------------ NÉZŐPONTOK
     A világ (root) forog és tolódik úgy, hogy a választott pont a lábad alá, a tábla közepe pedig ELÉD kerüljön –
     VR-ben sem kell megfordulnod. Váltáskor rövid elsötétülés (kíméletes a gyomornak). */
  const VIEWS = { bridge: ["🔭", "Parancsnoki híd"], deck: ["⚓", "A stégen – életnagyságban"], left: ["◧", "Bal oldali torony"], right: ["◨", "Jobb oldali torony"], enemy: ["⇅", "Az ellenfél hídja"], balloon: ["🎈", "Hőlégballon – madártávlat"], orbit: ["⟲", "Körrepülés a ballonnal"], walk: ["🚶", "A stégen"] };
  const VIEW_CYCLE = ["bridge", "deck", "left", "enemy", "right", "balloon", "orbit"];
  const BALLOON_PARK = V3(-BH - 46, 26, -18);
  function viewPoint(id, o) {
    const sd = (GS.two ? "w" : GS.human) === "w" ? 1 : -1, d = TOWER_D - 2.55;   /* a torony fedélzetének legelső pereme: előtted semmi */
    switch (id) {
      case "enemy": return { p: V3(0, TOWER_Y, -sd * d), pitch: -.6 };
      case "left": return { p: V3(-sd * d, TOWER_Y, 0), pitch: -.6 };
      case "right": return { p: V3(sd * d, TOWER_Y, 0), pitch: -.6 };
      case "deck": return { p: V3(0, PONT_Y, sd * (BI + .12)), pitch: -.12 };   /* a stég belső élén, a kötél ELŐTT */
      case "walk": return { p: V3(o.x, PONT_Y, o.z), pitch: -.08 };
      case "balloon": return { p: V3(0, 44, sd * 46), pitch: -.92, balloon: true };
      case "orbit": { const th = o && o.th != null ? o.th : Math.atan2(0, sd); return { p: V3(Math.sin(th) * 66, 30, Math.cos(th) * 66), pitch: -.42, balloon: true, th }; }
      default: return { p: V3(0, TOWER_Y, sd * d), pitch: -.62 };
    }
  }
  function inVRSeat() { if (CS.seat == null) { try { CS.seat = localStorage.getItem("zephyr-vr-ules") === "1"; } catch (e) { CS.seat = false; } } return !!(T.inVR && CS.seat); }
  function toggleSeat() { CS.seat = !inVRSeatRaw(); try { localStorage.setItem("zephyr-vr-ules", CS.seat ? "1" : "0"); } catch (e) {} goView(CS.viewId || "bridge", null, true); W.panelDirty = 1; }
  function inVRSeatRaw() { inVRSeat(); return !!CS.seat; }
  function toggleSign() { CS.noSign = !CS.noSign; if (CS.sign) CS.sign.visible = !CS.noSign; try { localStorage.setItem("zephyr-sakk-tabla", CS.noSign ? "0" : "1"); } catch (e) {} W.panelDirty = 1; }
  function chessPlace(v, keepPsi) {
    const root = W.root; if (!root) return;
    const psi = keepPsi != null ? keepPsi : (T.camYaw ? T.camYaw() : 0), envYaw = Math.atan2(v.p.x, v.p.z), r = psi - envYaw;
    /* 2D-ben a ballonban a kosár pereme fölé, kicsit előre hajolva nézünk (VR-ben magad hajolsz ki) */
    const pv = v.balloon ? v.p.clone().add(T.inVR ? V3(-Math.sin(envYaw) * .62, 0, -Math.cos(envYaw) * .62) : V3(-Math.sin(envYaw) * 1.3, .45, -Math.cos(envYaw) * 1.3)) : v.p;
    /* ülő mód: VR-ben 45 cm-rel (ballonban 60) feljebb emel, hogy ülve se takarjon semmi */
    const lift = inVRSeat() ? (v.balloon ? .6 : .45) : 0;
    const q = pv.clone().applyAxisAngle(V3(0, 1, 0), r);
    const hw = headWorld(new THREE.Vector3()), inVR = T.inVR;
    root.rotation.set(0, r, 0);
    root.position.set(-q.x + (inVR ? hw.x : 0), inVR ? -pv.y - lift : -(pv.y + 1.62), -q.z + (inVR ? hw.z : 0));
    root.updateMatrixWorld(true);
    if (v.balloon) CS.balloon.position.copy(v.p); else if (!CS.orbit) CS.balloon.position.copy(BALLOON_PARK);
    if (v.balloon) CS.balloon.rotation.y = envYaw;
    /* az üzenettábla a tábla túlsó oldalára, feléd */
    const dir = V3(v.p.x, 0, v.p.z).normalize(); CS.sign.position.set(-dir.x * (BH + 6), v.p.y > 20 ? 3 : 19, -dir.z * (BH + 6));
    return psi;
  }
  function goView(id, o, instant) {
    if (!CS.env) return;
    const run = () => {
      CS.orbit = null; CS.cine = null; CS.viewId = id; const v = viewPoint(id, o);
      const psi = chessPlace(v);
      if (id === "orbit") CS.orbit = { th: v.th, psi };
      if (!T.inVR) { const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject) lc.pitchObject.rotation.x = v.pitch; }
      W.panelDirty = 1;
    };
    if (instant) { run(); return; }
    CS.fade = { t: 0, run, done: false };
  }
  function nextView() { const i = VIEW_CYCLE.indexOf(CS.viewId); goView(VIEW_CYCLE[(i + 1) % VIEW_CYCLE.length]); }
  function sqFrom(pt) { const p = CS.env.worldToLocal(pt.clone()), c = Math.floor(p.x / SQ + 4), r = Math.floor(p.z / SQ + 4); return c >= 0 && c < 8 && r >= 0 && r < 8 ? r * 8 + c : -1; }

  /* ------------------------------------------------------------------ KEZELŐFELÜLETEK: VR-panel, 2D-menü, csuklómenü */
  const capStr = (a) => a.length ? a.map((p) => GLYPH[p.toLowerCase()]).join(" ") : "–";
  function material() { let s = 0; const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }; GS.s.b.forEach((p) => { if (p !== ".") s += (CE.isW(p) ? 1 : -1) * V[p.toLowerCase()]; }); return s; }
  function pickPromo(t) { const m = GS.promo && GS.promo.find((q) => q.promo.toLowerCase() === t); if (m) doMove(m); }
  function headline() { return CS.flash && CS.flash.k > 0 ? CS.flash.t : GS.msg; }
  function signText() { const t = GS.st !== "play" ? GS.msg : GS.thinking ? "A gép gondolkodik…" : CE.inCheck(GS.s, GS.s.turn) ? "SAKK!" : GS.two ? (GS.s.turn === "w" ? "Világos jön" : "Sötét jön") : GS.s.turn === GS.human ? "Te jössz" : "A gép jön"; return t.length > 34 ? t.slice(0, 33) + "…" : t; }
  function chessPanel(P) {
    P.title(`Vitorlás sakk · ${GS.lvl}. szint – ${rankVR(GS.lvl)}`, headline());
    if (GS.promo) { P.row(0, "Mivé változzon a gyalog?", "#ffd166"); P.row(1, "Válassz egy figurát:", "#7fd3ff");
      P.buttons([["👑 Vezér", () => pickPromo("q")], ["🗼 Bástya", () => pickPromo("r")], ["☸ Futó", () => pickPromo("b")], ["🐴 Huszár", () => pickPromo("n")]]); return; }
    const sp = GS.sel >= 0 ? GS.s.b[GS.sel] : null;
    P.row(0, sp ? `${PAL[CE.isW(sp) ? "w" : "b"].name} ${NAMES[sp.toLowerCase()][0].toLowerCase()} (${NAMES[sp.toLowerCase()][1]}) · zöld = szabad, piros = ütés` : "Mutass egy figurádra a sugárral és csippents, aztán a célmezőre.", "#ffd166");
    P.row(1, `Leütve – világos: ${capStr(GS.capW)}   sötét: ${capStr(GS.capB)}`, "#c9a24a");
    P.row(2, `${VIEWS[CS.viewId || "bridge"][1]} · a stégre csippentve odalépsz`, "#7fd3ff");
    const mt = material();
    P.row(3, `Te: ${GS.two ? "két játékos" : GS.human === "w" ? "világos (gép ellen)" : "sötét (gép ellen)"} · anyag: ${mt === 0 ? "egyenlő" : (mt > 0 ? "világos +" : "sötét +") + Math.abs(mt)}`, "#ffffff");
    P.buttons([["💡 Ötlet", hint], ["↶ Vissza", undo], ["♟ Új játszma", newGame], ["🔭 Nézőpont", nextView], [CS.noSign ? "🪧 Tábla be" : "🪧 Tábla ki", toggleSign], [cineOn() ? "🎬 Csatakamera ki" : "🎬 Csatakamera be", toggleCine]], 1);
    P.buttons([["− Szint", () => setLvl(-1)], ["Szint +", () => setLvl(1)], [GS.two ? "🤖 Gép ellen" : "👥 Két játékos", toggleTwo]].concat(T.inVR ? [[inVRSeatRaw() ? "🧍 Álló" : "🪑 Ülő mód", toggleSeat]] : []).concat([["‹ Kilépés", () => W.close()]]), 0);
  }
  function chessHud(H) {
    H.title(`Vitorlás sakk · ${GS.lvl}. szint – ${rankVR(GS.lvl)}`, headline());
    H.list([`Leütve – világos: ${capStr(GS.capW)} · sötét: ${capStr(GS.capB)}`, `Nézőpont: ${VIEWS[CS.viewId || "bridge"][1]}`]);
    if (GS.promo) { H.buttons([["vezér (királynő)", () => pickPromo("q")], ["bástya (világítótorony)", () => pickPromo("r")], ["futó (kormánykerék)", () => pickPromo("b")], ["huszár (csikóhal)", () => pickPromo("n")]]); }
    else H.buttons([["💡 Ötlet", hint], ["↶ Vissza", undo], ["♟ Új játszma", newGame], ["− Szint", () => setLvl(-1)], ["Szint +", () => setLvl(1)], [GS.two ? "🤖 Gép ellen" : "👥 2 játékos", toggleTwo], ["⇄ Színcsere", swapSide], [CS.noSign ? "🪧 Tábla be" : "🪧 Tábla ki", toggleSign], [cineOn() ? "🎬 Csatakamera ki" : "🎬 Csatakamera be", toggleCine]]
      .concat(VIEW_CYCLE.map((k) => [VIEWS[k][0] + " " + VIEWS[k][1].split(" – ")[0], () => goView(k), CS.viewId === k])));
    H.hint("Húzással körbenézel · kattints egy figurádra, aztán a célmezőre · a stégre kattintva odalépsz");
  }
  function chessWrist() {
    return [["🔭", "Nézőpont", VIEW_CYCLE.map((k) => [VIEWS[k][0], VIEWS[k][1].split(" – ")[0], () => goView(k), CS.viewId === k])],
      ["💡", "Ötlet", hint], ["↶", "Visszalépés", undo], ["♟", "Új játszma", newGame],
      ["📶", "Szint", [["−", "Könnyebb", () => setLvl(-1)], ["+", "Nehezebb", () => setLvl(1)]]],
      ["👥", GS.two ? "Gép ellen" : "Két játékos", toggleTwo], ["⇄", "Színcsere", swapSide], ["🪧", CS.noSign ? "Tábla mutatása" : "Tábla elrejtése", toggleSign], ["🎬", cineOn() ? "Csatakamera ki" : "Csatakamera be", toggleCine], ["🪑", inVRSeatRaw() ? "Álló mód" : "Ülő mód", toggleSeat], ["☰", "Nagy panel", () => W.togglePanel()], ["‹", "A sétához", () => W.close()]];
  }

  /* ------------------------------------------------------------------ FELÉPÍTÉS */
  function buildChess() {
    const root = W.root;
    Object.keys(CS).forEach((k) => delete CS[k]); VS.mats = {}; Object.keys(SAILTX).forEach((k) => delete SAILTX[k]);
    CS.tpl = {}; CS.vis = new Array(64).fill(null); CS.hov = -1; W.rayFar = 160;
    const far = new THREE.Group(), env = new THREE.Group(); root.add(far); root.add(env); CS.env = env;
    makeSunsetSky(far); { const sh = makeShores(far); sh.material.color.set("#8a6c86"); }
    CS.water = makeWater(env, { sun: CSUN }); { const hl = patchWater(CS.water); CS.hlTex = hl.tex; CS.hlData = hl.data; }
    /* fények: alacsony, narancsos nap nyugatról, lila égbolt-derengés, hideg ellenfény */
    { const hemi = new THREE.HemisphereLight(0x9a8cc0, 0x3a2a30, .75), sun = new THREE.DirectionalLight(0xffb46a, 2.6), amb = new THREE.AmbientLight(0xffd8c0, .14), rim = new THREE.DirectionalLight(0x8090d0, .45);
      const tg = new THREE.Object3D(); env.add(tg); sun.target = tg; rim.target = tg; sun.position.copy(CSUN).multiplyScalar(120); rim.position.set(60, 40, 80); env.add(hemi, sun, amb, rim); }
    /* környezeti tükröződés (a fém – arany, sárgaréz – csillogásához): naplementés színátmenet */
    try { const sc = T.sceneEl.object3D; CS.envWas = sc.environment || null; CS.envIntWas = sc.environmentIntensity;
      const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const g = cv.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, "#232a58"); gr.addColorStop(.32, "#7a5a92"); gr.addColorStop(.47, "#f39a6a"); gr.addColorStop(.5, "#ffc070"); gr.addColorStop(.53, "#3a3048"); gr.addColorStop(1, "#141018"); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
      const sx = (Math.atan2(CSUN.x, -CSUN.z) / TAU + .5) * 256; const sg = g.createRadialGradient(sx, 60, 1, sx, 60, 40); sg.addColorStop(0, "rgba(255,240,200,1)"); sg.addColorStop(1, "rgba(255,160,80,0)"); g.fillStyle = sg; g.fillRect(0, 0, 256, 128);
      const t = new THREE.CanvasTexture(cv); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
      CS.pmrem = new THREE.PMREMGenerator(T.sceneEl.renderer); CS.envRT = CS.pmrem.fromEquirectangular(t); t.dispose(); sc.environment = CS.envRT.texture; sc.environmentIntensity = 1; } catch (e) { console.warn("sakk env", e); }
    buildLanes(env); buildPontoon(env);
    buildTower(env, 0, TOWER_D, "w"); buildTower(env, 0, -TOWER_D, "b"); buildTower(env, -TOWER_D, 0, "w"); buildTower(env, TOWER_D, 0, "b");
    CS.balloon = buildBalloon(env); CS.balloon.position.copy(BALLOON_PARK);
    buildSpectators(env); buildFx(env);
    CS.wakes = [makeWake(env, 1.0), makeWake(env, 1.0)];
    CS.pieceG = new THREE.Group(); env.add(CS.pieceG);
    /* jelzőgyűrűk */
    const add = (c) => basic({ color: c, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending });
    CS.ringGreen = add("#6dff9a"); CS.ringRed = add("#ff5a4a");
    const rg = new THREE.TorusGeometry(2.1, .12, 8, 48).rotateX(Math.PI / 2); W.disposables.push(rg);
    CS.rings = []; for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(rg, CS.ringGreen); m.visible = false; m.renderOrder = 4; env.add(m); CS.rings.push(m); }
    CS.selRing = new THREE.Group(); env.add(CS.selRing); CS.selRing.visible = false;
    { const m = new THREE.Mesh(new THREE.TorusGeometry(3.3, .16, 8, 56).rotateX(Math.PI / 2), add("#ffd166")); W.disposables.push(m.geometry); CS.selRing.add(m);
      const bt = canvasTex(32, 256, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(255,209,102,.8)"); gr.addColorStop(1, "rgba(255,209,102,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
      const b = mesh(new THREE.CylinderGeometry(3.2, 3.2, 14, 32, 1, true), basic({ map: bt, transparent: true, opacity: .2, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), CS.selRing); b.position.y = 7; b.renderOrder = 5; }
    /* láthatatlan „tábla-felület” a mezők célzásához */
    CS.pick = mesh(new THREE.PlaneGeometry(2 * BH, 2 * BH).rotateX(-Math.PI / 2), basic({ visible: false }), env); CS.pick.position.y = .15;
    CS.pick.userData.xr = { hover: (on, h) => setHover(on && h ? sqFrom(h.point) : -1), move: (h) => { if (h) setHover(sqFrom(h.point)); }, click: (h) => { if (h) onSquare(sqFrom(h.point)); } };
    T.xr.extra.add(CS.pick); W.objs.push(CS.pick);
    /* ---- PEREMFOGÁS (2026-11-11, tulajdonos a szemüvegből: „a négy kötött nézőpont nem tetszik … mint a Questben: a perem szélénél halványan
       kirajzolódik egy vonal, arra rácsippentek, megfogom a teljes képet, és oda teszem a térben, ahova én akarom”) ----
       A tábla körül halvány arany keret fut; rámutatva kifényesedik. Csippentve megfogod, és a sugárral az EGÉSZ jelenetet (tábla, tornyok, part) viszed:
       oldalra-fel-le a kezed irányával, közelebb-távolabb a kezed előre-hátra mozdításával. Elengedve ott marad. Véletlenül nem indul: csak a kereten fog. */
    { const fr = new THREE.Group(); env.add(fr); const eh = BF + 2.2, lm = basic({ color: "#ffe9a8", transparent: true, opacity: 0, depthWrite: false, fog: false }); CS.grabHov = 0; CS.grab = null;
      [[0, -eh, 0], [0, eh, 0], [-eh, 0, 1], [eh, 0, 1]].forEach(([x, z, r]) => {
        const ln = mesh(new THREE.BoxGeometry(2 * eh + .7, .22, .7), lm, fr); ln.position.set(x, .55, z); ln.rotation.y = r ? Math.PI / 2 : 0; ln.renderOrder = 6;
        const ht = mesh(new THREE.BoxGeometry(2 * eh + 3, 2.4, 3.6), basic({ visible: false }), fr); ht.position.set(x, .6, z); ht.rotation.y = ln.rotation.y;
        ht.userData.xr = {
          hover: (on) => { CS.grabHov = Math.max(0, CS.grabHov + (on ? 1 : -1)); },
          down: (h, S0, key) => { if (!h || !S0 || !S0.o) return; const head = T.headPos ? T.headPos() : null; CS.grab = { key, dist: h.distance, hd0: head ? S0.o.distanceTo(head) : 0, p0: h.point.clone(), r0: W.root.position.clone() }; if (T.xr.press) T.xr.press[key] = null; try { T.xr.pulse && T.xr.pulse(key, .5, 25); } catch (e) {} },
          drag: (S0, key) => { const D = CS.grab; if (!D || D.key !== key || !S0 || !S0.o || !S0.d) return; const head = T.headPos ? T.headPos() : null;
            const dist = clamp(D.dist + (head ? (S0.o.distanceTo(head) - D.hd0) * 150 : 0), 4, 240), tgt = S0.o.clone().addScaledVector(S0.d, dist);
            const np = D.r0.clone().add(tgt.sub(D.p0)); np.y = clamp(np.y, -170, -2.2); W.root.position.lerp(np, .5); },
          up: () => { CS.grab = null; }
        };
        T.xr.extra.add(ht); W.objs.push(ht); });
      W.upd.push(() => { const tg = CS.grab ? 1 : CS.grabHov > 0 ? .9 : T.inVR ? .14 : 0; lm.opacity += (tg - lm.opacity) * .2; fr.visible = lm.opacity > .01; }); }
    CS.hovL = labelSprite(["", ""], { size: 1, fs: 54, w: 900 }); env.add(CS.hovL); CS.hovL.visible = false;
    CS.sign = labelSprite(["", ""], { size: 30, fs: 64, w: 1400, bg: "rgba(14,33,66,.82)", edge: "#c9a227" }); env.add(CS.sign); try { CS.noSign = localStorage.getItem("zephyr-sakk-tabla") === "0"; } catch (e) {} CS.sign.visible = !CS.noSign;
    /* elsötétítő gömb a nézőpontváltáshoz (a kamerán) */
    CS.fadeM = new THREE.Mesh(new THREE.SphereGeometry(.4, 16, 10), new THREE.MeshBasicMaterial({ color: 0x05070c, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false })); CS.fadeM.renderOrder = 9999; CS.fadeM.visible = false;
    W.disposables.push(CS.fadeM.geometry, CS.fadeM.material); try { T.camObj().add(CS.fadeM); } catch (e) {}
    /* játszma */
    if (!gsLoad()) gsReset(); gsStatus(); syncPieces(); hlPaint();
    goView("bridge", null, true);
    /* 2026-11-11, a tulajdonos kérése: a sakkban NINCS állandó víz- és szélzaj, a tábla feszített víztükör (a hullámzás a tábla fölött teljesen kisimítva) */
    audioStart({ water: .0001, wind: .0001 });
    CS.pm = (e) => { if (T.inVR || !W.active) return; const h = pick2D(e); if (!h) return setHover(-1); const o = h.object; if (o === CS.pick) setHover(sqFrom(h.point)); };
    T.sceneEl.canvas.addEventListener("pointermove", CS.pm);
    W.onClose = () => {
      try { T.sceneEl.canvas.removeEventListener("pointermove", CS.pm); } catch (e) {}
      try { const sc = T.sceneEl.object3D; sc.environment = CS.envWas || null; if (CS.envIntWas != null) sc.environmentIntensity = CS.envIntWas; if (CS.envRT) CS.envRT.dispose(); if (CS.pmrem) CS.pmrem.dispose(); } catch (e) {}
      try { if (CS.fadeM && CS.fadeM.parent) CS.fadeM.parent.remove(CS.fadeM); } catch (e) {}
      W.rayFar = null; GS.thinking = false; CS.anim = null;
    };
    flashMsg(T.inVR ? "Üdv a fedélzeten! Mutass egy figurádra, csippents, majd a célmezőre." : "Üdv a fedélzeten! Kattints egy figurádra, majd a célmezőre.");
    setTimeout(maybeAI, 900);
    W.chess = { GS, CS, CE, goView, onSquare, doMove, newGame, undo, finishAnim, syncPieces, gsStatus, hlPaint, place: (x, y, z, pitch) => { CS.orbit = null; chessPlace({ p: V3(x, y, z) }); const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject && pitch != null) lc.pitchObject.rotation.x = pitch; } };   /* (tesztekhez) */
    return { tick: chessTick, panel: chessPanel, hud: chessHud, wrist: chessWrist };
  }

  /* ------------------------------------------------------------------ KÉPKOCKÁNKÉNT */
  const _hw = new THREE.Vector3();
  function chessTick(dt) {
    FLAGU.value = W.t; WU.uWT.value = W.t;
    const wm = CS.water.userData.mat; wm.uniforms.uT.value = W.t; wm.uniforms.uWind.value = WIND_DIR; wm.uniforms.uPulse.value = .5 + .5 * Math.sin(W.t * 5.5);
    headWorld(_hw); wm.uniforms.uCam.value.copy(CS.env.worldToLocal(_hw.clone()));
    /* nézőpontváltás elsötétítéssel */
    if (CS.fade) { const F = CS.fade; F.t += dt; const d = .22; let o;
      if (F.t < d) o = F.t / d; else { if (!F.done) { F.done = true; F.run(); } o = Math.max(0, 1 - (F.t - d) / d); if (F.t > 2 * d) CS.fade = null; }
      CS.fadeM.visible = !!CS.fade; CS.fadeM.material.opacity = o; }
    /* körrepülés */
    if (CS.orbit && !CS.fade) { CS.orbit.th += dt * .05; const v = viewPoint("orbit", { th: CS.orbit.th }); chessPlace(v, CS.orbit.psi); }
    animTick(dt); fxTick(dt); bfxTick(dt); cineTick(dt);
    /* részletesség: messziről (45 m fölött) a kötélzet, a zászlók és a lobogók nem rajzolódnak – Questen sok rajzolási hívást spórol */
    CS.lodT = (CS.lodT || 0) - dt; if (CS.lodT <= 0) { CS.lodT = .4; const cl = CS.env.worldToLocal(_hw.clone());
      CS.vis.concat(CS.anim ? CS.anim.movers.map((q) => q.P) : []).forEach((P) => { if (!P) return; const far = Math.hypot(P.g.position.x - cl.x, P.g.position.z - cl.z, cl.y) > 46; if (P.far !== far) { P.far = far; P.model.traverse((o) => { if (o.userData.lod) o.visible = !far; }); } }); }
    /* hajók ringása */
    const list = CS.vis.filter(Boolean); if (CS.anim) { CS.anim.movers.forEach((q) => { if (!q.done) list.push(q.P); }); }
    list.forEach((P) => {
      const x = P.g.position.x, z = P.g.position.z, y = P.yaw; P.g.rotation.y = y;
      { const h = waveB(x, z), gx = (waveB(x + 1.2, z) - waveB(x - 1.2, z)) / 2.4, gz = (waveB(x, z + 1.6) - waveB(x, z - 1.6)) / 3.2;
        const sx = gx * Math.cos(y) - gz * Math.sin(y), sz = gx * Math.sin(y) + gz * Math.cos(y);
        const roy = ROYAL[P.t], bob = roy ? .35 : .85, tilt = roy ? .25 : .6, st = roy && P.moving ? Math.abs(Math.sin((P.step || 0) * Math.PI)) * .45 : 0;
        P.body.position.y = h * bob + st; P.body.rotation.set(sz * .7 * tilt + (P.pitch || 0), 0, (-sx * .9) * tilt + (P.heel || 0), "YXZ"); }
      figIdle(P, dt);
      if (P.rise != null) { P.rise += dt / 1.3; const s = smooth(Math.min(1, P.rise)); P.g.scale.setScalar(.2 + .8 * s); P.body.position.y -= (1 - s) * 7; if (P.rise >= 1) { P.rise = null; P.g.scale.setScalar(1); } }
      if (P.beam) P.beam.rotation.y += dt * .8;
      if (P.oars[0]) { P.ph += dt * (P.row > .3 ? 3.2 : .6); const sw = P.row > .3 ? Math.sin(P.ph) * .55 : Math.sin(P.ph) * .06, lf = P.row > .3 ? Math.cos(P.ph) * .14 : 0;
        P.oars.forEach((o, k) => { const sd = k ? 1 : -1; o.rotation.set(0, sd * sw, sd * (.28 + lf)); }); }
      if (P.boat && P.boat.userData.update) P.boat.userData.update(dt);
    });
    if (CS.anim && CS.anim.victim && CS.anim.victim.g.parent && CS.anim.t < CS.anim.tSink && !CS.anim.landed) { const V = CS.anim.victim, h = waveB(V.g.position.x, V.g.position.z); V.body.position.y = h * .85; }
    /* jelzőgyűrűk, kiválasztás */
    CS.rings.forEach((r, i) => { if (!r.visible) return; r.position.y = .22 + waveB(r.position.x, r.position.z); r.rotation.y = W.t * .4 + i; r.scale.setScalar(1 + .06 * Math.sin(W.t * 4 + i)); });
    if (CS.selRing.visible) { CS.selRing.position.y = .2 + waveB(CS.selRing.position.x, CS.selRing.position.z); CS.selRing.children[0].scale.setScalar(1 + .05 * Math.sin(W.t * 5)); }
    /* rámutatás-felirat: a hajó fölött, a távolsággal arányos méretben */
    if (CS.hovL.visible) { const P = CS.hovP && CS.vis[CS.hovP.sq] === CS.hovP ? CS.hovP : null; const sq = P ? P.sq : CS.hov;
      if (sq >= 0) { CS.hovL.position.set(sqX(sq), (P ? P.dim[1] : 1) + 2.2, sqZ(sq)); const wp = CS.hovL.getWorldPosition(new THREE.Vector3()), d = wp.distanceTo(_hw), k = clamp(d * .055, .9, 6); CS.hovL.scale.set(k, k * CS.hovL.scale.y / Math.max(.001, CS.hovL.scale.x), 1); } }
    /* üzenettábla */
    if (CS.flash) { CS.flash.k -= dt; if (CS.flash.k <= 0) { CS.flash = null; W.panelDirty = 1; } }
    CS.sign.userData.set([signText(), `${GS.lvl}. szint – ${rankVR(GS.lvl)} · ${GS.two ? "két játékos" : GS.s.turn === GS.human ? "te jössz" : "a gép jön"}`]);
    /* nézőhajók, sirályok, lámpák, ballon */
    CS.spect.forEach((q) => { q.g.position.y = waveAt(q.g.position.x, q.g.position.z, W.t) * .8; q.g.rotation.z = Math.sin(W.t * .9 + q.ph) * .03; q.g.rotation.x = Math.sin(W.t * .7 + q.ph) * .02; });
    CS.gulls.tick(dt, 0, 40);
    if (CS.lamps) CS.lamps.emissiveIntensity = 1.5 + .12 * Math.sin(W.t * 7) * Math.sin(W.t * 4.3);
    { const B = CS.balloon, U = B.userData; U.next -= dt; if (U.next <= 0) { U.burn = 1.6; U.next = rr(9, 16); if (CS.viewId === "balloon" || CS.orbit) snd("whoosh"); }
      if (U.burn > 0) { U.burn -= dt; U.flame.visible = true; U.flame.scale.set(.8 + rand() * .2, 2 + rand() * .6, 1); } else U.flame.visible = false;
      if (CS.viewId !== "balloon" && !CS.orbit) B.position.y = BALLOON_PARK.y + Math.sin(W.t * .3) * .8; }
    /* győzelem: tűzijáték */
    if (CS.endFx) { const E = CS.endFx; E.t += dt; if (E.win && E.t < 14) { E.nx = (E.nx || 0) - dt; if (E.nx <= 0) { E.nx = rr(.35, .8); fwBurst(); } } }
  }

  /* ------------------------------------------------------------------ SAKKMOTOR – a stégjáték (gameChess) szabályai és gépi ellenfele, változatlanul */
  const CE = (function () {
    const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    const NAME = { p: "gyalog (kikötőbak)", n: "huszár (csikóhal)", b: "futó (kormánykerék)", r: "bástya (világítótorony)", q: "vezér (királynő)", k: "király (kapitány)" };
    /* mezőtáblák (világos szemszögéből, a8 = 0 … h1 = 63) */
    const PST = {
      p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
      n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
      b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
      r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
      q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
      k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
      ke: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
    };
    const FILES = "abcdefgh";
    const isW = (p) => p !== "." && p === p.toUpperCase(), colorOf = (p) => (p === "." ? null : isW(p) ? "w" : "b");
    const rc = (i) => [i >> 3, i & 7], idx = (r, c) => r * 8 + c, on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
    const sqName = (i) => FILES[i & 7] + (8 - (i >> 3));
    /* --------------- állás és lépésgenerálás --------------- */
    function initial() { return { b: ("rnbqkbnrpppppppp" + ".".repeat(32) + "PPPPPPPPRNBQKBNR").split(""), turn: "w", cs: "KQkq", ep: -1, half: 0, full: 1 }; }
    const clone = (s) => ({ b: s.b.slice(), turn: s.turn, cs: s.cs, ep: s.ep, half: s.half, full: s.full });
    const KD = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]], ND = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    const BD = [[-1, -1], [-1, 1], [1, -1], [1, 1]], RD = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    function attacked(s, sq, by) {   /* támadja-e a „by” szín a mezőt */
      const [r, c] = rc(sq), B = s.b;
      const pd = by === "w" ? 1 : -1;   /* világos gyalog alulról (nagyobb sorindexről) támad */
      for (const dc of [-1, 1]) { const rr2 = r + pd, cc = c + dc; if (on(rr2, cc)) { const p = B[idx(rr2, cc)]; if (p === (by === "w" ? "P" : "p")) return true; } }
      for (const [dr, dc] of ND) { const rr2 = r + dr, cc = c + dc; if (on(rr2, cc) && B[idx(rr2, cc)] === (by === "w" ? "N" : "n")) return true; }
      for (const [dr, dc] of KD) { const rr2 = r + dr, cc = c + dc; if (on(rr2, cc) && B[idx(rr2, cc)] === (by === "w" ? "K" : "k")) return true; }
      const slide = (dirs, set) => { for (const [dr, dc] of dirs) { let rr2 = r + dr, cc = c + dc; while (on(rr2, cc)) { const p = B[idx(rr2, cc)]; if (p !== ".") { if (colorOf(p) === by && set.includes(p.toLowerCase())) return true; break; } rr2 += dr; cc += dc; } } return false; };
      return slide(BD, "bq") || slide(RD, "rq");
    }
    const kingSq = (s, col) => s.b.indexOf(col === "w" ? "K" : "k");
    const inCheck = (s, col) => attacked(s, kingSq(s, col), col === "w" ? "b" : "w");
    function pseudo(s) {
      const mv = [], B = s.b, me = s.turn, op = me === "w" ? "b" : "w";
      for (let i = 0; i < 64; i++) { const p = B[i]; if (p === "." || colorOf(p) !== me) continue; const t = p.toLowerCase(), [r, c] = rc(i);
        if (t === "p") { const d = me === "w" ? -1 : 1, start = me === "w" ? 6 : 1, last = me === "w" ? 0 : 7;
          const add = (to, cap, ep) => { if ((to >> 3) === last) "qrbn".split("").forEach((pr) => mv.push({ f: i, t: to, p, c: cap, promo: me === "w" ? pr.toUpperCase() : pr })); else mv.push({ f: i, t: to, p, c: cap, ep }); };
          if (on(r + d, c) && B[idx(r + d, c)] === ".") { add(idx(r + d, c), "."); if (r === start && B[idx(r + 2 * d, c)] === ".") mv.push({ f: i, t: idx(r + 2 * d, c), p, c: ".", dbl: true }); }
          for (const dc of [-1, 1]) { if (!on(r + d, c + dc)) continue; const to = idx(r + d, c + dc), q = B[to]; if (q !== "." && colorOf(q) === op) add(to, q); else if (to === s.ep) add(to, me === "w" ? "p" : "P", true); } }
        else if (t === "n" || t === "k") { for (const [dr, dc] of t === "n" ? ND : KD) { if (!on(r + dr, c + dc)) continue; const to = idx(r + dr, c + dc), q = B[to]; if (q === "." || colorOf(q) === op) mv.push({ f: i, t: to, p, c: q }); }
          if (t === "k") { const row = me === "w" ? 7 : 0, ks = me === "w" ? "K" : "k", qs = me === "w" ? "Q" : "q";
            if (i === idx(row, 4) && !inCheck(s, me)) {
              if (s.cs.includes(ks) && B[idx(row, 5)] === "." && B[idx(row, 6)] === "." && B[idx(row, 7)] === (me === "w" ? "R" : "r") && !attacked(s, idx(row, 5), op) && !attacked(s, idx(row, 6), op)) mv.push({ f: i, t: idx(row, 6), p, c: ".", castle: "K" });
              if (s.cs.includes(qs) && B[idx(row, 3)] === "." && B[idx(row, 2)] === "." && B[idx(row, 1)] === "." && B[idx(row, 0)] === (me === "w" ? "R" : "r") && !attacked(s, idx(row, 3), op) && !attacked(s, idx(row, 2), op)) mv.push({ f: i, t: idx(row, 2), p, c: ".", castle: "Q" });
            } } }
        else { for (const [dr, dc] of t === "b" ? BD : t === "r" ? RD : KD) { let rr2 = r + dr, cc = c + dc; while (on(rr2, cc)) { const to = idx(rr2, cc), q = B[to]; if (q === ".") mv.push({ f: i, t: to, p, c: q }); else { if (colorOf(q) === op) mv.push({ f: i, t: to, p, c: q }); break; } rr2 += dr; cc += dc; } } }
      }
      return mv;
    }
    function apply(s, m) {
      const n = clone(s), B = n.b, me = s.turn;
      B[m.t] = m.promo || m.p; B[m.f] = ".";
      if (m.ep) B[m.t + (me === "w" ? 8 : -8)] = ".";
      if (m.castle) { const row = me === "w" ? 7 : 0; if (m.castle === "K") { B[idx(row, 5)] = B[idx(row, 7)]; B[idx(row, 7)] = "."; } else { B[idx(row, 3)] = B[idx(row, 0)]; B[idx(row, 0)] = "."; } }
      let cs = n.cs; const strip = (ch) => { cs = cs.replace(ch, ""); };
      if (m.p === "K") { strip("K"); strip("Q"); } if (m.p === "k") { strip("k"); strip("q"); }
      [[63, "K"], [56, "Q"], [7, "k"], [0, "q"]].forEach(([sq, ch]) => { if (m.f === sq || m.t === sq) strip(ch); });
      n.cs = cs; n.ep = m.dbl ? (m.f + m.t) / 2 : -1;
      n.half = m.p.toLowerCase() === "p" || m.c !== "." ? 0 : s.half + 1; if (me === "b") n.full++;
      n.turn = me === "w" ? "b" : "w"; return n;
    }
    function legal(s) { return pseudo(s).filter((m) => !inCheck(apply(s, m), s.turn)); }
    const posKey = (s) => s.b.join("") + s.turn + s.cs + s.ep;
    function insufficient(s) { const pcs = s.b.filter((p) => p !== "." && p.toLowerCase() !== "k"); if (!pcs.length) return true; if (pcs.length === 1 && "nNbB".includes(pcs[0])) return true;
      if (pcs.every((p) => "bB".includes(p))) { const col = s.b.map((p, i) => ("bB".includes(p) ? ((i >> 3) + (i & 7)) % 2 : -1)).filter((x) => x >= 0); return col.every((x) => x === col[0]); } return false; }
    /* --------------- értékelés és keresés --------------- */
    function evaluate(s) {
      let sc = 0, mat = 0; for (const p of s.b) if (p !== "." && p.toLowerCase() !== "p" && p.toLowerCase() !== "k") mat += VAL[p.toLowerCase()];
      const end = mat <= 1300;
      for (let i = 0; i < 64; i++) { const p = s.b[i]; if (p === ".") continue; const t = p.toLowerCase(), w = isW(p), tbl = t === "k" && end ? PST.ke : PST[t]; const v = VAL[t] + tbl[w ? i : (7 - (i >> 3)) * 8 + (i & 7)]; sc += w ? v : -v; }
      return s.turn === "w" ? sc : -sc;
    }
    const mvv = (m) => (m.c !== "." ? VAL[m.c.toLowerCase()] * 10 - VAL[m.p.toLowerCase()] / 10 : 0) + (m.promo ? 800 : 0);
    let nodes = 0, deadline = 0, stop = false;
    function quiesce(s, a, b, d) {
      if ((++nodes & 1023) === 0 && performance.now() > deadline) stop = true;
      const stand = evaluate(s); if (stand >= b) return b; if (stand > a) a = stand; if (d <= 0 || stop) return a;
      const ms = pseudo(s).filter((m) => m.c !== "." || m.promo).sort((x, y) => mvv(y) - mvv(x));
      for (const m of ms) { const n = apply(s, m); if (inCheck(n, s.turn)) continue; const v = -quiesce(n, -b, -a, d - 1); if (v >= b) return b; if (v > a) a = v; }
      return a;
    }
    function negamax(s, d, a, b, ply) {
      if ((++nodes & 1023) === 0 && performance.now() > deadline) stop = true;
      if (d <= 0) return quiesce(s, a, b, 4);
      const ms = pseudo(s).sort((x, y) => mvv(y) - mvv(x)); let any = false, best = -1e9;
      for (const m of ms) { const n = apply(s, m); if (inCheck(n, s.turn)) continue; any = true; const v = -negamax(n, d - 1, -b, -a, ply + 1); if (stop) return 0; if (v > best) best = v; if (v > a) a = v; if (a >= b) break; }
      if (!any) return inCheck(s, s.turn) ? -100000 + ply : 0;
      return best;
    }
    /* 24 nehézségi szint: a keresési mélység, az idő és a „hibázási kedv” szintenként fokozatosan változik */
    function lvlCfg(l) { l = Math.max(1, Math.min(24, l | 0)); return { d: Math.min(7, 1 + Math.floor((l + 1) / 4)), ms: Math.round(90 + l * l * 4.5), noise: Math.max(0, 300 - l * 14), bl: Math.max(0, .42 - l * .02) }; }
    function think(s, level) {
      const cf = lvlCfg(level), ms = legal(s); if (!ms.length) return null;
      deadline = performance.now() + cf.ms; nodes = 0; stop = false;
      let order = ms.slice().sort((x, y) => mvv(y) - mvv(x)), best = order[0], scores = [];
      for (let d = 1; d <= cf.d; d++) {
        let a = -1e9, cur = null; const sc = [];
        for (const m of order) { const v = -negamax(apply(s, m), d - 1, -1e9, -a, 1); if (stop) break; sc.push([m, v]); if (v > a) { a = v; cur = m; } }
        if (stop && d > 1) break; if (cur) { best = cur; scores = sc; order = [cur].concat(order.filter((m) => m !== cur)); }
        if (performance.now() > deadline) break;
      }
      /* alacsonyabb szinteken néha nem a legjobbat lépi (de csak a „nem sokkal rosszabb” lépések közül választ) */
      if (cf.noise > 0 && scores.length > 2 && Math.random() < Math.min(1, cf.bl * 2)) {
        scores.sort((x, y) => y[1] - x[1]); const top = scores.filter((q) => q[1] > scores[0][1] - cf.noise && q[1] > -50000); if (top.length) best = top[Math.floor(Math.random() * top.length)][0];
      }
      return best;
    }
    /* a gép a háttérben (Web Worker) gondolkodik – így a magas szinteken sem akad meg a kép és az animáció */
    let AIW = null, aiSeq = 0; const aiCb = {};
    function aiWorker() {
      if (AIW !== null) return AIW;
      try {
        const src = [
          "const VAL=" + JSON.stringify(VAL) + ",PST=" + JSON.stringify(PST) + ";",
          "const isW=" + isW + ",colorOf=" + colorOf + ",rc=" + rc + ",idx=" + idx + ",on=" + on + ";",
          "const KD=" + JSON.stringify(KD) + ",ND=" + JSON.stringify(ND) + ",BD=" + JSON.stringify(BD) + ",RD=" + JSON.stringify(RD) + ";",
          "const clone=" + clone + ",kingSq=" + kingSq + ",inCheck=" + inCheck + ",mvv=" + mvv + ";",
          String(lvlCfg), String(attacked), String(pseudo), String(apply), String(legal), String(evaluate), String(quiesce), String(negamax), String(think),
          "let nodes=0,deadline=0,stop=false;",
          "onmessage=(e)=>{const d=e.data;let m=null;try{m=think(d.s,d.l);}catch(x){}postMessage({id:d.id,m:m});};"
        ].join("\n");
        AIW = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
        AIW.onmessage = (e) => { const f = aiCb[e.data.id]; delete aiCb[e.data.id]; if (f) f(e.data.m); };
        AIW.onerror = () => { AIW = false; Object.keys(aiCb).forEach((k) => { const f = aiCb[k]; delete aiCb[k]; try { f(null, true); } catch (x) {} }); };
      } catch (e) { AIW = false; }
      return AIW;
    }
    function thinkAsync(st, l, cb) {
      const sync = () => setTimeout(() => cb(think(st, l)), 0);
      const w = aiWorker(); if (!w) return sync();
      const id = ++aiSeq; aiCb[id] = (m, failed) => { if (failed) sync(); else cb(m); }; w.postMessage({ id, s: st, l });
      setTimeout(() => { if (aiCb[id]) { delete aiCb[id]; sync(); } }, lvlCfg(l).ms + 5000);
    }
    return { initial, clone, legal, apply, inCheck, kingSq, insufficient, posKey, think, thinkAsync, lvlCfg, sqName, isW, colorOf };
  })();
  /* =====================================================================================================
     VR-SAKK – ÉLETNAGYSÁGÚ FIGURÁS KÉSZLET (2026. nov. 9., a tulajdonos képe alapján: ezüst és arany, tengerkék zománccal)
       gyalog = kikötőbak (kötéllel)   bástya = világítótorony (forgó fénynyaláb)   huszár = csikóhal
       futó = hajókormány (forgó kerék)   vezér = királynő (koronával, palásttal)   király = kapitány (kereszt a sapkáján)
     A király és a vezér varázslattal a vízen JÁR (rúnakorong, csillámló lábnyomok); a többiek úszó, zománcos
     hullámtalapzaton siklanak. Minden ütés más – a TÁMADÓ módján:
       kikötőbak: lasszó → a víz alá rántja · csikóhal: magas ugrás → hullámcsapás · kormány: örvény → lehúzza
       világítótorony: izzó fénysugár → megolvasztja · királynő: tölcsér (víztölcsér) → felkapja és ledobja
       kapitány: villámok, majd a kraken csápjai húzzák le
     ===================================================================================================== */
  const ROYAL = { k: 1, q: 1 };
  const FIGN = { p: ["Gyalog", "kikötőbak"], n: ["Huszár", "csikóhal"], b: ["Futó", "kormánykerék"], r: ["Bástya", "világítótorony"], q: ["Vezér", "királynő"], k: ["Király", "kapitány"] };
  Object.assign(NAMES, FIGN);
  const LP = (pts) => pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
  const lathe = (pts, seg, ps, pl) => new THREE.LatheGeometry(LP(pts), seg || 32, ps || 0, pl || TAU);
  const SPH = (r, w, h) => new THREE.SphereGeometry(r, w || 16, h || 12);
  const TOR = (R, r, rs, ts, arc) => new THREE.TorusGeometry(R, r, rs || 8, ts || 40, arc || TAU);
  const RODF = (a, b, r, seg) => { const [g, m] = rodGeom(a, b, r, seg || 6); return [g, "m", m]; };
  /* változó vastagságú cső egy görbe mentén (csikóhal teste, csápok) */
  function varTube(curve, n, rad, rFn) {
    const fr = curve.computeFrenetFrames(n, false), pos = [], nor = [], idx = [];
    for (let i = 0; i <= n; i++) { const t = i / n, p = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i], r = rFn(t);
      for (let j = 0; j <= rad; j++) { const a = j / rad * TAU, cx = Math.cos(a), sy = Math.sin(a); const nx = cx * N.x + sy * B.x, ny = cx * N.y + sy * B.y, nz = cx * N.z + sy * B.z;
        pos.push(p.x + nx * r, p.y + ny * r, p.z + nz * r); nor.push(nx, ny, nz); } }
    for (let i = 0; i < n; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
    return g;
  }
  /* anyagok: tükörfényes ezüst / arany, tengerkék tűzzománc (lakkfényű), meleg fény */
  function figMats(c) {
    const K = "figM" + c; if (CS[K]) return CS[K];
    const metal = new THREE.MeshStandardMaterial({ color: c === "w" ? 0xeef3fa : 0xf7b733, metalness: 1, roughness: c === "w" ? .14 : .2, vertexColors: true, envMapIntensity: 1.3 });   /* Quest: a fém sima PBR, csak a zománc lakkozott */
    const enamel = new THREE.MeshPhysicalMaterial({ color: 0x15357a, metalness: .15, roughness: .2, vertexColors: true, clearcoat: .8, clearcoatRoughness: .08, envMapIntensity: 1.1 });
    const glow = new THREE.MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xffcf70, emissiveIntensity: 2.4, vertexColors: true, roughness: .3 });
    W.disposables.push(metal, enamel, glow);
    return (CS[K] = { m: metal, n: enamel, e: glow });
  }
  /* részek: [geometria, anyagkulcs (m/n/e), mátrix, árnyalat] → anyagonként egyetlen háló */
  function figMesh(parts, parent, c, name) {
    const by = {}, M = figMats(c);
    parts.forEach(([geo, key, m4, tint]) => { const col = new THREE.Color(tint || "#ffffff"), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } geo.setAttribute("color", new THREE.BufferAttribute(a, 3)); (by[key] = by[key] || []).push([geo, m4 || new THREE.Matrix4()]); });
    const G = new THREE.Group(); if (name) G.name = name; parent.add(G);
    Object.keys(by).forEach((k) => { const m = new THREE.Mesh(mergeGeoms(by[k]), M[k]); m.castShadow = k !== "e"; G.add(m); });
    return G;
  }
  const PM = (x, y, z, ry, rx, rz, s) => M4(x, y, z, ry, rx, rz, s, s, s);
  /* horgony-embléma (lapos, kidomborodó) a zománcsávokra */
  function anchorGeo(s) {
    const sh = new THREE.Shape(); const w = .09 * s;
    sh.moveTo(-w, .55 * s); sh.lineTo(w, .55 * s); sh.lineTo(w, -.35 * s); sh.quadraticCurveTo(.32 * s, -.32 * s, .42 * s, -.08 * s); sh.lineTo(.52 * s, -.16 * s); sh.lineTo(.5 * s, .06 * s); sh.lineTo(.3 * s, .02 * s); sh.lineTo(.38 * s, -.04 * s);
    sh.quadraticCurveTo(.28 * s, -.48 * s, 0, -.52 * s); sh.quadraticCurveTo(-.28 * s, -.48 * s, -.38 * s, -.04 * s); sh.lineTo(-.3 * s, .02 * s); sh.lineTo(-.5 * s, .06 * s); sh.lineTo(-.52 * s, -.16 * s); sh.lineTo(-.42 * s, -.08 * s); sh.quadraticCurveTo(-.32 * s, -.32 * s, -w, -.35 * s); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: .06 * s, bevelEnabled: true, bevelThickness: .02 * s, bevelSize: .02 * s, bevelSegments: 1, curveSegments: 6 });
    const ring = TOR(.12 * s, .04 * s, 6, 14); ring.translate(0, .66 * s, .03 * s); const bar = new THREE.BoxGeometry(.5 * s, .08 * s, .08 * s); bar.translate(0, .38 * s, .03 * s);
    return mergeGeoms([[g, new THREE.Matrix4()], [ring, new THREE.Matrix4()], [bar, new THREE.Matrix4()]]);
  }
  /* ÚSZÓ HULLÁMTALAPZAT (gyalog, huszár, futó, bástya): fém szoknya, zománcsáv hullámzó arany díszcsíkkal, fém tető */
  function waveBase(L, R) {
    L.push([lathe([[R * .8, -.5], [R * .97, -.25], [R * 1.03, 0], [R * 1.0, .16], [R * .95, .2]], 40), "m"]);
    L.push([lathe([[R * .955, .18], [R * .965, .4], [R * .965, .64], [R * .93, .67]], 40), "n"]);
    const wave = new THREE.CatmullRomCurve3(Array.from({ length: 80 }, (_, i) => { const a = i / 80 * TAU; return V3(Math.cos(a) * R * .975, .43 + .13 * Math.sin(a * 12), Math.sin(a) * R * .975); }), true);
    L.push([new THREE.TubeGeometry(wave, 240, .045, 5, true), "m"]);
    L.push([TOR(R * .968, .035, 5, 48).rotateX(Math.PI / 2), "m", M4(0, .23, 0)], [TOR(R * .962, .035, 5, 48).rotateX(Math.PI / 2), "m", M4(0, .63, 0)]);
    L.push([lathe([[R * .95, .64], [R * .96, .72], [R * .84, .8], [R * .3, .83], [0, .83]], 40), "m"]);
    return .83;
  }
  /* VARÁZSKORONG a vízen járó királyi párnak: vékony zománclap aranyszegéllyel + külön forgó rúnagyűrű (additív) */
  function runeDisc(G, L, R) {
    L.push([lathe([[R * .9, .02], [R * .92, .1], [R * .86, .16], [0, .17]], 40), "n"], [TOR(R * .9, .05, 6, 48).rotateX(Math.PI / 2), "m", M4(0, .12, 0)]);
    const tx = CS.runeT || (CS.runeT = canvasTex(512, 512, (g) => { g.translate(256, 256); g.strokeStyle = "rgba(255,220,140,1)"; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 238, 0, TAU); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 196, 0, TAU); g.stroke();
      g.fillStyle = "rgba(255,226,160,1)"; g.font = "bold 34px serif"; g.textAlign = "center"; g.textBaseline = "middle"; const R2 = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ"; for (let i = 0; i < 24; i++) { g.save(); g.rotate(i / 24 * TAU); g.fillText(R2[i], 0, -217); g.restore(); }
      for (let i = 0; i < 8; i++) { g.save(); g.rotate(i / 8 * TAU); g.beginPath(); g.moveTo(0, -190); g.lineTo(18, -120); g.lineTo(0, -60); g.lineTo(-18, -120); g.closePath(); g.stroke(); g.restore(); } }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.5, R * 2.5).rotateX(-Math.PI / 2), basic({ map: tx, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending, color: "#ffd88a" }));
    W.disposables.push(m.geometry); m.position.y = .2; m.name = "rune"; m.renderOrder = 3; G.add(m);
    return .17;
  }

  /* ------------------------------------------------------------ GYALOG: kikötőbak, körbetekert kötéllel, horgony-emblémával */
  function figPawn(c) {
    const G = new THREE.Group(), L = [], y0 = waveBase(L, 2.45);
    L.push([lathe([[1.25, y0], [1.3, y0 + .14], [1.08, y0 + .3], [.96, y0 + .45], [.92, y0 + 1.4], [.94, y0 + 2.5], [1.08, y0 + 2.75], [1.38, y0 + 3.15], [1.46, y0 + 3.38], [1.36, y0 + 3.58], [.9, y0 + 3.74], [.4, y0 + 3.82], [0, y0 + 3.84]], 32), "m"]);
    L.push([lathe([[.95, y0 + 1.5], [.975, y0 + 1.55], [.975, y0 + 2.35], [.95, y0 + 2.4]], 32), "n"]);
    L.push([TOR(.97, .04, 5, 36).rotateX(Math.PI / 2), "m", M4(0, y0 + 1.5, 0)], [TOR(.97, .04, 5, 36).rotateX(Math.PI / 2), "m", M4(0, y0 + 2.4, 0)]);
    const an = anchorGeo(.75); L.push([an, "m", M4(0, y0 + 1.95, .96)], [an.clone(), "m", M4(0, y0 + 1.95, -.96, Math.PI)]);
    /* kötél: két menet csavarvonal + lelógó vég, kötélsodrat-mintával */
    const hel = new THREE.CatmullRomCurve3(Array.from({ length: 50 }, (_, i) => { const a = i / 49 * TAU * 2.2; return V3(Math.cos(a) * 1.04, y0 + .62 + i / 49 * .55, Math.sin(a) * 1.04); }).concat([V3(1.25, y0 + .9, .9), V3(1.75, y0 + .45, 1.15), V3(2.0, y0 + .12, 1.0)]));
    L.push([varTube(hel, 160, 6, (t) => .11 * (1 + .12 * Math.sin(t * 160))), "m", null, "#d8cdb6"]);
    figMesh(L, G, c);
    G.userData.dim = [5, y0 + 3.9, 5];
    return G;
  }
  /* ------------------------------------------------------------ BÁSTYA: világítótorony zománcsávokkal, galériával, izzó lámpaházzal és forgó nyalábbal */
  function figRook(c) {
    const G = new THREE.Group(), L = [], y0 = waveBase(L, 2.75);
    const rT = (y) => 1.62 - (y / 6.0) * .58;
    L.push([lathe([[1.95, y0], [1.9, y0 + .3], [1.7, y0 + .55], [1.62, y0 + .62]].concat([[rT(.62), y0 + .62], [rT(6.0), y0 + 6.0], [rT(6.0) + .05, y0 + 6.05]]), 40), "m"]);
    [[1.1, 1.9], [2.9, 3.7], [4.7, 5.5]].forEach(([a, b]) => { L.push([lathe([[rT(a) + .02, y0 + a], [rT(a) + .035, y0 + a + .04], [rT(b) + .035, y0 + b - .04], [rT(b) + .02, y0 + b]], 40), "n"]);
      L.push([TOR(rT(a) + .03, .035, 5, 40).rotateX(Math.PI / 2), "m", M4(0, y0 + a, 0)], [TOR(rT(b) + .03, .035, 5, 40).rotateX(Math.PI / 2), "m", M4(0, y0 + b, 0)]); });
    /* ajtó és ablakok elöl-hátul */
    [1, -1].forEach((s) => { L.push([new THREE.BoxGeometry(.6, 1.0, .12), "n", M4(0, y0 + 1.2, s * (rT(1.2) + .02))], [TOR(.3, .05, 5, 14, Math.PI), "m", M4(0, y0 + 1.7, s * (rT(1.7) + .05))]);
      [2.4, 4.2].forEach((h) => L.push([new THREE.BoxGeometry(.32, .5, .1), "e", M4(0, y0 + h, s * (rT(h) + .02))], [new THREE.BoxGeometry(.44, .06, .14), "m", M4(0, y0 + h - .28, s * (rT(h) + .04))])); });
    /* galéria */
    const gy = y0 + 6.05;
    L.push([lathe([[1.0, gy - .1], [1.55, gy], [1.6, gy + .12], [0, gy + .14]], 40), "m"], [TOR(1.52, .045, 5, 48).rotateX(Math.PI / 2), "m", M4(0, gy + .62, 0)], [TOR(1.52, .03, 5, 48).rotateX(Math.PI / 2), "m", M4(0, gy + .36, 0)]);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; L.push([CY(.03, .03, .55, 5), "m", M4(Math.cos(a) * 1.52, gy + .38, Math.sin(a) * 1.52)]); }
    /* lámpaház: üveg, fémosztók, kupola, gömbdísz */
    L.push([new THREE.CylinderGeometry(.82, .82, 1.25, 24, 1, true), "e", M4(0, gy + .8, 0)]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; L.push([CY(.05, .05, 1.3, 5), "m", M4(Math.cos(a) * .84, gy + .8, Math.sin(a) * .84)]); }
    L.push([TOR(.85, .06, 5, 28).rotateX(Math.PI / 2), "m", M4(0, gy + .15, 0)], [TOR(.85, .06, 5, 28).rotateX(Math.PI / 2), "m", M4(0, gy + 1.45, 0)]);
    L.push([lathe([[.98, gy + 1.45], [.95, gy + 1.62], [.7, gy + 1.98], [.3, gy + 2.2], [0, gy + 2.25]], 28), "n"], [SPH(.2, 12, 8), "m", M4(0, gy + 2.38, 0)], [new THREE.ConeGeometry(.06, .7, 6), "m", M4(0, gy + 2.85, 0)]);
    figMesh(L, G, c);
    /* forgó fénynyaláb (két kúp) */
    const bt = CS.beamT || (CS.beamT = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,240,190,0)"); gr.addColorStop(.85, "rgba(255,240,190,.55)"); gr.addColorStop(1, "rgba(255,250,230,1)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
    const bm = CS.beamM || (CS.beamM = basic({ map: bt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: .38 }));
    const beam = new THREE.Group(); beam.name = "beam"; beam.position.y = gy + .8; G.add(beam);
    const cg = CS.beamG || (CS.beamG = (() => { const g = new THREE.ConeGeometry(1.6, 11, 16, 1, true); g.translate(0, -5.5, 0); g.rotateZ(Math.PI / 2); W.disposables.push(g); return g; })());
    [0, Math.PI].forEach((a) => { const m = new THREE.Mesh(cg, bm); m.rotation.y = a; m.renderOrder = 6; beam.add(m); });
    G.userData.dim = [5.5, gy + 2.9, 5.5]; G.userData.lamp = gy + .8;
    return G;
  }
  /* ------------------------------------------------------------ HUSZÁR: csikóhal – csavart farok, bordázott test, zománc hátúszó és szem, korona */
  function figKnight(c) {
    const G = new THREE.Group(), L = [], y0 = waveBase(L, 2.6);
    const sp = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * .2 + i / 14 * Math.PI * 1.75, r = .25 + i / 14 * .6; sp.push(V3(-.45 + Math.cos(a) * r, y0 + 1.05 + Math.sin(a) * r * .95, 0)); }
    const body = sp.reverse().concat([V3(-.95, y0 + 1.8, 0), V3(-.75, y0 + 2.8, 0), V3(-.15, y0 + 3.7, 0), V3(.2, y0 + 4.6, 0), V3(.05, y0 + 5.5, 0), V3(-.35, y0 + 6.25, 0), V3(-.25, y0 + 6.95, 0), V3(.15, y0 + 7.25, 0)]);
    const cv = new THREE.CatmullRomCurve3(body, false, "centripetal");
    const rFn = (t) => { const b = t < .3 ? .08 + t / .3 * .45 : t < .62 ? .53 + Math.sin((t - .3) / .32 * Math.PI) * .42 : t < .85 ? .58 - (t - .62) * 1.1 : .36 + (t - .85) * 2.6; return b * (1 + .085 * Math.sin(t * 150)); };
    L.push([varTube(cv, 150, 14, rFn), "m"]);
    /* fej: pofa (orr-cső) előre-lefelé, kiszélesedő véggel */
    const hd = V3(.15, y0 + 7.15, 0), snout = new THREE.CatmullRomCurve3([hd.clone(), V3(.75, y0 + 6.95, 0), V3(1.45, y0 + 6.55, 0), V3(1.75, y0 + 6.38, 0)]);
    L.push([varTube(snout, 30, 10, (t) => .5 - t * .3 + (t > .9 ? (t - .9) * 1.4 : 0)), "m"], [SPH(.24, 10, 8), "m", M4(1.78, y0 + 6.37, 0)]);
    L.push([SPH(.62, 18, 14), "m", M4(.05, y0 + 7.2, 0, 0, 0, 0, 1.05, .9, .9)]);
    /* szemek: zománc + fém szemhéj */
    [1, -1].forEach((s) => L.push([SPH(.17, 12, 10), "n", M4(.35, y0 + 7.32, s * .48)], [TOR(.18, .035, 5, 14), "m", M4(.35, y0 + 7.32, s * .5)]));
    /* korona (koronka) a fejtetőn */
    for (let i = 0; i < 5; i++) { const a = -.6 + i * .3; L.push([new THREE.ConeGeometry(.1, .55, 6), "m", M4(-.1 + Math.sin(a) * .35, y0 + 7.85, Math.cos(a) * .0 + (i - 2) * .12, 0, 0, -a * .6)]); }
    L.push([SPH(.08, 8, 6), "n", M4(-.1, y0 + 8.15, 0)]);
    /* hátúszó: zománc legyező fém bordákkal (a hát mentén) */
    { const sh = new THREE.Shape(); sh.moveTo(0, 0); for (let i = 0; i <= 12; i++) { const a = Math.PI * .5 + i / 12 * Math.PI, r = 1.0 + .12 * Math.sin(i * Math.PI); sh.lineTo(Math.cos(a) * r * .75, Math.sin(a) * r); } sh.lineTo(0, 0);
      const fg = new THREE.ExtrudeGeometry(sh, { depth: .1, bevelEnabled: false, curveSegments: 4 }); fg.translate(0, 0, -.05);
      L.push([fg, "n", M4(-.62, y0 + 3.6, 0, 0, 0, -.35)]);
      for (let i = 0; i <= 6; i++) { const a = Math.PI * .5 + i / 6 * Math.PI; const [p0, p1] = [V3(-.62, y0 + 3.6, 0), V3(-.62 + Math.cos(a - .35) * .8, y0 + 3.6 + Math.sin(a - .35) * 1.05, 0)]; L.push(RODF(p0, p1, .04)); } }
    /* sörény-tüskék a nyak hátán, mellúszó */
    for (let i = 0; i < 6; i++) { const t = .7 + i * .035, p = cv.getPointAt(t); L.push([new THREE.ConeGeometry(.09, .4, 5), "m", M4(p.x - .45, p.y, 0, 0, 0, Math.PI / 2 + .4)]); }
    [1, -1].forEach((s) => { const fg = new THREE.ConeGeometry(.35, .8, 3); L.push([fg, "n", M4(.4, y0 + 5.0, s * .5, 0, s * .6, -2.2, 1, 1, .3)]); });
    /* zománc hasi lemezek (a hasvonal mentén) */
    for (let i = 0; i < 6; i++) { const t = .42 + i * .045, p = cv.getPointAt(t), r = rFn(t); L.push([SPH(.24, 10, 6), "n", M4(p.x + r * .92, p.y, 0, 0, 0, 0, .35, 1, 1.2)]); }
    figMesh(L, G, c);
    G.userData.dim = [5.2, y0 + 8.3, 5.2];
    return G;
  }
  /* ------------------------------------------------------------ FUTÓ: hajókormány esztergált oszlopon – a kerék külön forog */
  function figBishop(c) {
    const G = new THREE.Group(), L = [], y0 = waveBase(L, 2.55);
    L.push([lathe([[1.15, y0], [1.2, y0 + .18], [.85, y0 + .4], [.5, y0 + .7], [.42, y0 + 1.4], [.62, y0 + 1.85], [.66, y0 + 2.1], [.45, y0 + 2.4], [.4, y0 + 3.6], [.55, y0 + 3.8], [.5, y0 + 3.95], [0, y0 + 4.0]], 28), "m"]);
    L.push([lathe([[.44, y0 + 2.5], [.46, y0 + 2.55], [.46, y0 + 3.35], [.44, y0 + 3.4]], 28), "n"]);
    L.push([new THREE.BoxGeometry(.5, .7, 1.0), "m", M4(0, y0 + 4.3, 0)]);
    figMesh(L, G, c);
    /* kerék */
    const WH = new THREE.Group(); WH.name = "wheel"; WH.position.set(0, y0 + 5.15, .35); G.add(WH);
    const K = [];
    K.push([TOR(2.05, .17, 8, 56), "m"], [TOR(1.42, .1, 6, 48), "m"]);
    K.push([lathe([[1.48, -.06], [2.0, -.06], [2.0, .06], [1.48, .06], [1.48, -.06]], 48).rotateX(Math.PI / 2), "n"]);
    K.push([CY(.48, .48, .55, 20).rotateX(Math.PI / 2), "m"], [CY(.36, .36, .6, 20).rotateX(Math.PI / 2), "n"], [SPH(.2, 12, 8), "m", M4(0, 0, .32)], [SPH(.2, 12, 8), "m", M4(0, 0, -.32)]);
    const hand = lathe([[.1, 0], [.15, .1], [.13, .3], [.17, .45], [.12, .6], [.06, .66], [0, .67]], 10);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, dx = Math.cos(a), dy = Math.sin(a);
      K.push(RODF(V3(dx * .45, dy * .45, 0), V3(dx * 2.1, dy * 2.1, 0), .075, 8));
      const m4 = new THREE.Matrix4().compose(V3(dx * 2.18, dy * 2.18, 0), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), V3(dx, dy, 0)), V3(1, 1, 1)); K.push([hand.clone(), "m", m4]); }
    const an = anchorGeo(.9); K.push([an, "m", M4(0, -1.75, .05)]);
    figMesh(K, WH, c);
    G.userData.dim = [5.8, y0 + 5.15 + 2.9, 5.2];
    return G;
  }
  /* ------------------------------------------------------------ VEZÉR: királynő – zománc ruha arany hullámszegéllyel, palást, korona, jogar */
  function figQueen(c) {
    const G = new THREE.Group(), L = [], y0 = runeDisc(G, L, 2.6) + .05;
    L.push([lathe([[1.85, y0], [1.82, y0 + .35], [1.55, y0 + 1.5], [1.2, y0 + 2.9], [.8, y0 + 4.3], [.62, y0 + 4.85]], 40), "n"]);
    const hem = new THREE.CatmullRomCurve3(Array.from({ length: 60 }, (_, i) => { const a = i / 60 * TAU; return V3(Math.cos(a) * 1.82, y0 + .32 + .12 * Math.sin(a * 14), Math.sin(a) * 1.82); }), true);
    L.push([new THREE.TubeGeometry(hem, 180, .05, 5, true), "m"], [TOR(1.86, .06, 6, 56).rotateX(Math.PI / 2), "m", M4(0, y0 + .05, 0)], [TOR(1.42, .04, 5, 48).rotateX(Math.PI / 2), "m", M4(0, y0 + 1.95, 0)], [TOR(.98, .035, 5, 40).rotateX(Math.PI / 2), "m", M4(0, y0 + 3.6, 0)]);
    /* elöl: arany díszsor (csillagok) a ruhán */
    for (let i = 0; i < 4; i++) { const y = y0 + .9 + i * .95, r = 1.75 - i * .27; L.push([new THREE.OctahedronGeometry(.16, 0), "m", M4(0, y, -r, 0, 0, 0, 1, 1.4, .5)], [new THREE.OctahedronGeometry(.16, 0), "m", M4(0, y, r, 0, 0, 0, 1, 1.4, .5)]); }
    /* derék, fűző, váll, nyak, fej, haj */
    L.push([lathe([[.6, y0 + 4.7], [.66, y0 + 5.2], [.62, y0 + 5.8], [.75, y0 + 6.2], [.55, y0 + 6.45], [.2, y0 + 6.6]], 28), "m"], [TOR(.64, .07, 6, 28).rotateX(Math.PI / 2), "m", M4(0, y0 + 4.85, 0)]);
    [1, -1].forEach((s) => L.push([SPH(.32, 12, 10), "m", M4(s * .7, y0 + 6.2, 0)]));
    L.push([CY(.18, .2, .45, 12), "m", M4(0, y0 + 6.75, 0)], [SPH(.52, 20, 16), "m", M4(0, y0 + 7.35, 0, 0, 0, 0, .92, 1.05, .95)], [SPH(.4, 14, 10), "m", M4(0, y0 + 7.55, .38)], [TOR(.48, .12, 8, 24).rotateX(Math.PI / 2.4), "m", M4(0, y0 + 7.45, .12)]);
    /* korona: abroncs, nyolc csúcs zománcgyöngyökkel, középen kereszt-gömb */
    const cy = y0 + 7.85; L.push([new THREE.CylinderGeometry(.46, .4, .26, 20, 1, true), "m", M4(0, cy, 0)], [TOR(.46, .05, 5, 24).rotateX(Math.PI / 2), "m", M4(0, cy + .13, 0)]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; L.push([new THREE.ConeGeometry(.1, .42, 5), "m", M4(Math.cos(a) * .44, cy + .33, Math.sin(a) * .44)], [SPH(.07, 8, 6), "n", M4(Math.cos(a) * .44, cy + .56, Math.sin(a) * .44)]); }
    L.push([SPH(.16, 12, 10), "n", M4(0, cy + .48, 0)], [new THREE.BoxGeometry(.06, .3, .06), "m", M4(0, cy + .72, 0)]);
    /* karok: jobb kéz jogarral, bal a ruhán */
    L.push(...[[V3(.82, y0 + 6.1, 0), V3(1.05, y0 + 5.1, -.15), V3(1.0, y0 + 4.4, -.45)], [V3(-.82, y0 + 6.1, 0), V3(-.95, y0 + 5.1, -.1), V3(-.55, y0 + 4.6, -.5)]].map((pp) => [varTube(new THREE.CatmullRomCurve3(pp), 14, 8, (t) => .2 - t * .06), "m"]));
    L.push([SPH(.16, 10, 8), "m", M4(1.0, y0 + 4.35, -.47)], [SPH(.16, 10, 8), "m", M4(-.55, y0 + 4.55, -.52)]);
    L.push(RODF(V3(1.0, y0 + 3.2, -.5), V3(1.0, y0 + 7.0, -.5), .055, 8), [new THREE.OctahedronGeometry(.28, 0), "n", M4(1.0, y0 + 7.25, -.5)], [TOR(.22, .04, 5, 16), "m", M4(1.0, y0 + 7.25, -.5)]);
    /* palást hátul (fél esztergatest), szegéllyel */
    L.push([lathe([[.72, y0 + 6.3], [1.0, y0 + 5.0], [1.45, y0 + 2.6], [2.0, y0 + .15]], 24, Math.PI * .08, Math.PI * .84), "n", null, "#9fb4e6"], [TOR(.75, .06, 5, 20, Math.PI).rotateX(Math.PI / 2), "m", M4(0, y0 + 6.3, 0)]);
    figMesh(L, G, c);
    G.userData.dim = [4.4, y0 + 8.8, 4.4];
    return G;
  }
  /* ------------------------------------------------------------ KIRÁLY: a kapitány – zománc kabát arany gombokkal, vállap, szakáll, tiszti sapka kereszttel, távcső */
  function figKing(c) {
    const G = new THREE.Group(), L = [], y0 = runeDisc(G, L, 2.7) + .05;
    /* csizma, kabát (a földig érő szárnyakkal), öv, gombsor */
    [1, -1].forEach((s) => L.push([CY(.36, .4, .9, 12), "m", M4(s * .42, y0 + .45, 0)]));
    L.push([lathe([[1.25, y0 + .7], [1.2, y0 + 1.2], [1.05, y0 + 2.7], [.98, y0 + 3.6], [1.12, y0 + 4.6], [1.22, y0 + 5.5], [1.12, y0 + 6.0], [.7, y0 + 6.35], [.28, y0 + 6.5]], 36), "n"]);
    L.push([TOR(1.0, .1, 6, 36).rotateX(Math.PI / 2), "m", M4(0, y0 + 3.6, 0)], [new THREE.BoxGeometry(.5, .38, .14), "m", M4(0, y0 + 3.6, -1.06)]);
    for (let i = 0; i < 5; i++) [-.28, .28].forEach((x) => { const y = y0 + 3.95 + i * .42, r = .98 + (y - y0 - 3.6) * .12; L.push([SPH(.08, 8, 6), "m", M4(x, y, -Math.sqrt(Math.max(.1, r * r - x * x)))]); });
    L.push([TOR(1.22, .045, 5, 40).rotateX(Math.PI / 2), "m", M4(0, y0 + .75, 0)], [TOR(1.0, .04, 5, 40).rotateX(Math.PI / 2), "m", M4(0, y0 + 2.8, 0)]);
    /* fém mellény-betét és hajtókák elöl (a kabát nyitott eleje), arany zsinórok a mellen */
    { const vs = new THREE.Shape(); vs.moveTo(-.42, 0); vs.lineTo(.42, 0); vs.lineTo(.3, 1.9); vs.lineTo(0, 2.25); vs.lineTo(-.3, 1.9); vs.closePath(); const vg = new THREE.ExtrudeGeometry(vs, { depth: .08, bevelEnabled: false }); L.push([vg, "m", M4(0, y0 + 3.8, -1.12, Math.PI, .1)]);
      [1, -1].forEach((sd) => { const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.lineTo(.42 * sd, .2); ls.lineTo(.62 * sd, 1.6); ls.lineTo(.3 * sd, 2.3); ls.closePath(); L.push([new THREE.ExtrudeGeometry(ls, { depth: .06, bevelEnabled: false }), "n", M4(0, y0 + 3.85, -1.2, Math.PI, .1), "#c7d3f2"]); });
      for (let i = 0; i < 3; i++) L.push([TOR(.42 - i * .04, .025, 4, 16, Math.PI), "m", M4(0, y0 + 5.3 - i * .35, -1.2, 0, 0, Math.PI)]); }
    /* gallér, vállapok rojtokkal */
    L.push([lathe([[.55, y0 + 6.25], [.7, y0 + 6.45], [.45, y0 + 6.7]], 24), "m"]);
    [1, -1].forEach((s) => { L.push([CY(.42, .42, .1, 16), "m", M4(s * 1.02, y0 + 6.05, 0, 0, 0, s * .25)]); for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI - Math.PI / 2; L.push([CY(.03, .03, .32, 4), "m", M4(s * (1.02 + Math.cos(a) * .0) + s * .38, y0 + 5.85, Math.sin(a) * .38)]); } });
    /* karok: jobb kéz távcsővel (előre-fel), bal csípőre */
    const armR = new THREE.CatmullRomCurve3([V3(1.05, y0 + 6.0, 0), V3(1.35, y0 + 5.2, -.35), V3(1.2, y0 + 4.9, -1.05)]), armL = new THREE.CatmullRomCurve3([V3(-1.05, y0 + 6.0, 0), V3(-1.55, y0 + 5.0, 0), V3(-1.05, y0 + 4.2, -.2)]);
    L.push([varTube(armR, 14, 8, (t) => .3 - t * .08), "n"], [varTube(armL, 14, 8, (t) => .3 - t * .08), "n"], [TOR(.24, .06, 5, 14), "m", M4(1.2, y0 + 4.92, -1.0, 0, -.3)], [TOR(.24, .06, 5, 14).rotateX(Math.PI / 2), "m", M4(-1.07, y0 + 4.3, -.18)]);
    L.push([SPH(.2, 10, 8), "m", M4(1.2, y0 + 4.95, -1.15)], [SPH(.2, 10, 8), "m", M4(-1.02, y0 + 4.15, -.25)]);
    L.push([CY(.11, .16, 1.6, 12).rotateX(-(Math.PI / 2 - .35)), "m", M4(1.2, y0 + 5.2, -1.55)], [TOR(.14, .03, 5, 12), "m", M4(1.2, y0 + 5.42, -2.1, 0, -.35)]);
    /* fej, szakáll, fülek */
    L.push([CY(.22, .25, .4, 12), "m", M4(0, y0 + 6.75, 0)], [SPH(.56, 20, 16), "m", M4(0, y0 + 7.3, 0, 0, 0, 0, .95, 1.05, 1)], [SPH(.5, 14, 10, 0), "m", M4(0, y0 + 7.0, -.15, 0, 0, 0, 1, .85, .9)]);
    [1, -1].forEach((s) => L.push([SPH(.12, 8, 6), "m", M4(s * .54, y0 + 7.3, 0, 0, 0, 0, .5, 1, 1)]));
    /* tiszti sapka: zománc tető, arany szalag, fém ellenző, jelvény-kereszt elöl és a tetején */
    const hy = y0 + 7.75;
    L.push([CY(.66, .6, .42, 24), "n", M4(0, hy, 0)], [CY(.8, .8, .14, 28), "n", M4(0, hy + .25, 0, 0, 0, 0, 1, 1, 1)], [TOR(.62, .06, 6, 28).rotateX(Math.PI / 2), "m", M4(0, hy - .12, 0)]);
    L.push([lathe([[.2, -.02], [.72, -.06], [.74, 0], [.2, .02]], 24, Math.PI * .5, Math.PI), "m", M4(0, hy - .2, 0, 0, .15)]);
    const cross = (x, y, z, ry, s) => { L.push([new THREE.BoxGeometry(.12 * s, .62 * s, .12 * s), "m", M4(x, y, z, ry)], [new THREE.BoxGeometry(.42 * s, .12 * s, .12 * s), "m", M4(x, y + .1 * s, z, ry)]); };
    cross(0, hy + .02, -.66, 0, .75); cross(0, hy + .02, .64, 0, .6);
    L.push([SPH(.13, 10, 8), "m", M4(0, hy + .36, 0)]); cross(0, hy + .72, 0, 0, 1.0); L.push([SPH(.07, 8, 6), "n", M4(0, hy + .82, -.07)]);
    /* kabátszárny hátul */
    L.push([lathe([[1.1, y0 + 3.6], [1.25, y0 + 2.2], [1.42, y0 + .8]], 20, Math.PI * .2, Math.PI * .6), "n", null, "#9fb4e6"]);
    figMesh(L, G, c);
    G.userData.dim = [4.6, hy + 1.1, 4.6];
    return G;
  }
  const FIGB = { p: figPawn, n: figKnight, b: figBishop, r: figRook, q: figQueen, k: figKing };
  /* a figura nagyobb, mint a hajó volt: a mérethez igazítva (a makePiece még PSC-vel szoroz) */
  const FIGS = { p: 1.0, n: 1.08, b: 1.02, r: 1.06, q: 1.15, k: 1.18 };
  function figTpl(t, c) {
    const k = "f" + t + c; if (!CS.tpl[k]) { const g = FIGB[t](c); const s = FIGS[t]; g.scale.setScalar(s); g.userData.dim = g.userData.dim.map((v) => v * s); g.userData.lamp = (g.userData.lamp || 0) * s; CS.tpl[k] = g; }
    const src = CS.tpl[k], o = src.clone(); o.userData = Object.assign({}, src.userData); return o;
  }

  /* ------------------------------------------------------------ FIGURÁK MOZGATÁSA (állapot a P objektumon)
     – siklás: a talapzat kicsit előre dől, a víz habzik; a csikóhal ugrik; a királyi pár lépked, lábnyomuk csillámló gyűrű */
  function figIdle(P, dt) {
    const rune = P.model.getObjectByName ? (P.rune || (P.rune = P.model.getObjectByName("rune") || null)) : null;
    if (rune) { rune.rotation.y += dt * (P.moving ? 2.2 : .35); rune.material.opacity = P.moving ? .95 : .55 + .15 * Math.sin(W.t * 2 + P.ph); }
    const wh = P.wheel || (P.wheel = P.model.getObjectByName("wheel") || null);
    if (wh) { P.spin = P.spin || 0; wh.rotation.z += dt * (.15 + P.spin); P.spin *= 1 - Math.min(1, dt * .8); }
  }
  /* ------------------------------------------------------------ CSATÁK (v2, nov. 9.): a támadó figurájához illő, hosszabb jelenetek
     gyalog (Zephyr vitorlás): a leütendő felé fordul, teljes vitorlával nekifut és orral belédöf – az áldozat félrebillen,
                               orra az égnek mered, és tattal előre a mélybe csúszik (roncsdarabok, buborékok)
     huszár (hattyú):          szárnyra kap, a magasban köröz, majd zuhanórepülésben lecsap – vízoszlop, szilánkok
     futó (háromárbócos):      oldalt fordul, három sortűz: az első a víz körül csapódik be (vízoszlopok), a második talál,
                               a harmadik a lőporraktárt – robbanás, égve, oldalára dőlve süllyed
     bástya (világítótorony):  a fénysugár végigpásztázza a vizet, rátalál, izzásig hevíti – robbanás, olvadva süllyed
     vezér (királynő):         varázsörvény, víztölcsér emeli a magasba, megpörgeti, és a mélybe dobja
     király (kapitány):        vihart hív – sötét felhő, zuhogó eső, öt villám, végül a kraken csápjai a mélybe húzzák
     Közben a kép a csata közelébe repül (2D-ben simán, VR-ben kíméletes elsötétüléssel), a végén vissza. */
  const BST = { p: "ram", n: "dive", b: "broadside", r: "beam", q: "spout", k: "storm" };
  /* ---- VÁLTOZATOS CSATÁK (v3, 2026-11-11) – a tulajdonos kérése: minden csata más legyen, és az is számítson, melyik bábu melyikkel találkozik.
     Új jelenetek a régi hat mellé:  kraken – tengeri szörny emelkedik ki és a mélybe rántja (vihar nélkül);  hurricane – hurrikán: felhő, eső, víztölcsér, a magasban
     darabokra szedi;  laser – a legközelebbi SAJÁT világítótorony fénysugara végez vele (ha nincs torony, a támadóból jön);  magic – varázslat: a víztölcsér után szikrázva semmivé válik.
     Minden támadótípusnak több lehetősége van; a sorrendet a támadó–áldozat PÁROS dönti el (páronként más az „első számú” csata), és az utolsó két csata soha nem ismétlődik.
     A jeleneteken belül is véletlen a villámok száma, a sortüzek száma, az emelés magassága, a szétesés módja. */
  const BOPT = { p: ["ram", "kraken", "laser", "hurricane", "magic"], n: ["dive", "storm", "ram", "magic", "kraken"], b: ["broadside", "laser", "kraken", "ram", "hurricane"],
                 r: ["beam", "hurricane", "kraken", "storm", "magic"], q: ["spout", "magic", "storm", "hurricane", "laser", "kraken"], k: ["storm", "kraken", "hurricane", "spout", "laser"] };
  const BBASE = { kraken: "storm", hurricane: "spout", laser: "beam", magic: "spout" };
  function battlePick(P, V) {
    if (CS.forceBattle) { const fb = CS.forceBattle; return fb === "dive" && P.t !== "n" ? "ram" : fb; }
    const opt = BOPT[P.t] || ["ram"], ord = "pnbrqk", h = (ord.indexOf(P.t) * 7 + ord.indexOf(V.t) * 3 + (P.c === "w" ? 0 : 2)) % opt.length, last = CS.lastBattles || (CS.lastBattles = []);
    const rot = opt.slice(h).concat(opt.slice(0, h)), fresh = rot.filter((q) => last.indexOf(q) < 0);
    const pool = fresh.length ? fresh : rot, pick = pool[rand() < .62 ? 0 : Math.floor(rand() * pool.length)];
    last.push(pick); if (last.length > 2) last.shift(); return pick;
  }
  function battleSetup(A, P, V) {
    const variant = battlePick(P, V), st = BBASE[variant] || variant, M = A.movers[0], dir = A.vp.clone().sub(A.ap).setY(0).normalize();
    Object.assign(A, { style: st, variant, V, P, dir, tGone: 1e9, tSink: 1e9, tTurn: .8, liftH: rr(13, 21), endMode: rand() < .5 ? "a" : "b" });
    if (variant === "laser") { let best = null, bd = 1e9; for (let i = 0; i < 64; i++) { const q = CS.vis[i]; if (q && q.t === "r" && q.c === P.c && q !== P) { const d = q.g.position.distanceTo(A.vp); if (d < bd) { bd = d; best = q; } } } A.lampP = best; }
    if (st === "ram") { M.y1 = yawOf(dir); A.tSail = .95; M.dur = Math.max(M.dur, 2.1); snd("creak", .7); }
    else if (st === "dive") { M.y1 = yawOf(dir); A.tTurn = .3; A.leap = true; A.leapH = 19; A.tSail = .4; M.dur = 3.6; snd("whoosh"); }
    else if (st === "broadside") {
      const y = yawOf(dir) + Math.PI / 2; M.y1 = y; A.tTurn = 1.15;
      A.side = Math.sign(dir.x * Math.cos(y) - dir.z * Math.sin(y)) || 1;
      A.shots = []; [1.5, 2.55, 3.45].forEach((t0, vol) => { for (let i = 0; i < 4; i++) A.shots.push({ t: t0 + i * .12, i, vol }); }); A.shi = 0;
      A.tSink = 4.2; A.tGone = 6.6; A.tSail = 6.3; snd("creak", .8);
    }
    else if (st === "beam") { const lk = rr(1.7, 2.6); A.tFire = .6; A.tLock = lk; A.tSink = lk + rr(1.3, 1.9); A.tGone = A.tSink + 2.1; A.tSail = A.tGone - .3; snd("whoosh", .5); }
    else if (st === "spout") { A.tFire = .5; A.tLift = 2.0; A.tFall = 4.1; A.tSink = 4.7; A.tGone = 5.7; A.tSail = 5.4; snd("whoosh", .6);
      if (variant === "hurricane") { A.tFall = 4.4; A.tTear = 3.9; A.tSink = 1e9; A.tGone = 5.6; A.tSail = 5.3; snd("boom", .5); }
      else if (variant === "magic") { A.tPoof = 3.9; A.tFall = 1e9; A.tSink = 1e9; A.tGone = 5.2; A.tSail = 4.9; } }
    else if (variant === "kraken") { A.tFire = 1e9; A.strikes = []; A.si = 0; A.tSink = 1.5; A.tGone = 4.9; A.tSail = 4.6; snd("splash", 1); }
    else { const n = 3 + Math.floor(rand() * 4); A.tFire = .4; A.strikes = Array.from({ length: n }, (_, i) => 1.1 + i * rr(.34, .52)); A.si = 0; A.tSink = A.strikes[n - 1] + rr(.3, .6); A.tGone = A.tSink + 3; A.tSail = A.tGone - .3; snd("boom", .4); }
    if (st === "broadside") { const vol = 2 + Math.floor(rand() * 3); A.shots = []; for (let v = 0; v < vol; v++) for (let i = 0; i < 4; i++) A.shots.push({ t: 1.5 + v * 1.0 + i * .12, i, vol: v === 0 ? 0 : v === vol - 1 ? 2 : 1 }); A.tSink = 1.5 + (vol - 1) * 1.0 + .75; A.tGone = A.tSink + 2.4; A.tSail = A.tGone - .3; }
    cineStart(A);
  }
  /* ideiglenes hálók a csatához (örvény, fénysugár, víztölcsér, villám, felhő, eső, csápok, roncsdarabok) */
  function bfx() {
    if (CS.bfx) return CS.bfx;
    const env = CS.env, B = {};
    const wt = canvasTex(512, 512, (g) => { g.translate(256, 256); for (let k = 0; k < 7; k++) { g.rotate(TAU / 7); g.beginPath(); for (let i = 0; i <= 80; i++) { const a = i / 80 * 4.2, r = 20 + i * 2.95; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 10; g.stroke(); g.strokeStyle = "rgba(160,215,255,.5)"; g.lineWidth = 26; g.stroke(); }
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 250); gr.addColorStop(0, "rgba(0,8,20,.95)"); gr.addColorStop(.25, "rgba(2,20,40,.6)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.globalCompositeOperation = "destination-over"; g.fillStyle = gr; g.fillRect(-256, -256, 512, 512); });
    B.whirl = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), basic({ map: wt, transparent: true, depthWrite: false, opacity: 0 })); B.whirl.renderOrder = 2; B.whirl.visible = false; env.add(B.whirl);
    const lt = canvasTex(64, 64, (g) => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, "rgba(255,250,220,0)"); gr.addColorStop(.5, "rgba(255,255,240,1)"); gr.addColorStop(1, "rgba(255,250,220,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    B.ray = new THREE.Mesh(new THREE.CylinderGeometry(.45, 1.1, 1, 16, 1, true).translate(0, .5, 0).rotateX(Math.PI / 2), basic({ map: lt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: "#fff2c0", side: THREE.DoubleSide, opacity: 0 })); B.ray.visible = false; env.add(B.ray);
    B.core = new THREE.Mesh(new THREE.CylinderGeometry(.14, .3, 1, 10, 1, true).translate(0, .5, 0).rotateX(Math.PI / 2), basic({ color: "#ffffff", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); B.core.visible = false; env.add(B.core);
    const st = canvasTex(128, 512, (g, w, h) => { for (let i = 0; i < 60; i++) { const x = rand() * w; g.strokeStyle = `rgba(255,255,255,${rr(.15, .6)})`; g.lineWidth = rr(2, 7); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + rr(-30, 30), h); g.stroke(); } });
    st.wrapS = st.wrapT = THREE.RepeatWrapping;
    B.spout = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 1.1, 26, 32, 12, true).translate(0, 13, 0), basic({ map: st, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: "#cfe9ff", opacity: 0, blending: THREE.AdditiveBlending })); B.spout.visible = false; env.add(B.spout);
    { const p = B.spout.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = v.y / 26, a = k * 2.2; const x = v.x * Math.cos(a) - v.z * Math.sin(a), z = v.x * Math.sin(a) + v.z * Math.cos(a); p.setXYZ(i, x + Math.sin(k * 5) * .8, v.y, z); } p.needsUpdate = true; }
    B.bolt = new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: "#e9f4ff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); B.bolt.visible = false; env.add(B.bolt);
    B.boltG = new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: "#7fb8ff", transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false })); B.boltG.visible = false; env.add(B.boltG);
    B.tent = []; const tm = std({ color: "#5c1f3c", roughness: .45, metalness: .1 }); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.BufferGeometry(), tm); m.visible = false; env.add(m); B.tent.push(m); }
    const ct = canvasTex(256, 256, (g) => { for (let i = 0; i < 40; i++) { const x = rr(40, 216), y = rr(40, 216), r = rr(20, 60), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(30,32,48,.55)"); gr.addColorStop(1, "rgba(30,32,48,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } });
    B.cloud = new THREE.Mesh(new THREE.CircleGeometry(22, 40).rotateX(Math.PI / 2), basic({ map: ct, color: "#5a5e78", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); B.cloud.visible = false; env.add(B.cloud);
    B.cloud2 = B.cloud.clone(); B.cloud2.material = B.cloud.material.clone(); B.cloud2.scale.setScalar(.7); env.add(B.cloud2);
    /* eső: 360 ferde csík egy hengerben, a felhő alatt */
    const RN = 360, rp = new Float32Array(RN * 6), rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
    B.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: "#d4e6ff", transparent: true, opacity: 0, depthWrite: false })); B.rain.frustumCulled = false; B.rain.visible = false; env.add(B.rain); W.disposables.push(rg, B.rain.material);
    B.rainD = Array.from({ length: RN }, () => [rr(-14, 14), rr(0, 30), rr(-14, 14)]);
    /* roncsdarabok: deszkák (mahagóni) és aranyozott szilánkok */
    const pg = new THREE.BoxGeometry(1, 1, 1), wood = std({ color: "#6b3a1e", roughness: .7 }), gild = std({ color: "#d4a13a", metalness: .8, roughness: .3 }), sailM = std({ color: "#f1ece0", roughness: .9, side: THREE.DoubleSide });
    B.deb = []; for (let i = 0; i < 48; i++) { const m = new THREE.Mesh(pg, i % 6 === 0 ? gild : i % 5 === 0 ? sailM : wood); m.visible = false; env.add(m); B.deb.push({ m, v: new THREE.Vector3(), w: new THREE.Vector3(), t: 99, life: 3 }); }
    B.di = 0;
    return (CS.bfx = B);
  }
  function setGeo(m, g) { if (m.geometry) m.geometry.dispose(); m.geometry = g; }
  function boltGeo(a, b, seg, jit, r) {
    const pts = [a.clone()]; for (let i = 1; i < seg; i++) { const k = i / seg; pts.push(a.clone().lerp(b, k).add(V3(rr(-jit, jit), rr(-jit * .3, jit * .3), rr(-jit, jit)))); } pts.push(b.clone());
    const parts = []; for (let i = 0; i < pts.length - 1; i++) { const [g, m] = rodGeom(pts[i], pts[i + 1], r, 4); parts.push([g, m]); }
    for (let k = 0; k < 3; k++) { const i = 2 + Math.floor(rand() * (seg - 4)), q = pts[i], e = q.clone().add(V3(rr(-6, 6), rr(-6, -2), rr(-6, 6))); const [g, m] = rodGeom(q, e, r * .6, 4); parts.push([g, m]); }
    const g = mergeGeoms(parts); const i = W.disposables.indexOf(g); if (i >= 0) W.disposables.splice(i, 1); return g;
  }
  function tentGeo(base, top, curl, k, phase) {
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10, s = t * k; const a = phase + t * curl * k; pts.push(V3(base.x + (top.x - base.x) * s + Math.cos(a) * 1.4 * t, -1.5 + (top.y + 1.5) * Math.sin(s * Math.PI * .5), base.z + (top.z - base.z) * s + Math.sin(a) * 1.4 * t)); }
    return varTube(new THREE.CatmullRomCurve3(pts), 40, 8, (t) => Math.max(.06, .75 * (1 - t) * (1 - t * .3)));
  }
  /* roncsok szétrepülése, vízoszlop, ágyúgolyó */
  function debris(p, n, spd, up) {
    const B = bfx(); for (let k = 0; k < n; k++) { const d = B.deb[B.di++ % B.deb.length]; d.m.position.copy(p).add(V3(rr(-.6, .6), rr(0, .8), rr(-.6, .6)));
      const a = rand() * TAU, s = rr(.4, 1) * spd; d.v.set(Math.cos(a) * s, rr(.5, 1) * (up || spd * 1.2), Math.sin(a) * s); d.w.set(rr(-9, 9), rr(-9, 9), rr(-9, 9));
      d.m.scale.set(rr(.15, .5), rr(.08, .16), rr(.6, 1.8)); d.m.rotation.set(rand() * 6, rand() * 6, rand() * 6); d.t = 0; d.life = rr(2.5, 4); d.m.visible = true; }
  }
  function geyser(p, h) { for (let k = 0; k < 22; k++) CS.fx.spray.emit(V3(p.x + rr(-.7, .7), .2, p.z + rr(-.7, .7)), V3(rr(-1.2, 1.2), rr(.7, 1) * h, rr(-1.2, 1.2)), rr(.7, 1.3), 2); CS.fx.rings.emit(p.x, p.z, 3.5, 2.6); CS.fx.rings.emit(p.x, p.z, 2, 1.8); snd("splash", 1); }
  function ballTo(from, to, on) {
    const b = CS.balls.find((q) => q.t > q.d) || CS.balls[0], dist = from.distanceTo(to);
    b.a = from.clone(); b.b = to.clone(); b.t = 0; b.d = .45 + dist / 55; b.h = 1 + dist * .07; b.on = on; b.m.visible = true;
  }
  function bfxTick(dt) {
    const B = CS.bfx; if (!B) return;
    B.deb.forEach((d) => { if (d.t > d.life) { if (d.m.visible) d.m.visible = false; return; } d.t += dt;
      if (d.m.position.y > -.05) { d.v.y -= 9.8 * dt; d.m.position.addScaledVector(d.v, dt); d.m.rotation.x += d.w.x * dt; d.m.rotation.y += d.w.y * dt; d.m.rotation.z += d.w.z * dt;
        if (d.m.position.y < 0 && d.v.y < 0) { d.v.multiplyScalar(.12); d.v.y = 0; d.w.multiplyScalar(.15); d.m.position.y = 0; if (rand() < .4) CS.fx.rings.emit(d.m.position.x, d.m.position.z, .8, 1.2); } }
      else { d.m.position.addScaledVector(d.v, dt); d.m.rotation.y += d.w.y * dt; }
      if (d.t > d.life - 1) d.m.position.y -= dt * .6;   /* a végén elmerül */
    });
  }
  /* a csata egy képkockája (a mozgatás előtt) */
  function battleTick(A, dt) {
    const B = bfx(), V = A.V, vp = A.vp, P = A.P, t = A.t, st = A.style, vt = V.body, dir = A.dir, nrm = V3(-dir.z, 0, dir.x);
    const burn = (rate, h) => { if (rand() < dt * rate) CS.fx.fire.emit(V3(V.g.position.x + rr(-1.4, 1.4), rr(.4, h || V.dim[1] * .8) + vt.position.y, V.g.position.z + rr(-1.4, 1.4)), V3(rr(-.3, .3), rr(1.5, 3.5), rr(-.3, .3)), rr(1, 2.4), rr(.4, .8));
      if (rand() < dt * rate * .3) CS.fx.dsmoke.emit(V3(V.g.position.x + rr(-1, 1), V.dim[1] * .7 + vt.position.y, V.g.position.z + rr(-1, 1)), V3(rr(-.3, .3), rr(1.5, 3), rr(-.3, .3)), rr(1.4, 2.4)); };
    const bubbles = (rate) => { if (rand() < dt * rate) CS.fx.rings.emit(V.g.position.x + rr(-2.5, 2.5), V.g.position.z + rr(-2.5, 2.5), rr(1, 2.6), 1.8); if (rand() < dt * rate * 1.5) CS.fx.spray.emit(V3(V.g.position.x + rr(-1.5, 1.5), .2, V.g.position.z + rr(-1.5, 1.5)), V3(rr(-.5, .5), rr(1.5, 3.5), rr(-.5, .5)), rr(.3, .6), .8); };
    const sinkOnce = () => { if (!A.ssnd) { A.ssnd = 1; snd("sink"); } };
    /* a megtámadott a csata elején riadtan billeg */
    const alarm = (k) => { vt.rotation.z = Math.sin(t * 11) * .07 * k; };

    if (st === "ram") {
      if (!A.hit) {
        alarm(clamp(t / 1.5, 0, 1));
        if (t > A.tSail && rand() < dt * 35) { const fwd = P.g.position.clone().addScaledVector(dir, P.dim[2] * .5); CS.fx.spray.emit(V3(fwd.x + rr(-.5, .5), .3, fwd.z + rr(-.5, .5)), V3(nrm.x * rr(-3, 3) + dir.x * 2, rr(2, 4.5), nrm.z * rr(-3, 3) + dir.z * 2), rr(.4, .8), .9); }
        const d = Math.hypot(P.g.position.x - vp.x, P.g.position.z - vp.z);
        if (t > A.tSail + .2 && d < (P.dim[2] + V.dim[2]) * .3 + .8) {
          A.hit = t; A.tSink = t + .9; A.tGone = t + 4.4; A.side = V.sinkRoll;
          const c = vp.clone().addScaledVector(dir, -V.dim[2] * .3).setY(V.dim[1] * .3);
          debris(c, 16, 6, 7); CS.fx.flash.emit(c, V3(0, 0, 0), 5, .3); splashAt(c, true); geyser(c, 7); snd("hit", 1.2); snd("boom", .5);
        }
      } else {
        const k1 = clamp((t - A.hit) / 1.2, 0, 1), k2 = clamp((t - A.tSink) / (A.tGone - A.tSink - .2), 0, 1), s = A.side;
        V.g.position.copy(vp).addScaledVector(nrm, s * smooth(k1) * SQ * .7).addScaledVector(dir, smooth(k1) * 2.4);
        vt.rotation.set(-Math.pow(k2, .8) * 1.15, 0, s * (Math.sin(k1 * Math.PI) * .55 + k2 * .35), "YXZ");
        vt.position.y = -Math.pow(k2, 1.7) * (V.dim[1] + 4) + (1 - k2) * Math.sin(k1 * Math.PI) * .4;
        if (k1 < 1 && rand() < dt * 30) CS.fx.spray.emit(V3(V.g.position.x + rr(-1.5, 1.5), .3, V.g.position.z + rr(-1.5, 1.5)), V3(nrm.x * s * rr(2, 5), rr(2, 5), nrm.z * s * rr(2, 5)), rr(.4, .8), 1);
        if (k2 > 0) { bubbles(10); sinkOnce(); if (rand() < dt * 3) debris(V.g.position.clone().setY(.5), 1, 1.5, 2); }
      }
    } else if (st === "dive") {
      if (!A.landed) alarm(clamp((t - 1.5) / 2, 0, 1));
      if (t > A.tSail && !A.took) { A.took = 1; CS.fx.rings.emit(A.ap.x, A.ap.z, 5, 2.4); CS.fx.rings.emit(A.ap.x, A.ap.z, 3, 1.6); for (let j = 0; j < 18; j++) { const a = rand() * TAU; CS.fx.spray.emit(V3(A.ap.x + Math.cos(a) * 2, .3, A.ap.z + Math.sin(a) * 2), V3(Math.cos(a) * 5, rr(2, 5), Math.sin(a) * 5), rr(.4, .8), 1.2); } }
      if (A.landed) {
        if (!A.crushed) { A.crushed = 1; A.tGone = A.landed + 2.4; geyser(vp, 13); debris(vp.clone().setY(1), 20, 7, 9); snd("hit", 1.2); }
        const k = clamp((t - A.landed) / 2.2, 0, 1); vt.scale.set(1 + k * .25, Math.max(.05, 1 - k * 1.05), 1 + k * .25); vt.position.y = -k * 4.5; vt.rotation.z = V.sinkRoll * k * .7; bubbles(12); sinkOnce();
      }
    } else if (st === "broadside") {
      while (A.shi < A.shots.length && t > A.shots[A.shi].t) {
        const S = A.shots[A.shi++], y = P.yaw, cy = Math.cos(y), sy = Math.sin(y);
        const lx = A.side * P.dim[0] * .5, lz = (-.3 + S.i * .2) * P.dim[2], ly = P.dim[1] * .16;
        const from = P.g.position.clone().add(V3(lx * cy + lz * sy, ly, -lx * sy + lz * cy)), out = V3(A.side * cy, 0, -A.side * sy);
        CS.fx.flash.emit(from, V3(0, 0, 0), 3.5, .22); for (let k = 0; k < 6; k++) CS.fx.smoke.emit(from.clone().add(V3(rr(-.3, .3), rr(0, .4), rr(-.3, .3))), out.clone().multiplyScalar(rr(1.5, 4)).add(V3(0, rr(.3, 1), 0)), rr(1.8, 3));
        snd("boom", .7); P.heel = -A.side * .1;
        const last = S.vol === 2 && S.i === 3;
        if (S.vol === 0) { const to = vp.clone().addScaledVector(nrm, rr(-4.5, 4.5)).addScaledVector(dir, rr(-6, 3)).setY(0); ballTo(from, to, () => geyser(to, rr(7, 11))); }
        else { const to = vp.clone().add(V3(rr(-1.2, 1.2), rr(.6, V.dim[1] * .55), rr(-1.2, 1.2)));
          ballTo(from, to, () => { A.burn = 1; V.kick = 1; CS.fx.flash.emit(to, V3(0, 0, 0), last ? 14 : 5, last ? .5 : .3); debris(to, last ? 26 : 7, last ? 9 : 5, last ? 12 : 6); snd(last ? "boom" : "hit", last ? 1.3 : .9);
            for (let j = 0; j < (last ? 40 : 10); j++) CS.fx.fire.emit(to.clone(), V3(rr(-4, 4), rr(1, last ? 12 : 5), rr(-4, 4)), rr(.8, last ? 3 : 1.6), rr(.4, .9));
            if (last) { for (let j = 0; j < 12; j++) CS.fx.dsmoke.emit(to.clone().add(V3(rr(-1, 1), rr(0, 3), rr(-1, 1))), V3(rr(-.6, .6), rr(2, 5), rr(-.6, .6)), rr(2, 3.5)); splashAt(vp, true); } }); }
      }
      if (P.heel) P.heel *= 1 - Math.min(1, dt * 2.5);
      V.kick = (V.kick || 0) * (1 - Math.min(1, dt * 3));
      if (A.burn) burn(26);
      if (t < A.tSink) vt.rotation.z = V.sinkRoll * V.kick * .3 + Math.sin(t * 2) * .03;
      else { const k = clamp((t - A.tSink) / (A.tGone - A.tSink - .2), 0, 1); vt.rotation.set(Math.sin(t * 1.3) * .1 * k, 0, V.sinkRoll * (.25 + k * 1.1), "YXZ"); vt.position.y = -Math.pow(k, 1.6) * (V.dim[1] + 4); bubbles(10); sinkOnce(); }
    } else if (st === "beam") {
      const LP = A.lampP || P, lamp = LP.g.position.clone().add(V3(0, (LP.model.userData.lamp || LP.dim[1] * .8) * PSC, 0)), ctr = V3(V.g.position.x, V.dim[1] * .5 + vt.position.y, V.g.position.z);
      const dist = Math.hypot(vp.x - lamp.x, vp.z - lamp.z), u = clamp((t - A.tFire) / (A.tLock - A.tFire), 0, 1);
      let tgt; if (t < A.tLock) { const from = V3(lamp.x, 0, lamp.z), d0 = vp.clone().sub(from).setY(0).normalize(), off = (1 - smooth(u)) * 1.5 * V.sinkRoll, dd = d0.applyAxisAngle(V3(0, 1, 0), off); tgt = from.addScaledVector(dd, dist * (.75 + .25 * u)).setY(.3); } else tgt = ctr;
      const on = clamp((t - A.tFire) / .3, 0, 1), out = clamp((t - A.tSink - .4) / .5, 0, 1), lock = clamp((t - A.tLock) / .6, 0, 1);
      if (LP.beam) { const want = Math.atan2(-(tgt.z - lamp.z), tgt.x - lamp.x) - LP.g.rotation.y; LP.beam.rotation.y += wrapA(want - LP.beam.rotation.y) * Math.min(1, dt * 10); }
      if (A.variant === "laser") { B.ray.material.color.set("#ff5a4a"); B.core.material.color.set("#fff0ea"); } else { B.ray.material.color.set("#fff2c0"); B.core.material.color.set("#ffffff"); }
      B.ray.visible = B.core.visible = on > 0 && out < 1;
      if (B.ray.visible) { const L = lamp.distanceTo(tgt), q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), tgt.clone().sub(lamp).normalize()), fl = 1 + .25 * Math.sin(t * 43) * lock, wd = (1 + lock * 1.3) * fl;
        [B.ray, B.core].forEach((m) => { m.position.copy(lamp); m.quaternion.copy(q); m.scale.set(wd, wd, L); }); B.ray.material.opacity = on * (1 - out) * (.55 + .45 * lock); B.core.material.opacity = lock * (1 - out) * .9;
        if (rand() < dt * 12) CS.fx.flash.emit(lamp, V3(0, 0, 0), 3 + lock * 3, .15);
        if (t < A.tLock && rand() < dt * 25) CS.fx.smoke.emit(tgt.clone().add(V3(rr(-.6, .6), 0, rr(-.6, .6))), V3(0, rr(.8, 1.6), 0), rr(.8, 1.4)); }
      if (lock > 0 && t < A.tSink) { alarm(1); if (!A.bsnd) { A.bsnd = 1; snd("hit", .8); } burn(10 + lock * 30); if (rand() < dt * 30) CS.fx.flash.emit(ctr.clone().add(V3(rr(-1, 1), rr(-1, 1), rr(-1, 1))), V3(0, rr(.5, 2), 0), rr(1.5, 3), .3); if (rand() < dt * 14) CS.fx.smoke.emit(V3(vp.x + rr(-2, 2), .4, vp.z + rr(-2, 2)), V3(0, rr(1.5, 3), 0), rr(1.5, 3)); }
      if (t > A.tSink && !A.boom) { A.boom = 1; CS.fx.flash.emit(ctr, V3(0, 0, 0), 12, .45); debris(ctr, 22, 8, 10); for (let j = 0; j < 36; j++) CS.fx.fire.emit(ctr.clone(), V3(rr(-5, 5), rr(1, 9), rr(-5, 5)), rr(1, 2.6), rr(.4, .9)); snd("boom", 1.2); splashAt(vp, true); }
      if (t > A.tSink) { const kk = clamp((t - A.tSink) / (A.tGone - A.tSink - .2), 0, 1);
        if (A.endMode === "b") { vt.scale.set(1 - kk * .5, 1, 1 + kk * .15); vt.rotation.set(-kk * .9, 0, V.sinkRoll * (kk * 1.5), "YXZ"); vt.position.y = -Math.pow(kk, 1.5) * (V.dim[1] + 3); if (rand() < dt * 5) debris(V.g.position.clone().setY(1), 2, 3, 4); }
        else { vt.scale.set(1 + kk * .18, Math.max(.04, 1 - kk * .95), 1 + kk * .18); vt.position.y = -kk * 2; vt.rotation.z = V.sinkRoll * kk * .4; }
        burn(20 * (1 - kk)); if (rand() < dt * 16) CS.fx.smoke.emit(V3(vp.x + rr(-1.5, 1.5), .5, vp.z + rr(-1.5, 1.5)), V3(rr(-.4, .4), rr(2, 4), rr(-.4, .4)), rr(2, 4)); bubbles(6); sinkOnce(); }
    } else if (st === "spout") {
      /* a királynő körül csillámló spirál – varázsol */
      const hur = A.variant === "hurricane", mag = A.variant === "magic";
      if (hur) { const cf = clamp((t - .2) / .9, 0, 1) * (1 - clamp((t - A.tGone + .6) / .6, 0, 1)); [B.cloud, B.cloud2].forEach((c, i) => { c.visible = cf > 0; c.position.set(vp.x + (i ? 5 : 0), 30 + i * 2.5, vp.z + (i ? -4 : 0)); c.rotation.y += dt * (i ? -1.4 : 1.1); c.material.opacity = (i ? .75 : .9) * cf; });
        B.rain.visible = cf > .2; B.rain.material.opacity = .6 * cf; if (B.rain.visible) { const a = B.rain.geometry.attributes.position.array; B.rainD.forEach((d, i) => { d[1] -= dt * 30; if (d[1] < 0) { d[1] += 30; d[0] = rr(-14, 14); d[2] = rr(-14, 14); } const sw = Math.sin(t * 2 + d[1] * .2) * 2.5; a.set([vp.x + d[0] + sw, d[1], vp.z + d[2], vp.x + d[0] + sw + 1.1, d[1] + 1.2, vp.z + d[2] + .4], i * 6); }); B.rain.geometry.attributes.position.needsUpdate = true; } }
      if (!hur && t > A.tFire && t < Math.min(A.tFall, A.tGone) && rand() < dt * (mag ? 55 : 30)) { const a = t * 6 + rand() * .5, r = 2.2, h = ((t * 4) % 1) * P.dim[1]; CS.fx.flash.emit(V3(A.ap.x + Math.cos(a) * r, h, A.ap.z + Math.sin(a) * r), V3(0, 1.5, 0), rr(.6, 1.2), .6); }
      const w = clamp((t - A.tFire) / 1.2, 0, 1), wout = clamp((t - A.tFall - .3) / .6, 0, 1);
      B.whirl.visible = w > 0 && wout < 1; B.whirl.position.set(vp.x, .32, vp.z); B.whirl.scale.setScalar(.5 + 7 * smooth(w) * (1 - wout)); B.whirl.rotation.y -= dt * (3 + 6 * w); B.whirl.material.opacity = .95 * w * (1 - wout);
      if (w > .3 && t < A.tFall && rand() < dt * 30) { const a = rand() * TAU, r = rr(2, 7); CS.fx.spray.emit(V3(vp.x + Math.cos(a) * r, .3, vp.z + Math.sin(a) * r), V3(-Math.sin(a) * 6, rr(1, 3), Math.cos(a) * 6), rr(.3, .7), .9); }
      const k = clamp((t - A.tFire - .8) / .9, 0, 1), out = clamp((t - A.tFall) / .6, 0, 1);
      B.spout.visible = k > 0 && out < 1; B.spout.position.set(vp.x, 0, vp.z); B.spout.scale.set(.3 + .8 * k, smooth(k) * (1 - out * .95) + .01, .3 + .8 * k); B.spout.rotation.y += dt * 6; B.spout.material.map.offset.y -= dt * 1.6; B.spout.material.opacity = .85 * k * (1 - out);
      if (k > 0 && t < A.tFall && rand() < dt * 45) { const a = rand() * TAU; CS.fx.spray.emit(V3(vp.x + Math.cos(a) * 3, .3, vp.z + Math.sin(a) * 3), V3(-Math.sin(a) * 5, rr(5, 11), Math.cos(a) * 5), rr(.4, .9), 1.2); }
      if (k > 0 && !A.wsnd) { A.wsnd = 1; snd("whoosh"); }
      if (t < A.tLift) alarm(w);
      const lift = clamp((t - A.tLift) / 1.5, 0, 1), fall = clamp((t - A.tFall) / .55, 0, 1);
      if (hur && t > A.tTear && !A.torn) { A.torn = 1; const c = V3(vp.x, vt.position.y + V.dim[1] * .5, vp.z); debris(c, 34, 12, 6); CS.fx.flash.emit(c, V3(0, 0, 0), 8, .3); for (let j = 0; j < 26; j++) CS.fx.spray.emit(c.clone(), V3(rr(-7, 7), rr(-2, 5), rr(-7, 7)), rr(.5, 1), 1.4); snd("hit", 1.2); snd("boom", .8); V.body.visible = false; }
      if (mag && t > A.tPoof) { const pk = clamp((t - A.tPoof) / .9, 0, 1); vt.scale.setScalar(Math.max(.01, 1 - pk)); V.yaw += dt * 20 * pk; if (rand() < dt * 90) { const a = rand() * TAU; CS.fx.flash.emit(V3(vp.x + Math.cos(a) * rr(.5, 3), vt.position.y + rr(0, V.dim[1]), vp.z + Math.sin(a) * rr(.5, 3)), V3(Math.cos(a) * 3, rr(1, 4), Math.sin(a) * 3), rr(.6, 1.6), .7); }
        if (pk >= 1 && !A.poofed) { A.poofed = 1; CS.fx.flash.emit(V3(vp.x, vt.position.y + 2, vp.z), V3(0, 0, 0), 14, .4); snd("whoosh", 1.1); V.body.visible = false; } }
      if (t > A.tLift && t < A.tFall + .55) { V.yaw += dt * (3 + lift * (hur ? 17 : 11)); vt.position.y = smooth(lift) * A.liftH * (1 - fall * fall); vt.rotation.set(Math.sin(t * 3) * .55 * lift, 0, Math.cos(t * 2.4) * .65 * lift, "YXZ"); }
      if (fall >= 1 && !A.splashed) { A.splashed = 1; geyser(vp, 14); splashAt(vp, true); debris(vp.clone().setY(.5), 22, 7, 8); snd("hit", 1.2); }
      if (t > A.tSink) { const kk = clamp((t - A.tSink) / (A.tGone - A.tSink - .1), 0, 1); vt.position.y = -2 - kk * (V.dim[1] + 3); vt.rotation.z = V.sinkRoll * (.6 + kk * .6); bubbles(14); sinkOnce(); }
    } else if (st === "storm") {
      const krk = A.variant === "kraken";
      { const mw = B.maw || (B.maw = (() => { const g = new THREE.Group(), skin = std({ color: "#3d2a52", roughness: .5 }), eye = basic({ color: "#ffd23f" }), pup = basic({ color: "#120a18" }), tooth = std({ color: "#f3ecd8", roughness: .4 });
          const head = new THREE.Mesh(new THREE.SphereGeometry(5.2, 28, 16, 0, TAU, 0, Math.PI * .56), skin); g.add(head);
          for (let i = 0; i < 9; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(.5, 2.2, 8), skin); const a = -1.2 + i * .3; sp.position.set(0, 5.1 * Math.cos(a * .55), 5.1 * Math.sin(a * .55) * -1); sp.rotation.x = -a * .55; g.add(sp); }
          [-1, 1].forEach((sd) => { const e = new THREE.Mesh(new THREE.SphereGeometry(.85, 14, 10), eye); e.position.set(sd * 2.5, 3.1, 3.4); g.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(.42, 10, 8), pup); p.position.set(sd * 2.62, 3.15, 4.08); p.scale.set(.5, 1.2, 1); g.add(p); });
          for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI - Math.PI / 2, th = new THREE.Mesh(new THREE.ConeGeometry(.3, 1.3, 6), tooth); th.position.set(Math.sin(a) * 4.4, .7, Math.cos(a) * 4.4); th.rotation.x = Math.PI; g.add(th); }
          g.visible = false; CS.env.add(g); return g; })());
        if (krk) { const up = clamp((t - A.tSink + .5) / 1.0, 0, 1), dn = clamp((t - A.tSink - 1.2) / (A.tGone - A.tSink - 1.4), 0, 1); mw.visible = up > 0 && t < A.tGone + .2; mw.position.set(vp.x, -6.2 + smooth(up) * 4.6 - Math.pow(dn, 1.3) * 7, vp.z); mw.rotation.set(-.35 + Math.sin(t * 2.4) * .08 - dn * .5, yawOf(dir) + Math.PI + Math.sin(t * 1.3) * .2, Math.sin(t * 3.1) * .06); if (up > 0 && up < 1 && rand() < dt * 40) { const a = rand() * TAU; CS.fx.spray.emit(V3(vp.x + Math.cos(a) * 5, .3, vp.z + Math.sin(a) * 5), V3(Math.cos(a) * 4, rr(3, 8), Math.sin(a) * 4), rr(.5, 1), 1.2); } } else mw.visible = false; }
      const cf = krk ? 0 : clamp((t - A.tFire) / .9, 0, 1) * (1 - clamp((t - A.tGone + .6) / .6, 0, 1));
      [B.cloud, B.cloud2].forEach((c, i) => { c.visible = cf > 0; c.position.set(vp.x + (i ? 6 : 0), 32 + i * 2.5, vp.z + (i ? -4 : 0)); c.rotation.y += dt * (i ? -.25 : .18); c.material.opacity = (i ? .7 : .85) * cf; });
      /* eső */
      const rain = krk ? 0 : clamp((t - A.tFire - .5) / .6, 0, 1) * (1 - clamp((t - A.tGone + .8) / .6, 0, 1)); B.rain.visible = rain > 0; B.rain.material.opacity = .55 * rain;
      if (B.rain.visible) { const a = B.rain.geometry.attributes.position.array; B.rainD.forEach((d, i) => { d[1] -= dt * 28; if (d[1] < 0) { d[1] += 30; d[0] = rr(-14, 14); d[2] = rr(-14, 14); if (rand() < .25) CS.fx.rings.emit(vp.x + d[0], vp.z + d[2], .5, .6); }
        a.set([vp.x + d[0], d[1], vp.z + d[2], vp.x + d[0] + .25, d[1] + 1.3, vp.z + d[2] + .1], i * 6); }); B.rain.geometry.attributes.position.needsUpdate = true; }
      if ((krk ? t > .3 : t > A.tFire) && t < A.tSink) alarm(1);
      if (A.si < A.strikes.length && t > A.strikes[A.si]) { A.si++; A.boltT = .18; A.burn = 1; const top = V3(vp.x + rr(-5, 5), 32, vp.z + rr(-5, 5)), end = vp.clone().add(V3(rr(-.6, .6), V.dim[1] * rr(.5, .85), rr(-.6, .6)));
        setGeo(B.bolt, boltGeo(top, end, 14, 2.4, .12)); setGeo(B.boltG, boltGeo(top, end, 10, 3.2, .5)); CS.fx.flash.emit(end, V3(0, 0, 0), 9, .3); CS.fx.flash.emit(top, V3(0, 0, 0), 16, .25); snd("boom", 1); V.kick = 1;
        for (let j = 0; j < 14; j++) CS.fx.fire.emit(end.clone(), V3(rr(-5, 5), rr(0, 6), rr(-5, 5)), rr(.4, 1), rr(.3, .6)); if (A.si >= 3) debris(end, 5, 5, 6); }
      if (A.boltT > 0) { A.boltT -= dt; B.bolt.visible = B.boltG.visible = (A.boltT * 30 | 0) % 2 === 0; } else B.bolt.visible = B.boltG.visible = false;
      V.kick = (V.kick || 0) * (1 - Math.min(1, dt * 4)); if (A.burn) burn(14);
      /* a kraken: hat csáp kinyúlik, körbefonja, és a mélybe húzza; alatta örvény */
      const kt = clamp((t - A.tSink + .4) / 1.1, 0, 1), down = clamp((t - A.tSink - 1.0) / (A.tGone - A.tSink - 1.2), 0, 1);
      B.tent.forEach((m, i) => { const a = i / B.tent.length * TAU + .4, base = V3(vp.x + Math.cos(a) * 5, 0, vp.z + Math.sin(a) * 5), top = V3(vp.x + Math.cos(a + 1.2) * 1.0, V.dim[1] * (.8 - down * .95) + 1.5 + Math.sin(t * 3 + i) * .4, vp.z + Math.sin(a + 1.2) * 1.0);
        m.visible = kt > 0 && t < A.tGone + .2; if (m.visible) setGeo(m, tentGeo(base, top, 3.2 + i * .35, .12 + .88 * smooth(clamp(kt * 1.3 - i * .06, 0, 1)), a + t * 1.5)); });
      B.whirl.visible = down > 0; if (down > 0) { B.whirl.position.set(vp.x, .32, vp.z); B.whirl.scale.setScalar(2 + 5 * down); B.whirl.rotation.y -= dt * 7; B.whirl.material.opacity = .9 * Math.min(1, down * 3) * (1 - clamp((t - A.tGone + .3) / .3, 0, 1)); }
      if (kt > 0 && !A.ksnd) { A.ksnd = 1; geyser(vp, 9); snd("hit", .9); }
      if (t < A.tSink) vt.rotation.z = V.sinkRoll * V.kick * .25 + Math.sin(t * 11) * .07;
      if (down > 0) { V.yaw += dt * 2.5; vt.position.y = -Math.pow(down, 1.4) * (V.dim[1] + 4); vt.rotation.z = Math.sin(t * 7) * .22; bubbles(16); sinkOnce(); }
    }
    if (V.g.parent) V.g.rotation.y = V.yaw;
    if (t > A.tGone && V.g.parent) dropPiece(V);
  }
  /* a mozgatás után: a hattyú repülési pályája (felszállás – körözés – zuhanórepülés) */
  function battlePost(A, dt) {
    if (A.style !== "dive") return;
    const M = A.movers[0], P = A.P, k = (A.t - A.tSail) / M.dur; if (k <= 0 || k >= 1 || M.done) return;
    const H = A.leapH, nrm = V3(-A.dir.z, 0, A.dir.x);
    let hz, y, lean;
    if (k < .6) { const u = k / .6; hz = .5 * smooth(u); y = H * Math.sin(u * Math.PI / 2); lean = -.35 * (1 - u); }
    else if (k < .78) { const u = (k - .6) / .18; hz = .5 + .06 * u; y = H + Math.sin(u * Math.PI) * 1.2; lean = .1 * u; }
    else { const u = (k - .78) / .22; hz = .56 + .44 * Math.pow(u, 1.25); y = H * (1 - u * u); lean = .25 + .6 * u; }
    const circ = k > .5 && k < .82 ? Math.sin((k - .5) / .32 * Math.PI) * 3.5 : 0;
    const p = A.ap.clone().lerp(A.vp, hz).addScaledVector(nrm, circ);
    P.g.position.set(p.x, y, p.z);
    const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), lx = A.dir.x * cy - A.dir.z * sy, lz = A.dir.x * sy + A.dir.z * cy;
    P.pitch = lz * lean; P.heel = -lx * lean + circ * .06;   /* körözés közben bedől */
    if (rand() < dt * 8) CS.fx.spray.emit(p.clone().add(V3(rr(-1, 1), y + rr(0, 2), rr(-1, 1))), V3(rr(-.4, .4), -rr(.5, 1.5), rr(-.4, .4)), rr(.25, .45), 1.4);
    if (k > .78 && !A.dsnd) { A.dsnd = 1; snd("whoosh", 1.2); }
  }
  function battleEnd() {
    const B = CS.bfx; if (!B) return;
    B.whirl.visible = B.ray.visible = B.core.visible = B.spout.visible = B.bolt.visible = B.boltG.visible = B.cloud.visible = B.cloud2.visible = B.rain.visible = false; B.tent.forEach((m) => { m.visible = false; }); if (B.maw) B.maw.visible = false;
  }

  /* ------------------------------------------------------------ CSATAKAMERA: a kép a csata közelébe repül, majd vissza.
     2D-ben sima (1,3 s) repülés; VR-ben elsötétülés közben ugrik (nem szédít). Kikapcsolható („🎬 Csatakamera”). */
  function cineOn() { if (CS.cineOff == null) { try { CS.cineOff = localStorage.getItem("zephyr-sakk-kamera") === "0"; } catch (e) { CS.cineOff = false; } } return !CS.cineOff; }
  function toggleCine() { cineOn(); CS.cineOff = !CS.cineOff; try { localStorage.setItem("zephyr-sakk-kamera", CS.cineOff ? "0" : "1"); } catch (e) {} W.panelDirty = 1; }
  /* stílusonként: [távolság, magasság, a nézett pont magassága] */
  const CINE = { ram: [12, 4.5, 2], dive: [22, 5, 9], broadside: [16, 5, 2.5], beam: [17, 6, 3.5], spout: [20, 4, 8], storm: [21, 5, 6] };
  function cineStart(A) {
    if (!cineOn() || CS.orbit || CS.fade || !W.root || !CS.env) return;
    if (CS.cine) { CS.cine.A = A; CS.cine.ph = "hold"; return; }   /* gyors egymásutánban: marad közel */
    const root = W.root, hw = headWorld(new THREE.Vector3()), eye = CS.env.worldToLocal(hw.clone()), [D, H, fy] = CINE[A.style];
    /* oldalnézet: a kamera a támadás vonalára merőlegesen, a néző felőli oldalon, kicsit a támadó mögött áll –
       így mindkét figura látszik, és semmi (golyó, fénysugár, füst) nem repül a kamerába */
    const span = Math.hypot(A.vp.x - A.ap.x, A.vp.z - A.ap.z), F = A.vp.clone().multiplyScalar(.62).add(A.ap.clone().multiplyScalar(.38)); F.y = fy;
    const Dd = Math.max(D, span * .62);
    if (Math.hypot(eye.x - F.x, eye.z - F.z) < Dd * 1.1) return;   /* már közel vagy: nem kell */
    const nrm = V3(-A.dir.z, 0, A.dir.x); if (nrm.x * (eye.x - F.x) + nrm.z * (eye.z - F.z) < 0) nrm.negate();
    const away = nrm.clone().addScaledVector(A.dir, -.38).normalize();
    const p = F.clone().addScaledVector(away, Dd); p.y = H;
    const psi = T.camYaw ? T.camYaw() : 0, envYaw = Math.atan2(p.x - F.x, p.z - F.z), r = psi - envYaw, q = p.clone().applyAxisAngle(V3(0, 1, 0), r), vr = !!T.inVR, lift = inVRSeat() ? .45 : 0;
    const C = { A, t: 0, ph: "in", vr, r0: root.rotation.y, p0: root.position.clone() };
    C.r1 = C.r0 + wrapA(r - C.r0); C.p1 = V3(-q.x + (vr ? hw.x : 0), vr ? -p.y - lift : -(p.y + 1.62), -q.z + (vr ? hw.z : 0));
    const lc = !vr && T.cam.components["look-controls"]; if (lc && lc.pitchObject) { C.lc = lc; C.pitch0 = lc.pitchObject.rotation.x; C.pitch1 = -Math.atan2(H + 1.62 - fy, Dd); }
    CS.cine = C;
    if (vr) CS.fade = { t: 0, run: () => cineSet(C, 1), done: false };
  }
  function cineSet(C, s) {
    const root = W.root; if (!root) return;
    root.rotation.set(0, C.r0 + (C.r1 - C.r0) * s, 0); root.position.lerpVectors(C.p0, C.p1, s); root.updateMatrixWorld(true);
    if (C.lc && C.pitch0 != null) C.lc.pitchObject.rotation.x = C.pitch0 + (C.pitch1 - C.pitch0) * s;
  }
  function cineTick(dt) {
    const C = CS.cine; if (!C) return; C.t += dt;
    if (C.ph === "in") { if (!C.vr) cineSet(C, smooth(clamp(C.t / 1.3, 0, 1))); if (C.t >= 1.3) C.ph = "hold"; }
    const A = C.A, over = CS.anim !== A || A.t > A.tGone + .4;
    if (C.ph === "hold" && over) { C.ph = "out"; C.t0 = C.t; if (C.vr) CS.fade = { t: 0, run: () => cineSet(C, 0), done: false }; }
    if (C.ph === "out") { const k = (C.t - C.t0) / 1.5; if (!C.vr) cineSet(C, 1 - smooth(clamp(k, 0, 1))); if (k >= 1) CS.cine = null; }
  }

  /* ------------------------------------------------------------ A TÁBLA DÍSZEI (a víz árnyalójába festve): arany rácsvonalak, szegecsek a
     metszéspontokon, középen arany szélrózsa, körben tengerkék zománcsáv hullámmintával és dupla arany szegéllyel, sarkokban horgony */
  const BF = BH + 1.5;
  function boardTex() {
    const N = 2048, k = N / (2 * BF), X = (x) => (x + BF) * k;
    const t = canvasTex(N, N, (g) => {
      g.clearRect(0, 0, N, N);
      const gold = "rgba(236,196,104,1)";
      /* zománcsáv a tábla körül */
      g.fillStyle = "rgba(16,38,92,.93)"; g.fillRect(0, 0, N, N); g.clearRect(X(-BH), X(-BH), 2 * BH * k, 2 * BH * k);
      g.strokeStyle = gold; g.lineWidth = .14 * k; g.strokeRect(X(-BF + .18), X(-BF + .18), (2 * BF - .36) * k, (2 * BF - .36) * k); g.lineWidth = .1 * k; g.strokeRect(X(-BH - .2), X(-BH - .2), (2 * BH + .4) * k, (2 * BH + .4) * k);
      /* hullámminta a sávban */
      g.lineWidth = .07 * k; const wv = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.round(L / 1.5), ux = (x1 - x0) / L, uy = (y1 - y0) / L; g.beginPath(); for (let i = 0; i <= n * 8; i++) { const s2 = i / 8 * 1.5, w = Math.sin(i / 8 * TAU) * .28; g.lineTo(X(x0 + ux * s2 - uy * w), X(y0 + uy * s2 + ux * w)); } g.stroke(); };
      const m = BH + .75; wv(-m, -m, m, -m); wv(m, -m, m, m); wv(m, m, -m, m); wv(-m, m, -m, -m);
      /* arany rácsvonalak */
      g.strokeStyle = gold; g.lineWidth = .16 * k; for (let i = 0; i <= 8; i++) { const c = -BH + i * SQ; g.beginPath(); g.moveTo(X(c), X(-BH)); g.lineTo(X(c), X(BH)); g.moveTo(X(-BH), X(c)); g.lineTo(X(BH), X(c)); g.stroke(); }
      g.lineWidth = .05 * k; g.strokeStyle = "rgba(236,196,104,.75)"; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const x = -BH + i * SQ, z = -BH + j * SQ; g.strokeRect(X(x + .45), X(z + .45), (SQ - .9) * k, (SQ - .9) * k); }
      /* szegecsek */
      g.fillStyle = gold; for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) { g.beginPath(); g.arc(X(-BH + i * SQ), X(-BH + j * SQ), .32 * k, 0, TAU); g.fill(); }
      /* szélrózsa középen */
      g.save(); g.translate(X(0), X(0)); const R = 15 * k;
      g.globalAlpha = .55; g.strokeStyle = gold; g.lineWidth = .12 * k; [R, R * .82, R * .3].forEach((r) => { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); });
      for (let i = 0; i < 32; i++) { g.save(); g.rotate(i / 32 * TAU); g.beginPath(); g.moveTo(0, -R); g.lineTo(0, -R * (i % 4 ? .9 : .84)); g.stroke(); g.restore(); }
      const star = (n, r1, r2, a0, fill) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = a0 + i / (n * 2) * TAU, r = i % 2 ? r2 : r1; g.lineTo(Math.sin(a) * r, -Math.cos(a) * r); } g.closePath(); g.fillStyle = fill; g.fill(); g.stroke(); };
      g.globalAlpha = .38; star(8, R * .72, R * .2, Math.PI / 8, "rgba(236,196,104,.5)"); g.globalAlpha = .55; star(4, R * .95, R * .16, 0, "rgba(236,196,104,.75)");
      g.globalAlpha = .7; g.fillStyle = gold; g.font = `bold ${2.2 * k}px Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle"; [["É", 0], ["K", 1], ["D", 2], ["Ny", 3]].forEach(([l, i]) => { g.save(); g.rotate(i * Math.PI / 2); g.fillText(l, 0, -R * 1.1); g.restore(); });
      g.restore(); g.globalAlpha = 1;
      /* horgonyok a sarkokban (a zománcsávon) */
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { g.save(); g.translate(X(sx * (BH + .75)), X(sz * (BH + .75))); g.fillStyle = gold; g.beginPath(); g.arc(0, 0, .62 * k, 0, TAU); g.fill(); g.fillStyle = "rgba(16,38,92,1)"; g.font = `bold ${.9 * k}px serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("⚓", 0, .05 * k); g.restore(); });
    });
    t.flipY = false; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
    return t;
  }
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
  /* =====================================================================================================
     2026-11-11 04:37 TULAJDONOS: „A bábukat ne tervezd újra, csak a kidolgozottság legyen magasabb szintű.”
     A meglévő figurák MARADNAK – erre a rétegre kerülnek a finom részletek: korlátok, hajóablakok, palánkvonalak, lámpások,
     legénység, ágyúk, kormánykerék, kötéllétrák, ékszerek, kitüntetések, kard, tollforgó, szélkakas, sirály stb.
     Kikapcsolás (összehasonlításhoz): localStorage zephyr-sakk-finom = 0.
     ===================================================================================================== */
  function zFine(L, kind, c, B, I) {
    try { if (localStorage.getItem("zephyr-sakk-finom") === "0") return; } catch (e) {}
    if (W.lod && kind === "pawn") return;   /* telefonon a 16 gyalog marad az egyszerűbb (hűvösebb) változat; a tisztek megkapják a részleteket */
    const P = ZC[c], CYL = (r0, r1, h, s) => new THREE.CylinderGeometry(r0, r1, h, s || 8), BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d), TOR = (R, r, a, b, arc) => new THREE.TorusGeometry(R, r, a || 6, b || 16, arc || TAU);
    const rail = (u0, u1, n, h, sc) => [-1, 1].forEach((sd) => { const pts = []; for (let k = 0; k <= n; k++) { const u = u0 + (u1 - u0) * k / n, x = sd * B.w(u) * (sc || .9), y = B.ys(u), z = B.z(u); L.push([CYL(h * .05, h * .06, h, 5), "g", M4(x, y + h / 2, z)], [ZS(h * .1, 6, 5), "g", M4(x, y + h, z)]); pts.push(V3(x, y + h, z)); } L.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 4, h * .04, 5, false), "g"]); });
    const ports = (f, us, r) => [-1, 1].forEach((sd) => us.forEach((u) => { const p = B.at(u, f); L.push([TOR(r, r * .28, 6, 14), "g", M4(sd * p[0] * 1.02, p[1], p[2], Math.PI / 2)], [CYL(r * .8, r * .8, .2, 10).rotateZ(Math.PI / 2), "l", M4(sd * p[0] * 1.015, p[1], p[2]), "#ffe4a0"]); }));
    const seams = (y, xs, len, z0) => xs.forEach((x) => L.push([BOX(.12, .07, len * (1 - Math.abs(x) / (B.B * .62))), "m", M4(x, y + .05, z0 || 0), c === "w" ? "#cdbb93" : "#0c2a47"]));
    const lantern = (x, y, z, s) => L.push([CYL(s * .12, s * .12, s * 1.6, 5), "g", M4(x, y + s * .8, z)], [ZS(s * .52, 10, 8), "l", M4(x, y + s * 2, z), ZC.glow], [TOR(s * .5, s * .1, 5, 12).rotateX(Math.PI / 2), "g", M4(x, y + s * 1.62, z)], [new THREE.ConeGeometry(s * .56, s * .7, 8), "g", M4(x, y + s * 2.75, z)]);
    const sailor = (x, y, z, s, col, ry) => { L.push([CYL(s * .5, s * .62, s * 1.7, 8), "s", M4(x, y + s * .85, z), "#22314a"], [CYL(s * .58, s * .52, s * 1.5, 8), "s", M4(x, y + s * 2.4, z), col], [ZS(s * .5, 10, 8), "m", M4(x, y + s * 3.6, z), ZC.skin], [CYL(s * .56, s * .56, s * .22, 10), "s", M4(x, y + s * 4.05, z), "#ffffff"], [CYL(s * .34, s * .4, s * .36, 10), "s", M4(x, y + s * 4.3, z), "#ffffff"]);
      [-1, 1].forEach((sd) => L.push([CYL(s * .17, s * .15, s * 1.3, 6), "s", M4(x + sd * s * .72 * Math.cos(ry || 0), y + s * 2.35, z + sd * s * .72 * Math.sin(ry || 0), 0, 0, sd * .25), col])); };
    const barrel = (x, y, z, s) => L.push([CYL(s * .8, s * .8, s * 1.9, 10), "m", M4(x, y + s * .95, z), "#7a4a22"], [CYL(s * .92, s * .92, s * 1.1, 10), "m", M4(x, y + s * .95, z), "#84522a"], [TOR(s * .9, s * .09, 5, 14).rotateX(Math.PI / 2), "g", M4(x, y + s * .45, z)], [TOR(s * .9, s * .09, 5, 14).rotateX(Math.PI / 2), "g", M4(x, y + s * 1.45, z)]);
    const wheel = (x, y, z, R) => { L.push([TOR(R, R * .09, 6, 24), "g", M4(x, y, z)], [TOR(R * .34, R * .08, 5, 12), "g", M4(x, y, z)], [BOX(R * .35, y * 0 + R * 1.5, R * .3), "m", M4(x, y - R * 1.1, z + R * .25), "#6a4424"]); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; L.push([CYL(R * .05, R * .05, R * 2.5, 5), "g", M4(x, y, z, 0, 0, a)]); } };
    if (kind === "pawn") {
      seams(7.2, [-4.5, -2.25, 0, 2.25, 4.5], 27);
      L.push([BOX(5.4, 2.5, 7), "e", M4(0, 8.45, 5.2), P.hull], [BOX(6, .4, 7.6), "g", M4(0, 9.9, 5.2)], [BOX(2, 1.9, .2), "e", M4(0, 8.3, 1.6), P.accent], [ZS(.2, 6, 5), "g", M4(.6, 8.3, 1.45)]);
      [-1, 1].forEach((sd) => { [3.6, 6.8].forEach((z) => L.push([TOR(.55, .16, 5, 12), "g", M4(sd * 2.72, 8.7, z, Math.PI / 2)], [CYL(.45, .45, .15, 8).rotateZ(Math.PI / 2), "l", M4(sd * 2.7, 8.7, z), "#ffe4a0"])); });
      L.push([TOR(1.05, .34, 6, 14), "e", M4(0, 10.3, 5.2, 0, Math.PI / 2), "#d8262c"]); [0, 1, 2, 3].forEach((k) => L.push([BOX(.5, .72, .5), "e", M4(Math.cos(k * Math.PI / 2 + .8) * 1.05, 10.3, 5.2 + Math.sin(k * Math.PI / 2 + .8) * 1.05), "#ffffff"]));
      rail(.06, .5, 6, 1.7, .9); lantern(0, B.ys(.03), B.z(.03) - 1, .75);
      barrel(2.6, 7.2, -8.5, .85); L.push([TOR(.9, .26, 5, 12).rotateX(Math.PI / 2), "m", M4(-2.6, 7.5, -8.8), "#d9c59a"], [TOR(.6, .24, 5, 10).rotateX(Math.PI / 2), "m", M4(-2.6, 7.95, -8.8), "#d9c59a"]);
      sailor(1.2, 7.2, 11.2, .95, c === "w" ? "#c8322c" : "#e9e2d3", 0);
      rigLines([[V3(0, 30, -2.5), V3(-7.4, 8.4, 3.5)], [V3(0, 30, -2.5), V3(7.4, 8.4, 3.5)]], I, ZC.gold2);
    } else if (kind === "bishop") {
      seams(12.2, [-6, -3, 0, 3, 6], 30, -1); rail(.3, .66, 7, 2, .93);
      [-1, 1].forEach((sd) => { for (let k = 0; k < 6; k++) { const u = .2 + k * .11, p = B.at(u, .3); L.push([CYL(.34, .42, 2.8, 8).rotateZ(Math.PI / 2), "s", M4(sd * (p[0] * 1.02 + 1.1), p[1], p[2]), "#1b1e24"], [TOR(.42, .1, 5, 10), "g", M4(sd * (p[0] * 1.02 + 2.45), p[1], p[2], Math.PI / 2)]); } });
      wheel(0, 21.6, 13.4, 1.6); [-1, 1].forEach((sd) => lantern(sd * 6.6, 21.4, 20.2, 1.05)); lantern(0, 21.4, 20.6, 1.35);
      [[-9, 64, .86], [0, 76, 1], [10, 60, .76]].forEach(([mz, top, s]) => { const y = 12 + (top - 12) * .52 + .6; L.push([TOR(1.9 * s, .13, 5, 18).rotateX(Math.PI / 2), "g", M4(0, y + 1.6, mz)]); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; L.push([CYL(.08, .08, 1.6, 4), "g", M4(Math.sin(a) * 1.9 * s, y + .8, mz + Math.cos(a) * 1.9 * s)]); } });
      sailor(0, 12 + 64 * .52 + .6, 0, .62, c === "w" ? "#c8322c" : "#e9e2d3", 0); sailor(0, 19.5, 15.6, .85, c === "w" ? "#173F68" : "#e9e2d3", 0); sailor(-2.5, 16, -15, .8, c === "w" ? "#c8322c" : "#e9e2d3", 0);
      L.push([ZS(1, 12, 8), "e", ZE(0, 13.6, 5, 1.5, .9, 3.6), "#fff9ed"], [TOR(1, .12, 5, 20).rotateX(Math.PI / 2), "g", ZE(0, 14, 5, 1.5, 1, 3.6)], [BOX(4.4, .3, 4.4), "m", M4(0, 12.4, -4.6), "#6a4424"], [BOX(4.9, .22, .4), "g", M4(0, 12.6, -2.4)], [BOX(4.9, .22, .4), "g", M4(0, 12.6, -6.8)]);
      for (let k = 0; k < 5; k++) L.push([BOX(.14, .1, 4.2), "g", M4(-1.8 + k * .9, 12.6, -4.6)]);
      barrel(-4.6, 12.2, 8.4, .9); barrel(-3, 12.2, 9.2, .9); barrel(4.4, 12.2, 8.8, .9);
      L.push([new THREE.SphereGeometry(.8, 10, 8, 0, TAU, 0, Math.PI / 2), "g", M4(0, 17.3, -12.4)], [BOX(.2, 2, .2), "g", M4(-.9, 16.8, -12.4)], [BOX(.2, 2, .2), "g", M4(.9, 16.8, -12.4)], [BOX(2.2, .2, .2), "g", M4(0, 17.9, -12.4)]);
      ports(.62, [.34, .46, .58], .6);
      const rg = []; [[0, 70, 0, 10, 13, 1, 4.2], [-9, 58, -9, 9.6, 13, -8, 3.4], [10, 54, 10, 8.4, 13, 10, 3]].forEach(([mz0, ty, mz, bx, by, bz, off]) => [-1, 1].forEach((sd) => { const A0 = V3(0, ty, mz), B0 = V3(sd * bx, by, bz), B1 = V3(sd * bx, by, bz + off); rg.push([A0, B1]); for (let k = 1; k < 9; k++) { const t = k / 9 * .82 + .12; rg.push([A0.clone().lerp(B0, t), A0.clone().lerp(B1, t)]); } }));
      rigLines(rg, I, ZC.gold2);
    } else if (kind === "rook") {
      const rT = (y) => 6.4 - (y - 8) / 38 * 1.7;
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; L.push([BOX(.5, 1.7, 1.5), "g", M4(Math.sin(a) * (rT(45) + .7), 44.7, Math.cos(a) * (rT(45) + .7), a)]); }
      [[23, -1], [35, -1], [29, 1], [41, 1]].forEach(([y, s]) => { L.push([TOR(.95, .16, 5, 12, Math.PI), "g", M4(0, y + 1.3, s * (rT(y) + .12), s > 0 ? Math.PI : 0)]); [-1, 1].forEach((sd) => L.push([BOX(.55, 2.6, .22), "e", M4(sd * 1.15, y, s * (rT(y) + .12)), P.roof])); });
      L.push([ZS(.28, 8, 6), "g", M4(.95, 11, -rT(11) - .4)], [BOX(2.6, .14, .1), "g", M4(0, 12.2, -rT(12) - .38)], [BOX(2.6, .14, .1), "g", M4(0, 9.8, -rT(10) - .38)], [BOX(.14, 5, .1), "g", M4(0, 11.2, -rT(11) - .38)]);
      for (let k = 0; k < 3; k++) L.push([BOX(5.2 - k * .7, .5, 1.6 - k * .35), "m", M4(0, 8.25 + k * .5, -rT(8) - 1.5 + k * .3), "#b9ab93"]);
      L.push([TOR(1.2, .36, 6, 14), "e", M4(4.3, 12.2, -rT(12.2) + 1.25, -.72), "#d8262c"]);
      [-1, 1].forEach((sd) => { const [g, m] = rodGeom(V3(sd * .8, 8, rT(8) + .45), V3(sd * .8, 45.4, rT(45.4) + .45), .13, 6); L.push([g, "g", m]); }); for (let k = 0; k < 24; k++) { const y = 9 + k * 1.55; L.push([BOX(1.6, .14, .14), "g", M4(0, y, rT(y) + .45)]); }
      [48.6, 50.3, 52].forEach((y) => L.push([TOR(3.76, .12, 5, 28).rotateX(Math.PI / 2), "g", M4(0, y, 0)])); L.push([CYL(.9, 1.3, 3.2, 10), "l", M4(0, 50.3, 0), "#fff3c4"]);
      L.push([CYL(.1, .1, 4.6, 5), "g", M4(0, 62.6, 0)], [BOX(4.2, .16, .16), "g", M4(0, 62.2, 0)], [BOX(.16, .16, 4.2), "g", M4(0, 62.2, 0)], [new THREE.ConeGeometry(.5, 1.4, 4).rotateX(-Math.PI / 2), "g", M4(0, 64.4, -2)], [BOX(.12, .9, 1.4), "g", M4(0, 64.4, 1.6)], [BOX(.12, .12, 3.6), "g", M4(0, 64.4, 0)]);
      ["É", "D"].forEach((_, k) => L.push([ZS(.26, 6, 5), "g", M4(0, 62.2, k ? 2.3 : -2.3)])); [-2.3, 2.3].forEach((x) => L.push([ZS(.26, 6, 5), "g", M4(x, 62.2, 0)]));
      { const gx = 4.6, gy = 49.75, gz = -4.7; L.push([ZS(1, 10, 8), "s", ZE(gx, gy + .6, gz, .55, .5, .95), "#ffffff"], [ZS(.36, 8, 6), "s", M4(gx, gy + 1.15, gz - .75), "#ffffff"], [new THREE.ConeGeometry(.12, .5, 5).rotateX(-Math.PI / 2), "e", M4(gx, gy + 1.1, gz - 1.25), "#e8a21c"], [ZS(1, 8, 6), "s", ZE(gx, gy + .7, gz + .5, .5, .16, .8), "#9aa3ad"], [CYL(.04, .04, .5, 4), "e", M4(gx - .15, gy + .1, gz), "#e8a21c"], [CYL(.04, .04, .5, 4), "e", M4(gx + .15, gy + .1, gz), "#e8a21c"]); }
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; L.push([CYL(.42, .5, 1.5, 8), "s", M4(Math.sin(a) * 11.2, 8.7, Math.cos(a) * 11.2), "#2b2f36"], [ZS(.5, 8, 6), "g", M4(Math.sin(a) * 11.2, 9.6, Math.cos(a) * 11.2)]); }
    } else if (kind === "knight") {
      L.push([TOR(3.75, .5, 6, 22), "g", M4(0, 20.6, -11.3, 0, 1.05)], [ZS(.85, 10, 8), "e", M4(0, 19.2, -14.4), "#c21f3a"], [TOR(.95, .2, 5, 12), "g", M4(0, 19.2, -14.5, 0, .5)]);
      for (let k = 0; k < 9; k++) { const a = (k - 4) * .2; L.push([ZS(.3, 6, 5), "e", M4(Math.sin(a) * 3.9, 21.6 - Math.cos(a) * .2, -11.9 - Math.cos(a) * 2.2), "#fff9ed"]); }
      L.push([TOR(1.35, .2, 5, 16).rotateX(Math.PI / 2), "g", M4(0, 64.5, -8.6)]); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; L.push([new THREE.ConeGeometry(.3, 1.3, 5), "g", M4(Math.sin(a) * 1.35, 65.2, -8.6 + Math.cos(a) * 1.35)], [ZS(.2, 6, 5), "e", M4(Math.sin(a) * 1.35, 65.95, -8.6 + Math.cos(a) * 1.35), k % 2 ? "#1f6fd1" : "#c21f3a"]); }
      [-1, 1].forEach((sd) => L.push([ZS(.15, 6, 5), "e", M4(sd * 1.95, 63.3, -10.15), "#ffffff"]));
      { const cc = V3(0, 16.5, -7.8), rr = [5.2, 5.6, 5]; for (let r = 0; r < 5; r++) for (let k = -3; k <= 3; k++) { const ax = k * .24 + (r % 2) * .12, ay = -.45 + r * .26, d = V3(Math.sin(ax) * Math.cos(ay), Math.sin(ay), -Math.cos(ax) * Math.cos(ay)), pos = V3(cc.x + d.x * rr[0] * 1.01, cc.y + d.y * rr[1] * 1.01, cc.z + d.z * rr[2] * 1.01), q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), d);
          L.push([ZS(1, 8, 6), "s", new THREE.Matrix4().compose(pos, q, V3(.75, .95, .22)), (r + k) % 2 ? P.wing : P.swan]); } }
      L.push([ZT([V3(0, 19, -14.6), V3(0, 13, -16.6), V3(0, 11.4, -16.4)], .16, 16), "g"]);
      rail(.1, .42, 4, 1.5, .9); lantern(0, B.ys(.02), B.z(.02) - 1.2, .8);
    } else if (kind === "queen") {
      const yW = 42, hy = yW + 23.8, prof = [[13, 13.4], [12, 18], [9.4, 26], [6.4, 35], [4.75, yW]];
      for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; L.push([ZT(prof.map(([r, y], k) => V3(Math.cos(a + k * .06) * (r + .12), y, Math.sin(a + k * .06) * (r + .12))), .15, 14), "g"]); }
      [19.5, 31].forEach((y, k) => { const r = k ? 7.75 : 11.45; L.push([TOR(r, .2, 5, 48).rotateX(Math.PI / 2), "g", M4(0, y, 0)]); });
      for (let i = 0; i < 9; i++) { const a = (i + .25) / 9 * TAU; L.push([ZS(.55, 8, 6), "e", M4(Math.cos(a) * 12.6, 16.9, Math.sin(a) * 12.6), i % 2 ? "#1f6fd1" : "#c21f3a"], [TOR(.62, .13, 5, 10), "g", M4(Math.cos(a) * 12.65, 16.9, Math.sin(a) * 12.65, -a + Math.PI / 2)]); }
      for (let k = 0; k < 13; k++) { const a = (k - 6) * .2; L.push([ZS(.3, 6, 5), "e", M4(Math.sin(a) * 2.5, yW + 15.5 - Math.cos(a) * .5, -Math.cos(a) * 2.4), "#fffaf0"]); } L.push([ZS(.5, 8, 6), "e", M4(0, yW + 14.5, -2.7), "#1f6fd1"]);
      [-1, 1].forEach((sd) => L.push([ZS(.32, 6, 5), "g", M4(sd * 4.15, hy - 1.6, .2)], [ZS(.28, 6, 5), "e", M4(sd * 4.15, hy - 2.5, .2), "#c21f3a"]));
      L.push([TOR(1.12, .22, 5, 12), "g", M4(4.4, yW + 2.4, -5.9, 0, .9)], [TOR(1.12, .22, 5, 12), "g", M4(-6.9, yW + .2, -4.2, 0, 1.1)]);
      { const a0 = V3(4.1, yW + 1.3, -6.9), a1 = V3(6.6, yW + 15, -9.6); const [g, m] = rodGeom(a0.clone().lerp(a1, -.18), a1, .32, 8); L.push([g, "g", m], [ZS(1.15, 12, 10), "e", M4(a1.x, a1.y + .9, a1.z), c === "w" ? "#1f6fd1" : "#c21f3a"], [TOR(1.18, .16, 5, 14).rotateX(Math.PI / 2), "g", M4(a1.x, a1.y + .9, a1.z)], [BOX(.2, 1.5, .2), "g", M4(a1.x, a1.y + 2.6, a1.z)], [BOX(.9, .2, .2), "g", M4(a1.x, a1.y + 2.8, a1.z)], [TOR(.5, .14, 5, 10).rotateX(Math.PI / 2), "g", M4(a1.x, a1.y - .5, a1.z)]); }
      L.push([new THREE.SphereGeometry(1, 14, 8, 0, TAU, 0, Math.PI / 2), "s", ZE(0, hy + 4.6, 0, 3.1, 2.6, 3.1), c === "w" ? "#8a1c2e" : "#173F68"]);
      [-1, 1].forEach((sd) => { L.push([CYL(.1, .1, 2.2, 4), "g", M4(sd * 7, 19.5, 21)], [ZS(.75, 10, 8), "l", M4(sd * 7, 18, 21), ZC.glow], [new THREE.ConeGeometry(.8, .7, 8), "g", M4(sd * 7, 18.9, 21)]); });
      rail(.14, .46, 5, 1.8, .92); ports(.68, [.3, .44, .58], .7);
      for (let i = 0; i < 5; i++) { const a = -1 + i * .5; L.push([ZS(1, 8, 6), "e", ZE(Math.sin(a) * 9.4, 17.4, -12 + Math.abs(a) * 2.2, .7, .5, .7), i % 2 ? "#e85a7a" : "#fff0f3"]); }
    } else if (kind === "king") {
      const y0 = 15.6, hy = y0 + 52, ty = hy + 5.2;
      seams(15.4, [-7.5, -5, -2.5, 0, 2.5, 5, 7.5], 36); rail(.08, .34, 5, 2.2, .93); rail(.7, .9, 4, 2, .9); ports(.7, [.26, .38, .5, .62, .74], .72);
      wheel(0, y0 + 6.4, 11.5, 3.2); [-1, 1].forEach((sd) => lantern(sd * 7.4, B.ys(.03) + .4, B.z(.03) - 1, 1.25));
      [-1, 1].forEach((sd) => { L.push([TOR(2.12, .28, 5, 16).rotateX(Math.PI / 2), "g", M4(sd * 2.6, y0 + 7, 0)], [ZT([V3(sd * 1.4, y0 + 44.6, -4.6), V3(sd * 1.9, y0 + 36, -7.6), V3(sd * 1.5, y0 + 27.6, -7), V3(sd * 2.4, y0 + 16, -8.2), V3(sd * 3.4, y0 + 9.6, -8.2)], .22, 24), "g"]); });
      L.push([ZT([V3(6.4, y0 + 43.5, -2.6), V3(3.2, y0 + 39.4, -6.9), V3(-1, y0 + 33.6, -7.5), V3(-5.6, y0 + 28.4, -4.6)], .95, 22), "e", null, c === "w" ? "#b8322c" : "#efe6d2"]);
      [[-4.4, "#c21f3a"], [-2.9, "#1f6fd1"], [-1.4, "#f0c040"]].forEach(([x, col], k) => { const y = y0 + 39.2 - k * .5, z = -Math.sqrt(Math.max(1, 59 - x * x)) - .35; L.push([BOX(.9, 1.5, .2), "e", M4(x, y + 1, z), col], [CYL(.62, .62, .2, 10).rotateX(Math.PI / 2), "g", M4(x, y - .25, z - .05)], [ZS(.22, 6, 5), "e", M4(x, y - .25, z - .2), col]); });
      { const a0 = V3(-8.4, y0 + 27.5, .5), a1 = V3(-12.4, y0 + 6, 7.5); const [g, m] = rodGeom(a0, a1, .55, 8); L.push([g, "e", m, "#2a1a0e"]); const [g2, m2] = rodGeom(a1.clone().lerp(a0, .08), a1, .62, 8); L.push([g2, "g", m2]); const [g3, m3] = rodGeom(a0, a0.clone().lerp(a1, -.2), .34, 8); L.push([g3, "g", m3], [ZS(.62, 8, 6), "g", M4(-7.5, y0 + 32.1, -1)], [BOX(3.2, .4, .9), "g", M4(-8.3, y0 + 27.8, .4, 0, 0, .3)], [TOR(1.2, .16, 5, 12, Math.PI), "g", M4(-7.9, y0 + 29.6, -.2, Math.PI / 2, 0, .3)]); }
      L.push([varTube(new THREE.CatmullRomCurve3([V3(4.6, ty + 1.2, 1.5), V3(7.2, ty + 5.8, 3.4), V3(8, ty + 9.6, 6.8), V3(6.2, ty + 10.8, 10.4)]), 22, 9, (t) => 1.5 * Math.sin(Math.PI * Math.min(1, t * .9 + .12))), "m", null, "#ffffff"], [ZS(.85, 10, 8), "g", M4(4.6, ty + 1.2, 1.4)], [ZS(.4, 8, 6), "e", M4(4.6, ty + 1.2, .6), "#c21f3a"]);
      L.push([ZT([V3(1.6, y0 + 30.2, -6.9), V3(3, y0 + 28.4, -7.4), V3(4.6, y0 + 29.6, -6.4)], .1, 12), "g"], [CYL(.7, .7, .25, 12).rotateX(Math.PI / 2), "g", M4(4.9, y0 + 29.2, -6.2)]);
      { const bx = 0, bz = -15.5, by = 15.4; L.push([BOX(4.6, 2.4, 3), "m", M4(bx, by + 1.2, bz), "#6a4424"], [BOX(4.9, .3, .5), "g", M4(bx, by + 1.2, bz - 1.4)], [BOX(.5, 2.5, 3.2), "g", M4(bx - 1.5, by + 1.2, bz)], [BOX(.5, 2.5, 3.2), "g", M4(bx + 1.5, by + 1.2, bz)], [BOX(4.6, .4, 3), "m", M4(bx, by + 3.5, bz + 1.5, 0, -1.05), "#7a4e28"], [BOX(.8, .9, .3), "g", M4(bx, by + 1.6, bz - 1.56)]);
        for (let k = 0; k < 14; k++) L.push([ZS(.42, 6, 5), "g", M4(bx - 1.6 + (k % 5) * .8, by + 2.5 + ((k * 7) % 3) * .25, bz - .8 + ((k * 3) % 4) * .5)]); L.push([ZS(.4, 6, 5), "e", M4(bx + .4, by + 3, bz - .2), "#c21f3a"], [ZS(.36, 6, 5), "e", M4(bx - .8, by + 2.9, bz + .3), "#1f6fd1"]); }
      [-1, 1].forEach((sd) => { L.push([CYL(.6, .75, 4.4, 10).rotateX(Math.PI / 2), "s", M4(sd * 5.4, 16.6, -9.5, sd * -.18), "#1b1e24"], [TOR(.74, .14, 5, 12), "g", M4(sd * 5.8, 16.6, -11.6, sd * -.18)], [BOX(1.8, .7, 3), "m", M4(sd * 5.4, 15.8, -9, sd * -.18), "#6a4424"], [CYL(.7, .7, .3, 10).rotateZ(Math.PI / 2), "m", M4(sd * 5.4 - 1, 15.9, -9), "#4a2e16"], [CYL(.7, .7, .3, 10).rotateZ(Math.PI / 2), "m", M4(sd * 5.4 + 1, 15.9, -9), "#4a2e16"]); });
      sailor(-6.4, 15.4, 4, 1.25, c === "w" ? "#c8322c" : "#e9e2d3", 0);
    }
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
    zFine(L, "pawn", c, B, I);
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
    zFine(L, "rook", c, null, I);
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
    zFine(L, "knight", c, B, I);
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
    zFine(L, "bishop", c, B, I);
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
    zFine(L, "queen", c, B, I);
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
    zFine(L, "king", c, B, I);
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
  /* =====================================================================================================
     A MAKETT ÚJ HELYSZÍNE: KERTSZIGET A BALATONON (2026. nov. 9., a tulajdonos kérésére)
     „Vigyük a házat egy nagyon szép virtuális térbe” – a regatta-bója helyett egy 48 m sugarú, úszó kertsziget a tó közepén:
     • középen 16 m-es kerek travertin tér szélrózsa-mozaikkal és arany berakással (rajta az asztal a makettel);
     • a tér körül alacsony puszpángsövény négy kapuval, kőpadok, kovácsoltvas lámpák (este világítanak);
     • levendulaágyások ívekben, mediterrán ciprusgyűrű, virágzó leanderek terrakotta dézsákban;
     • négy kavicsos út a szigetperemig, a part felé a hosszú stég (a régi palló) visz tovább;
     • a sziget peremén mészkő mellvéd, alatta a vízbe futó sziklás part.
     Elég nagy ahhoz, hogy a ház a makettasztaltól ÉLETNAGYSÁGIG ugyanitt nőjön (a telek 16,5 × 50 m, a ciprusgyűrű 34 m-en kívül van),
     életnagyságban a tér díszei (lámpák, padok, sövény, levendula, távcső) eltűnnek, hogy ne lógjanak bele a házba és a kertbe. */
  const ISL_R = 48;
  function buildGardenIsland(site) {
    const g = new THREE.Group(); site.add(g); ENV.deck = g; ENV.postPos = []; ENV.lavender = []; ENV.lanterns = []; ENV.walk = null;
    const deco = new THREE.Group(); g.add(deco); ENV.islandDeco = deco;
    /* --- a sziget teste: sziklás part a vízbe, mészkő mellvéd --- */
    { const prof = [new THREE.Vector2(ISL_R + 9, WATER_Y - 3), new THREE.Vector2(ISL_R + 5.5, WATER_Y - .2), new THREE.Vector2(ISL_R + 2.2, WATER_Y + .45), new THREE.Vector2(ISL_R + .4, -.25), new THREE.Vector2(ISL_R, -.05)];
      const lg = new THREE.LatheGeometry(prof, 120), p = lg.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
        const n = Math.sin(a * 17) * .5 + Math.sin(a * 41 + 1.3) * .3 + Math.sin(a * 7 + y * 3) * .4, rr2 = r + n * .9 * clamp((ISL_R + 6 - r) / 6, 0, 1) * (y < -.2 ? 1 : 0);
        p.setXYZ(i, x / r * rr2, y + (y < -.2 ? n * .25 : 0), z / r * rr2);
        const c = new THREE.Color(y < WATER_Y + .1 ? "#3e3a33" : "#8a8172").lerp(new THREE.Color("#a99e88"), clamp(n * .5 + .3, 0, 1) * (y > WATER_Y ? 1 : .3)); col.set([c.r, c.g, c.b], i * 3); }
      lg.setAttribute("color", new THREE.BufferAttribute(col, 3)); lg.computeVertexNormals();
      const m = mesh(lg, std({ vertexColors: true, roughness: .95, flatShading: true, side: THREE.DoubleSide }), g); m.receiveShadow = true;
      /* mészkő mellvéd */
      const cg = new THREE.RingGeometry(ISL_R - 1.2, ISL_R + .05, 128, 1); cg.rotateX(-Math.PI / 2);
      const cop = mesh(cg, std({ map: txNoise("limestone", "#d8cfbb", .12, 1800, 3, [24, 1]), roughness: .8 }), g); cop.position.y = .32; cop.receiveShadow = true;
      const wall = mesh(new THREE.CylinderGeometry(ISL_R + .05, ISL_R + .05, .38, 128, 1, true), std({ color: "#cfc5ae", roughness: .85, side: THREE.DoubleSide }), g); wall.position.y = .13;
      const wallIn = mesh(new THREE.CylinderGeometry(ISL_R - 1.2, ISL_R - 1.2, .32, 128, 1, true), std({ color: "#c2b79f", roughness: .85, side: THREE.DoubleSide }), g); wallIn.position.y = .16;
      /* sziklák a vízvonalon */
      const rocks = []; for (let k = 0; k < 90; k++) { const a = rand() * TAU, r = ISL_R + rr(2.5, 6.5), s = rr(.5, 1.6); rocks.push(M4(Math.cos(a) * r, WATER_Y + rr(-.3, .25), Math.sin(a) * r, rand() * 6, rand() * 2, 0, s, s * rr(.5, .8), s)); }
      inst(new THREE.DodecahedronGeometry(1, 0), std({ color: "#6e675c", roughness: .95, flatShading: true }), rocks, g, true); }
    /* --- gyep (a teljes sziget) és a travertin tér mozaikkal --- */
    { const lawn = mesh(new THREE.CircleGeometry(ISL_R - 1.2, 128).rotateX(-Math.PI / 2), std({ map: txGrass(), roughness: .95 }), g); lawn.position.y = .0; lawn.receiveShadow = true;
      if (lawn.material.map) { lawn.material.map = lawn.material.map.clone(); lawn.material.map.needsUpdate = true; lawn.material.map.wrapS = lawn.material.map.wrapT = THREE.RepeatWrapping; lawn.material.map.repeat.set(40, 40); W.disposables.push(lawn.material.map); }
      const pt = canvasTex(2048, 2048, (c, w, h) => {
        c.fillStyle = "#e6dcc8"; c.fillRect(0, 0, w, h);
        /* travertin lapok: koncentrikus gyűrűk, sugárirányú fugák */
        const cx = w / 2, cy = h / 2, R = w / 2;
        for (let r = 0; r < 14; r++) { const r0 = R * (.08 + r * .066), n = 6 + r * 6; for (let k = 0; k < n; k++) { const a0 = k / n * TAU, a1 = (k + 1) / n * TAU; c.fillStyle = `hsl(${36 + (k * 7 + r * 3) % 6},${18 + (k * 13) % 10}%,${80 + (k * 11 + r * 5) % 8}%)`;
            c.beginPath(); c.arc(cx, cy, r0 + R * .066, a0, a1); c.arc(cx, cy, r0, a1, a0, true); c.closePath(); c.fill(); c.strokeStyle = "rgba(120,100,70,.35)"; c.lineWidth = 2; c.stroke(); } }
        for (let k = 0; k < 2600; k++) { c.fillStyle = `rgba(150,120,80,${.03 + (k % 7) * .01})`; c.fillRect((k * 769) % w, (k * 337) % h, 3 + k % 5, 1 + k % 2); }
        /* szélrózsa arany és tengerkék berakással */
        c.save(); c.translate(cx, cy);
        c.strokeStyle = "#b8902e"; c.lineWidth = 14; c.beginPath(); c.arc(0, 0, R * .9, 0, TAU); c.stroke(); c.lineWidth = 5; c.beginPath(); c.arc(0, 0, R * .86, 0, TAU); c.stroke();
        c.font = "700 64px Georgia, serif"; c.fillStyle = "#8f6d1e"; c.textAlign = "center"; c.textBaseline = "middle";
        const txt = "ZEPHYR APARTMANHÁZ · ZAMÁRDI · BALATON · ", N = txt.length * 2; for (let i = 0; i < N; i++) { c.save(); c.rotate(i / N * TAU); c.fillText(txt[i % txt.length], 0, -R * .78); c.restore(); }
        c.lineWidth = 6; c.beginPath(); c.arc(0, 0, R * .7, 0, TAU); c.stroke();
        for (let k = 0; k < 16; k++) { const a = k / 16 * TAU - Math.PI / 2, ln = k % 4 === 0 ? R * .66 : k % 2 === 0 ? R * .44 : R * .3, wd = k % 4 === 0 ? R * .07 : R * .045;
          [[1, "#0e2142"], [-1, k % 4 === 0 ? "#c9a227" : "#d8c48a"]].forEach(([sd, col]) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * ln, Math.sin(a) * ln); c.lineTo(Math.cos(a + sd * Math.PI / 2) * wd, Math.sin(a + sd * Math.PI / 2) * wd); c.closePath(); c.fill(); }); }
        c.fillStyle = "#c9a227"; c.beginPath(); c.arc(0, 0, R * .05, 0, TAU); c.fill();
        c.font = "900 120px Georgia, serif"; c.fillStyle = "#0e2142"; c.fillText("É", 0, -R * .6); c.restore();
      });
      const plaza = mesh(new THREE.CircleGeometry(16, 128).rotateX(-Math.PI / 2), std({ map: pt, roughness: .55 }), g); plaza.position.y = .025; plaza.rotation.y = 0; plaza.receiveShadow = true;
      /* utak a peremig (kavics) */
      const gv = std({ map: txNoise("gravel", "#cbbfa6", .2, 2600, 2, [2, 12]), roughness: .95 });
      [0, 1, 2, 3].forEach((k) => { const a = k * Math.PI / 2, L = ISL_R - 1.2 - 16, pg = new THREE.PlaneGeometry(3.2, L).rotateX(-Math.PI / 2); const m = mesh(pg, gv, g); m.position.set(Math.sin(a) * (16 + L / 2), .02, Math.cos(a) * (16 + L / 2)); m.rotation.y = a; m.receiveShadow = true; });
      /* láthatatlan teleport-felület az egész szigeten */
      const tp = mesh(new THREE.CircleGeometry(ISL_R - 1.2, 64).rotateX(-Math.PI / 2), basic({ visible: false }), g); tp.position.y = .03; ENV.deckTop = tp; }
    /* --- díszek: sövény, padok, lámpák, levendula, leanderek, távcső (életnagyságban rejtve) --- */
    const L = [];
    /* puszpángsövény a tér körül, négy kapuval */
    const hedge = []; for (let k = 0; k < 160; k++) { const a = k / 160 * TAU, inGap = [0, 1, 2, 3].some((q) => Math.abs(wrapA(a - q * Math.PI / 2)) < .14); if (inGap) continue; hedge.push(M4(Math.sin(a) * 16.7, .42, Math.cos(a) * 16.7, a, 0, 0, 1, 1, 1)); }
    inst(new THREE.BoxGeometry(.75, .84, .7), std({ color: "#2f5a2c", roughness: .95 }), hedge, deco, true);
    /* kőpadok (íves, a tér felé) */
    for (let k = 0; k < 8; k++) { const a = (k + .5) / 8 * TAU, x = Math.sin(a) * 13.2, z = Math.cos(a) * 13.2; L.push([BX(2.0, .1, .55), "#e9e1cf", M4(x, .46, z, a)], [BX(.35, .42, .45), "#d8cfbb", M4(x + Math.cos(a) * .75, .21, z - Math.sin(a) * .75, a)], [BX(.35, .42, .45), "#d8cfbb", M4(x - Math.cos(a) * .75, .21, z + Math.sin(a) * .75, a)]); }
    /* kovácsoltvas lámpák (este világítanak) */
    const lampPts = [];
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + .13, x = Math.sin(a) * 15.6, z = Math.cos(a) * 15.6;
      L.push([CY(.07, .1, 3.1, 8), "#1d1f22", M4(x, 1.55, z), "m"], [CY(.2, .24, .16, 8), "#1d1f22", M4(x, .08, z), "m"], [CY(.17, .12, .45, 8), "#ffd890", M4(x, 3.3, z), "e"], [new THREE.ConeGeometry(.26, .28, 8), "#1d1f22", M4(x, 3.66, z), "m"], [new THREE.SphereGeometry(.05, 6, 4), "#c9a227", M4(x, 3.83, z), "m"]);
      lampPts.push(new THREE.Vector3(x, 3.3, z)); ENV.lanterns.push(new THREE.Vector3(x, 3.3, z)); }
    /* terrakotta dézsák virágzó leanderrel a tér négy kapujánál */
    const blossom = [];
    [0, 1, 2, 3].forEach((q) => [-1, 1].forEach((sd) => { const a = q * Math.PI / 2 + sd * .2, x = Math.sin(a) * 17.6, z = Math.cos(a) * 17.6;
      L.push([CY(.55, .42, .75, 14), "#b5623a", M4(x, .37, z)], [CY(.58, .58, .08, 14), "#9a4e2c", M4(x, .76, z)]);
      for (let k = 0; k < 9; k++) { const t = k / 9 * TAU; L.push([new THREE.IcosahedronGeometry(.42, 0), "#3f6b35", M4(x + Math.cos(t) * .35, 1.25 + (k % 3) * .25, z + Math.sin(t) * .35, t)]); blossom.push(M4(x + Math.cos(t) * .5, 1.35 + (k % 3) * .28, z + Math.sin(t) * .5, t, t, 0, .9, .9, .9)); } }));
    inst(new THREE.IcosahedronGeometry(.14, 0), std({ color: "#f27aa8", roughness: .8, emissive: new THREE.Color("#401020"), emissiveIntensity: .3 }), blossom, deco);
    /* távcső a tó felé (−z) a tér peremén */
    const tel = new THREE.Group(); deco.add(tel); tel.position.set(-3.2, 0, -14.4); tel.rotation.y = 0;
    { const br = std({ color: "#c9a24a", roughness: .25, metalness: .9 }), dk = std({ color: "#2a2d32", roughness: .5 });
      [0, 1, 2].forEach((k) => { const a = k / 3 * TAU; rodBetween(new THREE.Vector3(Math.cos(a) * .35, 0, Math.sin(a) * .35), new THREE.Vector3(0, 1.15, 0), .025, dk, tel); });
      const tube = mesh(new THREE.CylinderGeometry(.06, .09, .9, 14), br, tel); tube.rotation.x = Math.PI / 2 - .12; tube.position.set(0, 1.28, -.1);
      const hitT = mesh(new THREE.BoxGeometry(.6, 1.5, .6), basic({ visible: false }), tel); hitT.position.y = .75; ENV.telescope = tel; ENV.telHit = hitT; }
    const vg = vcGroup(L, deco); if (vg.e) { vg.e.material.emissiveIntensity = 0; ENV.glows.push({ mat: vg.e.material, k: 2.2, flick: 1 }); }
    glowPoints(deco, lampPts, 1.2, "#ffc070", 1);
    /* --- levendulaágyások (íves sávok a tér körül, a négy út között) --- */
    { const stem = [], head = [];
      for (let q = 0; q < 4; q++) for (let k = 0; k < 150; k++) { const a = q * Math.PI / 2 + .22 + (k / 150) * (Math.PI / 2 - .44), r = 19.5 + (k * 7 % 5) * 1.25 + rr(-.3, .3), x = Math.sin(a) * r, z = Math.cos(a) * r, s = rr(.8, 1.15);
        stem.push(M4(x, .22 * s, z, rand() * 6, 0, 0, s, s, s)); head.push(M4(x, .55 * s, z, rand() * 6, 0, 0, s, s, s)); if (k % 6 === 0) ENV.lavender.push(new THREE.Vector3(x, .6, z)); }
      inst(new THREE.IcosahedronGeometry(.32, 0).scale(1, .7, 1), std({ color: "#5d7a52", roughness: .95, flatShading: true }), stem, deco, true);
      const hm = std({ color: "#8a6cc8", roughness: .85, flatShading: true }); windify(hm, .05, 1.6, "lav");
      inst(new THREE.ConeGeometry(.26, .5, 6).translate(0, .1, 0), hm, head, deco); }
    /* --- ciprusgyűrű (34 m) és néhány olajfa – életnagyságban is maradnak (a telken kívül vannak) --- */
    { const cyp = [], cypT = [];
      for (let k = 0; k < 18; k++) { const a = k / 18 * TAU + .09; if ([0, 1, 2, 3].some((q) => Math.abs(wrapA(a - q * Math.PI / 2)) < .1)) continue; const x = Math.sin(a) * 34, z = Math.cos(a) * 34, s = rr(.9, 1.15);
        cyp.push(M4(x, 0, z, rand() * 6, 0, 0, s, s * rr(.95, 1.15), s)); cypT.push(M4(x, .6, z)); }
      const cg = new THREE.LatheGeometry([0, .55, .85, 1, 1.02, .97, .88, .74, .56, .36, .16, 0].map((r, i) => new THREE.Vector2(r * 1.05, .7 + i * .85)), 12);
      const cm = std({ color: "#2b4a2a", roughness: .9, flatShading: true }); windify(cm, .0012, .7, "cyp");
      inst(cg, cm, cyp, g, true); inst(new THREE.CylinderGeometry(.18, .26, 1.4, 8), std({ color: "#4a3626", roughness: .9 }), cypT, g, true);
      const olives = []; for (let k = 0; k < 8; k++) { const a = (k + .5) / 8 * TAU, r = 40 + (k % 2) * 3; olives.push([Math.sin(a) * r, Math.cos(a) * r]); }
      const ol = []; olives.forEach(([x, z]) => { ol.push([CY(.2, .32, 2.6, 8), "#6a5642", M4(x, 1.3, z, 0, .1, .08)]); for (let k = 0; k < 7; k++) { const t = k / 7 * TAU; ol.push([new THREE.IcosahedronGeometry(1.3, 0), "#7d8f62", M4(x + Math.cos(t) * 1.2, 3.2 + (k % 2) * .6, z + Math.sin(t) * 1.2, t)]); } });
      vcGroup(ol, g, { flatShading: true, roughness: .95 }); }
    /* --- kis kikötő a tó felé (−z): fa stég bakokon, két kikötőbak --- */
    { const P2 = [], z0 = -ISL_R + .2; P2.push([BX(3.2, .14, 9), "#8a6239", M4(0, .2, z0 - 4.5)]);
      for (let k = 0; k < 4; k++) [-1.4, 1.4].forEach((x) => P2.push([CY(.12, .12, 2.2, 8), "#5a4030", M4(x, -.8, z0 - 1 - k * 2.6)]));
      [-1.3, 1.3].forEach((x) => P2.push([CY(.14, .18, .5, 10), "#2a2d32", M4(x, .5, z0 - 8.6), "m"], [CY(.2, .2, .06, 10), "#2a2d32", M4(x, .77, z0 - 8.6), "m"]));
      vcGroup(P2, g); }
  }
  /* a Balaton valódi partvonala (© OpenStreetMap-közreműködők, ODbL) – a séta BAL_SHORE adatának másolata a 3D-világokhoz: [hosszúság, szélesség] */
  const HV_SHORE = [[17.93108,46.96658],[17.93928,46.97048],[17.94425,46.97635],[17.95073,46.97611],[17.95812,46.97417],[17.9651,46.97413],[17.96711,46.97811],[17.96896,46.97935],[17.96881,46.98039],[17.97077,46.98201],[17.97355,46.98246],[17.97194,46.98384],[17.97303,46.98413],[17.97384,46.98249],[17.97508,46.98221],[17.97405,46.98322],[17.97524,46.98349],[17.97462,46.98266],[17.97597,46.98366],[17.97529,46.98257],[17.97731,46.98334],[17.97741,46.98421],[17.97907,46.98423],[17.97954,46.9828],[17.97969,46.98403],[17.98397,46.98614],[17.9864,46.98631],[17.98746,46.988],[17.98636,46.98759],[17.98749,46.98804],[17.9897,46.99199],[17.99715,46.99811],[17.9966,46.99855],[17.9973,46.99909],[17.99734,46.99825],[18.00072,47.00057],[18.00339,47.00346],[18.00493,47.0063],[18.00523,47.00959],[18.00634,47.01057],[18.00549,47.01088],[18.00648,47.0107],[18.00802,47.01485],[18.00913,47.01481],[18.00826,47.01725],[18.01169,47.01927],[18.01099,47.01843],[18.00988,47.0185],[18.01017,47.01935],[18.01113,47.01931],[18.00997,47.01984],[18.01241,47.02511],[18.01438,47.02634],[18.02538,47.02858],[18.02988,47.03156],[18.0314,47.03378],[18.0281,47.04058],[18.02962,47.04504],[18.03004,47.05086],[18.03294,47.05375],[18.03236,47.0542],[18.03496,47.05487],[18.0347,47.05598],[18.03628,47.05653],[18.03576,47.05747],[18.03759,47.05886],[18.03565,47.06249],[18.03628,47.06299],[18.03826,47.05855],[18.04029,47.05879],[18.04205,47.05802],[18.04015,47.05813],[18.04053,47.05743],[18.04334,47.05697],[18.04777,47.05474],[18.04703,47.05595],[18.04827,47.05642],[18.0494,47.05503],[18.04795,47.0545],[18.04835,47.05403],[18.05481,47.05008],[18.05723,47.04651],[18.06408,47.04182],[18.0725,47.03907],[18.07802,47.03831],[18.0817,47.03697],[18.08283,47.03724],[18.08442,47.03581],[18.09457,47.0314],[18.09685,47.03218],[18.10526,47.03059],[18.10868,47.03061],[18.10846,47.03117],[18.11028,47.03146],[18.11057,47.03057],[18.11154,47.03167],[18.11449,47.03173],[18.12253,47.02712],[18.12514,47.02651],[18.12902,47.02323],[18.13355,47.02162],[18.13285,47.02303],[18.13638,47.02143],[18.13869,47.02167],[18.13959,47.02039],[18.14524,47.018],[18.14632,47.01898],[18.14539,47.01791],[18.16025,47.01116],[18.16287,47.00566],[18.16502,47.00441],[18.16507,47.00155],[18.16653,46.99908],[18.16594,46.9986],[18.16832,46.99643],[18.16734,46.99509],[18.16779,46.99317],[18.16638,46.9881],[18.16528,46.98744],[18.16171,46.98786],[18.16115,46.98698],[18.162,46.98787],[18.16464,46.98746],[18.16432,46.98653],[18.16118,46.98652],[18.16046,46.98718],[18.16116,46.9864],[18.16417,46.98644],[18.16447,46.98543],[18.16221,46.98035],[18.16331,46.97775],[18.15806,46.96673],[18.1571,46.96654],[18.14818,46.95441],[18.14431,46.95121],[18.13069,46.9415],[18.12697,46.94035],[18.12731,46.93951],[18.11592,46.93315],[18.11072,46.93069],[18.10879,46.93209],[18.0984,46.92742],[18.07997,46.92103],[18.0632,46.91564],[18.06219,46.91637],[18.06319,46.91482],[18.05649,46.91269],[18.05583,46.91335],[18.04582,46.91086],[18.04281,46.91295],[18.04635,46.90857],[18.04551,46.90824],[18.04428,46.90901],[18.04402,46.91112],[18.04272,46.91058],[18.04475,46.90836],[18.04508,46.90634],[18.04116,46.91175],[18.04252,46.91251],[18.0399,46.91078],[18.04009,46.90893],[18.03803,46.9083],[18.03854,46.90715],[18.03522,46.90597],[18.0287,46.90429],[18.0271,46.90487],[18.02044,46.90274],[18.01558,46.90356],[18.01675,46.90284],[18.01575,46.90258],[18.0157,46.9034],[18.01557,46.90257],[18.00401,46.89975],[18.00268,46.89815],[17.99103,46.8959],[17.99148,46.89485],[17.97519,46.89276],[17.97273,46.89217],[17.97284,46.89146],[17.96957,46.89135],[17.96636,46.88978],[17.96474,46.88946],[17.96344,46.89044],[17.96042,46.88977],[17.9599,46.88887],[17.95824,46.88845],[17.95784,46.8892],[17.95641,46.88897],[17.95279,46.88752],[17.91914,46.88374],[17.91728,46.88215],[17.91133,46.88163],[17.91069,46.88083],[17.90807,46.88103],[17.90411,46.8796],[17.89904,46.88045],[17.90041,46.87998],[17.90003,46.87935],[17.8984,46.87994],[17.90302,46.87843],[17.90421,46.87687],[17.90267,46.87415],[17.90353,46.87349],[17.90142,46.86671],[17.8971,46.86368],[17.89571,46.86191],[17.89622,46.8614],[17.88372,46.85724],[17.88229,46.85761],[17.8829,46.85571],[17.88146,46.85506],[17.87855,46.85757],[17.87968,46.85487],[17.87855,46.85365],[17.87039,46.84998],[17.8662,46.84939],[17.86188,46.84572],[17.84844,46.83967],[17.83972,46.83732],[17.83436,46.83475],[17.81977,46.83018],[17.81819,46.82889],[17.81033,46.82621],[17.79581,46.82217],[17.77284,46.81331],[17.77031,46.81344],[17.76729,46.81584],[17.77084,46.81223],[17.76973,46.81186],[17.76727,46.81535],[17.76872,46.81296],[17.7652,46.80979],[17.76114,46.80904],[17.74764,46.80358],[17.73984,46.80143],[17.73699,46.80163],[17.72918,46.79921],[17.72825,46.79789],[17.71086,46.79408],[17.70814,46.79428],[17.69888,46.7914],[17.69268,46.7914],[17.68976,46.79377],[17.69163,46.7912],[17.69075,46.79095],[17.68971,46.79255],[17.69004,46.79156],[17.68802,46.79026],[17.68222,46.78837],[17.68071,46.7886],[17.6801,46.78779],[17.67717,46.78701],[17.67108,46.78605],[17.67094,46.78535],[17.66141,46.78347],[17.66,46.78391],[17.66023,46.78342],[17.6595,46.78376],[17.65759,46.7833],[17.65791,46.78267],[17.6554,46.78241],[17.65522,46.78171],[17.65355,46.78296],[17.64791,46.78158],[17.64591,46.78285],[17.64544,46.78246],[17.64622,46.78276],[17.64874,46.78029],[17.64672,46.77925],[17.64584,46.78005],[17.6467,46.78158],[17.64521,46.78195],[17.64606,46.78093],[17.64407,46.77956],[17.64535,46.77831],[17.64375,46.77703],[17.62501,46.77132],[17.62533,46.77044],[17.61874,46.768],[17.61522,46.76794],[17.57442,46.75527],[17.56836,46.75403],[17.56683,46.75446],[17.56769,46.75265],[17.5661,46.75444],[17.56473,46.75438],[17.56457,46.75357],[17.56348,46.75411],[17.5634,46.75275],[17.55885,46.75169],[17.55509,46.75169],[17.55332,46.75341],[17.55546,46.7499],[17.55295,46.74924],[17.55433,46.75078],[17.55237,46.75283],[17.55389,46.75141],[17.55263,46.74984],[17.5484,46.74822],[17.53869,46.74178],[17.53316,46.73608],[17.52838,46.73308],[17.52833,46.7312],[17.526,46.73031],[17.52519,46.73135],[17.52311,46.73097],[17.51954,46.72952],[17.52045,46.72821],[17.51619,46.72584],[17.50232,46.72122],[17.47654,46.71442],[17.47709,46.7127],[17.47641,46.71443],[17.45806,46.71077],[17.45411,46.70932],[17.45369,46.71016],[17.45047,46.71011],[17.4385,46.70762],[17.43575,46.70788],[17.43362,46.70642],[17.43475,46.70739],[17.43406,46.70807],[17.42605,46.70675],[17.42384,46.70734],[17.42318,46.70651],[17.42264,46.70719],[17.4205,46.70634],[17.41539,46.70642],[17.41237,46.70613],[17.41179,46.70493],[17.41106,46.70609],[17.40926,46.70666],[17.39435,46.70616],[17.39233,46.70696],[17.39165,46.70625],[17.39073,46.7068],[17.37619,46.70755],[17.35958,46.71083],[17.35869,46.70963],[17.35344,46.71038],[17.33085,46.717],[17.33034,46.71626],[17.33345,46.71602],[17.32947,46.71607],[17.32997,46.71672],[17.32922,46.71608],[17.32406,46.71611],[17.32044,46.71473],[17.30934,46.7156],[17.30391,46.71414],[17.30381,46.71356],[17.3,46.71298],[17.29751,46.71075],[17.29337,46.71008],[17.29031,46.71126],[17.28601,46.71088],[17.28076,46.70883],[17.26974,46.70705],[17.26888,46.70615],[17.26859,46.7068],[17.26671,46.7067],[17.26403,46.70547],[17.26365,46.70718],[17.25978,46.70917],[17.25997,46.71065],[17.25836,46.70941],[17.25097,46.71312],[17.24796,46.71369],[17.24838,46.71477],[17.24727,46.71523],[17.24644,46.71749],[17.24565,46.72512],[17.24352,46.72551],[17.24619,46.7256],[17.24384,46.7282],[17.2454,46.73064],[17.24444,46.73623],[17.2456,46.73702],[17.24479,46.73733],[17.24555,46.73735],[17.2452,46.74346],[17.24652,46.74705],[17.24547,46.74967],[17.24594,46.75104],[17.24783,46.75184],[17.24774,46.75298],[17.24637,46.75245],[17.24665,46.75329],[17.24838,46.75332],[17.24765,46.75403],[17.24903,46.75341],[17.24909,46.75507],[17.25192,46.75821],[17.25398,46.75859],[17.25661,46.75779],[17.25382,46.75892],[17.25531,46.76127],[17.25853,46.76322],[17.26572,46.7643],[17.26602,46.76351],[17.26783,46.76445],[17.2767,46.7626],[17.27588,46.76435],[17.27687,46.76433],[17.27679,46.76259],[17.27728,46.76363],[17.27789,46.76263],[17.28662,46.76125],[17.29282,46.75899],[17.29222,46.76013],[17.2935,46.76008],[17.293,46.75902],[17.30145,46.75564],[17.30126,46.757],[17.30335,46.75662],[17.30172,46.75554],[17.30757,46.75351],[17.30834,46.75417],[17.30825,46.75344],[17.31091,46.75316],[17.31556,46.75381],[17.31831,46.75263],[17.32746,46.75156],[17.32811,46.75326],[17.32926,46.75361],[17.33123,46.75157],[17.33102,46.7506],[17.33197,46.75039],[17.33257,46.75131],[17.33372,46.751],[17.333,46.74954],[17.3338,46.75042],[17.33463,46.74952],[17.33717,46.74987],[17.34768,46.74722],[17.35723,46.7531],[17.35804,46.76147],[17.35997,46.76374],[17.36705,46.76855],[17.36666,46.77062],[17.37306,46.77591],[17.37572,46.77634],[17.37788,46.77945],[17.38714,46.78688],[17.38644,46.78734],[17.38555,46.78686],[17.38721,46.78961],[17.38744,46.79497],[17.3897,46.7956],[17.39472,46.79617],[17.40013,46.79536],[17.40594,46.79554],[17.40676,46.79496],[17.41267,46.79727],[17.41412,46.79713],[17.41448,46.7954],[17.41747,46.79505],[17.42477,46.79221],[17.42913,46.78687],[17.43608,46.78513],[17.4445,46.78502],[17.4445,46.7844],[17.44815,46.78502],[17.45064,46.78628],[17.453,46.79017],[17.45533,46.78966],[17.45864,46.79161],[17.46131,46.79153],[17.46636,46.79095],[17.47186,46.78826],[17.47267,46.78942],[17.47244,46.78892],[17.47348,46.78908],[17.48467,46.78478],[17.49123,46.7833],[17.50042,46.78236],[17.50714,46.786],[17.50651,46.78631],[17.50823,46.78894],[17.51445,46.79434],[17.51458,46.79571],[17.51652,46.79751],[17.51719,46.80072],[17.52039,46.80179],[17.5201,46.80353],[17.52357,46.80455],[17.52377,46.80551],[17.5343,46.80344],[17.54108,46.80318],[17.54428,46.80399],[17.54403,46.80501],[17.54648,46.80543],[17.54869,46.80568],[17.54997,46.80471],[17.5504,46.80528],[17.55383,46.80516],[17.56199,46.80968],[17.56869,46.80931],[17.56998,46.81143],[17.57118,46.81106],[17.57294,46.81171],[17.57217,46.81243],[17.57667,46.82006],[17.57809,46.82001],[17.57793,46.82121],[17.58191,46.82327],[17.58293,46.8225],[17.58209,46.8233],[17.58343,46.8241],[17.59026,46.82245],[17.59103,46.8211],[17.59507,46.82017],[17.59655,46.82095],[17.59737,46.82043],[17.5972,46.82144],[17.60178,46.82415],[17.60361,46.82396],[17.60783,46.82538],[17.61994,46.82234],[17.62691,46.82538],[17.62848,46.82579],[17.62947,46.82503],[17.62898,46.82633],[17.63045,46.82709],[17.63093,46.82648],[17.6338,46.82626],[17.63442,46.82747],[17.63604,46.82804],[17.64255,46.82794],[17.64453,46.82859],[17.64657,46.83002],[17.6465,46.8356],[17.65167,46.84091],[17.65364,46.8417],[17.65326,46.84409],[17.66599,46.85234],[17.67078,46.85835],[17.67588,46.8616],[17.67748,46.86592],[17.68314,46.86777],[17.68462,46.86716],[17.68723,46.87054],[17.68953,46.87142],[17.69383,46.87506],[17.6998,46.87553],[17.70584,46.874],[17.70905,46.87201],[17.70809,46.87319],[17.70909,46.8735],[17.70998,46.8719],[17.70866,46.87166],[17.70933,46.87143],[17.7101,46.87315],[17.71167,46.87268],[17.71462,46.8739],[17.71376,46.87485],[17.71386,46.8781],[17.71546,46.87841],[17.72073,46.87777],[17.72591,46.87809],[17.72826,46.87914],[17.73535,46.87998],[17.74171,46.87893],[17.74232,46.87787],[17.74192,46.87892],[17.74288,46.87933],[17.75005,46.87946],[17.76195,46.88251],[17.77412,46.88294],[17.77555,46.88435],[17.7761,46.88703],[17.7789,46.8899],[17.78643,46.89238],[17.78732,46.8915],[17.79353,46.89405],[17.79354,46.89463],[17.79745,46.89523],[17.80101,46.897],[17.80309,46.89992],[17.80372,46.89962],[17.80322,46.90053],[17.80437,46.90205],[17.80613,46.90228],[17.80829,46.9035],[17.80794,46.90423],[17.81113,46.90539],[17.81479,46.90916],[17.82737,46.91099],[17.82689,46.91284],[17.82797,46.91505],[17.82928,46.91545],[17.82806,46.91691],[17.82871,46.9189],[17.83372,46.9235],[17.83523,46.92375],[17.8372,46.92234],[17.83883,46.9184],[17.84392,46.91667],[17.84877,46.91327],[17.85046,46.90332],[17.85583,46.90186],[17.86374,46.89754],[17.86467,46.89768],[17.87714,46.8899],[17.88237,46.88918],[17.88309,46.88812],[17.884,46.88826],[17.88287,46.88837],[17.88332,46.88891],[17.8843,46.88838],[17.891,46.88863],[17.89144,46.88783],[17.89149,46.88861],[17.89189,46.88809],[17.89179,46.88865],[17.89247,46.88822],[17.89301,46.88873],[17.89635,46.89605],[17.89732,46.89625],[17.89672,46.89693],[17.89823,46.89853],[17.89754,46.89921],[17.90001,46.8984],[17.89793,46.89986],[17.8989,46.90254],[17.89295,46.90799],[17.8948,46.91133],[17.8939,46.91376],[17.89238,46.91461],[17.89295,46.91715],[17.8939,46.91777],[17.8955,46.91709],[17.8902,46.91846],[17.88605,46.92259],[17.88344,46.92382],[17.87755,46.92466],[17.86955,46.92424],[17.86538,46.92525],[17.86601,46.92607],[17.86198,46.92719],[17.86279,46.92758],[17.85998,46.92972],[17.8596,46.93207],[17.86323,46.93411],[17.86589,46.93713],[17.86526,46.93794],[17.86747,46.93888],[17.86991,46.93763],[17.87104,46.93849],[17.86952,46.93771],[17.86751,46.93892],[17.86822,46.94008],[17.86891,46.93975],[17.86982,46.94057],[17.87123,46.93887],[17.87068,46.94035],[17.87717,46.94188],[17.88175,46.9453],[17.88241,46.94425],[17.88178,46.94535],[17.88378,46.94835],[17.89109,46.95081],[17.8906,46.95153],[17.89269,46.95222],[17.89241,46.95304],[17.89376,46.95307],[17.89464,46.95176],[17.89591,46.95198],[17.89387,46.95307],[17.89751,46.95477],[17.90323,46.95574],[17.90871,46.95493],[17.91364,46.95702],[17.91705,46.96068],[17.91585,46.96269],[17.91667,46.96245],[17.9161,46.9653],[17.91745,46.96737],[17.91915,46.96786],[17.92372,46.96679],[17.92429,46.96725],[17.92838,46.96593],[17.93108,46.96658]];
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

  /* ------------------------------------------------------------------ fények */
  function addLights(sunDir, soft) {
    const hemi = new THREE.HemisphereLight(0xd6e6f5, 0x4a5a48, soft ? 1.0 : .62);
    const sun = new THREE.DirectionalLight(0xfff0d8, soft ? 1.3 : 1.55); sun.position.copy(sunDir).multiplyScalar(100);
    const amb = new THREE.AmbientLight(0xffffff, soft ? .25 : .06);
    W.root.add(hemi, sun, amb); return { hemi, sun, amb };
  }
  /* a nézési irány beállítása (radián; 0 = −z felé) – VR-ben a fej aktuális irányához igazítva */
  function faceYaw(target) {
    const rig = T.rig; if (!rig) return;
    const lc = T.cam.components["look-controls"];
    if (!T.inVR) { if (lc && lc.yawObject) { lc.yawObject.rotation.y = 0; lc.pitchObject.rotation.x = 0; } rig.object3D.rotation.y = target; return; }
    rig.object3D.rotation.y += wrapA(target - T.camYaw());
  }

  /* ------------------------------------------------------------------ VR-PANEL (vászon-textúra; kéz/kontroller sugarával kezelhető) */
  const PW = 1100, PH = 760;
  function makePanel() {
    const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; W.disposables.push(tex);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.78, .78 * PH / PW), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    W.disposables.push(m.geometry, m.material); m.renderOrder = 995;
    const P = { m, cv, tex, btns: [], hov: -1, uv: null };
    m.userData.xr = {
      hover: (on, h) => { P.uv = on && h && h.uv ? h.uv : null; },
      move: (h) => { P.uv = h && h.uv ? h.uv : null; },
      click: (h) => { if (!h || !h.uv) return; const x = h.uv.x * PW, y = (1 - h.uv.y) * PH; const b = P.btns.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); if (b) { b.fn(); P.draw(); } },
      /* ÁTHELYEZÉS (2026. nov. 9., a tulajdonos kérése: „mindig útban van”): a panel fejlécét megfogva (csippentve) bárhová húzható a térben;
         a kéz előre-hátra mozdításával közelebb/távolabb tolható; elengedve ott marad, és a helyét világonként megjegyzi. */
      down: (h, S0, key) => { if (!h || !h.uv || !S0 || !S0.o) return; const x = h.uv.x * PW, y = (1 - h.uv.y) * PH; if (y > 165 || x > PW - 250) return;
        /* 2026-11-11 18:54 (tulajdonos: „a csippentés pillanatában eltávolodik tőlem, nem abból az állásból indul, ahol van”): a fogás a kéz PILLANATNYI sugarához
           képest rögzül (nem a korábbi találati ponthoz), a dőlése megmarad, és a kéz előre-hátra mozgása csak 5 cm holtjáték után, szelídebben (×2) tol rajta. */
        const head = T.headPos ? T.headPos() : null, dist0 = S0.d ? Math.max(.15, P.m.position.clone().sub(S0.o).dot(S0.d)) : h.distance, hp = S0.d ? S0.o.clone().addScaledVector(S0.d, dist0) : h.point.clone();
        P.drag = { key, dist: dist0, off: P.m.position.clone().sub(hp), hd0: head ? S0.o.distanceTo(head) : 0, tilt: P.m.rotation.x, t0: performance.now() };
        if (T.xr.press) T.xr.press[key] = null; try { T.xr.pulse && T.xr.pulse(key, .4, 20); } catch (e) {} },
      drag: (S0, key) => { const D = P.drag; if (!D || D.key !== key || !S0 || !S0.o || !S0.d) return; const head = T.headPos ? T.headPos() : null;
        let dh = head ? S0.o.distanceTo(head) - D.hd0 : 0; if (performance.now() - D.t0 < 350) { D.hd0 += dh; dh = 0; }   /* a csippentés első pillanatának kézrándulása nem számít */
        dh = Math.abs(dh) < .05 ? 0 : (dh - Math.sign(dh) * .05) * 2;
        const dist = clamp(D.dist + dh, .3, 4.5); const tgt = S0.o.clone().addScaledVector(S0.d, dist).add(D.off);
        P.m.position.lerp(tgt, .5); if (head) { const dx = P.m.position.x - head.x, dz = P.m.position.z - head.z; P.m.rotation.set(D.tilt, Math.atan2(-dx, -dz), 0, "YXZ"); } },
      up: () => { if (!P.drag) return; P.drag = null; W.panelPos = W.panelPos || {};
        /* a fejhez (és a nézési irányhoz) képest jegyezzük meg – így akkor is jó helyre kerül, ha közben a hajó / a nézőpont elmozdult */
        const head = (T.headPos && T.headPos()) || new THREE.Vector3(0, T.headY(), 0), yaw = T.camYaw(), d = P.m.position.clone().sub(head).applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
        W.panelPos[W.kind] = { rel: d.toArray(), r: wrapA(P.m.rotation.y - yaw), t: P.m.rotation.x };
        try { localStorage.setItem("zephyr-panelpos2", JSON.stringify(W.panelPos)); } catch (e) {} }
    };
    T.xr.extra.add(m);
    /* összecsukott állapot: kis fül, rámutatva/csippentve újra kinyílik */
    { const pc = document.createElement("canvas"); pc.width = 420; pc.height = 120; const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace; W.disposables.push(pt);
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(.21, .06), new THREE.MeshBasicMaterial({ map: pt, transparent: true, depthTest: false, depthWrite: false })); pm.renderOrder = 995; W.disposables.push(pm.geometry, pm.material);
      const pd = (hv) => { const g = pc.getContext("2d"); g.clearRect(0, 0, 420, 120); g.beginPath(); g.roundRect ? g.roundRect(4, 4, 412, 112, 56) : g.rect(4, 4, 412, 112); g.fillStyle = hv ? "#ffe08a" : "rgba(7,28,58,.9)"; g.fill(); g.lineWidth = 5; g.strokeStyle = "rgba(255,209,102,.9)"; g.stroke();
        g.fillStyle = hv ? "#0b2f5e" : "#fff"; g.font = "800 50px Inter, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("☰ Panel", 210, 62); pt.needsUpdate = true; };
      pd(false); pm.visible = false;
      pm.userData.xr = { hover: (on) => pd(on), click: () => { W.togglePanel(); pd(false); } };
      P.pill = pm; }
    P.draw = () => {
      const g = cv.getContext("2d"); P.btns = []; g.clearRect(0, 0, PW, PH);
      const bg = g.createLinearGradient(0, 0, 0, PH); bg.addColorStop(0, "rgba(16,42,68,.97)"); bg.addColorStop(1, "rgba(7,24,44,.97)");   /* VR 2.0 „Nautical Glass” */
      g.beginPath(); g.roundRect ? g.roundRect(5, 5, PW - 10, PH - 10, 40) : g.rect(5, 5, PW - 10, PH - 10); g.fillStyle = bg; g.fill(); g.lineWidth = 2.5; g.strokeStyle = "rgba(221,232,242,.30)"; g.stroke();
      let rowY = 0;
      /* hosszú szöveg: a betűméret addig csökken, amíg ki nem fér (ne lógjon ki a panelből) */
      const fitFont = (wt, fs, min, t, maxW) => { g.font = `${wt} ${fs}px Inter, system-ui, sans-serif`; while (fs > min && g.measureText(t).width > maxW) { fs -= 2; g.font = `${wt} ${fs}px Inter, system-ui, sans-serif`; } };
      const api = {
        title(t, s) { g.fillStyle = "#E4BB63"; g.textAlign = "left"; g.textBaseline = "middle"; fitFont(750, 48, 32, t, PW - 200); g.fillText(t, 44, 66); g.fillStyle = "#fff"; fitFont(600, 34, 22, s || "", PW - 88); g.fillText(s || "", 44, 122); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(40, 158, PW - 80, 2); },
        row(i, t, c, r) { const y = 210 + i * 66; g.fillStyle = c || "#fff"; g.beginPath(); g.arc(58, y, 11, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.textAlign = "left"; fitFont(600, 36, 22, t, PW - 84 - (r ? 220 : 44)); g.fillText(t, 84, y); if (r) { g.textAlign = "right"; g.fillStyle = "#7fd3ff"; g.fillText(r, PW - 50, y); } rowY = y; },
        buttons(list, row) {
          const n = list.length, gap = 16, w = (PW - 80 - gap * (n - 1)) / n, y = PH - 150 - (row || 0) * 126, h = 110;
          list.forEach(([lbl, fn, on], i) => {
            const x = 40 + i * (w + gap), k = P.btns.length, hov = k === P.hov; P.btns.push({ x, y, w, h, fn });
            g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 14; g.shadowOffsetY = 5;
            g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 26) : g.rect(x, y, w, h);
            const gr = g.createLinearGradient(0, y, 0, y + h);
            if (on) { gr.addColorStop(0, hov ? "#F0CC7A" : "#E4BB63"); gr.addColorStop(1, hov ? "#E4BB63" : "#D4A13A"); } else if (hov) { gr.addColorStop(0, "rgba(40,78,118,.98)"); gr.addColorStop(1, "rgba(28,60,96,.98)"); } else { gr.addColorStop(0, "rgba(20,48,78,.94)"); gr.addColorStop(1, "rgba(14,38,64,.94)"); }
            g.fillStyle = gr; g.fill(); g.restore();
            g.lineWidth = hov ? 5 : 2; g.strokeStyle = hov ? (on ? "#fff" : "#D4A13A") : on ? "rgba(255,255,255,.4)" : "rgba(221,232,242,.24)"; g.stroke();
            /* ha a felirat ikonnal kezdődik („🐟 Merülés”), az ikon nagyobban, fölötte */
            const m = /^(\S{1,3})\s+(.+)$/.exec(lbl), icon = m && !/[A-Za-zÁ-ű0-9]/.test(m[1]) ? m[1] : null, txt = icon ? m[2] : lbl;
            g.fillStyle = on ? "#07182C" : "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
            if (icon) { g.font = "800 40px Inter, system-ui, sans-serif"; g.fillText(icon, x + w / 2, y + h * .34); g.font = `700 ${txt.length > 12 || n > 5 ? 25 : 30}px Inter, system-ui, sans-serif`; g.fillText(txt, x + w / 2, y + h * .74); }
            else { g.font = `700 ${lbl.length > 14 || n > 5 ? 28 : 38}px Inter, system-ui, sans-serif`; g.fillText(lbl, x + w / 2, y + h / 2 + 2); }
          });
        }
      };
      if (W.spec && W.spec.panel) W.spec.panel(api);
      /* fogantyú-jel a fejléc tetején (itt fogd meg a húzáshoz) és „⟲ ide” gomb (visszahívja magad elé) */
      { g.fillStyle = "rgba(255,255,255,.55)"; for (let k = 0; k < 6; k++) for (let r2 = 0; r2 < 2; r2++) { g.beginPath(); g.arc(PW / 2 - 50 + k * 20, 20 + r2 * 14, 4.5, 0, TAU); g.fill(); }
        const x = PW - 240, y = 22, w = 96, h = 78, k = P.btns.length, hov = k === P.hov; P.btns.push({ x, y, w, h, fn: () => { if (W.panelPos) delete W.panelPos[W.kind]; try { localStorage.setItem("zephyr-panelpos2", JSON.stringify(W.panelPos || {})); } catch (e) {} placePanel(true); } });
        g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 22) : g.rect(x, y, w, h); g.fillStyle = hov ? "#ffe08a" : "rgba(255,255,255,.14)"; g.fill(); g.lineWidth = 2; g.strokeStyle = "rgba(255,255,255,.4)"; g.stroke();
        g.fillStyle = hov ? "#0b2f5e" : "#fff"; g.font = "800 44px Inter, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("⟲", x + w / 2, y + h / 2 + 2); }
      /* összecsukó gomb a jobb felső sarokban – a panel egy kis „☰ Panel” fülre zsugorodik */
      { const x = PW - 132, y = 22, w = 96, h = 78, k = P.btns.length, hov = k === P.hov; P.btns.push({ x, y, w, h, fn: () => W.togglePanel() });
        g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 22) : g.rect(x, y, w, h); g.fillStyle = hov ? "#ffe08a" : "rgba(255,255,255,.14)"; g.fill(); g.lineWidth = 2; g.strokeStyle = "rgba(255,255,255,.4)"; g.stroke();
        g.fillStyle = hov ? "#0b2f5e" : "#fff"; g.fillRect(x + 26, y + h / 2 + 8, w - 52, 9); }
      tex.needsUpdate = true;
    };
    P.tick = (dt) => {
      const hv = P.uv ? P.btns.findIndex((q) => { const x = P.uv.x * PW, y = (1 - P.uv.y) * PH; return x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h; }) : -1;
      if (hv !== P.hov) { P.hov = hv; P.draw(); }
      if ((W.panelDirty || 0) > .5) { W.panelDirty = 0; P.draw(); }
    };
    return P;
  }
  function placePill() {
    const P = W.panel; if (!P || !P.pill) return;
    if (!P.m.parent) placePanel();
    T.xr.extra.add(P.pill); P.pill.position.copy(P.m.position); P.pill.quaternion.copy(P.m.quaternion); P.pill.translateX(-.27); P.pill.translateY(.2);
    if (!P.pill.parent) T.sceneEl.object3D.add(P.pill);
  }
  function placePanel(fresh) {
    const P = W.panel; if (!P) return;
    if (!W.panelPos) { try { W.panelPos = JSON.parse(localStorage.getItem("zephyr-panelpos2") || "{}"); } catch (e) { W.panelPos = {}; } }
    const saved = !fresh && W.panelPos[W.kind];
    if (saved && saved.rel) { const head = (T.headPos && T.headPos()) || new THREE.Vector3(0, T.headY(), 0), yaw = T.camYaw();
      P.m.position.copy(head).add(new THREE.Vector3().fromArray(saved.rel).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)); P.m.rotation.set(typeof saved.t === "number" ? saved.t : -.15, saved.r + yaw, 0, "YXZ"); T.sceneEl.object3D.add(P.m); return; }
    const yaw = T.camYaw(), hy = T.headY();
    let a = yaw + (W.kind === "maquette" ? .62 : .55), d = W.kind === "sail" ? .85 : 1.05, y = hy - .25;
    if (W.kind === "chess") { a = yaw + .62; d = 1.0; y = hy - .3; }
    if (W.kind === "sail") { a = yaw + .62; y = hy - .38; }
    if (W.kind === "race") { a = yaw - .75; d = 1.1; y = hy - .15; }   /* a verseny panelje balra-előre, hogy a kormány és az orr szabad maradjon */
    /* 2026-11-11 10:51 TULAJDONOS: „VR-ben is állítsd vissza az alsó menüsort, mert mindig az a nagyon ronda jobb oldali menüsor van.” →
       a világok menüje VR-ben ALUL, középen van (mint a 2D-s alsó gombsor): a látómező alatt, pultszerűen megdöntve – előre nézve nem takar, lenézve kéznél van. */
    let tilt = -.2;
    if (W.kind !== "race") { a = yaw; d = .62; y = hy - .56; tilt = -.82; }
    P.m.position.set(-Math.sin(a) * d, y, -Math.cos(a) * d);
    P.m.rotation.set(tilt, a, 0, "YXZ");
    T.sceneEl.object3D.add(P.m);
  }

  /* ------------------------------------------------------------------ 2D KEZELŐFELÜLET (nagy betűk, nagy gombok) */
  function makeHud() {
    let el = document.getElementById("worldHud"); if (el) el.remove();
    el = document.createElement("div"); el.id = "worldHud";
    el.innerHTML = `<style>
      #worldHud{position:fixed;inset:0;pointer-events:none;z-index:70;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff}
      #worldHud .wh-top{position:absolute;left:max(16px,env(safe-area-inset-left));right:max(16px,env(safe-area-inset-right));top:calc(14px + env(safe-area-inset-top));display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}
      #worldHud .wh-back{pointer-events:auto;font:800 19px/1 inherit;padding:14px 20px;border-radius:999px;border:2px solid rgba(255,209,102,.9);background:linear-gradient(180deg,rgba(20,64,118,.95),rgba(9,34,70,.95));color:#fff;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.35)}
      #worldHud .wh-card{pointer-events:auto;padding:12px 18px;border-radius:20px;background:rgba(7,28,58,.82);border:1.5px solid rgba(255,255,255,.22);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);max-width:min(560px,100%)}
      #worldHud .wh-t{font:800 21px/1.25 inherit;color:#ffd166} #worldHud .wh-s{font:600 17px/1.35 inherit;margin-top:3px}
      #worldHud .wh-list{margin:8px 0 0;padding:0;list-style:none;font:600 16px/1.5 inherit;opacity:.95}
      #worldHud .wh-bot{position:absolute;left:0;right:0;bottom:calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 16px}
      #worldHud .wh-btns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
      #worldHud .wh-b{pointer-events:auto;font:800 18px/1 inherit;min-width:64px;padding:14px 18px;border-radius:16px;border:1.5px solid rgba(255,255,255,.35);background:rgba(7,28,58,.82);color:#fff;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}
      #worldHud .wh-b:active,#worldHud .wh-b.on{background:#ffd166;color:#0b2f5e;border-color:#ffd166}
      #worldHud .wh-steer .wh-b{min-width:110px;padding:20px 22px;font-size:26px}
      #worldHud .wh-steer .wh-b.wh-x{min-width:0;padding:14px 16px;font-size:16px}
      @media (max-width:600px){#worldHud .wh-steer .wh-b{min-width:64px;padding:14px 14px;font-size:20px}#worldHud .wh-steer .wh-b.wh-x{font-size:14px;padding:12px 10px}}
      #worldHud .wh-hint{font:600 15px/1.4 inherit;background:rgba(7,28,58,.7);padding:8px 14px;border-radius:12px;text-align:center}
      @media (max-width:600px){#worldHud .wh-t{font-size:19px}#worldHud .wh-s{font-size:16px}}
      #worldHud .wh-tog{pointer-events:auto;font:800 17px/1 inherit;padding:12px 18px;border-radius:999px;border:2px solid rgba(255,209,102,.9);background:rgba(7,28,58,.88);color:#ffd166;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35)}
      #worldHud.wh-min .wh-card,#worldHud.wh-min .wh-hint,#worldHud.wh-min .wh-btns:not(.wh-steer){display:none}
      @media (max-width:700px),(max-height:520px){#worldHud .wh-btns{gap:7px;max-height:38vh;overflow-y:auto;pointer-events:auto;-webkit-overflow-scrolling:touch}#worldHud .wh-b{font-size:15px;padding:10px 12px;min-width:0;border-radius:13px}#worldHud .wh-hint{font-size:13px;padding:6px 10px}#worldHud .wh-card{padding:9px 13px}#worldHud .wh-back{font-size:16px;padding:11px 15px}}
    </style><div class="wh-top"><button type="button" class="wh-back">‹ Vissza a sétához</button><div class="wh-card"><div class="wh-t"></div><div class="wh-s"></div><ul class="wh-list"></ul></div></div>
    <div class="wh-bot"><button type="button" class="wh-tog"></button><div class="wh-btns"></div><div class="wh-hint"></div></div>`;
    document.body.appendChild(el);
    el.querySelector(".wh-back").addEventListener("click", () => W.close());
    /* összecsukható menü (mobilon alapból összecsukva, hogy a jelenet látsszon); az állapotot megjegyezzük */
    { const tog = el.querySelector(".wh-tog"); let min; try { min = localStorage.getItem("zephyr-hud-min"); } catch (e) {}
      min = min == null ? (innerWidth < 700 || innerHeight < 520) : min === "1";
      const upd = () => { el.classList.toggle("wh-min", min); tog.textContent = min ? "☰ Menü" : "▾ Menü elrejtése"; };
      tog.addEventListener("click", () => { min = !min; try { localStorage.setItem("zephyr-hud-min", min ? "1" : "0"); } catch (e) {} upd(); }); upd(); }
    let lastBtns = "";
    const H = {
      el,
      draw() {
        const api = {
          title(t, s) { el.querySelector(".wh-t").textContent = t; el.querySelector(".wh-s").textContent = s || ""; },
          list(a) { el.querySelector(".wh-list").innerHTML = a.map((x) => `<li>${x}</li>`).join(""); },
          hint(t) { el.querySelector(".wh-hint").textContent = t; },
          buttons(list) {
            const key = list.map((x) => x[0] + (x[2] ? "*" : "")).join("|"); if (key === lastBtns) return; lastBtns = key;
            const box = el.querySelector(".wh-btns"); box.className = "wh-btns"; box.innerHTML = "";
            list.forEach(([lbl, fn, on]) => { const b = document.createElement("button"); b.type = "button"; b.className = "wh-b" + (on ? " on" : ""); b.textContent = lbl; b.addEventListener("click", () => { fn(); H.draw(); }); box.appendChild(b); });
          },
          steer(extra, onCenter) {   /* extra: további gombok a kormány mellé ([felirat, függvény]); onCenter: az „egyenesbe” saját kezelője */
            const key = "steer|" + (extra || []).map((x) => x[0]).join("|"); if (lastBtns === key) return; lastBtns = key;
            const box = el.querySelector(".wh-btns"); box.className = "wh-btns wh-steer"; box.innerHTML = "";
            [["◀", "L"], ["egyenesbe", "C"], ["▶", "R"]].forEach(([lbl, k]) => {
              const b = document.createElement("button"); b.type = "button"; b.className = "wh-b"; b.textContent = lbl;
              if (k === "C") b.addEventListener("click", () => { if (onCenter) onCenter(); else SAIL.del = 0; });
              else { const on = (v) => (e) => { e.preventDefault(); SAIL.keys[k] = v; b.classList.toggle("on", v); };
                b.addEventListener("pointerdown", on(true)); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, on(false))); }
              box.appendChild(b);
            });
            (extra || []).forEach(([lbl, fn]) => { const b = document.createElement("button"); b.type = "button"; b.className = "wh-b wh-x"; b.textContent = lbl; b.addEventListener("click", () => { fn(); lastBtns = ""; H.draw(); }); box.appendChild(b); });
          }
        };
        if (W.spec && W.spec.hud) W.spec.hud(api);
      }
    };
    return H;
  }

  /* ------------------------------------------------------------------ 2D egér / ujj: rámutatás és kattintás a 3D tárgyakon */
  const P2 = { down: null, hov: null };
  const ray2 = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick2D(e) {
    const cvs = T.sceneEl.canvas; const r = cvs.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray2.setFromCamera(ndc, T.camObj());
    const shown = (o) => { for (let q = o; q; q = q.parent) if (q.visible === false && !(q.material && q.material.visible === false && q === o)) return false; return !!o.parent; };
    const objs = W.objs.filter(shown);
    const hits = ray2.intersectObjects(objs, false);
    return hits[0] || null;
  }
  function on2DMove(e) { if (T.inVR || !W.active) return; const h = pick2D(e), o = h && h.object; if (o !== P2.hov) { if (P2.hov && P2.hov.userData.xr.hover) P2.hov.userData.xr.hover(false); P2.hov = o; if (o && o.userData.xr.hover) o.userData.xr.hover(true, h); T.sceneEl.canvas.style.cursor = o ? "pointer" : ""; } }
  function on2DDown(e) { P2.down = { x: e.clientX, y: e.clientY, t: performance.now() }; }
  function on2DUp(e) {
    if (!P2.down || T.inVR || !W.active) return; const d = Math.hypot(e.clientX - P2.down.x, e.clientY - P2.down.y); P2.down = null;
    if (d > 8) return;
    const h = pick2D(e); if (h && h.object.userData.xr.click) h.object.userData.xr.click(h);
  }
  function onKey(e, v) {
    if (!W.active || W.kind !== "sail") return;
    const k = e.key; if (k === "ArrowLeft" || k === "a" || k === "A") { SAIL.keys.L = v; e.preventDefault(); } if (k === "ArrowRight" || k === "d" || k === "D") { SAIL.keys.R = v; e.preventDefault(); }
  }
  const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false);

  /* ------------------------------------------------------------------ MEGNYITÁS / BEZÁRÁS */
  let saved = null;
  W.open = function (kind) {
    if (W.active) W.close(null, true);
    const sky = T.sky, sm = sky && sky.getObject3D("mesh");
    const lc0 = T.cam.components["look-controls"];
    saved = { rigY: T.rig.object3D.rotation.y, pitch: lc0 && lc0.pitchObject ? lc0.pitchObject.rotation.x : 0, yaw: lc0 && lc0.yawObject ? lc0.yawObject.rotation.y : 0, skyVis: sky.object3D.visible, spotsVis: T.spots.object3D.visible, clip: T.sceneEl.renderer.localClippingEnabled, scene: T.current,
      skyDepth: sm ? sm.material.depthTest : true, skyOrder: sm ? sm.renderOrder : 0 };
    W.kind = kind; W.active = true; W.t = 0; W.upd = []; W.objs = []; W.disposables = [];
    /* mélységpontosság: a séta kamerája near=0,005 / far=10000 – ezzel a távoli part, hajók, fák „villognak” (z-fighting).
       A 3D világokban near=0,06, far=4000: a kéz és a kormány így is rendben látszik, a háttér pedig stabil. */
    { const ca = T.cam.getAttribute("camera") || {}; saved.camNear = ca.near != null ? ca.near : .005; saved.camFar = ca.far != null ? ca.far : 10000; T.cam.setAttribute("camera", { near: .06, far: 4000 }); const cm = T.sceneEl.camera; if (cm) { cm.near = .06; cm.far = 4000; cm.updateProjectionMatrix(); } }
    T.setBusy(true);
    const root = new THREE.Group(); root.name = "zephyr-world"; T.sceneEl.object3D.add(root); W.root = root;
    T.spots.object3D.visible = false; if (T.sky2) T.sky2.object3D.visible = false;
    const tok = W.gen = (W.gen || 0) + 1;
    const safe = (f) => { try { f(); } catch (e) { console.warn("world", e); W.close(); } };
    if (kind === "regatta") {
      const go = () => safe(() => {
        sky.object3D.visible = true; if (sm) { sm.material.depthTest = false; sm.material.depthWrite = false; sm.renderOrder = -100; sm.material.needsUpdate = true; }
        W.spec = buildRegatta(); finishOpen();
      });
      if (T.current !== "steg") { T.setBusy(false); T.go("steg"); setTimeout(() => { if (tok !== W.gen || !W.active) return; T.setBusy(true); T.spots.object3D.visible = false; go(); }, 1400); } else go();
      return;
    }
    sky.object3D.visible = false;
    safe(() => { W.spec = kind === "race" ? buildVRace() : kind === "coaster" || kind === "table" ? buildCoaster() : kind === "chess" ? lodBuild(buildChess) : kind === "sail" ? buildSail() : buildMaquette(); finishOpen(); });
  };
  /* 2026-11-11 TELEFONOS KÖNNYÍTÉS (a vitorlás sakk 865 ezer háromszöget rajzolt – ettől melegedett a telefon): telefonon (nem VR-ben) az építés idejére
     a gömbök, hengerek, tóruszok, kapszulák, kúpok, esztergált és cső-testek felbontását kb. a felére vesszük – a formák ugyanazok, csak kevesebb lapból.
     Kényszerítés teszthez: localStorage zephyr-lod = 1 (be) / 0 (ki). */
  function lodBuild(fn) {
    let on = false; try { const f = localStorage.getItem("zephyr-lod"); on = f === "1" || (f !== "0" && !T.inVR && document.documentElement.dataset.device === "phone"); } catch (e) {}
    if (!on) return fn();
    const R = (v, d, mn, k) => Math.max(mn, Math.round((v == null ? d : v) * (k || .5))), keep = {}, set = (n, f) => { keep[n] = THREE[n]; const O = THREE[n]; const N = function () { return f(O, Array.prototype.slice.call(arguments)); }; N.prototype = O.prototype; THREE[n] = N; };
    try {
      set("SphereGeometry", (O, a) => new O(a[0], R(a[1], 32, 7), R(a[2], 16, 5), a[3], a[4], a[5], a[6]));
      set("CylinderGeometry", (O, a) => new O(a[0], a[1], a[2], R(a[3], 32, 5), a[4] > 2 ? R(a[4], 1, 1) : a[4], a[5], a[6], a[7]));
      set("ConeGeometry", (O, a) => new O(a[0], a[1], R(a[2], 32, 5), a[3] > 2 ? R(a[3], 1, 1) : a[3], a[4], a[5], a[6]));
      set("TorusGeometry", (O, a) => new O(a[0], a[1], R(a[2], 12, 4), R(a[3], 48, 8), a[4]));
      set("CapsuleGeometry", (O, a) => new O(a[0], a[1], R(a[2], 4, 2), R(a[3], 8, 5)));
      set("LatheGeometry", (O, a) => new O(a[0], R(a[1], 12, 7), a[2], a[3]));
      set("TubeGeometry", (O, a) => new O(a[0], R(a[1], 64, 6, .6), a[2], R(a[3], 8, 3, .6), a[4]));
    } catch (e) { Object.keys(keep).forEach((n) => { try { THREE[n] = keep[n]; } catch (e2) {} }); return fn(); }
    W.lod = true; try { return fn(); } finally { W.lod = false; Object.keys(keep).forEach((n) => { try { THREE[n] = keep[n]; } catch (e2) {} }); }
  }
  function finishOpen() {
    document.body.classList.add("world-on");
    W.hud = makeHud(); W.hud.el.style.display = T.inVR ? "none" : ""; W.hud.draw();
    W.panel = makePanel(); W.panel.draw();
    if (T.inVR) { placePanel(); if (W.panelHidden) { T.xr.extra.delete(W.panel.m); placePill(); } }
    const cvs = T.sceneEl.canvas;
    cvs.addEventListener("pointermove", on2DMove); cvs.addEventListener("pointerdown", on2DDown); cvs.addEventListener("pointerup", on2DUp);
    addEventListener("keydown", kd); addEventListener("keyup", ku);
    W.hudT = 0;
  }
  W.tick = function (dt) {
    if (!W.active || !W.spec) return;
    W.t += dt;
    W.upd.forEach((f) => f(dt));
    W.spec.tick(dt);
    if (W.panel) { W.panel.m.visible = T.inVR && !W.panelHidden; if (W.panel.pill) { W.panel.pill.visible = false; T.xr.extra.delete(W.panel.pill); }   /* 2026-11-11 (tulajdonos): a bezárt menü után SEMMI nem marad a térben – a kis „Menü” fül megszűnt; visszahozás: tenyérmozdulat, csuklóóra vagy lenézve az öv-gomb */ if (T.inVR) W.panel.tick(dt); }
    W.hudT += dt; if (!T.inVR && W.hud && W.hudT > .4) { W.hudT = 0; W.hud.draw(); }
  };
  W.togglePanel = function () {
    if (!W.panel) return; W.panelHidden = !W.panelHidden;
    const P = W.panel;
    if (W.panelHidden && P.pill) {   /* a fül a panel bal felső sarkánál marad, ugyanabban az irányban */
      T.xr.extra.delete(P.m); placePill();
    }
    if (!W.panelHidden) { if (P.pill) T.xr.extra.delete(P.pill); T.xr.extra.add(P.m); placePanel(); }
  };
  W.vrChanged = function (on) {
    if (!W.active) return;
    if (W.hud) W.hud.el.style.display = on ? "none" : "";
    /* a szemmagasság VR-ben más – újraépítjük, de csak ha már van fej-póz (különben 0 m-t mérnénk) */
    const k = W.kind, tok = W.gen; let n = 0;
    const tryIt = () => { if (tok !== W.gen) return; if (!on || T.headY() > .5 || ++n > 90) { W.close(null, true); W.open(k); } else T.xrRaf(tryIt); };
    tryIt();
  };
  W.close = function (after, silent) {
    if (!W.active) { if (after) after(); return; }
    W.active = false; W.gen = (W.gen || 0) + 1;
    audioStop();
    if (W.onClose) { try { W.onClose(); } catch (e) {} W.onClose = null; }
    const cvs = T.sceneEl.canvas;
    cvs.removeEventListener("pointermove", on2DMove); cvs.removeEventListener("pointerdown", on2DDown); cvs.removeEventListener("pointerup", on2DUp); cvs.style.cursor = "";
    removeEventListener("keydown", kd); removeEventListener("keyup", ku);
    W.objs.forEach((o) => T.xr.extra.delete(o));
    if (T.xrForget) T.xrForget(W.objs.concat(W.panel ? [W.panel.m].concat(W.panel.pill ? [W.panel.pill] : []) : []));
    if (W.panel) { T.xr.extra.delete(W.panel.m); if (W.panel.m.parent) W.panel.m.parent.remove(W.panel.m); const pl = W.panel.pill; if (pl) { T.xr.extra.delete(pl); if (pl.parent) pl.parent.remove(pl); } }
    if (W.root && W.root.parent) W.root.parent.remove(W.root);
    W.root && W.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    W.disposables.forEach((d) => { try { d.dispose(); } catch (e) {} });
    Object.keys(TEXC).forEach((k) => delete TEXC[k]); Object.keys(TX).forEach((k) => delete TX[k]); Object.keys(HX).forEach((k) => delete HX[k]);
    W.disposables = []; W.objs = []; W.root = null; W.panel = null; W.spec = null;
    if (W.hud) { W.hud.el.remove(); W.hud = null; }
    document.body.classList.remove("world-on");
    const sky = T.sky, sm = sky && sky.getObject3D("mesh");
    if (saved) {
      sky.object3D.visible = true; T.spots.object3D.visible = true;
      if (saved.camNear != null) { T.cam.setAttribute("camera", { near: saved.camNear, far: saved.camFar }); const cm = T.sceneEl.camera; if (cm) { cm.near = saved.camNear; cm.far = saved.camFar; cm.updateProjectionMatrix(); } }
      if (sm) { sm.material.depthTest = saved.skyDepth; sm.material.depthWrite = true; sm.renderOrder = saved.skyOrder; sm.material.needsUpdate = true; }
      T.sceneEl.renderer.localClippingEnabled = saved.clip;
      if (!T.inVR) { T.rig.object3D.rotation.y = saved.rigY; const lc1 = T.cam.components["look-controls"]; if (lc1 && lc1.pitchObject) { lc1.pitchObject.rotation.x = saved.pitch; lc1.yawObject.rotation.y = saved.yaw; } }
    }
    T.setBusy(false);
    if (after) setTimeout(after, 50);
  };
  W.active = false;
})();
