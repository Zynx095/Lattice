import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, Copy, History, MessageSquarePlus, Sparkles, Trash2 } from 'lucide-react'
import { aiPrompts, appConfig, modules } from '@/config'
import { aiSource, describeAIError, workspaceContext } from '@/lib/ai'
import { cn, timeAgo, uid } from '@/lib/utils'
import { aiService } from '@/services/ai/ai.service'
import type { AIMessage } from '@/services/ai/ai.types'
import { conversationsStore, recordsStore, type ChatMessage, type Conversation } from '@/store'
import { AIError, StructuredResult, ThinkingDots } from '@/components/ai/AIParts'
import { PageHeader } from '@/components/shell/PageHeader'
import { Button, ConfirmDialog, Tabs } from '@/components/ui'

type Mode = 'text' | 'structured'

const patchConversation = (id: string, change: (c: Conversation) => Conversation) =>
  conversationsStore.set((list) => list.map((c) => (c.id === id ? change(c) : c)))

const addMessage = (id: string, message: ChatMessage) =>
  patchConversation(id, (c) => ({ ...c, updatedAt: new Date().toISOString(), messages: [...c.messages, message] }))

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          /* clipboard blocked: nothing to confirm */
        }
      }}
      className="inline-flex items-center gap-1 rounded text-xs text-subtle transition-colors hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function Message({ message, onRetry }: { message: ChatMessage; onRetry?: () => void }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-br-sm border border-border bg-raised px-3.5 py-2">{message.content}</p>
      </div>
    )
  }
  if (message.kind === 'error') return <AIError message={message.content} onRetry={onRetry} />
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-raised text-primary">
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        {message.kind === 'structured' ? (
          <StructuredResult data={message.data} />
        ) : (
          <p className="max-w-prose whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        )}
        <p className="mt-2 flex items-center gap-3 text-xs text-subtle">
          {message.source && <span>{message.source}</span>}
          <CopyButton text={message.content} />
        </p>
      </div>
    </div>
  )
}

