import { isOnRedirectOrigin, isSpotifyConfigured, musicConfig } from './music.config'
import type { MusicError, MusicErrorCode } from './music.types'

/**
 * Spotify sign-in (Authorization Code with PKCE) and the few Web API calls the
 * player needs. No client secret is involved anywhere.
 *
 * Tokens are kept in localStorage so a refresh keeps the session. They grant
 * playback control only (see `scopes`), and Disconnect removes them.
 */

const key = (name: string) => `${musicConfig.storagePrefix}:${name}`
const K = { verifier: key('pkce_verifier'), state: key('pkce_state'), returnTo: key('return_to'), tokens: key('tokens') }

const MESSAGES: Record<MusicErrorCode, string> = {
  not_configured: 'Spotify sign-in is not set up. Add VITE_SPOTIFY_CLIENT_ID to .env.local and restart the dev server.',
  insecure_context: 'Spotify sign-in needs a secure page. Open the app at http://127.0.0.1:3000 or over HTTPS.',
  auth_denied: 'Access was declined on the Spotify page, so nothing was connected.',
  auth_failed: 'Spotify sign-in did not complete. Try connecting again.',
  session_expired: 'Your Spotify session ended. Connect again to keep full playback control.',
  premium_required: 'Spotify only allows in-browser playback control with a Premium account. The preview player is used instead.',
  forbidden: 'Spotify refused this action. Disconnect, then connect again to grant playback permission.',
  no_device: 'Spotify cannot see this browser as a player yet. Wait a moment and press play again.',
  network: 'Could not reach Spotify. Check your connection and try again.',
  rate_limited: 'Spotify is limiting requests right now. Wait a few seconds and try again.',
  player_load_failed: 'The Spotify player could not load. A content blocker or network filter may be stopping it.',
  playback_failed: 'Spotify could not play this. Try the next track, or press play again.',
  autoplay_blocked: 'The browser blocked playback. Press play once more to start it.',
}

export class SpotifyError extends Error implements MusicError {
  constructor(public code: MusicErrorCode, message?: string) {
    super(message ?? MESSAGES[code])
    this.name = 'SpotifyError'
  }
}

export const toMusicError = (err: unknown): MusicError =>
  err instanceof SpotifyError ? { code: err.code, message: err.message } : { code: 'network', message: MESSAGES.network }

export const musicError = (code: MusicErrorCode): MusicError => ({ code, message: MESSAGES[code] })

/* ---------- Token storage ---------- */

interface Tokens {
  accessToken: string
  refreshToken?: string
  /** Epoch milliseconds. */
  expiresAt: number
}

function readTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(K.tokens)
    return raw ? (JSON.parse(raw) as Tokens) : null
  } catch {
    return null
  }
}

function writeTokens(body: { access_token: string; refresh_token?: string; expires_in: number }, previous?: Tokens | null) {
  const tokens: Tokens = {
    accessToken: body.access_token,
    // Spotify may omit a new refresh token; the old one stays valid then.
    refreshToken: body.refresh_token ?? previous?.refreshToken,
    expiresAt: Date.now() + body.expires_in * 1000,
  }
  localStorage.setItem(K.tokens, JSON.stringify(tokens))
  return tokens
}

export const hasSession = () => readTokens() !== null

export function logout() {
  Object.values(K).forEach((k) => localStorage.removeItem(k))
}

/* ---------- PKCE ---------- */

function randomString(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => chars[b % chars.length]).join('')
}

async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Sends the browser to Spotify to sign in. `returnTo` is the in-app path to
 * come back to. If the app is open on an origin Spotify will not redirect to
 * (for example localhost), it first moves to the registered origin and
 * continues from there.
 */
export async function beginLogin(returnTo: string): Promise<void> {
  if (!isSpotifyConfigured()) throw new SpotifyError('not_configured')

  if (!isOnRedirectOrigin()) {
    const target = new URL(musicConfig.redirectUri)
    target.searchParams.set('spotify', 'connect')
    target.searchParams.set('return', returnTo)
    window.location.assign(target.toString())
    return
  }
  if (!window.isSecureContext || !crypto?.subtle) throw new SpotifyError('insecure_context')

  const verifier = randomString(64)
  const state = randomString(16)
  localStorage.setItem(K.verifier, verifier)
  localStorage.setItem(K.state, state)
  localStorage.setItem(K.returnTo, returnTo)

  const url = new URL('https://accounts.spotify.com/authorize')
  url.search = new URLSearchParams({
    client_id: musicConfig.clientId,
    response_type: 'code',
    redirect_uri: musicConfig.redirectUri,
    scope: musicConfig.scopes.join(' '),
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
    state,
  }).toString()
  window.location.assign(url.toString())
}

