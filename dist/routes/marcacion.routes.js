"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const marcacion_controller_1 = require("../controllers/marcacion.controller");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_middleware_1.authMiddleware);
// POST /api/marcaciones/marcar - Marcar entrada o salida
router.post('/marcar', marcacion_controller_1.marcarAsistencia);
// GET /api/marcaciones/estado - Obtener estado actual del usuario
router.get('/estado', marcacion_controller_1.getEstadoUsuario);
// GET /api/marcaciones/historial - Obtener historial de marcaciones
router.get('/historial', marcacion_controller_1.getHistorialMarcaciones);
// GET /api/marcaciones/hoy - Obtener marcaciones del día actual
router.get('/hoy', marcacion_controller_1.getMarcacionesHoy);
exports.default = router;
