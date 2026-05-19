 

export default function AuthLayout({ title, subtitle, children, wide = false }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-xl'} bg-white rounded-3xl border border-slate-200 shadow-sm p-6`}>
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl grid place-items-center bg-lime-100 text-lime-700">🍃</div>
          <h2 className="mt-3 text-3xl font-['Playfair_Display'] text-stone-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-stone-600">{subtitle}</p> : null}
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
