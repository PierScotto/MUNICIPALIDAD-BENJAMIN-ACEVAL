import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ message: 'No autorizado' });

  const token = (auth as string).split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token faltante' });

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    // @ts-ignore
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}