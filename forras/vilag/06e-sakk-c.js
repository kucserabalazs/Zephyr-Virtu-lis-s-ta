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
    U.uHL = { value: tex }; U.uLSq = { value: new THREE.Color(.33, .56, .5) }; U.uDSq = { value: new THREE.Color(.025, .05, .13) }; U.uPulse = { value: 0 };
    const damp = `float bDamp(vec2 q){ return 1. - .66 * (1. - smoothstep(${BH.toFixed(1)}, ${(BH + 14).toFixed(1)}, max(abs(q.x), abs(q.y)))); }\n`;
    mat.vertexShader = mat.vertexShader.replace("void main(){", damp + "void main(){").replace("vec3 disp = vec3(0.);", "fadeD *= bDamp(w); vec3 disp = vec3(0.);");
    const BASE = "vec3 base = mix(uDeep, uShallow, clamp(.35 + crest * 1.6 + n.x * .8, 0., 1.)) * (1. - gust * .16) * uLight;";
    if (mat.fragmentShader.indexOf(BASE) < 0) console.warn("sakk: a víz árnyalója megváltozott");
    mat.fragmentShader = mat.fragmentShader
      .replace("uniform vec4 uW[5];", "uniform vec4 uW[5]; uniform sampler2D uHL; uniform vec3 uLSq, uDSq; uniform float uPulse;")
      .replace("void main(){", damp + "void main(){")
      .replace("float px = length(fwidth(vW)) + 1e-4;", "fadeD *= bDamp(vW); float px = length(fwidth(vW)) + 1e-4;")
      .replace(BASE, BASE + `
          vec3 bHL = vec3(0.); vec2 bq = vW / ${SQ.toFixed(1)} + 4.;
          if (bq.x > 0. && bq.x < 8. && bq.y > 0. && bq.y < 8.) {
            vec2 cell = floor(bq), fr = fract(bq) - .5; float lt = 1. - mod(cell.x + cell.y, 2.);
            float shade = clamp(.62 + crest * 2.4 + n.x * 1.1, .2, 1.45);
            vec3 sqc = mix(uDSq, uLSq, lt) * shade * uLight;
            float cau = lt * pow(vn(vW * 1.25 + vec2(uT * .35, -uT * .27)) * vn(vW * 1.7 - vec2(uT * .3, uT * .22)) * 1.9, 2.2) * .2;
            base = mix(base, sqc + cau * vec3(1., .86, .62), .88);
            float edge = max(abs(fr.x), abs(fr.y));
            base *= 1. - .3 * smoothstep(.46, .5, edge);
            vec4 hl = texture2D(uHL, (cell + .5) / 8.);
            float hp = hl.a > .99 ? (.55 + .45 * uPulse) : 1.;
            bHL = hl.rgb * hl.a * hp * (.38 + 1.0 * smoothstep(.34, .5, edge));
          }`)
      .replace("vec3 col = mix(base, sky, fres * .75);", "vec3 col = mix(base, sky, fres * .75 * (bq.x > 0. && bq.x < 8. && bq.y > 0. && bq.y < 8. ? .55 : 1.)); col += bHL;");
    mat.needsUpdate = true;
    U.uSkyH.value.setRGB(1.0, .6, .45); U.uSkyZ.value.setRGB(.33, .3, .55); U.uDeep.value.setRGB(.03, .05, .11); U.uShallow.value.setRGB(.13, .17, .25);
    U.uSunC.value.setRGB(1.5, .9, .45); U.uHaze.value.setRGB(.82, .56, .55); U.uLight.value = .85;
    return { tex, data };
  }
  /* a víz magassága egy pontban (a hajók ringásához) – a tábla fölött csillapítva, mint az árnyalóban */
  const bDampJS = (x, z) => 1 - .66 * (1 - smoothstepJS(BH, BH + 14, Math.max(Math.abs(x), Math.abs(z))));
  function smoothstepJS(a, b, x) { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); }
  const waveB = (x, z) => waveAt(x, z, W.t) * bDampJS(x, z);

  /* úszó kötélsorok a mezők között (úszók: egy példányosított háló, a csúcsárnyalóban ringanak) */
  const WAVE_GLSL = () => `uniform float uWT; uniform vec4 uWW[5]; uniform float uWD;
    float wH(vec2 p){ float y = 0.; for (int i = 0; i < 5; i++){ float dir = uWD + uWW[i].x, k = uWW[i].y, A = uWW[i].z, c = sqrt(9.81 / k); y += A * sin(k * (cos(dir) * p.x + sin(dir) * p.y) - k * c * uWT); }
      return y * (1. - .66 * (1. - smoothstep(${BH.toFixed(1)}, ${(BH + 14).toFixed(1)}, max(abs(p.x), abs(p.y))))); }`;
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
    const M = new THREE.Matrix4(), col = new THREE.Color(), cw = new THREE.Color("#f2ead6"), cg = new THREE.Color("#d9a83a"), cn = new THREE.Color("#183a6a");
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
    /* korlát: sárgaréz oszlopok, két rúd, elöl üvegfal (nem takar) */
    const rail = (a, b) => { L.push(ROD(V3(a[0], TOWER_Y + 1.05, a[1]), V3(b[0], TOWER_Y + 1.05, b[1]), .035, br, "m"), ROD(V3(a[0], TOWER_Y + .55, a[1]), V3(b[0], TOWER_Y + .55, b[1]), .02, br, "m")); };
    const cr = [[-3.1, -2.7], [3.1, -2.7], [3.1, 2.7], [-3.1, 2.7]];
    for (let k = 0; k < 4; k++) { const a = cr[k], b = cr[(k + 1) % 4]; if (k === 2) { rail(a, [1.4, 2.7]); rail([-1.4, 2.7], b); } else rail(a, b);
      for (let f = 0; f <= 6; f++) { const px = lerp(a[0], b[0], f / 6), pz = lerp(a[1], b[1], f / 6); if (k === 2 && Math.abs(px) < 1.3) continue; L.push([CY(.03, .03, 1.05, 6), br, M4(px, TOWER_Y + .52, pz), "m"], [new THREE.SphereGeometry(.05, 8, 6), br, M4(px, TOWER_Y + 1.08, pz), "m"]); } }
    /* vitorlavászon árnyékoló, zászlórúd, távcső, hajóharang */
    [[-3, 2.6], [3, 2.6]].forEach(([px, pz]) => L.push([CY(.06, .06, 3.4, 8), "#f2efe6", M4(px, TOWER_Y + 1.7, pz)]));
    L.push([CY(.05, .07, 5.5, 8), "#f2efe6", M4(0, TOWER_Y + 2.75, 2.6)]);
    L.push(ROD(V3(2.2, TOWER_Y, -1.6), V3(2.0, TOWER_Y + 1.25, -1.7), .03, br, "m"), ROD(V3(2.6, TOWER_Y, -1.9), V3(2.0, TOWER_Y + 1.25, -1.7), .03, br, "m"), ROD(V3(1.8, TOWER_Y, -1.9), V3(2.0, TOWER_Y + 1.25, -1.7), .03, br, "m"));
    L.push([CY(.07, .1, 1.1, 12).rotateX(Math.PI / 2 - .12), br, M4(2.0, TOWER_Y + 1.35, -1.85), "m"]);
    L.push([CY(.18, .26, .34, 14), br, M4(-2.4, TOWER_Y + 1.5, -2.4), "m"], [BX(.06, .5, .06), dark, M4(-2.4, TOWER_Y + 1.2, -2.6)], [BX(.5, .06, .06), dark, M4(-2.4, TOWER_Y + 1.72, -2.45)]);
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
