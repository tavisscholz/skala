# Implementation notes — SKALA 01 Operator Movement

Internal record for the website trial. Nothing in this file renders on the site.

## What was built

- One long-form homepage, plain HTML / CSS / JS, no build step and no dependencies.
  React was not used because the brief asks for a self-contained preview that
  runs anywhere; the CSS is still organised as reusable components with all
  tokens centralised in `css/tokens.css`.
- Sections in order: Header · Hero (7/5 acid + black poster) · Campaign strip ·
  The work (`#work`, four expandable numbered rows) · Campaign poster
  (black poster + acid brush panel with the one smile use) · How we work
  (`#approach`, headline and one paragraph; the five-step sequence moved into the conversation) · Illustrative operating tool (interactive
  three-row workboard with live region and reset) · Field notes
  (`#field-notes`, two rows opening full articles in native dialogs) ·
  About (`#about`) · Contact (`#contact`, validating form that produces a
  copyable draft) · Footer.
- Every navigation item resolves to an anchor. Primary CTAs reach `#contact`
  in one action. Header is sticky and reserves its space; `scroll-padding-top`
  respects it for anchor jumps.
- Field notes use `<dialog>` with `showModal()` (focus containment, Escape,
  backdrop click). Focus moves to the article heading on open and returns to
  the opener on close. If `showModal` is unavailable the article renders inline
  under its row with the same "Back to field notes" control.
- Contact form: custom inline errors tied to fields with `aria-describedby`
  and `aria-invalid`, focus moves to the first invalid field, the draft state is
  announced through a polite live region. Copy uses the Clipboard API when
  available; on failure the draft text is selected and the fallback message
  shown. Nothing is transmitted anywhere; the draft lives in memory only.
- Motion: hero underline draws in over 450 ms after fonts are ready; content
  enters over 220 ms with 12 px travel. `prefers-reduced-motion` shows final
  states immediately. No marquee, no scroll hijacking, no looping crown.
- Focus rings are 3 px with 3 px offset, black on acid/paper and acid on black.
  All controls are at least 44 × 44 px.
- Semantics: skip link, `header/nav/main/section/footer` landmarks, one `h1`,
  ordered headings, decorative vectors hidden with `aria-hidden`.

## Capability section revision (16 September, experience-aligned architecture)

