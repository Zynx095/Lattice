import { useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Briefcase,
  GraduationCap,
  Home,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import knowledge from '@/data/campusKnowledge.json'
import { appConfig } from '@/config'
import { cn, uid } from '@/lib/utils'
import { AIError, ThinkingDots } from '@/components/ai/AIParts'
import { AccountMenu } from '@/components/auth/AccountMenu'
import { authHeader } from '@/services/auth'
import { Button } from '@/components/ui'

type CategoryId = (typeof knowledge.categories)[number]['id']

const ICONS: Record<string, LucideIcon> = {
  academics: GraduationCap,
  attendance: CalendarCheck,
  examinations: ClipboardList,
  placements: Briefcase,
  library: BookOpen,
  hostel: Home,
  administration: Building2,
  events: CalendarDays,
}

const DEFAULT_SUGGESTIONS = [
  'Whom should I contact for academic problems?',
  'Where can I find the examination timetable?',
  'Whom should I contact for placement training?',
  'How can I raise a hostel complaint?',
  'How can I access library resources?',
  'Where can I find university event announcements?',
  'Where can I obtain student records?',
  'What attendance requirement should I follow?',
]

interface Reply {
  answer: string
  category: string
  availability: 'available' | 'partial' | 'unavailable'
  nextStep: string
  provider: string
  model: string
  fallback: boolean
  sources?: { label: string; url: string }[]
}

interface Turn {
  id: string
  role: 'user' | 'assistant'
  content: string
  reply?: Reply
  error?: boolean
  feedback?: 'yes' | 'no'
}

const AVAILABILITY: Record<Reply['availability'], { label: string; className: string }> = {
  available: { label: 'Answered from official sources', className: 'border-success/30 bg-success/10 text-success' },
  partial: { label: 'Some details not available', className: 'border-warning/30 bg-warning/10 text-warning' },
  unavailable: { label: 'Not covered by official sources', className: 'border-danger/30 bg-danger/10 text-danger' },
}

async function askHelpdesk(message: string, history: { role: string; content: string }[]): Promise<Reply> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ message, conversationHistory: history }),
      signal: controller.signal,
    })
    const payload = await res.json().catch(() => null)
    if (!res.ok) throw new Error(payload?.error ?? `The helpdesk returned an error (${res.status}).`)
    return payload as Reply
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('The helpdesk took too long to answer. Please try again.')
    if (err instanceof TypeError) throw new Error('Could not reach the helpdesk server. Start it with "npm run server".')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** Reveals text progressively so answers feel live. Skips straight to the full text for older messages. */
