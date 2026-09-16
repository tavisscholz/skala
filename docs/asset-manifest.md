# Asset manifest — SKALA 01 Operator Movement

| Asset | Status | Location | Notes |
|---|---|---|---|
| Hero photograph | **Supplied** — `assets/images/hero-store-floor.webp` (1536 × 1024) | `.hero__media` | Two operators walking the store floor, SKALA and crown on the back of the tee. Poster wordmark and crown hide automatically; the brush line "Same stores. Bigger stories." stays as the caption layer. |
| Secondary photograph | **Supplied** — `assets/images/campaign-team-training.webp` (1200 × 800) | `.campaign__media` | Team training moment beside the acid campaign panel; condensed line sits in the darkened lower band. |
| Approach figure | **Supplied** — `assets/images/approach-before-doors-open.webp` (1200 × 800) | `#approach` intro | Storefront at first light, shutter half raised. Caption "Before the doors open". |
| Tool figure | **Supplied** — `assets/images/tool-opening-checklist.webp` (1200 × 800) | tool section intro | Clipboard opening checklist beside the workboard. Caption "Opening checklist". |
| About figure | **Supplied** — `assets/images/about-operator-in-aisle.webp` (900 × 1350) | `.about__aside` | Operator seen from behind walking the aisle; not a portrait and not presented as Tavis. Notebook card overlaps it. A real portrait of Tavis can replace this. |
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

## Source photographs

Originals live in `assets/images/source/` (PNG, 1536 × 1024 or 1024 × 1536). Regenerate the
WebP set with `python3 tools/prepare-images.py assets/images/source`. The other seven
photographs shared in chat (shelf duo, crown-tee huddle, notebook at counter, stockroom,
storefront film install, laptop review, doorway, sidewalk, notebook portrait) were not
uploaded and are not in the repository.
