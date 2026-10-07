import { CalendarPlus, ExternalLink, MessageSquareText } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useData } from '@/hooks/useData'
import { useUI } from '@/hooks/useUI'
import { describeRecord } from '@/lib/crm/describe'
import { findEntity } from '@/lib/crm/facts'
import { quickAction } from '@/components/crm/quick'
import type { RecordRef } from '@/types/crm'

/** Live CRM records referenced by the AI. Resolved from current data so they never go stale. */
export function RecordCards({ records }: { records: RecordRef[] }) {
  const data = useData()
  const ui = useUI()
  const rows = records.map(r => ({ r, v: describeRecord(data, r.entity, r.id) })).filter(x => x.v)
  if (!rows.length) return null
  return (
    <ul className="mt-4 space-y-2.5" aria-label="Records">
      {rows.map(({ r, v }) => (
        <li key={`${r.entity}:${r.id}`} className="rounded-2xl border border-line bg-surface p-4 anim-up">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{v!.title}</p>
              <p className="text-sm text-muted truncate">{[v!.company, v!.value].filter(Boolean).join(' · ') || r.entity}</p>
            </div>
            <Badge label={v!.status} />
          </div>
          <p className="text-[13px] text-muted mt-2">Last activity: {v!.lastActivity}</p>
          <p className="text-sm mt-1.5"><span className="text-muted">Next: </span>{r.note || v!.action}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" onClick={() => ui.open(r.entity, r.id)}><ExternalLink size={14} /> Open</Button>
            {(r.entity === 'lead' || r.entity === 'contact' || r.entity === 'deal') && <Button size="sm" onClick={() => ui.draft(r.entity, r.id)}><MessageSquareText size={14} /> Draft message</Button>}
            {r.entity !== 'task' && <Button size="sm" onClick={() => ui.create('task', quickAction.followUp(r.entity, r.id, findEntity(data, r.entity, r.id) as never))}><CalendarPlus size={14} /> Create follow-up</Button>}
          </div>
        </li>
      ))}
    </ul>
  )
}
