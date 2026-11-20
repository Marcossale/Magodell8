# MagoDelL8

PWA con le ultime estrazioni e le statistiche di Lotto, SuperEnalotto, Vinci Casa, Win for Life Classico e Super Win for Life.
Dati letti da [estrazionedellotto.it](https://www.estrazionedellotto.it/). Le statistiche sono informative: le estrazioni sono indipendenti e nessuna combinazione aumenta le probabilità di vincita.

## Struttura
- `index.html`, `app.js`: l'app (dashboard + richieste di statistiche/combinazioni). Le statistiche sono un registro `TYPES` in `app.js`: una nuova statistica è una nuova funzione.
- `sw.js`, `manifest.webmanifest`, `icons/`: parte PWA (installabile, funziona offline sui dati già scaricati).
- `scripts/update.mjs`: aggiorna lo storico in `data/*.json` (prima volta: tutto lo storico; poi solo l'anno corrente).
- `.github/workflows/update.yml`: esegue l'aggiornamento ogni ora (08–21 UTC) e committa le novità.

## Uso in locale
```
node scripts/update.mjs     # aggiorna i dati
node server.mjs             # http://localhost:5173
```

## Pubblicazione su GitHub Pages
1. Settings → Pages → Source: *Deploy from a branch*, ramo `main`, cartella `/ (root)`.
2. Apri `https://<utente>.github.io/<repo>/` dal telefono e scegli "Installa app" (Chrome) o "Aggiungi alla schermata Home" (Safari).

Nota: Pages su repository privato richiede un piano GitHub a pagamento; con repository pubblico è gratuito.
