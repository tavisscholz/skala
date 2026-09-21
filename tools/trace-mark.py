"""Trace a black-on-white brush drawing into an SVG path for the site mark.

Usage: python3 tools/trace-mark.py <png> [--width 600] [--alphamax 0.6] [--turd 40]
Prints the viewBox and the path data, scaled so the drawing spans 64 units wide."""
import sys, argparse
from PIL import Image
import numpy as np, potrace
ap = argparse.ArgumentParser(); ap.add_argument('png'); ap.add_argument('--width', type=int, default=600)
ap.add_argument('--alphamax', type=float, default=0.6); ap.add_argument('--turd', type=int, default=40); ap.add_argument('--tol', type=float, default=0.4)
a = ap.parse_args()
im = Image.open(a.png).convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
g = bg.convert('L'); g = g.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)
bits = np.array(g) < 128
path = potrace.Bitmap(~bits).trace(turdsize=a.turd, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=a.alphamax, opticurve=True, opttolerance=a.tol)
pts = []
def collect(x, y): pts.append((x, y))
segs = []
for curve in path:
    x0, y0 = curve.start_point.x, curve.start_point.y; collect(x0, y0); d = [f"M{x0:.2f} {y0:.2f}"]
    for s in curve.segments:
        if s.is_corner:
            d.append(f"L{s.c.x:.2f} {s.c.y:.2f} L{s.end_point.x:.2f} {s.end_point.y:.2f}"); collect(s.c.x, s.c.y); collect(s.end_point.x, s.end_point.y)
        else:
            d.append(f"C{s.c1.x:.2f} {s.c1.y:.2f} {s.c2.x:.2f} {s.c2.y:.2f} {s.end_point.x:.2f} {s.end_point.y:.2f}"); collect(s.c1.x, s.c1.y); collect(s.c2.x, s.c2.y); collect(s.end_point.x, s.end_point.y)
    d.append("Z"); segs.append(d)
xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
scale = 64 / (maxx - minx)
import re
def tr(d):
    out = []
    for tok in d:
        nums = re.findall(r'-?\d+\.?\d*', tok); cmd = tok[0]
        if cmd == 'Z': out.append('Z'); continue
        vals = [float(n) for n in nums]; conv = []
        for i in range(0, len(vals), 2):
            conv.append(f"{(vals[i]-minx)*scale:.1f} {(vals[i+1]-miny)*scale:.1f}")
        out.append(cmd + (' L'.join(conv) if cmd == 'L' else ' '.join(conv)) if cmd != 'L' else 'L' + ' L'.join(conv))
    return ''.join(out)
d = ''.join(tr(s) for s in segs)
h = (maxy - miny) * scale
print(f"VIEWBOX 0 0 64 {h:.1f}")
print(f'<path fill-rule="evenodd" d="{d}"/>')
