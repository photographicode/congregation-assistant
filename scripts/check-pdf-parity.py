"""Real generated golden parity. Text, coordinates, page geometry and rendered pixels."""
from pathlib import Path
import subprocess,json,re,tempfile
from xml.etree import ElementTree as ET
from PIL import Image,ImageChops
import numpy as np
root=Path('tests/golden/v1');candidate=Path('work/pdf-v2');rows=[]
def inspect(file):
 raw=subprocess.run(['pdftotext','-bbox',str(file),'-'],capture_output=True,text=True,check=True).stdout
 raw=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]','',raw)
 return ET.fromstring(raw).findall('.//{*}page')
with tempfile.TemporaryDirectory() as directory:
 for original in sorted(root.glob('*.pdf')):
  other=candidate/original.name;a,b=inspect(original),inspect(other);assert len(a)==len(b),(original.name,'page count')
  max_delta=0;max_pixels=0
  for i,(pa,pb) in enumerate(zip(a,b)):
   assert pa.attrib==pb.attrib,(original.name,'page geometry')
   wa,wb=pa.findall('{*}word'),pb.findall('{*}word');assert [w.text for w in wa]==[w.text for w in wb],(original.name,'page text',i)
   for left,right in zip(wa,wb):
    for key in ['xMin','yMin','xMax','yMax']:max_delta=max(max_delta,abs(float(left.attrib[key])-float(right.attrib[key])))
   for tag,file in [('a',original),('b',other)]:subprocess.run(['pdftoppm','-f',str(i+1),'-l',str(i+1),'-singlefile','-scale-to','800','-png',str(file),str(Path(directory)/tag)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
   image_a,image_b=[Image.open(Path(directory)/(tag+'.png')).convert('RGB') for tag in ['a','b']]
   assert image_a.size==image_b.size
   diff=ImageChops.difference(image_a,image_b);ratio=float(np.any(np.asarray(diff)>10,axis=2).mean());max_pixels=max(max_pixels,ratio)
  tolerance=.01 if original.name.startswith('s21-') else 1.5
  assert max_delta<=tolerance,(original.name,'field coordinates',max_delta)
  pixel_tolerance=.001 if original.name.startswith('s21-') else .08
  assert max_pixels<=pixel_tolerance,(original.name,'pixel difference',max_pixels)
  rows.append({'fixture':original.stem,'pages':len(a),'maxCoordinateDeltaPt':max_delta,'maxChangedPixelFraction':max_pixels,'textEqual':True})
report_file=Path('docs/review-evidence/pdf-parity.json')
report_file.write_text(json.dumps({'fixtures':rows,'passed':len(rows),'total':len(rows),'renderPixels':800,'coordinateTolerancePt':{'s21':.01,'embeddedLatinBounds':1.5},'pixelTolerance':{'s21':.001,'embeddedLatinOutlines':.08}},indent=2)+'\n')
print('PASS real PDF parity:',len(rows),'fixtures; extracted text, geometry, coordinates and rendered pixels within documented tolerances')

Path('work/pdf-parity-report.json').write_text(report_file.read_text())
