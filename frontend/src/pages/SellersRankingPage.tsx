/* eslint-disable @typescript-eslint/no-explicit-any */
import { Topbar } from "../layout/Topbar";
import { useDashboardData } from "../../hooks/useDashboardData";
import { SellersTable } from "../components/SellersTable";

export function SellersRankingPage() {
  const s = useDashboardData();

  return (
    <>
      <Topbar
        title="Ranking de Vendedores"
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
          <div className="mt-2">
            <SellersTable rows={s.dash.seller_ranking} />
          </div>
        )}
      </div>
    </>
  );
}
