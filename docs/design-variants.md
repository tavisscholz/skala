# Design variants: legacy and architectural

The site ships two visual presentations of the same markup, copy and
functionality. **Legacy** is the original SKALA look. **Architectural** is the
refinement from the 19 Oct 2026 brief: straight hairline boundaries, one
consistent diagonal image cut, the house sans in place of the brush faces,
flat surfaces and square stamps. Architectural has been the shipped default
since 20 Oct 2026; legacy stays in the code, one value away.

## The switch

One value, in `tools/build-notes.py`:

```python
DESIGN = os.environ.get("SKALA_DESIGN", "architectural")
```

- To return to the original design, change `"architectural"` to `"legacy"`,
  run `python3 tools/build-notes.py`, commit and push. Every page's `<body>`
  gets `data-design="legacy"` and the homepage regains its `tears` class; the
  pages come back byte-for-byte to the legacy build.
- For a one-off build without editing the file:
  `SKALA_DESIGN=legacy python3 tools/build-notes.py`.

The build is the rollback mechanism. Nothing depends on the browser.

### Review override (not a rollback mechanism)

A six-line inline script at the top of every `<body>`, written by the build,
reads `?design=architectural` or `?design=legacy` from the address, applies it
before first paint and remembers it for the browser session. It exists so
both variants can be compared on the same deployment: open
`https://buildwithskala.com/?design=legacy` to see the original look for the
rest of the browser session, and `?design=architectural` to come back. It
never changes what is served.

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
| Hero photo | Acid sheet torn over the photograph | Split layout; the acid runs over the photo's left edge at 75°, from its bottom-left corner up to the right (tablet and desktop; straight on phones) |
| Campaign block | Acid sheet torn over the photograph; line set in the wordmark face, tilted and staggered; brush underline | Split layout; the acid runs under the photo's right edge at the same 75°, up to its top-right corner (tablet and desktop; straight on phones); line set in Inter 900, square, sized to the panel; caption wraps to two lines |
| "See. Plan. Do. Check. Act. Repeat." | Permanent Marker | Inter 900 |
| Hero underline, careers underline, campaign underline | Brush strokes | Off |
| Tags, chips, stamps, numbers, peaks mark | Tilted 1.25° to 4° | Square |
| "Do This Week" label in articles | Permanent Marker | Inter label style |
| Photographs on phones | Hero 4:3, campaign 260px minimum, About portrait 2:3 | Campaign and About match the hero's height (75vw), cropping into the picture; the hero photo is cropped in 15% from the left and 7.5% top and bottom. Tablet and desktop unchanged |
| Wordmark (header, footer, hero poster) | Oracle Brush, tilted 2° | **Unchanged** |

Every other photograph keeps straight edges: the About portrait, the Careers
and Articles-hub figures, merch product shots and article pages. The diagonal
belongs only where a photograph meets the acid panel.

### The diagonal cut

Two pseudo-elements, one rule:

```css
[data-design="architectural"] .hero__media::after,
[data-design="architectural"] .campaign__media::after {
  content: ""; position: absolute; top: 0; bottom: 0; aspect-ratio: 0.26795 / 1;   /* width = height × tan 15° */
  background: var(--color-acid); clip-path: …;                                       /* a triangle */
}
```

The hero wedge sits on the photo's left edge and is clipped to the triangle
that starts at the bottom-left corner and rises to the right; the campaign
wedge sits on the right edge and is clipped to the triangle that rises to the
top-right corner. Because the wedge's width comes from its aspect ratio, the
edge is 75° from horizontal at every hero height (measured 75° at 768 and
1440px). Below 768px the blocks stack and both wedges are off, so phones see
straight edges. Source image files are not cropped.

## Validation (19 Oct 2026)

- `python3 tools/build-notes.py` (legacy) and
  `SKALA_DESIGN=architectural python3 tools/build-notes.py`: both clean.
  Rebuilding is idempotent.
- `node tools/preview-check.mjs`: 128/128 on the legacy build and 128/128 on
  the architectural build (existing 124 plus the four variant checks).
  No horizontal overflow at 320, 390, 768 or 1440px in either build.
- Full-page captures of the homepage, Articles hub, Careers, Are You Ready
  and Merch at 375, 768 and 1440px for both variants, plus section captures
  of the hero and campaign blocks. The hero copy, navigation, forms,
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
`claude/hopeful-babbage-pcgjgf`) received the architectural default on
20 Oct 2026. To roll production back without touching Git history, set
`DESIGN` to `"legacy"`, rebuild, commit and push to the deploy branch; the
webhook redeploys within a minute. To undo the whole refinement instead, use
the revert above on the deploy branch. Emergency fallback: point hPanel
(Advanced → Git) at `backup/pre-architectural-20261019` and click Deploy.
