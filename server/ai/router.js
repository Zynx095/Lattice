import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PROVIDERS, ProviderError } from './providers.js'
import { SYSTEM_PROMPT, parseReply } from './prompt.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const USAGE_FILE = path.resolve(__dirname, '../data/usage.json')

const num = (name, fallback) => {
  const v = Number(process.env[name])
  return Number.isFinite(v) && v >= 0 ? v : fallback
}

/** Comma-separated env value -> array of non-empty names. */
const list = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean)

export function loadConfig() {
  return {
    priority: (process.env.AI_PROVIDER_PRIORITY || 'claude,gemini')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((id) => PROVIDERS[id]),
    lightMaxInputTokens: num('AI_LIGHT_MAX_INPUT_TOKENS', 1500),
    geminiOnlyAboveTokens: num('AI_GEMINI_ONLY_ABOVE_TOKENS', 150000),
    maxOutputTokens: num('AI_MAX_OUTPUT_TOKENS', 1024),
    rateLimitPerMinute: num('AI_RATE_LIMIT_PER_MINUTE', 20),
    timeoutMs: num('AI_TIMEOUT_MS', 25000),
    models: {
      claude: { light: process.env.CLAUDE_MODEL_LIGHT, heavy: process.env.CLAUDE_MODEL_HEAVY, backup: list(process.env.CLAUDE_MODEL_BACKUP) },
      gemini: { light: process.env.GEMINI_MODEL_LIGHT, heavy: process.env.GEMINI_MODEL_HEAVY, backup: list(process.env.GEMINI_MODEL_BACKUP) },
    },
    dailyLimits: { claude: num('CLAUDE_DAILY_TOKEN_LIMIT', 0), gemini: num('GEMINI_DAILY_TOKEN_LIMIT', 0) },
  }
}

const config = loadConfig()

/** ~4 characters per token: a cheap, provider-neutral estimate made before routing. */
export const estimateTokens = (text) => Math.ceil(String(text || '').length / 4)

// ---------- Daily usage tracking (persisted, counts only, never prompt text) ----------
const today = () => new Date().toISOString().slice(0, 10)
let usage = { date: today(), claude: { input: 0, output: 0, requests: 0 }, gemini: { input: 0, output: 0, requests: 0 } }
try {
  const saved = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'))
  if (saved.date === today()) usage = { ...usage, ...saved }
} catch {
  /* no usage file yet */
}
function rollDay() {
  if (usage.date !== today()) usage = { date: today(), claude: { input: 0, output: 0, requests: 0 }, gemini: { input: 0, output: 0, requests: 0 } }
}
function recordUsage(id, input, output) {
  rollDay()
  usage[id].input += input
  usage[id].output += output
  usage[id].requests += 1
  try {
    fs.mkdirSync(path.dirname(USAGE_FILE), { recursive: true })
    fs.writeFileSync(USAGE_FILE, JSON.stringify(usage))
  } catch {
    /* persistence is best effort */
  }
}
const usedToday = (id) => (rollDay(), usage[id].input + usage[id].output)
const withinBudget = (id, estimate) => !config.dailyLimits[id] || usedToday(id) + estimate <= config.dailyLimits[id]

// ---------- Model verification against each provider's live model list ----------
const verified = { claude: null, gemini: null }
export async function verifyModels() {
  for (const id of Object.keys(PROVIDERS)) {
    const key = process.env[PROVIDERS[id].keyEnv]
    if (!key || /^your_/.test(key)) continue
    try {
      const list = await PROVIDERS[id].listModels(key)
      const m = config.models[id]
      const ok = (name) => name && list.includes(name)
      if (!ok(m.light)) console.warn(`[ai] ${id}: configured light model "${m.light}" not offered by the API`)
      if (!ok(m.heavy)) console.warn(`[ai] ${id}: configured heavy model "${m.heavy}" not offered by the API`)
      // If one tier is unavailable, use the other tier rather than calling a model that will 404.
      verified[id] = { light: ok(m.light) ? m.light : ok(m.heavy) ? m.heavy : null, heavy: ok(m.heavy) ? m.heavy : ok(m.light) ? m.light : null, backup: m.backup.filter(ok) }
      for (const b of m.backup.filter((b) => !ok(b))) console.warn(`[ai] ${id}: configured backup model "${b}" not offered by the API`)
      console.log(`[ai] ${id}: light=${verified[id].light ?? 'none'} heavy=${verified[id].heavy ?? 'none'}`)
    } catch (err) {
      console.warn(`[ai] ${id}: could not list models (${err.message}); using configured names`)
    }
  }
}
const modelFor = (id, tier) => (verified[id] ? verified[id][tier] : config.models[id][tier])
const hasKey = (id) => {
  const key = process.env[PROVIDERS[id].keyEnv]
  return Boolean(key && !/^your_/.test(key))
}

// ---------- Circuit breaker: skip a provider for a while after a hard failure ----------
// (invalid key, no credit, model missing). Prevents paying a failed round trip on every request.
const cooldownUntil = { claude: 0, gemini: 0 }
const COOLDOWN_MS = 5 * 60_000
const coolingDown = (id) => Date.now() < cooldownUntil[id]

// ---------- Per-client rate limiting (sliding one-minute window) ----------
const hits = new Map()
export function rateLimited(clientId) {
  if (!config.rateLimitPerMinute) return false
  const now = Date.now()
  const recent = (hits.get(clientId) || []).filter((t) => now - t < 60_000)
  if (recent.length >= config.rateLimitPerMinute) {
    hits.set(clientId, recent)
    return true
  }
  recent.push(now)
  hits.set(clientId, recent)
  return false
}

