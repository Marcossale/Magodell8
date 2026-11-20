// Server statico minimale per provare l'app in locale: node server.mjs  ->  http://localhost:5173
import http from 'http';
import fs from 'fs';
import path from 'path';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const root = process.cwd();
const PORT = +process.env.PORT || 5173;
http.createServer((q, r) => {
  const rel = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(root, rel.endsWith('/') ? rel + 'index.html' : rel);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end('not found'); return; }
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }).end(fs.readFileSync(f));
}).listen(PORT, () => console.log('http://localhost:' + PORT));
