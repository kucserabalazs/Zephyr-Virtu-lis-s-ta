  /* =================================================================== 2/J. A VALÓDI BALATON A VERSENYPÁLYA KÖRÜL (2026. nov. 14., a tulajdonos 15:45-ös kérésére:
     „A Balaton pontos térképészeti felületét és a környező települések és a helyi látványosságok legyenek pontosak!”)
     • Minden futam a tó egy VALÓDI pontján zajlik (VENUES: szélesség/hosszúság). Körülötte a teljes tó: a pontos partvonal (OSM), a domborzat a valódi csúcsokkal,
       a települések és a nevezetességek a valódi koordinátáikon – tehát a Tihanyi apátság, a Badacsony, a siófoki víztorony pontosan abban az irányban és akkora
       szögben látszik, ahogy a valóságban onnan.
     • A kamera látótávolsága 4 km, ezért a távoli tájat SUGÁRIRÁNYBAN „összehúzzuk” a pálya köré: minden pontot a saját irányában közelebb hozunk, és vele arányosan
       kicsinyítjük (magasságát is) – így a látszó irány és a látszó magasság (szög) változatlan, csak a távolság rövidül. 1,3 km-en belül minden valódi méretű.
     • A Föld görbülete (a fénytöréssel, k = 0,13) is benne van: a túlpart lába a víz mögé bukik, ahogy a valóságban (Siófokról Keszthely partja nem látszik).
     • Légperspektíva: a távolság szerint kékes párába vesző hegyek.
     • VIHARJELZÉS (STM): a hivatalos balatoni rendszer – három medence (nyugati: Keszthely – Badacsony/Fonyód vonal; középső: – Tihany/Szántód vonal; keleti),
       a parti jelzőlámpák és a három tóközépi jelző; elsőfok: 45 villanás/perc (40–60 km/h-s széllökés várható), másodfok: 90 villanás/perc (60 km/h fölött).
       Ha az oldal saját (PHP-s) szerveren fut, és a viharjelzési idény (ápr. 1. – okt. 31.) tart, a HungaroMet aktuális fokozatait mutatja; különben a futam szeléből. */
  const BAL_O = [46.88936, 17.96297], BAL_KX = 111320 * Math.cos(46.85 * D2R), BAL_KY = 110950;   /* origó: a Zephyr Apartmanház */
  const BAL = {};
  const bsst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function balXY(lat, lon) { return [(lon - BAL_O[1]) * BAL_KX, -(lat - BAL_O[0]) * BAL_KY]; }
  function balLL(x, z) { return [BAL_O[0] - z / BAL_KY, BAL_O[1] + x / BAL_KX]; }
  function balData() {
    if (BAL.H) return BAL;
    const dec = (s) => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
    BAL.H = dec(BAL_HB); const cp = dec(BAL_CB), n = BAL_M.nx * BAL_M.ny; BAL.C = new Uint8Array(n); for (let i = 0; i < n; i++) BAL.C[i] = (cp[i >> 1] >> ((i & 1) * 4)) & 15;
    /* a partvonal méterben + sávos gyorsítás a pont-a-tóban vizsgálathoz */
    const P = HV_SHORE.map(([lo, la]) => balXY(la, lo)); BAL.P = P; const N = P.length;
    let z0 = 1e9, z1 = -1e9; P.forEach((p) => { z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }); BAL.z0 = z0; BAL.bz = 200; const nb = Math.ceil((z1 - z0) / BAL.bz) + 1; BAL.bk = Array.from({ length: nb }, () => []);
    for (let i = 0; i < N; i++) { const a = P[i], b = P[(i + 1) % N], q0 = Math.floor((Math.min(a[1], b[1]) - z0) / BAL.bz), q1 = Math.floor((Math.max(a[1], b[1]) - z0) / BAL.bz); for (let q = Math.max(0, q0); q <= Math.min(nb - 1, q1); q++) BAL.bk[q].push(i); }
    return BAL;
  }
  function balInLake(x, z) {
    const B = balData(), q = Math.floor((z - B.z0) / B.bz); if (q < 0 || q >= B.bk.length) return false; const P = B.P, N = P.length; let c = false;
    const L = B.bk[q]; for (let k = 0; k < L.length; k++) { const i = L[k], a = P[i], b = P[(i + 1) % N]; if ((a[1] > z) !== (b[1] > z) && x < a[0] + (z - a[1]) / (b[1] - a[1]) * (b[0] - a[0])) c = !c; }
    return c;
  }
  /* domborzat (m a tó szintje fölött) és felszínborítás egy pontban */
  function balHgt(x, z) {
    const B = balData(), M = BAL_M, [la, lo] = balLL(x, z); let fx = (lo - M.lon0) / M.dl, fy = (la - M.lat0) / M.dp;
    fx = clamp(fx, 0, M.nx - 1.001); fy = clamp(fy, 0, M.ny - 1.001); const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, H = B.H, i0 = iy * M.nx + ix;
    const hg = 2 * ((H[i0] * (1 - tx) + H[i0 + 1] * tx) * (1 - ty) + (H[i0 + M.nx] * (1 - tx) + H[i0 + M.nx + 1] * tx) * ty), pk = balPeakAt(x, z)[0];
    return pk > hg * .9 ? Math.max(hg * .35 + pk * .65, pk) : hg;   /* a pontos csúcsprofil a rács fölött */
  }
  /* a jellegzetes csúcsok PONTOS alakja (nem a rácsból): tanúhegy = lapos tető, bazaltorgona-fal, alatta szőlőlejtő; kúp; kupola. [név, szél., hossz., tszf. m, sugár km, alak] */
  const BAL_PEAKS = [["Badacsony", 46.80351, 17.49584, 437.4, 1.55, "table"], ["Szent György-hegy", 46.8456, 17.4469, 415, 1.3, "table"], ["Gulács", 46.8331, 17.5056, 393, .75, "cone"], ["Tóti-hegy", 46.8389, 17.5362, 347, .6, "cone"],
    ["Csobánc", 46.8756, 17.5078, 376, .8, "table"], ["Szigligeti Várhegy", 46.8042, 17.4343, 239, .45, "cone"], ["Hegyestű", 46.888, 17.647, 337, .5, "cone"], ["Tihany – Csúcs-hegy", 46.90642, 17.85232, 232, .7, "dome"],
    ["Tihany – Nyereg-hegy", 46.91104, 17.85291, 223, .55, "dome"], ["Tihany – Apáti-hegy", 46.91214, 17.85574, 214, .5, "dome"], ["Tihany – Akasztó-domb", 46.90344, 17.89329, 198, .55, "dome"], ["Tihany – Óvár", 46.9228, 17.87959, 190, .5, "dome"], ["Tihany – az apátság dombja", 46.9137, 17.8889, 182, .42, "dome"],
    ["Fonyódi Várhegy", 46.73654, 17.54116, 231, .7, "dome"], ["Fonyódi Sipos-hegy", 46.7435, 17.5662, 207, .6, "dome"], ["Boglári Várdomb", 46.779, 17.652, 165, .55, "dome"], ["Kőhegy (Zamárdi)", 46.87217, 17.93216, 219, 1.1, "dome"]];
  /* 17:50 (tulajdonos: „a vulkanikus hegyek meghatározzák a balatoni látképet, kapjanak több hangsúlyt a háttérben”): a tanúhegyek és a vulkáni kúpok
     30%-kal kiemelve (magasság), kevésbé párásak és mélyebb színűek – a valódi helyükön és alakjukkal, csak hangsúlyosabban (a Kőhegy nem vulkán) */
  function balPeaks() { if (BAL.pk) return BAL.pk; BAL.pk = BAL_PEAKS.map(([n, la, lo, hm, R, sh]) => { const [x, z] = balXY(la, lo), vol = !/Kőhegy/.test(n), ex = /Tihany/.test(n) ? 1.7 : /Boglári/.test(n) ? 2.1 : /Kőhegy/.test(n) ? 1.9 : /Fonyódi/.test(n) ? 1.5 : 1.3; return { n, x, z, hr: (hm - 104.8) * ex, R: R * 1000 * (ex > 1.6 ? 1.15 : 1), sh, vol };   /* a kisebb dombok (Tihany, Boglár, Kőhegy, Fonyód) erősebben kiemelve, hogy minden helyszínen hangsúlyos hegy legyen szemközt */ }); return BAL.pk; }
  /* a csúcs-profil (m a tó fölött) és az övezet: 1 = tető (erdő), 2 = bazaltfal, 3 = szőlőlejtő */
  function balPeakAt(x, z) { let h = 0, zone = 0; const pk = balPeaks();
    for (let i = 0; i < pk.length; i++) { const p = pk[i], dx = x - p.x, dz = z - p.z; if (Math.abs(dx) > p.R * 1.6 || Math.abs(dz) > p.R * 1.6) continue; const r = Math.hypot(dx, dz) / p.R; let q = 0, zn = 0;
      if (p.sh === "table") { const wob = 1 + .035 * Math.sin(Math.atan2(dz, dx) * 7 + p.x * .001); const rr = r * wob; q = rr < .5 ? p.hr * (1 - .04 * rr) : rr < .64 ? p.hr * .98 - (rr - .5) / .14 * p.hr * .26 : p.hr * .70 * Math.pow(Math.max(0, 1 - (rr - .64) / .86), 1.5); zn = rr < .5 ? 1 : rr < .66 ? 2 : rr < 1.35 ? 3 : 0; }
      else if (p.sh === "cone") { q = p.hr * Math.pow(Math.max(0, 1 - r), 1.25); zn = r < .42 ? 1 : r < .95 ? 3 : 0; }
      else { q = p.hr * Math.exp(-r * r * 1.6); zn = r < .5 ? 1 : 0; }
      if (q > h) { h = q; zone = zn; } }
    return [h, zone]; }
  function balCls(x, z) { const B = balData(), M = BAL_M, [la, lo] = balLL(x, z), ix = clamp(Math.round((lo - M.lon0) / M.dl), 0, M.nx - 1), iy = clamp(Math.round((la - M.lat0) / M.dp), 0, M.ny - 1); return B.C[iy * M.nx + ix]; }
  /* sugárirányú összehúzás: d (valódi) → d' (látszó); 1,3 km-en belül valódi */
  function balComp(d) { const D0 = 1300, DM = 3500, L = 8000; return d <= D0 ? d : D0 + (DM - D0) * (1 - Math.exp(-(d - D0) / L)); }
  const BAL_CURV = .87 / (2 * 6371000);   /* a Föld görbülete fénytöréssel: süllyedés = d² · 0,87 / 2R */
  function balHash(a, b) { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }

  /* ---------------------------------------------------------------- települések (a valódi helyükön; r = a beépített terület sugara, km) */
  const BAL_TOWNS = [["Zamárdi", 46.885, 17.953, 1.1], ["Siófok", 46.905, 18.058, 2.2], ["Balatonföldvár", 46.851, 17.881, .9], ["Balatonlelle", 46.782, 17.69, 1.3], ["Balatonboglár", 46.775, 17.655, 1.1], ["Fonyód", 46.741, 17.555, 1.3],
    ["Balatonmáriafürdő", 46.704, 17.385, .8], ["Keszthely", 46.768, 17.243, 1.9], ["Gyenesdiás", 46.771, 17.29, .9], ["Szigliget", 46.795, 17.435, .6], ["Badacsonytomaj", 46.806, 17.512, .8], ["Révfülöp", 46.829, 17.627, .7], ["Zánka", 46.871, 17.685, .6],
    ["Balatonakali", 46.882, 17.752, .6], ["Tihany", 46.914, 17.889, .7], ["Balatonfüred", 46.958, 17.89, 1.8], ["Csopak", 46.977, 17.918, .7], ["Alsóörs", 46.985, 17.975, .7], ["Balatonalmádi", 47.03, 18.02, 1.4], ["Balatonkenese", 47.04, 18.107, 1.0],
    ["Balatonvilágos", 46.975, 18.165, .8], ["Szántód", 46.862, 17.905, .5], ["Balatonszemes", 46.81, 17.77, .9], ["Balatonszárszó", 46.828, 17.823, .8], ["Balatonfenyves", 46.716, 17.49, .9], ["Balatonberény", 46.708, 17.32, .6], ["Vonyarcvashegy", 46.757, 17.31, .8],
    ["Balatongyörök", 46.757, 17.358, .6], ["Balatonederics", 46.806, 17.383, .5], ["Ábrahámhegy", 46.814, 17.567, .5], ["Balatonszepezd", 46.851, 17.663, .5], ["Balatonudvari", 46.902, 17.809, .5], ["Balatonakarattya", 47.022, 18.135, .7], ["Balatonaliga", 46.968, 18.158, .6],
    ["Hévíz", 46.792, 17.185, 1.0], ["Tapolca", 46.883, 17.441, 1.4], ["Aszófő", 46.928, 17.84, .4], ["Paloznak", 46.985, 17.94, .4]];
  /* vitorláskikötők (a település partján): a bejárat fényei éjjel – a tó felől behajózva balra vörös, jobbra zöld (IALA „A”) */
  const BAL_HARBORS = ["Siófok", "Balatonfüred", "Tihany", "Balatonföldvár", "Zamárdi", "Badacsonytomaj", "Keszthely", "Fonyód", "Balatonlelle", "Balatonboglár", "Révfülöp", "Balatonalmádi", "Balatonkenese", "Szigliget", "Balatonszemes", "Alsóörs", "Csopak", "Balatonakali", "Zánka", "Balatonmáriafürdő", "Balatonfenyves", "Balatongyörök", "Vonyarcvashegy", "Balatonszárszó", "Balatonvilágos"];
  /* a part legközelebbi pontja egy (lat, lon)-hoz, és onnan a tó felé mutató egységvektor */
  function balShorePt(lat, lon) { const B = balData(), [x, z] = balXY(lat, lon); let bi = 0, bd = 1e18; B.P.forEach((p, i) => { const d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < bd) { bd = d; bi = i; } });
    const N = B.P.length, a = B.P[(bi + N - 2) % N], b = B.P[(bi + 2) % N], p = B.P[bi]; let tx = b[0] - a[0], tz = b[1] - a[1]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    let nx = -tz, nz = tx; if (!balInLake(p[0] + nx * 60, p[1] + nz * 60)) { nx = -nx; nz = -nz; } return { x: p[0], z: p[1], nx, nz, tx, tz }; }

  /* ---------------------------------------------------------------- versenyhelyszínek: a pálya közepe a tó egy valódi pontján */
  /* 2026-11-14 17:49 (tulajdonos: „Szemközt a Badacsonyi hegy igazi szépséget és teret ad … legyenek eltérő helyek, de épp ilyen látványos legyen az összes”):
     minden helyszínen szemközt egy jellegzetes hegy, a tetején a jelképével (Badacsony – Ranolder-kereszt, Tihany – apátság, Boglár – gömbkilátó, Szigliget – vár,
     Fonyód – ikerhegy a kilátóval, Keszthely – a hegység és a kastély, Zamárdi – Kőhegy a kilátóval, Füred – Tamás-hegy) */
  const VENUES = [
    { id: "tihany", n: "Tihany – az apátság alatt", lat: 46.905, lon: 17.918, basin: "keleti", d: "Szemközt a Tihanyi-félsziget dombja, a tetején a kéttornyú bencés apátság; mögötte a Csúcs-hegy, északra Füred, délre a zamárdi part." },
    { id: "badacsony", n: "Badacsony – a tanúhegy előtt", lat: 46.775, lon: 17.530, basin: "nyugati", d: "Szemközt a koporsó alakú Badacsony (437 m) a Ranolder-kereszttel, mellette a Gulács és a Tóti-hegy kúpja, nyugatra a Szent György-hegy és Szigliget." },
    { id: "fonyod", n: "Fonyód – az ikerhegy előtt", lat: 46.765, lon: 17.552, basin: "nyugati", d: "Délen Fonyód ikerhegye, a Várhegy kilátójával; a hátad mögött, északon a Badacsony és a tanúhegyek sora." },
    { id: "fured", n: "Balatonfüred – a Tamás-hegy alatt", lat: 46.935, lon: 17.905, basin: "keleti", d: "Északon Füred: a Kerek templom, a parti szállodák, mögöttük a Tamás- és a Péter-hegy; délnyugatra a Tihanyi-félsziget az apátsággal." },
    { id: "szigliget", n: "Szigliget – a vár alatt", lat: 46.772, lon: 17.440, basin: "nyugati", d: "Szemközt a szigligeti várhegy a 750 éves várral, keletre a Badacsony, mögötte a Szent György-hegy; nyugatra a Keszthelyi-hegység." },
    { id: "boglar", n: "Balatonboglár – a gömbkilátó alatt", lat: 46.7955, lon: 17.660, basin: "kozepso", d: "Délen a boglári Várdomb, a tetején az ezüst gömbkilátó; szemben, északon Révfülöp és a Fülöp-hegy, nyugatra a Badacsony." },
    { id: "keszthely", n: "Keszthely – az öbölben", lat: 46.738, lon: 17.292, basin: "nyugati", d: "Északnyugaton a Keszthelyi-hegység, előtte a város a Festetics-kastéllyal; keletre a Szent György-hegy és a Badacsony." },
    { id: "zamardi", n: "Zamárdi – a Zephyr előtt", lat: 46.898, lon: 17.945, basin: "keleti", d: "Hazai pálya a Zephyr Apartmanház előtt: délen a Kőhegy a kilátóval, nyugatra a Tihanyi-félsziget az apátsággal, északon Füred és Alsóörs." }];
  function vrVenue(lvl) { return VENUES[((lvl || 1) - 1 + VENUES.length) % VENUES.length]; }
  /* a kikötő: Zamárdi, a Zephyr-háztól egyenesen a partra lépve (a móló a part elejétől észak felé fut) */
  function balHarborCentre() { const s = balShorePt(46.8915, 17.9575); return [s.x + s.nx * 12, s.z + s.nz * 12]; }
  function vrShoresBuild(far) { const S = VRR; S.shoreG = new THREE.Group(); (S.env || far).add(S.shoreG); S.shoreOld = makeShores(far); S.shoreOld.visible = false; }

  /* ---------------------------------------------------------------- a táj felépítése egy helyszínhez */
  function vrShoresSet(C, venue) {
    W._bal = { balXY, balLL, balInLake, balHgt, balCls, balShorePt, balHarborCentre, STM };
    const S = VRR; let G = S.shoreG; if (!G) return;
    if (S.env && G.parent !== S.env && !venue.harbor) S.env.add(G);
    while (G.children.length) { const o = G.children[0]; G.remove(o); o.traverse((q) => { if (q.geometry) q.geometry.dispose(); }); }
    const [cx, cz] = venue.harbor ? balHarborCentre() : balXY(venue.lat, venue.lon);
    const NL = [], NS = [], t0 = performance.now();
    balTerrain(G, cx, cz, { r0: venue.harbor ? 5 : 160 });
    balTowns(G, cx, cz, NL, NS, venue);
    balLandmarks(G, cx, cz, NL);
    balTrees(G, cx, cz, venue.harbor ? 2600 : 4200);
    stmBuild(G, cx, cz, venue);
    /* az éjszakai fénypontok iránya a horizont-derengéshez: a legtöbb fény felé */
    let sx = 0, sz = 0; NL.forEach((q) => { const d = Math.hypot(q[0], q[2]) || 1; sx += q[0] / d; sz += q[2] / d; });
    S.nightShore = { NL, NS, D: 2500, ax: Math.atan2(sx, -sz) }; S.venue = venue; S.balC = [cx, cz];
    if (W.debug) console.log("Balaton-táj", venue.id, Math.round(performance.now() - t0), "ms");
  }

  /* 2026-11-14 19:05 (tulajdonos: „a hátsó házak ne lógjanak a semmibe, a táj hegyein illeszkedjenek”): a házak, fák, fények és nevezetességek
     magassága MOST a domborzati háló TÉNYLEGES felszíne – ugyanaz a képlet (a part menti rámpa is), a háló négy szomszédos csúcsából interpolálva. */
  function balVertY(cx, cz, an, r) { const sa = Math.sin(an), ca = -Math.cos(an), wx = cx + sa * r, wz = cz + ca * r; if (balInLake(wx, wz)) return .35;
    let inn = 400; for (let s2 = 10; s2 <= 330; s2 += 20) { if (balInLake(cx + sa * (r + s2), cz + ca * (r + s2)) || (r - s2 > 0 && balInLake(cx + sa * (r - s2), cz + ca * (r - s2)))) { inn = s2; break; } }
    const hh = balHgt(wx, wz); return .55 + 1.1 * bsst(0, 45, inn) + Math.max(0, hh - 1.5) * bsst(20, 320, inn); }
  function balGround(wx, wz) { const T = BAL.terr; if (!T) return balHgt(wx, wz); const dx = wx - T.cx, dz = wz - T.cz, r = Math.hypot(dx, dz); if (r <= T.r0) return balVertY(T.cx, T.cz, 0, Math.max(1, r));
    const fi = Math.log(r / T.r0) / Math.log(T.r1 / T.r0) * (T.NR - 1), i0 = Math.floor(fi), ti = fi - i0, ra = T.r0 * Math.pow(T.r1 / T.r0, i0 / (T.NR - 1)), rb = T.r0 * Math.pow(T.r1 / T.r0, (i0 + 1) / (T.NR - 1));
    let an = Math.atan2(dx, -dz); if (an < 0) an += TAU; const fa = an / TAU * T.NA, a0 = Math.floor(fa), ta = fa - a0, A0 = a0 / T.NA * TAU, A1 = (a0 + 1) / T.NA * TAU;
    const y00 = balVertY(T.cx, T.cz, A0, ra), y01 = balVertY(T.cx, T.cz, A1, ra), y10 = balVertY(T.cx, T.cz, A0, rb), y11 = balVertY(T.cx, T.cz, A1, rb);
    return (y00 * (1 - ta) + y01 * ta) * (1 - ti) + (y10 * (1 - ta) + y11 * ta) * ti; }
  /* a legalacsonyabb felszín az épület alapterülete alatt (lejtőn a ház ne lógjon ki a levegőbe) */
  function balGroundMin(wx, wz, rad) { let m = balGround(wx, wz); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { m = Math.min(m, balGround(wx + a * rad, wz + b * rad)); }); return m; }
  /* egy valódi pont (méterben, az origóhoz képest) → a táj-csoport helyi pontja az összehúzással; k: a méretarány */
  function balPlace(cx, cz, x, z, y) { const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz), k = d > 1 ? balComp(d) / d : 1, yy = (y || 0) - d * d * BAL_CURV; return { x: dx * k, y: yy * k, z: dz * k, k, d }; }
  const BAL_HAZE = new THREE.Color(.60, .70, .81);
  function balHazeK(d) { return Math.min(.72, 1 - Math.exp(-d / 30000)); }

  function balTerrain(G, cx, cz, o) {
    const NR = 104, NA = 512, r0 = o.r0 || 160, r1 = 50000, R = new Float32Array(NR);
    for (let i = 0; i < NR; i++) R[i] = r0 * Math.pow(r1 / r0, i / (NR - 1));
    BAL.terr = { cx, cz, r0, r1, NR, NA };
    const nV = NR * NA, lake = new Uint8Array(nV), coast = new Uint8Array(nV), rr = new Float32Array(nV), inl = new Float32Array(nV);
    for (let a = 0; a < NA; a++) { const an = a / NA * TAU, sa = Math.sin(an), ca = -Math.cos(an), cr = [];
      for (let i = 0; i < NR; i++) { const k = i * NA + a; rr[k] = R[i]; lake[k] = balInLake(cx + sa * R[i], cz + ca * R[i]) ? 1 : 0; }
      for (let i = 0; i < NR - 1; i++) { const k = i * NA + a, k2 = k + NA; if (lake[k] === lake[k2]) continue;
        let lo = R[i], hi = R[i + 1]; const l0 = lake[k]; for (let it = 0; it < 7; it++) { const m = (lo + hi) / 2; if ((balInLake(cx + sa * m, cz + ca * m) ? 1 : 0) === l0) lo = m; else hi = m; }
        const rc = (lo + hi) / 2; cr.push(rc); if (rc - R[i] < R[i + 1] - rc) { if (!coast[k]) { rr[k] = rc; coast[k] = 1; } } else if (!coast[k2]) { rr[k2] = rc; coast[k2] = 1; } }
      for (let i = 0; i < NR; i++) { const k = i * NA + a; let m = 1e9; for (let c = 0; c < cr.length; c++) m = Math.min(m, Math.abs(rr[k] - cr[c])); inl[k] = m; } }
    const pos = new Float32Array(nV * 3), col = new Float32Array(nV * 3), c = new THREE.Color(), sun = SUN, cc = (h) => new THREE.Color(h);
    const PAL = { 1: ["#b9a862", "#8fa04a", "#9b7c57", "#c8b46c", "#7f9b47", "#a69b5b"].map(cc), 2: ["#6c8c3a", "#7d9945", "#5f8034"].map(cc), 3: ["#2f5a2a", "#36632f", "#29502a", "#3c6a33"].map(cc), 4: ["#a6553e", "#b8664b", "#e7e1d1", "#d9d2bf", "#4f7a36", "#8c4a36"].map(cc),
      5: ["#a29b5d", "#8e8b51", "#b0a86a"].map(cc), 6: ["#6e9645", "#7ea252", "#668c40"].map(cc), 7: ["#6a6a64", "#5c5d58"].map(cc), 8: ["#d8c99c", "#88a85a", "#cbbd8f"].map(cc) };
    const WAT = cc("#4d7891"), WAT2 = cc("#6f97ab"), SAND = cc("#d6c69a"), STONE = cc("#9a968a");
    for (let i = 0; i < NR; i++) for (let a = 0; a < NA; a++) {
      const k = i * NA + a, an = a / NA * TAU, sa = Math.sin(an), ca = -Math.cos(an), r = rr[k], wx = cx + sa * r, wz = cz + ca * r;
      let y, isL = lake[k] && !coast[k];
      if (isL) { y = -.7; const f = clamp((r - 1500) / 20000, 0, 1); c.copy(WAT).lerp(WAT2, f * .6 + .1 * balHash(wx * .001, wz * .001)); }
      else { const hh = balHgt(wx, wz), inn = inl[k]; y = coast[k] ? .35 : .55 + 1.1 * bsst(0, 45, inn) + Math.max(0, hh - 1.5) * bsst(20, 320, inn);
        let cl = balCls(wx, wz); if (cl === 0) cl = 6; const pal = PAL[cl] || PAL[6], hs = balHash(Math.floor(wx / (cl === 1 ? 330 : 140)), Math.floor(wz / (cl === 1 ? 250 : 140)));
        c.copy(pal[Math.floor(hs * pal.length) % pal.length]);
        { const pz = balPeakAt(wx, wz)[1]; if (pz === 1) c.copy(PAL[3][(i + a) % 4]); else if (pz === 2) { c.set(((a * 7) % 5) < 2 ? "#5d5e58" : "#77766d"); } else if (pz === 3) { c.copy(((i + a) % 3) ? PAL[2][a % 3] : cc(balHash(wx, wz) < .12 ? "#efe9da" : "#86a24c")); } }
        if (cl === 2 && (i + a) % 2) c.multiplyScalar(1.08);
        if (inn < 70 && cl !== 5 && cl !== 4) c.lerp(cl === 8 || lake[k] === 0 && balLL(wx, wz)[0] < 46.86 ? SAND : STONE, 1 - inn / 70);
        /* árnyalás a domborzat lejtője szerint */
        const e = 70, gx = (balHgt(wx + e, wz) - balHgt(wx - e, wz)) / (2 * e), gz = (balHgt(wx, wz + e) - balHgt(wx, wz - e)) / (2 * e), nl = 1 / Math.hypot(gx, 1, gz);
        const lt = .66 + .52 * Math.max(0, (-gx * sun.x + sun.y - gz * sun.z) * nl) - .1; c.multiplyScalar(clamp(lt, .45, 1.15)); }
      c.lerp(BAL_HAZE, balHazeK(r) * (!isL && balPeakAt(wx, wz)[0] > 25 ? .62 : 1));
      const P = balPlace(cx, cz, wx, wz, y); pos[k * 3] = P.x; pos[k * 3 + 1] = P.y; pos[k * 3 + 2] = P.z; col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    const idx = []; for (let i = 0; i < NR - 1; i++) for (let a = 0; a < NA; a++) { const k = i * NA + a, k1 = i * NA + (a + 1) % NA, k2 = k + NA, k3 = k1 + NA;
      if (rr[k3] < 1450 && lake[k] && lake[k1] && lake[k2] && lake[k3] && !coast[k] && !coast[k1] && !coast[k2] && !coast[k3]) continue; idx.push(k, k1, k2, k1, k3, k2); }
    /* a középső lyuk (a hajó körül) a víz alatt marad; a kikötőnél kis korong */
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setIndex(idx); W.disposables.push(g);
    const m = new THREE.Mesh(g, balMat()); m.frustumCulled = false; m.renderOrder = -3; G.add(m); return m;
  }
  function balMat() { if (BAL.mat && !BAL.mat._gone) return BAL.mat; const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }); m.userData.nightK = [.006, .008, .016]; W.disposables.push(m); BAL.mat = m; return m; }
  function balMatL() { const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }); m.userData.nightK = [.8, .48, .2]; W.disposables.push(m); return m; }
  /* összeolvasztott, napfény + pára szerint előre árnyalt geometria (darabok: [geo, szín, Matrix4]) */
  function balBake(parts, hz, mat, G) {
    if (!parts.length) return null; const list = parts.map(([geo, col, m4]) => { const q = geo.index ? geo.toNonIndexed() : geo; q.applyMatrix4(m4); q.computeVertexNormals(); const cl = new THREE.Color(col), n = q.attributes.position.count, a = new Float32Array(n * 3), N = q.attributes.normal, h = hz(m4);
        for (let i = 0; i < n; i++) { const d = N.getX(i) * SUN.x + N.getY(i) * SUN.y + N.getZ(i) * SUN.z, k = .55 + .5 * Math.max(0, d) + .06 * N.getY(i); const r = cl.r * k, gg = cl.g * k, b = cl.b * k; a[i * 3] = r + (BAL_HAZE.r - r) * h; a[i * 3 + 1] = gg + (BAL_HAZE.g - gg) * h; a[i * 3 + 2] = b + (BAL_HAZE.b - b) * h; }
        q.setAttribute("color", new THREE.BufferAttribute(a, 3)); if (q.attributes.uv) q.deleteAttribute("uv"); geo.dispose && geo !== q && geo.dispose(); return [q, new THREE.Matrix4()]; });
    const geo = mergeGeoms(list); W.disposables.push(geo); const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; G.add(m); return m;
  }
  const BM4 = (x, y, z, ry, s) => { const m = new THREE.Matrix4().makeRotationY(ry || 0); if (s) m.premultiply(new THREE.Matrix4().makeScale(s, s, s)); m.setPosition(x, y, z); return m; };
  /* egy darab a világban: helyi (x,y,z,ry) a nevezetesség terében → a táj-csoport tere (összehúzás + görbület) */
  function balPut(L, cx, cz, wx, wz, gy, sc) { const P = balPlace(cx, cz, wx, wz, gy), ks = P.k * (sc || 1), T0 = new THREE.Matrix4().makeTranslation(P.x, P.y, P.z).multiply(new THREE.Matrix4().makeScale(ks, ks, ks));
    return (geo, col, lx, ly, lz, ry, rot) => { const m = new THREE.Matrix4().makeRotationY(rot || 0); m.multiply(new THREE.Matrix4().makeTranslation(lx || 0, ly || 0, lz || 0)); m.multiply(new THREE.Matrix4().makeRotationY(ry || 0)); m.premultiply(T0); m.userData_d = P.d; L.push([geo, col, m]); }; }

  /* ---------------------------------------------------------------- települések: házak (a közeli partokon), éjszakai fények, sétányok, kikötők */
  function balTowns(G, cx, cz, NL, NS, venue) {
    const parts = [], rnd = vrRng(venue.id.length * 131 + 7), nl = (P, col, px, fl) => { const c = new THREE.Color(col); NL.push([P.x, P.y, P.z, c.r, c.g, c.b, px, fl ? fl[0] : 0, fl ? fl[1] : 0, fl ? fl[2] : 1]); };
    const ns = (P, col, wd, ln) => { const c = new THREE.Color(col); NS.push([P.x, P.z, c.r, c.g, c.b, wd, ln, Math.atan2(P.z, P.x) + Math.PI / 2]); };
    let houses = 0; const B = balData();
    BAL_TOWNS.forEach(([n, la, lo, rk]) => { const [tx, tz] = balXY(la, lo), dT = Math.hypot(tx - cx, tz - cz), R = rk * 1000;
      /* házak: csak a közeli településeken (a távoliakat a felszín színe adja) */
      if (dT < 9000 + R && houses < 1100) { const nH = Math.min(220, Math.round(rk * rk * (dT < 4000 ? 120 : 70))); const put = (wx, wz, fn, g0) => fn(balPut(parts, cx, cz, wx, wz, g0));
        for (let q = 0, tries = 0; q < nH && tries < nH * 6; tries++) { const a = rnd() * TAU, rr = Math.sqrt(rnd()) * R, wx = tx + Math.sin(a) * rr, wz = tz - Math.cos(a) * rr; if (balInLake(wx, wz) || balInLake(wx + 25, wz) || balInLake(wx - 25, wz) || balInLake(wx, wz + 25) || balInLake(wx, wz - 25)) continue;
          const cl = balCls(wx, wz); if (cl === 3 && rnd() < .7) continue; if (balHgt(wx, wz) > 170) continue; q++; houses++;
          const big = (n === "Siófok" || n === "Balatonfüred" || n === "Balatonalmádi" || n === "Keszthely") && rnd() < .12, w = big ? 26 + rnd() * 30 : 8 + rnd() * 7, h = big ? 15 + rnd() * 22 : 4.5 + rnd() * 3.5, d = big ? 14 + rnd() * 8 : 8 + rnd() * 5, ry = rnd() * Math.PI;
          const gC = balGround(wx, wz), gM = balGroundMin(wx, wz, Math.max(w, d) * .6) - .6, pl = gC - gM;   /* lábazat a lejtő alsó pontjáig */
          put(wx, wz, (P) => { if (pl > .2) P(new THREE.BoxGeometry(w * 1.02, pl + .4, d * 1.02), "#8d8571", 0, (pl + .4) / 2, 0, ry); P(new THREE.BoxGeometry(w, h, d), big ? "#f1efe8" : rnd() < .8 ? "#efe9da" : "#e6d5b0", 0, pl + h / 2, 0, ry); if (!big) { const rf = new THREE.CylinderGeometry(.01, w * .62, d * 1.02, 4, 1); rf.rotateZ(Math.PI / 2); rf.rotateY(Math.PI / 4 * 0); rf.scale(1, .55, 1);
            const rg = new THREE.ConeGeometry(Math.max(w, d) * .72, 3 + w * .18, 4); rg.rotateY(Math.PI / 4); rg.scale(w / Math.max(w, d), 1, d / Math.max(w, d)); rf.dispose(); P(rg, rnd() < .75 ? "#a8452f" : "#6e4a3a", 0, pl + h + 1.5 + w * .09, 0, ry); } else P(new THREE.BoxGeometry(w * 1.02, 1.2, d * 1.02), "#8c969c", 0, pl + h + .6, 0, ry); }, gM); } }
      /* éjszakai fények a település területén */
      const nLt = Math.round(clamp(7 + rk * rk * 26, 5, 100)), px = clamp(3.0 - dT / 8000, 1.1, 2.8);   /* 18:02: kis balatoni települések – szolid, ritkás fények */
      for (let q = 0, tries = 0; q < nLt && tries < nLt * 5; tries++) { const a = rnd() * TAU, rr = Math.sqrt(rnd()) * R * 1.05, wx = tx + Math.sin(a) * rr, wz = tz - Math.cos(a) * rr; if (balInLake(wx, wz)) continue; q++;
        nl(balPlace(cx, cz, wx, wz, balGround(wx, wz) + 2.5 + rnd() * 4), rnd() < .55 ? "#ffcf7a" : rnd() < .6 ? "#fff1d6" : "#ffb35a", px * (.7 + rnd() * .5)); }
      /* parti sétány lámpái + tükörképük a vízen */
      B.P.forEach((p, i) => { if (Math.hypot(p[0] - tx, p[1] - tz) > R * 1.15 || i % 3) return; const P = balPlace(cx, cz, p[0], p[1], 5); nl(P, "#ffd9a0", px * .8); if (dT < 12000 && rnd() < .4) ns(P, "#ffcf88", 2, 120); }); });
    /* vitorláskikötők bejárati fényei (Fl R / Fl G 3 s) */
    BAL_HARBORS.forEach((n, i) => { const t = BAL_TOWNS.find((q) => q[0] === n); if (!t) return; const s = balShorePt(t[1], t[2]), bx = s.x + s.nx * 90, bz = s.z + s.nz * 90, dT = Math.hypot(bx - cx, bz - cz);
      [[-1, "#ff2a1a"], [1, "#2aff6a"]].forEach(([sd, col]) => { const P = balPlace(cx, cz, bx + s.tx * sd * 45, bz + s.tz * sd * 45, 4); nl(P, col, clamp(5.2 - dT / 8000, 2.2, 5), [3, (i * .37) % 3, .3]); if (dT < 18000) ns(P, col, 2, 170); });
      for (let k = 0; k < 10; k++) nl(balPlace(cx, cz, s.x - s.nx * (20 + rnd() * 120) + s.tx * (rnd() - .5) * 300, s.z - s.nz * (20 + rnd() * 120) + s.tz * (rnd() - .5) * 300, 4 + rnd() * 4), rnd() < .5 ? "#ffd27a" : "#e8f0ff", 1.6 + rnd()); });
    const hz = (m4) => balHazeK(m4.userData_d || 0); balBake(parts, hz, balMat(), G);
  }

  /* ---------------------------------------------------------------- nevezetességek, valódi méretben és helyen (éjjel díszkivilágítással) */
  const BAL_LM = [
    /* 2026-11-14 19:05 (tulajdonos: „a tihanyi apátságot jól nézd meg a képeken … ezzel a kidolgozottsággal és fényekkel szerepeljen”):
       a barokk apátsági templom a félsziget keleti, meredek peremén, főhomlokzata kelet felé, a tó felé néz. Két, órás, párkányokkal tagolt torony,
       zsalus harangablakokkal; a sisak zöldes-szürke rézhagyma, lámpás, kis hagyma, csúcs, aranyozott kereszt. A tornyok között volutás oromzat
       szoborfülkével és kapuval; a hajó vörös cseréptetővel. Az apátsági épület (kétszintes, ablaksoros, vörös tetős, L alakú) a templomtól északra,
       hátrébb húzódik; alatta kő támfal és a sétány bástyája. Éjjel melegsárga díszkivilágítás, világos ablakok. Helyi tér: +z = kelet (homlokzat), +x = észak. */
    { n: "Tihanyi Bencés Apátság", sc: 2.2, lat: 46.91389, lon: 17.88944, ry: Math.PI / 2, lights: [], b: (P, L) => { const c = "#f2e4bf", wh = "#fbf6ea", rf = "#5f7a6e", tile = "#9a4b33", dk = "#2a2620", st = "#b9ac8f", gold = "#e3b24a";
      /* 19:13 (tulajdonos: „ne nyúljon túl a hegyen, illeszkedjen az alsó terepviszonyokba”): nincs kinyúló terasz – minden épület alatt kőlábazat
         a lejtőbe süllyesztve, így a hegyoldalból nő ki */
      [[0, -6, 17, 45], [-5.6, 17, 7.5, 7.5], [5.6, 17, 7.5, 7.5], [0, 16.2, 5, 3], [34, -2, 52.5, 15.5], [62, -26, 14.5, 34.5], [10, -32, 20.5, 12.5], [0, -28, 14, 14]].forEach(([x, z, w, d]) => P(new THREE.BoxGeometry(w, 16, d), st, x, -8, z));
      /* a templomhajó */
      P(new THREE.BoxGeometry(16, 19, 44), c, 0, 9.5, -6); P(new THREE.BoxGeometry(16.6, 1, 44.6), wh, 0, 19.2, -6);
      P(new THREE.CylinderGeometry(9.6, 9.6, 44.5, 3, 1).rotateX(-Math.PI / 2).scale(1, .55, 1), tile, 0, 21.7, -6);
      for (let k = 0; k < 5; k++) [-1, 1].forEach((sd) => { P(new THREE.BoxGeometry(.6, 6.5, 2.8), dk, sd * 8.05, 11, -22 + k * 8); P(new THREE.CylinderGeometry(1.4, 1.4, .6, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(sd < 0 ? Math.PI : 0), dk, sd * 8.05, 14.2, -22 + k * 8); P(new THREE.BoxGeometry(.5, 19, 1), wh, sd * 8.1, 9.5, -26 + k * 8); });
      P(new THREE.CylinderGeometry(7, 7, 16, 16, 1, false, 0, Math.PI).rotateY(Math.PI), c, 0, 8, -28); P(new THREE.SphereGeometry(7.4, 14, 8, 0, Math.PI, 0, Math.PI / 2).rotateY(Math.PI), tile, 0, 16, -28);   /* szentély */
      /* két torony */
      [-5.6, 5.6].forEach((dx) => { P(new THREE.BoxGeometry(7.2, 36, 7.2), c, dx, 18, 17);
        [8, 19.5, 30, 36].forEach((y) => P(new THREE.BoxGeometry(7.9, y === 36 ? 1.4 : .8, 7.9), wh, dx, y, 17));
        [[0, 1], [1, 0], [-1, 0]].forEach(([ox, oz]) => { const fx = dx + ox * 3.62, fz = 17 + oz * 3.62, rot = ox ? Math.PI / 2 : 0;
          P(new THREE.BoxGeometry(1.8, 4.2, .4).rotateY(rot), dk, fx, 26, fz); P(new THREE.CylinderGeometry(.9, .9, .4, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).rotateY(rot), dk, fx, 28.1, fz);   /* zsalus harangablak */
          for (let q = 0; q < 5; q++) P(new THREE.BoxGeometry(1.9, .14, .5).rotateY(rot), "#5a4a35", fx, 24.3 + q * .8, fz);
          P(new THREE.CylinderGeometry(1.7, 1.7, .25, 20).rotateX(Math.PI / 2).rotateY(rot), "#f7f2e2", fx, 32.8, fz); P(new THREE.TorusGeometry(1.75, .15, 4, 20).rotateY(rot), gold, fx, 32.8, fz);   /* óralap */
          P(new THREE.BoxGeometry(.18, 1.3, .1).rotateY(rot), dk, fx + (ox ? 0 : 0), 33.2, fz); P(new THREE.BoxGeometry(.9, .16, .1).rotateY(rot), dk, fx, 32.8, fz);
          P(new THREE.BoxGeometry(1.4, 2.6, .3).rotateY(rot), dk, fx, 14, fz); });
        P(new THREE.CylinderGeometry(3.4, 3.9, 1.6, 8), rf, dx, 37.5, 17); P(new THREE.SphereGeometry(3.6, 14, 10).scale(1, 1.15, 1), rf, dx, 40.2, 17);   /* hagymasisak */
        P(new THREE.CylinderGeometry(1.3, 1.5, 3.4, 8), wh, dx, 44.6, 17); for (let q = 0; q < 8; q++) { const a = q / 8 * TAU; P(new THREE.BoxGeometry(.3, 2.2, .3), dk, dx + Math.cos(a) * 1.42, 44.6, 17 + Math.sin(a) * 1.42); }   /* lámpás */
        P(new THREE.CylinderGeometry(1.6, 1.6, .4, 10), rf, dx, 46.5, 17); P(new THREE.SphereGeometry(1.5, 10, 8).scale(1, 1.2, 1), rf, dx, 47.9, 17); P(new THREE.ConeGeometry(.55, 4.6, 8), rf, dx, 51.4, 17);
        P(new THREE.SphereGeometry(.45, 8, 6), gold, dx, 53.9, 17); P(new THREE.BoxGeometry(.3, 3, .3), gold, dx, 55.6, 17); P(new THREE.BoxGeometry(1.7, .3, .3), gold, dx, 56.2, 17);
        L.lights.push([dx, 26, 17 + 3.7, "#ffd27a", 1.1], [dx, 44.6, 17, "#fff0c0", 1.3]); });
      /* homlokzat a tornyok között: oromzat volutákkal, szoborfülke, kapu, ablakok */
      P(new THREE.BoxGeometry(4.2, 24, 2), c, 0, 12, 16.2); P(new THREE.BoxGeometry(4.6, .8, 2.4), wh, 0, 24.2, 16.2);
      P(new THREE.ConeGeometry(2.6, 4.5, 3).rotateY(Math.PI / 2).scale(1, 1, .4), c, 0, 26.6, 16.2); [-1, 1].forEach((sd) => P(new THREE.TorusGeometry(1, .35, 5, 10, Math.PI), wh, sd * 2.2, 25, 16.9));
      P(new THREE.BoxGeometry(1.6, 3, .5), dk, 0, 20.5, 17.2); P(new THREE.CylinderGeometry(.35, .45, 2.3, 8), "#ece2c6", 0, 20.6, 17.5);   /* fülke szoborral */
      P(new THREE.BoxGeometry(2.6, 5, .5), "#3a2b1d", 0, 2.5, 17.2); P(new THREE.CylinderGeometry(1.3, 1.3, .5, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), "#3a2b1d", 0, 5, 17.2); P(new THREE.BoxGeometry(4, .6, 1), wh, 0, 6.4, 17.4);
      P(new THREE.BoxGeometry(1.6, 3.2, .4), dk, 0, 12.5, 17.2); L.lights.push([0, 12.5, 17.6, "#ffcf7a", 1], [0, 2.5, 17.6, "#ffb85a", 1.1]);
      /* apátsági épület: kétszintes, a templomtól északra, hátrébb; és a hátsó szárny (L) */
      const wing = (x, z, w, d, rot) => { P(new THREE.BoxGeometry(w, 13, d).rotateY(rot), c, x, 6.5, z); P(new THREE.BoxGeometry(w + .6, .7, d + .6).rotateY(rot), wh, x, 13.2, z);
        const rg = new THREE.CylinderGeometry(.01, d * .62, w + .5, 4, 1); rg.rotateZ(Math.PI / 2); rg.rotateX(Math.PI / 4); rg.scale(1, .6, 1); P(rg.rotateY(rot), tile, x, 15.4, z);
        const nW = Math.floor(w / 4.2); for (let k = 0; k < nW; k++) [3.6, 9].forEach((y) => { const t = -w / 2 + 2.1 + k * 4.2; const ox = rot ? 0 : t, oz = rot ? t : 0, fx = x + ox + (rot ? d / 2 + .05 : 0), fz = z + oz + (rot ? 0 : d / 2 + .05);
          P(new THREE.BoxGeometry(1.4, 2.2, .3).rotateY(rot), dk, fx, y, fz); P(new THREE.BoxGeometry(1.9, .3, .4).rotateY(rot), wh, fx, y + 1.35, fz); if ((k * 7 + y) % 3 < 1.2) L.lights.push([fx, y, fz + (rot ? 0 : .4), "#ffd59a", .7]); }); };
      wing(34, -2, 52, 15, 0); wing(62, -26, 34, 14, Math.PI / 2); wing(10, -32, 20, 12, 0);
      P(new THREE.BoxGeometry(5, 1.6, 5), wh, 34, 17.4, -2); P(new THREE.ConeGeometry(2.4, 3.6, 4).rotateY(Math.PI / 4), rf, 34, 19.8, -2);   /* tetőhuszár */
      /* a templom előtti kis tér: kőburkolat, padok, lámpák */
      [-12, -4, 4, 12].forEach((x) => { P(new THREE.CylinderGeometry(.12, .15, 3.4, 6), dk, x, 1.9, 20.5); P(new THREE.SphereGeometry(.35, 8, 6), "#fff1c8", x, 3.7, 20.5); L.lights.push([x, 3.7, 20.5, "#ffe2a8", .9]); });
    } },
    { n: "Siófoki víztorony", sc: 1.6, lat: 46.90541, lon: 18.0522, b: (P) => { const c = "#efefe8"; P(new THREE.CylinderGeometry(3.4, 4.2, 40, 16), c, 0, 20); P(new THREE.CylinderGeometry(13, 4, 9, 22), c, 0, 44.5); P(new THREE.CylinderGeometry(13.5, 13.5, 2.5, 22), "#c7ccd0", 0, 50); P(new THREE.CylinderGeometry(3, 3, 4, 12), c, 0, 53); } },
    { n: "Siófoki óriáskerék", lat: 46.9095, lon: 18.0505, b: (P) => { const T = new THREE.TorusGeometry(18, .8, 6, 40); P(T, "#e8ecef", 0, 21, 0); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; P(new THREE.BoxGeometry(2.4, 2, 2.4), ["#e53935", "#fdd835", "#1e88e5", "#43a047"][k % 4], Math.cos(a) * 18, 21 + Math.sin(a) * 18, 0); } P(new THREE.BoxGeometry(1, 22, 1).rotateZ(.35), "#c9ced3", -4, 10.5, 0); P(new THREE.BoxGeometry(1, 22, 1).rotateZ(-.35), "#c9ced3", 4, 10.5, 0); } },
    { n: "Siófoki kikötő világítótornya", lat: 46.9125, lon: 18.0455, harbour: true, b: (P) => { P(new THREE.CylinderGeometry(1.4, 2, 14, 12), "#f4f4f0", 0, 7); P(new THREE.CylinderGeometry(1.5, 1.5, 2.5, 10), "#c62828", 0, 15.3); P(new THREE.ConeGeometry(1.7, 1.6, 10), "#c62828", 0, 17.4); } },
    { n: "Balatonfüredi Kerek templom", sc: 1.8, lat: 46.9585, lon: 17.8905, b: (P) => { P(new THREE.CylinderGeometry(11, 11, 14, 22), "#f1e6c8", 0, 7); P(new THREE.SphereGeometry(11.5, 20, 10, 0, TAU, 0, Math.PI / 2), "#5d7a6a", 0, 14); P(new THREE.CylinderGeometry(1.6, 1.6, 4, 10), "#f1e6c8", 0, 27); P(new THREE.BoxGeometry(10, 12, 6), "#f1e6c8", 0, 6, 12); [-3, 0, 3].forEach((x) => P(new THREE.CylinderGeometry(.5, .5, 9, 8), "#ffffff", x, 4.5, 15.5)); } },
    { n: "Balatonfüredi szállodák", lat: 46.9525, lon: 17.8995, b: (P) => { [[-120, 0, 54, 24, 18], [-40, 10, 44, 33, 16], [60, 0, 60, 21, 18], [150, 20, 40, 28, 16]].forEach(([x, z, w, h, d]) => { P(new THREE.BoxGeometry(w, h, d), "#f6f4ee", x, h / 2, z); P(new THREE.BoxGeometry(w + 1, 1.2, d + 1), "#9aa3a8", x, h + .6, z); }); } },
    { n: "Siófoki szállodasor", lat: 46.9145, lon: 18.0700, b: (P) => { for (let k = 0; k < 9; k++) { const w = 30 + (k % 3) * 10, h = 22 + ((k * 7) % 4) * 9; P(new THREE.BoxGeometry(w, h, 16), "#f3f1ea", -380 + k * 95, h / 2, 0); P(new THREE.BoxGeometry(w + 1, 1.2, 17), "#7f8a90", -380 + k * 95, h + .6, 0); } } },
    { n: "Festetics-kastély", sc: 2, lat: 46.7703, lon: 17.2445, b: (P) => { const c = "#f5f2e8"; P(new THREE.BoxGeometry(120, 16, 22), c, 0, 8); P(new THREE.BoxGeometry(122, 3, 24), "#5f6b73", 0, 17.5); [-1, 1].forEach((s) => P(new THREE.BoxGeometry(22, 16, 70), c, s * 60, 8, 34)); P(new THREE.BoxGeometry(12, 30, 12), c, 0, 15, -6); P(new THREE.SphereGeometry(6.5, 14, 8, 0, TAU, 0, Math.PI / 2), "#4c5a62", 0, 30, -6); P(new THREE.ConeGeometry(1.2, 9, 8), "#4c5a62", 0, 40, -6); } },
    { n: "Szigligeti vár", sc: 2.4, lat: 46.8042, lon: 17.4343, b: (P) => { const c = "#cbbfa6"; P(new THREE.BoxGeometry(14, 22, 14), c, 0, 9); P(new THREE.BoxGeometry(34, 9, 4), "#c2b69c", 6, 2.5, 10); P(new THREE.BoxGeometry(4, 12, 28), "#c2b69c", -10, 4, -2); P(new THREE.BoxGeometry(18, 7, 4), "#bfb398", 2, 1.5, -13); } },
    /* 2026-11-14 19:15 (tulajdonos): a Badacsony tetején álló nagy, kivilágított kereszt – a valóságosnál hangsúlyosabban, hogy verseny közben jól látszódjon.
       Fehér, kőtalapzaton; éjjel erős, meleg-fehér díszfény, fénykoszorúval. (élő elem: BAL.live) */
    { n: "Ranolder-kereszt (Badacsony)", sc: 7, lat: 46.7965, lon: 17.4985, b: (P) => { P(new THREE.BoxGeometry(4, 2, 4), "#b9ae96", 0, 0); P(new THREE.BoxGeometry(2.6, 1.2, 2.6), "#cfc4aa", 0, 1.5); },
      live: (g) => { const m = new THREE.MeshBasicMaterial({ color: "#ffffff", fog: false }); W.disposables.push(m); const cr = new THREE.Group(); g.add(cr);
        [[1.5, 15, 1.5, 0, 9.6], [7.6, 1.5, 1.5, 0, 12.6], [1.9, .5, 1.9, 0, 17.3], [8, .4, 1.9, 0, 13.5]].forEach(([w, h, d, x, y]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, 0); W.disposables.push(b.geometry); cr.add(b); });
        const gl = []; [[0, 6], [0, 10], [0, 14], [-3, 12.6], [3, 12.6], [0, 12.6]].forEach(([x, y], i) => { const sp = glowSpriteW(i === 5 ? "#fff3d8" : "#ffe9c0", i === 5 ? 26 : 12); sp.position.set(x, y, 1.2); g.add(sp); gl.push(sp); });
        return (on, t) => { m.color.setRGB(on ? 1 : .98, on ? .97 : .98, on ? .9 : .96); gl.forEach((sp, i) => { sp.visible = on; sp.material.opacity = (i === 5 ? .55 : .7) * (.92 + .08 * Math.sin(t * .7 + i)); }); }; } },
    { n: "Kisfaludy-kilátó (Badacsony)", sc: 2, lat: 46.8035, lon: 17.4958, b: (P) => { P(new THREE.CylinderGeometry(3.2, 4, 18, 8), "#8f8676", 0, 9); P(new THREE.CylinderGeometry(4.6, 4.6, 1.2, 8), "#6b5a45", 0, 18.6); P(new THREE.ConeGeometry(4.6, 3.5, 8), "#6b4a34", 0, 21); } },
    /* 19:15 (tulajdonos): a boglári Xantus János Gömbkilátó a Várdombon – 15 m átmérőjű gömb 240 háromszöglemezből (alumínium, az 1958-as „Magyar Atomium”),
       acél tartószerkezeten; esténként LED-es fényjátékkal, színekben pompázik (a túlpartról is látszik). (élő elem: a lemezek színe animált) */
    { n: "Boglári gömbkilátó", sc: 4, lat: 46.779, lon: 17.652, b: (P) => { [0, 1, 2].forEach((k) => { const a = k / 3 * TAU; P(new THREE.CylinderGeometry(.35, .5, 11, 6).rotateZ(.22).rotateY(-a), "#8d949b", Math.cos(a) * 2.4, 5.2, Math.sin(a) * 2.4); });
        P(new THREE.CylinderGeometry(1.1, 1.3, 10.5, 10), "#9aa1a8", 0, 5.2); P(new THREE.CylinderGeometry(2.8, 2.8, .5, 14), "#7d848b", 0, .25); },
      live: (g) => { const geo = new THREE.IcosahedronGeometry(7.5, 2).toNonIndexed(), n = geo.attributes.position.count, col = new Float32Array(n * 3), base = new Float32Array(n / 3), fy = new Float32Array(n / 3), fa = new Float32Array(n / 3);
        for (let f = 0; f < n / 3; f++) { let y = 0, ax = 0, az = 0; for (let k = 0; k < 3; k++) { y += geo.attributes.position.getY(f * 3 + k); ax += geo.attributes.position.getX(f * 3 + k); az += geo.attributes.position.getZ(f * 3 + k); } fy[f] = y / 22.5; fa[f] = Math.atan2(az, ax); base[f] = .78 + .2 * ((f * 37) % 7) / 7; }
        geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.translate(0, 17.8, 0); W.disposables.push(geo);
        const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }); W.disposables.push(m); const sph = new THREE.Mesh(geo, m); g.add(sph);
        const eg = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(7.53, 2)); eg.translate(0, 17.8, 0); W.disposables.push(eg); const lm = new THREE.LineBasicMaterial({ color: "#5d6369", fog: false }); W.disposables.push(lm); g.add(new THREE.LineSegments(eg, lm));
        const halo = glowSpriteW("#ffffff", 46); halo.position.set(0, 17.8, 0); g.add(halo); const c = new THREE.Color(); let last = -1;
        return (on, t) => { halo.visible = on; if (!on && last === 0) return; if (on && t - last < .05) return; last = on ? t : 0;
          for (let f = 0; f < n / 3; f++) { if (on) { const h = (t * .045 + fy[f] * .35 + .12 * Math.sin(fa[f] * 2 + t * .8)) % 1; c.setHSL(h < 0 ? h + 1 : h, 1, .5 + .12 * Math.sin(t * 2.2 + f * .7)); } else { const k = base[f] * (.75 + .3 * Math.max(0, fy[f] * .5 + .5)); c.setRGB(k * .86, k * .89, k * .92); }
            for (let q = 0; q < 3; q++) col.set([c.r, c.g, c.b], (f * 3 + q) * 3); }
          geo.attributes.color.needsUpdate = true; if (on) { c.setHSL((t * .045 + .1) % 1, 1, .6); halo.material.color.copy(c); halo.material.opacity = .45; } }; } },
    { n: "Fonyódi Várhegyi kilátó", sc: 2.6, lat: 46.741, lon: 17.548, b: (P) => { P(new THREE.CylinderGeometry(2.4, 3.2, 20, 8), "#8f8676", 0, 10); P(new THREE.CylinderGeometry(3.6, 3.6, 1, 8), "#5a4a3a", 0, 20.5); } },
    { n: "Kőhegyi kilátó (Zamárdi)", sc: 2.6, lat: 46.87217, lon: 17.93216, b: (P) => { P(new THREE.CylinderGeometry(2.2, 3, 16, 8), "#a8794a", 0, 8); P(new THREE.ConeGeometry(3.6, 3, 8), "#6b4a34", 0, 17.5); } },
    { n: "Fülöp-hegyi kilátó (Révfülöp)", sc: 2.6, lat: 46.8420, lon: 17.6150, b: (P) => { P(new THREE.CylinderGeometry(2.2, 3, 18, 8), "#a8794a", 0, 9); P(new THREE.ConeGeometry(3.6, 3, 8), "#6b4a34", 0, 19.5); } },
    { n: "Zephyr Apartmanház", lat: 46.8893551, lon: 17.9629734, b: (P) => { P(new THREE.BoxGeometry(14, 7, 11), "#f4efe2", 0, 3.5); P(new THREE.ConeGeometry(10.5, 4.5, 4).rotateY(Math.PI / 4).scale(1, 1, .8), "#a8452f", 0, 9.2); P(new THREE.BoxGeometry(2.4, 2.4, .3), "#3a6fa6", 3, 4.6, 5.6); } },
    { n: "Tihanyi rév", lat: 46.8897, lon: 17.8910, harbour: true, b: (P) => { P(new THREE.BoxGeometry(12, 1.2, 70), "#bdb7a8", 0, .6, 0); P(new THREE.BoxGeometry(14, 3.2, 40), "#ffffff", 22, 1.6, 0); P(new THREE.BoxGeometry(8, 3, 10), "#3b5f8a", 22, 4.6, 0); } },
    { n: "Szántódi rév", lat: 46.8800, lon: 17.9000, harbour: true, b: (P) => { P(new THREE.BoxGeometry(12, 1.2, 70), "#bdb7a8", 0, .6, 0); } }];
  /* additív fénykoszorú (éjjeli díszkivilágításhoz) */
  let _bglT = null;
  function glowSpriteW(col, sz) { if (!_bglT) _bglT = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.25, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const m = new THREE.SpriteMaterial({ map: _bglT, color: new THREE.Color(col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }); W.disposables.push(m); const s2 = new THREE.Sprite(m); s2.scale.setScalar(sz); s2.visible = false; s2.userData.night = 1; return s2; }
  function balLandmarks(G, cx, cz, NL) {
    BAL.live = [];
    const parts = [], mat = balMatL(); BAL.lmLabels = [];
    BAL_LM.forEach((L) => { let [x, z] = balXY(L.lat, L.lon); if (L.harbour) { const s = balShorePt(L.lat, L.lon); x = s.x + s.nx * 30; z = s.z + s.nz * 30; }
      const d = Math.hypot(x - cx, z - cz); if (d < 60) return; const gy = L.harbour ? 0 : (L.lights ? balGround(x, z) : balGroundMin(x, z, 12 * (L.sc || 1))), sc = L.sc || 1; const P = balPut(parts, cx, cz, x, z, gy - (sc > 1 ? 2 : 0), sc);   /* a jelképek kissé nagyítva, hogy a hegytetőn messziről is felismerhetők legyenek */ if (L.lights) L.lights.length = 0; L.b((geo, col, lx, ly, lz) => P(geo, col, lx, ly, lz, 0, L.ry || 0), L);
      if (L.live) { const q = balPlace(cx, cz, x, z, gy - (sc > 1 ? 2 : 0)), lg = new THREE.Group(); lg.position.set(q.x, q.y, q.z); lg.scale.setScalar(q.k * sc); lg.rotation.y = L.ry || 0; lg.userData.night = 1; lg.userData.noMerge = 1; G.add(lg);
        const up = L.live(lg); lg.traverse((o) => { o.userData.noMerge = 1; if (o.isSprite) o.userData.night = 1; }); up(false, 0); BAL.live.push(up); }
      /* díszkivilágítás: világító ablakok, lámpák, harangablakok (éjjel pontfényként) */
      (L.lights || []).forEach(([lx, ly, lz, lc, ls]) => { const ry = L.ry || 0, rx = (lx * Math.cos(ry) + lz * Math.sin(ry)) * sc, rz = (-lx * Math.sin(ry) + lz * Math.cos(ry)) * sc, cc = new THREE.Color(lc), q = balPlace(cx, cz, x + rx, z + rz, gy - (sc > 1 ? 2 : 0) + ly * sc);
        NL.push([q.x, q.y, q.z, cc.r, cc.g, cc.b, clamp(4.2 - d / 5000, 1.4, 3.6) * ls, 0, 0, 1]); });
      const pp = balPlace(cx, cz, x, z, gy + 18 * sc); NL.push([pp.x, pp.y, pp.z, 1, .82, .55, clamp(5 - d / 6000, 2, 4.5), 0, 0, 1]); BAL.lmLabels.push({ n: L.n, p: pp, d }); });
    balBake(parts, (m4) => balHazeK(m4.userData_d || 0), mat, G);
  }
  /* ---------------------------------------------------------------- fák a közeli partokon (nyárfasorok, erdőfoltok, kertek) */
  function balTrees(G, cx, cz, Rm) {
    const parts = [], rnd = vrRng(Math.round(cx + cz) & 0xffff); let n = 0;
    for (let t = 0; t < 9000 && n < 1500; t++) { const a = rnd() * TAU, r = 120 + Math.sqrt(rnd()) * Rm, wx = cx + Math.sin(a) * r, wz = cz - Math.cos(a) * r; if (balInLake(wx, wz)) continue;
      const cl = balCls(wx, wz), pr = cl === 3 ? .9 : cl === 4 ? .35 : cl === 8 ? .5 : cl === 6 ? .18 : cl === 5 ? .05 : .08; if (rnd() > pr) continue;
      const near = balInLake(wx + 70, wz) || balInLake(wx - 70, wz) || balInLake(wx, wz + 70) || balInLake(wx, wz - 70); if (balInLake(wx + 14, wz) || balInLake(wx - 14, wz) || balInLake(wx, wz + 14) || balInLake(wx, wz - 14)) continue;
      n++; const P = balPut(parts, cx, cz, wx, wz, balGroundMin(wx, wz, 4) - .5), hh = 10 + rnd() * 12;
      P(new THREE.CylinderGeometry(hh * .03, hh * .045, hh * .5, 5), "#4a3a28", 0, hh * .25);   /* törzs: a lombkorona nem lebeg */
      if (near && rnd() < .55) P(new THREE.OctahedronGeometry(1, 0).scale(hh * .16, hh * .55, hh * .16), rnd() < .5 ? "#3e6a2e" : "#4c7a36", 0, hh * .55); /* nyárfa */
      else if (cl === 3 && rnd() < .5) P(new THREE.ConeGeometry(hh * .3, hh, 6), rnd() < .5 ? "#2f5426" : "#355f2a", 0, hh * .5); /* fenyő / erdő */
      else P(new THREE.IcosahedronGeometry(hh * .32, 0).scale(1, .85, 1), rnd() < .5 ? "#3f6b2e" : "#4f7a36", 0, hh * .55); }
    balBake(parts, (m4) => balHazeK(m4.userData_d || 0), balMat(), G);
  }

  /* =================================================================== BALATONI VIHARJELZÉS (STM) */
  const STM = { lv: { nyugati: 0, kozepso: 0, keleti: 0 }, src: "", live: null, fetched: false };
  /* a medencehatárok (Kormányrendelet: a badacsonyi és a fonyódi BH-kikötő keleti mólója; a tihanyi és a szántódi kompkikötő keleti mólója) */
  const STM_L1 = [[46.7865, 17.5265], [46.7525, 17.5575]], STM_L2 = [[46.8897, 17.8910], [46.8793, 17.9006]];
  function stmBasin(lat, lon) { const side = (L) => { const [a, b] = L, t = (lat - a[0]) / (b[0] - a[0]), lx = a[1] + (b[1] - a[1]) * clamp(t, -3, 4); return lon < lx; };
    return side(STM_L1) ? "nyugati" : side(STM_L2) ? "kozepso" : "keleti"; }
  const STM_BN = { nyugati: "Nyugati medence", kozepso: "Középső medence", keleti: "Keleti medence" };
  /* jelzőlámpák a parti településeknél (a kikötők közelében) + a három tóközépi jelző */
  const STM_ST = ["Keszthely", "Gyenesdiás", "Vonyarcvashegy", "Balatongyörök", "Balatonederics", "Szigliget", "Badacsonytomaj", "Ábrahámhegy", "Révfülöp", "Balatonszepezd", "Zánka", "Balatonakali", "Balatonudvari", "Tihany", "Balatonfüred", "Csopak", "Alsóörs", "Balatonalmádi", "Balatonkenese", "Balatonakarattya", "Balatonvilágos", "Balatonaliga", "Siófok", "Zamárdi", "Szántód", "Balatonföldvár", "Balatonszárszó", "Balatonszemes", "Balatonlelle", "Balatonboglár", "Fonyód", "Balatonfenyves", "Balatonmáriafürdő", "Balatonberény"];
  const STM_MID = [["Keszthelyi-öböl (tóközépi jelző)", 46.735, 17.295], ["Szigliget – Balatonmáriafürdő (tóközépi jelző)", 46.752, 17.415], ["Siófok – Alsóörs (tóközépi jelző)", 46.950, 18.012]];
  function stmStations() { if (STM.st) return STM.st; const out = [];
    STM_ST.forEach((n) => { const t = BAL_TOWNS.find((q) => q[0] === n); if (!t) return; const s = balShorePt(t[1], t[2]); const [la, lo] = balLL(s.x, s.z); out.push({ n, x: s.x - s.nx * 25, z: s.z - s.nz * 25, b: stmBasin(la, lo), mid: false }); });
    STM_MID.forEach(([n, la, lo]) => { const [x, z] = balXY(la, lo); if (balInLake(x, z)) out.push({ n, x, z, b: stmBasin(la, lo), mid: true }); });
    STM.st = out; return out; }
  /* a HungaroMet aktuális fokozatai (a saját szerveren futó api/index.php?r=viharjelzes közvetítésével – a böngésző a met.hu-t közvetlenül nem érheti el) */
  function stmFetch() { if (STM.fetched) return; STM.fetched = true; if (!/^https?:$/.test(location.protocol) || /github\.io$/i.test(location.hostname)) return;
    try { const u = new URL("api/index.php?r=viharjelzes", location.href).href, ac = new AbortController(); setTimeout(() => ac.abort(), 5000);
      fetch(u, { cache: "no-store", signal: ac.signal }).then((r) => r.ok ? r.json() : null).then((j) => { if (j && j.ok && j.season && j.basins && j.basins.keleti != null) STM.live = j; }).catch(() => {}); } catch (e) {} }
  /* a futam szeléhez illő fokozat (széllökés ≈ 1,35 × átlag): 40–60 km/h → elsőfok, 60 fölött → másodfok */
  function stmFromWind(tws) { const g = tws * 1.35 * 3.6; return g > 60 ? 2 : g > 40 ? 1 : 0; }
  function stmLevels(C, venue) {
    stmFetch(); const vb = (venue && venue.basin) || "keleti";
    if (STM.live) { STM.lv = Object.assign({}, STM.live.basins); STM.src = "élő adat: HungaroMet (met.hu)"; }
    else { const L = stmFromWind(C.tws), R = vrRng((C.lvl || 0) * 53 + 5); STM.lv = { nyugati: 0, kozepso: 0, keleti: 0 }; Object.keys(STM.lv).forEach((b) => { STM.lv[b] = b === vb ? L : Math.max(0, Math.min(2, L + (R() < .35 ? 1 : R() < .5 ? -1 : 0) * (L || R() < .3 ? 1 : 0))); });
      const m = new Date().getMonth() + 1; STM.src = (m >= 4 && m <= 10 ? "a futam szeléből számolva" : "a futam szeléből – a valódi rendszer ápr. 1. – okt. 31. között működik"); }
    return STM.lv[vb] || 0;
  }
  /* élő fokozat → a futam szele (ha a valóságban erősebb szél várható, a futam is erősebb szélben megy) */
  function stmWind(C, venue) { if (!STM.live || !venue) return; const L = STM.live.basins[venue.basin] || 0; if (L === 1 && C.tws < 15 * KN) { C.tws = 15 * KN; C.wxn = "friss szél – elsőfokú viharjelzés"; } if (L === 2 && C.tws < 20 * KN) { C.tws = 20 * KN; C.wxn = "erős szél – MÁSODFOKÚ viharjelzés"; } }
  /* a jelzőoszlopok és a villogó fények (nappal is látszanak, mint a valódiak) */
  function stmBuild(G, cx, cz, venue) {
    const st = stmStations(), parts = [], pos = [], bas = [], sz = [];
    st.forEach((s, i) => { const P = balPlace(cx, cz, s.x, s.z, 0), d = P.d; if (d < 25) return;
      if (d < 9000) { const put = balPut(parts, cx, cz, s.x, s.z, 0); if (s.mid) { put(new THREE.CylinderGeometry(1.6, 1.8, 1.4, 10), "#f2c21a", 0, .5); put(new THREE.CylinderGeometry(.25, .3, 9, 6), "#e8e8e2", 0, 5); put(new THREE.BoxGeometry(2.6, 1.3, 1.3), "#2a2e33", 0, 9.6); put(new THREE.BoxGeometry(2.4, .4, 2.4), "#3a6fa6", 0, 8.6); }
        else { put(new THREE.CylinderGeometry(.22, .3, 12, 6), "#d9dcd6", 0, 6); put(new THREE.BoxGeometry(1.6, 1.2, 1.2), "#2a2e33", 0, 12.4); } }
      const L = balPlace(cx, cz, s.x, s.z, s.mid ? 9.8 : 12.6); pos.push(L.x, L.y, L.z); bas.push(s.b === "nyugati" ? 0 : s.b === "kozepso" ? 1 : 2); sz.push(clamp(9 - d / 2500, 2.6, 8)); });
    balBake(parts, (m4) => balHazeK(m4.userData_d || 0), balMat(), G);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("bas", new THREE.Float32BufferAttribute(bas, 1)); g.setAttribute("sz", new THREE.Float32BufferAttribute(sz, 1)); W.disposables.push(g);
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uPer: { value: new THREE.Vector3(0, 0, 0) }, uDay: { value: 1 }, uPx: { value: 1 } },
      vertexShader: "attribute float bas, sz; uniform float uT, uDay, uPx; uniform vec3 uPer; varying float vA; void main(){ float per = bas < .5 ? uPer.x : bas < 1.5 ? uPer.y : uPer.z; float on = 0.; if (per > 0.) { float ph = fract(uT / per); on = step(ph, .34) * (.7 + .3 * smoothstep(0., .06, ph)); } vA = on; vec4 p = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * p; gl_PointSize = sz * uPx * mix(3.2, 2.2, uDay) * (on > 0. ? 1. : 0.); }",
      fragmentShader: "uniform float uDay; varying float vA; void main(){ float r = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., r); a *= a; vec3 c = vec3(1., .78, .12) * (a * 1.4 + smoothstep(.14, 0., r) * 2.) * vA * mix(1., 1.6, uDay); gl_FragColor = vec4(c, 1.); }" });
    W.disposables.push(m); const pt = new THREE.Points(g, m); pt.frustumCulled = false; pt.renderOrder = 7; pt.userData.night = 1; G.add(pt); STM.pts = pt; STM.mat = m;
  }
  function stmPeriods() { const p = (l) => l === 2 ? 60 / 90 : l === 1 ? 60 / 45 : 0; return [p(STM.lv.nyugati), p(STM.lv.kozepso), p(STM.lv.keleti)]; }
  function stmTick(dt, night) { if (!STM.mat || !STM.pts.parent) return; const U = STM.mat.uniforms; U.uT.value += dt; const p = stmPeriods(); U.uPer.value.set(p[0], p[1], p[2]); U.uDay.value = night ? 0 : 1;
    try { U.uPx.value = T.inVR ? 1.6 : clamp(innerHeight / 700, .8, 2.2); } catch (e) {} }
  function stmText(short) { const n = (l) => l === 2 ? "MÁSODFOK" : l === 1 ? "elsőfok" : "alapfok"; const L = STM.lv; return short ? `Ny: ${n(L.nyugati)} · K: ${n(L.kozepso)} · Kel: ${n(L.keleti)}` : `Nyugati medence: ${n(L.nyugati)} · Középső: ${n(L.kozepso)} · Keleti: ${n(L.keleti)}`; }

  /* =================================================================== A BALATON TÉRKÉPE a táblákon (térképészeti stílus: domborzatárnyékolás, partvonal, települések,
     nevezetességek, medencehatárok a viharjelzés színével, viharjelző lámpák, a futam helye, szélnyíl, északjel, méretarány) */
  const BMAP = { lon0: 17.19, lon1: 18.20, lat0: 46.675, lat1: 47.075 };
  function balMapImg() {
    if (BAL.mapImg) return BAL.mapImg; const B = balData(), M = BAL_M, w = 1100, h = Math.round(w * (BMAP.lat1 - BMAP.lat0) * BAL_KY / ((BMAP.lon1 - BMAP.lon0) * BAL_KX));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d"), im = g.createImageData(w, h), D = im.data;
    const PAL = { 1: [222, 210, 160], 2: [176, 196, 120], 3: [120, 158, 104], 4: [226, 190, 170], 5: [196, 200, 150], 6: [196, 214, 160], 7: [170, 165, 150], 8: [236, 226, 196] };
    const hAt = (lo, la) => { let fx = clamp((lo - M.lon0) / M.dl, 0, M.nx - 1.001), fy = clamp((la - M.lat0) / M.dp, 0, M.ny - 1.001); const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, i0 = iy * M.nx + ix, H = B.H; return 2 * ((H[i0] * (1 - tx) + H[i0 + 1] * tx) * (1 - ty) + (H[i0 + M.nx] * (1 - tx) + H[i0 + M.nx + 1] * tx) * ty); };
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { const lo = BMAP.lon0 + (BMAP.lon1 - BMAP.lon0) * px / w, la = BMAP.lat1 - (BMAP.lat1 - BMAP.lat0) * py / h, ix = clamp(Math.round((lo - M.lon0) / M.dl), 0, M.nx - 1), iy = clamp(Math.round((la - M.lat0) / M.dp), 0, M.ny - 1), cl = B.C[iy * M.nx + ix], o = (py * w + px) * 4;
      if (cl === 0) { D[o] = 150; D[o + 1] = 196; D[o + 2] = 214; D[o + 3] = 255; continue; }
      const hh = hAt(lo, la), e = .006, dx = hAt(lo + e, la) - hAt(lo - e, la), dy = hAt(lo, la + e) - hAt(lo, la - e), sh = clamp(1 + (-dx * .9 + dy * .7) * .0045, .7, 1.18), alt = clamp(hh / 380, 0, 1);
      const c = PAL[cl] || PAL[6]; D[o] = clamp(c[0] * sh * (1 - alt * .12), 0, 255); D[o + 1] = clamp(c[1] * sh * (1 - alt * .1), 0, 255); D[o + 2] = clamp(c[2] * sh * (1 - alt * .05), 0, 255); D[o + 3] = 255; }
    g.putImageData(im, 0, 0);
    /* vízmélység-árnyalat a part mentén + partvonal */
    const P = (lo, la) => [(lo - BMAP.lon0) / (BMAP.lon1 - BMAP.lon0) * w, (BMAP.lat1 - la) / (BMAP.lat1 - BMAP.lat0) * h];
    g.save(); g.beginPath(); HV_SHORE.forEach(([lo, la], i) => { const q = P(lo, la); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.clip();
    for (let k = 6; k >= 1; k--) { g.strokeStyle = `rgba(255,255,255,${.05 + k * .015})`; g.lineWidth = k * 5; g.stroke(); } g.restore();
    g.beginPath(); HV_SHORE.forEach(([lo, la], i) => { const q = P(lo, la); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.strokeStyle = "#3b7290"; g.lineWidth = 2.2; g.stroke();
    BAL.mapImg = cv; BAL.mapP = P; return cv;
  }
  /* o: { venue, wf (rad, honnan fúj), title, labels: "sok" | "kevés", t (animáció) } */
  function drawBalMap(g, x, y, w, h, o) {
    o = o || {}; const img = balMapImg(), iw = img.width, ih = img.height, sc = Math.min(w / iw, h / ih), dw = iw * sc, dh = ih * sc, ox = x + (w - dw) / 2, oy = y + (h - dh) / 2, t = o.t || 0;
    const P = (la, lo) => { const q = BAL.mapP(lo, la); return [ox + q[0] * sc, oy + q[1] * sc]; }, many = o.labels !== "kevés" && w > 520;
    g.save(); uiRR(g, x, y, w, h, 16); g.clip(); g.fillStyle = "#e9e1c8"; g.fillRect(x, y, w, h); g.drawImage(img, ox, oy, dw, dh);
    /* medencék a viharjelzés színével (sárga = elsőfok, vörös = másodfok) */
    const lv = STM.lv, tint = (b) => lv[b] === 2 ? "rgba(214,40,40,.30)" : lv[b] === 1 ? "rgba(255,196,26,.30)" : null;
    { const ext = (L, k) => P(L[0][0] + (L[0][0] - L[1][0]) * k, L[0][1] + (L[0][1] - L[1][1]) * k), e1n = ext(STM_L1, 25), e1s = ext([STM_L1[1], STM_L1[0]], 25), e2n = ext(STM_L2, 25), e2s = ext([STM_L2[1], STM_L2[0]], 25), F = 6000;
      const polys = { nyugati: [e1n, e1s, [e1s[0] - F, e1s[1]], [e1n[0] - F, e1n[1]]], kozepso: [e1n, e1s, e2s, e2n], keleti: [e2n, e2s, [e2s[0] + F, e2s[1]], [e2n[0] + F, e2n[1]]] };
      Object.keys(polys).forEach((b) => { const c = tint(b); if (!c) return; g.save(); g.beginPath(); HV_SHORE.forEach(([lo, la], i) => { const q = P(la, lo); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.clip();
        g.beginPath(); polys[b].forEach((q, i) => { if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.fillStyle = c; g.fill(); g.restore(); }); }
    /* medencehatárok */
    g.setLineDash([7, 6]); g.strokeStyle = "rgba(20,50,90,.75)"; g.lineWidth = 1.8; [STM_L1, STM_L2].forEach(([a, b]) => { const p0 = P(a[0] + (a[0] - b[0]) * .25, a[1] + (a[1] - b[1]) * .25), p1 = P(b[0] - (a[0] - b[0]) * .25, b[1] - (a[1] - b[1]) * .25); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }); g.setLineDash([]);
    /* tó-felirat */
    { const fs = Math.max(13, dw * .028); g.font = `italic 700 ${fs}px Georgia, serif`; g.fillStyle = "rgba(25,70,110,.7)"; g.textAlign = "center"; const a = P(46.83, 17.70); g.save(); g.translate(a[0], a[1]); g.rotate(-.33); g.fillText("B  A  L  A  T  O  N", 0, 0); g.restore();
      if (many) { g.font = `italic 600 ${fs * .55}px Georgia, serif`; [["Nyugati medence", 46.755, 17.37], ["Középső medence", 46.82, 17.72], ["Keleti medence", 46.955, 18.04]].forEach(([n, la, lo]) => { const q = P(la, lo); g.fillText(n, q[0], q[1]); }); } }
    /* viharjelző lámpák */
    stmStations().forEach((s) => { const [la, lo] = balLL(s.x, s.z), q = P(la, lo), l = lv[s.b] || 0, per = l === 2 ? 60 / 90 : l === 1 ? 60 / 45 : 0, on = per && (t % per) / per < .4;
      g.fillStyle = on ? "#ffd21a" : l ? "#a8861a" : "rgba(60,60,60,.55)"; g.beginPath(); g.arc(q[0], q[1], s.mid ? 3.6 : 2.6, 0, TAU); g.fill(); if (on) { g.fillStyle = "rgba(255,210,26,.35)"; g.beginPath(); g.arc(q[0], q[1], 9, 0, TAU); g.fill(); } });
    /* települések */
    const big = { Siófok: 1, Keszthely: 1, Balatonfüred: 1, Fonyód: 1, Tihany: 1, Badacsonytomaj: 1, Balatonalmádi: 1, Zamárdi: 1, Balatonboglár: 1, Szigliget: 1, Révfülöp: 1, Balatonlelle: 1, Balatonkenese: 1, Balatonföldvár: 1, Tapolca: 1, Hévíz: 1 };
    const few = { Siófok: 1, Keszthely: 1, Balatonfüred: 1, Tihany: 1, Badacsonytomaj: 1, Fonyód: 1, Zamárdi: 1 };
    BAL_TOWNS.forEach(([n, la, lo, r]) => { const q = P(la, lo), sm = !big[n]; if (sm && !many) return; if (!many && !few[n]) return; g.fillStyle = "#7a2e22"; g.beginPath(); g.arc(q[0], q[1], sm ? 2.2 : 3.4, 0, TAU); g.fill();
      const fs = sm ? Math.max(9, dw * .0115) : Math.max(11, dw * .0145); g.font = `${sm ? 500 : 700} ${fs}px ${UIF}`; const north = la > 46.86 || lo < 17.3; g.textAlign = "center"; g.lineWidth = 3; g.strokeStyle = "rgba(255,250,235,.9)"; g.strokeText(n, q[0], q[1] + (north ? -6 : fs + 3)); g.fillStyle = "#2b2116"; g.fillText(n, q[0], q[1] + (north ? -6 : fs + 3)); });
    /* nevezetességek (kis jelek) */
    if (many) [["⛪", 46.91389, 17.88944], ["▲", 46.80351, 17.49584], ["♜", 46.8042, 17.4343], ["⚑", 46.90541, 18.0522], ["♛", 46.7703, 17.2445], ["◉", 46.779, 17.652]].forEach(([s, la, lo]) => { const q = P(la, lo); g.font = `700 ${Math.max(12, dw * .016)}px ${UIF}`; g.fillStyle = "#1d2a38"; g.textAlign = "center"; g.fillText(s, q[0] + 9, q[1] + 4); });
    /* a Zephyr-ház */
    { const q = P(46.88936, 17.96297); g.fillStyle = "#d61f26"; g.beginPath(); g.moveTo(q[0], q[1] - 7); g.lineTo(q[0] + 5, q[1]); g.lineTo(q[0] - 5, q[1]); g.fill(); }
    /* a futam helye */
    if (o.venue && o.venue.lat) { const q = P(o.venue.lat, o.venue.lon), pr = (t * .8) % 1; g.strokeStyle = `rgba(214,31,38,${1 - pr})`; g.lineWidth = 3; g.beginPath(); g.arc(q[0], q[1], 8 + pr * 22, 0, TAU); g.stroke();
      g.fillStyle = "#d61f26"; g.beginPath(); g.arc(q[0], q[1], 7, 0, TAU); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.stroke();
      if (o.wf != null) { const L = 26; g.strokeStyle = "#0b4f8a"; g.fillStyle = "#0b4f8a"; g.lineWidth = 3; const sx = q[0] + Math.sin(o.wf) * (L + 14), sy = q[1] - Math.cos(o.wf) * (L + 14), ex = q[0] + Math.sin(o.wf) * 14, ey = q[1] - Math.cos(o.wf) * 14; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); const an = Math.atan2(ey - sy, ex - sx); g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - Math.cos(an - .45) * 10, ey - Math.sin(an - .45) * 10); g.lineTo(ex - Math.cos(an + .45) * 10, ey - Math.sin(an + .45) * 10); g.fill(); } }
    /* északjel és méretarány */
    { const nx = x + w - 30, ny = y + 34; g.fillStyle = "#1d2a38"; g.beginPath(); g.moveTo(nx, ny - 18); g.lineTo(nx + 8, ny + 6); g.lineTo(nx, ny + 1); g.lineTo(nx - 8, ny + 6); g.fill(); g.font = `800 14px ${UIF}`; g.textAlign = "center"; g.fillText("É", nx, ny + 22);
      const km = 10, px = km * 1000 / BAL_KX / (BMAP.lon1 - BMAP.lon0) * dw, bx = x + 16, by = y + h - 16; g.fillStyle = "#1d2a38"; g.fillRect(bx, by - 4, px, 4); g.fillStyle = "#fff"; g.fillRect(bx + px / 2, by - 4, px / 2, 4); g.strokeStyle = "#1d2a38"; g.lineWidth = 1; g.strokeRect(bx, by - 4, px, 4); g.textAlign = "left"; g.font = `700 13px ${UIF}`; g.fillStyle = "#1d2a38"; g.fillText("10 km", bx + px + 6, by); }
    g.textAlign = "left"; g.restore();
    uiRR(g, x, y, w, h, 16); g.strokeStyle = "rgba(120,90,40,.9)"; g.lineWidth = 3; g.stroke();
    if (many) { g.font = `600 12px ${UIF}`; g.fillStyle = "rgba(40,30,20,.7)"; g.textAlign = "right"; g.fillText("Partvonal © OpenStreetMap-közreműködők", x + w - 10, y + h - 8); g.textAlign = "left"; }
  }
