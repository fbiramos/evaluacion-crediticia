# evaluacion-crediticia

Sistema de evaluación de riesgo crediticio construido como una PWA (Progressive Web App).

## Estado del Proyecto
- **Base de Datos:** Firebase Firestore (Sincronización en tiempo real).
- **Alojamiento Principal:** [GitHub Pages](https://fbiramos.github.io/evaluacion-crediticia/)
- **Alojamiento Alternativo:** [Firebase Hosting](https://evaluacion-crediticia-bbdb4.web.app)

## 🚀 Despliegue Automático
El despliegue se realiza automáticamente vía **GitHub Actions** al hacer push a la rama `main`.

## ⚡ Comando de Actualización Rápida (One-Click)
Copia y pega este comando en la terminal de VS Code para incrementar versión y desplegar:

```powershell
# 1. Detectar y calcular versión
$v = ([regex]::Match((Get-Content sw.js), 'v(\d+)').Groups[1].Value)
$nv = [int]$v + 1
Write-Host "--- 🛠️  PROCESO DE ACTUALIZACIÓN v$nv ---" -ForegroundColor Cyan

# 2. Actualizar archivos locales
Write-Host "[1/3] Actualizando sw.js e index.html..." -ForegroundColor White
(Get-Content sw.js) -replace "v$v", "v$nv" | Set-Content sw.js
(Get-Content index.html) -replace "\?v=$v", "?v=$nv" -replace ">v$v</span>", ">v$nv</span>" | Set-Content index.html

# 3. Git Workflow
Write-Host "[2/3] Preparando commit de Git..." -ForegroundColor White
git add .
git commit -m "🚀 Auto-deploy v$nv"

# 4. Push
Write-Host "[3/3] Subiendo cambios a GitHub..." -ForegroundColor Yellow
git push origin main
Write-Host "✅ ¡Proceso completado! GitHub Actions iniciará el despliegue." -ForegroundColor Green
```
*Este comando actualiza `sw.js`, `index.html` (parámetros de caché y texto visual) y sube todo a GitHub.*