
  /* ------------------------------------------------------------------ fények */
  function addLights(sunDir, soft) {
    const hemi = new THREE.HemisphereLight(0xd6e6f5, 0x4a5a48, soft ? 1.0 : .62);
    const sun = new THREE.DirectionalLight(0xfff0d8, soft ? 1.3 : 1.55); sun.position.copy(sunDir).multiplyScalar(100);
    const amb = new THREE.AmbientLight(0xffffff, soft ? .25 : .06);
    W.root.add(hemi, sun, amb); return { hemi, sun, amb };
  }
  /* a nézési irány beállítása (radián; 0 = −z felé) – VR-ben a fej aktuális irányához igazítva */
  function faceYaw(target) {
    const rig = T.rig; if (!rig) return;
    const lc = T.cam.components["look-controls"];
    if (!T.inVR) { if (lc && lc.yawObject) { lc.yawObject.rotation.y = 0; lc.pitchObject.rotation.x = 0; } rig.object3D.rotation.y = target; return; }
    rig.object3D.rotation.y += wrapA(target - T.camYaw());
  }

  /* ------------------------------------------------------------------ VR-PANEL (vászon-textúra; kéz/kontroller sugarával kezelhető) */
  const PW = 1100, PH = 760;
  function makePanel() {
    /* 2026-11-12 01:43 (tulajdonos: a Quest ablaka „bárhonnan nézem, mindig éles… nálad ez nagyon rosszul kidolgozott”): a panel vászna KÉTSZERES felbontású
       (2200×1520), a legerősebb szűréssel – közelről és ferdén nézve is éles marad a szöveg. */
    const PSS = 2, cv = document.createElement("canvas"); cv.width = PW * PSS; cv.height = PH * PSS;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; try { tex.anisotropy = T.sceneEl.renderer.capabilities.getMaxAnisotropy(); } catch (e) { tex.anisotropy = 8; } W.disposables.push(tex);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.78, .78 * PH / PW), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    W.disposables.push(m.geometry, m.material); m.renderOrder = 995;
    const P = { m, cv, tex, btns: [], hov: -1, uv: null };
    m.userData.xr = {
      hover: (on, h) => { P.uv = on && h && h.uv ? h.uv : null; },
      move: (h) => { P.uv = h && h.uv ? h.uv : null; },
      click: (h) => { if (!h || !h.uv) return; const x = h.uv.x * PW, y = (1 - h.uv.y) * PH; const b = P.btns.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); if (b) { b.fn(); P.draw(); } },
      /* ÁTHELYEZÉS (2026. nov. 9., a tulajdonos kérése: „mindig útban van”): a panel fejlécét megfogva (csippentve) bárhová húzható a térben;
         a kéz előre-hátra mozdításával közelebb/távolabb tolható; elengedve ott marad, és a helyét világonként megjegyzi. */
      down: (h, S0, key, bar) => { if (!S0 || !S0.o) return; if (!bar) { if (!h || !h.uv) return; const x = h.uv.x * PW, y = (1 - h.uv.y) * PH; if (y > 165 || x > PW - 250) return; }
        /* 2026-11-11 18:54 (tulajdonos: „a csippentés pillanatában eltávolodik tőlem, nem abból az állásból indul, ahol van”): a fogás a kéz PILLANATNYI sugarához
           képest rögzül (nem a korábbi találati ponthoz), a dőlése megmarad, és a kéz előre-hátra mozgása csak 5 cm holtjáték után, szelídebben (×2) tol rajta. */
        const head = T.headPos ? T.headPos() : null, dist0 = S0.d ? Math.max(.15, P.m.position.clone().sub(S0.o).dot(S0.d)) : h.distance, hp = S0.d ? S0.o.clone().addScaledVector(S0.d, dist0) : h.point.clone();
        P.drag = { key, dist: dist0, off: P.m.position.clone().sub(hp), hd0: head ? S0.o.distanceTo(head) : 0, tilt: P.m.rotation.x, t0: performance.now(), sc0: P.m.scale.x };
        if (T.xr.press) T.xr.press[key] = null; try { T.xr.pulse && T.xr.pulse(key, .4, 20); } catch (e) {} },
      drag: (S0, key) => { const D = P.drag; if (!D || D.key !== key || !S0 || !S0.o || !S0.d) return; const head = T.headPos ? T.headPos() : null;
        let dh = head ? S0.o.distanceTo(head) - D.hd0 : 0; if (performance.now() - D.t0 < 350) { D.hd0 += dh; dh = 0; }   /* a csippentés első pillanatának kézrándulása nem számít */
        dh = Math.abs(dh) < .03 ? 0 : (dh - Math.sign(dh) * .03) * 3.2;   /* a kéz előre-hátra mozdulata felnagyítva – egészen közel húzható, messzire tolható (mint a Quest ablakai) */
        const dist = clamp(D.dist + dh, .22, 5); const tgt = S0.o.clone().addScaledVector(S0.d, dist).add(D.off);
        /* távolabb tolva a panel NŐ (a betűk is), közelebb húzva kisebb lesz – így bármilyen távolságban olvasható marad, mint a Quest ablakai */
        { const sc = clamp(D.sc0 * Math.pow(dist / Math.max(.15, D.dist), .8), .45, 6); P.m.scale.setScalar(P.m.scale.x + (sc - P.m.scale.x) * .5); }
        P.m.position.lerp(tgt, .5); if (head) { const dx = P.m.position.x - head.x, dz = P.m.position.z - head.z; P.m.rotation.set(D.tilt, Math.atan2(-dx, -dz), 0, "YXZ"); } },
      up: () => { if (!P.drag) return; P.drag = null; W.panelPos = W.panelPos || {};
        /* a fejhez (és a nézési irányhoz) képest jegyezzük meg – így akkor is jó helyre kerül, ha közben a hajó / a nézőpont elmozdult */
        const head = (T.headPos && T.headPos()) || new THREE.Vector3(0, T.headY(), 0), yaw = T.camYaw(), d = P.m.position.clone().sub(head).applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
        W.panelPos[W.kind] = { rel: d.toArray(), r: wrapA(P.m.rotation.y - yaw), t: P.m.rotation.x, s: P.m.scale.x };
        try { localStorage.setItem("zephyr-panelpos2", JSON.stringify(W.panelPos)); } catch (e) {} }
    };
    T.xr.extra.add(m);
    /* összecsukott állapot: kis fül, rámutatva/csippentve újra kinyílik */
    { const pc = document.createElement("canvas"); pc.width = 420; pc.height = 120; const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace; W.disposables.push(pt);
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(.21, .06), new THREE.MeshBasicMaterial({ map: pt, transparent: true, depthTest: false, depthWrite: false })); pm.renderOrder = 995; W.disposables.push(pm.geometry, pm.material);
      const pd = (hv) => { const g = pc.getContext("2d"); g.clearRect(0, 0, 420, 120); g.beginPath(); g.roundRect ? g.roundRect(4, 4, 412, 112, 56) : g.rect(4, 4, 412, 112); g.fillStyle = hv ? "#ffe08a" : "rgba(7,28,58,.9)"; g.fill(); g.lineWidth = 5; g.strokeStyle = "rgba(255,209,102,.9)"; g.stroke();
        g.fillStyle = hv ? "#0b2f5e" : "#fff"; g.font = "800 50px Inter, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("☰ Panel", 210, 62); pt.needsUpdate = true; };
      pd(false); pm.visible = false;
      pm.userData.xr = { hover: (on) => pd(on), click: () => { W.togglePanel(); pd(false); } };
      P.pill = pm; }
    /* 2026-11-12 01:37 – FOGÓSÁV a panel alatt, a Quest saját ablakaihoz hasonlóan (tulajdonos: „mutatom, hogy működik itt a menü, amikor megfogom és elmozdítom a térben –
       le tudnád ugyanígy modellezni a saját oldalunkra?”): kis fehér sáv a panel alatt; rámutatva kifényesedik és megnő; rácsippentve és tartva a panel a kéz sugarát követi
       (ugyanabban a távolságban, mindig feléd fordulva), a kéz előre-hátra mozdítása közelebb/távolabb viszi; elengedve ott marad, és megjegyzi a helyét. */
    { const hh = .78 * PH / PW, bg = new THREE.PlaneGeometry(.2, .016), bm = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: .6, depthTest: false, depthWrite: false }), hg = new THREE.PlaneGeometry(.34, .09), hm = new THREE.MeshBasicMaterial({ visible: false });
      W.disposables.push(bg, bm, hg, hm); const bar = new THREE.Mesh(bg, bm), hit = new THREE.Mesh(hg, hm); bar.renderOrder = 996; bar.position.set(0, -hh / 2 - .04, .002); hit.position.copy(bar.position); m.add(bar); m.add(hit); P.bar = bar; P.barHit = hit;
      hit.userData.xr = { hover: (on) => { P.barHov = !!on; }, down: (h, S0, key) => m.userData.xr.down(h, S0, key, true), drag: (S0, key) => m.userData.xr.drag(S0, key), up: () => m.userData.xr.up() };
      W.upd.push((dt) => { const t = P.drag ? 1 : P.barHov ? .7 : 0; bar.material.opacity += ((.55 + .45 * t) - bar.material.opacity) * Math.min(1, dt * 10); const sx = 1 + .35 * t; bar.scale.x += (sx - bar.scale.x) * Math.min(1, dt * 10); bar.scale.y = 1 + .5 * t;
        /* 2026-11-12 01:41 – a tulajdonos bemutatóján (Quest-közvetítés) LÁTTAM: megfogás közben a Quest ablaka ÁTTETSZŐVÉ válik (látszik mögötte a tér), minden irányba
           követi a kezet, egészen közel húzható és messzire tolható, közben feléd fordul; elengedve újra tömör lesz, és ott marad. Ugyanez itt: */
        { const o = P.drag ? .3 : 1; m.material.opacity += (o - m.material.opacity) * Math.min(1, dt * 9); }
        bar.material.color.set(P.drag ? "#e4bb63" : "#ffffff"); if (T.inVR && m.parent && !W.panelHidden) T.xr.extra.add(hit); else T.xr.extra.delete(hit); }); }
    P.draw = () => {
      const g = cv.getContext("2d"); g.setTransform(PSS, 0, 0, PSS, 0, 0); P.btns = []; g.clearRect(0, 0, PW, PH);
      const bg = g.createLinearGradient(0, 0, 0, PH); bg.addColorStop(0, "rgba(16,42,68,.97)"); bg.addColorStop(1, "rgba(7,24,44,.97)");   /* VR 2.0 „Nautical Glass” */
      g.beginPath(); g.roundRect ? g.roundRect(5, 5, PW - 10, PH - 10, 40) : g.rect(5, 5, PW - 10, PH - 10); g.fillStyle = bg; g.fill(); g.lineWidth = 2.5; g.strokeStyle = "rgba(221,232,242,.30)"; g.stroke();
      let rowY = 0;
      /* hosszú szöveg: a betűméret addig csökken, amíg ki nem fér (ne lógjon ki a panelből) */
      const fitFont = (wt, fs, min, t, maxW) => { g.font = `${wt} ${fs}px Inter, system-ui, sans-serif`; while (fs > min && g.measureText(t).width > maxW) { fs -= 2; g.font = `${wt} ${fs}px Inter, system-ui, sans-serif`; } };
      const api = {
        title(t, s) { g.fillStyle = "#E4BB63"; g.textAlign = "left"; g.textBaseline = "middle"; fitFont(750, 48, 32, t, PW - 200); g.fillText(t, 44, 66); g.fillStyle = "#fff"; fitFont(600, 34, 22, s || "", PW - 88); g.fillText(s || "", 44, 122); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(40, 158, PW - 80, 2); },
        row(i, t, c, r) { const y = 210 + i * 66; g.fillStyle = c || "#fff"; g.beginPath(); g.arc(58, y, 11, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.textAlign = "left"; fitFont(600, 36, 22, t, PW - 84 - (r ? 220 : 44)); g.fillText(t, 84, y); if (r) { g.textAlign = "right"; g.fillStyle = "#7fd3ff"; g.fillText(r, PW - 50, y); } rowY = y; },
        buttons(list, row) {
          const n = list.length, gap = 16, w = (PW - 80 - gap * (n - 1)) / n, y = PH - 150 - (row || 0) * 126, h = 110;
          list.forEach(([lbl, fn, on], i) => {
            const x = 40 + i * (w + gap), k = P.btns.length, hov = k === P.hov; P.btns.push({ x, y, w, h, fn });
            g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 14; g.shadowOffsetY = 5;
            g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 26) : g.rect(x, y, w, h);
            const gr = g.createLinearGradient(0, y, 0, y + h);
            if (on) { gr.addColorStop(0, hov ? "#F0CC7A" : "#E4BB63"); gr.addColorStop(1, hov ? "#E4BB63" : "#D4A13A"); } else if (hov) { gr.addColorStop(0, "rgba(40,78,118,.98)"); gr.addColorStop(1, "rgba(28,60,96,.98)"); } else { gr.addColorStop(0, "rgba(20,48,78,.94)"); gr.addColorStop(1, "rgba(14,38,64,.94)"); }
            g.fillStyle = gr; g.fill(); g.restore();
            g.lineWidth = hov ? 5 : 2; g.strokeStyle = hov ? (on ? "#fff" : "#D4A13A") : on ? "rgba(255,255,255,.4)" : "rgba(221,232,242,.24)"; g.stroke();
            /* ha a felirat ikonnal kezdődik („🐟 Merülés”), az ikon nagyobban, fölötte */
            const m = /^(\S{1,3})\s+(.+)$/.exec(lbl), icon = m && !/[A-Za-zÁ-ű0-9]/.test(m[1]) ? m[1] : null, txt = icon ? m[2] : lbl;
            g.fillStyle = on ? "#07182C" : "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
            if (icon) { g.font = "800 40px Inter, system-ui, sans-serif"; g.fillText(icon, x + w / 2, y + h * .34); g.font = `700 ${txt.length > 12 || n > 5 ? 25 : 30}px Inter, system-ui, sans-serif`; g.fillText(txt, x + w / 2, y + h * .74); }
            else { g.font = `700 ${lbl.length > 14 || n > 5 ? 28 : 38}px Inter, system-ui, sans-serif`; g.fillText(lbl, x + w / 2, y + h / 2 + 2); }
          });
        }
      };
      if (W.spec && W.spec.panel) W.spec.panel(api);
      /* fogantyú-jel a fejléc tetején (itt fogd meg a húzáshoz) és „⟲ ide” gomb (visszahívja magad elé) */
      { g.fillStyle = "rgba(255,255,255,.55)"; for (let k = 0; k < 6; k++) for (let r2 = 0; r2 < 2; r2++) { g.beginPath(); g.arc(PW / 2 - 50 + k * 20, 20 + r2 * 14, 4.5, 0, TAU); g.fill(); }
        const x = PW - 240, y = 22, w = 96, h = 78, k = P.btns.length, hov = k === P.hov; P.btns.push({ x, y, w, h, fn: () => { if (W.panelPos) delete W.panelPos[W.kind]; try { localStorage.setItem("zephyr-panelpos2", JSON.stringify(W.panelPos || {})); } catch (e) {} placePanel(true); } });
        g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 22) : g.rect(x, y, w, h); g.fillStyle = hov ? "#ffe08a" : "rgba(255,255,255,.14)"; g.fill(); g.lineWidth = 2; g.strokeStyle = "rgba(255,255,255,.4)"; g.stroke();
        g.fillStyle = hov ? "#0b2f5e" : "#fff"; g.font = "800 44px Inter, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("⟲", x + w / 2, y + h / 2 + 2); }
      /* összecsukó gomb a jobb felső sarokban – a panel egy kis „☰ Panel” fülre zsugorodik */
      { const x = PW - 132, y = 22, w = 96, h = 78, k = P.btns.length, hov = k === P.hov; P.btns.push({ x, y, w, h, fn: () => W.togglePanel() });
        g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 22) : g.rect(x, y, w, h); g.fillStyle = hov ? "#ffe08a" : "rgba(255,255,255,.14)"; g.fill(); g.lineWidth = 2; g.strokeStyle = "rgba(255,255,255,.4)"; g.stroke();
        g.fillStyle = hov ? "#0b2f5e" : "#fff"; g.fillRect(x + 26, y + h / 2 + 8, w - 52, 9); }
      tex.needsUpdate = true;
    };
    P.tick = (dt) => {
      const hv = P.uv ? P.btns.findIndex((q) => { const x = P.uv.x * PW, y = (1 - P.uv.y) * PH; return x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h; }) : -1;
      if (hv !== P.hov) { P.hov = hv; P.draw(); }
      if ((W.panelDirty || 0) > .5) { W.panelDirty = 0; P.draw(); }
    };
    return P;
  }
  function placePill() {
    const P = W.panel; if (!P || !P.pill) return;
    if (!P.m.parent) placePanel();
    T.xr.extra.add(P.pill); P.pill.position.copy(P.m.position); P.pill.quaternion.copy(P.m.quaternion); P.pill.translateX(-.27); P.pill.translateY(.2);
    if (!P.pill.parent) T.sceneEl.object3D.add(P.pill);
  }
  function placePanel(fresh) {
    const P = W.panel; if (!P) return;
    if (!W.panelPos) { try { W.panelPos = JSON.parse(localStorage.getItem("zephyr-panelpos2") || "{}"); } catch (e) { W.panelPos = {}; } }
    const saved = !fresh && W.panelPos[W.kind];
    if (saved && saved.rel) { const head = (T.headPos && T.headPos()) || new THREE.Vector3(0, T.headY(), 0), yaw = T.camYaw();
      P.m.position.copy(head).add(new THREE.Vector3().fromArray(saved.rel).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)); P.m.rotation.set(typeof saved.t === "number" ? saved.t : -.15, saved.r + yaw, 0, "YXZ"); P.m.scale.setScalar(typeof saved.s === "number" ? clamp(saved.s, .45, 6) : 1); T.sceneEl.object3D.add(P.m); return; }
    const yaw = T.camYaw(), hy = T.headY();
    let a = yaw + (W.kind === "maquette" ? .62 : .55), d = W.kind === "sail" ? .85 : 1.05, y = hy - .25;
    if (W.kind === "chess") { a = yaw + .62; d = 1.0; y = hy - .3; }
    if (W.kind === "sail") { a = yaw + .62; y = hy - .38; }
    if (W.kind === "race") { a = yaw - .75; d = 1.1; y = hy - .15; }   /* a verseny panelje balra-előre, hogy a kormány és az orr szabad maradjon */
    /* 2026-11-11 10:51 TULAJDONOS: „VR-ben is állítsd vissza az alsó menüsort, mert mindig az a nagyon ronda jobb oldali menüsor van.” →
       a világok menüje VR-ben ALUL, középen van (mint a 2D-s alsó gombsor): a látómező alatt, pultszerűen megdöntve – előre nézve nem takar, lenézve kéznél van. */
    let tilt = -.2;
    if (W.kind !== "race") { a = yaw; d = .62; y = hy - .56; tilt = -.82; }
    P.m.position.set(-Math.sin(a) * d, y, -Math.cos(a) * d);
    P.m.rotation.set(tilt, a, 0, "YXZ");
    P.m.scale.setScalar(1);
    T.sceneEl.object3D.add(P.m);
  }

  /* ------------------------------------------------------------------ 2D KEZELŐFELÜLET (nagy betűk, nagy gombok) */
  function makeHud() {
    let el = document.getElementById("worldHud"); if (el) el.remove();
    el = document.createElement("div"); el.id = "worldHud";
    el.innerHTML = `<style>
      #worldHud{position:fixed;inset:0;pointer-events:none;z-index:70;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff}
      #worldHud .wh-top{position:absolute;left:max(16px,env(safe-area-inset-left));right:max(16px,env(safe-area-inset-right));top:calc(14px + env(safe-area-inset-top));display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}
      #worldHud .wh-back{pointer-events:auto;font:800 19px/1 inherit;padding:14px 20px;border-radius:999px;border:2px solid rgba(255,209,102,.9);background:linear-gradient(180deg,rgba(20,64,118,.95),rgba(9,34,70,.95));color:#fff;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.35)}
      #worldHud .wh-card{pointer-events:auto;padding:12px 18px;border-radius:20px;background:rgba(7,28,58,.82);border:1.5px solid rgba(255,255,255,.22);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);max-width:min(560px,100%)}
      #worldHud .wh-t{font:800 21px/1.25 inherit;color:#ffd166} #worldHud .wh-s{font:600 17px/1.35 inherit;margin-top:3px}
      #worldHud .wh-list{margin:8px 0 0;padding:0;list-style:none;font:600 16px/1.5 inherit;opacity:.95}
      #worldHud .wh-bot{position:absolute;left:0;right:0;bottom:calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 16px}
      #worldHud .wh-btns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
      #worldHud .wh-b{pointer-events:auto;font:800 18px/1 inherit;min-width:64px;padding:14px 18px;border-radius:16px;border:1.5px solid rgba(255,255,255,.35);background:rgba(7,28,58,.82);color:#fff;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}
      #worldHud .wh-b:active,#worldHud .wh-b.on{background:#ffd166;color:#0b2f5e;border-color:#ffd166}
      #worldHud .wh-steer .wh-b{min-width:110px;padding:20px 22px;font-size:26px}
      #worldHud .wh-steer .wh-b.wh-x{min-width:0;padding:14px 16px;font-size:16px}
      @media (max-width:600px){#worldHud .wh-steer .wh-b{min-width:64px;padding:14px 14px;font-size:20px}#worldHud .wh-steer .wh-b.wh-x{font-size:14px;padding:12px 10px}}
      #worldHud .wh-hint{font:600 15px/1.4 inherit;background:rgba(7,28,58,.7);padding:8px 14px;border-radius:12px;text-align:center}
      @media (max-width:600px){#worldHud .wh-t{font-size:19px}#worldHud .wh-s{font-size:16px}}
      #worldHud .wh-tog{pointer-events:auto;font:800 17px/1 inherit;padding:12px 18px;border-radius:999px;border:2px solid rgba(255,209,102,.9);background:rgba(7,28,58,.88);color:#ffd166;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35)}
      #worldHud.wh-min .wh-card,#worldHud.wh-min .wh-hint,#worldHud.wh-min .wh-btns:not(.wh-steer){display:none}
      @media (max-width:700px),(max-height:520px){#worldHud .wh-btns{gap:7px;max-height:38vh;overflow-y:auto;pointer-events:auto;-webkit-overflow-scrolling:touch}#worldHud .wh-b{font-size:15px;padding:10px 12px;min-width:0;border-radius:13px}#worldHud .wh-hint{font-size:13px;padding:6px 10px}#worldHud .wh-card{padding:9px 13px}#worldHud .wh-back{font-size:16px;padding:11px 15px}}
    </style><div class="wh-top"><button type="button" class="wh-back">‹ Vissza a sétához</button><div class="wh-card"><div class="wh-t"></div><div class="wh-s"></div><ul class="wh-list"></ul></div></div>
    <div class="wh-bot"><button type="button" class="wh-tog"></button><div class="wh-btns"></div><div class="wh-hint"></div></div>`;
    document.body.appendChild(el);
    el.querySelector(".wh-back").addEventListener("click", () => W.close());
    /* összecsukható menü (mobilon alapból összecsukva, hogy a jelenet látsszon); az állapotot megjegyezzük */
    { const tog = el.querySelector(".wh-tog"); let min; try { min = localStorage.getItem("zephyr-hud-min"); } catch (e) {}
      min = min == null ? (innerWidth < 700 || innerHeight < 520) : min === "1";
      const upd = () => { el.classList.toggle("wh-min", min); tog.textContent = min ? "☰ Menü" : "▾ Menü elrejtése"; };
      tog.addEventListener("click", () => { min = !min; try { localStorage.setItem("zephyr-hud-min", min ? "1" : "0"); } catch (e) {} upd(); }); upd(); }
    let lastBtns = "";
    const H = {
      el,
      draw() {
        const api = {
          title(t, s) { el.querySelector(".wh-t").textContent = t; el.querySelector(".wh-s").textContent = s || ""; },
          list(a) { el.querySelector(".wh-list").innerHTML = a.map((x) => `<li>${x}</li>`).join(""); },
          hint(t) { el.querySelector(".wh-hint").textContent = t; },
          buttons(list) {
            const key = list.map((x) => x[0] + (x[2] ? "*" : "")).join("|"); if (key === lastBtns) return; lastBtns = key;
            const box = el.querySelector(".wh-btns"); box.className = "wh-btns"; box.innerHTML = "";
            list.forEach(([lbl, fn, on]) => { const b = document.createElement("button"); b.type = "button"; b.className = "wh-b" + (on ? " on" : ""); b.textContent = lbl; b.addEventListener("click", () => { fn(); H.draw(); }); box.appendChild(b); });
          },
          steer(extra, onCenter) {   /* extra: további gombok a kormány mellé ([felirat, függvény]); onCenter: az „egyenesbe” saját kezelője */
            const key = "steer|" + (extra || []).map((x) => x[0]).join("|"); if (lastBtns === key) return; lastBtns = key;
            const box = el.querySelector(".wh-btns"); box.className = "wh-btns wh-steer"; box.innerHTML = "";
            [["◀", "L"], ["egyenesbe", "C"], ["▶", "R"]].forEach(([lbl, k]) => {
              const b = document.createElement("button"); b.type = "button"; b.className = "wh-b"; b.textContent = lbl;
              if (k === "C") b.addEventListener("click", () => { if (onCenter) onCenter(); else SAIL.del = 0; });
              else { const on = (v) => (e) => { e.preventDefault(); SAIL.keys[k] = v; b.classList.toggle("on", v); };
                b.addEventListener("pointerdown", on(true)); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, on(false))); }
              box.appendChild(b);
            });
            (extra || []).forEach(([lbl, fn]) => { const b = document.createElement("button"); b.type = "button"; b.className = "wh-b wh-x"; b.textContent = lbl; b.addEventListener("click", () => { fn(); lastBtns = ""; H.draw(); }); box.appendChild(b); });
          }
        };
        if (W.spec && W.spec.hud) W.spec.hud(api);
      }
    };
    return H;
  }

  /* ------------------------------------------------------------------ 2D egér / ujj: rámutatás és kattintás a 3D tárgyakon */
  const P2 = { down: null, hov: null };
  const ray2 = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick2D(e) {
    const cvs = T.sceneEl.canvas; const r = cvs.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray2.setFromCamera(ndc, T.camObj());
    const shown = (o) => { for (let q = o; q; q = q.parent) if (q.visible === false && !(q.material && q.material.visible === false && q === o)) return false; return !!o.parent; };
    const objs = W.objs.filter(shown);
    const hits = ray2.intersectObjects(objs, false);
    return hits[0] || null;
  }
  function on2DMove(e) { if (T.inVR || !W.active) return; const h = pick2D(e), o = h && h.object; if (o !== P2.hov) { if (P2.hov && P2.hov.userData.xr.hover) P2.hov.userData.xr.hover(false); P2.hov = o; if (o && o.userData.xr.hover) o.userData.xr.hover(true, h); T.sceneEl.canvas.style.cursor = o ? "pointer" : ""; } }
  function on2DDown(e) { P2.down = { x: e.clientX, y: e.clientY, t: performance.now() }; }
  function on2DUp(e) {
    if (!P2.down || T.inVR || !W.active) return; const d = Math.hypot(e.clientX - P2.down.x, e.clientY - P2.down.y); P2.down = null;
    if (d > 8) return;
    const h = pick2D(e); if (h && h.object.userData.xr.click) h.object.userData.xr.click(h);
  }
  function onKey(e, v) {
    if (!W.active || W.kind !== "sail") return;
    const k = e.key; if (k === "ArrowLeft" || k === "a" || k === "A") { SAIL.keys.L = v; e.preventDefault(); } if (k === "ArrowRight" || k === "d" || k === "D") { SAIL.keys.R = v; e.preventDefault(); }
  }
  const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false);

  /* ------------------------------------------------------------------ MEGNYITÁS / BEZÁRÁS */
  let saved = null;
  W.open = function (kind) {
    /* 2026-11-14: a vitorlásverseny a KIKÖTŐBEN kezdődik – a menüből indítva a kikötő nyílik; a kikötőből (és VR-váltáskor) közvetlenül a futam */
    if (kind === "race" && !W._raceGo && !W.raceDirect) kind = "harbor"; W._raceGo = false;
    if (W.active) W.close(null, true);
    const sky = T.sky, sm = sky && sky.getObject3D("mesh");
    const lc0 = T.cam.components["look-controls"];
    saved = { rigY: T.rig.object3D.rotation.y, pitch: lc0 && lc0.pitchObject ? lc0.pitchObject.rotation.x : 0, yaw: lc0 && lc0.yawObject ? lc0.yawObject.rotation.y : 0, skyVis: sky.object3D.visible, spotsVis: T.spots.object3D.visible, clip: T.sceneEl.renderer.localClippingEnabled, scene: T.current,
      skyDepth: sm ? sm.material.depthTest : true, skyOrder: sm ? sm.renderOrder : 0 };
    W.kind = kind; W.active = true; W.t = 0; W.upd = []; W.objs = []; W.disposables = [];
    /* mélységpontosság: a séta kamerája near=0,005 / far=10000 – ezzel a távoli part, hajók, fák „villognak” (z-fighting).
       A 3D világokban near=0,06, far=4000: a kéz és a kormány így is rendben látszik, a háttér pedig stabil. */
    { const ca = T.cam.getAttribute("camera") || {}; saved.camNear = ca.near != null ? ca.near : .005; saved.camFar = ca.far != null ? ca.far : 10000; T.cam.setAttribute("camera", { near: .06, far: 4000 }); const cm = T.sceneEl.camera; if (cm) { cm.near = .06; cm.far = 4000; cm.updateProjectionMatrix(); } }
    T.setBusy(true);
    const root = new THREE.Group(); root.name = "zephyr-world"; T.sceneEl.object3D.add(root); W.root = root;
    T.spots.object3D.visible = false; if (T.sky2) T.sky2.object3D.visible = false;
    const tok = W.gen = (W.gen || 0) + 1;
    const safe = (f) => { try { f(); } catch (e) { console.warn("world", e); W.close(); } };
    if (kind === "regatta") {
      const go = () => safe(() => {
        sky.object3D.visible = true; if (sm) { sm.material.depthTest = false; sm.material.depthWrite = false; sm.renderOrder = -100; sm.material.needsUpdate = true; }
        W.spec = buildRegatta(); finishOpen();
      });
      if (T.current !== "steg") { T.setBusy(false); T.go("steg"); setTimeout(() => { if (tok !== W.gen || !W.active) return; T.setBusy(true); T.spots.object3D.visible = false; go(); }, 1400); } else go();
      return;
    }
    sky.object3D.visible = false;
    safe(() => { W.spec = kind === "harbor" ? buildHarbor() : kind === "race" ? buildVRace() : kind === "coaster" || kind === "table" ? buildCoaster() : kind === "chess" ? lodBuild(buildChess) : kind === "sail" ? buildSail() : buildMaquette(); finishOpen(); });
  };
  /* 2026-11-11 TELEFONOS KÖNNYÍTÉS (a vitorlás sakk 865 ezer háromszöget rajzolt – ettől melegedett a telefon): telefonon (nem VR-ben) az építés idejére
     a gömbök, hengerek, tóruszok, kapszulák, kúpok, esztergált és cső-testek felbontását kb. a felére vesszük – a formák ugyanazok, csak kevesebb lapból.
     Kényszerítés teszthez: localStorage zephyr-lod = 1 (be) / 0 (ki). */
  function lodBuild(fn) {
    let on = false; try { const f = localStorage.getItem("zephyr-lod"); on = f === "1" || (f !== "0" && !T.inVR && document.documentElement.dataset.device === "phone"); } catch (e) {}
    if (!on) return fn();
    const R = (v, d, mn, k) => Math.max(mn, Math.round((v == null ? d : v) * (k || .5))), keep = {}, set = (n, f) => { keep[n] = THREE[n]; const O = THREE[n]; const N = function () { return f(O, Array.prototype.slice.call(arguments)); }; N.prototype = O.prototype; THREE[n] = N; };
    try {
      set("SphereGeometry", (O, a) => new O(a[0], R(a[1], 32, 7), R(a[2], 16, 5), a[3], a[4], a[5], a[6]));
      set("CylinderGeometry", (O, a) => new O(a[0], a[1], a[2], R(a[3], 32, 5), a[4] > 2 ? R(a[4], 1, 1) : a[4], a[5], a[6], a[7]));
      set("ConeGeometry", (O, a) => new O(a[0], a[1], R(a[2], 32, 5), a[3] > 2 ? R(a[3], 1, 1) : a[3], a[4], a[5], a[6]));
      set("TorusGeometry", (O, a) => new O(a[0], a[1], R(a[2], 12, 4), R(a[3], 48, 8), a[4]));
      set("CapsuleGeometry", (O, a) => new O(a[0], a[1], R(a[2], 4, 2), R(a[3], 8, 5)));
      set("LatheGeometry", (O, a) => new O(a[0], R(a[1], 12, 7), a[2], a[3]));
      set("TubeGeometry", (O, a) => new O(a[0], R(a[1], 64, 6, .6), a[2], R(a[3], 8, 3, .6), a[4]));
    } catch (e) { Object.keys(keep).forEach((n) => { try { THREE[n] = keep[n]; } catch (e2) {} }); return fn(); }
    W.lod = true; try { return fn(); } finally { W.lod = false; Object.keys(keep).forEach((n) => { try { THREE[n] = keep[n]; } catch (e2) {} }); }
  }
  function finishOpen() {
    document.body.classList.add("world-on");
    W.hud = makeHud(); W.hud.el.style.display = T.inVR ? "none" : ""; W.hud.draw();
    W.panel = makePanel(); W.panel.draw();
    if (T.inVR) { placePanel(); if (W.panelHidden) { T.xr.extra.delete(W.panel.m); placePill(); } }
    const cvs = T.sceneEl.canvas;
    cvs.addEventListener("pointermove", on2DMove); cvs.addEventListener("pointerdown", on2DDown); cvs.addEventListener("pointerup", on2DUp);
    addEventListener("keydown", kd); addEventListener("keyup", ku);
    W.hudT = 0;
  }
  W.tick = function (dt) {
    if (!W.active || !W.spec) return;
    W.t += dt;
    W.upd.forEach((f) => f(dt));
    W.spec.tick(dt);
    if (W.panel) { W.panel.m.visible = T.inVR && !W.panelHidden; if (W.panel.pill) { W.panel.pill.visible = false; T.xr.extra.delete(W.panel.pill); }   /* 2026-11-11 (tulajdonos): a bezárt menü után SEMMI nem marad a térben – a kis „Menü” fül megszűnt; visszahozás: tenyérmozdulat, csuklóóra vagy lenézve az öv-gomb */ if (T.inVR) W.panel.tick(dt); }
    W.hudT += dt; if (!T.inVR && W.hud && W.hudT > .4) { W.hudT = 0; W.hud.draw(); }
  };
  W.togglePanel = function () {
    if (!W.panel) return; W.panelHidden = !W.panelHidden;
    const P = W.panel;
    if (W.panelHidden && P.pill) {   /* a fül a panel bal felső sarkánál marad, ugyanabban az irányban */
      T.xr.extra.delete(P.m); placePill();
    }
    if (!W.panelHidden) { if (P.pill) T.xr.extra.delete(P.pill); T.xr.extra.add(P.m); placePanel(); }
  };
  W.vrChanged = function (on) {
    if (!W.active) return;
    if (W.hud) W.hud.el.style.display = on ? "none" : "";
    /* a szemmagasság VR-ben más – újraépítjük, de csak ha már van fej-póz (különben 0 m-t mérnénk) */
    const k = W.kind, tok = W.gen; let n = 0;
    const tryIt = () => { if (tok !== W.gen) return; if (!on || T.headY() > .5 || ++n > 90) { W.close(null, true); W._raceGo = k === "race"; W.open(k); } else T.xrRaf(tryIt); };
    tryIt();
  };
  W.close = function (after, silent) {
    if (!W.active) { if (after) after(); return; }
    W.active = false; W.gen = (W.gen || 0) + 1;
    try { uiCloseAll(); } catch (e) {}
    audioStop();
    if (W.onClose) { try { W.onClose(); } catch (e) {} W.onClose = null; }
    const cvs = T.sceneEl.canvas;
    cvs.removeEventListener("pointermove", on2DMove); cvs.removeEventListener("pointerdown", on2DDown); cvs.removeEventListener("pointerup", on2DUp); cvs.style.cursor = "";
    removeEventListener("keydown", kd); removeEventListener("keyup", ku);
    W.objs.forEach((o) => T.xr.extra.delete(o));
    if (T.xrForget) T.xrForget(W.objs.concat(W.panel ? [W.panel.m].concat(W.panel.pill ? [W.panel.pill] : []) : []));
    if (W.panel) { T.xr.extra.delete(W.panel.m); if (W.panel.m.parent) W.panel.m.parent.remove(W.panel.m); const pl = W.panel.pill; if (pl) { T.xr.extra.delete(pl); if (pl.parent) pl.parent.remove(pl); } }
    if (W.root && W.root.parent) W.root.parent.remove(W.root);
    W.root && W.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    W.disposables.forEach((d) => { try { d.dispose(); } catch (e) {} });
    Object.keys(TEXC).forEach((k) => delete TEXC[k]); Object.keys(TX).forEach((k) => delete TX[k]); Object.keys(HX).forEach((k) => delete HX[k]);
    W.disposables = []; W.objs = []; W.root = null; W.panel = null; W.spec = null;
    if (W.hud) { W.hud.el.remove(); W.hud = null; }
    document.body.classList.remove("world-on");
    const sky = T.sky, sm = sky && sky.getObject3D("mesh");
    if (saved) {
      sky.object3D.visible = true; T.spots.object3D.visible = true;
      if (saved.camNear != null) { T.cam.setAttribute("camera", { near: saved.camNear, far: saved.camFar }); const cm = T.sceneEl.camera; if (cm) { cm.near = saved.camNear; cm.far = saved.camFar; cm.updateProjectionMatrix(); } }
      if (sm) { sm.material.depthTest = saved.skyDepth; sm.material.depthWrite = true; sm.renderOrder = saved.skyOrder; sm.material.needsUpdate = true; }
      T.sceneEl.renderer.localClippingEnabled = saved.clip;
      if (!T.inVR) { T.rig.object3D.rotation.y = saved.rigY; const lc1 = T.cam.components["look-controls"]; if (lc1 && lc1.pitchObject) { lc1.pitchObject.rotation.x = saved.pitch; lc1.yawObject.rotation.y = saved.yaw; } }
    }
    T.setBusy(false);
    if (after) setTimeout(after, 50);
  };
  W.active = false;
})();
