"""Verify actual generated vector geometry and extracted text, using fictional PDFs."""
import json, glob, fitz
reference=json.load(open('packages/pdf/template-cells.json'))['s21'][0]
squares=[c['square'] for c in reference['cells'] if c['ornament'] and c['baseline']>reference['height']/2]
assert len(squares)==33
count=0
for filename in glob.glob('work/pdf-v2/*s21*.pdf'):
 doc=fitz.open(filename)
 for page in doc:
  if page.rect.height>430:continue
  drawings=page.get_drawings()
  ticks=[d for d in drawings if abs(d['width']-.9)<.01]
  for tick in ticks:
   r=tick['rect']; cy=page.rect.height-(r.y0+r.y1)/2;cx=(r.x0+r.x1)/2
   matches=[b for b in squares if abs(cx-(b['x']+b['w']/2))<=.4 and abs(cy-(b['y']-reference['height']/2+b['h']/2))<=.4]
   assert matches,(filename,'off-centre tick',cx,cy)
   b=matches[0];assert r.width+.9<=b['w']+.4 and r.height+.9<=b['h']+.4
   count+=1
  words=page.get_text('words')
  months={'September','October','November','December','January','February','March','April','May','June','July','August'}
  xs=[w[0] for w in words if w[4] in months]
  assert not xs or max(xs)-min(xs)<=.25,(filename,'months',xs)
  labels=[w[0] for w in words if w[4] in ['Name:','Date'] and w[1]<90]
  assert not labels or max(labels)-min(labels)<=.2,(filename,'headers',labels)
  assert all('NotoSans' in f[3] for f in page.get_fonts()),filename
assert count>0,'No checked boxes tested'
print('PASS measured S-21 rectangles, tick centres/containment, header/month alignment, Noto fonts:',count,'ticks')
