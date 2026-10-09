"""Build the Playbook from assets/articles/*.md.

Writes:
  - the compact Playbook band on index.html (between notes markers)
  - the article dialogs on index.html (between dialog markers)
  - playbook.html, the Articles hub: one card per play, filtered by lane
  - are-you-ready.html, the four free working sessions (SESSIONS below)
  - archive/are-you-ready-old.html, the readiness tool that /are-you-ready carried until 9 October 2026,
    from tools/partials/are-you-ready-old.html (see docs/are-you-ready-archive.md)
  - plays/<slug>.html, one page per play

Usage: python3 tools/build-notes.py
"""
import re, html, hashlib, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
ARTICLES = [  # order on the page, lane tag, lane name, shown on the homepage band
    ("your-best-manager-cannot-be-the-operating-system", "OPS", "Field Operations", True),
    ("why-new-store-openings-fall-behind", "DEV", "Store Development", True),
    ("before-you-sign-the-lease", "RE", "Real Estate &amp; Leasing", True),
    ("when-your-sales-story-outruns-your-item-19", "FRAN", "Franchise Infrastructure", True),
    ("scaling-chaos-7-signs", "SCALE", "Scaling Up", False),
    ("the-founder-bottleneck", "SCALE", "Scaling Up", False),
    ("the-next-ten-locations", "SCALE", "Scaling Up", False),
    ("ai-wont-fix-a-bad-operating-system", "OPS", "Field Operations", False),
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
    "your-best-manager-cannot-be-the-operating-system": "Documents don\u2019t run stores. Routines do.",
    "why-new-store-openings-fall-behind": "A checklist without owners and dates is a document, not a control system.",
    "before-you-sign-the-lease": "Measure the door, not the neighborhood.",
    "when-your-sales-story-outruns-your-item-19": "Any daylight between the two is exactly where your pipeline is leaking.",
    "scaling-chaos-7-signs": "Growth is a stress test, not a reward.",
    "the-founder-bottleneck": "The founder decides what the rules are. The founder stops being the rule.",
    "the-next-ten-locations": "Your management infrastructure didn\u2019t grow with you.",
    "ai-wont-fix-a-bad-operating-system": "AI doesn\u2019t install an operating system. It audits the one you already have.",
}

# ---------- the four free working sessions ----------
# One entry per lane. Rendered three ways: the hub on are-you-ready.html, the secondary line at the foot of
# each What We Do row, and the block at the foot of the plays listed in ARTICLE_SESSIONS. Copy lives here only.
SESSIONS = [
    dict(key="bottleneck", id="find-the-bottleneck", tag="OPS", lane="Field Operations",
         title="Find the Bottleneck", cta="Find the bottleneck",
         text="Something is harder than it should be, but the cause is not obvious. In one focused session, we\u2019ll separate symptoms from the likely constraint and identify what is worth testing next.",
         nudge="Not sure what\u2019s actually getting in the way?"),
    dict(key="open", id="ready-to-open", tag="DEV", lane="Store Development",
         title="Are You Ready to Open?", cta="Pressure-test the opening",
         text="A new opening creates a lot of motion. The risk is missing the dependency that matters most. We\u2019ll walk the opening plan, ownership, timing, and major handoffs to identify what could slow the opening down or create problems after launch.",
         nudge="Have an opening on the calendar?"),
    dict(key="site", id="take-this-site", tag="RE", lane="Real Estate &amp; Leasing",
         title="Should You Take This Site?", cta="Review the site",
         text="A site can look good on paper and still create a bad operating decision. We\u2019ll review the location, basic deal terms, and operating assumptions and identify the questions that need answering before you commit.",
         nudge="Weighing a site right now?"),
    dict(key="franchise", id="ready-to-franchise", tag="FRAN", lane="Franchise Infrastructure",
         title="Are You Ready to Franchise?", cta="Check franchise readiness",
         text="Franchising exposes whatever the business still depends on people to carry. We\u2019ll pressure-test the model, support structure, and key handoffs to identify what needs to be strengthened or built before outside operators enter the system.",
         nudge="Thinking about franchising?"),
]
SESSION = {x["key"]: x for x in SESSIONS}
ARTICLE_SESSIONS = {  # plays whose subject sits squarely on one session. The other plays carry none, on purpose.
    "your-best-manager-cannot-be-the-operating-system": "bottleneck",   # manager dependence
    "why-new-store-openings-fall-behind": "open",                       # opening handoffs
    "before-you-sign-the-lease": "site",                                # site and lease decisions
    "scaling-chaos-7-signs": "bottleneck",                              # operating breakdowns and fire-fighting
    "ai-wont-fix-a-bad-operating-system": "bottleneck",                 # three versions of the closing procedure
}
# Which page /are-you-ready serves. "sessions" is the four working sessions. "tool" puts the archived readiness
# tool back there (see docs/are-you-ready-archive.md). The archive copy is built either way.
READY_PAGE = "sessions"

