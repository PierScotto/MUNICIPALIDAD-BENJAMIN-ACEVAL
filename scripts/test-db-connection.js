require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'upload_app',
      connectionLimit: 2,
    });

    const [rows] = await pool.query('SELECT 1 AS ok');
    console.log('Conexión OK:', rows[0]);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error de conexión:', err.message);
    process.exit(1);
  }
}

test();
