import { appConfig, cap } from './app.config'

/**
 * FEATURE ACTIVATION. One entry per module.
 *
 *   enabled: false  ->  the route is not mounted, the sidebar link, command
 *                       palette entry and quick actions that point to it vanish.
 *
 * To add a module: add an id here, add a page to src/pages/registry.tsx,
 * and (optionally) a sidebar entry in navigation.config.ts.
 */
export type ModuleId =
  | 'helpdesk'
  | 'overview'
  | 'records'
  | 'assistant'
  | 'analytics'
  | 'files'
  | 'locations'
  | 'workflow'
  | 'settings'

export interface ModuleDef {
  enabled: boolean
  /** Route path. '/' is the landing page. */
  path: string
  /** Page title: sidebar label, breadcrumb, page header, command palette. */
  title: string
  /** One sentence under the page title. */
  description: string
}

export const modules: Record<ModuleId, ModuleDef> = {
  helpdesk: {
    enabled: true,
    path: '/',
    title: 'Campus Helpdesk',
    description: 'Ask anything about academics, examinations, placements, hostel, library and administration.',
  },
  overview: {
    enabled: false,
    path: '/overview',
    title: 'Overview',
    description: 'What changed, what is open and what needs attention.',
  },
  records: {
    enabled: false,
    path: '/records',
    title: cap(appConfig.entity.plural),
    description: `Search, sort, filter and edit every ${appConfig.entity.singular}.`,
  },
  assistant: {
    enabled: false,
    path: '/assistant',
    title: 'Assistant',
    description: 'Ask questions in plain language. Answers can use your workspace data.',
  },
  analytics: {
    enabled: false,
    path: '/analytics',
    title: 'Analytics',
    description: 'Volume, throughput and distribution over a chosen period.',
  },
  files: {
    enabled: false,
    path: '/files',
    title: 'Files',
    description: 'Add files to read and preview them in this browser.',
  },
  locations: {
    enabled: false,
    path: '/locations',
    title: 'Locations',
    description: 'Places connected to your work, plotted by coordinates.',
  },
  workflow: {
    enabled: false,
    path: '/new',
    title: 'New request',
    description: `A guided form that ends in a new ${appConfig.entity.singular}.`,
  },
  settings: {
    enabled: true,
    path: '/settings',
    title: 'Settings',
    description: 'Appearance, 3D environment, music, accessibility and connections.',
  },
}

export const isEnabled = (id: ModuleId) => modules[id].enabled

export const enabledModuleIds = () =>
  (Object.keys(modules) as ModuleId[]).filter((id) => modules[id].enabled)

/** Finds the module that owns a pathname ('/records/abc' -> 'records'). */
export function moduleForPath(pathname: string): ModuleId | undefined {
  const ids = enabledModuleIds().sort((a, b) => modules[b].path.length - modules[a].path.length)
  return ids.find((id) =>
    modules[id].path === '/' ? pathname === '/' : pathname === modules[id].path || pathname.startsWith(modules[id].path + '/'),
  )
}
