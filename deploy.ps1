# Script de despliegue automático
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
(Get-Content sw.js).Replace("v$v", "v$nv") | Set-Content sw.js
$html = Get-Content index.html -Raw
$html = $html.Replace("?v=$v", "?v=$nv").Replace(">v$v</span>", ">v$nv</span>")
$html | Set-Content index.html

Write-Host "[2/3] Sincronizando con Git..." -ForegroundColor White
git add .
git commit -m "🚀 Auto-deploy v$nv"
git push origin main

Write-Host "✅ ¡HECHO! Firebase se actualizará en 1 minuto." -ForegroundColor Green