def session_href(x): return f"index.html?session={x['key']}#contact"
def session_block(x, slug):
    """The one contextual offer at the foot of a play."""
    return f'''<aside class="note-session" aria-labelledby="session-{slug}-title">
            <p class="eyebrow">Free working session</p>
            <p class="note-session__title" id="session-{slug}-title">{x['title']}</p>
            <p class="note-session__text">{x['text']}</p>
            <a class="button button--ink button--small" href="{session_href(x)}">{x['cta']} <span class="arrow" aria-hidden="true">\u2192</span></a>
          </aside>'''
def article_session(n, indent):
    k = ARTICLE_SESSIONS.get(n["slug"])
    return (session_block(SESSION[k], n["slug"]) + "\n" + indent) if k else ""
def session_line(x):
    """The secondary line at the foot of a What We Do row, pointing at that lane's session on the hub."""
    return f'{x["nudge"]} Book a free session: <a class="text-link" href="are-you-ready.html#{x["id"]}">{x["title"]} <span class="arrow" aria-hidden="true">\u2192</span></a>'
def clean_links(html):
    """Live site uses clean URLs: / for the home page and /playbook, /merch, /privacy, /terms for the rest (see .htaccess)."""
    for a, z in (('href="index.html#', 'href="/#'), ('href="index.html"', 'href="/"'), ('href="playbook.html', 'href="/playbook'),
                 ('href="merch.html"', 'href="/merch"'), ('href="privacy.html"', 'href="/privacy"'), ('href="terms.html"', 'href="/terms"'),
                 ('href="work-with-us.html"', 'href="/work-with-us"'), ('href="are-you-ready.html"', 'href="/are-you-ready"'),
                 ('href="are-you-ready.html#', 'href="/are-you-ready#'), ('href="index.html?', 'href="/?')):
        html = html.replace(a, z)
    return re.sub(r'href="plays/([a-z0-9-]+)\.html"', r'href="/plays/\1"', html)

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
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2">\1</a>', t)   # [source](https://...) citations
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
            wide = " note-table--wide" if len(tbl[0]) > 2 else ""   # two columns is label and value; more is a grid of prose
            t = f'<div class="note-table__wrap"><table class="note-table{wide}"><thead><tr>' + "".join(f'<th scope="col">{esc(h)}</th>' for h in tbl[0]) + "</tr></thead><tbody>"
            for r in tbl[2:]: t += "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>"
            out.append(t + "</tbody></table></div>"); continue
        if l.startswith("**This week:**"):
            out.append(f'<aside class="note-article__week"><p class="note-article__week-label">This week</p><p>{inline(l[len("**This week:**"):].strip())}</p></aside>'); k += 1; continue
        if l.startswith("- "):
            items = []
            while k < len(body) and body[k].startswith("- "):
                items.append(f"<li>{inline(body[k][2:].strip())}</li>"); k += 1
            out.append('<ul class="note-article__list">' + "".join(items) + "</ul>"); continue
        if re.match(r"\d+\. ", l):
            items = []
            while k < len(body) and re.match(r"\d+\. ", body[k]):
                item = re.sub(r"^\d+\. ", "", body[k]).strip()
                items.append(f"<li>{inline(item)}</li>"); k += 1
            out.append('<ol class="note-article__list note-article__list--numbered">' + "".join(items) + "</ol>"); continue
        if l.startswith("**Fast Facts**"):
            k += 1; items = []
            while k < len(body) and body[k].startswith("> - "):
                items.append(f"<li>{inline(body[k][4:].strip())}</li>"); k += 1
            out.append('<aside class="note-article__facts"><p class="note-article__facts-label">Fast facts</p><ul class="note-article__list">' + "".join(items) + "</ul></aside>"); continue
        if l.startswith(">"):
            q = []
            while k < len(body) and body[k].startswith(">"):
                q.append(body[k][1:].strip()); k += 1
            first = q[0]
            m = re.fullmatch(r"\*\*\"(.+)\"\*\*", first)
            if m and len(q) <= 2:  # a lifted line, optionally with an attribution underneath
                cite = ""
                if len(q) == 2:
                    who = re.sub(r"^\*\((.+)\)\*$", r"\1", q[1])
                    cite = "<cite>" + inline(who) + "</cite>"
                out.append(f'<blockquote class="note-article__pull note-article__pull--own"><p>{inline(m.group(1))}</p>{cite}</blockquote>'); continue
            m = re.fullmatch(r"\*\*(.+?)\*\*", first)
            if m and len(q) > 1:  # a titled box
                text = "".join(f"<p>{inline(x)}</p>" for x in q[1:] if x)
                if m.group(1).lower() == "do this week":
                    out.append(f'<aside class="note-article__week"><p class="note-article__week-label">This week</p>{text}</aside>')
                else:
                    out.append(f'<aside class="note-article__callout"><p class="note-article__callout-label">{inline(m.group(1))}</p>{text}</aside>')
                continue
            out.append('<blockquote class="note-article__quote">' + "".join(f"<p>{inline(x)}</p>" for x in q if x) + "</blockquote>"); continue
        out.append(f"<p>{inline(l)}</p>"); k += 1
    # Pull quote after the second paragraph, magazine style
    quote = QUOTES.get(slug)
    paras = [j for j, o in enumerate(out) if o.startswith("<p>")]
    if quote and len(paras) > 2 and not any("note-article__pull--own" in o for o in out):
        out.insert(paras[1] + 1, f'<blockquote class="note-article__pull"><p>{esc(quote)}</p></blockquote>')
    words = len(re.findall(r"[A-Za-z0-9\u2019']+", re.sub(r"\]\(https?://[^)\s]+\)", "]", " ".join(body))))   # link targets are not read
    minutes = max(1, round(words / 200))
    return dict(slug=slug, title=title, date=date, stand=stand, kind=kind, minutes=minutes, body="\n        ".join(out))

