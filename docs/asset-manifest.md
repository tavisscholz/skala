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
