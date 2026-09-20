"""Split a play's reading script into parts under the connector's 5,000-character prompt cap.

Usage: python3 tools/audio-parts.py <slug> [max_chars]
Reads the script from `node tools/build-audio.mjs --dry-run <slug>` and writes
scratch files <slug>.part1.txt, <slug>.part2.txt ... next to this script's output dir
(printed on stdout). Splits only at blank lines, so every seam lands between sections."""
import subprocess, sys, pathlib, os
slug = sys.argv[1]; limit = int(sys.argv[2]) if len(sys.argv) > 2 else 4800
out = subprocess.run(["node", "tools/build-audio.mjs", "--dry-run", slug], capture_output=True, text=True, check=True).stdout
text = out.split(f"===== {slug} =====\n", 1)[1].rsplit("\n\n", 1)[0].strip() if "=====" in out else out.strip()
blocks = [b.strip() for b in text.split("\n\n") if b.strip()]
parts, cur = [], ""
for b in blocks:
    if cur and len(cur) + 2 + len(b) > limit:
        parts.append(cur); cur = b
    else:
        cur = (cur + "\n\n" + b) if cur else b
if cur: parts.append(cur)
outdir = pathlib.Path(os.environ.get("AUDIO_PARTS_DIR", "/tmp/claude-0/-home-user-skala/065a16b6-243a-5070-a5e0-858e967524ef/scratchpad/parts")); outdir.mkdir(parents=True, exist_ok=True)
for i, p in enumerate(parts, 1):
    f = outdir / f"{slug}.part{i}.txt"; f.write_text(p + "\n"); print(f"{f}  {len(p)} chars")
