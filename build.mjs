// Builds dist/index.html (standalone) and dist/artifact.html (fragment for hosts that supply the document skeleton).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const src = p => readFileSync(new URL('./src/' + p, import.meta.url), 'utf8');
const files = ['core.js', 'icons.js', 'fx.js','sim/capacity.js', 'sim/queue.js', 'sim/vpc.js', 'sim/iam.js', 'sim/ai.js', 'sim/cost.js', 'sim/studio.js', 'sim/extra.js',
  'data/services.js', 'data/cases.js', 'data/careers.js', 'data/providers.js',
  'scenes/s1.js', 'scenes/s2.js', 'scenes/s3.js', 'scenes/s4.js', 'scenes/s5.js', 'scenes/s6.js', 'scenes/s7.js', 'scenes/b1.js', 'scenes/pv.js', 'scenes/sx.js'];
const js = files.map(f => `/* ---- ${f} ---- */\n` + src(f)).join('\n');
const icon = 'data:image/svg+xml,' + encodeURIComponent(src('favicon.svg').trim());
const html = src('template.html').replace('__ICON__', () => icon).replace('/*__CSS__*/', () => src('styles.css')).replace('/*__JS__*/', () => js.replace(/<\/script/gi, '<\\/script'));
mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
const full = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n' + html + '\n</body>\n</html>\n';
writeFileSync(new URL('./dist/index.html', import.meta.url), full);
writeFileSync(new URL('./dist/artifact.html', import.meta.url), html);
console.log('dist/index.html', (full.length / 1024).toFixed(1) + ' KB');