def asset_version(rel):
    return hashlib.sha1((ROOT / rel).read_bytes()).hexdigest()[:8]
CLOSER = (ROOT / "assets/articles/_closer.md").read_text().strip()
def closer_html():
    """Contributor note at the foot of every play, newspaper style."""
    t = smart(esc(CLOSER))
    t = re.sub(r"([\w.+-]+@[\w.-]+\.\w+)", r'<a href="mailto:\1">\1</a>', t)
    return f'<p class="note-article__closer">{t}</p>'
def share_button(n):
    """Share the play: the device share sheet where there is one, otherwise copy the link."""
    return (f'<button class="byline-btn share" type="button" data-share="{n["slug"]}" data-share-title="{esc(n["title"])}" aria-label="Share this play">'
            '<svg viewBox="0 0 10 10" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6.2V1.2M2.9 3.2 5 1.1l2.1 2.1M1.6 5.6v3h6.8v-3"/></svg>'
            '<span class="share__label">Share</span></button>')
# Audio controls. False hides Listen and the speed pill on every play (the MP3s stay in assets/audio and the
# player stays in js/site.js, unused); True brings them back on the next build. Hidden since 9 October 2026.
AUDIO = False
def speed_button():
    """Playback speed, shown once a play is playing. Cycles through presets."""
    if not AUDIO: return ""
    return ('<button class="byline-btn speed" type="button" data-speed hidden aria-label="Playback speed, 1 times">'
            '<span class="speed__label">1\u00d7</span></button>')
