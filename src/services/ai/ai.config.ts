import { appConfig } from '@/config/app.config'
import type { AIProviderConfig } from './ai.types'

/**
 * Every AI feature talks to the Express backend (server/ai/router.js), which
 * holds the Claude and Gemini keys, picks the model, tracks token usage and
 * falls back between providers. No provider key or model is configured in
 * the browser, and there is no offline mock.
 */
export const aiConfig: AIProviderConfig = {
  provider: 'backend',
  proxyUrl: `${appConfig.apiBaseUrl}/ai`,
  statusUrl: `${appConfig.apiBaseUrl}/assistant/status`,
  // The backend may try up to three models across two providers before giving up.
  timeoutMs: 90_000,
}

/** Safe metadata for the Settings page. Contains no secrets. */
export function getAISafeStatus() {
  return { provider: aiConfig.provider, endpoint: aiConfig.proxyUrl, timeoutMs: aiConfig.timeoutMs }
}
