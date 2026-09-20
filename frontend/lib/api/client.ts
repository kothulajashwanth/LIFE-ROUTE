/**
 * Typed API client foundation for LIFE-ROUTE FastAPI Backend.
 * Consumes environment variable NEXT_PUBLIC_API_BASE_URL.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public details?: unknown
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = "ApiClientError";
  }
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to connect to backend server";
    throw new ApiClientError(0, `Network error: ${message}`, err);
  }

  if (!response.ok) {
    let errorDetails: unknown = null;
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = await response.text();
    }
    throw new ApiClientError(response.status, response.statusText, errorDetails);
  }

  try {
    return (await response.json()) as T;
  } catch (err: unknown) {
    throw new ApiClientError(
      response.status,
      "Malformed response: failed to parse JSON",
      err
    );
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
};
