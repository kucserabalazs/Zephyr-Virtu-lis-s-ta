/* =====================================================================================================
   Zephyr Apartmanház – VIRTUÁLIS VILÁG (vilag.js)
   1. Regatta a napozóstégnél (a stég valódi panorámája előtt 3D vitorlásverseny)
   2. Vitorlázás a Zephyrrel (Raptor 27, piros génua – Tihany, Badacsony, Balaton-felvidék a láthatáron)
   3. A ház makettje (alaprajzok szerint; rámutatva belépés a lakás panorámájába)
   Kézkövetéssel (Meta Quest 2): mutatás + csippentés; kontrollerrel a ravasz; 2D-ben egér / ujj / billentyű.
   Joystick sehol sem kell. A séta (index.html) tölti be, amikor először megnyitják.
   ===================================================================================================== */
(function () {
  "use strict";
  const T = window.ZephyrTour; if (!T || window.ZephyrWorld) return;
  const THREE = T.THREE;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const smooth = (k) => k * k * (3 - 2 * k);
  const rand = (() => { let s = 20261102; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const rr = (a, b) => a + (b - a) * rand();

  const W = { active: false, kind: null, root: null, objs: [], disposables: [], upd: [], hud: null, panel: null, t: 0, scale: 1 };
  window.ZephyrWorld = W;

  /* ------------------------------------------------------------------ segédek: anyagok, geometriák */
  const std = (o) => { const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: .6, metalness: 0 }, o)); W.disposables.push(m); return m; };
  const basic = (o) => { const m = new THREE.MeshBasicMaterial(o); W.disposables.push(m); return m; };
  const sprM = (o) => { const m = new THREE.SpriteMaterial(o); W.disposables.push(m); return m; };   /* Sprite-hoz: így fordul a néző felé */
  const mesh = (g, m, parent) => { const x = new THREE.Mesh(g, m); W.disposables.push(g); if (parent) parent.add(x); return x; };
  function canvasTex(w, h, draw, opt) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (opt && opt.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opt.repeat[0], opt.repeat[1]); }
    W.disposables.push(t); t._canvas = c; return t;
  }
  /* geometriák összevonása anyagonként (kevesebb rajzolási hívás – Questen ez számít) */
  function mergeGeoms(list) {
    let n = 0; const parts = list.map(([g, m]) => { let q = g.index ? g.toNonIndexed() : g.clone(); q.applyMatrix4(m); if (!q.attributes.normal) q.computeVertexNormals(); n += q.attributes.position.count; return q; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), hasUV = parts.every((q) => q.attributes.uv), uv = hasUV ? new Float32Array(n * 2) : null;
    const hasC = parts.some((q) => q.attributes.color), col = hasC ? new Float32Array(n * 3) : null;
    let o = 0;
    parts.forEach((q) => {
      const c = q.attributes.position.count;
      pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3);
      if (uv) uv.set(q.attributes.uv.array, o * 2);
      if (col) { if (q.attributes.color) col.set(q.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + c) * 3); }
      o += c; q.dispose();
    });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    if (uv) g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); if (col) g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    W.disposables.push(g); return g;
  }
  const M4 = (x, y, z, ry, rx, rz, sx, sy, sz) => { const m = new THREE.Matrix4(); m.compose(new THREE.Vector3(x || 0, y || 0, z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, "YXZ")), new THREE.Vector3(sx || 1, sy || 1, sz || 1)); return m; };
  /* henger két pont között (kötélzet, korlát, árbóc) */
  function rodBetween(a, b, r, mat, parent, seg) {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length();
    const g = new THREE.CylinderGeometry(r, r, L, seg || 6, 1, true); g.translate(0, L / 2, 0);
    const m = mesh(g, mat, parent); m.position.copy(a); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
  }
  function rodGeom(a, b, r, seg) {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length();
    const g = new THREE.CylinderGeometry(r, r, L, seg || 6, 1, false); g.translate(0, L / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    return [g, new THREE.Matrix4().compose(a.clone(), q, new THREE.Vector3(1, 1, 1))];
  }
  /* felirat-tábla (sprite): mindig felénk néz */
  function labelSprite(lines, opt) {
    opt = opt || {};
    const fs = opt.fs || 54, pad = 26, w = opt.w || 760, n = Math.max(2, lines.length);
    const h = pad * 2 + n * fs * 1.25;
    const draw = (g, L) => {
      g.clearRect(0, 0, w, Math.ceil(h));
      g.fillStyle = opt.bg || "rgba(9,34,70,.9)"; g.beginPath(); g.roundRect ? g.roundRect(4, 4, w - 8, h - 8, 34) : g.rect(4, 4, w - 8, h - 8); g.fill();
      g.lineWidth = 6; g.strokeStyle = opt.edge || "#ffd166"; g.stroke();
      L.forEach((ln, i) => { g.fillStyle = i === 0 ? (opt.c0 || "#ffd166") : "#fff"; g.font = `${i === 0 ? 800 : 600} ${i === 0 ? fs : fs * .78}px system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ln, w / 2, pad + fs * .62 + i * fs * 1.25); });
    };
    const t = canvasTex(w, Math.ceil(h), (g) => draw(g, lines));
    const sm = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }); W.disposables.push(sm);
    const sp = new THREE.Sprite(sm);   /* SpriteMaterial: mindig a néző felé fordul (a MeshBasicMaterial-lal csak egy irányból látszott – a hajóra tett táblák egyáltalán nem) */
    sp.renderOrder = 990; const k = opt.size || 1; sp.scale.set(k, k * h / w, 1);
    let last = lines.join("|");
    sp.userData.set = (L) => { const key = L.join("|"); if (key === last) return; last = key; draw(t._canvas.getContext("2d"), L); t.needsUpdate = true; };
    return sp;
  }

  /* ------------------------------------------------------------------ hangok */
  const AU = { nodes: [] };
  function audioStart(spec) {
    const a = T.ac(); if (!a) return; const out = T.outBus();
    const noise = (sec) => { const s = a.createBufferSource(); s.buffer = T.noiseBuf(sec || 4); s.loop = true; return s; };
    const mk = (kind) => {
      const n = noise(5); const f = a.createBiquadFilter(); const g = a.createGain(); g.gain.value = 0;
      if (kind === "water") { f.type = "lowpass"; f.frequency.value = 700; }
      if (kind === "rush") { f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = .7; }
      if (kind === "wind") { f.type = "bandpass"; f.frequency.value = 600; f.Q.value = .5; }
      /* 2026-11-15 (szakértői jelentés F.2): a víz és a szél a környezeti csatornán, a szél sztereó panorámával („szél a fülön”), a rohanás az effekteken */
      const bus = (kind === "rush" ? T.outBus("fx") : T.outBus("amb")) || out; let tail = g;
      if (kind === "wind" && a.createStereoPanner) { const pn = a.createStereoPanner(); g.connect(pn); tail = pn; AU.windPan = pn; }
      n.connect(f).connect(g); tail.connect(bus); n.start(); const o = { n, f, g }; AU.nodes.push(o); return o;
    };
    AU.water = mk("water"); AU.rush = mk("rush"); AU.wind = mk("wind");
    AU.set = (k, v, tc) => { const o = AU[k]; if (o) o.g.gain.setTargetAtTime(v, a.currentTime, tc || .3); };
    AU.set("water", spec.water || .03, 1); AU.set("wind", spec.wind || .02, 1);
  }
  function audioStop() {
    const a = T.ac(); AU.nodes.forEach((o) => { try { o.g.gain.setTargetAtTime(0, a.currentTime, .25); setTimeout(() => { try { o.n.stop(); } catch (e) {} }, 1200); } catch (e) {} });
    AU.nodes = []; AU.water = AU.rush = AU.wind = null; AU.set = () => {};
  }
  AU.set = () => {};
  /* hajókürt (rajtjelzés): két hangolt fűrészfog, enyhe torzítással, távolság szerint halkítva */
  /* TÉRBELI HANG (szakértői jelentés F.2): egy világbeli pontból szóló hang – a hallgató (a fej) helyzetéhez és irányához képest HRTF-panorámával, távolság szerinti
     halkulással és a hang terjedési késésével (343 m/s). Rövid hangokhoz: a kiinduló pillanat helyzetét rögzíti. Visszaad: { node, delay } */
  function sp3(wp, busName, ref) { const a = T.ac(); if (!a || !wp) return null; try { const cam = T.sceneEl.camera; cam.updateMatrixWorld(); const v = wp.clone().applyMatrix4(new THREE.Matrix4().copy(cam.matrixWorld).invert());
      const p = a.createPanner(); p.panningModel = "HRTF"; p.distanceModel = "inverse"; p.refDistance = ref || 20; p.rolloffFactor = 1; p.maxDistance = 4000;
      if (p.positionX) { p.positionX.value = v.x; p.positionY.value = v.y; p.positionZ.value = v.z; } else p.setPosition(v.x, v.y, v.z);
      try { const L = a.listener; if (L.positionX) { L.positionX.value = 0; L.positionY.value = 0; L.positionZ.value = 0; L.forwardX.value = 0; L.forwardY.value = 0; L.forwardZ.value = -1; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; } else { L.setPosition(0, 0, 0); L.setOrientation(0, 0, -1, 0, 1, 0); } } catch (e) {}
      p.connect(T.outBus(busName || "race") || T.outBus()); return { node: p, delay: Math.min(3, v.length() / 343) }; } catch (e) { return null; } }
  /* hajókürt (rajtjelzés): két enyhén elhangolt fűrészfog + formánsszűrők, légzésszerű ingadozás; ha világbeli pontot kap (rendezőhajó), onnan szól, késéssel */
  function horn(dur, vol, wp) {
    const a = T.ac(); if (!a) return; const sp = wp ? sp3(wp, "race", 25) : null, t0 = a.currentTime + (sp ? sp.delay : 0), g = a.createGain(), lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500;
    if (sp) { vol = (vol || .25) * 2.2; const f1 = a.createBiquadFilter(); f1.type = "peaking"; f1.frequency.value = 450; f1.Q.value = 1.2; f1.gain.value = 6; const f2 = a.createBiquadFilter(); f2.type = "peaking"; f2.frequency.value = 1100; f2.Q.value = 1.5; f2.gain.value = 4;
      lp.disconnect(); lp.connect(f1).connect(f2).connect(g).connect(sp.node); const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 5.5; lg.gain.value = vol * .06; lfo.connect(lg).connect(g.gain); lfo.start(t0); lfo.stop(t0 + dur + .1); }
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime((vol || .25), t0 + .06); g.gain.setValueAtTime(vol || .25, t0 + dur - .15); g.gain.linearRampToValueAtTime(0, t0 + dur);
    [233, 235.5, 466].forEach((f, i) => { const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; const og = a.createGain(); og.gain.value = i === 2 ? .25 : .5; o.connect(og).connect(lp); o.start(t0); o.stop(t0 + dur + .05); });
    if (!sp) lp.connect(g).connect(T.outBus("race") || T.outBus());
  }
  /* 2026-11-15 (szakértői jelentés F.3): EGYSÉGES GOMBHANGOK – egy „hangszer” (fa-klikk + rövid, harangszerű csengés), a gombok csatornáján (szünetben is szól).
     hover: rámutatás (halk pattintás) · press: megnyomás · back: vissza/bezárás · success: siker · warn: figyelmeztetés · error: hiba. Kézkövetésnél ez pótolja a tapintást. */
  /* 2026-11-15 (szakértői jelentés F.7): REZGÉS a kontrollerben (kézkövetésnél nincs – ott a hang pótolja); localStorage zephyr-rezges = 0 kikapcsolja */
  function hapt(v, ms) { try { if (localStorage.getItem("zephyr-rezges") === "0") return; const se = T.sceneEl.renderer.xr.getSession && T.sceneEl.renderer.xr.getSession(); if (!se) return;
      for (const src of se.inputSources) { const h = src.gamepad && src.gamepad.hapticActuators && src.gamepad.hapticActuators[0]; if (h && h.pulse) h.pulse(v, ms); } } catch (e) {} }
  function uiSnd(kind) { const a = T.ac(); if (!a) return; const now = a.currentTime; if (kind === "hover") { if (now - (uiSnd.lastH || 0) < .06) return; uiSnd.lastH = now; }
    try { const out = T.outBus("ui") || T.outBus(), tone = (f, t, d, v, type) => { const o = a.createOscillator(), g = a.createGain(); o.type = type || "sine"; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .004); g.gain.exponentialRampToValueAtTime(.0004, t + d); o.connect(g).connect(out); o.start(t); o.stop(t + d + .02); },
      click = (t, v) => { const n = a.createBufferSource(); n.buffer = T.noiseBuf(.05); const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3000; f.Q.value = 2.5; const g = a.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0005, t + .03); n.connect(f).connect(g).connect(out); n.start(t); n.stop(t + .05); };
      if (kind === "hover") tone(1000, now, .025, .025);
      if (kind === "press") hapt(.15, 25); else if (kind === "success") { hapt(.3, 60); setTimeout(() => hapt(.3, 60), 140); } else if (kind === "error") hapt(.9, 200); else if (kind === "warn") hapt(.4, 60);
      else if (kind === "press") { click(now, .12); tone(600, now, .06, .07); }
      else if (kind === "back") { tone(660, now, .07, .05); tone(440, now + .06, .09, .05); }
      else if (kind === "success") { [523, 659, 784].forEach((f, i) => tone(f, now + i * .07, .35, .06)); }
      else if (kind === "warn") { tone(330, now, .1, .08, "triangle"); tone(330, now + .14, .1, .08, "triangle"); }
      else if (kind === "error") { tone(196, now, .3, .08, "triangle"); tone(207, now, .3, .06, "triangle"); } } catch (e) {} }
  function flap(vol) {   /* vitorlacsapkodás fordulóban */
    const a = T.ac(); if (!a) return; const t0 = a.currentTime;
    for (let k = 0; k < 6; k++) { const s = a.createBufferSource(); s.buffer = T.noiseBuf(.12); const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 300 + rand() * 300; const g = a.createGain();
      const t = t0 + k * (.11 + rand() * .06); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .12, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + .1); s.connect(f).connect(g).connect(T.outBus()); s.start(t); s.stop(t + .13); }
  }
  function winch() {   /* csörlő kattogása */
    const a = T.ac(); if (!a) return; const t0 = a.currentTime;
    for (let k = 0; k < 9; k++) { const o = a.createOscillator(); o.type = "square"; o.frequency.value = 2400 + rand() * 600; const g = a.createGain(); const t = t0 + k * .07; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.025, t + .003); g.gain.exponentialRampToValueAtTime(.0008, t + .03); o.connect(g).connect(T.outBus()); o.start(t); o.stop(t + .04); }
  }
