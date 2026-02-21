// Almacenamiento en memoria mejorado con datos de alimentos
let foodDatabase = [
  // Proteínas
  {
    id: 1,
    nombre: "Pechuga de Pollo (cocida)",
    barcode: "7896235891234",
    categoria: "Proteínas",
    marca: "Genérica",
    cantidad: 100,
    unidad: "g",
    calorias: 165,
    proteina: 31,
    carbohidratos: 0,
    grasas: 3.6,
    activo: true,
  },
  {
    id: 2,
    nombre: "Huevo completo",
    barcode: "7891234567890",
    categoria: "Proteínas",
    marca: "Genérica",
    cantidad: 1,
    unidad: "unidad",
    calorias: 78,
    proteina: 6.6,
    carbohidratos: 0.6,
    grasas: 5.3,
    activo: true,
  },
  {
    id: 3,
    nombre: "Atún en agua (enlatado)",
    barcode: "7896236891234",
    categoria: "Proteínas",
    marca: "Genérica",
    cantidad: 100,
    unidad: "g",
    calorias: 96,
    proteina: 21,
    carbohidratos: 0,
    grasas: 1.3,
    activo: true,
  },
  {
    id: 4,
    nombre: "Salmón (cocido)",
    barcode: "7896237891234",
    categoria: "Proteínas",
    marca: "Genérica",
    cantidad: 100,
    unidad: "g",
    calorias: 206,
    proteina: 22,
    carbohidratos: 0,
    grasas: 12.3,
    activo: true,
  },
  {
    id: 5,
    nombre: "Carne Magra (res)",
    barcode: "7896238891234",
    categoria: "Proteínas",
    marca: "Genérica",
    cantidad: 100,
    unidad: "g",
    calorias: 182,
    proteina: 26,
    carbohidratos: 0,
    grasas: 8.1,
    activo: true,
  },
  // Carbohidratos
  {
    id: 6,
    nombre: "Arroz blanco cocido",
    barcode: "7896239891234",
    categoria: "Carbohidratos",
    marca: "Genérica",
    cantidad: 100,
    unidad: "g",
    calorias: 130,
    proteina: 2.7,
    carbohidratos: 28,
    grasas: 0.3,
    activo: true,
  },
  {
    id: 7,
    nombre: "Pan Integral",
    barcode: "7896240891234",
    categoria: "Carbohidratos",
    marca: "Genérica",
    cantidad: 1,
    unidad: "rebanada",
    calorias: 80,
    proteina: 4,
    carbohidratos: 14,
    grasas: 1,
    activo: true,
  },
  {
    id: 8,
    nombre: "Plátano",
    barcode: "7896241891234",
    categoria: "Carbohidratos",
    marca: "Genérica",
    cantidad: 1,
    unidad: "unidad",
    calorias: 105,
    proteina: 1.3,
    carbohidratos: 27,
    grasas: 0.3,
    activo: true,
  },
  // Grasas
  {
    id: 9,
    nombre: "Aceite de Oliva",
    barcode: "7896242891234",
    categoria: "Grasas",
    marca: "Genérica",
    cantidad: 1,
    unidad: "cucharada",
    calorias: 120,
    proteina: 0,
    carbohidratos: 0,
    grasas: 13.5,
    activo: true,
  },
  {
    id: 10,
    nombre: "Aguacate",
    barcode: "7896243891234",
    categoria: "Grasas",
    marca: "Genérica",
    cantidad: 100,
    unidad: "g",
    calorias: 160,
    proteina: 2,
    carbohidratos: 9,
    grasas: 15,
    activo: true,
  },
];

let nextFoodId = 11;

const FoodDatabase = {
  // Obtener todos los alimentos
  getAll: () => foodDatabase.filter((f) => f.activo),

  // Buscar por código de barras
  findByBarcode: (barcode) => {
    const food = foodDatabase.find((f) => f.barcode === barcode && f.activo);
    return food || null;
  },

  // Buscar por nombre o marca
  search: (query) => {
    const q = query.toLowerCase();
    return foodDatabase.filter(
      (f) =>
        f.activo &&
        (f.nombre.toLowerCase().includes(q) ||
          f.marca.toLowerCase().includes(q))
    );
  },

  // Crear nuevo alimento
  create: (foodData) => {
    const newFood = {
      id: nextFoodId++,
      ...foodData,
      activo: true,
      createdAt: new Date(),
    };
    foodDatabase.push(newFood);
    return newFood;
  },

  // Actualizar alimento
  update: (id, updates) => {
    const index = foodDatabase.findIndex((f) => f.id === id);
    if (index !== -1) {
      foodDatabase[index] = { ...foodDatabase[index], ...updates };
      return foodDatabase[index];
    }
    return null;
  },

  // Eliminar (soft delete)
  delete: (id) => {
    const index = foodDatabase.findIndex((f) => f.id === id);
    if (index !== -1) {
      foodDatabase[index].activo = false;
      return true;
    }
    return false;
  },

  // Obtener por ID
  getById: (id) => foodDatabase.find((f) => f.id === id && f.activo),

  // Obtener por categoría
  getByCategory: (category) =>
    foodDatabase.filter((f) => f.categoria === category && f.activo),

  // Obtener todas las categorías únicas
  getCategories: () => [
    ...new Set(foodDatabase.filter((f) => f.activo).map((f) => f.categoria)),
  ],
};

module.exports = FoodDatabase;
