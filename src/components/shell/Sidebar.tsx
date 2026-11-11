import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { appConfig, isEnabled, modules, navigation } from '@/config'
import { cn } from '@/lib/utils'

/** Replace this glyph to rebrand; it is the only logo in the app (plus public/mark.svg for the tab icon). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('h-7 w-7 shrink-0', className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-raised" />
      <path d="M16 5.5 26 16 16 26.5 6 16Z" stroke="hsl(var(--primary))" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6 16h20M16 5.5 12 16l4 10.5L20 16Z" stroke="hsl(var(--primary))" strokeWidth="1.2" strokeLinejoin="round" opacity=".6" />
    </svg>
  )
}

export interface SidebarNavProps {
  collapsed?: boolean
  /** Called after a link is chosen (closes the mobile drawer). */
  onNavigate?: () => void
}

/** Brand plus the configured navigation groups. Used by the desktop sidebar and the mobile drawer. */
export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const groups = navigation
    .map((g) => ({ ...g, items: g.items.filter((item) => isEnabled(item.module)) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn('flex h-14 shrink-0 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
        <BrandMark />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate font-semibold tracking-tight">{appConfig.name}</p>
            <p className="truncate text-xs text-subtle">{appConfig.tagline}</p>
          </div>
        )}
      </div>

      <nav aria-label="Main" className={cn('flex-1 space-y-5 overflow-y-auto px-3 py-3', collapsed && 'px-2')}>
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && <p className="mb-1.5 px-2 text-xs font-medium text-subtle">{group.label}</p>}
            {group.label && collapsed && gi > 0 && <div className="mx-2 mb-3 border-t border-border" />}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const mod = modules[item.module]
                const label = item.label ?? mod.title
                return (
                  <li key={item.module}>
                    <NavLink
                      to={mod.path}
                      end={mod.path === '/'}
                      onClick={onNavigate}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'relative flex h-8 items-center gap-2.5 rounded-md px-2 text-base transition-colors duration-150',
                          collapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-raised font-medium text-foreground before:absolute before:-left-3 before:top-1.5 before:h-5 before:w-0.5 before:rounded-full before:bg-primary'
                            : 'text-muted-foreground hover:bg-raised/60 hover:text-foreground',
                          isActive && collapsed && 'before:-left-2',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn(
        'chrome sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[60px]' : 'w-[232px]',
      )}
    >
      <SidebarNav collapsed={collapsed} />
      <div className={cn('border-t border-border p-3', collapsed && 'px-2')}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className={cn(
            'flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-base text-muted-foreground transition-colors hover:bg-raised/60 hover:text-foreground',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {collapsed ? <span className="sr-only">Expand sidebar</span> : 'Collapse'}
        </button>
      </div>
    </aside>
  )
}
