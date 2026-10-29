# Zephyr Apartman – weboldal, virtuális séta, foglalási rendszer

Zephyr Apartmanház, 8621 Zamárdi, Gáspár András utca 58. · balatoni-udules.hu

## Mappák
- `weboldal/` – **ez kerül fel a tárhelyre** (FileZilla), a fő mappába:
  - `virtualis-seta/` – 360°-os virtuális séta forgatható kockával, foglalási ablakkal (`index.html`, `img/`)
  - `virtualis-seta/api/index.php` – foglalás, tulajdonosi felület, naptárszinkron (Szállás.hu, Airbnb, Google), programok, viharjelzés
  - `uj/` – az új kezdőoldal (balatoni-udules.hu/uj/)
- `forras/` – szerkesztési forrásfájlok és segédprogramok (kezdőoldal összeállítása, 360°-ból fotó készítése)
- `dokumentacio/` – állapotleírás, feltöltési útmutató

## Biztonság
A szerveren az `api/data/` mappa tárolja a foglalásokat és a vendégadatokat – ez szándékosan nincs a tárolóban.
