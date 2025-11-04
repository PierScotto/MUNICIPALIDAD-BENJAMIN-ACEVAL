INSTRUCCIONES RÁPIDAS

1) Copia los archivos a una carpeta local (ya están en este ZIP).
2) Crea un archivo .env con los valores de .env.example (cambia las contraseñas).
3) Ejecuta: npm install
4) Genera el CSS de Tailwind:
   npx tailwindcss -i ./public/input.css -o ./public/output.css --minify
5) Levanta el servidor en modo desarrollo:
   npm run dev
6) Abre en el navegador: http://localhost:3000

Notas:
- Configura SMTP para recibir emails de verificación (puedes usar Mailtrap o tu proveedor).
- MySQL: crea la base de datos indicada en .env (o cámbiala). Las tablas se crean automáticamente al iniciar el servidor.
- Si usas Visual Studio Code abre la carpeta del proyecto (File > Open Folder).