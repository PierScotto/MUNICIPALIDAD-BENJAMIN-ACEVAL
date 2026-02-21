# 🏛️ Sistema de Gestión de Archivos - Municipalidad de Benjamín Aceval

Sistema web completo para la gestión de archivos de empleados municipales con panel de administración.

## 🚀 Características

- ✅ **Registro completo de usuarios** (nombre, apellido, área de trabajo, etc.)
- ✅ **Sistema de roles** (usuario/administrador)
- ✅ **Gestión de archivos** (subir, editar, eliminar)
- ✅ **Panel de administración** completo
- ✅ **Tracking de archivos eliminados**
- ✅ **Interface moderna** con Tailwind CSS
- ✅ **Autenticación JWT** segura

## 📋 Tecnologías

- **Backend:** Node.js + Express + TypeScript
- **Base de datos:** MySQL/MariaDB
- **Frontend:** HTML + CSS + JavaScript + Tailwind CSS
- **Autenticación:** JWT + bcrypt

## ⚙️ Instalación Rápida

1. **Clonar el repositorio:**
   ```bash
   git clone [URL_DEL_REPO]
   cd upload-app
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar base de datos:**
   - Crear base de datos MySQL llamada `upload_app`
   - Ejecutar el script `update_database.sql` para crear las tablas

4. **Configurar variables de entorno:**
   - Copiar `.env.example` a `.env`
   - Configurar credenciales de base de datos

5. **Generar CSS de Tailwind:**
   ```bash
   npx tailwindcss -i ./public/input.css -o ./public/output.css --minify
   ```

6. **Iniciar servidor:**
   ```bash
   npm run dev
   ```

7. **Abrir en navegador:**
   ```
   http://localhost:3000
   ```

## 👥 Uso del Sistema

### Para Usuarios:
- Registro con información personal completa
- Subida y gestión de archivos personales
- Edición de nombres y comentarios de archivos

### Para Administradores:
- Panel de control completo
- Supervisión de todos los usuarios
- Gestión de archivos de todos los empleados
- Visualización de archivos eliminados
- Cambio de contraseñas de usuarios

## 🔐 Crear Usuario Administrador

Para hacer admin a un usuario, ejecutar en la base de datos:
```sql
UPDATE users SET role = 'admin' WHERE username = 'nombre_usuario';
```

## 📁 Estructura del Proyecto

```
upload-app/
├── src/
│   ├── controllers/     # Lógica de negocio
│   ├── middleware/      # Middleware de autenticación
│   ├── routes/         # Rutas del API
│   ├── config/         # Configuración de BD
│   └── server.ts       # Servidor principal
├── public/             # Frontend
├── uploads/            # Archivos subidos
└── README.md          # Este archivo
```

## 🛠️ Desarrollo

```bash
# Modo desarrollo con auto-reload
npm run dev

# Compilar TypeScript
npm run build

# Generar CSS de Tailwind (modo watch)
npx tailwindcss -i ./public/input.css -o ./public/output.css --watch
```

## 📧 Contacto

Desarrollado para la **Municipalidad de Benjamín Aceval**

---
*Sistema de gestión de archivos - 2025 - Piergiorgio Scotto - 0983159658*