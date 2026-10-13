import sys, glob
from PIL import Image
prefix, out = sys.argv[1], sys.argv[2]
files = sorted([f for f in glob.glob(prefix + '-*.png') if f.rsplit('-',1)[1].split('.')[0].isdigit()], key=lambda f: int(f.rsplit('-',1)[1].split('.')[0]))
ims = [Image.open(f) for f in files]
w, h = ims[0].size; cols = 3; s = 0.5
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (int(w*s)*cols, int(h*s)*rows))
for i, im in enumerate(ims):
    sheet.paste(im.resize((int(w*s), int(h*s))), ((i % cols)*int(w*s), (i//cols)*int(h*s)))
sheet.save(out)
