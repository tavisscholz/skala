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
  (`#approach`, five steps) · Illustrative operating tool (interactive
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
sans system. The first row is open by default; below 768px only one row is
open at a time; desktop may hold several open. Lanes 03 and 04 carry the handoff's
scope notes between What we build and What becomes possible. Nothing else on the page changed.

## Voice and index revision (17 September)

- Brand voice is third person: SKALA is the subject wherever a capability is
  described, Tavis is the subject only where experience is the point. "Let's
  build →" stays as the primary CTA; the visitor's own voice in the contact
  draft is untouched.
- Index numerals are brush figures without leading zeros across the
  capability rows, approach steps, and field notes; the field notes carry a
  hand-drawn ring like the board.
- One brush pull quote in Field notes, taken from note 1. Extra vertical
  space before About and Contact on desktop.

## Field notes from `assets/articles` (17 September)

Four markdown articles are rendered as the Field notes section: three field
notes and one operator tool, each tagged with its capability lane (OPS, RE,
FRAN, DEV). The row shows title, standfirst, lane tag, and kind; the dialog
carries the standfirst, a byline and date from the file, the body, any table
(as a scrollable table), and the closing "This week" callout on acid. Copy is
verbatim from the files; the articles keep their author's first person because
they are bylined writing, not brand copy. `tools/build-notes.py` regenerates
the section from the folder.

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
- Workboard: status cycles Building → Testing → In use → Building; live region
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
