# Aggiorna le estrazioni dal PC (il sito blocca gli IP di GitHub Actions) e pubblica i dati su main.
# Lavora in un clone dedicato, separato dalla cartella di sviluppo, così non tocca le tue modifiche.
# Uso: powershell -File scripts\aggiorna-locale.ps1
$ErrorActionPreference = 'Stop'
$repo = 'https://github.com/Marcossale/Magodell8.git'
$dir  = Join-Path $env:LOCALAPPDATA 'MagoDelL8-auto'
$log  = Join-Path $dir '..\MagoDelL8-auto.log'

function Esegui([string]$cmd) {
  $out = & cmd /c "$cmd 2>&1"
  if ($LASTEXITCODE -ne 0) { throw "Comando fallito ($cmd): $out" }
  $out
}

try {
  if (-not (Test-Path (Join-Path $dir '.git'))) { Esegui "git clone --branch main `"$repo`" `"$dir`"" }
  Set-Location $dir
  Esegui 'git fetch origin main'
  Esegui 'git checkout main'
  Esegui 'git reset --hard origin/main'
  Esegui 'node scripts/update.mjs'
  Esegui 'git add data'
  & git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    Esegui 'git -c user.name=magodel8-bot -c user.email=actions@users.noreply.github.com commit -m "Dati: aggiornamento estrazioni (PC)"'
    Esegui 'git push origin main'
    "$(Get-Date -Format s) aggiornato e pubblicato" | Add-Content $log
  } else {
    "$(Get-Date -Format s) nessuna novita" | Add-Content $log
  }
} catch {
  "$(Get-Date -Format s) ERRORE: $($_.Exception.Message)" | Add-Content $log
  exit 1
}
