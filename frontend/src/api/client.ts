function resolveBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000";
  }

  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000";
  }

  return origin;
}

const BASE_URL = resolveBaseUrl();
export class ApiError extends Error {
  status: number;
  body?: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type RequestParams = Record<string, string | undefined>;

type ApiGetOptions = {
  params?: RequestParams;
  signal?: AbortSignal;
};

function buildApiUrl(path: string, params?: RequestParams) {
  const url = new URL(path, BASE_URL);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }

  return url;
}

export async function apiGet<T>(path: string, options?: ApiGetOptions) {
  const url = buildApiUrl(path, options?.params);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });

  if (!res.ok) {
    let body: unknown = undefined;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => undefined);
    }
    throw new ApiError(`API error ${res.status} em ${url.pathname}`, res.status, body);
  }

  return (await res.json()) as T;
}

export function buildUrl(path: string, params?: RequestParams) {
  return buildApiUrl(path, params).toString();
}
