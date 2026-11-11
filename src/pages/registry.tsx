import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { modules, type ModuleId } from '@/config'

/**
 * PAGE REGISTRY. Maps each module id to the page that renders it. Pages are
 * lazy-loaded, so a disabled module costs nothing.
 *
 * To replace a page, point its entry at a different file. The shell,
 * navigation and command palette need no changes.
 */
type Page = LazyExoticComponent<ComponentType>

export const pages: Record<ModuleId, Page> = {
  helpdesk: lazy(() => import('./Helpdesk')),
  overview: lazy(() => import('./Overview')),
  records: lazy(() => import('./Records')),
  assistant: lazy(() => import('./Assistant')),
  analytics: lazy(() => import('./Analytics')),
  files: lazy(() => import('./Files')),
  locations: lazy(() => import('./Locations')),
  workflow: lazy(() => import('./Workflow')),
  settings: lazy(() => import('./Settings')),
}

/** Routes that live under a module but are not in the sidebar (detail pages, sub-pages). */
export const childRoutes: { module: ModuleId; path: string; page: Page }[] = [
  { module: 'records', path: `${modules.records.path}/:id`, page: lazy(() => import('./RecordDetail')) },
]

export const NotFoundPage = lazy(() => import('./NotFound'))
