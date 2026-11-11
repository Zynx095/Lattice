import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Music2, TriangleAlert, X } from 'lucide-react'
import { appConfig } from '@/config'
import { music, useMusic } from '@/services/music/music.player'
import { cn } from '@/lib/utils'
import { Button, useDismiss, useToast } from '@/components/ui'
import { MusicControls } from './MusicControls'
import { Equalizer, TrackInformation } from './TrackInformation'

// The sign-in result is announced once, even if the shell mounts twice (React strict mode).
let announced = false

/** Inline message for the current music error, with a way to clear it. */
export function MusicErrorNote() {
  const { error } = useMusic()
  if (!error) return null
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="min-w-0 flex-1">{error.message}</p>
      <button type="button" onClick={music.dismissError} aria-label="Dismiss" className="rounded p-0.5 text-subtle hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/**
 * The compact player in the top bar: one button that opens a small panel.
 *
 * Mounted once by the shell and never unmounted while music is enabled, so
 * the embedded Spotify frame (which lives inside the panel) keeps playing
 * while the panel is closed, the route changes or the theme switches.
 */
export function MusicPlayer({ settingsPath }: { settingsPath?: string }) {
  const state = useMusic()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  // Finish a Spotify sign-in if the page was opened by its redirect, then return to where the person was.
  useEffect(() => {
    void music.init({ playerName: `${appConfig.name} web player` }).then((result) => {
      if (announced) return
      announced = true
      if (result.kind === 'connected') {
        toast.success('Spotify connected')
        navigate(result.returnTo, { replace: true })
      } else if (result.kind === 'error') {
        toast.error(result.error.message, 'Spotify was not connected')
        navigate(result.returnTo, { replace: true })
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!state.enabled) return null

  const playing = state.status === 'playing'
  const visible = state.showPlayer
  const preview = state.source !== 'spotify'
  const label = playing ? `Music, playing ${state.track?.title ?? ''}`.trim() : 'Music'

  return (
    <div ref={ref} className={cn('relative', !visible && 'pointer-events-none fixed -left-[200vw] top-0 opacity-0')} aria-hidden={!visible || undefined}>
      <Button variant="ghost" size="icon" aria-label={label} aria-expanded={open} aria-haspopup="dialog" tabIndex={visible ? 0 : -1} onClick={() => setOpen((v) => !v)} className={cn(playing && 'text-primary')}>
        {playing ? <Equalizer playing /> : <Music2 />}
      </Button>

      <div
        role="dialog"
        aria-label="Music player"
        aria-hidden={!open}
        // Kept in the document while closed so the Spotify frame is not torn down.
        className={cn(
          'absolute right-0 top-11 z-40 w-80 origin-top-right rounded-lg border border-border-strong bg-overlay p-4 shadow-pop transition-[opacity,transform] duration-150 max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-14 max-sm:w-auto',
          open ? 'opacity-100' : 'pointer-events-none invisible -translate-y-1 opacity-0',
        )}
      >
        <div className="space-y-4">
          {/* In preview mode Spotify's own frame shows the song; with a connected account the app draws it. */}
          {state.source === 'spotify' && <TrackInformation />}
          {state.source === 'none' && <TrackInformation />}
          <div
            ref={music.attachEmbedHost}
            className={cn('overflow-hidden rounded-xl [&_iframe]:block', state.source === 'embed' ? 'h-[152px] bg-raised' : 'h-0')}
          />

          <MusicControls />
          <MusicErrorNote />

          {preview && (
            <p className="text-sm text-muted-foreground">
              {state.connection === 'connected'
                ? 'Playing through Spotify’s preview player.'
                : 'Preview player. Change track inside the Spotify frame; volume follows your device. Connect Spotify Premium for full control here.'}
            </p>
          )}

          {settingsPath && (
            <div className="-mx-4 -mb-4 border-t border-border px-4 py-2.5">
              <Link to={`${settingsPath}#music`} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Music settings
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
