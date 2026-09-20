"""Download recorded parts and join them into assets/audio/<slug>.mp3.

Usage: python3 tools/fetch-parts.py <slug> <url-part1> <url-part2> ...
Writes the joined MP3 plus a .sha1 sidecar so build-audio.mjs treats it as current."""
import sys, subprocess, pathlib, urllib.request, hashlib
slug, urls = sys.argv[1], sys.argv[2:]
tmp = pathlib.Path("/tmp/claude-0/-home-user-skala/065a16b6-243a-5070-a5e0-858e967524ef/scratchpad/parts"); tmp.mkdir(parents=True, exist_ok=True)
files = []
for i, u in enumerate(urls, 1):
    f = tmp / f"{slug}.part{i}.mp3"
    with urllib.request.urlopen(u, timeout=120) as r, open(f, "wb") as o: o.write(r.read())
    files.append(str(f)); print(f"part {i}: {f.stat().st_size/1048576:.2f} MB")
out = pathlib.Path("assets/audio"); out.mkdir(exist_ok=True)
subprocess.run(["python3", "tools/join-mp3.py", str(out / f"{slug}.mp3"), *files], check=True)
script = subprocess.run(["node", "tools/build-audio.mjs", "--dry-run", slug], capture_output=True, text=True, check=True).stdout
text = script.split(f"===== {slug} =====\n", 1)[1].rsplit("\n\n", 1)[0].strip()
sha = hashlib.sha1((text + "|hLygPNd2gK6Azddorc5W|eleven_multilingual_v2|connector").encode()).hexdigest()
(out / f"{slug}.sha1").write_text(sha + "\n")
print(f"joined -> {out / (slug + '.mp3')} ({(out / (slug + '.mp3')).stat().st_size/1048576:.2f} MB)")
