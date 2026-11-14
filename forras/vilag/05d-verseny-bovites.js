  /* =================================================================== 2/D. A VERSENY BŐVÍTÉSEI (2026. nov. 14., a tulajdonos 16 pontos listája)
     1–2. változatos, tiszta rajt; a rajt előtt is teljes sebesség      3. a befutó után azonnal „Tovább”     4. időlimit (a várható idő háromszorosa)
     6. LAVÓR – szélcsendes foltok a vízen (balatoni vitorlás szóhasználat: „a fodrozódó víz valamelyik részén látható sima vízfelület, a helyi szélcsend tükre”;
        a Kékszalag-beszámolók szerint a hajók „lavórba kerülnek és nagyon lelassulnak”, főleg a part alatt és a medencék közepén) – a szél ott 25–55%-ra esik,
        a víz sima, tükröző, hullámtalanabb; a foltok lassan sodródnak a széllel, és idővel elhalnak, máshol újak jönnek.
     7. a háttérben valódi balatoni part, futamonként más helyszín      10. játékosnév a grószon      14. kidolgozott nézőhajók, integető emberek, ütközéskor elesnek, kiabálnak
     15–16. választható hajóosztály (05c) */
  /* ---------------------------------------------------------------- játékos-profil (név, fénykép) és a választott hajó */
  function vrProfile() { try { const p = JSON.parse(localStorage.getItem("zephyr-jatekos") || "null"); if (p && typeof p === "object") { if (!p.id) { p.id = "j" + Math.random().toString(36).slice(2, 10); localStorage.setItem("zephyr-jatekos", JSON.stringify(p)); } return p; } } catch (e) {}
    const p = { id: "j" + Math.random().toString(36).slice(2, 10), name: "", photo: "" }; try { localStorage.setItem("zephyr-jatekos", JSON.stringify(p)); } catch (e) {} return p; }
  function vrProfileSave(p) { try { localStorage.setItem("zephyr-jatekos", JSON.stringify(p)); } catch (e) { try { const q = Object.assign({}, p, { photo: "" }); localStorage.setItem("zephyr-jatekos", JSON.stringify(q)); } catch (e2) {} } }
  function vrClsId() { try { const v = localStorage.getItem("zephyr-hajo"); if (BOATCLS[v]) return v; } catch (e) {} return "zephyr"; }
  function vrCs() { return (VRR.cls || BOATCLS.zephyr).cs; }
  /* a verseny felépítése előtt: hajóosztály, méretarány, a játékos neve */
  function vrClassPre() {
    const S = VRR; S.cls = boatCls(S.forceCls || vrClsId()); S.kz = Math.max(.38, S.cls.half / 6); const pr = vrProfile(); S.prof = pr;
    S.meName = (pr.name ? pr.name : "Zephyr") + " (te)";
  }
  /* az ellenfelek hajómodellje: a választott osztályból (egyforma hajók versenye) */
  function vrRivalModel(o, i) {
    const id = VRR.cls.id;
    if (id === "zephyr") { const g = makeBoat(Object.assign({ detail: 0, crew: 3 }, o)); g.scale.setScalar(VR_SC * .96); try { vrBake(g); } catch (e) {} return g; }
    const pal = [["#ffffff", "#1f5fa8"], ["#fff6d6", "#f2b233"], ["#e9f3ea", "#2e7d32"], ["#f4f4f0", "#c62828"]][i % 4];
    return makeClassBoat(id, { num: o.num, hull: id === "finn" ? ["#f6f3ea", "#dfe9f2", "#2b3a4a", "#f1e7d0"][i % 4] : pal[0], boot: pal[1], stripe: pal[1], crew: 2, seed: i + 1, spin: o.spin,
      pink: ["#ff7eb6", "#ff9ec8", "#ff6fa8", "#ffa3cf"][i % 4], braC: ["#7fd3ff", "#b6f27a", "#ffd166", "#c8a2ff"][i % 4], name: id === "flamingo" ? o.name : undefined, towel: [["#1f5fa8", "#ffffff", "#7fd3ff"], ["#f2b233", "#ffffff", "#e2483d", "#ffffff"], ["#2e7d32", "#ffffff", "#f2b233"], ["#c62828", "#ffffff"]][i % 4], top: ["#2a6fb5", "#e0a020", "#2e7d32", "#c62828"][i % 4], vestC: pal[1] });
  }
  /* a saját hajó, ha nem a Zephyr: a nagy hajó (és kokpitja) láthatatlan marad – a fizika, a kormány, a műszerek ugyanazok –, a kis hajó a helyén úszik */
  function vrClassBuild() {
    const S = VRR, id = S.cls.id; S.pb = null;
    if (id === "zephyr") return;
    S.boat.visible = false;
    const pb = makeClassBoat(id, { name: S.prof.name || "", num: "HUN " + (7 + (S.prof.id.charCodeAt(2) % 80)), crew: id === "j420" ? 1 : 0, seed: 9, hull: id === "finn" ? "#f6f3ea" : undefined }); W.root.add(pb); S.pb = pb;
    /* fedélzeti térkép (a nagy hajó taktikai kijelzője) a kis hajó fedélzetén, a kormányos előtt */
    if (S.ck && S.ck.chartT) { const c = S.ck.chartT._canvas, w = id === "flamingo" ? .42 : .5, h = w * c.height / c.width; const pl = mesh(new THREE.PlaneGeometry(w, h), basic({ map: S.ck.chartT, side: THREE.DoubleSide }), pb.userData.body); const at = pb.userData.chartAt;
      pl.position.set(at.x, at.y + h * .5 * .6, at.z); pl.rotation.set(-.85, Math.PI, 0); S.pbChart = pl;
      const fr = mesh(new THREE.BoxGeometry(w + .04, h + .04, .02), std({ color: "#1d232b", roughness: .5 }), pl); fr.position.z = -.012; }
    /* a nagy hajóra tett tábla a kis hajó fölé kerül */
    if (S.msgL) { S.msgL.parent && S.msgL.parent.remove(S.msgL); W.root.add(S.msgL); S.msgL.scale.multiplyScalar(.6); }
    if (S.helpL) { S.helpL.parent && S.helpL.parent.remove(S.helpL); W.root.add(S.helpL); S.helpL.scale.multiplyScalar(.6); }
    S.tiller = true;   /* kis hajón mindig botkormány (a kerék nem értelmezhető) */
    vrClassTick(0);
  }
  /* minden képkockán: a kis hajó a nagy hajó mozgásállapotát veszi át, a néző a kormányos helyén ül */
  const _sv = new THREE.Vector3();
  function vrClassTick(dt) {
    const S = VRR, pb = S.pb; if (!pb) return; const BS = S.boat.userData.S, PS = pb.userData.S;
    PS.side = BS.side; PS.awa = BS.awa != null ? BS.awa : S.awa; PS.aws = BS.aws != null ? BS.aws : S.aws; PS.pitch = (BS.pitch || 0) * 1.6; PS.rud = S.wa / WA_MAX;
    PS.heel = (BS.heel || 0) * (S.cls.id === "finn" || S.cls.id === "j420" ? .55 : .35);
    const spT = S.sp && (S.sp.st === "fly" || S.sp.st === "pop" || S.sp.st === "spread") ? 1 : 0; PS.spin = (PS.spin || 0) + (spT - (PS.spin || 0)) * Math.min(1, dt * .8);
    const hb = vrWave(S.x, S.z, W.t); pb.position.set(0, hb * .45, 0); pb.rotation.set(0, Math.PI, 0); pb.userData.update(dt);
    /* a néző helye: a kormányos ülése (VR), vagy kicsit mögötte és fölötte (2D – így a hajó is látszik) */
    pb.updateMatrix(); _sv.copy(pb.userData.seat).applyMatrix4(pb.matrix);
    const ph = !T.inVR && (document.documentElement.dataset.device === "phone" || innerHeight > innerWidth * 1.15);
    if (T.inVR) { const lift = S.seated ? 0 : .5; W.root.position.set(-_sv.x, lift - _sv.y - .05, -_sv.z); }
    else { const back = ph ? 9.5 : 5.6, up = ph ? 3.4 : 1.75; W.root.position.set(-_sv.x, -up - _sv.y, -_sv.z - back); }   /* 2D-ben a kamera a világ y = 0 pontjában van */
    if (S.msgL) S.msgL.position.set(_sv.x, _sv.y + 1.9, _sv.z - 3.2);
    if (S.helpL) S.helpL.position.set(_sv.x - .5, _sv.y + 1.4, _sv.z - 1.6);
  }
  /* osztályfüggő sebesség: a polár szorzója + a nem élesen vitorlázó hajók (tutaj, flamingó) szél felé alig haladnak */
  function vrClsSpd(twa) { const c = VRR.cls || BOATCLS.zephyr; let k = c.spd; if (c.up > 50) k *= clamp((twa - (c.up - 22)) / 26, .08, 1); return k; }

  /* ---------------------------------------------------------------- 1–2. VÁLTOZATOS, TISZTA RAJT
     Minden futamnál véletlen: a saját hajó helye a vonal mögött (60–125 m, a pálya egész szélességében), az iránya (jobb vagy bal csapás, félszél–bővszél,
     a vonallal közel párhuzamosan, ahogy rajt előtt a valóságban járkálnak), a sebessége. Az ellenfelek másutt, legalább 45 m-re (a méretarány szerint) és úgy,
     hogy a következő 20 mp-ben senki ne kerüljön 30 m-nél közelebb hozzád – így a futam soha nem kezdődik ütközéssel. */
  function vrStartPlace(C) {
    const k = Math.max(.55, vrCs()), Lh = Math.hypot(C.line.b.x - C.line.a.x, C.line.b.z - C.line.a.z) / 2, rnd = VRR.netRnd || Math.random;
    const at = (d, s) => ({ x: -C.u[0] * d + C.c[0] * s, z: -C.u[1] * d + C.c[1] * s });
    const pick = () => { const d = (60 + rnd() * 65) * k, s = (rnd() * 2 - 1) * (Lh + 55 * k), stb = rnd() < .5, twa = (70 + rnd() * 55) * D2R, b = C.wf + (stb ? -1 : 1) * twa, p = at(d, s); return { x: p.x, z: p.z, b: (b + TAU) % TAU, v: (2 + rnd() * 2.5) * k }; };
    const path = (o, t) => ({ x: o.x + Math.sin(o.b) * 4.5 * k * t, z: o.z - Math.cos(o.b) * 4.5 * k * t });
    const clear = (a, b2) => { for (let t = 0; t <= 20; t += 1) { const p = path(a, t), q = path(b2, t); if (Math.hypot(p.x - q.x, p.z - q.z) < 30 * k) return false; } return Math.hypot(a.x - b2.x, a.z - b2.z) > 45 * k; };
    let best = null;
    for (let tr = 0; tr < 60; tr++) { const me = pick(), riv = []; let ok = true;
      for (let i = 0; i < 3 && ok; i++) { let r = null; for (let q = 0; q < 40; q++) { const c = pick(); if (clear(me, c) && riv.every((o) => clear(o, c))) { r = c; break; } } if (!r) ok = false; else riv.push(r); }
      if (ok) { best = { me, riv }; break; } }
    if (!best) { const me = { x: at(90 * k, 0).x, z: at(90 * k, 0).z, b: C.wf + Math.PI / 2, v: 3 * k }; best = { me, riv: [-1, 1, 2].map((q, i) => { const p = at((70 + i * 22) * k, q * 70 * k); return { x: p.x, z: p.z, b: C.wf + (i % 2 ? 1 : -1) * Math.PI / 2, v: 3 * k }; }) }; }
    return best;
  }
  /* az ellenfelek rajt előtti viselkedése: a saját „sávjukban” fel-alá járnak a vonal mögött (félszélben, fordulóval / perdüléssel váltva),
     és úgy indulnak el a vonal felé, hogy a rajtjelre érjenek oda – teljes sebességgel, mint a valóságban */
  function vrRivalPreTarget(r) {
    const S = VRR, C = S.C, k = Math.max(.55, vrCs()), Lh = Math.hypot(C.line.b.x - C.line.a.x, C.line.b.z - C.line.a.z) / 2;
    if (r.lane == null) r.lane = (-.55 + r.i * .55 + (Math.random() - .5) * .2) * Lh;
    const mid = { x: (C.line.a.x + C.line.b.x) / 2 + C.c[0] * r.lane, z: (C.line.a.z + C.line.b.z) / 2 + C.c[1] * r.lane }, toGo = -S.t, ls = lineSide(r), dist = Math.hypot(mid.x - r.x, mid.z - r.z), vEst = Math.max(2.5, r.v || 3);
    if (ls > -2 * k && toGo > 0) return { x: mid.x - C.u[0] * 60 * k + C.c[0] * 30 * (r.holdDir || 1), z: mid.z - C.u[1] * 60 * k + C.c[1] * 30 * (r.holdDir || 1) };   /* a vonal előtt van: vissza mögé */
    if (r.go || toGo <= dist / vEst + 1.2 + r.i * .6) { r.go = 1;   /* indul a vonal felé, hogy kb. a rajtjelre érjen oda */
      if (ls > -6 * k && toGo > 2.5) { r.holdDir = r.holdDir || 1; return { x: r.x + C.c[0] * r.holdDir * 60 - C.u[0] * 6, z: r.z + C.c[1] * r.holdDir * 60 - C.u[1] * 6 }; }   /* túl korán ért oda: a vonallal párhuzamosan „időt húz” */
      return { x: mid.x + C.u[0] * 20, z: mid.z + C.u[1] * 20 }; }
    if (r.holdDir == null) r.holdDir = r.i % 2 ? 1 : -1;
    const along = (r.x - mid.x) * C.c[0] + (r.z - mid.z) * C.c[1]; if (along * r.holdDir > 40 * k) r.holdDir = -r.holdDir;
    const dep = -55 * k; return { x: mid.x + C.c[0] * r.holdDir * 70 * k + C.u[0] * dep, z: mid.z + C.c[1] * r.holdDir * 70 * k + C.u[1] * dep };
  }

  /* ---------------------------------------------------------------- 6. LAVÓR (szélcsendes foltok) */
  function vrLavGen(C) {
    const S = VRR, k = vrCs(), rnd = S.netRnd || Math.random, pts = [{ x: 0, z: 0 }].concat(C.marks), n = 4 + Math.floor(rnd() * 4);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; pts.forEach((p) => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); });
    x0 -= 90 * k; x1 += 90 * k; z0 -= 90 * k; z1 += 90 * k;
    S.lav = []; for (let i = 0; i < n * 3 && S.lav.length < n; i++) { const p = { x: x0 + rnd() * (x1 - x0), z: z0 + rnd() * (z1 - z0) };
      if (pts.some((m) => Math.hypot(m.x - p.x, m.z - p.z) < 38 * k)) continue; if (S.lav.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 70 * k)) continue;
      S.lav.push({ x: p.x, z: p.z, r: (28 + rnd() * 38) * k, k: .25 + rnd() * .3, t0: -60 - rnd() * 60, life: 160 + rnd() * 220, ph: rnd() * 6 }); }
    S.lavMsgT = 0;
  }
  /* a szélszorzó egy pontban (1 = teljes szél; a folt közepén a folt „k”-ja) */
  function vrLavK(x, z, t) { const L = VRR.lav; if (!L || !L.length) return 1; let f = 1;
    for (const q of L) { const age = (t - q.t0) / q.life, life = clamp(Math.min(age * 4, (1 - age) * 4), 0, 1); if (life <= 0) continue; const d = Math.hypot(x - q.x, z - q.z); if (d > q.r * 1.15) continue;
      const e = 1 - smooth(clamp((d - q.r * .45) / (q.r * .7), 0, 1)); f = Math.min(f, 1 - (1 - q.k) * e * life); }
    return f; }
  function vrLavTick(dt) {
    const S = VRR; if (!S.lav) return; const wv = vfwd(S.wf);
    S.lav.forEach((q) => { q.x += wv[0] * -.35 * dt * 0 + (-wv[0]) * .45 * dt; q.z += (-wv[1]) * .45 * dt;   /* a szél AMERRE fúj (a szél „felől” iránnyal ellentétes), lassan sodródik */
      if (S.t - q.t0 > q.life) { const C = S.C, m = C.marks[(Math.random() * C.marks.length) | 0], a = Math.random() * TAU, d = (60 + Math.random() * 120) * vrCs(); q.x = m.x * .6 + Math.cos(a) * d; q.z = m.z * .6 + Math.sin(a) * d; q.t0 = S.t; q.life = 160 + Math.random() * 220; q.r = (28 + Math.random() * 38) * vrCs(); q.k = .25 + Math.random() * .3; } });
    /* a víz shadere: a foltok helye a víz mintázatának koordinátáiban (a sebességérzet-eltolással együtt) */
    const mat = S.water && S.water.userData.mat; if (mat && mat.uniforms.uLav) { const U = mat.uniforms.uLav.value; for (let i = 0; i < U.length; i++) { const q = S.lav[i]; if (!q) { U[i].set(0, 0, 0, 0); continue; } const age = (S.t - q.t0) / q.life, life = clamp(Math.min(age * 4, (1 - age) * 4), 0, 1); U[i].set(q.x + (S.fox || 0), q.z + (S.foz || 0), q.r, (1 - q.k) * life * 1.25); } }
    /* üzenet, ha lavórba futottál */
    const lk = vrLavK(S.x, S.z, S.t); if (lk < .8 && S.st === "race" && !S.fin && W.t - (S.lavMsgT || 0) > 20 && !(S.msgT > 0 && /⚠/.test(S.msg || ""))) { S.lavMsgT = W.t; S.msg = "LAVÓR! Szélcsendes foltba futottál – a víz itt sima, a szél leállt. Legközelebb kerüld meg (a tükörsima, fodrozódás nélküli víz jelzi)."; S.msgT = 7; }
  }

  /* ---------------------------------------------------------------- 7. A PART A HÁTTÉRBEN – futamonként más balatoni helyszín
     A part a pálya szél felőli végén túl, ~1,6–3,5 km-re: dombok (szőlő, erdő, mező, nádas), települések, és a hely jellegzetes épülete pontos formával.
     A színek a távolság szerint párásodnak (légperspektíva), a fények rá vannak sütve (Questen olcsó). */
  const VENUES = [
    { id: "tihany", n: "Tihany – az apátság alatt", d: "A Tihanyi-félsziget: a kéttornyú bencés apátság a domb tetején, alatta a falu és a lankák." },
    { id: "badacsony", n: "Badacsony – a tanúhegy előtt", d: "A koporsó alakú Badacsony bazaltorgonáival, szőlőteraszaival és a csúcs keresztjével; nyugatra a Gulács és Szigliget." },
    { id: "fured", n: "Balatonfüred – a móló előtt", d: "Füred: a Kerek templom kupolája, a parti szállodák, a kikötő árbócerdeje, mögötte a Tamás-hegy." },
    { id: "siofok", n: "Siófok – a víztorony előtt", d: "A déli part: a siófoki víztorony gombafeje, a kikötő világítótornya, a parti szállodasor, nyárfák." },
    { id: "szigliget", n: "Szigliget – a vár alatt", d: "A szigligeti várhegy a romos várral, a Kamonkő, mögötte a Badacsony és a Szent György-hegy." },
    { id: "keszthely", n: "Keszthely – az öbölben", d: "A keszthelyi öböl: a Festetics-kastély tornya a fák fölött, a Helikon-part nádasa, mögötte a Keszthelyi-hegység." },
    { id: "zamardi", n: "Zamárdi – a Zephyr előtt", d: "Hazai pálya: a zamárdi part nyárfái és strandja, szemben a Tihanyi-félsziget az apátsággal." }];
  function vrVenue(lvl) { return VENUES[((lvl || 1) - 1 + VENUES.length) % VENUES.length]; }
  function vrShoresBuild(far) {
    const S = VRR; S.shoreG = new THREE.Group(); far.add(S.shoreG); S.shoreOld = makeShores(far); S.shoreOld.material.opacity = .55;
  }
  /* egy helyszín felépítése a pálya tengelyéhez képest: a part a pálya „felső” (szél felőli) végén túl */
  function vrShoresSet(C, venue) {
    const S = VRR, G = S.shoreG; if (!G) return; while (G.children.length) { const o = G.children[0]; G.remove(o); o.traverse((q) => { if (q.geometry) q.geometry.dispose(); }); }
    const ax = Math.atan2(C.u[0], -C.u[1]);   /* a pálya „felfelé” irányszöge (É = 0) */
    const haze = new THREE.Color(.80, .86, .90), sunD = new THREE.Vector3(-.42, .52, -.74).normalize(), rnd = vrRng(venue.id.length * 977 + 11);
    const dirV = (brg, d) => new THREE.Vector3(Math.sin(brg) * d, 0, -Math.cos(brg) * d);
    const hzK = (d) => clamp((d - 500) / 7500, 0, .55);
    const colM = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }); W.disposables.push(colM);
    const addGeo = (geo) => { W.disposables.push(geo); const m = new THREE.Mesh(geo, colM); m.frustumCulled = false; G.add(m); return m; };
    /* domb-szalag: szögtartomány [b0,b1], távolság, magasság-profil fn(t) → m, színező fn(t, y01) → Color */
    const ridge = (b0, b1, dist, hFn, colFn, depth) => {
      const N = 90, M = 6, pos = [], col = [], idx = [], dep = depth || 600;
      for (let i = 0; i <= N; i++) { const t = i / N, brg = ax + b0 + (b1 - b0) * t, h = hFn(t), nrm = new THREE.Vector3();
        for (let j = 0; j <= M; j++) { const v = j / M, y = h * Math.pow(v, .8), p = dirV(brg, dist + dep * v); p.y = j === 0 ? -2 : y;   /* a parttól (v = 0) a gerincig (v = 1) emelkedik */ pos.push(p.x, p.y, p.z);
          const c = colFn(t, v, h).clone(); const slope = (hFn(Math.min(1, t + .01)) - hFn(Math.max(0, t - .01))) * .004, sl = clamp(.66 + .38 * v + slope + .06 * Math.sin(t * 97 + v * 13), .45, 1.12); c.multiplyScalar(sl); c.lerp(haze, hzK(dist)); col.push(c.r, c.g, c.b); } }
      for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + 1, c = a + M + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return addGeo(g); };
    const C3 = (h) => new THREE.Color(h);
    const greenMix = (t, v) => { const n = Math.sin(t * 61 + v * 7) * .5 + .5, n2 = Math.sin(t * 173 + 1.3) * .5 + .5; return C3(n > .62 ? "#3f6b2e" : n2 > .7 ? "#7a8f45" : "#4f7a36"); };
    const vine = (t, v) => { const rows = Math.sin(t * 900) > 0; return v < .55 ? C3(rows ? "#6d8b3c" : "#59772f") : C3(v > .85 ? "#3d5e2a" : "#4a6d30"); };
    /* box-alakú épület (a helyszín irányában), sült árnyalással */
    const bld = (brg, dist, w, h, dpt, col, roof, yb) => { const g = new THREE.BoxGeometry(w, h, dpt); g.translate(0, (yb || 0) + h / 2, 0); const p = dirV(brg, dist); const c = C3(col).lerp(haze, hzK(dist)), cr = C3(roof || col).lerp(haze, hzK(dist));
      const n = g.attributes.normal, cc = []; for (let i = 0; i < n.count; i++) { const k = n.getY(i) > .5 ? 1.05 : .62 + .38 * Math.max(0, n.getX(i) * sunD.x + n.getZ(i) * sunD.z); const q = (n.getY(i) > .5 ? cr : c).clone().multiplyScalar(k); cc.push(q.r, q.g, q.b); }
      g.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3)); const m = addGeo(g); m.position.copy(p); m.rotation.y = -brg; return m; };
    const shape = (geo, brg, dist, col, yb) => { geo.translate(0, yb || 0, 0); const c = C3(col).lerp(haze, hzK(dist)), n = geo.attributes.normal, cc = []; for (let i = 0; i < n.count; i++) { const k = .6 + .45 * Math.max(0, n.getX(i) * sunD.x + n.getY(i) * sunD.y + n.getZ(i) * sunD.z); const q = c.clone().multiplyScalar(k); cc.push(q.r, q.g, q.b); }
      geo.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3)); const m = addGeo(geo); m.position.copy(dirV(brg, dist)); m.rotation.y = -brg; return m; };
    const trees = (b0, b1, dist, n, hgt, col) => { for (let i = 0; i < n; i++) { const b = ax + b0 + (b1 - b0) * rnd(), d = dist + rnd() * 120, hh = hgt * (.7 + rnd() * .6); const g = new THREE.ConeGeometry(hh * .22, hh, 6); shape(g, b, d, col || (rnd() < .5 ? "#355f2a" : "#2f5426"), hh / 2); } };
    const poplars = (b0, b1, dist, n) => { for (let i = 0; i < n; i++) { const b = ax + b0 + (b1 - b0) * (i + rnd() * .6) / n, hh = 16 + rnd() * 10, g = new THREE.SphereGeometry(hh * .22, 8, 6); g.scale(1, 2.3, 1); shape(g, b, dist + rnd() * 40, rnd() < .5 ? "#3e6a2e" : "#4c7a36", hh * .55); } ridge(b0, b1, dist + 60, (t) => 9 + 3 * Math.sin(t * 50), () => C3("#456f33"), 50); };   /* nyárfasor + mögötte összefüggő lombkorona */
    const village = (b0, b1, dist, n, yb) => { for (let i = 0; i < n; i++) { const b = ax + b0 + (b1 - b0) * rnd(), d = dist + rnd() * 160, w = 8 + rnd() * 10; bld(b, d, w, 5 + rnd() * 4, 8 + rnd() * 6, rnd() < .8 ? "#f2eee4" : "#e8d9b8", rnd() < .6 ? "#a8432f" : "#6b4a3a", (yb ? yb(b) : 0)); } };
    const reeds = (b0, b1, dist) => ridge(b0, b1, dist, (t) => 2.2 + Math.sin(t * 40) * .4, () => C3("#a7a160"), 30);
    const beach = (b0, b1, dist) => ridge(b0, b1, dist, () => 1.2, () => C3("#d9c79a"), 25);
    /* ----- a helyszínek ----- */
    const v = venue.id;
    if (v === "tihany" || v === "zamardi") {
      const D = v === "zamardi" ? 6000 : 1700, hk = v === "zamardi" ? 1 : 1;
      if (v === "zamardi" && !venue.harbor) { beach(-1.25, -.35, 900); poplars(-1.2, -.4, 930, 40); village(-1.1, -.5, 960, 25); }
      ridge(-.55, .6, D, (t) => (90 + 40 * Math.sin(t * 9) + 30 * Math.sin(t * 23)) * Math.sin(Math.PI * clamp(t * 1.1, 0, 1)) * hk, greenMix, 500);
      ridge(-1.2, 1.1, D + 2600, (t) => 140 + 60 * Math.sin(t * 7 + 1) + 30 * Math.sin(t * 17), () => C3("#5d7550"), 1500);
      reeds(-.5, .55, D - 20);
      /* a falu a domboldalon */
      village(-.25, .3, D + 30, 40, () => 18 + rnd() * 30);
      /* a TIHANYI APÁTSÁG: hosszú templomhajó, a homlokzaton két magas torony, sötétzöld-szürke barokk sisakkal; a domb gerincén (~80 m) */
      { const b = ax + .05, d = D + 300, y0 = 96, col = "#f3ead6", rf = "#5d6b62";
        bld(b, d + 30, 18, 20, 52, col, "#8a4a35", y0); bld(b - .012, d + 55, 60, 14, 22, col, "#8a4a35", y0);   /* templom + rendház */
        [-1, 1].forEach((sd) => { const tb = b + sd * .0042; bld(tb, d, 7.5, 34, 7.5, col, col, y0); const hel = new THREE.ConeGeometry(4.8, 9, 8); shape(hel, tb, d, rf, y0 + 34 + 4.5); const bulb = new THREE.SphereGeometry(3.6, 10, 8); bulb.scale(1, 1.3, 1); shape(bulb, tb, d, rf, y0 + 34 + 1);
          const sp = new THREE.CylinderGeometry(.4, .9, 9, 6); shape(sp, tb, d, rf, y0 + 34 + 13); const cr = new THREE.BoxGeometry(.5, 3, .5); shape(cr, tb, d, "#d4a13a", y0 + 34 + 19); }); }
      trees(-.5, .55, D + 60, 70, 14);
    } else if (v === "badacsony") {
      const D = 2800;
      /* koporsó alakú tanúhegy: meredek bazaltorgona-fal fent, lapos tető ~438 m, a lejtőn szőlőteraszok fehér présházakkal */
      ridge(-.32, .32, D, (t) => { const e = Math.abs(t - .5) * 2; return e < .62 ? 420 + 12 * Math.sin(t * 30) : e < .82 ? 420 - (e - .62) / .2 * 210 : 210 * (1 - (e - .82) / .18); },
        (t, v2, h) => v2 > .78 ? C3("#5b5d55") : v2 > .62 ? C3("#3e5a2c") : vine(t, v2), 650);
      ridge(.35, .62, D + 1600, (t) => 300 * Math.pow(Math.sin(Math.PI * t), 1.6), greenMix, 900);   /* Gulács (kúp) */
      ridge(-.75, -.36, D + 600, (t) => 180 * Math.sin(Math.PI * t) + 40 * Math.sin(t * 14), greenMix, 900);   /* Szent György-hegy */
      ridge(-1.2, 1.2, D + 3800, (t) => 120 + 50 * Math.sin(t * 9), () => C3("#61785a"), 1400);
      reeds(-.6, .6, D - 30); village(-.3, .3, D + 20, 45, (b) => 10 + rnd() * 120);
      /* a kereszt a hegytető peremén */
      { const b = ax - .02, d = D + 650; const p1 = new THREE.BoxGeometry(1.4, 16, 1.4); shape(p1, b, d, "#f4f4f0", 418); const p2 = new THREE.BoxGeometry(8, 1.4, 1.4); shape(p2, b, d, "#f4f4f0", 430); }
    } else if (v === "fured") {
      const D = 1500;
      ridge(-.9, .9, D + 900, (t) => 160 + 70 * Math.sin(t * 6) + 30 * Math.sin(t * 19), greenMix, 1200);
      ridge(-1.3, 1.3, D + 3500, (t) => 230 + 80 * Math.sin(t * 5 + 2), () => C3("#5e7356"), 1500);
      beach(-.7, .7, D - 10); poplars(-.7, .7, D + 40, 50); village(-.6, .6, D + 120, 60, () => rnd() * 25);
      /* parti szállodák (fehér, 5–8 emeletes) */
      [-.22, -.1, .14, .3].forEach((b, i) => bld(ax + b, D + 70, 40 + i * 8, 18 + (i % 2) * 8, 18, "#f6f4ee", "#9aa3a8"));
      /* a Kerek templom: kör alaprajzú, kupolás, oszlopos portikusz */
      { const b = ax + .02, d = D + 160; const cyl = new THREE.CylinderGeometry(11, 11, 14, 20); shape(cyl, b, d, "#f1e6c8", 6 + 7); const dome = new THREE.SphereGeometry(11.5, 20, 10, 0, TAU, 0, Math.PI / 2); shape(dome, b, d, "#5d7a6a", 6 + 14); const lan = new THREE.CylinderGeometry(1.6, 1.6, 4, 10); shape(lan, b, d, "#f1e6c8", 6 + 26); }
      /* kikötő árbócerdeje */
      for (let i = 0; i < 40; i++) { const b = ax - .5 + rnd() * .2, hh = 9 + rnd() * 6; const g = new THREE.CylinderGeometry(.12, .12, hh, 4); shape(g, b, D - 60 + rnd() * 40, "#e8ecef", hh / 2); }
    } else if (v === "siofok") {
      const D = 1300;
      beach(-1, 1, D - 10); poplars(-1, 1, D + 30, 70); village(-.9, .9, D + 100, 70);
      [-.35, -.2, .25, .4, .55].forEach((b, i) => bld(ax + b, D + 80, 30 + i * 6, 22 + (i % 3) * 9, 16, "#f3f1ea", "#7f8a90"));
      /* a siófoki víztorony: karcsú törzs, kiszélesedő gombafej, tetején kilátó */
      { const b = ax + .06, d = D + 120, K = 1.5; const tr = new THREE.CylinderGeometry(3.2 * K, 4 * K, 40 * K, 14); shape(tr, b, d, "#efefe8", 20 * K); const hd = new THREE.CylinderGeometry(13 * K, 4 * K, 9 * K, 20); shape(hd, b, d, "#efefe8", 44.5 * K); const tp = new THREE.CylinderGeometry(13.5 * K, 13.5 * K, 2.5 * K, 20); shape(tp, b, d, "#c7ccd0", 50 * K); const lt = new THREE.CylinderGeometry(3 * K, 3 * K, 4 * K, 10); shape(lt, b, d, "#efefe8", 53 * K); }   /* a víztorony (a jobb felismerhetőségért kissé nagyítva) */
      /* a kikötő világítótornya a móló végén */
      { const b = ax - .18, d = D - 120; const lt = new THREE.CylinderGeometry(1.4, 2, 14, 12); shape(lt, b, d, "#f4f4f0", 7); const lh = new THREE.CylinderGeometry(1.5, 1.5, 2.5, 10); shape(lh, b, d, "#c62828", 15.3); const mo = new THREE.BoxGeometry(5, 2, 260); shape(mo, b + .07, d + 120, "#bdb7a8", 1); }
      ridge(-1.3, 1.3, D + 2800, (t) => 25 + 12 * Math.sin(t * 8), () => C3("#6e8460"), 900);
    } else if (v === "szigliget") {
      const D = 1900;
      ridge(-.25, .25, D, (t) => 240 * Math.pow(Math.sin(Math.PI * t), 1.2) + 15 * Math.sin(t * 25), greenMix, 900);   /* várhegy */
      ridge(.15, .45, D + 500, (t) => 150 * Math.sin(Math.PI * t), greenMix, 700);   /* Kamonkő */
      ridge(-.9, -.3, D + 2200, (t) => { const e = Math.abs(t - .5) * 2; return e < .6 ? 420 : 420 * (1 - (e - .6) / .4); }, (t, v2) => v2 > .75 ? C3("#5b5d55") : vine(t, v2), 1200);   /* Badacsony */
      reeds(-.6, .6, D - 25); village(-.5, .5, D + 30, 35);
      /* a szigligeti vár romja: falmaradványok és a lakótorony a csúcson */
      { const b = ax, d = D + 230, y0 = 232; bld(b, d, 14, 22, 14, "#cbbfa6", "#cbbfa6", y0); bld(b + .006, d + 10, 30, 9, 4, "#c2b69c", "#c2b69c", y0 - 4); bld(b - .007, d - 5, 4, 12, 26, "#c2b69c", "#c2b69c", y0 - 6); }
      trees(-.25, .25, D + 60, 80, 13);
    } else {   /* keszthely */
      const D = 1800;
      reeds(-1, 1, D - 30); ridge(-1.1, 1.1, D + 1500, (t) => 260 + 80 * Math.sin(t * 5) + 30 * Math.sin(t * 13), greenMix, 1400);
      trees(-.6, .6, D + 40, 110, 18); village(-.8, .8, D + 180, 60);
      /* a Festetics-kastély: hosszú fehér főszárny, középen a toronnyal (kupolás, órás) */
      { const b = ax + .03, d = D + 260; bld(b, d, 120, 16, 22, "#f5f2e8", "#6a6f78"); const tw = new THREE.BoxGeometry(12, 30, 12); shape(tw, b, d - 8, "#f5f2e8", 15); const cu = new THREE.SphereGeometry(6.5, 14, 8, 0, TAU, 0, Math.PI / 2); shape(cu, b, d - 8, "#4c5a62", 45); const sp = new THREE.ConeGeometry(1.2, 9, 8); shape(sp, b, d - 8, "#4c5a62", 55); }
    }
    S.venue = venue;
  }

  /* ---------------------------------------------------------------- 14. NÉZŐHAJÓK: kidolgozott motoros jachtok, tagolt (integető) emberekkel; soha nincsenek a pályán;
     nekik is neki lehet menni – ilyenkor a rajtuk állók elesnek, és kiabálnak */
  const VR_SHOUT = ["Ki adott neked hajót?!", "Vetted a jogosítványodat?!", "Anyád hogy van?!", "Hová nézel, kapitány?!", "Ez nem dodzsem!", "Szemüveget is vegyél!", "A bója arra van!", "Te is a Balatonon tanultál?!", "Hívom a vízirendőrséget!", "Ennyi erővel úszhattál volna!"];
  function vrYachtCrew(g, n, seed) {
    /* a hátsó fedélzet (a tükör és a szalon között) és a flybridge: a lábak a fedélzeten, a fej szabadon (nincs „hajóba csúszás”) */
    const SY = 1.35, SZ = 1.3, SX = 1.3, dy = (u) => hullShape(u).sheer * SY + .08, zz = (u) => hullShape(u).z * SZ, hx = (u) => hullShape(u).hb * SX, d0 = dy(.45);
    const spots = [[0, d0 + 1.5 + .02, .35 + zz(.45) * 0, 1], [-.55, dy(.12) + .04, zz(.13), 0], [.55, dy(.12) + .04, zz(.11), 0], [0, dy(.12) + .04, zz(.07), 0], [-.4, dy(.85) + .13, zz(.83), 2], [.45, dy(.82) + .13, zz(.86), 2]];
    const TOPS = ["#e5262f", "#1f5fa8", "#ffd166", "#f4f4f0", "#2fa85a", "#ff7a1a", "#8e44ad"], out = [];
    for (let k = 0; k < Math.min(n, spots.length); k++) { const s = spots[(k + seed) % spots.length], sit = s[3] === 2 ? 1 : 0;
      const p = makePerson({ top: TOPS[(k + seed) % 7], bot: ["#27303c", "#f2f2f2", "#5a6a7a", "#2a4a8a"][(k + seed) % 4], seed: k * 3 + seed, cap: k % 3 === 1 ? "#ffffff" : null, glasses: k % 2 === 0, sunhat: k % 4 === 3 ? "#e8d29a" : null, sleeve: k % 2 === 1 });
      p.position.set(s[0], s[1] - (sit ? .45 : 0), s[2]); p.rotation.y = s[3] === 1 ? Math.PI : (k % 2 ? .9 : -.9) + Math.PI * (s[2] > 0 ? 0 : 1); g.add(p); out.push({ p, sit, wave: 0, waveT: rr(2, 9), fall: 0, ph: rand() * 9 }); }
    return out;
  }
  function vrSpectBuild(env) {
    const S = VRR; S.spect = [];
    [["#f4f4f0", "#1f3a6a"], ["#ffffff", "#c62828"], ["#e9e2cf", "#2e7d32"], ["#f4f4f0", "#3a3f46"], ["#ffffff", "#f2b233"]].forEach(([hc, sc], i) => {
      const g2 = makeMotorYacht({ hull: hc, stripe: sc, people: 0, seed: i }); const sc2 = 1.05 + (i % 3) * .08; g2.scale.setScalar(sc2); env.add(g2);
      const crew = vrYachtCrew(g2, 3 + (i % 3), i); S.spect.push({ g: g2, i, ph: rand() * 9, crew, sc: sc2, half: 4.6 * sc2, rad: 2.1 * sc2, hitT: -99 });
    });
    /* a rendezőhajó emberei is tagoltak */
    if (S.cb) { S.cbCrew = vrYachtCrew(S.cb, 3, 7); S.cbHit = { g: S.cb, crew: S.cbCrew, half: 4.6 * 1.2, rad: 2.1 * 1.2, hitT: -99, cb: true }; }
    S.shoutL = labelSprite(["", ""], { size: 6, fs: 64, w: 900, bg: "rgba(255,255,255,.94)", edge: "#c62828", c0: "#c62828" }); env.add(S.shoutL); S.shoutL.visible = false;
  }
  /* a nézőhajók helye: a pálya minden szakaszától (a cirkáló- és hátszeles szakaszok cikcakkjával együtt) bőven távol, a pálya két oldalán */
  function vrSpectPlace(C) {
    const S = VRR, k = Math.max(.55, vrCs()), lm = { x: 0, z: 0 }, pts = [lm].concat(C.marks, [lm]), rnd = S.netRnd || Math.random;
    const segD = (p, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / L2, 0, 1); return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t); };
    const legs = []; for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), rel = Math.abs(wrapA(Math.atan2(b.x - a.x, -(b.z - a.z)) - (C.wf + Math.PI))); legs.push({ a, b, w: (rel < .9 || rel > 2.3 ? .42 * L : .12 * L) + 55 * k }); }
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; pts.forEach((p) => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); });
    const pad = 260 * k, got = [];
    for (let tr = 0; tr < 900 && got.length < S.spect.length; tr++) { const p = { x: x0 - pad + rnd() * (x1 - x0 + 2 * pad), z: z0 - pad + rnd() * (z1 - z0 + 2 * pad) };
      const cl = Math.min(...legs.map((l) => segD(p, l.a, l.b) - l.w)); if (cl < 15 || cl > 140 * k) continue; if (Math.hypot(p.x - C.line.a.x, p.z - C.line.a.z) < 80 * k || Math.hypot(p.x - C.line.b.x, p.z - C.line.b.z) < 80 * k) continue;
      if (got.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 45)) continue; got.push(p); }
    S.spect.forEach((q, i) => { const p = got[i] || { x: C.c[0] * (i % 2 ? 1 : -1) * (260 + i * 40) * k, z: C.c[1] * (i % 2 ? 1 : -1) * (260 + i * 40) * k }; q.x = p.x; q.z = p.z; q.b = rnd() * TAU; q.g.position.set(q.x, 0, q.z); q.g.rotation.y = q.b; q.crew.forEach((c) => { c.fall = 0; }); });
  }
  /* ütközés egy álló hajóval (kapszula: fél hossz + sugár) */
  function vrSpectGap(o, q) { const yaw = q.g.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), px = o.x - q.g.position.x, pz = o.z - q.g.position.z, t = clamp(px * fx + pz * fz, -q.half, q.half), dx = px - fx * t, dz = pz - fz * t, d = Math.hypot(dx, dz); return { d, nx: d > 1e-4 ? dx / d : 1, nz: d > 1e-4 ? dz / d : 0 }; }
  function vrSpeak(txt) { try { const ss = window.speechSynthesis; if (!ss) return; const vs = ss.getVoices().filter((v) => /^hu/i.test(v.lang)); if (!vs.length) return; const u = new SpeechSynthesisUtterance(txt.replace(/[!?]+/g, "!")); u.voice = vs[0]; u.lang = "hu-HU"; u.rate = 1.15; u.pitch = .8 + Math.random() * .5; ss.cancel(); ss.speak(u); } catch (e) {} }
  function vrSpectHit(q, who) {
    const S = VRR; if (W.t - q.hitT < 6) return; q.hitT = W.t;
    q.crew.forEach((c, i) => { c.fallT = W.t + i * .12; c.fallUp = W.t + 3.2 + i * .3; });
    const line = VR_SHOUT[(Math.random() * VR_SHOUT.length) | 0], line2 = VR_SHOUT[(Math.random() * VR_SHOUT.length) | 0];
    S.shoutQ = { q, t: W.t, lines: [line, line2 !== line ? line2 : "Na, ezt megcsináltad!"] };
    vrSpeak(line); setTimeout(() => vrSpeak(S.shoutQ ? S.shoutQ.lines[1] : ""), 1900);
    try { const a = T.ac(); if (a) { const s2 = a.createBufferSource(); s2.buffer = T.noiseBuf(.7); const f2 = a.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 180; const g2 = a.createGain(); g2.gain.setValueAtTime(.45, a.currentTime); g2.gain.exponentialRampToValueAtTime(.001, a.currentTime + .7); s2.connect(f2).connect(g2).connect(T.outBus()); s2.start(); } } catch (e) {}
    if (who === S) { S.msg = `⚠ NEKIMENTÉL ${q.cb ? "A RENDEZŐHAJÓNAK" : "EGY NÉZŐHAJÓNAK"}! – „${line}”`; S.msgT = 6; }
  }
  function vrSpectTick(dt) {
    const S = VRR, list = (S.spect || []).concat(S.cbHit ? [S.cbHit] : []);
    list.forEach((q) => {
      if (!q.cb) { q.g.position.y = Math.sin(W.t * 1.1 + q.ph) * .08; q.g.rotation.z = Math.sin(W.t * .9 + q.ph) * .03; q.g.rotation.x = Math.sin(W.t * .7 + q.ph * 2) * .02; }
      /* ütközés a saját hajóddal és az ellenfelekkel */
      const hitR = (S.cls ? S.cls.rad : 2.3) * (S.cls && S.cls.id === "zephyr" ? 1 : 1) + q.rad;
      [S].concat(S.riv || []).forEach((o) => { if (o.x == null || (o.g && o.g.visible === false)) return; const gp = vrSpectGap(o, q), lim = o === S ? hitR + (S.cls.id === "zephyr" ? 3.5 : .4) : hitR + (S.cls.id === "zephyr" ? 3 : .4);
        if (gp.d < lim) { const k = lim - gp.d; o.x += gp.nx * k; o.z += gp.nz * k; const key = "_sp" + (q.cb ? "c" : q.i); if (!o[key] || W.t - o[key] > 2) { if (o.v > 1) vrSpectHit(q, o); o.v *= o === S ? .45 : .5; } o[key] = W.t; }   /* csak az ütközés pillanatában lassít (nem ragad bele) */
        if (o !== S && !o.remote && gp.d < lim + 26 * S.kz) o.spAv = { x: q.g.position.x, z: q.g.position.z }; });
      /* emberek: integetnek (ha közel jön egy hajó, éljeneznek), ütközéskor elesnek, felállnak */
      const dS = Math.hypot(S.x - q.g.position.x, S.z - q.g.position.z);
      q.crew.forEach((c, i) => { const fallTo = c.fallT && W.t > c.fallT && W.t < c.fallUp ? 1 : 0; c.fall += (fallTo - c.fall) * Math.min(1, dt * (fallTo ? 7 : 1.6));
        c.waveT -= dt; if (c.waveT < 0) { c.wave = c.wave ? 0 : 1; c.waveT = c.wave ? rr(2, 4) : rr(3, 10); }
        const near = dS < 90, shout = S.shoutQ && S.shoutQ.q === q && W.t - S.shoutQ.t < 4 ? .6 + .4 * Math.sin(W.t * 18 + i) : 0;
        posePerson(c.p, dt, { sit: c.sit, wave: c.fall > .3 ? 0 : (near && i % 2 === 0 ? 1 : c.wave), cheer: near && i % 2 === 1 && c.fall < .3, fall: c.fall, shout, turn: near ? Math.atan2(S.x - q.g.position.x, S.z - q.g.position.z) * 0 : undefined }); });
    });
    /* kiáltás-buborék a hajó fölött */
    const sq = S.shoutQ; if (S.shoutL) { const on = sq && W.t - sq.t < 4.2; S.shoutL.visible = !!on; if (on) { const ln = W.t - sq.t < 2 ? sq.lines[0] : sq.lines[1]; S.shoutL.userData.set(["„" + ln + "”", sq.q.cb ? "a rendezőhajóról" : "a nézőhajóról"]); S.shoutL.position.set(sq.q.g.position.x, 8 + Math.sin(W.t * 3) * .2, sq.q.g.position.z); } }
  }

  /* ---------------------------------------------------------------- 4. IDŐLIMIT: a várható (jó) idő háromszorosa, egész percre kerekítve, legalább 5 perc */
  function vrLegSpeed(twaDeg, C) { return polar(twaDeg, false) * KN * VR_SPD * Math.sqrt(C.tws / (12 * KN)) * vrClsSpd(twaDeg) * 1.05; }
  function vrIdealTime(C) {
    const lm = { x: 0, z: 0 }, pts = [lm].concat(C.marks, [lm]), up = (VRR.cls || BOATCLS.zephyr).up; let t = 0;
    for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], d = Math.hypot(b.x - a.x, b.z - a.z), brg = Math.atan2(b.x - a.x, -(b.z - a.z)), twa = Math.abs(wrapA(brg - C.wf)) * R2D;
      if (twa < up + 2) { const vu = vrLegSpeed(up + 2, C), vmg = vu * Math.cos((up + 2) * D2R); t += d * Math.cos(twa * D2R) / Math.max(.3, vmg) + 12; }
      else if (twa > 150) { const vd = vrLegSpeed(145, C), vmg = vd * Math.cos(35 * D2R); t += d * Math.cos((180 - twa) * D2R) / Math.max(.3, vmg) + 8; }
      else t += d / Math.max(.3, vrLegSpeed(twa, C)); }
    return t + 10;
  }
  function vrLimitSet(C) { C.ideal = vrIdealTime(C); C.limit = Math.max(300, Math.ceil(3 * C.ideal / 60) * 60); }
  /* hátralévő út becslése (a következő bójától a célig) – a „Tovább” gombnál a még versenyben lévők becsült befutójához */
  function vrRemain(o) { const S = VRR, C = S.C, lm = { x: (C.line.a.x + C.line.b.x) / 2, z: (C.line.a.z + C.line.b.z) / 2 }, pts = [{ x: o.x, z: o.z }].concat(S.marks.slice(o.next || 0), [lm]); let t = 0;
    for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], d = Math.hypot(b.x - a.x, b.z - a.z), brg = Math.atan2(b.x - a.x, -(b.z - a.z)), twa = Math.abs(wrapA(brg - S.wf)) * R2D, up = S.cls.up;
      t += twa < up + 2 ? d * Math.cos(twa * D2R) / Math.max(.3, vrLegSpeed(up + 2, C) * Math.cos((up + 2) * D2R)) : twa > 150 ? d * Math.cos((180 - twa) * D2R) / Math.max(.3, vrLegSpeed(145, C) * Math.cos(35 * D2R)) : d / Math.max(.3, vrLegSpeed(twa, C)); }
    return t * (1.08 + (o.pen || 0) * .05) + (o.pen || 0) * 14; }
  /* 3. a befutó után: azonnal tovább – a még versenyben lévőket a becsült befutójuk szerint soroljuk (a limit után befutók: nem értek be – TLE) */
  function vrSkip() {
    const S = VRR; if (S.st !== "race" || !S.fin || S.doneT) return;
    const rest = S.riv.filter((r) => !r.fin).map((r) => { const est = S.t + vrRemain(r); return { r, est }; }).sort((a, b) => a.est - b.est);
    rest.forEach((q) => { const tle = q.est > S.C.limit; q.r.fin = q.est; S.res.push({ n: q.r.o.name, t: q.est, est: true, dnf: tle, code: tle ? "TLE" : "", ai: q.r.aiTook, human: !!q.r.human }); });
    S.doneT = S.t; vrFinish(); vrBriefOpen();
  }
  /* minden képkockán (a vrTick végén) */
  function vrExtTick(dt) {
    const S = VRR, C = S.C; if (!C) return;
    vrLavTick(dt); vrSpectTick(dt);
    /* időlimit */
    if (S.lvl && C.limit && S.st === "race" && !S.doneT) { const left = C.limit - S.t;
      if (left < 60 && left > 0 && !S.limWarn) { S.limWarn = 1; S.msg = "⚠ Még 1 perc az időlimitből – aki addig nem fut be, nem ért be (TLE)."; S.msgT = 6; beep(); }
      if (left <= 0) { if (!S.fin) S.res.push({ n: S.meName, t: S.t, me: true, dnf: true, code: "TLE" }); S.riv.filter((r) => !r.fin).forEach((r) => { r.fin = S.t; S.res.push({ n: r.o.name, t: S.t, dnf: true, code: "TLE", ai: r.aiTook, human: !!r.human }); });
        S.dnf = !S.fin; S.fin = S.fin || S.t; S.doneT = S.t; S.msg = "⏱ LETELT AZ IDŐLIMIT – a futam véget ért."; S.msgT = 8; horn(1, .2); vrFinish(); } }
    /* befutó után: kis idő múlva (ha mindenki beért) a kapitányi tájékoztató */
    if (S.st === "done" && S.doneT && !S.briefShown && S.lvl && W.t - (S.doneWT || (S.doneWT = W.t)) > 6) vrBriefOpen();
    if (S.st !== "done") S.doneWT = 0;
    if (typeof vrBriefTick === "function") vrBriefTick(dt);
    if (typeof vrNetTick === "function") vrNetTick(dt);
  }
