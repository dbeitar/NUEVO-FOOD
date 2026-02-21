const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const foodController = require("../controllers/foodController");

// Rutas públicas (requieren autenticación)
router.use(auth);

// GET: Obtener todos los alimentos
router.get("/", foodController.getAllFoods);

// GET: Obtener categorías
router.get("/categories", foodController.getCategories);

// GET: Buscar alimentos
router.get("/search", foodController.searchFoods);

// GET: Buscar por código de barras
router.get("/barcode/:barcode", foodController.getByBarcode);

// ADMIN ONLY: Crear alimento
router.post("/", foodController.createFood);

// ADMIN ONLY: Actualizar alimento
router.put("/:foodId", foodController.updateFood);

// ADMIN ONLY: Eliminar alimento
router.delete("/:foodId", foodController.deleteFood);

module.exports = router;
