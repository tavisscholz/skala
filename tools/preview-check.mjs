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

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.md': 'text/markdown', '.webp': 'image/webp', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  let path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  if (!extname(path)) path += '.html';   // clean URLs, as the live .htaccess serves them
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
note('all rows closed by default', (await page.locator('.service-row__toggle[aria-expanded="true"]').count()) === 0);
const row2 = page.locator('.service-row__toggle').nth(1);
await row2.click();
note('second row expands', await row2.getAttribute('aria-expanded') === 'true' && await page.locator('#service-store-development').isVisible());
note('opening a row closes the others', !(await page.locator('#service-store-operations').isVisible()));
await page.locator('#work').screenshot({ path: join(outDir, 'work-open-1440.png') });
await row2.click();
note('second row collapses', await row2.getAttribute('aria-expanded') === 'false' && !(await page.locator('#service-store-development').isVisible()));

// Playbook band: the tilted card carries the section line
note('playbook card carries the section line', (await page.locator('#playbook .notes__pull').textContent()).includes('Practical notes and working tools') && (await page.locator('#playbook .section-intro').count()) === 0);

// Stylesheet sanity: an unbalanced brace silently drops every rule after it
{
  const css = await readFile(resolve(rootDir, 'css/site.css'), 'utf8');
  const opens = (css.match(/{/g) || []).length, closes = (css.match(/}/g) || []).length;
  note('site.css braces balance', opens === closes, `${opens} open / ${closes} close`);
}

// Workboard
const status = page.locator('.status-btn').first();
await status.click();
note('status switches Working on → Done', (await status.getAttribute('data-status')) === 'in-use' && (await page.locator('#board-live').textContent()).includes('Done'));
await status.click();
note('status switches back to Working on', (await status.getAttribute('data-status')) === 'building');

// Readiness ladder drives the board
{
  await page.locator('.ladder__step').first().scrollIntoViewIfNeeded();
  await page.locator('.ladder__step').first().hover();
  await page.waitForTimeout(150);
  note('hovering stage 1 lights its tile and mutes stage 5', await page.evaluate(() => document.querySelector('.ladder__step').classList.contains('is-active') && document.querySelectorAll('.ladder__step')[4].classList.contains('is-muted')));
  note('hovering stage S swaps the board to the Siloed plan', (await page.locator('.workboard__head .eyebrow').textContent()).trim() === 'Start here: uncover the gaps.' && (await page.locator('.board-stamp__word').textContent()).trim() === 'Siloed.' && (await page.locator('.workboard__table tbody tr').first().locator('td').first().textContent()).includes('who people rely on'));
  await page.locator('.ladder__step').nth(4).hover();
  await page.waitForTimeout(150);
  note('hovering stage 5 shows the expansion plan and stamp', (await page.locator('.workboard__head .eyebrow').textContent()).trim() === 'From Linked to Expansion-ready' && (await page.locator('.board-stamp__word').textContent()).trim() === 'You\u2019re ready to scale.');
  await page.mouse.move(10, 10);
  await page.waitForTimeout(150);
  note('leaving the ladder falls back to the pinned Siloed stage', (await page.locator('.workboard__head .eyebrow').textContent()).trim() === 'Start here: uncover the gaps.' && await page.evaluate(() => document.querySelectorAll('.ladder__step')[0].classList.contains('is-active') && !document.querySelectorAll('.ladder__step')[0].classList.contains('is-muted')));
  await page.locator('.ladder__step').nth(2).click();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(250);
  note('clicking stage 3 pins it after the mouse leaves', (await page.locator('.workboard__head .eyebrow').textContent()).trim() === 'From Captured to Adopted' && await page.evaluate(() => document.querySelectorAll('.ladder__step')[2].classList.contains('is-active') && document.querySelectorAll('.ladder__step')[0].classList.contains('is-muted')));
  await page.locator('.ladder__step').nth(4).click();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(250);
}

