"""Measure visible numeric ink in the original publisher-card fixture, independently of font metrics."""
import json
import re
import subprocess
import sys
from pathlib import Path

file = Path(sys.argv[1] if len(sys.argv) > 1 else 'artifacts/pdf-check/s21.pdf')
dpi = 360
raw = subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-r', str(dpi), '-gray', '-singlefile', str(file)], capture_output=True, check=True).stdout
header = re.match(rb'P5\s+(\d+)\s+(\d+)\s+255\s', raw)
assert header, 'Expected a grayscale Poppler render'
width, height = map(int, header.groups())
pixels = raw[header.end():]
assert len(pixels) == width * height
scale = dpi / 72
row_tops = [219 + 24*i for i in range(13)]
regions = [(f'{kind}-{i+1}', cx, row_tops[i], row_tops[i+1]) for i in range(12) for kind,cx in [('studies',226),('hours',365)]] + [('total-hours',365,507,533)]
results = []
for label,cx,top,bottom in regions:
    x0,x1 = int((cx-25)*scale), int((cx+25)*scale)
    y0,y1 = int((top+2)*scale), int((bottom-2)*scale)
    ink = [(x,y) for y in range(y0,y1) for x in range(x0,x1) if pixels[y*width+x] < 100]
    assert ink, f'Missing numeric fixture value: {label}'
    xs,ys = zip(*ink)
    x = (min(xs)+max(xs)+1)/(2*scale)
    y = (min(ys)+max(ys)+1)/(2*scale)
    dx,dy = x-cx, y-(top+bottom)/2
    assert abs(dx) <= .5 and abs(dy) <= .5, f'{label} is off-centre: ({dx:.3f}, {dy:.3f}) pt'
    results.append({'cell':label,'dx':round(dx,3),'dy':round(dy,3)})
file.with_name('s21-visible-ink-alignment.json').write_text(json.dumps(results,indent=2))
print(f'PASS {len(results)} original-card numeric values centred within 0.5 pt in the Poppler render; physical printing remains separate.')
