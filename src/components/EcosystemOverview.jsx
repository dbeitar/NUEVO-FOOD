import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';

function hasRole(user, roles) {
  const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.rol].filter(Boolean);
  return roles.some((role) => userRoles.includes(role));
}

export default function EcosystemOverview() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const resp = await api.get('/ecosystem/overview');
        setData(resp.data?.data || null);
      } catch {
        setError('No se pudo cargar el ecosistema modular.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const modules = data?.modules || [];
  const brands = data?.brands || [];
  const d28d = useMemo(() => brands.find((brand) => brand.is_d28d), [brands]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-2xl font-bold text-stone-900">Ecosistema Modular</h2>
        <p className="text-sm text-stone-600 mt-1">Control de marcas blancas, modulos independientes, roles multiples y permisos por funcion.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Array.isArray(user?.roles) ? user.roles : [user?.rol]).filter(Boolean).map((role) => (
            <span key={role} className="rounded-full bg-stone-100 text-stone-700 px-3 py-1 text-xs font-semibold">{role}</span>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-stone-500">Cargando ecosistema...</div>
      ) : (
        <>
          <section className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
            {modules.map((module) => (
              <div key={module.id} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500 font-semibold">{module.locked ? 'Bloqueado' : 'Editable'}</div>
                <h3 className="text-lg font-bold text-stone-900 mt-2">{module.name}</h3>
                <p className="text-sm text-stone-600 mt-2">{module.description}</p>
                <div className="mt-3 text-xs text-stone-500">Compatible: {module.compatible_modules.join(', ')}</div>
              </div>
            ))}
          </section>

          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-xl font-bold text-stone-900">Marcas blancas</h3>
              <p className="text-sm text-stone-600">D28D opera como marca y como modulo especial protegido.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-[0.16em] text-stone-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Marca</th>
                    <th className="px-4 py-3 text-left">Slug</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-left">Modulos</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((brand) => (
                    <tr key={brand.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-semibold text-stone-900">{brand.brand_name || brand.nombre}</td>
                      <td className="px-4 py-3 text-stone-600">/{brand.brand_slug}</td>
                      <td className="px-4 py-3 text-stone-600">{brand.plan_id || 'Sin plan'}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {Object.entries(brand.module_access || {}).filter(([, enabled]) => enabled).map(([key]) => key).join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${brand.is_d28d ? 'bg-black text-white' : 'bg-lime-100 text-lime-800'}`}>
                          {brand.is_d28d ? 'D28D protegido' : 'Gym marca blanca'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {d28d && (
            <section className="bg-stone-950 text-white rounded-lg p-5">
              <h3 className="text-xl font-bold">Regla D28D</h3>
              <p className="text-stone-300 mt-2">Los gimnasios usan calendario, clases y plantillas D28D con su propia marca, pero el contenido permanece bloqueado y solo lo edita D28D.</p>
            </section>
          )}

          {hasRole(user, ['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d', 'entrenador']) && (
            <section className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-xl font-bold text-stone-900">Siguiente capa</h3>
              <p className="text-sm text-stone-600 mt-2">Separar maestros por entrenador: galerias, rutinas, parametros nutricionales y usuarios asignados.</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
