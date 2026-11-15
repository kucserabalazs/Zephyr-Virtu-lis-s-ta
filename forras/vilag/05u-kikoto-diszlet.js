  /* =================================================================== 2/U. A KIKÖTŐ HANGULATA (2026. nov. 15. este – „szép, részletgazdag, világszínvonalú megjelenés”)
     • horgony-emlékmű a tér és a sétány között (kőtalapzat, öntöttvas horgony lánccal, körben virágágyás, réztábla);
     • fényfüzér a móló két oldalán a kaputól a versenyirodáig (lámpáról lámpára belógó vezeték, meleg fényű izzók);
     • öntöttvas sétányi lámpák a sétány szárazföldi oldalán (a házak ösvényeit kikerülve);
     • virágládák minden oktatóház bejárata mellett.
     Minden elem példányosítva / összeolvasztva (kevés rajzolási hívás – Quest 2). */
  function hbPolish(env) {
    const G = new THREE.Group(); G.name = "hangulat"; env.add(G);
    const iron = std({ color: "#1f252c", roughness: .45, metalness: .6 }), stone = std({ color: "#b9b2a4", roughness: .92 }), brass = std({ color: "#b8893a", metalness: .85, roughness: .32 });
    /* ---------- HORGONY-EMLÉKMŰ ---------- */
    { const A = new THREE.Group(), x = -3.0, z = landPromZ(-3.0) + 3.4, y = landWalkY(x, z) - .04;   /* a sétány mögött, a füvön (nem a sétányon) */ A.position.set(x, y, z); A.rotation.y = .35; G.add(A);
      mesh(new THREE.CylinderGeometry(1.55, 1.7, .32, 32).translate(0, .16, 0), stone, A); mesh(new THREE.CylinderGeometry(1.2, 1.25, .1, 32).translate(0, .37, 0), std({ color: "#5f8a3a", roughness: 1 }), A);
      mesh(new THREE.BoxGeometry(.7, .9, .7).translate(0, .77, 0), stone, A); mesh(new THREE.BoxGeometry(.8, .08, .8).translate(0, 1.26, 0), stone, A);
      /* öntöttvas admiralitási horgony: szár, kereszt-rúd (tuskó), két kar körívben, csúcsos lapátokkal, gyűrű lánccal */
      const H = new THREE.Group(); H.position.y = 1.3; A.add(H); const am = std({ color: "#2b2f33", roughness: .55, metalness: .55 });
      mesh(new THREE.CylinderGeometry(.07, .09, 2.3, 14).translate(0, 1.15, 0), am, H);
      { const st = mesh(new THREE.CylinderGeometry(.05, .05, 1.5, 12), std({ color: "#5b3f26", roughness: .8 }), H); st.rotation.x = Math.PI / 2; st.position.y = 1.95; [-1, 1].forEach((s) => mesh(new THREE.SphereGeometry(.07, 10, 8).translate(0, 1.95, s * .76), am, H)); }
      const arm = new THREE.TorusGeometry(.85, .07, 10, 28, Math.PI * .78); arm.rotateZ(Math.PI + Math.PI * .11); arm.translate(0, .82, 0); mesh(arm, am, H);
      [-1, 1].forEach((s) => { const fl = new THREE.ConeGeometry(.2, .42, 4); fl.rotateZ(s * .9); fl.translate(s * .78, .55, 0); mesh(fl, am, H); });
      mesh(new THREE.TorusGeometry(.17, .04, 10, 24).translate(0, 2.42, 0), am, H);
      /* lánc a gyűrűtől a talapzatig */
      for (let k = 0; k < 12; k++) { const t = k / 11, lk = mesh(new THREE.TorusGeometry(.055, .016, 6, 12), am, H); lk.position.set(.15 + Math.sin(t * 2.6) * .55, 2.3 - t * 2.2, .1 + t * .25); lk.rotation.set(k % 2 ? Math.PI / 2 : 0, .4, t); }
      /* réztábla */
      const pt = canvasTex(512, 256, (g, w, h) => { g.fillStyle = "#c79a45"; g.fillRect(0, 0, w, h); g.strokeStyle = "#6e4f1c"; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = "#3d2a0c"; g.textAlign = "center"; g.font = `900 52px ${UIF}`; g.fillText("ZAMÁRDI KIKÖTŐ", w / 2, 92); g.font = `600 30px ${UIF}`; g.fillText("a balatoni vitorlázók emlékére", w / 2, 150); g.fillText("Balaton Sailing VR", w / 2, 200); });
      const pl = mesh(new THREE.PlaneGeometry(.6, .3), std({ map: pt, metalness: .6, roughness: .35 }), A); pl.position.set(0, .82, .356);
      /* virágok a gyűrűs ágyásban */
      const fl = [], fc = [], C = ["#e63946", "#ffb703", "#f1faee", "#c77dff", "#ff70a6", "#ff9f1c"], m4 = new THREE.Matrix4(), cc = new THREE.Color();
      for (let k = 0; k < 120; k++) { const a = rand() * TAU, r = .55 + rand() * .62; m4.makeTranslation(Math.cos(a) * r, .45 + rand() * .1, Math.sin(a) * r); fl.push(m4.clone()); fc.push(C[k % C.length]); }
      const fi = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.055, 0), std({ roughness: .7 }), fl.length); fl.forEach((m, i) => { fi.setMatrixAt(i, m); fi.setColorAt(i, cc.set(fc[i])); }); A.add(fi); W.disposables.push(fi.geometry);
      (HB.solids || (HB.solids = [])).push({ x0: x - 1.5, x1: x + 1.5, z0: z - 1.5, z1: z + 1.5 }); }
    /* ---------- FÉNYFÜZÉR a móló két oldalán: a kaputól lámpáról lámpára a versenyirodáig ---------- */
    { const bulbs = [], wires = [], m4 = new THREE.Matrix4();
      [-1.35, 1.35].forEach((x) => { const posts = [[x * 1.3, 3.55, 1.5], [x, 3.25, -4], [x, 3.25, -16], [x, 3.25, -28], [x, 3.25, -40], [x * 2.93, F_STN() + 2.65, -47.3]];
        for (let i = 0; i < posts.length - 1; i++) { const [ax, ay, az] = posts[i], [bx, by, bz] = posts[i + 1], L = Math.hypot(bx - ax, bz - az), sag = Math.min(.9, L * .055), n = Math.max(3, Math.round(L / .9));
          let prev = null; for (let k = 0; k <= n; k++) { const t = k / n, p = new THREE.Vector3(ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * sag, az + (bz - az) * t);
            if (prev) wires.push(rodGeom(prev, p, .007)); if (k > 0 && k < n) { m4.makeTranslation(p.x, p.y - .07, p.z); bulbs.push(m4.clone()); } prev = p; } } });
      if (wires.length) mesh(mergeGeoms(wires), iron, G);
      const bm = std({ color: "#fff3d0", emissive: "#ffcf70", emissiveIntensity: 1.1, roughness: .3 }); const bi = new THREE.InstancedMesh(new THREE.SphereGeometry(.045, 10, 8), bm, bulbs.length); bulbs.forEach((m, i) => bi.setMatrixAt(i, m)); bi.frustumCulled = false; G.add(bi); W.disposables.push(bi.geometry); HB.bulbs = bm; }
    /* ---------- SÉTÁNYI LÁMPÁK (öntöttvas oszlop, négyszögletes lámpaház üveggel, kettős konzol) ---------- */
    { const paths = HOUSES.filter((h) => h.dr).map((h) => h.dr.wall === "n" ? h.dr.c : (h.box.x0 + h.box.x1) / 2), spots = [];
      /* 2026-11-15 este: egy lámpa a Természetvédelmi ház belsejébe került (a sétány ott a házakig ér) – a házak alaprajzán (+0,7 m) nem állhat lámpa */
      const inHouse = (x, z) => HOUSES.some((h) => x > h.box.x0 - .7 && x < h.box.x1 + .7 && z > h.box.z0 - .7 && z < h.box.z1 + .7);
      for (let x = -36; x <= 36; x += .5) { if (Math.abs(x) < 4.8 || paths.some((px) => Math.abs(px - x) < 1.9) || (spots.length && x - spots[spots.length - 1] < 7.5) || inHouse(x, landPromZ(x) + 1.65)) continue; spots.push(x); }
      const parts = [], heads = []; spots.forEach((x) => { const z = landPromZ(x) + 1.65, y = landWalkY(x, z) - .05;
        parts.push([new THREE.CylinderGeometry(.16, .2, .45, 12), M4(x, y + .22, z)], [new THREE.CylinderGeometry(.05, .07, 3.0, 10), M4(x, y + 1.9, z)], [new THREE.SphereGeometry(.08, 10, 8), M4(x, y + 3.42, z)]);
        { const c = new THREE.TorusGeometry(.32, .025, 6, 16, Math.PI); parts.push([c, M4(x, y + 3.25, z, 0, 0, 0)]); }
        [-1, 1].forEach((s) => { parts.push([new THREE.CylinderGeometry(.11, .07, .1, 4), M4(x + s * .32, y + 3.2, z, Math.PI / 4)], [new THREE.ConeGeometry(.15, .16, 4), M4(x + s * .32, y + 3.62, z, Math.PI / 4)]); heads.push(M4(x + s * .32, y + 3.4, z)); }); });
      if (parts.length) mesh(mergeGeoms(parts), iron, G);
      const gm = std({ color: "#fff4d8", emissive: "#ffd27a", emissiveIntensity: .9, roughness: .2, transparent: true, opacity: .92 }); const gi = new THREE.InstancedMesh(new THREE.BoxGeometry(.17, .3, .17), gm, Math.max(1, heads.length)); heads.forEach((m, i) => gi.setMatrixAt(i, m)); gi.count = heads.length; G.add(gi); W.disposables.push(gi.geometry);
      spots.forEach((x) => { const z = landPromZ(x) + 1.65; (HB.solids || (HB.solids = [])).push({ x0: x - .2, x1: x + .2, z0: z - .2, z1: z + .2 }); }); }
    /* ---------- VIRÁGLÁDÁK az oktatóházak bejárata mellett ---------- */
    { const box = [], fl = [], fc = [], C = ["#e63946", "#ffb703", "#f1faee", "#c77dff", "#ff70a6", "#4cc9f0"], cc = new THREE.Color();
      HOUSES.forEach((h, hi) => { const d = h.dr; if (!d || d.wall !== "n" || h.kind === "light") return; const B = h.box, z = B.z0 - (h.kind === "csarda" ? 2.0 : .55);
        [-1, 1].forEach((s) => { const x = d.c + s * (d.w / 2 + .55), y = landWalkY(x, z) - .02; box.push([new THREE.BoxGeometry(.85, .38, .36), M4(x, y + .19, z)]);
          for (let k = 0; k < 16; k++) { fl.push(M4(x + (rand() - .5) * .72, y + .42 + rand() * .12, z + (rand() - .5) * .24)); fc.push(C[(k + hi) % C.length]); } }); });
      if (box.length) mesh(mergeGeoms(box), std({ color: "#6b4a2a", roughness: .85 }), G);
      const fi = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.06, 0), std({ roughness: .7 }), Math.max(1, fl.length)); fl.forEach((m, i) => { fi.setMatrixAt(i, m); fi.setColorAt(i, cc.set(fc[i])); }); fi.count = fl.length; G.add(fi); W.disposables.push(fi.geometry);
      const leaf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.09, 0), std({ color: "#3f7a2a", roughness: .9 }), Math.max(1, fl.length >> 1)); for (let i = 0; i < fl.length >> 1; i++) { const m = fl[i * 2].clone(); m.elements[13] -= .06; leaf.setMatrixAt(i, m); } G.add(leaf); W.disposables.push(leaf.geometry); }
  }
  function F_STN() { return (typeof STN !== "undefined" && STN.F) || .66; }
