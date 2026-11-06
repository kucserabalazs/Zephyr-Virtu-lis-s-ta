
  /* =================================================================== 3/C. A REGATTA-BÓJA (2026. nov. 6., a tulajdonos kérésére – a régi nyolcszögletű stég és a merülés helyett)
     • Egy nagy, narancs versenybóján (felső része tíkfa fedélzet korláttal, paddal, zászlórúddal, távcsővel) ülsz a Balaton közepén, a stégjátékok kis
       vitorlásversenyének helyszínén – életnagyságban. A makett az asztalon előtted.
     • Körülötted hat versenyhajó kerüli a bóját (a szél a part felől fúj: cirkálva jönnek feléd a nyílt víz felől, a bójánál spinakkert húznak, és elfutnak).
     • Időnként „jelenetek”, mint a stégjáték kis regattájában: a Titanic jéghegynek ütközik és elsüllyed (mentőcsónakok), tengeri szörny bukkan fel,
       mentőhelikopter húz ki egy borult hajóst, lapátkerekes gőzös dudál, rendőrmotoros száguld szirénával, repülő húz transzparenst, tengeralattjáró emelkedik ki.
     Koordináták: a site-ban (a bója közepe (0,0,0,55), a fedélzet y = 0, a víz y = WATER_Y). A szél felé mutató irány: +z (a part); a nyílt víz −z. */
  const BJ = {};
  const BUOY_C = new THREE.Vector3(0, 0, .55), BUOY_R = 2.9;
  /* ------------------------------------------------------------------ a bója-színpad */
  function buildBuoyStage(site) {
    const g = new THREE.Group(); site.add(g); ENV.deck = g; ENV.postPos = []; ENV.lavender = []; ENV.lanterns = []; ENV.walk = null;
    g.position.set(BUOY_C.x, 0, BUOY_C.z);
    const orange = std({ color: "#ff6410", roughness: .48, metalness: .02 }), white = std({ color: "#f4f4f0", roughness: .35 }), rubber = std({ color: "#1d2026", roughness: .85 });
    const steel = std({ color: "#dfe4e8", roughness: .18, metalness: .95 });
    /* a test: enyhén domború, felfújt hatású henger (a vízvonal alatt is látszik valamennyi a tiszta vízben) */
    const prof = []; for (let i = 0; i <= 14; i++) { const v = i / 14, y = -1.75 + v * 1.65; prof.push(new THREE.Vector2(BUOY_R - .35 + Math.sin(v * Math.PI) * .38 + v * .12, y)); }
    const body = mesh(new THREE.LatheGeometry(prof, 64), orange, g); body.castShadow = true; body.receiveShadow = true;
    /* fényvisszaverő fehér sáv + a „1” jelölés kétszer, ZEPHYR felirat */
    const band = mesh(new THREE.CylinderGeometry(BUOY_R + .07, BUOY_R + .07, .26, 64, 1, true), std({ color: "#ffffff", roughness: .25, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0 }), g); band.position.y = -.42; ENV.glows.push({ mat: band.material, k: .25 });
    const markT = canvasTex(1024, 128, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = "#14161b"; gg.font = "900 104px system-ui, sans-serif"; gg.textAlign = "center"; gg.textBaseline = "middle";
      ["1", "ZEPHYR", "1", "ZEPHYR"].forEach((t2, i) => gg.fillText(t2, (i + .5) * w / 4, h / 2 + 6)); });
    const mk = mesh(new THREE.CylinderGeometry(BUOY_R + .02, BUOY_R + .03, .5, 64, 1, true), basic({ map: markT, transparent: true, depthWrite: false }), g); mk.position.y = -1.0;
    /* gumi ütköző a perem körül, alatta acél fogantyúk */
    const fend = mesh(new THREE.TorusGeometry(BUOY_R + .05, .09, 10, 72), rubber, g); fend.rotation.x = Math.PI / 2; fend.position.y = -.12;
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; const h = mesh(new THREE.TorusGeometry(.12, .018, 6, 12, Math.PI), steel, g); h.position.set(Math.cos(a) * (BUOY_R + .1), -.62, Math.sin(a) * (BUOY_R + .1)); h.rotation.set(0, -a + Math.PI / 2, Math.PI); }
    /* tíkfa fedélzet: koncentrikus „hajópalló” mintával, fehér fugákkal */
    const teak = canvasTex(1024, 1024, (gg, w, h) => { gg.fillStyle = "#8a6239"; gg.fillRect(0, 0, w, h);
      /* valódi tíkfedélzet: ~12 cm-es deszkák, vékony fekete gumi tömítéssel, a deszkavégeken eltolt illesztésekkel, a peremen hajlított „margó” deszka */
      for (let y = 0, j = 0; y < h; y += 22, j++) { const off = (j * 137) % 300;
        for (let x = -off; x < w; x += 300) { gg.fillStyle = `hsl(${rr(26, 31)},${rr(36, 48)}%,${rr(36, 46)}%)`; gg.fillRect(x, y, 298, 20); for (let k = 0; k < 9; k++) { gg.fillStyle = `rgba(60,32,14,${rr(.06, .16)})`; gg.fillRect(x + rand() * 280, y + rr(2, 18), rr(40, 160), 1.2); } gg.fillStyle = "#17140f"; gg.fillRect(x + 298, y, 2, 20); }
        gg.fillStyle = "#17140f"; gg.fillRect(0, y + 20, w, 2); }
      gg.strokeStyle = "#8a5a32"; gg.lineWidth = 36; gg.beginPath(); gg.arc(w / 2, h / 2, w / 2 - 18, 0, TAU); gg.stroke(); gg.strokeStyle = "#17140f"; gg.lineWidth = 2; gg.beginPath(); gg.arc(w / 2, h / 2, w / 2 - 37, 0, TAU); gg.stroke(); });
    const top = mesh(new THREE.CylinderGeometry(BUOY_R - .02, BUOY_R - .02, .1, 64), std({ map: teak, roughness: .7 }), g); top.position.y = -.05; top.receiveShadow = true; ENV.deckTop = top;
    /* korlát: 14 rozsdamentes oszlop, két sor fehér kötél (a pad mögött is) */
    const RR = BUOY_R - .22, posts = [], rope = [];
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + .11; posts.push(rodGeom(new THREE.Vector3(Math.cos(a) * RR, 0, Math.sin(a) * RR), new THREE.Vector3(Math.cos(a) * RR, .82, Math.sin(a) * RR), .022, 8)); posts.push([new THREE.SphereGeometry(.035, 10, 8), M4(Math.cos(a) * RR, .83, Math.sin(a) * RR)]); }
    mesh(mergeGeoms(posts), steel, g);
    [.8, .45].forEach((y) => { const r2 = mesh(new THREE.TorusGeometry(RR, .016, 6, 96), std({ color: "#f2efe4", roughness: .8 }), g); r2.rotation.x = Math.PI / 2; r2.position.y = y; });
    /* párnázott, íves pad hátul (rajta „ülünk”), sötétkék huzat fehér paszpollal */
    const cush = std({ color: "#1d3a64", roughness: .85 }), pip = std({ color: "#f4f1e6", roughness: .6 }), wood = std({ map: txPlanks("benchB", "#7a5534", "#94683f", 5), roughness: .6 });
    /* a pad: íves körcikk-alak (a bója peremét követi), lekerekített párnák, varrott paszpol; a háttámla enyhén hátradől */
    const arc = (r0, r1, a0, a1) => { const s2 = new THREE.Shape(); s2.absarc(0, 0, r1, a0, a1, false); s2.absarc(0, 0, r0, a1, a0, true); s2.closePath(); return s2; };
    const A0 = Math.PI / 2 - .42, A1 = Math.PI / 2 + .42, R1 = RR - .42;
    const sector = (r0, r1, h, y, bev, mat2) => { const ge = new THREE.ExtrudeGeometry(arc(r0, r1, A0, A1), { depth: h, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 40 }); ge.rotateX(Math.PI / 2); ge.translate(0, y + h, 0); const m2 = mesh(ge, mat2, g); m2.castShadow = true; m2.receiveShadow = true; return m2; };
    sector(R1 - .25, R1 + .25, .38, 0, 0, wood);
    sector(R1 - .23, R1 + .2, .07, .4, .025, cush);
    { const bk = sector(R1 + .17, R1 + .27, .4, .5, .03, cush); bk.rotation.x = 0; }
    sector(R1 - .255, R1 - .235, .012, .47, 0, pip);
    /* zászlórúd a bója jobb hátsó részén: versenyrendezői „1”-es tábla, magyar zászló, Zephyr-fecskefarkú; csúcsán jelzőlámpa */
    const pole = new THREE.Group(); g.add(pole); pole.position.set(Math.cos(.55) * (RR - .1), 0, Math.sin(.55) * (RR - .1));
    mesh(new THREE.CylinderGeometry(.03, .045, 5.2, 10), steel, pole).position.y = 2.6;
    const lampM = std({ color: "#fff6dd", emissive: new THREE.Color("#ffcf7a"), emissiveIntensity: 0, roughness: .3 }); const lamp = mesh(new THREE.SphereGeometry(.08, 14, 10), lampM, pole); lamp.position.y = 5.26; ENV.glows.push({ mat: lampM, k: 3 });
    BJ.flags = [];
    const flag = (draw, w, h, y) => { const geo = new THREE.PlaneGeometry(w, h, 12, 2); geo.translate(w / 2, 0, 0); const t2 = canvasTex(256, Math.round(256 * h / w), draw);
      const f = mesh(geo, std({ map: t2, side: THREE.DoubleSide, roughness: .8 }), pole); f.position.y = y; f.rotation.y = Math.PI / 2 + .3; f.castShadow = true;
      const base = Float32Array.from(geo.attributes.position.array); BJ.flags.push({ geo, base, w, ph: rand() * 9 }); return f; };
    flag((gg, w, h) => { ["#ce2939", "#ffffff", "#477050"].forEach((c, i) => { gg.fillStyle = c; gg.fillRect(0, i * h / 3, w, h / 3 + 1); }); }, 1.2, .8, 4.75);
    flag((gg, w, h) => { gg.fillStyle = "#0b2f5e"; gg.beginPath(); gg.moveTo(0, 0); gg.lineTo(w, 0); gg.lineTo(w * .78, h / 2); gg.lineTo(w, h); gg.lineTo(0, h); gg.fill(); gg.fillStyle = "#ffd166"; gg.font = "800 46px Georgia, serif"; gg.textBaseline = "middle"; gg.fillText("ZEPHYR", 14, h / 2 + 2); }, 1.3, .55, 3.95);
    { const bd = canvasTex(256, 256, (gg, w, h) => { gg.fillStyle = "#ff7a00"; gg.fillRect(0, 0, w, h); gg.strokeStyle = "#14161b"; gg.lineWidth = 14; gg.strokeRect(10, 10, w - 20, h - 20); gg.fillStyle = "#14161b"; gg.font = "900 200px system-ui, sans-serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("1", w / 2, h / 2 + 12); });
      [0, Math.PI].forEach((ry) => { const b = mesh(new THREE.PlaneGeometry(.55, .55), std({ map: bd, roughness: .6 }), pole); b.position.set(0, 3.0, 0); b.rotation.y = ry + .55; b.translateZ(.04); }); }
    /* távcső az első korlátnál (rámutatva: a Balaton látnivalói a láthatáron) */
    const tel = new THREE.Group(); g.add(tel); tel.position.set(-1.55, 0, -1.75);
    const brass = std({ color: "#c9a24a", roughness: .3, metalness: .85 }), blk = std({ color: "#1b1d22", roughness: .4, metalness: .4 });
    [0, 1, 2].forEach((k) => { const a = k / 3 * TAU; rodBetween(new THREE.Vector3(Math.cos(a) * .26, 0, Math.sin(a) * .26), new THREE.Vector3(0, 1.1, 0), .016, blk, tel); });
    const piv = new THREE.Group(); tel.add(piv); piv.position.y = 1.15; const tube = mesh(new THREE.CylinderGeometry(.045, .065, .7, 16), brass, piv); tube.rotation.set(Math.PI / 2 - .08, 0, 0); tube.position.set(0, .05, -.1);
    piv.rotation.y = -((296 - 345) * D2R);
    ENV.telescope = tel; const hitT = mesh(new THREE.BoxGeometry(.6, 1.5, .6), basic({ visible: false }), tel); hitT.position.y = .75; ENV.telHit = hitT;
    /* mentőöv a korláton, kötéltekercs, kis hűtőtáska – hogy „lakott” legyen */
    const ring = mesh(new THREE.TorusGeometry(.3, .07, 10, 28), std({ color: "#ff5a1f", roughness: .6 }), g); ring.position.set(1.95, .55, -1.55); ring.rotation.set(0, .85, 0);
    [0, 1, 2, 3].forEach((k) => { const s = mesh(new THREE.TorusGeometry(.305, .072, 6, 6, Math.PI / 6), white, g); s.position.copy(ring.position); s.rotation.set(0, .85, k * Math.PI / 2 + .2); });
    const coil = mesh(new THREE.TorusGeometry(.17, .045, 8, 20), std({ color: "#e9e1c8", roughness: .9 }), g); coil.rotation.x = Math.PI / 2; coil.position.set(-1.9, .05, .9);
    /* a víz találkozása: habgyűrű a bója körül (lélegzik a hullámmal) */
    const foamT = canvasTex(256, 32, (gg, w, h) => { const gr = gg.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(1, "rgba(255,255,255,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, w, h); for (let k = 0; k < 220; k++) { gg.fillStyle = "rgba(255,255,255,.7)"; gg.fillRect(rand() * w, rand() * h * .6, rr(2, 6), 2); } });
    foamT.wrapS = THREE.RepeatWrapping; foamT.repeat.set(10, 1);
    const fg = new THREE.RingGeometry(BUOY_R + .02, BUOY_R + .9, 64, 1); fg.rotateX(-Math.PI / 2); { const uv = fg.attributes.uv, p = fg.attributes.position; for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)); uv.setXY(i, (Math.atan2(p.getZ(i), p.getX(i)) / TAU + .5), (r - BUOY_R) / .9); } }
    const foam = mesh(fg, basic({ map: foamT, transparent: true, depthWrite: false, opacity: .7 }), g); foam.position.y = WATER_Y + .02; foam.renderOrder = 3; BJ.foam = foam;
    /* horgonylánc a mélybe (a tiszta vízben lefelé nézve látszik) */
    { const links = []; for (let k = 0; k < 18; k++) links.push([new THREE.TorusGeometry(.07, .018, 5, 10), M4(.4 + k * .12, -1.8 - k * .32, -.3 - k * .1, k % 2 ? Math.PI / 2 : 0, 0, .35)]); mesh(mergeGeoms(links), std({ color: "#5a5f66", roughness: .5, metalness: .7 }), g); }
    return g;
  }

  /* ------------------------------------------------------------------ ÉLETNAGYSÁGÚ VERSENY A BÓJA KÖRÜL */
  const RF = new THREE.Vector3(0, 0, 1), RRv = new THREE.Vector3(-1, 0, 0);   /* szél felé (a part) és jobbra */
  const RP = (f, r, v) => (v || new THREE.Vector3()).set(0, 0, 0).addScaledVector(RF, f).addScaledVector(RRv, r);
  /* a pálya: a mi bójánk a szél felőli jel (f = 0); 230 m-rel a nyílt víz felé a hátszeles kapu. Bójakerülés bal kézzel (a bója a hajó bal oldalán marad). */
  const RLEGS = [{ id: "W1", f: -2, r: 8, rad: 7, up: true }, { id: "W2", f: 9, r: -3, rad: 6 }, { id: "L1", f: -232, r: -14, rad: 12 }, { id: "L2", f: -240, r: 4, rad: 10 }];
  function buildBuoyRace(site) {
    const g = new THREE.Group(); site.add(g); g.position.y = WATER_Y; BJ.race = g;
    /* a hátszeles kapu két sárga bójája és egy messzi rendezőhajó (a pálya „háttere”) */
    [[-230, -20], [-230, 20]].forEach(([f, r]) => { const b = makeBuoy("#ffd166", 2.1); b.position.copy(RP(f, r)); g.add(b); });
    const cb = makeCommittee(); cb.position.copy(RP(-150, 70)); cb.rotation.y = Math.PI / 2 + .3; g.add(cb); cb.userData.flags.forEach((f, i) => { f.visible = i !== 0; });
    const pick = [0, 1, 2, 4, 6, 7];   /* a regatta hajói közül hat (a Zephyr is köztük) */
    BJ.boats = pick.map((bi, i) => {
      const b = BOATS[bi], bg = makeBoat(Object.assign({ detail: 0, crew: 3 }, b)); g.add(bg);
      const wk = makeWake(g, .6);
      const hit = mesh(new THREE.BoxGeometry(4, 13, 10), basic({ visible: false }), bg); hit.position.y = 6;
      const lg = rand() < .5 ? 0 : 2;
      const st = { i, b, g: bg, wk, hit, f: lg === 0 ? rr(-215, -30) : rr(-200, -40), r: rr(-50, 50), hd: lg === 0 ? (i % 2 ? 1 : -1) * .77 : Math.PI + (i % 2 ? .4 : -.4), v: 2.6, leg: lg, tack: i % 2 ? 1 : -1, spin: lg === 2 ? 1 : 0, ph: rand() * 9, laps: 0, lastTack: 0 };
      hit.userData.xr = { hover: (on) => { if (on) showTip(bg, "⛵ " + b.name + " · " + b.num, raceLine(st)); else showTip(null); } };
      T.xr.extra.add(hit); W.objs.push(hit);
      return st;
    });
    BJ.t = 0; BJ.next = 22; BJ.cur = null; BJ.queue = []; BJ.events = {};
    return g;
  }
  function raceLine(st) { const L = RLEGS[st.leg]; return L.id[0] === "W" ? (st.spin > .5 ? "spinakkerrel fut" : "cirkál a bója felé – szél ellen, cikcakkban") : "hátszélben, spinakkerrel a kapu felé"; }
  const _rv = new THREE.Vector3(), _rv2 = new THREE.Vector3();
  function raceTick(dt) {
    if (!BJ.boats) return;
    const t = W.t;
    BJ.boats.forEach((st) => {
      const L = RLEGS[st.leg], df = L.f - st.f, dr = L.r - st.r, dist = Math.hypot(df, dr);
      const brg = Math.atan2(dr, df);
      let want = brg;
      const up = Math.abs(brg) < 44 * D2R, down = Math.abs(brg) > 150 * D2R;
      if (up) {   /* cirkálás: halzon a laylinig, majd forduló (legalább 9 mp két forduló között) */
        want = st.tack * 44 * D2R;
        const other = -st.tack * 44 * D2R;
        if (t - st.lastTack > 9 && ((st.tack > 0 && brg <= other + 2 * D2R) || (st.tack < 0 && brg >= other - 2 * D2R) || (Math.abs(st.r) > 120 && Math.sign(st.r) === st.tack))) { st.tack = -st.tack; want = st.tack * 44 * D2R; st.lastTack = t; if (dist < 70) try { flap(.05); } catch (e) {} }
      } else if (down) {
        want = st.tack * 150 * D2R;
        const other = -st.tack * 150 * D2R;
        if (t - st.lastTack > 9 && ((st.tack > 0 && brg < 0 && brg >= other - 3 * D2R) || (st.tack < 0 && brg > 0 && brg <= other + 3 * D2R) || (Math.abs(st.r) > 110 && Math.sign(st.r) === st.tack))) { st.tack = -st.tack; want = st.tack * 150 * D2R; st.lastTack = t; }
      }
      /* egymás és a mi bójánk kerülése */
      BJ.boats.forEach((o) => { if (o === st) return; const ddf = o.f - st.f, ddr = o.r - st.r, d = Math.hypot(ddf, ddr); if (d < 16) want += (Math.atan2(ddr, ddf) > st.hd ? -1 : 1) * .3 * (1 - d / 16); });
      { const d0 = Math.hypot(st.f, st.r); if (d0 < 9) want += (Math.atan2(-st.r, -st.f) > st.hd ? -1 : 1) * .6 * (1 - d0 / 9); }
      st.hd += clamp(wrapA(want - st.hd), -.35 * dt, .35 * dt);
      const twa = Math.abs(wrapA(st.hd)) * R2D;
      st.spin += ((twa > 112 ? 1 : 0) - st.spin) * Math.min(1, dt * .3);
      const vt = polar(twa, st.spin > .5) * KN * st.b.skill;
      st.v += (vt - st.v) * Math.min(1, dt / 6);
      st.f += Math.cos(st.hd) * st.v * dt; st.r += Math.sin(st.hd) * st.v * dt;
      if (dist < L.rad) { st.leg = (st.leg + 1) % RLEGS.length; if (st.leg === 0) st.laps++; if (L.id === "W2" && Math.hypot(st.f, st.r) < 30) try { winch(); } catch (e) {} }
      /* megjelenítés (a regatta világ hajóival azonos módon) */
      const p = RP(st.f, st.r, _rv), dirW = RP(Math.cos(st.hd), Math.sin(st.hd), _rv2);
      st.g.position.set(p.x, Math.sin(t * 1.7 + st.ph) * .05, p.z);
      st.g.rotation.y = Math.atan2(dirW.x, dirW.z);
      const S = st.g.userData.S, yaw = st.g.rotation.y, X = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      S.side = RF.dot(X) > 0 ? -1 : 1;
      S.boom = clamp((twa - 28) * .78, 7, 82) * D2R * S.side; S.jib = clamp((twa - 28) * .55, 8, 52) * D2R; S.luff = clamp(1 - (twa - 18) / 18, 0, 1); S.spin = st.spin;
      const heel = clamp(Math.sin(clamp(twa, 0, 180) * D2R) ** 1.4 * (st.v / 3.4) * 20 * (1 - st.spin * .6), 0, 24) * D2R;
      S.heel = -S.side * heel; S.pitch = Math.sin(t * 1.3 + st.ph) * .025;
      /* távol (> 140 m) ritkábban frissítjük a vitorlákat – Quest 2-n sokat számít */
      const far = Math.hypot(st.f, st.r) > 140; st.uT = (st.uT || 0) + dt; if (!far || st.uT > .2) { st.g.userData.update(st.uT); st.uT = 0; }
      st.wk.push(p.x, p.z, Math.atan2(dirW.x, dirW.z), st.v, dt, .04);
    });
    /* zászlók lobogása, habgyűrű */
    (BJ.flags || []).forEach((F) => { const a = F.geo.attributes.position.array, b = F.base; for (let i = 0; i < a.length; i += 3) { const u = b[i] / F.w; a[i + 2] = b[i + 2] + Math.sin(t * 6.5 - b[i] * 5 + F.ph) * .1 * u + Math.sin(t * 11 - b[i] * 9) * .025 * u; a[i + 1] = b[i + 1] - u * u * .05; } F.geo.attributes.position.needsUpdate = true; });
    if (BJ.foam) { BJ.foam.material.opacity = .45 + .25 * Math.sin(t * 1.3); BJ.foam.material.map.offset.x = t * .01; }
  }

  /* ------------------------------------------------------------------ JELENETEK – a stégjáték kis regattájának eseményei életnagyságban */
  /* közös segédek: hangok (távolság szerint halkítva), füst, habgyűrűk */
  function evAudio() { const a = T.ac && T.ac(); return a && a.state !== "closed" ? a : null; }
  function loopSnd(kind) {   /* folyamatos hang: rotor, motor, propeller, sziréna; set(hangerő, sebesség) */
    const a = evAudio(); if (!a) return { set() {}, stop() {} };
    const out = T.outBus(), g = a.createGain(); g.gain.value = 0; g.connect(out);
    let src, lfo, nodes = [];
    if (kind === "rotor") { src = a.createBufferSource(); src.buffer = T.noiseBuf(4); src.loop = true; const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 380; const am = a.createGain(); am.gain.value = .5;
      lfo = a.createOscillator(); lfo.frequency.value = 17; const lg = a.createGain(); lg.gain.value = .5; lfo.connect(lg).connect(am.gain); src.connect(f).connect(am).connect(g); src.start(); lfo.start(); nodes = [src, lfo]; }
    else if (kind === "engine" || kind === "prop") { const o1 = a.createOscillator(), o2 = a.createOscillator(); o1.type = "sawtooth"; o2.type = "square"; o1.frequency.value = kind === "prop" ? 92 : 58; o2.frequency.value = kind === "prop" ? 46 : 87;
      const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = kind === "prop" ? 900 : 520; const m2 = a.createGain(); m2.gain.value = .25; o1.connect(f); o2.connect(m2).connect(f); f.connect(g); o1.start(); o2.start(); nodes = [o1, o2]; src = { o1, o2 }; }
    else if (kind === "siren") { const o = a.createOscillator(); o.type = "triangle"; o.frequency.value = 700; lfo = a.createOscillator(); lfo.type = "square"; lfo.frequency.value = .9; const lg = a.createGain(); lg.gain.value = 160; lfo.connect(lg).connect(o.frequency); o.connect(g); o.start(); lfo.start(); nodes = [o, lfo]; }
    return { set(v, rate) { try { g.gain.setTargetAtTime(Math.max(0, v), a.currentTime, .15); if (src && src.o1 && rate) { src.o1.frequency.setTargetAtTime((kind === "prop" ? 92 : 58) * rate, a.currentTime, .2); src.o2.frequency.setTargetAtTime((kind === "prop" ? 46 : 87) * rate, a.currentTime, .2); } } catch (e) {} },
      stop() { try { g.gain.setTargetAtTime(0, a.currentTime, .3); setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch (e) {} }); try { g.disconnect(); } catch (e) {} }, 1500); } catch (e) {} } };
  }
  function boom(vol, freq, dur) {   /* robaj / csobbanás / ütközés: szűrt zajlöket */
    const a = evAudio(); if (!a) return; const t0 = a.currentTime, s = a.createBufferSource(); s.buffer = T.noiseBuf(dur || 1.5); const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq || 400; const g = a.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol || .3, t0 + .02); g.gain.exponentialRampToValueAtTime(.001, t0 + (dur || 1.5)); s.connect(f).connect(g).connect(T.outBus()); s.start(); s.stop(t0 + (dur || 1.5) + .1);
  }
  function roar(vol) {   /* a szörny üvöltése: mély, recsegő fűrészfog + zaj, lefelé hajló hangmagasság */
    const a = evAudio(); if (!a) return; const t0 = a.currentTime, g = a.createGain(), f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700; f.Q.value = 4;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol || .3, t0 + .25); g.gain.setValueAtTime(vol || .3, t0 + 1.6); g.gain.exponentialRampToValueAtTime(.001, t0 + 2.6);
    [70, 73.5, 104].forEach((fq) => { const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(fq * 1.4, t0); o.frequency.exponentialRampToValueAtTime(fq * .7, t0 + 2.4); o.connect(f); o.start(t0); o.stop(t0 + 2.7); });
    f.frequency.setValueAtTime(1300, t0); f.frequency.exponentialRampToValueAtTime(350, t0 + 2.4); f.connect(g).connect(T.outBus()); boom((vol || .3) * .5, 900, 2.2);
  }
  function deepHorn(dur, vol, f0) {   /* óceánjáró / gőzös gőzkürtje */
    const a = evAudio(); if (!a) return; const t0 = a.currentTime, g = a.createGain(), lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 800;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .3); g.gain.setValueAtTime(vol, t0 + dur - .4); g.gain.linearRampToValueAtTime(0, t0 + dur);
    [f0, f0 * 1.26, f0 * 1.5].forEach((fq, i) => { const o = a.createOscillator(); o.type = i ? "sawtooth" : "square"; o.frequency.value = fq; const og = a.createGain(); og.gain.value = i === 2 ? .2 : .4; o.connect(og).connect(lp); o.start(t0); o.stop(t0 + dur + .1); });
    lp.connect(g).connect(T.outBus());
  }
  const distVol = (p, k) => { const hw = ENV.site.worldToLocal(headWorld(new THREE.Vector3())); return clamp(k / Math.max(8, hw.distanceTo(p)), 0, 1); };
  /* füst: puha, átlátszó gömbsprite-ok (közös készlet) */
  function smokePool(parent, n, col) {
    const tex = canvasTex(64, 64, (gg) => { const gr = gg.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,.85)"); gr.addColorStop(1, "rgba(255,255,255,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64); });
    const list = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(basic({ map: tex, transparent: true, depthWrite: false, color: col || "#5a5a5a", opacity: 0, fog: true })); s.visible = false; parent.add(s); list.push({ s, t: 99, v: new THREE.Vector3() }); }
    let k = 0;
    return { emit(p, v, size) { const q = list[k++ % n]; q.s.position.copy(p); q.v.copy(v); q.t = 0; q.size = size || 2; q.s.visible = true; },
      tick(dt) { list.forEach((q) => { if (q.t > 8) { q.s.visible = false; return; } q.t += dt; q.s.position.addScaledVector(q.v, dt); q.v.multiplyScalar(1 - dt * .15); const k2 = q.t / 8; q.s.material.opacity = (1 - k2) * .55; q.s.scale.setScalar(q.size * (1 + q.t * .8)); }); },
      clear() { list.forEach((q) => { q.t = 99; q.s.visible = false; }); } };
  }
  /* habgyűrűk a vízen (csobbanás, buborék, rotorszél) */
  function ringPool(parent, n) {
    const tex = canvasTex(128, 128, (gg) => { gg.strokeStyle = "rgba(255,255,255,.9)"; gg.lineWidth = 9; gg.beginPath(); gg.arc(64, 64, 52, 0, TAU); gg.stroke(); gg.lineWidth = 3; gg.beginPath(); gg.arc(64, 64, 40, 0, TAU); gg.stroke(); });
    const list = []; for (let i = 0; i < n; i++) { const m = mesh(new THREE.PlaneGeometry(1, 1), basic({ map: tex, transparent: true, depthWrite: false, opacity: 0 }), parent); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; list.push({ m, t: 99 }); }
    let k = 0;
    return { emit(x, z, size, life) { const q = list[k++ % n]; q.m.position.set(x, .04, z); q.t = 0; q.size = size || 2; q.life = life || 3; q.m.visible = true; },
      tick(dt) { list.forEach((q) => { if (q.t > q.life) { q.m.visible = false; return; } q.t += dt; const k2 = q.t / q.life; q.m.scale.setScalar(q.size * (1 + k2 * 3)); q.m.material.opacity = (1 - k2) * .8; }); } };
  }
  /* egyszerű, színezett csúcsszínes összevonás egy csoportba (kevés rajzolási hívás) */
  function vcGroup(parts, parent, opt) {
    const by = {};
    parts.forEach(([geo, col, m4, key]) => { const c = new THREE.Color(col), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } geo.setAttribute("color", new THREE.BufferAttribute(a, 3)); (by[key || "s"] = by[key || "s"] || []).push([geo, m4 || new THREE.Matrix4()]); });
    const out = {};
    Object.keys(by).forEach((k) => { const mat = std(Object.assign({ vertexColors: true, roughness: k === "m" ? .3 : .6, metalness: k === "m" ? .6 : 0 }, k === "e" ? { emissive: new THREE.Color("#ffd27a"), emissiveIntensity: 0 } : {}, opt || {})); const m = mesh(mergeGeoms(by[k]), mat, parent); m.castShadow = k !== "e"; out[k] = m; });
    return out;
  }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), CY = (r1, r2, h, s) => new THREE.CylinderGeometry(r1, r2, h, s || 12);

  /* ---------- 1. A Titanic és a jéghegy ---------- */
  function evTitanic() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const ship = new THREE.Group(); root.add(ship);
    const L = 64, B = 7.2, parts = [];
    /* hajótest: hegyes orr, kerek tat – a vízvonal alatt vörös, fölötte fekete, fehér és arany díszcsík */
    const hullShape = (w) => { const s = new THREE.Shape(); s.moveTo(-L / 2 + 3, -w); s.lineTo(L / 2 - 9, -w); s.quadraticCurveTo(L / 2 - 1, -w * .7, L / 2 + 1.5, 0); s.quadraticCurveTo(L / 2 - 1, w * .7, L / 2 - 9, w); s.lineTo(-L / 2 + 3, w); s.quadraticCurveTo(-L / 2 - 1, w, -L / 2 - 1, 0); s.quadraticCurveTo(-L / 2 - 1, -w, -L / 2 + 3, -w); return s; };
    const ext = (w, h, y, col, key) => { const geo = new THREE.ExtrudeGeometry(hullShape(w), { depth: h, bevelEnabled: false, curveSegments: 10 }); geo.rotateX(-Math.PI / 2); geo.translate(0, y, 0); parts.push([geo, col, null, key]); };
    ext(B / 2 - .5, 2.4, -3.2, "#8e1b16"); ext(B / 2, 4.4, -.8, "#16181b"); ext(B / 2 + .02, .22, 3.3, "#f4f1e6"); ext(B / 2 + .025, .1, 2.8, "#c9a54a");
    /* felépítmény (két fedélzet ablakokkal), parancsnoki híd, mentőcsónakok a daru alatt */
    parts.push([BX(L * .66, 2.4, B - 1.4), "#f4f1e6", M4(-1, 4.8, 0)], [BX(L * .52, 2.0, B - 2.2), "#f1ece0", M4(-2, 7.0, 0)], [BX(5.5, 1.6, B - 1.6), "#f4f1e6", M4(L * .3, 7.0, 0)]);
    parts.push([BX(L * .67, .14, B - 1.2), "#8a5a32", M4(-1, 6.05, 0)], [BX(L * .53, .14, B - 2.0), "#8a5a32", M4(-2, 8.05, 0)]);
    const boatsP = []; [-18, -11, -4, 3, 10, 17].forEach((x, i) => [-1, 1].forEach((s) => { boatsP.push(new THREE.Vector3(x, 8.6, s * (B / 2 - .8))); parts.push([BX(4.2, .7, 1.3), "#f7f7f2", M4(x, 8.6, s * (B / 2 - .8))], [BX(.1, 1.4, .1), "#3a3d42", M4(x - 1.6, 8.9, s * (B / 2 - .4)), "m"], [BX(.1, 1.4, .1), "#3a3d42", M4(x + 1.6, 8.9, s * (B / 2 - .4)), "m"]); }));
    /* négy hátradöntött kémény (drapp, fekete perem) */
    const funnels = [-14, -4.5, 5, 14.5]; funnels.forEach((x) => { parts.push([CY(1.25, 1.35, 7.5, 18), "#d99a3a", M4(x, 11.5, 0, 0, 0, .1)], [CY(1.3, 1.3, 1.2, 18), "#121316", M4(x - .36, 15.3, 0, 0, 0, .1)]); });
    /* árbocok, kötélzet */
    parts.push([CY(.12, .16, 22, 6), "#5b3a22", M4(L * .36, 13, 0)], [CY(.12, .16, 20, 6), "#5b3a22", M4(-L * .38, 11, 0)]);
    [[L / 2 + 1.5, 3.4, L * .36, 23.5], [L * .36, 23.5, -L * .38, 20.5], [-L * .38, 20.5, -L / 2, 3.4]].forEach(([x0, y0, x1, y1]) => { const [gg, mm] = rodGeom(new THREE.Vector3(x0, y0, 0), new THREE.Vector3(x1, y1, 0), .03, 4); parts.push([gg.applyMatrix4(mm), "#c8c8c8"]); });
    const M = vcGroup(parts, ship);
    /* ablaksorok (éjjel világítanak): egy csíkos textúra a fekete testen és a felépítményen */
    const winT = canvasTex(1024, 64, (gg, w, h) => { gg.clearRect(0, 0, w, h); for (let r = 0; r < 2; r++) for (let x = 6; x < w; x += 15) { gg.fillStyle = "#ffe08a"; gg.beginPath(); gg.arc(x, 18 + r * 26, 4.5, 0, TAU); gg.fill(); } });
    const winM = basic({ map: winT, transparent: true, depthWrite: false, color: "#6a5a3a" });
    [-1, 1].forEach((s) => { const w = mesh(new THREE.PlaneGeometry(L - 10, 1.8), winM, ship); w.position.set(-1, 1.5, s * (B / 2 + .03)); w.rotation.y = s > 0 ? 0 : Math.PI; const w2 = mesh(new THREE.PlaneGeometry(L * .64, 1.3), winM, ship); w2.position.set(-1, 4.9, s * (B / 2 - .68)); w2.rotation.y = s > 0 ? 0 : Math.PI; });
    const nameT = canvasTex(512, 96, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = "#e0c060"; gg.font = "800 64px Georgia, serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("TITANIC", w / 2, h / 2); });
    [-1, 1].forEach((s) => { const n = mesh(new THREE.PlaneGeometry(6, 1.1), basic({ map: nameT, transparent: true, depthWrite: false }), ship); n.position.set(L / 2 - 6, 2.4, s * (B / 2 - .3)); n.rotation.y = s > 0 ? -.12 : Math.PI + .12; });
    /* a jéghegy: zajjal torzított, kékesfehér, csillogó test (a víz alatti része sötétebb) */
    const ig = new THREE.IcosahedronGeometry(1, 3); { const p = ig.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const n = 1 + .28 * Math.sin(v.x * 5 + v.y * 3) + .18 * Math.sin(v.z * 7 - v.y * 4) + .12 * Math.sin(v.x * 13); v.multiplyScalar(n); v.y = v.y > 0 ? v.y * 1.6 : v.y * .9; p.setXYZ(i, v.x, v.y, v.z); } ig.computeVertexNormals(); }
    const berg = mesh(ig, std({ color: "#eaf6fb", roughness: .25, metalness: .05, flatShading: true, emissive: new THREE.Color("#9fd6ee"), emissiveIntensity: .12 }), root); berg.scale.set(9, 8, 7); berg.castShadow = true;
    const berg2 = mesh(ig, std({ color: "#d6eef8", roughness: .3, flatShading: true }), root); berg2.scale.set(4, 3.5, 4);
    const smoke = smokePool(root, 50, "#4a4a4a"), rings = ringPool(root, 10);
    const lifeboats = boatsP.slice(0, 8).map((p) => { const b = new THREE.Group(); root.add(b); vcGroup([[BX(4.2, .7, 1.4), "#f7f7f2"], [BX(4.25, .12, 1.45), "#c0392b", M4(0, .2, 0)], [BX(.5, .5, .5), "#ff8a3a", M4(-.8, .55, 0)], [BX(.5, .5, .5), "#3a5ca8", M4(.4, .55, 0)], [BX(.5, .5, .5), "#e8e2cf", M4(1.4, .55, 0)]], b); b.visible = false; return { g: b, p0: p, v: new THREE.Vector3() }; });
    /* útvonal: balról jobbra, 170 m-re előttünk; a jéghegy az út közepén */
    const F0 = -175, RB = 25;
    const st = { t: 0, x: -300, phase: "sail", hit: 0, sink: 0, lit: 0 };
    root.userData.tip = ["🚢 Titanic", "Jéghegy előttünk!"];
    return { name: "A Titanic és a jéghegy", root,
      start() { st.t = 0; st.x = -320; st.phase = "sail"; st.sink = 0; st.hit = 0; root.visible = true; ship.rotation.set(0, 0, 0); ship.position.set(0, 0, 0); lifeboats.forEach((q) => { q.g.visible = false; }); berg.position.copy(RP(F0 - 6, RB + 2)); berg.position.y = -14; berg2.position.copy(RP(F0 - 9, RB + 10)); berg2.position.y = -8; smoke.clear(); deepHorn(3.2, .16, 78); },
      tick(dt) {
        st.t += dt; const bp = RP(F0, 0);
        /* a jéghegy előbukkan a ködből */
        berg.position.y += (-1.2 - berg.position.y) * Math.min(1, dt * .25); berg2.position.y += (-.8 - berg2.position.y) * Math.min(1, dt * .25); berg.rotation.y += dt * .01;
        if (st.phase === "sail") { st.x += 7.5 * dt; if (st.x > RB - L / 2 - 3) { st.phase = "hit"; st.hit = 0; boom(.5, 260, 3.5); setTimeout(() => boom(.35, 600, 2.4), 400); } }
        else if (st.phase === "hit") { st.hit += dt; st.x += Math.max(0, 7.5 - st.hit * 2.2) * dt; if (st.hit > 6) { st.phase = "sink"; deepHorn(2.4, .12, 74); } }
        else if (st.phase === "sink") {
          st.sink += dt;
          /* orr-előre süllyed: dőlés, majd a tat a magasba emelkedik, végül eltűnik */
          const k = clamp(st.sink / 70, 0, 1);
          ship.rotation.z = -smooth(clamp(k * 1.3, 0, 1)) * .42; ship.rotation.x = Math.sin(st.sink * .3) * .02 + k * .06;
          ship.position.y = -smooth(clamp((k - .55) / .45, 0, 1)) * 34 - k * 3;
          lifeboats.forEach((q, i) => { const tl = st.sink - 4 - i * 2.2; if (tl < 0) return; if (!q.g.visible) { q.g.visible = true; q.g.position.copy(q.p0).applyMatrix4(ship.matrixWorld); root.worldToLocal(q.g.position); q.v.set(0, 0, Math.sign(q.p0.z) * 2.2); }
            q.g.position.y += (0 - q.g.position.y) * Math.min(1, dt * .9); q.g.position.addScaledVector(q.v, dt * clamp((tl - 2) / 3, 0, 1)); q.g.rotation.z = Math.sin(st.t * 1.4 + i) * .05; q.g.rotation.y = Math.PI / 2; });
          if (Math.random() < dt * 6 && ship.position.y > -20) { const p = RP(F0, st.x + rr(-L / 2, 0)); rings.emit(p.x, p.z, rr(2, 5), 4); }
          if (st.sink > 80) { root.visible = false; return false; }
        }
        ship.position.x = 0; const p = RP(F0, st.x); ship.position.set(p.x, ship.position.y, p.z); ship.rotation.y = Math.atan2(RRv.x, RRv.z) - Math.PI / 2;
        /* füst a kéményekből, amíg a gépek járnak */
        if (st.phase !== "sink" || st.sink < 18) { st.sm = (st.sm || 0) + dt; if (st.sm > .22) { st.sm = 0; ship.updateMatrixWorld(true); funnels.forEach((fx) => { const q = new THREE.Vector3(fx - .5, 16.2, 0).applyMatrix4(ship.matrixWorld); root.worldToLocal(q); smoke.emit(q, new THREE.Vector3(rr(-.4, .4), 1.6, 1.2), 2.6); }); } }
        smoke.tick(dt); rings.tick(dt);
        /* esti fények: az ablakok világítanak, süllyedéskor pislákolnak, majd kialszanak */
        const ev = ENV.evening || 0, out = st.phase === "sink" && st.sink > 40 ? 0 : st.phase === "sink" && st.sink > 30 ? (Math.random() < .5 ? 1 : .2) : 1;
        winM.color.setRGB(.42 + ev * .58 * out, .36 + ev * .52 * out, .24 + ev * .3 * out);
        return true;
      } };
  }

  /* ---------- 2. Tengeri szörny ---------- */
  function evMonster() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const N = 34, segs = [];
    const scaleT = canvasTex(256, 256, (gg, w, h) => { const gr = gg.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1f4a33"); gr.addColorStop(.6, "#3f8f5a"); gr.addColorStop(1, "#d9e8a0"); gg.fillStyle = gr; gg.fillRect(0, 0, w, h);
      gg.strokeStyle = "rgba(10,40,25,.45)"; gg.lineWidth = 2; for (let y = 0; y < h; y += 14) for (let x = 0; x < w; x += 16) { gg.beginPath(); gg.arc(x + ((y / 14) % 2) * 8, y, 8, 0, Math.PI); gg.stroke(); } });
    const skin = std({ map: scaleT, roughness: .4, metalness: .1 }), spineM = std({ color: "#c9e06a", roughness: .5 }), finM = std({ color: "#2f6a48", roughness: .5, side: THREE.DoubleSide, transparent: true, opacity: .9 });
    for (let i = 0; i < N; i++) { const k = i / (N - 1), r = .55 + Math.sin(Math.min(1, k * 1.15 + .12) * Math.PI) * 1.05 * (1 - k * .55);
      const s = new THREE.Group(); root.add(s); const b = mesh(new THREE.SphereGeometry(r, 16, 12), skin, s); b.scale.set(1, .92, 1.5); b.castShadow = true;
      if (i > 0 && i < N - 2 && i % 2 === 0) { const sp = mesh(new THREE.ConeGeometry(r * .28, r * 1.1, 6), spineM, s); sp.position.y = r * .95; sp.rotation.x = -.45; }
      if (i === 5 || i === 13) [-1, 1].forEach((sd) => { const f = mesh(new THREE.CircleGeometry(r * 1.2, 10, 0, Math.PI), finM, s); f.position.set(sd * r * .9, -.1, 0); f.rotation.set(0, sd * Math.PI / 2, -sd * .6); });
      segs.push({ g: s, r }); }
    /* fej: hosszúkás koponya, nyitható állkapocs, szarvak, világító szemek, fogak */
    const head = new THREE.Group(); root.add(head);
    const skull = mesh(new THREE.SphereGeometry(1.1, 18, 14), skin, head); skull.scale.set(1.15, .9, 1.9); skull.position.z = .9; head.scale.setScalar(1.35);
    /* gallér: tüskés fodor a fej mögött */ for (let k = 0; k < 9; k++) { const a = (k / 8 - .5) * 2.6; const fr = mesh(new THREE.ConeGeometry(.16, 1.1, 5), finM, head); fr.position.set(Math.sin(a) * 1.0, .2 + Math.cos(a) * .7, -.3); fr.rotation.set(-1.2, 0, -a * .9); }
    const jaw = new THREE.Group(); head.add(jaw); jaw.position.set(0, -.35, .2); const jm = mesh(new THREE.SphereGeometry(.95, 16, 10), skin, jaw); jm.scale.set(.9, .45, 1.7); jm.position.z = .9;
    const toothM = std({ color: "#f6f1df", roughness: .4 }); for (let k = 0; k < 12; k++) { const a = (k / 11 - .5) * 2.2; const tt = mesh(new THREE.ConeGeometry(.07, .3, 5), toothM, head); tt.position.set(Math.sin(a) * .75, -.32, .9 + Math.cos(a) * 1.25); tt.rotation.x = Math.PI; }
    const eyeM = std({ color: "#ffe14a", emissive: new THREE.Color("#ffb400"), emissiveIntensity: 1.6, roughness: .2 }); [-1, 1].forEach((sd) => { const e = mesh(new THREE.SphereGeometry(.2, 12, 10), eyeM, head); e.position.set(sd * .62, .38, 1.6); const pu = mesh(new THREE.SphereGeometry(.08, 8, 6), std({ color: "#111" }), head); pu.position.set(sd * .68, .4, 1.76); pu.scale.set(.5, 1.4, .5);
      const horn = mesh(new THREE.ConeGeometry(.16, 1.1, 8), toothM, head); horn.position.set(sd * .45, .9, .2); horn.rotation.set(-.9, 0, -sd * .3); });
    const rings = ringPool(root, 14);
    const st = { t: 0 }; let hist = [];
    root.userData.tip = ["🐉 Tengeri szörny", "Állítólag a Balaton mélyén él…"];
    return { name: "Tengeri szörny", root,
      start() { st.t = 0; root.visible = true; hist = []; st.roared = false; st.a0 = rand() < .5 ? -1 : 1; },
      tick(dt) {
        st.t += dt; const T0 = 46, k = st.t / T0;
        /* ív a bója körül 38 m-en, balról jobbra (vagy fordítva); középen felemelkedik és ránk néz */
        const ang = st.a0 * (-1.1 + k * 2.2), R = 38 - Math.sin(k * Math.PI) * 8, hx = Math.sin(ang) * R, hz = -Math.cos(ang) * R;
        const rise = smooth(clamp((st.t - 18) / 4, 0, 1)) * (1 - smooth(clamp((st.t - 30) / 4, 0, 1)));
        const dive = smooth(clamp((st.t - T0 + 7) / 6, 0, 1)), emerge = smooth(clamp(st.t / 4, 0, 1));
        const hy = -2.5 + emerge * 2.6 - dive * 6 + rise * 5.5 + Math.sin(st.t * 1.2) * .3;
        hist.unshift(new THREE.Vector3(hx, hy, hz)); if (hist.length > 600) hist.pop();
        head.position.set(hx, hy + .3, hz);
        const nxt = hist[6] || hist[hist.length - 1]; const dir = new THREE.Vector3(hx - nxt.x, 0, hz - nxt.z); if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
        const yawMove = Math.atan2(dir.x, dir.z), toUser = Math.atan2(-hx, -hz);
        head.rotation.y = yawMove + wrapA(toUser - yawMove) * rise; head.rotation.x = -rise * .25 + Math.sin(st.t * 2) * .05;
        jaw.rotation.x = rise * (.35 + .25 * Math.max(0, Math.sin(st.t * 3))) ;
        if (rise > .8 && !st.roared) { st.roared = true; roar(.35 * distVol(head.position, 30)); rings.emit(hx, hz, 4, 4); }
        /* a test a fej útját követi, púpokban ki-be bukva a vízből */
        segs.forEach((s, i) => { const idx = Math.min(hist.length - 1, 6 + i * 3); const p = hist[idx]; const p2 = hist[Math.min(hist.length - 1, idx + 4)];
          const hump = Math.sin(st.t * 1.6 - i * .32) * 1.35 - .3 - dive * 4 * clamp(1 - i / N + dive, 0, 1) + emerge * .2 - (1 - emerge) * 3;
          s.g.position.set(p.x, Math.min(p.y, 0) * (i < 6 ? .8 : 0) + hump + (i < 6 ? rise * (4.6 - i * .8) : 0), p.z);
          s.g.lookAt(p2.x, s.g.position.y, p2.z); s.g.rotateY(Math.PI);
          if (Math.abs(s.g.position.y) < s.r * .6 && Math.random() < dt * 1.5) rings.emit(p.x, p.z, s.r * 1.6, 2.5); });
        rings.tick(dt);
        if (st.t > T0) { root.visible = false; return false; }
        return true;
      } };
  }

  /* ---------- 3. Mentőhelikopter: egy borult hajós kimentése ---------- */
  function evHeli() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const heli = new THREE.Group(); root.add(heli);
    const red = "#d6261f", wht = "#f4f4f2", dk = "#22262c";
    const parts = [[new THREE.SphereGeometry(1.4, 18, 12).scale(1, .9, 2), red], [BX(2.1, .5, 3), wht, M4(0, -.6, .3)], [new THREE.CylinderGeometry(.42, .2, 6.5, 10).rotateX(Math.PI / 2), red, M4(0, .35, -4.4)],
      [BX(.12, 1.5, 1), red, M4(.15, 1.05, -7.6)], [BX(1.8, .12, .6), wht, M4(0, .5, -6.9)], [CY(.2, .2, .7, 10), dk, M4(0, 1.45, 0), "m"],
      [new THREE.CylinderGeometry(.06, .06, 3.4, 6).rotateX(Math.PI / 2), dk, M4(-1.0, -1.45, .2), "m"], [new THREE.CylinderGeometry(.06, .06, 3.4, 6).rotateX(Math.PI / 2), dk, M4(1.0, -1.45, .2), "m"],
      [BX(.06, .7, .06), dk, M4(-1, -1.1, 1), "m"], [BX(.06, .7, .06), dk, M4(1, -1.1, 1), "m"], [BX(.06, .7, .06), dk, M4(-1, -1.1, -.7), "m"], [BX(.06, .7, .06), dk, M4(1, -1.1, -.7), "m"], [BX(.5, .25, .5), "#ffd166", M4(1.35, .3, .6)]];
    vcGroup(parts, heli);
    const glass = mesh(new THREE.SphereGeometry(1.25, 16, 10, 0, TAU, 0, Math.PI / 2).scale(1, .9, 1.4), std({ color: "#1d2a36", roughness: .05, metalness: .6 }), heli); glass.position.set(0, .05, 1.1); glass.rotation.x = .5;
    const sideT = canvasTex(256, 64, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = "#fff"; gg.font = "900 40px system-ui, sans-serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("MENTŐ", w / 2, h / 2 + 2); });
    [-1, 1].forEach((sd) => { const p = mesh(new THREE.PlaneGeometry(2.2, .55), basic({ map: sideT, transparent: true, depthWrite: false }), heli); p.position.set(sd * 1.42, .1, -.6); p.rotation.y = sd * Math.PI / 2; });
    const rotor = new THREE.Group(); heli.add(rotor); rotor.position.y = 1.85; const bladeM = std({ color: "#2a2e33", roughness: .5, metalness: .4 });
    [0, 1, 2, 3].forEach((k) => { const b = mesh(BX(5.4, .05, .3), bladeM, rotor); b.position.x = 2.7; const pv = new THREE.Group(); rotor.add(pv); pv.add(b); pv.rotation.y = k * Math.PI / 2; });
    const blur = mesh(new THREE.CircleGeometry(5.4, 40), basic({ color: "#222", transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide }), rotor); blur.rotation.x = -Math.PI / 2;
    const trot = new THREE.Group(); heli.add(trot); trot.position.set(.25, 1.2, -7.8); [0, 1].forEach((k) => { const b = mesh(BX(.05, 1.4, .12), bladeM, trot); b.rotation.x = k * Math.PI / 2; });
    const cable = mesh(CY(.02, .02, 1, 5), std({ color: "#cfd3d6", metalness: .7, roughness: .3 }), heli); cable.position.set(1.35, -.2, .6); cable.geometry.translate(0, -.5, 0);
    const person = new THREE.Group(); root.add(person); vcGroup([[CY(.18, .2, .55, 10), "#ff6a1a", M4(0, .55, 0)], [new THREE.SphereGeometry(.13, 10, 8), "#e8c8a8", M4(0, .95, 0)], [CY(.07, .07, .5, 6), "#1f3a6a", M4(-.1, .05, 0)], [CY(.07, .07, .5, 6), "#1f3a6a", M4(.1, .05, 0)], [CY(.05, .05, .5, 6), "#ff6a1a", M4(-.3, .8, 0, 0, 0, .8)], [CY(.05, .05, .5, 6), "#ff6a1a", M4(.3, .8, 0, 0, 0, -.8)]], person);
    /* a borult kis dingi (fenékkel felfelé) */
    const dinghy = new THREE.Group(); root.add(dinghy); vcGroup([[new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2).scale(1.1, .45, 2.1), "#f4f4f0"], [BX(.1, .05, 3.6), "#1f5fa8", M4(0, .44, 0)]], dinghy);
    const snd = { r: null }, rings = ringPool(root, 14);
    const P0 = RP(-48, -22), st = { t: 0 };
    root.userData.tip = ["🚁 Mentőhelikopter", "Egy borult dingi vitorlázóját menti"];
    return { name: "Mentőhelikopter", root,
      start() { st.t = 0; root.visible = true; snd.r = loopSnd("rotor"); dinghy.position.set(P0.x, .1, P0.z); person.position.set(P0.x + 1.1, -.55, P0.z); person.rotation.set(0, 0, 0); },
      tick(dt) {
        st.t += dt; const t2 = st.t;
        rotor.rotation.y += dt * 28; trot.rotation.x += dt * 40; dinghy.rotation.z = Math.sin(t2 * 1.1) * .06;
        const far = new THREE.Vector3(P0.x - 260, 70, P0.z - 380), hov = new THREE.Vector3(P0.x - 1.35, 16, P0.z), away = new THREE.Vector3(P0.x + 420, 90, P0.z + 160);
        let pos, k;
        if (t2 < 24) { k = smooth(t2 / 24); pos = far.clone().lerp(hov, k); heli.rotation.set(-.12 * (1 - k), Math.atan2(hov.x - far.x, hov.z - far.z), 0); }
        else if (t2 < 58) { pos = hov.clone(); pos.y += Math.sin(t2 * .9) * .25; heli.rotation.x = Math.sin(t2 * .7) * .02; }
        else { k = smooth(clamp((t2 - 58) / 26, 0, 1)); pos = hov.clone().lerp(away, k); heli.rotation.set(-.2 * Math.min(1, k * 4), heli.rotation.y + wrapA(Math.atan2(away.x - hov.x, away.z - hov.z) - heli.rotation.y) * Math.min(1, dt * .8), 0); }
        heli.position.copy(pos);
        /* csörlő: leereszt (24–34), a hajós beköti magát (34–38), felhúzza (38–52) */
        let L = 0; if (t2 > 24 && t2 < 34) L = (t2 - 24) / 10 * 16.3; else if (t2 >= 34 && t2 < 38) L = 16.3; else if (t2 >= 38 && t2 < 52) L = 16.3 * (1 - (t2 - 38) / 14);
        cable.scale.y = Math.max(.01, L); cable.visible = L > .05;
        const hook = new THREE.Vector3(1.35, -.2 - L, .6).applyMatrix4(heli.matrixWorld); root.worldToLocal(hook);
        if (t2 < 34) { person.position.y = -.55 + Math.sin(t2 * 1.6) * .05; person.rotation.z = Math.sin(t2 * 4) * .25; }
        else if (t2 < 53) { person.position.set(hook.x, hook.y - 1.0, hook.z); person.rotation.z = Math.sin(t2 * 1.5) * .1; }
        else { person.position.set(hook.x, hook.y - .8, hook.z); person.visible = t2 < 56; }
        if (t2 > 20 && t2 < 60 && Math.random() < dt * 10) { const a = rand() * TAU; rings.emit(P0.x + Math.cos(a) * rr(2, 7), P0.z + Math.sin(a) * rr(2, 7), rr(1.5, 3), 1.6); }
        rings.tick(dt);
        if (snd.r) snd.r.set(.22 * distVol(heli.position, 40));
        if (t2 > 86) { root.visible = false; person.visible = true; if (snd.r) snd.r.stop(); return false; }
        return true;
      }, stop() { if (snd.r) snd.r.stop(); } };
  }

  /* ---------- 4. Lapátkerekes gőzös (a balatoni „Kisfaludy” nyomán) ---------- */
  function evSteamer() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const ship = new THREE.Group(); root.add(ship);
    const L = 38, B = 6;
    const parts = [[BX(L, 2.2, B), "#f4f4f0", M4(0, .6, 0)], [BX(L + .1, .5, B + .1), "#1a1c20", M4(0, -.5, 0)], [BX(L * .1, 2.2, B * .7), "#f4f4f0", M4(L / 2 + .8, .6, 0, 0, 0, 0, 1, 1, .7)],
      [BX(L * .7, 2.2, B - 1), "#ece6d6", M4(-1, 2.8, 0)], [BX(L * .72, .15, B - .8), "#7a4a22", M4(-1, 3.95, 0)], [BX(L * .4, 1.8, B - 2.4), "#f4f4f0", M4(-3, 4.9, 0)], [BX(4, 1.6, B - 1.6), "#f4f4f0", M4(L * .3, 4.8, 0)],
      [CY(.9, 1, 6, 16), "#1a1c20", M4(2, 8.6, 0)], [CY(.95, .95, .8, 16), "#c62828", M4(2, 9.6, 0)], [CY(.12, .14, 12, 6), "#5b3a22", M4(L * .4, 7, 0)], [CY(.1, .12, 9, 6), "#5b3a22", M4(-L * .42, 5.5, 0)]];
    [-1, 1].forEach((sd) => parts.push([CY(3.1, 3.1, 1.6, 24).rotateX(Math.PI / 2), "#f4f4f0", M4(4, 1.6, sd * (B / 2 + .8))], [BX(6.4, .2, 1.8), "#c62828", M4(4, 1.4, sd * (B / 2 + .8))]));
    vcGroup(parts, ship);
    const wheels = [-1, 1].map((sd) => { const w = new THREE.Group(); ship.add(w); w.position.set(4, .4, sd * (B / 2 + .8)); for (let k = 0; k < 10; k++) { const p = mesh(BX(.18, 2.4, 1.3), std({ color: "#5a3b22", roughness: .8 }), w); p.position.y = 1.4; const pv = new THREE.Group(); w.add(pv); pv.add(p); pv.rotation.z = k / 10 * TAU; } return w; });
    const winT = canvasTex(512, 64, (gg, w, h) => { gg.clearRect(0, 0, w, h); for (let x = 8; x < w; x += 24) { gg.fillStyle = "#ffe08a"; gg.fillRect(x, 16, 14, 30); } });
    const winM = basic({ map: winT, transparent: true, depthWrite: false, color: "#5a6a7a" });
    [-1, 1].forEach((sd) => { const w = mesh(new THREE.PlaneGeometry(L * .66, 1.2), winM, ship); w.position.set(-1, 2.9, sd * ((B - 1) / 2 + .02)); w.rotation.y = sd > 0 ? 0 : Math.PI; });
    const nameT = canvasTex(512, 96, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = "#1f3a6a"; gg.font = "800 60px Georgia, serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("KISFALUDY", w / 2, h / 2); });
    [-1, 1].forEach((sd) => { const n = mesh(new THREE.PlaneGeometry(6, 1.1), basic({ map: nameT, transparent: true, depthWrite: false }), ship); n.position.set(4, 3.3, sd * (B / 2 + 1.62)); n.rotation.y = sd > 0 ? 0 : Math.PI; });
    /* zászló a taton */
    const fl = mesh(new THREE.PlaneGeometry(1.6, 1, 6, 1).translate(.8, 0, 0), std({ map: canvasTex(96, 64, (gg, w, h) => { ["#ce2939", "#ffffff", "#477050"].forEach((c, i) => { gg.fillStyle = c; gg.fillRect(0, i * h / 3, w, h / 3 + 1); }); }), side: THREE.DoubleSide }), ship); fl.position.set(-L * .42, 9.4, 0); fl.rotation.y = Math.PI;
    const smoke = smokePool(root, 40, "#3a3a3a"), wake = makeWake(root, 1.4);
    const st = { t: 0 };
    root.userData.tip = ["🛳 Kisfaludy lapátkerekes gőzös", "1888 óta járja a Balatont – dudál, ha elhalad"];
    return { name: "Lapátkerekes gőzös", root,
      start() { st.t = 0; st.x = 260; st.honk = 0; root.visible = true; smoke.clear(); },
      tick(dt) {
        st.t += dt; st.x -= 4.6 * dt; const p = RP(-105, st.x);
        ship.position.set(p.x, Math.sin(st.t * .8) * .06, p.z); ship.rotation.y = Math.atan2(-RRv.x, -RRv.z) - Math.PI / 2; ship.rotation.z = Math.sin(st.t * .6) * .01;
        wheels.forEach((w) => { w.rotation.z -= dt * 1.8; });
        st.sm = (st.sm || 0) + dt; if (st.sm > .3) { st.sm = 0; const q = new THREE.Vector3(2, 10.3, 0).applyMatrix4(ship.matrixWorld); root.worldToLocal(q); smoke.emit(q, new THREE.Vector3(rr(-.3, .3), 2.2, 1.0), 2.2); }
        smoke.tick(dt); wake.push(p.x, p.z, ship.rotation.y + Math.PI / 2, 4.6, dt, .04);
        if (Math.abs(st.x) < 12 && !st.honk) { st.honk = 1; deepHorn(1.6, .12, 196); setTimeout(() => deepHorn(2.4, .12, 196), 2100); }
        const ev = ENV.evening || 0; winM.color.setRGB(.35 + ev * .65, .42 + ev * .5, .48 + ev * .1);
        if (st.x < -270) { root.visible = false; return false; }
        return true;
      } };
  }

  /* ---------- 5. Rendőrmotoros szirénával ---------- */
  function evPolice() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const boat = new THREE.Group(); root.add(boat);
    const parts = [[BX(2.6, .8, 8), "#f4f4f2", M4(0, .2, 0)], [new THREE.ConeGeometry(1.3, 2.6, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).scale(1, .45, 1), "#f4f4f2", M4(0, .2, 5.2)], [BX(2.62, .26, 8.02), "#1f4fbf", M4(0, .35, 0)], [BX(2.62, .1, 8.02), "#ffd21f", M4(0, .55, 0)],
      [BX(1.8, 1.1, 2.2), "#f4f4f2", M4(0, 1.15, -.4)], [BX(1.84, .45, 1.8), "#1d2a36", M4(0, 1.35, -.2), "m"], [BX(1.2, .1, .3), "#2a2e33", M4(0, 1.75, -.4)], [BX(.5, .7, .5), "#2a2e33", M4(0, .6, -3.9), "m"]];
    vcGroup(parts, boat);
    const blueM = std({ color: "#3a6cff", emissive: new THREE.Color("#2f5bff"), emissiveIntensity: 0 }), redM = std({ color: "#ff3a3a", emissive: new THREE.Color("#ff2a2a"), emissiveIntensity: 0 });
    const lb = mesh(BX(.4, .16, .2), blueM, boat); lb.position.set(-.35, 1.85, -.4); const lr = mesh(BX(.4, .16, .2), blueM, boat); lr.position.set(.35, 1.85, -.4);
    const txt = canvasTex(512, 96, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = "#1f4fbf"; gg.font = "900 64px system-ui, sans-serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("RENDŐRSÉG", w / 2, h / 2); });
    [-1, 1].forEach((sd) => { const n = mesh(new THREE.PlaneGeometry(3.4, .64), basic({ map: txt, transparent: true, depthWrite: false }), boat); n.position.set(sd * 1.32, .85, 1.0); n.rotation.y = sd * Math.PI / 2; });
    const wake = makeWake(root, .9), rings = ringPool(root, 10); let sir = null; const st = { t: 0 };
    root.userData.tip = ["🚤 Vízirendőrség", "Valaki túl gyorsan ment a kikötő előtt…"];
    redM.dispose && 0;
    return { name: "Vízirendőrség", root,
      start() { st.t = 0; root.visible = true; sir = loopSnd("siren"); st.eng = loopSnd("engine"); st.s = rand() < .5 ? 1 : -1; },
      tick(dt) {
        st.t += dt; const T0 = 24, k = st.t / T0;
        /* ív: 30 m-re előttünk húz el, megdől a kanyarban, orra kiemelkedik */
        const a = st.s * (-1.4 + k * 2.8), R = 34 + Math.cos(k * Math.PI * 2) * 6, x = Math.sin(a) * R * 1.8, z = -Math.cos(a) * R - 6;
        const nx = Math.sin(a + st.s * .02) * R * 1.8, nz = -Math.cos(a + st.s * .02) * R - 6;
        boat.position.set(x, 0, z); boat.rotation.set(-.08, Math.atan2(nx - x, nz - z), st.s * -.12);
        const fl = Math.floor(st.t * 6) % 2; lb.material.emissiveIntensity = fl ? 3 : 0; lr.material.emissiveIntensity = fl ? 0 : 3;
        wake.push(x, z, boat.rotation.y, 14, dt, .04); if (Math.random() < dt * 8) rings.emit(x, z, 1.5, 1.5); rings.tick(dt);
        const v = distVol(boat.position, 25); if (sir) sir.set(.07 * v); if (st.eng) st.eng.set(.08 * v, 1.4);
        if (st.t > T0) { root.visible = false; if (sir) sir.stop(); if (st.eng) st.eng.stop(); return false; }
        return true;
      }, stop() { if (sir) sir.stop(); if (st.eng) st.eng.stop(); } };
  }

  /* ---------- 6. Repülő transzparenssel ---------- */
  function evPlane() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const pl = new THREE.Group(); root.add(pl);
    const parts = [[new THREE.CylinderGeometry(.55, .3, 6.5, 12).rotateX(Math.PI / 2), "#f4f1e6", M4(0, 0, 0)], [BX(10, .12, 1.5), "#f2b233", M4(0, .65, .5)], [BX(3.2, .1, .9), "#f2b233", M4(0, .1, -3)], [BX(.1, 1.2, .9), "#c62828", M4(0, .65, -3)],
      [BX(1, .6, 1.5), "#1d2a36", M4(0, .45, 1.2), "m"], [CY(.05, .05, 1.3, 6), "#2a2e33", M4(-1.6, .2, .6, 0, 0, .4), "m"], [CY(.05, .05, 1.3, 6), "#2a2e33", M4(1.6, .2, .6, 0, 0, -.4), "m"], [new THREE.ConeGeometry(.3, .5, 10).rotateX(Math.PI / 2), "#c62828", M4(0, 0, 3.45)]];
    vcGroup(parts, pl);
    const prop = mesh(BX(2.2, .18, .05), std({ color: "#2a2e33" }), pl); prop.position.z = 3.6;
    const bt = canvasTex(2048, 256, (gg, w, h) => { gg.fillStyle = "#fffdf4"; gg.fillRect(0, 0, w, h); gg.fillStyle = "#0b2f5e"; gg.font = "900 150px Georgia, serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("★ ZEPHYR APARTMANHÁZ · ZAMÁRDI ★", w / 2, h / 2 + 8); gg.strokeStyle = "#c62828"; gg.lineWidth = 14; gg.strokeRect(7, 7, w - 14, h - 14); });
    const bg = new THREE.PlaneGeometry(26, 3.2, 24, 1); bg.translate(-13, 0, 0); const base = Float32Array.from(bg.attributes.position.array);
    const banner = mesh(bg, std({ map: bt, side: THREE.DoubleSide, roughness: .8 }), root);
    const rope = mesh(CY(.02, .02, 1, 4), std({ color: "#ddd" }), root); rope.geometry.rotateZ(Math.PI / 2); rope.geometry.translate(-.5, 0, 0);
    let eng = null; const st = { t: 0 };
    root.userData.tip = ["✈ Reklámrepülő", "Csak nekünk húzza a transzparenst"];
    return { name: "Repülő transzparenssel", root,
      start() { st.t = 0; root.visible = true; eng = loopSnd("prop"); st.s = rand() < .5 ? 1 : -1; },
      tick(dt) {
        st.t += dt; const T0 = 26, k = st.t / T0, x = st.s * (-420 + k * 840), z = -70 - Math.sin(k * Math.PI) * 10, y = 45 + Math.sin(st.t * .5) * 1.5;
        pl.position.set(x, y, z); pl.rotation.set(0, st.s * Math.PI / 2, Math.sin(st.t * .6) * .05); prop.rotation.z += dt * 60;
        const bx = x - st.s * 32; banner.position.set(bx, y - 4, z); banner.rotation.y = st.s > 0 ? 0 : Math.PI;
        rope.position.set(x - st.s * 3.5, y - .3, z); rope.scale.x = 28.5; rope.rotation.set(0, st.s > 0 ? 0 : Math.PI, Math.atan2(3.7, 28.5) * (st.s > 0 ? 1 : 1));
        const a = bg.attributes.position.array; for (let i = 0; i < a.length; i += 3) { const u = -base[i] / 26; a[i + 2] = base[i + 2] + Math.sin(st.t * 7 + base[i] * .5) * .45 * u; a[i + 1] = base[i + 1] - u * .4; } bg.attributes.position.needsUpdate = true;
        if (eng) { const d = distVol(pl.position, 60); eng.set(.06 * d, 1 + (st.s * -x > 0 ? -.06 : .06)); }
        if (st.t > T0) { root.visible = false; if (eng) eng.stop(); return false; }
        return true;
      }, stop() { if (eng) eng.stop(); } };
  }

  /* ---------- 7. Tengeralattjáró: periszkóp, majd kiemelkedik és újra lemerül ---------- */
  function evSub() {
    const root = new THREE.Group(); BJ.race.add(root); root.visible = false;
    const sub = new THREE.Group(); root.add(sub);
    const parts = [[new THREE.CapsuleGeometry(1.6, 16, 6, 16).rotateX(Math.PI / 2), "#3a4048"], [BX(1.4, 3, 4), "#3a4048", M4(0, 2.2, 1.5)], [BX(4.2, .15, 1.2), "#3a4048", M4(0, 2.6, 2.2)], [BX(.15, 2.4, 1.8), "#2e333a", M4(0, 0, -9)], [BX(3.6, .15, 1.4), "#2e333a", M4(0, 0, -9)],
      [CY(.08, .08, 3, 8), "#20242a", M4(.2, 4.6, 1.8), "m"], [BX(.3, .2, .5), "#20242a", M4(.2, 6.1, 1.95), "m"], [BX(3.3, .5, 3.4), "#7a1d22", M4(0, -1.35, 0)]];
    vcGroup(parts, sub);
    const numT = canvasTex(256, 96, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = "#f4f4f0"; gg.font = "900 72px system-ui, sans-serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("Z-58", w / 2, h / 2); });
    [-1, 1].forEach((sd) => { const n = mesh(new THREE.PlaneGeometry(1.8, .7), basic({ map: numT, transparent: true, depthWrite: false }), sub); n.position.set(sd * .72, 2.6, 1.5); n.rotation.y = sd * Math.PI / 2; });
    const wake = makeWake(root, .3), rings = ringPool(root, 12); const st = { t: 0 };
    root.userData.tip = ["⚓ Tengeralattjáró", "A Balaton legmélyebb pontja 12 m… de azért befért"];
    return { name: "Tengeralattjáró", root,
      start() { st.t = 0; root.visible = true; st.s = rand() < .5 ? 1 : -1; },
      tick(dt) {
        st.t += dt; const T0 = 52, k = st.t / T0;
        const a = st.s * (-.9 + k * 1.8), R = 42, x = Math.sin(a) * R, z = -Math.cos(a) * R - 10;
        const yaw = Math.atan2(Math.cos(a) * st.s, Math.sin(a) * st.s);
        /* 0–16 mp periszkóp, 16–24 kiemelkedik, 24–40 a felszínen (kürt), 40–52 lemerül */
        const up = smooth(clamp((st.t - 16) / 8, 0, 1)) * (1 - smooth(clamp((st.t - 40) / 9, 0, 1)));
        sub.position.set(x, -6.4 + up * 6.0, z); sub.rotation.set(-(st.t > 16 && st.t < 24 ? .12 : st.t > 40 ? -.1 : 0), yaw, 0);
        wake.push(x, z, yaw, up > .5 ? 3 : 1.2, dt, .04);
        if ((st.t > 16 && st.t < 25) || (st.t > 40 && st.t < 48)) { if (Math.random() < dt * 14) rings.emit(x + rr(-2, 2), z + rr(-5, 5), rr(2, 4), 2.5); }
        else if (Math.random() < dt * 3) rings.emit(x, z, .8, 1.5);
        if (st.t > 26 && !st.honk) { st.honk = 1; deepHorn(1.8, .1 * distVol(sub.position, 40) + .03, 110); }
        rings.tick(dt);
        if (st.t > T0) { root.visible = false; st.honk = 0; return false; }
        return true;
      } };
  }

  const EVS = { titanic: evTitanic, monster: evMonster, heli: evHeli, steamer: evSteamer, police: evPolice, plane: evPlane, sub: evSub };
  const EV_ORDER = ["titanic", "monster", "steamer", "heli", "police", "plane", "sub", "titanic", "monster", "heli", "steamer", "police", "plane", "sub"];
  function bjStart(id) {
    if (BJ.cur) { try { BJ.cur.root.visible = false; if (BJ.cur.stop) BJ.cur.stop(); } catch (e) {} BJ.cur = null; }
    if (!BJ.race) return;
    if (!BJ.events[id]) { try { BJ.events[id] = EVS[id](); const ev = BJ.events[id]; ev.root.traverse((o) => { if (o.isMesh) { o.userData.xr = { hover: (on) => { if (on) showTip(o, ev.root.userData.tip[0], ev.root.userData.tip[1]); else showTip(null); } }; } }); } catch (e) { console.warn("jelenet", id, e); return; } }
    BJ.cur = BJ.events[id]; BJ.curId = id; BJ.cur.start(); W.panelDirty = 1; try { wristRedraw(); } catch (e) {}
  }
  function bjNext() { BJ.k = ((BJ.k == null ? -1 : BJ.k) + 1) % EV_ORDER.length; bjStart(EV_ORDER[BJ.k]); }
  function bjTick(dt) {
    raceTick(dt);
    if (BJ.cur) { let go = true; try { go = BJ.cur.tick(Math.min(dt, .05)); } catch (e) { console.warn("jelenet", e); go = false; } if (!go) { BJ.cur = null; BJ.next = rr(28, 55); W.panelDirty = 1; } }
    else if (BJ.race) { BJ.next -= dt; if (BJ.next < 0) bjNext(); }
  }
  function bjDispose() { try { if (BJ.cur && BJ.cur.stop) BJ.cur.stop(); } catch (e) {} Object.keys(BJ).forEach((k) => delete BJ[k]); }
