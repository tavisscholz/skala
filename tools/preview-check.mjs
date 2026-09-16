/* Renders the prototype at the widths named in the brief and exercises the
   interactive pieces. Usage:  node tools/preview-check.mjs [outDir]
   Requires Playwright (npx playwright install chromium if needed). */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
const outDir = resolve(process.argv[2] || 'preview-out');
mkdirSync(outDir, { recursive: true });

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.md': 'text/markdown' };
const server = createServer(async (req, res) => {
  const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  try {
    const body = await readFile(join(rootDir, path));
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const results = [];
const note = (label, ok, detail = '') => { results.push({ label, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`); };

for (const [w, h] of [[1440, 900], [768, 1024], [390, 844], [320, 640]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-in')); });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  note(`${w}px: no horizontal overflow`, overflow <= 0, `scrollWidth excess ${overflow}px`);
  note(`${w}px: no console/page errors`, errors.length === 0, errors.join(' | '));
  const fold = await page.evaluate(() => {
    const vis = sel => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r && r.bottom <= window.innerHeight; };
    return { wordmark: vis('.wordmark--header'), h1: vis('#hero-title'), lead: vis('.hero__lead'), cta: vis('.hero__actions .button') };
  });
  if (w === 390) note('390px: brand, headline, explanation and CTA visible before scrolling', Object.values(fold).every(Boolean), JSON.stringify(fold));
  await page.screenshot({ path: join(outDir, `full-${w}.png`), fullPage: true });
  await page.screenshot({ path: join(outDir, `fold-${w}.png`) });
  await page.close();
}

/* Interaction checks at desktop and mobile */
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-in')); });

// Service rows
const row = page.locator('.service-row__toggle').first();
await row.click();
note('service row expands', await row.getAttribute('aria-expanded') === 'true' && await page.locator('#service-strategy').isVisible());
await page.locator('#work').screenshot({ path: join(outDir, 'work-open-1440.png') });
await row.click();
note('service row collapses', await row.getAttribute('aria-expanded') === 'false' && !(await page.locator('#service-strategy').isVisible()));

// Workboard
const status = page.locator('.status-btn').first();
await status.click();
note('status cycles Building → Testing', (await status.getAttribute('data-status')) === 'testing' && (await page.locator('#board-live').textContent()).includes('Testing'));
await status.click(); await status.click();
note('status cycles back to Building', (await status.getAttribute('data-status')) === 'building');
await status.click();
await page.locator('#board-reset').click();
note('reset restores initial statuses', (await status.getAttribute('data-status')) === 'building' && (await page.locator('#board-live').textContent()).includes('reset'));

// Field note dialog
const opener = page.locator('[data-open-note="note-1"]');
await opener.click();
note('field note dialog opens', await page.locator('#note-1').evaluate(d => d.open));
note('focus moves into dialog', await page.evaluate(() => document.activeElement?.id === 'note-1-heading'));
await page.screenshot({ path: join(outDir, 'note-dialog-1440.png') });
await page.keyboard.press('Escape');
note('Escape closes dialog', !(await page.locator('#note-1').evaluate(d => d.open)));
note('focus returns to opener', await page.evaluate(() => document.activeElement?.getAttribute('data-open-note') === 'note-1'));
await page.locator('[data-open-note="note-2"]').click();
await page.locator('#note-2 .note-article__foot [data-close-note]').first().click();
note('back link closes second note', !(await page.locator('#note-2').evaluate(d => d.open)));

// Contact form
await page.locator('#contact-form button[type=submit]').click();
const errs = await page.locator('.field__error:not([hidden])').allTextContents();
note('empty submit shows three errors', errs.length === 3, errs.join(' / '));
note('focus on first invalid field', await page.evaluate(() => document.activeElement?.id === 'f-name'));
await page.fill('#f-name', 'Jordan Reyes');
await page.fill('#f-email', 'not-an-email');
await page.fill('#f-message', 'Opening two more stores next year and the manager onboarding is not consistent.');
await page.locator('#contact-form button[type=submit]').click();
note('invalid email caught', (await page.locator('#err-email').textContent()) === 'Enter a valid email address.');
await page.fill('#f-email', 'jordan@example.com');
await page.locator('#contact-form button[type=submit]').click();
note('valid submit shows draft panel', await page.locator('#draft').isVisible() && (await page.locator('#draft-body').textContent()).includes('Jordan Reyes'));
note('form live region announces draft', (await page.locator('#form-live').textContent()) === 'Your draft is ready. Nothing has been sent.');
await page.locator('#contact').screenshot({ path: join(outDir, 'draft-1440.png') });
await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
await page.locator('#draft-copy').click();
await page.waitForTimeout(200);
note('copy reports Inquiry copied.', (await page.locator('#draft-status').textContent()) === 'Inquiry copied.');
// Clipboard failure path
await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true }); });
await page.locator('#draft-copy').click();
await page.waitForTimeout(200);
note('copy fallback message', (await page.locator('#draft-status').textContent()) === 'Select and copy your inquiry below.');
note('fallback selects draft text', (await page.evaluate(() => window.getSelection().toString())).includes('Inquiry for SKALA'));
await page.locator('#draft-edit').click();
note('edit draft returns to form with values', await page.locator('#contact-form').isVisible() && (await page.inputValue('#f-name')) === 'Jordan Reyes');

// Anchor + skip link + landmarks
const anchors = await page.evaluate(() => ['#work', '#approach', '#field-notes', '#about', '#contact', '#main', '#top'].filter(id => !document.querySelector(id)));
note('all nav anchors resolve', anchors.length === 0, anchors.join(','));
const h1s = await page.locator('h1').count();
note('exactly one H1 (dialog headings are H2 inside dialogs)', h1s === 1, `${h1s}`);
await page.close();

// Mobile nav
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(url, { waitUntil: 'networkidle' });
await m.locator('.nav-toggle').click();
note('mobile menu opens', await m.locator('#nav-panel').isVisible() && (await m.locator('.nav-toggle').getAttribute('aria-expanded')) === 'true');
await m.screenshot({ path: join(outDir, 'nav-open-390.png') });
await m.keyboard.press('Escape');
note('Escape closes mobile menu', !(await m.locator('#nav-panel').isVisible()));
await m.locator('.nav-toggle').click();
await m.locator('#nav-panel a[href="#work"]').click();
note('menu closes on selection', !(await m.locator('#nav-panel').isVisible()));
await m.waitForTimeout(600);
note('selection scrolled to #work', await m.evaluate(() => { const r = document.querySelector('#work').getBoundingClientRect(); return r.top >= 0 && r.top < 200; }));
await m.locator('[data-open-note="note-1"]').scrollIntoViewIfNeeded();
await m.locator('[data-open-note="note-1"]').click();
await m.screenshot({ path: join(outDir, 'note-dialog-390.png') });
await m.close();

// Reduced motion
const rm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await rm.goto(url, { waitUntil: 'networkidle' });
note('reduced motion: content visible without scrolling', await rm.evaluate(() => [...document.querySelectorAll('.reveal')].every(el => getComputedStyle(el).opacity === '1')));
await rm.close();

await browser.close();
server.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed. Screenshots in ${outDir}`);
process.exit(failed ? 1 : 0);
