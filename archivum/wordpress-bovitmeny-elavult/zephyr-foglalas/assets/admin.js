/* Zephyr foglalás – adminfelület */
(function () {
  "use strict";
  const C = window.ZF_ADMIN || {}, root = document.getElementById("zf-admin");
  if (!root) return;
  const HU_M = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
  const HU_D = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];
  const ST = { pending: "Jóváhagyásra vár", confirmed: "Visszaigazolva", cancelled: "Lemondva", blocked: "Lezárva", external: "Külső naptár" };
  const SRC = { web: "Weboldal", admin: "Kézi", airbnb: "Airbnb", szallas: "Szállás.hu", egyeb: "Egyéb naptár" };
  let S = null, tab = "naptar", calFrom = null, calData = null, sel = null;

  /* ---------- segédek ---------- */
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in (attrs || {})) {
      const v = attrs[k]; if (v == null || v === false) continue;
      if (k === "class") e.className = v; else if (k === "html") e.innerHTML = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v); else e.setAttribute(k, v === true ? "" : v);
    }
    kids.flat(9).forEach((c) => { if (c == null || c === false) return; e.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); });
    return e;
  }
  async function api(path, opt) {
    opt = opt || {};
    const r = await fetch(C.api + path, { method: opt.method || "GET", headers: { "X-WP-Nonce": C.nonce, "Content-Type": "application/json" }, credentials: "same-origin", body: opt.body ? JSON.stringify(opt.body) : undefined });
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error((j && j.message) || ("Hiba (" + r.status + ")"));
    return j;
  }
  const money = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Ft";
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const pd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const diff = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
  const huDate = (s) => { const d = pd(s); return d.getFullYear() + ". " + HU_M[d.getMonth()] + " " + d.getDate() + "."; };
  const shortDate = (s) => { const d = pd(s); return (d.getMonth() + 1) + "." + String(d.getDate()).padStart(2, "0") + "."; };
  function toast(msg, bad) { const t = h("div", { class: "zf-toast" + (bad ? " bad" : "") }, msg); document.body.appendChild(t); requestAnimationFrame(() => t.classList.add("on")); setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 400); }, 3200); }
  const aptName = (a) => (S.apartments[a] ? S.apartments[a].no + " · " + S.apartments[a].name : a);
  const aptList = () => Object.keys(S.apartments).sort((a, b) => S.apartments[a].no - S.apartments[b].no);
  function copyBtn(text) { return h("button", { type: "button", class: "button", onclick: (e) => { navigator.clipboard.writeText(text).then(() => { e.target.textContent = "Másolva ✓"; setTimeout(() => (e.target.textContent = "Másolás"), 1600); }); } }, "Másolás"); }

  /* ---------- keret ---------- */
  async function boot() {
    try { S = await api("/admin/settings"); } catch (e) { root.innerHTML = "<div class='notice notice-error'><p>" + e.message + "</p></div>"; return; }
    const d = pd(C.today); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); calFrom = ymd(d);
    const m = /#foglalas-(\d+)/.exec(location.hash);
    render();
    if (m) openEditor(+m[1]);
  }
  function render() {
    root.innerHTML = "";
    const tabs = [["naptar", "Naptár"], ["foglalasok", "Foglalások"], ["arak", "Árak"], ["szinkron", "Naptárszinkron"], ["beallitasok", "Beállítások"]];
    root.appendChild(h("header", { class: "zf-head" },
      h("div", { class: "zf-brand" }, h("b", {}, "ZEPHYR"), h("span", {}, "foglalási rendszer")),
      h("nav", { class: "zf-tabs" }, tabs.map(([k, t]) => h("button", { type: "button", class: "zf-tab" + (tab === k ? " on" : ""), onclick: () => { tab = k; render(); } }, t)))));
    const body = h("main", { class: "zf-body" }); root.appendChild(body);
    ({ naptar: renderCal, foglalasok: renderList, arak: renderPrices, szinkron: renderSync, beallitasok: renderSettings })[tab](body);
  }

  /* ---------- NAPTÁR (idővonal: apartmanok × napok) ---------- */
  const DAYS = 42, CW = 46;
  async function renderCal(body) {
    const to = addD(calFrom, DAYS);
    const bar = h("div", { class: "zf-calbar" },
      h("button", { type: "button", class: "button", onclick: () => { calFrom = addD(calFrom, -28); render(); } }, "‹ 4 hét"),
      h("button", { type: "button", class: "button", onclick: () => { const d = pd(C.today); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); calFrom = ymd(d); render(); } }, "Ma"),
      h("button", { type: "button", class: "button", onclick: () => { calFrom = addD(calFrom, 28); render(); } }, "4 hét ›"),
      h("input", { type: "month", value: calFrom.slice(0, 7), onchange: (e) => { if (e.target.value) { calFrom = e.target.value + "-01"; render(); } } }),
      h("span", { class: "zf-range" }, huDate(calFrom) + " – " + huDate(addD(to, -1))),
      h("span", { class: "zf-legend" }, ["pending", "confirmed", "external", "blocked"].map((s) => h("i", { class: "lg " + s }, ST[s]))));
    body.appendChild(bar);
    body.appendChild(h("p", { class: "zf-help" }, "Húzd végig az egeret (vagy koppints az első, majd az utolsó napra) egy apartman sorában a napok kijelöléséhez: utána lezárhatod / megnyithatod, átírhatod az árat, vagy kézi foglalást rögzíthetsz. Egy foglalásra kattintva szerkesztheted."));
    const wrap = h("div", { class: "zf-tl-wrap" }, h("p", {}, "Betöltés…")); body.appendChild(wrap);
    const panel = h("div", { class: "zf-selpanel", hidden: true }); body.appendChild(panel);
    try { calData = await api("/admin/calendar?from=" + calFrom + "&to=" + to); } catch (e) { wrap.innerHTML = "<p class='zf-err'>" + e.message + "</p>"; return; }
    wrap.innerHTML = "";
    const tl = h("div", { class: "zf-tl", style: { gridTemplateColumns: `150px repeat(${DAYS}, ${CW}px)` } });
    /* fejléc: hónap + napok */
    tl.appendChild(h("div", { class: "zf-tl-corner" }, "Apartman"));
    for (let i = 0; i < DAYS; i++) {
      const ds = addD(calFrom, i), d = pd(ds), wk = d.getDay() === 0 || d.getDay() === 6;
      tl.appendChild(h("div", { class: "zf-tl-day" + (wk ? " wk" : "") + (ds === C.today ? " today" : "") + (d.getDate() === 1 ? " m1" : "") },
        d.getDate() === 1 || i === 0 ? h("em", {}, HU_M[d.getMonth()]) : null, h("b", {}, d.getDate()), h("small", {}, HU_D[d.getDay()])));
    }
    aptList().forEach((apt) => {
      const A = S.apartments[apt], D = calData[apt] || { prices: {}, bookings: [] };
      tl.appendChild(h("div", { class: "zf-tl-apt", style: { borderLeftColor: A.color } }, h("b", {}, A.no + " · " + A.name), h("small", {}, (A.active ? "" : "inaktív · ") + "alapár " + money(A.price))));
      const row = h("div", { class: "zf-tl-row", style: { gridColumn: `2 / span ${DAYS}` } });
      for (let i = 0; i < DAYS; i++) {
        const ds = addD(calFrom, i), pr = D.prices[ds] || { p: A.price }, d = pd(ds);
        const cell = h("div", { class: "zf-cell" + (d.getDay() === 0 || d.getDay() === 6 ? " wk" : "") + (pr.custom ? " custom" : "") + (ds < C.today ? " past" : ""), "data-apt": apt, "data-d": ds, style: { left: i * CW + "px", width: CW + "px" } }, h("span", {}, Math.round(pr.p / 1000) + "e"));
        row.appendChild(cell);
      }
      /* egymást átfedő foglalások (ütközés) külön sávba */
      const lanes = [], laneOf = new Map();
      D.bookings.slice().sort((x, y) => (x.checkin < y.checkin ? -1 : 1)).forEach((b) => { let l = lanes.findIndex((end) => end <= b.checkin); if (l < 0) { l = lanes.length; lanes.push(b.checkout); } else lanes[l] = b.checkout; laneOf.set(b, l); });
      const multi = lanes.length > 1;
      D.bookings.forEach((b) => {
        const lane = laneOf.get(b);
        const s = b.checkin < calFrom ? calFrom : b.checkin, e = b.checkout > to ? to : b.checkout;
        const l = diff(calFrom, s) * CW + (b.checkin < calFrom ? 0 : CW / 2), w = diff(s, e) * CW - (b.checkin < calFrom ? 0 : CW / 2) + (b.checkout > to ? 0 : CW / 2) - 2;
        const who = b.status === "blocked" ? "Lezárva" : b.status === "external" ? (SRC[b.source] || b.source) + (b.ext_summary ? " · " + b.ext_summary : "") : b.name;
        row.appendChild(h("button", { type: "button", class: "zf-bk " + b.status + " src-" + b.source + (multi ? " lane conflict" : ""), style: { left: l + "px", width: Math.max(14, w) + "px", top: multi ? (3 + Math.min(lane, 1) * 24) + "px" : null }, title: who + "\n" + huDate(b.checkin) + " → " + huDate(b.checkout) + (b.admin_note ? "\n✎ " + b.admin_note : ""), onclick: (ev) => { ev.stopPropagation(); if (b.status === "blocked") selectRange(apt, b.checkin, b.checkout, panel); else openEditor(b.id); } },
          h("span", {}, who), b.admin_note ? h("i", { class: "note" }, "✎") : null));
      });
      tl.appendChild(row);
      /* kijelölés: húzás vagy két koppintás */
      let start = null;
      row.addEventListener("pointerdown", (e) => { const c = e.target.closest(".zf-cell"); if (!c) return; start = c.dataset.d; markSel(row, start, start); row.setPointerCapture(e.pointerId); });
      row.addEventListener("pointermove", (e) => { if (!start) return; const el = document.elementFromPoint(e.clientX, e.clientY), c = el && el.closest(".zf-cell"); if (c && c.dataset.apt === apt) markSel(row, start, c.dataset.d); });
      row.addEventListener("pointerup", (e) => {
        if (!start) return; const el = document.elementFromPoint(e.clientX, e.clientY), c = el && el.closest(".zf-cell");
        let end = c && c.dataset.apt === apt ? c.dataset.d : start;
        if (sel && sel.apt === apt && sel.pendingTap && start === end) { end = start; start = sel.from; }
        let a = start < end ? start : end, b2 = start < end ? end : start; start = null;
        selectRange(apt, a, addD(b2, 1), panel, a === b2);
      });
    });
    wrap.appendChild(tl);
    const todayIdx = diff(calFrom, C.today); if (todayIdx > 3) wrap.scrollLeft = (todayIdx - 2) * CW;
  }
  function markSel(row, a, b) {
    if (a > b) [a, b] = [b, a];
    document.querySelectorAll(".zf-cell.sel").forEach((c) => c.classList.remove("sel"));
    row.querySelectorAll(".zf-cell").forEach((c) => { if (c.dataset.d >= a && c.dataset.d <= b) c.classList.add("sel"); });
  }
  function selectRange(apt, from, to, panel, single) {
    sel = { apt, from, to, pendingTap: !!single };
    const row = document.querySelector(`.zf-cell[data-apt="${apt}"]`).parentNode; markSel(row, from, addD(to, -1));
    const n = diff(from, to), D = calData[apt];
    let sum = 0; for (let d = from; d < to; d = addD(d, 1)) sum += (D.prices[d] || { p: S.apartments[apt].price }).p;
    const priceIn = h("input", { type: "number", min: 0, step: 500, placeholder: "pl. 32000", class: "small-text", style: { width: "110px" } });
    const note = h("input", { type: "text", placeholder: "megjegyzés a lezáráshoz (csak te látod)", style: { width: "260px" } });
    panel.hidden = false; panel.innerHTML = "";
    panel.appendChild(h("div", { class: "zf-sp-head" }, h("b", {}, aptName(apt)), " · ", huDate(from), " → ", huDate(to), ` (${n} éj, jelenlegi ár összesen ${money(sum)})`, single ? h("em", {}, "  – koppints egy másik napra a tartomány kiterjesztéséhez") : null,
      h("button", { type: "button", class: "zf-x", onclick: () => { panel.hidden = true; sel = null; document.querySelectorAll(".zf-cell.sel").forEach((c) => c.classList.remove("sel")); } }, "×")));
    const run = async (fn, ok) => { try { await fn(); toast(ok); render(); } catch (e) { toast(e.message, true); } };
    panel.appendChild(h("div", { class: "zf-sp-actions" },
      h("div", {}, h("b", {}, "Napok: "), h("button", { type: "button", class: "button", onclick: () => run(() => api("/admin/block", { method: "POST", body: { apt, from, to, open: false, note: note.value } }), "Lezárva") }, "🔒 Lezárás"), " ", note, " ",
        h("button", { type: "button", class: "button", onclick: () => run(() => api("/admin/block", { method: "POST", body: { apt, from, to, open: true } }), "Megnyitva") }, "🔓 Megnyitás")),
      h("div", {}, h("b", {}, "Ár / éj: "), priceIn, " ", h("button", { type: "button", class: "button button-primary", onclick: () => { if (priceIn.value === "") return toast("Adj meg egy árat", true); run(() => api("/admin/prices", { method: "POST", body: { apt, from, to, price: +priceIn.value } }), "Ár beállítva"); } }, "Ár beállítása"), " ",
        h("button", { type: "button", class: "button", onclick: () => run(() => api("/admin/prices", { method: "POST", body: { apt, from, to, price: null } }), "Visszaállítva az alapárra") }, "Alapár visszaállítása")),
      h("div", {}, h("button", { type: "button", class: "button button-primary", onclick: () => openEditor(null, { apt, checkin: from, checkout: to }) }, "+ Kézi foglalás ezekre a napokra"))));
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- FOGLALÁSOK listája ---------- */
  async function renderList(body) {
    const f = renderList.f || (renderList.f = { apt: "", status: "", q: "", when: "upcoming" });
    const aptSel = h("select", { onchange: (e) => { f.apt = e.target.value; render(); } }, h("option", { value: "" }, "Minden apartman"), aptList().map((a) => h("option", { value: a, selected: f.apt === a }, aptName(a))));
    const stSel = h("select", { onchange: (e) => { f.status = e.target.value; render(); } }, h("option", { value: "" }, "Minden állapot"), ["pending", "confirmed", "cancelled"].map((s) => h("option", { value: s, selected: f.status === s }, ST[s])));
    const whenSel = h("select", { onchange: (e) => { f.when = e.target.value; render(); } }, [["upcoming", "Közelgő és folyamatban"], ["past", "Elmúlt"], ["all", "Mind"]].map(([v, t]) => h("option", { value: v, selected: f.when === v }, t)));
    const q = h("input", { type: "search", placeholder: "Keresés: név, e-mail, telefon, megjegyzés", value: f.q, style: { width: "280px" }, onkeydown: (e) => { if (e.key === "Enter") { f.q = e.target.value; render(); } } });
    body.appendChild(h("div", { class: "zf-calbar" }, aptSel, stSel, whenSel, q, h("button", { type: "button", class: "button button-primary", onclick: () => openEditor(null, {}) }, "+ Új foglalás")));
    const box = h("div", {}, h("p", {}, "Betöltés…")); body.appendChild(box);
    let url = "/admin/bookings?apt=" + f.apt + "&status=" + f.status + "&q=" + encodeURIComponent(f.q);
    if (f.when === "upcoming") url += "&from=" + C.today; if (f.when === "past") url += "&to=" + C.today;
    let rows; try { rows = await api(url); } catch (e) { box.innerHTML = "<p class='zf-err'>" + e.message + "</p>"; return; }
    if (f.when === "upcoming") rows.reverse();
    box.innerHTML = "";
    if (!rows.length) { box.appendChild(h("p", { class: "zf-help" }, "Nincs találat.")); return; }
    box.appendChild(h("table", { class: "widefat striped zf-table" },
      h("thead", {}, h("tr", {}, ["Azonosító", "Apartman", "Érkezés → Távozás", "Éj", "Vendég", "Telefon", "Végösszeg", "Előleg / fizetve", "Állapot", "Forrás"].map((t) => h("th", {}, t)))),
      h("tbody", {}, rows.map((b) => h("tr", { class: "zf-row-" + b.status, onclick: () => openEditor(b.id) },
        h("td", {}, h("b", {}, "ZEPHYR-" + b.id), b.admin_note ? h("span", { class: "zf-note-i", title: b.admin_note }, " ✎") : null),
        h("td", {}, aptName(b.apt)), h("td", {}, shortDate(b.checkin) + " → " + shortDate(b.checkout) + " " + b.checkin.slice(0, 4)), h("td", {}, b.nights),
        h("td", {}, b.name, h("small", {}, b.email)), h("td", {}, b.phone), h("td", {}, money(b.grand_total)), h("td", {}, money(b.deposit) + " / " + money(b.paid)),
        h("td", {}, h("span", { class: "zf-pill " + b.status }, ST[b.status] || b.status)), h("td", {}, SRC[b.source] || b.source))))));
  }

  /* ---------- foglalás szerkesztő ---------- */
  async function openEditor(id, preset) {
    let b = { id: 0, apt: aptList()[0], checkin: C.today, checkout: addD(C.today, 2), adults: 2, children: 0, name: "", email: "", phone: "", birth_place: "", birth_date: "", id_doc: "", guest_note: "", admin_note: "", status: "confirmed", source: "admin", price_total: 0, tax_total: 0, grand_total: 0, deposit: 0, paid: 0 };
    if (id) { try { b = await api("/admin/bookings/" + id); } catch (e) { return toast(e.message, true); } }
    else Object.assign(b, preset || {});
    const ext = b.status === "external" || b.status === "blocked";
    const ov = h("div", { class: "zf-modal-bg", onclick: (e) => { if (e.target === ov) close(); } });
    const close = () => { ov.remove(); if (location.hash) history.replaceState(null, "", location.pathname + location.search); };
    const F = {};
    const inp = (k, type, attrs) => (F[k] = h("input", Object.assign({ type: type || "text", value: b[k] == null ? "" : b[k] }, attrs || {})));
    const field = (label, el, wide) => h("label", { class: "zf-f" + (wide ? " wide" : "") }, h("span", {}, label), el);
    F.apt = h("select", {}, aptList().map((a) => h("option", { value: a, selected: b.apt === a }, aptName(a))));
    F.status = h("select", {}, Object.keys(ST).map((s) => h("option", { value: s, selected: b.status === s }, ST[s])));
    F.guest_note = h("textarea", { rows: 2 }, b.guest_note || "");
    F.admin_note = h("textarea", { rows: 3, placeholder: "Csak te látod – pl. kérés, fizetési megjegyzés, kulcsátadás" }, b.admin_note || "");
    const recalc = h("input", { type: "checkbox", checked: !id });
    const force = h("input", { type: "checkbox" });
    const notify = h("input", { type: "checkbox", checked: !!b.email });
    const quoteBox = h("div", { class: "zf-quote" });
    const fields = ["price_total", "tax_total", "grand_total", "deposit", "paid"];
    async function doQuote() {
      try {
        const q = await api("/admin/quote", { method: "POST", body: { apt: F.apt.value, checkin: F.checkin.value, checkout: F.checkout.value, adults: +F.adults.value, children: +F.children.value, exclude: b.id } });
        quoteBox.innerHTML = "";
        quoteBox.appendChild(h("div", {}, `${q.nights} éj · szállás ${money(q.accommodation)} + IFA ${money(q.tax)} = `, h("b", {}, money(q.total)), ` · előleg ${money(q.deposit)}`, q.free ? h("span", { class: "zf-ok" }, " ✓ szabad") : h("span", { class: "zf-bad" }, " ⚠ ütközik egy másik foglalással")));
        if (recalc.checked) { F.price_total.value = q.accommodation; F.tax_total.value = q.tax; F.grand_total.value = q.total; F.deposit.value = q.deposit; }
      } catch (e) { quoteBox.textContent = e.message; }
    }
    ["checkin", "checkout", "adults", "children"].forEach((k) => {});
    const card = h("div", { class: "zf-modal" },
      h("header", {}, h("h2", {}, id ? "ZEPHYR-" + b.id : "Új foglalás"), id ? h("span", { class: "zf-pill " + b.status }, ST[b.status]) : null, id ? h("small", {}, (SRC[b.source] || b.source) + " · rögzítve: " + (b.created || "").slice(0, 16)) : null, h("button", { type: "button", class: "zf-x", onclick: close }, "×")),
      ext && b.ext_summary ? h("p", { class: "zf-help" }, "Külső naptár eseménye: " + b.ext_summary + " – a dátumokat a forrásplatformon módosítsd, itt csak megjegyzést írhatsz hozzá.") : null,
      h("section", { class: "zf-grid" },
        field("Apartman", F.apt), field("Érkezés", inp("checkin", "date")), field("Távozás", inp("checkout", "date")),
        field("Felnőtt (18+)", inp("adults", "number", { min: 0, max: 12 })), field("Gyermek (18 alatt)", inp("children", "number", { min: 0, max: 12 })), field("Állapot", F.status)),
      quoteBox,
      ext ? null : h("section", { class: "zf-grid" },
        field("Név", inp("name"), true), field("Telefon", inp("phone", "tel")), field("E-mail", inp("email", "email")),
        field("Születési hely", inp("birth_place")), field("Születési idő", inp("birth_date", "date")), field("Szem. ig. / útlevél szám", inp("id_doc"))),
      ext ? null : field("Vendég üzenete", F.guest_note, true),
      field("Saját megjegyzés (csak te látod)", F.admin_note, true),
      ext ? null : h("section", { class: "zf-grid five" }, field("Szállásdíj", inp("price_total", "number")), field("Idegenforgalmi adó", inp("tax_total", "number")), field("Végösszeg", inp("grand_total", "number")), field("Előleg", inp("deposit", "number")), field("Befizetve", inp("paid", "number"))),
      ext ? null : h("div", { class: "zf-checks" }, h("label", {}, recalc, " árak automatikus újraszámolása (napi árak + IFA)"), h("label", {}, force, " ütközés ellenére is mentsd"), h("label", {}, notify, " e-mail értesítés a vendégnek (visszaigazolásnál / lemondásnál)")),
      h("footer", {},
        id ? h("button", { type: "button", class: "button zf-danger", onclick: async () => { if (!confirm("Biztosan törlöd ezt a foglalást? Ez nem vonható vissza.")) return; try { await api("/admin/bookings/" + b.id + (notify.checked ? "?notify=1" : ""), { method: "DELETE" }); toast("Törölve"); close(); render(); } catch (e) { toast(e.message, true); } } }, "Törlés") : null,
        h("span", { class: "sp" }),
        id && b.status === "pending" ? h("button", { type: "button", class: "button", onclick: () => save("cancelled") }, "Elutasítás") : null,
        id && b.status === "pending" ? h("button", { type: "button", class: "button button-primary zf-ok-btn", onclick: () => save("confirmed") }, "✓ Jóváhagyás és visszaigazolás") : null,
        h("button", { type: "button", class: "button button-primary", onclick: () => save() }, "Mentés")));
    async function save(st) {
      const body = { apt: F.apt.value, checkin: F.checkin.value, checkout: F.checkout.value, adults: +F.adults.value, children: +F.children.value, status: st || F.status.value, admin_note: F.admin_note.value, force: force.checked, notify: notify.checked && !!(st || F.status.value !== b.status) };
      if (!ext) { ["name", "phone", "email", "birth_place", "birth_date", "id_doc"].forEach((k) => (body[k] = F[k].value)); body.guest_note = F.guest_note.value; fields.forEach((k) => (body[k] = F[k].value === "" ? null : +F[k].value)); if (!recalc.checked) body.keep_price = true; else body.recalc = true; }
      if (st === "cancelled" && !confirm("Elutasítod / lemondod a foglalást? A napok felszabadulnak.")) return;
      try { if (id) await api("/admin/bookings/" + id, { method: "POST", body }); else await api("/admin/bookings", { method: "POST", body }); toast(st === "confirmed" ? "Jóváhagyva" + (body.notify ? " – visszaigazoló e-mail elküldve" : "") : "Mentve"); close(); render(); }
      catch (e) { toast(e.message, true); }
    }
    ov.appendChild(card); document.body.appendChild(ov);
    ["checkin", "checkout", "adults", "children"].forEach((k) => F[k].addEventListener("change", doQuote)); F.apt.addEventListener("change", doQuote); recalc.addEventListener("change", doQuote);
    doQuote();
  }

  /* ---------- ÁRAK ---------- */
  function renderPrices(body) {
    body.appendChild(h("h2", {}, "Alapárak (Ft / éj)"));
    body.appendChild(h("p", { class: "zf-help" }, "Az alapár minden napra érvényes, amelyre nem adtál meg egyedi árat. Egyedi árakat a lenti eszközzel vagy a Naptárban napok kijelölésével állíthatsz be. Az idegenforgalmi adó (18 év felett " + money(S.tax) + " / fő / éj) automatikusan hozzáadódik."));
    const ins = {};
    body.appendChild(h("table", { class: "widefat zf-table narrow" }, h("thead", {}, h("tr", {}, h("th", {}, "Apartman"), h("th", {}, "Alapár / éj"), h("th", {}, "Max. vendég"), h("th", {}, "Online foglalható"))),
      h("tbody", {}, aptList().map((a) => { const A = S.apartments[a]; ins[a] = { price: h("input", { type: "number", value: A.price, step: 500, min: 0 }), cap: h("input", { type: "number", value: A.cap, min: 1, max: 12 }), active: h("input", { type: "checkbox", checked: !!A.active }) };
        return h("tr", {}, h("td", {}, h("b", {}, aptName(a))), h("td", {}, ins[a].price), h("td", {}, ins[a].cap), h("td", {}, ins[a].active)); }))));
    body.appendChild(h("p", {}, h("button", { type: "button", class: "button button-primary", onclick: async () => { const ap = {}; for (const a in ins) ap[a] = { price: +ins[a].price.value, cap: +ins[a].cap.value, active: ins[a].active.checked }; try { S = await api("/admin/settings", { method: "POST", body: { apartments: ap } }); toast("Alapárak mentve"); } catch (e) { toast(e.message, true); } } }, "Alapárak mentése")));
    body.appendChild(h("h2", {}, "Időszakos ár beállítása"));
    const chk = {}, wd = {};
    const from = h("input", { type: "date", value: C.today }), to = h("input", { type: "date", value: addD(C.today, 30) }), price = h("input", { type: "number", step: 500, min: 0, placeholder: "Ft / éj" });
    body.appendChild(h("div", { class: "zf-box" },
      h("div", {}, h("b", {}, "Apartmanok: "), aptList().map((a) => h("label", { class: "zf-inl" }, (chk[a] = h("input", { type: "checkbox", checked: true })), " " + S.apartments[a].name))),
      h("div", {}, h("b", {}, "Időszak: "), from, " – ", to, h("small", {}, " (a záró nap már nem tartozik bele)")),
      h("div", {}, h("b", {}, "Csak ezeken a napokon: "), [[1, "H"], [2, "K"], [3, "Sze"], [4, "Cs"], [5, "P"], [6, "Szo"], [7, "V"]].map(([n, t]) => h("label", { class: "zf-inl" }, (wd[n] = h("input", { type: "checkbox" })), " " + t)), h("small", {}, " (ha egyik sincs bejelölve: minden nap)")),
      h("div", {}, h("b", {}, "Ár / éj: "), price, " ",
        h("button", { type: "button", class: "button button-primary", onclick: () => apply(false) }, "Beállítás"), " ",
        h("button", { type: "button", class: "button", onclick: () => apply(true) }, "Egyedi árak törlése (alapár)"))));
    async function apply(reset) {
      const apts = aptList().filter((a) => chk[a].checked), w = Object.keys(wd).filter((k) => wd[k].checked).map(Number);
      if (!apts.length) return toast("Válassz apartmant", true);
      if (!reset && price.value === "") return toast("Adj meg árat", true);
      try { const r = await api("/admin/prices", { method: "POST", body: { apts, from: from.value, to: to.value, price: reset ? null : +price.value, weekdays: w } }); toast(r.changed + " nap ára módosítva"); } catch (e) { toast(e.message, true); }
    }
    body.appendChild(h("p", { class: "zf-help" }, "Tipp: főszezonra (pl. júl. 1 – aug. 31.) magasabb árat, hétvégékre (P, Szo) felárat állíthatsz be. Az egyedi árak a Naptárban vastagon szedve látszanak."));
  }

  /* ---------- SZINKRON ---------- */
  function renderSync(body) {
    body.appendChild(h("h2", {}, "Naptárszinkron – Airbnb, Szállás.hu, Google Naptár"));
    body.appendChild(h("div", { class: "zf-box zf-steps" },
      h("p", {}, h("b", {}, "1. Behúzás (import): "), "másold be ide az Airbnb / Szállás.hu által adott iCal (.ics) linket apartmanonként. A rendszer óránként automatikusan frissít, az ottani foglalások itt foglaltként jelennek meg, így nem lehet rájuk foglalni."),
      h("p", {}, h("b", {}, "2. Kiküldés (export): "), "az alábbi „Airbnb-be” és „Szállás.hu-ba” linkeket illeszd be az adott platform naptárimport mezőjébe – így az itt érkező foglalások ott is lezárják a napokat."),
      h("p", {}, h("b", {}, "3. Google Naptár: "), "Google Naptár → Egyéb naptárak → + → „URL-ről” → illeszd be a lenti Google-linket. A Google kb. 12–24 óránként frissíti a feliratkozott naptárakat.")));
    const ins = {};
    aptList().forEach((a) => {
      const A = S.apartments[a], ex = S.export[a]; ins[a] = {};
      const st = (src) => { const l = (S.sync || {})[a + "|" + src]; return l ? h("small", { class: l.ok ? "zf-ok" : "zf-bad" }, (l.ok ? "✓ " : "⚠ ") + l.time.slice(5, 16) + " – " + l.msg) : null; };
      body.appendChild(h("div", { class: "zf-box zf-apt-sync", style: { borderLeftColor: A.color } },
        h("h3", {}, aptName(a)),
        h("div", { class: "zf-two" },
          h("div", {}, h("h4", {}, "Behúzás (külső naptárak linkje)"),
            [["airbnb", "Airbnb iCal link"], ["szallas", "Szállás.hu iCal link"], ["egyeb", "Egyéb (pl. Booking.com)"]].map(([src, t]) => h("label", { class: "zf-f wide" }, h("span", {}, t), (ins[a][src] = h("input", { type: "url", value: (A.ical || {})[src] || "", placeholder: "https://…ics" })), st(src)))),
          h("div", {}, h("h4", {}, "Kiküldés (ezt másold be a platformokba)"),
            [["airbnb", "Airbnb-be"], ["szallas", "Szállás.hu-ba"], ["altalanos", "Általános"]].map(([k, t]) => h("div", { class: "zf-exp" }, h("span", {}, t), h("input", { type: "text", readonly: true, value: ex[k], onclick: (e) => e.target.select() }), copyBtn(ex[k])))))));
    });
    body.appendChild(h("div", { class: "zf-box" }, h("h3", {}, "Google Naptár (minden apartman, részletes: vendégnév, telefon, összeg)"),
      h("div", { class: "zf-exp" }, h("input", { type: "text", readonly: true, value: S.export.google, onclick: (e) => e.target.select() }), copyBtn(S.export.google)),
      h("p", { class: "zf-help" }, "Ez a link személyes adatokat tartalmaz – csak a saját Google-fiókodba add hozzá. Ha valaki illetéktelenül megkapta, a Beállításokban új titkos kulcsot generálhatsz (ekkor minden kiküldési linket újra be kell állítani).")));
    body.appendChild(h("p", {},
      h("button", { type: "button", class: "button button-primary", onclick: async () => { const ap = {}; for (const a in ins) ap[a] = { ical: { airbnb: ins[a].airbnb.value, szallas: ins[a].szallas.value, egyeb: ins[a].egyeb.value } }; try { S = await api("/admin/settings", { method: "POST", body: { apartments: ap } }); toast("Linkek mentve – szinkronizálás…"); const r = await api("/admin/sync", { method: "POST" }); S = await api("/admin/settings"); toast(Object.keys(r.log).length + " naptár frissítve"); render(); } catch (e) { toast(e.message, true); } } }, "Mentés és szinkronizálás most")));
  }

  /* ---------- BEÁLLÍTÁSOK ---------- */
  function renderSettings(body) {
    const F = {};
    const f = (k, label, type, help, attrs) => h("label", { class: "zf-f" }, h("span", {}, label), (F[k] = h("input", Object.assign({ type: type || "text", value: S[k] == null ? "" : S[k] }, attrs || {}))), help ? h("small", {}, help) : null);
    body.appendChild(h("h2", {}, "Foglalási szabályok"));
    body.appendChild(h("section", { class: "zf-grid" },
      f("tax", "Idegenforgalmi adó (Ft / fő / éj, 18 év felett)", "number"), f("deposit_pct", "Előleg (%)", "number"), f("deposit_days", "Előleg befizetési határidő (nap)", "number"),
      f("min_nights", "Minimum éjszaka", "number"), f("max_nights", "Maximum éjszaka (online)", "number"), f("lead_days", "Legkorábbi érkezés (nap múlva)", "number", "0 = akár a mai napra"),
      f("horizon_days", "Ennyi napra előre foglalható", "number"), f("checkin", "Érkezés (óra)", "text"), f("checkout", "Távozás (óra)", "text"),
      f("pending_hours", "Jóvá nem hagyott kérés lejárata (óra)", "number", "0 = soha nem jár le"), f("retention_days", "Okmányadatok törlése távozás után (nap)", "number", "0 = nem törli automatikusan")));
    body.appendChild(h("h2", {}, "Elérhetőség és banki adatok (a vendég e-mailjeiben)"));
    body.appendChild(h("section", { class: "zf-grid" },
      f("owner_name", "Név (aláírás)"), f("owner_email", "Értesítési e-mail", "email"), f("phone", "Telefon"), f("address", "Cím"),
      f("bank_holder", "Kedvezményezett neve"), f("bank_name", "Bank neve"), f("bank_account", "Bankszámlaszám"), f("bank_iban", "IBAN"), f("bank_swift", "SWIFT/BIC"),
      f("rules_url", "Házirend linkje", "url"), f("privacy_url", "Adatkezelési tájékoztató linkje", "url"), f("allowed_origins", "Engedélyezett külső domainek (CORS)", "text", "csak ha a túra másik domainen fut; vesszővel")));
    const regen = h("input", { type: "checkbox" });
    body.appendChild(h("p", {}, h("label", {}, regen, " Új titkos iCal-kulcs generálása (a régi kiküldési linkek megszűnnek)")));
    body.appendChild(h("p", {}, h("button", { type: "button", class: "button button-primary", onclick: async () => { const b = {}; for (const k in F) b[k] = F[k].value; b.regen_key = regen.checked; try { S = await api("/admin/settings", { method: "POST", body: b }); toast("Beállítások mentve"); render(); } catch (e) { toast(e.message, true); } } }, "Beállítások mentése")));
    body.appendChild(h("div", { class: "zf-box" }, h("h3", {}, "Foglalási felület beágyazása"),
      h("p", {}, "A virtuális túrában a „Foglalás” gomb automatikusan ezt a rendszert használja. Bármely WordPress-oldalra beteheted a foglalási gombot ezzel a rövidkóddal: ", h("code", {}, "[zephyr_foglalas]"), " vagy apartmanra szűkítve: ", h("code", {}, '[zephyr_foglalas apartman="korvett" gomb="Korvett foglalása"]'))));
  }

  boot();
})();
