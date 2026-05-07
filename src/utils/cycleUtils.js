/**
 * Utilidades para manejar los 13 ciclos de 28 días (364 días anuales)
 */

export const CYCLES_DATA = [
  { id: 1, name: 'Ciclo 1', startDate: '2026-12-14', label: 'Vacacional' },
  { id: 2, name: 'Ciclo 2', startDate: '2026-01-12' },
  { id: 3, name: 'Ciclo 3', startDate: '2026-02-09' },
  { id: 4, name: 'Ciclo 4', startDate: '2026-03-09' },
  { id: 5, name: 'Ciclo 5', startDate: '2026-04-06' },
  { id: 6, name: 'Ciclo 6', startDate: '2026-05-04' },
  { id: 7, name: 'Ciclo 7', startDate: '2026-06-01' },
  { id: 8, name: 'Ciclo 8', startDate: '2026-06-29' },
  { id: 9, name: 'Ciclo 9', startDate: '2026-07-27' },
  { id: 10, name: 'Ciclo 10', startDate: '2026-08-24' },
  { id: 11, name: 'Ciclo 11', startDate: '2026-09-21' },
  { id: 12, name: 'Ciclo 12', startDate: '2026-10-19' },
  { id: 13, name: 'Ciclo 13', startDate: '2026-11-16' },
];

export const getCycleByDate = (date = new Date()) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Lógica para encontrar en qué ciclo cae una fecha
  // Por ahora devolvemos la lista para que el admin pueda elegir
  return CYCLES_DATA;
};

export const formatCycleDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
};
