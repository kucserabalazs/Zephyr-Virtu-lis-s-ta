# p2p.js – többjátékos kapcsolat (Trystero 0.21.8, nostr-jelzés)

A `weboldal/virtualis-seta/p2p.js` a Trystero nyílt forráskódú könyvtár (MIT) csomagolt változata: a böngészők közvetlenül
(WebRTC) kapcsolódnak egymáshoz, a „találkozást” nyilvános nostr-továbbítók intézik – nincs saját szerver, nincs regisztráció.

Újraépítés:
```bash
mkdir netb && cd netb && npm init -y && npm i trystero@0.21.8 esbuild
cp ../forras/p2p/entry.js . && npx esbuild entry.js --bundle --minify --format=iife --target=es2019 --outfile=p2p.js
```
Ugyanazon a gépen több lap között BroadcastChannel is működik (internet nélkül, teszteléshez).