/**
 * Deterministic routing:
 *  1. Estimate input tokens (system + history + message).
 *  2. Tier: conversation tokens (history + message, excluding the fixed knowledge
 *     prompt) <= AI_LIGHT_MAX_INPUT_TOKENS -> light model, else heavy.
 *  3. Order: AI_PROVIDER_PRIORITY, except total > AI_GEMINI_ONLY_ABOVE_TOKENS -> Gemini only.
 *  4. Skip providers without a key or over their daily token budget.
 *  5. Call one provider; on failure try the next one once. No retry loops.
 */
export function plan(messages, system, { systemCountsTowardTier }) {
  const conversationTokens = messages.reduce((n, m) => n + estimateTokens(m.content), 0)
  const systemTokens = estimateTokens(system)
  const totalTokens = conversationTokens + systemTokens
  // The helpdesk's fixed knowledge prompt is excluded from the tier decision; a caller-built
  // system prompt (e.g. workspace data for the Overview brief) is real input and counts.
  const tierTokens = systemCountsTowardTier ? totalTokens : conversationTokens
  const tier = tierTokens <= config.lightMaxInputTokens ? 'light' : 'heavy'
  let order = totalTokens > config.geminiOnlyAboveTokens ? ['gemini'] : [...config.priority]
  const skipped = []
  order = order.filter((id) => {
    if (!hasKey(id)) return skipped.push(`${id}: no API key`), false
    if (!modelFor(id, tier)) return skipped.push(`${id}: no available model`), false
    if (!withinBudget(id, totalTokens + config.maxOutputTokens)) return skipped.push(`${id}: daily token budget reached`), false
    if (coolingDown(id)) return skipped.push(`${id}: cooling down after a provider error`), false
    return true
  })
  return { order, tier, totalTokens, skipped }
}

/** Providers need alternating turns starting with the user; merge neighbours with the same role. */
function normaliseTurns(messages) {
  const out = []
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || !m.content.trim()) continue
    const prev = out[out.length - 1]
    if (prev && prev.role === m.role) prev.content += `\n\n${m.content}`
    else out.push({ role: m.role, content: m.content })
  }
  while (out.length && out[0].role !== 'user') out.shift()
  return out
}

/**
 * Generic routed completion used by every AI feature in the app.
 * One call per request; on failure the next candidate is tried once:
 * same provider's other models (separate per-model quota), then the next provider.
 */
export async function generate({ system, messages, json = false, maxTokens, systemCountsTowardTier = true }) {
  const turns = normaliseTurns(messages)
  if (!turns.length) {
    const e = new Error('A message is required.')
    e.status = 400
    throw e
  }
  const { order, tier, totalTokens, skipped } = plan(turns, system, { systemCountsTowardTier })
  const outputCap = Math.min(maxTokens || config.maxOutputTokens, config.maxOutputTokens)
  const attempts = []
  for (const id of order) {
    const provider = PROVIDERS[id]
    const other = tier === 'light' ? 'heavy' : 'light'
    const models = [...new Set([modelFor(id, tier), modelFor(id, other), ...(modelFor(id, 'backup') || [])].filter(Boolean))]
    for (const [i, model] of models.entries()) {
      const started = Date.now()
      try {
        const res = await provider.generate({
          key: process.env[provider.keyEnv],
          model,
          system,
          messages: turns,
          maxTokens: outputCap,
          timeoutMs: config.timeoutMs,
          json,
        })
        recordUsage(id, res.inputTokens, res.outputTokens)
        console.log(`[ai] ${id}/${res.model} tier=${tier} est=${totalTokens} in=${res.inputTokens} out=${res.outputTokens} ${Date.now() - started}ms`)
        return {
          text: res.text,
          provider: provider.label,
          model: res.model,
          tier: i === 0 ? tier : model === modelFor(id, other) ? other : 'backup',
          fallback: attempts.length > 0 || skipped.length > 0,
          usage: { inputTokens: res.inputTokens, outputTokens: res.outputTokens, estimatedInputTokens: totalTokens },
        }
      } catch (err) {
        console.warn(`[ai] ${id}/${model} failed: ${err.status ?? ''} ${String(err.message).slice(0, 120)}`)
        attempts.push({ provider: provider.label, model, status: err.status ?? null })
        // Billing / auth problems affect every model of the provider: move on immediately.
        if ([401, 403].includes(err.status) || (err.status !== 429 && /credit balance|billing/i.test(err.message))) {
          cooldownUntil[id] = Date.now() + COOLDOWN_MS
          break
        }
      }
    }
  }
  const e = new Error('Both AI providers are currently unavailable. Please try again in a moment.')
  e.status = 503
  e.details = { attempts, skipped }
  throw e
}

/** Campus helpdesk: grounded system prompt + structured reply. */
export async function answer(messages) {
  const res = await generate({ system: SYSTEM_PROMPT, messages, json: true, systemCountsTowardTier: false })
  const reply = parseReply(res.text) ?? { answer: res.text, category: 'General', availability: 'partial', nextStep: '' }
  const { text, ...meta } = res
  return { ...reply, ...meta, grounded: true }
}

export function status() {
  rollDay()
  return {
    priority: config.priority,
    providers: Object.fromEntries(
      Object.keys(PROVIDERS).map((id) => [
        id,
        {
          configured: hasKey(id),
          models: { light: modelFor(id, 'light') ?? null, heavy: modelFor(id, 'heavy') ?? null },
          tokensToday: usedToday(id),
          requestsToday: usage[id].requests,
          dailyLimit: config.dailyLimits[id] || null,
          coolingDown: coolingDown(id),
        },
      ]),
    ),
  }
}
