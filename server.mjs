// Server statico minimale per provare la dashboard: node server.mjs  ->  http://localhost:5173
import http from 'http';
import fs from 'fs';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
http.createServer((q, r) => {
  const f = q.url === '/' ? 'index.html' : q.url.slice(1).split('?')[0];
  if (!/^[\w.-]+$/.test(f) || !fs.existsSync(f)) { r.writeHead(404).end('not found'); return; }
  r.writeHead(200, { 'Content-Type': types[f.slice(f.lastIndexOf('.'))] || 'text/plain' }).end(fs.readFileSync(f));
}).listen(5173, () => console.log('http://localhost:5173'));
