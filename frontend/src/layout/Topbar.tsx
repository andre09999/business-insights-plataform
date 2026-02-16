import type { Dataset, FiltersResponse, UUID } from "../types/api";
import { NavLink } from "react-router-dom";
import { useSidebar } from "./sidebarContext";

export function Topbar(props: {
  title: string;
  subtitle: string;
  datasets: Dataset[];
  datasetId: UUID | "";
  onDatasetChange: (id: UUID) => void;
  filters: FiltersResponse | null;
  month: string;
  onMonthChange: (m: string) => void;
  sellerId: string;
  onSellerChange: (id: string) => void;
}) {
  const sidebar = useSidebar();

  const minMonth = props.filters?.date_min.slice(0, 7) ?? "";
  const maxMonth = props.filters?.date_max.slice(0, 7) ?? "";

  const tabBase =
    "flex-1 h-10 rounded-xl border px-3 text-sm transition flex items-center justify-center";
  const tabActive = "border-white/15 bg-white/10 text-white";
  const tabIdle =
    "border-white/10 bg-black/20 text-white/70 hover:bg-white/5 hover:text-white";

  const control =
    "w-full h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/20 hover:border-white/20 transition-all";

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/60 backdrop-blur">
      <div className="w-full px-4 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {/* ✅ Hamburguer (mobile + desktop) */}
              <button
                onClick={sidebar.toggle}
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                aria-label="Abrir/Fechar menu"
                title="Menu"
              >
                ☰
              </button>

              <h1 className="text-xl font-semibold text-white">{props.title}</h1>
            </div>

            <p className="mt-1 text-sm text-white/60">{props.subtitle}</p>

            {/* Tabs mobile */}
            <div className="mt-3 flex gap-2 md:hidden">
              <NavLink
                to="/"
                end
                className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabIdle}`}
              >
                Visão Geral
              </NavLink>
              <NavLink
                to="/metas"
                className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabIdle}`}
              >
                Metas
              </NavLink>
              <NavLink
                to="/ranking"
                className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabIdle}`}
              >
                Ranking
              </NavLink>
            </div>
          </div>

          {/* ✅ DESKTOP: grid normal */}
          <div className="hidden w-full grid-cols-1 gap-2 md:grid md:w-[720px] md:grid-cols-3">
            <select
              className={control}
              value={props.datasetId}
              onChange={(e) => props.onDatasetChange(e.target.value as UUID)}
            >
              <option value="" disabled>
                Dataset…
              </option>
              {props.datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <input
              type="month"
              min={minMonth}
              max={maxMonth}
              value={props.month}
              onChange={(e) => props.onMonthChange(e.target.value)}
              className={`${control} [color-scheme:dark]`}
            />

            <select
              className={control}
              value={props.sellerId}
              onChange={(e) => props.onSellerChange(e.target.value)}
              disabled={!props.filters}
            >
              <option value="">Todos vendedores</option>
              {props.filters?.sellers.map((s) => (
                <option key={s.seller_id} value={s.seller_id}>
                  {s.seller_name}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ MOBILE: filtros compactos 109x40 na mesma linha */}
          <div className="md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <select
                className="h-10 w-[109px] shrink-0 rounded-xl border border-white/10 bg-black/30 px-2 text-[12px] text-white outline-none focus:ring-2 focus:ring-white/20"
                value={props.datasetId}
                onChange={(e) => props.onDatasetChange(e.target.value as UUID)}
                title="Dataset"
              >
                <option value="" disabled>
                  Dataset…
                </option>
                {props.datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <input
                type="month"
                min={minMonth}
                max={maxMonth}
                value={props.month}
                onChange={(e) => props.onMonthChange(e.target.value)}
                className="h-10 w-[109px] shrink-0 rounded-xl border border-white/10 bg-black/30 px-2 text-[12px] text-white outline-none focus:ring-2 focus:ring-white/20 [color-scheme:dark]"
                title="Mês"
              />

              <select
                className="h-10 w-[109px] shrink-0 rounded-xl border border-white/10 bg-black/30 px-2 text-[12px] text-white outline-none focus:ring-2 focus:ring-white/20"
                value={props.sellerId}
                onChange={(e) => props.onSellerChange(e.target.value)}
                disabled={!props.filters}
                title="Vendedor"
              >
                <option value="">Vendedor</option>
                {props.filters?.sellers.map((s) => (
                  <option key={s.seller_id} value={s.seller_id}>
                    {s.seller_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
