import { AiUnavailableError, type AiMessage, type AiProvider, type StreamOptions } from '@/lib/ai/types'

/**
 * The only file that knows Puter.js exists. Everything else talks to `ai` (lib/ai/index.ts).
 * Puter is loaded on demand so the CRM stays fast and usable when it can't be reached.
 */
interface PuterGlobal {
  ai: {
    chat(
      messages: AiMessage[] | string,
      options?: { stream?: boolean; model?: string },
    ): Promise<AsyncIterable<{ text?: string }> | { message?: { content?: unknown } } | string>
  }
}

declare global {
  interface Window { puter?: PuterGlobal }
}

const SRC = 'https://js.puter.com/v2/'
let loading: Promise<PuterGlobal | null> | null = null

function loadPuter(timeoutMs = 8000): Promise<PuterGlobal | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.puter) return Promise.resolve(window.puter)
  loading ??= new Promise(resolve => {
    const done = (v: PuterGlobal | null) => { if (!v) loading = null; resolve(v) }
    const s = document.createElement('script')
    s.src = SRC
    s.async = true
    s.onload = () => done(window.puter ?? null)
    s.onerror = () => { s.remove(); done(null) }
    setTimeout(() => done(window.puter ?? null), timeoutMs)
    document.head.appendChild(s)
  })
  return loading
}

export const puterProvider: AiProvider = {
  id: 'puter',
  label: 'Puter AI',
  async available() { return (await loadPuter()) !== null },
  async *stream(messages: AiMessage[], opts: StreamOptions = {}) {
    const puter = await loadPuter()
    if (!puter) throw new AiUnavailableError()
    let res: Awaited<ReturnType<PuterGlobal['ai']['chat']>>
    try {
      res = await puter.ai.chat(messages, { stream: true, ...(opts.model ? { model: opts.model } : {}) })
    } catch (e) {
      throw new AiUnavailableError(e instanceof Error ? e.message : 'Puter request failed')
    }
    if (typeof res === 'string') { yield res; return }
    if (res && Symbol.asyncIterator in (res as object)) {
      try {
        for await (const part of res as AsyncIterable<{ text?: string }>) {
          if (opts.signal?.aborted) return
          if (part?.text) yield part.text
        }
      } catch (e) {
        throw new AiUnavailableError(e instanceof Error ? e.message : 'Puter stream failed')
      }
      return
    }
    const content = (res as { message?: { content?: unknown } })?.message?.content
    const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((c: { text?: string }) => c?.text ?? '').join('') : ''
    if (!text) throw new AiUnavailableError('Empty AI response')
    yield text
  },
}