async function tokenRequest(params: Record<string, string>) {
  let res: Response
  try {
    res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: musicConfig.clientId, ...params }),
    })
  } catch {
    throw new SpotifyError('network')
  }
  if (!res.ok) throw new SpotifyError(res.status === 400 || res.status === 401 ? 'session_expired' : 'auth_failed')
  return (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number }
}

export type RedirectResult =
  | { kind: 'none' }
  | { kind: 'continuing' } // hopped origins; a redirect to Spotify is under way
  | { kind: 'connected'; returnTo: string }
  | { kind: 'error'; error: MusicError; returnTo: string }

/**
 * Call once when the app starts. Finishes a sign-in if the URL carries
 * Spotify's answer, and removes the one-time parameters from the address bar.
 */
export async function completeLoginFromUrl(): Promise<RedirectResult> {
  const params = new URLSearchParams(window.location.search)

  if (params.get('spotify') === 'connect') {
    const returnTo = params.get('return') || '/'
    window.history.replaceState(null, '', window.location.pathname)
    try {
      await beginLogin(returnTo)
      return { kind: 'continuing' }
    } catch (err) {
      return { kind: 'error', error: toMusicError(err), returnTo }
    }
  }

  const code = params.get('code')
  const denied = params.get('error')
  const state = params.get('state')
  const expected = localStorage.getItem(K.state)
  // Only react to redirects this app started.
  if ((!code && !denied) || !state || !expected) return { kind: 'none' }

  const returnTo = localStorage.getItem(K.returnTo) || '/'
  const verifier = localStorage.getItem(K.verifier)
  ;[K.state, K.verifier, K.returnTo].forEach((k) => localStorage.removeItem(k))
  window.history.replaceState(null, '', window.location.pathname)

  if (state !== expected || !verifier) return { kind: 'error', error: musicError('auth_failed'), returnTo }
  if (denied || !code) return { kind: 'error', error: musicError(denied === 'access_denied' ? 'auth_denied' : 'auth_failed'), returnTo }

  try {
    writeTokens(await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: musicConfig.redirectUri, code_verifier: verifier }))
    return { kind: 'connected', returnTo }
  } catch (err) {
    const error = toMusicError(err)
    return { kind: 'error', error: error.code === 'session_expired' ? musicError('auth_failed') : error, returnTo }
  }
}

let refreshing: Promise<Tokens> | null = null

/** A valid access token, refreshed when it is about to expire. Throws `session_expired` when the session cannot be renewed. */
export async function getAccessToken(): Promise<string> {
  const tokens = readTokens()
  if (!tokens) throw new SpotifyError('session_expired')
  if (tokens.expiresAt - Date.now() > 60_000) return tokens.accessToken
  if (!tokens.refreshToken) {
    logout()
    throw new SpotifyError('session_expired')
  }
  // One refresh at a time, shared by concurrent callers.
  refreshing ??= tokenRequest({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken })
    .then((body) => writeTokens(body, tokens))
    .catch((err) => {
      if (err instanceof SpotifyError && err.code === 'session_expired') logout()
      throw err
    })
    .finally(() => {
      refreshing = null
    })
  return (await refreshing).accessToken
}

/* ---------- Web API ---------- */

async function api<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const token = await getAccessToken()
  let res: Response
  try {
    res = await fetch(`https://api.spotify.com/v1${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new SpotifyError('network')
  }
  if (res.status === 401) {
    logout()
    throw new SpotifyError('session_expired')
  }
  if (res.status === 403) {
    const reason = await res.json().then((j) => j?.error?.reason as string | undefined, () => undefined)
    throw new SpotifyError(reason === 'PREMIUM_REQUIRED' ? 'premium_required' : 'forbidden')
  }
  if (res.status === 404) throw new SpotifyError('no_device')
  if (res.status === 429) throw new SpotifyError('rate_limited')
  if (!res.ok) throw new SpotifyError('playback_failed')
  if (res.status === 204 || res.headers.get('content-length') === '0') return null
  return res.json().catch(() => null) as Promise<T | null>
}

export const getProfile = () => api<{ display_name: string | null; id: string; product?: string }>('GET', '/me')

/** Makes this browser the active Spotify device, resuming whatever the account last played. */
export const transferPlayback = (deviceId: string, play: boolean) => api('PUT', '/me/player', { device_ids: [deviceId], play })

/** Starts the configured playlist on this browser. */
export const playContext = (deviceId: string, contextUri: string) =>
  api('PUT', `/me/player/play?device_id=${encodeURIComponent(deviceId)}`, { context_uri: contextUri })

/** Title of a playlist, album or artist, without signing in. */
export async function describeContext(uri: string): Promise<{ title: string; artworkUrl?: string } | null> {
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(uri)}`)
    if (!res.ok) return null
    const body = (await res.json()) as { title?: string; thumbnail_url?: string }
    return body.title ? { title: body.title, artworkUrl: body.thumbnail_url } : null
  } catch {
    return null
  }
}
