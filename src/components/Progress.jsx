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
        const d = new Date().toISOString().split('T')[0];
        const resp = await api.get('/food-log/totals', { params: { fecha: d } });
        setDayTotals(resp.data?.data || null);
      } catch {}
    })();
  }, []);

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
