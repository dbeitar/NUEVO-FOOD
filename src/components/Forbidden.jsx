 
 

export default function Forbidden() {
  const goBack = () => { window.history.back(); };
  const goAccount = () => { window.location.assign('/my-account'); };
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-7xl">🚫</div>
        <h1 className="text-2xl font-bold text-stone-900">No tienes acceso a esta sección</h1>
        <p className="text-stone-600">Contacta a un administrador si crees que es un error.</p>
        <div className="flex items-center justify-center gap-2">
          <button onClick={goBack} className="btn-secondary">Volver</button>
          <button onClick={goAccount} className="btn-primary">Ir a Mi Cuenta</button>
        </div>
      </div>
    </div>
  );
}
