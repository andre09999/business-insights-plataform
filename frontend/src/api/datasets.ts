import { apiGet } from "./client";
import type { Dataset, FiltersResponse, DashboardResponse, UUID } from "../types/api";

export function listDatasets() {
  return apiGet<Dataset[]>("/datasets");
}

export function getFilters(datasetId: UUID) {
  return apiGet<FiltersResponse>(`/datasets/${datasetId}/filters`);
}

export function getDashboard(
  datasetId: UUID,
  params?: { start_date?: string; end_date?: string; seller_id?: string }
) {
  return apiGet<DashboardResponse>(`/datasets/${datasetId}/dashboard`, params);
}
