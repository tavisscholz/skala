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
    ("your-best-manager-cannot-be-the-whole-system", "OPS", "Field Operations"),
    ("5-things-your-opening-checklist-must-cover", "DEV", "Development"),
    ("a-good-site-can-still-be-the-wrong-site", "RE", "Real Estate &amp; Leasing"),
    ("how-your-item-19-will-break-your-sales-pipeline", "FRAN", "Franchise Development"),
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
    "how-your-item-19-will-break-your-sales-pipeline": "Any daylight between the two is exactly where your pipeline is leaking.",
    "5-things-your-opening-checklist-must-cover": "A schedule with no room for either isn\u2019t a schedule, it\u2019s a hope.",
}
def clean_links(html):
    """Live site uses clean URLs: / for the home page and /playbook, /merch, /privacy, /terms for the rest (see .htaccess)."""
    for a, z in (('href="index.html#', 'href="/#'), ('href="index.html"', 'href="/"'), ('href="playbook.html', 'href="/playbook'),
                 ('href="merch.html"', 'href="/merch"'), ('href="privacy.html"', 'href="/privacy"'), ('href="terms.html"', 'href="/terms"'),
                 ('href="work-with-us.html"', 'href="/work-with-us"')):
        html = html.replace(a, z)
    return html

MONTHS = "January February March April May June July August September October November December".split()

def esc(t): return html.escape(t, quote=False).replace("--", "—")
def smart(t):
    """Typographer's quotes and apostrophes for the editorial layout."""
    t = re.sub(r"(^|[\s(\[\u2014])\"", "\\1\u201c", t)
    t = t.replace('"', "\u201d")
    t = re.sub(r"(^|[\s(\[\u2014])'", "\\1\u2018", t)
    t = t.replace("'", "\u2019")
    return t
def inline(t):
    t = smart(esc(t))
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
    # Pull quote after the second paragraph, magazine style
    quote = QUOTES.get(slug)
    paras = [j for j, o in enumerate(out) if o.startswith("<p>")]
    if quote and len(paras) > 2:
        out.insert(paras[1] + 1, f'<blockquote class="note-article__pull"><p>{esc(quote)}</p></blockquote>')
    words = len(re.findall(r"[A-Za-z0-9\u2019']+", " ".join(body)))
    minutes = max(1, round(words / 200))
    return dict(slug=slug, title=title, date=date, stand=stand, kind=kind, minutes=minutes, body="\n        ".join(out))

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
          <p class="notes__pull notes__pull--static brush">Practical notes and working tools on building a business that can keep moving.</p>
        </div>
        <ul class="note-lines reveal">
{rows}
          <li class="note-lines__all"><a class="text-link" href="playbook.html">Open more plays <span class="arrow" aria-hidden="true">→</span></a></li>
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
      <p class="note-article__byline"><span class="note-article__author">Tavis Scholz</span> · {n['date']} · {n['minutes']} min read</p>
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

# ---------- cache busting: stamp each stylesheet and script link with a hash of its contents ----------
import hashlib
def asset_version(rel):
    return hashlib.sha1((ROOT / rel).read_bytes()).hexdigest()[:8]
def stamp_assets(html):
    """Append a content hash to every css/js/image URL so a swapped file is never served from cache."""
    for rel in ("css/fonts.css", "css/tokens.css", "css/site.css", "js/site.js"):
        html = re.sub(r'(["\'])' + re.escape(rel) + r'(\?v=[0-9a-f]+)?(["\'])', lambda m: m.group(1) + rel + "?v=" + asset_version(rel) + m.group(3), html)
    return re.sub(r'(assets/images/[A-Za-z0-9_-]+\.webp)(\?v=[0-9a-f]+)?', lambda m: m.group(1) + "?v=" + asset_version(m.group(1)), html)
s = stamp_assets(s)
s = re.sub(r"<!-- notes:start -->.*?<!-- notes:end -->", lambda m: band, s, flags=re.S)
s = re.sub(r"<!-- dialogs:start -->.*?<!-- dialogs:end -->", lambda m: dialogs, s, flags=re.S)
s = clean_links(s)
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
footer = footer.replace('href="#top"', 'href="index.html"').replace('href="#work"', 'href="index.html#work"').replace('href="#approach"', 'href="index.html#approach"').replace('href="#about"', 'href="index.html#about"').replace('href="#contact"', 'href="index.html#contact"')

