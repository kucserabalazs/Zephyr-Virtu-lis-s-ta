# Zephyr Apartman – a projekt állása és folytatási útmutató

Utolsó mentés: 2026. október 30. · Ezt a fájlt olvasd el először egy új munkamenet elején.

## 1. Mi ez a projekt?
A Zephyr Apartmanház (8621 Zamárdi, Gáspár András utca 58., tulajdonos: Kucsera Balázs) weboldalának megújítása:
- **360°-os virtuális séta** (A-Frame), 3D-s forgatható üveg téglatesttel a bal felső sarokban;
- **saját foglalási rendszer** tulajdonosi felülettel (nem WordPress), naptárszinkronnal (Szállás.hu – elsődleges, Airbnb, Google);
- **új kezdőoldal** (drónvideós nyitókép, apartmanok, szolgáltatások, rendezvények, látnivalók, biztonság);
- **programajánló-kezelő** a tulajdonosi felület „Programok” fülén.

**2026. okt. 29-től a fejlesztés kizárólag a GitHubon folyik; a balatoni-udules.hu-t (régi WordPress-oldal, ELIN.hu tárhely) már nem használjuk.** Az oldalt a GitHub Pages-en nézzük. Függőségek, amelyeket ki kell váltani: a látnivalók képei még a régi oldalról jönnek (`/wp-content/uploads/…` – Pages-en nem töltődnek be), a „Bővebben” linkek a régi oldal aloldalaira mutatnak, és a foglalási/programkezelő PHP (`api/index.php`) Pages-en nem fut (ott bemutató mód).

## 2. Munkamódszer (a tulajdonos kérései)
- Mindig **magyarul**.
- A letöltendő fájlokat mindig **közvetlenül a beszélgetésbe** kell küldeni.
- **Minden módosítás a GitHubra kerül** (ez a repó), és onnan nézzük (GitHub Pages). A balatoni-udules.hu-t már nem használjuk.
- A munka **mindig a kezdőoldalról indul** – az a kezdőfelület (`weboldal/uj/`).
- A kocka kinézetének etalonja a tulajdonos mintaképe (üveg téglatest, sötétkék panelek, UTCA / MAP / BACK / HOME).

## 3. Mappák
| Hely | Tartalom |
|---|---|
| `index.html` | átirányít a kezdőoldalra (GitHub Pages-hez) |
| `weboldal/uj/` | **új kezdőoldal** (`index.html`, `img/galeria`, `img/szolg`, `img/hero*.jpg`, `video/` – ide jön a `dron.mp4`) |
| `weboldal/virtualis-seta/` | **virtuális séta** (`index.html`, `img/` – 360°-os képek, logó, zene) |
| `weboldal/virtualis-seta/api/index.php` | foglalás, tulajdonosi felület, naptárszinkron, programok, viharjelzés (PHP 7.4+, adatbázis nélkül) |
| `forras/virtualis-seta-forras.html` | a séta forrása fejléc nélkül (ebből készül a `weboldal/virtualis-seta/index.html`: `fejlec.txt` + forrás) |
| `forras/kezdooldal-forras.html` | a kezdőoldal forrása (a foglalási ablakot és a tulajdonosi felületet a `tools/build_home.py` másolja bele a séta forrásából) |
| `forras/tools/` | `build_home.py` (kezdőoldal összeállítása), `persp.py` (360°-os képből hagyományos fotó) |
| `forras/tesztek/` | Playwright-tesztek (jelszó a `ZEPHYR_PW` környezeti változóból) |
| `dokumentacio/allapot.md` | verziónként részletes változásnapló (jelenleg 353.) |
| `dokumentacio/FELTOLTES.txt` | feltöltési útmutató a tárhelyre |
| `archivum/` | az elvetett WordPress-bővítmény (nem használjuk) |

A szerveren keletkező `api/data/` mappa (foglalások, vendégadatok, jelszó) **szándékosan nincs** a repóban.

## 4. Összeállítás (build)
A munkakönyvtárban (a repó gyökeréből futtatva a megfelelő útvonalakkal):
1. Séta: `weboldal/virtualis-seta/index.html` = `forras/fejlec.txt` + `forras/virtualis-seta-forras.html`.
2. Kezdőoldal: `python3 forras/tools/build_home.py` – a séta forrásából kivágja a foglalási/tulajdonosi CSS-t és a JS-t, és beilleszti a kezdőoldal forrásába (`<!--ZEPHYR-BOOKING-CSS-->`, `<!--ZEPHYR-BOOKING-JS-->`); a fájl elején lévő útvonalakat szükség szerint igazítsd.
3. Fotók 360°-ból: `python3 forras/tools/persp.py <panoráma.jpg> <irány 0–1> <kimenet.jpg>`.

