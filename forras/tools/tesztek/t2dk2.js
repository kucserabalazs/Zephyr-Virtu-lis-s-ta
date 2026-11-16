const { chromium } = require('playwright');
(async () => {
  const keys = (process.argv[2] || 'halasz').split(','), pre = process.argv[3] || '/tmp/kn';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/scratch/t2d/index.html'); await p.waitForTimeout(300);
  const out = await p.evaluate((keys) => keys.map((k) => { const c = document.createElement('canvas'); c.width = 1020; c.height = 646; const g = c.getContext('2d'); g.scale(3.4, 3.4); knBg(g, k); const K = KN[k], f = knFit(K, 10, 8, 280, 150); knDraw(g, K, f.cx, f.cy, f.s, 1, null); return c.toDataURL('image/jpeg', .9); }), keys);
  const fs = require('fs'); out.forEach((d, i) => fs.writeFileSync(`${pre}-${keys[i]}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
  console.log(out.length, errs.join('\n')); await b.close();
})();
