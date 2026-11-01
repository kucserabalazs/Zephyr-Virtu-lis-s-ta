"""Ellenőrzés + összefűzés: python3 ellenoriz.py xx  → munka/xx_1..6.json (listák: [[hu, fordítás], ...] vagy {hu: fordítás}) → nyelv/xx.json"""
import json, sys, re, os
D=os.path.dirname(os.path.abspath(__file__)); c=sys.argv[1]
out={}; errs=[]
for i in range(1,7):
    src=json.load(open(f'{D}/hu_{i}.json',encoding='utf-8'))
    p=f'{D}/{c}_{i}.json'
    if not os.path.exists(p): errs.append(f'hiányzik: {c}_{i}.json'); continue
    t=json.load(open(p,encoding='utf-8'))
    if isinstance(t,list): t={a:b for a,b in t}
    for k in src:
        v=t.get(k)
        if not isinstance(v,str) or not v.strip(): errs.append(f'{i}: nincs fordítás: {k[:60]}'); continue
        if k.count('{#}')!=v.count('{#}'): errs.append(f'{i}: {{#}} szám eltér: {k[:50]} → {v[:50]}')
        if k.count(' · ') and v.count(' · ')!=k.count(' · '): pass
        out[k]=v
json.dump(out,open(f'{D}/../nyelv/{c}.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(c, len(out), 'kész;', len(errs), 'hiba'); print('\n'.join(errs[:30]))
