  /* =================================================================== 5/ZC. KÉKSZALAG – a Balaton-kerülő túraverseny (2026. nov. 15., a tulajdonos kérése, 18:39 és 18:50:
     „a kékszalag pályát is szeretném megrendezni, ahol az egész Balaton-kört meg lehet tenni … más-más, már meglévő helyszíneken áthaladva be is esteledik,
     és éjszaka fut be … A legjobb hibátlan futamidő, ami úgy szinte lehetetlen legyen, 1 óra, az időkeret pedig 3 óra. Ez egy túraverseny, ahol a szél változik,
     nem mindegy, északi vagy déli parton megyünk vagy középen; ezeket véletlenszerűen csinálja a gép, hogy melyik szakasz hol jobb … A versenyen legalább
     200 hajó legyen; rönkhajó és flamingó ne, azoknak külön Kékszalag legyen, ahol persze a nagyhajók is jelen vannak – az a Bolondok Kékszalagja.”)
     FELÉPÍTÉS (a valódi Kékszalag útvonala: Balatonfüred → Tihanyi-szoros → Badacsony → keszthelyi forduló → déli part → Siófok → kenesei forduló → Füred):
     • KILENC SZAKASZ a tó valódi pontjain (a meglévő helyszínek tájával és nevezetességeivel); minden szakasz végén széles KAPU keresztben a tavon –
       bárhol át lehet menni rajta: északon, középen vagy délen. A 4. szakaszban a keszthelyi, a 8.-ban a kenesei fordulóbóját kell megkerülni.
     • A SZÉL szakaszonként más (irány, erő), és a tó egyik részén erősebb: hol az északi part, hol a déli, hol a közép – véletlenszerűen. A szelesebb rész
       a vízen is látszik: sötétebb, fodrosabb; a gyengébb világosabb, simább (és a műszer térképén is).
     • NAPSZAK: délután rajt (nappal) → Badacsonynál aranyló délután → Keszthelynél naplemente → a déli parton alkonyat → Siófoktól éjszaka, éjjel befutó Füreden.
     • IDŐ: a szakaszidők összeadódnak (összetett idő). A tökéletes vitorlázás kb. 1 óra; az időkeret 3 óra.
     • MEZŐNY: 200 hajó (a három ismert versenytárs teljes modellel, a többi könnyített, példányosított modellel; éjjel mindegyiken helyzetfény) – a szakaszok
       között a mezőny az időkülönbségek szerint áll fel (üldözéses rajt): aki előrébb jár az összetettben, előrébb rajtol.
     • BOLONDOK KÉKSZALAGJA: ugyanaz az útvonal, de a mezőny harmada rönktutaj, harmada flamingó, a többi nagyhajó; itt a játékos is bármelyik hajóval indulhat.
     Pályaszámok: 201 = Kékszalag, 202 = Bolondok Kékszalagja. */
  const KEK_ST = [
    { n: "Balatonfüred – a rajt", a: [46.9440, 17.9010], b: [46.9251, 17.8923], tod: "day", ven: "Balatonfüred", d: "Rajt Füred előtt, irány dél-délnyugat, a Tihanyi-szoros felé." },
    { n: "A Tihanyi-szoros", a: [46.9010, 17.9020], b: [46.8790, 17.8920], tod: "day", ven: "Tihany", d: "Át a tó legszűkebb pontján, a félsziget és Szántód között; fent az apátság." },
    { n: "Badacsony előtt", a: [46.7860, 17.6030], b: [46.7813, 17.5749], tod: "day", ven: "Badacsony", d: "A tanúhegyek alatt nyugatnak: szemközt a Badacsony koporsója, a Gulács kúpja." },
    { n: "A keszthelyi forduló", a: [46.7360, 17.3580], mk: [46.7310, 17.3360], b: [46.7370, 17.3550], tod: "gold", ven: "Keszthely", d: "Ki a keszthelyi öbölbe, a fordulóbóját BAL kéz felől kerüld, aztán vissza keletnek – lemenő napban." },
    { n: "Fonyód – a déli part", a: [46.7700, 17.5350], b: [46.7732, 17.5635], tod: "sunset", ven: "Fonyód", d: "Kelet felé a déli part mentén, a fonyódi ikerhegy előtt – naplemente." },
    { n: "Boglár és Szemes", a: [46.8080, 17.6900], b: [46.8158, 17.7166], tod: "dusk", ven: "Balatonboglár", d: "Alkonyat: a gömbkilátó fényjátéka a Várdombon, előtted a tó keleti medencéje." },
    { n: "Siófok – éjszaka", a: [46.9230, 18.0230], b: [46.9371, 18.0433], tod: "night", ven: "Siófok", d: "Siófok fényei: az óriáskerék, az Aranyangyal, a víztorony – irány északkelet, Kenese." },
    { n: "A kenesei forduló", a: [46.9880, 18.0870], mk: [46.9971, 18.0980], b: [46.9866, 18.0820], tod: "night", ven: "Balatonkenese", d: "A tó keleti csücske: a fordulóbóját BAL kéz felől kerüld, aztán vissza nyugatnak." },
    { n: "Füred – éjszakai befutó", a: [46.9400, 17.9800], b: [46.9434, 17.9489], tod: "night", ven: "Balatonfüred", d: "Az utolsó szakasz Füred fényei felé; a célkapu a kikötő előtt." }];
  const KEK = { on: false }; W._kek = KEK; W._kekApi = { begin: (l) => kekBegin(l), next: () => kekNext(), done: () => kekStageDone(), rank: () => kekRank(), pol: (a, s) => polar(a, s), wet: (x, z) => vrWet(x, z), legT: (i, wf, kn) => kekLegT(i, wf, kn), raw: (i) => kekWindRaw(i), winds: () => kekWinds() };   /* (tesztekhez) */
  const KEK_GW = 800;   /* a szakaszkapu szélessége (m) */
  const kekIs = (lvl) => lvl === 201 || lvl === 202;
  function kekVenue(si) { const s = KEK_ST[si]; return { id: "kek" + si, n: s.n.indexOf(s.ven) === 0 ? s.n : `${s.ven} – ${s.n}`, lat: s.a[0], lon: s.a[1], basin: s.a[1] < 17.6 ? "nyugati" : s.a[1] < 17.9 ? "kozepso" : "keleti", d: s.d }; }
  /* a szakasz szele: irány és erő a futam magjából; a „jobb oldal” (észak / dél / közép) is innen */
  /* a szakasz ideális (hibátlan, robotkormányos) menetideje adott szélben: szakaszonként a cél felé vett legjobb VMG a poláris diagramból (ugyanaz a fizika, mint a hajódé) */
  function kekLegT(si, wf, kn) { const s = KEK_ST[si], P = [s.a].concat(s.mk ? [s.mk] : [], [s.b]).map((q) => balXY(q[0], q[1])); let t = 0;
    for (let i = 0; i + 1 < P.length; i++) { const dx = P[i + 1][0] - P[i][0], dz = P[i + 1][1] - P[i][1], d = Math.hypot(dx, dz), brg = Math.atan2(dx, -dz); let best = .1;
      for (let h = 0; h < 360; h += 2) { const hb = h * D2R, twa = Math.abs(wrapA(wf - hb)) * R2D, v = polar(twa, twa > 105) * Math.cos(hb - brg); if (v > best) best = v; }
      t += d / (best * KN * VR_SPD * 1.05 * Math.sqrt(kn / 12)); } return t; }
  /* 2026-11-15 (tulajdonos: „a legjobb hibátlan futamidő, ami úgy szinte lehetetlen legyen, 1 óra”): a kilenc szakasz szele együtt készül – irány, erősebb oldal és
     a szakaszok egymáshoz mért ereje véletlenszerű, de az erőket közösen úgy hangoljuk, hogy a robotpontosságú (fordulóveszteség nélküli) vitorlázás kb. 53 perc legyen:
     így a tökéletes emberi futam kb. 1 óra, jobb idő szinte lehetetlen. Az időkeret 3 óra. */
  const KEK_IDEAL = 3180;
  /* (a tökéletes vitorlázó a szelesebb sávot használja: középen a tengelyen, parti oldalnál részben – a becslés ezzel a szélerővel számol) */
  const kekEffKn = (w) => w.kn * (1 + w.amp * (w.side === "közép" ? 1 : .6));
  function kekWinds() { if (KEK.W && KEK.Wseed === KEK.seed) return KEK.W; const W0 = KEK_ST.map((s, i) => kekWindRaw(i));
    for (let it = 0; it < 4; it++) { const T = W0.reduce((acc, w, i) => acc + kekLegT(i, w.wf, kekEffKn(w)), 0), sc = (T / KEK_IDEAL) ** 2; W0.forEach((w) => { w.kn = clamp(w.kn * sc, 5.5, 19); }); }
    W0.forEach((w, i) => { w.ideal = kekLegT(i, w.wf, kekEffKn(w)); }); KEK.W = W0; KEK.Wseed = KEK.seed; return W0; }
  function kekWind(si) { return kekWinds()[si]; }
  function kekWindRaw(si) { const R = vrRng((KEK.seed || 7) * 31 + si * 977 + 3), dirs = [[315, .34], [335, .16], [290, .12], [0, .08], [225, .1], [180, .08], [110, .07], [45, .05]];
    let u = R(), wd = 315; for (const [d, p] of dirs) { if (u < p) { wd = d; break; } u -= p; } wd += (R() - .5) * 26;
    const kn = 8 + R() * 8, side = ["észak", "dél", "közép"][Math.floor(R() * 3)], amp = .2 + R() * .14; return { wf: ((wd % 360) + 360) % 360 * D2R, kn, side, amp }; }
  function kekCourse(si) {
    const s = KEK_ST[si], [ax, az] = balXY(s.a[0], s.a[1]), rel = (ll) => { const [x, z] = balXY(ll[0], ll[1]); return { x: x - ax, z: z - az }; };
    const B = rel(s.b), M = s.mk ? rel(s.mk) : null, first = M || B, dl = Math.hypot(first.x, first.z) || 1, u = [first.x / dl, first.z / dl], c = [-u[1], u[0]], L = si === 0 ? 520 : 70 * Math.max(.6, vrCs());   /* a Kékszalag rajtvonala széles: 200 hajó rajtol egyszerre */
    const w = kekWind(si), marks = [];
    if (M) marks.push({ x: M.x, z: M.z, sd: 1, nm: si === 3 ? "Keszthelyi forduló" : "Kenesei forduló" });
    marks.push({ x: B.x, z: B.z, gate: { w: KEK_GW }, nm: si === KEK_ST.length - 1 ? "CÉL – Füred" : `${si + 1}. szakaszkapu` });
    const C = { name: `${KEK.fun ? "Bolondok Kékszalagja" : "Kékszalag"} ${si + 1}/${KEK_ST.length}: ${s.n}`, lvl: KEK.lvl || 201, wf: w.wf, tws: w.kn * KN, wxn: `${w.kn.toFixed(0)} csomó, ${w.side === "közép" ? "középen" : w.side + "i part felé"} erősebb`, marks, u, c,
      line: { a: { x: -c[0] * L / 2, z: -c[1] * L / 2 }, b: { x: c[0] * L / 2, z: c[1] * L / 2 } }, kek: { si, w, tod: s.tod, o: [ax, az] }, isNew: 1, night: s.tod === "dusk" || s.tod === "night", storm: 0 };
    vrMarksPrep(C);
    /* a szél erősebb oldala: a kapu keresztirányában (a kapu két vége közül az északibb / délibb, vagy a közép) */
    const G = marks[marks.length - 1].gate, nside = (G.b.z < G.a.z) ? 1 : -1;   /* +1: a kapu „b” vége esik északabbra (kisebb z) */
    C.kek.grad = { ox: B.x, oz: B.z, cx: (G.b.x - G.a.x) / KEK_GW, cz: (G.b.z - G.a.z) / KEK_GW, hw: KEK_GW * .62, mode: w.side === "közép" ? 0 : (w.side === "észak" ? nside : -nside), amp: w.amp };
    return C;
  }
  /* a lateralis szélszorzó egy pontban (a kapu vonala mentén kiterjesztve a teljes szakaszra) */
  function kekGradK(x, z) { const g = RW.kekGrad; if (!g) return 1; const s = clamp(((x - g.ox) * g.cx + (z - g.oz) * g.cz) / g.hw, -1.3, 1.3);
    const f = g.mode === 0 ? 1 - 2 * Math.min(1, s * s) : clamp(s * g.mode, -1, 1); return 1 + g.amp * f; }

  /* ---------------------------------------------------------------- indítás / szakaszváltás */
  function kekBegin(lvl) { Object.assign(KEK, { on: true, lvl, fun: lvl === 202, si: 0, T: 0, seed: (Date.now() / 1000 | 0) % 100000, res: [], fleet: null, riv: {}, done: false, over: 0, stageEnd: -1, board: null, W: null, t0: performance.now() });
    if (KEK.fl) { KEK.fl.T.fill(0); KEK.fl.off.fill(0); } }   /* (a mezőny összetett ideje is nulláról indul – a hajók újrahasznosulnak) */
  function kekEnd() { KEK.on = false; RW.kekGrad = null; if (KEK.fl) KEK.fl.G.visible = false; try { kekSkyReset(); } catch (e) {} try { VRR.water.userData.mat.uniforms.uKg2.value.w = 0; } catch (e) {} if (typeof NGT !== "undefined") { NGT.tw = 0; try { NGT.sky.material.uniforms.uTw.value = 0; } catch (e) {} } kekBoard(false); }
  /* a vrSetup ELEJÉN (pl. „Újrakezdés” a szakaszvégi tábla alatt): a már teljesített szakasz helyett a következő jön, a befejezett Kékszalag elölről indul */
  function kekPreSetup(lvl) { if (!KEK.on || !kekIs(lvl)) return; if (KEK.B) kekBoard(false);
    if (KEK.stageEnd === KEK.si) { if (KEK.board && KEK.board.last) kekBegin(KEK.lvl); else { KEK.si++; KEK.stageEnd = -1; } } }
  /* a vrSetup végén: üldözéses rajt a 2. szakasztól; a rajtvonal kellékei csak az első szakaszban látszanak */
  function kekSetupHook(C) {
    const S = VRR; if (!KEK.on || !C.kek) return; const si = C.kek.si;
    RW.kekGrad = C.kek.grad; try { const U = S.water.userData.mat.uniforms; if (U.uKg) { U.uKg.value.set(C.kek.grad.ox, C.kek.grad.oz, C.kek.grad.cx, C.kek.grad.cz); U.uKg2.value.set(C.kek.grad.mode, C.kek.grad.amp, C.kek.grad.hw, 1); } } catch (e) {}
    C.limit = 0; C.ideal = 0; S.kekT0 = KEK.T;   /* (az időkeret a teljes versenyre: 3 óra – kekTick) */
    kekFleetBuild(); kekFleetPlace(C, si);
    const vis = si === 0; [S.cb, S.pin, S.pin2, S.lineM].forEach((o) => { if (o) o.visible = vis; }); if (S.cbCrew) S.cbCrew.forEach((c) => { if (c.g) c.g.visible = vis; });
    if (si > 0) { /* repülő rajt: a mezőny már úton van */
      /* a repülő rajt iránya: a cél felé – ha az szembeszél volna, a közelebbi csapáson, élesszélben (szélben állva nem indulhat a szakasz) */
      const d = C.u, brg = Math.atan2(d[0], -d[1]), rel = wrapA(brg - C.wf), hd = Math.abs(rel) < 46 * D2R ? C.wf + (rel >= 0 ? 1 : -1) * 46 * D2R : brg, p0 = kekGapPos(0, C);
      Object.assign(S, { st: "race", started: true, t: 0, ocs: 0, x: p0.x, z: p0.z, b: (hd + TAU) % TAU, v: 4.2, horns: { warn: 1, prep: 1, one: 1 } }); for (let k = 1; k <= 10; k++) S.horns["c" + k] = 1;
      S.riv.forEach((r, i) => { const g = (KEK.riv[i] || 0) - KEK.T, p = kekGapPos(g, C, [-75, 75, 150][i] != null ? [-75, 75, 150][i] : (i + 1) * 70);   /* oldalt a játékostól: azonos idejű hajó se ütközzön a rajtnál */ Object.assign(r, { x: p.x, z: p.z, b: (hd + TAU) % TAU, v: 4.2, tack: wrapA(hd - C.wf) > 0 ? 1 : -1, started: true, next: 0, fin: null, _mi: -1, prevSide: null }); });
      S.msg = `🏁 ${KEK_ST[si].n} – ${KEK_ST[si].d}`; S.msgT = 9; }
    else { S.msg = `🏁 KÉKSZALAG – rajt Füred előtt! 9 szakasz a tó körül; a szél ${C.kek.w.side === "közép" ? "a tó KÖZEPÉN" : C.kek.w.side === "észak" ? "az ÉSZAKI part felé" : "a DÉLI part felé"} erősebb – a sötétebb, fodros víz a szelesebb.`; S.msgT = 10; }
    try { kekTod(KEK_ST[si].tod); } catch (e) { console.warn("napszak", e); }
  }
  /* egy hajó helye az üldözéses rajtnál: g mp-cel az élboly mögött (negatív: előtte), oldalt ‘lat’ méterrel */
  function kekGapPos(g, C, lat) { const vref = 5.2, d = clamp(g * vref, -700, 900); return { x: -C.u[0] * d + C.c[0] * (lat || 0), z: -C.u[1] * d + C.c[1] * (lat || 0) }; }
  /* a játékos átment a szakaszkapun */
  function kekStageDone() {
    const S = VRR, si = KEK.si, tp = S.t; if (KEK.stageEnd === si) return; KEK.stageEnd = si;
    KEK.T += tp; KEK.res.push({ si, t: tp });
    /* a még úton lévők ideje: a hátralévő távolság becsült menetidővel */
    const C = S.C, gm = S.marks[S.marks.length - 1], est = (x, z, nx) => { const rem = Math.hypot(gm.x - x, gm.z - z) + (nx === 0 && S.marks.length > 1 ? Math.hypot(S.marks[0].x - x, S.marks[0].z - z) * 0 : 0); return S.t + rem / 4.6; };
    S.riv.forEach((r, i) => { const base = KEK.riv[i] != null ? KEK.riv[i] : 0, rt = r.kekT != null ? r.kekT : est(r.x, r.z, r.next); KEK.riv[i] = base + rt; });
    const F = KEK.fl; if (F) for (let i = 0; i < F.n; i++) { const rt = F.st[i] >= 0 ? F.st[i] : est(F.x[i], F.z[i], F.nx[i]); F.T[i] += rt + F.off[i]; F.off[i] = 0; }
    const last = si >= KEK_ST.length - 1 || !!KEK.over; KEK.board = { si, tp, last };   /* (a 3 órás időkeret lejártával a verseny véget ér) */ S.st = "kek"; S.paused = true;
    uiSnd("success"); if (last) { [0, 400, 800].forEach((d) => setTimeout(() => horn(.35, .12), d)); vrApplause(5); }
    kekBoard(true);
  }
  function kekNext() { kekBoard(false); const S = VRR; if (KEK.board && KEK.board.last) { const rk = kekRank(), me = rk.findIndex((q) => q.me) + 1; KEK.done = true; S.st = "done"; S.paused = false;
      S.msg = S.dnf ? "KÉKSZALAG – vége: a 3 órás időkeretbe nem fértél bele." : `${KEK.fun ? "BOLONDOK KÉKSZALAGJA" : "KÉKSZALAG"} – vége! Összetett idő ${kekHms(KEK.T)}, ${me}. hely a ${rk.length} hajóból.`; S.msgT = 14; return; }
    KEK.si++; KEK.stageEnd = -1; S.paused = false; vrSetup(KEK.lvl); }
  /* összetett helyezés: a játékos és a mezőny becsült összetett ideje */
  function kekRank() { const S = VRR, C = S.C, gm = S.marks[S.marks.length - 1], vref = 4.6, my = KEK.T + (S.st === "kek" ? 0 : S.t + Math.hypot(gm.x - S.x, gm.z - S.z) / vref), all = [{ me: 1, n: S.meName || "Te", T: my }];
    S.riv.forEach((r, i) => all.push({ n: r.o.name, T: (KEK.riv[i] || 0) + (S.st === "kek" ? 0 : (r.kekT != null ? r.kekT : S.t + Math.hypot(gm.x - r.x, gm.z - r.z) / vref)) }));
    const F = KEK.fl; if (F) for (let i = 0; i < F.n; i++) all.push({ n: F.nm[i], T: F.T[i] + (S.st === "kek" ? 0 : (F.st[i] >= 0 ? F.st[i] : S.t + Math.hypot(gm.x - F.x[i], gm.z - F.z[i]) / vref)) + F.off[i] });
    all.sort((a, b) => a.T - b.T); return all; }
  /* képkockánként (a verseny tickjéből) */
  function kekTick(dt) {
    const S = VRR; if (!KEK.on || !S.C || !S.C.kek) return;
    /* a három ismert versenytárs: a szakaszkapun átérve az idejük rögzül, és tovább sodródnak */
    S.riv.forEach((r) => { if (r.next >= S.marks.length && r.kekT == null) { r.kekT = S.t; r.fin = S.t; } });
    if (S.st === "race" && !S.paused) kekFleetTick(dt); else kekFleetDraw();
    if (KEK.skyOn) kekSkyEnforce();
    /* időkeret: 3 óra összesen */
    if (S.st === "race" && KEK.T + S.t > 10800 && !KEK.over) { KEK.over = 1; S.dnf = true; S.msg = "⏱ Lejárt a 3 órás időkeret – a Kékszalagot nem fejezted be."; S.msgT = 12; kekStageDone(); }
  }
  /* ---------------------------------------------------------------- szakaszvégi tábla: térkép az útvonallal, szakasz- és összetett eredmény */
  function kekBoard(on) {
    const S = VRR; if (!on) { if (KEK.B) { KEK.B.destroy(); KEK.B = null; } return; }
    if (KEK.B) KEK.B.destroy();
    KEK.B = uiBoard({ w: 1500, h: 1000, mw: 1.5, dist: 1.5, y: -.02, fps: 3, bar: 120, draw: (B, g) => {
      const b = KEK.board || {}, rk = kekRank(), me = rk.findIndex((q) => q.me) + 1, N = rk.length;
      uiCard(g, 20, 20, 1460, 960); g.textAlign = "left"; g.textBaseline = "alphabetic";
      g.fillStyle = "#ffd166"; g.font = `900 30px ${UIF}`; g.fillText(KEK.fun ? "BOLONDOK KÉKSZALAGJA" : "KÉKSZALAG – Balaton-kerülő túraverseny", 60, 84);
      g.fillStyle = "#fff"; g.font = `900 52px ${UIF}`; g.fillText(b.last ? (S.dnf ? "Nem értél célba" : "🏁 BEFUTOTTÁL!") : `${b.si + 1}. szakasz kész: ${KEK_ST[b.si].n}`, 60, 150);
      g.font = `700 30px ${UIF}`; g.fillStyle = "#cfe3f2"; g.fillText(`Szakaszidő ${mmss(b.tp)}  ·  összetett idő ${kekHms(KEK.T)}  ·  helyezés: ${me}. a ${N} hajóból`, 60, 200);
      /* a tó körvonala és az útvonal */
      const Bd = balData(), P = Bd.P; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; P.forEach((p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
      const mx = 60, my = 250, mw = 860, mh = 430, k = Math.min(mw / (x1 - x0), mh / (z1 - z0)), ox = mx + (mw - (x1 - x0) * k) / 2, oy = my + (mh - (z1 - z0) * k) / 2, Q = (x, z) => [ox + (x - x0) * k, oy + (z - z0) * k];
      uiRR(g, mx - 10, my - 10, mw + 20, mh + 20, 18); g.fillStyle = "#0a2a40"; g.fill();
      g.beginPath(); P.forEach((p, i) => { const q = Q(p[0], p[1]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.fillStyle = "#1c6f8c"; g.fill(); g.lineWidth = 2; g.strokeStyle = "#9fd6ea"; g.stroke();
      const pts = []; KEK_ST.forEach((s) => { pts.push(balXY(s.a[0], s.a[1])); if (s.mk) pts.push(balXY(s.mk[0], s.mk[1])); pts.push(balXY(s.b[0], s.b[1])); });
      g.setLineDash([10, 8]); g.lineWidth = 4; g.strokeStyle = "rgba(255,209,102,.85)"; g.beginPath(); pts.forEach((p, i) => { const q = Q(p[0], p[1]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke(); g.setLineDash([]);
      KEK_ST.forEach((s, i) => { const q = Q(...balXY(s.a[0], s.a[1])), done = i <= b.si; g.fillStyle = done ? "#3ddc84" : "#ffd166"; g.beginPath(); g.arc(q[0], q[1], done ? 11 : 8, 0, TAU); g.fill(); g.fillStyle = "#04121f"; g.font = `900 14px ${UIF}`; g.textAlign = "center"; g.fillText(String(i + 1), q[0], q[1] + 5); g.textAlign = "left"; });
      /* jobb oldal: az összetett első 10 + te */
      let y = 270; g.fillStyle = "#ffd166"; g.font = `800 28px ${UIF}`; g.fillText("ÖSSZETETT", 960, y); y += 14;
      const top = rk.slice(0, 10); if (me > 10) top.push(rk[me - 1]);
      top.forEach((q) => { const pos = rk.indexOf(q) + 1; y += 40; g.fillStyle = q.me ? "#ffd166" : "#fff"; g.font = `${q.me ? 900 : 700} 26px ${UIF}`; g.fillText(`${pos}.`, 960, y); const nm = String(q.n).slice(0, 18); g.fillText(nm, 1020, y); g.textAlign = "right"; g.fillText(kekHms(q.T), 1430, y); g.textAlign = "left"; });
      /* következő szakasz */
      if (!b.last) { const n = KEK_ST[b.si + 1], w = kekWind(b.si + 1); g.fillStyle = "#7dffb0"; g.font = `800 30px ${UIF}`; g.fillText(`Következik: ${b.si + 2}. ${n.n}`, 60, 740); g.fillStyle = "#cfe3f2"; g.font = `600 25px ${UIF}`; uiWrap(g, `${n.d} Szél: ${w.kn.toFixed(0)} csomó, ${w.side === "közép" ? "középen" : w.side + "i part felé"} erősebb. ${{ day: "Nappal.", gold: "Aranyló délután.", sunset: "Naplemente.", dusk: "Alkonyat.", night: "Éjszaka." }[n.tod]}`, 60, 780, 1360, 34, 3); }
      else { g.fillStyle = "#7dffb0"; g.font = `800 32px ${UIF}`; g.fillText(S.dnf ? "Legközelebb sikerül – a 3 órás időkeret szoros." : `Összetett idő: ${kekHms(KEK.T)} – ${me}. hely a ${N} hajóból!`, 60, 760); }
      B.btn(980, 880, 470, 84, b.last ? "✓ Bezárás" : "TOVÁBB ▶  következő szakasz", () => kekNext(), { gold: true, fs: 30 }); } });
    KEK.B.show(true);
  }
  const kekHms = (t) => { const s = Math.max(0, Math.round(t)); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

  /* ---------------------------------------------------------------- MEZŐNY: 200 könnyített hajó (példányosítva), egyszerű kormányossal */
  const KEK_HULL = ["#f4f4f0", "#f4f4f0", "#1f3a6a", "#ffffff", "#c62828", "#1f4d2b", "#2b2f36", "#d9dde1", "#0e5a8a", "#f2f2ea"];
  const KEK_NAMES = ["Szélvész", "Hableány", "Libella", "Albatrosz", "Tramontana", "Fecske", "Napfény", "Viharmadár", "Délibáb", "Csillag", "Szellő", "Sirály", "Nádas", "Holdfény", "Ezüstpart", "Bóra", "Kékes", "Pajkos", "Vándor", "Hullám"];
  function kekFleetBuild() {
    if (KEK.fl && KEK.fl.G.parent === VRR.env && KEK.fl.fun === !!KEK.fun) { KEK.fl.G.visible = true; return; }
    if (KEK.fl && KEK.fl.G.parent) KEK.fl.G.parent.remove(KEK.fl.G);   /* a másik Kékszalag (nagyhajós ↔ bolondok) mezőnye más összetételű – újraépül */
    const S = VRR, N = 200, R = vrRng((KEK.seed || 7) * 3 + 11), fun = !!KEK.fun;
    const F = KEK.fl = { fun, n: N, x: new Float32Array(N), z: new Float32Array(N), b: new Float32Array(N), v: new Float32Array(N), tk: new Float32Array(N), lane: new Float32Array(N), sk: new Float32Array(N), T: new Float32Array(N), st: new Float32Array(N), off: new Float32Array(N), nx: new Uint8Array(N), lt: new Float32Array(N), cls: new Uint8Array(N), sc: new Float32Array(N), nm: [], G: new THREE.Group() };
    for (let i = 0; i < N; i++) { const u = R(); F.cls[i] = fun ? (u < .34 ? 1 : u < .68 ? 2 : 0) : 0; F.sk[i] = .86 + R() * .15 + (R() < .04 ? .04 : 0); F.sc[i] = F.cls[i] ? 1 : .8 + R() * .55; F.tk[i] = R() < .5 ? 1 : -1;
      F.nm.push((F.cls[i] === 1 ? "Tutaj " : F.cls[i] === 2 ? "Flamingó " : "") + KEK_NAMES[i % KEK_NAMES.length] + (i >= KEK_NAMES.length ? " " + (Math.floor(i / KEK_NAMES.length) + 1) : "")); }
    S.env.add(F.G); F.G.userData.noMerge = 1;
    /* geometriák: jacht (hajótest + fedélzet + árboc), nagyvitorla, orrvitorla; tutaj (rönkök + árboc) és vitorlája; flamingó */
    const I = new THREE.Matrix4(), hullG = (() => { const pts = [], st = 10; const parts = [];
      /* hajótest: hegyes orr, széles far, felfelé ívelő fedélzetvonal (sheer), oldalt kifelé dőlő palánk, V-fenék */
      const prof = []; for (let k = 0; k <= st; k++) { const t = k / st, z = -7 + 14 * t, hb = t < .62 ? 2.1 * (.78 + .22 * Math.sin(Math.PI * t / 1.24)) : 2.1 * Math.cos((t - .62) / .38 * Math.PI / 2) ** .75, sh = .95 + .55 * t * t; prof.push([z, Math.max(.03, hb), sh]); }
      const pos = [], idx = []; prof.forEach(([z, hb, sh]) => { const t = (z + 7) / 14, keel = -(.55 + .25 * Math.sin(Math.PI * t)) * (t > .9 ? 1 - (t - .9) * 6 : 1); [[-hb, sh], [-hb * .96, .25], [-hb * .62, keel * .55], [0, keel], [hb * .62, keel * .55], [hb * .96, .25], [hb, sh]].forEach(([x, y]) => pos.push(x, y, z)); });
      for (let k = 0; k < st; k++) for (let j = 0; j < 6; j++) { const a = k * 7 + j, b2 = a + 1, c2 = a + 7, d2 = c2 + 1; idx.push(a, c2, b2, b2, c2, d2); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); parts.push([g, I]);
      const dk = []; const dpos = [], didx = []; prof.forEach(([z, hb, sh]) => { dpos.push(-hb * .98, sh + .02, z, hb * .98, sh + .02, z); }); for (let k = 0; k < st; k++) { const a = k * 2; didx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.Float32BufferAttribute(dpos, 3)); dg.setIndex(didx); dg.computeVertexNormals(); parts.push([dg, I]); void dk;
      const cab = new THREE.BoxGeometry(2.1, .62, 4.4); cab.translate(0, 1.42, .2); parts.push([cab, I]);
      return mergeGeoms(parts); })();
    const mastG = (() => { const m = new THREE.CylinderGeometry(.09, .12, 18.5, 5); m.translate(0, 10.1, 1.2); const bm = new THREE.CylinderGeometry(.07, .07, 6, 4); bm.rotateX(Math.PI / 2); bm.translate(0, 2.2, -1.8); return mergeGeoms([[m, I], [bm, I]]); })();
    const sailMain = (() => { const g = new THREE.BufferGeometry(), pos = [], idx = []; const NY = 6; for (let j = 0; j <= NY; j++) { const t = j / NY, y = 2.3 + t * 16.6, ch = 5.6 * (1 - t * .92), cam = .55 * (1 - t); pos.push(0, y, 0, cam * .6, y, -ch * .5, 0, y, -ch); }
        for (let j = 0; j < NY; j++) { const a = j * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); } g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
    const sailJib = (() => { const g = new THREE.BufferGeometry(), pos = [], idx = []; const NY = 5; for (let j = 0; j <= NY; j++) { const t = j / NY, y = 1.4 + t * 15.2, zf = 6.6 - t * 5.2, ch = 5.0 * (1 - t * .95), cam = .5 * (1 - t); pos.push(0, y, zf, cam * .6, y, zf - ch * .5, 0, y, zf - ch); }
        for (let j = 0; j < NY; j++) { const a = j * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); } g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
    const raftG = (() => { const parts = []; for (let k = 0; k < 7; k++) { const lg = new THREE.CylinderGeometry(.24, .26, 4.2, 6); lg.rotateX(Math.PI / 2); lg.translate((k - 3) * .5, .15, 0); parts.push([lg, I]); } const m = new THREE.CylinderGeometry(.07, .09, 4.6, 5); m.translate(0, 2.5, .4); parts.push([m, I]); return mergeGeoms(parts); })();
    const raftSail = (() => { const g = new THREE.PlaneGeometry(2.6, 2.8, 2, 2); g.translate(0, 2.9, .4); const P = g.attributes.position; for (let i = 0; i < P.count; i++) P.setX(i, P.getX(i) * .25 + Math.sin((P.getY(i) - 1.5) * 1.2) * .25); g.computeVertexNormals(); return g; })();
    const flamG = (() => { const parts = [], body = new THREE.SphereGeometry(1, 12, 8); body.scale(.75, .42, 1.1); body.translate(0, .32, 0); parts.push([body, I]);
      const pts = [new THREE.Vector3(0, .5, .8), new THREE.Vector3(0, 1.4, 1.05), new THREE.Vector3(0, 2.1, .7), new THREE.Vector3(0, 2.25, 1.1)]; parts.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, .17, 6, false), I]);
      const hd = new THREE.SphereGeometry(.26, 8, 6); hd.translate(0, 2.3, 1.2); parts.push([hd, I]); return mergeGeoms(parts); })();
    const mkI = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); F.G.add(m); W.disposables.push(geo); return m; };
    const lam = (o) => { const m = new THREE.MeshLambertMaterial(Object.assign({ side: THREE.DoubleSide }, o)); W.disposables.push(m); return m; };
    F.hull = mkI(hullG, lam({ color: "#ffffff" }), N); F.mast = mkI(mastG, lam({ color: "#9aa3ab" }), N); F.main = mkI(sailMain, lam({ color: "#ffffff" }), N); F.jib = mkI(sailJib, lam({ color: "#ffffff" }), N);
    F.raft = mkI(raftG, lam({ color: "#7a5a3a" }), N); F.rsail = mkI(raftSail, lam({ color: "#e9dfc8" }), N); F.flam = mkI(flamG, lam({ color: "#ff6fae" }), N);
    const cc = new THREE.Color(); for (let i = 0; i < N; i++) { F.hull.setColorAt(i, cc.set(KEK_HULL[i % KEK_HULL.length])); const sv = R(); F.main.setColorAt(i, cc.set(sv < .7 ? "#f5f4ee" : sv < .85 ? "#e8dfc6" : "#5b6168")); F.jib.setColorAt(i, cc.set(sv < .75 ? "#f7f7f2" : "#d9d3c2")); }
    [F.hull, F.main, F.jib].forEach((m) => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    /* éjjeli helyzetfények: egy pontfelhő (zöld, vörös, fehér hajónként) */
    const lp = new Float32Array(N * 9), lc = new Float32Array(N * 9); const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(lp, 3)); lg.setAttribute("color", new THREE.BufferAttribute(lc, 3)); W.disposables.push(lg);
    const lm = new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: glowTex() }); W.disposables.push(lm);
    F.lights = new THREE.Points(lg, lm); F.lights.frustumCulled = false; F.lights.renderOrder = 7; F.G.add(F.lights);
  }
  /* a mezőny felállítása a szakasz elején: a játékoshoz mért összetett időkülönbség szerint előrébb / hátrébb, a kapu szélességében szétszórva */
  function kekFleetPlace(C, si) {
    const F = KEK.fl, R = vrRng((KEK.seed || 7) * 7 + si * 131 + 5), g = C.kek.grad; if (!F) return;
    const o = C.kek.o, wet = (q) => balInLake(q.x + o[0], q.z + o[1]);
    for (let i = 0; i < F.n; i++) {
      const gap = si === 0 ? 0 : F.T[i] - KEK.T, lat0 = (R() * 2 - 1) * (si === 0 ? 260 : 330), bk = 40 + R() * 260, at = (lat, k) => si === 0 ? { x: -C.u[0] * bk * k + C.c[0] * lat, z: -C.u[1] * bk * k + C.c[1] * lat } : kekGapPos(gap * k, C, lat);
      /* csak vízre: a szűk helyeken (Tihanyi-szoros, keszthelyi öböl) a mezőny keskenyebben, szükség esetén közelebb áll fel */
      let p = null; for (const k of [1, .75, .5]) { for (const f of [1, .7, .45, .2, 0]) { const q = at(lat0 * f, k); if (wet(q)) { p = q; break; } } if (p) break; } if (!p) p = { x: 0, z: 0 };
      if (si > 0) { const dd = -(p.x * C.u[0] + p.z * C.u[1]); F.off[i] = gap - dd / 5.2; }
      { const brg = Math.atan2(C.u[0], -C.u[1]), rel = wrapA(brg - C.wf); F.b[i] = (Math.abs(rel) < 46 * D2R ? C.wf + F.tk[i] * 46 * D2R : brg + (R() - .5) * .6) + TAU; F.b[i] %= TAU; }
      F.x[i] = p.x; F.z[i] = p.z; F.v[i] = si === 0 ? 0 : 4; F.st[i] = -1; F.nx[i] = 0; F.lt[i] = -99;
      /* oldalválasztás: aki „jól tippel”, a szelesebb oldal felé tart; mások középre vagy a másik oldalra */
      const smart = R() < .45 + (F.sk[i] - .86) * 2, side = g.mode === 0 ? 0 : g.mode; F.lane[i] = clamp(smart ? (side === 0 ? (R() - .5) * .3 : side * (.35 + R() * .35)) : (R() * 2 - 1) * .7, -.8, .8); }
    kekFleetDraw();
  }
  const _km = new THREE.Matrix4(), _kq = new THREE.Quaternion(), _kp = new THREE.Vector3(), _ks = new THREE.Vector3(), _ke = new THREE.Euler(0, 0, 0, "YXZ"), _km2 = new THREE.Matrix4(), _kc = new THREE.Vector3();
  function kekFleetTick(dt) {
    const S = VRR, F = KEK.fl, C = S.C; if (!F || !C.kek) return; const UPA = 44 * D2R, gm = S.marks[S.marks.length - 1], G = gm.gate, ms = S.marks, o = C.kek.o;
    for (let i = 0; i < F.n; i++) {
      if (S.st !== "race" && S.st !== "pre") break; if (S.st === "pre") { F.v[i] *= Math.max(0, 1 - dt); continue; }
      const nx = F.nx[i], tgtM = ms[Math.min(nx, ms.length - 1)]; let tx, tz;
      if (F.st[i] >= 0) { tx = F.x[i] + Math.sin(F.b[i]) * 50; tz = F.z[i] - Math.cos(F.b[i]) * 50; }
      else if (tgtM.gate) { const L = F.lane[i] * G.w * .5; tx = tgtM.x + (G.b.x - G.a.x) / G.w * L + G.dir[0] * 40; tz = tgtM.z + (G.b.z - G.a.z) / G.w * L + G.dir[1] * 40; }
      else { const O = [tgtM.x - (nx ? ms[nx - 1].x : 0), tgtM.z - (nx ? ms[nx - 1].z : 0)], ol = Math.hypot(O[0], O[1]) || 1; tx = tgtM.x + O[0] / ol * 35 + O[1] / ol * 25; tz = tgtM.z + O[1] / ol * 35 - O[0] / ol * 25; }
      const brg = Math.atan2(tx - F.x[i], -(tz - F.z[i])), rel = wrapA(brg - S.wf); let want = brg;
      if (Math.abs(rel) < UPA) { want = S.wf + F.tk[i] * UPA; if (W.t - F.lt[i] > 18 && ((F.tk[i] > 0 && rel < -.12) || (F.tk[i] < 0 && rel > .12))) { F.tk[i] = -F.tk[i]; F.lt[i] = W.t; } }
      else if (Math.abs(rel) > 2.7) { want = S.wf + Math.PI - F.tk[i] * .42; const rd = wrapA(brg - S.wf - Math.PI); if (W.t - F.lt[i] > 22 && ((F.tk[i] > 0 && rd > .3) || (F.tk[i] < 0 && rd < -.3))) { F.tk[i] = -F.tk[i]; F.lt[i] = W.t; } }
      const db = clamp(wrapA(want - F.b[i]), -.32 * dt, .32 * dt); F.b[i] = (F.b[i] + db + TAU) % TAU;
      const twa = Math.abs(wrapA(S.wf - F.b[i])) * R2D, lw = rwWindAt(F.x[i], F.z[i]).k, cls = F.cls[i];
      let vt; if (cls === 2) { const up = .25 + .75 * clamp((twa - 28) / 42, 0, 1); vt = 7.2 * KN * VR_SPD * .5 * up * Math.sqrt(S.tws * lw / (12 * KN)); }
      else vt = polar(twa, twa > 105) * KN * VR_SPD * (cls === 1 ? .55 : .9 + (F.sc[i] - .8) * .22) * F.sk[i] * Math.sqrt(S.tws * lw / (12 * KN));
      if (F.st[i] >= 0) vt *= .35; F.v[i] += (vt - F.v[i]) * Math.min(1, dt / 3.5);
      const ox = F.x[i], oz = F.z[i]; F.x[i] += Math.sin(F.b[i]) * F.v[i] * dt; F.z[i] -= Math.cos(F.b[i]) * F.v[i] * dt;
      /* a part elől: aki a szárazra futna, visszafordul a másik csapásra, és a sávja a közép felé húzódik */
      if (!balInLake(F.x[i] + o[0], F.z[i] + o[1])) { F.x[i] = ox; F.z[i] = oz; F.v[i] *= .6; if (W.t - F.lt[i] > 4) { F.tk[i] = -F.tk[i]; F.lt[i] = W.t; F.lane[i] *= .6; F.b[i] = (F.b[i] + F.tk[i] * .9 + TAU) % TAU; } }
      /* jel / kapu teljesítése */
      if (F.st[i] < 0) { if (tgtM.gate) { const s0 = (ox - tgtM.x) * G.dir[0] + (oz - tgtM.z) * G.dir[1], s1 = (F.x[i] - tgtM.x) * G.dir[0] + (F.z[i] - tgtM.z) * G.dir[1], al = ((F.x[i] - G.a.x) * (G.b.x - G.a.x) + (F.z[i] - G.a.z) * (G.b.z - G.a.z)) / (G.w * G.w);
          if (s0 < 0 && s1 >= 0 && al > -.05 && al < 1.05) { F.st[i] = S.t; F.nx[i] = ms.length; } }
        else if (Math.hypot(F.x[i] - tgtM.x, F.z[i] - tgtM.z) < 45 && nx < ms.length - 1) { const dO = (F.x[i] - tgtM.x) * (tgtM.x - (nx ? ms[nx - 1].x : 0)) + (F.z[i] - tgtM.z) * (tgtM.z - (nx ? ms[nx - 1].z : 0)); if (dO > 0) F.nx[i] = nx + 1; } }
    }
    /* egymásba ne csússzanak: rács szerinti szétválasztás (másodpercenként ~15-ször – elég, és kíméli a processzort) */
    F.sepT = (F.sepT || 0) + dt; if (F.sepT >= .066) { F.sepT = 0; const cell = 24, H = new Map(); for (let i = 0; i < F.n; i++) { const k = (Math.floor(F.x[i] / cell) * 73856093) ^ (Math.floor(F.z[i] / cell) * 19349663); let a = H.get(k); if (!a) H.set(k, a = []); a.push(i); }
      H.forEach((a) => { for (let p = 0; p < a.length; p++) for (let q = p + 1; q < a.length; q++) { const i = a[p], j = a[q], dx = F.x[i] - F.x[j], dz = F.z[i] - F.z[j], d = Math.hypot(dx, dz), D = 13; if (d < D && d > .01) { const k2 = (D - d) / 2 / d; F.x[i] += dx * k2; F.z[i] += dz * k2; F.x[j] -= dx * k2; F.z[j] -= dz * k2; } } });
      /* a játékostól és a három versenytárstól is tartsanak távolságot */
      [S].concat(S.riv).forEach((o) => { for (let i = 0; i < F.n; i++) { const dx = F.x[i] - o.x, dz = F.z[i] - o.z; if (Math.abs(dx) > 16 || Math.abs(dz) > 16) continue; const d = Math.hypot(dx, dz); if (d < 15 && d > .01) { F.x[i] += dx / d * (15 - d); F.z[i] += dz / d * (15 - d); } } }); }
    kekFleetDraw();
  }
  function kekFleetDraw() {
    const S = VRR, F = KEK.fl; if (!F) return; let nY = 0, nR = 0, nF = 0; const night = typeof NGT !== "undefined" && NGT.on, t = W.t;
    const LP = F.lights.geometry.attributes.position.array, LC = F.lights.geometry.attributes.color.array; let nl = 0;
    T.camObj().getWorldPosition(_kc); S.env.worldToLocal(_kc);
    /* 2026-11-16: a hajók a test hossza menti átlagos felszínt követik, simítva (nehéz test – kis vízben alig mozdul; ld. 05z rwHullMotion) */
    const dtF = clamp(W.t - (F.lt0 == null ? W.t : F.lt0), 0, .2); F.lt0 = W.t; if (!F.hy) { F.hy = new Float32Array(F.n); F.hp = new Float32Array(F.n); F.hyOk = 0; }
    for (let i = 0; i < F.n; i++) {
      const x = F.x[i], z = F.z[i], b = F.b[i], twa = wrapA(S.wf - b), heel = clamp(Math.abs(Math.sin(twa)) * .32 * (F.v[i] / 6), 0, .3) * Math.sign(twa), sc = F.sc[i], cls = F.cls[i];
      { const Lh = (cls === 2 ? 1 : cls === 1 ? 2 : 5.5) * sc, fx = Math.sin(b) * Lh, fz = -Math.cos(b) * Lh, h0 = rwHeight(x, z), h1 = rwHeight(x + fx, z + fz), h2 = rwHeight(x - fx, z - fz), ty = (h0 * 2 + h1 + h2) / 4, tp = Math.atan((h1 - h2) / (2 * Lh)) * (cls ? .9 : .8);
        const k = F.hyOk ? Math.min(1, dtF / (cls === 2 ? .25 : cls === 1 ? .55 : 1.1)) : 1; F.hy[i] += (ty - F.hy[i]) * k; F.hp[i] += (tp - F.hp[i]) * k * .8; }
      const y = F.hy[i]; _ke.set(-F.hp[i], Math.PI - b, heel); _kq.setFromEuler(_ke); _kp.set(x, y, z); _ks.set(sc, sc, sc); _km.compose(_kp, _kq, _ks);
      if (cls === 0) { F.hull.setMatrixAt(nY, _km); F.mast.setMatrixAt(nY, _km);
        const ta = Math.abs(twa) * R2D, sa = clamp((ta - 22) / 158 * 1.45, .1, 1.45) * -Math.sign(twa);
        _ke.set(0, sa, 0); _kq.setFromEuler(_ke); _km2.makeRotationFromQuaternion(_kq); _km2.setPosition(0, 0, 1.2); F.main.setMatrixAt(nY, _km2.premultiply(_km));
        _ke.set(0, sa * .75, 0); _kq.setFromEuler(_ke); _km2.makeRotationFromQuaternion(_kq); _km2.setPosition(0, 0, 0); F.jib.setMatrixAt(nY, _km2.premultiply(_km)); nY++; }
      else if (cls === 1) { F.raft.setMatrixAt(nR, _km); _ke.set(0, clamp(twa, -1.2, 1.2) * -.8, 0); _kq.setFromEuler(_ke); _km2.makeRotationFromQuaternion(_kq); F.rsail.setMatrixAt(nR, _km2.premultiply(_km)); nR++; }
      else { F.flam.setMatrixAt(nF, _km); nF++; }
      /* éjjel: oldalfények (zöld jobbra, vörös balra), farfény – a néző felől látható szektorban */
      if (night && nl < F.n * 3) { const dx = _kc.x - x, dz = _kc.z - z, ang = wrapA(Math.atan2(dx, -dz) - b) * R2D, fx = Math.sin(b), fz = -Math.cos(b), rx = -fz, rz = fx, L2 = 6.5 * sc, Y = y + 1.8 * sc;
        const put = (px, py, pz, r, g2, b2) => { LP[nl * 3] = px; LP[nl * 3 + 1] = py; LP[nl * 3 + 2] = pz; LC[nl * 3] = r; LC[nl * 3 + 1] = g2; LC[nl * 3 + 2] = b2; nl++; };
        if (ang >= -2 && ang <= 114) put(x + fx * L2 + rx * .9 * sc, Y, z + fz * L2 + rz * .9 * sc, .1, 1, .3);
        if (ang <= 2 && ang >= -114) put(x + fx * L2 - rx * .9 * sc, Y, z + fz * L2 - rz * .9 * sc, 1, .15, .1);
        if (Math.abs(ang) >= 110) put(x - fx * 6.8 * sc, Y, z - fz * 6.8 * sc, 1, .95, .85); }
    }
    F.hyOk = 1; [[F.hull, nY], [F.mast, nY], [F.main, nY], [F.jib, nY], [F.raft, nR], [F.rsail, nR], [F.flam, nF]].forEach(([m, n]) => { m.count = n; m.instanceMatrix.needsUpdate = true; });
    F.lights.geometry.setDrawRange(0, nl); F.lights.geometry.attributes.position.needsUpdate = true; F.lights.geometry.attributes.color.needsUpdate = true; F.lights.visible = night;
    /* a mezőny anyagai éjjel a holdfényhez sötétülnek */
    const k = night ? .32 : 1; [F.hull, F.main, F.jib, F.mast, F.raft, F.rsail, F.flam].forEach((m) => { if (m.material.userData.k !== k) { m.material.userData.k = k; if (!m.material.userData.c0) m.material.userData.c0 = m.material.color.clone(); m.material.color.copy(m.material.userData.c0).multiplyScalar(k); } });
  }
  /* ---------------------------------------------------------------- NAPSZAK: aranyló délután, naplemente (saját ég), alkonyat és éjszaka (az éjszakai rendszer)
     2026-11-15 (tulajdonos: „legyen valósághű … élethű”): a nappali égfotón a nap 48° magasan áll – naplementét abból nem lehet hitelesen csinálni. Ezért a két késő
     délutáni szakasznak saját, számolt ege van: a nap a valódi helyén (júliusi Kékszalag: lemenő nap nyugat-északnyugaton, 282° / 13°, illetve 300° / 1°),
     körülötte a szóródó fény (Mie-udvar), a láthatár a nap felé narancs, a túloldalon rózsás-lila, fölötte mélyülő kék; a felhők alja a nap felőli oldalon
     izzik, a túloldalon sötét lilásszürke. A víz ugyanazt tükrözi: hosszú, aranyló napút a lemenő nap felé; a fények melegek és alacsonyról jönnek; a táj
     (a part, a házak, a fák) színe is a napszakhoz hangolódik. Alkonyatkor (6. szakasz) a nap már lement: az éjszakai ég nyugati derengése ugyanabban az irányban. */
  const KEK_SUN = { gold: { az: 282, el: 13, k: 0 }, sunset: { az: 300, el: 1.1, k: 1 } };
  function kekTod(tod) {
    const S = VRR; kekSkySet(tod === "gold" || tod === "sunset" ? tod : null);
    if (typeof NGT !== "undefined") { NGT.tw = tod === "dusk" ? .75 : 0; try { if (NGT.sky && NGT.sky.material.uniforms.uTw) { NGT.sky.material.uniforms.uTw.value = NGT.tw; NGT.sky.material.uniforms.uTwA.value = KEK_SUN.sunset.az * D2R; } } catch (e) {} if (tod === "dusk" && S.lights) { S.lights.hemi.intensity = .22; S.lights.sun.intensity = .7; } }
  }
  function kekSkyBuild() {
    const S = VRR; if (KEK.sky && KEK.sky.parent === S.far) return KEK.sky;
    const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSunD: { value: new THREE.Vector3(0, .1, -1).normalize() }, uK: { value: 1 }, uN: { value: stNoiseTex() } },
      vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }",
      fragmentShader: `uniform vec3 uSunD; uniform float uK; uniform sampler2D uN; varying vec3 vD;
        void main(){ vec3 d = normalize(vD); float el = d.y, he = clamp(el, 0., 1.), cs = dot(d, uSunD), cp = max(cs, 0.);
          float sAz = .5 + .5 * dot(normalize(d.xz + vec2(1e-5)), normalize(uSunD.xz + vec2(1e-5)));
          vec3 zen = mix(vec3(.11, .27, .60), vec3(.06, .12, .31), uK), mid = mix(vec3(.38, .55, .80), vec3(.30, .31, .52), uK);
          vec3 horA = mix(vec3(.78, .77, .76), vec3(.58, .43, .52), uK), horS = mix(vec3(1., .83, .58), vec3(1., .47, .17), uK), hor = mix(horA, horS, pow(sAz, 2.6));
          vec3 col = mix(mid, zen, smoothstep(.12, .85, he)); col = mix(col, hor, pow(1. - he, mix(6.5, 4.2, uK)));
          col += mix(vec3(1., .78, .45), vec3(1., .40, .10), uK) * (pow(cp, 5.) * .26 + pow(cp, 40.) * .42 + pow(cp, 500.) * .9);   /* a nap körüli szórt fény */
          if (el > .004) { vec2 q = d.xz / (el + .07);   /* felhőréteg: alacsony, foszló gomoly- és párnafelhők; a nap felőli oldalon az aljuk izzik */
            float c = texture2D(uN, q * .035 + vec2(.13, .41)).r * .6 + texture2D(uN, q * .11 + vec2(.7, .2)).g * .4;
            float cov = smoothstep(.55, .8, c) * smoothstep(.0, .05, el) * (1. - smoothstep(.3, .62, el)) * .92;
            vec3 lit = mix(vec3(1., .88, .70), vec3(1., .50, .26), uK), dk = mix(vec3(.56, .58, .64), vec3(.28, .22, .33), uK);
            vec3 cc = mix(dk, lit, clamp(pow(sAz, 3.) * .85 + (c - .62) * 1.6, 0., 1.)) + mix(vec3(1., .72, .42), vec3(1., .42, .14), uK) * pow(cp, 14.) * .9;
            col = mix(col, cc, cov); }
          float disc = smoothstep(.99972, .99986, cs); col = mix(col, mix(vec3(1., .96, .84), vec3(1., .64, .30), uK) * mix(2.8, 2.1, uK), disc);
          if (el < 0.) col = mix(hor * .92, hor * .6, clamp(-el * 6., 0., 1.));
          gl_FragColor = vec4(col, 1.);
          #include <colorspace_fragment>
        }` });
    W.disposables.push(mat); const m = mesh(new THREE.SphereGeometry(8600, 64, 32), mat, S.far); m.renderOrder = -19; m.frustumCulled = false; m.visible = false; m.userData.kekSky = 1; KEK.sky = m; return m;
  }
  /* a víz, a fények és a táj hangolása a két napszakhoz (k: 0 = aranyló délután, 1 = naplemente) */
  function kekSkyVals(k) { const L = (a, b) => a + (b - a) * k; return {
    skyH: [L(.86, .95), L(.74, .55), L(.58, .38)], skyZ: [L(.22, .17), L(.36, .17), L(.62, .36)], haze: [L(.80, .74), L(.72, .50), L(.62, .44)], deep: [L(.03, .025), L(.12, .06), L(.15, .09)], sh: [L(.09, .07), L(.26, .14), L(.26, .16)],
    sunC: [L(1.5, 1.9), L(1.08, .74), L(.62, .30)], light: L(.9, .66), spec: L(1.2, 1.6),
    sun: [L(1.25, 1.08), L(.9, .56), L(.62, .3)], sunI: L(.95, .85), hemi: [L(.95, .62), L(.86, .5), L(.78, .62)], hemiG: [L(.42, .26), L(.34, .16), L(.26, .18)], hemiI: L(.8, .38), amb: L(.85, .42),
    tint: [L(1.02, .76), L(.9, .54), L(.76, .47)] }; }
  function kekSkySet(mode) {
    kekSkyReset(); if (!mode) return; const S = VRR; if (!S.water || !S.lights) return;
    const sk = kekSkyBuild(), P = KEK_SUN[mode], U = S.water.userData.mat.uniforms, L = S.lights, V = kekSkyVals(P.k);
    const sd = new THREE.Vector3(Math.sin(P.az * D2R) * Math.cos(P.el * D2R), Math.sin(P.el * D2R), -Math.cos(P.az * D2R) * Math.cos(P.el * D2R));
    KEK.w0 = { skyOn: U.uSkyOn.value, skyH: U.uSkyH.value.clone(), skyZ: U.uSkyZ.value.clone(), deep: U.uDeep.value.clone(), sh: U.uShallow.value.clone(), haze: U.uHaze.value.clone(), sun: U.uSun.value, sunC: U.uSunC.value.clone(), light: U.uLight.value, spec: U.uSpec.value };
    KEK.l0 = { h: L.hemi.intensity, hc: L.hemi.color.clone(), hg: L.hemi.groundColor.clone(), s: L.sun.intensity, sc: L.sun.color.clone(), sp: L.sun.position.clone(), a: L.amb ? L.amb.intensity : 0 };
    sk.material.uniforms.uSunD.value.copy(sd); sk.material.uniforms.uK.value = P.k; sk.visible = true; KEK.sunD = sd; KEK.skyV = V; KEK.skyOn = mode;
    kekSkyEnforce();
    L.sun.color.setRGB(...V.sun); L.sun.intensity = KEK.l0.s * V.sunI; L.sun.position.copy(sd).multiplyScalar(100); L.hemi.color.setRGB(...V.hemi); L.hemi.groundColor.setRGB(...V.hemiG); L.hemi.intensity = KEK.l0.h * V.hemiI; if (L.amb) L.amb.intensity = KEK.l0.a * V.amb;
    kekTint(V.tint); kekDefLights(P.k);
  }
  /* az A-Frame alapfényei (szórt + irányított, fehér) a napszakhoz: alacsony, meleg fény, kevesebb szórt világosság */
  function kekDefLights(k) { try { document.querySelectorAll("[data-aframe-default-light]").forEach((el) => { const L = el.getObject3D("light"); if (!L) return; if (L.userData.dayI == null) L.userData.dayI = L.intensity; if (!L.userData.dayC) L.userData.dayC = L.color.clone();
      if (k == null) { L.intensity = L.userData.dayI; L.color.copy(L.userData.dayC); return; }
      const amb = L.isAmbientLight, f = amb ? .85 - .42 * k : .8 - .48 * k; L.intensity = L.userData.dayI * f; if (amb) L.color.setRGB(1 - .14 * k, .93 - .26 * k, .86 - .14 * k); else L.color.setRGB(1, .9 - .32 * k, .76 - .44 * k); }); } catch (e) {} }
  /* képkockánként is (az égfotó és a tükrözött kép később töltődhet be, és visszaállítaná a nappali értékeket) */
  function kekSkyEnforce() { const S = VRR, V = KEK.skyV; if (!KEK.skyOn || !V || !S.water) return; const U = S.water.userData.mat.uniforms;
    U.uSkyOn.value = 0; U.uSkyH.value.setRGB(...V.skyH); U.uSkyZ.value.setRGB(...V.skyZ); U.uHaze.value.setRGB(...V.haze); U.uDeep.value.setRGB(...V.deep); U.uShallow.value.setRGB(...V.sh);
    U.uSun.value = KEK.sunD; U.uSunC.value.setRGB(...V.sunC); U.uLight.value = V.light; U.uSpec.value = V.spec;
    if (S.foto && S.foto.mesh && S.foto.mesh.visible) S.foto.mesh.visible = false; if (KEK.sky && !KEK.sky.visible) KEK.sky.visible = true; }
  function kekSkyReset() {
    const S = VRR; if (!KEK.skyOn) return; KEK.skyOn = null; if (KEK.sky) KEK.sky.visible = false;
    const U = S.water && S.water.userData.mat.uniforms, W0 = KEK.w0; if (U && W0) { U.uSkyOn.value = W0.skyOn; U.uSkyH.value.copy(W0.skyH); U.uSkyZ.value.copy(W0.skyZ); U.uDeep.value.copy(W0.deep); U.uShallow.value.copy(W0.sh); U.uHaze.value.copy(W0.haze); U.uSun.value = W0.sun; U.uSunC.value.copy(W0.sunC); U.uLight.value = W0.light; U.uSpec.value = W0.spec; }
    const L = S.lights, L0 = KEK.l0; if (L && L0) { L.hemi.intensity = L0.h; L.hemi.color.copy(L0.hc); L.hemi.groundColor.copy(L0.hg); L.sun.intensity = L0.s; L.sun.color.copy(L0.sc); L.sun.position.copy(L0.sp); if (L.amb) L.amb.intensity = L0.a; }
    if (S.foto && S.foto.mesh) S.foto.mesh.visible = true; kekTint(null); kekDefLights(null);
  }
  /* a táj (alapanyagú és matcap anyagok) színe a napszakhoz – ugyanazzal az alapszínnel (_dc), amit az éjszakai színezés is használ */
  function kekTint(k) { const S = VRR, keep = [S.ck && S.ck.instT, S.ck && S.ck.chartT, S.mastT].filter(Boolean);
    W.root.traverse((o) => { if (!o.material || o.isSprite || o.userData.night || o.userData.kekSky) return; for (let p = o.parent; p; p = p.parent) if (p.userData && p.userData.night) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (!m || m.isShaderMaterial || m.isSpriteMaterial || m.blending === THREE.AdditiveBlending || !m.color) return; if (m.map && keep.indexOf(m.map) >= 0) return;
        if (!(m.isMeshBasicMaterial || m.isMeshMatcapMaterial || m.isPointsMaterial)) return;
        if (k) { if (!m.userData._dc) m.userData._dc = m.color.clone(); m.color.setRGB(m.userData._dc.r * k[0], m.userData._dc.g * k[1], m.userData._dc.b * k[2]); m.userData._kt = 1; }
        else if (m.userData._kt) { m.color.copy(m.userData._dc); m.userData._kt = 0; } }); }); }

  /* a kapitányi tájékoztató a Kékszalaghoz (a varázsló 4. lépése és a futam közbeni „Tájékoztató”): az egész kör, a szakaszok, a szabályok */
  const KEK_TODN = { day: "nappal", gold: "aranyló délután", sunset: "naplemente", dusk: "alkonyat", night: "éjszaka" };
  function drawKekBrief(B, g, x, y, fun, cur) {
    wzPanel(g, x, y, 900, 590, false); kekMapDraw(g, x + 10, y + 10, 880, 350, B.t);
    g.textAlign = "left"; KEK_ST.forEach((s, i) => { const col = i < 5 ? 0 : 1, row = i < 5 ? i : i - 5, xx = x + 22 + col * 444, yy = y + 392 + row * 39, on = i === cur;
      if (on) { uiRR(g, xx - 10, yy - 26, 436, 36, 10); g.fillStyle = "rgba(255,209,102,.16)"; g.fill(); }
      g.fillStyle = on ? "#ffd166" : "#7dffb0"; g.font = `900 19px ${UIF}`; g.fillText(`${i + 1}.`, xx, yy); g.fillStyle = "#fff"; g.font = `${on ? 800 : 700} 18px ${UIF}`;
      const tx = `${s.n}${s.mk && !/forduló/.test(s.n) ? " (forduló)" : ""}${/éjszak|alkony|naplem/.test(s.n) ? "" : " · " + KEK_TODN[s.tod]}`; uiFit(g, tx, 384, 18, on ? 800 : 700); g.fillText(tx, xx + 34, yy); });
    const rx = x + 920, rw = 1402 - 920; wzPanel(g, rx, y, rw, 590, true);
    const rows = [["map", "Útvonal", "a Balaton körül, 9 szakasz: Füred → Tihanyi-szoros → Badacsony → Keszthely → déli part → Siófok → Kenese → Füred"],
      ["wind", "Szél", "szakaszonként változik; hol az északi, hol a déli part, hol a közép a szelesebb – ott sötétebb, fodrosabb a víz"],
      ["moon", "Napszak", "délutáni rajt → aranyló délután → naplemente → alkonyat → éjszakai befutó Füreden"],
      ["clock", "Időkeret", "3 óra az egész körre · a hibátlan, tökéletes futam kb. 1 óra"],
      ["boat", "Kapuk, fordulók", "minden szakasz végén széles KAPU – bárhol átmehetsz rajta; a keszthelyi és a kenesei fordulóbóját BAL kéz felől kerüld"],
      ["people", "Mezőny", fun ? "200 hajó: rönktutajok, flamingók és nagyhajók – bármelyik hajóval indulhatsz" : "200 nagyhajó + a három ismert versenytárs; az összetett idő dönt"]];
    rows.forEach(([ic, a2, b2], i) => { const yy = y + 44 + i * 93; uiIcon(g, ic, rx + 40, yy - 8, 30, "#ffd166"); g.fillStyle = "#ffd166"; g.font = `800 18px ${UIF}`; g.fillText(a2.toUpperCase(), rx + 74, yy - 14);
      g.fillStyle = "#fff"; g.font = `600 16px ${UIF}`; uiWrap(g, b2, rx + 74, yy + 10, rw - 96, 19.5, 3); });
  }
  /* a menü előnézete: a tó körvonala az útvonallal és a szakaszokkal */
  function kekMapDraw(g, x, y, w, h, t) {
    const Bd = balData(), P = Bd.P; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; P.forEach((p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
    uiRR(g, x, y, w, h, 18); g.fillStyle = "#0a2a40"; g.fill(); const pad = 16, k = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (z1 - z0)), ox = x + (w - (x1 - x0) * k) / 2, oy = y + (h - (z1 - z0) * k) / 2, Q = (px, pz) => [ox + (px - x0) * k, oy + (pz - z0) * k];
    g.beginPath(); P.forEach((p, i) => { const q = Q(p[0], p[1]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.fillStyle = "#1c6f8c"; g.fill(); g.lineWidth = 1.5; g.strokeStyle = "#9fd6ea"; g.stroke();
    const pts = []; KEK_ST.forEach((s) => { pts.push(balXY(s.a[0], s.a[1])); if (s.mk) pts.push(balXY(s.mk[0], s.mk[1])); pts.push(balXY(s.b[0], s.b[1])); });
    g.setLineDash([8, 6]); g.lineWidth = 3; g.strokeStyle = "rgba(255,209,102,.9)"; g.beginPath(); pts.forEach((p, i) => { const q = Q(p[0], p[1]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke(); g.setLineDash([]);
    KEK_ST.forEach((s, i) => { const q = Q(...balXY(s.a[0], s.a[1])); g.fillStyle = i === 0 ? "#3ddc84" : "#ffd166"; g.beginPath(); g.arc(q[0], q[1], 9, 0, TAU); g.fill(); g.fillStyle = "#04121f"; g.font = `900 12px ${UIF}`; g.textAlign = "center"; g.fillText(String(i + 1), q[0], q[1] + 4); g.textAlign = "left"; });
    /* a kis hajó körbejár */
    const segs = []; for (let i = 0; i + 1 < pts.length; i++) segs.push([pts[i], pts[i + 1], Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])]); const tot = segs.reduce((a, s2) => a + s2[2], 0); let u = ((t * .04) % 1) * tot, si = 0; while (si < segs.length - 1 && u > segs[si][2]) { u -= segs[si][2]; si++; }
    const s0 = segs[si], f = u / s0[2], q = Q(s0[0][0] + (s0[1][0] - s0[0][0]) * f, s0[0][1] + (s0[1][1] - s0[0][1]) * f); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(q[0], q[1], 6, 0, TAU); g.fill(); g.strokeStyle = "#c8102e"; g.lineWidth = 3; g.stroke();
  }
