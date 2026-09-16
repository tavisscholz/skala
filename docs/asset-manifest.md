# Asset manifest — SKALA 01 Operator Movement

| Asset | Status | Location | Notes |
|---|---|---|---|
| Hero photograph 1600 × 1200 | **Missing — fallback in place** | slot `.hero__media[data-image-slot="hero"]` | Black poster composition with oversized brush SKALA, crown, and "Same stores. Bigger stories." holds the space. |
| Secondary photograph 1200 × 900 | **Missing — fallback in place** | slot `.campaign__media[data-image-slot="secondary"]` | Black poster with the condensed campaign line "Operators make a brighter tomorrow." |
| Founder portrait | Not supplied | `.about__aside[data-image-slot="portrait"]` | Wordmark + notebook detail per brief. Replace only with a portrait Tavis supplies. |
| Brush wordmark | Created (trial) | Permanent Marker text; `assets/wordmark.svg` as SVG fallback | Not finished logo artwork. |
| Brush underline | Created | inline SVG in the hero; `assets/underline.svg` | Two overlapping strokes, tilted upward, animated draw. |
| Crown | Created | `#mark-crown` symbol; `assets/crown.svg` | Two visible placements: hero poster, About notebook. |
| Smile | Created | `#mark-smile` symbol; `assets/smile.svg` | One campaign use, acid panel. |
| Torn paper edge | Created | `#mark-torn` symbol; `assets/torn-edge.svg` | One use, bottom of the campaign strip. Hidden from AT. |
| Paper grain tile | Created | data-URI in `css/site.css`; `assets/paper-grain.svg` | Applied only to the hero acid panel and black poster surfaces, never on reading surfaces. |
| Favicon | Created | `assets/favicon.svg` | Crown on acid square. |
| Inter (variable 400–900) | Downloaded, OFL | `assets/fonts/inter-variable-latin*.woff2` | Latin and latin-ext subsets. |
| Permanent Marker | Downloaded, OFL | `assets/fonts/permanent-marker-latin.woff2` | Latin subset. |

## Adding a photograph

1. Export as WebP or AVIF (JPEG fallback optional) and place it in `assets/images/`.
2. Inside the slot element, add the image **before** the poster:

```html
<div class="hero__media media-slot" data-image-slot="hero">
  <img class="media-slot__img" src="assets/images/hero.webp" width="1600" height="1200"
       alt="Store operators working together on the retail floor before opening" fetchpriority="high">
  <div class="poster poster--hero" aria-hidden="true">…</div>
</div>
```

The image is converted to high-contrast black-and-white by CSS and the poster
becomes a darkened caption layer over it. Use `loading="lazy"` on the secondary
image. Keep all lettering as HTML; never bake copy into the picture.

## Supplied photographs — placement plan (16 September)

Twelve black-and-white documentary photographs were shared in chat. They were
pasted inline, so they have not reached the repository yet; drop the originals
into `assets/images/source/` using the names below and run
`python3 tools/prepare-images.py assets/images/source`.

| # | Photograph | Plan | Source name |
|---|---|---|---|
| 1 | Two operators walking through the store, crate in hand, brush SKALA and crown on the back of the tee | **Hero.** Matches the board's hero composition; subjects sit right of centre, which suits the 7/5 split. The poster wordmark and crown hide automatically because the shirt carries both. | `hero-operators-walking` |
| 2 | Woman leading a huddle of five, crown on her chest | **Campaign poster** beside the acid "Good brands scale real lives." panel, with "Operators make a brighter tomorrow." over the darkened lower third. | `campaign-team-huddle` |
| 3 | Two operators fitting protective film to the storefront glass before opening | **How we work** intro figure, caption "Opening prep". It is literally the brief's "store opening preparation" image. | `approach-opening-prep` |
| 4 | Two people reviewing printed sheets at a laptop, SKALA cap | **Field notes** intro figure, caption "From the work". | `notes-review-desk` |
| 5 | Man in a SKALA jacket opening the store door, seen from behind | Candidate for the About aside. It shows no face, but it would still read as a stand-in for Tavis, so it stays out until Tavis says it is him or approves an anonymous figure there. | `about-doorway` (held) |
| 6 | Operator in a SKALA jacket walking a shopping street with a notebook | Candidate for the second field note ("The next opening starts in the stores you already have"). | `notes-street` (held) |
| 7 | Man talking through the work to four team members, crown on sleeve | Alternate for the campaign poster. | held |
| 8 | Two operators at the shelves, SKALA tee front | Alternate hero, subjects toward the right as the brief asks. | held |
| 9 | Two operators reviewing a marked-up notebook at the counter | Alternate field-notes figure. | held |
| 10 | Stockroom: scanning boxes, SKALA tee back | Reserve. Fits an operations story more than the homepage. | held |
| 11 | Woman holding a SKALA notebook, portrait | Reserve. A portrait in About would imply it is Tavis, so not used there. | held |
| 12 | Man in SKALA cap, huddle from behind (variant of 7) | Reserve. | held |

### Markup to add once the files exist

Hero (`.hero__media`, before the poster):

```html
<img class="media-slot__img" src="assets/images/hero-operators-walking.webp" width="1600" height="1067"
     alt="Two SKALA operators walking through a store before opening, one carrying a crate" fetchpriority="high">
```

Campaign (`.campaign__media`, before the poster copy):

```html
<img class="media-slot__img" src="assets/images/campaign-team-huddle.webp" width="1200" height="800"
     alt="A store leader talking through the work with five team members on the sales floor" loading="lazy">
```

Approach: wrap `.approach__intro` and a figure in `<div class="approach__grid">`:

```html
<figure class="figure figure--tall reveal">
  <img src="assets/images/approach-opening-prep.webp" width="1200" height="800"
       alt="Two operators fitting film to the storefront glass before an opening" loading="lazy">
  <figcaption class="figure__caption">Opening prep</figcaption>
</figure>
```

Field notes: wrap `.notes__intro` and a figure in `<div class="notes__grid">`:

```html
<figure class="figure figure--tall reveal">
  <img src="assets/images/notes-review-desk.webp" width="1200" height="800"
       alt="Two operators reviewing printed notes at a laptop in the back office" loading="lazy">
  <figcaption class="figure__caption">From the work</figcaption>
</figure>
```
