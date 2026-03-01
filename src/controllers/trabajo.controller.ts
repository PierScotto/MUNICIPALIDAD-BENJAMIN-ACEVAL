import { Request, Response } from 'express';
import { pool } from '../config/db';

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Crear nuevo trabajo
export const createTrabajo = async (req: AuthRequest, res: Response) => {
  try {
    const { tipo, fechaInicio, fechaFin, horaInicio, horaFin, zonas, estado, descripcion } = req.body;
    const userId = req.user?.id;

    if (!tipo || !fechaInicio || !fechaFin || !horaInicio || !horaFin || !zonas || !estado) {
      return res.status(400).json({ message: 'Todos los campos obligatorios son requeridos' });
    }

    // Convertir array de zonas a string separado por comas
    const zonasString = Array.isArray(zonas) ? zonas.join(', ') : zonas;

    const [result] = await pool.query(
      `INSERT INTO trabajos_registrados 
       (user_id, tipo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, zonas, estado, descripcion) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, tipo, fechaInicio, fechaFin, horaInicio, horaFin, zonasString, estado, descripcion || null]
    );

    res.status(201).json({ 
      message: 'Trabajo registrado exitosamente',
      id: (result as any).insertId 
    });
  } catch (error) {
    console.error('Error al crear trabajo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener trabajos del usuario
export const getTrabajos = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const [rows] = await pool.query(
      `SELECT id, tipo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, zonas, estado, descripcion, created_at 
       FROM trabajos_registrados 
       WHERE user_id = ? AND deleted_at IS NULL 
       ORDER BY created_at DESC`,
      [userId]
    );

    // Convertir zonas de string a array y mapear nombres de campos
    const trabajos = (rows as any[]).map(trabajo => ({
      id: trabajo.id,
      tipo: trabajo.tipo,
      fechaInicio: trabajo.fecha_inicio,
      fechaFin: trabajo.fecha_fin,
      horaInicio: trabajo.hora_inicio,
      horaFin: trabajo.hora_fin,
      zonas: trabajo.zonas ? trabajo.zonas.split(', ') : [],
      estado: trabajo.estado,
      descripcion: trabajo.descripcion,
      createdAt: trabajo.created_at
    }));

    res.json(trabajos);
  } catch (error) {
    console.error('Error al obtener trabajos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar trabajo
export const updateTrabajo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tipo, fechaInicio, fechaFin, horaInicio, horaFin, zonas, estado, descripcion } = req.body;
    const userId = req.user?.id;

    // Verificar que el trabajo pertenece al usuario
    const [existing] = await pool.query(
      'SELECT id FROM trabajos_registrados WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );

    if (!(existing as any[]).length) {
      return res.status(404).json({ message: 'Trabajo no encontrado' });
    }

    const zonasString = Array.isArray(zonas) ? zonas.join(', ') : zonas;

    await pool.query(
      `UPDATE trabajos_registrados 
       SET tipo = ?, fecha_inicio = ?, fecha_fin = ?, hora_inicio = ?, hora_fin = ?, 
           zonas = ?, estado = ?, descripcion = ? 
       WHERE id = ? AND user_id = ?`,
      [tipo, fechaInicio, fechaFin, horaInicio, horaFin, zonasString, estado, descripcion, id, userId]
    );

    res.json({ message: 'Trabajo actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar trabajo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar trabajo (soft delete)
export const deleteTrabajo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Verificar que el trabajo pertenece al usuario
    const [existing] = await pool.query(
      'SELECT id FROM trabajos_registrados WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );

    if (!(existing as any[]).length) {
      return res.status(404).json({ message: 'Trabajo no encontrado' });
    }

    await pool.query(
      'UPDATE trabajos_registrados SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({ message: 'Trabajo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar trabajo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener trabajos eliminados
export const getTrabajosEliminados = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const [rows] = await pool.query(
      `SELECT id, tipo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, zonas, estado, descripcion, created_at, deleted_at 
       FROM trabajos_registrados 
       WHERE user_id = ? AND deleted_at IS NOT NULL 
       ORDER BY deleted_at DESC`,
      [userId]
    );

    // Convertir zonas de string a array y mapear nombres de campos
    const trabajos = (rows as any[]).map(trabajo => ({
      id: trabajo.id,
      tipo: trabajo.tipo,
      fechaInicio: trabajo.fecha_inicio,
      fechaFin: trabajo.fecha_fin,
      horaInicio: trabajo.hora_inicio,
      horaFin: trabajo.hora_fin,
      zonas: trabajo.zonas ? trabajo.zonas.split(', ') : [],
      estado: trabajo.estado,
      descripcion: trabajo.descripcion,
      createdAt: trabajo.created_at,
      deletedAt: trabajo.deleted_at
    }));

    res.json(trabajos);
  } catch (error) {
    console.error('Error al obtener trabajos eliminados:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
