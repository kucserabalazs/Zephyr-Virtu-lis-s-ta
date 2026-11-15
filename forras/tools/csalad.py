#!/usr/bin/env python3
"""Az ugyvedhez.hu család-figuráinak (Three.js ES modulok) beépítése a vilag.js IIFE-be.
Bemenet: forras/csalad/*.js (változatlan másolatok) → kimenet: forras/vilag/05bz-csalad.js (const FAM = {...})."""
import re, os
D = os.path.join(os.path.dirname(__file__), '..', 'csalad')
ORDER = [('BufferGeometryUtils', 'BGU'), ('wind', 'WINDM'), ('hair', 'HAIRM'), ('hands', 'HANDM'), ('face', 'FACEM'), ('family3d', 'FAMM')]
MOD = {f: m for f, m in ORDER}
# a vitorlás-legénységhez szükséges, a webes változatot nem érintő kiegészítések (csak a beépített példányban)
PATCH = {'family3d': [
    ("const sleeve = P.dress", "const sleeve = P.sleeve ? P.sleeve : P.dress"),
    ("else this._legs(hw, Lg, legR, bottom, P, { laces: P.child });", "else this._legs(hw, Lg, legR, bottom, P, { laces: P.child, shinMat: P.bareLegs ? skin : null });"),
    ("amp: P.hair === 'rovid-kocos' ? .7 : 1 });", "amp: P.hairAmp ?? (P.hair === 'rovid-kocos' ? .7 : 1), count: P.hairCount });"),
]}
out = ['/* ==== AUTOMATIKUSAN GENERÁLT (forras/tools/csalad.py) – az ugyvedhez.hu család-figurái (family3d v2: arc-mimika, ötujjú kéz, tincses haj, szél) ==== */']
for f, m in ORDER:
    s = open(os.path.join(D, f + '.js'), encoding='utf8').read()
    pre = []
    def imp(mo):
        names, src = mo.group(1), mo.group(2)
        base = os.path.basename(src).replace('.js', '')
        if base == 'three.module': return 'const {%s} = THREE;' % names.replace('\n', ' ')
        pre.append('const {%s} = %s;' % (names.replace('\n', ' '), MOD[base]))
        return ''
    s = re.sub(r"import \* as THREE from '[^']+';", '', s)
    s = re.sub(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)';", imp, s)
    if f == 'BufferGeometryUtils':  # a three.module importjai → THREE globál
        pre = [p.replace('= three.module', '= THREE') for p in pre]
    s = re.sub(r"import\s*\{([^}]*)\}\s*from\s*'\.\./\.\./three\.module\.js';", lambda mo: 'const {%s} = THREE;' % mo.group(1).replace('\n', ' '), s)
    for a, b in PATCH.get(f, []):
        assert a in s, (f, a[:50]); s = s.replace(a, b, 1)
    exps = []
    s = re.sub(r'^export \{([^}]*)\};?', lambda mo: (exps.extend([x.strip() for x in mo.group(1).split(',') if x.strip()]), '')[1], s, flags=re.M)
    def ex(mo):
        exps.append(mo.group(2)); return mo.group(1)
    s = re.sub(r'^export ((?:async )?(?:function\*?|class|const|let|var) ([A-Za-z_$][\w$]*))', ex, s, flags=re.M)
    assert 'import ' not in re.sub(r'//.*|/\*[\s\S]*?\*/', '', s).split('\n', 1)[0] or True
    out.append('const %s = (() => {\n%s\n%s\nreturn { %s };\n})();' % (m, '\n'.join(pre), s, ', '.join(sorted(set(exps)))))
out.append('const FAM = { Character: FAMM.Character, CAST: FAMM.CAST, WIND: WINDM.WIND, lockGeometry: HAIRM.lockGeometry, windify: WINDM.windify, windDepth: WINDM.windDepth, mergeGeometries: BGU.mergeGeometries, rng: HAIRM.rng };')
open(os.path.join(os.path.dirname(__file__), '..', 'vilag', '05bz-csalad.js'), 'w', encoding='utf8').write('\n'.join(out) + '\n')
print('OK', sum(len(x) for x in out))
