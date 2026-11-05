# Prepara la cartella "dist" per l'ANTEPRIMA del restyling: il sito attuale + la cartella /prototipo/.
# Non tocca prepara-pubblicazione.ps1 e non va usato per il sito di produzione.
# Uso: powershell -ExecutionPolicy Bypass -File .\prepara-anteprima.ps1
# Poi: npx wrangler pages deploy dist --branch restyling   (crea un indirizzo di anteprima, avweb.it non cambia)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "prepara-pubblicazione.ps1")
if ($LASTEXITCODE -ne 0) { Write-Host "Lo script di pubblicazione ha trovato problemi: anteprima non preparata." -ForegroundColor Red; exit 1 }

Copy-Item (Join-Path $root "prototipo") (Join-Path $root "dist") -Recurse
Write-Host "Anteprima pronta: il prototipo e in dist\prototipo (indirizzo /prototipo/)" -ForegroundColor Green
