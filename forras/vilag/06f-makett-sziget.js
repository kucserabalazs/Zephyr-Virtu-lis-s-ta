  /* =====================================================================================================
     A MAKETT ÚJ HELYSZÍNE: KERTSZIGET A BALATONON (2026. nov. 9., a tulajdonos kérésére)
     „Vigyük a házat egy nagyon szép virtuális térbe” – a regatta-bója helyett egy 48 m sugarú, úszó kertsziget a tó közepén:
     • középen 16 m-es kerek travertin tér szélrózsa-mozaikkal és arany berakással (rajta az asztal a makettel);
     • a tér körül alacsony puszpángsövény négy kapuval, kőpadok, kovácsoltvas lámpák (este világítanak);
     • levendulaágyások ívekben, mediterrán ciprusgyűrű, virágzó leanderek terrakotta dézsákban;
     • négy kavicsos út a szigetperemig, a part felé a hosszú stég (a régi palló) visz tovább;
     • a sziget peremén mészkő mellvéd, alatta a vízbe futó sziklás part.
     Elég nagy ahhoz, hogy a ház a makettasztaltól ÉLETNAGYSÁGIG ugyanitt nőjön (a telek 16,5 × 50 m, a ciprusgyűrű 34 m-en kívül van),
     életnagyságban a tér díszei (lámpák, padok, sövény, levendula, távcső) eltűnnek, hogy ne lógjanak bele a házba és a kertbe. */
  const ISL_R = 48;
  function buildGardenIsland(site) {
    const g = new THREE.Group(); site.add(g); ENV.deck = g; ENV.postPos = []; ENV.lavender = []; ENV.lanterns = []; ENV.walk = null;
    const deco = new THREE.Group(); g.add(deco); ENV.islandDeco = deco;
    /* --- a sziget teste: sziklás part a vízbe, mészkő mellvéd --- */
    { const prof = [new THREE.Vector2(ISL_R + 9, WATER_Y - 3), new THREE.Vector2(ISL_R + 5.5, WATER_Y - .2), new THREE.Vector2(ISL_R + 2.2, WATER_Y + .45), new THREE.Vector2(ISL_R + .4, -.25), new THREE.Vector2(ISL_R, -.05)];
      const lg = new THREE.LatheGeometry(prof, 120), p = lg.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
        const n = Math.sin(a * 17) * .5 + Math.sin(a * 41 + 1.3) * .3 + Math.sin(a * 7 + y * 3) * .4, rr2 = r + n * .9 * clamp((ISL_R + 6 - r) / 6, 0, 1) * (y < -.2 ? 1 : 0);
        p.setXYZ(i, x / r * rr2, y + (y < -.2 ? n * .25 : 0), z / r * rr2);
        const c = new THREE.Color(y < WATER_Y + .1 ? "#3e3a33" : "#8a8172").lerp(new THREE.Color("#a99e88"), clamp(n * .5 + .3, 0, 1) * (y > WATER_Y ? 1 : .3)); col.set([c.r, c.g, c.b], i * 3); }
      lg.setAttribute("color", new THREE.BufferAttribute(col, 3)); lg.computeVertexNormals();
      const m = mesh(lg, std({ vertexColors: true, roughness: .95, flatShading: true, side: THREE.DoubleSide }), g); m.receiveShadow = true;
      /* mészkő mellvéd */
      const cg = new THREE.RingGeometry(ISL_R - 1.2, ISL_R + .05, 128, 1); cg.rotateX(-Math.PI / 2);
      const cop = mesh(cg, std({ map: txNoise("limestone", "#d8cfbb", .12, 1800, 3, [24, 1]), roughness: .8 }), g); cop.position.y = .32; cop.receiveShadow = true;
      const wall = mesh(new THREE.CylinderGeometry(ISL_R + .05, ISL_R + .05, .38, 128, 1, true), std({ color: "#cfc5ae", roughness: .85, side: THREE.DoubleSide }), g); wall.position.y = .13;
      const wallIn = mesh(new THREE.CylinderGeometry(ISL_R - 1.2, ISL_R - 1.2, .32, 128, 1, true), std({ color: "#c2b79f", roughness: .85, side: THREE.DoubleSide }), g); wallIn.position.y = .16;
      /* sziklák a vízvonalon */
      const rocks = []; for (let k = 0; k < 90; k++) { const a = rand() * TAU, r = ISL_R + rr(2.5, 6.5), s = rr(.5, 1.6); rocks.push(M4(Math.cos(a) * r, WATER_Y + rr(-.3, .25), Math.sin(a) * r, rand() * 6, rand() * 2, 0, s, s * rr(.5, .8), s)); }
      inst(new THREE.DodecahedronGeometry(1, 0), std({ color: "#6e675c", roughness: .95, flatShading: true }), rocks, g, true); }
    /* --- gyep (a teljes sziget) és a travertin tér mozaikkal --- */
    { const lawn = mesh(new THREE.CircleGeometry(ISL_R - 1.2, 128).rotateX(-Math.PI / 2), std({ map: txGrass(), roughness: .95 }), g); lawn.position.y = .0; lawn.receiveShadow = true;
      if (lawn.material.map) { lawn.material.map = lawn.material.map.clone(); lawn.material.map.needsUpdate = true; lawn.material.map.wrapS = lawn.material.map.wrapT = THREE.RepeatWrapping; lawn.material.map.repeat.set(40, 40); W.disposables.push(lawn.material.map); }
      const pt = canvasTex(2048, 2048, (c, w, h) => {
        c.fillStyle = "#e6dcc8"; c.fillRect(0, 0, w, h);
        /* travertin lapok: koncentrikus gyűrűk, sugárirányú fugák */
        const cx = w / 2, cy = h / 2, R = w / 2;
        for (let r = 0; r < 14; r++) { const r0 = R * (.08 + r * .066), n = 6 + r * 6; for (let k = 0; k < n; k++) { const a0 = k / n * TAU, a1 = (k + 1) / n * TAU; c.fillStyle = `hsl(${36 + (k * 7 + r * 3) % 6},${18 + (k * 13) % 10}%,${80 + (k * 11 + r * 5) % 8}%)`;
            c.beginPath(); c.arc(cx, cy, r0 + R * .066, a0, a1); c.arc(cx, cy, r0, a1, a0, true); c.closePath(); c.fill(); c.strokeStyle = "rgba(120,100,70,.35)"; c.lineWidth = 2; c.stroke(); } }
        for (let k = 0; k < 2600; k++) { c.fillStyle = `rgba(150,120,80,${.03 + (k % 7) * .01})`; c.fillRect((k * 769) % w, (k * 337) % h, 3 + k % 5, 1 + k % 2); }
        /* szélrózsa arany és tengerkék berakással */
        c.save(); c.translate(cx, cy);
        c.strokeStyle = "#b8902e"; c.lineWidth = 14; c.beginPath(); c.arc(0, 0, R * .9, 0, TAU); c.stroke(); c.lineWidth = 5; c.beginPath(); c.arc(0, 0, R * .86, 0, TAU); c.stroke();
        c.font = "700 64px Georgia, serif"; c.fillStyle = "#8f6d1e"; c.textAlign = "center"; c.textBaseline = "middle";
        const txt = "ZEPHYR APARTMANHÁZ · ZAMÁRDI · BALATON · ", N = txt.length * 2; for (let i = 0; i < N; i++) { c.save(); c.rotate(i / N * TAU); c.fillText(txt[i % txt.length], 0, -R * .78); c.restore(); }
        c.lineWidth = 6; c.beginPath(); c.arc(0, 0, R * .7, 0, TAU); c.stroke();
        for (let k = 0; k < 16; k++) { const a = k / 16 * TAU - Math.PI / 2, ln = k % 4 === 0 ? R * .66 : k % 2 === 0 ? R * .44 : R * .3, wd = k % 4 === 0 ? R * .07 : R * .045;
          [[1, "#0e2142"], [-1, k % 4 === 0 ? "#c9a227" : "#d8c48a"]].forEach(([sd, col]) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * ln, Math.sin(a) * ln); c.lineTo(Math.cos(a + sd * Math.PI / 2) * wd, Math.sin(a + sd * Math.PI / 2) * wd); c.closePath(); c.fill(); }); }
        c.fillStyle = "#c9a227"; c.beginPath(); c.arc(0, 0, R * .05, 0, TAU); c.fill();
        c.font = "900 120px Georgia, serif"; c.fillStyle = "#0e2142"; c.fillText("É", 0, -R * .6); c.restore();
      });
      const plaza = mesh(new THREE.CircleGeometry(16, 128).rotateX(-Math.PI / 2), std({ map: pt, roughness: .55 }), g); plaza.position.y = .025; plaza.rotation.y = 0; plaza.receiveShadow = true;
      /* utak a peremig (kavics) */
      const gv = std({ map: txNoise("gravel", "#cbbfa6", .2, 2600, 2, [2, 12]), roughness: .95 });
      [0, 1, 2, 3].forEach((k) => { const a = k * Math.PI / 2, L = ISL_R - 1.2 - 16, pg = new THREE.PlaneGeometry(3.2, L).rotateX(-Math.PI / 2); const m = mesh(pg, gv, g); m.position.set(Math.sin(a) * (16 + L / 2), .02, Math.cos(a) * (16 + L / 2)); m.rotation.y = a; m.receiveShadow = true; });
      /* láthatatlan teleport-felület az egész szigeten */
      const tp = mesh(new THREE.CircleGeometry(ISL_R - 1.2, 64).rotateX(-Math.PI / 2), basic({ visible: false }), g); tp.position.y = .03; ENV.deckTop = tp; }
    /* --- díszek: sövény, padok, lámpák, levendula, leanderek, távcső (életnagyságban rejtve) --- */
    const L = [];
    /* puszpángsövény a tér körül, négy kapuval */
    const hedge = []; for (let k = 0; k < 160; k++) { const a = k / 160 * TAU, inGap = [0, 1, 2, 3].some((q) => Math.abs(wrapA(a - q * Math.PI / 2)) < .14); if (inGap) continue; hedge.push(M4(Math.sin(a) * 16.7, .42, Math.cos(a) * 16.7, a, 0, 0, 1, 1, 1)); }
    inst(new THREE.BoxGeometry(.75, .84, .7), std({ color: "#2f5a2c", roughness: .95 }), hedge, deco, true);
    /* kőpadok (íves, a tér felé) */
    for (let k = 0; k < 8; k++) { const a = (k + .5) / 8 * TAU, x = Math.sin(a) * 13.2, z = Math.cos(a) * 13.2; L.push([BX(2.0, .1, .55), "#e9e1cf", M4(x, .46, z, a)], [BX(.35, .42, .45), "#d8cfbb", M4(x + Math.cos(a) * .75, .21, z - Math.sin(a) * .75, a)], [BX(.35, .42, .45), "#d8cfbb", M4(x - Math.cos(a) * .75, .21, z + Math.sin(a) * .75, a)]); }
    /* kovácsoltvas lámpák (este világítanak) */
    const lampPts = [];
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + .13, x = Math.sin(a) * 15.6, z = Math.cos(a) * 15.6;
      L.push([CY(.07, .1, 3.1, 8), "#1d1f22", M4(x, 1.55, z), "m"], [CY(.2, .24, .16, 8), "#1d1f22", M4(x, .08, z), "m"], [CY(.17, .12, .45, 8), "#ffd890", M4(x, 3.3, z), "e"], [new THREE.ConeGeometry(.26, .28, 8), "#1d1f22", M4(x, 3.66, z), "m"], [new THREE.SphereGeometry(.05, 6, 4), "#c9a227", M4(x, 3.83, z), "m"]);
      lampPts.push(new THREE.Vector3(x, 3.3, z)); ENV.lanterns.push(new THREE.Vector3(x, 3.3, z)); }
    /* terrakotta dézsák virágzó leanderrel a tér négy kapujánál */
    const blossom = [];
    [0, 1, 2, 3].forEach((q) => [-1, 1].forEach((sd) => { const a = q * Math.PI / 2 + sd * .2, x = Math.sin(a) * 17.6, z = Math.cos(a) * 17.6;
      L.push([CY(.55, .42, .75, 14), "#b5623a", M4(x, .37, z)], [CY(.58, .58, .08, 14), "#9a4e2c", M4(x, .76, z)]);
      for (let k = 0; k < 9; k++) { const t = k / 9 * TAU; L.push([new THREE.IcosahedronGeometry(.42, 0), "#3f6b35", M4(x + Math.cos(t) * .35, 1.25 + (k % 3) * .25, z + Math.sin(t) * .35, t)]); blossom.push(M4(x + Math.cos(t) * .5, 1.35 + (k % 3) * .28, z + Math.sin(t) * .5, t, t, 0, .9, .9, .9)); } }));
    inst(new THREE.IcosahedronGeometry(.14, 0), std({ color: "#f27aa8", roughness: .8, emissive: new THREE.Color("#401020"), emissiveIntensity: .3 }), blossom, deco);
    /* távcső a tó felé (−z) a tér peremén */
    const tel = new THREE.Group(); deco.add(tel); tel.position.set(-3.2, 0, -14.4); tel.rotation.y = 0;
    { const br = std({ color: "#c9a24a", roughness: .25, metalness: .9 }), dk = std({ color: "#2a2d32", roughness: .5 });
      [0, 1, 2].forEach((k) => { const a = k / 3 * TAU; rodBetween(new THREE.Vector3(Math.cos(a) * .35, 0, Math.sin(a) * .35), new THREE.Vector3(0, 1.15, 0), .025, dk, tel); });
      const tube = mesh(new THREE.CylinderGeometry(.06, .09, .9, 14), br, tel); tube.rotation.x = Math.PI / 2 - .12; tube.position.set(0, 1.28, -.1);
      const hitT = mesh(new THREE.BoxGeometry(.6, 1.5, .6), basic({ visible: false }), tel); hitT.position.y = .75; ENV.telescope = tel; ENV.telHit = hitT; }
    const vg = vcGroup(L, deco); if (vg.e) { vg.e.material.emissiveIntensity = 0; ENV.glows.push({ mat: vg.e.material, k: 2.2, flick: 1 }); }
    glowPoints(deco, lampPts, 1.2, "#ffc070", 1);
    /* --- levendulaágyások (íves sávok a tér körül, a négy út között) --- */
    { const stem = [], head = [];
      for (let q = 0; q < 4; q++) for (let k = 0; k < 150; k++) { const a = q * Math.PI / 2 + .22 + (k / 150) * (Math.PI / 2 - .44), r = 19.5 + (k * 7 % 5) * 1.25 + rr(-.3, .3), x = Math.sin(a) * r, z = Math.cos(a) * r, s = rr(.8, 1.15);
        stem.push(M4(x, .22 * s, z, rand() * 6, 0, 0, s, s, s)); head.push(M4(x, .55 * s, z, rand() * 6, 0, 0, s, s, s)); if (k % 6 === 0) ENV.lavender.push(new THREE.Vector3(x, .6, z)); }
      inst(new THREE.IcosahedronGeometry(.32, 0).scale(1, .7, 1), std({ color: "#5d7a52", roughness: .95, flatShading: true }), stem, deco, true);
      const hm = std({ color: "#8a6cc8", roughness: .85, flatShading: true }); windify(hm, .05, 1.6, "lav");
      inst(new THREE.ConeGeometry(.26, .5, 6).translate(0, .1, 0), hm, head, deco); }
    /* --- ciprusgyűrű (34 m) és néhány olajfa – életnagyságban is maradnak (a telken kívül vannak) --- */
    { const cyp = [], cypT = [];
      for (let k = 0; k < 18; k++) { const a = k / 18 * TAU + .09; if ([0, 1, 2, 3].some((q) => Math.abs(wrapA(a - q * Math.PI / 2)) < .1)) continue; const x = Math.sin(a) * 34, z = Math.cos(a) * 34, s = rr(.9, 1.15);
        cyp.push(M4(x, 0, z, rand() * 6, 0, 0, s, s * rr(.95, 1.15), s)); cypT.push(M4(x, .6, z)); }
      const cg = new THREE.LatheGeometry([0, .55, .85, 1, 1.02, .97, .88, .74, .56, .36, .16, 0].map((r, i) => new THREE.Vector2(r * 1.05, .7 + i * .85)), 12);
      const cm = std({ color: "#2b4a2a", roughness: .9, flatShading: true }); windify(cm, .0012, .7, "cyp");
      inst(cg, cm, cyp, g, true); inst(new THREE.CylinderGeometry(.18, .26, 1.4, 8), std({ color: "#4a3626", roughness: .9 }), cypT, g, true);
      const olives = []; for (let k = 0; k < 8; k++) { const a = (k + .5) / 8 * TAU, r = 40 + (k % 2) * 3; olives.push([Math.sin(a) * r, Math.cos(a) * r]); }
      const ol = []; olives.forEach(([x, z]) => { ol.push([CY(.2, .32, 2.6, 8), "#6a5642", M4(x, 1.3, z, 0, .1, .08)]); for (let k = 0; k < 7; k++) { const t = k / 7 * TAU; ol.push([new THREE.IcosahedronGeometry(1.3, 0), "#7d8f62", M4(x + Math.cos(t) * 1.2, 3.2 + (k % 2) * .6, z + Math.sin(t) * 1.2, t)]); } });
      vcGroup(ol, g, { flatShading: true, roughness: .95 }); }
    /* --- kis kikötő a tó felé (−z): fa stég bakokon, két kikötőbak --- */
    { const P2 = [], z0 = -ISL_R + .2; P2.push([BX(3.2, .14, 9), "#8a6239", M4(0, .2, z0 - 4.5)]);
      for (let k = 0; k < 4; k++) [-1.4, 1.4].forEach((x) => P2.push([CY(.12, .12, 2.2, 8), "#5a4030", M4(x, -.8, z0 - 1 - k * 2.6)]));
      [-1.3, 1.3].forEach((x) => P2.push([CY(.14, .18, .5, 10), "#2a2d32", M4(x, .5, z0 - 8.6), "m"], [CY(.2, .2, .06, 10), "#2a2d32", M4(x, .77, z0 - 8.6), "m"]));
      vcGroup(P2, g); }
  }
