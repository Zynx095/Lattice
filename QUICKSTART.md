# Quickstart

```bash
cd D:\TECHNOPIA-2.0
npm run dev          # http://localhost:3000
```

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server with hot reload, port 3000 |
| `npm run typecheck` | TypeScript check, no output files |
| `npm run build` | Type check, then production bundle in `dist/` |
| `npm run preview` | Serve the production bundle locally |
| `npm run server` | Optional Express backend and AI proxy, port 3001 |

- What the framework contains and how to change it: [`README.md`](README.md)
- Turning it into a problem-specific app in 60 minutes: [`CLAUDE_EVENT_PLAYBOOK.md`](CLAUDE_EVENT_PLAYBOOK.md)
- Reusable components with import lines: [`docs/COMPONENTS.md`](docs/COMPONENTS.md)
- AI keys and provider: copy `.env.example` to `.env.local`, fill it in, restart the dev server
- Start from clean sample data: Settings → Reset sample data
- Test the non-WebGL fallback: add `?webgl=off` to any URL