## 5. Tesztelés
- Helyi szerver: `php -S 127.0.0.1:8096 -t <mappa, benne virtualis-seta és uj>`.
- Böngésző: Playwright + Chromium. A 3D-hez: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, és az A-Frame-et helyben kell kiszolgálni (a CDN a munkakörnyezetből nem érhető el): `git clone --depth 1 --branch v1.6.0 --filter=blob:none --sparse https://github.com/aframevr/aframe` → `git sparse-checkout set dist`, majd a tesztben `route(/aframe.*\.js$/)` → `dist/aframe-master.min.js`.

## 6. A virtuális séta – fő elemek
- **Üveg téglatest (bal felül)** – valódi 3D (WebGL, a séta THREE-motorja): lekerekített élű, illesztés nélküli üvegtömb (1,6 × 1,0 × 1,6), Fresnel-peremfény, tükrözi az aktuális panorámát; benne vászonra rajzolt panelek. Nyugalomban áll (nincs csillogás), térben elfordítva (26°) és felülről nézve (14°). **Induláskor a BACK lap néz felénk, balra keskenyen a MAP** (a tulajdonos 6. referenciaképe, okt. 29.). Prémium üveghatás: tisztább üveg, szélesebb átlátszó üvegkeret a panelek körül, Fresnel-perem + csúcsfények a lekerekített éleken (bal felül fehér, jobb alul kékes), mélykék panelek íves fénytükröződéssel és belső peremfénnyel, a tetején nyugalomban is látszik a SETTINGS panel, alatta lágy, többrétegű lebegő árnyék. Ha nincs WebGL: CSS-es tartalék kocka.
  - Oldalak: **1** helyszín (piros egységnév + fehér helyszínnév), **2 MAP** (házvázlat ki/be), **3 BACK** (bejárt helyek visszafelé; ha a kezdőlapról jött és elfogyott: vissza a kezdőlapra), **4 HOME** (`../uj/`), **5 SETTINGS** (teteje: minden eszközön a teljes **Beállítások** üvegpanel – zene, hangerő, némítás, nézet, alaprajz, körbenézés, mozgásérzékelés, teljes képernyő, foglalás; `openSettings`), **6 INVENTORY** (alja: az aktuális apartman eszközjegyzéke; máshol apartmanválasztó). **Az eszközjegyzék csak innen érhető el** – a konyhapulti mappa-jelek 2026. okt. 29-én kikerültek az apartmanokból.
  - **Javítva (okt. 30.):** helyszínváltáskor a `cube3d.plate()` tévesen a SETTINGS lap vásznára (a `panels[0]`-ra) rajzolta a helyszínfeliratot – ezért csúszott össze a SETTINGS és az útjelzés. Most a `f === 1` panelt keresi meg.
  - Kezelés: vízszintes húzás = forgatás; függőleges húzás = teteje/alja; rövid koppintás = a felénk néző lap funkciója; a bal keskeny lapra koppintva odafordul; egérgörgő, ← → ↑ ↓, Enter. Mozgásküszöb: egér 6 px, ujj 11 px.
  - `?honnan=kezdolap` (vagy a kezdőlapról jövő hivatkozó): a BACK lap a kezdőlapra visz vissza, ha a bejárt helyek elfogytak.
- Eszközjegyzék („kapitányi napló” megjelenés, okt. 29.): bőrborító arany kötélkerettel, horgony-embléma, viaszpecsét, réz sarkok; pergamenlapok tengeri térképráccsal; jelzőzászló-fülek; minden tétel rézkeretes hajóablakban, beúszó animációval; bemutató hajóablak-keretben, fa táblácskával. (A 12 nyelv és a házirend a végén még NINCS megcsinálva – a házirend szövege kell a tulajdonostól.) Kadett zárva (privát), események (polip, vihar, Titanic, gőzös, kajak, mentés stb.), regatta, telefonos ☰ menü, teljes képernyős telefonos térkép saját nagyítással.

