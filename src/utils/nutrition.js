export function calcularEdad(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  const nacimiento = new Date(fecha);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

export function mifflinStJeor({ pesoKg, alturaCm, edad, genero }) {
  if (!pesoKg || !alturaCm || !edad) return null;
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * edad;
  return genero === 'femenino' ? base - 161 : base + 5;
}

export function tdee(tmb, factorActividad = 1.55) {
  if (!tmb) return null;
  return tmb * factorActividad;
}

export function ajustarCaloriasPorObjetivo(tdeeValor, objetivo) {
  if (!tdeeValor) return null;
  if (objetivo === 'perdida_grasa' || objetivo === 'pérdida_de_grasa') return tdeeValor - 500;
  if (objetivo === 'ganancia_muscular') return tdeeValor + 300;
  return tdeeValor;
}

export function macrosHarvard(calorias) {
  if (!calorias) return null;
  const pCal = calorias * 0.25;
  const cCal = calorias * 0.5;
  const gCal = calorias * 0.25;
  return {
    proteina: Math.max(0, pCal / 4),
    carbohidratos: Math.max(0, cCal / 4),
    grasas: Math.max(0, gCal / 9),
  };
}

export function computeNutritionPlan({ pesoKg, alturaCm, edad, genero, factorActividad = 1.55, objetivo }) {
  const tmb = mifflinStJeor({ pesoKg, alturaCm, edad, genero });
  const gasto = tdee(tmb, factorActividad);
  const calorias = ajustarCaloriasPorObjetivo(gasto, objetivo);
  const macros = macrosHarvard(calorias);
  return {
    tmb: Math.round(tmb || 0),
    tdee: Math.round(gasto || 0),
    calorias: Math.round(calorias || 0),
    macros: macros
      ? {
          proteina: Number(macros.proteina.toFixed(1)),
          carbohidratos: Number(macros.carbohidratos.toFixed(1)),
          grasas: Number(macros.grasas.toFixed(1)),
        }
      : { proteina: 0, carbohidratos: 0, grasas: 0 },
  };
}

const lactosaMap = [
  { match: /leche|lácte[oa]s?/i, sub: 'bebida de almendras fortificada con calcio' },
  { match: /yogur/i, sub: 'yogur de coco fortificado' },
  { match: /queso/i, sub: 'queso vegetal fortificado' },
  { match: /mantequilla/i, sub: 'aceite de oliva extra virgen' },
  { match: /suero de leche|whey/i, sub: 'proteína vegetal (guisante/soja) fortificada' },
];

export function findSubstitute(nombre, restricciones = '') {
  if (!nombre) return null;
  const rlow = String(restricciones).toLowerCase();
  const hasLactosa = rlow.includes('lacto');
  if (!hasLactosa) return null;
  for (const r of lactosaMap) {
    if (r.match.test(nombre)) return r.sub;
  }
  return null;
}

export function applyMenuSubstitutions(items = [], restricciones = '') {
  return items.map((it) => {
    const sub = findSubstitute(it.nombre || it, restricciones);
    if (!sub) return it;
    if (typeof it === 'string') return sub;
    return { ...it, nombre: sub };
  });
}

const glutenKeywords = [/pan/i, /trigo/i, /pasta/i, /cebada/i, /cusc[uú]s/i, /tortilla integral/i];
const nutsKeywords = [/man[ií]/i, /nuez/i, /nueces/i, /almendra/i, /avellana/i, /cacahuate/i, /mantequilla de man[ií]/i];

export function detectConstraint(restricciones = '') {
  const r = String(restricciones).toLowerCase();
  return {
    lactosa: r.includes('lacto'),
    gluten: r.includes('gluten'),
    frutosSecos: r.includes('fruto') || r.includes('nuez') || r.includes('maní') || r.includes('cacahuate') || r.includes('almendra'),
  };
}

export function detectFoodKeyword(text = '') {
  const t = String(text);
  if (glutenKeywords.some((re) => re.test(t))) return 'gluten';
  if (nutsKeywords.some((re) => re.test(t))) return 'frutosSecos';
  if (/leche|yogur|yogurt|queso|mantequilla|whey/i.test(t)) return 'lactosa';
  return null;
}

export function pickEquivalentForConstraint(equivalentesData, constraintType) {
  if (!equivalentesData) return null;
  const cat = equivalentesData.categorias_equivalentes || {};
  if (constraintType === 'gluten') {
    const pools = [cat.fibra_integral, cat.carbohidrato_complejo];
    const gfList = ['Quinoa', 'Papa cocida', 'Camote/Batata', 'Arroz integral', 'Arroz', 'Maíz'];
    for (const p of pools) {
      if (!p || !Array.isArray(p.sustitutos)) continue;
      const hit = p.sustitutos.find((s) => gfList.some((n) => (s.nombre || '').toLowerCase().includes(n.toLowerCase())));
      if (hit) return { grupo: 'carbohidrato_complejo', ...hit };
    }
  }
  if (constraintType === 'frutosSecos') {
    const p = cat.grasas_saludables;
    if (p && Array.isArray(p.sustitutos)) {
      const avoid = /(nuez|nueces|almendra|man[ií]|cacahuate)/i;
      const pref = p.sustitutos.find((s) => !avoid.test(s.nombre || '') && /Aguacate|Aceite de oliva/i.test(s.nombre || s.nota || ''));
      if (pref) return { grupo: 'grasas_saludables', ...pref };
    }
  }
  if (constraintType === 'lactosa') return null;
  return null;
}

const FOOD_DB_BASE = {
  proteina: [
    { nombre: 'Pechuga de pollo cocida', gramos: 100, p: 31, c: 0, g: 3 },
    { nombre: 'Pavo cocido', gramos: 100, p: 29, c: 0, g: 3 },
    { nombre: 'Huevo', gramos: 50, p: 6, c: 0.4, g: 5 },
    { nombre: 'Claras de huevo', gramos: 100, p: 11, c: 0.7, g: 0 },
    { nombre: 'Atún en agua', gramos: 100, p: 23, c: 0, g: 1 },
    { nombre: 'Salmón cocido', gramos: 100, p: 22, c: 0, g: 12 },
    { nombre: 'Tofu firme', gramos: 100, p: 12, c: 2, g: 6 },
    { nombre: 'Tilapia cocida', gramos: 100, p: 26, c: 0, g: 3 },
    { nombre: 'Lomo de cerdo magro', gramos: 100, p: 27, c: 0, g: 6 },
    { nombre: 'Carne magra cocida', gramos: 100, p: 26, c: 0, g: 8 }
  ],
  carbo: [
    { nombre: 'Arroz integral cocido', gramos: 150, p: 3, c: 49, g: 1.5 },
    { nombre: 'Quinoa cocida', gramos: 150, p: 6, c: 39, g: 3.5 },
    { nombre: 'Papa cocida', gramos: 200, p: 4, c: 37, g: 0.2 },
    { nombre: 'Camote/Batata cocida', gramos: 200, p: 4, c: 41, g: 0.2 },
    { nombre: 'Avena', gramos: 50, p: 6, c: 30, g: 3 },
    { nombre: 'Arroz cocido', gramos: 150, p: 2.5, c: 43, g: 0.5 },
    { nombre: 'Maíz cocido', gramos: 100, p: 3.2, c: 21, g: 1.2 },
    { nombre: 'Pasta integral cocida', gramos: 180, p: 7, c: 54, g: 2 },
    { nombre: 'Polenta cocida', gramos: 180, p: 3, c: 28, g: 1 },
    { nombre: 'Trigo sarraceno cocido', gramos: 150, p: 6, c: 33, g: 1.3 },
    { nombre: 'Amaranto cocido', gramos: 150, p: 6, c: 31, g: 2 }
  ],
  grasas: [
    { nombre: 'Aguacate', gramos: 70, p: 1, c: 6, g: 11 },
    { nombre: 'Aceite de oliva', gramos: 10, p: 0, c: 0, g: 10 },
    { nombre: 'Semillas de chía', gramos: 20, p: 4, c: 2, g: 7 },
    { nombre: 'Aceitunas', gramos: 40, p: 0.3, c: 1.6, g: 4 },
    { nombre: 'Semillas de linaza', gramos: 20, p: 3.8, c: 1.9, g: 7.3 },
    { nombre: 'Semillas de calabaza', gramos: 20, p: 5.6, c: 2.2, g: 8.8 }
  ],
  vegetales: [
    { nombre: 'Brócoli', gramos: 150, p: 5, c: 10, g: 0.5 },
    { nombre: 'Espinaca', gramos: 100, p: 3, c: 4, g: 0.4 },
    { nombre: 'Zanahoria', gramos: 120, p: 1, c: 12, g: 0.2 },
    { nombre: 'Pimentón', gramos: 120, p: 1.5, c: 7, g: 0.2 },
    { nombre: 'Lechuga', gramos: 80, p: 1, c: 2, g: 0.2 },
    { nombre: 'Tomate', gramos: 150, p: 1, c: 5, g: 0.2 },
    { nombre: 'Pepino', gramos: 150, p: 1, c: 3, g: 0.1 },
    { nombre: 'Coliflor', gramos: 150, p: 4, c: 8, g: 0.3 },
    { nombre: 'Berenjena', gramos: 150, p: 1.3, c: 9, g: 0.2 },
    { nombre: 'Champiñones', gramos: 120, p: 3, c: 3.5, g: 0.3 }
  ],
  lacteos: [
    { nombre: 'Yogur griego descremado', gramos: 150, p: 15, c: 7, g: 0.5 }
  ]
};

const FOOD_DB_REGIONAL = {
  MX: {
    proteina: [
      { nombre: 'Pechuga de pollo cocida', gramos: 100, p: 31, c: 0, g: 3 },
      { nombre: 'Tilapia cocida', gramos: 100, p: 26, c: 0, g: 3 }
    ],
    carbo: [
      { nombre: 'Tortilla de maíz', gramos: 50, p: 4, c: 25, g: 1.2 },
      { nombre: 'Frijoles cocidos', gramos: 150, p: 10, c: 27, g: 1 },
      { nombre: 'Elote cocido', gramos: 100, p: 3, c: 19, g: 1.2 }
    ],
    vegetales: [
      { nombre: 'Calabacita', gramos: 150, p: 2, c: 6, g: 0.2 },
      { nombre: 'Nopal', gramos: 150, p: 2, c: 4, g: 0.2 }
    ]
  },
  CO: {
    proteina: [
      { nombre: 'Pechuga de pollo cocida', gramos: 100, p: 31, c: 0, g: 3 },
      { nombre: 'Huevo', gramos: 50, p: 6, c: 0.4, g: 5 },
      { nombre: 'Sobrebarriga magra', gramos: 100, p: 24, c: 0, g: 8 }
    ],
    carbo: [
      { nombre: 'Arepa', gramos: 60, p: 2, c: 34, g: 1.5 },
      { nombre: 'Yuca cocida', gramos: 150, p: 2, c: 36, g: 0.5 },
      { nombre: 'Lentejas cocidas', gramos: 150, p: 12, c: 27, g: 0.5 },
      { nombre: 'Plátano cocido', gramos: 120, p: 1.5, c: 31, g: 0.3 }
    ],
    vegetales: [
      { nombre: 'Tomate', gramos: 150, p: 1, c: 5, g: 0.2 }
    ]
  },
  ES: {
    proteina: [
      { nombre: 'Merluza a la plancha', gramos: 100, p: 18, c: 0, g: 2 },
      { nombre: 'Bonito a la plancha', gramos: 100, p: 23, c: 0, g: 5 }
    ],
    carbo: [
      { nombre: 'Pan integral', gramos: 40, p: 4, c: 18, g: 1.5 },
      { nombre: 'Garbanzos cocidos', gramos: 150, p: 9, c: 27, g: 2.6 }
    ],
    vegetales: [
      { nombre: 'Calabacín', gramos: 150, p: 2, c: 6, g: 0.2 },
      { nombre: 'Aceitunas', gramos: 30, p: 0.3, c: 1, g: 3 }
    ]
  },
  AR: {
    proteina: [
      { nombre: 'Carne magra cocida', gramos: 100, p: 26, c: 0, g: 8 },
      { nombre: 'Merluza a la plancha', gramos: 100, p: 18, c: 0, g: 2 }
    ],
    carbo: [
      { nombre: 'Papa cocida', gramos: 200, p: 4, c: 37, g: 0.2 },
      { nombre: 'Zapallo cocido', gramos: 180, p: 2, c: 12, g: 0.2 }
    ]
  },
  PE: {
    proteina: [
      { nombre: 'Trucha cocida', gramos: 100, p: 20, c: 0, g: 6 }
    ],
    carbo: [
      { nombre: 'Quinua cocida', gramos: 150, p: 6, c: 39, g: 3.5 },
      { nombre: 'Papa cocida', gramos: 200, p: 4, c: 37, g: 0.2 }
    ]
  },
  CL: {
    proteina: [
      { nombre: 'Reineta a la plancha', gramos: 100, p: 22, c: 0, g: 3 },
      { nombre: 'Salmón cocido', gramos: 100, p: 22, c: 0, g: 12 }
    ],
    carbo: [
      { nombre: 'Arroz', gramos: 150, p: 2.5, c: 43, g: 0.5 },
      { nombre: 'Papa cocida', gramos: 200, p: 4, c: 37, g: 0.2 }
    ]
  },
  BR: {
    proteina: [
      { nombre: 'Tilapia a la plancha', gramos: 100, p: 26, c: 0, g: 3 },
      { nombre: 'Pechuga de pollo cocida', gramos: 100, p: 31, c: 0, g: 3 }
    ],
    carbo: [
      { nombre: 'Arroz blanco cocido', gramos: 150, p: 2.8, c: 43, g: 0.3 },
      { nombre: 'Frijol carioca cocido', gramos: 150, p: 9, c: 27, g: 0.8 },
      { nombre: 'Farofa (mandioca) horneada', gramos: 30, p: 1, c: 22, g: 2 }
    ],
    grasas: [
      { nombre: 'Castañas de Brasil', gramos: 20, p: 2.6, c: 3.5, g: 12 }
    ],
    vegetales: [
      { nombre: 'Col rizada (couve) salteada', gramos: 120, p: 3, c: 8, g: 0.6 }
    ]
  },
  IT: {
    proteina: [
      { nombre: 'Merluza al horno', gramos: 100, p: 18, c: 0, g: 2 },
      { nombre: 'Pechuga de pavo', gramos: 100, p: 29, c: 0, g: 2 }
    ],
    carbo: [
      { nombre: 'Pasta integral cocida', gramos: 180, p: 7, c: 54, g: 2 },
      { nombre: 'Polenta cocida', gramos: 180, p: 3, c: 28, g: 1 }
    ],
    grasas: [
      { nombre: 'Aceite de oliva', gramos: 10, p: 0, c: 0, g: 10 }
    ],
    vegetales: [
      { nombre: 'Tomate', gramos: 150, p: 1, c: 5, g: 0.2 },
      { nombre: 'Berenjena', gramos: 150, p: 1.3, c: 9, g: 0.2 }
    ]
  },
  IN: {
    proteina: [
      { nombre: 'Lentejas (dal) cocidas', gramos: 150, p: 12, c: 27, g: 0.8 },
      { nombre: 'Garbanzos cocidos', gramos: 150, p: 9, c: 27, g: 2.6 },
      { nombre: 'Tofu firme', gramos: 100, p: 12, c: 2, g: 6 }
    ],
    carbo: [
      { nombre: 'Arroz basmati cocido', gramos: 150, p: 3, c: 45, g: 0.4 },
      { nombre: 'Roti integral', gramos: 50, p: 4, c: 20, g: 1.2 }
    ],
    grasas: [
      { nombre: 'Aceite de canola', gramos: 10, p: 0, c: 0, g: 10 }
    ],
    vegetales: [
      { nombre: 'Coliflor', gramos: 150, p: 4, c: 8, g: 0.3 },
      { nombre: 'Espinaca', gramos: 100, p: 3, c: 4, g: 0.4 }
    ]
  }
};

function mergeFoodDB(base, regionOverlay) {
  if (!regionOverlay) return base;
  const out = {};
  for (const k of ['proteina', 'carbo', 'grasas', 'vegetales', 'lacteos']) {
    const items = [...(base[k] || []) , ...(regionOverlay[k] || [])];
    const seen = new Set();
    out[k] = items.filter((it) => {
      const key = it.nombre.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return out;
}

function getFoodDB(region) {
  const overlay = FOOD_DB_REGIONAL[(region || '').toUpperCase()];
  return mergeFoodDB(FOOD_DB_BASE, overlay);
}

function avoidByRestriction(item, restrictions) {
  const r = String(restrictions || '').toLowerCase();
  if (r.includes('gluten')) {
    if (/pan|trigo|cebada|pasta/i.test(item.nombre)) return true;
  }
  if (r.includes('lacto')) {
    if (/yogur|leche|queso|kéfir/i.test(item.nombre)) return true;
  }
  if (r.includes('fruto') || r.includes('nuez') || r.includes('almendra') || r.includes('cacahuate') || r.includes('maní')) {
    if (/nuez|almendra|cacahuate|man[ií]/i.test(item.nombre)) return true;
  }
  return false;
}

function preferPick(list, restricciones, prefs) {
  const filtered = list.filter((x) => !avoidByRestriction(x, restricciones));
  if (prefs && Array.isArray(prefs.prefer) && prefs.prefer.length) {
    const hit = filtered.find((x) => prefs.prefer.some((p) => (x.nombre || '').toLowerCase().includes(String(p).toLowerCase())));
    if (hit) return hit;
  }
  if (prefs && Array.isArray(prefs.avoid) && prefs.avoid.length) {
    const alt = filtered.find((x) => !prefs.avoid.some((p) => (x.nombre || '').toLowerCase().includes(String(p).toLowerCase())));
    if (alt) return alt;
  }
  return filtered[0] || list[0];
}

export function buildMealSuggestion({ meal, macrosObjetivo, restricciones, prefs }) {
  const perc = meal === 'desayuno' ? 0.25 : meal === 'almuerzo' ? 0.4 : meal === 'cena' ? 0.25 : meal === 'snack' ? 0.1 : 0.2;
  const target = {
    p: Math.max(0, (macrosObjetivo?.proteina || 0) * perc),
    c: Math.max(0, (macrosObjetivo?.carbohidratos || 0) * perc),
    g: Math.max(0, (macrosObjetivo?.grasas || 0) * perc)
  };
  const db = getFoodDB(prefs?.region);
  const pick = (list) => list.find((x) => !avoidByRestriction(x, restricciones)) || list[0];
  const protein = pick(db.proteina);
  const carb = pick(db.carbo);
  const fat = pick(db.grasas);
  const veg = pick(db.vegetales);
  let items = [protein, carb, fat, veg];
  const total = items.reduce((acc, it) => {
    acc.p += it.p;
    acc.c += it.c;
    acc.g += it.g;
    return acc;
  }, { p: 0, c: 0, g: 0 });
  const adj = { p: target.p / Math.max(total.p, 1), c: target.c / Math.max(total.c, 1), g: target.g / Math.max(total.g, 1) };
  const mult = Math.max(Math.min(adj.p, adj.c, adj.g), 0.5);
  items = items.map((it) => ({
    nombre: it.nombre,
    cantidad: Math.round(it.gramos * mult),
  }));
  return {
    meal,
    items
  };
}

function rotate(list, shift) {
  if (!Array.isArray(list) || list.length === 0) return list;
  const s = ((shift % list.length) + list.length) % list.length;
  return list.slice(s).concat(list.slice(0, s));
}

export function buildMealSuggestionVar({ meal, macrosObjetivo, restricciones, dayIndex = 0, prefs }) {
  const perc = meal === 'desayuno' ? 0.25 : meal === 'almuerzo' ? 0.4 : meal === 'cena' ? 0.25 : meal === 'snack' ? 0.1 : 0.2;
  const target = {
    p: Math.max(0, (macrosObjetivo?.proteina || 0) * perc),
    c: Math.max(0, (macrosObjetivo?.carbohidratos || 0) * perc),
    g: Math.max(0, (macrosObjetivo?.grasas || 0) * perc)
  };
  const db = getFoodDB(prefs?.region);
  const protein = preferPick(rotate(db.proteina, dayIndex), restricciones, prefs?.proteina || { prefer: prefs?.preferProteina, avoid: prefs?.avoidProteina });
  const carb = preferPick(rotate(db.carbo, dayIndex), restricciones, prefs?.carbo || { prefer: prefs?.preferCarbo, avoid: prefs?.avoidCarbo });
  const fat = preferPick(rotate(db.grasas, dayIndex), restricciones, prefs?.grasas || { prefer: prefs?.preferGrasas, avoid: prefs?.avoidGrasas });
  const veg = preferPick(rotate(db.vegetales, dayIndex), restricciones, prefs?.vegetales || { prefer: prefs?.preferVeg, avoid: prefs?.avoidVeg });
  let items = [protein, carb, fat, veg];
  const total = items.reduce((acc, it) => {
    acc.p += it.p;
    acc.c += it.c;
    acc.g += it.g;
    return acc;
  }, { p: 0, c: 0, g: 0 });
  const adj = { p: target.p / Math.max(total.p, 1), c: target.c / Math.max(total.c, 1), g: target.g / Math.max(total.g, 1) };
  const mult = Math.max(Math.min(adj.p, adj.c, adj.g), 0.5);
  items = items.map((it) => ({
    nombre: it.nombre,
    cantidad: Math.round(it.gramos * mult),
  }));
  return { meal, items };
}

export function buildDailyPlan({ macrosObjetivo, restricciones, dayIndex = 0, prefs }) {
  const desayuno = buildMealSuggestionVar({ meal: 'desayuno', macrosObjetivo, restricciones, dayIndex, prefs });
  const almuerzo = buildMealSuggestionVar({ meal: 'almuerzo', macrosObjetivo, restricciones, dayIndex, prefs });
  const cena = buildMealSuggestionVar({ meal: 'cena', macrosObjetivo, restricciones, dayIndex, prefs });
  const snack = buildMealSuggestionVar({ meal: 'snack', macrosObjetivo, restricciones, dayIndex, prefs });
  return { desayuno, almuerzo, cena, snack };
}

export function buildWeeklyPlan({ macrosObjetivo, restricciones, prefs }) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(buildDailyPlan({ macrosObjetivo, restricciones, dayIndex: i, prefs }));
  }
  return days;
}

export function buildShoppingList(weeklyPlan) {
  const acc = new Map();
  for (const day of weeklyPlan) {
    for (const k of ['desayuno', 'almuerzo', 'cena', 'snack']) {
      const items = day[k]?.items || [];
      for (const it of items) {
        const key = it.nombre;
        acc.set(key, (acc.get(key) || 0) + (it.cantidad || 0));
      }
    }
  }
  return Array.from(acc.entries()).map(([nombre, totalGramos]) => ({ nombre, totalGramos: Math.round(totalGramos) }));
}

function stepsForFood(nombre) {
  const n = String(nombre).toLowerCase();
  if (n.includes('pechuga de pollo') || n.includes('pavo')) {
    return ['Sazonar con sal y pimienta (2 min)', 'Plancha medio-alto 4 min por lado (8 min)', 'Reposar 2 min'];
  }
  if (n.includes('tilapia') || n.includes('merluza') || n.includes('reineta') || n.includes('trucha')) {
    return ['Sazonar (2 min)', 'Plancha 3–4 min por lado o horno 180°C 10–12 min'];
  }
  if (n.includes('atún')) {
    return ['Abrir y escurrir lata (1 min)', 'Mezclar con zumo de limón y pimienta (2 min)'];
  }
  if (n.includes('salmón')) {
    return ['Sazonar (2 min)', 'Horno 180°C 12–15 min o plancha 4–5 min por lado'];
  }
  if (n.includes('huevo') && !n.includes('clara')) {
    return ['Batir (1 min)', 'Sartén antiadherente 4–5 min a fuego medio'];
  }
  if (n.includes('claras')) {
    return ['Batir (30 s)', 'Sartén antiadherente 3–4 min a fuego medio'];
  }
  if (n.includes('tofu')) {
    return ['Prensar 10 min', 'Cortar y saltear 6–8 min con especias'];
  }
  if (n.includes('arroz integral')) {
    return ['Lavar 2 min', 'Cocción 35–40 min en 2:1 agua:arroz'];
  }
  if (n.includes('quinoa')) {
    return ['Enjuagar 2 min', 'Cocción 15 min en 2:1 agua:quinoa'];
  }
  if (n.includes('quinua')) {
    return ['Enjuagar 2 min', 'Cocción 15–18 min en 2:1 agua:quinua'];
  }
  if (n.includes('papa')) {
    return ['Lavar 1 min', 'Hervir 20 min hasta tierno', 'Enfriar y pelar 2 min'];
  }
  if (n.includes('camote') || n.includes('batata')) {
    return ['Lavar 1 min', 'Hervir/hornear 25–30 min hasta tierno'];
  }
  if (n.includes('tortilla de maíz')) {
    return ['Calentar en comal/sartén 1–2 min por lado'];
  }
  if (n.includes('arepa')) {
    return ['Tostar a plancha 4–5 min por lado o calentar 8–10 min en horno 180°C'];
  }
  if (n.includes('frijoles')) {
    return ['Si son cocidos envasados, calentar 5–7 min a fuego bajo; sazonar al gusto'];
  }
  if (n.includes('lentejas')) {
    return ['Hervir en agua 20–25 min hasta tiernas; escurrir y sazonar'];
  }
  if (n.includes('yuca')) {
    return ['Hervir 25–30 min con sal; retirar fibras centrales; servir'];
  }
  if (n.includes('avena')) {
    return ['Hervir en agua/leche 5–6 min, remover'];
  }
  if (n.includes('aguacate')) {
    return ['Abrir, retirar pulpa y laminar (2 min)'];
  }
  if (n.includes('brócoli') || n.includes('espinaca') || n.includes('zanahoria') || n.includes('pimentón')) {
    return ['Lavar 2 min', 'Cortar 3 min', 'Vapor/saltear 5–7 min al dente'];
  }
  return ['Preparar y porcionar (5–10 min)'];
}

export function buildDailyPlanDetailed({ macrosObjetivo, restricciones, prefs, dayIndex = 0 }) {
  const d = buildDailyPlan({ macrosObjetivo, restricciones, dayIndex, prefs });
  const meals = ['desayuno', 'almuerzo', 'cena', 'snack'];
  const detailed = {};
  for (const m of meals) {
    const items = d[m]?.items || [];
    const pasos = [];
    let tiempoTotal = 0;
    for (const it of items) {
      const st = stepsForFood(it.nombre);
      pasos.push(`${it.nombre}: ${st.join(' • ')}`);
      for (const s of st) {
        const match = s.match(/(\d+)\s*min/);
        if (match) tiempoTotal += Number(match[1] || 0);
      }
    }
    detailed[m] = { items, pasos, tiempoTotal };
  }
  return detailed;
}
