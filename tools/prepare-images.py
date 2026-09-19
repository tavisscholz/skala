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
    "SKALA_01_store_floor_hero": ("hero-store-floor.webp", 1600),
    "campaign-team-training": ("campaign-team-training.webp", 1200),
    "approach-before-doors-open": ("approach-before-doors-open.webp", 1200),
    "SKALA_18_between_locations": ("about-between-locations.webp", 900),
    "SKALA_21_onboarding_swag": ("join-onboarding-swag.webp", 1200),
    "SKALA_09_the_field_notebook": ("notes-field-notebook.webp", 1200),
    # merch product shots, uploaded to assets/images as "SKALA <item>.png"; kept in colour
    "SKALA tee": ("merch-tee.webp", 1200),
    "SKALA cap": ("merch-hat.webp", 1200),
    "SKALA jacket": ("merch-jacket.webp", 1200),
    "SKALA book": ("merch-field-book.webp", 1200),
}
COLOUR = {name for stem, (name, _) in MAPPING.items() if stem.startswith("SKALA ")}
# landscape sources that fill a portrait slot: (aspect w, aspect h, focus as a fraction of the width)
CROP = {"SKALA_18_between_locations": (2, 3, 0.455)}

src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "assets/images/source")
out = pathlib.Path("assets/images"); out.mkdir(parents=True, exist_ok=True)
found = 0
for stem, (name, width) in MAPPING.items():
    matches = [p for d in (src, out) if d.exists() for p in d.iterdir() if p.stem == stem and p.suffix.lower() != ".webp"]
    if not matches:
        print(f"missing  {stem}.*  (expected in {src})"); continue
    im = Image.open(matches[0]); im = ImageOps.exif_transpose(im)
    im = im.convert("RGB") if name in COLOUR else im.convert("L")
    if stem in CROP:
        aw, ah, focus = CROP[stem]
        cw = min(im.width, round(im.height * aw / ah))
        left = min(max(round(im.width * focus - cw / 2), 0), im.width - cw)
        im = im.crop((left, 0, left + cw, im.height))
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    if name not in COLOUR:
        im = ImageOps.autocontrast(im, cutoff=1)
    im.save(out / name, "WEBP", quality=82, method=6)
    print(f"wrote    {out / name}  {im.width}x{im.height}"); found += 1
print(f"{found}/{len(MAPPING)} images prepared")
