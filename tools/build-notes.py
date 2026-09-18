"""Build the Playbook from assets/articles/*.md.

Writes:
  - the compact Playbook band on index.html (between notes markers)
  - the article dialogs on index.html (between dialog markers)
  - playbook.html, the full page

Usage: python3 tools/build-notes.py
"""
import re, html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
ARTICLES = [  # order on the page, lane tag, lane name
    ("your-best-manager-cannot-be-the-whole-system", "OPS", "Store Operations"),
    ("a-good-site-can-still-be-the-wrong-site", "RE", "Real Estate &amp; Leasing"),
    ("financially-qualified-is-not-the-same-as-franchise-ready", "FRAN", "Franchise Development"),
    ("opening-critical-dates-checklist", "DEV", "Store Development"),
]
ACCENTS = ["orange", "periwinkle", "orange", "periwinkle"]
RINGS = [
    "M60 8 C 92 4, 116 26, 113 58 C 110 92, 84 114, 54 111 C 22 108, 4 84, 8 54 C 12 24, 34 10, 60 8 Z",
    "M58 9 C 90 3, 115 28, 112 60 C 109 90, 86 113, 56 110 C 24 107, 5 82, 9 52 C 13 22, 32 12, 58 9 Z",
    "M62 7 C 94 6, 114 30, 112 62 C 110 92, 86 112, 56 110 C 26 108, 6 84, 8 54 C 10 26, 36 8, 62 7 Z",
    "M57 8 C 90 2, 116 24, 114 56 C 112 90, 88 114, 56 112 C 24 110, 4 86, 8 56 C 12 26, 30 12, 57 8 Z",
]
PULL = "The strongest performer becomes the biggest single point of failure."
QUOTES = {  # one line from each piece, shown while its row is hovered
    "your-best-manager-cannot-be-the-whole-system": "The strongest performer becomes the biggest single point of failure.",
    "a-good-site-can-still-be-the-wrong-site": "The address was fine. The market wasn\u2019t.",
    "financially-qualified-is-not-the-same-as-franchise-ready": "Proxies get treated as the whole answer.",
    "opening-critical-dates-checklist": "A schedule with no room for either isn\u2019t a schedule, it\u2019s a hope.",
}
MONTHS = "January February March April May June July August September October November December".split()

def esc(t): return html.escape(t, quote=False).replace("--", "—")
def inline(t):
    t = esc(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"\*(.+?)\*", r"<em>\1</em>", t)
    return t

def parse(slug):
    md = (ROOT / "assets/articles" / f"{slug}.md").read_text().strip().split("\n")
    title = md[0].lstrip("# ").strip()
    y, m, d = md[2].strip().split("-")
    date = f"{int(d)} {MONTHS[int(m)-1]} {y}"
    stand = md[4].strip().strip("*")
    kind = "Play"
    body = md[7:]
    out, k = [], 0
    while k < len(body):
        l = body[k].rstrip()
        if not l: k += 1; continue
        if l.startswith("## "):
            out.append(f'<h3 class="note-article__sub">{esc(l[3:])}</h3>'); k += 1; continue
        if l.startswith("|"):
            tbl = []
            while k < len(body) and body[k].startswith("|"):
                tbl.append([c.strip() for c in body[k].strip().strip("|").split("|")]); k += 1
            t = '<div class="note-table__wrap"><table class="note-table"><thead><tr>' + "".join(f'<th scope="col">{esc(h)}</th>' for h in tbl[0]) + "</tr></thead><tbody>"
            for r in tbl[2:]: t += f"<tr><td>{inline(r[0])}</td><td>{inline(r[1])}</td></tr>"
            out.append(t + "</tbody></table></div>"); continue
        if l.startswith("**This week:**"):
            out.append(f'<aside class="note-article__week"><p class="note-article__week-label">This week</p><p>{inline(l[len("**This week:**"):].strip())}</p></aside>'); k += 1; continue
        out.append(f"<p>{inline(l)}</p>"); k += 1
    return dict(slug=slug, title=title, date=date, stand=stand, kind=kind, body="\n        ".join(out))

