import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware, getAllUsers, getAllFiles, getUserFiles, changeUserPassword, getStats, getDeletedFiles } from '../controllers/admin.controller';

const router = Router();

// Todas las rutas requieren autenticación y permisos de admin
router.get('/users', authMiddleware, adminMiddleware, getAllUsers);
router.get('/files', authMiddleware, adminMiddleware, getAllFiles);
router.get('/files/:userId', authMiddleware, adminMiddleware, getUserFiles);
router.get('/deleted-files', authMiddleware, adminMiddleware, getDeletedFiles);
router.put('/users/:userId/password', authMiddleware, adminMiddleware, changeUserPassword);
router.get('/stats', authMiddleware, adminMiddleware, getStats);

export default router;