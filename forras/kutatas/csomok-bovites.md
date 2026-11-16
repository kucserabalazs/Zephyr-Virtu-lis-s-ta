# Csomózóház – mivel bővíthető? (vizsgálat és döntés, 2026-11-16 éjjel)

A kérés (hangból, 04:06): „futtass le egy részletes vizsgálatot, hogy milyen csomókkal tudnánk még bővíteni a csomóházat”, majd a ház tartalmának bővítése.
Alap: `csomok.md` (a magyar hajósiskolák vizsgacsomói + nemzetközi alapkészlet + módszertan). Itt csak a hiány-elemzés, a rangsor és a döntés áll.

## 1. Mi van most a játékban
| Lecke | Csomó | Vizsgalista (Hetényi Hajósiskola) |
|---|---|---|
| 1. Kötélvég nyolcas | stopper csomó | I. |
| 2. Reffcsomó – és a kofacsomó | két kötél összekötése; a hibás változat (kofa) is | II. |
| 3. Szorító nyolcas | oszlopra, korlátra | III. |
| 4. Palstek | állóhurok | IV. |
| 5. Kör és két félstek | karikára, bójára | VI. (a „horgonycsomó” közeli rokona, lásd lent) |
| 6. Lekötés bikára | bika | VII. |
| 7. Szövőcsomó | különböző vastag kötelek | (nemzetközi 1. sz.: Ashley) |
| **8. Halászcsomó (ÚJ)** | **két kötél összekötése** | **V.** |
| Feltekerés + díszcsomók | török fej stb. | – |

A falitáblán (nyugati fal) eddig 9 csomó volt (3 × 3); most **10** (5 × 2): a halászcsomó a palstek mellé került, a tábla szélesebb.

## 2. Hiány-elemzés
- A 7 vizsgacsomóból **egyetlen hiányzott: az V. Halászcsomó** – ez a legfontosabb pótlás, mert a vizsgalista és a keleti falon lévő felsorolás is említette, de nem volt hozzá lecke.
- A VI. **Horgonycsomó** a vizsga szerint „kör + félstekek, +1 extra átfűzés, +végzárás nyolcassal” – ezt az 5. lecke (kör és két félstek) lényegében lefedi, de a vizsga nevén nincs külön lecke.
  A teljesen pontos horgonycsomó (a kör alá bújó első félstek + végzáró nyolcas) rajza külön ellenőrzést kér: a források a lépések sorrendjében eltérnek, ezért **nem rajzoltam meg tippre**.

## 3. Jelöltek, rangsorolva (haszon × ellenőrizhetőség)
1. **Halászcsomó** – VÉGLEG KÉSZ (lásd 4.). Vizsgacsomó, mindenki tudja használni (két kötél összekötése), és a rajza szabályokkal ellenőrizhető.
2. **Horgonycsomó külön leckében** (vizsga VI.) – a kör + két félstek és a végzáró nyolcas összekapcsolása. Következő lépés; a lépések sorrendjét egy forrásból (pl. magyar hajósiskolai jegyzet) kell pontosítani.
3. **Dupla halászcsomó** – a halászcsomó biztonságosabb változata (mindkét vég kétszer kerüli meg a másik kötelet). A mostani rajzból levezethető (a gyűrű helyett két menet, 5 kereszteződés), de külön ellenőrzés kell.
4. **Csúsztatott szorító (rolling hitch)** – terhelt kötélre rögzít másik kötelet (pl. csörlőn beszorult sót tehermentesítésére). Haladó, de hajón életmentő.
5. **Csúszó (gyorsan oldható) csomó** – fenderek, reffkötél; a kikötőben mindennapos.
6. **Kötélkezelés**: kötél feltekerése (ez már van a „Feltekerés” leckében), kötélvég-zárás (whipping) – nem csomó, de alapkészség.
7. **Díszcsomók** (majomököl, Carrick-szőnyeg, csengőkötél) – a török fej mellé; nem biztonságtechnikai, a hangulatot erősítené.

## 4. Mit építettem be most és hogyan ellenőriztem
**8. lecke – Halászcsomó – két kötél összekötése** (`05w-csomozohaz.js`, `LX_CSO`; rajz: `KNOT.halasz`; falitábla; áttekintő tábla).
- **A csomó szerkezete:** két egyforma egyszerű csomó. Mindkét kötél a *másik kötél álló szára* körül egy gyűrűt (hurkot) köt, és a saját végét átbújtatja ezen a gyűrűn – ugyanott, ahol a másik kötél is átmegy.
  Meghúzáskor a két csomó egymásnak csúszik és összezár.
- **A rajz szabályai (mindegyik teljesül):**
  - minden egyszerű csomóban 3 önkereszteződés, a kötél mentén váltakozva fent–lent–fent–lent–fent–lent;
  - a másik kötél a gyűrű bal szélénél alatta, a jobb ívénél felette megy el (átbújik a gyűrűn);
  - a vég ugyanígy alatta/felette megy át, a másik kötéllel párhuzamosan, és a gyűrű jobb oldalán kilép;
  - a két csomó egymás tükörképe (180°-os elforgatás a rajz síkjában), a két gyűrű nem ér össze – a horgok sehol sem kereszteződnek feleslegesen.
  Az első változat (egy menet a másik kötél körül, a vég átbújás nélkül) **hibás** volt – nem zár –, ezért elvetettem; a mostani képeket nagyítva néztem végig.
- **Szöveg:** a lecke a halászcsomó lépéseit mondja (egymás mellé a két vég, ellenkező irányba; egyik véggel a másik álló szára körül, vég a saját hurkán át; majd a másikkal ugyanez; két színű kötél, két tenyérnyi szabad szár; végül az álló szárak széthúzása), és a dupla halászcsomót említi biztosabb változatként.
- **Az áttekintő tábla** („Üdvözlés” lecke rajza) 8 csomót mutat (4 × 2), a halász a palstek mellett.

## 5. Ismert korlátok / teendők
- **Hang:** az új lecke szövegéhez NINCS felvett hang (a felvétel a Piper hangmotorral készül, amelynek modellje a Hugging Face-ről töltődik – a fejlesztői környezetből ez nem érhető el). A játék ilyenkor a böngésző magyar hangját használja, a többi lecke a felvett hangon marad.
  Pótlás egy olyan gépen, amely eléri a Hugging Face-t (a Piper hangmodellekkel): `python3 -m http.server 8097 &` → `node forras/tools/leckek_dump.js` → `python3 forras/tools/hangok.py` → `bash forras/tools/build.sh` (a szkript csak a HIÁNYZÓ felvételeket készíti el, a meglévőket nem bántja).
  **A meglévő leckék címét/szövegét ezért nem szabad átírni** (a felvétel a szöveg ujjlenyomatához kötött) – új tartalom csak új leckeként kerülhet be.
- A 3D falitábla csomói sötétebbek a kelleténél a ház fényei miatt (a többi piros–kék csomóval együtt) – ezen nem változtattam (megjelenés: kérés nélkül nem nyúlok hozzá).
- Következő lépések (rangsor szerint): 2., 3., 4. pont fent.
