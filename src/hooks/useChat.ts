import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { runAgent } from '@/lib/ai/agent'
import { runTool } from '@/lib/crm-tools'
import { humanError, uid } from '@/lib/utils'
import type { ChatMessage } from '@/types/crm'
import { useAuth } from './useAuth'
import { useData } from './useData'

/** Conversation state + persistence. Talks to the agent and the store; the UI only renders. */
export function useChat(routeId: string | undefined) {
  const data = useData()
  const { user } = useAuth()
  const nav = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [streaming, setStreaming] = useState('')
  const [executing, setExecuting] = useState<string | null>(null)
  const active = useRef<string | undefined>(routeId)
  const ref = useRef<ChatMessage[]>([])
  const epoch = useRef(0)
  const set = (m: ChatMessage[]) => { ref.current = m; setMessages(m) }

  // Load when the route points at a different conversation than the one we hold.
  useEffect(() => {
    if (routeId === active.current && (routeId === undefined ? true : ref.current.length > 0)) return
    if (routeId && !data.loaded) return
    active.current = routeId
    epoch.current++
    setBusy(false); setStatus(''); setStreaming('')
    if (!routeId) return set([])
    const c = data.conversations.find(x => x.id === routeId)
    if (c) set(c.messages)
    else { set([]); nav('/chat', { replace: true }) }
  }, [routeId, data.loaded, data.conversations, nav])

  const persist = useCallback(async (msgs: ChatMessage[]) => {
    const payload = JSON.parse(JSON.stringify(msgs)) as ChatMessage[]
    try {
      if (active.current) await data.store.update('conversations', active.current, { messages: payload })
      else {
        const first = msgs.find(m => m.role === 'user')?.content ?? 'New chat'
        const rec = await data.store.create('conversations', { title: first.replace(/\s+/g, ' ').slice(0, 48), messages: payload })
        active.current = rec.id
        nav(`/chat/${rec.id}`, { replace: true })
      }
    } catch (e) {
      // Chat still works; it just won't be saved.
      console.warn('Could not save conversation', e)
    }
  }, [data.store, nav])

  const send = useCallback(async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    const my = ++epoch.current
    const history = ref.current
    const userMsg: ChatMessage = { id: uid(), role: 'user', content, createdAt: Date.now() }
    set([...history, userMsg])
    setBusy(true); setStreaming('')
    let reply: ChatMessage
    try {
      const r = await runAgent({ history, text: content, ctx: data.toolCtx, userName: user?.name ?? null, onStatus: setStatus, onText: s => my === epoch.current && setStreaming(s) })
      reply = {
        id: uid(), role: 'assistant', content: r.text, createdAt: Date.now(), offline: r.offline || undefined,
        records: r.records.length ? r.records : undefined,
        pending: r.calls.length ? { status: 'pending', calls: r.calls } : undefined,
      }
    } catch (e) {
      reply = { id: uid(), role: 'assistant', content: humanError(e, 'I couldn’t finish that. Your CRM is fine — please try again.'), createdAt: Date.now(), error: true }
    }
    if (my !== epoch.current) return // user navigated away
    const final = [...ref.current, reply]
    set(final); setBusy(false); setStatus(''); setStreaming('')
    await persist(final)
  }, [busy, data.toolCtx, user?.name, persist])

  const patch = useCallback(async (id: string, fn: (m: ChatMessage) => ChatMessage) => {
    const next = ref.current.map(m => (m.id === id ? fn(m) : m))
    set(next)
    await persist(next)
  }, [persist])

  const confirm = useCallback(async (id: string) => {
    const msg = ref.current.find(m => m.id === id)
    if (!msg?.pending || msg.pending.status !== 'pending' || executing) return
    setExecuting(id)
    const results: { ok: boolean; message: string }[] = []
    for (const c of msg.pending.calls) {
      const o = await runTool(c.tool, c.args, data.toolCtx)
      results.push({ ok: o.ok, message: o.ok ? 'Done' : o.message })
    }
    setExecuting(null)
    await patch(id, m => ({ ...m, pending: { ...m.pending!, status: results.some(r => r.ok) ? 'confirmed' : 'failed', results } }))
  }, [data.toolCtx, executing, patch])

  const cancel = useCallback((id: string) => patch(id, m => ({ ...m, pending: { ...m.pending!, status: 'cancelled' } })), [patch])

  return { messages, busy, status, streaming, executing, send, confirm, cancel }
}
