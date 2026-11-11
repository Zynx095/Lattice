import { useSyncExternalStore } from 'react'
import { isOnRedirectOrigin, isSpotifyConfigured, musicConfig } from './music.config'
import type { MusicError, MusicPrefs, MusicState, SpotifyEmbedController, SpotifyIframeApi, SpotifyPlaybackState, SpotifyPlayer } from './music.types'
import * as spotify from './spotify.service'

/**
 * THE MUSIC PLAYER. One instance for the whole app, living outside React, so
 * playback survives navigation, theme changes and the 3D scene being switched
 * off. Components read state with `useMusic()` and call the `music` actions.
 *
 * Two ways of producing sound, chosen automatically:
 *
 *   Connected Premium account  ->  Spotify Web Playback SDK: play, pause, next,
 *                                  previous, seek, volume, full track details.
 *   Otherwise                  ->  Spotify's embedded player: play and pause.
 *                                  Spotify decides whether that is full tracks
 *                                  or 30-second previews.
 *
 * Nothing is requested from Spotify until the person presses play for the
 * first time in a visit, and playback never starts on its own.
 */

/* ---------- State ---------- */

const PREFS_KEY = `${musicConfig.storagePrefix}:prefs`
const defaultPrefs: MusicPrefs = { enabled: true, showPlayer: true, volume: 0.6, muted: false }

function loadPrefs(): MusicPrefs {
  try {
    return { ...defaultPrefs, ...(JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<MusicPrefs>) }
  } catch {
    return defaultPrefs
  }
}

const EMBED_CAN = { next: false, previous: false, volume: false, seek: true }
const SDK_CAN = { next: true, previous: true, volume: true, seek: true }

let state: MusicState = {
  ...loadPrefs(),
  source: 'none',
  connection: !isSpotifyConfigured() ? 'not_configured' : spotify.hasSession() ? 'connected' : 'disconnected',
  account: null,
  status: 'idle',
  track: null,
  positionMs: 0,
  durationMs: 0,
  can: EMBED_CAN,
  error: null,
}

const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const getState = () => state

function set(patch: Partial<MusicState>) {
  state = { ...state, ...patch }
  if ('enabled' in patch || 'showPlayer' in patch || 'volume' in patch || 'muted' in patch) {
    try {
      const { enabled, showPlayer, volume, muted } = state
      localStorage.setItem(PREFS_KEY, JSON.stringify({ enabled, showPlayer, volume, muted }))
    } catch {
      /* storage blocked: preferences last for this visit */
    }
  }
  listeners.forEach((l) => l())
}

const fail = (error: MusicError) => set({ error, status: state.status === 'loading' ? 'idle' : state.status })

/** React hook: the current music state. Re-renders on change. */
export const useMusic = () => useSyncExternalStore(subscribe, getState)

/* ---------- Script loading ---------- */

const scripts = new Map<string, Promise<void>>()
function loadScript(src: string): Promise<void> {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise<void>((resolve, reject) => {
        const el = document.createElement('script')
        el.src = src
        el.async = true
        el.onload = () => resolve()
        el.onerror = () => {
          scripts.delete(src)
          el.remove()
          reject(new spotify.SpotifyError('player_load_failed'))
        }
        document.head.appendChild(el)
      }),
    )
  }
  return scripts.get(src)!
}

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new spotify.SpotifyError('player_load_failed')), ms))])

/* ---------- Embedded player (preview mode) ---------- */

let embedHost: HTMLElement | null = null
let embedApi: Promise<SpotifyIframeApi> | null = null
let embed: SpotifyEmbedController | null = null
let embedReady: Promise<void> | null = null

function getEmbedApi() {
  embedApi ??= new Promise<SpotifyIframeApi>((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve
    loadScript('https://open.spotify.com/embed/iframe-api/v1').catch(reject)
  })
  embedApi.catch(() => {
    embedApi = null
  })
  return embedApi
}

function startEmbed(): Promise<void> {
  if (embedReady) return embedReady
  set({ source: 'embed', can: EMBED_CAN, status: 'loading', track: state.track ?? { title: musicConfig.contextName, artists: 'Spotify playlist', isContext: true } })

  // The playlist title comes from a public endpoint; the song itself is only shown inside Spotify's frame.
  void spotify.describeContext(musicConfig.contextUri).then((info) => {
    if (info && state.source === 'embed') set({ track: { title: info.title, artists: 'Spotify playlist', artworkUrl: info.artworkUrl, uri: musicConfig.contextUri, isContext: true } })
  })

  embedReady = withTimeout(
    getEmbedApi().then(
      (api) =>
        new Promise<void>((resolve, reject) => {
          if (!embedHost) return reject(new spotify.SpotifyError('player_load_failed'))
          const slot = document.createElement('div')
          embedHost.replaceChildren(slot)
          api.createController(slot, { uri: musicConfig.contextUri, width: '100%', height: 152 }, (controller) => {
            embed = controller
            controller.addListener('ready', () => {
              if (state.status === 'loading') set({ status: 'ready' })
              resolve()
            })
            controller.addListener('playback_update', (e) => {
              const { isPaused, isBuffering, position, duration } = e.data
              // Before the first play Spotify reports a paused player at 0:00; keep that as "ready".
              const started = position > 0 || !isPaused
              set({
                status: isBuffering ? 'loading' : !isPaused ? 'playing' : started ? 'paused' : 'ready',
                positionMs: position,
                durationMs: duration,
                ...(!isPaused ? { error: null } : {}),
              })
            })
          })
        }),
    ),
    12_000,
  )
  embedReady.catch(() => {
    embedReady = null
  })
  return embedReady
}

