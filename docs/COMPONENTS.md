# Component catalogue

Everything reusable, with the import line. Props are documented in each file. All components are dark-theme, keyboard accessible and responsive.

## Primitives — `import { … } from '@/components/ui'`

| Component | Use | Key props |
|---|---|---|
| `Button` | Any action | `variant` default / secondary / outline / ghost / destructive, `size` sm / md / lg / icon / icon-sm, `isLoading`, `leftIcon`, `rightIcon` |
| `Input`, `Textarea`, `Select` | Form controls with label, error and help text wired for screen readers | `label`, `error`, `helperText`, `required`; `Select` takes `options`, `placeholderOption` |
| `Switch` | On/off preference | `checked`, `onChange`, `label`, `description` |
| `Slider` | A value in a range | `label`, `description`, `value`, `min`, `max`, `step`, `format`, `onChange` |
| `Modal` | Dialog with focus trap and Escape | `isOpen`, `onClose`, `title`, `description`, `footer`, `maxWidth` |
| `ConfirmDialog` | Confirm before a consequential action | `title`, `description`, `confirmLabel`, `destructive`, `onConfirm` |
| `Panel` | The standard content surface | `title`, `description`, `actions`, `flush` |
| `Badge` | Status with dot + text | `tone` neutral / info / success / warning / danger |
| `Tabs` | Segmented control (2–5 options) | `value`, `onChange`, `options`, `label` |
| `EmptyState` | No data / no results | `icon`, `title`, `description`, `action` |
| `Spinner`, `Skeleton` | Loading | |
| `Kbd` | Keyboard hint | |
| `useToast()` | Transient confirmation | `toast.success(msg)`, `.error`, `.info`, `.warning` |
| `ErrorBoundary` | Contain a crashing subtree | `fallback`, `resetKey` |
| `useDismiss` | Close a popover on outside click / Escape | |

## Shell — `@/components/shell/*`

| Component | File | Notes |
|---|---|---|
| `AppShell` | `AppShell.tsx` | Sidebar, top bar, content region, mobile drawer, command palette. Wraps all routes in `App.tsx`. |
| `Sidebar`, `SidebarNav`, `BrandMark` | `Sidebar.tsx` | Rendered from `navigation.config.ts`. Collapsible; state persisted. |
| `PageHeader` | `PageHeader.tsx` | `title`, `description`, `actions`, `meta`. Start every page with it. |
| `Breadcrumbs`, `useBreadcrumb(label)` | `PageHeader.tsx` | Detail pages call `useBreadcrumb(record.title)`. |
| `Notifications` | `Notifications.tsx` | Inbox. Add entries with `pushNotification(title, body, tone, href)` from `@/store`. |
| `UserMenu` | `UserMenu.tsx` | Profile summary, 3D toggle, settings link. |
| `CommandPalette`, `openCommandPalette()` | `CommandPalette.tsx` | Ctrl/⌘ K. Pages, quick actions, record search. Add commands in its `commands` array. |

## Data — `@/components/data/*`

| Component | Use |
|---|---|
| `DataTable<T>` | Sortable, paginated table. `rows`, `columns` (`render`, `sortValue`, `hideBelow`), `onRowClick`, `rowActions`, `empty`. Filtering stays in the page: pass the visible rows. |
| `SchemaForm<T>` | Renders inputs from a `FieldDef[]`. Controlled. Validate with `validateFields(fields, values)` from `@/lib/validation`. |
| `RecordDialog` | Create / edit dialog for the main entity, built on `SchemaForm` + `recordFields`. |

## Charts — `import { … } from '@/components/charts/Charts'`

| Component | Use |
|---|---|
| `LineChart` | Change over time, 1–5 series. `labels`, `series`, `area`. Crosshair tooltip. |
| `BarChart` | Compare categories, one measure. `data`, `measure`. |
| `BarList` | Ranked horizontal bars with labels. `data`, `colorFor`. |
| `Sparkline` | Tiny trend beside a number. |
| `ChartPanel` | `Panel` with a chart/table toggle. Pass `table={{ columns, rows }}`. |

