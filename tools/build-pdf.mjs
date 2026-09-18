/* Print playbook.html to assets/downloads/skala-playbook.pdf with headless Chromium.
   Usage: node tools/build-pdf.mjs   (requires Playwright) */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
const rootDir = resolve(new URL('..', import.meta.url).pathname);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  const p = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  try { const b = await readFile(join(rootDir, p)); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1300 } });
await page.goto(`http://127.0.0.1:${server.address().port}/playbook.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.emulateMedia({ media: 'print' });
await mkdir(join(rootDir, 'assets/downloads'), { recursive: true });
await page.pdf({ path: join(rootDir, 'assets/downloads/skala-playbook.pdf'), format: 'Letter', printBackground: true, margin: { top: '0.6in', bottom: '0.7in', left: '0.7in', right: '0.7in' }, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: '<div style="width:100%;font-family:Inter,Arial,sans-serif;font-size:8px;color:#555;padding:0 0.7in;display:flex;justify-content:space-between"><span>SKALA Playbook</span><span class="pageNumber"></span></div>' });
await browser.close(); server.close();
console.log('wrote assets/downloads/skala-playbook.pdf');
