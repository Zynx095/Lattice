/**
 * SAMPLE DATA. Neutral placeholder rows, kept apart from application logic.
 * Replace the arrays below (or load from an API in src/services/api.ts).
 * Dates are generated relative to today so charts always look current.
 */
import { DAY_MS, dayKey } from '@/lib/utils'
import type { ActivityEntry, AppNotification, RecordPriority, RecordStatus, Site, WorkRecord } from './models'

const ago = (days: number, hour = 10) => {
  const d = new Date(Date.now() - days * DAY_MS)
  d.setHours(hour, (days * 17) % 60, 0, 0)
  return d.toISOString()
}

// title, category, status, priority, owner, amount, created (days ago), done (days ago), due (days from now)
type Row = [string, string, RecordStatus, RecordPriority, string, number, number, number | null, number]

const rows: Row[] = [
  ['Draft the kickoff agenda', 'Planning', 'done', 'medium', 'Alex Morgan', 3, 28, 26, -24],
  ['Collect baseline measurements', 'Research', 'done', 'high', 'Priya Nair', 12, 28, 21, -19],
  ['Set up the shared inbox', 'Support', 'done', 'low', 'Sam Rivera', 2, 27, 26, -23],
  ['Map the current handoff steps', 'Operations', 'done', 'medium', 'Jordan Lee', 8, 25, 19, -17],
  ['Interview five regular users', 'Research', 'done', 'high', 'Priya Nair', 10, 25, 16, -14],
  ['Agree on naming conventions', 'Planning', 'done', 'low', 'Chris Okafor', 2, 25, 21, -18],
  ['Clear the backlog of old requests', 'Support', 'done', 'medium', 'Sam Rivera', 9, 22, 12, -10],
  ['Write the weekly checklist', 'Operations', 'done', 'medium', 'Jordan Lee', 4, 20, 12, -11],
  ['Compare three scheduling options', 'Research', 'done', 'medium', 'Alex Morgan', 6, 19, 12, -9],
  ['Publish the intake form', 'Operations', 'done', 'high', 'Chris Okafor', 5, 18, 10, -8],
  ['Review response times', 'Support', 'done', 'medium', 'Sam Rivera', 4, 16, 10, -7],
  ['Plan next month in outline', 'Planning', 'done', 'medium', 'Alex Morgan', 5, 13, 8, -6],
  ['Tidy the shared folder structure', 'Operations', 'done', 'low', 'Jordan Lee', 3, 13, 8, -5],
  ['Summarise interview findings', 'Research', 'done', 'high', 'Priya Nair', 7, 13, 6, -4],
  ['Book the review room', 'Planning', 'done', 'low', 'Chris Okafor', 1, 12, 6, -4],
  ['Answer the open access requests', 'Support', 'done', 'medium', 'Sam Rivera', 3, 12, 5, -3],
  ['Update the contact list', 'Operations', 'done', 'low', 'Jordan Lee', 2, 11, 5, -3],
  ['Test the intake form on a phone', 'Research', 'done', 'medium', 'Priya Nair', 2, 10, 3, -2],
  ['Send the fortnightly update', 'Planning', 'done', 'medium', 'Alex Morgan', 2, 9, 3, -2],
  ['Archive requests from last month', 'Support', 'done', 'low', 'Sam Rivera', 3, 9, 2, -1],
  ['Reorder printed labels', 'Operations', 'done', 'low', 'Jordan Lee', 1, 8, 1, -1],
  ['Confirm room and equipment list', 'Operations', 'in_progress', 'high', 'Chris Okafor', 6, 8, null, 1],
  ['Reply to open questions from the review', 'Support', 'in_progress', 'medium', 'Sam Rivera', 3, 8, null, 2],
  ['Prototype the reporting view', 'Research', 'in_progress', 'medium', 'Priya Nair', 14, 7, null, 5],
  ['Waiting on access to the archive', 'Operations', 'blocked', 'high', 'Jordan Lee', 4, 7, null, -1],
  ['Schedule the mid-point review', 'Planning', 'open', 'medium', 'Alex Morgan', 1, 6, null, 4],
  ['Rewrite the welcome message', 'Support', 'in_progress', 'low', 'Sam Rivera', 2, 5, null, 3],
  ['Estimate effort for phase two', 'Planning', 'open', 'high', 'Alex Morgan', 6, 5, null, 6],
  ['Check the numbers against last quarter', 'Research', 'open', 'medium', 'Priya Nair', 5, 5, null, 8],
  ['Approval pending from second reviewer', 'Planning', 'blocked', 'medium', 'Chris Okafor', 2, 3, null, 2],
  ['Rotate on-call cover for next week', 'Support', 'open', 'medium', 'Sam Rivera', 1, 3, null, 5],
  ['Label and store returned equipment', 'Operations', 'open', 'low', 'Jordan Lee', 3, 2, null, 9],
  ['Outline the handover document', 'Planning', 'open', 'medium', 'Chris Okafor', 4, 2, null, 12],
  ['Collect feedback on the new checklist', 'Research', 'open', 'low', 'Priya Nair', 3, 2, null, 14],
  ['Draft questions for the next survey', 'Research', 'open', 'medium', 'Alex Morgan', 4, 1, null, 10],
  ['Find a backup for Friday cover', 'Support', 'open', 'high', 'Sam Rivera', 1, 0, null, 3],
]

