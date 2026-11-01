#!/bin/bash
set -e
R=/home/claude/zephyr-virtu-lis-s-ta
W=/home/claude/build/w
rm -rf $W && mkdir -p $W/tour $W/home $W/site/uj
cat $R/forras/fejlec.txt $R/forras/virtualis-seta-forras.html > $R/weboldal/virtualis-seta/index.html
python3 $R/forras/tools/build_i18n.py $R/weboldal/virtualis-seta/index.html
cp $R/weboldal/virtualis-seta/index.html $W/tour/index.html
cp $R/forras/kezdooldal-forras.html $W/home/src.html
cp $R/forras/tools/build_home.py $W/
cd $W && python3 build_home.py
python3 $R/forras/tools/build_i18n.py $W/site/uj/index.html $W/home/index.html
cp $W/site/uj/index.html $R/weboldal/uj/index.html
echo built