## 6/b Stégtúra és stégjátékok (okt. 29.)
- Stégtúra: kidolgozott városi kerékpár saját szemszögből (krómkormány, bőr markolat, fonott kosár logóval, lámpa, csengő), evezős SUP (EVA-pad, lapát ütemes csapásokkal, oldalváltás 3 csapásonként). Lágy hangok: a kerékpár egyszer csenget (`walking.rung`), a SUP csak ritkán, halkan loccsan; víz-, szél-, kavicshang halkítva.
- Képváltás séta közben: **egybefüggő áttűnés** (`crossTo`, második égbolt-gömb `sky2`), a következő kép előre betöltve (`walking.pre`), nagyítás közben úszik be, sötét villanás nélkül.
- A **Napozóstég** képen jobb felül játékdokk (`stegDock`). A játékok háttere a stég **valódi panorámája** a Balaton felé nézve (`panoBg`: a 360°-os képből egyszer kiszámolt perspektív nézet; `proj`/`unproj` ugyanazzal a kamerával vetít a vízfelszínre, kamera 2,3 m magasan, 7° lefelé). Játékok: **Zephyr nyerőautomata** (félkarú rabló, csak játékpontok, nincs tét), **Pizza a kacsáknak** (koppintásra pici pizza repül a vízre; hattyú 5, tőkés réce 10, szárcsa 15, dankasirály 20, búbos vöcsök 25 pont; eltalált madár megeszi és örül, mellé esett pizzáért a közeli madár odaúszik fél pontért), **Mentőöv-célbadobás** (sodródó bóják), **Vitorlás-regatta** (3D-ből vetített vitorlások legénységgel, nyomhullámmal; 3 gépi ellenfél cirkálással, 2 bója, rajt-/célvonal rendezőhajóval a stég előtt, visszaszámlálás, szélirány, minitérkép, ◀ ▶ kormány). A horgászat és a kacsázás kikerült (okt. 29.).
- **Rejtett ajándék:** aki összesen legalább **10 percet** játszik (csak aktív játékidő; nincs kijelzett számláló, nincs előzetes figyelmeztetés), a játékablak bezárásakor köszönetet és **5% kedvezményt** kap a szállásdíjból (az IFA-t nem érinti), 24 óráig, egy foglalásra: `window.ZephyrGame` (localStorage `zephyr-jatek`; játékidő: `zephyr-jatekido`). A foglalás elküldi a kódot (`game`), a PHP egyszer engedi (`settings.game_used`). Figyelem: a kódot a böngésző állítja ki, technikailag nem ellenőrizhető.
- Pizza a kacsáknak: szintek (60 mp, korlátozott pizza, pontcél), kombószorzó, szintenként gyorsabb madarak; 2. szinttől repülő sirály/csér (röptében elkapja); a madarak nem jönnek 10 m-nél közelebb. Regatta: rendezőhajó (motoros jacht, korlát, flybridge, jelzőárboc versenyzászlókkal – narancs: rajtvonal, „P”: előkészítés, „Z”: futam, kék: cél –, szélzsák, integető hölgy a tatfedélzeten) úgy kerül a vonal végére, hogy a képernyőn ne takarja a bójákat (`placeCommittee`); sorsolt rajthelyek; hajók bólintanak, fordulásnál dőlnek, szembeszélben lobog a vitorla, orrhullám; billegő felfújható versenybóják (`raceMark`); nagyobb széljelző, színe a szél erősségével változik (`windCol`), Beaufort-érték. Pályák sorszám szerint (bóják, szél, lökések), „↻ Újra” ugyanazt a pályát indítja; célba érés után kérdez: újra ezt / tovább a következőre.
- Regatta-szabályok (okt. 29.): minden bója kötelező mindenkinek, és csak **backbord felől (bal kéz felől hagyva), teljesen megkerülve** számít – a hajó szögelfordulását mérjük a bója körül (`CO.legs[i].need`, `b.acc`); rossz oldali kerülésnél üzenet, újra kell kerülni; bójaérintés lassít. A gépi hajók ívet követnek a bója körül (`b.path`), ha nem sikerült, visszafordulnak. **Backbord–steuerbord szabály**: a backbordhalzonon (szél balról) haladó tér ki; ütközésnél a backbordhalzonos 360°-os büntetőkört fordul (`b.pen`), addig nem érhet célba. Gépi hibák: tág vagy túlfutott kerülés (`b.err`), elfelejtett bója és visszafordulás (`b.miss`), késői/elakadt fordulás (`b.lateTack`, `b.stall`), néha nem veszi észre a jobbról jövőt (`b.blind`). Sárga ívelt nyíl és „↺ bal kéz felől” címke a következő bójánál, a minitérképen is.
- Rendezőhajó v3 (okt. 29. este): kisebb (`CMK = .72`), a célvonal most két bója között van (narancs zászlós pin bal, kék zászlós célbója jobb, `±CO.lh`), a rendezőhajó KÍVÜL áll (`placeCommittee`: a pályaszakaszoktól ≥13 m, a képernyőn nem kerülhet bója/pályaszakasz elé; ha mégis hajó/bója van mögötte, áttetszővé válik – `S.cmA`). Négyfős legénység (`person()`): hölgy (csak néha integet: rajtnál, célba érésnél, ~13 mp-enként), bíró távcsővel, jegyzetelő a flybridge-en, zászlós az orrban. Neki lehet menni (`cmCollide`): a hajó megáll, büntetőkör jár, a fedélzeten mindenki elesik, felállnak és szövegbuborékokban mérgelődnek (`GRIPE`, `S.cmHit.age`). A gépi hajók kikerülik. A szélzsák 3D-ben a valódi szélirányba mutat, és a bal felső széljelző nyíl iránya javítva (`rotate(S.wind)`) – a kettő most megegyezik.
- Vitorlák v3: fokozatos belobogás (`laM`, `laJ`) hullámzó vitorlaéllel és gyűrődésekkel, szélben álló hajónál csapkodó bum; telltale-szalagok a génuán; spinakker felhúzása az árbocon, „pukkanó” kinyílás, ívelt panelek, fény-árnyék, éles szögnél becsavarodó széle, spinakkerrúd és kötelek; hátszélben a génua felcsavarva; korlátoszlopok, korlátkötél, orrkorlát, kormányrúd. Ha felénk jön a hajó, a spinakker elöl rajzolódik.
- Ötletek a folytatáshoz: a felhasználó még ellenőrzi a fenti változásokat (rendezőhajó helye telefonon, spinakker megjelenése) – a visszajelzés alapján finomítani.
- **Játékválasztó a játékablakban (okt. 30.):** választás után összecsukódik egy kis gombbá bal felül (`gmMenu`, `.gm-hd.min`: ☰ + a játék neve + ×); koppintásra kinyílik, játékválasztáskor vagy a játéktérre koppintva újra összecsukódik. A játékok felső üzenetei a fejléc tényleges aljához igazodnak (`GM_TOP`).
- **Regatta – magasabb nézőpont (okt. 30.):** `RACE_CAM = { h: 10, pitch: 14 }` – a `camOf(W, H, o)` / `proj` / `unproj` / `panoBg(…, o)` elfogad saját kameramagasságot és dőlést; a háttér-panoráma ugyanazzal a dőléssel készül. A pálya így széthúzódik, a hátsó bója kerülését nem takarják az elöl haladó hajók (15 m-nél a közeli hajók már a stégdeszkákra csúsztak – ezt elvetettük).
- **Vitorlás mahjong (okt. 30., `gameMahj`):** pasziánsz két alakzattal – **Vitorlás** (86 lap, telefonon is kényelmes; alapértelmezett) és **Teknős** (144 lap; álló képernyőn elforgatva rakja ki). Lapok vászonra rajzolva: kötélkarikák 1–9, vitorlások 1–9, római számok piros hullámmal 1–9, iránytű (É, K, D, NY), horgony, kormánykerék, világítótorony, jelzőzászlók A/B/K/N (egymással párosíthatók), Zephyr-hajók DINGI/KORVETT/FREGATT/SCHOONER (egymással). Az osztás mindig megoldható (`deal`: a teli tábláról szabad helyeket párosít visszafelé); Tipp (+10 mp), Vissza, Keverés (megoldható újraosztás a maradékra), Új játék; elakadásnál felajánlja a keverést; győzelemkor zászlókonfetti, legjobb idő alakzatonként (`localStorage zephyr-mahjong`). Tesztkapcsoló: `window.__zephyrTest = {}` betöltés előtt → `__zephyrTest.mahj.S`.
- Foglalási ablak: „‹ Vissza” gomb a fejlécben minden lépésben, és a böngésző/telefon vissza-mozdulata is bezárja – oda tér vissza, ahonnan megnyitották (`ZephyrBooking.open({ back })`).