The `#work` section carries the four experience lanes from the final
experience-aligned capability handoff (copy used verbatim): Store Operations, Store Development,
Real Estate & Leasing, Franchise Development. It replaces both the original
Strategy / Operations / People / Expansion rows and the intermediate taxonomy;
the two were not merged. Heading and intro are the handoff's closed-state copy.
Each row expands to What breaks · What we build · What becomes possible in the
sans system. All rows start closed and opening one closes the others, at every width
(owner decision, 18 September, overriding the handoff's open-first-row rule). Lanes 03 and 04 carry the handoff's
scope notes between What we build and What becomes possible. Nothing else on the page changed.

## Voice and index revision (17 September)

- Brand voice is third person: SKALA is the subject wherever a capability is
  described, Tavis is the subject only where experience is the point. "Let's
  build →" stays as the primary CTA; the visitor's own voice in the contact
  draft is untouched.
- Index numerals are brush figures without leading zeros across the
  capability rows and field notes; the field notes carry a
  hand-drawn ring like the board.
- One brush pull quote in Field notes, taken from note 1. Extra vertical
  space before About and Contact on desktop.

## Playbook from `assets/articles` (17–18 September)

Four markdown articles are rendered as the Playbook section (nav: Playbook; heading "Plays from the work."): three field
notes and one operator tool, each tagged with its capability lane (OPS, RE,
FRAN, DEV). The row shows title, standfirst, lane tag, and kind; the dialog
carries the standfirst, a byline and date from the file, the body, any table
(as a scrollable table), and the closing "This week" callout on acid. Copy is
verbatim from the files; the articles keep their author's first person because
they are bylined writing, not brand copy. `tools/build-notes.py` regenerates
the homepage band, the dialogs, and `playbook.html` from the folder. The
homepage keeps a compact list (tag, title, standfirst) that opens each note in
place; the page carries all four in full with a sticky index and per-article
anchors, and is the shareable destination.

## Departures from the brief, and why

| Brief | Built | Reason |
|---|---|---|
| Hero H1 80–104 px desktop | ≈76 px at 1440 (`clamp(2.5rem, 1.84rem + 3.24vw, 4.75rem)`) | Measured in Inter Black with -0.045 em tracking, "Bigger tomorrows." is 8.6 em wide. The 7-column acid panel leaves ≈664 px for copy at 1440, so 76 px is the largest size that keeps the two intentional lines intact and the offer readable in the first screen. Raise the cap if the panel split or the tracking changes. |
| Hero H1 42–50 px mobile | 40 px at 390 | Same constraint: 42 px pushes "tomorrows." to a third line on a 390 screen. At 320 the headline is allowed to wrap. |
| Tablet (768–1023) "reduce headline scale" | 42 px, three lines | 6/6 split leaves ≈320 px per column; "Real operators." stays on one line, "Bigger tomorrows." wraps with the underline beneath. |
| Campaign accent 48–72 px desktop | 54 px cap for the strip | The four words with separators are 22.5 em wide in Permanent Marker; 54 px is the largest size that keeps the strip on one line inside 1280 px. Other brush phrases use the full range. |
| Google Fonts | Self-hosted woff2 (`assets/fonts/`) | Keeps the prototype offline-capable and free of third-party requests. Both faces are OFL; see `assets/fonts/LICENSE.md`. |

## Missing assets and fallbacks

- **Photography supplied** on 16 September: five black-and-white documentary
  frames, placed as hero, campaign, approach, tool, and About figures. See
  `docs/asset-manifest.md`. Photos are converted to greyscale WebP by
  `tools/prepare-images.py`; CSS applies a light contrast lift.
- **No founder portrait.** The About aside carries an operator seen from
  behind with the notebook card over it. It is not captioned or presented as
  Tavis. Swap in a real portrait when one exists.
- **Wordmark** is Permanent Marker set with a slight rotation. It is a trial
  approximation, not finished logo artwork. A rough stroked SVG wordmark
  (`assets/wordmark.svg`, also inlined as `#mark-wordmark`) is swapped in
  automatically if the brush font fails to load.

## Checks performed

Run with `node tools/preview-check.mjs` in headless Chromium (Playwright 1.56).

- Rendered at 1440 × 900, 768 × 1024, 390 × 844, and 320 × 640. No horizontal
  overflow at any width; no console or page errors once fonts were self-hosted.
- At 390 × 844 the wordmark, complete H1, business explanation, and primary
  CTA are all inside the first viewport.
- Service rows: expand/collapse with correct `aria-expanded` and hidden panel.
- Workboard: each step switches Working on ↔ Done; progress per SCALE stage is kept in localStorage; a stage with every step in use lights its tile, and all five complete opens the Ready to scale celebration; live region
  updates; Reset restores initial statuses.
- Field notes: dialog opens, focus lands on the heading, Escape closes and
  returns focus to the opener; the in-article back button also closes.
- Contact: empty submit shows all three errors and focuses Name; invalid email
  is caught; valid submit shows the draft panel and announces the confirmation;
  Copy reports "Inquiry copied."; a failing clipboard falls back to selecting
  the text with "Select and copy your inquiry below."; Edit draft returns to
  the form with values intact.
- Mobile menu: opens, closes on Escape, closes on link selection and scrolls
  to the target.
- Reduced motion: all content visible immediately with no transforms.
- Screenshots at each width were reviewed by eye for line breaks, cropping,
  contrast, and poster rhythm. The desktop, tablet, and mobile hero variants
  were iterated until the intentional line breaks held.

Not verified here: real screen-reader output, Safari/Firefox rendering, and
touch behaviour on a physical device.

## Logo-free test

Hide `.wordmark` and `.poster__wordmark`: the acid fields, torn edge, brush
underline, numbered rows, crown, and black poster surfaces still identify the
territory.

## Labels and About (18 September)

- Navigation reads What We Do · How We Do It · Playbook · About; the approach
  eyebrow reads "How we do it". These reintroduce "we" in labels by the
  owner's decision; body copy stays third person.
- Playbook row kind is Play for all four pieces. The playbook is downloadable as one PDF
  (`assets/downloads/skala-playbook.pdf`), printed from `playbook.html` by
  `tools/build-pdf.mjs` using the print stylesheet; regenerate after any copy
  change. Linked from the playbook index and the homepage band.
- About heading is "An operator who builds." with the owner's expanded first
  paragraph (12 years, four departments, 7× system sales growth, 160 store
  projects, U.S. and Canada franchise infrastructure).

## Expansion Ready (18 September)

The operating-tool section became "Expansion Ready" (`#ready`): a five-level
readiness ladder, the SCALE scale (Siloed · Captured · Adopted · Linked · Expansion
ready) in SKALA language, then the workboard as "the same scale, on a real
board". When every row reaches In use, a brush stamp reads "Expansion ready.
Now it can repeat." and the live region announces it. Until then the stamp sits faded in
white behind a dashed ring; Reset fades it again. The ladder is derived from the
Institution Ready maturity scale but the site never uses that name, the ™,
programme lengths, or investor language; those stay with TS Advisory.

## Torn paper (18 September)

Five seams tear the way the campaign mockup does: the hero copy sheet tears diagonally across the photograph (a horizontal rip over the top of the photo once the hero stacks), the brand strip tears into the hero above and the paper below, the Expansion Ready block tears over the Playbook band, and the contact sheet tears up into About. Paper sections carry a whisper of grain.

How it works: each seam is an empty `<i class="tear tear--top|bottom|hero">` inside the section that owns the sheet. Its `::before` is the exposed white paper core, its `::after` the sheet colour; both share a hand-shaped `clip-path` polygon (generated once with a seeded random walk, baked into `css/site.css`), and the parent's SVG filter `#tear-rough` (turbulence + displacement) roughens the cut. No image assets.

Revertable by design: every rule lives under `body.tears` in one marked block of `css/site.css`. Remove the class from `<body>` in `index.html` and the site is back to clean edges and the old serrated strip; or revert the single commit that added it.

## Merch page (18 September)

`merch.html` is a fifth tab: four items (tee $25, hat $25, jacket $75, notebook $15), each a 3:2 product photo with name and price. The page is generated by `tools/build-notes.py` from its `MERCH` list so the header and footer stay in sync with the homepage; the photos are the owner's `SKALA <item>.png` uploads in `assets/images`, converted to WebP by `tools/prepare-images.py` (kept in colour, no autocontrast). Also removed on the homepage: the hero note, the strip note, and the contact preview helper.
