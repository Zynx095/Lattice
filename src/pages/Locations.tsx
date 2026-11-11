import { useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { modules } from '@/config'
import { sampleSites } from '@/data/sample'
import { cn } from '@/lib/utils'
import { MapView } from '@/components/map/MapView'
import { PageHeader } from '@/components/shell/PageHeader'
import { Badge, Button, Panel, useToast } from '@/components/ui'

const toneLabel = { neutral: 'No status', info: 'Active', success: 'Clear', warning: 'Needs attention', danger: 'Restricted' }

export default function Locations() {
  const toast = useToast()
  const sites = sampleSites
  const [selectedId, setSelectedId] = useState<string | null>(sites[0]?.id ?? null)
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const selected = sites.find((s) => s.id === selectedId)

  const locate = () => {
    if (!('geolocation' in navigator)) {
      toast.error('This browser cannot share a location.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
        toast.success('Your location was added to the plot')
      },
      (err) => {
        setLocating(false)
        toast.error(err.code === err.PERMISSION_DENIED ? 'Location access was blocked. Allow it in the browser to use this.' : 'Your location could not be determined. Try again.')
      },
      { timeout: 8000, maximumAge: 60_000 },
    )
  }

  return (
    <>
      <PageHeader
        title={modules.locations.title}
        description={modules.locations.description}
        actions={
          me ? (
            <Button variant="ghost" onClick={() => setMe(null)}>Hide my location</Button>
          ) : (
            <Button variant="secondary" leftIcon={<LocateFixed />} isLoading={locating} onClick={locate}>Show my location</Button>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MapView
            points={sites.map((s) => ({ id: s.id, label: s.name, lat: s.lat, lng: s.lng, tone: s.tone }))}
            selectedId={selectedId}
            onSelect={setSelectedId}
            userLocation={me}
          />
          <p className="mt-2 text-sm text-subtle">
            Schematic plot of coordinates. No map tiles are loaded and no map provider is connected.
          </p>
        </div>

        <div className="space-y-5">
          {selected && (
            <Panel title={selected.name} description={selected.detail}>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-subtle">Latitude</dt>
                  <dd className="num mt-0.5">{selected.lat.toFixed(4)}°</dd>
                </div>
                <div>
                  <dt className="text-sm text-subtle">Longitude</dt>
                  <dd className="num mt-0.5">{selected.lng.toFixed(4)}°</dd>
                </div>
              </dl>
              <div className="mt-4"><Badge tone={selected.tone}>{toneLabel[selected.tone]}</Badge></div>
            </Panel>
          )}

          <Panel title="All locations" flush>
            <ul className="border-t border-border">
              {sites.map((s) => (
                <li key={s.id} className="border-b border-border/70 last:border-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    aria-pressed={s.id === selectedId}
                    className={cn('flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left transition-colors hover:bg-raised/60', s.id === selectedId && 'bg-raised/70')}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.name}</span>
                      <span className="block truncate text-sm text-subtle">{s.detail}</span>
                    </span>
                    <Badge tone={s.tone}>{toneLabel[s.tone]}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}