Helpers in `@/lib/metrics`: `lastDays`, `countPerDay`, `countBetween`, `groupCount`, `groupSum`, `percentChange`.

## Dashboard — `import { … } from '@/components/dashboard/Dashboard'`

`MetricStrip` (headline numbers as one strip), `Kpi` (single tile), `Trend` (±% with direction), `QuickActions`, `ActivityFeed`.

## AI — `import { … } from '@/components/ai/AIParts'`

| Component | Use |
|---|---|
| `StructuredResult` | Renders any JSON from `generateJSON` as readable cards. |
| `AIError` | Failure message with retry. |
| `ThinkingDots` | Waiting indicator. |
| `MockNotice` | Shown only while no provider is connected. |

Glue in `@/lib/ai`: `useAsync()`, `describeAIError()`, `workspaceContext()`, `aiSource()`, `isMockAI()`.

## Upload — `import { Dropzone, validateFile } from '@/components/upload/Dropzone'`

Drag-and-drop + picker with type and size validation. Hands back `File[]`; reading or sending is the caller's job (`Files.tsx` shows local reading with progress and previews).

## Map — `import { MapView } from '@/components/map/MapView'`

`points`, `selectedId`, `onSelect`, `userLocation`. Default renderer is a tile-free SVG plot (no key, works offline). Pass `renderer` to plug in a real provider.

## Workflow — `import { Stepper } from '@/components/workflow/Stepper'`

`steps`, `current`, `onStepClick`. `Workflow.tsx` shows the full multi-step pattern: per-step validation, review, confirm, result.

## Music — `@/components/music/*`, `@/services/music/*`

| Piece | Use |
|---|---|
| `MusicPlayer` | Compact top-bar button and panel. Mounted once in `AppShell`; keeps the Spotify frame alive across routes. |
| `MusicControls` | Play/pause, and next / previous / volume when the active player supports them. |
| `TrackInformation`, `Equalizer` | Artwork, title, artist, seekable progress; the animated playing indicator. |
| `MusicSettings` | Body of the Music section in Settings: switches, controls, Spotify connection. |
| `music`, `useMusic()` | `music.player.ts`: the single player. `music.play() / pause() / toggle() / next() / previous() / seek() / setVolume() / setMuted() / connect() / disconnect()`; `useMusic()` returns live state. |
| `spotify.service.ts` | PKCE sign-in, token refresh, the Web API calls used. |
| `music.config.ts` | Client id, redirect URI, scopes, playlist. From env. |

The music folders import nothing from the app except UI primitives, and can be deleted together with the `<MusicPlayer />` line in `AppShell.tsx` and the Music panel in `Settings.tsx`.

## 3D background — `@/components/three/*`

`SceneProvider` mounts everything. Props: `enabled`, `variant` (`cinematic` / `aether` / `classic`), `tone`, `accent`, `background`, `routeKey`, `particles`, and the live controls `intensity`, `speed`, `particleDensity`, `lighting`, `parallax`, `reducedMotion`. `useSceneStatus()` reports status, the active variant and whether motion is reduced. Environments live in `three/environments/`; add one by writing a component that accepts `EnvironmentProps` (`three/shared.ts`) and registering it in `ENVIRONMENTS` in `Scene.tsx`. The folder imports nothing from the rest of the app.

## Page recipes

| Page type | Compose |
|---|---|
| Overview | `PageHeader` + `MetricStrip` + `ChartPanel` + `QuickActions` + `ActivityFeed` → `Overview.tsx` |
| Listing | `PageHeader` + `Panel flush` + filters + `DataTable` + `RecordDialog` + `ConfirmDialog` → `Records.tsx` |
| Detail | `useBreadcrumb` + `PageHeader meta` + `Panel` + `Tabs` → `RecordDetail.tsx` |
| Creation form | `Stepper` + `SchemaForm` + `ConfirmDialog` → `Workflow.tsx` |
| AI interaction | → `Assistant.tsx` |
| Analytics | `Tabs` + `Kpi` + `ChartPanel` + `BarList` → `Analytics.tsx` |
| Settings | `Panel` + `Input` + `Switch` → `Settings.tsx` |
