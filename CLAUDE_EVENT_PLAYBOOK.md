# Event playbook: from framework to a problem-specific app in 60 minutes

**Read this first.** The framework gives you a shell, a design system, a 3D background and working modules. It does not solve the problem statement. Judges score the solution to *their* problem, so most of the hour goes into domain data, domain logic and one AI feature that matters. A renamed framework with sample records is not a submission.

Workspace: `D:\TECHNOPIA-2.0\` · Dev server: `npm run dev` → http://localhost:3000 · Stack: React 18, TypeScript, Vite, Tailwind 3, React Router 6, React Three Fiber.

---

## The 60-minute schedule

| Minutes | Do | Done when |
|---|---|---|
| 0–5 | Read the problem. Fill in the worksheet in step 1. Start `npm run dev`. | You can state the user, the main journey and the AI feature in three sentences. |
| 5–10 | Branding, modules on/off, navigation (steps 2–4). | The sidebar shows only what this app needs, under its real name. |
| 10–20 | Data model, fields, sample rows (step 5). | The table, form and detail page show domain data. |
| 20–35 | Business logic and the one domain-specific page or panel (step 6). Backend only if required (step 7). | The main journey works end to end with real rules. |
| 35–45 | AI feature inside that journey (step 8). | A real AI call changes what the user sees or does. |
| 45–52 | Test the journey, fix what breaks (step 9). | `npm run typecheck` and `npm run build` pass, console is clean. |
| 52–60 | Screenshots, README, commit (step 10). | Submitted. |

If you are behind at minute 35, cut scope, not testing. Disable a module rather than ship it half-adapted.

---

## 1. Inspect the problem statement

Write these down before touching code:

1. **User**: who opens this app, and in what situation?
2. **Main journey**: the 3–5 steps from opening the app to getting value. This is what you demo.
3. **Core entity**: the one thing the app is about (patient visit, crop report, expense, incident, parcel, complaint). What fields does it have? What states does it move through?
4. **Rules**: what does the app decide, calculate or flag? (thresholds, priorities, eligibility, totals, deadlines)
5. **AI feature**: where does a language model help in the journey? Classify, extract, summarise, recommend, draft, answer questions over the data.
6. **Explicit requirements**: anything the statement names (a map, file upload, a chart, a login, a specific output). These are scored. List them.

## 2. Pick modules

Every module is switched in `src/config/modules.config.ts` (`enabled: true/false`). Disabling removes the route, sidebar link, command-palette entry and quick actions.

| Problem mentions… | Keep | Typical adaptation |
|---|---|---|
| tracking, managing, listing anything | `records` | new data model (step 5) |
| summary, status, monitoring | `overview`, `analytics` | new metrics in `dashboard.config.ts` |
| chatbot, advice, Q&A, recommendations | `assistant` | new prompts in `ai.config.ts` |
| reports, documents, images, CSV, OCR | `files` | send file text to the AI service |
| areas, routes, nearby, sites, sensors | `locations` | real coordinates; real map only if needed |
| application, booking, complaint, onboarding | `workflow` | new steps and fields |
| anything | `settings` | usually untouched |

Category hints: healthcare / education / campus / food → records + workflow + assistant. Environment / smart city / agriculture / disaster / transport → overview + analytics + locations + records. Finance / e-commerce → records + analytics. Cybersecurity → records (as alerts/incidents) + analytics + assistant. Document intelligence → files + assistant. Accessibility → assistant + workflow, and keep keyboard and screen-reader behaviour intact.

Turn off what the problem does not need. Four focused pages beat eight generic ones.

## 3. Replace the branding

`src/config/app.config.ts`:

- `name`, `tagline`, `description`
- `entity: { singular, plural }`: the noun used in every button, toast and empty state ("patient", "patients")
- `storagePrefix`: **change it**, so old sample data in localStorage does not leak into the new app
- `defaultUser`

Accent colour: `defaultAccent` in `src/config/theme.config.ts` (brass, glacier, sage, iris, coral). Logo: `BrandMark` in `src/components/shell/Sidebar.tsx` and `public/mark.svg`. Leave both if time is short.

## 4. Configure navigation

`src/config/navigation.config.ts` holds the sidebar groups and icons. `modules.config.ts` holds each page's `title`, `description` and `path`. Rename there ("Records" → "Patients", "New request" → "Report an incident").

New page: add an id to `ModuleId` and `modules`, a lazy import in `src/pages/registry.tsx`, and a sidebar item. Detail or sub-pages go in `childRoutes` in the registry.

## 5. Create the domain data model

All in `src/data/`:

1. `models.ts`: edit `WorkRecord` (keep `id`, `createdAt`; keep `status` if the entity has states). Edit `statusMeta`, `categories`, `owners`, `amountLabel`.
2. `models.ts`: edit `recordFields`. This one list drives the create/edit dialog, the workflow steps and validation (`required`, `min`, `max`, `maxLength`).
3. `models.ts`: edit `emptyRecord()` defaults.
4. `sample.ts`: replace the rows with 15–30 believable domain rows. Keep dates relative to today (the `ago()` helper) so charts are populated.
5. `src/pages/Records.tsx`: edit the `columns` array.
6. `src/pages/RecordDetail.tsx`: edit the `facts` array.
7. `src/lib/ai.ts`: edit `workspaceContext()`. This is what the assistant knows about the data.

Run `npm run typecheck` after step 3. The compiler lists every place that still uses an old field name; fix them top to bottom.

Renaming `WorkRecord` itself is optional and costs time. Renaming what the user sees (step 3) is not optional.

## 6. Implement business logic

- **Mutations and side effects**: `src/store/index.ts`. `createRecord`, `updateRecord`, `deleteRecord` are the only writers. Put rules here: auto-set priority, compute a score, raise a notification with `pushNotification()`, log with `logActivity()`. There is one example rule (blocked → notification); replace it.
- **Calculations**: pure functions in `src/lib/metrics.ts` (or a new `src/lib/<domain>.ts`). No React in them.
- **Overview numbers**: `dashboardMetrics` in `src/config/dashboard.config.ts`. Each metric is a `compute(records)` function, so it updates as data changes.
- **Domain-specific page**: copy the closest page in `src/pages/`, compose from the catalogue (`docs/COMPONENTS.md`), register it (step 4). Wrap content in `<PageHeader>` + `<Panel>`.

State is shared through tiny stores (`createStore` in `src/store/createStore.ts`): `store.use()` in components, `store.set()` anywhere, persisted to localStorage. Add a second entity by adding a second store.

## 7. Connect backend services (only if the problem needs one)

Default: no backend. localStorage is enough for a demo and removes a failure point.

If required: `npm run server` starts Express on port 3001 (`server/server.js`: `/api/health`, `/api/data`, `/api/ai`). Add routes there. On the client use `api.get/post/put/delete` from `src/services/api.ts`, call it inside the functions in `src/store/index.ts`, and write the response into the store. Components do not change. `docs/DATABASE_GUIDE.md` covers SQLite.

Third-party REST APIs (weather, geocoding): add a small file in `src/services/`, call it from a page with `useAsync` from `src/lib/ai.ts`, and always render the loading, error and empty states.

## 8. Implement AI functionality

The service is `src/services/ai/ai.service.ts`. Do not rewrite it.

```ts
import { aiService } from '@/services/ai/ai.service'
const res = await aiService.generateText(messagesOrString, { systemPrompt })
const res = await aiService.generateJSON<MyShape>(messages, { systemPrompt }) // res.data
```

**Connect a real model first** (minute 5, in the background):

- **This project:** every AI feature calls the Express backend (`npm run server`), which routes between Claude and Gemini (`server/ai/router.js`). Keys go in the server-side `.env` (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`). There are no `VITE_AI_*` variables and no offline mock; never put provider keys in `VITE_` variables, because Vite ships them to the browser.
- The backend has native adapters for both APIs (`server/ai/providers.js`); `POST /api/ai` serves `aiService`, `POST /api/assistant/chat` serves the Campus Helpdesk.
- Restart `npm run server` after editing `.env`. Verify in Settings → "Send a test prompt".

