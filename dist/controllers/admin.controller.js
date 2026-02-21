"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = adminMiddleware;
exports.getAllUsers = getAllUsers;
exports.getAllFiles = getAllFiles;
exports.getUserFiles = getUserFiles;
exports.changeUserPassword = changeUserPassword;
exports.getStats = getStats;
exports.getDeletedFiles = getDeletedFiles;
const db_1 = require("../config/db");
// Middleware para verificar si el usuario es admin
function adminMiddleware(req, res, next) {
    try {
        // @ts-ignore
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado: Se requieren permisos de administrador' });
        }
        next();
    }
    catch (err) {
        res.status(500).json({ message: 'Error del servidor' });
    }
}
// Obtener todos los usuarios para el admin
async function getAllUsers(req, res) {
    try {
        const [rows] = await db_1.pool.query('SELECT id, username, email, role, nombre, apellido, fecha_nacimiento, area_trabajo, telefono, created_at FROM users ORDER BY created_at DESC');
        res.json(rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
// Obtener todos los archivos para el admin
async function getAllFiles(req, res) {
    try {
        const [rows] = await db_1.pool.query(`
      SELECT f.id, f.file_name, f.file_path, f.comment, f.created_at, 
             u.username, u.email 
      FROM files f 
      JOIN users u ON f.user_id = u.id 
      ORDER BY f.created_at DESC
    `);
        res.json(rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
// Obtener archivos de un usuario específico
async function getUserFiles(req, res) {
    try {
        const userId = req.params.userId;
        const [rows] = await db_1.pool.query(`
      SELECT f.id, f.file_name, f.file_path, f.comment, f.created_at,
             u.username, u.email 
      FROM files f 
      JOIN users u ON f.user_id = u.id 
      WHERE f.user_id = ? 
      ORDER BY f.created_at DESC
    `, [userId]);
        res.json(rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
// Cambiar contraseña de un usuario
async function changeUserPassword(req, res) {
    try {
        const userId = req.params.userId;
        const { newPassword } = req.body;
        const bcrypt = require('bcrypt');
        const hash = await bcrypt.hash(newPassword, 10);
        await db_1.pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, userId]);
        res.json({ message: 'Contraseña actualizada' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
// Obtener estadísticas generales
async function getStats(req, res) {
    try {
        const [userCount] = await db_1.pool.query('SELECT COUNT(*) as total FROM users');
        const [fileCount] = await db_1.pool.query('SELECT COUNT(*) as total FROM files');
        const [deletedCount] = await db_1.pool.query('SELECT COUNT(*) as total FROM deleted_files');
        res.json({
            // @ts-ignore
            totalUsers: userCount[0].total,
            // @ts-ignore
            totalFiles: fileCount[0].total,
            // @ts-ignore
            totalDeleted: deletedCount[0].total
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
// Obtener todos los archivos eliminados para el admin
async function getDeletedFiles(req, res) {
    try {
        const [rows] = await db_1.pool.query(`
      SELECT df.id, df.file_name, df.file_path, df.deleted_at,
             u.username, u.email 
      FROM deleted_files df 
      JOIN users u ON df.user_id = u.id 
      ORDER BY df.deleted_at DESC
    `);
        res.json(rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
