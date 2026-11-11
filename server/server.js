import './env.js'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { authRouter, historyRouter, optionalAuth } from './auth.js'
import { prompts as promptLog } from './db.js'
import { answer, generate as aiGenerate, rateLimited, status as aiStatus, verifyModels } from './ai/router.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const app = express()
// PORT in .env belongs to the Vite frontend (3000); the API uses SERVER_PORT.
const PORT = process.env.SERVER_PORT || 3001

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }))
app.use(express.json({ limit: '64kb' }))

// Request logger for competition debugging
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`)
  })
  next()
})

// In-memory demo data store (replaceable with SQLite / database if needed)
let records = [
  { id: '1', title: 'Sample Task 1', completed: false, createdAt: new Date().toISOString() },
  { id: '2', title: 'Sample Task 2', completed: true, createdAt: new Date().toISOString() },
]

// Accounts and saved history
app.use('/api/auth', authRouter)
app.use('/api/history', historyRouter)

// 1. Health-Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TECHNOPIA 2.0 Backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
})

// 2. Demo CRUD Endpoints
app.get('/api/data', (req, res) => {
  res.json({ success: true, count: records.length, data: records })
})

app.post('/api/data', (req, res, next) => {
  try {
    const { title } = req.body
    if (!title || typeof title !== 'string') {
      const err = new Error('Field "title" is required.')
      err.status = 400
      throw err
    }
    const newRecord = {
      id: String(Date.now()),
      title: title.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    }
    records.push(newRecord)
    res.status(201).json({ success: true, data: newRecord })
  } catch (err) {
    next(err)
  }
})

// 2b. Campus helpdesk: grounded answers via Claude / Gemini routing
const MAX_MESSAGE = 2000
const MAX_HISTORY = 12

app.get('/api/assistant/status', (req, res) => res.json(aiStatus()))

app.post('/api/assistant/chat', optionalAuth, async (req, res, next) => {
  try {
    const { message, conversationHistory = [] } = req.body || {}
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Please type a question first.', status: 400 })
    }
    if (message.length > MAX_MESSAGE) {
      return res.status(400).json({ error: `Questions are limited to ${MAX_MESSAGE} characters.`, status: 400 })
    }
    if (!Array.isArray(conversationHistory)) {
      return res.status(400).json({ error: 'conversationHistory must be an array.', status: 400 })
    }
    const history = conversationHistory
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE * 2) }))
    // Providers require the conversation to start with a user turn.
    while (history.length && history[0].role !== 'user') history.shift()

    if (rateLimited(req.ip || 'anon')) {
      return res.status(429).json({ error: 'Too many questions in a short time. Please wait a minute and try again.', status: 429 })
    }

    const result = await answer([...history, { role: 'user', content: message.trim() }])
    // Save every prompt with its timestamp; signed-in users own their rows, guests are stored anonymously.
    try {
      promptLog.log({ userId: req.user?.id, prompt: message.trim(), answer: result.answer, category: result.category, provider: result.provider, model: result.model, inputTokens: result.usage?.inputTokens, outputTokens: result.usage?.outputTokens })
    } catch (e) {
      console.warn('[db] could not save prompt:', e.message)
    }
    res.json(result)
  } catch (err) {
    if (err.status === 503) {
      try { promptLog.log({ userId: req.user?.id, prompt: String(req.body?.message || '').slice(0, 2000), status: 'failed' }) } catch { /* best effort */ }
      return res.status(503).json({ error: err.message, status: 503, attempts: err.details?.attempts })
    }
    next(err)
  }
})

// 3. Generic AI endpoint for every other AI feature (Overview brief, Assistant, record and
//    file summaries, Settings test). Same Claude/Gemini router, budgets and fallback as the
//    helpdesk. No mock output: if no provider answers, the client gets an honest 503.
app.post('/api/ai', async (req, res, next) => {
  try {
    const { messages, options } = req.body || {}
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return res.status(400).json({ error: 'messages must be a non-empty array (max 40).', status: 400 })
    }
    const clean = messages.filter((m) => m && typeof m.content === 'string' && ['system', 'user', 'assistant'].includes(m.role))
    const total = clean.reduce((n, m) => n + m.content.length, 0)
    if (total > 60_000) {
      return res.status(400).json({ error: 'The request is too large. Shorten the input and try again.', status: 400 })
    }
    if (rateLimited(req.ip || 'anon')) {
      return res.status(429).json({ error: 'Too many AI requests in a short time. Please wait a minute and try again.', status: 429 })
    }
    const system = clean.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
    const json = options?.format === 'json'
    const maxTokens = Number(options?.maxTokens) > 0 ? Number(options.maxTokens) : undefined
    const result = await aiGenerate({ system, messages: clean.filter((m) => m.role !== 'system'), json, maxTokens })

    let data
    if (json) {
      const raw = result.text.trim()
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      try {
        data = JSON.parse(start !== -1 && end > start ? raw.slice(start, end + 1) : raw)
      } catch {
        data = undefined // the client reports a JSON_PARSE_ERROR
      }
    }
    res.json({
      text: result.text,
      data,
      provider: result.provider,
      model: result.model,
      fallback: result.fallback,
      usage: {
        promptTokens: result.usage.inputTokens,
        completionTokens: result.usage.outputTokens,
        totalTokens: result.usage.inputTokens + result.usage.outputTokens,
      },
    })
  } catch (err) {
    if (err.status === 503 || err.status === 400) {
      return res.status(err.status).json({ error: err.message, status: err.status })
    }
    next(err)
  }
})

// 4. 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.url}`,
    status: 404,
  })
})

// 5. Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  const status = err.status || 500
  console.error(`[Error] ${status} - ${err.message}`)
  res.status(status).json({
    // Do not leak internal error details on server errors.
    error: status >= 500 ? 'Something went wrong on the server.' : err.message,
    status,
    timestamp: new Date().toISOString(),
  })
})

// Server listener
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    void verifyModels()
    console.log(`\n🚀 TECHNOPIA 2.0 Backend Server running on http://localhost:${PORT}`)
    console.log(`   - Health check: http://localhost:${PORT}/api/health`)
    console.log(`   - AI proxy:     http://localhost:${PORT}/api/ai`)
    console.log(`   - Data endpoint: http://localhost:${PORT}/api/data\n`)
  })
}

export default app
