import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  id: string
  title?: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextValue {
  showToast: (item: Omit<ToastItem, 'id'>) => string
  dismissToast: (id: string) => void
  success: (message: string, title?: string) => string
  error: (message: string, title?: string) => string
  info: (message: string, title?: string) => string
  warning: (message: string, title?: string) => string
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const icons: Record<ToastType, React.ReactNode> = {
  info: <Info className="text-info" />,
  success: <CheckCircle2 className="text-success" />,
  warning: <AlertTriangle className="text-warning" />,
  error: <AlertCircle className="text-danger" />,
}

/** Transient confirmations, bottom right. For lasting messages use pushNotification from the store. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ title, message, type, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).slice(2, 9)
      setToasts((prev) => [...prev.slice(-3), { id, title, message, type, duration }])
      if (duration > 0) setTimeout(() => dismissToast(id), duration)
      return id
    },
    [dismissToast],
  )

  // Stable identity: components that only call toast.* never re-render when a toast appears.
  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
      success: (message, title) => showToast({ message, title, type: 'success' }),
      error: (message, title) => showToast({ message, title, type: 'error', duration: 6000 }),
      info: (message, title) => showToast({ message, title, type: 'info' }),
      warning: (message, title) => showToast({ message, title, type: 'warning' }),
    }),
    [showToast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn('pointer-events-auto flex animate-rise-in items-start gap-3 rounded-lg border border-border-strong bg-overlay p-3.5 shadow-pop')}
          >
            <span className="mt-0.5 [&_svg]:h-4 [&_svg]:w-4">{icons[toast.type]}</span>
            <div className="min-w-0 flex-1">
              {toast.title && <p className="font-medium">{toast.title}</p>}
              <p className={cn('break-words', toast.title ? 'text-sm text-muted-foreground' : 'text-foreground')}>{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="rounded p-0.5 text-subtle transition-colors hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