function stopEmbed() {
  try {
    embed?.destroy()
  } catch {
    /* already gone */
  }
  embed = null
  embedReady = null
  embedHost?.replaceChildren()
}

/* ---------- Web Playback SDK (connected Premium account) ---------- */

let player: SpotifyPlayer | null = null
let deviceId: string | null = null
let sdkReady: Promise<void> | null = null
let ticker: number | undefined
let playerName = 'Web player'

function applySdkState(s: SpotifyPlaybackState | null) {
  if (!s) return
  const t = s.track_window.current_track
  set({
    status: s.paused ? 'paused' : 'playing',
    positionMs: s.position,
    durationMs: s.duration,
    track: t
      ? {
          title: t.name,
          artists: t.artists.map((a) => a.name).join(', '),
          album: t.album.name,
          // Smallest image that is still sharp at 2x in a 48px slot.
          artworkUrl: [...t.album.images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0)).find((i) => (i.width ?? 0) >= 96)?.url ?? t.album.images[0]?.url,
          uri: t.uri,
        }
      : state.track,
    ...(!s.paused ? { error: null } : {}),
  })
  window.clearInterval(ticker)
  // The SDK only reports on changes, so the progress bar is advanced locally while playing.
  if (!s.paused) ticker = window.setInterval(() => set({ positionMs: Math.min(state.durationMs, state.positionMs + 1000) }), 1000)
}

/** The SDK cannot be used with this account or session: say why, and carry on with the preview player. */
function fallBackToEmbed(error: MusicError, wasPlaying: boolean) {
  stopSdk()
  set({ error, source: 'none' })
  if (error.code === 'session_expired') set({ connection: 'disconnected', account: null })
  if (wasPlaying) void startEmbed().catch((err) => fail(spotify.toMusicError(err)))
}

function startSdk(): Promise<void> {
  if (sdkReady) return sdkReady
  set({ source: 'spotify', can: SDK_CAN, status: 'loading' })

  sdkReady = withTimeout(
    new Promise<void>((resolve, reject) => {
      const create = () => {
        if (!window.Spotify) return reject(new spotify.SpotifyError('player_load_failed'))
        const p = new window.Spotify.Player({
          name: playerName,
          getOAuthToken: (cb) => {
            spotify.getAccessToken().then(cb, (err) => fallBackToEmbed(spotify.toMusicError(err), false))
          },
          volume: state.muted ? 0 : state.volume,
        })
        const on = (event: string, cb: (payload: never) => void) => p.addListener(event, cb)
        on('ready', ((e: { device_id: string }) => {
          deviceId = e.device_id
          if (state.status === 'loading') set({ status: 'ready' })
          resolve()
        }) as never)
        on('not_ready', (() => {
          deviceId = null
        }) as never)
        on('player_state_changed', applySdkState as never)
        on('initialization_error', (() => reject(new spotify.SpotifyError('player_load_failed'))) as never)
        on('authentication_error', (() => {
          spotify.logout()
          reject(new spotify.SpotifyError('session_expired'))
        }) as never)
        on('account_error', (() => reject(new spotify.SpotifyError('premium_required'))) as never)
        on('playback_error', (() => fail(spotify.musicError('playback_failed'))) as never)
        on('autoplay_failed', (() => fail(spotify.musicError('autoplay_blocked'))) as never)
        player = p
        p.connect().then((ok) => !ok && reject(new spotify.SpotifyError('player_load_failed')))
      }
      if (window.Spotify) create()
      else {
        window.onSpotifyWebPlaybackSDKReady = create
        loadScript('https://sdk.scdn.co/spotify-player.js').catch(reject)
      }
    }),
    15_000,
  )
  sdkReady.catch(() => {
    sdkReady = null
  })
  return sdkReady
}

function stopSdk() {
  window.clearInterval(ticker)
  try {
    player?.disconnect()
  } catch {
    /* already gone */
  }
  player = null
  deviceId = null
  sdkReady = null
}

