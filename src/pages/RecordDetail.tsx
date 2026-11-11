import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileQuestion, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { aiPrompts, appConfig, cap, isEnabled, modules } from '@/config'
import { amountLabel, priorityMeta, statusMeta, type RecordStatus } from '@/data/models'
import { aiSource, useAsync } from '@/lib/ai'
import { dayKey, formatDate, formatNumber } from '@/lib/utils'
import { aiService } from '@/services/ai/ai.service'
import { activityStore, deleteRecord, recordsStore, updateRecord } from '@/store'
import { AIError, ThinkingDots } from '@/components/ai/AIParts'
import { ActivityFeed } from '@/components/dashboard/Dashboard'
import { RecordDialog } from '@/components/data/RecordDialog'
import { PageHeader, useBreadcrumb } from '@/components/shell/PageHeader'
import { Badge, Button, ConfirmDialog, EmptyState, Panel, Tabs, useToast } from '@/components/ui'

const statusOptions = (Object.keys(statusMeta) as RecordStatus[]).map((value) => ({ value, label: statusMeta[value].label }))

export default function RecordDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const record = recordsStore.use().find((r) => r.id === id)
  const history = activityStore.use().filter((a) => a.href === `${modules.records.path}/${id}`)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const summary = useAsync<{ text: string; source: string }>()
  const noun = appConfig.entity
  useBreadcrumb(record?.title)

  if (!record) {
    return (
      <Panel className="mt-6">
        <EmptyState
          icon={FileQuestion}
          title={`This ${noun.singular} does not exist`}
          description="It may have been deleted, or the link is wrong."
          action={<Button variant="secondary" onClick={() => navigate(modules.records.path)}>Back to {noun.plural}</Button>}
        />
      </Panel>
    )
  }

  const overdue = record.status !== 'done' && record.dueDate < dayKey(Date.now())
  const facts: [string, React.ReactNode][] = [
    ['Category', record.category],
    ['Owner', record.owner],
    ['Priority', priorityMeta[record.priority].label],
    [amountLabel, formatNumber(record.amount)],
    ['Due', <span className={overdue ? 'text-danger' : undefined}>{formatDate(record.dueDate)}{overdue ? ' (overdue)' : ''}</span>],
    ['Added', formatDate(record.createdAt, true)],
    ...(record.completedAt ? [['Completed', formatDate(record.completedAt, true)] as [string, React.ReactNode]] : []),
  ]

  const summarise = () =>
    summary.run(async () => {
      const res = await aiService.generateText(
        [
          { role: 'user', content: `${cap(noun.singular)}:\n${JSON.stringify(record, null, 2)}` },
          { role: 'user', content: aiPrompts.recordSummary },
        ],
        { systemPrompt: aiPrompts.system },
      )
      return { text: res.text, source: aiSource(res) }
    })

  return (
    <>
      <Link to={modules.records.path} className="mb-4 inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        All {noun.plural}
      </Link>

      <PageHeader
        title={record.title}
        meta={
          <>
            <Badge tone={statusMeta[record.status].tone}>{statusMeta[record.status].label}</Badge>
            {record.priority === 'high' && <Badge tone="warning">High priority</Badge>}
          </>
        }
        actions={
          <>
            <Button variant="ghost" leftIcon={<Trash2 />} onClick={() => setConfirmDelete(true)}>Delete</Button>
            <Button variant="secondary" leftIcon={<Pencil />} onClick={() => setEditing(true)}>Edit</Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel
            title="Details"
            actions={
              <Tabs
                label="Status"
                value={record.status}
                options={statusOptions}
                onChange={(status) => {
                  if (status === record.status) return
                  updateRecord(record.id, { status })
                  toast.success(`Status changed to ${statusMeta[status].label.toLowerCase()}`)
                }}
                className="max-sm:hidden"
              />
            }
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-sm text-subtle">{label}</dt>
                  <dd className="mt-0.5 truncate">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-sm text-subtle">Notes</p>
              <p className="mt-1 max-w-prose whitespace-pre-wrap text-muted-foreground">{record.notes || 'No notes yet. Use Edit to add some.'}</p>
            </div>
            <Tabs
              label="Status"
              value={record.status}
              options={statusOptions}
              onChange={(status) => status !== record.status && updateRecord(record.id, { status })}
              className="mt-4 sm:hidden"
            />
          </Panel>

          {isEnabled('assistant') && (
            <Panel
              title="Assistant summary"
              actions={
                <Button variant="secondary" size="sm" leftIcon={<Sparkles />} isLoading={summary.status === 'loading'} onClick={summarise}>
                  {summary.status === 'done' ? 'Summarise again' : 'Summarise'}
                </Button>
              }
            >
              {summary.status === 'idle' && (
                <div className="space-y-3">
                  <p className="text-muted-foreground">Get a two-sentence summary and a suggested next step for this {noun.singular}.</p>
                </div>
              )}
              {summary.status === 'loading' && <ThinkingDots label="Summarising" />}
              {summary.status === 'error' && <AIError message={summary.error!} onRetry={summarise} />}
              {summary.status === 'done' && summary.data && (
                <>
                  <p className="max-w-prose whitespace-pre-wrap leading-relaxed">{summary.data.text}</p>
                  <p className="mt-3 text-xs text-subtle">Source: {summary.data.source}</p>
                </>
              )}
            </Panel>
          )}
        </div>

        <Panel title="History" className="self-start">
          <ActivityFeed entries={history} limit={8} />
        </Panel>
      </div>

      <RecordDialog isOpen={editing} record={record} onClose={() => setEditing(false)} />
      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteRecord(record.id)
          toast.success(`${cap(noun.singular)} deleted`)
          navigate(modules.records.path)
        }}
        title={`Delete this ${noun.singular}?`}
        description={`"${record.title}" will be removed permanently. This cannot be undone.`}
        confirmLabel={`Delete ${noun.singular}`}
        destructive
      />
    </>
  )
}
