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
    h0: 5.6, hIn: 2.1, hLow: 1.0, hRel: .5, hOut: 1.9,           /* helikopter */
    p0: 9.6,                                                     /* Zamárdi a vízből */
    f0: 10.6, fDur: 3.3,                                         /* repülőgép + molinó */
  };
  /* lassabb, nyugodtabb tempó (a tulajdonos kérése): minden időtartam 1,8-szoros */
  Object.keys(T).forEach((k) => (T[k] *= 1.8));
  T.END = T.f0 + T.fDur + 2.4;
  function boatScale() { return clamp(box.s * 1.05, .38, 1.5); }   /* kisebb hajók: kb. a betűk magassága */
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
  function tow(o, t, bs, pcs, back) {
    const { names, gb, dir, base, start, arr, reel, turn, out, look } = o;
    const lt = t - start; if (lt < 0) return;
    const wordW = (gb.x1 - gb.x0) * box.s, rope = 70 * bs;
    const wl = L2Y(base) + 1.5 * bs;
    /* a felirat elülső vége (a hajó felőli széle) a végső helyén */
    const frontX = dir > 0 ? L2X(gb.x1) - 6 * box.s : L2X(gb.x0) + 6 * box.s;
    let arriveX = frontX + dir * (rope + 46 * bs);                           /* a hajó itt áll meg (keskeny kijelzőn a képen belül) */
    arriveX = dir > 0 ? Math.min(arriveX, W - 40 * bs) : Math.max(arriveX, 40 * bs);
    const startX = dir > 0 ? -(wordW + rope + 80 * bs) : W + wordW + rope + 80 * bs;
    let bx, wdx = 0, phase, fx = dir, by = wl, sc = 1, reelK = 0;
    if (lt < arr) {                                                          /* vontatás */
      const k = .5 - .5 * Math.cos(Math.PI * clamp(lt / arr, 0, 1));   /* lágy indulás és megállás */
      bx = startX + (arriveX - startX) * k; phase = "tow";
      wdx = bx - arriveX;                                                    /* a felirat ugyanennyivel van a helyétől */
    } else {
      const r = lt - arr;
      bx = arriveX; phase = "stop";
      /* a felirat a lendülettől kicsit túlfut, aztán megáll */
      wdx = dir * 7 * box.s * Math.exp(-4 * r) * Math.sin(r * 7);
      if (r < reel) { reelK = ease(r / reel); }
      else if (r < reel + turn) {                                            /* fordulás: a hajó oldalt fordul, hátrébb (a felirat mögé) kerül */
        reelK = 1; phase = "turn"; const k = easeIO((r - reel) / turn);
        fx = dir * Math.cos(k * Math.PI); by = wl - k * 34 * box.s; sc = 1 - .18 * k; bx = arriveX + dir * Math.sin(k * Math.PI) * 18 * bs;
      } else {
        reelK = 1; phase = "back"; const k = Math.min(1, (r - reel - turn) / out);
        fx = -dir; by = wl - 34 * box.s; sc = .82;
        const endX = dir > 0 ? -120 * bs : W + 120 * bs;
        bx = arriveX + (endX - arriveX) * Math.pow(k, 1.35);
        if (k >= 1) bx = null;
      }
    }
    const wordIn = 1;
    /* víz a felirat alatt: a vontatás alatt a felirattal együtt mozog, utána lassan elcsendesedik */
    const wa = phase === "tow" ? .9 : phase === "stop" ? .9 : phase === "turn" ? .8 : Math.max(0, .8 - (lt - arr - reel - turn) * .5);
    const wx0 = Math.min(L2X(gb.x0) + wdx, bx != null ? bx - 60 * bs : 1e9), wx1 = Math.max(L2X(gb.x1) + wdx, bx != null ? bx + 60 * bs : -1e9);
    back.push(() => water(wl + 2 * bs, phase === "back" ? L2X(gb.x0) : wx0, phase === "back" ? L2X(gb.x1) : wx1, wa, t, bs));
    if (bx != null) {
      if (phase === "tow") { if (rand() < .7) foam(bx + dir * 48 * bs * sc, by - 2 * bs, 1, 5 * bs, dir * 50, -30, .55, 1.3 * bs); if (rand() < .6) foam(frontX + wdx, wl, 1, 6 * bs, dir * 20, -30, .5, 1.1 * bs); }
      back.push(() => {
        if (phase !== "back") wake(bx - dir * 30 * bs, by, 110 * bs, phase === "turn" ? dir : dir, phase === "tow" ? 1 : .5, bs);
        else wake(bx + dir * 30 * bs * sc, by, 90 * bs * sc, -dir, .7, bs * sc);
        sailBoat(Object.assign({ x: bx, y: by, s: bs * sc, dir: fx >= 0 ? 1 : -1, fx }, look), t);
        /* kötél: a hajó farától a felirat elejéig; behúzáskor a vége a hajóhoz fut, belóg */
        if (reelK < 1) {
          const sx = bx - dir * 46 * bs, sy = wl - 7 * bs, ex0 = frontX + wdx, ey0 = L2Y((gb.y0 + gb.y1) / 2 + 30);
          const ex = ex0 + (sx - ex0) * reelK, ey = ey0 + (sy - ey0) * reelK, sag = phase === "tow" ? 4 * bs : (4 + 16 * Math.sin(reelK * Math.PI)) * bs;
          g.save(); g.lineCap = "round";
          g.strokeStyle = "rgba(232,200,130,.95)"; g.lineWidth = Math.max(1.6, 2 * bs); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 2;
          g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo((sx + ex) / 2, Math.max(sy, ey) + sag, ex, ey); g.stroke();
          g.shadowBlur = 0; g.strokeStyle = "rgba(120,84,36,.75)"; g.lineWidth = Math.max(.8, bs); g.setLineDash([2.2 * bs, 2.2 * bs]); g.stroke(); g.setLineDash([]);
          if (reelK === 0) { g.fillStyle = "#c9a25a"; g.beginPath(); g.arc(ex, ey, Math.max(2, 2.4 * bs), 0, 7); g.fill(); }   /* kötélszem a feliraton */
          g.restore();
        }
      });
    }
    names.forEach((n) => pcs.push([n, wdx, Math.sin(t * 3 + base) * 1.2 * bs * (phase === "tow" ? 1 : 0), { alpha: wordIn }]));
  }
  /* ------------------------------------------------------------ helikopter (oldalnézet, 100 egység) */
  function heli(x, y, s, t, dir, tilt) {
    g.save(); g.translate(x, y); g.scale(dir * s, s); g.rotate(tilt);
    const body = g.createLinearGradient(0, -22, 0, 16); body.addColorStop(0, "#ffffff"); body.addColorStop(.6, "#e9edf2"); body.addColorStop(1, "#b9c2cc");
    /* farokgerenda */
    g.fillStyle = "#e3e8ee"; g.beginPath(); g.moveTo(-26, -10); g.lineTo(-86, -7); g.lineTo(-86, -3); g.lineTo(-26, 4); g.closePath(); g.fill();
    g.fillStyle = RED; g.beginPath(); g.moveTo(-40, -6); g.lineTo(-86, -5.4); g.lineTo(-86, -3.6); g.lineTo(-40, -1); g.fill();
    /* függőleges vezérsík + farokrotor */
    g.fillStyle = NAVY; g.beginPath(); g.moveTo(-80, -7); g.lineTo(-92, -24); g.lineTo(-97, -24); g.lineTo(-91, -4); g.closePath(); g.fill();
    g.fillStyle = "#cfd6de"; g.fillRect(-84, -2, 10, 2.2);
    g.save(); g.translate(-93, -12); g.fillStyle = "rgba(200,210,220,.35)"; g.beginPath(); g.arc(0, 0, 10, 0, 7); g.fill();
    g.rotate(t * 60); g.strokeStyle = "rgba(40,50,62,.8)"; g.lineWidth = 1.6; line(-10, 0, 10, 0); g.restore();
    /* törzs */
    g.fillStyle = body; g.beginPath(); g.moveTo(-28, -14); g.bezierCurveTo(-10, -26, 22, -24, 34, -10); g.bezierCurveTo(42, -2, 38, 12, 22, 14); g.lineTo(-22, 12); g.bezierCurveTo(-32, 10, -34, -6, -28, -14); g.closePath(); g.fill();
    g.strokeStyle = "rgba(20,30,45,.35)"; g.lineWidth = .7; g.stroke();
    /* díszcsík: piros és sötétkék */
    g.save(); g.clip(); g.fillStyle = RED; g.beginPath(); g.moveTo(-40, 2); g.quadraticCurveTo(0, -2, 44, 0); g.lineTo(44, 5); g.quadraticCurveTo(0, 3, -40, 7); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.moveTo(-40, 7); g.quadraticCurveTo(0, 3, 44, 5); g.lineTo(44, 8); g.quadraticCurveTo(0, 6, -40, 10); g.fill(); g.restore();
    /* pilótafülke üvege */
    const gl = g.createLinearGradient(14, -22, 34, 0); gl.addColorStop(0, "#9fd3f2"); gl.addColorStop(.5, "#3c7fb1"); gl.addColorStop(1, "#1d4467");
    g.fillStyle = gl; g.beginPath(); g.moveTo(8, -19); g.bezierCurveTo(22, -21, 32, -14, 36, -5); g.lineTo(14, -5); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.moveTo(14, -18); g.quadraticCurveTo(24, -18, 29, -12); g.lineTo(25, -12); g.quadraticCurveTo(21, -16, 14, -16); g.fill();
    g.fillStyle = "#e9b48c"; g.beginPath(); g.arc(22, -10, 2.6, 0, 7); g.fill(); g.fillStyle = "#1d2a3a"; g.beginPath(); g.arc(22, -11, 2.7, Math.PI, 0); g.fill();   /* pilóta sisakkal */
    /* oldalablakok, ajtó */
    g.fillStyle = "#2a587f"; g.beginPath(); g.ellipse(-4, -9, 7, 4.5, 0, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,.4)"; g.beginPath(); g.ellipse(-6, -10.5, 3, 1.4, 0, 0, 7); g.fill();
    g.strokeStyle = "rgba(20,30,45,.3)"; g.lineWidth = .6; g.strokeRect(-14, -16, 22, 26);
    g.save(); g.scale(dir, 1); g.fillStyle = NAVY; g.font = "italic 900 6px 'Big Shoulders Display', Arial Narrow, sans-serif"; g.textAlign = "center"; g.fillText("ZEPHYR", dir * -24, -1); g.restore();
    /* talpak */
    g.strokeStyle = "#5d6773"; g.lineWidth = 1.8; line(-12, 12, -16, 21); line(16, 12, 18, 21);
    g.lineWidth = 2.2; g.lineCap = "round"; g.beginPath(); g.moveTo(-28, 21); g.lineTo(28, 21); g.quadraticCurveTo(33, 21, 34, 17); g.stroke();
    /* rotorárboc és a forgó főrotor (perspektívában: a lapok hossza a forgással változik) */
    g.fillStyle = "#596370"; g.fillRect(-2, -30, 4, 8); g.fillStyle = "#3b4654"; g.fillRect(-4, -32, 8, 3);
    g.fillStyle = "rgba(200,212,224,.28)"; g.beginPath(); g.ellipse(0, -31, 72, 3.2, 0, 0, 7); g.fill();
    const a = t * 38; g.strokeStyle = "rgba(35,45,58,.85)"; g.lineCap = "round"; g.lineWidth = 2;
    for (let k = 0; k < 4; k++) { const c = Math.cos(a + k * Math.PI / 2); g.globalAlpha = .55 + .45 * Math.abs(Math.sin(a + k * Math.PI / 2)); line(0, -31, c * 72, -31 + Math.sin(a + k * Math.PI / 2) * 2.6); }
    g.globalAlpha = 1;
    /* villogó fény */
    if ((t * 2) % 1 < .12) { g.fillStyle = "#ff3b30"; g.beginPath(); g.arc(-30, 12, 1.8, 0, 7); g.fill(); }
    /* csörlő a has alatt */
    g.fillStyle = "#3b4654"; g.fillRect(-3, 12, 6, 4);
    g.restore();
  }
  /* ------------------------------------------------------------ piros műrepülőgép (oldalnézet, 100 egység, balra repül: dir=-1) */
  function plane(x, y, s, t, dir) {
    g.save(); g.translate(x, y); g.scale(dir * s, s); g.rotate(Math.sin(t * 2.3) * .03);
    /* vízszintes vezérsík (hátul) */
    g.fillStyle = "#b8231b"; g.beginPath(); g.moveTo(-44, -4); g.lineTo(-58, -6); g.lineTo(-60, -3); g.lineTo(-44, -1); g.fill();
    /* törzs */
    const fg = g.createLinearGradient(0, -12, 0, 10); fg.addColorStop(0, "#ff6a5c"); fg.addColorStop(.45, "#e2342a"); fg.addColorStop(1, "#9c1a14");
    g.fillStyle = fg; g.beginPath(); g.moveTo(-56, -6); g.quadraticCurveTo(-20, -12, 18, -10); g.quadraticCurveTo(34, -9, 40, -4); g.lineTo(40, 4); g.quadraticCurveTo(30, 8, 14, 8); g.quadraticCurveTo(-20, 6, -56, -2); g.closePath(); g.fill();
    g.strokeStyle = "rgba(60,0,0,.35)"; g.lineWidth = .6; g.stroke();
    /* fehér díszcsíkok */
    g.save(); g.clip(); g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(-56, -3.6); g.quadraticCurveTo(-10, -5, 40, -1); g.lineTo(40, 1); g.quadraticCurveTo(-10, -2.6, -56, -1.6); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.moveTo(-56, -1.6); g.quadraticCurveTo(-10, -2.6, 40, 1); g.lineTo(40, 2.4); g.quadraticCurveTo(-10, -1, -56, -.4); g.fill(); g.restore();
    /* függőleges vezérsík */
    g.fillStyle = "#d12d24"; g.beginPath(); g.moveTo(-42, -8); g.lineTo(-56, -24); g.lineTo(-62, -24); g.lineTo(-58, -6); g.closePath(); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(-50, -16); g.lineTo(-60, -16); g.lineTo(-61, -13); g.lineTo(-47, -13); g.fill();
    /* buborék kabintető és pilóta */
    const cg = g.createLinearGradient(-6, -18, 12, -8); cg.addColorStop(0, "rgba(190,230,255,.95)"); cg.addColorStop(1, "rgba(40,90,140,.9)");
    g.fillStyle = "#e9b48c"; g.beginPath(); g.arc(-1, -12.5, 2.6, 0, 7); g.fill(); g.fillStyle = "#1d2a3a"; g.beginPath(); g.arc(-1, -13.4, 2.7, Math.PI, 0); g.fill();
    g.fillStyle = cg; g.globalAlpha = .8; g.beginPath(); g.moveTo(-12, -10); g.bezierCurveTo(-8, -20, 8, -20, 14, -10); g.closePath(); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = .7; g.beginPath(); g.moveTo(-8, -14); g.quadraticCurveTo(0, -18, 8, -15); g.stroke();
    /* szárny (oldalnézetben vékony profil) + áramvonalas futómű */
    g.fillStyle = "#c22a21"; g.beginPath(); g.moveTo(-8, 2); g.quadraticCurveTo(8, -1, 26, 1); g.quadraticCurveTo(10, 5, -8, 4); g.fill();
    g.strokeStyle = "#5d6773"; g.lineWidth = 1.6; line(18, 6, 16, 15);
    g.fillStyle = "#e2342a"; g.beginPath(); g.ellipse(16, 16, 6, 3.4, 0, 0, 7); g.fill(); g.fillStyle = "#1d2a3a"; g.beginPath(); g.arc(16, 17.5, 2.4, 0, 7); g.fill();
    g.fillStyle = "#1d2a3a"; g.beginPath(); g.arc(-52, -1, 1.3, 0, 7); g.fill();
    /* légcsavar: kúp + elmosódott tárcsa + villanó lapok */
    g.fillStyle = "#f4f6f8"; g.beginPath(); g.moveTo(40, -5); g.quadraticCurveTo(48, 0, 40, 5); g.fill();
    g.fillStyle = "rgba(220,228,236,.35)"; g.beginPath(); g.ellipse(46, 0, 2.2, 15, 0, 0, 7); g.fill();
    const pa = Math.sin(t * 90); g.strokeStyle = "rgba(30,36,44,.75)"; g.lineWidth = 1.6; line(46, -15 * pa, 46, 15 * pa);
    /* vontatóhorog a farnál */
    g.fillStyle = "#3b4654"; g.fillRect(-58, -2, 3, 2);
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
  /* ------------------------------------------------------------ egy képkocka */
  const html = document.documentElement;
  function frame(now) {
    if (!t0) t0 = now;
    size();
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - (lastT || now)) / 1000); lastT = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const bs = boatScale(), back = [], front = [], pcs = [];
    /* 1–2. a két vontatás */
    tow({ names: ZW, gb: GZ, dir: 1, base: 415, start: T.z0, arr: T.zArr, reel: T.zReel, turn: T.zTurn, out: T.zOut,
          look: { ph: 1, main: "#ffffff", jib: RED, hull: "#ffffff", stripe: NAVY, deco: RED, num: "HUN 27", name: "ZEPHYR", crew: 2, emb: true } }, t, bs, pcs, back);
    tow({ names: AW, gb: GA, dir: -1, base: 500, start: T.a0, arr: T.aArr, reel: T.aReel, turn: T.aTurn, out: T.aOut,
          look: { ph: 4, main: "#fdf8ec", jib: NAVY, hull: "#f7f2e5", stripe: RED, deco: NAVY, num: "HUN 5", name: "SCHOONER", crew: 3, heel: -.11 } }, t, bs, pcs, back);
    /* 3. helikopter a vitorlajellel */
    const ht = t - T.h0;
    const hang = { x: L2X((GM.x0 + GM.x1) / 2 + 40), y: L2Y(GM.y0) };            /* a jel felfüggesztési pontja (a végső helyén) */
    let markDx = 0, markDy = 0, markRot = 0, markA = 0;
    if (ht > 0) {
      const hs = clamp(box.s * 1.55, .5, 1.9), lineLen0 = 58 * hs;
      let hx, hy, tilt = 0, lineLen = lineLen0, attached = true, swing = 0, hDir = -1;
      const hoverX = hang.x, hoverY = hang.y - lineLen0 - 16 * hs;
      if (ht < T.hIn) {                                                     /* beérkezés jobbról, felülről, előre döntve */
        const k = easeIO(ht / T.hIn); hx = W + 140 * hs + (hoverX - W - 140 * hs) * k; hy = -60 * hs + (hoverY - 40 * hs + 60 * hs) * k;
        tilt = -.22 * Math.sin(Math.PI * Math.min(1, ht / T.hIn)) + .06 * (1 - k); swing = .32 * Math.sin(Math.PI * k) * Math.cos(ht * 3);
      } else if (ht < T.hIn + T.hLow) {                                     /* lebeg, leereszti a jelet */
        const k = easeIO((ht - T.hIn) / T.hLow); hx = hoverX; hy = hoverY - 40 * hs * (1 - k) + Math.sin(ht * 3) * 1.5 * hs;
        swing = .14 * Math.exp(-3 * (ht - T.hIn)) * Math.cos((ht - T.hIn) * 5);
      } else if (ht < T.hIn + T.hLow + T.hRel) {                            /* leoldja, a kötél felcsévélődik */
        const k = ease((ht - T.hIn - T.hLow) / T.hRel); hx = hoverX; hy = hoverY + Math.sin(ht * 3) * 1.5 * hs; attached = false; lineLen = lineLen0 * (1 - k * .85);
      } else {                                                              /* elrepül balra fel */
        const k = Math.min(1, (ht - T.hIn - T.hLow - T.hRel) / T.hOut), kk = Math.pow(k, 1.6);
        hx = hoverX + (-180 * hs - hoverX) * kk; hy = hoverY - (hoverY + 120 * hs) * kk; tilt = -.28 * Math.min(1, k * 3); attached = false; lineLen = lineLen0 * .15;
      }
      const hookX = hx + Math.sin(tilt) * 16 * hs, hookY = hy + 16 * hs;
      if (attached) { markDx = hookX + Math.sin(swing) * lineLen - hang.x; markDy = hookY + Math.cos(swing) * lineLen - hang.y; markRot = -swing * .9; }
      markA = 1;
      const endX = attached ? hang.x + markDx : hookX + Math.sin(tilt) * lineLen * .2, endY = attached ? hang.y + markDy : hookY + lineLen;
      if (hx > -200 * hs && hy > -150 * hs) {
        front.push(() => {
          /* emelőkötél + horog */
          g.strokeStyle = "rgba(40,48,60,.9)"; g.lineWidth = Math.max(1.2, 1.4 * hs); g.beginPath(); g.moveTo(hookX, hookY); g.lineTo(endX, endY); g.stroke();
          g.fillStyle = "#c9a25a"; g.beginPath(); g.arc(endX, endY, Math.max(2, 2.6 * hs), 0, 7); g.fill();
          heli(hx, hy, hs, t, hDir, tilt);
          /* a rotor szele: fodrozódás a víz/a jel körül lebegéskor */
          if (ht > T.hIn * .8 && ht < T.hIn + T.hLow + T.hRel + .6 && rand() < .5) foam(hang.x + (rand() - .5) * 160 * hs, L2Y(GM.y1) - 10, 1, 4, (rand() - .5) * 160, -20, .5, 1.2 * hs, "235,242,250");
        });
      }
    }
    if (markA) MK.forEach((n) => pcs.unshift([n, markDx, markDy, { rot: markRot, ox: (hang.x - L2X(piece[n].x)) / (piece[n].w * box.s), oy: (hang.y - L2Y(piece[n].y)) / (piece[n].h * box.s) }]));
    /* 4. „Zamárdi” a vízből */
    const pt = t - T.p0;
    if (pt > 0 && !html.classList.contains("la-place")) html.classList.add("la-place");
    if (pt > -.3 && pt < 2.6) {
      const pl = hero.querySelector(".place");
      if (pl) {
        const r = pl.getBoundingClientRect(), hr = hero.getBoundingClientRect(), fs = parseFloat(getComputedStyle(pl).fontSize);
        const wy = r.bottom - hr.top + 2, x0 = r.left - hr.left, x1 = Math.min(r.right - hr.left, x0 + fs * 9.5);
        const a = clamp((pt + .3) * 2, 0, 1) * clamp((2.6 - pt) / 1, 0, 1);
        back.push(() => water(wy, x0, x1, a * .95, t, clamp(fs / 22, .6, 1.6)));
        if (pt > 0 && pt < 1.1 && rand() < .9) foam(x0 + rand() * (x1 - x0), wy, 2, 4, (rand() - .5) * 40, -60, .7, 1.4 * clamp(fs / 22, .6, 1.6), "225,240,255");
      }
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
    if (done) return; done = true; cancelAnimationFrame(raf); parts.length = 0; drawFinal();
    html.classList.add("logo-done", "la-place", "la-hello", "la-cta");
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
