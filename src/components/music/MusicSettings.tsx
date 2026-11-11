import { useLocation } from 'react-router-dom'
import { isSpotifyConfigured, musicConfig } from '@/services/music/music.config'
import { music, useMusic } from '@/services/music/music.player'
import { Badge, Button, Switch } from '@/components/ui'
import { MusicControls } from './MusicControls'
import { MusicErrorNote } from './MusicPlayer'
import { TrackInformation } from './TrackInformation'

const planLabel = (product: string) => (product === 'premium' ? 'Premium' : product === 'unknown' ? 'Plan not reported' : `${product.charAt(0).toUpperCase()}${product.slice(1)} plan`)

/** Body of the Music section in Settings. Self-contained: drop it into any panel. */
export function MusicSettings() {
  const state = useMusic()
  const { pathname } = useLocation()
  const redirectHost = (() => {
    try {
      return new URL(musicConfig.redirectUri).host
    } catch {
      return musicConfig.redirectUri
    }
  })()

  return (
    <div className="space-y-5">
      <Switch
        label="Background music"
        description="Optional. Nothing is loaded from Spotify until you press play, and music never starts by itself."
        checked={state.enabled}
        onChange={music.setEnabled}
      />
      <Switch
        label="Show player in the top bar"
        description="Hide it to keep the bar clear. Music keeps playing and stays controllable here."
        checked={state.showPlayer}
        disabled={!state.enabled}
        onChange={music.setShowPlayer}
      />

      {state.enabled && (
        <div className="space-y-4 border-t border-border pt-5">
          <TrackInformation />
          <MusicControls />
          <MusicErrorNote />
        </div>
      )}

      <div className="border-t border-border pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              Spotify
              {state.connection === 'connected' ? (
                <Badge tone="success">Connected</Badge>
              ) : state.connection === 'connecting' ? (
                <Badge tone="info">Connecting</Badge>
              ) : state.connection === 'not_configured' ? (
                <Badge tone="warning">Not set up</Badge>
              ) : (
                <Badge>Not connected</Badge>
              )}
            </p>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              {state.connection === 'connected' ? (
                <>
                  {state.account ? `Signed in as ${state.account.name}. ${planLabel(state.account.product)}.` : 'Signed in.'}{' '}
                  {state.account && state.account.product !== 'premium' && state.account.product !== 'unknown'
                    ? 'Spotify gives in-browser control to Premium accounts only, so the preview player is used.'
                    : 'Next, previous, seek and volume are available.'}
                </>
              ) : state.connection === 'not_configured' ? (
                <>
                  Without a connection you get Spotify’s preview player: play and pause, with full tracks only if you are signed in to Spotify in this browser. To enable sign-in, add{' '}
                  <code className="font-mono text-xs text-foreground">VITE_SPOTIFY_CLIENT_ID</code> to <code className="font-mono text-xs text-foreground">.env.local</code> and register{' '}
                  <code className="break-all font-mono text-xs text-foreground">{musicConfig.redirectUri}</code> as a redirect URI in the Spotify dashboard.
                </>
              ) : (
                <>
                  Connect a Premium account for next, previous, seek and volume. Until then the preview player handles play and pause.
                  {music.needsOriginHop() && ` Spotify only signs in from ${redirectHost}, so connecting reopens the app at that address.`}
                </>
              )}
            </p>
          </div>
          {state.connection === 'connected' ? (
            <Button variant="secondary" onClick={music.disconnect}>Disconnect Spotify</Button>
          ) : (
            <Button variant="secondary" disabled={!isSpotifyConfigured()} isLoading={state.connection === 'connecting'} onClick={() => music.connect(pathname)}>
              Connect Spotify
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
