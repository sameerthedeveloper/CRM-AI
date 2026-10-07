import { useMemo, useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { Col, RecordTable, Toolbar } from '@/components/crm/RecordTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { EmptyState, Page, PageHeader } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/hooks/useData'
import { useDebounced } from '@/hooks/useDebounced'
import { useUI } from '@/hooks/useUI'
import { quietDays } from '@/lib/crm/insights'
import { formatCurrency, humanError, relativeTime } from '@/lib/utils'
import { LEAD_STATUSES, PRIORITIES, type Lead } from '@/types/crm'

export default function LeadsPage() {
  const { leads, crm, loaded } = useData()
  const ui = useUI()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const dq = useDebounced(q).trim().toLowerCase()

  const rows = useMemo(() => leads.filter(l =>
    (!status || l.status === status) && (!priority || l.priority === priority) &&
    (!dq || [l.name, l.company, l.email, l.phone, l.source].some(f => f.toLowerCase().includes(dq))),
  ), [leads, dq, status, priority])

  const cols: Col<Lead>[] = [
    { key: 'name', label: 'Lead', primary: true, sort: (a, b) => a.name.localeCompare(b.name), render: l => <span><span className="font-medium">{l.name}</span>{l.company && l.company !== l.name && <span className="block text-xs text-muted">{l.company}</span>}</span> },
    { key: 'status', label: 'Status', sort: (a, b) => LEAD_STATUSES.indexOf(a.status) - LEAD_STATUSES.indexOf(b.status),
      render: l => (
        <Select aria-label={`Status for ${l.name}`} className="h-8 w-36 text-[13px]" value={l.status}
          onChange={e => crm.update('lead', l.id, { status: e.target.value }).then(() => toast.show(`${l.name} → ${e.target.value}`)).catch(err => toast.error(humanError(err, 'I couldn’t change that status.')))}>
          {LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}
        </Select>) },
    { key: 'priority', label: 'Priority', sort: (a, b) => PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority), render: l => <Badge label={l.priority} /> },
    { key: 'value', label: 'Value', className: 'text-right tabular-nums', sort: (a, b) => a.value - b.value, render: l => formatCurrency(l.value) },
    { key: 'last', label: 'Last contact', sort: (a, b) => (a.lastContactedAt ?? 0) - (b.lastContactedAt ?? 0), render: l => <span className={quietDays(l) >= 7 && l.status !== 'Won' && l.status !== 'Lost' ? 'text-warn' : 'text-muted'}>{relativeTime(l.lastContactedAt)}</span> },
    { key: 'next', label: 'Follow-up', hideOnMobile: true, sort: (a, b) => (a.nextFollowUpAt ?? Infinity) - (b.nextFollowUpAt ?? Infinity), render: l => <span className="text-muted">{l.nextFollowUpAt ? relativeTime(l.nextFollowUpAt) : '—'}</span> },
  ]

  return (
    <Page wide>
      <PageHeader title="Leads" subtitle={`${leads.length} total · ${formatCurrency(leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').reduce((s, l) => s + l.value, 0))} open`}
        actions={<>
          <Button onClick={() => ui.ask('Analyze my leads and tell me where to focus.')}><Sparkles size={15} /> Analyze with AI</Button>
          <Button variant="primary" onClick={() => ui.create('lead')}><Plus size={16} /> New lead</Button>
        </>} />
      <Toolbar search={q} onSearch={setQ} placeholder="Search leads">
        <Select aria-label="Filter by status" className="w-40" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}</Select>
        <Select aria-label="Filter by priority" className="w-40" value={priority} onChange={e => setPriority(e.target.value)}><option value="">All priorities</option>{PRIORITIES.map(s => <option key={s}>{s}</option>)}</Select>
      </Toolbar>
      {!loaded ? null : rows.length === 0
        ? <EmptyState title={leads.length ? 'No leads match' : 'No leads yet'} body={leads.length ? 'Try a different search or filter.' : 'Add your first lead, or just tell the AI about them.'} action={!leads.length && <Button variant="primary" onClick={() => ui.create('lead')}>New lead</Button>} />
        : <RecordTable label="Leads" rows={rows} cols={cols} onOpen={l => ui.open('lead', l.id)} initialSort={{ key: 'last', dir: 1 }} />}
    </Page>
  )
}
