# Claude handoff — TECHNOPIA 2.0

**Follow [`CLAUDE_EVENT_PLAYBOOK.md`](CLAUDE_EVENT_PLAYBOOK.md).** It has the 60-minute schedule and the exact files to change. This page is the short version.

## Rules

1. Do not regenerate the project. Adapt the framework in `D:\TECHNOPIA-2.0\`.
2. The framework is a starting point. Implement the actual problem: domain data, domain rules, and an AI feature inside the main user journey.
3. Change configuration before code: `src/config/` → `src/data/` → `src/store/index.ts` → pages.
4. Disable modules the problem does not need (`src/config/modules.config.ts`).
5. Do not install packages unless the problem cannot be solved without one.
6. Every visible control must work. Remove what is unfinished.
7. Use `aiService` from `src/services/ai/ai.service.ts`. It always goes through the backend router (`npm run server`); there is no offline mock.
8. Never commit `.env` or `.env.local`.
9. Reserve the last 15 minutes for testing, screenshots (`screenshots/`), README and commit.

## Commands

```bash
npm run dev         # http://localhost:3000, start immediately
npm run typecheck   # must exit 0
npm run build       # must exit 0
npm run server      # optional backend + AI proxy on :3001
```

## Imports you will use most

```ts
import { appConfig, modules, isEnabled, aiPrompts, themeConfig } from '@/config'
import { recordsStore, createRecord, updateRecord, deleteRecord, pushNotification, logActivity } from '@/store'
import { Button, Input, Select, Textarea, Modal, ConfirmDialog, Panel, Badge, Tabs, EmptyState, useToast } from '@/components/ui'
import { PageHeader } from '@/components/shell/PageHeader'
import { DataTable } from '@/components/data/DataTable'
import { SchemaForm } from '@/components/data/SchemaForm'
import { LineChart, BarChart, BarList, ChartPanel } from '@/components/charts/Charts'
import { StructuredResult, AIError, ThinkingDots } from '@/components/ai/AIParts'
import { useAsync, workspaceContext, describeAIError } from '@/lib/ai'
import { aiService } from '@/services/ai/ai.service'
```

Full catalogue: [`docs/COMPONENTS.md`](docs/COMPONENTS.md).
