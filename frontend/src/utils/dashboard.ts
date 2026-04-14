import type { FiltersResponse } from "../types/api";

export function toDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function toISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, (monthIndex ?? 1) - 1, 1);
  const end = new Date(year, monthIndex ?? 1, 0);

  return {
    start: toISO(start),
    end: toISO(end),
  };
}

export function clampRangeToDataset(
  startISO: string,
  endISO: string,
  dateMin: string,
  dateMax: string
) {
  const start = toDate(startISO);
  const end = toDate(endISO);
  const min = toDate(dateMin);
  const max = toDate(dateMax);

  const clampedStart = start < min ? min : start;
  const clampedEnd = end > max ? max : end;

  if (clampedStart > clampedEnd) {
    return { start: toISO(min), end: toISO(max) };
  }

  return {
    start: toISO(clampedStart),
    end: toISO(clampedEnd),
  };
}

export function getMonthBounds(filters: FiltersResponse | null) {
  if (!filters?.date_min || !filters.date_max) {
    return { minMonth: "", maxMonth: "" };
  }

  return {
    minMonth: filters.date_min.slice(0, 7),
    maxMonth: filters.date_max.slice(0, 7),
  };
}

export function getDefaultMonth(filters: FiltersResponse) {
  return filters.date_max?.slice(0, 7) ?? filters.date_min?.slice(0, 7) ?? "";
}

export function getClampedMonthRange(filters: FiltersResponse | null, month: string) {
  if (!filters?.date_min || !filters.date_max || !month) {
    return null;
  }

  const { start, end } = monthRange(month);
  return clampRangeToDataset(start, end, filters.date_min, filters.date_max);
}
