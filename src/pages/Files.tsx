import { useEffect, useRef, useState } from 'react'
import { File as FileIcon, FileText, ImageIcon, Sparkles, X } from 'lucide-react'
import { aiPrompts, isEnabled, modules } from '@/config'
import { aiSource, describeAIError } from '@/lib/ai'
import { formatBytes, uid } from '@/lib/utils'
import { aiService } from '@/services/ai/ai.service'
import { logActivity } from '@/store'
import { AIError, ThinkingDots } from '@/components/ai/AIParts'
import { PageHeader } from '@/components/shell/PageHeader'
import { Dropzone } from '@/components/upload/Dropzone'
import { Badge, Button, Panel, useToast } from '@/components/ui'

/** What this page accepts. Change both lists together. */
const ACCEPT = ['image/', 'text/', 'application/pdf', 'application/json', '.csv', '.md', '.txt']
const ACCEPT_HINT = 'Images, PDF, text, CSV or JSON. Up to 5 MB each.'
const MAX_BYTES = 5 * 1024 * 1024

interface LocalFile {
  id: string
  file: File
  kind: 'image' | 'text' | 'other'
  status: 'reading' | 'ready' | 'failed'
  /** 0 to 1, progress of reading the file into memory. */
  progress: number
  previewUrl?: string
  text?: string
  summary?: { status: 'loading' | 'done' | 'error'; text?: string; source?: string }
}

const kindOf = (file: File): LocalFile['kind'] =>
  file.type.startsWith('image/') ? 'image' : file.type.startsWith('text/') || /\.(csv|md|txt|json)$/i.test(file.name) || file.type === 'application/json' ? 'text' : 'other'

export default function Files() {
  const toast = useToast()
  const [files, setFiles] = useState<LocalFile[]>([])
  const urls = useRef<string[]>([])

  // Release image previews when leaving the page.
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), [])

  const patch = (id: string, change: Partial<LocalFile>) => setFiles((list) => list.map((f) => (f.id === id ? { ...f, ...change } : f)))

  const add = (incoming: File[]) => {
    const entries: LocalFile[] = incoming.map((file) => ({ id: uid('f'), file, kind: kindOf(file), status: 'reading', progress: 0 }))
    setFiles((list) => [...entries, ...list])

    entries.forEach((entry) => {
      // Reading happens in this browser. The progress bar reports the FileReader, not a network transfer.
      const reader = new FileReader()
      reader.onprogress = (e) => e.lengthComputable && patch(entry.id, { progress: e.loaded / e.total })
      reader.onerror = () => patch(entry.id, { status: 'failed' })
      reader.onload = () => {
        if (entry.kind === 'text') {
          patch(entry.id, { status: 'ready', progress: 1, text: String(reader.result) })
        } else if (entry.kind === 'image') {
          const url = URL.createObjectURL(entry.file)
          urls.current.push(url)
          patch(entry.id, { status: 'ready', progress: 1, previewUrl: url })
        } else {
          patch(entry.id, { status: 'ready', progress: 1 })
        }
      }
      if (entry.kind === 'text') reader.readAsText(entry.file)
      else reader.readAsArrayBuffer(entry.file)
    })

    logActivity('read', incoming.length === 1 ? incoming[0].name : `${incoming.length} files`)
    toast.success(incoming.length === 1 ? `${incoming[0].name} added` : `${incoming.length} files added`)
  }

  const summarise = async (entry: LocalFile) => {
    if (!entry.text) return
    patch(entry.id, { summary: { status: 'loading' } })
    try {
      const res = await aiService.generateText(
        [
          { role: 'user', content: `Document "${entry.file.name}":\n\n${entry.text.slice(0, 12_000)}` },
          { role: 'user', content: aiPrompts.fileSummary },
        ],
        { systemPrompt: aiPrompts.system },
      )
      patch(entry.id, { summary: { status: 'done', text: res.text, source: aiSource(res) } })
    } catch (err) {
      patch(entry.id, { summary: { status: 'error', text: describeAIError(err) } })
    }
  }

  return (
    <>
      <PageHeader title={modules.files.title} description={modules.files.description} />

      <Dropzone
        accept={ACCEPT}
        maxSizeBytes={MAX_BYTES}
        hint={ACCEPT_HINT}
        onFiles={add}
        onReject={(messages) => messages.forEach((m) => toast.error(m, 'File not added'))}
      />
      <p className="mt-2 text-sm text-subtle">
        Files are read in this browser and are not sent to a server. They are gone when you leave this page.
      </p>

      {files.length > 0 && (
        <Panel
          className="mt-6"
          title={`${files.length} file${files.length > 1 ? 's' : ''}`}
          actions={<Button variant="ghost" size="sm" onClick={() => setFiles([])}>Remove all</Button>}
          flush
        >
          <ul className="border-t border-border">
            {files.map((f) => {
              const Icon = f.kind === 'image' ? ImageIcon : f.kind === 'text' ? FileText : FileIcon
              return (
                <li key={f.id} className="border-b border-border/70 px-5 py-4 last:border-0">
                  <div className="flex items-start gap-4">
                    {f.previewUrl ? (
                      <img src={f.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-md border border-border object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-raised text-muted-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{f.file.name}</p>
                      <p className="num mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-subtle">
                        <span>{formatBytes(f.file.size)}</span>
                        <span>{f.file.type || 'Unknown type'}</span>
                        {f.status === 'ready' && <Badge tone="success">Read locally</Badge>}
                        {f.status === 'failed' && <Badge tone="danger">Could not be read</Badge>}
                      </p>
                      {f.status === 'reading' && (
                        <div className="mt-2 h-1 max-w-xs overflow-hidden rounded-full bg-raised" role="progressbar" aria-label={`Reading ${f.file.name}`} aria-valuenow={Math.round(f.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.max(4, f.progress * 100)}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {f.kind === 'text' && f.status === 'ready' && isEnabled('assistant') && (
                        <Button variant="secondary" size="sm" leftIcon={<Sparkles />} isLoading={f.summary?.status === 'loading'} onClick={() => summarise(f)}>
                          Summarise
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${f.file.name}`} onClick={() => setFiles((list) => list.filter((x) => x.id !== f.id))}>
                        <X />
                      </Button>
                    </div>
                  </div>

                  {f.text !== undefined && (
                    <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background/50 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                      {f.text.slice(0, 1200) || 'This file has no text.'}
                      {f.text.length > 1200 && '\n…'}
                    </pre>
                  )}
                  {f.kind === 'other' && f.status === 'ready' && (
                    <p className="mt-3 text-sm text-subtle">No preview for this file type.</p>
                  )}

                  {f.summary?.status === 'loading' && <div className="mt-3"><ThinkingDots label="Summarising" /></div>}
                  {f.summary?.status === 'error' && <div className="mt-3"><AIError message={f.summary.text!} onRetry={() => summarise(f)} /></div>}
                  {f.summary?.status === 'done' && (
                    <div className="mt-3 rounded-md border border-border bg-raised/40 p-3">
                      <p className="mb-1 text-sm font-medium text-subtle">Assistant summary</p>
                      <p className="max-w-prose whitespace-pre-wrap leading-relaxed">{f.summary.text}</p>
                      <p className="mt-2 text-xs text-subtle">Source: {f.summary.source}</p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
    </>
  )
}
