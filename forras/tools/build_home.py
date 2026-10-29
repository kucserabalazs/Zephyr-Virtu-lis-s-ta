import re
T=open('tour/index.html').read().split('\n')
a=[i for i,l in enumerate(T) if l.startswith('/* Zephyr – tulajdonosi felület (a foglalási')][0]
b=[i for i,l in enumerate(T) if l.startswith('</style>')][0]
css='\n'.join(T[a:b])
full='\n'.join(T)
s1=full.index('<script>'); e1=full.index('</script>', s1)
js=full[s1+8:e1]
src=open('home/src.html').read()
page=src.replace('<!--ZEPHYR-BOOKING-CSS-->','<style>\n/* foglalási ablak + tulajdonosi felület (a virtuális sétából) */\n'+css+'\n</style>').replace('<!--ZEPHYR-BOOKING-JS-->','<script>'+js+'</script>')
open('home/index.html','w').write(page)
head='<!doctype html>\n<html lang="hu">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
open('site/uj/index.html','w').write(head+page)
print(len(page))
