/** TODO: reemplazar por cliente HTTP real (fetch/axios) cuando el backend esté disponible */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('scoutai-auth-token')
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<T>
}

export { BASE_URL }
