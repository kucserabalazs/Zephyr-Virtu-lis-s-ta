/* Zephyr Apartmanház – online foglalási felület (vendég oldal)
   Használat: ZephyrBooking.open({ apt: "korvett" })
   API: window.ZEPHYR_API (pl. "https://balatoni-udules.hu/wp-json/zephyr/v1"); ha nem érhető el, bemutató módban fut. */
(function () {
  "use strict";
  if (window.ZephyrBooking) return;
  const HU_M = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
  const HU_WD = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
  const money = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Ft";
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const pd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const diff = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
  const huDate = (s, wd) => { const d = pd(s); return d.getFullYear() + ". " + HU_M[d.getMonth()] + " " + d.getDate() + "." + (wd ? " (" + ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"][d.getDay()] + ")" : ""); };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function apiBase() {
    if (window.ZEPHYR_API) return String(window.ZEPHYR_API).replace(/\/$/, "");
    if (/balatoni-udules\.hu$/i.test(location.hostname)) return location.origin + "/wp-json/zephyr/v1";
    return null;
  }
  async function api(path, opt) {
    const base = apiBase(); if (!base) throw Object.assign(new Error("nincs API"), { offline: true });
    opt = opt || {};
    let r;
    try { r = await fetch(base + path, { method: opt.method || "GET", headers: { "Content-Type": "application/json" }, body: opt.body ? JSON.stringify(opt.body) : undefined }); }
    catch (e) { throw Object.assign(new Error("A foglalási rendszer most nem érhető el."), { offline: true }); }
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error((j && j.message) || "Hiba történt (" + r.status + ").");
    return j;
  }
  /* ---------- bemutató adatok (ha nincs szerver) ---------- */
  function demoConfig() {
    const t = new Date(); const today = ymd(t);
    return { demo: true, today, tax: 600, deposit_pct: 30, min_nights: 2, max_nights: 30, lead_days: 0, horizon_days: 400, checkin: "14:00", checkout: "10:00", phone: "+36 20 536 3120", email: "info@balatoni-udules.hu", address: "8621 Zamárdi, Gáspár András utca 58.", rules_url: "", privacy_url: "",
      apartments: [{ id: "korvett", name: "Korvett", no: 1, cap: 4, price: 30000, color: "#e2483d" }, { id: "dingi", name: "Dingi", no: 2, cap: 2, price: 22000, color: "#3fb37f" }, { id: "fregatt", name: "Fregatt", no: 3, cap: 4, price: 30000, color: "#3d8fe2" }, { id: "kaloz", name: "Kalóz", no: 4, cap: 2, price: 22000, color: "#9b6be2" }, { id: "schooner", name: "Schooner", no: 5, cap: 4, price: 32000, color: "#2bb3c0" }] };
  }
  function demoDays(cfg, apt) {
    const a = cfg.apartments.find((x) => x.id === apt), out = []; let seed = apt.length * 7919;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let busyLeft = 0;
    for (let i = 0; i < 400; i++) {
      const d = addD(cfg.today, i), dt = pd(d), m = dt.getMonth(), wk = dt.getDay() === 5 || dt.getDay() === 6;
      const season = m === 6 || m === 7 ? 1.35 : m === 5 || m === 8 ? 1.1 : 1;
      if (busyLeft <= 0 && rnd() < .07) busyLeft = 2 + Math.floor(rnd() * 5);
      out.push({ d, p: Math.round(a.price * season * (wk ? 1.1 : 1) / 500) * 500, free: busyLeft-- <= 0 });
    }
    return out;
  }

  /* ---------- állapot ---------- */
  let el = null, cfg = null, st = null;
  function reset(apt) { st = { step: apt ? 2 : 1, apt: apt || null, days: null, map: {}, ci: null, co: null, adults: 2, children: 0, month: 0, form: {}, result: null, loading: false, err: "" }; }

  async function open(opts) {
    opts = opts || {};
    if (!el) build();
    reset(null);
    el.hidden = false; requestAnimationFrame(() => el.classList.add("on"));
    document.documentElement.classList.add("zfb-lock");
    if (!cfg) {
      paint(`<div class="zfb-loading"><i></i><span>Betöltés…</span></div>`);
      try { cfg = await api("/config"); } catch (e) { cfg = demoConfig(); }
    }
    const pre = opts.apt && cfg.apartments.find((a) => a.id === opts.apt);
    if (pre) await chooseApt(pre.id); else render();
  }
  function close() {
    if (!el) return; el.classList.remove("on"); document.documentElement.classList.remove("zfb-lock");
    setTimeout(() => { el.hidden = true; }, 300);
  }
  function build() {
    el = document.createElement("div"); el.className = "zfb"; el.hidden = true; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Szállásfoglalás – Zephyr Apartmanház");
    el.innerHTML = `<div class="zfb-bg"></div><div class="zfb-card"><header class="zfb-hd"><div class="zfb-logo"><b>ZEPHYR</b><span>Apartmanház · Zamárdi</span></div><ol class="zfb-steps"></ol><button type="button" class="zfb-x" aria-label="Bezárás">×</button></header><div class="zfb-body"></div></div>`;
    document.body.appendChild(el);
    el.querySelector(".zfb-bg").addEventListener("click", close);
    el.querySelector(".zfb-x").addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && el && !el.hidden) close(); });
    el.addEventListener("click", onClick); el.addEventListener("submit", (e) => { e.preventDefault(); submit(); }); el.addEventListener("input", onInput); el.addEventListener("change", onInput);
  }
  function paint(html) { el.querySelector(".zfb-body").innerHTML = html; }
  function steps() {
    const names = ["Apartman", "Időpont és vendégek", "Adatok", "Kész"];
    el.querySelector(".zfb-steps").innerHTML = names.map((n, i) => `<li class="${st.step === i + 1 ? "on" : st.step > i + 1 ? "done" : ""}"><i>${st.step > i + 1 ? "✓" : i + 1}</i><span>${n}</span></li>`).join("");
  }
  const apt = () => cfg.apartments.find((a) => a.id === st.apt);
  async function chooseApt(id) {
    st.apt = id; st.step = 2; st.ci = st.co = null; st.days = null; st.err = "";
    const a = apt(); st.adults = Math.min(st.adults, a.cap); st.children = Math.min(st.children, a.cap - st.adults);
    render();
    try { const r = cfg.demo ? { days: demoDays(cfg, id) } : await api("/availability?apt=" + id + "&from=" + cfg.today + "&to=" + addD(cfg.today, Math.min(420, (cfg.horizon_days || 400) + 1)));
      st.days = r.days; st.map = {}; r.days.forEach((d) => (st.map[d.d] = d)); }
    catch (e) { st.err = e.message; }
    render();
  }

  /* ---------- számítás ---------- */
  function rangeOk(ci, co) { for (let d = ci; d < co; d = addD(d, 1)) { const x = st.map[d]; if (!x || !x.free) return false; } return true; }
  function quote() {
    if (!st.ci || !st.co) return null;
    const n = diff(st.ci, st.co); let acc = 0; const per = [];
    for (let d = st.ci; d < st.co; d = addD(d, 1)) { const p = (st.map[d] || {}).p || apt().price; acc += p; per.push([d, p]); }
    const tax = st.adults * n * cfg.tax, total = acc + tax, dep = Math.round(total * cfg.deposit_pct / 100 / 100) * 100;
    return { n, per, acc, tax, total, dep, rest: total - dep };
  }
  function selError() {
    if (!st.ci) return "Válaszd ki az érkezés napját a naptárban.";
    if (!st.co) return "Most válaszd ki a távozás napját.";
    const n = diff(st.ci, st.co);
    if (n < cfg.min_nights) return `Legalább ${cfg.min_nights} éjszakára lehet foglalni.`;
    if (n > cfg.max_nights) return `Online legfeljebb ${cfg.max_nights} éjszakára foglalhatsz – hosszabb tartózkodáshoz hívj minket: ${cfg.phone}`;
    if (!rangeOk(st.ci, st.co)) return "A kiválasztott időszakban van foglalt nap.";
    return "";
  }

  /* ---------- megjelenítés ---------- */
  function render() {
    steps();
    if (st.step === 1) return paint(viewApts());
    if (st.step === 2) return paint(viewCal());
    if (st.step === 3) return paint(viewForm());
    if (st.step === 4) return paint(viewDone());
  }
  function demoNote() { return cfg.demo ? `<p class="zfb-demo">Bemutató mód – a foglalási rendszer a weboldalra feltöltve, élő naptárral működik. Itt az árak és a foglaltság csak minták.</p>` : ""; }
  function viewApts() {
    return demoNote() + `<h2 class="zfb-h">Melyik apartmant foglalnád?</h2><div class="zfb-apts">` + cfg.apartments.map((a) => `
      <button type="button" class="zfb-apt" data-apt="${a.id}" style="--ac:${a.color}">
        <span class="zfb-no">${a.no}</span><b>${esc(a.name)}</b><small>legfeljebb ${a.cap} fő</small><em>${money(a.price)}-tól / éj</em><i>Kiválasztom ›</i>
      </button>`).join("") + `</div><p class="zfb-fine">Érkezés ${esc(cfg.checkin)} órától, távozás ${esc(cfg.checkout)} óráig · Az árakhoz 18 év felett ${money(cfg.tax)} / fő / éj idegenforgalmi adó adódik.</p>`;
  }
  function monthGrid(y, m) {
    const first = new Date(y, m, 1), start = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    let html = `<div class="zfb-month"><h4>${y}. ${HU_M[m]}</h4><div class="zfb-wd">${HU_WD.map((w) => `<span>${w}</span>`).join("")}</div><div class="zfb-days">`;
    for (let i = 0; i < start; i++) html += `<span class="zfb-d empty"></span>`;
    for (let d = 1; d <= days; d++) {
      const ds = ymd(new Date(y, m, d)), x = st.map[ds], prev = st.map[addD(ds, -1)];
      const free = x && x.free, past = ds < cfg.today, coOk = st.ci && !st.co && ds > st.ci && rangeOk(st.ci, ds);
      let cls = "zfb-d", dis = false;
      if (past || !x) { cls += " off"; dis = !(coOk); }
      else if (!free) { cls += " busy"; dis = !coOk; if (prev && prev.free && !(st.ci && !st.co)) cls += " half"; }
      if (st.ci === ds) cls += " ci"; if (st.co === ds) cls += " co";
      if (st.ci && st.co && ds > st.ci && ds < st.co) cls += " in";
      if (st.ci && !st.co && ds > st.ci) cls += coOk ? " can" : " cant";
      if (ds === cfg.today) cls += " today";
      if (st.ci && !st.co && ds > st.ci && !coOk) dis = !free;
      const price = x && free ? `<small>${Math.round(x.p / 1000)}e</small>` : "";
      html += `<button type="button" class="${cls}" data-day="${ds}"${dis ? " disabled" : ""} aria-label="${huDate(ds)}${free ? ", szabad, " + money(x.p) : ", foglalt"}"><b>${d}</b>${price}</button>`;
    }
    return html + `</div></div>`;
  }
  function stepper(k, v, min, max, label, sub) {
    return `<div class="zfb-step"><div><b>${label}</b><small>${sub}</small></div><div class="zfb-st-c"><button type="button" data-st="${k}" data-v="-1" ${v <= min ? "disabled" : ""} aria-label="kevesebb">−</button><output>${v}</output><button type="button" data-st="${k}" data-v="1" ${v >= max ? "disabled" : ""} aria-label="több">+</button></div></div>`;
  }
  function breakdown(q, compact) {
    if (!q) return "";
    const nights = q.per.map(([d, p]) => `<div><span>${huDate(d)}</span><span>${money(p)}</span></div>`).join("");
    return `<div class="zfb-sum">
      <div class="zfb-row"><span>Szállásdíj · ${q.n} éjszaka</span><b>${money(q.acc)}</b></div>
      <details class="zfb-nights"${compact ? "" : ""}><summary>Napi bontás</summary>${nights}</details>
      <div class="zfb-row"><span>Idegenforgalmi adó<small>${st.adults} fő (18+) × ${q.n} éj × ${money(cfg.tax)}</small></span><b>${money(q.tax)}</b></div>
      ${st.children ? `<div class="zfb-row muted"><span>${st.children} gyermek (18 év alatt) – adómentes</span><b>0 Ft</b></div>` : ""}
      <div class="zfb-row total"><span>Végösszeg</span><b>${money(q.total)}</b></div>
      <div class="zfb-row dep"><span>Előleg (${cfg.deposit_pct}%) – átutalással, visszaigazolás után</span><b>${money(q.dep)}</b></div>
      <div class="zfb-row muted"><span>Fennmaradó összeg érkezéskor</span><b>${money(q.rest)}</b></div>
    </div>`;
  }
  function viewCal() {
    const a = apt();
    if (st.err) return `<p class="zfb-err">${esc(st.err)}</p><button type="button" class="zfb-btn ghost" data-go="1">‹ Vissza</button>`;
    if (!st.days) return `<div class="zfb-loading"><i></i><span>Szabad napok betöltése…</span></div>`;
    const base = pd(cfg.today), months = [];
    const per = window.innerWidth < 760 ? 1 : 2;
    for (let i = 0; i < per; i++) { const d = new Date(base.getFullYear(), base.getMonth() + st.month + i, 1); months.push(monthGrid(d.getFullYear(), d.getMonth())); }
    const maxMonth = 12, err = selError(), q = !err ? quote() : null;
    return demoNote() + `<div class="zfb-cal-wrap">
      <div class="zfb-cal">
        <div class="zfb-apt-chip" style="--ac:${a.color}"><span class="zfb-no">${a.no}</span><b>${esc(a.name)}</b><small>legfeljebb ${a.cap} fő</small><button type="button" data-go="1">másik apartman</button></div>
        <div class="zfb-mnav"><button type="button" data-m="-1" ${st.month <= 0 ? "disabled" : ""} aria-label="Előző hónap">‹</button><span>Válaszd ki az érkezés, majd a távozás napját</span><button type="button" data-m="1" ${st.month >= maxMonth ? "disabled" : ""} aria-label="Következő hónap">›</button></div>
        <div class="zfb-months">${months.join("")}</div>
        <div class="zfb-legend"><span><i class="lf"></i>szabad (ár / éj, ezer Ft)</span><span><i class="lb"></i>foglalt</span><span><i class="ls"></i>kiválasztva</span></div>
      </div>
      <aside class="zfb-side">
        <div class="zfb-dates"><div><small>Érkezés</small><b>${st.ci ? huDate(st.ci) : "–"}</b><em>${esc(cfg.checkin)}-tól</em></div><div><small>Távozás</small><b>${st.co ? huDate(st.co) : "–"}</b><em>${esc(cfg.checkout)}-ig</em></div></div>
        ${stepper("adults", st.adults, 1, a.cap - st.children, "Felnőtt", "18 év felett")}
        ${stepper("children", st.children, 0, a.cap - st.adults, "Gyermek", "18 év alatt")}
        ${err ? `<p class="zfb-tip">${esc(err)}</p>` : breakdown(q)}
        <button type="button" class="zfb-btn" data-next="3" ${err ? "disabled" : ""}>Tovább az adatokhoz ›</button>
        ${st.ci ? `<button type="button" class="zfb-link" data-clear="1">dátumok törlése</button>` : ""}
      </aside></div>`;
  }
  function inp(k, label, type, attrs, help) {
    const v = st.form[k] == null ? "" : st.form[k];
    return `<label class="zfb-f${attrs && attrs.indexOf("wide") >= 0 ? " wide" : ""}"><span>${label}</span><input name="${k}" type="${type || "text"}" value="${esc(v)}" ${attrs || ""}>${help ? `<small>${help}</small>` : ""}</label>`;
  }
  function viewForm() {
    const a = apt(), q = quote();
    const rules = cfg.rules_url ? `<a href="${esc(cfg.rules_url)}" target="_blank" rel="noopener">házirendet</a>` : "házirendet";
    const priv = cfg.privacy_url ? `<a href="${esc(cfg.privacy_url)}" target="_blank" rel="noopener">adatkezelési tájékoztatót</a>` : "adatkezelési tájékoztatót";
    return demoNote() + `<div class="zfb-cal-wrap"><form class="zfb-form" novalidate>
      <h2 class="zfb-h">A foglaló adatai</h2>
      <div class="zfb-grid">
        ${inp("name", "Teljes név *", "text", 'autocomplete="name" required class="wide"')}
        ${inp("phone", "Telefonszám *", "tel", 'autocomplete="tel" required placeholder="+36 …"')}
        ${inp("email", "E-mail cím *", "email", 'autocomplete="email" required')}
        ${inp("birth_place", "Születési hely *", "text", "required")}
        ${inp("birth_date", "Születési idő *", "date", 'required max="' + addD(cfg.today, -18 * 365) + '"')}
        ${inp("id_doc", "Személyi igazolvány vagy útlevél száma *", "text", 'required autocapitalize="characters" class="wide"', "A szálláshely-szolgáltatókra vonatkozó jogszabály (VIZA-nyilvántartás) miatt kérjük. Titkosítva tároljuk, csak a szállásadó láthatja.")}
        <label class="zfb-f wide"><span>Üzenet a szállásadónak (nem kötelező)</span><textarea name="note" rows="2" placeholder="pl. várható érkezési idő, babaágy, etetőszék igény">${esc(st.form.note || "")}</textarea></label>
        <input name="website" type="text" class="zfb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      </div>
      <label class="zfb-acc"><input type="checkbox" name="accept" ${st.form.accept ? "checked" : ""}> <span>Elolvastam és elfogadom a ${rules} és az ${priv}. Tudomásul veszem, hogy érkezéskor minden vendégnek (gyermekeknek is) fényképes igazolvány szükséges.</span></label>
      ${st.err ? `<p class="zfb-err">${esc(st.err)}</p>` : ""}
      <div class="zfb-actions"><button type="button" class="zfb-btn ghost" data-go="2">‹ Vissza</button><button type="submit" class="zfb-btn" ${st.loading ? "disabled" : ""}>${st.loading ? "Küldés…" : "Foglalási kérés elküldése"}</button></div>
      <p class="zfb-fine">A foglalás elküldésével a napokat ideiglenesen lefoglaljuk. Jóváhagyás után e-mailben küldjük az előleg (${cfg.deposit_pct}%) átutalásához szükséges adatokat; a foglalás az előleg beérkezésével válik véglegessé.</p>
    </form>
    <aside class="zfb-side"><div class="zfb-apt-chip" style="--ac:${a.color}"><span class="zfb-no">${a.no}</span><b>${esc(a.name)}</b><small>${st.adults} felnőtt${st.children ? ", " + st.children + " gyermek" : ""}</small></div>
      <div class="zfb-dates"><div><small>Érkezés</small><b>${huDate(st.ci, true)}</b><em>${esc(cfg.checkin)}-tól</em></div><div><small>Távozás</small><b>${huDate(st.co, true)}</b><em>${esc(cfg.checkout)}-ig</em></div></div>
      ${breakdown(q)}</aside></div>`;
  }
  function viewDone() {
    const r = st.result, q = quote(), a = apt();
    return `<div class="zfb-done">
      <div class="zfb-anchor">⚓</div>
      <h2>${cfg.demo ? "Így nézne ki a sikeres foglalás" : "Köszönjük! Foglalási kérését megkaptuk."}</h2>
      ${cfg.demo ? `<p class="zfb-demo">Bemutató mód – a kérés nem lett elküldve.</p>` : `<p>Foglalási azonosító: <b>${esc(r.ref)}</b></p>`}
      <p>A kiválasztott napokat ideiglenesen lefoglaltuk. Hamarosan ellenőrizzük, és e-mailben (<b>${esc(st.form.email)}</b>) visszaigazoljuk az előleg átutalásához szükséges adatokkal.</p>
      <div class="zfb-done-sum"><div class="zfb-apt-chip" style="--ac:${a.color}"><span class="zfb-no">${a.no}</span><b>${esc(a.name)}</b><small>${huDate(st.ci)} – ${huDate(st.co)}</small></div>${breakdown(q)}</div>
      <p class="zfb-fine">Kérdése van? Hívjon minket: <a href="tel:${esc(cfg.phone.replace(/\s/g, ""))}">${esc(cfg.phone)}</a> · <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></p>
      <button type="button" class="zfb-btn" data-close="1">Bezárás</button></div>`;
  }

  /* ---------- események ---------- */
  function onInput(e) {
    const t = e.target; if (!t.name) return;
    st.form[t.name] = t.type === "checkbox" ? t.checked : t.value;
  }
  async function onClick(e) {
    const b = e.target.closest("button, [data-apt]"); if (!b || b.disabled) return;
    if (b.dataset.apt) return chooseApt(b.dataset.apt);
    if (b.dataset.go) { st.step = +b.dataset.go; st.err = ""; return render(); }
    if (b.dataset.close) return close();
    if (b.dataset.m) { st.month = Math.max(0, Math.min(12, st.month + +b.dataset.m)); return render(); }
    if (b.dataset.clear) { st.ci = st.co = null; return render(); }
    if (b.dataset.st) { const k = b.dataset.st; st[k] = Math.max(k === "adults" ? 1 : 0, st[k] + +b.dataset.v); return render(); }
    if (b.dataset.day) {
      const d = b.dataset.day;
      if (!st.ci || st.co || d <= st.ci) { if (st.map[d] && st.map[d].free) { st.ci = d; st.co = null; } }
      else if (rangeOk(st.ci, d)) st.co = d;
      else if (st.map[d] && st.map[d].free) { st.ci = d; st.co = null; }
      return render();
    }
    if (b.dataset.next) { st.step = +b.dataset.next; st.err = ""; render(); el.querySelector(".zfb-body").scrollTop = 0; return; }
    if (b.type === "submit") { e.preventDefault(); return submit(); }
  }
  async function submit() {
    const f = el.querySelector(".zfb-form"); new FormData(f).forEach((v, k) => (st.form[k] = v)); st.form.accept = f.accept.checked;
    const F = st.form, bad = (m, n) => { st.err = m; render(); const i = el.querySelector(`[name="${n}"]`); if (i) i.focus(); };
    if (!F.name || F.name.trim().split(/\s+/).length < 2) return bad("Kérjük, add meg a teljes neved (vezeték- és keresztnév).", "name");
    if (!F.phone || F.phone.replace(/\D/g, "").length < 8) return bad("Kérjük, adj meg érvényes telefonszámot.", "phone");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(F.email || "")) return bad("Kérjük, adj meg érvényes e-mail címet.", "email");
    if (!F.birth_place || F.birth_place.trim().length < 2) return bad("Kérjük, add meg a születési helyed.", "birth_place");
    if (!F.birth_date || F.birth_date > addD(cfg.today, -18 * 365)) return bad("Kérjük, add meg a születési időd (a foglalónak nagykorúnak kell lennie).", "birth_date");
    if (!/^[A-Za-z0-9-]{5,20}$/.test((F.id_doc || "").replace(/\s/g, ""))) return bad("Kérjük, add meg a személyi igazolványod vagy útleveled számát.", "id_doc");
    if (!F.accept) return bad("A foglaláshoz el kell fogadnod a házirendet és az adatkezelési tájékoztatót.", "accept");
    st.loading = true; st.err = ""; render();
    try {
      if (cfg.demo) { await new Promise((r) => setTimeout(r, 700)); st.result = { ref: "ZEPHYR-DEMO" }; }
      else st.result = await api("/book", { method: "POST", body: { apt: st.apt, checkin: st.ci, checkout: st.co, adults: st.adults, children: st.children, name: F.name.trim(), phone: F.phone.trim(), email: F.email.trim(), birth_place: F.birth_place.trim(), birth_date: F.birth_date, id_doc: F.id_doc.replace(/\s/g, ""), note: F.note || "", accept: true, website: F.website || "" } });
      st.step = 4;
    } catch (e) { st.err = e.message; }
    st.loading = false; render();
  }

  window.ZephyrBooking = { open, close };
})();
