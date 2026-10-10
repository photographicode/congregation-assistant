"""Check rendered PDF text stays within pages; optionally render samples with Poppler."""
import argparse
import shutil
import re
import subprocess
from pathlib import Path
from xml.etree import ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
parser.add_argument('--render', action='store_true')
args = parser.parse_args()
pdftotext = '/usr/bin/pdftotext' if Path('/usr/bin/pdftotext').exists() else shutil.which('pdftotext')
if not pdftotext:
    raise SystemExit('Install Poppler to check PDF text coordinates.')
for file in sorted(args.directory.glob('*.pdf')):
    xml = subprocess.run([pdftotext, '-bbox', str(file), '-'], capture_output=True, text=True, check=True).stdout
    # Malformed glyph text can extract as XML control characters.
    xml = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", xml)
    document = ET.fromstring(xml)
    pages = document.findall('.//{*}page')
    count = 0
    for page in pages:
        width, height = float(page.attrib['width']), float(page.attrib['height'])
        for word in page.findall('{*}word'):
            coords = {key: float(word.attrib[key]) for key in ['xMin', 'yMin', 'xMax', 'yMax']}
            assert coords['xMin'] >= -1 and coords['yMin'] >= -1, (file.name, word.text, coords)
            assert coords['xMax'] <= width + 1 and coords['yMax'] <= height + 1, (file.name, word.text, coords)
            count += 1
    print(f'PASS {file.name}: {len(pages)} pages, {count} words within page bounds')
    if args.render:
        renderer = '/usr/bin/pdftoppm' if Path('/usr/bin/pdftoppm').exists() else shutil.which('pdftoppm')
        if not renderer:
            raise SystemExit('Install Poppler to render sample PDFs.')
        subprocess.run([renderer, '-r', '300', '-png', str(file), str(file.with_suffix(''))], check=True, stderr=subprocess.DEVNULL)
