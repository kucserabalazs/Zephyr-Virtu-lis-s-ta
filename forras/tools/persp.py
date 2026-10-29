import sys, numpy as np
from PIL import Image
def view(src, s, out, W=1280, H=854, hfov=96, pitch=-6, extra=0):
    im = np.asarray(Image.open(src).convert('RGB')); h, w, _ = im.shape
    t = np.tan(np.radians(hfov/2)); tv = t*H/W
    i = (np.arange(W)+.5)/W*2-1; j = (np.arange(H)+.5)/H*2-1
    x, y = np.meshgrid(i*t, -j*tv); z = np.ones_like(x)
    p = np.radians(pitch); y2 = y*np.cos(p)+z*np.sin(p); z2 = -y*np.sin(p)+z*np.cos(p)
    lon = np.arctan2(x, z2); lat = np.arctan2(y2, np.hypot(x, z2))
    u = ((s + extra/360 + lon/(2*np.pi)) % 1)*w; v = (.5 - lat/np.pi)*h
    u0 = np.clip(u.astype(int), 0, w-1); v0 = np.clip(v.astype(int), 0, h-1)
    Image.fromarray(im[v0, u0]).save(out, quality=84, optimize=True, progressive=True)
if __name__ == '__main__':
    view(sys.argv[1], float(sys.argv[2]), sys.argv[3])
