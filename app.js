const WHEELS = ['Bari', 'Cagliari', 'Firenze', 'Genova', 'Milano', 'Napoli', 'Palermo', 'Roma', 'Torino', 'Venezia', 'Nazionale'];
const GAMES = {
  lotto: { name: 'Lotto', max: 90, pick: 5 },
  superenalotto: { name: 'SuperEnalotto', max: 90, pick: 6 },
  vincicasa: { name: 'Vinci Casa', max: 40, pick: 5 },
  wflclassico: { name: 'Win for Life Classico', max: 20, pick: 10 },
  superwfl: { name: 'Super Win for Life', max: 90, pick: 8 },
};
const $ = id => document.getElementById(id);
const balls = (a, c = '') => a.map(x => `<span class="b ${c}">${x}</span>`).join('');
const fmt = d => d.split('-').reverse().join('/');

const cache = {};   // storico per gioco, caricato solo alla prima richiesta
const load = async g => cache[g] ??= (await (await fetch(`data/${g}.json`)).json()).draws;

// serie di estrazioni (più recente prima) come array di numeri; Lotto: una ruota o tutte
const series = (g, draws, w) => draws.map(d => g !== 'lotto' ? d.x
  : w === 'Tutte' ? [...new Set(d.w.flat())] : d.w[WHEELS.indexOf(w)]);
const nums = g => Array.from({ length: GAMES[g].max }, (_, i) => i + 1);
const full = (g, fn) => nums(g).map(k => [k, fn(k)]);

// Registro di statistiche e combinazioni: aggiungere una voce = aggiungere una funzione (g, serie, n) => risultato
const TYPES = {
  ritardi: { label: 'Ritardi (estrazioni senza uscire)', run: (g, s) => ({ unit: 'estr.',
    table: full(g, k => { const i = s.findIndex(x => x.includes(k)); return i < 0 ? s.length : i; }).sort((a, b) => b[1] - a[1]) }) },
  frequenze: { label: 'Frequenze (uscite)', run: (g, s) => ({ unit: 'volte',
    table: full(g, k => s.filter(x => x.includes(k)).length).sort((a, b) => b[1] - a[1]) }) },
  casuale: { label: 'Combinazione casuale', run: (g, s, n) => ({ combo: [...nums(g)].sort(() => Math.random() - .5).slice(0, n) }) },
  comboRit: { label: 'Combinazione: più ritardatari', run: (g, s, n) => ({ combo: TYPES.ritardi.run(g, s).table.slice(0, n).map(x => x[0]) }) },
  comboFreq: { label: 'Combinazione: più frequenti', run: (g, s, n) => ({ combo: TYPES.frequenze.run(g, s).table.slice(0, n).map(x => x[0]) }) },
  comboMeno: { label: 'Combinazione: meno frequenti', run: (g, s, n) => ({ combo: TYPES.frequenze.run(g, s).table.slice(-n).map(x => x[0]) }) },
};

function card(g, d) {
  const body = g === 'lotto'
    ? WHEELS.map((w, i) => `<div class="w"><span>${w}</span><span>${balls(d.w[i])}</span></div>`).join('')
    : balls(d.x) + (d.e ? balls([d.e], 'x') : '') + (d.j ? `<div class="mu">Jolly ${d.j}${d.s != null ? ' · SuperStar ' + d.s : ''}</div>` : '');
  return `<div class="card"><h2>${GAMES[g].name}</h2><div class="mu">n. ${d.n} · ${fmt(d.d)}${d.h ? ' · ' + d.h : ''}</div>${body}</div>`;
}

