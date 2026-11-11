/**
 * MUSIC CONFIGURATION. Read from environment variables; see .env.example.
 *
 * Only the Spotify *client id* is used. It is a public identifier, safe in a
 * browser bundle. The client secret is never needed and must never be added:
 * sign-in uses the Authorization Code flow with PKCE, which is designed for
 * apps that cannot keep a secret.
 *
 * Spotify dashboard setup (developer.spotify.com/dashboard → your app):
 *   - Redirect URI: exactly the value of `redirectUri` below.
 *     Spotify accepts http only for the loopback address 127.0.0.1, not for
 *     "localhost", so the app must be opened at http://127.0.0.1:3000 to sign in.
 *   - APIs used: Web API and Web Playback SDK.
 *   - Playback control in the browser needs a Spotify Premium account.
 */
export const musicConfig = {
  clientId: (import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '').trim(),

  redirectUri: (import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? '').trim() || 'http://127.0.0.1:3000/',

  /** What is asked of the account: stream in this browser, read the profile (to check the plan), control playback. */
  scopes: ['streaming', 'user-read-email', 'user-read-private', 'user-read-playback-state', 'user-modify-playback-state'],

  /**
   * The playlist, album or artist to play. Used by the preview player, and by
   * the full player when the account has nothing to resume.
   */
  contextUri: (import.meta.env.VITE_SPOTIFY_CONTEXT_URI ?? '').trim() || 'spotify:playlist:37i9dQZF1DWZeKCadgRdKQ',
  /** Shown until Spotify returns the real title. */
  contextName: 'Deep Focus',

  /** localStorage key prefix for preferences and tokens. */
  storagePrefix: 'music',
} as const

export const isSpotifyConfigured = () => musicConfig.clientId.length > 0

/** True when this page's origin is the one registered with Spotify, so sign-in can start here. */
export const isOnRedirectOrigin = () => {
  try {
    return new URL(musicConfig.redirectUri).origin === window.location.origin
  } catch {
    return false
  }
}
