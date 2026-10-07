import { MAX_WRITES, TOOLS, previewCall, runTool, validateCall, type ToolCtx } from '@/lib/crm-tools'
import type { ChatMessage, EntityType, PlannedCall, RecordRef } from '@/types/crm'
import { ai, type StreamResult } from './index'
import { agentSystemPrompt } from './prompts'
import type { AiMessage } from './types'

export interface AgentResult {
  text: string
  records: RecordRef[]
  calls: PlannedCall[]
  offline: boolean
}

interface Params {
  history: ChatMessage[]
  text: string
  ctx: ToolCtx
  userName: string | null
  onStatus: (s: string) => void
  onText: (s: string) => void
  signal?: AbortSignal
}

const MAX_STEPS = 5
const ENTITIES = new Set<EntityType>(['lead', 'contact', 'company', 'deal', 'task'])

function statusFor(tool: string): string {
  if (/Lead/.test(tool)) return 'Checking your leads…'
  if (/Contact/.test(tool)) return 'Looking through contacts…'
  if (/Compan/.test(tool)) return 'Looking through companies…'
  if (/Pipeline|Deal/.test(tool)) return 'Analyzing your pipeline…'
  if (/Task/.test(tool)) return 'Checking your tasks…'
  if (/FollowUp/.test(tool)) return 'Preparing follow-ups…'
  if (/Activit/.test(tool)) return 'Reviewing recent activity…'
  return 'Thinking…'
}

/** Hide the machine-readable tail while text is still streaming. */
export function stripRecords(s: string): string {
  const i = s.indexOf('<records')
  if (i >= 0) return s.slice(0, i).trimEnd()
  const partial = s.match(/<r?e?c?o?r?d?s?$/)
  return partial ? s.slice(0, partial.index).trimEnd() : s
}

export function parseRecords(s: string): RecordRef[] {
  const m = /<records>([\s\S]*?)<\/records>/.exec(s)
  if (!m) return []
  try {
    const arr = JSON.parse(m[1]) as unknown
    if (!Array.isArray(arr)) return []
    return arr
      .filter((r): r is RecordRef => !!r && ENTITIES.has(r.entity) && typeof r.id === 'string')
      .slice(0, 8)
      .map(r => ({ entity: r.entity, id: r.id, note: typeof r.note === 'string' ? r.note.slice(0, 200) : undefined }))
  } catch { return [] }
}

function parseJsonReply(raw: string): { say?: string; calls: { tool: string; args: unknown }[] } | null {
  const t = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  try {
    const o = JSON.parse(t)
    if (o && Array.isArray(o.calls)) return { say: typeof o.say === 'string' ? o.say : undefined, calls: o.calls }
  } catch { /* fallthrough */ }
  return null
}

const historyToMessages = (h: ChatMessage[]): AiMessage[] =>
  h.slice(-12).map(m => ({
    role: m.role,
    content: m.content + (m.pending ? `\n[I proposed ${m.pending.calls.length} action(s); user ${m.pending.status}.]` : ''),
  }))

/**
 * Agent loop: model → (JSON tool calls | markdown answer). Reads run automatically; any write is
 * returned as a *proposal* and never executed here.
 */
export async function runAgent(p: Params): Promise<AgentResult> {
  const messages: AiMessage[] = [
    { role: 'system', content: agentSystemPrompt(p.userName) },
    ...historyToMessages(p.history),
    { role: 'user', content: p.text },
  ]
  let offline = false
  p.onStatus('Thinking…')

  for (let step = 0; step < MAX_STEPS; step++) {
    const meta: { current?: StreamResult } = {}
    let buf = ''
    let mode: 'unknown' | 'json' | 'text' = 'unknown'
    for await (const chunk of ai.chatStream(messages, { signal: p.signal, result: meta })) {
      buf += chunk
      if (mode === 'unknown' && buf.trim()) mode = /^(\{|```json)/i.test(buf.trim()) ? 'json' : 'text'
      if (mode === 'text') p.onText(stripRecords(buf))
    }
    if (meta.current?.provider === 'local' && meta.current.degraded) offline = true

    const call = mode === 'json' ? parseJsonReply(buf) : null
    if (mode !== 'json' || (!call && step === MAX_STEPS - 1)) {
      return { text: stripRecords(buf).trim() || 'I’m not sure how to help with that yet.', records: parseRecords(buf), calls: [], offline }
    }
    if (!call) {
      messages.push({ role: 'assistant', content: buf }, { role: 'user', content: 'TOOL_ERROR: that was not valid JSON. Reply with a valid tool-call JSON object or a Markdown answer.' })
      continue
    }

    const reads = call.calls.filter(c => TOOLS[c.tool]?.kind === 'read')
    const writes = call.calls.filter(c => TOOLS[c.tool]?.kind === 'write')

    if (reads.length) {
      p.onStatus(statusFor(reads[0].tool))
      const results = []
      for (const c of reads.slice(0, 6)) results.push({ tool: c.tool, ...(await shape(await runTool(c.tool, c.args, p.ctx))) })
      messages.push(
        { role: 'assistant', content: buf },
        { role: 'user', content: `TOOL_RESULTS\n${JSON.stringify(results)}${writes.length ? '\nNOTE: write calls were ignored because they were mixed with reads; re-issue them alone.' : ''}` },
      )
      continue
    }

    if (writes.length) {
      p.onStatus('Preparing your changes…')
      if (writes.length > MAX_WRITES) {
        messages.push({ role: 'assistant', content: buf }, { role: 'user', content: `TOOL_ERROR: at most ${MAX_WRITES} write calls allowed.` })
        continue
      }
      const planned: PlannedCall[] = []
      const errors: string[] = []
      for (const w of writes) {
        const v = validateCall(w.tool, w.args)
        if (!v.ok) { errors.push(v.error); continue }
        const args = JSON.parse(JSON.stringify(v.args)) as Record<string, unknown>
        planned.push({ tool: w.tool, args, preview: await previewCall(w.tool, args, p.ctx), danger: TOOLS[w.tool].danger })
      }
      if (errors.length && !planned.length) {
        messages.push({ role: 'assistant', content: buf }, { role: 'user', content: `TOOL_ERROR: ${errors.join(' | ')}` })
        continue
      }
      return { text: call.say?.trim() || `I can make ${planned.length} change${planned.length === 1 ? '' : 's'}. Review and confirm:`, records: [], calls: planned, offline }
    }

    messages.push({ role: 'assistant', content: buf }, { role: 'user', content: 'TOOL_ERROR: no valid calls. Answer in Markdown or call a listed tool.' })
  }
  return { text: 'I couldn’t finish that request. Try rephrasing it.', records: [], calls: [], offline }
}

const shape = async (o: Awaited<ReturnType<typeof runTool>>) => (o.ok ? { ok: true, result: o.data } : { ok: false, error: o.message })
