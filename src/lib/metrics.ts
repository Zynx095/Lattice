import { DAY_MS, dayKey } from './utils'

/** Pure helpers for turning rows into numbers. No React, no stores. */

/** The last `days` calendar days, oldest first, ending today. */
export function lastDays(days: number): { key: string; label: string; end: number }[] {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getTime() - (days - 1 - i) * DAY_MS)
    return {
      key: dayKey(d),
      label: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d),
      end: d.getTime(),
    }
  })
}

/** Counts rows per day by a date picked from each row. */
export function countPerDay<T>(rows: T[], days: number, pick: (row: T) => string | undefined): number[] {
  const buckets = new Map(lastDays(days).map((d) => [d.key, 0]))
  for (const row of rows) {
    const value = pick(row)
    if (!value) continue
    const key = dayKey(value)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  return [...buckets.values()]
}

/** Rows whose picked date falls between `from` and `to` days ago (from > to). */
export function countBetween<T>(rows: T[], fromDaysAgo: number, toDaysAgo: number, pick: (row: T) => string | undefined): number {
  const now = Date.now()
  const start = now - fromDaysAgo * DAY_MS
  const end = now - toDaysAgo * DAY_MS
  return rows.filter((r) => {
    const v = pick(r)
    if (!v) return false
    const t = new Date(v).getTime()
    return t > start && t <= end
  }).length
}

export function groupCount<T>(rows: T[], pick: (row: T) => string): { label: string; value: number }[] {
  const map = new Map<string, number>()
  for (const row of rows) map.set(pick(row), (map.get(pick(row)) ?? 0) + 1)
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

export function groupSum<T>(rows: T[], pick: (row: T) => string, amount: (row: T) => number): { label: string; value: number }[] {
  const map = new Map<string, number>()
  for (const row of rows) map.set(pick(row), (map.get(pick(row)) ?? 0) + amount(row))
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

/** Percentage change from previous to current. null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}
