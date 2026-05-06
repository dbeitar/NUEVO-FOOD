export default function Navbar() {
  

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 h-16 flex items-center justify-between px-6 md:hidden">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🍽️</span>
        <h1 className="text-lg font-bold text-stone-900 m-0">D28D GYM virtual</h1>
      </div>
      
      {/* Mobile Menu Button - Placeholder */}
      <button className="text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg p-1.5 transition-colors">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </header>
  );
}