notes = []
for i, (slug, tag, lane) in enumerate(ARTICLES, start=1):
    n = parse(slug); n.update(i=i, tag=tag, lane=lane, accent=ACCENTS[i-1], ring=RINGS[i-1]); notes.append(n)

# ---------- stacked pull quote (default + one per play; sized by the tallest) ----------
quote_stack = f'<span class="notes__pull-item is-active" data-quote-for="default">{esc(PULL)}</span>' + "".join(
    f'<span class="notes__pull-item" data-quote-for="{slug}" aria-hidden="true">{esc(q)}</span>' for slug, q in QUOTES.items() if q != PULL)

# ---------- homepage band ----------
rows = "\n".join(f'''          <li class="note-line" data-quote-for="{n['slug'] if QUOTES[n['slug']] != PULL else 'default'}">
            <button class="note-line__button" type="button" data-open-note="note-{n['i']}">
              <span class="note__tag" aria-hidden="true">{n['tag']}</span>
              <span class="note-line__text">
                <span class="note-line__title">{esc(n['title'])}</span>
                <span class="note-line__stand"><span class="note-line__kind">{n['kind']}</span> {esc(n['stand'])}</span>
              </span>
              <span class="arrow" aria-hidden="true">→</span>
            </button>
          </li>''' for n in notes)
band = f'''<!-- notes:start -->
    <section class="section section--paper notes" id="playbook" aria-labelledby="notes-title">
      <div class="container notes__grid">
        <div class="notes__intro reveal">
          <p class="eyebrow">Playbook</p>
          <h2 class="section-title" id="notes-title">Plays from the work.</h2>
          <p class="section-intro">Practical notes and working tools on building a business that can keep moving. Open one here, or take the whole playbook with you.</p>
          <p class="notes__pull brush" aria-live="polite">{quote_stack}</p>
        </div>
        <ul class="note-lines reveal">
{rows}
          <li class="note-lines__all"><a class="text-link" href="playbook.html">Open the full playbook <span class="arrow" aria-hidden="true">→</span></a></li>
        </ul>
      </div>
    </section>
    <!-- notes:end -->'''

# ---------- dialogs ----------
dialogs = "\n\n".join(f'''  <dialog class="note-dialog" id="note-{n['i']}" aria-labelledby="note-{n['i']}-heading">
    <article class="note-article">
      <div class="note-article__top">
        <p class="eyebrow">{n['kind']} {n['i']} · <span class="note-article__lane">{n['lane']}</span></p>
        <button class="text-button note-dialog__close" type="button" data-close-note><span class="arrow" aria-hidden="true">←</span> Back</button>
      </div>
      <h2 class="note-article__title" id="note-{n['i']}-heading" tabindex="-1">{esc(n['title'])}</h2>
      <p class="note-article__stand">{esc(n['stand'])}</p>
      <p class="note-article__byline">Tavis Scholz · {n['date']}</p>
      <div class="note-article__body">
        {n['body']}
      </div>
      <div class="note-article__foot">
        <button class="button button--ink" type="button" data-close-note><span class="arrow" aria-hidden="true">←</span> Back</button>
        <a class="text-link" href="playbook.html#{n['slug']}">Open in the playbook <span class="arrow" aria-hidden="true">→</span></a>
      </div>
    </article>
  </dialog>''' for n in notes)
dialogs = "<!-- dialogs:start -->\n" + dialogs + "\n  <!-- dialogs:end -->"

idx = ROOT / "index.html"; s = idx.read_text()
s = re.sub(r"<!-- notes:start -->.*?<!-- notes:end -->", lambda m: band, s, flags=re.S)
s = re.sub(r"<!-- dialogs:start -->.*?<!-- dialogs:end -->", lambda m: dialogs, s, flags=re.S)
idx.write_text(s)

