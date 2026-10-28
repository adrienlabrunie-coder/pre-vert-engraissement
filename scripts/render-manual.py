"""Render the supplied Idele PDF without redrawing anatomical diagrams.
Usage: python scripts/render-manual.py /path/to/Manuel_pointage_vdef3.pdf
Printed page n is PDF page n+1 in this supplied edition.
"""
import sys
from pathlib import Path
import fitz
from PIL import Image
pages = [23,24,25,26,27,28,31,32,33,34,35,36,37,38,39,40,41,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,63,64,65,66,69]
doc = fitz.open(sys.argv[1])
output = Path('public/manual'); output.mkdir(parents=True, exist_ok=True)
for n in pages:
    page = doc[n]
    pix = page.get_pixmap(matrix=fitz.Matrix(1.8,1.8), alpha=False)
    image = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
    image.save(output / f'idele-2014-p{n}.webp', 'WEBP', quality=86, method=6)
print(f'{len(pages)} pages rendered, {sum(p.stat().st_size for p in output.glob("*.webp"))//1024} KiB')
