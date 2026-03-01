import { Request, Response } from 'express';
import { pool } from '../config/db';

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Marcar asistencia (entrada o salida)
export const marcarAsistencia = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const ahora = new Date();
    
    // Verificar el estado actual del usuario
    const [estadoResult] = await pool.query(
      'SELECT * FROM estado_usuarios WHERE user_id = ?',
      [userId]
    );
    
    let estado = (estadoResult as any[])[0];
    
    // Si no existe, crear registro inactivo
    if (!estado) {
      await pool.query(
        'INSERT INTO estado_usuarios (user_id) VALUES (?)',
        [userId]
      );
      estado = { estado: 'inactivo' };
    }
    
    let tipo: string;
    let nuevoEstado: string;
    
    if (estado.estado === 'inactivo') {
      tipo = 'entrada';
      nuevoEstado = 'activo';
      
      // Actualizar estado a activo
      await pool.query(
        'UPDATE estado_usuarios SET estado = ?, ultima_entrada = ? WHERE user_id = ?',
        [nuevoEstado, ahora, userId]
      );
    } else {
      tipo = 'salida';
      nuevoEstado = 'inactivo';
      
      // Actualizar estado a inactivo
      await pool.query(
        'UPDATE estado_usuarios SET estado = ?, ultima_salida = ? WHERE user_id = ?',
        [nuevoEstado, ahora, userId]
      );
    }
    
    // Registrar la marcación
    await pool.query(
      'INSERT INTO marcaciones (user_id, fecha_hora, tipo) VALUES (?, ?, ?)',
      [userId, ahora, tipo]
    );
    
    res.json({
      message: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} registrada exitosamente`,
      tipo,
      fechaHora: ahora,
      nuevoEstado
    });
    
  } catch (error) {
    console.error('Error al marcar asistencia:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener estado actual del usuario
export const getEstadoUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const [estadoResult] = await pool.query(
      'SELECT * FROM estado_usuarios WHERE user_id = ?',
      [userId]
    );
    
    let estado = (estadoResult as any[])[0];
    
    // Si no existe, crear registro inactivo
    if (!estado) {
      await pool.query(
        'INSERT INTO estado_usuarios (user_id) VALUES (?)',
        [userId]
      );
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
    
  } catch (error) {
    console.error('Error al obtener estado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener historial de marcaciones
export const getHistorialMarcaciones = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limite = 50 } = req.query;
    
    const [marcaciones] = await pool.query(
      `SELECT id, fecha_hora, tipo, created_at 
       FROM marcaciones 
       WHERE user_id = ? 
       ORDER BY fecha_hora DESC 
       LIMIT ?`,
      [userId, parseInt(limite as string)]
    );
    
    res.json(marcaciones);
    
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Función para cerrar automáticamente a las 15:01
export const cerrarAutomaticamente = async () => {
  try {
    const ahora = new Date();
    const hoy = new Date();
    hoy.setHours(15, 1, 0, 0); // 15:01:00
    
    // Solo ejecutar si es después de las 15:01
    if (ahora >= hoy) {
      // Buscar usuarios activos que no han marcado salida hoy
      const [usuariosActivos] = await pool.query(`
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
      for (const usuario of (usuariosActivos as any[])) {
        // Registrar marcación automática
        await pool.query(
          'INSERT INTO marcaciones (user_id, fecha_hora, tipo) VALUES (?, ?, ?)',
          [usuario.user_id, hoy, 'salida']
        );
        
        // Actualizar estado a inactivo
        await pool.query(
          'UPDATE estado_usuarios SET estado = ?, ultima_salida = ? WHERE user_id = ?',
          ['inactivo', hoy, usuario.user_id]
        );
      }
      
      console.log(`Cerrados automáticamente ${(usuariosActivos as any[]).length} usuarios a las 15:01`);
    }
    
  } catch (error) {
    console.error('Error en cierre automático:', error);
  }
};

// Obtener marcaciones de hoy del usuario
export const getMarcacionesHoy = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const [marcaciones] = await pool.query(
      `SELECT id, fecha_hora, tipo 
       FROM marcaciones 
       WHERE user_id = ? AND DATE(fecha_hora) = CURDATE()
       ORDER BY fecha_hora DESC`,
      [userId]
    );
    
    res.json(marcaciones);
    
  } catch (error) {
    console.error('Error al obtener marcaciones de hoy:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
