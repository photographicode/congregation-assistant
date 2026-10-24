"""Independent vector + 400-dpi ink checks on fictional S-21 output. No goldens rewritten."""
import json, glob, sys
from pathlib import Path
import fitz
import numpy as np
reference=json.load(open('packages/pdf/template-cells.json'))['s21'][0]
squares=[c['square'] for c in reference['cells'] if c['ornament'] and c['baseline']>reference['height']/2]
assert len(squares)==33
roots=sys.argv[1:] or ['work/pdf-v2','work/pdf-s21-hardening']
files=sorted({name for root in roots for name in glob.glob(root+'/*s21*.pdf')})
assert files,'No generated S-21 fixtures'
count=0;raster_count=0;rows_checked=0;pages_checked=0;coverage=set();max_tick=0;max_row=0
row_tops=[158.35,176.26,193.99,211.72,229.46,247.28,265.01,282.74,300.47,318.29,336.02,353.75,371.84]
months={'September','October','November','December','January','February','March','April','May','June','July','August'}
scale=400/72
for filename in files:
 doc=fitz.open(filename)
 for page in doc:
  if page.rect.height>430:continue  # Separate A4 continuation notes, not record tables.
  words=page.get_text('words')
  labels=[w[0] for w in words if w[4] in ['Name:','Date'] and w[1]<90]
  assert len(labels)==3,(filename,'missing header labels',len(labels))
  assert max(labels)-min(labels)<=.2,(filename,'header alignment',labels)
  xs=[w[0] for w in words if w[4] in months]
  assert len(xs)==12,(filename,'missing month labels',len(xs))
  assert max(xs)-min(xs)<=.25,(filename,'month alignment',xs)
  assert all('NotoSans' in f[3] for f in page.get_fonts()),filename
  pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),colorspace=fitz.csGRAY)
  pixels=np.frombuffer(pix.samples,dtype=np.uint8).reshape(pix.height,pix.width)
  ticks=[d for d in page.get_drawings() if abs(d['width']-.9)<.01]
  for tick in ticks:
   r=tick['rect']; cy=page.rect.height-(r.y0+r.y1)/2;cx=(r.x0+r.x1)/2
   matches=[(i,b) for i,b in enumerate(squares) if abs(cx-(b['x']+b['w']/2))<=.4 and abs(cy-(b['y']-reference['height']/2+b['h']/2))<=.4]
   assert len(matches)==1,(filename,'tick centre',cx,cy)
   index,b=matches[0];top=reference['height']-b['y']-b['h'];half=tick['width']/2
   assert r.x0-half>=b['x']-.2 and r.x1+half<=b['x']+b['w']+.2 and r.y0-half>=top-.2 and r.y1+half<=top+b['h']+.2,(filename,'tick escapes measured square',index)
   # Exclude the original rectangle's border, retaining the complete tick stroke.
   x0=int((b['x']+.8)*scale);x1=int((b['x']+b['w']-.8)*scale)
   y0=int((top+.8)*scale);y1=int((top+b['h']-.8)*scale)
   ink=np.argwhere(pixels[y0:y1,x0:x1]<100)
   assert len(ink)>=6,(filename,'missing raster tick',index)
   centre=(ink.min(axis=0)+ink.max(axis=0))/2
   actual=((centre[1]+x0+.5)/scale,(centre[0]+y0+.5)/scale)
   expected=(b['x']+b['w']/2,top+b['h']/2)
   delta=max(abs(a-e) for a,e in zip(actual,expected));max_tick=max(max_tick,delta)
   assert delta<=.4,(filename,'400-dpi tick centre',index,actual,expected)
   coverage.add(index);count+=1;raster_count+=1
  for i,(top,bottom) in enumerate(zip(row_tops,row_tops[1:])):
   for label,left,right in [('month',20,115),('studies',182,232),('hours',323,374),('remarks',391,573)]:
    x0,x1=int(left*scale),int(right*scale);y0,y1=int((top+2)*scale),int((bottom-2)*scale)
    ink=np.argwhere(pixels[y0:y1,x0:x1]<100)
    if not len(ink):continue
    actual=(ink[:,0].min()+ink[:,0].max()+1)/(2*scale)+y0/scale
    delta=abs(actual-(top+bottom)/2);max_row=max(max_row,delta)
    assert delta<=1,(filename,'row visible-ink centre',i,label,delta)
    rows_checked+=1
  pages_checked+=1
assert count>0 and count==raster_count
if any('pdf-s21-hardening' in root for root in roots):assert len(coverage)==33,('All header/table positions must be checked',sorted(coverage))
report={'dpi':400,'files':len(files),'pages':pages_checked,'checkedTicks':count,'rasterTicks':raster_count,'coveredSquares':len(coverage),'visibleRows':rows_checked,'maxTickDeltaPt':round(max_tick,3),'maxRowDeltaPt':round(max_row,3),'hard':0}
Path('docs/qa/s21-measured-hardening.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
