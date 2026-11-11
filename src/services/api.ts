import { appConfig } from '@/config'

/**
 * BACKEND ACCESS. A small fetch wrapper for the optional Express server in
 * /server (npm run server, port 3001). The app runs without it: data lives in
 * the stores in src/store. Call these from the functions in src/store/index.ts
 * when a problem needs a real backend.
 *
 *   const { data } = await api.get<{ data: Thing[] }>('/data')
 *   await api.post('/data', { title: 'New' })
 */
export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
    const payload = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(payload?.error ?? `Request failed with status ${res.status}.`, res.status)
    return payload as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof Error && err.name === 'AbortError') throw new ApiError('The server took too long to respond.', 408)
    throw new ApiError('Could not reach the server. Check that it is running.')
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  /** Resolves true when the backend answers its health check. */
  health: () =>
    request<{ status: string }>('GET', '/health', undefined, 2500).then(
      (r) => r.status === 'ok',
      () => false,
    ),
}
