import React from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import type { Tone } from '@/data/models'
import { Badge, Button } from '@/components/ui'

export function AIError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2.5">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      <p className="min-w-0 flex-1 break-words text-sm">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} leftIcon={<RotateCcw />}>Try again</Button>
      )}
    </div>
  )
}

export function ThinkingDots({ label = 'Thinking' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-1 py-1.5">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-pulse3 rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </span>
  )
}

/* ---------- Structured results ---------- */

const TITLE_KEYS = ['title', 'name', 'label', 'heading']
const BADGE_KEYS = ['priority', 'status', 'severity', 'category', 'type']
const toneFor = (value: string): Tone => {
  const v = value.toLowerCase()
  if (['high', 'critical', 'urgent', 'error', 'failed', 'blocked'].includes(v)) return 'danger'
  if (['medium', 'warning', 'pending'].includes(v)) return 'warning'
  if (['low', 'ok', 'ready', 'done', 'success', 'confirmed', 'enforced'].includes(v)) return 'success'
  return 'neutral'
}
const human = (key: string) => key.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
const isPlain = (v: unknown): v is string | number | boolean => ['string', 'number', 'boolean'].includes(typeof v)

function ItemCard({ item }: { item: Record<string, unknown> }) {
  const titleKey = TITLE_KEYS.find((k) => typeof item[k] === 'string')
  const badgeKeys = BADGE_KEYS.filter((k) => typeof item[k] === 'string')
  const rest = Object.entries(item).filter(([k, v]) => k !== titleKey && !badgeKeys.includes(k) && k !== 'id' && isPlain(v))
  return (
    <li className="rounded-md border border-border bg-background/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium">{titleKey ? String(item[titleKey]) : 'Item'}</p>
        <span className="flex gap-1.5">
          {badgeKeys.map((k) => (
            <Badge key={k} tone={toneFor(String(item[k]))}>{String(item[k])}</Badge>
          ))}
        </span>
      </div>
      {rest.map(([k, v]) => (
        <p key={k} className="mt-1 text-sm text-muted-foreground">
          {rest.length > 1 && <span className="text-subtle">{human(k)}: </span>}
          {String(v)}
        </p>
      ))}
    </li>
  )
}

/**
 * Renders any JSON object an AI call returns as readable cards: text fields as
 * paragraphs, lists of strings as bullets, lists of objects as item cards with
 * priority/status badges. It adapts to the shape, so a new prompt needs no new UI.
 */
export function StructuredResult({ data }: { data: unknown }): React.ReactElement {
  if (isPlain(data)) return <p className="whitespace-pre-wrap">{String(data)}</p>
  if (Array.isArray(data)) return <StructuredResult data={{ items: data }} />
  if (!data || typeof data !== 'object') return <p className="text-muted-foreground">The response was empty.</p>

  return (
    <div className="space-y-4">
      {Object.entries(data as Record<string, unknown>).map(([key, value]) => {
        if (value === null || value === undefined || value === '') return null
        return (
          <div key={key}>
            <p className="mb-1.5 text-sm font-medium text-subtle">{human(key)}</p>
            {isPlain(value) ? (
              <p className="whitespace-pre-wrap break-words">{String(value)}</p>
            ) : Array.isArray(value) ? (
              value.every(isPlain) ? (
                <ul className="list-disc space-y-1 pl-5 marker:text-subtle">
                  {value.map((v, i) => <li key={i}>{String(v)}</li>)}
                </ul>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {value.map((v, i) => (isPlain(v) ? <li key={i}>{String(v)}</li> : <ItemCard key={i} item={(v ?? {}) as Record<string, unknown>} />))}
                </ul>
              )
            ) : (
              <div className="rounded-md border border-border p-3"><StructuredResult data={value} /></div>
            )}
          </div>
        )
      })}
    </div>
  )
}