async function playSdk() {
  await startSdk()
  if (!player || !deviceId) throw new spotify.SpotifyError('no_device')
  // Lets browsers that require a gesture (Safari, mobile) attach audio to this click.
  void player.activateElement().catch(() => undefined)

  if (await player.getCurrentState()) {
    await player.resume()
    return
  }
  // This browser is not the active Spotify device yet: take over, resuming what the account last played.
  await spotify.transferPlayback(deviceId, true)
  await new Promise((r) => setTimeout(r, 1500))
  const now = await player.getCurrentState()
  if (!now || !now.track_window.current_track) await spotify.playContext(deviceId, musicConfig.contextUri)
}

/* ---------- Public actions ---------- */

let initialised: Promise<spotify.RedirectResult> | null = null

async function loadAccount() {
  try {
    const profile = await spotify.getProfile()
    if (profile) set({ account: { name: profile.display_name || profile.id, product: profile.product ?? 'unknown' } })
  } catch (err) {
    const error = spotify.toMusicError(err)
    if (error.code === 'session_expired') set({ connection: 'disconnected', account: null, error })
  }
}

function teardown() {
  stopSdk()
  stopEmbed()
  set({ source: 'none', status: 'idle', positionMs: 0, durationMs: 0, track: null })
}

export const music = {
  /**
   * Call once at start-up. Finishes a Spotify sign-in if the page was opened
   * by Spotify's redirect, and returns where the app should navigate back to.
   */
  init(options: { playerName?: string } = {}): Promise<spotify.RedirectResult> {
    if (options.playerName) playerName = options.playerName
    initialised ??= spotify.completeLoginFromUrl().then((result) => {
      if (result.kind === 'connected') set({ connection: 'connected', error: null })
      if (result.kind === 'error') set({ error: result.error })
      if (state.connection === 'connected') void loadAccount()
      return result
    })
    return initialised
  },

  /** The element the embedded player is placed in. It must stay in the document while music is enabled. */
  attachEmbedHost(el: HTMLElement | null) {
    embedHost = el
  },

  /** True when sign-in has to continue on another address (Spotify does not redirect to "localhost"). */
  needsOriginHop: () => isSpotifyConfigured() && !isOnRedirectOrigin(),

  async connect(returnTo: string) {
    set({ connection: 'connecting', error: null })
    try {
      await spotify.beginLogin(returnTo)
    } catch (err) {
      set({ connection: isSpotifyConfigured() ? 'disconnected' : 'not_configured', error: spotify.toMusicError(err) })
    }
  },

  disconnect() {
    const wasSpotify = state.source === 'spotify'
    spotify.logout()
    if (wasSpotify) teardown()
    set({ connection: isSpotifyConfigured() ? 'disconnected' : 'not_configured', account: null, error: null, can: EMBED_CAN })
  },

  /** Starts playback. Must be called from a click or key press. */
  async play() {
    if (!state.enabled) return
    set({ error: null })
    try {
      if (state.connection === 'connected' && state.source !== 'embed') {
        try {
          await playSdk()
          return
        } catch (err) {
          const error = spotify.toMusicError(err)
          // Problems with the account or session end SDK use; anything else is reported as is.
          if (!['premium_required', 'session_expired', 'player_load_failed'].includes(error.code)) throw err
          fallBackToEmbed(error, false)
        }
      }
      await startEmbed()
      if (state.positionMs > 0) embed?.resume()
      else embed?.play()
    } catch (err) {
      fail(spotify.toMusicError(err))
    }
  },

  async pause() {
    try {
      if (state.source === 'spotify') await player?.pause()
      else embed?.pause()
    } catch (err) {
      fail(spotify.toMusicError(err))
    }
  },

  toggle() {
    return state.status === 'playing' ? music.pause() : music.play()
  },

  async next() {
    if (state.can.next) await player?.nextTrack().catch((err) => fail(spotify.toMusicError(err)))
  },

  async previous() {
    if (state.can.previous) await player?.previousTrack().catch((err) => fail(spotify.toMusicError(err)))
  },

  seek(positionMs: number) {
    set({ positionMs })
    if (state.source === 'spotify') void player?.seek(positionMs).catch(() => undefined)
    else embed?.seek(Math.round(positionMs / 1000))
  },

  setVolume(volume: number) {
    const v = Math.min(1, Math.max(0, volume))
    set({ volume: v, muted: v === 0 })
    void player?.setVolume(v).catch(() => undefined)
  },

  setMuted(muted: boolean) {
    set({ muted })
    void player?.setVolume(muted ? 0 : state.volume).catch(() => undefined)
  },

  setEnabled(enabled: boolean) {
    if (!enabled) teardown()
    set({ enabled, error: null })
  },

  setShowPlayer(showPlayer: boolean) {
    set({ showPlayer })
  },

  dismissError() {
    set({ error: null })
  },
}
