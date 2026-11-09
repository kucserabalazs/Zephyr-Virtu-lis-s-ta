  /* ------------------------------------------------------------------ JÁTÉKÁLLAPOT (közös mentés a 2D stégjátékkal) */
  const CKEY = "zephyr-sakk";
  const RANKS_VR = ["Hajósinas", "Matróz", "Kormányos", "Fedélzetmester", "Kapitány", "Admirális"];
  const rankVR = (l) => RANKS_VR[Math.min(5, Math.floor((l - 1) / 4))];
  const GS = {};
  function gsReset() { Object.assign(GS, { s: CE.initial(), hist: [], keys: [], sel: -1, moves: [], last: null, capW: [], capB: [], st: "play", msg: "", lvl: GS.lvl || 1, maxLvl: GS.maxLvl || 1, human: GS.human || "w", two: !!GS.two, thinking: false, promo: null, hint: null, won: false }); GS.keys.push(CE.posKey(GS.s)); }
  function gsSave() { try { localStorage.setItem(CKEY, JSON.stringify({ s: GS.s, hist: GS.hist, keys: GS.keys, capW: GS.capW, capB: GS.capB, lvl: GS.lvl, maxLvl: GS.maxLvl, ver: 2, won: GS.won, human: GS.human, two: GS.two, last: GS.last, st: GS.st, msg: GS.msg })); } catch (e) {} }
  function gsLoad() {
    try { const v = JSON.parse(localStorage.getItem(CKEY) || "null"); if (v && v.s && v.s.b && v.s.b.length === 64) { Object.assign(GS, { s: v.s, hist: v.hist || [], keys: v.keys || [], capW: v.capW || [], capB: v.capB || [], lvl: v.ver === 2 ? Math.max(1, Math.min(24, v.lvl | 0)) : 3, human: v.human || "w", two: !!v.two, last: v.last || null, won: !!v.won, sel: -1, moves: [], promo: null, hint: null, thinking: false });
      GS.maxLvl = Math.max(GS.lvl, Math.min(24, (v.maxLvl | 0) || GS.lvl)); if (!GS.keys.length) GS.keys.push(CE.posKey(GS.s)); return true; } } catch (e) {}
    return false;
  }
  function gsStatus() {
    const s = GS.s, ms = CE.legal(s), chk = CE.inCheck(s, s.turn), side = s.turn === "w" ? "Világos" : "Sötét";
    if (!ms.length) { GS.st = "over";
      if (chk) { const youWin = !GS.two && s.turn !== GS.human; GS.msg = GS.two ? `Sakk-matt! ${s.turn === "w" ? "Sötét" : "Világos"} nyert.` : youWin ? "Sakk-matt – GYŐZTÉL, admirális!" : "Sakk-matt – most a gép nyert."; GS.won = youWin;
        if (youWin && GS.lvl >= GS.maxLvl && GS.maxLvl < 24) GS.maxLvl = GS.lvl + 1; CS.endFx = { t: 0, win: GS.two || youWin, loser: s.turn }; }
      else GS.msg = "Patt – döntetlen."; return; }
    if (GS.keys.filter((k) => k === GS.keys[GS.keys.length - 1]).length >= 3) { GS.st = "over"; GS.msg = "Háromszori ismétlés – döntetlen."; return; }
    if (s.half >= 100) { GS.st = "over"; GS.msg = "50 lépés ütés és gyalogmozgás nélkül – döntetlen."; return; }
    if (CE.insufficient(s)) { GS.st = "over"; GS.msg = "Kevés az anyag a matthoz – döntetlen."; return; }
    GS.st = "play";
    GS.msg = chk ? "SAKK! " + (GS.two ? side + " jön." : s.turn === GS.human ? "Védd a királyod!" : "") : GS.two ? side + " jön." : s.turn === GS.human ? (T.inVR ? "Te jössz – mutass egy figurádra, és csippents." : "Te jössz – kattints egy figurádra.") : "A gép gondolkodik…";
  }

  /* ------------------------------------------------------------------ HAJÓK A TÁBLÁN */
  const homeYaw = (c) => (c === "w" ? 0 : Math.PI);
  function tplFor(t, c) { const k = t + c; if (t === "b") return BUILD.b(c); if (!CS.tpl[k]) CS.tpl[k] = BUILD[t](c); return CS.tpl[k].clone(true); }
  function makePiece(ch, sq) {
    const t = ch.toLowerCase(), c = CE.isW(ch) ? "w" : "b";
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body); CS.pieceG.add(g);
    const model = figTpl(t, c); body.add(model); model.scale.multiplyScalar(PSC);
    const dim = (model.userData.dim || [4, 6, 4]).map((v) => v * PSC);
    { const ru = model.getObjectByName("rune"); if (ru) { ru.material = ru.material.clone(); W.disposables.push(ru.material); } }
    g.position.set(sqX(sq), 0, sqZ(sq)); g.rotation.y = homeYaw(c);
    const hit = mesh(new THREE.BoxGeometry(dim[0] + .8, dim[1], Math.min(SQ - .4, dim[2])), basic({ visible: false }), g); hit.position.y = dim[1] / 2 - .3;
    const P = { ch, t, c, sq, g, body, model, hit, dim, yaw: homeYaw(c), heel: 0, ph: rand() * 9, beam: model.getObjectByName("beam"), oars: [model.getObjectByName("oarL"), model.getObjectByName("oarR")], row: 0, boat: model.userData.boat };
    hit.userData.xr = { hover: (on) => setHover(on ? P.sq : -1), click: () => onSquare(P.sq) };
    T.xr.extra.add(hit); W.objs.push(hit);
    return P;
  }
  function dropPiece(P) {
    if (!P) return; T.xr.extra.delete(P.hit); const i = W.objs.indexOf(P.hit); if (i >= 0) W.objs.splice(i, 1);
    if (T.xrForget) T.xrForget([P.hit]); if (P.g.parent) P.g.parent.remove(P.g);
  }
  /* a látvány összehangolása az állással (betöltés, visszalépés, új játszma után) */
  function syncPieces() {
    const B = GS.s.b;
    for (let i = 0; i < 64; i++) { const P = CS.vis[i], ch = B[i];
      if (P && P.ch === ch) { if (P.rise != null) { P.sq = i; continue; } P.g.position.set(sqX(i), 0, sqZ(i)); P.yaw = homeYaw(P.c); P.g.rotation.y = P.yaw; P.body.position.set(0, 0, 0); P.body.rotation.set(0, 0, 0); P.g.scale.setScalar(1); P.sq = i; continue; }
      if (P) { dropPiece(P); CS.vis[i] = null; }
      if (ch !== ".") CS.vis[i] = makePiece(ch, i);
    }
  }

  /* ------------------------------------------------------------------ MEZŐ-KIEMELÉS (a víz árnyalójában) és jelzőgyűrűk */
  function hlPaint() {
    const d = CS.hlData; d.fill(0);
    const set = (i, r, g, b, a) => { const k = i * 4; d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = a; };
    if (GS.last) { set(GS.last.f, 255, 170, 60, 120); set(GS.last.t, 255, 170, 60, 150); }
    if (GS.hint) { set(GS.hint.f, 120, 220, 255, 200); set(GS.hint.t, 120, 220, 255, 230); }
    if (GS.st === "play" && CE.inCheck(GS.s, GS.s.turn)) set(CE.kingSq(GS.s, GS.s.turn), 255, 40, 40, 255);
    if (GS.sel >= 0) { set(GS.sel, 255, 205, 80, 230); GS.moves.forEach((m) => set(m.t, m.c !== "." ? 255 : 80, m.c !== "." ? 70 : 230, m.c !== "." ? 60 : 140, 190)); }
    if (CS.hov >= 0 && CS.hov !== GS.sel) { const k = CS.hov * 4; if (!d[k + 3]) set(CS.hov, 255, 255, 255, 90); else d[k + 3] = Math.min(254, d[k + 3] + 50); }
    CS.hlTex.needsUpdate = true;
    /* gyűrűk a lehetséges célmezőkön */
    CS.rings.forEach((r, i) => { const m = GS.sel >= 0 ? GS.moves[i] : null; r.visible = !!m && !(i > 0 && GS.moves.slice(0, i).some((q) => q.t === m.t)); if (m) { r.position.set(sqX(m.t), .25, sqZ(m.t)); r.material = m.c !== "." ? CS.ringRed : CS.ringGreen; r.userData.cap = m.c !== "."; } });
    CS.selRing.visible = GS.sel >= 0; if (GS.sel >= 0) CS.selRing.position.set(sqX(GS.sel), .2, sqZ(GS.sel));
  }
  function setHover(sq) {
    if (sq === CS.hov) return; CS.hov = sq; hlPaint();
    const P = sq >= 0 ? CS.vis[sq] : null;
    if (P && !CS.anim) { const nm = NAMES[P.t]; CS.hovL.userData.set([`${PAL[P.c].name} ${nm[0].toLowerCase()} · ${CE.sqName(sq)}`, nm[1]]); CS.hovL.visible = true; CS.hovP = P; }
    else if (sq >= 0) { CS.hovL.userData.set([CE.sqName(sq), GS.sel >= 0 && GS.moves.some((m) => m.t === sq) ? "ide léphetsz" : ""]); CS.hovL.visible = true; CS.hovP = null; CS.hovSq = sq; }
    else CS.hovL.visible = false;
  }

  /* ------------------------------------------------------------------ KEZELÉS: hajó kiválasztása, célmező */
  function onSquare(sq) {
    if (sq < 0) return;
    if (CS.anim || GS.thinking) { flashMsg(GS.thinking ? "A gép még gondolkodik…" : "Várj, amíg a figura célba ér…"); return; }
    if (GS.st !== "play") { flashMsg(GS.msg + " – új játszma a panelen."); return; }
    if (GS.promo) return;
    if (!GS.two && GS.s.turn !== GS.human) return;
    const tg = GS.sel >= 0 ? GS.moves.filter((m) => m.t === sq) : [];
    if (tg.length) {
      if (tg.length > 1 && tg[0].promo) { GS.promo = tg; GS.msg = "Átváltozás: válassz figurát a panelen!"; if (T.inVR && W.panelHidden) W.togglePanel(); W.panelDirty = 1; snd("bell"); return; }
      doMove(tg[0]); return;
    }
    const p = GS.s.b[sq];
    if (p !== "." && CE.colorOf(p) === GS.s.turn) { GS.sel = sq; GS.moves = CE.legal(GS.s).filter((m) => m.f === sq); snd("tick");
      if (!GS.moves.length) flashMsg(`Ez a ${NAMES[p.toLowerCase()][0].toLowerCase()} most nem tud lépni.`); }
    else { GS.sel = -1; GS.moves = []; }
    hlPaint(); W.panelDirty = 1;
  }
  function flashMsg(t) { CS.flash = { t, k: 3.2 }; W.panelDirty = 1; }
  function doMove(m, fromAI) {
    const before = GS.s;
    GS.hist.push({ s: before, capW: GS.capW.slice(), capB: GS.capB.slice(), last: GS.last });
    GS.s = CE.apply(before, m); GS.keys.push(CE.posKey(GS.s));
    const cap = m.c !== "." ? (m.ep ? m.t + (before.turn === "w" ? 8 : -8) : m.t) : -1;
    if (cap >= 0) (CE.isW(m.c) ? GS.capW : GS.capB).push(m.c);
    GS.last = { f: m.f, t: m.t }; GS.sel = -1; GS.moves = []; GS.hint = null; GS.promo = null;
    startAnim(m, cap, before);
    gsStatus(); gsSave(); hlPaint(); W.panelDirty = 1;
    if (!fromAI) maybeAI();
  }
  function maybeAI() {
    if (GS.two || GS.st !== "play" || GS.s.turn === GS.human || GS.thinking) return;
    GS.thinking = true; GS.msg = "A gép gondolkodik…"; const ply = GS.hist.length, gen = W.gen;
    setTimeout(() => {
      if (gen !== W.gen || GS.two || GS.s.turn === GS.human || GS.hist.length !== ply || GS.st !== "play") { GS.thinking = false; return; }
      CE.thinkAsync(GS.s, GS.lvl, (m) => { const wait = () => { if (gen !== W.gen) return; if (CS.anim) return setTimeout(wait, 80); GS.thinking = false; if (m && GS.st === "play" && GS.hist.length === ply && GS.s.turn !== GS.human && !GS.two) doMove(m, true); else gsStatus(); W.panelDirty = 1; }; wait(); });
    }, 450);
  }
  function undo() {
    if (GS.thinking || CS.anim || !GS.hist.length) return;
    const n = GS.two ? 1 : Math.min(GS.hist.length, GS.s.turn === GS.human ? 2 : 1);
    for (let k = 0; k < n; k++) { const h = GS.hist.pop(); GS.s = h.s; GS.capW = h.capW; GS.capB = h.capB; GS.last = h.last; GS.keys.pop(); }
    GS.sel = -1; GS.moves = []; GS.promo = null; GS.hint = null; CS.endFx = null; syncPieces(); gsStatus(); gsSave(); hlPaint(); W.panelDirty = 1; maybeAI();
  }
  function newGame() { if (CS.anim) finishAnim(true); GS.thinking = false; gsReset(); CS.endFx = null; syncPieces(); gsStatus(); gsSave(); hlPaint(); W.panelDirty = 1; goView("bridge"); maybeAI(); }
  function hint() {
    if (GS.st !== "play" || GS.thinking || CS.anim || (!GS.two && GS.s.turn !== GS.human)) return;
    GS.msg = "💡 Gondolkodom…"; const ply = GS.hist.length; W.panelDirty = 1;
    CE.thinkAsync(GS.s, 20, (m) => { if (m && GS.hist.length === ply) { GS.hint = { f: m.f, t: m.t }; GS.msg = `💡 ${NAMES[m.p.toLowerCase()][0]}: ${CE.sqName(m.f)} → ${CE.sqName(m.t)} (kék mezők)`; } else gsStatus(); hlPaint(); W.panelDirty = 1; });
  }
  function setLvl(d) { GS.lvl = clamp(GS.lvl + d, 1, 24); gsSave(); W.panelDirty = 1; }
  function toggleTwo() { GS.two = !GS.two; gsStatus(); gsSave(); W.panelDirty = 1; maybeAI(); }
  function swapSide() { if (GS.two) return; GS.human = GS.human === "w" ? "b" : "w"; gsStatus(); gsSave(); goView("bridge"); W.panelDirty = 1; maybeAI(); }

  /* ------------------------------------------------------------------ HANGOK */
  function snd(kind, vol) {
    const a = T.ac && T.ac(); if (!a) return; const t0 = a.currentTime, out = T.outBus(); vol = vol == null ? 1 : vol;
    const nz = (dur, f, q, type) => { const s = a.createBufferSource(); s.buffer = T.noiseBuf(dur + .1); const fl = a.createBiquadFilter(); fl.type = type || "lowpass"; fl.frequency.value = f; fl.Q.value = q || .7; const g = a.createGain(); s.connect(fl).connect(g).connect(out); s.start(t0); s.stop(t0 + dur + .1); return g.gain; };
    const osc = (f0, f1, dur, v, type) => { const o = a.createOscillator(), g = a.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + .01); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur); o.connect(g).connect(out); o.start(t0); o.stop(t0 + dur + .05); };
    if (kind === "boom") { const g = nz(1.6, 420, .5); g.setValueAtTime(0, t0); g.linearRampToValueAtTime(.55 * vol, t0 + .01); g.exponentialRampToValueAtTime(.001, t0 + 1.5); osc(90, 32, .9, .5 * vol); }
    if (kind === "hit") { const g = nz(.7, 900, .6); g.setValueAtTime(0, t0); g.linearRampToValueAtTime(.35 * vol, t0 + .01); g.exponentialRampToValueAtTime(.001, t0 + .6); osc(160, 60, .3, .2 * vol, "triangle"); }
    if (kind === "splash") { const g = nz(.9, 1600, .5, "bandpass"); g.setValueAtTime(0, t0); g.linearRampToValueAtTime(.18 * vol, t0 + .03); g.exponentialRampToValueAtTime(.001, t0 + .85); }
    if (kind === "sink") { const g = nz(3.0, 260, .8); g.setValueAtTime(0, t0); g.linearRampToValueAtTime(.2 * vol, t0 + .4); g.exponentialRampToValueAtTime(.001, t0 + 2.9); for (let k = 0; k < 6; k++) { const o = a.createOscillator(), gg = a.createGain(), t = t0 + .3 + k * .35; o.frequency.setValueAtTime(300 + k * 40, t); o.frequency.exponentialRampToValueAtTime(700 + k * 60, t + .08); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.04, t + .01); gg.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(gg).connect(out); o.start(t); o.stop(t + .12); } }
    if (kind === "bell") { [880, 1320, 1760].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = f * 1.002; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.1 / (i + 1), t0 + .005); g.gain.exponentialRampToValueAtTime(.0005, t0 + 2.2); o.connect(g).connect(out); o.start(t0); o.stop(t0 + 2.3); }); }
    if (kind === "tick") osc(1400, 900, .06, .05, "triangle");
    if (kind === "creak") { const g = nz(.5, 300, 6, "bandpass"); g.setValueAtTime(0, t0); g.linearRampToValueAtTime(.05, t0 + .1); g.exponentialRampToValueAtTime(.001, t0 + .5); }
    if (kind === "fanfare") { [[523, 0], [659, .18], [784, .36], [1047, .6]].forEach(([f, d]) => { const o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; o.type = "sawtooth"; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + d); g.gain.linearRampToValueAtTime(.06, t0 + d + .03); g.gain.setValueAtTime(.06, t0 + d + (d > .5 ? .8 : .14)); g.gain.linearRampToValueAtTime(0, t0 + d + (d > .5 ? 1.2 : .18)); o.connect(lp).connect(g).connect(out); o.start(t0 + d); o.stop(t0 + d + 1.3); }); }
    if (kind === "whoosh") { const g = nz(1.4, 500, .5, "bandpass"); g.setValueAtTime(0, t0); g.linearRampToValueAtTime(.12, t0 + .1); g.linearRampToValueAtTime(0, t0 + 1.3); }
  }

  /* ------------------------------------------------------------------ EFFEKTEK: ágyútűz, becsapódás, tűz, süllyedés, buborék, tűzijáték */
  function buildFx(env) {
    const glowT = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, "rgba(255,255,230,1)"); gr.addColorStop(.25, "rgba(255,190,90,.9)"); gr.addColorStop(1, "rgba(255,90,10,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const spr = (n, tex, col, add) => { const list = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(sprM({ map: tex, color: col || "#ffffff", transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: 0 })); s.visible = false; env.add(s); list.push({ s, t: 99, life: 1, v: new THREE.Vector3(), sz: 1 }); } let k = 0;
      return { emit(p, v, sz, life) { const q = list[k++ % n]; q.s.position.copy(p); q.v.copy(v || V3(0, 0, 0)); q.t = 0; q.life = life || .5; q.sz = sz || 1; q.s.visible = true; return q; },
        tick(dt, fn) { list.forEach((q) => { if (q.t > q.life) { q.s.visible = false; return; } q.t += dt; q.s.position.addScaledVector(q.v, dt); fn(q, q.t / q.life); }); }, clear() { list.forEach((q) => { q.t = 99; q.s.visible = false; }); } }; };
    const dropT = canvasTex(32, 64, (g) => { const gr = g.createRadialGradient(16, 40, 1, 16, 36, 22); gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(1, "rgba(220,240,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 64); });
    CS.fx = { flash: spr(14, glowT, "#ffe0a0", true), fire: spr(60, glowT, "#ff8a2a", true), spray: spr(60, dropT, "#ffffff", false), smoke: smokePool(env, 50, "#d8d0c8"), dsmoke: smokePool(env, 60, "#3a3430"), rings: ringPool(env, 24) };
    const ball = new THREE.SphereGeometry(.14, 10, 8); CS.balls = []; for (let i = 0; i < 6; i++) { const m = mesh(ball, std({ color: "#1a1a1a", metalness: .6, roughness: .4 }), env); m.visible = false; CS.balls.push({ m, t: 99, d: 1 }); }
    /* tűzijáték (győzelem): pontfelhő */
    const N = 1400, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pm = new THREE.PointsMaterial({ size: .55, map: glowT, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); W.disposables.push(pm, g);
    const pts = new THREE.Points(g, pm); pts.frustumCulled = false; env.add(pts);
    CS.fw = { pos, col, g, vel: new Float32Array(N * 3), life: new Float32Array(N), N, i: 0, next: 0 };
  }
  function fwBurst(c) {
    const F = CS.fw, p = V3(rr(-BH, BH), rr(26, 40), rr(-BH, BH)), base = new THREE.Color(c || ["#ffd166", "#ff5a5a", "#7fd3ff", "#ffffff", "#c9a227", "#9cff8a"][Math.floor(rand() * 6)]);
    for (let k = 0; k < 110; k++) { const i = F.i++ % F.N, th = rand() * TAU, ph = Math.acos(rr(-1, 1)), sp = rr(9, 14);
      F.pos.set([p.x, p.y, p.z], i * 3); F.vel.set([Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp, Math.sin(ph) * Math.sin(th) * sp], i * 3); F.life[i] = rr(1.6, 2.4); F.col.set([base.r, base.g, base.b], i * 3); }
    snd("boom", .35);
  }
  function fxTick(dt) {
    const F = CS.fx;
    F.flash.tick(dt, (q, k) => { q.s.material.opacity = 1 - k; q.s.scale.setScalar(q.sz * (1 + k * 1.5)); });
    F.fire.tick(dt, (q, k) => { q.s.material.opacity = (1 - k) * .9; q.s.scale.setScalar(q.sz * (1 - k * .5)); q.v.y += dt * 2; });
    F.spray.tick(dt, (q, k) => { q.v.y -= 9.8 * dt; q.s.material.opacity = (1 - k) * .9; q.s.scale.set(q.sz * .5, q.sz, 1); if (q.s.position.y < 0) q.t = 99; });
    F.smoke.tick(dt); F.dsmoke.tick(dt); F.rings.tick(dt);
    CS.balls.forEach((b) => { if (b.t > b.d) { b.m.visible = false; return; } b.t += dt; const k = Math.min(1, b.t / b.d); b.m.position.lerpVectors(b.a, b.b, k); b.m.position.y += Math.sin(k * Math.PI) * b.h; if (k >= 1) { b.m.visible = false; if (b.on) b.on(); } });
    const W2 = CS.fw; let any = false;
    for (let i = 0; i < W2.N; i++) { if (W2.life[i] <= 0) { if (W2.pos[i * 3 + 1] > -50) W2.pos[i * 3 + 1] = -99; continue; } any = true; W2.life[i] -= dt; W2.vel[i * 3 + 1] -= 4 * dt; for (let a = 0; a < 3; a++) { W2.vel[i * 3 + a] *= 1 - dt * .9; W2.pos[i * 3 + a] += W2.vel[i * 3 + a] * dt; } const f = Math.max(0, Math.min(1, W2.life[i])); W2.col[i * 3] *= f > .3 ? 1 : .96; W2.col[i * 3 + 1] *= f > .3 ? 1 : .94; W2.col[i * 3 + 2] *= f > .3 ? 1 : .94; }
    if (any || W2.was) { W2.g.attributes.position.needsUpdate = true; W2.g.attributes.color.needsUpdate = true; } W2.was = any;
  }
  function shoot(from, to, onHit) {
    const b = CS.balls.find((q) => q.t > q.d) || CS.balls[0]; b.a = from.clone(); b.b = to.clone(); b.t = 0; b.d = .55; b.h = 1.2; b.on = onHit; b.m.visible = true;
    CS.fx.flash.emit(from, V3(0, 0, 0), 3.2, .25); for (let k = 0; k < 5; k++) CS.fx.smoke.emit(from.clone().add(V3(rr(-.4, .4), rr(0, .4), rr(-.4, .4))), to.clone().sub(from).normalize().multiplyScalar(rr(.6, 2)).add(V3(0, .6, 0)), rr(1.6, 2.6));
    snd("boom", .9);
  }
  function splashAt(p, big) { for (let k = 0; k < (big ? 26 : 12); k++) CS.fx.spray.emit(V3(p.x + rr(-.6, .6), .2, p.z + rr(-.6, .6)), V3(rr(-1.5, 1.5), rr(big ? 6 : 4, big ? 11 : 7), rr(-1.5, 1.5)), rr(.5, 1.0), 1.6); CS.fx.rings.emit(p.x, p.z, big ? 3 : 2, 2.5); snd("splash", big ? 1 : .6); }

  /* ------------------------------------------------------------------ LÉPÉS-ANIMÁCIÓ: fordulás → (ütésnél: sortűz, a megtalált hajó kigyullad és elsüllyed) → hajózás nyomhullámmal → beállás */
  function pathFor(P, f, t) {
    const a = V3(sqX(f), 0, sqZ(f)), b = V3(sqX(t), 0, sqZ(t));
    if (P.t === "n") {   /* a huszár a mezők határán kanyarodik – nem a többi hajón át */
      const dr = (t >> 3) - (f >> 3), dc = (t & 7) - (f & 7), sx = Math.sign(dc), sz = Math.sign(dr);
      const pts = Math.abs(dr) === 2 ? [a, V3(a.x + sx * SQ / 2, 0, a.z + sz * SQ * .35), V3(a.x + sx * SQ / 2, 0, b.z - sz * SQ * .35), b] : [a, V3(a.x + sx * SQ * .35, 0, a.z + sz * SQ / 2), V3(b.x - sx * SQ * .35, 0, a.z + sz * SQ / 2), b];
      return new THREE.CatmullRomCurve3(pts, false, "centripetal");
    }
    return new THREE.LineCurve3(a, b);
  }
  const yawOf = (v) => Math.atan2(-v.x, -v.z);   /* a hajó orra −z felé: a haladási irány szöge */
  function startAnim(m, cap, before) {
    if (CS.anim) finishAnim(true);
    const P = CS.vis[m.f]; if (!P) { syncPieces(); return; }
    CS.vis[m.f] = null;
    const victim = cap >= 0 ? CS.vis[cap] : null; if (victim) CS.vis[cap] = null;
    const movers = [{ P, path: pathFor(P, m.f, m.t), to: m.t }];
    if (m.castle) { const row = before.turn === "w" ? 7 : 0, rf = m.castle === "K" ? row * 8 + 7 : row * 8, rt = m.castle === "K" ? row * 8 + 5 : row * 8 + 3; const R = CS.vis[rf]; if (R) { CS.vis[rf] = null; movers.push({ P: R, path: pathFor(R, rf, rt), to: rt }); } }
    const A = { m, movers, victim, t: 0, promo: m.promo || null, fired: 0, hits: 0 };
    /* a figurák nem fordulnak a menetirányba (arccal maradnak), csak dőlnek; a csikóhal ugrik */
    if (victim && P.t === "n") movers[0].path = new THREE.LineCurve3(V3(sqX(m.f), 0, sqZ(m.f)), V3(sqX(m.t), 0, sqZ(m.t)));
    movers.forEach((q) => { q.len = q.path.getLength(); q.dur = q.P.t === "n" ? (victim ? 1.5 : 1.25) : clamp(q.len / (ROYAL[q.P.t] ? 5.2 : 6.5), 1.3, 4.4); q.y0 = q.P.yaw; q.y1 = q.P.yaw; q.P.moving = true; });
    if (victim) {
      const vp = V3(sqX(cap), 0, sqZ(cap)), ap = V3(sqX(m.f), 0, sqZ(m.f));
      Object.assign(A, { vp, ap });
      victim.sinkRoll = rand() < .5 ? -1 : 1;
      battleSetup(A, P, victim);
    } else Object.assign(A, { tSail: .25 });
    A.tEnd = A.tSail + Math.max(...movers.map((q) => q.dur)) + .7;
    CS.anim = A; CS.hovL.visible = false;
    snd("creak");
  }
  function animTick(dt) {
    const A = CS.anim; if (!A) return; A.t += dt;
    const M0 = A.movers[0];
    if (A.victim) battleTick(A, dt);
    if (A.t < A.tSail) { const k = smooth(A.t / A.tSail); A.movers.forEach((q) => { q.P.yaw = q.y0 + wrapA(q.y1 - q.y0) * k; }); }
    /* 4. hajózás */
    A.movers.forEach((q, qi) => {
      const ts = A.tSail + (qi ? .25 : 0), k = clamp((A.t - ts) / q.dur, 0, 1);
      if (A.t < ts) return;
      if (k <= 0 || q.done) return;
      const hop = q.P.t === "n", e = hop ? k : k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, p = q.path.getPointAt(e), tg = q.path.getTangentAt(Math.min(.999, e));
      q.P.g.position.set(p.x, hop ? Math.sin(k * Math.PI) * (A.leap ? 11 : 4.5) : 0, p.z);
      if (hop && !q.jumped) { q.jumped = 1; splashAt(q.path.getPointAt(0), false); snd("whoosh"); }
      if (hop && A.leap && k > .96 && !A.landed) { A.landed = A.t; splashAt(A.vp, true); CS.fx.rings.emit(A.vp.x, A.vp.z, 7, 3.2); CS.fx.rings.emit(A.vp.x, A.vp.z, 4, 2.2); CS.fx.flash.emit(A.vp.clone().add(V3(0, 2, 0)), V3(0, 0, 0), 6, .3); for (let j = 0; j < 40; j++) { const a = rand() * TAU; CS.fx.spray.emit(V3(A.vp.x + Math.cos(a) * 2, .4, A.vp.z + Math.sin(a) * 2), V3(Math.cos(a) * rr(4, 9), rr(6, 14), Math.sin(a) * rr(4, 9)), rr(.6, 1.3), 1.8); } snd("hit"); snd("boom", .6); }
      if (hop && k >= 1 && !q.landSpl) { q.landSpl = 1; if (!A.leap) splashAt(p, false); }
      const v = q.len / q.dur * (1 - Math.abs(2 * k - 1)) * 1.6;   /* pillanatnyi sebesség */
      /* dőlés a haladás irányába (a figura saját koordinátáiban) */
      const cy = Math.cos(q.P.yaw), sy = Math.sin(q.P.yaw), lx = tg.x * cy - tg.z * sy, lz = tg.x * sy + tg.z * cy, lean = Math.min(1, v / 6) * (hop ? .05 : .13);
      q.P.pitch = lz * lean; q.P.heel = -lx * lean; q.P.row = v; if (q.P.t === "b") q.P.spin = Math.max(q.P.spin || 0, 2.5);
      if (ROYAL[q.P.t]) { q.P.step = (q.P.step || 0) + dt * 3.2; if (Math.floor(q.P.step) !== q.P.stepN) { q.P.stepN = Math.floor(q.P.step); CS.fx.rings.emit(p.x + rr(-.6, .6), p.z + rr(-.6, .6), 1.6, 1.8); }
        if (rand() < dt * 40) CS.fx.flash.emit(V3(p.x + rr(-2, 2), rr(.2, 1.5), p.z + rr(-2, 2)), V3(0, rr(.6, 1.8), 0), rr(.3, .7), rr(.4, .8)); }
      const wk = CS.wakes[qi], my = yawOf(tg); if (wk && !hop && !ROYAL[q.P.t]) wk.push(p.x, p.z, my + Math.PI, v, dt, .06);
      if (!hop && !ROYAL[q.P.t] && v > 2 && rand() < dt * 18) CS.fx.spray.emit(V3(p.x + tg.x * q.P.dim[2] * .45, .3, p.z + tg.z * q.P.dim[2] * .45), V3(rr(-1, 1), rr(1.5, 3), rr(-1, 1)), rr(.3, .6), .8);
      if (k >= 1) { q.done = true; q.P.sq = q.to; CS.vis[q.to] = q.P; q.P.row = 0; q.P.g.position.y = 0; }
    });
    /* 5. beállás alapirányba */
    const tSet = A.tSail + Math.max(...A.movers.map((q) => q.dur)) + .05;
    if (A.t > tSet) { A.movers.forEach((q) => { q.P.yaw += wrapA(homeYaw(q.P.c) - q.P.yaw) * Math.min(1, dt * 5); q.P.heel *= 1 - Math.min(1, dt * 4); q.P.pitch = (q.P.pitch || 0) * (1 - Math.min(1, dt * 4)); });
      if (A.promo && !A.promoDone) { A.promoDone = 1; promoteFx(M0.P, A.promo); } }
    if (A.t >= A.tEnd && (!A.victim || !A.victim.g.parent)) finishAnim(false);
  }
  function promoteFx(P, ch) {
    /* a csónak alámerül, a helyén aranyló fényben kiemelkedik az új hajó */
    const sq = P.sq; dropPiece(P); const N = makePiece(ch, sq); CS.vis[sq] = N; N.rise = 0;
    for (let k = 0; k < 30; k++) CS.fx.fire.emit(V3(sqX(sq) + rr(-2, 2), rr(0, 6), sqZ(sq) + rr(-2, 2)), V3(0, rr(1, 3), 0), rr(.8, 1.6), rr(.6, 1.4));
    splashAt(V3(sqX(sq), 0, sqZ(sq)), true); snd("fanfare");
  }
  function finishAnim(force) {
    const A = CS.anim; if (!A) return; CS.anim = null; battleEnd();
    if (A.victim && A.victim.g.parent) dropPiece(A.victim);
    A.movers.forEach((q) => { q.P.moving = false; q.P.row = 0; q.P.heel = 0; q.P.pitch = 0; q.P.g.position.y = 0; if (!q.done) { q.P.g.position.set(sqX(q.to), 0, sqZ(q.to)); q.P.sq = q.to; CS.vis[q.to] = q.P; } q.P.yaw = homeYaw(q.P.c); });
    if (A.promo && !A.promoDone) { A.promoDone = 1; const P = CS.vis[A.m.t]; if (P) promoteFx(P, A.promo); }
    syncPieces();
    if (GS.st === "play" && CE.inCheck(GS.s, GS.s.turn)) snd("bell");
    if (CS.endFx && !CS.endFx.snd) { CS.endFx.snd = 1; if (CS.endFx.win) snd("fanfare"); }
    hlPaint(); W.panelDirty = 1;
    if (!force) maybeAI();
  }
