import { useMemo, useState } from 'react'
import { Select } from '@/components/ui/Field'
import { EmptyState, Page, PageHeader } from '@/components/ui/misc'
import { useData } from '@/hooks/useData'
import { useUI } from '@/hooks/useUI'
import { findEntity, entityTitle } from '@/lib/crm/facts'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ACTIVITY_TYPES } from '@/types/crm'

export default function ActivitiesPage() {
  const data = useData()
  const ui = useUI()
  const [type, setType] = useState('')
  const [shown, setShown] = useState(40)
  const rows = useMemo(() => data.activities.filter(a => !type || a.type === type).sort((a, b) => b.createdAt - a.createdAt), [data.activities, type])

  let day = ''
  return (
    <Page>
      <PageHeader title="Activities" subtitle="Everything that happened across your CRM" actions={
        <Select aria-label="Filter by type" className="w-40" value={type} onChange={e => setType(e.target.value)}>
          <option value="">All types</option>{ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
        </Select>} />
      {!data.loaded ? null : rows.length === 0 ? <EmptyState title="No activity yet" body="Calls, notes and status changes show up here as you work." /> : (
        <ol className="space-y-1">
          {rows.slice(0, shown).map(a => {
            const d = formatDate(a.createdAt)
            const head = d !== day ? d : null
            day = d
            const rec = findEntity(data, a.relatedType, a.relatedId)
            return (
              <li key={a.id}>
                {head && <p className="text-xs font-medium uppercase tracking-wider text-muted pt-5 pb-2">{head}</p>}
                <button disabled={!rec} onClick={() => ui.open(a.relatedType, a.relatedId)} className="w-full text-left flex gap-4 rounded-xl px-3 py-2.5 hover:bg-surface-2/60 disabled:hover:bg-transparent">
                  <span className="text-xs text-muted w-14 shrink-0 pt-0.5">{formatDateTime(a.createdAt).split(', ').pop()}</span>
                  <span className="min-w-0"><span className="text-sm block">{a.summary}</span><span className="text-xs text-muted">{a.type} · {rec ? entityTitle(a.relatedType, rec as never) : 'deleted record'}</span></span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
      {rows.length > shown && <div className="mt-4 text-center"><button className="text-sm text-accent hover:underline" onClick={() => setShown(s => s + 40)}>Show older</button></div>}
    </Page>
  )
}
