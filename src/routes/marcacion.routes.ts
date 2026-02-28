import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { 
  marcarAsistencia,
  getEstadoUsuario,
  getHistorialMarcaciones,
  getMarcacionesHoy
} from '../controllers/marcacion.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// POST /api/marcaciones/marcar - Marcar entrada o salida
router.post('/marcar', marcarAsistencia);

// GET /api/marcaciones/estado - Obtener estado actual del usuario
router.get('/estado', getEstadoUsuario);

// GET /api/marcaciones/historial - Obtener historial de marcaciones
router.get('/historial', getHistorialMarcaciones);

// GET /api/marcaciones/hoy - Obtener marcaciones del día actual
router.get('/hoy', getMarcacionesHoy);

export default router;