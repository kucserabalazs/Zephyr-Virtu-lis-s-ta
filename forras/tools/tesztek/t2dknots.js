const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/scratch/t2d/index.html'); await p.waitForTimeout(300);
  const out = await p.evaluate(() => { const res = []; ['nyolc', 'reff', 'kofa', 'szorito', 'palstek', 'kor', 'bika', 'szovo'].forEach((k) => { const c = document.createElement('canvas'); c.width = 1020; c.height = 646; const g = c.getContext('2d'); g.scale(3.4, 3.4); knBg(g, k); const K = KN[k], f = knFit(K, 10, 8, 280, 150); knDraw(g, K, f.cx, f.cy, f.s, 1, k === 'reff' || k === 'kofa' || k === 'szovo' ? null : 'two'); res.push(c.toDataURL('image/jpeg', .9)); }); return res; });
  const fs = require('fs'); out.forEach((d, i) => fs.writeFileSync(`/home/claude/scratch/t2d/kn-${i}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
  console.log(out.length, errs.join('\n')); await b.close();
})();
