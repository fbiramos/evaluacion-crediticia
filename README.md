# evaluacion-crediticia

Sistema de evaluación de riesgo crediticio construido como una PWA (Progressive Web App).

## Estado del Proyecto
- **Base de Datos:** Firebase Firestore (Sincronización en tiempo real).
- **Alojamiento Principal:** [GitHub Pages](https://fbiramos.github.io/evaluacion-crediticia/)
- **Alojamiento Alternativo:** [Firebase Hosting](https://evaluacion-crediticia-bbdb4.web.app)

## Guía de Despliegue

Para actualizar la aplicación en producción (GitHub Pages), ejecuta los siguientes comandos en la terminal:

1. **Stagear cambios:**
   `git add .`

2. **Actualizar versión:** Incrementar el `CACHE_NAME` en `sw.js`.

3. **Crear commit y Subir:**
   `git commit -m "Descripción de los cambios realizados"`
   `git push origin main`

### 🚀 Bloque de comandos rápido
```bash
git add .
git commit -m "Versión v24: Agregada vista de Configuraciones y Modo Oscuro"
git push origin main
```

> **⚠️ REGLA DE ORO:** Ejecuta este bloque inmediatamente después de cada cambio para que la aplicación se actualice automáticamente en tu celular y otros dispositivos.