async function init() {
  $('g').innerHTML = Object.entries(GAMES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
  $('w').innerHTML = ['Tutte', ...WHEELS].map(w => `<option>${w}</option>`).join('');
  $('t').innerHTML = Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  const sync = () => { const g = $('g').value; $('wl').style.display = g === 'lotto' ? '' : 'none'; $('n').max = GAMES[g].max; $('n').value = GAMES[g].pick; };
  $('g').onchange = sync; sync();
  $('go').onclick = calcola;
  try {
    const last = await (await fetch('data/last.json')).json();
    $('upd').textContent = 'Dati aggiornati al ' + new Date(last.updated).toLocaleString('it-IT');
    $('cards').innerHTML = Object.keys(GAMES).filter(g => last.draws[g]).map(g => card(g, last.draws[g])).join('');
  } catch { $('upd').textContent = 'Dati non disponibili: connettiti a internet per il primo caricamento.'; }
}

async function calcola() {
  const g = $('g').value, btn = $('go'); btn.disabled = true; $('out').textContent = 'Calcolo…';
  try {
    const draws = await load(g);
    let s = series(g, draws, $('w').value), span = draws;
    const L = +$('last').value; if (L > 0) { s = s.slice(0, L); span = draws.slice(0, L); }
    const r = TYPES[$('t').value].run(g, s, Math.min(+$('n').value || 1, GAMES[g].max));
    const info = `<div class="mu">Su ${s.length} estrazioni analizzate (dal ${fmt(span.at(-1).d)} al ${fmt(span[0].d)})</div>`;
    if (r.combo) $('out').innerHTML = info + balls(r.combo.sort((a, b) => a - b), 'x');
    else {
      const m = Math.max(...r.table.map(x => x[1])) || 1;
      $('out').innerHTML = info + '<table>' + r.table.slice(0, 15).map(([k, v]) =>
        `<tr><td>${balls([k])}</td><td style="width:60%"><div class="bar" style="width:${v / m * 100}%"></div></td><td>${v} ${r.unit}</td></tr>`).join('') + '</table>';
    }
  } catch { $('out').textContent = 'Storico non disponibile offline: riprova con la connessione attiva.'; }
  btn.disabled = false;
}

// --- Ricerca di una singola estrazione (gioco + data [+ ora], oppure numero di estrazione) ---
async function aggiornaRicerca() {
  const g = $('sg').value; $('shl').style.display = g === 'wflclassico' ? '' : 'none';
  try {
    const draws = await load(g);
    $('sd').min = draws.at(-1).d; $('sd').max = draws[0].d;
    if (g === 'wflclassico') {   // solo le ore in cui c'è stata un'estrazione nel giorno scelto
      const hs = [...new Set(draws.filter(x => x.d === $('sd').value).map(x => x.h))].sort();
      $('sh').innerHTML = '<option value="">Tutte le ore</option>' + hs.map(h => `<option>${h}</option>`).join('');
    }
  } catch { /* offline: la ricerca segnalerà il problema */ }
}

async function cerca() {
  const g = $('sg').value, out = $('sout'); out.textContent = 'Ricerca…';
  try {
    const draws = await load(g), d = $('sd').value, h = g === 'wflclassico' ? $('sh').value : '', n = +$('sn').value;
    let m;
    if (d) {
      m = draws.filter(x => x.d === d && (!h || x.h === h));
      if (!m.length) {
        const t = Date.parse(d), near = draws.reduce((a, x) => Math.abs(Date.parse(x.d) - t) < Math.abs(Date.parse(a.d) - t) ? x : a);
        await mostra(g, draws.indexOf(near), `Nessuna estrazione ${h ? 'alle ' + h + ' ' : ''}del ${fmt(d)} (storico dal ${fmt(draws.at(-1).d)} al ${fmt(draws[0].d)}). Mostro la più vicina.`);
        return;
      }
      if (m.length === 1) { await mostra(g, draws.indexOf(m[0])); return; }
    } else if (n) { m = draws.filter(x => x.n === n); if (m.length === 1) { await mostra(g, draws.indexOf(m[0])); return; } }
    else { out.textContent = 'Scegli una data oppure un numero di estrazione.'; return; }
    out.innerHTML = m.length
      ? `<p class="mu">${m.length} risultat${m.length > 1 ? 'i' : 'o'}${m.length > 30 ? ' (primi 30)' : ''}</p><div class="grid">${m.slice(0, 30).map(x => card(g, x)).join('')}</div>`
      : 'Nessun risultato.';
  } catch { out.textContent = 'Storico non disponibile offline: riprova con la connessione attiva.'; }
}

// Dimensione dei numeri estratti (pulsanti A− / A+ in cima), ricordata sul dispositivo.
const SIZES = [24, 30, 38, 46, 56];
let si = 1;
try { const v = +localStorage.getItem('bs'); if (SIZES.includes(v)) si = SIZES.indexOf(v); } catch { /* storage non disponibile */ }
function applyZoom() {
  document.documentElement.style.setProperty('--bs', SIZES[si] + 'px');
  $('zm').disabled = si === 0; $('zp').disabled = si === SIZES.length - 1;
  try { localStorage.setItem('bs', SIZES[si]); } catch { /* ignora */ }
}
$('zm').onclick = () => { si--; applyZoom(); };
$('zp').onclick = () => { si++; applyZoom(); };
applyZoom();

// Mostra una singola estrazione con le frecce per passare alla precedente (◀) o alla successiva (▶) dello stesso gioco.
let cur = null;
async function mostra(g, i, nota = '') {
  const draws = await load(g), d = draws[i]; cur = { g, i };
  $('sd').value = d.d;
  if (g === 'wflclassico') { await aggiornaRicerca(); $('sh').value = d.h; }
  const btn = (s, off, lab, sym) => `<button data-s="${s}" ${off ? 'disabled' : ''} aria-label="${lab}" title="${lab}">${sym}</button>`;
  $('sout').innerHTML = (nota ? `<p class="mu">${nota}</p>` : '') +
    `<div class="nav">${btn(1, i >= draws.length - 1, 'Estrazione precedente', '◀')}<span class="mu">precedente · successiva</span>${btn(-1, i === 0, 'Estrazione successiva', '▶')}</div>` +
    `<div class="grid">${card(g, d)}</div>`;
}
$('sout').onclick = e => { const b = e.target.closest('[data-s]'); if (b && cur) mostra(cur.g, cur.i + +b.dataset.s); };

$('sg').innerHTML = Object.entries(GAMES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
$('shl').style.display = 'none';
$('sg').onchange = aggiornaRicerca; $('sd').onchange = aggiornaRicerca; $('sgo').onclick = cerca;

init();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
