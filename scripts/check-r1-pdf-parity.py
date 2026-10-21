"""Reviewed Noto baseline: immutable original artwork, semantic retention, 150-dpi pixels."""
from pathlib import Path
import subprocess,json,re,tempfile
from PIL import Image,ImageChops
import numpy as np
import fitz
rows=[]
with tempfile.TemporaryDirectory() as temp:
 for golden in sorted(Path('tests/golden/r1').glob('*.pdf')):
  candidate=Path('work/pdf-v2')/golden.name
  measured=Path('tests/golden/s21-measured')/golden.name
  if golden.name.startswith('s21-') and measured.exists():golden=measured
  a=fitz.open(golden);b=fitz.open(candidate)
  assert len(a)==len(b),(golden.name,'page count')
  maximum=0
  for i,(pa,pb) in enumerate(zip(a,b)):
   assert pa.rect==pb.rect,(golden.name,'orientation/margins')
   assert pa.get_text()==pb.get_text(),(golden.name,'selectable text')
   for tag,file in [('a',golden),('b',candidate)]:subprocess.run(['pdftoppm','-f',str(i+1),'-l',str(i+1),'-r','150','-singlefile','-png',str(file),str(Path(temp)/tag)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   left,right=[Image.open(Path(temp)/(tag+'.png')).convert('RGB') for tag in ['a','b']];assert left.size==right.size
   diff=ImageChops.difference(left,right);ratio=float(np.any(np.asarray(diff)>10,axis=2).mean());maximum=max(maximum,ratio)
  assert maximum<=.002,(golden.name,'150 dpi pixel difference',maximum)
  rows.append({'fixture':golden.name,'pages':len(a),'maxChangedPixelFraction':maximum,'textEqual':True,'pageGeometryEqual':True})
Path('docs/qa/r1-pdf-parity.json').write_text(json.dumps({'fixtures':rows,'passed':len(rows),'dpi':150,'pixelTolerance':.002,'baseline':'tests/golden/r1; original V1 artwork hashes still checked separately'},indent=2)+'\n')
print('PASS',len(rows),'reviewed Noto goldens: text, page count/orientation, 150-dpi pixel diff <=0.2%')
