"""Join MP3 parts into one file without re-encoding.

Usage: python3 tools/join-mp3.py out.mp3 part1.mp3 part2.mp3 ...
Keeps only the MPEG audio frames: ID3 tags and Xing/Info headers are dropped so
players compute the duration from the whole file. Parts must share sample rate,
bitrate mode and channel layout, which recordings from one voice and model do."""
import sys
BITRATES = {1: [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320], 2: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160]}
RATES = {3: [44100,48000,32000], 2: [22050,24000,16000], 0: [11025,12000,8000]}
def frames(data):
    i = 0
    if data[:3] == b"ID3":
        size = ((data[6]&0x7f)<<21)|((data[7]&0x7f)<<14)|((data[8]&0x7f)<<7)|(data[9]&0x7f); i = 10 + size
    n = len(data)
    while i + 4 <= n:
        b1,b2,b3 = data[i],data[i+1],data[i+2]
        if b1 != 0xFF or (b2 & 0xE0) != 0xE0: i += 1; continue
        ver = (b2>>3)&3; layer = (b2>>1)&3; br = (b3>>4)&15; sr = (b3>>2)&3; pad = (b3>>1)&1
        if ver == 1 or layer != 1 or br in (0,15) or sr == 3: i += 1; continue
        v = 1 if ver == 3 else 2
        bitrate = BITRATES[v][br]*1000; rate = RATES[ver][sr]
        length = (144000 if v == 1 else 72000) * bitrate // (rate * 1000 // 1000) // 1 if False else ((144 if v == 1 else 72) * bitrate // rate) + pad
        if length < 24 or i + length > n: i += 1; continue
        f = data[i:i+length]
        if b"Xing" in f[:64] or b"Info" in f[:64]: i += length; continue
        yield f; i += length
out, parts = sys.argv[1], sys.argv[2:]
with open(out, "wb") as o:
    total = 0
    for p in parts:
        for f in frames(open(p, "rb").read()): o.write(f); total += 1
print(f"wrote {out}: {total} frames from {len(parts)} parts")
