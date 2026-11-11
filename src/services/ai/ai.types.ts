export type AIRole = 'system' | 'user' | 'assistant'

export interface AIMessage {
  role: AIRole
  content: string
}

export type AIResponseFormat = 'text' | 'json'

export interface AICompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: AIResponseFormat
  jsonSchema?: Record<string, unknown>
  timeoutMs?: number
  systemPrompt?: string
}

export interface AICompletionResponse<T = unknown> {
  text: string
  data?: T
  provider: string
  model: string
  /** True when the backend had to fall back from its first-choice provider or model. */
  fallback?: boolean
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

export type AIProvider = 'backend'

export interface AIProviderConfig {
  provider: AIProvider
  proxyUrl: string
  statusUrl: string
  timeoutMs: number
}

export class AIServiceError extends Error {
  public code: string
  public status?: number
  public details?: unknown

  constructor(message: string, code: string = 'AI_ERROR', status?: number, details?: unknown) {
    super(message)
    this.name = 'AIServiceError'
    this.code = code
    this.status = status
    this.details = details
  }
}
