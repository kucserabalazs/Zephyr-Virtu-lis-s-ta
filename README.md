# Zephyr Apartman – weboldal, virtuális séta, foglalási rendszer

**Új munkamenet elején olvasd el: [FOLYTATAS.md](FOLYTATAS.md)** – a projekt teljes állása és a folytatás menete.

Zephyr Apartmanház, 8621 Zamárdi, Gáspár András utca 58. · balatoni-udules.hu

## Kezdőfelület
A munka mindig az új **kezdőoldalról** indul: `weboldal/uj/index.html`.
A tároló gyökerében lévő `index.html` ide irányít, így GitHub Pages-en a repó címe egyből a kezdőoldalt nyitja meg;
onnan érhető el a virtuális séta (`weboldal/virtualis-seta/`), a foglalás és a tulajdonosi felület.
(GitHub Pages-en a foglalás és a programok bemutató módban futnak – élesben csak a PHP-s tárhelyen működnek.)

## Mappák
- `weboldal/` – **ez kerül fel a tárhelyre** (FileZilla), a fő mappába:
  - `virtualis-seta/` – 360°-os virtuális séta forgatható kockával, foglalási ablakkal (`index.html`, `img/`)
  - `virtualis-seta/api/index.php` – foglalás, tulajdonosi felület, naptárszinkron (Szállás.hu, Airbnb, Google), programok, viharjelzés
  - `uj/` – az új kezdőoldal (balatoni-udules.hu/uj/)
- `forras/` – szerkesztési forrásfájlok és segédprogramok (kezdőoldal összeállítása, 360°-ból fotó készítése)
- `dokumentacio/` – állapotleírás, feltöltési útmutató

## Biztonság
A szerveren az `api/data/` mappa tárolja a foglalásokat és a vendégadatokat – ez szándékosan nincs a tárolóban.
