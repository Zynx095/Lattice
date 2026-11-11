# TECHNOPIA 2.0 — Optional Backend Server

This is an isolated, optional Node.js Express backend. It does not interfere with the frontend.

## Quickstart

```bash
# From workspace root:
npm run server        # Normal start
npm run server:dev    # Watch mode (auto-restarts on change)

# Or directly in server folder:
cd server
npm start
```

## Endpoints

- `GET  /api/health` — Service health check & uptime
- `GET  /api/data`   — Sample data listing
- `POST /api/data`   — Create record
- `POST /api/ai`     — Server-side AI proxy (shields keys from browser)

## Frontend Connection

In `.env.local` (or frontend config):
```env
VITE_AI_PROXY_URL=http://localhost:3001/api/ai
```
