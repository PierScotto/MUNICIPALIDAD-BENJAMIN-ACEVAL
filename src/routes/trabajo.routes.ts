import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { 
  createTrabajo, 
  getTrabajos, 
  updateTrabajo, 
  deleteTrabajo, 
  getTrabajosEliminados 
} from '../controllers/trabajo.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// POST /api/trabajos - Crear nuevo trabajo
router.post('/', createTrabajo);

// GET /api/trabajos - Obtener trabajos del usuario
router.get('/', getTrabajos);

// GET /api/trabajos/deleted - Obtener trabajos eliminados
router.get('/deleted', getTrabajosEliminados);

// PUT /api/trabajos/:id - Actualizar trabajo
router.put('/:id', updateTrabajo);

// DELETE /api/trabajos/:id - Eliminar trabajo (soft delete)
router.delete('/:id', deleteTrabajo);

export default router;