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
    const RINGS = 110, SEG = 150, R0 = .6, RMAX = 1600;
    const pos = [], idx = [];
    for (let i = 0; i <= RINGS; i++) { const r = i === 0 ? 0 : R0 * Math.pow(RMAX / R0, (i - 1) / (RINGS - 1)); for (let j = 0; j < SEG; j++) { const a = j / SEG * TAU; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
    for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) { const a = i * SEG + j, b = i * SEG + (j + 1) % SEG, c = (i + 1) * SEG + j, d = (i + 1) * SEG + (j + 1) % SEG; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const wv = WAVES.map(([a, L, A, Q]) => new THREE.Vector4(a * D2R, TAU / L, A, Q));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uOff: { value: new THREE.Vector2() }, uWind: { value: WIND_DIR }, uW: { value: wv }, uSun: { value: SUN }, uCam: { value: new THREE.Vector3() }, uGust: { value: new THREE.Vector2(1, 0) } },
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
        uniform float uT, uWind; uniform vec3 uSun, uCam; uniform vec2 uGust;
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
          vec3 sky = mix(vec3(.70,.80,.87), vec3(.25,.45,.75), pow(el, .45));
          vec3 deep = vec3(.06,.25,.27), shallow = vec3(.18,.44,.41);
          vec3 base = mix(shallow, deep, clamp(.5 + n.x * 2.5, 0., 1.)) * (1. - gust * .18);
          vec3 col = mix(base, sky, fres * .7);
          float sp = pow(max(dot(refl, uSun), 0.), 380.) * 7. + pow(max(dot(refl, uSun), 0.), 40.) * .25;
          col += vec3(1., .95, .82) * sp * (1. - gust * .3);
          /* hullámtaraj: halvány fehér hab a meredek részeken */
          col = mix(col, vec3(.92,.95,.95), smoothstep(.72, .95, 1. - n.y) * .45 * fa);
          /* pára a horizont felé */
          float hz = smoothstep(250., 1550., vDist);
          col = mix(col, vec3(.84,.89,.91), hz * .85);
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

  /* =================================================================== 3. A HÁZ MAKETTJE – építészeti makett a hivatalos tervrajz szerint (2026. nov. 6.)
     • Csak a Zephyr épülete: egyetlen téglatest, kívül 6,0 × 22,2 m (belül 5,4 m széles), két szint, lapos tető. A mellette álló kisebb ház
       a szomszédé (külön helyrajzi szám, saját falak, más tetőmagasság) – nem része a makettnek.
     • Elöl (az utca és a Balaton felé, kb. 345°): Korvett (földszint) és Fregatt (emelet), erkéllyel/terasszal; középen a fedett bejáró a lépcsővel;
       utána Dingi (földszint) és Kalóz (emelet); hátul Schooner (földszint) és Kadett (emelet) – belül egyformák, a Kadett terasza a hátsó, emeleti fa terasz.
     • A ház keleti oldalán a parkoló, mögötte a kert. Tájolás a Google légifelvételből; a fény a választott nap és óra napállása szerint vet árnyékot.
     • Rámutatva kiemelés és adatok, csippentésre választás: „Belépés a lakásba” vagy „Foglalás”. Ha a foglalásban már van időpont: zöld = szabad, piros = foglalt. */
  const MAQ = {};
  const SCALE = 1 / 60;               /* M 1:60 */
  const FLOOR_H = 2.85, WALL = .3, PART = .25, IN_W = 5.4, OUT_W = IN_W + 2 * WALL;
  /* a ház koordinátái méterben: x = kelet felé (a parkoló oldala), z = az utcától hátrafelé (165° felé), y = fel */
  const Z_A = WALL, Z_HALL = Z_A + 6.2 + PART, Z_B = Z_HALL + 4.0 + PART, Z_C = Z_B + 4.35 + PART, Z_END = Z_C + 6.41 + WALL;
  const APTCOL = { korvett: "#e2483d", dingi: "#3fb37f", fregatt: "#3d8fe2", kaloz: "#9b6be2", schooner: "#2bb3c0", kadett: "#d9a441" };
  /* lakásonként: szint, és az alaprajz (méter) → ház (méter) leképezés */
  const UNITS = {
    korvett:  { lvl: 0, map: (x, y) => [WALL + x, Z_A + y] },
    fregatt:  { lvl: 1, map: (x, y) => [WALL + x, Z_A + y] },
    dingi:    { lvl: 0, map: (x, y) => [WALL + y, Z_B + (4.35 - x)] },
    kaloz:    { lvl: 1, map: (x, y) => [WALL + y, Z_B + (4.10 - x)] },
    schooner: { lvl: 0, map: (x, y) => [WALL + x, Z_C + y] },
    kadett:   { lvl: 1, map: (x, y) => [WALL + x, Z_C + y] }
  };
  function planOf(id) { const P = T.PLANS; const g = T.GROUPS.find((q) => q.id === id) || {}; return P[g.plan] || P.elso; }
  const ROOMCOL = (n) => /fürd/i.test(n) ? "#b9c6cc" : /háló/i.test(n) ? "#a77a4f" : /nappali|konyha|szoba|étkez/i.test(n) ? "#b9895a" : /előt|előszoba/i.test(n) ? "#9e9a92" : "#b08a63";
  /* téglalap az alaprajzból → a ház koordinátáiba (tengelyhez igazítva) */
  function mapRect(U, x, y, w, h) {
    const a = U.map(x, y), b = U.map(x + w, y + h);
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  }
  function sunDirFor(ymd, h) {
    /* napállás → irány a ház koordinátáiban (+z = 165°, +x = 75°) */
    let p = { az: 230, el: 45 };
    try { if (T.sunPos) p = T.sunPos(ymd, h); } catch (e) {}
    const d = (p.az - 165) * D2R, el = Math.max(6, p.el) * D2R;
    return { v: new THREE.Vector3(-Math.sin(d) * Math.cos(el), Math.sin(el), Math.cos(d) * Math.cos(el)), p };
  }

  function buildMaquette() {
    const root = W.root;
    const model = new THREE.Group(); model.scale.setScalar(SCALE); MAQ.model = model;
    const turn = new THREE.Group(); turn.add(model); MAQ.turn = turn;
    const stand = new THREE.Group(); stand.add(turn); root.add(stand); MAQ.stand = stand;
    /* a telek közepe a forgástengelyen (x: −4…16 m, z: −10…40 m) */
    const SX0 = -3, SX1 = 13.5, SZ0 = -10, SZ1 = 40, CX = (SX0 + SX1) / 2, CZ = (SZ0 + SZ1) / 2;
    model.position.set(-CX * SCALE, 0, -CZ * SCALE);
    const parts = {};   /* szín → geometria-lista (összevonva rajzoljuk – Questen ez számít) */
    const P = (col, g, m, opt) => { const k = col + (opt ? "|" + JSON.stringify(opt) : ""); (parts[k] = parts[k] || { col, opt, list: [] }).list.push([g, m]); };
    const box = (col, x0, z0, x1, z1, y0, h, opt) => P(col, new THREE.BoxGeometry(Math.max(.01, x1 - x0), h, Math.max(.01, z1 - z0)), M4((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2), opt);
    const cyl = (col, x, z, r, y0, h, seg, opt) => P(col, new THREE.CylinderGeometry(r, r, h, seg || 10), M4(x, y0 + h / 2, z), opt);

    /* ---------- talapzat (diófa keret, filc) ---------- */
    const baseW = (SX1 - SX0) * SCALE, baseD = (SZ1 - SZ0) * SCALE;
    const wood = std({ color: "#5b3a22", roughness: .45 }), felt = std({ color: "#2c3a2e", roughness: .95 });
    const base = mesh(new THREE.BoxGeometry(baseW + .03, .045, baseD + .03), wood, turn); base.position.y = -.0235; base.receiveShadow = true;
    const feltM = mesh(new THREE.BoxGeometry(baseW, .004, baseD), felt, turn); feltM.position.y = -.001; feltM.receiveShadow = true;
    base.userData.xr = { down: (h, src) => { MAQ.drag = { a: turn.rotation.y, d: src.d.clone() }; MAQ.auto = false; }, drag: (src) => { if (!MAQ.drag) return; const d0 = MAQ.drag.d, d1 = src.d; turn.rotation.y = MAQ.drag.a + wrapA(Math.atan2(d1.x, d1.z) - Math.atan2(d0.x, d0.z)) * 4; }, up: () => { MAQ.drag = null; } };
    T.xr.extra.add(base); W.objs.push(base);

    /* ---------- utca, járda, kerítés, előkert ---------- */
    box("#3e4248", SX0, -9.2, SX1, -4.4, 0, .05);                                   /* aszfalt */
    for (let x = SX0 + .6; x < SX1; x += 3.2) box("#e8e4d6", x, -6.88, x + 1.6, -6.72, .05, .006);   /* felezővonal */
    box("#b9b4a8", SX0, -4.4, SX1, -2.7, 0, .12);                                   /* járda */
    box("#9aa08f", SX0, -2.7, SX1, SZ1, 0, .04);                                    /* telek alap */
    box("#6fa25a", -.4, -2.5, 6.3, -.05, .04, .03);                                 /* előkert gyep */
    box("#cfc6b4", 1.4, -2.7, 2.6, -.05, .04, .04);                                  /* bejárati járda */
    [[-.4, 1.2], [2.8, 6.3]].forEach(([a, b]) => box("#3f4a46", a, -2.62, b, -2.5, .04, 1.3));   /* utcai kerítés (a kapuknál nyitva) */
    box("#5a6066", 1.25, -2.66, 1.32, -2.46, .04, 1.5); box("#5a6066", 2.7, -2.66, 2.77, -2.46, .04, 1.5);
    /* parkoló a ház keleti oldalán: zúzottkő, autók */
    box("#a39d91", 6.3, -2.7, 12.6, 22.3, .04, .025);
    for (let z = 1; z < 21; z += 2.6) box("#8e887d", 6.3, z, 12.6, z + .08, .065, .004);   /* parkolóhelyek jelölése */
    box("#3d6a3a", 12.6, -2.7, 12.9, SZ1, .04, 1.7);                                 /* keleti sövény */
    /* kert a ház mögött */
    box("#5f9a48", -.4, 22.3, 12.6, SZ1, .04, .03);
    box("#cfc6b4", 6.6, 22.3, 7.8, SZ1 - 2, .04, .035);                              /* kerti út */
    box("#3f4a46", -.55, 22.3, -.4, SZ1, .04, 1.4);                                  /* nyugati telekhatár (a szomszéd felé) */
    box("#3f4a46", -.55, SZ1 - .15, 12.9, SZ1, .04, 1.4);                            /* hátsó kerítés */
    /* grillterasz / kerti konyha pergolával, napozóágyak, SUP-tartó, kerékpárok */
    box("#8a6a48", 8.4, 27, 12.2, 31, .04, .08);
    [[8.5, 27.1], [12.0, 27.1], [8.5, 30.8], [12.0, 30.8]].forEach(([x, z]) => box("#e9e6dc", x, z, x + .12, z + .12, .12, 2.3));
    for (let k = 0; k < 9; k++) box("#e9e6dc", 8.4, 27 + k * .5, 12.2, 27.08 + k * .5, 2.42, .08);
    box("#d8d4cc", 8.6, 27.2, 10.8, 27.8, .12, .9); box("#2b2f36", 10.9, 27.2, 11.8, 27.8, .12, 1.0);
    box("#9c6b3f", 9.2, 28.6, 11.4, 29.6, .82, .06); [[9.3, 28.7], [11.2, 28.7], [9.3, 29.4], [11.2, 29.4]].forEach(([x, z]) => box("#7a5a3a", x, z, x + .08, z + .08, .12, .7));
    [[2.2, 30], [3.6, 30]].forEach(([x, z]) => { box("#f2efe6", x, z, x + .7, z + 1.9, .12, .25); box("#f2efe6", x, z, x + .7, z + .5, .37, .25); });
    for (let k = 0; k < 4; k++) box(["#ffd166", "#1f5fa8", "#e5262f", "#3fb37f"][k], 11.2, 33 + k * .5, 12.4, 33.1 + k * .5, .5 + k * .02, .1);
    for (let k = 0; k < 4; k++) box("#2b2f36", 11.6, 36 + k * .55, 11.68, 37.6 + k * .05, .04, 1.0);
    box("#8c939b", 9.4, 34.6, 11.2, 37.2, .04, 2.1);                                /* tároló */
    /* fák */
    [[1.5, 26, 2.2], [4.5, 35.5, 2.8], [10.0, 38.2, 1.6], [11.6, 24.5, 1.4], [0.8, 38, 2.0], [-1.6, -6.1, 1.4], [11.2, -3.4, 1.3]].forEach(([x, z, r]) => {
      cyl("#5a3d24", x, z, .18, .04, 2.6, 8);
      P("#3e7d3a", new THREE.IcosahedronGeometry(r, 1), M4(x, 2.6 + r * .75, z), { flat: 1 });
    });

    /* ---------- az épület ---------- */
    const Y1 = FLOOR_H, roofY = 2 * FLOOR_H;
    MAQ.lv = [new THREE.Group(), new THREE.Group()]; MAQ.lv.forEach((g, i) => { g.position.y = i * FLOOR_H; model.add(g); });
    const lvParts = [{}, {}];
    const LP = (lv, col, g, m, opt) => { const k = col + (opt ? "|" + JSON.stringify(opt) : ""); (lvParts[lv][k] = lvParts[lv][k] || { col, opt, list: [] }).list.push([g, m]); };
    const lbox = (lv, col, x0, z0, x1, z1, y0, h, opt) => LP(lv, col, new THREE.BoxGeometry(Math.max(.01, x1 - x0), h, Math.max(.01, z1 - z0)), M4((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2), opt);
    /* födémek (padló) szintenként */
    [0, 1].forEach((lv) => lbox(lv, "#ece7dc", 0, 0, OUT_W, Z_END, -.2, .2));
    /* külső falak: magas (homlokzat, tetővel) és metszett (alacsony, „babaház” nézet) változat */
    MAQ.shell = [[], []];
    const shellBox = (lv, x0, z0, x1, z1, tall) => { const h = tall ? FLOOR_H - .2 : 1.05; const g = new THREE.BoxGeometry(x1 - x0, h, z1 - z0); g.translate((x0 + x1) / 2, h / 2, (z0 + z1) / 2); return g; };
    [0, 1].forEach((lv) => [true, false].forEach((tall) => {
      const gs = [[0, 0, OUT_W, WALL], [0, Z_END - WALL, OUT_W, Z_END], [0, 0, WALL, Z_END], [OUT_W - WALL, 0, OUT_W, Z_END]].map((r) => [shellBox(lv, ...r, tall), new THREE.Matrix4()]);
      /* a lakások közti válaszfalak teljes szélességben */
      [Z_HALL - PART, Z_B - PART, Z_C - PART].forEach((z) => gs.push([shellBox(lv, WALL, z, OUT_W - WALL, z + PART, tall), new THREE.Matrix4()]));
      const m = mesh(mergeGeoms(gs), std({ color: tall ? "#f4f1ea" : "#f7f4ee", roughness: .9 }), MAQ.lv[lv]);
      m.castShadow = true; m.receiveShadow = true; m.userData.tall = tall; MAQ.shell[lv].push(m);
    }));
    /* lakások: padló, belső falak (metszett), bútorok */
    MAQ.apts = {};
    Object.keys(UNITS).forEach((id) => {
      const U = UNITS[id], Pl = planOf(id), lv = U.lvl;
      let bb = [1e9, 1e9, -1e9, -1e9];
      (Pl.rooms || []).forEach((r) => {
        const q = mapRect(U, r[1], r[2], r[3], r[4]);
        q[0] = Math.max(WALL, q[0]); q[2] = Math.min(OUT_W - WALL, q[2]);
        bb = [Math.min(bb[0], q[0]), Math.min(bb[1], q[1]), Math.max(bb[2], q[2]), Math.max(bb[3], q[3])];
        lbox(lv, ROOMCOL(r[0]), q[0], q[1], q[2], q[3], 0, .03);
        /* belső válaszfalak a szobák szélein (a külső falak mentén nem kell) */
        const t = .1, h = .95, inside = (v, a, b) => v > a + .05 && v < b - .05;
        if (inside(q[0], WALL, OUT_W - WALL)) lbox(lv, "#faf8f3", q[0] - t / 2, q[1], q[0] + t / 2, q[3], 0, h, { c: 1 });
        if (inside(q[2], WALL, OUT_W - WALL)) lbox(lv, "#faf8f3", q[2] - t / 2, q[1], q[2] + t / 2, q[3], 0, h, { c: 1 });
        lbox(lv, "#faf8f3", q[0], q[1] - t / 2, q[2], q[1] + t / 2, 0, h, { c: 1 });
        lbox(lv, "#faf8f3", q[0], q[3] - t / 2, q[2], q[3] + t / 2, 0, h, { c: 1 });
      });
      furnish(lv, U, Pl, lbox, LP);
      MAQ.apts[id] = { id, lv, bb, name: ((T.GROUPS.find((q) => q.id === id) || {}).name) || id, no: (T.GROUPS.find((q) => q.id === id) || {}).no, lock: !!(T.GROUPS.find((q) => q.id === id) || {}).lock,
        area: (Pl.rooms || []).reduce((s, r) => s + r[3] * r[4], 0) };
    });
    /* fedett bejáró a lépcsővel (földszint) és emeleti folyosó/terasz */
    lbox(0, "#cfc6b4", WALL, Z_HALL, OUT_W - WALL, Z_B - PART, 0, .03);
    for (let k = 0; k < 15; k++) lbox(0, "#d7d3cb", WALL, Z_B - PART - .3 - k * .26, WALL + 1.0, Z_B - PART - k * .26, 0, .19 * (k + 1), { c: 1 });
    lbox(1, "#a98a66", WALL + 1.1, Z_HALL, OUT_W - WALL, Z_B - PART, 0, .04);         /* emeleti terasz a bejáró fölött */
    lbox(1, "#cfd8dc", WALL + 1.1, Z_HALL + .02, OUT_W - WALL, Z_HALL + .06, .04, 1.0, { glass: 1 });
    /* elöl: Korvett terasza (földszint) és a Fregatt erkélye (emelet) */
    lbox(0, "#a98a66", 0, -1.45, OUT_W, 0, -.06, .06); lbox(1, "#a98a66", 0, -1.45, OUT_W, 0, -.18, .18);
    lbox(1, "#cfd8dc", 0, -1.45, OUT_W, -1.4, 0, 1.0, { glass: 1 }); lbox(1, "#cfd8dc", 0, -1.45, .05, 0, 0, 1.0, { glass: 1 }); lbox(1, "#cfd8dc", OUT_W - .05, -1.45, OUT_W, 0, 0, 1.0, { glass: 1 });
    /* hátul: a Schooner terasza (földszint) és a Kadett emeleti fa terasza oszlopokon, csigalépcsővel */
    lbox(0, "#a98a66", 0, Z_END, OUT_W, Z_END + 2.9, -.04, .06);
    lbox(1, "#9b7653", 0, Z_END, OUT_W, Z_END + 3.3, -.2, .2);
    [[.1, Z_END + 3.1], [OUT_W - .3, Z_END + 3.1]].forEach(([x, z]) => box("#e9e6dc", x, z, x + .2, z + .2, 0, Y1 - .2));
    lbox(1, "#cfd8dc", 0, Z_END + 3.25, OUT_W, Z_END + 3.3, 0, 1.0, { glass: 1 }); lbox(1, "#cfd8dc", OUT_W - .05, Z_END, OUT_W, Z_END + 3.3, 0, 1.0, { glass: 1 });
    for (let k = 0; k < 14; k++) { const a = k * .45; P("#8f969c", new THREE.BoxGeometry(.75, .05, .22), M4(-.6 + Math.cos(a) * .4, .2 * (k + 1), Z_END + 2.2 + Math.sin(a) * .4, -a)); }
    cyl("#7f868c", -.6, Z_END + 2.2, .05, 0, Y1 + 1.0, 8);
    /* lapos tető attikafallal (a légifelvétel szerint világos, lapos tető) */
    MAQ.roof = new THREE.Group(); model.add(MAQ.roof);
    const roofParts = [[new THREE.BoxGeometry(OUT_W, .25, Z_END + 1.45), M4(OUT_W / 2, roofY + .125, (Z_END - 1.45) / 2)]];
    [[0, -1.45, OUT_W, -1.3], [0, Z_END - .15, OUT_W, Z_END], [0, -1.45, .15, Z_END], [OUT_W - .15, -1.45, OUT_W, Z_END]].forEach(([x0, z0, x1, z1]) => roofParts.push([new THREE.BoxGeometry(x1 - x0, .5, z1 - z0), M4((x0 + x1) / 2, roofY + .5, (z0 + z1) / 2)]));
    const roofM = mesh(mergeGeoms(roofParts), std({ color: "#c9c9c4", roughness: .85 }), MAQ.roof); roofM.castShadow = true; roofM.receiveShadow = true;
    /* ablakok és üvegajtók a homlokzaton (az alaprajzok nyílászáróiból, a külső falakon) */
    Object.keys(UNITS).forEach((id) => {
      const U = UNITS[id], Pl = planOf(id);
      (Pl.furn || []).forEach((f) => {
        if (f[0] !== "window" && f[0] !== "door") return;
        const q = mapRect(U, f[1], f[2], f[3], f[4]), cx = (q[0] + q[2]) / 2, cz = (q[1] + q[3]) / 2;
        const onX = cx < WALL + .35 || cx > OUT_W - WALL - .35, onZ = cz < WALL + .4 || cz > Z_END - WALL - .4 || Math.abs(cz - (Z_A - WALL)) < .4;
        if (!onX && !onZ) return;
        const door = f[0] === "door", y0 = door ? 0 : .9, h = door ? 2.1 : 1.25;
        if (onX) { const x = cx < OUT_W / 2 ? -.02 : OUT_W + .02, len = q[3] - q[1]; MAQ.win = MAQ.win || []; MAQ.win.push([U.lvl, x, cz, .05, Math.max(.5, len), y0, h]); }
        else { const z = cz < Z_END / 2 ? -.02 : Z_END + .02, len = q[2] - q[0]; MAQ.win = MAQ.win || []; MAQ.win.push([U.lvl, cx, z, Math.max(.5, len), .05, y0, h]); }
      });
    });
    (MAQ.win || []).forEach(([lv, x, z, w, d, y0, h]) => { lbox(lv, "#2d4a63", x - w / 2, z - d / 2, x + w / 2, z + d / 2, y0, h, { glass: 1, tall: 1 }); lbox(lv, "#ffffff", x - w / 2 - .04, z - d / 2 - .01, x + w / 2 + .04, z + d / 2 + .01, y0 - .06, .06, { tall: 1 }); });

    /* ---------- az összevont részek kirajzolása ---------- */
    const mk = (pt, parent) => {
      const o = pt.opt || {};
      const mat = o.glass ? std({ color: pt.col, roughness: .1, metalness: .2, transparent: true, opacity: .45, depthWrite: false }) : std({ color: pt.col, roughness: o.flat ? .95 : .8, flatShading: !!o.flat });
      const m = mesh(mergeGeoms(pt.list), mat, parent); m.castShadow = !o.glass; m.receiveShadow = true; m.userData.tall = !!o.tall; return m;
    };
    Object.values(parts).forEach((pt) => mk(pt, model));
    MAQ.tallBits = [[], []];
    [0, 1].forEach((lv) => Object.values(lvParts[lv]).forEach((pt) => { const m = mk(pt, MAQ.lv[lv]); if (pt.opt && pt.opt.tall) MAQ.tallBits[lv].push(m); }));

    /* ---------- lakásonkénti kiemelés, felirat, választás ---------- */
    Object.values(MAQ.apts).forEach((A) => {
      const col = new THREE.Color(APTCOL[A.id] || "#999");
      const gm = basic({ color: col, transparent: true, opacity: 0, depthWrite: false });
      const glow = mesh(new THREE.BoxGeometry(A.bb[2] - A.bb[0] + .2, FLOOR_H - .3, A.bb[3] - A.bb[1] + .2), gm, MAQ.lv[A.lv]);
      glow.position.set((A.bb[0] + A.bb[2]) / 2, (FLOOR_H - .3) / 2, (A.bb[1] + A.bb[3]) / 2);
      A.glow = glow; A.gm = gm; A.col = col;
      glow.userData.xr = { hover: (on) => maqHover(A, on), click: () => maqSelect(A) };
      T.xr.extra.add(glow); W.objs.push(glow);
    });
    maqAvail();

    /* ---------- tájolás: iránytű és a Balaton iránya a talapzat elején ---------- */
    const rose = canvasTex(512, 512, (g) => {
      g.translate(256, 256); g.strokeStyle = "#c9a24a"; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 200, 0, TAU); g.stroke();
      g.fillStyle = "#e5262f"; g.beginPath(); g.moveTo(0, -190); g.lineTo(44, 0); g.lineTo(-44, 0); g.closePath(); g.fill();
      g.fillStyle = "#f3efe6"; g.beginPath(); g.moveTo(0, 190); g.lineTo(44, 0); g.lineTo(-44, 0); g.closePath(); g.fill();
      g.fillStyle = "#f3efe6"; g.font = "900 96px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("É", 0, -240 + 30);
    });
    const ro = mesh(new THREE.PlaneGeometry(3.6, 3.6), basic({ map: rose, transparent: true, depthWrite: false }), model);
    /* a −z (az utca felé) 345°; az észak ettől 15°-kal az óramutató járása szerint */
    ro.rotation.set(-Math.PI / 2, 0, -15 * D2R); ro.position.set(9.4, .08, 4.5);
    const lake = canvasTex(1024, 256, (g) => { g.fillStyle = "rgba(58,127,168,.92)"; g.fillRect(0, 0, 1024, 256); g.fillStyle = "#fff"; g.font = "800 70px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("▼ erre a Balaton · kb. 100 m", 512, 128); });
    const lk = mesh(new THREE.PlaneGeometry(10, 2.5), basic({ map: lake, transparent: true }), model); lk.rotation.set(-Math.PI / 2, 0, Math.PI); lk.position.set(CX, .07, -8.4);
    /* névtábla a talapzat elején */
    const plate = canvasTex(1024, 160, (g) => { g.fillStyle = "#c9a24a"; g.fillRect(0, 0, 1024, 160); g.fillStyle = "#2a1c0c"; g.font = "800 60px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ZEPHYR APARTMANHÁZ · ZAMÁRDI", 512, 66); g.font = "500 32px Georgia, serif"; g.fillText("Gáspár András utca 58. · M 1:60 · a hivatalos tervrajz szerint", 512, 124); });
    const pl = mesh(new THREE.PlaneGeometry(baseW * .9, baseW * .9 * 160 / 1024), basic({ map: plate }), turn); pl.position.set(0, -.024, -(baseD / 2) - .0155); pl.rotation.y = Math.PI;

    /* ---------- fény: a napállás szerint, árnyékkal ---------- */
    const r = T.sceneEl.renderer; MAQ.shadowWas = r.shadowMap.enabled; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    MAQ.lights = addLights(new THREE.Vector3(.4, .9, .3).normalize(), true);
    MAQ.lights.hemi.intensity = .62; MAQ.lights.amb.intensity = .12;
    const sun = MAQ.lights.sun; sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536); sun.shadow.bias = -.0004; sun.shadow.normalBias = .002;
    const sc = sun.shadow.camera; sc.left = -.7; sc.right = .7; sc.top = .7; sc.bottom = -.7; sc.near = .05; sc.far = 6; sc.updateProjectionMatrix();
    MAQ.sunTgt = new THREE.Object3D(); stand.add(MAQ.sunTgt); sun.target = MAQ.sunTgt;
    MAQ.day = (T.sunDefaultDay && T.sunDefaultDay()) || "2027-07-15"; MAQ.hour = 15;
    maqLight();

    /* ---------- elhelyezés: asztalmagasságban, előttünk; a ház utcafrontja felénk ---------- */
    const y = T.inVR ? .9 : -.42, dist = T.inVR ? .7 : .6, yaw = T.camYaw();
    stand.position.set(-Math.sin(yaw) * dist, y, -Math.cos(yaw) * dist); stand.rotation.y = yaw;
    if (!T.inVR) { const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject) lc.pitchObject.rotation.x = -.6; }
    turn.rotation.y = Math.PI + .35;   /* az utca felénk, kissé oldalról – így látszik a parkoló is */
    /* kerek asztal – a makett szabadon forgatható rajta */
    const tr = Math.hypot(baseW, baseD) / 2 + .06;
    const table = mesh(new THREE.CylinderGeometry(tr, tr, .04, 64), std({ color: "#3b2a1d", roughness: .45 }), stand); table.position.y = -.07; table.receiveShadow = true;
    MAQ.table = table;
    const leg = mesh(new THREE.CylinderGeometry(.05, .09, .85, 16), std({ color: "#2a1d13", roughness: .5 }), table); leg.position.y = -.44;
    const foot = mesh(new THREE.CylinderGeometry(.28, .3, .03, 32), std({ color: "#2a1d13", roughness: .5 }), table); foot.position.y = -.87;
    mesh(new THREE.SphereGeometry(40, 32, 16), basic({ color: "#1b2a3a", side: THREE.BackSide }), root);
    const floor = mesh(new THREE.CircleGeometry(12, 48), std({ color: "#2c3a48", roughness: .95 }), root); floor.rotation.x = -Math.PI / 2; floor.position.y = T.inVR ? 0 : -1.4;
    MAQ.upper = true; MAQ.roofOn = false; MAQ.sel = null; MAQ.auto = undefined;
    W.onClose = () => { try { T.sceneEl.renderer.shadowMap.enabled = MAQ.shadowWas; } catch (e) {} };
    return { tick: maqTick, panel: maqPanel, hud: maqHud };
  }

  /* bútorok az alaprajz tereptárgyaiból – egyszerű, de felismerhető formák */
  function furnish(lv, U, Pl, lbox) {
    (Pl.furn || []).forEach((f) => {
      const [type, x, y, w0, d0, , rot] = f; if (["door", "window", "area", "lane", "stairs"].includes(type) || !(w0 > .05 && d0 > .05)) return;
      const sw = Math.abs(rot || 0) % 180 === 90, w = sw ? d0 : w0, d = sw ? w0 : d0, cx = x + w0 / 2, cy = y + d0 / 2;
      const q = mapRect(U, cx - w / 2, cy - d / 2, w, d); const [x0, z0, x1, z1] = q, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const long = (x1 - x0) > (z1 - z0);
      switch (type) {
        case "bed": lbox(lv, "#8d6e52", x0, z0, x1, z1, .03, .3); lbox(lv, "#f7f4ee", x0 + .04, z0 + .04, x1 - .04, z1 - .04, .33, .18);
          lbox(lv, "#3d8fe2", x0 + .04, z0 + .04 + (z1 - z0) * .35, x1 - .04, z1 - .04, .5, .03);   /* takaró */
          if (long) { lbox(lv, "#ffffff", x0 + .1, z0 + .15, x0 + .55, z1 - .15, .51, .12); } else { lbox(lv, "#ffffff", x0 + .15, z0 + .1, x1 - .15, z0 + .5, .51, .12); } break;
        case "sofa": lbox(lv, "#7d8a96", x0, z0, x1, z1, .03, .42);
          if (long) lbox(lv, "#6b7884", x0, z1 - .22, x1, z1, .45, .38); else lbox(lv, "#6b7884", x1 - .22, z0, x1, z1, .45, .38); break;
        case "table4": case "table6": case "table2": case "table5": case "table":
          lbox(lv, "#9c6b3f", x0, z0, x1, z1, .72, .05); [[x0, z0], [x1 - .06, z0], [x0, z1 - .06], [x1 - .06, z1 - .06]].forEach(([a, b]) => lbox(lv, "#6b4426", a, b, a + .06, b + .06, .03, .7)); break;
        case "chair": lbox(lv, "#7a5a3a", x0 + .05, z0 + .05, x1 - .05, z1 - .05, .43, .05); lbox(lv, "#7a5a3a", x0 + .05, z0 + .05, x1 - .05, z0 + .1, .48, .45); break;
        case "shower": lbox(lv, "#e6eef2", x0, z0, x1, z1, .03, .06); lbox(lv, "#bfe3f0", x0, z0, x1, z0 + .03, .09, 1.9, { glass: 1 }); lbox(lv, "#bfe3f0", x0, z0, x0 + .03, z1, .09, 1.9, { glass: 1 }); break;
        case "wc": lbox(lv, "#ffffff", x0 + .05, z0 + .05, x1 - .05, z1 - .05, .03, .4); break;
        case "sink": lbox(lv, "#ffffff", x0, z0, x1, z1, .78, .12); break;
        case "counter": lbox(lv, "#e9e6df", x0, z0, x1, z1, .03, .85); lbox(lv, "#3b3b3b", x0, z0, x1, z1, .88, .04); break;
        case "washer": lbox(lv, "#f2f2f2", x0, z0, x1, z1, .03, .85); break;
        case "tv": lbox(lv, "#1a1a1a", x0, z0, x1, z1, .9, .45); break;
        case "shelf": lbox(lv, "#c9a77b", x0, z0, x1, z1, .03, 1.6); break;
        default: {
          const lab = String(f[5] || ""), h = /szekrény/.test(lab) ? 2.0 : /hűtő/.test(lab) ? 1.75 : /klíma|bojler/.test(lab) ? 0 : /fotel|pouf/.test(lab) ? .45 : /asztal/.test(lab) ? .74 : .55;
          if (h > 0) lbox(lv, /szekrény/.test(lab) ? "#c9b28f" : /hűtő/.test(lab) ? "#f4f4f4" : /fotel/.test(lab) ? "#8a7a6a" : "#cbb894", x0, z0, x1, z1, .03, h);
        }
      }
    });
  }
  /* ha a foglalásban már van időpont: szabad (zöld) / foglalt (piros) */
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
  function maqLight() {
    const L = MAQ.lights; if (!L) return;
    const s = sunDirFor(MAQ.day, MAQ.hour); MAQ.sunInfo = s.p;
    const v = s.v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), MAQ.turn.rotation.y + MAQ.stand.rotation.y);
    MAQ.stand.updateMatrixWorld(true);
    const c = new THREE.Vector3(); MAQ.stand.getWorldPosition(c);
    MAQ.sunTgt.position.set(0, 0, 0);
    L.sun.position.copy(c).addScaledVector(v, 3);
    const low = s.p.el < 0; L.sun.intensity = low ? .2 : 1.15; L.sun.color.set(s.p.el < 12 ? 0xffc48a : 0xfff0d8);
  }
  function maqHover(A, on) {
    A.hov = on;
    if (!A.label) {
      const cap = (() => { try { const c = ZephyrBooking.vr.cfg(); const a = c && c.apartments.find((q) => q.id === A.id); return a ? a.cap + " fő · " : ""; } catch (e) { return ""; } })();
      A.label = labelSprite([(A.no ? A.no + " · " : "") + A.name, A.lock ? "saját lakás – nem foglalható" : `${cap}kb. ${Math.round(A.area)} m² · csippents rá`], { size: 7.5, fs: 50 });
      A.label.position.set((A.bb[0] + A.bb[2]) / 2, FLOOR_H + 2.6, (A.bb[1] + A.bb[3]) / 2); MAQ.lv[A.lv].add(A.label);
    }
    A.label.visible = !!on || MAQ.sel === A;
  }
  /* választás: kártya két gombbal – belépés a lakásba / foglalás ezzel a lakással */
  function maqSelect(A) {
    if (MAQ.sel && MAQ.sel !== A && MAQ.sel.label) MAQ.sel.label.visible = false;
    MAQ.sel = A; maqHover(A, true);
    if (MAQ.card) { T.xr.extra.delete(MAQ.card); W.objs = W.objs.filter((o) => o !== MAQ.card); MAQ.card.parent && MAQ.card.parent.remove(MAQ.card); MAQ.card = null; }
    const CW = 1000, CH = 420, btns = [];
    const tx = canvasTex(CW, CH, (g) => {
      g.fillStyle = "rgba(9,34,70,.94)"; g.beginPath(); g.roundRect ? g.roundRect(6, 6, CW - 12, CH - 12, 40) : g.rect(6, 6, CW - 12, CH - 12); g.fill(); g.lineWidth = 8; g.strokeStyle = "#" + A.col.getHexString(); g.stroke();
      g.fillStyle = "#ffd166"; g.font = "800 64px system-ui, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText((A.no ? A.no + " · " : "") + A.name, 50, 80);
      g.fillStyle = "#fff"; g.font = "600 38px system-ui, sans-serif";
      const st = A.free === true ? "✓ szabad a választott időpontban" : A.free === false ? "✕ foglalt a választott időpontban" : `kb. ${Math.round(A.area)} m² · ${A.lv ? "emelet" : "földszint"}`;
      g.fillText(A.lock ? "A tulajdonos saját lakása – nem foglalható" : st, 50, 150);
      const bt = (x, w, label, on, fn) => { btns.push({ x, y: 220, w, h: 150, fn }); g.fillStyle = on ? "#ffd166" : "rgba(255,255,255,.14)"; g.beginPath(); g.roundRect ? g.roundRect(x, 220, w, 150, 30) : g.rect(x, 220, w, 150); g.fill(); g.lineWidth = 4; g.strokeStyle = "rgba(255,255,255,.4)"; g.stroke(); g.fillStyle = on ? "#0b2f5e" : "#fff"; g.font = "800 46px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(label, x + w / 2, 296); };
      if (A.lock) bt(50, CW - 100, "‹ Bezárás", false, () => maqDeselect());
      else { bt(50, 430, "👁 Belépés", false, () => maqEnter(A)); bt(500, 450, "📅 Foglalás", true, () => maqBook(A)); }
    });
    const card = mesh(new THREE.PlaneGeometry(.4, .4 * CH / CW), basic({ map: tx, transparent: true, depthTest: false, depthWrite: false }), MAQ.stand);
    card.renderOrder = 996; card.position.set(0, .36, 0);
    card.userData.xr = { click: (h) => { if (!h || !h.uv) return; const x = h.uv.x * CW, y = (1 - h.uv.y) * CH; const b = btns.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); if (b) b.fn(); } };
    T.xr.extra.add(card); W.objs.push(card); MAQ.card = card;
  }
  function maqDeselect() { if (MAQ.sel && MAQ.sel.label) MAQ.sel.label.visible = false; MAQ.sel = null; if (MAQ.card) { T.xr.extra.delete(MAQ.card); MAQ.card.visible = false; } }
  function maqEnter(A) {
    if (A.lock) return;
    const best = (T.GROUPS.find((q) => q.id === A.id) || {}).entry;
    W.close(() => T.go(best));
  }
  function maqBook(A) { if (A.lock) return; W.close(() => { try { T.book(A.id); } catch (e) { if (window.ZephyrBooking) ZephyrBooking.open({ apt: A.id }); } }); }
  function maqTick(dt) {
    Object.values(MAQ.apts).forEach((A) => {
      const show = A.lv === 0 || MAQ.upper;
      MAQ.lv[A.lv].visible = A.lv === 0 || MAQ.upper;
      const base = A.free === true ? .2 : A.free === false ? .16 : 0, tgt = A.hov || MAQ.sel === A ? .34 : base;
      if (A.free === true) A.gm.color.set("#3fb37f"); else if (A.free === false) A.gm.color.set("#e5262f"); else A.gm.color.copy(A.col);
      A.gm.opacity += (tgt - A.gm.opacity) * Math.min(1, dt * 8); A.glow.visible = show;
    });
    MAQ.roof.visible = MAQ.roofOn && MAQ.upper;
    /* tetővel: teljes magasságú homlokzat (ablakokkal); tető nélkül: metszett „babaház” nézet */
    [0, 1].forEach((lv) => { const tall = MAQ.roofOn || (lv === 0 && MAQ.upper); MAQ.shell[lv].forEach((m) => (m.visible = m.userData.tall === tall)); MAQ.tallBits[lv].forEach((m) => (m.visible = tall)); });
    if (!T.inVR && !MAQ.drag && MAQ.auto !== false) MAQ.turn.rotation.y += dt * .05;
    MAQ.lt = (MAQ.lt || 0) + dt; if (MAQ.lt > .25) { MAQ.lt = 0; maqLight(); }
  }
  const hhmm = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
  function sunLine() { const p = MAQ.sunInfo || { az: 0, el: 0 }; return p.el < 0 ? "a nap már lement" : `a nap ${["É", "ÉK", "K", "DK", "D", "DNy", "Ny", "ÉNy"][Math.round(p.az / 45) % 8]} felől, ${Math.round(p.el)}°`; }
  function maqPanel(P) {
    P.title("A ház makettje", "a hivatalos tervrajz szerint · M 1:60");
    P.row(0, "Csippents egy lakásra: belépés vagy foglalás", "#ffffff");
    P.row(1, MAQ.dates ? "Zöld = szabad, piros = foglalt a napjaidon" : "Forgatás: fogd meg a talapzatot és húzd", "#ffd166");
    P.row(2, `Fény: ${MAQ.day.slice(5).replace("-", ".")}. ${hhmm(MAQ.hour)} – ${sunLine()}`, "#ffd166");
    P.buttons([[MAQ.upper ? "Emelet ki" : "Emelet be", () => { MAQ.upper = !MAQ.upper; }], [MAQ.roofOn ? "Tető ki" : "Tető be", () => { MAQ.roofOn = !MAQ.roofOn; }],
      ["☀ −1 ó", () => { MAQ.hour = Math.max(5, MAQ.hour - 1); maqLight(); }], ["☀ +1 ó", () => { MAQ.hour = Math.min(21, MAQ.hour + 1); maqLight(); }], ["‹ Vissza", () => W.close()]]);
  }
  function maqHud(H) {
    H.title("A ház makettje", "A hivatalos tervrajz szerint · koppints egy lakásra: belépés vagy foglalás");
    H.buttons([[MAQ.upper ? "Emelet elrejtése" : "Emelet mutatása", () => { MAQ.upper = !MAQ.upper; }], [MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }],
      ["☀ korábban", () => { MAQ.hour = Math.max(5, MAQ.hour - 1); maqLight(); }], ["☀ később", () => { MAQ.hour = Math.min(21, MAQ.hour + 1); maqLight(); }],
      ["⟲", () => { MAQ.auto = false; MAQ.turn.rotation.y -= .4; }], ["⟳", () => { MAQ.auto = false; MAQ.turn.rotation.y += .4; }]]);
    H.hint(`Fény: ${MAQ.day.replace(/-/g, ".")}. ${hhmm(MAQ.hour)} – ${sunLine()}${MAQ.dates ? " · zöld = szabad, piros = foglalt" : ""}`);
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
        buttons(list) {
          const n = list.length, gap = 16, w = (PW - 80 - gap * (n - 1)) / n, y = PH - 150, h = 110;
          list.forEach(([lbl, fn, on], i) => {
            const x = 40 + i * (w + gap), k = P.btns.length, hov = k === P.hov; P.btns.push({ x, y, w, h, fn });
            g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 24) : g.rect(x, y, w, h);
            g.fillStyle = on ? "#ffd166" : hov ? "rgba(255,255,255,.32)" : "rgba(255,255,255,.12)"; g.fill(); g.lineWidth = hov ? 5 : 2; g.strokeStyle = hov ? "#ffd166" : "rgba(255,255,255,.35)"; g.stroke();
            g.fillStyle = on ? "#0b2f5e" : "#fff"; g.font = `700 ${lbl.length > 14 ? 30 : 38}px system-ui, sans-serif`; g.textAlign = "center"; g.fillText(lbl, x + w / 2, y + h / 2 + 2);
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
    saved = { rigY: T.rig.object3D.rotation.y, skyVis: sky.object3D.visible, spotsVis: T.spots.object3D.visible, clip: T.sceneEl.renderer.localClippingEnabled, scene: T.current,
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
    safe(() => { W.spec = kind === "sail" ? buildSail() : buildMaquette(); finishOpen(); });
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
    Object.keys(TEXC).forEach((k) => delete TEXC[k]);
    W.disposables = []; W.objs = []; W.root = null; W.panel = null; W.spec = null;
    if (W.hud) { W.hud.el.remove(); W.hud = null; }
    document.body.classList.remove("world-on");
    const sky = T.sky, sm = sky && sky.getObject3D("mesh");
    if (saved) {
      sky.object3D.visible = true; T.spots.object3D.visible = true;
      if (sm) { sm.material.depthTest = saved.skyDepth; sm.material.depthWrite = true; sm.renderOrder = saved.skyOrder; sm.material.needsUpdate = true; }
      T.sceneEl.renderer.localClippingEnabled = saved.clip;
      if (!T.inVR) T.rig.object3D.rotation.y = saved.rigY;
    }
    T.setBusy(false);
    if (after) setTimeout(after, 50);
  };
  W.active = false;
})();
