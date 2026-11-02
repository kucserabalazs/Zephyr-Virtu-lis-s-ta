/* Zephyr – nyitókép: a logó felirata vitorlások vontatják a helyére (2026-11)
   A logó (img/zephyr-logo.png) darabjai: img/zephyr-logo-parts.png (felül a színes darabok, alul a fehér körvonaluk).
   Menet: a ZEPHYR betűit egyenként egy-egy részletesen megrajzolt vitorlás húzza be kötélen (felváltva balról és jobbról),
   a kötél a helyükön leold, a hajó továbbsiklik; közben felhúzzák a logó kék és piros vitorláját; végül a zászlóshajó
   spinnakerrel végigszáguld az alsó soron: az APARTMAN betűi a nyomában bukkannak fel, a nyomvonalából lesz a logó hulláma.
   Ugyanez nyugodt mozgású beállításnál (prefers-reduced-motion) azonnal a kész logót mutatja. Koppintásra a végére ugrik. */
(function heroLogo() {
  "use strict";
  const host = document.getElementById("heroLogo"), cv = document.getElementById("heroLogoFx");
  if (!host || !cv) return;
  const hero = host.closest(".hero"); let g = cv.getContext("2d");
  const P = __PARTS__;
  const LW = 1640, LH = 575;                            /* a logó koordináta-kerete (a darabok körvonallal együtt) */
  const BY = { Z: 420, E: 415, P: 415, H: 415, Y: 415, R: 415 };   /* a betűk alapvonala a logóban (a vízvonal) */
  const AP_BASE = 498, WAVE_Y = 520;
  const piece = {}; P.p.forEach((p) => (piece[p.n] = p));
  /* a tulajdonos kérése: a ZEPHYR (a vitorlajellel együtt) kicsit feljebb, az APARTMAN kicsit lejjebb – ne érjenek össze a betűk */
  const OFF = { red: -18, sail: -18, Z: -18, E: -18, P: -18, H: -18, Y: -18, R: -18, ap_a1: 22, ap_p: 22, ap_a2: 22, ap_r: 22, ap_t: 22, ap_m: 22, ap_a3: 22, ap_n: 22 };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const atlas = new Image(); atlas.decoding = "async"; atlas.src = "img/zephyr-logo-parts.png";
  let W = 0, H = 0, dpr = 1, box = { x: 0, y: 0, s: 1 }, t0 = 0, done = false, raf = 0, started = false, lastT = 0, glintAt = 0;
  const parts = [];    /* foam / spray részecskék */
  /* ------------------------------------------------------------ méretezés: a logó ott áll, ahol a h1 helye van */
  function size() {
    const d = Math.min(2, devicePixelRatio || 1);
    const hr = hero.getBoundingClientRect(), r = host.getBoundingClientRect();
    if (hr.width !== W || hr.height !== H || d !== dpr) { dpr = d; W = hr.width; H = hr.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const s = r.width / LW;
    box = { x: r.left - hr.left, y: r.top - hr.top + (r.height - LH * s) / 2, s };
    placeZam();
    if (done && !sinking) drawFinal();
  }
  /* ------------------------------------------------------------ segédek */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const easeIO = (x) => { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const spring = (x, k = 7, w = 13) => x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(w * x);
  const L2X = (x) => box.x + x * box.s, L2Y = (y) => box.y + y * box.s;
  let rnd = 1234567; const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  function drawPiece(n, dx, dy, opt) {
    const p = piece[n]; if (!p) return;
    opt = opt || {};
    const x = L2X(p.x) + (dx || 0), y = L2Y(p.y + (OFF[n] || 0)) + (dy || 0), w = p.w * box.s, h = p.h * box.s;
    g.save();
    if (opt.alpha != null) g.globalAlpha *= opt.alpha;
    if (opt.rot || opt.sy != null || opt.sx != null) {
      const ox = x + w * (opt.ox != null ? opt.ox : .5), oy = y + h * (opt.oy != null ? opt.oy : 1);
      g.translate(ox, oy); if (opt.rot) g.rotate(opt.rot); if (opt.kx) g.transform(1, 0, opt.kx, 1, 0, 0); g.scale(opt.sx != null ? opt.sx : 1, opt.sy != null ? opt.sy : 1); g.translate(-ox, -oy);
    }
    if (opt.clip) { g.beginPath(); g.rect(opt.clip[0], opt.clip[1], opt.clip[2], opt.clip[3]); g.clip(); }
    if (opt.layer !== "col") g.drawImage(atlas, p.ax, P.oy + p.ay, p.w, p.h, x, y, w, h);
    if (opt.layer !== "out") g.drawImage(atlas, p.ax, p.ay, p.w, p.h, x, y, w, h);
    g.restore();
  }
  /* ------------------------------------------------------------ a vitorlás: oldalnézet, 100 egység hosszú, vízvonal y=0 */
  const NAVY = "#0b2f5e", RED = "#e2483d";
  function sailBoat(o, t) {
    /* o: { x, y (vízvonal, px), s (px / egység), dir (1 jobbra, -1 balra), main, jib, jib2, spin, hull, stripe, num, crew, heel } */
    const s = o.s, dir = o.dir;
    const heel = (o.heel || -.08) + Math.sin(t * 1.7 + o.ph) * .025, pitch = Math.sin(t * 2.6 + o.ph) * .02;
    g.save(); g.translate(o.x, o.y + Math.sin(t * 2.2 + o.ph) * 1.6 * s / 1.4);
    /* tükörkép a vízen (halvány, hullámzó) */
    g.save(); g.scale((o.fx != null ? o.fx : dir) * s, s); g.globalAlpha *= .22; g.scale(1, -.45); g.rotate(-(heel + pitch));
    hull(o, true); g.restore();
    g.scale((o.fx != null ? o.fx : dir) * s, s); g.rotate(heel + pitch);
    /* kötélzet a vitorlák mögött: hátsó merevítő (backstay), oldalmerevítők */
    const mx = 6, top = -132;
    g.lineCap = "round";
    g.strokeStyle = "rgba(30,40,55,.75)"; g.lineWidth = .45;
    line(mx + 1, top + 3, -47, -10.5);
    line(mx, top + 22, mx - 7, -12); line(mx, top + 22, mx + 9, -12);
    /* árboc */
    const mg = g.createLinearGradient(mx - 1.4, 0, mx + 1.4, 0); mg.addColorStop(0, "#9aa3ad"); mg.addColorStop(.5, "#f4f6f8"); mg.addColorStop(1, "#7d8792");
    g.fillStyle = mg; g.beginPath(); g.moveTo(mx - 1.5, -11); g.lineTo(mx - 1, top); g.lineTo(mx + 1, top); g.lineTo(mx + 1.5, -11); g.closePath(); g.fill();
    g.strokeStyle = "#5d6773"; g.lineWidth = .7; line(mx - 7, top + 48, mx + 7, top + 48); line(mx - 5.5, top + 84, mx + 5.5, top + 84);   /* saling */
    /* nagyvitorla */
    const gx = -42, gy = -24, pull = Math.sin(t * 3.1 + o.ph) * 1.2;
    const mainG = g.createLinearGradient(gx, 0, mx, 0);
    mainG.addColorStop(0, shade(o.main, -.18)); mainG.addColorStop(.55, o.main); mainG.addColorStop(1, shade(o.main, .1));
    g.fillStyle = mainG;
    g.beginPath(); g.moveTo(mx - 1, top + 4); g.lineTo(mx - 1, gy + 1);
    g.lineTo(gx + 1, gy + 1);
    g.bezierCurveTo(gx + 10 + pull, gy - 40, mx - 30, top + 40, mx - 4, top + 6);   /* hátsó él (leech) – hasas */
    g.closePath(); g.fill();
    g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = .5; g.stroke();
    /* draft-csíkok és lécek */
    g.save(); g.clip();
    g.strokeStyle = "rgba(11,47,94,.16)"; g.lineWidth = .6;
    for (let k = 1; k < 5; k++) { const yy = gy - (gy - top) * k / 5; g.beginPath(); g.moveTo(mx, yy); g.quadraticCurveTo(mx - 14, yy - 4, gx + 6 + k * 6, yy + 6); g.stroke(); }
    const sh = g.createLinearGradient(gx, gy, mx, top); sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(.6, "rgba(255,255,255,.28)"); sh.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sh; g.fillRect(gx - 5, top, 60, -top);
    g.restore();
    g.strokeStyle = "rgba(20,30,45,.38)"; g.lineWidth = .9;
    for (let k = 1; k < 5; k++) { const f = k / 5, lx = gx + (mx - 4 - gx) * f + 8 * Math.sin(f * Math.PI), ly = gy + (top + 6 - gy) * f; line(lx, ly, lx + 9, ly + 1.5); }
    /* vitorlaszám */
    if (o.num && s > .55) {
      g.save(); g.translate(mx - 17, top + 46); g.scale(dir, 1); g.fillStyle = o.numC || NAVY; g.font = "900 9px 'Big Shoulders Display', Arial Narrow, sans-serif"; g.textAlign = "center";
      g.fillText(o.num, 0, 0); g.restore();
    }
    if (o.emb) { g.save(); g.translate(mx - 16, top + 26); g.fillStyle = RED; g.beginPath(); g.moveTo(-5, 4); g.quadraticCurveTo(0, -6, 4, -9); g.quadraticCurveTo(2, -1, 5, 4); g.closePath(); g.fill(); g.restore(); }
    /* bum */
    g.strokeStyle = "#3b4654"; g.lineWidth = 1.6; line(mx, gy + 1.5, gx - 2, gy + 2.5);
    g.strokeStyle = "rgba(30,40,55,.7)"; g.lineWidth = .4; line(gx + 4, gy + 2.5, -30, -12);   /* nagyvitorla-kötél */
    /* spinnaker vagy orrvitorla (genua) */
    if (o.spin) spinnaker(o, t, mx, top);
    else {
      const jg = g.createLinearGradient(0, -110, 40, -10); jg.addColorStop(0, shade(o.jib, .12)); jg.addColorStop(1, shade(o.jib, -.2));
      g.fillStyle = jg; const fl = Math.sin(t * 4 + o.ph) * .8;
      g.beginPath(); g.moveTo(mx + 2, top + 16); g.lineTo(48, -12.5);
      g.quadraticCurveTo(26, -11 + fl, 4, -15);                                  /* talp */
      g.bezierCurveTo(14 + fl, -55, 4, -90, mx + 2, top + 16);                   /* hátsó él */
      g.closePath(); g.fill(); g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = .5; g.stroke();
      g.save(); g.clip(); const js = g.createLinearGradient(0, 0, 40, 0); js.addColorStop(0, "rgba(255,255,255,0)"); js.addColorStop(.5, "rgba(255,255,255,.22)"); js.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = js; g.fillRect(0, top, 50, -top); g.restore();
      /* árulkodó szalagok */
      g.strokeStyle = "#ffd25a"; g.lineWidth = .7; for (let k = 0; k < 3; k++) { const yy = -40 - k * 22, xx = 30 - k * 7.5; line(xx, yy, xx - 4, yy + Math.sin(t * 9 + k) * 1.2); }
    }
    /* előmerevítő (forestay) */
    g.strokeStyle = "rgba(30,40,55,.8)"; g.lineWidth = .5; line(mx + 1, top + 12, 48.5, -12);
    /* hajótest, fedélzet, legénység */
    hull(o, false);
    /* genuaszkót: a vitorla szarvától a csörlőig */
    if (!o.spin) { g.strokeStyle = "rgba(240,240,240,.85)"; g.lineWidth = .4; g.beginPath(); g.moveTo(4, -15); g.quadraticCurveTo(-8, -12.5, -21, -12.6); g.stroke(); }
    crew(o, t);
    /* árboccsúcs: szélzászló */
    g.save(); g.translate(mx, top); g.fillStyle = RED; g.beginPath(); g.moveTo(0, 0); g.lineTo(-9, -1.5 + Math.sin(t * 11 + o.ph) * 1.4); g.lineTo(-7.5, 2.2); g.lineTo(-9.5, 4.5 + Math.sin(t * 11 + 1 + o.ph) * 1.2); g.lineTo(0, 3); g.fill();
    g.fillStyle = "#f4f6f8"; g.beginPath(); g.arc(0, 0, 1.2, 0, 7); g.fill(); g.restore();
    /* tatzászló: piros-fehér-zöld, lobog */
    g.save(); g.translate(-47, -10.5); g.strokeStyle = "#596370"; g.lineWidth = .6; line(0, 0, -4, -12);
    const fw = (k) => Math.sin(t * 8 + k + o.ph) * 1.1;
    [["#ce2939", 0], ["#ffffff", 2], ["#477050", 4]].forEach(([c, k]) => { g.fillStyle = c; g.beginPath(); g.moveTo(-4, -12 + k); g.quadraticCurveTo(-8, -12 + k + fw(k), -12, -12 + k + fw(k + 1) * .6); g.lineTo(-12, -10 + k + fw(k + 1) * .6); g.quadraticCurveTo(-8, -10 + k + fw(k), -4, -10 + k); g.fill(); });
    g.restore();
    g.restore();
  }
  function line(a, b, c, d) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    const m = f < 0 ? 0 : 255, a = Math.abs(f); r = Math.round(r + (m - r) * a); gg = Math.round(gg + (m - gg) * a); b = Math.round(b + (m - b) * a);
    return `rgb(${r},${gg},${b})`;
  }
  function hull(o, refl) {
    /* hajótest: a farfaltól (x=-48) az orrig (x=50); a vízvonal fölött fehér, kék vízvonalcsík, piros fenékfesték épp kilátszik */
    const hg = g.createLinearGradient(0, -12, 0, 4);
    hg.addColorStop(0, "#ffffff"); hg.addColorStop(.55, o.hull); hg.addColorStop(1, shade(o.hull, -.25));
    g.fillStyle = hg;
    g.beginPath(); g.moveTo(-48, -10); g.quadraticCurveTo(0, -8.8, 50.5, -13.5);
    g.quadraticCurveTo(46, -3, 38, 2.5); g.quadraticCurveTo(0, 5.2, -44, 3.2); g.lineTo(-48, -10); g.closePath(); g.fill();
    if (refl) return;
    g.strokeStyle = "rgba(10,25,45,.35)"; g.lineWidth = .5; g.stroke();
    /* vízvonalcsík és fenékfesték */
    g.save(); g.clip();
    g.fillStyle = o.stripe || NAVY; g.beginPath(); g.moveTo(-50, -.6); g.quadraticCurveTo(0, .8, 52, -1.8); g.lineTo(52, 1); g.quadraticCurveTo(0, 3.2, -50, 1.8); g.fill();
    g.fillStyle = "#b8322b"; g.fillRect(-50, 2, 104, 6);
    /* díszcsík a perem alatt */
    g.fillStyle = o.deco || RED; g.beginPath(); g.moveTo(-48, -7.4); g.quadraticCurveTo(0, -6.4, 50, -10.6); g.lineTo(49.5, -9.4); g.quadraticCurveTo(0, -5.2, -48, -6.3); g.fill();
    g.restore();
    /* hajónév a testen */
    g.save(); g.translate(18, -3.2); g.scale(o.dir, 1); g.fillStyle = NAVY; g.font = "italic 900 4.6px 'Big Shoulders Display', Arial Narrow, sans-serif"; g.textAlign = "center"; g.fillText(o.name || "ZEPHYR", 0, 0); g.restore();
    /* korlát: oszlopok és korlátkötél */
    g.strokeStyle = "rgba(70,80,92,.9)"; g.lineWidth = .35;
    for (let x = -44; x <= 42; x += 9) { const y0 = -9.2 - Math.max(0, (x + 48) / 98) * 4.2 * ((x + 48) / 98); line(x, y0, x, y0 - 4.6); }
    g.beginPath(); for (let x = -44; x <= 44; x += 2) { const y0 = -9.2 - Math.pow((x + 48) / 98, 2) * 4.2 - 4.6; x === -44 ? g.moveTo(x, y0) : g.lineTo(x, y0); } g.stroke();
    /* kabin és ablakai */
    const cg = g.createLinearGradient(0, -17, 0, -9); cg.addColorStop(0, "#ffffff"); cg.addColorStop(1, "#d9dee4");
    g.fillStyle = cg; g.beginPath(); g.moveTo(-18, -9.4); g.lineTo(-15, -15.5); g.quadraticCurveTo(4, -16.8, 20, -14.8); g.lineTo(24, -10.6); g.closePath(); g.fill();
    g.strokeStyle = "rgba(10,25,45,.3)"; g.lineWidth = .4; g.stroke();
    g.fillStyle = "#1c2f45"; [-10, -2, 6, 13].forEach((x, k) => { g.beginPath(); g.ellipse(x, -12.6, k === 3 ? 1.7 : 2.4, .95, 0, 0, 7); g.fill(); });
    g.fillStyle = "rgba(255,255,255,.55)"; [-10, -2, 6].forEach((x) => { g.beginPath(); g.ellipse(x - .6, -13, .8, .3, 0, 0, 7); g.fill(); });
    /* kormány (kormányrúd) a tatnál */
    g.strokeStyle = "#7a5230"; g.lineWidth = .9; line(-46, -9.8, -36, -12.6);
    /* csillanás a hajótest oldalán */
    g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = .7; g.beginPath(); g.moveTo(-44, -5.2); g.quadraticCurveTo(0, -4.4, 46, -8.6); g.stroke();
    /* orr- és farkorlát (pulpit) */
    g.strokeStyle = "rgba(150,160,170,.95)"; g.lineWidth = .55;
    g.beginPath(); g.moveTo(41, -13.1); g.lineTo(42.5, -18.2); g.quadraticCurveTo(46.5, -18.8, 49.4, -15.6); g.stroke();
    g.beginPath(); g.moveTo(-46.5, -10.1); g.lineTo(-46, -15.2); g.quadraticCurveTo(-42, -16, -38.5, -15.6); g.lineTo(-38.8, -11.4); g.stroke();
    /* szélvédő ponyva (sprayhood) a kabin végén */
    g.fillStyle = o.stripe || NAVY; g.globalAlpha *= .92; g.beginPath(); g.moveTo(-18, -9.6); g.quadraticCurveTo(-20.5, -16.5, -13, -16.6); g.lineTo(-11.5, -15.6); g.lineTo(-15, -9.6); g.closePath(); g.fill(); g.globalAlpha /= .92;
    g.fillStyle = "rgba(160,200,230,.8)"; g.fillRect(-16.5, -15.4, 3, 1.6);
    /* csörlők és kötélkikötők */
    g.fillStyle = "#2d3846"; [[-27, -11.9], [-21, -12.3], [8, -13.8]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 1.15, .75, 0, 0, 7); g.fill(); g.fillRect(x - .5, y, 1, 1.1); });
    /* kötélkorlát második szála */
    g.strokeStyle = "rgba(70,80,92,.6)"; g.lineWidth = .3; g.beginPath(); for (let x = -44; x <= 44; x += 2) { const y0 = -9.2 - Math.pow((x + 48) / 98, 2) * 4.2 - 2.4; x === -44 ? g.moveTo(x, y0) : g.lineTo(x, y0); } g.stroke();
  }
  function crew(o, t) {
    /* két-három matróz a szél felőli peremen, mentőmellényben; a kormányos a tatnál */
    const ppl = o.crew || 3;
    for (let k = 0; k < ppl; k++) {
      const x = -38 + k * 10, lean = Math.sin(t * 2 + k + o.ph) * .06;
      g.save(); g.translate(x, -13.8); g.rotate(-.35 + lean);
      g.fillStyle = "#1d2a3a"; g.fillRect(-1.1, 0, 2.2, 4.4);                         /* láb */
      g.fillStyle = k === 0 ? "#f2b233" : RED; g.beginPath(); g.ellipse(0, -2.6, 2.2, 3.4, 0, 0, 7); g.fill();   /* mentőmellény */
      g.fillStyle = "#e9b48c"; g.beginPath(); g.arc(0, -7.6, 1.75, 0, 7); g.fill();     /* fej */
      g.fillStyle = k === 0 ? NAVY : "#f4f6f8"; g.beginPath(); g.arc(0, -8.2, 1.85, Math.PI, 0); g.fill();   /* sapka */
      g.restore();
    }
  }
  function spinnaker(o, t, mx, top) {
    /* hasas, csíkos spinnaker az árboc előtt, a spinakkerrúd végéig */
    const br = Math.sin(t * 2.4 + o.ph) * 2;
    g.save();
    g.beginPath(); g.moveTo(mx + 2, top + 6);
    g.bezierCurveTo(70 + br, top + 18, 86 + br, -46, 52, -18);     /* elülső hasa */
    g.quadraticCurveTo(30, -10, 14, -20);                           /* talp */
    g.bezierCurveTo(34, -60, 28, -100, mx + 2, top + 6);            /* hátsó él */
    g.closePath();
    const sg = g.createRadialGradient(46, -70, 6, 40, -64, 70); sg.addColorStop(0, "#ffffff"); sg.addColorStop(1, "#dfe6ee");
    g.fillStyle = sg; g.fill(); g.save(); g.clip();
    const bands = [[NAVY, top + 20], ["#ffffff", top + 46], [RED, top + 66], ["#ffffff", top + 92], [NAVY, top + 112]];
    bands.forEach(([c, yy], k) => { g.fillStyle = c; g.beginPath(); g.moveTo(-10, yy); g.quadraticCurveTo(50, yy - 18, 110, yy - 4); g.lineTo(110, yy + 18); g.quadraticCurveTo(50, yy + 2, -10, yy + 22); g.fill(); });
    const hl = g.createRadialGradient(56, -84, 2, 56, -84, 46); hl.addColorStop(0, "rgba(255,255,255,.45)"); hl.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = hl; g.fillRect(0, top, 110, -top);
    const sd = g.createLinearGradient(14, 0, 80, 0); sd.addColorStop(0, "rgba(0,0,0,.18)"); sd.addColorStop(.5, "rgba(0,0,0,0)"); sd.addColorStop(1, "rgba(0,0,0,.2)"); g.fillStyle = sd; g.fillRect(0, top, 110, -top);
    g.strokeStyle = "rgba(0,0,0,.1)"; g.lineWidth = .4; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(mx + 2, top + 6); g.quadraticCurveTo(40 + k * 7, -70, 14 + k * 7.5, -16 - k); g.stroke(); }
    g.restore();
    g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = .5; g.stroke();
    g.strokeStyle = "#c4ccd4"; g.lineWidth = 1.1; line(mx + 1, -30, 52, -18);   /* spinakkerrúd */
    g.strokeStyle = "rgba(30,40,55,.7)"; g.lineWidth = .4; line(14, -20, -20, -12);  /* szkót */
    g.restore();
  }
  /* ------------------------------------------------------------ hab, permet, nyomvonal */
  function foam(x, y, n, spread, vx, vy, life, size, col) {
    for (let k = 0; k < n; k++) parts.push({ x: x + (rand() - .5) * spread, y: y + (rand() - .5) * spread * .3, vx: vx + (rand() - .5) * 40, vy: vy - rand() * 60, a: 1, life: life * (.6 + rand() * .6), age: 0, r: size * (.5 + rand()), c: col || "255,255,255", grav: 160 });
  }
  function wake(x, y, len, dir, a, s) {
    /* V-alakú hullámnyom és a hajó alatti „saját víz” – a videó fölött is tengert érzékeltet */
    const wg = g.createLinearGradient(x - dir * len, 0, x + dir * 30 * s, 0);
    wg.addColorStop(0, "rgba(16,74,120,0)"); wg.addColorStop(.6, `rgba(16,74,120,${.34 * a})`); wg.addColorStop(1, "rgba(16,74,120,0)");
    g.fillStyle = wg; g.beginPath();
    const ww = 9 * s, t = performance.now() / 1000;
    g.moveTo(x - dir * len, y + 1);
    for (let k = 0; k <= 24; k++) { const xx = x - dir * len + dir * (len + 30 * s) * k / 24; g.lineTo(xx, y - 1.5 * s + Math.sin(k * 1.3 + t * 5) * 1.1 * s); }
    g.lineTo(x + dir * 30 * s, y + ww); g.lineTo(x - dir * len, y + ww * .4); g.closePath(); g.fill();
    g.strokeStyle = `rgba(255,255,255,${.75 * a})`; g.lineWidth = Math.max(1, 1.4 * s);
    for (let k = 0; k < 3; k++) { g.globalAlpha = (1 - k * .3); g.beginPath(); g.moveTo(x - dir * 44 * s, y + k * 2 * s); g.quadraticCurveTo(x - dir * (len * .5), y + (3 + k * 4) * s, x - dir * len * (.7 + k * .1), y + (1 + k * 5) * s); g.stroke(); }
    g.globalAlpha = 1;
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i]; q.age += dt; if (q.age > q.life) { parts.splice(i, 1); continue; }
      q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      g.fillStyle = `rgba(${q.c},${(1 - q.age / q.life) * .9})`; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill();
    }
  }
  /* ------------------------------------------------------------ forgatókönyv (a tulajdonos leírása szerint, 2026-11-02)
     1. Egy vitorlás kötélen, vízen vontatja be a ZEPHYR feliratot; odaérve behúzza a kötelet, megfordul, és a felirat mögött
        visszafelé távozik.  2. Közben egy másik (kicsit más) hajó a másik oldalról ugyanígy behozza az APARTMAN feliratot.
     3. Helikopter kötélen lógatva behozza a Zephyr vitorlajelet, a helyére teszi, majd elrepül (a logó hullámjele nincs).
     4. A „Zamárdi” felirat kiemelkedik a vízből.  5. Piros repülőgép behúzza az „Isten hozott!” molinót, és otthagyja. */
  const ZW = ["Z", "E", "P", "H", "Y", "R"], AW = ["ap_a1", "ap_p", "ap_a2", "ap_r", "ap_t", "ap_m", "ap_a3", "ap_n"], MK = ["red", "sail"];
  const ALL = MK.concat(ZW, AW);
  function groupBox(ns) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; ns.forEach((n) => { const p = piece[n]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + p.w); y1 = Math.max(y1, p.y + p.h); }); return { x0, y0, x1, y1 }; }
  const GZ = groupBox(ZW), GA = groupBox(AW), GM = groupBox(MK);
  const T = {
    z0: .2, zArr: 2.9, zReel: .7, zTurn: .8, zOut: 2.2,          /* ZEPHYR: balról */
    a0: 2.0, aArr: 2.6, aReel: .7, aTurn: .8, aOut: 2.2,         /* APARTMAN: jobbról */
    h0: 5.4, hIn: 2.7, hHov: .7, hDesc: 1.3, hAdj: 1.3, hSet: .6, hRel: .6, hOut: 2.1,   /* helikopter: lassabb, körülményes letétel */
    p0: 12.6,                                                    /* Zamárdi a vízből */
    f0: 15.0, fDur: 3.3,                                         /* repülőgép + molinó */
  };
  /* ünnepélyes tempó (a tulajdonos kérése: az egész kb. 1 perc): minden időtartam 3-szoros */
  Object.keys(T).forEach((k) => (T[k] *= 3.0));
  T.END = T.f0 + T.fDur + 2.4;
  function boatScale() { return clamp(box.s * 1.3, .44, 1.8); }    /* a hajók valamivel nagyobbak a betűknél */
  /* a vízcsík a felirat alatt – „mintha vízen vontatnák” */
  function water(y, x0, x1, a, t, s) {
    if (a <= 0) return;
    const fade = 70 * s;
    g.save(); g.globalAlpha = a;
    const lg = g.createLinearGradient(x0 - fade, 0, x1 + fade, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(fade / (x1 - x0 + 2 * fade), "rgba(255,255,255,1)"); lg.addColorStop(1 - fade / (x1 - x0 + 2 * fade), "rgba(255,255,255,1)"); lg.addColorStop(1, "rgba(255,255,255,0)");
    const bodyG = g.createLinearGradient(0, y - 4 * s, 0, y + 26 * s);
    bodyG.addColorStop(0, "rgba(42,134,173,.55)"); bodyG.addColorStop(.35, "rgba(16,74,120,.42)"); bodyG.addColorStop(1, "rgba(11,47,94,0)");
    /* a vízfelszín hullámos széle */
    const path = new Path2D(); path.moveTo(x0 - fade, y + 30 * s);
    for (let x = x0 - fade; x <= x1 + fade; x += 6) path.lineTo(x, y + Math.sin(x * .045 / s + t * 2.2) * 1.6 * s + Math.sin(x * .013 / s - t * 1.3) * 1.2 * s);
    path.lineTo(x1 + fade, y + 30 * s); path.closePath();
    /* maszk: két szélén elhalványul */
    const off = water.c || (water.c = document.createElement("canvas")); off.width = cv.width; off.height = cv.height;
    const o = off.getContext("2d"); o.setTransform(dpr, 0, 0, dpr, 0, 0); o.clearRect(0, 0, W, H);
    o.fillStyle = bodyG; o.fill(path);
    o.save(); o.clip(path); o.strokeStyle = "rgba(255,255,255,.55)"; o.lineWidth = Math.max(.8, s);
    for (let k = 0; k < 3; k++) { o.beginPath(); for (let x = x0 - fade; x <= x1 + fade; x += 8) { const yy = y + (6 + k * 7) * s + Math.sin(x * .03 / s + t * (1.6 + k * .4) + k) * 1.4 * s; x === x0 - fade ? o.moveTo(x, yy) : o.lineTo(x, yy); } o.globalAlpha = .5 - k * .14; o.stroke(); }
    o.restore(); o.globalAlpha = 1;
    o.beginPath(); for (let x = x0 - fade; x <= x1 + fade; x += 6) { const yy = y + Math.sin(x * .045 / s + t * 2.2) * 1.6 * s + Math.sin(x * .013 / s - t * 1.3) * 1.2 * s; x === x0 - fade ? o.moveTo(x, yy) : o.lineTo(x, yy); }
    o.strokeStyle = "rgba(255,255,255,.85)"; o.lineWidth = Math.max(1, 1.3 * s); o.stroke();
    o.globalCompositeOperation = "destination-in"; o.fillStyle = lg; o.fillRect(x0 - fade, y - 20 * s, x1 - x0 + 2 * fade, 60 * s); o.globalCompositeOperation = "source-over";
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(off, 0, 0); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.restore();
  }
  /* egy vontatás: a hajó behozza a feliratot, behúzza a kötelet, megfordul, mögötte visszafelé kifut */
  const TOWST = {};
  /* a kajakos–rendőrös jelenet sávja: az APARTMAN és a Zamárdi alatti üres rész (ott semmi sem takarja) */
  function laneY() {
    const el = hero.querySelector(".place"), hr = hero.getBoundingClientRect();
    const zb = el ? el.getBoundingClientRect().bottom - hr.top : L2Y(600);
    const he = hero.querySelector(".hello"), ht = he ? he.getBoundingClientRect().top - hr.top : zb + 120;
    return Math.max(zb + 34, Math.min(zb + 60, ht - 24));
  }
  function tow(o, t, bs, pcs, back) {
    const { names, gb, dir, base, start, arr, reel, turn, out, look } = o, yo = OFF[names[0]] || 0;
    const lt = t - start; if (lt < 0) return;
    const wordW = (gb.x1 - gb.x0) * box.s, rope = 100 * bs;   /* hosszabb vontatókötél */
    const wl = L2Y(base) + 1.5 * bs;
    /* a felirat elülső vége (a hajó felőli széle) a végső helyén */
    const frontX = dir > 0 ? L2X(gb.x1) - 6 * box.s : L2X(gb.x0) + 6 * box.s;
    const KS = 1.6, KG = 225;   /* kajak méretaránya és a két kajak közti távolság (középtől középig, hajóegységben) */
    let arriveX = frontX + dir * (rope + (look.kayak ? 40 * bs * KS + KG * bs : 46 * bs));                           /* a hajó itt áll meg (keskeny kijelzőn a képen belül) */
    arriveX = dir > 0 ? Math.min(arriveX, W - 40 * bs) : Math.max(arriveX, 40 * bs);
    const startX = dir > 0 ? -(wordW + rope + 80 * bs) : W + wordW + rope + 80 * bs;
    let bx, wdx = 0, phase, fx = dir, by = wl, sc = 1, reelK = 0;
    /* életszerű vontatás: a kötél csak húzni tud. Induláskor laza (a hajó előbb elindul, a kötél megfeszül, a felirat megrándul),
       útközben feszes, a hajó lassításakor a felirat a lendületével utoléri – a kötél belóg –, majd a víz fékezi és megáll a helyén. */
    const stern = look.kayak ? 40 : 46, Ld = rope + stern * bs, kGap = KG * bs;   /* kajakok közti kötél */
    const st = TOWST[names[0]] || (TOWST[names[0]] = { xw: null, vw: 0, xr: null, vr: 0, last: lt, jerk: 0 });   /* a vontatás állapota képkockáról képkockára megmarad */
    const dtS = clamp(lt - st.last, 0, .05); st.last = lt;
    const Bx = (tau) => startX + (arriveX - startX) * (.5 - .5 * Math.cos(Math.PI * clamp(tau / arr, 0, 1)));
    const boatX = Bx(lt), boatV = (Bx(lt) - Bx(lt - .02)) / .02;
    /* lánc: (elülső hajó/kajak) → [hátsó kajak] → felirat */
    const follow = (lead, leadV, x, v, L, slack0) => {
      if (x == null) return [lead - dir * L * slack0, 0];
      let nx = x + v * dtS, nv = v * Math.exp(-.9 * dtS);                     /* sodródás, a víz fékez */
      if (dir * (lead - nx) > L) { nx = lead - dir * L; if (dir * (leadV - nv) > 20) st.jerk = 1; nv = leadV; }   /* a kötél megfeszül: húz */
      return [nx, nv];
    };
    let lead = boatX, leadV = boatV;
    if (lt < arr) {   /* csak amíg a vontatás tart: utána a kötél már nem húz */
      if (look.kayak) { [st.xr, st.vr] = follow(lead, leadV, st.xr, st.vr, kGap, .8); lead = st.xr; leadV = st.vr; }
      [st.xw, st.vw] = follow(lead - dir * stern * bs * (look.kayak ? KS : 1), leadV, st.xw, st.vw, rope, .72);
    } else if (look.kayak && st.xr != null) {   /* a hátsó kajak kisiklik, megáll a vezető kajak mögött */
      const rest = arriveX - dir * kGap; st.vr *= Math.exp(-1.5 * dtS); st.xr += st.vr * dtS; st.xr += (rest - st.xr) * Math.min(1, dtS * 1.5);
    }
    st.jerk *= Math.exp(-6 * dtS);
    const target = frontX;
    if (lt >= arr) { const r = lt - arr; st.xw += (target - st.xw) * Math.min(1, dtS * (1.2 + r)); st.vw *= Math.exp(-2 * dtS); }   /* a felirat beáll a helyére */
    wdx = st.xw - target;
    if (lt < arr + .6 || Math.abs(wdx) > 1) phase = lt < arr ? "tow" : "stop";
    bx = boatX; if (lt >= arr) bx = arriveX;
    if (lt >= arr) {
      const r = lt - arr; phase = "stop";
      if (r < reel) { reelK = ease(clamp((r - .4) / (reel - .4), 0, 1)); }
      else if (r < reel + turn) {                                            /* fordulás: oldalt fordul, hátrébb (a felirat mögé) kerül */
        reelK = 1; phase = "turn"; const k = easeIO((r - reel) / turn);
        fx = dir * Math.cos(k * Math.PI); by = look.kayak ? wl + k * (laneY() - wl) : wl - k * 34 * box.s; sc = look.kayak ? 1 : 1 - .18 * k; bx = arriveX + dir * Math.sin(k * Math.PI) * 18 * bs;
      } else {
        reelK = 1; phase = "back"; const k = Math.min(1, (r - reel - turn) / (look.kayak ? out * 1.9 : out));
        fx = -dir; by = look.kayak ? laneY() : wl - 34 * box.s; sc = look.kayak ? 1 : .82;
        if (look.kayak) {
          /* a kajakosok visszafelé indulnak; középen szembejön a vízirendőrség, megállnak, megfordulnak, és visszafelé menekülnek */
          const meetX = W * .56, c0 = arriveX - dir * kGap * sc / 2;
          let cx;
          if (k < .4) { const q = easeIO(k / .4); cx = c0 + (meetX - c0) * q; }
          else if (k < .56) { const q = easeIO((k - .4) / .16); cx = meetX - dir * 6 * bs * Math.sin(q * Math.PI); fx = -dir * Math.cos(q * Math.PI); }
          else { const q = (k - .56) / .44; cx = meetX + (dir > 0 ? W + 220 * bs - meetX : -220 * bs - meetX) * q * q * (1.4 - .4 * q); fx = dir; }
          st.kc = cx; st.kk = k; bx = cx; if (k >= 1) bx = null;
        } else {
        const endX = dir > 0 ? -160 * bs : W + 160 * bs;
        bx = arriveX + (endX - arriveX) * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
        if (k >= 1) bx = null;
        }
      }
    }
    const wordIn = 1;
    /* víz a felirat alatt: a vontatás alatt a felirattal együtt mozog, utána lassan elcsendesedik */
    const wa = phase === "tow" || phase === "stop" ? .9 : phase === "turn" ? .8 : Math.max(0, .8 - (lt - arr - reel - turn) * .4);
    const wx0 = Math.min(L2X(gb.x0) + wdx, bx != null ? bx - 80 * bs : 1e9, look.kayak && st.xr != null && phase === "tow" ? st.xr - 60 * bs : 1e9);
    const wx1 = Math.max(L2X(gb.x1) + wdx, bx != null ? bx + 80 * bs : -1e9, look.kayak && st.xr != null && phase === "tow" ? st.xr + 60 * bs : -1e9);
    back.push(() => water(wl + 2 * bs, phase === "back" ? L2X(gb.x0) : wx0, phase === "back" ? L2X(gb.x1) : wx1, wa, t, bs));
    const moving = Math.abs(st.vw) > 15;
    if (moving && rand() < .8) foam(target + wdx, wl, 1, 6 * bs, dir * 25, -35, .55, 1.2 * bs);         /* hab a felirat orránál */
    if (moving && rand() < .5) foam(L2X(dir > 0 ? gb.x0 : gb.x1) + wdx, wl, 1, 4 * bs, -dir * 15, -15, .7, 1 * bs);   /* és a sodrában */
    const rope2 = (sx, sy, ex, ey, L, k) => {                                  /* kötél: a valós hosszból számolt belógással */
      const d = Math.hypot(ex - sx, ey - sy), sag = Math.sqrt(Math.max(0, L * L - d * d)) * .55 + 2 * bs;
      g.save(); g.lineCap = "round";
      g.strokeStyle = "rgba(232,200,130,.95)"; g.lineWidth = Math.max(1.6, 2 * bs); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 2;
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo((sx + ex) / 2, Math.max(sy, ey) + sag, ex, ey); g.stroke();
      g.shadowBlur = 0; g.strokeStyle = "rgba(120,84,36,.75)"; g.lineWidth = Math.max(.8, bs); g.setLineDash([2.2 * bs, 2.2 * bs]); g.stroke(); g.setLineDash([]);
      if (k) { g.fillStyle = "#c9a25a"; g.beginPath(); g.arc(ex, ey, Math.max(2, 2.4 * bs), 0, 7); g.fill(); }
      /* ahol a kötél a vízbe ér, ott fodroz */
      if (sag > 10 * bs && rand() < .3) foam((sx + ex) / 2, wl, 1, 6 * bs, 0, -10, .4, .9 * bs);
      g.restore();
    };
    if (bx != null) {
      if (phase === "tow" && rand() < .7) foam(bx + dir * 48 * bs * sc, by - 2 * bs, 1, 5 * bs, dir * 50, -30, .55, 1.3 * bs);
      back.push(() => {
        if (phase !== "back") wake(bx - dir * 30 * bs, by, 110 * bs, dir, phase === "tow" ? 1 : .4, bs);
        else wake(bx + dir * 30 * bs * sc, by, 90 * bs * sc, -dir, .7, bs * sc);
        if (look.kayak) {
          /* két kajak szépen egymás mögött; a hátsó a vontatásnál kötélen követi az elsőt, utána mögötte evez */
          const ks = bs * sc * KS, fast = phase === "back";
          if (phase === "back") {   /* két kajak egymás mögött; a menetirány szerinti első vezet */
            const sgn = fx >= 0 ? 1 : -1, half = kGap * sc / 2, flee = st.kk > .56;
            kayak(bx - sgn * half, by + .5 * bs, ks, fx, t, "#f2b233", "#e2483d", 1.3, flee);
            kayak(bx + sgn * half, by, ks, fx, t, "#e85d2a", "#f2b233", 0, flee);
          } else {
          const xr = phase === "tow" || phase === "stop" ? st.xr : bx - fx * kGap * sc * (phase === "turn" ? Math.abs(fx) : 1);
          kayak(xr, by + .5 * bs, ks, phase === "turn" ? fx : dir, t, "#f2b233", "#e2483d", 1.3, fast);
          kayak(bx, by, ks, fx, t, "#e85d2a", "#f2b233", 0, fast);
          }
          if (phase === "tow" || phase === "stop") rope2(bx - dir * stern * ks, wl - 3 * bs, st.xr + dir * 50 * ks, wl - 3 * bs, kGap - (stern + 50) * ks + 8 * bs, false);
        } else sailBoat(Object.assign({ x: bx, y: by, s: bs * sc, dir: fx >= 0 ? 1 : -1, fx }, look), t);
        /* vontatókötél a felirathoz; behúzáskor a vége a hajóhoz fut */
        if (reelK < 1) {
          const sxx = (look.kayak ? st.xr - dir * stern * bs * KS : bx - dir * stern * bs), sy = wl - (look.kayak ? 3 : 7) * bs;
          const ex0 = target + wdx, ey0 = L2Y((gb.y0 + gb.y1) / 2 + 30 + yo) + st.jerk * 3 * bs;
          rope2(sxx, sy, ex0 + (sxx - ex0) * reelK, ey0 + (sy - ey0) * reelK, rope * (1 - reelK * .9), reelK === 0);
        }
      });
    }
    if (look.kayak && phase === "back" && st.kk > .12) {
      /* a vízirendőrség a kajakosok menetirányából, szemből érkezik; középen megáll előttük, majd a menekülők után megy */
      const k = st.kk, chaseDir = dir, pyy = laneY() + 4 * bs, meetX = W * .56, stopX = meetX - dir * 190 * bs;
      const enterX = dir < 0 ? W + 240 * bs : -240 * bs, exitX = dir < 0 ? -300 * bs : W + 300 * bs;
      let pxx, pdir = dir;
      if (k < .42) { const q = 1 - Math.pow(1 - (k - .12) / .3, 2.2); pxx = enterX + (stopX - enterX) * q; }
      else if (k < .6) pxx = stopX + dir * 4 * bs * Math.sin((k - .42) * 30) * (.6 - k);
      else { const q = (k - .6) / .4; pxx = stopX + (exitX - stopX) * q * q * (1.3 - .3 * q); pdir = -dir; }
      const facing = k < .6 ? dir : -dir;   /* odafelé szembe, utána a menekülők után */
      const pd = dir;   /* szembejön, majd ugyanarra üldözi őket: végig ebbe az irányba halad */
      back.push(() => { if (!(k > .42 && k < .6)) wake(pxx - pd * 50 * bs, pyy, 200 * bs, pd, .9, bs * 1.3); police(pxx, pyy, bs * 1.45, pd, t); });
      if (!(k > .42 && k < .6) && rand() < .6) foam(pxx + pd * 40 * bs, pyy - 1 * bs, 1, 5 * bs, pd * 80, -50, .5, 1.5 * bs);
    }
    names.forEach((n) => pcs.push([n, wdx, (Math.sin(t * 3 + base) * 1.2 * (Math.abs(st.vw) > 15 ? 1 : 0) - st.jerk * 3) * bs, { alpha: wordIn, rot: -dir * st.jerk * .015 }]));
  }
  /* ------------------------------------------------------------ két kajakos (oldalnézet, 100 egység hosszú kajak, vízvonal y=0) */
  function kayak(x, y, s, fx, t, col, deck, ph, fast) {
    g.save(); g.translate(x, y + Math.sin(t * 3 + ph) * .8 * s); g.scale(fx * s, s); g.rotate(Math.sin(t * 2.4 + ph) * .015);
    g.lineJoin = "round"; g.lineCap = "round";
    /* tükörkép */
    g.save(); g.globalAlpha *= .2; g.scale(1, -.5); g.fillStyle = col; g.beginPath(); g.moveTo(-50, 0); g.quadraticCurveTo(0, 7, 50, 0); g.quadraticCurveTo(0, -3, -50, 0); g.fill(); g.restore();
    /* hajótest */
    const hg = g.createLinearGradient(0, -6, 0, 3); hg.addColorStop(0, shade(col, .35)); hg.addColorStop(.5, col); hg.addColorStop(1, shade(col, -.3));
    g.fillStyle = hg; g.beginPath(); g.moveTo(-50, -2.6); g.quadraticCurveTo(-20, -6.2, 8, -6.4); g.quadraticCurveTo(34, -6, 51, -3.4); g.quadraticCurveTo(40, 1.6, 20, 2.4); g.lineTo(-30, 2.4); g.quadraticCurveTo(-46, 1.6, -50, -2.6); g.closePath(); g.fill();
    g.strokeStyle = "rgba(0,0,0,.3)"; g.lineWidth = .4; g.stroke();
    g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = .5; g.beginPath(); g.moveTo(-46, -3.2); g.quadraticCurveTo(0, -6, 48, -3.8); g.stroke();
    /* fedélzeti gumikötelek, kormánylapát */
    g.strokeStyle = "rgba(25,25,25,.7)"; g.lineWidth = .3; for (let k = 0; k < 4; k++) { line(18 + k * 5, -6.2, 21 + k * 5, -5.2); line(21 + k * 5, -6.2, 18 + k * 5, -5.2); }
    g.fillStyle = "#2d3846"; g.fillRect(-51.5, -2, 1.2, 4);
    /* ülésnyílás pereme + kötényszoknya */
    g.fillStyle = "#1d2a3a"; g.beginPath(); g.ellipse(-4, -6.4, 7, 1.1, 0, 0, 7); g.fill();
    /* evezős: törzs mentőmellényben, sapkával; a test az evezéssel együtt fordul */
    const st = t * (fast ? 7 : 4.2) + ph, sw = Math.sin(st);
    g.save(); g.translate(-4, -7); g.rotate(-.12 + sw * .08);
    g.fillStyle = deck; g.beginPath(); g.ellipse(0, -5, 3.2, 5.2, 0, 0, 7); g.fill();          /* mellény */
    g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(-2.6, -6, 5.2, .7);                     /* fényvisszaverő csík */
    g.fillStyle = "#e9b48c"; g.beginPath(); g.arc(.4, -12.3, 2.5, 0, 7); g.fill();          /* fej */
    g.fillStyle = "#f4f6f8"; g.beginPath(); g.arc(.4, -13.1, 2.6, Math.PI, 0); g.fill(); g.fillRect(.4, -13.4, 4, .9);   /* baseballsapka */
    /* kettős lapátú evező: a tengely a vállnál forog, a lapátok felváltva merülnek */
    const a = sw * .95;
    g.save(); g.translate(0, -7.5); g.rotate(a);
    g.strokeStyle = "#e9b48c"; g.lineWidth = 1.3; line(0, 0, -4, 1.4); line(0, 0, 4, -1.4);   /* karok */
    g.strokeStyle = "#2b2b2b"; g.lineWidth = .9; line(-21, 0, 21, 0);
    g.fillStyle = "#f2b233"; g.beginPath(); g.ellipse(-22.5, 0, 3.2, 1.3, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(22.5, 0, 3.2, 1.3, 0, 0, 7); g.fill();
    g.restore();
    g.restore();
    g.restore();
    /* ahol a lapát vízbe ér: fröccs */
    if (Math.abs(sw) > .93 && rand() < .5) { const side = sw > 0 ? 1 : -1; foam(x + fx * s * (-4 + side * 22 * Math.cos(.95)), y, 3, 4 * s, -fx * 40, -60, .45, 1.1 * s, "240,248,255"); }
  }
  function kayaks(x, y, s, fx, t, phase, dir) {
    const ks = s * 1.25, fast = phase === "back";
    kayak(x - fx * 12 * ks, y - 6 * s, ks * .92, fx, t, "#f2b233", "#e2483d", 1.3, fast);   /* hátsó (távolabbi) kajak: sárga */
    kayak(x, y, ks, fx, t, "#e85d2a", "#f2b233", 0, fast);                                  /* elülső: narancs */
  }
  /* ------------------------------------------------------------ vízirendőrség motorcsónakja (oldalnézet, 100 egység) */
  function police(x, y, s, dir, t) {
    g.save(); g.translate(x, y + Math.sin(t * 5) * .8 * s); g.scale(dir * s, s); g.rotate(-.05 + Math.sin(t * 6) * .012);   /* siklás: orr fel */
    g.lineJoin = "round"; g.lineCap = "round";
    /* hajótest: fehér, kék-sárga csíkkal */
    const hg = g.createLinearGradient(0, -14, 0, 3); hg.addColorStop(0, "#ffffff"); hg.addColorStop(.7, "#e6ebf1"); hg.addColorStop(1, "#9aa6b2");
    g.fillStyle = hg; g.beginPath(); g.moveTo(-48, -12); g.lineTo(30, -13); g.quadraticCurveTo(46, -13.5, 52, -9); g.quadraticCurveTo(46, 0, 30, 2.5); g.lineTo(-48, 2); g.closePath(); g.fill();
    g.strokeStyle = "rgba(10,25,45,.35)"; g.lineWidth = .5; g.stroke();
    g.save(); g.clip();
    g.fillStyle = "#1f4fa0"; g.beginPath(); g.moveTo(-50, -5.5); g.lineTo(50, -7.5); g.lineTo(50, -3.5); g.lineTo(-50, -1.5); g.fill();
    g.fillStyle = "#f2c200"; g.beginPath(); g.moveTo(-50, -7.3); g.lineTo(50, -9.3); g.lineTo(50, -7.5); g.lineTo(-50, -5.5); g.fill();
    g.fillStyle = "#1d2a3a"; g.fillRect(-50, 0, 102, 4);
    g.restore();
    g.save(); g.scale(dir, 1); g.fillStyle = "#ffffff"; g.font = "900 4.6px 'Big Shoulders Display', Arial Narrow, sans-serif"; g.textAlign = "center"; g.fillText("RENDŐRSÉG", dir * 2, -3.3); g.restore();
    /* korlát, kabin szélvédővel, rendőr */
    g.strokeStyle = "rgba(150,160,170,.95)"; g.lineWidth = .5; g.beginPath(); g.moveTo(-46, -12.5); g.lineTo(-46, -17); g.lineTo(-30, -17.5); g.stroke(); line(-38, -12.5, -38, -17.2);
    const cg = g.createLinearGradient(0, -26, 0, -13); cg.addColorStop(0, "#ffffff"); cg.addColorStop(1, "#d6dde5");
    g.fillStyle = cg; g.beginPath(); g.moveTo(-20, -13); g.lineTo(-18, -25); g.lineTo(6, -25); g.lineTo(18, -13.4); g.closePath(); g.fill(); g.strokeStyle = "rgba(10,25,45,.3)"; g.stroke();
    const wg = g.createLinearGradient(0, -24, 14, -14); wg.addColorStop(0, "#9fd3f2"); wg.addColorStop(1, "#24527a");
    g.fillStyle = wg; g.beginPath(); g.moveTo(5, -24); g.lineTo(15.5, -14.5); g.lineTo(4, -14.5); g.closePath(); g.fill();
    g.fillStyle = "#24527a"; g.fillRect(-15, -22, 15, 5.5); g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(-14, -21.6, 6, 1.2);
    g.fillStyle = "#e9b48c"; g.beginPath(); g.arc(-6, -19.8, 2.2, 0, 7); g.fill(); g.fillStyle = "#1f2d44"; g.beginPath(); g.arc(-6, -20.6, 2.4, Math.PI, 0); g.fill(); g.fillRect(-6, -20.9, 3.4, .8);   /* rendőr sapkában */
    /* fénysor a tetőn: villogó kék fények, ragyogással */
    g.fillStyle = "#3b4654"; g.fillRect(-12, -27.2, 16, 2.2);
    const on = Math.floor(t * 6) % 2;
    [[-9, on], [1, 1 - on]].forEach(([lx, v]) => {
      g.fillStyle = v ? "#4fc3ff" : "#1a3f8a"; g.fillRect(lx - 2.5, -28.6, 5, 2.2);
      if (v) { const gl = g.createRadialGradient(lx, -27.5, 0, lx, -27.5, 16); gl.addColorStop(0, "rgba(80,190,255,.85)"); gl.addColorStop(1, "rgba(80,190,255,0)"); g.fillStyle = gl; g.beginPath(); g.arc(lx, -27.5, 16, 0, 7); g.fill(); }
    });
    /* antenna, zászló, motor */
    g.strokeStyle = "#3b4654"; g.lineWidth = .5; line(-16, -25, -19, -36);
    [["#ce2939", 0], ["#ffffff", 1.4], ["#477050", 2.8]].forEach(([c, k]) => { g.fillStyle = c; g.fillRect(-56 + Math.sin(t * 9) * .4, -19 + k, 6, 1.4); }); g.strokeStyle = "#596370"; g.lineWidth = .5; line(-50, -12, -50, -19.5);
    g.fillStyle = "#2d3846"; g.beginPath(); g.moveTo(-48, -14); g.lineTo(-55, -14); g.lineTo(-56, -6); g.lineTo(-53, 1); g.lineTo(-50, 1); g.lineTo(-49, -8); g.closePath(); g.fill();
    g.restore();
  }
  /* ------------------------------------------------------------ helikopter (oldalnézet, 100 egység; dir=-1: balra néz) */
  function heli(x, y, s, t, dir, tilt) {
    g.save(); g.translate(x, y); g.scale(dir * s, s); g.rotate(tilt);
    g.lineJoin = "round"; g.lineCap = "round";
    /* farokgerenda (kúpos), díszcsíkkal és szegecssorral */
    const tb = g.createLinearGradient(0, -11, 0, 4); tb.addColorStop(0, "#ffffff"); tb.addColorStop(1, "#c3ccd6");
    g.fillStyle = tb; g.beginPath(); g.moveTo(-24, -12); g.lineTo(-88, -8.2); g.lineTo(-88, -3.6); g.lineTo(-24, 5); g.closePath(); g.fill();
    g.strokeStyle = "rgba(20,30,45,.3)"; g.lineWidth = .5; g.stroke();
    g.fillStyle = RED; g.beginPath(); g.moveTo(-34, -7.2); g.lineTo(-88, -6.7); g.lineTo(-88, -5.2); g.lineTo(-34, -3.4); g.fill();
    g.fillStyle = "rgba(60,70,80,.45)"; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(-36 - k * 5.6, -1.2 + k * .35, .35, 0, 7); g.fill(); }
    /* vízszintes vezérsík véglapokkal */
    g.fillStyle = "#9aa6b2"; g.beginPath(); g.moveTo(-70, -3); g.lineTo(-80, -3.6); g.lineTo(-80, -1.6); g.lineTo(-70, -1.2); g.fill();
    g.fillStyle = NAVY; g.fillRect(-81, -6, 1.6, 6.5);
    /* függőleges vezérsík, farokrotor-hajtómű */
    const fin = g.createLinearGradient(-98, -30, -84, -4); fin.addColorStop(0, "#1a4a85"); fin.addColorStop(1, NAVY);
    g.fillStyle = fin; g.beginPath(); g.moveTo(-82, -8); g.lineTo(-93, -28); g.quadraticCurveTo(-96.5, -29.5, -99, -27); g.lineTo(-93, -4); g.closePath(); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(-89, -18); g.lineTo(-96, -18.5); g.lineTo(-96.8, -15.8); g.lineTo(-88, -15.4); g.fill();
    g.fillStyle = "#3b4654"; g.beginPath(); g.arc(-94, -13, 2.1, 0, 7); g.fill();
    /* farokrotor: elmosódott tárcsa + két villanó lap */
    g.save(); g.translate(-94, -13);
    const tr = g.createRadialGradient(0, 0, 1, 0, 0, 11); tr.addColorStop(0, "rgba(210,218,226,.15)"); tr.addColorStop(.8, "rgba(210,218,226,.4)"); tr.addColorStop(1, "rgba(210,218,226,0)");
    g.fillStyle = tr; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill();
    g.rotate(t * 55); g.strokeStyle = "rgba(35,45,58,.85)"; g.lineWidth = 1.4; line(-10.5, 0, 10.5, 0);
    g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = .6; line(9, 0, 10.5, 0); line(-9, 0, -10.5, 0);
    g.restore();
    /* hajtómű-burkolat a törzs tetején, szellőzőrácsok, kipufogó + forró gáz */
    const cw = g.createLinearGradient(0, -30, 0, -18); cw.addColorStop(0, "#f4f6f8"); cw.addColorStop(1, "#c8d0d8");
    g.fillStyle = cw; g.beginPath(); g.moveTo(-22, -16); g.quadraticCurveTo(-18, -26, -4, -27); g.lineTo(14, -26); g.quadraticCurveTo(20, -24, 20, -18); g.closePath(); g.fill();
    g.strokeStyle = "rgba(20,30,45,.3)"; g.lineWidth = .5; g.stroke();
    g.strokeStyle = "rgba(40,50,62,.55)"; g.lineWidth = .5; for (let k = 0; k < 5; k++) line(-12 + k * 2.2, -24, -13 + k * 2.2, -20);
    g.fillStyle = "#4a535e"; g.beginPath(); g.ellipse(-22, -19, 2.4, 1.8, 0, 0, 7); g.fill();
    for (let k = 0; k < 3; k++) { const ph = (t * 1.4 + k / 3) % 1; g.fillStyle = `rgba(200,205,212,${.22 * (1 - ph)})`; g.beginPath(); g.arc(-25 - ph * 16, -20 - ph * 4, 1.6 + ph * 4, 0, 7); g.fill(); }
    /* törzs */
    const body = g.createLinearGradient(0, -24, 0, 16); body.addColorStop(0, "#ffffff"); body.addColorStop(.55, "#eef1f5"); body.addColorStop(1, "#aab4bf");
    g.fillStyle = body; g.beginPath(); g.moveTo(-28, -14); g.bezierCurveTo(-12, -25, 20, -24, 33, -11); g.bezierCurveTo(42, -2, 39, 11, 24, 14); g.lineTo(-22, 13); g.bezierCurveTo(-32, 11, -35, -5, -28, -14); g.closePath(); g.fill();
    g.strokeStyle = "rgba(20,30,45,.4)"; g.lineWidth = .7; g.stroke();
    /* díszcsíkok: piros, sötétkék, arany szegély */
    g.save(); g.clip();
    g.fillStyle = RED; g.beginPath(); g.moveTo(-40, 2.5); g.quadraticCurveTo(0, -2, 46, 0); g.lineTo(46, 5); g.quadraticCurveTo(0, 3, -40, 7.5); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.moveTo(-40, 7.5); g.quadraticCurveTo(0, 3, 46, 5); g.lineTo(46, 8.5); g.quadraticCurveTo(0, 6.4, -40, 10.8); g.fill();
    g.strokeStyle = "#e0b84a"; g.lineWidth = .5; g.beginPath(); g.moveTo(-40, 2.3); g.quadraticCurveTo(0, -2.2, 46, -.2); g.stroke();
    /* a has árnyéka, a törzs felső csillanása */
    const sh = g.createLinearGradient(0, 4, 0, 15); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.22)"); g.fillStyle = sh; g.fillRect(-40, 4, 90, 12);
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-20, -18.5); g.quadraticCurveTo(6, -23, 24, -17); g.stroke();
    g.restore();
    /* panelvonalak, tolóajtó fogantyúval és ablakkal */
    g.strokeStyle = "rgba(20,30,45,.32)"; g.lineWidth = .5;
    g.beginPath(); g.moveTo(-15, -18); g.lineTo(-16, 11); g.moveTo(8, -21); g.lineTo(8, 12); g.moveTo(-26, -6); g.lineTo(-15, -6); g.stroke();
    g.strokeStyle = "rgba(60,70,80,.55)"; g.lineWidth = .4; line(-15, -19.5, 10, -21.5); line(-16, 12.4, 10, 12.4);   /* ajtósín */
    const wg = g.createLinearGradient(-12, -16, 4, -4); wg.addColorStop(0, "#8fc3e6"); wg.addColorStop(1, "#24527a");
    g.fillStyle = wg; g.beginPath(); g.roundRect ? g.roundRect(-12.5, -15.5, 17, 9.5, 2.4) : g.rect(-12.5, -15.5, 17, 9.5); g.fill();
    g.fillStyle = "rgba(255,255,255,.45)"; g.beginPath(); g.moveTo(-11, -14.6); g.lineTo(-4, -14.6); g.lineTo(-8.5, -7.5); g.lineTo(-11, -7.5); g.fill();
    g.fillStyle = "#5d6773"; g.fillRect(4.5, -2, 2.6, .9);
    /* pilótafülke üvege kerettel, pilóta és másodpilóta */
    const gl = g.createLinearGradient(12, -22, 36, 0); gl.addColorStop(0, "#b7e0f7"); gl.addColorStop(.45, "#4a8cc0"); gl.addColorStop(1, "#173a5c");
    g.fillStyle = gl; g.beginPath(); g.moveTo(10, -20); g.bezierCurveTo(24, -22, 33, -15, 37.5, -5); g.quadraticCurveTo(38.5, 2, 36, 5); g.lineTo(18, 5); g.lineTo(13, -4); g.closePath(); g.fill();
    g.fillStyle = "#e9b48c"; g.beginPath(); g.arc(24, -9.5, 2.5, 0, 7); g.fill(); g.fillStyle = "#f2f4f6"; g.beginPath(); g.arc(24, -10.4, 2.7, Math.PI, 0); g.fill();
    g.fillStyle = "#1d2a3a"; g.fillRect(25.4, -10.6, 1.6, 1.2);   /* napszemüveg */
    g.fillStyle = "#e0a37b"; g.beginPath(); g.arc(17, -9, 2.3, 0, 7); g.fill(); g.fillStyle = "#1d2a3a"; g.beginPath(); g.arc(17, -9.8, 2.5, Math.PI, 0); g.fill();
    g.strokeStyle = "#2e3a48"; g.lineWidth = .5; g.beginPath(); g.arc(24, -10, 3.4, Math.PI * 1.1, Math.PI * 1.6); g.stroke();   /* fejhallgató */
    g.strokeStyle = "rgba(230,236,242,.95)"; g.lineWidth = .9; g.beginPath(); g.moveTo(10, -20); g.bezierCurveTo(24, -22, 33, -15, 37.5, -5); g.quadraticCurveTo(38.5, 2, 36, 5); g.stroke();
    line(25, -21, 30, 3); line(13, -4, 36, 5);
    g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.moveTo(15, -19); g.quadraticCurveTo(25, -19.5, 31, -12.5); g.lineTo(28, -12.5); g.quadraticCurveTo(23, -17, 15, -17); g.fill();
    /* orr: leszállófény */
    const lf = g.createRadialGradient(36.5, 8, 0, 36.5, 8, 4); lf.addColorStop(0, "#fffbe6"); lf.addColorStop(1, "rgba(255,240,180,0)");
    g.fillStyle = lf; g.beginPath(); g.arc(36.5, 8, 4, 0, 7); g.fill();
    /* lajstromjel és név */
    g.save(); g.scale(dir, 1); g.fillStyle = NAVY; g.textAlign = "center";
    g.font = "900 4.8px 'Big Shoulders Display', Arial Narrow, sans-serif"; g.fillText("HA-ZPH", dir * -58, -9.4);
    g.font = "italic 900 6.2px 'Big Shoulders Display', Arial Narrow, sans-serif"; g.fillText("ZEPHYR", dir * -24, 1.2); g.restore();
    /* talpak: csőváz, keresztcsövek, fellépő */
    g.strokeStyle = "#4f5964"; g.lineWidth = 1.7; line(-12, 12, -15, 21.5); line(15, 12, 17, 21.5);
    g.strokeStyle = "#3c4550"; g.lineWidth = 2.3; g.beginPath(); g.moveTo(-30, 21.5); g.lineTo(28, 21.5); g.quadraticCurveTo(34, 21.5, 35, 17.5); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = .5; line(-28, 20.8, 26, 20.8);
    g.fillStyle = "#5d6773"; g.fillRect(-4, 13.5, 8, 1.3);
    /* csörlő a has alatt */
    g.fillStyle = "#3b4654"; g.beginPath(); g.roundRect ? g.roundRect(-3.5, 12.5, 7, 6, 1.2) : g.rect(-3.5, 12.5, 7, 6); g.fill(); g.fillStyle = "#e0b84a"; g.fillRect(-1, 18.5, 2, 2.5);
    /* rotorárboc, lapátfej, forgó főrotor (perspektíva: a lapok hossza a forgással változik) */
    g.fillStyle = "#596370"; g.fillRect(-2, -33, 4, 7); g.fillStyle = "#3b4654"; g.beginPath(); g.ellipse(0, -33.5, 6, 2, 0, 0, 7); g.fill();
    g.fillStyle = "#8a949e"; g.beginPath(); g.ellipse(0, -35.5, 3, 1.4, 0, 0, 7); g.fill();
    const disk = g.createLinearGradient(-80, 0, 80, 0); disk.addColorStop(0, "rgba(200,212,224,0)"); disk.addColorStop(.25, "rgba(200,212,224,.32)"); disk.addColorStop(.5, "rgba(200,212,224,.18)"); disk.addColorStop(.75, "rgba(200,212,224,.32)"); disk.addColorStop(1, "rgba(200,212,224,0)");
    g.fillStyle = disk; g.beginPath(); g.ellipse(0, -35, 80, 3.6, 0, 0, 7); g.fill();
    const a = t * 34;
    for (let k = 0; k < 4; k++) {
      const ang = a + k * Math.PI / 2, c = Math.cos(ang), sn = Math.sin(ang);
      g.globalAlpha = .4 + .55 * Math.abs(sn);
      g.strokeStyle = "rgba(30,40,52,.9)"; g.lineWidth = 2.1; line(0, -35, c * 78, -35 + sn * 3);
      g.strokeStyle = "#f2b233"; g.lineWidth = 2.1; line(c * 72, -35 + sn * 2.8, c * 78, -35 + sn * 3);   /* sárga lapátvég */
    }
    g.globalAlpha = 1;
    /* villogó fények: piros a tetőn, navigációs fény oldalt */
    if ((t * 1.6) % 1 < .1) { const bl = g.createRadialGradient(-6, -27, 0, -6, -27, 6); bl.addColorStop(0, "rgba(255,70,60,1)"); bl.addColorStop(1, "rgba(255,70,60,0)"); g.fillStyle = bl; g.beginPath(); g.arc(-6, -27, 6, 0, 7); g.fill(); }
    g.fillStyle = "#2ecc71"; g.beginPath(); g.arc(-86, -4.5, .9, 0, 7); g.fill();
    g.restore();
  }
  /* ------------------------------------------------------------ piros műrepülőgép (oldalnézet, 100 egység; dir=-1: balra repül) */
  const smoke = [];
  function plane(x, y, s, t, dir) {
    /* fehér füstcsík a farok mögött (műrepülő-füst) */
    for (let i = smoke.length - 1; i >= 0; i--) { const q = smoke[i]; q.age += 1 / 60; if (q.age > 1.6) { smoke.splice(i, 1); continue; } const k = q.age / 1.6; g.fillStyle = `rgba(255,255,255,${.38 * (1 - k)})`; g.beginPath(); g.arc(q.x, q.y + k * 6 * s, (2 + k * 9) * s, 0, 7); g.fill(); }
    smoke.push({ x: x - dir * 54 * s, y: y - 1 * s, age: 0 });
    g.save(); g.translate(x, y); g.scale(dir * s, s); g.rotate(Math.sin(t * 2.3) * .025);
    g.lineJoin = "round"; g.lineCap = "round";
    /* vízszintes vezérsík + magassági kormány */
    g.fillStyle = "#a92019"; g.beginPath(); g.moveTo(-42, -4.5); g.lineTo(-58, -6.5); g.lineTo(-60.5, -3.4); g.lineTo(-42, -.8); g.fill();
    g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = .4; line(-53, -5.6, -54, -2.3);
    /* törzs */
    const fg = g.createLinearGradient(0, -13, 0, 10); fg.addColorStop(0, "#ff7466"); fg.addColorStop(.4, "#e2342a"); fg.addColorStop(1, "#8e1712");
    g.fillStyle = fg; g.beginPath(); g.moveTo(-57, -6.5); g.quadraticCurveTo(-20, -12.5, 16, -10.5); g.quadraticCurveTo(33, -9.5, 40, -4.5); g.lineTo(40, 4.5); g.quadraticCurveTo(30, 8.5, 12, 8.5); g.quadraticCurveTo(-22, 6.5, -57, -2); g.closePath(); g.fill();
    g.strokeStyle = "rgba(70,0,0,.4)"; g.lineWidth = .6; g.stroke();
    g.save(); g.clip();
    /* napsugaras fehér-kék díszítés a törzs elején és a farkon */
    g.fillStyle = "#ffffff"; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(40, 0); g.lineTo(12 - k * 3, -12 + k * 6.2); g.lineTo(12 - k * 3, -9.6 + k * 6.2); g.closePath(); g.fill(); }
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(-57, -3.8); g.quadraticCurveTo(-12, -5.4, 40, -1.2); g.lineTo(40, .8); g.quadraticCurveTo(-12, -3, -57, -1.7); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.moveTo(-57, -1.7); g.quadraticCurveTo(-12, -3, 40, .8); g.lineTo(40, 2.2); g.quadraticCurveTo(-12, -1.4, -57, -.6); g.fill();
    const hl = g.createLinearGradient(0, -12, 0, -6); hl.addColorStop(0, "rgba(255,255,255,.55)"); hl.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = hl; g.fillRect(-57, -13, 98, 7);
    g.restore();
    /* panelvonalak, szegecsek */
    g.strokeStyle = "rgba(60,0,0,.35)"; g.lineWidth = .4; line(24, -10, 25, 7.5); line(-14, -11, -14, 6.6); line(-36, -9, -36, 3.8);
    g.fillStyle = "rgba(60,0,0,.35)"; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(-12 + k * 4.5, 5.6, .28, 0, 7); g.fill(); }
    /* függőleges vezérsík + oldalkormány, fehér-piros kockás csík */
    g.fillStyle = "#d12d24"; g.beginPath(); g.moveTo(-41, -8.5); g.lineTo(-55, -25.5); g.quadraticCurveTo(-60, -27, -63, -24.5); g.lineTo(-58.5, -6.5); g.closePath(); g.fill();
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2 === 0) { g.fillStyle = "#ffffff"; g.fillRect(-60.5 + c * 2.4 + r * .8, -19.5 + r * 2.4, 2.4, 2.4); }
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = .45; line(-56.5, -24, -53.8, -8);
    /* kipufogócsonkok */
    g.fillStyle = "#3b4654"; [0, 1, 2].forEach((k) => { g.beginPath(); g.ellipse(30 - k * 3, 7.2, 1.1, .6, -.3, 0, 7); g.fill(); });
    /* buborék kabintető, pilóta sisakkal és napellenzővel */
    g.fillStyle = "#e9b48c"; g.beginPath(); g.arc(-1, -12.6, 2.7, 0, 7); g.fill();
    g.fillStyle = "#f4f6f8"; g.beginPath(); g.arc(-1, -13.4, 2.9, Math.PI * .95, Math.PI * 2.05); g.fill();
    g.fillStyle = "#1d2a3a"; g.beginPath(); g.ellipse(.8, -12.9, 1.5, .8, 0, 0, 7); g.fill();
    g.fillStyle = RED; g.fillRect(-3.9, -14.4, 5.8, .7);
    const cg = g.createLinearGradient(-8, -21, 12, -9); cg.addColorStop(0, "rgba(200,236,255,.9)"); cg.addColorStop(1, "rgba(30,80,130,.75)");
    g.fillStyle = cg; g.beginPath(); g.moveTo(-13, -10); g.bezierCurveTo(-9, -21.5, 9, -21.5, 15, -10); g.closePath(); g.fill();
    g.strokeStyle = "rgba(250,250,250,.85)"; g.lineWidth = .7; g.beginPath(); g.moveTo(-8, -14.5); g.quadraticCurveTo(0, -19, 8, -15.5); g.stroke();
    g.strokeStyle = "#7a1510"; g.lineWidth = .6; line(-13, -10, 15, -10); line(4, -19.6, 6, -10);
    /* antenna */
    g.strokeStyle = "#3b4654"; g.lineWidth = .5; line(-22, -11.5, -26, -16);
    /* szárny profilban, csűrővel; áramvonalas futómű */
    const wgr = g.createLinearGradient(0, -1, 0, 5); wgr.addColorStop(0, "#ea4136"); wgr.addColorStop(1, "#9c1a14");
    g.fillStyle = wgr; g.beginPath(); g.moveTo(-9, 2); g.quadraticCurveTo(8, -1.6, 27, .8); g.quadraticCurveTo(10, 5.5, -9, 4.2); g.fill();
    g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = .4; line(-6, 3.4, 2, 3.2);
    g.strokeStyle = "#5d6773"; g.lineWidth = 1.5; line(19, 6, 16.5, 14.5);
    const wp = g.createLinearGradient(0, 12, 0, 20); wp.addColorStop(0, "#ff6a5c"); wp.addColorStop(1, "#a11c15");
    g.fillStyle = wp; g.beginPath(); g.ellipse(16, 16, 6.4, 3.6, 0, 0, 7); g.fill();
    g.fillStyle = "#1d2a3a"; g.beginPath(); g.arc(16, 17.8, 2.5, 0, 7); g.fill(); g.fillStyle = "#9aa3ad"; g.beginPath(); g.arc(16, 17.8, .9, 0, 7); g.fill();
    g.fillStyle = "#1d2a3a"; g.beginPath(); g.arc(-53, -.8, 1.4, 0, 7); g.fill();   /* farokkerék */
    /* lajstrom */
    g.save(); g.scale(dir, 1); g.fillStyle = "#ffffff"; g.font = "900 5px 'Big Shoulders Display', Arial Narrow, sans-serif"; g.textAlign = "center"; g.fillText("HA-ZEP", dir * -26, 4.6); g.restore();
    /* légcsavar: fényes kúp, elmosódott tárcsa, villanó lapok */
    const sp = g.createRadialGradient(41, -1.5, .5, 42, 0, 6.5); sp.addColorStop(0, "#ffffff"); sp.addColorStop(1, "#9aa3ad");
    g.fillStyle = sp; g.beginPath(); g.moveTo(40, -5.2); g.quadraticCurveTo(49.5, 0, 40, 5.2); g.fill();
    const pd = g.createLinearGradient(0, -16, 0, 16); pd.addColorStop(0, "rgba(220,228,236,0)"); pd.addColorStop(.5, "rgba(220,228,236,.45)"); pd.addColorStop(1, "rgba(220,228,236,0)");
    g.fillStyle = pd; g.beginPath(); g.ellipse(46.5, 0, 2.4, 16.5, 0, 0, 7); g.fill();
    const pa = Math.sin(t * 95); g.strokeStyle = "rgba(30,36,44,.8)"; g.lineWidth = 1.8; line(46.5, -16 * pa, 46.5, 16 * pa);
    g.strokeStyle = "#f2b233"; g.lineWidth = 1.8; line(46.5, -16 * pa, 46.5, -13.5 * pa); line(46.5, 16 * pa, 46.5, 13.5 * pa);
    /* vontatóhorog a farnál */
    g.fillStyle = "#3b4654"; g.fillRect(-59, -2.5, 3, 2.2);
    g.restore();
  }
  /* ------------------------------------------------------------ molinó: a szöveg előre megrajzolva, hullámzó szeletekben */
  let ban = null;
  function makeBanner() {
    const el = hero.querySelector(".hello"); if (!el) return null;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(), hr = hero.getBoundingClientRect();
    const fs = parseFloat(cs.fontSize), text = el.textContent.trim();
    const font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    const m = g.measureText ? (g.font = font, g.measureText(text)) : { width: r.width };
    const pad = fs * .32, w = Math.ceil(m.width + pad * 2), h = Math.ceil(fs * 1.12);
    const mk = (draw) => { const c = document.createElement("canvas"); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr); const o = c.getContext("2d"); o.scale(dpr, dpr); draw(o); return c; };
    const cloth = mk((o) => {
      const cg = o.createLinearGradient(0, 0, 0, h); cg.addColorStop(0, "#ffffff"); cg.addColorStop(1, "#e8edf3"); o.fillStyle = cg; o.fillRect(0, 0, w, h);
      o.fillStyle = RED; o.fillRect(0, 0, w, h * .07); o.fillStyle = NAVY; o.fillRect(0, h * .93, w, h * .07);
      o.strokeStyle = "rgba(11,47,94,.15)"; o.lineWidth = 1; for (let x = 0; x < w; x += 18) { o.beginPath(); o.moveTo(x, 0); o.lineTo(x, h); o.stroke(); }
    });
    const txt = (col, sh) => mk((o) => { o.font = font; o.textBaseline = "middle"; o.fillStyle = col; if (sh) { o.shadowColor = "rgba(0,0,0,.5)"; o.shadowBlur = 18; o.shadowOffsetY = 4; } o.fillText(text, pad, h / 2 + fs * .04); });
    return { el, w, h, pad, cloth, navy: txt(NAVY), white: txt("#ffffff", true), tx: r.left - hr.left - pad, ty: r.top - hr.top + (r.height - h) / 2 };
  }
  function drawBanner(x, y, wave, clothA, whiteK, t) {
    const b = ban, N = 36, sw = b.w / N;
    for (let i = 0; i < N; i++) {
      const dy = Math.sin(i * .55 - t * 9) * wave * (i / N + .25), sh = 1 - .1 * Math.cos(i * .55 - t * 9) * (wave > .5 ? 1 : 0);
      const sx = i * sw * dpr, ssw = Math.ceil(sw * dpr) + 1;
      if (clothA > 0) { g.globalAlpha = clothA; g.drawImage(b.cloth, sx, 0, ssw, b.cloth.height, x + i * sw, y + dy, sw + .6, b.h); if (wave > .5) { g.fillStyle = `rgba(0,0,0,${(1 - sh) * 1.4})`; g.fillRect(x + i * sw, y + dy, sw + .6, b.h); } }
      g.globalAlpha = 1 - whiteK; g.drawImage(b.navy, sx, 0, ssw, b.navy.height, x + i * sw, y + dy, sw + .6, b.h);
      if (whiteK > 0) { g.globalAlpha = whiteK; g.drawImage(b.white, sx, 0, ssw, b.white.height, x + i * sw, y + dy, sw + .6, b.h); }
    }
    g.globalAlpha = 1;
    /* tartórúd a molinó elején */
    if (clothA > 0) { g.strokeStyle = `rgba(90,70,40,${clothA})`; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x, y + b.h + 3); g.stroke(); }
  }
  /* ------------------------------------------------------------ „Zamárdi”: a DOM-felirat betűi pontosan a helyükön, vásznon */
  let zam = null;
  const ripples = [];
  function zamSetup() {
    const el = hero.querySelector(".place"); if (!el) return null;
    const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()); if (!node) return null;
    const cs = getComputedStyle(el), hr = hero.getBoundingClientRect(), fs = parseFloat(cs.fontSize);
    const font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    g.font = font; const m = g.measureText("ZÁ");
    const asc = m.fontBoundingBoxAscent || fs * .82, desc = m.fontBoundingBoxDescent || fs * .22;
    const txt = node.textContent, L = [];
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i]; if (!ch.trim()) continue;
      const r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + 1); const bb = r.getBoundingClientRect();
      const up = cs.textTransform === "uppercase" ? ch.toLocaleUpperCase("hu") : ch;
      L.push({ t: up, x: bb.left - hr.left, base: bb.top - hr.top + (bb.height - (asc + desc)) / 2 + asc, w: g.measureText(up).width, seed: i * 1.7, splashed: false });
    }
    if (!L.length) return null;
    const pad = Math.ceil(fs * .25);
    L.forEach((l) => { l.c = document.createElement("canvas"); l.cw = l.w + pad * 2; l.ch = asc + desc + pad * 2; l.c.width = Math.ceil(l.cw * dpr); l.c.height = Math.ceil(l.ch * dpr); });
    const wy = Math.max(...L.map((l) => l.base)) + desc * .12;
    return { el, font, fs, asc, desc, pad, L, color: cs.color, wy, x0: L[0].x - fs * .5, x1: L[L.length - 1].x + L[L.length - 1].w + fs * .5, sc: clamp(fs / 24, .6, 1.8) };
  }
  function zamFrame(z, pt, t, back, front) {
    const ST = .42, D = 2.6, n = z.L.length, endT = (n - 1) * ST + D + 1.8;
    const handoff = pt > endT, fadeK = clamp((pt - endT) / .45, 0, 1);
    if (handoff && !html.classList.contains("la-place")) html.classList.add("la-place");
    /* a víz: beúszik, a végén elcsendesedik */
    const wa = clamp(pt / .5, 0, 1) * clamp(1 - (pt - endT) / 1.2, 0, 1);
    back.push(() => water(z.wy + 1, z.x0, z.x1, wa * .95, t, z.sc));
    if (fadeK >= 1 && wa <= 0) { z.gone = true; return; }
    const rise = (z.asc + z.desc) * 1.2;
    z.L.forEach((l, i) => {
      const u = pt - i * ST;
      /* buborékok a felszín alatt, mielőtt a betű felbukkan */
      if (u > -.5 && u < .1 && rand() < .5) foam(l.x + rand() * l.w, z.wy + 6 * z.sc, 1, 3, (rand() - .5) * 10, -20, .4, (.8 + rand()) * z.sc, "210,235,250");
      if (u <= 0) return;
      const k = clamp(u / D, 0, 1.4);
      const sp = 1 - Math.exp(-4.2 * k) * Math.cos(6.4 * k);           /* rugózó emelkedés, enyhe túllendüléssel */
      const dy = rise * (1 - sp);
      /* csobbanás, amikor a betű teteje áttöri a vízfelszínt */
      if (!l.splashed && l.base - z.asc + dy < z.wy) {
        l.splashed = true;
        foam(l.x + l.w / 2, z.wy, 26, l.w * 1.1, 0, -170 * z.sc, .9, 1.7 * z.sc, "240,248,255");
        ripples.push({ x: l.x + l.w / 2, y: z.wy + 1, w: l.w, age: 0, sc: z.sc });
      }
      /* lecsorgó víz: cseppek a betű aljáról, vízfilm, ami lefelé fogy */
      const wet = clamp(1 - (u - .35) / 1.9, 0, 1);
      if (wet > 0 && wet < .95 && rand() < .35 * wet) foam(l.x + rand() * l.w, l.base + dy - rand() * z.asc * .2, 1, 1, (rand() - .5) * 8, 10, .6, (.6 + rand() * .7) * z.sc, "225,242,255");
      front.push(() => {
        const o = l.c.getContext("2d"); o.setTransform(dpr, 0, 0, dpr, 0, 0); o.clearRect(0, 0, l.cw, l.ch);
        o.font = z.font; o.textBaseline = "alphabetic"; o.fillStyle = z.color; o.fillText(l.t, z.pad, z.pad + z.asc);
        if (wet > 0) {
          o.globalCompositeOperation = "source-atop";
          const level = z.pad + (z.asc + z.desc) * (1 - wet);               /* a vízfilm felső széle lefelé húzódik */
          const wg = o.createLinearGradient(0, level - z.fs * .2, 0, l.ch);
          wg.addColorStop(0, "rgba(160,215,245,0)"); wg.addColorStop(.25, `rgba(150,210,242,${.7 * wet})`); wg.addColorStop(1, `rgba(60,140,200,${.8 * wet})`);
          o.fillStyle = wg; o.fillRect(0, level - z.fs * .2, l.cw, l.ch);
          /* csorgó vízcsíkok és csillanás */
          o.strokeStyle = `rgba(255,255,255,${.65 * wet})`; o.lineWidth = Math.max(1, .9 * z.sc);
          for (let q = 0; q < 3; q++) { const xx = z.pad + ((l.seed * 37 + q * 53) % 100) / 100 * l.w, y0 = z.pad + ((q * 29 + l.seed * 11) % 40) / 100 * z.asc; o.beginPath(); o.moveTo(xx, y0); o.lineTo(xx + Math.sin(t * 3 + q) * .8, y0 + z.asc * .55 * (1 - wet * .3)); o.stroke(); }
          const hx = z.pad + ((t * .9 + l.seed) % 1) * l.w; const hg = o.createLinearGradient(hx - 6, 0, hx + 6, 0); hg.addColorStop(0, "rgba(255,255,255,0)"); hg.addColorStop(.5, `rgba(255,255,255,${.5 * wet})`); hg.addColorStop(1, "rgba(255,255,255,0)");
          o.fillStyle = hg; o.fillRect(hx - 6, 0, 12, l.ch);
          o.globalCompositeOperation = "source-over";
        }
        const px = l.x - z.pad, py = l.base - z.asc - z.pad + dy;
        g.save(); g.globalAlpha = 1 - fadeK;
        /* a vízfelszín fölötti rész */
        g.save(); g.beginPath(); g.rect(0, 0, W, z.wy + 1); g.clip();
        g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 14; g.shadowOffsetY = 3;
        g.drawImage(l.c, px, py, l.cw, l.ch); g.restore();
        /* a víz alatti rész: halványan, hullámzó szeletekben */
        if (dy > 1) {
          g.save(); g.beginPath(); g.rect(0, z.wy + 1, W, H); g.clip(); g.globalAlpha *= .3;
          const sl = Math.max(2, Math.round(3 * z.sc));
          for (let yy = 0; yy < l.ch; yy += sl) { const ox = Math.sin(yy * .25 + t * 6) * 2.2 * z.sc; g.drawImage(l.c, 0, yy * dpr, l.c.width, sl * dpr, px + ox, py + yy, l.cw, sl); }
          g.restore();
        }
        g.restore();
      });
    });
    /* gyűrűző hullámok a felszínen */
    front.push(() => {
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]; r.age += 1 / 60; if (r.age > 2) { ripples.splice(i, 1); continue; }
        for (let q = 0; q < 2; q++) {
          const a = r.age - q * .35; if (a <= 0) continue;
          const rx = r.w * .5 + a * 46 * r.sc, ry = rx * .16;
          g.strokeStyle = `rgba(255,255,255,${.7 * (1 - a / 2) * (1 - fadeK * .5)})`; g.lineWidth = Math.max(1, 1.3 * r.sc * (1 - a / 2.4));
          g.beginPath(); g.ellipse(r.x, r.y, rx, ry, 0, 0, Math.PI * 2); g.stroke();
        }
      }
    });
  }
  /* ------------------------------------------------------------ egy képkocka */
  const html = document.documentElement;
  function frame(now) {
    if (!t0) t0 = now;
    size();
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - (lastT || now)) / 1000); lastT = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const bs = boatScale(), back = [], front = [], pcs = [];
    /* 1–2. a két vontatás */
    tow({ names: ZW, gb: GZ, dir: 1, base: 415 + OFF.Z, start: T.z0, arr: T.zArr, reel: T.zReel, turn: T.zTurn, out: T.zOut,
          look: { ph: 1, main: "#ffffff", jib: RED, hull: "#ffffff", stripe: NAVY, deco: RED, num: "HUN 27", name: "ZEPHYR", crew: 2, emb: true } }, t, bs, pcs, back);
    tow({ names: AW, gb: GA, dir: -1, base: 500 + OFF.ap_a1, start: T.a0, arr: T.aArr, reel: T.aReel, turn: T.aTurn, out: T.aOut,
          look: { kayak: true } }, t, bs, pcs, back);   /* az APARTMAN-t két kajakos húzza be – utána a vízirendőrség elzavarja őket */
    /* 3. helikopter a vitorlajellel – mint az életben: beérkezés, lebegés magasan, lassú ereszkedés, a lengés csillapítása,
          apró igazítások, finom letétel (a kötél meglazul), kioldás, a horog felcsévélése, majd távozás */
    const ht = t - T.h0;
    const hang = { x: L2X((GM.x0 + GM.x1) / 2 + 40), y: L2Y(GM.y0 + OFF.sail) };   /* a jel felfüggesztési pontja (a végső helyén) */
    let markDx = 0, markDy = 0, markRot = 0, markA = 0;
    if (ht > 0) {
      const hs = clamp(box.s * 1.75, .55, 2.1), L0 = 60 * hs, hook = 21 * hs;
      const P1 = T.hIn, P2 = P1 + T.hHov, P3 = P2 + T.hDesc, P4 = P3 + T.hAdj, P5 = P4 + T.hSet, P6 = P5 + T.hRel;
      const hoverX = hang.x, hoverY = hang.y - L0 - hook;                    /* ebben a magasságban a jel épp a helyén van */
      let hx, hy, tilt = 0, lineLen = L0, attached = true, swing = 0, extraRot = 0, wash = 0, hdir = -1;
      if (ht < P1) {                                                        /* beérkezés jobbról felülről, előredőlve; a jel lemarad, leng */
        const k = .5 - .5 * Math.cos(Math.PI * ht / P1);
        hx = W + 160 * hs + (hoverX + 30 * hs - W - 160 * hs) * k; hy = -80 * hs + (hoverY - 46 * hs + 80 * hs) * k;
        tilt = -.2 * Math.sin(Math.PI * k);
        swing = .3 * Math.sin(Math.PI * k) + .06 * Math.sin(ht * 2.6);
      } else if (ht < P2) {                                                 /* fékez (orr fel), lebeg magasan; a lengés lecseng */
        const r = ht - P1, k = ease(r / T.hHov);
        hx = hoverX + 30 * hs * (1 - k); hy = hoverY - 46 * hs + Math.sin(ht * 2.4) * 1.5 * hs;
        tilt = .12 * Math.sin(Math.PI * k);
        swing = -.16 * Math.exp(-2.2 * r) * Math.cos(r * 4.2);
      } else if (ht < P3) {                                                 /* lassú ereszkedés, oldalirányú korrekciókkal */
        const r = ht - P2, k = easeIO(r / T.hDesc);
        hx = hoverX + 9 * hs * Math.sin(r * 3.1) * (1 - k); hy = hoverY - 46 * hs + 38 * hs * k + Math.sin(ht * 2.4) * 1.2 * hs;
        tilt = .04 * Math.sin(r * 3.1 + .6) * (1 - k);
        swing = -.07 * Math.cos(r * 3.6) * (1 - k * .7); wash = k;
      } else if (ht < P4) {                                                 /* apró igazítások a cél fölött: jobbra-balra, a jel elfordítása */
        const r = ht - P3, k = r / T.hAdj, d = 1 - ease(k);
        hx = hoverX + 5 * hs * Math.sin(r * 5.2) * d; hy = hoverY - 8 * hs + 2 * hs * Math.sin(r * 4) * d;
        tilt = .03 * Math.sin(r * 5.2 + .8) * d; swing = -.025 * Math.cos(r * 4.7) * d; extraRot = .06 * Math.sin(r * 3.4 + .4) * d; wash = 1;
      } else if (ht < P5) {                                                 /* finom letétel: a jel a helyére ül, a kötél kissé meglazul */
        const r = ht - P4, k = easeIO(r / T.hSet);
        hx = hoverX; hy = hoverY - 8 * hs + 14 * hs * k; wash = 1;
      } else if (ht < P6) {                                                 /* kioldás, a horog felcsévélődik, a gép kicsit emelkedik */
        const r = ht - P5, k = ease(r / T.hRel);
        hx = hoverX; hy = hoverY + 6 * hs - 16 * hs * k; attached = false; lineLen = L0 * (1 - .8 * k); wash = 1 - k;
      } else {                                                              /* távozás JOBBRA (a tulajdonos kérése, hogy tovább lehessen nézni): helyben megfordul, majd előredőlve elrepül */
        const k = Math.min(1, (ht - P6) / T.hOut), turnK = easeIO(clamp(k / .3, 0, 1)), kk = Math.pow(clamp((k - .2) / .8, 0, 1), 1.5);
        hdir = -Math.cos(Math.PI * turnK);                                     /* -1 → +1: a gép az orrával jobbra fordul */
        hx = hoverX + (W + 240 * hs - hoverX) * kk; hy = hoverY - 10 * hs - 8 * hs * turnK + 46 * hs * kk;   /* a menüsor alatt, enyhén ereszkedve repül ki jobbra */
        tilt = -.24 * clamp((k - .25) * 3, 0, 1); attached = false; lineLen = L0 * .2;
      }
      const hookX = hx - hdir * Math.sin(tilt) * hook, hookY = hy + hook;
      let slack = 0;
      if (attached) {
        markDx = hookX + Math.sin(swing) * lineLen - hang.x; markDy = hookY + Math.cos(swing) * lineLen - hang.y; markRot = -swing * .9 + extraRot;
        if (ht >= P4) { slack = Math.max(0, markDy); markDy = Math.min(markDy, 0); markDx *= 1 - ease((ht - P4) / T.hSet); markRot *= 1 - ease((ht - P4) / T.hSet); }
      }
      markA = 1;
      const endX = attached ? hang.x + markDx : hookX + Math.sin(tilt) * lineLen * .2, endY = attached ? hang.y + markDy : hookY + lineLen;
      if (hx > -260 * hs && hx < W + 260 * hs && hy > -200 * hs) {
        if (wash > .2 && rand() < .7 * wash) foam(hang.x + (rand() - .5) * 220 * hs, L2Y(GM.y1 + OFF.red) - 6, 1, 4, (rand() - .5) * 260, -30, .55, 1.3 * hs, "235,242,250");
        front.push(() => {
          /* emelőkötél: feszes, letételkor belóg; a végén horog és kötélszem */
          g.strokeStyle = "rgba(40,48,60,.92)"; g.lineWidth = Math.max(1.2, 1.5 * hs); g.lineCap = "round";
          g.beginPath(); g.moveTo(hookX, hookY); g.quadraticCurveTo((hookX + endX) / 2 + slack * .8, (hookY + endY) / 2 + slack * .3, endX, endY); g.stroke();
          g.fillStyle = "#e0b84a"; g.beginPath(); g.arc(endX, endY - 2 * hs, Math.max(2, 2.6 * hs), 0, 7); g.fill();
          g.strokeStyle = "#5d6773"; g.lineWidth = Math.max(1, 1.2 * hs); g.beginPath(); g.arc(endX, endY + 1.5 * hs, 2.6 * hs, -.3, Math.PI + .3, false); g.stroke();
          heli(hx, hy, hs, t, Math.abs(hdir) < .08 ? (hdir < 0 ? -.08 : .08) : hdir, tilt);
        });
      }
    }
    if (markA) MK.forEach((n) => pcs.unshift([n, markDx, markDy, { rot: markRot, ox: (hang.x - L2X(piece[n].x)) / (piece[n].w * box.s), oy: (hang.y - L2Y(piece[n].y + OFF[n])) / (piece[n].h * box.s) }]));
    /* 4. „Zamárdi” a vízből: betűnként emelkedik ki, csobbanással, lecsorgó vízzel, cseppekkel, gyűrűző hullámokkal */
    const pt = t - T.p0;
    if (pt > 0) {
      if (!zam) zam = zamSetup();
      if (zam && !zam.gone) zamFrame(zam, pt, t, back, front);
    }
    /* 5. repülőgép a molinóval (jobbról balra) */
    const ft = t - T.f0;
    if (ft > 0) {
      if (!ban) ban = makeBanner();
      if (ban) {
        const ps = clamp(box.s * 1.7, .55, 2), ropeL = 60 * ps, v = (W + ban.w + ropeL + 260 * ps) / T.fDur;
        const relAt = (W + 90 * ps + 58 * ps + ropeL - ban.tx) / v - .45;             /* elengedés kicsit a cél előtt */
        const px = W + 90 * ps - v * ft, py = ban.ty + ban.h * .45 + Math.sin(ft * 2) * 3 * ps;
        let bx, by = ban.ty, wave = 5 * ps, clothA = 1, whiteK = 0, rope = true;
        if (ft < relAt) { bx = px + 58 * ps + ropeL; by = ban.ty + Math.sin(ft * 2 - .6) * 3 * ps; }
        else {
          const r = ft - relAt, d = v * .45;                                   /* lendületből, lassulva áll be */
          bx = ban.tx + d * Math.exp(-r * 2.4);
          wave = 5 * ps * Math.exp(-r * 1.5); rope = r < .35;
          clothA = clamp(1 - (r - .9) / .9, 0, 1); whiteK = clamp((r - .9) / .9, 0, 1);
          if (r > 2.0 && !html.classList.contains("la-hello")) html.classList.add("la-hello");
          if (r > 2.6) { ban.gone = true; if (!html.classList.contains("la-cta")) html.classList.add("la-cta"); }
        }
        if (!ban.gone) front.push(() => {
          if (rope) { g.strokeStyle = "rgba(60,60,60,.85)"; g.lineWidth = Math.max(1, 1.2 * ps); g.beginPath(); g.moveTo(px + 58 * ps, py - 1 * ps); g.quadraticCurveTo((px + 58 * ps + bx) / 2, Math.max(py, by + ban.h / 2) + 8 * ps, bx, by + ban.h / 2); g.stroke(); }
          drawBanner(bx, by, wave, clothA, whiteK, t);
        });
        if (px > -160 * ps) front.push(() => plane(px, py, ps, t, -1));
      }
    }
    /* rajzolási sorrend: víz és hajók → a logó darabjai (körvonal, majd szín) → helikopter, repülő, molinó */
    stepParts(dt);
    back.forEach((f) => f());
    g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 18; g.shadowOffsetY = 6;
    pcs.forEach(([n, dx, dy, o]) => drawPiece(n, dx, dy, Object.assign({}, o, { layer: "out" }))); g.restore();
    pcs.forEach(([n, dx, dy, o]) => drawPiece(n, dx, dy, Object.assign({}, o, { layer: "col" })));
    front.forEach((f) => f());
    if (t > T.END - 1.1) glint(clamp((t - (T.END - 1.1)) / 1.1, 0, 1));
    if (t >= T.END + .2) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }
  /* fényes csík a kész logón (csak a betűkön látszik) */
  let off = null;
  function glint(k) {
    if (k <= 0 || k >= 1) return;
    off = off || document.createElement("canvas"); off.width = cv.width; off.height = cv.height;
    const o = off.getContext("2d"); o.setTransform(dpr, 0, 0, dpr, 0, 0); o.clearRect(0, 0, W, H);
    const gg = g; g = o; ALL.forEach((n) => drawPiece(n, 0, 0, { layer: "col" })); g = gg;
    o.globalCompositeOperation = "source-atop";
    const x = box.x - 200 + (LW * box.s + 400) * k, lg = o.createLinearGradient(x - 90, 0, x + 90, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(.5, "rgba(255,255,255,.75)"); lg.addColorStop(1, "rgba(255,255,255,0)");
    o.fillStyle = lg; o.save(); o.translate(x, box.y); o.transform(1, 0, -.35, 1, 0, 0); o.translate(-x, -box.y); o.fillRect(x - 90, box.y - 20, 180, LH * box.s + 40); o.restore();
    o.globalCompositeOperation = "source-over";
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(off, 0, 0); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawFinal() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 18; g.shadowOffsetY = 6;
    ALL.forEach((n) => drawPiece(n, 0, 0, { layer: "out" })); g.restore();
    ALL.forEach((n) => drawPiece(n, 0, 0, { layer: "col" }));
  }
  function finish() {
    if (done || sinking) return; done = true; cancelAnimationFrame(raf); parts.length = 0; drawFinal();
    html.classList.add("logo-done", "la-place", "la-hello", "la-cta");
    setTimeout(idle, 9000);
  }
  /* később ritkán újra átfut a fény a feliraton */
  function idle() {
    if (!done || sinking) return;
    if (document.hidden || !inView) { setTimeout(idle, 4000); return; }
    const s0 = performance.now();
    const step = (now) => { const k = (now - s0) / 1100; drawFinal(); if (k < 1) { glint(k); requestAnimationFrame(step); } else { drawFinal(); setTimeout(idle, 14000); } };
    requestAnimationFrame(step);
  }
  /* „Zamárdi” helye (a tulajdonos kérése): bal széle a vitorlajel bal sarkánál, és az APARTMAN alatt ugyanakkora távolságra,
     mint amekkora a ZEPHYR és az APARTMAN között van. A felirat a DOM-ban marad (fordítás, olvasás), csak eltoljuk (translate). */
  let zTx = 0, zTy = 0, sinking = false;
  function placeZam() {
    const el = hero.querySelector(".place"); if (!el || !box.s) return;
    const r = el.getBoundingClientRect(), hr = hero.getBoundingClientRect(), cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
    const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()); if (!node) return;
    const rg = document.createRange(); rg.setStart(node, 0); rg.setEnd(node, 1); const bb = rg.getBoundingClientRect();
    g.save(); g.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`; const m = g.measureText("Z"); g.restore();
    const asc = m.fontBoundingBoxAscent || fs * .82, desc = m.fontBoundingBoxDescent || fs * .22, cap = m.actualBoundingBoxAscent || fs * .7;
    const capTop0 = bb.top - hr.top - zTy + (bb.height - (asc + desc)) / 2 + asc - cap;      /* eltolás nélkül */
    const left0 = bb.left - hr.left - zTx;
    const zBot = 416 + OFF.Z, aTop = 425 + OFF.ap_a1, aBot = 498 + OFF.ap_a1;               /* a logó betűinek széle (logó-egységben) */
    const ty = L2Y(aBot + (aTop - zBot)), tx = L2X(piece.red.x + 4);
    const nx = Math.round(tx - left0), ny = Math.round(ty - capTop0);
    if (nx === zTx && ny === zTy) return;
    zTx = nx; zTy = ny; el.style.translate = `${zTx}px ${zTy}px`;
    if (zam && !zam.gone) zam = null;   /* a betűk helye változott: újramérjük */
  }
  /* a fejléc kis logójára kattintva: a teljes felirat elsüllyed, és a folyamat elölről kezdődik */
  function sinkAndRestart() {
    if (sinking) return;
    if (!started || reduce) return;
    sinking = true; cancelAnimationFrame(raf);
    html.classList.add("la-sink");
    const s0 = performance.now();
    const rows = [[ZW.concat(MK), 416 + OFF.Z], [AW, 498 + OFF.ap_a1]];
    const step = (now) => {
      const k = (now - s0) / 2600; size();
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      const t = now / 1000;
      rows.forEach(([ns, baseY], ri) => {
        const kk = clamp((k - ri * .12) / .85, 0, 1), e = kk * kk * (3 - 2 * kk);
        const wl = L2Y(baseY) + 4 * box.s, depth = (baseY - 0 + 60) * box.s;
        water(wl, L2X(-20), L2X(1640), clamp(kk * 4, 0, 1) * clamp((1 - kk) * 3, 0, 1) * .95, t, box.s * 1.4);
        g.save(); g.beginPath(); g.rect(0, 0, W, wl); g.clip();
        g.shadowColor = "rgba(0,0,0,.3)"; g.shadowBlur = 14; g.shadowOffsetY = 5;
        ns.forEach((n, i) => { const wob = Math.sin(t * 7 + i) * 2 * e; drawPiece(n, wob, e * depth, { layer: "out", rot: Math.sin(i * 1.7) * .08 * e }); });
        g.shadowBlur = 0; ns.forEach((n, i) => { const wob = Math.sin(t * 7 + i) * 2 * e; drawPiece(n, wob, e * depth, { layer: "col", rot: Math.sin(i * 1.7) * .08 * e }); });
        g.restore();
        if (kk > .05 && kk < .95 && rand() < .9) foam(L2X(rand() * 1600), wl, 2, 6, (rand() - .5) * 40, -90, .7, 1.8 * box.s * 1.4, "235,245,255");
      });
      stepParts(1 / 60);
      if (k < 1.25) { raf = requestAnimationFrame(step); return; }
      /* újrakezdés tiszta lappal */
      parts.length = 0; ripples.length = 0; smoke.length = 0; Object.keys(TOWST).forEach((k2) => delete TOWST[k2]);
      zam = null; ban = null; t0 = 0; lastT = 0; done = false; sinking = false;
      html.classList.remove("logo-done", "la-place", "la-hello", "la-cta", "la-sink");
      html.classList.add("logo-anim");
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(step);
  }
  const navLogo = document.querySelector(".nav-logo");
  if (navLogo) navLogo.addEventListener("click", (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0) return;
    e.preventDefault();
    const go = () => sinkAndRestart();
    if (scrollY > 40) { scrollTo({ top: 0, behavior: "smooth" }); setTimeout(go, 700); } else go();
  });
  let inView = true;
  new IntersectionObserver((e) => { inView = e[0].isIntersecting; }).observe(hero);
  function start() {
    if (started) return; started = true; size();
    if (reduce) { finish(); return; }
    html.classList.add("logo-anim");
    raf = requestAnimationFrame(frame);
  }
  /* koppintás: ugorjon a kész állapotra */
  hero.addEventListener("pointerdown", (e) => { if (started && !done && !e.target.closest("a,button")) finish(); }, { passive: true });
  addEventListener("resize", () => { if (started) size(); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (done) size(); }).observe(hero);
  /* indulás: ha a nyitó (fehér) üdvözlőlap még kint van, annak eltűnése után */
  function ready() {
    const go = () => { if (html.classList.contains("intro-on")) return false; setTimeout(start, 120); return true; };
    if (go()) return;
    const mo = new MutationObserver(() => { if (go()) mo.disconnect(); });
    mo.observe(html, { attributes: true, attributeFilter: ["class"] });
  }
  html.classList.add("logo-js");
  if (atlas.complete && atlas.naturalWidth) ready(); else { atlas.onload = ready; atlas.onerror = () => html.classList.remove("logo-js"); }
  if (document.fonts && document.fonts.load) document.fonts.load("900 10px 'Big Shoulders Display'").catch(() => {});
})();
