  /* =================================================================== 2/ZD. BALATON SAILING VR – BEMÉRÉS (KALIBRÁLÁS) MINDEN RAJT ÉS MINDEN ÚJ HELYSZÍN ELŐTT
     2026-11-16 02:22 (tulajdonos): „A kalibráció mindenhol rossz, soha nem ott állok, ahol kellene. A verseny kezdésekor a rendszer kalibrálja be a játékost,
     majd ellenőrizze, hogy biztos jó helyen áll vagy ül, és úgy indítsa csak el a játékot; illetve minden egyes új helyszínnél végezze ezt el.”
     A HIBA OKAI:
       (1) a futam a kormányos helyét a VR-tér origójába tette, a fejed valódi helyét nem nézte – a Quest a tér origóját a munkamenet indulásakor /
           újraközpontosításkor rögzíti, ezért ha azóta odébb álltál vagy ültél, a kormánytól fél-egy méterre kerültél;
       (2) a ◎ KALIBRÁL gomb eredménye a világ akkori helyzetéhez kötve MEGMARADT – a következő futam / helyszín új elforgatása után már rossz irányba
           és rossz helyre tolta a hajót (ezért volt „mindenhol rossz”);
       (3) az álló / ülő mód kézi kapcsoló volt: rossz beállítással guggolva vagy a fedélzet fölött lebegve láttad a hajót.
     MOST minden futam elején – minden pálya és helyszín, a Kékszalag minden szakasza, az oktató futam, az újrakezdés és a VR-be lépés – a játék ÁLL, és:
       1) megvárja, hogy nyugodtan állj vagy ülj (a fejed 1,2 mp-ig nem mozdul; a tábla addig a nézésed elé igazodik),
       2) BEMÉR: a kormányos helyét pontosan a fejed alá, a hajó orrát a nézési irányodba teszi; a szemmagasságodból eldönti, hogy állsz vagy ülsz,
          és ehhez igazítja a fedélzet magasságát (ülve a fedélzet lejjebb kerül, így ülve is a kerék fölött látsz – mint eddig, de a te magasságodhoz mérve),
       3) ELLENŐRIZ: 1,5 mp-ig figyeli, hogy ott maradtál-e (20 cm-en, 20°-on, 14 cm magasságon belül) – ha elmozdultál, felálltál vagy leültél, újra bemér,
       4) csak ezután indul a játék (a rajt visszaszámlálása). Online futamban az idő nem állhat meg (közös rajt) – ott a bemérés a visszaszámlálás alatt fut.
     A ◎ KALIBRÁL gomb és a tenyérmenü 🪑 (ülő / álló) gombja ugyanezt indítja futam közben is (a játék addig áll). A 🪑 gombbal megadott helyzetet
     (ülök / állok) a bemérés a munkamenet végéig elfogadja – ha a szemmagasságod alapján rosszul ismerném fel. 2D-ben (képernyőn) nincs bemérés. */
  /* ---- MÓDOSÍTÁS 2026-11-16 04:2x (tulajdonos, hangban): „a bemérés csak egyszer legyen, a játék megkezdésekor – ez rendkívül hasznos –, de ne akarjon megállás nélkül, állandóan
     bemérni; ha külön kéri az ember, akkor bármikor elvégezhesse. A Kékszalag egyetlen futam, nincsenek szakaszai, ott nincs megállás. A kormánynál csak egy SZÜNET gomb legyen, és a szünet
     utáni újraindításkor ott legyen a választás: előbb bemérés, vagy rögtön folytatás.” MOST:
       • a bemérés a munkamenetben (VR-be lépéstől a VR-ből kilépésig) EGYSZER fut: az első futam elején / VR-be lépéskor; az eredmény (CALS) átvivődik a következő futamokra, pályákra,
         helyszínekre és a Kékszalag szakaszaira – megállás, tábla, várakozás nélkül (vrCalBegin → vrCalRestore);
       • újra csak kérésre mér: SZÜNET tábla → „Bemérés, majd folytatás”, tenyérmenü ◎, versenymenü ◎, vagy a 🪑 (ülő / álló) kapcsoló;
       • nem kezdi elölről minden mozdulatnál: az ellenőrzésben egyszer mér újra, másodszor már a mostani helyedet fogadja el; ha 10 mp alatt sem lettél nyugodt, akkor is bemér. */
  const CAL_STILL = 1.2, CAL_VERIFY = 1.5, CAL_OK = 1.1;   /* nyugalom → bemérés, ellenőrzés hossza, a „Rendben” kiírás ideje (mp) */
  const CAL_MAXW = 10, CAL_RETRY = 1;                      /* legfeljebb ennyit vár a nyugalomra (mp); az ellenőrzés legfeljebb ennyiszer indít újra bemérést */
  const CALS = { done: false, sv: null };                   /* a munkamenet bemérése: egyszer készül, a következő futamok átveszik */
  const CAL_V = .12, CAL_W = .5;                          /* „nyugodt” a fej: 12 cm/mp alatt mozdul, 0,5 rad/mp (≈29°/mp) alatt fordul */
  const CAL_TOL = .2, CAL_TOLA = .35, CAL_TOLY = .14;      /* az ellenőrzés tűrése: 20 cm oldalt, 20° irány, 14 cm magasság */
  const CAL_SIT = 1.36;                                   /* ennél alacsonyabb szemmagasság: ülsz */
  const CAL_EYE_ST = 1.65;                                /* nagy hajón ülve a szem ilyen magasra kerül a fedélzet fölött (mint állva) */
  /* a fej helyzete a világban (VR-ben a szemüvegből; teszteléshez W._calSim adja) */
  function calHead() {
    const Q = W._calSim; if (Q) return { x: Q.x, y: Q.y, z: Q.z, yaw: Q.yaw, ok: Q.ok !== false };
    const p = T.headPos ? T.headPos() : null; if (!p) return null; let yaw = 0; try { yaw = T.camYaw(); } catch (e) {}
    return { x: p.x, y: p.y, z: p.z, yaw, ok: p.y > .3 };
  }
  function calActive() { return !!(T.inVR || W._calSim); }
  const calM = (v) => v.toFixed(2).replace(".", ",");
  /* a fedélzet süllyesztése ülve (nagy hajó) – a bemérésből, vagy a régi alapérték (45 cm), amíg nincs bemérés */
  function vrSeatDrop() { const S = VRR; if (!T.inVR) return 0; return S.calDrop != null ? S.calDrop : (S.seated ? .45 : 0); }
  /* a kis hajó ülése a valódi padló fölött (VR) – a bemérésből a szemmagasságodhoz mérve, különben a régi álló / ülő érték */
  function vrSeatLift() { const S = VRR; return S.calLift != null ? S.calLift : (S.seated ? 0 : .5); }
  function calPosture() { const S = VRR, e = S.calEye; if (e == null) { S.calDrop = null; S.calLift = null; return; }
    S.calDrop = S.seated ? clamp(CAL_EYE_ST - e, .3, .7) : 0;   /* állva: a fedélzet = a valódi padló; ülve: a szemed a fedélzet fölött ~1,65 m-re (a kerék fölött) */
    S.calLift = clamp(e - 1.15, -.15, .75); }                    /* kis hajó: a szemed az ülés fölött ~1,2 m-rel – mint eddig (állva 0,5 m, ülve 0 m), de a te magasságodhoz mérve */
  /* a világ gyökere: a kormányos helye „lehorgonyozva” (a dőlés / bólintás a kormány körül forgatja a hajót) + a kis hajó ülése + a bemérés */
  function vrRootPlace(dt) { const S = VRR;
    if (S.helmL) { const bd = S.boat.userData.body; bd.updateMatrix(); S.boat.updateMatrix(); const cur = S.helmL.clone().applyMatrix4(bd.matrix).applyMatrix4(S.boat.matrix);
      W.root.position.set(S.rootX - (cur.x - S.helmRest.x), S.baseY - vrSeatDrop() - (cur.y - S.helmRest.y), S.rootZ - (cur.z - S.helmRest.z)); }
    vrClassTick(dt); if (S.cal) vrCalApply(); else if (W.root && !W.root.quaternion.equals(_qI)) W.root.quaternion.identity(); }

  /* ---------------------------------------------------------------- indítás / befejezés */
  function vrCalStart(why) { const S = VRR; if (!S.C || S.replay) return;
    if (!calActive()) { S.calR = null; return; }
    S.cal = null; S.calDrop = null; S.calLift = null;   /* a korábbi bemérés eldobva (egy másik futam / helyszín világához tartozott) */
    S.calR = { ph: "still", why: why || "start", hold: !S.net, t: 0, st: 0, vt: 0, okT: 0, fT: 0, n: 0, cap: null, last: null, v: null, w: null, dev: null, info: "", infoT: 0 };
    W.panelDirty = 1; }   /* (a tábla az első képkockán nyílik – addigra a nézési irány is beáll) */
  /* a futam elején: a munkamenetben egyszer bemér; ha már volt, a régi bemérést veszi át (nincs megállás, nincs tábla) */
  function vrCalBegin() { const S = VRR; if (!S.C || !calActive()) return; S.calAuto = true;
    if (CALS.done && CALS.sv) { vrCalRestore(); return; } vrCalStart("start"); }
  function vrCalRestore() { const S = VRR, v = CALS.sv; if (!v) return;
    S.cal = { yaw: v.yaw, x: v.x, z: v.z }; S.calEye = v.eye; if (v.seated != null) S.seated = v.seated; calPosture();
    try { vrRootPlace(0); } catch (e) {} W.panelDirty = 1; }
  /* képkockánként (vrTick): VR-ből kilépve a bemérés érvényét veszti (a Quest tere újraindul); VR-be lépve – ha még nem volt bemérés – elindítja */
  function calSession() { const S = VRR; if (!S.C) return;
    if (!T.inVR && !W._calSim) { if (CALS.done) { CALS.done = false; CALS.sv = null; } S.calAuto = false; return; }
    if (!S.calAuto && !S.calR && !S.replay) { S.calAuto = true; if (CALS.done && CALS.sv) vrCalRestore(); else vrCalStart("start"); } }
  function vrCalEnd(ok) { const S = VRR, R = S.calR; S.calR = null; vrCalBoard(false);
    if (S.calResume) { S.calResume = false; try { vrPause(false); } catch (e) {} }   /* a szünet utáni „bemérés, majd folytatás” innen megy tovább */
    if (ok && R && S.cal) { CALS.done = true; CALS.sv = { yaw: S.cal.yaw, x: S.cal.x, z: S.cal.z, eye: S.calEye, seated: S.seated }; }
    if (ok && R) { try { localStorage.setItem("zephyr-vr-kalibral", JSON.stringify({ t: Date.now(), ul: S.seated ? 1 : 0, szem: S.calEye })); } catch (e) {}
      S.msg = `◎ Bemérve – ${S.seated ? "ülő" : "álló"} helyzet: a kormányos helye a fejed alatt, a hajó orra előtted.${R.why === "start" ? (S.lvl ? " Indul a rajt!" : " Indulhatsz!") : " Folytatjuk!"}`; S.msgT = 5; }
    W.panelDirty = 1; }
  /* bemérés: a mostani fejhelyzet lesz a kormányos helye */
  function calCapture(h) { const S = VRR, R = S.calR;
    S.seated = S.seatLock != null ? S.seatLock : h.y < CAL_SIT; try { localStorage.setItem("zephyr-vr-ules", S.seated ? "1" : "0"); } catch (e) {}
    S.calEye = h.y; calPosture(); S.cal = { yaw: h.yaw, x: h.x, z: h.z };
    R.cap = { x: h.x, y: h.y, z: h.z, yaw: h.yaw }; R.ph = "verify"; R.vt = 0; R.info = ""; R.dev = { dx: 0, da: 0, dy: 0 };
    try { vrRootPlace(0); } catch (e) {} if (S.calB && T.inVR) { try { S.calB.place(); } catch (e) {} }   /* a tábla pontosan előre, a hajó orra fölé */
    try { uiSnd("press"); } catch (e) {} try { hapt(.3, 30); } catch (e) {} W.panelDirty = 1; }

  /* ---------------------------------------------------------------- képkockánként (a vrTick elején) – true: a játék áll */
  function vrCalTick(dt) { const S = VRR, R = S.calR; if (!R) return false;
    if (!calActive()) { vrCalEnd(false); return false; }
    if (!S.calB) vrCalBoard(true);
    R.t += dt; if (R.infoT > 0) { R.infoT -= dt; if (R.infoT <= 0) R.info = ""; }
    const h = calHead();
    if (!h || !h.ok) { R.st = 0; R.last = null; R.info = "Várom a szemüveg helyzetét…"; R.infoT = .5; }
    else {
      const L = R.last, k = Math.min(1, dt * 6);
      if (L && dt > 1e-4) { const vv = Math.hypot(h.x - L.x, h.y - L.y, h.z - L.z) / dt, ww = Math.abs(wrapA(h.yaw - L.yaw)) / dt;
        R.v = R.v == null ? vv : R.v + (vv - R.v) * k; R.w = R.w == null ? ww : R.w + (ww - R.w) * k; }   /* simítva: a fej természetes remegése ne nullázza a számlálót */
      R.last = { x: h.x, y: h.y, z: h.z, yaw: h.yaw };
      const still = R.v != null && R.v < CAL_V && R.w < CAL_W;
      if (R.ph === "still") {
        R.st = still ? R.st + dt : Math.max(0, R.st - dt * 2);
        /* a tábla a nézésed elé igazodik, amíg be nem mértünk – így előre nézve olvasod, és az lesz a hajó orra */
        if (S.calB && T.inVR) { const by = S.calB.m.rotation.y; R.fT = Math.abs(wrapA(h.yaw - by)) > .45 ? R.fT + dt : 0; if (R.fT > .4) { R.fT = 0; try { S.calB.place(); } catch (e) {} } }
        if (R.st >= CAL_STILL || R.t >= CAL_MAXW) calCapture(h);   /* 10 mp után akkor is bemér, ha nem lettél teljesen nyugodt – ne várakoztassa a játékost végtelenül */
      } else if (R.ph === "verify") {
        const c = R.cap, dx = Math.hypot(h.x - c.x, h.z - c.z), da = Math.abs(wrapA(h.yaw - c.yaw)), dy = h.y - c.y; R.dev = { dx, da, dy, ox: h.x - c.x, oz: h.z - c.z };
        if ((dx > CAL_TOL || da > CAL_TOLA || Math.abs(dy) > CAL_TOLY) && R.n >= CAL_RETRY) {
          /* nem mérünk újra és újra (tulajdonos): másodszor már a mostani helyedet fogadjuk el bemérésnek */
          calCapture(h); R.ph = "ok"; R.okT = 0; try { uiSnd("success"); } catch (e) {}
        } else if (dx > CAL_TOL || da > CAL_TOLA || Math.abs(dy) > CAL_TOLY) {
          R.info =Math.abs(dy) > CAL_TOLY ? (dy < 0 ? "Leültél? – újra bemérlek…" : "Felálltál? – újra bemérlek…") : dx > CAL_TOL ? "Elléptél a helyedről – újra bemérlek…" : "Elfordultál – nézz előre, újra bemérlek…";
          R.infoT = 3; R.ph = "still"; R.st = 0; R.vt = 0; R.n++; R.cap = null; R.dev = null; S.cal = null; S.calDrop = null; S.calLift = null; try { uiSnd("warn"); } catch (e) {}
        } else { R.vt += dt; if (R.vt >= CAL_VERIFY) { R.ph = "ok"; R.okT = 0; try { uiSnd("success"); } catch (e) {} try { hapt(.5, 60); } catch (e) {} } }
      } else if (R.ph === "ok") { R.okT += dt; if (R.okT >= CAL_OK) { vrCalEnd(true); return false; } }
    }
    if (R.hold) { vrBtnTick(dt); uiTickAll(dt); vrRootPlace(0); return true; }
    return false;
  }

  /* ---------------------------------------------------------------- a bemérés táblája (VR-ben a nézésed előtt) */
  function vrCalBoard(on) { const S = VRR;
    if (!on) { if (S.calB) { try { S.calB.destroy(); } catch (e) {} S.calB = null; } return; }
    if (S.calB) return;
    S.calB = uiBoard({ w: 1400, h: 840, mw: 1.3, dist: 1.35, y: -.06, fps: 8, bar: 120, draw: (B, g) => calDraw(B, g) }); S.calB.show(true); }
  function calDraw(B, g) {
    const S = VRR, R = S.calR || { ph: "ok", why: "start", st: 0, vt: 0 }, W0 = B.o.w, small = S.pb && S.cls && S.cls.half < 4;
    const start = R.why === "start", where = S.C ? (S.C.kek ? S.C.name : S.lvl ? `${S.lvl}. futam` : "oktató futam") + (S.venue && S.venue.n ? " · " + S.venue.n : "") : "";
    uiFrame(B, g, start ? "◎ BEMÉRÉS A JÁTÉK ELEJÉN" : R.why === "seat" ? "◎ ÜLŐ / ÁLLÓ HELYZET BEMÉRÉSE" : R.why === "resume" ? "◎ BEMÉRÉS A FOLYTATÁS ELŐTT" : "◎ BEMÉRÉS (KALIBRÁLÁS)",
      start ? `${where} – a játék akkor indul, ha jó helyen vagy` : R.hold ? "a játék addig áll, amíg be nem mértelek" : "online futam: a visszaszámlálás közben mérlek be");
    const pos = R.cap ? (S.seated ? "ÜLSZ" : "ÁLLSZ") : "", lock = S.seatLock != null ? " (a 🪑 gombbal megadva)" : "";
    const steps = [
      { t: "Állj vagy ülj oda, ahol játszani fogsz, és nézz előre", s: "arra, amerre a hajó orrát szeretnéd látni – maradj nyugodtan egy pillanatig", p: R.ph === "still" ? clamp(R.st / CAL_STILL, 0, 1) : 1, on: R.ph === "still" },
      { t: R.cap ? `Bemérve: ${pos}${lock} – szemmagasság ${calM(R.cap.y)} m` : "Bemérés", s: R.cap ? (S.seated ? (small ? "a kis hajó ülése a magasságodhoz igazítva" : `a fedélzet ${Math.round((S.calDrop || 0) * 100)} cm-rel lejjebb került – így ülve is a kerék fölött látsz`) : (small ? "a kis hajó ülése a magasságodhoz igazítva" : "a fedélzet a valódi padlód magasságában, a kormányos helye a lábad alatt")) : "a kormányos helye a fejed alá, a hajó orra a nézési irányodba kerül", p: R.cap ? 1 : 0, on: false },
      { t: "Ellenőrzés: ott maradtál?", s: R.ph === "verify" ? "maradj így – figyelem, hogy a helyeden maradsz-e…" : R.ph === "ok" ? "igen – a helyeden maradtál" : "20 cm-en és 20°-on belül kell maradnod", p: R.ph === "verify" ? clamp(R.vt / CAL_VERIFY, 0, 1) : R.ph === "ok" ? 1 : 0, on: R.ph === "verify" }
    ];
    const x0 = 40, cw = W0 - 80 - 330, ch = 150; let y = 162;
    steps.forEach((st, i) => { const done = st.p >= 1 && !st.on;
      uiCard(g, x0, y, cw, ch, { bg: st.on ? "rgba(14,58,96,.92)" : "rgba(5,24,48,.86)" });
      /* sorszám-kör: kész = zöld pipa, folyamatban = arany */
      const cx = x0 + 62, cy = y + ch / 2; g.beginPath(); g.arc(cx, cy, 38, 0, TAU); g.fillStyle = done ? "#2aa866" : st.on ? "#d99a26" : "rgba(255,255,255,.14)"; g.fill();
      if (done) uiIcon(g, "check", cx, cy, 40, "#ffffff"); else { g.fillStyle = "#fff"; g.font = `900 40px ${UIF}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(i + 1), cx, cy + 2); g.textAlign = "left"; g.textBaseline = "alphabetic"; }
      const tx = x0 + 124, tw = cw - 150; g.fillStyle = "#fff1c4"; uiFit(g, st.t, tw, 38, 800); g.fillText(st.t, tx, y + 54);
      g.fillStyle = "#d6e8ff"; uiFit(g, st.s, tw, 27, 600); g.fillText(st.s, tx, y + 92);
      /* folyamatjelző */
      uiRR(g, tx, y + 110, tw, 16, 8); g.fillStyle = "rgba(255,255,255,.12)"; g.fill(); if (st.p > 0) { uiRR(g, tx, y + 110, Math.max(16, tw * st.p), 16, 8); g.fillStyle = done ? "#2aa866" : "#f2c14e"; g.fill(); }
      y += ch + 16; });
    /* jobbra: felülnézeti „radar” – a kör a megengedett hely (20 cm), a pont a fejed; felfelé = a hajó orra */
    { const rx = W0 - 40 - 300, ry = 162, rw = 300, rh = ch * 3 + 32; uiCard(g, rx, ry, rw, rh);
      const cx = rx + rw / 2, cy = ry + 232, rr = 100; g.fillStyle = "#f2c14e"; g.font = `800 26px ${UIF}`; g.textAlign = "center"; g.fillText("a helyed felülről", cx, ry + 46);
      g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fillStyle = R.ph === "ok" ? "rgba(42,168,102,.25)" : "rgba(255,255,255,.07)"; g.fill(); g.lineWidth = 4; g.strokeStyle = R.cap ? "#2aa866" : "rgba(255,255,255,.35)"; g.stroke();
      /* a hajó orra felé mutató nyíl */
      g.fillStyle = "rgba(242,193,78,.85)"; g.beginPath(); g.moveTo(cx, cy - rr - 26); g.lineTo(cx - 14, cy - rr - 4); g.lineTo(cx + 14, cy - rr - 4); g.closePath(); g.fill();
      g.fillStyle = "#d6e8ff"; g.font = `700 20px ${UIF}`; g.fillText("a hajó orra", cx, cy - rr - 34);
      /* a fejed: az eltérés a bemért helyhez képest, a hajó irányában (1 kör = 20 cm) */
      let px = cx, py = cy; const D = R.dev; if (R.cap && D && D.ox != null) { const c = Math.cos(R.cap.yaw), s = Math.sin(R.cap.yaw), lx = D.ox * c - D.oz * s, lz = D.ox * s + D.oz * c, k = rr / CAL_TOL;
        px = cx + clamp(lx * k, -rr * 1.25, rr * 1.25); py = cy + clamp(lz * k, -rr * 1.25, rr * 1.25); }
      const okNow = R.cap && (!D || (D.dx <= CAL_TOL && D.da <= CAL_TOLA)); g.beginPath(); g.arc(px, py, 22, 0, TAU); g.fillStyle = !R.cap ? "rgba(255,255,255,.5)" : okNow ? "#7fe0a0" : "#ff7a6b"; g.fill();
      /* a nézési irányod a ponton */
      if (R.cap && D && D.da != null) { const a = R.last ? wrapA(R.last.yaw - R.cap.yaw) : 0; g.strokeStyle = "#fff"; g.lineWidth = 4; g.beginPath(); g.moveTo(px, py); g.lineTo(px - Math.sin(a) * 42, py - Math.cos(a) * 42); g.stroke(); }
      g.fillStyle = "#fff"; g.font = `700 22px ${UIF}`; g.fillText(R.cap ? (okNow ? "a kormányos helyén vagy" : "lépj vissza a körbe") : "még nincs bemérve", cx, cy + rr + 46);
      if (R.cap && D && D.dx != null) { g.fillStyle = "#d6e8ff"; g.font = `600 20px ${UIF}`; g.fillText(`eltérés ${Math.round(D.dx * 100)} cm · ${Math.round(D.da * R2D)}°`, cx, cy + rr + 76); }
      g.textAlign = "left"; }
    /* alul: az eredmény / figyelmeztetés / tipp */
    const by = 162 + 3 * (ch + 16) + 8;
    if (R.ph === "ok") { uiRR(g, 40, by, W0 - 80, 96, 22); g.fillStyle = "rgba(42,168,102,.92)"; g.fill(); g.fillStyle = "#fff"; g.textAlign = "center";
      const t = `✓ RENDBEN – jó helyen ${S.seated ? "ülsz" : "állsz"}.${start ? (S.lvl ? " Indul a rajt!" : " Indulhatsz!") : " Folytatjuk!"}`; uiFit(g, t, W0 - 140, 46, 900); g.fillText(t, W0 / 2, by + 63); g.textAlign = "left"; }
    else if (R.info) { uiRR(g, 40, by, W0 - 80, 96, 22); g.fillStyle = "rgba(201,138,0,.9)"; g.fill(); g.fillStyle = "#fff"; g.textAlign = "center"; uiFit(g, R.info, W0 - 140, 40, 800); g.fillText(R.info, W0 / 2, by + 60); g.textAlign = "left"; }
    else { g.fillStyle = "#d6e8ff"; g.textAlign = "center"; const t = "Ha ülve játszol, de állónak mértelek (vagy fordítva): tenyérmenü → 🪑 – onnan megadhatod."; uiFit(g, t, W0 - 120, 26, 600); g.fillText(t, W0 / 2, by + 56); g.textAlign = "left"; }
  }
  W._calApi = { start: (w) => vrCalStart(w), end: (ok) => vrCalEnd(ok), get R() { return VRR.calR; }, get S() { return CALS; } };   /* (tesztekhez) */
