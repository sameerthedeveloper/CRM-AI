import { puterProvider } from '@/lib/puter'
import { localProvider } from './local-provider'
import { AiUnavailableError, type AiMessage, type AiProvider, type StreamOptions } from './types'

export type AiPref = 'auto' | 'puter' | 'local'
const PREF_KEY = 'hearth:ai'
const MODEL_KEY = 'hearth:ai-model'

const read = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const write = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } }

export interface StreamResult { provider: AiProvider['id']; degraded: boolean }
interface ChatOpts extends StreamOptions { fallback?: () => string; result?: { current?: StreamResult } }

/**
 * AI service layer. UI and agent code call these methods only; the provider behind them is replaceable.
 * If the remote provider fails, calls transparently fall back to the offline assistant (`degraded: true`).
 */
export const ai = {
  getPref: (): AiPref => read(PREF_KEY, 'auto') as AiPref,
  setPref: (p: AiPref) => write(PREF_KEY, p),
  getModel: () => read(MODEL_KEY, ''),
  setModel: (m: string) => write(MODEL_KEY, m.trim()),
  async remoteAvailable() { return puterProvider.available() },

  /** Stream a chat completion. The last yielded value of `result` tells which provider answered. */
  async *chatStream(messages: AiMessage[], opts: ChatOpts = {}) {
    const pref = ai.getPref()
    const out = opts.result ?? {}
    const useLocal = async function* () {
      if (opts.fallback) yield opts.fallback()
      else yield* localProvider.stream(messages, opts)
    }
    if (pref !== 'local') {
      let started = false
      try {
        if (await puterProvider.available()) {
          for await (const chunk of puterProvider.stream(messages, { ...opts, model: opts.model ?? (ai.getModel() || undefined) })) {
            started = true
            yield chunk
          }
          out.current = { provider: 'puter', degraded: false }
          return
        }
      } catch (e) {
        if (started) throw e instanceof Error ? e : new AiUnavailableError()
      }
      out.current = { provider: 'local', degraded: true }
      yield* useLocal()
      return
    }
    out.current = { provider: 'local', degraded: false }
    yield* useLocal()
  },

  async chat(messages: AiMessage[], opts: ChatOpts = {}): Promise<string> {
    let s = ''
    for await (const c of ai.chatStream(messages, opts)) s += c
    return s
  },

  generate(prompt: string, opts: { system?: string; fallback?: () => string; signal?: AbortSignal } = {}) {
    const messages: AiMessage[] = [
      ...(opts.system ? [{ role: 'system' as const, content: opts.system }] : []),
      { role: 'user', content: prompt },
    ]
    return ai.chatStream(messages, { fallback: opts.fallback, signal: opts.signal })
  },

  summarize(text: string, instruction: string, opts: { fallback?: () => string; signal?: AbortSignal } = {}) {
    return ai.generate(`${instruction}\n\n---\n${text}`, {
      system: 'You are a concise sales analyst inside a CRM. Use short paragraphs and bullet lists. Never invent facts.',
      ...opts,
    })
  },

  analyze(data: string, question: string, opts: { fallback?: () => string; signal?: AbortSignal } = {}) {
    return ai.generate(`Question: ${question}\n\nCRM data:\n${data}`, {
      system: 'You are a sales analyst inside a CRM. Answer from the data only, with concrete numbers (₹). Be brief.',
      ...opts,
    })
  },
}
