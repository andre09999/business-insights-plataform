export type UUID = string;

export type Dataset = {
  id: UUID;
  name: string;
  status: "processing" | "ready" | "error" | string;
  row_count: number;
  date_min: string | null; // YYYY-MM-DD
  date_max: string | null; // YYYY-MM-DD
  created_at?: string;
};

export type FiltersResponse = {
  date_min: string;
  date_max: string;
  categories: string[];
  sellers: Array<{ seller_id: UUID; seller_name: string }>;
};

export type SeriesPoint = { date: string; value: number };

export type KpisResponse = {
  total_value: number;
  avg_daily_value: number;
  days: number;
  best_day: { date: string; value: number } | null;
  worst_day: { date: string; value: number } | null;
};

export type CategoryAgg = { category: string; value: number };

export type SellerRankingRow = {
  seller_id: UUID;
  seller_name: string;
  total_value: number;
  avg_daily_value: number;
  days: number;
};

export type DashboardResponse = {
  kpis: KpisResponse;
  series: SeriesPoint[];
  top_categories: CategoryAgg[];
  seller_ranking: SellerRankingRow[];
};
