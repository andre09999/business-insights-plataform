import { useEffect, useMemo, useState } from "react";
import type { DashboardResponse, Dataset, FiltersResponse, UUID } from "../src/types/api";
import { listDatasets, getDashboard, getFilters } from "../src/api/datasets";
import { formatDateLongBR } from "../src/utils/format";


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
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, 1);
  const end = new Date(y, (m ?? 1), 0);
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

export function useDashboardData() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState<UUID | "">("");
  const [filters, setFilters] = useState<FiltersResponse | null>(null);

  const [month, setMonth] = useState(""); // YYYY-MM
  const [sellerId, setSellerId] = useState("");

  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // datasets
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

  // filters por dataset
  useEffect(() => {
    if (!datasetId) return;
    (async () => {
      try {
        setErr(null);
        setFilters(null);
        setDash(null);
        const f = await getFilters(datasetId);
        setFilters(f);
        setMonth(f.date_max.slice(0, 7)); // mês mais recente
        setSellerId("");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Falha ao carregar filtros");
      }
    })();
  }, [datasetId]);

  // dashboard
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

  return {
    datasets,
    datasetId,
    setDatasetId,
    filters,
    month,
    setMonth,
    sellerId,
    setSellerId,
    dash,
    loading,
    err,
    subtitle,
  };
}
