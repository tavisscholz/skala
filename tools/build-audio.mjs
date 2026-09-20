/* Record each play as an MP3 with ElevenLabs.
   Writes assets/audio/<slug>.mp3 plus a .sha1 sidecar so unchanged plays are
   skipped on the next run. Then rebuild the pages so the Listen buttons pick
   the files up:  python3 tools/build-notes.py

   Usage:
     ELEVENLABS_API_KEY=... node tools/build-audio.mjs            # every play that changed
     ELEVENLABS_API_KEY=... node tools/build-audio.mjs --force    # re-record everything
     ELEVENLABS_API_KEY=... node tools/build-audio.mjs the-founder-bottleneck   # one play
     node tools/build-audio.mjs --dry-run the-founder-bottleneck               # print the reading script

   Optional:
     ELEVENLABS_VOICE_ID   voice to use (default: Mark - Solid, Clear and Dependable)
     ELEVENLABS_MODEL      default eleven_multilingual_v2
     ELEVENLABS_FORMAT     default mp3_44100_64 (about half a megabyte a minute) */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const key = process.env.ELEVENLABS_API_KEY;
if (!key && !dryRun) { console.error('Set ELEVENLABS_API_KEY first (or pass --dry-run to print the reading script).'); process.exit(1); }
const voice = process.env.ELEVENLABS_VOICE_ID || 'v3p1kjzUvro6S76qmYmH';
const model = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const format = process.env.ELEVENLABS_FORMAT || 'mp3_44100_64';
const force = args.includes('--force');
const only = args.filter(a => !a.startsWith('--'));

/* Markdown play -> a reading script. Headings, quotes and boxes get a beat of silence around them. */
function readingScript(md) {
  const lines = md.trim().split('\n');
  const title = lines[0].replace(/^#\s*/, '');
  const stand = (lines[4] || '').trim().replace(/^\*|\*$/g, '');
  const out = [title, stand];
  let k = 7;
  const clean = t => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/--/g, ', ').trim();
  while (k < lines.length) {
    const l = lines[k].trim();
    if (!l) { k++; continue; }
    if (l.startsWith('## ')) { out.push('\n' + clean(l.slice(3)) + '.'); k++; continue; }
    if (l.startsWith('|')) { while (k < lines.length && lines[k].startsWith('|')) { const cells = lines[k].split('|').map(c => c.trim()).filter(Boolean); if (!/^-+$/.test(cells[0])) out.push(cells.map(clean).join(', ') + '.'); k++; } continue; }
    if (l.startsWith('**This week:**')) { out.push('\nThis week. ' + clean(l.slice(14))); k++; continue; }
    if (l.startsWith('**Fast Facts**')) { out.push('\nFast facts.'); k++; continue; }
    if (l.startsWith('>')) {
      const q = [];
      while (k < lines.length && lines[k].startsWith('>')) { q.push(lines[k].slice(1).trim()); k++; }
      const m = q[0].match(/^\*\*"(.+)"\*\*$/);
      if (m) { out.push('\n' + m[1]); if (q[1]) out.push(clean(q[1].replace(/^\*\((.+)\)\*$/, '$1')) + '.'); continue; }
      const t = q[0].match(/^\*\*(.+?)\*\*$/);
      if (t && q.length > 1) { out.push('\n' + (t[1].toLowerCase() === 'do this week' ? 'This week.' : clean(t[1]) + '.')); q.slice(1).forEach(x => x && out.push(clean(x.replace(/^- /, '')))); continue; }
      q.forEach(x => x && out.push(clean(x.replace(/^- /, ''))));
      continue;
    }
    if (l.startsWith('- ')) { out.push(clean(l.slice(2))); k++; continue; }
    out.push(clean(l)); k++;
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

async function record(text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=${format}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

const srcDir = join(rootDir, 'assets/articles');
const outDir = join(rootDir, 'assets/audio');
await mkdir(outDir, { recursive: true });
const closer = (await readFile(join(srcDir, '_closer.md'), 'utf8')).trim();
const slugs = (await readdir(srcDir)).filter(f => f.endsWith('.md') && !f.startsWith('_')).map(f => f.slice(0, -3)).filter(s => !only.length || only.includes(s));
let made = 0;
for (const slug of slugs) {
  const md = await readFile(join(srcDir, slug + '.md'), 'utf8');
  const text = readingScript(md) + '\n\n' + closer;
  const sha = createHash('sha1').update(text + '|' + voice + '|' + model + '|' + format).digest('hex');
  const mp3 = join(outDir, slug + '.mp3'), side = join(outDir, slug + '.sha1');
  if (dryRun) { console.log(`\n===== ${slug} =====\n${text}\n`); continue; }
  if (!force && existsSync(mp3) && existsSync(side) && (await readFile(side, 'utf8')).trim() === sha) { console.log(`up to date  ${slug}`); continue; }
  process.stdout.write(`recording   ${slug} (${text.split(/\s+/).length} words) ... `);
  const audio = await record(text);
  await writeFile(mp3, audio); await writeFile(side, sha + '\n');
  console.log(`${(audio.length / 1048576).toFixed(1)} MB`);
  made++;
}
console.log(`${made} recorded, ${slugs.length - made} unchanged. Now run: python3 tools/build-notes.py`);
