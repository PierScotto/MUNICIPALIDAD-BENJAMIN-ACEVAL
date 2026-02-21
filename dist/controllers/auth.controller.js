"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.verifyEmail = verifyEmail;
exports.login = login;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../config/db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SALT_ROUNDS = 10;
async function register(req, res) {
    try {
        const { username, email, password, nombre, apellido, fecha_nacimiento, area_trabajo, telefono } = req.body;
        // Validar que todos los campos estén presentes
        if (!username || !email || !password || !nombre || !apellido || !fecha_nacimiento || !area_trabajo || !telefono) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }
        const [rows] = await db_1.pool.query('SELECT id FROM users WHERE email = ?', [email]);
        // @ts-ignore
        if (rows.length)
            return res.status(400).json({ message: 'Email ya registrado' });
        const hash = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const [result] = await db_1.pool.query('INSERT INTO users (username, email, password, nombre, apellido, fecha_nacimiento, area_trabajo, telefono) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [username, email, hash, nombre, apellido, fecha_nacimiento, area_trabajo, telefono]);
        res.json({ message: 'Cuenta creada exitosamente. Ya puedes iniciar sesión.' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
async function verifyEmail(req, res) {
    try {
        const token = req.query.token;
        if (!token)
            return res.status(400).send('Token faltante');
        await db_1.pool.query('UPDATE users SET email_verified = 1, verify_token = NULL WHERE verify_token = ?', [token]);
        // Simple page redirect
        res.redirect('/login.html?verified=1');
    }
    catch (err) {
        console.error(err);
        res.status(500).send('Error');
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Faltan datos' });
        const [rows] = await db_1.pool.query('SELECT * FROM users WHERE email = ?', [email]);
        // @ts-ignore
        const user = rows[0];
        if (!user)
            return res.status(400).json({ message: 'Usuario no encontrado' });
        const match = await bcrypt_1.default.compare(password, user.password);
        if (!match)
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, username: user.username, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({ token });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
}
