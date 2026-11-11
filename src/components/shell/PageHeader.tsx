import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { appConfig, moduleForPath, modules } from '@/config'
import { createStore } from '@/store/createStore'

/* ---------- Breadcrumbs ---------- */

// The last crumb on detail pages ("Records > Draft the agenda") is set by the page itself.
const crumbStore = createStore<string | null>('crumb', null, false)

/** Call from a detail page to add its name as the last breadcrumb. */
export function useBreadcrumb(label: string | undefined) {
  useEffect(() => {
    crumbStore.set(label ?? null)
    return () => crumbStore.set(null)
  }, [label])
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const extra = crumbStore.use()
  const id = moduleForPath(pathname)
  const mod = id ? modules[id] : undefined
  const nested = mod && pathname !== mod.path

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-base">
        <li className="hidden text-subtle sm:block">{appConfig.name}</li>
        <li className="hidden text-subtle sm:block" aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
        {mod ? (
          <li className="truncate">
            {nested ? (
              <Link to={mod.path} className="text-muted-foreground transition-colors hover:text-foreground">{mod.title}</Link>
            ) : (
              <span aria-current="page" className="font-medium">{mod.title}</span>
            )}
          </li>
        ) : (
          <li className="font-medium">Not found</li>
        )}
        {nested && (
          <>
            <li className="text-subtle" aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
            <li aria-current="page" className="truncate font-medium">{extra ?? 'Details'}</li>
          </>
        )}
      </ol>
    </nav>
  )
}

/* ---------- Page header ---------- */

export interface PageHeaderProps {
  title: string
  description?: string
  /** Buttons on the right. The primary action goes last. */
  actions?: React.ReactNode
  /** Small content above the title, e.g. a status badge on detail pages. */
  meta?: React.ReactNode
}

export function PageHeader({ title, description, actions, meta }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 lg:mb-8">
      <div className="min-w-0 max-w-2xl">
        {meta && <div className="mb-2 flex flex-wrap items-center gap-2">{meta}</div>}
        <h1 className="text-xl">{title}</h1>
        {description && <p className="mt-1.5 text-md text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
