import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, RotateCcw } from 'lucide-react'
import { accentPresets, appConfig, cap, hslColor, modules, resolveTheme, type Density, type SceneStyle, type ThemeChoice } from '@/config'
import { aiSource, describeAIError } from '@/lib/ai'
import { isEmail } from '@/lib/validation'
import { cn } from '@/lib/utils'
import { aiConfig, getAISafeStatus } from '@/services/ai/ai.config'
import { aiService } from '@/services/ai/ai.service'
import { api } from '@/services/api'
import { activityStore, conversationsStore, recordsStore, resetScene, resetWorkspaceData, settingsStore, updateScene, updateSettings } from '@/store'
import { AIError } from '@/components/ai/AIParts'
import { MusicSettings } from '@/components/music/MusicSettings'
import { PageHeader } from '@/components/shell/PageHeader'
import { useSceneStatus, type SceneStatus } from '@/components/three/SceneProvider'
import { Badge, Button, ConfirmDialog, Input, Kbd, Panel, Slider, Switch, Tabs, useToast } from '@/components/ui'

/** Sections, in page order. The list on the left is built from this. */
const sections = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'environment', label: '3D environment' },
  { id: 'music', label: 'Music' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'profile', label: 'Profile' },
  { id: 'connections', label: 'Connections' },
  { id: 'data', label: 'Stored data' },
] as const

const sceneText: Record<SceneStatus, string> = {
  active: 'Running on your graphics hardware.',
  loading: 'Loading.',
  disabled: 'Switched off. A static backdrop is shown.',
  unsupported: 'WebGL is not available in this browser, so a static backdrop is shown.',
  failed: 'The graphics context was lost, so a static backdrop is shown. Reload to try again.',
}
const sceneNames = { cinematic: 'Cinematic', aether: 'Aether', classic: 'Classic' }
const percent = (v: number) => `${Math.round(v * 100)}%`

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

