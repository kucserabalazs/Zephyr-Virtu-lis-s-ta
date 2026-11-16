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
    const id = o.mcls || VRR.cls.id;
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
    const pb = makeClassBoat(id, { full: true, steer: (() => { try { return localStorage.getItem("zephyr-kormany") || "bot"; } catch (e) { return "bot"; } })(), zephyr: id === "j420" || id === "finn", name: S.prof.name || "", num: "HUN " + (7 + (S.prof.id.charCodeAt(2) % 80)), crew: id === "j420" ? 1 : 0, seed: 9, hull: id === "finn" ? "#f6f3ea" : undefined }); W.root.add(pb); S.pb = pb;
    /* fedélzeti térkép (a nagy hajó taktikai kijelzője) a kis hajó fedélzetén, a kormányos előtt */
    if (S.ck && S.ck.chartT) { const c = S.ck.chartT._canvas, w = id === "flamingo" ? .34 : id === "tutaj" ? .3 : .5, h = w * c.height / c.width; const pl = mesh(new THREE.PlaneGeometry(w, h), basic({ map: S.ck.chartT, side: THREE.DoubleSide }), pb.userData.body); const at = pb.userData.chartAt;
      /* 2026-11-14 (tulajdonos: „a műszer nem felém mutat”): a kijelző a kormányos szeme felé néz (eddig hátulról, tükrözve látszott) */
      pl.position.set(at.x, at.y + h * .5 * .6, at.z); { const eye = pb.userData.seat.clone().add(new THREE.Vector3(0, .95, 0)), M4 = new THREE.Matrix4().lookAt(eye, pl.position, new THREE.Vector3(0, 1, 0)); pl.quaternion.setFromRotationMatrix(M4); } S.pbChart = pl; vrPodBtns(pl, w * .95, -h / 2 - w * .1, .012);
      if (pb.userData.toyChart) { /* flamingó: felfújható, rózsaszín „úszógumi” keret, sárga sarokbogyókkal */ const pk = std({ color: "#ff6fae", roughness: .35 }), ye = std({ color: "#ffd21a", roughness: .3 });
        [[0, h / 2 + .03, w + .1, true], [0, -h / 2 - .03, w + .1, true], [w / 2 + .03, 0, h + .02, false], [-w / 2 - .03, 0, h + .02, false]].forEach(([x, y, L, hor]) => { const c = mesh(new THREE.CapsuleGeometry(.035, L, 6, 12), pk, pl); c.position.set(x, y, -.02); if (hor) c.rotation.z = Math.PI / 2; });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const b = mesh(new THREE.SphereGeometry(.045, 12, 10), ye, pl); b.position.set(sx * (w / 2 + .03), sy * (h / 2 + .03), -.01); });
        const bk = mesh(new THREE.BoxGeometry(w + .04, h + .04, .02), std({ color: "#ffd6ea", roughness: .5 }), pl); bk.position.z = -.03; }
      else if (pb.userData.cocoChart) { /* tutaj: kókuszdió-műszer – a kijelző egy félbevágott kókuszhéjban, rostos peremmel */
        const ct = canvasTex(128, 64, (g2, w2, h2) => { g2.fillStyle = "#5e3b1d"; g2.fillRect(0, 0, w2, h2); for (let k = 0; k < 500; k++) { g2.strokeStyle = `rgba(${150 + Math.random() * 60},${105 + Math.random() * 40},${55 + Math.random() * 30},.5)`; g2.beginPath(); const x = Math.random() * w2, y = Math.random() * h2; g2.moveTo(x, y); g2.lineTo(x + Math.random() * 6 - 3, y + 4 + Math.random() * 8); g2.stroke(); } });
        const shell = new THREE.SphereGeometry(Math.max(w, h) * .62, 20, 12, 0, TAU, 0, Math.PI / 2); shell.rotateX(-Math.PI / 2); shell.scale(1, h / w * 1.05 + .15, .55); const sm = mesh(shell, std({ map: ct, roughness: 1, side: THREE.DoubleSide }), pl); sm.position.z = -.012;
        const rim = new THREE.TorusGeometry(Math.max(w, h) * .62, .014, 6, 28); rim.scale(1, h / w * 1.05 + .15, 1); mesh(rim, std({ color: "#f1ead6", roughness: .7 }), pl).position.z = -.008;   /* a kókusz fehér húsa a vágott peremen */
        for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, st = new THREE.ConeGeometry(.008, .05 + Math.random() * .04, 4); const m2 = mesh(st, std({ color: k % 2 ? "#8a5a2e" : "#a8743c", roughness: 1 }), pl); m2.position.set(Math.cos(a) * Math.max(w, h) * .64, Math.sin(a) * Math.max(w, h) * .64 * (h / w * 1.05 + .15), -.03); m2.rotation.z = a - Math.PI / 2; } }
      else { const fr = mesh(new THREE.BoxGeometry(w + .04, h + .04, .02), std({ color: "#1d232b", roughness: .5 }), pl); fr.position.z = -.012; } }
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
    if (PS.scare != null && dt > 0) { if (S._vPrev != null && S._vPrev - S.v > .6 && S._vPrev > 1) PS.scare = 1.6; S._vPrev = S.v; }   /* ütközés (hirtelen lassulás): a kókusz megijed */
    PS.side = BS.side; PS.awa = BS.awa != null ? BS.awa : S.awa; PS.aws = BS.aws != null ? BS.aws : S.aws; PS.rud = S.wa / WA_MAX;
    /* 2026-11-16: a kis hajó a SAJÁT méretével és tömegével ring a hullámokon (05z rwHullMotion): a dingi és a flamingó a rövid fodrot is érzi, a tutaj lomhábban */
    const hmL = rwHullMotion(S.hmL || (S.hmL = {}), S.x, S.z, S.b, Math.max(1.6, S.cls.half * 2), S.cls.id === "tutaj" ? 2.4 : S.cls.id === "flamingo" ? 1.2 : 1.55, dt, rwHullP(S.cls.id));
    PS.pitch = -hmL[1];
    PS.heel = (BS.heel || 0) * (S.cls.id === "finn" || S.cls.id === "j420" ? .55 : S.cls.id === "tutaj" ? 1 : S.cls.id === "flamingo" ? .9 : .35);   /* 2026-11-16 03:06: a dőlés az eredeti (tulajdonos) */   /* a tutaj pontosan úgy dől, mint a nagy hajó */
    const spT = S.sp && (S.sp.st === "fly" || S.sp.st === "pop" || S.sp.st === "spread") ? 1 : 0; PS.spin = (PS.spin || 0) + (spT - (PS.spin || 0)) * Math.min(1, dt * .8);
    const lift = S.cls.id === "finn" || S.cls.id === "j420" ? .1 : 0; pb.position.set(0, hmL[0] + lift, 0);   /* a könnyű dingi magasabban úszik: a padlója a víz fölött */ pb.rotation.set(0, Math.PI, 0); pb.userData.update(dt);
    /* a néző helye: a kormányos ülése (VR), vagy kicsit mögötte és fölötte (2D – így a hajó is látszik) */
    pb.updateMatrix(); const bdy = pb.userData.body; if (bdy) { _sv.copy(pb.userData.seat).multiply(bdy.scale).add(bdy.position).applyMatrix4(pb.matrix); } else _sv.copy(pb.userData.seat).applyMatrix4(pb.matrix);   /* 19:52 (tulajdonos): a nézőpont NEM követi a dőlést (a 18:39-es változás visszavonva) */
    const ph = !T.inVR && (document.documentElement.dataset.device === "phone" || innerHeight > innerWidth * 1.15);
    if (T.inVR) { const lift = S.seated ? 0 : .5; W.root.position.set(-_sv.x, lift - _sv.y - .05, -_sv.z); }
    else if (W.dbgEye) W.root.position.set(-_sv.x, .5 - _sv.y - .05 - 1.65, -_sv.z);   /* teszt: a VR-ben álló kormányos szemmagassága */
    else { const back = ph ? 9.5 : 5.6, up = ph ? 3.4 : 1.75; W.root.position.set(-_sv.x, -up - _sv.y, -_sv.z - back); }   /* 2D-ben a kamera a világ y = 0 pontjában van */
    if (S.msgL) S.msgL.position.set(_sv.x, _sv.y + 1.9, _sv.z - 3.2);
    if (S.helpL) S.helpL.position.set(_sv.x - .5, _sv.y + 1.4, _sv.z - 1.6);
  }
  /* 2026-11-14 18:39 (tulajdonos: „a dőlés a nézőpontra mindig legyen kihatással a vezetőre is” – minden hajón): a világot a néző szeme körül a hajó dőlésének
     ~60%-ával elforgatjuk – a horizont megdől, a hajó a lábad alatt marad (a teljes 100% émelyítő lenne) */
  const _rq = new THREE.Quaternion(), _rp = new THREE.Vector3(), _rz = new THREE.Vector3(0, 0, 1);
  function vrHeelView() { const S = VRR, own = S.pb || S.boat; if (!own) return; const b = own.userData.body; const h = b ? b.rotation.z : 0, p = b ? b.rotation.x : 0;
    try { T.camObj().getWorldPosition(_rp); } catch (e) { _rp.set(0, 0, 0); }
    _rq.setFromAxisAngle(_rz, h * .6); const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -p * .5); _rq.multiply(qx);
    W.root.position.sub(_rp).applyQuaternion(_rq).add(_rp); W.root.quaternion.copy(_rq); }
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
  /* 2026-11-15 18:43 (tulajdonos: „Legyen valósághű … úgy ábrázold, hogy élethű legyen!”): a lavór és a széllökés a 05x szélmezőjéből jön – a lavór VILÁGOS,
     TÜKÖRSIMA folt (gyenge szél, kicsit balra fordul), a széllökés SÖTÉT, FODROS folt (erősebb szél, kicsit jobbra fordul); mindkettő sodródik a széllel.
     A régi, a vízre nem látszó „időzített lökések” megszűntek. A régi hívások (vrLavGen/vrLavK/vrLavTick) ide vezetnek. */
  function vrLavGen(C) { const S = VRR; S.lav = []; S.lavMsgT = 0; S.gstMsgT = 0; try { rwRaceInit(C); } catch (e) { console.warn("szélmező", e); } }
  function vrLavK(x, z) { try { return rwWindAt(x, z).k; } catch (e) { return 1; } }
  function vrLavTick(dt) {
    const S = VRR; if (S.st !== "race" || S.fin) return; const lw = S.lw || rwWindAt(S.x, S.z);
    if (lw.l > .55 && W.t - (S.lavMsgT || 0) > 25 && !(S.msgT > 0 && /⚠/.test(S.msg || ""))) { S.lavMsgT = W.t; S.msg = "LAVÓR! Szélcsendes foltba futottál – a víz itt világos és tükörsima, a szél leállt. Legközelebb kerüld ki: a sima, fényes vízfoltot messziről látod."; S.msgT = 7; }
    else if (lw.g > .6 && W.t - (S.gstMsgT || 0) > 45 && !(S.msgT > 0)) { S.gstMsgT = W.t; S.msg = "SZÉLLÖKÉS! A sötét, fodros folt erősebb szelet hoz – a hajó gyorsul, a szél kicsit jobbra fordul. Keresd a sötét foltokat!"; S.msgT = 6; }
  }

  /* ---------------------------------------------------------------- 7. A PART A HÁTTÉRBEN: 2026-11-14 15:45 óta a VALÓDI Balaton (05j-verseny-balaton.js: VENUES, vrShoresSet) */

  /* ---------------------------------------------------------------- 14. NÉZŐHAJÓK: kidolgozott motoros jachtok, tagolt (integető) emberekkel; soha nincsenek a pályán;
     nekik is neki lehet menni – ilyenkor a rajtuk állók elesnek, és kiabálnak */
  const VR_SHOUT = ["Ki adott neked hajót?!", "Vetted a jogosítványodat?!", "Anyád hogy van?!", "Hová nézel, kapitány?!", "Ez nem dodzsem!", "Szemüveget is vegyél!", "A bója arra van!", "Te is a Balatonon tanultál?!", "Hívom a vízirendőrséget!", "Ennyi erővel úszhattál volna!"];
  function vrYachtCrew(g, n, seed) {
    /* a hátsó fedélzet (a tükör és a szalon között) és a flybridge: a lábak a fedélzeten, a fej szabadon (nincs „hajóba csúszás”) */
    const SY = 1.35, SZ = 1.3, SX = 1.3, dy = (u) => hullShape(u).sheer * SY + .08, zz = (u) => hullShape(u).z * SZ, hx = (u) => hullShape(u).hb * SX, d0 = dy(.45);
    const spots = [[0, d0 + 1.5 + .02, .35 + zz(.45) * 0, 1], [-.55, dy(.12) + .04, zz(.13), 0], [.55, dy(.12) + .04, zz(.11), 0], [0, dy(.12) + .04, zz(.07), 0], [-.4, dy(.85) + .13, zz(.83), 2], [.45, dy(.82) + .13, zz(.86), 2]];
    const TOPS = ["#e5262f", "#1f5fa8", "#ffd166", "#f4f4f0", "#2fa85a", "#ff7a1a", "#8e44ad"], out = [];
    for (let k = 0; k < Math.min(n, spots.length); k++) { const s = spots[(k + seed) % spots.length], sit = s[3] === 2 ? 1 : 0;
      const p = makePerson({ old: true, top: TOPS[(k + seed) % 7], bot: ["#27303c", "#f2f2f2", "#5a6a7a", "#2a4a8a"][(k + seed) % 4], seed: k * 3 + seed, cap: k % 3 === 1 ? "#ffffff" : null, glasses: k % 2 === 0, sunhat: k % 4 === 3 ? "#e8d29a" : null, sleeve: k % 2 === 1 });
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
      /* (a ringás: 05z rwFloatTick – a valódi hullámokon) */
      /* ütközés a saját hajóddal és az ellenfelekkel */
      const hitR = (S.cls ? S.cls.rad : 2.3) * (S.cls && S.cls.id === "zephyr" ? 1 : 1) + q.rad;
      [S].concat(S.riv || []).forEach((o) => { if (o.x == null || (o.g && o.g.visible === false)) return; const gp = vrSpectGap(o, q), lim = o === S ? hitR + (S.cls.id === "zephyr" ? 3.5 : .4) : hitR + (S.cls.id === "zephyr" ? 3 : .4);
        if (gp.d < lim) { const k = lim - gp.d; o.x += gp.nx * k; o.z += gp.nz * k; const key = "_sp" + (q.cb ? "c" : q.i); if (!o[key] || W.t - o[key] > 2) { if (o.v > 1) vrSpectHit(q, o); o.v *= o === S ? .45 : .5; } o[key] = W.t; }   /* csak az ütközés pillanatában lassít (nem ragad bele) */
        if (o !== S && !o.remote && gp.d < lim + 26 * S.kz) o.spAv = { x: q.g.position.x, z: q.g.position.z }; });
      /* emberek: integetnek (ha közel jön egy hajó, éljeneznek), ütközéskor elesnek, felállnak */
      const dS = Math.hypot(S.x - q.g.position.x, S.z - q.g.position.z);
      /* 2026-11-14: távol (110 m-en túl) az emberek nem mozognak – így a nézőhajó egyetlen kisütött modellként rajzolható (akadás ellen); közeledéskor, eséskor, kiabáláskor élednek fel */
      const live = dS < 110 || (S.shoutQ && S.shoutQ.q === q && W.t - S.shoutQ.t < 5) || q.crew.some((c) => c.fall > .01 || (c.fallT && W.t < c.fallUp));
      q.crew.forEach((c, i) => { if (!live) return; const fallTo = c.fallT && W.t > c.fallT && W.t < c.fallUp ? 1 : 0; c.fall += (fallTo - c.fall) * Math.min(1, dt * (fallTo ? 7 : 1.6));
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
  function vrRemain(o) { const S = VRR, C = S.C, lm = finMid(), pts = [{ x: o.x, z: o.z }].concat(S.marks.slice(o.next || 0), [lm]); let t = 0;
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
    vrLavTick(dt); vrSpectTick(dt); try { stmTick(dt, !!(NGT && NGT.on)); } catch (e) {} try { msTick(dt); } catch (e) { console.warn("kisütés", e); } try { hullMaskSet(S.water && S.water.userData.mat, [S.pb].concat((S.riv || []).map((r) => r.g))); } catch (e) {}
    /* időlimit */
    if (S.lvl && C.limit && S.st === "race" && !S.doneT) { const left = C.limit - S.t;
      if (left < 60 && left > 0 && !S.limWarn) { S.limWarn = 1; S.msg = "⚠ Még 1 perc az időlimitből – aki addig nem fut be, nem ért be (TLE)."; S.msgT = 6; beep(); }
      if (left <= 0) { if (!S.fin) S.res.push({ n: S.meName, t: S.t, me: true, dnf: true, code: "TLE" }); S.riv.filter((r) => !r.fin).forEach((r) => { r.fin = S.t; S.res.push({ n: r.o.name, t: S.t, dnf: true, code: "TLE", ai: r.aiTook, human: !!r.human }); });
        S.dnf = !S.fin; S.fin = S.fin || S.t; S.doneT = S.t; S.msg = "⏱ LETELT AZ IDŐLIMIT – a futam véget ért."; S.msgT = 8; horn(1, .2); vrFinish(); } }
    /* befutó után: kis idő múlva (ha mindenki beért) a kapitányi tájékoztató */
    if (S.st === "done" && S.doneT && !S.briefShown && S.lvl && W.t - (S.doneWT || (S.doneWT = W.t)) > 6) vrBriefOpen();
    if (S.st !== "done") S.doneWT = 0;
    try { vrNightTick(dt); } catch (e) {}
    try { kekTick(dt); } catch (e) { console.warn("kékszalag", e); }   /* 2026-11-15 (05zc) */
    if (typeof vrBriefTick === "function") vrBriefTick(dt);
    if (typeof vrNetTick === "function") vrNetTick(dt);
  }
