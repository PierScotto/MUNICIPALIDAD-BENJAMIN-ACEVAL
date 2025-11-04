export async function listDeletedFiles(req: Request, res: Response) {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const [rows] = await pool.query('SELECT id, file_name, file_path, deleted_at FROM deleted_files WHERE user_id = ?', [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { pool } from '../config/db';
// ...existing code...

export async function deleteFile(req: Request, res: Response) {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const fileId = req.params.id;
    // Buscar el archivo
    const [rows]: any = await pool.query('SELECT file_path FROM files WHERE id = ? AND user_id = ?', [fileId, userId]);
    if (!rows.length) return res.status(404).json({ message: 'Archivo no encontrado' });
    const filePath = rows[0].file_path;
  // Guardar registro en deleted_files
  const [fileRow]: any = await pool.query('SELECT file_name FROM files WHERE id = ? AND user_id = ?', [fileId, userId]);
  const fileName = fileRow[0]?.file_name || '';
  await pool.query('INSERT INTO deleted_files (user_id, file_name, file_path) VALUES (?, ?, ?)', [userId, fileName, filePath]);
  // Eliminar archivo físico
  const absPath = path.join(__dirname, '..', '..', 'uploads', filePath);
  if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  // Eliminar registro en BD
  await pool.query('DELETE FROM files WHERE id = ? AND user_id = ?', [fileId, userId]);
  res.json({ message: 'Archivo eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}
// ...existing code...

export async function uploadFile(req: Request, res: Response) {
  try {
    // @ts-ignore
    const userId = req.user.id;
    // @ts-ignore
    if (!req.file) return res.status(400).json({ message: 'Archivo faltante' });

    const fileName = req.file.originalname;
    const filePath = req.file.filename; // stored filename

    await pool.query('INSERT INTO files (user_id, file_name, file_path) VALUES (?, ?, ?)', [userId, fileName, filePath]);

    res.json({ message: 'Archivo subido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function listFiles(req: Request, res: Response) {
  try {
    // @ts-ignore
    const userId = req.user.id;
  const [rows] = await pool.query('SELECT id, file_name, file_path, created_at FROM files WHERE user_id = ?', [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
}