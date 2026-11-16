  /* puffancs: a nap felőli (bal felső) oldala fehér, a pereme halvány szürkéskék – egymásra rajzolva adják a karfiolos gyűrődéseket */
  function cPuff(g, x, y, r, c0, c1, c2, k) { const q = k == null ? .42 : k, gr = g.createRadialGradient(x - r * q, y - r * q * 1.1, r * .04, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(.62, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function cSoft(g, x, y, rx, ry, rgb, a) { g.save(); g.translate(x, y); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(.55, `rgba(${rgb},${a * .55})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore(); }
  /* rátét (csak a felhőre): függőleges és vízszintes árnyalás */
  function cShadeV(g, w, y0, y1, col) { g.save(); g.globalCompositeOperation = "source-atop"; const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, col); g.fillStyle = gr; g.fillRect(0, y0, w, y1 - y0); g.fillStyle = col; g.fillRect(0, y1, w, 600); g.restore(); }
  function cShadeH(g, x0, x1, h, col) { g.save(); g.globalCompositeOperation = "source-atop"; const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, col); g.fillStyle = gr; g.fillRect(x0, 0, x1 - x0, h); g.fillStyle = col; g.fillRect(x1, 0, 600, h); g.restore(); }
  function cCut(g, w, y) { g.save(); g.globalCompositeOperation = "destination-out"; const gc = g.createLinearGradient(0, y - .8, 0, y + 1.2); gc.addColorStop(0, "rgba(0,0,0,0)"); gc.addColorStop(1, "rgba(0,0,0,1)"); g.fillStyle = gc; g.fillRect(0, y - .8, w, 600); g.restore(); }
  /* tornyok (turretek) mentén elhelyezett puffancsok: a középső torony a legmagasabb – így lesz a gomoly szabálytalan, karfiolos sziluettű */
  function cTurrets(rnd, cx, base, hw, top, nT, rB) { const P = [];
    for (let i = 0; i < 16; i++) { const u = rnd() * 2 - 1; P.push([cx + u * hw * .95, base - rB * (.45 + rnd() * .25), rB * (.62 + rnd() * .4) * (1 - Math.abs(u) * .35)]); }
    for (let k = 0; k < nT; k++) { const f = nT > 1 ? k / (nT - 1) - .5 : 0, tx = cx + f * hw * 1.25 + (rnd() - .5) * hw * .18, th = top + (base - top) * (Math.abs(f) * 1.15 + rnd() * .12); let y = base - rB * .55, r = rB * (.85 + rnd() * .3);
      while (y - r * .5 > th) { P.push([tx + (rnd() - .5) * r * .55, y, r]); P.push([tx + (rnd() - .5) * r * 1.1, y + r * .1, r * (.55 + rnd() * .25)]); y -= r * (.5 + rnd() * .18); r *= .9; }
      for (let j = 0; j < 5; j++) P.push([tx + (rnd() - .5) * r * 1.3, th + r * (.25 + rnd() * .45), r * (.42 + rnd() * .3)]); }
    return P; }
  /* gomolyos test megfestése: alulról felfelé (a felső puffancsok ráfednek az alsókra), majd a karfiol-perem apró gomolyai */
  function cBody(g, rnd, P, C) { P.sort((a, b) => b[1] - a[1]); P.forEach(([x, y, r]) => cPuff(g, x, y, r, C[0], C[1], C[2]));
    let yMin = 1e9, yMax = -1e9; P.forEach((p) => { yMin = Math.min(yMin, p[1]); yMax = Math.max(yMax, p[1]); });
    P.filter((p) => p[1] < yMin + (yMax - yMin) * .55).forEach(([x, y, r]) => { const m = 2 + (rnd() * 2 | 0); for (let k = 0; k < m; k++) { const a = -Math.PI * (.12 + rnd() * .76); cPuff(g, x + Math.cos(a) * r * .8, y + Math.sin(a) * r * .8, r * (.2 + rnd() * .16), C[0], C[1], C[3] || C[2], .3); } }); }
  function cldPaint(kind, w, h, seed) { const key = kind + "|" + w + "|" + h + "|" + seed; if (CLD.cache.has(key)) return CLD.cache.get(key);
    const W0 = Math.max(2, Math.round(w * CLD.PX)), H0 = Math.max(2, Math.round(h * CLD.PX)), cv = document.createElement("canvas"); cv.width = W0; cv.height = H0; const g = cv.getContext("2d"); g.scale(CLD.PX, CLD.PX); const rnd = cldRnd(seed || 7);
    try { (CLD_P[kind] || CLD_P.cu)(g, w, h, rnd); } catch (e) { console.warn("felhő", kind, e); }
    /* lágyítás: elmosott példány + rá az éles félig áttetszően → puha, de formás szél (ahol a böngésző nem tud szűrőt, ott éles marad) */
    const sf = CLD_SOFT[kind] || [1.2, .6], out = document.createElement("canvas"); out.width = W0; out.height = H0; const o = out.getContext("2d");
    try { o.filter = `blur(${sf[0]}px)`; } catch (e) {} o.drawImage(cv, 0, 0); try { o.filter = "none"; } catch (e) {} if (sf[1] > 0) { o.globalAlpha = sf[1]; o.drawImage(cv, 0, 0); o.globalAlpha = 1; }
    CLD.cache.set(key, out); return out; }
  const CLD_SOFT = { cu: [1.1, .62], cuc: [1.1, .62], cb: [1.3, .55], shelf: [1.4, .5], roll: [1.6, .45], ci: [1.2, .55], cs: [3, .3], cc: [1, .5], ac: [1.4, .5], acc: [1.2, .55], as: [3, .4], ns: [2, .45], sc: [1.8, .45], st: [3, .3], mam: [1.8, .5] };
  const CW = ["#ffffff", "#f3f5f9", "#cbd3df", "#dde3ec"];
  const CLD_P = {
    /* szépidő-gomoly (Cumulus humilis): lapos aljú, szélesebb, mint magas */
    cu: (g, w, h, rnd) => { const base = h * .88; cBody(g, rnd, cTurrets(rnd, w / 2, base, w * .4, h * .22, 3, w * .1), CW); cShadeV(g, w, h * .45, base, "rgba(104,116,138,.62)"); cShadeH(g, w * .35, w, h, "rgba(96,108,130,.16)"); cCut(g, w, base); },
    /* tornyosuló gomoly (Cumulus congestus): magasabb, mint széles, karfiolos tornyokkal */
    cuc: (g, w, h, rnd) => { const base = h * .93; cBody(g, rnd, cTurrets(rnd, w / 2, base, w * .36, h * .04, 4, w * .1), CW); cShadeV(g, w, h * .4, base, "rgba(88,100,124,.7)"); cShadeH(g, w * .3, w, h, "rgba(90,102,126,.22)"); cCut(g, w, base); },
    /* zivatarfelhő (Cumulonimbus): üllő + torony + túllövő csúcs + sötét alap + esőfüggöny */
    cb: (g, w, h, rnd) => { const base = h * .62, ay = h * .06, ab = h * .2;
      /* az üllő: a toronyból szétterülő, lapos tetejű, a szél irányában hosszan elnyúló lap */
      g.beginPath(); g.moveTo(w * .2, ab + h * .04); g.bezierCurveTo(w * .12, ay + h * .07, w * .26, ay, w * .45, ay - h * .01); g.bezierCurveTo(w * .72, ay - h * .02, w * .9, ay + h * .01, w * .995, ay + h * .045); g.bezierCurveTo(w * .96, ab - h * .05, w * .8, ab - h * .06, w * .62, ab); g.lineTo(w * .28, ab + h * .05); g.closePath();
      const ag = g.createLinearGradient(0, ay, 0, ab + h * .05); ag.addColorStop(0, "#fffdf6"); ag.addColorStop(.6, "#e3e6ec"); ag.addColorStop(1, "#9ea8b8"); g.fillStyle = ag; g.fill();
      g.save(); g.globalCompositeOperation = "source-atop"; for (let i = 0; i < 40; i++) cSoft(g, w * (.3 + rnd() * .7), ay + h * (.02 + rnd() * .12), 6 + rnd() * 12, 1 + rnd() * 2, "255,255,255", .35); g.restore();
      g.save(); g.strokeStyle = "rgba(245,246,248,.35)"; g.lineCap = "round"; for (let i = 0; i < 30; i++) { const x = w * (.86 + rnd() * .12), y = ay + h * (.015 + rnd() * .1); g.lineWidth = .3 + rnd() * .7; g.beginPath(); g.moveTo(x - 6, y); g.quadraticCurveTo(x, y - 1, x + 6 + rnd() * 8, y + rnd() * 1.5); g.stroke(); } g.restore();
      /* torony (a teteje belenő az üllő aljába) */
      cBody(g, rnd, cTurrets(rnd, w * .42, base, w * .24, ab - h * .02, 5, w * .07), ["#ffffff", "#eef0f4", "#b7c0ce", "#d3d9e3"]);
      cBody(g, rnd, cTurrets(rnd, w * .43, ay + h * .07, w * .07, ay - h * .035, 2, w * .04), CW);   /* túllövő csúcs az üllő fölött */
      cShadeV(g, w, h * .28, base, "rgba(40,48,64,.9)"); cShadeH(g, w * .3, w * .7, base, "rgba(60,70,90,.3)"); cCut(g, w, base + h * .01);
      /* esőfüggöny: puha, ferde sáv a felhőalap alatt */
      g.save(); g.beginPath(); g.moveTo(w * .26, base); g.lineTo(w * .6, base); g.lineTo(w * .55, h); g.lineTo(w * .19, h); g.closePath(); const rg = g.createLinearGradient(0, base, 0, h); rg.addColorStop(0, "rgba(64,74,92,.6)"); rg.addColorStop(1, "rgba(64,74,92,0)"); g.fillStyle = rg; g.fill();
      g.strokeStyle = "rgba(90,100,118,.25)"; for (let i = 0; i < 28; i++) { const x = w * (.27 + rnd() * .32); g.lineWidth = .4 + rnd() * .8; g.beginPath(); g.moveTo(x, base); g.lineTo(x - w * .05, h); g.stroke(); } g.restore(); },
    /* gallérfelhő (arcus / shelf cloud): ív alakú, sötét, lépcsőzetes felhőpad – alatta világos rés, itt csap le a szél */
    shelf: (g, w, h, rnd) => { const edge = (x) => h * (.5 + .09 * Math.sin(x / w * Math.PI) - .05 * (x / w));
      const back = g.createLinearGradient(0, 0, 0, h * .6); back.addColorStop(0, "#272d37"); back.addColorStop(.7, "#3f4652"); back.addColorStop(1, "#5b6370"); g.fillStyle = back; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); for (let x = w; x >= 0; x -= 3) g.lineTo(x, edge(x)); g.closePath(); g.fill();
      for (let i = 0; i < 40; i++) cSoft(g, rnd() * w, h * (.1 + rnd() * .3), 14 + rnd() * 24, 3 + rnd() * 4, rnd() < .5 ? "80,88,100" : "30,34,42", .35);
      /* a lépcsők (lamináris sávok) a homlokél alatt */
      for (let k = 0; k < 3; k++) { const off = h * (.06 + k * .075), th = h * (.035 - k * .006); g.beginPath(); for (let x = 0; x <= w; x += 3) { const y = edge(x) + off + Math.sin(x * .04 + k * 2) * h * .012; x ? g.lineTo(x, y - th) : g.moveTo(x, y - th); } for (let x = w; x >= 0; x -= 3) { const y = edge(x) + off + Math.sin(x * .04 + k * 2) * h * .012; g.lineTo(x, y + th); } g.closePath();
        const tg = g.createLinearGradient(0, edge(w / 2) + off - th, 0, edge(w / 2) + off + th); tg.addColorStop(0, "#b2bac5"); tg.addColorStop(.5, "#7a8390"); tg.addColorStop(1, "#4a515d"); g.fillStyle = tg; g.fill(); }
      /* világos homlokél és szakadozott foszlányok alul */
      g.strokeStyle = "rgba(200,206,214,.55)"; g.lineWidth = .8; g.beginPath(); for (let x = 0; x <= w; x += 3) { const y = edge(x) - .4; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      for (let i = 0; i < 26; i++) { const x = rnd() * w; cSoft(g, x, edge(x) + h * (.3 + rnd() * .12), 5 + rnd() * 9, 1.4 + rnd() * 2, "48,54,64", .6); } },
    /* görgőfelhő: vízszintes henger, felül világosabb */
    roll: (g, w, h, rnd) => { const cy = (x) => h * .5 + Math.sin(x * .03) * h * .06; g.beginPath(); for (let x = 2; x <= w - 2; x += 2) { const r = h * (.34 + .05 * Math.sin(x * .07)); x > 2 ? g.lineTo(x, cy(x) - r) : g.moveTo(x, cy(x) - r); } for (let x = w - 2; x >= 2; x -= 2) { const r = h * (.34 + .05 * Math.sin(x * .07)); g.lineTo(x, cy(x) + r); } g.closePath();
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#d3d8e0"); gr.addColorStop(.45, "#8f98a5"); gr.addColorStop(1, "#4a515e"); g.fillStyle = gr; g.fill(); g.save(); g.globalCompositeOperation = "source-atop"; for (let i = 0; i < 30; i++) cSoft(g, rnd() * w, h * (.2 + rnd() * .6), 8 + rnd() * 14, 1.5 + rnd() * 2.5, rnd() < .5 ? "230,234,240" : "50,56,66", .25); g.restore(); },
    /* pehelyfelhő (Cirrus): vékony, kampós szálak („lófarok”) */
    ci: (g, w, h, rnd) => { g.lineCap = "round"; for (let i = 0; i < 14; i++) { const x0 = rnd() * w * .75, y0 = h * (.2 + rnd() * .65), L = w * (.18 + rnd() * .3), hk = h * (.1 + rnd() * .16);
        for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(255,255,255,${.06 + rnd() * .16})`; g.lineWidth = .3 + rnd() * 1.4; const dy = (rnd() - .5) * 3.2, e = rnd() * .2; g.beginPath(); g.moveTo(x0 + e * L, y0 + dy); g.bezierCurveTo(x0 + L * .4, y0 + dy - 1.2, x0 + L * .78, y0 + dy + 1, x0 + L * (.95 + e * .2), y0 + dy - hk * (.7 + rnd() * .4)); g.stroke(); } } },
    /* fátyolfelhő (Cirrostratus): tejszerű fátyol, halvány csíkokkal */
    cs: (g, w, h, rnd) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,.02)"); gr.addColorStop(.5, "rgba(250,252,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,.06)"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) cSoft(g, rnd() * w, h * (.25 + rnd() * .5), 20 + rnd() * 30, 2 + rnd() * 3, "255,255,255", .18); },
    /* bárányfelhő (Cirrocumulus): apró, puha fodrok hullámzó sorokban */
    cc: (g, w, h, rnd) => { for (let r = 0; r < 8; r++) for (let c = 0; c < 30; c++) { if (rnd() < .2) continue; const x = c * w / 29 + (r % 2) * w / 58 + (rnd() - .5) * 2, y = h * .14 + r * h * .1 + Math.sin(c * .45 + r * .8) * 2.2; cSoft(g, x + .4, y + .5, 2 + rnd() * 1, 1.1 + rnd() * .5, "170,182,200", .45); cSoft(g, x, y, 1.8 + rnd() * 1.1, 1.1 + rnd() * .6, "255,255,255", .95); } },
    /* párnafelhő (Altocumulus): közepes, puha, árnyékos aljú „párnák” hullámzó sorokban */
    ac: (g, w, h, rnd) => { for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) { if (rnd() < .12) continue; const x = c * w / 8.3 + (r % 2) * w / 16.6 + (rnd() - .5) * 4, y = h * .2 + r * h * .2 + Math.sin(c * .7 + r) * 2.5, rr2 = 4 + rnd() * 3.5;
        for (let k = 0; k < 4; k++) { const ox = (rnd() - .5) * rr2 * 1.6, oy = (rnd() - .5) * rr2 * .5; cSoft(g, x + ox + rr2 * .25, y + oy + rr2 * .35, rr2 * 1.05, rr2 * .62, "120,132,152", .55); cSoft(g, x + ox, y + oy, rr2, rr2 * .6, "255,255,255", .95); } } },
    /* tornyocskás párnafelhő (Altocumulus castellanus): közös, lapos alapról kis tornyok – reggel a délutáni zivatar előjele */
    acc: (g, w, h, rnd) => { const base = h * .82; for (let c = 0; c < 9; c++) { const x = w * (.06 + c * .11) + (rnd() - .5) * 3, tw = 3.2 + rnd() * 2, th = h * (.22 + rnd() * .42); cBody(g, rnd, cTurrets(rnd, x, base, tw * 1.7, base - th, 1, tw * .9), CW); }
      cShadeV(g, w, base - h * .3, base, "rgba(112,124,146,.6)"); cCut(g, w, base); },
    /* lepelfelhő (Altostratus): szürke, egyenletes lepel – a nap csak elmosódott foltként látszik */
    as: (g, w, h, rnd) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(150,160,174,.15)"); gr.addColorStop(.35, "rgba(150,160,174,.85)"); gr.addColorStop(1, "rgba(118,128,144,.92)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) cSoft(g, rnd() * w, h * (.3 + rnd() * .7), 10 + rnd() * 18, 2 + rnd() * 4, "175,183,195", .35); },
    /* esőrétegfelhő (Nimbostratus): vastag, sötét, rongyos aljú réteg */
    ns: (g, w, h, rnd) => { const gr = g.createLinearGradient(0, 0, 0, h * .75); gr.addColorStop(0, "#5c6471"); gr.addColorStop(1, "#3c424d"); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); for (let x = w; x >= 0; x -= 4) g.lineTo(x, h * (.62 + Math.sin(x * .08) * .04 + rnd() * .04)); g.closePath(); g.fill();
      for (let i = 0; i < 40; i++) cSoft(g, rnd() * w, h * (.15 + rnd() * .45), 10 + rnd() * 18, 2 + rnd() * 4, rnd() < .5 ? "100,108,120" : "40,44,52", .3); for (let i = 0; i < 46; i++) cSoft(g, rnd() * w, h * (.64 + rnd() * .14), 4 + rnd() * 9, 1.5 + rnd() * 2.4, "64,70,82", .7); },
    /* gomolyos rétegfelhő (Stratocumulus): nagy, lapos, szürkés gomolyok sávban, közöttük kék rések */
    sc: (g, w, h, rnd) => { for (let i = 0; i < 22; i++) { const x = rnd() * w, y = h * (.35 + rnd() * .35), rx = 10 + rnd() * 12; for (let k = 0; k < 4; k++) { const ox = (rnd() - .5) * rx, oy = (rnd() - .5) * rx * .25; cSoft(g, x + ox + 2, y + oy + 2.5, rx * .8, rx * .34, "112,122,140", .7); cSoft(g, x + ox, y + oy, rx * .75, rx * .3, "246,248,251", .9); } } },
    /* rétegfelhő (Stratus) / köd: egyenletes, alacsony, szürke sáv */
    st: (g, w, h, rnd) => { for (let i = 0; i < 60; i++) cSoft(g, rnd() * w, h * (.3 + rnd() * .5), 18 + rnd() * 30, 4 + rnd() * 8, "196,202,210", .35); },
    /* emlőfelhő (mammatus): az üllő alján lelógó, alulról megvilágított zsákok */
    mam: (g, w, h, rnd) => { const gr = g.createLinearGradient(0, 0, 0, h * .4); gr.addColorStop(0, "#474b58"); gr.addColorStop(1, "#6e6a72"); g.fillStyle = gr; g.fillRect(0, 0, w, h * .34);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 16; c++) { if (rnd() < .15) continue; const x = c * w / 15 + (r % 2) * w / 30 + (rnd() - .5) * 4, y = h * (.34 + r * .13), rr2 = 3.5 + rnd() * 3.5; const q = g.createRadialGradient(x - rr2 * .3, y + rr2 * .6, .5, x, y + rr2 * .15, rr2 * 1.3); q.addColorStop(0, "#f2c9a2"); q.addColorStop(.5, "#a88c90"); q.addColorStop(1, "rgba(90,86,100,0)"); g.fillStyle = q; g.beginPath(); g.ellipse(x, y, rr2 * 1.15, rr2 * 1.05, 0, 0, TAU); g.fill(); } }
  };
