// Aggiorna lo storico in data/*.json leggendo gli archivi annuali di estrazionedellotto.it.
// Prima esecuzione: scarica tutti gli anni da `from`. Poi: solo l'anno dell'ultima estrazione salvata in poi.
// Uso: node scripts/update.mjs [gioco ...]
import fs from 'fs';

const B = 'https://www.estrazionedellotto.it';
const WHEELS = ['Bari', 'Cagliari', 'Firenze', 'Genova', 'Milano', 'Napoli', 'Palermo', 'Roma', 'Torino', 'Venezia', 'Nazionale'];
const GAMES = {
  lotto:         { from: 2005, // dal 2005 esistono tutte e 11 le ruote (Nazionale inclusa) path: y => `/risultati/archivio-lotto-${y}` },
  superenalotto: { from: 1997, path: y => `/superenalotto/risultati/archivio-superenalotto-${y}` },
  vincicasa:     { from: 2014, path: y => `/vinci-casa/risultati/archivio-vinci-casa-${y}` },
  wflclassico:   { from: 2024, path: y => `/win-for-life-classico/risultati/archivio-win-for-life-classico-${y}` },
  superwfl:      { from: 2026, path: y => `/super-win-for-life/risultati/archivio-super-win-for-life-${y}` },
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const iso = s => s.split('/').reverse().join('-');

async function get(path) {
  for (let t = 1; t <= 3; t++) {
    try {
      const r = await fetch(B + path, { headers: { 'User-Agent': 'Mozilla/5.0 (MagoDelL8 aggiornamento storico)' } });
      if (r.status === 404) return null;
      if (r.ok) return await r.text();
    } catch { /* riprova */ }
    await sleep(2000 * t);
  }
  throw new Error('Download fallito: ' + path);
}

// palline: [{cls, n}] nell'ordine della pagina (ignora i titoli ruota)
const balls = s => [...s.matchAll(/<li class="([^"]*)">(?:<strong>)?(\d+)/g)]
  .filter(m => /\bball\b/.test(m[1])).map(m => ({ cls: m[1], n: +m[2] }));
const plain = s => balls(s).filter(b => !/jolly|superstar|big-number/.test(b.cls)).map(b => b.n);
const special = (s, k) => balls(s).find(b => b.cls.includes(k))?.n;

const blocks = h => h.split('<div class="lottoDraws">').slice(1).map(b => ({
  n: +b.match(/Estrazione n\.\s*(\d+)/)?.[1],
  d: iso(b.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] ?? ''),
  b,
}));

const parsers = {
  lotto: h => blocks(h).map(({ n, d, b }) => {
    const w = {};
    for (const u of b.split('<ul class="ballRow">').slice(1)) w[u.match(/wheelTitle[^>]*>([^<]+)/)?.[1]] = plain(u);
    return { d, n, w: WHEELS.map(k => w[k]) };
  }).filter(x => x.w.every(a => a?.length === 5) || (console.warn('  scartata (ruote incomplete):', x.d), false)),
  superenalotto: h => blocks(h).map(({ n, d, b }) => ({ d, n, x: plain(b), j: special(b, 'jolly'), s: special(b, 'superstar') })).filter(x => x.x.length === 6),
  vincicasa: h => blocks(h).map(({ n, d, b }) => ({ d, n, x: plain(b) })).filter(x => x.x.length === 5),
  superwfl: h => blocks(h).map(({ n, d, b }) => ({ d, n, x: plain(b) })).filter(x => x.x.length === 8),
  wflclassico: h => {
    const out = []; let d = '';
    const re = /estrazione-del-(\d{2})-(\d{2})-(\d{4})"|<tr>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>([\d:]+)<\/td>(.*?)<\/tr>/gs;
    for (const m of h.matchAll(re)) {
      if (m[1]) d = `${m[3]}-${m[2]}-${m[1]}`;
      else { const x = plain(m[6]); if (x.length === 10) out.push({ d, n: +m[4], h: m[5], x, e: special(m[6], 'big-number') }); }
    }
    return out;
  },
};

const key = x => `${x.d}|${x.h ?? ''}|${x.n}`;
const write = (file, text) => {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return false;
  fs.writeFileSync(file, text); return true;
};

fs.mkdirSync('data', { recursive: true });
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(GAMES);
const thisYear = new Date().getFullYear();
let changed = false;

for (const g of wanted) {
  const cfg = GAMES[g]; if (!cfg) throw new Error('Gioco sconosciuto: ' + g);
  const file = `data/${g}.json`;
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).draws : [];
  const start = old.length ? Math.max(cfg.from, +old[0].d.slice(0, 4)) : cfg.from;
  const map = new Map(old.map(x => [key(x), x]));
  for (let y = start; y <= thisYear; y++) {
    const html = await get(cfg.path(y));
    const rows = html ? parsers[g](html) : [];
    rows.forEach(x => map.set(key(x), x));
    console.log(`${g} ${y}: ${rows.length} estrazioni`);
    await sleep(800);
  }
  const draws = [...map.values()].sort((a, b) => b.d.localeCompare(a.d) || b.n - a.n);
  if (!draws.length) throw new Error('Nessuna estrazione per ' + g);
  const text = `{"game":"${g}","draws":[\n${draws.map(x => JSON.stringify(x)).join(',\n')}\n]}\n`;
  if (write(file, text)) changed = true;
  console.log(`${g}: totale ${draws.length}, ultima ${draws[0].d} n.${draws[0].n}`);
}

// ultima estrazione di ogni gioco, per la dashboard (file piccolo)
const last = {};
for (const g of Object.keys(GAMES)) {
  const f = `data/${g}.json`;
  if (fs.existsSync(f)) last[g] = JSON.parse(fs.readFileSync(f, 'utf8')).draws[0];
}
const prevLast = fs.existsSync('data/last.json') ? JSON.stringify(JSON.parse(fs.readFileSync('data/last.json', 'utf8')).draws) : '';
if (prevLast !== JSON.stringify(last)) {
  const stamp = new Date().toISOString();
  fs.writeFileSync('data/last.json', JSON.stringify({ updated: stamp, draws: last }) + '\n');
}
console.log(changed ? 'Dati aggiornati.' : 'Nessuna novità.');
