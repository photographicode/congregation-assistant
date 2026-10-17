"""Prepare OFL print fonts, preserving V1's standard Helvetica vertical metrics.
Source: pinned @fontsource/arimo Latin WOFFs (OFL-1.1). Glyphs/widths unchanged.
V1 uses StandardFonts.Helvetica/HelveticaBold: ascender 718, descender -207.
Changing the font descriptor metrics keeps the original field baselines/text bounds.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
root=Path('assets/fonts')
for weight,name in [(400,'Regular'),(700,'Bold')]:
 font=TTFont(f'node_modules/@fontsource/arimo/files/arimo-latin-{weight}-normal.woff')
 units=font['head'].unitsPerEm
 font['hhea'].ascent=font['OS/2'].sTypoAscender=round(units*.718)
 font['hhea'].descent=font['OS/2'].sTypoDescender=round(units*-.207)
 for name_id,value in [(1,'CA Print Sans'),(2,name),(3,'CA Print Sans '+name+' OFL'),(4,'CA Print Sans '+name),(6,'CAPrintSans-'+name)]:
  font['name'].setName(value,name_id,3,1,0x409)
 font.flavor=None;font['head'].created=font['head'].modified=3800000000
 font.save(root/f'Arimo-{name}.ttf')
print('Prepared OFL CA Print Sans from Arimo; original V1 vertical metrics preserved.')
