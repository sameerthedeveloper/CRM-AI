import { useState } from 'react'
import { CalendarPlus, Mail, MessageSquareText, Pencil, PhoneCall, Trash2 } from 'lucide-react'
import { AiSummary } from '@/components/ai/AiSummary'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/hooks/useData'
import { useUI } from '@/hooks/useUI'
import { ENTITIES } from '@/lib/crm/entities'
import { entityTitle, findEntity, related } from '@/lib/crm/facts'
import { quickAction } from './quick'
import { LEAD_STATUSES, DEAL_STAGES, type EntityType, type NoteTarget, ACTIVITY_TYPES } from '@/types/crm'
import { formatCompact, formatCurrency, formatDate, formatDateTime, humanError, relativeTime, toDateInput } from '@/lib/utils'

const dash = (v: unknown) => (v === '' || v === null || v === undefined ? '—' : String(v))

export function EntityDetail({ type, id, onClose }: { type: EntityType; id: string; onClose: () => void }) {
  const data = useData()
  const ui = useUI()
  const toast = useToast()
  const def = ENTITIES[type]
  const rec = findEntity(data, type, id) as unknown as Record<string, any> | undefined
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [logType, setLogType] = useState<'call' | 'email' | 'meeting' | 'message'>('call')

  if (!rec) return <Dialog open onClose={onClose} variant="sheet" title="Not found"><p className="text-sm text-muted">This record no longer exists.</p></Dialog>
  const rel = related(data, type, id)
  const isNoteTarget = type !== 'task'
  const companyName = (cid: string | null) => data.companies.find(c => c.id === cid)?.name

  const wrap = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    setBusy(true)
    try { await fn(); toast.show(ok) } catch (e) { toast.error(humanError(e, fail)) } finally { setBusy(false) }
  }

  const fields: [string, string][] = def.fields.filter(f => f.key !== 'notes' && f.key !== 'name' && f.key !== 'title').map(f => {
    const v = rec[f.key]
    const shown =
      f.type === 'date' ? (v ? `${formatDate(v)} · ${relativeTime(v)}` : '—') :
      f.type === 'ref' ? dash(f.ref === 'companies' ? companyName(v) : f.ref === 'contacts' ? data.contacts.find(c => c.id === v)?.name : data.leads.find(l => l.id === v)?.name) :
      f.type === 'tags' ? dash((v as string[]).join(', ')) :
      f.key === 'value' ? formatCurrency(v) : dash(v)
    return [f.label, shown]
  })

  const stageOptions = type === 'lead' ? LEAD_STATUSES : type === 'deal' ? DEAL_STAGES : null
  const stageKey = type === 'lead' ? 'status' : 'stage'
  const acts = [...rel.activities].sort((a, b) => b.createdAt - a.createdAt)
  const notes = [...rel.notes].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <>
      <Dialog open onClose={onClose} variant="sheet" title={entityTitle(type, rec as never)} description={def.label}
        footer={<>
          <Button variant="ghost" className="mr-auto text-danger" onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Delete</Button>
          <Button onClick={() => ui.edit(type, rec as never)}><Pencil size={15} /> Edit</Button>
        </>}>
        <div className="space-y-6 pt-1">
          <div className="flex flex-wrap gap-2">
            {isNoteTarget && type !== 'company' && <Button size="sm" onClick={() => ui.draft(type, id)}><MessageSquareText size={15} /> Draft message</Button>}
            {type !== 'task' && <Button size="sm" onClick={() => ui.create('task', quickAction.followUp(type, id, rec))}><CalendarPlus size={15} /> Create follow-up</Button>}
            {type === 'task' && rec.status !== 'Completed' && <Button size="sm" variant="primary" disabled={busy} onClick={() => wrap(() => data.crm.completeTask(id), 'Task completed', 'I couldn’t complete that task.')}>Mark complete</Button>}
          </div>

          {stageOptions && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted w-24">{type === 'lead' ? 'Status' : 'Stage'}</span>
              <Select aria-label={type === 'lead' ? 'Status' : 'Stage'} className="max-w-48" value={rec[stageKey]} disabled={busy}
                onChange={e => wrap(() => data.crm.update(type, id, { [stageKey]: e.target.value }), `Moved to ${e.target.value}`, 'I couldn’t change that. Please try again.')}>
                {stageOptions.map(o => <option key={o}>{o}</option>)}
              </Select>
              {rec.priority && <Badge label={rec.priority} />}
            </div>
          )}

          {isNoteTarget && <AiSummary type={type} id={id} />}

          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
            {fields.map(([k, v]) => (<div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>))}
          </dl>
          {rec.notes && <p className="text-sm whitespace-pre-wrap rounded-xl bg-surface-2/60 p-3.5">{rec.notes}</p>}
          {type === 'task' && rec.description && <p className="text-sm whitespace-pre-wrap">{rec.description}</p>}

          {(rel.deals.length > 0 || rel.contacts.length > 0 || rel.tasks.length > 0) && (
            <section>
              <h3 className="text-sm font-medium mb-2">Related</h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {rel.contacts.map(c => <li key={c.id}><button className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-surface-2" onClick={() => ui.open('contact', c.id)}>{c.name} <span className="text-muted">· {c.role || 'Contact'}</span></button></li>)}
                {rel.deals.map(d => <li key={d.id}><button className="w-full flex justify-between gap-3 text-left px-3.5 py-2.5 text-sm hover:bg-surface-2" onClick={() => ui.open('deal', d.id)}><span>{d.name}</span><span className="text-muted">{formatCompact(d.value)} · {d.stage}</span></button></li>)}
                {rel.tasks.map(t => <li key={t.id}><button className="w-full flex justify-between gap-3 text-left px-3.5 py-2.5 text-sm hover:bg-surface-2" onClick={() => ui.open('task', t.id)}><span className={t.status === 'Completed' ? 'line-through text-muted' : ''}>{t.title}</span><span className="text-muted">{t.dueDate ? toDateInput(t.dueDate) : ''}</span></button></li>)}
              </ul>
            </section>
          )}

          {isNoteTarget && (
            <>
              <section>
                <h3 className="text-sm font-medium mb-2">Notes</h3>
                <form className="flex gap-2 items-start" onSubmit={e => { e.preventDefault(); if (!note.trim()) return; void wrap(() => data.crm.addNote(type as NoteTarget, id, note), 'Note added', 'I couldn’t save that note.').then(() => setNote('')) }}>
                  <Textarea aria-label="New note" rows={2} className="min-h-0" placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)} />
                  <Button type="submit" variant="primary" disabled={busy || !note.trim()}>Add</Button>
                </form>
                <ul className="mt-3 space-y-2">
                  {notes.map(n => <li key={n.id} className="text-sm rounded-xl bg-surface-2/60 p-3"><p className="whitespace-pre-wrap">{n.body}</p><p className="text-xs text-muted mt-1">{formatDateTime(n.createdAt)}</p></li>)}
                </ul>
              </section>

              <section>
                <div className="flex items-center justify-between mb-2 gap-3">
                  <h3 className="text-sm font-medium">Activity</h3>
                  {(type === 'lead' || type === 'contact') && (
                    <div className="flex items-center gap-1.5">
                      <Select aria-label="Interaction type" className="h-8 text-[13px] w-28" value={logType} onChange={e => setLogType(e.target.value as typeof logType)}>
                        {ACTIVITY_TYPES.filter(a => ['call', 'email', 'meeting', 'message'].includes(a)).map(a => <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>)}
                      </Select>
                      <Button size="sm" disabled={busy} onClick={() => wrap(() => data.crm.logActivity(logType, `Logged ${logType}`, type as NoteTarget, id), 'Interaction logged', 'I couldn’t log that.')}>
                        {logType === 'call' ? <PhoneCall size={14} /> : <Mail size={14} />} Log
                      </Button>
                    </div>
                  )}
                </div>
                {acts.length === 0 ? <p className="text-sm text-muted">No activity yet.</p> : (
                  <ol className="relative border-l border-line ml-1.5 space-y-3">
                    {acts.slice(0, 20).map(a => (
                      <li key={a.id} className="pl-4 relative">
                        <span className="absolute -left-[4.5px] top-2 h-2 w-2 rounded-full bg-line" aria-hidden />
                        <p className="text-sm">{a.summary}</p>
                        <p className="text-xs text-muted">{a.type} · {formatDateTime(a.createdAt)}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>
      </Dialog>
      <ConfirmDialog open={confirmDelete} danger busy={busy} title={`Delete this ${def.label.toLowerCase()}?`}
        body={`“${entityTitle(type, rec as never)}” and its notes and activity will be removed permanently.`} confirmLabel="Delete"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => { setBusy(true); try { await data.crm.remove(type, id); toast.show(`${def.label} deleted`); setConfirmDelete(false); onClose() } catch (e) { toast.error(humanError(e, 'I couldn’t delete that. Please try again.')) } finally { setBusy(false) } }} />
    </>
  )
}
