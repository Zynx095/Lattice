import React, { useMemo } from 'react'
import type { Tone } from '@/data/models'
import { cn } from '@/lib/utils'

/**
 * MAP INTEGRATION INTERFACE.
 *
 * Pages render <MapView points=... /> and never talk to a map library. The
 * default renderer is SchematicMap: an SVG plot of the coordinates with no
 * tiles, no network and no API key.
 *
 * To use a real provider (Leaflet + OpenStreetMap needs no key):
 *   1. npm i leaflet react-leaflet@4 @types/leaflet
 *   2. Write a component that accepts MapRendererProps and draws markers.
 *   3. Pass it as <MapView renderer={LeafletMap} /> or change `defaultRenderer`.
 */
export interface MapPoint {
  id: string
  label: string
  lat: number
  lng: number
  tone?: Tone
}

export interface MapRendererProps {
  points: MapPoint[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  /** Drawn differently from points: the viewer's own position. */
  userLocation?: { lat: number; lng: number } | null
  height: number
}

export type MapRenderer = React.ComponentType<MapRendererProps>

const toneFill: Record<Tone, string> = {
  neutral: 'hsl(var(--muted-foreground))',
  info: 'hsl(var(--info))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--danger))',
}

/** Round graticule step that gives roughly four lines across a span. */
function gridStep(span: number): number {
  const rough = span / 4
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  return [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? pow * 10
}

export function SchematicMap({ points, selectedId, onSelect, userLocation, height }: MapRendererProps) {
  const W = 800
  const H = height
  const pad = 56

  const view = useMemo(() => {
    const all = [...points, ...(userLocation ? [userLocation] : [])]
    if (all.length === 0) return null
    let minLat = Math.min(...all.map((p) => p.lat))
    let maxLat = Math.max(...all.map((p) => p.lat))
    let minLng = Math.min(...all.map((p) => p.lng))
    let maxLng = Math.max(...all.map((p) => p.lng))
    // A single point still needs an area to sit in.
    if (maxLat - minLat < 0.002) { minLat -= 0.01; maxLat += 0.01 }
    if (maxLng - minLng < 0.002) { minLng -= 0.01; maxLng += 0.01 }

    // Equirectangular projection, corrected for latitude so shapes are not stretched.
    const k = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180))
    const scale = Math.min((W - pad * 2) / ((maxLng - minLng) * k), (H - pad * 2) / (maxLat - minLat))
    const cx = (minLng + maxLng) / 2
    const cy = (minLat + maxLat) / 2
    const project = (lat: number, lng: number): [number, number] => [W / 2 + (lng - cx) * k * scale, H / 2 - (lat - cy) * scale]
    const unproject = (x: number, y: number) => ({ lng: cx + (x - W / 2) / (k * scale), lat: cy - (y - H / 2) / scale })

    const tl = unproject(0, 0)
    const br = unproject(W, H)
    const step = gridStep(Math.max(tl.lat - br.lat, br.lng - tl.lng))
    const decimals = Math.max(0, -Math.floor(Math.log10(step)))
    const lats: number[] = []
    for (let v = Math.ceil(br.lat / step) * step; v <= tl.lat; v += step) lats.push(v)
    const lngs: number[] = []
    for (let v = Math.ceil(tl.lng / step) * step; v <= br.lng; v += step) lngs.push(v)
    return { project, lats, lngs, decimals }
  }, [points, userLocation, H])

  if (!view) {
    return <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>No locations to plot.</div>
  }

  const user = userLocation ? view.project(userLocation.lat, userLocation.lng) : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height }} role="group" aria-label="Schematic plot of locations">
      {view.lats.map((lat) => {
        const y = view.project(lat, 0)[1]
        return (
          <g key={`lat${lat}`}>
            <line x1={0} x2={W} y1={y} y2={y} stroke="hsl(var(--border))" strokeWidth={1} />
            <text x={8} y={y - 5} fontSize={11} fill="hsl(var(--subtle))" className="num">{lat.toFixed(view.decimals)}°</text>
          </g>
        )
      })}
      {view.lngs.map((lng) => {
        const x = view.project(0, lng)[0]
        return (
          <g key={`lng${lng}`}>
            <line x1={x} x2={x} y1={0} y2={H} stroke="hsl(var(--border))" strokeWidth={1} />
            <text x={x + 5} y={H - 8} fontSize={11} fill="hsl(var(--subtle))" className="num">{lng.toFixed(view.decimals)}°</text>
          </g>
        )
      })}

      {user && (
        <g aria-label="Your location">
          <circle cx={user[0]} cy={user[1]} r={14} fill="hsl(var(--primary))" opacity={0.15} />
          <circle cx={user[0]} cy={user[1]} r={5} fill="hsl(var(--primary))" stroke="hsl(var(--surface))" strokeWidth={2} />
          <text x={user[0] + 12} y={user[1] + 4} fontSize={12} fill="hsl(var(--primary))">You</text>
        </g>
      )}

      {points.map((p) => {
        const [x, y] = view.project(p.lat, p.lng)
        const selected = p.id === selectedId
        const labelLeft = x > W - 150
        return (
          <g
            key={p.id}
            role="button"
            tabIndex={0}
            aria-label={p.label}
            aria-pressed={selected}
            onClick={() => onSelect?.(p.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect?.(p.id)
              }
            }}
            className="cursor-pointer outline-none [&:focus-visible>circle:first-of-type]:stroke-[hsl(var(--primary))]"
          >
            {/* Hit target larger than the dot. */}
            <circle cx={x} cy={y} r={18} fill="transparent" strokeWidth={1.5} stroke={selected ? 'hsl(var(--foreground))' : 'transparent'} />
            <circle cx={x} cy={y} r={6} fill={toneFill[p.tone ?? 'neutral']} stroke="hsl(var(--surface))" strokeWidth={2} />
            <text
              x={labelLeft ? x - 14 : x + 14}
              y={y + 4}
              textAnchor={labelLeft ? 'end' : 'start'}
              fontSize={13}
              fontWeight={selected ? 600 : 400}
              fill={selected ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
              stroke="hsl(var(--surface))"
              strokeWidth={4}
              paintOrder="stroke"
            >
              {p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Change this to swap the map provider for the whole app. */
const defaultRenderer: MapRenderer = SchematicMap

export interface MapViewProps extends Omit<MapRendererProps, 'height'> {
  height?: number
  renderer?: MapRenderer
  className?: string
}

export function MapView({ height = 420, renderer: Renderer = defaultRenderer, className, ...props }: MapViewProps) {
  return (
    <div className={cn('panel overflow-hidden', className)}>
      <Renderer height={height} {...props} />
    </div>
  )
}
