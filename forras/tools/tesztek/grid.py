import sys
from PIL import Image, ImageDraw
pre=sys.argv[1]; n=int(sys.argv[2]); cols=int(sys.argv[3]) if len(sys.argv)>3 else 2
W=600;H=400; rows=(n+cols-1)//cols
c=Image.new('RGB',(W*cols,H*rows),'white'); d=ImageDraw.Draw(c)
for i in range(n):
    im=Image.open(f'{pre}{i}.jpg').resize((W,H)); c.paste(im,((i%cols)*W,(i//cols)*H)); d.text(((i%cols)*W+8,(i//cols)*H+6),str(i),fill='yellow')
c.save(f'{pre}grid.jpg',quality=85)
