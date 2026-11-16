// A kikötő teljesítménye: rajzolási hívások, textúra-feltöltések, képkockánkénti JS-idő (W.upd szerint)
const { chromium } = require('playwright');
(async () => {
  const O = JSON.parse(process.argv[2] || '{}');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push('E:' + e.message.slice(0, 300)));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.rooms, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  await p.evaluate((O) => { const H = ZephyrWorld._hb; if (!H.HB.walk) H.walk(true); if (O.pos) H.HB.pos = O.pos; }, O); await p.waitForTimeout(4000);
  const r = await p.evaluate(async (O) => {
    const W = ZephyrWorld, sc = document.querySelector('a-scene'), R = sc.renderer;
    /* W.upd időmérés */
    const names = W.upd.map((f, i) => (f.name || 'anon') + '#' + i + ':' + String(f).slice(0, 70).replace(/\s+/g, ' '));
    const acc = new Float64Array(W.upd.length), cnt = W.upd.length;
    const orig = W.upd.slice(); W.upd.length = 0; orig.forEach((f, i) => W.upd.push(function (dt) { const t0 = performance.now(); const x = f.apply(this, arguments); acc[i] += performance.now() - t0; return x; }));
    /* textúra-verziók */
    const texs = new Map(); sc.object3D.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach((m) => { for (const k in m) { const v = m[k]; if (v && v.isTexture) texs.set(v, { v0: v.version, w: v.image && v.image.width, h: v.image && v.image.height, n: o.name || o.type, k }); } if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k].value; if (v && v.isTexture) texs.set(v, { v0: v.version, w: v.image && v.image.width, h: v.image && v.image.height, n: o.name || o.type, k }); } }); });
    /* képkocka-idő */
    const frames = []; let last = performance.now(); let n = 0; await new Promise((res) => { const f = () => { const t = performance.now(); frames.push(t - last); last = t; if (++n < (O.frames || 120)) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    const tot = frames.reduce((a, b) => a + b, 0);
    const up = []; texs.forEach((q, t) => { const d = t.version - q.v0; if (d > 0) up.push([d, q.w + 'x' + q.h, q.n, q.k]); }); up.sort((a, b) => b[0] - a[0]);
    const top = Array.from(acc).map((ms, i) => [ms / n, names[i]]).sort((a, b) => b[0] - a[0]).slice(0, 14);
    let meshes = 0, vis = 0; W.root.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite) { meshes++; if (o.visible) vis++; } });
    return { fps: (1000 * n / tot).toFixed(1), avgFrameMs: (tot / n).toFixed(1), calls: R.info.render.calls, tri: R.info.render.triangles, tex: R.info.memory.textures, geo: R.info.memory.geometries, meshes, vis, updN: cnt, texUploads: up.slice(0, 20), texUploadPx: up.reduce((a, q) => { const [w, h] = q[1].split('x').map(Number); return a + q[0] * (w * h || 0); }, 0), top };
  }, O);
  console.log(JSON.stringify(r, null, 1)); console.log(errs.slice(0, 5).join('\n')); await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 400)); process.exit(1); });
