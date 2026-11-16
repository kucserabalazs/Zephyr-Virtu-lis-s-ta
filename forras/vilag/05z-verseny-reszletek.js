  /* =================================================================== 5/Z. A VERSENY RÉSZLETEI (2026. nov. 15., a tulajdonos 18:39-es kérésére:
     „a hajókat, a bójákat és minden látványos részletet még szebbé, részletesebbé és izgalmasabbá tenni … legyen valósághű”)
     • VERSENYBÓJÁK: felfújható PVC versenybója – kissé domború oldalfal, hegesztett függőleges varratok, fényes PVC (matcap), a vízvonalon
       algás-sötét sáv és fekete gumiperem; fehér reklámcsík „BALATON SAILING VR” felirattal, a kerülőbóján háromszor körben nagy szám
       fehér korongon (a rajtbóján RAJT, a célbóján CÉL); a tetején rozsdamentes emelőfül, zászlórúd lengő háromszögletű zászlóval és lámpával,
       a vállán négy fogantyúheveder; a vízen a bója körül fodros habgallér, a szél alatt hosszan elnyúló sodorvonal.
     • ÚSZÓ TÁRGYAK A HULLÁMOKON: a bóják, a rajt- és célbóják, a rendezőhajó és a nézőhajók a VALÓDI hullámfelszínen ringanak (05x
       hullámmodell): a kis bója szinte azonnal követi a víz emelkedését és lejtését, a nagy hajó a hossza és szélessége mentén átlagol,
       lomhábban bólint és dől. A bója a szél alá kissé megdől, és lassan „táncol”.
     • A rajt- és célvonal csíkja a hullámokra simul (addig a sík csík a hullámok alá bukott, és villódzott).
     • ÉLETHŰ HAJ a saját hajó legénységén: a lófarok egyetlen, elvékonyodó, enyhén lapított, szálas tincs; a hosszú haj kilenc egymásra
       boruló tincs. A tincsek tagoltan hajlanak: a gyökérnél a fejről indulnak, lejjebb a gravitáció, a végük felé egyre jobban a
       látszólagos szél viszi; a lobogás hulláma a tövétől a vége felé fut. A fejbe és a mellény hátába nem lógnak bele.
       (Addig öt, illetve tizenegy merev, szétálló lap volt – „szalmaszálak”.) */

  /* ------------------------------------------------------------------ HAJ */
  function vrHairTex() {
    const key = "vr-hair"; if (TEXC[key]) return TEXC[key];
    return (TEXC[key] = canvasTex(128, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      /* szálak: függőleges csíkok változó világossággal; a végük (a vászon TETEJE = a tincs vége) szabálytalanul ér véget – alfa-vágással szálas a vég */
      for (let x = 0; x < w; x++) {
        const L = 150 + Math.round(Math.random() * 105), top = h - L;   /* a szál a vászon aljától (gyökér) top-ig tart */
        const v = 150 + Math.round(Math.random() * 105);
        g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, top, 1, L);
        if (Math.random() < .35) { g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(x, top + Math.random() * L * .5, 1, 18 + Math.random() * 60); }   /* fényes szálak */
      }
      /* finom keresztirányú sötétedés (a tincs belseje) */
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(0,0,0,.28)"); gr.addColorStop(.5, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.28)");
      g.globalCompositeOperation = "source-atop"; g.fillStyle = gr; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over";
    }));
  }
  const _hb = new THREE.Vector3(), _hs = new THREE.Vector3(), _hf = new THREE.Vector3(), _ht = new THREE.Vector3(), _hu = new THREE.Vector3(0, 1, 0), _hd = new THREE.Vector3(), _hq = new THREE.Quaternion();
  function vrHairBuild(hg, style, color) {
    if (style !== "pony" && style !== "long") return null;
    const mat = std({ color, map: vrHairTex(), roughness: .5, metalness: 0, side: THREE.DoubleSide, alphaTest: .42 });
    const H = { ch: [], hg };
    const add = (root, out, len, n, rw, flat, ph) => {
      const R = 6, nv = (n + 1) * (R + 1), pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = [];
      for (let j = 0; j <= n; j++) for (let r = 0; r <= R; r++) { const k = j * (R + 1) + r; uv[k * 2] = r / R; uv[k * 2 + 1] = j / n; }
      for (let j = 0; j < n; j++) for (let r = 0; r < R; r++) { const a = j * (R + 1) + r, b = a + 1, c = a + R + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
      const m = mesh(g, mat, hg); m.frustumCulled = false; m.userData.noBake = true; m.userData.noMerge = 1;
      H.ch.push({ m, g, pos, root, out: out.clone().normalize(), ok: style === "pony" ? .85 : .7, len, n, rw, flat, ph, R, pts: Array.from({ length: n + 1 }, () => new THREE.Vector3()) });
    };
    if (style === "pony") {
      add(new THREE.Vector3(0, .05, -.122), new THREE.Vector3(0, -.15, -1), .36, 11, .03, .78, rand() * 9);
    } else {
      /* 13 egymásra boruló, széles tincs a tarkón – a fejhez simulva indulnak (nem „sörényként” szétállva), két rétegben */
      for (let q = 0; q < 13; q++) { const a = (q / 12 - .5) * 2.2, lay = q % 2, rr = .1 - lay * .006; add(new THREE.Vector3(Math.sin(a) * rr, .045 - Math.abs(Math.sin(a)) * .05 - lay * .02, -Math.cos(a) * (rr + .002)), new THREE.Vector3(Math.sin(a) * .55, -.7, -Math.cos(a) * .75), .3 + rand() * .08, 9, .05, .3, rand() * 9 + q * .4); }
      [-1, 1].forEach((sd) => add(new THREE.Vector3(sd * .104, .01, -.035), new THREE.Vector3(sd * .5, -.8, -.3), .22, 7, .032, .34, rand() * 9));   /* a fül mögötti tincsek */
    }
    /* t: idő; wv: a szél iránya (amerre fúj) a fej helyi terében; U: a látszólagos szél ereje (.35–1.4) */
    H.tick = (t, wv, U) => {
      /* a gravitáció a fej helyi terében (a dőlés, a kihajolás és a bólintás miatt nem mindig a fej „lefele”) */
      hg.getWorldQuaternion(_hq).invert(); _hd.set(0, -1, 0).applyQuaternion(_hq);
      for (const c of H.ch) {
        const P = c.pts, n = c.n, seg = c.len / n; P[0].copy(c.root);
        for (let j = 0; j < n; j++) {
          const q = (j + .5) / n, w = clamp(.2 + U * .62, .15, 1) * (.25 + .75 * q);
          _hb.copy(_hd).lerp(c.out, (1 - q) * (1 - q) * c.ok).normalize().lerp(wv, w).normalize();
          _hs.crossVectors(_hb, _hu); if (_hs.lengthSq() < 1e-4) _hs.set(1, 0, 0); _hs.normalize(); _hf.crossVectors(_hs, _hb);
          const f1 = Math.sin(t * (5.2 + 2.6 * U) - q * 6.5 + c.ph) * (.06 + .5 * q) * U, f2 = Math.sin(t * (3.3 + 1.7 * U) - q * 4.3 + c.ph * 1.7) * (.04 + .32 * q) * U;
          _hb.addScaledVector(_hs, f1).addScaledVector(_hf, f2).normalize();
          const p = P[j + 1]; p.copy(P[j]).addScaledVector(_hb, seg);
          /* ütközés: fej (gömb) és a törzs hátoldala (a mellény) */
          const dh = Math.hypot(p.x, p.y * .93, p.z + .006); if (dh < .134) p.multiplyScalar(.134 / Math.max(dh, 1e-4));
          if (p.y < -.075 && p.y > -.8 && Math.abs(p.x) < .235 && p.z > -.168 && p.z < .17) p.z = -.168;
        }
        /* gyűrűk a tincs mentén: elliptikus keresztmetszet (oldalt széles, előre-hátra lapos), a vég felé elvékonyodik */
        const pos = c.pos, R = c.R;
        for (let j = 0; j <= n; j++) {
          const a = P[Math.max(0, j - 1)], b = P[Math.min(n, j + 1)]; _ht.subVectors(b, a).normalize();
          _hs.crossVectors(_ht, _hu); if (_hs.lengthSq() < 1e-4) _hs.set(1, 0, 0); _hs.normalize(); _hf.crossVectors(_hs, _ht);
          const q = j / n, r = c.rw * (1 - .8 * q * q) * (.84 + .3 * Math.sin(Math.PI * Math.min(1, q * 1.7))), ra = r, rb = r * c.flat, p = P[j];
          for (let k = 0; k <= R; k++) { const th = k / R * TAU, cs = Math.cos(th), sn = Math.sin(th), o = (j * (R + 1) + k) * 3;
            pos[o] = p.x + _hs.x * cs * ra + _hf.x * sn * rb; pos[o + 1] = p.y + _hs.y * cs * ra + _hf.y * sn * rb; pos[o + 2] = p.z + _hs.z * cs * ra + _hf.z * sn * rb; }
        }
        c.g.attributes.position.needsUpdate = true; c.g.computeVertexNormals();
      }
    };
    return H;
  }

  /* ------------------------------------------------------------------ VERSENYBÓJA */
  function vrBuoyShade(hex, k) { const c = new THREE.Color(hex), h = {}; c.getHSL(h); c.setHSL(h.h, clamp(h.s * (1 - Math.abs(k) * .25), 0, 1), clamp(h.l + k * .5, 0, 1)); return "#" + c.getHexString(); }
  function vrBuoyTex(col, label, ring) {
    ring = ring || "#0b2f5e"; const key = "vr-buoy|" + col + "|" + label + "|" + ring; if (TEXC[key]) return TEXC[key];
    return (TEXC[key] = canvasTex(1024, 512, (g, w, h) => {
      /* alap: függőleges színátmenet (lent sötétebb, fent a nap fénye), a vízvonalon algás sáv */
      const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, vrBuoyShade(col, -.3)); gr.addColorStop(.13, vrBuoyShade(col, -.1)); gr.addColorStop(.55, col); gr.addColorStop(1, vrBuoyShade(col, .08));
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const al = g.createLinearGradient(0, h, 0, h * .84); al.addColorStop(0, "rgba(46,58,30,.7)"); al.addColorStop(.55, "rgba(70,78,40,.32)"); al.addColorStop(1, "rgba(70,78,40,0)"); g.fillStyle = al; g.fillRect(0, h * .84, w, h * .16);
      for (let k = 0; k < 900; k++) { const y = h - Math.pow(Math.random(), 2.2) * h * .16; g.fillStyle = `rgba(${30 + Math.random() * 40 | 0},${45 + Math.random() * 30 | 0},${20 + Math.random() * 20 | 0},${Math.random() * .3})`; g.fillRect(Math.random() * w, y, 2 + Math.random() * 5, 1 + Math.random() * 2); }
      /* PVC-gyűrődések: halvány vízszintes ívek a váll és a talp közelében */
      for (let k = 0; k < 26; k++) { const y = Math.random() < .5 ? h * (.06 + Math.random() * .12) : h * (.18 + Math.random() * .1), x = Math.random() * w; g.strokeStyle = `rgba(255,255,255,${.05 + Math.random() * .07})`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 40, y - 6, x + 90 + Math.random() * 80, y + 2); g.stroke(); }
      /* hegesztett függőleges varratok (8 panel) */
      for (let k = 0; k < 8; k++) { const x = (k + .5) * w / 8; g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(x - 2, 0, 3, h); g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(x + 1, 0, 2, h); }
      /* reklámcsík */
      const b0 = h * (1 - .7), b1 = h * (1 - .56); g.fillStyle = "#f6f7f4"; g.fillRect(0, b0, w, b1 - b0); g.fillStyle = "#0b2f5e"; g.fillRect(0, b0, w, 6); g.fillRect(0, b1 - 6, w, 6);
      g.fillStyle = "#0b2f5e"; g.font = `900 ${Math.round((b1 - b0) * .5)}px ${UIF}`; g.textAlign = "center"; g.textBaseline = "middle";
      [.25, .75].forEach((u) => { const s = "BALATON SAILING VR"; let fs = Math.round((b1 - b0) * .5); while (g.measureText(s).width > w * .44 && fs > 20) { fs -= 2; g.font = `900 ${fs}px ${UIF}`; } g.fillText(s, w * u, (b0 + b1) / 2 + 2); });
      /* szám / felirat háromszor körben */
      const cy = h * (1 - .36);
      [1 / 6, 3 / 6, 5 / 6].forEach((u) => { const cx = w * u;
        if (/^\d+$/.test(label)) { const r = h * .135; g.fillStyle = "#ffffff"; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); g.lineWidth = ring === "#0b2f5e" ? 7 : 14; g.strokeStyle = ring; g.stroke();
          g.fillStyle = "#0b2f5e"; g.font = `900 ${Math.round(r * 1.45)}px ${UIF}`; g.fillText(label, cx, cy + r * .06); }
        else { const rw = w * .2, rh = h * .2; g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect ? g.roundRect(cx - rw / 2, cy - rh / 2, rw, rh, 22) : g.rect(cx - rw / 2, cy - rh / 2, rw, rh); g.fill(); g.lineWidth = 6; g.strokeStyle = "#0b2f5e"; g.stroke();
          g.fillStyle = "#0b2f5e"; let fs = Math.round(rh * .62); g.font = `900 ${fs}px ${UIF}`; while (g.measureText(label).width > rw * .86 && fs > 20) { fs -= 2; g.font = `900 ${fs}px ${UIF}`; } g.fillText(label, cx, cy + 3); } });
    }));
  }
  function vrBuoyWashTex() {
    const key = "vr-buoy-wash"; if (TEXC[key]) return TEXC[key];
    return (TEXC[key] = canvasTex(256, 512, (g, w, h) => {
      /* a vászon felső fele: gallér a bója körül; alsó fele: a szél alatti sodorvonal (két széttartó, foszló csík) */
      g.clearRect(0, 0, w, h); const cx = w / 2, cy = h * .25, R0 = w * .2;
      for (let k = 0; k < 1400; k++) { const a = Math.random() * TAU, rr = R0 * (1 + Math.pow(Math.random(), 1.6) * .75), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * .92, s = 1 + Math.random() * 3;
        g.fillStyle = `rgba(255,255,255,${(.25 + Math.random() * .5) * (1 - (rr - R0) / (R0 * .8))})`; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
      for (let k = 0; k < 1500; k++) { const v = Math.random(), sd = Math.random() < .5 ? -1 : 1, spread = R0 * (.75 + v * 1.3), x = cx + sd * spread * (.6 + Math.random() * .5) * (1 - v * .2), y = cy + R0 * .6 + v * (h - cy - R0 * .6) * .95;
        g.fillStyle = `rgba(255,255,255,${(.18 + Math.random() * .4) * Math.pow(1 - v, 1.4)})`; g.fillRect(x, y, 1 + Math.random() * 3, 2 + Math.random() * 6); }
    }));
  }
  /* kind: "mark" (narancs, szám), "last" (sárga, szám), "pin" (narancs, RAJT), "fin" (sárga, CÉL); H: a test magassága (a csoport utólag skálázható) */
  function vrRaceBuoy(kind, num, H, opt) {
    opt = opt || {}; H = H || 2.4; const col = kind === "last" || kind === "fin" ? "#ffcb1f" : kind === "gate" ? "#e9f23a" : "#ff6f0f", label = kind === "pin" ? "RAJT" : kind === "fin" ? "CÉL" : kind === "gate" ? "KAPU" : String(num || 1), ring = opt.stb ? "#1f9e4a" : "#0b2f5e", fcol = opt.stb || kind === "gate" ? "#1fa34a" : col;
    const g = new THREE.Group(), I = new THREE.Matrix4(), R = .8;
    /* test: felfújt henger, kissé domború oldalfallal és kerek vállal */
    const prof = [[0, -.42], [.52, -.42], [.72, -.33], [.79, -.12], [.806, H * .18], [.812, H * .5], [.804, H * .76], [.77, H * .88], [.66, H * .965], [.46, H * 1.02], [.2, H * 1.045], [0, H * 1.05]].map(([r, y]) => new THREE.Vector2(r, y));
    const lg = new THREE.LatheGeometry(new THREE.SplineCurve(prof).getPoints(40), 44), P = lg.attributes.position, U = lg.attributes.uv; let y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < P.count; i++) { y0 = Math.min(y0, P.getY(i)); y1 = Math.max(y1, P.getY(i)); }
    for (let i = 0; i < P.count; i++) U.setY(i, (P.getY(i) - y0) / (y1 - y0));
    const body = mesh(lg, std({ color: "#ffffff", map: vrBuoyTex(col, label, ring), roughness: .3, metalness: 0 }), g); body.userData.buoyBody = 1;
    /* fekete gumiperem a talpnál, fogantyúhevederek a vállon, rozsdamentes emelőfül */
    const dk = std({ color: "#17191d", roughness: .62 }), ch = std({ color: "#d9dee3", roughness: .22, metalness: .85 });
    { const parts = []; const rim = new THREE.TorusGeometry(.79, .075, 10, 44); rim.rotateX(Math.PI / 2); rim.translate(0, -.16, 0); parts.push([rim, I]);
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + Math.PI / 4, hd = new THREE.TorusGeometry(.13, .022, 6, 14, Math.PI); hd.translate(0, 0, 0); hd.rotateY(Math.PI / 2); hd.translate(0, H * .9, .76); hd.rotateY(a); parts.push([hd, I]); }
      mesh(mergeGeoms(parts), dk, g); }
    { const parts = []; const eye = new THREE.TorusGeometry(.085, .02, 8, 16); eye.translate(0, H * 1.05 + .07, 0); parts.push([eye, I]);
      const pole = new THREE.CylinderGeometry(.024, .03, 1.6, 8); pole.translate(0, H * 1.05 + .8, 0); parts.push([pole, I]);
      const cap = new THREE.CylinderGeometry(.075, .085, .06, 12); cap.translate(0, H * 1.05 + .02, 0); parts.push([cap, I]); mesh(mergeGeoms(parts), ch, g); }
    /* lengő háromszögletű zászló (a bója színében, sötét szegéllyel) */
    const fg = new THREE.BufferGeometry(); { const NX = 8, pos = [], uv = [], idx = []; for (let i = 0; i <= NX; i++) { const u = i / NX, hh = .42 * (1 - u * .92); pos.push(u * .78, hh / 2, 0, u * .78, -hh / 2, 0); uv.push(u, 1, u, 0); } for (let i = 0; i < NX; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      fg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); fg.setIndex(idx); fg.computeVertexNormals(); }
    const fT = TEXC["vr-flag|" + fcol] || (TEXC["vr-flag|" + fcol] = canvasTex(64, 32, (gg, w, h) => { gg.fillStyle = fcol; gg.fillRect(0, 0, w, h); gg.fillStyle = "#0b2f5e"; gg.fillRect(0, 0, w, 3); gg.fillRect(0, h - 3, w, 3); gg.fillRect(0, 0, 5, h); }));   /* (gyorsítótárból – futamonként ne keletkezzen új textúra) */
    const flag = mesh(fg, std({ map: fT, roughness: .7, side: THREE.DoubleSide }), g); flag.position.set(.03, H * 1.05 + 1.36, 0); flag.userData.noBake = true; flag.frustumCulled = false;
    const lamp = mesh(new THREE.SphereGeometry(.07, 12, 8), basic({ color: "#fff3b0" }), g); lamp.position.y = H * 1.05 + 1.64; lamp.userData.noBake = true;
    /* habgallér + sodorvonal a vízen (a csoporttal együtt ring; a szél alá fordítjuk) */
    const wash = mesh(new THREE.PlaneGeometry(4.6, 9.2), basic({ map: vrBuoyWashTex(), transparent: true, opacity: .62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), g);
    wash.geometry.translate(0, -2.3, 0); wash.rotation.x = -Math.PI / 2; wash.position.y = .05; wash.userData.noBake = true; wash.renderOrder = 3;
    /* horgonykötél */
    { const rope = new THREE.CylinderGeometry(.022, .022, 2.6, 6); rope.translate(0, -1.5, 0); rope.rotateZ(.22); mesh(rope, dk, g); }
    g.userData.buoy = { flag, fg, base: Float32Array.from(fg.attributes.position.array), wash, lamp, H, ph: rand() * 9 };
    return g;
  }
  /* a bója szél alá fordítása (a sodorvonal a szél irányába nyúlik) – a futam beállításakor */
  function vrBuoyWind(g, wf) { const B = g && g.userData.buoy; if (!B) return; const dx = -Math.sin(wf), dz = Math.cos(wf), yb = g.rotation.y || 0; B.dw = [dx, dz];
    B.wash.rotation.z = Math.atan2(dx, dz) - yb;   /* a sodorvonal a szél alá nyúlik */
    const lx = dx * Math.cos(yb) - dz * Math.sin(yb), lz = dx * Math.sin(yb) + dz * Math.cos(yb); B.flag.rotation.y = Math.atan2(-lz, lx); }   /* a zászló a szél alá leng */

  /* ------------------------------------------------------------------ ÚSZÓ TÁRGYAK A HULLÁMOKON */
  function rwFloatOne(o, L, B, kT, rate, dt, lean) {
    if (!o || o.visible === false) return; const p = o.position, ud = o.userData, b = o.rotation.y, sb = Math.sin(b), cb = Math.cos(b);
    if (o.rotation.order !== "YXZ") o.rotation.order = "YXZ";
    const hC = rwHeight(p.x, p.z), hF = rwHeight(p.x + sb * L / 2, p.z + cb * L / 2), hA = rwHeight(p.x - sb * L / 2, p.z - cb * L / 2), hR = rwHeight(p.x + cb * B / 2, p.z - sb * B / 2), hL = rwHeight(p.x - cb * B / 2, p.z + sb * B / 2);
    const ty = (hC * 2 + hF + hA + hR + hL) / 6, tp = -Math.atan((hF - hA) / L) * kT, tr = Math.atan((hR - hL) / B) * kT, k = Math.min(1, dt * rate);
    if (ud.fy == null || dt > .5) { ud.fy = ty; ud.fp = tp; ud.fr = tr; }
    ud.fy += (ty - ud.fy) * Math.min(1, k * 1.6); ud.fp += (tp - ud.fp) * k; ud.fr += (tr - ud.fr) * k;
    p.y = ud.fy + (ud.fy0 || 0); o.rotation.x = ud.fp + (lean ? lean[0] : 0); o.rotation.z = ud.fr + (lean ? lean[1] : 0);
  }
  function rwFloatTick(dt) {
    const S = VRR; if (!RW.waves) return; const t = W.t, night = typeof NGT !== "undefined" && NGT.on;
    const buoy = (g) => { if (!g || g.visible === false) return; const Bu = g.userData.buoy, sc = g.scale.x || 1;
      let lean = null; if (Bu) { const dw = Bu.dw || [0, 1], b = g.rotation.y || 0, lx = dw[0] * Math.cos(b) - dw[1] * Math.sin(b), lz = dw[0] * Math.sin(b) + dw[1] * Math.cos(b), a = .07 + .025 * Math.sin(t * 1.3 + Bu.ph), w2 = .025 * Math.sin(t * .9 + Bu.ph * 1.7);
        lean = [lz * a + w2 * .5, -lx * a + w2]; }
      rwFloatOne(g, 1.7 * sc, 1.7 * sc, .9, 9, dt, lean);
      if (Bu) { const d = Math.hypot(g.position.x - S.x, g.position.z - S.z);
        if (d < 260) { const A = Bu.fg.attributes.position, base = Bu.base; for (let i = 0; i < A.count; i++) { const x = base[i * 3], wv = Math.sin(t * 7.5 - x * 7 + Bu.ph) * .07 * x + Math.sin(t * 4.1 - x * 4) * .03 * x; A.setZ(i, wv); } A.needsUpdate = true; }
        Bu.wash.material.opacity = night ? .14 : .62; } };
    (S.marks || []).forEach((m) => { buoy(m.g); if (m.g2) buoy(m.g2); }); buoy(S.pin); buoy(S.pin2); (S.fb || []).forEach(buoy);
    if (S.cb) rwFloatOne(S.cb, 13, 4.6, .85, 3.2, dt, null);
    (S.spect || []).forEach((q) => rwFloatOne(q.g, 11 * (q.sc || 1), 4 * (q.sc || 1), .85, 3.4, dt, null));
    /* a rajt- és célvonal csíkja a hullámokra simul */
    rwDrape(S.lineM, .07); rwDrape(S.finM, .08); if (S.CM && S.CM.gate && S.CM.gate.visible) rwDrape(S.CM.strip, .11);
  }
  /* egy vízszintes (−π/2-vel elforgatott) sík csúcsait a hullámfelszínre simítja; a sík a környezet (env) közvetlen gyermeke, vagy egy azonosság-transzformú csoporté */
  function rwDrape(m, off) {
    if (!m || !m.visible) return; const g = m.geometry, P = g.attributes.position; if (!g.userData.dr) { g.userData.dr = Float32Array.from(P.array); m.frustumCulled = false; }
    m.updateMatrix(); const e = m.matrix.elements, B = g.userData.dr, sz = Math.hypot(e[8], e[9], e[10]) || 1;
    for (let i = 0; i < P.count; i++) { const x = B[i * 3], y = B[i * 3 + 1], wx = e[0] * x + e[4] * y + e[12], wz = e[2] * x + e[6] * y + e[14]; P.array[i * 3 + 2] = (rwHeight(wx, wz) + off - e[13]) / sz; }
    P.needsUpdate = true;
  }
