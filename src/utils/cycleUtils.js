/**
 * Utilidades de ciclos D28D.
 *
 * Los ciclos viven en backend (`/api/cycles`). Esta utilidad solo
 * expone helpers de formato y un fallback estático para los componentes
 * que aún no leen del API. El listado real DEBE obtenerse vía
 * `GET /api/cycles`.
 */

// Fallback estático SOLO para SSR / primer paint si el backend no
// responde. La fuente de verdad es la BD del backend (cycles.json).
export const CYCLES_DATA = [
  { id: 1,  name: 'Ciclo 1',  startDate: '2026-12-14', label: 'Vacacional' },
  { id: 2,  name: 'Ciclo 2',  startDate: '2026-01-12', label: '' },
  { id: 3,  name: 'Ciclo 3',  startDate: '2026-02-09', label: '' },
  { id: 4,  name: 'Ciclo 4',  startDate: '2026-03-09', label: '' },
  { id: 5,  name: 'Ciclo 5',  startDate: '2026-04-06', label: '' },
  { id: 6,  name: 'Ciclo 6',  startDate: '2026-05-04', label: '' },
  { id: 7,  name: 'Ciclo 7',  startDate: '2026-06-01', label: '' },
  { id: 8,  name: 'Ciclo 8',  startDate: '2026-06-29', label: '' },
  { id: 9,  name: 'Ciclo 9',  startDate: '2026-07-27', label: '' },
  { id: 10, name: 'Ciclo 10', startDate: '2026-08-24', label: '' },
  { id: 11, name: 'Ciclo 11', startDate: '2026-09-21', label: '' },
  { id: 12, name: 'Ciclo 12', startDate: '2026-10-19', label: '' },
  { id: 13, name: 'Ciclo 13', startDate: '2026-11-16', label: '' },
];

export const getCycleByDate = () => CYCLES_DATA;

export const formatCycleDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
};

// Calcula la fecha de fin de un ciclo (28 días desde startDate).
export const computeCycleEnd = (startDate) => {
  if (!startDate) return null;
  const d = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 27);
  return d.toISOString().slice(0, 10);
};