def listen_button(n, where):
    """Play/pause control beside the read time. Uses a recorded MP3 when
    tools/build-audio.mjs has made one, otherwise the device's own voice."""
    if not AUDIO: return ""
    rel = f"assets/audio/{n['slug']}.mp3"
    audio = f' data-audio="{rel}?v={asset_version(rel)}"' if (ROOT / rel).exists() else ""
    return (f'<button class="byline-btn listen" type="button" data-listen="{where}-{n["slug"]}"{audio} data-state="idle" aria-pressed="false" aria-label="Listen to this play">'
            '<svg class="listen__play" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0.5 9 5 1 9.5z"/></svg>'
            '<svg class="listen__pause" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0.5h3v9H1zM6 0.5h3v9H6z"/></svg>'
            '<span class="listen__label">Listen</span><span class="listen__time"></span></button>')

notes = []
for i, (slug, tag, lane, home) in enumerate(ARTICLES, start=1):
    n = parse(slug); n.update(i=i, tag=tag, lane=lane, home=home, accent=ACCENTS[(i-1) % len(ACCENTS)], ring=RINGS[(i-1) % len(RINGS)]); notes.append(n)
home_notes = [n for n in notes if n["home"]]

# ---------- homepage band ----------
rows = "\n".join(f'''          <li class="note-line" data-quote-for="{n['slug'] if QUOTES[n['slug']] != PULL else 'default'}">
            <button class="note-line__button" type="button" data-open-note="note-{n['i']}">
              <span class="note__tag" aria-hidden="true">{n['tag']}</span>
              <span class="note-line__text">
                <span class="note-line__title">{esc(n['title'])}</span>
                <span class="note-line__stand">{esc(n['stand'])}</span>
                <span class="note-line__read">Read <span class="arrow" aria-hidden="true">→</span></span>
              </span>
            </button>
          </li>''' for n in home_notes)
band = f'''<!-- notes:start -->
    <section class="section section--ink notes" id="playbook" aria-labelledby="notes-title">
      <i class="tear tear--top tear--alt" aria-hidden="true"></i>
      <i class="tear tear--bottom" aria-hidden="true"></i>
      <div class="container notes__grid">
        <div class="notes__intro reveal">
          <p class="eyebrow eyebrow--acid">Articles</p>
          <h2 class="section-title" id="notes-title">Operating insights for multi‑unit growth.</h2>
        </div>
        <ul class="note-lines reveal">
{rows}
          <li class="note-lines__all"><a class="text-link" href="playbook.html">See more articles <span class="arrow" aria-hidden="true">→</span></a></li>
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
      <p class="note-article__byline"><span class="note-article__author">Tavis Scholz</span> · {n['date']} · {n['minutes']} min read {listen_button(n, 'note')} {speed_button()} {share_button(n)}</p>
      <div class="note-article__body">
        {n['body']}
      </div>
      {article_session(n, "      ")}{closer_html()}
      <div class="note-article__foot">
        <button class="button button--ink" type="button" data-close-note><span class="arrow" aria-hidden="true">←</span> Back</button>
        <a class="text-link" href="plays/{n['slug']}.html">Open on its own page <span class="arrow" aria-hidden="true">→</span></a>
      </div>
    </article>
  </dialog>''' for n in home_notes)
dialogs = "<!-- dialogs:start -->\n" + dialogs + "\n  <!-- dialogs:end -->"

idx = ROOT / "index.html"; s = idx.read_text()

# ---------- cache busting: stamp each stylesheet and script link with a hash of its contents ----------
def stamp_assets(html):
    """Append a content hash to every css/js/image URL so a swapped file is never served from cache."""
    for rel in ("css/fonts.css", "css/tokens.css", "css/site.css", "js/site.js"):
        html = re.sub(r'(["\'])' + re.escape(rel) + r'(\?v=[0-9a-f]+)?(["\'])', lambda m: m.group(1) + rel + "?v=" + asset_version(rel) + m.group(3), html)
    html = re.sub(r'(assets/images/[A-Za-z0-9_-]+\.webp)(\?v=[0-9a-f]+)?', lambda m: m.group(1) + "?v=" + asset_version(m.group(1)), html)
    return re.sub(r'(assets/(?:favicon[A-Za-z0-9_-]*\.(?:svg|png)|apple-touch-icon\.png))(\?v=[0-9a-f]+)?', lambda m: m.group(1) + "?v=" + asset_version(m.group(1)), html)
