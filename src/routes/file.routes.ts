import { Router } from 'express';
import { uploadFile, listFiles, deleteFile, listDeletedFiles } from '../controllers/file.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();

router.post('/upload', authMiddleware, uploadMiddleware.single('file'), uploadFile);
router.get('/', authMiddleware, listFiles);
router.delete('/:id', authMiddleware, deleteFile);
router.get('/deleted', authMiddleware, listDeletedFiles);

export default router;