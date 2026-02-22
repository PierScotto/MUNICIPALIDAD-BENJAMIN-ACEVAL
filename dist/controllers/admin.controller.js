"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = adminMiddleware;
exports.getAllUsers = getAllUsers;
exports.getAllFiles = getAllFiles;
exports.getUserFiles = getUserFiles;
exports.changeUserPassword = changeUserPassword;
exports.getStats = getStats;
exports.getAnalytics = getAnalytics;
exports.getDetailedReport = getDetailedReport;
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
// Reportes y Analytics Avanzados
async function getAnalytics(req, res) {
    try {
        // Usuarios por área de trabajo
        const [usersByArea] = await db_1.pool.query(`
      SELECT area_trabajo, COUNT(*) as total 
      FROM users 
      WHERE area_trabajo != '' 
      GROUP BY area_trabajo 
      ORDER BY total DESC
    `);
        // Archivos por mes (últimos 12 meses)
        const [filesByMonth] = await db_1.pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as mes,
        COUNT(*) as total
      FROM files 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY mes ASC
    `);
        // Actividad por día de la semana
        const [activityByDay] = await db_1.pool.query(`
      SELECT 
        DAYNAME(created_at) as dia,
        COUNT(*) as total
      FROM files 
      GROUP BY DAYOFWEEK(created_at), DAYNAME(created_at)
      ORDER BY DAYOFWEEK(created_at)
    `);
        // Top 5 usuarios más activos
        const [topUsers] = await db_1.pool.query(`
      SELECT 
        u.nombre, u.apellido, u.area_trabajo,
        COUNT(f.id) as total_archivos
      FROM users u
      LEFT JOIN files f ON u.id = f.user_id
      GROUP BY u.id
      ORDER BY total_archivos DESC
      LIMIT 5
    `);
        // Archivos eliminados por mes
        const [deletedByMonth] = await db_1.pool.query(`
      SELECT 
        DATE_FORMAT(deleted_at, '%Y-%m') as mes,
        COUNT(*) as total
      FROM deleted_files 
      WHERE deleted_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(deleted_at, '%Y-%m')
      ORDER BY mes ASC
    `);
        // Resumen de registros recientes (última semana)
        const [recentActivity] = await db_1.pool.query(`
      SELECT 
        DATE(created_at) as fecha,
        COUNT(*) as nuevos_usuarios
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY fecha DESC
    `);
        res.json({
            usersByArea,
            filesByMonth,
            activityByDay,
            topUsers,
            deletedByMonth,
            recentActivity
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
// Reporte detallado por rango de fechas
async function getDetailedReport(req, res) {
    try {
        const { startDate, endDate, area } = req.query;
        let whereClause = 'WHERE 1=1';
        let params = [];
        if (startDate && endDate) {
            whereClause += ' AND f.created_at BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        if (area && area !== 'all') {
            whereClause += ' AND u.area_trabajo = ?';
            params.push(area);
        }
        const [detailedData] = await db_1.pool.query(`
      SELECT 
        u.nombre, u.apellido, u.area_trabajo,
        f.file_name, f.created_at,
        CASE 
          WHEN f.id IS NOT NULL THEN 'Activo'
          ELSE 'N/A'
        END as estado
      FROM users u
      LEFT JOIN files f ON u.id = f.user_id
      ${whereClause}
      ORDER BY f.created_at DESC
    `, params);
        // Estadísticas del reporte
        const [summary] = await db_1.pool.query(`
      SELECT 
        COUNT(DISTINCT u.id) as usuarios_involucrados,
        COUNT(f.id) as total_archivos,
        AVG(
          SELECT COUNT(*) FROM files f2 WHERE f2.user_id = u.id
        ) as promedio_archivos_usuario
      FROM users u
      LEFT JOIN files f ON u.id = f.user_id
      ${whereClause}
    `, params);
        res.json({
            data: detailedData,
            // @ts-ignore
            summary: summary[0],
            filters: { startDate, endDate, area }
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
