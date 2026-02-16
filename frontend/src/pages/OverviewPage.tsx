/* eslint-disable @typescript-eslint/no-explicit-any */
import { CardKpi } from "../components/CardKpi";
import { SeriesChart } from "../components/SeriesChart";
import { CategoriesChart } from "../components/CategoriesChart";
import { InsightsPanel } from "../components/InsightsPanel";
import { Topbar } from "../layout/Topbar";
import { useDashboardData } from "../../hooks/useDashboardData";
import { formatBRL } from "../utils/format";

export function OverviewPage() {
  const s = useDashboardData();

  return (
    <>
      <Topbar
        title="Visão Geral"
        subtitle={s.subtitle}
        datasets={s.datasets}
        datasetId={s.datasetId}
        onDatasetChange={s.setDatasetId as any}
        filters={s.filters}
        month={s.month}
        onMonthChange={s.setMonth}
        sellerId={s.sellerId}
        onSellerChange={s.setSellerId}
      />

      <div className="w-full px-4 py-6 2xl:px-10">
        {s.err && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{s.err}</div>}
        {s.loading && <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">Carregando…</div>}

        {s.dash && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <CardKpi title="Total" value={s.dash.kpis.total_value} kind="money" />
              <CardKpi title="Média diária" value={s.dash.kpis.avg_daily_value} kind="money" />
              <CardKpi title="Dias" value={s.dash.kpis.days} kind="number" />
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
                <div className="text-sm text-white/70">Melhor / pior dia</div>
                <div className="mt-2 text-sm text-white/85">
                  {s.dash.kpis.best_day ? (
                    <div>✅ {s.dash.kpis.best_day.date}: {formatBRL(s.dash.kpis.best_day.value)}</div>
                  ) : <div>✅ —</div>}
                  {s.dash.kpis.worst_day ? (
                    <div className="mt-1">⚠️ {s.dash.kpis.worst_day.date}: {formatBRL(s.dash.kpis.worst_day.value)}</div>
                  ) : <div className="mt-1">⚠️ —</div>}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <InsightsPanel series={s.dash.series} sellers={s.dash.seller_ranking} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SeriesChart data={s.dash.series} />
              <CategoriesChart data={s.dash.top_categories} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
