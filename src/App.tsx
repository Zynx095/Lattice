import { Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { appConfig, applyAppearance, enabledModuleIds, getAccent, hslColor, isEnabled, moduleForPath, modules, resolveTheme, themeConfig, type ResolvedTheme } from '@/config'
import { settingsStore } from '@/store'
import { AppShell } from '@/components/shell/AppShell'
import { SceneProvider } from '@/components/three/SceneProvider'
import { ErrorBoundary, Skeleton, ToastProvider } from '@/components/ui'
import { NotFoundPage, childRoutes, pages } from '@/pages/registry'

function PageFallback() {
  return (
    <div aria-busy="true" className="space-y-5">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/** Applies appearance settings to <html> and returns the theme in effect, following the system when asked to. */
function useAppearance(): ResolvedTheme {
  const { theme, accent, density, contrast, reducedMotion } = settingsStore.use()
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(theme))

  useEffect(() => {
    const apply = () => setResolved(applyAppearance({ theme, accent, density, contrast, reducedMotion }))
    apply()
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme, accent, density, contrast, reducedMotion])

  return resolved
}

function Root() {
  const { pathname } = useLocation()
  const settings = settingsStore.use()
  const theme = useAppearance()
  const moduleId = moduleForPath(pathname)

  useEffect(() => {
    document.title = moduleId ? `${modules[moduleId].title} | ${appConfig.name}` : appConfig.name
    document.querySelector('meta[name="description"]')?.setAttribute('content', appConfig.description)
  }, [moduleId])

  const scene = settings.scene
  return (
    <SceneProvider
      enabled={settings.sceneEnabled}
      variant={scene.style === 'classic' ? 'classic' : themeConfig.scene.variants[theme]}
      tone={theme}
      // The scene always uses the brighter accent: it is a light source there, not text.
      accent={hslColor(getAccent(settings.accent).hsl)}
      background={themeConfig.scene.backgrounds[theme]}
      routeKey={moduleId ?? 'none'}
      particles={themeConfig.scene.particles}
      intensity={scene.intensity}
      speed={scene.speed}
      particleDensity={scene.particles}
      lighting={scene.lighting}
      parallax={scene.parallax}
      reducedMotion={settings.reducedMotion}
    >
      <AppShell>
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {enabledModuleIds().map((id) => {
                const Page = pages[id]
                return <Route key={id} path={modules[id].path} element={<Page />} />
              })}
              {childRoutes
                .filter((r) => isEnabled(r.module))
                .map((r) => (
                  <Route key={r.path} path={r.path} element={<r.page />} />
                ))}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppShell>
    </SceneProvider>
  )
}

/**
 * Composition root. Order matters: toasts wrap everything, the router wraps
 * the scene (it reads the route), the scene sits behind the shell.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Root />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}
