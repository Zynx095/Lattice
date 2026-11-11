import { useCallback, useRef, useState } from 'react'
import { amountLabel, statusMeta, type WorkRecord } from '@/data/models'
import { AIServiceError, type AICompletionResponse } from '@/services/ai/ai.types'
import { groupCount } from './metrics'
import { dayKey } from './utils'

/**
 * Glue between the app and src/services/ai. The service itself is untouched;
 * this file builds context from app data and turns failures into messages.
 */

export const aiSource = (res: AICompletionResponse<unknown>) => `${res.provider} · ${res.model}${res.fallback ? ' (fallback)' : ''}`

/** A message a person can act on, for any error thrown by the AI service. */
export function describeAIError(err: unknown): string {
  if (err instanceof AIServiceError) {
    switch (err.code) {
      case 'TIMEOUT_ERROR':
        return 'The assistant took too long to answer. Try again, or ask a shorter question.'
      case 'JSON_PARSE_ERROR':
        return 'The assistant answered, but not in the structured format that was requested. Try again or switch to a plain answer.'
      case 'NETWORK_ERROR':
        return 'Could not reach the AI backend. Start it with "npm run server" and try again.'
      case 'PROVIDERS_UNAVAILABLE':
        return 'Neither Claude nor Gemini could answer right now (quota, billing or network). Try again in a moment.'
      default:
        if (err.status === 401 || err.status === 403) return 'The AI provider rejected the credentials. Check the server-side API keys in .env.'
        if (err.status === 429) return 'The AI provider is rate limiting requests. Wait a moment and try again.'
        return err.message
    }
  }
  return err instanceof Error ? err.message : 'The request failed for an unknown reason.'
}

/**
 * The dataset as compact text for a prompt. Rewrite this when the data model
 * changes: it decides what the assistant knows about the workspace.
 */
export function workspaceContext(records: WorkRecord[], { includeOwners = true }: { includeOwners?: boolean } = {}): string {
  const today = dayKey(Date.now())
  const byStatus = groupCount(records, (r) => statusMeta[r.status].label).map((g) => `${g.label}: ${g.value}`).join(', ')
  const rows = records
    .slice(0, 40)
    .map((r) => `- ${r.title} | ${r.category} | ${statusMeta[r.status].label} | priority ${r.priority} |${includeOwners ? ` owner ${r.owner} |` : ''} ${amountLabel} ${r.amount} | due ${r.dueDate}${r.notes ? ` | notes: ${r.notes}` : ''}`)
    .join('\n')
  return `Workspace data as of ${today}.\nTotals by status: ${byStatus || 'no records'}.\nRecords (${records.length}):\n${rows}`
}

/** Runs one async request at a time and tracks its state. A newer call supersedes an older one. */
export function useAsync<T>() {
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; data?: T; error?: string }>({ status: 'idle' })
  const ticket = useRef(0)

  const run = useCallback(async (task: () => Promise<T>) => {
    const mine = ++ticket.current
    setState({ status: 'loading' })
    try {
      const data = await task()
      if (mine === ticket.current) setState({ status: 'done', data })
    } catch (err) {
      if (mine === ticket.current) setState({ status: 'error', error: describeAIError(err) })
    }
  }, [])

  const reset = useCallback(() => {
    ticket.current++
    setState({ status: 'idle' })
  }, [])

  return { ...state, run, reset }
}