index_links = "\n".join(f'            <li data-quote-for="{n["slug"] if QUOTES[n["slug"]] != PULL else "default"}"><a href="#{n["slug"]}"><span class="note__tag" aria-hidden="true">{n["tag"]}</span><span>{esc(n["title"])}</span></a></li>' for n in notes)
articles = "\n\n".join(f'''        <article class="fn-article reveal" id="{n['slug']}" aria-labelledby="{n['slug']}-title">
          <div class="note-article__top">
            <p class="eyebrow"><span class="note__tag" aria-hidden="true">{n['tag']}</span> {n['kind']} {n['i']} · <span class="note-article__lane">{n['lane']}</span></p>
          </div>
          <h2 class="note-article__title" id="{n['slug']}-title">{esc(n['title'])}</h2>
          <p class="note-article__stand">{esc(n['stand'])}</p>
          <p class="note-article__byline"><span class="note-article__author">Tavis Scholz</span> · {n['date']} · {n['minutes']} min read</p>
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
(ROOT / "playbook.html").write_text(clean_links(stamp_assets(page)))

# ---------- merch page ----------
MERCH = [
    {"slug": "tee", "name": "SKALA tee", "price": 25, "img": "merch-tee.webp", "alt": "SKALA tee, black with the acid wordmark"},
    {"slug": "hat", "name": "SKALA snapback", "price": 25, "img": "merch-hat.webp", "alt": "SKALA snapback, black with the crown"},
    {"slug": "jacket", "name": "SKALA jacket", "price": 75, "img": "merch-jacket.webp", "alt": "SKALA jacket"},
    {"slug": "field-book", "name": "SKALA notebook", "price": 15, "img": "merch-field-book.webp", "alt": "The SKALA notebook", "fallback": "notes-field-notebook.webp"},
]
merch_head = head.replace("<title>Playbook — SKALA</title>", "<title>Merch — SKALA</title>")
merch_head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="SKALA merch: the tee, the snapback, the jacket, and the notebook.">', merch_head)
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
(ROOT / "merch.html").write_text(clean_links(stamp_assets(merch)))
# ---------- legal pages (linked from the footer only) ----------
LEGAL = {
    "privacy": {
        "title": "Privacy Policy", "dek": "What this site collects, why, and what happens to it.", "updated": "18 September 2026",
        "sections": [
            ("What we collect", [
                "If you use the contact form, we receive what you type into it: your name, work email, company if you add it, and your message. That is the only personal information this site collects on purpose.",
                "Like most websites, the server that delivers these pages may record standard technical details such as your IP address, browser type, and the pages requested. We use that only to keep the site running and secure."]),
            ("How we use it", [
                "We use what you send us to reply to you and to follow up on the conversation you started. We do not add you to a mailing list unless you ask to be added, and we do not sell, rent, or trade your information."]),
            ("Cookies and analytics", [
                "This site does not set advertising cookies and does not run third-party advertising trackers. If we add analytics in the future, this page will say so and describe what is collected."]),
            ("Who else sees it", [
                "Your message may be handled by the services we use to receive email and host this site. Those providers process it on our behalf and under their own security commitments. We share information with no one else unless the law requires it."]),
            ("How long we keep it", [
                "We keep contact messages for as long as the conversation is active and for a reasonable period afterwards so we can pick it up again. You can ask us to delete your information at any time."]),
            ("Your choices", [
                "You can ask what information we hold about you, ask us to correct it, or ask us to delete it. Use the contact form on the home page and tell us what you need."]),
            ("Changes", [
                "If we change this policy, the date at the top of this page will change with it."]),
        ],
    },
    "terms": {
        "title": "Terms of Use", "dek": "The ground rules for using this site.", "updated": "18 September 2026",
        "sections": [
            ("Using the site", [
                "By using this site you agree to these terms. If you do not agree, please do not use the site."]),
            ("What the content is for", [
                "The plays, tools, and other content here are general information drawn from operating experience. They are not legal, financial, or professional advice for your business, and reading them does not make SKALA your adviser. Decisions about your operation are yours to make."]),
            ("Ownership", [
                "The text, photographs, wordmark, and design of this site belong to SKALA or are used with permission. You are welcome to read, share links to, and print pages for your own use. Please do not copy, republish, or sell the content without asking first."]),
            ("Acceptable use", [
                "Do not use the site or the contact form to send anything unlawful, misleading, or harmful, and do not try to interfere with how the site works."]),
            ("Links to other sites", [
                "Where the site links to other websites, those sites are not ours and we are not responsible for what they contain."]),
            ("No warranties", [
                "The site is provided as it is. We work to keep it accurate and available, but we do not promise that it will be error-free or available at all times."]),
            ("Limitation of liability", [
                "To the extent the law allows, SKALA is not liable for any loss or damage arising from your use of this site or reliance on its content."]),
            ("Changes", [
                "We may update these terms from time to time. The date at the top of this page shows the current version."]),
            ("Contact", [
                "Questions about these terms or the privacy policy can be sent through the contact form on the home page."]),
        ],
    },
}
def legal_page(slug, spec):
    lhead = head.replace("<title>Playbook — SKALA</title>", f"<title>{spec['title']} — SKALA</title>")
    lhead = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(spec["title"])} for the SKALA website.">', lhead)
    body = "\n".join(
        f'          <h2>{esc(h)}</h2>\n' + "\n".join(f'          <p>{inline(par)}</p>' for par in pars)
        for h, pars in spec["sections"])
    parts = [
        "<!doctype html>", '<html lang="en">', lhead, '<body class="legal-page">',
        '  <a class="skip-link" href="#main">Skip to content</a>', "", svgdefs, "",
        merch_header.replace(' aria-current="page"', ''), "",
        '  <main id="main">',
        '    <section class="section section--paper legal" aria-labelledby="legal-title">',
        '      <div class="container">',
        '        <div class="legal__intro reveal">',
        f'          <p class="eyebrow">{esc(spec["title"])}</p>',
        f'          <h1 class="section-title" id="legal-title">{esc(spec["dek"])}</h1>',
        f'          <p class="legal__meta">Last updated {spec["updated"]}</p>',
        '        </div>',
        '        <div class="legal__body reveal">', body, '        </div>',
        '      </div>', '    </section>', '  </main>', "", footer, "",
        '  <script src="js/site.js" defer></script>', '</body>', '</html>', "",
    ]
    return "\n".join(parts)
for slug, spec in LEGAL.items():
    (ROOT / f"{slug}.html").write_text(clean_links(stamp_assets(legal_page(slug, spec))))
# ---------- work with us ----------
def work_page():
    whead = head.replace("<title>Playbook — SKALA</title>", "<title>Work With SKALA</title>")
    whead = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Operators wanted. SKALA is connecting with experienced operators across specialties who want to help multiunit brands get ready for their next stage of growth.">', whead)
    chips = ["Brand &amp; growth marketing", "Finance &amp; unit economics", "Merchandising &amp; category management", "People operations", "Data &amp; automation", "Supply chain &amp; logistics", "Tech &amp; networking", "Production &amp; manufacturing", "Program &amp; launch management"]
    chip_html = "\n".join(f'            <li class="join__chip">{t}</li>' for t in chips)
    underline = '<svg class="brush-underline" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="underline-stroke" d="M4 18 C 120 15, 260 10, 396 6" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" pathLength="1"/><path class="underline-stroke underline-stroke--2" d="M12 22 C 130 20, 250 16, 384 12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" pathLength="1"/></svg>'
    parts = [
        "<!doctype html>", '<html lang="en">', whead, '<body class="join-page">',
        '  <a class="skip-link" href="#main">Skip to content</a>', "", svgdefs, "",
        merch_header.replace(' aria-current="page"', ''), "",
        '  <main id="main">',
        '    <section class="section section--paper join" aria-labelledby="join-title">',
        '      <div class="container join__grid">',
        '        <div class="join__intro reveal">',
        '          <p class="eyebrow">Work with SKALA</p>',
        f'          <h1 class="section-title join__title is-drawn" id="join-title">Operators <span class="join__title-line">wanted.{underline}</span></h1>',
        '          <p class="join__dek">Different specialties. Real-world experience.</p>',
        '          <p class="section-intro">You\u2019ve opened locations, rolled out something that stuck, or helped a growing business run better. You know your specialty, and what happens when it meets the rest of the operation. <strong>That\u2019s the experience we want at SKALA.</strong></p>',
        '        </div>',
        '        <figure class="figure figure--wide reveal">',
        '          <img src="assets/images/join-opening-huddle.webp" width="1200" height="800" alt="A store team in a huddle on the sales floor before opening, listening to the manager" loading="lazy">',
        '          <figcaption class="figure__caption">Real operators</figcaption>',
        '        </figure>',
        '        <div class="join__body reveal">',
        '          <ul class="join__chips" aria-label="Specialties we are looking for">', chip_html, '          </ul>',
        '          <h2 class="join__sub">Bring your expertise. Help build what\u2019s next.</h2>',
        '          <p>Help multiunit brands get ready for their next stage of growth. Tell us what you\u2019ve opened, improved, or put into practice, and where you do your best work.</p>',
        '          <div class="join__cta">',
        '            <a class="button button--ink" href="index.html#contact">Let\u2019s build <span class="arrow" aria-hidden="true">\u2192</span></a>',
        '            <p class="join__note">A short introduction and a link to your experience are a good place to start.</p>',
        '          </div>',
        '        </div>',
        '      </div>', '    </section>', '  </main>', "", footer, "",
        '  <script src="js/site.js" defer></script>', '</body>', '</html>', "",
    ]
    return "\n".join(parts)
(ROOT / "work-with-us.html").write_text(clean_links(stamp_assets(work_page())))
print("built: index.html band + dialogs, playbook.html, merch.html, privacy.html, terms.html, work-with-us.html")
