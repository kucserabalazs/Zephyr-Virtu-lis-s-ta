  /* =================================================================== 2/C. VÁLASZTHATÓ HAJÓK A VERSENYHEZ (2026. nov. 14., a tulajdonos 15–16. kérése)
     • ZEPHYR – a meglévő 15 méteres versenyjacht (Raptor 27 nyomán, nagyítva) – a 05b-ben.
     • FINN DINGI – a World Sailing által jóváhagyott Nemzetközi Finn Osztályszabályok (2025-12-01) és a Harken-adatlap szerint:
       hossz 4480–4510 mm (névleges 4495), szélesség 1,51 m, test + uszony ≥ 116 kg; orrfedélzet 1350–1450 mm, tatfedélzet 550–650 mm; ülőpad (thwart) a tükörtől
       1950–2050 mm-re; a főszkóta-kocsi ±550 mm; USZONY: negyedkör, nagy sugár 885–895 mm, húr 815–825 mm, 8 mm vastag (bronz), 11–13 kg;
       ÁRBOC (kötélzet nélküli): felső mérőpont 6560 mm a saroktól, a bum csapja 820 mm-en, keresztmetszet előre-hátra 100 mm → 55 mm, keresztben 60 → 20 mm;
       BUM: külső mérőpont ≤ 3230–3270 mm, keresztmetszet 77–82 × 32–37 mm; GRÓSZ: hátsó él ≤ 6020 mm, szélesség a fejtől 3000 mm-re ≤ 1935 mm, 1500 mm-re ≤ 1075 mm,
       fejszélesség 165 mm, 5 léc (400 / 600 / 700 / 600 / 500 mm, 900 mm-enként, a legfelső a fejtől 960 mm-re), ~10 m².
     • 420-AS JOLLE – a Nemzetközi 420 Osztályszabályok (2014) és a World Sailing adatlap szerint: hossz 4180–4220 mm, szélesség 1,63 m, test ≥ 80 kg (szerelve ≥ 100 kg);
       ÁRBOC 6260 mm (fedélzeten álló), a tükörtől 2890–2910 mm-re; terpesz 2550–2650 mm, a merevítők / elődrót / trapéz 4550–4650 mm-en; oldalmerevítő-lemezek a tükörtől
       2550–2570 mm-re, orrvas 4085–4125 mm-re; BUM külső pontja 2400 mm, alsó mérőpont 1160 mm; GRÓSZ: hátsó él ≤ 5400 mm, szélességek (fejtől): 0 → 115, 600 mm → 480,
       ¾ → 995, ½ → 1630, ¼ → 2130 mm, ablak ≤ 0,3 m², 7,45 m²; FOCK: első él ≤ 3500, hátsó ≤ 3200, alj ≤ 1750 mm, felhúzási magasság 4520 mm, 2,8 m², ablak ≤ 0,1 m²,
       a szkótavezetők a tükörtől 2020–2120 mm-re, a középsíktól ≥ 625 mm-re; SPINAKKER: hátsó él ≤ 4000, alj ≤ 2220, félmagassági szélesség ≤ 2840 mm, felhúzás 4650 mm, 9 m²;
       spinakkerrúd ≤ 1750 mm; USZONY ~420 × 995 mm, 16–20 mm; KORMÁNYLAPÁT legfeljebb 540 mm-re nyúlik a test alá; főszkóta-sín a tükörtől 1400–1500 mm-re; egy trapéz. (A tulajdonos „jolle 440”-et írt – ilyen hajóosztályt nem találtam; a magyar utánpótlásban a 420-as a jolle. Ha a 470-esre
       gondolt: ugyanez a hajó 4,70 m-re nyújtva – a JOLLE_L értékét kell átírni.)
     • RÖNKTUTAJ – saját tervezésű hajótörött-tutaj: kötéllel összefogott rönkök, rongyokból varrt ponyvavitorla, kormányevező, rakomány, és az útitárs:
       RÁK REZSŐ, a kis piros rák (a filmbeli tutajt és labdát szerzői/márkajogi okból nem másoljuk – ez saját ötlet).
     • FLAMINGÓ – felfújható óriás flamingó matrac (rózsaszín test, hosszú S-nyak, fekete hegyű csőr, szárnypárnák): az árboc egy horgászbot (orsó, gyűrűk, zsinór),
       a grósz egy csíkos strandtörölköző a játékos nevével, hátszélben pedig egy nagy pöttyös melltartó a spinakker (fock nincs) – 2026-11-14 15:06, a tulajdonos kérése.
     Minden hajó ugyanazt a felületet adja, mint a makeBoat: g.userData.S (side, boom, awa, aws, heel, pitch, spin, luff), g.userData.update(dt), g.userData.body.
     Az orr a modell +z irányában van. */
  const JOLLE_L = 4.2;
  const BOATCLS = {
    zephyr:   { id: "zephyr",   n: "Zephyr – versenyjacht", sh: "Zephyr",   len: "15,2 m (Raptor 27 nyomán)", crew: "kormányos + 4 fő legénység", spd: 1,    cs: 1,   up: 44, half: 6,    rad: 2.3,  hit: 4.6, d: "A tulajdonos hajója, nagy versenyjachtként: kormánykerék vagy botkormány, spinakker, nagy sebesség." },
    finn:     { id: "finn",     n: "Finn dingi",            sh: "Finn",     len: "4,495 m · 1,51 m · ≥116 kg · 10 m²",   crew: "egyszemélyes",               spd: .8,   cs: .72, up: 43, half: 2.25, rad: .8,   hit: 1.7, d: "Az olimpiák klasszikusa: egyetlen vitorla a hajlékony árbocon, a kormányos kihasal – tiszta, kemény vitorlázás." },
    j420:     { id: "j420",     n: "420-as jolle",          sh: "420",      len: "4,20 m · 1,63 m · 80 kg · 7,45 + 2,8 + 9 m²", crew: "kétszemélyes (trapéz)", spd: .84, cs: .72, up: 44, half: 2.1, rad: .85, hit: 1.75, d: "Az utánpótlás versenyhajója: grósz, fock, spinakker, a legénység trapézon lóg ki a víz fölé." },
    tutaj:    { id: "tutaj",    n: "Rönktutaj",             sh: "Tutaj",    len: "3,8 m · rönkökből kötve",   crew: "hajótörött + Rák Rezső",     spd: .46,  cs: .48, up: 62, half: 1.9,  rad: 1.25, hit: 2.2, d: "Saját tervezésű hajótörött-tutaj: rongyvitorla, kormányevező, banánfürt – és Rák Rezső, a legjobb útitárs." },
    flamingo: { id: "flamingo", n: "Flamingó matrac",       sh: "Flamingó", len: "1,9 m · felfújható",        crew: "egy bátor strandoló",        spd: .5,   cs: .48, up: 58, half: 1.15, rad: .95, hit: 1.6, d: "Horgászbot az árboc, csíkos strandtörölköző a grósz (rajta a neved), hátszélben egy nagy pöttyös melltartó dagad ki spinakkerként. Vigyázz, borul!" }
  };
  const BOAT_ORDER = ["zephyr", "finn", "j420", "tutaj", "flamingo"];
  function boatCls(id) { return BOATCLS[id] || BOATCLS.zephyr; }

  /* --------------------------------------------------------------- közös: puha vitorla (paraméteres háló, a szélhez trimmelve, lobog, ha belobog) */
  function softSail(o) {
    /* o: { parent, nu, nv, luff:(v)=>Vector3 (az árboc pontja a v magasságban, a vitorla helyi terében), chord:(v)=>m, mat, camber, twist, roach } */
    const nu = o.nu || 10, nv = o.nv || 14, N = (nu + 1) * (nv + 1), pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), idx = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const k = j * (nu + 1) + i; uv[k * 2] = i / nu; uv[k * 2 + 1] = j / nv; }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    W.disposables.push(g); const m = new THREE.Mesh(g, o.mat); m.frustumCulled = false; if (o.parent) o.parent.add(m);
    /* kétoldalas vászon: a hátoldalon tükrözött textúra – a szám és a név mindkét oldalról olvasható (mint a valódi vitorlákon) */
    if (o.mat.map && o.mat.side === THREE.DoubleSide) { o.mat.side = THREE.FrontSide; const t2 = o.mat.map.clone(); t2.wrapS = THREE.RepeatWrapping; t2.repeat.x = -1; t2.offset.x = 1; t2.needsUpdate = true; W.disposables.push(t2);
      const m2 = o.mat.clone(); m2.map = t2; m2.side = THREE.BackSide; W.disposables.push(m2); const bk = new THREE.Mesh(g, m2); bk.frustumCulled = false; m.add(bk); }
    const L = new THREE.Vector3();
    const st = { a: 0, lf: 0, t: Math.random() * 9, side: 1, U: 6, depth: o.camber || .1 };
    st.update = (dt, a, lf, U, side, k) => {   /* a: a vitorla szöge (rad, + = a hajó +x oldala felé), lf: belobogás 0..1, U: látszólagos szél m/s, k: teltség-szorzó */
      st.t += dt; const t = st.t, om = TAU * (1 + U * .16), fill = k == null ? 1 : k, sd = Math.abs(a) > .02 ? Math.sign(a) : side;
      for (let j = 0; j <= nv; j++) {
        const v = j / nv, c = o.chord(v); L.copy(o.luff(v)); const aa = a + sd * (o.twist || .18) * v * v, dx = Math.sin(aa), dz = -Math.cos(aa), px = Math.cos(aa) * sd, pz = Math.sin(aa) * sd;
        for (let i = 0; i <= nu; i++) {
          const u = i / nu, k2 = (j * (nu + 1) + i) * 3, sh = Math.sin(Math.PI * Math.pow(u, .78)) * (1 - .25 * v);
          let dep = st.depth * c * sh * fill * (1 - .9 * lf);
          if (lf > .02) dep += c * .06 * lf * Math.sin(om * t - u * 8 - v * 2.6) * (.3 + .7 * u) * clamp(U / 7, .25, 1.1);
          if (U > 5 && lf < .3) dep += c * .012 * clamp((U - 5) / 5, 0, 1) * u * u * Math.sin(TAU * 6.5 * t + v * 8);
          pos[k2] = L.x + dx * c * u + px * dep; pos[k2 + 1] = L.y + (o.sag ? -o.sag * Math.sin(Math.PI * u) * (1 - v) : 0); pos[k2 + 2] = L.z + dz * c * u + pz * dep;
        }
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals();
    };
    st.mesh = m; st.geo = g; return st;
  }
  /* vitorlavászon textúra: panelek, lécek, szám, felirat (név a grószon) */
  function dinghySailTex(o) {
    return canvasTex(512, 1024, (g, w, h) => {
      g.fillStyle = o.cloth || "#f6f5ef"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 70) { g.fillStyle = "rgba(0,0,0,.035)"; g.fillRect(0, y, w, 2); }
      g.strokeStyle = "rgba(90,90,90,.32)"; g.lineWidth = 9; (o.battens || []).forEach(([v, f]) => { const y = h * (1 - v); g.beginPath(); g.moveTo(w * (1 - f), y); g.lineTo(w, y); g.stroke(); });   /* léczsebek (a valódi helyükön) */
      if (o.band) { g.fillStyle = o.band; g.fillRect(0, h * .9, w, h * .1); }
      if (o.win) { const [x0, y0, ww, hh] = o.win; g.fillStyle = "rgba(200,225,240,.55)"; g.fillRect(w * x0, h * (1 - y0 - hh), w * ww, h * hh); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 4; g.strokeRect(w * x0, h * (1 - y0 - hh), w * ww, h * hh); }
      g.textAlign = "center"; g.textBaseline = "middle";
      if (o.ins) { g.fillStyle = o.insC || "#1f4fbf"; g.font = "900 120px system-ui, sans-serif"; g.fillText(o.ins, w * .55, h * .17); }
      if (o.num) { g.fillStyle = o.numC || "#14161b"; g.font = "800 92px system-ui, sans-serif"; g.fillText(o.num, w * .55, h * .36); }
      if (o.name) { const nm = String(o.name).toUpperCase().slice(0, 16); let fs = 96; g.font = `900 ${fs}px system-ui, sans-serif`; while (g.measureText(nm).width > w * .86 && fs > 30) { fs -= 4; g.font = `900 ${fs}px system-ui, sans-serif`; }
        g.lineWidth = 10; g.strokeStyle = "rgba(255,255,255,.9)"; g.strokeText(nm, w * .56, h * .5); g.fillStyle = o.nameC || "#c8102e"; g.fillText(nm, w * .56, h * .5); }
    });
  }

  /* --------------------------------------------------------------- EMBERI ALAK (tagolt: fej, törzs, karok, lábak – integet, kihajol, elesik) */
  const SKIN = ["#e8bc96", "#d29a72", "#f0caa8", "#c48660", "#e2b08a"], HAIR = ["#3a2414", "#15110e", "#c9a55a", "#6b4a2a", "#9a9a9a", "#b0502a"];
  function makePerson(o) {
    o = o || {}; const g = new THREE.Group(), sk = std({ color: o.skin || SKIN[(o.seed || 0) % 5], roughness: .75 }), top = std({ color: o.top || "#1f5fa8", roughness: .8 }), bot = std({ color: o.bot || "#27303c", roughness: .85 }), hr = std({ color: o.hair || HAIR[(o.seed || 0) % 6], roughness: .9 });
    const hips = new THREE.Group(); hips.position.y = .9; g.add(hips);
    const torso = new THREE.Group(); hips.add(torso);
    { const tg = new THREE.CapsuleGeometry(.155, .36, 4, 12); tg.scale(1, 1, .72); tg.translate(0, .33, 0); mesh(tg, top, torso); }
    if (o.vest) { const vg = new THREE.CapsuleGeometry(.175, .28, 4, 12); vg.scale(1.02, 1, .8); vg.translate(0, .34, 0); mesh(vg, std({ color: o.vest, roughness: .6 }), torso); }
    const neck = mesh(new THREE.CylinderGeometry(.05, .058, .09, 10), sk, torso); neck.position.y = .63;
    const head = new THREE.Group(); head.position.y = .7; torso.add(head);
    { const hg = new THREE.SphereGeometry(.112, 18, 14); hg.scale(.9, 1.08, 1); hg.translate(0, .09, 0); mesh(hg, sk, head);
      const hair = new THREE.SphereGeometry(.12, 18, 10, 0, TAU, 0, Math.PI * .52); hair.rotateX(-.28); hair.translate(0, .1, -.012); mesh(hair, hr, head);
      const nose = new THREE.ConeGeometry(.018, .05, 6); nose.rotateX(Math.PI / 2); nose.translate(0, .08, .11); mesh(nose, sk, head);
      [-1, 1].forEach((sd) => { const e = mesh(new THREE.SphereGeometry(.014, 8, 6), std({ color: "#1a1a1a", roughness: .3 }), head); e.position.set(sd * .04, .115, .098); });
      if (o.cap) { const cp = new THREE.SphereGeometry(.125, 16, 8, 0, TAU, 0, Math.PI * .45); cp.translate(0, .115, 0); mesh(cp, std({ color: o.cap, roughness: .7 }), head); const br = new THREE.BoxGeometry(.16, .012, .11); br.translate(0, .14, .13); mesh(br, std({ color: o.cap, roughness: .7 }), head); }
      if (o.glasses) { const gl = new THREE.BoxGeometry(.17, .035, .02); gl.translate(0, .115, .108); mesh(gl, std({ color: "#0d0f12", roughness: .2, metalness: .5 }), head); }
      if (o.sunhat) { const hb = new THREE.CylinderGeometry(.24, .26, .02, 20); hb.translate(0, .17, 0); mesh(hb, std({ color: o.sunhat, roughness: .9 }), head); const hc = new THREE.CylinderGeometry(.11, .13, .1, 16); hc.translate(0, .22, 0); mesh(hc, std({ color: o.sunhat, roughness: .9 }), head); }
      const mouth = mesh(new THREE.TorusGeometry(.028, .006, 4, 10, Math.PI), std({ color: "#7a2a22" }), head); mouth.position.set(0, .045, .1); mouth.rotation.z = Math.PI; head.userData.mouth = mouth; }
    const arm = (sd) => { const sh = new THREE.Group(); sh.position.set(sd * .2, .52, 0); torso.add(sh);
      const ua = new THREE.CapsuleGeometry(.048, .24, 3, 8); ua.translate(0, -.15, 0); mesh(ua, o.sleeve === false ? sk : top, sh);
      const el = new THREE.Group(); el.position.y = -.3; sh.add(el); const fa = new THREE.CapsuleGeometry(.042, .22, 3, 8); fa.translate(0, -.14, 0); mesh(fa, sk, el);
      const hd = mesh(new THREE.SphereGeometry(.05, 10, 8), sk, el); hd.position.y = -.3; return { sh, el }; };
    const leg = (sd) => { const hp = new THREE.Group(); hp.position.set(sd * .09, 0, 0); hips.add(hp);
      const th = new THREE.CapsuleGeometry(.07, .34, 3, 8); th.translate(0, -.22, 0); mesh(th, bot, hp);
      const kn = new THREE.Group(); kn.position.y = -.44; hp.add(kn); const sn = new THREE.CapsuleGeometry(.055, .34, 3, 8); sn.translate(0, -.2, 0); mesh(sn, o.bareLegs ? sk : bot, kn);
      const ft = new THREE.BoxGeometry(.09, .06, .22); ft.translate(0, -.42, .05); mesh(ft, std({ color: o.shoe || "#f2f2f2", roughness: .7 }), kn); return { hp, kn }; };
    const P = { g, hips, torso, head, aL: arm(-1), aR: arm(1), lL: leg(-1), lR: leg(1), t: Math.random() * 9, fall: 0, wave: o.wave || 0, sit: o.sit || 0, shout: 0 };
    g.userData.P = P; return g;
  }
  /* póz: sit (0 áll – 1 ül), wave (integetés 0..1), hike (kihajlás 0..1, a test hátradől), fall (0..1: elesik, hanyatt, lábak fel), cheer */
  function posePerson(g, dt, o) {
    const P = g.userData.P; if (!P) return; P.t += dt; const t = P.t, sit = o.sit != null ? o.sit : P.sit, wave = o.wave != null ? o.wave : P.wave, hike = o.hike || 0, fall = o.fall || 0;
    P.hips.position.y = .9 - .45 * sit - .5 * fall; P.hips.rotation.x = 0;
    P.lL.hp.rotation.x = P.lR.hp.rotation.x = -1.45 * sit - 1.3 * fall + (o.legs || 0); P.lL.kn.rotation.x = P.lR.kn.rotation.x = 1.5 * sit * (1 - hike) + .2 * fall;
    P.lL.hp.rotation.z = -.08 - .25 * fall; P.lR.hp.rotation.z = .08 + .25 * fall;
    P.torso.rotation.x = -hike * 1.0 - fall * 1.25 + .03 * Math.sin(t * 1.3); P.torso.rotation.z = .02 * Math.sin(t * .9);
    P.head.rotation.x = hike * .6 + fall * .4 + (o.look || 0); P.head.rotation.y = (o.turn != null ? o.turn : .35 * Math.sin(t * .37));
    const wv = Math.sin(t * 9) * .45;
    P.aR.sh.rotation.set(0, 0, wave > 0 ? wave * (2.6 + wv * .4) : .15 + fall * 1.6 + (o.armR || 0)); P.aR.el.rotation.x = wave > 0 ? -.3 - wave * .3 : -.2 - fall * .4;
    P.aL.sh.rotation.set(o.pull ? -.9 + .2 * Math.sin(t * 2) : 0, 0, -(.15 + fall * 1.6 + (o.cheer ? 2.4 : 0))); P.aL.el.rotation.x = o.pull ? -1.1 : -.2 - fall * .4;
    if (o.cheer) P.aR.sh.rotation.z = 2.4 + wv * .2;
    if (fall > .01) { P.lL.hp.rotation.x += Math.sin(t * 14) * .25 * fall; P.lR.hp.rotation.x += Math.sin(t * 14 + 1.5) * .25 * fall; }
    const mo = P.head.userData.mouth; if (mo) mo.scale.set(1, 1 + (o.shout || 0) * 2.5, 1);
  }

  /* --------------------------------------------------------------- közös dingi-test (lofton hajótest két oldalra), fedélzettel */
  function dinghyHull(o) {
    /* o: L (hossz), B (szélesség), D (oldalmagasság), rocker, bowR (orr kerekítés), stern (tükör szélessége 0..1), col, deck, stripe */
    const L = o.L, B = o.B, D = o.D || .5, NU = 24, NT = 10, pos = [], uvA = [], idx = [];
    const half = (u) => { const sb = o.stern != null ? o.stern : .62, a = u < .5 ? sb + (1 - sb) * Math.sin(u / .5 * Math.PI / 2) : Math.pow(Math.cos((u - .5) / .5 * Math.PI / 2), o.bowP || .85); return B / 2 * Math.max(.02, a); };
    const keel = (u) => -(D * .55) * (1 - Math.pow(Math.abs(u - .45) / .6, 2)) + (o.rocker || .08) * Math.pow(Math.abs(u - .45) * 2, 2), sheer = (u) => D * .42 + .06 * Math.pow(u, 3);
    const zOf = (u) => -L / 2 + u * L;
    for (let i = 0; i <= NU; i++) { const u = i / NU, hb = half(u), kz = keel(u), sz = sheer(u);
      for (let j = 0; j <= NT; j++) { const th = j / NT; [-1, 1].forEach((sd) => { const x = sd * hb * Math.sin(th * Math.PI / 2) ** .8, y = kz + (sz - kz) * (1 - Math.cos(th * Math.PI / 2)); pos.push(x, y, zOf(u)); uvA.push(u, sd < 0 ? th * .5 : 1 - th * .5); }); } }
    const W2 = (NT + 1) * 2;
    for (let i = 0; i < NU; i++) for (let j = 0; j < NT; j++) for (let s = 0; s < 2; s++) { const a = i * W2 + j * 2 + s, b = a + 2, c = a + W2, d = c + 2; if (s === 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvA, 2)); g.setIndex(idx); g.computeVertexNormals(); W.disposables.push(g);
    const tex = canvasTex(1024, 256, (gg, w, h) => { gg.fillStyle = o.col || "#f4f4f0"; gg.fillRect(0, 0, w, h); gg.fillStyle = o.boot || "#1f3a6a"; gg.fillRect(0, h * .47, w, h * .06);
      if (o.stripe) { gg.fillStyle = o.stripe; gg.fillRect(0, h * .02, w, h * .05); gg.fillRect(0, h * .93, w, h * .05); }
      if (o.reg) { gg.fillStyle = "#14161b"; gg.font = "800 30px system-ui"; gg.textAlign = "center"; gg.fillText(o.reg, w * .72, h * .2); gg.save(); gg.translate(w * .72, h * .8); gg.scale(1, -1); gg.fillText(o.reg, 0, 0); gg.restore(); } });
    const hm = new THREE.MeshStandardMaterial({ map: tex, roughness: .32, side: THREE.DoubleSide }); W.disposables.push(hm);
    const hull = new THREE.Mesh(g, hm);
    /* fedélzet: a peremen lezárt lap, középen nyitott kokpit */
    const dk = new THREE.Shape(); const dpts = []; for (let i = 0; i <= NU; i++) { const u = i / NU; dpts.push([half(u), zOf(u)]); }
    dk.moveTo(-dpts[0][0], dpts[0][1]); dpts.forEach(([x, z]) => dk.lineTo(-x, z)); for (let i = dpts.length - 1; i >= 0; i--) dk.lineTo(dpts[i][0], dpts[i][1]); dk.closePath();
    if (o.cockpit) { const [z0, z1, cw] = o.cockpit, hole = new THREE.Path(); hole.moveTo(-cw, z0); hole.lineTo(cw, z0); hole.lineTo(cw * .85, z1); hole.lineTo(-cw * .85, z1); hole.closePath(); dk.holes.push(hole); }
    const dg = new THREE.ShapeGeometry(dk, 1); dg.rotateX(Math.PI / 2); W.disposables.push(dg);
    { const p = dg.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), u = clamp((z + L / 2) / L, 0, 1); p.setY(i, sheer(u) + .005); } dg.computeVertexNormals(); }
    const deck = new THREE.Mesh(dg, std({ color: o.deck || "#e9e6dc", roughness: .55, side: THREE.DoubleSide }));
    const G = new THREE.Group(); G.add(hull); G.add(deck);
    if (o.cockpit) { const [z0, z1, cw] = o.cockpit, sole = mesh(new THREE.BoxGeometry(cw * 1.8, .02, Math.abs(z1 - z0)), std({ color: o.sole || "#d8d3c4", roughness: .8 }), G); sole.position.set(0, -.05, (z0 + z1) / 2); }
    return { G, half, keel, sheer, zOf, L, B };
  }
  /* kormánylapát + rúd (a rúd S.rud szerint fordul) és uszony */
  function dinghyRudder(H, o) {
    const g = new THREE.Group(); g.position.set(0, H.sheer(0), -H.L / 2 - .02); H.G.add(g);
    const blade = new THREE.BoxGeometry(.03, o.depth || .8, .26); blade.translate(0, -(o.depth || .8) / 2 + .1, -.12); mesh(blade, std({ color: o.bc || "#f4f4f0", roughness: .4 }), g);
    const head = mesh(new THREE.BoxGeometry(.06, .2, .2), std({ color: "#3a3f46", roughness: .5 }), g); head.position.set(0, .08, -.08);
    const til = new THREE.Group(); til.position.set(0, .16, -.04); g.add(til); const tg = new THREE.BoxGeometry(.035, .04, o.til || 1.1); tg.translate(0, 0, (o.til || 1.1) / 2); mesh(tg, std({ color: "#7a4d2a", roughness: .6 }), til);
    const ext = new THREE.CylinderGeometry(.012, .012, .9, 6); ext.rotateX(Math.PI / 2 - .35); ext.translate(0, .14, (o.til || 1.1) + .35); mesh(ext, std({ color: "#202020", roughness: .5 }), til);
    const cb = new THREE.BoxGeometry(.025, o.cbD || .9, .32); cb.translate(0, -(o.cbD || .9) / 2 - .05, .25); mesh(cb, std({ color: "#f4f4f0", roughness: .4 }), H.G);
    return { g, til };
  }

  /* lineáris interpoláció táblázatból: [[x, y], …] */
  const tabLerp = (T2, x) => { if (x <= T2[0][0]) return T2[0][1]; for (let i = 1; i < T2.length; i++) if (x <= T2[i][0]) { const [x0, y0] = T2[i - 1], [x1, y1] = T2[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return T2[T2.length - 1][1]; };
  /* =============================================================== FINN DINGI (Nemzetközi Finn Osztályszabályok, 2025) */
  function makeFinn(o) {
    o = Object.assign({ hull: "#f6f3ea", boot: "#2d3a4a", num: "HUN 7", crew: 1, me: false }, o);
    const G = new THREE.Group(), body = new THREE.Group(); G.add(body);
    const L = 4.495, B = 1.51, hz = (fromStern) => -L / 2 + fromStern;   /* a tükörtől mért távolság → helyi z */
    /* kokpit: a tatfedélzet (0,60 m) és az orrfedélzet (1,40 m) között, a fedélzet szintjén ±0,45 m széles (oldaltartályok 410–500 mm-re a középsíktól) */
    const H = dinghyHull({ L, B, D: .5, stern: .74, bowP: .9, rocker: .06, col: o.hull, boot: o.boot, deck: o.deck || "#eceae2", cockpit: [hz(.6), hz(L - 1.4), .46], reg: o.num }); body.add(H.G);
    const alu = std({ color: o.mastC || "#c9ccd0", metalness: .7, roughness: .3 }), dark = std({ color: "#1d232b", roughness: .5 }), bronze = std({ color: "#9c7a44", metalness: .8, roughness: .35 });
    /* ülőpad (thwart): hátsó éle a tükörtől 2,0 m-re, 75 mm széles; padlódeszkák 800–880 mm szélesen; kihasaló hevederek; főszkóta-kocsi ±550 mm */
    { const th = mesh(new THREE.BoxGeometry(.98, .035, .075), std({ color: "#cfc6b0", roughness: .7 }), H.G); th.position.set(0, H.sheer(2.0 / L) - .1, hz(2.04));
      const fb = mesh(new THREE.BoxGeometry(.84, .02, 2.1), std({ color: "#b8ab90", roughness: .9 }), H.G); fb.position.set(0, H.sheer(.4) - .34, hz(1.8));
      [-1, 1].forEach((sd) => { const hs = mesh(new THREE.BoxGeometry(.05, .012, 1.5), std({ color: "#22324a", roughness: .8 }), H.G); hs.position.set(sd * .2, H.sheer(.4) - .32, hz(1.55)); });
      const tr = mesh(new THREE.BoxGeometry(1.1, .03, .05), alu, H.G); tr.position.set(0, H.sheer(.25) - .2, hz(1.15)); }
    /* USZONY: negyedkör (r = 890 mm, húr 820 mm, 8 mm bronz), ~0,7 m-re nyúlik a test alá */
    { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(.82, 0); sh.absarc(0, 0, .82, 0, -Math.PI / 2, true); sh.lineTo(0, 0); const cg = new THREE.ExtrudeGeometry(sh, { depth: .008, bevelEnabled: false }); cg.rotateY(Math.PI / 2); cg.translate(-.004, H.keel(.5) + .02, hz(2.0)); W.disposables.push(cg); mesh(cg, bronze, H.G); }
    /* ÁRBOC (kötélzet nélküli): a sarok a gerincen, a fedélzet ~0,45 m-rel fölötte; felső mérőpont 6,56 m a saroktól; a bum csapja 0,82 m-en.
       Keresztmetszet: előre-hátra 100 → 55 mm, keresztben 60 → 20 mm – lefelé vastag, a csúcs vékony és hátrahajlik. */
    const mastZ = hz(L - 1.48), heelY = H.keel(.67) + .056, mastH = 6.56 + .13, boomPin = .82;
    const mast = new THREE.Group(); mast.position.set(0, heelY, mastZ); body.add(mast);
    { const pts = []; for (let k = 0; k <= 12; k++) { const v = k / 12; pts.push(new THREE.Vector3(0, v * mastH, -.2 * Math.pow(Math.max(0, v - .25) / .75, 2))); }
      const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 1, 10, false), pa = tg.attributes.position, cur = new THREE.CatmullRomCurve3(pts), c = new THREE.Vector3();
      for (let i = 0; i < pa.count; i++) { const y = pa.getY(i), v = clamp(y / mastH, 0, 1); cur.getPoint(v, c); const dx = pa.getX(i) - c.x, dz = pa.getZ(i) - c.z, fa = tabLerp([[0, .05], [2.06 / mastH, .05], [1, .0275]], v), tw = tabLerp([[0, .03], [1 / mastH, .03], [5 / mastH, .014], [1, .01]], v); pa.setXYZ(i, c.x + dx * tw, y, c.z + dz * fa); }
      tg.computeVertexNormals(); W.disposables.push(tg); mesh(tg, alu, mast);
      const db = mesh(new THREE.CylinderGeometry(.06, .07, .03, 16), dark, mast); db.position.y = H.sheer(.67) - heelY + .015; }
    /* BUM: 3,25 m, 80 × 35 mm-es szelvény; bumlehúzó (vang) és 3:1-es főszkóta */
    const boomL = 3.25, boom = new THREE.Group(); boom.position.set(0, boomPin, -.04); mast.add(boom);
    { const bg = new THREE.BoxGeometry(.035, .08, boomL); bg.translate(0, 0, -boomL / 2); mesh(bg, alu, boom);
      const vang = new THREE.CylinderGeometry(.006, .006, .82, 5); vang.rotateX(.9); vang.translate(0, -.29, -.33); mesh(vang, dark, boom);
      const blk = mesh(new THREE.SphereGeometry(.03, 8, 6), dark, boom); blk.position.set(0, -.05, -1.95); }
    /* GRÓSZ: a valódi szélességi méretek a fejtől (0 → 0,165; 1,5 → 1,075; 3,0 → 1,935; az alj ~2,6 m), 5 léc a mért helyükön, ablak */
    const luffL = mastH - .13 - boomPin, sailW = (fromHead) => tabLerp([[0, .165], [1.5, 1.075], [3.0, 1.935], [luffL, 2.62]], fromHead);
    const bat = [[.96, .4], [1.86, .6], [2.76, .7], [3.66, .6], [4.56, .5]].map(([h, l]) => [1 - h / luffL, l / sailW(h)]);
    const sTex = dinghySailTex({ cloth: o.sail || "#f3f2ec", num: o.num, ins: "", name: o.name, win: [.12, .1, .3, .12], battens: bat });
    const sail = softSail({ parent: mast, nu: 10, nv: 16, mat: std({ map: sTex, roughness: .9, side: THREE.DoubleSide }), camber: .11, twist: .32,
      luff: (v) => { const y = boomPin + .03 + v * luffL, vv = y / mastH; return new THREE.Vector3(0, y, -.2 * Math.pow(Math.max(0, vv - .25) / .75, 2) - .05); }, chord: (v) => sailW((1 - v) * luffL) });
    const rud = dinghyRudder(H, { til: 1.1, depth: .8, cbD: .01 });
    /* kormányos: kihasal a szél felőli oldalon (lába a hevederben) */
    const crew = [];
    if (o.crew) { const p = makePerson({ top: o.top || "#1f2f46", bot: "#1b2430", vest: o.vestC || "#c8102e", cap: o.cap || null, seed: o.seed || 0 }); body.add(p); crew.push({ p, kind: "helm" }); }
    const S = { side: 1, boom: .2, luff: 0, heel: 0, pitch: 0, spin: 0, awa: null, aws: 6, rud: 0, t: 0, crewS: 1 };
    G.userData = { S, body, mast, deckY: H.sheer(.4), seat: new THREE.Vector3(0, .12, hz(1.6)), cls: "finn", chartAt: new THREE.Vector3(0, H.sheer(.55) + .02, hz(2.45)) };
    G.userData.update = (dt) => {
      S.t += dt; const A = S.awa != null ? S.awa : 60, U = S.aws || 6;
      const bT = clamp(A - 17, 3, 85) * D2R * S.side; S.boomS = S.boomS == null ? bT : S.boomS + (bT - S.boomS) * Math.min(1, dt * (Math.sign(bT) !== Math.sign(S.boomS) ? 3.5 : 1.8)); S.boom = S.boomS;
      const lf = clamp(1 - (A - Math.abs(S.boom) * R2D - 4) / 8, 0, 1); S.luff = lf;
      boom.rotation.y = -S.boom; mast.rotation.y = -S.boom * .15; sail.update(dt, S.boom * .85, lf, U, S.side, 1);   /* a Finn árboca a bummal együtt elfordul (C.9.4: „all parts rotate together”) */
      mast.rotation.x = -.035 * clamp(U / 8, 0, 1.2) * (1 - lf);
      body.rotation.set(S.pitch, 0, S.heel, "YXZ"); rud.til.rotation.y = -(S.rud || 0) * .6;
      S.crewS += (-S.side - S.crewS) * Math.min(1, dt * 1.4);
      crew.forEach((c) => { const hk = clamp((U - 3.5) / 5, 0, 1) * clamp((120 - A) / 60, 0, 1); c.p.position.set(S.crewS * (B / 2 - .06), H.sheer(.3) - .45, hz(1.75)); c.p.rotation.y = S.crewS > 0 ? Math.PI / 2 : -Math.PI / 2;
        posePerson(c.p, dt, { sit: 1, hike: hk * .9, pull: true, turn: -S.crewS * .25 }); c.p.rotation.z = 0; });
    };
    G.userData.update(0); return G;
  }

  /* =============================================================== 420-AS JOLLE (Nemzetközi 420 Osztályszabályok, 2014) */
  function make420(o) {
    o = Object.assign({ hull: "#ffffff", boot: "#1f5fa8", stripe: "#1f5fa8", num: "HUN 420", crew: 2, spin: ["#1f5fa8", "#ffffff", "#e5262f"] }, o);
    const G = new THREE.Group(), body = new THREE.Group(); G.add(body);
    const L = JOLLE_L, B = 1.63, hz = (fromStern) => -L / 2 + fromStern;
    const H = dinghyHull({ L, B, D: .55, stern: .7, bowP: .95, rocker: .07, col: o.hull, boot: o.boot, stripe: o.stripe, deck: "#f1f1ee", cockpit: [hz(.25), hz(2.75), .55], reg: o.num }); body.add(H.G);
    const alu = std({ color: "#c9ccd0", metalness: .75, roughness: .3 }), wire = std({ color: "#9aa1a8", metalness: .8, roughness: .3 }), dark = std({ color: "#1d232b", roughness: .5 });
    /* ÁRBOC: 6,26 m, a fedélzeten áll a tükörtől 2,9 m-re; terpesz 2,6 m-en; merevítők, elődrót, trapéz 4,6 m-en; orrvas 4,1 m, merevítő-lemezek 2,56 m */
    const mastZ = hz(2.9), deckM = H.sheer(2.9 / L), mastH = 6.26, attach = 4.6, mast = new THREE.Group(); mast.position.set(0, deckM, mastZ); body.add(mast);
    mesh(new THREE.CylinderGeometry(.026, .034, mastH, 10).translate(0, mastH / 2, 0), alu, mast);
    const top = new THREE.Vector3(0, deckM + attach, mastZ), plate = hz(2.56), spr = 2.6;
    [-1, 1].forEach((sd) => { const sp = new THREE.Vector3(sd * .38, deckM + spr, mastZ - .12), base = new THREE.Vector3(sd * (B / 2 - .04), H.sheer(2.56 / L), plate);
      rodBetween(base, sp, .0025, wire, body, 4); rodBetween(sp, top, .0025, wire, body, 4); rodBetween(new THREE.Vector3(0, deckM + spr, mastZ), sp, .012, alu, body, 6); });
    const stem = new THREE.Vector3(0, H.sheer(4.1 / L) + .03, hz(4.1)); rodBetween(stem, top, .0025, wire, body, 4);
    /* BUM: külső pont 2,40 m, alsó mérőpont 1,16 m (a 420 bumja magasan van); középső főszkóta a sínről (tükörtől 1,45 m) */
    const boomY = 1.16, boomL = 2.4, boom = new THREE.Group(); boom.position.y = boomY; mast.add(boom);
    { const bg = new THREE.CylinderGeometry(.03, .028, boomL, 8); bg.rotateX(Math.PI / 2); bg.translate(0, 0, -boomL / 2); mesh(bg, alu, boom); }
    const mst = rodBetween(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), .004, dark, body, 4); const mstBase = new THREE.Vector3(0, H.sheer(.35) - .2, hz(1.45));
    /* GRÓSZ: hátsó él ≤ 5,4 m; szélességek a fejtől: 0 → 0,115; 0,6 → 0,48; ¾ → 0,995; ½ → 1,63; ¼ → 2,13; alj 2,40 m; ablak ≤ 0,3 m² */
    const luffL = 6.06 - 1.16, mW = (h) => tabLerp([[0, .115], [.6, .48], [luffL * .25, .995], [luffL * .5, 1.63], [luffL * .75, 2.13], [luffL, 2.38]], h);
    const mTex = dinghySailTex({ cloth: "#f6f6f2", num: o.num, ins: "420", insC: o.insC || "#1f5fa8", name: o.name, win: [.2, .12, .34, .1], battens: [[1 - 1.445 / luffL, .54 / mW(1.445)], [1 - 2.6 / luffL, .7 / mW(2.6)], [1 - 3.7 / luffL, .7 / mW(3.7)], [.08, .54 / 2.3]] });
    const main = softSail({ parent: mast, nu: 9, nv: 14, mat: std({ map: mTex, roughness: .9, side: THREE.DoubleSide }), camber: .1, twist: .26,
      luff: (v) => new THREE.Vector3(0, boomY + .03 + v * luffL, -.04), chord: (v) => mW((1 - v) * luffL) });
    /* FOCK: első él 3,5 m az orrvastól a 4,52 m-es felhúzási pontig, alj 1,75 m, szkótavezető a tükörtől 2,07 m-re, 0,63 m-re oldalt; kis ablak */
    const jibG = new THREE.Group(); jibG.position.copy(stem); body.add(jibG); const hoist = new THREE.Vector3(0, deckM + 4.52, mastZ).sub(stem);
    const jTex = canvasTex(256, 512, (g, w, h) => { g.fillStyle = "#f8f8f4"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(200,225,240,.6)"; g.fillRect(w * .25, h * .6, w * .4, h * .12); g.strokeStyle = "rgba(80,80,80,.25)"; g.lineWidth = 7; [.3, .55, .8].forEach((v) => { g.beginPath(); g.moveTo(w * .85, h * (1 - v)); g.lineTo(w, h * (1 - v)); g.stroke(); }); });
    const jib = softSail({ parent: jibG, nu: 7, nv: 11, mat: std({ map: jTex, roughness: .9, side: THREE.DoubleSide }), camber: .1, twist: .2,
      luff: (v) => hoist.clone().multiplyScalar(v).add(new THREE.Vector3(0, .05, 0)), chord: (v) => 1.75 * (1 - v) + .04 });
    /* SPINAKKER: hátsó él ≤ 4,0 m, alj ≤ 2,22 m, félmagassági szélesség ≤ 2,84 m, felhúzás 4,65 m; rúd 1,75 m */
    const spT = canvasTex(256, 512, (g, w, h) => { const c = o.spin; for (let k = 0; k < 7; k++) { g.fillStyle = c[k % c.length]; g.fillRect(0, k * h / 7, w, h / 7 + 1); } });
    const spG = new THREE.Group(); spG.position.set(0, deckM + .4, hz(L) + .25); body.add(spG);
    const spin = softSail({ parent: spG, nu: 8, nv: 10, mat: std({ map: spT, roughness: .85, side: THREE.DoubleSide }), camber: .38, twist: 0,
      luff: (v) => new THREE.Vector3(0, v * 4.0, (mastZ - hz(L) - .25) * v * .55), chord: (v) => tabLerp([[0, 2.22], [.5, 2.84], [.85, 1.6], [1, .05]], v) });
    const pole = new THREE.Group(); pole.position.set(0, deckM + 1.45, mastZ); body.add(pole); { const pg = new THREE.CylinderGeometry(.017, .017, 1.75, 6); pg.rotateX(Math.PI / 2); pg.translate(0, 0, .875); mesh(pg, alu, pole); }
    /* USZONY ~0,42 × 1,0 m, 18 mm; KORMÁNYLAPÁT 0,54 m-re a test alá */
    { const cb = new THREE.BoxGeometry(.018, .99, .42); cb.translate(0, H.keel(.5) - .45, hz(2.25)); mesh(cb, std({ color: "#f4f4f0", roughness: .4 }), H.G); }
    const rud = dinghyRudder(H, { til: 1.0, depth: .7, cbD: .01 });
    const crew = [];
    if (o.crew > 1) crew.push({ p: makePerson({ top: o.top || "#203a5c", bot: "#1b2430", vest: o.vest || "#ffd23a", seed: (o.seed || 0) + 1, cap: o.cap || "#ffffff" }), kind: "helm" });
    crew.push({ p: makePerson({ top: o.top2 || "#e5262f", bot: "#1b2430", vest: o.vest2 || "#ffd23a", seed: (o.seed || 0) + 3 }), kind: "trap" });   /* a játékos hajóján csak a legénység látszik (a kormányos te vagy) */
    crew.forEach((c) => body.add(c.p));
    const trapW = rodBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), .003, wire, body, 4); trapW.visible = false;
    const S = { side: 1, boom: .2, jib: .2, luff: 0, heel: 0, pitch: 0, spin: 0, awa: null, aws: 6, rud: 0, t: 0, crewS: 1, trap: 0 };
    G.userData = { S, body, mast, deckY: H.sheer(.4), seat: new THREE.Vector3(0, .1, hz(.85)), cls: "j420", chartAt: new THREE.Vector3(0, H.sheer(.6) + .02, hz(2.75)) };
    const _bb = new THREE.Vector3();
    G.userData.update = (dt) => {
      S.t += dt; const A = S.awa != null ? S.awa : 60, U = S.aws || 6;
      const bT = clamp(A - 18, 3, 82) * D2R * S.side; S.boomS = S.boomS == null ? bT : S.boomS + (bT - S.boomS) * Math.min(1, dt * (Math.sign(bT) !== Math.sign(S.boomS) ? 3.5 : 1.8)); S.boom = S.boomS;
      const sp = S.spin || 0, lfM = clamp(1 - (A - Math.abs(S.boom) * R2D - 4) / 8, 0, 1); S.luff = lfM; boom.rotation.y = -S.boom; main.update(dt, S.boom, lfM, U, S.side, 1);
      _bb.set(Math.sin(S.boom) * (boomL - .9), deckM + boomY - .03, mastZ - Math.cos(S.boom) * (boomL - .9)); { const d = _bb.clone().sub(mstBase), Lm = d.length(); mst.position.copy(mstBase); mst.scale.set(1, Lm, 1); mst.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }
      const jA = clamp(A - 22, 8, 48) * D2R * S.side, lfJ = clamp(1 - (A - Math.abs(jA) * R2D - 6) / 8, 0, 1) + sp * .6; jib.update(dt, jA, clamp(lfJ, 0, 1), U, S.side, 1 - sp * .7);
      spG.visible = pole.visible = sp > .05; if (sp > .05) { const sa = -S.side * clamp(A - 90, 0, 80) * D2R * .9; spG.rotation.y = sa * .4; spin.update(dt, sa, clamp(1 - sp, 0, 1) * .8, U, -S.side, sp); spG.scale.setScalar(.25 + .75 * sp); pole.rotation.y = -S.side * (1.2 - clamp(A - 90, 0, 80) * D2R * .6); }
      body.rotation.set(S.pitch, 0, S.heel, "YXZ"); rud.til.rotation.y = -(S.rud || 0) * .6;
      S.crewS += (-S.side - S.crewS) * Math.min(1, dt * 1.3); const hk = clamp((U - 3) / 4.5, 0, 1) * clamp((125 - A) / 60, 0, 1); S.trap += ((U > 6.5 && A < 115 && Math.abs(S.crewS) > .8 ? 1 : 0) - S.trap) * Math.min(1, dt * 1.2);
      crew.forEach((c) => { if (c.kind === "helm") { c.p.position.set(S.crewS * (B / 2 - .08), H.sheer(.25) - .45, hz(.95)); c.p.rotation.set(0, S.crewS > 0 ? Math.PI / 2 : -Math.PI / 2, 0); posePerson(c.p, dt, { sit: 1, hike: hk * .8, pull: true, turn: -S.crewS * .3 }); }
        else { const tr = S.trap; c.p.position.set(S.crewS * (B / 2 - .08 + tr * .55), H.sheer(.45) - .45 + tr * .55, hz(1.9)); c.p.rotation.set(0, S.crewS > 0 ? Math.PI / 2 : -Math.PI / 2, -S.crewS * tr * 1.35);
          posePerson(c.p, dt, { sit: 1 - tr, hike: hk * .7 * (1 - tr), legs: tr * 1.45, pull: true, turn: -S.crewS * .4 });
          trapW.visible = tr > .3; if (trapW.visible) { const a = top.clone(), b2 = c.p.position.clone(); b2.y += .9; const d = b2.clone().sub(a), Lw = d.length(); trapW.position.copy(a); trapW.scale.set(1, Lw, 1); trapW.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); } } });
    };
    G.userData.update(0); return G;
  }

  /* =============================================================== RÖNKTUTAJ (saját terv) + RÁK REZSŐ */
  function makeRaft(o) {
    o = Object.assign({ crew: 1 }, o);
    const G = new THREE.Group(), body = new THREE.Group(); G.add(body);
    const logT = canvasTex(256, 512, (g, w, h) => { g.fillStyle = "#7a5a3a"; g.fillRect(0, 0, w, h); for (let k = 0; k < 90; k++) { g.strokeStyle = `rgba(${40 + Math.random() * 40},${25 + Math.random() * 25},${10 + Math.random() * 15},.55)`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); const x = Math.random() * w; g.moveTo(x, 0); g.bezierCurveTo(x + rr(-8, 8), h * .33, x + rr(-8, 8), h * .66, x + rr(-6, 6), h); g.stroke(); }
      for (let k = 0; k < 7; k++) { g.fillStyle = "rgba(40,25,12,.6)"; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 6, 10 + Math.random() * 10, 0, 0, TAU); g.fill(); } }, { repeat: [1, 1] });
    const endT = canvasTex(128, 128, (g) => { g.fillStyle = "#c79a62"; g.fillRect(0, 0, 128, 128); for (let r = 6; r < 64; r += 7) { g.strokeStyle = `rgba(110,72,36,${.35 + Math.random() * .3})`; g.lineWidth = 2; g.beginPath(); g.arc(64 + rr(-3, 3), 64 + rr(-3, 3), r, 0, TAU); g.stroke(); } });
    const logM = std({ map: logT, roughness: .95 }), endM = std({ map: endT, roughness: .9 }), rope = std({ color: "#b89a62", roughness: 1 });
    const N = 8, Wd = 2.3, Lg = 3.8;
    for (let k = 0; k < N; k++) { const r = .14 + (k * 37 % 5) * .012, L2 = Lg - (k * 53 % 4) * .18 + (k === 0 || k === N - 1 ? -.3 : 0), x = -Wd / 2 + (k + .5) * Wd / N;
      const cg = new THREE.CylinderGeometry(r, r * 1.04, L2, 12, 1, false); cg.rotateX(Math.PI / 2); const lm = new THREE.Mesh(cg, [logM, endM, endM]); W.disposables.push(cg); lm.position.set(x, .02 + (k % 2) * .015, (k * 29 % 3) * .06 - .05); lm.rotation.z = rr(-.2, .2); body.add(lm); }
    /* keresztrudak és kötözés */
    [-1.35, 0, 1.3].forEach((z) => { const cb = new THREE.CylinderGeometry(.07, .07, Wd + .3, 8); cb.rotateZ(Math.PI / 2); cb.translate(0, .2, z); mesh(cb, logM, body);
      for (let k = 0; k < N; k++) { const x = -Wd / 2 + (k + .5) * Wd / N, tg = new THREE.TorusGeometry(.17, .018, 5, 12); tg.translate(0, 0, 0); const m = mesh(tg, rope, body); m.position.set(x, .12, z); m.rotation.y = Math.PI / 2 + rr(-.2, .2); } });
    /* fedélzet: néhány lécből álló „padló” középen */
    for (let k = 0; k < 5; k++) { const pb = new THREE.BoxGeometry(.9, .04, .16); pb.translate(rr(-.1, .1), .27, -.6 + k * .2); mesh(pb, std({ color: "#9a7a52", roughness: .9 }), body); }
    /* A-árboc két rúdból, összekötve fent */
    const mastH = 3.6, mastZ = .55, mast = new THREE.Group(); mast.position.set(0, .25, mastZ); body.add(mast);
    [-1, 1].forEach((sd) => rodBetween(new THREE.Vector3(sd * .55, 0, 0), new THREE.Vector3(0, mastH, -.05), .055, logM, mast, 8));
    { const kn = new THREE.TorusGeometry(.09, .03, 6, 12); kn.translate(0, mastH - .1, -.05); mesh(kn, rope, mast); }
    [-1, 1].forEach((sd) => rodBetween(new THREE.Vector3(0, mastH - .05, -.05), new THREE.Vector3(sd * (Wd / 2 - .05), .02, -1.5), .008, rope, body, 4));
    const yardY = mastH - .25, yard = new THREE.Group(); yard.position.set(0, yardY, -.02); mast.add(yard);
    { const yg = new THREE.CylinderGeometry(.04, .04, 2.2, 7); yg.rotateZ(Math.PI / 2); mesh(yg, logM, yard); }
    const boom = new THREE.Group(); boom.position.set(0, .55, 0); mast.add(boom); { const bg = new THREE.CylinderGeometry(.04, .04, 2.0, 7); bg.rotateZ(Math.PI / 2); mesh(bg, logM, boom); }
    /* ponyvavitorla: foltozott, kopott szélű, varratokkal */
    const sT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#d8c9a3"; g.fillRect(0, 0, w, h); const pc = ["#c3b48c", "#b9a477", "#e1d6b8", "#a89466", "#cdbb8f"];
      for (let k = 0; k < 9; k++) { g.fillStyle = pc[k % 5]; const x = rr(0, w * .8), y = rr(0, h * .8), ww = rr(70, 180), hh = rr(60, 160); g.fillRect(x, y, ww, hh); g.setLineDash([8, 6]); g.strokeStyle = "rgba(80,60,30,.7)"; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, ww - 8, hh - 8); g.setLineDash([]); }
      g.fillStyle = "rgba(90,70,40,.18)"; for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(rr(0, w), rr(0, h), rr(3, 14), 0, TAU); g.fill(); }
      g.fillStyle = "#6b2a1a"; g.font = "900 64px Georgia, serif"; g.textAlign = "center"; g.fillText(o.name ? String(o.name).toUpperCase().slice(0, 12) : "S.O.S.", w / 2, h * .55);
      g.globalCompositeOperation = "destination-out"; for (let k = 0; k < 30; k++) { g.beginPath(); g.arc(rr(0, w), h - rr(0, 18), rr(4, 14), 0, TAU); g.fill(); g.beginPath(); g.arc(w - rr(0, 14), rr(0, h), rr(4, 12), 0, TAU); g.fill(); } g.globalCompositeOperation = "source-over"; });
    const sailM = std({ map: sT, roughness: 1, side: THREE.DoubleSide, transparent: true, alphaTest: .4 });
    const sailG = new THREE.Group(); sailG.position.set(0, 0, .02); mast.add(sailG);
    const sail = softSail({ parent: sailG, nu: 8, nv: 8, mat: sailM, camber: .16, twist: .05, sag: .05,
      luff: (v) => new THREE.Vector3(-1.05, .58 + v * (yardY - .62), 0), chord: (v) => 2.1 });
    /* kormányevező a farnál */
    const oar = new THREE.Group(); oar.position.set(0, .35, -1.75); body.add(oar); { const sh = new THREE.CylinderGeometry(.035, .035, 2.4, 7); sh.rotateX(Math.PI / 2 - .35); mesh(sh, logM, oar); const bl = new THREE.BoxGeometry(.04, .3, .55); bl.translate(0, -.42, -1.15); mesh(bl, logM, oar); }
    /* rakomány: láda, kötéltekercs, banánfürt, vizeskulacs, kókuszhéjak, kis zászló (rongyból) */
    { const cr = mesh(new THREE.BoxGeometry(.5, .38, .42), std({ color: "#9b7748", roughness: .9 }), body); cr.position.set(.55, .44, -.9); cr.rotation.y = .3;
      const cl = new THREE.TorusGeometry(.17, .05, 6, 14); cl.rotateX(Math.PI / 2); mesh(cl, rope, body).position.set(-.6, .3, -1.1);
      const ban = new THREE.Group(); ban.position.set(-.2, .55, .9); body.add(ban); for (let k = 0; k < 6; k++) { const bg = new THREE.CapsuleGeometry(.035, .16, 3, 6); bg.rotateZ(.5 + k * .12); bg.translate(k * .03 - .08, 0, (k % 2) * .04); mesh(bg, std({ color: "#f4d03f", roughness: .6 }), ban); }
      const can = mesh(new THREE.CylinderGeometry(.09, .09, .3, 12), std({ color: "#3b6ea8", roughness: .5 }), body); can.position.set(-.75, .4, -.4);
      [[.2, -1.3], [.05, -1.25]].forEach(([x, z]) => { const cg = new THREE.SphereGeometry(.1, 10, 6, 0, TAU, 0, Math.PI / 2); mesh(cg, std({ color: "#5a3a1e", roughness: 1 }), body).position.set(x, .27, z); });
      const fp = rodBetween(new THREE.Vector3(.95, .25, -1.7), new THREE.Vector3(1.0, 1.6, -1.75), .02, logM, body, 5); fp.userData.k = 1;
      const flg = mesh(new THREE.PlaneGeometry(.5, .3, 5, 1), std({ color: "#c8102e", side: THREE.DoubleSide, roughness: 1 }), body); flg.position.set(.75, 1.45, -1.76); G.userData.flag = flg; }
    /* RÁK REZSŐ – a kis piros rák a ládán: két nagy olló, pálcikaszemek, integet */
    const crab = new THREE.Group(); crab.position.set(.55, .66, -.9); body.add(crab);
    { const red = std({ color: "#e0412c", roughness: .5 }), dark = std({ color: "#1a1a1a", roughness: .3 }), wht = std({ color: "#ffffff", roughness: .4 });
      const sh = new THREE.SphereGeometry(.12, 16, 10); sh.scale(1.3, .55, 1); mesh(sh, red, crab);
      [-1, 1].forEach((sd) => { const st = new THREE.CylinderGeometry(.008, .008, .09, 5); st.translate(sd * .04, .09, .08); mesh(st, red, crab); const ey = mesh(new THREE.SphereGeometry(.028, 10, 8), wht, crab); ey.position.set(sd * .04, .145, .085); const pu = mesh(new THREE.SphereGeometry(.014, 8, 6), dark, crab); pu.position.set(sd * .04, .148, .108);
        for (let k = 0; k < 3; k++) { const lg = new THREE.CylinderGeometry(.012, .008, .16, 5); lg.rotateZ(sd * 1.1); lg.translate(sd * (.16 + .02), -.03, -.05 + k * .05); mesh(lg, red, crab); }
        const cl = new THREE.Group(); cl.position.set(sd * .17, .04, .1); crab.add(cl); const cg1 = new THREE.SphereGeometry(.06, 10, 8); cg1.scale(1, .7, 1.3); cg1.translate(0, 0, .05); mesh(cg1, red, cl); const cg2 = new THREE.ConeGeometry(.025, .09, 6); cg2.rotateX(Math.PI / 2); cg2.translate(sd * .02, .02, .13); mesh(cg2, red, cl);
        if (sd > 0) G.userData.claw = cl; });
      const sm = mesh(new THREE.TorusGeometry(.04, .006, 4, 10, Math.PI), dark, crab); sm.position.set(0, .03, .118); sm.rotation.z = Math.PI; }
    const crew = [];
    if (o.crew) { const p = makePerson({ top: "#e9e1cf", bot: "#4a5a6a", hair: "#4a3424", seed: o.seed || 2, bareLegs: true, shoe: "#d29a72", sleeve: false }); body.add(p); crew.push(p); }
    const S = { side: 1, boom: .2, luff: 0, heel: 0, pitch: 0, spin: 0, awa: null, aws: 6, rud: 0, t: 0 };
    G.userData = Object.assign(G.userData, { S, body, mast, deckY: .3, seat: new THREE.Vector3(0, .3, -1.25), cls: "tutaj", chartAt: new THREE.Vector3(.3, .32, -.6) });
    G.userData.update = (dt) => {
      S.t += dt; const A = S.awa != null ? S.awa : 60, U = S.aws || 6;
      /* négyszögletes ponyva a két vízszintes rúd között: hátszélben keresztben áll, félszélben a szél alá fordul; a domborulat mindig előre (a szél alá) dagad */
      const yT = S.side * clamp((180 - A) * .55, 0, 62) * D2R; S.boomS = S.boomS == null ? yT : S.boomS + (yT - S.boomS) * Math.min(1, dt * 1.5); S.boom = S.boomS;
      sailG.rotation.y = -S.boom; boom.rotation.y = -S.boom; yard.rotation.y = -S.boom; const lf = clamp(1 - (A - 32) / 16, 0, 1); S.luff = lf;
      { const p = sail.geo.attributes.position, nu = 8, nv = 8, k1 = clamp(U / 7, .3, 1.15) * (1 - lf * .85); for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const k = j * (nu + 1) + i, u = i / nu, v = j / nv;
          const bulge = .34 * k1 * Math.sin(Math.PI * u) * Math.sin(Math.PI * (.12 + .88 * v)) + (lf > .05 ? .1 * lf * Math.sin(S.t * 9 - u * 6 + v * 3) : 0) + .02 * Math.sin(S.t * 4.3 + u * 5) * k1;
          p.setXYZ(k, -1.05 + 2.1 * u, .58 + v * (yardY - .62) - .06 * Math.sin(Math.PI * u) * (1 - v), bulge); } p.needsUpdate = true; sail.geo.computeVertexNormals(); }
      body.rotation.set(S.pitch + .02 * Math.sin(S.t * 1.7), 0, S.heel * .35 + .03 * Math.sin(S.t * 1.3), "YXZ");
      oar.rotation.y = -(S.rud || 0) * .5;
      if (G.userData.claw) G.userData.claw.rotation.z = .4 + .5 * Math.sin(S.t * 3.1);
      if (G.userData.flag) { G.userData.flag.rotation.y = -S.side * .6 + .25 * Math.sin(S.t * 5); }
      crab.rotation.y = .3 * Math.sin(S.t * .5);
      crew.forEach((p) => { p.position.set(-.2, .28 - .45 + .02, -1.45); p.rotation.y = .2; posePerson(p, dt, { sit: 1, pull: false, armR: -.3, turn: .4 * Math.sin(S.t * .3) }); });
    };
    G.userData.update(0); return G;
  }

  /* =============================================================== FELFÚJHATÓ FLAMINGÓ (horgászbot-árboc, strandtörölköző-grósz, melltartó-spinakker) */
  function makeFlamingo(o) {
    o = Object.assign({ crew: 1, pink: "#ff7eb6" }, o);
    const G = new THREE.Group(), body = new THREE.Group(); G.add(body);
    const pinkM = new THREE.MeshPhysicalMaterial({ color: o.pink, roughness: .28, clearcoat: .9, clearcoatRoughness: .12, sheen: .3 }); W.disposables.push(pinkM);
    const pink2 = new THREE.MeshPhysicalMaterial({ color: "#ff5fa0", roughness: .3, clearcoat: .8 }); W.disposables.push(pink2);
    const seamM = std({ color: "#ffd0e4", roughness: .5 }), blk = std({ color: "#141414", roughness: .35 }), wht = std({ color: "#ffffff", roughness: .3 });
    /* test: felfújt gyűrű-test (tórusz, ellipszis alakban) + belső ülőpárna */
    { const tg = new THREE.TorusGeometry(.62, .3, 22, 48); tg.rotateX(Math.PI / 2); tg.scale(1, 1, 1.35); tg.translate(0, .22, 0); mesh(tg, pinkM, body);
      const sg = new THREE.CylinderGeometry(.62, .62, .12, 32); sg.scale(1, 1, 1.35); sg.translate(0, .1, 0); mesh(sg, pink2, body);
      const sm = new THREE.TorusGeometry(.62, .012, 6, 64); sm.rotateX(Math.PI / 2); sm.scale(1, 1, 1.35); sm.translate(0, .22, 0); mesh(sm, seamM, body); }
    /* szárnyak: két nagy felfújt párna oldalt, tollmintás csíkkal */
    [-1, 1].forEach((sd) => { const wg = new THREE.SphereGeometry(.42, 20, 14); wg.scale(.45, .55, 1.15); wg.rotateZ(sd * -.35); wg.translate(sd * .78, .45, -.05); mesh(wg, pinkM, body);
      for (let k = 0; k < 3; k++) { const fg = new THREE.TorusGeometry(.2 - k * .03, .012, 5, 16, Math.PI); fg.rotateY(Math.PI / 2); fg.rotateZ(sd * -.35); fg.translate(sd * .93, .52 - k * .06, -.25 - k * .12); mesh(fg, seamM, body); } });
    /* farok: felálló tollcsokor */
    { const tg = new THREE.ConeGeometry(.22, .5, 14); tg.rotateX(-Math.PI / 2 - .6); tg.translate(0, .45, -.95); mesh(tg, pinkM, body); }
    /* nyak: S-ív a test elejéből, felfújt cső */
    const neckPts = [new THREE.Vector3(0, .35, .7), new THREE.Vector3(0, .85, .85), new THREE.Vector3(0, 1.35, .62), new THREE.Vector3(0, 1.75, .78), new THREE.Vector3(0, 1.98, 1.05)];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neckPts), 40, .12, 14, false), pinkM, body);
    /* fej: gömb, szemek, kétszínű görbe csőr (fehér-rózsaszín tő, fekete hegy) */
    const head = new THREE.Group(); head.position.set(0, 2.02, 1.1); body.add(head);
    { const hg = new THREE.SphereGeometry(.17, 18, 14); hg.scale(1, .95, 1.15); mesh(hg, pinkM, head);
      [-1, 1].forEach((sd) => { const e = mesh(new THREE.SphereGeometry(.05, 12, 10), wht, head); e.position.set(sd * .12, .05, .06); const pu = mesh(new THREE.SphereGeometry(.026, 10, 8), blk, head); pu.position.set(sd * .155, .055, .08); const ll = mesh(new THREE.TorusGeometry(.05, .008, 4, 10, Math.PI), blk, head); ll.position.set(sd * .12, .08, .07); ll.rotation.y = sd * Math.PI / 2; });
      const bk1 = new THREE.CylinderGeometry(.075, .06, .2, 12); bk1.rotateX(Math.PI / 2 + .3); bk1.translate(0, -.02, .23); mesh(bk1, std({ color: "#ffe6ef", roughness: .3 }), head);
      const bk2 = new THREE.ConeGeometry(.06, .2, 12); bk2.rotateX(Math.PI / 2 + 1.0); bk2.translate(0, -.1, .36); mesh(bk2, blk, head); }
    /* HORGÁSZBOT-ÁRBOC: nyél parafával, orsó, gyűrűk, vékonyodó spicc; a zsinóron csüng a „vitorla” */
    const rod = new THREE.Group(); rod.position.set(0, .2, .25); body.add(rod);
    const rodH = 3.3;
    { const cork = new THREE.CylinderGeometry(.035, .04, .45, 10); cork.translate(0, .22, 0); mesh(cork, std({ color: "#c9a27a", roughness: .95 }), rod);
      const bl = new THREE.CylinderGeometry(.008, .028, rodH, 10); bl.translate(0, .45 + rodH / 2, 0); mesh(bl, std({ color: "#1d2a3a", roughness: .3, metalness: .3 }), rod);
      const reel = new THREE.Group(); reel.position.set(.07, .3, .02); rod.add(reel); const sp = new THREE.CylinderGeometry(.06, .06, .06, 16); sp.rotateZ(Math.PI / 2); mesh(sp, std({ color: "#c0c4ca", metalness: .8, roughness: .25 }), reel); const hd2 = new THREE.CylinderGeometry(.01, .01, .1, 6); hd2.rotateZ(Math.PI / 2); hd2.translate(.07, -.03, 0); mesh(hd2, blk, reel);
      for (let k = 0; k < 6; k++) { const y = .7 + k * (rodH - .5) / 6, r = .03 - k * .003, gg = new THREE.TorusGeometry(r, .004, 4, 10); gg.translate(0, y, .03); mesh(gg, std({ color: "#d8dce0", metalness: .8, roughness: .2 }), rod); }
      /* a spicc piros csúcsa és a zsinór */
      const tip = mesh(new THREE.SphereGeometry(.02, 8, 6), std({ color: "#ff2a2a" }), rod); tip.position.set(0, .45 + rodH, 0); }
    const lineMat = std({ color: "#e8f4ff", roughness: .3 });
    /* GRÓSZ = STRANDTÖRÖLKÖZŐ: csíkos frottír, rojtos szélekkel, rajta a játékos neve; a horgászbot mentén felhúzva (a bot gyűrűihez kötve), alul egy bambusz
       bum feszíti – ugyanúgy trimmelődik, dagad, belobog és csapkod, mint egy valódi grósz */
    const towT = canvasTex(512, 768, (g, w, h) => { const st = o.towel || ["#ff4f6d", "#ffffff", "#2fb7e8", "#ffd23a", "#ffffff", "#2fa85a"]; for (let k = 0; k < 12; k++) { g.fillStyle = st[k % st.length]; g.fillRect(0, k * h / 12, w, h / 12 + 1); }
      for (let k = 0; k < 4000; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }   /* frottír */
      g.fillStyle = "rgba(255,255,255,.85)"; for (let x = 0; x < w; x += 10) { g.fillRect(x, h - 14, 4, 14); g.fillRect(x, 0, 4, 12); }   /* rojt */
      const nm = String(o.name || "STRAND").toUpperCase().slice(0, 12); let fs = 110; g.font = `900 ${fs}px system-ui, sans-serif`; while (g.measureText(nm).width > w * .86 && fs > 36) { fs -= 4; g.font = `900 ${fs}px system-ui, sans-serif`; }
      g.save(); g.translate(w * .52, h * .5); g.rotate(-Math.PI / 2); g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 14; g.strokeStyle = "#0b2f5e"; g.strokeText(nm, 0, 0); g.fillStyle = "#ffffff"; g.fillText(nm, 0, 0); g.restore(); });
    const towG = new THREE.Group(); towG.position.set(0, .45, -.02); rod.add(towG);
    const boomY = .62, towH = rodH - .5, towW = 1.05, boom = new THREE.Group(); boom.position.set(0, .45 + boomY, -.02); rod.add(boom);
    { const bg = new THREE.CylinderGeometry(.018, .018, towW + .1, 7); bg.rotateX(Math.PI / 2); bg.translate(0, 0, -(towW + .1) / 2); mesh(bg, std({ color: "#c9a96a", roughness: .8 }), boom); for (let k = 1; k < 4; k++) { const n = new THREE.TorusGeometry(.021, .005, 4, 10); n.rotateX(Math.PI / 2); n.translate(0, 0, -k * .28); mesh(n, std({ color: "#8a6a3a" }), boom); } }
    const towel = softSail({ parent: towG, nu: 9, nv: 14, mat: std({ map: towT, roughness: 1, side: THREE.DoubleSide }), camber: .14, twist: .22, sag: .03,
      luff: (v) => new THREE.Vector3(0, boomY + .02 + v * (towH - boomY), -.02), chord: (v) => towW * (1 - .12 * v) });
    /* SPINAKKER = NAGY MELLTARTÓ: hátszélben a bot csúcsáról az orr elé húzzák fel; a két kosár a széltől kidagad (egymástól kicsit eltérő ütemben ring),
       félig telve a széle csapkod; a pántok a bot csúcsához, a kapocs a csőrhöz kötve */
    const braT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = o.braC || "#ff5fa0"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,.9)"; for (let y = 10; y < h; y += 34) for (let x = (y / 34 % 2) * 17 + 8; x < w; x += 34) { g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); }
      g.strokeStyle = "#ffffff"; g.lineWidth = 10; g.setLineDash([5, 9]); g.beginPath(); g.arc(w / 2, h / 2, w * .47, 0, TAU); g.stroke(); });
    const braM = std({ map: braT, roughness: .65, side: THREE.DoubleSide });
    const spin = new THREE.Group(); spin.position.set(0, 1.55, 1.75); body.add(spin);
    const CUPN = 16, CUPM = 10, cups = [];
    [-1, 1].forEach((sd) => { const pos = new Float32Array((CUPN + 1) * (CUPM + 1) * 3), uvA = new Float32Array((CUPN + 1) * (CUPM + 1) * 2), id = [];
      for (let j = 0; j <= CUPM; j++) for (let i = 0; i <= CUPN; i++) { const k = j * (CUPN + 1) + i, a = i / CUPN * TAU, r = j / CUPM; uvA[k * 2] = .5 + Math.cos(a) * r * .5; uvA[k * 2 + 1] = .5 + Math.sin(a) * r * .5; }
      for (let j = 0; j < CUPM; j++) for (let i = 0; i < CUPN; i++) { const a2 = j * (CUPN + 1) + i, b2 = a2 + 1, c2 = a2 + CUPN + 1, d2 = c2 + 1; id.push(a2, c2, b2, b2, c2, d2); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); gg.setAttribute("uv", new THREE.BufferAttribute(uvA, 2)); gg.setIndex(id); W.disposables.push(gg);
      const cm = new THREE.Mesh(gg, braM); cm.frustumCulled = false; cm.position.set(sd * .52, 0, 0); spin.add(cm);
      const rim = mesh(new THREE.TorusGeometry(.55, .028, 6, 32), std({ color: "#ffffff", roughness: .5 }), cm); rim.scale.set(1, 1.12, 1);
      cups.push({ m: cm, g: gg, sd, ph: Math.random() * 6, rim }); });
    { const br = mesh(new THREE.BoxGeometry(.16, .14, .06), std({ color: "#ffffff" }), spin); const bow = mesh(new THREE.TorusGeometry(.06, .02, 6, 12), std({ color: "#ff2a6a" }), spin); bow.position.set(0, -.1, .05); }
    const straps = [0, 1, 2, 3].map(() => rodBetween(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), .009, std({ color: "#ffffff", roughness: .6 }), body, 4));
    const lineMat2 = std({ color: "#e8f4ff", roughness: .3 }), towLine = rodBetween(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), .003, lineMat2, body, 3);
    /* a strandoló: napszemüveg, szalmakalap, mentőmellény; fogja a botot */
    const crew = [];
    if (o.crew) { const p = makePerson({ top: o.top || "#2fa85a", bot: o.bot || "#ff7a1a", vest: "#ff7a1a", sunhat: o.hat || "#e8d29a", glasses: true, bareLegs: true, shoe: "#e8bc96", sleeve: false, seed: o.seed || 4 }); body.add(p); crew.push(p); }
    const S = { side: 1, boom: .2, luff: 0, heel: 0, pitch: 0, spin: 0, awa: null, aws: 6, rud: 0, t: 0 };
    G.userData = Object.assign(G.userData, { S, body, mast: rod, deckY: .16, seat: new THREE.Vector3(0, .15, -.15), cls: "flamingo", chartAt: new THREE.Vector3(0, .4, .55) });
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
    const setLine = (m, a, b) => { _b.subVectors(b, a); const L = _b.length(); m.position.copy(a); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(_up, _b.normalize()); };
    G.userData.update = (dt) => {
      S.t += dt; const A = S.awa != null ? S.awa : 60, U = S.aws || 6, sp = S.spin || 0;
      /* törölköző-grósz: a szél alá áll (hátszélben kint, élesen behúzva), dagad, belobog */
      const bT = clamp(A - 18, 5, 82) * D2R * S.side; S.boomS = S.boomS == null ? bT : S.boomS + (bT - S.boomS) * Math.min(1, dt * (Math.sign(bT) !== Math.sign(S.boomS) ? 3 : 1.6)); S.boom = S.boomS;
      const lf = Math.max(clamp(1 - (A - Math.abs(S.boom) * R2D - 4) / 8, 0, 1), clamp(1 - (A - 26) / 10, 0, 1)); S.luff = lf;
      boom.rotation.y = -S.boom; towel.update(dt, S.boom, lf, U, S.side, 1 - sp * .25);
      rod.rotation.z = -S.side * .05 * clamp(U / 7, .3, 1.2) * (1 - lf); rod.rotation.x = -.04 * clamp(U / 7, .3, 1.2);
      body.updateMatrixWorld(true); _a.set(0, .2 + .45 + rodH, .25); _b.set(Math.sin(S.boom) * towW, .2 + .45 + boomY - .01, .25 - .02 - Math.cos(S.boom) * towW); setLine(towLine, _a.set(0, .62, -.45), _b);   /* a szkóta a bum végétől a strandoló kezéhez */
      /* melltartó-spinakker */
      spin.visible = sp > .03; straps.forEach((m) => { m.visible = spin.visible; });
      if (spin.visible) { const fill = clamp(U / 6, .35, 1.25), sa = -S.side * clamp(A - 100, 0, 75) * D2R * .55, flap = clamp(1 - sp * 1.4, 0, 1) + clamp((115 - A) / 20, 0, 1) * .6;
        spin.rotation.set(-.12 * sp * fill, sa, Math.sin(S.t * 1.3) * .05 * sp); const hoist = .25 + .75 * Math.min(1, sp * 1.6); spin.scale.setScalar(hoist); spin.position.set(Math.sin(sa) * .5 * sp, 1.25 + .55 * sp + .05 * Math.sin(S.t * 1.7), 1.6 + .55 * sp);
        cups.forEach((c) => { const pa = c.g.attributes.position.array, depth = .62 * sp * fill * (1 - .6 * clamp(flap, 0, 1)) * (1 + .08 * Math.sin(S.t * 2.2 + c.ph)), R0 = .55;
          for (let j = 0; j <= CUPM; j++) for (let i = 0; i <= CUPN; i++) { const k = (j * (CUPN + 1) + i) * 3, a = i / CUPN * TAU, r = j / CUPM, wob = flap > .05 ? .07 * flap * Math.sin(S.t * 11 - a * 2 + r * 4 + c.ph) * r : 0, bulge = Math.cos(r * Math.PI / 2) * depth;
            pa[k] = Math.cos(a) * r * R0 * (1 + .04 * Math.sin(S.t * 3 + a)); pa[k + 1] = Math.sin(a) * r * R0 * 1.12; pa[k + 2] = bulge + wob; }
          c.g.attributes.position.needsUpdate = true; c.g.computeVertexNormals(); c.m.rotation.y = c.sd * (.18 + .1 * sp) + .04 * Math.sin(S.t * 2.6 + c.ph); c.m.rotation.x = -.08; });
        /* pántok: a két felső a bot csúcsához, a két oldalsó a csőrhöz és a strandolóhoz */
        spin.updateMatrixWorld(true); body.updateMatrixWorld(true); const tip = new THREE.Vector3(0, .2 + .45 + rodH, .25), beak = new THREE.Vector3(0, 1.9, 1.38), hand = new THREE.Vector3(.2, .7, -.1);
        cups.forEach((c, i) => { const top = body.worldToLocal(c.m.localToWorld(new THREE.Vector3(c.sd * .15, .58, 0))), side = body.worldToLocal(c.m.localToWorld(new THREE.Vector3(c.sd * .55, 0, 0)));
          setLine(straps[i], top, tip); setLine(straps[2 + i], side, i ? hand : beak); }); }
      head.rotation.y = .25 * Math.sin(S.t * .6); head.rotation.x = .08 * Math.sin(S.t * .9);
      crew.forEach((p) => { p.position.set(0, .14 - .45, -.25); p.rotation.y = 0; posePerson(p, dt, { sit: 1, pull: true, armR: .2, legs: .35, turn: .3 * Math.sin(S.t * .4), wave: S.waveT > 0 ? 1 : 0 }); });
    };
    G.userData.update(0); return G;
  }
  /* egy osztály hajómodellje (a Zephyr kivételével – az a 05b-ben készül) */
  function makeClassBoat(id, o) { return id === "finn" ? makeFinn(o) : id === "j420" ? make420(o) : id === "tutaj" ? makeRaft(o) : id === "flamingo" ? makeFlamingo(o) : null; }
