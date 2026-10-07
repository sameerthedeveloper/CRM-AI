import { useMemo, useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { Col, RecordTable, Toolbar } from '@/components/crm/RecordTable'
import { Button } from '@/components/ui/Button'
import { EmptyState, Page, PageHeader } from '@/components/ui/misc'
import { useData } from '@/hooks/useData'
import { useDebounced } from '@/hooks/useDebounced'
import { useUI } from '@/hooks/useUI'
import { formatCompact } from '@/lib/utils'
import type { Company } from '@/types/crm'

export default function CompaniesPage() {
  const { companies, contacts, deals, loaded } = useData()
  const ui = useUI()
  const [q, setQ] = useState('')
  const dq = useDebounced(q).trim().toLowerCase()
  const rows = useMemo(() => companies.filter(c => !dq || [c.name, c.industry, c.location].some(f => f.toLowerCase().includes(dq))), [companies, dq])
  const dealValue = (id: string) => deals.filter(d => d.companyId === id && d.stage !== 'Lost').reduce((s, d) => s + d.value, 0)

  const cols: Col<Company>[] = [
    { key: 'name', label: 'Company', primary: true, sort: (a, b) => a.name.localeCompare(b.name), render: c => <span className="font-medium">{c.name}</span> },
    { key: 'industry', label: 'Industry', render: c => c.industry || '—' },
    { key: 'location', label: 'Location', render: c => c.location || '—' },
    { key: 'contacts', label: 'Contacts', className: 'tabular-nums', sort: (a, b) => contacts.filter(x => x.companyId === a.id).length - contacts.filter(x => x.companyId === b.id).length, render: c => contacts.filter(x => x.companyId === c.id).length },
    { key: 'deals', label: 'Deal value', className: 'text-right tabular-nums', sort: (a, b) => dealValue(a.id) - dealValue(b.id), render: c => formatCompact(dealValue(c.id)) },
  ]

  return (
    <Page wide>
      <PageHeader title="Companies" subtitle={`${companies.length} organisations`} actions={<>
        <Button onClick={() => ui.ask('Which companies are my biggest opportunities?')}><Sparkles size={15} /> Ask AI</Button>
        <Button variant="primary" onClick={() => ui.create('company')}><Plus size={16} /> New company</Button>
      </>} />
      <Toolbar search={q} onSearch={setQ} placeholder="Search companies" />
      {!loaded ? null : rows.length === 0
        ? <EmptyState title={companies.length ? 'No companies match' : 'No companies yet'} body="Group contacts and deals under the businesses you work with." action={!companies.length && <Button variant="primary" onClick={() => ui.create('company')}>New company</Button>} />
        : <RecordTable label="Companies" rows={rows} cols={cols} onOpen={c => ui.open('company', c.id)} initialSort={{ key: 'name', dir: 1 }} />}
    </Page>
  )
}
