export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamOptions {
  signal?: AbortSignal
  model?: string
}

/** Anything that can turn messages into streamed text. Puter today; swap in another backend later. */
export interface AiProvider {
  readonly id: 'puter' | 'local'
  readonly label: string
  available(): Promise<boolean>
  stream(messages: AiMessage[], opts?: StreamOptions): AsyncIterable<string>
}

export class AiUnavailableError extends Error {
  constructor(message = 'AI service unavailable') {
    super(message)
    this.name = 'AiUnavailableError'
  }
}