# ---------- full page ----------
head = s[s.index("<head>"):s.index("</head>")+7]
head = head.replace("<title>SKALA — Real operators. Bigger tomorrows.</title>", "<title>Playbook — SKALA</title>")
head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="The SKALA playbook: practical plays and working tools on store operations, store development, real estate, and franchise growth.">', head)
head = head.replace('<link rel="preload" href="assets/fonts/inter-variable-latin.woff2"', '<link rel="preload" href="assets/fonts/inter-variable-latin.woff2"')
svgdefs = s[s.index('  <svg class="svg-defs"'):s.index("</svg>", s.index('  <svg class="svg-defs"'))+6]
header = s[s.index('  <header class="site-header"'):s.index("</header>")+9]
header = header.replace('href="#top" aria-label="SKALA — back to top"', 'href="index.html" aria-label="SKALA — home"')
header = header.replace('href="#work"', 'href="index.html#work"').replace('href="#approach"', 'href="index.html#approach"').replace('href="#about"', 'href="index.html#about"').replace('href="#contact"', 'href="index.html#contact"')
header = header.replace('<a class="nav-link" href="#playbook">Playbook</a>', '<a class="nav-link" href="playbook.html" aria-current="page">Playbook</a>')
footer = s[s.index('  <footer class="site-footer">'):s.index("</footer>")+9]
footer = footer.replace('href="#top"', 'href="index.html"').replace('href="#work"', 'href="index.html#work"').replace('href="#about"', 'href="index.html#about"').replace('href="#contact"', 'href="index.html#contact"')

index_links = "\n".join(f'            <li data-quote-for="{n["slug"] if QUOTES[n["slug"]] != PULL else "default"}"><a href="#{n["slug"]}"><span class="note__tag" aria-hidden="true">{n["tag"]}</span><span>{esc(n["title"])}</span></a></li>' for n in notes)
articles = "\n\n".join(f'''        <article class="fn-article reveal" id="{n['slug']}" aria-labelledby="{n['slug']}-title">
          <div class="note-article__top">
            <p class="eyebrow"><span class="note__tag" aria-hidden="true">{n['tag']}</span> {n['kind']} {n['i']} · <span class="note-article__lane">{n['lane']}</span></p>
          </div>
          <h2 class="note-article__title" id="{n['slug']}-title">{esc(n['title'])}</h2>
          <p class="note-article__stand">{esc(n['stand'])}</p>
          <p class="note-article__byline">Tavis Scholz · {n['date']}</p>
          <div class="note-article__body">
            {n['body']}
          </div>
        </article>''' for n in notes)

page = f'''<!doctype html>
<html lang="en">
{head}
<body class="notes-page">
  <a class="skip-link" href="#main">Skip to content</a>

{svgdefs}

{header}

  <main id="main">
    <section class="section section--paper fn-hero" aria-labelledby="fn-title">
      <div class="container fn-hero__grid">
        <div class="fn-hero__copy reveal">
          <p class="eyebrow">Playbook</p>
          <h1 class="section-title" id="fn-title">Plays from the work.</h1>
          <p class="section-intro">Practical notes and working tools on building a business that can keep moving. Written from the store floor, the development schedule, the site walk, and the franchise pipeline.</p>
          <p class="notes__pull brush" aria-live="polite">{quote_stack}</p>
        </div>
        <figure class="figure figure--tall reveal">
          <img src="assets/images/notes-field-notebook.webp" width="1024" height="1536" alt="A SKALA field notebook and printed plans on a wooden worktable" fetchpriority="high">
          <figcaption class="figure__caption">The field notebook</figcaption>
        </figure>
      </div>
    </section>

    <section class="section section--paper fn-body" aria-label="Playbook">
      <div class="container fn-body__grid">
        <nav class="fn-index reveal" aria-label="Playbook index">
          <p class="eyebrow">In the playbook</p>
          <ol class="fn-index__list">
{index_links}
          </ol>
          <a class="button button--ink fn-index__cta" href="assets/downloads/skala-playbook.pdf" target="_blank" rel="noopener">Download the playbook <span class="fn-index__format">PDF</span> <span class="arrow" aria-hidden="true">↓</span></a>
        </nav>
        <div class="fn-articles">
{articles}
        </div>
      </div>
    </section>

    <section class="section section--acid fn-close" aria-labelledby="fn-close-title">
      <div class="container fn-close__grid">
        <h2 class="campaign-heading" id="fn-close-title">Build better brands for more people.</h2>
        <div>
          <p class="section-intro">Share what you are building and where the operation needs to get stronger.</p>
          <a class="button button--ink" href="index.html#contact">Let’s build <span class="arrow" aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>
  </main>

{footer}

  <script src="js/site.js" defer></script>
</body>
</html>
'''
(ROOT / "playbook.html").write_text(page)

