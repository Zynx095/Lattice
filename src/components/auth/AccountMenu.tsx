import { useEffect, useState } from 'react'
import { History, LogIn, LogOut } from 'lucide-react'
import { clearHistory, fetchHistory, register, signIn, signOut, useSession, type HistoryItem } from '@/services/auth'
import { Button, Input, Modal } from '@/components/ui'

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function AuthDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await signIn(email, password)
      else await register(name, email, password)
      setPassword('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Sign in' : 'Create your account'}
      description="Signed-in students keep a saved history of their questions, with dates and times."
    >
      <form onSubmit={submit} className="space-y-3">
        {mode === 'register' && <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required data-autofocus />}
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          helperText={mode === 'register' ? 'At least 8 characters.' : undefined}
          required
        />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" isLoading={busy}>{mode === 'login' ? 'Sign in' : 'Create account'}</Button>
        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? 'New here? ' : 'Already registered? '}
          <button type="button" className="text-primary hover:underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </form>
    </Modal>
  )
}

function HistoryDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [items, setItems] = useState<HistoryItem[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setItems(null)
    setError('')
    fetchHistory().then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Could not load history.'))
  }, [isOpen])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Your saved questions"
      maxWidth="xl"
      footer={
        items && items.length > 0 ? (
          <Button variant="ghost" onClick={() => clearHistory().then(() => setItems([])).catch((e) => setError(e.message))}>Delete my history</Button>
        ) : undefined
      }
    >
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!error && items === null && <p className="text-muted-foreground">Loading…</p>}
      {items?.length === 0 && <p className="text-muted-foreground">No saved questions yet. Ask something and it will appear here.</p>}
      <ul className="max-h-[55vh] space-y-3 overflow-y-auto">
        {items?.map((i) => (
          <li key={i.id} className="rounded-md border border-border bg-raised/40 p-3">
            <p className="text-xs text-subtle">{fmt(i.created_at)}{i.category ? ` · ${i.category}` : ''}{i.provider ? ` · ${i.provider}` : ''}</p>
            <p className="mt-1 font-medium">{i.prompt}</p>
            {i.answer && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{i.answer}</p>}
          </li>
        ))}
      </ul>
    </Modal>
  )
}

export function AccountMenu() {
  const session = useSession()
  const [auth, setAuth] = useState(false)
  const [hist, setHist] = useState(false)

  return (
    <>
      {session ? (
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">Hi, {session.user.name.split(' ')[0]}</span>
          <Button variant="secondary" size="sm" leftIcon={<History />} onClick={() => setHist(true)}>History</Button>
          <Button variant="ghost" size="sm" leftIcon={<LogOut />} onClick={signOut}>Sign out</Button>
        </div>
      ) : (
        <Button variant="secondary" size="sm" leftIcon={<LogIn />} onClick={() => setAuth(true)}>Sign in</Button>
      )}
      <AuthDialog isOpen={auth && !session} onClose={() => setAuth(false)} />
      <HistoryDialog isOpen={hist && !!session} onClose={() => setHist(false)} />
    </>
  )
}
