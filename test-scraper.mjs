// Test leggero: legge l'archivio Vinci Casa 2026 e stampa le ultime estrazioni + ritardi.
const URL = 'https://www.estrazionedellotto.it/vinci-casa/risultati/archivio-vinci-casa-2026';
const html = await (await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();

const draws = [];
for (const blk of html.split('<div class="lottoDraws">').slice(1)) {
  const n = blk.match(/Estrazione n\.\s*(\d+)/)?.[1];
  const d = blk.match(/<strong>(\d{2}\/\d{2}\/\d{4})<\/strong>/)?.[1];
  const nums = [...blk.matchAll(/<li class="ball[^"]*">(\d+)<\/li>/g)].map(m => +m[1]);
  if (n && d && nums.length === 5) draws.push({ n: +n, date: d, nums });
}

console.log('estrazioni lette:', draws.length);
console.log('ultime 3:', draws.slice(0, 3));

// ritardo = estrazioni trascorse dall'ultima uscita (draws[0] = più recente)
const delay = {};
for (let k = 1; k <= 40; k++) {
  const i = draws.findIndex(x => x.nums.includes(k));
  delay[k] = i === -1 ? draws.length : i;
}
console.log('top 5 ritardi:', Object.entries(delay).sort((a, b) => b[1] - a[1]).slice(0, 5));
