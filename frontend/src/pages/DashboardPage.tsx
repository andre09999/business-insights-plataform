import { useEffect, useMemo, useState } from "react";
import type { DashboardResponse, Dataset, FiltersResponse, UUID } from "../types/api";
import { listDatasets, getFilters, getDashboard } from "../api/datasets";
import { buildUrl } from "../api/client";
import { DatasetSelect } from "../components/DatasetSelect";
import { FiltersBar } from "../components/FiltersBar";
import { CardKpi } from "../components/CardKpi";
import { SeriesChart } from "../components/SeriesChart";
import { CategoriesChart } from "../components/CategoriesChart";
import { SellersTable } from "../components/SellersTable";
import { formatBRL, formatDateLongBR } from "../utils/format";
import { InsightsPanel } from "../components/InsightsPanel";
import { SellersGoalsPanel } from "../components/SellersGoalsPanel";

/** Helpers (fora do componente) */
function toDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthRange(month: string) {
  // month: YYYY-MM
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, 1);
  const end = new Date(y, (m ?? 1), 0); // último dia do mês
  return { start: toISO(start), end: toISO(end) };
}

function clampRangeToDataset(startISO: string, endISO: string, dateMin: string, dateMax: string) {
  const s = toDate(startISO);
  const e = toDate(endISO);
  const min = toDate(dateMin);
  const max = toDate(dateMax);

  const cs = s < min ? min : s;
  const ce = e > max ? max : e;

  if (cs > ce) return { start: toISO(min), end: toISO(max) };
  return { start: toISO(cs), end: toISO(ce) };
}

export function DashboardPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState<UUID | "">("");

  const [filters, setFilters] = useState<FiltersResponse | null>(null);

  // ✅ agora é mês + seller
  const [month, setMonth] = useState(""); // YYYY-MM
  const [sellerId, setSellerId] = useState("");

  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 1) carrega datasets
  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const ds = await listDatasets();
        setDatasets(ds);

        const first = ds.find((d) => d.status === "ready") ?? ds[0];
        if (first) setDatasetId(first.id);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Falha ao carregar datasets");
      }
    })();
  }, []);

  // 2) ao trocar dataset: carrega filters e inicializa mês
  useEffect(() => {
    if (!datasetId) return;

    (async () => {
      try {
        setErr(null);
        setFilters(null);
        setDash(null);

        const f = await getFilters(datasetId);
        setFilters(f);

        // ✅ começa no mês mais recente do dataset (date_max)
        setMonth(f.date_max.slice(0, 7));
        setSellerId("");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Falha ao carregar filtros");
      }
    })();
  }, [datasetId]);

  // 3) carrega dashboard quando dataset + filtros estiverem ok
  useEffect(() => {
    if (!datasetId || !filters || !month) return;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { start, end } = monthRange(month);
        const clamped = clampRangeToDataset(start, end, filters.date_min, filters.date_max);

        const data = await getDashboard(datasetId, {
          start_date: clamped.start,
          end_date: clamped.end,
          seller_id: sellerId || undefined,
        });

        setDash(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Falha ao carregar dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [datasetId, filters, month, sellerId]);

const subtitle = useMemo(() => {
  if (!filters || !month) return "";

  const { start, end } = monthRange(month);
  const clamped = clampRangeToDataset(start, end, filters.date_min, filters.date_max);

  const sellerName = sellerId
    ? filters.sellers.find((s) => s.seller_id === sellerId)?.seller_name
    : null;

  const period = `${formatDateLongBR(clamped.start)} — ${formatDateLongBR(clamped.end)}`;

  return sellerName ? `${period} • Vendedor: ${sellerName}` : period;
}, [filters, month, sellerId]);

  function exportCsv() {
    if (!datasetId || !filters || !month) return;

    const { start, end } = monthRange(month);
    const clamped = clampRangeToDataset(start, end, filters.date_min, filters.date_max);

    const url = buildUrl(`/datasets/${datasetId}/dashboard/export.csv`, {
      start_date: clamped.start,
      end_date: clamped.end,
      seller_id: sellerId || undefined,
    });

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="min-h-screen text-white bg-neutral-950
      [background-image:radial-gradient(1200px_500px_at_20%_0%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_400px_at_90%_10%,rgba(34,211,238,0.12),transparent_55%)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Business Insights</h1>
            <p className="mt-1 text-sm text-white/70">{subtitle}</p>
          </div>

          <div className="w-full md:w-[420px]">
            <DatasetSelect datasets={datasets} value={datasetId || undefined} onChange={(id) => setDatasetId(id)} />
          </div>
        </div>

        <div className="mt-5">
          {filters ? (
            <FiltersBar
              filters={filters}
              month={month}
              sellerId={sellerId}
              onChange={(n) => {
                setMonth(n.month);
                setSellerId(n.sellerId);
              }}
              onExport={exportCsv}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
              Carregando filtros…
            </div>
          )}
        </div>

        {err && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="mt-6">
          {loading && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
              Carregando dashboard…
            </div>
          )}

          {dash && (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <CardKpi title="Total" value={dash.kpis.total_value} kind="money" />
                <CardKpi title="Média diária" value={dash.kpis.avg_daily_value} kind="money" />
                <CardKpi title="Dias" value={dash.kpis.days} kind="number" />

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
                  <div className="text-sm text-white/70">Melhor / pior dia</div>
                  <div className="mt-2 text-sm text-white/85">
                    {dash.kpis.best_day ? (
                      <div>
                        ✅ {formatDateLongBR(dash.kpis.best_day.date)}: {formatBRL(dash.kpis.best_day.value)}
                      </div>
                    ) : (
                      <div>✅ —</div>
                    )}
                    {dash.kpis.worst_day ? (
                      <div className="mt-1">
                        ⚠️ {formatDateLongBR(dash.kpis.worst_day.date)}: {formatBRL(dash.kpis.worst_day.value)}
                      </div>
                    ) : (
                      <div className="mt-1">⚠️ —</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <InsightsPanel series={dash.series} sellers={dash.seller_ranking} />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SeriesChart data={dash.series} />
                <CategoriesChart data={dash.top_categories} />
              </div>

              {/* ✅ Metas/Progresso (mais útil) antes do ranking */}
              <div className="mt-6">
                <SellersGoalsPanel rows={dash.seller_ranking} />
              </div>

              <div className="mt-6">
                <SellersTable rows={dash.seller_ranking} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
