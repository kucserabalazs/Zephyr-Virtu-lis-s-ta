
  /* =================================================================== 3. A HÁZ MAKETTJE (asztalnyi méretben, az alaprajzok alapján) */
  const MAQ = {};
  const APT_PLAN = { korvett: "korvett", fregatt: "fregatt", dingi: "kozep", kaloz: "kozep", schooner: "hatso", kadett: "hatso" };
  /* lakások a telken (a „site” vázlat sávjai): [lakás, szint, sáv kezdete y (m)] – a ház 3,2…12 m között (x) */
  const UNITS = [["korvett", 0, 20.27], ["fregatt", 1, 20.27], ["dingi", 0, 12.56], ["kaloz", 1, 12.56], ["schooner", 0, 7.45], ["kadett", 1, 7.45]];
  const FLOOR_H = 2.85;
  function planOf(id) { const P = T.PLANS; const g = T.GROUPS.find((q) => q.id === id) || {}; return P[g.plan] || P[APT_PLAN[id]] || P.elso; }
  /* alaprajz (x: 0..~5,3, y: −1,5..~6,9) → telek (x: 3,2..12, y: sáv) */
  function planToSite(px, py, y0) { return [3.2 + (6.95 - py) * (8.6 / 8.4) + .1, y0 + .05 + px * (4.85 / 5.3)]; }
  const ROOMCOL = (n) => /fürd/i.test(n) ? "#cfd8dc" : /háló/i.test(n) ? "#c8a27a" : /nappali|konyha|szoba/i.test(n) ? "#d9bb92" : /előt|előszoba/i.test(n) ? "#bfc3c4" : /erkély|terasz|bejárat/i.test(n) ? "#9b7653" : "#d6c7aa";
  function buildMaquette() {
    const root = W.root, SC = 1 / 45;   /* 1:45 */
    const model = new THREE.Group(); model.scale.setScalar(SC); MAQ.model = model;
    const turn = new THREE.Group(); turn.add(model); MAQ.turn = turn;
    const stand = new THREE.Group(); stand.add(turn); root.add(stand); MAQ.stand = stand;
    /* a telek közepe a forgástengelyen */
    model.position.set(-6 * 1, 0, -(-12.6 + 43.2 / 2) * 1); model.position.multiplyScalar(SC);
    model.position.set(-6, 0, -9.0); model.position.multiplyScalar(SC);
    /* talapzat: diófa keret, üveglap alatta */
    const wood = std({ color: "#6b4426", roughness: .5 }), felt = std({ color: "#20402c", roughness: .9 });
    const baseW = 19.5 * SC, baseD = 46 * SC;
    const base = mesh(new THREE.BoxGeometry(baseW, .05, baseD), wood, turn); base.position.y = -.026;
    const top = mesh(new THREE.BoxGeometry(baseW - .02, .006, baseD - .02), felt, turn); top.position.y = .0;
    base.userData.xr = { down: (h, src) => { MAQ.drag = { x: src.o.x, z: src.o.z, a: turn.rotation.y, d: src.d.clone() }; }, drag: (src) => { if (!MAQ.drag) return; const d0 = MAQ.drag.d, d1 = src.d; const a0 = Math.atan2(d0.x, d0.z), a1 = Math.atan2(d1.x, d1.z); turn.rotation.y = MAQ.drag.a + wrapA(a1 - a0) * 4; }, up: () => { MAQ.drag = null; } };
    T.xr.extra.add(base); W.objs.push(base);
    /* talaj és burkolatok a telekvázlatból */
    const site = T.PLANS.site || {};
    const areaCol = { lawn: "#5f9a48", gravel: "#b9b2a4", bricks: "#a4673f", grid: "#8f9a8a", road: "#4a4d52", deck: "#8a6a48", reed: "#9a9a5a", water: "#3a7fa8" };
    const groundParts = {};
    const addBox = (key, col, x, y, w, d, h, z0) => { (groundParts[col] = groundParts[col] || []).push([new THREE.BoxGeometry(w, h, d), M4(x + w / 2, (z0 || 0) + h / 2, y + d / 2)]); };
    (site.furn || []).forEach((f) => {
      const [type, x, y, w, d, , , extra] = f;
      if (type === "area") addBox("a", areaCol[extra] || "#8a9a80", x, y, w, d, .06 + (extra === "lawn" ? 0 : .02));
      else if (type === "hedge") addBox("h", "#2f6a34", x, y, w, d, 1.4);
      else if (type === "fence") addBox("f", "#3f5d3f", x, y, Math.max(w, .06), Math.max(d, .06), 1.6);
      else if (type === "shed") addBox("s", "#8c939b", x, y, w, d, 2.1);
      else if (type === "gazebo") { addBox("gz", "#e9e6dc", x, y, w, d, .06, 2.45); [[0, 0], [w - .1, 0], [0, d - .1], [w - .1, d - .1]].forEach(([dx, dy]) => addBox("gp", "#e9e6dc", x + dx, y + dy, .1, .1, 2.4)); }
      else if (type === "counter2" || type === "sink") addBox("c", "#d8d4cc", x, y, w, d, .9);
      else if (type === "sup") for (let k = 0; k < (extra || 3); k++) addBox("sp", ["#ffd166", "#1f5fa8", "#e5262f", "#3fb37f"][k % 4], x, y + k * .12, w, .1, .12, .1 + k * .14);
      else if (type === "bikes") for (let k = 0; k < (extra || 4); k++) addBox("bk", "#2b2f36", x + k * (w / (extra || 4)), y, .06, d, 1.0);
      else if (type === "gate") addBox("g", "#5a5f66", x, y, w, Math.max(d, .08), 1.7);
    });
    Object.keys(groundParts).forEach((col) => { const g = mergeGeoms(groundParts[col]); mesh(g, std({ color: col, roughness: .85 }), model); });
    /* fa (a kert sarkában) */
    (site.furn || []).filter((f) => f[0] === "tree").forEach(([, x, y, w]) => { const tr = mesh(new THREE.CylinderGeometry(.15, .22, 2.2, 8), std({ color: "#5a3d24" }), model); tr.position.set(x + w / 2, 1.1, y + w / 2); const cr = mesh(new THREE.IcosahedronGeometry(w / 1.6, 1), std({ color: "#3e7d3a", roughness: .9, flatShading: true }), model); cr.position.set(x + w / 2, 3.2, y + w / 2); });
    /* a ház: lakásonként padló, falak (makett-magasságban metszve), bútorok */
    MAQ.apts = {};
    const wallM = std({ color: "#f3efe6", roughness: .9 }), slabM = std({ color: "#e8e3d8", roughness: .9 });
    UNITS.forEach(([id, lvl, y0]) => {
      const P = planOf(id), g = new THREE.Group(); g.position.y = lvl * FLOOR_H; model.add(g);
      const grp = T.GROUPS.find((q) => q.id === id) || {}, col = new THREE.Color(((site.apts || []).find((a) => a[5] === id) || [])[6] || "#999");
      const parts = { floor: {}, wall: [], furn: {} };
      const rect = (r, h, tgt, colr, z0) => { const [a, b] = planToSite(r[1], r[2], y0), [c, d] = planToSite(r[1] + r[3], r[2] + r[4], y0); const x0 = Math.min(a, c), x1 = Math.max(a, c), z0b = Math.min(b, d), z1 = Math.max(b, d);
        (tgt[colr] = tgt[colr] || []).push([new THREE.BoxGeometry(x1 - x0, h, z1 - z0b), M4((x0 + x1) / 2, (z0 || 0) + h / 2, (z0b + z1) / 2)]); return [x0, z0b, x1, z1]; };
      const rooms = (P.rooms || []).concat((P.outs || []).map((r) => r.concat(["out"])));
      let bb = [1e9, 1e9, -1e9, -1e9];
      rooms.forEach((r) => {
        const out = r[5] === "out", c = out ? "#9b7653" : ROOMCOL(r[0]);
        const q = rect(r, .12, parts.floor, c, out ? -.05 : 0);
        if (!out) { bb = [Math.min(bb[0], q[0]), Math.min(bb[1], q[1]), Math.max(bb[2], q[2]), Math.max(bb[3], q[3])];
          /* falak a szoba szélein (alacsony, metszett) */
          const t = .12, h = 1.05, [x0, z0, x1, z1] = q;
          [[x0, z0, x1 - x0, t], [x0, z1 - t, x1 - x0, t], [x0, z0, t, z1 - z0], [x1 - t, z0, t, z1 - z0]].forEach(([x, z, w, d]) => parts.wall.push([new THREE.BoxGeometry(w, h, d), M4(x + w / 2, .12 + h / 2, z + d / 2)]));
        } else {
          /* erkély/terasz korlát */
          const [x0, z0, x1, z1] = q; parts.wall.push([new THREE.BoxGeometry(.05, .9, z1 - z0), M4(x1 - .03, .45, (z0 + z1) / 2)]);
        }
      });
      /* bútorok az alaprajz tereptárgyaiból */
      const FC = { bed: "#f4f1ea", sofa: "#8a7a6a", table6: "#9c6b3f", table: "#9c6b3f", box: "#c9b28f", shower: "#bfe3f0", wc: "#ffffff", sink: "#ffffff", stairs: "#bdbdbd", kitchen: "#e9e6df", chair: "#7a5a3a", tv: "#222", wardrobe: "#c9b28f" };
      const FH = { bed: .5, sofa: .75, table6: .75, table: .75, box: .9, shower: 2, wc: .45, sink: .85, stairs: 1.2, kitchen: .9, chair: .9, wardrobe: 2.1 };
      (P.furn || []).forEach((f) => {
        const [type, x, y, w, d] = f; if (["door", "window", "area", "lane"].includes(type) || !(w > .05 && d > .05)) return;
        const c = FC[type] || "#cdbfa6"; const r = rect([type, x, y, w, d], FH[type] || .7, parts.furn, c, .12);
        if (type === "bed") { const [x0, z0, x1, z1] = r; (parts.furn["#ffffff"] = parts.furn["#ffffff"] || []).push([new THREE.BoxGeometry((x1 - x0) * .9, .12, Math.min(.5, (z1 - z0) * .25)), M4((x0 + x1) / 2, .7, z0 + .3)]); }
      });
      Object.keys(parts.floor).forEach((c) => mesh(mergeGeoms(parts.floor[c]), std({ color: c, roughness: .8 }), g));
      if (parts.wall.length) mesh(mergeGeoms(parts.wall), wallM, g);
      Object.keys(parts.furn).forEach((c) => mesh(mergeGeoms(parts.furn[c]), std({ color: c, roughness: .7 }), g));
      /* födém alatta (emeleten) */
      if (lvl) { const s = mesh(new THREE.BoxGeometry(bb[2] - bb[0], .22, bb[3] - bb[1]), slabM, g); s.position.set((bb[0] + bb[2]) / 2, -.12, (bb[1] + bb[3]) / 2); }
      /* kiemelő keret + rámutatási doboz */
      const glowM = basic({ color: col, transparent: true, opacity: 0, depthWrite: false });
      const glow = mesh(new THREE.BoxGeometry(bb[2] - bb[0] + .3, 1.6, bb[3] - bb[1] + .3), glowM, g); glow.position.set((bb[0] + bb[2]) / 2, .8, (bb[1] + bb[3]) / 2);
      const hit = glow;
      const info = { id, lvl, g, glow, glowM, bb, y0, name: grp.name || id, no: grp.no, where: grp.where || "", lock: !!grp.lock, label: null };
      hit.userData.xr = {
        hover: (on) => maqHover(info, on),
        click: (h) => maqEnter(info, h)
      };
      T.xr.extra.add(hit); W.objs.push(hit);
      MAQ.apts[id] = info;
    });
    /* épülethéj: üvegszerű külső falak szintenként (a makett „átlátszó”), és a tető – gombbal kapcsolható */
    const shellM = std({ color: "#f6f2e8", roughness: .9, transparent: true, opacity: .22, depthWrite: false });
    const roofM = std({ color: "#8a3b2c", roughness: .75, side: THREE.DoubleSide });
    const shell = new THREE.Group(); model.add(shell); MAQ.shell = shell;
    [0, 1].forEach((lv) => { const w = mesh(new THREE.BoxGeometry(8.8, FLOOR_H - .1, 18.0), shellM, shell); w.position.set(7.6, lv * FLOOR_H + FLOOR_H / 2, 16.25); });
    const roof = new THREE.Group(); model.add(roof); MAQ.roof = roof;
    const rs = new THREE.Shape(); rs.moveTo(-5.2, 0); rs.lineTo(5.2, 0); rs.lineTo(0, 2.4); rs.closePath();
    const rg = new THREE.ExtrudeGeometry(rs, { depth: 18.8, bevelEnabled: false }); rg.translate(0, 0, -9.4);
    const rm = mesh(rg, roofM, roof); rm.position.set(7.6, 2 * FLOOR_H + .05, 16.25);
    for (let k = 0; k < 24; k++) { const tile = mesh(new THREE.BoxGeometry(.06, .05, 18.8), std({ color: "#6e2b20" }), roof); const t = k / 23, side = t < .5 ? -1 : 1, q = side < 0 ? t * 2 : (t - .5) * 2; tile.position.set(7.6 + side * 5.2 * (1 - q), 2 * FLOOR_H + .08 + 2.4 * q, 16.25); }
    roof.visible = false; MAQ.roofOn = false;
    /* autók a belső parkolóban és az utcán */
    const car = (x, z, ry, col) => { const g = new THREE.Group(); const b = std({ color: col, roughness: .3, metalness: .5 }), gl = std({ color: "#1d2a36", roughness: .1, metalness: .6 });
      const body = mesh(new THREE.BoxGeometry(1.8, .7, 4.3), b, g); body.position.y = .55; const cab = mesh(new THREE.BoxGeometry(1.6, .55, 2.2), gl, g); cab.position.set(0, 1.15, -.2);
      [[-.85, 1.4], [.85, 1.4], [-.85, -1.4], [.85, -1.4]].forEach(([wx, wz]) => { const wh = mesh(new THREE.CylinderGeometry(.33, .33, .22, 14), std({ color: "#151515" }), g); wh.rotation.z = Math.PI / 2; wh.position.set(wx, .33, wz); });
      g.position.set(x, 0, z); g.rotation.y = ry; model.add(g); };
    car(5.2, 3.4, 0, "#c62828"); car(8.0, 3.4, 0, "#e9ecef"); car(1.4, 29.6, Math.PI / 2, "#1f5fa8"); car(10.6, 29.6, -Math.PI / 2, "#2b2f36");
    /* lépcsőház a két lakássor között + tetőszerkezet jelzése (vékony párkány) */
    const stair = mesh(new THREE.BoxGeometry(8.8, 5.6, 2.4), std({ color: "#dcd7cc", roughness: .9, transparent: true, opacity: .55 }), model); stair.position.set(7.6, 2.8, 18.9);
    for (let k = 0; k < 14; k++) { const st = mesh(new THREE.BoxGeometry(1.1, .18, .3), std({ color: "#9a9a9a" }), model); st.position.set(4.4, .1 + k * .2, 17.9 + k * .16); }
    /* felirat a talapzat elején */
    const plate = canvasTex(1024, 160, (g) => { g.fillStyle = "#c9a24a"; g.fillRect(0, 0, 1024, 160); g.fillStyle = "#2a1c0c"; g.font = "800 64px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ZEPHYR APARTMANHÁZ · ZAMÁRDI", 512, 70); g.font = "500 34px Georgia, serif"; g.fillText("Gáspár András utca 58. · M 1:45", 512, 124); });
    const pl = mesh(new THREE.PlaneGeometry(.32, .05), basic({ map: plate }), turn); pl.position.set(0, -.026, baseD / 2 + .0015);
    /* elhelyezés: asztalmagasságban, előttünk */
    MAQ.lights = addLights(new THREE.Vector3(.4, .9, .3).normalize(), true);
    const y = T.inVR ? .92 : -.5, dist = T.inVR ? .62 : .72;
    const yaw = T.camYaw();
    stand.position.set(-Math.sin(yaw) * dist, y, -Math.cos(yaw) * dist);
    stand.rotation.y = yaw;
    if (!T.inVR) { const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject) lc.pitchObject.rotation.x = -.55; }
    turn.rotation.y = -Math.PI / 2 + .3;   /* a ház felénk, a kert hátul – kissé oldalról */
    /* asztallap az egész alatt (VR-ben: kényelmes magasság) */
    const tw = baseD + .16, td = baseW + .22;
    const table = mesh(new THREE.BoxGeometry(tw, .04, td), std({ color: "#3b2a1d", roughness: .45 }), stand); table.position.y = -.075; table.rotation.y = turn.rotation.y + Math.PI / 2;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const lg = mesh(new THREE.BoxGeometry(.05, .85, .05), std({ color: "#2a1d13", roughness: .5 }), stand); lg.position.set(a * (tw / 2 - .06), -.52, b * (td / 2 - .06)); lg.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), turn.rotation.y + Math.PI / 2); });
    /* környezet: puha háttér */
    const bg = mesh(new THREE.SphereGeometry(40, 32, 16), basic({ color: "#1b2a3a", side: THREE.BackSide }), root);
    const floor = mesh(new THREE.CircleGeometry(12, 48), std({ color: "#2c3a48", roughness: .95 }), root); floor.rotation.x = -Math.PI / 2; floor.position.y = T.inVR ? 0 : -1.4;
    MAQ.upper = true;
    return { tick: maqTick, panel: maqPanel, hud: maqHud };
  }
  function maqHover(info, on) {
    info.hov = on;
    if (info.label) { info.g.remove(info.label); info.label = null; }
    if (on) {
      info.label = labelSprite([(info.no ? info.no + " · " : "") + info.name, info.lock ? "saját használat – nem foglalható" : (info.where + " · csippents: belépés")], { size: 6.5, fs: 50 });
      info.label.position.set((info.bb[0] + info.bb[2]) / 2, 3.2, (info.bb[1] + info.bb[3]) / 2); info.g.add(info.label);
    }
  }
  function maqEnter(info, hit) {
    if (info.lock) return;
    /* a rámutatott ponthoz legközelebbi panoráma a lakásban */
    let best = (T.GROUPS.find((q) => q.id === info.id) || {}).entry;
    if (hit && hit.point) {
      const lp = MAQ.model.worldToLocal(hit.point.clone());
      let bd = 1e9;
      Object.keys(T.SCENES).forEach((k) => { const s = T.SCENES[k]; if (s.g !== info.id || !s.m) return; const [sx, sz] = planToSite(s.m[0], s.m[1], info.y0); const d = Math.hypot(sx - lp.x, sz - lp.z); if (d < bd) { bd = d; best = k; } });
    }
    W.close(() => T.go(best));
  }
  function maqTick(dt) {
    Object.values(MAQ.apts).forEach((a) => { const tgt = a.hov ? .28 : 0; a.glowM.opacity += (tgt - a.glowM.opacity) * Math.min(1, dt * 8); a.g.visible = a.lvl === 0 || MAQ.upper; });
    if (MAQ.roof) { MAQ.roof.visible = MAQ.roofOn && MAQ.upper; MAQ.shell.children[1].visible = MAQ.upper; }
    if (!T.inVR && !MAQ.drag && MAQ.auto !== false) MAQ.turn.rotation.y += dt * .06;
  }
  function maqPanel(P) {
    P.title("A ház makettje", "Mutass egy lakásra · csippentés = belépés");
    P.row(0, "Forgatás: csippentsd meg a talapzatot, és húzd.", "#ffffff");
    P.row(1, "Földszint: Korvett (1), Dingi (2), Schooner (5)", "#ffd166");
    P.row(2, "Emelet: Fregatt (3), Kalóz (4), Kadett (6)", "#ffd166");
    P.buttons([[MAQ.upper ? "Emelet ki" : "Emelet be", () => { MAQ.upper = !MAQ.upper; }], [MAQ.roofOn ? "Tető ki" : "Tető be", () => { MAQ.roofOn = !MAQ.roofOn; }], ["⟲", () => MAQ.turn.rotation.y -= .4], ["⟳", () => MAQ.turn.rotation.y += .4], ["‹ Vissza", () => W.close()]]);
  }
  function maqHud(H) {
    H.title("A ház makettje", "Koppints egy lakásra a belépéshez");
    H.buttons([[MAQ.upper ? "Emelet elrejtése" : "Emelet mutatása", () => { MAQ.upper = !MAQ.upper; }], [MAQ.roofOn ? "Tető le" : "Tető fel", () => { MAQ.roofOn = !MAQ.roofOn; }], ["⟲", () => { MAQ.auto = false; MAQ.turn.rotation.y -= .4; }], ["⟳", () => { MAQ.auto = false; MAQ.turn.rotation.y += .4; }]]);
    H.hint("Körbenézés: húzd a képet · a makett lassan forog");
  }
