import { NextFunction, Request, Response } from 'express';
import { pool } from '../config/db';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    role: string;
  };
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Error desconocido';
}

function asRows<T>(value: unknown): T[] {
  return (value as T[]) || [];
}

// Middleware para verificar si el usuario es admin
export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autorizado' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado: Se requieren permisos de administrador' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: getErrorMessage(err) });
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

    const userRows = asRows<{ total: number }>(userCount);
    const fileRows = asRows<{ total: number }>(fileCount);
    const deletedRows = asRows<{ total: number }>(deletedCount);
    
    res.json({
      totalUsers: userRows[0]?.total || 0,
      totalFiles: fileRows[0]?.total || 0,
      totalDeleted: deletedRows[0]?.total || 0
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
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(err) : undefined
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
      summary: asRows<{ usuarios_involucrados: number; total_archivos: number; promedio_archivos_usuario: number }>(summary)[0]
    });

    const summaryRows = asRows<{ usuarios_involucrados: number; total_archivos: number; promedio_archivos_usuario: number }>(summary);

    res.json({
      data: detailedData,
      summary: summaryRows[0] || { usuarios_involucrados: 0, total_archivos: 0, promedio_archivos_usuario: 0 },
      filters: { startDate, endDate, area }
    });
  } catch (err) {
    console.error('Error en getDetailedReport:', err);
    res.status(500).json({ 
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(err) : undefined
    });
  }
}

type MarcacionRow = {
  id: number;
  user_id: number;
  fecha_hora: string;
  tipo: 'entrada' | 'salida';
  username?: string;
  nombre?: string;
  apellido?: string;
  area_trabajo?: string;
};

function calcularHorasPorDia(rows: MarcacionRow[]): Record<string, number> {
  const porDia: Record<string, Array<{ dt: Date; tipo: string }>> = {};

  rows
    .slice()
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
    .forEach((m) => {
      const key = String(m.fecha_hora || '').substring(0, 10);
      if (!porDia[key]) porDia[key] = [];
      porDia[key].push({ dt: new Date(m.fecha_hora), tipo: m.tipo });
    });

  const now = new Date();
  const out: Record<string, number> = {};
  Object.entries(porDia).forEach(([fecha, registros]) => {
    let totalMs = 0;
    let entradaActivaTs: number | null = null;

    registros.forEach((r) => {
      if (r.tipo === 'entrada') {
        entradaActivaTs = r.dt.getTime();
      } else if (r.tipo === 'salida' && entradaActivaTs !== null) {
        totalMs += r.dt.getTime() - entradaActivaTs;
        entradaActivaTs = null;
      }
    });

    if (entradaActivaTs !== null && fecha === now.toISOString().substring(0, 10)) {
      totalMs += now.getTime() - entradaActivaTs;
    }

    out[fecha] = totalMs / 3600000;
  });

  return out;
}

function nombreCompleto(row?: Partial<MarcacionRow>) {
  const nombre = String(row?.nombre || '').trim();
  const apellido = String(row?.apellido || '').trim();
  return `${nombre} ${apellido}`.trim() || row?.username || 'Usuario';
}

