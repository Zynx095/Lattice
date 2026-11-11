import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, ChevronRight, History, Minus } from 'lucide-react'
import type { MetricResult, QuickAction } from '@/config'
import type { ActivityEntry } from '@/data/models'
import { cn, timeAgo } from '@/lib/utils'
import { Sparkline } from '@/components/charts/Charts'
import { EmptyState } from '@/components/ui'

/* ---------- Trend indicator ---------- */

/** "+12%" with an arrow. Green or red depends on whether up is good for this metric. */
export function Trend({ percent, goodWhen = 'up' }: { percent: number | null; goodWhen?: 'up' | 'down' }) {
  if (percent === null) return <span className="text-sm text-subtle">No earlier data</span>
  const flat = percent === 0
  const good = flat ? null : percent > 0 === (goodWhen === 'up')
  const Icon = flat ? Minus : percent > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn('num inline-flex items-center gap-0.5 text-sm font-medium', good === null ? 'text-muted-foreground' : good ? 'text-success' : 'text-danger')}>
      <Icon className="h-3.5 w-3.5" />
      {percent > 0 ? '+' : ''}{percent}%
      <span className="sr-only">{flat ? 'no change' : good ? 'improving' : 'worsening'}</span>
    </span>
  )
}

/* ---------- Metric strip ---------- */

export interface MetricItem extends MetricResult {
  id: string
  label: string
}

/** Headline numbers as one continuous strip divided by hairlines, not separate cards. */
export function MetricStrip({ metrics }: { metrics: MetricItem[] }) {
  return (
    <dl className="panel grid grid-cols-2 overflow-hidden lg:grid-cols-4">
      {metrics.map((m, i) => (
        <div
          key={m.id}
          className={cn(
            'min-w-0 border-border p-5',
            i % 2 === 1 && 'border-l',
            i >= 2 && 'border-t lg:border-t-0',
            i > 0 && 'lg:border-l',
          )}
        >
          <dt className="label truncate">{m.label}</dt>
          <dd className="mt-2 flex items-end justify-between gap-3">
            <span className="text-2xl font-medium tracking-tight">{m.value}</span>
            {m.series && <Sparkline values={m.series} className="mb-1 hidden shrink-0 sm:block" />}
          </dd>
          <dd className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-subtle">
            {m.change && <Trend percent={m.change.percent} goodWhen={m.change.goodWhen} />}
            {m.hint && <span>{m.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/* ---------- KPI (standalone, for analytics rows) ---------- */

export function Kpi({ label, value, change, hint }: { label: string; value: string; change?: MetricResult['change']; hint?: string }) {
  return (
    <div className="panel min-w-0 p-4">
      <p className="label truncate">{label}</p>
      <p className="mt-1.5 text-lg font-medium tracking-tight">{value}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-subtle">
        {change && <Trend percent={change.percent} goodWhen={change.goodWhen} />}
        {hint && <span>{hint}</span>}
      </p>
    </div>
  )
}

/* ---------- Quick actions ---------- */

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <ul className="-mx-2 -my-1">
      {actions.map((a) => (
        <li key={a.to}>
          <Link to={a.to} className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-raised/70">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-raised text-muted-foreground transition-colors group-hover:text-primary">
              <a.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{a.label}</span>
              <span className="block truncate text-sm text-subtle">{a.description}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

/* ---------- Activity feed ---------- */

export function ActivityFeed({ entries, limit = 6 }: { entries: ActivityEntry[]; limit?: number }) {
  if (entries.length === 0) {
    return <EmptyState icon={History} title="No activity yet" description="Changes you make will be listed here." className="py-8" />
  }
  return (
    <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-border">
      {entries.slice(0, limit).map((e) => (
        <li key={e.id} className="relative pl-5">
          <span className="absolute left-0 top-[7px] h-[7px] w-[7px] rounded-full border border-subtle bg-card" aria-hidden="true" />
          <p className="leading-snug">
            <span className="text-muted-foreground">{e.actor} {e.action} </span>
            {e.href ? (
              <Link to={e.href} className="font-medium underline-offset-4 hover:underline">{e.subject}</Link>
            ) : (
              <span className="font-medium">{e.subject}</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-subtle">{timeAgo(e.at)}</p>
        </li>
      ))}
    </ol>
  )
}
