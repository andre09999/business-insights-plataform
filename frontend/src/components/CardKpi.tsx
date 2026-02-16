import { formatBRL, formatNumber } from "../utils/format";

export function CardKpi(props: { title: string; value: number; kind?: "money" | "number" }) {
  const label = props.kind === "money" ? formatBRL(props.value) : formatNumber(props.value);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
      <div className="text-sm text-white/70">{props.title}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{label}</div>
    </div>
  );
}
