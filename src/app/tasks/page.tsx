import { useMemo, useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Page, PageHeader } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/hooks/useData'
import { useUI } from '@/hooks/useUI'
import { isDueToday, isOverdue } from '@/lib/crm/insights'
import { cn, humanError, relativeTime } from '@/lib/utils'
import { PRIORITIES, type Task } from '@/types/crm'

const TABS = ['Open', 'Today', 'Overdue', 'Completed', 'All'] as const

export default function TasksPage() {
  const { tasks, leads, crm, loaded } = useData()
  const ui = useUI()
  const toast = useToast()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Open')

  const rows = useMemo(() => {
    const f = (t: Task) => tab === 'All' ? true : tab === 'Completed' ? t.status === 'Completed' : tab === 'Today' ? isDueToday(t) : tab === 'Overdue' ? isOverdue(t) : t.status !== 'Completed'
    return tasks.filter(f).sort((a, b) => (a.status === 'Completed' ? 1 : 0) - (b.status === 'Completed' ? 1 : 0) || (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) || PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority))
  }, [tasks, tab])

  const toggle = (t: Task) =>
    crm.update('task', t.id, { status: t.status === 'Completed' ? 'Todo' : 'Completed' }).catch(e => toast.error(humanError(e, 'I couldn’t update that task.')))

  return (
    <Page>
      <PageHeader title="Tasks" subtitle={`${tasks.filter(t => t.status !== 'Completed').length} open · ${tasks.filter(t => isOverdue(t)).length} overdue`} actions={<>
        <Button onClick={() => ui.ask('What should I focus on today? Prioritize my tasks.')}><Sparkles size={15} /> Prioritize with AI</Button>
        <Button variant="primary" onClick={() => ui.create('task')}><Plus size={16} /> New task</Button>
      </>} />
      <div className="flex gap-1 mb-4 overflow-x-auto" role="tablist" aria-label="Task filter">
        {TABS.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('h-8 px-3 rounded-lg text-sm whitespace-nowrap', tab === t ? 'bg-surface-2 font-medium' : 'text-muted hover:text-fg')}>{t}</button>)}
      </div>
      {!loaded ? null : rows.length === 0 ? (
        <EmptyState title={tab === 'Overdue' ? 'Nothing overdue' : 'No tasks here'} body="Tell the AI “create a task to call ABC tomorrow”, or add one yourself." action={<Button variant="primary" onClick={() => ui.create('task')}>New task</Button>} />
      ) : (
        <ul className="rounded-2xl border border-line bg-surface divide-y divide-line">
          {rows.map(t => {
            const done = t.status === 'Completed'
            const lead = leads.find(l => l.id === t.relatedLead)
            return (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3 group">
                <input type="checkbox" checked={done} onChange={() => toggle(t)} aria-label={`Mark “${t.title}” ${done ? 'not done' : 'complete'}`} className="h-[18px] w-[18px] rounded-md accent-[var(--accent)] shrink-0" />
                <button className="flex-1 min-w-0 text-left" onClick={() => ui.open('task', t.id)}>
                  <p className={cn('text-sm truncate', done && 'line-through text-muted')}>{t.title}</p>
                  {lead && <p className="text-xs text-muted truncate">{lead.name}</p>}
                </button>
                {t.status === 'In Progress' && <Badge label="In Progress" />}
                <Badge label={t.priority} className={t.priority === 'Low' ? 'hidden sm:inline-flex' : ''} />
                <span className={cn('text-xs w-20 text-right shrink-0', isOverdue(t) ? 'text-danger' : 'text-muted')}>{t.dueDate ? relativeTime(t.dueDate) : ''}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}
