import { WifiOff } from 'lucide-react'
import { ActionPreview } from '@/components/ai/ActionPreview'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types/crm'
import { RecordCards } from './RecordCards'

import Markdown from '@/components/ui/LazyMarkdown'

export function MessageView({ m, executing, onConfirm, onCancel }: { m: ChatMessage; executing: boolean; onConfirm: () => void; onCancel: () => void }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end anim-up">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-surface-2 px-4 py-2.5 text-[16px] leading-relaxed">{m.content}</p>
      </div>
    )
  }
  return (
    <article className="anim-up" aria-label="Assistant message">
      <div className={cn(m.error && 'text-danger')}>
        <Markdown>{m.content}</Markdown>
      </div>
      {m.records && <RecordCards records={m.records} />}
      {m.pending && <ActionPreview pending={m.pending} busy={executing} onConfirm={onConfirm} onCancel={onCancel} />}
      {m.offline && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><WifiOff size={12} /> AI service unreachable — answered by the offline assistant.</p>
      )}
    </article>
  )
}
