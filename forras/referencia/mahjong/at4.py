from PIL import Image, ImageFilter
exec(open('at2.py').read().split('def refine')[0])
B=[]
for lst,y0,y1,bev in [(row1,172,415,10),(r2,420,562,9),(r3,567,705,9),(r4,706,885,8)]:
  for x0,x1 in lst: B.append([x0,x1,y0,y1-bev])
CW,CH=200,280
at=Image.new('RGB',(8*CW,8*CH),(244,238,224))
for i,(a,b,c,d) in enumerate(B):
  w=b-a;h=d-c; ix=w*.045; iy=h*.025
  cr=im.crop((a+ix,c+iy,b-ix,d-iy*.5)).resize((CW,CH),Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.6,percent=70,threshold=2))
  at.paste(cr,((i%8)*CW,(i//8)*CH))
at.save('atlas2.png'); at.save('mahjong-balaton.webp',quality=82,method=6)
import os;print(os.path.getsize('mahjong-balaton.webp'))
at.resize((800,1120)).save('atlas2s.png')