// Progress sticks, stages light up, and completing all five is a celebration
{
  const btns = page.locator('.status-btn');
  await page.locator('.ladder__step').nth(0).click(); await page.mouse.move(5, 5); await page.waitForTimeout(200);
  for (let i = 0; i < 3; i++) if ((await btns.nth(i).getAttribute('data-status')) !== 'in-use') await btns.nth(i).click();
  note('stamp fills in when every step of the stage is in use', await page.locator('#board-stamp').isVisible() && !(await page.locator('#board-stamp').evaluate(el => el.classList.contains('is-pending'))));
  note('a completed stage lights its tile', await page.evaluate(() => document.querySelectorAll('.ladder__step')[0].classList.contains('is-complete')));
  await page.locator('.ladder__step').nth(4).click(); await page.mouse.move(5, 5); await page.waitForTimeout(200);
  await page.locator('.ladder__step').nth(0).click(); await page.mouse.move(5, 5); await page.waitForTimeout(200);
  note('progress persists when moving between stages', await page.evaluate(() => [...document.querySelectorAll('.status-btn')].every(b => b.getAttribute('data-status') === 'in-use')));
  await page.reload({ waitUntil: 'networkidle' });
  note('progress persists across a reload', await page.evaluate(() => document.querySelectorAll('.ladder__step')[0].classList.contains('is-complete')));
  for (let s = 1; s < 5; s++) {
    await page.locator('.ladder__step').nth(s).click(); await page.mouse.move(5, 5); await page.waitForTimeout(150);
    for (let i = 0; i < 3; i++) if ((await btns.nth(i).getAttribute('data-status')) !== 'in-use') await btns.nth(i).click();
  }
  await page.waitForTimeout(400);
  note('completing every stage opens the Ready to scale celebration', await page.locator('.hoopla.is-open').count() === 1 && (await page.locator('.hoopla__title').textContent()).includes('Ready'));
  await page.screenshot({ path: join(outDir, 'ready-to-scale-1440.png') });
  await page.locator('.hoopla__close').click();
  note('closing the celebration leaves the board marked ready to scale', await page.locator('.hoopla.is-open').count() === 0 && await page.locator('.workboard').evaluate(el => el.classList.contains('is-scaled')) && await page.locator('.scale-banner').isVisible());
  await page.locator('#board-reset').click();
  note('reset clears every stage', await page.evaluate(() => !document.querySelector('.workboard').classList.contains('is-scaled') && document.querySelectorAll('.ladder__step.is-complete').length === 0 && document.querySelector('#board-stamp').classList.contains('is-pending')));
}
note('reset restores Working on', (await status.getAttribute('data-status')) === 'building' && (await page.locator('#board-live').textContent()).includes('Working on'));

// Phones: board hidden, tiles are the checklist
{
  const ph = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await ph.goto(url + 'index.html', { waitUntil: 'networkidle' });
  await ph.evaluate(() => localStorage.clear());
  await ph.reload({ waitUntil: 'networkidle' });
  note('phone: the workboard is hidden', !(await ph.locator('.workboard').isVisible()));
  note('phone: Siloed starts selected and checked off', await ph.evaluate(() => { const s = document.querySelector('.ladder__step'); return s.classList.contains('is-active') && s.classList.contains('is-complete') && document.querySelectorAll('.ladder__step.is-complete').length === 1; }));
  for (let i = 1; i < 5; i++) { await ph.locator('.ladder__step').nth(i).click(); await ph.waitForTimeout(120); }
  note('phone: tapping all five tiles lights them and opens the celebration', await ph.evaluate(() => document.querySelectorAll('.ladder__step.is-complete').length === 5) && await ph.locator('.hoopla.is-open').count() === 1);
  await ph.screenshot({ path: join(outDir, 'ready-to-scale-390.png') });
  await ph.locator('.hoopla__close').click();
  await ph.locator('.ladder__step').nth(2).click();
  note('phone: tapping a lit tile turns it back off', await ph.evaluate(() => document.querySelectorAll('.ladder__step.is-complete').length === 4 && !document.querySelector('#ready').classList.contains('is-scaled')));
  await ph.evaluate(() => localStorage.clear());
  await ph.close();
}

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
const anchors = await page.evaluate(() => ['#work', '#approach', '#playbook', '#about', '#contact', '#main', '#top'].filter(id => !document.querySelector(id)));
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
await m.evaluate(() => { const r = document.querySelector('.hero').getBoundingClientRect(); window.scrollBy(0, r.bottom + 20); });
await m.waitForTimeout(500);
note('first row tugs once the hero has scrolled away', await m.evaluate(() => document.querySelector('.service-row').classList.contains('is-nudged')));
note('torn seams present and gated', await m.evaluate(() => document.body.classList.contains('tears') && document.querySelectorAll('.tear').length === 7 && [...document.querySelectorAll('.tear')].every(t => { const r = t.getBoundingClientRect(); return r.height > 30; })));
note('header crown sits beside the wordmark', await m.evaluate(() => { const c = document.querySelector('.wordmark--header .wordmark__crown'); if (!c) return false; const r = c.getBoundingClientRect(), t = document.querySelector('.wordmark__text').getBoundingClientRect(); return r.width > 20 && r.left >= t.right - 4; }));
await m.locator('.wordmark--header').click();
await m.waitForTimeout(900);
note('header wordmark click scrolls to top', await m.evaluate(() => window.scrollY === 0));
await m.locator('.service-row__toggle').nth(2).click();
await m.waitForTimeout(100);
await m.locator('.service-row__toggle').nth(0).click();
await m.waitForTimeout(100);
note('mobile keeps one row open at a time', (await m.locator('#service-store-operations').isVisible()) && !(await m.locator('#service-real-estate').isVisible()));
await m.locator('#work').screenshot({ path: join(outDir, 'work-390.png') });
await m.locator('[data-open-note="note-1"]').scrollIntoViewIfNeeded();
await m.locator('[data-open-note="note-1"]').click();
await m.screenshot({ path: join(outDir, 'note-dialog-390.png') });
await m.close();

