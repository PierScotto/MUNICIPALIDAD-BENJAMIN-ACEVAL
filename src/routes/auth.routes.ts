import { Router } from 'express';
import { register, verifyEmail, login, getMyProfile, updateMyProfile } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.get('/verify', verifyEmail);
router.post('/login', login);
router.get('/me', authMiddleware, getMyProfile);
router.put('/me', authMiddleware, updateMyProfile);

export default router;