s = stamp_assets(s)
s = re.sub(r"<!-- notes:start -->.*?<!-- notes:end -->", lambda m: band, s, flags=re.S)
s = re.sub(r"<!-- dialogs:start -->.*?<!-- dialogs:end -->", lambda m: dialogs, s, flags=re.S)
s = re.sub(r'<p class="service-row__session" data-session="(\w+)">.*?</p>', lambda m: f'<p class="service-row__session" data-session="{m.group(1)}">{session_line(SESSION[m.group(1)])}</p>', s, flags=re.S)
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
header = header.replace('href="#work"', 'href="index.html#work"').replace('href="#approach"', 'href="index.html#approach"').replace('href="#playbook"', 'href="index.html#playbook"').replace('href="#about"', 'href="index.html#about"').replace('href="#contact"', 'href="index.html#contact"')
footer = s[s.index('  <footer class="site-footer">'):s.index("</footer>")+9]
footer = footer.replace('href="#top"', 'href="index.html"').replace('href="#work"', 'href="index.html#work"').replace('href="#approach"', 'href="index.html#approach"').replace('href="#about"', 'href="index.html#about"').replace('href="#contact"', 'href="index.html#contact"')

# ---------- playbook hub: one card per play, filtered by lane ----------
FILTERS = [("all", "All"), ("OPS", "Operations"), ("DEV", "Store Development"), ("RE", "Real estate"), ("FRAN", "Franchise"), ("SCALE", "Scaling")]
def play_href(n): return f"plays/{n['slug']}.html"
filters = "\n".join(f'          <button class="fn-filter" type="button" data-filter="{key}" aria-pressed="{"true" if key == "all" else "false"}">{label}</button>' for key, label in FILTERS)
cards = "\n".join(f'''          <li class="fn-card" id="{n['slug']}" data-lane="{n['tag']}">
            <p class="fn-card__tag">{n['tag']}</p>
            <h3 class="fn-card__title"><a class="fn-card__link" href="{play_href(n)}">{esc(n['title'])}</a></h3>
            <p class="fn-card__stand">{esc(n['stand'])}</p>
            <p class="fn-card__more" aria-hidden="true">Read <span class="arrow">→</span></p>
          </li>''' for n in notes)

hub_head = head.replace("<title>Playbook — SKALA</title>", "<title>Articles — SKALA</title>")
hub_head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="SKALA articles: operating insights, field notes, and things learned along the way, for multiunit brands preparing to grow.">', hub_head)
page = f'''<!doctype html>
<html lang="en">
{hub_head}
<body class="notes-page">
  <a class="skip-link" href="#main">Skip to content</a>

{svgdefs}

{header}

  <main id="main">
    <section class="section section--paper fn-hero" aria-labelledby="fn-title">
      <div class="container fn-hero__grid">
        <div class="fn-hero__copy reveal">
          <p class="eyebrow">Articles</p>
          <h1 class="section-title fn-hero__title" id="fn-title">Operating insights, field notes, and things learned along the way.</h1>
        </div>
        <figure class="figure figure--tall reveal">
          <img src="assets/images/notes-field-notebook.webp" width="1024" height="1536" alt="A SKALA field notebook and printed plans on a wooden worktable" fetchpriority="high">
        </figure>
      </div>
    </section>

    <section class="section section--paper fn-hub" aria-label="All articles">
      <div class="container">
        <div class="fn-filters reveal" role="group" aria-label="Show plays from one lane">
{filters}
        </div>
        <ul class="fn-cards reveal" id="fn-cards">
{cards}
        </ul>
      </div>
    </section>

    <section class="section section--acid fn-close" aria-labelledby="fn-close-title">
      <div class="container fn-close__grid">
        <h2 class="campaign-heading" id="fn-close-title">Build a<br>business<br>that’s ready<br>for growth.</h2>
        <div>
          <p class="section-intro">Bring the problem. We’ll work on it.</p>
          <a class="button button--ink" href="are-you-ready.html">Book a free working session <span class="arrow" aria-hidden="true">→</span></a>
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

# ---------- one page per play ----------
def nested(html):
    """Play pages live one folder down, so site assets are reached with ../"""
    return re.sub(r'(href|src|data-audio)="(css|js|assets)/', r'\1="../\2/', html)
def play_page(n, nxt):
    phead = head.replace("<title>Playbook — SKALA</title>", f"<title>{esc(n['title'])} — SKALA</title>")
    phead = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(n["stand"])}">', phead)
    return f'''<!doctype html>
