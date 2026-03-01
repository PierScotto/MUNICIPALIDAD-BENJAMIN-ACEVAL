import { Request, Response } from 'express';
import { pool } from '../config/db';

// Middleware para verificar si el usuario es admin
export function adminMiddleware(req: Request, res: Response, next: any) {
  try {
    // @ts-ignore
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado: Se requieren permisos de administrador' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor' });
  }
}

// Obtener todos los usuarios para el admin
export async function getAllUsers(req: Request, res: Response) {
  try {
    const [rows] = await pool.query('SELECT id, username, email, role, nombre, apellido, fecha_nacimiento, area_trabajo, telefono, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

// Obtener todos los archivos para el admin
export async function getAllFiles(req: Request, res: Response) {
  try {
    const [rows] = await pool.query(`
      SELECT f.id, f.file_name, f.file_path, f.comment, f.created_at, 
             u.username, u.email 
      FROM files f 
      JOIN users u ON f.user_id = u.id 
      ORDER BY f.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

// Obtener archivos de un usuario específico
export async function getUserFiles(req: Request, res: Response) {
  try {
    const userId = req.params.userId;
    const [rows] = await pool.query(`
      SELECT f.id, f.file_name, f.file_path, f.comment, f.created_at,
             u.username, u.email 
      FROM files f 
      JOIN users u ON f.user_id = u.id 
      WHERE f.user_id = ? 
      ORDER BY f.created_at DESC
    `, [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

// Cambiar contraseña de un usuario
export async function changeUserPassword(req: Request, res: Response) {
  try {
    const userId = req.params.userId;
    const { newPassword } = req.body;
    
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(newPassword, 10);
    
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, userId]);
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

// Obtener estadísticas generales
export async function getStats(req: Request, res: Response) {
  try {
    const [userCount] = await pool.query('SELECT COUNT(*) as total FROM users');
    const [fileCount] = await pool.query('SELECT COUNT(*) as total FROM files');
    const [deletedCount] = await pool.query('SELECT COUNT(*) as total FROM deleted_files');
    
    res.json({
      // @ts-ignore
      totalUsers: userCount[0].total,
      // @ts-ignore
      totalFiles: fileCount[0].total,
      // @ts-ignore
      totalDeleted: deletedCount[0].total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

// Reportes y Analytics Avanzados
export async function getAnalytics(req: Request, res: Response) {
  try {
    console.log('Iniciando carga de analytics...');

    // Usuarios por área de trabajo
    const [usersByArea] = await pool.query(`
      SELECT 
        COALESCE(area_trabajo, 'Sin área') as area_trabajo, 
        COUNT(*) as total 
      FROM users 
      WHERE area_trabajo != '' AND area_trabajo IS NOT NULL
      GROUP BY area_trabajo 
      ORDER BY total DESC
      LIMIT 10
    `);

    // Archivos por mes (últimos 12 meses)
    const [filesByMonth] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as mes,
        COUNT(*) as total
      FROM files 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY mes ASC
    `);

    // Actividad por día de la semana
    const [activityByDay] = await pool.query(`
      SELECT 
        DAYNAME(created_at) as dia,
        COUNT(*) as total
      FROM files 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DAYOFWEEK(created_at), DAYNAME(created_at)
      ORDER BY DAYOFWEEK(created_at)
    `);

    // Top 5 usuarios más activos
    const [topUsers] = await pool.query(`
      SELECT 
        u.nombre, u.apellido, 
        COALESCE(u.area_trabajo, 'Sin área') as area_trabajo,
        COUNT(f.id) as total_archivos
      FROM users u
      LEFT JOIN files f ON u.id = f.user_id
      GROUP BY u.id, u.nombre, u.apellido, u.area_trabajo
      ORDER BY total_archivos DESC
      LIMIT 5
    `);

    // Archivos eliminados por mes (últimos 12 meses)
    const [deletedByMonth] = await pool.query(`
      SELECT 
        DATE_FORMAT(deleted_at, '%Y-%m') as mes,
        COUNT(*) as total
      FROM deleted_files 
      WHERE deleted_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(deleted_at, '%Y-%m')
      ORDER BY mes ASC
    `);

    // Resumen de registros recientes (última semana)
    const [recentActivity] = await pool.query(`
      SELECT 
        DATE(created_at) as fecha,
        COUNT(*) as nuevos_usuarios
      FROM users 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY fecha DESC
    `);

    console.log('Analytics cargados exitosamente:', {
      usersByArea: Array.isArray(usersByArea) ? usersByArea.length : 0,
      filesByMonth: Array.isArray(filesByMonth) ? filesByMonth.length : 0,
      activityByDay: Array.isArray(activityByDay) ? activityByDay.length : 0,
      topUsers: Array.isArray(topUsers) ? topUsers.length : 0
    });

    res.json({
      usersByArea,
      filesByMonth,
      activityByDay,
      topUsers,
      deletedByMonth,
      recentActivity
    });
  } catch (err) {
    console.error('Error en getAnalytics:', err);
    res.status(500).json({ 
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// Reporte detallado por rango de fechas
export async function getDetailedReport(req: Request, res: Response) {
  try {
    const { startDate, endDate, area } = req.query;
    
    console.log('Parámetros recibidos:', { startDate, endDate, area });
    
    let whereClause = 'WHERE 1=1';
    let params: any[] = [];
    
    if (startDate && endDate) {
      whereClause += ' AND DATE(f.created_at) BETWEEN DATE(?) AND DATE(?)';
      params.push(startDate, endDate);
    }
    
    if (area && area !== 'all') {
      whereClause += ' AND u.area_trabajo = ?';
      params.push(area);
    }
    
    console.log('Query whereClause:', whereClause);
    console.log('Query params:', params);
    
    // Primera consulta: datos detallados
    const detailedQuery = `
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
      LIMIT 1000
    `;
    
    const [detailedData] = await pool.query(detailedQuery, params);

    // Segunda consulta: estadísticas del reporte (más simple y segura)
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT u.id) as usuarios_involucrados,
        COUNT(f.id) as total_archivos,
        CASE 
          WHEN COUNT(DISTINCT u.id) > 0 
          THEN ROUND(COUNT(f.id) / COUNT(DISTINCT u.id), 2)
          ELSE 0 
        END as promedio_archivos_usuario
      FROM users u
      LEFT JOIN files f ON u.id = f.user_id
      ${whereClause}
    `;

    const [summary] = await pool.query(summaryQuery, params);

    console.log('Datos obtenidos:', {
      detailedCount: Array.isArray(detailedData) ? detailedData.length : 0,
      // @ts-ignore
      summary: summary[0]
    });

    res.json({
      data: detailedData,
      // @ts-ignore
      summary: summary[0],
      filters: { startDate, endDate, area }
    });
  } catch (err) {
    console.error('Error en getDetailedReport:', err);
    res.status(500).json({ 
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// Obtener todos los archivos eliminados para el admin
export async function getDeletedFiles(req: Request, res: Response) {
  try {
    const [rows] = await pool.query(`
      SELECT df.id, df.file_name, df.file_path, df.deleted_at,
             u.username, u.email 
      FROM deleted_files df 
      JOIN users u ON df.user_id = u.id 
      ORDER BY df.deleted_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}