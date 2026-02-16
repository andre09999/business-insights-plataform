import type { SeriesPoint, SellerRankingRow } from "../types/api";
import { buildInsights } from "../utils/insights";

function badgeClass(sev?: "info" | "good" | "warn") {
  if (sev === "good") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  if (sev === "warn") return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  return "border-white/10 bg-white/5 text-white/80";
}

export function InsightsPanel(props: { series: SeriesPoint[]; sellers: SellerRankingRow[] }) {
  const insights = buildInsights({ series: props.series, sellers: props.sellers });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 text-sm text-white/70">Insights automáticos</div>

      {insights.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
          Sem insights suficientes para o período.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {insights.map((i, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border p-4 ${badgeClass(i.severity)}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-xl">{i.icon}</div>
                <div>
                  <div className="font-semibold">{i.title}</div>
                  <div className="mt-1 text-sm opacity-90">{i.body}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