<html lang="en">
{phead}
<body class="notes-page play-page">
  <a class="skip-link" href="#main">Skip to content</a>

{svgdefs}

{header}

  <main id="main">
    <section class="section section--paper fn-play" aria-labelledby="{n['slug']}-title">
      <div class="container fn-play__wrap">
        <article class="fn-article fn-article--page reveal" id="{n['slug']}">
          <div class="note-article__top">
            <p class="eyebrow">{n['lane']}</p>
            <a class="text-link fn-play__back" href="playbook.html"><span class="arrow" aria-hidden="true">←</span> All Articles</a>
          </div>
          <h1 class="note-article__title" id="{n['slug']}-title">{esc(n['title'])}</h1>
          <p class="note-article__stand">{esc(n['stand'])}</p>
          <p class="note-article__byline"><span class="note-article__author">Tavis Scholz</span> · {n['date']} · {n['minutes']} min read {listen_button(n, 'play')} {speed_button()} {share_button(n)}</p>
          <div class="note-article__body">
            {n['body']}
          </div>
          {article_session(n, "          ")}{closer_html()}
        </article>
        <nav class="fn-next reveal" aria-label="Next article">
          <p class="eyebrow">Next Article</p>
          <a class="fn-next__link" href="{play_href(nxt)}">
            <span class="fn-next__lane">{nxt['lane']}</span>
            <span class="fn-next__title">{esc(nxt['title'])}</span>
            <span class="fn-next__more">Read <span class="arrow" aria-hidden="true">→</span></span>
          </a>
        </nav>
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
(ROOT / "plays").mkdir(exist_ok=True)
for j, n in enumerate(notes):
    (ROOT / "plays" / f"{n['slug']}.html").write_text(nested(clean_links(stamp_assets(play_page(n, notes[(j + 1) % len(notes)])))))

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
    chips = ["Brand &amp; growth marketing", "Finance &amp; unit economics", "Merchandising &amp; category management", "People operations", "Data &amp; automation", "Supply chain &amp; logistics", "Tech &amp; networking", "Production &amp; manufacturing", "Store development &amp; construction", "Program &amp; launch management"]
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
        '          <img src="assets/images/join-onboarding-swag.webp" width="1200" height="800" alt="SKALA onboarding kit on a workbench: laptop, crown-badged backpack and card" loading="lazy">',
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
# ---------- are you ready: the four free working sessions ----------
def page_head(title, description):
    h = head.replace("<title>Playbook — SKALA</title>", f"<title>{title}</title>")
    return re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{description}">', h)
def ready_header():
    h = header.replace('<a class="nav-link" href="/are-you-ready">Are You Ready</a>', '<a class="nav-link" href="/are-you-ready" aria-current="page">Are You Ready</a>')
    assert 'aria-current="page"' in h, "Are You Ready link not found in the header"
    return h
def session_card(x):
    return f'''          <li class="session-card" id="{x['id']}">
            <p class="session-card__lane"><span class="session-card__tag" aria-hidden="true">{x['tag']}</span> {x['lane']}</p>
            <h2 class="session-card__title">{x['title']}</h2>
            <p class="session-card__text">{x['text']}</p>
            <a class="button button--ink" href="{session_href(x)}">{x['cta']} <span class="arrow" aria-hidden="true">\u2192</span></a>
          </li>'''
