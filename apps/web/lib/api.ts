const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers)
  headers.set('Content-Type', 'application/json')

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as T
  return data
}

export const api = {
  parse: (input: string, userAddress?: string) =>
    fetchApi<{ intent: unknown; safety: unknown }>('/parse', {
      method: 'POST',
      body: JSON.stringify({ input, userAddress }),
    }),

  getSchedules: (userId: string) => fetchApi<{ schedules: unknown[] }>(`/schedules/${userId}`),

  createSchedule: (data: unknown) =>
    fetchApi<{ id: string }>('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAliases: (userId: string) => fetchApi<{ aliases: unknown[] }>(`/aliases/${userId}`),

  createAlias: (data: unknown) =>
    fetchApi<{ id: string }>('/aliases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getGoals: (userId: string) => fetchApi<{ goals: unknown[] }>(`/goals/${userId}`),

  createGoal: (data: unknown) =>
    fetchApi<{ id: string }>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getHistory: (userId: string) => fetchApi<{ executions: unknown[] }>(`/history/${userId}`),
}
