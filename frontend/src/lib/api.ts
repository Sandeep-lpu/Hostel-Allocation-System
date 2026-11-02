const API_BASE = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export async function fetchFromBackend<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      cache: 'no-store',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data?.message || data?.error || `HTTP ${res.status}: Failed to reach backend`,
        data,
      };
    }

    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 503,
      error: `Network Connection Error: Backend is unreachable at ${url}. ${err.message}`,
    };
  }
}

