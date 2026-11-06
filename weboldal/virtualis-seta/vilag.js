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
    const sp = new THREE.Sprite(basic({ map: t, transparent: true, depthTest: false, depthWrite: false }));
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
    const RINGS = opt.rings || 110, SEG = opt.seg || 150, R0 = .6, RMAX = opt.rmax || 1600;
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
        uSunC: { value: new THREE.Color(1, .95, .82) }, uHaze: { value: new THREE.Color(.84, .89, .91) }, uLight: { value: 1 }, uSpec: { value: 1 } },
      vertexShader: `
        uniform float uT, uWind; uniform vec2 uOff; uniform vec4 uW[5];
        varying vec3 vP; varying vec3 vN; varying float vDist;
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
          vDist = length(p.xz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform float uT, uWind, uLight, uSpec; uniform vec3 uSun, uCam, uSkyH, uSkyZ, uDeep, uShallow, uSunC, uHaze; uniform vec2 uGust;
        varying vec3 vP; varying vec3 vN; varying float vDist;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
        void main(){
          vec2 wd = vec2(cos(uWind), sin(uWind));
          /* apró fodrok (2 réteg, a szél irányában vándorol) – a távolban elhalványul */
          float fa = 1. - smoothstep(30., 260., vDist);
          vec2 q1 = vP.xz * 1.9 - wd * uT * 1.3, q2 = vP.xz * 4.7 + vec2(-wd.y, wd.x) * uT * .9;
          float e = .06;
          vec2 g1 = vec2(vn(q1 + vec2(e,0)) - vn(q1 - vec2(e,0)), vn(q1 + vec2(0,e)) - vn(q1 - vec2(0,e))) / (2.*e);
          vec2 g2 = vec2(vn(q2 + vec2(e,0)) - vn(q2 - vec2(e,0)), vn(q2 + vec2(0,e)) - vn(q2 - vec2(0,e))) / (2.*e);
          /* széllökés-foltok: sötétebb, fodrosabb sávok vándorolnak a vízen */
          float gust = smoothstep(.45, .8, vn(vP.xz * .012 - wd * uT * .05 + uGust * 3.));
          vec3 n = normalize(vN + vec3(g1.x * .07 + g2.x * .035, 0., g1.y * .07 + g2.y * .035) * fa * (1. + gust * .9));
          /* nézési irány a fragmenshez (világkoordináta) */
          vec3 P = vec3(vP.x, vP.y, vP.z);
          vec3 view = normalize(uCam - P);
          float fres = .02 + .98 * pow(1. - max(dot(n, view), 0.), 5.);
          vec3 refl = reflect(-view, n); float el = clamp(refl.y, 0., 1.);
          vec3 sky = mix(uSkyH, uSkyZ, pow(el, .45));
          vec3 base = mix(uShallow, uDeep, clamp(.5 + n.x * 2.5, 0., 1.)) * (1. - gust * .18) * uLight;
          vec3 col = mix(base, sky, fres * .7);
          float sp = pow(max(dot(refl, uSun), 0.), 380.) * 7. + pow(max(dot(refl, uSun), 0.), 40.) * .25;
          col += uSunC * sp * uSpec * (1. - gust * .3);
          /* hullámtaraj: halvány fehér hab a meredek részeken */
          col = mix(col, vec3(.92,.95,.95) * uLight, smoothstep(.72, .95, 1. - n.y) * .45 * fa);
          /* pára a horizont felé */
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
      for (let b = 75; b <= 287; b += .2) { let e = .42 + .25 * Math.abs(ns(b, 1.7)) + .12 * Math.abs(ns(b, 5.3)); if (b < 95 || b > 270) e *= .55; south.push([b, e]); }
      south.push([288, .05]);
      layer(south, "rgba(52,80,52,.97)");
      for (let k = 0; k < 340; k++) { const b = 90 + rand() * 180; const e = .12 + rand() * .22; g.fillStyle = rand() < .6 ? `rgba(240,236,226,.85)` : `rgba(180,70,52,.8)`; g.fillRect(X(b), yOf(e), 3 + rand() * 6, 3 + rand() * 4); }
      /* parti nádas sáv */
      g.fillStyle = "rgba(150,140,82,.9)"; g.fillRect(X(75), yOf(.07), X(287) - X(75), yOf(0) - yOf(.07) + 1);
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
      if (o.logo) { g.font = "900 72px Georgia, serif"; g.fillStyle = "#c62828"; g.fillText(o.logo, w * .48, h * .58); }
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
    const x = side * s.hb * Math.pow(Math.sin(th * Math.PI / 2), .42);
    const y = -s.depth + (s.depth + s.sheer) * Math.pow(th, 2.1);
    return [x, y, s.z];
  }
  function buildHull(o) {
    const NU = 34, NT = 12, pos = [], col = [], idx = [];
    const cHull = new THREE.Color(o.hull), cBoot = new THREE.Color(o.boot), cAF = new THREE.Color("#1a2236"), cStripe = new THREE.Color(o.stripe);
    const colorAt = (y, sheer) => y < -.01 ? cAF : y < .09 ? cBoot : (y > sheer - .1 && y < sheer - .045 ? cStripe : cHull);
    for (const side of [-1, 1]) {
      const base = pos.length / 3;
      for (let i = 0; i <= NU; i++) { const u = i / NU; for (let j = 0; j <= NT; j++) { const p = hullPoint(u, j / NT, side); pos.push(...p); const c = colorAt(p[1], hullShape(u).sheer); col.push(c.r, c.g, c.b); } }
      for (let i = 0; i < NU; i++) for (let j = 0; j < NT; j++) {
        const a = base + i * (NT + 1) + j, b = a + 1, c = a + NT + 1, d = c + 1;
        if (side > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
      }
    }
    /* tükör (tatfal): a két oldal u=0 szelvénye közötti lap */
    const tb = pos.length / 3; const s0 = hullShape(0);
    for (let j = 0; j <= NT; j++) { const p = hullPoint(0, j / NT, -1); pos.push(...p); const q = hullPoint(0, j / NT, 1); pos.push(...q); const c = colorAt(p[1], s0.sheer); col.push(c.r, c.g, c.b, c.r, c.g, c.b); }
    for (let j = 0; j < NT; j++) { const a = tb + j * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    W.disposables.push(g); return g;
  }
  /* fedélzet: elöl teljes szélességű, a kokpitnál csak az oldalfedélzetek; enyhe domborulat */
  const CK = { u0: .02, u1: .335, w: 1.52, sole: .30, seat: .66 };
  function buildDeck(detail) {
    const NU = 34, NX = 10, pos = [], uv = [], idx = [];
    const push = (x, y, z) => { pos.push(x, y, z); uv.push(x / 1.2, z / 1.2); };
    const strip = (u0, u1, xa, xb) => {   /* xa, xb: a fedélzet keresztirányú tartománya (−1..1 a félszélesség arányában vagy abszolút) */
      for (let i = 0; i <= NU; i++) {
        const u = u0 + (u1 - u0) * i / NU, s = hullShape(u);
        for (let j = 0; j <= NX; j++) { const f = j / NX; let x = xa(s) + (xb(s) - xa(s)) * f; x = clamp(x, -s.hb, s.hb); const camber = .07 * (1 - (x / Math.max(s.hb, .01)) ** 2); push(x, s.sheer + camber, s.z); }
      }
      const b0 = pos.length / 3 - (NU + 1) * (NX + 1);
      for (let i = 0; i < NU; i++) for (let j = 0; j < NX; j++) { const a = b0 + i * (NX + 1) + j, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
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
  function makeBoat(o) {
    o = Object.assign({ detail: 0, hull: "#eeeeea", boot: "#1d3a8a", stripe: "#1d3a8a", main: "#f4f2ea", jib: "#efeee6", num: "HUN 1", crew: 3, spin: ["#e5262f", "#ffffff", "#1f5fa8"], deckCol: "#e6e7e6" }, o);
    const G = new THREE.Group(), body = new THREE.Group(); G.add(body);   /* body: dőlés + bólintás */
    const hullMat = std({ vertexColors: true, roughness: .32, metalness: .05 });
    mesh(buildHull(o), hullMat, body);
    const deckMat = std({ color: "#d9dbdb", map: nonslipTex(), roughness: .9 });
    mesh(buildDeck(o.detail), deckMat, body);
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
    if (o.detail) {
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
      const comp = mesh(new THREE.PlaneGeometry(.62, .38), dark, body); comp.position.set(0, CK.sole + .52, cz0 - .002); comp.rotation.y = Math.PI;
      /* elülső tetőablak */
      const fh = mesh(new THREE.BoxGeometry(.5, .04, .5), glass, body); fh.position.set(0, hullShape(.42).sheer + .48, .9);
    }
    /* kokpit: padló, ülések teakkal, peremek, kormányrúd, csörlők */
    const ck = new THREE.Group(); body.add(ck);
    const ckz0 = hullShape(CK.u0).z, ckz1 = hullShape(CK.u1).z, ckL = ckz1 - ckz0;
    if (o.detail) {
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
      const it = canvasTex(512, 256, (g) => { g.fillStyle = "#0b0f14"; g.fillRect(0, 0, 512, 256); });
      const inst = mesh(new THREE.PlaneGeometry(.36, .18), basic({ map: it }), ck); inst.position.set(-.48, CK.sole + .62, cz0 - .004); inst.rotation.y = Math.PI;
      G.userData.instTex = it;
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
    /* korlátok és oszlopok (csak a részletes hajón) */
    if (o.detail) {
      const posts = [];
      for (let u = .06; u <= .88; u += .1) { const s = hullShape(u); [-1, 1].forEach((sd) => { const b = new THREE.Vector3(sd * (s.hb - .07), s.sheer + .05, s.z); const t = b.clone(); t.y += .62; posts.push([b, t, sd]); parts.push(rodGeom(b, t, .013, 6)); }); }
      [-1, 1].forEach((sd) => { const ps = posts.filter((p) => p[2] === sd); for (let i = 0; i < ps.length - 1; i++) { [.62, .32].forEach((h) => parts.push(rodGeom(ps[i][0].clone().setY(ps[i][0].y + h), ps[i + 1][0].clone().setY(ps[i + 1][0].y + h), .004, 4))); } });
      /* orrkorlát (pulpit) */
      const pu = []; for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + k / 8 * Math.PI; pu.push(new THREE.Vector3(Math.sin(a) * .42, hullShape(.95).sheer + .62, HULL.L / 2 - .55 + Math.cos(a) * .28)); }
      for (let k = 0; k < pu.length - 1; k++) parts.push(rodGeom(pu[k], pu[k + 1], .014, 6));
      [-1, 1].forEach((sd) => parts.push(rodGeom(new THREE.Vector3(sd * .42, hullShape(.93).sheer + .05, HULL.L / 2 - .55), new THREE.Vector3(sd * .42, hullShape(.93).sheer + .62, HULL.L / 2 - .55), .014, 6)));
    }
    mesh(mergeGeoms(parts), wire, body);
    /* bum (forog az árbóc körül) */
    const boomG = new THREE.Group(); boomG.position.set(0, mastBase + .92, mastZ); body.add(boomG);
    const bg = new THREE.BoxGeometry(.08, .13, 3.45); bg.translate(0, 0, -3.45 / 2); mesh(bg, alu, boomG);
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
    /* legénység (kikötve ülnek a szél felőli oldalon) */
    const crew = [];
    const skin = std({ color: "#d9a988", roughness: .7 });
    for (let k = 0; k < (o.crew || 0); k++) {
      const c = new THREE.Group(); const vest = std({ color: o.crewCol || ["#ff7a00", "#e5262f", "#ffd166"][k % 3], roughness: .7 });
      const torso = mesh(new THREE.CapsuleGeometry(.17, .38, 4, 10), vest, c); torso.position.y = .42;
      const head = mesh(new THREE.SphereGeometry(.11, 12, 10), skin, c); head.position.y = .84;
      const cap = mesh(new THREE.SphereGeometry(.115, 12, 8, 0, TAU, 0, Math.PI / 2), std({ color: "#ffffff" }), c); cap.position.y = .87;
      const legs = mesh(new THREE.CapsuleGeometry(.08, .55, 3, 8), std({ color: "#2b3445" }), c); legs.position.set(0, .18, .0); legs.rotation.z = Math.PI / 2.4;
      body.add(c); crew.push({ g: c, z: -2.6 + k * .75, legs });
    }
    /* vitorlák alakja: bumszög (rad, + = jobbra), génua-szög, oldal, fileelés (lobogás), spinakker */
    const S = { boom: .15, jib: .2, side: 1, luff: 0, heel: 0, pitch: 0, spin: 0, t: 0, crewSide: 1 };
    function updMain() {
      const pa = mainG.attributes.position.array, { nu, nv } = mainG.userData;
      const y0 = mastBase + .92, yh = mastBase + mastH - .25, foot = 3.3, a = S.boom, side = S.side;
      for (let j = 0; j <= nv; j++) {
        const v = j / nv, y = y0 + (yh - y0) * v;
        const chord = foot * ((1 - v) * (1 + .26 * Math.sin(Math.PI * v))) + .16 * v;
        const tw = a + side * .22 * v;   /* a vitorla csavarodása felfelé */
        const dx = Math.sin(tw), dz = -Math.cos(tw);
        const camber = .11 * (1 - v * .35);
        for (let i = 0; i <= nu; i++) {
          const u = i / nu, k = (j * (nu + 1) + i) * 3;
          let depth = chord * camber * Math.sin(Math.PI * Math.pow(u, .8));
          if (S.luff > 0) depth = depth * (1 - S.luff) + S.luff * chord * .06 * Math.sin(S.t * 17 + u * 7 + v * 4);
          pa[k] = dx * u * chord + Math.cos(tw) * depth * side;
          pa[k + 1] = y - u * .12 * (1 - v);
          pa[k + 2] = mastZ - .07 + dz * u * chord + Math.sin(tw) * depth * side;
        }
      }
      mainG.attributes.position.needsUpdate = true; mainG.computeVertexNormals();
      boomG.rotation.y = -a;
    }
    function updJib() {
      const pa = jibG.attributes.position.array, { nu, nv } = jibG.userData;
      const tack = _a.set(0, hullShape(1).sheer + .1, HULL.L / 2 - .25);
      const head = _b.set(0, foreH - .25, mastZ + .1 + (HULL.L / 2 - .25 - mastZ - .1) * .03);
      const ja = S.jib, side = S.side, foot = 4.55;
      const clew = _c.set(tack.x + Math.sin(ja) * foot * side, hullShape(.5).sheer + .42 + ja * .5, tack.z - Math.cos(ja) * foot);
      _n.subVectors(head, tack).cross(_p.subVectors(clew, tack)).normalize(); if (_n.x * side < 0) _n.negate();
      for (let j = 0; j <= nv; j++) {
        const v = j / nv;
        for (let i = 0; i <= nu; i++) {
          const u = i / nu, k = (j * (nu + 1) + i) * 3;
          const lx = tack.x + (head.x - tack.x) * v, ly = tack.y + (head.y - tack.y) * v, lz = tack.z + (head.z - tack.z) * v;
          const ex = clew.x + (head.x - clew.x) * v, ey = clew.y + (head.y - clew.y) * v, ez = clew.z + (head.z - clew.z) * v;
          const chord = Math.hypot(ex - lx, ey - ly, ez - lz);
          let depth = chord * .13 * Math.sin(Math.PI * Math.pow(u, .75)) * (1 - v * .4);
          if (S.luff > 0) depth = depth * (1 - S.luff) + S.luff * chord * .08 * Math.sin(S.t * 19 + u * 8 + v * 6);
          pa[k] = lx + (ex - lx) * u + _n.x * depth; pa[k + 1] = ly + (ey - ly) * u + _n.y * depth; pa[k + 2] = lz + (ez - lz) * u + _n.z * depth;
        }
      }
      jibG.attributes.position.needsUpdate = true; jibG.computeVertexNormals();
    }
    function updSpin() {
      if (!spinM) return; spinM.visible = S.spin > .02; if (!spinM.visible) { jibM.visible = true; return; }
      jibM.visible = S.spin < .6;
      const pa = spinG.attributes.position.array, { nu, nv } = spinG.userData, side = S.side, k0 = S.spin;
      const tack = _a.set(0, hullShape(1).sheer + .15, HULL.L / 2 + .8);
      const head = _b.set(0, mastBase + mastH * .96, mastZ + .3);
      const clew = _c.set(side * 3.4 * k0, hullShape(.5).sheer + 1.4, -.6);
      for (let j = 0; j <= nv; j++) { const v = j / nv;
        for (let i = 0; i <= nu; i++) { const u = i / nu, k = (j * (nu + 1) + i) * 3;
          const lx = tack.x + (head.x - tack.x) * v, ly = tack.y + (head.y - tack.y) * v, lz = tack.z + (head.z - tack.z) * v;
          const ex = clew.x + (head.x - clew.x) * v, ey = clew.y + (head.y - clew.y) * v, ez = clew.z + (head.z - clew.z) * v;
          const bulge = 2.3 * k0 * Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, v * 1.15 + .05));
          pa[k] = lx + (ex - lx) * u + side * bulge * .55; pa[k + 1] = ly + (ey - ly) * u + bulge * .1; pa[k + 2] = lz + (ez - lz) * u + bulge * .95;
        } }
      spinG.attributes.position.needsUpdate = true; spinG.computeVertexNormals();
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
    G.userData.update = (dt) => {
      S.t += dt;
      body.rotation.set(S.pitch, 0, S.heel, "YXZ");
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
    { name: "Zephyr", num: "HUN 27", hull: "#f7f7f4", boot: "#c62828", stripe: "#c62828", jib: "#d61f26", main: "#f6f4ec", spin: ["#d61f26", "#ffffff", "#d61f26"], skill: 1.02, logo: "ZEPHYR", uv: "rgba(255,255,255,.85)" },
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
      const g = makeBoat(Object.assign({ detail: 0, crew: 3 }, b)); course.add(g);
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
    const boat = makeBoat({ detail: 1, crew: 0, hull: "#eeeeea", boot: "#c62828", stripe: "#c62828", jib: "#d61f26", main: "#f6f4ec", num: "HUN 27", name: "ZEPHYR", logo: "ZEPHYR", cls: "R27", uv: "rgba(255,255,255,.9)" });
    boat.rotation.y = Math.PI; root.add(boat); SAIL.boat = boat;
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
      const g = makeBoat(Object.assign({ detail: 0, crew: 2 }, b)); env.add(g);
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
  const VRR = {};
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
    /* a két kerék: talapzat (karbon oszlop), tetején iránytű-búra és műszer; a kerék karbon, bőrrel bevont peremmel, 6 küllővel */
    const WR = .62, wheels = [];
    const instT = canvasTex(512, 512, (gg) => { gg.fillStyle = "#06090d"; gg.fillRect(0, 0, 512, 512); });
    [-1, 1].forEach((sd) => {
      const x = sd * (hs.hb - .78), z = hs.z + .55;
      const ped = new THREE.Group(); G.add(ped); ped.position.set(x, deckY, z);
      const col = mesh(new THREE.CylinderGeometry(.075, .11, 1.0, 16), carbon, ped); col.position.y = .5;
      const foot = mesh(new THREE.CylinderGeometry(.2, .24, .04, 20), chrome, ped); foot.position.y = .02;
      const head = mesh(new THREE.BoxGeometry(.26, .18, .3), carbon, ped); head.position.set(0, 1.04, -.02);
      const dome = mesh(new THREE.SphereGeometry(.1, 20, 12, 0, TAU, 0, Math.PI / 2), std({ color: "#20303e", roughness: .05, metalness: .3, transparent: true, opacity: .75 }), ped); dome.position.set(0, 1.13, -.05);
      const card = mesh(new THREE.CylinderGeometry(.085, .085, .02, 24), std({ color: "#f2e6c8", roughness: .5 }), ped); card.position.set(0, 1.14, -.05);
      /* a műszerkijelző a talapzat tetején, a kormányos felé döntve (élő adatok) */
      const scr = mesh(new THREE.PlaneGeometry(.24, .24), basic({ map: instT }), ped); scr.position.set(0, 1.1, -.18); scr.rotation.set(-.55, Math.PI, 0);
      /* kapaszkodó a talapzat előtt (rozsdamentes cső) */
      const [gb, mb] = rodGeom(new THREE.Vector3(-.22, 0, .25), new THREE.Vector3(-.22, .95, .1), .016, 8); mesh(gb, chrome, ped).applyMatrix4(mb);
      const [gb2, mb2] = rodGeom(new THREE.Vector3(.22, 0, .25), new THREE.Vector3(.22, .95, .1), .016, 8); mesh(gb2, chrome, ped).applyMatrix4(mb2);
      const [gb3, mb3] = rodGeom(new THREE.Vector3(-.22, .95, .1), new THREE.Vector3(.22, .95, .1), .016, 8); mesh(gb3, chrome, ped).applyMatrix4(mb3);
      /* tengely + kerék (a kerék síkja keresztirányú; a kormányos a tat felől áll mögötte) */
      const axle = mesh(new THREE.CylinderGeometry(.035, .035, .34, 12), chrome, ped); axle.rotation.x = Math.PI / 2; axle.position.set(0, .8, -.24);
      const wheel = new THREE.Group(); ped.add(wheel); wheel.position.set(0, .8, -.42);
      const spin = new THREE.Group(); wheel.add(spin);
      mesh(new THREE.TorusGeometry(WR, .028, 12, 72), carbon, spin);
      const grip = mesh(new THREE.TorusGeometry(WR, .034, 10, 72, TAU * .999), leather, spin); grip.scale.set(1, 1, .85);
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
      wheels.push({ sd, ped, wheel, spin, hit });
    });
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
    /* a legénység: négy trimmelő a szél felőli oldalon (térdelve, kötéllel a kezükben) – átülnek forduláskor */
    const crew = [];
    const skin = std({ color: "#d9a988", roughness: .7 });
    [[.3, "#e5262f"], [.38, "#0b2f5e"], [.47, "#e5262f"], [.56, "#0b2f5e"]].forEach(([u, c]) => { const g2 = new THREE.Group(); G.add(g2);
      const v = std({ color: c, roughness: .75 });
      const torso = mesh(new THREE.CapsuleGeometry(.19, .42, 4, 10), v, g2); torso.position.y = .5;
      const head = mesh(new THREE.SphereGeometry(.12, 14, 10), skin, g2); head.position.y = .98;
      const cap = mesh(new THREE.SphereGeometry(.125, 14, 8, 0, TAU, 0, Math.PI / 2), std({ color: "#ffffff" }), g2); cap.position.y = 1.01;
      const visor = mesh(new THREE.BoxGeometry(.16, .015, .12), std({ color: "#0b2f5e" }), g2); visor.position.set(0, 1.0, .14);
      const legs = mesh(new THREE.CapsuleGeometry(.09, .5, 3, 8), std({ color: "#20252c" }), g2); legs.position.set(0, .14, .2); legs.rotation.x = Math.PI / 2;
      const arm = mesh(new THREE.CapsuleGeometry(.055, .4, 3, 8), v, g2); arm.position.set(0, .6, .28); arm.rotation.x = 1.1;
      crew.push({ g: g2, u }); });
    return { G, wheels, instT, deckY, helm: new THREE.Vector3(hs.hb - .74, deckY, hs.z - .62), crew, sh };
  }
  /* --------------------------------------------------------------- felépítés */
  function buildVRace() {
    const root = W.root;
    const far = new THREE.Group(), env = new THREE.Group(); root.add(far); root.add(env); VRR.far = far; VRR.env = env;
    makeSky(far); makeShores(far);
    VRR.water = makeWater(env);
    const boat = makeBoat({ detail: 0, crew: 0, hull: "#0b2f5e", boot: "#ffffff", stripe: "#c62828", jib: "#d61f26", main: "#f6f4ec", num: "HUN 27", name: "ZEPHYR", logo: "ZEPHYR", spin: ["#e2483d", "#ffffff", "#0b2f5e"] });
    boat.scale.setScalar(VR_SC); boat.rotation.y = Math.PI; root.add(boat); VRR.boat = boat;
    const CK2 = vrCockpit(boat); VRR.ck = CK2;
    /* a felhasználó helye: a jobb oldali (styrbord) kerék mögött; a hajó orra −z felé néz (a hajó π-vel elforgatva) */
    const hp = CK2.helm.clone().multiplyScalar(1 / VR_SC); hp.x = -hp.x;   /* styrbord = a hajó helyi −x oldala */
    const eye = T.inVR ? 0 : 1.62;
    const hw = boat.localToWorld(hp.clone());
    root.position.set(-hw.x, -(hw.y + eye), -hw.z); root.updateMatrixWorld(true);
    VRR.wake = makeWake(env, 1.2);
    /* ellenfelek (ugyanakkora hajók) */
    VRR.riv = VR_RIV.map((o, i) => { const g = makeBoat(Object.assign({ detail: 0, crew: 3 }, o)); g.scale.setScalar(VR_SC * .96); env.add(g); const wk = makeWake(env, 1.1);
      const lbl = labelSprite([o.name, o.num], { size: 4.2, fs: 60, w: 620 }); env.add(lbl); return { o, g, wk, i, lbl }; });
    VRR.podium = labelSprite(["", "", "", "", ""], { size: 2.4, fs: 56, w: 900 }); root.add(VRR.podium); VRR.podium.visible = false;
    /* bóják, rendezőhajó, rajt-bója, a következő bója jelzőoszlopa */
    VRR.markG = new THREE.Group(); env.add(VRR.markG);
    VRR.cb = makeCommittee(); VRR.cb.scale.setScalar(1.2); env.add(VRR.cb);
    VRR.cdL = labelSprite(["RAJT", "0:45"], { size: 7, fs: 70, w: 640 }); env.add(VRR.cdL);
    VRR.pin = makeBuoy("#ff7a00", 2.0); VRR.pin.scale.setScalar(1.3); env.add(VRR.pin);
    const beamT = canvasTex(32, 256, (gg, w, h) => { const gr = gg.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(255,209,102,.9)"); gr.addColorStop(1, "rgba(255,209,102,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, w, h); });
    VRR.beam = mesh(new THREE.CylinderGeometry(2.4, 2.4, 60, 16, 1, true), basic({ map: beamT, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), env); VRR.beam.renderOrder = 5;
    VRR.beamLbl = labelSprite(["1. bója", "kerüld bal kéz felől"], { size: 14, fs: 64, w: 760 }); env.add(VRR.beamLbl);
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
    CK2.wheels.forEach((w) => { w.hit.userData.xr = { hover: (on) => { VRR.wHover = on; }, down: (h, src, key) => vrGrab(w, src, key, true), drag: (src) => vrDrag(w, src), up: () => { VRR.grab = null; } }; T.xr.extra.add(w.hit); W.objs.push(w.hit); });
    SAIL.keys = {}; W.vrr = VRR; W.vrSetup = vrSetup;   /* (tesztekhez) */
    VRR.best = (() => { try { return JSON.parse(localStorage.getItem("zephyr-vr-verseny") || "{}"); } catch (e) { return {}; } })();
    vrSetup(VRR.lvl || 1);
    faceYaw(0);
    audioStart({ water: .04, wind: .035 });
    return { tick: vrTick, panel: vrPanel, hud: vrHud, wrist: vrWrist };
  }
  /* új futam: pálya, szél, kiinduló helyzet a rajtvonal mögött */
  function vrSetup(lvl) {
    const C = VRR.C = vrCourse(lvl); VRR.lvl = lvl;
    VRR.wf = C.wf; VRR.tws = C.tws;
    while (VRR.markG.children.length) VRR.markG.remove(VRR.markG.children[0]);
    VRR.marks = C.marks.map((m, i) => { const b = makeBuoy(i === C.marks.length - 1 && C.marks.length > 2 ? "#ffd166" : "#ff7a00", 2.4); b.scale.setScalar(1.5); b.position.set(m.x, 0, m.z); VRR.markG.add(b);
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
    const p0 = back(95, 6); Object.assign(VRR, { x: p0.x, z: p0.z, b: C.wf + Math.PI * .5 - .3, v: 2.5, del: 0, wa: 0, heel: 0, lastSide: 0, tackT: 0, next: 0, t: -45, st: "pre", horns: {}, fin: null, msg: "Rajt 45 mp múlva – állj be a vonal mögé!", msgT: 6, res: [], pen: 0, doneT: 0, prevSide: null });
    VRR.riv.forEach((r, i) => { const p = back(80 + i * 12, -24 + i * 22); Object.assign(r, { x: p.x, z: p.z, b: C.wf + (i % 2 ? 1 : -1) * Math.PI * .45, v: 2.4, next: 0, tack: i % 2 ? 1 : -1, lastTack: 0, fin: null, skill: .93 + Math.min(.12, lvl * .018) + i * .01, ph: rand() * 9 }); });
    if (VRR.podium) VRR.podium.visible = false;
    W.panelDirty = 1;
  }
  /* --------------------------------------------------------------- kormány */
  const _wv = new THREE.Vector3();
  function wheelAngleOf(w, p) {   /* a kéz/sugár pontja a kerék síkjában: óramutató szerinti szög a kormányos szemszögéből */
    const lp = w.wheel.worldToLocal(_wv.copy(p)); return Math.atan2(-lp.x, lp.y);   /* a kormányos felől nézve jobbra = a hajó helyi −x */
  }
  function vrGrab(w, src, key, ray) {
    let p = null; if (ray) { const pl = new THREE.Plane(); const n = new THREE.Vector3(0, 0, 1).transformDirection(w.wheel.matrixWorld); const c = w.wheel.getWorldPosition(new THREE.Vector3()); pl.setFromNormalAndCoplanarPoint(n, c); p = new THREE.Ray(src.o, src.d).intersectPlane(pl, new THREE.Vector3()); }
    else p = src.tip;
    if (!p) return; VRR.grab = { w, a: wheelAngleOf(w, p), key, ray }; try { flap(.02); } catch (e) {}
  }
  function vrDrag(w, src) {
    const G = VRR.grab; if (!G || !G.ray) return;
    const pl = new THREE.Plane(); const n = new THREE.Vector3(0, 0, 1).transformDirection(w.wheel.matrixWorld); const c = w.wheel.getWorldPosition(new THREE.Vector3()); pl.setFromNormalAndCoplanarPoint(n, c);
    const p = new THREE.Ray(src.o, src.d).intersectPlane(pl, new THREE.Vector3()); if (!p) return;
    const a = wheelAngleOf(w, p); VRR.wa = clamp(VRR.wa + wrapA(a - G.a), -WA_MAX, WA_MAX); G.a = a;
  }
  const WA_MAX = 1.25 * Math.PI;   /* ütközéstől ütközésig ~2,5 fordulat (mint egy nagy jachton) */
  /* --------------------------------------------------------------- képkocka */
  function vrTick(dt) {
    const S = VRR, C = S.C;
    /* közvetlen kézi fogás: csippentés a kerék pereme mellett (a kéz a kerék síkjában, a peremtől 18 cm-en belül) */
    const X = T.xr, pl = (X && X.pinch) || {};
    if (T.inVR && X && X.src) {
      ["right", "left"].forEach((h) => { const s0 = X.src[h]; if (!s0 || !s0.tip) return;
        if (S.grab && S.grab.key === h && !S.grab.ray) { if (!pl[h]) { S.grab = null; return; } const a = wheelAngleOf(S.grab.w, s0.tip); S.wa = clamp(S.wa + wrapA(a - S.grab.a), -WA_MAX, WA_MAX); S.grab.a = a; return; }
        if (!S.grab && pl[h]) S.ck.wheels.forEach((w) => { const lp = w.wheel.worldToLocal(_wv.copy(s0.tip)); const r = Math.hypot(lp.x, lp.y); if (Math.abs(lp.z) < .2 && r > .3 && r < .95) { S.grab = { w, a: Math.atan2(-lp.x, lp.y), key: h, ray: false }; try { flap(.02); } catch (e) {} } });
      });
    }
    const k = SAIL.keys; if (k.L || k.R) S.wa = clamp(S.wa + ((k.R ? 1 : 0) - (k.L ? 1 : 0)) * dt * 2.4, -WA_MAX, WA_MAX);
    else if (!S.grab) S.wa *= Math.pow(.7, dt);   /* elengedve a kerék lassan visszatér (a legénység segít) */
    S.del = S.wa / WA_MAX * .55;
    S.ck.wheels.forEach((w) => { w.spin.rotation.z = S.wa; });   /* +z körüli forgás a kormányos felől nézve óramutató szerinti */
    /* fizika (a vitorlázás modellje, a nagyobb hajóhoz igazítva) */
    /* a szél lassan leng (±7°) – mint a Balatonon; a pálya ugyanaz marad */
    S.wf = C.wf + Math.sin(S.t / 47 + C.lvl) * 7 * D2R + Math.sin(S.t / 13) * 2 * D2R;
    const twa = Math.abs(wrapA(S.wf - S.b)) * R2D;
    const spin = twa > 120 && S.st === "race";
    const vt = polar(twa, spin) * KN * 1.32 * (S.st === "pre" ? .7 : 1) * (S.tws / (12 * KN)) ** .5 * (1 + .08 * Math.sin(W.t * .23) * Math.sin(W.t * .07));
    S.v += (vt - S.v) * Math.min(1, dt / (vt > S.v ? 6 : 8));
    S.b = (S.b + (S.v * Math.sin(S.del) * .085 + Math.sin(S.del) * .03) * dt + TAU) % TAU;
    const [fx, fz] = vfwd(S.b); S.x += fx * S.v * dt; S.z += fz * S.v * dt;
    /* látszólagos szél, vitorlák, dőlés */
    const wfv = vfwd(S.wf), tw = [wfv[0] * S.tws, wfv[1] * S.tws], aw = [tw[0] + fx * S.v, tw[1] + fz * S.v], aws = Math.hypot(aw[0], aw[1]);
    const awa = Math.acos(clamp((aw[0] * fx + aw[1] * fz) / (aws || 1), -1, 1)) * R2D;
    const port = [fz, -fx], side = (wfv[0] * port[0] + wfv[1] * port[1]) > 0 ? -1 : 1;
    if (side !== S.lastSide) { if (S.lastSide) { S.tackT = 3.4; flap(.16); setTimeout(winch, 1500); setTimeout(winch, 2300); } S.lastSide = side; }
    S.tackT = Math.max(0, S.tackT - dt);
    const BS = S.boat.userData.S; BS.side = side; BS.boom = clamp((awa - 22) * .72, 5, 80) * D2R * side; BS.jib = clamp((awa - 22) * .5, 7, 50) * D2R;
    BS.luff = Math.max(clamp(1 - (awa - 16) / 16, 0, 1), S.tackT > 1.4 ? .7 : 0); BS.spin += ((spin ? 1 : 0) - BS.spin) * Math.min(1, dt * .4);
    const heelT = clamp(Math.sin(clamp(awa, 0, 180) * D2R) ** 1.5 * (aws / (14 * KN)) ** 2 * 16, 0, 18) * D2R * (1 - BS.luff * .7) * (1 - BS.spin * .5);
    S.heel += (heelT - S.heel) * Math.min(1, dt * .7);
    BS.heel = -side * S.heel * .45;   /* a saját hajó dőlése visszafogott – ne émelyítsen */
    const hb = waveAt(S.x + fx * 6, S.z + fz * 6, W.t), hs2 = waveAt(S.x - fx * 6, S.z - fz * 6, W.t);
    BS.pitch = clamp((hs2 - hb) / 12 * 1.1, -.04, .04); S.boat.position.y = (hb + hs2) / 2 * .5;
    S.boat.userData.update(dt);
    /* legénység: a szél felőli oldalra ül (forduláskor átmászik) */
    S.crewSide = S.crewSide == null ? -side : S.crewSide + (-side - S.crewSide) * Math.min(1, dt * .9);
    S.ck.crew.forEach((c, i) => { const s = S.ck.sh(c.u); c.g.position.set(S.crewSide * (s.hb - .55), s.y - .02, s.z); c.g.rotation.y = S.crewSide > 0 ? Math.PI / 2 : -Math.PI / 2; c.g.rotation.z = Math.sin(W.t * 2 + i) * .03; });
    /* környezet a hajó körül */
    S.env.rotation.y = S.b; S.far.rotation.y = S.b;
    S.env.position.set(-S.x, 0, -S.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), S.b);
    const wm = S.water; wm.position.set(Math.round(S.x / 40) * 40, 0, Math.round(S.z / 40) * 40);
    const mat = wm.userData.mat; mat.uniforms.uT.value = W.t; mat.uniforms.uOff.value.set(wm.position.x, wm.position.z); mat.uniforms.uWind.value = Math.atan2(-wfv[1], -wfv[0]);
    const cw = new THREE.Vector3(); T.camObj().getWorldPosition(cw); mat.uniforms.uCam.value.copy(S.env.worldToLocal(cw));
    S.wake.push(S.x, S.z, Math.atan2(fx, fz), S.v, dt, .05);
    S.gulls.tick(dt, S.x, S.z);
    (S.spect || []).forEach((q) => { q.g.position.y = Math.sin(W.t * 1.1 + q.ph) * .08; q.g.rotation.z = Math.sin(W.t * .9 + q.ph) * .03; q.g.rotation.x = Math.sin(W.t * .7 + q.ph * 2) * .02; });
    /* verseny-állapot */
    S.t += dt;
    if (S.st === "pre") { [-30, -10, -5, -4, -3, -2, -1].forEach((tt) => { if (S.t >= tt && !S.horns[tt]) { S.horns[tt] = 1; if (tt === -30 || tt === -10) horn(.7, .14); else beep(); } }); if (S.t >= 0) { S.st = "race"; horn(1.5, .2); S.msg = "RAJT! Irány az 1. bója"; S.msgT = 5; } }
    /* bójakerülés: a bója 26 m-es körén belül; a bója bal kéz felől maradjon (a hajó a bója jobbján halad el) */
    if (S.st === "race" && !S.fin) {
      if (S.next < S.marks.length) { const m = S.marks[S.next], d = Math.hypot(m.x - S.x, m.z - S.z);
        /* a bóját bal kéz felől (a hajó bal oldalán) kell hagyni: a bója a hajó bal oldalára essen, amikor elhaladunk mellette */
        if (d < 26) { const port = [fz, -fx], side2 = (m.x - S.x) * port[0] + (m.z - S.z) * port[1];
          if (side2 > -3) { S.next++; horn(.3, .1); S.msg = S.next < S.marks.length ? `✓ ${S.next}. bója – jöhet a ${S.next + 1}.` : "✓ Utolsó bója – irány a befutó!"; S.msgT = 4; S.wrongT = 0; }
          else if (!S.wrongT || W.t - S.wrongT > 6) { S.wrongT = W.t; S.msg = "⚠ Rossz oldal! A bóját BAL kéz felől kerüld – fordulj vissza és menj el mellette jobbról"; S.msgT = 5; beep(); } } }
      else if (crossLine(S)) { S.fin = S.t; S.res.push({ n: "Zephyr (te)", t: S.t, me: true }); horn(1.2, .2); S.msg = "BEFUTÓ!"; S.msgT = 6; }
    }
    S.prevSide = lineSide(S);
    /* ellenfelek: a regatta mesterséges intelligenciája (cirkálás laylinig, hátszélben jibbelés), bóják bal kéz felől */
    S.riv.forEach((r) => vrRivalTick(r, dt));
    if (S.st === "race" && S.res.length === S.riv.length + 1 && !S.doneT) { S.doneT = S.t; vrFinish(); }
    S.msgT = Math.max(0, (S.msgT || 0) - dt);
    /* a következő bója jelzése */
    const tgt = S.next < S.marks.length ? S.marks[S.next] : { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 };
    S.beam.position.set(tgt.x, 30, tgt.z); S.beam.visible = !S.fin; S.beamLbl.visible = !S.fin; S.beamLbl.position.set(tgt.x, 14 + Math.sin(W.t * 1.5) * .4, tgt.z);
    { const dl = Math.hypot(tgt.x - S.x, tgt.z - S.z), kk = clamp(dl * .06, 5, 18); S.lblAr = S.lblAr || S.beamLbl.scale.y / S.beamLbl.scale.x; S.beamLbl.scale.set(kk, kk * S.lblAr, 1); S.beamLbl.position.y = 6 + kk * .6; }
    S.beamLbl.userData.set(S.next < S.marks.length ? [`${S.next + 1}. bója`, `${Math.round(Math.hypot(tgt.x - S.x, tgt.z - S.z))} m · bal kéz felől kerüld`] : ["BEFUTÓ", "a rajtvonalon át"]);
    { const fl = S.cb.userData.flags; if (fl) { fl[0].visible = S.st === "pre" && S.t > -30 && S.t < -5; fl[2].visible = S.st !== "done"; }
      S.cdL.visible = S.st === "pre" || (S.st === "race" && S.t < 4); S.cdL.position.set(S.cb.position.x, 13 + Math.sin(W.t * 2) * .2, S.cb.position.z); S.cdL.userData.set(S.st === "pre" ? ["RAJT", mmss(S.t)] : ["RAJT!", "jó versenyt!"]); }
    S.lineM.material.opacity = S.st === "pre" || S.next >= S.marks.length ? .5 + .2 * Math.sin(W.t * 3) : .15;
    /* hangok */
    AU.set("rush", clamp((S.v - 1) / 5, 0, 1) * .06, .4); AU.set("wind", clamp(aws / (16 * KN), 0, 1) * .045, .6); AU.set("water", .035, 1);
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
    else if (!fin) { const m = S.marks[r.next], prev = r.next ? S.marks[r.next - 1] : { x: 0, z: 0 }; const dx = m.x - prev.x, dz = m.z - prev.z, L = Math.hypot(dx, dz) || 1; tx = m.x + (-dz / L) * -12; tz = m.z + (dx / L) * -12; }   /* a bója jobbján (bal kéz felől hagyva) */
    else { tx = (C.line.a.x + C.line.b.x) / 2; tz = (C.line.a.z + C.line.b.z) / 2; tx -= C.u[0] * 15; tz -= C.u[1] * 15; }
    if (r.fin) { tx = r.x + vfwd(r.b)[0] * 50; tz = r.z + vfwd(r.b)[1] * 50; }
    const brgW = Math.atan2(tx - r.x, -(tz - r.z));
    let want = brgW;
    const rel = wrapA(brgW - S.wf);
    const cross = (r.x * C.c[0] + r.z * C.c[1]);
    if (Math.abs(rel) < 44 * D2R) { want = S.wf + r.tack * 44 * D2R;
      if (W.t - r.lastTack > 10 && ((r.tack > 0 && rel <= -40 * D2R) || (r.tack < 0 && rel >= 40 * D2R) || (Math.abs(cross) > 170 && Math.sign(cross) === r.tack))) { r.tack = -r.tack; r.lastTack = W.t; want = S.wf + r.tack * 44 * D2R; } }
    else if (Math.abs(rel) > 155 * D2R && S.st === "race") { want = S.wf + Math.PI - r.tack * 25 * D2R; const relD = wrapA(brgW - S.wf - Math.PI);
      if (W.t - r.lastTack > 14 && ((r.tack > 0 && relD >= 22 * D2R) || (r.tack < 0 && relD <= -22 * D2R))) { r.tack = -r.tack; r.lastTack = W.t; } }
    /* ütközés elkerülése (a saját hajónkkal és egymással) */
    [S].concat(S.riv).forEach((o) => { if (o === r) return; const dx = o.x - r.x, dz = o.z - r.z, d = Math.hypot(dx, dz); if (d < 22) want += (wrapA(Math.atan2(dx, -dz) - r.b) > 0 ? -1 : 1) * .45 * (1 - d / 22); });
    /* a kitérés se fordítsa a hajót a szélbe (holtszög): legalább 40°-kal a szél mellett maradjon */
    { const relW = wrapA(want - S.wf); if (Math.abs(relW) < 40 * D2R) want = S.wf + (relW === 0 ? r.tack : Math.sign(relW)) * 40 * D2R; }
    /* egymásba se csússzanak: fizikai szétválasztás */
    S.riv.forEach((o) => { if (o === r) return; const dx = r.x - o.x, dz = r.z - o.z, d = Math.hypot(dx, dz); if (d < 9 && d > .01) { const k = (9 - d) / 2; r.x += dx / d * k; r.z += dz / d * k; o.x -= dx / d * k; o.z -= dz / d * k; } });
    r.b += clamp(wrapA(want - r.b), -.28 * dt, .28 * dt);
    const twa = Math.abs(wrapA(S.wf - r.b)) * R2D, spin = twa > 120 && S.st === "race";
    const vt = polar(twa, spin) * KN * 1.32 * r.skill * (S.st === "pre" ? .6 : 1) * (S.tws / (12 * KN)) ** .5 * (r.fin ? .4 : 1);
    r.v += (vt - r.v) * Math.min(1, dt / 7);
    const f = vfwd(r.b); r.x += f[0] * r.v * dt; r.z += f[1] * r.v * dt;
    if (S.st === "race" && !r.fin) { if (!fin && Math.hypot(S.marks[r.next].x - r.x, S.marks[r.next].z - r.z) < 26) r.next++; else if (fin && crossLine(r)) { r.fin = S.t; S.res.push({ n: r.o.name, t: S.t }); horn(.4, .06); } }
    r.prevSide = lineSide(r);
    /* ütközés a saját hajónkkal: szétlöki a két hajót, mindkettő lelassul, koppanás és kiabálás helyett kürt */
    { const dx = r.x - S.x, dz = r.z - S.z, d = Math.hypot(dx, dz); if (d < 7.5 && d > .01) { const k = (7.5 - d) / 2; r.x += dx / d * k; r.z += dz / d * k; S.x -= dx / d * k; S.z -= dz / d * k;
      if (!r.bumpT || W.t - r.bumpT > 3) { r.bumpT = W.t; r.v *= .6; S.v *= .6; try { const a2 = T.ac(); if (a2) { const s2 = a2.createBufferSource(); s2.buffer = T.noiseBuf(.6); const f2 = a2.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 220; const g2 = a2.createGain(); g2.gain.setValueAtTime(.35, a2.currentTime); g2.gain.exponentialRampToValueAtTime(.001, a2.currentTime + .6); s2.connect(f2).connect(g2).connect(T.outBus()); s2.start(); } } catch (e) {} S.msg = "Koccanás a(z) " + r.o.name + " hajóval!"; S.msgT = 3; } } }
    /* megjelenítés */
    r.g.position.set(r.x, Math.sin(W.t * 1.5 + r.ph) * .06, r.z); r.g.rotation.y = Math.atan2(f[0], f[1]);
    const OS = r.g.userData.S, wfv = vfwd(S.wf), yaw = r.g.rotation.y, Xv = [Math.cos(yaw), -Math.sin(yaw)];
    OS.side = (wfv[0] * Xv[0] + wfv[1] * Xv[1]) > 0 ? -1 : 1; OS.boom = clamp((twa - 28) * .78, 7, 82) * D2R * OS.side; OS.jib = clamp((twa - 28) * .55, 8, 52) * D2R; OS.luff = clamp(1 - (twa - 18) / 18, 0, 1);
    OS.spin += ((spin ? 1 : 0) - OS.spin) * Math.min(1, dt * .35);
    OS.heel = -OS.side * clamp(Math.sin(twa * D2R) ** 1.4 * 18, 0, 22) * D2R * (1 - OS.spin * .6); OS.pitch = Math.sin(W.t * 1.2 + r.ph) * .025;
    const d2 = Math.hypot(r.x - S.x, r.z - S.z); r.uT = (r.uT || 0) + dt; if (d2 < 160 || r.uT > .2) { r.g.userData.update(r.uT); r.uT = 0; }
    r.wk.push(r.x, r.z, r.g.rotation.y, r.v, dt, .05);
    /* névtábla a hajó fölött (helyezéssel), 25–220 m között látszik */
    r.lbl.visible = d2 > 25 && d2 < 220; if (r.lbl.visible) { r.lbl.position.set(r.x, 22 + Math.sin(W.t + r.i) * .3, r.z); const k = clamp(d2 * .03, 2.5, 7); r.lbl.scale.set(k, k * .32, 1); r.lbl.userData.set([r.o.name, r.fin ? `befutott: ${S.res.findIndex((q) => q.n === r.o.name) + 1}.` : `${Math.round(d2)} m · ${r.next < S.marks.length ? (r.next + 1) + '. bója felé' : 'a befutó felé'}`]); }
  }
  function vrFinish() {
    const S = VRR, me = S.res.findIndex((q) => q.me);
    const best = S.best[S.lvl]; if (me >= 0 && (!best || S.res[me].t < best)) { S.best[S.lvl] = S.res[me].t; try { localStorage.setItem("zephyr-vr-verseny", JSON.stringify(S.best)); } catch (e) {} }
    S.st = "done"; S.msg = me === 0 ? "🏆 GYŐZELEM!" : `${me + 1}. hely`; S.msgT = 999; W.panelDirty = 1;
    /* eredménytábla a kormány fölött, előtted */
    S.podium.userData.set([me === 0 ? "🏆 GYŐZELEM!" : `${me + 1}. hely`].concat(S.res.map((q, i) => `${i + 1}. ${q.n} – ${mmss(q.t)}`))); S.podium.visible = true;
    { const c = T.camObj(), hw = new THREE.Vector3(), q = new THREE.Quaternion(); c.getWorldPosition(hw); c.getWorldQuaternion(q); const fw = new THREE.Vector3(0, 0, -1).applyQuaternion(q); fw.y = 0; if (fw.lengthSq() < 1e-4) fw.set(0, 0, -1); fw.normalize();
      const p = hw.clone().addScaledVector(fw, 2.6); p.y = hw.y + .1; W.root.updateMatrixWorld(true); S.podium.position.copy(W.root.worldToLocal(p)); }
    if (me === 0) { [0, 400, 800].forEach((d) => setTimeout(() => horn(.35, .12), d)); }
  }
  const mmss = (t) => { const s = Math.max(0, Math.abs(t)); return `${t < 0 ? "−" : ""}${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };
  function vrPlace() { const S = VRR; const prog = (o) => (o.fin ? 1e6 - o.fin : 0) + (o.next || 0) * 1e4 - Math.hypot((o === S ? S.tgt : null) ? S.tgt.x - o.x : 0, (o === S && S.tgt) ? S.tgt.z - o.z : 0); const all = [S].concat(S.riv).map((o) => [o, prog(o)]).sort((a, b) => b[1] - a[1]); return all.findIndex((q) => q[0] === S) + 1; }
  /* műszerek: a talapzati kijelzők (sebesség, szél, bója iránya) és az árbóckijelző (idő, helyezés) */
  function vrInstruments() {
    const S = VRR, t = S.ck.instT, g = t._canvas.getContext("2d"), w = 512;
    g.fillStyle = "#06090d"; g.fillRect(0, 0, w, w);
    const tgt = S.tgt || { x: 0, z: 0 }, brg = Math.atan2(tgt.x - S.x, -(tgt.z - S.z)), rel = wrapA(brg - S.b), dist = Math.hypot(tgt.x - S.x, tgt.z - S.z);
    g.fillStyle = "#7fd3ff"; g.font = "700 34px system-ui"; g.textAlign = "center"; g.fillText(S.next < S.marks.length ? `${S.next + 1}. BÓJA` : "BEFUTÓ", w / 2, 50);
    g.save(); g.translate(w / 2, 210); g.rotate(rel); g.fillStyle = "#ffd166"; g.beginPath(); g.moveTo(0, -110); g.lineTo(52, -20); g.lineTo(18, -20); g.lineTo(18, 70); g.lineTo(-18, 70); g.lineTo(-18, -20); g.lineTo(-52, -20); g.closePath(); g.fill(); g.restore();
    g.fillStyle = "#e9f6ff"; g.font = "800 64px system-ui"; g.fillText(`${Math.round(dist)} m`, w / 2, 360);
    g.fillStyle = "#7fd3ff"; g.font = "600 30px system-ui"; g.fillText(`${(S.v / KN).toFixed(1)} csomó · szél ${Math.round(S.awa)}°`, w / 2, 420);
    g.fillStyle = S.twa < 38 ? "#ff6a5a" : "#9fe0a0"; g.fillText(S.twa < 38 ? "TÚL KÖZEL A SZÉLHEZ – esd le!" : S.twa > 150 ? "hátszél" : S.twa > 110 ? "bővszél" : S.twa > 60 ? "félszél" : "cirkálás", w / 2, 470);
    t.needsUpdate = true;
    const m = S.mastT, g2 = m._canvas.getContext("2d"); g2.fillStyle = "#06090d"; g2.fillRect(0, 0, 1024, 256);
    const cell = (x, lbl, val) => { g2.fillStyle = "#7fd3ff"; g2.font = "600 30px system-ui"; g2.textAlign = "center"; g2.fillText(lbl, x + 170, 52); g2.fillStyle = "#e9f6ff"; g2.font = "800 110px system-ui"; g2.fillText(val, x + 170, 180); };
    cell(0, S.st === "pre" ? "RAJTIG" : "IDŐ", mmss(S.t)); cell(341, "HELY", S.st === "pre" ? "–" : `${S.fin ? S.res.findIndex((q) => q.me) + 1 : vrPlace()}/4`); cell(682, "SEBESSÉG", (S.v / KN).toFixed(1));
    m.needsUpdate = true;
  }
  /* --------------------------------------------------------------- panel, csuklómenü, 2D */
  function vrPanel(P) {
    const S = VRR;
    P.title(`Vitorlásverseny · ${S.lvl}. futam – ${S.C.name}`, `${S.st === "pre" ? "Rajt: " + mmss(-S.t) : S.st === "done" ? "Vége" : "Idő: " + mmss(S.t)} · ${(S.v / KN).toFixed(1)} csomó · szél ${(S.tws / KN).toFixed(0)} csomó`);
    P.row(0, S.msgT > 0 ? S.msg : "Fogd meg a kormánykereket (csippentés), és forgasd: jobbra = jobbra fordul.", "#ffd166");
    P.row(1, S.next < S.marks.length ? `Következő: ${S.next + 1}. bója (${S.marks.length} van) – bal kéz felől kerüld` : "Utolsó szakasz: át a rajtvonalon!", "#ffffff");
    P.row(2, S.st === "done" ? S.res.map((q, i) => `${i + 1}. ${q.n} ${mmss(q.t)}`).join(" · ") : "A sárga fényoszlop mutatja a következő bóját.", "#7fd3ff");
    P.row(3, S.best[S.lvl] ? `Legjobb időd ezen a pályán: ${mmss(S.best[S.lvl])}` : "Szél ellen nem lehet menni: cikcakkban (cirkálva) haladj!", "#c9a24a");
    if (S.st === "done") P.buttons([["↻ Újra", () => vrSetup(S.lvl)], ["Tovább ▸ " + (S.lvl + 1) + ". futam", () => vrSetup(S.lvl + 1)], ["‹ Vissza a sétához", () => W.close()]]);
    else P.buttons([["Egyenesbe", () => { S.wa = 0; }], ["↻ Újrakezdés", () => vrSetup(S.lvl)], ["‹ Vissza a sétához", () => W.close()]]);
  }
  function vrWrist() {
    const S = VRR;
    return [["↻", "Futam újra", () => vrSetup(S.lvl)], ["▸", "Következő futam", () => vrSetup(S.lvl + 1)], ["◂", "Előző futam", () => vrSetup(Math.max(1, S.lvl - 1))], ["⎈", "Kormány egyenesbe", () => { S.wa = 0; }],
      ["☰", "Nagy panel", () => W.togglePanel()], ["‹", "A sétához", () => W.close()]];
  }
  function vrHud(H) {
    const S = VRR;
    H.title(`Vitorlásverseny · ${S.lvl}. futam – ${S.C.name}`, `${S.msgT > 0 ? S.msg + " · " : ""}${S.st === "pre" ? "rajt " + mmss(-S.t) : "idő " + mmss(S.t)} · ${(S.v / KN).toFixed(1)} csomó · ${S.next < S.marks.length ? (S.next + 1) + ". bója" : "befutó"}`);
    H.steer();
    if (S.st === "done") H.buttons([["↻ Újra", () => vrSetup(S.lvl)], ["Tovább ▸", () => vrSetup(S.lvl + 1)]]);
    else H.buttons([["Egyenesbe", () => { S.wa = 0; }], ["↻ Újrakezdés", () => vrSetup(S.lvl)]]);
    H.hint("Kormány: ◀ ▶ gomb vagy ← → (A / D) · a sárga fényoszlop a következő bója · bal kéz felől kerüld");
  }

  /* =================================================================== 3. A HÁZ MAKETTJE – varázslatos helyszínen, asztaltól életnagyságig (2026. nov. 6., 2. változat)
     • Helyszín (2026. nov. 6-tól): regatta-bója a Balaton közepén, körülötte életnagyságú verseny és jelenetek (06d); a part ~260 m-re (06c) – valódi napállás szerinti égbolt, a túlpart nevezetességeivel, élővilággal.
     • A ház (06b): csak a Zephyr épülete (egy téglatest, 6,0 × 22,2 m), a hivatalos tervrajz szerint, valódi ablaknyílásokkal, berendezve.
     • Méretek: 1:100 · 1:60 · 1:40 az asztalon → 1:20 · 1:10 a stég padlóján → 1:1 ÉLETNAGYSÁG (a ház a parton áll, besétálhatsz).
       Kézzel: két kézzel csippents és húzd szét / össze (mint egy fotót a telefonon). A csuklómenüben (bal tenyér felfelé) minden beállítás.
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
    { const r0 = T.sceneEl.renderer; MAQ.shadowWas = r0.shadowMap.enabled; MAQ.shadowType = r0.shadowMap.type; MAQ.shadowAuto = r0.shadowMap.autoUpdate; MAQ.envWas = T.sceneEl.object3D.environment || null; MAQ.envIntWas = T.sceneEl.object3D.environmentIntensity; }
    /* az A-Frame alapfényei (erős szórt fény) kikapcsolva – a makett-világban a napszak saját fényei világítanak */
    MAQ.sceneLights = []; T.sceneEl.object3D.children.forEach((o) => { if (o.isLight && o.visible) { o.visible = false; MAQ.sceneLights.push(o); } });
    T.sceneEl.object3D.traverse((o) => { if (o.isLight && o.visible && !MAQ.sceneLights.includes(o) && (!W.root || !W.root.getObjectById(o.id))) { o.visible = false; MAQ.sceneLights.push(o); } });
    /* a bezárás-kezelő legelöl: ha a felépítés közben hiba lenne, akkor is minden visszaáll */
    W.onClose = () => {
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
      const o = new THREE.Sprite(basic({ map: orbTex, transparent: true, depthWrite: false })); o.scale.set(.3, .3, 1); o.position.set(sp.x, 1.35, sp.z); H.lv[sp.lv].add(o); o.visible = false; o.renderOrder = 6;
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
        [["🖐", "Bal tenyér fel", "előjön a csuklómenü"], ["🤏🤏", "Két kéz csippent", "széthúzva nő a ház"], ["👉", "Mutass, csippents", "lakásra, padlóra, halra"]].forEach(([ic, a1, a2], i) => {
          const x = 200 + i * 400; g.fillStyle = "rgba(255,255,255,.1)"; g.beginPath(); g.roundRect ? g.roundRect(x - 180, 130, 360, 330, 30) : g.rect(x - 180, 130, 360, 330); g.fill();
          g.font = "100px system-ui, sans-serif"; g.fillStyle = "#fff"; g.fillText(ic, x, 240); g.font = "800 36px system-ui, sans-serif"; g.fillText(a1, x, 360); g.font = "600 30px system-ui, sans-serif"; g.fillStyle = "#cfe3f5"; g.fillText(a2, x, 410); });
        g.fillStyle = "#fff"; g.font = "600 30px system-ui, sans-serif"; g.fillText("Csippents erre a táblára, és eltűnik", CW / 2, 510);
      });
      const hc = mesh(new THREE.PlaneGeometry(.9, .9 * CH / CW), basic({ map: tx, transparent: true, depthTest: false, depthWrite: false }), root); hc.renderOrder = 997;
      placeFacing(hc, 1.0, .12, 0); MAQ.help = hc; MAQ.helpT = 25;
      hc.userData.xr = { click: () => { hc.visible = false; T.xr.extra.delete(hc); } }; T.xr.extra.add(hc); W.objs.push(hc);
    }
    W.maq = { MAQ, ENV, BJ, goLife, goTable, bjStart, bjNext, setPreset, stepScale, nudgeHour, toggleSights };   /* tesztekhez */
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
    if (life) { MAQ.holder.position.copy(LIFE_POS); MAQ.turn.rotation.y = 0; model.position.set(0, 0, 0); }
    else {
      model.position.set(-MAQ.C.x * s, 0, -MAQ.C.z * s);
      MAQ.base.scale.setScalar(s); MAQ.base.position.set(0, 0, 0);
      const onTable = s <= 1 / 30;
      const R = MAQ.R * s;
      if (onTable) MAQ.holder.position.set(0, TABLE_Y + 2.6 * s + .002, 0);
      else MAQ.holder.position.set(0, .002 + 2.6 * s, USER_Z - .75 - R);
    }
    MAQ.base.visible = !life;
    /* árnyékkamera a mérethez */
    const sc = ENV.lights.sun.shadow.camera, half = life ? 20 : MAQ.R * s * 1.05 + .25;
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
      MAQ.mode = "life"; MAQ.s = MAQ.sT = 1; MAQ.roofOn = true; MAQ.upper = true; MAQ.level = 0; maqDeselect(); applyPlacement(true); lifeTargets(true);
      const site = ENV.site; site.updateMatrixWorld(true);
      /* nézés a ház felé (site +z) */
      const fw = new THREE.Vector3(0, 0, 1).transformDirection(site.matrixWorld); faceTo(Math.atan2(-fw.x, -fw.z));
      const target = site.localToWorld(new THREE.Vector3(LIFE_POS.x + 2.0, 0, LIFE_POS.z - 1.3));
      placeUser(target, 0);
      wristRedraw(); W.panelDirty = 1;
    });
  }
  function goTable() {
    if (MAQ.mode !== "life" || MAQ.fading) return;
    fadeThen(() => {
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
  function teleport(pt, lvl) { if (MAQ.mode !== "life") return; placeUser(pt, lvl); try { flap(.03); } catch (e) {} wristRedraw(); }
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
  function maqTick(dt) {
    const life = MAQ.mode === "life";
    /* méret simítása */
    if (!life && Math.abs(MAQ.s - MAQ.sT) > 1e-6) { MAQ.s = Math.exp(lerp(Math.log(MAQ.s), Math.log(MAQ.sT), Math.min(1, dt * 6))); if (Math.abs(MAQ.s / MAQ.sT - 1) < .002) MAQ.s = MAQ.sT; applyPlacement(); }
    /* asztal: kisebb méreteknél látszik, nagyobbaknál a stégbe süllyed */
    const tWant = !life && MAQ.s <= 1 / 30 ? 0 : -1.0; MAQ.table.position.y += (tWant - MAQ.table.position.y) * Math.min(1, dt * 5); MAQ.table.visible = MAQ.table.position.y > -.95;
    /* két kézzel nagyítás: csippents mindkét kezeddel, és húzd szét / össze */
    const X = T.xr, pl = X.pinch || {};
    if (T.inVR && pl.left && pl.right && X.src.left && X.src.right && X.src.left.o && X.src.right.o) {
      const d = X.src.left.o.distanceTo(X.src.right.o);
      if (!MAQ.two) { MAQ.two = { d0: Math.max(.05, d), s0: life ? 1 / 8 : MAQ.s }; MAQ.drag = null; }
      else { const want = MAQ.two.s0 * Math.pow(d / MAQ.two.d0, 1.6);
        if (life) { if (want < 1 / 8 * .55) { MAQ.two = null; goTable(); } }
        else if (want >= 1 / 8.2 && !MAQ.fading) { MAQ.two = null; goLife(); }
        else setScale(want, false); }
    } else MAQ.two = null;
    /* KÉZZEL FORGATÁS (2026. nov. 6.): nyúlj a makett fölé (vagy a talapzat széléhez), csippents, és húzd körbe a kezed – a makett vele fordul,
       mint egy forgótányér; elengedve kicsit tovább pörög és lelassul. Két kézzel továbbra is nagyítás. */
    if (T.inVR && !life && !MAQ.two) {
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
    const scene = ["🎬", "Jelenetek", [["▸", BJ.cur ? "Következő" : "Jelenet most", () => bjNext()]].concat(EV_LIST.map(([id, ic, n]) => [ic, n, () => bjStart(id), BJ.curId === id && !!BJ.cur]))];
    if (life) return [
      ["🏢", "Szintek", [["⬆", "Emelet", () => goLevel(1), MAQ.level === 1], ["⬇", "Földszint", () => goLevel(0), MAQ.level === 0], ["⌂", MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }]]],
      ["▣", "Vissza a maketthez", () => goTable()], sunMenu,
      ["📅", "Foglalás", () => W.close(() => { try { T.book(null); } catch (e) {} })], scene,
      ["🔭", MAQ.sights ? "Feliratok ki" : "Látnivalók", () => toggleSights()], turnMenu, back];
    return [
      ["🔍", "Méret", [["＋", "Nagyobb", () => stepScale(1)], ["－", "Kisebb", () => stepScale(-1)], ["🚶", "Életnagyság", () => goLife()], ["🧭", "Valódi irány", () => { MAQ.auto = false; MAQ.turn.rotation.y = 0; }]].concat(
        SCALES.slice(0, -1).map((v) => ["▫", SCALE_TXT(v), () => setScale(v, true), Math.abs(MAQ.sT - v) < 1e-4]))],
      ["🏠", "Nézet", [["⌂", MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], ["▤", MAQ.upper ? "Emelet ki" : "Emelet be", () => { MAQ.upper = !MAQ.upper; }], ["🔭", MAQ.sights ? "Feliratok ki" : "Látnivalók", () => toggleSights()]]],
      ["🚶", "Életnagyság", () => goLife()], sunMenu, scene, turnMenu, ["☰", "Nagy panel", () => W.togglePanel()], back];
  }
  /* ---------- nagy lebegő panel (VR) ---------- */
  function maqPanel(P) {
    const life = MAQ.mode === "life";
    P.title(life ? "A Zephyr ház – életnagyságban" : "A ház makettje · " + SCALE_TXT(MAQ.s), "Zamárdi, a Balaton partján · a hivatalos tervrajz szerint");
    if (life) { P.row(0, "Csippents a földre vagy a padlóra: odalépsz", "#ffffff"); P.row(1, "A fénylő 360° gömbök: a lakás valódi fotói", "#ffd166"); }
    else { P.row(0, "Csippents egy lakásra: belépés vagy foglalás", "#ffffff"); P.row(1, MAQ.dates ? "Zöld = szabad, piros = foglalt a napjaidon" : "Két kézzel csippentve húzd szét: nagyobb lesz", "#ffd166"); }
    P.row(2, `${dayHu(MAQ.day)} ${hhmm(MAQ.hour)} · ${PRESETS[MAQ.preset][0]} – ${sunLine()}`, "#7fd3ff");
    P.row(3, BJ.cur ? "🎬 Most: " + BJ.cur.name + " – nézz körül!" : "⛵ Körülötted verseny a bója körül · időnként jelenet", "#c9a24a");
    P.buttons([["◂☀ Korábban", () => nudgeHour(-.5)], ["◐ " + PRESETS[(MAQ.preset + 1) % PRESETS.length][0], () => setPreset(MAQ.preset + 1)], ["Később ☀▸", () => nudgeHour(.5)], [MAQ.sights ? "🔭 Feliratok ki" : "🔭 Látnivalók", () => toggleSights()], ["🎬 Jelenet", () => bjNext()]], 1);
    if (life) P.buttons([[MAQ.level ? "⬇ Földszint" : "⬆ Emelet", () => goLevel(MAQ.level ? 0 : 1)], [MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], ["▣ Makett", () => goTable()], ["‹ Vissza", () => W.close()]]);
    else P.buttons([["＋ Nagyobb", () => stepScale(1)], ["－ Kisebb", () => stepScale(-1)], ["🚶 Életnagyság", () => goLife()], [MAQ.roofOn ? "⌂ Tető le" : "⌂ Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], [MAQ.upper ? "▤ Emelet ki" : "▤ Emelet be", () => { MAQ.upper = !MAQ.upper; }], ["‹ Vissza", () => W.close()]]);
  }
  /* ---------- 2D kezelőfelület ---------- */
  function maqHud(H) {
    const life = MAQ.mode === "life";
    H.title(life ? "A Zephyr ház – életnagyságban" : "A ház makettje · " + SCALE_TXT(MAQ.s), life ? "Koppints a földre: odalépsz · a fénylő 360° gömbök a valódi fotók" : "A Balaton partján, Zamárdiban · koppints egy lakásra: belépés vagy foglalás");
    if (life) H.buttons([[MAQ.level ? "⬇ Földszint" : "⬆ Emelet", () => goLevel(MAQ.level ? 0 : 1)], [MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], ["▣ Vissza a maketthez", () => goTable()],
      ["◂☀", () => nudgeHour(-.5)], ["◐ " + PRESETS[(MAQ.preset + 1) % PRESETS.length][0], () => setPreset(MAQ.preset + 1)], ["☀▸", () => nudgeHour(.5)], [MAQ.sights ? "🔭 ki" : "🔭 Látnivalók", () => toggleSights()], ["🎬 Jelenet", () => bjNext()]]);
    else H.buttons([["＋ Nagyobb", () => stepScale(1)], ["－ Kisebb", () => stepScale(-1)], ["🚶 Életnagyság", () => goLife()], [MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], [MAQ.upper ? "Emelet ki" : "Emelet be", () => { MAQ.upper = !MAQ.upper; }],
      ["◂☀", () => nudgeHour(-.5)], ["◐ " + PRESETS[(MAQ.preset + 1) % PRESETS.length][0], () => setPreset(MAQ.preset + 1)], ["☀▸", () => nudgeHour(.5)], ["⟲", () => { MAQ.auto = false; MAQ.turn.rotation.y -= .4; }], ["⟳", () => { MAQ.auto = false; MAQ.turn.rotation.y += .4; }], [MAQ.sights ? "🔭 ki" : "🔭 Látnivalók", () => toggleSights()], ["🎬 Jelenet", () => bjNext()]]);
    H.hint(`${dayHu(MAQ.day)} ${hhmm(MAQ.hour)} · ${PRESETS[MAQ.preset][0]} – ${sunLine()}${MAQ.dates && !life ? " · zöld = szabad, piros = foglalt" : ""}${BJ.cur ? " · 🎬 " + BJ.cur.name : ""}`);
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
    const SX0 = -3, SX1 = 13.5, SZ0 = -10, SZ1 = 40; H.site = { SX0, SX1, SZ0, SZ1 };
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
    /* behajtó és parkoló: térkő a ház mellett, hátul fűrácskő (lyukas betonelemek) */
    box("brick", 6.3, .04, -2.7, 9.0, .065, 22.3);
    box("grid", 9.0, .04, 10, 12.6, .062, 22.3); box("brick", 9.0, .04, -2.7, 12.6, .065, 10);
    [["#e9ecef", 10.8, 13.5], ["#4a5058", 10.8, 18.7]].forEach(([c, x, z], i) => car(add, c, x, z, i % 2 ? 0 : Math.PI));
    box("hedge", 12.6, .04, -2.7, 13.0, 1.75, 22.3);
    /* hátsó kert: műfű, betonozott pihenő; a keleti telekhatáron zöld belátásgátló kerítés, nyugaton tujasor */
    box("grass", -.4, .04, 22.3, 12.6, .07, SZ1);
    box("#7f9a86", 12.6, .04, 22.3, 12.75, 2.0, SZ1);
    for (let z = 23; z < SZ1 - .5; z += 1.15) add("foliage", leafGeom([[-.9, 1.6, z, .55, 6, 3.2]], "#2f5a2c", .1));
    box("hedge", -.6, .04, SZ1 - .25, 12.9, 1.6, SZ1);
    box("#bdb7ad", 7.4, .04, 25.8, 12.5, .1, 32.2);
    /* fehér kerti pavilonok (gazebo): a kerti konyha fölött és két ülőhely */
    const gazebo = (cx, cz, w) => { const h = w / 2; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { box("#c9cdd2|m", cx + a * h - .03, .1, cz + b * h - .03, cx + a * h + .03, 2.2, cz + b * h + .03); for (let y = .5; y < 2.1; y += .4) box("#c9cdd2|m", cx + a * h - .04, y, cz + b * h - .04, cx + a * h + .04, y + .03, cz + b * h + .04); });
      add("#f4f3ee", new THREE.ConeGeometry(w * .74, .75, 4, 1, true), M4(cx, 2.55, cz, Math.PI / 4)); add("#e9e7df", new THREE.ConeGeometry(w * .73, .74, 4, 1, true), M4(cx, 2.54, cz, Math.PI / 4));
      [[0, -h], [0, h]].forEach(([dx, dz]) => box("#f4f3ee", cx - h, 2.0, cz + dz - .01, cx + h, 2.2, cz + dz + .01)); [[-h, 0], [h, 0]].forEach(([dx]) => box("#f4f3ee", cx + dx - .01, 2.0, cz - h, cx + dx + .01, 2.2, cz + h)); };
    const tableSet = (cx, cz) => { box("#9aa0a6", cx - .45, .74, cz - .45, cx + .45, .78, cz + .45); box("#2b2f36|m", cx - .03, .1, cz - .03, cx + .03, .74, cz + .03);
      [[0, -.75, 0], [0, .75, Math.PI], [-.75, 0, Math.PI / 2], [.75, 0, -Math.PI / 2]].forEach(([dx, dz, r]) => chair(add, cx + dx, cz + dz, r, -1, "#2b2f36", .07)); };
    gazebo(9.3, 27.2, 3); gazebo(3.2, 27.6, 2.8); gazebo(3.2, 33.6, 2.8);
    tableSet(3.2, 27.6); tableSet(3.2, 33.6);
    /* kerti konyha: nádfonatos pult, világos munkalap, mosogató */
    box("rattan", 8.0, .1, 26.2, 10.6, 1.0, 26.8); box("#d9d4c8", 7.95, 1.0, 26.15, 10.65, 1.05, 26.85); box("steel", 9.6, 1.05, 26.3, 10.1, 1.06, 26.7);
    box("#2b2f36|m", 7.6, .1, 26.4, 7.9, 1.6, 26.7);   /* hűtő / grill */
    /* kő tűzrakó asztal kőpadokkal, napozószékek */
    box("#cfcabe", 8.8, .1, 29.0, 9.8, .55, 29.8); box("#3a3a3a", 9.0, .55, 29.2, 9.6, .56, 29.6);
    box("#cfcabe", 8.5, .1, 30.4, 10.1, .45, 30.75); box("#cfcabe", 10.4, .1, 29.0, 10.75, .45, 30.0);
    [[11.4, 28.0], [11.4, 29.3]].forEach(([x, z]) => { add("#2b2f36", new THREE.BoxGeometry(.6, .04, 1.1), M4(x, .55, z, 0, -.35)); add("#2b2f36", new THREE.BoxGeometry(.6, .04, .6), M4(x, .78, z - .7, 0, -1.0));
      [[-.28], [.28]].forEach(([dx]) => add("#1c1f24|m", new THREE.BoxGeometry(.03, .6, 1.4), M4(x + dx, .45, z - .1, 0, .4))); });
    /* SUP-tartó, kerékpárok, tároló */
    box("#7a5a3a", 11.1, .04, 32.8, 11.2, 1.3, 33.0); box("#7a5a3a", 12.4, .04, 32.8, 12.5, 1.3, 33.0);
    for (let k = 0; k < 4; k++) add(["#ffd166", "#1f5fa8", "#e5262f", "#3fb37f"][k], new THREE.BoxGeometry(1.5, .1, .7), M4(11.8, .45 + k * .26, 33.3 + k * .02));
    for (let k = 0; k < 4; k++) bike(add, 11.6, 36 + k * .55, ["#2b2f36", "#c62828", "#1f5fa8", "#e9ecef"][k]);
    box("#8c939b", 9.4, .04, 34.6, 11.2, 2.1, 37.2); box("#6d737a", 9.3, 2.1, 34.5, 11.3, 2.18, 37.3); box("#5a3d24", 10.0, .04, 34.58, 10.6, 1.9, 34.6);
    /* fák a kertben */
    [[6.0, 38.2, 2.0], [10.0, 38.4, 1.6], [11.8, 24.0, 1.3], [-1.6, -6.1, 1.4], [11.2, -3.4, 1.3]].forEach(([x, z, r]) => tree(add, x, z, r));
    flowers(add, -.2, 22.6, 1.4, 25, 70); flowers(add, 4.8, 38.6, 8.6, 39.6, 70);
    /* kerti lámpák (bollardok) */
    for (let z = 23.5; z < SZ1 - 2; z += 4) { cyl("frame", 7.25, .04, z, .06, .7, -1); cyl("bulb", 7.25, .7, z, .07, .1, -1); }
    garland(add, [[7.85, 2.15, 25.75], [12.4, 2.3, 25.9], [12.4, 2.3, 32.0], [7.85, 2.15, 32.0]], .25, -1, "all");   /* fényfüzér a pihenő fölött */

    /* ------------------------------------------------ az épület */
    const Y1 = FLOOR_H;
    /* födémek (alul vakolt mennyezet) */
    /* a középső lépcsőház két szint magas (a fotók szerint): az emeleti födémben a lépcső fölött és mellette nagy nyílás van */
    const VOID = [WALL, Z_HALL + 1.2, 3.4, Z_B - PART];   /* x0, z0, x1, z1 – a légtér az emeleten */
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
    box("#3b3f45|m", WALL, -.2, Z_HALL, OUT_W - WALL, .03, VOID[1], 1);
    box("hallTile", VOID[2], 0, VOID[1], OUT_W - WALL, .03, Z_B - PART, 1);
    { const post = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(L / .12));
        for (let k = 0; k <= n; k++) { const u = k / n; box("#9aa1a8|m", x0 + (x1 - x0) * u - .008, .03, z0 + (z1 - z0) * u - .008, x0 + (x1 - x0) * u + .008, 1.0, z0 + (z1 - z0) * u + .008, 1); }
        const [g, m] = rodGeom(new THREE.Vector3(x0, 1.0, z0), new THREE.Vector3(x1, 1.0, z1), .022, 6); add("steel", g, m, 1); };
      post(WALL + 1.05, VOID[1], VOID[2], VOID[1]); post(VOID[2], VOID[1], VOID[2], Z_B - PART); }
    railing(box, OUT_W - .05, Z_HALL, OUT_W, Z_B - PART, 1);
    box("#3b3f45|m", OUT_W - WALL, -.2, Z_HALL, OUT_W, .03, Z_B - PART, 1);
    tsetHall(add, box, 4.7, Z_B - PART - 1.2, 1);
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
    (Pl.furn || []).forEach((f) => {
      const [type, x, y, w0, d0, , rot] = f; if (["door", "window", "area", "lane", "stairs"].includes(type) || !(w0 > .05 && d0 > .05)) return;
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
    buildBuoyStage(site);   /* (régen: buildMagicDeck – nyolcszögletű stég levendulával; a tulajdonos kérésére lecserélve) */
    const keep = ENV.glows; buildShore(site); ENV.glows = keep.concat(ENV.glows.filter((q) => !keep.includes(q)));
    buildLife(site);
    buildBuoyRace(site);
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
      const f = mesh(geo, std({ map: t2, side: THREE.DoubleSide, roughness: .8 }), pole); f.position.y = y; f.rotation.y = Math.PI / 2 + .3; f.castShadow = true;
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
  const RLEGS = [{ id: "W1", f: -2, r: 8, rad: 7, up: true }, { id: "W2", f: 9, r: -3, rad: 6 }, { id: "L1", f: -232, r: -14, rad: 12 }, { id: "L2", f: -240, r: 4, rad: 10 }];
  function buildBuoyRace(site) {
    const g = new THREE.Group(); site.add(g); g.position.y = WATER_Y; BJ.race = g;
    /* a hátszeles kapu két sárga bójája és egy messzi rendezőhajó (a pálya „háttere”) */
    [[-230, -20], [-230, 20]].forEach(([f, r]) => { const b = makeBuoy("#ffd166", 2.1); b.position.copy(RP(f, r)); g.add(b); });
    const cb = makeCommittee(); cb.position.copy(RP(-150, 70)); cb.rotation.y = Math.PI / 2 + .3; g.add(cb); cb.userData.flags.forEach((f, i) => { f.visible = i !== 0; });
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
      BJ.boats.forEach((o) => { if (o === st) return; const ddf = o.f - st.f, ddr = o.r - st.r, d = Math.hypot(ddf, ddr); if (d < 16) want += (Math.atan2(ddr, ddf) > st.hd ? -1 : 1) * .3 * (1 - d / 16); });
      { const d0 = Math.hypot(st.f, st.r); if (d0 < 9) want += (Math.atan2(-st.r, -st.f) > st.hd ? -1 : 1) * .6 * (1 - d0 / 9); }
      st.hd += clamp(wrapA(want - st.hd), -.35 * dt, .35 * dt);
      const twa = Math.abs(wrapA(st.hd)) * R2D;
      st.spin += ((twa > 112 ? 1 : 0) - st.spin) * Math.min(1, dt * .3);
      const vt = polar(twa, st.spin > .5) * KN * st.b.skill;
      st.v += (vt - st.v) * Math.min(1, dt / 6);
      st.f += Math.cos(st.hd) * st.v * dt; st.r += Math.sin(st.hd) * st.v * dt;
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
      const far = Math.hypot(st.f, st.r) > 140; st.uT = (st.uT || 0) + dt; if (!far || st.uT > .2) { st.g.userData.update(st.uT); st.uT = 0; }
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
    const list = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(basic({ map: tex, transparent: true, depthWrite: false, color: col || "#5a5a5a", opacity: 0, fog: true })); s.visible = false; parent.add(s); list.push({ s, t: 99, v: new THREE.Vector3() }); }
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
    const M = vcGroup(parts, ship);
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
    const F0 = -175, RB = 25;
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
          ship.rotation.z = -smooth(clamp(k * 1.3, 0, 1)) * .42; ship.rotation.x = Math.sin(st.sink * .3) * .02 + k * .06;
          ship.position.y = -smooth(clamp((k - .55) / .45, 0, 1)) * 34 - k * 3;
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
  const EV_ORDER = ["titanic", "monster", "steamer", "heli", "storm", "police", "plane", "sub", "titanic", "monster", "heli", "steamer", "police", "storm", "plane", "sub"];
  const EV_LIST = [["titanic", "🚢", "Titanic és a jéghegy"], ["monster", "🐉", "Tengeri szörny"], ["heli", "🚁", "Mentőhelikopter"], ["steamer", "🛳", "Lapátkerekes gőzös"], ["storm", "⛈", "Nyári zivatar"], ["police", "🚤", "Vízirendőrség"], ["plane", "✈", "Reklámrepülő"], ["sub", "⚓", "Tengeralattjáró"]];
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
      click: (h) => { if (!h || !h.uv) return; const x = h.uv.x * PW, y = (1 - h.uv.y) * PH; const b = P.btns.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); if (b) { b.fn(); P.draw(); } }
    };
    T.xr.extra.add(m);
    P.draw = () => {
      const g = cv.getContext("2d"); P.btns = []; g.clearRect(0, 0, PW, PH);
      const bg = g.createLinearGradient(0, 0, 0, PH); bg.addColorStop(0, "rgba(14,52,98,.94)"); bg.addColorStop(1, "rgba(7,28,58,.94)");
      g.beginPath(); g.roundRect ? g.roundRect(5, 5, PW - 10, PH - 10, 40) : g.rect(5, 5, PW - 10, PH - 10); g.fillStyle = bg; g.fill(); g.lineWidth = 6; g.strokeStyle = "rgba(255,209,102,.85)"; g.stroke();
      let rowY = 0;
      const api = {
        title(t, s) { g.fillStyle = "#ffd166"; g.font = "800 50px system-ui, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(t, 44, 66); g.fillStyle = "#fff"; g.font = "600 34px system-ui, sans-serif"; g.fillText(s || "", 44, 122); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(40, 158, PW - 80, 2); },
        row(i, t, c, r) { const y = 210 + i * 66; g.fillStyle = c || "#fff"; g.beginPath(); g.arc(58, y, 11, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.font = "600 36px system-ui, sans-serif"; g.textAlign = "left"; g.fillText(t, 84, y); if (r) { g.textAlign = "right"; g.fillStyle = "#7fd3ff"; g.fillText(r, PW - 50, y); } rowY = y; },
        buttons(list, row) {
          const n = list.length, gap = 16, w = (PW - 80 - gap * (n - 1)) / n, y = PH - 150 - (row || 0) * 126, h = 110;
          list.forEach(([lbl, fn, on], i) => {
            const x = 40 + i * (w + gap), k = P.btns.length, hov = k === P.hov; P.btns.push({ x, y, w, h, fn });
            g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 14; g.shadowOffsetY = 5;
            g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 26) : g.rect(x, y, w, h);
            const gr = g.createLinearGradient(0, y, 0, y + h);
            if (on || hov) { gr.addColorStop(0, "#ffe08a"); gr.addColorStop(1, "#f2b93b"); } else { gr.addColorStop(0, "rgba(255,255,255,.2)"); gr.addColorStop(1, "rgba(255,255,255,.07)"); }
            g.fillStyle = gr; g.fill(); g.restore();
            g.lineWidth = hov ? 5 : 2; g.strokeStyle = hov ? "#fff3c4" : "rgba(255,255,255,.35)"; g.stroke();
            /* ha a felirat ikonnal kezdődik („🐟 Merülés”), az ikon nagyobban, fölötte */
            const m = /^(\S{1,3})\s+(.+)$/.exec(lbl), icon = m && !/[A-Za-zÁ-ű0-9]/.test(m[1]) ? m[1] : null, txt = icon ? m[2] : lbl;
            g.fillStyle = on || hov ? "#0b2f5e" : "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
            if (icon) { g.font = "800 40px system-ui, sans-serif"; g.fillText(icon, x + w / 2, y + h * .34); g.font = `700 ${txt.length > 12 || n > 5 ? 25 : 30}px system-ui, sans-serif`; g.fillText(txt, x + w / 2, y + h * .74); }
            else { g.font = `700 ${lbl.length > 14 || n > 5 ? 28 : 38}px system-ui, sans-serif`; g.fillText(lbl, x + w / 2, y + h / 2 + 2); }
          });
        }
      };
      if (W.spec && W.spec.panel) W.spec.panel(api);
      tex.needsUpdate = true;
    };
    P.tick = (dt) => {
      const hv = P.uv ? P.btns.findIndex((q) => { const x = P.uv.x * PW, y = (1 - P.uv.y) * PH; return x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h; }) : -1;
      if (hv !== P.hov) { P.hov = hv; P.draw(); }
      if ((W.panelDirty || 0) > .5) { W.panelDirty = 0; P.draw(); }
    };
    return P;
  }
  function placePanel() {
    const P = W.panel; if (!P) return;
    const yaw = T.camYaw(), hy = T.headY();
    let a = yaw + (W.kind === "maquette" ? .62 : .55), d = W.kind === "sail" ? .85 : 1.05, y = hy - .25;
    if (W.kind === "sail") { a = yaw + .62; y = hy - .38; }
    if (W.kind === "race") { a = yaw - .75; d = 1.1; y = hy - .15; }   /* a verseny panelje balra-előre, hogy a kormány és az orr szabad maradjon */
    P.m.position.set(-Math.sin(a) * d, y, -Math.cos(a) * d);
    P.m.rotation.set(-.2, a, 0, "YXZ");
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
      #worldHud .wh-hint{font:600 15px/1.4 inherit;background:rgba(7,28,58,.7);padding:8px 14px;border-radius:12px;text-align:center}
      @media (max-width:600px){#worldHud .wh-t{font-size:19px}#worldHud .wh-s{font-size:16px}}
    </style><div class="wh-top"><button type="button" class="wh-back">‹ Vissza a sétához</button><div class="wh-card"><div class="wh-t"></div><div class="wh-s"></div><ul class="wh-list"></ul></div></div>
    <div class="wh-bot"><div class="wh-btns"></div><div class="wh-hint"></div></div>`;
    document.body.appendChild(el);
    el.querySelector(".wh-back").addEventListener("click", () => W.close());
    let lastBtns = "";
    const H = {
      el,
      draw() {
        const api = {
          title(t, s) { el.querySelector(".wh-t").textContent = t; el.querySelector(".wh-s").textContent = s || ""; },
          list(a) { el.querySelector(".wh-list").innerHTML = a.map((x) => `<li>${x}</li>`).join(""); },
          hint(t) { el.querySelector(".wh-hint").textContent = t; },
          buttons(list) {
            const key = list.map((x) => x[0]).join("|"); if (key === lastBtns) return; lastBtns = key;
            const box = el.querySelector(".wh-btns"); box.className = "wh-btns"; box.innerHTML = "";
            list.forEach(([lbl, fn]) => { const b = document.createElement("button"); b.type = "button"; b.className = "wh-b"; b.textContent = lbl; b.addEventListener("click", () => { fn(); H.draw(); }); box.appendChild(b); });
          },
          steer() {
            if (lastBtns === "steer") return; lastBtns = "steer";
            const box = el.querySelector(".wh-btns"); box.className = "wh-btns wh-steer"; box.innerHTML = "";
            [["◀", "L"], ["egyenesbe", "C"], ["▶", "R"]].forEach(([lbl, k]) => {
              const b = document.createElement("button"); b.type = "button"; b.className = "wh-b"; b.textContent = lbl;
              if (k === "C") b.addEventListener("click", () => { SAIL.del = 0; });
              else { const on = (v) => (e) => { e.preventDefault(); SAIL.keys[k] = v; b.classList.toggle("on", v); };
                b.addEventListener("pointerdown", on(true)); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, on(false))); }
              box.appendChild(b);
            });
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
    safe(() => { W.spec = kind === "race" ? buildVRace() : kind === "sail" ? buildSail() : buildMaquette(); finishOpen(); });
  };
  function finishOpen() {
    document.body.classList.add("world-on");
    W.hud = makeHud(); W.hud.el.style.display = T.inVR ? "none" : ""; W.hud.draw();
    W.panel = makePanel(); W.panel.draw();
    if (T.inVR) placePanel();
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
    if (W.panel) { W.panel.m.visible = T.inVR && !W.panelHidden; if (T.inVR) W.panel.tick(dt); }
    W.hudT += dt; if (!T.inVR && W.hud && W.hudT > .4) { W.hudT = 0; W.hud.draw(); }
  };
  W.togglePanel = function () {
    if (!W.panel) return; W.panelHidden = !W.panelHidden;
    if (!W.panelHidden) placePanel();
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
    if (T.xrForget) T.xrForget(W.objs.concat(W.panel ? [W.panel.m] : []));
    if (W.panel) { T.xr.extra.delete(W.panel.m); if (W.panel.m.parent) W.panel.m.parent.remove(W.panel.m); }
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
      if (sm) { sm.material.depthTest = saved.skyDepth; sm.material.depthWrite = true; sm.renderOrder = saved.skyOrder; sm.material.needsUpdate = true; }
      T.sceneEl.renderer.localClippingEnabled = saved.clip;
      if (!T.inVR) { T.rig.object3D.rotation.y = saved.rigY; const lc1 = T.cam.components["look-controls"]; if (lc1 && lc1.pitchObject) { lc1.pitchObject.rotation.x = saved.pitch; lc1.yawObject.rotation.y = saved.yaw; } }
    }
    T.setBusy(false);
    if (after) setTimeout(after, 50);
  };
  W.active = false;
})();
