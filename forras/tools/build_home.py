import re
T=open('tour/index.html').read().split('\n')
a=[i for i,l in enumerate(T) if l.startswith('/* Zephyr – tulajdonosi felület (a foglalási')][0]
b=[i for i,l in enumerate(T) if l.startswith('</style>')][0]
css='\n'.join(T[a:b])
full='\n'.join(T)
s1=full.index('<script>'); e1=full.index('</script>', s1)
js=full[s1+8:e1]
# vitorlásverseny (regatta) a sétából: a kezdőoldal nyitóképének aljára, hang nélkül
ra=full.index('  (function regatta() {'); rb=full.index('\n  })();', ra)+len('\n  })();')
reg=full[ra:rb]
shim='''<script>
/* Zephyr – vitorlásverseny a kezdőoldalon (a virtuális séta regatta-animációja, hang nélkül) */
(function () {
  const $ = (id) => document.getElementById(id);
  let device = innerWidth <= 700 ? "phone" : "pc"; addEventListener("resize", () => { device = innerWidth <= 700 ? "phone" : "pc"; });
  const AC = undefined, outBus = () => null, fxBurst = () => {}, fxTone = () => {}, walking = false;
''' + reg + '''
})();
</script>'''
src=open('home/src.html').read()
assert '<!--ZEPHYR-REGATTA-JS-->' in src
src=src.replace('<!--ZEPHYR-REGATTA-JS-->', shim)
page=src.replace('<!--ZEPHYR-BOOKING-CSS-->','<style>\n/* foglalási ablak + tulajdonosi felület (a virtuális sétából) */\n'+css+'\n</style>').replace('<!--ZEPHYR-BOOKING-JS-->','<script>'+js+'</script>')
open('home/index.html','w').write(page)
head='<!doctype html>\n<html lang="hu">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
open('site/uj/index.html','w').write(head+page)
print(len(page))