// Field notes page
const fn = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const fnErrors = []; fn.on('pageerror', e => fnErrors.push(e.message));
await fn.goto(url + 'playbook.html', { waitUntil: 'networkidle' });
note('playbook page loads without errors', fnErrors.length === 0, fnErrors.join(' | '));
note('playbook page has seven articles', (await fn.locator('.fn-article').count()) === 7);
note('homepage band keeps four plays and sends the rest to the playbook', await fn.evaluate(async (u) => { const h = await (await fetch(u + 'index.html')).text(); return (h.match(/class="note-line"/g) || []).length === 4 && (h.match(/<dialog class="note-dialog"/g) || []).length === 4; }, url));
note('every play carries a Listen button beside its read time', (await fn.locator('.fn-article .note-article__byline .listen').count()) === 7 && await fn.evaluate(async (u) => { const h = await (await fetch(u + 'index.html')).text(); return (h.match(/class="listen"/g) || []).length === 4; }, url));
{
  /* Headless Chromium has no speech engine, so stand one in: each utterance "ends" after 150ms. */
  const lp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await lp.addInitScript(() => {
    const voices = [{ name: 'Samantha', lang: 'en-US', localService: true, default: true }];
    let queue = [], paused = false, timer = null, speaking = false;
    function pump() { if (paused || speaking || !queue.length) return; const u = queue.shift(); speaking = true; timer = setTimeout(() => { speaking = false; u.onend && u.onend({}); pump(); }, 150); }
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, addEventListener() {}, speak(u) { queue.push(u); pump(); }, cancel() { clearTimeout(timer); queue = []; speaking = false; }, pause() { paused = true; clearTimeout(timer); speaking = false; }, resume() { paused = false; pump(); }, get speaking() { return speaking; }, get pending() { return queue.length > 0; } } });
  });
  await lp.goto(url + 'playbook.html', { waitUntil: 'networkidle' });
  const btn = lp.locator('#the-founder-bottleneck .listen');
  await btn.scrollIntoViewIfNeeded(); await btn.click(); await lp.waitForTimeout(400);
  const state1 = await btn.getAttribute('data-state');
  const label1 = await btn.locator('.listen__label').textContent();
  const time1 = await btn.locator('.listen__time').textContent();
  await btn.click(); await lp.waitForTimeout(200);
  const state2 = await btn.getAttribute('data-state');
  const label2 = await btn.locator('.listen__label').textContent();
  await btn.click(); await lp.waitForTimeout(200);
  const state3 = await btn.getAttribute('data-state');
  note('Listen plays, pauses and resumes with a running clock', state1 === 'playing' && label1 === 'Pause' && /\d:\d\d \/ \d+:\d\d/.test(time1) && state2 === 'paused' && label2 === 'Resume' && state3 === 'playing', `${state1}/${label1}/${time1}/${state2}/${label2}/${state3}`);
  const other = lp.locator('#the-next-ten-locations .listen');
  await other.scrollIntoViewIfNeeded(); await other.click(); await lp.waitForTimeout(300);
  note('starting another play stops the first', (await btn.getAttribute('data-state')) === 'idle' && (await other.getAttribute('data-state')) === 'playing');
  await lp.screenshot({ path: join(outDir, 'listen-playing-1440.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });
  await lp.close();
}
note('scaling plays render their facts, callouts and weekly move', (await fn.locator('#scaling-chaos-7-signs .note-article__facts').count()) === 1 && (await fn.locator('#the-next-ten-locations .note-article__callout').count()) === 1 && (await fn.locator('#the-founder-bottleneck .note-article__week').count()) === 1 && (await fn.locator('#the-next-ten-locations .note-article__pull cite').textContent()).includes('Mellon'));
note('playbook page: no horizontal overflow', (await fn.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
await fn.setViewportSize({ width: 390, height: 844 });
note('playbook page 390: no overflow', (await fn.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
await fn.close();

// Reduced motion
// Merch page
{
  const mp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const merr = [];
  mp.on('pageerror', e => merr.push(e.message));
  await mp.goto(url + 'merch.html', { waitUntil: 'networkidle' });
  note('merch page loads without errors', merr.length === 0, merr.join('; '));
  for (const [file, title] of [['privacy.html', 'Privacy Policy'], ['terms.html', 'Terms of Use'], ['work-with-us', 'Work With SKALA']]) {
    const lerr = [];
    const lp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    lp.on('pageerror', e => lerr.push(e.message));
    await lp.goto(url + file, { waitUntil: 'networkidle' });
    note(`${file} loads and is titled ${title}`, lerr.length === 0 && (await lp.title()).startsWith(title) && (await lp.locator('.legal__body h2, .join__sub, .join__dek').count()) >= 2);
    await lp.close();
  }
  note('footer links to Work With Us', await mp.evaluate(() => !!document.querySelector('.site-footer a[href="/work-with-us"]')));
  note('footer links to the legal pages and nothing else does', await mp.evaluate(() => document.querySelectorAll('.site-footer a[href="/privacy"], .site-footer a[href="/terms"]').length === 2 && document.querySelectorAll('main a[href$="privacy"], main a[href$="terms"], header a[href$="privacy"], header a[href$="terms"]').length === 0));
  note('no link on the site still points at index.html or a .html page', await mp.evaluate(() => [...document.querySelectorAll('a[href]')].every(a => !/(^|\/)index\.html|\.html($|#)/.test(a.getAttribute('href')))));
  note('merch page lists four items with prices', await mp.evaluate(() => [...document.querySelectorAll('.merch-card__price')].map(e => e.textContent.trim()).join(',') === '$25,$25,$75,$15'));
  note('merch photos all load', await mp.evaluate(() => [...document.querySelectorAll('.merch-card__img')].every(i => i.complete && i.naturalWidth > 0 && !i.hidden)));
  note('merch page: no horizontal overflow', (await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  note('header nav is What We Do / How We Do It / Playbook only', await mp.evaluate(() => [...document.querySelectorAll('.nav-list .nav-link')].map(a => a.textContent.trim()).join('|') === 'What We Do|How We Do It|Playbook'));
  note('footer links include How We Do It and Merch', await mp.evaluate(() => { const t = [...document.querySelectorAll('.site-footer__nav a')].map(a => a.textContent.trim()); return t.includes('How We Do It') && t.includes('Merch'); }));
  await mp.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in')));
  await mp.screenshot({ path: join(outDir, 'merch-1440.png'), fullPage: true });
  await mp.setViewportSize({ width: 390, height: 800 });
  await mp.waitForTimeout(200);
  note('merch page 390: no overflow', (await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  await mp.close();
}

const rm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await rm.goto(url, { waitUntil: 'networkidle' });
note('reduced motion: content visible without scrolling', await rm.evaluate(() => [...document.querySelectorAll('.reveal')].every(el => getComputedStyle(el).opacity === '1')));
await rm.close();

await browser.close();
server.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed. Screenshots in ${outDir}`);
process.exit(failed ? 1 : 0);
