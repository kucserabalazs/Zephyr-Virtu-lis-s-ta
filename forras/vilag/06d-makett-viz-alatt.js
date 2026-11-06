
  /* =================================================================== 3/C. MERÜLÉS A BALATONBA – a stég előtt, a víz alatt (a Meta „Oceanarium” élménye nyomán, de balatoni élővilággal)
     • A felszín alulról: hullámzó, csillogó tükör; fölötted a „Snell-ablak” fényes köre, lefelé fénypászmák, a homokos fenéken fényhálók (kausztika).
     • Halak (valódi balatoni fajok): küszraj (több száz ezüst kis hal), dévérkeszegek, pontyok, fogassüllők (a Balaton királya), csuka a hínárban,
       egy 2 méteres harcsa a fenék közelében, angolna. Rámutatva kiírja a nevét és egy mondatot róla.
     • Hínármező (süllőhínár, békaszőlő) ringatózik, kagylók és kövek a fenéken, egy elsüllyedt öreg fatörzs, buborékok, lebegő szemcsék.
     Koordináták: a site-ban, a stégtől északra (z ≈ −9); a fenék y = WATER_Y − 3,2; a fejed kb. 1,6 m-rel a felszín alatt. */
  const UW = {};
  const UW_Z = -9, UW_BOT = WATER_Y - 3.2;
  const FISH = {
    kusz:   { n: "Küsz", d: "A Balaton ezüst rajhala – egykor a halászok fő zsákmánya", len: .14, h: .03, w: .018, back: "#4c6a72", belly: "#e8eef0", fin: "#c9d3d6", metal: .75 },
    keszeg: { n: "Dévérkeszeg", d: "Magas hátú, lapos testű, a nádas szélén falatozik", len: .5, h: .15, w: .045, back: "#5a5a46", belly: "#d8cfa8", fin: "#6a6250", metal: .5 },
    ponty:  { n: "Ponty", d: "Aranyos-bronz pikkelyek, bajusz – a fenéken túr", len: .7, h: .2, w: .11, back: "#5e5228", belly: "#e2c27a", fin: "#7a5a2a", metal: .45 },
    fogas:  { n: "Fogassüllő", d: "A Balaton királya: a „fogas” csak innen kerül az asztalra", len: .65, h: .12, w: .08, back: "#5a6a62", belly: "#e2e6dc", fin: "#7a8a80", stripes: 7, metal: .4 },
    csuka:  { n: "Csuka", d: "Lesből vadászó ragadozó – a hínárban rejtőzik", len: .9, h: .12, w: .08, back: "#4a5a2a", belly: "#e0dcb0", fin: "#7a6a3a", spots: 1, metal: .3 },
    harcsa: { n: "Harcsa", d: "Európa legnagyobb édesvízi hala – ez itt 2 méteres!", len: 2.1, h: .32, w: .3, back: "#3a3a32", belly: "#b8b2a0", fin: "#2e2e28", metal: .1 },
    angolna:{ n: "Angolna", d: "Kígyózva úszik – a Sargasso-tengerből érkezett", len: .8, h: .05, w: .045, back: "#3a4030", belly: "#c8c4a0", fin: "#3a4030", metal: .2 }
  };
  /* hal-geometria: ellipszoid test (a feje −z felé), farokúszó, hátúszó, mellúszók; csúcsszínek (sötét hát, világos has, sávok) */
  function fishGeom(F) {
    const body = new THREE.SphereGeometry(.5, 18, 12); body.rotateX(Math.PI / 2);   /* pólusok a z tengelyen */
    const p = body.attributes.position, col = [];
    const cB = new THREE.Color(F.back), cL = new THREE.Color(F.belly), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const u = z + .5;                                    /* 0 = fej, 1 = farok */
      const taper = F === FISH.harcsa ? (1 - Math.pow(u, 1.6) * .75) : F === FISH.angolna ? 1 - Math.pow(u, 3) * .6 : Math.sin(Math.PI * Math.min(1, u * .95 + .08)) ** .7;
      x *= F.w * 2 * taper; y *= F.h * 2 * taper * (F === FISH.harcsa && u < .25 ? 1.1 : 1); z *= F.len;
      p.setXYZ(i, x, y, z);
      const k = clamp(.5 - y / (F.h * 2 * Math.max(taper, .2)) * 1.4, 0, 1);
      tmp.copy(cB).lerp(cL, smooth(k));
      if (F.stripes && Math.sin(u * F.stripes * TAU) > .55 && k < .6) tmp.multiplyScalar(.55);
      if (F.spots && Math.sin(x * 90 + z * 40) * Math.sin(z * 70) > .55 && k < .7) tmp.lerp(new THREE.Color("#d8d8a0"), .5);
      col.push(tmp.r, tmp.g, tmp.b);
    }
    body.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); body.computeVertexNormals();
    const fin = (shape, m) => { const g = new THREE.ShapeGeometry(shape); g.applyMatrix4(m); const c = new THREE.Color(F.fin); const n = g.attributes.position.count; const a = []; for (let i = 0; i < n; i++) a.push(c.r, c.g, c.b); g.setAttribute("color", new THREE.Float32BufferAttribute(a, 3)); return g; };
    const L = F.len, H = F.h;
    const tail = new THREE.Shape(); tail.moveTo(0, 0); tail.lineTo(L * .28, H * 1.1); tail.lineTo(L * .22, 0); tail.lineTo(L * .28, -H * 1.1); tail.closePath();
    const dors = new THREE.Shape(); dors.moveTo(-L * .12, 0); dors.lineTo(L * .02, H * .9); dors.lineTo(L * .14, 0); dors.closePath();
    const pect = new THREE.Shape(); pect.moveTo(0, 0); pect.lineTo(L * .12, H * .25); pect.lineTo(L * .1, -H * .15); pect.closePath();
    const rotY = new THREE.Matrix4().makeRotationY(-Math.PI / 2);   /* a síkidom x → z */
    const parts = [body];
    if (F !== FISH.angolna) parts.push(fin(tail, new THREE.Matrix4().makeTranslation(0, 0, L * .42).multiply(rotY)));
    parts.push(fin(dors, new THREE.Matrix4().makeTranslation(0, H * .85, F === FISH.angolna ? 0 : L * .02).multiply(rotY).multiply(new THREE.Matrix4().makeScale(F === FISH.angolna ? 4 : 1, F === FISH.angolna ? .3 : 1, 1))));
    [-1, 1].forEach((s) => parts.push(fin(pect, new THREE.Matrix4().makeTranslation(s * F.w * .9, -H * .3, -L * .22).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2 + s * .6)))));
    if (F === FISH.harcsa || F === FISH.ponty) {   /* bajuszszálak */
      const n = F === FISH.harcsa ? 2 : 1, len = F === FISH.harcsa ? .55 : .06;
      [-1, 1].forEach((s) => { for (let k = 0; k < n; k++) { const g = new THREE.CylinderGeometry(.004, .008, len, 4); g.translate(0, len / 2, 0); g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI / 2 - .3 - k * .5, 0, s * (.9 + k * .4)))); g.translate(s * F.w * .5, H * .1 - k * H * .3, -L * .48);
        const c = new THREE.Color("#2a2620"), a = []; for (let i = 0; i < g.attributes.position.count; i++) a.push(c.r, c.g, c.b); g.setAttribute("color", new THREE.Float32BufferAttribute(a, 3)); parts.push(g); } });
    }
    /* szem */
    [-1, 1].forEach((s) => { const g = new THREE.SphereGeometry(Math.max(.004, F.h * .14), 8, 6); g.translate(s * F.w * .75, H * .25, -L * .36); const c = new THREE.Color(F === FISH.fogas ? "#d8e6ea" : "#15171a"), a = []; for (let i = 0; i < g.attributes.position.count; i++) a.push(c.r, c.g, c.b); g.setAttribute("color", new THREE.Float32BufferAttribute(a, 3)); parts.push(g); });
    const merged = mergeGeoms(parts.map((g) => [g, new THREE.Matrix4()]));
    merged.computeBoundingSphere(); return merged;
  }
  /* úszómozgás a vertex-shaderben: a farok felé erősödő hullám (példányonként eltolt fázissal) */
  function swimify(mat, amp, freq, k, key) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uWT = ENV.wt;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWT;").replace("#include <begin_vertex>", `#include <begin_vertex>
        { float ph = 0.;
          #ifdef USE_INSTANCING
            ph = instanceMatrix[3].x * 3.1 + instanceMatrix[3].z * 2.3;
          #endif
          float u = clamp(position.z * ${(1 / Math.max(.01, k)).toFixed(3)} + .5, 0., 1.4);
          transformed.x += sin(uWT * ${freq.toFixed(2)} + ph - position.z * ${(6 / Math.max(.01, k)).toFixed(2)}) * ${amp.toFixed(4)} * (u * u + .05); }`);
    };
    mat.customProgramCacheKey = () => "swim-" + key; return mat;
  }
  function buildUnderwater(site) {
    const g = new THREE.Group(); site.add(g); g.visible = false; UW.g = g;
    const C = new THREE.Vector3(0, UW_BOT, UW_Z);
    /* „vízalatti égbolt”: a köd színe felé, felfelé világosabb, lefelé sötétebb */
    const dome = new THREE.SphereGeometry(70, 32, 16), dc = [];
    for (let i = 0; i < dome.attributes.position.count; i++) { const y = dome.attributes.position.getY(i) / 70; const c = new THREE.Color("#0e3a3c").lerp(new THREE.Color("#4fa59a"), smooth(clamp(y * .5 + .5, 0, 1))); dc.push(c.r, c.g, c.b); }
    dome.setAttribute("color", new THREE.Float32BufferAttribute(dc, 3));
    const dm = mesh(dome, basic({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }), g); dm.position.set(0, WATER_Y - 2, UW_Z); dm.renderOrder = -30; UW.dome = dm;
    /* a felszín alulról: hullámok, Snell-ablak, csillogás */
    const sU = { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uDay: { value: 1 }, uSky: { value: new THREE.Color() }, uSunW: { value: new THREE.Vector3(0, 1, 0) }, uSiteInv: { value: new THREE.Matrix4() } };
    const surf = mesh(new THREE.PlaneGeometry(160, 160, 1, 1), new THREE.ShaderMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false, fog: false, uniforms: sU,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uT, uDay; uniform vec3 uC, uSky, uSunW; uniform mat4 uSiteInv; varying vec3 vW;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
        void main(){
          vec3 d = normalize(vW - uC); float up = max(d.y, 0.);
          vec2 q = vW.xz * .8 + vec2(uT * .25, uT * .18); float n = vn(q) * .6 + vn(q * 2.3 - uT * .3) * .4;
          float win = smoothstep(.7, .8, up + (n - .5) * .1);                       /* Snell-ablak: kb. 97°-os kúp */
          vec3 inside = mix(vec3(.4, .7, .68), uSky, .3) * (.45 + .45 * uDay) * (.8 + .4 * n) + vec3(1., .96, .85) * pow(n, 7.) * 1.1 * uDay;
          vec3 outside = vec3(.12, .36, .36) * (.5 + .5 * uDay) + vec3(.4, .7, .65) * pow(n, 4.) * .35 * uDay;
          vec3 col = mix(outside, inside, win);
          /* a nap a Snell-ablakban (a fénytörés miatt „összenyomva”) */
          vec3 ad = normalize(vec3(d.x * 1.33, max(d.y, .05), d.z * 1.33));
          col += vec3(1., .95, .8) * pow(max(dot(ad, normalize(uSunW)), 0.), 60.) * 2.2 * win * uDay;
          /* a stég és a palló sötét sziluettje fölöttünk */
          vec3 sp = (uSiteInv * vec4(vW, 1.)).xyz;
          float deck = 1. - smoothstep(${(DECK_R - .1).toFixed(2)}, ${(DECK_R + .1).toFixed(2)}, length(sp.xz));
          float walk = (1. - smoothstep(1.05, 1.15, abs(sp.x))) * step(${DECK_R.toFixed(2)}, sp.z) * step(sp.z, ${SHORE_Z.toFixed(1)});
          col *= 1. - max(deck, walk) * .82;
          float dist = length(vW - uC); col = mix(col, vec3(.13, .38, .37) * (.35 + .65 * uDay), smoothstep(6., 38., dist));
          gl_FragColor = vec4(col, .97);
          #include <colorspace_fragment>
        }` }), g);
    W.disposables.push(surf.material); surf.rotation.x = -Math.PI / 2; surf.position.set(0, WATER_Y - .02, UW_Z); UW.surf = surf;
    /* a fenék: homok fodrokkal, kausztika (fényháló) */
    const bU = { uT: { value: 0 }, uDay: { value: 1 }, uC: { value: new THREE.Vector3() } };
    const bed = new THREE.PlaneGeometry(140, 140, 90, 90); bed.rotateX(-Math.PI / 2);
    { const p = bed.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); p.setY(i, Math.sin(x * 1.7 + z * .4) * .04 + Math.sin(x * .13) * Math.cos(z * .11) * .4 + (r > 30 ? -(r - 30) * .04 : 0) + (z > 12 ? (z - 12) * .12 : 0)); } bed.computeVertexNormals(); }
    const bedM = new THREE.ShaderMaterial({ uniforms: bU, fog: false,
      vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normal; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uT, uDay; uniform vec3 uC; varying vec3 vW; varying vec3 vN;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec2 h22(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
        float caust(vec2 p){ vec2 i = floor(p), f = fract(p); float m = 9.; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 o = vec2(x, y); vec2 r = o + .5 + .4 * sin(uT * .9 + 6.28 * h22(i + o)) - f; m = min(m, dot(r, r)); } return m; }
        void main(){
          vec2 p = vW.xz;
          float grain = h2(floor(p * 60.)) * .08 + h2(floor(p * 9.)) * .06;
          vec3 sand = vec3(.5, .47, .37) * (.86 + grain) * (.8 + .2 * vN.y);
          float c = pow(1. - clamp(caust(p * 1.3) * 1.6, 0., 1.), 5.) + pow(1. - clamp(caust(p * 2.1 + 3.) * 1.6, 0., 1.), 5.) * .6;
          vec3 col = sand * (.3 + .45 * uDay) + vec3(.85, 1., .82) * c * .32 * uDay;
          float dist = length(vW - uC); col = mix(col, vec3(.11, .33, .33) * (.35 + .65 * uDay), smoothstep(1., 20., dist));
          gl_FragColor = vec4(col, 1.);
          #include <colorspace_fragment>
        }` });
    W.disposables.push(bedM); const bm = mesh(bed, bedM, g); bm.position.set(0, UW_BOT, UW_Z); UW.bed = bm;
    UW.mats = [sU, bU];
    /* cölöpök a fenékig (algásan), a nád szára a fenékből */
    /* algák a cölöpökön (a cölöpök maguk a stéghez tartoznak, a fenékig érnek) */
    const algae = [];
    (ENV.postPos || []).forEach((p) => { for (let k = 0; k < 10; k++) { const a = rand() * TAU; algae.push(M4(p.x + Math.cos(a) * .17, UW_BOT + rr(.1, 2.2), p.z + Math.sin(a) * .17, rand() * TAU, 0, 0, 1, rr(.6, 1.4), 1)); } });
    const strip = new THREE.PlaneGeometry(.06, .5, 1, 6); strip.translate(0, .25, 0);
    const weed = (c) => { const m = std({ color: c, roughness: .8, side: THREE.DoubleSide }); m.onBeforeCompile = (sh) => { sh.uniforms.uWT = ENV.wt; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWT;").replace("#include <begin_vertex>", `#include <begin_vertex>
      { vec3 w0 = vec3(0.);
        #ifdef USE_INSTANCING
          w0 = instanceMatrix[3].xyz;
        #endif
        float hh = position.y; transformed.x += sin(uWT * 1.1 + w0.x * 1.7 + hh * 2.5) * .12 * hh * hh * 4.; transformed.z += cos(uWT * .9 + w0.z * 1.3 + hh * 2.) * .08 * hh * hh * 4.; }`); }; m.customProgramCacheKey = () => "weed" + c; return m; };
    inst(strip, weed("#5f7a3a"), algae, g);
    /* hínármező: hosszú, ringó szálak (süllőhínár) foltokban */
    const weeds = [];
    [[-6, -6, 30], [5, -7, 26], [-3, -13, 40], [8, -14, 30], [-10, -10, 34], [2, -18, 40], [-7, -2, 20], [7, -1, 20]].forEach(([x, z, n]) => { for (let k = 0; k < n; k++) { const a = rand() * TAU, r = Math.sqrt(rand()) * 1.8; weeds.push(M4(x + Math.cos(a) * r, UW_BOT - .05, z + Math.sin(a) * r, rand() * TAU, 0, 0, rr(1, 1.8), rr(2, 4.6), 1)); } });
    inst(strip, weed("#4f7a32"), weeds, g);
    /* nád szára (a stég körüli nádfoltok alatt) */
    const stems = []; ENV.reedSpots.forEach(([x, z]) => { for (let k = 0; k < 30; k++) { const a = rand() * TAU, r = Math.sqrt(rand()) * 1.9; stems.push(M4(x + Math.cos(a) * r, UW_BOT, z + Math.sin(a) * r, 0, rr(-.05, .05), rr(-.05, .05), 1, (WATER_Y - UW_BOT) / 2, 1)); } });
    const stemG = new THREE.CylinderGeometry(.008, .012, 2, 4); stemG.translate(0, 1, 0);
    inst(stemG, std({ color: "#6a7a42", roughness: .9 }), stems, g);
    /* kövek, kagylók, elsüllyedt fatörzs */
    const stones = [], shells = [];
    for (let k = 0; k < 80; k++) { const x = rr(-14, 14), z = UW_Z + rr(-12, 12); stones.push(M4(x, UW_BOT + .02, z, rand() * 3, rand(), rand(), rr(.08, .3), rr(.05, .14), rr(.08, .25))); }
    for (let k = 0; k < 60; k++) { const x = rr(-10, 10), z = UW_Z + rr(-9, 9); shells.push(M4(x, UW_BOT + .02, z, rand() * 3, -.2, 0, 1, .5, 1)); }
    inst(new THREE.DodecahedronGeometry(1, 0), std({ color: "#6e6a5e", roughness: .95, flatShading: true }), stones, g);
    inst(new THREE.SphereGeometry(.05, 8, 4, 0, Math.PI), std({ color: "#5a5040", roughness: .5, metalness: .2 }), shells, g);
    const log = mesh(new THREE.CylinderGeometry(.22, .3, 5, 10), std({ color: "#3a2e20", roughness: 1 }), g); log.rotation.set(0, .6, Math.PI / 2 - .08); log.position.set(3.2, UW_BOT + .25, UW_Z - 4);
    const br = mesh(new THREE.CylinderGeometry(.06, .1, 1.6, 6), std({ color: "#3a2e20", roughness: 1 }), g); br.position.set(3.6, UW_BOT + .8, UW_Z - 4.4); br.rotation.set(.3, 0, -.6);
    /* fénypászmák */
    const rayTex = canvasTex(64, 256, (gg, w, h) => { const gr = gg.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,230,.55)"); gr.addColorStop(1, "rgba(255,255,230,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, w, h);
      const gx = gg.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, "rgba(0,0,0,1)"); gx.addColorStop(.5, "rgba(0,0,0,0)"); gx.addColorStop(1, "rgba(0,0,0,1)"); gg.globalCompositeOperation = "destination-out"; gg.fillStyle = gx; gg.fillRect(0, 0, w, h); });
    UW.rays = [];
    for (let k = 0; k < 14; k++) { const m = mesh(new THREE.PlaneGeometry(rr(.5, 1.4), 5.5), basic({ map: rayTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .35, fog: false, side: THREE.DoubleSide }), g);
      m.geometry.translate(0, -2.75, 0); m.position.set(rr(-6, 6), WATER_Y - .05, UW_Z + rr(-6, 6)); m.rotation.set(rr(-.25, .25), rr(0, TAU), rr(-.25, .25)); m.renderOrder = 7; UW.rays.push({ m, ph: rand() * 9, o: m.material.opacity }); }
    /* halak */
    UW.fish = [];
    const mk = (key, n, swim) => {
      const F = FISH[key], geo = fishGeom(F);
      const mat = swimify(std({ vertexColors: true, roughness: .35, metalness: F.metal, side: THREE.DoubleSide }), swim[0] * F.len, swim[1], F.len, key);
      const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; g.add(im); W.disposables.push(geo);
      const list = []; for (let i = 0; i < n; i++) list.push({ p: new THREE.Vector3(rr(-8, 8), UW_BOT + rr(.3, 2.6), UW_Z + rr(-8, 8)), v: new THREE.Vector3(rr(-1, 1), 0, rr(-1, 1)).normalize().multiplyScalar(.2), ph: rand() * 9, tgt: null, t: 0 });
      im.userData.xr = { hover: (on, hit) => { if (on) fishTip(F, hit); else showTip(null); } };
      T.xr.extra.add(im); W.objs.push(im);
      const o = { key, F, im, list }; UW.fish.push(o); return o;
    };
    mk("kusz", 220, [.08, 14]); mk("keszeg", 10, [.06, 5]); mk("ponty", 4, [.05, 3.2]); mk("fogas", 3, [.05, 4]); mk("csuka", 1, [.04, 3]); mk("harcsa", 1, [.06, 1.6]); mk("angolna", 2, [.35, 5]);
    /* buborékok és lebegő szemcsék */
    const mkPts = (n, size, col, alpha) => { const ge = new THREE.BufferGeometry(), a = new Float32Array(n * 3), ph = new Float32Array(n); for (let i = 0; i < n; i++) { a[i * 3] = rr(-8, 8); a[i * 3 + 1] = UW_BOT + rand() * 3.2; a[i * 3 + 2] = UW_Z + rr(-8, 8); ph[i] = rand() * 100; }
      ge.setAttribute("position", new THREE.BufferAttribute(a, 3)); ge.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uS: { value: size }, uC: { value: new THREE.Color(col) }, uA: { value: alpha }, uR: { value: col === "#ffffff" ? 1 : 0 }, uB: { value: UW_BOT }, uTop: { value: WATER_Y } },
        vertexShader: `attribute float ph; uniform float uT, uS, uR, uB, uTop; varying float vA; void main(){ vec3 p = position;
          if (uR > .5) { p.y = uB + mod(p.y - uB + uT * (.35 + fract(ph) * .4), uTop - uB); p.x += sin(uT * 3. + ph) * .03; } else { p += vec3(sin(uT * .2 + ph), sin(uT * .13 + ph * 1.7) * .3, cos(uT * .17 + ph)) * .3; }
          vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uS * 300. / -mv.z; vA = 1.; }`,
        fragmentShader: `uniform vec3 uC; uniform float uA, uR; void main(){ float d = length(gl_PointCoord - .5) * 2.; float a = uR > .5 ? smoothstep(1., .7, d) * (smoothstep(.4, .8, d) + .25) : smoothstep(1., 0., d); gl_FragColor = vec4(uC, a * uA); }` });
      W.disposables.push(ge, m); const P = new THREE.Points(ge, m); P.frustumCulled = false; g.add(P); return m; };
    UW.bub = mkPts(70, .03, "#ffffff", .7); UW.dust = mkPts(400, .012, "#d8efe0", .5);
    return UW;
  }
  function fishTip(F, hit) {
    if (!MAQ.tip) { MAQ.tip = labelSprite(["", ""], { size: .34, fs: 46, w: 900 }); W.root.add(MAQ.tip); }
    MAQ.tip.userData.set(["🐟 " + F.n, F.d]); MAQ.tip.visible = true;
    const hw = headWorld(new THREE.Vector3()); const p = hit && hit.point ? hit.point.clone() : hw; const d = p.sub(hw); const L = Math.min(d.length(), 1.1); d.normalize();
    MAQ.tip.position.copy(hw).addScaledVector(d, L * .75); MAQ.tip.position.y += .14;
  }
  const _m4 = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _one = new THREE.Vector3(1, 1, 1), _fw = new THREE.Vector3(), _tv = new THREE.Vector3();
  function uwTick(dt, camW) {
    if (!UW.g || !UW.g.visible) return;
    const t = W.t, day = ENV.dayK || 0;
    const camL = ENV.site.worldToLocal(_tv.copy(camW));
    UW.mats.forEach((u) => { u.uT.value = t; u.uDay.value = .25 + .75 * day; if (u.uC) u.uC.value.copy(camW); });
    UW.surf.material.uniforms.uSky.value.copy(ENV.sky.userData.U.uHor.value);
    if (ENV.lights.sunDirW) UW.surf.material.uniforms.uSunW.value.copy(ENV.lights.sunDirW);
    ENV.site.updateMatrixWorld(); UW.surf.material.uniforms.uSiteInv.value.copy(ENV.site.matrixWorld).invert();
    UW.rays.forEach((r) => { r.m.material.opacity = r.o * (.6 + .4 * Math.sin(t * .7 + r.ph)) * day; r.m.rotation.y += dt * .02; });
    UW.bub.uniforms.uT.value = t; UW.dust.uniforms.uT.value = t;
    /* raj: a küszök egy vándorló középpont körül, egymást kerülve; a nagyobb halak lassan cirkálnak; a harcsa a fenéken */
    const cen = UW.cen || (UW.cen = new THREE.Vector3(0, UW_BOT + 1.6, UW_Z));
    cen.set(Math.sin(t * .11) * 5, UW_BOT + 1.4 + Math.sin(t * .23) * .7, UW_Z + Math.cos(t * .09) * 5);
    UW.fish.forEach((o) => {
      const F = o.F, big = F.len > .3, n = o.list.length;
      o.list.forEach((f, i) => {
        if (o.key === "kusz") {
          _fw.copy(cen).add(_tv.set(Math.sin(i * 2.1 + t * .5) * .85, Math.sin(i * 1.3 + t * .7) * .35, Math.cos(i * 1.7 + t * .4) * .85)).sub(f.p);
          /* a kezed / fejed közelében szétrebbennek */
          const dc = f.p.distanceTo(camL); if (dc < 1.0) _fw.addScaledVector(_tv.copy(f.p).sub(camL).normalize(), 6 * (1 - dc));
          f.v.addScaledVector(_fw, dt * 1.6); const sp = f.v.length(), mx = 1.3; if (sp > mx) f.v.multiplyScalar(mx / sp);
        } else {
          f.t -= dt;
          if (!f.tgt || f.t < 0 || f.p.distanceTo(f.tgt) < .5) { f.t = rr(4, 12); f.tgt = new THREE.Vector3(rr(-9, 9), o.key === "harcsa" || o.key === "ponty" ? UW_BOT + rr(.25, .6) : UW_BOT + rr(.5, 2.6), UW_Z + rr(-9, 7)); }
          _fw.copy(f.tgt).sub(f.p); const want = _fw.normalize().multiplyScalar(o.key === "harcsa" ? .28 : o.key === "csuka" ? (f.t < 1 ? 1.6 : .12) : big ? .4 : .5);
          f.v.lerp(want, Math.min(1, dt * .6));
          const dc = f.p.distanceTo(camL); if (dc < 1.4) f.v.addScaledVector(_tv.copy(f.p).sub(camL).normalize(), dt * 1.2);
        }
        f.p.addScaledVector(f.v, dt); f.p.y = clamp(f.p.y, UW_BOT + .15, WATER_Y - .25);
        /* irány: a fej (−z) a sebesség felé */
        if (f.v.lengthSq() > 1e-6) { _fw.copy(f.v).normalize(); _m4.lookAt(_tv.set(0, 0, 0), _fw, _up); _qq.setFromRotationMatrix(_m4); }
        _m4.compose(f.p, _qq, _one); o.im.setMatrixAt(i, _m4);
      });
      o.im.instanceMatrix.needsUpdate = true;
      /* a rámutatáshoz a befoglaló gömb kövesse a halakat (a küsz minden képkockában, a többi ritkábban) */
      if (o.key === "kusz" || ((UW.bsT = (UW.bsT || 0) + 1) % 10 === 0)) o.im.computeBoundingSphere();
    });
    /* időnként buborék-csobbanás hang */
    UW.snd = (UW.snd || 3) - dt; if (UW.snd < 0) { UW.snd = rr(2, 6); try { bubbleSnd(); } catch (e) {} }
  }
  function bubbleSnd() {
    const a = T.ac(); if (!a) return; const t0 = a.currentTime;
    for (let k = 0; k < 4; k++) { const o = a.createOscillator(), g = a.createGain(), t = t0 + k * rr(.05, .12); o.type = "sine"; const f = rr(500, 1100);
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.8, t + .06); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.02, t + .005); g.gain.exponentialRampToValueAtTime(.0005, t + .08); o.connect(g).connect(T.outBus()); o.start(t); o.stop(t + .1); }
  }
  /* be- és kimerülés (áttűnéssel) */
  function goDive() {
    if (MAQ.fading || MAQ.dive) return;
    fadeThen(() => {
      if (MAQ.mode === "life") { MAQ.mode = "table"; MAQ.s = MAQ.sT = 1 / 40; MAQ.roofOn = false; applyPlacement(true); lifeTargets(false); }
      if (!UW.g) buildUnderwater(ENV.site);
      MAQ.dive = true; UW.g.visible = true; setDiveLook(true);
      const site = ENV.site; const fw = new THREE.Vector3(0, 0, -1).transformDirection(site.matrixWorld); faceTo(Math.atan2(-fw.x, -fw.z));
      placeUser(site.localToWorld(new THREE.Vector3(.5, UW_BOT + .05, UW_Z + 2.2)), -1);
      wristRedraw(); W.panelDirty = 1;
    });
  }
  function goSurface() {
    if (MAQ.fading || !MAQ.dive) return;
    fadeThen(() => {
      MAQ.dive = false; UW.g.visible = false; setDiveLook(false); showTip(null);
      const rg = T.rig.object3D; rg.position.copy(MAQ.rig0.p);
      const site = ENV.site; const fw = new THREE.Vector3(0, 0, -1).transformDirection(site.matrixWorld); faceTo(Math.atan2(-fw.x, -fw.z));
      placeUser(site.localToWorld(new THREE.Vector3(0, 0, USER_Z)), -1);
      wristRedraw(); W.panelDirty = 1;
    });
  }
  function setDiveLook(on) {
    const sc = T.sceneEl.object3D;
    /* a köd miatt az anyagokat újra kell fordítani (egyszer, az áttűnés alatt) */
    const recompile = () => W.root && W.root.traverse((o) => { const m = o.material; if (!m) return; (Array.isArray(m) ? m : [m]).forEach((q) => { q.needsUpdate = true; }); });
    if (on) { UW.fogWas = sc.fog || null; sc.fog = new THREE.FogExp2(0x2a7470, .1); recompile(); AU.set("water", .06, .5); AU.set("wind", 0, .5); if (AU.water) AU.water.f.frequency.setTargetAtTime(260, T.ac().currentTime, .3); }
    else { sc.fog = UW.fogWas || null; recompile(); AU.set("water", .03, .5); AU.set("wind", .012, .5); if (AU.water) AU.water.f.frequency.setTargetAtTime(700, T.ac().currentTime, .3); }
    [ENV.sky, ENV.pano, ENV.trees, ENV.water].forEach((m) => { if (m) m.visible = !on; });
    (ENV.lmk || []).forEach(() => {});
  }
  function uwDispose() { const sc = T.sceneEl.object3D; if (MAQ.dive) sc.fog = UW.fogWas || null; MAQ.dive = false; Object.keys(UW).forEach((k) => delete UW[k]); }
