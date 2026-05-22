const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const foodController = require("../controllers/foodController");
const { requireModuleLicense } = require("../middleware/requireModuleLicense");

// Rutas públicas (requieren autenticación)
router.use(auth);
router.use(requireModuleLicense("food"));

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
const FOOD_ADMIN_ROLES = [
  "super_admin",
  "admin_food",
  "admin_food_plan",
  "admin_gimnasio",
  "admin_marca",
];

router.post("/import", requireRole(["super_admin"]), foodController.importFoods);

router.post("/backup", requireRole(FOOD_ADMIN_ROLES), foodController.backupFoods);

router.post("/", requireRole(FOOD_ADMIN_ROLES), foodController.createFood);

router.put("/:foodId", requireRole(FOOD_ADMIN_ROLES), foodController.updateFood);

router.delete("/:foodId", requireRole(FOOD_ADMIN_ROLES), foodController.deleteFood);

module.exports = router;
