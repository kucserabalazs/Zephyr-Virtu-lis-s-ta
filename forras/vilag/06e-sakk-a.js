  /* =====================================================================================================
     VITORLÁS SAKK – VR (2026. nov. 9.)
     A sakktábla maga a Balaton: 9 × 9 méteres vízmezők (világos: türkiz sekély víz, sötét: mélykék), a mezőket
     úszó kötélsorok választják el, körben mahagóni–sárgaréz úszóstég. A bábuk életnagyságú hajók:
       gyalog = evezős csónak evezőssel · huszár = lófejes viking hajó · futó = versenyjacht
       bástya = világítótorony sziklaszigeten · vezér = kétárbócos fregatt · király = háromárbócos sorhajó
     Naplemente (a tulajdonos ChatGPT-képe: „Luxus tengerészeti sakk naplementében”).
     Nézőpontok: parancsnoki híd (saját oldal), stég (életnagyság), két oldaltorony, az ellenfél hídja,
     hőlégballon (madártávlat) és körrepülés a ballonnal; a stégre csippentve oda lépsz.
     Kezelés: VR-ben a kéz sugara + csippentés (kontrollerrel ravasz), 2D-ben egér / ujj.
     A szabályok és a gép a stégjáték (gameChess) motorja – a mentés is közös („zephyr-sakk”), így a 2D-ben
     elkezdett játszma itt folytatható, és fordítva.
     ===================================================================================================== */
  const SQ = 9, BH = SQ * 4, GAP = 1.6, BI = BH + GAP, RS = BI / 8, PONT = 2.8, PONT_Y = .55, TOWER_Y = 12, TOWER_D = BI + PONT + 11, PSC = .86;
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
