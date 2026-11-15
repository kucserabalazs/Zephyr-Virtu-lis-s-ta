#!/bin/bash
set -e
R=/home/claude/zephyr-virtu-lis-s-ta
W=/home/claude/build/w
rm -rf $W && mkdir -p $W/tour $W/home $W/site/uj
cat $R/forras/fejlec.txt $R/forras/virtualis-seta-forras.html > $R/weboldal/virtualis-seta/index.html
cat $R/forras/vilag/*.js > $R/weboldal/virtualis-seta/vilag.js
# a 3D-világ fájljának verziója (tartalom-ujjlenyomat) – így a böngésző / a Quest nem a régi, gyorsítótárazott vilag.js-t tölti be
WV=$(md5sum $R/weboldal/virtualis-seta/vilag.js | cut -c1-10)
sed -i "s/__WV__/$WV/" $R/weboldal/virtualis-seta/index.html
# az oldal saját verziója: a böngésző / a Quest ebből veszi észre, hogy van újabb változat ("Új változat" gomb)
BV=$(md5sum $R/weboldal/virtualis-seta/index.html | cut -c1-10)
sed -i "s/__BV__/$BV/g" $R/weboldal/virtualis-seta/index.html
echo "{\"v\":\"$BV\"}" > $R/weboldal/virtualis-seta/verzio.json
python3 $R/forras/tools/build_i18n.py $R/weboldal/virtualis-seta/index.html
# ---- VR Zephyr Games (2026-11-15): a játékok külön oldala – ugyanaz a motor, ZEPHYR_GAMES jelzővel, séta nélkül; csak a játékokhoz kellő fájlok ----
G=$R/weboldal/vr-zephyr-games; S=$R/weboldal/virtualis-seta
mkdir -p $G/img
python3 - "$S/index.html" "$G/index.html" <<'PY'
import sys,re
s=open(sys.argv[1]).read()
s=s.replace('<head>','<head>\n<script>window.ZEPHYR_GAMES=1;</script>',1)
s=re.sub(r'<title>[^<]*</title>','<title>VR Zephyr Games</title>',s,count=1)
open(sys.argv[2],'w').write(s)
PY
cp $S/vilag.js $S/p2p.js $S/verzio.json $S/jatek.webmanifest $G/
rm -rf $G/hang $G/fonts; cp -r $S/hang $G/hang; cp -r $S/fonts $G/fonts
for d in eg kapu kit melleny tex jatek; do rm -rf $G/img/$d; cp -r $S/img/$d $G/img/$d; done
cp $S/img/zephyr-hajo-logo.png $S/img/kapitanyi-hatter.jpg $S/img/zephyr-logo.png $S/img/zephyr-logo-s.png $G/img/
cp $R/weboldal/virtualis-seta/index.html $W/tour/index.html
cp $R/forras/kezdooldal-forras.html $W/home/src.html
cp $R/forras/tools/build_home.py $W/
cd $W && python3 build_home.py
python3 $R/forras/tools/build_i18n.py $W/site/uj/index.html $W/home/index.html
cp $W/site/uj/index.html $R/weboldal/uj/index.html
echo built
