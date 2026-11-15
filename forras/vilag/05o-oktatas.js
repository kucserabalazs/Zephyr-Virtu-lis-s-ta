  /* =====================================================================================================================
     2026-11-15 01:36–01:39 (tulajdonos): „A kikötőben legyen egy kis épített házikó, amire a vitorlás oktatás van kiírva. Ha bemegyünk, a nagypapa
     egy táblánál állva elmagyarázza a szabályokat, amit már a 2 dimenziós megjelenítésben megcsináltunk a gyerekeknek is alkalmas illusztrációval.
     Ez legyen ott megjelenítve teljes tartalmával, de mozgó képes illusztrációk legyenek, ne álló.” · „Az oktatás bővüljön a mentés szabályaival
     és az elsősegélynyújtás szabályaival is.” · „Az oktatócsomagnak ez legyen a kezdő fázisa: a szabályok ismertetése, ami persze bármikor
     otthagyható, hogy az oktatópályára jussunk.”
     → VITORLÁSISKOLA: cölöpökre épített faházikó a móló jobb oldalán („VITORLÁS OKTATÁS” tábla), bent a családi nagypapa (ugyvedhez.hu figura)
       a falitábla mellett áll, mutat, beszél (felirat + magyar géphang, ha van), a táblán MOZGÓ rajzok. 1. a verseny 9 szabálya (a 2D-s anyag
       teljes szövegével), 2. mentés, 3. elsősegély. Bármikor: „Tovább az oktatópályára ▶”.
     Források az elsősegélyhez: ERC / magyar BLS-anyagok (5–6 cm mélyen, 100–120/perc, 30:2; vízből mentettnél előbb 5 befúvás).
     ===================================================================================================================== */
  const SCH = { on: false, inside: false, i: 0, t: 0, paused: false, voice: true, built: false };
  const SCH_BOX = { x0: 3.5, x1: 9.5, z0: -1.5, z1: 4 };
  /* ---- rajzoló készlet (a 2D-s ábrák 300 × 190-es koordinátáiban) ---- */
  const SN = "#141d4d", SR = "#d61f26", SS = "#f6f4ec", SG = "#c89b3c", SW = "#2d6f9e", SGR = "#2f9e57";
  const kL = (g, pts, col, w, dash, off) => { g.save(); g.strokeStyle = col; g.lineWidth = w || 2; g.lineCap = "round"; g.lineJoin = "round"; if (dash) { g.setLineDash(dash); g.lineDashOffset = off || 0; } g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore(); };
  const kT = (g, s, x, y, sz, col, al, wt) => { g.save(); g.fillStyle = col || SN; g.font = `${wt || 800} ${sz || 9}px ${UIF}`; g.textAlign = al || "center"; g.textBaseline = "middle"; g.fillText(s, x, y); g.restore(); };
  const sCirc = (g, x, y, r, fill, stroke, w) => { g.beginPath(); g.arc(x, y, r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = w || 1.5; g.stroke(); } };
  const kEase = (u) => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, cl01 = (u) => clamp(u, 0, 1), kSeg = (t, a, b) => cl01((t - a) / (b - a));
  function sWater(g, t) { const gr = g.createLinearGradient(0, 0, 0, 190); gr.addColorStop(0, "#d8eef4"); gr.addColorStop(1, "#b9dbe8"); g.fillStyle = gr; g.fillRect(0, 0, 300, 190);
    g.strokeStyle = "rgba(45,111,158,.18)"; g.lineWidth = 1; for (let r = 0; r < 9; r++) { const y = 12 + r * 21, ph = t * .9 + r * 1.7; g.beginPath(); for (let x = -10; x <= 310; x += 10) { const yy = y + Math.sin(x * .05 + ph) * 2.2; x < -5 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); } }
  function sBoat(g, x, y, a, col, boom, s, flap) { g.save(); g.translate(x, y); g.rotate(a * Math.PI / 180); g.scale(s || 1, s || 1);
    g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.moveTo(-6, 26); g.quadraticCurveTo(0, 40, 6, 26); g.fill();   /* farvíz */
    g.beginPath(); g.moveTo(0, -26); g.bezierCurveTo(10, -14, 11, 8, 7, 24); g.lineTo(-7, 24); g.bezierCurveTo(-11, 8, -10, -14, 0, -26); g.closePath(); g.fillStyle = col || SS; g.fill(); g.strokeStyle = SN; g.lineWidth = 2; g.stroke();
    sCirc(g, 0, -4, 2.6, SN); const b = boom || 0;
    if (b || flap) { const f = flap ? Math.sin(performance.now() / 70) * 5 : 0, bb = b || 1; g.strokeStyle = SR; g.lineWidth = 3.4; g.lineCap = "round"; g.beginPath(); g.moveTo(0, -4); g.quadraticCurveTo(bb * 13 + f, 6, bb * 15 + f * 1.4, 22); g.stroke();
      g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -24); g.quadraticCurveTo(bb * 9 + f, -14, bb * 5 + f, -6); g.stroke(); g.strokeStyle = SN; g.lineWidth = 1; g.stroke(); }
    g.restore(); }
  function sWind(g, x, y, a, t, lab) { g.save(); g.translate(x, y); g.rotate((a == null ? 180 : a) * Math.PI / 180); g.strokeStyle = SW; g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(0, 22); g.lineTo(0, -14); g.moveTo(-8, -4); g.lineTo(0, -16); g.lineTo(8, -4); g.stroke();
    g.globalAlpha = .45; g.lineWidth = 1.6; g.setLineDash([4, 6]); g.lineDashOffset = t * 30; [-14, 14].forEach((dx) => { g.beginPath(); g.moveTo(dx, 26); g.lineTo(dx, -10); g.stroke(); }); g.restore();
    kT(g, lab || "SZÉL", x + 14, y - 8, 8, SW, "left", 900); }
  function sBuoy(g, x, y, n, t) { const b = Math.sin((t || 0) * 2.4 + x) * 1.2; sCirc(g, x, y + b, 9, "#ff8a1e", SN, 2); if (n) kT(g, String(n), x, y + b + .5, 9, SN); }
  /* pont egy töröttvonalon (u: 0..1) iránnyal */
  function sAlong(P, u) { const L = []; let tot = 0; for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(d); tot += d; }
    let s = cl01(u) * tot; for (let i = 0; i < L.length; i++) { if (s <= L[i] || i === L.length - 1) { const k = L[i] ? s / L[i] : 0, [x0, y0] = P[i], [x1, y1] = P[i + 1]; return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, a: Math.atan2(x1 - x0, -(y1 - y0)) * 180 / Math.PI }; } s -= L[i]; } return { x: P[0][0], y: P[0][1], a: 0 }; }
  /* sima görbe pontsor (Catmull–Rom) */
  function sCurve(pts, n) { const o = []; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      for (let k = 0; k < (n || 10); k++) { const t = k / (n || 10), t2 = t * t, t3 = t2 * t; o.push([0, 1].map((j) => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } } o.push(pts[pts.length - 1]); return o; }
  function sPart(P, u) { const n = Math.max(2, Math.round(P.length * cl01(u))); return P.slice(0, n); }
  function sBubble(g, x, y, txt, col) { g.save(); g.font = `900 9px ${UIF}`; const w = g.measureText(txt).width + 12; g.fillStyle = "#fff"; g.strokeStyle = col || SR; g.lineWidth = 1.5; uiRR(g, x - w / 2, y - 9, w, 16, 6); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x - 4, y + 7); g.lineTo(x, y + 13); g.lineTo(x + 4, y + 7); g.fill(); g.restore(); kT(g, txt, x, y - 1, 9, col || SR, "center", 900); }
  function sSwim(g, x, y, t, s) { s = s || 1; g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1.5; for (let k = 0; k < 2; k++) { g.beginPath(); g.ellipse(0, 2, 10 + k * 5 + Math.sin(t * 3) * 1.5, 4 + k * 2, 0, 0, TAU); g.stroke(); }
    const w = Math.sin(t * 7) * .6; g.strokeStyle = "#e8bc96"; g.lineWidth = 3; g.lineCap = "round"; g.beginPath(); g.moveTo(-4, 0); g.lineTo(-10, -9 + w * 4); g.moveTo(4, 0); g.lineTo(10, -9 - w * 4); g.stroke();
    sCirc(g, 0, -2, 5.5, "#e8bc96", SN, 1); g.fillStyle = "#ff8a1e"; g.fillRect(-5, 2, 10, 4); g.restore(); }
  function sRing(g, x, y, s) { g.save(); g.translate(x, y); g.scale(s || 1, s || 1); g.lineWidth = 4; g.strokeStyle = "#ff7a1a"; sCirc(g, 0, 0, 7, null, "#ff7a1a", 4.5); g.strokeStyle = "#fff"; g.lineWidth = 4.5; g.setLineDash([3, 7.9]); g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.stroke(); g.restore(); }
  /* oldalnézeti emberke (elsősegély): pontok = fej, váll, csípő, könyök, kéz, térd, láb */
  function sMan(g, P, col, skin) { g.save(); g.lineCap = "round"; g.lineJoin = "round"; const L = (a, b, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(P[a][0], P[a][1]); g.lineTo(P[b][0], P[b][1]); g.stroke(); };
    L("hip", "knee", 7, "#34495e"); L("knee", "foot", 6, "#34495e"); L("sh", "hip", 10, col || "#2f6db0"); L("sh", "elb", 5.5, col || "#2f6db0"); L("elb", "hand", 4.5, skin || "#e8bc96");
    sCirc(g, P.head[0], P.head[1], 7, skin || "#e8bc96", SN, 1); g.restore(); }
  const lerpP = (A, B, k) => { const o = {}; Object.keys(A).forEach((n) => { o[n] = [A[n][0] + (B[n][0] - A[n][0]) * k, A[n][1] + (B[n][1] - A[n][1]) * k]; }); return o; };
  const LIE = { head: [70, 140], sh: [86, 142], hip: [130, 144], elb: [104, 150], hand: [122, 152], knee: [156, 144], foot: [184, 146] };
  const SIDE = { head: [96, 146], sh: [106, 138], hip: [134, 140], elb: [96, 128], hand: [86, 140], knee: [150, 128], foot: [166, 144] };
  /* ---- a TANANYAG: a 2D-s szabályok teljes szövegével, mozgó ábrákkal ---- */
  const LESSONS = [
    { s: "Üdvözlés", t: "Szervusz, kis matróz!", say: "Szervusz, kis matróz! Én vagyok a nagypapa, harminc éve vitorlázom a Balatonon. Mielőtt kifutunk az oktatópályára, megtanítom neked a legfontosabb szabályokat: hogyan versenyzünk tisztességesen, hogyan mentünk, ha baj van, és hogyan segítünk a bajba jutottnak. Ha már tudod, bármikor indulhatsz a vízre a „Tovább az oktatópályára” gombbal!",
      d: (g, t) => { sWater(g, t); sWind(g, 40, 50, 180, t); const u = (t % 10) / 10; sBoat(g, -30 + u * 360, 120 + Math.sin(u * 6) * 8, 90, SS, -1, 1.3); sBuoy(g, 220, 70, 1, t); kT(g, "Zephyr vitorlásiskola", 150, 24, 13, SN, "center", 900); } },
    /* 1. A VERSENY SZABÁLYAI (a 2D-s anyagból, változatlan szöveggel) */
    { s: "A verseny szabályai", t: "1. A szél a motorunk", say: "A vitorlás nem tud pontosan a széllel szembe menni. Ott, ahonnan a szél fúj, van egy „tiltott zóna” – oda csak cikk-cakkban (kreuzolva) lehet eljutni.",
      d: (g, t) => { sWater(g, t); sWind(g, 150, 30, 180, t); const pul = .18 + .08 * Math.sin(t * 3); g.fillStyle = `rgba(214,31,38,${pul})`; g.beginPath(); g.moveTo(150, 150); g.lineTo(96, 60); g.arc(150, 150, 104, -Math.PI * .66, -Math.PI * .34); g.closePath(); g.fill(); g.strokeStyle = SR; g.setLineDash([6, 5]); g.stroke(); g.setLineDash([]);
        kT(g, "tiltott zóna", 150, 92, 10, SR); const Z = [[150, 182], [110, 150], [176, 112], [118, 74], [168, 40]], u = (t % 12) / 12, p = sAlong(Z, u); kL(g, sPart(Z.flatMap((q, i) => i ? [[(Z[i - 1][0] + q[0]) / 2, (Z[i - 1][1] + q[1]) / 2], q] : [q]), u), SG, 2.4, [5, 4]);
        const leg = Math.min(3, Math.floor(u * 4)); sBoat(g, p.x, p.y, p.a, SS, leg % 2 ? -1 : 1, .8); } },
    { s: "A verseny szabályai", t: "2. Rajt: a vonal mögül", say: "A rajtvonal két bója (vagy egy bója és a rendezőhajó) között van. A dudaszó ELŐTT senki sem lépheti át! Aki túl korán megy, annak vissza kell fordulnia, és újra át kell mennie a vonalon.",
      d: (g, t) => { sWater(g, t); sWind(g, 150, 26, 180, t); sBuoy(g, 50, 90, 0, t); sBuoy(g, 250, 90, 0, t); kL(g, [[50, 90], [250, 90]], SN, 2, [4, 4]); kT(g, "RAJTVONAL", 150, 80, 9);
        const c = t % 10, cd = Math.ceil(6 - c); kT(g, c < 6 ? `${cd}…` : "DUDA! ▶ RAJT", 150, 178, c < 6 ? 14 : 12, c < 6 ? SN : SGR, "center", 900);
        const ya = c < 4 ? 150 - c * 18 : c < 6 ? 78 + (c - 4) * 30 : c < 8 ? 138 - (c - 6) * 50 : 38 - (c - 8) * 10, early = c > 3.4 && c < 6.4; sBoat(g, 110, ya, c >= 4 && c < 6 ? 180 : 0, early ? "#f6d5d5" : SS, 1, .8); if (early) sBubble(g, 110, ya - 26, "KORÁN! vissza");
        const yb = c < 6 ? 150 - Math.min(c, 4.5) * 9 : 110 - (c - 6) * 40; sBoat(g, 190, yb, 0, "#cfe3f3", -1, .8); } },
    { s: "A verseny szabályai", t: "3. A bójákat bal kéz felől kerüljük", say: "A pályán a bóják sorban jönnek: 1., 2., 3. … Mindegyiket úgy kell megkerülni, hogy a BAL kezed felé essen (óramutatóval ellentétesen). Aki kihagy egyet vagy rossz oldalról kerüli, annak vissza kell mennie.",
      d: (g, t) => { sWater(g, t); sBuoy(g, 150, 80, 1, t); const C = sCurve([[214, 182], [212, 120], [196, 62], [150, 46], [108, 62], [104, 110], [96, 182]], 12), u = (t % 9) / 9; kL(g, sPart(C, u), SG, 3, [7, 6]); const p = sAlong(C, u); sBoat(g, p.x, p.y, p.a, SS, -1, .8);
        kT(g, "bal kéz", 52, 76, 10); kT(g, "felől", 52, 90, 10); g.save(); g.strokeStyle = SGR; g.lineWidth = 2; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(150, 80); g.stroke(); g.restore(); } },
    { s: "A verseny szabályai", t: "4. „Backbord!” – a jobbcsapású hajónak van elsőbbsége", say: "Ha a szél a hajó JOBB oldala felől fúj (a bum a bal oldalon van), az a hajó „jobbcsapáson” megy, és ELSŐBBSÉGE van. A balcsapású hajónak ki kell térnie. Ilyenkor kiabálják: „Backbord!” – vagyis: „Térj ki, nekem van elsőbbségem!”",
      d: (g, t) => { sWater(g, t); sWind(g, 150, 26, 180, t); const u = (t % 8) / 8; const A = [[40, 176], [260, -40]], pa = sAlong(A, u * .8); sBoat(g, pa.x, pa.y, 45, "#d7f0d7", -1, .9); kT(g, "jobbcsapás ✔", pa.x - 26, pa.y + 26, 9, SGR);
        const B = sCurve([[262, 178], [196, 116], [168, 112], [130, 128], [70, 70], [30, 20]], 10), pb = sAlong(B, u); sBoat(g, pb.x, pb.y, pb.a, "#f6d5d5", 1, .9); kT(g, "balcsapás – kitér", pb.x + 34, pb.y + 24, 9, SR);
        if (u > .2 && u < .55) sBubble(g, pa.x, pa.y - 30, "BACKBORD!", SGR); } },
    { s: "A verseny szabályai", t: "5. Azonos csapáson: a szél felőli tér ki", say: "Ha két hajó ugyanazon az oldalon kapja a szelet, akkor a szélhez KÖZELEBBI (luv) hajónak kell kitérnie a szél alatti (lee) hajó elől.",
      d: (g, t) => { sWater(g, t); sWind(g, 150, 26, 180, t); const u = (t % 8) / 8, x = 30 + u * 230; const lee = 150 - u * 30 - Math.max(0, u - .4) * 30, wwd = 104 - u * 30 - Math.max(0, u - .35) * 60;
        sBoat(g, x + 10, lee, 60 - Math.max(0, u - .4) * 30, "#d7f0d7", -1, .85); sBoat(g, x - 14, wwd, 60 - Math.max(0, u - .35) * 50, "#f6d5d5", -1, .85); kT(g, "luv – kitér", x - 14, wwd - 28, 9, SR); kT(g, "lee ✔", x + 10, lee + 28, 9, SGR); } },
    { s: "A verseny szabályai", t: "6. Aki előz, az kerül", say: "Ha hátulról utolérsz egy másik hajót, NEKED kell kikerülnöd – ő mehet tovább egyenesen.",
      d: (g, t) => { sWater(g, t); const u = (t % 8) / 8; sBoat(g, 150, 150 - u * 120, 0, "#d7f0d7", 1, .85); const B = sCurve([[150, 200], [152, 150], [196, 100], [200, 40], [160, -20]], 10), p = sAlong(B, cl01(u * 1.1)); sBoat(g, p.x, p.y, p.a, "#f6d5d5", 1, .85); kT(g, "az előző kerül", 246, 96, 9, SR); } },
    { s: "A verseny szabályai", t: "7. A bójánál hely jár a belsőnek", say: "Ha két hajó egyszerre ér a bójához, a bójához KÖZELEBBI (belső) hajónak helyet kell adni, hogy ő is megkerülhesse.",
      d: (g, t) => { sWater(g, t); sBuoy(g, 150, 70, 2, t); const u = (t % 9) / 9, I = sCurve([[190, 186], [176, 110], [160, 84], [138, 82], [120, 120], [110, 186]], 10), O = sCurve([[236, 190], [214, 110], [176, 52], [126, 52], [92, 100], [70, 186]], 10);
        const pi = sAlong(I, u), po = sAlong(O, u * .97); kL(g, sPart(O, u), "rgba(214,31,38,.6)", 2, [5, 4]); sBoat(g, pi.x, pi.y, pi.a, "#d7f0d7", -1, .8); sBoat(g, po.x, po.y, po.a, "#f6d5d5", -1, .8); kT(g, "a belsőnek hely jár", 60, 30, 10, SGR); } },
    { s: "A verseny szabályai", t: "8. Ne koccanj!", say: "Az ütközést mindenkinek kerülnie kell – még annak is, akinek elsőbbsége van. Aki hibázik, büntetőfordulót tesz (körbefordul), és utána mehet tovább. A legszebb verseny az, ahol mindenki sportszerű.",
      d: (g, t) => { sWater(g, t); const c = t % 10; if (c < 5) { const k = c / 5; sBoat(g, 60 + k * 70, 150 - k * 50, 50, SS, -1, .9); sBoat(g, 240 - k * 70, 150 - k * 50, -50, SS, 1, .9); if (k > .8) { g.fillStyle = "#ffcf3f"; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? 8 : 18 + Math.sin(t * 20) * 2; g.lineTo(150 + Math.cos(a) * r, 92 + Math.sin(a) * r); } g.closePath(); g.fill(); sBubble(g, 150, 60, "KOCC!"); } }
        else { const k = (c - 5) / 5; sBoat(g, 150 + Math.sin(k * TAU) * 40, 110 - Math.cos(k * TAU) * 40 + 0, 90 + k * 360, "#f6d5d5", 1, .9); kL(g, sCurve([[150, 70], [190, 110], [150, 150], [110, 110], [150, 70]], 8), SR, 2, [6, 5], -t * 20); kT(g, "büntetőforduló: egy teljes kör", 150, 178, 10, SR); } } },
    { s: "A verseny szabályai", t: "9. Befutó", say: "A célvonal is két jel között van. Aki az utolsó bója után elsőként halad át rajta az orrával, az nyer. Dudaszó jelzi a befutót!",
      d: (g, t) => { sWater(g, t); sBuoy(g, 50, 70, 0, t); sBuoy(g, 250, 70, 0, t); kL(g, [[50, 70], [250, 70]], SN, 5, [10, 10]); kL(g, [[50, 70], [250, 70]], "#fff", 5, [10, 10], 10); kT(g, "CÉL", 150, 56, 11);
        const u = (t % 7) / 7, y = 190 - u * 190; sBoat(g, 150, y, 0, "#fff3c4", 1, 1); if (y < 74 && y > 20) { sBubble(g, 150, 30, "DUDA! – NYERTÉL!", SGR); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + t; sCirc(g, 150 + Math.cos(a) * (30 + (74 - y)), 70 + Math.sin(a) * (16 + (74 - y) * .5), 2.2, ["#ffcf3f", SR, SGR, SW][i % 4]); } } } },
    /* 2. MENTÉS */
    { s: "Mentés", t: "Mentőmellény: mindig rajtad!", say: "A hajón mindig van rajtad mentőmellény, és be is van csatolva! A mellény akkor is a víz fölött tartja a fejed, ha elfáradsz vagy megijedsz. Húzd meg a hevedert, hogy ne csússzon le. A Balaton hirtelen viharos lesz, ezért a mellény a legjobb barátod.",
      d: (g, t) => { const gr = g.createLinearGradient(0, 0, 0, 190); gr.addColorStop(0, "#e9f3f7"); gr.addColorStop(1, "#cfe4ee"); g.fillStyle = gr; g.fillRect(0, 0, 300, 190); const c = t % 6, k = kEase(kSeg(c, .5, 2.2));
        sCirc(g, 150, 46, 17, "#e8bc96", SN, 1.5); sCirc(g, 144, 44, 2, SN); sCirc(g, 156, 44, 2, SN); g.strokeStyle = SN; g.lineWidth = 1.5; g.beginPath(); g.arc(150, 50, 6, .2, Math.PI - .2); g.stroke();
        g.fillStyle = "#2f6db0"; uiRR(g, 124, 64, 52, 74, 12); g.fill(); g.fillRect(112, 68, 12, 50); g.fillRect(176, 68, 12, 50); g.fillStyle = "#34495e"; g.fillRect(130, 138, 16, 44); g.fillRect(154, 138, 16, 44);
        g.save(); g.translate(0, (1 - k) * -90); g.globalAlpha = .3 + .7 * k; g.fillStyle = SR; uiRR(g, 120, 62, 26, 66, 8); g.fill(); uiRR(g, 154, 62, 26, 66, 8); g.fill(); g.fillStyle = "#14161b"; g.fillRect(120, 108, 60, 9); g.restore();
        const bk = kSeg(c, 2.4, 3); if (bk > 0) { g.fillStyle = "#0c0c0d"; g.fillRect(143 + (1 - bk) * 20, 105, 14, 14); if (bk >= 1 && c < 4) sBubble(g, 210, 100, "KATT!", SGR); }
        if (c > 3.4) { kL(g, [[100, 112], [120, 112]], SGR, 3); kL(g, [[180, 112], [200, 112]], SGR, 3); kT(g, "be van csatolva ✔", 150, 176, 11, SGR, "center", 900); } } },
    { s: "Mentés", t: "Ember a vízben!", say: "Ha valaki a vízbe esik: azonnal kiáltsd hangosan, hogy „Ember a vízben!”. Egy valaki végig csak őt nézi, és a karjával folyamatosan rámutat, hogy el ne veszítsük szem elől. Dobjatok neki mentőövet vagy bármit, ami úszik – minél hamarabb, annál jobb!",
      d: (g, t) => { sWater(g, t); sWind(g, 40, 34, 180, t); const c = t % 9, bx = 60 + c * 20; sBoat(g, bx, 110, 90, SS, -1, 1); const fall = kSeg(c, 1, 1.6);
        const sx = 92 + 0 * c, sy = 118; if (c > 1) { sSwim(g, sx, sy, t, .9); if (c < 1.8) { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; sCirc(g, sx + Math.cos(a) * 14 * fall, sy + Math.sin(a) * 8 * fall, 2, "#fff"); } } }
        if (c > 1.4 && c < 5) sBubble(g, bx + 10, 74, "EMBER A VÍZBEN!"); if (c > 2) kL(g, [[bx - 6, 106], [sx + 6, sy - 4]], SG, 2, [4, 3], -t * 20);
        const th = kSeg(c, 3, 4.2); if (th > 0) { const rx = bx - 10 + (sx + 12 - (bx - 10)) * th, ry = 104 + (sy - 2 - 104) * th - Math.sin(th * Math.PI) * 40; sRing(g, rx, ry, .9); if (th > .5) kL(g, [[bx - 8, 106], [rx, ry]], "#e8dcc0", 1.2); } } },
    { s: "Mentés", t: "Visszafordulás a vízben lévőhöz", say: "A hajóval félszélben kicsit eltávolodunk, hogy legyen helyünk fordulni. Fordulunk, és lassan, a szél alól közelítünk vissza, hogy a végén a vitorlák lobogjanak, és a hajó megálljon mellette. A vízben lévőt a hajó szél alatti oldalán, a hátsó részén emeljük ki – sosem a motor vagy a kormánylapát közelében!",
      d: (g, t) => { sWater(g, t); sWind(g, 270, 30, 180, t); sSwim(g, 150, 70, t, .85); const C = sCurve([[150, 80], [100, 96], [56, 120], [44, 160], [86, 176], [130, 150], [146, 104], [150, 92]], 10), u = (t % 12) / 12, p = sAlong(C, u);
        kL(g, sPart(C, u), SG, 2.4, [6, 5]); sBoat(g, p.x, p.y, p.a, SS, p.x < 100 ? 1 : -1, .75, u > .82); if (u > .86) sBubble(g, 196, 110, "megállunk mellette ✔", SGR); kT(g, "1 · eltávolodunk", 54, 90, 8, SN, "left"); kT(g, "2 · fordulunk", 20, 182, 8, SN, "left"); kT(g, "3 · szél alól, lassan vissza", 170, 166, 8, SN, "left"); } },
    { s: "Mentés", t: "Nyújts – dobj – evezz – és csak végül ússz!", say: "Ha a partról vagy a mólóról látod, hogy valaki bajban van: először NYÚJTS neki egy evezőt, botot vagy kötelet. Ha nem éred el, DOBJ neki mentőövet. Ha messze van, EVEZZ oda csónakkal. Beúszni csak a legvégső esetben szabad, és csak ha jól úszol és mentőeszköz van nálad – különben két ember lesz bajban egy helyett!",
      d: (g, t) => { const st = Math.floor((t % 16) / 4), c = (t % 4) / 4; g.fillStyle = "#b9dbe8"; g.fillRect(0, 0, 300, 190); g.fillStyle = "#b98a55"; g.fillRect(0, 120, 90, 70); sWater(g, t); g.fillStyle = "#b98a55"; g.fillRect(0, 118, 88, 72); g.fillStyle = "#8a6a4a"; for (let x = 4; x < 88; x += 12) g.fillRect(x, 118, 2, 72);
        const lab = ["1 · NYÚJTS", "2 · DOBJ", "3 · EVEZZ", "4 · ÚSSZ – csak végső esetben!"][st]; kT(g, lab, 150, 20, 14, st === 3 ? SR : SN, "center", 900);
        ["NYÚJTS", "DOBJ", "EVEZZ", "ÚSSZ"].forEach((s, i) => { kT(g, s, 30 + i * 70, 178, 8, i === st ? (i === 3 ? SR : SGR) : "rgba(20,29,77,.35)", "left", 900); });
        const sx = st === 0 ? 130 : st === 1 ? 170 : 230, sy = 100; sSwim(g, sx, sy, t, .9); sMan(g, { head: [70, 82], sh: [70, 92], hip: [70, 112], elb: [80, 98], hand: [92, 100], knee: [70, 124], foot: [70, 118] }, "#2f6db0");
        if (st === 0) kL(g, [[88, 100], [88 + 34 * kEase(cl01(c * 2)), 100 - 2]], "#8a5a30", 3.5); if (st === 1) { const k = kEase(cl01(c * 1.5)), rx = 90 + (sx - 12 - 90) * k, ry = 98 - Math.sin(k * Math.PI) * 40 + (sy - 98) * k; sRing(g, rx, ry, .8); kL(g, [[92, 100], [rx, ry]], "#e8dcc0", 1); }
        if (st === 2) { const bx = 100 + c * (sx - 130); g.fillStyle = "#c98f6b"; g.beginPath(); g.ellipse(bx, 112, 22, 8, 0, 0, TAU); g.fill(); g.strokeStyle = SN; g.stroke(); kL(g, [[bx - 10, 104], [bx - 26, 120 + Math.sin(t * 6) * 3]], "#8a5a30", 2); kL(g, [[bx + 10, 104], [bx + 26, 120 - Math.sin(t * 6) * 3]], "#8a5a30", 2); }
        if (st === 3) { sSwim(g, 100 + c * (sx - 120), 104, t + 1, .8); g.strokeStyle = SR; g.lineWidth = 3; g.beginPath(); g.arc(270, 46, 14, 0, TAU); g.stroke(); kT(g, "!", 270, 47, 16, SR, "center", 900); } } },
    { s: "Mentés", t: "Ha felborultál: maradj a hajónál!", say: "Ha a hajó felborul, ne ijedj meg, és ne ússz a part felé – a part mindig messzebb van, mint amilyennek látszik! Kapaszkodj a hajóba: az úszik, és a nagy hajótestet a mentők sokkal könnyebben észreveszik, mint egy úszó fejet. Számold meg, megvan-e mindenki!",
      d: (g, t) => { sWater(g, t); const r = Math.sin(t * 1.4) * .04; g.save(); g.translate(150, 104); g.rotate(r); g.fillStyle = "#fff"; g.strokeStyle = SN; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 70, 16, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#3b4a66"; g.fillRect(-4, -26, 8, 12); g.restore();
        kL(g, [[150, 112], [80, 160]], SN, 3); g.fillStyle = "rgba(214,31,38,.7)"; g.beginPath(); g.moveTo(150, 112); g.lineTo(80, 160); g.lineTo(130, 158); g.closePath(); g.fill();
        sSwim(g, 214, 102, t, .85); sSwim(g, 96, 96, t + 2, .85); kT(g, "kapaszkodj a hajóba ✔", 150, 66, 11, SGR, "center", 900);
        g.globalAlpha = .4 + .3 * Math.sin(t * 3); kT(g, "PART →", 262, 170, 11, SN); g.globalAlpha = 1; kL(g, [[236, 162], [290, 178]], SR, 3); kL(g, [[236, 178], [290, 162]], SR, 3); } },
    { s: "Mentés", t: "Viharjelzés: figyeld a sárga villogást!", say: "A Balaton partján sárga lámpák villognak, ha jön a vihar. Első fok: percenként 45-öt villan – figyelj, a part közelében maradj. Második fok: percenként 90-et villan, ez már gyors villogás – ilyenkor azonnal irány a part, fürödni és vitorlázni tilos! A felhők és a hirtelen hideg szél is figyelmeztetnek.",
      d: (g, t) => { const two = (t % 12) > 6, per = two ? 60 / 90 : 60 / 45, on = (t % per) / per < .4; const gr = g.createLinearGradient(0, 0, 0, 190); gr.addColorStop(0, two ? "#5d6b7a" : "#9fb6c6"); gr.addColorStop(1, "#7fa3b8"); g.fillStyle = gr; g.fillRect(0, 0, 300, 190);
        g.fillStyle = "rgba(60,70,90,.6)"; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse((i * 80 + t * 8) % 380 - 40, 26 + (i % 2) * 10, 50, 16, 0, 0, TAU); g.fill(); }
        g.fillStyle = "#ddd"; g.fillRect(56, 60, 8, 110); sCirc(g, 60, 52, 14, on ? "#ffe066" : "#6b5a20", SN, 2); if (on) { g.fillStyle = "rgba(255,224,102,.35)"; g.beginPath(); g.arc(60, 52, 36, 0, TAU); g.fill(); }
        kT(g, two ? "II. FOK · 90 / perc" : "I. FOK · 45 / perc", 196, 70, 15, two ? SR : "#8a6a10", "center", 900); kT(g, two ? "irány a part! vízre menni tilos" : "figyelj, maradj a part közelében", 196, 92, 10, SN);
        const u = (t % 6) / 6; sBoat(g, two ? 260 - u * 120 : 200 + Math.sin(t) * 10, 150, two ? -90 : 90, SS, two ? 1 : -1, .8); g.fillStyle = "#b98a55"; g.fillRect(100, 168, 200, 22); } },
    { s: "Mentés", t: "Segélyhívás: 112", say: "Ha baj van, hívd a 112-t – ingyenes, és térerő nélkül is próbálkozik. Mondd el nyugodtan: HOL vagy – például Zamárdi, a kikötőtől balra, a bójánál; MI történt; HÁNY ember van bajban. Ne tedd le, amíg a diszpécser nem mondja!",
      d: (g, t) => { g.fillStyle = "#e9f3f7"; g.fillRect(0, 0, 300, 190); const s = 1 + Math.sin(t * 5) * .04; g.save(); g.translate(78, 98); g.scale(s, s); g.fillStyle = "#14161b"; uiRR(g, -30, -58, 60, 116, 10); g.fill(); g.fillStyle = "#cfe8ff"; uiRR(g, -24, -46, 48, 84, 4); g.fill(); kT(g, "112", 0, -10, 20, SR, "center", 900); sCirc(g, 0, 26, 9, SGR); g.restore();
        for (let k = 0; k < 3; k++) { const r = 40 + ((t * 30 + k * 18) % 54); g.strokeStyle = `rgba(214,31,38,${1 - (r - 40) / 54})`; g.lineWidth = 2; g.beginPath(); g.arc(78, 98, r, -.6, .6); g.stroke(); }
        [["HOL?", "Zamárdi, kikötő, bója…"], ["MI TÖRTÉNT?", "felborult, vízbe esett…"], ["HÁNYAN?", "1 ember, 2 gyerek…"]].forEach(([a, b], i) => { const vis = (t % 9) > i * 2; g.globalAlpha = vis ? 1 : .2; kT(g, a, 150, 50 + i * 44, 13, SR, "left", 900); kT(g, b, 150, 66 + i * 44, 9, SN, "left", 600); g.globalAlpha = 1; }); } },
    /* 3. ELSŐSEGÉLY */
    { s: "Elsősegély", t: "Először a biztonság, aztán: szólítsd meg!", say: "Ha kihúztuk a vízből: először nézd meg, biztonságos-e a hely – ne legyen még egy áldozat. Aztán térdelj le mellé, rázd meg finoman a vállát, és szólítsd meg hangosan: „Hall engem?” Ha nem válaszol: kiálts segítségért, és nézd meg, lélegzik-e: hajtsd hátra a fejét, emeld meg az állát, és 10 másodpercig figyeld: emelkedik-e a mellkasa, hallod-e, érzed-e a levegőt.",
      d: (g, t) => { g.fillStyle = "#e9f3f7"; g.fillRect(0, 0, 300, 190); g.fillStyle = "#c9b48a"; g.fillRect(0, 154, 300, 36); sMan(g, LIE, "#2f6db0"); const c = t % 10;
        const sh = c < 4 ? Math.sin(t * 14) * 2 : 0; sMan(g, { head: [104, 92], sh: [110, 104], hip: [128, 138], elb: [100, 122], hand: [88 + sh, 138], knee: [150, 150], foot: [176, 152] }, "#c8102e");
        if (c < 4) sBubble(g, 124, 76, "HALL ENGEM?", SN); else { sBubble(g, 124, 76, "nézd · hallgasd · érezd", SW); const k = Math.min(10, Math.floor(c - 4) * 2 + 1); kT(g, `${k} mp`, 240, 40, 16, SW, "center", 900); g.strokeStyle = SW; g.lineWidth = 2; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(80, 132); g.lineTo(104, 100); g.stroke(); g.setLineDash([]); } } },
    { s: "Elsősegély", t: "Ha nem lélegzik: 112, és újraélesztés", say: "Ha nem lélegzik normálisan: hívd vagy hívasd a 112-t, és kérj defibrillátort, ha van a közelben. Vízből mentettnél, ha tanultad, kezdd 5 befúvással: hajtsd hátra a fejét, fogd be az orrát, és lassan fújj a szájába, amíg a mellkasa megemelkedik. Utána jön a mellkasnyomás.",
      d: (g, t) => { g.fillStyle = "#e9f3f7"; g.fillRect(0, 0, 300, 190); g.fillStyle = "#c9b48a"; g.fillRect(0, 154, 300, 36); const c = t % 10, n = Math.min(5, Math.floor(c / 1.6) + 1), inB = (c % 1.6) < 1;
        const L2 = lerpP(LIE, LIE, 0); L2.sh = [86, 142 - (inB ? 3 : 0)]; sMan(g, L2, "#2f6db0"); sMan(g, { head: [72, 120], sh: [92, 116], hip: [124, 134], elb: [80, 132], hand: [72, 140], knee: [146, 150], foot: [172, 152] }, "#c8102e");
        if (inB) for (let i = 0; i < 3; i++) sCirc(g, 72 - i * 3, 128 - i * 4 + (c % 1) * -6, 1.6, "rgba(45,111,158,.7)"); kT(g, `befúvás: ${n} / 5`, 220, 50, 15, SW, "center", 900); kT(g, "vízből mentettnél előbb 5 befúvás", 220, 72, 9, SN);
        kT(g, "📞 112 · kérj defibrillátort!", 220, 100, 10, SR, "center", 900); } },
    { s: "Elsősegély", t: "Mellkasnyomás: 30 nyomás, 2 befúvás", say: "Térdelj mellé, a két tenyered tedd egymásra a mellkasa közepén. Nyújtott karral nyomd le 5–6 centi mélyen, percenként 100–120-szor – olyan ütemben, mint a Stayin' Alive című dal. Harminc nyomás után két befúvás, és így tovább, amíg meg nem jön a mentő, vagy meg nem mozdul. Ne félj: azzal segítesz a legtöbbet, ha csinálod!",
      d: (g, t) => { g.fillStyle = "#e9f3f7"; g.fillRect(0, 0, 300, 190); g.fillStyle = "#c9b48a"; g.fillRect(0, 154, 300, 36); const per = 60 / 110, ph = (t % per) / per, push = Math.sin(ph * Math.PI) ** 2, cnt = Math.floor(t / per) % 32 + 1;
        const L2 = Object.assign({}, LIE); L2.sh = [86, 142 + push * 2]; sMan(g, L2, "#2f6db0"); const hy = 112 + push * 8; sMan(g, { head: [100, hy - 30], sh: [102, hy - 18], hip: [128, 140], elb: [101, hy - 6], hand: [100, hy + 22], knee: [150, 150], foot: [176, 152] }, "#c8102e");
        kT(g, cnt <= 30 ? String(cnt) : "befúvás", 228, 60, cnt <= 30 ? 34 : 16, cnt <= 30 ? SR : SW, "center", 900); kT(g, "100–120 / perc · 5–6 cm mélyen", 228, 96, 9, SN); kT(g, "30 nyomás : 2 befúvás", 228, 112, 10, SN, "center", 900);
        g.fillStyle = SR; g.globalAlpha = .3 + push * .7; g.beginPath(); g.arc(228, 140, 6 + push * 4, 0, TAU); g.fill(); g.globalAlpha = 1; } },
    { s: "Elsősegély", t: "Ha lélegzik: stabil oldalfekvés", say: "Ha lélegzik, de nem ébred fel: fordítsd az oldalára, stabil oldalfekvésbe. A felső lábát hajlítsd be, a kezét tedd az arca alá, a fejét kicsit hajtsd hátra, hogy a víz és a hányás ki tudjon folyni. Takard be, maradj mellette, és figyeld folyamatosan a légzését, amíg a mentők meg nem érkeznek.",
      d: (g, t) => { g.fillStyle = "#e9f3f7"; g.fillRect(0, 0, 300, 190); g.fillStyle = "#c9b48a"; g.fillRect(0, 154, 300, 36); const c = t % 9, k = kEase(kSeg(c, 1, 4)); sMan(g, lerpP(LIE, SIDE, k), "#2f6db0");
        if (c > 4.5) { g.fillStyle = "rgba(200,60,60,.75)"; g.beginPath(); g.moveTo(100, 128); g.quadraticCurveTo(140, 116 + Math.sin(t) * 1, 180, 132); g.lineTo(180, 150); g.lineTo(100, 150); g.closePath(); g.fill(); kT(g, "takard be, figyeld a légzését", 200, 40, 11, SGR, "center", 900); }
        sCirc(g, 92, 154, 3 + Math.sin(t * 2) * .8, "rgba(45,111,158,.5)"); } },
    { s: "Elsősegély", t: "Kihűlés: le a vizes ruhát, jöjjön a takaró", say: "A Balaton vize tavasszal és ősszel nagyon hideg, a kihűlés veszélyes. Vidd szélvédett helyre, vedd le róla a vizes ruhát, és csavard be száraz takaróba vagy mentőfóliába. Ha magánál van, adhatsz neki langyos, édes teát. Ne dörzsöld a bőrét, és ne tedd forró vízbe!",
      d: (g, t) => { g.fillStyle = "#e9f3f7"; g.fillRect(0, 0, 300, 190); const c = t % 10, k = kSeg(c, 2, 5), T = 34 + k * 2.6; sMan(g, { head: [110, 60], sh: [110, 76], hip: [110, 118], elb: [96, 98], hand: [104, 112], knee: [124, 134], foot: [124, 170] }, k < .3 ? "#5a7fa8" : "#2f6db0");
        if (k > 0) { g.fillStyle = "rgba(214,170,60,.85)"; g.beginPath(); g.moveTo(84, 70 + (1 - k) * 120); g.quadraticCurveTo(110, 60 + (1 - k) * 120, 138, 70 + (1 - k) * 120); g.lineTo(140, 172); g.lineTo(82, 172); g.closePath(); g.fill(); }
        if (c < 2) for (let i = 0; i < 6; i++) sCirc(g, 96 + i * 6, 100 + ((t * 30 + i * 13) % 60), 1.6, "#5ab0e0"); g.fillStyle = "#ddd"; uiRR(g, 230, 40, 14, 100, 7); g.fill(); g.fillStyle = T < 35.5 ? SW : SR; g.fillRect(234, 140 - (T - 33) * 18, 6, (T - 33) * 18); sCirc(g, 237, 146, 10, T < 35.5 ? SW : SR);
        kT(g, `${T.toFixed(1).replace(".", ",")} °C`, 237, 30, 11, SN); if (c > 5) { g.fillStyle = "#c98f6b"; uiRR(g, 160, 120, 18, 22, 3); g.fill(); for (let i = 0; i < 3; i++) kL(g, [[164 + i * 5, 116 - ((t * 10 + i * 4) % 12)], [166 + i * 5, 106 - ((t * 10 + i * 4) % 12)]], "rgba(150,150,150,.6)", 1.5); kT(g, "langyos tea", 169, 152, 8); } } },
    { s: "Elsősegély", t: "Nap, hőség és kisebb sebek", say: "Vitorlázáskor a víz visszaveri a napot, ezért könnyű leégni. Viselj sapkát, napszemüveget, kenj naptejet, és igyál sokat. Ha valaki szédül, fáj a feje, és forró a bőre: vidd árnyékba, hűtsd vizes ruhával, itasd hűvös vízzel. Ha megvágtad magad egy kagylón vagy a szerelvényen: tiszta kötszert szoríts rá, és kösd be.",
      d: (g, t) => { g.fillStyle = "#fdf3d8"; g.fillRect(0, 0, 300, 190); const c = t % 10; sCirc(g, 50, 40, 18 + Math.sin(t * 2) * 1.5, "#ffcf3f"); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * .3; kL(g, [[50 + Math.cos(a) * 24, 40 + Math.sin(a) * 24], [50 + Math.cos(a) * 32, 40 + Math.sin(a) * 32]], "#ffb300", 3); }
        if (c < 5) { sMan(g, { head: [120, 80], sh: [120, 96], hip: [120, 136], elb: [108, 116], hand: [112, 130], knee: [116, 156], foot: [116, 182] }, "#2f6db0"); g.fillStyle = "#e8d29a"; g.beginPath(); g.ellipse(120, 74, 16, 4, 0, 0, TAU); g.fill(); g.fillRect(112, 64, 16, 10);
          sCirc(g, 132, 112, 0); g.fillStyle = "#5ab0e0"; uiRR(g, 136, 108, 8, 18, 2); g.fill(); ["sapka", "naptej", "víz", "árnyék"].forEach((s, i) => kT(g, "✔ " + s, 200, 60 + i * 18, 11, SGR, "left", 800)); }
        else { const k = kSeg(c, 5.5, 8); g.fillStyle = "#e8bc96"; uiRR(g, 80, 90, 140, 30, 15); g.fill(); kL(g, [[136, 100], [158, 110]], SR, 2.5); g.fillStyle = "#fff"; g.globalAlpha = k; uiRR(g, 124, 88, 46 * k + 2, 34, 4); g.fill(); g.globalAlpha = 1; kT(g, "tiszta kötszer, szorítsd rá", 150, 150, 11, SN, "center", 900); } } },
    { s: "Búcsú", t: "Most irány a víz!", say: "Ügyes voltál! Ezek a legfontosabb szabályok. Az elsősegélyt igazán egy tanfolyamon lehet megtanulni – ott babán gyakorolhatod is, kérd meg a szüleidet, hogy vigyenek el egyre. Most pedig: mentőmellényt fel, és irány az oktatópálya! Jó szelet!",
      d: (g, t) => { sWater(g, t); sWind(g, 40, 40, 180, t); const u = (t % 8) / 8; sBoat(g, 60 + u * 200, 150 - u * 110, 40, "#fff3c4", -1, 1.2); sBuoy(g, 250, 40, 1, t); kT(g, "JÓ SZELET!", 150, 100, 26, SN, "center", 900); } }
  ];
  /* ---- a házikó (cölöpökön, a móló jobb oldalán) ---- */
  function schoolBuild(env) {
    const G = new THREE.Group(); env.add(G); SCH.G = G; const F = .66, plank = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#a07a52"; g.fillRect(0, 0, w, h); for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#946e48" : "#a9835b"; g.fillRect(0, k * h / 8, w, h / 8 - 3); g.fillStyle = "rgba(40,24,10,.55)"; g.fillRect(0, (k + 1) * h / 8 - 3, w, 3); } }, { repeat: [2, 4] });
    const deckM = std({ map: plank, roughness: .9 }), wallM = std({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#e8e2d2"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = "rgba(0,0,0,.08)"; g.fillRect(x, 0, 3, h); } }, { repeat: [3, 1] }), roughness: .85 }),
      trim = std({ color: "#0b3a5e", roughness: .6 }), roofM = std({ color: "#7a2e22", roughness: .8 }), post = std({ color: "#5d4630", roughness: .95 });
    /* terasz-padló a mólótól a házig + cölöpök */
    mesh(new THREE.BoxGeometry(9, .22, 7.4).translate(6, .55, 1.2), deckM, G); for (let x = 2; x <= 10; x += 2.6) for (let z = -2.2; z <= 4.6; z += 3.3) mesh(new THREE.CylinderGeometry(.12, .14, 2.4, 8).translate(x, -.6, z), post, G);
    /* korlát a terasz szélén */
    [[1.6, 4.85, 10.4, 4.85], [10.4, -2.4, 10.4, 4.85]].forEach(([x0, z0, x1, z1]) => { const L = Math.hypot(x1 - x0, z1 - z0); const r = mesh(new THREE.BoxGeometry(.06, .06, L), post, G); r.position.set((x0 + x1) / 2, F + .9, (z0 + z1) / 2); r.rotation.y = Math.atan2(x1 - x0, z1 - z0);
      for (let k = 0; k <= L; k += 1.2) mesh(new THREE.BoxGeometry(.06, .9, .06).translate(x0 + (x1 - x0) * k / L, F + .45, z0 + (z1 - z0) * k / L), post, G); });
    /* falak: 6 × 5,5 m, 3 m magas, nyugati oldalon ajtó (1,2 × 2,2 m), ablakok */
    const B = SCH_BOX, Hh = 3, th = .14, wall = (x, z, w, d, h, y) => mesh(new THREE.BoxGeometry(w, h, d).translate(x, F + (y || 0) + h / 2, z), wallM, G);
    wall((B.x0 + B.x1) / 2, B.z0, B.x1 - B.x0, th, Hh); wall(B.x1, (B.z0 + B.z1) / 2, th, B.z1 - B.z0, Hh);
    wall(B.x0 + .9, B.z1, 1.8, th, Hh); wall(B.x1 - .9, B.z1, 1.8, th, Hh); wall((B.x0 + B.x1) / 2, B.z1, 2.4, th, .9); wall((B.x0 + B.x1) / 2, B.z1, 2.4, th, .7, 2.3);   /* déli ablak */
    const dz0 = 1.6, dz1 = 2.8; wall(B.x0, (B.z0 + dz0) / 2, th, dz0 - B.z0, Hh); wall(B.x0, (dz1 + B.z1) / 2, th, B.z1 - dz1, Hh); wall(B.x0, (dz0 + dz1) / 2, th, dz1 - dz0, .8, 2.2);
    const glass = new THREE.MeshStandardMaterial({ color: "#bfe3f5", roughness: .05, metalness: .2, transparent: true, opacity: .25, depthWrite: false }); W.disposables.push(glass); mesh(new THREE.PlaneGeometry(2.4, 1.4).translate((B.x0 + B.x1) / 2, F + 1.6, B.z1), glass, G);
    [[B.x0 - .02, (dz0 + dz1) / 2, Math.PI / 2, 1.3, 2.3, F + 1.15]].forEach(([x, z, ry, w, h, y]) => { const fr = new THREE.Group(); fr.position.set(x, y, z); fr.rotation.y = ry; G.add(fr); mesh(new THREE.BoxGeometry(w + .12, .1, .2).translate(0, h / 2, 0), trim, fr); [-1, 1].forEach((s) => mesh(new THREE.BoxGeometry(.08, h, .2).translate(s * (w / 2 + .02), 0, 0), trim, fr)); });
    mesh(new THREE.BoxGeometry(2.6, .08, .22).translate((B.x0 + B.x1) / 2, F + 2.3, B.z1), trim, G); mesh(new THREE.BoxGeometry(2.6, .08, .22).translate((B.x0 + B.x1) / 2, F + .9, B.z1), trim, G);
    /* nyeregtető */
    const rw = (B.z1 - B.z0) / 2 + .5, rl = B.x1 - B.x0 + .8; [-1, 1].forEach((s) => { const r = mesh(new THREE.BoxGeometry(rl, .1, Math.hypot(rw, 1.2)), roofM, G); r.position.set((B.x0 + B.x1) / 2, F + Hh + .6, (B.z0 + B.z1) / 2 + s * rw / 2); r.rotation.x = s * Math.atan2(1.2, rw); });
    [B.x0, B.x1].forEach((x) => { const sh = new THREE.Shape(); sh.moveTo(-rw + .5, 0); sh.lineTo(rw - .5, 0); sh.lineTo(0, 1.15); sh.closePath(); const gg = new THREE.ShapeGeometry(sh); gg.rotateY(Math.PI / 2); gg.translate(x, F + Hh, (B.z0 + B.z1) / 2); mesh(gg, std({ color: "#e8e2d2", roughness: .85, side: THREE.DoubleSide }), G); });
    mesh(new THREE.BoxGeometry(B.x1 - B.x0, .05, B.z1 - B.z0).translate((B.x0 + B.x1) / 2, F + Hh, (B.z0 + B.z1) / 2), std({ color: "#f3efe4", roughness: .9 }), G);   /* mennyezet */
    /* FELIRAT a bejárat fölött (a móló felé) */
    const sg = canvasTex(1024, 300, (g, w, h) => { g.fillStyle = "#0b2f5e"; g.fillRect(0, 0, w, h); g.strokeStyle = "#d4a13a"; g.lineWidth = 12; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = "#ffd166"; g.font = `900 112px ${UIF}`; g.textAlign = "center"; g.fillText("VITORLÁS OKTATÁS", w / 2, 150); g.fillStyle = "#fff"; g.font = `700 46px ${UIF}`; g.fillText("Zephyr vitorlásiskola · gyere be!", w / 2, 236); });
    const sgn = mesh(new THREE.PlaneGeometry(3.6, 1.05), basic({ map: sg }), G); sgn.position.set(B.x0 - .09, F + 3.35, (B.z0 + B.z1) / 2); sgn.rotation.y = -Math.PI / 2;
    const sg2 = mesh(new THREE.PlaneGeometry(3.2, .94), basic({ map: sg }), G); sg2.position.set((B.x0 + B.x1) / 2, F + 3.3, B.z1 + .09);
    /* mentőöv a falon, kis padok bent */
    { const ring = mesh(new THREE.TorusGeometry(.32, .08, 10, 24), std({ color: "#ff7a1a", roughness: .5 }), G); ring.position.set(B.x0 - .1, F + 1.6, dz1 + .7); ring.rotation.y = Math.PI / 2; }
    [[5.4, 2.9], [7.6, 2.9]].forEach(([x, z]) => { mesh(new THREE.BoxGeometry(1.5, .06, .36).translate(x, F + .42, z), deckM, G); [-.6, .6].forEach((dx) => mesh(new THREE.BoxGeometry(.06, .42, .3).translate(x + dx, F + .21, z), post, G)); });
    /* poszterek: csomók és a viharjelző */
    const poster = (lines, x, z, ry, col) => { const tx = canvasTex(512, 640, (g, w, h) => { g.fillStyle = "#fbf6e8"; g.fillRect(0, 0, w, h); g.fillStyle = col; g.fillRect(0, 0, w, 120); g.fillStyle = "#fff"; g.font = `900 52px ${UIF}`; g.textAlign = "center"; g.fillText(lines[0], w / 2, 82); g.fillStyle = "#14161b"; g.font = `700 36px ${UIF}`; lines.slice(1).forEach((s, i) => g.fillText(s, w / 2, 200 + i * 70)); });
      const p = mesh(new THREE.PlaneGeometry(.8, 1), basic({ map: tx }), G); p.position.set(x, F + 1.7, z); p.rotation.y = ry; };
    poster(["CSOMÓK", "nyolcas", "bak", "kikötő-", "bowline", "szorító"], B.x1 - .08, .2, -Math.PI / 2, "#0b3a5e"); poster(["112", "HOL?", "MI TÖRTÉNT?", "HÁNYAN?", "ne tedd le!"], B.x1 - .08, 1.8, -Math.PI / 2, "#c8102e");
    /* FALITÁBLA (a tanóra mozgó képei), fakerettel */
    const cv = document.createElement("canvas"); cv.width = 1800; cv.height = 1000; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; W.disposables.push(tex);
    const bw = 3.5, bh = bw * 1000 / 1800, bd = mesh(new THREE.PlaneGeometry(bw, bh), basic({ map: tex }), G); bd.position.set(6.7, F + 1.75, B.z0 + th / 2 + .03);
    [[0, bh / 2 + .05, bw + .2, .1], [0, -bh / 2 - .05, bw + .2, .1], [-bw / 2 - .05, 0, .1, bh + .2], [bw / 2 + .05, 0, .1, bh + .2]].forEach(([x, y, w, h]) => mesh(new THREE.BoxGeometry(w, h, .08).translate(6.7 + x, F + 1.75 + y, B.z0 + th / 2 + .04), std({ color: "#6b4a2a", roughness: .7 }), G));
    mesh(new THREE.BoxGeometry(bw, .05, .14).translate(6.7, F + 1.75 - bh / 2 - .12, B.z0 + th / 2 + .08), std({ color: "#6b4a2a", roughness: .7 }), G);   /* krétatartó */
    SCH.cv = cv; SCH.g = cv.getContext("2d"); SCH.tex = tex; SCH.board = bd; schoolDraw(0);
    /* a NAGYPAPA (ugyvedhez.hu család-figura) a tábla bal oldalán, a nézők felé fordulva */
    try { const c = new FAM.Character("nagypapa", { expr: "vidam" }); famStd(c.root); c.blob.visible = false; c.root.position.set(4.55, F, B.z0 + .85); c.root.rotation.y = .55; c.root.scale.setScalar(1.12); c.root.userData.noMerge = true; G.add(c.root); SCH.gp = c; } catch (e) { console.warn("nagypapa", e); }
    /* járható felületek: terasz és a ház padlója */
    hbTpSurf(env, 2.5, 1.2, 2, 7.2); hbTpSurf(env, 6.5, 1.25, 5.6, 5.1); hbTpSurf(env, 9.95, 1.2, .9, 7.2);
    SCH.built = true;
  }
  function schoolDraw(dt) {
    const g = SCH.g; if (!g) return; const L = LESSONS[SCH.i] || LESSONS[0], W2 = 1800, H2 = 1000;
    const bg = g.createLinearGradient(0, 0, 0, H2); bg.addColorStop(0, "#21443c"); bg.addColorStop(1, "#16302a"); g.fillStyle = bg; g.fillRect(0, 0, W2, H2);
    g.fillStyle = "rgba(255,255,255,.035)"; for (let i = 0; i < 40; i++) g.fillRect((i * 337) % W2, (i * 191) % H2, 120, 2);   /* krétapor */
    const secC = { "Üdvözlés": "#e9c46a", "A verseny szabályai": "#7cc6ff", "Mentés": "#ff9a5a", "Elsősegély": "#ff6b6b", "Búcsú": "#7CFC9A" }[L.s] || "#fff";
    g.fillStyle = secC; uiRR(g, 40, 30, 560, 70, 35); g.fill(); g.fillStyle = "#14161b"; g.font = `900 38px ${UIF}`; g.fillText(L.s.toUpperCase(), 70, 79); g.fillStyle = "rgba(255,255,255,.8)"; g.font = `700 34px ${UIF}`; g.textAlign = "right"; g.fillText(`${SCH.i + 1} / ${LESSONS.length}`, W2 - 50, 78); g.textAlign = "left";
    /* a mozgó ábra */
    g.save(); g.translate(40, 140); g.save(); uiRR(g, 0, 0, 1020, 646, 26); g.clip(); g.scale(1020 / 300, 646 / 190); try { L.d(g, SCH.t); } catch (e) { console.warn("ábra", e); } g.restore(); g.lineWidth = 6; g.strokeStyle = "rgba(255,255,255,.85)"; uiRR(g, 0, 0, 1020, 646, 26); g.stroke(); g.restore();
    /* cím és szöveg krétával */
    g.fillStyle = "#fff8e0"; g.font = `900 46px ${UIF}`; const nt = uiWrap(g, L.t, 1090, 186, 680, 54, 3) || 1;
    g.fillStyle = "rgba(255,255,255,.9)"; g.font = `600 31px ${UIF}`; uiWrap(g, L.say, 1090, 186 + nt * 54 + 34, 680, 41, 15);
    /* haladás: pöttyök szakaszonként */
    LESSONS.forEach((q, i) => { const x = 60 + i * (1700 / LESSONS.length), on = i === SCH.i; g.fillStyle = on ? "#ffd166" : i < SCH.i ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.22)"; g.beginPath(); g.arc(x, 940, on ? 15 : 9, 0, TAU); g.fill(); });
    const dur = schoolDur(SCH.i); g.fillStyle = "rgba(255,209,102,.8)"; g.fillRect(40, 900, 1020 * cl01(SCH.t / dur), 8);
    SCH.tex.needsUpdate = true; void dt;
  }
  const schoolDur = (i) => Math.max(10, LESSONS[i].say.length / 13.5 + 3);
  /* felolvasás magyar géphanggal (csak ha van magyar hang – különben csak a felirat) */
  function schoolSpeak(txt) { try { const ss = window.speechSynthesis; if (!ss) return false; ss.cancel(); if (!SCH.voice || !txt) return false; const v = ss.getVoices().find((q) => /^hu/i.test(q.lang)); if (!v) return false;
      const u = new SpeechSynthesisUtterance(txt.replace(/[„”]/g, "")); u.voice = v; u.lang = v.lang; u.rate = .98; u.pitch = .85; ss.speak(u); return true; } catch (e) { return false; } }
  function schoolGo(i) { SCH.i = clamp(i, 0, LESSONS.length - 1); SCH.t = 0; const L = LESSONS[SCH.i]; if (SCH.gp) { SCH.gp.act(SCH.i === 0 ? "integet" : SCH.i === LESSONS.length - 1 ? "integet" : "mutat"); SCH.gp.say(schoolDur(SCH.i) - 2.5); }
    SCH.spoke = schoolSpeak(L.t + ". " + L.say); if (SCH.LB) SCH.LB.dirty = 1; schoolDraw(0); }
  /* vezérlő tábla (a nézőnél): felirat + gombok; 2D-ben alul, a ház fölött látszik a jelenet */
  function schoolLB() {
    if (SCH.LB && UIB.list.indexOf(SCH.LB) >= 0) return SCH.LB;
    SCH.LB = uiBoard({ w: 1500, h: 420, mw: 1.15, dist: 1.05, y: -.42, side: .35, fps: 3, bar: 60, draw: (B, g) => { const L = LESSONS[SCH.i];
      g.fillStyle = "rgba(8,26,48,.94)"; uiRR(g, 0, 0, 1500, 420, 28); g.fill(); g.strokeStyle = "#d4a13a"; g.lineWidth = 5; uiRR(g, 3, 3, 1494, 414, 26); g.stroke();
      g.fillStyle = "#ffd166"; g.font = `900 30px ${UIF}`; g.fillText(`🎓 Nagypapa · ${SCH.i + 1}/${LESSONS.length} · ${L.t}`.slice(0, 80), 30, 50);
      g.fillStyle = "rgba(235,242,250,.92)"; g.font = `600 24px ${UIF}`; uiWrap(g, "„" + L.say + "”", 30, 92, 1440, 31, 4);
      B.btn(24, 238, 220, 84, "◀ Előző", () => schoolGo(SCH.i - 1), { off: SCH.i === 0, fs: 28 }); B.btn(258, 238, 220, 84, SCH.paused ? "▶ Tovább" : "⏸ Szünet", () => { SCH.paused = !SCH.paused; try { SCH.paused ? speechSynthesis.pause() : speechSynthesis.resume(); } catch (e) {} B.dirty = 1; }, { fs: 28 });
      B.btn(492, 238, 260, 84, "Következő ▶", () => schoolGo(SCH.i + 1), { off: SCH.i >= LESSONS.length - 1, fs: 28 }); B.btn(766, 238, 200, 84, SCH.voice ? "🔊 Hang" : "🔇 Néma", () => { SCH.voice = !SCH.voice; if (!SCH.voice) try { speechSynthesis.cancel(); } catch (e) {} B.dirty = 1; }, { fs: 26 });
      B.btn(980, 238, 496, 84, "🎓 Tovább az oktatópályára ▶", () => schoolLeave(true), { gold: true, fs: 28 });
      B.btn(24, 334, 600, 66, "Ugrás: verseny · mentés · elsősegély", () => { const k = LESSONS.findIndex((q, i) => i > SCH.i && q.s !== LESSONS[SCH.i].s); schoolGo(k > 0 ? k : 0); }, { fs: 24 });
      B.btn(640, 334, 836, 66, "‹ Ki a házból, vissza a mólóra", () => schoolLeave(false), { fs: 24 }); } });
    return SCH.LB; }
  function schoolDock(B) { if (B && B.dom && B.dcv) { B.dom.style.alignItems = "flex-end"; B.dom.style.justifyContent = "center"; B.dom.style.background = "transparent"; B.dom.style.pointerEvents = "none"; B.dcv.style.pointerEvents = "auto"; B.dcv.style.maxWidth = "min(58vw, 980px)"; B.dcv.style.marginBottom = "1.2vh"; } }
  function schoolLeave(toCourse) { SCH.inside = false; SCH.force = false; try { speechSynthesis.cancel(); } catch (e) {} if (SCH.LB) { SCH.LB.destroy(); SCH.LB = null; }
    if (toCourse) { wzStartTut(); return; } HB.pos = { x: 1.6, z: 1.2 }; if (HB.walk) hbBoard("walk"); }
  /* belépés a menüből („🎓 Oktató futam”): séta-módban, a házban, a nézőpadnál */
  function hbSchool() { if (!SCH.built) { wzStartTut(); return; } hbWalk(true); HB.pos = { x: 6.6, z: 1.9 }; SCH.force = true; SCH.i = 0; SCH.t = 0; SCH.inside = false; try { faceYaw(0); } catch (e) {} }
  function schoolTick(dt) {
    if (!SCH.built) return; const p = HB.pos || { x: 0, z: 0 }, inside = !!HB.walk && p.x > SCH_BOX.x0 && p.x < SCH_BOX.x1 && p.z > SCH_BOX.z0 && p.z < SCH_BOX.z1;
    if (inside !== SCH.inside) { SCH.inside = inside;
      if (inside) { if (HB.B) HB.B.show(false); const B = schoolLB(); B.show(true); schoolDock(B); setTimeout(() => schoolDock(B), 60); if (!SCH.force && SCH.t > 0) SCH.t = Math.max(0, SCH.t - 3); schoolGo(SCH.force ? 0 : SCH.i); SCH.force = false; }
      else { try { speechSynthesis.cancel(); } catch (e) {} if (SCH.LB) { SCH.LB.destroy(); SCH.LB = null; } if (HB.walk) hbBoard("walk"); } }
    const gp = SCH.gp, near = !!HB.walk && Math.hypot(p.x - 6.5, p.z - 1.2) < 16;
    if (gp) { gp.root.visible = near || inside; if (near) { try { const cam = T.sceneEl.camera, v = new THREE.Vector3(); cam.getWorldPosition(v); gp.lookAt(v); } catch (e) {} gp.update(dt, W.t); } }
    if (!inside) return; if (!SCH.paused) { SCH.t += dt; if (SCH.t > schoolDur(SCH.i) && SCH.i < LESSONS.length - 1 && !(SCH.spoke && window.speechSynthesis && speechSynthesis.speaking)) schoolGo(SCH.i + 1); }
    SCH.acc = (SCH.acc || 0) + dt; if (SCH.acc > 1 / 24) { SCH.acc = 0; schoolDraw(dt); }
    if (SCH.LB && SCH.LB.dom) schoolDock(SCH.LB);
  }
