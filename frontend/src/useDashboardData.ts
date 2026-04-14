import { useEffect, useMemo, useState } from "react";
import { getDashboard, getFilters, listDatasets } from "./api/datasets";
import type { DashboardResponse, Dataset, FiltersResponse, UUID } from "./types/api";
import { getClampedMonthRange, getDefaultMonth } from "./utils/dashboard";
import { formatDateLongBR } from "./utils/format";

export function useDashboardData() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState<UUID | "">("");
  const [filters, setFilters] = useState<FiltersResponse | null>(null);
  const [month, setMonth] = useState("");
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

  useEffect(() => {
    if (!datasetId) return;

    let active = true;

    (async () => {
      try {
        setErr(null);
        setFilters(null);
        setDash(null);

        const nextFilters = await getFilters(datasetId);
        if (!active) return;

        setFilters(nextFilters);
        setMonth(getDefaultMonth(nextFilters));
        setSellerId("");
      } catch (error) {
        if (!active) return;
        setErr(error instanceof Error ? error.message : "Falha ao carregar filtros");
      }
    })();

    return () => {
      active = false;
    };
  }, [datasetId]);

  useEffect(() => {
    if (!datasetId || !filters || !month) return;

    const clamped = getClampedMonthRange(filters, month);
    if (!clamped) {
      setDash(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const dashboard = await getDashboard(
          datasetId,
          {
            start_date: clamped.start,
            end_date: clamped.end,
            seller_id: sellerId || undefined,
          },
          controller.signal
        );

        setDash(dashboard);
      } catch (error) {
        if (controller.signal.aborted) return;
        setErr(error instanceof Error ? error.message : "Falha ao carregar dashboard");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [datasetId, filters, month, sellerId]);

  const subtitle = useMemo(() => {
    if (!filters || !month) return "";

    const clamped = getClampedMonthRange(filters, month);
    if (!clamped) return "Sem periodo disponivel";

    const sellerName = sellerId
      ? filters.sellers.find((seller) => seller.seller_id === sellerId)?.seller_name
      : null;

    const period = `${formatDateLongBR(clamped.start)} - ${formatDateLongBR(clamped.end)}`;
    return sellerName ? `${period} | Vendedor: ${sellerName}` : period;
  }, [filters, month, sellerId]);

  return {
    datasets,
    datasetId,
    setDatasetId: (nextDatasetId: UUID) => setDatasetId(nextDatasetId),
    filters,
    month,
    setMonth: (nextMonth: string) => setMonth(nextMonth),
    sellerId,
    setSellerId: (nextSellerId: string) => setSellerId(nextSellerId),
    dash,
    loading,
    err,
    subtitle,
  };
}
