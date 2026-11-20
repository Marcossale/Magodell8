// Scarica gli archivi 2026 dei 5 giochi e scrive data.js (ultime KEEP estrazioni per gioco, più recenti prima).
import fs from 'fs';
const B = 'https://www.estrazionedellotto.it', KEEP = 300;
const get = async p => (await fetch(B + p, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
const balls = s => [...s.matchAll(/<li class="ball[^"]*">(?:<strong>)?(\d+)/g)].map(m => +m[1]);
const blocks = h => h.split('<div class="lottoDraws">').slice(1).map(b => ({
  n: +b.match(/Estrazione n\.\s*(\d+)/)[1], date: b.match(/(\d{2}\/\d{2}\/\d{4})/)[1], b }));

const parsers = {
  lotto: h => blocks(h).map(({ n, date, b }) => ({ n, date, wheels: Object.fromEntries(
    b.split('<ul class="ballRow">').slice(1).map(u => [u.match(/wheelTitle[^>]*>([^<]+)/)[1], balls(u)])) })),
  superenalotto: h => blocks(h).map(({ n, date, b }) => ({ n, date, nums: balls(b).slice(0, 6) })),
  vincicasa: h => blocks(h).map(({ n, date, b }) => ({ n, date, nums: balls(b) })),
  superwfl: h => blocks(h).map(({ n, date, b }) => ({ n, date, nums: balls(b) })),
  wflclassico: h => {
    const out = []; let date = '';
    const re = /estrazione-del-(\d{2})-(\d{2})-(\d{4})"|<tr>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>([\d:]+)<\/td>(.*?)<\/tr>/gs;
    for (const m of h.matchAll(re)) {
      if (m[1]) date = `${m[1]}/${m[2]}/${m[3]}`;
      else if (out.length < KEEP) { const x = balls(m[6]); out.push({ n: +m[4], date, ora: m[5], nums: x.slice(0, 10), extra: x[10] }); }
    }
    return out;
  },
};
const paths = {
  lotto: '/risultati/archivio-lotto-2026',
  superenalotto: '/superenalotto/risultati/archivio-superenalotto-2026',
  vincicasa: '/vinci-casa/risultati/archivio-vinci-casa-2026',
  superwfl: '/super-win-for-life/risultati/archivio-super-win-for-life-2026',
  wflclassico: '/win-for-life-classico/risultati/archivio-win-for-life-classico-2026',
};
const data = { updated: new Date().toISOString() };
for (const g of Object.keys(paths)) {
  data[g] = parsers[g](await get(paths[g])).slice(0, KEEP);
  console.log(g, data[g].length, 'ultima:', data[g][0].n, data[g][0].date);
  await new Promise(r => setTimeout(r, 1000));
}
fs.writeFileSync('data.js', 'window.DATA=' + JSON.stringify(data) + ';');
