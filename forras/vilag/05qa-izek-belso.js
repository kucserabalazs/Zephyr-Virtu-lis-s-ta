  /* =====================================================================================================
     2026-11-16 éjjel (tulajdonos: „a magyar ételek és ízek házánál … sokkal szebb megjelenést belül, és sokkal látványosabb és valós ételfotókat
     bemutató kép illusztrációkat”): A MAGYAR ÍZEK HÁZA BELSEJE – falusi csárda
       gerendás deszkamennyezet · népi festett (tulipános) fríz körben · diófa lambéria · tányérfal · kemence parázzsal és kürtővel
       · két gyöngyvászon (pepita) terítős asztal székekkel · lógó paprika-, fokhagyma- és fűszerfüzér · rézedények · nemzeti színű zászlófüzér
       · szőttes futószőnyeg · csipkefüggöny · pult-futó hímzéssel · valódi, keretezett ételfotók és „Képek forrása” tábla (05na-fotok.js).
     A régi berendezés (pult, bogrács, polcok, hordók, lógó szalámi, plakát) a 05q-csardaBuild-ben marad; ez csak gazdagítja.
     ===================================================================================================== */
  function izekBelso(G, h) {
    const B = h.box, F = h.F, xc = (B.x0 + B.x1) / 2, zc = (B.z0 + B.z1) / 2, t = .3, X0 = B.x0 + t, X1 = B.x1 - t, Z0 = B.z0 + t, Z1 = B.z1 - t, Hh = 2.9, RP = { repeat: [1, 1] };
    const pts = {}, put = (k, geom, x, y, z, ry, rx, rz, sx, sy, sz) => { (pts[k] = pts[k] || []).push([geom, M4(x, y, z, ry, rx, rz, sx, sy, sz)]); };
    const quad = (w, hh, tu, tv) => { const g = new THREE.PlaneGeometry(w, hh), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tu, uv.getY(i) * hh / tv); return g; };
    const dec = (o) => std(Object.assign({ roughness: .92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, o));
    /* ---------- vászon-textúrák */
    const tulip = (g, cx, cy, s, c1, c2) => { g.fillStyle = "#2f7a3a"; [[-16, -.55], [16, .55]].forEach(([dx, a]) => { g.beginPath(); g.ellipse(cx + dx * s, cy + 12 * s, 17 * s, 6 * s, a, 0, TAU); g.fill(); });
      g.strokeStyle = "#2f7a3a"; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(cx, cy + 26 * s); g.lineTo(cx, cy + 2 * s); g.stroke();
      g.fillStyle = c2; [[-9, -.35], [9, .35]].forEach(([dx, a]) => { g.beginPath(); g.ellipse(cx + dx * s, cy - 6 * s, 8 * s, 17 * s, a, 0, TAU); g.fill(); }); g.fillStyle = c1; g.beginPath(); g.ellipse(cx, cy - 8 * s, 9 * s, 21 * s, 0, 0, TAU); g.fill(); };
    const TX = {
      plank: canvasTex(512, 512, (g, w, hh) => { g.fillStyle = "#c79a5e"; g.fillRect(0, 0, w, hh); for (let i = 0; i < 8; i++) { const x = i * 64; g.fillStyle = `rgba(${90 + rand() * 40 | 0},${55 + rand() * 25 | 0},20,${.08 + rand() * .12})`; g.fillRect(x, 0, 64, hh); g.fillStyle = "rgba(60,36,14,.55)"; g.fillRect(x, 0, 2, hh);
        for (let k = 0; k < 26; k++) { g.strokeStyle = `rgba(80,48,18,${.08 + rand() * .12})`; g.lineWidth = 1; const gx = x + 6 + rand() * 52; g.beginPath(); g.moveTo(gx, 0); g.bezierCurveTo(gx + rand() * 8 - 4, hh * .3, gx + rand() * 8 - 4, hh * .6, gx + rand() * 6 - 3, hh); g.stroke(); } } }, RP),
      beam: canvasTex(256, 128, (g, w, hh) => { g.fillStyle = "#4b2f1a"; g.fillRect(0, 0, w, hh); for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(${20 + rand() * 30 | 0},10,4,${.2 + rand() * .3})`; g.lineWidth = 1 + rand() * 2; const y = rand() * hh; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + rand() * 6 - 3); g.stroke(); }
        g.fillStyle = "#7a1d24"; g.fillRect(0, 44, w, 40); g.fillStyle = "#e9d9b0"; for (let i = 0; i < 8; i++) { const cx = 16 + i * 32; g.beginPath(); g.moveTo(cx, 50); g.lineTo(cx + 10, 64); g.lineTo(cx, 78); g.lineTo(cx - 10, 64); g.closePath(); g.fill(); } g.fillStyle = "#e9d9b0"; g.fillRect(0, 40, w, 3); g.fillRect(0, 85, w, 3); }, RP),
      fr: canvasTex(1024, 128, (g, w, hh) => { g.fillStyle = "#f2e8cc"; g.fillRect(0, 0, w, hh); g.fillStyle = "#8e1b2e"; g.fillRect(0, 0, w, 14); g.fillRect(0, hh - 14, w, 14); g.fillStyle = "#e3b53a"; g.fillRect(0, 17, w, 3); g.fillRect(0, hh - 20, w, 3);
        for (let i = 0; i < 8; i++) { const cx = 64 + i * 128; tulip(g, cx, 66, .82, i % 2 ? "#2a56a0" : "#c8121e", i % 2 ? "#6f93cf" : "#8e1b2e"); g.fillStyle = "#2a56a0"; [[64, 56], [64, 76], [58, 66], [70, 66]].forEach(([dx, y]) => { g.beginPath(); g.arc(cx + dx, y, 3.4, 0, TAU); g.fill(); }); } }, RP),
      wain: canvasTex(256, 256, (g, w, hh) => { g.fillStyle = "#7a4a28"; g.fillRect(0, 0, w, hh); for (let i = 0; i < 4; i++) { const x = i * 64; g.fillStyle = `rgba(${60 + rand() * 40 | 0},${30 + rand() * 20 | 0},10,${.12 + rand() * .15})`; g.fillRect(x, 0, 64, hh); g.fillStyle = "rgba(30,16,6,.6)"; g.fillRect(x, 0, 3, hh);
        for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(40,20,8,${.1 + rand() * .15})`; g.lineWidth = 1; const gx = x + 6 + rand() * 52; g.beginPath(); g.moveTo(gx, 0); g.bezierCurveTo(gx + rand() * 6 - 3, hh * .3, gx + rand() * 6 - 3, hh * .7, gx + rand() * 4 - 2, hh); g.stroke(); } } }, RP),
      rug: canvasTex(384, 1024, (g, w, hh) => { g.fillStyle = "#7d1426"; g.fillRect(0, 0, w, hh); g.strokeStyle = "rgba(241,231,207,.8)"; g.lineWidth = 3; for (let x = 12; x < w; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 14); g.moveTo(x, hh - 14); g.lineTo(x, hh); g.stroke(); }
        [["#f1e7cf", 22, 14], ["#2f7a3a", 14, 40], ["#e3b53a", 7, 58], ["#2a56a0", 14, 70]].forEach(([c, lw, off]) => { g.strokeStyle = c; g.lineWidth = lw; g.strokeRect(off / 2 + lw / 2 + 8, off / 2 + lw / 2 + 18, w - off - lw - 16, hh - off - lw - 36); });
        for (let y = 130; y < hh - 100; y += 150) { g.fillStyle = "#f1e7cf"; g.beginPath(); g.moveTo(w / 2, y - 52); g.lineTo(w / 2 + 52, y); g.lineTo(w / 2, y + 52); g.lineTo(w / 2 - 52, y); g.closePath(); g.fill(); g.fillStyle = "#7d1426"; g.beginPath(); g.moveTo(w / 2, y - 36); g.lineTo(w / 2 + 36, y); g.lineTo(w / 2, y + 36); g.lineTo(w / 2 - 36, y); g.closePath(); g.fill(); tulip(g, w / 2, y + 2, .62, "#f1e7cf", "#e3b53a"); } }),
      check: canvasTex(128, 128, (g, w, hh) => { g.fillStyle = "#fbf8ef"; g.fillRect(0, 0, w, hh); g.fillStyle = "rgba(200,24,36,.55)"; g.fillRect(0, 0, 64, hh); g.fillRect(0, 0, w, 64); }, RP),
      lace: canvasTex(256, 256, (g, w, hh) => { g.clearRect(0, 0, w, hh); g.fillStyle = "rgba(252,249,238,.9)"; g.fillRect(0, 0, w, 26); for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, 26, 16, 0, Math.PI); g.fill(); } for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) { g.beginPath(); g.arc(16 + c * 32 + (r % 2) * 16, 70 + r * 30, r < 5 ? 7 : 11, 0, TAU); g.fill(); } for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x + 4, 30); g.lineTo(x + 16, 240); g.lineTo(x + 28, 30); g.closePath(); g.fillStyle = "rgba(252,249,238,.35)"; g.fill(); } }),
      glow: canvasTex(128, 128, (g, w, hh) => { g.clearRect(0, 0, w, hh); g.fillStyle = "#140a05"; g.beginPath(); g.moveTo(8, hh); g.lineTo(8, 56); g.quadraticCurveTo(8, 6, 64, 6); g.quadraticCurveTo(120, 6, 120, 56); g.lineTo(120, hh); g.closePath(); g.fill();
        const gr = g.createRadialGradient(64, 112, 4, 64, 104, 74); gr.addColorStop(0, "rgba(255,230,120,1)"); gr.addColorStop(.35, "rgba(255,140,30,.95)"); gr.addColorStop(.75, "rgba(160,40,8,.55)"); gr.addColorStop(1, "rgba(80,16,4,0)"); g.save(); g.beginPath(); g.moveTo(8, hh); g.lineTo(8, 56); g.quadraticCurveTo(8, 6, 64, 6); g.quadraticCurveTo(120, 6, 120, 56); g.lineTo(120, hh); g.closePath(); g.clip(); g.fillStyle = gr; g.fillRect(0, 0, w, hh); g.restore();
        g.fillStyle = "#3a1c0c"; for (let i = 0; i < 4; i++) { g.save(); g.translate(30 + i * 20, 118); g.rotate(-.1 + i * .08); g.fillRect(-14, -5, 28, 9); g.restore(); } })
    };
    const plates = [0, 1, 2].map((k) => canvasTex(128, 128, (g) => { g.fillStyle = "#f6f1e4"; g.beginPath(); g.arc(64, 64, 63, 0, TAU); g.fill(); const rim = ["#2a56a0", "#a8231f", "#2f7a3a"][k]; g.strokeStyle = rim; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 56, 0, TAU); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(64, 64, 46, 0, TAU); g.stroke();
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.fillStyle = rim; g.beginPath(); g.arc(64 + Math.cos(a) * 51, 64 + Math.sin(a) * 51, 2.2, 0, TAU); g.fill(); }
      if (k === 0) tulip(g, 64, 66, .95, "#c8121e", "#8e1b2e"); else if (k === 1) { g.fillStyle = "#e3b53a"; g.beginPath(); g.arc(64, 64, 8, 0, TAU); g.fill(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.fillStyle = "#2a56a0"; g.beginPath(); g.ellipse(64 + Math.cos(a) * 20, 64 + Math.sin(a) * 20, 12, 7, a, 0, TAU); g.fill(); } }
      else { g.fillStyle = "#6b2f7a"; for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) { g.beginPath(); g.arc(64 + (c - r / 2) * 13, 48 + r * 12, 6.2, 0, TAU); g.fill(); } g.fillStyle = "#2f7a3a"; g.beginPath(); g.ellipse(60, 38, 14, 6, -.5, 0, TAU); g.fill(); } }));
    /* ---------- anyagok */
    const MT = { ceil: std({ map: TX.plank, roughness: .9 }), beam: std({ map: TX.beam, roughness: .8 }), fr: dec({ map: TX.fr }), wain: dec({ map: TX.wain, roughness: .8 }), rail: std({ color: "#4a2e18", roughness: .6 }),
      plaster: std({ color: "#efe6d2", roughness: .95 }), wood: std({ color: "#6b4a2a", roughness: .7 }), woodL: std({ color: "#b98a55", roughness: .75 }), copper: std({ color: "#b8693a", metalness: .7, roughness: .35 }),
      red: std({ color: "#c8121e", roughness: .4 }), redD: std({ color: "#8e1b2e", roughness: .45 }), garlic: std({ color: "#efe8d6", roughness: .6 }), cord: std({ color: "#caa56a", roughness: .9 }),
      herbG: std({ color: "#6f8a5a", roughness: .9 }), herbL: std({ color: "#8a78b0", roughness: .9 }), herbD: std({ color: "#c9b46a", roughness: .9 }), cer: std({ color: "#f4f1e8", roughness: .3 }), soup: std({ color: "#a8331c", roughness: .3 }),
      bread: std({ color: "#c27a3a", roughness: .8 }), lamp: new THREE.MeshStandardMaterial({ color: "#ffe9b0", emissive: "#ffb347", emissiveIntensity: 1.1, roughness: .4 }), shade: std({ color: "#f1e7cf", roughness: .6, side: THREE.DoubleSide }),
      bR: std({ color: "#d0342c", roughness: .8, side: THREE.DoubleSide }), bW: std({ color: "#f5f2ea", roughness: .8, side: THREE.DoubleSide }), bG: std({ color: "#2f8a4a", roughness: .8, side: THREE.DoubleSide }),
      check: dec({ map: TX.check, roughness: .95 }), kemence: std({ color: "#efe6d2", roughness: .98 }), soot: std({ color: "#2a1a10", roughness: 1 }) };
    W.disposables.push(MT.lamp);
    /* ---------- mennyezet: deszka + gerendák (a fő gerenda hosszában, keresztgerendák 1,8 m-ként) */
    { const bw = .2, bh = .24, by = F + Hh - .02 - bh / 2;
      put("ceil", quad(X1 - X0, Z1 - Z0, 1, 1).rotateX(Math.PI / 2), xc, F + Hh - .02, zc, 0);
      const bx = (x0, x1, y, z, th) => { const len = x1 - x0, cx = (x0 + x1) / 2; put("beam", quad(len, th, 1.2, th), cx, y, z + bw / 2, 0); put("beam", quad(len, th, 1.2, th), cx, y, z - bw / 2, Math.PI); put("beam", quad(len, bw, 1.2, bw).rotateX(Math.PI / 2), cx, y - th / 2, z, 0); };
      const bz = (z0, z1, x, y, th) => { const len = z1 - z0, cz = (z0 + z1) / 2; put("beam", quad(len, th, 1.2, th), x + bw / 2, y, cz, Math.PI / 2); put("beam", quad(len, th, 1.2, th), x - bw / 2, y, cz, -Math.PI / 2); put("beam", quad(len, bw, 1.2, bw).rotateX(Math.PI / 2).rotateY(Math.PI / 2), x, y - th / 2, cz, 0); };
      bx(X0, X1, F + Hh - .02 - .15, zc, .3); [16.6, 18.4, 20.2, 22.0, 23.8].forEach((x) => bz(Z0, Z1, x, by, bh)); }
    /* ---------- fríz (népi festés) és lambéria körben; a lambéria az ajtónál megszakad */
    { const fy = F + 2.5, fh = .26, wy = F + .475, wh = .95, d0 = h.dr.c - h.dr.w / 2, d1 = h.dr.c + h.dr.w / 2;
      put("fr", quad(X1 - X0, fh, 2.08, fh), xc, fy, Z0 + .014, 0); put("fr", quad(X1 - X0, fh, 2.08, fh), xc, fy, Z1 - .014, Math.PI); put("fr", quad(Z1 - Z0, fh, 2.08, fh), X0 + .014, fy, zc, Math.PI / 2); put("fr", quad(Z1 - Z0, fh, 2.08, fh), X1 - .014, fy, zc, -Math.PI / 2);
      put("wain", quad(d0 - X0, wh, 1, wh), (X0 + d0) / 2, wy, Z0 + .014, 0); put("wain", quad(X1 - d1, wh, 1, wh), (d1 + X1) / 2, wy, Z0 + .014, 0); put("wain", quad(X1 - X0, wh, 1, wh), xc, wy, Z1 - .014, Math.PI);
      put("wain", quad(Z1 - Z0, wh, 1, wh), X0 + .014, wy, zc, Math.PI / 2); put("wain", quad(Z1 - Z0, wh, 1, wh), X1 - .014, wy, zc, -Math.PI / 2);
      const rl = F + .965; put("rail", new THREE.BoxGeometry(d0 - X0, .045, .05), (X0 + d0) / 2, rl, Z0 + .03, 0); put("rail", new THREE.BoxGeometry(X1 - d1, .045, .05), (d1 + X1) / 2, rl, Z0 + .03, 0); put("rail", new THREE.BoxGeometry(X1 - X0, .045, .05), xc, rl, Z1 - .03, 0);
      put("rail", new THREE.BoxGeometry(.05, .045, Z1 - Z0), X0 + .03, rl, zc, 0); put("rail", new THREE.BoxGeometry(.05, .045, Z1 - Z0), X1 - .03, rl, zc, 0);
      put("rail", new THREE.BoxGeometry(X1 - X0, .06, .06), xc, F + 2.36, Z0 + .03, 0); put("rail", new THREE.BoxGeometry(X1 - X0, .06, .06), xc, F + 2.36, Z1 - .03, 0); put("rail", new THREE.BoxGeometry(.06, .06, Z1 - Z0), X0 + .03, F + 2.36, zc, 0); put("rail", new THREE.BoxGeometry(.06, .06, Z1 - Z0), X1 - .03, F + 2.36, zc, 0); }
    /* ---------- tányérfal a pult fölött (nyugati fal): két sor, háromféle festett tányér */
    { for (let r = 0; r < 2; r++) for (let k = 0; k < (r ? 8 : 9); k++) { const z = 14.7 + k * .37 + (r ? .185 : 0), y = F + 1.99 + r * .24, v = (k + r) % 3; (pts["pl" + v] = pts["pl" + v] || []).push([new THREE.CircleGeometry(.115, 20), M4(X0 + .018, y, z, Math.PI / 2)]); }
      [0, 1, 2].forEach((v) => { MT["pl" + v] = dec({ map: plates[v], roughness: .35 }); }); }
    /* ---------- pult: hímzett futó az elején + további finomságok a tetején (az ételek a lecke-fotókon is látszanak) */
    { put("fr", quad(3.25, .42, 2.08, .26), B.x0 + .7 + .382, F + .62, zc - .2, Math.PI / 2);
      [[14.8, 0], [16.72, 1]].forEach(([z, k]) => { if (k === 0) { for (let s = 0; s < 3; s++) { const kg = new THREE.CylinderGeometry(.05, .05, .16, 14, 1, true); put("bread", kg, B.x0 + .7, F + 1.06 + s * .17, z, 0); put("bread", new THREE.CylinderGeometry(.046, .046, .16, 14, 1, true), B.x0 + .7, F + 1.06 + s * .17, z, 0); } put("bread", new THREE.CylinderGeometry(.16, .16, .02, 18), B.x0 + .7, F + .99, z, 0); }
        else { put("cer", new THREE.CylinderGeometry(.17, .12, .04, 18), B.x0 + .7, F + 1.0, z, 0); for (let s = 0; s < 6; s++) { const a = s / 6 * TAU; put("bread", new THREE.CylinderGeometry(.05, .045, .04, 10), B.x0 + .7 + Math.cos(a) * .085, F + 1.04, z + Math.sin(a) * .085, 0); } put("bread", new THREE.CylinderGeometry(.05, .045, .04, 10), B.x0 + .7, F + 1.08, z, 0); } }); }
    /* ---------- kemence a DNy sarokban: fehérre meszelt boltozat (félhenger) kemencepadkával, parázsló szájjal és kürtővel */
    { const kx = X0 + .98, kz = Z1 - .78, vx = kx - .08, VL = 1.55, VR = .66;
      put("kemence", new THREE.BoxGeometry(1.76, .56, 1.5), kx, F + .28, kz, 0);
      put("kemence", new THREE.CylinderGeometry(VR, VR, VL, 22, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), vx, F + .56, kz, 0);
      put("kemence", new THREE.CircleGeometry(VR, 22, 0, Math.PI).rotateY(Math.PI / 2), vx + VL / 2, F + .56, kz, 0);
      put("kemence", new THREE.CircleGeometry(VR, 22, 0, Math.PI).rotateY(-Math.PI / 2), vx - VL / 2, F + .56, kz, 0);
      put("kemence", new THREE.CylinderGeometry(.24, .5, 1.74, 4, 1, true).rotateY(Math.PI / 4), kx - .3, F + 1.15 + .87, kz, 0);
      put("soot", new THREE.BoxGeometry(.04, .02, .7), vx + VL / 2 + .02, F + .575, kz, 0);
      const gl = mesh(new THREE.PlaneGeometry(.52, .44), basic({ map: TX.glow, transparent: true, depthWrite: false }), G); gl.position.set(vx + VL / 2 + .008, F + .56 + .24, kz); gl.rotation.y = Math.PI / 2; gl.userData.noMerge = true;
      (HZ.anim || (HZ.anim = [])).push((tt) => { gl.material.opacity = .84 + .16 * Math.sin(tt * 9.1) * Math.sin(tt * 3.7 + 1); gl.scale.set(1 + .02 * Math.sin(tt * 7), 1 + .04 * Math.sin(tt * 11), 1); });
      /* fahasáb a kemence mellett, kenyerek a kemence tetején, sütőlapát a falnak támasztva */
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) put("woodL", new THREE.CylinderGeometry(.07, .07, .5, 8).rotateZ(Math.PI / 2), vx + VL / 2 + .5, F + .08 + r * .13, Z1 - .32 - (c + r * .5) * .15, 0);
      for (let k = 0; k < 3; k++) put("bread", new THREE.SphereGeometry(.12, 12, 8), kx + .45, F + .61, kz - .5 + k * .35, 0, 0, 0, 1.3, .6, 1);
      put("woodL", new THREE.BoxGeometry(.02, 1.7, .22), X0 + .12, F + 1.0, Z1 - 1.9, 0, 0, .1); }
    /* ---------- két terített asztal a nyugati és keleti ablak alatt, padkákkal (a középső folyosó szabad marad) */
    [[17.45, 14.5], [22.4, 14.5]].forEach(([tx, tz], ti) => {
      put("check", quad(1.36, .82, .45, .45).rotateX(-Math.PI / 2), tx, F + .795, tz, 0); put("woodL", new THREE.BoxGeometry(1.3, .05, .76), tx, F + .75, tz, 0); [[-.6, -.33], [.6, -.33], [-.6, .33], [.6, .33]].forEach(([dx, dz]) => put("woodL", new THREE.BoxGeometry(.06, .73, .06), tx + dx, F + .37, tz + dz, 0));
      [-.36, .36].forEach((dx) => { put("woodL", new THREE.CylinderGeometry(.19, .17, .05, 14), tx + dx, F + .46, tz + .86, 0); [[-.11, -.11], [.11, -.11], [-.11, .11], [.11, .11]].forEach(([a, b]) => put("woodL", new THREE.CylinderGeometry(.018, .018, .44, 5), tx + dx + a, F + .22, tz + .86 + b, 0)); });
      put("cer", new THREE.CylinderGeometry(.13, .09, .06, 16), tx - .35, F + .84, tz + .06, 0); put("soup", new THREE.CylinderGeometry(.115, .115, .01, 16), tx - .35, F + .873, tz + .06, 0);
      put("cer", new THREE.CylinderGeometry(.13, .09, .06, 16), tx + .35, F + .84, tz + .06, 0); put("soup", new THREE.CylinderGeometry(.115, .115, .01, 16), tx + .35, F + .873, tz + .06, 0);
      put("bread", new THREE.CylinderGeometry(.14, .1, .07, 14), tx, F + .84, tz - .18, 0); for (let s = 0; s < 3; s++) put("bread", new THREE.SphereGeometry(.05, 8, 6), tx - .06 + s * .06, F + .9, tz - .18, 0, 0, 0, 1.2, .8, 1);
      put("lamp", new THREE.CylinderGeometry(.03, .03, .1, 8), tx + .02, F + .87, tz - .02, 0); put("cer", new THREE.CylinderGeometry(.045, .05, .04, 10), tx + .02, F + .83, tz - .02, 0);
      /* csüngő lámpa az asztal fölött */ put("cord", new THREE.CylinderGeometry(.006, .006, .45, 4), tx, F + Hh - .02 - .225, tz, 0); put("shade", new THREE.ConeGeometry(.24, .18, 14, 1, true), tx, F + 2.34, tz, 0); put("lamp", new THREE.SphereGeometry(.05, 8, 6), tx, F + 2.3, tz, 0);
      /* csipkefüggöny az ablakon belülről */ const cu = mesh(new THREE.PlaneGeometry(1.0, 1.2), std({ map: TX.lace, transparent: true, roughness: 1, side: THREE.DoubleSide, depthWrite: false }), G); cu.position.set(h.dr.c + (ti ? 2.6 : -2.6), F + 1.55, Z0 + .03); cu.userData.noMerge = true; });
    /* ---------- szőttes futószőnyeg a bejárattól a tábláig */
    { const rg = new THREE.PlaneGeometry(1.34, 3.5).rotateX(-Math.PI / 2); const rm = mesh(rg, std({ map: TX.rug, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), G); rm.position.set(h.dr.c, F + .014, 15.75); rm.receiveShadow = true; rm.userData.noMerge = true; }
    /* ---------- lógó füzérek a gerendákról: pirospaprika, fokhagyma, szárított fűszerek; rézedények a déli falon */
    { const rope = (x, z, len) => put("cord", new THREE.CylinderGeometry(.007, .007, len, 4), x, F + Hh - .03 - len / 2, z, 0);
      [[16.3, 15.2], [16.3, 17.2], [18.2, 13.95], [22.9, 13.95], [23.7, 18.8], [17.9, 18.9]].forEach(([x, z], i) => { const n = 16, len = 1.0; rope(x, z, len); for (let k = 0; k < n; k++) { const a = k * 2.4 + i, y = F + Hh - .1 - k * .058; const c = new THREE.ConeGeometry(.032 - k * .0004, .14, 6); put(k % 5 === 4 ? "redD" : "red", c, x + Math.cos(a) * .045, y, z + Math.sin(a) * .045, 0, Math.PI + Math.cos(a) * .35, Math.sin(a) * .35); } });
      [[21.1, 13.95], [19.2, 18.9]].forEach(([x, z]) => { rope(x, z, .7); for (let k = 0; k < 9; k++) { const a = k * 2.2, y = F + Hh - .13 - k * .055; put("garlic", new THREE.SphereGeometry(.034 + (k < 4 ? .008 : 0), 8, 6), x + Math.cos(a) * .035, y, z + Math.sin(a) * .035, 0, 0, 0, 1, .85, 1); } put("herbD", new THREE.CylinderGeometry(.005, .008, .3, 4), x, F + Hh - .02 - .15, z, 0); });
      [[19.8, 13.95, "herbG"], [20.6, 13.95, "herbL"], [24.0, 15.0, "herbD"], [16.0, 14.3, "herbG"]].forEach(([x, z, m]) => { rope(x, z, .25); put(m, new THREE.ConeGeometry(.075, .3, 7), x, F + Hh - .03 - .4, z, 0); put("cord", new THREE.CylinderGeometry(.012, .012, .03, 6), x, F + Hh - .03 - .26, z, 0); });
      /* rézedények rúdon a déli fal nyugati felén */ put("rail", new THREE.CylinderGeometry(.013, .013, 2.0, 6).rotateZ(Math.PI / 2), X0 + 1.2, F + 1.62, Z1 - .08, 0);
      [[.35, .1, .12], [.7, .125, .14], [1.05, .09, .1], [1.4, .11, .13], [1.75, .075, .09]].forEach(([dx, r, hh]) => { put("copper", new THREE.CylinderGeometry(r, r * .88, hh, 14), X0 + .2 + dx, F + 1.62 - hh / 2 - .06, Z1 - .09, 0); put("cord", new THREE.TorusGeometry(r * .7, .006, 4, 10, Math.PI), X0 + .2 + dx, F + 1.62 - .03, Z1 - .09, 0, 0, 0, 1, 1, 1); }); }
    /* ---------- nemzeti színű zászlófüzér a mennyezet alatt (két sor keresztben, egy hosszában) */
    { const sh = new THREE.Shape(); sh.moveTo(-.075, 0); sh.lineTo(.075, 0); sh.lineTo(0, -.2); sh.closePath(); const tri = new THREE.ShapeGeometry(sh);
      const run = (a, b, ax, fixed, y0, sag) => { const L = Math.abs(b - a), n = Math.floor(L / .27); let prev = null; for (let i = 0; i <= n; i++) { const u = i / n, p = a + (b - a) * u, y = y0 - sag * Math.sin(Math.PI * u), P = ax === "x" ? new THREE.Vector3(p, y, fixed) : new THREE.Vector3(fixed, y, p);
          if (prev) pts.cord.push(rodGeom(prev, P, .004, 3)); prev = P; if (i < n || true) put(["bR", "bW", "bG"][i % 3], tri, P.x, P.y, P.z, ax === "x" ? 0 : Math.PI / 2); } };
      pts.cord = pts.cord || []; run(X0 + .1, X1 - .1, "x", 15.0, F + 2.72, .32); run(X0 + .1, X1 - .1, "x", 17.75, F + 2.72, .32); run(Z0 + .1, Z1 - .1, "z", 18.0, F + 2.74, .28); }
    /* ---------- összeállítás: anyagonként egyetlen hálóba */
    Object.keys(pts).forEach((k) => { if (!pts[k].length) return; const m = MT[k]; if (!m) { console.warn("Ízek belső: nincs anyag", k); return; } const me = mesh(mergeGeoms(pts[k]), m, G); me.castShadow = false; });
    /* ---------- valódi ételfotók keretben a falon + a „Képek forrása” tábla (a lecke-fotók azonosítói a 05r-ben) */
    FOTO.frame(G, h, "hortobagyi", "Hortobágyi húsos palacsinta", 18.55, F + 1.62, Z0 + .03, 0, .86, .6);
    FOTO.frame(G, h, "lecso", "Lecsó kolbásszal, tojással", 16.25, F + 1.7, Z0 + .03, 0, .7, .49);
    FOTO.frame(G, h, "turoscsusza", "Túrós csusza", 23.6, F + 1.7, Z0 + .03, 0, .7, .49);
    FOTO.frame(G, h, "rantott", "Rántott hús", 23.1, F + 2.03, Z1 - .03, Math.PI, .7, .49);
    FOTO.frame(G, h, "somloi", "Somlói galuska", 23.1, F + 1.4, Z1 - .03, Math.PI, .7, .49);
    FOTO.frame(G, h, "pogacsa", "Sajtos pogácsa", X1 - .03, F + 1.75, 18.5, -Math.PI / 2, .86, .6);
    FOTO.frame(G, h, "badacsony", "Badacsony, a Balaton borvidéke", X0 + .03, F + 1.55, 15.15, Math.PI / 2, .86, .6);
    h.phCred = [["gulyas", "Gulyásleves"], ["halaszle", "Halászlé"], ["langos", "Lángos"], ["porkolt", "Pörkölt"], ["paprikas", "Csirkepaprikás"], ["toltott", "Töltött káposzta"], ["dobos", "Dobostorta"], ["kurtos", "Kürtőskalács"], ["paprika", "Fűszerpaprika"], ["szalami", "Téliszalámi"],
      ["tokaji", "Tokaji aszú"], ["bikaver", "Egri bikavér"], ["palinka", "Pálinkás butykosok"], ["unicum", "Unicum"], ["hortobagyi", "Hortobágyi palacsinta"], ["lecso", "Lecsó"], ["turoscsusza", "Túrós csusza"], ["rantott", "Rántott hús"], ["somloi", "Somlói galuska"], ["pogacsa", "Pogácsa"], ["badacsony", "Badacsony"]];
    FOTO.creditBoard(G, h, "KÉPEK FORRÁSA", h.phCred, 21.25, F + 1.5, Z0 + .03, 0, 1.12);
    h.phIds = (h.phIds || []).filter((v, i, a) => a.indexOf(v) === i);
  }
