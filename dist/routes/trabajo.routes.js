"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const trabajo_controller_1 = require("../controllers/trabajo.controller");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_middleware_1.authMiddleware);
// POST /api/trabajos - Crear nuevo trabajo
router.post('/', trabajo_controller_1.createTrabajo);
// GET /api/trabajos - Obtener trabajos del usuario
router.get('/', trabajo_controller_1.getTrabajos);
// GET /api/trabajos/deleted - Obtener trabajos eliminados
router.get('/deleted', trabajo_controller_1.getTrabajosEliminados);
// PUT /api/trabajos/:id - Actualizar trabajo
router.put('/:id', trabajo_controller_1.updateTrabajo);
// DELETE /api/trabajos/:id - Eliminar trabajo (soft delete)
router.delete('/:id', trabajo_controller_1.deleteTrabajo);
exports.default = router;
