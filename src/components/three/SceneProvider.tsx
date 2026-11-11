import { Component, Suspense, createContext, lazy, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SceneFallback } from './SceneFallback'
import type { SceneVariant } from './Scene'

/**
 * The 3D background, self-contained.
 *
 *   <SceneProvider enabled variant="cinematic" tone="dark" accent="hsl(40, 49%, 71%)"
 *                  background="#0a0a0d" routeKey={pathname}>
 *     <App />
 *   </SceneProvider>
 *
 * - Renders a fixed layer behind the app that never receives pointer events.
 * - The Three.js code is a separate chunk, requested only after first paint
 *   and only when WebGL works and the background is enabled.
 * - Three environments: 'cinematic' (dark theme), 'aether' (light theme) and
 *   'classic' (the original scene). Changing `variant` cross-fades between them.
 * - A static fallback is always underneath, so loading, a missing GPU, a lost
 *   context or a render error all degrade to the same quiet backdrop.
 * - Honours prefers-reduced-motion (or `reducedMotion`) with one still frame.
 *
 * It depends on nothing else in the app. Remove it by deleting the wrapper.
 * Append ?webgl=off to any URL to force the fallback for testing.
 */

const Scene = lazy(() => import('./Scene'))

export type { SceneVariant }

export type SceneStatus =
  | 'active' // WebGL scene is rendering
  | 'loading' // chunk requested, fallback visible
  | 'disabled' // switched off by the host
  | 'unsupported' // no WebGL, or forced off with ?webgl=off
  | 'failed' // render error or lost GPU context

interface SceneContextValue {
  status: SceneStatus
  /** True when motion is reduced, by the system or by the host. */
  reducedMotion: boolean
  /** True when the operating system itself asks for reduced motion. */
  systemReducedMotion: boolean
  variant: SceneVariant
}

const SceneContext = createContext<SceneContextValue>({ status: 'disabled', reducedMotion: false, systemReducedMotion: false, variant: 'cinematic' })
export const useSceneStatus = () => useContext(SceneContext)

function detectWebGL(): boolean {
  if (new URLSearchParams(window.location.search).get('webgl') === 'off') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

class SceneErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export interface SceneProviderProps {
  enabled: boolean
  variant: SceneVariant
  /** Which static fallback to draw, and how the scene blends with the page. */
  tone: 'dark' | 'light'
  /** Any CSS colour string. */
  accent: string
  /** Fog colour. Match the page background. */
  background: string
  /** Pass the current route to ease the composition on navigation. */
  routeKey?: string
  /** Base particle counts. `particleDensity` multiplies them. */
  particles?: { desktop: number; mobile: number }
  /** 0.2 to 1. Opacity of the scene layer. */
  intensity?: number
  /** 0 to 2. Motion multiplier. */
  speed?: number
  /** 0 to 1.5. Particle multiplier. */
  particleDensity?: number
  /** 0.4 to 1.6. Lighting multiplier. */
  lighting?: number
  parallax?: boolean
  /** Force a still frame even when the system does not ask for reduced motion. */
  reducedMotion?: boolean
  children: ReactNode
}

const FADE_MS = 380

export function SceneProvider({
  enabled,
  variant,
  tone,
  accent,
  background,
  routeKey = '',
  particles = { desktop: 700, mobile: 300 },
  intensity = 1,
  speed = 1,
  particleDensity = 1,
  lighting = 1,
  parallax = true,
  reducedMotion: forcedReducedMotion = false,
  children,
}: SceneProviderProps) {
  const [supported] = useState(detectWebGL)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [idle, setIdle] = useState(false)
  const systemReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const reducedMotion = systemReducedMotion || forcedReducedMotion
  const small = useMediaQuery('(max-width: 767px)')

  // The environment on screen trails the requested one by a short fade-out,
  // so a theme change dissolves from one world into the other.
  const [shown, setShown] = useState({ variant, background })
  const [swapping, setSwapping] = useState(false)
  useEffect(() => {
    if (shown.variant === variant && shown.background === background) return
    setSwapping(true)
    const id = window.setTimeout(() => {
      setShown({ variant, background })
      setSwapping(false)
    }, FADE_MS)
    return () => window.clearTimeout(id)
  }, [variant, background, shown])

  // Let the application paint and become interactive before asking for the 3D chunk.
  useEffect(() => {
    const start = () => setIdle(true)
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(start, { timeout: 1200 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(start, 300)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!enabled) setReady(false)
  }, [enabled])

  const mount = enabled && supported && !failed && idle
  const status: SceneStatus = !enabled ? 'disabled' : !supported ? 'unsupported' : failed ? 'failed' : ready ? 'active' : 'loading'
  const value = useMemo(() => ({ status, reducedMotion, systemReducedMotion, variant }), [status, reducedMotion, systemReducedMotion, variant])
  const count = Math.round((small ? particles.mobile : particles.desktop) * particleDensity)

  return (
    <SceneContext.Provider value={value}>
      <div aria-hidden="true" data-scene={status} data-scene-variant={shown.variant} className="pointer-events-none fixed inset-0 -z-10 select-none">
        <SceneFallback accent={accent} tone={tone} plain={status === 'active' || status === 'disabled'} />
        {mount && (
          <div
            className="absolute inset-0 ease-out"
            style={{
              opacity: ready && !swapping ? intensity : 0,
              transition: `opacity ${swapping ? FADE_MS : ready ? 900 : 0}ms ease-out`,
            }}
          >
            <SceneErrorBoundary onError={() => setFailed(true)}>
              <Suspense fallback={null}>
                <Scene
                  variant={shown.variant}
                  accent={accent}
                  background={shown.background}
                  reducedMotion={reducedMotion}
                  routeKey={routeKey}
                  particleCount={count}
                  speed={speed}
                  lighting={lighting}
                  parallax={parallax}
                  onReady={() => setReady(true)}
                  onContextLost={() => setFailed(true)}
                />
              </Suspense>
            </SceneErrorBoundary>
          </div>
        )}
        {/* Keeps text legible over the scene on the left, where content starts. */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/15 to-transparent" />
      </div>
      {children}
    </SceneContext.Provider>
  )
}
