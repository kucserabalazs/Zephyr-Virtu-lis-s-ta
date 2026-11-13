# Ökölvezérlés – gépi próbák (VR vitorlásverseny, `forras/vilag/05b-vr-verseny.js`)

A kézkövetést a szemüveg nélkül is lehet utánozni. Két szint:

1. **`szim.js` + `ellenor.js`** – a világ `W.tick`-jét kézzel hajtjuk (36 / 72 / 90 Hz), a `ZephyrTour.xr.src`-be kitalált kézadatot teszünk
   (tenyérközép + ujjhegyek: ököl / laza / nyitott kéz, csippentés, „régi adat”, eltűnő kéz). 33 eset: álló ököl dőlés és csapásváltás közben,
   követési zaj, tüske, ugrás, kimaradás, két ököl, pihenő / zajos másik kéz, elernyedő és nyíló kéz, menü-csippentés, lassú és gyors kormányzás, késés.
2. **`vr-emulator.js`** – a valódi VR-útvonal: Meta IWER WebXR-emulátor (Quest 2, kézkövetés), a séta saját `xrTick`-je adja a kéz adatait;
   ökölhöz a `ZephyrTour.xr.fakeJ` ad ujjhelyzetet (az emulátor nem tud öklöt). Lassú (szoftveres rajzolás), kb. 2 perc.

## Futtatás (a munkakörnyezetben)

```bash
bash forras/tools/build.sh                         # előbb mindig építeni
(cd weboldal && python3 -m http.server 8765 &)     # a kész oldal kiszolgálása
cd forras/tools/okol-teszt && npm i aframe@1.6.0 iwer   # a Playwright és a Chromium előre telepítve van
for c in "kerek 72" "kerek 36" "kerek 90" "rud 72"; do node szim.js 8765 $c > ki.json; node ellenor.js ki.json; done   # „MIND RENDBEN (33 próba)”
node vr-emulator.js                                # eredmény: álló ököl 0%, jobbra +40%, vissza 0, balra −40%, nyitott kéz nem kormányoz
```

Az A-Frame a CDN-ről nem töltődik be a munkakörnyezetben, ezért a `boot.js` a helyben telepített példányt adja a lapnak (`page.route`).
A `node_modules` mappát NEM kell a repóba tenni.
