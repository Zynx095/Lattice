import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings2 } from 'lucide-react'
import { appConfig, isEnabled, modules } from '@/config'
import { settingsStore, updateSettings } from '@/store'
import { Switch, Tabs, useDismiss } from '@/components/ui'

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'

/** Avatar button with the profile summary and the most-used preferences. */
export function UserMenu() {
  const [open, setOpen] = useState(false)
  const settings = settingsStore.use()
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Account and preferences"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-raised text-xs font-semibold transition-colors hover:border-subtle"
      >
        {initials(settings.user.name)}
      </button>

      {open && (
        <div role="dialog" aria-label="Account" className="absolute right-0 top-11 z-40 w-72 animate-rise-in rounded-lg border border-border-strong bg-overlay shadow-pop">
          <div className="px-4 py-3.5">
            <p className="truncate font-medium">{settings.user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{settings.user.email}</p>
            <p className="mt-1 text-xs text-subtle">{appConfig.defaultUser.role}</p>
          </div>
          <div className="space-y-3.5 border-t border-border px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">Theme</span>
              <Tabs
                label="Theme"
                value={settings.theme}
                onChange={(theme) => updateSettings({ theme })}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                  { value: 'system', label: 'System' },
                ]}
              />
            </div>
            <Switch
              label="3D background"
              description="Turn off to save battery."
              checked={settings.sceneEnabled}
              onChange={(sceneEnabled) => updateSettings({ sceneEnabled })}
            />
          </div>
          {isEnabled('settings') && (
            <div className="border-t border-border p-1.5">
              <Link
                to={modules.settings.path}
                onClick={() => setOpen(false)}
                className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-raised hover:text-foreground"
              >
                <Settings2 className="h-4 w-4" />
                Open settings
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
