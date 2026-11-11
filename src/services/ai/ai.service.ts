import { aiConfig } from './ai.config'
import {
  AIMessage,
  AICompletionOptions,
  AICompletionResponse,
  AIServiceError,
} from './ai.types'

export class AIService {
  private config = aiConfig

  /**
   * Generates a text response from the configured AI provider.
   */
  async generateText(
    prompt: string | AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResponse<string>> {
    const messages = this.normalizeMessages(prompt, options?.systemPrompt)
    return this.dispatchCompletion(messages, options, 'text')
  }

  /**
   * Generates a structured JSON response from the configured AI provider.
   */
  async generateJSON<T = unknown>(
    prompt: string | AIMessage[],
    options?: Omit<AICompletionOptions, 'responseFormat'>
  ): Promise<AICompletionResponse<T>> {
    const messages = this.normalizeMessages(prompt, options?.systemPrompt)
    const response = await this.dispatchCompletion(messages, { ...options, responseFormat: 'json' }, 'json')

    try {
      const parsedData = typeof response.data === 'object' && response.data !== null
        ? (response.data as T)
        : (JSON.parse(response.text) as T)

      return {
        ...response,
        data: parsedData,
      }
    } catch (err) {
      throw new AIServiceError(
        `Failed to parse AI response as JSON: ${err instanceof Error ? err.message : String(err)}`,
        'JSON_PARSE_ERROR',
        500,
        { rawText: response.text }
      )
    }
  }

  /**
   * Normalizes string or AIMessage array into structured messages.
   */
  private normalizeMessages(prompt: string | AIMessage[], systemPrompt?: string): AIMessage[] {
    const messages: AIMessage[] = []

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    if (typeof prompt === 'string') {
      messages.push({ role: 'user', content: prompt })
    } else {
      messages.push(...prompt)
    }

    return messages
  }

  /** Sends the request to the backend AI router. There is no mock or direct-to-provider path. */
  private async dispatchCompletion<T = unknown>(
    messages: AIMessage[],
    options?: AICompletionOptions,
    format: 'text' | 'json' = 'text'
  ): Promise<AICompletionResponse<T>> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || this.config.timeoutMs)

    try {
      const res = await fetch(this.config.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          options: { maxTokens: options?.maxTokens, format },
        }),
        signal: controller.signal,
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new AIServiceError(
          payload?.error || `The AI service returned an error (${res.status}).`,
          res.status === 503 ? 'PROVIDERS_UNAVAILABLE' : 'PROXY_HTTP_ERROR',
          res.status
        )
      }
      return payload as AICompletionResponse<T>
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AIServiceError('AI request timed out.', 'TIMEOUT_ERROR', 408)
      }
      throw err instanceof AIServiceError ? err : new AIServiceError(String(err), 'NETWORK_ERROR')
    } finally {
      clearTimeout(timeout)
    }
  }
}

export const aiService = new AIService()
