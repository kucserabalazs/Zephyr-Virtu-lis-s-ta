const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file:///home/claude/scratch/t2d/index.html'); await p.waitForTimeout(300);
  const which = process.argv[2] || 'lessons', ts = JSON.parse(process.argv[3] || '[3]');
  const out = await p.evaluate(([which, ts]) => { const res = [];
    if (which === 'lessons' || which === 'cso') { (which === 'cso' ? LX_CSO : LX_VIH).forEach((L, i) => ts.forEach((t) => { const c = document.createElement('canvas'); c.width = 1020; c.height = 646; const g = c.getContext('2d'); g.scale(3.4, 3.4); try { L.d(g, t); } catch (e) { g.fillStyle = 'red'; g.font = '10px sans-serif'; g.fillText('HIBA ' + e.message, 5, 20); } res.push(c.toDataURL('image/jpeg', .85)); })); }
    else { const kinds = Object.keys(CLD_P); kinds.forEach((k) => { const c = document.createElement('canvas'); c.width = 680; c.height = 400; const g = c.getContext('2d'); g.scale(3.4, 3.4); const gr = g.createLinearGradient(0, 0, 0, 118); gr.addColorStop(0, '#3f7fc0'); gr.addColorStop(1, '#b9d8ee'); g.fillStyle = gr; g.fillRect(0, 0, 200, 118); const big = k === 'cb' || k === 'cuc'; vhCloud(g, k, 10, 6, 180, big ? 110 : 80, 5); g.fillStyle = '#fff'; g.font = '800 8px sans-serif'; g.fillText(k, 4, 112); res.push(c.toDataURL('image/jpeg', .85)); }); }
    return res; }, [which, ts]);
  const fs = require('fs'); out.forEach((d, i) => fs.writeFileSync(`/home/claude/scratch/t2d/${which}-${i}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
  console.log(out.length, errs.slice(0, 5).join('\n')); await b.close();
})();