## 7. Foglalási rendszer (`api/index.php`)
- Útvonalak `?r=`: config, availability, book, login, logout, me, bookings, action, manual, save_settings, password, test_mail, sync, cron, ical, **events, events_all, events_save, vihar**.
- Tulajdonosi felület: a Foglalás ablak „Admin” kártyája, a kezdőoldal lábléce („Tulajdonosi belépés”) vagy `…/virtualis-seta/#foglalas-admin`. Fülek: Foglalások, Naptár, Zárolás, **Programok**, Beállítások.
- Első belépés: ideiglenes jelszó (a tulajdonos ismeri) – **első belépés után cserélni kell** (Beállítások alja).
- Szezonális alapárak: 05.15–06.18 / 06.19–06.30 / 07.01–08.22 / 08.23–08.31 / 09.01–09.19 / 09.20–10.15 (apartmanonként).
- **Több apartman egy foglalásban** (közös időszak, okt. 29.): a vendég több apartmant jelöl ki, a naptár csak ott szabad, ahol mind szabad, a napi ár összeadódik, a létszám automatikusan oszlik el (minden apartmanba legalább 1 felnőtt). A szerver apartmanonként külön foglalást hoz létre közös csoportazonosítóval (`group`, `ZG-…`), egy összesítő e-mailt küld; jóváhagyni apartmanonként kell.
- **Szállás.hu az elsődleges naptár**: a Szállás.hu/Airbnb foglalás nem írható felül, csak törölhető külön figyelmeztetéssel; ütköző saját foglalás piros jelzést kap, nem hagyható jóvá.
- IFA 600 Ft/fő/éj (18+), előleg átutalással; külföldi utalás (IBAN, SWIFT); SZÉP: OTP SZK/2022/002754, MBH S14598, K&H 84059114; NTAK: MA22033593 / MA22033128.
- Bankszámlaadatokat a tulajdonos még nem adta meg (a régi oldal láblécében K&H 10402427-50526955-87681005 szerepel).

