// Gera sw.js com a lista de todos os ficheiros do jogo, para funcionar offline (PWA).
// Correr depois de mudar ficheiros: node tools/build_sw.mjs
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const walk = d => readdirSync(d).flatMap(f => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = ['index.html', 'manifest.webmanifest', ...walk('css'), ...walk('js'), ...walk('assets')].map(f => f.replace(/^\.\//, ''));
const hash = createHash('sha1'); for (const f of files) hash.update(readFileSync(f));
const version = hash.digest('hex').slice(0, 10);
writeFileSync('sw.js', `// Gerado por tools/build_sw.mjs — não editar à mão.
const CACHE = 'frontline-${version}';
const FILES = ${JSON.stringify(['./', ...files], null, 1)};
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
`);
console.log('sw.js:', files.length, 'ficheiros, versão', version);
