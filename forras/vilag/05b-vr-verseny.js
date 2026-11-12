
  /* =================================================================== 2/B. VITORLÁSVERSENY A HAJÓBAN ÁLLVA (VR) – 2026. nov. 6., a tulajdonos kérésére
     A stégjátékok „Vitorlás-regatta” játéka életnagyságban: TE vezeted a nagy, 15 méteres versenyjacht „Zephyr”-t, három ellenfél ellen.
     • Csak a kormánykereket kell kezelni (a vitorlákat a legénység trimmeli): fogd meg a kerék peremét (csippentés vagy ravasz), és forgasd,
       mint egy igazi hajókormányt – jobbra forgatva a hajó jobbra fordul. 2D-ben: ◀ ▶ gomb vagy ← → / A D billentyű.
     • A hajó: modern versenyjacht (TP52-szerű) – lapos tíkfedélzet, két nagy karbon kormánykerék talapzaton, tetejükön iránytű és
       műszerkijelző, csörlők a peremen, főszkóta-sín (traveller) a kerekek előtt, korlátok, achterstag, a legénység a szél felőli oldalon.
     • A verseny: rajt a rendezőhajó és a bója közötti vonalon (visszaszámlálás, kürtszó), a bójákat bal kéz felől kell kerülni,
       a befutó ugyanaz a vonal. Minden futam más pályát és szelet hoz (a stégjáték pályasablonjai szerint); a szintek egyre gyorsabb ellenfeleket adnak.
     Tó-koordináták mint a vitorlázásnál: x = kelet, z = dél (É = −z); irányszög b: 0 = É, + = óramutató szerint; fwd(b) = (sin b, −cos b). */
  const VRR = {}; W._race = VRR; W._makeBoat = (o) => makeBoat(o); W._raceTick = (dt) => vrTick(dt);   /* teszteléshez */
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
    /* 2026-11-12 08:18 (tulajdonos: „a hajótest szélétől befelé látok egy hibás csíkot, ahol a hajó átlátszik”): a tíkborítás 12 cm-rel a perem előtt véget ért,
       és a résen be lehetett látni a hajótestbe (a vízre). Tömör, fehér szegélyfedélzet zárja le a tík széle és a hajótest pereme között, a hajó teljes hosszában. */
    { const N = 48, pos = [], idx = []; [-1, 1].forEach((sd) => { const b0 = pos.length / 3; for (let i = 0; i <= N; i++) { const u = .002 + .996 * i / N, s = sh(u), y = s.y - .07 * VR_SC, xi = Math.max(0, s.hb - .34);
          pos.push(sd * xi, y + .004, s.z, sd * (s.hb + .01), y + .004, s.z); }
        for (let i = 0; i < N; i++) { const a = b0 + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
      const ge = new THREE.BufferGeometry(); ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setIndex(idx); ge.computeVertexNormals();
      const mm = std({ color: "#f1f1ec", roughness: .45, side: THREE.DoubleSide }); mesh(ge, mm, G).receiveShadow = true; }
    /* 2026-11-12 10:00 (tulajdonos, harmadszor: „ahol a versenyzők ülnek, a fenekük alatt vájat látszik a hajón, és alatta a víz – a hajó ott mintha ki lenne vágva”):
       a tíkborítás csak a hajó hátsó harmadát fedte, attól ELŐRE (a kajüt mellett, a legénység alatt és az orrfedélzeten) egyáltalán nem volt fedélzet – be lehetett látni
       a hajótestbe. Most teljes szélességű, domború, fehér csúszásgátló fedélzet zárja le a hajót a tík végétől az orrig. */
    { const N = 44, M = 12, pos = [], idx = []; for (let i = 0; i <= N; i++) { const u = .33 + (.998 - .33) * i / N, s = sh(u); for (let j = 0; j <= M; j++) { const f = j / M * 2 - 1; pos.push(f * (s.hb + .01), s.y - .07 * VR_SC + .07 * VR_SC * (1 - f * f) * .9 + .003, s.z); } }
      for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + 1, c = a + M + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const ge = new THREE.BufferGeometry(); ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setIndex(idx); ge.computeVertexNormals();
      mesh(ge, std({ color: "#eceee9", roughness: .85, side: THREE.DoubleSide }), G).receiveShadow = true; }
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
      /* 2026-11-12 08:29 (tulajdonos: „a fedélzeti computer kinézetre legyen a hajó része – ne odabiggyesztett kirajzolás, hanem úgy legyen megtervezve, mintha a hajóhoz
         tartozna”): beépített műszerkonzol – a kormányoszlop fejéből kinövő, öntött karbon nyak és merevítő, lekerekített ház, szatén keret, napellenző, gombsor,
         forgatógomb, állapot-LED, rozsdamentes kapaszkodókeret; a képernyő a keretbe süllyesztve ül. */
      if (sd < 0) { const pod = new THREE.Group(); ped.add(pod); pod.position.set(-.8 * sd, .84, -.3); pod.rotation.set(.9, Math.PI - .5 * sd, 0); pod.scale.setScalar(.8);
        /* 2026-11-12 08:36 (tulajdonos: „a műszer ne zavarja a kilátást – lefelé nézve inkább a hajótestet takarja, ne a horizontot; lehet kisebb is, ne a kellős közepén
           legyen, mint egy tévé”): a konzol alacsonyan (csípőmagasságban), a hajó középvonala felé, erősen felfelé döntve ül, 20%-kal kisebb – a horizont szabad. */
        const rrect = (w, h, r) => { const sp = new THREE.Shape(), x = -w / 2, y = -h / 2; sp.moveTo(x + r, y); sp.lineTo(x + w - r, y); sp.quadraticCurveTo(x + w, y, x + w, y + r); sp.lineTo(x + w, y + h - r); sp.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sp.lineTo(x + r, y + h); sp.quadraticCurveTo(x, y + h, x, y + h - r); sp.lineTo(x, y + r); sp.quadraticCurveTo(x, y, x + r, y); return sp; };
        const satin = std({ color: "#8d949b", roughness: .35, metalness: .85 }), rubber = std({ color: "#15181c", roughness: .9 });
        /* ház (hátrafelé vastagodó, lekerekített élekkel) */
        { const gh = new THREE.ExtrudeGeometry(rrect(.56, .54, .05), { depth: .075, bevelEnabled: true, bevelThickness: .014, bevelSize: .014, bevelSegments: 3, curveSegments: 8 }); W.disposables.push(gh); const h = mesh(gh, carbon, pod); h.position.set(0, -.035, -.092); }
        /* szatén keret a képernyő körül (lyukas lap) */
        { const sp = rrect(.52, .5, .035), ho = new THREE.Path(); ho.moveTo(-.228, -.203 + .035); ho.lineTo(.228, -.203 + .035); ho.lineTo(.228, .203 + .035); ho.lineTo(-.228, .203 + .035); ho.closePath(); sp.holes.push(ho);
          const gb = new THREE.ExtrudeGeometry(sp, { depth: .012, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 2 }); W.disposables.push(gb); const bz = mesh(gb, satin, pod); bz.position.set(0, -.035, .0); }
        /* a képernyő: a keretbe süllyesztve */
        const ch = mesh(new THREE.PlaneGeometry(.45, .4), basic({ map: chartT }), pod); ch.position.set(0, 0, .004);
        /* napellenző: felső ernyő és két oldalfal */
        { const hd = mesh(new THREE.BoxGeometry(.6, .018, .13), carbon, pod); hd.position.set(0, .245, .05); hd.rotation.x = .12;
          [-1, 1].forEach((q) => { const ck = mesh(new THREE.BoxGeometry(.016, .3, .1), carbon, pod); ck.position.set(q * .292, .09, .04); }); }
        /* gombsor, forgatógomb, LED a képernyő alatt */
        for (let q = 0; q < 6; q++) { const bt = mesh(new THREE.BoxGeometry(.045, .022, .012), rubber, pod); bt.position.set(-.2 + q * .058, -.243, .014); }
        { const kn = mesh(new THREE.CylinderGeometry(.024, .027, .026, 20), satin, pod); kn.rotation.x = Math.PI / 2; kn.position.set(.205, -.243, .022);
          const led = mesh(new THREE.SphereGeometry(.006, 8, 6), basic({ color: "#3dff7a" }), pod); led.position.set(.155, -.243, .016); led.userData.noBake = true; }
        /* rozsdamentes kapaszkodókeret a ház körül (alul-oldalt), ahogy a valódi kormányállásokon */
        { const pts = [[-.31, .12], [-.31, -.3], [-.26, -.34], [.26, -.34], [.31, -.3], [.31, .12]].map((q) => new THREE.Vector3(q[0], q[1], .03)); const gr = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", .2), 40, .011, 8, false); W.disposables.push(gr); mesh(gr, chrome, pod);
          [[-.31, .12], [.31, .12]].forEach((q) => { const st = mesh(new THREE.CylinderGeometry(.011, .011, .1, 8), chrome, pod); st.rotation.x = Math.PI / 2; st.position.set(q[0], q[1], -.02); }); }
        /* öntött karbon nyak a kormányoszlop fejéből a ház hátuljába + merevítő az oszlop derekáról, rozsdamentes gallérokkal */
        { pod.updateMatrix(); const back = new THREE.Vector3(0, -.06, -.1).applyMatrix4(pod.matrix), low = new THREE.Vector3(0, -.26, -.09).applyMatrix4(pod.matrix);
          const mT = new THREE.Group(); ped.add(mT);
          mesh(mergeGeoms([rodGeom(new THREE.Vector3(0, .9, -.02), back, .045, 14), rodGeom(new THREE.Vector3(0, .5, 0), low, .026, 10)]), carbon, mT);
          const c1 = mesh(new THREE.SphereGeometry(.062, 14, 10), carbon, mT); c1.position.copy(back); const c2 = mesh(new THREE.TorusGeometry(.082, .012, 8, 20), chrome, mT); c2.rotation.x = Math.PI / 2; c2.position.set(0, .5, 0);
          const c3 = mesh(new THREE.SphereGeometry(.036, 12, 8), carbon, mT); c3.position.copy(low);
          /* 2026-11-12 08:38 (tulajdonos: „a kormánykerekes változatnál a műszer a kormánykerék KÖZEPÉBEN legyen – ott nem takar; mindig fix: ha forgatom a kormányt, a műszer
             ne forduljon vele; legyen úgy megtervezve, mintha egy kis konzol tartaná”): kerékkel a ház az agy előtt ül, az álló tengelycsonkon (a kerék körülötte forog),
             a kormányos felé és kissé felfelé döntve; rozsdamentes gallér és tartókengyel fogja. Botkormánnyal: alacsony konzol a középvonal felé. */
          const mW = new THREE.Group(); ped.add(mW);
          { const st = mesh(new THREE.CylinderGeometry(.034, .04, .2, 16), carbon, mW); st.rotation.x = Math.PI / 2; st.position.set(0, .8, -.5);
            const col2 = mesh(new THREE.CylinderGeometry(.058, .058, .022, 20), chrome, mW); col2.rotation.x = Math.PI / 2; col2.position.set(0, .8, -.565);
            const hb = mesh(new THREE.CylinderGeometry(.135, .12, .03, 28), carbon, mW); hb.position.set(0, .815, -.585); hb.rotation.set(.55 - Math.PI / 2, 0, 0);
            const rg = mesh(new THREE.TorusGeometry(.128, .009, 8, 32), chrome, mW); rg.position.set(0, .815, -.6); rg.rotation.set(.55, 0, 0);
            const pst = mesh(new THREE.CylinderGeometry(.04, .05, .2, 14), carbon, mW); pst.position.set(0, 1.2, -.12); pst.rotation.x = -.35; }
          const rail = pod.children.filter((m) => m.material === chrome), hood = pod.children.filter((m) => m.geometry && m.geometry.type === "BoxGeometry" && m.material === carbon);
          /* 2026-11-12 09:55 (tulajdonos: „botkormánynál is cseréld fel a két műszert”): a térképplotter MINDIG a kormányoszlop tetején ül; a szélműszer botkormánynál az
             alacsony oldalkonzolon (kerek házban), keréknél a kerék közepében. */
          const dh = new THREE.Group(); ped.add(dh); dh.position.set(0, 1.07, -.185); dh.rotation.set(.2, Math.PI, 0); dh.scale.setScalar(.6);   /* 2026-11-12 10:02 (tulajdonos): botkormánynál a szélműszer KÖZVETLENÜL a térkép alatt ül, a kormányoszlop fejébe építve – nem oldalra kitolva */
          { const d1 = mesh(new THREE.CylinderGeometry(.215, .19, .05, 32), carbon, dh); d1.rotation.x = Math.PI / 2; d1.position.z = -.03; const r1 = mesh(new THREE.TorusGeometry(.2, .012, 8, 36), chrome, dh); r1.position.z = -.004; }
          { const pst2 = mesh(new THREE.CylinderGeometry(.04, .05, .2, 14), carbon, ped); pst2.position.set(0, 1.2, -.12); pst2.rotation.x = -.35; }
          G.userData.podSet = (til) => { mT.visible = false; dh.visible = !!til; mW.visible = !til; rail.forEach((m) => { m.visible = false; }); hood.forEach((m) => { m.visible = false; });
            pod.position.set(0, 1.35, -.2); pod.rotation.set(.3, Math.PI, 0); pod.scale.setScalar(.62);
            if (til) { scr.position.set(0, 1.07, -.185); scr.rotation.set(.2, Math.PI, 0); scr.scale.setScalar(.48); scr.translateZ(.002); } else { scr.position.set(0, .826, -.622); scr.rotation.set(.55, Math.PI, 0); scr.scale.setScalar(.56); } };
          G.userData.podSet(true); } }
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
      const grip = mesh(new THREE.TorusGeometry(WR, .034, 10, 72, TAU * .999), gripM, spin); grip.scale.set(1, 1, .85); grip.userData.noBake = true;   /* 2026-11-11: a markolat NEM süthető ki – a „fogom” jelzés (aranyló fény) az élő anyagán él; a kisütés eddig eltüntette */
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
      wheels.push({ sd, ped, wheel, spin, hit, gripM, WR, axle });
    });
    /* BOTKORMÁNY (2026-11-11, a tulajdonos: „a kormánykerékkel nem boldogulunk – térjünk át a botkormányra, kormánytoldóval, a testem előtt mozgatva; a kerék tűnjön el”):
       kormányrúd a tat közepén (a forgáspont a kormányos mögött), a végén csuklós toldó (hosszabbító), amelynek a markolatát a kéz fogja.
       A rúd a kéz helyéből számolódik (két kör metszése: rúdhossz a forgáspont körül, toldóhossz a kéz körül) – pont úgy mozog, mint az igazi.
       Ellentétes mozgás: a rudat balra húzod → a hajó jobbra fordul. Régi kerék vissza: localStorage „zephyr-kormany” = kerek. */
    /* 2026-11-11 18:54 (tulajdonos: „a kormányrúdnak legalább kétszer olyan hosszúnak kell lennie – nem tudom teljesen eltolni magamtól”): rúd 0,9 → 1,7 m,
       toldó 0,8 → 1,45 m (átlósan fut a kézhez, a markolat a test mellett van, így a teljes karhossz jut a tolásra), és a teljes kormánykitéréshez
       kisebb rúdszög kell (12°) – a markolatot kb. 35 cm-rel kell eltolni/meghúzni a végállásig. */
    /* 2026-11-12 00:42 (tulajdonos: „a vitorlásverseny használhatatlan, rosszabb, mint valaha – a rúd jó helyen volt, csináld vissza úgy, ahogy volt; a lényeg:
       a kezem egy normál mozdulatával végállásig tudjam tolni, ne essek ki a székből, ne kelljen lépnem”): a rúd és a toldó VISSZA az eredeti méretre (0,9 / 0,8 m),
       és a kormányzás már nem a rúd geometriájából jön, hanem a KÉZ ÚTJÁBÓL: a megfogástól számítva 28 cm oldalra = teljes kitérés (TIL.REACH). */
    /* 2026-11-12 00:50 (tulajdonos: „ha balra tolom a rudat, a toldó ráhajlik a kormányra és becsukódik ahelyett, hogy kormányozna – a toldó csak látszatra legyen toldó,
       a viselkedése a kormány MEREV egészének része legyen; a rúd legyen rövidebb, ott legyen a vége, ahol az én vonalam kezdődik, inkább picit hátrébb”):
       a toldó mereven áll a rúdhoz képest (nem csuklik), az egész együtt fordul; a forgáspont hátrébb került, a rúd 0,68 m, a vége a kormányos vonala mögött 5 cm-rel;
       a látszó elfordulás ±21° (TMAX), így a markolat nagyjából a kezeddel együtt megy a 28 cm-es úton. */
    /* 2026-11-12 01:14 (tulajdonos, a friss változat kipróbálása után, a közvetítés mellett): „nagyon rövid a rúd, amiben kapaszkodhatok, ezért most is nehezen tudom balra eltolni.
       A rudat mellkasnál szokták fogni, és nem is a végét, hanem kicsit beljebb; teljesen behúzva koppanásig fordul, ennyire kitolva megint teljes fordulat – ehhez igazítsd a rudat.”
       → a toldó a rúd végétől a kormányos MELLKASA ELÉ ér (mellmagasság, kb. 36 cm-rel a test előtt), és azon 30 cm-rel túlnyúlik – így nem a végét, hanem beljebb fogod;
         a fogórész hosszú (60 cm), vastag markolat. A kormányzás a toldó TENGELYE mentén történő tolás/húzás: a mellkastól eltolva (a hajó közepe felé) jobbra, behúzva balra fordul;
         a semleges helyzet a mellkas előtt van, onnan mindkét irányba 26 cm a végállás. A merev toldó a kezeddel együtt mozdul (látszó elfordulás ±14°). */
    const TIL = { TL: .68, EL: .8, TMAX: .25, REACH: .15, pz: hs.z - 1.35, py: deckY + .62, ty: deckY + .76 };
    { const tip = new THREE.Vector3(0, TIL.ty, TIL.pz + TIL.TL), chest = new THREE.Vector3(-(hs.hb - .74), deckY + 1.12, hs.z - .62 + .36)   /* 2026-11-12 01:34: 8 cm-rel lejjebb (a tulajdonos: „5–10 centivel állítsuk lejjebb az egészet, kényelmesebb”) */, d = chest.clone().sub(tip); TIL.EL = d.length() + .3; TIL.restV = d.normalize(); TIL.ax = new THREE.Vector3(-d.x, 0, -d.z).normalize(); }
    { const wood = std({ color: "#8a5326", roughness: .38 }), til = new THREE.Group(); G.add(til); til.position.set(0, TIL.py, TIL.pz);
      const stock = mesh(new THREE.CylinderGeometry(.045, .055, .62, 16), chrome, til); stock.position.y = -.31;
      const headB = mesh(new THREE.BoxGeometry(.12, .1, .2), chrome, til); headB.position.set(0, .01, .04);
      const [gt, mt] = rodGeom(new THREE.Vector3(0, .02, .08), new THREE.Vector3(0, .14, TIL.TL), .03, 12); mesh(gt, wood, til).applyMatrix4(mt);
      const [gt2, mt2] = rodGeom(new THREE.Vector3(0, .02, .08), new THREE.Vector3(0, .07, .45), .04, 12); mesh(gt2, wood, til).applyMatrix4(mt2);   /* a tövénél vastagabb */
      const jt = mesh(new THREE.SphereGeometry(.034, 14, 10), chrome, til); jt.position.set(0, .14, TIL.TL);
      const ext = new THREE.Group(); G.add(ext);
      const tube = mesh(new THREE.CylinderGeometry(.014, .014, TIL.EL - .6, 10), carbon, ext); tube.rotation.x = Math.PI / 2; tube.position.z = (TIL.EL - .6) / 2;
      const gripM = std({ color: "#2a2d33", roughness: .8, emissive: new THREE.Color("#ffd166"), emissiveIntensity: 0 });
      const grip = mesh(new THREE.CylinderGeometry(.023, .023, .6, 14), gripM, ext); grip.rotation.x = Math.PI / 2; grip.position.z = TIL.EL - .3; grip.userData.noBake = true;
      const ball = mesh(new THREE.SphereGeometry(.03, 14, 10), gripM, ext); ball.position.z = TIL.EL + .01; ball.userData.noBake = true;
      Object.assign(TIL, { til, ext, gripM, rest: TIL.restV.clone(), end: new THREE.Vector3() }); til.visible = ext.visible = false; }
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
    return { G, wheels, tiller: TIL, instT, chartT, deckY, helm: new THREE.Vector3(hs.hb - .74, deckY, hs.z - .62), crew, sh };
  }
  /* --------------------------------------------------------------- felépítés */
  /* ================= KISÜTÖTT FÉNY A VERSENYHAJÓKON (2026-11-11) =================
     A hajók eddig képpontonként, élőben számolt világítással rajzolódtak (lakkréteges „fizikai” anyagok) – ez a Quest 2-nek és a telefonnak a legdrágább munka.
     Itt a kész hajó minden álló alkatrészére EGYSZER, építéskor kiszámoljuk a fényt (égbolt + talajfény + nap a felületi normális szerint), és csúcsszínként
     ráírjuk; futás közben már csak a kész felületet rakja ki a gép (MeshBasicMaterial). A fényes részek (lakkozott test, króm, karbon) „matcap” anyagot kapnak:
     egy kész fényképszerű gömbkép adja a csillogást, szintén élő fényszámítás nélkül. Áttetsző és világító (kijelző) anyagokhoz nem nyúlunk.
     Kikapcsolás összehasonlításhoz: localStorage "zephyr-bake" = "0". */
  const VRB = { mc: {}, mats: new Map() };
  function vrMatcap(kind) {
    if (VRB.mc[kind]) return VRB.mc[kind];
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256);
    if (kind === "chrome") { const v = g.createLinearGradient(0, 8, 0, 248); [[0, "#f4fbff"], [.3, "#bcd7ea"], [.47, "#f8fbfd"], [.5, "#4d5a66"], [.56, "#2a333c"], [.8, "#8d7f6b"], [1, "#d9cdb8"]].forEach(([p, col]) => v.addColorStop(p, col)); g.fillStyle = v; }
    else if (kind === "gloss") { const v = g.createLinearGradient(0, 8, 0, 248); [[0, "#ffffff"], [.22, "#e9eef2"], [.5, "#b9c0c7"], [.62, "#8c949c"], [1, "#6e767e"]].forEach(([p, col]) => v.addColorStop(p, col)); g.fillStyle = v; }
    else { const v = g.createLinearGradient(0, 8, 0, 248); [[0, "#f7f7f7"], [.5, "#b4b4b4"], [1, "#7c7c7c"]].forEach(([p, col]) => v.addColorStop(p, col)); g.fillStyle = v; }
    g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
    const hl = g.createRadialGradient(84, 70, 2, 84, 70, kind === "soft" ? 110 : 62); hl.addColorStop(0, kind === "chrome" ? "rgba(255,255,255,1)" : kind === "gloss" ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.35)"); hl.addColorStop(1, "rgba(255,255,255,0)"); g.globalCompositeOperation = "lighter"; g.fillStyle = hl; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
    if (kind !== "soft") { const h2 = g.createRadialGradient(176, 196, 2, 176, 196, 60); h2.addColorStop(0, "rgba(160,200,235,.35)"); h2.addColorStop(1, "rgba(160,200,235,0)"); g.fillStyle = h2; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; W.disposables.push(t); return (VRB.mc[kind] = t);
  }
  function vrBake(root) {
    try { if (localStorage.getItem("zephyr-bake") === "0") return 0; } catch (e) {}
    const sun = new THREE.Vector3(.38, .82, .42).normalize(), n = new THREE.Vector3(), nm = new THREE.Matrix3(), done = new Set(); let cnt = 0;
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || o.userData.noBake) return; const m = o.material;
      if (!m || Array.isArray(m) || !m.isMeshStandardMaterial || m.transparent || m.opacity < 1) return;
      if (m.side === THREE.DoubleSide && m.metalness < .6 && !(m.clearcoat > 0)) return;   /* vitorlák, zászlók: mozgó, kétoldalas felületek – ezek maradnak élő fényben, hogy ne szürküljenek be */
      if (m.emissive && m.emissiveIntensity > 0 && (m.emissive.r + m.emissive.g + m.emissive.b) > .02) return;   /* kijelzők, világító részek maradnak */
      const g = o.geometry; if (!g || !g.attributes.position || !g.attributes.normal) return;
      const shiny = m.metalness >= .6 ? "chrome" : (m.clearcoat > 0 || m.roughness <= .36) ? "gloss" : null;
      const key = m.uuid + "|" + (shiny || "b"); let nmat = VRB.mats.get(key);
      if (!nmat) {
        const base = { color: m.color.clone(), map: m.map || null, side: m.side, alphaTest: m.alphaTest || 0, vertexColors: shiny ? !!m.vertexColors : true };
        nmat = shiny ? new THREE.MeshMatcapMaterial(Object.assign(base, { matcap: vrMatcap(shiny) })) : new THREE.MeshBasicMaterial(base);
        if (shiny === "chrome") nmat.color.lerp(new THREE.Color("#ffffff"), .35);
        if (!shiny) { const lum = nmat.color.r * .3 + nmat.color.g * .55 + nmat.color.b * .15; if (lum < .035 && !nmat.map) nmat.color.lerp(new THREE.Color(.07, .08, .1), .75); }   /* a koromfekete alkatrész szemüvegben lapos „lyuk” volt – sötétszürke lesz, így látszik rajta az árnyalás */
        W.disposables.push(nmat); VRB.mats.set(key, nmat);
      }
      if (!shiny && !done.has(g.uuid)) { done.add(g.uuid);
        const N = g.attributes.normal, cnt2 = N.count, had = m.vertexColors && g.attributes.color ? g.attributes.color : null, col = new Float32Array(cnt2 * 3), P = g.attributes.position; nm.getNormalMatrix(o.matrixWorld);
        g.computeBoundingBox(); const bb = g.boundingBox, hy = Math.max(.001, bb.max.y - bb.min.y);
        for (let i = 0; i < cnt2; i++) { n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); if (m.side === THREE.DoubleSide && n.y < -.2) n.multiplyScalar(-1);
          const hemi = .62 + .30 * (n.y * .5 + .5), d = Math.max(0, n.dot(sun)) * .46, ao = .92 + .08 * Math.min(1, (P.getY(i) - bb.min.y) / hy), L = Math.min(1.3, (hemi + d) * ao);
          col[i * 3] = L * (had ? had.getX(i) : 1); col[i * 3 + 1] = L * 1.0 * (had ? had.getY(i) : 1); col[i * 3 + 2] = L * 1.02 * (had ? had.getZ(i) : 1); }
        g.setAttribute("color", new THREE.BufferAttribute(col, 3)); }
      o.material = nmat; o.castShadow = false; o.receiveShadow = false; cnt++;
    });
    root.traverse((o) => { if (o.userData && o.userData.bakeSails) { try { o.userData.bakeSails(); cnt++; } catch (e) {} } });   /* a vitorlák is kisütve */
    return cnt;
  }
  function buildVRace() {
    const root = W.root;
    Object.assign(VRR, { grab: null, wHover: false, crewSide: null, lastSide: 0, podium: null, helpL: null, msgL: null, lblAr: 0 });   /* (az előző megnyitás átmeneti állapota ne maradjon meg; a futam száma igen) */
    const far = new THREE.Group(), env = new THREE.Group(); root.add(far); root.add(env); VRR.far = far; VRR.env = env;
    const oldSky = makeSky(far); makeShores(far);
    VRR.water = makeWater(env);
    VRR.foto = makePhotoSky(far, oldSky, VRR.water);   /* valódi égfotó + a víz ezt tükrözi */
    const boat = makeBoat({ detail: 0, vis: false, crew: 0, hull: "#f5f2e8", boot: "#141d4d", stripe: "#141d4d", jib: "#f6f4ec", main: "#d61f26", num: " ", cls: " ", logoImg: "img/zephyr-hajo-logo.png", reg: "H-30381", lazyBag: "#6e1423", nsCol: "#3f6fa6", teakDeck: true, spin: ["#ffffff", "#ffffff", "#f3f3ee"], spinArt: true, win: true, fine: true, sheetPt: [0, hullShape(.2).sheer + .07 + .19 / VR_SC, hullShape(.14).z + 2.25 / VR_SC], travHalf: hullShape(.2).hb - .55 / VR_SC });   /* 2026-11-11, a tulajdonos: a grósz (nagyvitorla) piros, a spinakker fehér, rajta az eredeti logó */
    boat.scale.setScalar(VR_SC); boat.rotation.y = Math.PI; root.add(boat); VRR.boat = boat;
    const CK2 = vrCockpit(boat); VRR.ck = CK2; VRR.baked = vrBake(boat);
    /* a felhasználó helye: a jobb oldali (styrbord) kerék mögött; a hajó orra −z felé néz (a hajó π-vel elforgatva) */
    const hp = CK2.helm.clone().multiplyScalar(1 / VR_SC); hp.x = -hp.x;   /* styrbord = a hajó helyi −x oldala */
    /* 2026-11-10: telefonon (álló képernyő, 2D) a kormánytól nézve a hajó kitakarta a pályát – ott magasabbról és hátrébbról nézünk
       (kb. 12 m-rel feljebb, 19 m-rel a kormány mögül, lefelé döntve), így a hajó kicsi, és látszik a víz, a bóják, az ellenfelek */
    const ph2d = !T.inVR && (document.documentElement.dataset.device === "phone" || innerHeight > innerWidth * 1.15);
    const eye = T.inVR ? 0 : 1.62 + (ph2d ? 12 : 0), camBack = ph2d ? 19 : 0;
    if (ph2d) { try { const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject) lc.pitchObject.rotation.x = -.42; } catch (e) {} }
    const hw = boat.localToWorld(hp.clone());
    VRR.noSigns = (() => { try { return localStorage.getItem("zephyr-verseny-tablak") === "0"; } catch (e) { return false; } })();
    VRR.seated = (() => { try { return localStorage.getItem("zephyr-vr-ules") === "1"; } catch (e) { return false; } })();
    VRR.baseY = -(hw.y + eye); root.position.set(-hw.x + (ph2d ? -1.1 : 0), VRR.baseY - (VRR.seated && T.inVR ? .45 : 0), -hw.z - camBack); VRR.rootX = -hw.x + (ph2d ? -1.1 : 0); VRR.rootZ = -hw.z - camBack; VRR.helmL = hp.clone(); boat.updateMatrix(); VRR.helmRest = hp.clone().applyMatrix4(boat.matrix); root.updateMatrixWorld(true);   /* ülve a fedélzet 45 cm-rel lejjebb kerül – így ülve is a kerék fölött látsz */
    VRR.wake = makeWake(env, 1.2);
    /* felcsapó víz: az orrnál és a hajó vállánál – sebességgel nő; a hullámra ugráskor nagy permet */
    { const N = 1500, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const dot = canvasTex(64, 64, (gg) => { const gr = gg.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.45, "rgba(235,248,255,.7)"); gr.addColorStop(1, "rgba(220,240,255,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64); });
      const m = new THREE.PointsMaterial({ size: .26, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }); W.disposables.push(m, g);
      const pts = new THREE.Points(g, m); pts.frustumCulled = false; root.add(pts);
      VRR.spray = { pts, pos, col, N, vel: new Float32Array(N * 3), life: new Float32Array(N), max: new Float32Array(N), i: 0, acc: 0 }; }
    /* ellenfelek (ugyanakkora hajók) */
    VRR.riv = VR_RIV.map((o, i) => { const g = makeBoat(Object.assign({ detail: 0, crew: 3 }, o)); g.scale.setScalar(VR_SC * .96); env.add(g); vrBake(g); const wk = makeWake(env, 1.1);
      const lbl = labelSprite([o.name, o.num], { size: 4.2, fs: 60, w: 620 }); env.add(lbl); return { o, g, wk, i, lbl }; });
    VRR.podium = labelSprite(["", "", "", "", ""], { size: 2.4, fs: 56, w: 900 }); root.add(VRR.podium); VRR.podium.visible = false;
    /* bóják, rendezőhajó, rajt-bója, a következő bója jelzőoszlopa */
    VRR.markG = new THREE.Group(); env.add(VRR.markG);
    VRR.cb = makeCommittee(); VRR.cb.scale.setScalar(1.2); env.add(VRR.cb);
    VRR.cdL = labelSprite(["RAJT", "0:45"], { size: 7, fs: 70, w: 640 }); env.add(VRR.cdL);
    VRR.pin = makeBuoy("#ff7a00", 2.0); VRR.pin.scale.setScalar(1.3); env.add(VRR.pin); try { vrBake(VRR.cb); vrBake(VRR.pin); } catch (e) {}   /* 2026-11-11: a rendezőhajó és a bóják is kisütve */
    const beamT = canvasTex(32, 256, (gg, w, h) => { const gr = gg.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(255,209,102,.9)"); gr.addColorStop(1, "rgba(255,209,102,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, w, h); });
    VRR.beam = mesh(new THREE.CylinderGeometry(2.4, 2.4, 60, 16, 1, true), basic({ map: beamT, transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), env); VRR.beam.renderOrder = 5;
    VRR.beamLbl = labelSprite(["1. bója", "kerüld bal kéz felől"], { size: 14, fs: 64, w: 760 }); env.add(VRR.beamLbl);
    /* kerülési nyíl a következő bója körül a vízen: az óramutatóval ellentétes ív (felülről nézve) = a bója bal kéz felől marad */
    { const R0 = 15, pts = []; for (let k = 0; k <= 36; k++) { const a = k / 36 * Math.PI * 1.5; pts.push(new THREE.Vector3(R0 * Math.cos(a), 0, -R0 * Math.sin(a))); }
      const arM = basic({ color: "#ffd166", transparent: true, opacity: .75, depthWrite: false }); const g3 = new THREE.Group(); env.add(g3); VRR.arrow = g3;
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .45, 6, false), arM, g3);
      const aEnd = Math.PI * 1.5, head = mesh(new THREE.ConeGeometry(1.4, 3.2, 10), arM, g3); head.position.set(R0 * Math.cos(aEnd), 0, -R0 * Math.sin(aEnd)); head.rotation.set(0, 0, 0);
      const tg2 = new THREE.Vector3(-Math.sin(aEnd), 0, -Math.cos(aEnd)); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg2); g3.renderOrder = 4; }
    /* 2026-11-12 01:49 (tulajdonos: „a bójakerülésnél semmifajta jelzés nincsen, hogy milyen irányba és hogyan kell megkerülni – azonnal javítsd ki”):
       a következő bója körül ÁLLÓ, embermagasságnál nagyobb sárga nyilak keringenek a kerülés irányában (felülről nézve az óramutatóval ellentétesen = a bója bal kéz felől marad).
       A hajóból, messziről is látszanak; a „Táblák” kapcsolótól függetlenül mindig megjelennek. */
    { const N = 12, R1 = 17, pos = []; for (let k = 0; k < N; k++) { const a = k / N * TAU, px = R1 * Math.cos(a), pz = -R1 * Math.sin(a), tx = -Math.sin(a), tz = -Math.cos(a), y = 3.4;
        const tip = [px + tx * 3, y, pz + tz * 3], bt = [px - tx * 2, y + 2.1, pz - tz * 2], bb = [px - tx * 2, y - 2.1, pz - tz * 2], nt = [px - tx * .4, y, pz - tz * .4];
        pos.push(...tip, ...bt, ...nt, ...tip, ...nt, ...bb); }
      const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3)); W.disposables.push(cg);
      const cm = basic({ color: "#ffe14d", transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide, fog: false }); const ring = mesh(cg, cm, VRR.arrow); ring.frustumCulled = false; ring.renderOrder = 5; VRR.arrowRing = ring; }
    buildCourseMarks(env);
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
    VRR.tiller = (() => { try { return localStorage.getItem("zephyr-kormany") !== "kerek"; } catch (e) { return true; } })();
    if (CK2.G.userData.podSet) CK2.G.userData.podSet(VRR.tiller);
    if (VRR.tiller) { CK2.wheels.forEach((w) => { w.wheel.visible = false; w.axle.visible = false; }); CK2.tiller.til.visible = CK2.tiller.ext.visible = true; }
    else CK2.wheels.forEach((w) => { w.hit.userData.xr = { hover: (on) => { VRR.wHover = on; }, down: (h, src, key) => vrGrab(w, src, key, true), drag: (src) => vrDrag(w, src), up: () => { VRR.rgrab = null; } }; T.xr.extra.add(w.hit); W.objs.push(w.hit); });
    /* első alkalommal: felirat a jobb oldali kerék fölött – amíg meg nem fogod */
    /* üzenettábla a kerék előtt (VR-ben a panel nélkül is látszik): bójakerülés, rossz oldal, korai rajt, koccanás, befutó */
    { const w0 = CK2.wheels.find((w) => w.sd < 0) || CK2.wheels[0]; VRR.msgL = labelSprite(["", ""], { size: 2.0, fs: 50, w: 1150 }); CK2.G.add(VRR.msgL);
      VRR.msgL.position.set(w0.ped.position.x * .6, CK2.deckY + 1.75, w0.ped.position.z + 2.2); VRR.msgL.visible = false; }
    { const w0 = CK2.wheels.find((w) => w.sd < 0) || CK2.wheels[0]; VRR.helpL = labelSprite(["Markold meg a kormányt!", "zárd ökölbe a kezed a peremén – nyitott tenyérrel engeded el · kontrollerrel: a hüvelykujjkar kormányoz"], { size: .55, fs: 56, w: 820 }); w0.wheel.add(VRR.helpL); VRR.helpL.position.set(0, .95, 0); }
    if (VRR.tiller) { VRR.helpL.parent.remove(VRR.helpL); VRR.helpL = labelSprite(["Fogd meg a kormányrudat!", "fogd meg a mellkasod előtt (ököl) · eltolod magadtól: végállás jobbra · a válladhoz húzod: végállás balra · nyitott tenyér: elenged · változat: " + String(window.ZEPHYR_BV || "?").slice(0, 5)], { size: .55, fs: 56, w: 820 }); CK2.G.add(VRR.helpL); VRR.helpL.position.set(-.6, CK2.deckY + 1.75, CK2.tiller.pz + 1.6); }
    SAIL.keys = {}; W.vrr = VRR; W.vrSetup = vrSetup;   /* (tesztekhez) */
    VRR.best = (() => { try { return JSON.parse(localStorage.getItem("zephyr-vr-verseny") || "{}"); } catch (e) { return {}; } })();
    vrSetup(VRR.lvl || 1);
    faceYaw(0);
    audioStart({ water: .04, wind: .035 });
    return { tick: vrTick, panel: vrPanel, hud: vrHud, wrist: vrWrist };
  }
  /* ===== PÁLYAJELZÉSEK (2026. nov. 9., a tulajdonos kérésére: „a bója fölött legyen az iránymutató nyíl, sokkal jobban látsszon,
     honnan és mit kell megkerülni; a két bója közötti áthaladás egyértelmű jelzést kapjon; az utak legyenek nyilvánvalóan jelezve”)
     • KERÜLŐBÓJA: a bója fölött 7–9 m magasan 8 fénylő nyílhegy kering körbe az óramutatóval ELLENTÉTESEN (felülről nézve) – ez a
       bal kéz felőli kerülés iránya; fölötte nagy jelzőtábla rajzzal: a hajó alulról érkezik, a bója a BAL oldalán marad, a nyíl
       körbeívelve a következő szakasz felé fordul („KERÜLD MEG – bal kéz felől”).
     • KAPU (rajt- és célvonal két vége): két magas fényoszlop, közöttük a vízen sakktábla-mintás fénycsík, nagy nyilak a két bója
       KÖZÖTT átfelé, fölötte tábla: „HALADJ ÁT A KÉT BÓJA KÖZÖTT” – kerülő-nyíl itt nincs, így nem keverhető össze.
     • ÚTVONAL: a vízen arany nyílsor (cikcakkban, ha szél ellen cirkálni kell) a következő célig, lassan előre „folyik”. */
  function buildCourseMarks(env) {
    const gold = basic({ color: "#ffd166", transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending }), M = {};
    /* keringő nyílhegyek a bója fölött */
    const head = new THREE.Shape(); head.moveTo(0, 1.6); head.lineTo(1.25, -1.0); head.lineTo(0, -.35); head.lineTo(-1.25, -1.0); head.closePath();
    const hg = new THREE.ExtrudeGeometry(head, { depth: .35, bevelEnabled: false }); hg.translate(0, 0, -.175); W.disposables.push(hg);
    M.orbit = new THREE.Group(); env.add(M.orbit); M.heads = [];
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(hg, gold); m.renderOrder = 7; M.orbit.add(m); M.heads.push(m); }
    { const pts = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * TAU; pts.push(new THREE.Vector3(Math.cos(a) * 9, 0, Math.sin(a) * 9)); }
      const ring = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, .16, 6, true), basic({ color: "#ffd166", transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending }), M.orbit); ring.renderOrder = 6; }
    /* kerülési jelzőtábla (rajz) */
    M.signT = canvasTex(512, 640, () => {}); const sm = sprM({ map: M.signT, transparent: true, depthWrite: false, depthTest: false });
    M.sign = new THREE.Sprite(sm); M.sign.renderOrder = 995; env.add(M.sign);
    /* kapu: két fényoszlop, sakktábla-csík, nyilak, tábla */
    const beamT = canvasTex(32, 256, (gg, w, h) => { const gr = gg.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(120,255,170,.95)"); gr.addColorStop(1, "rgba(120,255,170,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, w, h); });
    M.gate = new THREE.Group(); env.add(M.gate); M.posts = [0, 1].map(() => { const m = mesh(new THREE.CylinderGeometry(1.6, 1.6, 50, 16, 1, true), basic({ map: beamT, transparent: true, opacity: .75, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), M.gate); m.renderOrder = 5; return m; });
    const chk = canvasTex(256, 32, (gg, w, h) => { for (let i = 0; i < 16; i++) { gg.fillStyle = i % 2 ? "rgba(255,255,255,.95)" : "rgba(20,30,40,.85)"; gg.fillRect(i * 16, 0, 16, 16); gg.fillStyle = i % 2 ? "rgba(20,30,40,.85)" : "rgba(255,255,255,.95)"; gg.fillRect(i * 16, 16, 16, 16); } });
    M.strip = mesh(new THREE.PlaneGeometry(1, 3), basic({ map: chk, transparent: true, opacity: .8, depthWrite: false }), M.gate); M.strip.rotation.x = -Math.PI / 2; M.strip.renderOrder = 4;
    const ag = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 7), new THREE.Vector2(5, 1), new THREE.Vector2(2, 1), new THREE.Vector2(2, -6), new THREE.Vector2(-2, -6), new THREE.Vector2(-2, 1), new THREE.Vector2(-5, 1)])); W.disposables.push(ag);
    const gm = basic({ color: "#7dffb0", transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    M.garrows = [-1, 0, 1].map(() => { const m = new THREE.Mesh(ag, gm); m.rotation.x = -Math.PI / 2; m.renderOrder = 6; M.gate.add(m); return m; });
    M.gateL = labelSprite(["HALADJ ÁT", "a két bója KÖZÖTT"], { size: 16, fs: 70, w: 900, edge: "#7dffb0", c0: "#7dffb0" }); M.gate.add(M.gateL);
    /* útvonal: nyílsor a vízen (példányosítva) */
    const cg = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 1.4), new THREE.Vector2(1.8, -.6), new THREE.Vector2(1.1, -.9), new THREE.Vector2(0, .2), new THREE.Vector2(-1.1, -.9), new THREE.Vector2(-1.8, -.6)])); cg.rotateX(-Math.PI / 2 + .6); cg.translate(0, .5, 0); W.disposables.push(cg);   /* kissé felállítva, hogy alacsony szögből is jól látsszon */
    M.chev = new THREE.InstancedMesh(cg, basic({ color: "#ffd166", transparent: true, opacity: .85, depthWrite: false }), 90); M.chev.count = 0; M.chev.renderOrder = 4; M.chev.frustumCulled = false; env.add(M.chev);
    VRR.CM = M; M.signKey = "";
  }
  function drawRoundSign(M, exitRel, n, dist) {
    /* felülnézeti rajz a hajó szemszögéből: a hajó alulról jön, a bója a bal oldalán marad, a nyíl a bója körül a következő szakasz felé fordul */
    const key = n + "|" + Math.round(exitRel * 8) + "|" + Math.round(dist / 10); if (key === M.signKey) return; M.signKey = key;
    const g = M.signT._canvas.getContext("2d"), w = 512, h = 640; g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(9,34,70,.9)"; g.beginPath(); g.roundRect ? g.roundRect(6, 6, w - 12, h - 12, 40) : g.rect(6, 6, w - 12, h - 12); g.fill(); g.lineWidth = 8; g.strokeStyle = "#ffd166"; g.stroke();
    g.fillStyle = "#ffd166"; g.font = "900 64px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(`${n}. BÓJA`, w / 2, 62);
    g.fillStyle = "#fff"; g.font = "800 40px system-ui"; g.fillText("KERÜLD MEG", w / 2, 116);
    const bx = w / 2 - 40, by = 300, R0 = 90;
    g.strokeStyle = "rgba(127,211,255,.5)"; g.lineWidth = 3; g.setLineDash([10, 10]); g.beginPath(); g.arc(bx, by, R0, 0, TAU); g.stroke(); g.setLineDash([]);
    /* útvonal: alulról fel, a bója JOBB oldalán (a bója balra marad), majd körbe az óramutatóval ellentétesen a kilépés irányáig */
    const ex = -Math.PI / 2 + exitRel;   /* kilépés iránya a rajzon (0 = egyenesen fel) */
    /* a vásznon az óramutatóval ELLENTÉTES (felülről nézve) körüljárás: a szög csökken; egy θ pontban a haladási irány θ − 90° */
    let te = ((ex + Math.PI / 2) % TAU + TAU) % TAU - TAU; if (te > -.2) te -= TAU * 0 + .0; if (te > -.2) te = -.2;
    g.strokeStyle = "#ffd166"; g.lineWidth = 22; g.lineCap = "round"; g.beginPath(); g.moveTo(bx + R0, h - 70); g.lineTo(bx + R0, by); g.arc(bx, by, R0, 0, te, true); g.stroke();
    const px = bx + Math.cos(te) * R0, py = by + Math.sin(te) * R0, dx = Math.cos(te - Math.PI / 2), dy = Math.sin(te - Math.PI / 2), L2 = 70, tx = px + dx * L2, ty = py + dy * L2;
    g.beginPath(); g.moveTo(px, py); g.lineTo(tx, ty); g.stroke();
    g.fillStyle = "#ffd166"; g.beginPath(); g.moveTo(tx + dx * 34, ty + dy * 34); g.lineTo(tx - dy * 30, ty + dx * 30); g.lineTo(tx + dy * 30, ty - dx * 30); g.closePath(); g.fill();
    /* bója és hajó */
    g.fillStyle = "#ff7a00"; g.beginPath(); g.arc(bx, by, 34, 0, TAU); g.fill(); g.lineWidth = 5; g.strokeStyle = "#fff"; g.stroke(); g.fillStyle = "#14161b"; g.font = "900 40px system-ui"; g.fillText(String(n), bx, by + 2);
    g.fillStyle = "#ff4b3a"; g.beginPath(); g.moveTo(bx + R0, h - 120); g.lineTo(bx + R0 + 18, h - 76); g.lineTo(bx + R0 - 18, h - 76); g.closePath(); g.fill();
    g.fillStyle = "#fff"; g.font = "700 30px system-ui"; g.fillText("te", bx + R0 + 44, h - 92);
    g.fillStyle = "#ffd166"; g.font = "800 34px system-ui"; g.fillText("a bója BAL kéz felől", w / 2, h - 40 - 0); g.fillStyle = "#cfe9ff"; g.font = "700 30px system-ui"; g.fillText(`${Math.round(dist)} m`, w - 70, 170);
    M.signT.needsUpdate = true;
  }
  function courseTick(dt, tgt, from, isGate, rounding) {
    const S = VRR, C = S.C, M = S.CM; if (!M) return;
    /* keringő nyilak + tábla a bója fölött */
    M.orbit.visible = rounding && !S.fin; M.sign.visible = rounding && !S.fin && !S.noSigns;
    if (rounding) { M.orbit.position.set(tgt.x, 8 + Math.sin(W.t * 1.4) * .4, tgt.z); M.orbit.rotation.y += dt * .9;   /* +y körüli pozitív forgás = felülről nézve az óramutatóval ellentétes */
      M.heads.forEach((m, i) => { const a = i / 8 * TAU; m.position.set(Math.cos(a) * 9, 0, -Math.sin(a) * 9); const tg = new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg); m.scale.setScalar(1 + .15 * Math.sin(W.t * 4 + i)); });
      const d = Math.hypot(tgt.x - S.x, tgt.z - S.z), k = clamp(d * .13, 8, 55); M.sign.scale.set(k, k * 1.25, 1); M.sign.position.set(tgt.x, 18 + k * .75, tgt.z); M.orbit.scale.setScalar(clamp(d / 45, 1, 4.5)); M.orbit.position.y = 8 * clamp(d / 45, 1, 4.5);
      /* a következő szakasz iránya a hajóból nézve (a kilépő nyílhoz) */
      const nxt = S.next + 1 < S.marks.length ? S.marks[S.next + 1] : { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 };
      const app = Math.atan2(tgt.x - S.x, -(tgt.z - S.z)), ext = Math.atan2(nxt.x - tgt.x, -(nxt.z - tgt.z));
      drawRoundSign(M, wrapA(ext - app), S.next + 1, d); }
    /* kapu */
    M.gate.visible = isGate && !S.fin; if (M.gateL) M.gateL.visible = isGate && !S.fin && !S.noSigns;
    if (isGate) { const a = C.line.a, b = C.line.b, mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, L = Math.hypot(b.x - a.x, b.z - a.z);
      M.posts[0].position.set(a.x, 25, a.z); M.posts[1].position.set(b.x, 25, b.z); M.posts.forEach((m) => { m.material.opacity = .55 + .3 * Math.sin(W.t * 3); });
      M.strip.position.set(mx, .12, mz); M.strip.scale.set(L, 1, 1); M.strip.rotation.z = -Math.atan2(b.z - a.z, b.x - a.x);
      /* az áthaladás iránya: rajt előtt és befutáskor is a szél felől (u) … a befutó a szél felől szél alá (−u); rajtnál a vonal mögül előre (+u) */
      const dir = S.st === "pre" || S.ocs ? 1 : -1, yaw = Math.atan2(C.u[0] * dir, -C.u[1] * dir);
      M.garrows.forEach((m, i) => { const t = (i - 1) * L * .28; m.position.set(mx + C.c[0] * t - C.u[0] * dir * (6 - ((W.t * 6) % 12)), .2, mz + C.c[1] * t - C.u[1] * dir * (6 - ((W.t * 6) % 12))); m.rotation.set(-Math.PI / 2, 0, -yaw); });
      M.gateL.position.set(mx, 20 + Math.sin(W.t * 1.5) * .4, mz); M.gateL.userData.set(S.st === "pre" ? ["RAJTVONAL", "a két bója KÖZÖTT haladj át – a rajtjelre"] : S.ocs ? ["VISSZA", "a két bója között át, a vonal mögé"] : ["CÉL", "haladj át a két bója KÖZÖTT"]); }
    /* útvonal-nyilak a vízen: a szakasz ideális útja (cirkálásnál két csapás), a hajó előtti részen */
    const path = vrLegPath(from, tgt, S.wf); let n = 0;
    /* 2026-11-11: a vízre festett útvonal-nyilak NEM látszanak állandóan („ne sínen menjünk”): csak szakasz elején pár másodpercig, forduláskor,
       vagy ha a hajó 5 mp-nél tovább nagyon eltér a jó iránytól (bármelyik csapás ideális irányához mérve) */
    { const p1 = path[1]; if (p1) { const want = Math.atan2(p1.x - path[0].x, -(p1.z - path[0].z)), e1 = Math.abs(wrapA(want - S.b)), e2 = Math.abs(wrapA(2 * S.wf - want - S.b)), err = Math.min(e1, e2);
        S.offT = err > .6 ? (S.offT || 0) + dt : 0; if (S.offT > 5) S.guideT = Math.max(S.guideT || 0, W.t + 8); }
      if (Math.abs(S.yr || 0) > .2) S.guideT = Math.max(S.guideT || 0, W.t + 6); }
    const guide = W.t < (S.guideT || 0) && S.st === "race"; const Mx = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(1, 1, 1), off = (W.t * 5) % 14;
    for (let i = 0; guide && i < path.length - 1 && n < 90; i++) { const A = path[i], B = path[i + 1], L = Math.hypot(B.x - A.x, B.z - A.z), yaw = Math.atan2(-(B.x - A.x), -(B.z - A.z));
      q.setFromAxisAngle(Y, yaw);
      for (let d = off; d < L - 4 && n < 90; d += 28) { const x = A.x + (B.x - A.x) * d / L, z = A.z + (B.z - A.z) * d / L; const toMe = Math.hypot(x - S.x, z - S.z);
        if (toMe < 14 || toMe > 600) continue; sc.setScalar(1.6 + Math.min(1.4, toMe / 120)); Mx.compose(new THREE.Vector3(x, .15, z), q, sc); M.chev.setMatrixAt(n++, Mx); } }
    M.chev.count = n; M.chev.instanceMatrix.needsUpdate = true; M.chev.visible = !S.fin;
  }
  /* új futam: pálya, szél, kiinduló helyzet a rajtvonal mögött */
  function vrSetup(lvl) {
    const C = VRR.C = vrCourse(lvl); VRR.lvl = lvl;
    VRR.wf = C.wf; VRR.tws = C.tws;
    while (VRR.markG.children.length) VRR.markG.remove(VRR.markG.children[0]);
    VRR.marks = C.marks.map((m, i) => { const b = makeBuoy(i === C.marks.length - 1 && C.marks.length > 2 ? "#ffd166" : "#ff7a00", 2.4); b.scale.setScalar(1.5); b.position.set(m.x, 0, m.z); VRR.markG.add(b); try { vrBake(b); } catch (e) {}
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
    const p0 = back(95, 6); Object.assign(VRR, { wx: null, fox: 0, foz: 0, x: p0.x, z: p0.z, b: C.wf + Math.PI * .5 - .3, v: 2.5, del: 0, wa: 0, heel: 0, lastSide: 0, tackT: 0, next: 0, t: -45, st: "pre", horns: {}, fin: null, started: false, ocs: 0, sp: null, msg: "Rajt 45 mp múlva – állj be a vonal mögé!", msgT: 6, ocs: 0, res: [], pen: 0, doneT: 0, prevSide: null, dnf: false, _mi: -1, nearMk: 0, hailT: 0, guideT: 0, offT: 0 });
    VRR.riv.forEach((r, i) => { const p = back([84, 102, 90][i], [-48, -22, 38][i]);   /* egymástól és tőled is legalább ~28 m-re (15 m-es hajók) */ Object.assign(r, { x: p.x, z: p.z, b: C.wf + (i % 2 ? 1 : -1) * Math.PI * .45, v: 2.4, next: 0, tack: i % 2 ? 1 : -1, lastTack: 0, fin: null, skill: 1, yr: 0, del: 0, spinOn: false, ph: rand() * 9, _mi: -1, errNext: 0, errGW: 0, penT: 0, wide: 0, _dS: null, started: false, prevSide: null, _ls0: null }); });
    if (VRR.podium) VRR.podium.visible = false;
    W.panelDirty = 1;
  }
  /* --------------------------------------------------------------- kormány */
  const _wv = new THREE.Vector3();
  const _tz = new THREE.Vector3(0, 0, 1);
  const _ty = new THREE.Vector3(0, 1, 0);
  const _wb = new THREE.Vector3();
  function wheelAngleOf(w, p) {   /* a kéz/sugár pontja a kerék síkjában: óramutató szerinti szög a kormányos szemszögéből */
    const lp = w.wheel.worldToLocal(_wv.copy(p)); return Math.atan2(-lp.x, lp.y);   /* a kormányos felől nézve jobbra = a hajó helyi −x */
  }
  function vrGrab(w, src, key, ray) {
    if (VRR.tiller) { VRR.rgrab = null; return; }   /* 2026-11-12 09:39: botkormánynál a (láthatatlan) kerék sugaras fogása nem élhet – ez akadt össze a rúd fogásával átváltás után */
    let p = null; if (ray) { const pl = new THREE.Plane(); const n = new THREE.Vector3(0, 0, 1).transformDirection(w.wheel.matrixWorld); const c = w.wheel.getWorldPosition(new THREE.Vector3()); pl.setFromNormalAndCoplanarPoint(n, c); p = new THREE.Ray(src.o, src.d).intersectPlane(pl, new THREE.Vector3()); }
    else p = src.tip;
    if (!p) return; VRR.rgrab = { w, a: wheelAngleOf(w, p), key, ray }; try { flap(.02); } catch (e) {}
  }
  function vrDrag(w, src) {
    const G = VRR.rgrab; if (VRR.tiller) { VRR.rgrab = null; return; } if (!G || !G.ray) return;
    const pl = new THREE.Plane(); const n = new THREE.Vector3(0, 0, 1).transformDirection(w.wheel.matrixWorld); const c = w.wheel.getWorldPosition(new THREE.Vector3()); pl.setFromNormalAndCoplanarPoint(n, c);
    const p = new THREE.Ray(src.o, src.d).intersectPlane(pl, new THREE.Vector3()); if (!p) return;
    const a = wheelAngleOf(w, p); VRR.wa = clamp(VRR.wa + wrapA(a - G.a) * (WA_MAX / (Math.PI / 2)), -WA_MAX, WA_MAX); G.a = a;
  }
  function wheelRelease(h) {
    const S = VRR, G = S.grabs && S.grabs[h]; if (!G) return; delete S.grabs[h];
    const other = Object.values(S.grabs).length > 0;
    /* lendületből elengedve (és ha a másik kéz sem fogja) a kerék tovább pörög */
    if (false && !other && G.hist && G.hist.length >= 2) { const a0 = G.hist[0], a1 = G.hist[G.hist.length - 1], dtt = Math.max(.02, a1[0] - a0[0]); S.wv = clamp((a1[1] - a0[1]) / dtt, -18, 18); if (Math.abs(S.wv) < 1.2) S.wv = 0; }
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
  const vrWave = (x, z, t) => waveAt(x + (VRR.fox || 0), z + (VRR.foz || 0), t);   /* a látható (gyorsított) vízmintával egyező hullámmagasság */
  /* a hajó vízellenállása (N) a valódi sebesség (m/s) függvényében – a vitorlásjacht-tervezés szokásos módszere szerint:
     • súrlódási ellenállás: R_f = ½·ρ·S·C_f·(1+k)·v², ahol C_f az ITTC-1957 képlet: 0,075 / (log10(Re) − 2)², Re = v·(0,7·L_vízvonal)/ν
       (így számol a delfti jachttest-sorozat is);
     • maradék (hullámkeltő) ellenállás: a vízkiszorítás súlyának hányada a Froude-szám (Fn = v/√(g·L)) függvényében – a delfti sorozat (DSYHS)
       könnyű/közepes vízkiszorítású testeire jellemző, KÖZELÍTŐ görbe (nem ennek a hajónak a mért adata).
     Adatok: tömeg 2300 kg (a tulajdonos adata), hozzáadott (együtt mozgó víz) tömeg +8%, vízvonalhossz 8,0 m (Raptor 27), nedvesített felület ~14 m² (test + tőkesúly + kormány,
     becslés: 2,7·√(V·L) + függelékek), édesvíz 15 °C (ρ = 1000 kg/m³, ν = 1,14·10⁻⁶ m²/s), alaktényező 1,10. */
  /* 2026-11-12 01:00 – a tulajdonos hajója RAPTOR 27; gyári/hirdetési adatok (jachtserwis.pl gyártói táblázat, sailor.pl, yachtall.com):
     teljes hossz 8,23 m, VÍZVONALHOSSZ 8,00 m, vízvonal-szélesség 2,20 m, merülés 0,35–1,50 m (forgó uszony), vitorlafelület 32 m² (nagyvitorla ~20, fock 12),
     ballaszt 650–800 kg. Tömeg: a tulajdonos adata 2300 kg (a hirdetésekben 2500 kg). Nedvesített felület: 2,7·√(2,3·8,0) ≈ 11,6 m² + uszony és kormány ≈ 14 m² (becslés). */
  const VR_HYD = { m: 2300, add: 1.08, Lwl: 8.0, Sw: 14, rho: 1000, nu: 1.14e-6, k1: 1.1, rr: [[.1, 0], [.15, .0002], [.2, .0006], [.25, .0018], [.3, .0042], [.35, .0095], [.4, .021], [.45, .042], [.5, .066], [.55, .086], [.6, .1], [.8, .13]] };
  function vrHydR(v) { v = Math.abs(v); if (v < .02) return 0; const H = VR_HYD, Re = v * .7 * H.Lwl / H.nu, cf = .075 / Math.pow(Math.log10(Re) - 2, 2), Rf = .5 * H.rho * H.Sw * cf * H.k1 * v * v, Fn = v / Math.sqrt(9.81 * H.Lwl), T = H.rr;
    let r = T[T.length - 1][1]; if (Fn <= T[0][0]) r = 0; else for (let i = 1; i < T.length; i++) if (Fn <= T[i][0]) { r = lerp(T[i - 1][1], T[i][1], (Fn - T[i - 1][0]) / (T[i][0] - T[i - 1][0])); break; }
    return Rf + r * H.m * 9.81; }
  const VR_SPD = 1.95;   /* sebesség-szorzó: a 15 m-es versenyjacht 9–16 csomóval száguld (élmény), a pályák rövidebbek lesznek */   /* ütközéstől ütközésig ~2,5 fordulat (mint egy nagy jachton) */
  /* --------------------------------------------------------------- képkocka */
  /* ================= SZABÁLYOK (2026-11-11, a tulajdonos kritikája után) =================
     BÓJAKERÜLÉS: a bója akkor számít megkerültnek, ha a hajó – a bóját BAL kéz felől hagyva (felülről nézve az óramutatóval ellentétesen haladva) – átlépi a bójából
     a forduló KÜLSŐ oldala felé húzott félegyenest (legfeljebb 45 m-re a bójától). Nem elég a közelében elhaladni; a rossz irányú átlépés hibát jelez. Ugyanez a szabály
     érvényes a játékosra és a gépi hajókra.  ÚTJOG: ellentétes csapáson a szelet JOBBRÓL kapó hajónak van útjoga (bumja a bal oldalon), azonos csapáson a szél felőli tér ki.
     A kitérésre kötelezett gépi hajó kitér; ha a játékos a kötelezett, az útjogos hajó rákiált („Backbord!”); ütközésnél a vétkes kap büntetést. A gépi hajók is hibáznak. */
  function vrMarkO(i) { const S = VRR, C = S.C, lm = { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 }, m = S.marks[i], p = i ? S.marks[i - 1] : lm, n = i + 1 < S.marks.length ? S.marks[i + 1] : lm;
    let ix = m.x - p.x, iz = m.z - p.z, il = Math.hypot(ix, iz) || 1, ox = n.x - m.x, oz = n.z - m.z, ol = Math.hypot(ox, oz) || 1; ix /= il; iz /= il; ox /= ol; oz /= ol;
    let x = ix - ox, z = iz - oz, l = Math.hypot(x, z); if (l < .35) { x = -iz; z = ix; l = 1; } return [x / l, z / l]; }
  function vrRoundCheck(o, i) { const m = VRR.marks[i], O = vrMarkO(i), rx = o.x - m.x, rz = o.z - m.z, sd = O[0] * rz - O[1] * rx, d = O[0] * rx + O[1] * rz;
    if (o._mi !== i) { o._mi = i; o._ms = sd; return 0; } const prev = o._ms; o._ms = sd; if (d > 1.5 && d < 45) { if (prev > 0 && sd <= 0) return 1; if (prev < 0 && sd >= 0) return -1; } return 0; }
  const vrStb = (b) => wrapA(VRR.wf - b) > 0;   /* a szél jobbról jön (a szél felőli irány a hajó orrától jobbra esik) */
  function vrGiveWay(a, o) { const as = vrStb(a.b), os = vrStb(o.b); if (as !== os) return !as; const uw = vfwd(VRR.wf); return (a.x - o.x) * uw[0] + (a.z - o.z) * uw[1] > 0; }   /* igaz: „a”-nak kell kitérnie */
  /* a rákiáltás legyen nagyon intenzív és haragos (a tulajdonos kérése): háromszor, hangosan, gyorsan, mély dühös hangon + éles, ismétlődő kürt */
  function vrHail(txt) {
    try { speechSynthesis.cancel(); const hu = (speechSynthesis.getVoices() || []).find((v) => /^hu/i.test(v.lang));
      [txt.toUpperCase() + "!", txt.toUpperCase() + "!!", "Térj már ki! " + txt.toUpperCase() + "!!!"].forEach((q, i) => { const u = new SpeechSynthesisUtterance(q); u.lang = "hu-HU"; if (hu) u.voice = hu; u.rate = 1.45 + i * .1; u.pitch = .55 + i * .12; u.volume = 1; speechSynthesis.speak(u); }); } catch (e) {}
    try { const a = T.ac(); if (a) [0, .16, .32, .55, .71].forEach((d, i) => { const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + d; o.type = "sawtooth"; o.frequency.setValueAtTime(i < 3 ? 330 : 262, t0); o.frequency.linearRampToValueAtTime(i < 3 ? 300 : 230, t0 + .13); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.22, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + .14); o.connect(g).connect(T.outBus()); o.start(t0); o.stop(t0 + .16); }); } catch (e) {}
  }
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
    S.near = false;
    if (T.inVR && X && X.src) {
      if (S.tiller) ["right", "left"].forEach((h) => {   /* BOTKORMÁNY: a kéz a toldó markolatát fogja; a rúd a kéz helyéből számolódik */
        if (S.grabs[h] && !S.grabs[h].tiller) wheelRelease(h);   /* kerékről itt maradt fogás nem zavarhat be */
        const TI = S.ck.tiller, s0 = X.src[h], G = S.grabs[h], pt = s0 && (s0.palmC || s0.wristJ || s0.tip);
        if (!s0 || !pt) { if (G) { G.lost = (G.lost || 0) + dt; if (G.lost > 2.5) wheelRelease(h); } S.hold[h] = false; return; }
        const g = s0.hand ? curl(s0) : (squeeze(s0) ? 1 : 0), pin = !!s0.hand && pinchOf(s0, h);
        const holding = g > .45 || pin, open = (g >= 0 && g < .16) && !pin;
        const lp = S.ck.G.worldToLocal(_wv.copy(pt)).clone();
        /* 2026-11-11 23:07 (tulajdonos: „a rudat lehessen több helyen megfogni, ahogy az életben”): a kormányrúd ÉS a toldó teljes hosszában fogható.
           A kézhez legközelebbi pontot keressük a rúdon (forgáspont→csukló) és a toldón (csukló→markolat); ott fogod meg, és onnan mozgatod:
           a rúdon fogva a kéz iránya a forgásponttól adja a szöget, a toldón fogva a fogás helyéig érő toldóhosszal számolunk. */
        const c0t = S.wa / WA_MAX * TI.TMAX, tipX = Math.sin(c0t) * TI.TL, tipZ = TI.pz + Math.cos(c0t) * TI.TL;
        const near = () => { const segP = (ax, ay, az, bx, by, bz) => { const vx = bx - ax, vy = by - ay, vz = bz - az, L2 = vx * vx + vy * vy + vz * vz, u = clamp(((lp.x - ax) * vx + (lp.y - ay) * vy + (lp.z - az) * vz) / L2, 0, 1), qx = ax + vx * u, qy = ay + vy * u, qz = az + vz * u; return { u, x: qx, y: qy, z: qz, d: Math.hypot(lp.x - qx, lp.y - qy, lp.z - qz) }; };
          const a = segP(0, TI.py + .02, TI.pz, tipX, TI.ty, tipZ), dir = TI.dir || TI.rest, b = segP(tipX, TI.ty, tipZ, tipX + dir.x * TI.EL, TI.ty + dir.y * TI.EL, tipZ + dir.z * TI.EL);
          return b.d <= a.d + .04 ? { d: b.d, q: b, s: Math.max(.12, b.u * TI.EL) } : { d: a.d, q: a, r: Math.max(.25, a.u * TI.TL) }; };
        if (G) {
          if (G.lp && G.lp.distanceTo(pt) > .3) { G.lost = (G.lost || 0) + dt; if (G.lost > 2.5) wheelRelease(h); else G.lp.lerp(pt, .08); return; }
          (G.lp || (G.lp = new THREE.Vector3())).copy(pt);
          G.lost = 0; if (open) { G.off = (G.off || 0) + dt; if (G.off > .6) { wheelRelease(h); S.hold[h] = holding; return; } } else G.off = 0;
          const ex = lp.x + G.ox, ey = lp.y + G.oy, ez = lp.z + G.oz;   /* a markolat kívánt helye (a fogás pillanatának eltolásával – nem ugrik) */
          /* a kéz oldalirányú elmozdulása a megfogás óta: 28 cm = teljes kitérés. Eltolod magadtól (a hajó közepe felé) → a rúd balra megy → a hajó JOBBRA fordul. */
          /* 2026-11-12 01:20 (tulajdonos, hangban, pontos leírás): „a toldót a mellkasomnál fogom, nem a végét. KÖZÉPÁLLÁS, ahol tartom; ha TELJESEN ELTOLOM magamtól,
             a kormány végállásban van, a hajó teljes mértékben fordul; ha VISSZAHÚZOM egészen a VÁLLAMIG, az ellenkező irányba megy teljes fordulattal. Ki – közép – föl.”
             → a kormány a kéz TESTTŐL MÉRT TÁVOLSÁGÁT figyeli (a fej függőleges tengelyétől, vízszintesen) + az oldalirányú elmozdulást a hajó közepe felé:
               a megfogás helye a középállás; +26 cm-re eltolva végállás (jobbra fordul), a vállhoz visszahúzva (−26 cm-nyi együttes út) végállás a másik irányba.
               Testtartástól független: mindegy, merre nézel, az „el a testemtől / vissza a vállamhoz” mozdulat számít. */
          let bodyR = 0; try { const hp = T.headPos && T.headPos(); if (hp) { const hl = S.ck.G.worldToLocal(_wb.copy(hp)); bodyR = Math.hypot(lp.x - hl.x, lp.z - hl.z); } } catch (e) {}
          const meas = lp.x;   /* 2026-11-12 09:56 (tulajdonos, helyesbítés): VÍZSZINTES, oldalirányú ökölmozgás a test előtt kormányoz, ahogy a valódi botkormánynál – a megfogás helye a közép; balra 15 cm / jobbra 15 cm a teljes kitérés. Balra (a hajó közepe felé) tolva a rúd balra megy → a hajó jobbra fordul. */
          if (G.x0 == null) { G.x0 = meas; G.wa0 = S.wa; }
          const tgW = clamp(G.wa0 + (meas - G.x0) / TI.REACH * WA_MAX, -WA_MAX, WA_MAX); S.wa += (tgW - S.wa) * Math.min(1, dt * 12); S.wv = 0;
          if (G.s) G.e = (G.e || new THREE.Vector3()).set(ex, ey, ez);
        } else if (holding) { const n = near(); if (n.d < (S.hold[h] ? .2 : .42)) {   /* fogás: a kéz a rúd vagy a toldó BÁRMELY pontja közelében zárul (vagy csippent) – 2026-11-12 09:39: bővebb fogási zóna (42 cm), és a már zárt kéz is megfogja, ha a rúdhoz ér (20 cm) */
          S.grabs[h] = { tiller: true, key: h, ray: false, hist: [[W.t, S.wa]], s: n.s || 0, r: n.r || 0, ox: n.q.x - lp.x, oy: n.q.y - lp.y, oz: n.q.z - lp.z }; S.wv = 0; try { flap(.02); X.pulse && X.pulse(h, .5, 30); } catch (e) {} }
        } else S.near = S.near || near().d < .42;
        S.hold[h] = holding;
      });
      else ["right", "left"].forEach((h) => {
        if (S.grabs[h] && S.grabs[h].tiller) wheelRelease(h);
        const s0 = X.src[h], G = S.grabs[h], pt = s0 && (s0.palmC || s0.wristJ || s0.tip);
        if (!s0 || !pt) { if (G) { G.lost = (G.lost || 0) + dt; if (G.lost > 2.5) wheelRelease(h); } S.hold[h] = false; return; }   /* 2026-11-11: a kézkövetés elvesztése 2,5 mp-ig NEM engedi el a kormányt */
        const g = s0.hand ? curl(s0) : (squeeze(s0) ? 1 : 0), pin = !!s0.hand && pinchOf(s0, h);
        const holding = g > .45 || pin, open = (g >= 0 && g < .16) && !pin;   /* elengedés: csak TÉNYLEG nyitott tenyérrel (fél mp-ig) */
        if (G) {
          if (G.lp && G.lp.distanceTo(pt) > .3) { G.lost = (G.lost || 0) + dt; if (G.lost > 2.5) wheelRelease(h); else G.lp.lerp(pt, .08); return; }   /* valószerűtlen ugrás = követési hiba: kivárjuk */
          (G.lp || (G.lp = new THREE.Vector3())).copy(pt);
          G.lost = 0; if (open) { G.off = (G.off || 0) + dt; if (G.off > .5) { wheelRelease(h); S.hold[h] = holding; return; } } else G.off = 0;
          /* 2026-11-11 (a tulajdonos közvetített Quest-képén láttam: a kerék kis kézmozdulatra ~200°-ot pördült, a kéz az agyhoz csúszott, a hajó megállt):
             a kéz SZÖGE helyett az OLDALIRÁNYÚ elmozdulása kormányoz. Az agy közelében a szög kis mozdulatra is hatalmasat ugrott – ez „szabadította el” a kormányt.
             Most: megfogás után a kezed bárhol lehet; 25 cm oldalra = majdnem teljes kitérítés; a kerék simán követ. Elengedés: CSAK nyitott tenyérrel. */
          const lp = G.w.wheel.worldToLocal(_wv.copy(pt));
          if (Math.hypot(lp.x, lp.y, lp.z) > 1.4) { wheelRelease(h); S.hold[h] = holding; return; }
          /* 2026-11-12 01:52 (tulajdonos: „választható legyen a hagyományos nagy kormánykerék is. Megfogás után ne kelljen nagy kézmozdulat: a végállás a középtől 90–90 fok
             legyen; a kerék tudjon egy kicsit tovább fordulni, és ha a végállásnál tovább húzom a kezem, NE engedje el a kormányt”):
             a kerék a kéz ELFORDULÁSÁT követi a tengely körül (a megfogástól számítva, lépésenként összegezve); ±90° = teljes kormánykitérés; +12°-ot még túlfordul (látszik),
             de a kormány ott megáll, és a fogás megmarad – elengedni csak nyitott tenyérrel lehet. A tengelyhez túl közel (14 cm-en belül) a szög nem számít (ott ugrálna). */
          { const rr2 = Math.hypot(lp.x, lp.y), aN = Math.atan2(-lp.x, lp.y), Q = Math.PI / 2;
            if (G.aP == null) { G.aP = aN; G.wAng = S.wa / WA_MAX * Q; }
            if (rr2 > .14) { G.wAng = clamp(G.wAng + wrapA(aN - G.aP), -Q - .21, Q + .21); G.aP = aN; }
            const tgW = clamp(G.wAng / Q, -1, 1) * WA_MAX; S.wa += (tgW - S.wa) * Math.min(1, dt * 14); S.wv = 0; S.wOver = G.wAng - clamp(G.wAng, -Q, Q); }
          G.hist.push([W.t, S.wa]); while (G.hist.length > 2 && W.t - G.hist[0][0] > .2) G.hist.shift();
        } else if (holding && !S.hold[h]) {   /* fogás kezdete: a kéz a perem mellett zárul (vagy csippent) */
          S.ck.wheels.forEach((w) => { if (S.grabs[h]) return; const lp = w.wheel.worldToLocal(_wv.copy(pt)), r = Math.hypot(lp.x, lp.y);
            if (Math.abs(lp.z) < .36 && r > w.WR - .34 && r < w.WR + .34) { const a0 = Math.atan2(-lp.x, lp.y); S.grabs[h] = { w, a: a0, f: a0, key: h, ray: false, hist: [[W.t, S.wa]] }; S.wv = 0; vrGripHand(w, h, a0 - (S.wVis || 0)); try { flap(.02); X.pulse && X.pulse(h, .5, 30); } catch (e) {} } });
        }
        S.hold[h] = holding;
      });
    }
    S.grab = S.grabs.right || S.grabs.left || null;
    if (dN) { S.wa = clamp(S.wa + dSum / dN * 1.5, -WA_MAX, WA_MAX);   /* érzékenyebb áttétel: kis kézmozdulat is kormányoz */ Object.values(S.grabs).forEach((G) => { G.hist.push([W.t, S.wa]); while (G.hist.length > 2 && W.t - G.hist[0][0] > .2) G.hist.shift(); }); }
    /* 2026-11-11 KONTROLLERES KORMÁNYZÁS (tulajdonos: „a Quest kontrollerét vegyük be, a belső joystick részével … mindkettő menjen, bal- és jobbkezes is tudjon;
       legyen választható opció, de a kézzel történő irányításról nem mondok le”): bármelyik kontroller hüvelykujjkarja oldalra billentve kormányoz – a kerék
       a kar állását követi (arányosan, simítva), elengedve középre áll. Nem kell átkapcsolni: amelyik a kezedben van, az él; a kézi (ökölfogásos) kormány változatlan. */
    let stk = 0, stkN = 0; try { Object.keys((X && X.src) || {}).forEach((key) => { const q = X.src[key], gp = q && q.src && !q.src.hand && q.src.gamepad; if (!gp || !gp.axes) return; const ax = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0]; if (typeof ax === "number" && Math.abs(ax) > .12) { stk += ax; stkN++; } }); } catch (e) {}
    S.stickOn = stkN > 0;
    const k = SAIL.keys; if (k.L || k.R) { S.wa = clamp(S.wa + ((k.R ? 1 : 0) - (k.L ? 1 : 0)) * dt * 2.4, -WA_MAX, WA_MAX); S.wv = 0; }
    else if (stkN && !S.grab && !S.rgrab) { const v = clamp(stk, -1, 1), tg = Math.sign(v) * Math.pow((Math.abs(v) - .12) / .88, 1.4) * WA_MAX * .8; S.wa += (tg - S.wa) * Math.min(1, dt * 4.5); S.wv = 0; S.padUsed = true; }
    else if (!S.grab && !S.rgrab) {
      S.wv = 0; S.wa += (0 - S.wa) * Math.min(1, dt * 1.6); if (Math.abs(S.wa) < .004) S.wa = 0;   /* 2026-11-11: elengedve a kormány simán középre áll – a hajó egyenesben marad, nem fordul tovább */
    }
    { const dT = S.wa / WA_MAX * .55; S.del = (S.del || 0) + (dT - (S.del || 0)) * Math.min(1, dt * 4.5); }   /* a lapát simán, kis késéssel követi a kereket (nagy hajó) */
    if (!S.grab) S.wOver = (S.wOver || 0) * Math.max(0, 1 - dt * 8);
    S.wVis = S.wa / WA_MAX * (Math.PI / 2) + (S.wOver || 0);   /* a kerék látszó elfordulása: ±90° a végállás (+ kis túlfordulás) */
    S.ck.wheels.forEach((w) => { w.spin.rotation.z = S.wVis; const want = S.grab && S.grab.w === w ? 1.6 : (VRR.wHover ? .25 : 0) + (!S.everGrab && S.st === "pre" && w.sd < 0 ? .25 + .25 * Math.sin(W.t * 4) : 0); w.gripM.emissiveIntensity += (want - w.gripM.emissiveIntensity) * Math.min(1, dt * 8); });
    if (S.tiller) { const TI = S.ck.tiller, th = S.wa / WA_MAX * TI.TMAX; TI.til.rotation.y = th;   /* a rúd a kormányállást mutatja; a toldó a csuklótól a kézig (vagy nyugalmi helyére) ér */
      const tx = Math.sin(th) * TI.TL, tz = TI.pz + Math.cos(th) * TI.TL, G = S.grab && S.grab.tiller ? S.grab : null;
      _wv.copy(TI.rest).applyAxisAngle(_ty, th);   /* a toldó MEREV: a rúddal együtt fordul, nem csuklik */ (TI.dir || (TI.dir = new THREE.Vector3())).copy(_wv);
      TI.ext.position.set(tx, TI.ty, tz); TI.ext.quaternion.setFromUnitVectors(_tz, _wv); TI.end.set(tx, TI.ty, tz).addScaledVector(_wv, TI.EL - .3);
      const want = G ? 1.5 : (S.near ? .6 : 0) + (!S.everGrab && S.st === "pre" ? .3 + .3 * Math.sin(W.t * 4) : 0); TI.gripM.emissiveIntensity += (want - TI.gripM.emissiveIntensity) * Math.min(1, dt * 8); }
    if (S.grab) S.everGrab = true;
    if (S.helpL) { S.helpL.visible = T.inVR && !S.everGrab && S.st !== "done"; }   /* (2D-ben billentyű/gomb kormányoz – ott nem kell) */
    if (S.msgL) { const on = S.msgT > 0 && !!S.msg && S.st !== "done" && /⚠|BACKBORD|SZABÁLY|Korai rajt|szabálytalan|BEFUTÓ|✓/.test(S.msg); S.msgL.visible = on;   /* csak szabálysértés / visszaigazolás – nincs állandó szöveg */
      if (on) { const m = S.msg; let k = m.indexOf(" – "), L; if (k > 0) L = [m.slice(0, k), m.slice(k + 3)]; else if ((k = m.indexOf("! ")) > 0) L = [m.slice(0, k + 1), m.slice(k + 2)]; else L = [m, ""]; S.msgL.userData.set(L); } }   /* +z körüli forgás a kormányos felől nézve óramutató szerinti */
    /* fizika (a vitorlázás modellje, a nagyobb hajóhoz igazítva) */
    /* a szél lassan leng (±7°) – mint a Balatonon; a pálya ugyanaz marad */
    /* 2026-11-11 VÁLTOZÓ SZÉL (balatoni minta: lökéses ÉNy-i szél, kis forgások, néha tartós szélfordulás, erősödés/gyengülés) */
    if (!S.wx) { let sd = (C.lvl * 9301 + 49297 + ((Date.now() / 1000) | 0)) % 233280; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
      const big = rnd() < .18, n = 1 + (rnd() < .5 ? 1 : 0), sh = []; let t0 = 35 + rnd() * 50;
      for (let i = 0; i < n; i++) { sh.push({ t: t0, d: 25 + rnd() * 30, a: (rnd() < .5 ? -1 : 1) * (i === 0 && big ? 26 + rnd() * 12 : 6 + rnd() * 9) * D2R }); t0 += 70 + rnd() * 80; }
      const gu = []; let tg = -40 + rnd() * 20; while (tg < 1200) { const lull = rnd() < .3; gu.push({ t: tg, d: 7 + rnd() * 14, k: lull ? -(.14 + rnd() * .14) : .14 + rnd() * .2, a: (rnd() - .5) * 9 * D2R }); tg += 18 + rnd() * 40; }
      S.wx = { sh, gu, ph: rnd() * 6, tr: rnd() < .5 ? 1 : -1 }; }
    { const wx = S.wx; let wsh = 0, gdir = 0, gk = 1 + wx.tr * .12 * Math.sin(S.t / 140 + wx.ph) + .04 * Math.sin(S.t * 1.07);
      for (const q of wx.sh) { const u = clamp((S.t - q.t) / q.d, 0, 1); wsh += q.a * u * u * (3 - 2 * u); }
      for (const q of wx.gu) { const u = (S.t - q.t) / q.d; if (u > 0 && u < 1) { const e = Math.pow(Math.sin(u * Math.PI), .7); gk += q.k * e; gdir += q.a * e; } }
      S.wf = C.wf + wsh + gdir + Math.sin(S.t / 47 + C.lvl) * 6 * D2R + Math.sin(S.t / 13) * 2 * D2R; S.gkW = clamp(gk, .6, 1.5); }
    const twa = Math.abs(wrapA(S.wf - S.b)) * R2D;
    S.spinOn = S.spinOn ? twa > 98 : twa > 108; const spin = S.spinOn && S.st === "race";   /* hátszélben (és széles hátszélben) felhúzzák a spinakkert */
    S.gk = S.gkW;   /* lökések és szélcsendesebb foltok (7–20 mp), lassú erősödés/gyengülés */
    const vt = polar(twa, spin && S.sp && (S.sp.st === "fly" || S.sp.st === "pop")) * KN * VR_SPD * (S.heelPen || 1) * (S.st === "pre" ? .7 : 1) * (S.tws * S.gk / (12 * KN)) ** .5 * (1 + .08 * Math.sin(W.t * .23) * Math.sin(W.t * .07));
    /* gyorsabban gyorsul (a nagy vitorlafelület húz), a kormány fékez egy kicsit, ha nagyon el van tekerve */
    /* 2026-11-12 00:46 – A HAJÓ SIKLÁSA FIZIKAI MODELLEL (tulajdonos: „a hajó súlya 2300 kg … ha nem fújja a szél, azonnal megáll, miközben az életben még
       csúszik tovább, míg a közegellenállás meg nem állítja – pontos számítás, élethű mozgás”). Newton: (m + hozzáadott tömeg) · dv/dt = F_hajtó − R_víz(v) − F_szél.
       • R_víz = súrlódási + maradék (hullámkeltő) ellenállás – lásd vrHydR;  • F_hajtó: akkora erő, amely a polár szerinti sebességnél éppen egyensúlyt tart
         a vízellenállással (R(v_polár)); a cél alatt a vitorlák kicsit jobban húznak;  • F_szél: ha a vitorlák nem húznak (szélbe állva lobognak), a szembeszél
         a hajótestet, az árbocot és a lobogó vitorlákat fékezi (½·ρ_levegő·C_d·A·v²).
       Ha a hajtóerő megszűnik, a hajó a lendületéből SIKLIK tovább: gyorsan veszít a hullámkeltő tartományban (5–6 csomó fölött), aztán hosszan, lassan csúszik. */
    { const vR = S.v / VR_SPD, vtR = Math.max(0, vt / VR_SPD), mE = VR_HYD.m * VR_HYD.add;
      let F = vtR > .05 ? vrHydR(vtR) * (1 + .6 * clamp(1 - vR / vtR, 0, 1)) : 0;
      { const wv = vfwd(S.wf), fb = vfwd(S.b), hw = (wv[0] * fb[0] + wv[1] * fb[1]) * S.tws * S.gk + vR, fl = clamp((42 - twa) / 10, 0, 1); if (fl > 0 && hw > 0) F -= .5 * 1.2 * (2 + 3 * fl) * fl * hw * hw; }   /* C_d·A: test+árboc+kötélzet ~2 m², a lobogó vitorlák további ~3 m² (becslés) */
      const Rw = vR > .08 ? 22 * Math.pow(S.tws * S.gk / 6, 2) : 0;   /* a hullámok okozta többletellenállás (a széllel nő) – ettől áll meg végül a sikló hajó */
      const v2 = Math.max(0, vR + (F - vrHydR(vR) - Rw) / mE * dt); S.v = v2 * VR_SPD; S.dragN = vrHydR(v2) + Rw; }
    S.v *= 1 - Math.abs(S.del) * .16 * dt;
    /* fordulás: sebességfüggő, de lassan is kormányozható; kis tehetetlenséggel (nem ugrik, de jól reagál) */
    { const yrT = Math.sin(S.del) * (.085 * S.v + .24); S.yr = (S.yr || 0) + (yrT - (S.yr || 0)) * Math.min(1, dt * 3.2); }
    S.b = (S.b + S.yr * dt + TAU) % TAU;
    if (S.pen > 0 && S.st === "race") { const dB = S.yr * dt; if (Math.abs(S.yr) < .05) { S.penSt = (S.penSt || 0) + dt; if (S.penSt > 4) S.penAcc = 0; } else S.penSt = 0;
      if (S.penAcc && Math.sign(dB) !== Math.sign(S.penAcc) && Math.abs(dB) > 1e-5 && Math.abs(S.yr) > .12) S.penAcc = 0;
      S.penAcc = (S.penAcc || 0) + dB;
      if (Math.abs(S.penAcc) >= TAU) { S.pen--; S.penAcc = 0; horn(.3, .1); S.msg = S.pen ? `✓ Büntetőforduló kész – még ${S.pen} van hátra.` : "✓ Büntetőforduló letudva – tiszta vagy, mehet a verseny!"; S.msgT = 6; W.panelDirty = 1; } }
    const [fx, fz] = vfwd(S.b); S.x += fx * S.v * dt; S.z += fz * S.v * dt;
    /* látszólagos szél, vitorlák, dőlés */
    const wfv = vfwd(S.wf), tw = [wfv[0] * S.tws * S.gk, wfv[1] * S.tws * S.gk], aw = [tw[0] + fx * S.v, tw[1] + fz * S.v], aws = Math.hypot(aw[0], aw[1]);
    const awa = Math.acos(clamp((aw[0] * fx + aw[1] * fz) / (aws || 1), -1, 1)) * R2D;
    const port = [fz, -fx], side = (wfv[0] * port[0] + wfv[1] * port[1]) > 0 ? -1 : 1;
    if (side !== S.lastSide) { if (S.lastSide) { S.tackT = 3.4; flap(.16); setTimeout(winch, 1500); setTimeout(winch, 2300); } S.lastSide = side; }
    S.tackT = Math.max(0, S.tackT - dt);
    const BS = S.boat.userData.S; BS.side = side; BS.boom = clamp((awa - 22) * .72, 5, 80) * D2R * side; BS.jib = clamp((awa - 22) * .5, 7, 50) * D2R;
    BS.luff = Math.max(clamp(1 - (awa - 16) / 16, 0, 1), S.tackT > 1.4 ? .7 : 0); 
    /* SPINAKKER-JELENET (2026-11-12 01:34, tulajdonos: „hátszélben a spinakker kinyílása különösen szép – ahogy kibomlik, lobog, majd kifeszül a hajó fölött; ebből semmi nem
       jelenik meg… legyen gyönyörű, látványos jelenet, és amikor kijövök a hátszélből és leesik, az is legyen kidolgozott”):
       FELHÚZÁS (1,8 mp): az orrfedélzeti zsákból keskeny „kolbászként” kúszik fel az árboccsúcsig, csörlő kattog, a vászon verdes;
       SZÉTTERÜLÉS (1,7 mp): a rudat hátrahúzzák, a szkótát behúzzák – a vitorla szétnyílik és hevesen lobog;
       KIPATTANÁS (0,8 mp): a szél belekap, egy rántással kifeszül (túllendül, majd beáll), a hajó meglódul (a spinakker csak innentől húz);
       REPÜL: lélegzik, a belépő éle időnként behajlik;
       BEVÉTEL: előbb összeesik és lobog (0,9 mp), aztán összegyűjtve lecsúszik az orrfedélzetre (2,1 mp), és visszajön a fock. */
    { const SP = S.sp || (S.sp = { st: "down", t: 0 }), es = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }; SP.t += dt;
      const up = SP.st === "hoist" || SP.st === "spread" || SP.st === "pop" || SP.st === "fly";
      if (spin && !up) { SP.st = "hoist"; SP.t = 0; try { winch(); setTimeout(winch, 500); setTimeout(winch, 1000); flap(.08); } catch (e) {} }
      else if (!spin && up) { SP.st = "drop"; SP.t = 0; SP.h0 = BS.spH || 0; SP.f0 = BS.spF || 0; SP.s0 = BS.spS || 0; try { flap(.2); } catch (e) {} }
      if (SP.st === "hoist") { const u = SP.t / 1.8; BS.spH = es(u); BS.spS = .05 + .1 * u; BS.spF = 0; BS.spPop = 0; if (u >= 1) { SP.st = "spread"; SP.t = 0; try { flap(.14); winch(); } catch (e) {} } }
      else if (SP.st === "spread") { const u = SP.t / 1.7; BS.spH = 1; BS.spS = .15 + .85 * es(u); BS.spF = .28 * u; if (Math.floor(SP.t / .4) !== SP.fk) { SP.fk = Math.floor(SP.t / .4); try { flap(.07 + .05 * u); } catch (e) {} } if (u >= 1) { SP.st = "pop"; SP.t = 0; try { flap(.3); T.xr && T.xr.pulse && (T.xr.pulse("left", .6, 60), T.xr.pulse("right", .6, 60)); } catch (e) {} } }
      else if (SP.st === "pop") { const u = SP.t / .8; BS.spH = 1; BS.spS = 1; BS.spF = .28 + .72 * (1 - Math.pow(1 - clamp(u, 0, 1), 3)); BS.spPop = .24 * Math.sin(Math.PI * clamp(u, 0, 1)) * (1 - .4 * u); if (u >= 1) { SP.st = "fly"; SP.t = 0; } }
      else if (SP.st === "fly") { BS.spH = 1; BS.spS = 1; BS.spF = 1; BS.spPop = .035 * Math.sin(W.t * .9) * Math.exp(-SP.t * .15); }
      else if (SP.st === "drop") { const u1 = SP.t / .9, u2 = (SP.t - .7) / 2.1; BS.spF = SP.f0 * (1 - es(u1)); BS.spPop = 0; BS.spH = SP.h0 * (1 - es(u2)); BS.spS = SP.s0 + (.1 - SP.s0) * es(u2); if (u2 > .2 && Math.floor(SP.t / .5) !== SP.fk) { SP.fk = Math.floor(SP.t / .5); try { flap(.06); } catch (e) {} } if (u2 >= 1) { SP.st = "down"; SP.t = 0; } }
      if (SP.st === "down") { BS.spH = 0; BS.spS = .05; BS.spF = 0; BS.spPop = 0; BS.spin = 0; } else BS.spin = clamp(.08 + BS.spH * .35 + BS.spF * .6, .05, 1); }
    /* DŐLÉS – fizikai modell (kutatás alapján): a dőlő nyomaték ∝ látszólagos szélsebesség² × oldalerő-tényező(látszólagos szélszög) × cos^1,3(dőlés),
       a felállító nyomaték ∝ sin(dőlés). Az oldalerő éles szélben (cirkálás, 25–55°) a legnagyobb, félszélben kisebb (több hajtás, kevesebb dőlés),
       hátszélben szinte nulla (ott a spinakker inkább ringat). Felfelé fordulva nő a látszólagos szél és a dőlés, leesve csökken.
       Mozgásegyenlet csillapított lengéssel (~4,5 s sajátperiódus) – a széllökésre túllendül, majd beáll. */
    { /* a dőléshez a „valódi” (gyorsítás nélküli) hajósebességből számolt látszólagos szél kell – különben a VR-gyorsítás miatt a szél túl előre fordulna */
      const vR = S.v / VR_SPD, awH = [tw[0] + fx * vR, tw[1] + fz * vR], awsH = Math.hypot(awH[0], awH[1]), awaH = Math.acos(clamp((awH[0] * fx + awH[1] * fz) / (awsH || 1), -1, 1)) * R2D;
      const luffH = Math.max(clamp(1 - (awaH - 14) / 12, 0, 1), S.tackT > 1.4 ? .7 : 0);
      /* a vitorlák a valódi látszólagos szélhez trimmelnek (a VR-gyorsítás nélkül) – különben gyors haladásnál is belobognának */
      BS.awa = awaH; BS.aws = awsH; BS.gust = S.gk; BS.tackT = S.tackT; S.awaR = awaH;
      const F = (awsH * awsH) * heelCs(awaH) * (1 - luffH * .85) * (1 - BS.spin * .75 * clamp((awaH - 75) / 55, 0, 1)) * (1 + BS.spin * .5 * clamp(1 - (awaH - 75) / 45, 0, 1)), th = S.heel || 0, w0 = 1.4, zeta = .38;
      let M = (F * Math.pow(Math.cos(th), 1.3) - HEEL_KR * Math.sin(th)) / HEEL_KR;
      if (BS.spin > .5) M += Math.sin(.065) * Math.sin(W.t * 1.25) * clamp(aws / 9, 0, 1.4) * BS.spin;   /* spinakker alatt hátszélben ringatózás (oldalra-oldalra) */
      S.heelV = (S.heelV || 0) + (M * w0 * w0 - 2 * zeta * w0 * (S.heelV || 0)) * dt; S.heel = clamp(th + S.heelV * dt, -.2, .62);
      S.heelPen = S.heel > 22 * D2R ? 1 - (S.heel - 22 * D2R) / (30 * D2R) * .3 : 1;   /* túl nagy dőlésnél a hajó nem gyorsul tovább (kevésbé hatékony) */
      /* luvgierigkeit: dőlésben a hajó a szél felé „húz” – a kormánnyal kell ellentartani */
      S.yr += Math.sign(wrapA(S.wf - S.b)) * Math.max(0, S.heel) * .1 * Math.min(1, S.v / 5) * dt * 3; }
    BS.heel = -side * S.heel * .78;   /* látványban kicsit visszafogva (a kormányos helye le van horgonyozva) */
    /* mozgás a hullámokon: a lassú hajót dobálja a víz (jobban ring), a száguldó hajó kisimul – csak néha ugrik meg egy-egy hullámon */
    const hb = vrWave(S.x + fx * 6, S.z + fz * 6, W.t), hs2 = vrWave(S.x - fx * 6, S.z - fz * 6, W.t);
    const rockK = clamp(1.25 - S.v / 8, .28, 1.25);
    S.slam = (S.slam || 0) * Math.pow(.015, dt);
    if (S.v > 5 && S.prevHb != null && (hb - S.prevHb) / Math.max(dt, .001) > .45 && W.t - (S.slamT || 0) > 1.6 && Math.random() < .35) { S.slam = .03 + Math.random() * .02; S.slamT = W.t; S.sprayBurst = 1; }
    S.prevHb = hb;
    BS.pitch = clamp((hs2 - hb) / 12 * 1.1 * rockK, -.05, .05) - S.slam * Math.sin(Math.min(1, (W.t - (S.slamT || 0)) * 3) * Math.PI);
    BS.heel += Math.sin(W.t * .83 + 1.3) * .03 * rockK + Math.sin(W.t * 1.37) * .012 * rockK;
    S.boat.position.y = (hb + hs2) / 2 * .5 * rockK + S.slam * 3 * Math.sin(Math.min(1, (W.t - (S.slamT || 0)) * 3) * Math.PI);
    S.boat.userData.update(dt);
    /* permet: a hajó a root-ban áll (a világ mozog), ezért a cseppek hátrafelé sodródnak a hajó sebességével */
    if (S.spray) { const P = S.spray, bowZ = -HULL.L / 2 * VR_SC, k = clamp((S.v - 2) / 4.5, 0, 1.6), back = S.v * 1.7, bp = S.boat.position.y;
      P.acc += dt * (k * 820 + (S.sprayBurst ? 1300 : 0)); const burst = S.sprayBurst; S.sprayBurst = 0;
      while (P.acc > 1) { P.acc -= 1; const i = P.i; P.i = (P.i + 1) % P.N; const sd = Math.random() < .5 ? -1 : 1, bow = Math.random() < .62, b = i * 3;
        const z0 = bow ? bowZ + 1.2 + Math.random() * 1.6 : bowZ + 3 + Math.random() * 4.5, x0 = sd * (bow ? .35 + Math.random() * .5 : 1.7 + Math.random() * .4);
        P.pos[b] = x0; P.pos[b + 1] = bp + .15 + Math.random() * .2; P.pos[b + 2] = z0;
        const fl = !bow && !burst && Math.random() < .55;   /* habpelyhek a vízen: laposan, gyorsan suhannak hátra a hajó mellett */
        const up = fl ? .25 + Math.random() * .5 : (bow ? 2.2 : 1.2) + Math.random() * 2.4 * (.5 + k) + (burst ? 2.5 : 0), out = fl ? .5 + Math.random() * 1.6 : (bow ? 1.6 : 1.1) + Math.random() * 2.2 * (.4 + k);
        P.vel[b] = sd * out; P.vel[b + 1] = up; P.vel[b + 2] = back * (.6 + Math.random() * .4) - (bow ? 1.2 : 0);
        if (!bow && Math.random() < .5) {   /* 2026-11-12 08:18: a tatra felcsapó víz – látványosabb: a tat két sarkánál magasra csap, és a fedélzet fölé hull vissza */
          P.pos[b] = sd * (1.25 + Math.random() * .5); P.pos[b + 2] = -bowZ - .2 - Math.random() * 1.6; P.vel[b] = -sd * (.2 + Math.random() * 1.1); P.vel[b + 1] = (2.6 + Math.random() * 3.2) * (.5 + k) + (burst ? 2.5 : 0); P.vel[b + 2] = back * .25 - .6 + Math.random() * 1.2; }
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
    const mat = wm.userData.mat; S.wt = (S.wt == null ? W.t : S.wt) + dt * (.2 + .14 * clamp(S.v / 3, 0, 1)); mat.uniforms.uFlk.value = 1;   /* 2026-11-12 09:55: a hullámok lassabban vonulnak, és a vízhez RÖGZÍTETT habpelyhek/szélcsíkok mutatják a valódi haladást (ne tűnjön oldalra/hátra csúszásnak) */ mat.uniforms.uT.value = S.wt;   /* 2026-11-11: álló/lassú hajónál a hullámkép lassabban vonul – a keresztben futó hullámok „oldalra csúszás” érzetét keltették */ S.fox = (S.fox || 0) + fx * S.v * dt * 1.1; S.foz = (S.foz || 0) + fz * S.v * dt * 1.1; mat.uniforms.uOff.value.set(wm.position.x + S.fox, wm.position.z + S.foz);   /* sebességérzet: a víz mintázata ~2× gyorsabban fut el a hajó mellett (a fizika változatlan) */ mat.uniforms.uWind.value = Math.atan2(-wfv[1], -wfv[0]);
    const cw = new THREE.Vector3(); T.camObj().getWorldPosition(cw); mat.uniforms.uCam.value.copy(S.env.worldToLocal(cw));
    S.wake.push(S.x, S.z, Math.atan2(fx, fz), S.v, dt, .05);
    S.gulls.tick(dt, S.x, S.z);
    (S.spect || []).forEach((q) => { q.g.position.y = Math.sin(W.t * 1.1 + q.ph) * .08; q.g.rotation.z = Math.sin(W.t * .9 + q.ph) * .03; q.g.rotation.x = Math.sin(W.t * .7 + q.ph * 2) * .02; });
    /* verseny-állapot */
    S.t += dt;
    if (S.st === "pre") { [-30, -10, -5, -4, -3, -2, -1].forEach((tt) => { if (S.t >= tt && !S.horns[tt]) { S.horns[tt] = 1; if (tt === -30 || tt === -10) horn(.7, .14); else beep(); } }); if (S.t >= 0) { S.st = "race"; horn(1.5, .2);
        /* korai rajt (OCS): a rajtjelkor a vonal pálya felőli oldalán vagy → egyéni visszahívás, vissza kell menni a vonal mögé */
        S.started = false; S.pen = 0; S.penAcc = 0; S.penLast = 0; S.riv.forEach((q) => { q.pen = 0; q.spinA = null; q.penLast = 0; q._dP = null; });
        if (lineSide(S) > 0) { S.ocs = 1; S.msg = "Korai rajt! Fordulj vissza, és menj át újra a rajtvonalon."; S.msgT = 8; setTimeout(() => horn(.4, .14), 700); }
        else { S.msg = "RAJT! Menj át a két rajtbója KÖZÖTT, aztán irány az 1. bója"; S.msgT = 6; } S.guideT = W.t + 12; } }
    /* 2026-11-12 01:49 (tulajdonos: „ha nem a két rajtbója között halad el a hajó a rajtnál, az hibás rajt – vissza kell fordulnia, és szabályosan rajtolnia; addig nem számít rajtnak”):
       a rajt CSAK akkor érvényes, ha a hajó a rajtjel után a két bója KÖZÖTT lépi át a vonalat a pálya felé. Aki a bóján kívül kerüli meg a vonalat, annak vissza kell mennie
       a vonal mögé, és a két bója között újra átmennie – rád és az ellenfelekre egyformán. Amíg nincs érvényes rajt, a bójakerülés sem számít. */
    if (S.st === "race" && !S.started && !S.ocs && S.prevSide != null) { const ls = lineSide(S);
      if (S.prevSide <= 0 && ls > 0) { if (inGate(S)) { S.started = true; } else { S.ocs = 1; S.msg = "⚠ HIBÁS RAJT! Nem a két rajtbója között mentél át – fordulj vissza a vonal mögé, és rajtolj a két bója KÖZÖTT."; S.msgT = 9; beep(); setTimeout(beep, 250); } }
      else if (ls > 8 && !inGate(S)) { S.ocs = 1; S.msg = "⚠ HIBÁS RAJT! Megkerülted a rajtvonalat – fordulj vissza, és menj át a két bója KÖZÖTT."; S.msgT = 9; beep(); } }
    if (S.st === "race" && S.ocs) { const ls = lineSide(S); if (S.ocs === 1 && ls <= 0) S.ocs = 2; else if (S.ocs === 2 && ls > 0) { if (inGate(S)) { S.ocs = 0; S.started = true; S.msg = "✓ Szabályos rajt – irány az 1. bója"; S.msgT = 5; horn(.3, .1); } else { S.ocs = 1; S.msg = "⚠ Megint nem a két bója között mentél át – vissza a vonal mögé!"; S.msgT = 7; beep(); } } }
    /* bójakerülés: a bója 26 m-es körén belül; a bója bal kéz felől maradjon (a hajó a bója jobbján halad el) */
    if (S.st === "race" && !S.fin && !S.ocs && S.started) {
      if (S.next < S.marks.length) { const m = S.marks[S.next], d = Math.hypot(m.x - S.x, m.z - S.z), rc = vrRoundCheck(S, S.next);
        if (d < 45) S.nearMk = S.next + 1;
        if (rc === 1) { S.next++; S.nearMk = 0; S.guideT = W.t + 10; horn(.3, .1); S.msg = S.next < S.marks.length ? `✓ ${S.next}. bója megkerülve – jöhet a ${S.next + 1}.` : "✓ Utolsó bója megkerülve – irány a befutó: a két bója KÖZÖTT!"; S.msgT = 5; S.wrongT = 0; }
        else if (rc === -1 && (!S.wrongT || W.t - S.wrongT > 6)) { S.wrongT = W.t; S.msg = "⚠ Rossz irány! A bóját BAL kéz felől kell megkerülni – fordulj vissza, és kerüld meg az óramutatóval ellentétesen"; S.msgT = 6; S.guideT = W.t + 12; beep(); }
        else if (S.nearMk === S.next + 1 && d > 80) { S.nearMk = 0; S.msg = `⚠ Nem kerülted meg a(z) ${S.next + 1}. bóját! Vissza kell menned – enélkül nincs érvényes futam.`; S.msgT = 7; S.guideT = W.t + 15; beep(); setTimeout(beep, 250); } }
      else if (crossLine(S) && S.pen > 0) { S.msg = `⚠ ÉRVÉNYTELEN BEFUTÓ! Még ${S.pen} büntetőforduló (360°) hátravan – tedd meg, aztán fuss be újra.`; S.msgT = 9; beep(); setTimeout(beep, 250); }
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
    { const lineMid = { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 }, isGate = S.st === "pre" || !!S.ocs || S.next >= S.marks.length;
      courseTick(dt, isGate ? lineMid : tgt, { x: S.x, z: S.z }, isGate, !isGate); }   /* az útvonal mindig a hajódtól indul */
    S.arrow.visible = !S.fin && S.next < S.marks.length && S.st !== "pre" && !S.ocs; S.arrow.position.set(tgt.x, .25, tgt.z); S.arrow.children.forEach((m) => { m.material.opacity = .5 + .3 * Math.sin(W.t * 3); }); if (S.arrowRing) { S.arrowRing.rotation.y = W.t * .55; S.arrowRing.material.opacity = .8 + .18 * Math.sin(W.t * 4); }
    S.beam.position.set(tgt.x, 30, tgt.z); S.beam.visible = !S.fin && Math.hypot(tgt.x - S.x, tgt.z - S.z) > 35;   /* közel már a vízen lévő nyíl mutat */ S.beamLbl.visible = false; S.beamLbl.position.set(tgt.x, 14 + Math.sin(W.t * 1.5) * .4, tgt.z);
    { const dl = Math.hypot(tgt.x - S.x, tgt.z - S.z), kk = clamp(dl * .06, 5, 18); S.lblAr = S.lblAr || S.beamLbl.scale.y / S.beamLbl.scale.x; S.beamLbl.scale.set(kk, kk * S.lblAr, 1); S.beamLbl.position.y = 6 + kk * .6; }
    S.beamLbl.userData.set(S.ocs === 1 ? ["KORAI RAJT", "vissza a rajtvonal mögé"] : S.ocs === 2 ? ["RENDBEN", "most lépd át újra a vonalat"] : S.next < S.marks.length ? [`${S.next + 1}. bója`, `${Math.round(Math.hypot(tgt.x - S.x, tgt.z - S.z))} m · bal kéz felől kerüld`] : ["BEFUTÓ", "a rajtvonalon át"]);
    { const fl = S.cb.userData.flags; if (fl) { fl[0].visible = S.st === "pre" && S.t > -30 && S.t < -5; fl[2].visible = S.st !== "done"; if (fl[3]) fl[3].visible = !!S.ocs; }
      S.cdL.visible = S.st === "pre" || (S.st === "race" && S.t < 4); S.cdL.position.set(S.cb.position.x, 13 + Math.sin(W.t * 2) * .2, S.cb.position.z); S.cdL.userData.set(S.st === "pre" ? ["RAJT", mmss(S.t)] : ["RAJT!", "jó versenyt!"]); }
    S.lineM.material.opacity = S.st === "pre" || S.next >= S.marks.length ? .5 + .2 * Math.sin(W.t * 3) : .15;
    /* hangok */
    AU.set("rush", clamp((S.v - .8) / 4.5, 0, 1.25) * .11, .4); AU.set("wind", clamp(aws / (14 * KN), 0, 1.2) ** 1.5 * .07, .6); AU.set("water", .035, 1);
    /* 2026-11-11: a vízen és a levegőben NINCS több tábla, felirat, keringő jel, festett nyíl – csak a fényoszlop a következő célnál és a rajt-/célvonal két oszlopa */
    { const M = S.CM; if (M) { M.orbit.visible = false; M.sign.visible = false; if (M.gateL) M.gateL.visible = false; M.chev.visible = false; (M.garrows || []).forEach((m) => { m.visible = false; }); }
      S.arrow.visible = false; S.beamLbl.visible = false; S.beam.visible = !S.fin; }
    S.instT = (S.instT || 0) - dt; S.awa = awa; S.aws = aws; S.twa = twa; S.tgt = tgt;
    if (S.instT <= 0) { S.instT = .3; vrInstruments(); }
    W.panelDirty = (W.panelDirty || 0) + dt;
  }
  function lineSide(o) { const C = VRR.C; return (o.x - C.line.a.x) * C.u[0] + (o.z - C.line.a.z) * C.u[1]; }
  /* 2026-11-12 08:18 (tulajdonos: „szabálytalanság esetén a büntetés egy teljes fordulat a saját tengelyed körül. Lassítás nincs! Bármikor elvégezhető; amíg nincs
     megcsinálva, a befutó érvénytelen; a fedélzeti computer jelezze; több is összegyűlhet; ha egyszerre 3–4, csoportban jövő hajónak nem adom meg az útjogot, az EGY
     szabálytalanság; a visszaúton újra: még egy. Néha a többi hajó is szabálytalankodik, ahogy az életben.”) */
  function vrFoulMe(r) { const S = VRR; if (S.penLast && W.t - S.penLast < 25) { S.penLast = W.t; return; } S.penLast = W.t; S.pen = (S.pen || 0) + 1; S.penAcc = 0;
    S.msg = `⚠ SZABÁLYSÉRTÉS! A(z) ${r.o.name} hajónak útjoga volt. Büntetés: ${S.pen} teljes fordulat (360°) – bármikor megteheted, de befutó előtt le kell tudnod.`; S.msgT = 9; beep(); setTimeout(beep, 250); W.panelDirty = 1; }
  function vrFoulRiv(r) { const S = VRR; if (r.penLast && W.t - r.penLast < 25) { r.penLast = W.t; return; } r.penLast = W.t; r.pen = (r.pen || 0) + 1;
    S.msg = `A(z) ${r.o.name} szabálytalan volt (neked volt útjogod) – büntetőfordulót kell tennie.`; S.msgT = 6; W.panelDirty = 1; }
  function inGate(o) { const C = VRR.C, along = (o.x - C.line.a.x) * C.c[0] + (o.z - C.line.a.z) * C.c[1], L = Math.hypot(C.line.b.x - C.line.a.x, C.line.b.z - C.line.a.z); return along > -2 && along < L + 2; }   /* a rajtvonal két bójája KÖZÖTT van-e */
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
    else if (!fin) { const m = S.marks[r.next], O = vrMarkO(r.next), off = 13 + (r.wide || 0); tx = m.x + O[0] * off + O[1] * 7; tz = m.z + O[1] * off - O[0] * 7; }   /* a kerülési félegyenesen, kicsit túl rajta – így biztosan átlépi, bal kéz felől hagyva a bóját */
    else { tx = (C.line.a.x + C.line.b.x) / 2; tz = (C.line.a.z + C.line.b.z) / 2; tx -= C.u[0] * 15; tz -= C.u[1] * 15; }
    if (S.st === "race" && !r.started) { const ls = lineSide(r), mx = (C.line.a.x + C.line.b.x) / 2 + C.c[0] * (-14 + r.i * 14), mz = (C.line.a.z + C.line.b.z) / 2 + C.c[1] * (-14 + r.i * 14);
      const crossed = r._ls0 != null && r._ls0 <= 0 && ls > 0 && inGate(r); r._ls0 = ls;
      if (crossed) r.started = true;
      else if (ls > 0) { tx = mx - C.u[0] * 30; tz = mz - C.u[1] * 30; }   /* a vonal rossz oldalán van érvényes rajt nélkül: vissza a vonal mögé */
      else { tx = mx + C.u[0] * 16; tz = mz + C.u[1] * 16; } }             /* a vonal mögül: a két bója között át */
    if (r.fin) { tx = r.x + vfwd(r.b)[0] * 50; tz = r.z + vfwd(r.b)[1] * 50; }
    /* életszerű hibák: néha nem veszi észre a másik hajót, elrontja a fordulót, késve fordul vagy túl nagy ívben kerül */
    if (S.st === "race" && !r.fin) { if (!r.errNext) r.errNext = W.t + rr(18, 45); if (W.t > r.errNext) { r.errNext = W.t + rr(25, 60); const k = rand(); if (k < .36) r.errGW = W.t + 10; else if (k < .55) { r.v *= .5; r.tack = -r.tack; r.lastTack = W.t; } else if (k < .8) r.lastTack = W.t - 2; else r.wide = rr(20, 38); } }
    const brgW = Math.atan2(tx - r.x, -(tz - r.z));
    let want = brgW;
    const rel = wrapA(brgW - S.wf);
    const cross = (r.x * C.c[0] + r.z * C.c[1]);
    if (Math.abs(rel) < 44 * D2R) { want = S.wf + r.tack * 44 * D2R;
      if (W.t - r.lastTack > 10 && ((r.tack > 0 && rel <= -40 * D2R) || (r.tack < 0 && rel >= 40 * D2R) || (Math.abs(cross) > 170 && Math.sign(cross) === r.tack))) { r.tack = -r.tack; r.lastTack = W.t; want = S.wf + r.tack * 44 * D2R; } }
    else if (Math.abs(rel) > 155 * D2R && S.st === "race") { want = S.wf + Math.PI - r.tack * 25 * D2R; const relD = wrapA(brgW - S.wf - Math.PI);
      if (W.t - r.lastTack > 14 && ((r.tack > 0 && relD >= 22 * D2R) || (r.tack < 0 && relD <= -22 * D2R))) { r.tack = -r.tack; r.lastTack = W.t; } }
    /* ütközés elkerülése (a saját hajónkkal és egymással) */
    [S].concat(S.riv).forEach((o) => { if (o === r) return; const dx = o.x - r.x, dz = o.z - r.z, d = Math.hypot(dx, dz); if (d >= 40) return;
      const brg = wrapA(Math.atan2(dx, -dz) - r.b), ahead = Math.abs(brg) < 1.9, racing = S.st === "race" && !r.fin && !o.fin, gw = racing ? vrGiveWay(r, o) : true, careless = (r.errGW || 0) > W.t;
      if (gw && !careless) { if (d < 36 && ahead) want += (brg > 0 ? -1 : 1) * .7 * (1 - d / 36); }
      else if (d < 9) want += (brg > 0 ? -1 : 1) * .35 * (1 - d / 9);   /* az útjogos tartja az irányát, csak az utolsó pillanatban tér ki */
      if (o === S && racing && !gw) { const closing = r._dS != null && d < r._dS - .002; if (d < 26 && closing && Math.abs(wrapA(Math.atan2(-dx, dz) - S.b)) < 1.7 && (!S.hailT || W.t - S.hailT > 8)) { S.hailT = W.t; S.msg = `„BACKBORD!!! BACKBORD!!!” – a(z) ${r.o.name} hajónak útjoga van: TÉRJ KI AZONNAL!`; S.msgT = 6; vrHail("Bekbord!"); } }
      if (o === S) r._dS = d; });
    /* a kitérés se fordítsa a hajót a szélbe (holtszög): legalább 40°-kal a szél mellett maradjon */
    { const relW = wrapA(want - S.wf); if (Math.abs(relW) < 40 * D2R) want = S.wf + (relW === 0 ? r.tack : Math.sign(relW)) * 40 * D2R; }
    /* egymásba se csússzanak: fizikai szétválasztás */
    S.riv.forEach((o) => { if (o === r) return; const dx = r.x - o.x, dz = r.z - o.z, d = Math.hypot(dx, dz); if (d < 9 && d > .01) { const k = (9 - d) / 2; r.x += dx / d * k; r.z += dz / d * k; o.x -= dx / d * k; o.z -= dz / d * k; } });
    /* AZONOS FIZIKA (2026. nov. 9., a tulajdonos kérésére: „mindenkire ugyanaz a fizikai törvény vonatkozzon”):
       az ellenfél is kormánylapáttal fordul (ugyanaz a fordulási képlet, mint nálad), ugyanaz a poláris diagram, ugyanaz a széllökés,
       ugyanaz a gyorsulás/lassulás, a túldőlés büntetése és a luvgierigkeit; nincs „ügyességi” sebességbónusz. A gépi kormányos csak a
       kormányt kezeli – ugyanúgy nem tud a szél felé 38°-nál élesebben haladni, mint te. */
    if (r.pen > 0 && S.st === "race" && !r.fin) { let free = Math.hypot(S.x - r.x, S.z - r.z) > 28; S.riv.forEach((o) => { if (o !== r && Math.hypot(o.x - r.x, o.z - r.z) < 22) free = false; });
      if (r.spinA != null || free) { if (r.spinA == null) { r.spinA = 0; r.spinD = r.tack || 1; } want = r.b + r.spinD * 1.2; } }
    r.del = clamp(wrapA(want - r.b) * 1.5, -.55, .55);
    { const yrT = Math.sin(r.del) * (.085 * r.v + .24); r.yr = (r.yr || 0) + (yrT - (r.yr || 0)) * Math.min(1, dt * 3.2); }
    r.b = (r.b + r.yr * dt + TAU) % TAU;
    if (r.spinA != null) { r.spinA += Math.abs(r.yr * dt); if (r.spinA >= TAU) { r.spinA = null; r.pen--; r.lastTack = W.t; } }
    const twa = Math.abs(wrapA(S.wf - r.b)) * R2D; r.spinOn = r.spinOn ? twa > 98 : twa > 108; const spin = r.spinOn && S.st === "race";
    const heelPen = (r.heel || 0) > 22 * D2R ? 1 - ((r.heel || 0) - 22 * D2R) / (30 * D2R) * .3 : 1;
    const vt = polar(twa, spin) * KN * VR_SPD * heelPen * (S.st === "pre" ? .7 : 1) * (S.tws * (S.gk || 1) / (12 * KN)) ** .5 * (1 + .08 * Math.sin(W.t * .23) * Math.sin(W.t * .07)) * (r.fin ? .4 : 1);
    r.v += (vt - r.v) * Math.min(1, dt / (vt > r.v ? 2.8 : 5)); r.v *= 1 - Math.abs(r.del) * .16 * dt;
    r.yr += Math.sign(wrapA(S.wf - r.b)) * Math.max(0, r.heel || 0) * .1 * Math.min(1, r.v / 5) * dt * 3;
    const f = vfwd(r.b); r.x += f[0] * r.v * dt; r.z += f[1] * r.v * dt;
    /* bójakerülés: ugyanaz a szabály, mint nálad (26 m-en belül, a bója a hajó BAL oldalán) */
    if (S.st === "race" && !r.fin && r.started && !(fin && r.pen > 0)) { if (!fin) { if (vrRoundCheck(r, r.next) === 1) { r.next++; r.wide = 0; } } else if (crossLine(r)) { r.fin = S.t; S.res.push({ n: r.o.name, t: S.t }); horn(.4, .06); } }
    r.prevSide = lineSide(r);
    /* ütközés a saját hajónkkal: szétlöki a két hajót, mindkettő lelassul, koppanás és kiabálás helyett kürt */
    { const dx = r.x - S.x, dz = r.z - S.z, d = Math.hypot(dx, dz); if (d < 7.5 && d > .01) { const k = (7.5 - d) / 2; r.x += dx / d * k; r.z += dz / d * k; S.x -= dx / d * k; S.z -= dz / d * k;
      if (!r.bumpT || W.t - r.bumpT > 3) { r.bumpT = W.t; r.v *= .6; S.v *= .6; try { const a2 = T.ac(); if (a2) { const s2 = a2.createBufferSource(); s2.buffer = T.noiseBuf(.6); const f2 = a2.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 220; const g2 = a2.createGain(); g2.gain.setValueAtTime(.35, a2.currentTime); g2.gain.exponentialRampToValueAtTime(.001, a2.currentTime + .6); s2.connect(f2).connect(g2).connect(T.outBus()); s2.start(); } } catch (e) {} const mine = S.st === "race" && !S.fin && !r.fin ? vrGiveWay(S, r) : false;
        if (S.st !== "race" || S.fin || r.fin) { S.msg = "Koccanás a(z) " + r.o.name + " hajóval!"; S.msgT = 3; }
        else if (mine) { vrFoulMe(r); vrHail("Bekbord! Protest!"); }
        else vrFoulRiv(r); } } }
    /* 2026-11-12 08:18 (tulajdonos): szabálytalanság = az útjogos hajó elé vágni / nem kitérni (közeli keresztezés), nem csak a koccanás. */
    if (S.st === "race" && !S.fin && !r.fin && S.started && r.started) { const dx = r.x - S.x, dz = r.z - S.z, d = Math.hypot(dx, dz), cl = r._dP != null && d < r._dP - .001; r._dP = d;
      if (d < 12 && cl) { if (vrGiveWay(S, r)) { if (Math.abs(wrapA(Math.atan2(-dx, dz) - r.b)) < 1.1) vrFoulMe(r); } else if (Math.abs(wrapA(Math.atan2(dx, -dz) - S.b)) < 1.1) vrFoulRiv(r); } }
    /* megjelenítés */
    r.g.position.set(r.x, Math.sin(W.t * 1.5 + r.ph) * .06, r.z); r.g.rotation.y = Math.atan2(f[0], f[1]);
    const OS = r.g.userData.S, wfv = vfwd(S.wf), yaw = r.g.rotation.y, Xv = [Math.cos(yaw), -Math.sin(yaw)];
    OS.side = (wfv[0] * Xv[0] + wfv[1] * Xv[1]) > 0 ? -1 : 1; OS.boom = clamp((twa - 28) * .78, 7, 82) * D2R * OS.side; OS.jib = clamp((twa - 28) * .55, 8, 52) * D2R; OS.luff = clamp(1 - (twa - 18) / 18, 0, 1);
    OS.spin += ((spin ? 1 : 0) - OS.spin) * Math.min(1, dt * .35);
    { const tw2 = [wfv[0] * S.tws * (S.gk || 1), wfv[1] * S.tws * (S.gk || 1)], aw2 = [tw2[0] + f[0] * r.v / VR_SPD, tw2[1] + f[1] * r.v / VR_SPD], aws2 = Math.hypot(aw2[0], aw2[1]), awa2 = Math.acos(clamp((aw2[0] * f[0] + aw2[1] * f[1]) / (aws2 || 1), -1, 1)) * R2D;
      OS.awa = awa2; OS.aws = aws2; OS.gust = S.gk || 1; r.heel = (r.heel || 0) + (heelEq(awa2, aws2) * (1 - OS.spin * .75 * clamp((awa2 - 75) / 55, 0, 1)) * (1 + OS.spin * .5 * clamp(1 - (awa2 - 75) / 45, 0, 1)) - (r.heel || 0)) * Math.min(1, dt * 1.2); OS.heel = -OS.side * r.heel + (OS.spin > .5 ? Math.sin(W.t * 1.2 + r.ph) * .05 : 0); } OS.pitch = Math.sin(W.t * 1.2 + r.ph) * .025;
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
  /* 2026-11-11 (a tulajdonos kérése): verseny közben nem olvasni kell, hanem LÁTNI. A kokpitban két műszer van:
     RADAR (felülnézet: a hajó középen, orr felfelé; bóják számozva, a következő kiemelve és vonallal összekötve; célvonal; ellenfelek; sarokban sebesség és idő)
     és SZÉLMŰSZER (tárcsa: honnan fúj a szél a hajóhoz képest, a piros sáv a holtszög; középen a szélerősség csomóban). */
  /* 2026-11-12 08:27 (tulajdonos: „a fedélzeti computer legyen rendkívül kidolgozott és nagyon részletes – erről kap minden tájékoztatást a versenyző: a saját hajó,
     a többi hajó, a bója helyzete, és mutassa, hogyan fordulok a bója körül; látványos, szép, részletgazdag műszer”): teljes térképplotter –
     felső sáv (cél, távolság, érkezési idő, állapotjelző), térkép (iránytűgyűrű, távolsággyűrűk, szél és holtszög, cirkálóhatárok, pálya, ajánlott kerülési ív nyilakkal,
     26 m-es kerülési zóna, saját nyomvonal és irányvonal, ellenfelek névvel és sebességvektorral, rajt-/célkapu), alsó sáv (idő, hely, sebesség, VMG, irány, szél) és rangsor. */
  function vrChart() {
    const S = VRR, t = S.ck.chartT; if (!t) return; const g = t._canvas.getContext("2d"), W2 = 1024, C = S.C;
    const cx = W2 / 2, cy = 520, RR = 330, RCOL = ["#7fd3ff", "#b6f09c", "#f5a6ff", "#ffd9a0"];
    const bgG = g.createLinearGradient(0, 0, 0, W2); bgG.addColorStop(0, "#061726"); bgG.addColorStop(1, "#020a12"); g.fillStyle = bgG; g.fillRect(0, 0, W2, W2);
    const lineMid = { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 }, gate = S.st === "pre" || !!S.ocs || (S.st === "race" && !S.started) || S.next >= S.marks.length, tg = gate ? lineMid : S.marks[S.next];
    const dT = Math.hypot(tg.x - S.x, tg.z - S.z), span = clamp(dT * 1.12, 90, 1200), k = RR / span, c0 = Math.cos(-S.b), s0 = Math.sin(-S.b);
    const P = (x, z) => { const dx = x - S.x, dz = z - S.z; return [cx + (dx * c0 - dz * s0) * k, cy + (dx * s0 + dz * c0) * k]; };
    const dir = (brg) => { const a = brg - S.b; return [Math.sin(a), -Math.cos(a)]; };   /* világirány → képernyőirány (a hajó orra felül) */
    const brgT = Math.atan2(tg.x - S.x, -(tg.z - S.z)), relT = wrapA(brgT - S.b), vmg = S.v * Math.cos(relT), eta = vmg > .4 ? dT / vmg : null;
    /* nyomvonal gyűjtése */
    if (!S.trail || S.trailL !== S.lvl || S.t < -44) { S.trail = []; S.trailL = S.lvl; } if (!S.trailT || W.t - S.trailT > 1.2) { S.trailT = W.t; S.trail.push(S.x, S.z); if (S.trail.length > 240) S.trail.splice(0, 2); }
    /* ---------- térkép */
    g.save(); g.beginPath(); g.arc(cx, cy, RR, 0, TAU); const wg = g.createRadialGradient(cx, cy, 20, cx, cy, RR); wg.addColorStop(0, "#0d3a5c"); wg.addColorStop(1, "#06243a"); g.fillStyle = wg; g.fill(); g.clip();
    /* holtszög (a szélbe ±38°): halvány piros cikk a hajótól */
    { const w = dir(S.wf), a = Math.atan2(w[1], w[0]); g.fillStyle = "rgba(229,57,47,.16)"; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, RR, a - 38 * D2R, a + 38 * D2R); g.closePath(); g.fill();
      g.strokeStyle = "rgba(229,57,47,.55)"; g.lineWidth = 2; [-38, 38].forEach((d) => { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a + d * D2R) * RR, cy + Math.sin(a + d * D2R) * RR); g.stroke(); }); }
    /* távolsággyűrűk + szálkereszt */
    const step = span > 700 ? 200 : span > 300 ? 100 : span > 140 ? 50 : 25; g.lineWidth = 2; g.font = "600 22px system-ui"; g.textAlign = "left";
    for (let r = step; r * k < RR; r += step) { g.strokeStyle = "rgba(127,211,255,.22)"; g.setLineDash([6, 8]); g.beginPath(); g.arc(cx, cy, r * k, 0, TAU); g.stroke(); g.setLineDash([]); g.fillStyle = "rgba(127,211,255,.75)"; g.fillText(r + " m", cx + 8, cy - r * k - 5); }
    g.strokeStyle = "rgba(127,211,255,.12)"; g.beginPath(); g.moveTo(cx - RR, cy); g.lineTo(cx + RR, cy); g.moveTo(cx, cy - RR); g.lineTo(cx, cy + RR); g.stroke();
    /* cirkálóhatárok (layline) a következő bójához: a szélhez ±42°-on húzott zöld szaggatott vonalak */
    if (!gate) { const b = P(tg.x, tg.z); g.strokeStyle = "rgba(124,252,154,.45)"; g.lineWidth = 3; g.setLineDash([10, 10]); [-42, 42].forEach((d) => { const v = dir(S.wf + Math.PI + d * D2R); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] + v[0] * RR * 2, b[1] + v[1] * RR * 2); g.stroke(); }); g.setLineDash([]); }
    /* a pálya: rajt → bóják → cél */
    const way = [lineMid].concat(S.marks.map((m) => ({ x: m.x, z: m.z })), [lineMid]);
    for (let i = 0; i < way.length - 1; i++) { const a = P(way[i].x, way[i].z), b = P(way[i + 1].x, way[i + 1].z); g.setLineDash([14, 12]); g.lineWidth = 4; g.strokeStyle = i < S.next ? "rgba(160,180,200,.2)" : "rgba(255,209,102,.5)"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } g.setLineDash([]);
    /* saját nyomvonal (halványuló) */
    { const T2 = S.trail, n = T2.length / 2; for (let i = 1; i < n; i++) { const a = P(T2[i * 2 - 2], T2[i * 2 - 1]), b = P(T2[i * 2], T2[i * 2 + 1]); g.strokeStyle = `rgba(255,120,100,${.12 + .55 * i / n})`; g.lineWidth = 4; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
    /* rajt-/célkapu */
    { const a = P(C.line.a.x, C.line.a.z), b = P(C.line.b.x, C.line.b.z); g.strokeStyle = gate ? "#7CFC9A" : "rgba(255,255,255,.65)"; g.lineWidth = gate ? 10 : 5; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      [a, b].forEach((q) => { g.fillStyle = gate ? "#7CFC9A" : "#ffffff"; g.beginPath(); g.arc(q[0], q[1], gate ? 14 : 9, 0, TAU); g.fill(); g.strokeStyle = "#04121f"; g.lineWidth = 3; g.stroke(); });
      if (gate) { const m = P(lineMid.x, lineMid.z), u = dir(Math.atan2(C.u[0], -C.u[1]) + (S.next >= S.marks.length && S.started ? Math.PI : 0)), ph = (W.t * .9) % 1; g.fillStyle = "#7CFC9A"; for (let j = 0; j < 3; j++) { const o = (j + ph) * 26 - 40, x = m[0] + u[0] * o, y = m[1] + u[1] * o; g.globalAlpha = .35 + .2 * j; g.beginPath(); g.moveTo(x + u[0] * 16, y + u[1] * 16); g.lineTo(x - u[1] * 18, y + u[0] * 18); g.lineTo(x + u[1] * 18, y - u[0] * 18); g.closePath(); g.fill(); } g.globalAlpha = 1;
        g.fillStyle = "#7CFC9A"; g.font = "800 26px system-ui"; g.textAlign = "center"; g.fillText(S.next >= S.marks.length && S.started ? "CÉL" : "RAJT", m[0], m[1] - 22); } }
    /* egyenes irányvonal a célig + a hajó orrvonala */
    { const b = P(tg.x, tg.z); g.strokeStyle = "#ffd166"; g.lineWidth = 5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(b[0], b[1]); g.stroke();
      g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 3; g.setLineDash([4, 10]); g.beginPath(); g.moveTo(cx, cy - 40); g.lineTo(cx, cy - RR); g.stroke(); g.setLineDash([]); }
    /* bóják; a soron következőnél: 26 m-es kerülési zóna, AJÁNLOTT KERÜLÉSI ÍV futó nyilakkal (a bója bal kéz felől marad) */
    S.marks.forEach((m, i) => { const [x, y] = P(m.x, m.z), cur = i === S.next && !gate, done = i < S.next, r = cur ? 30 : 20;
      if (cur) { const Rz = Math.max(26 * k, r + 26), Ra = Math.max(15 * k, r + 14);
        g.fillStyle = "rgba(255,225,77,.10)"; g.beginPath(); g.arc(x, y, Rz, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,225,77,.6)"; g.lineWidth = 3; g.setLineDash([8, 8]); g.beginPath(); g.arc(x, y, Rz, 0, TAU); g.stroke(); g.setLineDash([]);
        /* a hajó felőli oldalról indulva, az óramutatóval ELLENTÉTESEN körbe (képernyőn: csökkenő szög) */
        const a0 = Math.atan2(cy - y, cx - x) - .9, sweep = Math.PI * 1.5; g.strokeStyle = "#ffe14d"; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.arc(x, y, Ra, a0, a0 - sweep, true); g.stroke(); g.lineCap = "butt";
        const ph = (W.t * .5) % 1; for (let j = 0; j < 5; j++) { const th = a0 - sweep * ((j + ph) / 5), ex = x + Ra * Math.cos(th), ey = y + Ra * Math.sin(th), tx = Math.sin(th), ty = -Math.cos(th), nx = Math.cos(th), ny = Math.sin(th);
          g.fillStyle = "#fff6b0"; g.strokeStyle = "#7a5b00"; g.lineWidth = 2; g.beginPath(); g.moveTo(ex + tx * 20, ey + ty * 20); g.lineTo(ex + nx * 14 - tx * 8, ey + ny * 14 - ty * 8); g.lineTo(ex - nx * 14 - tx * 8, ey - ny * 14 - ty * 8); g.closePath(); g.fill(); g.stroke(); }
        g.fillStyle = "#ffe14d"; g.font = "800 24px system-ui"; g.textAlign = "center"; g.fillText("BAL KÉZ FELŐL ↺", x, y - Rz - 10); }
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = done ? "#2fbf71" : cur ? "#ffb703" : "#ff7a00"; g.fill(); g.lineWidth = 4; g.strokeStyle = "#fff"; g.stroke();
      g.fillStyle = done ? "#ffffff" : "#0b1b2a"; g.font = `900 ${cur ? 38 : 26}px system-ui`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(done ? "✓" : String(i + 1), x, y + 2); g.textBaseline = "alphabetic"; });
    /* ellenfelek: hajótest-alak, sebességvektor, név; aki büntetőben van: piros gyűrű */
    S.riv.forEach((r, i) => { const [x, y] = P(r.x, r.z), col = RCOL[i % RCOL.length], v = dir(r.b), L = clamp(r.v * 6 * k, 14, 70);
      g.strokeStyle = col; g.globalAlpha = .7; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + v[0] * (L + 20), y + v[1] * (L + 20)); g.stroke(); g.globalAlpha = 1;
      g.save(); g.translate(x, y); g.rotate(r.b - S.b); g.fillStyle = col; g.strokeStyle = "#04121f"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -24); g.quadraticCurveTo(13, -6, 10, 18); g.lineTo(-10, 18); g.quadraticCurveTo(-13, -6, 0, -24); g.closePath(); g.fill(); g.stroke(); g.restore();
      if (r.pen > 0) { g.strokeStyle = "#ff4b3a"; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 32, 0, TAU); g.stroke(); }
      const nm = String(r.o.name || "").split(" ")[0].slice(0, 9); g.font = "700 22px system-ui"; g.textAlign = "left"; g.lineWidth = 5; g.strokeStyle = "#04121f"; g.strokeText(nm, x + 18, y - 14); g.fillStyle = col; g.fillText(nm, x + 18, y - 14); });
    /* saját hajó: nagy, piros hajótest, fehér szegéllyel, vitorlával a szél alatti oldalon */
    g.save(); g.translate(cx, cy); g.shadowColor = "rgba(255,90,70,.9)"; g.shadowBlur = 22; g.fillStyle = "#ff4b3a"; g.strokeStyle = "#ffffff"; g.lineWidth = 5; g.beginPath(); g.moveTo(0, -44); g.quadraticCurveTo(24, -12, 18, 34); g.lineTo(-18, 34); g.quadraticCurveTo(-24, -12, 0, -44); g.closePath(); g.fill(); g.shadowBlur = 0; g.stroke();
    { const ws = wrapA(S.wf - S.b) > 0 ? -1 : 1; g.strokeStyle = "#ffffff"; g.lineWidth = 5; g.beginPath(); g.moveTo(0, -18); g.quadraticCurveTo(ws * 16, 2, ws * 14, 26); g.stroke(); }
    g.restore();
    g.restore();
    /* ---------- iránytűgyűrű a térkép körül (a hajó orra felül; É/K/D/Ny forog) */
    g.strokeStyle = "#2f5f80"; g.lineWidth = 34; g.beginPath(); g.arc(cx, cy, RR + 17, 0, TAU); g.stroke(); g.strokeStyle = "#8fc7ea"; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, RR, 0, TAU); g.stroke(); g.beginPath(); g.arc(cx, cy, RR + 34, 0, TAU); g.stroke();
    for (let d = 0; d < 360; d += 10) { const v = dir(d * D2R), big = d % 30 === 0, r0 = RR + 2, r1 = RR + (big ? 16 : 9); g.strokeStyle = "#e9f6ff"; g.lineWidth = big ? 3 : 1.5; g.beginPath(); g.moveTo(cx + v[0] * r0, cy + v[1] * r0); g.lineTo(cx + v[0] * r1, cy + v[1] * r1); g.stroke();
      if (d % 90 === 0) { g.fillStyle = d ? "#e9f6ff" : "#ff6a5a"; g.font = "900 26px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(["É", "K", "D", "Ny"][d / 90], cx + v[0] * (RR + 22), cy + v[1] * (RR + 22)); g.textBaseline = "alphabetic"; } }
    /* orrjelző (fent) */
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(cx, cy - RR + 4); g.lineTo(cx - 14, cy - RR - 22); g.lineTo(cx + 14, cy - RR - 22); g.closePath(); g.fill();
    /* szélnyíl: a gyűrűn kívülről a hajó felé fúj */
    { const w = dir(S.wf), a = Math.atan2(w[1], w[0]), px = cx + w[0] * (RR + 62), py = cy + w[1] * (RR + 62); g.save(); g.translate(px, py); g.rotate(a + Math.PI / 2); g.fillStyle = "#58c7ff"; g.strokeStyle = "#04121f"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 30); g.lineTo(22, -6); g.lineTo(9, -6); g.lineTo(9, -30); g.lineTo(-9, -30); g.lineTo(-9, -6); g.lineTo(-22, -6); g.closePath(); g.fill(); g.stroke(); g.restore(); }
    /* a cél iránya a gyűrűn (sárga háromszög) */
    { const v = dir(brgT); g.save(); g.translate(cx + v[0] * (RR + 17), cy + v[1] * (RR + 17)); g.rotate(Math.atan2(v[1], v[0]) + Math.PI / 2); g.fillStyle = "#ffd166"; g.strokeStyle = "#04121f"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -17); g.lineTo(15, 13); g.lineTo(-15, 13); g.closePath(); g.fill(); g.stroke(); g.restore(); }
    /* ---------- felső sáv */
    const pill = (x, y, w, h, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, 16); g.fill(); };
    pill(12, 10, 1000, 112, "rgba(10,34,54,.95)"); g.strokeStyle = "#2f5f80"; g.lineWidth = 3; g.beginPath(); g.roundRect(12, 10, 1000, 112, 16); g.stroke();
    g.textAlign = "left"; g.fillStyle = "#ffd166"; g.font = "800 30px system-ui"; g.fillText(gate ? (S.next >= S.marks.length && S.started ? "CÉLVONAL" : "RAJTVONAL") : `${S.next + 1}. BÓJA / ${S.marks.length}`, 30, 46);
    g.fillStyle = "#ffffff"; g.font = "900 62px system-ui"; g.fillText(Math.round(dT) + " m", 30, 108);
    g.textAlign = "center"; g.fillStyle = "#7fd3ff"; g.font = "700 26px system-ui"; g.fillText("ÉRKEZÉS", 420, 46); g.fillStyle = "#ffffff"; g.font = "800 54px system-ui"; g.fillText(eta != null && eta < 3600 ? mmss(eta) : "–:––", 420, 106);
    g.fillStyle = "#7fd3ff"; g.font = "700 26px system-ui"; g.fillText("KORMÁNYOZZ", 620, 46); g.fillStyle = Math.abs(relT) < .12 ? "#7CFC9A" : "#ffffff"; g.font = "800 54px system-ui"; g.fillText(Math.abs(relT) < .06 ? "✓ jó" : (relT > 0 ? "▶ " : "◀ ") + Math.round(Math.abs(relT) * R2D) + "°", 620, 106);
    { const st = S.pen > 0 ? ["BÜNTETŐ", S.pen + " × 360°", "#b3261e"] : S.ocs ? ["HIBÁS RAJT", "vissza!", "#b3261e"] : S.st === "pre" ? ["RAJTIG", mmss(-S.t), "#1f6fb5"] : S.fin ? ["BEFUTOTTÁL", mmss(S.fin), "#1e8e4f"] : !S.started ? ["RAJT!", "a kapun át", "#c98a00"] : ["VERSENY", mmss(S.t), "#1e8e4f"];
      pill(772, 18, 232, 96, st[2]); g.textAlign = "center"; g.fillStyle = "#ffffff"; g.font = "800 26px system-ui"; g.fillText(st[0], 888, 50); g.font = "900 44px system-ui"; g.fillText(st[1], 888, 100); }
    /* ---------- rangsor (bal alsó sarok a térkép mellett) */
    { const prog = (o) => (o.fin ? 1e6 - o.fin : 0) + (o.next || 0) * 1e4 - (o.next < S.marks.length ? Math.hypot(S.marks[o.next].x - o.x, S.marks[o.next].z - o.z) : Math.hypot(lineMid.x - o.x, lineMid.z - o.z));
      const all = [S].concat(S.riv).sort((a, b) => prog(b) - prog(a)); g.textAlign = "left"; g.font = "700 22px system-ui";
      all.forEach((o, i) => { const me = o === S, y = 786 + i * 27, col = me ? "#ff6a5a" : RCOL[S.riv.indexOf(o) % RCOL.length]; g.fillStyle = col; g.beginPath(); g.arc(26, y - 8, 8, 0, TAU); g.fill();
        g.fillStyle = me ? "#ffffff" : "#cfe3f2"; g.fillText(`${i + 1}. ${me ? "Zephyr (te)" : String(o.o.name || "").slice(0, 12)}${o.pen > 0 ? " ⚠" : ""}`, 42, y); }); }
    /* szél a jobb alsó sarokban */
    { g.textAlign = "right"; g.fillStyle = "#58c7ff"; g.font = "700 22px system-ui"; g.fillText("SZÉL", 1004, 790); g.fillStyle = "#ffffff"; g.font = "800 40px system-ui"; g.fillText(((S.tws * (S.gk || 1)) / KN).toFixed(0) + " cs", 1004, 832);
      g.fillStyle = (S.twa || 0) < 38 ? "#ff6a5a" : "#cfe3f2"; g.font = "700 26px system-ui"; g.fillText("szélszög " + Math.round(S.twa || 0) + "°", 1004, 866); }
    /* ---------- alsó sáv: idő, hely, sebesség, VMG, irány */
    pill(12, 902, 1000, 112, "rgba(10,34,54,.95)"); g.strokeStyle = "#2f5f80"; g.lineWidth = 3; g.beginPath(); g.roundRect(12, 902, 1000, 112, 16); g.stroke();
    const cell = (i, lbl, val, col) => { const x = 12 + 200 * i + 100; g.textAlign = "center"; g.fillStyle = "#7fd3ff"; g.font = "700 24px system-ui"; g.fillText(lbl, x, 934); g.fillStyle = col || "#ffffff"; g.font = "900 58px system-ui"; g.fillText(val, x, 1000);
      if (i) { g.strokeStyle = "rgba(127,211,255,.25)"; g.lineWidth = 2; g.beginPath(); g.moveTo(12 + 200 * i, 914); g.lineTo(12 + 200 * i, 1002); g.stroke(); } };
    cell(0, S.st === "pre" ? "RAJTIG" : "IDŐ", mmss(S.st === "pre" ? -S.t : S.t)); cell(1, "HELY", S.st === "pre" ? "–" : `${S.fin ? S.res.findIndex((q) => q.me) + 1 : vrPlace()}/4`);
    cell(2, "CSOMÓ", (S.v / KN).toFixed(1)); cell(3, "VMG", (vmg / KN).toFixed(1), vmg > 0 ? "#7CFC9A" : "#ff6a5a"); cell(4, "IRÁNY", String(Math.round(((S.b * R2D) % 360 + 360) % 360)).padStart(3, "0") + "°");
    t.needsUpdate = true;
  }
  function vrInstruments() {
    const S = VRR, t = S.ck.instT, g = t._canvas.getContext("2d"), w = 512, cx = 256, cy = 256, R = 215;
    g.fillStyle = "#06090d"; g.fillRect(0, 0, w, w);
    g.beginPath(); g.arc(cx, cy, R + 22, 0, TAU); g.fillStyle = "#0c1a28"; g.fill(); g.lineWidth = 8; g.strokeStyle = "#c9d0d6"; g.stroke();
    /* skála: 0° = a hajó orra (fent); piros sáv = holtszög (38°-nál élesebben nem megy a hajó), zöld = jó cirkálószög */
    const arc = (a0, a1, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, R, a0 - Math.PI / 2, a1 - Math.PI / 2); g.stroke(); };
    arc(-38 * D2R, 38 * D2R, "#e5392f", 22); arc(38 * D2R, 60 * D2R, "#3fbf6a", 22); arc(-60 * D2R, -38 * D2R, "#3fbf6a", 22);
    for (let d = 0; d < 360; d += 10) { const a = d * D2R - Math.PI / 2, big = d % 30 === 0, r0 = R - (big ? 34 : 22); g.strokeStyle = "#e9f6ff"; g.lineWidth = big ? 5 : 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * (R - 12), cy + Math.sin(a) * (R - 12)); g.stroke();
      if (big && d % 60 === 0 && d) { g.fillStyle = "#cfe3f2"; g.font = "700 26px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(d > 180 ? 360 - d : d), cx + Math.cos(a) * (R - 56), cy + Math.sin(a) * (R - 56)); g.textBaseline = "alphabetic"; } }
    /* a hajó körvonala középen (orr felfelé) */
    g.fillStyle = "#16314a"; g.strokeStyle = "#7fd3ff"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy - 96); g.quadraticCurveTo(cx + 44, cy - 20, cx + 30, cy + 92); g.lineTo(cx - 30, cy + 92); g.quadraticCurveTo(cx - 44, cy - 20, cx, cy - 96); g.fill(); g.stroke();
    /* szélnyíl: a perem felől a hajó felé mutat – onnan fúj */
    const wa = wrapA(S.wf - S.b); g.save(); g.translate(cx, cy); g.rotate(wa); g.fillStyle = S.twa < 38 ? "#ff6a5a" : "#ffd166"; g.strokeStyle = "#06090d"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -R + 46); g.lineTo(30, -R - 8); g.lineTo(11, -R - 2); g.lineTo(11, -R - 30); g.lineTo(-11, -R - 30); g.lineTo(-11, -R - 2); g.lineTo(-30, -R - 8); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = S.twa < 38 ? "rgba(255,106,90,.75)" : "rgba(255,209,102,.75)"; g.lineWidth = 6; g.beginPath(); g.moveTo(0, -R + 50); g.lineTo(0, -104); g.stroke(); g.restore();
    /* szélerősség csomóban, középen */
    const kn = (S.tws * (S.gk || 1)) / KN; g.fillStyle = "#ffffff"; g.font = "800 78px system-ui"; g.textAlign = "center"; g.fillText(kn.toFixed(0), cx, cy + 30); g.fillStyle = "#7fd3ff"; g.font = "700 24px system-ui"; g.fillText("csomó szél", cx, cy + 64);
    if (S.pen > 0) { g.fillStyle = "#b3261e"; g.fillRect(cx - 250, cy + 96, 500, 76); g.fillStyle = "#ffffff"; g.font = "900 44px system-ui"; g.fillText(`BÜNTETŐ: ${S.pen} × 360°`, cx, cy + 150); }
    t.needsUpdate = true;
    vrChart();
    const m = S.mastT, g2 = m._canvas.getContext("2d"); g2.fillStyle = "#06090d"; g2.fillRect(0, 0, 1024, 256);
    const cell = (x, lbl, val) => { g2.fillStyle = "#7fd3ff"; g2.font = "600 30px system-ui"; g2.textAlign = "center"; g2.fillText(lbl, x + 170, 52); g2.fillStyle = "#e9f6ff"; g2.font = "800 110px system-ui"; g2.fillText(val, x + 170, 180); };
    cell(0, S.st === "pre" ? "RAJTIG" : "IDŐ", mmss(S.t)); if (S.pen > 0) { g2.fillStyle = "#b3261e"; g2.fillRect(341, 0, 342, 256); } cell(341, S.pen > 0 ? "BÜNTETŐ 360°" : "HELY", S.pen > 0 ? "× " + S.pen : S.st === "pre" ? "–" : `${S.fin ? S.res.findIndex((q) => q.me) + 1 : vrPlace()}/4`); cell(682, "SEBESSÉG", (S.v / KN).toFixed(1));
    m.needsUpdate = true;
  }
  /* --------------------------------------------------------------- panel, csuklómenü, 2D */
  function vrPanel(P) {
    const S = VRR;
    P.title(`Vitorlásverseny · ${S.lvl}. futam · ${S.C.name} · ${String(window.ZEPHYR_BV || "").slice(0, 5)}`, `${S.st === "pre" ? "Rajt: " + mmss(-S.t) : S.st === "done" ? "Vége" : "Idő: " + mmss(S.t)} · ${(S.v / KN).toFixed(1)} csomó · szél ${(S.tws / KN).toFixed(0)} csomó`);
    P.row(0, S.msgT > 0 ? S.msg : S.tiller ? "Botkormány: fogd meg a mellkasod előtt – eltolod: jobbra, a válladhoz húzod: balra." : "Kormánykerék: fogd meg a peremét – negyed fordulat (90°) a végállás.", "#ffd166");
    P.row(1, S.pen > 0 ? `⚠ BÜNTETŐ: ${S.pen} × 360° forduló hátravan (${Math.round(Math.abs(S.penAcc || 0) * R2D)}° megvan) – enélkül a befutó érvénytelen` : S.ocs ? "KORAI RAJT – menj vissza a rajtvonal mögé, aztán lépd át újra" : S.st === "pre" ? "Rajt előtt maradj a vonal mögött – a rajtjelre (hosszú kürt) lépd át" : S.next < S.marks.length ? `Következő: ${S.next + 1}. bója (${S.marks.length} van) – bal kéz felől kerüld` : "Utolsó szakasz: át a rajtvonalon!", "#ffffff");
    P.row(2, S.st === "done" ? S.res.map((q, i) => `${i + 1}. ${q.n} ${mmss(q.t)}`).join(" · ") : "A sárga fényoszlop mutatja a következő bóját.", "#7fd3ff");
    P.row(3, S.best[S.lvl] ? `Legjobb időd ezen a pályán: ${mmss(S.best[S.lvl])}` : "Szél ellen nem lehet menni: cikcakkban (cirkálva) haladj!", "#c9a24a");
    if (S.st === "done") P.buttons([["↻ Újra", () => vrSetup(S.lvl)], ["Tovább ▸ " + (S.lvl + 1) + ". futam", () => vrSetup(S.lvl + 1)], ["‹ Vissza a sétához", () => W.close()]]);
    else P.buttons([["Egyenesbe", () => { S.wa = 0; }], ["↻ Újrakezdés", () => vrSetup(S.lvl)], [S.seated ? "🧍 Álló mód" : "🪑 Ülő mód", () => vrSeat()], ["‹ Vissza", () => W.close()]]);
    P.buttons([[S.tiller ? "☸ Kormánykerékre váltok" : "⎯ Botkormányra váltok", vrSteerMode]], 1);
  }
  /* kormánymód váltása: botkormány (alap) ↔ kormánykerék; megjegyzi (localStorage „zephyr-kormany”: bot / kerek) */
  function vrSteerMode() { const S = VRR, CK2 = S.ck; if (!CK2) return; try { vrRelease(); } catch (e) {} S.tiller = !S.tiller; S.wa = 0; S.wOver = 0; S.wv = 0;
    S.rgrab = null; S.grabs = {}; S.grab = null; S.hold = {}; S.near = false; S.wHover = false; try { if (T.xrForget) T.xrForget(CK2.wheels.map((w) => w.hit)); } catch (e) {}   /* 2026-11-12 09:39: átváltáskor minden korábbi fogás és ráfutás törlődik */
    try { localStorage.setItem("zephyr-kormany", S.tiller ? "bot" : "kerek"); } catch (e) {}
    if (CK2.G.userData.podSet) CK2.G.userData.podSet(S.tiller);
    CK2.wheels.forEach((w) => { w.wheel.visible = !S.tiller; w.axle.visible = !S.tiller; if (S.tiller) T.xr.extra.delete(w.hit); else { if (!w.hit.userData.xr) w.hit.userData.xr = { hover: (on) => { VRR.wHover = on; }, down: (h, src, key) => vrGrab(w, src, key, true), drag: (src) => vrDrag(w, src), up: () => { VRR.rgrab = null; } }; T.xr.extra.add(w.hit); if (W.objs.indexOf(w.hit) < 0) W.objs.push(w.hit); } });
    CK2.tiller.til.visible = CK2.tiller.ext.visible = S.tiller; if (S.helpL) S.helpL.visible = false; S.everGrab = true;
    S.msg = S.tiller ? "Botkormány: fogd meg a mellkasod előtt – eltolod: jobbra, a válladhoz húzod: balra." : "Kormánykerék: fogd meg a peremét, és fordítsd – negyed fordulat (90°) a végállás."; S.msgT = 7; W.panelDirty = 1; }
  function vrSigns() { VRR.noSigns = !VRR.noSigns; try { localStorage.setItem("zephyr-verseny-tablak", VRR.noSigns ? "0" : "1"); } catch (e) {} W.panelDirty = 1; }
  function vrSeat() { VRR.seated = !VRR.seated; try { localStorage.setItem("zephyr-vr-ules", VRR.seated ? "1" : "0"); } catch (e) {} W.root.position.y = VRR.baseY - (VRR.seated && T.inVR ? .45 : 0); W.panelDirty = 1; }
  function vrWrist() {
    const S = VRR;
    return [["🪑", S.seated ? "Álló mód" : "Ülő mód", () => vrSeat()], ["☸", S.tiller ? "Kormánykerékre váltok" : "Botkormányra váltok", () => vrSteerMode()], ["🪧", S.noSigns ? "Táblák mutatása" : "Táblák elrejtése", vrSigns], ["↻", "Futam újra", () => vrSetup(S.lvl)], ["▸", "Következő futam", () => vrSetup(S.lvl + 1)], ["◂", "Előző futam", () => vrSetup(Math.max(1, S.lvl - 1))], ["⎈", "Kormány egyenesbe", () => { S.wa = 0; }],
      ["☰", "Nagy panel", () => W.togglePanel()], ["‹", "A sétához", () => W.close()]];
  }
  function vrHud(H) {
    const S = VRR;
    H.title(`Vitorlásverseny · ${S.lvl}. futam · ${S.C.name} · ${String(window.ZEPHYR_BV || "").slice(0, 5)}`, `${S.msgT > 0 ? S.msg + " · " : ""}${S.st === "pre" ? "rajt " + mmss(-S.t) : "idő " + mmss(S.t)} · ${(S.v / KN).toFixed(1)} csomó · ${S.next < S.marks.length ? (S.next + 1) + ". bója" : "befutó"}`);
    if (S.st === "done") H.steer([["↻ Újra", () => vrSetup(S.lvl)], ["Tovább ▸", () => vrSetup(S.lvl + 1)]], () => { S.wa = 0; });
    else H.steer([["↻ Újrakezdés", () => vrSetup(S.lvl)], [S.noSigns ? "🪧 Táblák" : "🪧 Táblák ✕", vrSigns]], () => { S.wa = 0; });
    H.hint("Kormány: ◀ ▶ gomb vagy ← → (A / D) · a sárga fényoszlop a következő bója · bal kéz felől kerüld");
  }
