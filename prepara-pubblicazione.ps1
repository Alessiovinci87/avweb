# Prepara la cartella "dist" da caricare su Cloudflare Pages.
# Copia SOLO i file del sito: niente .git, .vercel, script o file privati.
# Uso: powershell -ExecutionPolicy Bypass -File .\prepara-pubblicazione.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$dist = Join-Path $root "dist"

if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Path $dist | Out-Null

# File e cartelle che fanno parte del sito
$files = @("index.html", "privacy.html", "cookie.html", "404.html",
           "avweb-icona.svg", "favicon-32.png", "apple-touch-icon-180.png",
           "_headers", "robots.txt", "sitemap.xml")
foreach ($f in $files) { Copy-Item (Join-Path $root $f) $dist }
Copy-Item (Join-Path $root "fonts") $dist -Recurse
Copy-Item (Join-Path $root "img") $dist -Recurse

# Controlli
$problemi = 0
$extra = Get-ChildItem (Join-Path $dist "img") -File | Where-Object { $_.Extension -ne ".webp" }
foreach ($e in $extra) { Write-Host "ATTENZIONE: file non previsto in img: $($e.Name)" -ForegroundColor Red; $problemi++ }

$html = Get-ChildItem $dist -Filter *.html
foreach ($h in $html) {
  $testo = Get-Content $h.FullName -Raw -Encoding UTF8
  if ($testo -match "gestionale-ads|adpilot") { Write-Host "ATTENZIONE: $($h.Name) contiene un riferimento allo screenshot Ads" -ForegroundColor Red; $problemi++ }
  $segnaposto = ([regex]::Matches($testo, "\[DA (COMPLETARE|VERIFICARE|INSERIRE)[^\]]*\]")).Count
  if ($segnaposto -gt 0) { Write-Host "Da completare: $($h.Name) ha ancora $segnaposto segnaposto [DA ...]" -ForegroundColor Yellow }
}

$n = (Get-ChildItem $dist -Recurse -File).Count
Write-Host ""
Write-Host "Cartella pronta: $dist ($n file)" -ForegroundColor Green
if ($problemi -gt 0) { Write-Host "Ci sono $problemi problemi: NON pubblicare finche non sono risolti." -ForegroundColor Red; exit 1 }