function Typewriter({ text, animate }: { text: string; animate: boolean }) {
  const [n, setN] = useState(animate ? 0 : text.length)
  useEffect(() => {
    if (!animate) return
    let i = 0
    const step = Math.max(2, Math.ceil(text.length / 90))
    const id = setInterval(() => {
      i = Math.min(text.length, i + step)
      setN(i)
      if (i >= text.length) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [text, animate])
  return (
    <p className="whitespace-pre-wrap break-words leading-relaxed">
      {text.slice(0, n)}
      {n < text.length && <span aria-hidden className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-primary" />}
    </p>
  )
}

export default function Helpdesk() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [active, setActive] = useState<CategoryId | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const latestId = [...turns].reverse().find((t) => t.role === 'assistant' && !t.error)?.id
  const activeCat = knowledge.categories.find((c) => c.id === active) ?? null
  const suggestions = activeCat ? activeCat.suggestions : DEFAULT_SUGGESTIONS.slice(0, 4)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [turns.length, pending])

  /** Asks the AI about the last user turn in `list`, using everything before it as history. */
  const run = async (list: Turn[]) => {
    const last = list[list.length - 1]
    const history = list
      .slice(0, -1)
      .filter((t) => !t.error)
      .map((t) => ({ role: t.role, content: t.content }))
    setPending(true)
    try {
      const reply = await askHelpdesk(last.content, history)
      setTurns((t) => [...t, { id: uid('t'), role: 'assistant', content: reply.answer, reply }])
      const match = knowledge.categories.find((c) => c.name === reply.category)
      if (match) setActive(match.id)
    } catch (err) {
      setTurns((t) => [...t, { id: uid('t'), role: 'assistant', content: err instanceof Error ? err.message : 'Something went wrong.', error: true }])
    } finally {
      setPending(false)
      inputRef.current?.focus()
    }
  }

  const send = (text: string) => {
    const content = text.trim()
    if (!content || pending) return
    const next = [...turns, { id: uid('t'), role: 'user' as const, content }]
    setTurns(next)
    setDraft('')
    void run(next)
  }

  const retry = () => {
    const kept = turns.filter((t) => !t.error)
    setTurns(kept)
    if (kept[kept.length - 1]?.role === 'user') void run(kept)
  }

  const rate = (id: string, value: 'yes' | 'no') =>
    setTurns((list) => list.map((t) => (t.id === id ? { ...t, feedback: t.feedback === value ? undefined : value } : t)))

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <section className="panel relative overflow-hidden px-6 py-7 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-info/10 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{knowledge.university.name} · Campus Intelligence</p>
          <AccountMenu />
        </div>
        <h1 className="mt-2 bg-gradient-to-r from-foreground to-primary bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">Your university. One intelligent helpdesk.</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Ask about admissions, academics, examinations, placements, hostel, library and campus life at Presidency University, Bengaluru, in your own words.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-background/50 px-2.5 py-1 text-xs text-subtle">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI answers from official Presidency University information, with sources. Powered by Claude and Gemini.
        </p>
      </section>

      {/* Categories */}
      <section aria-label="Help topics" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {knowledge.categories.map((c) => {
          const Icon = ICONS[c.id] ?? Sparkles
          const on = c.id === active
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(on ? null : c.id)}
              className={cn(
                'panel group flex items-start gap-3 p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-pop',
                on && 'border-primary/60 ring-2 ring-primary/25',
              )}
            >
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-raised text-muted-foreground transition-colors group-hover:text-primary', on && 'border-primary/40 bg-primary/15 text-primary')}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{c.name}</span>
                <span className="block text-xs text-subtle">{c.description}</span>
              </span>
            </button>
          )
        })}
      </section>

      {/* Conversation */}
      <section className="panel flex min-h-[26rem] flex-col lg:h-[calc(100vh-24rem)] lg:min-h-[30rem]" aria-label="Helpdesk conversation">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <p className="text-sm text-muted-foreground">
            {activeCat ? (
              <>Topic: <span className="font-medium text-foreground">{activeCat.name}</span> · {activeCat.channel}</>
            ) : (
              'Ask in your own words, any phrasing works.'
            )}
          </p>
          <Button variant="ghost" size="sm" leftIcon={<Trash2 />} disabled={turns.length === 0 || pending} onClick={() => setTurns([])}>
            Clear
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5" aria-live="polite">
          {turns.length === 0 && (
            <div className="mx-auto max-w-xl py-4 text-center">
              <h2 className="text-md font-medium">{activeCat ? `Questions about ${activeCat.name.toLowerCase()}` : 'Try asking'}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{activeCat ? activeCat.description : 'Pick a question or type your own. The AI understands different wording and follow-ups.'}</p>
              <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
                {(activeCat ? activeCat.suggestions : DEFAULT_SUGGESTIONS).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={pending}
                    onClick={() => send(s)}
                    className="rounded-md border border-border bg-background/40 px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t) =>
            t.role === 'user' ? (
              <div key={t.id} className="flex justify-end animate-rise-in">
                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-br-sm bg-primary px-3.5 py-2 text-primary-foreground">{t.content}</p>
              </div>
            ) : t.error ? (
              <AIError key={t.id} message={t.content} onRetry={pending ? undefined : retry} />
            ) : (
              <div key={t.id} className="flex gap-3 animate-rise-in">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-raised text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="max-w-prose rounded-lg rounded-tl-sm border border-border border-l-primary/60 bg-raised/60 px-4 py-3 shadow-sm">
                    <Typewriter text={t.content} animate={t.id === latestId} />
                    {t.reply?.nextStep && (
                      <p className="mt-2 border-t border-border pt-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Next step:</span> {t.reply.nextStep}
                      </p>
                    )}
                  </div>
                  {t.reply?.sources && t.reply.sources.length > 0 && (
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                      Sources:
                      {t.reply.sources.map((src) => (
                        <a key={src.url} href={src.url} target="_blank" rel="noreferrer noopener" className="rounded border border-border px-1.5 py-0.5 text-primary hover:border-primary/50 hover:underline">
                          {src.label}
                        </a>
                      ))}
                    </p>
                  )}
                  {t.reply && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtle">
                      <span className="rounded border border-border px-1.5 py-0.5">{t.reply.category}</span>
                      <span className={cn('rounded border px-1.5 py-0.5', AVAILABILITY[t.reply.availability].className)}>
                        {AVAILABILITY[t.reply.availability].label}
                      </span>
                      <span title={t.reply.model}>
                        Answered by {t.reply.provider}
                        {t.reply.fallback && ' (fallback)'}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1">
                        {t.feedback ? (t.feedback === 'yes' ? 'Thanks for the feedback' : 'Thanks, noted') : 'Was this helpful?'}
                        <button type="button" aria-label="Helpful" aria-pressed={t.feedback === 'yes'} onClick={() => rate(t.id, 'yes')} className={cn('rounded p-1 hover:text-foreground', t.feedback === 'yes' && 'text-success')}>
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label="Not helpful" aria-pressed={t.feedback === 'no'} onClick={() => rate(t.id, 'no')} className={cn('rounded p-1 hover:text-foreground', t.feedback === 'no' && 'text-danger')}>
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {pending && (
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-raised text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <ThinkingDots label="Finding an answer" />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggestions (once a conversation is underway) */}
        {turns.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none]">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => send(s)}
              className="shrink-0 rounded-full border border-border bg-background/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        )}

        <form
          className="border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
        >
          <div className="flex items-end gap-2 rounded-lg border border-input bg-background/60 p-1.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
            <textarea
              ref={inputRef}
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  send(draft)
                }
              }}
              rows={1}
              aria-label="Your question"
              placeholder={activeCat ? `Ask about ${activeCat.name.toLowerCase()}…` : 'Ask the campus helpdesk…'}
              className="block max-h-40 min-h-[2.25rem] w-full resize-none bg-transparent px-2 py-1.5 placeholder:text-subtle focus:outline-none"
            />
            {turns.some((t) => t.error) && !pending && (
              <Button type="button" variant="ghost" size="icon" aria-label="Retry last question" onClick={retry}>
                <RotateCcw />
              </Button>
            )}
            <Button type="submit" size="icon" disabled={!draft.trim() || pending} aria-label="Send question">
              <ArrowUp />
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-xs text-subtle">
            Enter sends · Shift + Enter adds a line · {knowledge.disclaimer}
          </p>
        </form>
      </section>
    </div>
  )
}
