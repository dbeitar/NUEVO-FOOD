import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AISuggestions from './AISuggestions';
import './FoodLog.css';

export default function Progress() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [plan, setPlan] = useState({ calorias: 2000, proteina: 150, carbohidratos: 250, grasas: 65 });
  const [history, setHistory] = useState({});
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    return monday.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(today);
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [selectedGym, setSelectedGym] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [dayTotals, setDayTotals] = useState(null);
  const [aggGyms, setAggGyms] = useState({});
  const [aggTrainers, setAggTrainers] = useState({});
  const [aggTab, setAggTab] = useState('gyms');
  const [gymsPage, setGymsPage] = useState(1);
  const [gymsSize, setGymsSize] = useState(5);
  const [trainersPage, setTrainersPage] = useState(1);
  const [trainersSize, setTrainersSize] = useState(5);
  const [gymsFilter, setGymsFilter] = useState('');
  const [trainersFilter, setTrainersFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/plan/mine');
        if (r.data?.success && r.data.data) {
          setPlan(r.data.data);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/food-log/history', { params: { days: 30 } });
        setHistory(r.data?.data || {});
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [gy, tr] = await Promise.all([
          api.get('/gyms'),
          api.get('/trainers'),
        ]);
        setGyms(gy.data?.data || []);
        setTrainers(tr.data?.data || []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const q = { params: { start: startDate, end: endDate } };
        const [byGym, byTrainer] = await Promise.all([
          api.get('/food-log/aggregate/by-gym', q),
          api.get('/food-log/aggregate/by-trainer', q),
        ]);
        setAggGyms(byGym.data?.gyms || {});
        setAggTrainers(byTrainer.data?.trainers || {});
      } catch {
        setAggGyms({});
        setAggTrainers({});
      }
    })();
  }, [startDate, endDate]);

  const rangeList = useMemo(() => {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (s > e) return [];
      const keys = Object.keys(history).sort();
      return keys
        .filter((d) => {
          const x = new Date(d);
          return x >= new Date(startDate) && x <= new Date(endDate);
        })
        .map((d) => ({ date: d, totals: history[d] || null }));
    } catch {
      return [];
    }
  }, [startDate, endDate, history]);

  const kpis = useMemo(() => {
    const items = rangeList.map((x) => x.totals).filter(Boolean);
    if (items.length === 0) {
      return { días: 0, calorías: 0, proteína: 0, carbs: 0, grasas: 0, cumplimiento: 0 };
    }
    const sum = items.reduce(
      (acc, t) => ({
        calorias: acc.calorias + (t.totalCalorias || 0),
        proteina: acc.proteina + (t.totalProteina || 0),
        carbohidratos: acc.carbohidratos + (t.totalCarbohidratos || 0),
        grasas: acc.grasas + (t.totalGrasas || 0),
      }),
      { calorias: 0, proteina: 0, carbohidratos: 0, grasas: 0 }
    );
    const avg = {
      calorias: sum.calorias / items.length,
      proteina: sum.proteina / items.length,
      carbohidratos: sum.carbohidratos / items.length,
      grasas: sum.grasas / items.length,
    };
    const cumplimiento =
      Math.min((avg.calorias / plan.calorias) * 100, 100) * 0.4 +
      Math.min((avg.proteina / plan.proteina) * 100, 100) * 0.2 +
      Math.min((avg.carbohidratos / plan.carbohidratos) * 100, 100) * 0.2 +
      Math.min((avg.grasas / plan.grasas) * 100, 100) * 0.2;
    return {
      días: items.length,
      calorías: Math.round(avg.calorias),
      proteína: Math.round(avg.proteina),
      carbs: Math.round(avg.carbohidratos),
      grasas: Math.round(avg.grasas),
      cumplimiento: Math.round(cumplimiento),
    };
  }, [rangeList, plan]);

  const daysCount = Math.max(kpis.días || 0, 1);
  const planCalories = Math.max(plan?.calorias || 0, 1);
  const topGyms = (() => {
    const items = Object.entries(aggGyms || {}).map(([gid, t]) => {
      const g = gyms.find((x) => String(x.id) === String(gid));
      const name = g?.nombre || `Gimnasio ${gid}`;
      const pct = Math.min(((t.totalCalorias || 0) / (planCalories * daysCount)) * 100, 999);
      return { id: gid, name, kcal: Math.round(t.totalCalorias || 0), pct: Math.round(pct) };
    });
    return items.sort((a, b) => b.pct - a.pct);
  })();
  const topTrainers = (() => {
    const items = Object.entries(aggTrainers || {}).map(([tid, t]) => {
      const tr = trainers.find((x) => String(x.id) === String(tid));
      const name = tr?.nombre || `Entrenador ${tid}`;
      const pct = Math.min(((t.totalCalorias || 0) / (planCalories * daysCount)) * 100, 999);
      return { id: tid, name, kcal: Math.round(t.totalCalorias || 0), pct: Math.round(pct) };
    });
    return items.sort((a, b) => b.pct - a.pct);
  })();
  const gymsTotalPages = Math.max(1, Math.ceil(topGyms.length / gymsSize));
  const trainersTotalPages = Math.max(1, Math.ceil(topTrainers.length / trainersSize));
  const gymsFiltered = topGyms.filter((g) => g.name.toLowerCase().includes((gymsFilter || '').toLowerCase()));
  const trainersFiltered = topTrainers.filter((t) => t.name.toLowerCase().includes((trainersFilter || '').toLowerCase()));
  const pageGymsData = gymsFiltered.slice((gymsPage - 1) * gymsSize, gymsPage * gymsSize);
  const pageTrainersData = trainersFiltered.slice((trainersPage - 1) * trainersSize, trainersPage * trainersSize);
  const weekly = (() => {
    const sorted = [...rangeList].sort((a, b) => new Date(a.date) - new Date(b.date));
    const last7 = sorted.slice(-7);
    return last7.map((d) => {
      const kcal = Math.round(d.totals?.totalCalorias || 0);
      const pct = Math.min(((kcal || 0) / planCalories) * 100, 100);
      return { fecha: d.date, kcal, pct: Math.round(pct) };
    });
  })();
  const exportCsv = (filename, rows) => {
    const header = 'Nombre,Cumplimiento,Kcal\n';
    const body = rows.map((r) => `${r.name},${r.pct}%,${r.kcal}`).join('\n');
    const csv = header + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const exportBothCsv = (filename) => {
    const header = 'Tipo,Nombre,Cumplimiento,Kcal\n';
    const gBody = topGyms.map((r) => `Gimnasio,${r.name},${r.pct}%,${r.kcal}`).join('\n');
    const tBody = topTrainers.map((r) => `Entrenador,${r.name},${r.pct}%,${r.kcal}`).join('\n');
    const csv = header + [gBody, tBody].filter(Boolean).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    (async () => {
      try {
        const d = new Date().toISOString().split('T')[0];
        const resp = await api.get('/food-log/totals', { params: { fecha: d } });
        setDayTotals(resp.data?.data || null);
      } catch {}
    })();
  }, []);

  // moved rangeList and kpis above to avoid temporal dead zone references

  return (
    <div className="food-log-container">
      <div className="page-header">
        <div>
          <h1>Progreso</h1>
          <p className="subtitle">Seguimiento y recomendaciones</p>
        </div>
      </div>

      <div className="two-col-grid lg:grid-cols-3">
        <div className="left-col lg:col-span-2">
          <div className="plan-summary">
            <h2>KPIs del Rango</h2>
            <div className="totals-card">
              <div className="progress-item">
                <label>Cumplimiento promedio</label>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${kpis.cumplimiento}%` }} />
                </div>
                <span>{kpis.cumplimiento}%</span>
              </div>
              <div className="progress-item">
                <label>Calorías promedio</label>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min((kpis.calorías / plan.calorias) * 100, 100)}%` }} />
                </div>
                <span>{kpis.calorías} / {plan.calorias} kcal</span>
              </div>
              <div className="progress-item">
                <label>Proteína promedio</label>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min((kpis.proteína / plan.proteina) * 100, 100)}%` }} />
                </div>
                <span>{kpis.proteína}g / {plan.proteina}g</span>
              </div>
              <div className="progress-item">
                <label>Carbohidratos promedio</label>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min((kpis.carbs / plan.carbohidratos) * 100, 100)}%` }} />
                </div>
                <span>{kpis.carbs}g / {plan.carbohidratos}g</span>
              </div>
              <div className="progress-item">
                <label>Grasas promedio</label>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min((kpis.grasas / plan.grasas) * 100, 100)}%` }} />
                </div>
                <span>{kpis.grasas}g / {plan.grasas}g</span>
              </div>
            </div>
          </div>

          <div className="range-card">
            <h2>Rango y Filtros</h2>
            <div className="range-grid">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Inicio</label>
                <input type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 rounded-2xl border border-slate-300" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Fin</label>
                <input type="date" value={endDate} min={startDate} max={today} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 rounded-2xl border border-slate-300" />
              </div>
            </div>
            {(user?.rol === 'super_admin' || user?.rol === 'admin_gimnasio' || user?.rol === 'entrenador') && (
              <div className="range-grid" style={{ marginTop: 12 }}>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">Gimnasio</label>
                  <select value={selectedGym} onChange={(e) => setSelectedGym(e.target.value)} className="w-full px-4 py-2 rounded-2xl border border-slate-300">
                    <option value="">Todos</option>
                    {gyms.map((g) => <option key={g.id} value={g.id}>{g.nombre || `Gym ${g.id}`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">Entrenador</label>
                  <select value={selectedTrainer} onChange={(e) => setSelectedTrainer(e.target.value)} className="w-full px-4 py-2 rounded-2xl border border-slate-300">
                    <option value="">Todos</option>
                    {trainers
                      .filter((t) => !selectedGym || String(t.gymId) === String(selectedGym))
                      .map((t) => <option key={t.id} value={t.id}>{t.nombre || `Entrenador ${t.id}`}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="weekly-card">
            <h2>Avance por Día</h2>
            <div className="space-y-2">
              {rangeList.length === 0 ? (
                <p className="text-sm text-stone-600">Sin datos en el rango.</p>
              ) : (
                rangeList.map(({ date, totals }) => (
                  <div key={date} className="weekly-row">
                    <div className="weekly-date">{date}</div>
                    <div className="weekly-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: totals ? `${Math.min(((totals.totalCalorias || 0) / plan.calorias) * 100, 100)}%` : '0%' }} />
                      </div>
                    </div>
                    <div className="text-sm w-24 text-right">{totals ? Math.round(totals.totalCalorias || 0) : 0} kcal</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {dayTotals && (
            <AISuggestions
              dayTotals={dayTotals}
              targetGoals={{
                calorias: plan.calorias,
                proteina: plan.proteina,
                carbohidratos: plan.carbohidratos,
                grasas: plan.grasas,
              }}
              objetivo="Mantenimiento"
            />
          )}
        </div>

        <div className="right-col lg:col-span-1">
          <div className="plan-summary">
            <h2>Resumen Rápido</h2>
            <ul className="totals-card">
              <li>Días en rango: {kpis.días}</li>
              <li>Calorías promedio: {kpis.calorías} kcal</li>
              <li>Proteína promedio: {kpis.proteína} g</li>
              <li>Carbs promedio: {kpis.carbs} g</li>
              <li>Grasas promedio: {kpis.grasas} g</li>
            </ul>
          </div>

          {(user?.rol === 'super_admin' || user?.rol === 'admin_gimnasio' || user?.rol === 'entrenador') && (
            <div className="plan-summary">
              <h2>Agregados</h2>
              <div className="totals-card">
                <div className="progress-item">
                  <label>Gimnasio seleccionado</label>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          (((selectedGym && aggGyms[selectedGym]?.totalCalorias) || 0) / (plan.calorias * Math.max(kpis.días, 1))) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <span>
                    {selectedGym && aggGyms[selectedGym]
                      ? Math.round(aggGyms[selectedGym].totalCalorias)
                      : 0}{' '}
                    kcal en rango
                  </span>
                </div>
                <div className="progress-item">
                  <label>Entrenador seleccionado</label>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          (((selectedTrainer && aggTrainers[selectedTrainer]?.totalCalorias) || 0) / (plan.calorias * Math.max(kpis.días, 1))) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <span>
                    {selectedTrainer && aggTrainers[selectedTrainer]
                      ? Math.round(aggTrainers[selectedTrainer].totalCalorias)
                      : 0}{' '}
                    kcal en rango
                  </span>
                </div>
              </div>
            </div>
          )}

          {(user?.rol === 'super_admin' || user?.rol === 'admin_gimnasio' || user?.rol === 'entrenador') && (
            <div className="plan-summary">
              <h2>Analítica por Grupos</h2>
              <div className="totals-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-2">
                    <button onClick={() => setAggTab('gyms')}>Gimnasios</button>
                    <button onClick={() => setAggTab('trainers')}>Entrenadores</button>
                  </div>
                  <button onClick={() => exportBothCsv('agregados_rango.csv')}>Exportar ambos CSV</button>
                </div>
                {aggTab === 'gyms' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div>
                        <label className="mr-2 text-sm">Tamaño página</label>
                        <select value={gymsSize} onChange={(e) => { setGymsSize(parseInt(e.target.value, 10)); setGymsPage(1); }}>
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                        </select>
                        </div>
                        <div>
                          <label className="mr-2 text-sm">Buscar</label>
                          <input
                            value={gymsFilter}
                            onChange={(e) => { setGymsFilter(e.target.value); setGymsPage(1); }}
                            placeholder="Nombre de gimnasio"
                          />
                          <button onClick={() => { setGymsFilter(''); setGymsPage(1); }}>Limpiar</button>
                        </div>
                      </div>
                      <button onClick={() => exportCsv('top_gimnasios.csv', topGyms)}>Exportar CSV</button>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">Nombre</th>
                          <th className="text-right">Cumpl.</th>
                          <th className="text-right">Kcal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageGymsData.map((g) => (
                          <tr key={g.id}>
                            <td>{g.name}</td>
                            <td className="text-right">{g.pct}%</td>
                            <td className="text-right">{g.kcal}</td>
                          </tr>
                        ))}
                        {pageGymsData.length === 0 && (
                          <tr>
                            <td colSpan={3}>Sin datos en el rango</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm">Página {gymsPage} de {Math.max(1, Math.ceil(gymsFiltered.length / gymsSize))}</span>
                      <div className="flex gap-2">
                        <button disabled={gymsPage <= 1} onClick={() => setGymsPage((p) => Math.max(1, p - 1))}>Anterior</button>
                        <button
                          disabled={gymsPage >= Math.max(1, Math.ceil(gymsFiltered.length / gymsSize))}
                          onClick={() => setGymsPage((p) => Math.min(Math.max(1, Math.ceil(gymsFiltered.length / gymsSize)), p + 1))}
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {aggTab === 'trainers' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div>
                        <label className="mr-2 text-sm">Tamaño página</label>
                        <select value={trainersSize} onChange={(e) => { setTrainersSize(parseInt(e.target.value, 10)); setTrainersPage(1); }}>
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                        </select>
                        </div>
                        <div>
                          <label className="mr-2 text-sm">Buscar</label>
                          <input
                            value={trainersFilter}
                            onChange={(e) => { setTrainersFilter(e.target.value); setTrainersPage(1); }}
                            placeholder="Nombre de entrenador"
                          />
                          <button onClick={() => { setTrainersFilter(''); setTrainersPage(1); }}>Limpiar</button>
                        </div>
                      </div>
                      <button onClick={() => exportCsv('top_entrenadores.csv', topTrainers)}>Exportar CSV</button>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">Nombre</th>
                          <th className="text-right">Cumpl.</th>
                          <th className="text-right">Kcal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageTrainersData.map((t) => (
                          <tr key={t.id}>
                            <td>{t.name}</td>
                            <td className="text-right">{t.pct}%</td>
                            <td className="text-right">{t.kcal}</td>
                          </tr>
                        ))}
                        {pageTrainersData.length === 0 && (
                          <tr>
                            <td colSpan={3}>Sin datos en el rango</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm">Página {trainersPage} de {Math.max(1, Math.ceil(trainersFiltered.length / trainersSize))}</span>
                      <div className="flex gap-2">
                        <button disabled={trainersPage <= 1} onClick={() => setTrainersPage((p) => Math.max(1, p - 1))}>Anterior</button>
                        <button
                          disabled={trainersPage >= Math.max(1, Math.ceil(trainersFiltered.length / trainersSize))}
                          onClick={() => setTrainersPage((p) => Math.min(Math.max(1, Math.ceil(trainersFiltered.length / trainersSize)), p + 1))}
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="plan-summary">
            <h2>Tendencia semanal</h2>
            <div className="totals-card">
              {weekly.map((d) => (
                <div key={d.fecha} className="progress-item">
                  <label>{d.fecha}</label>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span>{d.kcal} kcal</span>
                </div>
              ))}
              {weekly.length === 0 && <div className="text-sm text-stone-600">Sin datos recientes</div>}
            </div>
          </div>

          <div className="plan-summary">
            <h2>Recomendaciones</h2>
            <p className="text-sm text-stone-600">Basadas en tus consumos recientes y tu plan.</p>
            <p className="text-sm text-stone-700">Revisa “Avance por Día” y el bloque de IA para ver sugerencias de alimentos que te ayuden a cumplir metas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
