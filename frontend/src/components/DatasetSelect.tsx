import type { Dataset, UUID } from "../types/api";

export function DatasetSelect(props: {
  datasets: Dataset[];
  value?: UUID;
  onChange: (id: UUID) => void;
}) {
  console.log("DATASETS:", props);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-white/70">Dataset</label>
      <select
        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-white/20"
        value={props.value ?? ""}
        onChange={(e) => props.onChange(e.target.value)}
      >
        <option value="" disabled>
          Selecione…
        </option>
        {props.datasets.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.status})
          </option>
        ))}
      </select>
    </div>
  );
}