If the backend is down or no provider answers, `aiService` throws and the UI shows an error with a retry. There is no mock output.

**Put AI in the journey, not beside it.** Patterns that already exist to copy:

| Pattern | Copy from |
|---|---|
| Summarise / advise on one item | `RecordDetail.tsx` → `summarise` |
| Brief over the whole dataset | `Overview.tsx` → `AssistantBrief` |
| Extract or summarise an uploaded document | `Files.tsx` → `summarise` |
| Chat grounded in app data | `Assistant.tsx` |
| JSON → UI cards (triage, recommendations, classification) | `generateJSON` + `<StructuredResult data={res.data} />` |

Strong event-day moves: on create, call `generateJSON` to classify/prioritise the new item and store the result on the record; on the detail page, generate next steps; on upload, extract fields and prefill the form.

All prompts live in `src/config/ai.config.ts`. Rewrite `system`, `suggestions` and the task prompts for the domain. Use `useAsync` + `<AIError>` + `<ThinkingDots>` for loading and failure states; `describeAIError()` turns failures into readable messages.

## 9. Test the main journey

1. Walk the journey from step 1 in the browser, start to finish, twice. Once with good input, once with empty and invalid input.
2. Check: create, edit, delete, search, filter, the AI call, the overview numbers changing afterwards.
3. Open DevTools → Console: no red errors.
4. Narrow the window to phone width: nothing overflows, the menu opens.
5. `npm run typecheck` and `npm run build`: both exit 0.
6. Settings → "Reset sample data", reload, walk the journey once more from a clean state.

