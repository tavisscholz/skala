# Asset manifest — SKALA 01 Operator Movement

| Asset | Status | Location | Notes |
|---|---|---|---|
| Hero photograph | **Supplied** — `assets/images/hero-store-floor.webp` (1536 × 1024) | `.hero__media` | Two operators walking the store floor, SKALA and crown on the back of the tee. Poster wordmark and crown hide automatically; the brush line "Same stores. Bigger stories." stays as the caption layer. |
| Secondary photograph | **Supplied** — `assets/images/campaign-team-training.webp` (1200 × 800) | `.campaign__media` | Team training moment beside the acid campaign panel; condensed line sits in the darkened lower band. |
| Approach figure | **Supplied** — `assets/images/approach-before-doors-open.webp` (1200 × 800) | `#approach` intro | Storefront at first light, shutter half raised. Caption "Before the doors open". |
| Tool figure | **Dropped** — the Expansion Ready section carries no photograph so it fits one screen | tool section intro | |
| Field notes figure | **Supplied** — `assets/images/notes-field-notebook.webp` (1024 × 1536, cropped 4:3) | `#field-notes` intro | SKALA field notebook on a worktable with plans. Caption "The field notebook". |
| About figure | **Supplied** — `assets/images/about-between-locations.webp` (683 × 1024, portrait crop of SKALA_18) | `.about__aside` | Operator seen from behind walking between locations; not a portrait and not presented as Tavis. Notebook card overlaps it. A real portrait of Tavis can replace this. |
| Brush wordmark | Created (trial) | Permanent Marker text; `assets/wordmark.svg` as SVG fallback | Not finished logo artwork. |
| Brush underline | Created | inline SVG in the hero; `assets/underline.svg` | Two overlapping strokes, tilted upward, animated draw. |
| Ridge | Created | `#mark-ridge` symbol; `assets/ridge.svg` | Two-peak mountain ridge drawn as a graffiti marker stroke, with a drip and spray dots, on a ground line; replaces the crown (20 September). Placements: header wordmark, hero poster, campaign card. The photographs still show the crown. |
| Smile | Created | `#mark-smile` symbol; `assets/smile.svg` | One campaign use, acid panel. |
| Torn paper edge | Created | `#mark-torn` symbol; `assets/torn-edge.svg` | One use, bottom of the campaign strip. Hidden from AT. |
| Paper grain tile | Created | data-URI in `css/site.css`; `assets/paper-grain.svg` | Applied only to the hero acid panel and black poster surfaces, never on reading surfaces. |
| Favicon | Created | `assets/favicon.svg` | Ridge on acid square. |
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

Twenty originals live in `assets/images/source/` (PNG, 1536 × 1024 or 1024 × 1536).
Regenerate the WebP set with `python3 tools/prepare-images.py assets/images/source`; the
mapping at the top of that script names which source feeds which slot.

| Source | On the page | Notes |
|---|---|---|
| `SKALA_01_store_floor_hero` | Hero | |
| `campaign-team-training` (SKALA_02) | Campaign poster | |
| `approach-before-doors-open` (SKALA_03) | How we work | |
| `about-between-locations` (SKALA_18, cropped 2:3) | About | Not presented as Tavis |
| `join-onboarding-swag` (SKALA_21) | Work with us | |
| `SKALA_09_the_field_notebook` | Field notes | |
| SKALA_06 manager coaching · 07 stockroom systems · 08 workshop in progress · 10 site walk · 11 measuring the space · 12 merchandising together · 13 the opening huddle · 14 store review · 15 quiet leadership · 16 hands-on training · 17 opening preparation · 18 between locations · 19 the working table · 20 end of day | Not placed | Alternates for the slots above, or for the field-note article views and future pages. 08, 10, 11 and 19 suit an Expansion story; 15 and 20 are portraits and should not stand in for Tavis. |
