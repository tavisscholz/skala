"""Convert supplied photographs into the sizes the site expects.

Usage:  python3 tools/prepare-images.py <source-dir>

Reads the mapping below, finds each source file in <source-dir>, converts to
high-contrast greyscale WebP at the target width, and writes to assets/images/.
Requires Pillow (pip install pillow).
"""
import sys, pathlib
from PIL import Image, ImageOps

# source filename (any extension) -> (output name, target width)
MAPPING = {
    "hero-operators-walking": ("hero-operators-walking.webp", 1600),
    "campaign-team-huddle": ("campaign-team-huddle.webp", 1200),
    "approach-opening-prep": ("approach-opening-prep.webp", 1200),
    "notes-review-desk": ("notes-review-desk.webp", 1200),
}

src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "assets/images/source")
out = pathlib.Path("assets/images"); out.mkdir(parents=True, exist_ok=True)
found = 0
for stem, (name, width) in MAPPING.items():
    matches = [p for p in src.iterdir() if p.stem == stem] if src.exists() else []
    if not matches:
        print(f"missing  {stem}.*  (expected in {src})"); continue
    im = Image.open(matches[0]); im = ImageOps.exif_transpose(im).convert("L")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im = ImageOps.autocontrast(im, cutoff=1)
    im.save(out / name, "WEBP", quality=82, method=6)
    print(f"wrote    {out / name}  {im.width}x{im.height}"); found += 1
print(f"{found}/{len(MAPPING)} images prepared")
