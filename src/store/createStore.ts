import { useSyncExternalStore } from 'react'
import { appConfig } from '@/config'

/**
 * A tiny shared store: one value, persisted to localStorage, readable from any
 * component with `store.use()` and writable from anywhere with `store.set()`.
 * Every component that calls use() re-renders when the value changes, which is
 * what keeps dashboard metrics in step with the records table.
 */
export interface Store<T> {
  get: () => T
  set: (next: T | ((current: T) => T)) => void
  use: () => T
  reset: () => void
}

export function createStore<T>(key: string, initial: T, persist = true): Store<T> {
  const storageKey = `${appConfig.storagePrefix}:${key}`
  const listeners = new Set<() => void>()

  let state: T = initial
  if (persist) {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw !== null) state = JSON.parse(raw) as T
    } catch {
      /* unreadable or blocked storage: start from the initial value */
    }
  }

  const get = () => state

  const set: Store<T>['set'] = (next) => {
    state = typeof next === 'function' ? (next as (c: T) => T)(state) : next
    if (persist) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(state))
      } catch {
        /* storage full or blocked: keep working in memory */
      }
    }
    listeners.forEach((l) => l())
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  return {
    get,
    set,
    use: () => useSyncExternalStore(subscribe, get),
    reset: () => set(initial),
  }
}
