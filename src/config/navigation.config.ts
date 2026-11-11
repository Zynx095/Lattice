import {
  LayoutGrid,
  Rows3,
  Sparkles,
  BarChart3,
  FileUp,
  MapPin,
  ListChecks,
  Settings2,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleId } from './modules.config'

/**
 * SIDEBAR. Groups of links, top to bottom. Each item points at a module id
 * from modules.config.ts; its label and path come from there. Disabled modules
 * are skipped automatically, and empty groups are not rendered.
 */
export interface NavItem {
  module: ModuleId
  icon: LucideIcon
  /** Optional label override. Defaults to the module title. */
  label?: string
}

export interface NavGroup {
  /** Leave empty for an unlabelled group. */
  label: string
  items: NavItem[]
}

export const navigation: NavGroup[] = [
  {
    label: '',
    items: [
      { module: 'helpdesk', icon: GraduationCap },
      { module: 'overview', icon: LayoutGrid },
      { module: 'records', icon: Rows3 },
      { module: 'analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Tools',
    items: [
      { module: 'assistant', icon: Sparkles },
      { module: 'workflow', icon: ListChecks },
      { module: 'files', icon: FileUp },
      { module: 'locations', icon: MapPin },
    ],
  },
  {
    label: 'Workspace',
    items: [{ module: 'settings', icon: Settings2 }],
  },
]
