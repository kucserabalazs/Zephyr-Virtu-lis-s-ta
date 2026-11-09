/* ==========================================================================
   Zephyr – nyelvi alap (i18n)
   - A látogató nyelvét a böngésző/telefon nyelvéből ismeri fel (nem az országból);
     a kézi választást megjegyzi; ?lang=de felülírja.
   - A szótár kulcsa maga a MAGYAR felirat → nem kell minden szöveget kóddal megjelölni:
     a motor a megjelenő szövegeket (és a placeholder / aria-label / title / alt mezőket)
     a szótár alapján cseréli, a később megjelenő ablakokat is (foglalás, galéria…).
   - Számokat tartalmazó feliratok: a szótárban {#} jelöli a számot ("{#} / {#}").
   - Arab és urdu: jobbról balra (dir="rtl").
   - Szótárak: nyelv/xx.json  ({ "magyar felirat": "fordítás" }); a mesterlista: nyelv/hu.json.
   - Gyűjtő mód: ?forditas=gyujt → a még nem fordított feliratokat összegyűjti (ZI18N.collected()).
   ========================================================================== */
(function () {
  if (window.ZI18N) return;
  const LANGS = [
    ["hu", "Magyar", "🇭🇺"], ["en", "English", "🇬🇧"], ["de", "Deutsch", "🇩🇪"], ["fr", "Français", "🇫🇷"], ["it", "Italiano", "🇮🇹"],
    ["es", "Español", "🇪🇸"], ["nl", "Nederlands", "🇳🇱"], ["pl", "Polski", "🇵🇱"], ["cs", "Čeština", "🇨🇿"], ["sk", "Slovenčina", "🇸🇰"],
    ["ro", "Română", "🇷🇴"], ["hr", "Hrvatski", "🇭🇷"], ["pt", "Português", "🇵🇹"], ["ru", "Русский", "🇷🇺"], ["tr", "Türkçe", "🇹🇷"],
    ["zh", "中文", "🇨🇳"], ["ja", "日本語", "🇯🇵"], ["ko", "한국어", "🇰🇷"], ["vi", "Tiếng Việt", "🇻🇳"], ["id", "Bahasa Indonesia", "🇮🇩"],
    ["hi", "हिन्दी", "🇮🇳"], ["bn", "বাংলা", "🇧🇩"], ["ur", "اردو", "🇵🇰"], ["ar", "العربية", "🇸🇦"]
  ];
  const RTL = { ar: 1, ur: 1 };
  const CODES = LANGS.map((l) => l[0]);
  /* mely nyelvekhez van már szótár – a build tölti ki a nyelv/ mappa alapján */
  const READY = (window.ZEPHYR_I18N_READY || /*ZI18N_READY*/["hu"]/*/ZI18N_READY*/).filter((c) => CODES.includes(c));
  const BASE = window.ZEPHYR_I18N_BASE || (/(^|\.)(claude\.ai|claudeusercontent\.com|anthropic\.com)$/i.test(location.hostname) ? "nyelv/" : "../nyelv/");   /* claude.ai bemutató: a szótárak az előnézet mellett */
  const KEY = "zephyr-lang";
  const COLLECT = /(^|[?&])forditas=gyujt/.test(location.search);
  const SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1, CANVAS: 1, TEMPLATE: 1 };
  const ATTRS = ["placeholder", "aria-label", "title", "alt"];
  const store = { get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }, set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} } };

  /* ---- nyelv kiválasztása: ?lang= → kézi választás → böngésző nyelvei → angol → magyar ---- */
  function detect() {
    const q = (/[?&]lang=([a-z]{2})/i.exec(location.search) || [])[1];
    if (q && CODES.includes(q.toLowerCase())) return q.toLowerCase();
    const s = store.get(); if (s && CODES.includes(s)) return s;
    const pref = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "hu"]).map((l) => String(l).toLowerCase().split("-")[0]);
    for (const p of pref) if (READY.includes(p)) return p;
    if (pref[0] !== "hu" && READY.includes("en")) return "en";
    return "hu";
  }

  let lang = "hu", dict = null, TITLE = null;
  const NUM = /\d+(?:[.,   ]\d{3})*(?:[.,]\d+)?/g;
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const wanted = (k) => k.length > 1 && /\p{L}/u.test(k);
  const seen = new Set();
  function note(k) { if (!COLLECT || !wanted(k)) return; const p = k.replace(NUM, "{#}"); if (dict && (dict[k] != null || dict[p] != null)) return; seen.add(p); }
  function tr1(x) { if (dict[x] != null) return dict[x]; const nums = []; const p = x.replace(NUM, (m) => { nums.push(m); return "{#}"; }); if (nums.length && dict[p] != null) { let i = 0; return dict[p].replace(/\{#\}/g, () => nums[i++] ?? ""); } return x; }
  function tr(raw) {
    const k = norm(raw); if (!k) return null;
    note(k);
    if (!dict) return null;
    if (dict[k] != null) return dict[k];
    const nums = []; const p = k.replace(NUM, (m) => { nums.push(m); return "{#}"; });
    if (nums.length && dict[p] != null) { let i = 0; return dict[p].replace(/\{#\}/g, () => (nums[i++] != null ? nums[i - 1] : "")); }
    return trParts(k);   /* összetett felirat („A · B”, „A – B”): részenként */
  }
  function trParts(k) {
    for (const sep of [" · ", " – "]) {
      if (!k.includes(sep)) continue;
      const parts = k.split(sep), o = parts.map((x) => { const y = tr1(x); return y !== x ? y : (trParts(x) ?? x); });
      if (o.some((x, i) => x !== parts[i])) return o.join(sep);
    }
    return null;
  }
  /* szövegcsomópontok: az eredeti magyar szöveget megjegyezzük, hogy nyelvváltáskor visszaállítható legyen */
  const TXT = new WeakMap(), ATT = new WeakMap();
  function doText(n) {
    const rec = TXT.get(n); let src = rec ? rec.src : n.nodeValue;
    if (rec && n.nodeValue !== rec.out) src = n.nodeValue;   /* az oldal közben átírta → új forrásszöveg */
    const ky = n.parentNode && n.parentNode.getAttribute && n.parentNode.getAttribute("data-i18n");   /* rövid, többértelmű feliratok saját kulccsal (pl. nap:H) */
    const t = lang === "hu" ? null : (ky && dict && dict[ky] != null ? dict[ky] : tr(src)); if (lang === "hu") note(norm(src));
    let out = src;
    if (t != null) { const m = /^(\s*)[\s\S]*?(\s*)$/.exec(src); out = m[1] + t + m[2]; }
    TXT.set(n, { src, out }); if (n.nodeValue !== out) n.nodeValue = out;
  }
  function doAttrs(el) {
    let rec = ATT.get(el); if (!rec) { rec = {}; ATT.set(el, rec); }
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue; const cur = el.getAttribute(a);
      let r = rec[a]; if (!r || cur !== r.out) r = rec[a] = { src: cur };
      const t = lang === "hu" ? (note(norm(cur)), null) : tr(cur); r.out = t != null ? t : r.src;
      if (cur !== r.out) el.setAttribute(a, r.out);
    }
  }
  function skip(el) { for (let e = el; e && e !== document; e = e.parentNode) { if (e.nodeType === 1 && (SKIP[e.nodeName] || e.hasAttribute("data-noi18n") || e.isContentEditable)) return true; } return false; }
  function walk(root) {
    if (!root) return; if (root.nodeType === 3) { if (!skip(root.parentNode)) doText(root); return; }
    if (root.nodeType !== 1 || skip(root)) return;
    doAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: (n) => n.nodeType === 1 ? (SKIP[n.nodeName] || n.hasAttribute("data-noi18n") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : NodeFilter.FILTER_ACCEPT });
    root.querySelectorAll("[placeholder],[aria-label],[title],[alt]").forEach((e) => { if (!skip(e)) doAttrs(e); });
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.trim()) doText(n);
  }
  /* a később megjelenő tartalom (foglalás, galéria, panelek) is fordul */
  let queue = new Set(), raf = 0, busy = false;
  const mo = new MutationObserver((list) => {
    if (busy) return;
    for (const m of list) {
      if (m.type === "characterData") queue.add(m.target);
      else if (m.type === "attributes") queue.add(m.target);
      else m.addedNodes.forEach((n) => queue.add(n));
    }
    if (!raf) raf = requestAnimationFrame(flush);
  });
  function flush() { raf = 0; const q = queue; queue = new Set(); if (lang === "hu" && !COLLECT) return; busy = true; try { q.forEach((n) => { if (n.isConnected) walk(n); }); } finally { mo.takeRecords(); busy = false; } }
  function observe() { mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS }); }

  async function loadDict(c) {
    if (c === "hu") return null;
    const inl = window.ZEPHYR_I18N_DICTS && window.ZEPHYR_I18N_DICTS[c]; if (inl) return inl;
    for (const b of [BASE, BASE === "nyelv/" ? "../nyelv/" : "nyelv/"]) { try { const r = await fetch(b + c + ".json", { cache: "force-cache" }); if (r.ok) return await r.json(); } catch (e) {} }
    return null;
  }
  async function setLang(c, remember) {
    if (!CODES.includes(c)) c = "hu";
    const d = await loadDict(c);
    if (c !== "hu" && !d) { c = "hu"; }   /* nincs még szótár → magyar marad */
    lang = c; dict = d;
    if (remember) store.set(c);
    const h = document.documentElement; h.lang = c; h.dir = RTL[c] ? "rtl" : "ltr"; h.classList.toggle("zi-rtl", !!RTL[c]);
    busy = true; try { walk(document.body); if (TITLE == null) TITLE = document.title; document.title = (lang !== "hu" && tr(TITLE)) || TITLE; } finally { mo.takeRecords(); busy = false; }
    document.querySelectorAll(".zi-pick").forEach(paintPicker);
    dispatchEvent(new CustomEvent("zephyr-lang", { detail: { lang: c } }));
    return c;
  }

  /* ---- zászlós nyelvválasztó ---- */
  const CSS = `
.zi-pick { position: relative; display: inline-flex; font-family: inherit; }
.zi-btn { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; height: 40px; padding: 0 12px 0 8px; border-radius: 999px; color: #fff; font: 800 14px/1 inherit; letter-spacing: .04em;
  background: linear-gradient(180deg, rgba(255,255,255,.2), rgba(255,255,255,.08)); box-shadow: inset 0 0 0 1px rgba(255,217,120,.5), inset 0 1px 0 rgba(255,255,255,.3); transition: background .2s, transform .2s; }
.zi-btn:hover, .zi-btn:focus-visible { background: linear-gradient(180deg, rgba(255,255,255,.3), rgba(255,255,255,.12)); transform: translateY(-1px); }
.zi-flag { font-size: 22px; line-height: 1; filter: drop-shadow(0 1px 1px rgba(0,0,0,.35)); }
.zi-car { width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #ffd978; transition: transform .2s; }
.zi-pick.open .zi-car { transform: rotate(180deg); }
.zi-menu { position: absolute; z-index: 2147483000; top: calc(100% + 10px); inset-inline-end: 0; width: min(560px, calc(100vw - 24px)); max-height: min(70vh, 560px); overflow: auto; padding: 14px; border-radius: 20px; color: #0b2a4a;
  background: linear-gradient(180deg, #ffffff, #f3f7fb); box-shadow: 0 24px 60px rgba(4,20,40,.45), 0 0 0 1px rgba(11,42,74,.08); display: none; }
.zi-pick.open .zi-menu { display: block; animation: ziIn .22s ease; } @keyframes ziIn { from { opacity: 0; transform: translateY(-6px) scale(.98); } }
.zi-hd { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 2px 4px 10px; border-bottom: 1px solid #e3eaf1; margin-bottom: 10px; }
.zi-hd b { font: 900 17px/1.2 inherit; } .zi-hd small { font: 700 13px/1.3 inherit; color: #5a6b7b; }
.zi-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.zi-it { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; gap: 9px; min-height: 46px; padding: 6px 10px; border-radius: 12px; font: 700 15px/1.2 inherit; color: #0b2a4a; transition: background .15s; }
.zi-it .zi-flag { font-size: 24px; }
.zi-it span { display: flex; flex-direction: column; min-width: 0; } .zi-it em { font-style: normal; font: 700 11.5px/1.2 inherit; color: #8a96a2; }
.zi-it:hover, .zi-it:focus-visible { background: #eaf2fa; }
.zi-it[aria-current="true"] { background: linear-gradient(180deg, #fff3c4, #ffd978); box-shadow: inset 0 0 0 1px rgba(138,102,48,.35); }
.zi-it.soon { opacity: .55; cursor: default; } .zi-it.soon:hover { background: transparent; }
@media (max-width: 700px) { .zi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .zi-it { font-size: 16px; min-height: 50px; } .zi-menu { position: fixed; top: auto; bottom: 12px; inset-inline: 12px; width: auto; max-height: 75vh; } }
.zi-pick.inline { display: block; } .zi-pick.inline .zi-btn { display: none; } .zi-pick.inline .zi-menu { display: block; position: static; width: auto; max-height: none; padding: 0; background: none; box-shadow: none; animation: none; color: #fff; }
.zi-pick.inline .zi-hd { display: none; } .zi-pick.inline .zi-it { color: #fff; background: rgba(255,255,255,.06); } .zi-pick.inline .zi-it em { color: #c9d8e6; }
.zi-pick.inline .zi-it:hover { background: rgba(255,255,255,.14); } .zi-pick.inline .zi-it.soon { opacity: .6; } .zi-pick.inline .zi-it[aria-current="true"] { color: #0b2a4a; background: linear-gradient(180deg, #fff3c4, #ffd978); }
html.zi-rtl body { text-align: start; }`;
  function injectCss() { if (document.getElementById("ziCss")) return; const s = document.createElement("style"); s.id = "ziCss"; s.textContent = CSS; document.head.appendChild(s); }
  const L = (c) => LANGS.find((l) => l[0] === c) || LANGS[0];
  function paintPicker(box) {
    const cur = L(lang);
    box.querySelector(".zi-btn").innerHTML = `<span class="zi-flag">${cur[2]}</span><span>${cur[0].toUpperCase()}</span><i class="zi-car"></i>`;
    box.querySelector(".zi-btn").setAttribute("aria-label", "Nyelv: " + cur[1]);
    box.querySelector(".zi-grid").innerHTML = LANGS.map(([c, n, f]) => { const ok = READY.includes(c);
      return `<button type="button" class="zi-it${ok ? "" : " soon"}" data-lang="${c}" lang="${c}" dir="${RTL[c] ? "rtl" : "ltr"}" aria-current="${c === lang}" ${ok ? "" : 'aria-disabled="true"'}><span class="zi-flag">${f}</span><span>${n}${ok ? "" : "<em>hamarosan</em>"}</span></button>`; }).join("");
  }
  function mountPicker(host, opts) {
    if (!host) return null; injectCss();
    const box = document.createElement("div"); box.className = "zi-pick"; box.setAttribute("data-noi18n", "");
    box.innerHTML = `<button type="button" class="zi-btn" aria-haspopup="true" aria-expanded="false"></button><div class="zi-menu" role="menu"><div class="zi-hd"><b>Nyelv · Language</b><small>${READY.length} / ${LANGS.length}</small></div><div class="zi-grid"></div></div>`;
    if (opts && opts.inline) box.classList.add("inline");
    if (opts && opts.before) host.insertBefore(box, opts.before); else host.appendChild(box);
    paintPicker(box);
    const btn = box.querySelector(".zi-btn");
    const close = () => { box.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); const o = !box.classList.contains("open"); document.querySelectorAll(".zi-pick.open").forEach((x) => x.classList.remove("open")); box.classList.toggle("open", o); btn.setAttribute("aria-expanded", String(o)); });
    box.querySelector(".zi-menu").addEventListener("click", (e) => { if (!box.classList.contains("inline")) e.stopPropagation(); const it = e.target.closest("[data-lang]"); if (!it || it.classList.contains("soon")) return; close(); setLang(it.dataset.lang, true); });
    document.addEventListener("click", close); document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    return box;
  }

  function start() {
    const c = detect();
    observe();
    if (c !== "hu") setLang(c, false); else if (COLLECT) { busy = true; walk(document.body); mo.takeRecords(); busy = false; }
  }
  window.ZI18N = {
    langs: LANGS, ready: READY, get lang() { return lang; }, setLang: (c) => setLang(c, true), t: (hu) => tr(hu) ?? hu, mountPicker,
    collected: () => Array.from(seen).sort((a, b) => a.localeCompare(b, "hu")),
    rescan: () => { busy = true; walk(document.body); mo.takeRecords(); busy = false; }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
