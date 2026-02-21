const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const foodLogController = require("../controllers/foodLogController");

// Proteger todas las rutas con autenticación
router.use(auth);

// Rutas de búsqueda de alimentos (redirigidas a /api/foods)
// Se accederán vía /api/foods/search y /api/foods/categories

// Rutas de registro diario
router.post("/", foodLogController.addFoodToLog);
router.get("/day", foodLogController.getDayLogs);
router.get("/totals", foodLogController.getDayTotals);
router.get("/history", foodLogController.getUserHistory);

// Rutas de edición y eliminación
router.put("/:entryId", foodLogController.updateLogEntry);
router.delete("/:entryId", foodLogController.removeFromLog);

module.exports = router;
