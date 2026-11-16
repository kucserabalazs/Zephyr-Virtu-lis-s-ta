  /* =====================================================================================================
     2026-11-16 (éjszakai munka; tulajdonos: „valós ételfotókat bemutató kép illusztrációkat”, „valós halakkal … valós madár … fotókkal”)
     VALÓDI FOTÓK a Magyar Ízek Házában és a Természetvédelmi Házban.
     A képek a Wikimedia Commonsból valók, kizárólag szabad licenccel (CC BY, CC BY-SA, CC0, közkincs). A fejlesztői környezet a Wikimediát
     nem éri el, ezért a letöltést a GitHub Actions végzi (.github/workflows/fotok.yml · forras/tools/fotok.py): kepek/<azonosító>.jpg
     (960 px széles) és kepek/forrasok.json (szerző, licenc, a Commons-oldal). A kijelölés: forras/kepek/fotok.json (azonosító → fájlnév).
     A játék a szerzőt és a licencet kiírja: minden képre kis felirat kerül, a házakban pedig „Képek forrása” tábla függ.
     Ha egy kép nem tölthető be (vagy az oldal olyan helyen fut, ahol nincs kepek mappa), a leckék a korábbi rajzolt ábrát mutatják.
     A képek lustán töltődnek (a ház közelében, illetve a lecke megjelenésekor), legfeljebb ~14 dekódolt kép van a memóriában.
     ===================================================================================================== */
  const FOTO = (function () {
    const S = {}, M = { m: null, p: null }, MAXK = 14;
    const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
    function meta() { if (!M.p) M.p = fetch("kepek/forrasok.json?v=" + (window.ZEPHYR_BV || "0")).then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((m) => (M.m = m || {})); return M.p; }
    const ent = (id) => S[id] || (S[id] = { id, s: 0, img: null, cb: [], used: 0 });
    function fire(e) { const l = e.cb; e.cb = []; l.forEach((f) => { try { f(e.s === 2 ? e.img : null, e.id); } catch (x) { console.warn("fotó", e.id, x); } }); }
    function evict() { const ready = Object.keys(S).map((k) => S[k]).filter((e) => e.s === 2); if (ready.length <= MAXK) return; const now = performance.now(); ready.sort((a, b) => a.used - b.used);
      for (let i = 0; i < ready.length - MAXK; i++) { if (now - ready[i].used < 30000) break; ready[i].img = null; ready[i].s = 0; } }
    function load(e) { e.s = 1; meta().then((m) => { const q = m[e.id]; if (!q) { e.s = 3; fire(e); return; }
      const im = new Image(); im.decoding = "async"; const done = () => { e.img = im; e.s = 2; e.used = performance.now(); evict(); fire(e); };
      im.onload = () => { if (im.decode) im.decode().then(done, done); else done(); }; im.onerror = () => { e.s = 3; fire(e); };
      im.src = "kepek/" + e.id + ".jpg?h=" + hash(q.cim + "|" + q.w); }); }
    /* kérd a képeket (ismételt hívás olcsó) */
    function need(ids) { const now = performance.now(); ids.forEach((id) => { const e = ent(id); e.used = now; if (e.s === 0) load(e); }); }
    /* kész kép (vagy null); a használat időpontját frissíti */
    function img(id) { const e = S[id]; if (!e || e.s !== 2) return null; e.used = performance.now(); return e.img; }
    /* állapot: 0 nem kért, 1 töltődik, 2 kész, 3 hiba / nincs ilyen kép */
    const st = (id) => (S[id] ? S[id].s : 0);
    /* visszahívás, ha kész (azonnal, ha már kész; null-lal, ha nincs ilyen kép) */
    function then(id, f) { const e = ent(id); need([id]); if (e.s === 2) f(e.img, id); else if (e.s === 3) f(null, id); else e.cb.push(f); }
    /* visszahívás a kép megérkezésekor – a letöltést NEM indítja el (a falikép csak akkor tölt, ha a ház közelébe érsz) */
    function onready(id, f) { const e = ent(id); if (e.s === 2) f(e.img, id); else if (e.s === 3) f(null, id); else e.cb.push(f); }
    const info = (id) => (M.m && M.m[id]) || null;
    /* a szerző neve tisztán (zárójel, hivatkozás nélkül) és a licenc magyarul */
    function who(id) { const q = info(id); if (!q) return ""; let a = String(q.szerzo || "").replace(/\(.*$/, "").replace(/https?:\S+/g, "").replace(/\s+/g, " ").trim(); if (!a || /^no machine/i.test(a)) a = "ismeretlen szerző"; if (a.length > 26) a = a.slice(0, 25).trim() + "…"; return a; }
    function lic(id) { const q = info(id); if (!q) return ""; const l = String(q.licenc || ""); return /^public domain/i.test(l) ? "közkincs" : l; }
    /* a kép alá írt forrássor; ha g (a megfelelő betűvel) és maxW adott, a hosszú szerzőnevet rövidíti, hogy elférjen */
    const credit = (id, g, maxW) => { let a = who(id); if (!a) return ""; const l = lic(id), tx = () => "Fotó: " + a + " · " + l; if (g && maxW) while (g.measureText(tx()).width > maxW && a.length > 5) a = a.replace(/…$/, "").slice(0, -2) + "…"; return tx(); };
    /* fókuszpont (a kép melyik részét tartsa meg a vágás): azonosító → [x, y] törtekben; alapból a közepe */
    const FOC = {
      gulyas: [.5, .3], halaszle: [.5, .45], toltott: [.5, .55], dobos: [.45, .5], tokaji: [.5, .62], palinka: [.5, .45], rantott: [.4, .55], somloi: [.35, .42], pogacsa: [.45, .5], turoscsusza: [.5, .45], szalami: [.5, .5],
      /* természet: a fej / a fő alak maradjon a képen */
      szitakoto: [.26, .45], fogas: [.4, .5], harcsa: [.5, .4], angolna: [.45, .6], tihany: [.5, .56], bakcso: [.42, .5]
    };
    /* a képet kitöltve (vágva) rajzolja a téglalapba; o.z: nagyítás (1 = teljes kitöltés), o.fx/o.fy: fókuszpont */
    function cover(g, im, x, y, w, h, o) { o = o || {}; const fx = o.fx == null ? .5 : o.fx, fy = o.fy == null ? .5 : o.fy, z = Math.max(1, o.z || 1), iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
      let sw = iw, sh = ih; if (iw / ih > w / h) sw = ih * w / h; else sh = iw * h / w; sw /= z; sh /= z;
      const sx = Math.max(0, Math.min(iw - sw, fx * iw - sw / 2)), sy = Math.max(0, Math.min(ih - sh, fy * ih - sh / 2)); g.drawImage(im, sx, sy, sw, sh, x, y, w, h); }
    function covId(g, id, x, y, w, h, o) { const im = img(id); if (!im) return false; const f = FOC[id] || [.5, .5]; cover(g, im, x, y, w, h, Object.assign({ fx: f[0], fy: f[1] }, o || {})); return true; }
    /* ---- lecke-ábra fotókkal: a rajzolt ábra marad tartaléknak ---- */
    const LAY = { 1: [[0, 0, 300, 190]], 2: [[0, 0, 148, 190], [152, 0, 148, 190]], 3: [[0, 0, 176, 190], [180, 0, 120, 93], [180, 97, 120, 93]], 4: [[0, 0, 148, 93], [152, 0, 148, 93], [0, 97, 148, 93], [152, 97, 148, 93]] };
    function chip(g, txt, x, y, fs) { g.font = `800 ${fs}px ${UIF}`; const w = g.measureText(txt).width + fs * 1.1, h = fs * 1.55; g.fillStyle = "rgba(20,12,4,.62)"; uiRR(g, x, y - h, w, h, h / 2); g.fill(); g.fillStyle = "#fff6dc"; g.textAlign = "left"; g.fillText(txt, x + fs * .55, y - h * .3); }
    function lesson(oldD, spec) { const ids = spec.ids, cap = spec.cap || [];
      return function (g, t) { need(ids); const ready = ids.filter((id) => st(id) === 2), busy = ids.some((id) => st(id) === 0 || st(id) === 1);
        if (!ready.length || busy) return oldD(g, t);
        const lay = LAY[Math.min(4, ready.length)], k = Math.min(1, t / 30), z = 1 + .07 * (k * (2 - k));
        g.fillStyle = "#1b1209"; g.fillRect(0, 0, 300, 190);
        ready.forEach((id, i) => { const r = lay[i]; g.save(); g.beginPath(); g.rect(r[0], r[1], r[2], r[3]); g.clip(); covId(g, id, r[0], r[1], r[2], r[3], { z }); g.restore();
          const gr = g.createLinearGradient(0, r[1] + r[3] - 46, 0, r[1] + r[3]); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.55)"); g.fillStyle = gr; g.fillRect(r[0], r[1] + r[3] - 46, r[2], 46);
          const c = cap[ids.indexOf(id)]; if (c) chip(g, c, r[0] + 6, r[1] + r[3] - 14, ready.length === 1 ? 13 : 9.5);
          g.font = `600 ${ready.length === 1 ? 6.2 : 5.4}px ${UIF}`; const cr = credit(id, g, r[2] - 12); if (cr) { g.textAlign = "right"; g.fillStyle = "rgba(0,0,0,.65)"; g.fillText(cr, r[0] + r[2] - 4.6, r[1] + r[3] - 3.6); g.fillStyle = "rgba(255,255,255,.92)"; g.fillText(cr, r[0] + r[2] - 5, r[1] + r[3] - 4); g.textAlign = "left"; } }); }; }
    /* a lista adott elemeinek ábráját (cím szerint) a fotós változatra cseréli: specs = { "lecke címe": { ids: [...], cap: [...] } } */
    function lessons(arr, specs) { arr.forEach((L) => { const sp = specs[L.t]; if (sp) { L.d = lesson(L.d, sp); L.ph = sp.ids; } }); }
    /* ---- falra akasztott, keretezett fotó (a kép a ház közelében töltődik; addig papírszínű, feliratos hely) ---- */
    function paintFrame(g, w, hh, cap, id, im) { g.fillStyle = "#f4ecd7"; g.fillRect(0, 0, w, hh); g.strokeStyle = "rgba(120,90,50,.35)"; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, hh - 12);
      const pad = Math.round(w * .045), ph = hh - pad - Math.round(w * .13);
      if (im) { g.save(); g.beginPath(); g.rect(pad, pad, w - 2 * pad, ph); g.clip(); const f = FOC[id] || [.5, .5]; cover(g, im, pad, pad, w - 2 * pad, ph, { fx: f[0], fy: f[1] }); g.restore(); g.strokeStyle = "rgba(60,40,20,.55)"; g.lineWidth = 2; g.strokeRect(pad, pad, w - 2 * pad, ph); }
      else { const gr = g.createLinearGradient(0, pad, 0, pad + ph); gr.addColorStop(0, "#d9c9a3"); gr.addColorStop(1, "#bfa77a"); g.fillStyle = gr; g.fillRect(pad, pad, w - 2 * pad, ph); }
      g.textAlign = "center"; g.fillStyle = "#3a2614"; let fs = Math.round(w * .066); g.font = `800 ${fs}px ${UIF}`; while (g.measureText(cap).width > w - 2 * pad && fs > 12) { fs -= 2; g.font = `800 ${fs}px ${UIF}`; } g.fillText(cap, w / 2, hh - Math.round(w * .066));
      g.font = `600 ${Math.round(w * .033)}px ${UIF}`; const cr = im ? credit(id, g, w - 2 * pad) : ""; if (cr) { g.fillStyle = "#7a6648"; g.fillText(cr, w / 2, hh - Math.round(w * .02)); } }
    function frameTex(id, cap, w, h) { const PW = 512, PHh = Math.round(PW * h / w); const t = canvasTex(PW, PHh, (g) => paintFrame(g, PW, PHh, cap, id, null));
      onready(id, (im) => { if (!im) return; try { paintFrame(t._canvas.getContext("2d"), PW, PHh, cap, id, im); t.needsUpdate = true; } catch (e) { console.warn("keret", id, e); } }); return t; }
    /* a keretek és a „Képek forrása” tábla anyagai közösek (összevonhatók) */
    const FW = { m: null };
    function frame(G, h, id, cap, x, y, z, ry, w, hh) { if (!FW.m) FW.m = std({ color: "#4a2e18", roughness: .7 });
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; G.add(g); const fw = .04, d = .05;
      /* a papír (a képpel) és a fakeret */
      const pl = mesh(new THREE.PlaneGeometry(w, hh).translate(0, 0, d / 2 + .002), basic({ map: frameTex(id, cap, w, hh) }), g); pl.userData.noMerge = true;
      mesh(mergeGeoms([[new THREE.BoxGeometry(w + 2 * fw, fw, d), M4(0, hh / 2 + fw / 2, 0)], [new THREE.BoxGeometry(w + 2 * fw, fw, d), M4(0, -hh / 2 - fw / 2, 0)], [new THREE.BoxGeometry(fw, hh, d), M4(-w / 2 - fw / 2, 0, 0)], [new THREE.BoxGeometry(fw, hh, d), M4(w / 2 + fw / 2, 0, 0)]]), FW.m, g);
      (h.phIds = h.phIds || []).push(id); return g; }
    /* „Képek forrása” tábla: a ház fotóinak szerzője és licence */
    function creditBoard(G, h, title, ents, x, y, z, ry, w, cols) { cols = cols || 1; const rows = Math.ceil(ents.length / cols), PW = cols === 1 ? 1024 : 684 * cols, lh = 27, top = cols === 1 ? 158 : 146, PHh = top - 8 + rows * lh + 48, hh = w * PHh / PW, cw = PW / cols;
      const paint = (g) => { g.fillStyle = "#2a1c10"; g.fillRect(0, 0, PW, PHh); g.strokeStyle = "#c9a23a"; g.lineWidth = 6; g.strokeRect(10, 10, PW - 20, PHh - 20); g.textAlign = "center"; g.fillStyle = "#ffd98a"; g.font = `900 ${cols === 1 ? 46 : 42}px ${UIF}`; g.fillText(title, PW / 2, cols === 1 ? 78 : 70);
        g.fillStyle = "rgba(255,243,214,.8)"; g.font = `600 22px ${UIF}`; g.fillText("Szabad licencű fotók a Wikimedia Commonsból · a képeket átméreteztük és kivágtuk", PW / 2, cols === 1 ? 116 : 106); g.textAlign = "left";
        ents.forEach(([id, nev], i) => { const q = info(id), c = Math.floor(i / rows), r = i % rows, x0 = c * cw + (cols === 1 ? 40 : 38), y0 = top + r * lh; g.font = `700 21px ${UIF}`; g.fillStyle = "#ffd98a"; g.fillText(nev, x0, y0); g.font = `500 ${cols === 1 ? 20 : 19}px ${UIF}`; g.fillStyle = "#f4ead2"; g.fillText(q ? who(id) + " · " + lic(id) : "…", x0 + (cols === 1 ? 290 : 196), y0); }); };
      const t = canvasTex(PW, PHh, paint); const m = mesh(new THREE.PlaneGeometry(w, hh), basic({ map: t }), G); m.position.set(x, y, z); m.rotation.y = ry; m.userData.noMerge = true;
      meta().then(() => { try { paint(t._canvas.getContext("2d")); t.needsUpdate = true; } catch (e) {} }); (h.phIds = h.phIds || []); return m; }
    return { need, img, st, then, onready, meta, info, who, lic, credit, cover, covId, lesson, lessons, frame, frameTex, creditBoard, FOC, LAY };
  })();
