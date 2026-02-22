"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación y permisos de admin
router.get('/users', auth_middleware_1.authMiddleware, admin_controller_1.adminMiddleware, admin_controller_1.getAllUsers);
router.get('/files', auth_middleware_1.authMiddleware, admin_controller_1.adminMiddleware, admin_controller_1.getAllFiles);
router.get('/files/:userId', auth_middleware_1.authMiddleware, admin_controller_1.adminMiddleware, admin_controller_1.getUserFiles);
router.get('/deleted-files', auth_middleware_1.authMiddleware, admin_controller_1.adminMiddleware, admin_controller_1.getDeletedFiles);
router.put('/users/:userId/password', auth_middleware_1.authMiddleware, admin_controller_1.adminMiddleware, admin_controller_1.changeUserPassword);
router.get('/stats', auth_middleware_1.authMiddleware, admin_controller_1.adminMiddleware, admin_controller_1.getStats);
// 📊 Nuevas rutas para Reportes y Analytics
router.get('/analytics', auth_middleware_1.authMiddleware, admin_controller_1.adminMiddleware, admin_controller_1.getAnalytics);
router.get('/reports/detailed', auth_middleware_1.authMiddleware, admin_controller_1.adminMiddleware, admin_controller_1.getDetailedReport);
exports.default = router;
