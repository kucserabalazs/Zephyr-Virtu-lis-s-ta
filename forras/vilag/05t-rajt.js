  /* =================================================================== 2/T. A RAJT A MÓLÓ VÉGÉN – VERSENYIRODA (2026. nov. 15. este, a tulajdonos kérése:
     „a kikötőben kezdődik a játék, és a móló végén ott a vitorlázás játék megkezdése, ahol a hajóválasztás és a többi veszi kezdetét”)
     A VR Zephyr Games a kikötői téren indul (a móló tövében). A móló végén T alakú pallófej, rajta a versenyiroda: fehér, üvegfalas pavilon
     „BALATON SAILING VR · VERSENYIRODA” homlokzattal, bent pult rajtórával, serleggel, rádióval, távcsővel, a falon a mai pályák és a Balaton-térkép;
     előtte a RAJTPULT a nagy arany gombbal – rábökve indul a verseny menüje (játékmód → hajó → pálya → kapitányi tájékoztató).
     Mellette a rendezőhajók jelzőárboca a jelzőzászlókkal és a viharjelző lámpával, a sarkon réz rajtágyú, a korlátokon mentőöv, nemzeti és Zephyr-zászló.
     Futam után a „Kikötő” gomb ide, a versenyirodához hoz vissza. */
  const STN = { z0: -44, z1: -52, x: 7, F: .66 };
  function hbStation(env) {
    const G = new THREE.Group(); G.name = "versenyiroda"; env.add(G); STN.G = G; const F = STN.F, zc = (STN.z0 + STN.z1) / 2, D = STN.z0 - STN.z1;
    const plank = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#8a6a4a"; g.fillRect(0, 0, w, h); for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#7f5f40" : "#93724f"; g.fillRect(0, k * h / 8, w, h / 8 - 3); g.fillStyle = "rgba(30,18,8,.6)"; g.fillRect(0, (k + 1) * h / 8 - 3, w, 3); }
      for (let k = 0; k < 160; k++) { g.fillStyle = `rgba(40,25,10,${rand() * .2})`; g.fillRect(rand() * w, rand() * h, 20 + rand() * 60, 1); } }, { repeat: [7, 4] });
    const deck = std({ map: plank, roughness: .9 }), post = std({ color: "#5d4630", roughness: .95 }), white = std({ color: "#f5f4ef", roughness: .55 }), navy = std({ color: "#0b2f5e", roughness: .5 }),
      gold = std({ color: "#d4a13a", metalness: .8, roughness: .28 }), steel = std({ color: "#c9ccd0", metalness: .75, roughness: .3 }), dark = std({ color: "#1d232b", roughness: .5 });
    /* T alakú pallófej (14 × 8 m) cölöpökön, vastag peremgerendával */
    mesh(new THREE.BoxGeometry(2 * STN.x, .22, D).translate(0, F - .11, zc), deck, G);
    mesh(new THREE.BoxGeometry(2 * STN.x + .2, .26, .18).translate(0, F - .2, STN.z1 - .05), post, G); [-1, 1].forEach((s) => mesh(new THREE.BoxGeometry(.18, .26, D).translate(s * (STN.x + .05), F - .2, zc), post, G));
    for (let x = -STN.x + .3; x <= STN.x; x += 2.3) for (let z = STN.z0 - .3; z >= STN.z1; z -= 2.5) mesh(new THREE.CylinderGeometry(.13, .15, 2.6, 8).translate(x, F - 1.4, z), post, G);
    /* korlát (fa kapaszkodó, fém oszlopok) – a pavilon előtti szabad rész három oldalán, a móló csatlakozásánál nyitva */
    { const rail = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0); const r = mesh(new THREE.BoxGeometry(.08, .07, L), post, G); r.position.set((x0 + x1) / 2, F + 1.02, (z0 + z1) / 2); r.rotation.y = Math.atan2(x1 - x0, z1 - z0);
        const r2 = mesh(new THREE.BoxGeometry(.026, .026, L), steel, G); r2.rotation.y = r.rotation.y; r2.position.set((x0 + x1) / 2, F + .55, (z0 + z1) / 2);
        for (let k = 0; k <= L + .01; k += 1.25) mesh(new THREE.CylinderGeometry(.025, .025, 1.02, 8).translate(x0 + (x1 - x0) * k / L, F + .51, z0 + (z1 - z0) * k / L), steel, G); };
      rail(-STN.x, STN.z0, -1.6, STN.z0); rail(1.6, STN.z0, STN.x, STN.z0); rail(-STN.x, STN.z0, -STN.x, STN.z1); rail(STN.x, STN.z0, STN.x, STN.z1); rail(-STN.x, STN.z1, STN.x, STN.z1); }
    /* festett rajtvonal és „RAJT” felirat a pallón, a móló felől érkezve */
    { const t = canvasTex(1024, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "rgba(255,209,102,.92)"; g.fillRect(0, 10, w, 16); g.font = `900 150px ${UIF}`; g.textAlign = "center"; g.fillStyle = "rgba(255,255,255,.88)"; g.fillText("RAJT", w / 2, 200); });
      const p = mesh(new THREE.PlaneGeometry(5.2, 1.3), basic({ map: t, transparent: true, depthWrite: false }), G); p.rotation.x = -Math.PI / 2; p.position.set(0, F + .006, STN.z0 - 1.0); p.renderOrder = 2; }
    /* ---- a VERSENYIRODA: fehér pavilon, üveg hátfal a tóra, nyitott eleje lapos, előreugró tetővel ---- */
    const px0 = -4.2, px1 = 4.2, pz0 = -48.6, pz1 = -51.7, PH = 2.85;
    STN.pav = { x0: px0, x1: px1, z0: pz0, z1: pz1 };
    { const wallT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#f3f1ea"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 26) { g.fillStyle = "rgba(0,0,0,.07)"; g.fillRect(0, y, w, 2); g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(0, y + 2, w, 1); } }, { repeat: [1, 4] });
      const wm = std({ map: wallT, roughness: .7 });
      [px0, px1].forEach((x, i) => { mesh(new THREE.BoxGeometry(.16, PH, pz0 - pz1).translate(x + (i ? -.08 : .08), F + PH / 2, (pz0 + pz1) / 2), wm, G); mesh(new THREE.BoxGeometry(.2, .2, pz0 - pz1 + .1).translate(x + (i ? -.08 : .08), F + .1, (pz0 + pz1) / 2), navy, G); });
      /* üveg hátfal fehér keretben, alul mellvéddel */
      mesh(new THREE.BoxGeometry(px1 - px0, .9, .16).translate(0, F + .45, pz1 + .08), wm, G); mesh(new THREE.BoxGeometry(px1 - px0, .3, .18).translate(0, F + PH - .15, pz1 + .08), wm, G);
      const glass = new THREE.MeshStandardMaterial({ color: "#a9d4ec", roughness: .05, metalness: .1, transparent: true, opacity: .28, depthWrite: false }); W.disposables.push(glass);
      mesh(new THREE.PlaneGeometry(px1 - px0 - .2, PH - 1.2).translate(0, F + .9 + (PH - 1.2) / 2, pz1 + .1), glass, G);
      for (let k = 0; k <= 4; k++) mesh(new THREE.BoxGeometry(.07, PH - 1.2, .1).translate(px0 + .1 + k * (px1 - px0 - .2) / 4, F + .9 + (PH - 1.2) / 2, pz1 + .1), white, G);
      /* lapos tető, előreugró ereszfallal; a homlokzati sávon a felirat */
      mesh(new THREE.BoxGeometry(px1 - px0 + .9, .16, pz0 - pz1 + 1.9).translate(0, F + PH + .08, (pz0 + pz1) / 2 + .5), white, G);
      mesh(new THREE.BoxGeometry(px1 - px0 + 1.0, .62, .14).translate(0, F + PH - .05, pz0 + 1.47), navy, G);
      const sg = canvasTex(2048, 256, (g, w, h) => { g.fillStyle = "#0b2f5e"; g.fillRect(0, 0, w, h); g.strokeStyle = "#d4a13a"; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
        g.textAlign = "center"; g.fillStyle = "#ffd166"; g.font = `900 120px ${UIF}`; g.fillText("BALATON SAILING VR", w / 2, 135); g.fillStyle = "#ffffff"; g.font = `700 54px ${UIF}`; g.fillText("VERSENYIRODA  ·  RAJT  ·  ZEPHYR KIKÖTŐ", w / 2, 212); });
      const s = mesh(new THREE.PlaneGeometry(px1 - px0 + .9, .56), basic({ map: sg }), G); s.position.set(0, F + PH - .05, pz0 + 1.55);
      /* karcsú oszlopok az eresz alatt */
      [px0 + .25, px1 - .25].forEach((x) => mesh(new THREE.CylinderGeometry(.06, .07, PH, 12).translate(x, F + PH / 2, pz0 + 1.3), white, G));
      /* belső mennyezet-lámpák */
      for (let k = -1; k <= 1; k++) { const l = mesh(new THREE.CylinderGeometry(.2, .2, .04, 20).translate(k * 2.6, F + PH - .02, (pz0 + pz1) / 2), std({ color: "#fff8e6", emissive: "#ffe9b8", emissiveIntensity: .8 }), G); void l; } }
    /* pult a hátfal előtt: rajtóra, serleg, rádió, távcső, zászlós doboz */
    { const cz = pz1 + .75, wood = std({ color: "#7a5636", roughness: .7 }); mesh(new THREE.BoxGeometry(5.6, .95, .7).translate(0, F + .475, cz), wood, G); mesh(new THREE.BoxGeometry(5.8, .06, .8).translate(0, F + .98, cz), std({ color: "#3b2a1c", roughness: .45 }), G);
      /* rajtóra: piros számjegyek „5:00” fekete keretben */
      const ck = canvasTex(512, 220, (g, w, h) => { g.fillStyle = "#0a0a0a"; g.fillRect(0, 0, w, h); g.fillStyle = "#ff3b2f"; g.font = `900 170px ${UIF}`; g.textAlign = "center"; g.shadowColor = "#ff3b2f"; g.shadowBlur = 24; g.fillText("5:00", w / 2, 175); });
      const cb = mesh(new THREE.BoxGeometry(1.1, .5, .18).translate(-1.4, F + 1.28, cz - .05), dark, G); void cb; const cs = mesh(new THREE.PlaneGeometry(1.0, .43), basic({ map: ck }), G); cs.position.set(-1.4, F + 1.28, cz + .045); STN.clock = { tex: ck, t: 0 };
      /* serleg */
      { const cup = new THREE.Group(); cup.position.set(1.5, F + 1.01, cz); G.add(cup); const pts = [[.0, 0], [.13, 0], [.13, .05], [.05, .08], [.04, .2], [.06, .24], [.16, .3], [.19, .48], [.2, .52], [.0, .52]].map(([r, y]) => new THREE.Vector2(r, y));
        mesh(new THREE.LatheGeometry(pts, 28), gold, cup); [-1, 1].forEach((s) => { const hd = mesh(new THREE.TorusGeometry(.08, .014, 8, 20, Math.PI), gold, cup); hd.position.set(s * .2, .4, 0); hd.rotation.z = s * Math.PI / 2; }); }
      /* rádió (VHF) antennával, távcső */
      mesh(new THREE.BoxGeometry(.32, .16, .2).translate(.4, F + 1.09, cz), dark, G); mesh(new THREE.CylinderGeometry(.008, .008, .36, 6).translate(.52, F + 1.35, cz), dark, G);
      [-.06, .06].forEach((dx) => { const b = mesh(new THREE.CylinderGeometry(.04, .05, .2, 14), dark, G); b.rotation.z = Math.PI / 2; b.position.set(2.35 + dx * 0, F + 1.06, cz + dx); });
      /* jelzőzászlós láda */ mesh(new THREE.BoxGeometry(.7, .3, .4).translate(-2.4, F + 1.16, cz), std({ color: "#a01f1f", roughness: .6 }), G); }
    /* a falon: MAI FUTAMOK tábla (bal) és a Balaton-térkép (jobb) */
    { const CN = ["Felszél–hátszél", "Háromszög", "Szlalom", "Tihanyi kör", "Nagy ív"];
      const bt = canvasTex(768, 768, (g, w, h) => { g.fillStyle = "#123a2a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8a6a4a"; g.lineWidth = 26; g.strokeRect(13, 13, w - 26, h - 26); g.fillStyle = "#ffd166"; g.font = `900 64px ${UIF}`; g.fillText("MAI FUTAMOK", 60, 120);
        g.font = `700 46px ${UIF}`; CN.forEach((n, i) => { g.fillStyle = "#f2f2ea"; g.fillText(`${i + 1}. ${n}`, 60, 220 + i * 92); }); g.fillStyle = "#9fd0b4"; g.font = `600 36px ${UIF}`; g.fillText("szél: ÉNy 3–4 Bf · rajt: 5 perc", 60, h - 60); });
      const b = mesh(new THREE.PlaneGeometry(1.6, 1.6), basic({ map: bt }), G); b.position.set(px0 + .2, F + 1.75, (pz0 + pz1) / 2); b.rotation.y = Math.PI / 2;
      const mt = canvasTex(1024, 640, (g, w, h) => { g.fillStyle = "#f4ecd8"; g.fillRect(0, 0, w, h); g.strokeStyle = "#5d4630"; g.lineWidth = 22; g.strokeRect(11, 11, w - 22, h - 22);
        g.fillStyle = "#7fb4d8"; g.beginPath(); const P = [[90, 470], [200, 420], [330, 400], [470, 330], [600, 300], [720, 250], [830, 200], [930, 160], [945, 210], [860, 280], [760, 330], [640, 390], [520, 450], [380, 500], [240, 540], [120, 560]]; g.moveTo(P[0][0], P[0][1]); P.forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fill();
        g.fillStyle = "#3b2a1c"; g.font = `800 40px ${UIF}`; g.fillText("BALATON", 80, 80); g.font = `600 28px ${UIF}`; [["Keszthely", 70, 520], ["Badacsony", 250, 590], ["Tihany", 600, 270], ["Zamárdi ⚓", 640, 460], ["Siófok", 790, 380], ["Kenese", 880, 140]].forEach(([n, x, y]) => g.fillText(n, x, y));
        g.fillStyle = "#d61f26"; g.beginPath(); g.arc(655, 405, 12, 0, TAU); g.fill(); });
      const mp = mesh(new THREE.PlaneGeometry(1.9, 1.19), basic({ map: mt }), G); mp.position.set(px1 - .2, F + 1.75, (pz0 + pz1) / 2); mp.rotation.y = -Math.PI / 2; }
    /* ---- a RAJTPULT: sötétkék talapzat arany szegéllyel, ferde kijelző és a NAGY ARANY GOMB ---- */
    { const P = new THREE.Group(); P.position.set(0, F, -46.9); G.add(P); STN.pult = P;
      mesh(new THREE.BoxGeometry(.9, .95, .55).translate(0, .475, 0), navy, P); mesh(new THREE.BoxGeometry(.96, .05, .6).translate(0, .02, 0), gold, P);
      const top = new THREE.Group(); top.position.set(0, .98, 0); top.rotation.x = .5; P.add(top); mesh(new THREE.BoxGeometry(1.0, .07, .66), navy, top); mesh(new THREE.BoxGeometry(1.04, .02, .7).translate(0, -.04, 0), gold, top);
      const sc = canvasTex(1024, 640, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0e3b6e"); gr.addColorStop(1, "#06182e"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = "#ffd166"; g.font = `900 92px ${UIF}`; g.textAlign = "center"; g.fillText("⛵ VERSENYRE FEL!", w / 2, 120); g.fillStyle = "#fff"; g.font = `700 50px ${UIF}`; g.fillText("játékmód · hajó · pálya · tájékoztató", w / 2, 210);
        g.fillStyle = "#bcd3ea"; g.font = `600 44px ${UIF}`; g.fillText("bökj a nagy arany gombra", w / 2, 300); });
      const scr = mesh(new THREE.PlaneGeometry(.86, .34), basic({ map: sc }), top); scr.rotation.x = -Math.PI / 2; scr.position.set(0, .037, -.13);
      const btnM = std({ color: "#f2c14e", metalness: .55, roughness: .28, emissive: "#ffb000", emissiveIntensity: .35 });
      const bt = mesh(new THREE.CylinderGeometry(.13, .14, .07, 40), btnM, top); bt.position.set(0, .07, .18); mesh(new THREE.TorusGeometry(.15, .018, 10, 40).rotateX(Math.PI / 2).translate(0, .045, .18), gold, top);
      STN.btn = bt; STN.btnM = btnM;
      /* fénykör a padlón a pult körül */
      const glT = canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, w * .2, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(255,209,102,0)"); r.addColorStop(.75, "rgba(255,209,102,.45)"); r.addColorStop(1, "rgba(255,209,102,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
      const gl = mesh(new THREE.PlaneGeometry(2.6, 2.6), basic({ map: glT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), P); gl.rotation.x = -Math.PI / 2; gl.position.y = .01; STN.glow = gl;
      /* a gomb (és az egész pult) rámutatható / rábökhető – kézzel, kontrollerrel, egérrel, ujjal */
      const hit = mesh(new THREE.BoxGeometry(1.1, 1.5, .9).translate(0, .75, 0), basic({ visible: false }), P); hit.material.visible = false;
      hit.userData.xr = { hover: (on) => { STN.hov = on; }, click: () => hbStationGo() }; T.xr.extra.add(hit); W.objs.push(hit); STN.hit = hit;
      const lbl = labelSprite(["⛵ Balaton Sailing VR", "a verseny itt indul – bökj a nagy gombra"], { size: 1.7, fs: 60, w: 900 }); lbl.position.set(0, 2.6, 0); P.add(lbl); STN.lbl = lbl; }
    /* ---- jelzőárboc (rendezőhajó-zászlók) a viharjelző lámpával a tetején ---- */
    { const M = new THREE.Group(); M.position.set(5.7, F, -45.3); G.add(M); mesh(new THREE.CylinderGeometry(.07, .1, 8.2, 12).translate(0, 4.1, 0), white, M); mesh(new THREE.BoxGeometry(2.4, .07, .07).translate(0, 6.3, 0), white, M);
      [[-1.1, "P"], [-.4, "E"], [.4, "L"], [1.1, "Y"]].forEach(([x, f], i) => { const ft = canvasTex(96, 64, (g, w, h) => { try { icsFlag(g, f, w, h); } catch (e) { g.fillStyle = "#1f4fa0"; g.fillRect(0, 0, w, h); } });
        mesh(new THREE.CylinderGeometry(.006, .006, 1.1 + i * .2, 4).translate(x, 6.3 - (1.1 + i * .2) / 2, 0), dark, M); const fl = mesh(new THREE.PlaneGeometry(.66, .44, 6, 1), std({ map: ft, side: THREE.DoubleSide, roughness: .8 }), M);
        fl.position.set(x + .34, 6.0 - i * .2, 0); fl.userData.base = fl.geometry.attributes.position.array.slice(); (STN.flags = STN.flags || []).push(fl); });
      mesh(new THREE.BoxGeometry(.42, .42, .42).translate(0, 8.4, 0), dark, M);
      const lamp = mesh(new THREE.CylinderGeometry(.22, .22, .5, 14).translate(0, 8.85, 0), basic({ color: "#4a4a40" }), M); mesh(new THREE.ConeGeometry(.3, .25, 14).translate(0, 9.25, 0), dark, M);
      const glow = glowSprite("#ffcc22", 2.6); glow.position.set(0, 8.85, 0); glow.userData.night = 0; M.add(glow); glow.visible = false; HB.storm = { lamp, glow };
      const sg = canvasTex(512, 160, (g, w, h) => { g.fillStyle = "#f2c21a"; g.fillRect(0, 0, w, h); g.fillStyle = "#14161b"; g.font = "900 52px system-ui, sans-serif"; g.textAlign = "center"; g.fillText("VIHARJELZŐ", w / 2, 66); g.font = "700 30px system-ui, sans-serif"; g.fillText("45/perc: elsőfok · 90/perc: másodfok", w / 2, 122); });
      [1, -1].forEach((s) => { const pl = mesh(new THREE.PlaneGeometry(1.2, .38), basic({ map: sg }), M); pl.position.set(0, 1.9, s * .11); if (s < 0) pl.rotation.y = Math.PI; }); }
    /* ---- réz rajtágyú fa lövegtalpon, a tó felé ---- */
    { const C = new THREE.Group(); C.position.set(-5.6, F, -45.6); C.rotation.y = .5; G.add(C); const brass = std({ color: "#b8893a", metalness: .85, roughness: .3 }), oak = std({ color: "#6b4a2a", roughness: .8 });
      mesh(new THREE.BoxGeometry(.5, .28, .9).translate(0, .3, 0), oak, C); [-1, 1].forEach((s) => [-.32, .32].forEach((z) => { const wh = mesh(new THREE.CylinderGeometry(.16, .16, .07, 16), oak, C); wh.rotation.z = Math.PI / 2; wh.position.set(s * .29, .16, z); }));
      const bar = mesh(new THREE.CylinderGeometry(.09, .14, 1.05, 20), brass, C); bar.rotation.x = Math.PI / 2 - .12; bar.position.set(0, .55, -.15); mesh(new THREE.SphereGeometry(.15, 16, 12).translate(0, .6, .38), brass, C);
      mesh(new THREE.TorusGeometry(.1, .02, 8, 20).translate(0, .52, -.62), brass, C); }
    /* ---- zászlók a sarkokon (a móló végéről ide költöztek) és mentőöv ---- */
    [[-6.6, STN.z1 + .4, 1], [6.6, STN.z1 + .4, 0]].forEach(([x, z, i], k) => { const fp = mesh(new THREE.CylinderGeometry(.035, .04, 6, 8), white, G); fp.position.set(x, F + 3, z);
      const ft = canvasTex(192, 128, (g) => { if (i) { g.fillStyle = "#ce2939"; g.fillRect(0, 0, 192, 43); g.fillStyle = "#fff"; g.fillRect(0, 43, 192, 42); g.fillStyle = "#477050"; g.fillRect(0, 85, 192, 43); } else { g.fillStyle = "#0b2f5e"; g.fillRect(0, 0, 192, 128); g.fillStyle = "#ffd166"; g.font = `900 40px ${UIF}`; g.textAlign = "center"; g.fillText("ZEPHYR", 96, 78); } });
      const fl = mesh(new THREE.PlaneGeometry(1.4, .9, 8, 1), basic({ map: ft, side: THREE.DoubleSide }), G); fl.position.set(x + .72, F + 5.45, z); fl.userData.base = fl.geometry.attributes.position.array.slice(); HB["flag" + k] = fl; });
    { const ring = mesh(new THREE.TorusGeometry(.32, .08, 10, 24), std({ color: "#ff7a1a", roughness: .5 }), G); ring.position.set(STN.x + .05, F + .8, -47.5); ring.rotation.y = Math.PI / 2; }
    /* járható felület + falak (a pavilon nyitott eleje az „ajtó”), a pult nem átjárható */
    hbTpSurf(env, 0, zc, 2 * STN.x - .3, D - .3, .67, .3);
    STN.house = { id: "stn", kind: "pavilon", box: { x0: px0, x1: px1, z0: pz1, z1: pz0 }, dr: { wall: "s", c: 0, w: px1 - px0 - .5 } };
    HB.solids = [{ x0: -.55, x1: .55, z0: -47.25, z1: -46.55 }];
  }
  function hbStationTick(dt) {
    if (!STN.G || !STN.btnM) return; const t = W.t, hp = HB.pos || { x: 0, z: 0 }, near = Math.hypot(hp.x, hp.z + 46.9);
    STN.btnM.emissiveIntensity = (STN.hov ? 1.1 : .35) + .3 * Math.sin(t * 3.2); STN.btn.position.y = STN.hov ? .055 : .07;
    if (STN.glow) STN.glow.material.opacity = .55 + .35 * Math.sin(t * 2.2);
    if (STN.lbl) STN.lbl.visible = HB.walk && near < 30 && near > 3.6;
    (STN.flags || []).forEach((f, i) => { const pa = f.geometry.attributes.position, b0 = f.userData.base; for (let k = 0; k < pa.count; k++) { const x = b0[k * 3]; pa.array[k * 3 + 2] = Math.sin(x * 6 - t * 5 - i) * .05 * (x + .34); } pa.needsUpdate = true; });
    /* a rajtóra visszaszámol (5:00 → 0:00, aztán újra) – a hangulatért */
    if (STN.clock && (STN.clock.t += dt) > 1) { STN.clock.t = 0; const s = 300 - Math.floor(W.t) % 300, tx = STN.clock.tex, g = tx._canvas.getContext("2d"); g.fillStyle = "#0a0a0a"; g.fillRect(0, 0, 512, 220); g.fillStyle = "#ff3b2f"; g.font = `900 170px ${UIF}`; g.textAlign = "center"; g.shadowColor = "#ff3b2f"; g.shadowBlur = 24; g.fillText(Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"), 256, 175); g.shadowBlur = 0; tx.needsUpdate = true; }
  }
  /* a rajthoz (a móló végére, a pult elé, arccal a pult felé) */
  function hbToStation() { try { roomOut(); } catch (e) {} if (!HB.walk) hbWalk(true); try { locBlink(200); } catch (e) {} HB.pos = { x: 0, z: -45.5 }; faceYaw(0); }
  /* a nagy gomb: a verseny menüje (játékmód → hajó → pálya → tájékoztató) – a fekete bemutatóterem ott nyílik, ahol állsz */
  function hbStationGo() { try { uiSnd("success"); } catch (e) {} try { hapt(.5, 40); } catch (e) {} HB.atStation = true; faceYaw(0); wzGo(1); }
