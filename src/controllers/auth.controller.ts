import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/db';
import { sendVerificationEmail } from '../utils/mailer';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    role: string;
  };
}

export async function register(req: Request, res: Response) {
  try {
    const { username, email, password, nombre, apellido, fecha_nacimiento, area_trabajo, telefono } = req.body;
    
    // Validar que todos los campos estén presentes
    if (!username || !email || !password || !nombre || !apellido || !fecha_nacimiento || !area_trabajo || !telefono) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    // Normalizar y validar teléfono
    const phone = (telefono || '').toString().trim();
    const phoneRegex = /^\+?[0-9\s\-().]{7,20}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Número de teléfono inválido' });
    }

    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    // @ts-ignore
    if (rows.length) return res.status(400).json({ message: 'Email ya registrado' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, nombre, apellido, fecha_nacimiento, area_trabajo, telefono) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [username, email, hash, nombre, apellido, fecha_nacimiento, area_trabajo, phone]
    );
    res.json({ message: 'Cuenta creada exitosamente. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const token = req.query.token as string;
    if (!token) return res.status(400).send('Token faltante');

    await pool.query('UPDATE users SET email_verified = 1, verify_token = NULL WHERE verify_token = ?', [token]);
    // Simple page redirect
    res.redirect('/login.html?verified=1');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Faltan datos' });

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    // @ts-ignore
    const user = rows[0];
  if (!user) return res.status(400).json({ message: 'Usuario no encontrado' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Contraseña incorrecta' });

  const token = jwt.sign({ id: user.id, email: user.email, username: user.username, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

  res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function getMyProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'No autorizado' });

    const [rows] = await pool.query(
      `SELECT id, username, email, role, nombre, apellido, fecha_nacimiento, area_trabajo, telefono, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    const user = (rows as any[])[0];
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      nombre: user.nombre,
      apellido: user.apellido,
      fecha_nacimiento: user.fecha_nacimiento,
      area_trabajo: user.area_trabajo,
      telefono: user.telefono,
      created_at: user.created_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function updateMyProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'No autorizado' });

    const allowedFields = ['nombre', 'apellido', 'fecha_nacimiento', 'area_trabajo', 'telefono'];
    const updates: Record<string, any> = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    if (updates.telefono !== undefined) {
      const phone = String(updates.telefono || '').trim();
      const phoneRegex = /^\+?[0-9\s\-().]{7,20}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ message: 'Número de teléfono inválido' });
      }
      updates.telefono = phone;
    }

    const sets: string[] = [];
    const params: any[] = [];
    Object.entries(updates).forEach(([key, value]) => {
      sets.push(`${key} = ?`);
      params.push(value);
    });
    params.push(userId);

    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.query(
      `SELECT id, username, email, role, nombre, apellido, fecha_nacimiento, area_trabajo, telefono, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const user = (rows as any[])[0];

    res.json({ message: 'Perfil actualizado correctamente', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}