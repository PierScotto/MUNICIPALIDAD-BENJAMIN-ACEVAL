-- Script para agregar las nuevas columnas a la tabla users
-- Ejecuta esto en tu cliente MySQL/MariaDB (phpMyAdmin, MySQL Workbench, etc.)

USE upload_app;

-- Agregar las nuevas columnas una por una
ALTER TABLE users ADD COLUMN nombre VARCHAR(100) NOT NULL DEFAULT '';

ALTER TABLE users ADD COLUMN apellido VARCHAR(100) NOT NULL DEFAULT '';

ALTER TABLE users ADD COLUMN fecha_nacimiento DATE;

ALTER TABLE users ADD COLUMN area_trabajo VARCHAR(150) NOT NULL DEFAULT '';

-- Verificar que las columnas se agregaron correctamente
DESCRIBE users;