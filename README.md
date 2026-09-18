# SKALA — Operator Movement website trial

A self-contained, responsive prototype of the SKALA homepage built to the
**SKALA 01 — Operator Movement** handoff. It is a website "try-on" for the
brand direction, not a deployment: no backend, no form submission, no analytics.

## Run it

Open `index.html` directly in a browser, or serve the folder:

```
npx http-server . -p 8080
```

## Structure

| Path | What it is |
|---|---|
| `index.html` | Long-form homepage with `#work`, `#approach`, `#field-notes`, `#about`, `#contact` |
| `playbook.html` | The playbook: all four notes and tools in full, built from `assets/articles` by `tools/build-notes.py` |
| `merch.html` | Merch: the tee, hat, jacket and notebook with prices, also built by `tools/build-notes.py` |
| `css/tokens.css` | Locked trial tokens plus the type, spacing, and motion scale |
| `css/site.css` | Component styles (Header, Hero, CampaignStrip, ServiceRow, ApproachStep, OperatingTool, FieldNote, AboutBlock, ContactForm, Footer) |
| `css/fonts.css` | Self-hosted Inter and Permanent Marker |
| `js/site.js` | Navigation, service rows, workboard, field-note dialogs, contact draft, enter motion |
| `assets/` | Vector marks, favicon, fonts |
| `docs/implementation-notes.md` | What was built, what was checked, and where the build departs from the brief |
| `docs/asset-manifest.md` | Supplied / created / fallback assets and image-slot instructions |
| `tools/build-pdf.mjs` | Prints `playbook.html` to `assets/downloads/skala-playbook.pdf` |
| `tools/preview-check.mjs` | Playwright script that renders 1440 / 768 / 390 / 320 and exercises every interaction |

## Checks

```
npm i -D playwright   # once; then: npx playwright install chromium
node tools/preview-check.mjs preview-out
```

Screenshots land in `preview-out/`; the script exits non-zero if any check fails.
