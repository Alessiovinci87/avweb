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
$cartelle = @("fonts", "img", "css", "js", "servizi", "progetti", "chi-sono", "contatti")
foreach ($c in $cartelle) { Copy-Item (Join-Path $root $c) $dist -Recurse }

function Rel($p) { return $p.Substring($dist.Length + 1).Replace("\", "/") }

# Controlli
$problemi = 0

# Immagini: solo .webp in img, solo .jpg (anteprime Open Graph) in img/og
foreach ($e in Get-ChildItem (Join-Path $dist "img") -File -Recurse) {
  $inOg = $e.DirectoryName -like "*\img\og"
  if (($inOg -and $e.Extension -ne ".jpg") -or (-not $inOg -and $e.Extension -ne ".webp")) {
    Write-Host "ATTENZIONE: file non previsto in img: $(Rel $e.FullName)" -ForegroundColor Red; $problemi++
  }
}

$html = Get-ChildItem $dist -Filter *.html -Recurse
$menuRif = $null; $footerRif = $null
foreach ($h in $html) {
  $nome = Rel $h.FullName
  $testo = Get-Content $h.FullName -Raw -Encoding UTF8
  if ($testo -match "gestionale-ads|adpilot") { Write-Host "ATTENZIONE: $nome contiene un riferimento allo screenshot Ads" -ForegroundColor Red; $problemi++ }
  $segnaposto = ([regex]::Matches($testo, "\[DA (COMPLETARE|VERIFICARE|INSERIRE)[^\]]*\]")).Count
  if ($segnaposto -gt 0) { Write-Host "Da completare: $nome ha ancora $segnaposto segnaposto [DA ...]" -ForegroundColor Yellow }

  # Link e immagini interni: il file di destinazione deve esistere
  foreach ($m in [regex]::Matches($testo, '(?:href|src)="(/[^"#?]*)')) {
    $p = $m.Groups[1].Value.TrimStart("/")
    if ($p -eq "" -or $p.EndsWith("/")) { $p = $p + "index.html" }
    if (-not (Test-Path (Join-Path $dist $p))) { Write-Host "ATTENZIONE: $nome punta a /$($m.Groups[1].Value.TrimStart('/')) che non esiste" -ForegroundColor Red; $problemi++ }
  }

  # Menu e footer identici in tutte le pagine (privacy e cookie hanno la loro testata)
  if ($nome -eq "privacy.html" -or $nome -eq "cookie.html") { continue }
  $menu = [regex]::Match($testo, "(?s)<!-- MENU -->.*?<!-- /MENU -->").Value -replace ' aria-current="page"', ''
  $footer = [regex]::Match($testo, "(?s)<!-- FOOTER -->.*?<!-- /FOOTER -->").Value
  if (-not $menu -or -not $footer) { Write-Host "ATTENZIONE: $nome non ha il menu o il footer comuni" -ForegroundColor Red; $problemi++; continue }
  if ($null -eq $menuRif) { $menuRif = $menu; $footerRif = $footer; $paginaRif = $nome }
  if ($menu -ne $menuRif) { Write-Host "ATTENZIONE: il menu di $nome e diverso da quello di $paginaRif" -ForegroundColor Red; $problemi++ }
  if ($footer -ne $footerRif) { Write-Host "ATTENZIONE: il footer di $nome e diverso da quello di $paginaRif" -ForegroundColor Red; $problemi++ }
}

# Ogni indirizzo della sitemap deve corrispondere a una pagina
[xml]$sitemap = Get-Content (Join-Path $dist "sitemap.xml") -Raw -Encoding UTF8
$indirizzi = @($sitemap.urlset.url | ForEach-Object { $_.loc })
foreach ($u in $indirizzi) {
  $p = $u -replace "^https://avweb\.it/", ""
  if ($p -eq "" -or $p.EndsWith("/")) { $p = $p + "index.html" }
  if (-not (Test-Path (Join-Path $dist $p))) { Write-Host "ATTENZIONE: la sitemap contiene $u ma la pagina non esiste" -ForegroundColor Red; $problemi++ }
}

# Modulo di contatto: la Function sta in "functions" (fuori da dist) e wrangler la prende da li
if (-not (Test-Path (Join-Path $root "functions\api\contatto.js"))) { Write-Host "ATTENZIONE: manca functions\api\contatto.js (modulo di contatto)" -ForegroundColor Red; $problemi++ }

# Nessuna chiave Resend o Turnstile nei file pubblicati o nella Function: vanno solo nelle variabili di Cloudflare
$daControllare = @(Get-ChildItem $dist -File -Recurse) + @(Get-ChildItem (Join-Path $root "functions") -File -Recurse)
foreach ($f in $daControllare) {
  if ($f.Extension -in @(".webp", ".jpg", ".png", ".woff2")) { continue }
  $t = Get-Content $f.FullName -Raw -Encoding UTF8
  if ($t -match "re_[A-Za-z0-9_]{20,}|0x4AAAA[A-Za-z0-9_-]{10,}") { Write-Host "ATTENZIONE: $($f.FullName) sembra contenere una chiave segreta" -ForegroundColor Red; $problemi++ }
}

$n = (Get-ChildItem $dist -Recurse -File).Count
Write-Host ""
Write-Host "Pagine HTML: $($html.Count) - indirizzi nella sitemap: $($indirizzi.Count)"
Write-Host "Cartella pronta: $dist ($n file)" -ForegroundColor Green
if ($problemi -gt 0) { Write-Host "Ci sono $problemi problemi: NON pubblicare finche non sono risolti." -ForegroundColor Red; exit 1 }
