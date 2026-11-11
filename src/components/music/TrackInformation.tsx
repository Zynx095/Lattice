import { Music2 } from 'lucide-react'
import { music, useMusic } from '@/services/music/music.player'
import { cn } from '@/lib/utils'

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Three bars that move while music plays. Still when paused or when motion is reduced. */
export function Equalizer({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <span className={cn('flex h-3.5 w-3.5 items-end justify-center gap-[2px]', className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('w-[3px] origin-bottom rounded-[1px] bg-current', playing ? 'animate-eq' : 'opacity-70')}
          style={{ height: playing ? '100%' : `${[45, 80, 60][i]}%`, animationDelay: `${i * -0.35}s` }}
        />
      ))}
    </span>
  )
}

/** Artwork, title, artist and a thin progress bar that can be dragged where seeking is supported. */
export function TrackInformation({ compact = false }: { compact?: boolean }) {
  const { track, positionMs, durationMs, status, can, source } = useMusic()
  const playing = status === 'playing'
  const hasTimeline = durationMs > 0

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <div className={cn('relative shrink-0 overflow-hidden rounded-md border border-border bg-raised', compact ? 'h-10 w-10' : 'h-12 w-12')}>
          {track?.artworkUrl ? (
            <img src={track.artworkUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-subtle">
              <Music2 className="h-5 w-5" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{track?.title ?? 'Nothing playing'}</p>
          <p className="truncate text-sm text-muted-foreground">
            {track ? track.artists : source === 'none' ? 'Press play to start' : 'Waiting for Spotify'}
          </p>
        </div>
        {playing && <Equalizer playing className="shrink-0 text-primary" />}
      </div>

      {hasTimeline && (
        <div className="mt-3">
          <input
            type="range"
            className="range"
            min={0}
            max={durationMs}
            step={1000}
            value={Math.min(positionMs, durationMs)}
            disabled={!can.seek}
            onChange={(e) => music.seek(Number(e.target.value))}
            aria-label="Position in track"
            aria-valuetext={`${clock(positionMs)} of ${clock(durationMs)}`}
            style={{ ['--fill' as string]: `${(positionMs / durationMs) * 100}%` }}
          />
          <div className="num -mt-0.5 flex justify-between text-xs text-subtle">
            <span>{clock(positionMs)}</span>
            <span>{clock(durationMs)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