/** A labelled control on one line: name and explanation left, control right. */
function Choice({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const toast = useToast()
  const { hash } = useLocation()
  const settings = settingsStore.use()
  const scene = useSceneStatus()
  const counts = { records: recordsStore.use().length, activity: activityStore.use().length, conversations: conversationsStore.use().length }

  const [name, setName] = useState(settings.user.name)
  const [email, setEmail] = useState(settings.user.email)
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const [confirmReset, setConfirmReset] = useState(false)
  const [aiTest, setAiTest] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; text?: string }>({ status: 'idle' })
  const [backend, setBackend] = useState<'idle' | 'checking' | 'up' | 'down'>('idle')

  // Links such as /settings#music open on that section.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  const ai = getAISafeStatus()
  type ProviderStatus = { configured: boolean; models: { light: string | null; heavy: string | null }; tokensToday: number; coolingDown?: boolean }
  const [providers, setProviders] = useState<Record<string, ProviderStatus> | null | 'down'>(null)
  const loadProviders = () =>
    fetch(aiConfig.statusUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setProviders(d.providers))
      .catch(() => setProviders('down'))
  useEffect(() => {
    void loadProviders()
  }, [])
  const dirty = name !== settings.user.name || email !== settings.user.email
  const sceneOff = !settings.sceneEnabled
  const still = scene.reducedMotion || settings.scene.speed === 0

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    const found = {
      name: name.trim() ? undefined : 'Name is required.',
      email: !email.trim() ? 'Email is required.' : isEmail(email) ? undefined : 'Enter an email address like name@example.com.',
    }
    setErrors(found)
    if (found.name || found.email) return
    updateSettings({ user: { name: name.trim(), email: email.trim() } })
    toast.success('Profile saved')
  }

  const testAI = async () => {
    setAiTest({ status: 'loading' })
    try {
      const res = await aiService.generateText('Reply with the single word: ready', { maxTokens: 20 })
      setAiTest({ status: 'ok', text: `${aiSource(res)} answered: ${res.text}` })
      void loadProviders()
    } catch (err) {
      setAiTest({ status: 'error', text: describeAIError(err) })
    }
  }

  const checkBackend = async () => {
    setBackend('checking')
    setBackend((await api.health()) ? 'up' : 'down')
  }

  return (
    <>
      <PageHeader title={modules.settings.title} description={modules.settings.description} />

      <div className="gap-10 lg:grid lg:grid-cols-[11rem_minmax(0,44rem)]">
        <nav aria-label="Settings sections" className="mb-6 lg:mb-0">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-20 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
            {sections.map((s) => (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    window.history.replaceState(null, '', `#${s.id}`)
                  }}
                  className="block whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-raised/70 hover:text-foreground"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-5 [&>section]:scroll-mt-20">
          {/* ---------- Appearance ---------- */}
          <Panel id="appearance" title="Appearance" description="Two designs of the same product: Cinematic for dark, Aether for light.">
            <div className="space-y-5">
              <Choice
                label="Theme"
                description={settings.theme === 'system' ? `Following your system, which is set to ${resolveTheme('system')}.` : undefined}
              >
                <Tabs<ThemeChoice>
                  label="Theme"
                  value={settings.theme}
                  onChange={(theme) => updateSettings({ theme })}
                  options={[
                    { value: 'dark', label: 'Dark' },
                    { value: 'light', label: 'Light' },
                    { value: 'system', label: 'System' },
                  ]}
                />
              </Choice>

              <fieldset>
                <legend className="mb-2 font-medium">Accent colour</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accent colour">
                  {accentPresets.map((a) => {
                    const selected = a.id === settings.accent
                    return (
                      <button
                        key={a.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => updateSettings({ accent: a.id })}
                        className={cn(
                          'flex h-9 items-center gap-2 rounded-md border px-2.5 transition-colors',
                          selected ? 'border-border-strong bg-raised' : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
                        )}
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: hslColor(a.hsl) }}>
                          {selected && <Check className="h-3 w-3" style={{ color: hslColor(a.foreground) }} />}
                        </span>
                        {a.label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <Choice label="Density" description="Compact fits more on screen by scaling text and spacing down slightly.">
                <Tabs<Density>
                  label="Density"
                  value={settings.density}
                  onChange={(density) => updateSettings({ density })}
                  options={[
                    { value: 'comfortable', label: 'Comfortable' },
                    { value: 'compact', label: 'Compact' },
                  ]}
                />
              </Choice>
            </div>
          </Panel>

          {/* ---------- 3D environment ---------- */}
          <Panel
            id="environment"
            title="3D environment"
            description="The scene behind the interface. Changes apply as you move a control."
            actions={
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RotateCcw />}
                onClick={() => {
                  resetScene()
                  toast.success('Scene settings restored')
                }}
              >
                Restore defaults
              </Button>
            }
          >
            <div className="space-y-5">
              <Switch
                label="3D background"
                description={`${sceneText[scene.status]}${scene.status === 'active' ? ` Showing ${sceneNames[scene.variant]}.` : ''}`}
                checked={settings.sceneEnabled}
                onChange={(sceneEnabled) => updateSettings({ sceneEnabled })}
              />

              <Choice label="Scene" description="Each theme has its own environment. Classic is the original scene.">
                <Tabs<SceneStyle>
                  label="Scene"
                  value={settings.scene.style}
                  onChange={(style) => updateScene({ style })}
                  options={[
                    { value: 'auto', label: 'Match theme' },
                    { value: 'classic', label: 'Classic' },
                  ]}
                />
              </Choice>

              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Slider label="Scene intensity" description="How strongly the scene shows through." value={settings.scene.intensity} min={0.2} max={1} onChange={(intensity) => updateScene({ intensity })} format={percent} disabled={sceneOff} />
                <Slider label="Ambient lighting" description="Brightness of lights and reflections." value={settings.scene.lighting} min={0.4} max={1.6} onChange={(lighting) => updateScene({ lighting })} format={percent} disabled={sceneOff} />
                <Slider
                  label="Animation speed"
                  description={scene.reducedMotion ? 'Held still while reduced motion is on.' : 'Zero holds a still frame.'}
                  value={settings.scene.speed}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(speed) => updateScene({ speed })}
                  format={(v) => (v === 0 ? 'Still' : `${v.toFixed(1)}×`)}
                  disabled={sceneOff || scene.reducedMotion}
                />
                <Slider label="Particle density" description="Fewer particles is lighter on the graphics card." value={settings.scene.particles} min={0} max={1.5} onChange={(particles) => updateScene({ particles })} format={percent} disabled={sceneOff} />
              </div>

              <Switch
                label="Pointer parallax"
                description="The view shifts slightly as the pointer moves."
                checked={settings.scene.parallax}
                disabled={sceneOff || still}
                onChange={(parallax) => updateScene({ parallax })}
              />
            </div>
          </Panel>

          {/* ---------- Music ---------- */}
          <Panel id="music" title="Music" description="Background music from Spotify. It works independently of the 3D scene and the theme.">
            <MusicSettings />
          </Panel>

          {/* ---------- Accessibility ---------- */}
          <Panel id="accessibility" title="Accessibility">
            <div className="space-y-5">
              <Switch
                label="Reduce motion"
                description={
                  scene.systemReducedMotion
                    ? 'Your system already asks for reduced motion, so animations are off and the 3D scene is a still image.'
                    : 'Turns off interface animations and holds the 3D scene on a still image.'
                }
                checked={settings.reducedMotion || scene.systemReducedMotion}
                disabled={scene.systemReducedMotion}
                onChange={(reducedMotion) => updateSettings({ reducedMotion })}
              />
              <Switch
                label="Higher contrast"
                description="Stronger text and borders, and solid surfaces instead of translucent ones."
                checked={settings.contrast === 'high'}
                onChange={(on) => updateSettings({ contrast: on ? 'high' : 'standard' })}
              />
              <div className="border-t border-border pt-4">
                <p className="font-medium">Keyboard</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Every control can be reached and used without a pointer.</p>
                <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  {[
                    [['Ctrl', 'K'], 'Search and run commands'],
                    [['Tab'], 'Move to the next control'],
                    [['Enter'], 'Activate the focused control'],
                    [['Esc'], 'Close a dialog or menu'],
                    [['↑', '↓'], 'Move through a list'],
                    [['Space'], 'Toggle a switch'],
                  ].map(([keys, text]) => (
                    <div key={text as string} className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{text as string}</dt>
                      <dd className="flex gap-1">{(keys as string[]).map((k) => <Kbd key={k}>{k}</Kbd>)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Panel>

          {/* ---------- Profile ---------- */}
          <Panel id="profile" title="Profile" description="Shown in the account menu and on activity you create.">
            <form onSubmit={saveProfile} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Name" required value={name} error={errors.name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
                <Input label="Email" type="email" required value={email} error={errors.email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={!dirty}>Save profile</Button>
              </div>
            </form>
          </Panel>

          {/* ---------- Connections ---------- */}
          <div id="connections" className="scroll-mt-20 space-y-5">
            <Panel
              title="Assistant connection"
              description="Claude and Gemini are called by the backend (npm run server). Keys stay in the server .env and are never sent to the browser."
              actions={<Button variant="secondary" size="sm" isLoading={aiTest.status === 'loading'} onClick={testAI}>Send a test prompt</Button>}
            >
              <dl className="divide-y divide-border">
                <Row label="Mode"><Badge tone="success">Server-side router</Badge></Row>
                {providers === null && <Row label="Providers"><span className="text-sm text-subtle">Checking…</span></Row>}
                {providers === 'down' && (
                  <Row label="Providers"><Badge tone="danger">Backend not reachable</Badge></Row>
                )}
                {providers && providers !== 'down' &&
                  Object.entries(providers).map(([id, p]) => (
                    <Row key={id} label={id === 'claude' ? 'Claude' : 'Gemini'}>
                      <span className="inline-flex flex-wrap items-center justify-end gap-2 text-sm">
                        {!p.configured ? <Badge tone="warning">No key on server</Badge> : p.coolingDown ? <Badge tone="warning">Paused after error</Badge> : <Badge tone="success">Ready</Badge>}
                        <span className="font-mono text-xs text-subtle">{p.models.light ?? 'no model'}</span>
                        <span className="num text-xs text-subtle">{p.tokensToday.toLocaleString()} tokens today</span>
                      </span>
                    </Row>
                  ))}
                <Row label="Request timeout"><span className="num">{ai.timeoutMs / 1000} s</span></Row>
              </dl>
              <div className="mt-3 space-y-3">
                {aiTest.status === 'ok' && <p className="break-words rounded-md border border-border bg-raised/40 px-3 py-2 text-sm">{aiTest.text}</p>}
                {aiTest.status === 'error' && <AIError message={aiTest.text!} onRetry={testAI} />}
              </div>
            </Panel>

            <Panel
              title="Backend"
              description="Optional. The app stores data in this browser until a server is connected."
              actions={<Button variant="secondary" size="sm" isLoading={backend === 'checking'} onClick={checkBackend}>Check connection</Button>}
            >
              <dl className="divide-y divide-border">
                <Row label="API address"><span className="break-all font-mono text-sm">{appConfig.apiBaseUrl}</span></Row>
                <Row label="Status">
                  {backend === 'up' ? <Badge tone="success">Reachable</Badge> : backend === 'down' ? <Badge tone="danger">Not reachable</Badge> : <Badge>Not checked</Badge>}
                </Row>
              </dl>
              {backend === 'down' && (
                <p className="mt-3 text-sm text-muted-foreground">Start it with <code className="font-mono text-xs text-foreground">npm run server</code>, then check again.</p>
              )}
            </Panel>
          </div>

          {/* ---------- Stored data ---------- */}
          <Panel id="data" title="Stored data" description="Kept in this browser's local storage.">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="num text-muted-foreground">
                {counts.records} {appConfig.entity.plural}, {counts.activity} activity entries, {counts.conversations} assistant conversation{counts.conversations === 1 ? '' : 's'}.
              </p>
              <Button variant="destructive" onClick={() => setConfirmReset(true)}>Reset sample data</Button>
            </div>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetWorkspaceData()
          setConfirmReset(false)
          toast.success('Sample data restored')
        }}
        title="Reset sample data?"
        description={`${cap(appConfig.entity.plural)}, activity, notifications and assistant conversations return to the original sample set. Your profile and appearance settings stay.`}
        confirmLabel="Reset sample data"
        destructive
      />
    </>
  )
}
