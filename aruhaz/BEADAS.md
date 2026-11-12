# Zephyr Sailing VR – beadás a Meta Horizon áruházba (előkészítés)

Állapot: 2026-11-12. A játék még fejlesztés alatt áll; ez a lap a későbbi beadás menetét és a már elkészült előkészületeket rögzíti.
A név („Zephyr Sailing VR”) munkacím – a tulajdonos dönt róla.

## Ami a Meta hivatalos oldalai szerint igaz (2026-11-12-én ellenőrizve)
- Böngészős (WebXR) játék telepíthető csomagként beadható: a Meta saját Bubblewrap parancssoros eszköze a webes alkalmazásleírásból (manifest) készít aláírt Android-csomagot. Forrás: developers.meta.com/horizon/documentation/web/pwa-packaging/
- A csomag „immersive” módban közvetlenül VR-be indul; a beállítás a twa-manifest.json `horizonOSAppMode` mezőjébe kerül.
- A csomagnak digitálisan aláírtnak kell lennie; minden későbbi frissítésnek ugyanazt a csomagazonosítót kell használnia.
- A csomagolt játék futás közben a weboldalt tölti be: a tartalom frissítéséhez nem kell új csomagot beadni.
- Az áruház jutaléka 30% (ha nincs más megállapodás); a kifizetés havi, és csak akkor indul, ha az előző hónapban összegyűlt legalább 100 USD. Forrás: developers.meta.com/vr/distribute/publish-account-management-bank-tax/ és a pénzügyi GYIK.
- Belépéskor W-8 (külföldi) adóűrlapot kér a Meta; hibás kitöltésnél amerikai forrásadót vonhatnak le. A bankszámla nevének egyeznie kell a fejlesztői fiók nevével (a leggyakoribb elutasítási ok).
- Beadás előtt a játéknak meg kell felelnie a VRC (Virtual Reality Check) követelményeknek.

NINCS ellenőrizve: a Quest 2 támogatásának kifutási dátuma; a böngészőn belüli vásárlás kedvezményes jutaléka; a Revolut Business elfogadása kifizetési számlaként.

## Ami már elkészült a csomagoláshoz
- Önálló belépési pont: a játék címe végén `?jatek` – saját kezdőképernyő, az apartmanos séta nélkül.
- Webes alkalmazásleírás: `weboldal/virtualis-seta/jatek.webmanifest` (név, leírás, indítócím, ikonok).
- Ikonok: `weboldal/virtualis-seta/img/jatek/ikon-192.png`, `ikon-512.png`.

## Ami még kell a beadásig
1. Végleges név és logó (a tulajdonos döntése).
2. Végleges, saját tárhely és domain a játéknak (most a GitHub-tesztoldalon fut). A csomag ehhez a címhez kötődik.
3. Meta fejlesztői fiók (developers.meta.com/horizon/sign-up) – a tulajdonos hozza létre, a saját nevén, egyéni vállalkozóként; bank- és adóadatok megadása.
4. Csomagolás a Mac-en: Node.js + a Meta Bubblewrap eszköze + Android-aláírókulcs. A kulcsot biztonságosan el kell tenni – nélküle nem lehet frissítést beadni.
5. Kipróbálás a szemüvegen (telepítés a Meta Quest Developer Hubbal), a VRC-lista végigjárása.
6. Áruházi oldal: leírás, képernyőképek, előzetes videó, korhatár-besorolás, adatkezelési nyilatkozat (Data Use Checkup).
7. Beadás ellenőrzésre.

## Áruházi leírás – vázlat
**Zephyr Sailing VR**
Állj egy versenyvitorlás kormányához a Balatonon! A hajót a saját kezeddel kormányzod – botkormánnyal vagy kormánykerékkel –, a szél, a vitorlák és a hajó úgy viselkednek, ahogy a vízen. Rajt a két bója között, cirkálás szél ellen, bójakerülés, spinakker hátszélben, befutó – valódi versenyszabályokkal, útjoggal és büntetőfordulóval.
- Oktató futam kezdőknek: hét lépésben megtanulsz vitorlázni
- Tíz pályatípus, változó szél, három nehézségi szint
- Ötfutamos bajnokság három ellenféllel
- Részletes fedélzeti térképplotter és szélműszer
- Ráadás: vitorlás sakk a naplementés Balatonon és balatoni hullámvasút
Készítette egy ötszörös magyar bajnok vitorlázó és utánpótlás-edző.
