"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const file_routes_1 = __importDefault(require("./routes/file.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const trabajo_routes_1 = __importDefault(require("./routes/trabajo.routes"));
const marcacion_routes_1 = __importDefault(require("./routes/marcacion.routes"));
const db_1 = require("./config/db");
const marcacion_controller_1 = require("./controllers/marcacion.controller");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Public files
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/files', file_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/trabajos', trabajo_routes_1.default);
app.use('/api/marcaciones', marcacion_routes_1.default);
// Configurar cierre automático a las 15:01
const configurarCierreAutomatico = () => {
    setInterval(() => {
        const ahora = new Date();
        // Ejecutar solo a las 15:01
        if (ahora.getHours() === 15 && ahora.getMinutes() === 1) {
            (0, marcacion_controller_1.cerrarAutomaticamente)();
        }
    }, 60000); // Verificar cada minuto
};
// Start
(0, db_1.initDB)().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        configurarCierreAutomatico();
        console.log('✅ Cierre automático configurado para las 15:01');
    });
}).catch(err => {
    console.error('DB Init error:', err);
});