export default function Assistant() {
  const conversations = conversationsStore.use()
  const records = recordsStore.use()
  const [activeId, setActiveId] = useState<string | null>(() => conversations[0]?.id ?? null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState<Mode>('text')
  const [useData, setUseData] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [toDelete, setToDelete] = useState<Conversation | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const active = conversations.find((c) => c.id === activeId) ?? null
  const pending = pendingId !== null && pendingId === activeId

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [active?.messages.length, pending])

  /** Sends the conversation so far to the AI service and stores the reply or the failure. */
  const complete = async (conversationId: string) => {
    const conversation = conversationsStore.get().find((c) => c.id === conversationId)
    const last = conversation?.messages[conversation.messages.length - 1]
    if (!conversation || last?.role !== 'user') return

    const structured = last.kind === 'structured'
    const history: AIMessage[] = conversation.messages
      .filter((m) => m.kind !== 'error')
      .map((m) => ({ role: m.role, content: m.content }))
    if (structured) history[history.length - 1] = { role: 'user', content: `${last.content}\n\n${aiPrompts.structured}` }
    const systemPrompt = useData ? `${aiPrompts.system}\n\n${workspaceContext(records)}` : aiPrompts.system

    setPendingId(conversationId)
    try {
      if (structured) {
        const res = await aiService.generateJSON(history, { systemPrompt })
        addMessage(conversationId, { id: uid('m'), role: 'assistant', kind: 'structured', content: res.text, data: res.data, source: aiSource(res) })
      } else {
        const res = await aiService.generateText(history, { systemPrompt })
        addMessage(conversationId, { id: uid('m'), role: 'assistant', kind: 'text', content: res.text, source: aiSource(res) })
      }
    } catch (err) {
      addMessage(conversationId, { id: uid('m'), role: 'assistant', kind: 'error', content: describeAIError(err) })
    } finally {
      setPendingId(null)
    }
  }

  const send = (text: string) => {
    const content = text.trim()
    if (!content || pendingId) return
    const message: ChatMessage = { id: uid('m'), role: 'user', kind: mode, content }
    let id = active?.id
    if (id) {
      addMessage(id, message)
    } else {
      id = uid('c')
      const title = content.length > 48 ? `${content.slice(0, 48)}…` : content
      conversationsStore.set((list) => [{ id: id!, title, updatedAt: new Date().toISOString(), messages: [message] }, ...list])
      setActiveId(id)
    }
    setDraft('')
    void complete(id)
  }

  const retry = (conversationId: string) => {
    patchConversation(conversationId, (c) => ({ ...c, messages: c.messages.filter((m) => m.kind !== 'error') }))
    void complete(conversationId)
  }

  const startNew = () => {
    setActiveId(null)
    setShowHistory(false)
    inputRef.current?.focus()
  }

  return (
    <>
      <PageHeader
        title={modules.assistant.title}
        description={modules.assistant.description}
        actions={
          <>
            <Button variant="ghost" leftIcon={<History />} className="lg:hidden" aria-expanded={showHistory} onClick={() => setShowHistory((v) => !v)}>
              History
            </Button>
            <Button variant="secondary" leftIcon={<MessageSquarePlus />} onClick={startNew}>New conversation</Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* History */}
        <aside className={cn('panel self-start p-2 lg:block', showHistory ? 'block' : 'hidden')} aria-label="Conversation history">
          <p className="px-2 pb-1.5 pt-1 text-sm font-medium text-subtle">History</p>
          {conversations.length === 0 ? (
            <p className="px-2 pb-2 text-sm text-muted-foreground">Conversations are saved in this browser and listed here.</p>
          ) : (
            <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(c.id)
                      setShowHistory(false)
                    }}
                    aria-current={c.id === activeId ? 'true' : undefined}
                    className={cn(
                      'block w-full rounded-md px-2 py-1.5 pr-8 text-left transition-colors',
                      c.id === activeId ? 'bg-raised' : 'hover:bg-raised/60',
                    )}
                  >
                    <span className={cn('block truncate', c.id !== activeId && 'text-muted-foreground')}>{c.title}</span>
                    <span className="block text-xs text-subtle">{timeAgo(c.updatedAt)}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete conversation: ${c.title}`}
                    onClick={() => setToDelete(c)}
                    className="absolute right-1.5 top-2 rounded p-1 text-subtle opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Thread */}
        <section className="panel flex min-h-[28rem] flex-col lg:h-[calc(100vh-15rem)]" aria-label="Conversation">
          <div className="flex-1 space-y-5 overflow-y-auto p-5" aria-live="polite">
            {!active ? (
              <div className="mx-auto flex h-full max-w-lg flex-col justify-center py-6">
                <h2 className="text-lg">Ask about your {appConfig.entity.plural}</h2>
                <p className="mt-1 text-muted-foreground">Start with one of these, or type your own question below.</p>
                <ul className="mt-5 space-y-2">
                  {aiPrompts.suggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => send(s)}
                        className="w-full rounded-md border border-border bg-background/40 px-3.5 py-2.5 text-left text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                {active.messages.map((m) => (
                  <Message key={m.id} message={m} onRetry={pendingId ? undefined : () => retry(active.id)} />
                ))}
                {pending && (
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-raised text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <ThinkingDots />
                  </div>
                )}
              </>
            )}
            <div ref={endRef} />
          </div>

          {/* Prompt input */}
          <form
            className="border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
            }}
          >
            <div className="rounded-lg border border-input bg-background/60 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    send(draft)
                  }
                }}
                rows={2}
                aria-label="Message"
                placeholder={mode === 'structured' ? 'Ask for a summary with recommendations' : 'Ask a question'}
                className="block max-h-40 w-full resize-none bg-transparent px-3.5 pb-1 pt-3 placeholder:text-subtle focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-2">
                <Tabs
                  label="Answer format"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'text', label: 'Plain answer' },
                    { value: 'structured', label: 'Structured' },
                  ]}
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={useData} onChange={(e) => setUseData(e.target.checked)} className="h-3.5 w-3.5 accent-[hsl(var(--primary))]" />
                  Include workspace data
                </label>
                <Button type="submit" size="icon" className="ml-auto" disabled={!draft.trim() || pendingId !== null} aria-label="Send message">
                  <ArrowUp />
                </Button>
              </div>
            </div>
            <p className="mt-2 px-1 text-xs text-subtle">Enter sends. Shift + Enter adds a line.</p>
          </form>
        </section>
      </div>

      <ConfirmDialog
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            conversationsStore.set((list) => list.filter((c) => c.id !== toDelete.id))
            if (toDelete.id === activeId) setActiveId(null)
          }
          setToDelete(null)
        }}
        title="Delete this conversation?"
        description={`"${toDelete?.title ?? ''}" will be removed from this browser.`}
        confirmLabel="Delete conversation"
        destructive
      />
    </>
  )
}
