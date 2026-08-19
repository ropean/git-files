export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Single place every authorized request funnels a 401 through. The session
// cookie is transparently renewed server-side (see src/backend/modules/auth/sso.ts) before
// a request ever reaches a route handler, so a 401 here means the refresh
// token itself is no longer valid — the only correct move is to re-login.
export function redirectToLogin(): void {
  window.location.href = `/auth/login?return_to=${encodeURIComponent(window.location.pathname)}`;
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    redirectToLogin();
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    const body = await res.text();
    let message: string;
    try {
      const json = JSON.parse(body);
      message = json.error || json.message || body;
    } catch {
      message = body;
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
