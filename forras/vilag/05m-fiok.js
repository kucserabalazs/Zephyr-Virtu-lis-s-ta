  /* =================================================================== 2/M. BALATON SAILING VR – JÁTÉKOSFIÓK (e-mailes regisztráció), 2026. nov. 14. 22:48
     A tulajdonos kérése: „Legyen e-mailes regisztráció a játékhoz, hogy a játék mindig tudja elmenteni az adott felhasználó adatait és eredményeit.”
     • Regisztráció: e-mail + név + jelszó; a szerver 6 jegyű megerősítő kódot küld e-mailben (a játékban beírva a fiók „ellenőrzött” lesz).
     • Belépés bármelyik eszközön (Quest, telefon, gép): a fiókba mentett név, beállítások, sorozat-állás, serlegek és futameredmények visszatöltődnek.
     • Mentés: minden futam után és minden beállítás-változáskor (3 mp-es késleltetéssel, összevonva) – a vegyes flottás futamok nem kerülnek bele.
     • A szerver a saját tárhely PHP-ja (api/index.php, jatekos_* végpontok). Ahol nincs szerver (pl. a GitHub-os tesztoldal), a fiók csak ezen az eszközön
       él (helyi mentés), és ezt a fiók-oldal ki is írja. */
  const ACCT = { tok: null, fiok: null, srv: null, msg: "", err: "", busy: false, syncT: 0 };
  const ACCT_KEYS = ["zephyr-jatekos", "zephyr-sorozat", "zephyr-trofeak", "zephyr-hajo", "zephyr-kormany", "zephyr-napszak", "zephyr-vr-nehezseg", "zephyr-vr-ules", "zephyr-bsvr", "zephyr-futamok"];
  function acctInit() { if (ACCT.init) return; ACCT.init = true; try { ACCT.tok = localStorage.getItem("zephyr-bsvr-token"); ACCT.fiok = JSON.parse(localStorage.getItem("zephyr-bsvr-fiok") || "null"); } catch (e) {} }
  async function acctApi(r, body) {
    const res = await fetch("api/index.php?r=" + r, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}), cache: "no-store" });
    let j = null; try { j = await res.json(); } catch (e) { ACCT.srv = false; throw new Error("nincs szerver"); } ACCT.srv = true;
    if (!res.ok) throw new Error(j && j.message ? j.message : "Hiba (" + res.status + ")"); return j; }
  function acctSet(tok, fiok) { ACCT.tok = tok; ACCT.fiok = fiok; try { if (tok) localStorage.setItem("zephyr-bsvr-token", tok); else localStorage.removeItem("zephyr-bsvr-token"); localStorage.setItem("zephyr-bsvr-fiok", JSON.stringify(fiok)); } catch (e) {}
    if (fiok && fiok.nev) { try { const p = vrProfile(); if (!p.name) { p.name = fiok.nev; localStorage.setItem("zephyr-jatekos", JSON.stringify(p)); } } catch (e) {} } acctRedraw(); }
  function acctRedraw() { try { if (HB.B) HB.B.dirty = 1; } catch (e) {} }
  function acctLocalOnly(email, nev) { acctSet(null, { email, nev, helyi: true, ellenorzott: false, regisztralt: Math.round(Date.now() / 1000) }); ACCT.msg = "Nincs elérhető szerver – a fiók ezen az eszközön jött létre, az eredményeidet itt menti. A saját tárhelyen futó oldalon a szerverre is ment."; }
  async function acctRegister(email, nev, pw) { acctInit(); ACCT.err = ""; ACCT.msg = ""; ACCT.busy = true; acctRedraw();
    try { const j = await acctApi("jatekos_regisztracio", { email, nev, jelszo: pw }); acctSet(j.token, j.fiok); ACCT.msg = `Kész! A megerősítő kódot elküldtük ide: ${email}. Írd be lent.`; await acctSyncNow(); }
    catch (e) { if (ACCT.srv === false) acctLocalOnly(email, nev); else ACCT.err = e.message; } ACCT.busy = false; acctRedraw(); }
  async function acctLogin(email, pw) { acctInit(); ACCT.err = ""; ACCT.msg = ""; ACCT.busy = true; acctRedraw();
    try { const j = await acctApi("jatekos_belepes", { email, jelszo: pw }); acctSet(j.token, j.fiok); acctPull(j.fiok.adat); ACCT.msg = "Beléptél – a mentett adataid betöltve."; }
    catch (e) { if (ACCT.srv === false) { const f = ACCT.fiok; if (f && f.email === email) ACCT.msg = "Nincs szerver – a helyi fiókkal játszol."; else ACCT.err = "Nincs elérhető szerver; ezen az eszközön nincs ilyen fiók."; } else ACCT.err = e.message; }
    ACCT.busy = false; acctRedraw(); }
  async function acctVerify(code) { ACCT.err = ""; try { const j = await acctApi("jatekos_ellenorzes", { token: ACCT.tok, kod: code }); acctSet(ACCT.tok, j.fiok); ACCT.msg = "✓ Az e-mail címed megerősítve."; } catch (e) { ACCT.err = e.message; } acctRedraw(); }
  async function acctLogout() { try { if (ACCT.tok) await acctApi("jatekos_kilepes", { token: ACCT.tok }); } catch (e) {} acctSet(null, null); try { localStorage.removeItem("zephyr-bsvr-fiok"); } catch (e) {} ACCT.msg = "Kiléptél. Az eredményeid a fiókodban megmaradtak."; acctRedraw(); }
  /* a szerverről letöltött adatok a helyi tárba (a szerveren lévő az irányadó) */
  function acctPull(adat) { if (!adat || typeof adat !== "object") return; const L = adat.local || {}; Object.keys(L).forEach((k) => { if (ACCT_KEYS.indexOf(k) >= 0 && L[k] != null) { try { localStorage.setItem(k, L[k]); } catch (e) {} } });
    try { VRR.series = vrSeriesLoad(); } catch (e) {} try { VRR.prof = vrProfile(); } catch (e) {} }
  function acctPack() { const L = {}; ACCT_KEYS.forEach((k) => { try { const v = localStorage.getItem(k); if (v != null) L[k] = v; } catch (e) {} }); return { v: 1, t: Date.now(), local: L }; }
  /* mentés: összevonva, 3 mp-cel az utolsó változás után */
  function acctSync() { acctInit(); if (!ACCT.tok) return; clearTimeout(ACCT.syncT); ACCT.syncT = setTimeout(acctSyncNow, 3000); }
  async function acctSyncNow() { if (!ACCT.tok) return; try { await acctApi("jatekos_mentes", { token: ACCT.tok, adat: acctPack(), nev: (vrProfile().name || (ACCT.fiok && ACCT.fiok.nev) || "") }); ACCT.last = Date.now(); } catch (e) { if (/belépés/i.test(e.message)) { acctSet(null, ACCT.fiok); ACCT.err = e.message; } } }
  /* futameredmény naplózása (a fiókba is bekerül): az utolsó 60 futam */
  function acctLogRace(row) { try { const a = JSON.parse(localStorage.getItem("zephyr-futamok") || "[]"); a.push(row); localStorage.setItem("zephyr-futamok", JSON.stringify(a.slice(-60))); } catch (e) {} acctSync(); }
  function acctStatus() { acctInit(); const f = ACCT.fiok; if (!f) return { on: false, t: "Nincs fiók – regisztrálj e-maillel, hogy minden eredményed megmaradjon" };
    return { on: true, t: `${f.nev || ""} · ${f.email}${f.helyi ? " · csak ezen az eszközön" : f.ellenorzott ? " · ✓ megerősítve" : " · megerősítésre vár"}` }; }
