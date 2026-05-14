import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminVideoGallery() {
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: '', muscle_group: '', youtube_url: '' });

    useEffect(() => {
        fetchGallery();
    }, []);

    const fetchGallery = async () => {
        try {
            const res = await api.get('/admin/gallery');
            if (res.data?.success) setExercises(res.data.data);
        } catch {
            console.warn('Error fetching gallery');
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.name || !form.youtube_url) return;
        setLoading(true);
        try {
            await api.post('/admin/gallery', form);
            fetchGallery();
            setForm({ name: '', muscle_group: '', youtube_url: '' });
        } catch {
            alert('Error agregando video a la galería');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Eliminar url?')) return;
        try {
            await api.delete(`/admin/gallery/${id}`);
            fetchGallery();
        } catch {
            alert('Error eliminando video');
        }
    };

    return (
        <div className="card">
            <h2 className="text-2xl font-bold text-stone-900 mb-4">Galería de Bases de YouTube</h2>
            <p className="text-stone-600 mb-6 text-sm">Gestiona las URLs de YouTube que se mostrarán en pantalla dividida cuando el usuario entrene.</p>

            <form onSubmit={handleAdd} className="bg-stone-50 border border-stone-200 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-end mb-6">
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-stone-700">Nombre del Ejercicio</label>
                    <input className="input mt-1" type="text" required placeholder="Sentadilla Libre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-stone-700">Grupo Muscular</label>
                    <input className="input mt-1" type="text" placeholder="PIERNAS / VARIANTES..." value={form.muscle_group} onChange={e => setForm({ ...form, muscle_group: e.target.value })} />
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-stone-700">URL YouTube Oficial</label>
                    <input className="input mt-1" type="url" required placeholder="https://youtube.com/watch?v=..." value={form.youtube_url} onChange={e => setForm({ ...form, youtube_url: e.target.value })} />
                </div>
                <button type="submit" className="btn-primary whitespace-nowrap" disabled={loading}>+ Guardar Base</button>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-stone-100/50">
                        <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-stone-500">EJERCICIO</th>
                            <th className="px-4 py-3 text-xs font-semibold text-stone-500">MÚSCULO</th>
                            <th className="px-4 py-3 text-xs font-semibold text-stone-500">ENLACE VIDEO</th>
                            <th className="px-4 py-3 text-xs font-semibold text-stone-500">ACCIÓN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {exercises.map(ex => (
                            <tr key={ex.id} className="border-t border-stone-100 hover:bg-stone-50/50">
                                <td className="px-4 py-3 text-stone-800 font-medium">{ex.name}</td>
                                <td className="px-4 py-3 text-stone-600 text-sm">{ex.muscle_group}</td>
                                <td className="px-4 py-3 text-blue-600/80 text-sm">
                                    <a href={ex.youtube_url} target="_blank" rel="noreferrer" className="hover:underline">Ver Trazado</a>
                                </td>
                                <td className="px-4 py-3">
                                    <button onClick={() => handleDelete(ex.id)} className="text-red-500 hover:text-red-600 text-sm font-bold">X Borrar</button>
                                </td>
                            </tr>
                        ))}
                        {exercises.length === 0 && (
                            <tr><td colSpan="4" className="text-center py-6 text-stone-500 text-sm italic">No hay videos en la galería. Agrega uno arriba.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
