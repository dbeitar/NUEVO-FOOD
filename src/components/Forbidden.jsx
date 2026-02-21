import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Forbidden() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-7xl">🚫</div>
        <h1 className="text-2xl font-bold text-stone-900">No tienes acceso a esta sección</h1>
        <p className="text-stone-600">Contacta a un administrador si crees que es un error.</p>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => navigate(-1)} className="btn-secondary">Volver</button>
          <button onClick={() => navigate('/my-account')} className="btn-primary">Ir a Mi Cuenta</button>
        </div>
      </div>
    </div>
  );
}
