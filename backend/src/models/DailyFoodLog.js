// Almacenamiento en memoria de registros diarios de alimentos
let dailyFoodLogs = [];
let logIdCounter = 1;

const DailyFoodLog = {
  // Agregar un alimento consumido al log del día
  addFoodEntry: (userId, foodItem, cantidadConsumida, comida, fecha) => {
    const logId = logIdCounter++;
    const entrada = {
      id: logId,
      userId,
      foodId: foodItem.id,
      foodNombre: foodItem.nombre,
      foodCategoria: foodItem.categoria,
      cantidad: cantidadConsumida,
      unidad: foodItem.unidad,
      comida, // "Desayuno", "Almuerzo", "Cena", "Snack"
      fecha, // YYYY-MM-DD
      createdAt: new Date(),
      calorias: (foodItem.calorias * cantidadConsumida) / foodItem.cantidad,
      proteina: (foodItem.proteina * cantidadConsumida) / foodItem.cantidad,
      carbohidratos:
        (foodItem.carbohidratos * cantidadConsumida) / foodItem.cantidad,
      grasas: (foodItem.grasas * cantidadConsumida) / foodItem.cantidad,
    };
    dailyFoodLogs.push(entrada);
    return entrada;
  },

  // Obtener todos los registros del día de un usuario
  getDayLogs: (userId, fecha) => {
    return dailyFoodLogs.filter((log) => log.userId === userId && log.fecha === fecha);
  },

  // Obtener totales del día (macros consumidas)
  getDayTotals: (userId, fecha) => {
    const logs = dailyFoodLogs.filter(
      (log) => log.userId === userId && log.fecha === fecha
    );
    return {
      totalCalorias: logs.reduce((sum, log) => sum + log.calorias, 0),
      totalProteina: logs.reduce((sum, log) => sum + log.proteina, 0),
      totalCarbohidratos: logs.reduce((sum, log) => sum + log.carbohidratos, 0),
      totalGrasas: logs.reduce((sum, log) => sum + log.grasas, 0),
      totalEntries: logs.length,
      porComida: {
        desayuno: logs.filter((l) => l.comida === "Desayuno") || [],
        almuerzo: logs.filter((l) => l.comida === "Almuerzo") || [],
        cena: logs.filter((l) => l.comida === "Cena") || [],
        snack: logs.filter((l) => l.comida === "Snack") || [],
      },
    };
  },

  // Eliminar una entrada del log
  removeEntry: (entryId, userId) => {
    const index = dailyFoodLogs.findIndex(
      (log) => log.id === entryId && log.userId === userId
    );
    if (index > -1) {
      const removed = dailyFoodLogs.splice(index, 1);
      return removed[0];
    }
    return null;
  },

  // Obtener histórico del usuario (últimos N días)
  getUserHistory: (userId, days = 7) => {
    const today = new Date();
    const history = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      history[dateStr] = DailyFoodLog.getDayTotals(userId, dateStr);
    }
    return history;
  },

  // Editar una entrada
  updateEntry: (entryId, userId, updates) => {
    const entry = dailyFoodLogs.find(
      (log) => log.id === entryId && log.userId === userId
    );
    if (entry) {
      Object.assign(entry, updates, { updatedAt: new Date() });
      return entry;
    }
    return null;
  },
};

module.exports = DailyFoodLog;
