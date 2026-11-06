
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
    const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; W.disposables.push(tex);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.78, .78 * PH / PW), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    W.disposables.push(m.geometry, m.material); m.renderOrder = 995;
    const P = { m, cv, tex, btns: [], hov: -1, uv: null };
    m.userData.xr = {
      hover: (on, h) => { P.uv = on && h && h.uv ? h.uv : null; },
      move: (h) => { P.uv = h && h.uv ? h.uv : null; },
      click: (h) => { if (!h || !h.uv) return; const x = h.uv.x * PW, y = (1 - h.uv.y) * PH; const b = P.btns.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); if (b) { b.fn(); P.draw(); } }
    };
    T.xr.extra.add(m);
    P.draw = () => {
      const g = cv.getContext("2d"); P.btns = []; g.clearRect(0, 0, PW, PH);
      const bg = g.createLinearGradient(0, 0, 0, PH); bg.addColorStop(0, "rgba(14,52,98,.94)"); bg.addColorStop(1, "rgba(7,28,58,.94)");
      g.beginPath(); g.roundRect ? g.roundRect(5, 5, PW - 10, PH - 10, 40) : g.rect(5, 5, PW - 10, PH - 10); g.fillStyle = bg; g.fill(); g.lineWidth = 6; g.strokeStyle = "rgba(255,209,102,.85)"; g.stroke();
      let rowY = 0;
      const api = {
        title(t, s) { g.fillStyle = "#ffd166"; g.font = "800 50px system-ui, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(t, 44, 66); g.fillStyle = "#fff"; g.font = "600 34px system-ui, sans-serif"; g.fillText(s || "", 44, 122); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(40, 158, PW - 80, 2); },
        row(i, t, c, r) { const y = 210 + i * 66; g.fillStyle = c || "#fff"; g.beginPath(); g.arc(58, y, 11, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.font = "600 36px system-ui, sans-serif"; g.textAlign = "left"; g.fillText(t, 84, y); if (r) { g.textAlign = "right"; g.fillStyle = "#7fd3ff"; g.fillText(r, PW - 50, y); } rowY = y; },
        buttons(list, row) {
          const n = list.length, gap = 16, w = (PW - 80 - gap * (n - 1)) / n, y = PH - 150 - (row || 0) * 126, h = 110;
          list.forEach(([lbl, fn, on], i) => {
            const x = 40 + i * (w + gap), k = P.btns.length, hov = k === P.hov; P.btns.push({ x, y, w, h, fn });
            g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 24) : g.rect(x, y, w, h);
            g.fillStyle = on ? "#ffd166" : hov ? "rgba(255,255,255,.32)" : "rgba(255,255,255,.12)"; g.fill(); g.lineWidth = hov ? 5 : 2; g.strokeStyle = hov ? "#ffd166" : "rgba(255,255,255,.35)"; g.stroke();
            g.fillStyle = on ? "#0b2f5e" : "#fff"; g.font = `700 ${lbl.length > 14 || n > 5 ? 28 : 38}px system-ui, sans-serif`; g.textAlign = "center"; g.fillText(lbl, x + w / 2, y + h / 2 + 2);
          });
        }
      };
      if (W.spec && W.spec.panel) W.spec.panel(api);
      tex.needsUpdate = true;
    };
    P.tick = (dt) => {
      const hv = P.uv ? P.btns.findIndex((q) => { const x = P.uv.x * PW, y = (1 - P.uv.y) * PH; return x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h; }) : -1;
      if (hv !== P.hov) { P.hov = hv; P.draw(); }
      if ((W.panelDirty || 0) > .5) { W.panelDirty = 0; P.draw(); }
    };
    return P;
  }
  function placePanel() {
    const P = W.panel; if (!P) return;
    const yaw = T.camYaw(), hy = T.headY();
    let a = yaw + (W.kind === "maquette" ? .62 : .55), d = W.kind === "sail" ? .85 : 1.05, y = hy - .25;
    if (W.kind === "sail") { a = yaw + .62; y = hy - .38; }
    P.m.position.set(-Math.sin(a) * d, y, -Math.cos(a) * d);
    P.m.rotation.set(-.2, a, 0, "YXZ");
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
      #worldHud .wh-hint{font:600 15px/1.4 inherit;background:rgba(7,28,58,.7);padding:8px 14px;border-radius:12px;text-align:center}
      @media (max-width:600px){#worldHud .wh-t{font-size:19px}#worldHud .wh-s{font-size:16px}}
    </style><div class="wh-top"><button type="button" class="wh-back">‹ Vissza a sétához</button><div class="wh-card"><div class="wh-t"></div><div class="wh-s"></div><ul class="wh-list"></ul></div></div>
    <div class="wh-bot"><div class="wh-btns"></div><div class="wh-hint"></div></div>`;
    document.body.appendChild(el);
    el.querySelector(".wh-back").addEventListener("click", () => W.close());
    let lastBtns = "";
    const H = {
      el,
      draw() {
        const api = {
          title(t, s) { el.querySelector(".wh-t").textContent = t; el.querySelector(".wh-s").textContent = s || ""; },
          list(a) { el.querySelector(".wh-list").innerHTML = a.map((x) => `<li>${x}</li>`).join(""); },
          hint(t) { el.querySelector(".wh-hint").textContent = t; },
          buttons(list) {
            const key = list.map((x) => x[0]).join("|"); if (key === lastBtns) return; lastBtns = key;
            const box = el.querySelector(".wh-btns"); box.className = "wh-btns"; box.innerHTML = "";
            list.forEach(([lbl, fn]) => { const b = document.createElement("button"); b.type = "button"; b.className = "wh-b"; b.textContent = lbl; b.addEventListener("click", () => { fn(); H.draw(); }); box.appendChild(b); });
          },
          steer() {
            if (lastBtns === "steer") return; lastBtns = "steer";
            const box = el.querySelector(".wh-btns"); box.className = "wh-btns wh-steer"; box.innerHTML = "";
            [["◀", "L"], ["egyenesbe", "C"], ["▶", "R"]].forEach(([lbl, k]) => {
              const b = document.createElement("button"); b.type = "button"; b.className = "wh-b"; b.textContent = lbl;
              if (k === "C") b.addEventListener("click", () => { SAIL.del = 0; });
              else { const on = (v) => (e) => { e.preventDefault(); SAIL.keys[k] = v; b.classList.toggle("on", v); };
                b.addEventListener("pointerdown", on(true)); ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, on(false))); }
              box.appendChild(b);
            });
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
    if (W.active) W.close(null, true);
    const sky = T.sky, sm = sky && sky.getObject3D("mesh");
    saved = { rigY: T.rig.object3D.rotation.y, skyVis: sky.object3D.visible, spotsVis: T.spots.object3D.visible, clip: T.sceneEl.renderer.localClippingEnabled, scene: T.current,
      skyDepth: sm ? sm.material.depthTest : true, skyOrder: sm ? sm.renderOrder : 0 };
    W.kind = kind; W.active = true; W.t = 0; W.upd = []; W.objs = []; W.disposables = [];
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
    safe(() => { W.spec = kind === "sail" ? buildSail() : buildMaquette(); finishOpen(); });
  };
  function finishOpen() {
    document.body.classList.add("world-on");
    W.hud = makeHud(); W.hud.el.style.display = T.inVR ? "none" : ""; W.hud.draw();
    W.panel = makePanel(); W.panel.draw();
    if (T.inVR) placePanel();
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
    if (W.panel) { W.panel.m.visible = T.inVR && !W.panelHidden; if (T.inVR) W.panel.tick(dt); }
    W.hudT += dt; if (!T.inVR && W.hud && W.hudT > .4) { W.hudT = 0; W.hud.draw(); }
  };
  W.togglePanel = function () {
    if (!W.panel) return; W.panelHidden = !W.panelHidden;
    if (!W.panelHidden) placePanel();
  };
  W.vrChanged = function (on) {
    if (!W.active) return;
    if (W.hud) W.hud.el.style.display = on ? "none" : "";
    /* a szemmagasság VR-ben más – újraépítjük, de csak ha már van fej-póz (különben 0 m-t mérnénk) */
    const k = W.kind, tok = W.gen; let n = 0;
    const tryIt = () => { if (tok !== W.gen) return; if (!on || T.headY() > .5 || ++n > 90) { W.close(null, true); W.open(k); } else T.xrRaf(tryIt); };
    tryIt();
  };
  W.close = function (after, silent) {
    if (!W.active) { if (after) after(); return; }
    W.active = false; W.gen = (W.gen || 0) + 1;
    audioStop();
    if (W.onClose) { try { W.onClose(); } catch (e) {} W.onClose = null; }
    const cvs = T.sceneEl.canvas;
    cvs.removeEventListener("pointermove", on2DMove); cvs.removeEventListener("pointerdown", on2DDown); cvs.removeEventListener("pointerup", on2DUp); cvs.style.cursor = "";
    removeEventListener("keydown", kd); removeEventListener("keyup", ku);
    W.objs.forEach((o) => T.xr.extra.delete(o));
    if (T.xrForget) T.xrForget(W.objs.concat(W.panel ? [W.panel.m] : []));
    if (W.panel) { T.xr.extra.delete(W.panel.m); if (W.panel.m.parent) W.panel.m.parent.remove(W.panel.m); }
    if (W.root && W.root.parent) W.root.parent.remove(W.root);
    W.root && W.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    W.disposables.forEach((d) => { try { d.dispose(); } catch (e) {} });
    Object.keys(TEXC).forEach((k) => delete TEXC[k]);
    W.disposables = []; W.objs = []; W.root = null; W.panel = null; W.spec = null;
    if (W.hud) { W.hud.el.remove(); W.hud = null; }
    document.body.classList.remove("world-on");
    const sky = T.sky, sm = sky && sky.getObject3D("mesh");
    if (saved) {
      sky.object3D.visible = true; T.spots.object3D.visible = true;
      if (sm) { sm.material.depthTest = saved.skyDepth; sm.material.depthWrite = true; sm.renderOrder = saved.skyOrder; sm.material.needsUpdate = true; }
      T.sceneEl.renderer.localClippingEnabled = saved.clip;
      if (!T.inVR) T.rig.object3D.rotation.y = saved.rigY;
    }
    T.setBusy(false);
    if (after) setTimeout(after, 50);
  };
  W.active = false;
})();
