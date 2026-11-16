  /* ============================================================================================ 05y – VERSENY: A FEDÉLZETI MŰSZER ÚJ KIJELZŐJE
     2026-11-15 18:39 (tulajdonos): „a műszert szeretném sokkal közérthetőbbre és használhatóbbra kidolgozni”.
     A régi kijelzőn tucatnyi apró felirat versengett (szakaszsáv, iránytűgyűrű, rangsor, VMG, irány …) – VR-ben, fél méterről nem lehetett elolvasni,
     és nem derült ki egy pillantásra, MIT KELL TENNI. Az új elrendezés a versenyhajók műszereinek (B&G, Vakaros) logikáját követi, három szintben:
       1) FENT, NAGYBAN: hová mész most (a következő bója / a rajt- vagy célvonal), melyik oldalán kerüld, milyen messze van – és egy kormányzó-tárcsa:
          a nagy arany nyíl mutatja, merre van a cél a hajó orrához képest; a piros cikk a szél felőli „holtszög” (oda nem lehet egyenesen menni).
       2) KÖZÉPEN: egyetlen mondat arról, mit tegyél (fordulj, cirkálj, kerüld bal kéz felől, rajt …) – és egy egyszerű, orral felfelé álló térkép:
          a pálya, a cirkálóhatárok, az ellenfelek, és a vízen látható széllökések (sötét) és lavórok (világos).
       3) LENT, NÉGY NAGY SZÁM: sebesség, helyezés, idő, szél (lökés / lavór jelzéssel).
     A régi rajzoló (vrChartOld) megmarad a kódban, de nem hívjuk. */
  const MU = { font: (w, px) => `${w} ${px}px Inter, system-ui, -apple-system, "Segoe UI", sans-serif`, rcol: ["#7fd3ff", "#b6f09c", "#f5a6ff", "#ffd9a0"] };
  function muFit(g, txt, maxW, px, w) { let s = px; g.font = MU.font(w, s); while (s > 12 && g.measureText(txt).width > maxW) { s -= 2; g.font = MU.font(w, s); } return s; }
  function muPill(g, x, y, w, h, r, fill, stroke, lw) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 3; g.stroke(); } }
  function vrChart() {
    const S = VRR, t = S.ck && S.ck.chartT; if (!t || !S.C) return; const g = t._canvas.getContext("2d"), N = 1024, NH = t._canvas.height, XH = NH - 1024, C = S.C, F = MU.font;   /* 2026-11-16 18:44: a vászon magasabb (a kisebb SZÜNET gomb helyén nagyobb kijelző) – a többletet (XH) a térkép kapja
    /* ---- a pillanatnyi feladat */
    const lineMid = { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 }, gate = S.st === "pre" || !!S.ocs || (S.st === "race" && !S.started) || S.next >= S.marks.length;
    const finNow = S.started && !S.ocs && S.next >= S.marks.length, tg = gate ? (finNow ? finMid() : lineMid) : S.marks[S.next];
    const dT = Math.hypot(tg.x - S.x, tg.z - S.z), brgT = Math.atan2(tg.x - S.x, -(tg.z - S.z)), relT = wrapA(brgT - S.b), vmg = S.v * Math.cos(relT), eta = vmg > .4 ? dT / vmg : null;
    const hint = vrHint(S, tg, dT, relT, gate, finNow), upwind = Math.abs(wrapA(brgT - S.wf)) * R2D < 42, lw = S.lw || { g: 0, l: 0 };
    g.fillStyle = "#04111d"; g.fillRect(0, 0, N, NH);
    /* ================= 1) FELSŐ TÁBLA ================= */
    muPill(g, 14, 14, 996, 290, 26, "#0b2236", "#24506f", 3);
    const lbl = S.pen > 0 ? "BÜNTETÉS" : S.ocs ? "KORAI RAJT" : S.st === "pre" ? "RAJT ELŐTT" : S.fin ? "BEFUTOTTÁL" : "KÖVETKEZŐ CÉL";
    const mkN = !gate && !S.fin ? S.marks[S.next] : null, name = S.fin ? "CÉL ✓" : S.ocs ? "VISSZA A VONAL MÖGÉ" : gate ? (finNow ? "CÉLVONAL" : "RAJTVONAL") : vrMkName(mkN, S.next).toUpperCase(), of = !gate && !S.fin ? ` / ${S.marks.length}` : "";
    g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillStyle = "#ffd166"; g.font = F(800, 32); g.fillText(lbl, 44, 66);
    { const s = muFit(g, name, 500, 80, 900); g.fillStyle = "#ffffff"; g.fillText(name, 44, 64 + s * .98); const w0 = g.measureText(name).width; if (of) { g.font = F(700, 40); g.fillStyle = "#7f9fb8"; g.fillText(of, 44 + w0 + 8, 64 + s * .98); } }
    /* kerülés iránya – nemzetközi színekkel: bal kéz felől = PIROS (port), kapu = zöld */
    { const y = 164; if (S.fin) { muPill(g, 40, y, 520, 54, 27, "#1e8e4f"); g.fillStyle = "#fff"; g.font = F(800, 32); g.fillText("🏁  gratulálunk!", 64, y + 38); }
      else if (gate) { muPill(g, 40, y, 520, 54, 27, "#1e8e4f"); g.fillStyle = "#fff"; muFit(g, finNow ? "⇥  a két célbója KÖZÖTT át" : "⇥  a két rajtbója KÖZÖTT át", 480, 32, 800); g.fillText(finNow ? "⇥  a két célbója KÖZÖTT át" : "⇥  a két rajtbója KÖZÖTT át", 64, y + 38); }
      /* 2026-11-15: kapu a pálya közepén = zöld „KÖZÖTT át”; jobb kéz felőli jel = ZÖLD (starboard); bal kéz felőli = PIROS (port) */
      else if (mkN && mkN.gate) { muPill(g, 40, y, 520, 54, 27, "#1e8e4f"); g.fillStyle = "#fff"; g.font = F(800, 32); g.fillText("⇥  KAPU: a két bója KÖZÖTT át", 64, y + 38); }
      else if (mkN && mkN.sd === -1) { muPill(g, 40, y, 520, 54, 27, "#1e8e4f"); g.fillStyle = "#fff"; g.font = F(800, 32); g.fillText("↻  JOBB KÉZ FELŐL kerüld", 64, y + 38); }
      else { muPill(g, 40, y, 520, 54, 27, "#c9302c"); g.fillStyle = "#fff"; g.font = F(800, 32); g.fillText("↺  BAL KÉZ FELŐL kerüld", 64, y + 38); } }
    /* távolság + érkezés */
    { g.fillStyle = "#ffffff"; g.font = F(900, 58); const ds = dT >= 1000 ? (dT / 1000).toFixed(1).replace(".", ",") + " km" : Math.round(dT) + " m"; g.fillText(ds, 44, 284); const w0 = g.measureText(ds).width;
      if (eta != null && eta < 3600 && !S.fin) { g.font = F(700, 34); g.fillStyle = "#9fc3dc"; g.fillText("· " + mmss(eta), 44 + w0 + 14, 282); } }
    /* kormányzó-tárcsa: a hajó orra felfelé; a nagy arany nyíl a cél iránya; piros cikk = a szél felőli holtszög */
    { const cx = 812, cy = 150, R = 118; g.save(); g.translate(cx, cy);
      g.fillStyle = "#061829"; g.beginPath(); g.arc(0, 0, R + 10, 0, TAU); g.fill(); g.strokeStyle = "#2f6a90"; g.lineWidth = 4; g.stroke();
      for (let d = 0; d < 360; d += 15) { const a = d * D2R, big = d % 45 === 0; g.strokeStyle = big ? "#cfe3f2" : "#4c7894"; g.lineWidth = big ? 4 : 2; g.beginPath(); g.moveTo(Math.sin(a) * (R - (big ? 16 : 9)), -Math.cos(a) * (R - (big ? 16 : 9))); g.lineTo(Math.sin(a) * R, -Math.cos(a) * R); g.stroke(); }
      const wa = wrapA(S.wf - S.b); g.fillStyle = "rgba(229,57,47,.32)"; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R - 2, wa - 42 * D2R - Math.PI / 2, wa + 42 * D2R - Math.PI / 2); g.closePath(); g.fill();
      /* szélnyíl a peremen kívülről befelé */
      g.save(); g.rotate(wa); g.fillStyle = "#58c7ff"; g.beginPath(); g.moveTo(0, -R + 22); g.lineTo(14, -R - 6); g.lineTo(-14, -R - 6); g.closePath(); g.fill(); g.restore();
      /* hajó-sziluett középen */
      g.fillStyle = "#e9f2f8"; g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(15, -8, 11, 26); g.lineTo(-11, 26); g.quadraticCurveTo(-15, -8, 0, -30); g.closePath(); g.fill();
      /* a cél iránya */
      const good = Math.abs(relT) < 7 * D2R && !upwind, col = good ? "#3ddc84" : upwind ? "#ff9a8a" : "#ffd166"; g.save(); g.rotate(relT); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 16; g.lineCap = "round";
      g.beginPath(); g.moveTo(0, -36); g.lineTo(0, -R + 40); g.stroke(); g.beginPath(); g.moveTo(0, -R + 6); g.lineTo(26, -R + 46); g.lineTo(-26, -R + 46); g.closePath(); g.fill(); g.restore(); g.restore();
      const deg = Math.round(Math.abs(relT) * R2D), txt = S.fin ? "" : upwind && !gate ? "CIRKÁLJ" : good ? "✓ EGYENESEN" : (relT > 0 ? "JOBBRA " : "BALRA ") + deg + "°";
      g.textAlign = "center"; g.fillStyle = good ? "#3ddc84" : upwind ? "#ff9a8a" : "#ffffff"; muFit(g, txt, 330, 40, 900); g.fillText(txt, cx, 296 - 12); g.textAlign = "left"; }
    /* ================= 2) MIT TEGYÉL – egy mondat ================= */
    { muPill(g, 14, 318, 996, 78, 20, hint[1]); g.fillStyle = "#ffffff"; g.textAlign = "center"; muFit(g, hint[0], 960, 36, 800); g.fillText(hint[0], 512, 369); g.textAlign = "left"; }
    /* ================= 2b) TÉRKÉP – orral felfelé, a hajó alul-középen ================= */
    { const X0 = 14, Y0 = 410, Wm = 996, Hm = 396 + XH, ox = X0 + Wm / 2, oy = Y0 + Hm * .74; g.save(); muPill(g, X0, Y0, Wm, Hm, 22, "#0a2a43", "#24506f", 3); g.beginPath(); if (g.roundRect) g.roundRect(X0, Y0, Wm, Hm, 22); else g.rect(X0, Y0, Wm, Hm); g.clip();
      const span = clamp(Math.max(dT * 1.25, 110), 110, 1400), k = (Hm * .68) / span, c0 = Math.cos(-S.b), s0 = Math.sin(-S.b);
      const P = (x, z) => { const dx = x - S.x, dz = z - S.z; return [ox + (dx * c0 - dz * s0) * k, oy + (dx * s0 + dz * c0) * k]; };
      const dir = (b) => { const a = b - S.b; return [Math.sin(a), -Math.cos(a)]; };
      /* széllökések (sötét) és lavórok (világos) a vízen – ugyanabból a szélmezőből, amit a vízen látsz */
      try { const NX = 30, NY = 12, cw = Wm / NX, ch = Hm / NY; for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const sx = X0 + (i + .5) * cw, sy = Y0 + (j + .5) * ch, dx = (sx - ox) / k, dz = (sy - oy) / k, wx = S.x + dx * Math.cos(S.b) - dz * Math.sin(S.b), wz = S.z + dx * Math.sin(S.b) + dz * Math.cos(S.b), f = rwFieldAt(wx, wz);
          if (f[0] > .2) { g.fillStyle = `rgba(2,10,22,${Math.min(.55, (f[0] - .2) * 1.1)})`; g.beginPath(); g.arc(sx, sy, cw * .75, 0, TAU); g.fill(); }
          if (f[1] > .2) { g.fillStyle = `rgba(200,236,255,${Math.min(.42, (f[1] - .2) * .9)})`; g.beginPath(); g.arc(sx, sy, cw * .75, 0, TAU); g.fill(); } } } catch (e) {}
      /* távolsággyűrűk */
      const step = span > 700 ? 200 : span > 300 ? 100 : 50; g.strokeStyle = "rgba(127,211,255,.18)"; g.lineWidth = 2; g.setLineDash([6, 10]); for (let r = step; r * k < Hm; r += step) { g.beginPath(); g.arc(ox, oy, r * k, 0, TAU); g.stroke(); } g.setLineDash([]);
      /* a pálya: a hátralévő szakaszok */
      const way = [lineMid].concat(S.marks.map((m) => ({ x: m.x, z: m.z })), [finMid()]);
      for (let i = 0; i < way.length - 1; i++) { const a = P(way[i].x, way[i].z), b = P(way[i + 1].x, way[i + 1].z); g.setLineDash([16, 12]); g.lineWidth = 5; g.strokeStyle = i < S.next ? "rgba(160,180,200,.18)" : "rgba(255,209,102,.55)"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } g.setLineDash([]);
      /* cirkálóhatárok a szél felőli célhoz (zöld szaggatott): ha ezt eléred, fordulhatsz */
      if (upwind && !gate) { const b = P(tg.x, tg.z); g.strokeStyle = "rgba(61,220,132,.75)"; g.lineWidth = 4; g.setLineDash([12, 10]); [-44, 44].forEach((d) => { const v = dir(S.wf + Math.PI + d * D2R); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] + v[0] * 1400, b[1] + v[1] * 1400); g.stroke(); }); g.setLineDash([]); }
      /* rajt- és célvonal */
      const line = (A, B, on, col) => { const a = P(A.x, A.z), b = P(B.x, B.z); g.strokeStyle = on ? col : "rgba(255,255,255,.4)"; g.lineWidth = on ? 9 : 4; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); [a, b].forEach((q) => { g.fillStyle = on ? col : "#fff"; g.beginPath(); g.arc(q[0], q[1], on ? 13 : 8, 0, TAU); g.fill(); }); };
      line(C.line.a, C.line.b, gate && !finNow, "#3ddc84"); if (C.fin) line(C.fin.a, C.fin.b, finNow, "#ffe14d"); else if (finNow) line(C.line.a, C.line.b, true, "#ffe14d");
      /* bóják; a következőnél a kerülési ív (az óramutatóval ellentétes, a bója BAL kéz felől marad) */
      S.marks.forEach((m, i) => { const [x, y] = P(m.x, m.z), cur = i === S.next && !gate, done = i < S.next, r = cur ? 24 : 15;
        /* 2026-11-15: kapu = két pont, köztük a vonal (az aktuális zöld); jobb kéz felőli jelnél az ív az óramutató járásával egyező, zöld */
        if (m.gate) { const a = P(m.gate.a.x, m.gate.a.z), b = P(m.gate.b.x, m.gate.b.z); g.strokeStyle = done ? "rgba(47,191,113,.6)" : cur ? "#3ddc84" : "rgba(233,242,58,.75)"; g.lineWidth = cur ? 8 : 5; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
          [a, b].forEach((q) => { g.beginPath(); g.arc(q[0], q[1], cur ? 13 : 9, 0, TAU); g.fillStyle = done ? "#2fbf71" : "#e9f23a"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#fff"; g.stroke(); });
          g.fillStyle = "#fff"; g.font = F(800, cur ? 24 : 18); g.textAlign = "center"; g.fillText(done ? "✓" : "K", x, y - 14); g.textAlign = "left"; return; }
        if (cur) { const stb = m.sd === -1, col = stb ? "#3ddc84" : "#ff6b5a", Ra = Math.max(24 * k, r + 20), a0 = Math.atan2(oy - y, ox - x) + (stb ? .8 : -.8), th = a0 + (stb ? 1 : -1) * Math.PI * 1.45;
          g.strokeStyle = col; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.arc(x, y, Ra, a0, th, !stb); g.stroke(); g.lineCap = "butt";
          const ex = x + Ra * Math.cos(th), ey = y + Ra * Math.sin(th), tx = (stb ? -1 : 1) * Math.sin(th), ty = (stb ? 1 : -1) * Math.cos(th); g.fillStyle = col; g.beginPath(); g.moveTo(ex + tx * 18, ey + ty * 18); g.lineTo(ex + Math.cos(th) * 13 - tx * 6, ey + Math.sin(th) * 13 - ty * 6); g.lineTo(ex - Math.cos(th) * 13 - tx * 6, ey - Math.sin(th) * 13 - ty * 6); g.closePath(); g.fill(); }
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = done ? "#2fbf71" : cur ? "#ffb703" : "#ff7a00"; g.fill(); g.lineWidth = m.sd === -1 && !done ? 6 : 4; g.strokeStyle = m.sd === -1 && !done ? "#3ddc84" : "#fff"; g.stroke();
        g.fillStyle = done ? "#fff" : "#0b1b2a"; g.font = F(900, cur ? 30 : 20); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(done ? "✓" : String(i + 1), x, y + 1); g.textBaseline = "alphabetic"; });
      /* ellenfelek */
      (S.riv || []).forEach((r, i) => { if (!r || r.out) return; const [x, y] = P(r.x, r.z), col = MU.rcol[i % MU.rcol.length]; g.save(); g.translate(x, y); g.rotate(r.b - S.b); g.fillStyle = col; g.strokeStyle = "#04121f"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -20); g.quadraticCurveTo(11, -5, 8, 15); g.lineTo(-8, 15); g.quadraticCurveTo(-11, -5, 0, -20); g.closePath(); g.fill(); g.stroke(); g.restore();
        if (r.pen > 0) { g.strokeStyle = "#ff4b3a"; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 26, 0, TAU); g.stroke(); } const nm = String((r.o && r.o.name) || "").split(" ")[0].slice(0, 9); g.font = F(700, 22); g.textAlign = "left"; g.lineWidth = 5; g.strokeStyle = "#04121f"; g.strokeText(nm, x + 16, y - 12); g.fillStyle = col; g.fillText(nm, x + 16, y - 12); });
      /* saját hajó */
      g.save(); g.translate(ox, oy); g.shadowColor = "rgba(255,90,70,.9)"; g.shadowBlur = 18; g.fillStyle = "#ff4b3a"; g.strokeStyle = "#fff"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -34); g.quadraticCurveTo(19, -9, 14, 26); g.lineTo(-14, 26); g.quadraticCurveTo(-19, -9, 0, -34); g.closePath(); g.fill(); g.shadowBlur = 0; g.stroke(); g.restore();
      /* szélnyíl és jelmagyarázat a bal felső sarokban */
      { const w = dir(S.wf), a = Math.atan2(w[1], w[0]); g.save(); g.translate(X0 + 70, Y0 + 72); g.rotate(a + Math.PI / 2); g.fillStyle = "#58c7ff"; g.beginPath(); g.moveTo(0, 30); g.lineTo(20, -4); g.lineTo(8, -4); g.lineTo(8, -30); g.lineTo(-8, -30); g.lineTo(-8, -4); g.lineTo(-20, -4); g.closePath(); g.fill(); g.restore();
        g.textAlign = "left"; g.fillStyle = "#58c7ff"; g.font = F(800, 24); g.fillText("SZÉL", X0 + 112, Y0 + 66); g.fillStyle = "#cfe3f2"; g.font = F(600, 20); g.fillText("sötét folt = lökés · világos = lavór", X0 + 112, Y0 + 94); }
      g.restore(); }
    /* ================= 3) NÉGY NAGY SZÁM ================= */
    { const y0 = 822 + XH, cw = 248; const cell = (i, top, big, unit, col, badge) => { const x = 14 + i * (cw + 1.3); muPill(g, x, y0, cw - 6, 188, 20, "#0b2236", "#24506f", 3); g.textAlign = "center"; g.fillStyle = "#7fd3ff"; g.font = F(800, 26); g.fillText(top, x + cw / 2 - 3, y0 + 40);
        g.fillStyle = col || "#fff"; muFit(g, big, cw - 30, 88, 900); g.fillText(big, x + cw / 2 - 3, y0 + 128); if (unit) { g.fillStyle = "#9fc3dc"; g.font = F(700, 24); g.fillText(unit, x + cw / 2 - 3, y0 + 166); }
        if (badge) { muPill(g, x + 16, y0 + 140, cw - 38, 38, 19, badge[1]); g.fillStyle = badge[2] || "#fff"; g.font = F(800, 22); g.fillText(badge[0], x + cw / 2 - 3, y0 + 166); } };
      cell(0, "SEBESSÉG", (S.v / KN).toFixed(1).replace(".", ","), "csomó");
      if (KEK.on && S.C && S.C.kek) { const rk = kekRank(), me = rk.findIndex((q) => q.me) + 1; cell(1, "ÖSSZETETT", S.st === "pre" ? "–" : `${me}.`, `a ${rk.length} hajóból`); }   /* Kékszalag (05zc) */
      else cell(1, "HELYEZÉS", S.st === "pre" ? "–" : `${S.fin ? S.res.findIndex((q) => q.me) + 1 : vrPlace()}.`, `a ${(S.riv || []).length + 1} hajóból`);
      if (KEK.on && S.C && S.C.kek && S.st !== "pre") cell(2, "ÖSSZIDŐ", kekHms(KEK.T + (S.st === "kek" || KEK.done ? 0 : S.t)), `${KEK.si + 1}/${KEK_ST.length}. szakasz`, null);
      else cell(2, S.st === "pre" ? "RAJTIG" : "IDŐ", mmss(S.st === "pre" ? -S.t : S.t), S.st === "pre" ? (S.t > -10 ? "KÉSZÜLJ!" : "perc:mp") : "perc:mp", S.st === "pre" && S.t > -10 ? "#ffd166" : null);
      const wk = (S.tws * (S.gk || 1)) / KN, bd = lw.g > .35 ? [`LÖKÉS +${Math.round((lw.k - 1) * 100)}%`, "#0d3f6e"] : lw.l > .35 ? [`LAVÓR −${Math.round((1 - lw.k) * 100)}%`, "#cfe9f7", "#06223a"] : null;
      cell(3, "SZÉL", wk.toFixed(0), bd ? "" : "csomó", null, bd); g.textAlign = "left"; }
    t.needsUpdate = true;
  }