def sessions_page():
    parts = [
        "<!doctype html>", '<html lang="en">',
        page_head("Are You Ready — SKALA", "Four free working sessions from SKALA: find the bottleneck, pressure-test an opening, review a site, or check franchise readiness. Bring the issue and leave with a clearer next move."),
        '<body class="sessions-page">',
        '  <a class="skip-link" href="#main">Skip to content</a>', "", svgdefs, "", ready_header(), "",
        '  <main id="main">',
        '    <section class="section section--paper sessions" aria-labelledby="sessions-title">',
        '      <div class="container">',
        '        <div class="sessions__intro reveal">',
        '          <p class="eyebrow">Free working sessions</p>',
        '          <h1 class="section-title" id="sessions-title">Four focused sessions.</h1>',
        '          <p class="section-intro">Bring the issue. Bring what you already know. We\u2019ll pressure-test it, find what matters, and leave you with a clearer next move.</p>',
        '        </div>',
        '        <ul class="session-cards reveal">',
        "\n".join(session_card(x) for x in SESSIONS),
        '        </ul>',
        '      </div>', '    </section>', "",
        '    <section class="section section--acid fn-close sessions-close" aria-labelledby="sessions-close-title">',
        '      <div class="container fn-close__grid">',
        '        <h2 class="section-title" id="sessions-close-title">Not a pitch. A working session.</h2>',
        '        <div>',
        '          <p class="section-intro">No deck. No long assessment. No obligation to keep going.</p>',
        '          <p class="section-intro">Bring one real operating question. We\u2019ll spend the session getting clearer on it.</p>',
        '          <a class="button button--ink" href="index.html#contact">Book a working session <span class="arrow" aria-hidden="true">\u2192</span></a>',
        '        </div>',
        '      </div>', '    </section>', '  </main>', "", footer, "",
        '  <script src="js/site.js" defer></script>', '</body>', '</html>', "",
    ]
    return "\n".join(parts)
def tool_page(current):
    """The readiness tool (SCALE ladder and workboard): what /are-you-ready carried until 9 October 2026.
    Built to archive/are-you-ready-old.html (unlisted, noindex); with READY_PAGE = "tool" it is /are-you-ready again."""
    section = (ROOT / "tools/partials/are-you-ready-old.html").read_text()
    section = section[section.index("<section"):].rstrip()
    h = page_head("Are You Ready — SKALA", "Where do your capabilities stand today? Walk one operational capability up the SCALE readiness scale, from Siloed to Expansion-ready.")
    if not current: h = h.replace("</head>", '  <meta name="robots" content="noindex">\n</head>')
    parts = [
        "<!doctype html>", '<html lang="en">', h, '<body class="ready-page">',
        '  <a class="skip-link" href="#main">Skip to content</a>', "", svgdefs, "",
        ready_header() if current else header, "",
        '  <main id="main">', "    " + section, "",
        '    <section class="section section--acid fn-close" aria-labelledby="fn-close-title">',
        '      <div class="container fn-close__grid">',
        '        <h2 class="campaign-heading" id="fn-close-title">Build a<br>business<br>that\u2019s ready<br>for growth.</h2>',
        '        <div>',
        '          <p class="section-intro">Share where your operation needs to get stronger.</p>',
        '          <a class="button button--ink" href="index.html#contact">Let\u2019s build <span class="arrow" aria-hidden="true">\u2192</span></a>',
        '        </div>',
        '      </div>', '    </section>', '  </main>', "", footer, "",
        '  <script src="js/site.js" defer></script>', '</body>', '</html>', "",
    ]
    return "\n".join(parts)
(ROOT / "are-you-ready.html").write_text(clean_links(stamp_assets(sessions_page() if READY_PAGE == "sessions" else tool_page(True))))
(ROOT / "archive").mkdir(exist_ok=True)
(ROOT / "archive/are-you-ready-old.html").write_text(nested(clean_links(stamp_assets(tool_page(False)))))
print("built: index.html band + dialogs + session lines, playbook.html, plays/, merch.html, privacy.html, terms.html, work-with-us.html, are-you-ready.html, archive/are-you-ready-old.html")
