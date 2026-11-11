/** Shared types for the music feature. Nothing here depends on the rest of the app. */

export interface MusicTrack {
  title: string
  /** Artist names, or the playlist owner in preview mode. */
  artists: string
  album?: string
  artworkUrl?: string
  uri?: string
  /** True when this describes the playlist rather than the song playing (preview mode cannot read the song). */
  isContext?: boolean
}

/**
 * Where sound comes from.
 *  - 'none':    nothing loaded yet (the person has not pressed play this visit).
 *  - 'embed':   Spotify's embedded player. Play and pause only; 30-second previews unless the
 *               person is signed in to Spotify in this browser.
 *  - 'spotify': Web Playback SDK with a connected Premium account. Full control.
 */
export type MusicSource = 'none' | 'embed' | 'spotify'

export type MusicConnection =
  | 'not_configured' // no client id in the environment
  | 'disconnected'
  | 'connecting'
  | 'connected'

export type MusicStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused'

export type MusicErrorCode =
  | 'not_configured'
  | 'insecure_context'
  | 'auth_denied'
  | 'auth_failed'
  | 'session_expired'
  | 'premium_required'
  | 'forbidden'
  | 'no_device'
  | 'network'
  | 'rate_limited'
  | 'player_load_failed'
  | 'playback_failed'
  | 'autoplay_blocked'

export interface MusicError {
  code: MusicErrorCode
  /** Written for the person using the app: what happened and what to do. */
  message: string
}

export interface MusicCapabilities {
  next: boolean
  previous: boolean
  volume: boolean
  seek: boolean
}

export interface MusicPrefs {
  /** Master switch. Off means nothing from Spotify is loaded. */
  enabled: boolean
  /** Show the compact player in the top bar. */
  showPlayer: boolean
  /** 0 to 1. */
  volume: number
  muted: boolean
}

export interface MusicState extends MusicPrefs {
  source: MusicSource
  connection: MusicConnection
  /** Display name and plan of the connected Spotify account. */
  account: { name: string; product: string } | null
  status: MusicStatus
  track: MusicTrack | null
  positionMs: number
  durationMs: number
  can: MusicCapabilities
  error: MusicError | null
}

/* ---------- Minimal shapes of Spotify's browser SDKs (only what is used) ---------- */

export interface SpotifyPlaybackState {
  paused: boolean
  position: number
  duration: number
  track_window: {
    current_track: {
      name: string
      uri: string
      artists: { name: string }[]
      album: { name: string; images: { url: string; width?: number | null }[] }
    } | null
  }
  disallows?: Record<string, boolean | undefined>
}

export interface SpotifyPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: string, cb: (payload: never) => void): void
  getCurrentState(): Promise<SpotifyPlaybackState | null>
  setVolume(volume: number): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  togglePlay(): Promise<void>
  seek(positionMs: number): Promise<void>
  previousTrack(): Promise<void>
  nextTrack(): Promise<void>
  activateElement(): Promise<void>
}

export interface SpotifyEmbedController {
  addListener(event: 'ready' | 'playback_update', cb: (e: { data: { isPaused: boolean; isBuffering: boolean; duration: number; position: number } }) => void): void
  play(): void
  pause(): void
  resume(): void
  togglePlay(): void
  seek(seconds: number): void
  destroy(): void
}

export interface SpotifyIframeApi {
  createController(element: HTMLElement, options: { uri: string; width?: string | number; height?: string | number }, callback: (controller: SpotifyEmbedController) => void): void
}

declare global {
  interface Window {
    Spotify?: { Player: new (options: { name: string; getOAuthToken: (cb: (token: string) => void) => void; volume?: number }) => SpotifyPlayer }
    onSpotifyWebPlaybackSDKReady?: () => void
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void
  }
}
