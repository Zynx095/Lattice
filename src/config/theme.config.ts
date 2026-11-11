/**
 * THEME. Surface and text tokens live in src/styles/globals.css (one block per
 * theme). This file holds what changes per product: default theme, accent
 * presets, chart colours and the 3D environments.
 */

export type ThemeChoice = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'
export type Density = 'comfortable' | 'compact'
export type Contrast = 'standard' | 'high'

type HSL = readonly [number, number, number]

export interface AccentPreset {
  id: string
  label: string
  /** Accent on the dark theme. Also tints the 3D scenes in both themes. */
  hsl: HSL
  /** Text colour placed on top of the dark-theme accent. */
  foreground: HSL
  /** The same hue, deepened so it reads on the light theme. */
  light: { hsl: HSL; foreground: HSL }
}

export const accentPresets: AccentPreset[] = [
  { id: 'brass', label: 'Brass', hsl: [40, 49, 71], foreground: [40, 30, 8], light: { hsl: [38, 52, 36], foreground: [40, 40, 98] } },
  { id: 'glacier', label: 'Glacier', hsl: [204, 62, 72], foreground: [210, 40, 8], light: { hsl: [206, 62, 35], foreground: [206, 40, 98] } },
  { id: 'sage', label: 'Sage', hsl: [150, 30, 66], foreground: [150, 30, 7], light: { hsl: [152, 34, 29], foreground: [150, 30, 98] } },
  { id: 'iris', label: 'Iris', hsl: [246, 72, 79], foreground: [246, 40, 9], light: { hsl: [246, 44, 47], foreground: [246, 40, 98] } },
  { id: 'coral', label: 'Coral', hsl: [12, 72, 72], foreground: [12, 40, 8], light: { hsl: [12, 60, 42], foreground: [12, 40, 98] } },
]

/** Which 3D environment a theme shows. 'classic' is the original v1 scene. */
export type SceneVariant = 'cinematic' | 'aether' | 'classic'
export type SceneStyle = 'auto' | 'classic'

export interface SceneSettings {
  /** 'auto' picks the environment designed for the active theme. */
  style: SceneStyle
  /** 0.2 to 1. How strongly the scene shows behind the interface. */
  intensity: number
  /** 0 to 2. Multiplier on all motion. 0 holds a still frame. */
  speed: number
  /** 0 to 1.5. Multiplier on particle counts. */
  particles: number
  /** Camera follows the pointer slightly. */
  parallax: boolean
  /** 0.4 to 1.6. Multiplier on scene lighting. */
  lighting: number
}

export const themeConfig = {
  /** Theme used until the person picks one in Settings. */
  defaultTheme: 'dark' as ThemeChoice,
  /** Accent used until the person picks another one in Settings. */
  defaultAccent: 'brass',

  /**
   * Categorical chart colours as CSS variables (values per theme are in
   * globals.css). Used in this order and never cycled. A sixth series should
   * be folded into "Other".
   */
  chartColors: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],

  scene: {
    /** Set false to ship without the 3D background at all. */
    enabledByDefault: true,
    /** Environment per theme. */
    variants: { dark: 'cinematic', light: 'aether' } as Record<ResolvedTheme, SceneVariant>,
    /** Fog colour per theme. Keep equal to --background. */
    backgrounds: { dark: '#0a0a0d', light: '#edebe7' } as Record<ResolvedTheme, string>,
    /** Base particle counts before the density setting is applied. */
    particles: { desktop: 700, mobile: 300 },
    defaults: { style: 'auto', intensity: 1, speed: 1, particles: 1, parallax: true, lighting: 1 } as SceneSettings,
  },
} as const

export const getAccent = (id: string): AccentPreset => accentPresets.find((a) => a.id === id) ?? accentPresets[0]

export const hslTriplet = ([h, s, l]: HSL) => `${h} ${s}% ${l}%`
export const hslColor = ([h, s, l]: HSL) => `hsl(${h}, ${s}%, ${l}%)`

/** Fixed key read by the inline script in index.html, so the first paint has the right theme. */
export const THEME_STORAGE_KEY = 'ui-theme'

export const systemTheme = (): ResolvedTheme =>
  window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'

export const resolveTheme = (choice: ThemeChoice): ResolvedTheme => (choice === 'system' ? systemTheme() : choice)

export interface Appearance {
  theme: ThemeChoice
  accent: string
  density: Density
  contrast: Contrast
  reducedMotion: boolean
}

let firstRun = true

/** Writes theme, accent, density, contrast and motion preferences onto <html>. Safe to call repeatedly. */
export function applyAppearance(appearance: Appearance): ResolvedTheme {
  const root = document.documentElement
  const theme = resolveTheme(appearance.theme)
  const accent = getAccent(appearance.accent)
  const tone = theme === 'light' ? accent.light : accent

  const themeChanged = root.dataset.theme !== theme
  if (themeChanged && !firstRun) {
    root.classList.add('theme-switching')
    window.setTimeout(() => root.classList.remove('theme-switching'), 480)
  }
  firstRun = false

  root.dataset.theme = theme
  root.dataset.density = appearance.density
  if (appearance.contrast === 'high') root.dataset.contrast = 'high'
  else delete root.dataset.contrast
  if (appearance.reducedMotion) root.dataset.motion = 'reduce'
  else delete root.dataset.motion

  root.style.setProperty('--primary', hslTriplet(tone.hsl))
  root.style.setProperty('--primary-foreground', hslTriplet(tone.foreground))
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeConfig.scene.backgrounds[theme])

  try {
    // Everything the inline script in index.html needs to paint correctly before React starts.
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({
        theme: appearance.theme,
        density: appearance.density,
        contrast: appearance.contrast,
        accent: {
          dark: [hslTriplet(accent.hsl), hslTriplet(accent.foreground)],
          light: [hslTriplet(accent.light.hsl), hslTriplet(accent.light.foreground)],
        },
      }),
    )
  } catch {
    /* storage blocked: the theme still applies for this visit */
  }
  return theme
}
