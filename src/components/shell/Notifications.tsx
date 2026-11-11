import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff } from 'lucide-react'
import { clearNotifications, markAllNotificationsRead, markNotificationRead, notificationsStore } from '@/store'
import { cn, timeAgo } from '@/lib/utils'
import { Button, EmptyState, useDismiss } from '@/components/ui'

const toneBar = { neutral: 'bg-subtle', info: 'bg-info', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }

/** Bell button with the notification inbox. Add entries with pushNotification() from the store. */
export function Notifications() {
  const [open, setOpen] = useState(false)
  const items = notificationsStore.use()
  const navigate = useNavigate()
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))
  const unread = items.filter((n) => !n.read).length

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell />
        {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-11 z-40 w-[min(22rem,calc(100vw-2rem))] animate-rise-in rounded-lg border border-border-strong bg-overlay shadow-pop max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-14 max-sm:w-auto"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {items.length > 0 && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={unread === 0} onClick={markAllNotificationsRead}>Mark all read</Button>
                <Button variant="ghost" size="sm" onClick={clearNotifications}>Clear</Button>
              </div>
            )}
          </div>
          {items.length === 0 ? (
            <EmptyState icon={BellOff} title="Nothing new" description="Alerts about your work appear here." className="border-t border-border py-8" />
          ) : (
            <ul className="max-h-[22rem] overflow-y-auto border-t border-border">
              {items.map((n) => (
                <li key={n.id} className="border-b border-border/70 last:border-0">
                  <button
                    type="button"
                    onClick={() => {
                      markNotificationRead(n.id)
                      if (n.href) {
                        navigate(n.href)
                        setOpen(false)
                      }
                    }}
                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-raised/60"
                  >
                    <span className={cn('mt-1 h-8 w-0.5 shrink-0 rounded-full', toneBar[n.tone], n.read && 'opacity-30')} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={cn('truncate', n.read ? 'text-muted-foreground' : 'font-medium')}>{n.title}</span>
                        <span className="shrink-0 text-xs text-subtle">{timeAgo(n.at)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{n.body}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
