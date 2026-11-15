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
    { s: "Üdvözlés", t: "Üdvözöllek a vitorlásiskolában!", say: "Üdvözöllek! Én vagyok a nagypapa, harminc éve vitorlázom a Balatonon. Mielőtt kifutunk az oktatópályára, végigvesszük a legfontosabb szabályokat: hogyan versenyzünk tisztességesen, és hogyan mentünk, ha baj van. Az elsősegélyt a nagymama tanítja a szomszéd házban. Ha már ismered az anyagot, bármikor indulhatsz a vízre a „Tovább az oktatópályára” gombbal.",
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
    { s: "A verseny szabályai", t: "4. „Starboard!” – a jobbcsapású hajónak van elsőbbsége", say: "Ha a szél a hajó JOBB oldala felől fúj (a bum a bal oldalon van), az a hajó „jobbcsapáson” megy, és ELSŐBBSÉGE van. A balcsapású hajónak ki kell térnie. Ilyenkor kiabálják: „Starboard!” – vagyis: „Térj ki, nekem van elsőbbségem!”",
      d: (g, t) => { sWater(g, t); sWind(g, 150, 26, 180, t); const u = (t % 8) / 8; const A = [[40, 176], [260, -40]], pa = sAlong(A, u * .8); sBoat(g, pa.x, pa.y, 45, "#d7f0d7", -1, .9); kT(g, "jobbcsapás ✔", pa.x - 26, pa.y + 26, 9, SGR);
        const B = sCurve([[262, 178], [196, 116], [168, 112], [130, 128], [70, 70], [30, 20]], 10), pb = sAlong(B, u); sBoat(g, pb.x, pb.y, pb.a, "#f6d5d5", 1, .9); kT(g, "balcsapás – kitér", pb.x + 34, pb.y + 24, 9, SR);
        if (u > .2 && u < .55) sBubble(g, pa.x, pa.y - 30, "STARBOARD!", SGR); } },
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
    { s: "Mentés", t: "Ha felborultál: maradj a hajónál!", say: "Ha a hajó felborul, maradj nyugodt, és ne ússz a part felé – a part mindig messzebb van, mint amilyennek látszik. Kapaszkodj a hajóba: az úszik, és a nagy hajótestet a mentők sokkal könnyebben észreveszik, mint egy úszó fejet. Számold meg, megvan-e mindenki! Nagyon erős szélben jön a következő veszély: a porzó víz.",
      d: (g, t) => { sWater(g, t); const r = Math.sin(t * 1.4) * .04; g.save(); g.translate(150, 104); g.rotate(r); g.fillStyle = "#fff"; g.strokeStyle = SN; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 70, 16, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#3b4a66"; g.fillRect(-4, -26, 8, 12); g.restore();
        kL(g, [[150, 112], [80, 160]], SN, 3); g.fillStyle = "rgba(214,31,38,.7)"; g.beginPath(); g.moveTo(150, 112); g.lineTo(80, 160); g.lineTo(130, 158); g.closePath(); g.fill();
        sSwim(g, 214, 102, t, .85); sSwim(g, 96, 96, t + 2, .85); kT(g, "kapaszkodj a hajóba ✔", 150, 66, 11, SGR, "center", 900);
        g.globalAlpha = .4 + .3 * Math.sin(t * 3); kT(g, "PART →", 262, 170, 11, SN); g.globalAlpha = 1; kL(g, [[236, 162], [290, 178]], SR, 3); kL(g, [[236, 178], [290, 162]], SR, 3); } },
    { s: "Mentés", t: "Viharjelzés: figyeld a sárga villogást!", say: "A Balaton partján sárga fényjelzők villognak, ha erős szél jön. Első fok: percenként 45 villanás – 40–60 km/h-s szél várható, úszni és vízi sporteszközzel csak a parttól 500 méteren belül szabad. Második fok: percenként 90 villanás – 60 km/h feletti, viharos szél jön: fürödni tilos, és a vitorlás és a nagyobb hajók kivételével senki nem lehet a vízen. Vitorlással is a legjobb, ha időben a kikötőbe érsz. A felhők és a hirtelen hideg szél is figyelmeztetnek – a részleteket a Viharjelző toronyban tanulod meg.",
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
    { s: "Elsősegély", t: "Ha nem lélegzik: 112, és újraélesztés", say: "Ha nem lélegzik normálisan: hívd vagy hívasd a 112-t, és kérj defibrillátort, ha van a közelben. Vízből mentettnél – fulladásnál – az új európai ajánlás, az ERC 2025 szerint mindenki öt befúvással kezd: hajtsd hátra a fejét, fogd be az orrát, és lassan fújj a szájába, amíg a mellkasa megemelkedik. Fulladásnál a légzés áll le először, ezért a befúvás itt különösen fontos. Utána jön a mellkasnyomás.",
      d: (g, t) => { g.fillStyle = "#e9f3f7"; g.fillRect(0, 0, 300, 190); g.fillStyle = "#c9b48a"; g.fillRect(0, 154, 300, 36); const c = t % 10, n = Math.min(5, Math.floor(c / 1.6) + 1), inB = (c % 1.6) < 1;
        const L2 = lerpP(LIE, LIE, 0); L2.sh = [86, 142 - (inB ? 3 : 0)]; sMan(g, L2, "#2f6db0"); sMan(g, { head: [72, 120], sh: [92, 116], hip: [124, 134], elb: [80, 132], hand: [72, 140], knee: [146, 150], foot: [172, 152] }, "#c8102e");
        if (inB) for (let i = 0; i < 3; i++) sCirc(g, 72 - i * 3, 128 - i * 4 + (c % 1) * -6, 1.6, "rgba(45,111,158,.7)"); kT(g, `befúvás: ${n} / 5`, 220, 50, 15, SW, "center", 900); kT(g, "vízből mentettnél előbb 5 befúvás", 220, 72, 9, SN);
        kT(g, "📞 112 · kérj defibrillátort!", 220, 100, 10, SR, "center", 900); } },
    { s: "Elsősegély", t: "Mellkasnyomás: 30 nyomás, 2 befúvás", say: "Térdelj mellé, a két tenyered tedd egymásra a mellkasa közepén. Nyújtott karral nyomd le 5–6 centi mélyen, percenként 100–120-szor – olyan ütemben, mint a Stayin' Alive című dal. Harminc nyomás után két befúvás, és így tovább, amíg meg nem jön a mentő, vagy meg nem mozdul. Ne tartsd vissza magad attól, hogy árthatsz: a legtöbbet azzal segítesz, ha elkezded.",
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
    { s: "Búcsú", t: "Most irány a víz!", say: "Ezek a legfontosabb szabályok. Az elsősegélyt a nagymama tanítja a szomszéd házban, oda is érdemes benézni. Most pedig: mentőmellényt fel, és irány az oktatópálya! Jó szelet!",
      d: (g, t) => { sWater(g, t); sWind(g, 40, 40, 180, t); const u = (t % 8) / 8; sBoat(g, 60 + u * 200, 150 - u * 110, 40, "#fff3c4", -1, 1.2); sBuoy(g, 250, 40, 1, t); kT(g, "JÓ SZELET!", 150, 100, 26, SN, "center", 900); } }
  ];
  /* ---- a házikó (cölöpökön, a móló jobb oldalán) ---- */
  function schoolBuild(env) {
    const G = new THREE.Group(); env.add(G); SCH.G = G; const F = .66, plank = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#a07a52"; g.fillRect(0, 0, w, h); for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#946e48" : "#a9835b"; g.fillRect(0, k * h / 8, w, h / 8 - 3); g.fillStyle = "rgba(40,24,10,.55)"; g.fillRect(0, (k + 1) * h / 8 - 3, w, 3); } }, { repeat: [2, 4] });
    const deckM = std({ map: plank, roughness: .9 }), wallM = std({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#e8e2d2"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = "rgba(0,0,0,.08)"; g.fillRect(x, 0, 3, h); } }, { repeat: [3, 1] }), roughness: .85 }),
      trim = std({ color: "#0b3a5e", roughness: .6 }), roofM = std({ color: "#7a2e22", roughness: .8 }), post = std({ color: "#5d4630", roughness: .95 });
    /* terasz-padló a mólótól a házig + cölöpök */
    mesh(new THREE.BoxGeometry(16, .22, 7.4).translate(9.5, .55, 1.2), deckM, G); for (let x = 2; x <= 17.2; x += 2.6) for (let z = -2.2; z <= 4.6; z += 3.3) mesh(new THREE.CylinderGeometry(.12, .14, 2.4, 8).translate(x, -.6, z), post, G);
    /* korlát a terasz szélén */
    [[1.6, 4.85, 17.4, 4.85], [17.4, -2.4, 17.4, 4.85]].forEach(([x0, z0, x1, z1]) => { const L = Math.hypot(x1 - x0, z1 - z0); const r = mesh(new THREE.BoxGeometry(.06, .06, L), post, G); r.position.set((x0 + x1) / 2, F + .9, (z0 + z1) / 2); r.rotation.y = Math.atan2(x1 - x0, z1 - z0);
      for (let k = 0; k <= L; k += 1.2) mesh(new THREE.BoxGeometry(.06, .9, .06).translate(x0 + (x1 - x0) * k / L, F + .45, z0 + (z1 - z0) * k / L), post, G); });
    /* ===== 2026-11-15 02:57 (tulajdonos: „rönkház legyen az oktatóház kívül és belül is; a házon belül legyenek régi vitorlák és más díszítő elemek,
       legyen szépen kidolgozott”): RÖNKHÁZ – vízszintesen egymásra rakott, kérges rönkök sarokkötéssel (a rönkvégek a sarkokon túlnyúlnak, évgyűrűs
       véglappal), rönkökből rakott oromzat, látszó szarufák és gerincgerenda, zsindelyes tető kéménnyel; bent régi vitorlák a falon és a mennyezet
       alatt kifeszítve, jelzőzászló-füzér, kormánykerék, keresztbe tett evezők, halászháló parafa úszókkal, horgony, hordó, feltekert kötél,
       polc hajómodellel és serlegekkel, régi mentőövek, két függő viharlámpa meleg fénnyel. Kívül: tornác lámpással, felborított régi csónak, fahasábok. ===== */
    const B = SCH_BOX, Hh = 3, th = .3, LR = .15, dz0 = 1.6, dz1 = 2.8, wx0 = 5.3, wx1 = 7.7, wy0 = .9, wy1 = 2.3, ex0 = .3, ex1 = 2.2;   /* ajtó (nyugat), ablak (dél), ablak (kelet) */
    const logT = canvasTex(512, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#5a3f26"); gr.addColorStop(.5, "#8a6440"); gr.addColorStop(1, "#4a3220"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 140; k++) { g.strokeStyle = `rgba(${rr(30, 60) | 0},${rr(18, 35) | 0},${rr(8, 18) | 0},${rr(.25, .6)})`; g.lineWidth = rr(1, 3); const y = rr(0, h); g.beginPath(); g.moveTo(rr(-20, w), y); g.lineTo(rr(0, w + 20), y + rr(-4, 4)); g.stroke(); }
      for (let k = 0; k < 14; k++) { g.fillStyle = "rgba(40,24,10,.6)"; g.beginPath(); g.ellipse(rr(0, w), rr(10, h - 10), rr(5, 10), rr(3, 6), 0, 0, TAU); g.fill(); g.strokeStyle = "rgba(170,130,90,.4)"; g.lineWidth = 1.5; g.stroke(); }   /* göcsök */
      for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(190,150,100,${rr(.1, .25)})`; g.fillRect(rr(0, w), rr(0, h), rr(20, 80), rr(2, 6)); } }, { repeat: [3, 1] });
    const endT = canvasTex(128, 128, (g) => { g.fillStyle = "#c9a06a"; g.fillRect(0, 0, 128, 128); for (let r = 4; r < 64; r += 5) { g.strokeStyle = `rgba(110,72,36,${rr(.3, .6)})`; g.lineWidth = 1.6; g.beginPath(); g.arc(64 + rr(-2, 2), 64 + rr(-2, 2), r, 0, TAU); g.stroke(); }
      g.strokeStyle = "rgba(60,36,16,.7)"; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 64); g.lineTo(120, 40); g.stroke(); g.strokeStyle = "#4a3220"; g.lineWidth = 10; g.beginPath(); g.arc(64, 64, 60, 0, TAU); g.stroke(); });
    const logM = std({ map: logT, roughness: .95 }), endM = std({ map: endT, roughness: .9 }), logParts = [], endParts = [], M0 = new THREE.Matrix4();
    /* egy rönk (vagy darabja) a két végpont között; ax: "x" vagy "z" */
    const addLog = (ax, c, a0, a1, y, r, ends) => { const L = a1 - a0; if (L < .08) return; const g = new THREE.CylinderGeometry(r, r * 1.04, L, 12, 1, true); g.rotateZ(Math.PI / 2); if (ax === "z") g.rotateY(Math.PI / 2);
      const m = (a0 + a1) / 2; g.translate(ax === "x" ? m : c, y, ax === "x" ? c : m); logParts.push([g, M0]);
      (ends || [0, 1]).forEach((e) => { const cg = new THREE.CircleGeometry(r * .98, 12); const at = e ? a1 : a0; if (ax === "x") { cg.rotateY(e ? Math.PI / 2 : -Math.PI / 2); cg.translate(at, y, c); } else { cg.rotateY(e ? 0 : Math.PI); cg.translate(c, y, at); } endParts.push([cg, M0]); }); };
    /* fal: a nyílásoknál (ajtó, ablak) a rönk megszakad */
    const wallLogs = (ax, c, a0, a1, phase, holes) => { const n = Math.round(Hh / (2 * LR)); for (let i = 0; i < n; i++) { const y = F + LR + i * 2 * LR + (phase ? LR : 0), r = LR * (1.04 + .05 * Math.sin(i * 2.7 + c));   /* a rönkök fedik egymást – a réseken nem látszik át az ég */ if (y > F + Hh + LR * .5) break;
        let segs = [[a0 - .32, a1 + .32]]; (holes || []).forEach(([h0, h1, y0, y1]) => { if (y > F + y0 - LR * .6 && y < F + y1 + LR * .6) segs = segs.flatMap(([s0, s1]) => [[s0, Math.min(s1, h0)], [Math.max(s0, h1), s1]].filter(([q0, q1]) => q1 - q0 > .05)); });
        segs.forEach(([s0, s1]) => addLog(ax, c, s0, s1, y, r)); } };
    wallLogs("x", B.z0, B.x0, B.x1, 0, []); wallLogs("x", B.z1, B.x0, B.x1, 0, [[wx0, wx1, wy0, wy1]]); wallLogs("z", B.x0, B.z0, B.z1, 1, [[dz0, dz1, -1, 2.2]]); wallLogs("z", B.x1, B.z0, B.z1, 1, [[ex0, ex1, wy0, wy1]]);
    /* oromzat rönkökből (nyugat és kelet), a tető síkjáig rövidülő rönkök */
    const zc = (B.z0 + B.z1) / 2, rw = (B.z1 - B.z0) / 2 + .55, rH = 1.6;
    [B.x0, B.x1].forEach((x) => { for (let i = 0; ; i++) { const y = F + Hh + LR + i * 2 * LR, hw = ((B.z1 - B.z0) / 2 + .1) * (1 - (y - F - Hh) / rH); if (hw < .15) break; addLog("z", x, zc - hw, zc + hw, y, LR * .95); } });
    /* gerincgerenda és szarufák (bentről látszanak) */
    addLog("x", zc, B.x0 - .45, B.x1 + .45, F + Hh + rH - .12, .14); for (let x = B.x0 + .5; x < B.x1; x += 1.25) [-1, 1].forEach((sd) => { const g = new THREE.BoxGeometry(.12, .16, Math.hypot(rw, rH) + .1); g.rotateX(sd * Math.atan2(rH, rw)); g.translate(x, F + Hh + rH / 2 - .1, zc + sd * rw / 2); logParts.push([g, M0]); });
    addLog("z", (B.x0 + B.x1) / 2, B.z0 + .1, B.z1 - .1, F + Hh - .05, .1, []);   /* keresztgerenda */
    { const mg = mergeGeoms(logParts); W.disposables.push(mg); const lm = new THREE.Mesh(mg, logM); lm.material.side = THREE.DoubleSide; G.add(lm); const eg = mergeGeoms(endParts); W.disposables.push(eg); G.add(new THREE.Mesh(eg, endM)); }
    /* ZSINDELYTETŐ (fazsindely-sorok textúrán), túlnyúló ereszekkel, kőkémény */
    const shT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#4a3a2c"; g.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) for (let c = -1; c < 12; c++) { const x = c * 46 + (r % 2) * 23 + rr(-3, 3), y = r * 32, ww = rr(38, 48); const gr = g.createLinearGradient(0, y, 0, y + 34); gr.addColorStop(0, `rgb(${rr(95, 125) | 0},${rr(72, 92) | 0},${rr(50, 64) | 0})`); gr.addColorStop(1, `rgb(${rr(60, 78) | 0},${rr(46, 58) | 0},${rr(32, 42) | 0})`);
        g.fillStyle = gr; g.fillRect(x, y, ww, 34); g.fillStyle = "rgba(20,14,8,.6)"; g.fillRect(x, y + 30, ww, 4); g.fillRect(x + ww - 2, y, 2, 34); if (Math.random() < .15) { g.fillStyle = "rgba(90,110,60,.35)"; g.fillRect(x + 4, y + 4, ww * .6, 12); } } }, { repeat: [3, 2] });
    const shM = std({ map: shT, roughness: .95, side: THREE.DoubleSide }), rl = B.x1 - B.x0 + 1.2;
    [-1, 1].forEach((s2) => { const L = Math.hypot(rw, rH) + .25, r = mesh(new THREE.BoxGeometry(rl, .09, L), shM, G); r.position.set((B.x0 + B.x1) / 2, F + Hh + rH / 2 + .1, zc + s2 * (rw / 2 + .05)); r.rotation.x = s2 * Math.atan2(rH, rw);
      const inr = mesh(new THREE.BoxGeometry(rl - .3, .03, L - .25), deckM, G); inr.position.copy(r.position); inr.rotation.copy(r.rotation); inr.translateY(-.07);   /* belül deszka-mennyezet a zsindely alatt */
      const fb = mesh(new THREE.BoxGeometry(rl, .16, .05), std({ color: "#3a2a1c", roughness: .9 }), G); fb.position.set((B.x0 + B.x1) / 2, F + Hh - .02, zc + s2 * (rw + .1)); });
    { const stone = std({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#6c6a66"; g.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) { { const v = rr(95, 150) | 0; g.fillStyle = `rgb(${v + 6},${v},${v - 8})`; } uiRR(g, c * 52 + (r % 2) * 26 - 10 + rr(-3, 3), r * 32 + 2, 48, 28, 8); g.fill(); } }), roughness: .95 });
      mesh(new THREE.BoxGeometry(.55, 1.0, .55).translate(B.x1 - .9, F + Hh + 1.6, zc - 1.1), stone, G); mesh(new THREE.BoxGeometry(.65, .1, .65).translate(B.x1 - .9, F + Hh + 2.12, zc - 1.1), stone, G);   /* a kémény a tető síkja fölött indul – belülről nem látszik */ }
    /* ajtó- és ablakkeretek (vastag gyalult gerenda), nyitott deszkaajtó, üveg */
    const frameM = std({ color: "#6b4a2a", roughness: .8 }), glass = new THREE.MeshStandardMaterial({ color: "#bfe3f5", roughness: .05, metalness: .2, transparent: true, opacity: .22, depthWrite: false }); W.disposables.push(glass);
    const frame = (ax, c, a0, a1, y0, y1, win) => { const L = a1 - a0, m = (a0 + a1) / 2, put = (w, h, d, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d).translate(x, y, z), frameM, G), X = (a) => (ax === "x" ? a : c), Z = (a) => (ax === "x" ? c : a), dd = th + .06;
      put(ax === "x" ? L + .24 : dd, .14, ax === "x" ? dd : L + .24, X(m), F + y1 + .07, Z(m)); if (win) put(ax === "x" ? L + .24 : dd, .1, ax === "x" ? dd + .1 : L + .24, X(m), F + y0 - .05, Z(m));
      [a0 - .06, a1 + .06].forEach((a) => put(ax === "x" ? .12 : dd, y1 - y0 + .1, ax === "x" ? dd : .12, X(a), F + (y0 + y1) / 2, Z(a)));
      if (win) { const gl = new THREE.PlaneGeometry(L, y1 - y0); if (ax === "z") gl.rotateY(Math.PI / 2); gl.translate(X(m), F + (y0 + y1) / 2, Z(m)); mesh(gl, glass, G);
        put(ax === "x" ? L : .04, .04, ax === "x" ? .04 : L, X(m), F + (y0 + y1) / 2, Z(m)); put(ax === "x" ? .04 : .04, y1 - y0, .04, X(m), F + (y0 + y1) / 2, Z(m)); } };
    frame("x", B.z1, wx0, wx1, wy0, wy1, true); frame("z", B.x1, ex0, ex1, wy0, wy1, true); frame("z", B.x0, dz0, dz1, 0, 2.2, false);
    { const dg = new THREE.Group(); dg.position.set(B.x0 - .16, F, dz0); dg.rotation.y = -1.9; G.add(dg); for (let k = 0; k < 6; k++) mesh(new THREE.BoxGeometry(.05, 2.18, .2).translate(0, 1.09, .1 + k * .2), std({ map: logT, roughness: .9 }), dg);
      [.4, 1.8].forEach((y) => mesh(new THREE.BoxGeometry(.07, .12, 1.15).translate(-.05, y, .6), frameM, dg)); mesh(new THREE.TorusGeometry(.05, .012, 6, 12).rotateY(Math.PI / 2).translate(-.09, 1.1, 1.05), std({ color: "#2a2a2a", metalness: .7, roughness: .4 }), dg); }
    /* FELIRAT a bejárat fölött (a móló felé) és a déli oromzaton – faragott deszkatábla */
    const sg = canvasTex(1024, 300, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#7a5532"); gr.addColorStop(1, "#5a3c22"); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let k = 0; k < 60; k++) { g.strokeStyle = "rgba(40,24,10,.35)"; g.lineWidth = rr(1, 3); const y = rr(0, h); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + rr(-8, 8), w * .6, y + rr(-8, 8), w, y + rr(-6, 6)); g.stroke(); }
      g.strokeStyle = "#3a2614"; g.lineWidth = 14; g.strokeRect(8, 8, w - 16, h - 16); g.textAlign = "center"; g.font = `900 104px ${UIF}`; g.fillStyle = "rgba(20,10,0,.7)"; g.fillText("VITORLÁS OKTATÁS", w / 2 + 4, 146); g.fillStyle = "#ffd98a"; g.fillText("VITORLÁS OKTATÁS", w / 2, 142);
      g.font = `700 44px ${UIF}`; g.fillStyle = "#fff3d6"; g.fillText("Zephyr vitorlásiskola · gyere be!", w / 2, 232); [[60, 150], [w - 60, 150]].forEach(([x, y]) => { g.fillStyle = "#2a2a2a"; g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fill(); }); });
    const sgn = mesh(new THREE.BoxGeometry(.06, 1.05, 3.6), [frameM, frameM, frameM, frameM, frameM, frameM], G); sgn.position.set(B.x0 - LR - .06, F + 3.0, zc); { const pl = mesh(new THREE.PlaneGeometry(3.6, 1.05), basic({ map: sg }), G); pl.position.set(B.x0 - LR - .1, F + 3.0, zc); pl.rotation.y = -Math.PI / 2; }
    const sg2 = mesh(new THREE.PlaneGeometry(2.6, .76), basic({ map: sg }), G); sg2.position.set((B.x0 + B.x1) / 2, F + Hh + .55, B.z1 + LR + .05);
    /* tornác: viharlámpa a bejárat mellett, mentőöv, felborított régi csónak, fahasábok */
    const lantern = (x, y, z, hang) => { const lg = new THREE.Group(); lg.position.set(x, y, z); G.add(lg); const blk = std({ color: "#1c1c1c", roughness: .5, metalness: .6 });
      mesh(new THREE.CylinderGeometry(.09, .11, .04, 10).translate(0, -.15, 0), blk, lg); mesh(new THREE.CylinderGeometry(.075, .085, .2, 10, 1, true), new THREE.MeshStandardMaterial({ color: "#ffd88a", emissive: "#ffb347", emissiveIntensity: 1.4, transparent: true, opacity: .85 }), lg);
      mesh(new THREE.ConeGeometry(.11, .1, 10).translate(0, .15, 0), blk, lg); mesh(new THREE.TorusGeometry(.04, .008, 6, 12).translate(0, .23, 0), blk, lg); [0, 1, 2, 3].forEach((k) => { const a = k * Math.PI / 2; mesh(new THREE.CylinderGeometry(.006, .006, .22, 4).translate(Math.cos(a) * .09, 0, Math.sin(a) * .09), blk, lg); });
      if (hang) rodBetween(new THREE.Vector3(x, y + .24, z), new THREE.Vector3(x, y + hang, z), .006, blk, G, 4); const gl = glowSprite("#ffc070", 1.2); gl.position.set(x, y, z); G.add(gl); return lg; };
    lantern(B.x0 - .35, F + 2.3, dz1 + .35); { const br = mesh(new THREE.BoxGeometry(.3, .04, .04).translate(B.x0 - .22, F + 2.58, dz1 + .35), frameM, G); void br; }
    { const ring = mesh(new THREE.TorusGeometry(.32, .08, 10, 24), std({ color: "#ff7a1a", roughness: .5 }), G); ring.position.set(B.x0 - LR - .1, F + 1.5, dz1 + .9); ring.rotation.y = Math.PI / 2; }
    { const bt = new THREE.Group(); bt.position.set(19.6, landY(19.6, 7.2) + .32, 7.2); bt.rotation.set(Math.PI, 1.3, 0); G.add(bt); const hull = new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2); hull.scale(.6, .32, 1.6); mesh(hull, std({ color: "#2f5f7a", roughness: .7, side: THREE.DoubleSide }), bt);
      mesh(new THREE.BoxGeometry(1.22, .05, 3.1).translate(0, .01, 0), std({ color: "#c9b48a", roughness: .9 }), bt); }
    { const parts = []; for (let r = 0; r < 4; r++) for (let k = 0; k < 6 - r; k++) { const g = new THREE.CylinderGeometry(.08, .08, .5, 8); g.rotateX(Math.PI / 2); g.translate(16.9, F + .08 + r * .15, -.2 + k * .17 + r * .085); parts.push([g, M0]); } const fg = mergeGeoms(parts); W.disposables.push(fg); mesh(fg, endM, G); }
    /* ----- BELSŐ DÍSZEK ----- */
    /* régi vitorlák: kifakult vászon, foltok, vitorlaszám, öltések, sarokszem – a falakon és a mennyezet alatt */
    const oldSail = (num, col) => canvasTex(512, 640, (g, w, h) => { g.clearRect(0, 0, w, h);
      g.save(); g.beginPath(); g.moveTo(6, 4); g.quadraticCurveTo(w * .55, h * .45, w - 6, h - 6); g.lineTo(6, h - 6); g.closePath(); g.clip(); g.fillStyle = "#e9dfc6"; g.fillRect(0, 0, w, h); for (let y = 30; y < h; y += 70) { g.strokeStyle = "rgba(120,100,70,.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 40); g.stroke(); }
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${rr(100, 140) | 0},${rr(90, 120) | 0},${rr(60, 80) | 0},${rr(.05, .18)})`; g.beginPath(); g.ellipse(rr(0, w), rr(0, h), rr(10, 50), rr(6, 30), rr(0, 3), 0, TAU); g.fill(); }
      g.fillStyle = col; g.font = `900 64px ${UIF}`; g.globalAlpha = .7; g.fillText(num, 30, h * .72); g.globalAlpha = 1; g.fillStyle = "rgba(200,190,160,.9)"; g.fillRect(40, h * .4, 90, 70); g.strokeStyle = "rgba(90,70,40,.6)"; g.setLineDash([5, 4]); g.strokeRect(44, h * .4 + 4, 82, 62); g.setLineDash([]);
      g.strokeStyle = "rgba(110,90,60,.8)"; g.lineWidth = 8; g.beginPath(); g.moveTo(4, 0); g.lineTo(4, h - 4); g.lineTo(w, h - 4); g.stroke(); g.restore(); g.fillStyle = "#9a9a90"; [[14, h - 14], [14, 14], [w - 20, h - 14]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); }); });
    const sailMesh = (tex, w, h, x, y, z, ry, wave) => { const g = new THREE.PlaneGeometry(w, h, 10, 12), pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const px = pa.getX(i), py = pa.getY(i); pa.setZ(i, Math.sin(px * 3 + py * 2) * wave + Math.sin(py * 5) * wave * .5); } g.computeVertexNormals();
      const m = mesh(g, std({ map: tex, roughness: .95, side: THREE.DoubleSide, alphaTest: .4 }), G); m.position.set(x, y, z); m.rotation.y = ry; return m; };
    sailMesh(oldSail("HUN 1975", "#b02a20"), 1.5, 2.1, B.x1 - LR - .06, F + 1.55, 3.1, -Math.PI / 2, .03); sailMesh(oldSail("Z 7", "#1f3a6a"), 1.3, 1.8, B.x0 + LR + .06, F + 1.5, -.55, Math.PI / 2, .03);
    { const cs = sailMesh(oldSail("KÉKSZALAG '88", "#1f3a6a"), 4.2, 3.6, (B.x0 + B.x1) / 2 + .3, F + Hh + .25, zc + .4, 0, .0); cs.rotation.set(-Math.PI / 2 + .12, 0, .3); const pa = cs.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const px = pa.getX(i), py = pa.getY(i); pa.setZ(i, -.35 * Math.cos(px / 4.2 * Math.PI) * Math.cos(py / 3.6 * Math.PI)); } cs.geometry.computeVertexNormals(); }   /* a mennyezet alatt kifeszített, belógó régi vitorla */
    /* jelzőzászló-füzér keresztben a teremben */
    { const flags = [["#ffffff", "#d61f26"], ["#1f3a6a", "#ffffff"], ["#f2c21a", "#1f3a6a"], ["#d61f26", "#f2c21a"], ["#ffffff", "#1f3a6a"], ["#2f9e57", "#ffffff"], ["#f2c21a", "#d61f26"], ["#1f3a6a", "#f2c21a"]], p0 = new THREE.Vector3(B.x0 + .2, F + 2.85, B.z0 + .25), p1 = new THREE.Vector3(B.x1 - .2, F + 2.85, B.z1 - .3), rope = std({ color: "#d9c9a0", roughness: .9 });
      const crv = new THREE.QuadraticBezierCurve3(p0, p0.clone().lerp(p1, .5).add(new THREE.Vector3(0, -.45, 0)), p1); { const tg = new THREE.TubeGeometry(crv, 24, .008, 4); W.disposables.push(tg); mesh(tg, rope, G); }
      for (let k = 1; k < 16; k++) { const pp = crv.getPoint(k / 16), [a, b] = flags[k % flags.length], tx = canvasTex(64, 64, (g) => { g.fillStyle = a; g.fillRect(0, 0, 64, 64); g.fillStyle = b; if (k % 3 === 0) g.fillRect(16, 16, 32, 32); else if (k % 3 === 1) { g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.lineTo(0, 64); g.fill(); } else g.fillRect(0, 22, 64, 20); });
        const fl = mesh(new THREE.PlaneGeometry(.22, .26), std({ map: tx, roughness: .8, side: THREE.DoubleSide }), G); fl.position.copy(pp).add(new THREE.Vector3(0, -.14, 0)); fl.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z) + Math.PI / 2; fl.rotation.z = rr(-.08, .08); } }
    /* kormánykerék a keleti falon */
    { const wg = new THREE.Group(); wg.position.set(9.0, F + 2.0, B.z0 + LR + .08); wg.rotation.y = 0; G.add(wg); const wood = std({ color: "#7a4d2a", roughness: .55 });
      mesh(new THREE.TorusGeometry(.36, .035, 8, 32), wood, wg); mesh(new THREE.TorusGeometry(.26, .02, 6, 28), wood, wg); mesh(new THREE.CylinderGeometry(.07, .07, .1, 14).rotateX(Math.PI / 2), std({ color: "#b8913a", metalness: .8, roughness: .3 }), wg);
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, sp = new THREE.CylinderGeometry(.018, .022, .62, 8); sp.translate(0, .31, 0); sp.rotateZ(a); mesh(sp, wood, wg); } }
    /* keresztbe tett evezők a bejárat melletti falon (bent) */
    [-1, 1].forEach((sd) => { const og = new THREE.Group(); og.position.set(B.x0 + LR + .08, F + 1.8, .85); og.rotation.set(sd * .7, Math.PI / 2, 0); G.add(og); const ow = std({ color: "#b98a55", roughness: .7 });
      mesh(new THREE.CylinderGeometry(.025, .025, 2.0, 8), ow, og); const bl = mesh(new THREE.BoxGeometry(.16, .5, .02).translate(0, -1.15, 0), std({ color: sd > 0 ? "#c8102e" : "#1f3a6a", roughness: .6 }), og); void bl; });
    /* halászháló parafa úszókkal a sarokban */
    { const cx = B.x1 - LR - .1, z0 = B.z0 + .3, nm = std({ color: "#7a6a4a", roughness: 1 });   /* halászháló: függőleges szálak a falon lelógva, vízszintes szemsorok */
      for (let i = 0; i <= 8; i++) rodBetween(new THREE.Vector3(cx, F + 2.7, z0 + i * .14), new THREE.Vector3(cx - .1, F + .4 + Math.sin(i) * .1, z0 + i * .12 + .2), .004, nm, G, 3);
      for (let j = 0; j < 9; j++) { const y = F + .5 + j * .25, t = (2.7 - .5 - j * .25) / 2.3; rodBetween(new THREE.Vector3(cx - .1 * (1 - t), y, z0 + .2 * (1 - t)), new THREE.Vector3(cx - .1 * (1 - t), y, z0 + 1.12 + .2 * (1 - t) - .16 * t), .004, nm, G, 3); }
      for (let k = 0; k < 5; k++) mesh(new THREE.CylinderGeometry(.05, .05, .08, 10).rotateZ(Math.PI / 2).translate(cx - .06, F + 2.55 - k * .02, z0 + .1 + k * .28), std({ color: "#c9965a", roughness: .9 }), G); }
    /* horgony, hordó, feltekert kötél a padlón */
    { const iron = std({ color: "#3a3d40", roughness: .6, metalness: .7 }), ag = new THREE.Group(); ag.position.set(B.x1 - .55, F, B.z1 - .55); ag.rotation.set(0, -.6, -.25); G.add(ag);
      mesh(new THREE.CylinderGeometry(.035, .035, 1.0, 8).translate(0, .55, 0), iron, ag); mesh(new THREE.TorusGeometry(.07, .018, 6, 14).translate(0, 1.1, 0), iron, ag); mesh(new THREE.TorusGeometry(.32, .035, 8, 20, Math.PI).rotateZ(Math.PI).translate(0, .38, 0), iron, ag); mesh(new THREE.CylinderGeometry(.02, .02, .5, 6).rotateZ(Math.PI / 2).translate(0, .9, 0), iron, ag);
      const br = new THREE.LatheGeometry([[.0, 0], [.24, 0], [.29, .2], [.31, .4], [.29, .6], [.24, .8], [0, .8]].map(([x, y]) => new THREE.Vector2(x, y)), 18); mesh(br.translate(B.x0 + .55, F, B.z1 - .55), std({ map: logT, roughness: .8 }), G);
      [.1, .4, .7].forEach((y) => mesh(new THREE.TorusGeometry(y === .4 ? .31 : .27, .012, 6, 24).rotateX(Math.PI / 2).translate(B.x0 + .55, F + y, B.z1 - .55), iron, G));
      for (let k = 0; k < 6; k++) mesh(new THREE.TorusGeometry(.26 - k * .01, .025, 6, 22).rotateX(Math.PI / 2).translate(B.x0 + 1.25, F + .03 + k * .05, B.z1 - .45), std({ color: "#d9c9a0", roughness: .95 }), G); }
    /* polc hajómodellel és serlegekkel a déli fal belső oldalán (az ablak mellett) */
    { const sx = B.x0 + .95, sz = B.z1 - LR - .18; mesh(new THREE.BoxGeometry(1.2, .04, .28).translate(sx, F + 1.9, sz), frameM, G); [-.5, .5].forEach((dx) => mesh(new THREE.BoxGeometry(.03, .16, .2).translate(sx + dx, F + 1.82, sz), frameM, G));
      const mh = new THREE.SphereGeometry(1, 14, 8, 0, TAU, Math.PI / 2, Math.PI / 2); mh.scale(.06, .06, .26); mesh(mh.translate(sx - .2, F + 1.98, sz), std({ color: "#f4f1e8", roughness: .4 }), G); mesh(new THREE.CylinderGeometry(.005, .005, .4, 4).translate(sx - .2, F + 2.17, sz), frameM, G);
      { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(.18, 0); sh.lineTo(0, .34); sh.closePath(); const sgm = new THREE.ShapeGeometry(sh); sgm.rotateY(Math.PI / 2); sgm.translate(sx - .2, F + 2.0, sz + .01); mesh(sgm, std({ color: "#d61f26", roughness: .8, side: THREE.DoubleSide }), G); }
      const gold = std({ color: "#d4a13a", metalness: .9, roughness: .25 }); [[.15, .18], [.35, .14]].forEach(([dx, hh]) => { mesh(new THREE.LatheGeometry([[0, 0], [.05, 0], [.05, .02], [.012, .04], [.012, hh * .45], [.06, hh * .7], [.065, hh], [0, hh]].map(([x, y]) => new THREE.Vector2(x, y)), 16).translate(sx + dx, F + 1.92, sz), gold, G); }); }
    /* régi mentőöv a belső falon, felirattal */
    { const ring = mesh(new THREE.TorusGeometry(.3, .075, 10, 24), std({ color: "#e8e2d2", roughness: .6 }), G); ring.position.set(4.45, F + 1.15, B.z1 - LR - .12); [0, 1, 2, 3].forEach((k) => { const bd = mesh(new THREE.TorusGeometry(.3, .078, 10, 4, .35), std({ color: "#c8102e", roughness: .6 }), G); bd.position.copy(ring.position); bd.rotation.set(0, 0, k * Math.PI / 2 - .17); }); }
    /* két függő viharlámpa a gerincgerendáról + meleg fény */
    lantern(5.2, F + 2.35, zc, .95); lantern(8.0, F + 2.35, zc, .95); { const pl = new THREE.PointLight("#ffc27a", 1.4, 9, 1.6); pl.position.set(6.6, F + 2.3, zc); G.add(pl); }
    /* padok rönkből */
    [[4.75, .4], [8.6, .45]].forEach(([x, z]) => { addLog.length; const sg3 = new THREE.CylinderGeometry(.13, .13, 1.5, 12); sg3.rotateZ(Math.PI / 2); sg3.scale(1, .55, 1); mesh(sg3.translate(x, F + .44, z), std({ map: logT, roughness: .9 }), G); [-.55, .55].forEach((dx) => mesh(new THREE.CylinderGeometry(.09, .1, .4, 10).translate(x + dx, F + .2, z), endM, G)); });
    /* poszterek: csomók és a viharjelző */
    const poster = (lines, x, z, ry, col) => { const tx = canvasTex(512, 640, (g, w, h) => { g.fillStyle = "#fbf6e8"; g.fillRect(0, 0, w, h); g.fillStyle = col; g.fillRect(0, 0, w, 120); g.fillStyle = "#fff"; g.font = `900 52px ${UIF}`; g.textAlign = "center"; g.fillText(lines[0], w / 2, 82); g.fillStyle = "#14161b"; g.font = `700 36px ${UIF}`; lines.slice(1).forEach((s, i) => g.fillText(s, w / 2, 200 + i * 70)); });
      const p = mesh(new THREE.PlaneGeometry(.8, 1), basic({ map: tx }), G); p.position.set(x, F + 1.7, z); p.rotation.y = ry; };
    poster(["CSOMÓK", "nyolcas", "bak", "kikötő-", "bowline", "szorító"], 8.7, B.z1 - LR - .04, Math.PI, "#0b3a5e"); poster(["112", "HOL?", "MI TÖRTÉNT?", "HÁNYAN?", "ne tedd le!"], B.x0 + LR + .04, 3.4, Math.PI / 2, "#c8102e");
    /* járható felületek: terasz és a ház padlója */
    hbTpSurf(env, 9.5, 1.2, 15.6, 7.0, .67, .3);   /* az egész terasz (a két ház közötti tornáccal) egy felület */
    SCH.built = true;
  }
  /* =================================================================== TANTERMEK (2026-11-15, a tulajdonos kérése a kikötő-jelentés után):
     minden oktatóházban tábla, tanár, SZÉK és LECKEKÖNYV: a székre bökve leülsz a táblával szemben (a táblára és a tanárra tökéletes rálátással),
     lenézve előtted egy bőrkötéses könyv: benne a leckék listája – egy leckére bökve azt tanítja a tanár, a „Teljes anyag” sorban végigmegy mindegyiken.
     A tanár emberi hangon beszél (előre felvett magyar hang, „hang/lecke/<ház>/<lecke>.mp3”), a szája mozog; mellette 1–2 tanuló a családból,
     ugyanolyan részletesen kidolgozva (kevesebb szereplő, de jó minőségben). A tábla és a könyv vászna közös – mindig csak abban a házban él, ahol vagy. */
  const SCH = { R: null, voice: true, built: false, LB: null, BL: null, get inside() { return !!SCH.R; }, get paused() { return !!(SCH.R && !SCH.R.playing); } };
  const ROOMS = {}; const RB = {};
  const SEC_C = { "Üdvözlés": "#e9c46a", "A verseny szabályai": "#7cc6ff", "Mentés": "#ff9a5a", "Elsősegély": "#ff6b6b", "Búcsú": "#7CFC9A" };
  const TEACH_N = { nagypapa: "a nagypapa", nagymama: "a nagymama", apa: "az apa", anya: "az anya", matroz1: "Szalai Ferenc vízimentő", matroz2: "Kovács Réka meteorológus", matroz4: "Bodnár József kötélmester", orseg: "Varga Tamás toronyőr" };
  /* belépéskor a tanár köszönt, elmondja, mit tanít, és hellyel kínál (felvett hang: hang/lecke/<ház>/koszon.mp3) */
  const GREET = {   /* 2026-11-15 este (tulajdonos): felnőtt hangnem – közérthető, de nem gyereknek szól */
    isk: "Üdvözöllek a vitorlásiskolában! Én vagyok a nagypapa, harminc éve vitorlázom a Balatonon. Itt a versenyszabályokat és a mentés alapjait tanítom. Foglalj helyet a székben, onnan jól látod a táblát.",
    els: "Üdvözöllek! Én vagyok a nagymama. Itt az elsősegélyt tanítom: mit tegyél, ha valaki bajba kerül a vízen vagy a parton. Foglalj helyet, és kezdjük.",
    ter: "Szia, örülök, hogy benéztél! Ez a Természetvédelmi ház: itt a Balaton halairól, madarairól és a nádasról mesélek. Foglalj helyet a széken, onnan jól látod a táblát!",
    vih: "Üdvözöllek a Viharjelző toronyban! Kovács Réka vagyok, meteorológus. Itt megtanulod, mit jelent a sárga villogó, melyik felhő milyen veszélyt hoz, és mekkora szél az, ami már életveszélyes. Foglalj helyet!",
    cso: "Üdvözöllek a Csomózóházban! Bodnár József vagyok, kötélmester – mindenki csak Jóskának hív. Itt a legfontosabb hajós csomókat kötjük meg, lépésről lépésre. Foglalj helyet!",
    mel: "Üdvözöllek! Szalai Ferenc vagyok, vízimentő. Ez a Mentőmellény-pont: itt a mentőmellényről és a mentésről beszélek. Foglalj helyet, kezdjük!",
    vil: "Jó estét! Varga Tamás vagyok, a világítótorony őre. Itt az éjszakai hajózás fényeit és jeleit tanítom. Foglalj helyet!",
    izek: "Isten hozott a Magyar Ízek Házában! Itt a leghíresebb magyar ételeket, borokat és hungarikumokat mutatom be. Ülj le nyugodtan a székre, mindjárt kezdjük!" };
  function roomOut() { if (HB.seat) HB.seat = null; if (SCH.R) roomExit(SCH.R); }
  function roomLessons(id) { if (id === "isk") return LESSONS.filter((q) => q.s !== "Elsősegély"); if (id === "els") return [LX_ELS[0]].concat(LESSONS.filter((q) => q.s === "Elsősegély"), [LX_ELS[1]]); return LX[id] || []; }
  const roomDur = (R, i) => R.adur && R.adurI === i ? R.adur + 1.4 : Math.max(10, (R.lessons[i] || R.lessons[0]).say.length / 13.5 + 3);
  function roomStaticTex(h) { return canvasTex(900, 500, (g, w, hh) => { const bg = g.createLinearGradient(0, 0, 0, hh); bg.addColorStop(0, "#21443c"); bg.addColorStop(1, "#16302a"); g.fillStyle = bg; g.fillRect(0, 0, w, hh);
      g.fillStyle = h.col; uiRR(g, 30, 30, w - 60, 90, 45); g.fill(); g.fillStyle = "#fff"; g.font = `900 52px ${UIF}`; g.textAlign = "center"; g.fillText(h.name, w / 2, 94);
      g.fillStyle = "rgba(255,255,255,.88)"; g.font = `700 36px ${UIF}`; g.fillText("Ülj le a székre,", w / 2, 230); g.fillText("és a könyvből válassz leckét!", w / 2, 280); g.fillStyle = "#ffd166"; g.font = `800 32px ${UIF}`; g.fillText("🪑  📖", w / 2, 360); g.fillStyle = "rgba(255,255,255,.5)"; g.font = `600 26px ${UIF}`; g.fillText(h.sub, w / 2, 440); }); }
  function roomsBuild(env) {
    try { vManifest(); } catch (e) {}
    RB.cv = document.createElement("canvas"); RB.cv.width = 1800; RB.cv.height = 1000; RB.g = RB.cv.getContext("2d"); RB.tex = new THREE.CanvasTexture(RB.cv); RB.tex.colorSpace = THREE.SRGBColorSpace; RB.tex.minFilter = THREE.LinearMipmapLinearFilter; W.disposables.push(RB.tex);
    RB.bcv = document.createElement("canvas"); RB.bcv.width = 1600; RB.bcv.height = 1000; RB.bg = RB.bcv.getContext("2d"); RB.btex = new THREE.CanvasTexture(RB.bcv); RB.btex.colorSpace = THREE.SRGBColorSpace; RB.btex.minFilter = THREE.LinearMipmapLinearFilter; try { RB.btex.anisotropy = T.sceneEl.renderer.capabilities.getMaxAnisotropy(); } catch (e) {} W.disposables.push(RB.btex);
    const wood = std({ color: "#6b4a2a", roughness: .7 }), leather = std({ color: "#5a1f16", roughness: .55 }), pageEdge = std({ color: "#efe6cc", roughness: .9 });
    HOUSES.forEach((h) => { if (!h.board) return; const R = ROOMS[h.id] = { h, lessons: roomLessons(h.id), i: 0, t: 0, playing: false, mode: "all", page: 0, done: {}, tch: null, studs: [], near: false };
      const G = h.G || env, b = h.board, bw = b.w, bh = bw * 1000 / 1800, F = h.F;
      /* tábla fakerettel és krétatartóval */
      const bg = new THREE.Group(); bg.position.set(b.x, b.y, b.z); bg.rotation.y = b.ry; G.add(bg); R.statT = roomStaticTex(h); R.board = mesh(new THREE.PlaneGeometry(bw, bh), basic({ map: R.statT }), bg); R.board.position.z = .02; R.board.userData.noMerge = true;
      [[0, bh / 2 + .05, bw + .2, .1], [0, -bh / 2 - .05, bw + .2, .1], [-bw / 2 - .05, 0, .1, bh + .2], [bw / 2 + .05, 0, .1, bh + .2]].forEach(([x, y, w, hh]) => mesh(new THREE.BoxGeometry(w, hh, .08).translate(x, y, .01), wood, bg)); mesh(new THREE.BoxGeometry(bw, .05, .14).translate(0, -bh / 2 - .12, .05), wood, bg);
      /* a szék (a táblára néz) – rábökve leülsz */
      const s = h.seat, yaw = Math.atan2(b.x - s.x, b.z - s.z); R.yaw = yaw; const cg = new THREE.Group(); cg.position.set(s.x, F, s.z); cg.rotation.y = yaw; G.add(cg); R.chairG = cg;
      mesh(new THREE.BoxGeometry(.46, .05, .44).translate(0, .45, 0), wood, cg); [[-.2, -.18], [.2, -.18], [-.2, .18], [.2, .18]].forEach(([x, z]) => mesh(new THREE.BoxGeometry(.04, .45, .04).translate(x, .22, z), wood, cg)); [-.2, .2].forEach((x) => mesh(new THREE.BoxGeometry(.045, .5, .045).translate(x, .7, -.2), wood, cg)); for (let k = 0; k < 3; k++) mesh(new THREE.BoxGeometry(.42, .06, .025).translate(0, .62 + k * .14, -.21), wood, cg);
      mesh(new THREE.BoxGeometry(.4, .04, .38).translate(0, .485, 0), std({ color: h.col, roughness: .9 }), cg);   /* párna a ház színében */
      const hit = mesh(new THREE.BoxGeometry(.7, 1.1, .7), basic({ visible: false }), cg); hit.position.y = .55; hit.material.visible = false; hit.userData.xr = { hover: (on) => { R.chairHov = on; }, click: () => roomSit(R) }; try { T.xr.extra.add(hit); W.objs.push(hit); } catch (e) {}
      /* olvasóállvány a szék előtt, rajta a nyitott, bőrkötéses LECKEKÖNYV */
      const lg = new THREE.Group(); lg.position.set(s.x + Math.sin(yaw) * .5, F, s.z + Math.cos(yaw) * .5); lg.rotation.y = yaw; G.add(lg); mesh(new THREE.BoxGeometry(.08, .62, .08).translate(0, .31, .06), wood, lg); mesh(new THREE.BoxGeometry(.5, .04, .36).translate(0, .02, .06), wood, lg);
      const top = new THREE.Group(); top.position.set(0, .66, 0); lg.add(top); top.rotation.x = -.55; mesh(new THREE.BoxGeometry(.82, .03, .52), wood, top); mesh(new THREE.BoxGeometry(.8, .02, .5).translate(0, .025, 0), leather, top); mesh(new THREE.BoxGeometry(.78, .03, .48).translate(0, .045, 0), pageEdge, top);
      const pg = new THREE.PlaneGeometry(.76, .475, 24, 1); pg.rotateX(-Math.PI / 2); pg.rotateY(Math.PI); const pa = pg.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), u = Math.abs(x) / .38; pa.setY(i, .062 + .028 * Math.sin(Math.min(1, u) * Math.PI * .9) - .01 * (u < .05 ? 1 : 0)); } pg.computeVertexNormals();
      R.bookStat = canvasTex(800, 500, (g, w, hh) => { g.fillStyle = "#f4ecd6"; g.fillRect(0, 0, w, hh); g.fillStyle = "rgba(90,60,20,.18)"; g.fillRect(w / 2 - 14, 0, 28, hh); g.fillStyle = h.col; g.font = `900 40px ${UIF}`; g.textAlign = "center"; g.fillText(h.name, w / 4, 120); g.fillStyle = "#3a2a1a"; g.font = `700 28px ${UIF}`; g.fillText("Leckekönyv", w / 4, 180); g.fillText("Ülj le a székre!", w * .75, 240); });
      R.book = mesh(pg, basic({ map: R.bookStat }), top); R.book.userData.noMerge = true; R.book.userData.xr = { click: (hh) => bookClick(R, hh) }; try { T.xr.extra.add(R.book); W.objs.push(R.book); } catch (e) {}
      R.bookTop = top; });
    SCH.built = true;
  }
  /* ---- szereplők: a tanár és a tanulók (lustán épülnek, ha a ház közelébe érsz; messze menve eltűnnek) ---- */
  function figMake(k, full) { let c, root, s = 1.1;
    if (/^matroz|^orseg/.test(k)) { const o = { full: true, seed: { matroz1: 1, matroz2: 2, matroz4: 4, orseg: 5 }[k] || 1 }; if (k === "matroz1") { o.zvest = true; o.top = "#1f5fa8"; } if (k === "matroz2") { o.top = "#e8e4d8"; } if (k === "matroz4") { o.cap = "#1f2a44"; o.top = "#7a4ea3"; } if (k === "orseg") { o.beard = true; o.cap = "#1f2a44"; o.top = "#24324a"; }
      const g = makeFamPerson(o); c = g.userData.P.fam; root = g; s = 1; }
    else { c = new FAM.Character(k, { expr: "vidam" }); famStd(c.root); c.blob.visible = false; c.root.traverse((m) => { if (m.isMesh) m.castShadow = false; }); root = c.root; }
    root.userData.noMerge = true; root.scale.setScalar(s); void full; try { if (!c._frozen) famFreeze(c, true); } catch (e) { console.warn("figura-sütés", e); } return { c, root, s }; }
  function figDrop(f) { if (!f || !f.root) return; if (f.root.parent) f.root.parent.remove(f.root); f.root.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); }
  function roomFigs(R, on) { const h = R.h;
    if (on && !R.tch) { try { const f = figMake(h.teacher); const t = h.tpos; f.root.position.set(t.x, h.F, t.z); f.root.rotation.y = Math.atan2(h.seat.x - t.x, h.seat.z - t.z) * .6 + Math.atan2(h.board.x - t.x, h.board.z - t.z) * .4; (h.G || HB.env).add(f.root); R.tch = f; f.c.act("integet"); } catch (e) { console.warn("tanár", h.id, e); }
      (h.studs || []).forEach((st) => { try { const f = figMake(st.k); f.root.position.set(st.x, h.F, st.z); f.root.rotation.y = Math.atan2(h.board.x - st.x, h.board.z - st.z); (h.G || HB.env).add(f.root); f.st = st; f.nx = 3 + Math.random() * 5;
          /* pad a tanuló alá (rönkpad) */ if (!st.bench && h.id !== "isk") { const bm = mesh(new THREE.CylinderGeometry(.13, .13, .9, 12).rotateZ(Math.PI / 2).scale(1, .55, 1), std({ map: HZ.logT, roughness: .9 }), h.G); bm.position.set(st.x, h.F + .40, st.z); bm.rotation.y = f.root.rotation.y; [-.35, .35].forEach((dx) => { const l = mesh(new THREE.CylinderGeometry(.08, .09, .34, 8), std({ map: HZ.logT, roughness: .9 }), h.G); l.position.set(st.x + Math.cos(f.root.rotation.y) * dx, h.F + .17, st.z - Math.sin(f.root.rotation.y) * dx); }); st.bench = 1; }
          R.studs.push(f); } catch (e) { console.warn("tanuló", h.id, e); } }); }
    if (!on && R.tch) { figDrop(R.tch); R.tch = null; R.studs.forEach(figDrop); R.studs = []; } }
  /* ülő póz a család-figurának: a frissítés UTÁN felülírjuk a csípőt, a térdet és a test magasságát */
  function figSit(f, seatY) { const c = f.c; if (!c.legs) return; c.legs.forEach((L) => { L.hip.rotation.x = -1.5; L.knee.rotation.x = 1.5; L.foot.rotation.x = 0; });
    /* a fenék a pad tetején: a csípőcsukló a pad fölött a comb vastagságával (a combcsont tengelye) – így nem süllyed bele a deszkába */
    if (f.thR == null) { try { const bb = new THREE.Box3(), L = c.legs[0]; let r = 0; L.hip.children.forEach((ch) => { if (ch.isMesh && ch !== L.knee) { ch.geometry.computeBoundingBox(); bb.copy(ch.geometry.boundingBox); r = Math.max(r, (bb.max.x - bb.min.x) / 2, (bb.max.z - bb.min.z) / 2); } }); f.thR = r || .07; f.hipOff = L.hip.position.y; } catch (e) { f.thR = .07; f.hipOff = 0; } }
    c.mover.position.y = seatY / f.s - c.pelvis.position.y - (f.hipOff || 0) + f.thR * 1.02; }
  /* ---- a tábla rajza a közös vásznon ---- */
  function roomDraw(R) {
    const g = RB.g, L = R.lessons[R.i] || R.lessons[0], W2 = 1800, H2 = 1000; if (!L) return;
    const bg = g.createLinearGradient(0, 0, 0, H2); bg.addColorStop(0, "#21443c"); bg.addColorStop(1, "#16302a"); g.fillStyle = bg; g.fillRect(0, 0, W2, H2);
    g.fillStyle = "rgba(255,255,255,.035)"; for (let i = 0; i < 40; i++) g.fillRect((i * 337) % W2, (i * 191) % H2, 120, 2);
    const secC = SEC_C[L.s] || R.h.col; g.fillStyle = secC; uiRR(g, 40, 30, 640, 70, 35); g.fill(); g.fillStyle = "#14161b"; g.font = `900 38px ${UIF}`; g.fillText(L.s.toUpperCase(), 70, 79); g.fillStyle = "rgba(255,255,255,.8)"; g.font = `700 34px ${UIF}`; g.textAlign = "right"; g.fillText(`${R.i + 1} / ${R.lessons.length}`, W2 - 50, 78); g.textAlign = "left";
    g.save(); g.translate(40, 140); g.save(); uiRR(g, 0, 0, 1020, 646, 26); g.clip(); g.scale(1020 / 300, 646 / 190); try { L.d(g, R.t); } catch (e) { console.warn("ábra", e); } g.restore(); g.lineWidth = 6; g.strokeStyle = "rgba(255,255,255,.85)"; uiRR(g, 0, 0, 1020, 646, 26); g.stroke(); g.restore();
    g.fillStyle = "#fff8e0"; g.font = `900 46px ${UIF}`; const nt = uiWrap(g, L.t, 1090, 186, 680, 54, 3) || 1; /* 2026-11-15 este: hosszabb tananyagnál kisebb betű, hogy a teljes szöveg kiférjen a táblára */ const ty0 = 186 + nt * 54 + 34, tlen = L.say.length, tfs = tlen > 640 ? 25 : tlen > 520 ? 27 : tlen > 420 ? 29 : 31, tlh = Math.round(tfs * 1.32); g.fillStyle = "rgba(255,255,255,.9)"; g.font = `600 ${tfs}px ${UIF}`; uiWrap(g, L.say, 1090, ty0, 680, tlh, Math.floor((888 - ty0) / tlh));
    R.lessons.forEach((q, i) => { const x = 60 + i * (1700 / R.lessons.length), on = i === R.i; g.fillStyle = on ? "#ffd166" : i < R.i ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.22)"; g.beginPath(); g.arc(x, 940, on ? 15 : 9, 0, TAU); g.fill(); });
    g.fillStyle = "rgba(255,209,102,.8)"; g.fillRect(40, 900, 1020 * cl01(R.t / roomDur(R, R.i)), 8); if (!R.playing) { g.fillStyle = "rgba(0,0,0,.45)"; uiRR(g, 760, 360, 300, 110, 20); g.fill(); g.fillStyle = "#ffd166"; g.font = `900 44px ${UIF}`; g.textAlign = "center"; g.fillText(R.t > 0 ? "⏸ szünet" : "▶ indítsd!", 910, 432); g.textAlign = "left"; }
    RB.tex.needsUpdate = true; }
  /* ---- a LECKEKÖNYV (két oldal: balra 7, jobbra 4 lecke, alatta a gombok) ---- */
  const BOOK_L = 7, BOOK_R = 4, BOOK_N = BOOK_L + BOOK_R;
  function bookDraw(R) { const g = RB.bg, w = 1600, hh = 1000, h = R.h, hits = R.hits = []; g.clearRect(0, 0, w, hh);
    const pgG = (x0) => { const gr = g.createLinearGradient(x0, 0, x0 + 800, 0); if (x0 === 0) { gr.addColorStop(0, "#efe4c6"); gr.addColorStop(.9, "#f6eedb"); gr.addColorStop(1, "#d9c9a2"); } else { gr.addColorStop(0, "#d9c9a2"); gr.addColorStop(.1, "#f6eedb"); gr.addColorStop(1, "#efe4c6"); } g.fillStyle = gr; g.fillRect(x0, 0, 800, hh); }; pgG(0); pgG(800);
    g.fillStyle = "rgba(120,90,40,.07)"; for (let k = 0; k < 200; k++) g.fillRect((k * 397) % w, (k * 211) % hh, 2, 2);
    g.fillStyle = h.col; uiRR(g, 50, 36, 700, 92, 20); g.fill(); g.fillStyle = "#fff"; g.font = `900 46px ${UIF}`; g.fillText(h.name, 76, 98); g.fillStyle = "#4a3520"; g.font = `700 30px ${UIF}`; g.fillText("Tanít: " + (TEACH_N[h.teacher] || "") , 60, 168);
    const p0 = R.page * BOOK_N, row = (i, x, y) => { const L = R.lessons[i]; if (!L) return; const on = i === R.i && (R.playing || R.t > 0), hv = R.bhov === "L" + i; if (on || hv) { g.fillStyle = on ? "rgba(255,209,102,.6)" : "rgba(0,0,0,.06)"; uiRR(g, x - 10, y - 46, 720, 84, 16); g.fill(); }
      g.fillStyle = SEC_C[L.s] || h.col; g.beginPath(); g.arc(x + 26, y - 4, 26, 0, TAU); g.fill(); g.fillStyle = "#14161b"; g.font = `900 28px ${UIF}`; g.textAlign = "center"; g.fillText(String(i + 1), x + 26, y + 6); g.textAlign = "left";
      g.fillStyle = "#1e1a14"; g.font = `800 32px ${UIF}`; let t = L.t; while (g.measureText(t).width > 600 && t.length > 4) t = t.slice(0, -2); if (t !== L.t) t += "…"; g.fillText(t, x + 66, y - 2); g.fillStyle = "#7a6440"; g.font = `600 22px ${UIF}`; g.fillText(L.s + (R.done[i] ? "  ✔" : ""), x + 66, y + 28);
      hits.push({ x: x - 10, y: y - 46, w: 720, h: 84, id: "L" + i, fn: () => { R.mode = "one"; roomGo(R, i, true); } }); };
    for (let k = 0; k < BOOK_L; k++) row(p0 + k, 60, 262 + k * 104); for (let k = 0; k < BOOK_R; k++) row(p0 + BOOK_L + k, 860, 92 + k * 104);
    const btn = (x, y, bw, bh, lab, fn, gold, id) => { const hv = R.bhov === id; g.fillStyle = gold ? (hv ? "#ffe9a8" : "#ffd166") : (hv ? "#2f6db0" : "#1d5a8e"); uiRR(g, x, y, bw, bh, 18); g.fill(); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 3; g.stroke(); g.fillStyle = gold ? "#14161b" : "#fff"; g.font = `900 ${bh > 90 ? 40 : 30}px ${UIF}`; g.textAlign = "center"; g.fillText(lab, x + bw / 2, y + bh / 2 + 11); g.textAlign = "left"; hits.push({ x, y, w: bw, h: bh, id, fn }); };
    btn(860, 520, 690, 110, "▶  TELJES ANYAG – sorban", () => { R.mode = "all"; roomGo(R, 0, true); }, true, "all");
    btn(860, 648, 336, 92, R.playing ? "⏸ Szünet" : "▶ Folytatás", () => roomPause(R), false, "pp"); btn(1214, 648, 336, 92, SCH.voice ? "🔊 Hang" : "🔇 Néma", () => { SCH.voice = !SCH.voice; if (!SCH.voice) roomHush(); bookDraw(R); }, false, "vo");
    const np = Math.ceil(R.lessons.length / BOOK_N); btn(860, 758, 220, 86, "◀ lap", () => { R.page = Math.max(0, R.page - 1); bookFlip(R, -1); }, false, "pv"); g.fillStyle = "#4a3520"; g.font = `800 30px ${UIF}`; g.textAlign = "center"; g.fillText(`${R.page + 1} / ${np}`, 1205, 812); g.textAlign = "left"; btn(1330, 758, 220, 86, "lap ▶", () => { R.page = Math.min(np - 1, R.page + 1); bookFlip(R, 1); }, false, "nx");
    btn(860, 862, 690, 92, "🧍 Felállok", () => roomStand(), false, "up");
    RB.btex.needsUpdate = true; }
  function bookClick(R, hh) { if (SCH.R !== R) { roomSit(R); return; } if (hh && !hh.uv && hh.point) { const lp = R.book.worldToLocal(hh.point.clone()); hh = { uv: { x: clamp(.5 - lp.x / .76, 0, 1), y: clamp(.5 - lp.z / .475, 0, 1) } }; } if (!hh || !hh.uv) return; const x = hh.uv.x * 1600, y = (1 - hh.uv.y) * 1000; const b = (R.hits || []).find((q) => q.fn && x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); if (b) { try { uiSnd("press"); hapt(.3, 30); } catch (e) {} b.fn(); bookDraw(R); } }
  /* lapozás: egy lap átfordul a gerinc körül */
  function bookFlip(R, dir) { bookDraw(R); try { const top = R.bookTop; if (!RB.flipM) { RB.flipM = std({ color: "#f3ead2", roughness: .9, side: THREE.DoubleSide }); } const pg = new THREE.PlaneGeometry(.38, .47); pg.rotateX(-Math.PI / 2); pg.translate(-.19, 0, 0); const m = new THREE.Mesh(pg, RB.flipM); m.position.y = .075; top.add(m); m.rotation.z = dir > 0 ? 0 : -Math.PI; R.flip = { m, t: 0, dir }; try { uiSnd("hover"); } catch (e) {} } catch (e) {} }
  /* ---- hang: előre felvett természetes beszéd; ha nincs, a böngésző magyar géphangja ----
     2026-11-15 este – HANGJEGYZÉK: a felvett hang CSAK akkor szól, ha pontosan ahhoz a szöveghez készült. A „hang/lecke/hangok.json” házanként
     a szöveg ujjlenyomatát (FNV-1a, 36-os számrendszer) köti a hangfájlhoz: { "vih": { "<ujjlenyomat>": "<fájlnév>" } }. Ha egy lecke szövege változik
     (felnőtt hangnem, új tananyag), a régi felvétel már nem szól bele – a szöveg a táblán olvasható, és a böngésző magyar hangja olvassa fel,
     amíg az új felvétel el nem készül (forras/tools/hangok.py). Így egy lecke beszúrása sem keveri össze a sorszám szerinti fájlokat. */
  const VOX = new Map(), VMAN = { p: null, m: null };
  function vHash(s) { let h = 0x811c9dc5; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); }
  function vManifest() { if (!VMAN.p) VMAN.p = fetch("hang/lecke/hangok.json?v=" + (window.ZEPHYR_BV || Date.now())).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((m) => { VMAN.m = m || {}; return VMAN.m; }); return VMAN.p; }
  function vFile(id, txt) { const m = VMAN.m && VMAN.m[id], f = m && m[vHash(txt)]; return f ? `hang/lecke/${id}/${f}.mp3` : null; }
  const vText = (L) => L.t + ". " + L.say;
  function vBuf(url) { const a = T.ac(); if (!a || !url) return Promise.resolve(null); const v = VOX.get(url); if (v === "x") return Promise.resolve(null); if (v && v.then) return v; if (v) return Promise.resolve(v);
    const pr = fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then((ab) => new Promise((res, rej) => a.decodeAudioData(ab, res, rej))).then((b) => { VOX.set(url, b); return b; }).catch(() => { VOX.set(url, "x"); return null; });
    VOX.set(url, pr); return pr; }
  /* a böngésző magyar géphangja (ha van): női tanárhoz magasabb, férfihoz mélyebb hangszín */
  function vSynth(txt, R, durHint) { try { const ss = window.speechSynthesis; if (!ss) return false; const vs = ss.getVoices().filter((q) => /^hu/i.test(q.lang)); if (!vs.length) return false;
      const fem = R.h.voice === "anna" || R.h.voice === "berta", v = vs.find((q) => (fem ? /t[üu]nde|female|n[őo]i|anna|noemi|ilona/i : /szabolcs|male|f[ée]rfi|imre|tam[áa]s/i).test(q.name)) || vs[0];
      const u = new SpeechSynthesisUtterance(String(txt).replace(/[„”]/g, "")); u.voice = v; u.lang = v.lang; u.rate = .98; u.pitch = fem ? 1.08 : .85; ss.speak(u); if (R.tch) R.tch.c.say(durHint); return true; } catch (e) { return false; } }
  function roomHush() { try { speechSynthesis.cancel(); } catch (e) {} if (RB.src) { try { RB.src.stop(); } catch (e) {} RB.src = null; } }
  function vPlay(R, buf) { const a = T.ac(); const src = a.createBufferSource(); src.buffer = buf; let out = null; try { const v = new THREE.Vector3(); (R.tch ? R.tch.root : R.board).getWorldPosition(v); v.y += 1.5; const sp = sp3(v, "vox", 4); out = sp && sp.node; } catch (e) {} src.connect(out || T.outBus("vox") || T.outBus()); src.start(); RB.src = src; if (R.tch) R.tch.c.say(buf.duration); return src; }
  function roomGreet(R) { roomHush(); const txt = GREET[R.h.id]; if (!SCH.voice || !txt) return; R.greetEnd = W.t + txt.length / 13; if (R.tch) { R.tch.c.act("integet"); R.tch.c.say(txt.length / 13); }
    vManifest().then(() => vBuf(vFile(R.h.id, txt))).then((b) => { if (SCH.R !== R || R.playing) return; if (b && b.duration) { try { vPlay(R, b); R.greetEnd = W.t + b.duration + .3; } catch (e) {} } else vSynth(txt, R, txt.length / 13); }); }
  function roomSpeak(R) { roomHush(); R.adur = 0; R.wait = 0; if (!SCH.voice) return; const L = R.lessons[R.i], i0 = R.i; R.wait = 1;
    const fallback = () => { R.wait = 0; vSynth(vText(L), R, roomDur(R, R.i) - 2.5); };
    vManifest().then(() => vBuf(vFile(R.h.id, vText(L)))).then((b) => { if (SCH.R !== R || R.i !== i0 || !R.playing) return; if (!b || !b.duration) { fallback(); return; }
      try { vPlay(R, b); R.adur = b.duration; R.adurI = i0; R.t = 0; R.wait = 0; } catch (e) { fallback(); } }); }
  function roomGo(R, i, start) { R.i = clamp(i, 0, R.lessons.length - 1); R.t = 0; if (start) R.playing = true; R.page = Math.floor(R.i / BOOK_N); const c = R.tch && R.tch.c;
    if (c) c.act(R.i === 0 || R.i === R.lessons.length - 1 ? "integet" : ["mutat", "rax", "mutat", "bolint"][R.i % 4]);
    if (R.playing) roomSpeak(R); else roomHush(); roomDraw(R); bookDraw(R); if (SCH.LB) SCH.LB.dirty = 1; }
  function roomPause(R) { R.playing = !R.playing; if (!R.playing) roomHush(); else roomSpeak(R); roomDraw(R); bookDraw(R); if (SCH.LB) SCH.LB.dirty = 1; }
  /* ---- leülés / felállás ---- */
  function roomSit(R) { if (!HB.walk) hbWalk(true); if (SCH.R !== R) roomEnter(R); HB.pos = { x: R.h.seat.x, z: R.h.seat.z }; HB.seat = R; R.sitAt = W.t; try { faceYaw(R.yaw + Math.PI); } catch (e) {} if (!T.inVR) { try { const lc = T.cam.components["look-controls"]; if (lc && lc.pitchObject) lc.pitchObject.rotation.x = -.08; } catch (e) {} }
    try { uiSnd("success"); } catch (e) {} if (SCH.LB) { SCH.LB.destroy(); SCH.LB = null; } roomEnter(R); bookDraw(R); roomBar(); if (!R.playing && !(R.t > 0)) R.autoAt = Math.max(W.t + 1.6, R.greetEnd || 0); }
  function roomStand() { const R = HB.seat; HB.seat = null; if (R) R.autoAt = 0; if (SCH.BL) { SCH.BL.destroy(); SCH.BL = null; } if (R) { HB.pos = { x: R.h.seat.x - Math.sin(R.yaw) * .9, z: R.h.seat.z - Math.cos(R.yaw) * .9 }; } if (SCH.R && !T.inVR) { const B = roomLB(SCH.R); B.show(true); roomDock(B); } }
  /* ülve 2D-ben: kis sáv alul (a könyvre lenézés, szünet, felállás) */
  function roomBar() { if (T.inVR) return; if (SCH.BL && UIB.list.indexOf(SCH.BL) >= 0) return; SCH.BL = uiBoard({ w: 1500, h: 150, mw: 1.15, dist: 1.05, y: -.5, fps: 3, draw: (B, g) => { const R = SCH.R; if (!R) return; g.fillStyle = "rgba(8,26,48,.9)"; uiRR(g, 0, 0, 1500, 150, 26); g.fill();
      B.btn(16, 22, 470, 106, "📖 Lenézek a könyvre", () => { try { const lc = T.cam.components["look-controls"]; lc.pitchObject.rotation.x = lc.pitchObject.rotation.x < -.4 ? -.08 : -.72; } catch (e) {} }, { fs: 30 });
      B.btn(500, 22, 340, 106, R.playing ? "⏸ Szünet" : "▶ Indítás", () => { if (!R.playing && R.t === 0 && !R.done[R.i]) { R.mode = "all"; roomGo(R, R.i, true); } else roomPause(R); B.dirty = 1; }, { fs: 30 });
      B.btn(854, 22, 300, 106, "Következő ▶", () => { roomGo(R, R.i + 1, true); B.dirty = 1; }, { fs: 28, off: R.i >= R.lessons.length - 1 }); B.btn(1168, 22, 316, 106, "🧍 Felállok", () => roomStand(), { fs: 30 }); } }); SCH.BL.show(true); roomDock(SCH.BL); setTimeout(() => roomDock(SCH.BL), 60); }
  /* állva a házban: a vezérlő tábla (felirat + gombok), mint eddig – és a „Leülök” gomb */
  /* állva a házban (csak 2D-ben): keskeny sáv alul – VR-ben semmi nem lebeg előtted, minden a tenyérmenüben */
  function roomLB(R) {
    if (SCH.LB && UIB.list.indexOf(SCH.LB) >= 0) return SCH.LB;
    SCH.LB = uiBoard({ w: 1500, h: 150, mw: 1.15, dist: 1.05, y: -.5, fps: 3, draw: (B, g) => { g.fillStyle = "rgba(8,26,48,.9)"; uiRR(g, 0, 0, 1500, 150, 26); g.fill(); g.strokeStyle = R.h.col; g.lineWidth = 5; uiRR(g, 3, 3, 1494, 144, 24); g.stroke();
      B.btn(16, 22, 420, 106, "🪑 Leülök", () => roomSit(R), { gold: true, fs: 32 });
      B.btn(450, 22, 400, 106, R.playing ? "⏸ Szünet" : "▶ Teljes anyag", () => { if (R.playing || R.t > 0) roomPause(R); else { R.mode = "all"; roomGo(R, 0, true); } B.dirty = 1; }, { fs: 30 });
      B.btn(864, 22, 140, 106, SCH.voice ? "🔊" : "🔇", () => { SCH.voice = !SCH.voice; if (!SCH.voice) roomHush(); B.dirty = 1; }, { fs: 34 });
      if (R.h.id === "isk") B.btn(1018, 22, 230, 106, "🎓 Pálya ▶", () => schoolLeave(true), { fs: 28 });
      B.btn(R.h.id === "isk" ? 1262 : 1018, 22, R.h.id === "isk" ? 222 : 466, 106, "🚪 Ki", () => schoolLeave(false), { fs: 30 }); } });
    return SCH.LB; }
  function roomDock(B) { if (B && B.dom && B.dcv) { B.dom.style.alignItems = "flex-end"; B.dom.style.justifyContent = "center"; B.dom.style.background = "transparent"; B.dom.style.pointerEvents = "none"; B.dcv.style.pointerEvents = "auto"; B.dcv.style.maxWidth = "min(58vw, 980px)"; B.dcv.style.marginBottom = "max(12vh, 92px)"; } }
  function schoolLeave(toCourse) { const R = SCH.R; roomHush(); if (R) R.playing = false; HB.seat = null; if (SCH.LB) { SCH.LB.destroy(); SCH.LB = null; } if (SCH.BL) { SCH.BL.destroy(); SCH.BL = null; }
    if (toCourse) { wzStartTut(); return; } const o = R && R.h.out; HB.pos = o ? { x: o.x, z: o.z } : { x: 1.6, z: 1.2 }; if (o) { try { faceYaw(Math.atan2(-(o.lx - o.x), -(o.lz - o.z))); } catch (e) {} } }
  /* belépés a menüből („🎓 Oktatás”): leülsz az iskolában, és a nagypapa sorban elkezdi a teljes anyagot */
  function hbSchool() { const R = ROOMS.isk; if (!R) { wzStartTut(); return; } hbWalk(true); roomSit(R); R.mode = "all"; setTimeout(() => roomGo(R, 0, true), 400); }
  function roomEnter(R) { if (SCH.R === R) return; if (SCH.R) roomExit(SCH.R); SCH.R = R; R.board.material.map = RB.tex; R.board.material.needsUpdate = true; R.book.material.map = RB.btex; R.book.material.needsUpdate = true; roomFigs(R, true); roomDraw(R); bookDraw(R);
    if (HB.B) HB.B.show(false); if (!HB.seat && !T.inVR) { const B = roomLB(R); B.show(true); roomDock(B); setTimeout(() => roomDock(B), 60); } if (!R.playing && W.t - (R.greetT || -99) > 45) { R.greetT = W.t; setTimeout(() => { if (SCH.R === R && !R.playing) roomGreet(R); }, 500); } }
  function roomExit(R) { roomHush(); R.playing = false; R.autoAt = 0; R.board.material.map = R.statT; R.board.material.needsUpdate = true; R.book.material.map = R.bookStat; R.book.material.needsUpdate = true; SCH.R = null; if (SCH.LB) { SCH.LB.destroy(); SCH.LB = null; } if (SCH.BL) { SCH.BL.destroy(); SCH.BL = null; } HB.seat = null; }
  function roomAt(p) { for (const id in ROOMS) { const B = ROOMS[id].h.box; if (p.x > B.x0 && p.x < B.x1 && p.z > B.z0 && p.z < B.z1) return ROOMS[id]; } return null; }
  function schoolTick(dt) {
    if (!SCH.built) return; const p = HB.pos || { x: 0, z: 0 }; const R = HB.walk ? roomAt(p) : null;
    if (HB.seat && (Math.hypot(p.x - HB.seat.h.seat.x, p.z - HB.seat.h.seat.z) > .05 || !HB.walk)) { HB.seat = null; if (SCH.BL) { SCH.BL.destroy(); SCH.BL = null; } if (R && R === SCH.R) { const B = roomLB(R); B.show(true); roomDock(B); } }
    if (R !== SCH.R) { if (R) roomEnter(R); else if (SCH.R) roomExit(SCH.R); }
    let cam = null; try { cam = new THREE.Vector3(); T.sceneEl.camera.getWorldPosition(cam); } catch (e) {}
    /* a szereplők (tanár + tanulók) részletes család-figurák: csak abban a házban látszanak és mozognak, ahol vagy; a ház közelében (10 m) már
       előre felépülnek, hogy belépéskor ne akadjon a kép; messzebb (22 m) eltűnnek a memóriából is */
    for (const id in ROOMS) { const Q = ROOMS[id], B = Q.h.box, d = Math.hypot(p.x - (B.x0 + B.x1) / 2, p.z - (B.z0 + B.z1) / 2), near = !!HB.walk && d < 10;
      if (near && !Q.tch) roomFigs(Q, true); else if (!near && Q.tch && d > 22 && SCH.R !== Q) roomFigs(Q, false);
      if (!Q.tch) continue; const vis = SCH.R === Q; Q.tch.root.visible = vis; Q.studs.forEach((f) => { f.root.visible = vis; }); if (!vis) continue;
      const tc = Q.tch.c; if (cam) tc.lookAt(cam); tc.update(dt, W.t);
      /* a tanár feléd fordul (beszéd közben kicsit a tábla felé is), simán */
      { const t0 = Q.h.tpos, ty = Math.atan2(p.x - t0.x, p.z - t0.z), by = Math.atan2(Q.h.board.x - t0.x, Q.h.board.z - t0.z); let d2 = by - ty; d2 = Math.atan2(Math.sin(d2), Math.cos(d2)); const tgt = ty + (Q.playing ? d2 * .3 : 0), r0 = Q.tch.root.rotation.y; let dd = tgt - r0; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); Q.tch.root.rotation.y = r0 + dd * Math.min(1, dt * 2.5); }
      Q.studs.forEach((f) => { const c = f.c; if (SCH.R === Q && Q.tch) { const v = new THREE.Vector3(); Q.tch.root.getWorldPosition(v); v.y += 1.6; c.lookAt(v); } c.update(dt, W.t); figSit(f, f.st.seatY || (Q.h.id === "isk" ? .51 : .47));
        f.nx -= dt; if (f.nx <= 0) { f.nx = 5 + Math.random() * 7; if (SCH.R === Q && Q.playing) c.act(["bolint", "ir", "bolint", f.st.k === "gyerek" ? "integet" : "bolint"][(Math.random() * 4) | 0]); } }); }
    if (HB.signLbl) HB.signLbl.visible = !SCH.R; for (const id in ROOMS) if (ROOMS[id].chairG) ROOMS[id].chairG.visible = HB.seat !== ROOMS[id];
    if (R && R.flip) { const f = R.flip; f.t += dt / .45; const k = kEase(Math.min(1, f.t)); f.m.rotation.z = f.dir > 0 ? -k * Math.PI : -(1 - k) * Math.PI; if (f.t >= 1) { f.m.parent.remove(f.m); f.m.geometry.dispose(); R.flip = null; } }
    if (!R) return;
    if (R.autoAt && HB.seat === R && W.t > R.autoAt && !R.playing) { R.autoAt = 0; if (!(R.t > 0)) { R.mode = "all"; roomGo(R, 0, true); } }
    if (R.playing && !R.wait) { R.t += dt; if (R.t > roomDur(R, R.i)) { R.done[R.i] = 1; if (R.mode === "all" && R.i < R.lessons.length - 1) roomGo(R, R.i + 1); else { R.playing = false; R.t = roomDur(R, R.i); if (R.tch) R.tch.c.act("bolint"); R.studs.forEach((f) => f.c.act(f.st.k === "gyerek" ? "tapsol" : "bolint")); bookDraw(R); if (SCH.LB) SCH.LB.dirty = 1; if (SCH.BL) SCH.BL.dirty = 1; } } }
    else if (R.wait) { R.wait += dt; if (R.wait > 4) R.wait = 0; }
    RB.acc = (RB.acc || 0) + dt; if (RB.acc > 1 / 24) { RB.acc = 0; roomDraw(R); }
    if (SCH.LB && SCH.LB.dom) roomDock(SCH.LB);
  }
