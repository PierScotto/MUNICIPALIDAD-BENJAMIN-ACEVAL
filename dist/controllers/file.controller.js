"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFile = updateFile;
exports.listDeletedFiles = listDeletedFiles;
exports.deleteFile = deleteFile;
exports.uploadFile = uploadFile;
exports.listFiles = listFiles;
async function updateFile(req, res) {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const fileId = req.params.id;
        const { file_name, comment } = req.body;
        // Verificar que el archivo pertenece al usuario
        const [rows] = await db_1.pool.query('SELECT id FROM files WHERE id = ? AND user_id = ?', [fileId, userId]);
        if (!rows.length)
            return res.status(404).json({ message: 'Archivo no encontrado' });
        // Actualizar nombre y comentario
        await db_1.pool.query('UPDATE files SET file_name = ?, comment = ? WHERE id = ? AND user_id = ?', [file_name, comment, fileId, userId]);
        res.json({ message: 'Archivo actualizado' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
async function listDeletedFiles(req, res) {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const [rows] = await db_1.pool.query('SELECT id, file_name, file_path, deleted_at FROM deleted_files WHERE user_id = ?', [userId]);
        res.json(rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../config/db");
// ...existing code...
async function deleteFile(req, res) {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const fileId = req.params.id;
        // Buscar el archivo
        const [rows] = await db_1.pool.query('SELECT file_path FROM files WHERE id = ? AND user_id = ?', [fileId, userId]);
        if (!rows.length)
            return res.status(404).json({ message: 'Archivo no encontrado' });
        const filePath = rows[0].file_path;
        // Guardar registro en deleted_files
        const [fileRow] = await db_1.pool.query('SELECT file_name FROM files WHERE id = ? AND user_id = ?', [fileId, userId]);
        const fileName = fileRow[0]?.file_name || '';
        await db_1.pool.query('INSERT INTO deleted_files (user_id, file_name, file_path) VALUES (?, ?, ?)', [userId, fileName, filePath]);
        // Eliminar archivo físico
        const absPath = path_1.default.join(__dirname, '..', '..', 'uploads', filePath);
        if (fs_1.default.existsSync(absPath))
            fs_1.default.unlinkSync(absPath);
        // Eliminar registro en BD
        await db_1.pool.query('DELETE FROM files WHERE id = ? AND user_id = ?', [fileId, userId]);
        res.json({ message: 'Archivo eliminado' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
// ...existing code...
async function uploadFile(req, res) {
    try {
        // @ts-ignore
        const userId = req.user.id;
        // @ts-ignore
        if (!req.file)
            return res.status(400).json({ message: 'Archivo faltante' });
        const fileName = req.file.originalname;
        const filePath = req.file.filename; // stored filename
        await db_1.pool.query('INSERT INTO files (user_id, file_name, file_path) VALUES (?, ?, ?)', [userId, fileName, filePath]);
        res.json({ message: 'Archivo subido' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
async function listFiles(req, res) {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const [rows] = await db_1.pool.query('SELECT id, file_name, file_path, comment, created_at FROM files WHERE user_id = ?', [userId]);
        res.json(rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
