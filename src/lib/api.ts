export type User = {
  id: number
  username: string
  schoolCode: string
  schoolName: string
  grade: number
  classNum: number
  ecoCoins: number
  badges: string[]
}

export type School = {
  schoolCode: string
  schoolName: string
  region: string
  address: string
}

export type Item = {
  id: number
  title: string
  description: string
  price: number
  tradeType: 'sale' | 'donate'
  emoji: string
  imageData?: string | null
  status: string
  createdAt?: string
  sellerName?: string
  sellerGrade?: number
  sellerClass?: number
  sellerId?: number
}

export type Reward = {
  amount: number
  message: string
}

const TOKEN_KEY = 'abada_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(path, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || '문제가 생겼어요. 다시 해볼까요?')
  }
  return data as T
}

export const api = {
  schools: (query: string) =>
    request<{ schools: School[]; source: string }>(`/api/schools?query=${encodeURIComponent(query)}`),

  register: (body: Record<string, unknown>) =>
    request<{ token: string; user: User; reward: Reward }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: Record<string, unknown>) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<{ user: User }>('/api/me'),

  history: () =>
    request<{
      history: Array<{ id: number; amount: number; reason: string; createdAt: string }>
    }>('/api/me/history'),

  myItems: () =>
    request<{ items: Item[]; donatedCount: number }>('/api/me/items'),

  items: (tab: 'all' | 'donate') =>
    request<{ items: Item[] }>(`/api/items?tab=${tab}`),

  createItem: (body: Record<string, unknown>) =>
    request<{ item: Item; ecoCoins: number; badges: string[]; reward: Reward }>('/api/items', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  buyItem: (id: number) =>
    request<{ ok: boolean; ecoCoins: number; reward: Reward }>(`/api/items/${id}/buy`, {
      method: 'POST',
    }),

  claimItem: (id: number) =>
    request<{ ok: boolean; ecoCoins: number; reward: Reward }>(`/api/items/${id}/claim`, {
      method: 'POST',
    }),

  deleteItem: (id: number) =>
    request<{ ok: boolean }>(`/api/items/${id}`, { method: 'DELETE' }),
}
