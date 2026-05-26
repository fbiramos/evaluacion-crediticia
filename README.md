# evaluacion-crediticia

Sistema de evaluación de riesgo crediticio construido como una PWA (Progressive Web App).

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
git commit -m "Versión v3: [Breve descripción]"
git push origin main
```

> **⚠️ REGLA DE ORO:** Ejecuta este bloque inmediatamente después de cada cambio para que la aplicación se actualice automáticamente en tu celular y otros dispositivos.