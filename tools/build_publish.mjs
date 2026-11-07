// Gera a pasta publicar/: o jogo pronto para o GitHub Pages, num repositório público.
// Contém só o jogo compilado (um index.html com as imagens e sons embutidos) + o necessário para instalar
// e funcionar offline. Os PNG e sons originais ficam fora do repositório público.
// Uso: node tools/build_single.mjs <esbuild> && node tools/build_publish.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
rmSync('publicar', { recursive: true, force: true });
mkdirSync('publicar');
let html = readFileSync('dist/frontline.html', 'utf8');
html = html.replace('<meta name="theme-color" content="#05060a">', '<meta name="theme-color" content="#05060a">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icone_192.png">\n<link rel="apple-touch-icon" href="icone_192.png">');
html = html.replace('</body>', `<script>if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});</script>\n</body>`);
writeFileSync('publicar/index.html', html);
for (const s of ['192', '512']) copyFileSync(`assets/ui/icone_${s}.png`, `publicar/icone_${s}.png`);
const man = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
man.icons = man.icons.map(i => ({ ...i, src: i.src.replace('assets/ui/', '') }));
writeFileSync('publicar/manifest.webmanifest', JSON.stringify(man, null, 2));
const files = ['./', 'index.html', 'manifest.webmanifest', 'icone_192.png', 'icone_512.png'];
const version = createHash('sha1').update(html).digest('hex').slice(0, 10);
writeFileSync('publicar/sw.js', `// Modo offline: guarda o jogo no dispositivo na primeira visita.
const CACHE = 'frontline-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => { if (e.request.method === 'GET') e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request))); });
`);
writeFileSync('publicar/.nojekyll', '');
copyFileSync('CREDITOS.md', 'publicar/CREDITOS.md');
writeFileSync('publicar/README.md', `# Frontline

RTS em pixel art num mapa hexagonal: a colónia de Tharsis contra o Enxame.
Campanha de 7 missões, escaramuça, PC e Android, funciona offline.

Joga em: https://<utilizador>.github.io/<repositório>/

No Android (Chrome): menu ⋮ → "Instalar aplicação" ou "Adicionar ao ecrã principal".

Arte, sons e música: ver CREDITOS.md.
`);
console.log('publicar/: index.html', (html.length / 1048576).toFixed(1), 'MB, versão', version);
