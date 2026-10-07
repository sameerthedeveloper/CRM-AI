import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Composer({ onSend, disabled, autoFocus, large }: { onSend: (t: string) => void; disabled?: boolean; autoFocus?: boolean; large?: boolean }) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [text])

  useEffect(() => { if (autoFocus && matchMedia('(pointer:fine)').matches) ref.current?.focus() }, [autoFocus])

  const submit = () => {
    if (!text.trim() || disabled) return
    onSend(text)
    setText('')
  }

  return (
    <form onSubmit={e => { e.preventDefault(); submit() }}
      className={cn('flex items-end gap-2 rounded-[22px] border border-line bg-surface shadow-soft pl-5 pr-2.5 py-2.5 focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/10', large && 'py-3.5')}>
      <textarea ref={ref} rows={1} value={text} onChange={e => setText(e.target.value)} aria-label="Message the AI" placeholder="Ask anything about your CRM…"
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }}
        className={cn('flex-1 resize-none bg-transparent outline-none placeholder:text-muted/80 py-1.5 max-h-[200px]', large ? 'text-[17px]' : 'text-base')} />
      <button type="submit" aria-label="Send message" disabled={!text.trim() || disabled}
        className="h-9 w-9 shrink-0 rounded-full bg-accent text-accent-fg grid place-items-center disabled:opacity-30 hover:opacity-90 active:scale-95">
        <ArrowUp size={18} strokeWidth={2.2} />
      </button>
    </form>
  )
}
