# PowerShell script para crear la base de datos `upload_app` y el usuario `upload_user`.
# Ejecuta este script en PowerShell; te pedirá la contraseña de root de MySQL.

Write-Host "Este script intentará crear la base de datos 'upload_app' y el usuario 'upload_user'."
Write-Host "Si no deseas crear el usuario, edita 'scripts/create-db.sql' y elimina la parte de CREATE USER." -ForegroundColor Yellow

# Ejecuta el SQL directamente con el cliente mysql (pedirá la contraseña de root de forma interactiva):
mysql -u root -p -e "SOURCE scripts/create-db.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Script ejecutado correctamente. La base de datos y el usuario deberían existir ahora." -ForegroundColor Green
} else {
    Write-Host "Error al ejecutar el script. Asegúrate de que el cliente 'mysql' esté instalado y en PATH." -ForegroundColor Red
}
