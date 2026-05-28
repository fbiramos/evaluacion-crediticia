# evaluacion-crediticia

Sistema de evaluación de riesgo crediticio construido como una PWA (Progressive Web App).

## Estado del Proyecto
- **Base de Datos:** Firebase Firestore (Sincronización en tiempo real).
- **Alojamiento Principal:** [GitHub Pages](https://fbiramos.github.io/evaluacion-crediticia/)
- **Alojamiento Alternativo:** [Firebase Hosting](https://evaluacion-crediticia-bbdb4.web.app)

## 🚀 Despliegue Automático
El despliegue se realiza automáticamente vía **GitHub Actions** al hacer push a la rama `main`.

## 🛠 Procedimiento RZBRO$
Para actualizar la app, simplemente usa los comandos estándar de Git. Si incluyes la versión en el mensaje, la app la reconocerá automáticamente:

```bash
git add .
git commit -m "v109: Descripción de mi cambio"
git push origin main
```
*Este comando actualiza `sw.js`, `index.html` (parámetros de caché y texto visual) y sube todo a GitHub.*