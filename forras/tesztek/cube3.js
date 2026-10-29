const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  await p.goto('http://127.0.0.1:8096/virtualis-seta/?honnan=kezdolap#korvett-nappali'); await p.waitForTimeout(6000);
  console.log(await p.evaluate(() => [...document.querySelectorAll('.thumb')].map(t => t.dataset.id).join(',')));
  for (const id of ['korvett-konyha', 'korvett-halo']) { await p.evaluate((id) => document.querySelector(`.thumb[data-id="${id}"]`).click(), id); await p.waitForTimeout(2500); console.log('now', await p.evaluate(() => document.getElementById('placeName').textContent)); }
  await p.click('.cube-dots [data-face="3"]'); await p.waitForTimeout(800);
  const bb = await (await p.$('#cubeStage')).boundingBox(); const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  for (let i = 0; i < 3; i++) { await p.mouse.click(cx, cy); await p.waitForTimeout(2500); console.log('after back', p.url(), await p.evaluate(() => document.getElementById('placeName').textContent)); }
  await b.close();
})();
