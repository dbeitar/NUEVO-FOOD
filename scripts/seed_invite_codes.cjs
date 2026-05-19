#!/usr/bin/env node
/**
 * Asigna invite_code a gimnasios y entrenadores para el flujo de registro.
 */
const path = require('path');
const BACKEND = path.resolve(__dirname, '..', 'backend');
const JsonStore = require(path.join(BACKEND, 'src/utils/JsonStore'));

const gymStore = new JsonStore('gyms.json', []);
const trainerStore = new JsonStore('trainers.json', []);

const gymCodes = {
  1: 'GYM-PRO-001',
  2: 'GYM-HUB-002',
  4: 'GYM-D28D-004',
  5: 'GYM-JABEL-005',
};

const trainerCodes = {
  1: 'COACH-CARLOS-001',
  2: 'COACH-MARIA-002',
  3: 'COACH-JUAN-003',
};

let g = 0;
let t = 0;
for (const gym of gymStore.getAll()) {
  if (gymCodes[gym.id]) {
    gym.invite_code = gymCodes[gym.id];
    g++;
  }
}
for (const tr of trainerStore.getAll()) {
  if (trainerCodes[tr.id]) {
    tr.invite_code = trainerCodes[tr.id];
    t++;
  } else if (!tr.invite_code) {
    tr.invite_code = `COACH-${String(tr.id).padStart(3, '0')}`;
    t++;
  }
}
gymStore.setAll(gymStore.getAll());
trainerStore.setAll(trainerStore.getAll());
console.log(`Códigos asignados: ${g} gimnasios, ${t} entrenadores. D28D: D28D-PILOTO`);
