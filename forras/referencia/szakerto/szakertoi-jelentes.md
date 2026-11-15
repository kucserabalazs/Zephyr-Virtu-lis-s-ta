# Zephyr Virtuális Séta és Balaton Sailing VR – független szakértői jelentés

**Vizsgálat ideje:** 2026. november 15.
**Vizsgált változat:** `weboldal/virtualis-seta/` (build: 2026-11-15 03:06, `vilag.js` 1,96 MB, `index.html` 1,98 MB). A forrás: `forras/virtualis-seta-forras.html` és `forras/vilag/*.js` (37 fájl, ~36 900 sor).
**Módszer:** kódolvasás, valamint Playwright + SwiftShader (szoftveres WebGL) alatt futtatott, szkriptelt bejárás: 2D főoldal (asztali és telefon), menük, VR-játékválasztó, szabályok és szótár, a VR-panel vásznai, a Balaton Sailing VR teljes útja (menüvarázsló, bemutatóterem, fiók, kikötői séta, vitorlásiskola, nappali és éjszakai futam, műszer, szünet, versenymenü, eredmény-tájékoztató, drón-visszajátszás), sakk, hullámvasút, makett, 2D stégjátékok, a `?jatek` játékközpont. Mértem a `renderer.info` adatait, és a „be- és kilépés háromszor” szivárgástesztet is lefuttattam.
**Szkriptek:** `/home/claude/t/szakerto/*.js` (p2d, p2m, vr1–vr5, leak). **Képernyőképek:** ugyanebben a mappában (a fájlnevek a szövegben szerepelnek).

> **A mérés korlátai.** Nem volt fizikai Quest 2. A SwiftShader nem méri a Quest GPU-ját, ezért a képkockasebesség itt nem mérvadó (1–1,3 fps). A rajzolási hívások, a háromszögszám, a shaderprogramok és a textúrák száma viszont eszközfüggetlen, ezek összevethetők a Quest 2 keretével. Ahol egy állítás csak a Questen ellenőrizhető, azt *„Questen ellenőrizendő”* jelöli.

---

## A) Vezetői összefoglaló – a 10 legfontosabb teendő (prioritás szerint)

Összkép: a projekt tartalmilag rendkívül gazdag és sok helyen kifejezetten igényes. Jól sikerült a menüvarázsló, a kapitányi tájékoztató, a pályatérképek, a szótár SVG-ábrái és a mahjong lapjai. Ugyanakkor **három szerkezeti gond** visszafogja: (1) Quest 2-n több jelenet messze túllépi a teljesítménykeretet; (2) a VR-ben olvasott szövegek nagy része a Quest 2 felbontásán túl kicsi (különösen a tulajdonosnak); (3) legalább hatféle vizuális stílus és hatféle „arany” szín él egymás mellett, egységes dizájnrendszer nincs. A hangkép ötletes (minden szintetizált), de nem térbeli, keverés nincs, és a rajtprocedúra nem a versenyszabályokat (RRS 26) követi.

| # | Teendő | Miért | Ráfordítás |
|---|---|---|---|
| 1 | **Teljesítménykeret Quest 2-re:** a sakkban (1,04 M háromszög, 385 hívás) és a kikötői sétában (560 hívás, 398 e háromszög, 57 shader) LOD és összeolvasztás; VR-ben a képméret-szorzó 1,25 helyett **1,0**, erősebb (0,8–1,0) foveation; a 8K panoráma Questen alapból 4K legyen | A 72 fps-t ezek a jelenetek biztosan nem tartják (mérve: G fejezet) | 2–5 nap |
| 2 | **Minimális szövegméret VR-ben (szögben megadva):** a műszer 20–26 px-es és a táblák 12–19 px-es feliratai 0,5–0,8°-osak, ezek olvashatatlanok. Alsó határ 1,1°, törzsszöveg 1,4°, a műszer kulcsszámai legalább 3°. A „Nagy kezelőfelület” Questen alapból legyen BE, és minden játékra hasson | Akadálymentesség; a tulajdonos maga is gyengébben lát | 2–3 nap |
| 3 | **Egységes dizájnrendszer** (E fejezet): egy színpaletta-tokenkészlet, egy betűcsalád (Inter 500/700/800 – a 900-as súly most nincs betöltve, a Georgia Questen nem létezik), egy gomb- és egy táblakomponens minden játékban | Most 6 eltérő táblastílus, 6 arany, 5 piros és 5 sötétkék szín van | 1 hét |
| 4 | **Drón-visszajátszás VR-ben: a nézőt ne repítsük körbe** (a `vrReplayTick` a `W.root`-ot forgatja és tolja). Helyette asztali makett-nézet vagy lebegő képernyő, mozgásnál kényelmi vignettával | A kényszerített kameramozgás émelygést okoz (vection) | 1–2 nap |
| 5 | **Rajtprocedúra a szabályok szerint** (RRS 26: 5-4-1-0, zászlók és hangjelek), rövidített „gyakorló” változattal; X lobogó és egy hangjel egyéni visszahívásnál | Most −30 és −10 mp-nél kürt, −5…−1 között sípolás, a zászlók nem a jelzéseknek felelnek meg – egy bajnok oktatónál ez hiteltelen | 1 nap |
| 6 | **Térbeli hang és keverés:** a hangok most egyetlen monó buszon szólnak. Kell HRTF-panner (a rendezőhajó kürtje, a riválisok kiáltásai, a sirályok), a szél iránya a fülön (látszólagos szél a fejhez képest), külön alcsatornák (környezet / effekt / UI / beszéd / zene) és limiter | A szél „fülön” érzése valódi vitorlás-készség; ez a játék fő tanítási értéke lehet | 3–4 nap |
| 7 | **Gyors hibajavítások** (B fejezet): rossz utcai házszám a házvázlaton (54 ↔ 58), elavult játékleírások (3 ellenfél / 5 pálya / „15 méteres”), formázatlan szótár-gomb a játékválasztóban, kilógó viharjelző lábléc, negatív visszajátszási idő, mobilon levágott „Menü” gomb, a vitorlásiskola rossz irányba álló hálószálai | Mind látható, olcsó javítás | 1 nap |
| 8 | **Víz** (a legnagyobb felület a képen): közelről kockás, tömbös, villódzó. Két úszó normáltérkép, távolság szerinti elhalványítás, Fresnel, balatoni tejeszöld-türkiz alapszín, nyomvíz és orrhullám | A víz adja az élmény felét | 3–5 nap |
| 9 | **Kézkövetéses kezelés egységesítése:** közeli (≤ 0,6 m) felületeken közvetlen bökés (poke) – a műszer gombjai karnyújtásnyira vannak; a távolabbiakon csippentés + sugár. A helyváltoztatás a Meta-szabvány gesztusa legyen (tenyér felfelé, csippentés, ív), nem „ököl + hüvelykujj” | Gyerekek és első használók csak a megszokott gesztusokat találják ki | 3 nap |
| 10 | **Hangalapú visszajelzés pótlása kézkövetésnél** (ott nincs rezgés): egységes UI-hangkészlet (rámutatás, megnyomás, vissza, hiba, siker). A szünetben **ne** függesszük fel az AudioContextet – a szünettábla gombjai most némák | Kéznél a hang az egyetlen tapintáspótló | 0,5 nap |

---

## B) Hibák és javítási javaslatok

Súlyosság: **K** = kritikus, **M** = magas, **K-** = közepes, **A** = alacsony.

### B.1 Teljesítmény- és stabilitási hibák

