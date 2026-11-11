# TECHNOPIA 2.0 — Database Integration Guide

For a 60-minute hackathon, choose the database strategy that delivers working functionality with the lowest friction:

---

## Strategy A: Client-Side LocalStorage (Recommended for 90% of Hackathons)

- **Pros**: Zero installation, zero server required, persistent across browser refreshes, instant reactivity.
- **Pre-installed hook**: `src/hooks/useLocalStorage.ts`

### Usage:
```tsx
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface Task {
  id: string
  title: string
  completed: boolean
}

export function TaskManager() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('technopia_tasks', [])

  const addTask = (title: string) => {
    setTasks((prev) => [...prev, { id: Date.now().toString(), title, completed: false }])
  }

  return (/* JSX */)
}
```

---

## Strategy B: Lightweight SQLite (If Backend Persistence Is Required)

If the problem statement requires server-side persistence or SQL queries:

### 1. Installation (In `server/` directory)
```bash
cd server
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

### 2. Drop-in SQLite Helper (`server/db.js`)
```javascript
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.resolve(__dirname, 'database.sqlite'))

// 1. Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    createdAt TEXT NOT NULL
  )
`)

// 2. Prepared statements for maximum performance
export const queries = {
  getAll: db.prepare('SELECT * FROM items ORDER BY createdAt DESC'),
  getById: db.prepare('SELECT * FROM items WHERE id = ?'),
  create: db.prepare('INSERT INTO items (id, title, category, createdAt) VALUES (?, ?, ?, ?)'),
  delete: db.prepare('DELETE FROM items WHERE id = ?')
}

export default db
```

### 3. Wire into `server/server.js`
```javascript
import { queries } from './db.js'

app.get('/api/items', (req, res) => {
  const items = queries.getAll.all()
  res.json({ success: true, data: items })
})

app.post('/api/items', (req, res) => {
  const { title, category } = req.body
  const id = Date.now().toString()
  const createdAt = new Date().toISOString()
  queries.create.run(id, title, category || 'general', createdAt)
  res.status(201).json({ success: true, data: { id, title, category, createdAt } })
})
```

---

## Strategy C: Zero-Dependency JSON File DB (Fastest Server Persistence)

If binary compilation of SQLite is restricted, use Node's native `fs`:
```javascript
import fs from 'fs/promises'
import path from 'path'

const DB_FILE = path.resolve('server/data.json')

async function readDB() {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { records: [] }
  }
}

async function writeDB(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2))
}
```