// Reporte admin de marcaciones y horas por usuario
export async function getAdminMarcacionesReport(req: Request, res: Response) {
  try {
    const userIdRaw = String(req.query.userId || 'all');
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    const tipo = String(req.query.tipo || 'all');
    const limitRaw = parseInt(String(req.query.limit || '10000'), 10);
    const limit = Number.isNaN(limitRaw) ? 10000 : Math.max(1, Math.min(limitRaw, 30000));

    const whereBase: string[] = ['1=1'];
    const paramsBase: Array<string | number> = [];

    if (from) {
      whereBase.push('DATE(m.fecha_hora) >= DATE(?)');
      paramsBase.push(from);
    }
    if (to) {
      whereBase.push('DATE(m.fecha_hora) <= DATE(?)');
      paramsBase.push(to);
    }
    if (userIdRaw !== 'all') {
      whereBase.push('m.user_id = ?');
      paramsBase.push(parseInt(userIdRaw, 10));
    }

    const baseSql = `
      SELECT m.id, m.user_id, m.fecha_hora, m.tipo,
             u.username, u.nombre, u.apellido, u.area_trabajo
      FROM marcaciones m
      JOIN users u ON u.id = m.user_id
      WHERE ${whereBase.join(' AND ')}
      ORDER BY m.fecha_hora DESC
      LIMIT ?`;

    const [baseRowsRaw] = await pool.query(baseSql, [...paramsBase, limit]);
    const baseRows = asRows<MarcacionRow>(baseRowsRaw);

    const whereFiltered = [...whereBase];
    const paramsFiltered = [...paramsBase];
    if (tipo !== 'all') {
      whereFiltered.push('m.tipo = ?');
      paramsFiltered.push(tipo);
    }

    const filteredSql = `
      SELECT m.id, m.user_id, m.fecha_hora, m.tipo,
             u.username, u.nombre, u.apellido, u.area_trabajo
      FROM marcaciones m
      JOIN users u ON u.id = m.user_id
      WHERE ${whereFiltered.join(' AND ')}
      ORDER BY m.fecha_hora DESC
      LIMIT ?`;

    const [filteredRowsRaw] = await pool.query(filteredSql, [...paramsFiltered, limit]);
    const filteredRows = asRows<MarcacionRow>(filteredRowsRaw);

    const baseByUser = new Map<number, MarcacionRow[]>();
    baseRows.forEach((r) => {
      if (!baseByUser.has(r.user_id)) baseByUser.set(r.user_id, []);
      baseByUser.get(r.user_id)?.push(r);
    });

    const resumenPorUsuario = Array.from(baseByUser.entries()).map(([uid, rows]) => {
      const horasDia = calcularHorasPorDia(rows);
      const diasConTrabajo = Object.entries(horasDia).filter(([, h]) => h > 0);
      const horasTotales = diasConTrabajo.reduce((acc, [, h]) => acc + h, 0);
      const promedioDiario = diasConTrabajo.length ? horasTotales / diasConTrabajo.length : 0;
      const first = rows[0] || {};

      return {
        userId: uid,
        username: first.username || '',
        nombreCompleto: nombreCompleto(first),
        area: first.area_trabajo || 'Sin área',
        diasTrabajados: diasConTrabajo.length,
        horasTotales,
        promedioDiario,
        totalRegistros: rows.length
      };
    }).sort((a, b) => b.horasTotales - a.horasTotales);

    let detalleUsuario: any = null;
    if (userIdRaw !== 'all') {
      const userId = parseInt(userIdRaw, 10);
      const baseUserRows = baseRows.filter((r) => r.user_id === userId);
      const filteredUserRows = filteredRows.filter((r) => r.user_id === userId);
      const horasDia = calcularHorasPorDia(baseUserRows);
      const diasConTrabajo = Object.entries(horasDia).filter(([, h]) => h > 0);
      const horasTotales = diasConTrabajo.reduce((acc, [, h]) => acc + h, 0);
      const promedioDiario = diasConTrabajo.length ? horasTotales / diasConTrabajo.length : 0;
      const first = baseUserRows[0] || filteredUserRows[0];

      detalleUsuario = {
        userId,
        username: first?.username || '',
        nombreCompleto: nombreCompleto(first),
        area: first?.area_trabajo || 'Sin área',
        kpis: {
          horasTotales,
          diasTrabajados: diasConTrabajo.length,
          promedioDiario,
          totalRegistros: filteredUserRows.length
        },
        horasPorDia: horasDia,
        marcaciones: filteredUserRows
      };
    }

    res.json({
      filters: { userId: userIdRaw, from, to, tipo },
      totals: {
        registrosBase: baseRows.length,
        registrosFiltrados: filteredRows.length,
        usuarios: resumenPorUsuario.length
      },
      resumenPorUsuario,
      detalleUsuario
    });
  } catch (err) {
    console.error('Error en getAdminMarcacionesReport:', err);
    res.status(500).json({
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(err) : undefined
    });
  }
}

