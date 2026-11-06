
  /* =================================================================== 2/B. VITORLÁSVERSENY A HAJÓBAN ÁLLVA (VR) – 2026. nov. 6., a tulajdonos kérésére
     A stégjátékok „Vitorlás-regatta” játéka életnagyságban: TE vezeted a nagy, 15 méteres versenyjacht „Zephyr”-t, három ellenfél ellen.
     • Csak a kormánykereket kell kezelni (a vitorlákat a legénység trimmeli): fogd meg a kerék peremét (csippentés vagy ravasz), és forgasd,
       mint egy igazi hajókormányt – jobbra forgatva a hajó jobbra fordul. 2D-ben: ◀ ▶ gomb vagy ← → / A D billentyű.
     • A hajó: modern versenyjacht (TP52-szerű) – lapos tíkfedélzet, két nagy karbon kormánykerék talapzaton, tetejükön iránytű és
       műszerkijelző, csörlők a peremen, főszkóta-sín (traveller) a kerekek előtt, korlátok, achterstag, a legénység a szél felőli oldalon.
     • A verseny: rajt a rendezőhajó és a bója közötti vonalon (visszaszámlálás, kürtszó), a bójákat bal kéz felől kell kerülni,
       a befutó ugyanaz a vonal. Minden futam más pályát és szelet hoz (a stégjáték pályasablonjai szerint); a szintek egyre gyorsabb ellenfeleket adnak.
     Tó-koordináták mint a vitorlázásnál: x = kelet, z = dél (É = −z); irányszög b: 0 = É, + = óramutató szerint; fwd(b) = (sin b, −cos b). */
  const VRR = {};
  const VR_SC = 1.85;   /* a saját hajó nagyítása: 8,2 m → 15,2 m */
  const VR_RIV = [
    { name: "Kék Fecske", num: "HUN 7", hull: "#ffffff", boot: "#1f5fa8", stripe: "#1f5fa8", jib: "#f2f4f6", main: "#f4f4f0", spin: ["#1f5fa8", "#ffffff", "#7fc4ff"] },
    { name: "Sárga Szél", num: "HUN 21", hull: "#f4f6f8", boot: "#f2b233", stripe: "#f2b233", jib: "#fff6d6", main: "#fff6d6", spin: ["#f2b233", "#ffffff", "#e2483d"] },
    { name: "Tihanyi Csillag", num: "HUN 3", hull: "#1f3d2a", boot: "#ffffff", stripe: "#f2b233", jib: "#ffffff", main: "#f2f2ee", spin: ["#2e7d32", "#ffffff", "#f2b233"] }
  ];
  /* pályasablonok (a stégjáték „gameRace” TPL-je nyomán): [keresztirányú (−1..1), széllel szembeni (0..1)] */
  const VR_TPL = [
    { n: "Felszél–hátszél", m: [[0, 1], [0, .12]] },
    { n: "Háromszög", m: [[-1, .95], [1, .7]] },
    { n: "Szlalom", m: [[-.6, .55], [.6, .75], [-.4, 1]] },
    { n: "Tihanyi kör", m: [[1, 1], [-1, 1], [0, .5]] },
    { n: "Nagy ív", m: [[1, .6], [.3, 1], [-1, .8]] }
  ];
  const vrRng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t2 = Math.imul(seed ^ seed >>> 15, 1 | seed); t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2; return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296; };
  const vfwd = (b) => [Math.sin(b), -Math.cos(b)];
  /* pálya + szél egy futamhoz: a rajtvonal közepe (0,0); a szél iránya és ereje futamonként más */
  function vrCourse(lvl) {
    const R = vrRng(lvl * 7919 + 13), tp = VR_TPL[(lvl - 1) % VR_TPL.length];
    const wf = (300 + R() * 60) * D2R, side = R() < .3 ? (R() < .5 ? -1 : 1) * (.35 + R() * .3) : (R() - .5) * .25;   /* néha oldalszél: a pálya tengelye elfordul */
    const axis = wf + side, u = vfwd(axis), c = [-u[1], u[0]];   /* u: a pálya „felfelé” iránya; c: jobbra */
    const D = 300 + R() * 60, A = 120 + R() * 40;
    const marks = tp.m.map(([x, z]) => ({ x: u[0] * D * z + c[0] * A * x * (.85 + R() * .3), z: u[1] * D * z + c[1] * A * x * (.85 + R() * .3) }));
    const L = 70;   /* a rajtvonal hossza */
    return { name: tp.n, lvl, wf, tws: (10 + R() * 6) * KN, marks, u, c, line: { a: { x: -c[0] * L / 2, z: -c[1] * L / 2 }, b: { x: c[0] * L / 2, z: c[1] * L / 2 } } };
  }
  /* --------------------------------------------------------------- a nagy versenyjacht kokpitja (méterben, a skálázott hajó helyi terében) */
  function vrCockpit(boat) {
    const body = boat.userData.body;
    const G = new THREE.Group(); G.scale.setScalar(1 / VR_SC); body.add(G);   /* G-ben méterben dolgozunk (a hajó helyi tere ×1,85) */
    const sh = (u) => { const s = hullShape(u); return { z: s.z * VR_SC, hb: s.hb * VR_SC, y: (s.sheer + .07) * VR_SC }; };
    const carbon = std({ color: "#1b1d21", roughness: .35, metalness: .4 }), chrome = std({ color: "#e6eaee", roughness: .12, metalness: 1 }), leather = std({ color: "#5a3a24", roughness: .7 });
    const white = std({ color: "#f6f6f2", roughness: .3 }), grey = std({ color: "#3a3f46", roughness: .5, metalness: .3 });
    const teakT = canvasTex(512, 512, (gg, w, h) => { for (let y = 0, j = 0; y < h; y += 16, j++) { const off = (j * 97) % 256; for (let x = -off; x < w; x += 256) { gg.fillStyle = `hsl(${rr(26, 31)},${rr(36, 48)}%,${rr(38, 47)}%)`; gg.fillRect(x, y, 254, 14); for (let k = 0; k < 6; k++) { gg.fillStyle = `rgba(60,32,14,${rr(.06, .15)})`; gg.fillRect(x + rand() * 240, y + rr(2, 12), rr(30, 120), 1); } gg.fillStyle = "#17140f"; gg.fillRect(x + 254, y, 2, 14); } gg.fillStyle = "#17140f"; gg.fillRect(0, y + 14, w, 2); } });
    teakT.wrapS = teakT.wrapT = THREE.RepeatWrapping; teakT.repeat.set(3, 9);
    const teak = std({ map: teakT, roughness: .75 });
    /* tíkborítás a fedélzet hátsó harmadán (a tükörtől a kerekek előtti utazósínig), a fedélzet ívét követve */
    { const N = 24, pos = [], uv = [], idx = []; const u0 = .005, u1 = .36;
      for (let i = 0; i <= N; i++) { const u = u0 + (u1 - u0) * i / N, s = sh(u); for (let j = 0; j <= 8; j++) { const f = j / 8 * 2 - 1, x = f * (s.hb - .12); const camb = .07 * VR_SC * (1 - f * f) * .9; pos.push(x, s.y - .07 * VR_SC + camb + .012, s.z); uv.push(x / 1.6, s.z / 1.6); } }
      for (let i = 0; i < N; i++) for (let j = 0; j < 8; j++) { const a = i * 9 + j, b = a + 1, c = a + 9, d = c + 1; idx.push(a, c, b, b, c, d); }
      const ge = new THREE.BufferGeometry(); ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); ge.setIndex(idx); ge.computeVertexNormals(); mesh(ge, teak, G).receiveShadow = true; }
    const helmU = .14, hs = sh(helmU), deckY = hs.y + .02;
    /* a kajüttető lapos, versenyhajós (TP52-szerű) – a makeBoat túraszerű kajütjét alacsonyabbra nyomjuk, sötét ablaksávot és lejárót kap */
    body.children.forEach((m) => { if (m.isMesh && m.geometry && m.geometry.type === "ExtrudeGeometry") { m.scale.y = .58; } });
    { const cy = (hullShape(.42).sheer + .02) * VR_SC, glassM = std({ color: "#121a22", roughness: .05, metalness: .6 });
      [-1, 1].forEach((sd) => { const wn = mesh(new THREE.PlaneGeometry(2.6, .14), glassM, G); wn.position.set(sd * 1.62, cy + .24, .25); wn.rotation.y = sd * Math.PI / 2; wn.rotation.x = 0; });
      const comp = mesh(new THREE.PlaneGeometry(.75, .42), glassM, G); comp.position.set(0, cy + .22, (-1.33) * VR_SC + .1 - .02); comp.rotation.y = Math.PI; }
    /* a kajüttető: csúszásgátló szürke felület, két tetőablak, kapaszkodók */
    { const cy2 = (hullShape(.42).sheer + .02) * VR_SC + .52, ns = std({ color: "#d9dad6", roughness: .95 }), gl2 = std({ color: "#121a22", roughness: .05, metalness: .6 });
      const pad = mesh(new THREE.BoxGeometry(2.6, .01, 3.6), ns, G); pad.position.set(0, cy2, .5);
      [-1, 1].forEach((sd) => { const hatch = mesh(new THREE.BoxGeometry(.55, .04, .55), gl2, G); hatch.position.set(sd * .55, cy2 + .02, 1.6); const hr = mesh(new THREE.BoxGeometry(.05, .06, 2.4), teak, G); hr.position.set(sd * 1.1, cy2 + .04, .3); }); }
    /* a két kerék: talapzat (karbon oszlop), tetején iránytű-búra és műszer; a kerék karbon, bőrrel bevont peremmel, 6 küllővel */
    const WR = .46, wheels = [];   /* kisebb, kézre eső kerék (a tulajdonos kérése) – átmérő ~92 cm */
    const instT = canvasTex(512, 512, (gg) => { gg.fillStyle = "#06090d"; gg.fillRect(0, 0, 512, 512); });
    const chartT = canvasTex(1024, 1024, (gg) => { gg.fillStyle = "#0a2236"; gg.fillRect(0, 0, 1024, 1024); }); chartT.anisotropy = 4;
    [-1, 1].forEach((sd) => {
      const x = sd * (hs.hb - .78), z = hs.z + .55;
      const ped = new THREE.Group(); G.add(ped); ped.position.set(x, deckY, z);
      const col = mesh(new THREE.CylinderGeometry(.075, .11, 1.0, 16), carbon, ped); col.position.y = .5;
      const foot = mesh(new THREE.CylinderGeometry(.2, .24, .04, 20), chrome, ped); foot.position.y = .02;
      const head = mesh(new THREE.BoxGeometry(.26, .18, .3), carbon, ped); head.position.set(0, 1.04, -.02);
      const dome = mesh(new THREE.SphereGeometry(.1, 20, 12, 0, TAU, 0, Math.PI / 2), std({ color: "#20303e", roughness: .05, metalness: .3, transparent: true, opacity: .75 }), ped); dome.position.set(0, 1.13, -.05);
      const card = mesh(new THREE.CylinderGeometry(.085, .085, .02, 24), std({ color: "#f2e6c8", roughness: .5 }), ped); card.position.set(0, 1.14, -.05);
      /* a műszerkijelző a talapzat tetején, a kormányos felé döntve (élő adatok) */
      const scr = mesh(new THREE.PlaneGeometry(.34, .34), basic({ map: instT }), ped); scr.position.set(0, 1.2, -.2); scr.rotation.set(-.5, Math.PI, 0);   /* nagyobb kijelző: bója-irány, távolság, sebesség, kis pályatérkép */
      /* TÉRKÉP-PLOTTER a kormányos előtt, kis karon a kerék fölött (csak a te kerekednél): pálya, ideális útvonal, számozott bóják,
         kerülési irány, a hajód és a nyomvonalad, ellenfelek, szél – folyamatosan, a hajó orra felé forgatva */
      if (sd < 0) { const arm = mesh(new THREE.CylinderGeometry(.018, .018, .5, 10), chrome, ped); arm.position.set(-.22 * sd, 1.2, -.2); arm.rotation.z = -.9 * sd;
        const frame = mesh(new THREE.BoxGeometry(.48, .43, .03), carbon, ped); frame.position.set(-.4 * sd, 1.42, -.24); frame.rotation.set(-.45, Math.PI - .35 * sd, 0);
        const ch = mesh(new THREE.PlaneGeometry(.45, .4), basic({ map: chartT }), ped); ch.position.copy(frame.position); ch.rotation.copy(frame.rotation); ch.translateZ(.017); }
      /* kapaszkodó a talapzat előtt (rozsdamentes cső) */
      const [gb, mb] = rodGeom(new THREE.Vector3(-.22, 0, .25), new THREE.Vector3(-.22, .95, .1), .016, 8); mesh(gb, chrome, ped).applyMatrix4(mb);
      const [gb2, mb2] = rodGeom(new THREE.Vector3(.22, 0, .25), new THREE.Vector3(.22, .95, .1), .016, 8); mesh(gb2, chrome, ped).applyMatrix4(mb2);
      const [gb3, mb3] = rodGeom(new THREE.Vector3(-.22, .95, .1), new THREE.Vector3(.22, .95, .1), .016, 8); mesh(gb3, chrome, ped).applyMatrix4(mb3);
      /* tengely + kerék (a kerék síkja keresztirányú; a kormányos a tat felől áll mögötte) */
      const axle = mesh(new THREE.CylinderGeometry(.035, .035, .34, 12), chrome, ped); axle.rotation.x = Math.PI / 2; axle.position.set(0, .8, -.24);
      const wheel = new THREE.Group(); ped.add(wheel); wheel.position.set(0, .8, -.42);
      const spin = new THREE.Group(); wheel.add(spin);
      mesh(new THREE.TorusGeometry(WR, .028, 12, 72), carbon, spin);
      const gripM = std({ color: "#5a3a24", roughness: .7, emissive: new THREE.Color("#ffd166"), emissiveIntensity: 0 });
      const grip = mesh(new THREE.TorusGeometry(WR, .034, 10, 72, TAU * .999), gripM, spin); grip.scale.set(1, 1, .85);
      /* varrás-mintázat a bőrön: vékony világos gyűrű */
      mesh(new THREE.TorusGeometry(WR + .031, .004, 4, 96), std({ color: "#e8d9b8", roughness: .6 }), spin);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; const sp = mesh(new THREE.BoxGeometry(.03, WR - .07, .022), carbon, spin); sp.position.set(Math.sin(a) * (WR - .07) / 2, Math.cos(a) * (WR - .07) / 2, 0); sp.rotation.z = -a; }
      const hub = mesh(new THREE.CylinderGeometry(.09, .1, .08, 20), chrome, spin); hub.rotation.x = Math.PI / 2;
      const cap = mesh(new THREE.CylinderGeometry(.06, .06, .02, 20), std({ color: "#c62828", roughness: .4 }), spin); cap.rotation.x = Math.PI / 2; cap.position.z = -.05;
      /* a felső jelölés („király-küllő”): fehér szalag a peremen – egyenesben felül van */
      const king = mesh(new THREE.TorusGeometry(WR, .037, 8, 10, .16), white, spin); king.rotation.z = Math.PI / 2 - .08;
      /* láthatatlan, vastag fogófelület a sugaras kezeléshez */
      const hit = mesh(new THREE.TorusGeometry(WR, .14, 6, 32), basic({ visible: false }), wheel);
      /* lábtámasz: döntött tíkblokk a kerék mellett (a kormányos lába ide támaszkodik dőlésben) */
      const fb = mesh(new THREE.BoxGeometry(.5, .1, .16), teak, G); fb.position.set(x + sd * .55, deckY + .05, z - 1.0); fb.rotation.x = -.35;
      wheels.push({ sd, ped, wheel, spin, hit, gripM, WR });
    });
    /* utazósín (traveller) a kerekek előtt, keresztben; rajta a kocsi, a főszkóta felfut a bumra */
    const tz = hs.z + 2.25, trav = mesh(new THREE.BoxGeometry(2 * (sh(.2).hb - .5), .06, .12), grey, G); trav.position.set(0, sh(.2).y + .05, tz);
    const car = mesh(new THREE.BoxGeometry(.24, .1, .16), carbon, G); car.position.set(0, sh(.2).y + .12, tz);
    /* csörlők: fő génuacsörlők a perem mentén a kerekek előtt, szkótacsörlők, kurblis „daráló” talapzat középen */
    const winch = (x, y, z, r) => { const d = mesh(new THREE.CylinderGeometry(r * .78, r, r * 1.3, 28), chrome, G); d.position.set(x, y + r * .65, z); const t2 = mesh(new THREE.CylinderGeometry(r * .55, r * .72, r * .5, 24), carbon, G); t2.position.set(x, y + r * 1.55, z); d.castShadow = true; };
    [-1, 1].forEach((sd) => { const s1 = sh(.28), s2 = sh(.22); winch(sd * (s1.hb - .3), s1.y, s1.z, .16); winch(sd * (s2.hb - .35), s2.y, s2.z, .12); winch(sd * (sh(.17).hb - .32), sh(.17).y, sh(.17).z, .1);
      /* szkótakötél-tekercsek a csörlők mellett */
      const coil = mesh(new THREE.TorusGeometry(.14, .03, 6, 18), std({ color: sd > 0 ? "#d61f26" : "#1f5fa8", roughness: .9 }), G); coil.rotation.x = Math.PI / 2; coil.position.set(sd * (s1.hb - .7), s1.y + .03, s1.z - .4); });
    { const s3 = sh(.25); const gp = mesh(new THREE.CylinderGeometry(.1, .14, .8, 14), carbon, G); gp.position.set(0, s3.y + .4, s3.z); [-1, 1].forEach((sd) => { const hdl = mesh(new THREE.BoxGeometry(.04, .04, .26), chrome, G); hdl.position.set(sd * .14, s3.y + .82, s3.z); }); }
    /* korlát: oszlopok a fedélzet szélén és két sor drótkorlát, a tatnál nyitott (versenyhajó) */
    { const parts = [];
      const posts = []; for (let u = .05; u <= .9; u += .085) { const s = sh(u); [-1, 1].forEach((sd) => { const b = new THREE.Vector3(sd * (s.hb - .1), s.y - .05, s.z); const t2 = b.clone(); t2.y += .72; posts.push([b, t2, sd]); parts.push(rodGeom(b, t2, .018, 8)); }); }
      [-1, 1].forEach((sd) => { const ps = posts.filter((p) => p[2] === sd); for (let i = 0; i < ps.length - 1; i++) [.72, .38].forEach((h) => parts.push(rodGeom(ps[i][0].clone().setY(ps[i][0].y + h), ps[i + 1][0].clone().setY(ps[i + 1][0].y + h), .006, 4))); });
      mesh(mergeGeoms(parts), chrome, G); }
    /* hátsó navigációs fény, fedélzeti lámpák, a tükör „ZEPHYR · HUN 27” felirata */
    const lampM = std({ color: "#fff6dd", emissive: new THREE.Color("#ffe2a0"), emissiveIntensity: .3 }); [-1, 1].forEach((sd) => { const l = mesh(new THREE.SphereGeometry(.03, 8, 6), lampM, G); l.position.set(sd * (sh(.02).hb - .15), sh(.02).y + .02, sh(.02).z + .06); });
    /* A TAT (tükör) – modern versenyjacht: lehajtható fürdőplató tíkkal és létrával, a tükrön a hajó neve és honi kikötője,
       két rozsdamentes tatkorlát (pushpit) a negyedeken, rajtuk patkó-mentőöv és MOB-jelzőbója, zászlórúd a magyar lobogóval */
    { const s0 = sh(0), z0 = s0.z, hb0 = s0.hb, yT = s0.y - .07 * VR_SC, yW = -.05;
      const nameT = canvasTex(1024, 256, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.textAlign = "center"; gg.fillStyle = "#f3d27a"; gg.font = "italic 900 132px Georgia, serif"; gg.fillText("Zephyr", w / 2, 140);
        gg.fillStyle = "#ffffff"; gg.font = "700 46px system-ui, sans-serif"; gg.fillText("Z A M Á R D I   ·   H U N  27", w / 2, 222); });
      const nm = mesh(new THREE.PlaneGeometry(2.1, .52), basic({ map: nameT, transparent: true, depthWrite: false }), G); nm.position.set(0, yT - .48, z0 - .012); nm.rotation.y = Math.PI;
      /* fürdőplató: a tükör aljából kihajtott tíklap, alatta sötét perem, két hidraulika-kar */
      const pw = 2 * hb0 * .82, pd = .62, py = yW + .32;
      const plat = mesh(new THREE.BoxGeometry(pw, .07, pd), teak, G); plat.position.set(0, py, z0 - pd / 2 + .02); plat.receiveShadow = true;
      const lip = mesh(new THREE.BoxGeometry(pw + .02, .1, .04), carbon, G); lip.position.set(0, py - .02, z0 - pd + .01);
      mesh(mergeGeoms([-1, 1].map((sd) => rodGeom(new THREE.Vector3(sd * pw * .4, py - .03, z0 - pd + .1), new THREE.Vector3(sd * pw * .36, yT - .55, z0 - .02), .025, 8))), chrome, G);
      /* fürdőlétra a plató jobb szélén, a vízbe ér */
      { const lx = pw * .3, lp = [];
        [-1, 1].forEach((k) => lp.push(rodGeom(new THREE.Vector3(lx + k * .17, py + .02, z0 - pd + .04), new THREE.Vector3(lx + k * .17, yW - .55, z0 - pd - .12), .016, 8)));
        for (let i = 0; i < 4; i++) { const f = i / 3, yy = py - .12 - f * .62, zz = z0 - pd + .02 - f * .14; lp.push(rodGeom(new THREE.Vector3(lx - .17, yy, zz), new THREE.Vector3(lx + .17, yy, zz), .014, 6)); }
        mesh(mergeGeoms(lp), chrome, G); }
      /* tatkorlát (pushpit): a negyedeken 3-3 oszlop, felső és középső cső, középen nyitott (be lehet lépni a platóra) */
      const pp = []; const top = .74;
      [-1, 1].forEach((sd) => {
        const A = new THREE.Vector3(sd * (sh(.06).hb - .1), sh(.06).y - .05, sh(.06).z), B = new THREE.Vector3(sd * (hb0 - .12), yT, z0 + .1), C = new THREE.Vector3(sd * hb0 * .45, yT, z0 + .08);
        [A, B, C].forEach((v) => pp.push(rodGeom(v, v.clone().setY(v.y + top), .02, 8)));
        [top, top * .5].forEach((hh) => { const a = A.clone().setY(A.y + hh), b = B.clone().setY(B.y + hh), c = C.clone().setY(C.y + hh); const m = b.clone().lerp(c, .5); m.z -= .06; pp.push(rodGeom(a, b, .02, 8), rodGeom(b, m, .02, 8), rodGeom(m, c, .02, 8)); });
      });
      mesh(mergeGeoms(pp), chrome, G);
      /* patkó-mentőöv a jobb oldali tatkorláton, mellette a MOB-bója (narancs rúd, zászlócska) */
      { const ring = new THREE.Group(); G.add(ring); ring.position.set(hb0 - .32, yT + top * .72, z0 + .02);
        const hs2 = mesh(new THREE.TorusGeometry(.21, .065, 10, 24, Math.PI * 1.55), std({ color: "#ff6a1a", roughness: .8 }), ring); hs2.rotation.z = -Math.PI * .5 - Math.PI * .225;
        [-.12, .12].forEach((x) => { const st2 = mesh(new THREE.BoxGeometry(.035, .14, .14), std({ color: "#f3f3f3", roughness: .6 }), ring); st2.position.set(x, -.12, 0); });
        const mob = mesh(new THREE.CylinderGeometry(.03, .03, 1.7, 10), std({ color: "#ff7a1a", roughness: .6 }), G); mob.position.set(hb0 - .62, yT + .7, z0 + .05);
        const fl = mesh(new THREE.PlaneGeometry(.26, .18), basic({ color: "#ff3b1a", side: THREE.DoubleSide }), G); fl.position.set(hb0 - .62 + .13, yT + 1.45, z0 + .05); VRR.mobFlag = fl; }
      /* zászlórúd a bal negyeden, magyar lobogóval (a szélben lebeg – a vrTick mozgatja) */
      { const fx = -(hb0 - .42), fz = z0 + .06;
        const pole = mesh(new THREE.CylinderGeometry(.018, .022, 1.15, 10), teak, G); pole.position.set(fx, yT + top + .5, fz); pole.rotation.x = -.35;
        const fT = canvasTex(96, 64, (gg, w, h) => { gg.fillStyle = "#cd2a3e"; gg.fillRect(0, 0, w, h / 3); gg.fillStyle = "#ffffff"; gg.fillRect(0, h / 3, w, h / 3); gg.fillStyle = "#436f4d"; gg.fillRect(0, h * 2 / 3, w, h / 3); });
        const fg = new THREE.PlaneGeometry(.6, .4, 8, 1); fg.translate(.3, 0, 0);
        const flag = mesh(fg, std({ map: fT, side: THREE.DoubleSide, roughness: .9 }), G); flag.position.set(fx, yT + top + .95, fz - .18); flag.rotation.y = Math.PI / 2;
        VRR.ensign = flag; flag.userData.base = Float32Array.from(fg.attributes.position.array); }
    }
    /* a legénység: négy trimmelő a szél felőli oldalon (térdelve, kötéllel a kezükben) – átülnek forduláskor */
    const crew = [];
    const skin = std({ color: "#d9a988", roughness: .7 }); const ropeM = std({ color: "#e8e2cf", roughness: .9 });
    [[.3, "#e5262f"], [.38, "#0b2f5e"], [.47, "#e5262f"], [.56, "#0b2f5e"]].forEach(([u, c]) => { const g2 = new THREE.Group(); G.add(g2);
      const v = std({ color: c, roughness: .75 }), jk = std({ color: "#1d2229", roughness: .8 });
      const torso = mesh(new THREE.CapsuleGeometry(.16, .42, 4, 10), jk, g2); torso.position.y = .5;
      const vest = mesh(new THREE.CapsuleGeometry(.175, .22, 4, 10), v, g2); vest.position.y = .6; vest.scale.set(1, 1, .9);
      const neck = mesh(new THREE.CylinderGeometry(.05, .055, .08, 8), skin, g2); neck.position.y = .86;
      const shades = mesh(new THREE.BoxGeometry(.17, .035, .02), std({ color: "#0d0f12", roughness: .1, metalness: .6 }), g2); shades.position.set(0, .99, .11);
      const head = mesh(new THREE.SphereGeometry(.12, 14, 10), skin, g2); head.position.y = .98;
      const cap = mesh(new THREE.SphereGeometry(.125, 14, 8, 0, TAU, 0, Math.PI / 2), std({ color: "#ffffff" }), g2); cap.position.y = 1.01;
      const visor = mesh(new THREE.BoxGeometry(.16, .015, .12), std({ color: "#0b2f5e" }), g2); visor.position.set(0, 1.0, .14);
      const legs = mesh(new THREE.CapsuleGeometry(.09, .5, 3, 8), std({ color: "#20252c" }), g2); legs.position.set(0, .14, .2); legs.rotation.x = Math.PI / 2;
      [-1, 1].forEach((sd) => { const arm = mesh(new THREE.CapsuleGeometry(.05, .38, 3, 8), jk, g2); arm.position.set(sd * .16, .62, .22); arm.rotation.set(1.1, 0, -sd * .2); const hd = mesh(new THREE.SphereGeometry(.045, 8, 6), skin, g2); hd.position.set(sd * .19, .5, .42); });
      /* a kezében a szkótakötél: a két tenyér között, onnan le a fedélzeti csigához – így „trimmel”, nem a levegőt fogja */
      mesh(mergeGeoms([rodGeom(new THREE.Vector3(-.19, .5, .43), new THREE.Vector3(.19, .5, .43), .012, 5), rodGeom(new THREE.Vector3(.19, .5, .43), new THREE.Vector3(.05, -.02, .95), .012, 5), rodGeom(new THREE.Vector3(-.19, .5, .43), new THREE.Vector3(-.3, .3, .2), .012, 5)]), ropeM, g2);
      crew.push({ g: g2, u }); });
    return { G, wheels, instT, chartT, deckY, helm: new THREE.Vector3(hs.hb - .74, deckY, hs.z - .62), crew, sh };
  }
  /* --------------------------------------------------------------- felépítés */
  function buildVRace() {
    const root = W.root;
    Object.assign(VRR, { grab: null, wHover: false, crewSide: null, lastSide: 0, podium: null, helpL: null, msgL: null, lblAr: 0 });   /* (az előző megnyitás átmeneti állapota ne maradjon meg; a futam száma igen) */
    const far = new THREE.Group(), env = new THREE.Group(); root.add(far); root.add(env); VRR.far = far; VRR.env = env;
    makeSky(far); makeShores(far);
    VRR.water = makeWater(env);
    const boat = makeBoat({ detail: 0, vis: false, crew: 0, hull: "#0b2f5e", boot: "#ffffff", stripe: "#c62828", jib: "#d61f26", main: "#f6f4ec", num: "HUN 27", name: "ZEPHYR", logo: "ZEPHYR", spin: ["#e2483d", "#ffffff", "#0b2f5e"] });
    boat.scale.setScalar(VR_SC); boat.rotation.y = Math.PI; root.add(boat); VRR.boat = boat;
    const CK2 = vrCockpit(boat); VRR.ck = CK2;
    /* a felhasználó helye: a jobb oldali (styrbord) kerék mögött; a hajó orra −z felé néz (a hajó π-vel elforgatva) */
    const hp = CK2.helm.clone().multiplyScalar(1 / VR_SC); hp.x = -hp.x;   /* styrbord = a hajó helyi −x oldala */
    const eye = T.inVR ? 0 : 1.62;
    const hw = boat.localToWorld(hp.clone());
    VRR.seated = (() => { try { return localStorage.getItem("zephyr-vr-ules") === "1"; } catch (e) { return false; } })();
    VRR.baseY = -(hw.y + eye); root.position.set(-hw.x, VRR.baseY - (VRR.seated && T.inVR ? .45 : 0), -hw.z); VRR.rootX = -hw.x; VRR.rootZ = -hw.z; VRR.helmL = hp.clone(); boat.updateMatrix(); VRR.helmRest = hp.clone().applyMatrix4(boat.matrix); root.updateMatrixWorld(true);   /* ülve a fedélzet 45 cm-rel lejjebb kerül – így ülve is a kerék fölött látsz */
    VRR.wake = makeWake(env, 1.2);
    /* felcsapó víz: az orrnál és a hajó vállánál – sebességgel nő; a hullámra ugráskor nagy permet */
    { const N = 900, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const dot = canvasTex(64, 64, (gg) => { const gr = gg.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.45, "rgba(235,248,255,.7)"); gr.addColorStop(1, "rgba(220,240,255,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64); });
      const m = new THREE.PointsMaterial({ size: .2, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }); W.disposables.push(m, g);
      const pts = new THREE.Points(g, m); pts.frustumCulled = false; root.add(pts);
      VRR.spray = { pts, pos, col, N, vel: new Float32Array(N * 3), life: new Float32Array(N), max: new Float32Array(N), i: 0, acc: 0 }; }
    /* ellenfelek (ugyanakkora hajók) */
    VRR.riv = VR_RIV.map((o, i) => { const g = makeBoat(Object.assign({ detail: 0, crew: 3 }, o)); g.scale.setScalar(VR_SC * .96); env.add(g); const wk = makeWake(env, 1.1);
      const lbl = labelSprite([o.name, o.num], { size: 4.2, fs: 60, w: 620 }); env.add(lbl); return { o, g, wk, i, lbl }; });
    VRR.podium = labelSprite(["", "", "", "", ""], { size: 2.4, fs: 56, w: 900 }); root.add(VRR.podium); VRR.podium.visible = false;
    /* bóják, rendezőhajó, rajt-bója, a következő bója jelzőoszlopa */
    VRR.markG = new THREE.Group(); env.add(VRR.markG);
    VRR.cb = makeCommittee(); VRR.cb.scale.setScalar(1.2); env.add(VRR.cb);
    VRR.cdL = labelSprite(["RAJT", "0:45"], { size: 7, fs: 70, w: 640 }); env.add(VRR.cdL);
    VRR.pin = makeBuoy("#ff7a00", 2.0); VRR.pin.scale.setScalar(1.3); env.add(VRR.pin);
    const beamT = canvasTex(32, 256, (gg, w, h) => { const gr = gg.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(255,209,102,.9)"); gr.addColorStop(1, "rgba(255,209,102,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, w, h); });
    VRR.beam = mesh(new THREE.CylinderGeometry(2.4, 2.4, 60, 16, 1, true), basic({ map: beamT, transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), env); VRR.beam.renderOrder = 5;
    VRR.beamLbl = labelSprite(["1. bója", "kerüld bal kéz felől"], { size: 14, fs: 64, w: 760 }); env.add(VRR.beamLbl);
    /* kerülési nyíl a következő bója körül a vízen: az óramutatóval ellentétes ív (felülről nézve) = a bója bal kéz felől marad */
    { const R0 = 15, pts = []; for (let k = 0; k <= 36; k++) { const a = k / 36 * Math.PI * 1.5; pts.push(new THREE.Vector3(R0 * Math.cos(a), 0, -R0 * Math.sin(a))); }
      const arM = basic({ color: "#ffd166", transparent: true, opacity: .75, depthWrite: false }); const g3 = new THREE.Group(); env.add(g3); VRR.arrow = g3;
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .45, 6, false), arM, g3);
      const aEnd = Math.PI * 1.5, head = mesh(new THREE.ConeGeometry(1.4, 3.2, 10), arM, g3); head.position.set(R0 * Math.cos(aEnd), 0, -R0 * Math.sin(aEnd)); head.rotation.set(0, 0, 0);
      const tg2 = new THREE.Vector3(-Math.sin(aEnd), 0, -Math.cos(aEnd)); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg2); g3.renderOrder = 4; }
    VRR.lineM = mesh(new THREE.PlaneGeometry(1, .5), basic({ color: "#ffd166", transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }), env); VRR.lineM.rotation.x = -Math.PI / 2; VRR.lineM.renderOrder = 4;
    /* nagy műszerkijelző az árbócon (mint a valódi versenyhajókon): idő, helyezés, bója */
    const mastT = canvasTex(1024, 256, (gg) => { gg.fillStyle = "#06090d"; gg.fillRect(0, 0, 1024, 256); });
    const mastS = mesh(new THREE.PlaneGeometry(1.6, .4), basic({ map: mastT }), boat.userData.body); mastS.scale.setScalar(1 / VR_SC); mastS.position.set(0, (hullShape(.42).sheer + .46) + 2.1 / VR_SC * 1.4, .95 - .12); mastS.rotation.y = Math.PI;
    VRR.mastT = mastT;
    VRR.gulls = makeGulls(env);
    /* nézőhajók a rajtvonal két végén (horgonyoznak, ringanak): motoros jachtok, emberekkel a fedélzeten */
    VRR.spect = [];
    [["#f4f4f0", "#1f3a6a"], ["#ffffff", "#c62828"], ["#e9e2cf", "#2e7d32"], ["#f4f4f0", "#3a3f46"], ["#ffffff", "#f2b233"]].forEach(([hc, sc], i) => {
      const g2 = new THREE.Group(); env.add(g2);
      const parts = [[BX(3.0, 1.0, 9), hc, M4(0, .25, 0)], [new THREE.ConeGeometry(1.5, 3, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).scale(1, .5, 1), hc, M4(0, .25, 6)], [BX(3.02, .25, 9.02), sc, M4(0, .45, 0)],
        [BX(2.3, 1.2, 3.2), hc, M4(0, 1.3, -.6)], [BX(2.34, .5, 2.6), "#1d2a36", M4(0, 1.5, -.4), "m"], [BX(2.6, .08, 2.2), hc, M4(0, 2.0, -2.6)], [CY(.04, .04, 1.1, 6), "#c9cdd2", M4(1.2, 1.4, -3.6), "m"], [CY(.04, .04, 1.1, 6), "#c9cdd2", M4(-1.2, 1.4, -3.6), "m"]];
      for (let k = 0; k < 4; k++) parts.push([CY(.17, .19, .6, 8), ["#e5262f", "#1f5fa8", "#ffd166", "#f4f4f0"][(k + i) % 4], M4(-.8 + k * .55, 1.15, -3.3)], [new THREE.SphereGeometry(.12, 8, 6), "#d9a988", M4(-.8 + k * .55, 1.55, -3.3)]);
      vcGroup(parts, g2); VRR.spect.push({ g: g2, i, ph: rand() * 9 });
    });
    VRR.lights = addLights(SUN.clone());
    /* a kerekek fogása sugárral (csippentés / ravasz) */
    CK2.wheels.forEach((w) => { w.hit.userData.xr = { hover: (on) => { VRR.wHover = on; }, down: (h, src, key) => vrGrab(w, src, key, true), drag: (src) => vrDrag(w, src), up: () => { VRR.rgrab = null; } }; T.xr.extra.add(w.hit); W.objs.push(w.hit); });
    /* első alkalommal: felirat a jobb oldali kerék fölött – amíg meg nem fogod */
    /* üzenettábla a kerék előtt (VR-ben a panel nélkül is látszik): bójakerülés, rossz oldal, korai rajt, koccanás, befutó */
    { const w0 = CK2.wheels.find((w) => w.sd < 0) || CK2.wheels[0]; VRR.msgL = labelSprite(["", ""], { size: 2.0, fs: 50, w: 1150 }); CK2.G.add(VRR.msgL);
      VRR.msgL.position.set(w0.ped.position.x * .6, CK2.deckY + 1.75, w0.ped.position.z + 2.2); VRR.msgL.visible = false; }
    { const w0 = CK2.wheels.find((w) => w.sd < 0) || CK2.wheels[0]; VRR.helpL = labelSprite(["Markold meg a kormányt!", "zárd a kezed a peremén és forgasd – meglökve kipörög"], { size: .55, fs: 56, w: 820 }); w0.wheel.add(VRR.helpL); VRR.helpL.position.set(0, .95, 0); }
    SAIL.keys = {}; W.vrr = VRR; W.vrSetup = vrSetup;   /* (tesztekhez) */
    VRR.best = (() => { try { return JSON.parse(localStorage.getItem("zephyr-vr-verseny") || "{}"); } catch (e) { return {}; } })();
    vrSetup(VRR.lvl || 1);
    faceYaw(0);
    audioStart({ water: .04, wind: .035 });
    return { tick: vrTick, panel: vrPanel, hud: vrHud, wrist: vrWrist };
  }
  /* új futam: pálya, szél, kiinduló helyzet a rajtvonal mögött */
  function vrSetup(lvl) {
    const C = VRR.C = vrCourse(lvl); VRR.lvl = lvl;
    VRR.wf = C.wf; VRR.tws = C.tws;
    while (VRR.markG.children.length) VRR.markG.remove(VRR.markG.children[0]);
    VRR.marks = C.marks.map((m, i) => { const b = makeBuoy(i === C.marks.length - 1 && C.marks.length > 2 ? "#ffd166" : "#ff7a00", 2.4); b.scale.setScalar(1.5); b.position.set(m.x, 0, m.z); VRR.markG.add(b);
      const nt = canvasTex(128, 128, (gg) => { gg.fillStyle = "#14161b"; gg.font = "900 110px system-ui"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText(String(i + 1), 64, 70); });
      [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((ry) => { const p = mesh(new THREE.PlaneGeometry(.7, .7), basic({ map: nt, transparent: true, depthWrite: false }), b); p.position.set(Math.sin(ry) * .66, 1.4, Math.cos(ry) * .66); p.rotation.y = ry; });
      return { x: m.x, z: m.z, g: b }; });
    /* rajtvonal: bal végén a rendezőhajó, jobb végén a narancs bója */
    VRR.cb.position.set(C.line.b.x, 0, C.line.b.z); VRR.cb.rotation.y = Math.atan2(C.u[0], C.u[1]);
    VRR.pin.position.set(C.line.a.x, 0, C.line.a.z);
    /* nézőhajók: a vonal két végén kívül és a pálya szélén, a hajók útjából kiesve */
    (VRR.spect || []).forEach((q, i) => { const side = i % 2 ? 1 : -1, along = 60 + i * 26, back = -10 + i * 40; q.x = C.c[0] * side * along + C.u[0] * back; q.z = C.c[1] * side * along + C.u[1] * back; q.g.position.set(q.x, 0, q.z); q.g.rotation.y = rand() * TAU; });
    const mx = (C.line.a.x + C.line.b.x) / 2, mz = (C.line.a.z + C.line.b.z) / 2;
    VRR.lineM.position.set(mx, .05, mz); VRR.lineM.scale.set(Math.hypot(C.line.b.x - C.line.a.x, C.line.b.z - C.line.a.z), 1, 1); VRR.lineM.rotation.z = -Math.atan2(C.line.b.z - C.line.a.z, C.line.b.x - C.line.a.x);
    /* a hajók a vonal alatt (szél alatt) 70–110 m-re, halzon; 45 mp a rajtig */
    const back = (d, s) => ({ x: -C.u[0] * d + C.c[0] * s, z: -C.u[1] * d + C.c[1] * s });
    const p0 = back(95, 6); Object.assign(VRR, { x: p0.x, z: p0.z, b: C.wf + Math.PI * .5 - .3, v: 2.5, del: 0, wa: 0, heel: 0, lastSide: 0, tackT: 0, next: 0, t: -45, st: "pre", horns: {}, fin: null, msg: "Rajt 45 mp múlva – állj be a vonal mögé!", msgT: 6, ocs: 0, res: [], pen: 0, doneT: 0, prevSide: null, dnf: false });
    VRR.riv.forEach((r, i) => { const p = back([84, 102, 90][i], [-48, -22, 38][i]);   /* egymástól és tőled is legalább ~28 m-re (15 m-es hajók) */ Object.assign(r, { x: p.x, z: p.z, b: C.wf + (i % 2 ? 1 : -1) * Math.PI * .45, v: 2.4, next: 0, tack: i % 2 ? 1 : -1, lastTack: 0, fin: null, skill: .93 + Math.min(.12, lvl * .018) + i * .01, ph: rand() * 9 }); });
    if (VRR.podium) VRR.podium.visible = false;
    W.panelDirty = 1;
  }
  /* --------------------------------------------------------------- kormány */
  const _wv = new THREE.Vector3();
  function wheelAngleOf(w, p) {   /* a kéz/sugár pontja a kerék síkjában: óramutató szerinti szög a kormányos szemszögéből */
    const lp = w.wheel.worldToLocal(_wv.copy(p)); return Math.atan2(-lp.x, lp.y);   /* a kormányos felől nézve jobbra = a hajó helyi −x */
  }
  function vrGrab(w, src, key, ray) {
    let p = null; if (ray) { const pl = new THREE.Plane(); const n = new THREE.Vector3(0, 0, 1).transformDirection(w.wheel.matrixWorld); const c = w.wheel.getWorldPosition(new THREE.Vector3()); pl.setFromNormalAndCoplanarPoint(n, c); p = new THREE.Ray(src.o, src.d).intersectPlane(pl, new THREE.Vector3()); }
    else p = src.tip;
    if (!p) return; VRR.rgrab = { w, a: wheelAngleOf(w, p), key, ray }; try { flap(.02); } catch (e) {}
  }
  function vrDrag(w, src) {
    const G = VRR.rgrab; if (!G || !G.ray) return;
    const pl = new THREE.Plane(); const n = new THREE.Vector3(0, 0, 1).transformDirection(w.wheel.matrixWorld); const c = w.wheel.getWorldPosition(new THREE.Vector3()); pl.setFromNormalAndCoplanarPoint(n, c);
    const p = new THREE.Ray(src.o, src.d).intersectPlane(pl, new THREE.Vector3()); if (!p) return;
    const a = wheelAngleOf(w, p); VRR.wa = clamp(VRR.wa + wrapA(a - G.a), -WA_MAX, WA_MAX); G.a = a;
  }
  function wheelRelease(h) {
    const S = VRR, G = S.grabs && S.grabs[h]; if (!G) return; delete S.grabs[h];
    const other = Object.values(S.grabs).length > 0;
    /* lendületből elengedve (és ha a másik kéz sem fogja) a kerék tovább pörög */
    if (!other && G.hist && G.hist.length >= 2) { const a0 = G.hist[0], a1 = G.hist[G.hist.length - 1], dtt = Math.max(.02, a1[0] - a0[0]); S.wv = clamp((a1[1] - a0[1]) / dtt, -18, 18); if (Math.abs(S.wv) < 1.2) S.wv = 0; }
    S.lastRel = { n: G.hist ? G.hist.length : -1, wv: S.wv };
    S.grab = S.grabs.right || S.grabs.left || null; vrGripHand(null, h);
  }
  function vrRelease() { Object.keys(VRR.grabs || {}).forEach(wheelRelease); }
  /* a kerékre markoló kéz (bőrszín, mint a követett kéz): tenyér, négy ujj a peremet körülfogva, hüvelykujj, csukló */
  function vrGripHand(w, key, b) {
    const S = VRR; S.gh = S.gh || {};
    let H = S.gh[key];
    if (!H) {
      H = new THREE.Group(); const skin = std({ color: "#e9cdb4", roughness: .62 }), nail = std({ color: "#f3dfd2", roughness: .4 }), sleeve = std({ color: "#1b2a3c", roughness: .8 });
      const mir = key === "left" ? -1 : 1;
      const palm = mesh(new THREE.SphereGeometry(1, 16, 12), skin, H); palm.scale.set(.047, .054, .02); palm.position.set(0, -.014, -.048); palm.rotation.x = -.25;
      [-.033, -.011, .011, .033].forEach((x, i) => { const L = [.95, 1, .97, .85][i];
        const fin = mesh(new THREE.TorusGeometry(.043 * L, .0105, 6, 12, Math.PI * 1.15), skin, H); fin.rotation.set(0, Math.PI / 2, 0); fin.rotation.order = "YXZ"; fin.rotation.x = -Math.PI * .62; fin.position.set(x * mir, .004, -.006);
        const tip = mesh(new THREE.SphereGeometry(.0108, 8, 6), nail, fin); tip.position.set(Math.cos(Math.PI * 1.15) * .043 * L, Math.sin(Math.PI * 1.15) * .043 * L, 0); });
      const th = mesh(new THREE.CapsuleGeometry(.012, .045, 4, 8), skin, H); th.rotation.z = Math.PI / 2 * .8 * mir; th.position.set(-.045 * mir, -.03, -.035);
      const wr = mesh(new THREE.CylinderGeometry(.026, .03, .09, 12), skin, H); wr.rotation.x = Math.PI / 2 - .5; wr.position.set(0, -.045, -.105);
      const cuff = mesh(new THREE.CylinderGeometry(.034, .036, .05, 14), sleeve, H); cuff.rotation.x = Math.PI / 2 - .5; cuff.position.set(0, -.07, -.155);
      H.scale.setScalar(1.05); S.gh[key] = H;
    }
    /* a valódi (követett) kéz eltűnik, amíg a markoló kéz a keréken van */
    try { document.querySelectorAll("[hand-tracking-controls]").forEach((el) => { const d = el.components["hand-tracking-controls"]; if (d && d.data && d.data.hand === key) el.object3D.visible = !w; }); } catch (e) {}
    if (!w) { if (H.parent) H.parent.remove(H); return; }
    w.spin.add(H); H.position.set(-Math.sin(b) * w.WR, Math.cos(b) * w.WR, 0); H.rotation.set(0, 0, b);
  }
  const WA_MAX = .9 * Math.PI;   /* ±162° a végállásig – érzékenyebb áttétel (a lapát max. ~31°) */
  /* oldalerő-tényező a látszólagos szélszög szerint (0–1): kileng (≤18°) → 0, éles szél 30–55° → 1, félszél 90° → 0,8, bővszél 130° → 0,3, hátszél → ~0,08 */
  function heelCs(awa) { if (awa < 18) return 0; if (awa < 30) return (awa - 18) / 12; if (awa < 55) return 1; if (awa < 90) return 1 - (awa - 55) / 35 * .2; if (awa < 130) return .8 - (awa - 90) / 40 * .5; return Math.max(.06, .3 - (awa - 130) / 50 * .24); }
  const HEEL_KR = 205;   /* felállító nyomaték (normált) – kb. 18° dőlés cirkálásban ~22 csomós látszólagos szélben */
  function heelEq(awa, aws) { const F = aws * aws * heelCs(awa); let th = .2; for (let i = 0; i < 4; i++) th = Math.asin(clamp(F * Math.pow(Math.cos(th), 1.3) / HEEL_KR, 0, .9)); return th; }
  const VR_SPD = 1.95;   /* sebesség-szorzó: a 15 m-es versenyjacht 9–16 csomóval száguld (élmény), a pályák rövidebbek lesznek */   /* ütközéstől ütközésig ~2,5 fordulat (mint egy nagy jachton) */
  /* --------------------------------------------------------------- képkocka */
  function vrTick(dt) {
    const S = VRR, C = S.C;
    if (S.ensign) { const pa = S.ensign.geometry.attributes.position, b0 = S.ensign.userData.base, t = W.t; for (let i = 0; i < pa.count; i++) { const x = b0[i * 3]; pa.array[i * 3 + 2] = Math.sin(x * 9 - t * 7) * .05 * x / .6; } pa.needsUpdate = true; }
    /* KÉZI FOGÁS – MARKOLÁS (nem csippentés): ha a tenyered a perem mellett van és ökölbe zárod, a kezed „ráfog” a kerékre
       (a peremen megjelenik a markoló kéz), amíg zárva tartod, a kerék a kezeddel együtt fordul. Ha lendületből elengeded,
       a kerék magától tovább pörög a végállásig (és ott kicsit visszapattan), mint egy igazi hajókormány. */
    const X = T.xr;
    /* KORMÁNYKERÉK v3 (2026. nov. 7., kutatás alapján):
       • a kerék a kéz középpont körüli SZÖGELFORDULÁSÁT követi a kerék síkjában (a VR-ben bevált módszer), zajszűrővel (one-euro) – azonnal reagál, de nem remeg;
       • markolás: ökölbe zárt kéz VAGY csippentés a perem mellett, bőséges fogási zónával; a kéz a peremen marad (markoló kéz), amíg nyitva nem engeded;
       • engedékeny: rövid kézkövetés-vesztésnél (0,45 mp) vagy egy pillanatnyi ujjnyílásnál (0,1 mp) nem enged el – a Meta útmutatója szerint az ökölbe zárt
         ujjakat rosszul követi a kamera, ezért a fogás csak akkor ér véget, ha tényleg kinyitod a kezed;
       • két kézzel is foghatod (a két kéz elfordulásának átlaga);
       • elengedve: a kormánylapátra ható víznyomás a hajósebesség NÉGYZETÉVEL nő – gyors menetben a víz visszahúzza a kereket középre,
         lassan a súrlódás miatt ott marad, ahol hagytad; gyors menetben a hullámok finoman megmozgatják; lendületből elengedve kipörög a végállásig. */
    const curl = (s0) => { const j = s0.jp, c = s0.palmC; if (!j || !c) return -1; let sum = 0, n = 0; [j.it, j.mt, j.rt, j.pt].forEach((t) => { if (!t) return; sum += clamp((.115 - t.distanceTo(c)) / .06, 0, 1); n++; }); return n ? sum / n : -1; };
    const pinchOf = (s0, h) => { if (X && X.pinch && X.pinch[h]) return true; const j = s0.jp; return !!(j && j.tt && j.it && j.tt.distanceTo(j.it) < .028); };
    const squeeze = (s0) => { try { const b = s0.src && s0.src.gamepad && s0.src.gamepad.buttons; return !!(b && b[1] && b[1].pressed); } catch (e) { return false; } };
    S.grabs = S.grabs || {}; S.hold = S.hold || {};
    let dSum = 0, dN = 0;
    if (T.inVR && X && X.src) {
      ["right", "left"].forEach((h) => {
        const s0 = X.src[h], G = S.grabs[h], pt = s0 && (s0.palmC || s0.wristJ || s0.tip);
        if (!s0 || !pt) { if (G) { G.lost = (G.lost || 0) + dt; if (G.lost > .45) wheelRelease(h); } S.hold[h] = false; return; }
        const g = s0.hand ? curl(s0) : (squeeze(s0) ? 1 : 0), pin = !!s0.hand && pinchOf(s0, h);
        const holding = g > .5 || pin, open = (g >= 0 && g < .28) && !pin;
        if (G) {
          if (G.lp && G.lp.distanceTo(pt) > .25) { G.lost = (G.lost || 0) + dt; if (G.lost > .45) wheelRelease(h); return; }   /* valószerűtlen ugrás = követési hiba: kivárjuk */
          (G.lp || (G.lp = new THREE.Vector3())).copy(pt);
          G.lost = 0; if (open) { G.off = (G.off || 0) + dt; if (G.off > .1) { wheelRelease(h); S.hold[h] = holding; return; } } else G.off = 0;
          const lp = G.w.wheel.worldToLocal(_wv.copy(pt)), r = Math.hypot(lp.x, lp.y);
          if (r > G.w.WR + .38 || Math.abs(lp.z) > .42) { wheelRelease(h); S.hold[h] = holding; return; }   /* a kéz messze elment a keréktől */
          if (r > .07) { const raw = Math.atan2(-lp.x, lp.y), dr = wrapA(raw - G.f), fc = 1.6 + .4 * Math.abs(dr) / Math.max(dt, 1e-3), al = 1 / (1 + 1 / (2 * Math.PI * fc * Math.max(dt, 1e-3)));
            G.f = G.f + dr * al; dSum += wrapA(G.f - G.a); dN++; G.a = G.f; }
        } else if (holding && !S.hold[h]) {   /* fogás kezdete: a kéz a perem mellett zárul (vagy csippent) */
          S.ck.wheels.forEach((w) => { if (S.grabs[h]) return; const lp = w.wheel.worldToLocal(_wv.copy(pt)), r = Math.hypot(lp.x, lp.y);
            if (Math.abs(lp.z) < .22 && r > w.WR - .21 && r < w.WR + .2) { const a0 = Math.atan2(-lp.x, lp.y); S.grabs[h] = { w, a: a0, f: a0, key: h, ray: false, hist: [[W.t, S.wa]] }; S.wv = 0; vrGripHand(w, h, a0 - S.wa); try { flap(.02); X.pulse && X.pulse(h, .5, 30); } catch (e) {} } });
        }
        S.hold[h] = holding;
      });
    }
    S.grab = S.grabs.right || S.grabs.left || null;
    if (dN) { S.wa = clamp(S.wa + dSum / dN, -WA_MAX, WA_MAX); Object.values(S.grabs).forEach((G) => { G.hist.push([W.t, S.wa]); while (G.hist.length > 2 && W.t - G.hist[0][0] > .2) G.hist.shift(); }); }
    const k = SAIL.keys; if (k.L || k.R) { S.wa = clamp(S.wa + ((k.R ? 1 : 0) - (k.L ? 1 : 0)) * dt * 2.4, -WA_MAX, WA_MAX); S.wv = 0; }
    else if (!S.grab && !S.rgrab) {
      const vR = Math.max(0, S.v / VR_SPD), kc = .09 * vR * vR, damp = .87 + 1.2 * Math.min(1, vR / 4);   /* visszatérítő „rugó” ~ v², csillapítás */
      const tq = -kc * S.wa + Math.sin(W.t * 1.7 + Math.sin(W.t * .43) * 2) * .025 * vR;   /* hullámok rángatása */
      if (Math.abs(S.wv || 0) < .04 && Math.abs(tq) < .06) S.wv = 0;   /* tapadó súrlódás: lassan ott marad, ahol hagytad */
      else { S.wv = (S.wv || 0) + tq * dt; S.wv *= Math.pow(Math.exp(-damp), dt); }
      S.wa += S.wv * dt;
      if (S.wa > WA_MAX) { S.wa = WA_MAX; S.wv = -Math.abs(S.wv) * .22; if (Math.abs(S.wv) > .3) try { winch(); } catch (e) {} } else if (S.wa < -WA_MAX) { S.wa = -WA_MAX; S.wv = Math.abs(S.wv) * .22; if (Math.abs(S.wv) > .3) try { winch(); } catch (e) {} }
    }
    S.del = S.wa / WA_MAX * .55;
    S.ck.wheels.forEach((w) => { w.spin.rotation.z = S.wa; const want = S.grab && S.grab.w === w ? .55 : (VRR.wHover ? .25 : 0) + (!S.everGrab && S.st === "pre" && w.sd < 0 ? .25 + .25 * Math.sin(W.t * 4) : 0); w.gripM.emissiveIntensity += (want - w.gripM.emissiveIntensity) * Math.min(1, dt * 8); });
    if (S.grab) S.everGrab = true;
    if (S.helpL) { S.helpL.visible = T.inVR && !S.everGrab && S.st !== "done"; }   /* (2D-ben billentyű/gomb kormányoz – ott nem kell) */
    if (S.msgL) { const on = S.msgT > 0 && !!S.msg && S.st !== "done" && !(S.st === "pre" && S.t < -38); S.msgL.visible = on;
      if (on) { const m = S.msg; let k = m.indexOf(" – "), L; if (k > 0) L = [m.slice(0, k), m.slice(k + 3)]; else if ((k = m.indexOf("! ")) > 0) L = [m.slice(0, k + 1), m.slice(k + 2)]; else L = [m, ""]; S.msgL.userData.set(L); } }   /* +z körüli forgás a kormányos felől nézve óramutató szerinti */
    /* fizika (a vitorlázás modellje, a nagyobb hajóhoz igazítva) */
    /* a szél lassan leng (±7°) – mint a Balatonon; a pálya ugyanaz marad */
    S.wf = C.wf + Math.sin(S.t / 47 + C.lvl) * 7 * D2R + Math.sin(S.t / 13) * 2 * D2R;
    const twa = Math.abs(wrapA(S.wf - S.b)) * R2D;
    S.spinOn = S.spinOn ? twa > 98 : twa > 108; const spin = S.spinOn && S.st === "race";   /* hátszélben (és széles hátszélben) felhúzzák a spinakkert */
    S.gk = 1 + .13 * Math.sin(S.t * .31 + C.lvl) * Math.sin(S.t * .173 + 1) + .05 * Math.sin(S.t * 1.07);   /* széllökések: ±15% */
    const vt = polar(twa, spin) * KN * VR_SPD * (S.heelPen || 1) * (S.st === "pre" ? .7 : 1) * (S.tws * S.gk / (12 * KN)) ** .5 * (1 + .08 * Math.sin(W.t * .23) * Math.sin(W.t * .07));
    /* gyorsabban gyorsul (a nagy vitorlafelület húz), a kormány fékez egy kicsit, ha nagyon el van tekerve */
    S.v += (vt - S.v) * Math.min(1, dt / (vt > S.v ? 2.8 : 5)); S.v *= 1 - Math.abs(S.del) * .16 * dt;
    /* fordulás: sebességfüggő, de lassan is kormányozható; kis tehetetlenséggel (nem ugrik, de jól reagál) */
    { const yrT = Math.sin(S.del) * (.085 * S.v + .24); S.yr = (S.yr || 0) + (yrT - (S.yr || 0)) * Math.min(1, dt * 3.2); }
    S.b = (S.b + S.yr * dt + TAU) % TAU;
    const [fx, fz] = vfwd(S.b); S.x += fx * S.v * dt; S.z += fz * S.v * dt;
    /* látszólagos szél, vitorlák, dőlés */
    const wfv = vfwd(S.wf), tw = [wfv[0] * S.tws * S.gk, wfv[1] * S.tws * S.gk], aw = [tw[0] + fx * S.v, tw[1] + fz * S.v], aws = Math.hypot(aw[0], aw[1]);
    const awa = Math.acos(clamp((aw[0] * fx + aw[1] * fz) / (aws || 1), -1, 1)) * R2D;
    const port = [fz, -fx], side = (wfv[0] * port[0] + wfv[1] * port[1]) > 0 ? -1 : 1;
    if (side !== S.lastSide) { if (S.lastSide) { S.tackT = 3.4; flap(.16); setTimeout(winch, 1500); setTimeout(winch, 2300); } S.lastSide = side; }
    S.tackT = Math.max(0, S.tackT - dt);
    const BS = S.boat.userData.S; BS.side = side; BS.boom = clamp((awa - 22) * .72, 5, 80) * D2R * side; BS.jib = clamp((awa - 22) * .5, 7, 50) * D2R;
    BS.luff = Math.max(clamp(1 - (awa - 16) / 16, 0, 1), S.tackT > 1.4 ? .7 : 0); BS.spin += ((spin ? 1 : 0) - BS.spin) * Math.min(1, dt * .4);
    /* DŐLÉS – fizikai modell (kutatás alapján): a dőlő nyomaték ∝ látszólagos szélsebesség² × oldalerő-tényező(látszólagos szélszög) × cos^1,3(dőlés),
       a felállító nyomaték ∝ sin(dőlés). Az oldalerő éles szélben (cirkálás, 25–55°) a legnagyobb, félszélben kisebb (több hajtás, kevesebb dőlés),
       hátszélben szinte nulla (ott a spinakker inkább ringat). Felfelé fordulva nő a látszólagos szél és a dőlés, leesve csökken.
       Mozgásegyenlet csillapított lengéssel (~4,5 s sajátperiódus) – a széllökésre túllendül, majd beáll. */
    { /* a dőléshez a „valódi” (gyorsítás nélküli) hajósebességből számolt látszólagos szél kell – különben a VR-gyorsítás miatt a szél túl előre fordulna */
      const vR = S.v / VR_SPD, awH = [tw[0] + fx * vR, tw[1] + fz * vR], awsH = Math.hypot(awH[0], awH[1]), awaH = Math.acos(clamp((awH[0] * fx + awH[1] * fz) / (awsH || 1), -1, 1)) * R2D;
      const luffH = Math.max(clamp(1 - (awaH - 14) / 12, 0, 1), S.tackT > 1.4 ? .7 : 0);
      const F = (awsH * awsH) * heelCs(awaH) * (1 - luffH * .85) * (1 - BS.spin * .75 * clamp((awaH - 75) / 55, 0, 1)) * (1 + BS.spin * .5 * clamp(1 - (awaH - 75) / 45, 0, 1)), th = S.heel || 0, w0 = 1.4, zeta = .38;
      let M = (F * Math.pow(Math.cos(th), 1.3) - HEEL_KR * Math.sin(th)) / HEEL_KR;
      if (BS.spin > .5) M += Math.sin(.065) * Math.sin(W.t * 1.25) * clamp(aws / 9, 0, 1.4) * BS.spin;   /* spinakker alatt hátszélben ringatózás (oldalra-oldalra) */
      S.heelV = (S.heelV || 0) + (M * w0 * w0 - 2 * zeta * w0 * (S.heelV || 0)) * dt; S.heel = clamp(th + S.heelV * dt, -.2, .62);
      S.heelPen = S.heel > 22 * D2R ? 1 - (S.heel - 22 * D2R) / (30 * D2R) * .3 : 1;   /* túl nagy dőlésnél a hajó nem gyorsul tovább (kevésbé hatékony) */
      /* luvgierigkeit: dőlésben a hajó a szél felé „húz” – a kormánnyal kell ellentartani */
      S.yr += Math.sign(wrapA(S.wf - S.b)) * Math.max(0, S.heel) * .1 * Math.min(1, S.v / 5) * dt * 3; }
    BS.heel = -side * S.heel * .78;   /* látványban kicsit visszafogva (a kormányos helye le van horgonyozva) */
    /* mozgás a hullámokon: a lassú hajót dobálja a víz (jobban ring), a száguldó hajó kisimul – csak néha ugrik meg egy-egy hullámon */
    const hb = waveAt(S.x + fx * 6, S.z + fz * 6, W.t), hs2 = waveAt(S.x - fx * 6, S.z - fz * 6, W.t);
    const rockK = clamp(1.25 - S.v / 8, .28, 1.25);
    S.slam = (S.slam || 0) * Math.pow(.015, dt);
    if (S.v > 5 && S.prevHb != null && (hb - S.prevHb) / Math.max(dt, .001) > .45 && W.t - (S.slamT || 0) > 1.6 && Math.random() < .35) { S.slam = .03 + Math.random() * .02; S.slamT = W.t; S.sprayBurst = 1; }
    S.prevHb = hb;
    BS.pitch = clamp((hs2 - hb) / 12 * 1.1 * rockK, -.05, .05) - S.slam * Math.sin(Math.min(1, (W.t - (S.slamT || 0)) * 3) * Math.PI);
    BS.heel += Math.sin(W.t * .83 + 1.3) * .03 * rockK + Math.sin(W.t * 1.37) * .012 * rockK;
    S.boat.position.y = (hb + hs2) / 2 * .5 * rockK + S.slam * 3 * Math.sin(Math.min(1, (W.t - (S.slamT || 0)) * 3) * Math.PI);
    S.boat.userData.update(dt);
    /* permet: a hajó a root-ban áll (a világ mozog), ezért a cseppek hátrafelé sodródnak a hajó sebességével */
    if (S.spray) { const P = S.spray, bowZ = -HULL.L / 2 * VR_SC, k = clamp((S.v - 3.2) / 6, 0, 1.4), back = S.v * .85, bp = S.boat.position.y;
      P.acc += dt * (k * 320 + (S.sprayBurst ? 900 : 0)); const burst = S.sprayBurst; S.sprayBurst = 0;
      while (P.acc > 1) { P.acc -= 1; const i = P.i; P.i = (P.i + 1) % P.N; const sd = Math.random() < .5 ? -1 : 1, bow = Math.random() < .62, b = i * 3;
        const z0 = bow ? bowZ + 1.2 + Math.random() * 1.6 : bowZ + 3 + Math.random() * 4.5, x0 = sd * (bow ? .35 + Math.random() * .5 : 1.7 + Math.random() * .4);
        P.pos[b] = x0; P.pos[b + 1] = bp + .15 + Math.random() * .2; P.pos[b + 2] = z0;
        const up = (bow ? 2.2 : 1.2) + Math.random() * 2.4 * (.5 + k) + (burst ? 2.5 : 0), out = (bow ? 1.6 : 1.1) + Math.random() * 2.2 * (.4 + k);
        P.vel[b] = sd * out; P.vel[b + 1] = up; P.vel[b + 2] = back * (.6 + Math.random() * .4) - (bow ? 1.2 : 0);
        P.max[i] = P.life[i] = .7 + Math.random() * .8; }
      for (let i = 0; i < P.N; i++) { const b = i * 3; if (P.life[i] <= 0) { P.col[b] = P.col[b + 1] = P.col[b + 2] = 0; continue; }
        P.life[i] -= dt; P.vel[b + 1] -= 9.8 * dt; P.pos[b] += P.vel[b] * dt; P.pos[b + 1] += P.vel[b + 1] * dt; P.pos[b + 2] += P.vel[b + 2] * dt;
        if (P.pos[b + 1] < bp - .1) P.life[i] = 0;
        const f = Math.max(0, P.life[i] / P.max[i]), a = Math.min(1, f * 1.6) * .42; P.col[b] = a * .92; P.col[b + 1] = a * .97; P.col[b + 2] = a; }
      P.pts.geometry.attributes.position.needsUpdate = true; P.pts.geometry.attributes.color.needsUpdate = true; }
    /* a kormányos helye „lehorgonyozva”: a dőlés/bólintás/hullámzás a kormány körül forgatja a hajót, nem a láb alól húzza ki –
       így a kerék mindig a kéz ügyében marad, a fedélzet nem csúszik el (kényelmesebb, kevésbé émelyítő) */
    if (S.helmL) { const bd = S.boat.userData.body; bd.updateMatrix(); S.boat.updateMatrix(); const cur = S.helmL.clone().applyMatrix4(bd.matrix).applyMatrix4(S.boat.matrix);
      W.root.position.set(S.rootX - (cur.x - S.helmRest.x), S.baseY - (S.seated && T.inVR ? .45 : 0) - (cur.y - S.helmRest.y), S.rootZ - (cur.z - S.helmRest.z)); }
    /* legénység: a szél felőli oldalra ül (forduláskor átmászik) */
    S.crewSide = S.crewSide == null ? -side : S.crewSide + (-side - S.crewSide) * Math.min(1, dt * .9);
    S.ck.crew.forEach((c, i) => { const s = S.ck.sh(c.u); c.g.position.set(S.crewSide * (s.hb - .55), s.y - .02, s.z); c.g.rotation.y = S.crewSide > 0 ? Math.PI / 2 : -Math.PI / 2; c.g.rotation.z = Math.sin(W.t * 2 + i) * .03; });
    /* környezet a hajó körül */
    S.env.rotation.y = S.b; S.far.rotation.y = S.b;
    S.env.position.set(-S.x, 0, -S.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), S.b);
    const wm = S.water; wm.position.set(Math.round(S.x / 40) * 40, 0, Math.round(S.z / 40) * 40);
    const mat = wm.userData.mat; mat.uniforms.uT.value = W.t; mat.uniforms.uOff.value.set(wm.position.x, wm.position.z); mat.uniforms.uWind.value = Math.atan2(-wfv[1], -wfv[0]);
    const cw = new THREE.Vector3(); T.camObj().getWorldPosition(cw); mat.uniforms.uCam.value.copy(S.env.worldToLocal(cw));
    S.wake.push(S.x, S.z, Math.atan2(fx, fz), S.v, dt, .05);
    S.gulls.tick(dt, S.x, S.z);
    (S.spect || []).forEach((q) => { q.g.position.y = Math.sin(W.t * 1.1 + q.ph) * .08; q.g.rotation.z = Math.sin(W.t * .9 + q.ph) * .03; q.g.rotation.x = Math.sin(W.t * .7 + q.ph * 2) * .02; });
    /* verseny-állapot */
    S.t += dt;
    if (S.st === "pre") { [-30, -10, -5, -4, -3, -2, -1].forEach((tt) => { if (S.t >= tt && !S.horns[tt]) { S.horns[tt] = 1; if (tt === -30 || tt === -10) horn(.7, .14); else beep(); } }); if (S.t >= 0) { S.st = "race"; horn(1.5, .2);
        /* korai rajt (OCS): a rajtjelkor a vonal pálya felőli oldalán vagy → egyéni visszahívás, vissza kell menni a vonal mögé */
        if (lineSide(S) > 0) { S.ocs = 1; S.msg = "Korai rajt! Fordulj vissza, és menj át újra a rajtvonalon."; S.msgT = 8; setTimeout(() => horn(.4, .14), 700); }
        else { S.msg = "RAJT! Irány az 1. bója"; S.msgT = 5; } } }
    if (S.st === "race" && S.ocs) { const ls = lineSide(S); if (S.ocs === 1 && ls <= 0) S.ocs = 2; else if (S.ocs === 2 && ls > 0) { S.ocs = 0; S.msg = "✓ Szabályos rajt – irány az 1. bója"; S.msgT = 5; horn(.3, .1); } }
    /* bójakerülés: a bója 26 m-es körén belül; a bója bal kéz felől maradjon (a hajó a bója jobbján halad el) */
    if (S.st === "race" && !S.fin && !S.ocs) {
      if (S.next < S.marks.length) { const m = S.marks[S.next], d = Math.hypot(m.x - S.x, m.z - S.z);
        /* a bóját bal kéz felől (a hajó bal oldalán) kell hagyni: a bója a hajó bal oldalára essen, amikor elhaladunk mellette */
        if (d < 26) { const port = [fz, -fx], side2 = (m.x - S.x) * port[0] + (m.z - S.z) * port[1];
          if (side2 > -3) { S.next++; horn(.3, .1); S.msg = S.next < S.marks.length ? `✓ ${S.next}. bója – jöhet a ${S.next + 1}.` : "✓ Utolsó bója – irány a befutó!"; S.msgT = 4; S.wrongT = 0; }
          else if (!S.wrongT || W.t - S.wrongT > 6) { S.wrongT = W.t; S.msg = "⚠ Rossz oldal! A bóját BAL kéz felől kerüld – fordulj vissza és menj el mellette jobbról"; S.msgT = 5; beep(); } } }
      else if (crossLine(S)) { S.fin = S.t; S.res.push({ n: "Zephyr (te)", t: S.t, me: true }); horn(1.2, .2); S.msg = "BEFUTÓ!"; S.msgT = 6; }
    }
    S.prevSide = lineSide(S);
    /* ellenfelek: a regatta mesterséges intelligenciája (cirkálás laylinig, hátszélben jibbelés), bóják bal kéz felől */
    S.riv.forEach((r) => vrRivalTick(r, dt));
    if (S.st === "race" && S.res.length === S.riv.length + 1 && !S.doneT) { S.doneT = S.t; vrFinish(); }
    /* ha az ellenfelek már rég beértek (5 perce – kezdőknek is legyen idejük), a futam véget ér – feladtad (DNF) */
    if (S.st === "race" && !S.fin && !S.doneT && S.riv.every((r) => r.fin) && S.t - Math.max(...S.riv.map((r) => r.fin)) > 300) { S.doneT = S.t; S.dnf = true; S.res.push({ n: "Zephyr (te)", t: S.t, me: true, dnf: true }); vrFinish(); }
    S.msgT = Math.max(0, (S.msgT || 0) - dt);
    /* a következő bója jelzése */
    const tgt = S.ocs === 1 ? { x: (C.line.a.x + C.line.b.x) / 2 - C.u[0] * 30, z: (C.line.a.z + C.line.b.z) / 2 - C.u[1] * 30 } : S.next < S.marks.length ? S.marks[S.next] : { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 };
    S.arrow.visible = !S.fin && S.next < S.marks.length; S.arrow.position.set(tgt.x, .25, tgt.z); S.arrow.children.forEach((m) => { m.material.opacity = .5 + .3 * Math.sin(W.t * 3); });
    S.beam.position.set(tgt.x, 30, tgt.z); S.beam.visible = !S.fin && Math.hypot(tgt.x - S.x, tgt.z - S.z) > 35;   /* közel már a vízen lévő nyíl mutat */ S.beamLbl.visible = !S.fin; S.beamLbl.position.set(tgt.x, 14 + Math.sin(W.t * 1.5) * .4, tgt.z);
    { const dl = Math.hypot(tgt.x - S.x, tgt.z - S.z), kk = clamp(dl * .06, 5, 18); S.lblAr = S.lblAr || S.beamLbl.scale.y / S.beamLbl.scale.x; S.beamLbl.scale.set(kk, kk * S.lblAr, 1); S.beamLbl.position.y = 6 + kk * .6; }
    S.beamLbl.userData.set(S.ocs === 1 ? ["KORAI RAJT", "vissza a rajtvonal mögé"] : S.ocs === 2 ? ["RENDBEN", "most lépd át újra a vonalat"] : S.next < S.marks.length ? [`${S.next + 1}. bója`, `${Math.round(Math.hypot(tgt.x - S.x, tgt.z - S.z))} m · bal kéz felől kerüld`] : ["BEFUTÓ", "a rajtvonalon át"]);
    { const fl = S.cb.userData.flags; if (fl) { fl[0].visible = S.st === "pre" && S.t > -30 && S.t < -5; fl[2].visible = S.st !== "done"; if (fl[3]) fl[3].visible = !!S.ocs; }
      S.cdL.visible = S.st === "pre" || (S.st === "race" && S.t < 4); S.cdL.position.set(S.cb.position.x, 13 + Math.sin(W.t * 2) * .2, S.cb.position.z); S.cdL.userData.set(S.st === "pre" ? ["RAJT", mmss(S.t)] : ["RAJT!", "jó versenyt!"]); }
    S.lineM.material.opacity = S.st === "pre" || S.next >= S.marks.length ? .5 + .2 * Math.sin(W.t * 3) : .15;
    /* hangok */
    AU.set("rush", clamp((S.v - 1) / 5, 0, 1) * .06, .4); AU.set("wind", clamp(aws / (16 * KN), 0, 1) * .045, .6); AU.set("water", .035, 1);
    S.instT = (S.instT || 0) - dt; S.awa = awa; S.aws = aws; S.twa = twa; S.tgt = tgt;
    if (S.instT <= 0) { S.instT = .3; vrInstruments(); }
    W.panelDirty = (W.panelDirty || 0) + dt;
  }
  function lineSide(o) { const C = VRR.C; return (o.x - C.line.a.x) * C.u[0] + (o.z - C.line.a.z) * C.u[1]; }
  function crossLine(o) {   /* a rajtvonal átlépése szél felőli irányból szél alá (befutó), a vonal két vége között */
    const C = VRR.C, s = lineSide(o), was = o === VRR ? VRR.prevSide : o.prevSide;
    const along = (o.x - C.line.a.x) * C.c[0] + (o.z - C.line.a.z) * C.c[1], L = Math.hypot(C.line.b.x - C.line.a.x, C.line.b.z - C.line.a.z);
    return was != null && was > 0 && s <= 0 && along > -8 && along < L + 8;
  }
  function beep() { const a = T.ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = "square"; o.frequency.value = 880; g.gain.setValueAtTime(.06, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .18); o.connect(g).connect(T.outBus()); o.start(); o.stop(a.currentTime + .2); }
  function vrRivalTick(r, dt) {
    const S = VRR, C = S.C;
    let tx, tz; const fin = r.next >= S.marks.length;
    if (S.st === "pre") { const back = 20 + r.i * 6 - Math.max(0, S.t + 12) * 1.6; tx = -C.u[0] * back + C.c[0] * (-15 + r.i * 15); tz = -C.u[1] * back + C.c[1] * (-15 + r.i * 15); }
    else if (!fin) { const m = S.marks[r.next], prev = r.next ? S.marks[r.next - 1] : { x: 0, z: 0 }; const dx = m.x - prev.x, dz = m.z - prev.z, L = Math.hypot(dx, dz) || 1; tx = m.x + (-dz / L) * -12; tz = m.z + (dx / L) * -12; }   /* a bója jobbján (bal kéz felől hagyva) */
    else { tx = (C.line.a.x + C.line.b.x) / 2; tz = (C.line.a.z + C.line.b.z) / 2; tx -= C.u[0] * 15; tz -= C.u[1] * 15; }
    if (r.fin) { tx = r.x + vfwd(r.b)[0] * 50; tz = r.z + vfwd(r.b)[1] * 50; }
    const brgW = Math.atan2(tx - r.x, -(tz - r.z));
    let want = brgW;
    const rel = wrapA(brgW - S.wf);
    const cross = (r.x * C.c[0] + r.z * C.c[1]);
    if (Math.abs(rel) < 44 * D2R) { want = S.wf + r.tack * 44 * D2R;
      if (W.t - r.lastTack > 10 && ((r.tack > 0 && rel <= -40 * D2R) || (r.tack < 0 && rel >= 40 * D2R) || (Math.abs(cross) > 170 && Math.sign(cross) === r.tack))) { r.tack = -r.tack; r.lastTack = W.t; want = S.wf + r.tack * 44 * D2R; } }
    else if (Math.abs(rel) > 155 * D2R && S.st === "race") { want = S.wf + Math.PI - r.tack * 25 * D2R; const relD = wrapA(brgW - S.wf - Math.PI);
      if (W.t - r.lastTack > 14 && ((r.tack > 0 && relD >= 22 * D2R) || (r.tack < 0 && relD <= -22 * D2R))) { r.tack = -r.tack; r.lastTack = W.t; } }
    /* ütközés elkerülése (a saját hajónkkal és egymással) */
    [S].concat(S.riv).forEach((o) => { if (o === r) return; const dx = o.x - r.x, dz = o.z - r.z, d = Math.hypot(dx, dz); if (d < 22) want += (wrapA(Math.atan2(dx, -dz) - r.b) > 0 ? -1 : 1) * .45 * (1 - d / 22); });
    /* a kitérés se fordítsa a hajót a szélbe (holtszög): legalább 40°-kal a szél mellett maradjon */
    { const relW = wrapA(want - S.wf); if (Math.abs(relW) < 40 * D2R) want = S.wf + (relW === 0 ? r.tack : Math.sign(relW)) * 40 * D2R; }
    /* egymásba se csússzanak: fizikai szétválasztás */
    S.riv.forEach((o) => { if (o === r) return; const dx = r.x - o.x, dz = r.z - o.z, d = Math.hypot(dx, dz); if (d < 9 && d > .01) { const k = (9 - d) / 2; r.x += dx / d * k; r.z += dz / d * k; o.x -= dx / d * k; o.z -= dz / d * k; } });
    r.b += clamp(wrapA(want - r.b), -.42 * dt, .42 * dt);
    const twa = Math.abs(wrapA(S.wf - r.b)) * R2D, spin = twa > 105 && S.st === "race";
    const vt = polar(twa, spin) * KN * VR_SPD * r.skill * (S.st === "pre" ? .6 : 1) * (S.tws / (12 * KN)) ** .5 * (r.fin ? .4 : 1);
    r.v += (vt - r.v) * Math.min(1, dt / 3.5);
    const f = vfwd(r.b); r.x += f[0] * r.v * dt; r.z += f[1] * r.v * dt;
    if (S.st === "race" && !r.fin) { if (!fin && Math.hypot(S.marks[r.next].x - r.x, S.marks[r.next].z - r.z) < 26) r.next++; else if (fin && crossLine(r)) { r.fin = S.t; S.res.push({ n: r.o.name, t: S.t }); horn(.4, .06); } }
    r.prevSide = lineSide(r);
    /* ütközés a saját hajónkkal: szétlöki a két hajót, mindkettő lelassul, koppanás és kiabálás helyett kürt */
    { const dx = r.x - S.x, dz = r.z - S.z, d = Math.hypot(dx, dz); if (d < 7.5 && d > .01) { const k = (7.5 - d) / 2; r.x += dx / d * k; r.z += dz / d * k; S.x -= dx / d * k; S.z -= dz / d * k;
      if (!r.bumpT || W.t - r.bumpT > 3) { r.bumpT = W.t; r.v *= .6; S.v *= .6; try { const a2 = T.ac(); if (a2) { const s2 = a2.createBufferSource(); s2.buffer = T.noiseBuf(.6); const f2 = a2.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 220; const g2 = a2.createGain(); g2.gain.setValueAtTime(.35, a2.currentTime); g2.gain.exponentialRampToValueAtTime(.001, a2.currentTime + .6); s2.connect(f2).connect(g2).connect(T.outBus()); s2.start(); } } catch (e) {} S.msg = "Koccanás a(z) " + r.o.name + " hajóval!"; S.msgT = 3; } } }
    /* megjelenítés */
    r.g.position.set(r.x, Math.sin(W.t * 1.5 + r.ph) * .06, r.z); r.g.rotation.y = Math.atan2(f[0], f[1]);
    const OS = r.g.userData.S, wfv = vfwd(S.wf), yaw = r.g.rotation.y, Xv = [Math.cos(yaw), -Math.sin(yaw)];
    OS.side = (wfv[0] * Xv[0] + wfv[1] * Xv[1]) > 0 ? -1 : 1; OS.boom = clamp((twa - 28) * .78, 7, 82) * D2R * OS.side; OS.jib = clamp((twa - 28) * .55, 8, 52) * D2R; OS.luff = clamp(1 - (twa - 18) / 18, 0, 1);
    OS.spin += ((spin ? 1 : 0) - OS.spin) * Math.min(1, dt * .35);
    { const tw2 = [wfv[0] * S.tws * (S.gk || 1), wfv[1] * S.tws * (S.gk || 1)], aw2 = [tw2[0] + f[0] * r.v / VR_SPD, tw2[1] + f[1] * r.v / VR_SPD], aws2 = Math.hypot(aw2[0], aw2[1]), awa2 = Math.acos(clamp((aw2[0] * f[0] + aw2[1] * f[1]) / (aws2 || 1), -1, 1)) * R2D;
      r.heel = (r.heel || 0) + (heelEq(awa2, aws2) * (1 - OS.spin * .75 * clamp((awa2 - 75) / 55, 0, 1)) * (1 + OS.spin * .5 * clamp(1 - (awa2 - 75) / 45, 0, 1)) - (r.heel || 0)) * Math.min(1, dt * 1.2); OS.heel = -OS.side * r.heel + (OS.spin > .5 ? Math.sin(W.t * 1.2 + r.ph) * .05 : 0); } OS.pitch = Math.sin(W.t * 1.2 + r.ph) * .025;
    const d2 = Math.hypot(r.x - S.x, r.z - S.z); r.g.userData.update(dt);   /* minden képkockán, távol is (ne „ugráljon” a vitorla) */
    r.wk.push(r.x, r.z, r.g.rotation.y, r.v, dt, .05);
    /* névtábla a hajó fölött (helyezéssel), 25–220 m között látszik */
    r.lbl.visible = d2 > 25 && d2 < 220; if (r.lbl.visible) { r.lbl.position.set(r.x, 22 + Math.sin(W.t + r.i) * .3, r.z); const k = clamp(d2 * .03, 2.5, 7); r.lbl.scale.set(k, k * .32, 1); r.lbl.userData.set([r.o.name, r.fin ? `befutott: ${S.res.findIndex((q) => q.n === r.o.name) + 1}.` : `${Math.round(d2)} m · ${r.next < S.marks.length ? (r.next + 1) + '. bója felé' : 'a befutó felé'}`]); }
  }
  function vrFinish() {
    const S = VRR, me = S.res.findIndex((q) => q.me);
    const best = S.best[S.lvl]; if (me >= 0 && !S.dnf && (!best || S.res[me].t < best)) { S.best[S.lvl] = S.res[me].t; try { localStorage.setItem("zephyr-vr-verseny", JSON.stringify(S.best)); } catch (e) {} }
    S.st = "done"; S.msg = S.dnf ? "Nem értél be – próbáld újra!" : me === 0 ? "🏆 GYŐZELEM!" : `${me + 1}. hely`; S.msgT = 999; W.panelDirty = 1;
    /* eredménytábla a kormány fölött, előtted */
    S.podium.userData.set([S.dnf ? "Nem értél be" : me === 0 ? "🏆 GYŐZELEM!" : `${me + 1}. hely`].concat(S.res.map((q, i) => `${i + 1}. ${q.n} – ${q.dnf ? "nem ért be" : mmss(q.t)}`))); S.podium.visible = true;
    { const c = T.camObj(), hw = new THREE.Vector3(), q = new THREE.Quaternion(); c.getWorldPosition(hw); c.getWorldQuaternion(q); const fw = new THREE.Vector3(0, 0, -1).applyQuaternion(q); fw.y = 0; if (fw.lengthSq() < 1e-4) fw.set(0, 0, -1); fw.normalize();
      const p = hw.clone().addScaledVector(fw, 2.6); p.y = hw.y + .1; W.root.updateMatrixWorld(true); S.podium.position.copy(W.root.worldToLocal(p)); }
    if (me === 0) { [0, 400, 800].forEach((d) => setTimeout(() => horn(.35, .12), d)); }
  }
  const mmss = (t) => { const s = Math.max(0, Math.abs(t)); return `${t < 0 ? "−" : ""}${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };
  function vrPlace() { const S = VRR; const prog = (o) => (o.fin ? 1e6 - o.fin : 0) + (o.next || 0) * 1e4 - Math.hypot((o === S ? S.tgt : null) ? S.tgt.x - o.x : 0, (o === S && S.tgt) ? S.tgt.z - o.z : 0); const all = [S].concat(S.riv).map((o) => [o, prog(o)]).sort((a, b) => b[1] - a[1]); return all.findIndex((q) => q[0] === S) + 1; }
  /* műszerek: a talapzati kijelzők (sebesség, szél, bója iránya) és az árbóckijelző (idő, helyezés) */
  /* ideális útvonal egy szakaszon: szél ellen / hátszélben két csapásban (halzon a laylinig, majd fordulás / jibbelés), különben egyenesen */
  function vrLegPath(A, B, wf) {
    const brg = Math.atan2(B.x - A.x, -(B.z - A.z)), rel = Math.abs(wrapA(brg - (wf + Math.PI)));   /* a széllel szembeni irány: wf+π (a szél „felől” jön) */
    const up = Math.abs(wrapA(brg - wf - Math.PI)) > Math.PI - 40 * D2R ? false : false;
    const toWind = Math.abs(wrapA(brg - wf)) < 42 * D2R, downW = Math.abs(wrapA(brg - wf - Math.PI)) < 28 * D2R;
    if (!toWind && !downW) return [A, B];
    const off = toWind ? 45 * D2R : (180 - 150) * D2R, base = toWind ? wf : wf + Math.PI;
    const d1 = [Math.sin(base + off), -Math.cos(base + off)], d2 = [Math.sin(base - off), -Math.cos(base - off)];
    const solve = (u, v) => { const bx = B.x - A.x, bz = B.z - A.z, det = u[0] * v[1] - u[1] * v[0]; if (Math.abs(det) < 1e-6) return null; const t1 = (bx * v[1] - bz * v[0]) / det, t2 = (u[0] * bz - u[1] * bx) / det; return t1 > 0 && t2 > 0 ? { x: A.x + u[0] * t1, z: A.z + u[1] * t1 } : null; };
    const P = solve(d1, d2) || solve(d2, d1); return P ? [A, P, B] : [A, B];
  }
  function vrChart() {
    const S = VRR, t = S.ck.chartT; if (!t) return; const g = t._canvas.getContext("2d"), W2 = 1024, C = S.C;
    S.trail = S.trail || []; const lt = S.trail[S.trail.length - 1]; if (!lt || Math.hypot(lt.x - S.x, lt.z - S.z) > 6) { S.trail.push({ x: S.x, z: S.z }); if (S.trail.length > 400) S.trail.shift(); }
    /* háttér: tengerkék, finom rács, keret */
    const bg = g.createLinearGradient(0, 0, 0, W2); bg.addColorStop(0, "#0d3150"); bg.addColorStop(1, "#071c30"); g.fillStyle = bg; g.fillRect(0, 0, W2, W2);
    const cx = W2 / 2, cy = W2 * .56;
    const lineMid = { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 };
    const pts = S.marks.concat([C.line.a, C.line.b, { x: S.x, z: S.z }]); let span = 80; pts.forEach((q) => { span = Math.max(span, Math.hypot(q.x - S.x, q.z - S.z)); }); const k = (W2 * .42) / span;
    const c0 = Math.cos(-S.b), s0 = Math.sin(-S.b);
    const P = (x, z) => { const dx = x - S.x, dz = z - S.z; return [cx + (dx * c0 - dz * s0) * k, cy + (dx * s0 + dz * c0) * k]; };
    g.strokeStyle = "rgba(127,211,255,.08)"; g.lineWidth = 2; for (let i = -10; i <= 10; i++) { const a1 = P(S.x + i * 100, S.z - 2000), a2 = P(S.x + i * 100, S.z + 2000), b1 = P(S.x - 2000, S.z + i * 100), b2 = P(S.x + 2000, S.z + i * 100); g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(a2[0], a2[1]); g.moveTo(b1[0], b1[1]); g.lineTo(b2[0], b2[1]); g.stroke(); }
    /* ideális útvonal: rajttól a bójákon át a befutóig (megtett szakasz halványabb) */
    const way = [lineMid].concat(S.marks.map((m) => ({ x: m.x, z: m.z })), [lineMid]);
    for (let i = 0; i < way.length - 1; i++) {
      const path = vrLegPath(way[i], way[i + 1], S.wf), done = i < S.next, cur = i === S.next;
      g.setLineDash(cur ? [] : [22, 16]); g.lineWidth = cur ? 10 : 6; g.strokeStyle = done ? "rgba(160,180,200,.3)" : cur ? "#ffd166" : "rgba(255,209,102,.6)";
      g.beginPath(); path.forEach((q, j) => { const [x, y] = P(q.x, q.z); j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]);
      /* szakasz felirat a közepén */
      const mid = path[Math.floor(path.length / 2)], mm = P((path[0].x + path[path.length - 1].x) / 2, (path[0].z + path[path.length - 1].z) / 2);
      const kind = path.length === 3 ? (Math.abs(wrapA(Math.atan2(way[i + 1].x - way[i].x, -(way[i + 1].z - way[i].z)) - S.wf)) < 50 * D2R ? "cirkálás" : "hátszél") : "egyenesen";
      if (!done) { g.font = "700 30px system-ui"; g.textAlign = "center"; const lbl = `${i + 1}. szakasz · ${kind}`; const tw = g.measureText(lbl).width + 24; g.fillStyle = "rgba(6,20,36,.75)"; g.fillRect(mm[0] - tw / 2, mm[1] - 22 + 40, tw, 40); g.fillStyle = cur ? "#ffd166" : "#cfe3f2"; g.fillText(lbl, mm[0], mm[1] + 50); }
    }
    /* rajt- és célvonal (sakktábla-mintás) */
    { const a = P(C.line.a.x, C.line.a.z), b = P(C.line.b.x, C.line.b.z); const n = 12; for (let i = 0; i < n; i++) { g.strokeStyle = i % 2 ? "#ffffff" : "#14202a"; g.lineWidth = 9; g.beginPath(); g.moveTo(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n); g.lineTo(a[0] + (b[0] - a[0]) * (i + 1) / n, a[1] + (b[1] - a[1]) * (i + 1) / n); g.stroke(); }
      g.fillStyle = "#ffffff"; g.font = "700 26px system-ui"; g.textAlign = "center"; g.fillText(S.next >= S.marks.length ? "CÉL" : "RAJT / CÉL", (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 18); }
    /* bóják: számozva, a kerülési irány íves nyíllal (bal kéz felől = az óramutatóval ellentétesen) */
    S.marks.forEach((m, i) => { const [x, y] = P(m.x, m.z), cur = i === S.next, done = i < S.next, r = cur ? 34 : 26;
      if (!done) { g.strokeStyle = cur ? "#ffd166" : "rgba(255,209,102,.7)"; g.lineWidth = cur ? 7 : 5; const rr2 = r + 30; g.beginPath(); g.arc(x, y, rr2, -.2, -2.9, true); g.stroke();
        const ea = -2.9, ex = x + Math.cos(ea) * rr2, ey = y + Math.sin(ea) * rr2; g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(ex - 14, ey - 4); g.lineTo(ex + 6, ey - 16); g.lineTo(ex + 8, ey + 10); g.closePath(); g.fill(); }
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = done ? "#4a5a68" : cur ? "#ffb703" : "#ff7a00"; g.fill(); g.lineWidth = 4; g.strokeStyle = "#fff"; g.stroke();
      g.fillStyle = "#0b1b2a"; g.font = `900 ${cur ? 40 : 32}px system-ui`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(i + 1), x, y + 2); g.textBaseline = "alphabetic"; });
    /* nyomvonal és a hajók */
    if (S.trail.length > 1) { g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 4; g.beginPath(); S.trail.forEach((q, j) => { const [x, y] = P(q.x, q.z); j ? g.lineTo(x, y) : g.moveTo(x, y); }); const [x0, y0] = P(S.x, S.z); g.lineTo(x0, y0); g.stroke(); }
    S.riv.forEach((r) => { const [x, y] = P(r.x, r.z); g.save(); g.translate(x, y); g.rotate(r.b - S.b); g.fillStyle = "#e9f6ff"; g.beginPath(); g.moveTo(0, -18); g.lineTo(10, 12); g.lineTo(-10, 12); g.closePath(); g.fill(); g.restore(); g.fillStyle = "#cfe3f2"; g.font = "600 22px system-ui"; g.textAlign = "left"; g.fillText(r.o.name.split(" ")[0], x + 14, y + 6); });
    g.save(); g.translate(cx, cy); g.fillStyle = "#ff4b3a"; g.strokeStyle = "#fff"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -30); g.lineTo(18, 22); g.lineTo(0, 12); g.lineTo(-18, 22); g.closePath(); g.fill(); g.stroke(); g.restore();
    /* szélirány (a térkép bal felső sarkában) és fejléc */
    { const wx = 90, wy = 120, a = S.wf - S.b; g.fillStyle = "rgba(6,20,36,.8)"; g.beginPath(); g.arc(wx, wy, 62, 0, TAU); g.fill(); g.save(); g.translate(wx, wy); g.rotate(a + Math.PI); g.fillStyle = "#7fd3ff"; g.beginPath(); g.moveTo(0, -46); g.lineTo(16, 10); g.lineTo(0, 0); g.lineTo(-16, 10); g.closePath(); g.fill(); g.restore(); g.fillStyle = "#cfe3f2"; g.font = "700 22px system-ui"; g.textAlign = "center"; g.fillText("SZÉL", wx, wy + 86); }
    g.fillStyle = "rgba(6,20,36,.85)"; g.fillRect(0, 0, W2, 64); g.fillStyle = "#ffd166"; g.font = "800 38px system-ui"; g.textAlign = "center";
    const tg = S.tgt || lineMid; g.fillText(S.ocs === 1 ? "KORAI RAJT – vissza a vonal mögé" : S.next < S.marks.length ? `→ ${S.next + 1}. bója · ${Math.round(Math.hypot(tg.x - S.x, tg.z - S.z))} m · bal kéz felől` : `→ CÉL · ${Math.round(Math.hypot(lineMid.x - S.x, lineMid.z - S.z))} m`, W2 / 2, 46);
    g.strokeStyle = "#ffd166"; g.lineWidth = 6; g.strokeRect(3, 3, W2 - 6, W2 - 6);
    t.needsUpdate = true;
  }
  function vrInstruments() {
    const S = VRR, t = S.ck.instT, g = t._canvas.getContext("2d"), w = 512;
    g.fillStyle = "#06090d"; g.fillRect(0, 0, w, w);
    const tgt = S.tgt || { x: 0, z: 0 }, brg = Math.atan2(tgt.x - S.x, -(tgt.z - S.z)), rel = wrapA(brg - S.b), dist = Math.hypot(tgt.x - S.x, tgt.z - S.z);
    g.fillStyle = "#7fd3ff"; g.font = "700 34px system-ui"; g.textAlign = "center"; g.fillText(S.next < S.marks.length ? `${S.next + 1}. BÓJA` : "BEFUTÓ", w / 2, 50);
    g.save(); g.translate(w / 2, 210); g.rotate(rel); g.fillStyle = "#ffd166"; g.beginPath(); g.moveTo(0, -110); g.lineTo(52, -20); g.lineTo(18, -20); g.lineTo(18, 70); g.lineTo(-18, 70); g.lineTo(-18, -20); g.lineTo(-52, -20); g.closePath(); g.fill(); g.restore();
    g.fillStyle = "#e9f6ff"; g.font = "800 64px system-ui"; g.fillText(`${Math.round(dist)} m`, w / 2, 360);
    g.fillStyle = "#7fd3ff"; g.font = "600 30px system-ui"; g.fillText(`${(S.v / KN).toFixed(1)} csomó · szél ${Math.round(S.awa)}°`, w / 2, 420);
    g.fillStyle = S.twa < 38 ? "#ff6a5a" : "#9fe0a0"; g.fillText(S.twa < 38 ? "TÚL KÖZEL A SZÉLHEZ – esd le!" : S.twa > 150 ? "hátszél" : S.twa > 110 ? "bővszél" : S.twa > 60 ? "félszél" : "cirkálás", w / 2, 470);
    /* kis pályatérkép a jobb felső sarokban: bóják, rajtvonal, a hajók (te: piros), orr felé forgatva */
    { const cx = 420, cy = 95, R2 = 80; g.save(); g.beginPath(); g.arc(cx, cy, R2, 0, TAU); g.fillStyle = "#0c1622"; g.fill(); g.strokeStyle = "#2a4256"; g.lineWidth = 3; g.stroke(); g.clip();
      const pts = S.marks.concat([S.C.line.a, S.C.line.b]); let span = 60; pts.forEach((q) => { span = Math.max(span, Math.hypot(q.x - S.x, q.z - S.z)); }); const k = (R2 - 10) / Math.min(span, 420);
      const P2 = (x, z) => { const dx = x - S.x, dz = z - S.z, c = Math.cos(-S.b), s2 = Math.sin(-S.b); return [cx + (dx * c - dz * s2) * k, cy + (dx * s2 + dz * c) * k]; };
      const la = P2(S.C.line.a.x, S.C.line.a.z), lb = P2(S.C.line.b.x, S.C.line.b.z); g.strokeStyle = "#ffd166"; g.lineWidth = 2; g.beginPath(); g.moveTo(la[0], la[1]); g.lineTo(lb[0], lb[1]); g.stroke();
      S.marks.forEach((q, i) => { const [x, y] = P2(q.x, q.z); g.fillStyle = i === S.next ? "#ffd166" : i < S.next ? "#5a6a78" : "#ff7a00"; g.beginPath(); g.arc(x, y, i === S.next ? 7 : 5, 0, TAU); g.fill(); });
      S.riv.forEach((r) => { const [x, y] = P2(r.x, r.z); g.fillStyle = "#e9f6ff"; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); });
      g.fillStyle = "#ff5a4a"; g.beginPath(); g.moveTo(cx, cy - 9); g.lineTo(cx + 6, cy + 6); g.lineTo(cx - 6, cy + 6); g.closePath(); g.fill(); g.restore(); }
    t.needsUpdate = true;
    vrChart();
    const m = S.mastT, g2 = m._canvas.getContext("2d"); g2.fillStyle = "#06090d"; g2.fillRect(0, 0, 1024, 256);
    const cell = (x, lbl, val) => { g2.fillStyle = "#7fd3ff"; g2.font = "600 30px system-ui"; g2.textAlign = "center"; g2.fillText(lbl, x + 170, 52); g2.fillStyle = "#e9f6ff"; g2.font = "800 110px system-ui"; g2.fillText(val, x + 170, 180); };
    cell(0, S.st === "pre" ? "RAJTIG" : "IDŐ", mmss(S.t)); cell(341, "HELY", S.st === "pre" ? "–" : `${S.fin ? S.res.findIndex((q) => q.me) + 1 : vrPlace()}/4`); cell(682, "SEBESSÉG", (S.v / KN).toFixed(1));
    m.needsUpdate = true;
  }
  /* --------------------------------------------------------------- panel, csuklómenü, 2D */
  function vrPanel(P) {
    const S = VRR;
    P.title(`Vitorlásverseny · ${S.lvl}. futam · ${S.C.name}`, `${S.st === "pre" ? "Rajt: " + mmss(-S.t) : S.st === "done" ? "Vége" : "Idő: " + mmss(S.t)} · ${(S.v / KN).toFixed(1)} csomó · szél ${(S.tws / KN).toFixed(0)} csomó`);
    P.row(0, S.msgT > 0 ? S.msg : "Fogd meg a kormánykereket (csippentés), és forgasd: jobbra = jobbra fordul.", "#ffd166");
    P.row(1, S.ocs ? "KORAI RAJT – menj vissza a rajtvonal mögé, aztán lépd át újra" : S.st === "pre" ? "Rajt előtt maradj a vonal mögött – a rajtjelre (hosszú kürt) lépd át" : S.next < S.marks.length ? `Következő: ${S.next + 1}. bója (${S.marks.length} van) – bal kéz felől kerüld` : "Utolsó szakasz: át a rajtvonalon!", "#ffffff");
    P.row(2, S.st === "done" ? S.res.map((q, i) => `${i + 1}. ${q.n} ${mmss(q.t)}`).join(" · ") : "A sárga fényoszlop mutatja a következő bóját.", "#7fd3ff");
    P.row(3, S.best[S.lvl] ? `Legjobb időd ezen a pályán: ${mmss(S.best[S.lvl])}` : "Szél ellen nem lehet menni: cikcakkban (cirkálva) haladj!", "#c9a24a");
    if (S.st === "done") P.buttons([["↻ Újra", () => vrSetup(S.lvl)], ["Tovább ▸ " + (S.lvl + 1) + ". futam", () => vrSetup(S.lvl + 1)], ["‹ Vissza a sétához", () => W.close()]]);
    else P.buttons([["Egyenesbe", () => { S.wa = 0; }], ["↻ Újrakezdés", () => vrSetup(S.lvl)], [S.seated ? "🧍 Álló mód" : "🪑 Ülő mód", () => vrSeat()], ["‹ Vissza", () => W.close()]]);
  }
  function vrSeat() { VRR.seated = !VRR.seated; try { localStorage.setItem("zephyr-vr-ules", VRR.seated ? "1" : "0"); } catch (e) {} W.root.position.y = VRR.baseY - (VRR.seated && T.inVR ? .45 : 0); W.panelDirty = 1; }
  function vrWrist() {
    const S = VRR;
    return [["🪑", S.seated ? "Álló mód" : "Ülő mód", () => vrSeat()], ["↻", "Futam újra", () => vrSetup(S.lvl)], ["▸", "Következő futam", () => vrSetup(S.lvl + 1)], ["◂", "Előző futam", () => vrSetup(Math.max(1, S.lvl - 1))], ["⎈", "Kormány egyenesbe", () => { S.wa = 0; }],
      ["☰", "Nagy panel", () => W.togglePanel()], ["‹", "A sétához", () => W.close()]];
  }
  function vrHud(H) {
    const S = VRR;
    H.title(`Vitorlásverseny · ${S.lvl}. futam · ${S.C.name}`, `${S.msgT > 0 ? S.msg + " · " : ""}${S.st === "pre" ? "rajt " + mmss(-S.t) : "idő " + mmss(S.t)} · ${(S.v / KN).toFixed(1)} csomó · ${S.next < S.marks.length ? (S.next + 1) + ". bója" : "befutó"}`);
    if (S.st === "done") H.steer([["↻ Újra", () => vrSetup(S.lvl)], ["Tovább ▸", () => vrSetup(S.lvl + 1)]], () => { S.wa = 0; });
    else H.steer([["↻ Újrakezdés", () => vrSetup(S.lvl)]], () => { S.wa = 0; });
    H.hint("Kormány: ◀ ▶ gomb vagy ← → (A / D) · a sárga fényoszlop a következő bója · bal kéz felől kerüld");
  }
