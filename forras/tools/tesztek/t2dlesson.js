const { chromium } = require('playwright');
(async () => {
  const idx = (process.argv[2] || '7').split(',').map(Number), times = (process.argv[3] || '10').split(',').map(Number), pre = process.argv[4] || '/tmp/ls';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/scratch/t2d/index.html'); await p.waitForTimeout(300);
  const out = await p.evaluate(([idx, times]) => { const r = []; idx.forEach((i) => times.forEach((t) => { const c = document.createElement('canvas'); c.width = 900; c.height = 570; const g = c.getContext('2d'); g.scale(3, 3); window.LX_CSO[i].d(g, t); r.push([i, t, c.toDataURL('image/jpeg', .9), window.LX_CSO[i].t]); })); return r; }, [idx, times]);
  const fs = require('fs'); out.forEach(([i, t, d, title]) => { fs.writeFileSync(`${pre}-${i}-${t}.jpg`, Buffer.from(d.split(',')[1], 'base64')); console.log(i, t, title); });
  console.log(errs.join('\n')); await b.close();
})();
