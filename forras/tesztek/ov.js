const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://127.0.0.1:8096/uj/'); await p.waitForTimeout(2500);
  console.log(await p.evaluate(() => { const W = document.documentElement.clientWidth; const o = []; document.querySelectorAll('body *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.right > W + 1 && r.width > 0) { const s = e.closest('section,header,footer'); if (!e.closest('.lake-wrap')) o.push(e.tagName + '.' + (e.className.baseVal ?? e.className) + ' ' + Math.round(r.right) + ' w' + Math.round(r.width) + ' in ' + (s ? s.id || s.className : '') + ' ' + (e.textContent||'').slice(0,30)); } }); return [W, document.documentElement.scrollWidth, o.slice(0, 15)]; }));
  await b.close();
})();
