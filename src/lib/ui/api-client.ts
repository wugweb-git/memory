type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
};

export class ApiClientError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiRequest<T = unknown>(url: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = 12000, retries = 1 } = options;
  let lastError: unknown;

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        },
        timeoutMs,
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new ApiClientError((json as any)?.error || `Request failed (${res.status})`, res.status, json);
      }
      return json as T;
    } catch (e) {
      lastError = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }

  if (lastError instanceof ApiClientError) throw lastError;
  throw new ApiClientError((lastError as any)?.message || "Network error");
}
