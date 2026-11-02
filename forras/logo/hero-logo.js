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
    if (done) drawFinal();
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
    const x = L2X(p.x) + (dx || 0), y = L2Y(p.y) + (dy || 0), w = p.w * box.s, h = p.h * box.s;
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
    g.save(); g.scale(dir * s, s); g.globalAlpha *= .22; g.scale(1, -.45); g.rotate(-(heel + pitch));
    hull(o, true); g.restore();
    g.scale(dir * s, s); g.rotate(heel + pitch);
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
  /* ------------------------------------------------------------ forgatókönyv */
  const ORDER = ["Z", "E", "P", "H", "Y", "R"];
  const HULLS = ["#ffffff", "#f7f2e5", "#ffffff", "#eef4fb", "#ffffff", "#f7f2e5"];
  const MAINS = ["#ffffff", "#fdf8ec", "#f4f7fb", "#ffffff", "#fdf8ec", "#ffffff"];
  const JIBS = [RED, NAVY, "#f2b233", RED, NAVY, RED];
  const NUMS = ["HUN 1", "HUN 27", "HUN 5", "HUN 33", "HUN 8", "HUN 12"];
  const NAMES = ["KORVETT", "DINGI", "FREGATT", "KALÓZ", "SCHOONER", "ZEPHYR"];
  const TOW = ORDER.map((n, i) => ({ n, dir: i % 2 ? -1 : 1, t: .25 + i * .42, dur: 1.85 }));
  const T_SAIL = 3.0, T_FLAG = 3.65, T_FLAG_DUR = 2.6, T_END = 6.9;
  function boatScale() { return clamp(box.s * 2.25, .7, 3.4); }   /* px / hajóegység */
  function frame(now) {
    if (!t0) t0 = now;
    size();   /* a nyitókép elrendezése betöltés közben még változhat (betűtípus, videó) – a logó mindig a helyén legyen */
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - (lastT || now)) / 1000); lastT = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const bs = boatScale(), tow = 120 * bs;   /* kötélhossz */
    /* 1) a vontatott betűk és hajóik */
    const later = [], pcs = [];   /* later: kötelek; pcs: a logó darabjai (két menetben: körvonal, majd szín) */
    TOW.forEach((k, i) => {
      const p = piece[k.n], tx = L2X(p.x + p.w / 2), wl = L2Y(BY[k.n]) + 2 * bs, dir = k.dir;
      const lt = (t - k.t) / k.dur;
      if (lt < 0) return;
      /* a hajó: a képen kívülről indul, a betűt a helyére húzza, majd gyorsulva kifut */
      const startX = dir > 0 ? -60 * bs : W + 60 * bs, arriveX = tx + dir * tow, endX = dir > 0 ? W + 160 * bs : -160 * bs;
      let bx; if (lt < 1) bx = startX + (arriveX - startX) * easeIO(Math.min(1, lt) * .98 + .02 * lt);
      else bx = arriveX + (endX - arriveX) * Math.pow(Math.min(1, (lt - 1) / .9), 1.6);
      const released = lt >= 1;
      /* a betű: kötélen, a hajó mögött; elengedéskor rugózva megáll */
      let lx, rot = 0, bob = 0;
      if (!released) { lx = bx - dir * tow; rot = dir * .05 * Math.sin(lt * Math.PI); bob = Math.sin(t * 5 + i) * 2 * bs * (1 - lt); }
      else { const r = lt - 1; lx = tx + dir * 26 * bs * Math.exp(-6 * r) * Math.sin(r * 15); rot = dir * .03 * Math.exp(-5 * r) * Math.sin(r * 15); }
      const dx = lx - tx;
      if (bx > -200 * bs && bx < W + 200 * bs) {
        wake(bx - dir * 40 * bs, wl, 140 * bs, dir, 1, bs);
        if (rand() < .6) foam(bx + dir * 48 * bs, wl - 2 * bs, 1, 6 * bs, dir * 60, -30, .6, 1.6 * bs);
        later.push(() => {
          /* kötél: feszes vontatáskor, elengedés után belóg és elmarad */
          const sx = bx - dir * 47 * bs, sy = wl - 10 * bs, ex = lx + dir * p.w * box.s * .42, ey = L2Y(p.y + p.h * .55) + bob;
          const slack = released ? Math.min(1, (lt - 1) * 3) : 0, ropeA = released ? Math.max(0, 1 - (lt - 1) * 2.2) : 1;
          if (ropeA > 0) {
            const rx = released ? sx - dir * (30 + 60 * slack) * bs : ex, ry = released ? sy + 8 * bs : ey;
            g.strokeStyle = `rgba(232,200,130,${ropeA})`; g.lineWidth = Math.max(2, 2.6 * bs); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 3;
            g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo((sx + rx) / 2, Math.max(sy, ry) + (6 + 26 * slack) * bs, rx, ry); g.stroke();
            g.shadowBlur = 0; g.strokeStyle = `rgba(120,84,36,${ropeA * .75})`; g.lineWidth = Math.max(1, 1.2 * bs); g.setLineDash([2.5 * bs, 2.5 * bs]); g.stroke(); g.setLineDash([]);
          }
        });
        sailBoat({ x: bx, y: wl, s: bs, dir, ph: i * 1.7, main: MAINS[i], jib: JIBS[i], hull: HULLS[i], stripe: i % 2 ? RED : NAVY, deco: i % 2 ? NAVY : RED, num: NUMS[i], name: NAMES[i], crew: 2 + (i % 2), emb: i === 5 }, t);
      }
      if (!released) { foam(lx - dir * p.w * box.s * .3, L2Y(BY[k.n]), 1, 10 * bs, -dir * 30, -40, .5, 1.3 * bs); }
      if (released && lt - dt / k.dur < 1) foam(tx, L2Y(BY[k.n]), 26, p.w * box.s * .8, 0, -90, .9, 2.2 * bs);   /* a megérkezés csobbanása */
      pcs.push([k.n, dx, bob, { rot, oy: .9 }]);
    });
    /* 2) a logó két vitorlája: a piros felcsúszik, a kék kibomlik (felhúzzák) */
    const sr = (t - T_SAIL) / .9, sb = (t - T_SAIL - .35) / 1.0;
    if (sr > 0) {
      const k = spring(sr, 6, 11), dy = (1 - k) * 140 * box.s;
      pcs.unshift(["red", 0, dy, { alpha: clamp(sr * 3, 0, 1) }]);
      if (sb > 0) { const f = clamp(spring(sb, 5, 10), 0, 1.2), flut = Math.sin(t * 18) * .08 * (1 - clamp(sb, 0, 1)); pcs.unshift(["sail", 0, 0, { sy: f, kx: flut, oy: 1, ox: .2, alpha: clamp(sb * 4, 0, 1) }]); }
    }
    /* 3) zászlóshajó spinnakerrel: az APARTMAN betűi a nyomában bukkannak fel, a nyomából lesz a hullám */
    const ft = (t - T_FLAG) / T_FLAG_DUR;
    const wl2 = L2Y(AP_BASE) + 6 * box.s, fbs = bs * 1.25;
    const fx0 = -90 * fbs, fx1 = W + 140 * fbs, fx = fx0 + (fx1 - fx0) * ft;
    const waveP = piece.wave, wvX0 = L2X(waveP.x), wvW = waveP.w * box.s;
    if (ft > 0) {
      const reveal = clamp(fx - 46 * fbs, wvX0, wvX0 + wvW) - wvX0;
      {
        if (reveal > 0) pcs.push(["wave", 0, 0, { clip: [wvX0 - 20, 0, reveal + 20, H] }]);
        ["ap_a1", "ap_p", "ap_a2", "ap_r", "ap_t", "ap_m", "ap_a3", "ap_n"].forEach((n) => {
          const q = piece[n], cx = L2X(q.x + q.w / 2), age = (fx - 30 * fbs - cx) / (110 * fbs);
          if (age <= 0) return;
          const k = spring(age * .9, 5, 12);
          pcs.push([n, 0, (1 - Math.min(1, k)) * 22 * box.s, { sy: clamp(k, 0, 1.25), oy: 1, alpha: clamp(age * 3, 0, 1) }]);
          if (age > 0 && age < .06) foam(cx, L2Y(AP_BASE), 14, q.w * box.s, 0, -110, .7, 1.6 * fbs, "255,236,236");
        });
      }
      if (ft < 1.15) {
        wake(fx - 40 * fbs, wl2, 200 * fbs, 1, 1, fbs);
        if (rand() < .8) foam(fx + 50 * fbs, wl2 - 2 * fbs, 2, 6 * fbs, 90, -50, .7, 1.8 * fbs);
        sailBoat({ x: fx, y: wl2, s: fbs, dir: 1, ph: 9, main: "#ffffff", jib: RED, spin: true, hull: "#ffffff", stripe: NAVY, deco: RED, num: "HUN 27", name: "ZEPHYR", crew: 3, emb: true, heel: -.05 }, t);
      }
    }
    /* rajzolási sorrend: hajók (fent), majd a logó darabjai előttük – a betűk körvonalai előbb, a színes rétegek utána */
    stepParts(dt);   /* hab és permet a betűk mögött */
    later.forEach((f) => f());
    g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 18; g.shadowOffsetY = 6;
    pcs.forEach(([n, dx, dy, o]) => drawPiece(n, dx, dy, Object.assign({}, o, { layer: "out" }))); g.restore();
    pcs.forEach(([n, dx, dy, o]) => drawPiece(n, dx, dy, Object.assign({}, o, { layer: "col" })));
    /* 4) végső fényvillanás végig a feliraton */
    if (t > T_END - .9) glint(clamp((t - (T_END - .9)) / 1.1, 0, 1));
    if (t >= T_END + .3) { finish(); return; }
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
  const ALL = ["red", "sail", "Z", "E", "P", "H", "Y", "R", "wave", "ap_a1", "ap_p", "ap_a2", "ap_r", "ap_t", "ap_m", "ap_a3", "ap_n"];
  function drawFinal() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 18; g.shadowOffsetY = 6;
    ALL.forEach((n) => drawPiece(n, 0, 0, { layer: "out" })); g.restore();
    ALL.forEach((n) => drawPiece(n, 0, 0, { layer: "col" }));
  }
  function finish() {
    if (done) return; done = true; cancelAnimationFrame(raf); parts.length = 0; drawFinal();
    document.documentElement.classList.add("logo-done");
    setTimeout(idle, 9000);
  }
  /* később ritkán újra átfut a fény a feliraton */
  function idle() {
    if (document.hidden || !inView) { setTimeout(idle, 4000); return; }
    const s0 = performance.now();
    const step = (now) => { const k = (now - s0) / 1100; drawFinal(); if (k < 1) { glint(k); requestAnimationFrame(step); } else { drawFinal(); setTimeout(idle, 14000); } };
    requestAnimationFrame(step);
  }
  let inView = true;
  new IntersectionObserver((e) => { inView = e[0].isIntersecting; }).observe(hero);
  function start() {
    if (started) return; started = true; size();
    if (reduce) { finish(); return; }
    document.documentElement.classList.add("logo-anim");
    raf = requestAnimationFrame(frame);
  }
  /* koppintás / billentyű: ugorjon a kész állapotra */
  hero.addEventListener("pointerdown", () => { if (started && !done) finish(); }, { passive: true });
  addEventListener("resize", () => { if (started) size(); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (done) size(); }).observe(hero);
  /* indulás: ha a nyitó (fehér) üdvözlőlap még kint van, annak eltűnése után */
  function ready() {
    const go = () => { if (document.documentElement.classList.contains("intro-on")) return false; setTimeout(start, 120); return true; };
    if (go()) return;
    const mo = new MutationObserver(() => { if (go()) mo.disconnect(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
  document.documentElement.classList.add("logo-js");
  if (atlas.complete && atlas.naturalWidth) ready(); else { atlas.onload = ready; atlas.onerror = () => document.documentElement.classList.remove("logo-js"); }
  if (document.fonts && document.fonts.load) document.fonts.load("900 10px 'Big Shoulders Display'").catch(() => {});
})();
