  /* =====================================================================================================
     2026-11-16 éjjel (tulajdonos: „a Természetvédelmi Háznál valós halakkal és valós képekkel és valós madár … fotókkal … az élővilág bemutatása …
     sokkal szélesebb körű és színesebb”): A TERMÉSZETVÉDELMI HÁZ BELSEJE
       25 keretezett, valódi fotó a falakon (halak · madarak · emlősök és hüllők · vízinövények · tájak) fejléctáblákkal
       · az akvárium üvege mögött a valódi halfotókból összeálló, lassan úszó-zoomoló „élő” vetítés (buborékokkal, a kép szerzőjével)
       · tavirózsás vályú az északi ablak alatt (alacsony, hogy ne takarja a kilátást a tóra)
       · a tetőszerkezetről függő pillangók (szárnyuk libben) és szitakötők
       · „Képek forrása” tábla az északi fal tetején (szerző + licenc), a fotók a ház közelében töltődnek (05na-fotok.js)
     A régi berendezés (akvárium, madárpolc, nádköteg, a balatoni halak és madarak szöveges plakátja kivételével) marad.
     ===================================================================================================== */
  function termeszetBelso(G, h, C) {
    const B = h.box, F = C.F, X0 = B.x0, X1 = B.x1, Z0 = B.z0, Z1 = B.z1, zc = (Z0 + Z1) / 2, xc = (X0 + X1) / 2, PI = Math.PI, HALF = PI / 2;
    const xW = X0 + .2, xE = X1 - .2, zN = Z0 + .2, zS = Z1 - .2;
    const fr = (id, cap, x, y, z, ry, w, hh) => FOTO.frame(G, h, id, cap, x, y, z, ry, w, hh);
    /* ---------- faragott fejléctábla (zöld-arany kerettel) */
    const plaque = (txt, x, y, z, ry, w, hh) => { const PWp = 1024, PHp = Math.round(PWp * hh / w);
      const tx = canvasTex(PWp, PHp, (g, ww, h2) => { const gr = g.createLinearGradient(0, 0, 0, h2); gr.addColorStop(0, "#7a5532"); gr.addColorStop(1, "#4f3820"); g.fillStyle = gr; g.fillRect(0, 0, ww, h2);
        for (let k = 0; k < 26; k++) { g.strokeStyle = "rgba(40,24,10,.3)"; g.lineWidth = 1 + rand() * 2; const yy = rand() * h2; g.beginPath(); g.moveTo(0, yy); g.lineTo(ww, yy + rand() * 8 - 4); g.stroke(); }
        g.strokeStyle = "#3d9a4b"; g.lineWidth = 10; g.strokeRect(6, 6, ww - 12, h2 - 12); g.strokeStyle = "#c9a23a"; g.lineWidth = 3; g.strokeRect(18, 18, ww - 36, h2 - 36);
        g.textAlign = "center"; let fs = Math.round(h2 * .52); g.font = `900 ${fs}px ${UIF}`; while (g.measureText(txt).width > ww - 90 && fs > 20) { fs -= 2; g.font = `900 ${fs}px ${UIF}`; }
        g.fillStyle = "rgba(20,10,0,.7)"; g.fillText(txt, ww / 2 + 3, h2 / 2 + fs * .34 + 3); g.fillStyle = "#ffe9a8"; g.fillText(txt, ww / 2, h2 / 2 + fs * .34); });
      const m = mesh(new THREE.PlaneGeometry(w, hh), basic({ map: tx }), G); m.position.set(x, y, z); m.rotation.y = ry; m.userData.noMerge = true; return m; };

    /* ---------- NYUGATI FAL – HALAK (az akvárium fölött és a déli részen), a oromzaton a Balaton */
    fr("fogas", "Fogassüllő", xW, F + 2.0, Z0 + 1.0, HALF, .56, .4); fr("harcsa", "Harcsa", xW, F + 2.0, Z0 + 1.62, HALF, .56, .4);
    plaque("HALAK", xW, F + 2.43, Z0 + 1.3, HALF, 1.0, .2);
    fr("ponty", "Ponty", xW, F + 1.95, Z1 - 1.6, HALF, .72, .5); fr("csuka", "Csuka", xW, F + 1.95, Z1 - .75, HALF, .72, .5);
    fr("keszeg", "Dévérkeszeg", xW, F + 1.25, Z1 - 1.6, HALF, .72, .5); fr("kecsege", "Kecsege", xW, F + 1.25, Z1 - .75, HALF, .72, .5);
    fr("balaton", "A Balaton – vitorlások Tihanynál", xW, F + 3.55, zc, HALF, 1.3, .9);
    /* ---------- KELETI FAL – MADARAK (a madárpolc körül), az oromzaton a Kis-Balaton */
    fr("hattyu", "Bütykös hattyú", xE, F + 2.62, zc - .65, -HALF, .6, .42); fr("kocsag", "Nagy kócsag", xE, F + 2.62, zc, -HALF, .6, .42); fr("szurkegem", "Szürke gém", xE, F + 2.62, zc + .65, -HALF, .6, .42);
    plaque("MADARAK", xE, F + 2.99, zc, -HALF, 1.3, .2);
    fr("siraly", "Dankasirály", xE, F + 1.05, zc - .4, -HALF, .66, .46); fr("vocsok", "Búbos vöcsök", xE, F + 1.05, zc + .4, -HALF, .66, .46);
    fr("jegmadar", "Jégmadár", xE, F + 1.95, Z0 + 1.45, -HALF, .8, .56); fr("retisas", "Rétisas", xE, F + 1.25, Z0 + 1.45, -HALF, .8, .56);
    fr("golya", "Fehér gólya", xE, F + 1.95, Z1 - 1.0, -HALF, .8, .56); fr("kormoran", "Nagy kárókatona", xE, F + 1.25, Z1 - 1.0, -HALF, .8, .56);
    fr("kisbalaton", "A Kis-Balaton", xE, F + 3.62, zc, -HALF, 1.3, .9);
    /* ---------- ÉSZAKI FAL – VÍZI NÖVÉNYEK (az ajtó és az ablak között / mellett) */
    fr("vizitok", "Sárga vízitök", X0 + .52, F + 1.7, zN, 0, .5, .68); fr("tavirozsa", "Fehér tavirózsa", X0 + 2.7, F + 1.7, zN, 0, .56, .74);
    fr("nosziromy", "Sárga nőszirom", X1 - .65, F + 1.7, zN, 0, .6, .78); fr("nad", "A nád tollas bugája", X0 + 1.6, F + 2.62, zN, 0, .9, .36);
    /* ---------- DÉLI FAL – ÁLLATOK a tábla két oldalán, felette a fejléc */
    fr("vidra", "Vidra", 6.0, F + 1.95, zS, PI, .6, .42); fr("hod", "Hód", 6.0, F + 1.4, zS, PI, .6, .42);
    fr("teknos", "Mocsári teknős", X1 - .95, F + 1.95, zS, PI, .9, .63); fr("oz", "Őz", X1 - .95, F + 1.15, zS, PI, .9, .63);
    plaque("A BALATON ÉLŐVILÁGA", xc, F + 2.8, zS, PI, 2.6, .24);

    /* ---------- „Képek forrása” – széles, háromoszlopos tábla az északi ablak fölött */
    const NM = { fogas: "Fogassüllő", harcsa: "Harcsa", ponty: "Ponty", csuka: "Csuka", keszeg: "Dévérkeszeg", kecsege: "Kecsege", balin: "Balin", compo: "Compó", angolna: "Angolna", balaton: "A Balaton",
      hattyu: "Bütykös hattyú", kocsag: "Nagy kócsag", szurkegem: "Szürke gém", siraly: "Dankasirály", vocsok: "Búbos vöcsök", jegmadar: "Jégmadár", retisas: "Rétisas", golya: "Fehér gólya", kormoran: "Nagy kárókatona", kisbalaton: "Kis-Balaton",
      vizitok: "Sárga vízitök", tavirozsa: "Fehér tavirózsa", nosziromy: "Sárga nőszirom", nad: "Nád", vidra: "Vidra", hod: "Hód", teknos: "Mocsári teknős", oz: "Őz" };
    FOTO.creditBoard(G, h, "KÉPEK FORRÁSA", Object.keys(NM).map((id) => [id, NM[id]]), xc + 1.0, F + 2.66, zN, 0, 2.4, 3);

    /* ---------- AKVÁRIUM: a régi rajzolt halak helyett valódi halfotók lassan úszó-zoomoló vetítése (csak ha a közelben vagy) */
    { const AQ = ["fogas", "harcsa", "csuka", "balin", "compo", "kecsege", "angolna"]; (h.phIds = h.phIds || []).push("balin", "compo", "angolna");
      const tex = canvasTex(512, 283, () => {}), cg = tex._canvas.getContext("2d");
      const ov = mesh(new THREE.PlaneGeometry(1.12, .62), basic({ map: tex }), G); ov.position.set(X0 + .662, F + 1.0, Z0 + 1.3); ov.rotation.y = HALF; ov.visible = false; ov.userData.noMerge = true;
      const bub = Array.from({ length: 16 }, () => ({ x: rand() * 512, y: rand() * 283, r: 1.6 + rand() * 3.6, v: 16 + rand() * 30, ph: rand() * 6 })); let last = -9, lastT = 0;
      const SL = 7.5, FD = 1.3;
      HZ.anim.push((t) => { if (!h.innerG || !h.innerG.visible || t - last < .09) return; const dt = Math.min(.2, t - lastT); lastT = t; last = t;
        const ready = AQ.filter((id) => FOTO.img(id)); if (!ready.length) return;
        const k = t / SL, i0 = Math.floor(k) % ready.length, f = k - Math.floor(k), a = ready[i0], b = ready[(i0 + 1) % ready.length], mx = f > 1 - FD / SL ? (f - (1 - FD / SL)) / (FD / SL) : 0;
        const pic = (id, al, ff) => { const im = FOTO.img(id); if (!im) return; const fc = FOTO.FOC[id] || [.5, .5]; cg.globalAlpha = al; FOTO.cover(cg, im, 0, 0, 512, 283, { z: 1.05 + .13 * ff, fx: fc[0] + (ff - .5) * .06, fy: fc[1] }); cg.globalAlpha = 1; };
        cg.fillStyle = "#0c3f52"; cg.fillRect(0, 0, 512, 283); pic(a, 1, f); if (mx > 0) pic(b, mx, 0);
        /* vízszín, fénysugarak, buborékok, üvegfény */
        cg.fillStyle = "rgba(20,110,150,.22)"; cg.fillRect(0, 0, 512, 283);
        for (let i = 0; i < 4; i++) { const x0 = 60 + i * 120 + Math.sin(t * .5 + i) * 18; cg.fillStyle = "rgba(190,240,255,.07)"; cg.beginPath(); cg.moveTo(x0, 0); cg.lineTo(x0 + 34, 0); cg.lineTo(x0 + 10, 283); cg.lineTo(x0 - 40, 283); cg.closePath(); cg.fill(); }
        bub.forEach((q) => { q.y -= q.v * dt; q.x += Math.sin(t * 2 + q.ph) * .25; if (q.y < -8) { q.y = 291; q.x = rand() * 512; } cg.strokeStyle = "rgba(235,250,255,.75)"; cg.lineWidth = 1.3; cg.beginPath(); cg.arc(q.x, q.y, q.r, 0, TAU); cg.stroke(); cg.fillStyle = "rgba(255,255,255,.16)"; cg.fill(); });
        const gl = cg.createLinearGradient(0, 0, 0, 283); gl.addColorStop(0, "rgba(255,255,255,.2)"); gl.addColorStop(.18, "rgba(255,255,255,0)"); gl.addColorStop(.85, "rgba(0,20,40,0)"); gl.addColorStop(1, "rgba(0,20,40,.5)"); cg.fillStyle = gl; cg.fillRect(0, 0, 512, 283);
        const nm = { fogas: "Fogassüllő", harcsa: "Harcsa", csuka: "Csuka", balin: "Balin", compo: "Compó", kecsege: "Kecsege", angolna: "Angolna" }[mx > .5 ? b : a] || "", id = mx > .5 ? b : a;
        cg.font = `800 26px ${UIF}`; cg.textAlign = "left"; const tw = cg.measureText(nm).width + 30; cg.fillStyle = "rgba(10,25,35,.58)"; uiRR(cg, 12, 242, tw, 32, 16); cg.fill(); cg.fillStyle = "#e9fbff"; cg.fillText(nm, 27, 266);
        const cr = FOTO.credit(id); if (cr) { cg.font = `600 14px ${UIF}`; cg.textAlign = "right"; cg.fillStyle = "rgba(0,0,0,.6)"; cg.fillText(cr, 503, 273); cg.fillStyle = "rgba(255,255,255,.92)"; cg.fillText(cr, 502, 272); }
        ov.visible = true; tex.needsUpdate = true; }); }

    /* ---------- TAVIRÓZSÁS VÁLYÚ az északi ablak alatt (a növények a párkány alatt maradnak) */
    { const cx = xc + 1.0, cz = Z0 + .6, TL = 2.3, TD = .5, TH = .42, wd = std({ color: "#6b4b2d", roughness: .9 }), wt = std({ color: "#2f7f8c", roughness: .1, metalness: .15, transparent: true, opacity: .92 });
      const P = {}, put = (k, g, x, y, z, ry, rx, rz, sx, sy, sz) => { (P[k] = P[k] || []).push([g, M4(x, y, z, ry, rx, rz, sx, sy, sz)]); };
      put("wd", new THREE.BoxGeometry(TL, TH, .05), cx, F + TH / 2, cz - TD / 2 + .025); put("wd", new THREE.BoxGeometry(TL, TH, .05), cx, F + TH / 2, cz + TD / 2 - .025);
      put("wd", new THREE.BoxGeometry(.05, TH, TD), cx - TL / 2 + .025, F + TH / 2, cz); put("wd", new THREE.BoxGeometry(.05, TH, TD), cx + TL / 2 - .025, F + TH / 2, cz); put("wd", new THREE.BoxGeometry(TL, .04, TD), cx, F + .02, cz);
      put("wd", new THREE.BoxGeometry(TL + .05, .03, .07), cx, F + TH, cz - TD / 2 + .02); put("wd", new THREE.BoxGeometry(TL + .05, .03, .07), cx, F + TH, cz + TD / 2 - .02);
      [-.8, 0, .8].forEach((dx) => { put("wd", new THREE.BoxGeometry(.05, TH + .02, TD + .03), cx + dx * 1.2, F + TH / 2, cz); });
      const yw = F + TH - .07;
      /* levelek a víz színén */
      for (let k = 0; k < 11; k++) { const r = .075 + rand() * .07, x = cx + (rand() - .5) * (TL - .45), z = cz + (rand() - .5) * (TD - .22); put(k % 3 ? "pad" : "pad2", new THREE.CircleGeometry(r, 16, .35, TAU - .35).rotateX(-HALF), x, yw + .004 + rand() * .004, z, rand() * TAU); }
      /* három fehér tavirózsa és egy sárga vízitök-virág */
      [[-.55, .02], [.1, -.05], [.7, .04]].forEach(([dx, dz]) => { const fx = cx + dx, fz = cz + dz; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; put("pet", new THREE.SphereGeometry(.03, 6, 4), fx + Math.cos(a) * .04, yw + .035, fz + Math.sin(a) * .04, HALF - a, -.55, 0, .5, .22, 1.6); }
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .3; put("pet", new THREE.SphereGeometry(.026, 6, 4), fx + Math.cos(a) * .018, yw + .05, fz + Math.sin(a) * .018, HALF - a, -.95, 0, .45, .2, 1.4); }
        put("ctr", new THREE.SphereGeometry(.016, 8, 6), fx, yw + .045, fz); });
      put("yel", new THREE.SphereGeometry(.032, 8, 6), cx - .15, yw + .035, cz + .1, 0, 0, 0, 1, .85, 1); put("yel", new THREE.SphereGeometry(.022, 8, 6), cx + .45, yw + .028, cz - .12, 0, 0, 0, 1, .85, 1);
      /* sárga nőszirom a bal végén: szálkás levelek, két virág (a párkány magasságáig sem nőnek fel) */
      for (let i = 0; i < 9; i++) { const dx = (rand() - .5) * .22, rz = (rand() - .5) * .55; put("leaf", new THREE.BoxGeometry(.018, .42, .004), cx - .95 + dx, F + TH + .18, cz + (rand() - .5) * .2, rand() * .9, 0, rz); }
      [[-.99, .03, .34], [-.87, -.06, .3]].forEach(([dx, dz, hy]) => { const fx = cx + dx, fz = cz + dz, fy = F + TH + hy + .1; put("stem", new THREE.CylinderGeometry(.005, .006, hy + .1, 5), fx, F + TH + (hy + .1) / 2, fz);
        for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; put("iris", new THREE.SphereGeometry(.028, 6, 5), fx + Math.cos(a) * .035, fy, fz + Math.sin(a) * .035, HALF - a, -.5, 0, .5, .3, 1.5); } put("iris", new THREE.SphereGeometry(.018, 6, 4), fx, fy + .02, fz); });
      const MT = { wd, pad: std({ color: "#2f7d37", roughness: .6, side: THREE.DoubleSide }), pad2: std({ color: "#3f9442", roughness: .6, side: THREE.DoubleSide }), pet: std({ color: "#fbfbf6", roughness: .5 }), ctr: std({ color: "#f0c030", roughness: .5 }), yel: std({ color: "#f2c91c", roughness: .5 }), leaf: std({ color: "#3b8a3a", roughness: .7, side: THREE.DoubleSide }), stem: std({ color: "#3b8a3a", roughness: .7 }), iris: std({ color: "#e8c317", roughness: .55 }) };
      Object.keys(P).forEach((k) => mesh(mergeGeoms(P[k]), MT[k], G));
      const w = mesh(new THREE.PlaneGeometry(TL - .12, TD - .12).rotateX(-HALF), wt, G); w.position.set(cx, yw, cz); }

    /* ---------- FÜGGŐ PILLANGÓK ÉS SZITAKÖTŐK a tetőről (lassan forognak, a szárnyuk libben) */
    { const ceilY = (z) => F + 3.0 + 1.5 * (1 - Math.abs(z - zc) / 3.35) - .13;
      const wingTex = (kind) => canvasTex(96, 96, (g) => { const PC = { sw: ["#f6d93a", "#1b140a", "#4a78c8", "#e0572a"], bl: ["#74aef0", "#233352", "#ffffff", "#c9e2ff"], ad: ["#241912", "#0e0a07", "#e63a1c", "#ffffff"], or: ["#ec7a2b", "#2b1a0e", "#1b110a", "#ffd9a0"] }[kind];
        const fore = () => { g.beginPath(); g.moveTo(2, 46); g.bezierCurveTo(8, 8, 66, -2, 94, 18); g.bezierCurveTo(92, 38, 52, 50, 2, 50); g.closePath(); }, hind = () => { g.beginPath(); g.moveTo(2, 50); g.bezierCurveTo(44, 48, 92, 56, 80, 78); g.bezierCurveTo(70, 92, 24, 90, 2, 58); g.closePath(); };
        g.lineJoin = "round"; [fore, hind].forEach((sh) => { sh(); g.fillStyle = PC[0]; g.fill(); });
        if (kind === "ad") { g.save(); fore(); g.clip(); g.fillStyle = PC[2]; g.save(); g.translate(46, 25); g.rotate(.55); g.fillRect(-7, -40, 14, 80); g.restore(); g.fillStyle = PC[3]; [[78, 16], [84, 24], [72, 12]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }); g.restore(); g.save(); hind(); g.clip(); g.fillStyle = PC[2]; g.fillRect(0, 74, 96, 10); g.restore(); }
        else if (kind === "sw") { g.fillStyle = PC[1]; for (let i = 0; i < 6; i++) { g.save(); g.translate(2, 48); g.rotate(-.9 + i * .3); g.fillRect(0, -1.3, 70 + (i % 2) * 14, 2.6); g.restore(); } g.fillStyle = PC[2]; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(18 + i * 13, 74 - Math.sin(i / 4 * 3) * 3 + (i === 4 ? 0 : 6), 3.6, 0, TAU); g.fill(); } g.fillStyle = PC[3]; g.beginPath(); g.arc(72, 72, 5, 0, TAU); g.fill(); g.fillStyle = PC[1]; g.beginPath(); g.moveTo(74, 82); g.lineTo(84, 95); g.lineTo(66, 88); g.closePath(); g.fill(); }
        else if (kind === "bl") { g.fillStyle = PC[2]; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(14 + i * 11, 12 + Math.abs(i - 3) * 2.4, 2.1, 0, TAU); g.fill(); } for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(20 + i * 13, 78 + (i % 2) * 2, 2.1, 0, TAU); g.fill(); } g.fillStyle = PC[3]; g.fillRect(8, 44, 70, 3); }
        else { g.fillStyle = PC[2]; [[44, 22], [62, 30], [30, 34], [52, 66], [36, 70]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.fill(); }); g.fillStyle = PC[3]; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(24 + i * 11, 14 + Math.abs(i - 2.5) * 2.6, 2.4, 0, TAU); g.fill(); } }
        g.strokeStyle = PC[1]; g.lineWidth = kind === "sw" ? 5 : 3.6; [fore, hind].forEach((sh) => { sh(); g.stroke(); }); });
      const wm = {}, wMat = (k) => wm[k] || (wm[k] = basic({ map: wingTex(k), transparent: true, alphaTest: .25, side: THREE.DoubleSide }));
      const bodyM = std({ color: "#2a1a10", roughness: .8 }), thrM = basic({ color: "#e9e2cc" }), mobs = [];
      const thread = (g, len) => mesh(new THREE.CylinderGeometry(.0032, .0032, len, 4).translate(0, len / 2, 0), thrM, g);
      [[5.7, -1.2, .9, "sw"], [7.5, .9, 1.35, "bl"], [9.3, -.8, .8, "ad"], [10.5, 1.0, 1.2, "or"], [6.5, 1.35, 1.5, "sw"], [8.6, .2, 1.05, "bl"], [5.5, .1, 1.15, "or"], [10.2, -1.3, 1.45, "sw"]].forEach(([x, dz, len, k], i) => {
        const z = zc + dz, g = new THREE.Group(); g.position.set(x, ceilY(z) - len, z); g.userData.noMerge = true; G.add(g); thread(g, len);
        mesh(new THREE.CylinderGeometry(.006, .004, .1, 6).rotateX(HALF), bodyM, g);
        const L = mesh(new THREE.PlaneGeometry(.13, .15).rotateX(-HALF).translate(.065, 0, 0), wMat(k), g), R = mesh(new THREE.PlaneGeometry(.13, .15).rotateX(-HALF).translate(.065, 0, 0), wMat(k), g); R.scale.x = -1;
        mobs.push({ g, ws: [[L, 1], [R, -1]], ph: i * 1.7, y0: g.position.y, bf: 1 }); });
      const dB = std({ color: "#c8431c", roughness: .5 }), dH = std({ color: "#2f7d8a", roughness: .3 }), dW = basic({ color: "#dfeaf0", transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false });
      [[6.9, -.2, 1.15], [9.9, -1.1, 1.4], [8.1, 1.2, 1.75], [7.3, -1.35, 1.6]].forEach(([x, dz, len], i) => {
        const z = zc + dz, g = new THREE.Group(); g.position.set(x, ceilY(z) - len, z); g.userData.noMerge = true; G.add(g); thread(g, len);
        mesh(new THREE.CylinderGeometry(.007, .0035, .27, 6).rotateX(HALF).translate(0, 0, -.12), dB, g); mesh(new THREE.SphereGeometry(.019, 8, 6).translate(0, 0, .03), dB, g); mesh(new THREE.SphereGeometry(.017, 8, 6).translate(0, 0, .058), dH, g);
        const ws = []; [[.045, 1], [.018, 1]].forEach(([wz]) => [1, -1].forEach((sg) => { const w = mesh(new THREE.PlaneGeometry(.12, .028).rotateX(-HALF).translate(.06, 0, 0), dW, g); w.position.z = wz; w.scale.x = sg; ws.push([w, sg]); }));
        mobs.push({ g, ws, ph: i * 2.3 + .7, y0: g.position.y, bf: 0 }); });
      HZ.anim.push((t) => { if (!h.innerG || !h.innerG.visible) return; mobs.forEach((m) => { m.g.rotation.y = t * .22 + m.ph; m.g.position.y = m.y0 + Math.sin(t * .8 + m.ph) * .03;
        const a = m.bf ? .3 + .62 * Math.sin(t * 7 + m.ph) : .1 * Math.sin(t * 28 + m.ph); m.ws.forEach(([w, sg]) => { w.rotation.z = sg * a; }); }); }); }
  }
