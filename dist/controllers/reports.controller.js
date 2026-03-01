"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportReportToExcel = exports.exportReportToPDF = exports.getWorksReport = exports.getAttendanceReport = exports.getAdvancedReports = void 0;
const db_1 = require("../config/db");
const getAdvancedReports = async (req, res) => {
    try {
        const { startDate, endDate, area } = req.query;
        // Consulta base con joins para obtener todos los datos
        let whereClause = '1=1';
        const params = [];
        if (startDate && endDate) {
            whereClause += ' AND DATE(u.created_at) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        if (area && area !== 'all') {
            whereClause += ' AND u.area_trabajo = ?';
            params.push(area);
        }
        // 📊 REPORTES DE ASISTENCIA
        const attendanceQuery = `
      SELECT 
        u.id, u.nombre, u.apellido, u.area_trabajo,
        COUNT(DISTINCT DATE(m.fecha_entrada)) as dias_trabajados,
        AVG(TIME_TO_SEC(m.hora_entrada)) as promedio_entrada,
        SUM(CASE WHEN m.hora_entrada <= '08:30:00' THEN 1 ELSE 0 END) as llegadas_puntuales,
        COUNT(m.id) as total_marcaciones,
        MAX(m.fecha_entrada) as ultima_asistencia
      FROM users u
      LEFT JOIN marcaciones m ON u.id = m.user_id 
      WHERE ${whereClause}
      GROUP BY u.id, u.nombre, u.apellido, u.area_trabajo
      ORDER BY dias_trabajados DESC
    `;
        // 💼 REPORTES DE TRABAJOS
        const worksQuery = `
      SELECT 
        u.id, u.nombre, u.apellido, u.area_trabajo,
        COUNT(t.id) as trabajos_realizados,
        t.tipoTrabajo,
        COUNT(CASE WHEN t.prioridad = 'Alta' THEN 1 END) as trabajos_alta_prioridad,
        MAX(t.fechaInicio) as ultimo_trabajo
      FROM users u
      LEFT JOIN trabajos_registrados t ON u.id = t.user_id 
      WHERE ${whereClause}
      GROUP BY u.id, u.nombre, u.apellido, u.area_trabajo, t.tipoTrabajo
      ORDER BY trabajos_realizados DESC
    `;
        // 📁 REPORTES DE ARCHIVOS (ya existente mejorado)
        const filesQuery = `
      SELECT 
        u.id, u.nombre, u.apellido, u.area_trabajo,
        COUNT(f.id) as total_archivos,
        COUNT(CASE WHEN f.deleted_at IS NULL THEN 1 END) as archivos_activos,
        COUNT(CASE WHEN f.deleted_at IS NOT NULL THEN 1 END) as archivos_eliminados,
        MAX(f.created_at) as ultimo_archivo
      FROM users u
      LEFT JOIN files f ON u.id = f.user_id 
      WHERE ${whereClause}
      GROUP BY u.id, u.nombre, u.apellido, u.area_trabajo
      ORDER BY total_archivos DESC
    `;
        const [attendanceData] = await db_1.pool.execute(attendanceQuery, params);
        const [worksData] = await db_1.pool.execute(worksQuery, params);
        const [filesData] = await db_1.pool.execute(filesQuery, params);
        res.json({
            success: true,
            data: {
                attendance: attendanceData,
                works: worksData,
                files: filesData
            }
        });
    }
    catch (error) {
        console.error('Error en reportes avanzados:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
exports.getAdvancedReports = getAdvancedReports;
const getAttendanceReport = async (req, res) => {
    try {
        const { startDate, endDate, area } = req.query;
        let whereClause = '1=1';
        const params = [];
        if (startDate && endDate) {
            whereClause += ' AND DATE(m.fecha_entrada) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        if (area && area !== 'all') {
            whereClause += ' AND u.area_trabajo = ?';
            params.push(area);
        }
        // 🕐 Análisis de puntualidad detallado
        const punctualityQuery = `
      SELECT 
        u.nombre, u.apellido, u.area_trabajo,
        DATE(m.fecha_entrada) as fecha,
        m.hora_entrada,
        m.hora_salida,
        CASE 
          WHEN m.hora_entrada <= '08:30:00' THEN 'Puntual'
          WHEN m.hora_entrada <= '09:00:00' THEN 'Leve retraso'
          ELSE 'Tarde'
        END as estado_puntualidad,
        CASE 
          WHEN m.hora_salida IS NOT NULL THEN 
            TIMEDIFF(STR_TO_DATE(CONCAT(DATE(m.fecha_entrada), ' ', m.hora_salida), '%Y-%m-%d %H:%i:%s'), 
                    STR_TO_DATE(CONCAT(DATE(m.fecha_entrada), ' ', m.hora_entrada), '%Y-%m-%d %H:%i:%s'))
          ELSE NULL
        END as horas_trabajadas
      FROM marcaciones m
      INNER JOIN users u ON m.user_id = u.id
      WHERE ${whereClause}
      ORDER BY fecha DESC, u.apellido, u.nombre
    `;
        // 📊 Estadísticas por área
        const areaStatsQuery = `
      SELECT 
        u.area_trabajo,
        COUNT(DISTINCT u.id) as total_empleados,
        COUNT(DISTINCT DATE(m.fecha_entrada)) as dias_con_asistencia,
        AVG(CASE WHEN m.hora_entrada <= '08:30:00' THEN 1 ELSE 0 END * 100) as porcentaje_puntualidad,
        COUNT(m.id) as total_marcaciones
      FROM users u
      LEFT JOIN marcaciones m ON u.id = m.user_id
      WHERE ${whereClause}
      GROUP BY u.area_trabajo
      ORDER BY porcentaje_puntualidad DESC
    `;
        // 🏆 Top empleados más puntuales
        const topPunctualQuery = `
      SELECT 
        u.nombre, u.apellido, u.area_trabajo,
        COUNT(m.id) as total_asistencias,
        SUM(CASE WHEN m.hora_entrada <= '08:30:00' THEN 1 ELSE 0 END) as asistencias_puntuales,
        ROUND(SUM(CASE WHEN m.hora_entrada <= '08:30:00' THEN 1 ELSE 0 END) / COUNT(m.id) * 100, 2) as porcentaje_puntualidad
      FROM users u
      INNER JOIN marcaciones m ON u.id = m.user_id
      WHERE ${whereClause}
      GROUP BY u.id, u.nombre, u.apellido, u.area_trabajo
      HAVING total_asistencias >= 5
      ORDER BY porcentaje_puntualidad DESC, total_asistencias DESC
      LIMIT 10
    `;
        const [punctualityData] = await db_1.pool.execute(punctualityQuery, params);
        const [areaStats] = await db_1.pool.execute(areaStatsQuery, params);
        const [topPunctual] = await db_1.pool.execute(topPunctualQuery, params);
        res.json({
            success: true,
            data: {
                punctuality: punctualityData,
                areaStats: areaStats,
                topPunctual: topPunctual,
                summary: {
                    total_registros: punctualityData.length,
                    empleados_evaluados: topPunctual.length,
                    promedio_puntualidad: areaStats.reduce((acc, area) => acc + (area.porcentaje_puntualidad || 0), 0) / areaStats.length
                }
            }
        });
    }
    catch (error) {
        console.error('Error en reporte de asistencia:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
exports.getAttendanceReport = getAttendanceReport;
const getWorksReport = async (req, res) => {
    try {
        const { startDate, endDate, area } = req.query;
        let whereClause = '1=1';
        const params = [];
        if (startDate && endDate) {
            whereClause += ' AND DATE(t.fechaInicio) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        if (area && area !== 'all') {
            whereClause += ' AND u.area_trabajo = ?';
            params.push(area);
        }
        // 💼 Productividad por empleado
        const productivityQuery = `
      SELECT 
        u.nombre, u.apellido, u.area_trabajo,
        COUNT(t.id) as trabajos_realizados,
        COUNT(CASE WHEN t.prioridad = 'Alta' THEN 1 END) as trabajos_alta_prioridad,
        COUNT(CASE WHEN t.prioridad = 'Media' THEN 1 END) as trabajos_media_prioridad,
        COUNT(CASE WHEN t.prioridad = 'Baja' THEN 1 END) as trabajos_baja_prioridad,
        t.tipoTrabajo as tipo_mas_frecuente,
        MAX(t.fechaInicio) as ultimo_trabajo
      FROM users u
      INNER JOIN trabajos_registrados t ON u.id = t.user_id
      WHERE ${whereClause}
      GROUP BY u.id, u.nombre, u.apellido, u.area_trabajo
      ORDER BY trabajos_realizados DESC
    `;
        // 📊 Trabajos por tipo 
        const workTypesQuery = `
      SELECT 
        tipoTrabajo,
        COUNT(*) as cantidad,
        COUNT(CASE WHEN prioridad = 'Alta' THEN 1 END) as alta_prioridad,
        AVG(CASE WHEN prioridad = 'Alta' THEN 3 WHEN prioridad = 'Media' THEN 2 ELSE 1 END) as prioridad_promedio
      FROM trabajos_registrados t
      INNER JOIN users u ON t.user_id = u.id
      WHERE ${whereClause}
      GROUP BY tipoTrabajo
      ORDER BY cantidad DESC
    `;
        // 🎯 Productividad por área
        const areaProductivityQuery = `
      SELECT 
        u.area_trabajo,
        COUNT(DISTINCT u.id) as empleados,
        COUNT(t.id) as total_trabajos,
        ROUND(COUNT(t.id) / COUNT(DISTINCT u.id), 2) as trabajos_promedio_empleado,
        COUNT(CASE WHEN t.prioridad = 'Alta' THEN 1 END) as trabajos_criticos
      FROM users u
      LEFT JOIN trabajos_registrados t ON u.id = t.user_id
      WHERE ${whereClause}
      GROUP BY u.area_trabajo
      ORDER BY trabajos_promedio_empleado DESC
    `;
        const [productivityData] = await db_1.pool.execute(productivityQuery, params);
        const [workTypes] = await db_1.pool.execute(workTypesQuery, params);
        const [areaProductivity] = await db_1.pool.execute(areaProductivityQuery, params);
        res.json({
            success: true,
            data: {
                productivity: productivityData,
                workTypes: workTypes,
                areaProductivity: areaProductivity,
                summary: {
                    total_trabajos: productivityData.reduce((acc, emp) => acc + emp.trabajos_realizados, 0),
                    empleados_activos: productivityData.length,
                    tipo_mas_comun: workTypes[0]?.tipoTrabajo || 'N/A'
                }
            }
        });
    }
    catch (error) {
        console.error('Error en reporte de trabajos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
exports.getWorksReport = getWorksReport;
const exportReportToPDF = async (req, res) => {
    try {
        const { reportType, startDate, endDate, area } = req.query;
        // Obtener datos llamando directamente a las funciones
        let reportData = null;
        let reportTitle = 'Reporte Municipal';
        if (reportType === 'attendance') {
            reportData = await getAttendanceDataForExport(startDate, endDate, area);
            reportTitle = 'Reporte de Asistencia';
        }
        else if (reportType === 'works') {
            reportData = await getWorksDataForExport(startDate, endDate, area);
            reportTitle = 'Reporte de Trabajos';
        }
        else {
            reportData = await getAdvancedDataForExport(startDate, endDate, area);
            reportTitle = 'Reporte Integral';
        }
        // Generar PDF usando Puppeteer
        const puppeteer = require('puppeteer');
        const htmlContent = generateReportHTML(reportData, reportTitle, { startDate, endDate, area });
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            }
        });
        await browser.close();
        const fileName = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Error exportando PDF:', error);
        res.status(500).json({ success: false, message: 'Error exportando PDF' });
    }
};
exports.exportReportToPDF = exportReportToPDF;
const exportReportToExcel = async (req, res) => {
    try {
        const XLSX = require('xlsx');
        const { reportType, startDate, endDate, area } = req.query;
        // Obtener datos directamente
        let reportData = null;
        if (reportType === 'attendance') {
            reportData = await getAttendanceDataForExport(startDate, endDate, area);
        }
        else if (reportType === 'works') {
            reportData = await getWorksDataForExport(startDate, endDate, area);
        }
        else {
            reportData = await getAdvancedDataForExport(startDate, endDate, area);
        }
        // Crear libro de Excel con múltiples hojas
        const workbook = XLSX.utils.book_new();
        // Hoja 1: Resumen
        const summaryData = [
            ['🏛️ MUNICIPALIDAD DE BENJAMÍN ACEVAL', ''],
            ['📊 Reporte Generado:', new Date().toLocaleDateString()],
            ['📅 Periodo:', `${startDate || 'N/A'} - ${endDate || 'N/A'}`],
            ['🎯 Área:', area === 'all' ? 'Todas las áreas' : area || 'Todas'],
            ['', ''],
            ['📈 RESUMEN EJECUTIVO', ''],
        ];
        if (reportData?.attendance) {
            summaryData.push(['👥 Empleados evaluados:', reportData.attendance.length]);
        }
        if (reportData?.works) {
            summaryData.push(['💼 Trabajos registrados:', reportData.works.length]);
        }
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, '📊 Resumen');
        // Agregar hojas según el tipo de datos
        if (reportData?.attendance) {
            const attendanceSheet = XLSX.utils.json_to_sheet(reportData.attendance.map((item) => ({
                'Nombre': `${item.nombre} ${item.apellido}`,
                'Área': item.area_trabajo,
                'Días Trabajados': item.dias_trabajados || 0,
                'Llegadas Puntuales': item.llegadas_puntuales || 0,
                'Total Marcaciones': item.total_marcaciones || 0
            })));
            XLSX.utils.book_append_sheet(workbook, attendanceSheet, '🕐 Asistencia');
        }
        if (reportData?.works) {
            const worksSheet = XLSX.utils.json_to_sheet(reportData.works.map((item) => ({
                'Nombre': `${item.nombre} ${item.apellido}`,
                'Área': item.area_trabajo,
                'Trabajos Realizados': item.trabajos_realizados || 0,
                'Alta Prioridad': item.trabajos_alta_prioridad || 0
            })));
            XLSX.utils.book_append_sheet(workbook, worksSheet, '💼 Trabajos');
        }
        // Generar buffer del archivo
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const fileName = `Reporte_Municipal_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(excelBuffer);
    }
    catch (error) {
        console.error('Error exportando Excel:', error);
        res.status(500).json({ success: false, message: 'Error exportando Excel' });
    }
};
exports.exportReportToExcel = exportReportToExcel;
// Funciones auxiliares para obtener datos sin problemas de tipos
async function getAttendanceDataForExport(startDate, endDate, area) {
    let whereClause = '1=1';
    const params = [];
    if (startDate && endDate) {
        whereClause += ' AND DATE(m.fecha_entrada) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }
    if (area && area !== 'all') {
        whereClause += ' AND u.area_trabajo = ?';
        params.push(area);
    }
    const query = `
    SELECT 
      u.nombre, u.apellido, u.area_trabajo,
      COUNT(DISTINCT DATE(m.fecha_entrada)) as dias_trabajados,
      SUM(CASE WHEN m.hora_entrada <= '08:30:00' THEN 1 ELSE 0 END) as llegadas_puntuales,
      COUNT(m.id) as total_marcaciones
    FROM users u
    LEFT JOIN marcaciones m ON u.id = m.user_id 
    WHERE ${whereClause}
    GROUP BY u.id, u.nombre, u.apellido, u.area_trabajo
    ORDER BY dias_trabajados DESC
  `;
    const [attendanceData] = await db_1.pool.execute(query, params);
    return { attendance: attendanceData };
}
async function getWorksDataForExport(startDate, endDate, area) {
    let whereClause = '1=1';
    const params = [];
    if (startDate && endDate) {
        whereClause += ' AND DATE(t.fechaInicio) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }
    if (area && area !== 'all') {
        whereClause += ' AND u.area_trabajo = ?';
        params.push(area);
    }
    const query = `
    SELECT 
      u.nombre, u.apellido, u.area_trabajo,
      COUNT(t.id) as trabajos_realizados,
      COUNT(CASE WHEN t.prioridad = 'Alta' THEN 1 END) as trabajos_alta_prioridad
    FROM users u
    INNER JOIN trabajos_registrados t ON u.id = t.user_id
    WHERE ${whereClause}
    GROUP BY u.id, u.nombre, u.apellido, u.area_trabajo
    ORDER BY trabajos_realizados DESC
  `;
    const [worksData] = await db_1.pool.execute(query, params);
    return { works: worksData };
}
async function getAdvancedDataForExport(startDate, endDate, area) {
    const attendanceData = await getAttendanceDataForExport(startDate, endDate, area);
    const worksData = await getWorksDataForExport(startDate, endDate, area);
    return {
        attendance: attendanceData.attendance,
        works: worksData.works
    };
}
// 📄 Función auxiliar para generar HTML del PDF
function generateReportHTML(reportData, title, filters) {
    const currentDate = new Date().toLocaleDateString('es-PY');
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #ef4444; margin: 0; font-size: 24px; }
        .header h2 { color: #10b981; margin: 5px 0; font-size: 18px; }
        .filters { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
        .section { margin-bottom: 30px; }
        .section h3 { color: #374151; border-left: 4px solid #10b981; padding-left: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background-color: #f9fafb; font-weight: bold; }
        .stats { display: flex; justify-content: space-around; text-align: center; }
        .stat { background: #f0f9ff; padding: 15px; border-radius: 8px; flex: 1; margin: 0 5px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏛️ MUNICIPALIDAD DE BENJAMÍN ACEVAL</h1>
        <h2>${title}</h2>
        <p>Generado el ${currentDate}</p>
      </div>
      
      <div class="filters">
        <strong>📊 Filtros Aplicados:</strong><br>
        📅 Periodo: ${filters.startDate || 'N/A'} - ${filters.endDate || 'N/A'}<br>
        🎯 Área: ${filters.area === 'all' ? 'Todas las áreas' : filters.area || 'Todas'}
      </div>
      
      ${generateSectionsHTML(reportData)}
      
      <div class="footer">
        <p>📄 Documento generado automáticamente por el Sistema de Gestión Municipal</p>
        <p>🔒 Confidencial - Solo para uso interno de la Municipalidad</p>
      </div>
    </body>
    </html>
  `;
}
function generateSectionsHTML(reportData) {
    let html = '';
    if (reportData?.attendance) {
        html += `
      <div class="section">
        <h3>🕐 Datos de Asistencia</h3>
        <table>
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Área</th>
              <th>Días Trabajados</th>
              <th>Llegadas Puntuales</th>
              <th>Total Marcaciones</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.attendance.map((item) => `
              <tr>
                <td>${item.nombre} ${item.apellido}</td>
                <td>${item.area_trabajo}</td>
                <td>${item.dias_trabajados || 0}</td>
                <td>${item.llegadas_puntuales || 0}</td>
                <td>${item.total_marcaciones || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    }
    if (reportData?.works) {
        html += `
      <div class="section">
        <h3>💼 Datos de Trabajos</h3>
        <table>
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Área</th>
              <th>Trabajos Realizados</th>
              <th>Alta Prioridad</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.works.map((item) => `
              <tr>
                <td>${item.nombre} ${item.apellido}</td>
                <td>${item.area_trabajo}</td>
                <td>${item.trabajos_realizados || 0}</td>
                <td>${item.trabajos_alta_prioridad || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    }
    return html;
}
