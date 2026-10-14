"""Convert licensed Nimbus outlines to embedded TrueType; preserve AFM-compatible metrics."""
from fontTools.ttLib import TTFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from pathlib import Path
for weight in ['Regular','Bold']:
 source=TTFont('assets/fonts/NimbusSans-'+weight+'.otf');glyph_set=source.getGlyphSet();glyphs={}
 for name in source.getGlyphOrder():
  pen=TTGlyphPen(glyph_set);glyph_set[name].draw(Cu2QuPen(pen,max_err=.5,reverse_direction=True));glyphs[name]=pen.glyph()
 builder=FontBuilder(source['head'].unitsPerEm,isTTF=True);builder.setupGlyphOrder(source.getGlyphOrder());builder.setupCharacterMap(source.getBestCmap());builder.setupGlyf(glyphs);builder.setupHorizontalMetrics(source['hmtx'].metrics);builder.setupHorizontalHeader(ascent=source['hhea'].ascent,descent=source['hhea'].descent,lineGap=source['hhea'].lineGap);builder.setupNameTable({'familyName':'Nimbus Sans Embedded','styleName':weight,'uniqueFontIdentifier':'Nimbus Sans Embedded '+weight,'fullName':'Nimbus Sans Embedded '+weight,'psName':'NimbusSansEmbedded-'+weight,'version':'Version 1.0'});builder.setupOS2(sTypoAscender=source['OS/2'].sTypoAscender,sTypoDescender=source['OS/2'].sTypoDescender,usWinAscent=source['OS/2'].usWinAscent,usWinDescent=source['OS/2'].usWinDescent);builder.setupPost();builder.setupMaxp();builder.font['head'].created=builder.font['head'].modified=3800000000;builder.save('assets/fonts/NimbusSans-'+weight+'.ttf')
print('Prepared embedded metric-compatible Nimbus fonts')
