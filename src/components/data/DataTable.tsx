import React, { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right'
  /** Hide the column below a breakpoint to keep small screens readable. */
  hideBelow?: 'sm' | 'md' | 'lg'
  className?: string
}

export interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  getRowId: (row: T) => string
  /** Accessible name of the table. */
  label: string
  onRowClick?: (row: T) => void
  /** Buttons at the end of each row. Clicks here do not trigger onRowClick. Hidden on phones, so the detail page must offer the same actions. */
  rowActions?: (row: T) => React.ReactNode
  /** Rows per page. Pagination hides itself when everything fits. */
  pageSize?: number
  initialSort?: { key: string; direction: 'asc' | 'desc' }
  /** Shown instead of the table body when there are no rows. */
  empty: React.ReactNode
}

const hide = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' }

/**
 * Sortable, paginated table. Searching and filtering stay with the page:
 * pass in the rows that should be visible.
 */
export function DataTable<T>({ rows, columns, getRowId, label, onRowClick, rowActions, pageSize = 8, initialSort, empty }: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort)
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort?.key)
    if (!column?.sortValue || !sort) return rows
    const value = column.sortValue
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = value(a)
      const vb = value(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * factor
    })
  }, [rows, columns, sort])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  // Filters can shrink the list under the current page.
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1)
  }, [page, pageCount])

  const current = Math.min(page, pageCount - 1)
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize)

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key === key ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }))
    setPage(0)
  }

  if (rows.length === 0) return <>{empty}</>

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-base" aria-label={label}>
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn('h-9 whitespace-nowrap px-3 text-sm font-medium text-subtle first:pl-5', c.align === 'right' ? 'text-right' : 'text-left', c.hideBelow && hide[c.hideBelow])}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn('group inline-flex items-center gap-1 rounded transition-colors hover:text-foreground', active && 'text-foreground')}
                      >
                        {c.header}
                        {active ? (
                          sort!.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
              {rowActions && <th scope="col" className="hidden w-px pr-5 sm:table-cell"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('group border-b border-border/70 transition-colors last:border-0', onRowClick && 'cursor-pointer hover:bg-raised/50')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('h-12 px-3 first:pl-5 last:pr-5', c.align === 'right' && 'num text-right', c.hideBelow && hide[c.hideBelow], c.className)}>
                    {c.render(row)}
                  </td>
                ))}
                {rowActions && (
                  <td className="hidden pr-4 sm:table-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-0.5">{rowActions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-sm text-muted-foreground">
        <p className="num" aria-live="polite">
          {sorted.length === 0 ? 'Nothing to show' : `${current * pageSize + 1}–${Math.min(sorted.length, (current + 1) * pageSize)} of ${sorted.length}`}
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <span className="num px-1">Page {current + 1} of {pageCount}</span>
            <Button variant="ghost" size="icon-sm" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