| # | Súly | Hely | Hiba | Reprodukálás / bizonyíték | Javaslat |
|---|---|---|---|---|---|
| 1 | **K** | `06e-sakk-*.js` | A sakkjelenet egy képkockája **1 042 198 háromszöget** és 385 rajzolási hívást tartalmaz (mérve). Quest 2-n stabil 72 Hz-hez egyik sem fér bele, a hívások multiview nélkül szemenként duplázódnak | `vr3.js` → `INFO chess` | A bábuk 3 LOD-szintje (≥ 6 m távolságban 10–20%-os háló), egy bábutípus = egy `InstancedMesh`, a tornyok rácsszerkezete egyetlen normáltérképes doboz/kártya, a vitorlák 2 oldalú, alacsony szegmensszámú síkok |
| 2 | **M** | `05f-verseny-kikoto.js` (kikötői séta) | 560 hívás, 398 e háromszög, 57 shaderprogram, 8 fényforrás | `vr1.js` → `INFO harbor-walk` | A futamban már működő kisütést (`05k`, `msMerge`) a kikötőre is alkalmazni; 1 irányfény + 1 hemi, a lámpák csak emisszív anyaggal (valódi fény nélkül); a kikötött hajók LOD-ja |
| 3 | **M** | `virtualis-seta-forras.html` `vrEnter()` (~10 323. sor) | VR-ben `setFramebufferScaleFactor(1.25)` + MSAA (`antialias: true`) + gyenge foveation (0,4). A 1,56-szoros pixelszám és a 4× MSAA együtt felemészti a Quest 2 töltési sávszélességét | kód | Futamban, sakkban és hullámvasúton 1,0×; a 360°-os panorámán maradhat 1,25×. Foveation: futamban 1,0, menüben 0,5. Dinamikus felbontás: ha a képidő 3 egymást követő mp-ben 13,9 ms fölött van, csökkentse a szorzót |
| 4 | **M** | `vr8k()` (~10 167. sor) | A 8K panoráma (8192×4096) Questen is alapból bekapcsol (`!== "0"`). Ez textúránként ~128 MB tömörítetlen RGBA, mipmappal ~170 MB, az átváltáskor kettő is a memóriában lehet | kód, `img/*-8k.jpg` 5–9 MB | Questen az alapérték 4K legyen, a 8K csak állóképként és kézi bekapcsolásra; hosszabb távon KTX2/Basis, kockatérkép-csempék |
| 5 | **K-** | Shaderváltozatok | Az éjszakai futamban 71 shaderprogram jön létre (mérve). Minden új program fordítása Questen akadást (50–300 ms) okozhat a futam közben | `vr2.js` → `n-race prog:71` | Az anyagok előzetes fordítása a betöltőképernyő alatt (`renderer.compile(scene, camera)`), a változatok számának csökkentése (azonos `defines`, kevesebb egyedi `onBeforeCompile`) |
| 6 | **K-** | `01-mag.js` / tour `noiseBuf()` | Minden hanghatás (fröccsenés, hullámcsapás, ütközés, taps, csapkodás) **új zajpuffert** generál `Math.random()`-mal. A szemétgyűjtés Questen apró akadásokat okoz | kód (`T.noiseBuf(sec)` hívások) | Indításkor egyszer 2–3 db 4 mp-es (fehér/rózsaszín/barna) zajpuffer, a lejátszás véletlen `offset`-tel indul |
| 7 | **K-** | `05e-verseny-tajekoztato.js` `uiBoard` | Rámutatáskor a teljes (1400–1600 px-es) vászon újrarajzolódik árnyékelmosással (`shadowBlur 26`), majd az egész textúra újra feltöltődik. Questen ez képkockánként 3–10 ms is lehet | kód | Gombonkénti rétegezés: a rámutatás-kiemelés külön kis sík a gomb fölött (shader-glow), a vászon csak tartalomváltáskor rajzolódik újra; `shadowBlur` helyett előre renderelt árnyékkép |
| 8 | **A** | `ZephyrWorld.close()` | Bezárás után a `ZephyrWorld.kind` értéke `"race"` marad | `leak.js` (`closed0 … kind:"race"`) | Bezáráskor `W.kind = null` |
| 9 | **A** | Szivárgás | Nincs érdemi szivárgás: háromszori be- és kilépés után a geometriák száma visszaáll 7-re; a textúrák 6 → 12, az ok kis maradvány (UI-vásznak) | `leak.js` | A maradó vászontextúrák felszabadítása (`W.disposables` a csukló- és öv-gombokra is) |

### B.2 Funkcionális és tartalmi hibák

