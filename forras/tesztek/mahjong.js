const { open } = require('./env');
(async () => {
  for (const [phone, lay] of [[false, 'vit'], [true, 'tek'], [false, 'tek']]) {
    const { b, p } = await open('about:blank', phone);
    await p.addInitScript(() => { window.__zephyrTest = {}; });
    await p.goto('http://127.0.0.1:8096/virtualis-seta/#steg'); await p.waitForTimeout(6000);
    await p.evaluate(() => document.querySelector('.gm-dock [data-gm]').click()); await p.waitForTimeout(800);
    await p.click('.gm-cur'); await p.waitForTimeout(300); await p.click('.gm-tabs [data-gm="mahj"]'); await p.waitForTimeout(1500);
    const tag = (phone ? 'ph' : 'pc') + lay;
    const btn = async (id) => { const r = await p.evaluate((id) => { const B = window.__zephyrTest.mahj.S.btn.find((x) => x.id === id); return B && [B.x + B.w / 2, B.y + B.h / 2]; }, id); await p.mouse.click(r[0], r[1]); await p.waitForTimeout(400); };
    if (lay === 'tek') await btn('tek');
    await p.waitForTimeout(800); await p.screenshot({ path: `./mjA_${tag}.png` });
    // hint check
    await btn('hint'); await p.screenshot({ path: `./mjH_${tag}.png` });
    let steps = 0, shuffles = 0;
    for (; steps < 200; steps++) {
      const st = await p.evaluate(() => { const { S, freeIn, grpOf } = window.__zephyrTest.mahj; const fr = S.T.filter((t) => !t.gone && freeIn(S.T, t)); const m = {}; for (const t of fr) { const g = grpOf(t.k); if (m[g]) { const G = S.G; return { st: S.st, a: [m[g].sx + G.w / 2, m[g].sy + G.h / 2], b: [t.sx + G.w / 2, t.sy + G.h / 2], left: S.left }; } m[g] = t; } return { st: S.st, left: S.left }; });
      if (st.st === 'win') break;
      if (!st.a) { shuffles++; await btn('shuf'); await p.waitForTimeout(700); continue; }
      await p.mouse.click(...st.a); await p.waitForTimeout(60); await p.mouse.click(...st.b); await p.waitForTimeout(90);
      if (steps === 10) await p.screenshot({ path: `./mjM_${tag}.png` });
    }
    await p.waitForTimeout(1200);
    const fin = await p.evaluate(() => { const S = window.__zephyrTest.mahj.S; return { st: S.st, left: S.left, tr: S.tr, n: S.T.length }; });
    console.log(tag, 'steps', steps, 'shuffles', shuffles, JSON.stringify(fin));
    await p.screenshot({ path: `./mjW_${tag}.png` });
    await b.close();
  }
})();
