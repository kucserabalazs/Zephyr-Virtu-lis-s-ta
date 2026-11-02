# Zephyr – éjszakai feladatcsomag („start”)

Ha a tulajdonos egy új munkamenetben azt írja: **start**, ezt a fájlt kell végrehajtani elejétől a végéig, **kérdezés nélkül** (a tulajdonos alszik, nem tud jóváhagyni). Döntési helyzetben a legésszerűbb megoldást választani, és a végén összefoglalni, mi mellett döntöttél. Mindig magyarul. Előbb olvasd el a `FOLYTATAS.md`-t (főleg a 21–22. pontot).

## Források és célhelyek
- 360°-os mesterfelvételek (DJI Osmo 360, 15520 × 7760): `/Users/kucserabalazs/Pictures/Zephyr Apartman  Osmo 360 mastercop VR` (két szóköz az „Apartman” után). Apartmanmappák + `Zephyr Apartman Grillterasz` + `Út a privát stéghez` + `összes lakás rajza.pdf`.
- Repó: `kucserabalazs/Zephyr-Virtu-lis-s-ta` (helyi másolat a Mac-en: `~/Documents/GitHub/Zephyr-Virtu-lis-s-ta`). A séta: `weboldal/virtualis-seta/` (forrás: `forras/virtualis-seta-forras.html` + `forras/fejlec.txt`, építés: `forras/tools/build.sh`), panorámák: `weboldal/virtualis-seta/img/` (4096×2048 + `-t` bélyegkép).
- Kész fájlok másolata mindig ide is: `/Users/kucserabalazs/Downloads/BALATONI_UDULES.hu` (új almappa, pl. `VR_2026-11`).
- Ha a munkamenetnek van írási joga a repóhoz: közvetlenül push a `main`-re (kisebb, ellenőrzött commitokban). Ha nincs: a fájlokat a helyi repómásolatba írd (device_commit_files), és a végén írd le, hogy a GitHub Desktoppal kell feltölteni.
- A gép oldali parancsfuttatás (device_bash) 180 mp-es lépésekben megy: a nagy képfeldolgozást kis adagokra bontva, háttérfolyamat nélkül, újraindítható módon (kész fájlt kihagy).

## 1. lépés – Panorámák cseréje a mesterfelvételekre (a 22. pont terve)
- Minden meglévő jelenethez (img/*.jpg, kb. 60) keresd meg a hozzá tartozó mesterfelvételt képösszevetéssel (kicsinyített változatok korrelációja + a fájlnevek). Ellenőrizd az irányt (yaw): ha a mester el van forgatva a mostanihoz képest, vízszintes eltolással igazítsd, hogy a nyilak és feliratok a helyükön maradjanak.
- Kimenet jelenetenként: `id-8k.jpg` (8192×4096, gépre), `id.jpg` (4096×2048, telefonra – a mostani név, hogy minden hivatkozás működjön), `id-t.jpg` (320×160). JPEG ~q82, progresszív.
- Betöltés: először a 4096-os jelenik meg, gépen a 8192-es a háttérben töltődik és észrevétlenül cserél; a szomszédos jelenetek (ahová nyíl mutat) előtöltése. Telefonon (iPhone) 4096 marad. A WebGL max. textúraméretét ellenőrizni (`gl.getParameter(gl.MAX_TEXTURE_SIZE)`); ha < 8192, 4096 marad.
- Új jelenetek: **Grillterasz** (4 felvétel) és **Út a privát stéghez** (8 felvétel) – illeszd be a sétába ésszerű nyilakkal (a kert/grill és a strand/stég útvonalba), a házvázlaton is.

## 2. lépés – Utómunka (minden panorámán, egységesen)
- Világosítás a sötét sarkokban (árnyékok emelése, pl. helyi tónusleképezés/CLAHE a világosságcsatornán, mértékkel).
- Zajszűrés (enyhe, a részletek megtartásával – pl. OpenCV fastNlMeans a sötét részeken, vagy bilaterális).
- Ferde horizont kiegyenesítése (equirect. dőléskorrekció: ha a függőleges élek dőlnek, gömbi forgatás pitch/roll szerint).
- Egységes színek szobáról szobára (fehéregyensúly a falak alapján, közös expozíciós cél).
- Előtte–utána összehasonlító lap néhány jelenetről a BALATONI_UDULES.hu mappába.

## 3. lépés – Lágyabb átmenet a helyszínek között
- Ne villanjon: a nyíl irányába rövid „előrelépés” (enyhe zoom + elmosás), közben áttűnés a következő panorámára (~600–900 ms), a nézési irány megtartásával. A mozgásérzékelő és az ujjas forgatás közben se akadjon.

## 4. lépés – VR mód (WebXR, Meta Quest 2 böngészője)
- „VR” gomb (csak ha `navigator.xr.isSessionSupported('immersive-vr')`). A panoráma körülvesz, fejmozgással körbenézés.
- A piros nyilakra a kontroller sugarával mutatsz rá (kiemelés), **ravasszal** lépsz tovább (ugyanaz a lágy átmenet, VR-ben rövidebb, kíméletes a gyomornak).
- Lebegő panel a kezed ügyében (bal kézhez kötve vagy előtted, gombbal előhívható): helyszínválasztó, házvázlat, apartmanváltó.
- Foglalás: **mindkét út**: (a) „Foglalás” → kilép a VR-ből, és megnyílik a meglévő 2D foglalási ablak; (b) VR-en belüli foglalópanel: dátum, létszám, szabad apartmanok (a meglévő `api/index.php` `availability` / bemutató mód adataiból), és csak a név/e-mail beírásához vált a rendszer billentyűzetére (vagy kilép a 2D űrlapra, ha a VR-billentyűzet nem érhető el).
- Hang: a séta zenéje és a víz hangja **térben** (PositionalAudio / PannerNode), a víz a Balaton irányából.
- Teszt: Chromiumban WebXR-emulációval amennyire lehet (Playwright), és 2D-ben is, hogy semmi ne romoljon el. Valódi Quest-teszt a tulajdonosra marad – írd le neki, mit nézzen meg.

## 5. lépés (ha marad idő) – Kis virtuális világ, a könnyebbtől
1. Stég VR-ben: a stégen állsz, körülötted 3D-ben fut a meglévő vitorlásverseny (bóják, rendezőhajó).
2. Vitorlázás a Zephyrrel: Raptor 27 kokpit piros génuával, kormányzás, Tihany és Badacsony a láthatáron.
3. A ház makettje az alaprajzból, rámutatva belépés az apartman panorámájába.
(4. Fotóból készült 3D tér – új felvételek kellenek, most nem.)

## Befejezéskor
- Minden kész változtatás a GitHubon (vagy a helyi repóban + utasítás a feltöltéshez), letölthető csomag és rövid leírás a `BALATONI_UDULES.hu/VR_2026-11` mappában.
- A `FOLYTATAS.md` frissítése (új pont: mi készült, mi maradt).
- Bemutató oldal frissítése claude.ai artifactként, ha lehetséges.
- Rövid, magyar összefoglaló a tulajdonosnak (nagyobb betűs, könnyen olvasható tagolás): mi kész, mit nézzen meg a Quest 2-n, mi maradt.
