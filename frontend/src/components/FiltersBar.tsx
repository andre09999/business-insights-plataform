import type { FiltersResponse } from "../types/api";

export function FiltersBar(props: {
  filters: FiltersResponse;

  month: string; // YYYY-MM
  sellerId: string;

  onChange: (next: { month: string; sellerId: string }) => void;
  onExport: () => void;
}) {
  // min/max do month input precisam ser YYYY-MM
  const minMonth = props.filters.date_min.slice(0, 7);
  const maxMonth = props.filters.date_max.slice(0, 7);

  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-white/70">Mês</label>
        <input
          type="month"
          min={minMonth}
          max={maxMonth}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-white/20"
          value={props.month}
          onChange={(e) => props.onChange({ month: e.target.value, sellerId: props.sellerId })}
        />
        <div className="text-xs text-white/40">
          Disponível: {minMonth} → {maxMonth}
        </div>
      </div>

      <div className="flex flex-col gap-1 md:col-span-2">
        <label className="text-sm text-white/70">Vendedor</label>
        <select
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-white/20"
          value={props.sellerId}
          onChange={(e) => props.onChange({ month: props.month, sellerId: e.target.value })}
        >
          <option value="">Todos</option>
          {props.filters.sellers.map((s) => (
            <option key={s.seller_id} value={s.seller_id}>
              {s.seller_name}
            </option>
          ))}
        </select>
        <div className="text-xs text-white/40">* O ranking e metas respeitam o mês selecionado.</div>
      </div>

      <div className="flex items-end">
        <button
          onClick={props.onExport}
          className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white hover:bg-white/15"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
