@echo off
echo === Iniciando Actualización de Verificación Crediticia ===
echo 1. Preparando cambios...
git add .
echo 2. Registrando versión v1.0.9...
git commit -m "Fix: Force SW update on start v1.0.9"
echo 3. Subiendo a GitHub...
git push origin main
echo === Proceso finalizado. Revisa GitHub Actions para el despliegue. ===
pause