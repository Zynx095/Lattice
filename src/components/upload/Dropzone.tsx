import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn, formatBytes } from '@/lib/utils'

export interface DropzoneProps {
  /** Called with files that passed validation. */
  onFiles: (files: File[]) => void
  /** Called with one message per rejected file. */
  onReject?: (messages: string[]) => void
  /** Allowed MIME types or prefixes ("image/") and extensions (".csv"). Empty allows everything. */
  accept?: string[]
  maxSizeBytes?: number
  multiple?: boolean
  /** Plain-language summary of what is allowed, shown inside the zone. */
  hint?: string
}

export function validateFile(file: File, accept: string[], maxSizeBytes: number): string | null {
  if (file.size > maxSizeBytes) return `${file.name} is ${formatBytes(file.size)}. The limit is ${formatBytes(maxSizeBytes)}.`
  if (file.size === 0) return `${file.name} is empty.`
  if (accept.length === 0) return null
  const name = file.name.toLowerCase()
  const ok = accept.some((rule) => (rule.startsWith('.') ? name.endsWith(rule) : file.type.startsWith(rule)))
  return ok ? null : `${file.name} is not a supported file type.`
}

/**
 * Drag-and-drop target with a file picker. It only validates and hands files
 * back; reading or sending them is up to the caller.
 */
export function Dropzone({ onFiles, onReject, accept = [], maxSizeBytes = 5 * 1024 * 1024, multiple = true, hint }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const depth = useRef(0)

  const handle = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const files = multiple ? [...list] : [list[0]]
    const accepted: File[] = []
    const rejected: string[] = []
    for (const file of files) {
      const problem = validateFile(file, accept, maxSizeBytes)
      if (problem) rejected.push(problem)
      else accepted.push(file)
    }
    if (rejected.length) onReject?.(rejected)
    if (accepted.length) onFiles(accepted)
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault()
        depth.current++
        setOver(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        depth.current = 0
        setOver(false)
        handle(e.dataTransfer.files)
      }}
      className={cn(
        'flex flex-col items-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors duration-150',
        over ? 'border-primary bg-primary/5' : 'border-border-strong bg-card/60',
      )}
    >
      <span className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-raised transition-colors', over ? 'text-primary' : 'text-muted-foreground')}>
        <Upload className="h-5 w-5" />
      </span>
      <p className="font-medium">{over ? 'Drop to add' : 'Drag files here'}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        or{' '}
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded font-medium text-primary underline-offset-4 hover:underline">
          choose from your device
        </button>
      </p>
      {hint && <p className="mt-3 text-sm text-subtle">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept.map((a) => (a.endsWith('/') ? `${a}*` : a)).join(',') || undefined}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          handle(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
