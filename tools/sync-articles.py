"""Sync assets/articles/ from the canonical articles repository.

The canonical source for every article is github.com/tavisscholz/articles
(one markdown file with YAML front matter per piece). This script converts
that format back into the native layout build-notes.py parses (H1, date,
standfirst, body) and writes assets/articles/manifest.json, which
build-notes.py prefers over its hardcoded ARTICLES table.

Usage: python3 tools/sync-articles.py [path-to-articles-checkout]
       (default: ../articles — a sibling checkout)

Run by .github/workflows/sync-articles.yml on a schedule; safe to run by
hand. Only articles with `sites: both` or `sites: skala` are published here.
"""
import html, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/articles"


def front_matter(text):
    if not text.startswith("---"):
        return None, text
    end = text.find("\n---", 3)
    if end == -1:
        return None, text
    meta = {}
    for line in text[3:end].split("\n"):
        k = line.find(":")
        if k == -1:
            continue
        v = line[k + 1 :].strip()
        if v.startswith('"') and v.endswith('"'):
            v = v[1:-1].replace('\\"', '"').replace("\\\\", "\\")
        meta[line[:k].strip()] = v
    body = text[end + 4 :]
    return meta, body.lstrip("\n")


def main():
    src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parent / "articles")
    posts = []
    for f in sorted((src / "articles").glob("*.md")):
        if f.name.startswith("_"):
            continue
        meta, body = front_matter(f.read_text())
        if not meta or meta.get("sites", "both") == "personal":
            continue
        posts.append((meta, body))
    if not posts:
        raise SystemExit("no articles found — refusing to write an empty set")

    posts.sort(key=lambda p: int(p[0].get("order", 999)))
    manifest = []
    for meta, body in posts:
        slug = meta["slug"]
        native = (
            f"# {meta['title']}\n\n{meta['date']}\n\n*{meta['stand']}*\n\n\n{body.strip()}\n"
        )
        (OUT / f"{slug}.md").write_text(native)
        manifest.append(
            dict(
                slug=slug,
                laneTag=meta.get("laneTag", ""),
                lane=html.escape(meta.get("lane", ""), quote=False),
                featured=meta.get("featured", "false") == "true",
            )
        )
    closer = src / "shared/skala-closer.md"
    if closer.exists():
        (OUT / "_closer.md").write_text(closer.read_text())
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"synced {len(manifest)} articles from {src}")


if __name__ == "__main__":
    main()
