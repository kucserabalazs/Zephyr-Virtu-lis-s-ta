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
      /* 2026-11-14 (tulajdonos: „sokkal érthetőbb, kidolgozottabb, balatoni hangulatú”): domború, színátmenetes gomb rajzolt ikonnal és magyarázó alsorral */
      let ic = st.ic || null, lab = String(label); if (!ic) { const m = uiEmo(lab); if (m) { ic = m[0]; lab = m[1]; } }
      const r = st.r != null ? st.r : Math.min(22, h / 3), pri = st.gold, kind = st.off ? "off" : pri ? "gold" : st.green ? "green" : st.red ? "red" : st.night || /^rgba\(20,24,70/.test(st.bg || "") ? "night" : "blue";
      const PAL = { blue: ["#1d5a8e", "#0d3560", "#e9c46a"], gold: ["#ffe08a", "#d99a26", "#fff1c4"], green: ["#2aa866", "#16703f", "#bff5d2"], red: ["#d2433a", "#8f1f19", "#ffd1cc"], night: ["#2b3a86", "#121a4a", "#c9b6ff"], off: ["#3a4656", "#273140", "#6b7787"] }[kind];
      g.save(); g.shadowColor = hv ? "rgba(255,214,102,.75)" : "rgba(0,0,0,.45)"; g.shadowBlur = hv ? 26 : 12; g.shadowOffsetY = hv ? 0 : 5;
      uiRR(g, x, y, w, h, r); const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, hv ? uiLite(PAL[0], .18) : PAL[0]); gr.addColorStop(1, hv ? uiLite(PAL[1], .15) : PAL[1]); g.fillStyle = gr; g.fill(); g.restore();
      g.save(); uiRR(g, x, y, w, h, r); g.clip(); const hl = g.createLinearGradient(0, y, 0, y + h * .5); hl.addColorStop(0, "rgba(255,255,255,.28)"); hl.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = hl; g.fillRect(x, y, w, h * .5);
      if (pri) { g.strokeStyle = "rgba(255,255,255,.22)"; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); for (let xx = 0; xx <= w; xx += 8) { const yy = y + h - 12 - k * 9 + Math.sin(xx / 26 + k * 1.7) * 3.5; if (xx) g.lineTo(x + xx, yy); else g.moveTo(x, yy); } g.stroke(); } }   /* hullámok a fő gomb alján */
      g.restore(); uiRR(g, x + 1, y + 1, w - 2, h - 2, r); g.lineWidth = hv ? 4 : 2.5; g.strokeStyle = hv ? "#fff3c4" : PAL[2]; g.globalAlpha = st.off ? .5 : .95; g.stroke(); g.globalAlpha = 1;
      const fg = pri ? "#0b2f5e" : st.off ? "rgba(255,255,255,.45)" : "#ffffff", sub = st.sub, sz = Math.min(h * .62, 64);
      let tx = x + w / 2, al = "center", tw = w - 28;
      if (ic) { const bx = x + Math.min(h * .55, 58), by = y + h / 2, br = Math.min(h * .34, 34); g.fillStyle = pri ? "rgba(11,47,94,.16)" : "rgba(255,255,255,.12)"; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill(); uiIcon(g, ic, bx, by, br * 1.15, pri ? "#0b2f5e" : st.off ? "#8794a3" : "#ffe08a");
        if (sub || w > 300) { al = "left"; tx = bx + br + 18; tw = x + w - tx - 18; } else { tw = w - (bx - x) - br - 26; tx = bx + br + 10 + tw / 2; } }
      g.textAlign = al; g.textBaseline = "middle"; g.fillStyle = fg;
      const fs = uiFit(g, lab, tw, st.fs || Math.min(40, h * (sub ? .34 : .44)), 800);
      if (sub) { g.fillText(lab, tx, y + h * .38); g.fillStyle = pri ? "rgba(11,47,94,.8)" : "rgba(214,232,255,.85)"; uiFit(g, sub, tw, Math.min(22, h * .2), 600); g.fillText(sub, tx, y + h * .7); } else g.fillText(lab, tx, y + h / 2 + 1);
      g.textAlign = "left"; g.textBaseline = "alphabetic"; void sz; return fs; };
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
  /* ---------------------------------------------------------------- 2026-11-14: BALATONI TÁBLA-STÍLUS – kötélkeret, kikötői fejléc a Tihanyi-félsziget sziluettjével,
     jelzőzászló-füzér, sötét tókék kártyák aranyszegéllyel, rajzolt ikonok (Quest-en az emoji nem mindig szép) */
  function uiLite(hex, k) { const c = new THREE.Color(hex); c.lerp(new THREE.Color("#ffffff"), k); return "#" + c.getHexString(); }
  const UI_EMO = [["⛵", "boat"], ["🌙", "moon"], ["🏆", "cup"], ["👥", "people"], ["⚙", "gear"], ["🎓", "cap"], ["‹", "back"], ["⚓", "anchor"], ["▶", "play"], ["↻", "refresh"], ["↺", "refresh"], ["✎", "pencil"], ["📷", "camera"], ["✓", "check"], ["◀", "left"], ["✉", "mail"], ["⏳", "clock"], ["✕", "x"], ["●", "dot"], ["○", "ring"], ["🗺", "map"]];
  function uiEmo(t) { for (const [e, k] of UI_EMO) if (t.startsWith(e)) return [k, t.slice(e.length).replace(/^\uFE0F/, "").trim()]; if (/ ▶$/.test(t)) return ["right", t.replace(/ ▶$/, "")]; return null; }
  function uiIcon(g, k, cx, cy, s, col) {
    g.save(); g.translate(cx, cy); g.scale(s / 40, s / 40); g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round";
    const P = (pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (fill) { g.closePath(); g.fill(); } else g.stroke(); };
    if (k === "boat") { P([[2, -26], [2, 10], [22, 10]], true); P([[-3, -20], [-3, 10], [-18, 10]], true); P([[-24, 15], [24, 15], [16, 25], [-16, 25]], true); }
    else if (k === "moon") { g.beginPath(); g.arc(0, 0, 22, .6, TAU - .6 + TAU * 0); g.arc(9, -5, 18, TAU - .9, .9, true); g.fill(); [[18, -18], [24, 6]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill(); }); }
    else if (k === "cup") { P([[-18, -24], [18, -24], [14, -2], [4, 6], [4, 14], [12, 20], [-12, 20], [-4, 14], [-4, 6], [-14, -2]], true); g.lineWidth = 4.5; g.beginPath(); g.arc(-19, -13, 8, Math.PI / 2, Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(19, -13, 8, -Math.PI / 2, Math.PI / 2); g.stroke(); g.fillRect(-15, 21, 30, 6); }
    else if (k === "people") { [[-11, 1], [11, 1]].forEach(([x], i) => { g.beginPath(); g.arc(x, -12, 8, 0, TAU); g.fill(); g.beginPath(); g.arc(x, 22, 15, Math.PI, TAU); g.fill(); }); }
    else if (k === "gear") { for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * Math.PI / 4); g.fillRect(-5, -27, 10, 12); g.restore(); } g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill(); g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); }
    else if (k === "cap") { P([[-26, -6], [0, -18], [26, -6], [0, 6]], true); P([[-14, 0], [-14, 13], [0, 20], [14, 13], [14, 0], [0, 6]], true); g.lineWidth = 3; P([[22, -4], [22, 14]]); }
    else if (k === "back" || k === "left") { g.lineWidth = 6; P([[8, -18], [-10, 0], [8, 18]]); if (k === "back") P([[-10, 0], [22, 0]]); }
    else if (k === "right") { g.lineWidth = 6; P([[-8, -18], [10, 0], [-8, 18]]); }
    else if (k === "anchor") { g.lineWidth = 5; g.beginPath(); g.arc(0, -19, 6, 0, TAU); g.stroke(); P([[0, -13], [0, 22]]); P([[-12, -5], [12, -5]]); g.beginPath(); g.arc(0, 4, 20, Math.PI * .15, Math.PI * .85); g.stroke(); P([[-21, 2], [-19, 12], [-12, 8]]); P([[21, 2], [19, 12], [12, 8]]); }
    else if (k === "play") P([[-12, -20], [20, 0], [-12, 20]], true);
    else if (k === "refresh") { g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 18, -.3, Math.PI * 1.55); g.stroke(); P([[10, -24], [20, -12], [6, -8]], true); }
    else if (k === "pencil") { g.save(); g.rotate(-Math.PI / 4); g.fillRect(-6, -22, 12, 34); P([[-6, 14], [6, 14], [0, 26]], true); g.restore(); }
    else if (k === "camera") { g.fillRect(-24, -12, 48, 30); g.fillRect(-10, -19, 20, 8); g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(0, 3, 10, 0, TAU); g.fill(); g.globalCompositeOperation = "source-over"; g.beginPath(); g.arc(0, 3, 6, 0, TAU); g.fill(); }
    else if (k === "check") { g.lineWidth = 7; P([[-18, 0], [-5, 14], [20, -14]]); }
    else if (k === "mail") { g.lineWidth = 4; g.strokeRect(-22, -14, 44, 30); P([[-22, -14], [0, 4], [22, -14]]); }
    else if (k === "clock") { g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.stroke(); P([[0, -12], [0, 0], [10, 6]]); }
    else if (k === "x") { g.lineWidth = 6; P([[-15, -15], [15, 15]]); P([[15, -15], [-15, 15]]); }
    else if (k === "dot") { g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fill(); }
    else if (k === "ring") { g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.stroke(); }
    else if (k === "map") { P([[-24, -16], [-8, -22], [8, -16], [24, -22], [24, 18], [8, 24], [-8, 18], [-24, 24]], true); g.globalCompositeOperation = "destination-out"; g.lineWidth = 2.5; P([[-8, -22], [-8, 18]]); P([[8, -16], [8, 24]]); }
    else if (k === "wind") { g.lineWidth = 4.5; g.beginPath(); g.moveTo(-24, -8); g.lineTo(10, -8); g.arc(10, -15, 7, Math.PI / 2, -Math.PI * .7, true); g.stroke(); g.beginPath(); g.moveTo(-24, 4); g.lineTo(16, 4); g.arc(16, 12, 8, -Math.PI / 2, Math.PI * .7); g.stroke(); P([[-24, 15], [0, 15]]); }
    else if (k === "storm") { g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fill(); for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * Math.PI / 4); g.fillRect(-2, -26, 4, 8); g.restore(); } }
    else if (k === "user") { g.beginPath(); g.arc(0, -10, 11, 0, TAU); g.fill(); g.beginPath(); g.arc(0, 26, 22, Math.PI, TAU); g.fill(); }
    g.restore();
  }
  /* a fejléc alján: a Tihanyi-félsziget sziluettje az apátság két tornyával, vitorlák a vízen */
  function uiPanorama(g, x, y, w, h) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const hill = (col, amp, base, f, ph) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + h); for (let i = 0; i <= 80; i++) { const u = i / 80, yy = y + h - base - amp * (Math.sin(u * f + ph) * .5 + .5) * Math.sin(Math.PI * Math.min(1, u * 1.1)); g.lineTo(x + u * w, yy); } g.lineTo(x + w, y + h); g.closePath(); g.fill(); };
    hill("rgba(70,120,150,.35)", h * .55, h * .1, 5, 1); hill("rgba(36,86,112,.55)", h * .38, h * .06, 7.5, 2.2);
    /* a félsziget a jobb oldalon, rajta az apátság */
    const px = x + w * .72, py = y + h; g.fillStyle = "rgba(18,58,80,.85)"; g.beginPath(); g.moveTo(px - w * .2, py); g.quadraticCurveTo(px - w * .08, py - h * .62, px, py - h * .64); g.quadraticCurveTo(px + w * .1, py - h * .6, px + w * .2, py); g.fill();
    const ab = (dx) => { g.fillRect(px + dx - 3, py - h * .64 - 26, 6, 26); g.beginPath(); g.arc(px + dx, py - h * .64 - 27, 3.6, 0, TAU); g.fill(); g.fillRect(px + dx - .8, py - h * .64 - 38, 1.6, 9); }; ab(-6); ab(6); g.fillRect(px - 9, py - h * .64 - 14, 18, 14);
    /* vitorlák */
    [[.14, 1], [.31, .8], [.5, 1.1], [.88, .7]].forEach(([u, k]) => { const bx = x + w * u, by = y + h - 4; g.fillStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.moveTo(bx, by - 30 * k); g.lineTo(bx + 14 * k, by - 4); g.lineTo(bx, by - 4); g.fill(); g.beginPath(); g.moveTo(bx - 2, by - 26 * k); g.lineTo(bx - 10 * k, by - 4); g.lineTo(bx - 2, by - 4); g.fill(); g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(bx - 10 * k, by - 3, 24 * k, 3); });
    g.restore(); }
  function uiFrame(B, g, title, sub) { const w = B.o.w, h = B.o.h, im = uiImg("img/kapitanyi-hatter.jpg"), HH = 134;
    uiRR(g, 0, 0, w, h, 34); g.save(); g.clip();
    if (im.complete && im.naturalWidth) { const k = Math.max(w / im.naturalWidth, h / im.naturalHeight); g.drawImage(im, (w - im.naturalWidth * k) / 2, (h - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); } else { g.fillStyle = "#0e3a5a"; g.fillRect(0, 0, w, h); }
    const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, "rgba(5,22,44,.62)"); sh.addColorStop(.5, "rgba(6,34,60,.52)"); sh.addColorStop(1, "rgba(4,20,40,.74)"); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    /* fejléc */
    const hg = g.createLinearGradient(0, 0, 0, HH); hg.addColorStop(0, "rgba(5,20,42,.97)"); hg.addColorStop(1, "rgba(10,52,86,.93)"); g.fillStyle = hg; g.fillRect(0, 0, w, HH); uiPanorama(g, 0, HH - 58, w, 58);
    const gl = g.createLinearGradient(0, 0, w, 0); gl.addColorStop(0, "rgba(212,161,58,0)"); gl.addColorStop(.15, "#d4a13a"); gl.addColorStop(.85, "#d4a13a"); gl.addColorStop(1, "rgba(212,161,58,0)"); g.fillStyle = gl; g.fillRect(0, HH, w, 3);
    /* jelzőzászló-füzér a két felső sarokban (a nemzetközi jelzőzászlók színei) */
    const FL = [["#d61f26", "#fff"], ["#ffd21a", "#0b3a8a"], ["#0b3a8a", "#fff"], ["#fff", "#d61f26"], ["#1e8e4f", "#fff"], ["#ffd21a", "#d61f26"]];
    [[24, 1], [w - 24, -1]].forEach(([x0, sd]) => { g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 30); g.quadraticCurveTo(x0 + sd * 120, 62, x0 + sd * 250, 34); g.stroke();
      for (let i = 0; i < 7; i++) { const u = (i + .5) / 7, fx = x0 + sd * 250 * u, fy = 30 + (62 - 30) * 2 * u * (1 - u) * 1.9 - 4 * u, f = FL[i % FL.length]; g.fillStyle = f[0]; g.beginPath(); g.moveTo(fx - 12, fy); g.lineTo(fx + 12, fy); g.lineTo(fx, fy + 30); g.fill(); g.fillStyle = f[1]; g.beginPath(); g.moveTo(fx - 5, fy + 1); g.lineTo(fx + 5, fy + 1); g.lineTo(fx, fy + 13); g.fill(); } });
    g.restore();
    /* kötélkeret */
    uiRR(g, 4, 4, w - 8, h - 8, 31); g.lineWidth = 9; g.strokeStyle = "#a07a42"; g.stroke(); g.save(); uiRR(g, 4, 4, w - 8, h - 8, 31); g.lineWidth = 9; g.setLineDash([6, 6]); g.strokeStyle = "#e3c48a"; g.stroke(); g.restore();
    uiRR(g, 12, 12, w - 24, h - 24, 25); g.lineWidth = 1.5; g.strokeStyle = "rgba(255,230,170,.45)"; g.stroke();
    g.fillStyle = "rgba(255,255,255,.4)"; uiRR(g, w / 2 - 70, 15, 140, 9, 5); g.fill();   /* fogó (VR-ben itt lehet megfogni) */
    let t = String(title), ic = null; const em = uiEmo(t); if (em) { ic = em[0]; t = em[1]; }
    g.font = `800 52px Georgia, "Noto Serif", serif`; const fs = uiFit(g, t, w - 640, 52, 800); g.font = `800 ${fs}px Georgia, "Noto Serif", serif`; const tw = g.measureText(t).width;
    g.textAlign = "center"; g.fillStyle = "rgba(0,0,0,.45)"; g.fillText(t, w / 2 + 2, 74); const tg = g.createLinearGradient(0, 30, 0, 80); tg.addColorStop(0, "#fff1c4"); tg.addColorStop(1, "#e2b04a"); g.fillStyle = tg; g.fillText(t, w / 2, 72);
    if (ic) uiIcon(g, ic, w / 2 - tw / 2 - 40, 55, 40, "#f2c14e");
    if (sub) { g.fillStyle = "#e8f2fb"; uiFit(g, sub, w - 560, 25, 600); g.fillText(sub, w / 2, 108); } g.textAlign = "left"; }
  function uiCard(g, x, y, w, h, o) { o = o || {}; g.save(); g.shadowColor = "rgba(0,0,0,.4)"; g.shadowBlur = 18; g.shadowOffsetY = 6; uiRR(g, x, y, w, h, 22); g.fillStyle = o.bg || "rgba(5,24,48,.86)"; g.fill(); g.restore();
    g.save(); uiRR(g, x, y, w, h, 22); g.clip(); const ac = g.createLinearGradient(x, 0, x + w, 0); ac.addColorStop(0, "#d4a13a"); ac.addColorStop(.5, "#f6d27a"); ac.addColorStop(1, "#d4a13a"); g.fillStyle = ac; g.fillRect(x, y, w, 5);
    g.strokeStyle = "rgba(120,180,220,.07)"; g.lineWidth = 2; for (let yy = y + h - 10; yy > y + h - 60; yy -= 14) { g.beginPath(); for (let xx = 0; xx <= w; xx += 10) { const q = yy + Math.sin(xx / 30 + yy) * 3; if (xx) g.lineTo(x + xx, q); else g.moveTo(x, q); } g.stroke(); } g.restore();
    uiRR(g, x + .5, y + .5, w - 1, h - 1, 22); g.lineWidth = 1.6; g.strokeStyle = "rgba(255,226,160,.38)"; g.stroke(); }
  function uiH(g, t, x, y, ic, mw) { if (ic) { g.fillStyle = "rgba(242,193,78,.16)"; g.beginPath(); g.arc(x + 17, y - 10, 19, 0, TAU); g.fill(); uiIcon(g, ic, x + 17, y - 10, 22, "#f2c14e"); x += 46; }
    g.fillStyle = "#f2c14e"; uiFit(g, t, (mw || 640) - (ic ? 46 : 0), 29, 800); g.fillText(t, x, y); const tw = g.measureText(t).width; g.fillStyle = "rgba(242,193,78,.35)"; g.fillRect(x, y + 8, Math.min(tw, 420), 2); }
  /* címke-chip (pl. viharjelzés medencénként) */
  function uiChip(g, x, y, w, h, txt, col, on) { uiRR(g, x, y, w, h, h / 2); g.fillStyle = "rgba(255,255,255,.08)"; g.fill(); g.lineWidth = 1.5; g.strokeStyle = "rgba(255,255,255,.25)"; g.stroke();
    g.fillStyle = on ? col : "rgba(255,255,255,.18)"; g.beginPath(); g.arc(x + h / 2, y + h / 2, h * .28, 0, TAU); g.fill(); if (on) { g.fillStyle = col.replace(")", ",.3)").replace("rgb", "rgba"); g.beginPath(); g.arc(x + h / 2, y + h / 2, h * .46, 0, TAU); g.fill(); }
    g.fillStyle = "#fff"; uiFit(g, txt, w - h - 12, h * .42, 700); g.textBaseline = "middle"; g.fillText(txt, x + h, y + h / 2 + 1); g.textBaseline = "alphabetic"; }

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
    uiCard(g, 34, 150, 700, 400); uiH(g, "AZ ELŐZŐ FUTAM", 60, 196, "cup"); g.fillStyle = "rgba(255,255,255,.8)"; g.font = `600 20px ${UIF}`; g.fillText(`${S.C.name} · ${S.venue ? S.venue.n : ""}`, 60, 226);
    (last ? last.rows : []).forEach((q, i) => { const y = 270 + i * 64; g.fillStyle = q.me ? "rgba(212,161,58,.28)" : "rgba(255,255,255,.06)"; uiRR(g, 52, y - 34, 664, 54, 12); g.fill();
      g.fillStyle = q.place === 1 ? "#ffd166" : "#fff"; g.font = `900 30px ${UIF}`; g.fillText(q.place ? q.place + "." : "–", 66, y + 4);
      g.font = `800 26px ${UIF}`; g.fillStyle = "#fff"; uiFit(g, q.n, 300, 26, 800); g.fillText(q.n, 120, y + 2);
      g.font = `600 20px ${UIF}`; g.fillStyle = q.code ? "#ff9a8a" : "rgba(255,255,255,.85)"; g.fillText(q.code === "TLE" ? "időlimit után (TLE)" : q.code === "DNC" ? "gépi vezetés – nem számít" : q.code ? q.code : (q.est ? "becsült: " : "") + mmss(q.t || 0), 440, y + 2);
      g.font = `900 26px ${UIF}`; g.fillStyle = "#ffd166"; g.textAlign = "right"; g.fillText(q.pts + " p", 704, y + 4); g.textAlign = "left";
      if (q.ai && q.human) { g.fillStyle = "#ff9a8a"; g.font = `700 16px ${UIF}`; g.fillText("⚠ a játékos kiesett – a gép vezette tovább", 120, y + 22); } });
    uiCard(g, 34, 566, 700, 300); uiH(g, "SZABÁLYTALANSÁGOK", 60, 610, "x");
    const F = (last && last.fouls) || []; g.font = `600 21px ${UIF}`;
    if (!F.length) { g.fillStyle = "#7CFC9A"; g.font = `800 26px ${UIF}`; g.fillText("✓ Tiszta futam – nem volt ütközés.", 60, 660); g.fillStyle = "rgba(255,255,255,.8)"; g.font = `600 20px ${UIF}`; uiWrap(g, VR_R14, 60, 700, 650, 28, 3); }
    else { let yy = 650; F.slice(0, 4).forEach((f) => { const R = VR_RRS[f.n] || VR_RRS[10]; g.fillStyle = "#ffd166"; g.font = `800 21px ${UIF}`; uiWrap(g, `${f.bad} ⟷ ${f.other}: ${f.bad} a hibás`, 60, yy, 650, 26, 1); yy += 26; g.fillStyle = "#fff"; g.font = `600 18px ${UIF}`; yy += uiWrap(g, `${R[0]}: ${R[1]}`, 60, yy, 650, 23, 3) * 23 + 10; }); }
    /* jobb oldal: a következő futam */
    uiCard(g, 754, 150, 812, 716); uiH(g, `KÖVETKEZŐ: ${N.lvl}. FUTAM – ${N.C.name.toUpperCase()}${vrIsNight(N.lvl) ? " · ÉJSZAKAI" : ""}`, 780, 196, vrIsNight(N.lvl) ? "moon" : "map");
    { const tx = `${N.venue.n} · ${N.C.wxn || "szél"} ${(N.C.tws / KN).toFixed(0)} csomó · időlimit ${mmss(N.C.limit)} (a várható idő ~3×)`; g.fillStyle = "#fff"; uiFit(g, tx, 770, 21, 600); g.fillText(tx, 780, 228); }
    drawCoursePlan(g, N.C, 774, 244, 470, 430, B.t); drawCourse3D(g, N.C, 1256, 244, 296, 206, B.t); drawBalMap(g, 1256, 458, 296, 216, { venue: N.venue, wf: N.C.wf, t: B.t, labels: "kevés" });
    const legs = vrCourseLegs(N.C); g.font = `700 19px ${UIF}`; legs.forEach((l, i) => { const y = 702 + i * 30; if (y > 812) return; g.fillStyle = "#ffd166"; g.fillText(`${i + 1}.`, 780, y); g.fillStyle = "#fff"; g.fillText(`${i ? i + ". bója" : "rajt"} → ${i + 1 < legs.length ? (i + 1) + ". bója" : "cél (a két bója KÖZÖTT)"} · ${Math.round(l.d)} m · ${l.kind}`, 812, y); });
    { const tx = "A bójákat bal kéz felől kell megkerülni (felülről nézve az óramutatóval ellentétesen). A szaggatott vonal az ajánlott cirkálási útvonal."; g.fillStyle = "rgba(255,255,255,.75)"; uiFit(g, tx, 770, 17, 600); g.fillText(tx, 780, 836); }
    { const tx = `⚠ Balatoni viharjelzés – ${stmText()} · ${STM.src}`; g.fillStyle = "#ffd166"; uiFit(g, tx, 770, 18, 700); g.fillText(tx, 780, 862); }
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
