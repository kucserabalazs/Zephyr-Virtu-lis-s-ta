import cv2,numpy as np,json
im=cv2.imread('/home/claude/zephyr-virtu-lis-s-ta/weboldal/uj/img/zephyr-logo.png',cv2.IMREAD_UNCHANGED)
H0,W0=im.shape[:2]
a=im[...,3]
n,lab,st,_=cv2.connectedComponentsWithStats((a>0).astype(np.uint8),8)
def comp_at(x,y):
    return lab==lab[y,x]
# helper: label by bbox
comps={}
for i in range(1,n):
    x,y,w,h,ar=st[i]
    if ar<150: continue
    comps[(x,y)]=i
def find(x0,y0):
    best=min(comps,key=lambda k:abs(k[0]-x0)+abs(k[1]-y0)); return lab==comps[best]
parts={}
parts['red']=find(0,142); parts['sail']=find(211,0); parts['Z']=find(266,160); parts['E']=find(482,210); parts['P']=find(685,210); parts['wave']=find(704,483)
hyr=find(900,210)
yy,xx=np.mgrid[0:H0,0:W0]
cut=lambda x0,x1: x0+(x1-x0)*(yy-200)/220.
c1=cut(1162.5,1120.6); c2=cut(1433,1327)
parts['H']=hyr&(xx<c1); parts['Y']=hyr&(xx>=c1)&(xx<c2); parts['R']=hyr&(xx>=c2)
for nm,(x0,y0) in zip(['a1','p','a2','r','t','m','a3','n'],[(768,425),(867,425),(953,425),(1052,426),(1160,425),(1231,425),(1343,426),(1443,425)]):
    parts['ap_'+nm]=find(x0,y0)
# antialiasing: hand out pixels with small alpha (not in any mask due to >0 threshold all included) – fine
PAD=14; OUT=9
pieces=[]; tiles=[]
for nm,m in parts.items():
    ys,xs=np.nonzero(m); x0,x1,y0,y1=xs.min()-PAD,xs.max()+PAD+1,ys.min()-PAD,ys.max()+PAD+1
    x0=max(0,x0);y0=max(0,y0)
    mm=m[y0:y1,x0:x1]
    # a szomszédos (másik betűhöz tartozó) élsimított pixelek ne kerüljenek bele
    col=im[y0:y1,x0:x1].copy(); col[...,3]=np.where(mm,col[...,3],0)
    if col.shape[0]<y1-y0 or col.shape[1]<x1-x0:
        pc=np.zeros((y1-y0,x1-x0,4),np.uint8); pc[:col.shape[0],:col.shape[1]]=col; col=pc
    al=col[...,3]
    k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*OUT+1,2*OUT+1))
    ol=cv2.GaussianBlur(cv2.dilate(al,k),(0,0),1.2)
    outline=np.dstack([np.full_like(al,255)]*3+[ol])
    pieces.append(dict(n=nm,x=int(x0),y=int(y0),w=int(x1-x0),h=int(y1-y0))); tiles.append((col,outline))
# shelf-packing: soronként, színes és körvonalas kép egymás alatt (két külön sáv)
AW=2048; cx=cy=0; rowh=0; pos=[]
for (col,ol),p in zip(tiles,pieces):
    w,h=p['w'],p['h']
    if cx+w>AW: cx=0; cy+=rowh+2; rowh=0
    pos.append((cx,cy)); cx+=w+2; rowh=max(rowh,h)
AH1=cy+rowh+2
atlas=np.zeros((AH1*2,AW,4),np.uint8)
for (col,ol),p,(px,py) in zip(tiles,pieces,pos):
    atlas[py:py+p['h'],px:px+p['w']]=col; atlas[AH1+py:AH1+py+p['h'],px:px+p['w']]=ol
    p['ax']=px; p['ay']=py
out={'W':W0,'H':H0,'oy':AH1,'p':pieces}
cv2.imwrite('/home/claude/zephyr-virtu-lis-s-ta/weboldal/uj/img/zephyr-logo-parts.png',atlas,[cv2.IMWRITE_PNG_COMPRESSION,9])
json.dump(out,open('logo/parts.json','w'),separators=(',',':'))
print(atlas.shape, len(pieces)); print(json.dumps(out)[:300])
# ellenőrzés: összerakva
re=np.zeros((H0+40,W0+40,4),np.float32)
def comp(dst,src,x,y):
    h,w=src.shape[:2]; a_=src[...,3:4]/255.; dst[y:y+h,x:x+w,:3]=dst[y:y+h,x:x+w,:3]*(1-a_)+src[...,:3]*a_; dst[y:y+h,x:x+w,3:]=np.maximum(dst[y:y+h,x:x+w,3:],src[...,3:])
for (col,ol),p in zip(tiles,pieces): comp(re,ol.astype(np.float32),p['x']+20,p['y']+20)
for (col,ol),p in zip(tiles,pieces): comp(re,col.astype(np.float32),p['x']+20,p['y']+20)
bg=np.full(re.shape[:2]+(3,),(60,90,60),np.float32); a_=re[...,3:]/255.
cv2.imwrite('logo/check.jpg',(bg*(1-a_)+re[...,:3]*a_).astype(np.uint8))
