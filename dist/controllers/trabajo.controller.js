"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrabajosEliminados = exports.deleteTrabajo = exports.updateTrabajo = exports.getTrabajos = exports.createTrabajo = void 0;
const db_1 = require("../config/db");
// Crear nuevo trabajo
const createTrabajo = async (req, res) => {
    try {
        const { tipo, fechaInicio, fechaFin, horaInicio, horaFin, zonas, estado, descripcion } = req.body;
        const userId = req.user?.id;
        if (!tipo || !fechaInicio || !fechaFin || !horaInicio || !horaFin || !zonas || !estado) {
            return res.status(400).json({ message: 'Todos los campos obligatorios son requeridos' });
        }
        // Convertir array de zonas a string separado por comas
        const zonasString = Array.isArray(zonas) ? zonas.join(', ') : zonas;
        const [result] = await db_1.pool.query(`INSERT INTO trabajos_registrados 
       (user_id, tipo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, zonas, estado, descripcion) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [userId, tipo, fechaInicio, fechaFin, horaInicio, horaFin, zonasString, estado, descripcion || null]);
        res.status(201).json({
            message: 'Trabajo registrado exitosamente',
            id: result.insertId
        });
    }
    catch (error) {
        console.error('Error al crear trabajo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.createTrabajo = createTrabajo;
// Obtener trabajos del usuario
const getTrabajos = async (req, res) => {
    try {
        const userId = req.user?.id;
        const [rows] = await db_1.pool.query(`SELECT id, tipo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, zonas, estado, descripcion, created_at 
       FROM trabajos_registrados 
       WHERE user_id = ? AND deleted_at IS NULL 
       ORDER BY created_at DESC`, [userId]);
        // Convertir zonas de string a array y mapear nombres de campos
        const trabajos = rows.map(trabajo => ({
            id: trabajo.id,
            tipo: trabajo.tipo,
            fechaInicio: trabajo.fecha_inicio,
            fechaFin: trabajo.fecha_fin,
            horaInicio: trabajo.hora_inicio,
            horaFin: trabajo.hora_fin,
            zonas: trabajo.zonas ? trabajo.zonas.split(', ') : [],
            estado: trabajo.estado,
            descripcion: trabajo.descripcion,
            fechaRegistro: trabajo.created_at
        }));
        res.json(trabajos);
    }
    catch (error) {
        console.error('Error al obtener trabajos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.getTrabajos = getTrabajos;
// Actualizar trabajo
const updateTrabajo = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, fechaInicio, fechaFin, horaInicio, horaFin, zonas, estado, descripcion } = req.body;
        const userId = req.user?.id;
        // Verificar que el trabajo pertenece al usuario
        const [existing] = await db_1.pool.query('SELECT id FROM trabajos_registrados WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [id, userId]);
        if (!existing.length) {
            return res.status(404).json({ message: 'Trabajo no encontrado' });
        }
        const zonasString = Array.isArray(zonas) ? zonas.join(', ') : zonas;
        await db_1.pool.query(`UPDATE trabajos_registrados 
       SET tipo = ?, fecha_inicio = ?, fecha_fin = ?, hora_inicio = ?, hora_fin = ?, 
           zonas = ?, estado = ?, descripcion = ? 
       WHERE id = ? AND user_id = ?`, [tipo, fechaInicio, fechaFin, horaInicio, horaFin, zonasString, estado, descripcion, id, userId]);
        res.json({ message: 'Trabajo actualizado exitosamente' });
    }
    catch (error) {
        console.error('Error al actualizar trabajo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.updateTrabajo = updateTrabajo;
// Eliminar trabajo (soft delete)
const deleteTrabajo = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        // Verificar que el trabajo pertenece al usuario
        const [existing] = await db_1.pool.query('SELECT id FROM trabajos_registrados WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [id, userId]);
        if (!existing.length) {
            return res.status(404).json({ message: 'Trabajo no encontrado' });
        }
        await db_1.pool.query('UPDATE trabajos_registrados SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [id, userId]);
        res.json({ message: 'Trabajo eliminado exitosamente' });
    }
    catch (error) {
        console.error('Error al eliminar trabajo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.deleteTrabajo = deleteTrabajo;
// Obtener trabajos eliminados
const getTrabajosEliminados = async (req, res) => {
    try {
        const userId = req.user?.id;
        const [rows] = await db_1.pool.query(`SELECT id, tipo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, zonas, estado, descripcion, created_at, deleted_at 
       FROM trabajos_registrados 
       WHERE user_id = ? AND deleted_at IS NOT NULL 
       ORDER BY deleted_at DESC`, [userId]);
        // Convertir zonas de string a array y mapear nombres de campos
        const trabajos = rows.map(trabajo => ({
            id: trabajo.id,
            tipo: trabajo.tipo,
            fechaInicio: trabajo.fecha_inicio,
            fechaFin: trabajo.fecha_fin,
            horaInicio: trabajo.hora_inicio,
            horaFin: trabajo.hora_fin,
            zonas: trabajo.zonas ? trabajo.zonas.split(', ') : [],
            estado: trabajo.estado,
            descripcion: trabajo.descripcion,
            fechaRegistro: trabajo.created_at,
            deleted_at: trabajo.deleted_at
        }));
        res.json(trabajos);
    }
    catch (error) {
        console.error('Error al obtener trabajos eliminados:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.getTrabajosEliminados = getTrabajosEliminados;
