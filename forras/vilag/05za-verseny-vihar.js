  /* =================================================================== 5/ZA. ÉJSZAKAI ÉG ÉS ZIVATAR (2026. nov. 15., a tulajdonos 18:39-es kérésére: „a z éjszakai versenynél is
     el kellene egy komoly fejlesztés a látványban … Szeretnék éjszakai versenyt hátul gomolygó felhőkkel és nagy villámlásokkal a vulkánikus hegyek között
     a horizonton és dörgő eget.” – 18:43: „Legyen valósághű … élethű!”)
     • HOLDFÉNYES FELHŐK minden éjjel: lapos felhőréteg az égbolton (gomolyos szélekkel, a széllel lassan sodródva); a hold felőli peremük ezüstösen
       világít, a vékony részeken át a hold udvara dereng, a sűrűk eltakarják a csillagokat és néha a holdat is; a láthatár felé a parti települések
       meleg fénye festi alulról.
     • ZIVATARCELLÁK a láthatáron (a viharjelzés első- és másodfokán): a tanúhegyek (Badacsony, Gulács, Szent György-hegy, Csobánc) IRÁNYÁBAN, a valódi
       földrajz szerint – 3–4 tornyosuló gomolyfelhő (cumulonimbus) üllő alakú, szétterülő tetővel, sötét, lapos alappal, alatta esőfüggönnyel; a tornyok
       lassan gomolyognak, emelkednek. A hold felőli peremük ezüstös.
     • VILLÁMLÁS (másodfokon): a felhőalapból a hegyek közé csapó, cikázó, elágazó villám – 1–4 visszacsapással (felvillan, elhalványul, újra felvillan),
       a felhő belülről kivilágosodik, az égbolt a villám irányában felragyog, a VÍZEN fényes csík fut a villám felé (tükröződés), a hajók vitorlái
       egy pillanatra kivilágosodnak. A hegyek eltakarják a villám alját. Közben a felhők belsejében gyakran „lepedővillám” villódzik (csak fény, csapás nélkül).
       Elsőfokon csak a távoli felhők villódznak (hőségvillám) – mennydörgés nélkül.
     • MENNYDÖRGÉS: a villám után (a távolsággal arányos, rövidített késéssel) gördülő, mély morajlás több hullámban, közelebbi csapásnál éles reccsenéssel
       kezdve; a hang a villám irányából szól (sztereó). */
  const STORM = { on: false, lvl: 0, bolts: [], next: 3, sheetN: 1.5, cells: [], fl: 0, flDir: new THREE.Vector3(0, .05, -1) }; W._storm = STORM;   /* (tesztekhez) */
  /* ---------------------------------------------------------------- csempézhető zajtextúra (R, G: fbm; B: gomolyos „billow”; A: finom) */
  function stNoiseTex() {
    if (STORM.nt) return STORM.nt; const N = 256, data = new Uint8Array(N * N * 4);
    const lat = (P, seed) => { const v = new Float32Array(P * P); let s = seed; for (let i = 0; i < P * P; i++) { s = (s * 16807) % 2147483647; v[i] = s / 2147483647; } return v; };
    const vn = (L, P, x, y) => { const fx = x * P, fy = y * P, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = L[(iy % P) * P + (ix % P)], b = L[(iy % P) * P + ((ix + 1) % P)], c = L[((iy + 1) % P) * P + (ix % P)], d = L[((iy + 1) % P) * P + ((ix + 1) % P)]; return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy; };
    const oct = (seed, P0, n) => { const Ls = []; for (let o = 0; o < n; o++) Ls.push([lat(P0 << o, seed + o * 977), P0 << o]); return Ls; };
    const A = oct(11, 4, 5), B = oct(4242, 4, 5), C = oct(777, 4, 5), D = oct(31337, 16, 3);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const u = x / N, v = y / N; let r = 0, g = 0, b = 0, a = 0, w = .5, ws = 0;
      for (let o = 0; o < 5; o++) { r += vn(A[o][0], A[o][1], u, v) * w; g += vn(B[o][0], B[o][1], u, v) * w; const q = vn(C[o][0], C[o][1], u, v); b += (1 - Math.abs(q * 2 - 1)) * w; ws += w; w *= .5; }
      w = .5; let wa = 0; for (let o = 0; o < 3; o++) { a += vn(D[o][0], D[o][1], u, v) * w; wa += w; w *= .5; }
      const i = (y * N + x) * 4; data[i] = r / ws * 255; data[i + 1] = g / ws * 255; data[i + 2] = Math.min(255, b / ws * 255); data[i + 3] = a / wa * 255; }
    /* kontraszt-nyújtás csatornánként (a sokoktávos zaj közép felé tömörül) */
    for (let ch = 0; ch < 4; ch++) { let lo = 255, hi = 0; for (let i = ch; i < data.length; i += 4) { lo = Math.min(lo, data[i]); hi = Math.max(hi, data[i]); } const k = 255 / Math.max(1, hi - lo); for (let i = ch; i < data.length; i += 4) data[i] = (data[i] - lo) * k; }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    STORM.nt = t; return t;
  }
  const ST_VS = "varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }";
  /* ---------------------------------------------------------------- felépítés (az éjszakai ég mellé, a vrNightBuild végén) */
  function vrStormBuild() {
    const G = NGT.G; if (!G) return; STORM.bolts = []; STORM.cells = []; STORM.on = false; STORM.lvl = 0; STORM.G = G;
    const nt = stNoiseTex();
    /* HOLDFÉNYES FELHŐRÉTEG */
    const cm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false,
      uniforms: { uN: { value: nt }, uMoon: { value: new THREE.Vector3(0, .22, -1).normalize() }, uCov: { value: .56 }, uOff: { value: new THREE.Vector2() }, uAx: { value: 0 }, uFl: { value: 0 }, uFlD: { value: STORM.flDir }, uDk: { value: 1 } },
      vertexShader: ST_VS,
      fragmentShader: `uniform sampler2D uN; uniform vec3 uMoon, uFlD; uniform float uCov, uAx, uFl, uDk; uniform vec2 uOff; varying vec3 vD;
        float cl(vec2 p, vec2 w){ return texture2D(uN, p * .23 + w).b * .62 + texture2D(uN, p * .61 - w * 1.7).r * .38; }
        void main(){ vec3 d = normalize(vD); if (d.y < -.005) discard;
          float h = d.y + .07; vec2 p = d.xz / h * .3 + uOff;
          vec2 w = (texture2D(uN, p * .09 + vec2(.13, .71)).rg - .5) * .42;
          float n = cl(p, w), c = smoothstep(uCov, uCov + .26, n) * smoothstep(-.005, .07, d.y);
          if (c < .008) discard;
          vec2 mo = normalize(uMoon.xz + 1e-4) * .05; float n2 = cl(p + mo, w);
          float lit = clamp((n - n2) * 7. + .3, 0., 1.), thin = 1. - c, md = max(dot(d, uMoon), 0.);
          vec3 col = vec3(.018, .023, .038) * uDk + vec3(.24, .27, .34) * lit * .5 * uDk + vec3(.5, .56, .68) * pow(md, 10.) * (.25 + thin * 1.3);
          float az = atan(d.x, -d.z); col += vec3(.09, .055, .022) * exp(-d.y * 10.) * (.35 + .65 * (.5 + .5 * cos(az - uAx)));
          float fd = max(dot(d, uFlD), 0.); col += vec3(.72, .78, 1.) * uFl * (pow(fd, 14.) * 1.5 + .1) * (.35 + .65 * c);
          gl_FragColor = vec4(col, c * .95);
          #include <colorspace_fragment>
        }` });
    W.disposables.push(cm); const cg = new THREE.SphereGeometry(3000, 48, 16, 0, TAU, 0, Math.PI * .52); STORM.clouds = mesh(cg, cm, G); STORM.clouds.renderOrder = -16.5; STORM.clouds.frustumCulled = false; STORM.cm = cm;
    /* ZIVATARCELLÁK: gömbi sáv a láthatár fölött a tanúhegyek irányában (azimut ± 0,75 rad, magasság −2°…44°) */
    { const NA = 72, NE = 22, A0 = -.75, A1 = .75, E0 = -2 * D2R, E1 = 44 * D2R, R = 2950, pos = [], ae = [], idx = [];
      for (let j = 0; j <= NE; j++) for (let i = 0; i <= NA; i++) { const a = A0 + (A1 - A0) * i / NA, e = E0 + (E1 - E0) * Math.pow(j / NE, 1.35); pos.push(Math.sin(a) * Math.cos(e) * R, Math.sin(e) * R, -Math.cos(a) * Math.cos(e) * R); ae.push(a, e); }
      for (let j = 0; j < NE; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("ae", new THREE.Float32BufferAttribute(ae, 2)); g.setIndex(idx); W.disposables.push(g);
      const sm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
        uniforms: { uN: { value: nt }, uSt: { value: null }, uT: { value: 0 }, uFP: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(9, 0, .1, 0)) }, uSheet: { value: 0 }, uMk: { value: 1 }, uRain: { value: 1 } },
        vertexShader: "attribute vec2 ae; varying vec2 vAE; void main(){ vAE = ae; vec4 p = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }",
        /* a festett felhőpanoráma (R: holdfényes világosság, G: vastagság – a belső villámfényhez, B: eső, A: fedés); lassú, felfelé kúszó torzítás = gomolygás */
        fragmentShader: `uniform sampler2D uN, uSt; uniform float uT, uSheet, uMk, uRain; uniform vec4 uFP[4]; varying vec2 vAE;
          void main(){ float a = vAE.x, e = vAE.y; vec2 uv = vec2((a + .75) / 1.5, (e + .034907) / .802851);
            vec2 wq = (texture2D(uN, vec2(a * 2.2, e * 2.2 - uT * .0045)).rg - .5) * vec2(.006, .012) + (texture2D(uN, vec2(a * 7.5 + uT * .0011, e * 7.5 - uT * .011)).ba - .5) * vec2(.0022, .0045);
            vec4 c = texture2D(uSt, uv + wq); float rn = texture2D(uSt, uv + vec2(wq.x * .3, -uT * .004)).b * uRain;
            float al = max(c.a, rn * .5); if (al < .01) discard;
            /* villámfény a felhő belsejében: legfeljebb négy fénypont (a csapás helye és a lepedővillámok), a vastagabb részeken erősebb */
            float glow = 0.; for (int i = 0; i < 4; i++) { vec4 F = uFP[i]; vec2 dv = vec2(a - F.x, (e - F.y) * 1.25) / F.z; glow += F.w * exp(-dot(dv, dv)); }
            vec3 col = vec3(.005, .0065, .011) + vec3(.2, .22, .29) * c.r * c.r * uMk;
            col = mix(col, vec3(.016, .019, .028), rn * .5 * (1. - c.a));
            col += vec3(.74, .79, 1.) * (glow * (.2 + 1.1 * c.g) * (.6 + .8 * c.r) + uSheet * (.04 + .25 * c.g) * c.a + glow * rn * .3);
            gl_FragColor = vec4(col, al);
            #include <colorspace_fragment>
          }` });
      W.disposables.push(sm); STORM.band = new THREE.Mesh(g, sm); STORM.band.renderOrder = -16.2; STORM.band.frustumCulled = false; STORM.band.visible = false; G.add(STORM.band); STORM.sm = sm; }
    /* VILLÁMOK: két, csapásonként újraépülő szalag (fő csatorna + ágak) */
    const bm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide, uniforms: { uI: { value: 0 } },
      vertexShader: "attribute vec2 bu; varying vec2 vU; void main(){ vU = bu; vec4 p = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }",
      fragmentShader: "uniform float uI; varying vec2 vU; void main(){ float x = abs(vU.x), w = vU.y; float core = exp(-x * x * 26. / (w * w)), halo = exp(-x * x * 3.5) * .5 * w; gl_FragColor = vec4(vec3(.84, .89, 1.) * (core * 2.6 + halo) * uI * (.35 + .65 * w), 1.); }" });
    W.disposables.push(bm);
    for (let k = 0; k < 2; k++) { const g = new THREE.BufferGeometry(); const MAXV = 2400; g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAXV * 3), 3)); g.setAttribute("bu", new THREE.BufferAttribute(new Float32Array(MAXV * 2), 2)); g.setIndex(new THREE.BufferAttribute(new Uint16Array(MAXV * 3), 1)); g.setDrawRange(0, 0); W.disposables.push(g);
      const m = new THREE.Mesh(g, bm.clone()); W.disposables.push(m.material); m.renderOrder = -16; m.frustumCulled = false; m.visible = false; G.add(m); STORM.bolts.push({ m, g, t: 9, life: 0, strokes: [], a: 0, e: 0, cell: 0 }); }
  }
  /* ---------------------------------------------------------------- egy villám alakja: középpont-eltolásos cikázás + ágak, a (azimut, magasság) síkban */
  function stBoltShape(B, a0, eTop, eBot, wk) { wk = wk || 1;
    const R = 2900, lines = [];
    const zig = (a, e, a2, e2, depth, dis) => { let P = [[a, e], [a2, e2]]; for (let d = 0; d < depth; d++) { const Q = []; for (let i = 0; i < P.length - 1; i++) { const p = P[i], q = P[i + 1], L = Math.hypot(q[0] - p[0], q[1] - p[1]); Q.push(p, [(p[0] + q[0]) / 2 + (Math.random() - .5) * L * dis, (p[1] + q[1]) / 2 + (Math.random() - .5) * L * dis * .25]); } Q.push(P[P.length - 1]); P = Q; } return P; };
    const main = zig(a0, eTop, a0 + (Math.random() - .5) * .05, eBot, 7, .62); lines.push([main, 1]);
    const nb = 2 + (Math.random() * 4 | 0);
    for (let k = 0; k < nb; k++) { const i = 8 + (Math.random() * (main.length * .55) | 0), p = main[Math.min(i, main.length - 2)], len = (p[1] - eBot) * (.25 + Math.random() * .4), dir = Math.random() < .5 ? -1 : 1;
      const br = zig(p[0], p[1], p[0] + dir * len * (.5 + Math.random() * .9), p[1] - len, 5, .7); lines.push([br, .42 + Math.random() * .2]);
      if (Math.random() < .5) { const j = 3 + (Math.random() * (br.length * .5) | 0), q = br[Math.min(j, br.length - 2)], l2 = len * .45; lines.push([zig(q[0], q[1], q[0] + dir * l2 * .8, q[1] - l2, 4, .7), .25]); } }
    const P = B.g.attributes.position.array, U = B.g.attributes.bu.array, I = B.g.index.array; let v = 0, ii = 0; const dir3 = (a, e, o) => { o[0] = Math.sin(a) * Math.cos(e) * R; o[1] = Math.sin(e) * R; o[2] = -Math.cos(a) * Math.cos(e) * R; return o; }, o3 = [0, 0, 0];
    for (const [pts, w] of lines) { const W0 = .011 * wk * (.45 + .55 * w); if (v + pts.length * 2 > 2400) break; const v0 = v;
      for (let i = 0; i < pts.length; i++) { const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)], ta = q[0] - p[0], te = q[1] - p[1], L = Math.hypot(ta, te) || 1, na = -te / L, ne = ta / L, taper = 1 - .55 * i / pts.length;
        const ww = W0 * taper * (pts === lines[0][0] ? 1 : 1); dir3(pts[i][0] + na * ww, pts[i][1] + ne * ww, o3); P.set(o3, v * 3); U[v * 2] = 1; U[v * 2 + 1] = w; v++; dir3(pts[i][0] - na * ww, pts[i][1] - ne * ww, o3); P.set(o3, v * 3); U[v * 2] = -1; U[v * 2 + 1] = w; v++; }
      for (let i = 0; i < pts.length - 1; i++) { const a = v0 + i * 2; I[ii++] = a; I[ii++] = a + 1; I[ii++] = a + 2; I[ii++] = a + 1; I[ii++] = a + 3; I[ii++] = a + 2; } }
    B.g.attributes.position.needsUpdate = true; B.g.attributes.bu.needsUpdate = true; B.g.index.needsUpdate = true; B.g.setDrawRange(0, ii); B.g.computeBoundingSphere();
  }
  /* ---------------------------------------------------------------- be- és kikapcsolás a futam elején (vrNightSet hívja) */
  function vrStormSet(on, C) {
    const S = VRR; if (!STORM.clouds) return; const lvl = on ? (NGT.storm || 0) : 0; STORM.on = on; STORM.lvl = lvl;
    STORM.clouds.visible = on; STORM.cm.uniforms.uCov.value = lvl === 2 ? .47 : lvl === 1 ? .52 : .58; STORM.cm.uniforms.uMoon.value.copy(NGT.moonDir || STORM.cm.uniforms.uMoon.value);
    STORM.cm.uniforms.uAx.value = Math.atan2(C.u[0], -C.u[1]); STORM.cm.uniforms.uDk.value = lvl === 2 ? .8 : 1;
    STORM.band.visible = on && lvl > 0; STORM.bolts.forEach((b) => { b.m.visible = false; b.life = 0; }); STORM.fl = 0; STORM.next = 2.5 + Math.random() * 3; STORM.sheetN = 1 + Math.random() * 2;
    if (!STORM.band.visible) return;
    /* a cellák a tanúhegyek irányában (a valódi földrajz szerint, a helyszínről nézve) */
    let az = Math.atan2(-C.u[0], C.u[1]);
    try { const B0 = S.balC || [0, 0], pk = balPeaks().filter((p) => /Badacsony|Gulács|György|Csobánc|Tóti/.test(p.n || p.name || "")), ps = pk.length ? pk : balPeaks(); let sx = 0, sz = 0; ps.forEach((p) => { sx += p.x; sz += p.z; }); sx /= ps.length; sz /= ps.length; if (Math.hypot(sx - B0[0], sz - B0[1]) > 3000) az = Math.atan2(sx - B0[0], -(sz - B0[1])); } catch (e) {}
    STORM.az = az; STORM.band.rotation.y = -az;   /* a sáv helyi −z tengelye az azimut felé (+y körüli forgás: a = −forgás) */
    const n = lvl === 2 ? 4 : 3; STORM.cells = [];
    for (let i = 0; i < 4; i++) { const on2 = i < n, a = (i - (n - 1) / 2) * (lvl === 2 ? .28 : .3) + (Math.random() - .5) * .08, w = .11 + Math.random() * .07, top = (lvl === 2 ? .28 : .19) + Math.random() * (lvl === 2 ? .14 : .08);
      STORM.cells.push({ a, w, top, on: on2, f: 0, fT: 0 }); }
    STORM.sm.uniforms.uRain.value = lvl === 2 ? 1 : .55;
    /* a hold a vihartól balra vagy jobbra áll? – onnan kapják a tornyok a fényt */
    let lx = 0; try { const md = NGT.moonDir, maz = Math.atan2(md.x, -md.z); lx = clamp(wrapA(maz - az) * 1.5, -1, 1); STORM.sm.uniforms.uMk.value = .55 + .45 * clamp(1 - Math.abs(wrapA(maz - az)) / 2.5, 0, 1); } catch (e) {}
    try { if (STORM.sm.uniforms.uSt.value) STORM.sm.uniforms.uSt.value.dispose(); STORM.sm.uniforms.uSt.value = stStormTex(STORM.cells.filter((q) => q.on), lx, lvl); } catch (e) { console.warn("viharfelhő", e); STORM.band.visible = false; }
  }
  /* ---------------------------------------------------------------- a zivatarcellák festése (egyszer, a futam elején): több száz árnyalt gomoly-„karfiol”, lapos alap, üllő, esőfüggöny
     A vászon: x = azimut (−0,75 … +0,75 rad, 2048 px), y = magasság (−2° … 44°, 512 px; a két irány eltérő felbontását az ellipszisek kiegyenlítik). */
  function stStormTex(cells, lx, lvl) {
    const Wd = 2048, Hd = 512, A0 = -.75, E0 = -2 * D2R, E1 = 44 * D2R, kx = Wd / 1.5, ky = Hd / (E1 - E0), X = (a) => (a - A0) * kx, Y = (e) => Hd - (e - E0) * ky;
    const mk = () => { const c = document.createElement("canvas"); c.width = Wd; c.height = Hd; return c; }, cL = mk(), cT = mk(), cR = mk(), gL = cL.getContext("2d"), gT = cT.getContext("2d"), gR = cR.getContext("2d");
    let sd = 1234 + (Math.random() * 1e6 | 0); const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    /* egy gomoly: lágy szélű ellipszis (szögben kerek, kissé lapos), a fény felől világosabb közepű – sötét perem NINCS, így a gomolyok összeolvadnak;
       a vastagság-vásznon halvány, összeadódó folt (a belső villámfényhez) */
    let tk = 0;
    const puff = (a, e, r, lit, sq) => { const x = X(a), y = Y(e), rx = r * kx, ry = r * ky * (sq || .86); if (rx < .8 || y < -ry || y > Hd + ry) return;
      const L1 = clamp(lit, 0, 1), c = (k) => Math.round(255 * clamp(L1 * k, 0, 1)), ox = x + lx * rx * .3, oy = y - ry * .35, gr = gL.createRadialGradient(ox, oy, rx * .04, x, y, rx);
      gr.addColorStop(0, `rgba(${c(1.18)},${c(1.18)},${c(1.18)},1)`); gr.addColorStop(.62, `rgba(${c(.9)},${c(.9)},${c(.9)},.96)`); gr.addColorStop(.84, `rgba(${c(.78)},${c(.78)},${c(.78)},.6)`); gr.addColorStop(1, `rgba(${c(.72)},${c(.72)},${c(.72)},0)`);
      gL.save(); gL.translate(x, y); gL.scale(1, ry / rx); gL.translate(-x, -y); gL.fillStyle = gr; gL.beginPath(); gL.arc(x, y, rx, 0, TAU); gL.fill(); gL.restore();
      if ((tk++ & 1) === 0) { const gt = gT.createRadialGradient(x, y, 0, x, y, rx * 1.4); gt.addColorStop(0, "rgba(255,255,255,.2)"); gt.addColorStop(1, "rgba(255,255,255,0)"); gT.save(); gT.translate(x, y); gT.scale(1, ry / rx); gT.translate(-x, -y); gT.fillStyle = gt; gT.beginPath(); gT.arc(x, y, rx * 1.4, 0, TAU); gT.fill(); gT.restore(); } };
    gT.globalCompositeOperation = "lighter";
    const eb = 5.6 * D2R;   /* a felhőalap ~5,6° magasan (kb. 1,5 km 15 km-ről) – alatta az esőfüggöny és a villámok */
    /* közös, lapos, sötét alap-sáv (polcfelhő) a cellák alatt */
    const aMin = Math.min(...cells.map((q) => q.a - q.w * 1.5)), aMax = Math.max(...cells.map((q) => q.a + q.w * 1.5));
    for (let k = 0; k < 560; k++) { const a = aMin + rnd() * (aMax - aMin), e = eb - .3 * D2R + Math.pow(rnd(), 1.6) * 3.6 * D2R, r = .009 + rnd() * .017; puff(a, e, r, .045 + rnd() * .05, .5); }
    /* a cellák hátulról előre: a hátsók (magasabbak) előbb, így az elülsők karfiolja rájuk borul */
    cells.slice().sort((p1, p2) => p2.top - p1.top).forEach((q) => { const ci = cells.indexOf(q), T = q.top, W0 = q.w;
      /* a torony teste: alulról felfelé; a szélessége középtájon a legnagyobb, fölfelé szűkül; a teteje kerekded */
      const n = Math.round(1100 * (W0 / .16) * (T / .32));
      for (let k = 0; k < n; k++) { const u = Math.pow(rnd(), .9), e = eb + u * (T * .9 - eb), prof = .7 + .3 * Math.sin(Math.PI * Math.min(1, u * 1.25 + .05)), hw = W0 * prof * (u > .8 ? Math.sqrt(Math.max(0, 1 - (u - .8) / .25)) : 1);
        const a = q.a + (rnd() * 2 - 1) * hw, r = W0 * (.07 + rnd() * .11) * (1.1 - u * .35), edge = Math.abs(a - q.a) / Math.max(hw, 1e-3);
        const lit = .07 + .3 * Math.pow(u, 1.6) + .22 * clamp(lx * (a - q.a) / Math.max(hw, 1e-3), 0, 1) * (.3 + .7 * u) + .08 * edge * u + .05 * rnd(); puff(a, e, r, lit); }
      /* karfiol-korona: kerek dudorok a tetején (a hold felőli oldaluk ezüstös) */
      for (let k = 0; k < 90; k++) { const a = q.a + (rnd() * 2 - 1) * W0 * .55, e = T * (.84 + rnd() * .12), r = W0 * (.08 + rnd() * .12); puff(a, e, r, .38 + .3 * rnd() + .18 * lx * Math.sign(a - q.a), .9); }
      /* üllő: szétterülő, lapos, rostos réteg a tetején (egyik oldalra jobban elnyúlik) */
      if (T > .24) { const dw = (ci % 2 ? -1 : 1) * (.5 + rnd() * .6), span = W0 * (2.3 + rnd() * 1.4);
        for (let k = 0; k < 260; k++) { const t2 = rnd(), a = q.a + (t2 * 2 - 1 + dw * t2 * t2) * span * .55, e = T * (.92 + rnd() * .09) - Math.pow(Math.abs(a - q.a) / span, 2) * T * .05, r = W0 * (.06 + rnd() * .09) * (1 - .35 * t2);
          puff(a, e, r, .32 + .3 * rnd(), .3); } }
      /* esőfüggöny: ferde, rojtos csíkok az alap alatt */
      gR.save(); for (let k = 0; k < 260; k++) { const a = q.a + (rnd() * 2 - 1) * W0 * .75, x = X(a), y0 = Y(eb + .3 * D2R), y1 = Y(-1.6 * D2R), sl = (rnd() - .3) * 26, wv = 2 + rnd() * 9;
        const g2 = gR.createLinearGradient(x, y0, x + sl, y1); g2.addColorStop(0, `rgba(0,0,255,${.12 + rnd() * .3})`); g2.addColorStop(1, "rgba(0,0,255,0)"); gR.strokeStyle = g2; gR.lineWidth = wv; gR.beginPath(); gR.moveTo(x, y0); gR.lineTo(x + sl, y1); gR.stroke(); } gR.restore(); });
    /* egyesítés egy RGBA textúrába */
    const L = gL.getImageData(0, 0, Wd, Hd).data, Tt = gT.getImageData(0, 0, Wd, Hd).data, Rr = gR.getImageData(0, 0, Wd, Hd).data, out = new Uint8Array(Wd * Hd * 4);
    for (let y = 0; y < Hd; y++) { const yo = (Hd - 1 - y) * Wd; for (let x = 0; x < Wd; x++) { const i = (y * Wd + x) * 4, o = (yo + x) * 4, a = L[i + 3] / 255;
      out[o] = a > 0 ? L[i] : 0; void a; out[o + 1] = Math.min(255, Tt[i] * 1.2); out[o + 2] = Rr[i + 3]; out[o + 3] = L[i + 3]; } }
    const t = new THREE.DataTexture(out, Wd, Hd, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; W.disposables.push(t);
    return t;
  }
  /* ---------------------------------------------------------------- mennydörgés: gördülő, mély morajlás (és közeli csapásnál reccsenés) a villám irányából */
  function stThunder(delay, pan, gain, crack) {
    try { const a = T.ac(); if (!a) return; const t0 = a.currentTime + delay, out = T.outBus(), p = a.createStereoPanner ? a.createStereoPanner() : null; if (p) { p.pan.value = clamp(pan, -.9, .9); p.connect(out); }
      const dst = p || out, dur = 5 + Math.random() * 3;
      const src = a.createBufferSource(); src.buffer = T.noiseBuf(dur + .5); const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 150 + Math.random() * 60; lp.Q.value = .7;
      const lp2 = a.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 380; const g = a.createGain(); g.gain.setValueAtTime(.0001, t0);
      let t = t0 + .05; g.gain.linearRampToValueAtTime(gain * .55, t + .25); const peaks = 3 + (Math.random() * 4 | 0);
      for (let k = 0; k < peaks; k++) { t += .25 + Math.random() * .8; g.gain.linearRampToValueAtTime(gain * (.25 + Math.random() * .75) * (1 - k / (peaks + 2)), t); t += .1 + Math.random() * .3; g.gain.linearRampToValueAtTime(gain * (.12 + Math.random() * .2), t); }
      g.gain.exponentialRampToValueAtTime(.0001, Math.max(t + .5, t0 + dur)); src.connect(lp).connect(lp2).connect(g).connect(dst); src.start(t0); src.stop(t0 + dur + .4);
      /* a moraj alja: nagyon mély, lassú hullámzás */
      const sub = a.createBufferSource(); sub.buffer = T.noiseBuf(dur + .5); const sl = a.createBiquadFilter(); sl.type = "lowpass"; sl.frequency.value = 70; const sg = a.createGain(); sg.gain.setValueAtTime(.0001, t0); sg.gain.linearRampToValueAtTime(gain * .9, t0 + .6); sg.gain.exponentialRampToValueAtTime(.0001, t0 + dur * .9); sub.connect(sl).connect(sg).connect(dst); sub.start(t0); sub.stop(t0 + dur);
      if (crack) { const c = a.createBufferSource(); c.buffer = T.noiseBuf(.8); const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900 + Math.random() * 900; bp.Q.value = .6; const cg = a.createGain(); cg.gain.setValueAtTime(.0001, t0); cg.gain.linearRampToValueAtTime(gain * .7, t0 + .02); cg.gain.exponentialRampToValueAtTime(.0001, t0 + .55); c.connect(bp).connect(cg).connect(dst); c.start(t0); c.stop(t0 + .7); }
    } catch (e) {}
  }
  const _stv = new THREE.Vector3(), _stq = new THREE.Quaternion(), _stf = new THREE.Vector3(), _str = new THREE.Vector3();
  /* ---------------------------------------------------------------- képkockánként (vrNightTick hívja) */
  function vrStormTick(dt, U) {
    if (!STORM.on || !STORM.clouds) return; const S = VRR, t = W.t;
    /* a felhők a széllel sodródnak (a felhőréteg sík-vetületében) */
    { const o = STORM.cm.uniforms.uOff.value, wf = S.wf != null ? S.wf : (S.C ? S.C.wf : 0), k = dt * .0035; o.x += -Math.sin(wf) * k; o.y += Math.cos(wf) * k; }
    if (!STORM.band.visible) return;
    STORM.sm.uniforms.uT.value = t;
    /* lepedővillám a felhők belsejében (első- és másodfokon) */
    STORM.sheetN -= dt; if (STORM.sheetN <= 0) { STORM.sheetN = (STORM.lvl === 2 ? 1.2 : 3) + Math.random() * (STORM.lvl === 2 ? 3.5 : 6); const c = STORM.cells.filter((q) => q.on); const q = c[Math.random() * c.length | 0]; if (q) { q.f = Math.max(q.f, .5 + Math.random() * .6); q.fT = .08 + Math.random() * .25; } }
    /* villámcsapás (másodfokon) */
    if (STORM.lvl === 2) { STORM.next -= dt; if (STORM.next <= 0) { STORM.next = 3.5 + Math.random() * 8 + (Math.random() < .2 ? -2.5 : 0);
        const B = STORM.bolts.find((b) => b.life <= 0) || STORM.bolts[0], c = STORM.cells.filter((q) => q.on), q = c[Math.random() * c.length | 0];
        /* minden ötödik csapás közelebbi (de a pályán túli): magasabbról, vastagabban, hamar jön a reccsenő dörgés */
        const near = Math.random() < .2;
        if (B && q) { const a = q.a + (Math.random() - .5) * q.w * 1.2, eTop = (near ? 9.5 + Math.random() * 3.5 : 6.2 + Math.random() * 1.8) * D2R; stBoltShape(B, a, eTop, -.012, near ? 1.7 : 1); B.eTop = eTop;
          B.m.rotation.y = STORM.band.rotation.y; B.a = a; B.cell = STORM.cells.indexOf(q); B.t = 0; B.life = 1; const ns = 1 + (Math.random() * 4 | 0); B.strokes = []; let ts = 0; for (let k = 0; k < ns; k++) { B.strokes.push([ts, k ? .55 + Math.random() * .45 : 1]); ts += .06 + Math.random() * .14; } B.dur = ts + .35;
          /* a villám iránya (tó-irányokban) a víz tükröződéséhez és a felhők, az ég kivilágításához */
          const az = STORM.az + a; STORM.flDir.set(Math.sin(az) * Math.cos(.03), Math.sin(.03), -Math.cos(az) * Math.cos(.03));
          /* mennydörgés: a villám iránya a fejhez képest → sztereó */
          let pan = 0; try { const cam = T.camObj(); cam.getWorldQuaternion(_stq); _stf.set(0, 0, -1).applyQuaternion(_stq); _str.set(1, 0, 0).applyQuaternion(_stq); S.far.getWorldQuaternion(_stq); _stv.copy(STORM.flDir).applyQuaternion(_stq); pan = _stv.dot(_str) / Math.max(.2, Math.hypot(_stv.dot(_str), _stv.dot(_stf))); } catch (e) {}
          const dly = near ? 1.1 + Math.random() * 1.2 : 3 + Math.random() * 5; stThunder(dly, pan, near ? .6 : clamp(.48 - dly * .03, .22, .42), near || dly < 3.6); } } }
    /* a csapások fénygörbéje */
    let fl = 0; STORM.bolts.forEach((B) => { if (B.life <= 0) { B.m.visible = false; return; } B.t += dt; let I = 0; B.strokes.forEach(([t0, k]) => { const u = B.t - t0; if (u >= 0) I += k * (u < .03 ? 1 : Math.exp(-(u - .03) * 18)); }); I *= (.8 + .2 * Math.sin(B.t * 90));
      B.m.visible = I > .03; B.m.material.uniforms.uI.value = Math.min(1.8, I); fl = Math.max(fl, I); if (B.t > B.dur) { B.life = 0; B.m.visible = false; } });
    /* fénypontok a felhőben: a villám csatornájának felső vége (a csapás erejével) + a lepedővillámok helyei */
    const FP = STORM.sm.uniforms.uFP.value; let sheet = 0, k = 0;
    STORM.bolts.forEach((B) => { if (k < 4 && B.life > 0) { const I = B.m.material.uniforms.uI.value; FP[k++].set(B.a, (B.eTop || .08) + .05, .07 + .03 * Math.random(), Math.min(1.4, I * .9 + .25)); } });
    STORM.cells.forEach((q) => { if (q.fT > 0) { q.fT -= dt; q.f = Math.max(q.f, .35 + .35 * Math.sin(t * 70 + q.a * 9)); } else q.f = Math.max(0, q.f - dt * 6); if (q.f > .02 && k < 4) { if (!q.fp || q.fT > 0 && Math.random() < .08) q.fp = [q.a + (Math.random() - .5) * q.w * 1.2, (5.5 + Math.random() * 14) * D2R, .05 + Math.random() * .07]; FP[k++].set(q.fp[0], q.fp[1], q.fp[2], q.f); } sheet = Math.max(sheet, q.f * .3); });
    for (; k < 4; k++) FP[k].w = 0;
    STORM.sm.uniforms.uSheet.value = sheet; STORM.fl = Math.max(fl, sheet * .6);
    /* az égbolt, a felhők, a víz és a hajók kivilágosodása */
    const F = STORM.fl; STORM.cm.uniforms.uFl.value = F; STORM.cm.uniforms.uFlD.value = STORM.flDir;
    if (U) { U.uFlD.value.copy(STORM.flDir); U.uFlC.value.setRGB(.7, .76, 1).multiplyScalar(fl * 1.1 + sheet * .25); U.uLight.value = .2 + F * .55; }
    if (S.lights) { S.lights.hemi.intensity = .09 + F * .5; }
  }
  /* ---------------------------------------------------------------- 2026-11-15: a versenytársak és a horgonyzó hajók fényeinek TÜKÖRCSÍKJA a vízen (színes, remegő, a néző felé
     elnyúló csík a lámpa alatt – mint a valóságban a hullámos víztükrön). Egyetlen rajzolás az összes fényre; a hullámok csúcsai helyenként megtörik. */
  const _nrP = new THREE.Vector3(), _nrC = new THREE.Vector3(), _nrCol = new THREE.Color();
  function vrNavReflTick() {
    const S = VRR; if (!NGT.on || !NGT.nav || !S.env) { if (NGT.nrMesh) NGT.nrMesh.visible = false; return; }
    const MAX = 72;
    const par = NGT.GE || S.env; if (!NGT.nrMesh || NGT.nrMesh.parent !== par) {
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX * 12), 3)); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX * 12), 3)); g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(MAX * 8), 2));
      const I = new Uint16Array(MAX * 6); for (let i = 0; i < MAX; i++) I.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6); g.setIndex(new THREE.BufferAttribute(I, 1)); W.disposables.push(g);
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, uniforms: { uT: { value: 0 } },
        vertexShader: "attribute vec3 color; varying vec3 vC; varying vec2 vU; varying float vX; void main(){ vC = color; vU = uv; vX = position.x * .13 + position.z * .17; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
        fragmentShader: "uniform float uT; varying vec3 vC; varying vec2 vU; varying float vX; void main(){ float y = vU.y, x = abs(vU.x - .5) * 2.; float br = sin(y * 46. - uT * 2.6 + vX) * .5 + .5; br = mix(br, sin(y * 17. + uT * 1.9 + vX * 2.3) * .5 + .5, .45); float a = pow(1. - y, 1.4) * (1. - x * x) * (.25 + .75 * smoothstep(.35, .7, br)); gl_FragColor = vec4(vC * a, 1.); }" });
      W.disposables.push(m); NGT.nrMesh = new THREE.Mesh(g, m); NGT.nrMesh.frustumCulled = false; NGT.nrMesh.renderOrder = 2; NGT.nrMesh.userData.night = 1; NGT.nrMesh.userData.noMerge = 1; par.add(NGT.nrMesh); NGT.nrM = m; }
    const M = NGT.nrMesh, P = M.geometry.attributes.position.array, C = M.geometry.attributes.color.array, U = M.geometry.attributes.uv.array; M.visible = true; NGT.nrM.uniforms.uT.value = W.t;
    T.camObj().getWorldPosition(_nrC); S.env.worldToLocal(_nrC);
    let q = 0;
    for (const n of NGT.nav) { if (n.kind !== "big" && n.kind !== "small" && n.kind !== "anchor") continue; if (n.g.visible === false) continue;
      for (const l of n.L) { if (q >= MAX) break; if (!l.s.visible || !l.col) continue;
        l.s.getWorldPosition(_nrP); S.env.worldToLocal(_nrP); const dx = _nrC.x - _nrP.x, dz = _nrC.z - _nrP.z, d = Math.hypot(dx, dz); if (d < 4 || d > 1800) continue;
        const ux = dx / d, uz = dz / d, px = -uz, pz = ux, L = clamp(d * .22 + 3, 4, 70), w = clamp(.16 + d * .003, .18, 3.6), y = Math.max(rwHeight(_nrP.x, _nrP.z), rwHeight(_nrP.x + ux * L * .5, _nrP.z + uz * L * .5)) + .3, k = clamp(1.2 - d / 1600, .4, 1.1);
        P.set([_nrP.x + px * w, y, _nrP.z + pz * w, _nrP.x - px * w, y, _nrP.z - pz * w, _nrP.x - px * w * 1.8 + ux * L, y, _nrP.z - pz * w * 1.8 + uz * L, _nrP.x + px * w * 1.8 + ux * L, y, _nrP.z + pz * w * 1.8 + uz * L], q * 12);
        _nrCol.set(l.col); const a = .8 * k; for (let v = 0; v < 4; v++) C.set([_nrCol.r * a, _nrCol.g * a, _nrCol.b * a], q * 12 + v * 3);
        U.set([0, 0, 1, 0, 1, 1, 0, 1], q * 8); q++; } }
    M.geometry.setDrawRange(0, q * 6); M.geometry.attributes.position.needsUpdate = true; M.geometry.attributes.color.needsUpdate = true; M.geometry.attributes.uv.needsUpdate = true;
  }
  /* ---------------------------------------------------------------- 2026-11-15: az A-Frame alapfényei (szórt 1,0 + irányított 0,6) éjjel is égtek – a vitorlák, a legénység, a zászlók
     ezért éjjel is nappali fényben, telített színekkel látszottak. Éjjel visszavesszük őket; a fényt a HOLD adja (irányított, ezüstös, a hold felől),
     így a vitorla holdfelőli oldala világos, a másik sötét – mint a valóságban. Nappal minden marad a régiben. */
  function vrNightDefLights(on) {
    try { document.querySelectorAll("[data-aframe-default-light]").forEach((el) => { const L = el.getObject3D("light"); if (!L) return; if (L.userData.dayI == null) L.userData.dayI = L.intensity;
        L.intensity = on ? L.userData.dayI * (L.isAmbientLight ? .2 : .08) : L.userData.dayI; }); } catch (e) {}
    const Ls = VRR.lights; if (on && Ls) { Ls.sun.intensity = .55; Ls.hemi.intensity = .09; }
  }
