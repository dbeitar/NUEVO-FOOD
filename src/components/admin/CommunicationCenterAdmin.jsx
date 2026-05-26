import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { buildWaMeUrl } from '../../utils/whatsappSupport';

const TABS = [
  { id: 'templates', label: 'Plantillas' },
  { id: 'events', label: 'Eventos' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'audit', label: 'Auditoría' },
  { id: 'email', label: 'Email' },
];

const EVENT_OPTIONS = [
  'user.registered',
  'payment.approved',
  'payment.rejected',
  'd28d.class.scheduled',
  'd28d.class.time_changed',
  'cycle.started',
  'license.expiring',
  'license.expired',
  'license.reactivated',
  'training.assigned',
  'support.whatsapp.click',
];

const CHANNEL_OPTIONS = ['in_app', 'email', 'whatsapp_link'];

const EMPTY_TPL = {
  nombre: '',
  evento: 'user.registered',
  modulo: 'd28d',
  canal: 'in_app',
  asunto: '',
  contenido: '',
  activo: true,
  editable: true,
  orden: 0,
};

export default function CommunicationCenterAdmin({ onBack }) {
  const [tab, setTab] = useState('templates');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState({ total: 0, data: [] });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tplForm, setTplForm] = useState(EMPTY_TPL);
  const [editingTplId, setEditingTplId] = useState(null);
  const [showTplForm, setShowTplForm] = useState(false);

  const [logFilters, setLogFilters] = useState({ evento: '', modulo: '', canal: '' });
  const [editingPlan, setEditingPlan] = useState(null);
  const [waForm, setWaForm] = useState({
    support_whatsapp: '573192635819',
    support_name: 'Soporte D28D',
    support_message: '',
    support_activo: true,
  });

  const [emailTest, setEmailTest] = useState({ to: '', evento: 'user.registered', modulo: 'd28d' });
  const [emailTestResult, setEmailTestResult] = useState(null);

  const loadTemplates = useCallback(async () => {
    const res = await api.get('/communications/templates');
    setTemplates(res.data?.data || []);
  }, []);

  const loadLogs = useCallback(async (filters = logFilters) => {
    const params = { limit: 100 };
    if (filters.evento) params.evento = filters.evento;
    if (filters.modulo) params.modulo = filters.modulo;
    if (filters.canal) params.canal = filters.canal;
    const res = await api.get('/communications/logs', { params });
    setLogs(res.data?.data || { total: 0, data: [] });
  }, [logFilters]);

  const loadPlans = useCallback(async () => {
    const res = await api.get('/accounts/plans');
    setPlans(Array.isArray(res.data) ? res.data : []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadTemplates(), loadLogs(), loadPlans()]);
    } catch (e) {
      setError(e.response?.data?.error || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [loadTemplates, loadLogs, loadPlans]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredLogs = useMemo(() => logs.data || [], [logs]);

  const saveTemplate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingTplId) {
        await api.put(`/communications/templates/${editingTplId}`, tplForm);
      } else {
        await api.post('/communications/templates', tplForm);
      }
      setShowTplForm(false);
      setEditingTplId(null);
      setTplForm(EMPTY_TPL);
      setMessage('Plantilla guardada');
      await loadTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Error guardando plantilla');
    }
  };

  const editTemplate = (t) => {
    setEditingTplId(t.id);
    setTplForm({
      nombre: t.nombre,
      evento: t.evento,
      modulo: t.modulo,
      canal: t.canal,
      asunto: t.asunto || '',
      contenido: t.contenido,
      activo: t.activo !== false,
      editable: t.editable !== false,
      orden: t.orden || 0,
    });
    setShowTplForm(true);
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('¿Eliminar plantilla?')) return;
    try {
      await api.delete(`/communications/templates/${id}`);
      await loadTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar');
    }
  };

  const startEditPlanWa = (plan) => {
    setEditingPlan(plan);
    setWaForm({
      support_whatsapp: plan.support_whatsapp || '573192635819',
      support_name: plan.support_name || 'Soporte D28D',
      support_message: plan.support_message || '',
      support_activo: plan.support_activo !== false,
    });
  };

  const savePlanWa = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      await api.put(`/accounts/plans/${encodeURIComponent(editingPlan.nombre)}`, waForm);
      setMessage('WhatsApp del plan actualizado');
      setEditingPlan(null);
      await loadPlans();
    } catch (err) {
      setError(err.response?.data?.error || 'Error guardando WhatsApp');
    }
  };

  const previewUrl = buildWaMeUrl(waForm.support_whatsapp, waForm.support_message);

  const sendTestEmail = async (e) => {
    e.preventDefault();
    setError('');
    setEmailTestResult(null);
    try {
      const res = await api.post('/communications/email/test', emailTest);
      setEmailTestResult(res.data?.data || null);
      setMessage('Email de prueba enviado (ver auditoría/logs)');
    } catch (err) {
      setError(err.response?.data?.error || 'Error enviando email de prueba');
    }
  };

  return (
    <div className="dashboard-main-view space-y-6">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" className="btn-secondary" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Volver
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <MessageCircle className="w-7 h-7 text-lime-600" />
              Centro de Comunicación
            </h2>
            <p className="text-sm text-stone-600">Plantillas, eventos, WhatsApp (wa.me) y auditoría.</p>
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={refresh}>Actualizar</button>
      </header>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="bg-lime-50 border border-lime-200 text-lime-800 p-3 rounded-xl text-sm">{message}</div>}

      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === t.id ? 'bg-lime-600 text-white' : 'bg-stone-100 text-stone-700'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-stone-500">Cargando…</p>
      ) : (
        <>
          {tab === 'templates' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-stone-900">Plantillas</h3>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-1"
                  onClick={() => {
                    setEditingTplId(null);
                    setTplForm(EMPTY_TPL);
                    setShowTplForm(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> Nueva
                </button>
              </div>

              {showTplForm && (
                <form onSubmit={saveTemplate} className="card grid md:grid-cols-2 gap-4">
                  <input className="input" placeholder="Nombre" required value={tplForm.nombre}
                    onChange={(e) => setTplForm({ ...tplForm, nombre: e.target.value })} />
                  <select className="input" value={tplForm.evento}
                    onChange={(e) => setTplForm({ ...tplForm, evento: e.target.value })}>
                    {EVENT_OPTIONS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
                  </select>
                  <select className="input" value={tplForm.modulo}
                    onChange={(e) => setTplForm({ ...tplForm, modulo: e.target.value })}>
                    <option value="d28d">d28d</option>
                    <option value="food">food</option>
                    <option value="training">training</option>
                  </select>
                  <select className="input" value={tplForm.canal}
                    onChange={(e) => setTplForm({ ...tplForm, canal: e.target.value })}>
                    {CHANNEL_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input className="input md:col-span-2" placeholder="Asunto" value={tplForm.asunto}
                    onChange={(e) => setTplForm({ ...tplForm, asunto: e.target.value })} />
                  <textarea className="input md:col-span-2" rows={4} placeholder="Contenido" required
                    value={tplForm.contenido}
                    onChange={(e) => setTplForm({ ...tplForm, contenido: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={tplForm.activo}
                      onChange={(e) => setTplForm({ ...tplForm, activo: e.target.checked })} />
                    Activo
                  </label>
                  <input type="number" className="input" placeholder="Orden" value={tplForm.orden}
                    onChange={(e) => setTplForm({ ...tplForm, orden: Number(e.target.value) })} />
                  <div className="md:col-span-2 flex gap-2">
                    <button type="submit" className="btn-primary">Guardar</button>
                    <button type="button" className="btn-secondary" onClick={() => setShowTplForm(false)}>Cancelar</button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto card p-0">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Nombre</th>
                      <th className="px-4 py-3 text-left">Evento</th>
                      <th className="px-4 py-3 text-left">Módulo</th>
                      <th className="px-4 py-3 text-left">Canal</th>
                      <th className="px-4 py-3 text-left">Activo</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((t) => (
                      <tr key={t.id} className="border-t border-stone-100">
                        <td className="px-4 py-3">{t.nombre}</td>
                        <td className="px-4 py-3 font-mono text-xs">{t.evento}</td>
                        <td className="px-4 py-3">{t.modulo}</td>
                        <td className="px-4 py-3">{t.canal}</td>
                        <td className="px-4 py-3">{t.activo ? 'Sí' : 'No'}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button type="button" className="btn-secondary text-xs" onClick={() => editTemplate(t)}>
                            <Pencil className="w-3 h-3 inline" />
                          </button>
                          <button type="button" className="btn-secondary text-xs text-red-600" onClick={() => deleteTemplate(t.id)}>
                            <Trash2 className="w-3 h-3 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'events' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <select className="input w-auto" value={logFilters.evento}
                  onChange={(e) => setLogFilters((f) => ({ ...f, evento: e.target.value }))}>
                  <option value="">Todos los eventos</option>
                  {EVENT_OPTIONS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
                </select>
                <select className="input w-auto" value={logFilters.modulo}
                  onChange={(e) => setLogFilters((f) => ({ ...f, modulo: e.target.value }))}>
                  <option value="">Todos los módulos</option>
                  <option value="d28d">d28d</option>
                  <option value="food">food</option>
                  <option value="training">training</option>
                </select>
                <button type="button" className="btn-secondary" onClick={() => loadLogs(logFilters)}>Filtrar</button>
              </div>
              <p className="text-sm text-stone-600">Total: {logs.total ?? 0}</p>
              <div className="overflow-x-auto card p-0">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Evento</th>
                      <th className="px-4 py-3 text-left">Canal</th>
                      <th className="px-4 py-3 text-left">Usuario</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Módulo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((row) => (
                      <tr key={row.id} className="border-t border-stone-100">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{row.evento}</td>
                        <td className="px-4 py-3">{row.canal}</td>
                        <td className="px-4 py-3">{row.userId || '—'}</td>
                        <td className="px-4 py-3">{row.estado}</td>
                        <td className="px-4 py-3">{row.modulo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'whatsapp' && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Número global por defecto: <strong>+57 319 263 5819</strong> (wa.me/573192635819)
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="card space-y-2 max-h-96 overflow-y-auto">
                  <h4 className="font-semibold">Planes</h4>
                  {plans.map((p) => (
                    <button
                      key={p.nombre}
                      type="button"
                      className={`w-full text-left p-3 rounded-lg border ${
                        editingPlan?.nombre === p.nombre ? 'border-lime-500 bg-lime-50' : 'border-stone-200'
                      }`}
                      onClick={() => startEditPlanWa(p)}
                    >
                      <p className="font-medium text-sm">{p.nombre}</p>
                      <p className="text-xs text-stone-500">{p.kind} · {p.program_id}</p>
                    </button>
                  ))}
                </div>
                {editingPlan && (
                  <form onSubmit={savePlanWa} className="card space-y-3">
                    <h4 className="font-semibold">Editar: {editingPlan.nombre}</h4>
                    <input className="input" placeholder="WhatsApp (+573...)" value={waForm.support_whatsapp}
                      onChange={(e) => setWaForm({ ...waForm, support_whatsapp: e.target.value })} />
                    <input className="input" placeholder="Nombre soporte" value={waForm.support_name}
                      onChange={(e) => setWaForm({ ...waForm, support_name: e.target.value })} />
                    <textarea className="input" rows={3} placeholder="Mensaje precargado" value={waForm.support_message}
                      onChange={(e) => setWaForm({ ...waForm, support_message: e.target.value })} />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={waForm.support_activo}
                        onChange={(e) => setWaForm({ ...waForm, support_activo: e.target.checked })} />
                      Activo
                    </label>
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="text-lime-700 text-sm underline">
                      Probar enlace wa.me
                    </a>
                    <button type="submit" className="btn-primary w-full">Guardar plan</button>
                  </form>
                )}
              </div>
            </div>
          )}

          {tab === 'audit' && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Registro unificado: emails (log), notificaciones internas, clics WhatsApp y errores.
              </p>
              <div className="overflow-x-auto card p-0">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Evento</th>
                      <th className="px-4 py-3 text-left">Canal</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Mensaje</th>
                      <th className="px-4 py-3 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((row) => (
                      <tr key={`a-${row.id}`} className="border-t border-stone-100">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{row.evento}</td>
                        <td className="px-4 py-3">{row.canal}</td>
                        <td className="px-4 py-3">{row.estado}</td>
                        <td className="px-4 py-3 max-w-xs truncate">{row.message || '—'}</td>
                        <td className="px-4 py-3 text-red-600 text-xs">{row.error || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'email' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-stone-900">Configuración Email (Shell)</h3>
              <p className="text-sm text-stone-600">
                El envío real se configura por variables de entorno del backend (`MAIL_PROVIDER`, SMTP o API keys).
                Esta pantalla solo permite enviar un email de prueba usando una plantilla activa del evento.
              </p>

              <form onSubmit={sendTestEmail} className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-stone-600 font-medium">Destino (to)</label>
                    <input
                      className="input w-full"
                      value={emailTest.to}
                      onChange={(e) => setEmailTest((p) => ({ ...p, to: e.target.value }))}
                      placeholder="correo@dominio.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-600 font-medium">Evento</label>
                    <select
                      className="input w-full"
                      value={emailTest.evento}
                      onChange={(e) => setEmailTest((p) => ({ ...p, evento: e.target.value }))}
                    >
                      {EVENT_OPTIONS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-stone-600 font-medium">Módulo</label>
                    <select
                      className="input w-full"
                      value={emailTest.modulo}
                      onChange={(e) => setEmailTest((p) => ({ ...p, modulo: e.target.value }))}
                    >
                      <option value="d28d">d28d</option>
                      <option value="training">training</option>
                      <option value="food">food</option>
                      <option value="platform">platform</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-primary">Enviar email de prueba</button>
              </form>

              {emailTestResult && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm">
                  <div className="font-semibold text-stone-900 mb-2">Resultado</div>
                  <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(emailTestResult, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
