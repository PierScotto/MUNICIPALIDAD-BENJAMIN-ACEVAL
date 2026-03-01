"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarcacionesHoy = exports.cerrarAutomaticamente = exports.getHistorialMarcaciones = exports.getEstadoUsuario = exports.marcarAsistencia = void 0;
const db_1 = require("../config/db");
// Marcar entrada o salida
const marcarAsistencia = async (req, res) => {
    try {
        const userId = req.user?.id;
        const ahora = new Date();
        // Verificar el estado actual del usuario
        const [estadoResult] = await db_1.pool.query('SELECT * FROM estado_usuarios WHERE user_id = ?', [userId]);
        let estado = estadoResult[0];
        // Si no existe registro de estado, crear uno
        if (!estado) {
            await db_1.pool.query('INSERT INTO estado_usuarios (user_id) VALUES (?)', [userId]);
            estado = { user_id: userId, estado: 'inactivo', ultima_entrada: null, ultima_salida: null };
        }
        let tipo;
        let nuevoEstado;
        if (estado.estado === 'inactivo') {
            // Usuario va a marcar ENTRADA
            tipo = 'entrada';
            nuevoEstado = 'activo';
            // Registrar marcación
            await db_1.pool.query('INSERT INTO marcaciones (user_id, fecha_hora, tipo) VALUES (?, ?, ?)', [userId, ahora, tipo]);
            // Actualizar estado del usuario
            await db_1.pool.query('UPDATE estado_usuarios SET estado = ?, ultima_entrada = ? WHERE user_id = ?', [nuevoEstado, ahora, userId]);
        }
        else {
            // Usuario va a marcar SALIDA
            tipo = 'salida';
            nuevoEstado = 'inactivo';
            // Registrar marcación
            await db_1.pool.query('INSERT INTO marcaciones (user_id, fecha_hora, tipo) VALUES (?, ?, ?)', [userId, ahora, tipo]);
            // Actualizar estado del usuario
            await db_1.pool.query('UPDATE estado_usuarios SET estado = ?, ultima_salida = ? WHERE user_id = ?', [nuevoEstado, ahora, userId]);
        }
        res.json({
            message: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} marcada exitosamente`,
            tipo,
            fechaHora: ahora,
            nuevoEstado
        });
    }
    catch (error) {
        console.error('Error al marcar asistencia:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.marcarAsistencia = marcarAsistencia;
// Obtener estado actual del usuario
const getEstadoUsuario = async (req, res) => {
    try {
        const userId = req.user?.id;
        const [estadoResult] = await db_1.pool.query('SELECT * FROM estado_usuarios WHERE user_id = ?', [userId]);
        let estado = estadoResult[0];
        // Si no existe, crear registro inactivo
        if (!estado) {
            await db_1.pool.query('INSERT INTO estado_usuarios (user_id) VALUES (?)', [userId]);
            estado = {
                user_id: userId,
                estado: 'inactivo',
                ultima_entrada: null,
                ultima_salida: null
            };
        }
        res.json({
            estado: estado.estado,
            ultimaEntrada: estado.ultima_entrada,
            ultimaSalida: estado.ultima_salida,
            proximaAccion: estado.estado === 'inactivo' ? 'entrada' : 'salida'
        });
    }
    catch (error) {
        console.error('Error al obtener estado:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.getEstadoUsuario = getEstadoUsuario;
// Obtener historial de marcaciones
const getHistorialMarcaciones = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { limite = 50 } = req.query;
        const [marcaciones] = await db_1.pool.query(`SELECT id, fecha_hora, tipo, created_at 
       FROM marcaciones 
       WHERE user_id = ? 
       ORDER BY fecha_hora DESC 
       LIMIT ?`, [userId, parseInt(limite)]);
        res.json(marcaciones);
    }
    catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.getHistorialMarcaciones = getHistorialMarcaciones;
// Función para cerrar automáticamente a las 15:01
const cerrarAutomaticamente = async () => {
    try {
        const ahora = new Date();
        const hoy = new Date();
        hoy.setHours(15, 1, 0, 0); // 15:01:00
        // Solo ejecutar si es después de las 15:01
        if (ahora >= hoy) {
            // Buscar usuarios activos que no han marcado salida hoy
            const [usuariosActivos] = await db_1.pool.query(`
        SELECT eu.user_id, eu.ultima_entrada 
        FROM estado_usuarios eu
        WHERE eu.estado = 'activo' 
        AND DATE(eu.ultima_entrada) = CURDATE()
        AND eu.user_id NOT IN (
          SELECT DISTINCT m.user_id 
          FROM marcaciones m 
          WHERE m.tipo = 'salida' 
          AND DATE(m.fecha_hora) = CURDATE()
          AND m.fecha_hora > eu.ultima_entrada
        )
      `);
            // Marcar salida automática para cada usuario
            for (const usuario of usuariosActivos) {
                // Registrar marcación automática
                await db_1.pool.query('INSERT INTO marcaciones (user_id, fecha_hora, tipo) VALUES (?, ?, ?)', [usuario.user_id, hoy, 'salida']);
                // Actualizar estado a inactivo
                await db_1.pool.query('UPDATE estado_usuarios SET estado = ?, ultima_salida = ? WHERE user_id = ?', ['inactivo', hoy, usuario.user_id]);
            }
            console.log(`Cerrados automáticamente ${usuariosActivos.length} usuarios a las 15:01`);
        }
    }
    catch (error) {
        console.error('Error en cierre automático:', error);
    }
};
exports.cerrarAutomaticamente = cerrarAutomaticamente;
// Obtener marcaciones de hoy del usuario
const getMarcacionesHoy = async (req, res) => {
    try {
        const userId = req.user?.id;
        const [marcaciones] = await db_1.pool.query(`SELECT id, fecha_hora, tipo 
       FROM marcaciones 
       WHERE user_id = ? AND DATE(fecha_hora) = CURDATE()
       ORDER BY fecha_hora DESC`, [userId]);
        res.json(marcaciones);
    }
    catch (error) {
        console.error('Error al obtener marcaciones de hoy:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.getMarcacionesHoy = getMarcacionesHoy;
