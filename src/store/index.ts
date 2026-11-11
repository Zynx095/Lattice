/**
 * APPLICATION STATE AND BUSINESS LOGIC.
 *
 * Stores hold data; the functions below are the only place that changes it.
 * Components call createRecord / updateRecord / deleteRecord and never write
 * to a store directly, so side effects (activity log, notifications) stay in
 * one file. To move to a backend, make these functions call src/services/api.ts
 * and write the response into the store.
 */
import { appConfig, themeConfig, type Contrast, type Density, type SceneSettings, type ThemeChoice } from '@/config'
import {
  statusMeta,
  type ActivityEntry,
  type AppNotification,
  type RecordDraft,
  type Tone,
  type WorkRecord,
} from '@/data/models'
import { sampleActivity, sampleNotifications, sampleRecords } from '@/data/sample'
import { uid } from '@/lib/utils'
import { createStore } from './createStore'

/* ---------- Settings ---------- */

export interface Settings {
  user: { name: string; email: string }
  sidebarCollapsed: boolean
  /* Appearance */
  theme: ThemeChoice
  accent: string
  density: Density
  /* Accessibility */
  contrast: Contrast
  /** Forces reduced motion even when the operating system does not ask for it. */
  reducedMotion: boolean
  /* 3D environment */
  sceneEnabled: boolean
  scene: SceneSettings
}

export const defaultSettings: Settings = {
  user: { name: appConfig.defaultUser.name, email: appConfig.defaultUser.email },
  sidebarCollapsed: false,
  theme: themeConfig.defaultTheme,
  accent: themeConfig.defaultAccent,
  density: 'comfortable',
  contrast: 'standard',
  reducedMotion: false,
  sceneEnabled: themeConfig.scene.enabledByDefault,
  scene: { ...themeConfig.scene.defaults },
}

export const settingsStore = createStore<Settings>('settings', defaultSettings)

// Settings saved by an earlier version lack newer fields. Fill them in once at start-up.
{
  const saved = settingsStore.get()
  settingsStore.set({ ...defaultSettings, ...saved, user: { ...defaultSettings.user, ...saved.user }, scene: { ...defaultSettings.scene, ...saved.scene } })
}

export const updateSettings = (patch: Partial<Settings>) => settingsStore.set((s) => ({ ...s, ...patch }))
export const updateScene = (patch: Partial<SceneSettings>) => settingsStore.set((s) => ({ ...s, scene: { ...s.scene, ...patch } }))
export const resetScene = () => settingsStore.set((s) => ({ ...s, scene: { ...themeConfig.scene.defaults } }))

/* ---------- Activity and notifications ---------- */

export const activityStore = createStore<ActivityEntry[]>('activity', sampleActivity)
export const notificationsStore = createStore<AppNotification[]>('notifications', sampleNotifications)

export function logActivity(action: string, subject: string, href?: string) {
  const entry: ActivityEntry = {
    id: uid('a'),
    action,
    subject,
    actor: settingsStore.get().user.name,
    at: new Date().toISOString(),
    href,
  }
  activityStore.set((list) => [entry, ...list].slice(0, 60))
}

export function pushNotification(title: string, body: string, tone: Tone = 'info', href?: string) {
  const n: AppNotification = { id: uid('n'), title, body, tone, at: new Date().toISOString(), read: false, href }
  notificationsStore.set((list) => [n, ...list].slice(0, 40))
}

export const markNotificationRead = (id: string) =>
  notificationsStore.set((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)))
export const markAllNotificationsRead = () => notificationsStore.set((list) => list.map((n) => ({ ...n, read: true })))
export const clearNotifications = () => notificationsStore.set([])

/* ---------- Records ---------- */

export const recordsStore = createStore<WorkRecord[]>('records', sampleRecords)

export function createRecord(draft: RecordDraft): WorkRecord {
  const now = new Date().toISOString()
  const record: WorkRecord = {
    ...draft,
    id: uid('r'),
    createdAt: now,
    completedAt: draft.status === 'done' ? now : undefined,
  }
  recordsStore.set((list) => [record, ...list])
  logActivity('added', record.title, `/records/${record.id}`)
  return record
}

export function updateRecord(id: string, patch: Partial<RecordDraft>): WorkRecord | undefined {
  const before = recordsStore.get().find((r) => r.id === id)
  if (!before) return undefined

  const after: WorkRecord = { ...before, ...patch }
  if (patch.status && patch.status !== before.status) {
    after.completedAt = patch.status === 'done' ? new Date().toISOString() : undefined
  }
  recordsStore.set((list) => list.map((r) => (r.id === id ? after : r)))

  const href = `/records/${id}`
  if (patch.status && patch.status !== before.status) {
    logActivity(patch.status === 'done' ? 'completed' : `marked as ${statusMeta[patch.status].label.toLowerCase()}`, after.title, href)
    // Example business rule: a blocked item is worth an inbox notification.
    if (patch.status === 'blocked') {
      pushNotification('Item blocked', `"${after.title}" was marked as blocked.`, 'danger', href)
    }
  } else {
    logActivity('edited', after.title, href)
  }
  return after
}

export function deleteRecord(id: string) {
  const record = recordsStore.get().find((r) => r.id === id)
  if (!record) return
  recordsStore.set((list) => list.filter((r) => r.id !== id))
  logActivity('deleted', record.title)
}

/* ---------- Assistant conversations ---------- */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** 'structured' messages carry parsed JSON in `data`. 'error' messages are failed requests. */
  kind: 'text' | 'structured' | 'error'
  data?: unknown
  /** Provider and model that produced an assistant message. */
  source?: string
}

export interface Conversation {
  id: string
  title: string
  updatedAt: string
  messages: ChatMessage[]
}

export const conversationsStore = createStore<Conversation[]>('conversations', [])

/* ---------- Reset ---------- */

export function resetWorkspaceData() {
  recordsStore.reset()
  activityStore.reset()
  notificationsStore.reset()
  conversationsStore.reset()
}
