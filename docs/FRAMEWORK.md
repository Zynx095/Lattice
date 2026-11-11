# TECHNOPIA 2.0 — application framework

A reusable frontend foundation for the *Build it in 60 minutes* challenge at Presidency University: application shell, design system, 3D background and working feature modules, all driven by configuration. It ships with neutral sample data and is meant to be reshaped into a problem-specific app on event day.

**On event day, open [`CLAUDE_EVENT_PLAYBOOK.md`](CLAUDE_EVENT_PLAYBOOK.md).**

## Run

```bash
npm run dev         # http://localhost:3000
npm run typecheck   # TypeScript, no emit
npm run build       # production bundle in dist/
npm run server      # optional Express backend + AI proxy on :3001
```

## What is included

| Module | Route | What works |
|---|---|---|
| Overview | `/` | Metrics computed from live data, chart with table view, quick actions, activity feed, AI brief |
| Records | `/records`, `/records/:id` | Search, filters, sorting, pagination, create / edit / delete with validation, detail page, AI summary |
| Analytics | `/analytics` | Period switch, KPIs with trends, line and bar charts, summary table |
| Assistant | `/assistant` | Chat through the AI service, plain or structured answers, saved history, error and retry |
| New request | `/new` | Three-step form with per-step validation, review, confirmation |
| Files | `/files` | Drag and drop, type and size validation, local reading with progress, previews, AI summary of text files |
| Locations | `/locations` | Tile-free coordinate plot, selection, browser geolocation; pluggable map renderer |
| Settings | `/settings` | Theme (dark / light / system), accent, density, 3D scene controls, music, accessibility, profile, AI connection test, backend check, data reset |

Shell: configurable sidebar, breadcrumbs, command palette (Ctrl/⌘ K), compact music player, notification inbox, account menu, mobile drawer.

## Change it

Everything product-specific is in `src/config/` (one entry point, `src/config/index.ts`):

| File | Controls |
|---|---|
| `app.config.ts` | Name, tagline, record noun, default user, storage prefix |
| `modules.config.ts` | **Feature activation**: `enabled` per module, plus path, title, description |
| `navigation.config.ts` | Sidebar groups and icons |
| `dashboard.config.ts` | Overview metrics and quick actions |
| `theme.config.ts` | Default theme, accent presets (one value per theme), chart colours, which 3D environment each theme shows, scene defaults |
| `ai.config.ts` | Every prompt sent to the AI service |

Data model and sample rows: `src/data/`. State and business rules: `src/store/index.ts`. Component catalogue: [`docs/COMPONENTS.md`](docs/COMPONENTS.md).

## AI service

`src/services/ai/` is provider-agnostic (`generateText`, `generateJSON`). It sends every request to the Express backend (`POST /api/ai`), which routes between Claude and Gemini with keys from the server-side `.env`. There is no offline mock and no browser-side key.

## Themes

Two designs, switched in Settings, the account menu or the command palette, with no reload:

- **Dark, "Cinematic"**: near-black solid surfaces, hairline borders, the metal-and-light scene.
- **Light, "Aether"**: pearl background, frosted-glass surfaces with soft shadows, the glass-and-pearl scene.
- **System** follows the operating system and reacts when it changes.

Tokens for both live in `src/styles/globals.css` (`:root` and `:root[data-theme='light']`). An inline script in `index.html` applies the saved theme before first paint. Default theme: `themeConfig.defaultTheme`.

## 3D environments

`src/components/three/` is self-contained and lazy-loaded. Three environments share one canvas:

| Environment | Shown for | What it is |
|---|---|---|
| `cinematic` | dark theme | A faceted metal core in a wire shell with gyroscope rings and orbiting sparks, drifting shards, a colonnade of monoliths in fog. Instanced geometry, reflections from a tiny one-time environment map. |
| `aether` | light theme | A pearl inside a glass crystal with champagne rings and orbiting pearls, glass panes at several depths. No transmission pass; the glass is clear-coat plus iridescence. |
| `classic` | on request | The original v1 scene, selectable in Settings → 3D environment. |

Settings controls (stored per browser, applied live): on/off, scene, intensity, lighting, animation speed, particle density, pointer parallax. The scene never receives pointer events, pauses when the tab is hidden, drops resolution if frames slow down, holds a still frame under reduced motion, and falls back to a static per-theme backdrop without WebGL (`?webgl=off` to test). There is no post-processing: depth comes from fog and layering, which keeps it usable on integrated graphics.

## Music (Spotify)

Optional, independent of the 3D scene and the theme. Service in `src/services/music/`, components in `src/components/music/`. Nothing is requested from Spotify until the person presses play, and playback never starts by itself.

| Mode | When | What works |
|---|---|---|
| Preview player | default, no setup | Spotify's embedded player for the configured playlist. Play/pause from the app; track changes inside Spotify's frame. Spotify decides between full tracks and 30-second previews (full tracks need the person to be signed in to Spotify in that browser). No volume control. |
| Full player | connected **Premium** account | Web Playback SDK: play, pause, next, previous, seek, volume, mute, track details and artwork. |

To enable sign-in:

1. Create an app at developer.spotify.com/dashboard with **Web API** and **Web Playback SDK**.
2. Add the redirect URI `http://127.0.0.1:3000/` (Spotify rejects `http://localhost`).
3. Put the **client id** in `.env.local` as `VITE_SPOTIFY_CLIENT_ID` and restart the dev server. Never add the client secret: sign-in uses PKCE and does not need it.
4. Open the app at `http://127.0.0.1:3000` and use Settings → Music → Connect Spotify. Note that `127.0.0.1` and `localhost` keep separate browser storage.

Tokens are stored in localStorage (playback scopes only) and removed by Disconnect. Change the playlist with `VITE_SPOTIFY_CONTEXT_URI`.

## Notes

- Data is stored in the browser (localStorage). Nothing is uploaded anywhere unless you connect a backend.
- `.env`, `.env.local` and `node_modules` are git-ignored. Do not commit keys.