export const sampleRecords: WorkRecord[] = rows.map(
  ([title, category, status, priority, owner, amount, created, done, due], i) => ({
    id: `r${String(i + 1).padStart(3, '0')}`,
    title,
    category,
    status,
    priority,
    owner,
    amount,
    dueDate: dayKey(Date.now() + due * DAY_MS),
    notes: '',
    createdAt: ago(created, 9 + (i % 8)),
    completedAt: done === null ? undefined : ago(done, 15),
  }),
)

export const sampleActivity: ActivityEntry[] = [
  { id: 'a1', action: 'added', subject: 'Collect feedback on the new checklist', actor: 'Priya Nair', at: ago(2, 8), href: '/records/r034' },
  { id: 'a2', action: 'marked as blocked', subject: 'Approval pending from second reviewer', actor: 'Chris Okafor', at: ago(1, 16), href: '/records/r030' },
  { id: 'a3', action: 'completed', subject: 'Summarise interview findings', actor: 'Priya Nair', at: ago(2, 15), href: '/records/r014' },
  { id: 'a4', action: 'completed', subject: 'Tidy the shared folder structure', actor: 'Jordan Lee', at: ago(3, 15), href: '/records/r013' },
  { id: 'a5', action: 'changed the owner of', subject: 'Estimate effort for phase two', actor: 'Alex Morgan', at: ago(4, 11), href: '/records/r028' },
  { id: 'a6', action: 'completed', subject: 'Plan next month in outline', actor: 'Alex Morgan', at: ago(4, 15), href: '/records/r012' },
]

export const sampleNotifications: AppNotification[] = [
  { id: 'n1', title: 'Due date passed', body: '"Waiting on access to the archive" was due yesterday and is still blocked.', tone: 'danger', at: ago(0, 7), read: false, href: '/records/r025' },
  { id: 'n2', title: 'Two items due this week', body: 'Jordan and Sam each have an item due in the next two days.', tone: 'warning', at: ago(1, 9), read: false, href: '/records' },
  { id: 'n3', title: 'Weekly summary is ready', body: 'Several items were completed in the last seven days.', tone: 'info', at: ago(2, 9), read: true, href: '/analytics' },
]

/** Coordinates are spread around one city so the default plot has shape. */
export const sampleSites: Site[] = [
  { id: 's1', name: 'North hub', detail: 'Main office, 4 open items', lat: 13.1007, lng: 77.5963, tone: 'info' },
  { id: 's2', name: 'East depot', detail: 'Storage and returns', lat: 12.9698, lng: 77.7499, tone: 'success' },
  { id: 's3', name: 'Central desk', detail: 'Walk-in support point', lat: 12.9716, lng: 77.5946, tone: 'success' },
  { id: 's4', name: 'South annex', detail: 'Access currently restricted', lat: 12.8452, lng: 77.6602, tone: 'danger' },
  { id: 's5', name: 'West yard', detail: 'Equipment pickup, 2 open items', lat: 12.9539, lng: 77.4905, tone: 'warning' },
  { id: 's6', name: 'Lakeside room', detail: 'Used for reviews', lat: 13.0358, lng: 77.6431, tone: 'info' },
]
