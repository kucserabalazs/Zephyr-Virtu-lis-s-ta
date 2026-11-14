  /* =================================================================== 2/E. TÁBLÁK (VR + 2D egyben), PONTOZÁS, TRÓFEÁK, KAPITÁNYI TÁJÉKOZTATÓ (2026. nov. 14.)
     • TÁBLA (uiBoard): egyetlen vászonra rajzolt felület – VR-ben lebegő, megfogható (a felső sávnál csippentve bárhová vihető, előre-hátra tolva nő/kisebbedik,
       mint a Quest ablakai), 2D-ben (telefon, gép) ugyanez a vászon a képernyő közepén, egérrel/ujjal nyomkodható. Nagy, jól olvasható betűk.
     • PONTOZÁS: a Vitorlázás Versenyszabályai A függeléke (A4 alacsony pontszámú rendszer): 1. hely = 1 pont, 2. = 2 …; aki nem fut be, nem rajtol, kizárják
       vagy az időlimit után ér be (DNF, DNS, DSQ, TLE), a sorozat nevezőinek száma + 1 pontot kap (itt 4 hajó → 5 pont). A sorozat 5 futam, kiesés (A2) nincs.
       Holtverseny (A8.1): több jobb helyezés dönt (a pontszámokat a legjobbtól sorba rendezve, az első eltérés), ha az is egyezik (A8.2): az utolsó futam.
     • TRÓFEÁK: az összetett első három díjat és serleget kap (arany, ezüst, bronz) – a serleg a versenyző neve alatt elmentődik (zephyr-trofeak).
     • KAPITÁNYI TÁJÉKOZTATÓ: a futam után, szép balatoni táj (a tulajdonos saját stég-fotója) előtt: eredmény, szabálytalanságok a szabály szövegével,
       a következő futam pontos pályamodellje (tervrajz: szél, rajt-/célkapu, bóják a kerülés irányával, szakaszok hossza és jellege, ajánlott útvonal a cirkálással;
       mellette forgó 3D pályamodell, rajta a végigfutó kis hajóval). */
  const UIB = { list: [] };
  const UIF = "Inter, system-ui, -apple-system, Segoe UI, sans-serif";
  function uiRR(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function uiFit(g, txt, max, fs, wt) { let f = fs; g.font = `${wt || 700} ${f}px ${UIF}`; while (g.measureText(txt).width > max && f > 12) { f -= 2; g.font = `${wt || 700} ${f}px ${UIF}`; } return f; }
  function uiWrap(g, txt, x, y, max, lh, maxLines) { const words = String(txt).split(" "); let line = "", n = 0; for (let i = 0; i < words.length; i++) { const t = line ? line + " " + words[i] : words[i]; if (g.measureText(t).width > max && line) { g.fillText(line, x, y + n * lh); n++; line = words[i]; if (maxLines && n >= maxLines) return n; } else line = t; } if (line) { g.fillText(line, x, y + n * lh); n++; } return n; }
  /* tábla: o = { w, h (px), mw (méter), draw(B, g), fps (újrarajzolás/mp, 0 = csak változáskor), dist, side (rad, a nézési iránytól), y } */
  function uiBoard(o) {
    const cv = document.createElement("canvas"); cv.width = o.w; cv.height = o.h; const g = cv.getContext("2d");
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; try { tex.anisotropy = T.sceneEl.renderer.capabilities.getMaxAnisotropy(); } catch (e) {} tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const mw = o.mw || 1.2, mh = mw * o.h / o.w;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false })); m.renderOrder = 996;
    const B = { o, cv, g, tex, m, btns: [], hov: null, dirty: 1, t: 0, open: false, dom: null, kbd: null };
    B.btn = (x, y, w, h, label, fn, st) => { st = st || {}; const id = B.btns.length, hv = B.hov === id && !st.off; B.btns.push({ x, y, w, h, fn: st.off ? null : fn });
      uiRR(g, x, y, w, h, st.r != null ? st.r : Math.min(26, h / 2.6)); g.fillStyle = st.off ? "rgba(255,255,255,.08)" : hv ? "#ffe08a" : st.gold ? "#d4a13a" : st.green ? "#1e8e4f" : st.red ? "#b3261e" : st.bg || "rgba(7,28,58,.86)"; g.fill();
      g.lineWidth = st.gold || hv ? 4 : 2.5; g.strokeStyle = hv ? "#fff3c4" : st.gold ? "#ffe4a0" : "rgba(255,209,102,.75)"; g.stroke();
      g.fillStyle = hv || st.gold ? "#0b2f5e" : st.off ? "rgba(255,255,255,.4)" : "#ffffff"; const fs = uiFit(g, label, w - 24, st.fs || Math.min(40, h * .46), 800); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(label, x + w / 2, y + h / 2 + 1); g.textAlign = "left"; g.textBaseline = "alphabetic"; return fs; };
    B.draw = () => { B.btns = []; g.clearRect(0, 0, o.w, o.h); o.draw(B, g); tex.needsUpdate = true; B.dirty = 0; if (B.dom) B.domDraw(); };
    B.hit = (x, y) => B.btns.findIndex((q) => q.fn && x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
    B.click = (x, y) => { const i = B.hit(x, y); if (i >= 0) { try { const a = T.ac(); if (a) { const os = a.createOscillator(), gg = a.createGain(); os.frequency.value = 660; gg.gain.setValueAtTime(.05, a.currentTime); gg.gain.exponentialRampToValueAtTime(.001, a.currentTime + .08); os.connect(gg).connect(T.outBus()); os.start(); os.stop(a.currentTime + .1); } } catch (e) {} B.btns[i].fn(); B.dirty = 1; return true; } return false; };
    B.setHov = (i) => { if (i !== B.hov) { B.hov = i; B.dirty = 1; } };
    const uv = (h) => (h && h.uv ? [h.uv.x * o.w, (1 - h.uv.y) * o.h] : null);
    m.userData.xr = {
      hover: (on, h) => { const p = on && uv(h); B.setHov(p ? B.hit(p[0], p[1]) : null); },
      move: (h) => { const p = uv(h); B.setHov(p ? B.hit(p[0], p[1]) : null); },
      click: (h) => { const p = uv(h); if (p) B.click(p[0], p[1]); },
      /* megfogás a felső sávnál (Quest-ablak módra): a tábla a kéz sugarával mozog, előre-hátra tolva nő vagy kisebbedik */
      down: (h, S0, key) => { const p = uv(h); if (!p || p[1] > (o.bar || 90) || !S0 || !S0.o || !S0.d) return; const dist0 = Math.max(.2, m.position.clone().sub(S0.o).dot(S0.d)), head = T.headPos ? T.headPos() : null;
        B.drag = { key, dist: dist0, off: m.position.clone().sub(S0.o.clone().addScaledVector(S0.d, dist0)), hd0: head ? S0.o.distanceTo(head) : 0, sc0: m.scale.x, t0: performance.now() }; if (T.xr.press) T.xr.press[key] = null; },
      drag: (S0, key) => { const D = B.drag; if (!D || D.key !== key || !S0 || !S0.o || !S0.d) return; const head = T.headPos ? T.headPos() : null; let dh = head ? S0.o.distanceTo(head) - D.hd0 : 0; if (performance.now() - D.t0 < 300) { D.hd0 += dh; dh = 0; }
        dh = Math.abs(dh) < .03 ? 0 : (dh - Math.sign(dh) * .03) * 3.2; const dist = clamp(D.dist + dh, .3, 6), tgt = S0.o.clone().addScaledVector(S0.d, dist).add(D.off); m.scale.setScalar(clamp(D.sc0 * Math.pow(dist / D.dist, .85), .4, 6));
        m.position.lerp(tgt, .5); if (head) m.rotation.set(0, Math.atan2(-(m.position.x - head.x), -(m.position.z - head.z)), 0, "YXZ"); },
      up: () => { B.drag = null; }
    };
    /* 2D: a vászon a képernyőn */
    B.domMake = () => { if (B.dom) return; const d = document.createElement("div"); d.className = "zx-board"; d.style.cssText = "position:fixed;inset:0;z-index:85;display:flex;align-items:center;justify-content:center;background:rgba(3,12,26,.35);pointer-events:auto";
      const c = document.createElement("canvas"); c.width = o.w; c.height = o.h; c.style.cssText = "max-width:97vw;max-height:94vh;width:auto;height:auto;border-radius:18px;box-shadow:0 18px 60px rgba(0,0,0,.5);touch-action:manipulation;cursor:pointer"; d.appendChild(c); document.body.appendChild(d);
      const pos = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * o.w, (e.clientY - r.top) / r.height * o.h]; };
      c.addEventListener("pointermove", (e) => { const p = pos(e); B.setHov(B.hit(p[0], p[1])); });
      c.addEventListener("pointerup", (e) => { const p = pos(e); B.click(p[0], p[1]); e.preventDefault(); });
      d.addEventListener("pointerup", (e) => { if (e.target === d && o.outside) o.outside(); });
      B.dom = d; B.dcv = c; B.domDraw = () => { const cg = c.getContext("2d"); cg.clearRect(0, 0, o.w, o.h); cg.drawImage(cv, 0, 0); }; };
    B.place = () => { const head = (T.headPos && T.headPos()) || new THREE.Vector3(0, T.headY ? T.headY() : 1.6, 0), yaw = (T.camYaw ? T.camYaw() : 0) + (o.side || 0), d = o.dist || 1.35;
      m.position.set(head.x - Math.sin(yaw) * d, head.y + (o.y != null ? o.y : -.12), head.z - Math.cos(yaw) * d); m.rotation.set(0, yaw, 0, "YXZ"); m.scale.setScalar(1); };
    B.show = (on) => { if (on === B.open) { if (on) { B.dirty = 1; if (T.inVR) B.place(); } return; } B.open = on;
      if (on) { if (T.inVR) { T.sceneEl.object3D.add(m); T.xr.extra.add(m); B.place(); } else { B.domMake(); B.dom.style.display = "flex"; } B.dirty = 1; if (UIB.list.indexOf(B) < 0) UIB.list.push(B); }
      else { if (m.parent) m.parent.remove(m); T.xr.extra.delete(m); if (T.xrForget) try { T.xrForget([m]); } catch (e) {} if (B.dom) B.dom.style.display = "none"; } };
    B.tick = (dt) => { if (!B.open) return; B.t += dt; if (o.fps) { B.acc = (B.acc || 0) + dt; if (B.acc > 1 / o.fps) { B.acc = 0; B.dirty = 1; } } if (B.dirty) B.draw();
      if (T.inVR && !m.parent) { T.sceneEl.object3D.add(m); T.xr.extra.add(m); B.place(); } if (!T.inVR && m.parent) { m.parent.remove(m); T.xr.extra.delete(m); B.domMake(); B.dom.style.display = "flex"; } };
    B.destroy = () => { B.show(false); if (B.dom) { B.dom.remove(); B.dom = null; } m.geometry.dispose(); m.material.dispose(); tex.dispose(); const k = UIB.list.indexOf(B); if (k >= 0) UIB.list.splice(k, 1); };
    return B;
  }
  function uiCloseAll() { UIB.list.slice().forEach((B) => { try { B.destroy(); } catch (e) {} }); UIB.list = []; }
  function uiTickAll(dt) { UIB.list.forEach((B) => { try { B.tick(dt); } catch (e) { console.warn("board", e); } }); }
  /* közös fejléc + háttér */
  const UIBG = {};
  function uiImg(src) { if (UIBG[src]) return UIBG[src]; const im = new Image(); im.onload = () => { UIB.list.forEach((B) => { B.dirty = 1; }); }; im.src = src; UIBG[src] = im; return im; }
  function uiFrame(B, g, title, sub) { const w = B.o.w, h = B.o.h, im = uiImg("img/kapitanyi-hatter.jpg");
    uiRR(g, 0, 0, w, h, 34); g.save(); g.clip();
    if (im.complete && im.naturalWidth) { const k = Math.max(w / im.naturalWidth, h / im.naturalHeight); g.drawImage(im, (w - im.naturalWidth * k) / 2, (h - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); } else { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#5b9fd6"); gr.addColorStop(.6, "#bcd8ea"); gr.addColorStop(.62, "#4f8f9a"); gr.addColorStop(1, "#2c5f6c"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, "rgba(4,18,40,.72)"); sh.addColorStop(.18, "rgba(4,18,40,.35)"); sh.addColorStop(1, "rgba(4,18,40,.55)"); g.fillStyle = sh; g.fillRect(0, 0, w, h); g.restore();
    uiRR(g, 3, 3, w - 6, h - 6, 32); g.lineWidth = 6; g.strokeStyle = "rgba(212,161,58,.95)"; g.stroke();
    g.fillStyle = "rgba(255,255,255,.35)"; uiRR(g, w / 2 - 70, 14, 140, 10, 5); g.fill();   /* fogó (VR-ben itt lehet megfogni) */
    g.fillStyle = "#ffd166"; uiFit(g, title, w - 120, 54, 900); g.textAlign = "center"; g.fillText(title, w / 2, 82); if (sub) { g.fillStyle = "#ffffff"; uiFit(g, sub, w - 120, 30, 600); g.fillText(sub, w / 2, 122); } g.textAlign = "left"; }
  function uiCard(g, x, y, w, h) { uiRR(g, x, y, w, h, 24); g.fillStyle = "rgba(6,22,48,.78)"; g.fill(); g.lineWidth = 2; g.strokeStyle = "rgba(255,255,255,.22)"; g.stroke(); }
  function uiH(g, t, x, y) { g.fillStyle = "#ffd166"; g.font = `900 30px ${UIF}`; g.fillText(t, x, y); }

  /* ---------------------------------------------------------------- PONTOZÁS (RRS A függelék, alacsony pontszámú rendszer) */
  function vrSeriesLoad() { try { const s = JSON.parse(localStorage.getItem("zephyr-sorozat") || "null"); if (s && s.races) return s; } catch (e) {} return { races: [], done: false, id: Date.now() }; }
  function vrSeriesSave() { try { localStorage.setItem("zephyr-sorozat", JSON.stringify(VRR.series)); } catch (e) {} }
  function vrSeriesAdd() {
    const S = VRR; if (!S.series || S.series.done) S.series = { races: [], done: false, id: Date.now() };
    const entries = 1 + S.riv.length, rows = []; let place = 0;
    S.res.forEach((q) => { const voidAI = q.ai && q.human; let pts, code = q.code || "";
      if (q.dnf || voidAI) { pts = entries + 1; code = voidAI ? "DNC" : code || "DNF"; } else { place++; pts = place; }
      rows.push({ n: q.me ? S.meName : q.n, me: !!q.me, pts, place: q.dnf || voidAI ? 0 : place, code, t: q.t, est: !!q.est, ai: !!q.ai, human: !!q.human }); });
    [S].concat(S.riv).forEach((o) => { const nm = o === S ? S.meName : o.o.name; if (!rows.some((r) => r.n === nm)) rows.push({ n: nm, me: o === S, pts: entries + 1, place: 0, code: "DNS" }); });
    S.series.races.push({ lvl: S.lvl, venue: S.venue ? S.venue.n : "", course: S.C.name, cls: S.cls.id, rows, fouls: (S.fouls || []).slice(0, 12) });
    if (S.series.races.length >= 5) { S.series.done = true; S.series.final = vrSeriesTable(S.series); vrTrophyAward(S.series.final); }
    vrSeriesSave();
  }
  function vrSeriesTable(ser) {
    const tot = {}; ser.races.forEach((r, ri) => r.rows.forEach((q) => { const key = q.me ? "__me" : q.n, e = tot[key] || (tot[key] = { n: q.n, me: q.me, pts: [], sum: 0 }); e.pts[ri] = q.pts; e.sum += q.pts; e.n = q.n; }));
    const E = 1 + 3; Object.values(tot).forEach((e) => { for (let i = 0; i < ser.races.length; i++) if (e.pts[i] == null) { e.pts[i] = E + 1; e.sum += E + 1; } });
    const arr = Object.values(tot); arr.sort((a, b) => { if (a.sum !== b.sum) return a.sum - b.sum; const sa = a.pts.slice().sort((x, y) => x - y), sb = b.pts.slice().sort((x, y) => x - y); for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] - sb[i]; for (let i = a.pts.length - 1; i >= 0; i--) if (a.pts[i] !== b.pts[i]) return a.pts[i] - b.pts[i]; return 0; });
    return arr;
  }
  function vrTrophies() { try { const t = JSON.parse(localStorage.getItem("zephyr-trofeak") || "[]"); return Array.isArray(t) ? t : []; } catch (e) { return []; } }
  function vrTrophyAward(tab) { const S = VRR, list = vrTrophies(), d = new Date(), ds = `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}.`;
    tab.slice(0, 3).forEach((e, i) => list.push({ name: e.n.replace(" (te)", ""), me: !!e.me, place: i + 1, total: e.sum, date: ds, cls: S.cls.n, photo: e.me && S.prof && S.prof.photo ? S.prof.photo : "" }));
    try { localStorage.setItem("zephyr-trofeak", JSON.stringify(list.slice(-60))); } catch (e) { try { localStorage.setItem("zephyr-trofeak", JSON.stringify(list.slice(-60).map((q) => Object.assign({}, q, { photo: "" })))); } catch (e2) {} } }
  /* serleg rajza a vásznon (arany / ezüst / bronz) */
  function uiCup(g, x, y, s, place) { const c = place === 1 ? ["#ffe08a", "#d4a13a", "#8a6414"] : place === 2 ? ["#f4f6f8", "#b8c0c8", "#6d7680"] : ["#f2c39a", "#c07a3e", "#6e3f17"];
    const gr = g.createLinearGradient(x - s * .5, 0, x + s * .5, 0); gr.addColorStop(0, c[2]); gr.addColorStop(.35, c[0]); gr.addColorStop(.6, c[1]); gr.addColorStop(1, c[2]); g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - s * .42, y - s * .9); g.quadraticCurveTo(x - s * .42, y - s * .25, x - s * .08, y - s * .12); g.lineTo(x - s * .06, y + s * .15); g.lineTo(x - s * .26, y + s * .3); g.lineTo(x + s * .26, y + s * .3); g.lineTo(x + s * .06, y + s * .15); g.lineTo(x + s * .08, y - s * .12); g.quadraticCurveTo(x + s * .42, y - s * .25, x + s * .42, y - s * .9); g.closePath(); g.fill();
    g.lineWidth = s * .07; g.strokeStyle = c[1]; [-1, 1].forEach((sd) => { g.beginPath(); g.arc(x + sd * s * .44, y - s * .62, s * .17, sd > 0 ? -Math.PI / 2 : Math.PI / 2, sd > 0 ? Math.PI / 2 : Math.PI * 1.5, sd < 0); g.stroke(); });
    g.fillStyle = "#3a2a1a"; g.fillRect(x - s * .34, y + s * .3, s * .68, s * .2); g.fillStyle = c[0]; g.font = `900 ${s * .16}px ${UIF}`; g.textAlign = "center"; g.fillText(String(place), x, y + s * .46); g.textAlign = "left";
    g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(x - s * .2, y - s * .62, s * .05, s * .2, -.2, 0, TAU); g.fill(); }

  /* ---------------------------------------------------------------- PÁLYAMODELL (tervrajz + forgó 3D) a vásznon */
  function vrCourseLegs(C) { const lm = { x: 0, z: 0 }, pts = [lm].concat(C.marks, [lm]), up = (VRR.cls || BOATCLS.zephyr).up, out = [];
    for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], d = Math.hypot(b.x - a.x, b.z - a.z), brg = Math.atan2(b.x - a.x, -(b.z - a.z)), twa = Math.abs(wrapA(brg - C.wf)) * R2D;
      out.push({ a, b, d, brg, twa, kind: twa < up + 2 ? "cirkálás (szél ellen, fordulókkal)" : twa > 150 ? "hátszél (perdülésekkel, spinakkerrel)" : twa > 110 ? "bővszél (spinakker)" : twa > 70 ? "félszél" : "élesszél", path: vrLegPath(a, b, C.wf) }); }
    return out; }
  function drawCoursePlan(g, C, x, y, w, h, t) {
    const legs = vrCourseLegs(C), pts = [{ x: 0, z: 0 }].concat(C.marks, [C.line.a, C.line.b]); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; pts.forEach((p) => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); });
    legs.forEach((l) => l.path.forEach((p) => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }));
    /* a pályát úgy forgatjuk, hogy a szél felülről fújjon (a tervrajz szabványos nézete) */
    const ca = Math.cos(C.wf), sa = Math.sin(C.wf);   /* a szél felülről fúj (a tervrajz szabványos nézete) */
    const R = (p) => ({ x: p.x * ca + p.z * sa, z: -p.x * sa + p.z * ca });
    let rx0 = 1e9, rx1 = -1e9, rz0 = 1e9, rz1 = -1e9; pts.concat(...legs.map((l) => l.path)).forEach((p) => { const q = R(p); rx0 = Math.min(rx0, q.x); rx1 = Math.max(rx1, q.x); rz0 = Math.min(rz0, q.z); rz1 = Math.max(rz1, q.z); });
    const pad = 46, k = Math.min((w - pad * 2) / Math.max(1, rx1 - rx0), (h - pad * 2) / Math.max(1, rz1 - rz0)), cx = x + w / 2 - (rx0 + rx1) / 2 * k, cz = y + h / 2 - (rz0 + rz1) / 2 * k;
    const P = (p) => { const q = R(p); return [cx + q.x * k, cz + q.z * k]; };
    /* víz + rács */
    uiRR(g, x, y, w, h, 18); const wg = g.createLinearGradient(x, y, x, y + h); wg.addColorStop(0, "#0d4a63"); wg.addColorStop(1, "#0a3a52"); g.fillStyle = wg; g.fill();
    g.save(); uiRR(g, x, y, w, h, 18); g.clip(); g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 1; const step = 50 * k; for (let gx = cx % step; gx < x + w; gx += step) { g.beginPath(); g.moveTo(gx, y); g.lineTo(gx, y + h); g.stroke(); } for (let gz = cz % step; gz < y + h; gz += step) { g.beginPath(); g.moveTo(x, gz); g.lineTo(x + w, gz); g.stroke(); }
    /* ajánlott útvonal (a cirkálás cikcakkja) és a szakaszok */
    legs.forEach((l, i) => { g.strokeStyle = "rgba(255,209,102,.9)"; g.lineWidth = 4; g.setLineDash(l.path.length > 2 ? [14, 10] : []); g.beginPath(); l.path.forEach((p, j) => { const q = P(p); if (j) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke(); g.setLineDash([]);
      const a = P(l.a), b = P(l.b), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; g.fillStyle = "rgba(4,18,40,.85)"; uiRR(g, mx - 52, my - 17, 104, 34, 10); g.fill(); g.fillStyle = "#fff"; g.font = `800 22px ${UIF}`; g.textAlign = "center"; g.fillText(`${i + 1}. ${Math.round(l.d)} m`, mx, my + 8); g.textAlign = "left"; });
    /* kis hajó végigfut a pályán (animáció) */
    { const all = []; legs.forEach((l) => { for (let j = 0; j + 1 < l.path.length; j++) all.push([l.path[j], l.path[j + 1]]); }); const Ls = all.map((s) => Math.hypot(s[1].x - s[0].x, s[1].z - s[0].z)), tot = Ls.reduce((a2, b2) => a2 + b2, 0); let u = ((t * .08) % 1) * tot, si = 0; while (si < Ls.length - 1 && u > Ls[si]) { u -= Ls[si]; si++; }
      const s0 = all[si], f = Ls[si] ? u / Ls[si] : 0, p = { x: s0[0].x + (s0[1].x - s0[0].x) * f, z: s0[0].z + (s0[1].z - s0[0].z) * f }, q = P(p), q2 = P(s0[1]), an = Math.atan2(q2[1] - q[1], q2[0] - q[0]);
      g.save(); g.translate(q[0], q[1]); g.rotate(an + Math.PI / 2); g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(0, -14); g.quadraticCurveTo(8, 0, 6, 12); g.lineTo(-6, 12); g.quadraticCurveTo(-8, 0, 0, -14); g.fill(); g.fillStyle = "#c8102e"; g.beginPath(); g.moveTo(0, -10); g.lineTo(9, 6); g.lineTo(0, 4); g.fill(); g.restore(); }
    /* rajt-/célkapu */
    { const a = P(C.line.a), b = P(C.line.b); g.strokeStyle = "#7CFC9A"; g.lineWidth = 4; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.setLineDash([]);
      g.fillStyle = "#ff7a00"; g.beginPath(); g.arc(a[0], a[1], 10, 0, TAU); g.fill(); g.fillStyle = "#e9eef2"; uiRR(g, b[0] - 14, b[1] - 8, 28, 16, 4); g.fill(); g.fillStyle = "#7CFC9A"; g.font = `800 22px ${UIF}`; g.textAlign = "center"; g.fillText("RAJT / CÉL", (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 34); g.textAlign = "left"; }
    /* bóják a kerülés irányával (bal kéz felől = felülről nézve az óramutatóval ellentétesen) */
    C.marks.forEach((m, i) => { const q = P(m); g.fillStyle = i === C.marks.length - 1 && C.marks.length > 2 ? "#ffd166" : "#ff7a00"; g.beginPath(); g.arc(q[0], q[1], 13, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = "#fff"; g.stroke();
      g.fillStyle = "#14161b"; g.font = `900 17px ${UIF}`; g.textAlign = "center"; g.fillText(String(i + 1), q[0], q[1] + 6); g.textAlign = "left";
      g.strokeStyle = "#ffe14d"; g.lineWidth = 3.5; const r0 = 30, a0 = t * 1.2; g.beginPath(); g.arc(q[0], q[1], r0, a0, a0 + Math.PI * 1.4, true); g.stroke(); const ae = a0 - Math.PI * 1.4; g.fillStyle = "#ffe14d"; g.beginPath(); const hx = q[0] + Math.cos(ae) * r0, hy = q[1] + Math.sin(ae) * r0, tx = Math.sin(ae), ty = -Math.cos(ae); g.moveTo(hx + tx * 12, hy + ty * 12); g.lineTo(hx - ty * 8, hy + tx * 8); g.lineTo(hx + ty * 8, hy - tx * 8); g.fill(); });
    /* szélnyíl (felülről fúj) */
    { const wx = x + w - 70, wy = y + 60; g.fillStyle = "#58c7ff"; g.font = `900 22px ${UIF}`; g.textAlign = "center"; g.fillText("SZÉL", wx, wy - 18); g.strokeStyle = "#58c7ff"; g.lineWidth = 6; g.beginPath(); g.moveTo(wx, wy - 6); g.lineTo(wx, wy + 52); g.stroke(); g.beginPath(); g.moveTo(wx - 14, wy + 40); g.lineTo(wx, wy + 62); g.lineTo(wx + 14, wy + 40); g.fill(); g.textAlign = "left"; }
    { g.fillStyle = "rgba(255,255,255,.75)"; g.font = `700 18px ${UIF}`; const sm = 50 * k; g.fillRect(x + 24, y + h - 30, sm, 4); g.fillText("50 m", x + 30 + sm, y + h - 22); }
    g.restore();
  }
  /* „3D” pályamodell: perspektivikusan rajzolt víztábla, forogva, rajta bóják (hengerek), a kapu, az útvonal szalagja és a kis hajó */
  function drawCourse3D(g, C, x, y, w, h, t) {
    uiRR(g, x, y, w, h, 18); const sk = g.createLinearGradient(x, y, x, y + h); sk.addColorStop(0, "#8cc3e8"); sk.addColorStop(.42, "#d8ecf6"); sk.addColorStop(.43, "#2c7c92"); sk.addColorStop(1, "#0d4a63"); g.fillStyle = sk; g.fill();
    g.save(); uiRR(g, x, y, w, h, 18); g.clip();
    const legs = vrCourseLegs(C), all = [{ x: 0, z: 0 }].concat(C.marks); let R0 = 50; all.concat(...legs.map((l) => l.path)).forEach((p) => { R0 = Math.max(R0, Math.hypot(p.x, p.z)); });
    const yaw = t * .25, cy = Math.cos(yaw), sy = Math.sin(yaw), el = .7, D = 2.15, f = w * 1.75;
    const pr = (p, hgt) => { const X = (p.x * cy - p.z * sy) / R0, Z = -(p.x * sy + p.z * cy) / R0, Y = (hgt || 0) / R0, Yp = Y * Math.cos(el) + Z * Math.sin(el), Zp = -Y * Math.sin(el) + Z * Math.cos(el) + D; return [x + w / 2 + X / Zp * f, y + h * .6 - Yp / Zp * f, Zp]; };
    /* a víz korongja és gyűrűi */
    for (let r = 1; r >= .25; r -= .25) { g.strokeStyle = `rgba(255,255,255,${.08 + (1 - r) * .05})`; g.lineWidth = 1.5; g.beginPath(); for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU, q = pr({ x: Math.cos(a) * R0 * r * 1.15, z: Math.sin(a) * R0 * r * 1.15 }); if (k) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); } g.stroke(); }
    /* útvonal-szalag */
    g.strokeStyle = "rgba(255,209,102,.95)"; g.lineWidth = 4; legs.forEach((l) => { g.beginPath(); l.path.forEach((p, j) => { const q = pr(p, 0); if (j) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke(); });
    /* kapu */
    { const a = pr(C.line.a), b = pr(C.line.b); g.strokeStyle = "#7CFC9A"; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.setLineDash([]); }
    /* bóják hengerként, távolság szerint rendezve */
    const items = C.marks.map((m, i) => ({ m, i, z: pr(m)[2] })).concat([{ m: C.line.a, i: -1, z: pr(C.line.a)[2] }, { m: C.line.b, i: -2, z: pr(C.line.b)[2] }]).sort((a, b) => b.z - a.z);
    items.forEach(({ m, i }) => { const b0 = pr(m, 0), b1 = pr(m, R0 * .09), r = Math.max(4, 10 / b0[2]); g.fillStyle = i === -2 ? "#e9eef2" : i < 0 ? "#ff7a00" : i === C.marks.length - 1 && C.marks.length > 2 ? "#ffd166" : "#ff7a00"; g.fillRect(b1[0] - r, b1[1], r * 2, b0[1] - b1[1]); g.beginPath(); g.ellipse(b1[0], b1[1], r, r * .4, 0, 0, TAU); g.fill();
      if (i >= 0) { g.fillStyle = "#fff"; g.font = `900 ${Math.round(r * 1.7)}px ${UIF}`; g.textAlign = "center"; g.fillText(String(i + 1), b1[0], b1[1] - r); g.textAlign = "left"; } });
    /* a kis hajó a szalagon */
    { const segs = []; legs.forEach((l) => { for (let j = 0; j + 1 < l.path.length; j++) segs.push([l.path[j], l.path[j + 1]]); }); const Ls = segs.map((s) => Math.hypot(s[1].x - s[0].x, s[1].z - s[0].z)), tot = Ls.reduce((a, b) => a + b, 0); let u = ((t * .08) % 1) * tot, si = 0; while (si < Ls.length - 1 && u > Ls[si]) { u -= Ls[si]; si++; }
      const s0 = segs[si], fr = Ls[si] ? u / Ls[si] : 0, p = { x: s0[0].x + (s0[1].x - s0[0].x) * fr, z: s0[0].z + (s0[1].z - s0[0].z) * fr }, q0 = pr(p, 0), q1 = pr(p, R0 * .11), s = 9 / q0[2];
      g.fillStyle = "#fff"; g.beginPath(); g.ellipse(q0[0], q0[1], s * 1.4, s * .5, 0, 0, TAU); g.fill(); g.fillStyle = "#c8102e"; g.beginPath(); g.moveTo(q0[0], q0[1] - 2); g.lineTo(q1[0], q1[1]); g.lineTo(q0[0] + s * 1.2, q0[1] - 2); g.fill(); }
    g.fillStyle = "rgba(4,18,40,.7)"; uiRR(g, x + 14, y + 12, 250, 34, 10); g.fill(); g.fillStyle = "#fff"; g.font = `800 20px ${UIF}`; g.fillText("3D PÁLYAMODELL", x + 26, y + 36);
    g.restore();
  }

  /* ---------------------------------------------------------------- KAPITÁNYI TÁJÉKOZTATÓ */
  function vrBriefOpen() {
    const S = VRR; S.briefShown = true; if (S.brief) { S.brief.show(true); return; }
    const next = (S.lvl || 0) + 1, C2 = vrCourse(next); S.briefNext = { lvl: next, C: C2, venue: vrVenue(next) }; vrLimitSetC(C2);
    S.brief = uiBoard({ w: 1600, h: 1000, mw: 1.75, dist: 1.6, y: -.05, fps: 8, bar: 140, draw: drawBrief }); S.brief.page = 0; S.brief.show(true);
    if (S.podium) S.podium.visible = false; if (S.foulB) S.foulB.visible = false; vrFoulDom(false);
  }
  function vrLimitSetC(C) { const keep = VRR.C; vrLimitSet(C); VRR.C = keep; }
  function vrBriefClose() { const S = VRR; if (S.brief) { S.brief.destroy(); S.brief = null; } }
  function vrBriefTick(dt) { uiTickAll(dt); }
  function drawBrief(B, g) {
    const S = VRR, N = S.briefNext, ser = S.series || { races: [] }, last = ser.races[ser.races.length - 1], W2 = B.o.w, H2 = B.o.h;
    const fin = ser.done && ser.final;
    uiFrame(B, g, fin ? "🏆 A SOROZAT VÉGEREDMÉNYE" : "KAPITÁNYI TÁJÉKOZTATÓ", fin ? `${ser.races.length} futam · alacsony pontszámú rendszer (RRS A4) · a legkevesebb pont nyer` : `${S.lvl}. futam után · sorozat: ${ser.races.length}/5 futam · ${S.cls.n}`);
    if (B.page === 1 || fin) { drawSeries(B, g, ser, fin); return; }
    /* bal oszlop: eredmény + szabálytalanságok */
    uiCard(g, 34, 150, 700, 400); uiH(g, "AZ ELŐZŐ FUTAM", 60, 196); g.fillStyle = "rgba(255,255,255,.8)"; g.font = `600 20px ${UIF}`; g.fillText(`${S.C.name} · ${S.venue ? S.venue.n : ""}`, 60, 226);
    (last ? last.rows : []).forEach((q, i) => { const y = 270 + i * 64; g.fillStyle = q.me ? "rgba(212,161,58,.28)" : "rgba(255,255,255,.06)"; uiRR(g, 52, y - 34, 664, 54, 12); g.fill();
      g.fillStyle = q.place === 1 ? "#ffd166" : "#fff"; g.font = `900 30px ${UIF}`; g.fillText(q.place ? q.place + "." : "–", 66, y + 4);
      g.font = `800 26px ${UIF}`; g.fillStyle = "#fff"; uiFit(g, q.n, 300, 26, 800); g.fillText(q.n, 120, y + 2);
      g.font = `600 20px ${UIF}`; g.fillStyle = q.code ? "#ff9a8a" : "rgba(255,255,255,.85)"; g.fillText(q.code === "TLE" ? "időlimit után (TLE)" : q.code === "DNC" ? "gépi vezetés – nem számít" : q.code ? q.code : (q.est ? "becsült: " : "") + mmss(q.t || 0), 440, y + 2);
      g.font = `900 26px ${UIF}`; g.fillStyle = "#ffd166"; g.textAlign = "right"; g.fillText(q.pts + " p", 704, y + 4); g.textAlign = "left";
      if (q.ai && q.human) { g.fillStyle = "#ff9a8a"; g.font = `700 16px ${UIF}`; g.fillText("⚠ a játékos kiesett – a gép vezette tovább", 120, y + 22); } });
    uiCard(g, 34, 566, 700, 300); uiH(g, "SZABÁLYTALANSÁGOK", 60, 610);
    const F = (last && last.fouls) || []; g.font = `600 21px ${UIF}`;
    if (!F.length) { g.fillStyle = "#7CFC9A"; g.font = `800 26px ${UIF}`; g.fillText("✓ Tiszta futam – nem volt ütközés.", 60, 660); g.fillStyle = "rgba(255,255,255,.8)"; g.font = `600 20px ${UIF}`; uiWrap(g, VR_R14, 60, 700, 650, 28, 3); }
    else { let yy = 650; F.slice(0, 4).forEach((f) => { const R = VR_RRS[f.n] || VR_RRS[10]; g.fillStyle = "#ffd166"; g.font = `800 21px ${UIF}`; uiWrap(g, `${f.bad} ⟷ ${f.other}: ${f.bad} a hibás`, 60, yy, 650, 26, 1); yy += 26; g.fillStyle = "#fff"; g.font = `600 18px ${UIF}`; yy += uiWrap(g, `${R[0]}: ${R[1]}`, 60, yy, 650, 23, 3) * 23 + 10; }); }
    /* jobb oldal: a következő futam */
    uiCard(g, 754, 150, 812, 716); uiH(g, `KÖVETKEZŐ: ${N.lvl}. FUTAM – ${N.C.name.toUpperCase()}`, 780, 196);
    { const tx = `${N.venue.n} · ${N.C.wxn || "szél"} ${(N.C.tws / KN).toFixed(0)} csomó · időlimit ${mmss(N.C.limit)} (a várható idő ~3×)`; g.fillStyle = "#fff"; uiFit(g, tx, 770, 21, 600); g.fillText(tx, 780, 228); }
    drawCoursePlan(g, N.C, 774, 244, 470, 430, B.t); drawCourse3D(g, N.C, 1256, 244, 296, 430, B.t);
    const legs = vrCourseLegs(N.C); g.font = `700 19px ${UIF}`; legs.forEach((l, i) => { const y = 702 + i * 30; if (y > 850) return; g.fillStyle = "#ffd166"; g.fillText(`${i + 1}.`, 780, y); g.fillStyle = "#fff"; g.fillText(`${i ? i + ". bója" : "rajt"} → ${i + 1 < legs.length ? (i + 1) + ". bója" : "cél (a két bója KÖZÖTT)"} · ${Math.round(l.d)} m · ${l.kind}`, 812, y); });
    { const tx = "A bójákat bal kéz felől kell megkerülni (felülről nézve az óramutatóval ellentétesen). A szaggatott vonal az ajánlott cirkálási útvonal."; g.fillStyle = "rgba(255,255,255,.75)"; uiFit(g, tx, 770, 17, 600); g.fillText(tx, 780, 860); }
    /* gombok */
    const by = 890, bh = 84;
    B.btn(34, by, 460, bh, `▶  Indulás: ${N.lvl}. futam`, () => { vrBriefClose(); vrSetup(N.lvl); }, { gold: true });
    B.btn(510, by, 300, bh, "↻ Előző újra", () => { vrBriefClose(); vrSetup(S.lvl); });
    B.btn(826, by, 300, bh, "🏆 Eredménylista", () => { B.page = 1; B.dirty = 1; });
    B.btn(1142, by, 424, bh, "⚓ Vissza a kikötőbe", () => { vrBriefClose(); vrToHarbor(); });
  }
  function drawSeries(B, g, ser, fin) {
    const S = VRR, tab = vrSeriesTable(ser), nR = ser.races.length;
    uiCard(g, 34, 150, 1532, fin ? 470 : 700);
    g.font = `800 22px ${UIF}`; g.fillStyle = "#ffd166"; g.fillText("HELY", 60, 196); g.fillText("VERSENYZŐ", 160, 196); for (let i = 0; i < 5; i++) g.fillText(`${i + 1}. f.`, 700 + i * 120, 196); g.fillText("ÖSSZESEN", 1340, 196);
    tab.forEach((e, i) => { const y = 250 + i * 70; g.fillStyle = e.me ? "rgba(212,161,58,.3)" : "rgba(255,255,255,.07)"; uiRR(g, 50, y - 40, 1500, 60, 14); g.fill();
      g.fillStyle = i < 3 ? ["#ffd166", "#e6edf2", "#e0a070"][i] : "#fff"; g.font = `900 34px ${UIF}`; g.fillText(`${i + 1}.`, 66, y + 2);
      if (e.me && S.prof && S.prof.photo) { const im = uiImg(S.prof.photo); if (im.complete && im.naturalWidth) { g.save(); g.beginPath(); g.arc(186, y - 10, 24, 0, TAU); g.clip(); g.drawImage(im, 162, y - 34, 48, 48); g.restore(); } }
      g.fillStyle = "#fff"; uiFit(g, e.n, 440, 30, 800); g.fillText(e.n, 222, y + 2);
      for (let k = 0; k < 5; k++) { g.font = `700 28px ${UIF}`; g.fillStyle = k < nR ? "#fff" : "rgba(255,255,255,.3)"; g.fillText(k < nR ? String(e.pts[k]) : "–", 716 + k * 120, y + 2); }
      g.font = `900 34px ${UIF}`; g.fillStyle = "#ffd166"; g.fillText(e.sum + " p", 1350, y + 2); });
    { const tx = "Pontozás: a Vitorlázás Versenyszabályai A4 – 1. hely 1 pont … nem ért be / időlimit / kizárás: a nevezők száma + 1 (5 pont). Holtversenynél a több jobb helyezés, majd az utolsó futam dönt (A8)."; g.fillStyle = "rgba(255,255,255,.75)"; uiFit(g, tx, 1480, 18, 600); g.fillText(tx, 60, fin ? 600 : 830); }
    if (fin) { /* díjátadó: az első három serlege */
      tab.slice(0, 3).forEach((e, i) => { const x = [800, 470, 1130][i], y = [690, 712, 722][i], s = [118, 98, 90][i]; uiCup(g, x, y, s, i + 1); g.fillStyle = "#fff"; g.textAlign = "center"; uiFit(g, e.n, 300, 26, 900); g.fillText(e.n, x, y + s * .72); g.font = `700 20px ${UIF}`; g.fillStyle = "#ffd166"; g.fillText(`${i + 1}. hely · ${e.sum} pont`, x, y + s * .72 + 26); g.textAlign = "left"; });
      const me = tab.findIndex((e) => e.me); g.fillStyle = "#fff"; g.textAlign = "center"; uiFit(g, "Gratulálunk! A serleged a trófeateremben, a neved alatt vár (kikötő → Eredmények és trófeák).", 1400, 24, 800); g.fillText(me >= 0 && me < 3 ? "Gratulálunk! A serleged a trófeateremben, a neved alatt vár (kikötő → Eredmények és trófeák)." : "Az első hármas serlege a nevük alatt a trófeaterembe került.", 800, 650); g.textAlign = "left"; }
    const by = 890, bh = 84;
    if (fin) { B.btn(34, by, 600, bh, "▶ Új sorozat: 1. futam", () => { VRR.series = { races: [], done: false, id: Date.now() }; vrSeriesSave(); vrBriefClose(); vrSetup(1); }, { gold: true }); B.btn(660, by, 420, bh, "⚓ Vissza a kikötőbe", () => { vrBriefClose(); vrToHarbor(); }); }
    else { B.btn(34, by, 520, bh, "‹ Vissza a tájékoztatóhoz", () => { B.page = 0; B.dirty = 1; }, { gold: true }); B.btn(580, by, 420, bh, "⚓ Vissza a kikötőbe", () => { vrBriefClose(); vrToHarbor(); }); }
  }
  /* vissza a kikötőbe (a verseny világát bezárja, a kikötőt nyitja) */
  function vrToHarbor() { try { vrNetLeaveRace && vrNetLeaveRace(); } catch (e) {} setTimeout(() => { W._raceGo = false; W.open("harbor"); }, 30); }
