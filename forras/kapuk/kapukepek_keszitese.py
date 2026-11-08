import numpy as np, json, sys
from PIL import Image
from scipy import ndimage as nd
S='/home/claude/zephyr-virtu-lis-s-ta/forras/kapuk/korok/'
D='/home/claude/zephyr-virtu-lis-s-ta/weboldal/virtualis-seta/img/kapu/'
m={'01':('magyar_sarkanyos_A','kapu01_B'),'02':('magyar_M2_csodaszarvas','kapu02_B'),'03':('magyar_M6_herendi','kapu03_B'),'06':('magyar_M8_honfoglalas','kapu06_B'),'07':('magyar_M3_balaton','kapu07_B'),'13':('magyar_M1_turul','kapu13_B'),'14':('magyar_M9_szekely_kapu','kapu14_B'),'15':('magyar_M7_zsolnay','kapu15_B'),'20':('magyar_cimeres_A','kapu20_B')}
out={}
for k,(fa,fb) in m.items():
    # eredeti PNG ha van (a scratchpadban), különben a jpg
    import os
    src=None
    for cand in ['/tmp/claude-0/-home-claude/f0644688-af83-5838-b016-d10d0d28343e/scratchpad/kapuk_kor/'+fa+'.png', S+fa+'.jpg']:
        if os.path.exists(cand): src=cand; break
    im=np.asarray(Image.open(src).convert('RGB').resize((1254,1254),Image.LANCZOS)).astype(np.float32)/255
    N=im.shape[0]; c=(N-1)/2
    lum=im.max(2)
    yy,xx=np.mgrid[0:N,0:N]; R=np.hypot(xx-c,yy-c)/(N/2); TH=np.arctan2(yy-c,xx-c)
    # belső perem szögenként
    A=1440; rin=np.zeros(A)
    for i,th in enumerate(np.linspace(-np.pi,np.pi,A,endpoint=False)):
        rs=np.arange(.25,1.0,.0015)
        px=(c+np.cos(th)*rs*N/2).astype(int); py=(c+np.sin(th)*rs*N/2).astype(int)
        v=lum[py,px]
        j=np.argmax(v>.30); rin[i]=rs[j] if v[j]>.30 else .6
    rin_s=nd.median_filter(rin,size=31,mode='wrap')
    rp=float(np.percentile(rin_s,85))+.03   # a belső kép sugara: a keret belső pereme alá nyúlik
    # alfa: fényerő alapján + lyukak kitöltése (zárás), a lyukban 0
    a=np.clip((lum-.025)/(.20-.025),0,1)
    ti=((TH+np.pi)/(2*np.pi)*A).astype(int)%A
    rr=rin_s[ti]
    # a gyűrű testén belül a sötét részletek is legyenek tömörek (zárás), kívül a fény maradjon lágy
    ac=nd.grey_closing(a,size=(15,15))
    body=np.clip((.86-R)/.03,0,1)
    a=a*(1-body)+np.maximum(a,ac)*body
    a=np.where(R>.86, np.clip((lum-.04)/(.30-.04),0,1)**1.3, a)
    a=np.maximum(a, np.where(R>.86, 0, 0))
    hole=np.clip((R-(rr-.012))/.012,0,1)     # a perem előtt átlátszó, lágy átmenet
    a=a*hole
    # a belső kép sugaránál a keret legyen tömör (ne látszódjon rés)
    band=(R>rr-.004)&(R<rp+.02)
    a[band]=np.maximum(a[band],1.0)
    rgb=im  # fekete hátterű kép = előszorzott szín
    o=np.dstack([rgb,a]); o=(np.clip(o,0,1)*255+.5).astype(np.uint8)
    Image.fromarray(o,'RGBA').save(D+f'k{k}-keret.webp',quality=92,method=6,exact=True)
    # belső kép
    b=np.asarray(Image.open(S+fb+'.jpg').convert('RGB').resize((1254,1254),Image.LANCZOS)).astype(np.float32)/255
    bl=b.max(2); rb=[]
    for th in np.linspace(-np.pi,np.pi,360,endpoint=False):
        rs=np.arange(.99,.6,-.002)
        px=(c+np.cos(th)*rs*N/2).astype(int); py=(c+np.sin(th)*rs*N/2).astype(int)
        v=bl[py,px]; j=np.argmax(v>.15); rb.append(rs[j])
    rB=float(np.median(rb))
    pass
    cov=float(np.mean(o[...,3][(np.abs(R-rp)<.004)]>230))
    out[k]={'rp':round(rp,4),'rin_med':round(float(np.median(rin_s)),4),'rin_min':round(float(rin_s.min()),4),'rB':round(rB,4),'cov':round(cov,3),'src':os.path.basename(src)}
    print(k,out[k],flush=True)
json.dump(out,open('/tmp/claude-0/-home-claude/f0644688-af83-5838-b016-d10d0d28343e/scratchpad/kproc/meret.json','w'))
