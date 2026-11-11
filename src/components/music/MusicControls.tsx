import { Loader2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { music, useMusic } from '@/services/music/music.player'
import { Button } from '@/components/ui'

/**
 * Transport and volume. Only controls the current player can honour are shown:
 * the preview player gets play and pause, a connected Premium account gets the
 * full set. Nothing is shown that would not work.
 */
export function MusicControls({ showVolume = true }: { showVolume?: boolean }) {
  const { status, can, volume, muted, enabled } = useMusic()
  const playing = status === 'playing'
  const loading = status === 'loading'
  const full = can.next || can.previous

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex items-center gap-1">
        {full && (
          <Button variant="ghost" size="icon" disabled={!can.previous || !enabled} onClick={() => music.previous()} aria-label="Previous track" title="Previous track">
            <SkipBack />
          </Button>
        )}
        <Button size="icon" disabled={!enabled} onClick={() => music.toggle()} aria-label={playing ? 'Pause music' : 'Play music'} className="rounded-full">
          {loading ? <Loader2 className="animate-spin" /> : playing ? <Pause /> : <Play className="translate-x-px" />}
        </Button>
        {full && (
          <Button variant="ghost" size="icon" disabled={!can.next || !enabled} onClick={() => music.next()} aria-label="Next track" title="Next track">
            <SkipForward />
          </Button>
        )}
      </div>

      {showVolume && can.volume && (
        <div className="flex min-w-[9rem] flex-1 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!enabled}
            onClick={() => music.setMuted(!muted)}
            aria-label={muted ? 'Unmute' : 'Mute'}
            aria-pressed={muted}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
          </Button>
          <input
            type="range"
            className="range"
            min={0}
            max={100}
            value={muted ? 0 : Math.round(volume * 100)}
            disabled={!enabled}
            onChange={(e) => music.setVolume(Number(e.target.value) / 100)}
            aria-label="Volume"
            style={{ ['--fill' as string]: `${muted ? 0 : volume * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
