const JsonStore = require('../utils/JsonStore');

// Recetas iniciales de ejemplo
const initialRecipes = [
  {
    id: 1,
    nombre: "Pollo a la Plancha con Verduras",
    descripcion: "Una comida ligera y alta en proteínas.",
    ingredientes: [
      { nombre: "Pechuga de Pollo", cantidad: "200g" },
      { nombre: "Brócoli", cantidad: "100g" },
      { nombre: "Zanahoria", cantidad: "50g" },
      { nombre: "Aceite de Oliva", cantidad: "1 cdita" }
    ],
    instrucciones: [
      "Sazonar el pollo con sal y pimienta.",
      "Cocinar a la plancha con un poco de aceite.",
      "Cocer las verduras al vapor.",
      "Servir todo junto."
    ],
    macros: {
      calorias: 350,
      proteina: 45,
      carbohidratos: 10,
      grasas: 12
    },
    tiempo_preparacion: "20 min",
    dificultad: "Fácil",
    tags: ["Almuerzo", "Cena", "Alto en Proteína", "Bajo en Carbohidratos"],
    imagen: "https://via.placeholder.com/300x200?text=Pollo+Verduras"
  },
  {
    id: 2,
    nombre: "Avena Proteica con Frutas",
    descripcion: "Desayuno energético para empezar el día.",
    ingredientes: [
      { nombre: "Avena en hojuelas", cantidad: "50g" },
      { nombre: "Leche de almendras", cantidad: "200ml" },
      { nombre: "Proteína en polvo (Vainilla)", cantidad: "1 scoop" },
      { nombre: "Fresas", cantidad: "50g" }
    ],
    instrucciones: [
      "Cocinar la avena con la leche.",
      "Al retirar del fuego, mezclar la proteína.",
      "Decorar con fresas picadas."
    ],
    macros: {
      calorias: 380,
      proteina: 25,
      carbohidratos: 45,
      grasas: 8
    },
    tiempo_preparacion: "10 min",
    dificultad: "Fácil",
    tags: ["Desayuno", "Vegetariano"],
    imagen: "https://via.placeholder.com/300x200?text=Avena+Proteica"
  },
  {
    id: 3,
    nombre: "Ensalada de Atún y Aguacate",
    descripcion: "Fresca y rápida, rica en grasas saludables.",
    ingredientes: [
      { nombre: "Atún en agua", cantidad: "1 lata" },
      { nombre: "Aguacate", cantidad: "1/2 unidad" },
      { nombre: "Lechuga", cantidad: "1 taza" },
      { nombre: "Tomate", cantidad: "1 unidad" },
      { nombre: "Limón", cantidad: "al gusto" }
    ],
    instrucciones: [
      "Escurrir el atún.",
      "Picar las verduras y el aguacate.",
      "Mezclar todo en un bowl.",
      "Aderezar con limón, sal y pimienta."
    ],
    macros: {
      calorias: 320,
      proteina: 25,
      carbohidratos: 8,
      grasas: 18
    },
    tiempo_preparacion: "10 min",
    dificultad: "Muy Fácil",
    tags: ["Almuerzo", "Cena", "Keto", "Sin Cocción"],
    imagen: "https://via.placeholder.com/300x200?text=Ensalada+Atun"
  }
];

const recipeStore = new JsonStore('recipes.json', initialRecipes);
let recipeDatabase = recipeStore.getAll();
let nextRecipeId = recipeDatabase.length > 0 ? Math.max(...recipeDatabase.map(r => r.id)) + 1 : 1;

const save = () => {
  recipeStore.setAll(recipeDatabase);
};

const RecipeDatabase = {
  getAll: () => recipeDatabase,
  
  getById: (id) => recipeDatabase.find(r => r.id === id),
  
  create: (recipeData) => {
    const newRecipe = {
      id: nextRecipeId++,
      ...recipeData,
      createdAt: new Date()
    };
    recipeDatabase.push(newRecipe);
    save();
    return newRecipe;
  },
  
  update: (id, updates) => {
    const index = recipeDatabase.findIndex(r => r.id === id);
    if (index !== -1) {
      recipeDatabase[index] = { ...recipeDatabase[index], ...updates };
      save();
      return recipeDatabase[index];
    }
    return null;
  },
  
  delete: (id) => {
    const index = recipeDatabase.findIndex(r => r.id === id);
    if (index !== -1) {
      recipeDatabase.splice(index, 1);
      save();
      return true;
    }
    return false;
  },

  search: (query) => {
    const q = query.toLowerCase();
    return recipeDatabase.filter(r => 
      r.nombre.toLowerCase().includes(q) || 
      r.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }
};

module.exports = RecipeDatabase;