## 8. Kezdőoldal (`weboldal/uj/`)
Nyitókép (drónvideó: `video/dron.mp4`, addig állókép; **alján a séta vitorlásversenye**, hang nélkül – a `build_home.py` másolja át a séta `regatta` függvényét), animált „Zephyr Apartman · Zamárdi · Isten hozta!”; Apartmanok (6 kártya, galéria „Virtuális séta ide” gombbal, Kadett: nem kiadó); Szolgáltatások (kerékpár, SUP, grill & bográcsozás, privát stég – a `SERVICES` tömbben bővíthető képpel/videóval); Rendezvények (API-ból, kategóriaszűrő, jegy/bővebben); Helyi szépségek (9 látnivaló a régi oldalról); Biztonság (112, vízimentők +36 30 383 8383, 1817, élő HungaroMet-viharjelzés a keleti medencére, Open-Meteo előrejelzés, „Ki meddig mehet be?” ábra, zamárdi mederárok, mentőmellény, orvos/fogorvos/gyógyszertár/állatorvos/vízirendészet); lábléc. Foglalás és tulajdonosi felület a kezdőoldalon is.

## 9. Elérhetőségek
- Repó: https://github.com/kucserabalazs/Zephyr-Virtu-lis-s-ta (privát; átnevezés **Zephyr-Apartman**-ra a tulajdonosnál: Settings → Repository name).
- GitHub Pages (ha a tulajdonos bekapcsolja: Settings → Pages → main / root): `https://kucserabalazs.github.io/Zephyr-Virtu-lis-s-ta/` → kezdőoldal. Privát repóhoz Pro előfizetés kell, vagy nyilvánossá tétel. Pages-en a foglalás és a programok bemutató módban futnak.
- Bemutató oldalak (claude.ai): kezdőoldal – https://claude.ai/artifact/MarcoyQiN2vBjunbMeAjpw · séta – https://claude.ai/artifact/SMR1LuVh1U2VLuCgzJY9oD
- ~~Éles tárhely: balatoni-udules.hu~~ – 2026. okt. 29-től nem használjuk.

## 10. Nyitott kérdések / következő lépések
1. A drónvideó, további szolgáltatás-fotók/videók, rendezvénylista, Kadett-fotók – a tulajdonostól.
2. A régi oldalon 5. apartmanként **JOLLE** szerepel, a sétában/foglalásban Schooner az 5. és Kadett a 6. – tisztázandó.
3. Airbnb-link; kell-e a Twitter.
4. GitHub Pages bekapcsolása és a repó átnevezése (tulajdonos).
5. A régi WordPress-oldal anyagának (XML-export + `wp-content/uploads`) teljes átemelése – később.
6. A régi oldaltól való függések kiváltása (látnivaló-képek a repóba, „Bővebben” linkek), és döntés arról, hol fusson a valódi foglalás/programkezelés, mert a GitHub Pages PHP-t nem futtat.
7. A korábban beküldött GitHub-tokent a tulajdonosnak vissza kell vonnia (nincs és nem is kell használni).
