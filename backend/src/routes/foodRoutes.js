const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const foodController = require("../controllers/foodController");

// Rutas públicas (requieren autenticación)
router.use(auth);

// GET: Obtener todos los alimentos
router.get("/", foodController.getAllFoods);

// GET: Obtener categorías
router.get("/categories", foodController.getCategories);

// GET: Estadísticas (resumen por categoría)
router.get("/stats", foodController.getStats);

// GET: Buscar alimentos
router.get("/search", foodController.searchFoods);

// GET: Buscar por código de barras
router.get("/barcode/:barcode", foodController.getByBarcode);

// ADMIN ONLY: Importar alimentos masivos
router.post("/import", requireRole(["super_admin"]), foodController.importFoods);

// ADMIN ONLY: Crear respaldo manual
router.post("/backup", requireRole(["super_admin"]), foodController.backupFoods);

// ADMIN ONLY: Crear alimento
router.post("/", requireRole(["super_admin"]), foodController.createFood);

// ADMIN ONLY: Actualizar alimento
router.put("/:foodId", requireRole(["super_admin"]), foodController.updateFood);

// ADMIN ONLY: Eliminar alimento
router.delete("/:foodId", requireRole(["super_admin"]), foodController.deleteFood);

module.exports = router;
