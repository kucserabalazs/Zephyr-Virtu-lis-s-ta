// CPU-profil a kikötőben (CDP): node hprof.js '{"pos":{"x":..,"z":..},"sec":6,"vr":0}'
const { chromium } = require('playwright');
(async () => {
  const O = JSON.parse(process.argv[2] || '{}');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 640, height: 400 }, locale: 'hu-HU' });
  await p.route(/aframe.*\.js/, r => r.fulfill({ path: __dirname + '/node_modules/aframe/dist/aframe-master.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8097/weboldal/vr-zephyr-games/' + (O.q || ''), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  await p.click('[data-g="race"]'); await p.waitForFunction(() => window.ZephyrWorld && ZephyrWorld._hb && ZephyrWorld._hb.rooms, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  await p.evaluate((O) => { const H = ZephyrWorld._hb; if (!H.HB.walk) H.walk(true); if (O.pos) H.HB.pos = O.pos; if (O.js) (new Function(O.js))(); }, O); await p.waitForTimeout(O.settle || 5000);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
  const t0 = Date.now(); await p.waitForTimeout((O.sec || 6) * 1000);
  const { profile } = await cdp.send('Profiler.stop');
  const fr = await p.evaluate(() => { let n = 0; return new Promise((res) => { const t0 = performance.now(); const f = () => { if (++n < 20) requestAnimationFrame(f); else res((performance.now() - t0) / 20); }; requestAnimationFrame(f); }); });
  /* önidő függvényenként */
  const byId = new Map(); profile.nodes.forEach((n) => byId.set(n.id, n));
  const dts = profile.timeDeltas, samples = profile.samples, self = new Map();
  for (let i = 0; i < samples.length; i++) { const n = byId.get(samples[i]); const cf = n.callFrame; const key = (cf.functionName || '(anon)') + ' @' + (cf.url || '').split('/').pop() + ':' + (cf.lineNumber + 1); self.set(key, (self.get(key) || 0) + (dts[i] || 0) / 1000); }
  /* összidő (inkluzív) – a gyerekek bejárásával */
  const children = new Map(); profile.nodes.forEach((n) => (n.children || []).forEach((c) => children.set(c, n.id)));
  const hits = new Map(); for (let i = 0; i < samples.length; i++) hits.set(samples[i], (hits.get(samples[i]) || 0) + (dts[i] || 0) / 1000);
  const incl = new Map(); const totalOf = (id) => { const n = byId.get(id); let s = hits.get(id) || 0; (n.children || []).forEach((c) => { s += totalOf(c); }); const cf = n.callFrame, key = (cf.functionName || '(anon)') + ' @' + (cf.url || '').split('/').pop() + ':' + (cf.lineNumber + 1); incl.set(key, (incl.get(key) || 0) + s); return s; };
  totalOf(profile.nodes[0].id);
  const tot = (Date.now() - t0);
  const top = (m, k) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, k).map(([n, ms]) => `${(ms / tot * 100).toFixed(1).padStart(5)}%  ${ms.toFixed(0).padStart(6)} ms  ${n}`);
  console.log('frame ms (swiftshader):', fr.toFixed(0), ' profilozott idő:', tot, 'ms');
  console.log('--- ÖNIDŐ'); console.log(top(self, O.n || 25).join('\n'));
  console.log('--- ÖSSZIDŐ (vilag.js)'); console.log(top(new Map(Array.from(incl.entries()).filter(([k]) => /vilag\.js|index\.html/.test(k))), O.n2 || 30).join('\n'));
  await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 400)); process.exit(1); });
