import { Router } from 'express';
import { register, verifyEmail, login } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.get('/verify', verifyEmail);
router.post('/login', login);

export default router;