# Script de despliegue automático

# Forzar codificación UTF8 para que los emojis se vean bien en la terminal
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$swContent = Get-Content sw.js -Raw
$vMatch = [regex]::Match($swContent, "CACHE_NAME = 'v(\d+)'")

if (-not $vMatch.Success) { 
    Write-Host "❌ No se encontró la versión en sw.js" -ForegroundColor Red
    exit 
}

$v = $vMatch.Groups[1].Value
$nv = [int]$v + 1
Write-Host "--- 🛠️  ACTUALIZANDO DE v$v A v$nv ---" -ForegroundColor Cyan

# Actualizar archivos usando reemplazo de texto literal
Write-Host "[1/3] Modificando archivos..." -ForegroundColor White
(Get-Content sw.js) -replace "CACHE_NAME = 'v$v'", "CACHE_NAME = 'v$nv'" | Set-Content sw.js

$html = Get-Content index.html
$html = $html -replace "\?v=$v", "?v=$nv" -replace ">v$v</span>", ">v$nv</span>"
$html | Set-Content index.html

Write-Host "[2/3] Sincronizando con Git..." -ForegroundColor White
git add .
git commit -m "🚀 Auto-deploy v$nv"
git push origin main

Write-Host "✅ ¡HECHO! Firebase se actualizará en 1 minuto." -ForegroundColor Green