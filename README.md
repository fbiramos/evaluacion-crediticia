# evaluacion-crediticia

Sistema de evaluación de riesgo crediticio construido como una PWA (Progressive Web App).

## Estado del Proyecto
- **Base de Datos:** Firebase Firestore (Sincronización en tiempo real).
- **Alojamiento Principal:** [GitHub Pages](https://fbiramos.github.io/evaluacion-crediticia/)
- **Alojamiento Alternativo:** [Firebase Hosting](https://evaluacion-crediticia-bbdb4.web.app)

## 🚀 Despliegue Automático
Ya no necesitas actualizar archivos manualmente. Simplemente usa el comando de abajo o presiona `Ctrl+Shift+B` en VS Code.

### ⚡ Comando de ejecución
```bash
powershell -Command "(Get-Content sw.js) -replace 'v\d+', ('v' + (Get-Date -Format 'MMddHHmm')) | Set-Content sw.js; git add .; git commit -m ('🚀 Deploy ' + (Get-Date -Format 'HH:mm')); git push origin main; firebase deploy"
```

> **⚠️ REGLA DE ORO:** Ejecuta este bloque inmediatamente después de cada cambio para que la aplicación se actualice automáticamente en tu celular y otros dispositivos.