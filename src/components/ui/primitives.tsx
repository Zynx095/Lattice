import React, { useEffect, useRef } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import type { Tone } from '@/data/models'
import { cn } from '@/lib/utils'

/* ---------- Panel: the standard content surface ---------- */

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode
  description?: React.ReactNode
  /** Right side of the header: buttons, tabs, a link. */
  actions?: React.ReactNode
  /** Removes body padding, for tables and lists that run edge to edge. */
  flush?: boolean
}

export function Panel({ title, description, actions, flush, className, children, ...props }: PanelProps) {
  return (
    <section className={cn('panel min-w-0', className)} {...props}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-medium tracking-normal">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(flush ? 'pt-3' : 'p-5', title && !flush && 'pt-4')}>{children}</div>
    </section>
  )
}

/* ---------- Badge ---------- */

const toneDot: Record<Tone, string> = {
  neutral: 'bg-subtle',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

/** Status label: a coloured dot plus text, so colour never carries meaning alone. */
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-raised/60 px-2 py-0.5 text-sm text-foreground', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', toneDot[tone])} aria-hidden="true" />
      {children}
    </span>
  )
}

export const toneText: Record<Tone, string> = {
  neutral: 'text-muted-foreground',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

/* ---------- Tabs (segmented control) ---------- */

export interface TabsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  /** Accessible name for the group. */
  label: string
  className?: string
}

export function Tabs<T extends string>({ value, onChange, options, label, className }: TabsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-md border border-border bg-background/60 p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-7 rounded-[5px] px-2.5 text-sm font-medium transition-colors duration-150',
            o.value === value ? 'bg-raised text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border-strong))]' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Empty state ---------- */

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-raised text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------- Loading ---------- */

export function Spinner({ text, className }: { text?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 text-muted-foreground', className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className={text ? 'text-sm' : 'sr-only'}>{text ?? 'Loading'}</span>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-raised', className)} />
}

/* ---------- Kbd ---------- */

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-raised px-1 font-sans text-2xs font-medium text-muted-foreground">
      {children}
    </kbd>
  )
}

/* ---------- Dismiss on outside click / Escape (popovers, menus) ---------- */

export function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return ref
}
