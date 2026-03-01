"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reports_controller_1 = require("../controllers/reports.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// 📊 Reportes avanzados integrados
router.get('/advanced', auth_middleware_1.authMiddleware, reports_controller_1.getAdvancedReports);
// 🕐 Reportes específicos de asistencia  
router.get('/attendance', auth_middleware_1.authMiddleware, reports_controller_1.getAttendanceReport);
// 💼 Reportes específicos de trabajos
router.get('/works', auth_middleware_1.authMiddleware, reports_controller_1.getWorksReport);
// 📄 Exportaciones
router.get('/export/pdf', auth_middleware_1.authMiddleware, reports_controller_1.exportReportToPDF);
router.get('/export/excel', auth_middleware_1.authMiddleware, reports_controller_1.exportReportToExcel);
// 📊 Datos para gráficos específicos
router.get('/charts/attendance-by-area', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { pool } = require('../config/db');
        const query = `
      SELECT 
        u.area_trabajo,
        COUNT(DISTINCT m.user_id) as empleados_asistieron,
        COUNT(DISTINCT u.id) as total_empleados_area,
        ROUND(COUNT(DISTINCT m.user_id) / COUNT(DISTINCT u.id) * 100, 2) as porcentaje_asistencia
      FROM users u
      LEFT JOIN marcaciones m ON u.id = m.user_id AND DATE(m.fecha_entrada) = CURDATE()
      GROUP BY u.area_trabajo
      ORDER BY porcentaje_asistencia DESC
    `;
        const [result] = await pool.execute(query);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error en datos de asistencia por área' });
    }
});
router.get('/charts/works-by-type', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { pool } = require('../config/db');
        const query = `
      SELECT 
        tipoTrabajo,
        COUNT(*) as cantidad,
        prioridad,
        COUNT(CASE WHEN DATE(fechaInicio) = CURDATE() THEN 1 END) as hoy
      FROM trabajos_registrados
      GROUP BY tipoTrabajo, prioridad
      ORDER BY cantidad DESC
    `;
        const [result] = await pool.execute(query);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error en datos de trabajos por tipo' });
    }
});
router.get('/charts/monthly-summary', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { pool } = require('../config/db');
        // Resumen mensual combinado
        const query = `
      SELECT 
        MONTH(fecha) as mes,
        YEAR(fecha) as año,
        COUNT(CASE WHEN tipo = 'asistencia' THEN 1 END) as asistencias,
        COUNT(CASE WHEN tipo = 'trabajo' THEN 1 END) as trabajos,
        COUNT(CASE WHEN tipo = 'archivo' THEN 1 END) as archivos
      FROM (
        SELECT DATE(fecha_entrada) as fecha, 'asistencia' as tipo FROM marcaciones
        UNION ALL
        SELECT DATE(fechaInicio) as fecha, 'trabajo' as tipo FROM trabajos_registrados  
        UNION ALL
        SELECT DATE(created_at) as fecha, 'archivo' as tipo FROM files WHERE deleted_at IS NULL
      ) combined
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY YEAR(fecha), MONTH(fecha)
      ORDER BY año DESC, mes DESC
      LIMIT 12
    `;
        const [result] = await pool.execute(query);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error en resumen mensual' });
    }
});
// 🎯 Dashboard en tiempo real
router.get('/dashboard/realtime', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { pool } = require('../config/db');
        // Métricas en tiempo real
        const queries = {
            // Asistencia hoy
            attendanceToday: `
        SELECT COUNT(DISTINCT user_id) as presentes_hoy,
        (SELECT COUNT(*) FROM users WHERE role = 'user') as total_empleados
        FROM marcaciones WHERE DATE(fecha_entrada) = CURDATE()
      `,
            // Trabajos hoy  
            worksToday: `
        SELECT COUNT(*) as trabajos_hoy,
        COUNT(CASE WHEN prioridad = 'Alta' THEN 1 END) as criticos_hoy
        FROM trabajos_registrados WHERE DATE(fechaInicio) = CURDATE()
      `,
            // Empleados tarde hoy
            lateToday: `
        SELECT COUNT(DISTINCT m.user_id) as llegadas_tarde
        FROM marcaciones m 
        WHERE DATE(m.fecha_entrada) = CURDATE() AND m.hora_entrada > '08:30:00'
      `,
            // Últimas actividades
            recentActivity: `
        SELECT 'asistencia' as tipo, u.nombre, u.apellido, m.hora_entrada as hora, 'Marcó entrada' as accion
        FROM marcaciones m 
        JOIN users u ON m.user_id = u.id 
        WHERE DATE(m.fecha_entrada) = CURDATE()
        UNION ALL
        SELECT 'trabajo' as tipo, u.nombre, u.apellido, t.horaInicio as hora, CONCAT('Trabajo: ', t.tipoTrabajo) as accion
        FROM trabajos_registrados t
        JOIN users u ON t.user_id = u.id
        WHERE DATE(t.fechaInicio) = CURDATE()
        ORDER BY hora DESC
        LIMIT 10
      `
        };
        const results = {};
        for (const [key, query] of Object.entries(queries)) {
            const [result] = await pool.execute(query);
            results[key] = result;
        }
        res.json({ success: true, data: results });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error en dashboard tiempo real' });
    }
});
exports.default = router;