# ---------- merch page ----------
MERCH = [
    {"slug": "tee", "name": "SKALA tee", "price": 25, "img": "merch-tee.webp", "alt": "SKALA tee, black with the acid wordmark"},
    {"slug": "hat", "name": "SKALA hat", "price": 25, "img": "merch-hat.webp", "alt": "SKALA hat, black with the crown"},
    {"slug": "jacket", "name": "SKALA jacket", "price": 75, "img": "merch-jacket.webp", "alt": "SKALA jacket"},
    {"slug": "field-book", "name": "SKALA notebook", "price": 15, "img": "merch-field-book.webp", "alt": "The SKALA notebook", "fallback": "notes-field-notebook.webp"},
]
merch_head = head.replace("<title>Playbook — SKALA</title>", "<title>Merch — SKALA</title>")
merch_head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="SKALA merch: the tee, the hat, the jacket, and the field book.">', merch_head)
merch_header = s[s.index('  <header class="site-header"'):s.index("</header>")+9]
merch_header = merch_header.replace('href="#top" aria-label="SKALA — back to top"', 'href="index.html" aria-label="SKALA — home"')
for a in ("work", "approach", "playbook", "about", "contact"):
    merch_header = merch_header.replace(f'href="#{a}"', f'href="index.html#{a}"')
merch_header = merch_header.replace('<a class="nav-link" href="merch.html">Merch</a>', '<a class="nav-link" href="merch.html" aria-current="page">Merch</a>')
def card(m):
    fb = m.get("fallback")
    onerror = (f"if(!this.dataset.fb){{this.dataset.fb=1;this.src='assets/images/{fb}'}}else{{this.hidden=true}}" if fb else "this.hidden=true")
    return f'''        <li class="merch-card reveal">
          <div class="merch-card__media">
            <span class="merch-card__placeholder brush" aria-hidden="true">Photo coming</span>
            <img class="merch-card__img" src="assets/images/{m['img']}" alt="{esc(m['alt'])}" loading="lazy" onerror="{onerror}">
          </div>
          <h2 class="merch-card__name">{esc(m['name'])}</h2>
          <p class="merch-card__price">${m['price']}</p>
        </li>'''
cards = "\n".join(card(m) for m in MERCH)
merch = f'''<!doctype html>
<html lang="en">
{merch_head}
<body class="merch-page">
  <a class="skip-link" href="#main">Skip to content</a>

{svgdefs}

{merch_header}

  <main id="main">
    <section class="section section--paper merch" aria-labelledby="merch-title">
      <div class="container">
        <div class="merch__intro reveal">
          <p class="eyebrow">Merch</p>
          <h1 class="section-title" id="merch-title">Wear the work.</h1>
        </div>
        <ul class="merch__grid">
{cards}
        </ul>
      </div>
    </section>
  </main>

{footer}

  <script src="js/site.js" defer></script>
</body>
</html>
'''
(ROOT / "merch.html").write_text(merch)
print("built: index.html band + dialogs, playbook.html, merch.html")
