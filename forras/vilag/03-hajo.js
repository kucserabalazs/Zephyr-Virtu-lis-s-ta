
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
    const key = "s" + o.num + o.main + (o.win ? "w" : "") + (o.sailName || "");
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
      if (o.sailName) { const nm = String(o.sailName).toUpperCase().slice(0, 16); let fs = 130; g.font = `900 ${fs}px system-ui, sans-serif`; while (g.measureText(nm).width > w * .62 && fs > 40) { fs -= 5; g.font = `900 ${fs}px system-ui, sans-serif`; } g.lineWidth = 12; g.strokeStyle = "rgba(0,0,0,.35)"; g.strokeText(nm, w * .5, h * .74); g.fillStyle = "#ffffff"; g.fillText(nm, w * .5, h * .74); }   /* 2026-11-14: a játékos neve a grószon */
      if (o.win) sailDetail(g, w, h, true);   /* 2026-11-12 09:37 (tulajdonos): a grósz elég magasan van, oda nem kell ablak */
    }));
  }
  /* 2026-11-12 08:52 (tulajdonos, hangban: „a versenyvitorlák alsó részébe átlátszó ablakot varrnak, hogy a kormányos kilásson a hajó elé; túl nagy nem lehet, mert gyengíti
     a vitorlát; két részletben legyen bevarrva, élethűen – a grószba és a fockba is”). A valódi vitorlákon az ablak az alsó panelekben, a varratok KÖZÖTT ül, több
     szegmensben, átlátszó fóliából, körben rávarrt szegőszalaggal (kb. 45 cm magas, 1,2 m hosszú). Itt: két egymás melletti fóliamező az alsó panelben, köztük
     függőleges varratszalag; a fólia majdnem teljesen átlátszó, halvány kékes csillogással; körben fehér szegőszalag cikkcakk-öltéssel. */
  /* 2026-11-12 09:13 (tulajdonos: „a grósz és a fock legyen legalább annyira kidolgozott, mint a spinakker – makettszerű, részletes”): vitorlakészítői részletek a vásznon –
     sugaras sarokerősítések (fej, nyak, szkótasarok), élszalagok, lécsebek végsapkával, reffsorok kauszokkal, trimmcsíkok, jelzőszál-ablakok. */
  function sailDetail(g, w, h, main) {
    const k = w / 1024, fan = (x, y, a0, a1, R, n) => { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; g.strokeStyle = "rgba(0,0,0,.13)"; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); g.stroke(); }
      g.fillStyle = "rgba(255,255,255,.10)"; g.beginPath(); g.moveTo(x, y); g.arc(x, y, R, Math.min(a0, a1), Math.max(a0, a1)); g.closePath(); g.fill(); g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 3 * k; g.beginPath(); g.arc(x, y, R, Math.min(a0, a1), Math.max(a0, a1)); g.stroke();
      g.fillStyle = "#c9ced4"; g.beginPath(); g.arc(x + Math.cos((a0 + a1) / 2) * 34 * k, y + Math.sin((a0 + a1) / 2) * 34 * k, 13 * k, 0, TAU); g.fill(); g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.arc(x + Math.cos((a0 + a1) / 2) * 34 * k, y + Math.sin((a0 + a1) / 2) * 34 * k, 6 * k, 0, TAU); g.fill(); };
    /* sarokerősítések: nyak (bal alsó), szkótasarok (jobb alsó), fej (fent) */
    fan(0, h, -Math.PI / 2, 0, 190 * k, 9); fan(w, h, -Math.PI, -Math.PI / 2, 210 * k, 9); fan(main ? w * .06 : 0, 0, 0, Math.PI / 2, 170 * k, 8);
    /* élszalagok: belépő él (árbocsín / előstag), hátsó él, alsó él */
    g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(0, 0, 13 * k, h); g.fillStyle = "rgba(0,0,0,.16)"; g.fillRect(13 * k, 0, 2 * k, h);
    g.fillStyle = "rgba(0,0,0,.14)"; g.fillRect(w - 12 * k, 0, 12 * k, h); g.fillRect(0, h - 10 * k, w, 10 * k);
    for (let y = 30 * k; y < h; y += 46 * k) { g.fillStyle = "rgba(40,44,52,.5)"; g.fillRect(3 * k, y, 7 * k, 14 * k); }   /* csúszkák / lovasok az élen */
    /* trimmcsíkok (draft stripes) */
    [.3, .52, .74].forEach((v) => { g.strokeStyle = "rgba(15,20,30,.55)"; g.lineWidth = 7 * k; g.beginPath(); g.moveTo(w * .06, h * (1 - v)); g.quadraticCurveTo(w * .4, h * (1 - v) - 10 * k, w * (main ? .86 : .9), h * (1 - v) + 4 * k); g.stroke(); });
    if (main) {
      /* lécsebek: teljes hosszú felső lécek, végükön feszítősapka */
      [.24, .46, .66, .84].forEach((v, i) => { const y = h * (1 - v), x0 = w * (i > 1 ? .04 : .5); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(x0, y - 9 * k, w - x0, 18 * k); g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = 2 * k; g.strokeRect(x0, y - 9 * k, w - x0, 18 * k);
        g.fillStyle = "#20242b"; g.fillRect(w - 30 * k, y - 13 * k, 30 * k, 26 * k); if (i > 1) g.fillRect(x0 - 4 * k, y - 12 * k, 22 * k, 24 * k); });
      /* két reffsor: erősítősáv, kauszok, reffkötélkék */
      [.2, .34].forEach((v) => { const y = h * (1 - v); g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(0, y - 12 * k, w, 24 * k); g.strokeStyle = "rgba(0,0,0,.16)"; g.lineWidth = 2 * k; g.strokeRect(0, y - 12 * k, w, 24 * k);
        for (let x = w * .1; x < w * .95; x += w * .105) { g.fillStyle = "#c9ced4"; g.beginPath(); g.arc(x, y, 7 * k, 0, TAU); g.fill(); g.fillStyle = "rgba(0,0,0,.6)"; g.beginPath(); g.arc(x, y, 3.2 * k, 0, TAU); g.fill(); g.strokeStyle = "rgba(245,245,240,.85)"; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(x, y + 6 * k); g.lineTo(x - 3 * k, y + 40 * k); g.stroke(); }
        [[20 * k, y], [w - 26 * k, y]].forEach(([x, yy]) => { g.fillStyle = "#c9ced4"; g.beginPath(); g.arc(x, yy, 13 * k, 0, TAU); g.fill(); g.fillStyle = "rgba(0,0,0,.6)"; g.beginPath(); g.arc(x, yy, 6 * k, 0, TAU); g.fill(); }); });
      /* vitorlakészítő-címke a nyaknál */
      g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(w * .05, h * .905, 120 * k, 40 * k); g.fillStyle = "#16306b"; g.font = `800 ${22 * k}px system-ui`; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("ZEPHYR", w * .05 + 10 * k, h * .905 + 21 * k);
    } else {
      /* jelzőszál-ablakok a belépő él mögött (itt látszanak a szél alatti szálak) */
      [.3, .5, .7].forEach((v) => { const x = w * .1, y = h * (1 - v); g.save(); g.beginPath(); g.ellipse(x, y, 34 * k, 16 * k, 0, 0, TAU); g.clip(); g.clearRect(x - 36 * k, y - 18 * k, 72 * k, 36 * k); g.fillStyle = "rgba(210,235,250,.12)"; g.fillRect(x - 36 * k, y - 18 * k, 72 * k, 36 * k); g.restore();
        g.strokeStyle = "rgba(250,250,246,.95)"; g.lineWidth = 5 * k; g.beginPath(); g.ellipse(x, y, 34 * k, 16 * k, 0, 0, TAU); g.stroke(); });
    }
  }
  function sailWindow(g, w, h, cols, v0, v1, tape) {
    const y1 = h * (1 - v0), y0 = h * (1 - v1), sk = h * .006;
    cols.forEach(([u0, u1], k) => { const x0 = w * u0, x1 = w * u1, r = tape * 1.6;
      const path = () => { g.beginPath(); g.moveTo(x0 + r, y0 + sk * k); g.lineTo(x1 - r, y0 + sk * (k + 1)); g.quadraticCurveTo(x1, y0 + sk * (k + 1), x1, y0 + sk * (k + 1) + r); g.lineTo(x1, y1 + sk * (k + 1) - r); g.quadraticCurveTo(x1, y1 + sk * (k + 1), x1 - r, y1 + sk * (k + 1)); g.lineTo(x0 + r, y1 + sk * k); g.quadraticCurveTo(x0, y1 + sk * k, x0, y1 + sk * k - r); g.lineTo(x0, y0 + sk * k + r); g.quadraticCurveTo(x0, y0 + sk * k, x0 + r, y0 + sk * k); g.closePath(); };
      g.save(); path(); g.clip(); g.clearRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + sk * 3 + 4);
      g.fillStyle = "rgba(205,232,248,.10)"; g.fillRect(x0, y0, x1 - x0, y1 - y0 + sk * 3);
      const gl = g.createLinearGradient(x0, y0, x1, y1); gl.addColorStop(0, "rgba(255,255,255,0)"); gl.addColorStop(.42, "rgba(255,255,255,.16)"); gl.addColorStop(.5, "rgba(255,255,255,0)"); gl.addColorStop(.78, "rgba(255,255,255,.09)"); gl.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gl; g.fillRect(x0, y0, x1 - x0, y1 - y0 + sk * 3); g.restore();
      path(); g.strokeStyle = "rgba(250,250,246,.97)"; g.lineWidth = tape; g.stroke();
      path(); g.strokeStyle = "rgba(60,66,78,.75)"; g.lineWidth = Math.max(1.5, tape * .16); g.setLineDash([tape * .5, tape * .45]); g.stroke(); g.setLineDash([]); });
  }
  function jibTex(o) {
    const key = "j" + o.jib + (o.win ? "w" : "");
    return TEXC[key] || (TEXC[key] = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = o.jib; g.fillRect(0, 0, w, h);
      for (let k = 1; k < 9; k++) { g.strokeStyle = "rgba(0,0,0,.1)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, k * h / 9); g.lineTo(w, k * h / 9 - 10); g.stroke(); }
      /* UV-védőcsík az achterliken és az alsó élen */
      g.fillStyle = o.uv || "rgba(40,48,60,.85)"; g.fillRect(w - 26, 0, 26, h); g.fillRect(0, h - 22, w, 22);
      if (o.win) { sailDetail(g, w, h, false); sailWindow(g, w, h, [[.035, .335], [.345, .645], [.655, .945]], .05, .185, 7); }   /* 2026-11-12 09:40 (tulajdonos): a fock TELJES alsó sávja átlátszó, három szegmensben, körben szegve */   /* 2026-11-12 09:37 (tulajdonos): az ablak a fock LEGALSÓ részén legyen, ott segíti a kilátást */
    }));
  }
  function spinTex(cols) {
    const key = "sp" + cols.join();
    return TEXC[key] || (TEXC[key] = canvasTex(512, 512, (g, w, h) => {
      cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * h / cols.length, w, h / cols.length + 1); });
      g.strokeStyle = "rgba(0,0,0,.12)"; for (let k = 0; k < 16; k++) { g.beginPath(); g.moveTo(k * w / 16, 0); g.lineTo(k * w / 16, h); g.stroke(); }
    }));
  }
  /* 2026-11-12 01:34 – DÍSZSPINAKKER (tulajdonos: „csodálatos Zephyres vagy nemzeti színű, vagy mindkettő”): piros–fehér–zöld sávok, a fehér mezőben a Zephyr-logó,
     háromsugaras (tri-radial) szabásvonalakkal, sötétkék szegőcsíkokkal. A vászon teteje a vitorla csúcsa. */
  function spinArtTex(logo) {
    const cv = document.createElement("canvas"); cv.width = cv.height = 1024; const g = cv.getContext("2d"), w = 1024, h = 1024, tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; W.disposables.push(tex);
    const paint = (img) => {
      g.fillStyle = "#fbfbf6"; g.fillRect(0, 0, w, h);
      const rg = g.createLinearGradient(0, 0, 0, h * .33); rg.addColorStop(0, "#b3141d"); rg.addColorStop(1, "#e2232d"); g.fillStyle = rg; g.fillRect(0, 0, w, h * .33);
      const gg = g.createLinearGradient(0, h * .72, 0, h); gg.addColorStop(0, "#2f9a55"); gg.addColorStop(1, "#1d7a41"); g.fillStyle = gg; g.fillRect(0, h * .72, w, h * .28);
      g.fillStyle = "#141d4d"; g.fillRect(0, h * .33 - 7, w, 14); g.fillRect(0, h * .72 - 7, w, 14); g.fillRect(0, h - 16, w, 16); g.fillRect(0, 0, 12, h); g.fillRect(w - 12, 0, 12, h);
      if (img) { const iw = w * .74, ih = iw * img.height / img.width, ih2 = Math.min(ih, h * .33); g.save(); g.translate(w, 0); g.scale(-1, 1); g.drawImage(img, (w - iw * ih2 / ih) / 2, h * .525 - ih2 / 2, iw * ih2 / ih, ih2); g.restore(); }   /* tükrözve: a KORMÁNYTÓL (a vitorla háta felől) nézve olvasható a felirat */
      /* szabásvonalak: a csúcsból, a két alsó sarokból sugarasan, középen vízszintes panelek */
      g.strokeStyle = "rgba(20,30,60,.16)"; g.lineWidth = 2;
      for (let k = 0; k <= 12; k++) { g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(k * w / 12, h * .36); g.stroke(); }
      for (let k = 1; k <= 7; k++) { g.beginPath(); g.moveTo(0, h); g.lineTo(k * w / 16, h * .68); g.stroke(); g.beginPath(); g.moveTo(w, h); g.lineTo(w - k * w / 16, h * .68); g.stroke(); }
      for (let k = 0; k < 6; k++) { const y = h * (.39 + k * .055); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      /* finom szövetfény */
      const sh = g.createLinearGradient(0, 0, w, 0); sh.addColorStop(0, "rgba(0,0,0,.10)"); sh.addColorStop(.5, "rgba(255,255,255,.06)"); sh.addColorStop(1, "rgba(0,0,0,.10)"); g.fillStyle = sh; g.fillRect(0, 0, w, h);
      tex.needsUpdate = true; };
    paint(null);
    if (logo) { const im = new Image(); im.onload = () => paint(im); im.src = logo; }
    return tex;
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
    const jibMat = std({ map: jibTex(o), side: THREE.DoubleSide, roughness: .85, transparent: !!o.win });
    const FINE = !!o.fine;   /* a saját (VR) hajó: sűrűbb vászonháló, rugós bum, lécek „átpattanása”, kötelek, jelzőszálak, szélzászló */
    const mainG = FINE ? sailGeom(20, 30) : sailGeom(10, 14), jibG = FINE ? sailGeom(18, 26) : sailGeom(9, 12);
    const mainM = mesh(mainG, mainMat, body), jibM = mesh(jibG, jibMat, body);
    mainM.frustumCulled = jibM.frustumCulled = false;
    let spinM = null, spinG = null;
    if (o.spin && !o.detail) { spinG = o.spinArt ? sailGeom(24, 28) : sailGeom(10, 12); spinM = mesh(spinG, std({ map: o.spinArt ? spinArtTex(o.logoImg) : spinTex(o.spin), side: THREE.DoubleSide, roughness: .8 }), body); spinM.visible = false; spinM.frustumCulled = false; }
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
    /* 2026-11-12 12:14 (tulajdonos: a bábuk legyenek emberszerűek; a versenyzőkön ZEPHYR mellény, piros-fekete és sárga-fekete): minden hajó legénysége
       emberi arányú – fej arccal, fülekkel, változatos haj (rövid / lófarok / sapka), fekete habmellény színes V-betéttel és ZEPHYR felirattal a háton, karok a kötélen,
       két láb térddel és cipővel. A részek anyagonként össze vannak vonva (hajónként kevés rajzolási hívás – a Quest miatt). */
    const zephyrBack = TEXC.zb || (TEXC.zb = canvasTex(256, 80, (g) => { g.clearRect(0, 0, 256, 80); g.fillStyle = "#ffffff"; g.font = "italic 900 54px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ZEPHYR", 128, 44); }));
    const SKINS = ["#e0b08f", "#c98f6b", "#ecc3a3", "#d6a37e"], HAIRS = ["#3a2414", "#15110e", "#c9a55a", "#6b4a2a"];
    for (let k = 0; k < (o.crew || 0); k++) {
      const c = new THREE.Group(), I = new THREE.Matrix4(), seed = (k * 7 + (o.num ? String(o.num).length : 0) + (o.i || 0)) | 0;
      const vcol = o.crewCol || ["#e3262a", "#f2b01e"][(k + seed) % 2], byM = {}, put = (geo, col) => { (byM[col] || (byM[col] = [])).push([geo, I]); };
      const sk = SKINS[(k + seed) % 4], hr = HAIRS[(k * 3 + seed) % 4], JK = "#20252c", FO = "#17181b";
      { const t = new THREE.CylinderGeometry(.17, .14, .42, 12); t.scale(1, 1, .78); t.translate(0, .45, 0); put(t, JK); const sh = new THREE.SphereGeometry(.18, 12, 8); sh.scale(1.08, .42, .72); sh.translate(0, .66, 0); put(sh, JK);
        const vf = new THREE.BoxGeometry(.33, .36, .1); vf.translate(0, .48, .08); put(vf, FO); const vb = new THREE.BoxGeometry(.33, .38, .09); vb.translate(0, .49, -.08); put(vb, FO);
        [-1, 1].forEach((sd) => { const vp = new THREE.BoxGeometry(.1, .36, .02); vp.rotateZ(sd * .28); vp.translate(sd * .085, .5, .135); put(vp, vcol); const st = new THREE.BoxGeometry(.08, .05, .24); st.translate(sd * .11, .67, 0); put(st, vcol);
          const ua = new THREE.CapsuleGeometry(.048, .2, 3, 6); ua.rotateX(.9); ua.translate(sd * .2, .56, .08); put(ua, JK); const fa = new THREE.CapsuleGeometry(.042, .2, 3, 6); fa.rotateX(1.5); fa.translate(sd * .2, .45, .26); put(fa, JK);
          const hd = new THREE.SphereGeometry(.042, 8, 6); hd.translate(sd * .2, .44, .39); put(hd, sk);
          const th = new THREE.CapsuleGeometry(.07, .28, 3, 6); th.rotateX(Math.PI / 2); th.translate(sd * .09, .25, .2); put(th, "#27303c"); const sn = new THREE.CapsuleGeometry(.058, .28, 3, 6); sn.translate(sd * .09, .06, .4); put(sn, "#27303c");
          const shoe = new THREE.BoxGeometry(.085, .055, .19); shoe.translate(sd * .09, -.12, .45); put(shoe, "#f2f2ee");
          const ear = new THREE.SphereGeometry(.026, 6, 5); ear.scale(.5, 1, .8); ear.translate(sd * .1, .86, 0); put(ear, sk); });
        const belt = new THREE.BoxGeometry(.34, .04, .2); belt.translate(0, .36, 0); put(belt, "#0d0f12");
        const nk = new THREE.CylinderGeometry(.047, .053, .08, 8); nk.translate(0, .75, 0); put(nk, sk); const hd2 = new THREE.SphereGeometry(.105, 14, 10); hd2.scale(.92, 1.08, 1); hd2.translate(0, .86, 0); put(hd2, sk);
        const jw = new THREE.SphereGeometry(.078, 10, 8); jw.scale(.95, .8, .9); jw.translate(0, .805, .022); put(jw, sk); const ns = new THREE.ConeGeometry(.018, .045, 6); ns.rotateX(Math.PI / 2 - .35); ns.translate(0, .855, .108); put(ns, sk);
        const mo = new THREE.BoxGeometry(.04, .008, .01); mo.translate(0, .808, .09); put(mo, "#9b4a44"); const sg = new THREE.BoxGeometry(.155, .034, .022); sg.translate(0, .88, .096); put(sg, "#0d0f12");
        const hair = new THREE.SphereGeometry(.112, 14, 8, 0, TAU, 0, Math.PI * .56); hair.scale(.95, 1.06, 1.04); hair.rotateX(-.28); hair.translate(0, .872, -.012); put(hair, hr);
        if ((k + seed) % 3 === 0) { const cp = new THREE.SphereGeometry(.118, 14, 8, 0, TAU, 0, Math.PI / 2); cp.translate(0, .89, 0); put(cp, "#ffffff"); const vz = new THREE.BoxGeometry(.14, .012, .1); vz.rotateX(.12); vz.translate(0, .9, .14); put(vz, "#0b2f5e"); } }
      Object.keys(byM).forEach((col) => mesh(mergeGeoms(byM[col]), std({ color: col, roughness: .78 }), c));
      const lg = mesh(new THREE.PlaneGeometry(.26, .08), basic({ map: zephyrBack, transparent: true, depthWrite: false }), c); lg.position.set(0, .55, -.127); lg.rotation.y = Math.PI; lg.userData.noBake = true;
      /* lófarok / hosszabb haj: külön csoport, a szélben leng */
      let tail = null; if ((k + seed) % 3 === 1) { tail = new THREE.Group(); tail.position.set(0, .9, -.1); c.add(tail); const tg = new THREE.ConeGeometry(.035, .3, 6); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -.15); const tm = mesh(tg, std({ color: hr, roughness: .9 }), tail); tm.userData.noBake = true; }
      const legs = new THREE.Group(); c.add(legs);
      body.add(c); crew.push({ g: c, z: -2.6 + k * .75, legs, tail, ph: k * 1.7 });
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
      awa: null, aws: 6, gust: 1, tackT: 0, wing: 0, boomS: null, jibA: null, lfM: 0, lfJ: 0, bl: 0, jc: 0, scurl: 0, boomV: 0, lift: 0, sv: null, sj: null, sideP: null, dt: 0 };
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
      if (FINE) {   /* rugós-csillapított bum: perdülésnél/fordulónál átvág, a szkóta végén megrándul és visszarúg; egyébként a szkótás puhán követi a szelet */
        const cross = Math.sign(bT) !== Math.sign(S.boomS) && Math.abs(bT - S.boomS) > 6, h2 = Math.min(dt, .05);
        S.boomV += ((bT - S.boomS) * (cross ? 30 : 9) - S.boomV * (cross ? 5.2 : 5)) * h2; S.boomS += S.boomV * h2;
        if (Math.abs(S.boomS) > 84) { S.boomS = Math.sign(S.boomS) * 84; S.boomV *= -.35; }
        if (S.sideP !== sd) { if (S.sideP != null) S.jibA = 46; S.sideP = sd; }   /* forduló: a fockszkótát kiengedik, a túloldalon csörlőzik be */
        const lT = .015 + .06 * clamp(Math.abs(S.boomS) / 80, 0, 1) + clamp(Math.abs(S.boomV) * .0009, 0, .06) + .01 * (S.gust - 1) / .15; S.lift += (lT - S.lift) * Math.min(1, dt * 4);
      } else
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
      let twist = auto ? .16 + .1 * clamp((S.awa - 30) / 120, 0, 1) : .22;   /* hátszélben nyitottabb felső rész */
      if (FINE) { twist += .07 * clamp((S.gust - 1) / .15, -1, 1) + .5 * S.lift;   /* lökésben és megemelt bumnál a hátsó él kinyílik */
        if (!S.sv) S.sv = new Float32Array(nv + 1).fill(side); }
      const dxp = FINE ? .72 + .1 * clamp(U / 10, 0, 1) : .8, clewUp = FINE ? Math.sin(S.lift) * foot : 0;
      for (let j = 0; j <= nv; j++) {
        const v = j / nv, y = y0 + (yh - y0) * v;
        const chord = foot * ((1 - v) * (1 + .26 * Math.sin(Math.PI * v))) + .16 * v;
        /* FINE: a vitorla oldalváltása alulról felfelé fut végig – a lécek egymás után „pattannak át”, közben a vászon laposan csapkod */
        let sdj = side, lfj = lf;
        if (FINE) { const r = (4.6 - 2.6 * v) * S.dt, d = side - S.sv[j]; S.sv[j] += clamp(d, -r, r); const q = S.sv[j]; sdj = Math.sign(q) * Math.pow(Math.abs(q), .45); lfj = Math.max(lf, (1 - Math.abs(q)) * .95); }
        const tw = a + sdj * twist * v;   /* a vitorla csavarodása felfelé */
        const dx = Math.sin(tw), dz = -Math.cos(tw);
        const camber = .11 * (1 - v * .35) * gk * (FINE ? .45 + .55 * sstep(0, .1, v) : 1);   /* az alsó él a bumhoz simul */
        const bend = FINE ? -.09 * Math.sin(Math.PI * v) * clamp(U / 9, .2, 1.2) : 0;   /* árbochajlás: a belépő él közepe előre ível */
        for (let i = 0; i <= nu; i++) {
          const u = i / nu, k = (j * (nu + 1) + i) * 3;
          let depth = chord * camber * Math.sin(Math.PI * Math.pow(u, dxp));
          depth = luffDepth(depth, chord, u, v, lfj, om, .07);
          if (auto) depth += leechFlutter(u, v, U, lfj);
          if (FINE) depth += .012 * Math.exp(-u * 7) * Math.sin(v * 58 + u * 9) * clamp(1.2 - U / 7, 0, 1) * (1 - lfj)   /* gyenge szélben ráncok a belépő él mögött */
            + chord * .006 * Math.sin(S.t * 2.1 + v * 4 - u * 5) * (S.gust - .85);                                        /* a vászon „lélegzik” a lökésekben */
          pa[k] = dx * u * chord + Math.cos(tw) * depth * sdj;
          pa[k + 1] = y - u * .12 * (1 - v) + u * clewUp * Math.pow(1 - v, 1.5);
          pa[k + 2] = mastZ - .07 + dz * u * chord + Math.sin(tw) * depth * sdj + bend * (1 - u);
        }
      }
      mainG.attributes.position.needsUpdate = true; mainG.computeVertexNormals(); if (G.userData.sailBaked) sailShade(mainG);
      boomG.rotation.y = -a; if (FINE) { boomG.rotation.order = "YXZ"; boomG.rotation.x = S.lift; }
    }
    const _cw = new THREE.Vector3();
    function updJib() {
      const pa = jibG.attributes.position.array, { nu, nv } = jibG.userData;
      const tack = _a.set(0, hullShape(1).sheer + .1, HULL.L / 2 - .25);
      const head = _b.set(0, foreH - .25, mastZ + .1 + (HULL.L / 2 - .25 - mastZ - .1) * .03);
      const auto = S.awa != null, ja = S.jib, side = S.side, foot = 4.55, U = auto ? S.aws : 6, om = TAU * (1 + U * .17);
      /* FINE: forduláskor a fock nem „ugrik át” – a szkótasarok az árboc ELŐTT ível át a túloldalra, közben a vászon csapkod, aztán becsörlőzik */
      if (FINE) { if (S.sj == null) S.sj = side; S.sj += clamp(side - S.sj, -1.35 * S.dt, 1.35 * S.dt); }
      const sx = FINE ? Math.sign(S.sj) * Math.pow(Math.abs(S.sj), .6) : side, midT = FINE ? 1 - Math.abs(S.sj) : 0;
      const clew = _c.set(tack.x + Math.sin(ja) * foot * sx, hullShape(.5).sheer + .42 + ja * .5 + midT * .55, tack.z - Math.cos(ja) * foot + midT * 2.3);
      /* pillangó: a szkótapont a rúd végén, a szél felőli oldalon, kb. merőlegesen a hajóra */
      const wg = auto ? sstep(0, 1, S.wing) : 0;
      if (wg > 0) {
        const th = 78 * D2R, Lp = 3.35; _cw.set(-side * Lp * Math.sin(th), poleBase.y + .05, poleBase.z + Lp * Math.cos(th));
        /* átvitel közben a szkótapont a hajó előtt ível át */
        const mid = Math.sin(Math.PI * wg); clew.lerp(_cw, wg); clew.z += mid * .9; clew.y += mid * .4;
      }
      const jsd = wg > .5 ? -side : (FINE && S.sj ? Math.sign(S.sj) : side);
      _n.subVectors(head, tack).cross(_p.subVectors(clew, tack)).normalize(); if (_n.x * jsd < 0) _n.negate();
      const lf = Math.max(auto ? S.lfJ * (1 - wg) : S.luff, midT), cross = auto ? Math.abs(1 - 2 * wg) : 1;   /* átvitel közben ernyedt */
      const sag = FINE ? .075 * clamp(U / 9, .3, 1.3) * (1 - midT) : 0;   /* az előstag a szél alá hasasodik */
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
          if (FINE) depth += sag * Math.sin(Math.PI * v) * (1 - u) + chord * .012 * sstep(.75, 1, u) * Math.sin(S.t * 5.2 + v * 11) * clamp(U / 8, .2, 1) * (1 - lf)   /* a hátsó él finoman pödrődik */
            + chord * .006 * Math.sin(S.t * 2.3 + v * 5 - u * 4) * (S.gust - .85);
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
      /* 2026-11-12: a versenyben a spinakker-JELENET külön vezérli a felhúzást (spH), a szétterülést (spS), a telítődést (spF) és a „kipattanást” (spPop) */
      const hoist = S.spH != null ? S.spH : Math.min(1, k0 * 1.5), spread = S.spS != null ? S.spS : 1, pop = S.spPop || 0;
      const fill = (S.spF != null ? S.spF : sstep(.4, 1, k0)) * (1 - clamp((96 - A) / 16, 0, 1) * .85);   /* túl élesen összeesik */
      /* rúd: merőleges a látszólagos szélre – hátszélben hátrahúzva (a szél felőli oldalon), bővszélben az előstag felé;
         a hajó ringásával a trimmer együtt mozgatja */
      const thp = clamp(A - 92 + S.heel * side * 25, 4, 82) * D2R, Lp = 3.1;
      const tack = _a.set(-side * Lp * Math.sin(thp), poleBase.y + .25, poleBase.z + Lp * Math.cos(thp));
      if (spread < 1) { const q = 1 - spread; tack.x *= spread; tack.y -= .25 * q; tack.z += (poleBase.z + Lp * .9 - tack.z) * q; }   /* felhúzáskor az orrfedélzeti zsákból, „kolbászként” jön fel */
      const topY = mastBase + mastH * .97, headY = deckY + (topY - deckY) * hoist;
      const head = _b.set(-side * .25 * Math.sin(thp), headY, mastZ + .55);
      /* a talp húrja: bővszélben a hajó mentén hátra-hátszél felé, hátszélben keresztben; a domborulat a szél áramlásával előre */
      const dl = clamp(A - 38, 45, 92) * D2R, F = 5.7 * (.45 + .55 * fill) * (.07 + .93 * spread);
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
          /* 2026-11-12 01:52 (tulajdonos: „a spinakker legyen sokkal tökéletesebb, kidolgozottabb”): teltebb has (a húr 58%-a), széles „vállak” (a vitorla a közepén a talpnál is
             szélesebb – nem háromszög, hanem ballon), ívelt talp, a kilépő él finoman pereg, az egész lassan lélegzik a széllel. */
          let bulge = F * .58 * fill * Math.pow(Math.sin(Math.PI * u), .8) * Math.pow(Math.sin(Math.PI * Math.min(1, v * .98 + .05)), .55) * (1 + .03 * Math.sin(S.t * 1.15) + .02 * Math.sin(S.t * 3.1 + v * 6));
          const sh = (u - .5) * F * .62 * fill * Math.pow(Math.sin(Math.PI * clamp(v * 1.02, 0, 1)), .9);                    /* vállak: oldalra szélesedik */
          const roach = v < .16 ? (1 - v / .16) * Math.sin(Math.PI * u) * .42 * fill : 0;                                     /* ívelt, lelógó talp */
          const lee = u > .84 ? (u - .84) / .16 * .05 * F * fill * Math.sin(S.t * 8.5 + v * 15) * Math.sin(Math.PI * v) : 0;   /* a kilépő él pergése */
          /* belépő él (a rúd felőli szél) behajlása – a vitorla közepe táján a legerősebb */
          const ce = u < .3 ? (1 - u / .3) ** 2 * Math.max(0, Math.sin(Math.PI * clamp((v - .18) / .72, 0, 1))) : 0;
          bulge -= ce * S.scurl * 1.1 * fill; bulge *= 1 + pop;
          /* ernyedt (felhúzás közben / túl éles szögnél): lengő, csapkodó szövet */
          if (lim > .01) bulge += lim * F * .06 * flogW(u, v, om) + lim * .35 * Math.sin(S.t * 1.3 + v * 2);
          pa[k] = lx + (ex - lx) * u + _sn.x * (bulge + lee) + _sc.x * sh; pa[k + 1] = ly + (ey - ly) * u + bulge * .16 - roach - lim * v * .2 * (1 - k0); pa[k + 2] = lz + (ez - lz) * u + _sn.z * (bulge + lee) + _sc.z * sh;
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
        c.g.rotation.order = "YXZ";
        c.g.rotation.y = ws > 0 ? Math.PI / 2 : -Math.PI / 2;   /* kifelé néznek, a lábuk a peremen kívül lóg (kiülés) */
        c.g.rotation.z = 0; c.g.rotation.x = -clamp(.1 + Math.abs(S.heel) * 1.2, .1, .6) + .03 * Math.sin(S.t * 1.3 + c.ph);
        if (c.tail) { c.tail.rotation.y = -(ws > 0 ? 1 : -1) * 1.2 + .35 * Math.sin(S.t * 7 + c.ph); c.tail.rotation.x = .25 * Math.sin(S.t * 5.3 + c.ph); }
      });
    }
    G.userData.S = S;
    /* 2026-11-11 VITORLÁK KISÜTÉSE: a vitorlák anyaga fény nélküli (MeshBasicMaterial), az árnyalást a hullámzó felület normálisaiból
       csúcsszínként számoljuk (vitorlánként ~150 csúcs – elhanyagolható), így a hajón semmi sem kér futásidejű fényszámítást. */
    /* ===== 2026-11-12 09:13 – a saját hajó makettszerű kötélzete és vitorlaszerelvényei (FINE) =====
       mozgó részek: főszkóta négyszeres áttétellel a bum és az utazósín kocsija között (a kocsi a szél alá csúszik), fockszkóták a szkótasaroktól a sínkocsikon át a csörlőkig
       (a terheletlen szkóta lazán belóg), jelzőszálak a fock belépő élén és a grósz hátsó élén (áramlanak, belobogáskor táncolnak), szélzászló és kanalas szélmérő az árboccsúcson;
       álló részek: lúdnyak, árbocsín, felhúzókötelek, bumlehúzó (kicker) csigasorral, alsóél-feszítő, reffkötelek, bumvég görgővel, feszítőcsavarok, fockroller dobja, fockkocsik sínen. */
    let updRig = () => {};
    if (FINE) {
      const ropeMat = (c) => { const m = basic({ color: c }); return m; }, rW = ropeMat("#f2f2ec"), rR = ropeMat("#c92a2a"), rB = ropeMat("#2456a6"), rK = ropeMat("#22262c"), rG = ropeMat("#2fa85a");
      const rodM = (r, mat, par) => { const g = new THREE.CylinderGeometry(r, r, 1, 6, 1, true); g.translate(0, .5, 0); const m = mesh(g, mat, par || body); m.frustumCulled = false; m.userData.noBake = true; return m; };
      const setRod = (m, a, b) => { _q.subVectors(b, a); const L = Math.max(_q.length(), 1e-4); m.position.copy(a); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(_up, _q.multiplyScalar(1 / L)); };
      const V = (x, y, z) => new THREE.Vector3(x, y, z), y0 = mastBase + .92;
      /* --- álló szerelvények a bumon (a bum helyi terében: a bum −z felé nyúlik) */
      { const pr = [], I = new THREE.Matrix4(), bxg = (w, h2, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h2, d); g.translate(x, y, z); return [g, I]; };
        pr.push(bxg(.09, .16, .1, 0, 0, .0));                                   /* lúdnyak-villa */
        pr.push(bxg(.07, .1, .12, 0, .0, -3.42));                               /* bumvég-fej */
        pr.push(bxg(.05, .05, .16, 0, .09, -3.1));                              /* alsóél-feszítő kocsi */
        [-.9, -2.0, -2.85].forEach((z) => pr.push(bxg(.035, .06, .09, 0, -.09, z)));   /* szkótakengyelek a bum alján */
        [-.55, -1.25].forEach((z) => { pr.push(bxg(.03, .03, .1, .06, -.02, z)); pr.push(bxg(.03, .03, .1, -.06, -.02, z)); });   /* reffkötél-szorítók */
        mesh(mergeGeoms(pr), dark, boomG);
        const sh2 = new THREE.CylinderGeometry(.045, .045, .03, 14); sh2.rotateZ(Math.PI / 2); sh2.translate(0, .0, -3.46); mesh(sh2, chrome, boomG);   /* bumvég-görgő */
        const lines = [rodGeom(V(0, .09, -3.1), V(0, .07, -3.44), .007, 5), rodGeom(V(.06, -.02, -.5), V(.05, .1, -3.0), .006, 5), rodGeom(V(-.06, -.02, -1.2), V(-.05, .1, -3.2), .006, 5)];
        mesh(mergeGeoms(lines.slice(0, 1)), rK, boomG).userData.noBake = true;   /* (a bumon végigfutó piros/zöld reffkötelek lekerültek – 2026-11-12 14:09) */
        /* bumlehúzó (kicker): csigasoros kötél az árboctőtől a bum aljáig + két csiga */
        if (!o.detail) { const k0 = V(0, -.8, -.06), k1 = V(0, -.09, -.9); const kk = [-.02, 0, .02].map((x) => rodGeom(V(x, k0.y, k0.z), V(x, k1.y, k1.z), .006, 5)); mesh(mergeGeoms(kk), rB, boomG).userData.noBake = true;
          mesh(mergeGeoms([bxg(.06, .08, .05, 0, -.76, -.1), bxg(.06, .08, .05, 0, -.14, -.86)]), dark, boomG); } }
      /* --- álló szerelvények az árbocon és a fedélzeten */
      { const pr = [], I = new THREE.Matrix4(), bxg = (w, h2, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h2, d); g.translate(x, y, z); return [g, I]; };
        pr.push(bxg(.022, mastH - 1.1, .02, 0, mastBase + .9 + (mastH - 1.1) / 2, mastZ - .105));    /* árbocsín */
        pr.push(bxg(.1, .12, .12, 0, y0, mastZ - .1));                                                /* lúdnyak-tartó */
        pr.push(bxg(.12, .05, .3, 0, mastBase + mastH + .02, mastZ - .06));                           /* árboccsúcs-daru */
        [.25, .5].forEach((q) => pr.push(bxg(.16, .035, .05, 0, mastBase + q, mastZ + .11)));         /* kötélterelők az árboc tövén */
        [-1, 1].forEach((sd) => { pr.push(bxg(.05, .05, .05, sd * .78, mastBase + mastH * .52, mastZ - .08));   /* szálingvég */
          const s6 = hullShape(.6); pr.push(bxg(.03, .2, .03, sd * (HULL.B / 2 - .1), s6.sheer + .15, mastZ - .2));                                  /* feszítőcsavar */
          const s45 = hullShape(.47), s38 = hullShape(.38); pr.push(bxg(.035, .025, s45.z - s38.z + .5, sd * (s45.hb - .32), s45.sheer + .085, (s45.z + s38.z) / 2)); });   /* focksín */
        mesh(mergeGeoms(pr), dark, body);
        const tb = []; [-1, 1].forEach((sd) => { const s6 = hullShape(.6); tb.push(rodGeom(V(sd * (HULL.B / 2 - .1), s6.sheer + .06, mastZ - .2), V(sd * (HULL.B / 2 - .1) * .985, s6.sheer + .3, mastZ - .2), .014, 8)); });
        const bw = V(0, hullShape(1).sheer + .05, HULL.L / 2 - .12); tb.push(rodGeom(bw, V(0, bw.y + .16, bw.z - .012), .05, 14));   /* fockroller dobja */
        mesh(mergeGeoms(tb), chrome, body);
        /* (2026-11-12 09:55, tulajdonos: az árbocon nem futnak fel színes kötelek – zavaró, nincs ott; levéve) */ }
      /* --- szélzászló (Windex) és kanalas szélmérő az árboccsúcson */
      const vane = new THREE.Group(); vane.position.set(0, mastBase + mastH + .34, mastZ - .16); body.add(vane);
      { mesh(mergeGeoms([rodGeom(V(0, mastBase + mastH + .04, mastZ - .16), V(0, mastBase + mastH + .34, mastZ - .16), .006, 5)]), dark, body);
        const ar = new THREE.BoxGeometry(.012, .012, .42); mesh(ar, rK, vane).userData.noBake = true; const tip = new THREE.ConeGeometry(.022, .07, 8); tip.rotateX(Math.PI / 2); tip.translate(0, 0, .23); mesh(tip, rR, vane).userData.noBake = true;
        const fin = new THREE.BoxGeometry(.004, .09, .14); fin.translate(0, .02, -.2); mesh(fin, rR, vane).userData.noBake = true;
        [-1, 1].forEach((sd) => { const tab = mesh(new THREE.BoxGeometry(.03, .004, .03), rR, body); tab.position.set(sd * .11, mastBase + mastH + .3, mastZ - .16 - .2); tab.userData.noBake = true;
          const arm = mesh(mergeGeoms([rodGeom(V(0, mastBase + mastH + .3, mastZ - .16), V(sd * .11, mastBase + mastH + .3, mastZ - .36), .003, 4)]), dark, body); }); }
      const cups = new THREE.Group(); cups.position.set(0, mastBase + mastH + .16, mastZ + .12); body.add(cups);
      { mesh(mergeGeoms([rodGeom(V(0, mastBase + mastH + .04, mastZ + .12), V(0, mastBase + mastH + .16, mastZ + .12), .006, 5)]), dark, body);
        for (let q = 0; q < 3; q++) { const a = q * TAU / 3, c = new THREE.SphereGeometry(.022, 8, 6, 0, Math.PI); c.rotateY(a); c.translate(Math.cos(a) * .07, 0, -Math.sin(a) * .07); mesh(c, rK, cups).userData.noBake = true;
          mesh(mergeGeoms([rodGeom(V(0, 0, 0), V(Math.cos(a) * .07, 0, -Math.sin(a) * .07), .003, 4)]), rK, cups).userData.noBake = true; } }
      /* --- főszkóta: négyszeres áttétel a bum és az utazósín kocsija között */
      const sp = o.sheetPt || [0, hullShape(.2).sheer + .14, hullShape(.2).z], trW = o.travHalf != null ? o.travHalf : .55;
      const ms = [-.03, -.01, .01, .03].map(() => rodM(.0075, rW)), blkT = mesh(new THREE.BoxGeometry(.07, .1, .06), dark, body), blkB = mesh(new THREE.BoxGeometry(.08, .1, .07), dark, body); blkT.userData.noBake = blkB.userData.noBake = true;
      /* --- fockszkóták: 2 szakasz a húzott oldalon (sarok → kocsi → csörlő), 3 a lazán (sarok → árboc előtt → kocsi → csörlő) */
      const jsW = [rodM(.008, rR), rodM(.008, rR)], jsL = [rodM(.008, rB), rodM(.008, rB), rodM(.008, rB)];
      const carP = (sd) => { const q = hullShape(.42); return V(sd * (q.hb - .32), q.sheer + .11, q.z); }, winP = (sd) => { const q = hullShape(.28); return V(sd * (q.hb - .3) , q.sheer + .22, q.z); };
      const cars = [-1, 1].map((sd) => { const c = mesh(new THREE.BoxGeometry(.07, .06, .12), dark, body); c.position.copy(carP(sd)); c.position.y -= .03;
        /* csigák: álló csiga a sínkocsin (ezen fordul a szkóta a csörlő felé) és terelőcsiga a csörlő előtt */
        const sh1 = mesh(new THREE.CylinderGeometry(.045, .045, .028, 16), chrome, body); sh1.rotation.z = Math.PI / 2; sh1.position.copy(carP(sd)); sh1.position.y += .02;
        const ck1 = mesh(new THREE.BoxGeometry(.012, .12, .1), dark, body); ck1.position.copy(sh1.position); ck1.position.x += sd * .02; const ck2 = mesh(new THREE.BoxGeometry(.012, .12, .1), dark, body); ck2.position.copy(sh1.position); ck2.position.x -= sd * .02;
        const tb2 = mesh(new THREE.CylinderGeometry(.035, .035, .03, 14), chrome, body); tb2.position.copy(winP(sd)); tb2.position.z += .22; tb2.position.y -= .1; return c; });
      /* --- jelzőszálak: fock belépő él (piros a bal, zöld a jobb oldalon), grósz hátsó él (piros szalagok) */
      const tell = [];
      [.3, .5, .7].forEach((v) => { [-1, 1].forEach((sd) => tell.push({ m: rodM(.0045, sd > 0 ? rG : rR), jib: true, u: .1, v, sd, L: .2, ph: Math.random() * 9 })); });
      [.26, .48, .68, .86].forEach((v) => tell.push({ m: rodM(.006, rR), jib: false, u: 1, v, sd: 0, L: .26, ph: Math.random() * 9 }));
      const _t0 = new THREE.Vector3(), _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3(), _t3 = new THREE.Vector3(), _be = new THREE.Vector3(), _cp = new THREE.Vector3(), _cl = new THREE.Vector3(), _m1 = new THREE.Vector3();
      const vtx = (G2, i, j, out) => { const nu = G2.userData.nu, pa = G2.attributes.position.array, k = (j * (nu + 1) + i) * 3; return out.set(pa[k], pa[k + 1], pa[k + 2]); };
      let vaneA = 0;
      updRig = (dt) => {
        const a = S.boom, Lb = 2.85;
        /* főszkóta */
        _be.set(Math.sin(a) * Lb, y0 - .1 + Math.sin(S.lift) * Lb, mastZ - Math.cos(a) * Lb * Math.cos(S.lift));
        _cp.set(clamp(Math.sin(a) * 1.6, -trW, trW), sp[1], sp[2]);
        blkT.position.copy(_be); blkT.position.y -= .05; blkB.position.copy(_cp); blkB.position.y += .06; blkB.lookAt(body.localToWorld(_t0.copy(_be))); blkT.rotation.y = -a;
        ms.forEach((m, i) => { const off = (i - 1.5) * .018; _t0.copy(_be); _t0.y -= .1; _t0.x += off * Math.cos(a); _t0.z += off * Math.sin(a); _t1.copy(_cp); _t1.y += .11; _t1.x += off; setRod(m, _t1, _t0); });
        /* fockszkóták */
        const nuJ = jibG.userData.nu; vtx(jibG, nuJ, 0, _cl);
        const ws = S.sj != null && S.sj !== 0 ? Math.sign(S.sj) : S.side, wg2 = S.wing > .5 ? -1 : 1, w = ws * wg2;
        /* 2026-11-12 14:09 (tulajdonos: „verseny közben még mindig látok indokolatlan helyen kötelet”): csak a HÚZOTT fockszkóta látszik, a szkótasaroktól a sínkocsi
           csigájáig (onnan a fedélzet alatt megy a csörlőhöz); a laza szkóta és a fedélzeten átfutó szakaszok lekerültek */
        _t0.copy(carP(w)); _t0.y += .04; setRod(jsW[0], _cl, _t0); jsW[1].visible = false; jsL.forEach((m) => { m.visible = false; });
        /* jelzőszálak */
        const U = S.aws || 6, flow = clamp(U / 7, .25, 1);
        tell.forEach((q) => { const G2 = q.jib ? jibG : mainG, nu = G2.userData.nu, nv = G2.userData.nv, i = Math.round(q.u * nu), j = Math.round(q.v * nv);
          vtx(G2, i, j, _t0); vtx(G2, Math.max(0, i - 1), j, _t1); if (q.jib) vtx(G2, i + 1, j, _t2); else _t2.copy(_t0).add(_t3.subVectors(_t0, _t1));
          _t3.subVectors(_t2, q.jib ? _t0 : _t1).normalize();   /* a húr iránya hátrafelé */
          const lfq = q.jib ? Math.max(S.lfJ, S.sj != null ? 1 - Math.abs(S.sj) : 0) : S.lfM, wob = .16 + 1.5 * lfq, t = S.t * (7 + 5 * lfq) + q.ph;
          _t1.copy(_t3).multiplyScalar(q.L * flow); _t1.y += q.L * ((1 - flow) * -.8 + wob * Math.sin(t) * .5 + lfq * .35); _t1.x += q.L * (q.sd * .1 + wob * .4 * Math.sin(t * 1.31 + 1)); _t1.z += q.L * wob * .3 * Math.sin(t * .83);
          if (q.sd) _t0.x += q.sd * .012; _t1.add(_t0); setRod(q.m, _t0, _t1); });
        /* szélzászló a látszólagos szélbe fordul, a kanalak a szélsebességgel pörögnek */
        const tA = S.awa != null ? -S.side * S.awa * D2R : 0; vaneA += wrapA(tA - vaneA) * Math.min(1, dt * 3.5); vane.rotation.y = vaneA + .05 * Math.sin(S.t * 6.1) * flow; cups.rotation.y -= dt * (2 + U * 2.2);
      };
    }
    G.userData.bakeSails = () => { if (G.userData.sailBaked) return; G.userData.sailBaked = true;
      [mainM, jibM, spinM].forEach((m) => { if (!m) return; const o = m.material, n = new THREE.MeshBasicMaterial({ map: o.map || null, side: THREE.DoubleSide, vertexColors: true, transparent: o.transparent, opacity: o.opacity }); W.disposables.push(n);
        const g = m.geometry, c = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute("color", new THREE.BufferAttribute(c, 3)); m.material = n; m.castShadow = m.receiveShadow = false; sailShade(g); }); };
    G.userData.update = (dt) => {
      S.t += dt; S.dt = Math.min(dt, .1);
      body.rotation.set(S.pitch, 0, S.heel, "YXZ");
      if (S.awa != null) autoTrim(dt);
      if (!(spinM && spinM.visible) && !(S.awa != null && S.wing > .55)) poleM.visible = false;
      updMain(); updJib(); updSpin(); updCrew(dt); if (FINE) updRig(dt);
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
  /* 2026-11-12 10:10 (tulajdonos: „a bóják legyenek sokkal élethűbbek, sokkal szebbek”): felfújható versenybója – esztergált, hasas test lekerekített vállal és
     kúpos tetővel, függőleges varratok, fényvisszaverő szalag, fekete nehezék-gallér a vízvonalon habgyűrűvel, emelőfülek kötélhurokkal, a tetején rúd lobogóval és
     villogó lámpával, horgonykötél a víz alá. */
  function makeBuoy(color, h) {
    const g = new THREE.Group(), H = h || 1.8, m = std({ color, roughness: .5 }), dk = std({ color: "#15181c", roughness: .7 }), wt = std({ color: "#f4f4f0", roughness: .5 }), ch = std({ color: "#d9dee3", roughness: .25, metalness: .8 });
    const prof = [[.0, -.35], [.5, -.35], [.74, -.22], [.8, .05], [.8, H * .45], [.74, H * .72], [.56, H * .9], [.3, H * 1.0], [.1, H * 1.05], [0, H * 1.06]].map(([r, y]) => new THREE.Vector2(r, y));
    mesh(new THREE.LatheGeometry(new THREE.SplineCurve(prof).getPoints(26), 28), m, g);
    const parts = [], I = new THREE.Matrix4();
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, sg = new THREE.BoxGeometry(.02, H * .95, .03); sg.translate(0, H * .42, .8); sg.rotateY(a); parts.push([sg, I]); }   /* varratok */
    { const col = new THREE.TorusGeometry(.8, .11, 10, 28); col.rotateX(Math.PI / 2); col.translate(0, -.02, 0); parts.push([col, I]); }
    mesh(mergeGeoms(parts), dk, g);
    { const b1 = new THREE.CylinderGeometry(.812, .812, .2, 28, 1, true); b1.translate(0, H * .5, 0); const b2 = new THREE.CylinderGeometry(.812, .812, .07, 28, 1, true); b2.translate(0, H * .5 - .22, 0); mesh(mergeGeoms([[b1, I], [b2, I]]), wt, g); }
    { const cp = []; for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .4, lg = new THREE.TorusGeometry(.09, .018, 6, 12); lg.translate(0, H * .78, .7); lg.rotateY(a); cp.push([lg, I]); }
      const pole = new THREE.CylinderGeometry(.022, .022, 1.5, 8); pole.translate(0, H * 1.06 + .75, 0); cp.push([pole, I]); mesh(mergeGeoms(cp), ch, g); }
    const fl = mesh(new THREE.PlaneGeometry(.62, .42, 4, 1), basic({ color, side: THREE.DoubleSide }), g); fl.position.set(.33, H * 1.06 + 1.25, 0); fl.userData.noBake = true;
    const lamp = mesh(new THREE.SphereGeometry(.06, 10, 8), basic({ color: "#fff3b0" }), g); lamp.position.y = H * 1.06 + 1.53; lamp.userData.noBake = true;
    const foam = mesh(new THREE.RingGeometry(.82, 1.25, 28), basic({ color: "#ffffff", transparent: true, opacity: .35, depthWrite: false, side: THREE.DoubleSide }), g); foam.rotation.x = -Math.PI / 2; foam.position.y = .03; foam.userData.noBake = true;
    const rope = new THREE.CylinderGeometry(.02, .02, 2.2, 6); rope.translate(0, -1.4, 0); rope.rotateZ(.25); mesh(rope, wt, g);
    return g;
  }
  /* 2026-11-12 10:10 (tulajdonos: „a zsűrihajók és a nézelődő hajók ne legyenek ennyire rondák – legyenek ugyanolyan szép kidolgozottságúak, mint a vitorlásaink”):
     motoros jacht – a vitorlások ívelt, lakkozott hajóteste (vízvonal-csíkkal), fedélzet, áramvonalas felépítmény döntött szélvédővel és sötét ablaksávval, flybridge
     keménytetővel és radarívvel, körbefutó rozsdamentes korlát, orrkorlát, tíkfa fürdőplató létrával, ütközőpuffer-sor, antennák, helyzetfények, farzászló, emberek. */
  function makeMotorYacht(o) {
    o = Object.assign({ hull: "#f4f4f0", stripe: "#1f3a6a", people: 3, num: " " }, o); o.boot = o.boot || o.stripe;
    const g = new THREE.Group(), SX = 1.3, SY = 1.35, SZ = 1.3, I = new THREE.Matrix4();
    const hb = new THREE.Group(); hb.scale.set(SX, SY, SZ); g.add(hb);
    const hm = new THREE.MeshPhysicalMaterial({ map: hullTex(o), roughness: .3, metalness: 0, clearcoat: 1, clearcoatRoughness: .08, side: THREE.DoubleSide }); W.disposables.push(hm); hm.map.colorSpace = THREE.SRGBColorSpace;
    mesh(buildHull(o), hm, hb); mesh(buildDeck(0, false), std({ color: "#e3e5e2", map: nonslipTex(), roughness: .9 }), hb);
    const dy = (u) => hullShape(u).sheer * SY + .08, zz = (u) => hullShape(u).z * SZ, hx = (u) => hullShape(u).hb * SX;
    const white = std({ color: o.hull, roughness: .35 }), glass = std({ color: "#101a24", roughness: .06, metalness: .7 }), chrome = std({ color: "#e6eaee", roughness: .15, metalness: 1 }), teak = std({ map: teakTex(), roughness: .7 }), acc = std({ color: o.stripe, roughness: .45 });
    const ext = (pts, w, mat, x0) => { const sp = new THREE.Shape(); pts.forEach(([z, y], i) => (i ? sp.lineTo(z, y) : sp.moveTo(z, y))); sp.closePath(); const eg = new THREE.ExtrudeGeometry(sp, { depth: w, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 2 }); eg.translate(0, 0, -w / 2 + (x0 || 0)); eg.rotateY(-Math.PI / 2); W.disposables.push(eg); return eg; };
    const d0 = dy(.45), wC = hx(.45) * 2 - 1.0;
    /* felépítmény: szalon döntött szélvédővel; ablaksáv; flybridge-perem; keménytető oszlopokon; radarív */
    const cab = mesh(ext([[2.9, 0], [2.9, 1.0], [1.9, 1.32], [-1.2, 1.32], [-2.6, .55], [-3.0, 0]].map(([z, y]) => [-z, y]), wC, white), white, g); cab.position.y = d0;
    const gl = mesh(ext([[2.75, .5], [2.75, .95], [1.85, 1.2], [-1.25, 1.2], [-2.2, .68], [-2.3, .5]].map(([z, y]) => [-z, y]), wC + .08, glass), glass, g); gl.position.y = d0;
    const ws = mesh(ext([[-1.32, 1.3], [-2.55, .62], [-2.5, .58], [-1.28, 1.24]].map(([z, y]) => [-z, y]), wC - .25, glass), glass, g); ws.position.y = d0 + .04;
    const fb = mesh(ext([[2.6, 1.42], [2.6, 1.8], [2.45, 1.8], [2.45, 1.5], [-.6, 1.5], [-.9, 1.85], [-1.05, 1.85], [-.8, 1.42]].map(([z, y]) => [-z, y]), wC - .1, white), white, g); fb.position.y = d0;
    const top = mesh(ext([[2.3, 2.75], [2.3, 2.83], [-.9, 2.83], [-1.2, 2.75]].map(([z, y]) => [-z, y]), wC, acc), acc, g); top.position.y = d0;
    const mt = [];
    [[-1, 2.1], [1, 2.1], [-1, -.4], [1, -.4]].forEach(([sd, z]) => mt.push(rodGeom(new THREE.Vector3(sd * (wC / 2 - .12), d0 + 1.5, -z), new THREE.Vector3(sd * (wC / 2 - .16), d0 + 2.76, -z + .1), .035, 8)));
    { const arch = new THREE.TorusGeometry(wC / 2 - .1, .06, 8, 20, Math.PI); arch.translate(0, d0 + 2.8, 2.0); mt.push([arch, I]); const rad = new THREE.CylinderGeometry(.32, .32, .12, 16); rad.translate(0, d0 + 3.55, 2.0); mt.push([rad, I]);
      mt.push(rodGeom(new THREE.Vector3(.5, d0 + 2.83, 1.6), new THREE.Vector3(.5, d0 + 4.6, 1.75), .012, 5)); mt.push(rodGeom(new THREE.Vector3(-.5, d0 + 2.83, 1.6), new THREE.Vector3(-.5, d0 + 4.1, 1.75), .012, 5)); }
    /* korlát körben + orrkorlát */
    [-1, 1].forEach((sd) => { let prev = null; for (let k = 0; k <= 14; k++) { const u = .06 + k / 14 * .92, p = new THREE.Vector3(sd * (hx(u) - .09), dy(u), zz(u)), t = p.clone(); t.y += .68; mt.push(rodGeom(p, t, .016, 6)); if (prev) { mt.push(rodGeom(prev[1], t, .016, 6)); mt.push(rodGeom(prev[0].clone().setY(prev[0].y + .36), p.clone().setY(p.y + .36), .008, 5)); } prev = [p, t]; } });
    { const s9 = .985; mt.push(rodGeom(new THREE.Vector3(-(hx(s9) - .09), dy(s9) + .68, zz(s9)), new THREE.Vector3(hx(s9) - .09, dy(s9) + .68, zz(s9)), .016, 6)); }
    mesh(mergeGeoms(mt), chrome, g);
    /* fürdőplató, létra, kormányállás, ülések, napozópárna, ütközők */
    const wd = [], wh = [], st = [];
    { const pz = zz(0) - .55, p = new THREE.BoxGeometry(hx(.02) * 2 - .2, .07, 1.1); p.translate(0, .32, pz); wd.push([p, I]);
      const aft = new THREE.BoxGeometry(wC, .05, 1.6); aft.translate(0, dy(.12) + .01, zz(.12)); wd.push([aft, I]);
      [-1, 1].forEach((sd) => st.push(rodGeom(new THREE.Vector3(sd * .25, .34, pz - .5), new THREE.Vector3(sd * .25, -.55, pz - .62), .018, 6))); for (let k = 0; k < 3; k++) st.push(rodGeom(new THREE.Vector3(-.25, .1 - k * .24, pz - .53 - k * .03), new THREE.Vector3(.25, .1 - k * .24, pz - .53 - k * .03), .016, 6));
      const helm = new THREE.BoxGeometry(.9, .5, .4); helm.translate(0, d0 + 1.72, -.45); wh.push([helm, I]); const seat = new THREE.BoxGeometry(1.5, .45, .5); seat.translate(0, d0 + 1.7, .9); wh.push([seat, I]); const pad = new THREE.BoxGeometry(wC - .5, .09, 1.8); pad.translate(0, dy(.8) + .04, zz(.8)); wh.push([pad, I]);
      const bs = new THREE.BoxGeometry(wC - .2, .42, .5); bs.translate(0, dy(.1) + .22, zz(.04) + .1); wh.push([bs, I]);
      const whl = new THREE.TorusGeometry(.2, .025, 6, 16); whl.rotateX(-.5); whl.translate(0, d0 + 2.02, -.2); st.push([whl, I]);
      [-1, 1].forEach((sd) => [.25, .45, .65].forEach((u) => { const fd = new THREE.CapsuleGeometry(.11, .42, 3, 8); fd.translate(sd * (hx(u) + .1), dy(u) - .5, zz(u)); wh.push([fd, I]); st.push(rodGeom(new THREE.Vector3(sd * (hx(u) + .1), dy(u) - .2, zz(u)), new THREE.Vector3(sd * (hx(u) - .09), dy(u) + .3, zz(u)), .008, 4)); })); }
    mesh(mergeGeoms(wd), teak, g); mesh(mergeGeoms(wh), white, g); mesh(mergeGeoms(st), chrome, g);
    /* helyzetfények és farzászló */
    [[-1, "#ff2a2a"], [1, "#22e055"]].forEach(([sd, c]) => { const l = mesh(new THREE.BoxGeometry(.08, .07, .12), basic({ color: c }), g); l.position.set(sd * (wC / 2 + .02), d0 + 1.1, -1.6); l.userData.noBake = true; });
    { const ft = canvasTex(96, 64, (gg) => { gg.fillStyle = "#ce2939"; gg.fillRect(0, 0, 96, 22); gg.fillStyle = "#ffffff"; gg.fillRect(0, 21, 96, 22); gg.fillStyle = "#477050"; gg.fillRect(0, 42, 96, 22); });
      mesh(mergeGeoms([rodGeom(new THREE.Vector3(.6, dy(.03), zz(.02)), new THREE.Vector3(.6, dy(.03) + 1.3, zz(.02) - .35), .014, 5)]), chrome, g);
      const fl = mesh(new THREE.PlaneGeometry(.7, .46, 5, 1), basic({ map: ft, side: THREE.DoubleSide }), g); fl.position.set(.6, dy(.03) + 1.08, zz(.02) - .68); fl.rotation.y = Math.PI / 2; fl.userData.noBake = true; g.userData.flag = fl; }
    /* emberek: a flybridge-en a kormányos, a hátsó fedélzeten nézők (álló/ülő), karral, hajjal, sapkával */
    const SK = ["#e0b08f", "#c98f6b", "#ecc3a3", "#d6a37e"], TS = ["#e5262f", "#1f5fa8", "#ffd166", "#f4f4f0", "#2fa85a", "#ff7a1a"], HR = ["#3a2414", "#15110e", "#c9a55a", "#6b4a2a", "#8a8a8a"];
    const byM = {}; const put = (geo, col) => { (byM[col] || (byM[col] = [])).push([geo, I]); };
    const person = (x, y, z, ry, sit, k) => { const R = (geo) => { geo.rotateY(ry); geo.translate(x, y, z); return geo; }, sk = SK[k % 4], ts = TS[(k + (o.seed || 0)) % 6], hr = HR[(k * 2 + (o.seed || 0)) % 5], hh = sit ? .55 : .95;
      if (sit) { [-1, 1].forEach((sd) => { const th = new THREE.CapsuleGeometry(.075, .3, 3, 6); th.rotateX(Math.PI / 2); th.translate(sd * .09, .5, .2); put(R(th), "#27303c"); const sn = new THREE.CapsuleGeometry(.06, .3, 3, 6); sn.translate(sd * .09, .26, .4); put(R(sn), "#27303c"); }); }
      else [-1, 1].forEach((sd) => { const lg = new THREE.CapsuleGeometry(.075, .68, 3, 6); lg.translate(sd * .09, .45, 0); put(R(lg), "#27303c"); });
      const to = new THREE.CapsuleGeometry(.16, .34, 4, 10); to.scale(1, 1, .75); to.translate(0, hh + .2, 0); put(R(to), ts);
      [-1, 1].forEach((sd) => { const ar = new THREE.CapsuleGeometry(.05, .42, 3, 6); ar.rotateZ(sd * (k % 2 && sd > 0 ? 2.6 : .18)); ar.translate(sd * (k % 2 && sd > 0 ? .3 : .22), hh + (k % 2 && sd > 0 ? .55 : .18), 0); put(R(ar), ts); });
      const nk = new THREE.CylinderGeometry(.05, .055, .08, 8); nk.translate(0, hh + .5, 0); put(R(nk), sk); const hd = new THREE.SphereGeometry(.115, 14, 10); hd.scale(.92, 1.08, 1); hd.translate(0, hh + .64, 0); put(R(hd), sk);
      const hair = new THREE.SphereGeometry(.122, 14, 8, 0, TAU, 0, Math.PI * .55); hair.rotateX(-.3); hair.translate(0, hh + .655, -.012); put(R(hair), k % 3 === 0 ? "#ffffff" : hr);
      const sg = new THREE.BoxGeometry(.16, .035, .02); sg.translate(0, hh + .66, .105); put(R(sg), "#0d0f12"); };
    person(0, d0 + 1.5, .35, Math.PI, false, 0);
    const aftY = dy(.12) + .03; for (let k = 1; k <= o.people; k++) person(-.75 + ((k * 7) % 5) * .38, aftY, zz(.14) + ((k * 3) % 4) * .28 - .3, (k % 2 ? 1 : -1) * Math.PI / 2 + (k * .7 % 1 - .5), k % 3 === 2, k);
    Object.keys(byM).forEach((c) => mesh(mergeGeoms(byM[c]), std({ color: c, roughness: .8 }), g));
    return g;
  }
  function makeCommittee() {
    const g = makeMotorYacht({ hull: "#f5f5f2", stripe: "#123b74", people: 3, seed: 3 });   /* 2026-11-12 10:10: a rendezőhajó is szép motoros jacht (előtte dobozokból állt) */
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
