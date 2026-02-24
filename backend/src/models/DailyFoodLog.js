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

  // Obtener totales por usuario en un rango de fechas (incluye suma agregada)
  getRangeTotalsForUsers: (userIds, startDate, endDate) => {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const inRange = dailyFoodLogs.filter((log) => {
        const d = new Date(log.fecha);
        return userIds.includes(log.userId) && d >= s && d <= e;
      });
      const perUser = {};
      for (const l of inRange) {
        if (!perUser[l.userId]) {
          perUser[l.userId] = { totalCalorias: 0, totalProteina: 0, totalCarbohidratos: 0, totalGrasas: 0, totalEntries: 0 };
        }
        perUser[l.userId].totalCalorias += l.calorias;
        perUser[l.userId].totalProteina += l.proteina;
        perUser[l.userId].totalCarbohidratos += l.carbohidratos;
        perUser[l.userId].totalGrasas += l.grasas;
        perUser[l.userId].totalEntries += 1;
      }
      const overall = Object.values(perUser).reduce(
        (acc, t) => ({
          totalCalorias: acc.totalCalorias + t.totalCalorias,
          totalProteina: acc.totalProteina + t.totalProteina,
          totalCarbohidratos: acc.totalCarbohidratos + t.totalCarbohidratos,
          totalGrasas: acc.totalGrasas + t.totalGrasas,
          totalEntries: acc.totalEntries + t.totalEntries,
        }),
        { totalCalorias: 0, totalProteina: 0, totalCarbohidratos: 0, totalGrasas: 0, totalEntries: 0 }
      );
      return { perUser, overall };
    } catch {
      return { perUser: {}, overall: { totalCalorias: 0, totalProteina: 0, totalCarbohidratos: 0, totalGrasas: 0, totalEntries: 0 } };
    }
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
