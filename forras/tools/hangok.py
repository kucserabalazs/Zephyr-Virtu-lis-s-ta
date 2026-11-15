#!/usr/bin/env python3
"""A tantermek felvett hangjainak elkészítése Piperrel (természetes, ingyenes, CC0 magyar hangok: hu_HU imre / anna / berta).

A játék a hang/lecke/hangok.json alapján dönti el, melyik felvétel melyik szöveghez tartozik (a szöveg ujjlenyomata → fájlnév).
Ha egy lecke szövege változik, a régi felvétel nem szól tovább – ez a szkript csak a HIÁNYZÓ hangokat készíti el, a meglévőket nem bántja.

Használat (a tároló gyökeréből):
  1)  python3 -m http.server 8097 &   és   node forras/tools/leckek_dump.js        → forras/tools/leckek.json
  2)  pip install piper-tts   és a hangmodellek egy mappában (PIPER_DIR, alapból ~/piper):
        hu_HU-imre-medium.onnx(.json), hu_HU-anna-medium.onnx(.json), hu_HU-berta-medium.onnx(.json)
        (forrás: huggingface.co/rhasspy/piper-voices – hu/hu_HU/…; a hálózatnak ezt engedélyeznie kell)
  3)  python3 forras/tools/hangok.py            (próba: --szaraz; a nem használt régi bejegyzések törlése: --takarit)
  4)  bash forras/tools/build.sh   (a VR Zephyr Games oldalra is átmásolja)
"""
import json, os, subprocess, sys, tempfile, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HANG = os.path.join(ROOT, 'weboldal', 'virtualis-seta', 'hang', 'lecke')
LECKE = os.path.join(ROOT, 'forras', 'tools', 'leckek.json')
PIPER_DIR = os.environ.get('PIPER_DIR', os.path.expanduser('~/piper'))
SPEED = {'imre': 1.0, 'anna': 1.04, 'berta': .98}     # length_scale: a nagymama kicsit lassabban beszél

def vhash(s):
    h = 0x811c9dc5
    for ch in s:
        h ^= ord(ch); h = (h * 16777619) & 0xffffffff
    d = '0123456789abcdefghijklmnopqrstuvwxyz'; o = ''
    while True:
        o = d[h % 36] + o; h //= 36
        if not h: return o

def synth(text, voice, out_mp3):
    model = os.path.join(PIPER_DIR, f'hu_HU-{voice}-medium.onnx')
    if not os.path.exists(model): raise SystemExit(f'Hiányzik a hangmodell: {model}')
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, 'o.wav')
        subprocess.run([sys.executable, '-m', 'piper', '-m', model, '-f', wav, '--length-scale', str(SPEED.get(voice, 1.0)), '--sentence-silence', '0.35'],
                       input=text.replace('„', '').replace('”', '').encode('utf-8'), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-18:TP=-2', '-ac', '1', '-ar', '24000', '-b:a', '56k', out_mp3], check=True)

def main():
    dry = '--szaraz' in sys.argv; prune = '--takarit' in sys.argv
    L = json.load(open(LECKE, encoding='utf-8')); mp = os.path.join(HANG, 'hangok.json')
    M = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
    todo = 0; used = {}
    for hid, H in L.items():
        m = M.setdefault(hid, {}); os.makedirs(os.path.join(HANG, hid), exist_ok=True); used[hid] = set()
        items = [(q['t'] + '. ' + q['say'], 'h') for q in H['lessons']] + ([(H['greet'], 'koszon')] if H.get('greet') else [])
        for text, kind in items:
            k = vhash(text); used[hid].add(k)
            if k in m and os.path.exists(os.path.join(HANG, hid, m[k] + '.mp3')): continue
            stem = f'{kind}-{k}'; todo += 1; print(f'{hid}/{stem}.mp3 ← {text[:70]}…')
            if not dry: synth(text, H.get('voice') or 'imre', os.path.join(HANG, hid, stem + '.mp3')); m[k] = stem
    if prune:
        for hid, m in M.items():
            for k in [k for k in m if k not in used.get(hid, set())]:
                f = os.path.join(HANG, hid, m[k] + '.mp3'); print('régi:', f)
                if not dry:
                    if os.path.exists(f): os.remove(f)
                    del m[k]
    if not dry: json.dump(M, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=0, sort_keys=True)
    print(f'kész – {todo} új felvétel{" (próba)" if dry else ""}')

if __name__ == '__main__': main()
