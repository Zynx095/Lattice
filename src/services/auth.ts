import { useSyncExternalStore } from 'react'
import { appConfig } from '@/config'

export interface User {
  id: number
  name: string
  email: string
}
export interface HistoryItem {
  id: number
  prompt: string
  answer: string | null
  category: string | null
  provider: string | null
  created_at: string
}

const KEY = `${appConfig.storagePrefix}.session`
type Session = { token: string; user: User } | null

const load = (): Session => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}

let session: Session = load()
const listeners = new Set<() => void>()
const set = (next: Session) => {
  session = next
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage blocked: session lasts until reload */
  }
  listeners.forEach((l) => l())
}

export const useSession = () =>
  useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => session,
  )

/** Authorization header for API calls. Empty for guests. */
export const authHeader = (): Record<string, string> => (session ? { Authorization: `Bearer ${session.token}` } : {})

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Could not reach the server. Start it with "npm run server".')
  }
  const payload = await res.json().catch(() => null)
  if (res.status === 401 && session && path !== '/auth/login') set(null) // expired token
  if (!res.ok) throw new Error(payload?.error ?? `Request failed (${res.status}).`)
  return payload as T
}

export async function signIn(email: string, password: string) {
  const r = await call<{ token: string; user: User }>('POST', '/auth/login', { email, password })
  set(r)
}
export async function register(name: string, email: string, password: string) {
  const r = await call<{ token: string; user: User }>('POST', '/auth/register', { name, email, password })
  set(r)
}
export const signOut = () => set(null)
export const fetchHistory = () => call<{ items: HistoryItem[] }>('GET', '/history').then((r) => r.items)
export const clearHistory = () => call<{ ok: true }>('DELETE', '/history')
