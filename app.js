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

init();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
