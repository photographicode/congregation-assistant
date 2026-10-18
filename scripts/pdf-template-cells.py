"""Extract official reference positions; never modify the supplied originals."""
from pathlib import Path
import fitz,json
result={}
for name in ['s21','s3','s88']:
 doc=fitz.open('assets/pdf-templates/'+name+'.pdf');pages=[]
 for page in doc:
  assert not page.get_xobjects(),'Review nested template artwork before converting'
  spans=[s for b in page.get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans']]
  pages.append({'width':page.rect.width,'height':page.rect.height,'cells':[{'text':s['text'],'x':s['origin'][0],'baseline':page.rect.height-s['origin'][1],'width':s['bbox'][2]-s['bbox'][0],'size':s['size'],'bold':any(x in s['font'].lower() for x in ['bold','tbol','sem']),'ornament':'ornament' in s['font'].lower()} for s in spans]})
 result[name]=pages
Path('packages/pdf/template-cells.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
