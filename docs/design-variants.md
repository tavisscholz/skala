# Design variants: legacy and architectural

The site ships two visual presentations of the same markup, copy and
functionality. **Legacy** is the original SKALA look. **Architectural** is the
refinement from the 19 Oct 2026 brief: straight hairline boundaries, one
consistent diagonal image cut, the house sans in place of the brush faces,
flat surfaces and square stamps. Legacy is the default until the refined
version is approved.

## The switch

One value, in `tools/build-notes.py`:

```python
DESIGN = os.environ.get("SKALA_DESIGN", "legacy")
```

- To ship the refined design, change `"legacy"` to `"architectural"` and run
  `python3 tools/build-notes.py`. Every page's `<body>` gets
  `data-design="architectural"` and the homepage loses its `tears` class.
- To return to the original design, set it back to `"legacy"` and rebuild.
  The pages come back byte-for-byte to the legacy build.
- For a one-off build without editing the file:
  `SKALA_DESIGN=architectural python3 tools/build-notes.py`.

The build is the rollback mechanism. Nothing depends on the browser.

### Review override (not a rollback mechanism)

A six-line inline script at the top of every `<body>`, written by the build,
reads `?design=architectural` or `?design=legacy` from the address, applies it
before first paint and remembers it for the browser session. It exists so
both variants can be compared on the same deployment, for example
`https://buildwithskala.com/?design=architectural` once this branch ships
with the legacy default. Clear the session (or open `?design=legacy`) to go
back. It never changes what is served.

## How it is built

- `css/site.css`: every rule for the refined design sits in one block at the
  end of the file, scoped under `[data-design="architectural"]`. No rule above
  that block was changed. The torn-paper implementation (`.tears .tear …`,
  the `#tear-rough` SVG filter in the markup, `assets/torn-edge.svg`, the
  clip-path polygons) is untouched and still runs in the legacy build.
- `tools/build-notes.py`: `DESIGN`, `DESIGN_SCRIPT` and `apply_design()`,
  which rewrites the `<body>` tag of every page it writes. The torn seams on
  the homepage are flagged with `data-tears`; the `tears` class that
  activates them is only written in the legacy build.
- `tools/preview-check.mjs`: the torn-seam check is now design-aware, and
  four checks cover the variant attribute on every page, the as-built
  presentation, the review override in both directions, and the wordmark's
  face and tilt being identical in both variants.
- No new fonts, images, scripts, dependencies, colors or animations.
  The hairline color is the ink at 24% that the About stats already use.

## What the architectural variant changes

| Element | Legacy | Architectural |
| --- | --- | --- |
| Section seams | Torn paper on the homepage (hero sheet, strip, Articles band, Contact), serrated strip edge, paper grain | Straight edges. A 1px hairline only where two paper sections meet (Articles hub). No grain. |
| Hero photo | Acid sheet torn over the photograph | Split layout, photo bottom edge cut at 10° rising to the right |
| Campaign block | Acid sheet torn over the photograph; line set in the wordmark face, tilted and staggered; brush underline | Split layout; line set in Inter 900, square, sized to the panel; caption wraps to two lines |
| "See. Plan. Do. Check. Act. Repeat." | Permanent Marker | Inter 900 |
| Hero underline, careers underline, campaign underline | Brush strokes | Off |
| Tags, chips, stamps, numbers, peaks mark | Tilted 1.25° to 4° | Square |
| "Do This Week" label in articles | Permanent Marker | Inter label style |
| About, Careers and Articles-hub figures | Straight | Bottom edge cut at the same 10°, same direction |
| Wordmark (header, footer, hero poster) | Oracle Brush, tilted 2° | **Unchanged** |

Images that deliberately keep straight edges: the campaign photograph (its
caption sits in the corner a cut would take, and the team leader's head is at
the top left), the How We Work section (no photograph), merch product shots,
article pages.

### The diagonal cut

One rule, applied to a list of elements:

```css
[data-design="architectural"] :is(.hero__media, .about .figure, .join .figure, .fn-hero .figure) {
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - var(--cut-drop)), 0 100%);
}
```

`--cut-drop` is tan(10°) times the element's width: `8.8vw` for the hero photo
beside the copy, `17.6vw` when it spans a phone, and a share of the height for
the fixed-ratio figures (2:3 → 11.75%, 3:2 → 26.4%, 4:3 → 23.5%). Measured in
Chromium the hero edge is 10.0° at 375, 768 and 1440px. Source image files
are not cropped; the cut is a CSS clip.

## Validation (19 Oct 2026)

- `python3 tools/build-notes.py` (legacy) and
  `SKALA_DESIGN=architectural python3 tools/build-notes.py`: both clean.
  Rebuilding is idempotent.
- `node tools/preview-check.mjs`: 128/128 on the legacy build and 128/128 on
  the architectural build (existing 124 plus the four variant checks).
  No horizontal overflow at 320, 390, 768 or 1440px in either build.
- Full-page captures of the homepage, Articles hub, Careers, Are You Ready
  and Merch at 375, 768 and 1440px for both variants, plus section captures
  of the hero, campaign and About blocks. The hero copy, navigation, forms,
  footer and all CTAs render and work identically in both.
- `git diff backup/pre-architectural-20261019 -- assets/ css/fonts.css css/tokens.css js/ .htaccess contact.php` is empty:
  no asset, font, token, script or server file changed.
- Known, pre-existing, out of scope: the campaign caption "Strong operators
  prepare." renders at 7.5px on phones in both variants (the legacy
  `calc(3.6vw - 6px)` sizing). Not changed here because it is not a variant
  difference.

## Git rollback

| Item | Value |
| --- | --- |
| Pre-change commit | `c9ef1286af01735ee545d70325b21b65f6e35485` (`claude/hopeful-babbage-pcgjgf`, tree clean) |
| Backup branch (on GitHub) | `backup/pre-architectural-20261019` at that commit |
| Work branch | `design/skala-architectural-refinement` |

To drop the refinement entirely, revert its commits on whichever branch
carries them:

```sh
git revert --no-edit backup/pre-architectural-20261019..design/skala-architectural-refinement
```

or reset the work branch while it is still unmerged:

```sh
git checkout design/skala-architectural-refinement
git reset --hard backup/pre-architectural-20261019
git push --force-with-lease origin design/skala-architectural-refinement
```

Production (`buildwithskala.com`, Hostinger Git deploy of
`claude/hopeful-babbage-pcgjgf`) is untouched by this branch. It only changes
if the branch is merged into the deploy branch and pushed; with `DESIGN`
left at `"legacy"` even that deploy keeps the current look and merely adds
the `?design=` review switch.
