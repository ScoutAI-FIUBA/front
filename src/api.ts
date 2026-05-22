const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

if (!API_BASE_URL) {
  console.warn(
    "[scoutai] VITE_API_BASE_URL is not set. Falling back to same-origin requests.",
  );
}

export interface HealthResponse {
  status: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as HealthResponse;
}

export { API_BASE_URL };
