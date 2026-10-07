import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Composer } from '@/components/chat/Composer'
import { MessageView } from '@/components/chat/Message'
import { Thinking } from '@/components/ui/misc'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/hooks/useAuth'
import { useData } from '@/hooks/useData'

import Markdown from '@/components/ui/LazyMarkdown'

const SUGGESTIONS = [
  'Who should I follow up with today?',
  'Show my best leads.',
  'Summarize my pipeline.',
  'Which customers haven’t replied?',
  'Create a follow-up plan.',
  'Draft a message for my latest lead.',
]

const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }

export default function ChatPage() {
  const { id } = useParams()
  const chat = useChat(id)
  const { user } = useAuth()
  const data = useData()
  const end = useRef<HTMLDivElement>(null)
  const loc = useLocation()
  const nav = useNavigate()
  const sent = useRef(0)

  // Prompts handed over from other screens ("Analyze with AI").
  useEffect(() => {
    const st = loc.state as { prompt?: string; at?: number } | null
    if (st?.prompt && st.at && st.at !== sent.current && data.loaded) {
      sent.current = st.at
      nav(loc.pathname, { replace: true, state: null })
      void chat.send(st.prompt)
    }
  }, [loc.state]) // eslint-disable-line react-hooks/exhaustive-deps
  const empty = chat.messages.length === 0 && !chat.busy

  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }, [chat.messages, chat.streaming, chat.status])

  if (empty) {
    const first = user?.name?.split(' ')[0]
    const noData = data.loaded && !data.leads.length && !data.deals.length && !data.contacts.length
    return (
      <div className="min-h-full flex flex-col justify-center px-4 md:px-8 pb-10 pt-8 anim-fade">
        <div className="mx-auto w-full max-w-2xl">
          <p className="text-sm text-muted mb-2 text-center">{hello()}{first ? `, ${first}` : ''}</p>
          <h1 className="text-[34px] md:text-[42px] leading-[1.15] font-semibold tracking-tight text-center mb-8">What can I help you with?</h1>
          <Composer onSend={chat.send} autoFocus large />
          <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Suggestions">
            {SUGGESTIONS.map(s => (
              <li key={s}><button onClick={() => chat.send(s)} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-muted hover:text-fg hover:bg-surface-2">{s}</button></li>
            ))}
          </ul>
          {noData && <p className="mt-8 text-center text-sm text-muted">Your CRM is empty. Try “Create lead Priya Sharma worth ₹40,000”, or add sample data in Settings.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 md:px-6 pt-8 pb-6 space-y-8" role="log" aria-live="polite" aria-label="Conversation">
          {chat.messages.map(m => (
            <MessageView key={m.id} m={m} executing={chat.executing === m.id} onConfirm={() => chat.confirm(m.id)} onCancel={() => chat.cancel(m.id)} />
          ))}
          {chat.busy && (chat.streaming
            ? <div><Markdown>{chat.streaming}</Markdown></div>
            : <Thinking label={chat.status || 'Thinking…'} />)}
          <div ref={end} />
        </div>
      </div>
      <div className="shrink-0 px-4 md:px-6 pb-4 pt-2 bg-gradient-to-t from-bg via-bg to-transparent">
        <div className="mx-auto max-w-2xl"><Composer onSend={chat.send} disabled={chat.busy} autoFocus /></div>
      </div>
    </div>
  )
}
