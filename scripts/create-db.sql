-- Script SQL para crear la base de datos y un usuario dedicado
CREATE DATABASE IF NOT EXISTS `upload_app` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crea un usuario dedicado (contraseña definida abajo)
CREATE USER IF NOT EXISTS 'upload_user'@'localhost' IDENTIFIED BY 'UploadApp_2025';
GRANT ALL PRIVILEGES ON `upload_app`.* TO 'upload_user'@'localhost';
FLUSH PRIVILEGES;

-- Nota: si prefieres usar otro nombre/contraseña, edita este archivo antes de ejecutarlo.
