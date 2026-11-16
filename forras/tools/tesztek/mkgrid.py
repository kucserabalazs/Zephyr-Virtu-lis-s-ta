import sys,glob
from PIL import Image
pre=sys.argv[1]; cols=int(sys.argv[2]); W=int(sys.argv[3]); H=int(sys.argv[4]); out=sys.argv[5]
fs=[f for f in glob.glob(pre+'*.jpg') if f[len(pre):-4].isdigit()]
fs.sort(key=lambda f:int(f[len(pre):-4]))
rows=(len(fs)+cols-1)//cols
c=Image.new('RGB',(W*cols,H*rows))
for i,f in enumerate(fs): c.paste(Image.open(f).resize((W,H)),((i%cols)*W,(i//cols)*H))
c.save(out,quality=88); print(len(fs))
