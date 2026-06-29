const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** Auto-generated docstring */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Auto-generated docstring */
export async function fetcher<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: 'An error occurred' }));
    throw new ApiError(res.status, error.message || 'An error occurred');
  }

  return res.json();
}

/** Auto-generated docstring */
export async function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: 'An error occurred' }));
    throw new ApiError(res.status, error.message || 'An error occurred');
  }

  return res.json();
}

/** Auto-generated docstring */
export async function apiPatch<T>(
  endpoint: string,
  data?: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: 'An error occurred' }));
    throw new ApiError(res.status, error.message || 'An error occurred');
  }

  return res.json();
}

export { API_URL };
