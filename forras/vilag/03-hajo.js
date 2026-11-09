
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
        + chord * (.02 * bub * Math.exp(-u * 3.5) * Math.sin(om * 1.6 * S.t - u * 14 + v * 5) + amp * fl * flogW(u, v, om));
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
      mainG.attributes.position.needsUpdate = true; mainG.computeVertexNormals();
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
      jibG.attributes.position.needsUpdate = true; jibG.computeVertexNormals();
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
      spinG.attributes.position.needsUpdate = true; spinG.computeVertexNormals();
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
