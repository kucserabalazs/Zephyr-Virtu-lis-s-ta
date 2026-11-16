#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Valódi fotók a Wikimedia Commonsból a Zephyr játékhoz (Magyar Ízek Háza, Természetvédelmi ház).

A GitHub Actions futtatja (.github/workflows/fotok.yml) – a fejlesztői környezet a Wikimediát nem éri el, a GitHub futtatója igen.

  python3 forras/tools/fotok.py kereses
      A forras/kepek/kereses.json minden bejegyzéséhez (id → keresőszavak) jelöltlapot készít:
      forras/kepek/kandidatok/<id>.jpg (6 jelölt, számozva) + <id>.json (a jelöltek adatai).
  python3 forras/tools/fotok.py letoltes
      A forras/kepek/fotok.json minden bejegyzéséhez (id → "File:….jpg") letölti a képet (alapból 960 px széles):
      weboldal/vr-zephyr-games/kepek/<id>.jpg, és a szerző/licenc adatokat a forrasok.json + KEPEK-FORRASOK.md fájlba írja.

Csak szabad licencű képet fogad el (CC BY, CC BY-SA, CC0, közkincs). A játék a szerzőt és a licencet kiírja (lásd 05n-fotok.js).
"""
import html, io, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KEPEK = os.path.join(ROOT, 'forras', 'kepek')
KAND = os.path.join(KEPEK, 'kandidatok')
OUT = os.path.join(ROOT, 'weboldal', 'vr-zephyr-games', 'kepek')
UA = 'ZephyrVR-fotok/1.0 (https://github.com/kucserabalazs/zephyr-virtu-lis-s-ta; hobbi VR vitorlas jatek)'
API = 'https://commons.wikimedia.org/w/api.php'


def http(url, tries=6):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(4 * (i + 1)); continue
            raise
        except Exception:
            time.sleep(3 * (i + 1))
    raise RuntimeError('nem sikerült letölteni: ' + url)


def api(**p):
    p.update(format='json', formatversion='2')
    return json.loads(http(API + '?' + urllib.parse.urlencode(p)))


def plain(s):
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s or ''))).strip()


def lic_ok(n):
    n = (n or '').strip()
    if re.search(r'\b(NC|ND)\b', n, re.I): return False
    return bool(re.match(r'^(CC BY|CC0|Public domain|PD)', n, re.I))


def jelolt(p, minw, minh):
    ii = (p.get('imageinfo') or [None])[0]
    if not ii or ii.get('mime') != 'image/jpeg': return None
    if ii.get('width', 0) < minw or ii.get('height', 0) < minh: return None
    em = ii.get('extmetadata', {})
    lic = em.get('LicenseShortName', {}).get('value', '')
    if not lic_ok(lic): return None
    return {'cim': p['title'], 'thumb': ii.get('thumburl'), 'w': ii['width'], 'h': ii['height'], 'lic': lic,
            'szerzo': plain(em.get('Artist', {}).get('value', ''))[:60], 'leiras': plain(em.get('ImageDescription', {}).get('value', ''))[:90]}


def kereses():
    from PIL import Image, ImageDraw, ImageFont
    os.makedirs(KAND, exist_ok=True)
    K = json.load(open(os.path.join(KEPEK, 'kereses.json'), encoding='utf-8'))
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13); big = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
    except Exception: font = big = ImageFont.load_default()
    for id, e in K.items():
        qs = e['q'] if isinstance(e, dict) else e
        n = (e.get('n', 6) if isinstance(e, dict) else 6)
        jp = os.path.join(KAND, id + '.json')
        if os.path.exists(jp) and json.load(open(jp, encoding='utf-8')).get('q') == qs: continue
        lists = []
        for q in qs:
            try:
                r = api(action='query', generator='search', gsrsearch=q + ' filetype:bitmap', gsrnamespace=6, gsrlimit=24, prop='imageinfo',
                        iiprop='url|size|mime|extmetadata', iiurlwidth=330, iiextmetadatafilter='LicenseShortName|Artist|ImageDescription')
            except Exception as ex:
                print('HIBA keresés', id, q, ex); continue
            ps = sorted(r.get('query', {}).get('pages', []), key=lambda p: p.get('index', 0))
            lists.append([c for c in (jelolt(p, 1100, 650) for p in ps) if c])
            time.sleep(.4)
        cand, seen = [], set()
        for i in range(24):  # körforgásos összefésülés a keresőszavak között
            for L in lists:
                if i < len(L) and L[i]['cim'] not in seen: seen.add(L[i]['cim']); cand.append(L[i])
        cand = cand[:n]
        if not cand: print('NINCS jelölt:', id, qs); json.dump({'q': qs, 'jeloltek': []}, open(jp, 'w', encoding='utf-8'), ensure_ascii=False); continue
        cw, ch = 330, 226; cols = 3; rows = (len(cand) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * (cw + 6) + 6, rows * (ch + 22) + 6), '#202428'); d = ImageDraw.Draw(sheet)
        for k, c in enumerate(cand):
            try:
                im = Image.open(io.BytesIO(http(c['thumb']))).convert('RGB'); im.thumbnail((cw, ch))
            except Exception as ex:
                print('HIBA kép', c['cim'], ex); continue
            x, y = 6 + (k % cols) * (cw + 6), 6 + (k // cols) * (ch + 22)
            sheet.paste(im, (x + (cw - im.width) // 2, y + (ch - im.height) // 2))
            d.rectangle([x, y, x + 34, y + 34], fill='#000000'); d.text((x + 9, y + 2), str(k + 1), font=big, fill='#ffe066')
            d.text((x + 2, y + ch + 3), f"{c['lic']} · {c['w']}×{c['h']}", font=font, fill='#cfd6dc')
        sheet.save(os.path.join(KAND, id + '.jpg'), 'JPEG', quality=78)
        json.dump({'q': qs, 'jeloltek': cand}, open(jp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('jelöltlap:', id, len(cand))


def letoltes():
    from PIL import Image
    os.makedirs(OUT, exist_ok=True)
    F = json.load(open(os.path.join(KEPEK, 'fotok.json'), encoding='utf-8'))
    fp = os.path.join(OUT, 'forrasok.json')
    forr = json.load(open(fp, encoding='utf-8')) if os.path.exists(fp) else {}
    for id, e in F.items():
        cim = e if isinstance(e, str) else e['cim']
        szel = 960 if isinstance(e, str) else e.get('szel', 960)
        ut = os.path.join(OUT, id + '.jpg')
        if os.path.exists(ut) and forr.get(id, {}).get('cim') == cim: continue
        try:
            r = api(action='query', titles=cim, prop='imageinfo', iiprop='url|size|mime|extmetadata', iiurlwidth=szel,
                    iiextmetadatafilter='LicenseShortName|LicenseUrl|Artist|ImageDescription|Credit')
            p = r['query']['pages'][0]; ii = p['imageinfo'][0]
        except Exception as ex:
            print('HIBA (nincs ilyen fájl?)', id, cim, ex); continue
        em = ii.get('extmetadata', {}); lic = em.get('LicenseShortName', {}).get('value', '')
        if not lic_ok(lic): print('NEM SZABAD LICENC', id, cim, lic); continue
        try:
            im = Image.open(io.BytesIO(http(ii['thumburl']))).convert('RGB')
        except Exception as ex:
            print('HIBA letöltés', id, cim, ex); continue
        if im.width > szel: im = im.resize((szel, round(im.height * szel / im.width)), Image.LANCZOS)
        im.save(ut, 'JPEG', quality=84, optimize=True, progressive=True)
        forr[id] = {'cim': cim, 'oldal': 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(cim.replace(' ', '_')),
                    'szerzo': plain(em.get('Artist', {}).get('value', '')) or plain(em.get('Credit', {}).get('value', '')) or 'ismeretlen',
                    'licenc': lic, 'licencUrl': plain(em.get('LicenseUrl', {}).get('value', '')),
                    'leiras': plain(em.get('ImageDescription', {}).get('value', ''))[:160], 'w': im.width, 'h': im.height, 'eredetiW': ii.get('width'), 'eredetiH': ii.get('height')}
        print('letöltve:', id, cim, im.size, lic); time.sleep(.5)
    for id in [k for k in forr if k not in F]: forr.pop(id)  # amit már nem használunk, kikerül a jegyzékből
    json.dump(forr, open(fp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    with open(os.path.join(OUT, 'KEPEK-FORRASOK.md'), 'w', encoding='utf-8') as f:
        f.write('# Fotók forrása és licence\n\nA Magyar Ízek Háza és a Természetvédelmi ház fotói a Wikimedia Commonsból valók (szabad licenc). '
                'A képeket csak átméreteztük (és a játékban körbevágtuk). A szerző/licenc minden képnél a játékban is látszik.\n\n| Kép | Cím a Commonsban | Szerző | Licenc |\n|---|---|---|---|\n')
        for id in sorted(forr):
            c = forr[id]; f.write(f"| {id} | [{c['cim']}]({c['oldal']}) | {c['szerzo']} | [{c['licenc']}]({c['licencUrl']}) |\n" if c.get('licencUrl') else f"| {id} | [{c['cim']}]({c['oldal']}) | {c['szerzo']} | {c['licenc']} |\n")


if __name__ == '__main__':
    m = sys.argv[1] if len(sys.argv) > 1 else ''
    if m == 'kereses': kereses()
    elif m == 'letoltes': letoltes()
    else: print(__doc__)
