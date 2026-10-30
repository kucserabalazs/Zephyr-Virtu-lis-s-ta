const { open } = require('./env');
(async () => {
  for (const phone of [false, true]) {
    const { b, p } = await open('http://127.0.0.1:8096/virtualis-seta/#steg', phone);
    await p.waitForTimeout(6000);
    await p.evaluate(() => document.querySelector('.gm-dock [data-gm]').click()); await p.waitForTimeout(800);
    await p.click('.gm-cur'); await p.waitForTimeout(300); await p.click('.gm-tabs [data-gm="race"]'); await p.waitForTimeout(3000);
    const vp = p.viewportSize(); await p.mouse.click(vp.width / 2, phone ? vp.height * .565 : vp.height / 2);
    for (let i = 0; i < 4; i++) { await p.waitForTimeout(i ? 15000 : 25000); await p.screenshot({ path: `./r${i}_${phone ? 'ph' : 'pc'}.png` }); }
    await b.close();
  }
})();
