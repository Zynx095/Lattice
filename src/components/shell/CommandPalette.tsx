import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Box, CheckCheck, CornerDownLeft, Moon, Music2, Search, Sun, type LucideIcon } from 'lucide-react'
import { music, useMusic } from '@/services/music/music.player'
import { appConfig, cap, isEnabled, modules, navigation, quickActions } from '@/config'
import { markAllNotificationsRead, recordsStore, settingsStore, updateSettings } from '@/store'
import { createStore } from '@/store/createStore'
import { cn } from '@/lib/utils'
import { Kbd, useToast } from '@/components/ui'

const paletteStore = createStore<boolean>('palette', false, false)
export const openCommandPalette = () => paletteStore.set(true)

interface Command {
  id: string
  label: string
  hint?: string
  group: string
  icon: LucideIcon
  run: () => void
}

/**
 * Ctrl/⌘ K launcher. Lists pages from the navigation config, quick actions
 * from the dashboard config, a few built-in commands and matching records.
 * Add app-specific commands in the `commands` array below.
 */
export function CommandPalette() {
  const open = paletteStore.use()
  const navigate = useNavigate()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const records = recordsStore.use()
  const sceneEnabled = settingsStore.use().sceneEnabled
  const lightTheme = document.documentElement.dataset.theme === 'light'
  const musicState = useMusic()
  const musicPlaying = musicState.status === 'playing'

  // Global shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        paletteStore.set((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const commands = useMemo<Command[]>(() => {
    const pages: Command[] = navigation
      .flatMap((g) => g.items)
      .filter((item) => isEnabled(item.module))
      .map((item) => ({
        id: `page:${item.module}`,
        label: item.label ?? modules[item.module].title,
        hint: modules[item.module].description,
        group: 'Go to',
        icon: item.icon,
        run: () => navigate(modules[item.module].path),
      }))

    const actions: Command[] = quickActions
      .filter((a) => isEnabled(a.module))
      .map((a) => ({ id: `action:${a.to}`, label: a.label, hint: a.description, group: 'Actions', icon: a.icon, run: () => navigate(a.to) }))

    actions.push(
      {
        id: 'toggle-scene',
        label: sceneEnabled ? 'Turn off 3D background' : 'Turn on 3D background',
        group: 'Actions',
        icon: Box,
        run: () => {
          updateSettings({ sceneEnabled: !sceneEnabled })
          toast.info(sceneEnabled ? '3D background turned off' : '3D background turned on')
        },
      },
      {
        id: 'toggle-theme',
        label: lightTheme ? 'Switch to dark theme' : 'Switch to light theme',
        group: 'Actions',
        icon: lightTheme ? Moon : Sun,
        run: () => updateSettings({ theme: lightTheme ? 'dark' : 'light' }),
      },
      ...(musicState.enabled
        ? [{ id: 'toggle-music', label: musicPlaying ? 'Pause music' : 'Play music', group: 'Actions', icon: Music2, run: () => void music.toggle() }]
        : []),
      {
        id: 'read-all',
        label: 'Mark all notifications as read',
        group: 'Actions',
        icon: CheckCheck,
        run: () => {
          markAllNotificationsRead()
          toast.success('Notifications marked as read')
        },
      },
    )
    return [...pages, ...actions]
  }, [navigate, sceneEnabled, toast, lightTheme, musicPlaying, musicState.enabled, open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    const matched = commands.filter((c) => `${c.label} ${c.hint ?? ''}`.toLowerCase().includes(q))
    const found: Command[] = isEnabled('records')
      ? records
          .filter((r) => `${r.title} ${r.owner} ${r.category}`.toLowerCase().includes(q))
          .slice(0, 5)
          .map((r) => ({
            id: `record:${r.id}`,
            label: r.title,
            hint: `${r.category}, ${r.owner}`,
            group: cap(appConfig.entity.plural),
            icon: Search,
            run: () => navigate(`${modules.records.path}/${r.id}`),
          }))
      : []
    return [...matched, ...found]
  }, [commands, query, records, navigate])

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const close = () => paletteStore.set(false)
  const run = (command: Command | undefined) => {
    if (!command) return
    close()
    command.run()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (results.length ? (i + 1) % results.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(results[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  let lastGroup = ''

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div className="fixed inset-0 scrim animate-fade-in" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-xl animate-rise-in overflow-hidden rounded-xl border border-border-strong bg-overlay shadow-pop"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            placeholder={`Search pages, actions and ${appConfig.entity.plural}`}
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
            className="h-12 w-full bg-transparent text-md placeholder:text-subtle focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>

        <ul ref={listRef} id="palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-8 text-center text-muted-foreground">No matches for “{query}”.</li>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null
            lastGroup = c.group
            return (
              <li key={c.id} role="presentation">
                {header && <p className="px-2.5 pb-1 pt-2.5 text-xs font-medium text-subtle">{header}</p>}
                <div
                  id={`palette-${c.id}`}
                  role="option"
                  aria-selected={i === active}
                  onPointerMove={() => i !== active && setActive(i)}
                  onClick={() => run(c)}
                  className={cn('flex h-10 cursor-pointer items-center gap-3 rounded-md px-2.5', i === active && 'bg-raised')}
                >
                  <c.icon className={cn('h-4 w-4 shrink-0', i === active ? 'text-primary' : 'text-subtle')} />
                  <span className="truncate">{c.label}</span>
                  {c.hint && <span className="hidden min-w-0 flex-1 truncate text-sm text-subtle sm:block">{c.hint}</span>}
                  {i === active && <CornerDownLeft className="ml-auto h-3.5 w-3.5 shrink-0 text-subtle" />}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-subtle">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> to move</span>
          <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> to run</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
