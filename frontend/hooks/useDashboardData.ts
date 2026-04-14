import { useEffect, useMemo, useState } from "react";
import { getDashboard, getFilters, listDatasets } from "../src/api/datasets";
import type { DashboardResponse, Dataset, FiltersResponse, UUID } from "../src/types/api";
import { getClampedMonthRange, getDefaultMonth } from "../src/utils/dashboard";
import { formatDateLongBR } from "../src/utils/format";
export function useDashboardData() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState<UUID | "">("");
  const [filters, setFilters] = useState<FiltersResponse | null>(null);

  const [month, setMonth] = useState(""); // YYYY-MM
  const [sellerId, setSellerId] = useState("");

  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setErr(null);
        const items = await listDatasets();
        if (!active) return;

        setDatasets(items);

        const firstReady = items.find((item) => item.status === "ready") ?? items[0];
        if (firstReady) {
          setDatasetId(firstReady.id);
        }
      } catch (error) {
        if (!active) return;
        setErr(error instanceof Error ? error.message : "Falha ao carregar datasets");
      }
    })();

    return () => {
      active = false;
    };
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
