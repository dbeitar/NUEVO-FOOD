 
import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-7xl">🔒</div>
        <h1 className="text-2xl font-bold text-stone-900">Inicia sesión para continuar</h1>
        <p className="text-stone-600">Tu sesión no está activa o expiró.</p>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => navigate('/')} className="btn-primary">Ir a Iniciar Sesión</button>
        </div>
      </div>
    </div>
  );
}
