import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'
import { isEnabled, modules } from '@/config'
import { settingsStore, updateSettings } from '@/store'
import { MusicPlayer } from '@/components/music/MusicPlayer'
import { Button, Kbd } from '@/components/ui'
import { CommandPalette, openCommandPalette } from './CommandPalette'
import { Notifications } from './Notifications'
import { Breadcrumbs } from './PageHeader'
import { Sidebar, SidebarNav } from './Sidebar'
import { UserMenu } from './UserMenu'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 chrome border-b border-border px-3 backdrop-blur-md sm:px-5 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenNav} aria-label="Open navigation">
        <Menu />
      </Button>
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      <button
        type="button"
        onClick={openCommandPalette}
        className="hidden h-8 w-56 items-center gap-2 rounded-md border border-border bg-raised/50 px-2.5 text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search or jump to</span>
        <span className="flex gap-0.5"><Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd><Kbd>K</Kbd></span>
      </button>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={openCommandPalette} aria-label="Search">
        <Search />
      </Button>
      <MusicPlayer settingsPath={isEnabled('settings') ? modules.settings.path : undefined} />
      <Notifications />
      <UserMenu />
    </header>
  )
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 scrim animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Navigation" className="absolute inset-y-0 left-0 flex w-[272px] max-w-[85vw] animate-slide-in flex-col border-r border-border-strong bg-background">
        <Button variant="ghost" size="icon" className="absolute right-2 top-2.5" onClick={onClose} aria-label="Close navigation">
          <X />
        </Button>
        <SidebarNav onNavigate={onClose} />
      </div>
    </div>,
    document.body,
  )
}

/**
 * The application frame: sidebar, top bar, scrolling content region, command
 * palette and mobile drawer. Pages render as children and know nothing about it.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = settingsStore.use().sidebarCollapsed
  const [navOpen, setNavOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={() => updateSettings({ sidebarCollapsed: !collapsed })} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-16 pt-6 outline-none sm:px-6 lg:px-10 lg:pt-9">
          {children}
        </main>
      </div>
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
      <CommandPalette />
    </div>
  )
}
