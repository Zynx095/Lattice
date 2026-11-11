/**
 * DATA MODEL. The main dataset of the app.
 *
 * To adapt to a new domain:
 *   1. Rename / add properties on WorkRecord.
 *   2. Describe each editable property in `recordFields`. The table, the
 *      create/edit dialog, the detail page and validation all read this list.
 *   3. Replace the rows in sample.ts.
 */

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export type RecordStatus = 'open' | 'in_progress' | 'blocked' | 'done'
export type RecordPriority = 'low' | 'medium' | 'high'

export interface WorkRecord {
  id: string
  title: string
  category: string
  status: RecordStatus
  priority: RecordPriority
  owner: string
  /** A generic numeric measure. Rename to cost, quantity, score, etc. */
  amount: number
  /** yyyy-mm-dd */
  dueDate: string
  notes: string
  /** ISO timestamps, maintained by the store. */
  createdAt: string
  completedAt?: string
}

export const statusMeta: Record<RecordStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'warning' },
  blocked: { label: 'Blocked', tone: 'danger' },
  done: { label: 'Done', tone: 'success' },
}

export const priorityMeta: Record<RecordPriority, { label: string; tone: Tone }> = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'neutral' },
  high: { label: 'High', tone: 'warning' },
}

export const categories = ['Planning', 'Operations', 'Research', 'Support']
export const owners = ['Alex Morgan', 'Sam Rivera', 'Jordan Lee', 'Priya Nair', 'Chris Okafor']

/** Label for the generic numeric measure, used in tables and charts. */
export const amountLabel = 'Effort (hrs)'

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'date'

export interface FieldDef<T> {
  key: keyof T & string
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
  required?: boolean
  min?: number
  max?: number
  maxLength?: number
  placeholder?: string
  help?: string
  /** Takes the full row in two-column forms. */
  wide?: boolean
}

const toOptions = (values: string[]) => values.map((v) => ({ value: v, label: v }))
const metaOptions = (meta: Record<string, { label: string }>) =>
  Object.entries(meta).map(([value, m]) => ({ value, label: m.label }))

export const recordFields: FieldDef<WorkRecord>[] = [
  { key: 'title', label: 'Title', type: 'text', required: true, maxLength: 80, placeholder: 'What needs to happen', wide: true },
  { key: 'category', label: 'Category', type: 'select', options: toOptions(categories), required: true },
  { key: 'owner', label: 'Owner', type: 'select', options: toOptions(owners), required: true },
  { key: 'status', label: 'Status', type: 'select', options: metaOptions(statusMeta), required: true },
  { key: 'priority', label: 'Priority', type: 'select', options: metaOptions(priorityMeta), required: true },
  { key: 'amount', label: amountLabel, type: 'number', required: true, min: 0, max: 1000, help: 'Between 0 and 1,000.' },
  { key: 'dueDate', label: 'Due date', type: 'date', required: true },
  { key: 'notes', label: 'Notes', type: 'textarea', maxLength: 400, placeholder: 'Context, links, anything the owner should know', wide: true },
]

/** Values a blank create form starts with. */
export const emptyRecord = (): Omit<WorkRecord, 'id' | 'createdAt' | 'completedAt'> => ({
  title: '',
  category: categories[0],
  status: 'open',
  priority: 'medium',
  owner: owners[0],
  amount: 4,
  dueDate: '',
  notes: '',
})

export type RecordDraft = ReturnType<typeof emptyRecord>

/* ---- Supporting types used by the shell and sample data ---- */

export interface ActivityEntry {
  id: string
  /** What happened, written as a sentence fragment: "created", "marked done". */
  action: string
  subject: string
  actor: string
  at: string
  /** Optional link target, e.g. /records/abc */
  href?: string
}

export interface AppNotification {
  id: string
  title: string
  body: string
  tone: Tone
  at: string
  read: boolean
  href?: string
}

export interface Site {
  id: string
  name: string
  detail: string
  lat: number
  lng: number
  tone: Tone
}
