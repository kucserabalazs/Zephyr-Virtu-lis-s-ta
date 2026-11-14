  /* =================================================================== 2/G. TÖBBJÁTÉKOS MÓD (2026. nov. 14., a tulajdonos 11–13. kérése)
     • Kapcsolat szerver nélkül: a böngészők közvetlenül kapcsolódnak (WebRTC, Trystero – p2p.js), a találkozást nyilvános nostr-továbbítók intézik;
       ugyanazon a gépen több lap között BroadcastChannel is (teszteléshez). A hálózaton csak a játékosnév, a hajóosztály és a hajók helyzete megy át.
     • JELENLÉT: aki a kikötőben vagy versenyen van, 2 mp-enként jelzi magát; a listában az aktív (meghívható) játékosok FELÜL, ZÖLDDEL; alattuk szürkén
       a korábban látott, most nem elérhető nevek.
     • AUTOMATIKUS CSOPORT: „Indulás” megnyomásakor, ha más is a kikötőben van, 8 mp-ig gyűjti az indulókat, és legfeljebb négyes csoportokat alkot; a hiányzó
       helyekre gépi ellenfél kerül. A csoport „házigazdája” (a legkisebb azonosító) vezeti a gépi hajókat.
     • SAJÁT FUTAM: kijelölt játékosok meghívása; aki elfogadja, azzal (és csak azzal – gépi ellenfél nélkül) indul a futam.
     • KIESÉS: ha egy játékos 4 mp-ig nem jelez (kiugrott, leszakadt), a házigazda gépe ÉSZREVÉTLENÜL tovább vezeti a hajóját onnan, ahol volt; a futam annak
       a játékosnak semmis (DNC – nem számít), és a futam utáni kapitányi tájékoztatóban mindenki látja, hogy gépi vezetés volt. Ha a házigazda esik ki,
       a következő legkisebb azonosítójú játékos veszi át a gépi hajókat. */
  const NET = { on: false, id: null, peers: {}, bc: null, room: null, send: null, st: "off", sendT: 0, hiT: 0, inv: null, sel: {}, acc: {}, queue: null };
  function netId() { if (NET.id) return NET.id; let id = null; try { id = sessionStorage.getItem("zephyr-net-id"); } catch (e) {} if (!id) { id = "p" + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem("zephyr-net-id", id); } catch (e) {} } return (NET.id = id); }
  function netEnabled() { try { return localStorage.getItem("zephyr-net") !== "0"; } catch (e) { return true; } }
  function netStart() {
    if (NET.on || !netEnabled()) return; NET.on = true; netId();
    try { NET.bc = new BroadcastChannel("zephyr-net"); NET.bc.onmessage = (e) => netRecv(e.data); } catch (e) {}
    const join = () => { try { const P = window.ZephyrP2P; if (!P || NET.room) return; NET.room = P.joinRoom({ appId: "zephyr-apartmanhaz-vitorlas" }, "kikoto-1"); const [s, g] = NET.room.makeAction("z"); NET.send = s; g((d) => netRecv(d)); NET.room.onPeerJoin(() => { NET.hiT = 0; }); } catch (e) { console.warn("p2p", e); } };
    if (window.ZephyrP2P) join(); else { const sc = document.createElement("script"); sc.src = "p2p.js"; sc.onload = join; sc.onerror = () => {}; document.head.appendChild(sc); }
  }
  function netStop() { NET.on = false; try { NET.bc && NET.bc.close(); } catch (e) {} NET.bc = null; try { NET.room && NET.room.leave(); } catch (e) {} NET.room = null; NET.send = null; NET.peers = {}; }
  function netPost(m) { if (!NET.on) return; m.f = NET.id; m.ts = Date.now(); try { NET.bc && NET.bc.postMessage(m); } catch (e) {} try { NET.send && NET.send(m); } catch (e) {} }
  function netActive() { const now = Date.now(); return Object.values(NET.peers).filter((p) => now - p.seen < 7000); }
  function netKnownSave(p) { try { const k = JSON.parse(localStorage.getItem("zephyr-net-ismerosok") || "{}"); k[p.name] = { name: p.name, last: Date.now() }; const arr = Object.values(k).sort((a, b) => b.last - a.last).slice(0, 30); const o = {}; arr.forEach((q) => { o[q.name] = q; }); localStorage.setItem("zephyr-net-ismerosok", JSON.stringify(o)); } catch (e) {} }
  function netRecv(m) {
    if (!m || m.f === NET.id || !NET.on) return; if (m.to && m.to.indexOf(NET.id) < 0) return;
    const p = NET.peers[m.f] || (NET.peers[m.f] = { id: m.f, name: "?", seen: 0 }); p.seen = Date.now();
    if (m.k === "hi") { p.name = m.name || "Névtelen"; p.cls = m.cls; p.st = m.st; p.gid = m.gid; if (p.name !== "Névtelen") netKnownSave(p); if (HB.B && HB.page === "net") HB.B.dirty = 1; }
    else if (m.k === "q") { p.q = m.on ? (p.q || m.ts) : 0; p.cls = m.cls; }
    else if (m.k === "inv") { NET.inv = { from: m.f, name: p.name, gid: m.gid, cls: m.cls, t: Date.now() }; netInvShow(); }
    else if (m.k === "acc") { if (NET.myInv && NET.myInv.gid === m.gid) { NET.acc[m.f] = m.ok ? 1 : -1; if (HB.B) HB.B.dirty = 1; } }
    else if (m.k === "grp") netGroupStart(m);
    else if (m.k === "st") netState(m);
  }
  /* ---------------------------------------------------------------- jelenlét és a verseny állapotának küldése */
  function vrNetTick(dt) {
    if (!NET.on) return; const now = Date.now();
    if (now - NET.hiT > 2000) { NET.hiT = now; const pr = vrProfile(); netPost({ k: "hi", name: pr.name || "Névtelen", cls: W.kind === "race" ? (VRR.cls && VRR.cls.id) : (HB.sel || vrClsId()), st: W.kind === "race" ? (VRR.net ? "verseny (online)" : "versenyez") : NET.queue ? "indulna" : "a kikötőben", gid: VRR.net ? VRR.net.gid : null }); }
    /* automatikus csoport: a sorban állók közül a legkisebb azonosítójú alkotja a csoportot */
    if (NET.queue && W.kind === "harbor") { const q = netActive().filter((p) => p.q).map((p) => ({ id: p.id, name: p.name, t: p.q })); q.push({ id: NET.id, name: vrProfile().name || "Névtelen", t: NET.queue.t }); q.sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1));
      const master = q.slice().sort((a, b) => (a.id < b.id ? -1 : 1))[0]; if (now - NET.queue.ann > 1500) { NET.queue.ann = now; netPost({ k: "q", on: 1, cls: HB.sel }); }
      if (master.id === NET.id && (now - NET.queue.t > 8000 || q.length >= 4)) { const mem = q.slice(0, 4); if (mem.length > 1) netGroupSend(mem, false); else { NET.queue = null; netPost({ k: "q", on: 0 }); hbGo(false, 0, true); } } }
    /* verseny: a saját (és a házigazdánál a gépi) hajók helyzete 10 Hz-cel */
    const S = VRR, N = S.net; if (W.kind !== "race" || !N || !S.C) return;
    if (now - (N.sendT || 0) > 100) { N.sendT = now; const boats = [{ key: NET.id, o: NET.id, x: S.x, z: S.z, b: S.b, v: S.v, heel: S.heel || 0, next: S.next, fin: S.fin || 0, pen: S.pen || 0, dnf: !!S.dnf }];
      S.riv.forEach((r) => { if (!r.remote && !r.out && r.key) boats.push({ key: r.key, o: NET.id, x: r.x, z: r.z, b: r.b, v: r.v, heel: r.heel || 0, next: r.next, fin: r.fin || 0, pen: r.pen || 0, ai: !!r.aiTook }); });
      netPost({ k: "st", gid: N.gid, boats }); }
    /* kiesés-figyelés: aki 4 mp-ig hallgat, annak a hajóját a (mostani) házigazda veszi át */
    const alive = (id) => id === NET.id || (N.seen[id] && now - N.seen[id] < 4000);
    const host = N.members.map((m) => m.id).filter(alive).sort()[0];
    S.riv.forEach((r) => { if (!r.key || r.out) return; const owner = r.owner; if (r.remote && !alive(owner) && host === NET.id) { r.remote = false; r.owner = NET.id; if (r.human) r.aiTook = true; r.errNext = 0; } });
  }
  /* ---------------------------------------------------------------- csoport indítása (automatikus vagy saját futam) */
  function netGroupSend(mem, priv) { const gid = "g" + Math.random().toString(36).slice(2, 9), m = { k: "grp", gid, priv: !!priv, host: NET.id, members: mem.map((q) => ({ id: q.id, name: q.name })), cls: HB.sel || vrClsId(), lvl: (VRR.lvl && VRR.st === "done") ? VRR.lvl + 1 : 1, seed: (Math.random() * 1e9) | 0, startAt: Date.now() + 4000 }; m.night = VRR.nightForce || vrIsNight(m.lvl);
    netPost(m); netGroupStart(m, true); }
  function netGroupStart(m, self) {
    if (!self && !m.members.some((q) => q.id === NET.id)) return;
    NET.queue = null; NET.myInv = null; NET.inv = null; uiCloseAll();
    let seed = m.seed >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    VRR.net = { gid: m.gid, host: m.host, members: m.members, priv: m.priv, startAt: m.startAt, night: m.night, seen: {}, me: m.members.findIndex((q) => q.id === NET.id) }; VRR.netRnd = rnd; VRR.forceCls = m.cls; VRR.lvl = m.lvl;
    m.members.forEach((q) => { VRR.net.seen[q.id] = Date.now(); });
    setTimeout(() => { W._raceGo = true; W.open("race"); }, 30);
  }
  /* vrSetup hívja: a rajthelyek kiosztása a csoport sorrendjében, az emberi ellenfelek nevei, a gépi hajók gazdája */
  function vrNetSetup0(ST) { const N = VRR.net, slots = [ST.me].concat(ST.riv); return { me: slots[N.me] || ST.me, riv: slots.filter((q, i) => i !== N.me) }; }
  function vrNetSetup(ST) {
    const S = VRR, N = S.net; if (!N) return ST;
    let hi = 0; S.riv.forEach((r, i) => { r.human = false; r.remote = false; r.aiTook = false; r.out = false; r.key = "ai" + i; r.owner = N.host; r.netS = null; });
    N.members.forEach((mm, i) => { if (i === N.me) return; const r = S.riv[hi++]; if (!r) return; r.human = true; r.key = mm.id; r.owner = mm.id; r.remote = true; r.o = Object.assign({}, r.o, { name: mm.name || "Játékos", num: "HUN " + (11 + i) }); if (r.lbl) r.lbl.userData.set([r.o.name, ""]); });
    for (let i = hi; i < S.riv.length; i++) { const r = S.riv[i]; if (N.priv) { r.out = true; r.g.visible = false; r.lbl.visible = false; r.x += 9e4; r.z += 9e4; } else if (N.host !== NET.id) r.remote = true; }
    S.t = (Date.now() - N.startAt) / 1000 - 45; S.msg = N.priv ? "SAJÁT FUTAM – a meghívott játékosokkal" : `ONLINE FUTAM – ${N.members.length} játékos + gépi ellenfelek`; S.msgT = 6;
    return ST;
  }
  function netState(m) {
    const S = VRR, N = S.net; if (!N || m.gid !== N.gid || W.kind !== "race") return; N.seen[m.f] = Date.now();
    (m.boats || []).forEach((q) => { if (q.key === NET.id) return; const r = S.riv.find((o) => o.key === q.key); if (!r || r.out) return;
      if (!r.remote && q.o !== NET.id) { if (r.owner === NET.id && q.o < NET.id) { r.remote = true; r.owner = q.o; } else if (r.owner !== NET.id) r.remote = true; }
      if (!r.remote) return; r.owner = q.o; r.netS = { x: q.x, z: q.z, b: q.b, v: q.v, heel: q.heel, t: performance.now() }; r.next = q.next; r.pen = q.pen; if (q.ai) r.aiTook = true;
      if (q.fin && !r.fin) { r.fin = q.fin; S.res.push({ n: r.o.name, t: q.fin, human: !!r.human, ai: !!r.aiTook, dnf: !!q.dnf }); horn(.4, .06); } });
  }
  /* távoli hajó: a kapott helyzet felé simán (és a sebességével előre becsülve) mozog; a vitorlák a szokásos módon */
  function vrNetRemoteTick(r, dt) {
    const S = VRR, q = r.netS; if (q) { const age = (performance.now() - q.t) / 1000, ex = q.x + Math.sin(q.b) * q.v * Math.min(age, .6), ez = q.z - Math.cos(q.b) * q.v * Math.min(age, .6), k = Math.min(1, dt * 6);
      if (Math.hypot(ex - r.x, ez - r.z) > 30) { r.x = ex; r.z = ez; r.b = q.b; } r.x += (ex - r.x) * k; r.z += (ez - r.z) * k; r.b += wrapA(q.b - r.b) * k; r.v = q.v; r.heel = (r.heel || 0) + ((q.heel || 0) - (r.heel || 0)) * k; }
    const f = vfwd(r.b); r.g.position.set(r.x, Math.sin(W.t * 1.5 + r.ph) * .06, r.z); r.g.rotation.y = Math.atan2(f[0], f[1]);
    const OS = r.g.userData.S, wfv = vfwd(S.wf), Xv = [Math.cos(r.g.rotation.y), -Math.sin(r.g.rotation.y)], twa = Math.abs(wrapA(S.wf - r.b)) * R2D; OS.side = (wfv[0] * Xv[0] + wfv[1] * Xv[1]) > 0 ? -1 : 1;
    OS.boom = clamp((twa - 28) * .78, 7, 82) * D2R * OS.side; OS.jib = clamp((twa - 28) * .55, 8, 52) * D2R; OS.awa = twa; OS.aws = S.tws / KN * .6 + 3; OS.spin += ((twa > 108 && S.st === "race" ? 1 : 0) - OS.spin) * Math.min(1, dt * .35); OS.heel = -OS.side * (r.heel || 0); OS.pitch = Math.sin(W.t * 1.2 + r.ph) * .025;
    r.g.userData.update(dt); r.wk.push(r.x, r.z, r.g.rotation.y, r.v, dt, .05);
    const d2 = Math.hypot(r.x - S.x, r.z - S.z); r.lbl.visible = d2 > 12 * S.kz && d2 < 220; if (r.lbl.visible) { r.lbl.position.set(r.x, (S.pb ? 8 : 22) + Math.sin(W.t + r.i) * .3, r.z); const k = clamp(d2 * .03, 2.5, 7); r.lbl.scale.set(k, k * .32, 1); r.lbl.userData.set([r.o.name + (r.human ? " 👤" : ""), r.fin ? "befutott" : `${Math.round(d2)} m`]); }
    r.prevSide = lineSide(r);
    /* ütközés a saját hajóddal (a büntetést mindkét gépen a saját hajójára ítélik meg) */
    const hg = vrHullGap(S, r), HT = S.cls ? S.cls.hit : 4.6; if (hg.d < HT) { const k = (HT - hg.d); S.x -= hg.nx * k; S.z -= hg.nz * k; if (!r.bumpT || W.t - r.bumpT > 3) { r.bumpT = W.t; S.v *= .6; if (S.st === "race" && !S.fin) { const rule = vrRule(S, r); if (rule.keep === S) { vrFoulMe(r, rule.n); vrHail("Protest!"); } } } }
  }
  function vrNetLeaveRace() { const S = VRR; if (S.net) { S.net = null; S.netRnd = null; S.forceCls = null; } }
  /* ---------------------------------------------------------------- meghívás */
  function netInvShow() { if (W.kind !== "harbor") return; hbBoard("inv"); }
  function hbDrawNet(B, g) {
    if (HB.page === "inv") { const I = NET.inv; uiFrame(B, g, "✉ MEGHÍVÁS", "saját futamra hívtak"); uiCard(g, 40, 170, 1420, 400);
      g.fillStyle = "#fff"; g.font = `900 52px ${UIF}`; g.fillText(I ? `${I.name} meghív a saját futamára` : "A meghívás lejárt.", 80, 280); g.font = `600 30px ${UIF}`; if (I) g.fillText(`Hajó: ${boatCls(I.cls).n} · csak a meghívottak versenyeznek`, 80, 350);
      if (I) { B.btn(40, 640, 700, 140, "✓ Elfogadom", () => { netPost({ k: "acc", gid: I.gid, ok: 1, to: [I.from] }); NET.inv = null; HB.page = "wait"; B.dirty = 1; }, { gold: true, fs: 44 }); B.btn(760, 640, 700, 140, "✕ Most nem", () => { netPost({ k: "acc", gid: I.gid, ok: 0, to: [I.from] }); NET.inv = null; hbMenu(); }, { fs: 40 }); }
      else B.btn(40, 640, 1420, 120, "‹ Kikötői menü", hbMenu); return; }
    if (HB.page === "wait") { uiFrame(B, g, "⏳ VÁRAKOZÁS", "a házigazda indítja a futamot"); g.fillStyle = "#fff"; g.font = `800 40px ${UIF}`; g.fillText("Elfogadtad a meghívást – a futam a házigazda indítására kezdődik.", 60, 300); B.btn(40, 860, 1420, 100, "Mégse", hbMenu); return; }
    uiFrame(B, g, "👥 TÖBBJÁTÉKOS", NET.on ? `online vagy · azonosító: ${NET.id}` : "offline – kapcsold be, hogy lássanak és meghívhassanak");
    B.btn(1100, 150, 360, 70, NET.on ? "● Online" : "○ Offline", () => { if (NET.on) { try { localStorage.setItem("zephyr-net", "0"); } catch (e) {} netStop(); } else { try { localStorage.setItem("zephyr-net", "1"); } catch (e) {} netStart(); } }, NET.on ? { green: true } : {});
    uiCard(g, 40, 236, 1420, 470); uiH(g, "JÁTÉKOSOK", 70, 282);
    const act = netActive().sort((a, b) => (a.name || "").localeCompare(b.name || "")); let y = 300;
    act.slice(0, 5).forEach((p) => { const on = !!NET.sel[p.id], acc = NET.acc[p.id]; g.fillStyle = "rgba(30,142,79,.35)"; uiRR(g, 60, y, 1380, 64, 14); g.fill(); g.fillStyle = "#3be37a"; g.beginPath(); g.arc(92, y + 32, 12, 0, TAU); g.fill();
      g.fillStyle = "#7CFC9A"; uiFit(g, p.name || "?", 520, 32, 900); g.fillText(p.name || "?", 120, y + 43); g.fillStyle = "#d8ffe4"; g.font = `600 22px ${UIF}`; g.fillText(`${p.st || ""} · ${boatCls(p.cls).sh}${acc === 1 ? " · ✓ elfogadta" : acc === -1 ? " · ✕ nem" : ""}`, 660, y + 41);
      B.btn(1180, y + 6, 250, 52, on ? "✓ kijelölve" : "kijelölöm", () => { NET.sel[p.id] = !NET.sel[p.id]; }, on ? { gold: true, fs: 24 } : { fs: 24 }); y += 74; });
    if (!act.length) { g.fillStyle = "#fff"; g.font = `600 26px ${UIF}`; g.fillText(NET.on ? "Most senki más nincs a kikötőben. Ha valaki megjön, itt felül zölddel jelenik meg." : "Offline vagy.", 70, 340); y = 360; }
    /* korábban látott, most nem elérhető játékosok (szürkén, nem meghívhatók) */
    try { const k = Object.values(JSON.parse(localStorage.getItem("zephyr-net-ismerosok") || "{}")).filter((q) => !act.some((p) => p.name === q.name)); g.font = `600 22px ${UIF}`; g.fillStyle = "rgba(255,255,255,.45)"; k.slice(0, 6).forEach((q, i) => g.fillText("○ " + q.name + " – nem elérhető", 70 + (i % 2) * 700, Math.max(y, 380) + 30 + Math.floor(i / 2) * 32)); } catch (e) {}
    const selIds = Object.keys(NET.sel).filter((id) => NET.sel[id] && act.some((p) => p.id === id)), accIds = Object.keys(NET.acc).filter((id) => NET.acc[id] === 1 && act.some((p) => p.id === id));
    B.btn(40, 730, 700, 100, "👥 Online futam (automatikus négyes csoport)", () => { NET.queue = { t: Date.now(), ann: 0 }; netPost({ k: "q", on: 1, cls: HB.sel }); B.dirty = 1; }, NET.on ? (NET.queue ? { green: true, fs: 28 } : { fs: 28 }) : { off: true });
    B.btn(760, 730, 700, 100, selIds.length ? `✉ Meghívás saját futamra (${selIds.length})` : "✉ Jelölj ki játékost a meghíváshoz", () => { const gid = "g" + Math.random().toString(36).slice(2, 9); NET.myInv = { gid, to: selIds }; NET.acc = {}; netPost({ k: "inv", gid, cls: HB.sel, to: selIds }); }, selIds.length ? { fs: 28 } : { off: true, fs: 26 });
    if (NET.queue) { g.fillStyle = "#7CFC9A"; g.font = `800 26px ${UIF}`; g.fillText(`Indulók keresése… ${Math.max(0, 8 - Math.floor((Date.now() - NET.queue.t) / 1000))} mp (ha senki nem jön, gépi ellenfelekkel indul)`, 40, 860); }
    if (NET.myInv && accIds.length) B.btn(40, 870, 900, 100, `▶ Saját futam indítása (${accIds.length + 1} játékos)`, () => netGroupSend([{ id: NET.id, name: vrProfile().name || "Névtelen", t: 0 }].concat(accIds.map((id, i) => ({ id, name: NET.peers[id].name, t: i + 1 }))), true), { gold: true });
    B.btn(NET.myInv && accIds.length ? 960 : 40, 870, NET.myInv && accIds.length ? 500 : 1420, 100, "‹ Kikötői menü", () => { NET.queue = null; netPost({ k: "q", on: 0 }); hbMenu(); });
  }
  W._net = NET; W._netf = { post: (m) => netPost(m), send: (mem, priv) => netGroupSend(mem, priv) };   /* (tesztekhez) */
