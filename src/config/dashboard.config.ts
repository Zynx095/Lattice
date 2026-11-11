import { FilePlus2, ListChecks, Sparkles, FileUp, type LucideIcon } from 'lucide-react'
import type { WorkRecord } from '@/data/models'
import { countBetween, countPerDay, lastDays, percentChange } from '@/lib/metrics'
import { dayKey } from '@/lib/utils'
import { appConfig } from './app.config'
import type { ModuleId } from './modules.config'

/**
 * OVERVIEW PAGE CONTENT. Metrics are computed from live records, so they move
 * when rows are created, edited or deleted. Replace the compute functions to
 * change what the strip at the top of the overview says.
 */
export interface MetricResult {
  value: string
  /** Small line under the value. */
  hint?: string
  /** 14 daily points for the sparkline. */
  series?: number[]
  /** Change against the previous period. `goodWhen` decides the colour. */
  change?: { percent: number | null; goodWhen: 'up' | 'down' }
}

export interface MetricDef {
  id: string
  label: string
  compute: (records: WorkRecord[]) => MetricResult
}

const isOpen = (r: WorkRecord) => r.status !== 'done'

export const dashboardMetrics: MetricDef[] = [
  {
    id: 'open',
    label: `Open ${appConfig.entity.plural}`,
    compute: (records) => {
      const addedThisWeek = countBetween(records, 7, 0, (r) => r.createdAt)
      // How many were open at the end of each of the last 14 days.
      const series = lastDays(14).map(
        (d) =>
          records.filter(
            (r) => new Date(r.createdAt).getTime() <= d.end && (!r.completedAt || new Date(r.completedAt).getTime() > d.end),
          ).length,
      )
      return { value: String(records.filter(isOpen).length), hint: `${addedThisWeek} added in the last 7 days`, series }
    },
  },
  {
    id: 'completed',
    label: 'Completed, last 7 days',
    compute: (records) => {
      const current = countBetween(records, 7, 0, (r) => r.completedAt)
      const previous = countBetween(records, 14, 7, (r) => r.completedAt)
      return {
        value: String(current),
        hint: `${previous} in the 7 days before`,
        series: countPerDay(records, 14, (r) => r.completedAt),
        change: { percent: percentChange(current, previous), goodWhen: 'up' },
      }
    },
  },
  {
    id: 'overdue',
    label: 'Overdue',
    compute: (records) => {
      const today = dayKey(Date.now())
      const overdue = records.filter((r) => isOpen(r) && r.dueDate && r.dueDate < today)
      const blocked = records.filter((r) => r.status === 'blocked').length
      return { value: String(overdue.length), hint: `${blocked} blocked right now` }
    },
  },
  {
    id: 'rate',
    label: 'Completion rate',
    compute: (records) => {
      const done = records.filter((r) => r.status === 'done').length
      const rate = records.length ? Math.round((done / records.length) * 100) : 0
      return { value: `${rate}%`, hint: `${done} of ${records.length} done` }
    },
  },
]

export interface QuickAction {
  label: string
  description: string
  icon: LucideIcon
  /** Route to open. */
  to: string
  /** Hidden when this module is disabled. */
  module: ModuleId
}

export const quickActions: QuickAction[] = [
  { label: `Add a ${appConfig.entity.singular}`, description: 'Open the short form', icon: FilePlus2, to: '/records?new=1', module: 'records' },
  { label: 'Start a guided request', description: 'Three steps with a review', icon: ListChecks, to: '/new', module: 'workflow' },
  { label: 'Ask the assistant', description: 'Questions about your data', icon: Sparkles, to: '/assistant', module: 'assistant' },
  { label: 'Add files', description: 'Read and preview locally', icon: FileUp, to: '/files', module: 'files' },
]
