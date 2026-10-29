# Zephyr Apartman – a projekt állása és folytatási útmutató

Utolsó mentés: 2026. október 29. · Ezt a fájlt olvasd el először egy új munkamenet elején.

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
  - Oldalak: **1** helyszín (piros egységnév + fehér helyszínnév), **2 MAP** (házvázlat ki/be), **3 BACK** (bejárt helyek visszafelé; ha a kezdőlapról jött és elfogyott: vissza a kezdőlapra), **4 HOME** (`../uj/`), **5 SETTINGS** (teteje: telefonon beállítás-menü, gépen a gombsor kiemelése + nézetválasztó), **6 INVENTORY** (alja: az aktuális apartman eszközjegyzéke / mappája; máshol apartmanválasztó).
  - Kezelés: vízszintes húzás = forgatás; függőleges húzás = teteje/alja; rövid koppintás = a felénk néző lap funkciója; a bal keskeny lapra koppintva odafordul; egérgörgő, ← → ↑ ↓, Enter. Mozgásküszöb: egér 6 px, ujj 11 px.
  - `?honnan=kezdolap` (vagy a kezdőlapról jövő hivatkozó): a BACK lap a kezdőlapra visz vissza, ha a bejárt helyek elfogytak.
- Apartman-mappa (eszközjegyzék, 12 nyelv, házirend a végén), Kadett zárva (privát), események (polip, vihar, Titanic, gőzös, kajak, mentés stb.), regatta, telefonos ☰ menü, teljes képernyős telefonos térkép saját nagyítással.

## 7. Foglalási rendszer (`api/index.php`)
- Útvonalak `?r=`: config, availability, book, login, logout, me, bookings, action, manual, save_settings, password, test_mail, sync, cron, ical, **events, events_all, events_save, vihar**.
- Tulajdonosi felület: a Foglalás ablak „Admin” kártyája, a kezdőoldal lábléce („Tulajdonosi belépés”) vagy `…/virtualis-seta/#foglalas-admin`. Fülek: Foglalások, Naptár, Zárolás, **Programok**, Beállítások.
- Első belépés: ideiglenes jelszó (a tulajdonos ismeri) – **első belépés után cserélni kell** (Beállítások alja).
- Szezonális alapárak: 05.15–06.18 / 06.19–06.30 / 07.01–08.22 / 08.23–08.31 / 09.01–09.19 / 09.20–10.15 (apartmanonként).
- **Szállás.hu az elsődleges naptár**: a Szállás.hu/Airbnb foglalás nem írható felül, csak törölhető külön figyelmeztetéssel; ütköző saját foglalás piros jelzést kap, nem hagyható jóvá.
- IFA 600 Ft/fő/éj (18+), előleg átutalással; külföldi utalás (IBAN, SWIFT); SZÉP: OTP SZK/2022/002754, MBH S14598, K&H 84059114; NTAK: MA22033593 / MA22033128.
- Bankszámlaadatokat a tulajdonos még nem adta meg (a régi oldal láblécében K&H 10402427-50526955-87681005 szerepel).

## 8. Kezdőoldal (`weboldal/uj/`)
Nyitókép (drónvideó: `video/dron.mp4`, addig állókép), animált „Zephyr Apartman · Zamárdi · Isten hozta!”; Apartmanok (6 kártya, galéria „Virtuális séta ide” gombbal, Kadett: nem kiadó); Szolgáltatások (kerékpár, SUP, grill & bográcsozás, privát stég – a `SERVICES` tömbben bővíthető képpel/videóval); Rendezvények (API-ból, kategóriaszűrő, jegy/bővebben); Helyi szépségek (9 látnivaló a régi oldalról); Biztonság (112, vízimentők +36 30 383 8383, 1817, élő HungaroMet-viharjelzés a keleti medencére, Open-Meteo előrejelzés, „Ki meddig mehet be?” ábra, zamárdi mederárok, mentőmellény, orvos/fogorvos/gyógyszertár/állatorvos/vízirendészet); lábléc. Foglalás és tulajdonosi felület a kezdőoldalon is.

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
