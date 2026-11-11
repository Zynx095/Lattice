/**
 * Provider adapters. Anthropic and Gemini have different request shapes, so each
 * adapter converts the shared { system, messages } input into its own format and
 * normalises the reply to { text, inputTokens, outputTokens, model }.
 */

export class ProviderError extends Error {
  constructor(message, { status, retryable = true } = {}) {
    super(message)
    this.status = status
    this.retryable = retryable
  }
}

async function postJSON(url, headers, body, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const payload = await res.json().catch(() => null)
    if (!res.ok) {
      const msg = payload?.error?.message || `HTTP ${res.status}`
      throw new ProviderError(msg, { status: res.status })
    }
    return payload
  } catch (err) {
    if (err instanceof ProviderError) throw err
    if (err?.name === 'AbortError') throw new ProviderError(`Timed out after ${timeoutMs} ms`, { status: 408 })
    throw new ProviderError(`Network error: ${err?.message || err}`)
  } finally {
    clearTimeout(timer)
  }
}

export const anthropic = {
  id: 'claude',
  label: 'Claude',
  keyEnv: 'ANTHROPIC_API_KEY',
  async listModels(key) {
    const res = await fetch('https://api.anthropic.com/v1/models?limit=100', {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return (data.data || []).map((m) => m.id)
  },
  async generate({ key, model, system, messages, maxTokens, timeoutMs }) {
    const data = await postJSON(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      { model, max_tokens: maxTokens, ...(system ? { system } : {}), messages: messages.map((m) => ({ role: m.role, content: m.content })) },
      timeoutMs,
    )
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
    if (!text.trim()) throw new ProviderError('Empty response from Claude')
    return { text, model: data.model || model, inputTokens: data.usage?.input_tokens ?? 0, outputTokens: data.usage?.output_tokens ?? 0 }
  },
}

export const gemini = {
  id: 'gemini',
  label: 'Gemini',
  keyEnv: 'GEMINI_API_KEY',
  async listModels(key) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=300', {
      headers: { 'x-goog-api-key': key },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return (data.models || []).map((m) => m.name.replace(/^models\//, ''))
  },
  async generate({ key, model, system, messages, maxTokens, timeoutMs, json }) {
    const data = await postJSON(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { 'x-goog-api-key': key },
      {
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        // Thinking models count reasoning against the output budget, so leave headroom.
        generationConfig: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: Math.max(maxTokens * 2, 1024), ...(json ? { responseMimeType: 'application/json' } : {}) },
      },
      timeoutMs,
    )
    const cand = data.candidates?.[0]
    const text = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('')
    if (!text.trim()) throw new ProviderError(`Empty response from Gemini (${cand?.finishReason || 'no candidate'})`)
    const u = data.usageMetadata || {}
    return {
      text,
      model: data.modelVersion || model,
      inputTokens: u.promptTokenCount ?? 0,
      outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
    }
  },
}

export const PROVIDERS = { claude: anthropic, gemini }