| # | Súly | Hely | Hiba | Reprodukálás | Javaslat |
|---|---|---|---|---|---|
| 10 | **M** | `virtualis-seta-forras.html` 4148. és 4198. sor (házvázlat `outs`, `lp`) | A házvázlat utcai felirata **„Gáspár András utca 54.”**, máshol mindenhol (2506., 5785. sor, kezdőoldal, makett) **58**. A tulajdonos adata szerint 58 | Séta → a bal oldali „Házvázlat” alja (`2d_hu_0.png`) | Mindkét előfordulás javítása 58-ra – *a tulajdonossal egyeztetendő* |
| 11 | **M** | `worldChooser()` (~10 195. sor), VR-panel `world` lapja, `?jatek` központ (13 548. sor) | A leírások elavultak: „15 méteres Zephyr”, „három ellenfél”, „öt pálya, ötfutamos bajnokság”, „Vitorlásverseny – a kormánynál”. A játék ma Balaton Sailing VR, 10 pályával, 5 hajóosztállyal, menüvarázslóval. A `?jatek` oldal címe ráadásul „Zephyr Sailing VR” | `2d_hu_pick.png`, `vrpanel_world.png`, `hub.png` | Egyetlen központi szövegforrás (`GAMES` tömb) mindhárom helyre; a név mindenhol „Balaton Sailing VR” |
| 12 | **K-** | CSS 592–594. sor (`.world-pick [data-w]`) | A „📖 Szabályok és vitorlás szótár” gomb `data-dict` attribútumú, ezért nem kap stílust: szürke, középre zárt, a cím és a leírás egybefolyik („…képekkel**A** verseny…”) | `2d_hu_pick.png` alja | A szelektorokat bővíteni: `.world-pick [data-w], .world-pick [data-dict]` (mind a 3 szabályban) |
| 13 | **K-** | `05e` 286. sor, `05n` 139. sor, `uiFit()` (05e, 14. sor) | Az `uiFit` 12 px-nél abbahagyja a kicsinyítést, így a viharjelző lábléc **kilóg a tábláról** („…Keleti: alapfok” levágva, a tájékoztatón „…ápr. 1.–okt”) | `crop_wz4_lablec.png`, `crop_eredmeny_lablec.png` | Kétsoros tördelés vagy rövidebb szöveg („Viharjelzés: Ny alapfok · K másodfok”); a minimum 18 px helyett a szögalapú alsó határ (E fejezet) |
| 14 | **K-** | `05l` `vrReplay` / `vrRecTick` | A visszajátszás a rajt előtt is indítható, és ilyenkor az idő **„0:00 / −0:03”** lesz | Futam → MENÜ → Visszajátszás a rajt előtt (`r_replay.png`) | A gomb csak a rajt után aktív; az időt a rajttól számolva, `Math.max(0, …)` |
| 15 | **K-** | `vrPause()` (05l, 30. sor) | Szünetkor az `AudioContext.suspend()` miatt a szünettábla és a versenymenü gombjai **némák** (az `uiBoard.click` és a `beep()` ugyanazt a kontextust használja) | Futam → SZÜNET → bármelyik gomb: nincs kattanás | Felfüggesztés helyett a környezeti és effekt-alcsatorna némítása (`gain → 0`); az UI-busz szóljon |
| 16 | **K-** | `05o-oktatas.js` 256–258. sor (halászháló) | A háló szálai rossz tájolásúak (`translate → lookAt → rotateX` sorrend): **hosszú vonalak futnak át a szobán és a falitáblán**, a lecke szövege fölött is | `sch_2.png`, `crop_sch2_jobb.png` | A hengert a `quaternion.setFromUnitVectors(Y, dir)` szerint forgatni, és csak utána eltolni; vagy egyetlen áttetsző, alfatesztes hálótextúrás sík |
| 17 | **K-** | `05o-oktatas.js` rönkfalak | A rönkök közti réseken **átlátszik az ég** (kék csíkok a falon), a tető belső oldalán a külső zsindelytextúra látszik, a mennyezetnél egy pasztellkockás textúrájú tömb lóg be | `sch_2.png`, `crop_sch2_jobb.png` | Belső „sárfal” sík a rönkök mögött (sötét, matt), a tetőnek külön belső deszkatextúra; a pasztell tömb azonosítása és cseréje |
| 18 | **K-** | Mobil fejléc (390 px széles kijelző) | A „Menü” gomb **kilóg a képből** (Foglalás + VR + Menü nem fér el) | `2d_m_0.png`, `crop_mobil_fejlec.png` | Telefonon a Foglalás csak ikon legyen, vagy a VR-gomb kerüljön a menübe; `flex-wrap`/`min-width:0` |
| 19 | **K-** | Hullámvasút, beszállóállomás | Indításkor egy **szürke gerenda halad át a csónakon**, és a peron deszkái is belelógnak a nézetbe | `g_coaster_hud.png`, `g_coaster_2.png` | Az állomás oszlopait a sín tengelyétől ≥ 1,2 m-re tenni, vagy indításkor a kocsit az állomáson kívül pozicionálni |
| 20 | **A** | Eredmény-tájékoztató | „vegyes flotta – nem hivatalos, nincs pontverseny”, mégis pontok jelennek meg (1 p, 2 p…) | `e_results.png` | Vegyes flottánál a pontoszlop helyett a helyezés és az időkülönbség |
| 21 | **A** | Menüvarázsló, 2. lépés | A hajóosztály-csipek („Zep, Fin, 420, Tut, Fla”) ~8 px-esek, olvashatatlanok; a napszakgombok ikonjai vegyesek (☀ szöveges jel, rajzolt hold, apró „◖”) | `crop_wz2_chipek.png` | Csipek helyett 5 kis hajósziluett-ikon + név; egységes rajzolt ikonok (E.5) |
| 22 | **A** | Varázsló 3. ↔ 4. lépés | A 3. lépésben „5. Nagy ív – Szigliget”, a sorozat tájékoztatóján „Nagy ív · Fonyód” (a sorsolt helyszín). Félreérthető | `hb_wz3.png`, `hb_wz4.png` | Sorozatnál a 3. lépésben a helyszín helyett „helyszín: sorsolt” |
| 23 | **A** | `vrSpeak` (05d, 177. sor), nagypapa-hang | Ha nincs magyar TTS-hang, a kiáltások és a nagypapa **szó nélkül maradnak**. A Quest böngészőjében a magyar hang megléte bizonytalan – *Questen ellenőrizendő* | kód | Előre felvett MP3/Opus hangsávok (a nagypapa 24 leckéje ~6–8 perc), TTS csak tartaléknak; a hiányzó `hang/bekbord.mp3` és `protest.mp3` pótlása (most 404-et adnak) |
| 24 | **A** | Fordítások | Angol nyelvű böngészőben a felület félig angol, félig magyar („VR szemüveg”, „Sailboat chess” mellett magyar leírás, a mahjong súgója magyar). A Meta-áruházhoz ez számít | `2d_d_0.png`, `vrpanel_*.png`, `gm_mahj.png` | Az összes új szöveg felvétele az i18n-táblába; a VR-játékok fordításának pótlása |
| 25 | **A** | Hálózat | A kikötő megnyitásakor a játék **nyilvános Nostr-relékhez** kapcsolódik (WebSocket), egyedül játszva is | konzol: `wss://relay.*` | Kapcsolódás csak az „Online játék” választásakor; adatvédelmi tájékoztatás (GDPR) |
| 26 | **A** | Kifejezés | A kódban és a szótárban „Backbord”, a hangfájl-leírásban „Bekbord” szerepel | `05b` 850. sor, ZSD 4. szabály | A tulajdonos döntse el az egyetlen írásmódot |
| 27 | **A** | 2D (2D-s nézet) Finn / 420 | Az üldözőkamerás nézetben a saját hajón nincs kormányos, a hajó „szellemhajónak” hat | `n_pre.png` | 2D-ben a saját figura is jelenjen meg (VR-ben maradjon rejtve) |
| 28 | **A** | Viewport | `maximum-scale=1` – telefonon nem nagyítható a szöveg (WCAG 1.4.4) | 14 547. sor | A 360°-os vásznon a gesztusokat JS kezelje, a meta-tag engedje a nagyítást |

### B.3 Ami jól működik (röviden)
- A menüvarázsló logikus (4 lépés, lépésjelző, egyértelmű TOVÁBB-gomb), a tájékoztató térképei és a 3D pályamodell kiválóak.
- A futam alatti kisütés (`05k`) a hívásokat 507-ről 197-re csökkenti, okos és biztonságos megoldás.
- A szivárgásteszt tiszta, a világok rendesen felszabadítják a memóriát.
- A szótár és a szabályok SVG-ábrái gyereknek is érthetők, igényesek.
- Az éjszakai hold, a holdfény-tükröződés és a csillagos ég hangulatos.
- A dőlés nézőpontra gyakorolt hatásának visszavonása helyes döntés volt (kényelem).

---

## C) Grafikai fejlesztési javaslatok (Quest 2 keretre szabva)

**Keret (javaslat, futamonként, a két szemre együtt):** ≤ 250 rajzolási hívás (multiview nélkül ≤ 125 szemenként), ≤ 350 e háromszög, ≤ 30 shaderprogram, ≤ 150 MB GPU-textúra (KTX2/ASTC-vel ennek harmada), egy valódi irányfény + hemi, valós idejű árnyék nélkül (kisütött AO / árnyékfolt).

