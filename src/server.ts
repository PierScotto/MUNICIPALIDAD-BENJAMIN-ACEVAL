import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth.routes';
import fileRoutes from './routes/file.routes';
import adminRoutes from './routes/admin.routes';
import trabajoRoutes from './routes/trabajo.routes';
import marcacionRoutes from './routes/marcacion.routes';
import { initDB } from './config/db';
import { cerrarAutomaticamente } from './controllers/marcacion.controller';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trabajos', trabajoRoutes);
app.use('/api/marcaciones', marcacionRoutes);

// Configurar cierre automático a las 15:01
const configurarCierreAutomatico = () => {
  setInterval(() => {
    const ahora = new Date();
    // Ejecutar solo a las 15:01
    if (ahora.getHours() === 15 && ahora.getMinutes() === 1) {
      cerrarAutomaticamente();
    }
  }, 60000); // Verificar cada minuto
};

// Start
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    configurarCierreAutomatico();
    console.log('✅ Cierre automático configurado para las 15:01');
  });
}).catch(err => {
  console.error('DB Init error:', err);
});