Rule from this framework: if a control is visible, it works. Remove anything you did not finish.

## 10. Screenshots and submission

1. Reset sample data so the screenshots show a clean, populated state.
2. Capture into `screenshots/`: overview, the main list, the detail or form step, the AI feature showing a real answer, one phone-width view. `Win+Shift+S`, or DevTools → Ctrl+Shift+P → "Capture full size screenshot".
3. Rewrite `README.md`: problem statement, solution in three sentences, features, how AI is used (and which provider), how to run, screenshots.
4. Check for secrets: `git status` must not list `.env` or `.env.local`; search the diff for the key prefix.
5. Commit. Submit through GitHub Desktop (File → Add Local Repository → `D:\TECHNOPIA-2.0`) if a repository link is required.

---

## Where things are

```
src/config/        ← start here: app, modules, navigation, dashboard, theme, ai prompts (index.ts re-exports all)
src/data/          models.ts (types + field definitions), sample.ts (rows)
src/store/         shared state + the only functions that change data
src/lib/           metrics, validation, AI glue (context, errors, useAsync), utils
src/services/      ai/ (existing, untouched), api.ts (backend fetch wrapper)
src/pages/         one file per page, registry.tsx maps module → page
src/components/    ui/ shell/ data/ charts/ dashboard/ ai/ upload/ map/ workflow/ three/
docs/COMPONENTS.md component catalogue with import lines
```

## Things that will bite

- **Old data after changing the model**: localStorage still holds the old rows. Change `storagePrefix` or use Settings → Reset sample data.
- **Env changes ignored**: Vite reads `.env*` at startup. Restart the dev server.
- **3D background**: independent of everything. Toggle in the account menu, `?webgl=off` forces the static fallback, `scene.enabledByDefault` in `theme.config.ts` turns it off for everyone. Never spend event time on it.
- **Two themes**: every colour must come from a token (`bg-card`, `text-muted-foreground`, `border-border`, `text-primary`…), never a hex value, or it breaks in the other theme. Check both before screenshots; pick the default with `themeConfig.defaultTheme`.
- **Music**: optional and off the critical path. If the problem has nothing to do with it, set `enabled: false` in `defaultPrefs` in `src/services/music/music.player.ts`, or remove `<MusicPlayer />` from `AppShell.tsx`.
- **Chart colours**: use `themeConfig.chartColors` in order. More than five series → group into "Other".
- **New dependencies**: avoid. Everything needed for a typical problem is installed. A real map (`leaflet`, `react-leaflet@4`) is the one likely exception; see the header comment in `src/components/map/MapView.tsx`.