// Reporte ejecutivo consolidado para PDF
export async function getExecutiveReport(req: Request, res: Response) {
  try {
    const period = String(req.query.period || 'month');
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');

    // Calcular rango de fechas según el período
    let dateFrom: string;
    let dateTo: string;
    const now = new Date();

    if (from && to) {
      dateFrom = from;
      dateTo = to;
    } else if (period === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() + 1);
      dateFrom = start.toISOString().substring(0, 10);
      dateTo = now.toISOString().substring(0, 10);
    } else if (period === 'year') {
      dateFrom = `${now.getFullYear()}-01-01`;
      dateTo = now.toISOString().substring(0, 10);
    } else {
      // mes actual por defecto
      dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      dateTo = now.toISOString().substring(0, 10);
    }

    // Período anterior (mismo largo, hacia atrás)
    const msRange = new Date(dateTo).getTime() - new Date(dateFrom).getTime() + 86400000;
    const prevTo = new Date(new Date(dateFrom).getTime() - 86400000).toISOString().substring(0, 10);
    const prevFrom = new Date(new Date(dateFrom).getTime() - msRange).toISOString().substring(0, 10);

    // KPIs principales
    const [[usersActive]] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as total FROM marcaciones WHERE DATE(fecha_hora) BETWEEN DATE(?) AND DATE(?)`,
      [dateFrom, dateTo]
    ) as any[];

    const [[usersActivePrev]] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as total FROM marcaciones WHERE DATE(fecha_hora) BETWEEN DATE(?) AND DATE(?)`,
      [prevFrom, prevTo]
    ) as any[];

    const [[filesUploaded]] = await pool.query(
      `SELECT COUNT(*) as total FROM files WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)`,
      [dateFrom, dateTo]
    ) as any[];

    const [[filesUploadedPrev]] = await pool.query(
      `SELECT COUNT(*) as total FROM files WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)`,
      [prevFrom, prevTo]
    ) as any[];

    const [[filesDeleted]] = await pool.query(
      `SELECT COUNT(*) as total FROM deleted_files WHERE DATE(deleted_at) BETWEEN DATE(?) AND DATE(?)`,
      [dateFrom, dateTo]
    ) as any[];

    const [[totalUsers]] = await pool.query(`SELECT COUNT(*) as total FROM users`) as any[];

    // Trabajos (actividades)
    let trabajosCulminados = 0;
    let trabajosPendientes = 0;
    let trabajosTotalPeriod = 0;
    let trabajosCulminadosPrev = 0;
    try {
      const [[tc]] = await pool.query(
        `SELECT COUNT(*) as total FROM trabajos_historial WHERE estado='culminado' AND DATE(created_at) BETWEEN DATE(?) AND DATE(?)`,
        [dateFrom, dateTo]
      ) as any[];
      const [[tp]] = await pool.query(
        `SELECT COUNT(*) as total FROM trabajos_historial WHERE estado='pendiente' AND DATE(created_at) BETWEEN DATE(?) AND DATE(?)`,
        [dateFrom, dateTo]
      ) as any[];
      const [[tt]] = await pool.query(
        `SELECT COUNT(*) as total FROM trabajos_historial WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)`,
        [dateFrom, dateTo]
      ) as any[];
      const [[tcp]] = await pool.query(
        `SELECT COUNT(*) as total FROM trabajos_historial WHERE estado='culminado' AND DATE(created_at) BETWEEN DATE(?) AND DATE(?)`,
        [prevFrom, prevTo]
      ) as any[];
      trabajosCulminados = tc?.total || 0;
      trabajosPendientes = tp?.total || 0;
      trabajosTotalPeriod = tt?.total || 0;
      trabajosCulminadosPrev = tcp?.total || 0;
    } catch (_) { /* tabla puede no existir */ }

    // Horas trabajadas totales (cálculo en JS)
    const [marcRows] = await pool.query(
      `SELECT m.user_id, m.fecha_hora, m.tipo, u.nombre, u.apellido, u.area_trabajo
       FROM marcaciones m JOIN users u ON u.id = m.user_id
       WHERE DATE(m.fecha_hora) BETWEEN DATE(?) AND DATE(?)
       ORDER BY m.fecha_hora ASC`,
      [dateFrom, dateTo]
    ) as any[];

    const [marcRowsPrev] = await pool.query(
      `SELECT user_id, fecha_hora, tipo FROM marcaciones
       WHERE DATE(fecha_hora) BETWEEN DATE(?) AND DATE(?)
       ORDER BY fecha_hora ASC`,
      [prevFrom, prevTo]
    ) as any[];

    function calcHoras(rows: any[]): number {
      const byUser: Record<number, any[]> = {};
      rows.forEach((r: any) => {
        if (!byUser[r.user_id]) byUser[r.user_id] = [];
        byUser[r.user_id].push(r);
      });
      let totalMs = 0;
      Object.values(byUser).forEach((urows) => {
        let entrada: number | null = null;
        urows.forEach((r: any) => {
          if (r.tipo === 'entrada') { entrada = new Date(r.fecha_hora).getTime(); }
          else if (r.tipo === 'salida' && entrada !== null) {
            totalMs += new Date(r.fecha_hora).getTime() - entrada;
            entrada = null;
          }
        });
      });
      return totalMs / 3600000;
    }

    const horasTotales = calcHoras(marcRows);
    const horasTotalesPrev = calcHoras(marcRowsPrev);

    // Top usuarios por horas
    const byUser: Record<number, any> = {};
    (marcRows as any[]).forEach((r: any) => {
      if (!byUser[r.user_id]) byUser[r.user_id] = { nombre: `${r.nombre || ''} ${r.apellido || ''}`.trim(), area: r.area_trabajo || 'Sin área', rows: [] };
      byUser[r.user_id].rows.push(r);
    });
    const topUsuarios = Object.values(byUser)
      .map((u: any) => ({ nombre: u.nombre, area: u.area, horas: calcHoras(u.rows), registros: u.rows.length }))
      .sort((a: any, b: any) => b.horas - a.horas)
      .slice(0, 10);

    // Resumen por área
    const areaMap: Record<string, { horas: number; usuarios: Set<number>; registros: number }> = {};
    (marcRows as any[]).forEach((r: any) => {
      const area = r.area_trabajo || 'Sin área';
      if (!areaMap[area]) areaMap[area] = { horas: 0, usuarios: new Set(), registros: 0 };
      areaMap[area].registros++;
      areaMap[area].usuarios.add(r.user_id);
    });
    Object.values(byUser).forEach((u: any) => {
      const area = u.area;
      if (areaMap[area]) areaMap[area].horas += calcHoras(u.rows);
    });
    const resumenPorArea = Object.entries(areaMap)
      .map(([area, d]) => ({ area, horas: d.horas, usuarios: d.usuarios.size, registros: d.registros }))
      .sort((a, b) => b.horas - a.horas);

    // Archivos subidos por área
    const [filesByArea] = await pool.query(
      `SELECT COALESCE(u.area_trabajo,'Sin área') as area, COUNT(f.id) as total
       FROM files f JOIN users u ON u.id = f.user_id
       WHERE DATE(f.created_at) BETWEEN DATE(?) AND DATE(?)
       GROUP BY u.area_trabajo ORDER BY total DESC`,
      [dateFrom, dateTo]
    ) as any[];

    // Marcaciones por día (para gráfica)
    const [marcByDay] = await pool.query(
      `SELECT DATE(fecha_hora) as fecha, COUNT(*) as total FROM marcaciones
       WHERE DATE(fecha_hora) BETWEEN DATE(?) AND DATE(?)
       GROUP BY DATE(fecha_hora) ORDER BY fecha ASC`,
      [dateFrom, dateTo]
    ) as any[];

    function pctChange(current: number, prev: number): number {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 100);
    }

    res.json({
      meta: { generadoEn: new Date().toISOString(), period, dateFrom, dateTo, prevFrom, prevTo },
      kpis: {
        usuariosActivos: { valor: usersActive?.total || 0, anterior: usersActivePrev?.total || 0, cambio: pctChange(usersActive?.total || 0, usersActivePrev?.total || 0) },
        horasTrabajadas: { valor: Math.round(horasTotales * 10) / 10, anterior: Math.round(horasTotalesPrev * 10) / 10, cambio: pctChange(horasTotales, horasTotalesPrev) },
        archivosSubidos: { valor: filesUploaded?.total || 0, anterior: filesUploadedPrev?.total || 0, cambio: pctChange(filesUploaded?.total || 0, filesUploadedPrev?.total || 0) },
        archivosEliminados: { valor: filesDeleted?.total || 0 },
        totalUsuarios: { valor: totalUsers?.total || 0 },
        trabajosCulminados: { valor: trabajosCulminados, anterior: trabajosCulminadosPrev, cambio: pctChange(trabajosCulminados, trabajosCulminadosPrev) },
        trabajosPendientes: { valor: trabajosPendientes },
        trabajosTotal: { valor: trabajosTotalPeriod }
      },
      topUsuarios,
      resumenPorArea,
      filesByArea,
      marcByDay
    });
  } catch (err) {
    console.error('Error en getExecutiveReport:', err);
    res.status(500).json({ message: 'Error del servidor', error: process.env.NODE_ENV === 'development' ? getErrorMessage(err) : undefined });
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