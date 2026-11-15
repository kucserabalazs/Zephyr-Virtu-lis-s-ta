  /* =================================================================== 2/Q. A KIKÖTŐ OKTATÓHÁZAI (2026. nov. 15., a tulajdonos jóváhagyta a kikötő-jelentés tervét:
     7 + 1 ház, „nagyon igényes legyen az elrendezés és szép”; jelölés: B + C – jelzőzászló az oromzaton és saját szín az ajtó- és ablakkereten,
     a tetőgerincen, a móló tövétől a házig vezető ösvénycsíkon és a kikötőtérképen).
     A házak a part mentén, a sétány mögött állnak, a kikötő felé néznek (2026. nov. 15. este: tömörebben, a kikötői tér két oldalán – nyugatra a Mentőmellény-pont, a Csomózóház és a Viharjelző torony, keletre a Természetvédelmi ház és a Magyar Ízek Háza; korábban 60 m-en szétszórva); a Vitorlásiskola és az Elsősegély cölöpökön a víz fölött, egymás mellett,
     közös fedett tornáccal; a világítótorony a keleti hullámtörő végén. A belső tér (tábla, tanár, szék, könyv, tanulók) a 05o-ban él. */
  const HOUSES = [
    { id: "izek", name: "Magyar Ízek Háza", sub: "ételek · borok · hungarikumok", col: "#8e1b2e", flag: "E", kind: "csarda", box: { x0: 15.4, x1: 24.4, z0: 13.2, z1: 19.6 }, teacher: "anya", voice: "berta" },
    { id: "ter", name: "Természetvédelmi ház", sub: "a Balaton élővilága", col: "#3d9a4b", flag: "A", kind: "cabin", box: { x0: 4.6, x1: 11.6, z0: 13, z1: 18.6 }, teacher: "apa", voice: "imre" },
    { id: "vih", name: "Viharjelző torony", sub: "vihar, felhők, szél", col: "#e0a800", flag: "Y", kind: "tower", box: { x0: -29.0, x1: -23.4, z0: 13, z1: 18.4 }, teacher: "matroz2", voice: "berta" },   /* 2026-11-15: az előadó nő (Kovács Réka, ~30 éves meteorológus) – női hang */
    { id: "cso", name: "Csomózóház", sub: "csomók és kötélmunka", col: "#7a4ea3", flag: "K", kind: "cabin", box: { x0: -20.2, x1: -14.6, z0: 13, z1: 18.2 }, teacher: "matroz4", voice: "imre" },
    { id: "mel", name: "Mentőmellény-pont", sub: "mellény, mentőöv, mentés", col: "#f07a12", flag: "O", kind: "cabin", box: { x0: -11.2, x1: -6.2, z0: 12.6, z1: 17.4 }, teacher: "matroz1", voice: "imre" },
    { id: "isk", name: "Vitorlásiskola", sub: "a nagypapa szabályai", col: "#2f6fb7", flag: "P", kind: "school", box: { x0: 3.5, x1: 9.5, z0: -1.5, z1: 4 }, teacher: "nagypapa", voice: "imre" },
    { id: "els", name: "Elsősegély", sub: "a nagymama tanít", col: "#d0342c", flag: "W", kind: "cabin", stilts: true, box: { x0: 11.2, x1: 16.2, z0: -1.5, z1: 4 }, teacher: "nagymama", voice: "anna" },
    { id: "vil", name: "Világítótorony", sub: "fények és jelek éjjel", col: "#14a0a6", flag: "L", kind: "light", box: { x0: 25.9, x1: 30.9, z0: -29.8, z1: -24.8 }, teacher: "orseg", voice: "imre" }
  ];
  const HOUSES_FOOT = HOUSES.map((h) => [h.box.x0, h.box.x1, h.box.z0, h.box.z1]);
  const HZ = { flags: [], beams: [], lamps: [] };
  /* nemzetközi jelzőzászlók (a 05o-tervrajz szerint) – vászon-rajz 96 × 64 */
  function icsFlag(g, f, w, h) { const B = "#1f4fa0", Y = "#f2c200", R = "#d0342c", Wt = "#ffffff", K = "#111111", r = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(x * w, y * h, ww * w, hh * h); };
    if (f === "P") { r(0, 0, 1, 1, B); r(.3, .3, .4, .4, Wt); }
    else if (f === "W") { r(0, 0, 1, 1, B); r(.15, .15, .7, .7, Wt); r(.32, .32, .36, .36, R); }
    else if (f === "O") { g.fillStyle = Y; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h); g.closePath(); g.fill(); g.fillStyle = R; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, h); g.lineTo(w, h); g.closePath(); g.fill(); }
    else if (f === "Y") { r(0, 0, 1, 1, Y); g.fillStyle = R; for (let k = -4; k < 8; k += 2) { g.beginPath(); g.moveTo(k * w / 6, h); g.lineTo((k + 1) * w / 6, h); g.lineTo((k + 1) * w / 6 + h, 0); g.lineTo(k * w / 6 + h, 0); g.closePath(); g.fill(); } }
    else if (f === "K") { r(0, 0, .5, 1, Y); r(.5, 0, .5, 1, B); }
    else if (f === "A") { r(0, 0, .5, 1, Wt); g.fillStyle = B; g.beginPath(); g.moveTo(w * .5, 0); g.lineTo(w, 0); g.lineTo(w * .8, h / 2); g.lineTo(w, h); g.lineTo(w * .5, h); g.closePath(); g.fill(); }
    else if (f === "L") { r(0, 0, .5, .5, Y); r(.5, 0, .5, .5, K); r(0, .5, .5, .5, K); r(.5, .5, .5, .5, Y); }
    else if (f === "E") { r(0, 0, 1, .5, B); r(0, .5, 1, .5, R); }
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); }
  /* lobogó zászló a ház fölött: rúd + 8 részes, a szélben hullámzó lap (a hullámzást a hbTick-ből hívott houseTick végzi) */
  function houseFlag(G, h, x, y, z, H) { const white = std({ color: "#f2f2ee", roughness: .4 }); mesh(new THREE.CylinderGeometry(.03, .04, H, 8).translate(x, y + H / 2, z), white, G); mesh(new THREE.SphereGeometry(.06, 10, 8).translate(x, y + H + .03, z), std({ color: "#c9a23a", metalness: .8, roughness: .3 }), G);
    const tx = canvasTex(192, 128, (g, w, hh) => icsFlag(g, h.flag, w, hh)); const fg = new THREE.PlaneGeometry(1.05, .7, 8, 1); fg.translate(.53, 0, 0); const fl = mesh(fg, std({ map: tx, roughness: .8, side: THREE.DoubleSide }), G); fl.position.set(x + .03, y + H - .4, z); fl.userData.base = fg.attributes.position.array.slice(); fl.userData.noMerge = true; fl.userData.ph = rand() * 9; HZ.flags.push(fl); return fl; }
  /* faragott névtábla a bejárat fölé (a ház színével keretezve; a betűtípus a meglévő UIF) */
  function houseSign(h) { return canvasTex(1024, 300, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, "#7a5532"); gr.addColorStop(1, "#5a3c22"); g.fillStyle = gr; g.fillRect(0, 0, w, hh); for (let k = 0; k < 60; k++) { g.strokeStyle = "rgba(40,24,10,.35)"; g.lineWidth = rr(1, 3); const y = rr(0, hh); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + rr(-6, 6)); g.stroke(); }
      g.strokeStyle = h.col; g.lineWidth = 22; g.strokeRect(11, 11, w - 22, hh - 22); g.strokeStyle = "#3a2614"; g.lineWidth = 6; g.strokeRect(26, 26, w - 52, hh - 52);
      g.textAlign = "center"; let fs = 96; g.font = `900 ${fs}px ${UIF}`; while (g.measureText(h.name.toUpperCase()).width > w - 120 && fs > 50) { fs -= 4; g.font = `900 ${fs}px ${UIF}`; }
      g.fillStyle = "rgba(20,10,0,.7)"; g.fillText(h.name.toUpperCase(), w / 2 + 4, 150); g.fillStyle = "#ffd98a"; g.fillText(h.name.toUpperCase(), w / 2, 146);
      g.font = `700 44px ${UIF}`; g.fillStyle = "#fff3d6"; g.fillText(h.sub + " · gyere be!", w / 2, 230); }); }
  function houseLantern(G, x, y, z) { const lg = new THREE.Group(); lg.position.set(x, y, z); G.add(lg); const blk = std({ color: "#1c1c1c", roughness: .5, metalness: .6 });
    mesh(new THREE.CylinderGeometry(.09, .11, .04, 10).translate(0, -.15, 0), blk, lg); const gm = new THREE.MeshStandardMaterial({ color: "#ffd88a", emissive: "#ffb347", emissiveIntensity: 1.4, transparent: true, opacity: .85 }); W.disposables.push(gm); mesh(new THREE.CylinderGeometry(.075, .085, .2, 10, 1, true), gm, lg);
    mesh(new THREE.ConeGeometry(.11, .1, 10).translate(0, .15, 0), blk, lg); return lg; }

  /* ---------------------------------------------------------------- RÖNKHÁZ (az iskola rönkházának általánosítása)
     o: { box, F (padló), door: "n"|"s"|"w" (a fal), dc (az ajtó közepe a fal mentén), win: [[fal, középpont, szélesség]], h (a ház leírása) } */
  function cabinBuild(G, o) {
    const B = o.box, F = o.F, Hh = o.Hh || 3.0, LR = .15, h = o.h, col = new THREE.Color(h.col);
    const logT = HZ.logT || (HZ.logT = canvasTex(512, 128, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, "#5a3f26"); gr.addColorStop(.5, "#8a6440"); gr.addColorStop(1, "#4a3220"); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      for (let k = 0; k < 140; k++) { g.strokeStyle = `rgba(${rr(30, 60) | 0},${rr(18, 35) | 0},${rr(8, 18) | 0},${rr(.25, .6)})`; g.lineWidth = rr(1, 3); const y = rr(0, hh); g.beginPath(); g.moveTo(rr(-20, w), y); g.lineTo(rr(0, w + 20), y + rr(-4, 4)); g.stroke(); }
      for (let k = 0; k < 14; k++) { g.fillStyle = "rgba(40,24,10,.6)"; g.beginPath(); g.ellipse(rr(0, w), rr(10, hh - 10), rr(5, 10), rr(3, 6), 0, 0, TAU); g.fill(); } for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(190,150,100,${rr(.1, .25)})`; g.fillRect(rr(0, w), rr(0, hh), rr(20, 80), rr(2, 6)); } }, { repeat: [3, 1] }));
    const endT = HZ.endT || (HZ.endT = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, "#9a7448"); gr.addColorStop(.85, "#7d5a36"); gr.addColorStop(1, "#4a3220"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); for (let r = 14; r < 60; r += 14) { g.strokeStyle = "rgba(70,46,24,.22)"; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, r, 0, TAU); g.stroke(); } }));
    const shT = HZ.shT || (HZ.shT = canvasTex(512, 512, (g, w, hh) => { g.fillStyle = "#4a3a2c"; g.fillRect(0, 0, w, hh); for (let r = 0; r < 16; r++) for (let c = -1; c < 12; c++) { const x = c * 46 + (r % 2) * 23 + rr(-3, 3), y = r * 32, ww = rr(38, 48); const v = rr(95, 125) | 0; g.fillStyle = `rgb(${v},${v * .78 | 0},${v * .6 | 0})`; g.fillRect(x, y, ww, 34); g.fillStyle = "rgba(20,14,8,.6)"; g.fillRect(x, y + 30, ww, 4); g.fillRect(x + ww - 2, y, 2, 34); if (rand() < .15) { g.fillStyle = "rgba(90,110,60,.35)"; g.fillRect(x + 4, y + 4, ww * .6, 12); } } }, { repeat: [3, 2] }));
    const logParts = [], endParts = [], M0 = new THREE.Matrix4();
    const addLog = (ax, c, a0, a1, y, r, ends) => { const L = a1 - a0; if (L < .08) return; const g = new THREE.CylinderGeometry(r, r * 1.04, L, 12, 1, true); g.rotateZ(Math.PI / 2); if (ax === "z") g.rotateY(Math.PI / 2); const m = (a0 + a1) / 2; g.translate(ax === "x" ? m : c, y, ax === "x" ? c : m); logParts.push([g, M0]);
      (ends || [0, 1]).forEach((e) => { const cg = new THREE.CircleGeometry(r * .98, 12); const at = e ? a1 : a0; if (ax === "x") { cg.rotateY(e ? Math.PI / 2 : -Math.PI / 2); cg.translate(at, y, c); } else { cg.rotateY(e ? 0 : Math.PI); cg.translate(c, y, at); } endParts.push([cg, M0]); }); };
    const wallLogs = (ax, c, a0, a1, phase, holes) => { const n = Math.round(Hh / (2 * LR)); for (let i = 0; i < n; i++) { const y = F + LR + i * 2 * LR + (phase ? LR : 0), r = LR * (1.04 + .05 * Math.sin(i * 2.7 + c)); if (y > F + Hh + LR * .5) break;
        let segs = [[a0 - .32, a1 + .32]]; (holes || []).forEach(([h0, h1, y0, y1]) => { if (y > F + y0 - LR * .6 && y < F + y1 + LR * .6) segs = segs.flatMap(([s0, s1]) => [[s0, Math.min(s1, h0)], [Math.max(s0, h1), s1]].filter(([q0, q1]) => q1 - q0 > .05)); }); segs.forEach(([s0, s1]) => addLog(ax, c, s0, s1, y, r)); } };
    const dw = o.dw || 1.2, d0 = o.dc - dw / 2, d1 = o.dc + dw / 2, wy0 = .9, wy1 = 2.2;
    h.dr = { wall: o.door, c: o.dc, w: dw };   /* 2026-11-15 este: az ajtónyílás a falütközéshez (05s) */
    const holes = { n: [], s: [], w: [], e: [] }; holes[o.door].push([d0, d1, -1, 2.2]); (o.win || []).forEach(([wall, c, w]) => holes[wall].push([c - w / 2, c + w / 2, wy0, wy1]));
    wallLogs("x", B.z0, B.x0, B.x1, 0, holes.n); wallLogs("x", B.z1, B.x0, B.x1, 0, holes.s); wallLogs("z", B.x0, B.z0, B.z1, 1, holes.w); wallLogs("z", B.x1, B.z0, B.z1, 1, holes.e);
    /* oromzat: a tető gerince x irányban fut (a hosszabbik oldal mentén) */
    const zc = (B.z0 + B.z1) / 2, xc = (B.x0 + B.x1) / 2, rw = (B.z1 - B.z0) / 2 + .55, rH = o.rH || 1.5;
    [B.x0, B.x1].forEach((x) => { for (let i = 0; ; i++) { const y = F + Hh + LR + i * 2 * LR, hw = ((B.z1 - B.z0) / 2 + .1) * (1 - (y - F - Hh) / rH); if (hw < .15) break; addLog("z", x, zc - hw, zc + hw, y, LR * .95); } });
    addLog("x", zc, B.x0 - .45, B.x1 + .45, F + Hh + rH - .12, .14); for (let x = B.x0 + .5; x < B.x1; x += 1.25) [-1, 1].forEach((sd) => { const g = new THREE.BoxGeometry(.12, .16, Math.hypot(rw, rH) + .1); g.rotateX(sd * Math.atan2(rH, rw)); g.translate(x, F + Hh + rH / 2 - .1, zc + sd * rw / 2); logParts.push([g, M0]); });
    { const mg = mergeGeoms(logParts), lm = new THREE.Mesh(mg, std({ map: logT, roughness: .95, side: THREE.DoubleSide })); G.add(lm); const eg = mergeGeoms(endParts); G.add(new THREE.Mesh(eg, std({ map: endT, roughness: .9 }))); }
    const shM = std({ map: shT, roughness: .95, side: THREE.DoubleSide }), plankM = std({ color: "#9a7650", roughness: .9 }), rl = B.x1 - B.x0 + 1.2;
    [-1, 1].forEach((s2) => { const L = Math.hypot(rw, rH) + .25, r = mesh(new THREE.BoxGeometry(rl, .09, L), shM, G); r.position.set(xc, F + Hh + rH / 2 + .1, zc + s2 * (rw / 2 + .05)); r.rotation.x = s2 * Math.atan2(rH, rw);
      const inr = mesh(new THREE.BoxGeometry(rl - .3, .03, L - .25), plankM, G); inr.position.copy(r.position); inr.rotation.copy(r.rotation); inr.translateY(-.07); });
    /* a ház színe a gerincen (festett gerinclécek) */
    { const rc = std({ color: h.col, roughness: .55 }); [-1, 1].forEach((s2) => { const b = mesh(new THREE.BoxGeometry(rl + .02, .06, .26), rc, G); b.position.set(xc, F + Hh + rH + .12 - .07, zc + s2 * .11); b.rotation.x = s2 * Math.atan2(rH, rw); }); }
    /* keretek: ajtó és ablak a ház színére festve */
    const frameM = std({ color: col, roughness: .55 }), glass = new THREE.MeshStandardMaterial({ color: "#bfe3f5", roughness: .05, metalness: .2, transparent: true, opacity: .22, depthWrite: false }); W.disposables.push(glass); const th = .36;
    const frame = (wall, a0, a1, y0, y1, win) => { const ax = wall === "n" || wall === "s" ? "x" : "z", c = wall === "n" ? B.z0 : wall === "s" ? B.z1 : wall === "w" ? B.x0 : B.x1, L = a1 - a0, m = (a0 + a1) / 2, X = (a) => (ax === "x" ? a : c), Z = (a) => (ax === "x" ? c : a);
      const put = (w, hh, d, x, y, z) => mesh(new THREE.BoxGeometry(w, hh, d).translate(x, y, z), frameM, G);
      put(ax === "x" ? L + .24 : th, .14, ax === "x" ? th : L + .24, X(m), F + y1 + .07, Z(m)); if (win) put(ax === "x" ? L + .24 : th, .1, ax === "x" ? th + .1 : L + .24, X(m), F + y0 - .05, Z(m));
      [a0 - .06, a1 + .06].forEach((a) => put(ax === "x" ? .12 : th, y1 - y0 + .1, ax === "x" ? th : .12, X(a), F + (y0 + y1) / 2, Z(a)));
      if (win) { const gl = new THREE.PlaneGeometry(L, y1 - y0); if (ax === "z") gl.rotateY(Math.PI / 2); gl.translate(X(m), F + (y0 + y1) / 2, Z(m)); mesh(gl, glass, G); put(ax === "x" ? L : .04, .04, ax === "x" ? .04 : L, X(m), F + (y0 + y1) / 2, Z(m)); put(.04, y1 - y0, .04, X(m), F + (y0 + y1) / 2, Z(m)); } };
    frame(o.door, d0, d1, 0, 2.2, false); (o.win || []).forEach(([wall, c, w]) => frame(wall, c - w / 2, c + w / 2, wy0, wy1, true));
    /* nyitott deszkaajtó (befelé nyílik), a ház színére festett lécekkel */
    { const dg = new THREE.Group(); G.add(dg); const ax = o.door === "n" || o.door === "s"; const hx = ax ? d0 : (o.door === "w" ? B.x0 : B.x1), hz = ax ? (o.door === "n" ? B.z0 : B.z1) : d0; dg.position.set(hx, F, hz);
      dg.rotation.y = o.door === "n" ? -1.2 : o.door === "s" ? Math.PI + 1.2 : o.door === "w" ? -1.9 + Math.PI / 2 : 1.9; for (let k = 0; k < 6; k++) mesh(new THREE.BoxGeometry(dw / 6 - .01, 2.16, .05).translate((k + .5) * dw / 6, 1.08, 0), std({ map: logT, roughness: .9 }), dg);
      [.4, 1.8].forEach((y) => mesh(new THREE.BoxGeometry(dw - .05, .12, .07).translate(dw / 2, y, .05), frameM, dg)); }
    /* névtábla a bejárat fölött */
    { const t = houseSign(h), sw = Math.min(3.4, (o.door === "n" || o.door === "s" ? B.x1 - B.x0 : B.z1 - B.z0) - .6), sh = sw * .29, pl = mesh(new THREE.PlaneGeometry(sw, sh), basic({ map: t }), G);
      if (o.door === "n") { pl.position.set(o.dc, F + 2.62, B.z0 - LR - .09); pl.rotation.y = Math.PI; } else if (o.door === "s") pl.position.set(o.dc, F + 2.62, B.z1 + LR + .09); else if (o.door === "w") { pl.position.set(B.x0 - LR - .09, F + 2.62, o.dc); pl.rotation.y = -Math.PI / 2; } else { pl.position.set(B.x1 + LR + .09, F + 2.62, o.dc); pl.rotation.y = Math.PI / 2; } }
    /* lámpás az ajtó mellett */
    { const dn = o.door === "n" ? -1 : o.door === "s" ? 1 : 0; if (dn) houseLantern(G, d1 + .35, F + 1.9, (dn < 0 ? B.z0 : B.z1) + dn * (LR + .22)); else houseLantern(G, (o.door === "w" ? B.x0 - LR - .22 : B.x1 + LR + .22), F + 2.15, d1 + .35); }
    /* zászló az oromzat csúcsán (a móló felőli oromzaton) */
    houseFlag(G, h, o.flagX != null ? o.flagX : B.x0 - .15, F + Hh + rH - .1, zc, 2.6);
    return { frameM, logT, endT, plankM, F, Hh, rH };
  }
  /* kőalap a parti házak alá (a lejtőn se lógjon a ház a levegőben) */
  function houseFound(G, B, F) { const st = HZ.stone || (HZ.stone = std({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#6c6a66"; g.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) { const v = rr(95, 150) | 0; g.fillStyle = `rgb(${v + 6},${v},${v - 8})`; uiRR(g, c * 52 + (r % 2) * 26 - 10, r * 32 + 2, 48, 28, 8); g.fill(); } }, { repeat: [3, 1] }), roughness: .95 }));
    const y0 = Math.min(landY(B.x0, B.z0), landY(B.x1, B.z1), landY(B.x0, B.z1), landY(B.x1, B.z0)) - .25; mesh(new THREE.BoxGeometry(B.x1 - B.x0 + .5, F - y0, B.z1 - B.z0 + .5).translate((B.x0 + B.x1) / 2, (F + y0) / 2, (B.z0 + B.z1) / 2), st, G);
    mesh(new THREE.BoxGeometry(B.x1 - B.x0 - .1, .05, B.z1 - B.z0 - .1).translate((B.x0 + B.x1) / 2, F + .02, (B.z0 + B.z1) / 2), std({ map: HZ.floorT || (HZ.floorT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#a07a52"; g.fillRect(0, 0, w, h); for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#946e48" : "#a9835b"; g.fillRect(0, k * h / 8, w, h / 8 - 3); g.fillStyle = "rgba(40,24,10,.55)"; g.fillRect(0, (k + 1) * h / 8 - 3, w, 3); } }, { repeat: [2, 3] })), roughness: .9 }), G);
    /* lépcső a bejárathoz */
    return y0; }
  function houseSteps(G, x, z, F, dirZ) { const y0 = landY(x, z + dirZ * 1.2); const n = Math.max(1, Math.round((F - y0) / .18)); for (let k = 0; k < n; k++) mesh(new THREE.BoxGeometry(1.5, (F - y0) * (k + 1) / n, .34).translate(x, y0 + (F - y0) * (k + 1) / n / 2, z + dirZ * (.3 + (n - k) * .32)), HZ.stone, G); }

  /* ---------------------------------------------------------------- az egyes házak */
  function housesBuild(env) {
    const G = new THREE.Group(); G.name = "hazak"; env.add(G); HZ.G = G; HZ.env = env; HZ.byId = {}; HZ.flags = []; HZ.beams = []; HZ.lamps = [];
    HOUSES.forEach((h) => { try { const g = new THREE.Group(); g.name = "haz-" + h.id; G.add(g); h.G = g; HZ.byId[h.id] = h; houseOne(g, h); } catch (e) { console.warn("ház", h.id, e); } });
    try { housePaths(env); } catch (e) { console.warn("ösvények", e); }
    try { harborMap(env); } catch (e) { console.warn("térkép", e); }
  }
  function houseFloor(h) { const B = h.box; if (h.stilts || h.kind === "school") return .66; if (h.kind === "light") return .72; return Math.max(landY(B.x0, B.z0), landY(B.x1, B.z0), landY(B.x0, B.z1), landY(B.x1, B.z1), landY((B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2)) + .22; }
  function houseOne(G, h) {
    const B = h.box, F = h.F = houseFloor(h), xc = (B.x0 + B.x1) / 2, zc = (B.z0 + B.z1) / 2; h.inner = { F };
    if (h.kind === "school") { h.out = { x: 2.4, z: 1.2, lx: -2, lz: 1.2 }; h.board = { x: 6.7, y: F + 1.75, z: B.z0 + .2, ry: 0, w: 3.5 }; h.seat = { x: 6.7, z: 1.55 }; h.tpos = { x: 4.55, z: B.z0 + .85, ry: .55 }; h.studs = [{ k: "gyerek", x: 4.75, z: .4, bench: 1 }, { k: "anya", x: 8.6, z: .45, bench: 1 }];
      /* az iskola a színkódot a zászlóval és a gerinccel kapja (a ház maga a jóváhagyott rönkház marad) */
      houseFlag(G, h, B.x0 - .2, F + 3 + 1.6 - .1, zc, 2.6); { const rc = std({ color: h.col, roughness: .55 }); [-1, 1].forEach((s2) => { const b = mesh(new THREE.BoxGeometry(B.x1 - B.x0 + 1.22, .06, .26), rc, G); b.position.set(xc, F + 3 + 1.6 + .05, zc + s2 * .11); b.rotation.x = s2 * Math.atan2(1.6, (B.z1 - B.z0) / 2 + .55); }); }
      return; }
    if (h.kind === "light") { lighthouseBuild(G, h); return; }
    if (h.stilts) {
      /* ELSŐSEGÉLY – az iskola mellett, cölöpökön; saját bejárat a nyugati falon (a két ház közötti fedett tornácra nyílik) */
      const C = cabinBuild(G, { box: B, F, door: "w", dc: 2.2, win: [["s", xc, 1.4], ["e", .9, 1.1], ["n", xc + 1.1, 1.0]], h, flagX: B.x1 + .15 });
      /* fedett tornác a két ház között: deszkatető oszlopokon */
      { const post = std({ color: "#5d4630", roughness: .95 }); [[9.75, -1.1], [9.75, 4.3], [11.0, -1.1], [11.0, 4.3]].forEach(([x, z]) => mesh(new THREE.CylinderGeometry(.07, .08, 2.6, 8).translate(x, F + 1.3, z), post, G));
        const rf = mesh(new THREE.BoxGeometry(1.9, .08, 5.8), std({ map: HZ.shT, roughness: .95 }), G); rf.position.set(10.38, F + 2.68, 1.6); rf.rotation.z = .08; }
      /* vöröskereszt-tábla a déli falon és a tornác felőli oromzaton */
      const rcT = canvasTex(256, 256, (g, w, hh) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, hh); g.fillStyle = "#d0342c"; g.fillRect(w * .38, hh * .14, w * .24, hh * .72); g.fillRect(w * .14, hh * .38, w * .72, hh * .24); g.strokeStyle = "#d0342c"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, hh - 10); });
      { const p = mesh(new THREE.PlaneGeometry(.8, .8), basic({ map: rcT }), G); p.position.set(B.x0 - .2, F + 3.55, zc); p.rotation.y = -Math.PI / 2; const p2 = mesh(new THREE.PlaneGeometry(.7, .7), basic({ map: rcT }), G); p2.position.set(xc + 1.7, F + 1.6, B.z1 + .2); }
      firstAidProps(G, h, C);
      h.board = { x: B.x1 - .2, y: F + 1.65, z: zc + .1, ry: -Math.PI / 2, w: 3.0 }; h.seat = { x: B.x1 - 3.0, z: zc + .4 }; h.tpos = { x: B.x1 - .85, z: B.z0 + .9, ry: -.95 }; h.studs = [{ k: "apa", x: B.x1 - 2.15, z: zc - .85 }];
      hbTpSurf(HZ.env || G, xc, zc, B.x1 - B.x0 - .6, B.z1 - B.z0 - .6, F + .01, .25); h.out = { x: 10.35, z: 4.3, lx: 10.35, lz: 8 }; return;
    }
    houseFound(G, B, F);
    if (h.kind === "csarda") { csardaBuild(G, h); }
    else {
      /* 2026-11-15 este (tulajdonos: „egy csomó ablakba rönk került, bentről nem látom a vizet”): a sorban álló házak oldalablakai a szomszéd rönkfalára néztek –
         helyettük a vízre néző (északi) homlokzaton széles, kétszárnyú ablak van; oldalablak csak ott marad, ahol szabad kilátás nyílik (a kikötői térre) */
      const WIN = { vih: [["n", xc + 1.25, 2.1]], cso: [["n", xc + 1.25, 2.1]], mel: [["n", xc + 1.2, 1.8], ["e", zc, 1.1]], ter: [["n", xc + 1.0, 2.6], ["w", zc, 1.1]] }[h.id] || [["n", xc + 1.3, 1.2], ["w", zc, 1.1], ["e", zc, 1.1]];
      const C = cabinBuild(G, { box: B, F, door: "n", dc: h.id === "ter" ? B.x0 + 1.6 : xc - .9, win: WIN, h, flagX: B.x0 - .15 });
      houseSteps(G, h.id === "ter" ? B.x0 + 1.6 : xc - .9, B.z0, F, -1);
      if (h.id === "ter") natureProps(G, h, C); else if (h.id === "cso") { try { knotHouseBuild(G, h, C); } catch (e) { console.warn("csomózóház", e); knotProps(G, h, C); } } else if (h.id === "mel") { vestProps(G, h, C); h.studs = []; } else if (h.id === "vih") { try { cloudHouseBuild(G, h, C); } catch (e) { console.warn("felhők háza", e); stormProps(G, h, C); } }
      if (h.kind === "tower") stormTower(G, h, C);
    }
    /* belső elrendezés: tábla a hátsó (déli) falon, a tanár mellette, a szék középen, a tanulók oldalt */
    if (!h.board) { h.board = { x: xc, y: F + 1.65, z: B.z1 - .2, ry: Math.PI, w: Math.min(3.2, B.x1 - B.x0 - 1.6) }; h.seat = { x: xc, z: B.z1 - 3.05 }; h.tpos = { x: B.x0 + .85, z: B.z1 - .95, ry: Math.PI - .7 }; h.studs = [{ k: "gyerek", x: xc - 1.7, z: B.z1 - 1.6 }]; } if (h.id === "mel") h.studs = [];
    hbTpSurf(HZ.env || G, xc, zc, B.x1 - B.x0 - .6, B.z1 - B.z0 - .6, F + .01, .25);
    if (!h.out) { const dz = h.kind === "csarda" ? 3.1 : 1.9, dx = h.kind === "csarda" ? xc : h.id === "ter" ? B.x0 + 1.6 : xc - .9; h.out = { x: dx, z: B.z0 - dz, lx: dx, lz: B.z0 - dz - 5 }; }
  }

  /* ---- belső díszek ---- */
  function poster(G, lines, col, x, y, z, ry, w) { w = w || .8; const tx = canvasTex(512, 640, (g, ww, hh) => { g.fillStyle = "#fbf6e8"; g.fillRect(0, 0, ww, hh); g.fillStyle = col; g.fillRect(0, 0, ww, 120); g.fillStyle = "#fff"; g.font = `900 50px ${UIF}`; g.textAlign = "center"; g.fillText(lines[0], ww / 2, 80); g.fillStyle = "#14161b"; g.font = `700 40px ${UIF}`; lines.slice(1).forEach((l, i) => g.fillText(l, ww / 2, 190 + i * 74)); g.strokeStyle = col; g.lineWidth = 10; g.strokeRect(5, 5, ww - 10, hh - 10); });
    const p = mesh(new THREE.PlaneGeometry(w, w * 1.25), basic({ map: tx }), G); p.position.set(x, y, z); p.rotation.y = ry; return p; }
  function shelf(G, x, y, z, ry, w, mat) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; G.add(g); mesh(new THREE.BoxGeometry(w, .04, .28), mat, g); [-w / 2 + .05, w / 2 - .05].forEach((dx) => mesh(new THREE.BoxGeometry(.03, .16, .2).translate(dx, -.08, 0), mat, g)); return g; }
  function firstAidProps(G, h, C) { const B = h.box, F = C.F, red = std({ color: "#c8202a", roughness: .5 }), white = std({ color: "#f4f4f0", roughness: .5 }), wood = C.frameM;
    /* elsősegély-szekrény a falon */
    { const g = new THREE.Group(); g.position.set(B.x0 + .3, F + 1.5, B.z1 - .7); g.rotation.y = Math.PI / 2; G.add(g); mesh(new THREE.BoxGeometry(.7, .6, .22), white, g); mesh(new THREE.BoxGeometry(.12, .4, .01).translate(0, 0, .115), red, g); mesh(new THREE.BoxGeometry(.4, .12, .01).translate(0, 0, .115), red, g); }
    /* hordágy a fal mellett */
    { const g = new THREE.Group(); g.position.set(xMid(B), F + .02, B.z1 - .45); G.add(g); const pole = std({ color: "#b0b6bc", metalness: .7, roughness: .35 }); [-.28, .28].forEach((dz) => { const p = new THREE.CylinderGeometry(.02, .02, 2.2, 8); p.rotateZ(Math.PI / 2); mesh(p.translate(0, .14, dz), pole, g); }); mesh(new THREE.BoxGeometry(1.8, .02, .56).translate(0, .14, 0), std({ color: "#c64a2a", roughness: .9 }), g); [-.75, .75].forEach((dx) => [-.28, .28].forEach((dz) => mesh(new THREE.CylinderGeometry(.02, .02, .12, 6).translate(dx, .06, dz), pole, g))); }
    /* gyakorlóbaba (újraélesztés) egy szőnyegen */
    { const g = new THREE.Group(); g.position.set(B.x0 + 1.4, F + .03, B.z0 + .9); g.rotation.y = .2; G.add(g); mesh(new THREE.BoxGeometry(1.4, .02, .8), std({ color: "#3a6ea8", roughness: .9 }), g); const sk = std({ color: "#e6c4a6", roughness: .6 }); const t = new THREE.CapsuleGeometry(.17, .42, 4, 12); t.rotateZ(Math.PI / 2); t.scale(1, .55, 1); mesh(t.translate(.05, .1, 0), sk, g); mesh(new THREE.SphereGeometry(.12, 14, 10).translate(-.45, .12, 0), sk, g); mesh(new THREE.BoxGeometry(.3, .02, .32).translate(.08, .2, 0), std({ color: "#2a2f36", roughness: .8 }), g); }
    /* összehajtott takarók, kötszeres polc, kancsó */
    { const C2 = ["#c9302c", "#d9b24a", "#3d6fa8"]; for (let k = 0; k < 3; k++) mesh(new THREE.BoxGeometry(.5, .09, .38).translate(B.x1 - .5, F + .05 + k * .1, B.z0 + .4), std({ color: C2[k], roughness: .95 }), G); }
    { const sg = shelf(G, B.x0 + .2, F + 1.95, B.z0 + 1.4, Math.PI / 2, 1.0, wood); for (let k = 0; k < 4; k++) mesh(new THREE.CylinderGeometry(.05, .05, .1, 12).rotateZ(Math.PI / 2).translate(-.35 + k * .22, .07, 0), white, sg); }
    poster(G, ["112", "HOL?", "MI TÖRTÉNT?", "HÁNYAN?", "ne tedd le!"], "#d0342c", B.x0 + .2, F + 1.75, B.z0 + 2.7, Math.PI / 2, .7);
    poster(G, ["30 : 2", "mellkasnyomás", "100–120 / perc", "5–6 cm mélyen", "2 befúvás"], "#d0342c", B.x0 + 1.4, F + 1.75, B.z1 - .2, Math.PI, .7); }
  const xMid = (B) => (B.x0 + B.x1) / 2;
  function natureProps(G, h, C) { const B = h.box, F = C.F, wood = C.frameM;
    /* akvárium balatoni halakkal (lapos, rajzolt halak az üveg mögött) */
    { const tx = canvasTex(512, 256, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, "#5da9b8"); gr.addColorStop(1, "#2c6a6e"); g.fillStyle = gr; g.fillRect(0, 0, w, hh); g.fillStyle = "#8a7a52"; g.fillRect(0, hh - 30, w, 30); for (let k = 0; k < 12; k++) { g.strokeStyle = "#3e7a3a"; g.lineWidth = 4; g.beginPath(); const x = 20 + k * 42; g.moveTo(x, hh - 28); g.quadraticCurveTo(x + 14, hh - 110, x - 6, hh - 160 - (k % 3) * 20); g.stroke(); }
        [[120, 90, 1.2, "#9aa4a8"], [300, 140, 1.5, "#b08a3a"], [400, 70, .9, "#c0c8cc"], [220, 190, 1, "#6f7e6a"]].forEach(([x, y, s, c]) => { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, 34, 12, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(30, 0); g.lineTo(52, -12); g.lineTo(52, 12); g.closePath(); g.fill(); g.fillStyle = "#111"; g.beginPath(); g.arc(-22, -3, 2.5, 0, TAU); g.fill(); g.restore(); }); });
      const g = new THREE.Group(); g.position.set(B.x0 + .45, F + 1.0, B.z0 + 1.3); g.rotation.y = Math.PI / 2; G.add(g); mesh(new THREE.BoxGeometry(1.2, .7, .4), std({ color: "#2b3036", roughness: .4, metalness: .5 }), g); mesh(new THREE.PlaneGeometry(1.12, .62).translate(0, 0, .205), basic({ map: tx }), g); mesh(new THREE.BoxGeometry(1.3, .5, .5).translate(0, -.6, 0), wood, g); }
    /* madarak: gém és hattyú faragott modellje a polcon, nádköteg, távcső */
    { const sg = shelf(G, B.x1 - .2, F + 1.7, zMid(B), -Math.PI / 2, 1.6, wood); const wm = std({ color: "#f4f4f0", roughness: .5 }), gm = std({ color: "#8f9aa3", roughness: .6 });
      const sw = new THREE.SphereGeometry(.12, 12, 8); sw.scale(1, .7, 1.6); mesh(sw.translate(-.45, .1, 0), wm, sg); mesh(new THREE.TorusGeometry(.08, .02, 6, 12, Math.PI).rotateY(Math.PI / 2).translate(-.45, .24, .12), wm, sg);
      mesh(new THREE.CylinderGeometry(.008, .008, .3, 5).translate(.3, .17, 0), std({ color: "#c9a23a" }), sg); const hb = new THREE.SphereGeometry(.09, 12, 8); hb.scale(1, .8, 1.7); mesh(hb.translate(.3, .38, 0), gm, sg); mesh(new THREE.CylinderGeometry(.015, .02, .22, 6).rotateX(-.6).translate(.3, .5, .1), gm, sg);
      mesh(new THREE.CylinderGeometry(.04, .045, .16, 10).rotateX(Math.PI / 2).translate(0, .08, -.03), std({ color: "#1b1d22", roughness: .4 }), sg); mesh(new THREE.CylinderGeometry(.04, .045, .16, 10).rotateX(Math.PI / 2).translate(.09, .08, -.03), std({ color: "#1b1d22", roughness: .4 }), sg); }
    { const reed = std({ color: "#b59a5a", roughness: .9 }), parts = []; for (let k = 0; k < 40; k++) { const g = new THREE.CylinderGeometry(.008, .01, 1.9, 4); parts.push([g, M4(B.x1 - .45 + (rand() - .5) * .25, F + .95, B.z0 + .45 + (rand() - .5) * .25, 0, (rand() - .5) * .12, (rand() - .5) * .12)]); } mesh(mergeGeoms(parts), reed, G); }
    poster(G, ["BALATONI HALAK", "fogassüllő", "ponty", "dévérkeszeg", "harcsa"], "#3d9a4b", B.x0 + .2, F + 1.75, B.z1 - 1.3, Math.PI / 2, .72);
    poster(G, ["MADARAK", "bütykös hattyú", "nagy kócsag", "szürke gém", "dankasirály"], "#3d9a4b", B.x1 - .2, F + 1.75, B.z1 - 1.2, -Math.PI / 2, .72); }
  const zMid = (B) => (B.z0 + B.z1) / 2;
  function knotProps(G, h, C) { const B = h.box, F = C.F, rope = std({ color: "#e7dcc0", roughness: .95 }), rope2 = std({ color: "#c33b2a", roughness: .9 }), rope3 = std({ color: "#2f5e9a", roughness: .9 });
    /* csomótábla: keretben a hat alapcsomó (rajzolt kötél) */
    { const tx = canvasTex(768, 512, (g, w, hh) => { g.fillStyle = "#1f3a5e"; g.fillRect(0, 0, w, hh); g.strokeStyle = "#c9a23a"; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, hh - 12); const N = ["nyolcas", "bak", "mentőcsomó", "szorító", "kikötő", "visszafogó"];
        N.forEach((n, i) => { const cx = 128 + (i % 3) * 256, cy = 150 + Math.floor(i / 3) * 220; g.strokeStyle = "#efe2c2"; g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); for (let t = 0; t <= 1; t += .02) { const a = t * TAU * (1.5 + i * .25), r = 50 * Math.sin(t * Math.PI) + 10; const x = cx + Math.cos(a) * r - 70 + t * 140, y = cy + Math.sin(a) * r * .6; t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.fillStyle = "#fff"; g.font = `800 30px ${UIF}`; g.textAlign = "center"; g.fillText(n, cx, cy + 82); }); });
      const p = mesh(new THREE.PlaneGeometry(1.5, 1.0), basic({ map: tx }), G); p.position.set(B.x0 + .2, F + 1.7, zMid(B) - .4); p.rotation.y = Math.PI / 2; }
    /* feltekert kötelek fogasokon, kikötőbak a padon, lelógó gyakorlókötelek */
    [rope, rope2, rope3].forEach((m, k) => { for (let q = 0; q < 6; q++) mesh(new THREE.TorusGeometry(.22 - q * .012, .022, 6, 20).translate(B.x1 - .25, F + 1.9 - q * .05 - k * .0, B.z0 + .6 + k * .7), m, G).rotation.y = Math.PI / 2; mesh(new THREE.CylinderGeometry(.025, .025, .25, 6).rotateZ(Math.PI / 2).translate(B.x1 - .3, F + 2.1, B.z0 + .6 + k * .7), C.frameM, G); });
    { const g = new THREE.Group(); g.position.set(B.x0 + .9, F + .55, B.z0 + .8); G.add(g); mesh(new THREE.BoxGeometry(1.2, .06, .5), C.frameM, g); [-.5, .5].forEach((dx) => mesh(new THREE.BoxGeometry(.06, .55, .45).translate(dx, -.28, 0), C.frameM, g)); const cl = std({ color: "#b8bcc2", metalness: .8, roughness: .3 }); mesh(new THREE.BoxGeometry(.3, .04, .06).translate(0, .07, 0), cl, g); mesh(new THREE.BoxGeometry(.06, .05, .06).translate(0, .045, 0), cl, g); }
    for (let k = 0; k < 4; k++) rodBetween(new THREE.Vector3(B.x0 + 1.5 + k * .5, F + 2.85, B.z0 + .35), new THREE.Vector3(B.x0 + 1.5 + k * .5 + (rand() - .5) * .1, F + 1.1 + rand() * .3, B.z0 + .4), .014, [rope, rope2, rope3, rope][k], G, 5);
    poster(G, ["A NYOLCAS", "a kötél végén", "nem csúszik ki", "a csigán át"], "#7a4ea3", B.x1 - .2, F + 1.75, B.z1 - 1.2, -Math.PI / 2, .7); }
  /* ---- ZEPHYR MENTŐMELLÉNYEK (2026-11-15, a tulajdonos – a Zephyr mellényeket ők gyártják): a mellények a valódi termékfotókból készülnek
     (piros-fekete és sárga-fekete sportmellény, narancs GULF 100N és BAY 100N), a Mentőmellény-pontban próbababákon, állványon és a falon,
     a Zephyr emblémával és a mellények valódi címkéivel */
  const ZV_IMG = { piros: "piros-fekete", sarga: "sarga-fekete", gulf: "gulf100", bay: "bay100" };
  function zvTex(n) { HZ.zvt = HZ.zvt || {}; if (!HZ.zvt[n]) { const t = new THREE.TextureLoader().load("img/melleny/" + n + ".webp"); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; HZ.zvt[n] = t; W.disposables.push(t); } return HZ.zvt[n]; }
  /* egy mellény térben: elöl a fotó (ívelten a test köré hajlítva), hátul és oldalt sötét anyag; w, hh: szélesség és magasság (m), R: a test sugara */
  function zVest(parent, kind, w, hh, R, x, y, z, ry) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; parent.add(g); const back = kind === "gulf" || kind === "bay" ? "#f07a12" : "#17181b";
    const bend = (geo, sgn) => { const pa = geo.attributes.position; for (let i = 0; i < pa.count; i++) { const px = pa.getX(i), a = px / R; pa.setX(i, Math.sin(a) * R); pa.setZ(i, sgn * (Math.cos(a) * R)); } geo.computeVertexNormals(); return geo; };
    const fg = bend(new THREE.PlaneGeometry(w, hh, 14, 1), 1); const fm = new THREE.MeshStandardMaterial({ map: zvTex(ZV_IMG[kind]), alphaTest: .45, roughness: .7, side: THREE.DoubleSide }); W.disposables.push(fm); mesh(fg, fm, g);
    const sweep = Math.PI * 2 - 2 * (w / 2) / R + .12; const bg = new THREE.CylinderGeometry(R * .985, R * .985, hh * .8, 18, 1, true, (w / 2) / R - .06, sweep); const bm = mesh(bg, std({ color: back, roughness: .75, side: THREE.DoubleSide }), g); bm.position.y = -hh * .06;
    return g; }
  /* próbababa a mellényben: matt bézs műanyag test, sötétszürke vitorlás kabát fehér csíkos ujjal, nadrág térdfolttal, fekete sapka, napszemüveg, csősál – ahogy a termékfotókon */
  function zMannequin(parent, kind, x, z, F, ry) { const g = new THREE.Group(); g.position.set(x, F, z); g.rotation.y = ry || 0; parent.add(g);
    const skin = std({ color: "#e8d2b8", roughness: .35 }), jak = std({ color: "#3b414a", roughness: .7 }), pant = std({ color: "#5d6673", roughness: .75 }), blk = std({ color: "#15161a", roughness: .7 }), wht = std({ color: "#eef0f2", roughness: .5 }), steel = std({ color: "#9aa2aa", metalness: .8, roughness: .3 });
    mesh(new THREE.CylinderGeometry(.22, .25, .03, 24).translate(0, .015, 0), steel, g); mesh(new THREE.CylinderGeometry(.015, .015, .5, 8).translate(0, .26, 0), steel, g);
    [-.1, .1].forEach((sx) => { mesh(new THREE.CylinderGeometry(.075, .062, .86, 14).translate(sx, .5, 0), pant, g); mesh(new THREE.BoxGeometry(.13, .2, .03).translate(sx, .55, .07), blk, g); mesh(new THREE.BoxGeometry(.11, .07, .24).translate(sx, .05, .04), blk, g); });
    const tor = new THREE.LatheGeometry([[.0, 0], [.17, 0], [.19, .08], [.2, .3], [.21, .45], [.2, .55], [.12, .62], [.06, .64]].map(([a, b]) => new THREE.Vector2(a, b)), 22); tor.scale(1, 1, .72); mesh(tor.translate(0, .92, 0), jak, g);
    mesh(new THREE.CylinderGeometry(.18, .2, .28, 22).scale(1, 1, .75).translate(0, 1.0, 0), jak, g);   /* a kabát alja a csípőn */
    [-1, 1].forEach((sd) => { const arm = new THREE.Group(); arm.position.set(sd * .22, 1.49, 0); arm.rotation.z = sd * .12; g.add(arm); mesh(new THREE.CylinderGeometry(.055, .048, .6, 12).translate(0, -.3, 0), jak, arm); for (let k = 0; k < 3; k++) mesh(new THREE.CylinderGeometry(.057, .057, .012, 12).translate(0, -.08 - k * .025, .0), wht, arm); mesh(new THREE.SphereGeometry(.045, 10, 8).scale(.8, 1.3, .6).translate(0, -.66, 0), skin, arm); });
    mesh(new THREE.CylinderGeometry(.07, .085, .14, 14).translate(0, 1.6, 0), jak, g); mesh(new THREE.SphereGeometry(.1, 18, 14).scale(.9, 1.15, .95).translate(0, 1.73, 0), skin, g);
    mesh(new THREE.SphereGeometry(.104, 18, 10, 0, TAU, 0, Math.PI * .52).translate(0, 1.76, 0), blk, g); mesh(new THREE.CylinderGeometry(.08, .082, .09, 14).translate(0, 1.63, .005), std({ color: "#4a505a", roughness: .8 }), g);
    mesh(new THREE.BoxGeometry(.17, .035, .03).translate(0, 1.745, .085), std({ color: "#2a3038", roughness: .15, metalness: .5 }), g);
    zVest(g, kind, kind === "gulf" ? .5 : .46, kind === "gulf" ? .5 : .5, .215, 0, 1.25, .0, 0); return g; }
  function vestProps(G, h, C) { const B = h.box, F = C.F, xc = xMid(B);
    /* két próbababa bent (piros-fekete, sárga-fekete), egy kint az ajtó mellett (narancs GULF 100N) */
    zMannequin(G, "piros", B.x1 - .55, B.z0 + .75, F, -Math.PI / 2 + .5); zMannequin(G, "sarga", B.x1 - .55, B.z0 + 1.75, F, -Math.PI / 2 + .3);
    const yo = landY(B.x1 + 1.0, B.z0 - .4); zMannequin(G, "gulf", B.x1 + 1.0, B.z0 - .2, yo, Math.PI);
    /* mellény-állvány a ház nyugati oldalán: a négy Zephyr mellény vállfán */
    { const rack = std({ color: "#4a4f56", metalness: .6, roughness: .4 }), rx = B.x0 - 1.0, rz = (B.z0 + B.z1) / 2, ry = landY(rx, rz); [-1.2, 1.2].forEach((dz) => mesh(new THREE.CylinderGeometry(.025, .025, 2.45, 8).translate(rx, ry + 1.22, rz + dz), rack, G)); mesh(new THREE.CylinderGeometry(.02, .02, 2.5, 8).rotateX(Math.PI / 2).translate(rx, ry + 1.72, rz), rack, G);
      ["piros", "sarga", "bay", "piros", "gulf", "sarga"].forEach((k, i) => { const z = rz - 1.0 + i * .4; mesh(new THREE.TorusGeometry(.04, .006, 4, 10, Math.PI).rotateY(Math.PI / 2).translate(rx, ry + 1.69, z), rack, G); zVest(G, k, k === "bay" ? .4 : .44, k === "bay" ? .62 : .5, .17, rx, ry + 1.36, z, -Math.PI / 2); }); }
    /* mellények a falon (fogason), mentőöv, mentőkötél-táska */
    ["sarga", "piros", "bay"].forEach((k, i) => zVest(G, k, k === "bay" ? .38 : .42, k === "bay" ? .6 : .48, .16, B.x0 + .28, F + 1.75, B.z0 + .9 + i * .75, Math.PI / 2));
    { const ring = std({ color: "#ff7a1a", roughness: .5 }), wht = std({ color: "#f4f4f0", roughness: .5 }); const r = mesh(new THREE.TorusGeometry(.3, .075, 10, 24), ring, G); r.position.set(B.x1 - .2, F + 1.9, B.z1 - 1.4); r.rotation.y = Math.PI / 2; for (let k = 0; k < 4; k++) { const b2 = mesh(new THREE.TorusGeometry(.3, .078, 10, 4, .3), wht, G); b2.position.copy(r.position); b2.rotation.set(0, Math.PI / 2, k * Math.PI / 2); } }
    { const bag = std({ color: "#e3262f", roughness: .8 }); mesh(new THREE.CylinderGeometry(.14, .14, .38, 14).translate(B.x1 - .4, F + .2, B.z1 - .5), bag, G); }
    /* Zephyr embléma a ház homlokzatán és bent a falon, a valódi címkék fotója posztereken */
    const logoT = (() => { const t = new THREE.TextureLoader().load("img/melleny/logo.webp"); t.colorSpace = THREE.SRGBColorSpace; W.disposables.push(t); return t; })();
    const lgM = new THREE.MeshBasicMaterial({ map: logoT, transparent: true, alphaTest: .1 }); W.disposables.push(lgM);
    { const rx = B.x0 - 1.0, rz = (B.z0 + B.z1) / 2, ry = landY(rx, rz); const bd = mesh(new THREE.BoxGeometry(.04, .66, 2.4), std({ color: "#f6f4ee", roughness: .6 }), G); bd.position.set(rx, ry + 2.12, rz); const lg = mesh(new THREE.PlaneGeometry(2.0, .6), lgM, G); lg.position.set(rx - .025, ry + 2.12, rz); lg.rotation.y = -Math.PI / 2; const lg2 = mesh(new THREE.PlaneGeometry(2.0, .6), lgM, G); lg2.position.set(rx + .025, ry + 2.12, rz); lg2.rotation.y = Math.PI / 2; }   /* felirat-tábla az állvány tetején, két oldalán az embléma */
    { const lg = mesh(new THREE.PlaneGeometry(1.2, .36), lgM, G); lg.position.set(xc, F + 2.55, B.z1 - .2); lg.rotation.y = Math.PI; }
    const lab = (n, x, z, ry) => { const t = new THREE.TextureLoader().load("img/melleny/" + n + ".webp"); t.colorSpace = THREE.SRGBColorSpace; W.disposables.push(t); const m = new THREE.MeshBasicMaterial({ map: t }); W.disposables.push(m); const p = mesh(new THREE.PlaneGeometry(.62, .64), m, G); p.position.set(x, F + 1.6, z); p.rotation.y = ry; };
    lab("cimke-bay100", B.x1 - .2, B.z1 - 1.25, -Math.PI / 2); lab("cimke-wave50", B.x1 - .2, B.z1 - 2.05, -Math.PI / 2); }
  function stormProps(G, h, C) { const B = h.box, F = C.F;
    /* barométer a falon, széljelző zsák modell, Beaufort-tábla */
    { const g = new THREE.Group(); g.position.set(B.x0 + .2, F + 1.75, B.z0 + 1.2); g.rotation.y = Math.PI / 2; G.add(g); mesh(new THREE.CylinderGeometry(.24, .24, .06, 28).rotateX(Math.PI / 2), C.frameM, g); const tx = canvasTex(256, 256, (gg, w, hh) => { gg.fillStyle = "#f6f0dc"; gg.beginPath(); gg.arc(128, 128, 120, 0, TAU); gg.fill(); gg.fillStyle = "#222"; gg.font = `700 22px ${UIF}`; gg.textAlign = "center"; ["vihar", "eső", "változó", "szép"].forEach((s, i) => { const a = -2.3 + i * 1.5; gg.fillText(s, 128 + Math.cos(a) * 80, 136 + Math.sin(a) * 80); }); gg.strokeStyle = "#b02a20"; gg.lineWidth = 6; gg.beginPath(); gg.moveTo(128, 128); gg.lineTo(70, 90); gg.stroke(); });
      mesh(new THREE.CircleGeometry(.21, 28).translate(0, 0, .035), basic({ map: tx }), g); }
    poster(G, ["BEAUFORT", "0–1 szélcsend", "3–4 jó vitorlás szél", "5–6 erős szél", "7+ viharos"], "#e0a800", B.x1 - .2, F + 1.75, B.z0 + 1.3, -Math.PI / 2, .72);
    poster(G, ["VIHARJELZÉS", "I. fok: 45 / perc", "II. fok: 90 / perc", "Siófoki", "Meteorológiai obszerv."], "#e0a800", B.x1 - .2, F + 1.75, B.z1 - 1.3, -Math.PI / 2, .72); }
  /* a viharjelző torony: karcsú, merevített fa rácstorony a ház nyugati oldalán, a csúcson sárga villogóval (a kikötő viharjelzésével együtt villan) */
  function stormTower(G, h, C) { const B = h.box, F = C.F, x = B.x0 - 1.4, z = (B.z0 + B.z1) / 2, H = 14,   /* 2026-11-15: magasabb torony (a tulajdonos kérése) */ post = std({ color: "#6b4a2a", roughness: .9 }), y0 = landY(x, z) - .1; (HB.solids || (HB.solids = [])).push({ x0: x - .65, x1: x + .65, z0: z - .65, z1: z + .65 });
    const pts = [[-.6, -.6], [.6, -.6], [.6, .6], [-.6, .6]]; pts.forEach(([dx, dz]) => rodBetween(new THREE.Vector3(x + dx, y0, z + dz), new THREE.Vector3(x + dx * .45, y0 + H, z + dz * .45), .07, post, G, 6));
    for (let k = 1; k < 7; k++) { const y = y0 + k * H / 7, s = 1 - (k / 7) * .55; for (let i = 0; i < 4; i++) { const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % 4]; rodBetween(new THREE.Vector3(x + ax * s, y, z + az * s), new THREE.Vector3(x + bx * s, y, z + bz * s), .035, post, G, 5); const y2 = y0 + (k - 1) * H / 7, s2 = 1 - ((k - 1) / 7) * .55; rodBetween(new THREE.Vector3(x + ax * s2, y2, z + az * s2), new THREE.Vector3(x + bx * s, y, z + bz * s), .025, post, G, 4); } }
    mesh(new THREE.BoxGeometry(1.0, .08, 1.0).translate(x, y0 + H, z), post, G); const lampM = new THREE.MeshStandardMaterial({ color: "#4a4a40", emissive: "#000000", roughness: .4 }); W.disposables.push(lampM); const lamp = mesh(new THREE.SphereGeometry(.28, 16, 12).translate(x, y0 + H + .4, z), lampM, G); lamp.userData.noMerge = true;
    mesh(new THREE.CylinderGeometry(.18, .22, .2, 12).translate(x, y0 + H + .1, z), std({ color: "#222", roughness: .5 }), G); const gl = glowSprite("#ffcc22", 4.5); gl.position.set(x, y0 + H + .4, z); gl.visible = false; gl.userData.night = 0; G.add(gl); HZ.lamps.push({ lamp, glow: gl });
    /* létra */ for (let k = 0; k < 24; k++) mesh(new THREE.BoxGeometry(.4, .03, .04).translate(x + .62 - k * .012, y0 + .3 + k * .42, z), post, G); }
  /* ---------------------------------------------------------------- MAGYAR ÍZEK HÁZA – fehérre meszelt csárda, vastag nádtető, oszlopos tornác, paprikafüzérek */
  function csardaBuild(G, h) { const B = h.box, F = h.F, Hh = 2.9, xc = xMid(B), zc = zMid(B), white = std({ map: canvasTex(256, 256, (g, w, hh) => { g.fillStyle = "#f3efe4"; g.fillRect(0, 0, w, hh); for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(${150 + rand() * 60 | 0},${140 + rand() * 50 | 0},${120 + rand() * 40 | 0},${rand() * .08})`; g.fillRect(rand() * w, rand() * hh, 2 + rand() * 20, 2 + rand() * 12); } }, { repeat: [2, 1] }), roughness: .95 });
    const t = .3, dw = 1.3, dc = xc, wins = [xc - 2.6, xc + 2.6]; h.dr = { wall: "n", c: dc, w: dw };
    /* falak darabokban (ajtó és ablakok kihagyva) */
    const wall = (x0, x1, z0, z1, y0, y1) => mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, F + (y0 + y1) / 2, (z0 + z1) / 2), white, G);
    wall(B.x0, B.x1, B.z1 - t, B.z1, 0, Hh); wall(B.x0, B.x0 + t, B.z0, B.z1, 0, Hh); wall(B.x1 - t, B.x1, B.z0, B.z1, 0, Hh);
    { const cuts = [[dc - dw / 2, dc + dw / 2, 0, 2.25], [wins[0] - .55, wins[0] + .55, .95, 2.1], [wins[1] - .55, wins[1] + .55, .95, 2.1]]; let xs = [B.x0, ...cuts.flatMap((c) => [c[0], c[1]]).sort((a, b) => a - b), B.x1];
      for (let i = 0; i < xs.length - 1; i += 2) wall(xs[i], xs[i + 1], B.z0, B.z0 + t, 0, Hh); cuts.forEach(([a, b, y0, y1]) => { if (y0 > 0) wall(a, b, B.z0, B.z0 + t, 0, y0); wall(a, b, B.z0, B.z0 + t, y1, Hh); }); }
    /* kék ablakkeretek helyett a ház színe (borvörös), zsalugáterrel */
    const fr = std({ color: h.col, roughness: .55 }), glass = new THREE.MeshStandardMaterial({ color: "#bfe3f5", roughness: .05, transparent: true, opacity: .22, depthWrite: false }); W.disposables.push(glass);
    wins.forEach((wx) => { mesh(new THREE.PlaneGeometry(1.1, 1.15).translate(wx, F + 1.52, B.z0 + .15), glass, G); [[wx, F + 2.13, 1.3, .1], [wx, F + .92, 1.3, .1], [wx - .6, F + 1.52, .1, 1.3], [wx + .6, F + 1.52, .1, 1.3], [wx, F + 1.52, .05, 1.15]].forEach(([x, y, w, hh]) => mesh(new THREE.BoxGeometry(w, hh, .36).translate(x, y, B.z0 + .15), fr, G));
      [-1, 1].forEach((sd) => { const sh = mesh(new THREE.BoxGeometry(.55, 1.2, .04), fr, G); sh.position.set(wx + sd * .95, F + 1.52, B.z0 - .05); for (let k = 0; k < 8; k++) mesh(new THREE.BoxGeometry(.5, .02, .03).translate(wx + sd * .95, F + 1.0 + k * .14, B.z0 - .08), std({ color: "#5e1220", roughness: .6 }), G); }); });
    [[dc, F + 2.32, dw + .3, .14], [dc - dw / 2 - .06, F + 1.12, .12, 2.3], [dc + dw / 2 + .06, F + 1.12, .12, 2.3]].forEach(([x, y, w, hh]) => mesh(new THREE.BoxGeometry(w, hh, .38).translate(x, y, B.z0 + .15), fr, G));
    /* vastag nádtető: kontyolt (négy oldalon lejt), a nád szálas textúrával, lekerekített ereszél */
    const reedT = canvasTex(512, 512, (g, w, hh) => { g.fillStyle = "#a88a52"; g.fillRect(0, 0, w, hh); for (let k = 0; k < 4000; k++) { const x = rand() * w, y = rand() * hh, v = rand(); g.strokeStyle = v < .3 ? "rgba(90,70,40,.5)" : v < .7 ? "rgba(190,160,100,.45)" : "rgba(140,110,60,.5)"; g.lineWidth = 1 + rand(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rand() - .5) * 3, y + 12 + rand() * 18); g.stroke(); } for (let y = 0; y < hh; y += 64) { g.fillStyle = "rgba(60,45,25,.35)"; g.fillRect(0, y, w, 5); } }, { repeat: [3, 2] });
    { const ov = 1.65, w2 = (B.x1 - B.x0) / 2 + ov, d2 = (B.z1 - B.z0) / 2 + ov, rh = 2.4, ridge = Math.max(.6, w2 - d2); const P = new Float32Array([-w2, 0, -d2, w2, 0, -d2, w2, 0, d2, -w2, 0, d2, -ridge, rh, 0, ridge, rh, 0]);
      const I = [0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 3, 5, 4, 3, 4, 0], U = new Float32Array([0, 0, 3, 0, 3, 0, 0, 0, 1.2, 1.4, 1.8, 1.4]); const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(P, 3)); rg.setAttribute("uv", new THREE.BufferAttribute(U, 2)); rg.setIndex(I); rg.computeVertexNormals();
      const rm = mesh(rg, std({ map: reedT, roughness: 1, side: THREE.DoubleSide }), G); rm.position.set(xc, F + Hh, zc); const th2 = mesh(rg.clone(), std({ map: reedT, roughness: 1, side: THREE.DoubleSide }), G); th2.position.set(xc, F + Hh + .22, zc); th2.scale.set(1.0, 1.0, 1.0);
      /* ereszél: a nád vastagsága */ const ev = new THREE.BoxGeometry(2 * w2, .22, .26); [-d2, d2].forEach((dz) => mesh(ev.clone().translate(xc, F + Hh + .1, zc + dz), std({ map: reedT, roughness: 1 }), G)); const ev2 = new THREE.BoxGeometry(.26, .22, 2 * d2); [-w2, w2].forEach((dx) => mesh(ev2.clone().translate(xc + dx, F + Hh + .1, zc), std({ map: reedT, roughness: 1 }), G));
      /* a gerincen a ház színe */ mesh(new THREE.BoxGeometry(2 * ridge + .3, .14, .3).translate(xc, F + Hh + rh + .26, zc), fr, G); mesh(new THREE.BoxGeometry(2 * w2, .025, 2 * d2).translate(xc, F + Hh + .01, zc), std({ color: "#8c6a46", roughness: .9 }), G); }
    /* tornác faoszlopokkal a ház előtt, deszkapadló */
    { const post = std({ color: "#6b4a2a", roughness: .85 }), deck = std({ map: HZ.floorT, roughness: .9 }); mesh(new THREE.BoxGeometry(B.x1 - B.x0, .12, 1.6).translate(xc, F - .05, B.z0 - .8), deck, G); for (let k = 0; k <= 4; k++) { const x = B.x0 + .2 + k * (B.x1 - B.x0 - .4) / 4; mesh(new THREE.CylinderGeometry(.1, .11, 2.9, 10).translate(x, F + 1.45, B.z0 - 1.45), post, G); mesh(new THREE.BoxGeometry(.3, .12, .3).translate(x, F + 2.9, B.z0 - 1.45), post, G); }
      mesh(new THREE.BoxGeometry(B.x1 - B.x0, .14, .16).translate(xc, F + 2.95, B.z0 - 1.45), post, G);
      /* paprikafüzérek, fokhagyma, kukorica a tornácon */
      const pap = std({ color: "#c8121e", roughness: .45 }), stem = std({ color: "#3d6a2a" }); for (let s = 0; s < 6; s++) { const x = B.x0 + .9 + s * (B.x1 - B.x0 - 1.8) / 5; for (let k = 0; k < 14; k++) { const g = new THREE.ConeGeometry(.035, .16, 6); g.rotateX(Math.PI + (rand() - .5) * .5); const a = k * 2.4; mesh(g.translate(x + Math.cos(a) * .05, F + 2.75 - k * .075, B.z0 - 1.45 + .12 + Math.sin(a) * .05), pap, G); } mesh(new THREE.CylinderGeometry(.005, .005, 1.1, 4).translate(x, F + 2.35, B.z0 - 1.33), stem, G); }
      houseSteps(G, xc, B.z0 - 1.6, F, -1); }
    /* cégtábla a tornác gerendáján + zászló a kontyon */
    { const t2 = houseSign(h), pl = mesh(new THREE.PlaneGeometry(3.4, .99), basic({ map: t2 }), G); pl.position.set(xc, F + 3.45, B.z0 - 1.56); pl.rotation.y = Math.PI; }
    houseFlag(G, h, B.x0 - .4, F + Hh + .6, zc, 3.0); houseLantern(G, dc + 1.0, F + 2.1, B.z0 - .2);
    /* belső: hosszú pult ételekkel, borospolc palackokkal, hordók, pálinkás üvegek, lógó téliszalámi, fehér abroszos asztal */
    { const wood = std({ color: "#6b4a2a", roughness: .7 }), cloth = std({ color: "#f8f6ef", roughness: .9 }), pot = std({ color: "#2b2b2b", metalness: .6, roughness: .4 }), soup = std({ color: "#a8331c", roughness: .3 });
      mesh(new THREE.BoxGeometry(.7, .95, 3.2).translate(B.x0 + .7, F + .48, zc - .2), wood, G); mesh(new THREE.BoxGeometry(.75, .04, 3.25).translate(B.x0 + .7, F + .97, zc - .2), cloth, G);
      /* bogrács gulyással, tálak, kenyér, lángos */ { const g = new THREE.Group(); g.position.set(B.x0 + .7, F + .99, zc - 1.2); G.add(g); mesh(new THREE.SphereGeometry(.2, 18, 10, 0, TAU, Math.PI / 2, Math.PI / 2).translate(0, .2, 0), pot, g); mesh(new THREE.CircleGeometry(.19, 18).rotateX(-Math.PI / 2).translate(0, .17, 0), soup, g); mesh(new THREE.TorusGeometry(.16, .008, 4, 18, Math.PI).translate(0, .25, 0), pot, g); }
      [[zc - .5, "#d9a35a"], [zc + .05, "#e8c48a"], [zc + .6, "#c27a3a"]].forEach(([z, c], i) => { mesh(new THREE.CylinderGeometry(.15, .1, .06, 18).translate(B.x0 + .7, F + 1.02, z), std({ color: "#f4f1e8", roughness: .3 }), G); if (i === 1) { const l = new THREE.CylinderGeometry(.13, .13, .03, 16); l.scale(1, 1, .8); mesh(l.translate(B.x0 + .7, F + 1.06, z), std({ color: c, roughness: .8 }), G); mesh(new THREE.CylinderGeometry(.1, .1, .01, 14).translate(B.x0 + .7, F + 1.08, z), std({ color: "#f8f4e8", roughness: .7 }), G); } else mesh(new THREE.SphereGeometry(.09, 12, 8).translate(B.x0 + .7, F + 1.08, z), std({ color: c, roughness: .8 }), G); });
      /* dobostorta a pult végén (karamell-teteje) */ mesh(new THREE.CylinderGeometry(.16, .16, .14, 20).translate(B.x0 + .7, F + 1.06, zc + 1.1), std({ color: "#7a4a24", roughness: .6 }), G); mesh(new THREE.CylinderGeometry(.165, .165, .02, 20).translate(B.x0 + .7, F + 1.14, zc + 1.1), std({ color: "#c8892a", roughness: .25 }), G);
      /* borospolc a keleti falon palackokkal (fehér, vörös, aszú) */ { const sx = B.x1 - .3; for (let r = 0; r < 4; r++) { mesh(new THREE.BoxGeometry(.35, .04, 2.4).translate(sx, F + .5 + r * .45, zc), wood, G); for (let k = 0; k < 8; k++) { const c = r === 3 ? "#c99a2a" : k % 2 ? "#3a1018" : "#cfd8a0"; const b = new THREE.CylinderGeometry(.035, .035, .26, 10); b.rotateZ(Math.PI / 2); mesh(b.translate(sx, F + .57 + r * .45, zc - 1.05 + k * .3), std({ color: c, roughness: .15, metalness: .1, transparent: r !== 1, opacity: .85 }), G); } } }
      /* hordók */ [[B.x1 - .6, B.z1 - .7], [B.x1 - 1.4, B.z1 - .6]].forEach(([x, z]) => { const br = new THREE.LatheGeometry([[0, 0], [.26, 0], [.31, .2], [.33, .4], [.31, .6], [.26, .8], [0, .8]].map(([a, b]) => new THREE.Vector2(a, b)), 18); br.rotateZ(Math.PI / 2); mesh(br.translate(x + .4, F + .34, z), std(HZ.logT ? { map: HZ.logT, roughness: .8 } : { color: "#7a5532", roughness: .8 }), G); });
      /* pálinkás üvegek (szilva, barack, körte) és az Unicum gömbölyű üvege a polcon */ { const sg = shelf(G, B.x0 + .2, F + 1.85, zc + .2, Math.PI / 2, 1.3, wood); ["#e8e4d0", "#f2c46a", "#e9e6c8", "#1b1b1b"].forEach((c, k) => { if (k === 3) { mesh(new THREE.SphereGeometry(.08, 14, 10).translate(-.45 + k * .3, .1, 0), std({ color: c, roughness: .2 }), sg); mesh(new THREE.CylinderGeometry(.015, .015, .08, 8).translate(-.45 + k * .3, .2, 0), std({ color: "#c9a23a", metalness: .7 }), sg); return; } mesh(new THREE.CylinderGeometry(.04, .05, .24, 12).translate(-.45 + k * .3, .14, 0), std({ color: c, roughness: .1, transparent: true, opacity: .7 }), sg); mesh(new THREE.CylinderGeometry(.015, .02, .08, 8).translate(-.45 + k * .3, .3, 0), std({ color: "#2b2b2b" }), sg); }); }
      /* lógó téliszalámi és kolbász a gerendán */ for (let k = 0; k < 4; k++) { const sx = B.x0 + 1.5 + k * .4; rodBetween(new THREE.Vector3(sx, F + 2.85, B.z0 + .9), new THREE.Vector3(sx, F + 2.55, B.z0 + .9), .004, std({ color: "#ddd" }), G, 3); mesh(new THREE.CylinderGeometry(.045, .045, .5, 10).translate(sx, F + 2.28, B.z0 + .9), std({ color: k % 2 ? "#d9d0bd" : "#7a2a1a", roughness: .9 }), G); }
      poster(G, ["HUNGARIKUM", "pálinka · Tokaji aszú", "PICK és HERZ szalámi", "szegedi, kalocsai", "paprika · Unicum"], h.col, B.x1 - .2, F + 2.05, B.z0 + 1.0, -Math.PI / 2, .7); }
    h.board = { x: xc + .5, y: F + 1.65, z: B.z1 - .35, ry: Math.PI, w: 3.2 }; h.seat = { x: xc + .5, z: B.z1 - 3.35 }; h.tpos = { x: xc - 1.6, z: B.z1 - 1.0, ry: Math.PI - .65 }; h.studs = [{ k: "gyerek", x: xc + 2.3, z: B.z1 - 1.75 }]; }
  /* ---------------------------------------------------------------- VILÁGÍTÓTORONY a hullámtörő végén – az őrház a tanterem (rönkház, ajtaja a hullámtörő felé),
     mellette a zárt, fehér-piros sávos torony kerengővel és forgó fénnyel (2026-11-15: a toronybelső szűk volt és szétesett – a tanítás az őrházba költözött) */
  function lighthouseBuild(G, h) { const B = h.box, F = h.F, xc = xMid(B), zc = zMid(B);
    /* betonplató a hullámtörő végén (a ház és a torony alatt) */
    const conc = std({ color: "#b7b2a6", roughness: .9 }); mesh(new THREE.BoxGeometry(11.4, 1.6, 7.4).translate(xc + 2.6, F - .82, zc + .1), conc, G);
    const C = cabinBuild(G, { box: B, F, door: "s", dc: xc - .7, win: [["w", zc, 1.1], ["n", xc + .9, 1.2]], h, flagX: B.x0 - .15 });
    /* a torony: zárt, kúposan szűkülő, sávos */
    const tx = B.x1 + 2.3, tz = zc - .2, R = 1.9, H = 12.5;
    const lt = canvasTex(512, 1024, (g, w, hh) => { for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? "#c8202a" : "#f6f4ee"; g.fillRect(0, k * hh / 6, w, hh / 6); } for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(0,0,0,${rand() * .04})`; g.fillRect(rand() * w, rand() * hh, 2 + rand() * 30, 1 + rand() * 4); } });
    mesh(new THREE.CylinderGeometry(R * .72, R, H, 32, 1, false).translate(tx, F + H / 2, tz), std({ map: lt, roughness: .6 }), G);
    mesh(new THREE.CylinderGeometry(R + .2, R + .3, .4, 32).translate(tx, F + .1, tz), std({ color: "#9a958a", roughness: .9 }), G);
    /* ajtó a torony tövében (zárt, a ház színével) és két kis ablak */ { const fr = std({ color: h.col, roughness: .55 }), a = Math.PI; const dx = tx + Math.sin(a) * R * .985, dz = tz + Math.cos(a) * R * .985; const dr = mesh(new THREE.BoxGeometry(1.0, 2.1, .12), fr, G); dr.position.set(dx - .02, F + 1.05, dz); dr.rotation.y = a + Math.PI / 2;
      [4.5, 8.2].forEach((y) => { const r2 = R - (R - R * .72) * (y / H), w = mesh(new THREE.BoxGeometry(.5, .7, .1), std({ color: "#1d2a38", roughness: .3 }), G); w.position.set(tx - r2 * .99, F + y, tz); w.rotation.y = Math.PI / 2; }); }
    { const top = F + H, r0 = R * .72, gal = std({ color: "#1d232b", roughness: .5, metalness: .6 }); mesh(new THREE.CylinderGeometry(r0 + .6, r0 + .6, .14, 32).translate(tx, top, tz), gal, G); for (let k = 0; k < 20; k++) { const a = k / 20 * TAU; mesh(new THREE.CylinderGeometry(.02, .02, .9, 5).translate(tx + Math.cos(a) * (r0 + .55), top + .45, tz + Math.sin(a) * (r0 + .55)), gal, G); }
      mesh(new THREE.TorusGeometry(r0 + .55, .03, 5, 32).rotateX(Math.PI / 2).translate(tx, top + .9, tz), gal, G); const glassM = new THREE.MeshStandardMaterial({ color: "#d8f0ff", roughness: .05, metalness: .3, transparent: true, opacity: .35, depthWrite: false }); W.disposables.push(glassM); mesh(new THREE.CylinderGeometry(.95, .95, 1.5, 16, 1, true).translate(tx, top + .9, tz), glassM, G);
      mesh(new THREE.ConeGeometry(1.2, 1.0, 16).translate(tx, top + 2.1, tz), std({ color: "#c8202a", roughness: .5 }), G); mesh(new THREE.SphereGeometry(.14, 10, 8).translate(tx, top + 2.65, tz), gal, G);
      const lens = new THREE.MeshStandardMaterial({ color: "#fff6c8", emissive: "#ffd36a", emissiveIntensity: .8, roughness: .2 }); W.disposables.push(lens); mesh(new THREE.CylinderGeometry(.42, .42, .9, 16).translate(tx, top + .9, tz), lens, G);
      const bm = new THREE.MeshBasicMaterial({ color: "#fff1b0", transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); W.disposables.push(bm);
      const bg = new THREE.Group(); bg.position.set(tx, top + .9, tz); G.add(bg); [0, Math.PI].forEach((a) => { const c = new THREE.ConeGeometry(2.2, 26, 16, 1, true); c.rotateZ(Math.PI / 2); c.translate(13, 0, 0); const m = mesh(c, bm, bg); m.rotation.y = a; }); bg.userData.noMerge = true; bg.visible = false; HZ.beams.push(bg);
      houseFlag(G, h, tx + r0 + .55, top + .9, tz, 2.0); }
    /* belső: hajózási térkép-asztal, Fresnel-lencse modell, piros és zöld jelzőlámpa, iránytű */
    { const wood = std({ color: "#6b4a2a", roughness: .7 }); const t0x = B.x0 + .75, t0z = zc + .3; mesh(new THREE.BoxGeometry(.7, .06, 1.1).translate(t0x, F + .85, t0z), wood, G); mesh(new THREE.PlaneGeometry(.62, 1.0).rotateX(-Math.PI / 2).translate(t0x, F + .885, t0z), basic({ map: canvasTex(192, 256, (g, w, hh) => { g.fillStyle = "#e9e2c8"; g.fillRect(0, 0, w, hh); g.fillStyle = "#9cc6d8"; g.beginPath(); g.ellipse(96, 128, 46, 110, .3, 0, TAU); g.fill(); g.strokeStyle = "#555"; g.strokeRect(4, 4, w - 8, hh - 8); }) }), G); [[-.3, -.5], [.3, -.5], [-.3, .5], [.3, .5]].forEach(([a, b]) => mesh(new THREE.BoxGeometry(.05, .85, .05).translate(t0x + a, F + .42, t0z + b), wood, G));
      const lx = B.x1 - .6, lz = zc + .6; const lens = std({ color: "#e8f4ff", roughness: .05, metalness: .2, transparent: true, opacity: .55 }); for (let k = 0; k < 6; k++) mesh(new THREE.TorusGeometry(.12 + k * .05, .018, 6, 24).rotateY(Math.PI / 2).translate(lx, F + 1.1, lz), lens, G); mesh(new THREE.BoxGeometry(.5, .6, .5).translate(lx, F + .3, lz), wood, G);
      [["#d0342c", -.3], ["#2f9e57", .3]].forEach(([c, o]) => { const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .8, roughness: .3 }); W.disposables.push(m); mesh(new THREE.SphereGeometry(.09, 12, 10).translate(B.x1 - .2, F + 1.8, zc + o), m, G); }); }
    poster(G, ["HAJÓFÉNYEK", "port: piros", "starboard: zöld", "hátul: fehér", "szemből: piros+zöld"], h.col, B.x0 + .2, F + 1.75, B.z0 + 1.0, Math.PI / 2, .7);
    h.board = { x: xc, y: F + 1.65, z: B.z0 + .2, ry: 0, w: 3.0 }; h.seat = { x: xc, z: B.z0 + 3.0 }; h.tpos = { x: B.x1 - .9, z: B.z0 + .95 }; h.studs = []; h.out = { x: xc - .7, z: B.z1 + 1.3, lx: xc - .7, lz: B.z1 + 6 };
    hbTpSurf(HZ.env || G, xc, zc, B.x1 - B.x0 - .6, B.z1 - B.z0 - .6, F + .01, .25); hbTpSurf(HZ.env || G, xc + 2.6, B.z1 + .9, 10, 1.6, .67, .3); }

  /* ---------------------------------------------------------------- SZÍNES ÖSVÉNYCSÍKOK a móló tövétől minden házig (C-jelölés), egy hálóban */
  function housePaths(env) { const parts = [], dash = canvasTex(64, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#fff"; uiRR(g, 6, 10, w - 12, h * .62, 10); g.fill(); });
    const start = { x: 0, z: 4.2 }, ribbon = (pts, col, off) => { const P = [], U = [], C = [], ii = []; let acc = 0; const cc = new THREE.Color(col);
        const dense = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / .8)); for (let k = 0; k < n; k++) dense.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]); } dense.push(pts[pts.length - 1]);
        dense.forEach(([x, z], i) => { const nx2 = dense[Math.min(i + 1, dense.length - 1)], pv = dense[Math.max(i - 1, 0)], dx = nx2[0] - pv[0], dz = nx2[1] - pv[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L; if (i) acc += Math.hypot(x - dense[i - 1][0], z - dense[i - 1][1]);
          [-1, 1].forEach((s) => { const px = x + nx * (off + s * .07), pz = z + nz * (off + s * .07); P.push(px, landWalkY(px, pz) + .012, pz); U.push(s > 0 ? 1 : 0, acc / 1.1); C.push(cc.r, cc.g, cc.b); }); if (i) { const a = (i - 1) * 2; ii.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); g.setIndex(ii); g.computeVertexNormals(); parts.push([g, new THREE.Matrix4()]); };
    const west = HOUSES.filter((h) => h.box.x1 < 0).sort((a, b) => b.box.x0 - a.box.x0);
    west.forEach((h, i) => { const off = -.5 + i * .2, B = h.box, dx = h.kind === "csarda" ? xMid(B) : h.id === "ter" ? B.x0 + 1.6 : xMid(B) - .9, pz = landPromZ(dx), dz = h.kind === "csarda" ? B.z0 - 1.9 : B.z0 - 1.6;
      ribbon([[start.x - .3, start.z], [start.x - .6, landPromZ(0) - .2], [dx + 1.2, pz - .2], [dx, pz + .8], [dx, dz]], h.col, off); });
    /* 2026-11-15 este: a keleti szárny (Természetvédelmi ház, Magyar Ízek Háza) ösvényei – a tértől a sétányon kelet felé, majd fel a házhoz */
    const east = HOUSES.filter((h) => h.box.x0 > 0 && !["isk", "els", "vil"].includes(h.id)).sort((a, b) => a.box.x0 - b.box.x0);
    east.forEach((h, i) => { const off = .5 + i * .2, B = h.box, dx = h.kind === "csarda" ? xMid(B) : h.id === "ter" ? B.x0 + 1.6 : xMid(B) - .9, pz = landPromZ(dx), dz = h.kind === "csarda" ? B.z0 - 1.9 : B.z0 - 1.6;
      ribbon([[start.x + .3, start.z], [start.x + .7, landPromZ(0) + .2], [dx - 1.2, pz + .2], [dx, pz + .9], [dx, dz]], h.col, off); });
    const isk = HZ.byId.isk, els = HZ.byId.els, vil = HZ.byId.vil;
    ribbon([[1.7, 4.3], [2.6, 3.6], [2.9, 2.2]], isk.col, 0); ribbon([[1.7, 4.5], [9.9, 4.45], [10.4, 3.4], [10.6, 2.3]], els.col, 0);
    ribbon([[start.x + .4, start.z + .2], [3, landPromZ(3) - .4], [22.5, landPromZ(22.5) - .4], [24.6, 3.4], [25.6, -10], [26.6, -20], [27.7, -23.6]], vil.col, 0);
    const m = new THREE.Mesh(mergeGeoms(parts), std({ map: dash, vertexColors: true, transparent: true, alphaTest: .4, roughness: .7, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -2 })); m.renderOrder = 1; dash.wrapT = THREE.RepeatWrapping; env.add(m); }
  /* ---------------------------------------------------------------- KIKÖTŐTÉRKÉP a móló tövénél (a házak a saját színükkel és zászlójukkal) */
  function harborMap(env) { const tx = canvasTex(1400, 900, (g, w, hh) => { g.fillStyle = "#f6f1e6"; g.fillRect(0, 0, w, hh); const KM = 9.36, MX0 = 40 + (860 - 66 * KM) / 2, MX1 = MX0 + 66 * KM, MY0 = 130, MY1 = 130 + 78 * KM, X = (x) => MX0 + (x + 32) * KM, Z = (z) => MY0 + (z + 54) * KM;   /* 2026-11-15 este: torzítás nélküli lépték, a móló végi versenyirodával együtt */
      g.save(); g.beginPath(); g.rect(MX0, MY0, MX1 - MX0, MY1 - MY0); g.clip(); g.fillStyle = "#7fb8cf"; g.fillRect(MX0, MY0, MX1 - MX0, MY1 - MY0);
      g.fillStyle = "#ecdcb2"; g.beginPath(); g.moveTo(MX0, MY1); for (let x = -32; x <= 34; x += 2) g.lineTo(X(x), Z(landShore(x))); g.lineTo(MX1, MY1); g.fill(); g.fillStyle = "#93c25e"; g.beginPath(); g.moveTo(MX0, MY1); for (let x = -32; x <= 34; x += 2) g.lineTo(X(x), Z(landPromZ(x) + 1.6)); g.lineTo(MX1, MY1); g.fill();
      g.strokeStyle = "#d6cbb3"; g.lineWidth = 12; g.beginPath(); for (let x = -32; x <= 34; x += 2) x === -32 ? g.moveTo(X(x), Z(landPromZ(x))) : g.lineTo(X(x), Z(landPromZ(x))); g.stroke();
      g.fillStyle = "#a07a52"; g.fillRect(X(-1.5), Z(-44), X(1.5) - X(-1.5), Z(2) - Z(-44)); g.fillRect(X(-7), Z(-52), X(7) - X(-7), Z(-44) - Z(-52)); g.fillStyle = "#ffffff"; g.fillRect(X(-4.2), Z(-51.7), X(4.2) - X(-4.2), Z(-48.6) - Z(-51.7)); g.fillStyle = "#0b2f5e"; g.font = `900 24px ${UIF}`; g.textAlign = "left"; g.fillText("⛵ RAJT · VERSENYIRODA", X(7.6), Z(-47.2)); g.fillStyle = "#a07a52"; [-8, -18, -31].forEach((z) => { g.fillRect(X(-7), Z(z + 2.4), X(7) - X(-7), 6); }); g.fillRect(X(1.5), Z(-2.5), X(17.5) - X(1.5), Z(4.9) - Z(-2.5)); g.fillStyle = "#b9b3a8"; g.fillRect(X(-6.6), Z(1.4), X(1.7) - X(-6.6), Z(6.8) - Z(1.4));
      g.strokeStyle = "#8f897d"; g.lineWidth = 16; g.beginPath(); g.moveTo(X(24.5), Z(4)); g.lineTo(X(25.6), Z(-10)); g.lineTo(X(26.6), Z(-20)); g.lineTo(X(29.5), Z(-24.2)); g.stroke();
      HOUSES.forEach((h, i) => { const B = h.box, x0 = X(B.x0), x1 = X(B.x1), z0 = Z(B.z0), z1 = Z(B.z1); g.fillStyle = h.col; uiRR(g, x0, z0, x1 - x0, z1 - z0, 6); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke(); g.fillStyle = "#fff"; g.font = `900 30px ${UIF}`; g.textAlign = "center"; g.fillText(String(i + 1), (x0 + x1) / 2, (z0 + z1) / 2 + 11); });
      g.fillStyle = "#d61f26"; g.beginPath(); g.arc(X(-1), Z(3.6), 13, 0, TAU); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 4; g.stroke(); g.fillStyle = "#14161b"; g.font = `900 26px ${UIF}`; g.textAlign = "left"; g.fillText("ITT VAGY", X(-1) + 18, Z(3.6) - 14); g.restore();
      g.strokeStyle = "#0b2f5e"; g.lineWidth = 4; g.strokeRect(MX0, MY0, MX1 - MX0, MY1 - MY0);
      /* jelmagyarázat: szám, szín, zászló, név */
      HOUSES.forEach((h, i) => { const y = 150 + i * 88; g.fillStyle = h.col; uiRR(g, 930, y, 430, 76, 14); g.fill(); g.fillStyle = "rgba(255,255,255,.95)"; uiRR(g, 940, y + 10, 56, 56, 28); g.fill(); g.fillStyle = h.col; g.font = `900 32px ${UIF}`; g.textAlign = "center"; g.fillText(String(i + 1), 968, y + 50);
        g.save(); g.translate(1008, y + 20); icsFlag(g, h.flag, 54, 36); g.restore(); g.fillStyle = "#fff"; g.font = `800 28px ${UIF}`; g.textAlign = "left"; let fs = 28; while (g.measureText(h.name).width > 280 && fs > 16) { fs -= 2; g.font = `800 ${fs}px ${UIF}`; } g.fillText(h.name, 1074, y + 36); g.font = `600 20px ${UIF}`; g.fillStyle = "rgba(255,255,255,.88)"; g.fillText(h.sub, 1074, y + 62); });
      g.fillStyle = "#0b2f5e"; g.fillRect(0, 0, w, 110); g.fillStyle = "#ffd166"; g.font = `900 60px ${UIF}`; g.textAlign = "center"; g.fillText("ZAMÁRDI KIKÖTŐ · OKTATÓHÁZAK", w / 2, 76); g.fillStyle = "#14161b"; g.font = `700 22px ${UIF}`; g.textAlign = "left"; g.fillText("A színes csíkok a mólótól a házakig vezetnek.", 930, 880); g.strokeStyle = "#0b2f5e"; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, hh - 12); });
    const G = new THREE.Group(); G.position.set(-2.4, landWalkY(-2.4, 5.6) - .04, 5.6); G.rotation.y = Math.PI * .92; env.add(G); const wood = std({ color: "#5d4630", roughness: .9 });
    [-1.1, 1.1].forEach((dx) => mesh(new THREE.BoxGeometry(.1, 2.1, .1).translate(dx, 1.05, 0), wood, G)); mesh(new THREE.BoxGeometry(2.4, 1.6, .06).translate(0, 1.55, -.02), wood, G); mesh(new THREE.PlaneGeometry(2.24, 1.44).translate(0, 1.55, .015), basic({ map: tx }), G); const rf = mesh(new THREE.BoxGeometry(2.6, .06, .4), wood, G); rf.position.set(0, 2.42, .05); rf.rotation.x = .2; }

  /* ---------------------------------------------------------------- mozgás képkockánként: zászlók, a világítótorony fénye, a torony viharjelzője */
  /* 2026-11-15 19:24 (tulajdonos a szemüvegből: „nagyon akadozik … folyamatosan fagy”): a házak BELSEJE (bútor, tábla, plakátok, műszerek, mobil) csak akkor
     rajzolódik, ha bent vagy, vagy 6,5 m-nél közelebb a házhoz – kintről a falak és a tető úgyis takarják, a Quest mégis végigrajzolta mind a nyolcat.
     A belső tárgyakat a helyük alapján választjuk szét (a falakon belül, a födém alatt), és a ház saját csoportjában olvadnak össze (msAnchor). */
  function hzInnerSplit() {
    const bb = new THREE.Box3(), inv = new THREE.Matrix4(), env = HZ.env; if (!env) return; env.updateMatrixWorld(true); inv.copy(env.matrixWorld).invert();
    HOUSES.forEach((h) => { const G = h.G, B = h.box; if (!G || !B || h.innerG) return;
      const inner = new THREE.Group(); inner.name = "belso-" + h.id; inner.userData.msAnchor = 1; inner.userData.msHidable = 1; G.add(inner); h.innerG = inner; let n = 0;
      const inside = (o) => { bb.setFromObject(o); if (bb.isEmpty()) return false; bb.applyMatrix4(inv); return bb.min.x > B.x0 + .08 && bb.max.x < B.x1 - .08 && bb.min.z > B.z0 + .08 && bb.max.z < B.z1 - .08; };
      /* a csoportokon belül is keresünk: egy berendezés-csoport állhat kint és bent is (pl. a torony műszerei) – ilyenkor csak a bent lévő részei kerülnek a belsőbe */
      const split = (par, depth) => { par.children.slice().forEach((o) => { if (o === inner || (o.userData && (o.userData.keepOut || o.userData.xr || o.userData.tp))) return;
        if (inside(o)) { inner.attach(o); n++; } else if (depth < 3 && o.children && o.children.length && !o.isMesh) split(o, depth + 1); }); };
      split(G, 0); h.innerN = n; });
  }
  function hzInnerTick() { const p = (typeof locP === "function" ? locP() : HB.pos) || { x: 0, z: 0 };
    HOUSES.forEach((h) => { if (!h.innerG) return; const B = h.box, dx = Math.max(B.x0 - p.x, 0, p.x - B.x1), dz = Math.max(B.z0 - p.z, 0, p.z - B.z1); h.innerG.visible = Math.hypot(dx, dz) < 6.5; }); }
  function houseTick(dt) { const t = W.t; try { hzInnerTick(); } catch (e) {}
    HZ.flags.forEach((f) => { if (!f.parent) return; const pa = f.geometry.attributes.position, b0 = f.userData.base; for (let i = 0; i < pa.count; i++) { const x = b0[i * 3]; pa.array[i * 3 + 2] = Math.sin(x * 5 - t * 5.5 + f.userData.ph) * .07 * x; pa.array[i * 3 + 1] = b0[i * 3 + 1] + Math.sin(x * 3 - t * 3) * .015 * x; } pa.needsUpdate = true; });
    const night = (typeof NGT !== "undefined" && NGT.on) || !!HB.night; HZ.beams.forEach((b) => { b.rotation.y = t * .9; b.visible = night; });
    /* 2026-11-15 (tulajdonos): a viharjelző tornyon „menjen a sárga villogó fény percenként 45” – alaphelyzetben elsőfok, valódi másodfoknál 90/perc */
    const l = (typeof STM !== "undefined" && STM.lv) ? (STM.lv.keleti || 0) : 0, per = l === 2 ? 60 / 90 : 60 / 45, on = per && (t % per) / per < .34;
    HZ.lamps.forEach((q) => { q.glow.visible = !!on; q.lamp.material.color.set(on ? "#ffe066" : "#7a6420"); q.lamp.material.emissive.set(on ? "#ffaa00" : "#000000"); });
    try { cloudHouseTick(dt); } catch (e) {} try { knotHouseTick(dt); } catch (e) {} }
