import { NavLink } from "react-router-dom";

const linkBase =
  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition border border-transparent";
const active = "bg-white/10 border-white/10 text-white";
const idle = "text-white/70 hover:bg-white/5 hover:text-white";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="h-screen w-[260px] shrink-0 border-r border-white/10 bg-black/30 sticky top-0">
      <div className="p-4">
        <div className="text-lg font-semibold text-white">Datara Platform</div>
        <div className="mt-1 text-xs text-white/50">Dashboard de vendas em ReactBI</div>
      </div>

      <nav className="px-3 pb-4">
        <NavLink to="/" end className={({ isActive }) => `${linkBase} ${isActive ? active : idle}`} onClick={onNavigate}>
          📊 Visão Geral
        </NavLink>
        <NavLink to="/metas" className={({ isActive }) => `${linkBase} ${isActive ? active : idle}`} onClick={onNavigate}>
          🎯 Metas & Performance
        </NavLink>
        <NavLink to="/ranking" className={({ isActive }) => `${linkBase} ${isActive ? active : idle}`} onClick={onNavigate}>
          🏆 Ranking de Vendedores
        </NavLink>
      </nav>
    </aside>
  );
}
