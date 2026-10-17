from pathlib import Path
from fontTools.ttLib import TTFont
for script in ['Devanagari','Tamil','Malayalam','Kannada','Telugu','Bengali','Gujarati','Gurmukhi']:
 for weight in ['Regular','Bold']:
  source=Path('assets/fonts')/f'NotoSans{script}-{weight}.ttf'
  target=source.with_suffix('.woff2')
  font=TTFont(source)
  if not any(r.nameID==13 and 'SIL Open Font License' in r.toUnicode() for r in font['name'].names): raise ValueError(f'Unverified embedded OFL license: {source}')
  font.flavor='woff2';font.save(target)
  print(target.name, target.stat().st_size)
