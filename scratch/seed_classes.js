import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const classesPath = path.join(__dirname, '../backend/data/live_classes.json');

// Helper to get next Monday
function getNextMonday() {
  const d = new Date();
  const day = d.getDay();
  // d.getDate() might wrap around months, setDate handles it
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  const result = new Date(d);
  result.setDate(diff);
  return result;
}

const monday = getNextMonday();

function createClass(title, instructor, dayOffset, hour, minute, duration) {
  const start = new Date(monday);
  start.setDate(monday.getDate() + dayOffset);
  start.setHours(hour, minute, 0, 0);
  
  const end = new Date(start);
  end.setMinutes(start.getMinutes() + duration);

  return {
    id: Math.floor(Math.random() * 1000000),
    title: title,
    description: instructor,
    zoom_link: 'https://zoom.us/j/d28dvital',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    program_id: 'vital',
    is_global: true,
    active: true
  };
}

const exampleClasses = [
  // Lunes
  createClass('Entrenamiento Funcional', 'Meli', 0, 6, 0, 40),
  createClass('Entrenamiento Funcional', 'Alejo', 0, 18, 0, 40),
  
  // Miercoles
  createClass('Entrenamiento Funcional', 'Meli/Alejo', 2, 6, 0, 40),
  createClass('Entrenamiento Funcional', 'Alejo', 2, 18, 0, 40),
  createClass('Rumba D28D', 'Angie', 2, 19, 0, 60),

  // Jueves
  createClass('Entrenamiento Funcional', 'Meli', 3, 6, 0, 40),
  createClass('Entrenamiento Funcional', 'Maria', 3, 18, 0, 40),
];

fs.writeFileSync(classesPath, JSON.stringify(exampleClasses, null, 2));
console.log('Seed completed: 7 example classes added for the next week.');
