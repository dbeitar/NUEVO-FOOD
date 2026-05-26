import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import { detectVideoPlatform, videoUrlToEmbed } from '../utils/videoEmbed';

const emptyForm = () => ({
  name: '',
  muscle_group: '',
  youtube_url: '',
});

const emptyDraft = () => ({
  name: '',
  muscle_group: '',
  youtube_url: '',
});

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  dailymotion: 'Dailymotion',
  video: 'Video',
  enlace: 'Enlace',
  otro: '—',
};

function VideoPreviewModal({ item, onClose }) {
  const embed = videoUrlToEmbed(item?.youtube_url);
  const platform = detectVideoPlatform(item?.youtube_url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-stone-200">
          <div>
            <h3 className="font-bold text-stone-900 text-sm">{item?.name}</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {item?.muscle_group || 'Sin grupo'} · {PLATFORM_LABELS[platform] || platform}
            </p>
          </div>
          <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="p-4">
          {embed ? (
            <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-video">
              <iframe
                title={item?.name}
                src={embed}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <p className="text-sm text-stone-600 mb-3">
              No se puede incrustar este enlace. Ábrelo en el navegador.
            </p>
          )}
          {item?.youtube_url && (
            <a
              href={item.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-lime-700 hover:underline break-all"
            >
              {item.youtube_url}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminTrainingGallery() {
  const { user: currentUser } = useAuth();
  const isCoach = useMemo(() => {
    const roles = Array.isArray(currentUser?.roles) && currentUser.roles.length
      ? currentUser.roles
      : [currentUser?.rol].filter(Boolean);
    return roles.includes('entrenador') && !roles.includes('super_admin');
  }, [currentUser]);

  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [previewItem, setPreviewItem] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');

  const fetchGallery = useCallback(async () => {
    try {
      const res = await api.get('/training/admin/gallery');
      if (res.data?.success) setExercises(res.data.data || []);
    } catch {
      setError('Error cargando la galería');
    }
  }, []);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const startEdit = (ex) => {
    setEditingId(ex.id);
    setDraft({
      name: ex.name || '',
      muscle_group: ex.muscle_group || '',
      youtube_url: ex.youtube_url || '',
    });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.youtube_url?.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/training/admin/gallery', {
        ...form,
        name: form.name.trim(),
        youtube_url: form.youtube_url.trim(),
      });
      await fetchGallery();
      setForm(emptyForm());
    } catch (err) {
      setError(err?.response?.data?.error || 'Error agregando video');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRow = async (id) => {
    if (!draft.name?.trim() || !draft.youtube_url?.trim()) {
      setError('Nombre y enlace de video son obligatorios');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.put(`/training/admin/gallery/${id}`, {
        name: draft.name.trim(),
        muscle_group: draft.muscle_group.trim(),
        youtube_url: draft.youtube_url.trim(),
      });
      await fetchGallery();
      cancelEdit();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error guardando cambios');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este video de la galería?')) return;
    try {
      await api.delete(`/training/admin/gallery/${id}`);
      if (editingId === id) cancelEdit();
      await fetchGallery();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error eliminando video');
    }
  };

  const muscleOptions = useMemo(() => {
    const set = new Set(exercises.map((e) => e.muscle_group).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [exercises]);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...exercises]
      .filter((ex) => {
        if (muscleFilter && ex.muscle_group !== muscleFilter) return false;
        if (!q) return true;
        return String(ex.name).toLowerCase().includes(q)
          || String(ex.muscle_group || '').toLowerCase().includes(q);
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'es'));
  }, [exercises, search, muscleFilter]);

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-stone-900 mb-2">Galería de videos</h2>
      <p className="text-stone-600 mb-4 text-sm">
        {isCoach
          ? 'Paso 1: sube tus videos por ejercicio. Tus clientes los verán al entrenar; sin galería no hay referencia visual.'
          : 'Agrega enlaces de YouTube, Vimeo u otras plataformas por ejercicio. Edita en la tabla y usa Vista previa en un modal.'}
      </p>
      {isCoach && exercises.length < 3 && (
        <div className="bg-lime-50 border border-lime-300 rounded-xl p-4 mb-4 text-sm text-lime-900">
          <strong>Onboarding:</strong> agrega al menos 5 ejercicios con video antes de crear rutinas y asignar planes.
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}

      <form
        onSubmit={handleAdd}
        className="bg-stone-50 border border-stone-200 p-4 rounded-xl grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6"
      >
        <label className="block">
          <span className="text-xs font-bold text-stone-700">Nombre del ejercicio</span>
          <input
            className="input mt-1 w-full"
            type="text"
            required
            placeholder="Sentadilla libre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-stone-700">Grupo muscular</span>
          <input
            className="input mt-1 w-full"
            type="text"
            placeholder="Piernas"
            value={form.muscle_group}
            onChange={(e) => setForm({ ...form, muscle_group: e.target.value })}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-bold text-stone-700">Enlace de video (YouTube, Vimeo, etc.)</span>
          <input
            className="input mt-1 w-full"
            type="url"
            required
            placeholder="https://www.youtube.com/watch?v=…"
            value={form.youtube_url}
            onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
          />
        </label>
        <div className="flex flex-wrap items-center gap-4 md:col-span-2 lg:col-span-4">
          <button type="submit" className="btn-primary" disabled={loading}>
            + Agregar a la galería
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          className="input flex-1 min-w-[200px]"
          placeholder="Buscar por nombre o grupo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input min-w-[180px]"
          value={muscleFilter}
          onChange={(e) => setMuscleFilter(e.target.value)}
        >
          <option value="">Todos los grupos</option>
          {muscleOptions.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <span className="text-sm text-stone-500 self-center">
          {sorted.length} / {exercises.length} ejercicios
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 max-h-[70vh] overflow-y-auto">
        <table className="w-full text-left text-sm min-w-[720px]">
          <thead className="bg-stone-100/80">
            <tr>
              <th className="px-3 py-3 text-xs font-semibold text-stone-500 uppercase">Ejercicio</th>
              <th className="px-3 py-3 text-xs font-semibold text-stone-500 uppercase">Músculo</th>
              <th className="px-3 py-3 text-xs font-semibold text-stone-500 uppercase">Enlace video</th>
              <th className="px-3 py-3 text-xs font-semibold text-stone-500 uppercase">Plataforma</th>
              <th className="px-3 py-3 text-xs font-semibold text-stone-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ex) => {
              const isEditing = editingId === ex.id;
              const platform = detectVideoPlatform(ex.youtube_url);
              return (
                <tr key={ex.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        className="input w-full text-sm"
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      />
                    ) : (
                      <span className="font-medium text-stone-800">{ex.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        className="input w-full text-sm"
                        value={draft.muscle_group}
                        onChange={(e) => setDraft({ ...draft, muscle_group: e.target.value })}
                      />
                    ) : (
                      <span className="text-stone-600">{ex.muscle_group || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-[220px]">
                    {isEditing ? (
                      <input
                        className="input w-full text-sm"
                        type="url"
                        value={draft.youtube_url}
                        onChange={(e) => setDraft({ ...draft, youtube_url: e.target.value })}
                        placeholder="https://…"
                      />
                    ) : (
                      <span className="text-stone-600 truncate block max-w-[200px]" title={ex.youtube_url || ''}>
                        {ex.youtube_url ? ex.youtube_url.replace(/^https?:\/\//, '') : '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                      {PLATFORM_LABELS[platform] || platform}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {ex.youtube_url && !isEditing && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-lime-700 hover:underline"
                          onClick={() => setPreviewItem(ex)}
                        >
                          Vista previa
                        </button>
                      )}
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="text-xs font-semibold text-lime-800"
                            disabled={loading}
                            onClick={() => handleSaveRow(ex.id)}
                          >
                            Guardar
                          </button>
                          <button type="button" className="text-xs text-stone-600" onClick={cancelEdit}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="text-xs font-semibold text-stone-700 hover:underline"
                          onClick={() => startEdit(ex)}
                        >
                          Editar
                        </button>
                      )}
                      {!isEditing && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600 hover:underline"
                          onClick={() => handleDelete(ex.id)}
                        >
                          Borrar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-stone-500 italic">
                  No hay videos en la galería. Agrega el primero con el formulario de arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {previewItem && (
        <VideoPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  );
}
