# Balaton Vitorlás Mahjong – lapképek a tulajdonos mintaképéből (forras/referencia/mahjong/balaton-vitorlas-mahjong-minta.png)
import numpy as np, cv2, sys
from PIL import Image, ImageFilter
SRC = sys.argv[1] if len(sys.argv) > 1 else 'src.png'
im = Image.open(SRC).convert('RGB'); A = np.asarray(im).astype(np.float32)
CW, CH = 200, 260
def crop(b, w=CW, h=CH, ins=.1):
    x0, x1, y0, y1 = b; dx = (x1 - x0) * ins; dy = (y1 - y0)
    c = im.crop((x0 + dx, y0 + dy * .045, x1 - dx, y1 - dy * .09)).resize((w, h), Image.LANCZOS)
    return np.asarray(c.filter(ImageFilter.UnsharpMask(1.5, 60, 2))).astype(np.float32)
MAN = [(102,202,322,425),(199,300,320,425),(292,395,318,423),(387,487,316,420),(477,577,315,420),(566,667,312,415),(656,757,310,413),(745,847,308,410),(832,935,305,405)]
WIND = [(137,245,640,750),(240,345,637,748),(340,445,635,745),(437,545,632,742)]
DRAG = [(537,642,622,735),(632,742,620,733)]
PICS = [(970,1140,300,415),(1120,1295,298,415),(1275,1450,295,410),(1005,1180,420,555),(1160,1345,420,550),(1325,1510,415,545),(1045,1225,565,710),(1200,1385,560,705),(1370,1536,550,700),(1302,1458,838,978)]
cells = []
for b in MAN: cells.append(crop(b))
# --- üres lap: a 北 lapból, az írásjel kitöltve
base = crop(WIND[3])
hsv = cv2.cvtColor(base.astype(np.uint8), cv2.COLOR_RGB2HSV)
m = (((hsv[..., 0] > 95) & (hsv[..., 0] < 135) & (hsv[..., 1] > 60)) | (hsv[..., 2] < 165)).astype(np.uint8)
reg = np.zeros_like(m); reg[:, :] = 1; m = cv2.dilate(m * reg, np.ones((9, 9), np.uint8)) * 255
blank = cv2.inpaint(base.astype(np.uint8), m, 12, cv2.INPAINT_TELEA).astype(np.float32)
bl = cv2.GaussianBlur(blank, (0, 0), 14); w = np.zeros((CH, CW), np.float32); w[26:236, 18:182] = 1; w = cv2.GaussianBlur(w, (0, 0), 8)[..., None]
blank = blank * (1 - w) + bl * w
ivory = np.median(blank[60:200, 50:150].reshape(-1, 3), 0)
def ratio(img, box):   # a minta háttérszínére normált „szorzó” kép
    x0, x1, y0, y1 = box; s = A[y0:y1, x0:x1]
    hs = cv2.cvtColor(s.astype(np.uint8), cv2.COLOR_RGB2HSV); bgm = (hs[..., 1] < 55) & (hs[..., 2] > 190)
    ref = np.median(s[bgm], 0) if bgm.sum() > 20 else ivory
    return np.clip(s / ref, 0, 1.15)
def mul(dst, r, cx, cy, w, h, feather=6):
    r = cv2.resize(r, (int(w), int(h)), interpolation=cv2.INTER_LANCZOS4)
    mk = np.ones((int(h), int(w)), np.float32); f = feather
    mk[:f] *= np.linspace(0, 1, f)[:, None]; mk[-f:] *= np.linspace(1, 0, f)[:, None]; mk[:, :f] *= np.linspace(0, 1, f)[None]; mk[:, -f:] *= np.linspace(1, 0, f)[None]
    rr = 1 + (r - 1) * mk[..., None]
    x0 = int(cx - w / 2); y0 = int(cy - h / 2); d = dst[y0:y0 + int(h), x0:x0 + int(w)]
    dst[y0:y0 + int(h), x0:x0 + int(w)] = d * rr
def numeral(k):   # a k-adik 萬 lap felső kék írásjele
    x0, x1, y0, y1 = MAN[k]; return ratio(None, (int(x0 + 10), int(x1 - 10), int(y0 + 5), int(y0 + 43)))
WHEEL = (221, 306, 438, 512); REED = (236, 320, 530, 624)
for k in range(9):   # kormánykerék 1–9
    c = blank.copy(); mul(c, numeral(k), 100, 52, 150, 78, 14); mul(c, ratio(None, WHEEL), 100, 168, 150, 150, 22); cells.append(c)
for k in range(9):   # nád 1–9
    c = blank.copy(); mul(c, numeral(k), 100, 52, 150, 78, 14); mul(c, ratio(None, REED), 100, 166, 158, 160, 22); cells.append(c)
for b in WIND: cells.append(crop(b))
for b in DRAG: cells.append(crop(b))
# Balaton-térképes lap
c = blank.copy()
mul(c, ratio(None, (783, 935, 622, 712)), 100, 112, 178, 126, 16)
mul(c, ratio(None, (938, 1008, 646, 710)), 100, 200, 72, 68, 14)
mul(c, ratio(None, (748, 800, 613, 650))[::-1, ::-1], 166, 232, 50, 46, 3) if False else None
mul(c, br[::-1, ::-1], 34, 30, 50, 46, 3) if False else None
cells.append(c)
# festett képes lapok: elefántcsont lapon, a kép a saját arany-meander keretével
for b in PICS:
    c = blank.copy(); x0, x1, y0, y1 = b; dx = (x1 - x0) * .115; dy = (y1 - y0) * .08
    p = np.asarray(im.crop((x0 + dx, y0 + dy, x1 - dx, y1 - dy)).resize((184, 176), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.5, 60, 2))).astype(np.float32)
    mk = np.ones((176, 184), np.float32); f = 5
    mk[:f] *= np.linspace(0, 1, f)[:, None]; mk[-f:] *= np.linspace(1, 0, f)[:, None]; mk[:, :f] *= np.linspace(0, 1, f)[None]; mk[:, -f:] *= np.linspace(1, 0, f)[None]
    yy = (CH - 176) // 2; c[yy:yy + 176, 8:192] = c[yy:yy + 176, 8:192] * (1 - mk[..., None]) + p * mk[..., None]; cells.append(c)
# 44: ZEPHYR APARTMAN – a legértékesebb lap (külön mintakép: zephyr-lap-minta.png)
import os
zp = os.path.join(os.path.dirname(os.path.abspath(SRC)), 'zephyr-lap-minta.png') if not os.path.exists('zephyr.png') else 'zephyr.png'
zi = Image.open(zp).convert('RGB')
cells.append(np.asarray(zi.crop((246, 62, 1040, 1160)).resize((CW, CH), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.5, 50, 2))).astype(np.float32))
print(len(cells))
at = np.zeros((6 * CH, 8 * CW, 3), np.float32) + ivory
for i, c in enumerate(cells): at[(i // 8) * CH:(i // 8 + 1) * CH, (i % 8) * CW:(i % 8 + 1) * CW] = c
out = Image.fromarray(np.clip(at, 0, 255).astype(np.uint8))
out.save('atlas.png'); out.save('mahjong-balaton.webp', quality=84, method=6)
out.resize((800, 780)).save('atlas_s.png')
