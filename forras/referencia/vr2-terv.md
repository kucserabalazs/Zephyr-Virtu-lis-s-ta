# Zephyr VR 2.0 – az újratervezés alapja (2026. nov. 9.)

A mentés a régiről: GitHub ág `mentes-regi-vr-2026-11-09`.

## A tulajdonos kérése (szó szerint összefoglalva)
- Mindent újra – a VR-sétát, a makettet, a 3D-világokat ÉS a fő oldalt (kezdőoldal + telefonos/gépes séta) –, a ChatGPT-vel közösen, „világszínvonalú, díjnyertes” részletességgel.
- A régi VR-ben roppant zavaró volt:
  - a jelzések MINDENT betakartak; a nyilak és feliratok csúnyák voltak;
  - a nyilak SOHA nem arra álltak, amerre kellett;
  - oda- és visszaútnál a nézőpont nem követte a haladás irányát (visszafelé ugyanabba a szögbe néztél, mint odafelé) – OK: VR-ben a faceTo() semmit sem csinált;
  - a jelzések helye és mérete sem volt jó.
- A belépési díszes (mesebeli) kapukat törölni kell – rondák.
- A forgás kényelmetlen, nem praktikus, nem korszerű.
- A csuklóóra-menü nem működött jól.
- Makett: a hátsó parkolóban 4 autó egymás mellett, mind úgy, mint a fotón a fehér terepjáró (KÉSZ: f8e3062).

## Állandó elvárások (korábbi munkákból)
- Csak kézkövetés (Quest 2, kontroller nélkül); a tulajdonos rosszul lát → nagy betűk, nagy célpontok.
- Hajós Zephyr-arculat: mélykék + arany; Raptor 27 „Zephyr” piros génuával; 6 apartman (Dingi, Korvett, Fregatt, Kalóz, Jolle, Schooner; + Kadett saját).
- Semmi ne takarja a fotót; élőben, a helyén kell látszania (nem videón).
- 24 nyelv (i18n: kulcs = magyar szöveg).

## Kutatás (Meta / Microsoft / Myst, részletek a beszélgetésben)
- Kézkövetésnél csak ugrásszerű fordulás (Meta input map); 30° alap, 45° választható; komfort-vignetta / rövid elsötétülés 80–120 ms.
- Fordulás-gesztus (Myst-minta): hüvelykujj fel (ököl) + csuklóforgatás ±35° → egy fordulás; újraélesítés <15° és 350 ms után; 100 ms stabil póz.
- TILOS a tenyér felé fordított csippentés (bal: kilép a WebXR-ből, jobb: Meta-menü).
- Célpontok: padlógyűrű ~0,6 m, ≤4 m-en belül, egyszerre max 3–4; felirat függőleges tengely körül forduló „billboard”, ~1,6 m magasan, cap-height ≥1° (≈13 mm/m), cím 1,5–2°.
- Nyilak: minden képkockában a fejtől a célig számolt vízszintes irány; emeletek közt a lépcső/ajtó köztes pontjára mutasson.
- Menü: a csuklóról NYÍLIK, de utána a térben áll (world-locked); poke-gomb ≥22 mm (nálunk 28–32 mm), 42–46 cm-re, vagy sugárral ≥0,8 m; hover + nyomott állapot + hang (kéznek nincs rezgése).
- Panel: sötét üveg rgba(16,24,32,.72), 1 px fényes perem, 12 mm sarok, Inter (Medium/SemiBold), szöveg #F2F2F2, arany csak kiemelés, kontraszt ≥4,5:1; 1–1,5 m, enyhén döntve; lusta követés csak yaw-ban (30° holtsáv, ~0,5 s).
- Érkezéskor az irány: a haladás irányába nézz (hotspot „Snap Position And Rotation”).
