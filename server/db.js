import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dir = path.resolve(__dirname, 'data')
fs.mkdirSync(dir, { recursive: true })

/** SQLite file at server/data/lattice.db (git-ignored). Timestamps are ISO-8601 UTC strings. */
export const db = new DatabaseSync(path.join(dir, 'lattice.db'))
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    last_login_at TEXT
  );
  CREATE TABLE IF NOT EXISTS prompts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    prompt        TEXT NOT NULL,
    answer        TEXT,
    category      TEXT,
    provider      TEXT,
    model         TEXT,
    input_tokens  INTEGER,
    output_tokens INTEGER,
    status        TEXT NOT NULL DEFAULT 'ok',
    created_at    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_prompts_user ON prompts(user_id, created_at);
`)

const now = () => new Date().toISOString()

export const users = {
  byEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email),
  byId: (id) => db.prepare('SELECT id, name, email, created_at, last_login_at FROM users WHERE id = ?').get(id),
  create: (name, email, hash) =>
    Number(db.prepare('INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(name, email, hash, now()).lastInsertRowid),
  touchLogin: (id) => db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now(), id),
}

export const prompts = {
  log: ({ userId, prompt, answer, category, provider, model, inputTokens, outputTokens, status }) =>
    db
      .prepare('INSERT INTO prompts (user_id, prompt, answer, category, provider, model, input_tokens, output_tokens, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(userId ?? null, prompt, answer ?? null, category ?? null, provider ?? null, model ?? null, inputTokens ?? null, outputTokens ?? null, status ?? 'ok', now()),
  forUser: (userId, limit = 100) =>
    db.prepare("SELECT id, prompt, answer, category, provider, created_at FROM prompts WHERE user_id = ? AND status = 'ok' ORDER BY id DESC LIMIT ?").all(userId, limit),
  clearForUser: (userId) => db.prepare('DELETE FROM prompts WHERE user_id = ?').run(userId),
}