### C.1 Víz (1. prioritás)
- **Jelenleg:** közelről tömbös, kockás mintázat, erős csempeismétlés, ferde szögből villódzás (`r_look1.png`, `n_pod.png`, `e_look2.png`).
- **Javaslat:**
  1. Két egymásra csúszó normáltérkép (512² KTX2, mipmapelt), eltérő léptékben és irányban; a szél irányával és erősségével skálázódjanak (`S.tws`).
  2. A normálok erőssége a távolsággal csökkenjen (pl. 80 m-től) – ez megszünteti a horizont felé eső villódzást.
  3. Schlick-féle Fresnel: közel átlátszóbb tejeszöld (Balaton: **#6FA89C → #3E7F86** mélységben), távol az ég tükröződése.
  4. Csúcsárnyalóban 3 Gerstner-hullám **ugyanazzal a függvénnyel**, amellyel a hajó ring (`vrWave`) – így a test nem süllyed bele a hullámba, és nem lebeg fölötte.
  5. Fodorvíz (szélrohamok): sötétebb, „bársonyos” foltok a vízen, amelyek a széllel vándorolnak. **Ez taktikai információ** – a versenyzők így olvassák a szelet. Egy alacsony felbontású rohamtextúra, amely a `vrLavK`/rohammodellt követi.
- Költség: 1 teljes képernyős anyag, 2 textúraolvasás → Questen elfér.

### C.2 Nyomvíz, orrhullám, permet
- **Nyomvíz:** szalaghaló (ribbon), 40–60 pont, a hajó tatjától; hab-textúra, átlátszóság a korral csökken; a nagy hajón és minden riválison (LOD: 50 m fölött kikapcsolva).
- **Orrhullám:** két kis, szétnyíló habék-mesh a hajóorrnál, mérete a sebesség függvénye.
- **Permet:** legfeljebb 150 részecske `InstancedMesh`/`Points` formában, csak akkor, ha a sebesség > 6 csomó és szembe jön a hullám; additív, puha kör, 0,3–0,6 mp élettartam. Az éjszakai „lebegő gömbök” (`e_look3.png`) jelenleg porszemnek hatnak – rövidebb élettartam, mozgási elmosás (megnyúlt kártya) javít rajta.

### C.3 Ég, fény, éjszaka
- A nappali felhős égbolt szép. A horizonton a part egy vékony, alacsony felbontású csík: 2–3 rétegű sziluettkártya (Tihany, Badacsony, Somogyi-part) légköri fakulással mélyebb hatást adna.
- **Bóják fényoszlopai:** nappal tiszta fehér, vastag oszlopok, éjjel rikító színes hasábok – „hibának” hatnak (`r_look1.png`, `e_look1.png`). Javaslat: 3–4 m magas, felfelé átlátszóvá fakuló sugár (additív, 25–35% fedés) + a bója fölött lebegő kis szám („1”) a dizájnrendszer jelölőjével. Legyen egy **„Valósághű” kapcsoló** is, amely kikapcsolja (haladóknak és a tulajdonosnak – valódi versenyen nincs fényoszlop).
- **Éjszakai bóják:** a valóságban villogó fényt viselnek (pl. sárga Fl(1) 4 s). Ez szebb és tanulságos is.
- **Fények:** egységesen 1 irányfény + 1 hemi + legfeljebb 1 közeli pontfény (a hajó saját lámpája). Most 8 fényforrás van a kikötőben és a futamban.

### C.4 Modellek és anyagok
- A nagy hajó fedélzete, a műszerház és a legénység kidolgozott. A **padkák, csörlők, kötélvezetők** egyszínű, éles élű primitívek – egy közös 1024²-es „hajószerelvény” matcap/normál-atlasz sokat emelne rajta, hívásnövekedés nélkül.
- **Rönkház:** a rönktextúra elmosódott (alacsony felbontás, nagy nyújtás). 1024²-es rönktextúra + kisütött AO a sarokkötéseken; a falrések lezárása (B.17).
- **Riválisok:** 60 m fölött imposztor (kétoldalas kártya: vitorla + test), 150 m fölött csak egy fényes pont. Ezzel futamonként 60–120 hívás takarítható meg.
- **Figurák:** a család-figurák mellényei és arcai jók. Távolabbi figuráknál (`famFreeze`) egyetlen összeolvasztott háló + 256²-es atlasz.

### C.5 Táblák, tipográfia, ikonok
- Jelenleg 6 stílus él egymás mellett (lásd E.0). A varázsló fekete-arany „tabletje” a legjobb és legmodernebb, ez legyen az alap.
- A **Georgia talpas betű** Questen (Android) nem létezik, ott Noto Serif lép helyette. A 900-as betűsúlyt 69 helyen kérik, de csak az Inter 500–800 töltődik be, így a böngésző álkövérítést rajzol. Javaslat: csak Inter 500/700/800; a címekhez legfeljebb egy betöltött display-betű (pl. a „Zephyr” logóhoz illő), WOFF2-ben, `document.fonts.load()` után rajzolva.
- Emodzsik helyett **egységes vonalas ikonkészlet** (E.5) – az emodzsi a Questen és a PC-n is máshogy néz ki.

### C.6 360°-os séta
- A panorámák minősége kiváló. A bal felső „VISSZA/BEÁLLÍTÁSOK” forgó 3D kocka mobilon a kép ötödét elfoglalja (`2d_m_0.png`), és a nyitójelenetben is ott van, ahol nincs mire visszalépni. Javaslat: lapos, 44×44 px-es vissza-gomb a fejlécben; a kocka csak asztali nézetben, kisebben.

---

## D) Használhatóság és kezelés

### D.1 VR-ergonómia – mért méretek
| Felület | Szélesség | Távolság | Látószög | Megjegyzés |
|---|---|---|---|---|
| Menüvarázsló (`05n`) | 1,55 m | 1,4 m | **58°** | Túl széles: a szélek fejfordítást igényelnek. Cél ≤ 45–50° (1,25 m) |
| Kapitányi tájékoztató (`05e`) | 1,75 m | 1,6 m | **57°** | Ugyanaz |
| Versenymenü | 1,35 m | 1,3 m | 55° | Elfogadható, de a 22 px-es alsorok 0,93°-osak |
| Szünettábla | 1,1 m | 1,25 m | 47° | Jó |
| Műszer (nagy hajó) | 0,39 m | ~0,8 m | 27° | A betűk 20–26 px → **0,55–0,7°**, ez olvashatatlan |
| VR-panel (séta) | 0,92 m (nagy: 1,12 m) | 1,2 m | 42° | Jó, a „Nagy kezelőfelület” alapból ki van kapcsolva |
| Vitorlásiskola vezérlője | 1,15 m | 1,05 m | 57° | Túl széles és túl közel; a 22–24 px-es szöveg ~0,9° |

### D.2 Olvashatóság
- **Szabály:** a Quest 2 közepén kb. 20 képpont jut egy fokra. A 0,8° alatti betű (≈ 16 px magas) a gyengébben látóknak olvashatatlan, az ép látásúaknak is fárasztó.
- A legfontosabb számok (rajtig hátralévő idő, sebesség, VMG, irány a bójához) a műszeren **3–4°**-osak legyenek, a többi adat a „második képernyőn” (lapozható) jelenjen meg. Most egyetlen kijelzőn 20+ adat zsúfolódik (`r_pod.png`).
- A kulcsadatok szem előtt is legyenek: a fő vitorla alatt lebegő, árbocra szerelt nagy kijelző (most csak „−0:44 / 8.1”, kicsi) legyen 2× akkora, és mutassa a rajtig hátralévő időt, majd a bóják felé vezető irányt.

### D.3 Kézkövetés
- **Most:** szinte minden csippentés + sugár. Az oktatóházban van bökés (`poke`). Helyváltoztatás: „ököl + hüvelykujj, ív, koppintás”.
- **Javaslat:**
  - **0,6 m-en belül** (műszergombok, csuklómenü, oktatóház táblája) közvetlen bökés: a gomb 8–10 mm-t „besüpped”, 3 mm-es holtjáték, hang és fény jelzi; a gomb legalább 4×4 cm, 1 cm hézaggal. A műszer 3 gombja most kb. 13×8 cm-es – méretre jó, de csak sugárral érhető el, ami közelről esetlen.
  - **Távolabb:** csippentés + sugár, a célpont-kör a felületen marad. A táblák `depthTest:false` beállítása miatt a kéz a tábla **mögé** kerül, ez rontja a mélységérzetet. A kezet a táblák után rajzolni (renderOrder), vagy a tábla kapjon mélységírást.
  - **Teleport:** a Meta-szabvány gesztusa (tenyér felfelé → csippentés → ív → elengedés); a jelenlegi gesztus legyen alternatíva.
  - **Kormányzás kézzel:** a kormányrúd és a kerék megfogása (öklözés) jó irány, de kell egy **vizuális „fogás” állapot** (a kéz körvonala kiemelt, a rúd vége világít), hiszen tapintás nincs.
  - Kontroller hüvelykujjkarja: kormányzás (bal) + vitorlaállítás (jobb) – a meglévő kiosztás mellé legyen gyorsgomb-ábra a csuklón.
- **Kétkezes dolgok** (két kezes nagyítás, panelhúzás) közben a sugár ne „lőjön” véletlenül gombot: 150 ms-os szándékkapu.

### D.4 Visszajelzések, menüszerkezet, következetesség
- Minden gomb **4 állapotú** legyen: alap, rámutatás (+4% méret, arany körvonal, *tikk* hang), lenyomás (−6 mm, *klikk*), tiltott (40% fedés, nincs hang). A kiválasztott állapotot most csak a szín jelzi (zöld vagy kék) – kell mellé ✓ ikon és vastag arany körvonal (színvakság).
- **Menüszerkezet:** 3 szint legyen. (1) Csukló/öv-gomb → (2) Versenymenü → (3) részlet. A „Főmenü”, „Kikötői menü”, „Versenymenü”, „Vissza a sétához”, „Kilépés a virtuális sétához” elnevezések váltakoznak – kell egy szótár: **Folytatás · Újrakezdés · Beállítások · Főmenü (Balaton Sailing VR) · Kilépés a sétába**.
- Mindig ugyanott legyen a „Vissza” (bal alul) és az elsődleges művelet (jobb alul, arany).
- 2D-ben a sakk HUD-ja 17 gombot tesz egyszerre a képernyőre (`g_chess_hud.png`). Ide kell egy „Nézőpont ▾” és egy „Játék ▾” lenyíló.

### D.5 Akadálymentesség
- **Nagy betű mód globálisan** (tour + minden játék), Questen alapból bekapcsolva, ×1,3 szorzóval.
- **Kontraszt:** a másodlagos szöveg legalább 4,5:1, a táblák alsorai most 60–85% átlátszóságú fehérek – ez a kép mögötti víztől függően 3:1 alá is eshet. A táblák háttere legyen átlátszatlan (≥ 92%).
- **Színvakság:** piros/zöld csak alakkal együtt (a bal oldal ◀ és piros, a jobb ▶ és zöld; a rajtvonal két vége eltérő alakú). A riválisok színeinél az Okabe–Ito paletta.
- **Mozgásérzékenység:** „Kényelmi mód” kapcsoló: vignetta forduláskor és visszajátszáskor, a hullámzás csillapítása a nézőponton (a hajó ringása a nézőre 50%-kal), szelíd hullámvasút.
- **2D-n:** `:focus-visible` 50 helyen van, ez jó. A `font-size ≤ 12px` szabály 53 helyen fordul elő, a minimum 14 px legyen (a tulajdonosnak 16 px). Érintésnél a 44×44 px-es célméret.

---

## E) Egységes dizájnrendszer – „Zephyr Nautical”

### E.0 Kiinduló állapot
| Felület | Háttér | Címbetű | Keret |
|---|---|---|---|
| Menüvarázsló (05n) | fekete #0a0a0a | Inter 900 | arany vonal |
| uiFrame-táblák (szünet, versenymenü, tájékoztató, kikötő) | sötétkék + hullámkép | **Georgia** arany | kötélkeret + zászlófüzér |
| Séta VR-panel | kék színátmenet | Inter | vékony világos keret |
| Oktatóház vezérlő | sötétkék | Inter | arany |
| ZSD szótár | krém „régi térkép” | talpas betű | arany |
| 2D HUD | áttetsző kék kapszula | Inter | – |

A forrásban használt színek: arany ×6 (#ffd166, #f2b233, #D4A13A, #c9a227, #E4BB63, #ffd978), piros ×5 (#e5262f, #c62828, #d61f26, #e2483d, #a3392c), sötétkék ×5 (#0b2f5e, #14202a, #1c355a, #141d4d, #07182C).

### E.1 Színpaletta (tokenek)
| Token | Érték | Használat | Kontraszt |
|---|---|---|---|
| `navy-950` | **#06162A** | táblák alapja (≥ 92% fedés) | – |
| `navy-800` | **#0B2F5E** | felület, kártya | fehér szöveg 13:1 |
| `navy-600` | **#1F5FA8** | másodlagos gomb | fehér 6,3:1 |
| `gold-400` | **#FFD166** | fókusz, kiemelés, elsődleges akcent | navy-950-en 12:1 |
| `gold-600` | **#D99A26** | elsődleges gomb alsó színe | navy-950 szöveg rajta 7:1 |
| `zephyr-red` | **#D61F26** | márka (logó, vitorla), **nem** állapotjelzés | – |
| `port` | **#E5484D** + ◀ alak | bal oldal / hiba / büntetés | – |
| `starboard` | **#1FA463** + ▶ alak | jobb oldal / siker / „OK” | – |
| `water` | **#3E7F86** | víz, térképek | – |
| `sky` | **#9FC9DC** | ég, ábrák háttere | – |
| `text-1` | **#FFFFFF** | elsődleges szöveg | – |
| `text-2` | **#D6E4F2** | másodlagos szöveg (nem áttetsző fehér!) | navy-950-en 14:1 |
| `text-3` | **#9FB4CB** | csak ≥ 1,4°-os szöveghez | 7:1 |
| `night-accent` | **#C9B6FF** | éjszakai mód kiemelései | – |
| Riválisok (Okabe–Ito) | #E69F00, #56B4E9, #009E73, #F0E442, #0072B2, #D55E00, #CC79A7 | térkép, radar | – |

**Éjszakai mód:** a táblák fényereje 70%-ra csökken, a fehér #E8EEF5 lesz – vaksötétben a hófehér tábla elvakít.

### E.2 Tipográfiai skála VR-ben
A betűméret a látószögben megadott **em-magasság**. Képlet: `px = szög(°) × távolság(m) × 17,45 / (táblaszélesség(m) / vászonszélesség(px))`.

| Szint | Szög | 1,0 m-en | 1,4 m-en (1,25 m / 1500 px tábla) | Műszer 0,8 m-en (0,39 m / 1024 px) | Súly |
|---|---|---|---|---|---|
| Kijelzőszám (idő, sebesség) | 3,5° | 61 mm | 102 px | 147 px | 800 |
| Cím | 2,4° | 42 mm | 70 px | 100 px | 800 |
| Gombfelirat | 1,8° | 31 mm | 53 px | 75 px | 700 |
| Törzsszöveg | 1,4° | 24 mm | 41 px | 59 px | 500 |
| Alsor / felirat | 1,1° | 19 mm | 32 px | 46 px | 600 |
| **Abszolút minimum** | 0,9° | 16 mm | 26 px | 38 px | 600 |
| Nagy betű mód | ×1,3 minden szinten | | | | |

2D-ben: 16 / 18 / 22 / 28 / 40 px (sorköz 1,4), minimum 14 px.

### E.3 Komponensek
- **Tábla (Panel):** lekerekítés 24 px (≈ 1,5 cm), 3 px arany belső vonal, fejléc 120 px (cím + alsor), tartalom 12 hasábos rácson, alul gombsáv. Szélesség S/M/L = 0,9 / 1,1 / 1,25 m, távolság 1,2–1,5 m, középpont a szemvonal alatt 10–15°-kal. A zászlófüzér és a kötélkeret csak a „Kikötő” témában maradjon (díszítő változat), a futam közbeni táblák legyenek letisztultak.
- **Gomb:** elsődleges (arany színátmenet, sötétkék felirat), másodlagos (navy-600, fehér), veszélyes (port, fehér + ⚠), szellem (átlátszó, arany körvonal). Minimális célméret: sugárral 2,5°×1,8°, bökéssel 4×4 cm. Ikon balra, 0,6×-es gombmagasságban. **Kiválasztott állapot:** arany 4 px körvonal + ✓.
- **Kapcsoló (szegmentált):** 2–3 elem, a kiválasztott arany alapú + ✓ (most zöld vagy kék).
- **Lépésjelző:** a varázslóé (kör + vonal) – ezt kell átvenni mindenhová.
- **Toast/üzenet:** a látómező alsó harmadában, 0,7 m-en, ≤ 2 sor, ikon + szöveg, 4 mp; a fontos (büntetés, korai rajt) piros sávval és hangjelzéssel.
- **Műszerkijelző:** 3 sáv: felül a kulcsszámok (idő, sebesség, irány), középen a térkép, alul a következő teendő egyetlen mondatban.

### E.4 Elrendezési rács
- Vászon: 1500×1000 px (3:2), 48 px margó, 12 hasáb, 24 px hézag, 8 px-es alapegység.
- VR-tér: a „kényelmi zóna” vízszintesen ±30°, függőlegesen +10…−30°; a kiemelt UI −15°-on; a kéz elérési zónája 0,35–0,6 m.

### E.5 Ikonkészlet
Egyetlen, 2,5 px-es vonalvastagságú, kerekített végű vonalas készlet 48×48-as rácson (a VR-panel arany vonalas ikonjai már ilyenek – ezt kell kiterjeszteni). Kötelező elemek: vitorlás, horgony, kormánykerék, kormányrúd, szél-nyíl, bója (szám-helyőrzővel), rajtzászló, cél (kockás), stopper, szünet/lejátszás, újrakezdés, térkép, serleg, felhasználó, beállítás, hang, nap, hold, félhold-nap (vegyes), kamera (drón), kilépés, vissza, ✓, ⚠. Emodzsi csak a 2D-s gyerekjátékokban maradjon.

### E.6 Mozgás és animáció
- Rámutatás: 100 ms, `ease-out`, +4% méret. Lenyomás: 80 ms. Tábla nyitása: 200 ms, áttűnés + 0,96 → 1 nagyítás. Tábla zárása: 150 ms.
- A világot és a nézőpontot **soha** ne mozgassa animáció a felhasználó beleegyezése nélkül. Ha mégis (hullámvasút, visszajátszás): vignetta + stabil horizont + ≤ 2 m/s² gyorsulás.
- A táblák „lusta követése”: a fejet 30°-os eltérés után 0,5 mp alatt kövessék, ne folyamatosan.

### E.7 Hangjelzési elvek
Minden UI-hang ugyanabból a „hangszerből” szóljon (fa- és réz-jellegű, rövid, 600–1200 Hz alap), és legyen −18 LUFS alatt a környezeti hanghoz képest. Részletek: F.3.

---

## F) Hangok és effektek – külön fejezet

### F.1 A jelenlegi hangkép felmérése (kód alapján)
| Hang | Hol | Megvalósítás | Értékelés |
|---|---|---|---|
| Víz, „rohanás”, szél (folyamatos) | `01-mag.js audioStart` | 3 hurkolt fehérzaj, alul-, sáv- és sávszűrővel; a hangerő a sebességtől függ | Működik, de monó, fehérzaj-alapú (sziszegős), 4–5 mp-es hurok – ismétlődés hallható |
| Vitorlacsapkodás folyamatosan | `05b vrSfx` (flog) | sávszűrt zaj + 7–12 Hz-es négyszög LFO | Jó ötlet; a négyszög LFO gépies, „motorszerű” |
| Kötélzet-süvítés | `vrSfx` (whis) | 2,7 kHz, Q 16 | 15 csomó fölött jó |
| Hullámcsapás a testen | `vrSfx` | alulszűrt zajlöket, sebességfüggő sűrűség | Jó |
| Sirályok | `vrSfx` | fűrészfog-csúszás sávszűrővel | Felismerhető, de „elektronikus” |
| Bum átcsapódása | `vrSlam` | 95 → 48 Hz szinusz + zaj | Jó |
| Fordulócsapkodás, csörlő | `flap()`, `winch()` | zajlökések, négyszög kattanások | Jó |
| Kürt | `horn()` | 3 fűrészfog (233/235,5/466 Hz), alulszűrés | Jó alap, de nem térbeli és túl tiszta |
| Visszaszámlálás | `beep()` | 880 Hz négyszög, 0,18 s | Rajtjelzésként nem szabályos (ld. F.4) |
| Taps, éljenzés | `vrApplause` | szemcsés zaj + háromszögjel-„hurrá” | Elfogadható |
| Ütközés | `05b` 1304. sor, `05d` | alulszűrt zajlöket + TTS-kiáltás | A TTS Questen kérdéses |
| Villámlás, mennydörgés, tücskök | `05h` | zaj- és oszcillátor-szintézis | Jó hangulat |
| UI-kattanás | `uiBoard.click` 660 Hz; `beep()`; tour `fxTone` | **háromféle** UI-hang | Nem egységes |
| Zene | `img/zephyr-zene.mp3` (5,4 MB) | HTMLAudio | Nagy fájl, nincs halkítás (ducking) beszéd közben |
| Nagypapa, kiáltások | `speechSynthesis` | TTS, csak magyar hanggal | Hang nélkül a Questen hallgathat |

**Fő hiányosságok:** nincs térbeli hang (minden az `outBus` monó buszra megy), nincs alcsatorna és limiter, a hang nem a szél irányából jön, nincs kikötői környezeti hangkép (kötélzet csilingelése az árbocon, móló nyikorgása), nincs eső, nincs motorcsónak/rendezőhajó, a rajtjelzés nem szabályos, a zajpufferek minden híváskor újra generálódnak.

### F.2 Hangarchitektúra (Web Audio API)
```
AudioContext
 ├─ busz: AMB  (környezet: szél, víz, kikötő)        −20 dB
 ├─ busz: BOAT (hajó: csapkodás, csörlő, hullám)      −14 dB
 ├─ busz: RACE (kürtök, rajt, kiáltások)              −10 dB
 ├─ busz: UI   (gombok, figyelmeztetés)               −16 dB, szünetben is szól
 ├─ busz: VOX  (nagypapa, legénység)                   −8 dB  → ducking: AMB/BOAT −8 dB beszéd közben
 └─ busz: MUS  (zene)                                 −22 dB, futamban alapból ki
      ↓
 DynamicsCompressor (limiter: threshold −6 dB, ratio 12, attack 3 ms) → destination
```
- **Térbeli hangzás:** `PannerNode` `panningModel: "HRTF"`, `distanceModel: "inverse"`, `refDistance` 5 m (kürt: 20 m), `rolloffFactor` 1. Az `AudioListener` (vagy a `ctx.listener`) pozíciója és orientációja **minden képkockán** a fejpózból frissüljön. three.js-ben: `THREE.AudioListener` a kamerára, `THREE.PositionalAudio` a rendezőhajóra, a bójákra és a riválisokra – így ez automatikus.
- **Szél a fülön (kiemelt javaslat):** két zajforrás (rózsaszín + barna), egy `StereoPannerNode`/`PannerNode` a **látszólagos szél irányába, a fejhez képest**. Amikor a vitorlázó szél felé fordítja a fejét, a zaj egyenletes lesz mindkét fülön – a valóságban is így „néznek szelet” a versenyzők. Hangerő: `~ aws^1.5`; rohamnál +3 dB és felfelé tolt szűrő.
- **Hullámzaj:** barna zaj + alulszűrő (300–600 Hz), a frekvencia a hajósebességgel nő; a hajótest „hasítása” orrhullám-sziszegés sávszűrővel (1,2–2,5 kHz), sebességfüggő.

### F.3 UI-hangkészlet (egységes)
| Esemény | Hang | Hossz | Szint |
|---|---|---|---|
| Rámutatás | 1 kHz-es szinuszpattintás, gyors lecsengéssel | 25 ms | −30 dB |
| Megnyomás | 2 rétegű „fa-klikk” (zajlöket 3 kHz + 600 Hz szinusz) | 50 ms | −20 dB |
| Vissza/zárás | lefelé csúszó kéthang (660 → 440 Hz) | 120 ms | −22 dB |
| Siker (bója megkerülve) | hármashangzat felfelé (C–E–G, harang-jelleg) | 350 ms | −16 dB |
| Figyelmeztetés | két rövid, mély hang (330 Hz ×2) | 2×100 ms | −14 dB |
| Hiba / büntetés | disszonáns, mély „bú” + piros villanás | 300 ms | −14 dB |
Mind előre renderelve `AudioBuffer`-be indításkor (egyszer), lejátszáskor csak `BufferSource` kell.

### F.4 Versenyhangok – rajtjelzési procedúra (RRS 26)
- **Valódi rend:** 5 perc = figyelmeztető jel (osztályzászló fel, 1 hangjel); 4 perc = előkészítő jel (P / I / Z / U / fekete zászló fel, 1 hangjel); 1 perc = előkészítő zászló le (**1 hosszú** hangjel); 0 = rajt (osztályzászló le, 1 hangjel). Egyéni visszahívás: **X lobogó + 1 hangjel**; általános visszahívás: **első helyettesítő + 2 hangjel**. Befutó: rövid hangjel minden beérkezőnek.
- **Javaslat a játékba:**
  - „Valódi” mód: 5-4-1-0 valós időben (oktatásra és a tulajdonos versenyzői igényéhez).
  - „Rövid” mód (alapértelmezett): a 0:50-es időtartamra arányosan összenyomva **ugyanazokkal a jelzésekkel** (pl. 50 – 40 – 10 – 0 mp), a zászlók (`S.cb.userData.flags`) a jelzéssel együtt mozognak.
  - Az utolsó 10 mp-et ne sípolás jelezze (az nem szabályos), hanem a műszer nagy visszaszámlálása + halk óra-kattanás a UI-buszon (ez csak segítség, nem jelzés).
  - A kürt a **rendezőhajóról** szóljon térben, a hang késésével (343 m/s): 200 m-en ~0,6 mp. Ez tanítja, hogy a zászló a mérvadó, nem a hang.
- **Kürt hangszíne:** 2 enyhén elhangolt fűrészfog + formánsszűrő (sáváteresztő 450 és 1 100 Hz-en), kis légzésszerű amplitúdó-ingadozás, visszhang a part felől (`ConvolverNode`, rövid, 0,8 s-os impulzus).
- **Kiáltások** („Bekbord!”, „Hely a bójánál!”, „Protest!”): felvett emberi hang, 3 változat, térben a rivális hajóról.

### F.5 Környezeti hangok
| Helyszín | Rétegek |
|---|---|
| Nyílt víz | szél (irányos), hullám a testen, kötélzet-süvítés (> 15 csomó), sirályok (térben, ritkán), távoli motorcsónak (Doppler) |
| Kikötő | **kötél csapkodása az alumínium árbocon** („ting-ting” – a kikötők legjellegzetesebb hangja), móló nyikorgása, víz csobogása a cölöpökön, távoli beszéd, kacsák |
| Oktatóház | belső tér (zengés `ConvolverNode`), tűz pattogása, falióra, a nagypapa hangja térben a figurától |
| Éjszaka | tücskök (megvan), távoli zene a partról, viharjelző lámpa (hangtalan), mennydörgés a villámhoz képest távolságfüggő késéssel |
| Eső | szélesebb sávú zaj a fedélzeten (fa és vászon), cseppek a vitorlán (szemcsés, 2–4 kHz) |

**Procedurális vagy felvett?** A szél, a víz és a kötélzet maradhat procedurális (paraméterezhető, kis méret). A sirály, a kacsa, a kürt-visszhang, az emberi hang, a móló és a kikötői csilingelés felvételből jobb. **Licencmentes források:** Freesound.org (csak **CC0** szűrővel), Sonniss GDC Game Audio Bundle (jogdíjmentes, kereskedelmi célra is), BBC Sound Effects (RemArc – **csak nem kereskedelmi**, a Meta-áruházhoz nem jó!), saját felvétel a zamárdi kikötőben (Zoom H1/H5, 48 kHz – ez a leghitelesebb). Formátum: Opus/WebM 96 kb/s, a hurkoknál 10–20 mp, keresztáttűnéssel.

### F.6 Keverés és hangerőszintek
- A célhangosság a teljes keverésre −16 LUFS (fejhallgató/Quest-hangszóró), a csúcs −1 dBTP.
- A beszéd mindig érthető legyen (ducking: AMB/BOAT −8 dB, 150 ms-os indítás, 600 ms-os lecsengés).
- A beállításokban 4 csúszka: Fő / Környezet / Effektek / Beszéd, valamint „Zene futam közben: ki/be”.

### F.7 Haptika
- **Kézkövetésnél nincs rezgés** – ezt hang és fény pótolja (F.3, D.4).
- **Kontrollernél** (`gamepad.hapticActuators[0].pulse`): a kormányrúd „húzása” erős szélben (0,1–0,25 intenzitás, 30 ms-onként, a luvgierigséggel arányosan), hullámütés (0,4 / 40 ms), rajtjel (0,6 / 120 ms), bója megkerülése (2×0,3 / 60 ms), ütközés (0,9 / 200 ms). Minden hangeseménynek legyen haptikus párja, egy beállítással kikapcsolható.

### F.8 Vizuális effektek
| Effekt | Megvalósítás | Költség |
|---|---|---|
| Permet / fröccsenés | `InstancedMesh` ≤ 150, additív, puha textúra, megnyúlás a sebesség irányába | 1 hívás |
| Nyomvíz | ribbon-mesh, habtextúra, időben fakul | 1 hívás/hajó |
| Orrhullám | 2 kis habék-mesh, sebességgel skálázva | 1 hívás/hajó |
| Fodorvíz (szélroham) | a vízárnyalóban egy rohamtérkép-mintavétel | 0 extra hívás |
| Eső (éjszakai vihar) | 1 500 vonalrészecske a kamerához kötve (`LineSegments`, csúcsárnyaló mozgatja) + cseppfoltok a műszeren | 1–2 hívás |
| Villám | villámág-geometria a távolban (2–3 kocka) + égvillanás (megvan) + távolságfüggő mennydörgés | 1 hívás |
| Bóják éjszaka | villogó pontfény-kártya (Fl 4 s) + tükröződés a vízen (függőleges csík) | 1 hívás |
| Konfetti/tűzijáték a győzelemkor | megvan a sétában – a futamra is: rövid, a befutó bója fölött | 1 hívás |

---

## G) Teljesítmény (mért értékek)

Mérés: `renderer.info` egyetlen 2D képkockán (1400×820 px), SwiftShader. VR-ben multiview nélkül (A-Frame 1.6 / super-three) **a hívásszám szemenként ismétlődik**, tehát a valós szám kb. 2×. A „becsült textúra-MB” az összes anyagban talált textúra képpont × 4 B × 1,33 (mipmap), tömörítetlenül.

| Jelenet | Hívás | Háromszög | Shaderprogram | Fény | Háló / anyag | Textúra (becsült) | Értékelés Quest 2-re |
|---|---|---|---|---|---|---|---|
| Bemutatóterem + varázsló | 80 | 20 e | 18 | 8 | 1 006 / 478 | 151 MB | Jó |
| Kikötői séta | **560** | **398 e** | **57** | 8 | 1 019 / 488 | 151 MB | **Túl sok** |
| Vitorlásiskola (belül) | 97 | 247 e | 61 | 8 | – | 151 MB | Háromszögben határeset, sok a shader |
| Futam, Zephyr, nappal – kisütés előtt | 507 | 330 e | 30 | 8 | 1 414 / 730 | 129 MB | Az első 3 mp-ben akad |
| Futam, Zephyr, nappal – kisütés után | 197 | 308 e | 41 | 8 | 1 514 / 830 | 129 MB | Határeset (VR-ben ~400 hívás) |
| Futam, Zephyr, éjjel, vegyes flotta (kisütés előtt) | 451 | 283 e | 41 | 8 | 1 663 / 812 | 136 MB | Határeset |
| Futam, Finn, kisütés után | 76 | 235 e | **71** | 8 | 1 509 / 846 | 127 MB | A hívás jó, a shaderek száma sok |
| Vitorlás sakk | 385 | **1 042 e** | 23 | 6 | 541 / 181 | 76 MB | **Kritikus** |
| Makett | 207 | 315 e | 57 | 6 | 393 / 236 | 103 MB | Határeset |
| Hullámvasút (asztali „MAX” mód) | 147 | **5 614 e** | 28 | – | – | – | Questen alapból KI (`hvMaxOn`) – a Quest-módot külön kell mérni |

További mérések:
- **Letöltési méret:** `index.html` 1,98 MB + `vilag.js` 1,96 MB tömörítetlenül (minifikálás és Brotli nélkül). Ebből a `05i-balaton-adat.js` 166 KB, a `05bz-csalad.js` 148 KB. A JS-értelmezés Questen ~1–1,5 s → minifikálás (terser) és tömörítés; a nagy adat (Balaton-háló, figurák) bináris (Float32/GLB) formában.
- **Panorámák:** 8192×4096-os JPEG, 5–9 MB/kép; a `img/` mappa összesen ~300 MB.
- **Fényforrások:** 8 egyidejű fény minden anyag shaderjét drágítja – 2-re csökkentve a fragment-költség jelentősen kisebb.
- **Anyagok:** 730–846 különböző anyag futamonként. Anyag-újrahasznosítás (közös gyári függvény gyorsítótárral) a programszámot és a memóriát is csökkenti.
- **Javasolt mérőpont a Questen:** egy rejtett „Teljesítmény” sor a csuklómenüben (fps, képidő, hívás, háromszög, programok) – a `renderer.info` értékeit 1 Hz-en kiírva, illetve a Meta OVR Metrics Tool.

---

## H) Megvalósítási ütemterv

### Gyors nyerések (≈ 1 nap)
1. B.10 házszám (54 → 58, a tulajdonossal egyeztetve), B.11 elavult leírások egy közös `GAMES` szövegforrásból, B.12 a `data-dict` CSS-szelektor.
2. B.13 kilógó lábléc (tördelés), B.14 visszajátszási idő, B.15 szünetben is szóló UI-busz, B.8 `W.kind = null`.
3. B.16 hálószálak (a forgatási sorrend javítása), B.18 mobil fejléc.
4. `vrEnter`: futamban és játékokban framebuffer 1,0, foveation 1,0; a 8K Questen alapból ki.
5. Zajpuffer-gyorsítótár (B.6).
6. A „Nagy kezelőfelület” Questen alapból BE; a műszer kulcsszámai 2× nagyobbak.
7. Rajtjelzés: −50/−40/−10/0 mp, szabályos hangjelek és zászlók (rövid mód).

### Közepes (≈ 1 hét)
1. Dizájnrendszer-tokenek (`ZD` objektum a `01-mag.js`-ben: színek, betűskála szögben, távolságok), a `uiBoard`/`uiFrame`/varázsló/VR-panel közös gomb- és táblakomponensre állítva.
2. Inter 500/700/800 kizárólag, Georgia és 900-as súly ki; `document.fonts.load` a vásznak rajzolása előtt.
3. Egységes ikonkészlet (≈ 30 ikon, SVG → vászon).
4. Hangarchitektúra: buszok, limiter, ducking, HRTF-panner a kürtre, a sirályokra és a riválisokra; „szél a fülön”.
5. UI-hangkészlet (F.3) és kontrolleres haptika (F.7).
6. Sakk: LOD és instancing (1,04 M → < 300 e háromszög); kikötő: kisütés és fénycsökkentés (560 → < 200 hívás).
7. Anyagok előfordítása betöltéskor (`renderer.compile`).
8. Drón-visszajátszás VR-ben asztali makettként (B / A.4).
9. Közvetlen bökés (poke) a műszergombokon és a csuklómenüben; Meta-szabvány teleport.

### Hosszabb távú (2–6 hét)
1. Új vízárnyaló (C.1) + nyomvíz, orrhullám, permet, fodorvíz.
2. Felvett hangok: a nagypapa 24 leckéje, kiáltások, kikötői hangkép (saját felvétel Zamárdiban), eső.
3. Valódi 5-4-1-0 rajtprocedúra oktató móddal; a zászlók és a rendezőhajó-animáció a szabálykönyv szerint.
4. KTX2/Basis textúrák, GLB-modellek (a procedurális geometria egyszeri „kisütése” fájlba), minifikált build, szolgáltatásmunkás (service worker) gyorsítótár.
5. Multiview (OVR_multiview2) – az A-Frame/three újabb verziójára átállva –, ez a hívások CPU-költségét kb. a felére csökkenti.
6. Teljes i18n (a Meta-áruházhoz), adatvédelmi szöveg az online módhoz; Quest-mérés OVR Metrics Toollal minden jelenetben, 72 Hz-es elfogadási kritériummal.
7. Riválisok imposztorai és a part rétegzett sziluettjei.

---

## Képernyőképek és segédfájlok
| Fájl | Tartalom |
|---|---|
| `2d_d_0.png`, `2d_hu_0.png` | 2D főoldal (angol, illetve magyar nyelvű böngésző) |
| `2d_m_0.png`, `crop_mobil_fejlec.png` | Telefonnézet, levágott Menü gomb |
| `2d_hu_menu.png`, `2d_hu_pick.png`, `2d_hu_vrbtn.png` | Menü, VR-játékválasztó (formázatlan szótár-gomb) |
| `2d_hu_zsd_rules.png`, `2d_hu_zsd_dict.png` | Szabályok és szótár |
| `vrpanel_main/world/set/help/places.png` | A séta VR-panelének vásznai |
| `hb_0_hud.png`, `hb_wz1–4.png`, `hb_acct.png` | Bemutatóterem, menüvarázsló, regisztráció |
| `crop_wz2_chipek.png`, `crop_wz4_lablec.png` | Apró csipek, kilógó lábléc |
| `hb_walk*.png` | Kikötői séta |
| `sch_0/2/16/out.png`, `crop_sch2_*.png` | Vitorlásiskola, hálószál-hiba, falrések |
| `r_pre_hud.png`, `r_pre.png`, `r_pod.png`, `r_look1–3.png`, `r_start.png` | Nappali futam, műszer, körbenézés |
| `r_pause.png`, `r_menu.png`, `r_fin.png`, `r_replay.png` | Szünet, versenymenü, visszajátszás (negatív idő) |
| `e_pre.png`, `e_look1–4.png`, `e_results.png`, `crop_eredmeny_lablec.png` | Éjszakai futam, eredmény-tájékoztató |
| `n_pre.png`, `n_pod.png`, `n_look*.png` | Finn, 2D üldözőkamera, víz közelről |
| `g_chess*.png`, `g_coaster*.png`, `g_maquette*.png` | Sakk, hullámvasút (átlógó gerenda), makett |
| `gm_race/mahj/ring/duck/slot.png`, `hub.png` | 2D stégjátékok, `?jatek` központ |
| `p2d.js`, `p2m.js`, `vr1.js`–`vr5.js`, `leak.js` | A mérő- és bejáró szkriptek |
