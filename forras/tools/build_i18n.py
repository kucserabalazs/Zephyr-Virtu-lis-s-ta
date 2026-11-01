"""Nyelvi alap beépítése: a zephyr-i18n.js motort beírja a megadott HTML fájlokba a <!--ZEPHYR-I18N--> jelölő helyére,
és a forras/i18n/nyelv/*.json szótárakat a weboldal/nyelv/ mappába másolja. Kész nyelv = amelyik szótárában van fordítás."""
import sys, os, json, glob, shutil
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(R, 'forras', 'i18n')
ready = ['hu']
out_dir = os.path.join(R, 'weboldal', 'nyelv'); os.makedirs(out_dir, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, 'nyelv', '*.json'))):
    c = os.path.basename(f)[:-5]
    d = json.load(open(f, encoding='utf-8'))
    shutil.copy(f, os.path.join(out_dir, c + '.json'))
    if c != 'hu' and any(v for v in d.values()): ready.append(c)
js = open(os.path.join(src, 'zephyr-i18n.js'), encoding='utf-8').read()
js = js.replace('/*ZI18N_READY*/["hu"]/*/ZI18N_READY*/', json.dumps(ready))
for p in sys.argv[1:]:
    h = open(p, encoding='utf-8').read()
    assert h.count('<!--ZEPHYR-I18N-->') == 1, p
    h = h.replace('<!--ZEPHYR-I18N-->', '<script>\n' + js + '\n</script>')
    open(p, 'w', encoding='utf-8').write(h)
print('i18n kész nyelvek:', ready)
