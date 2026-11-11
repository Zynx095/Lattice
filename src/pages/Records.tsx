import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Inbox, Pencil, Plus, Search, SearchX, Trash2 } from 'lucide-react'
import { appConfig, cap, modules } from '@/config'
import { amountLabel, categories, priorityMeta, statusMeta, type WorkRecord } from '@/data/models'
import { formatDate, formatNumber } from '@/lib/utils'
import { deleteRecord, recordsStore } from '@/store'
import { DataTable, type Column } from '@/components/data/DataTable'
import { RecordDialog } from '@/components/data/RecordDialog'
import { PageHeader } from '@/components/shell/PageHeader'
import { Badge, Button, ConfirmDialog, EmptyState, Input, Panel, Select, useToast } from '@/components/ui'

const priorityRank = { low: 0, medium: 1, high: 2 }
const statusOptions = Object.entries(statusMeta).map(([value, m]) => ({ value, label: m.label }))

/** Table columns. Add, remove or reorder to change the listing. */
const columns: Column<WorkRecord>[] = [
  {
    key: 'title',
    header: 'Title',
    sortValue: (r) => r.title,
    render: (r) => (
      <div className="min-w-0 max-w-[48vw] sm:max-w-[26rem]">
        <p className="truncate font-medium">{r.title}</p>
        <p className="truncate text-sm text-subtle md:hidden">{r.category}, {r.owner}</p>
      </div>
    ),
  },
  { key: 'category', header: 'Category', hideBelow: 'md', sortValue: (r) => r.category, render: (r) => <span className="text-muted-foreground">{r.category}</span> },
  { key: 'owner', header: 'Owner', hideBelow: 'lg', sortValue: (r) => r.owner, render: (r) => <span className="whitespace-nowrap text-muted-foreground">{r.owner}</span> },
  { key: 'status', header: 'Status', sortValue: (r) => Object.keys(statusMeta).indexOf(r.status), render: (r) => <Badge tone={statusMeta[r.status].tone}>{statusMeta[r.status].label}</Badge> },
  { key: 'priority', header: 'Priority', hideBelow: 'lg', sortValue: (r) => priorityRank[r.priority], render: (r) => <span className={r.priority === 'high' ? 'text-warning' : 'text-muted-foreground'}>{priorityMeta[r.priority].label}</span> },
  { key: 'amount', header: amountLabel, align: 'right', hideBelow: 'md', sortValue: (r) => r.amount, render: (r) => formatNumber(r.amount) },
  { key: 'dueDate', header: 'Due', hideBelow: 'sm', sortValue: (r) => r.dueDate, render: (r) => <span className="num whitespace-nowrap text-muted-foreground">{formatDate(r.dueDate)}</span> },
]

export default function Records() {
  const records = recordsStore.use()
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const noun = appConfig.entity

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [dialog, setDialog] = useState<{ open: boolean; record?: WorkRecord }>({ open: false })
  const [toDelete, setToDelete] = useState<WorkRecord | null>(null)

  // Links elsewhere in the app open the create dialog with /records?new=1.
  useEffect(() => {
    if (params.get('new') === '1') {
      setDialog({ open: true })
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records.filter(
      (r) =>
        (!status || r.status === status) &&
        (!category || r.category === category) &&
        (!q || `${r.title} ${r.owner} ${r.category} ${r.notes}`.toLowerCase().includes(q)),
    )
  }, [records, query, status, category])

  const filtering = Boolean(query || status || category)
  const clear = () => {
    setQuery('')
    setStatus('')
    setCategory('')
  }

  return (
    <>
      <PageHeader
        title={modules.records.title}
        description={modules.records.description}
        actions={<Button leftIcon={<Plus />} onClick={() => setDialog({ open: true })}>New {noun.singular}</Button>}
      />

      <Panel flush>
        <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
          <div className="min-w-[12rem] flex-1 sm:max-w-xs">
            <Input
              type="search"
              aria-label={`Search ${noun.plural}`}
              placeholder="Search by title, owner or notes"
              leftIcon={<Search />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="w-[9.5rem]">
            <Select aria-label="Filter by status" placeholderOption="All statuses" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
          <div className="w-[9.5rem]">
            <Select aria-label="Filter by category" placeholderOption="All categories" options={categories.map((c) => ({ value: c, label: c }))} value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          {filtering && <Button variant="ghost" onClick={clear}>Clear filters</Button>}
        </div>

        <div className="border-t border-border">
          <DataTable
            label={modules.records.title}
            rows={filtered}
            columns={columns}
            getRowId={(r) => r.id}
            initialSort={{ key: 'dueDate', direction: 'desc' }}
            onRowClick={(r) => navigate(`${modules.records.path}/${r.id}`)}
            rowActions={(r) => (
              <>
                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${r.title}`} title="Edit" onClick={() => setDialog({ open: true, record: r })}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${r.title}`} title="Delete" className="hover:text-danger" onClick={() => setToDelete(r)}>
                  <Trash2 />
                </Button>
              </>
            )}
            empty={
              filtering ? (
                <EmptyState
                  icon={SearchX}
                  title={`No ${noun.plural} match these filters`}
                  description="Try a different search term or remove a filter."
                  action={<Button variant="secondary" onClick={clear}>Clear filters</Button>}
                />
              ) : (
                <EmptyState
                  icon={Inbox}
                  title={`No ${noun.plural} yet`}
                  description={`Everything you track lives here. Add the first ${noun.singular} to get started.`}
                  action={<Button onClick={() => setDialog({ open: true })}>Add a {noun.singular}</Button>}
                />
              )
            }
          />
        </div>
      </Panel>

      <RecordDialog isOpen={dialog.open} record={dialog.record} onClose={() => setDialog((d) => ({ ...d, open: false }))} />

      <ConfirmDialog
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            deleteRecord(toDelete.id)
            toast.success(`${cap(noun.singular)} deleted`)
          }
          setToDelete(null)
        }}
        title={`Delete this ${noun.singular}?`}
        description={`"${toDelete?.title ?? ''}" will be removed permanently. This cannot be undone.`}
        confirmLabel={`Delete ${noun.singular}`}
        destructive
      />
    </>
  )
}
