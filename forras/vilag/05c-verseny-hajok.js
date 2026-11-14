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
    tutaj:    { id: "tutaj",    n: "Rönktutaj",             sh: "Tutaj",    len: "3,8 m · rönkökből kötve",   crew: "hajótörött + Kókusz Kata",     spd: 1,    cs: .8,  up: 44, half: 1.9,  rad: 1.25, hit: 2.2, d: "Hajótörött-tutaj: rongyokból fércelt vitorla, esőkabát-spinakker, zoknizászló – és Kókusz Kata az árboc tövében, aki minden szélre más arcot vág." },
    flamingo: { id: "flamingo", n: "Flamingó matrac",       sh: "Flamingó", len: "1,9 m · felfújható",        crew: "egy bátor strandoló",        spd: 1.0,  cs: .8,  up: 40, half: 1.15, rad: .95, hit: 1.6, d: "Horgászbot az árboc, csíkos strandtörölköző a grósz (rajta a neved), hátszélben egy nagy pöttyös melltartó dagad ki spinakkerként. Vigyázz, borul!" }
  };
  const BOAT_ORDER = ["zephyr", "finn", "j420", "tutaj", "flamingo"];
  function boatCls(id) { return BOATCLS[id] || BOATCLS.zephyr; }

  /* --------------------------------------------------------------- közös: puha vitorla (paraméteres háló, a szélhez trimmelve, lobog, ha belobog) */
  const bsst2 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  /* 2026-11-14 18:15: a kishajók zárt héján belül a víz nem rajzolódik – a víz-shader a hajótestek körvonalán belül eldobja a pixeleket (02-kornyezet.js uHull) */
  const _hmP = new THREE.Vector3(), _hmF = new THREE.Vector3();
  function hullMaskSet(mat, groups) { if (!mat || !mat.uniforms.uHull) return; const H = mat.uniforms.uHull.value, HS = mat.uniforms.uHullS.value; let n = 0;
    groups.forEach((g) => { if (!g || n >= H.length || !g.userData || !g.userData.hullLB || !g.visible || !g.parent) return; g.updateMatrixWorld(true); _hmP.setFromMatrixPosition(g.matrixWorld); _hmF.set(0, 0, 1).transformDirection(g.matrixWorld); _hmF.y = 0; _hmF.normalize();
      const sc = new THREE.Vector3().setFromMatrixScale(g.matrixWorld).x; H[n].set(_hmP.x, _hmP.z, _hmF.x, _hmF.z); HS[n].set(g.userData.hullLB[0] * sc, g.userData.hullLB[1] * sc, 0); n++; });
    for (let i = n; i < H.length; i++) HS[i].set(0, 0, 0); }
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
    const L = new THREE.Vector3(), L2 = new THREE.Vector3();
    /* 2026-11-14 (tulajdonos: „a vitorlák részletessége, a grósz mozgása legyen életszerűbb”): ÉLETHŰ VITORLAMOZGÁS
       • soronkénti (alulról felfelé) tehetetlenség: a vitorla nem egyszerre telik meg és nem egyszerre vált oldalt – forduláskor a lécek egymás után „pattannak át”;
       • a mély pont (draft) a húr ~42%-ánál, felfelé laposodó profil; erős szélben az árboc meghajlik (előre ível) és a vitorla laposabb lesz;
       • széllökésben először a belépő él telik meg, a hátsó él kinyílik (csavarodás nő), aztán visszazár;
       • belobogás: előbb buborék a belépő él mögött, majd az egész vászon hullámzik – a hullám a belépő éltől a hátsó él felé fut, a szél erejével gyorsul;
       • teli vitorlán erős szélben a hátsó él felső része rezeg (leech flutter), gyenge szélben ráncok az árboc mögött;
       • jelzőszálak (telltale) a lécek végén: sima áramlásnál hátrafelé lobognak, belobogáskor összevissza csapkodnak. */
    const st = { a: 0, lf: 0, t: Math.random() * 9, side: 1, U: 6, Uf: 6, gk: 0, depth: o.camber || .1, sv: new Float32Array(nv + 1).fill(1), fl: new Float32Array(nv + 1).fill(1) };
    const dpos = o.draft || .42, dxp = Math.log(.5) / Math.log(dpos);
    /* jelzőszálak a hátsó élen (3 magasságban) */
    const TT = []; if (o.telltales !== false && o.parent) { const tm = new THREE.LineBasicMaterial({ color: "#d61f26" }), tm2 = new THREE.LineBasicMaterial({ color: "#1e8e4f" }); W.disposables.push(tm, tm2);
      [.3, .55, .8].forEach((v, i) => { const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(15), 3)); W.disposables.push(tg); const ln = new THREE.Line(tg, i % 2 ? tm2 : tm); ln.frustumCulled = false; o.parent.add(ln); TT.push({ v, ln, ph: Math.random() * 9 }); }); }
    st.update = (dt, a, lf, U, side, k) => {   /* a: a vitorla szöge (rad, + = a hajó +x oldala felé), lf: belobogás 0..1, U: látszólagos szél m/s, k: teltség-szorzó */
      dt = Math.min(dt || 0, .1); st.t += dt; const t = st.t, fill = k == null ? 1 : k, sd = Math.abs(a) > .02 ? Math.sign(a) : side;
      st.Uf += (U - st.Uf) * Math.min(1, dt * .6); st.gk += (clamp((U - st.Uf) / Math.max(2, st.Uf), -.5, .6) - st.gk) * Math.min(1, dt * 3);   /* széllökés-érzékelés */
      const om = TAU * (.9 + U * .17), flat = 1 - .32 * clamp((U - 6.5) / 7, 0, 1), bendK = (o.bend || .05) * clamp(U / 9, .15, 1.3) * (1 + st.gk * .8);
      for (let j = 0; j <= nv; j++) {
        const v = j / nv, c = o.chord(v); L.copy(o.luff(v));
        /* soronkénti oldal és teltség – alul gyorsabb, felül lassabb (a lécek egymás után pattannak át) */
        const rate = (4.2 - 2.4 * v) * dt, dS = sd - st.sv[j]; st.sv[j] += clamp(dS, -rate, rate); const q = st.sv[j], sdj = Math.sign(q || sd) * Math.pow(Math.abs(q), .5);
        const tgtF = fill * (1 - .9 * lf); st.fl[j] += (tgtF - st.fl[j]) * Math.min(1, dt * (tgtF > st.fl[j] ? 2.6 - 1.2 * v : 5)); const fj = st.fl[j], lfj = Math.max(lf, (1 - Math.abs(q)) * .95);
        const tw = (o.twist || .18) * (1 + st.gk * 1.6 + .5 * clamp((Math.abs(a) - .6) / .8, 0, 1)), aa = a + sdj * tw * v * v, dx = Math.sin(aa), dz = -Math.cos(aa), px = Math.cos(aa) * sdj, pz = Math.sin(aa) * sdj;
        const bend = o.bend === 0 ? 0 : bendK * Math.sin(Math.PI * v) * c;   /* árbochajlás: a belépő él közepe előre ível → a vitorla laposabb */
        const foot = o.loose ? 1 : .3 + .7 * Math.min(1, v / .12);          /* a bumhoz fogott alsó él simul */
        for (let i = 0; i <= nu; i++) {
          const u = i / nu, k2 = (j * (nu + 1) + i) * 3, prof = Math.sin(Math.PI * Math.pow(u, dxp)) * (1 - .3 * v);
          /* a teltség a belépő éltől halad a hátsó él felé */
          const fu = clamp(fj * 1.25 - (u * .25) * (1 - fj), 0, 1);
          let dep = st.depth * c * prof * fu * flat * foot * (1 - .1 * bend / Math.max(c, .01));
          if (lfj > .02) { const bub = lfj * (1 - bsst2(.5, 1, lfj)), flog = bsst2(.45, 1, lfj), e = Math.exp(-u * 5.5);
            dep -= st.depth * c * bub * 1.8 * e * foot;   /* buborék a belépő él mögött */
            dep += c * (.075 * flog * Math.sin(om * t - u * 9 - v * 2.8) * (.25 + .75 * u) + .03 * flog * Math.sin(om * 1.7 * t - u * 15 + v * 5)) * clamp(U / 7, .25, 1.15) * foot; }
          if (U > 5 && lfj < .3) dep += c * .016 * clamp((U - 5) / 5, 0, 1) * Math.pow(Math.max(0, u - .7) / .3, 2) * bsst2(.35, .75, v) * Math.sin(TAU * 6.8 * t + v * 9 + u * 3);   /* hátsóél-rezgés */
          if (U < 4.5 && lfj < .3) dep += c * .008 * Math.exp(-u * 7) * Math.sin(v * 46 + u * 9) * (1 - U / 4.5);   /* ráncok gyenge szélben */
          dep += c * .006 * Math.sin(t * 2.1 + v * 4 - u * 5) * st.gk;   /* a vászon „lélegzik” a lökésekben */
          pos[k2] = L.x + dx * c * u + px * dep; pos[k2 + 1] = L.y + (o.sag ? -o.sag * Math.sin(Math.PI * u) * (1 - v) : 0); pos[k2 + 2] = L.z + dz * c * u + pz * dep + bend * (1 - u) * (1 - u);
        }
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals();
      /* jelzőszálak: a hátsó él pontjából 5 pontos szalag */
      TT.forEach((T2) => { const j = Math.round(T2.v * nv), kk = (j * (nu + 1) + nu) * 3, kk0 = (j * (nu + 1) + nu - 1) * 3, A = T2.ln.geometry.attributes.position.array; L.set(pos[kk], pos[kk + 1], pos[kk + 2]); L2.set(pos[kk] - pos[kk0], pos[kk + 1] - pos[kk0 + 1], pos[kk + 2] - pos[kk0 + 2]).normalize();
        const lfx = Math.max(lf, 1 - Math.abs(st.sv[j])), len = .055 * (o.ttLen || 1) * Math.max(.6, o.chord(T2.v) / 1.2);
        for (let n = 0; n < 5; n++) { const f = n / 4, wv = Math.sin(t * (9 + U) + T2.ph - f * 5) * f * (.15 + lfx * .9), cu = lfx * Math.sin(t * 3.3 + T2.ph + f * 3) * f * 1.2;
          A[n * 3] = L.x + (L2.x * Math.cos(cu) - L2.z * Math.sin(cu)) * len * n + wv * len * .8 * L2.z; A[n * 3 + 1] = L.y - f * f * len * (lfx * 1.5 + .2) + wv * len * .3; A[n * 3 + 2] = L.z + (L2.z * Math.cos(cu) + L2.x * Math.sin(cu)) * len * n - wv * len * .8 * L2.x; }
        T2.ln.geometry.attributes.position.needsUpdate = true; });
    };
    st.mesh = m; st.geo = g; return st;
  }
  /* vitorlavászon textúra: panelek, lécek, szám, felirat (név a grószon) */
  function dinghySailTex(o) {
    return canvasTex(512, 1024, (g, w, h) => {
      g.fillStyle = o.cloth || "#f6f5ef"; g.fillRect(0, 0, w, h);
      /* 2026-11-14: vitorlakészítői részletek – ferde szabású panelek varrással, szövetszerkezet, élszalag a belépő élen, hátsóél-zsinór,
         sugaras sarokerősítések (nyak, szkótasarok, fej), mélységjelző csíkok (draft stripes), jelzőszál-ablakok */
      for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .018})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      for (let y = 0; y < h + 80; y += 68) { g.strokeStyle = "rgba(0,0,0,.075)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y - 22); g.stroke(); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y + 3); g.lineTo(w, y - 19); g.stroke(); }
      g.fillStyle = "rgba(255,255,255,.6)"; g.fillRect(0, 0, 16, h); g.fillStyle = "rgba(0,0,0,.14)"; g.fillRect(16, 0, 2, h);   /* élszalag (az árboc felőli él a textúra bal széle) */
      g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(w - 6, 0, 6, h); g.fillRect(0, h - 8, w, 8);   /* hátsóél-zsinór, alsó él */
      const fan = (x, y, a0, a1, R) => { g.fillStyle = "rgba(255,255,255,.14)"; g.beginPath(); g.moveTo(x, y); g.arc(x, y, R, a0, a1); g.closePath(); g.fill(); g.strokeStyle = "rgba(0,0,0,.13)"; g.lineWidth = 2; for (let i = 0; i <= 7; i++) { const aa = a0 + (a1 - a0) * i / 7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(aa) * R, y + Math.sin(aa) * R); g.stroke(); }
        g.fillStyle = "#c9ced4"; g.beginPath(); g.arc(x + Math.cos((a0 + a1) / 2) * 26, y + Math.sin((a0 + a1) / 2) * 26, 10, 0, TAU); g.fill(); g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.arc(x + Math.cos((a0 + a1) / 2) * 26, y + Math.sin((a0 + a1) / 2) * 26, 4.5, 0, TAU); g.fill(); };
      fan(0, h, -Math.PI / 2, 0, 120); fan(w, h, -Math.PI, -Math.PI / 2, 130); fan(0, 0, 0, Math.PI / 2, 100);
      [.3, .55, .78].forEach((v) => { const y = h * (1 - v); g.strokeStyle = "rgba(20,30,60,.45)"; g.lineWidth = 5; g.beginPath(); g.moveTo(w * .04, y); g.quadraticCurveTo(w * .4, y - 8, w * .9, y + 4); g.stroke(); g.fillStyle = "rgba(200,225,240,.5)"; g.beginPath(); g.arc(w * .2, y + 26, 9, 0, TAU); g.fill(); });
      if (o.finnIns) { g.strokeStyle = "#1f4fbf"; g.lineWidth = 16; [0, 1].forEach((k) => { g.beginPath(); for (let x = w * .22; x <= w * .86; x += 6) { const yy = h * .14 + k * 40 + Math.sin((x - w * .22) / (w * .64) * TAU * 1.5) * 13; if (x === w * .22) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }); }   /* a Finn osztályjelvénye: két kék hullámvonal */

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
  /* 2026-11-14 18:53 (tulajdonos): a Zephyr mentőmellény – elöl a cipzár két oldalán piros, felfelé szélesedő V-panel, oldalt fekete, a bal mellen
     fekete ZEPHYR felirat, derékon fekete heveder csattal; a HÁTA EGYSZÍNŰ FEKETE. (CapsuleGeometry: u=0/1 = elöl (+z), u=.5 = hátul) */
  let _zvTex = null;
  function zephyrVestTex() {
    if (_zvTex) return _zvTex;
    _zvTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = "#17181b"; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .03})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 1); }
      const red = (sd) => { g.fillStyle = "#d4121e"; g.beginPath(); for (let i = 0; i <= 20; i++) { const v = i / 20, y = h * (1 - v), wd = .018 + .085 * Math.pow(v, 1.4); const x = sd > 0 ? w * (.012 + wd) : w * (1 - .012 - wd); if (i === 0) g.moveTo(sd > 0 ? w * .012 : w * .988, y); g.lineTo(x, y); }
        g.lineTo(sd > 0 ? w * .012 : w * .988, 0); g.closePath(); g.fill(); };
      red(1); red(-1);
      g.fillStyle = "#17181b"; g.beginPath(); g.moveTo(w * .97, 0); g.lineTo(w, h * .32); g.lineTo(w, 0); g.closePath(); g.fill(); g.beginPath(); g.moveTo(w * .03, 0); g.lineTo(0, h * .32); g.lineTo(0, 0); g.closePath(); g.fill();   /* V-nyak */
      g.fillStyle = "#0b0b0c"; g.fillRect(0, 0, w * .006, h); g.fillRect(w * .994, 0, w * .006, h);   /* cipzár */
      g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1.5; for (let y = 6; y < h; y += 8) { g.beginPath(); g.moveTo(w * .985, y); g.lineTo(w, y); g.stroke(); g.beginPath(); g.moveTo(0, y); g.lineTo(w * .015, y); g.stroke(); }
      g.save(); g.translate(w * .935, h * .36); g.scale(-1, 1); g.fillStyle = "#101010"; g.font = "italic 900 15px Arial, sans-serif"; g.textAlign = "center"; g.fillText("ZEPHYR", 0, 0); g.restore();
      g.fillStyle = "#0a0a0b"; g.fillRect(0, h * .68, w, h * .1); g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(0, h * .685, w, 2);   /* derékheveder */
      g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 1; [.12, .3, .45, .55, .7, .88].forEach((u) => { g.beginPath(); g.moveTo(w * u, 0); g.lineTo(w * u, h); g.stroke(); }); });
    return _zvTex;
  }
  function makePerson(o) {
    o = o || {}; const g = new THREE.Group(), sk = std({ color: o.skin || SKIN[(o.seed || 0) % 5], roughness: .75 }), top = std({ color: o.top || "#1f5fa8", roughness: .8 }), bot = std({ color: o.bot || "#27303c", roughness: .85 }), hr = std({ color: o.hair || HAIR[(o.seed || 0) % 6], roughness: .9 });
    const hips = new THREE.Group(); hips.position.y = .9; g.add(hips);
    const torso = new THREE.Group(); hips.add(torso);
    { const tg = new THREE.CapsuleGeometry(.155, .36, 4, 12); tg.scale(1, 1, .72); tg.translate(0, .33, 0); mesh(tg, top, torso); }
    if (o.zvest) { const vg = new THREE.CapsuleGeometry(.178, .3, 6, 24); vg.scale(1.03, 1, .82); vg.translate(0, .33, 0); mesh(vg, std({ map: zephyrVestTex(), roughness: .55 }), torso);
      const bk = mesh(new THREE.BoxGeometry(.07, .045, .02), std({ color: "#0c0c0d", roughness: .4 }), torso); bk.position.set(0, .22, .148);
      [-1, 1].forEach((sd) => { const sp = new THREE.CapsuleGeometry(.05, .12, 3, 8); sp.rotateZ(Math.PI / 2); sp.translate(sd * .12, .6, 0); mesh(sp, std({ color: "#c8101c", roughness: .55 }), torso); });   /* vállpántok */
      const cl = new THREE.TorusGeometry(.105, .03, 6, 18, Math.PI * 1.25); cl.rotateX(Math.PI / 2); cl.rotateY(Math.PI * .375 + Math.PI); cl.translate(0, .6, -.01); mesh(cl, std({ color: "#17181b", roughness: .6 }), torso); }   /* gallér hátul */
    else if (o.vest) { const vg = new THREE.CapsuleGeometry(.175, .28, 4, 12); vg.scale(1.02, 1, .8); vg.translate(0, .34, 0); mesh(vg, std({ color: o.vest, roughness: .6 }), torso); }
    const neck = mesh(new THREE.CylinderGeometry(.05, .058, .09, 10), sk, torso); neck.position.y = .63;
    const head = new THREE.Group(); head.position.y = .7; torso.add(head);
    { const hg = new THREE.SphereGeometry(.112, 18, 14); hg.scale(.9, 1.08, 1); hg.translate(0, .09, 0); mesh(hg, sk, head);
      const hair = new THREE.SphereGeometry(.12, 18, 10, 0, TAU, 0, Math.PI * .52); hair.rotateX(-.28); hair.translate(0, .1, -.012); mesh(hair, hr, head);
      const nose = new THREE.ConeGeometry(.018, .05, 6); nose.rotateX(Math.PI / 2); nose.translate(0, .08, .11); mesh(nose, sk, head);
      [-1, 1].forEach((sd) => { const e = mesh(new THREE.SphereGeometry(.014, 8, 6), std({ color: "#1a1a1a", roughness: .3 }), head); e.position.set(sd * .04, .115, .098); });
      if (o.cap) { const cp = new THREE.SphereGeometry(.125, 16, 8, 0, TAU, 0, Math.PI * .45); cp.translate(0, .115, 0); mesh(cp, std({ color: o.cap, roughness: .7 }), head); const br = new THREE.BoxGeometry(.16, .012, .11); br.translate(0, .14, .13); mesh(br, std({ color: o.cap, roughness: .7 }), head); }
      if (o.glasses) { const gl = new THREE.BoxGeometry(.17, .035, .02); gl.translate(0, .115, .108); mesh(gl, std({ color: "#0d0f12", roughness: .2, metalness: .5 }), head); }
      if (o.sunhat) { const hb = new THREE.CylinderGeometry(.24, .26, .02, 20); hb.translate(0, .17, 0); mesh(hb, std({ color: o.sunhat, roughness: .9 }), head); const hc = new THREE.CylinderGeometry(.11, .13, .1, 16); hc.translate(0, .22, 0); mesh(hc, std({ color: o.sunhat, roughness: .9 }), head); }
      if (o.pro) { [-1, 1].forEach((sd) => { const ea = new THREE.SphereGeometry(.026, 8, 6); ea.scale(.5, 1, .8); ea.translate(sd * .1, .095, -.005); mesh(ea, sk, head);
          const bw = new THREE.BoxGeometry(.045, .01, .012); bw.rotateZ(sd * -.15); bw.translate(sd * .042, .145, .1); mesh(bw, hr, head);
          const wh = new THREE.SphereGeometry(.017, 8, 6); wh.scale(1.2, .8, .6); wh.translate(sd * .04, .115, .093); mesh(wh, std({ color: "#f4f1ea", roughness: .3 }), head); });
        const ch = new THREE.SphereGeometry(.06, 10, 8); ch.scale(1, .7, .8); ch.translate(0, .015, .06); mesh(ch, sk, head);
        const sg = new THREE.BoxGeometry(.19, .04, .02); sg.translate(0, .118, .112); mesh(sg, std({ color: "#101418", roughness: .1, metalness: .6 }), head); }
      const mouth = mesh(new THREE.TorusGeometry(.028, .006, 4, 10, Math.PI), std({ color: "#7a2a22" }), head); mouth.position.set(0, .045, .1); mouth.rotation.z = Math.PI; head.userData.mouth = mouth; }
    const arm = (sd) => { const sh = new THREE.Group(); sh.position.set(sd * .2, .52, 0); torso.add(sh);
      const ua = new THREE.CapsuleGeometry(.048, .24, 3, 8); ua.translate(0, -.15, 0); mesh(ua, o.sleeve === false ? sk : top, sh);
      const el = new THREE.Group(); el.position.y = -.3; sh.add(el); const fa = new THREE.CapsuleGeometry(.042, .22, 3, 8); fa.translate(0, -.14, 0); mesh(fa, sk, el);
      const hd = mesh(new THREE.SphereGeometry(.05, 10, 8), o.pro ? std({ color: "#1b1d22", roughness: .8 }) : sk, el); hd.position.y = -.3; if (o.pro) { hd.scale.set(.8, 1.15, .6); const th = new THREE.CapsuleGeometry(.014, .035, 2, 6); th.rotateZ(sd * .6); th.translate(sd * -.035, -.29, .02); mesh(th, std({ color: "#1b1d22", roughness: .8 }), el); } return { sh, el }; };
    const leg = (sd) => { const hp = new THREE.Group(); hp.position.set(sd * .09, 0, 0); hips.add(hp);
      const th = new THREE.CapsuleGeometry(.07, .34, 3, 8); th.translate(0, -.22, 0); mesh(th, bot, hp);
      const kn = new THREE.Group(); kn.position.y = -.44; hp.add(kn); const sn = new THREE.CapsuleGeometry(.055, .34, 3, 8); sn.translate(0, -.2, 0); mesh(sn, o.bareLegs ? sk : bot, kn);
      const ft = new THREE.BoxGeometry(.09, .06, .22); ft.translate(0, -.42, .05); mesh(ft, std({ color: o.shoe || "#f2f2f2", roughness: .7 }), kn);
      if (o.pro) { const bt = new THREE.CylinderGeometry(.06, .058, .14, 10); bt.translate(0, -.36, 0); mesh(bt, std({ color: "#1b1d22", roughness: .7 }), kn); const sl = new THREE.BoxGeometry(.095, .02, .23); sl.translate(0, -.455, .05); mesh(sl, std({ color: "#e8e8e8", roughness: .9 }), kn); }
      return { hp, kn }; };
    const P = { g, hips, torso, head, aL: arm(-1), aR: arm(1), lL: leg(-1), lR: leg(1), t: Math.random() * 9, fall: 0, wave: o.wave || 0, sit: o.sit || 0, shout: 0 };
    g.userData.P = P; return g;
  }
  /* póz: sit (0 áll – 1 ül), wave (integetés 0..1), hike (kihajlás 0..1, a test hátradől), fall (0..1: elesik, hanyatt, lábak fel), cheer */
  function posePerson(g, dt, o) {
    const P = g.userData.P; if (!P) return; P.t += dt; const t = P.t, sit = o.sit != null ? o.sit : P.sit, wave = o.wave != null ? o.wave : P.wave, hike = o.hike || 0, fall = o.fall || 0;
    P.hips.position.y = .9 - .45 * sit - .5 * fall; P.hips.rotation.x = 0;
    P.lL.hp.rotation.x = P.lR.hp.rotation.x = -1.45 * sit - 1.3 * fall + (o.legs || 0); P.lL.kn.rotation.x = P.lR.kn.rotation.x = 1.5 * sit * (1 - hike) + .2 * fall;
    /* 2026-11-14 18:50: a láb soha nem lóghat bele a hajótestbe – ha o.floor (a padló magassága a csípőhöz képest) meg van adva, a térd annyit hajlik, hogy a talp a padlón legyen */
    if (o.floor != null) { const a = P.lL.hp.rotation.x, yk = -.44 * Math.cos(a), need = (yk - o.floor) / .46; if (o.footOn || -.46 * Math.cos(a + P.lL.kn.rotation.x) + yk < o.floor) { const k = Math.acos(clamp(need, -1, 1)) - a; P.lL.kn.rotation.x = P.lR.kn.rotation.x = k; } }
    P.lL.hp.rotation.z = -.08 - .25 * fall; P.lR.hp.rotation.z = .08 + .25 * fall;
    P.torso.rotation.x = -hike * 1.05 - fall * 1.25 + .03 * Math.sin(t * 1.3); P.torso.rotation.z = .02 * Math.sin(t * .9);
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
    /* 2026-11-14 (tulajdonos: „a 420 alja tele van vízzel”): a kokpit ÖNÜRÜLŐ PADLÓJA a vízvonal fölött, a hajótest belső faláig ér – belül száraz.
       Alatta zárt (felhajtóerős) tér, a padlón csúszásgátló minta és a középszekrény (uszonyház). */
    if (o.cockpit) { const [z0, z1] = o.cockpit, fy = o.floorY != null ? o.floorY : .05, u0 = clamp((Math.min(z0, z1) + L / 2) / L - .03, 0, 1), u1 = clamp((Math.max(z0, z1) + L / 2) / L + .03, 0, 1), NF = 16, fp = [], fi = [];
      const wAt = (u) => { const hb = half(u), kz = keel(u), sz = sheer(u), r = clamp((fy - kz) / Math.max(.01, sz - kz), 0, 1), th = Math.acos(1 - r) * 2 / Math.PI; return hb * Math.pow(Math.sin(th * Math.PI / 2), .8) + .004; };
      for (let i = 0; i <= NF; i++) { const u = u0 + (u1 - u0) * i / NF, w = wAt(u), z = zOf(u); fp.push(-w, fy, z, w, fy, z); if (i) { const a = (i - 1) * 2; fi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
      const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3)); fg.setIndex(fi); fg.computeVertexNormals(); W.disposables.push(fg);
      const ft = canvasTex(128, 128, (g2, w, h) => { g2.fillStyle = o.sole || "#dcd7c8"; g2.fillRect(0, 0, w, h); g2.fillStyle = "rgba(0,0,0,.06)"; for (let y = 0; y < h; y += 8) for (let x = (y / 8 % 2) * 4; x < w; x += 8) g2.fillRect(x, y, 3, 3); }, { repeat: [3, 12] });
      const fm = std({ map: ft, roughness: .85, side: THREE.DoubleSide }); fg.setAttribute("uv", new THREE.Float32BufferAttribute(fp.map((v, i) => i % 3 === 0 ? v : i % 3 === 2 ? v * .3 : null).filter((v) => v !== null), 2)); mesh(fg, fm, G);
      const cb = new THREE.BoxGeometry(.06, .28, .9); cb.translate(0, fy + .14, zOf(.5)); mesh(cb, std({ color: o.deck || "#e9e6dc", roughness: .5 }), G); 
      /* VÍZZÁRÓ „HÉJ”: a hajótest belsejében, közvetlenül a padló alatt egy láthatatlan, csak mélységet író fedőlap a teljes hajótest-körvonalon –
         a víz (amelyet utána rajzolunk) így a zárt héjon belül SOSEM látszik, akármennyit merül vagy dől a hajó; a merülés közben valósághű marad. */
      { const my = fy - .015, mp = [], mi = [], NM = 30; for (let i = 0; i <= NM; i++) { const u = i / NM, hb = half(u), kz = keel(u), sz = sheer(u), r = clamp((my - kz) / Math.max(.01, sz - kz), 0, 1), th = Math.acos(1 - r) * 2 / Math.PI, w = Math.max(.002, hb * Math.pow(Math.sin(th * Math.PI / 2), .8) - .003);
          mp.push(-w, my, zOf(u), w, my, zOf(u)); if (i) { const a2 = (i - 1) * 2; mi.push(a2, a2 + 2, a2 + 1, a2 + 1, a2 + 2, a2 + 3); } }
        const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.Float32BufferAttribute(mp, 3)); mg.setIndex(mi); W.disposables.push(mg);
        const mm = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }); W.disposables.push(mm); const mk = new THREE.Mesh(mg, mm); mk.renderOrder = -6; mk.userData.noMerge = true; G.add(mk); } }
    return { G, half, keel, sheer, zOf, L, B };
  }
  /* kormánylapát + rúd (a rúd S.rud szerint fordul) és uszony */
  function dinghyRudder(H, o) {
    const g = new THREE.Group(); g.position.set(0, H.sheer(0), -H.L / 2 - .02); H.G.add(g);
    const blade = new THREE.BoxGeometry(.03, o.depth || .8, .26); blade.translate(0, -(o.depth || .8) / 2 + .1, -.12); mesh(blade, std({ color: o.bc || "#f4f4f0", roughness: .4 }), g);
    const head = mesh(new THREE.BoxGeometry(.06, .2, .2), std({ color: "#3a3f46", roughness: .5 }), g); head.position.set(0, .08, -.08);
    const til = new THREE.Group(); til.position.set(0, .16, -.04); g.add(til); const tg = new THREE.BoxGeometry(.035, .04, o.til || 1.1); tg.translate(0, 0, (o.til || 1.1) / 2); mesh(tg, std({ color: "#7a4d2a", roughness: .6 }), til);
    const ext = new THREE.CylinderGeometry(.012, .012, .9, 6); ext.rotateX(Math.PI / 2 - .35); ext.translate(0, .14, (o.til || 1.1) + .35); mesh(ext, std({ color: "#202020", roughness: .5 }), til);
    { const gr = new THREE.CylinderGeometry(.02, .02, .22, 10); gr.rotateX(Math.PI / 2 - .35); gr.translate(0, .14 + .32 * Math.cos(.35) * 0 + .29 * Math.sin(.35), (o.til || 1.1) + .35 + .29 * Math.cos(.35)); mesh(gr, std({ color: "#14161b", roughness: .9 }), til); mesh(new THREE.SphereGeometry(.022, 10, 8).translate(0, .14 + .45 * Math.sin(.35), (o.til || 1.1) + .35 + .45 * Math.cos(.35)), std({ color: "#c8102e", roughness: .5 }), til); }   /* a toldó végén habszivacs fogó és piros gombvég – mint a nagy hajó botkormányán */
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
    const sTex = dinghySailTex({ cloth: o.sail || "#f3f2ec", num: o.num, ins: "", finnIns: true, name: o.name, win: [.12, .1, .3, .12], battens: bat });
    const sail = softSail({ parent: mast, nu: 12, nv: 20, bend: .09, ttLen: 1.2, mat: std({ map: sTex, roughness: .9, side: THREE.DoubleSide }), camber: .11, twist: .32,
      luff: (v) => { const y = boomPin + .03 + v * luffL, vv = y / mastH; return new THREE.Vector3(0, y, -.2 * Math.pow(Math.max(0, vv - .25) / .75, 2) - .05); }, chord: (v) => sailW((1 - v) * luffL) });
    const rud = dinghyRudder(H, { til: 1.1, depth: .8, cbD: .01 });
    /* kormányos: kihasal a szél felőli oldalon (lába a hevederben) */
    const crew = [];
    if (o.crew) { const p = makePerson({ top: o.top || "#1f2f46", bot: "#1b2430", vest: o.vestC || "#c8102e", cap: o.cap || null, seed: o.seed || 0 }); body.add(p); crew.push({ p, kind: "helm" }); }
    const S = { side: 1, boom: .2, luff: 0, heel: 0, pitch: 0, spin: 0, awa: null, aws: 6, rud: 0, t: 0, crewS: 1 };
    G.userData = { S, body, mast, deckY: H.sheer(.4), seat: new THREE.Vector3(0, .12, hz(1.6)), cls: "finn", hullLB: [4.495 * .45, 1.51 * .44], chartAt: new THREE.Vector3(0, H.sheer(.55) + .02, hz(2.45)) };
    G.userData.update = (dt) => {
      S.t += dt; const A = S.awa != null ? S.awa : 60, U = S.aws || 6;
      const bT = clamp(A - 17, 3, 85) * D2R * S.side; S.boomS = S.boomS == null ? bT : S.boomS + (bT - S.boomS) * Math.min(1, dt * (Math.sign(bT) !== Math.sign(S.boomS) ? 3.5 : 1.8)); S.boom = S.boomS;
      const lf = clamp(1 - (A - Math.abs(S.boom) * R2D - 4) / 8, 0, 1); S.luff = lf;
      boom.rotation.y = -S.boom; mast.rotation.y = -S.boom * .15; sail.update(dt, S.boom * .85, lf, U, S.side, 1);   /* a Finn árboca a bummal együtt elfordul (C.9.4: „all parts rotate together”) */
      mast.rotation.x = -.035 * clamp(U / 8, 0, 1.2) * (1 - lf);
      body.rotation.set(S.pitch, 0, S.heel, "YXZ"); rud.til.rotation.y = (S.rud || 0) * .6;
      S.crewS += (-S.side - S.crewS) * Math.min(1, dt * 1.4);
      crew.forEach((c) => { const cross = 1 - Math.min(1, Math.abs(S.crewS)), hk = clamp((U - 3.5) / 5, 0, 1) * clamp((120 - A) / 60, 0, 1) + .35 * clamp((U - 8) / 4, 0, 1) * clamp((120 - A) / 60, 0, 1);
        c.p.position.set(S.crewS * (B / 2 - .04), H.sheer(.3) - .45, hz(1.75)); c.p.rotation.set(0, S.crewS > 0 ? -Math.PI / 2 : Math.PI / 2, 0, "YXZ");   /* a lába befelé (hevederben), a törzse kifelé dől */
        posePerson(c.p, dt, { sit: 1, hike: hk * (1 - cross), pull: true, turn: S.crewS * .9 }); });
    };
    G.userData.update(0); return G;
  }

  /* =============================================================== 420-AS JOLLE (Nemzetközi 420 Osztályszabályok, 2014) */
  function make420(o) {
    o = Object.assign({ hull: "#ffffff", boot: "#1f5fa8", stripe: "#1f5fa8", num: "HUN 420", crew: 2, spin: ["#1f5fa8", "#ffffff", "#e5262f"] }, o);
    /* 2026-11-14 18:48 (tulajdonos): a saját 420-as kicsit nagyobb (az emberhez arányos), PIROS hajótest a Zephyr logóval az oldalán, SZÍNES vitorlák,
       a nagy hajó részletességével (szerelvények, kötélzet, szkóták, hevederek, trapézfogantyúk, szélzászló) és ugyanolyan kormánnyal (merev toldó, fogó) */
    if (o.zephyr) Object.assign(o, { hull: "#c8102e", boot: "#ffffff", stripe: "#141d4d", spin: ["#ffffff", "#c8102e", "#141d4d", "#ffffff", "#2e7d32"] });
    const G = new THREE.Group(), body = new THREE.Group(); G.add(body); const SCL = o.zephyr ? 1.12 : 1; body.scale.setScalar(SCL);
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
    const mTex = dinghySailTex({ cloth: o.zephyr ? "#d61f26" : "#f6f6f2", band: o.zephyr ? "#141d4d" : null, numC: o.zephyr ? "#ffffff" : undefined, nameC: o.zephyr ? "#ffffff" : undefined, num: o.num, ins: "420", insC: o.zephyr ? "#ffffff" : o.insC || "#1f5fa8", name: o.name, win: [.2, .12, .34, .1], battens: [[1 - 1.445 / luffL, .54 / mW(1.445)], [1 - 2.6 / luffL, .7 / mW(2.6)], [1 - 3.7 / luffL, .7 / mW(3.7)], [.08, .54 / 2.3]] });
    const main = softSail({ parent: mast, nu: 10, nv: 16, bend: .05, mat: std({ map: mTex, roughness: .9, side: THREE.DoubleSide }), camber: .1, twist: .26,
      luff: (v) => new THREE.Vector3(0, boomY + .03 + v * luffL, -.04), chord: (v) => mW((1 - v) * luffL) });
    /* FOCK: első él 3,5 m az orrvastól a 4,52 m-es felhúzási pontig, alj 1,75 m, szkótavezető a tükörtől 2,07 m-re, 0,63 m-re oldalt; kis ablak */
    const jibG = new THREE.Group(); jibG.position.copy(stem); body.add(jibG); const hoist = new THREE.Vector3(0, deckM + 4.52, mastZ).sub(stem);
    const jTex = canvasTex(256, 512, (g, w, h) => { g.fillStyle = o.zephyr ? "#e9eef6" : "#f8f8f4"; g.fillRect(0, 0, w, h); if (o.zephyr) { [["#141d4d", .0, .12], ["#c8102e", .12, .05], ["#141d4d", .82, .18]].forEach(([c, y0, hh]) => { g.fillStyle = c; g.fillRect(0, h * (1 - y0 - hh), w, h * hh); }); g.fillStyle = "#141d4d"; g.font = "900 54px Georgia, serif"; g.textAlign = "center"; g.fillText("ZEPHYR", w * .55, h * .62); } g.fillStyle = "rgba(200,225,240,.6)"; g.fillRect(w * .25, h * .6, w * .4, h * .12); g.strokeStyle = "rgba(80,80,80,.25)"; g.lineWidth = 7; [.3, .55, .8].forEach((v) => { g.beginPath(); g.moveTo(w * .85, h * (1 - v)); g.lineTo(w, h * (1 - v)); g.stroke(); }); });
    const jib = softSail({ parent: jibG, nu: 8, nv: 12, loose: true, bend: 0, draft: .38, mat: std({ map: jTex, roughness: .9, side: THREE.DoubleSide }), camber: .1, twist: .2,
      luff: (v) => hoist.clone().multiplyScalar(v).add(new THREE.Vector3(0, .05, 0)), chord: (v) => 1.75 * (1 - v) + .04 });
    /* SPINAKKER: hátsó él ≤ 4,0 m, alj ≤ 2,22 m, félmagassági szélesség ≤ 2,84 m, felhúzás 4,65 m; rúd 1,75 m */
    const spT = canvasTex(256, 512, (g, w, h) => { const c = o.spin; for (let k = 0; k < 7; k++) { g.fillStyle = c[k % c.length]; g.fillRect(0, k * h / 7, w, h / 7 + 1); } });
    const spG = new THREE.Group(); spG.position.set(0, deckM + .4, hz(L) + .25); body.add(spG);
    const spin = softSail({ parent: spG, nu: 8, nv: 10, loose: true, bend: 0, telltales: false, draft: .5, mat: std({ map: spT, roughness: .85, side: THREE.DoubleSide }), camber: .38, twist: 0,
      luff: (v) => new THREE.Vector3(0, v * 4.0, (mastZ - hz(L) - .25) * v * .55), chord: (v) => tabLerp([[0, 2.22], [.5, 2.84], [.85, 1.6], [1, .05]], v) });
    const pole = new THREE.Group(); pole.position.set(0, deckM + 1.45, mastZ); body.add(pole); { const pg = new THREE.CylinderGeometry(.017, .017, 1.75, 6); pg.rotateX(Math.PI / 2); pg.translate(0, 0, .875); mesh(pg, alu, pole); }
    /* USZONY ~0,42 × 1,0 m, 18 mm; KORMÁNYLAPÁT 0,54 m-re a test alá */
    { const cb = new THREE.BoxGeometry(.018, .99, .42); cb.translate(0, H.keel(.5) - .45, hz(2.25)); mesh(cb, std({ color: "#f4f4f0", roughness: .4 }), H.G); }
    const rud = dinghyRudder(H, { til: 1.0, depth: .7, cbD: .01 });
    const X420 = {};
    /* ---- a nagy hajó részletessége: szerelvények és kötélzet ---- */
    { const blk = std({ color: "#2a2f36", roughness: .45 }), chrome = std({ color: "#e6eaee", metalness: .9, roughness: .2 }), web = std({ color: "#141d4d", roughness: .8 }), ropeR = std({ color: "#d61f26", roughness: .7 }), ropeB = std({ color: "#f4f4f0", roughness: .7 }), grey = std({ color: "#8d949b", roughness: .6 });
      /* ütközőléc a peremen körben */
      [-1, 1].forEach((sd) => { const pts = []; for (let i = 0; i <= 24; i++) { const u = .02 + .96 * i / 24; pts.push(new THREE.Vector3(sd * (H.half(u) + .006), H.sheer(u) - .012, H.zOf(u))); } mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .014, 6, false), blk, body); });
      /* orrvasalat, árboctalp, gooseneck, bumvég-szerelvény */
      mesh(new THREE.BoxGeometry(.05, .02, .16).translate(0, H.sheer(.98) + .01, H.zOf(.96)), chrome, body); mesh(new THREE.CylinderGeometry(.05, .06, .05, 10).translate(0, deckM + .025, mastZ), grey, body);
      mesh(new THREE.BoxGeometry(.06, .07, .06).translate(0, boomY, -.03), blk, mast); mesh(new THREE.BoxGeometry(.05, .05, .08).translate(0, 0, -boomL), blk, boom);
      /* szélzászló (windex) az árboccsúcson + jelzőszalag a merevítőkön */
      { const wx = new THREE.Group(); wx.position.set(0, mastH + .02, 0); mast.add(wx); rodBetween(new THREE.Vector3(), new THREE.Vector3(0, .25, 0), .004, blk, wx, 4); const vane = new THREE.Group(); vane.position.y = .25; wx.add(vane); mesh(new THREE.BoxGeometry(.004, .06, .16).translate(0, 0, -.1), std({ color: "#ff7a1a" }), vane); rodBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, .12), .003, blk, vane, 3); X420.vane = vane; }
      /* árbocon futó kötelek (fallok) és a bummerevítő (vang) */
      [-.03, .03].forEach((x) => rodBetween(new THREE.Vector3(x, deckM + .05, mastZ + .035), new THREE.Vector3(x, deckM + mastH - .1, mastZ + .035), .0035, x < 0 ? ropeR : ropeB, body, 4));
      const vang = rodBetween(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), .005, ropeB, body, 4); X420.vang = vang;
      /* kihajló hevederek a kokpitpadlón (sötétkék), trapézfogantyúk és gyűrűk a merevítőkön */
      [-.18, .18].forEach((x) => { const a = new THREE.Vector3(x, .07, hz(.6)), b = new THREE.Vector3(x * 1.1, .07, hz(2.45)); rodBetween(a, b, .016, web, H.G, 4); });
      [-1, 1].forEach((sd) => { const hp = new THREE.Vector3(sd * .55, deckM + 1.15, mastZ - .45); const hd = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .13, 8).rotateZ(Math.PI / 2), blk); hd.position.copy(hp); body.add(hd); mesh(new THREE.TorusGeometry(.04, .006, 6, 14).rotateX(Math.PI / 2).translate(hp.x, hp.y - .06, hp.z), chrome, body); });
      /* fockszkóta-vezetők a peremen, főszkóta-blokkok, bütykös fogók a középkonzolon */
      [-1, 1].forEach((sd) => { mesh(new THREE.BoxGeometry(.05, .03, .12).translate(sd * .63, H.sheer(2.07 / L) - .02, hz(2.07)), blk, body); mesh(new THREE.SphereGeometry(.025, 8, 6).translate(sd * .63, H.sheer(2.07 / L) + .02, hz(2.07)), blk, body); });
      mesh(new THREE.SphereGeometry(.03, 8, 6).translate(0, H.sheer(.35) - .18, hz(1.45)), blk, body); mesh(new THREE.BoxGeometry(.16, .12, .22).translate(0, .11, hz(1.75)), std({ color: "#f1f1ee", roughness: .5 }), H.G);
      [-1, 1].forEach((sd) => mesh(new THREE.BoxGeometry(.03, .025, .07).translate(sd * .06, .18, hz(1.75)), blk, H.G));
      /* fockszkóták: a szkótasaroktól a szél alatti vezetőn át (képkockánként) */
      X420.jibSheet = rodBetween(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), .0045, ropeR, body, 4); }
    /* ZEPHYR LOGÓ a hajótest két oldalán */
    if (o.zephyr) { const lt = new THREE.TextureLoader().load("img/zephyr-hajo-logo.png", (t) => { t.colorSpace = THREE.SRGBColorSpace; }); W.disposables.push(lt);
      const lm = new THREE.MeshStandardMaterial({ map: lt, transparent: true, roughness: .35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); W.disposables.push(lm);
      [-1, 1].forEach((sd) => { const u = .7, pl = new THREE.Mesh(new THREE.PlaneGeometry(1.05, .35), lm); pl.position.set(sd * (H.half(u) * .97 + .012), H.sheer(u) - .2, H.zOf(u)); pl.rotation.set(0, sd * Math.PI / 2, 0); pl.rotateX(sd * 0); pl.rotation.z = 0; pl.rotateOnAxis(new THREE.Vector3(1, 0, 0), -.12); body.add(pl); }); }
    const crew = [];
    if (o.crew > 1) crew.push({ p: makePerson({ top: o.top || "#203a5c", bot: "#1b2430", zvest: o.zephyr, pro: o.zephyr, shoe: o.zephyr ? "#1b1d22" : undefined, vest: o.vest || "#ffd23a", seed: (o.seed || 0) + 1, cap: o.cap || "#ffffff" }), kind: "helm" });
    crew.push({ p: makePerson({ top: o.zephyr ? "#22262d" : o.top2 || "#e5262f", bot: "#1b2430", zvest: o.zephyr, pro: o.zephyr, shoe: o.zephyr ? "#1b1d22" : undefined, cap: o.zephyr ? "#c8102e" : undefined, vest: o.vest2 || "#ffd23a", seed: (o.seed || 0) + 3 }), kind: "trap" });   /* a játékos hajóján csak a legénység látszik (a kormányos te vagy) */
    crew.forEach((c) => { body.add(c.p); c.p.scale.setScalar(1 / SCL); });   /* az emberek valódi méretűek maradnak */
    const trapW = rodBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), .003, wire, body, 4); trapW.visible = false;
    const S = { side: 1, boom: .2, jib: .2, luff: 0, heel: 0, pitch: 0, spin: 0, awa: null, aws: 6, rud: 0, t: 0, crewS: 1, trap: 0 };
    G.userData = { S, body, mast, deckY: H.sheer(.4) * SCL, seat: new THREE.Vector3(0, .1, hz(.85)), cls: "j420", hullLB: [JOLLE_L * .45 * SCL, 1.63 * .44 * SCL], chartAt: new THREE.Vector3(0, H.sheer(.6) + .02, hz(2.75)) };
    const _bb = new THREE.Vector3();
    G.userData.update = (dt) => {
      S.t += dt; const A = S.awa != null ? S.awa : 60, U = S.aws || 6;
      const bT = clamp(A - 18, 3, 82) * D2R * S.side; S.boomS = S.boomS == null ? bT : S.boomS + (bT - S.boomS) * Math.min(1, dt * (Math.sign(bT) !== Math.sign(S.boomS) ? 3.5 : 1.8)); S.boom = S.boomS;
      const sp = S.spin || 0, lfM = clamp(1 - (A - Math.abs(S.boom) * R2D - 4) / 8, 0, 1); S.luff = lfM; boom.rotation.y = -S.boom; main.update(dt, S.boom, lfM, U, S.side, 1);
      _bb.set(Math.sin(S.boom) * (boomL - .9), deckM + boomY - .03, mastZ - Math.cos(S.boom) * (boomL - .9)); { const d = _bb.clone().sub(mstBase), Lm = d.length(); mst.position.copy(mstBase); mst.scale.set(1, Lm, 1); mst.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }
      const jA = clamp(A - 22, 8, 48) * D2R * S.side, lfJ = clamp(1 - (A - Math.abs(jA) * R2D - 6) / 8, 0, 1) + sp * .6; jib.update(dt, jA, clamp(lfJ, 0, 1), U, S.side, 1 - sp * .7);
      spG.visible = pole.visible = sp > .05; if (sp > .05) { const sa = -S.side * clamp(A - 90, 0, 80) * D2R * .9; spG.rotation.y = sa * .4; spin.update(dt, sa, clamp(1 - sp, 0, 1) * .8, U, -S.side, sp); spG.scale.setScalar(.25 + .75 * sp); /* 2026-11-14 (tulajdonos: „a spinakkerbum kilóg a vitorlából”): a rúd az árboctól PONTOSAN a spinakker szél felőli sarkáig ér (a vászon sarokpontjához igazítva, a hossza is) */
        spG.updateMatrixWorld(true); body.updateMatrixWorld(true); const pa = spin.geo.attributes.position, tk = new THREE.Vector3(pa.getX(0), pa.getY(0), pa.getZ(0)).applyMatrix4(spin.mesh.matrixWorld); body.worldToLocal(tk);
        const d0 = tk.clone().sub(pole.position), Lp = d0.length(); pole.scale.set(1, 1, Lp / 1.75); pole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d0.normalize()); }
      if (X420.vane) X420.vane.rotation.y = Math.PI - (A * D2R) * S.side + .05 * Math.sin(S.t * 6);
      { const gp = new THREE.Vector3(0, deckM + .45, mastZ - .03), bp = new THREE.Vector3(Math.sin(S.boom) * .75, deckM + boomY - .04, mastZ - .03 - Math.cos(S.boom) * .75), d = bp.clone().sub(gp), Lv = d.length(); X420.vang.position.copy(gp); X420.vang.scale.set(1, Lv, 1); X420.vang.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }
      { jibG.updateMatrixWorld(true); body.updateMatrixWorld(true); const pa = jib.geo.attributes.position, nuJ = 8, ck = new THREE.Vector3(pa.getX(nuJ), pa.getY(nuJ), pa.getZ(nuJ)).applyMatrix4(jib.mesh.matrixWorld); body.worldToLocal(ck);
        const fl = new THREE.Vector3(-S.side * .63 * -1 * (ck.x >= 0 ? 1 : -1) * (ck.x >= 0 ? 1 : -1) * Math.sign(ck.x || 1), H.sheer(2.07 / L) + .02, hz(2.07)); fl.x = Math.sign(ck.x || 1) * .63; const d = fl.clone().sub(ck), Ls = d.length(); const js = X420.jibSheet; js.position.copy(ck); js.scale.set(1, Ls, 1); js.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }
      body.rotation.set(S.pitch, 0, S.heel, "YXZ"); rud.til.rotation.y = (S.rud || 0) * .6;   /* ugyanabba az irányba, mint a nagy hajó botkormánya */
      S.crewS += (-S.side - S.crewS) * Math.min(1, dt * 1.3); const hk = clamp((U - 3) / 4.5, 0, 1) * clamp((125 - A) / 60, 0, 1); S.trap += ((U > 5 && A < 120 && Math.abs(S.crewS) > .8 ? 1 : 0) - S.trap) * Math.min(1, dt * 1.5);
      /* 2026-11-14 17:16 (tulajdonos, 5-szörös magyar bajnok): a vitorlázó lába MINDIG a hajó belseje felé áll (be van akasztva a hevederbe), a törzse a szél
         erősödésével hátrafelé, a víz fölé dől és ellensúlyoz; nagyon erős szélben egészen hátradől – de soha nem fordul az oldalára. A trapézos a perem
         szélén áll, egyenes testtel, hátradőlve szinte vízszintesen; forduláskor guggolva átbújik a bum alatt a másik oldalra. */
      const cross = 1 - Math.min(1, Math.abs(S.crewS)), yawIn = S.crewS > 0 ? -Math.PI / 2 : Math.PI / 2, hkS = clamp((U - 2) / 3.2, 0, 1) * clamp((135 - A) / 55, 0, 1), hkX = hkS * 1.15 + .35 * clamp((U - 7) / 4, 0, 1) * clamp((125 - A) / 60, 0, 1), pump = Math.sin(S.t * 1.7) * .5 + Math.sin(S.t * 3.1 + 1) * .25, lookUp = Math.max(0, Math.sin(S.t * .45)) > .75 ? -.45 : 0;   /* 18:19: aktívabb, kifejezőbb legénység – erősebben hátradől, a lökésekre ritmusosan „pumpál”, időnként felnéz a vitorlára */
      crew.forEach((c) => { if (c.kind === "helm") { c.p.position.set(S.crewS * (B / 2 - .04 + .12 * hkX * (1 - cross)), H.sheer(.25) + .01 - .45 / SCL, hz(.95)); c.p.rotation.set(0, yawIn, 0, "YXZ"); posePerson(c.p, dt, { sit: 1, hike: Math.min(1.35, hkX + .05 * pump) * (1 - cross), pull: true, turn: S.crewS * .9, legs: -.3 * (1 - Math.min(1, hkX)), floor: (.12 - H.sheer(.25)) * SCL, footOn: true }); }
        else { const tr = S.trap * (1 - cross); c.p.position.set(S.crewS * (B / 2 - .05 + tr * .05), H.sheer(.45) + .01 * (1 - tr) - .45 / SCL * (1 - tr) - cross * .25 / SCL, hz(1.85)); c.p.rotation.set(-tr * (1.2 + .3 * clamp((U - 6) / 4, 0, 1)) - tr * .05 * pump, yawIn, 0, "YXZ");   /* a lábfej a peremen, a test egyenesen hátradől */
          posePerson(c.p, dt, { sit: tr > .5 ? 0 : 1 - tr * 2 + cross * .2, hike: Math.min(1.35, hkS * 1.3 + .08 * pump) * (1 - tr) * (1 - cross), legs: -.3 * (1 - Math.min(1, hkS)) * (1 - tr), floor: tr > .5 ? null : (.12 - H.sheer(.45)) * SCL, footOn: tr < .2, pull: true, armR: tr * 2.6 + (1 - tr) * (.5 + .3 * Math.sin(S.t * 2.3)), look: lookUp, turn: S.crewS * (.9 * (1 - tr) + .5 * tr) + .25 * Math.sin(S.t * .37) });
          trapW.visible = tr > .3; if (trapW.visible) { c.p.updateMatrix(); const a = top.clone(), b2 = new THREE.Vector3(0, 1.05, 0).applyMatrix4(c.p.matrix); const d = b2.clone().sub(a), Lw = d.length(); trapW.position.copy(a); trapW.scale.set(1, Lw, 1); trapW.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); } } });
    };
    G.userData.update(0); return G;
  }

  /* =============================================================== RÖNKTUTAJ (saját terv) + RÁK REZSŐ */
  function makeRaft(o) {
    /* 2026-11-14 17:22 (tulajdonos: „az előző szebb volt, csináld vissza, csak ne legyen ekkora merülése”): az eredeti rönktutaj, de 13 cm-rel magasabban úszik
       (a rönkök felül szárazak, a rések alatt sötét aljzat – nem látszik át a víz); a vitorla az árboc ELŐTT, legfeljebb 25°-ot fordul, így nem ér a szerkezetbe;
       kókuszdió (pofákat vág), esőkabát-spinakker és felismerhető zokni-zászló; a kormányevező nyele a kezeddel egy irányba mozog. */
    o = Object.assign({ crew: 1 }, o);
    const G = new THREE.Group(), body = new THREE.Group(); G.add(body); const FLOAT = .07; body.position.y = FLOAT;   /* 18:34: kicsit mélyebben ül a vízben (a víz a héjon belül úgysem látszik) */
    const logT = canvasTex(256, 512, (g, w, h) => { g.fillStyle = "#7a5a3a"; g.fillRect(0, 0, w, h); for (let k = 0; k < 90; k++) { g.strokeStyle = `rgba(${40 + Math.random() * 40},${25 + Math.random() * 25},${10 + Math.random() * 15},.55)`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); const x = Math.random() * w; g.moveTo(x, 0); g.bezierCurveTo(x + rr(-8, 8), h * .33, x + rr(-8, 8), h * .66, x + rr(-6, 6), h); g.stroke(); }
      for (let k = 0; k < 7; k++) { g.fillStyle = "rgba(40,25,12,.6)"; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 6, 10 + Math.random() * 10, 0, 0, TAU); g.fill(); } }, { repeat: [1, 1] });
    const endT = canvasTex(128, 128, (g) => { g.fillStyle = "#c79a62"; g.fillRect(0, 0, 128, 128); for (let r = 6; r < 64; r += 7) { g.strokeStyle = `rgba(110,72,36,${.35 + Math.random() * .3})`; g.lineWidth = 2; g.beginPath(); g.arc(64 + rr(-3, 3), 64 + rr(-3, 3), r, 0, TAU); g.stroke(); } });
    const logM = std({ map: logT, roughness: .95 }), endM = std({ map: endT, roughness: .9 }), rope = std({ color: "#b89a62", roughness: 1 });
    const N = 8, Wd = 2.3, Lg = 3.8;
    { const ul = new THREE.BoxGeometry(Wd - .25, .02, Lg - .5); ul.translate(0, -.04, -.05); mesh(ul, std({ color: "#2e2216", roughness: 1 }), body); }   /* sötét aljzat a rések alatt */
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
    const yardY = mastH - .25, SF = .3, yard = new THREE.Group(); yard.position.set(0, yardY, SF); mast.add(yard);
    { const yg = new THREE.CylinderGeometry(.04, .04, 2.2, 7); yg.rotateZ(Math.PI / 2); mesh(yg, logM, yard); }
    const boom = new THREE.Group(); boom.position.set(0, .55, SF); mast.add(boom);
    /* hátszélben a ponyvát az alsó rúdra csomózzák (kötélhurkok), hogy az esőkabát-spinakker szabadon látsszon */
    const ties = [-.78, -.28, .22, .72].map((x) => { const t = new THREE.Mesh(new THREE.TorusGeometry(.1, .014, 6, 14).rotateY(Math.PI / 2), std({ color: "#b89a62", roughness: 1 })); t.position.set(x, .08, .03); t.visible = false; boom.add(t); W.disposables.push(t.geometry); return t; }); [yardY, .55].forEach((y) => rodBetween(new THREE.Vector3(0, y, SF), new THREE.Vector3(0, y, 0), .025, rope, mast, 5)); { const bg = new THREE.CylinderGeometry(.04, .04, 2.0, 7); bg.rotateZ(Math.PI / 2); mesh(bg, logM, boom); }
    /* ponyvavitorla: foltozott, kopott szélű, varratokkal */
    const sT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#d8c9a3"; g.fillRect(0, 0, w, h); const pc = ["#c3b48c", "#b9a477", "#e1d6b8", "#a89466", "#cdbb8f"];
      for (let k = 0; k < 9; k++) { g.fillStyle = pc[k % 5]; const x = rr(0, w * .8), y = rr(0, h * .8), ww = rr(70, 180), hh = rr(60, 160); g.fillRect(x, y, ww, hh); g.setLineDash([8, 6]); g.strokeStyle = "rgba(80,60,30,.7)"; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, ww - 8, hh - 8); g.setLineDash([]); }
      g.fillStyle = "rgba(90,70,40,.18)"; for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(rr(0, w), rr(0, h), rr(3, 14), 0, TAU); g.fill(); }
      /* 18:34: hajótörött-vitorla – a ponyvára rávarrt foltok régi ruhákból (kifakult farmer, csíkos ing, zsákvászon, kockás abrosz), görbe, durva öltésekkel, X-varrással */
      { const fab = ["#7d8fa3", "#a9a08a", "#b58f6a", "#8f9b7c", "#c7b48f", "#9c7d5e"]; for (let k = 0; k < 16; k++) { const x = rr(-20, w - 60), y = rr(-20, h - 60), ww = rr(50, 150), hh = rr(40, 130), rot = rr(-.25, .25), f = fab[k % fab.length];
          g.save(); g.translate(x + ww / 2, y + hh / 2); g.rotate(rot); g.beginPath(); g.moveTo(-ww / 2 + rr(0, 8), -hh / 2); g.lineTo(ww / 2, -hh / 2 + rr(0, 8)); g.lineTo(ww / 2 - rr(0, 10), hh / 2); g.lineTo(-ww / 2, hh / 2 - rr(0, 9)); g.closePath(); g.fillStyle = f; g.globalAlpha = .82; g.fill(); g.globalAlpha = 1;
          if (k % 4 === 0) { g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 5; for (let q = -hh / 2; q < hh / 2; q += 14) { g.beginPath(); g.moveTo(-ww / 2, q); g.lineTo(ww / 2, q); g.stroke(); } }
          if (k % 4 === 1) { g.strokeStyle = "rgba(60,40,20,.25)"; g.lineWidth = 2; for (let q = -ww; q < ww; q += 6) { g.beginPath(); g.moveTo(q, -hh / 2); g.lineTo(q + hh, hh / 2); g.stroke(); } }
          if (k % 4 === 2) { g.fillStyle = "rgba(150,40,40,.25)"; for (let a2 = -ww / 2; a2 < ww / 2; a2 += 18) for (let b2 = -hh / 2; b2 < hh / 2; b2 += 18) if (((a2 + b2) / 18 | 0) % 2) g.fillRect(a2, b2, 9, 9); }
          g.strokeStyle = "#2a1a0c"; g.lineWidth = 2.6; const per = 2 * (ww + hh), st = 13; for (let d = 0; d < per; d += st) { let px, py; if (d < ww) { px = -ww / 2 + d; py = -hh / 2; } else if (d < ww + hh) { px = ww / 2; py = -hh / 2 + d - ww; } else if (d < 2 * ww + hh) { px = ww / 2 - (d - ww - hh); py = hh / 2; } else { px = -ww / 2; py = hh / 2 - (d - 2 * ww - hh); }
            g.beginPath(); g.moveTo(px - 4, py - 4); g.lineTo(px + 4, py + 4); g.moveTo(px + 4, py - 4); g.lineTo(px - 4, py + 4); g.stroke(); }   /* durva X-öltések körben */
          g.restore(); }
        g.strokeStyle = "rgba(40,25,10,.8)"; g.lineWidth = 3; for (let k = 0; k < 6; k++) { const y = rr(40, h - 40); g.setLineDash([10, 6]); g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 40) g.lineTo(x, y + rr(-6, 6)); g.stroke(); } g.setLineDash([]); }   /* görbe, kézi varratsorok a toldásoknál */
      g.fillStyle = "#6b2a1a"; g.font = "900 64px Georgia, serif"; g.textAlign = "center"; g.fillText(o.name ? String(o.name).toUpperCase().slice(0, 12) : "S.O.S.", w / 2, h * .55);
      g.globalCompositeOperation = "destination-out"; for (let k = 0; k < 30; k++) { g.beginPath(); g.arc(rr(0, w), h - rr(0, 18), rr(4, 14), 0, TAU); g.fill(); g.beginPath(); g.arc(w - rr(0, 14), rr(0, h), rr(4, 12), 0, TAU); g.fill(); } g.globalCompositeOperation = "source-over"; });
    const sailM = std({ map: sT, roughness: 1, side: THREE.DoubleSide, transparent: true, alphaTest: .4 });
    const sailG = new THREE.Group(); sailG.position.set(0, 0, SF + .02); mast.add(sailG);
    const sail = softSail({ parent: sailG, nu: 8, nv: 8, loose: true, bend: 0, telltales: false, mat: sailM, camber: .16, twist: .05, sag: .05,
      luff: (v) => new THREE.Vector3(-1.05, .58 + v * (yardY - .62), 0), chord: (v) => 2.1 });
    /* 18:34: BOTOKBÓL ÖSSZEKÖTÖZÖTT KORMÁNYKERÉK a kormányos előtt (tőle kicsit jobbra, hogy Kata látsszon): nyolc görbe ágból álló keret, kötéllel összekötözve,
       négy küllő, rönkvég-agy, villás ágon áll; a kormányzással együtt forog */
    const stickW = new THREE.Group(); stickW.position.set(-.32, .78, -.8); body.add(stickW); stickW.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(0, 1.35, -1.25), stickW.position, new THREE.Vector3(0, 1, 0)));
    const swR = new THREE.Group(); stickW.add(swR);
    /* 2026-11-15 00:39 (tulajdonos): a rönktutajon választható – kormánykerék (botokból kötözött kerék) VAGY botkormány (csak a kormányevező nyele) */
    stickW.visible = o.steer !== "bot";
    { const wood = std({ color: "#7b5a36", roughness: .95 }), wood2 = std({ color: "#8d6a42", roughness: .95 }), R0 = .3;
      for (let k = 0; k < 8; k++) { const a0 = k / 8 * TAU, a1 = (k + 1) / 8 * TAU, p0 = new THREE.Vector3(Math.cos(a0) * R0, Math.sin(a0) * R0, 0), p1 = new THREE.Vector3(Math.cos(a1) * R0, Math.sin(a1) * R0, 0), d = p1.clone().sub(p0); p0.addScaledVector(d, -.12); p1.addScaledVector(d, .12);
        rodBetween(p0, p1, .022 + (k % 3) * .003, k % 2 ? wood : wood2, swR, 6); const kn = new THREE.Mesh(new THREE.TorusGeometry(.03, .011, 5, 10), rope); kn.position.set(Math.cos(a1) * R0, Math.sin(a1) * R0, 0); kn.rotation.set(Math.random(), Math.random(), 0); swR.add(kn); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .3; rodBetween(new THREE.Vector3(), new THREE.Vector3(Math.cos(a) * (R0 + .04), Math.sin(a) * (R0 + .04), 0), .016, wood, swR, 5); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.055, .06, .08, 10).rotateX(Math.PI / 2), [logM, endM, endM]); swR.add(hub);
      for (let k = 0; k < 3; k++) { const hd = new THREE.Mesh(new THREE.CylinderGeometry(.015, .018, .14, 6).rotateX(Math.PI / 2), wood); const a = k / 3 * TAU; hd.position.set(Math.cos(a) * (R0 + .02), Math.sin(a) * (R0 + .02), .06); swR.add(hd); }   /* fogantyú-csonkok */
      rodBetween(new THREE.Vector3(-.32, .37 - FLOAT * 0, -.85), new THREE.Vector3(-.32, .74, -.81), .03, wood, body, 6); rodBetween(new THREE.Vector3(-.32, .62, -.83), new THREE.Vector3(-.4, .74, -.8), .018, wood, body, 5); }   /* villás tartóág */
    /* kormányevező a farnál */
    const oar = new THREE.Group(); oar.position.set(0, .35, -1.75); body.add(oar); { const sh = new THREE.CylinderGeometry(.035, .035, 2.4, 7); sh.rotateX(Math.PI / 2 - .35); mesh(sh, logM, oar); const bl = new THREE.BoxGeometry(.04, .3, .55); bl.translate(0, -.42, -1.15); mesh(bl, logM, oar); }
    /* rakomány: láda, kötéltekercs, banánfürt, vizeskulacs, kókuszhéjak, kis zászló (rongyból) */
    { /* 2026-11-14 17:24: a láda kikerült – Kókusz Kata az árboc tövében ül */
      const cl = new THREE.TorusGeometry(.17, .05, 6, 14); cl.rotateX(Math.PI / 2); mesh(cl, rope, body).position.set(-.6, .3, -1.1);
      const ban = new THREE.Group(); ban.position.set(-.2, .55, .9); body.add(ban); for (let k = 0; k < 6; k++) { const bg = new THREE.CapsuleGeometry(.035, .16, 3, 6); bg.rotateZ(.5 + k * .12); bg.translate(k * .03 - .08, 0, (k % 2) * .04); mesh(bg, std({ color: "#f4d03f", roughness: .6 }), ban); }
      const can = mesh(new THREE.CylinderGeometry(.09, .09, .3, 12), std({ color: "#3b6ea8", roughness: .5 }), body); can.position.set(-.75, .4, -.4);
      [[.2, -1.3], [.05, -1.25]].forEach(([x, z]) => { const cg = new THREE.SphereGeometry(.1, 10, 6, 0, TAU, 0, Math.PI / 2); mesh(cg, std({ color: "#5a3a1e", roughness: 1 }), body).position.set(x, .27, z); });
    }
    /* ZOKNI-ZÁSZLÓ: egy nagy, koszos fehér sportzokni (piros-kék csíkos szár, szürke sarok és orr, lyuk a sarkán), csipesszel a zászlórúd keresztfáján – versenyzászlót utánoz */
    const sockG = new THREE.Group(); { rodBetween(new THREE.Vector3(.95, .25, -1.7), new THREE.Vector3(1.0, 2.05, -1.75), .022, logM, body, 5); rodBetween(new THREE.Vector3(1.0, 1.98, -1.75), new THREE.Vector3(1.0, 1.98, -1.1), .014, logM, body, 4);
      sockG.position.set(1.0, 1.98, -1.4); body.add(sockG);
      const wt = std({ color: "#ece8dc", roughness: 1, side: THREE.DoubleSide }), dirt = std({ color: "#b9ab88", roughness: 1 }), grey = std({ color: "#8d8a82", roughness: 1 }), red = std({ color: "#c8102e", roughness: .9 }), blue = std({ color: "#1f4fbf", roughness: .9 });
      const pin = mesh(new THREE.BoxGeometry(.03, .09, .05), std({ color: "#e0b04a", roughness: .6 }), sockG); pin.position.y = .02;
      const sk = new THREE.Group(); sockG.add(sk);
      mesh(new THREE.CylinderGeometry(.075, .07, .5, 14, 1, true).translate(0, -.27, 0), wt, sk);
      [[-.07, red], [-.12, blue], [-.17, red]].forEach(([y, m]) => mesh(new THREE.CylinderGeometry(.077, .077, .03, 14, 1, true).translate(0, y, 0), m, sk));
      mesh(new THREE.TorusGeometry(.075, .012, 6, 16).rotateX(Math.PI / 2).translate(0, -.02, 0), wt, sk);
      const foot = new THREE.Group(); foot.position.set(0, -.52, 0); sk.add(foot);
      mesh(new THREE.SphereGeometry(.078, 14, 10), grey, foot);
      mesh(new THREE.CapsuleGeometry(.068, .2, 6, 14).rotateX(Math.PI / 2).translate(0, -.02, .14), wt, foot);
      mesh(new THREE.SphereGeometry(.07, 12, 10).translate(0, -.02, .27), grey, foot);
      mesh(new THREE.CircleGeometry(.025, 10).translate(0, 0, .079), std({ color: "#3a2a1a", roughness: 1 }), foot);
      mesh(new THREE.SphereGeometry(.072, 10, 8).scale(1.02, .5, 1.6).translate(0, -.06, .12), dirt, foot);
      G.userData.flag = sockG; G.userData.sockFoot = foot; }
    /* KÓKUSZDIÓ a ládán – arcot vág: vidám (közepes szél), unatkozik (gyenge szél: félig lehunyt szem, ásít), fél (erős szél: tágra nyílt szem, reszket, O-száj),
       megijed (ütközés: felugrik, a szeme kidülled) */
    const coco = new THREE.Group(); coco.position.set(0, .45, .3); body.add(coco);   /* KÓKUSZ KATA az árboc tövében, a kormányos felé fordulva */
    const cocoT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#6b4423"; g.fillRect(0, 0, w, h); for (let k = 0; k < 900; k++) { g.strokeStyle = `rgba(${150 + Math.random() * 60},${110 + Math.random() * 40},${60 + Math.random() * 30},.5)`; g.lineWidth = 1; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.lineTo(x + rr(-6, 6), y + rr(4, 14)); g.stroke(); } });
    const FC = {};
    { const shell = new THREE.SphereGeometry(.16, 18, 14); shell.scale(1, 1.08, 1); mesh(shell, std({ map: cocoT, roughness: 1 }), coco);
      [[-.045, .1], [.045, .1], [0, .135]].forEach(([x, y]) => { const d = mesh(new THREE.SphereGeometry(.015, 8, 6), std({ color: "#2a1a0c" }), coco); d.position.set(x, y + .02, -.06); });   /* a három „szem” a kókusz tetején */
      const wht = std({ color: "#ffffff", roughness: .3 }), blk = std({ color: "#111", roughness: .3 }), brw = std({ color: "#2a1a0c", roughness: .8 }), mth = std({ color: "#d4162f", roughness: .18, metalness: .1 });
      FC.eyes = [-1, 1].map((sd) => { const e = new THREE.Group(); e.position.set(sd * .055, .04, .14); coco.add(e); const ball = mesh(new THREE.SphereGeometry(.04, 12, 10), wht, e); const pu = mesh(new THREE.SphereGeometry(.018, 10, 8), blk, e); pu.position.z = .032;
        const lid = mesh(new THREE.SphereGeometry(.043, 12, 8, 0, TAU, 0, Math.PI / 2), std({ color: "#6b4423", roughness: 1 }), e); const brow = mesh(new THREE.BoxGeometry(.06, .012, .012), brw, e); brow.position.set(0, .06, .02); return { e, ball, pu, lid, brow, sd }; });
      FC.mouth = new THREE.Group(); FC.mouth.position.set(0, -.06, .15); coco.add(FC.mouth); { const ul = mesh(new THREE.SphereGeometry(.03, 12, 8), mth, FC.mouth); ul.scale.set(1.7, .45, .5); ul.position.set(0, .018, .005); FC.lip = ul; }   /* rúzsos ajkak */
      /* kókuszkóc haj: kócos rostcsomók a fején, az egyik oldalon egy masni */
      { const hm = std({ color: "#8a5a2e", roughness: 1 }), hm2 = std({ color: "#a8743c", roughness: 1 }); for (let k = 0; k < 46; k++) { const a = Math.random() * TAU, el = .35 + Math.random() * .9, L = .07 + Math.random() * .09, st = new THREE.ConeGeometry(.012, L, 4); st.translate(0, L / 2, 0); const m = mesh(st, k % 3 ? hm : hm2, coco);
          m.position.set(Math.cos(a) * Math.cos(el) * .15, .05 + Math.sin(el) * .14, Math.sin(a) * Math.cos(el) * .15 - .02); m.lookAt(m.position.clone().multiplyScalar(3).add(new THREE.Vector3(Math.random() - .5, .6, Math.random() - .5).multiplyScalar(.2))); m.rotateX(Math.PI / 2); }
        const bw = std({ color: "#ff3d7f", roughness: .5 }); [-1, 1].forEach((sd) => { const b = mesh(new THREE.ConeGeometry(.035, .07, 8), bw, coco); b.rotation.z = sd * Math.PI / 2; b.position.set(.1 + sd * .035, .12, .02); }); mesh(new THREE.SphereGeometry(.018, 8, 6), bw, coco).position.set(.1, .12, .02); } FC.smile = mesh(new THREE.TorusGeometry(.045, .01, 6, 14, Math.PI), mth, FC.mouth); FC.smile.rotation.z = Math.PI; FC.o = mesh(new THREE.TorusGeometry(.028, .012, 8, 16), mth, FC.mouth); FC.flat = mesh(new THREE.BoxGeometry(.07, .012, .012), mth, FC.mouth); }
    /* ESŐKABÁT-SPINAKKER: nagy, sárga, sáros halászesőkabát, ujjai és csuklyája lobog; hátszélben az árboccsúcsról az orr elé dagad */
    const coatT = canvasTex(256, 384, (g, w, h) => { g.fillStyle = "#e7c22a"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(90,70,30,.45)"; for (let k = 0; k < 70; k++) { g.beginPath(); g.ellipse(rr(0, w), h * Math.pow(Math.random(), .5), rr(4, 22), rr(3, 12), rr(0, 3), 0, TAU); g.fill(); }
      g.fillStyle = "rgba(60,45,20,.5)"; g.fillRect(0, h - 40, w, 40); g.strokeStyle = "#9a7d16"; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, 40); g.lineTo(w / 2, h); g.stroke(); g.fillStyle = "#3a3a3a"; for (let y = 80; y < h - 40; y += 60) { g.beginPath(); g.arc(w / 2 + 14, y, 7, 0, TAU); g.fill(); }
      g.fillStyle = "#cfa91c"; g.fillRect(30, h * .55, 60, 50); g.fillRect(w - 90, h * .55, 60, 50); g.strokeStyle = "rgba(80,60,20,.7)"; g.strokeRect(30, h * .55, 60, 50); g.strokeRect(w - 90, h * .55, 60, 50); });
    const coatM = std({ map: coatT, roughness: .45, side: THREE.DoubleSide }), coat = new THREE.Group(); mast.add(coat); coat.visible = false;
    const cN = 8, cM = 10, cPos = new Float32Array((cN + 1) * (cM + 1) * 3), cUv = new Float32Array((cN + 1) * (cM + 1) * 2), cIdx = [];
    for (let j = 0; j <= cM; j++) for (let i = 0; i <= cN; i++) { const k = j * (cN + 1) + i; cUv[k * 2] = i / cN; cUv[k * 2 + 1] = j / cM; }
    for (let j = 0; j < cM; j++) for (let i = 0; i < cN; i++) { const a = j * (cN + 1) + i, b = a + 1, c = a + cN + 1, d = c + 1; cIdx.push(a, b, c, b, d, c); }
    const cGeo = new THREE.BufferGeometry(); cGeo.setAttribute("position", new THREE.BufferAttribute(cPos, 3)); cGeo.setAttribute("uv", new THREE.BufferAttribute(cUv, 2)); cGeo.setIndex(cIdx); W.disposables.push(cGeo);
    const coatBody = new THREE.Mesh(cGeo, coatM); coatBody.frustumCulled = false; coat.add(coatBody);
    const sleeves = [-1, 1].map((sd) => { const sg = new THREE.Group(); coat.add(sg); const sl = new THREE.CylinderGeometry(.13, .17, .85, 10, 1, true); sl.translate(0, -.42, 0); mesh(sl, coatM, sg); const cuff = new THREE.TorusGeometry(.17, .03, 6, 12); cuff.rotateX(Math.PI / 2); cuff.translate(0, -.85, 0); mesh(cuff, std({ color: "#b8961a", roughness: .5 }), sg); return { sg, sd }; });
    const hood = mesh(new THREE.SphereGeometry(.24, 12, 8, 0, TAU, 0, Math.PI * .6), coatM, coat);
    const coatLine = rodBetween(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), .008, rope, mast, 4);
    const crew = [];
    if (o.crew) { const p = makePerson({ top: "#e9e1cf", bot: "#4a5a6a", hair: "#4a3424", seed: o.seed || 2, bareLegs: true, shoe: "#d29a72", sleeve: false }); body.add(p); crew.push(p); }
    const S = { side: 1, boom: .2, luff: 0, heel: 0, pitch: 0, spin: 0, awa: null, aws: 6, rud: 0, t: 0, scare: 0 };
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Vector3();
    const setRod = (m, a, b) => { _q.subVectors(b, a); const L = Math.max(_q.length(), 1e-4); m.position.copy(a); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(_up, _q.multiplyScalar(1 / L)); };
    G.userData = Object.assign(G.userData, { S, body, mast, deckY: .3, seat: new THREE.Vector3(0, .3 + FLOAT, -1.25), cls: "tutaj", hullLB: [1.75, 1.05], chartAt: new THREE.Vector3(.62, .62 + FLOAT, -.5), cocoChart: true });   /* a kókusz-kijelző tőled balra, bambuszkarón – így Kókusz Kata szabadon látszik */
    { const post = new THREE.CylinderGeometry(.025, .03, .42, 7); post.translate(.62, .27 + .21, -.5); mesh(post, std({ color: "#c9b06a", roughness: .8 }), body); }
    G.userData.update = (dt) => {
      S.t += dt; const A = S.awa != null ? S.awa : 60, U = S.aws || 6;
      /* négyszögletes ponyva a két vízszintes rúd között: hátszélben keresztben áll, félszélben a szél alá fordul; a domborulat mindig előre (a szél alá) dagad */
      const yT = S.side * clamp((180 - A) * .3, 0, 25) * D2R; S.boomS = S.boomS == null ? yT : S.boomS + (yT - S.boomS) * Math.min(1, dt * 1.5); S.boom = S.boomS;
      sailG.rotation.y = -S.boom; boom.rotation.y = -S.boom; yard.rotation.y = -S.boom; const lf = clamp(1 - (A - 32) / 16, 0, 1); S.luff = lf; const sp = S.spin || 0; S.furl = (S.furl || 0) + ((sp > .05 ? 1 : 0) - (S.furl || 0)) * Math.min(1, dt * .9); const fu = S.furl; ties.forEach((t) => { t.visible = fu > .75; });
      { const p = sail.geo.attributes.position, nu = 8, nv = 8, k1 = clamp(U / 7, .3, 1.15) * (1 - lf * .85) * (1 - fu); for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const k = j * (nu + 1) + i, u = i / nu, v = j / nv;
          const bulge = .34 * k1 * Math.sin(Math.PI * u) * Math.sin(Math.PI * (.12 + .88 * v)) + (lf > .05 ? .1 * lf * Math.sin(S.t * 9 - u * 6 + v * 3) : 0) + .02 * Math.sin(S.t * 4.3 + u * 5) * k1;
          p.setXYZ(k, (-1.05 + 2.1 * u) * (1 - .08 * fu), .58 + v * (yardY - .62) * (1 - fu) + fu * (.05 + .07 * Math.sin(v * Math.PI * 6 + u * 2) * (.5 + .5 * Math.sin(u * 11))) - .06 * Math.sin(Math.PI * u) * (1 - v) * (1 - fu), bulge + fu * .07 * Math.sin(v * Math.PI * 5 + u * 3)); }   /* hátszélben a rúdra csomózott ponyva-batyu */ p.needsUpdate = true; sail.geo.computeVertexNormals(); }
      body.rotation.set(S.pitch + .02 * Math.sin(S.t * 1.7), 0, S.heel + .03 * Math.sin(S.t * 1.3), "YXZ");   /* 18:34: ugyanúgy dől, mint a nagy hajó */
      oar.rotation.y = (S.rud || 0) * .5; swR.rotation.z = (S.rud || 0) * 2.4;   /* a botkerék a fordulás irányába forog */
      /* esőkabát-spinakker */
      coat.visible = sp > .03; coatLine.visible = coat.visible;
      if (coat.visible) { const fill = clamp(U / 6, .4, 1.25) * sp, sa = -S.side * clamp(A - 100, 0, 75) * D2R * .5; coat.position.set(Math.sin(sa) * .6 * sp, mastH - .6, .9 + .9 * sp); coat.rotation.set(-.15 * fill, sa, Math.sin(S.t * 1.4) * .06);
        const p = cGeo.attributes.position; for (let j = 0; j <= cM; j++) for (let i = 0; i <= cN; i++) { const k = j * (cN + 1) + i, u = i / cN, v = j / cM, wdt = .55 + .25 * (1 - v);
          p.setXYZ(k, (u - .5) * 2 * wdt, -v * 1.9 * (.5 + .5 * sp), Math.sin(Math.PI * u) * .55 * fill * Math.sin(Math.PI * (.15 + .85 * v)) + .06 * Math.sin(S.t * 7 - v * 5 + u * 3) * (1.2 - fill)); } p.needsUpdate = true; cGeo.computeVertexNormals();
        sleeves.forEach((q, i) => { q.sg.position.set(q.sd * .72, -.25, .05); q.sg.rotation.set(-.6 * fill + .25 * Math.sin(S.t * 5.3 + i * 2), 0, q.sd * (1.2 + .35 * Math.sin(S.t * 3.7 + i))); });
        hood.position.set(0, .05, -.05); hood.rotation.x = -.6 + .15 * Math.sin(S.t * 2.1);
        mast.updateMatrixWorld(true); _a.set(0, mastH - .12, .03); _b.copy(coat.position); setRod(coatLine, _a, _b); }
      /* a kókusz arca */
      S.scare = Math.max(0, S.scare - dt); const mood = S.scare > 0 ? "jaj" : U > 8 ? "fel" : U < 3.5 ? "unat" : "vidam", t = S.t;
      coco.position.y = .45 + (mood === "jaj" ? .12 * Math.sin(Math.min(1, (1.6 - S.scare) * 3) * Math.PI) : 0); coco.position.x = 0 + (mood === "fel" ? .006 * Math.sin(t * 60) : 0);
      coco.rotation.y = Math.PI + .25 * Math.sin(t * .5) + (mood === "unat" ? .25 : 0);   /* mindig feléd néz */ coco.rotation.z = mood === "unat" ? .15 + .05 * Math.sin(t * .7) : mood === "vidam" ? .08 * Math.sin(t * 2.2) : 0;
      const yawn = mood === "unat" ? Math.max(0, Math.sin(t * .6)) : 0, blink = (t % 3.7) < .12 ? 1 : 0;
      FC.eyes.forEach((q) => { const big = mood === "jaj" ? 1.45 : mood === "fel" ? 1.25 : 1; q.ball.scale.setScalar(big); q.pu.scale.setScalar(mood === "jaj" ? .7 : 1); q.pu.position.set(mood === "fel" ? .008 * Math.sin(t * 9) : 0, mood === "unat" ? -.01 : 0, .032 * big);
        const close = mood === "unat" ? .55 + .3 * yawn : blink ? 1 : mood === "jaj" ? 0 : .12; q.lid.rotation.x = -Math.PI / 2 + close * Math.PI * .5 - (1 - close) * .6; q.lid.visible = close > .05;
        q.brow.position.y = (mood === "jaj" || mood === "fel" ? .075 : mood === "unat" ? .045 : .06); q.brow.rotation.z = q.sd * (mood === "fel" ? -.35 : mood === "unat" ? .15 : mood === "jaj" ? -.15 : .1); });
      FC.smile.visible = mood === "vidam"; FC.lip.visible = mood === "vidam" || mood === "unat"; FC.o.visible = mood === "jaj" || mood === "fel" || yawn > .6; FC.flat.visible = mood === "unat" && yawn <= .6;
      FC.o.scale.set(1, mood === "jaj" ? 1.5 : yawn > .6 ? 1.3 + yawn * .5 : 1.1 + .15 * Math.sin(t * 20), 1);
      /* a zokni lóg és lobog: erős szélben vízszintesen, a fejrész csapkod */
      { const k = clamp(U / 7, 0, 1.2); sockG.rotation.y = -S.side * .9 + .25 * Math.sin(S.t * 4.3); sockG.rotation.z = (-1.35 * k + .12 * Math.sin(S.t * 6.1) * k) * -1; G.userData.sockFoot.rotation.x = .5 * Math.sin(S.t * 7.3) * k; }
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
    /* 2026-11-14 (tulajdonos: „a vitorla zavarja a felemet és a látómezőmet álló módban”): a bot-árboc előre, a nyak mellé került, a törölköző alja fejmagasság fölé –
       így előre és oldalra szabad a kilátás, a vitorla a fejed fölött lobog */
    const RX = .36, RZ = .8, rod = new THREE.Group(); rod.position.set(RX, .2, RZ); body.add(rod);
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
    const boomY = 1.5, towH = rodH - .45, towW = 1.0, boom = new THREE.Group(); boom.position.set(0, .45 + boomY, -.02); rod.add(boom);
    { const bg = new THREE.CylinderGeometry(.018, .018, towW + .1, 7); bg.rotateX(Math.PI / 2); bg.translate(0, 0, -(towW + .1) / 2); mesh(bg, std({ color: "#c9a96a", roughness: .8 }), boom); for (let k = 1; k < 4; k++) { const n = new THREE.TorusGeometry(.021, .005, 4, 10); n.rotateX(Math.PI / 2); n.translate(0, 0, -k * .28); mesh(n, std({ color: "#8a6a3a" }), boom); } }
    const towel = softSail({ parent: towG, nu: 9, nv: 14, bend: .12, telltales: false, mat: std({ map: towT, roughness: 1, side: THREE.DoubleSide }), camber: .14, twist: .22, sag: .03,
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
    /* FELFÚJHATÓ KORMÁNYKERÉK (játékos, a flamingóhoz illő): rózsaszín úszógumi-kerék fehér küllőkkel, sárga labda-aggyal, felfújt oszlopon – feléd fordítva */
    const wheelG = new THREE.Group(); wheelG.position.set(-.05, .72, .3); body.add(wheelG); wheelG.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(0, 1.25, -.15), wheelG.position, new THREE.Vector3(0, 1, 0)));   /* a kerék a kormányos felé néz */ const whR = new THREE.Group(); wheelG.add(whR);
    { const pk = std({ color: "#ff6fae", roughness: .35, metalness: 0 }), wh = std({ color: "#ffffff", roughness: .35 }), ye = std({ color: "#ffd21a", roughness: .3 });
      const ring = mesh(new THREE.TorusGeometry(.2, .055, 12, 32), pk, whR); for (let k = 0; k < 8; k++) { const st = mesh(new THREE.TorusGeometry(.2, .057, 4, 4, TAU / 32), wh, whR); st.rotation.z = k * TAU / 8; }   /* fehér csíkok az úszógumin */
      for (let k = 0; k < 4; k++) { const sp = mesh(new THREE.CapsuleGeometry(.025, .26, 4, 8), wh, whR); sp.rotation.z = k * Math.PI / 4 * 2 + Math.PI / 4; }
      mesh(new THREE.SphereGeometry(.07, 16, 12), ye, whR); const valve = mesh(new THREE.CylinderGeometry(.012, .012, .03, 8), wh, whR); valve.rotation.x = Math.PI / 2; valve.position.set(.13, .13, .05);
      const post = new THREE.CylinderGeometry(.07, .1, .62, 16); post.translate(-.05, .72 - .31, .3 + .05); mesh(post, pk, body); void ring; }
    G.userData = Object.assign(G.userData, { S, body, mast: rod, deckY: .16, seat: new THREE.Vector3(0, .15, -.15), cls: "flamingo", hullLB: [1.12, .84], chartAt: new THREE.Vector3(.36, .78, .42), wheel: whR, toyChart: true });
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
    const setLine = (m, a, b) => { _b.subVectors(b, a); const L = _b.length(); m.position.copy(a); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(_up, _b.normalize()); };
    G.userData.update = (dt) => {
      S.t += dt; const A = S.awa != null ? S.awa : 60, U = S.aws || 6, sp = S.spin || 0;
      /* törölköző-grósz: a szél alá áll (hátszélben kint, élesen behúzva), dagad, belobog */
      const bT = clamp(A - 18, 5, 82) * D2R * S.side; S.boomS = S.boomS == null ? bT : S.boomS + (bT - S.boomS) * Math.min(1, dt * (Math.sign(bT) !== Math.sign(S.boomS) ? 3 : 1.6)); S.boom = S.boomS;
      const lf = Math.max(clamp(1 - (A - Math.abs(S.boom) * R2D - 4) / 8, 0, 1), clamp(1 - (A - 26) / 10, 0, 1)); S.luff = lf;
      boom.rotation.y = -S.boom; towel.update(dt, S.boom, lf, U, S.side, 1 - sp * .25);
      rod.rotation.z = -S.side * .05 * clamp(U / 7, .3, 1.2) * (1 - lf); rod.rotation.x = -.04 * clamp(U / 7, .3, 1.2);
      body.updateMatrixWorld(true); _b.set(RX + Math.sin(S.boom) * towW, .2 + .45 + boomY - .01, RZ - .02 - Math.cos(S.boom) * towW); setLine(towLine, _a.set(RX * .4, .7, .3), _b);   /* a szkóta a bum végétől a strandoló kezéhez */
      /* melltartó-spinakker */
      spin.visible = sp > .03; straps.forEach((m) => { m.visible = spin.visible; });
      if (spin.visible) { const fill = clamp(U / 6, .35, 1.25), sa = -S.side * clamp(A - 100, 0, 75) * D2R * .55, flap = clamp(1 - sp * 1.4, 0, 1) + clamp((115 - A) / 20, 0, 1) * .6;
        spin.rotation.set(-.12 * sp * fill, sa, Math.sin(S.t * 1.3) * .05 * sp); const hoist = .25 + .75 * Math.min(1, sp * 1.6); spin.scale.setScalar(hoist); spin.position.set(Math.sin(sa) * .5 * sp, 2.15 + .55 * sp + .05 * Math.sin(S.t * 1.7), 2.0 + .6 * sp);
        cups.forEach((c) => { const pa = c.g.attributes.position.array, depth = .62 * sp * fill * (1 - .6 * clamp(flap, 0, 1)) * (1 + .08 * Math.sin(S.t * 2.2 + c.ph)), R0 = .55;
          for (let j = 0; j <= CUPM; j++) for (let i = 0; i <= CUPN; i++) { const k = (j * (CUPN + 1) + i) * 3, a = i / CUPN * TAU, r = j / CUPM, wob = flap > .05 ? .07 * flap * Math.sin(S.t * 11 - a * 2 + r * 4 + c.ph) * r : 0, bulge = Math.cos(r * Math.PI / 2) * depth;
            pa[k] = Math.cos(a) * r * R0 * (1 + .04 * Math.sin(S.t * 3 + a)); pa[k + 1] = Math.sin(a) * r * R0 * 1.12; pa[k + 2] = bulge + wob; }
          c.g.attributes.position.needsUpdate = true; c.g.computeVertexNormals(); c.m.rotation.y = c.sd * (.18 + .1 * sp) + .04 * Math.sin(S.t * 2.6 + c.ph); c.m.rotation.x = -.08; });
        /* pántok: a két felső a bot csúcsához, a két oldalsó a csőrhöz és a strandolóhoz */
        spin.updateMatrixWorld(true); body.updateMatrixWorld(true); const tip = new THREE.Vector3(RX, .2 + .45 + rodH, RZ), beak = new THREE.Vector3(0, 1.9, 1.38), hand = new THREE.Vector3(.2, .7, -.1);
        cups.forEach((c, i) => { const top = body.worldToLocal(c.m.localToWorld(new THREE.Vector3(c.sd * .15, .58, 0))), side = body.worldToLocal(c.m.localToWorld(new THREE.Vector3(c.sd * .55, 0, 0)));
          setLine(straps[i], top, tip); setLine(straps[2 + i], side, i ? hand : beak); }); }
      whR.rotation.z = (S.rud || 0) * 2.4;   /* a felfújható kerék a kormányzással együtt fordul */
      body.rotation.set(S.pitch + .04 * Math.sin(S.t * 1.9), 0, S.heel + .05 * Math.sin(S.t * 1.4) + .025 * Math.sin(S.t * 3.3), "YXZ");   /* 18:39: a matrac billeg és dől – a szél felőli oldala megemelkedik */
      head.rotation.y = .25 * Math.sin(S.t * .6); head.rotation.x = .08 * Math.sin(S.t * .9);
      crew.forEach((p) => { p.position.set(0, .14 - .45, -.25); p.rotation.y = 0; posePerson(p, dt, { sit: 1, pull: true, armR: .2, legs: .35, turn: .3 * Math.sin(S.t * .4), wave: S.waveT > 0 ? 1 : 0 }); });
    };
    G.userData.update(0); return G;
  }
  /* egy osztály hajómodellje (a Zephyr kivételével – az a 05b-ben készül) */
  function makeClassBoat(id, o) { return id === "finn" ? makeFinn(o) : id === "j420" ? make420(o) : id === "tutaj" ? makeRaft(o) : id === "flamingo" ? makeFlamingo(o) : null; }
