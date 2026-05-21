// Producto GYM — marca blanca y operación (sin reemplazar panel D28D).

export default function GymProductView({ hasAnyRole, onNavigate, onBack }) {
  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" className="text-sm text-stone-600 hover:text-stone-900 mb-2" onClick={onBack}>
            ← Volver al inicio
          </button>
          <h2 className="text-2xl font-bold text-stone-900 font-['Playfair_Display']">Gimnasio</h2>
          <p className="text-stone-600">Marca blanca, usuarios y vigencias. Las clases D28D siguen en el módulo D28D.</p>
        </div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym']) && (
          <button type="button" className="card p-6 text-left hover:shadow-md transition" onClick={() => onNavigate('admingyms')}>
            <h3 className="font-semibold text-lg">Mi marca</h3>
            <p className="text-sm text-stone-600 mt-1">Logo, colores, mensaje y WhatsApp de soporte.</p>
          </button>
        )}
        {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym', 'admin_d28d']) && (
          <button type="button" className="card p-6 text-left hover:shadow-md transition" onClick={() => onNavigate('adminusers')}>
            <h3 className="font-semibold text-lg">Usuarios</h3>
            <p className="text-sm text-stone-600 mt-1">Altas, roles y licencias por módulo.</p>
          </button>
        )}
        {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym']) && (
          <button type="button" className="card p-6 text-left hover:shadow-md transition" onClick={() => onNavigate('adminplans')}>
            <h3 className="font-semibold text-lg">Vigencias</h3>
            <p className="text-sm text-stone-600 mt-1">Cuentas y fechas de vencimiento (legacy compatible).</p>
          </button>
        )}
        {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym', 'admin_d28d']) && (
          <button type="button" className="card p-6 text-left hover:shadow-md transition" onClick={() => onNavigate('liveclasses')}>
            <h3 className="font-semibold text-lg">Clases en vivo</h3>
            <p className="text-sm text-stone-600 mt-1">Ver clases D28D habilitadas para tu gym.</p>
          </button>
        )}
      </div>
    </div>
  );
}
